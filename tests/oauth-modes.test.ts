/**
 * The three sign-in modes (research R2, R3; contracts/api.md A1, A4): `native` keeps the provider routes
 * absent, `oauth` keeps the email routes absent, and `both` serves each from its own handler.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { AGREED, extractLinkPath, followSignInLink, startTestContext, type TestContext } from "./helpers/setup.js";

const GOOGLE = { ENV_OAUTH_GOOGLE_CLIENT_ID: "google-client", ENV_OAUTH_GOOGLE_CLIENT_SECRET: "google-secret" };
const MICROSOFT = { ENV_OAUTH_MICROSOFT_CLIENT_ID: "ms-client", ENV_OAUTH_MICROSOFT_CLIENT_SECRET: "ms-secret" };
const AMAZON = { ENV_OAUTH_AMAZON_CLIENT_ID: "amzn-client", ENV_OAUTH_AMAZON_CLIENT_SECRET: "amzn-secret" };

const NOT_FOUND = { error: "Not found" };

async function nativeRoutes(ctx: TestContext) {
  return Promise.all([
    request(ctx.app).post("/api/auth/create-account").send({ email: "" }),
    request(ctx.app).post("/api/auth/request-login-link").send({ email: "" }),
    request(ctx.app).get("/api/auth/verify?token=abc&stay=0"),
    request(ctx.app).post("/api/me/email-change").send({ newEmail: "" }),
    request(ctx.app).get("/api/me/email-change/verify?token=abc")
  ]);
}

async function startRoutes(ctx: TestContext) {
  return Promise.all([
    request(ctx.app).post("/api/auth/sign-in/social").send({ provider: "google", callbackURL: "/" }),
    request(ctx.app).post("/api/auth/sign-in/oauth2").send({ providerId: "amazon", callbackURL: "/" })
  ]);
}

describe("native mode", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await startTestContext();
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("reports native and no providers (A1)", async () => {
    const res = await request(ctx.app).get("/api/config");
    expect(res.body.signinMethod).toBe("native");
    expect(res.body.oauthProviders).toEqual([]);
  });

  it("answers the provider routes with the app's 404 (A4)", async () => {
    for (const res of await startRoutes(ctx)) {
      expect(res.status).toBe(404);
      expect(res.body).toEqual(NOT_FOUND);
    }
    const callback = await request(ctx.app).get("/api/auth/callback/google?code=x&state=y");
    expect(callback.status).toBe(404);
    const amazonCallback = await request(ctx.app).get("/api/auth/oauth2/callback/amazon?code=x&state=y");
    expect(amazonCallback.status).toBe(404);
  });
});

describe("oauth mode", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await startTestContext({ ENV_SIGNIN_METHOD: "oauth", ...GOOGLE, ...AMAZON });
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("reports oauth and the enabled providers in display order (A1)", async () => {
    const res = await request(ctx.app).get("/api/config");
    expect(res.body.signinMethod).toBe("oauth");
    expect(res.body.oauthProviders).toEqual(["google", "amazon"]);
  });

  it("answers every email route with 404 and serves the provider routes (A4)", async () => {
    for (const res of await nativeRoutes(ctx)) {
      expect(res.status).toBe(404);
    }
    for (const res of await startRoutes(ctx)) {
      expect(res.status).toBe(200);
      expect(typeof res.body.url).toBe("string");
    }
    expect((await request(ctx.app).get("/create-account")).status).toBe(404);
    expect((await request(ctx.app).get("/confirm-signin")).status).toBe(404);
  });

  it("leaves BetterAuth's other routes unmounted (R3)", async () => {
    const res = await request(ctx.app).get("/api/auth/get-session");
    expect(res.status).toBe(404);
    expect(res.body).toEqual(NOT_FOUND);
  });
});

describe("both mode", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await startTestContext({ ENV_SIGNIN_METHOD: "both", ...GOOGLE, ...MICROSOFT, ...AMAZON });
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("reports both and the enabled providers in display order (A1)", async () => {
    const res = await request(ctx.app).get("/api/config");
    expect(res.body.signinMethod).toBe("both");
    expect(res.body.oauthProviders).toEqual(["google", "microsoft", "amazon"]);
  });

  it("serves the provider routes (A2)", async () => {
    for (const res of await startRoutes(ctx)) {
      expect(res.status).toBe(200);
      expect(typeof res.body.url).toBe("string");
    }
  });

  it("sends create-account to CrowdPoll's own handler, not BetterAuth's (R3)", async () => {
    const res = await request(ctx.app).post("/api/auth/create-account").send({ email: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid email address/);
  });

  it("keeps the email routes and pages (A4)", async () => {
    const [createAccount, loginLink, verify, emailChange, emailChangeVerify] = await nativeRoutes(ctx);
    expect(createAccount!.status).toBe(400);
    expect(loginLink!.status).toBe(400);
    expect(verify!.status).not.toBe(404);
    expect(emailChange!.status).toBe(401);
    expect(emailChangeVerify!.status).not.toBe(404);
    expect((await request(ctx.app).get("/create-account")).status).toBe(200);
    expect((await request(ctx.app).get("/confirm-signin")).status).toBe(200);
  });

  it("creates an account, signs in by email link and changes the address exactly as in native (SC-004)", async () => {
    const created = await request(ctx.app)
      .post("/api/auth/create-account")
      .set("x-forwarded-for", "10.9.0.1")
      .send({ ...AGREED, email: "both-mode@example.com" });
    expect(created.status).toBe(200);
    const signedUp = await followSignInLink(ctx, extractLinkPath(ctx.sent.at(-1)!));
    expect(signedUp.headers.location).toBe("/");

    const requested = await request(ctx.app)
      .post("/api/auth/request-login-link")
      .set("x-forwarded-for", "10.9.0.2")
      .send({ email: "both-mode@example.com", staySignedIn: false });
    expect(requested.status).toBe(200);
    const signedIn = await followSignInLink(ctx, extractLinkPath(ctx.sent.at(-1)!));
    expect(signedIn.headers.location).toBe("/");
    const cookie = [signedIn.headers["set-cookie"]].flat().map(String).find((c) => c.startsWith("session_token="))!.split(";")[0]!;

    const change = await request(ctx.app)
      .post("/api/me/email-change")
      .set("x-forwarded-for", "10.9.0.3")
      .set("Cookie", cookie)
      .send({ newEmail: "both-mode-new@example.com" });
    expect(change.status).toBe(202);
    const verified = await request(ctx.app).get(extractLinkPath(ctx.sent.at(-1)!));
    expect(verified.headers.location).toBe("/profile?changed=1");
    const me = await request(ctx.app).get("/api/me").set("Cookie", cookie);
    expect(me.body.emailAddress).toBe("both-mode-new@example.com");
  });
});
