import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { hashToken } from "../src/auth/auth.js";
import {
  extractLinkPath,
  followSignInLink,
  forgeSession,
  restoreTime,
  startTestContext,
  timeShiftMinutes,
  type TestContext
} from "./helpers/setup.js";

let ctx: TestContext;
let next = 1;
const freshIp = () => `10.7.0.${next}`;
const freshEmail = () => `bound${next++}@example.com`;
const ORIGIN = "http://127.0.0.1";

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  await ctx.stop();
});
afterEach(() => {
  restoreTime();
});

async function requestLink(email: string, body: Record<string, unknown> = {}) {
  await forgeSession(ctx, email);
  const res = await request(ctx.app)
    .post("/api/auth/request-login-link")
    .set("x-forwarded-for", freshIp())
    .send({ email, staySignedIn: false, ...body });
  return { res, link: extractLinkPath(ctx.sent.at(-1)!) };
}

function tokenOf(link: string): string {
  return new URL(link, "http://localhost").searchParams.get("token")!;
}

function cookies(res: request.Response): string[] {
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

function confirm(body: Record<string, unknown>, origin: string | null = ORIGIN) {
  const req = request(ctx.app).post("/api/auth/confirm-signin").set("Host", "127.0.0.1");
  return (origin ? req.set("Origin", origin) : req).send(body);
}

describe("sign-in links bound to the requesting browser (FR-016–FR-020)", () => {
  it("sets the binding cookie and puts its hash on the link", async () => {
    const { res, link } = await requestLink(freshEmail());
    const binding = cookies(res).find((c) => c.startsWith("signin_binding="))!;
    expect(binding).toMatch(/HttpOnly/);
    expect(binding).toMatch(/Secure/);
    expect(binding).toMatch(/SameSite=Lax/);
    expect(binding).toMatch(/Path=\/api\/auth/);
    expect(binding).toMatch(/Max-Age=900/);
    const value = /^signin_binding=([^;]+)/.exec(binding)![1]!;
    expect(new URL(link, "http://localhost").searchParams.get("bind")).toBe(hashToken(value));
  });

  it("signs in at once in the same browser and clears the cookie", async () => {
    const { link } = await requestLink(freshEmail());
    const res = await followSignInLink(ctx, link).redirects(0);
    expect(res.headers.location).toBe("/");
    expect(cookies(res).some((c) => c.startsWith("session_token="))).toBe(true);
    expect(cookies(res).some((c) => /^signin_binding=;.*Max-Age=0/.test(c))).toBe(true);
  });

  it("sends another browser to the confirmation page without using up the link", async () => {
    const { link } = await requestLink(freshEmail());
    const res = await request(ctx.app).get(link).redirects(0);
    expect(res.headers.location).toMatch(/^\/confirm-signin\?token=/);
    expect(cookies(res).some((c) => c.startsWith("session_token="))).toBe(false);
    const again = await followSignInLink(ctx, link).redirects(0);
    expect(again.headers.location).toBe("/");
  });

  it("refuses an expired link in another browser as today, never confirming it", async () => {
    const { link } = await requestLink(freshEmail());
    timeShiftMinutes(16);
    const res = await request(ctx.app).get(link).redirects(0);
    expect(res.headers.location).toBe("/login?error=invalid-link");
  });

  it("link-info names the account and the request time, and 404s for a bad token", async () => {
    const email = freshEmail();
    const { link } = await requestLink(email);
    const res = await request(ctx.app).get(`/api/auth/link-info?token=${tokenOf(link)}`);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.body.email).toBe(email);
    expect(Number.isNaN(Date.parse(res.body.requestedAt))).toBe(false);
    expect((await request(ctx.app).get("/api/auth/link-info?token=nope")).status).toBe(404);
  });

  it("confirm-signin signs in and honours stay and the shared poll", async () => {
    const pid = randomUUID();
    const { link } = await requestLink(freshEmail(), { staySignedIn: true, pid });
    const res = await confirm({ token: tokenOf(link), stay: true, pid });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ redirect: `/?PID=${pid}` });
    const session = cookies(res).find((c) => c.startsWith("session_token="))!;
    expect(session).toMatch(/Max-Age=\d+/);
  });

  it("confirm-signin refuses a foreign or missing Origin and keeps the link", async () => {
    const { link } = await requestLink(freshEmail());
    expect((await confirm({ token: tokenOf(link) }, "https://evil.example")).status).toBe(403);
    expect((await confirm({ token: tokenOf(link) }, null)).status).toBe(403);
    expect((await request(ctx.app).get(`/api/auth/link-info?token=${tokenOf(link)}`)).status).toBe(200);
  });

  it("confirm-signin refuses a used or expired token with the invalid-link redirect", async () => {
    const { link } = await requestLink(freshEmail());
    await followSignInLink(ctx, link);
    const used = await confirm({ token: tokenOf(link) });
    expect(used.status).toBe(400);
    expect(used.body.redirect).toBe("/login?error=invalid-link");
  });

  it("declining creates no session and leaves the link usable", async () => {
    const { link } = await requestLink(freshEmail());
    const page = await request(ctx.app).get(`/confirm-signin?token=${tokenOf(link)}&stay=0`);
    expect(page.status).toBe(200);
    expect(cookies(page)).toEqual([]);
    expect((await confirm({ token: tokenOf(link) })).status).toBe(200);
  });

  it("sets no binding cookie for the create-account invitation or a honeypot hit", async () => {
    const invite = await request(ctx.app)
      .post("/api/auth/request-login-link")
      .set("x-forwarded-for", freshIp())
      .send({ email: `nobody${next++}@example.com` });
    expect(cookies(invite).some((c) => c.startsWith("signin_binding="))).toBe(false);
    const honeypot = await request(ctx.app)
      .post("/api/auth/request-login-link")
      .set("x-forwarded-for", freshIp())
      .send({ email: freshEmail(), homepage: "x" });
    expect(cookies(honeypot).some((c) => c.startsWith("signin_binding="))).toBe(false);
  });
});
