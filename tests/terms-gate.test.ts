import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  extractLinkPath,
  followSignInLink,
  forgeSession,
  startTestContext,
  withoutAgreement,
  type TestContext
} from "./helpers/setup.js";

let ctx: TestContext;
let nextIp = 1;
const freshIp = () => `10.32.0.${nextIp++}`;

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  await ctx.stop();
});

async function unaccepted(email: string): Promise<string> {
  const { cookie, userId } = await forgeSession(ctx, email);
  await withoutAgreement(ctx, userId);
  return cookie;
}

const TERMS_REQUIRED = { error: "Please accept the updated Terms of Service.", code: "terms-required" };

describe("the terms gate (A4, A5, R5)", () => {
  it("refuses signed-in API calls with 403 terms-required", async () => {
    const cookie = await unaccepted("gate-api@example.org");
    const res = await request(ctx.app).get("/api/me/polls?tab=your-polls").set("Cookie", cookie);
    expect(res.status).toBe(403);
    expect(res.body).toEqual(TERMS_REQUIRED);
  });

  it("lets /api/me through, reporting termsAccepted: false", async () => {
    const cookie = await unaccepted("gate-me@example.org");
    const res = await request(ctx.app).get("/api/me").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.termsAccepted).toBe(false);
    expect(res.body.termsFirstAcceptance).toBe(true);
  });

  it("lets the configuration and sign-out through", async () => {
    const cookie = await unaccepted("gate-out@example.org");
    expect((await request(ctx.app).get("/api/config").set("Cookie", cookie)).status).toBe(200);
    expect((await request(ctx.app).post("/api/auth/logout").set("Cookie", cookie)).status).toBe(204);
  });

  it("redirects page routes to the accept page with the page asked for", async () => {
    const cookie = await unaccepted("gate-page@example.org");
    const profile = await request(ctx.app).get("/profile").set("Cookie", cookie);
    expect(profile.status).toBe(302);
    expect(profile.headers.location).toBe("/accept-terms?next=%2Fprofile");
    const shared = await request(ctx.app).get("/?PID=abc").set("Cookie", cookie);
    expect(shared.status).toBe(302);
    expect(shared.headers.location).toBe("/accept-terms?next=%2F%3FPID%3Dabc");
  });

  it("lets the documents, assets and health checks through", async () => {
    const cookie = await unaccepted("gate-docs@example.org");
    for (const path of ["/privacy", "/terms", "/m3-tokens.css", "/fonts/fonts.css", "/healthz"]) {
      const res = await request(ctx.app).get(path).set("Cookie", cookie);
      expect(res.status, path).toBe(200);
    }
  });

  it("lets the sign-in and link routes through for a browser holding an old session", async () => {
    const cookie = await unaccepted("gate-link@example.org");
    const asked = await request(ctx.app)
      .post("/api/auth/request-login-link")
      .set("x-forwarded-for", freshIp())
      .set("Cookie", cookie)
      .send({ email: "gate-link@example.org", staySignedIn: false });
    expect(asked.status).toBe(200);
    const link = extractLinkPath(ctx.sent.at(-1)!);
    const token = new URL(link, "http://localhost").searchParams.get("token")!;
    expect((await request(ctx.app).get(`/api/auth/link-info?token=${token}`).set("Cookie", cookie)).status).toBe(200);
    const verified = await followSignInLink(ctx, link, cookie);
    expect(verified.status).toBe(302);
    for (const [method, path] of [
      ["post", "/api/auth/confirm-signin"],
      ["get", "/api/me/email-change/verify?token=none"],
      ["post", "/api/auth/create-account"]
    ] as const) {
      const res = await request(ctx.app)[method](path).set("Cookie", cookie).set("x-forwarded-for", freshIp()).send({});
      expect(res.body?.code, path).not.toBe("terms-required");
    }
  });

  it("leaves guests and accepted users alone", async () => {
    expect((await request(ctx.app).get("/profile")).headers.location).toBe("/login");
    const { cookie } = await forgeSession(ctx, "gate-ok@example.org");
    expect((await request(ctx.app).get("/profile").set("Cookie", cookie)).status).toBe(200);
    const me = await request(ctx.app).get("/api/me").set("Cookie", cookie);
    expect(me.body.termsAccepted).toBe(true);
    expect(me.body.termsFirstAcceptance).toBe(false);
  });
});
