/**
 * Site Settings — the per-account color scheme: storage, GET/PATCH /api/me and the /settings page route.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { sql } from "kysely";
import { AGREED, startTestContext, extractLinkPath, followSignInLink, type TestContext } from "./helpers/setup.js";

let ctx: TestContext;
let nextIp = 1;
const freshIp = () => `10.7.0.${nextIp++}`;
let nextUser = 1;
const freshEmail = () => `scheme${nextUser++}@example.com`;

async function signIn(email: string): Promise<string> {
  await request(ctx.app).post("/api/auth/create-account").set("x-forwarded-for", freshIp()).send({ ...AGREED, email });
  const res = await followSignInLink(ctx, extractLinkPath(ctx.sent.at(-1)!));
  const setCookie = (res.headers["set-cookie"] as unknown as string[]).find((c) => c.startsWith("session_token="))!;
  return setCookie.split(";")[0]!;
}

async function storedScheme(email: string): Promise<string | null | undefined> {
  const row = await ctx.db.selectFrom("user").select("color_scheme").where("email", "=", email).executeTakeFirst();
  return row?.color_scheme;
}

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  await ctx.stop();
});

describe("GET /api/me colorScheme", () => {
  it("answers light for a user who never chose", async () => {
    const cookie = await signIn(freshEmail());
    const me = await request(ctx.app).get("/api/me").set("Cookie", cookie);
    expect(me.status).toBe(200);
    expect(me.body.colorScheme).toBe("light");
  });
});

describe("PATCH /api/me colorScheme", () => {
  it("stores dark and the cached session answers it at once", async () => {
    const email = freshEmail();
    const cookie = await signIn(email);
    await request(ctx.app).get("/api/me").set("Cookie", cookie);
    const res = await request(ctx.app).patch("/api/me").set("Cookie", cookie).send({ colorScheme: "dark" });
    expect(res.status).toBe(200);
    expect(res.body.colorScheme).toBe("dark");
    expect(await storedScheme(email)).toBe("dark");
    const me = await request(ctx.app).get("/api/me").set("Cookie", cookie);
    expect(me.body.colorScheme).toBe("dark");
  });

  it("refuses a value other than light or dark and stores nothing", async () => {
    const email = freshEmail();
    const cookie = await signIn(email);
    const res = await request(ctx.app).patch("/api/me").set("Cookie", cookie).send({ colorScheme: "blue" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Color scheme must be "light" or "dark".');
    expect(await storedScheme(email)).toBeNull();
  });

  it("refuses a request with nothing to change", async () => {
    const cookie = await signIn(freshEmail());
    const res = await request(ctx.app).patch("/api/me").set("Cookie", cookie).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Nothing to change.");
  });

  it("leaves the color scheme alone on a rename", async () => {
    const email = freshEmail();
    const cookie = await signIn(email);
    const res = await request(ctx.app).patch("/api/me").set("Cookie", cookie).send({ userName: "scheme-rename" });
    expect(res.status).toBe(200);
    expect(res.body.userName).toBe("scheme-rename");
    expect(res.body.colorScheme).toBe("light");
    expect(await storedScheme(email)).toBeNull();
  });

  it("changes both the userName and the color scheme in one request", async () => {
    const email = freshEmail();
    const cookie = await signIn(email);
    const res = await request(ctx.app).patch("/api/me").set("Cookie", cookie).send({ userName: "scheme-both", colorScheme: "dark" });
    expect(res.status).toBe(200);
    expect(res.body.userName).toBe("scheme-both");
    expect(res.body.colorScheme).toBe("dark");
    expect(await storedScheme(email)).toBe("dark");
  });

  it("writes nothing when the scheme is valid but the userName is not", async () => {
    const email = freshEmail();
    const cookie = await signIn(email);
    const res = await request(ctx.app).patch("/api/me").set("Cookie", cookie).send({ userName: "", colorScheme: "dark" });
    expect(res.status).toBe(400);
    expect(await storedScheme(email)).toBeNull();
  });

  it("does not bump any poll's content version", async () => {
    const cookie = await signIn(freshEmail());
    const total = async () =>
      (await sql<{ n: string | null }>`select sum(content_version) as n from polls`.execute(ctx.db)).rows[0]?.n ?? null;
    const before = await total();
    await request(ctx.app).patch("/api/me").set("Cookie", cookie).send({ colorScheme: "dark" });
    expect(await total()).toBe(before);
  });

  it("serves /settings to a signed-in user and sends a guest to sign in", async () => {
    const cookie = await signIn(freshEmail());
    const page = await request(ctx.app).get("/settings").set("Cookie", cookie);
    expect(page.status).toBe(200);
    expect(page.text).toContain("<title>Site Settings</title>");
    const guest = await request(ctx.app).get("/settings");
    expect(guest.status).toBe(302);
    expect(guest.headers.location).toBe("/login");
  });

  it("answers 401 when signed out", async () => {
    const res = await request(ctx.app).patch("/api/me").send({ colorScheme: "dark" });
    expect(res.status).toBe(401);
  });

  it("refuses a value outside light and dark at the database too", async () => {
    const email = freshEmail();
    await signIn(email);
    await expect(
      ctx.db.updateTable("user").set({ color_scheme: "blue" }).where("email", "=", email).execute()
    ).rejects.toThrow();
  });

  it("is removed with the account", async () => {
    const email = freshEmail();
    const cookie = await signIn(email);
    await request(ctx.app).patch("/api/me").set("Cookie", cookie).send({ colorScheme: "dark" });
    const res = await request(ctx.app)
      .delete("/api/me")
      .set("Host", "127.0.0.1")
      .set("Origin", "http://127.0.0.1")
      .set("Cookie", cookie)
      .send({ confirm: "DELETE" });
    expect(res.status).toBe(200);
    expect(await storedScheme(email)).toBeUndefined();
  });
});
