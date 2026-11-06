/**
 * The Google profile picture: its limits, a login end to end with the provider's calls and Spaces stood in
 * for, what the API gives the pages, and how an object no longer in use is removed.
 */
import { createHash } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { allowedPictureUrl, avatarUrl, fetchPicture, pictureClaim } from "../src/auth/profilePicture.js";
import { sessionKey } from "../src/auth/sessionCache.js";
import { deleteAccount } from "../src/legal/deleteAccount.js";
import { SWEEP_LOCKS, buildSweepSchedules, removeAvatarObjects } from "../src/polls/sweeps.js";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const PICTURE_URL = "https://lh3.googleusercontent.com/a/photo";
const CDN = "https://cdn.example.com";
const KEY_PATTERN = /^avatars\/[0-9a-f]{32}$/;

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("first image")]);
const OTHER_PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("second image")]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("jpeg")]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([1, 2, 3, 4]), Buffer.from("WEBPVP8 ")]);
const SVG = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`);

const SPACES = {
  ENV_SPACES_BUCKET: "bucket",
  ENV_SPACES_REGION: "tor1",
  ENV_SPACES_KEY: "key",
  ENV_SPACES_SECRET: "secret",
  ENV_SPACES_CDN_URL: `${CDN}/`
};
const PROVIDERS = {
  ENV_SIGNIN_METHOD: "both",
  ENV_OAUTH_GOOGLE_CLIENT_ID: "google-client",
  ENV_OAUTH_GOOGLE_CLIENT_SECRET: "google-secret",
  ENV_OAUTH_MICROSOFT_CLIENT_ID: "ms-client",
  ENV_OAUTH_MICROSOFT_CLIENT_SECRET: "ms-secret",
  ENV_OAUTH_AMAZON_CLIENT_ID: "amzn-client",
  ENV_OAUTH_AMAZON_CLIENT_SECRET: "amzn-secret"
};

const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const idToken = (claims: object) => `${part({ alg: "none" })}.${part(claims)}.`;
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
const image = (bytes: Buffer) => new Response(new Uint8Array(bytes), { status: 200 });

function cookiesOf(res: request.Response): string {
  return [res.headers["set-cookie"] ?? []]
    .flat()
    .map((cookie) => String(cookie).split(";")[0]!)
    .filter((pair) => !pair.endsWith("="))
    .join("; ");
}

function sessionTokenOf(cookies: string): string {
  const value = /session_token=([^;]+)/.exec(cookies)![1]!;
  return decodeURIComponent(value).split(".")[0]!;
}

function fakeStore() {
  return {
    puts: [] as { key: string; body: Buffer; contentType: string; cacheControl: string }[],
    deletes: [] as string[],
    failPut: false,
    failDelete: false,
    async put(key: string, body: Buffer, headers: { contentType: string; cacheControl: string }) {
      if (this.failPut) throw new Error("Spaces is down");
      this.puts.push({ key, body, contentType: headers.contentType, cacheControl: headers.cacheControl });
    },
    async delete(key: string) {
      if (this.failDelete) throw new Error("Spaces is down");
      this.deletes.push(key);
    }
  };
}

let client = 0;
const pictureFetches = () =>
  vi.mocked(globalThis.fetch).mock.calls.filter(([input]) => String(input).includes("googleusercontent")).length;

/** Each start comes from its own address: BetterAuth allows three login starts per address per 10 seconds. */
async function googleSignIn(ctx: TestContext, claims: object, picture: () => Response = () => image(PNG)) {
  const started = await request(ctx.app)
    .post("/api/auth/sign-in/social")
    .set("X-Forwarded-For", `198.51.100.${++client}`)
    .send({ provider: "google", callbackURL: "/" });
  expect(started.status).toBe(200);
  const state = new URL(started.body.url).searchParams.get("state")!;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url === GOOGLE_TOKEN_URL) return json({ access_token: "access", token_type: "Bearer", id_token: idToken(claims) });
    if (url.includes("googleusercontent")) return picture();
    return new Response("not found", { status: 404 });
  });
  return request(ctx.app)
    .get(`/api/auth/callback/google?code=code&state=${encodeURIComponent(state)}`)
    .set("Cookie", cookiesOf(started))
    .redirects(0);
}

async function amazonSignIn(ctx: TestContext, email: string) {
  const started = await request(ctx.app)
    .post("/api/auth/sign-in/oauth2")
    .set("X-Forwarded-For", `198.51.100.${++client}`)
    .send({ providerId: "amazon", callbackURL: "/" });
  expect(started.status).toBe(200);
  const state = new URL(started.body.url).searchParams.get("state")!;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url === "https://api.amazon.com/auth/o2/token") return json({ access_token: "Atza|test", token_type: "bearer" });
    if (url === "https://api.amazon.com/user/profile") return json({ user_id: `amzn-${email}`, name: "Someone", email });
    return new Response("not found", { status: 404 });
  });
  return request(ctx.app)
    .get(`/api/auth/oauth2/callback/amazon?code=code&state=${encodeURIComponent(state)}`)
    .set("Cookie", cookiesOf(started))
    .redirects(0);
}

const claimsFor = (email: string, extra: object = { picture: PICTURE_URL }) => ({
  sub: `g-${email}`,
  email,
  email_verified: true,
  name: "A Person",
  ...extra
});

const userOf = (ctx: TestContext, email: string) =>
  ctx.db.selectFrom("user").selectAll().where("email", "=", email).executeTakeFirstOrThrow();
const queued = async (ctx: TestContext) =>
  (await ctx.db.selectFrom("avatar_removals").select("key").execute()).map((row) => row.key);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the limits on a picture", () => {
  it("accepts only https addresses on Google's picture host", () => {
    expect(allowedPictureUrl(PICTURE_URL)).toBe(PICTURE_URL);
    expect(allowedPictureUrl("https://googleusercontent.com/a")).toBe("https://googleusercontent.com/a");
    expect(allowedPictureUrl("http://lh3.googleusercontent.com/a")).toBeNull();
    expect(allowedPictureUrl("https://evil.example.com/a")).toBeNull();
    expect(allowedPictureUrl("https://notgoogleusercontent.com/a")).toBeNull();
    expect(allowedPictureUrl("https://googleusercontent.com.evil.example/a")).toBeNull();
    expect(allowedPictureUrl("not a url")).toBeNull();
  });

  it("reads the picture claim of an id token, and nothing from a broken one", () => {
    expect(pictureClaim(idToken({ picture: PICTURE_URL }))).toBe(PICTURE_URL);
    expect(pictureClaim(idToken({ sub: "x" }))).toBeNull();
    expect(pictureClaim(idToken({ picture: 7 }))).toBeNull();
    expect(pictureClaim("broken")).toBeNull();
    expect(pictureClaim("a.b%%%.c")).toBeNull();
  });

  const stubAnswer = (answer: Response) => vi.spyOn(globalThis, "fetch").mockResolvedValue(answer);
  const signal = () => AbortSignal.timeout(1000);

  it("judges the type by the leading bytes, whatever the header says", async () => {
    for (const [bytes, contentType] of [[PNG, "image/png"], [JPEG, "image/jpeg"], [WEBP, "image/webp"]] as const) {
      stubAnswer(new Response(new Uint8Array(bytes), { headers: { "content-type": "text/plain" } }));
      await expect(fetchPicture(PICTURE_URL, signal())).resolves.toEqual({ bytes, contentType });
    }
  });

  it("refuses SVG and text, even labelled as an image", async () => {
    for (const bytes of [SVG, Buffer.from("just some text")]) {
      stubAnswer(new Response(new Uint8Array(bytes), { headers: { "content-type": "image/png" } }));
      await expect(fetchPicture(PICTURE_URL, signal())).rejects.toThrow("refused type");
    }
  });

  it("refuses a body past 256 KB with no Content-Length, and accepts one at the limit", async () => {
    const streamed = (size: number) =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(PNG));
            for (let sent = PNG.length; sent < size; sent += 1024) controller.enqueue(new Uint8Array(Math.min(1024, size - sent)));
            controller.close();
          }
        })
      );
    stubAnswer(streamed(256 * 1024 + 1));
    await expect(fetchPicture(PICTURE_URL, signal())).rejects.toThrow("too large");
    stubAnswer(streamed(256 * 1024));
    await expect(fetchPicture(PICTURE_URL, signal())).resolves.toMatchObject({ contentType: "image/png" });
  });

  it("refuses a redirect, and any answer but a success", async () => {
    const stub = stubAnswer(new Response("gone", { status: 404 }));
    await expect(fetchPicture(PICTURE_URL, signal())).rejects.toThrow("answered 404");
    expect(stub.mock.calls[0]![1]).toMatchObject({ redirect: "error" });
  });

  it("gives up when the signal runs out", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init!.signal!.addEventListener("abort", () => reject(init!.signal!.reason));
        })
    );
    await expect(fetchPicture(PICTURE_URL, AbortSignal.timeout(20))).rejects.toMatchObject({ name: "TimeoutError" });
  });
});

describe("what the API gives the pages", () => {
  const config = { spaces: { cdnUrl: `${CDN}/` } } as Parameters<typeof avatarUrl>[1];
  const noSpaces = {} as Parameters<typeof avatarUrl>[1];

  it("maps each stored value", () => {
    expect(avatarUrl("/avatar-default.svg", config)).toBe("/avatar-default.svg");
    expect(avatarUrl("/avatar-default.svg", noSpaces)).toBe("/avatar-default.svg");
    expect(avatarUrl("avatars/abc", config)).toBe(`${CDN}/avatars/abc`);
    expect(avatarUrl("avatars/abc", noSpaces)).toBe("/avatar-default.svg");
    expect(avatarUrl(null, config)).toBeNull();
    expect(avatarUrl(undefined, noSpaces)).toBeNull();
  });
});

describe("a Google login", () => {
  let ctx: TestContext;
  const store = fakeStore();

  beforeAll(async () => {
    ctx = await startTestContext({ ...PROVIDERS, ...SPACES }, { objectStore: store });
  });
  afterAll(async () => {
    await ctx.stop();
  });
  beforeEach(() => {
    store.puts.length = 0;
    store.deletes.length = 0;
    store.failPut = false;
    store.failDelete = false;
  });

  it("stores a new account's picture, public for a day, and points the account at it", async () => {
    const res = await googleSignIn(ctx, claimsFor("new@example.com"));
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/");

    expect(store.puts).toHaveLength(1);
    const [put] = store.puts;
    expect(put!.key).toMatch(KEY_PATTERN);
    expect(put!.body.equals(PNG)).toBe(true);
    expect(put!.contentType).toBe("image/png");
    expect(put!.cacheControl).toBe("public, max-age=86400, immutable");

    const user = await userOf(ctx, "new@example.com");
    expect(user.profileAvatar).toBe(put!.key);
    expect(user.profile_avatar_hash).toBe(createHash("sha256").update(PNG).digest("hex"));
    expect(user.image).toBeNull();

    const me = await request(ctx.app).get("/api/me").set("Cookie", cookiesOf(res));
    expect(me.body.profileAvatar).toBe(`${CDN}/${put!.key}`);
  });

  it("leaves the key alone, and uploads nothing, when the image is the same", async () => {
    await googleSignIn(ctx, claimsFor("same@example.com"));
    const before = await userOf(ctx, "same@example.com");
    store.puts.length = 0;
    const del = vi.spyOn(ctx.cache, "del");

    const res = await googleSignIn(ctx, claimsFor("same@example.com", { picture: `${PICTURE_URL}=s96-c` }));

    expect(res.status).toBe(302);
    expect(pictureFetches()).toBe(1);
    expect(store.puts).toHaveLength(0);
    expect((await userOf(ctx, "same@example.com")).profileAvatar).toBe(before.profileAvatar);
    expect(del).not.toHaveBeenCalledWith(sessionKey(sessionTokenOf(cookiesOf(res))));
  });

  it("gives a changed image a new key, queues the old one, and drops the session's cached copy", async () => {
    await googleSignIn(ctx, claimsFor("changed@example.com"));
    const before = await userOf(ctx, "changed@example.com");
    const del = vi.spyOn(ctx.cache, "del");

    const res = await googleSignIn(ctx, claimsFor("changed@example.com"), () => image(OTHER_PNG));

    const after = await userOf(ctx, "changed@example.com");
    expect(after.profileAvatar).toMatch(KEY_PATTERN);
    expect(after.profileAvatar).not.toBe(before.profileAvatar);
    expect(after.profile_avatar_hash).toBe(createHash("sha256").update(OTHER_PNG).digest("hex"));
    expect(await queued(ctx)).toContain(before.profileAvatar);
    expect(del).toHaveBeenCalledWith(sessionKey(sessionTokenOf(cookiesOf(res))));
  });

  it("keeps the same redirect and the account as it was, whatever stops the picture", async () => {
    const stops: [string, object, () => Response][] = [
      ["no-claim@example.com", {}, () => image(PNG)],
      ["other-host@example.com", { picture: "https://evil.example.com/a" }, () => image(PNG)],
      ["refused-type@example.com", { picture: PICTURE_URL }, () => image(SVG)],
      ["not-found@example.com", { picture: PICTURE_URL }, () => new Response("gone", { status: 404 })]
    ];
    for (const [email, extra, picture] of stops) {
      const res = await googleSignIn(ctx, claimsFor(email, extra), picture);
      expect(res.status, email).toBe(302);
      expect(res.headers.location, email).toBe("/");
      expect(cookiesOf(res), email).toMatch(/session_token=/);
      const user = await userOf(ctx, email);
      expect(user.profileAvatar, email).toBe("/avatar-default.svg");
      expect(user.profile_avatar_hash, email).toBeNull();
    }
    expect(store.puts).toHaveLength(0);
  });

  it("does not fetch from an address outside Google's picture host", async () => {
    await googleSignIn(ctx, claimsFor("elsewhere@example.com", { picture: "https://evil.example.com/a" }));
    const asked = vi.mocked(globalThis.fetch).mock.calls.map(([input]) => String(input));
    expect(asked.some((url) => url.includes("evil.example.com"))).toBe(false);
  });

  it("completes the login when the upload fails, and keeps the current picture", async () => {
    await googleSignIn(ctx, claimsFor("upload@example.com"));
    const before = await userOf(ctx, "upload@example.com");
    store.failPut = true;

    const res = await googleSignIn(ctx, claimsFor("upload@example.com"), () => image(OTHER_PNG));

    expect(res.status).toBe(302);
    expect(cookiesOf(res)).toMatch(/session_token=/);
    const after = await userOf(ctx, "upload@example.com");
    expect(after.profileAvatar).toBe(before.profileAvatar);
    expect(after.profile_avatar_hash).toBe(before.profile_avatar_hash);
  });

  it("never logs the picture's address", async () => {
    const logged: string[] = [];
    for (const method of ["log", "warn", "error"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => void logged.push(args.map(String).join(" ")));
    }
    await googleSignIn(ctx, claimsFor("logged-1@example.com"), () => image(SVG));
    await googleSignIn(ctx, claimsFor("logged-2@example.com"), () => {
      throw new TypeError(`fetch failed for ${PICTURE_URL}`);
    });
    store.failPut = true;
    await googleSignIn(ctx, claimsFor("logged-3@example.com"));
    expect(logged.some((line) => line.includes("[profile-picture]"))).toBe(true);
    expect(logged.join("\n")).not.toContain("googleusercontent");
  });

  it("never fetches for another provider, and keeps a stored picture through an Amazon login", async () => {
    await googleSignIn(ctx, claimsFor("linked@example.com"));
    const before = await userOf(ctx, "linked@example.com");
    store.puts.length = 0;

    const res = await amazonSignIn(ctx, "linked@example.com");

    expect(res.status).toBe(302);
    expect(pictureFetches()).toBe(0);
    expect(store.puts).toHaveLength(0);
    const after = await userOf(ctx, "linked@example.com");
    expect(after.profileAvatar).toBe(before.profileAvatar);
    expect(after.profile_avatar_hash).toBe(before.profile_avatar_hash);
  });

  it("leaves an Amazon account on the default avatar", async () => {
    const res = await amazonSignIn(ctx, "amazon-only@example.com");
    expect(res.status).toBe(302);
    expect(pictureFetches()).toBe(0);
    expect((await userOf(ctx, "amazon-only@example.com")).profileAvatar).toBe("/avatar-default.svg");
  });

  it("gives the same address from GET and PATCH /api/me", async () => {
    const { cookie, userId } = await forgeSession(ctx, "patching@example.com");
    await ctx.db.updateTable("user").set({ profileAvatar: "avatars/abc" }).where("id", "=", userId).execute();
    const got = await request(ctx.app).get("/api/me").set("Cookie", cookie);
    expect(got.body.profileAvatar).toBe(`${CDN}/avatars/abc`);
    const patched = await request(ctx.app).patch("/api/me").set("Cookie", cookie).send({ colorScheme: "dark" });
    expect(patched.status).toBe(200);
    expect(patched.body.profileAvatar).toBe(`${CDN}/avatars/abc`);
  });
});

describe("without Spaces", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await startTestContext(PROVIDERS);
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("fetches nothing and keeps the default avatar", async () => {
    const res = await googleSignIn(ctx, claimsFor("plain@example.com"));
    expect(res.status).toBe(302);
    expect(pictureFetches()).toBe(0);
    expect((await userOf(ctx, "plain@example.com")).profileAvatar).toBe("/avatar-default.svg");
  });

  it("answers the default avatar for a key left from when Spaces was configured", async () => {
    const { cookie, userId } = await forgeSession(ctx, "leftover@example.com");
    await ctx.db.updateTable("user").set({ profileAvatar: "avatars/abc" }).where("id", "=", userId).execute();
    const got = await request(ctx.app).get("/api/me").set("Cookie", cookie);
    expect(got.body.profileAvatar).toBe("/avatar-default.svg");
  });
});

describe("the pre-launch allowlist", () => {
  let ctx: TestContext;
  const store = fakeStore();

  beforeAll(async () => {
    ctx = await startTestContext({ ...PROVIDERS, ...SPACES, ENV_ALLOWED_EMAILS: "allowed@example.com" }, { objectStore: store });
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("fetches nothing for an address it refuses", async () => {
    await googleSignIn(ctx, claimsFor("refused@example.com"));
    expect(pictureFetches()).toBe(0);
    expect(store.puts).toHaveLength(0);
  });
});

describe("removing an object no longer in use", () => {
  let ctx: TestContext;
  const store = fakeStore();
  let accounts = 0;

  beforeAll(async () => {
    ctx = await startTestContext({ ...PROVIDERS, ...SPACES }, { objectStore: store });
  });
  afterAll(async () => {
    await ctx.stop();
  });
  beforeEach(async () => {
    store.deletes.length = 0;
    store.failDelete = false;
    await ctx.db.deleteFrom("avatar_removals").execute();
  });

  async function accountWithPicture(key: string) {
    const email = `removal-${++accounts}@example.com`;
    const { userId } = await forgeSession(ctx, email);
    await ctx.db.updateTable("user").set({ profileAvatar: key, profile_avatar_hash: "hash" }).where("id", "=", userId).execute();
    return { id: userId, email };
  }

  it("queues the key when an account with a picture is deleted", async () => {
    await deleteAccount(ctx, await accountWithPicture("avatars/deleted"));
    expect(await queued(ctx)).toEqual(["avatars/deleted"]);
  });

  it("queues nothing for an account on the default avatar", async () => {
    const email = "default-avatar@example.com";
    const { userId } = await forgeSession(ctx, email);
    await deleteAccount(ctx, { id: userId, email });
    expect(await queued(ctx)).toEqual([]);
  });

  it("deletes the object, then the row", async () => {
    await ctx.db.insertInto("avatar_removals").values({ key: "avatars/one" }).execute();
    expect(await removeAvatarObjects(ctx, store)).toBe(1);
    expect(store.deletes).toEqual(["avatars/one"]);
    expect(await queued(ctx)).toEqual([]);
  });

  it("keeps the row when the delete fails, and succeeds on a later tick, without logging the key", async () => {
    await ctx.db.insertInto("avatar_removals").values({ key: "avatars/retry" }).execute();
    store.failDelete = true;
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await removeAvatarObjects(ctx, store)).toBe(0);
    expect(await queued(ctx)).toEqual(["avatars/retry"]);
    expect(errors.mock.calls.flat().join(" ")).not.toContain("avatars/retry");
    store.failDelete = false;
    expect(await removeAvatarObjects(ctx, store)).toBe(1);
    expect(await queued(ctx)).toEqual([]);
  });

  it("deletes at most 100 in a tick, oldest first", async () => {
    const start = Date.parse("2026-01-01T00:00:00Z");
    await ctx.db
      .insertInto("avatar_removals")
      .values(Array.from({ length: 101 }, (_, i) => ({ key: `avatars/${i}`, queued_at: new Date(start + i * 1000) })))
      .execute();
    expect(await removeAvatarObjects(ctx, store)).toBe(100);
    expect(store.deletes[0]).toBe("avatars/0");
    expect(await queued(ctx)).toEqual(["avatars/100"]);
  });

  it("is scheduled every 5 minutes under its own lock, only when Spaces is configured", async () => {
    const entry = buildSweepSchedules(ctx.config, ctx).find((s) => s.name === "avatarRemovalSweep");
    expect(entry).toMatchObject({ intervalMs: 300_000, lockId: SWEEP_LOCKS.avatarRemovals });
    expect(SWEEP_LOCKS.avatarRemovals).toBe(13);
    expect(buildSweepSchedules(ctx.config, { ...ctx, objectStore: null }).some((s) => s.name === "avatarRemovalSweep")).toBe(false);
  });
});
