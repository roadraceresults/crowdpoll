import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { AGREED, extractLink, extractLinkPath, followSignInLink, forgeSession, restoreTime, startTestContext, timeShiftMinutes, type TestContext } from "./helpers/setup.js";

let ctx: TestContext;
let nextIp = 1;
const freshIp = () => `10.7.0.${nextIp++}`;

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  await ctx.stop();
});
afterEach(() => {
  restoreTime();
});

const requestLink = (email: string, body: Record<string, unknown> = {}) =>
  request(ctx.app).post("/api/auth/request-login-link").set("x-forwarded-for", freshIp()).send({ email, staySignedIn: false, ...body });
const createAccount = (email: string, body: Record<string, unknown> = {}) =>
  request(ctx.app).post("/api/auth/create-account").set("x-forwarded-for", freshIp()).send({ ...AGREED, email, ...body });

describe("the poll id through sign-in", () => {
  it("a login link requested with a pid carries it, and verifying lands on the poll link", async () => {
    const pid = randomUUID();
    await forgeSession(ctx, "pid-existing@example.com");
    expect((await requestLink("pid-existing@example.com", { pid })).status).toBe(200);
    const link = extractLink(ctx.sent.at(-1)!);
    expect(new URL(link).searchParams.get("PID")).toBe(pid);
    const verified = await followSignInLink(ctx, extractLinkPath(ctx.sent.at(-1)!)).redirects(0);
    expect(verified.status).toBe(302);
    expect(verified.headers.location).toBe(`/?PID=${pid}`);
    expect(verified.headers["set-cookie"]?.some((c: string) => c.startsWith("session_token="))).toBe(true);
  });

  it("without a pid the link and the landing are unchanged", async () => {
    await forgeSession(ctx, "pid-none@example.com");
    await requestLink("pid-none@example.com");
    const mail = ctx.sent.at(-1)!;
    expect(new URL(extractLink(mail)).searchParams.has("PID")).toBe(false);
    const verified = await followSignInLink(ctx, extractLinkPath(mail)).redirects(0);
    expect(verified.headers.location).toBe("/");
  });

  it("an expired or used link keeps the pid on the invalid-link page", async () => {
    const pid = randomUUID();
    await forgeSession(ctx, "pid-expired@example.com");
    await requestLink("pid-expired@example.com", { pid });
    const path = extractLinkPath(ctx.sent.at(-1)!);
    timeShiftMinutes(16);
    const expired = await request(ctx.app).get(path).redirects(0);
    expect(expired.headers.location).toBe(`/login?error=invalid-link&PID=${pid}`);
  });

  it("an unknown address is invited to create an account that brings it back to the poll", async () => {
    const pid = randomUUID();
    const res = await requestLink("pid-unknown@example.com", { pid });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/inbox/i);
    const mail = ctx.sent.at(-1)!;
    const link = new URL(extractLink(mail));
    expect(link.pathname).toBe("/create-account");
    expect(link.searchParams.get("token")).toBeTruthy();
    expect(link.searchParams.get("PID")).toBe(pid);
  });

  it("create-account with a pid emails a login link carrying it", async () => {
    const pid = randomUUID();
    expect((await createAccount("pid-new@example.com", { pid })).status).toBe(200);
    expect(new URL(extractLink(ctx.sent.at(-1)!)).searchParams.get("PID")).toBe(pid);
  });

  it("sends a signed-in visitor on the sign-in pages straight to the poll link", async () => {
    const pid = randomUUID();
    const { cookie } = await forgeSession(ctx, "pid-signed-in@example.com");
    const login = await request(ctx.app).get(`/login?PID=${pid}`).set("Cookie", cookie).redirects(0);
    expect(login.headers.location).toBe(`/?PID=${pid}`);
    const create = await request(ctx.app).get(`/create-account?PID=${pid}`).set("Cookie", cookie).redirects(0);
    expect(create.headers.location).toBe(`/?PID=${pid}`);
    const plain = await request(ctx.app).get("/login").set("Cookie", cookie).redirects(0);
    expect(plain.headers.location).toBe("/");
  });

  it("drops an id that is not a UUID at every step and never redirects off the site", async () => {
    const bad = "https://evil.example/";
    await forgeSession(ctx, "pid-bad@example.com");
    await requestLink("pid-bad@example.com", { pid: bad });
    const mail = ctx.sent.at(-1)!;
    expect(new URL(extractLink(mail)).searchParams.has("PID")).toBe(false);
    const verified = await followSignInLink(ctx, `${extractLinkPath(mail)}&PID=${encodeURIComponent(bad)}`).redirects(0);
    expect(verified.headers.location).toBe("/");

    const { cookie } = await forgeSession(ctx, "pid-bad-signed@example.com");
    for (const path of [`/login?PID=${encodeURIComponent(bad)}`, "/login?PID=//evil.example"]) {
      const res = await request(ctx.app).get(path).set("Cookie", cookie).redirects(0);
      expect(res.headers.location, path).toBe("/");
    }
    const failed = await request(ctx.app).get(`/api/auth/verify?token=nope&stay=0&PID=${encodeURIComponent(bad)}`).redirects(0);
    expect(failed.headers.location).toBe("/login?error=invalid-link");
  });

  it("answers identically whether or not the address has an account", async () => {
    const pid = randomUUID();
    await forgeSession(ctx, "pid-known@example.com");
    const known = await requestLink("pid-known@example.com", { pid });
    const unknown = await requestLink("pid-stranger@example.com", { pid });
    expect(known.status).toBe(unknown.status);
    expect(known.body).toEqual(unknown.body);
  });
});
