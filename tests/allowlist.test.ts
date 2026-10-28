import { randomBytes } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { ConfigError, loadConfig } from "../src/config.js";
import { NOT_LAUNCHED_MESSAGE, allowlistStatus, isAllowed } from "../src/auth/allowlist.js";
import { hashToken } from "../src/auth/auth.js";
import { AGREED, extractLink, forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";

const SECRET = "test-secret-0123456789-0123456789-0123456789";
const LISTED = "tester@example.org";
const SEED = "seed@example.org";
const ADMIN = "admin@example.org";

function configWith(env: Record<string, string>) {
  return loadConfig({ ENV_BETTER_AUTH_SECRET: SECRET, ENV_PUBLIC_ORIGIN: "http://localhost:8080", ...env });
}

describe("allowlist setting", () => {
  it("is off when absent, empty or only separators", () => {
    expect(configWith({}).allowedEmailKeys).toBeUndefined();
    expect(configWith({ ENV_ALLOWED_EMAILS: "" }).allowedEmailKeys).toBeUndefined();
    expect(configWith({ ENV_ALLOWED_EMAILS: " , " }).allowedEmailKeys).toBeUndefined();
  });

  it("holds the email key of each trimmed, lower-cased entry", () => {
    const keys = configWith({ ENV_ALLOWED_EMAILS: " Tester@Example.org , John.Smith+x@googlemail.com" }).allowedEmailKeys;
    expect([...keys!].sort()).toEqual(["johnsmith@gmail.com", "tester@example.org"]);
  });

  it("refuses an entry that is not an address, naming the setting", () => {
    expect(() => configWith({ ENV_ALLOWED_EMAILS: "tester@example.org,not-an-address" })).toThrow(ConfigError);
    expect(() => configWith({ ENV_ALLOWED_EMAILS: "not-an-address" })).toThrow(/ENV_ALLOWED_EMAILS/);
  });

  it("reports its state at startup by count, never by address", () => {
    expect(allowlistStatus(configWith({}))).toBe("[auth] Sign-up allowlist off");
    const on = allowlistStatus(configWith({ ENV_ALLOWED_EMAILS: "a@example.org,b@example.org" }));
    expect(on).toBe("[auth] Sign-up allowlist on (2 addresses)");
    expect(on).not.toContain("example.org");
  });
});

describe("isAllowed", () => {
  it("allows everyone while the list is off", () => {
    expect(isAllowed("anyone@example.org", configWith({}))).toBe(true);
  });

  it("allows the same mailbox, administrators, and no one else", () => {
    const config = configWith({ ENV_ALLOWED_EMAILS: "john.smith@gmail.com", ENV_ADMINS: ADMIN });
    expect(isAllowed("john.smith@gmail.com", config)).toBe(true);
    expect(isAllowed("JohnSmith+polls@googlemail.com", config)).toBe(true);
    expect(isAllowed(ADMIN, config)).toBe(true);
    expect(isAllowed("someone@example.org", config)).toBe(false);
  });
});

describe("with the list on", () => {
  let ctx: TestContext;
  let log: ReturnType<typeof vi.spyOn>;
  let next = 1;
  const freshIp = () => `10.9.0.${next++}`;
  const logged = () => log.mock.calls.map((call) => call.map(String).join(" ")).join("\n");

  beforeAll(async () => {
    ctx = await startTestContext({
      ENV_ALLOWED_EMAILS: `${LISTED},${SEED},other-listed@example.org`,
      ENV_ADMINS: ADMIN,
      ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW: "1000"
    });
  });
  afterAll(async () => {
    await ctx.stop();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function spyLog() {
    log = vi.spyOn(console, "log").mockImplementation(() => {});
  }

  async function unlistedUser(email: string) {
    const forged = await forgeSession(ctx, SEED);
    await ctx.db.updateTable("user").set({ email }).where("id", "=", forged.userId).execute();
    return forged;
  }

  async function earlierLink(email: string) {
    const binding = randomBytes(24).toString("base64url");
    await ctx.auth.api.signInMagicLink({
      body: { email, callbackURL: "/", metadata: { origin: "http://localhost", stay: false, bind: hashToken(binding) } },
      headers: new Headers()
    });
    const link = new URL(extractLink(ctx.sent.at(-1)!));
    return { path: link.pathname + link.search, token: link.searchParams.get("token")!, binding };
  }

  const userRow = (email: string) =>
    ctx.db.selectFrom("user").select("id").where("email", "=", email).executeTakeFirst();

  describe("create-account (A1)", () => {
    it("sends a listed address its link as today", async () => {
      const before = ctx.sent.length;
      const res = await request(ctx.app).post("/api/auth/create-account").set("x-forwarded-for", freshIp()).send({ ...AGREED, email: LISTED });
      expect(res.status).toBe(200);
      expect(ctx.sent.length).toBe(before + 1);
    });

    it("refuses an unlisted address: no account, no email, a masked log line", async () => {
      spyLog();
      const before = ctx.sent.length;
      const res = await request(ctx.app)
        .post("/api/auth/create-account")
        .set("x-forwarded-for", freshIp())
        .send({ ...AGREED, email: "visitor@example.org" });
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: NOT_LAUNCHED_MESSAGE, code: "not-launched" });
      expect(await userRow("visitor@example.org")).toBeUndefined();
      expect(ctx.sent.length).toBe(before);
      expect(logged()).toContain("[auth] Not launched: create-account refused for v•••@example.org");
      expect(logged()).not.toContain("visitor@example.org");
    });

    it("still answers a filled honeypot as on success", async () => {
      const res = await request(ctx.app)
        .post("/api/auth/create-account")
        .set("x-forwarded-for", freshIp())
        .send({ ...AGREED, email: "visitor@example.org", homepage: "x" });
      expect(res.status).toBe(200);
    });
  });

  describe("request-login-link (A2)", () => {
    it("refuses an unlisted address with or without an account, sending nothing", async () => {
      spyLog();
      await unlistedUser("member@example.org");
      const before = ctx.sent.length;
      for (const email of ["member@example.org", "stranger@example.org"]) {
        const res = await request(ctx.app).post("/api/auth/request-login-link").set("x-forwarded-for", freshIp()).send({ email });
        expect(res.status).toBe(403);
        expect(res.body.code).toBe("not-launched");
      }
      expect(ctx.sent.length).toBe(before);
      expect(logged()).toContain("[auth] Not launched: login refused for m•••@example.org");
    });

    it("sends a listed address with no account the invitation, as today", async () => {
      const before = ctx.sent.length;
      const res = await request(ctx.app)
        .post("/api/auth/request-login-link")
        .set("x-forwarded-for", freshIp())
        .send({ email: "other-listed@example.org" });
      expect(res.status).toBe(200);
      expect(ctx.sent.length).toBe(before + 1);
      expect(ctx.sent.at(-1)!.subject).toBe("Finish creating your CrowdPoll account");
    });

    it("lets an administrator who is not listed sign in", async () => {
      await forgeSession(ctx, ADMIN);
      const before = ctx.sent.length;
      const res = await request(ctx.app).post("/api/auth/request-login-link").set("x-forwarded-for", freshIp()).send({ email: ADMIN });
      expect(res.status).toBe(200);
      expect(ctx.sent.length).toBe(before + 1);
    });
  });

  describe("sign-in link (A4, A5)", () => {
    it("refuses a link issued earlier without consuming it", async () => {
      spyLog();
      await unlistedUser("early@example.org");
      const { path, token, binding } = await earlierLink("early@example.org");
      const res = await request(ctx.app).get(path).set("Cookie", `signin_binding=${binding}`).redirects(0);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/login?error=not-launched");
      expect([res.headers["set-cookie"] ?? []].flat().some((c: string) => c.startsWith("session_token="))).toBe(false);
      const row = await ctx.db.selectFrom("verification").select("id").where("identifier", "=", hashToken(token)).executeTakeFirst();
      expect(row).toBeDefined();
      expect(logged()).toContain("[auth] Not launched: session refused for e•••@example.org");
    });

    it("refuses the confirmation page with a redirect to the message", async () => {
      await unlistedUser("confirm@example.org");
      const { token } = await earlierLink("confirm@example.org");
      const res = await request(ctx.app)
        .post("/api/auth/confirm-signin")
        .set("Host", "127.0.0.1")
        .set("Origin", "http://127.0.0.1")
        .send({ token });
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: NOT_LAUNCHED_MESSAGE, code: "not-launched", redirect: "/login?error=not-launched" });
    });
  });

  describe("session hook", () => {
    it("creates no session even when a route is bypassed", async () => {
      spyLog();
      const { userId } = await unlistedUser("bypass@example.org");
      const { token } = await earlierLink("bypass@example.org");
      const before = await ctx.db.selectFrom("session").select("id").where("userId", "=", userId).execute();
      await ctx.auth.api
        .magicLinkVerify({ query: { token, callbackURL: "/" }, headers: new Headers(), asResponse: true })
        .catch(() => undefined);
      const after = await ctx.db.selectFrom("session").select("id").where("userId", "=", userId).execute();
      expect(after.map((s) => s.id).sort()).toEqual(before.map((s) => s.id).sort());
      expect(logged()).toContain("[auth] Not launched: session refused for b•••@example.org");
    });

    it("keeps a session that already existed working", async () => {
      const { cookie } = await unlistedUser("existing@example.org");
      const res = await request(ctx.app).get("/api/me").set("Cookie", cookie);
      expect(res.status).toBe(200);
    });

    it("creates no account for an unlisted user created outside the routes", async () => {
      const authCtx = await ctx.auth.$context;
      await expect(authCtx.internalAdapter.createUser({ email: "direct@example.org", name: "", emailVerified: true })).rejects.toThrow();
      expect(await userRow("direct@example.org")).toBeUndefined();
    });
  });

  describe("email change (A3, A6)", () => {
    it("refuses a change to an unlisted address and sends nothing", async () => {
      spyLog();
      const { cookie } = await unlistedUser("changer@example.org");
      const before = ctx.sent.length;
      const res = await request(ctx.app)
        .post("/api/me/email-change")
        .set("x-forwarded-for", freshIp())
        .set("Cookie", cookie)
        .send({ newEmail: "elsewhere@example.org" });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("not-launched");
      expect(ctx.sent.length).toBe(before);
      expect(logged()).toContain("[auth] Not launched: email-change refused for e•••@example.org");
    });

    it("allows a change to a listed address", async () => {
      const { cookie } = await unlistedUser("mover@example.org");
      const res = await request(ctx.app)
        .post("/api/me/email-change")
        .set("x-forwarded-for", freshIp())
        .set("Cookie", cookie)
        .send({ newEmail: "other-listed@example.org" });
      expect(res.status).toBe(202);
    });

    it("refuses a change link to an unlisted address issued earlier", async () => {
      const { userId } = await unlistedUser("linked@example.org");
      const token = randomBytes(24).toString("base64url");
      const authCtx = await ctx.auth.$context;
      await authCtx.internalAdapter.createVerificationValue({
        identifier: hashToken(token),
        value: JSON.stringify({ purpose: "email-change", userId, newEmail: "unlisted-new@example.org", oldEmail: "linked@example.org" }),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });
      const res = await request(ctx.app).get(`/api/me/email-change/verify?token=${token}`).redirects(0);
      expect(res.headers.location).toBe("/profile?error=not-launched");
      const row = await ctx.db.selectFrom("user").select("email").where("id", "=", userId).executeTakeFirst();
      expect(row!.email).toBe("linked@example.org");
    });
  });
});

describe("with the list off", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await startTestContext();
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("creates an account for any address, as before", async () => {
    const res = await request(ctx.app).post("/api/auth/create-account").set("x-forwarded-for", "10.9.1.1").send({ ...AGREED, email: "anyone@example.org" });
    expect(res.status).toBe(200);
    expect(await ctx.db.selectFrom("user").select("id").where("email", "=", "anyone@example.org").executeTakeFirst()).toBeDefined();
  });
});

describe("social sign-in with the list on (T033)", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await startTestContext({ ENV_SIGNIN_METHOD: "oauth", ENV_OAUTH_GOOGLE_CLIENT_ID: "google-client", ENV_OAUTH_GOOGLE_CLIENT_SECRET: "google-secret", ENV_ALLOWED_EMAILS: LISTED });
  });
  afterAll(async () => {
    await ctx.stop();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refuses an unlisted provider address before an account exists, landing on the message", async () => {
    const start = await request(ctx.app).post("/api/auth/sign-in/social").send({ provider: "google", callbackURL: "/" });
    expect(start.status).toBe(200);
    const state = new URL(start.body.url).searchParams.get("state")!;
    const stateCookie = [start.headers["set-cookie"]].flat().map((cookie) => String(cookie).split(";")[0]).join("; ");

    const realFetch = globalThis.fetch;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input instanceof Request ? input.url : input);
      const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
      if (url === "https://oauth2.googleapis.com/token") {
        const claims = { sub: "4242", name: "Stranger", email: "stranger@example.org", email_verified: true };
        const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
        return json({ access_token: "ya29.test", token_type: "Bearer", id_token: `${part({ alg: "none" })}.${part(claims)}.` });
      }
      return realFetch(input, init);
    });
    vi.spyOn(console, "log").mockImplementation(() => {});

    const res = await request(ctx.app)
      .get(`/api/auth/callback/google?code=test-code&state=${encodeURIComponent(state)}`)
      .set("Cookie", stateCookie)
      .redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/^\/login\?error=not-launched/);
    expect(await ctx.db.selectFrom("user").select("id").where("email", "=", "stranger@example.org").executeTakeFirst()).toBeUndefined();
  });
});
