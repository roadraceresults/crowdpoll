/**
 * Provider sign-in end to end, with each provider's token and profile calls stubbed (research R3–R8;
 * contracts/api.md A2, A3): signing in, refusals, linking by email key, Apple's form_post and Amazon.
 * The refusal of an address the pre-launch allowlist does not hold is in allowlist.test.ts (T033).
 */
import { generateKeyPairSync } from "node:crypto";
import { sql } from "kysely";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { deleteAccount } from "../src/legal/deleteAccount.js";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";

const ORIGIN = "http://localhost:8080";
const MICROSOFT_CONSUMER_TENANT = "9188040d-6c67-4c5b-b112-36a304b66dad";
const TOKEN_URLS = {
  google: "https://oauth2.googleapis.com/token",
  microsoft: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  apple: "https://appleid.apple.com/auth/token"
} as const;

type SocialProvider = keyof typeof TOKEN_URLS;

const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const idToken = (claims: object) => `${part({ alg: "none" })}.${part(claims)}.`;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function cookiesOf(res: request.Response): string {
  return [res.headers["set-cookie"] ?? []]
    .flat()
    .map((cookie) => String(cookie).split(";")[0]!)
    .filter((pair) => !pair.endsWith("="))
    .join("; ");
}

function stubFetch(answer: (url: string) => Response | undefined): void {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input instanceof Request ? input.url : input);
    return answer(url) ?? new Response("not found", { status: 404 });
  });
}

let ctx: TestContext;
let client = 0;

/** Each start comes from its own address: BetterAuth allows three sign-in starts per address per 10 seconds. */
async function start(provider: SocialProvider | "amazon") {
  const res =
    provider === "amazon"
      ? await request(ctx.app).post("/api/auth/sign-in/oauth2").set("X-Forwarded-For", `198.51.100.${++client}`).send({ providerId: "amazon", callbackURL: "/" })
      : await request(ctx.app).post("/api/auth/sign-in/social").set("X-Forwarded-For", `198.51.100.${++client}`).send({ provider, callbackURL: "/" });
  expect(res.status).toBe(200);
  const url = new URL(res.body.url);
  return { url, state: url.searchParams.get("state")!, cookie: cookiesOf(res), res };
}

async function signIn(provider: SocialProvider, claims: object, token: () => Response = () =>
  json({ access_token: "access", token_type: "Bearer", id_token: idToken(claims) })) {
  const { state, cookie } = await start(provider);
  stubFetch((url) => (url === TOKEN_URLS[provider] ? token() : undefined));
  return request(ctx.app)
    .get(`/api/auth/callback/${provider}?code=code&state=${encodeURIComponent(state)}`)
    .set("Cookie", cookie)
    .redirects(0);
}

async function amazonSignIn(profile: object) {
  const { state, cookie } = await start("amazon");
  stubFetch((url) => {
    if (url === "https://api.amazon.com/auth/o2/token") return json({ access_token: "Atza|test", token_type: "bearer" });
    if (url === "https://api.amazon.com/user/profile") return json(profile);
    return undefined;
  });
  return request(ctx.app)
    .get(`/api/auth/oauth2/callback/amazon?code=code&state=${encodeURIComponent(state)}`)
    .set("Cookie", cookie)
    .redirects(0);
}

const userByEmail = (email: string) =>
  ctx.db.selectFrom("user").selectAll().where("email", "=", email).executeTakeFirst();
const accountsOf = (userId: string) =>
  ctx.db.selectFrom("account").select(["providerId", "accountId"]).where("userId", "=", userId).execute();

beforeAll(async () => {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  ctx = await startTestContext({
    ENV_SIGNIN_METHOD: "both",
    ENV_OAUTH_GOOGLE_CLIENT_ID: "google-client",
    ENV_OAUTH_GOOGLE_CLIENT_SECRET: "google-secret",
    ENV_OAUTH_APPLE_CLIENT_ID: "vote.crowdpoll.signin",
    ENV_OAUTH_APPLE_TEAM_ID: "TEAM123456",
    ENV_OAUTH_APPLE_KEY_ID: "KEY1234567",
    ENV_OAUTH_APPLE_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    ENV_OAUTH_MICROSOFT_CLIENT_ID: "ms-client",
    ENV_OAUTH_MICROSOFT_CLIENT_SECRET: "ms-secret",
    ENV_OAUTH_AMAZON_CLIENT_ID: "amzn-client",
    ENV_OAUTH_AMAZON_CLIENT_SECRET: "amzn-secret"
  });
  // The harness marks every new user as having accepted the Terms; a provider account must not.
  await sql`alter table "user" alter column "terms_version" drop default`.execute(ctx.db);
});
afterAll(async () => {
  await ctx.stop();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("signing in (US1)", () => {
  it("sends Google the redirect URI built from ENV_PUBLIC_ORIGIN, asking for identity only", async () => {
    const { url, res } = await start("google");
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("redirect_uri")).toBe(`${ORIGIN}/api/auth/callback/google`);
    expect(url.searchParams.get("scope")!.split(" ").sort()).toEqual(["email", "openid", "profile"]);
    expect(String(res.headers["set-cookie"])).toMatch(/^oauth_state=.*HttpOnly.*Secure/i);
  });

  it("creates the account, signs it in, and asks for the Terms on the next page", async () => {
    const res = await signIn("google", { sub: "g-new", email: "new.person@example.com", email_verified: true, name: "New Person", picture: "https://lh3.googleusercontent.com/a/photo" });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/");
    const session = cookiesOf(res);
    expect(session).toMatch(/session_token=/);
    const user = await userByEmail("new.person@example.com");
    expect(user?.emailVerified).toBe(true);
    expect(user?.image).toBeNull();
    expect(user?.profileAvatar).toBe("/avatar-default.svg");
    expect(await accountsOf(user!.id)).toEqual([{ providerId: "google", accountId: "g-new" }]);

    const page = await request(ctx.app).get("/").set("Cookie", session).redirects(0);
    expect(page.status).toBe(302);
    expect(page.headers.location).toMatch(/^\/accept-terms/);
  });

  it("lands a provider's refusal on the Login card", async () => {
    const { state, cookie } = await start("google");
    const res = await request(ctx.app)
      .get(`/api/auth/callback/google?error=access_denied&state=${encodeURIComponent(state)}`)
      .set("Cookie", cookie)
      .redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/^\/login\?error=access_denied/);
  });

  it("refuses a profile with no email address and creates nothing", async () => {
    const res = await signIn("google", { sub: "g-no-email", name: "No Email" });
    expect(res.headers.location).toMatch(/^\/login\?error=email_not_found/);
    expect(await ctx.db.selectFrom("account").select("id").where("accountId", "=", "g-no-email").executeTakeFirst()).toBeUndefined();
  });

  it("fails one provider whose credentials are refused while another still works", async () => {
    const refused = await signIn("google", {}, () => json({ error: "invalid_client" }, 401));
    expect(refused.status).toBe(302);
    expect(refused.headers.location).toMatch(/^\/login\?error=/);

    const working = await signIn("microsoft", { sub: "ms-ok", email: "works@outlook.com", tid: MICROSOFT_CONSUMER_TENANT, name: "Works" });
    expect(working.headers.location).toBe("/");
  });
});

describe("linking to an existing account (US2)", () => {
  it("links Google to the account with the same email key", async () => {
    const { userId } = await forgeSession(ctx, "john.smith@gmail.com");
    const res = await signIn("google", { sub: "g-john", email: "johnsmith@gmail.com", email_verified: true, name: "John" });
    expect(res.headers.location).toBe("/");
    expect(await accountsOf(userId)).toContainEqual({ providerId: "google", accountId: "g-john" });
    expect(await userByEmail("johnsmith@gmail.com")).toBeUndefined();
  });

  it("links a personal Microsoft account and an Amazon account the same way", async () => {
    const mary = await forgeSession(ctx, "mary@example.com");
    const microsoft = await signIn("microsoft", { sub: "ms-mary", email: "mary+ms@example.com", tid: MICROSOFT_CONSUMER_TENANT, name: "Mary" });
    expect(microsoft.headers.location).toBe("/");
    expect(await accountsOf(mary.userId)).toContainEqual({ providerId: "microsoft", accountId: "ms-mary" });

    const pat = await forgeSession(ctx, "pat@example.com");
    const amazon = await amazonSignIn({ user_id: "amzn1.account.PAT", name: "Pat", email: "Pat@example.com" });
    expect(amazon.headers.location).toBe("/");
    expect(await accountsOf(pat.userId)).toContainEqual({ providerId: "amazon", accountId: "amzn1.account.PAT" });
  });

  it("refuses to link an account that never signed in", async () => {
    const authCtx = await ctx.auth.$context;
    const pending = await authCtx.internalAdapter.createUser({ email: "pending@example.com", name: "", emailVerified: false });
    const res = await signIn("google", { sub: "g-pending", email: "pending@example.com", email_verified: true, name: "P" });
    expect(res.headers.location).toMatch(/^\/login\?error=account_not_linked/);
    expect(await accountsOf(pending.id)).toEqual([]);
  });

  it("refuses to link an address the provider has not verified", async () => {
    const { userId } = await forgeSession(ctx, "unverified@example.com");
    const res = await signIn("microsoft", { sub: "ms-unverified", email: "unverified@example.com", email_verified: false, name: "U" });
    expect(res.headers.location).toMatch(/^\/login\?error=account_not_linked/);
    expect(await accountsOf(userId)).toEqual([]);
  });

  it("gives an Apple relay address its own account", async () => {
    await forgeSession(ctx, "relay.owner@gmail.com");
    const res = await signIn("apple", { sub: "apple-relay", email: "x7q2@privaterelay.appleid.com", email_verified: "true" });
    expect(res.headers.location).toBe("/");
    const user = await userByEmail("x7q2@privaterelay.appleid.com");
    expect(await accountsOf(user!.id)).toEqual([{ providerId: "apple", accountId: "apple-relay" }]);
  });

  it("keeps the link and the new address after an email change, and never overwrites name or address", async () => {
    const first = await signIn("google", { sub: "g-changer", email: "changer@example.com", email_verified: true, name: "First Name" });
    expect(first.headers.location).toBe("/");
    const user = await userByEmail("changer@example.com");
    await ctx.db.updateTable("user").set({ email: "changed@example.com" }).where("id", "=", user!.id).execute();

    const again = await signIn("google", { sub: "g-changer", email: "changer@example.com", email_verified: true, name: "Another Name" });
    expect(again.headers.location).toBe("/");
    const after = await ctx.db.selectFrom("user").selectAll().where("id", "=", user!.id).executeTakeFirstOrThrow();
    expect(after.email).toBe("changed@example.com");
    expect(after.name).toBe("First Name");
    expect(after.userName).toBe(user!.userName);
    expect(await userByEmail("changer@example.com")).toBeUndefined();
  });

  it("removes the provider links when the account is deleted", async () => {
    await signIn("google", { sub: "g-leaver", email: "leaver@example.com", email_verified: true, name: "Leaver" });
    const user = await userByEmail("leaver@example.com");
    expect(await accountsOf(user!.id)).toHaveLength(1);
    vi.spyOn(console, "log").mockImplementation(() => {});
    await deleteAccount({ db: ctx.db, cache: ctx.cache }, { id: user!.id, email: user!.email });
    expect(await ctx.db.selectFrom("account").select("id").where("accountId", "=", "g-leaver").execute()).toEqual([]);
  });
});

describe("Apple and Amazon (US4)", () => {
  it("answers Apple's form_post with a redirect to the GET callback, then signs the person in", async () => {
    const { url, state, cookie } = await start("apple");
    expect(url.origin + url.pathname).toBe("https://appleid.apple.com/auth/authorize");
    expect(url.searchParams.get("response_mode")).toBe("form_post");
    expect(url.searchParams.get("redirect_uri")).toBe(`${ORIGIN}/api/auth/callback/apple`);

    const posted = await request(ctx.app)
      .post("/api/auth/callback/apple")
      .type("form")
      .send({ code: "code", state, user: JSON.stringify({ name: { firstName: "Ann", lastName: "Lee" } }) })
      .redirects(0);
    expect(posted.status).toBe(302);
    const next = new URL(posted.headers.location!);
    expect(next.origin + next.pathname).toBe(`${ORIGIN}/api/auth/callback/apple`);

    stubFetch((u) =>
      u === TOKEN_URLS.apple
        ? json({ access_token: "a", token_type: "Bearer", id_token: idToken({ sub: "apple-ann", email: "ann@icloud.com", email_verified: "true" }) })
        : undefined
    );
    const res = await request(ctx.app).get(next.pathname + next.search).set("Cookie", cookie).redirects(0);
    expect(res.headers.location).toBe("/");
    const user = await userByEmail("ann@icloud.com");
    expect(user?.name).toBe("Ann Lee");
    vi.restoreAllMocks();

    const second = await signIn("apple", { sub: "apple-ann", email: "ann@icloud.com", email_verified: "true" });
    expect(second.headers.location).toBe("/");
    expect((await userByEmail("ann@icloud.com"))?.name).toBe("Ann Lee");
  });

  it("exchanges Apple's code with the secret the refresh last wrote into the provider's options", async () => {
    const options = ctx.auth.options.socialProviders.apple as { clientSecret: string };
    const original = options.clientSecret;
    options.clientSecret = "re-signed-secret";
    try {
      const { state, cookie } = await start("apple");
      let sentSecret: string | null = null;
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
        const url = String(input instanceof Request ? input.url : input);
        if (url !== TOKEN_URLS.apple) return new Response("not found", { status: 404 });
        sentSecret = new URLSearchParams(String(init?.body)).get("client_secret");
        return json({ access_token: "a", token_type: "Bearer", id_token: idToken({ sub: "apple-rotated", email: "rotated@icloud.com", email_verified: "true" }) });
      });
      const res = await request(ctx.app)
        .get(`/api/auth/callback/apple?code=code&state=${encodeURIComponent(state)}`)
        .set("Cookie", cookie)
        .redirects(0);
      expect(res.headers.location).toBe("/");
      expect(sentSecret).toBe("re-signed-secret");
    } finally {
      options.clientSecret = original;
    }
  });

  it("starts Amazon at Login with Amazon with its own callback path, and signs the person in", async () => {
    const { url } = await start("amazon");
    expect(url.origin + url.pathname).toBe("https://www.amazon.com/ap/oa");
    expect(url.searchParams.get("redirect_uri")).toBe(`${ORIGIN}/api/auth/oauth2/callback/amazon`);
    expect(url.searchParams.get("scope")).toBe("profile");

    const res = await amazonSignIn({ user_id: "amzn1.account.NEW", name: "Shopper", email: "shopper@example.com" });
    expect(res.headers.location).toBe("/");
    expect(cookiesOf(res)).toMatch(/session_token=/);
    const user = await userByEmail("shopper@example.com");
    expect(user?.emailVerified).toBe(true);
  });
});
