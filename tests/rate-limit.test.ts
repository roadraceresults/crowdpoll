/**
 * FR-004a — per-client, per-endpoint rate limits on email-sending endpoints:
 * 2 requests per 15-minute window, refusals name the next allowed time and
 * send no email. (FR-013c portion added with US3.)
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { AGREED,
  startTestContext,
  timeShiftMinutes,
  restoreTime,
  type TestContext
} from "./helpers/setup.js";

let ctx: TestContext;
let nextIp = 1;
const freshIp = () => `10.3.0.${nextIp++}`;

beforeAll(async () => {
  ctx = await startTestContext();
  await request(ctx.app)
    .post("/api/auth/create-account")
    .set("x-forwarded-for", freshIp())
    .send({ ...AGREED, email: "limited@example.com" });
});
afterAll(async () => {
  await ctx.stop();
});
afterEach(() => {
  restoreTime();
});

async function requestLink(ip: string, email = "limited@example.com") {
  return request(ctx.app)
    .post("/api/auth/request-login-link")
    .set("x-forwarded-for", ip)
    .send({ email, staySignedIn: false });
}

describe("login-link requests (FR-004a)", () => {
  it("allows 2 per window, refuses the 3rd with nextAllowedAt and sends no email", async () => {
    const ip = freshIp();
    expect((await requestLink(ip)).status).toBe(200);
    expect((await requestLink(ip)).status).toBe(200);

    const sentBefore = ctx.sent.length;
    const third = await requestLink(ip);
    expect(third.status).toBe(429);
    expect(third.body.error).toBeTruthy();
    const nextAllowedAt = new Date(third.body.nextAllowedAt);
    expect(Number.isNaN(nextAllowedAt.getTime())).toBe(false);
    expect(nextAllowedAt.getTime()).toBeGreaterThan(Date.now());
    expect(nextAllowedAt.getTime()).toBeLessThanOrEqual(Date.now() + 15 * 60_000);
    expect(ctx.sent.length).toBe(sentBefore);
  });

  it("limits per client, not per email — different emails share the client's window", async () => {
    const ip = freshIp();
    expect((await requestLink(ip, "limited@example.com")).status).toBe(200);
    expect((await requestLink(ip, "other1@example.com")).status).toBe(200);
    const third = await requestLink(ip, "other2@example.com");
    expect(third.status).toBe(429);
  });

  it("does not throttle a different client", async () => {
    const ip = freshIp();
    await requestLink(ip);
    await requestLink(ip);
    expect((await requestLink(ip)).status).toBe(429);
    expect((await requestLink(freshIp())).status).toBe(200);
  });

  it("frees the window after 15 minutes", async () => {
    const ip = freshIp();
    await requestLink(ip);
    await requestLink(ip);
    expect((await requestLink(ip)).status).toBe(429);
    timeShiftMinutes(16);
    expect((await requestLink(ip)).status).toBe(200);
  });
});

describe("email-change requests (FR-013c)", () => {
  async function signIn(email: string, ip: string): Promise<string> {
    await request(ctx.app)
      .post("/api/auth/create-account")
      .set("x-forwarded-for", ip)
      .send({ ...AGREED, email });
    const { extractLinkPath, followSignInLink } = await import("./helpers/setup.js");
    const link = extractLinkPath(ctx.sent.at(-1)!);
    const res = await followSignInLink(ctx, link);
    const setCookie = (res.headers["set-cookie"] as unknown as string[]).find((c) =>
      c.startsWith("session_token=")
    )!;
    return setCookie.split(";")[0]!;
  }

  async function requestChange(cookie: string, ip: string, newEmail: string) {
    return request(ctx.app)
      .post("/api/me/email-change")
      .set("x-forwarded-for", ip)
      .set("Cookie", cookie)
      .send({ newEmail });
  }

  it("allows 2 per client window, refuses the 3rd with nextAllowedAt and no email", async () => {
    const cookie = await signIn("changer@example.com", freshIp());
    const ip = freshIp();
    expect((await requestChange(cookie, ip, "c1@example.com")).status).toBe(202);
    expect((await requestChange(cookie, ip, "c2@example.com")).status).toBe(202);
    const sentBefore = ctx.sent.length;
    const third = await requestChange(cookie, ip, "c3@example.com");
    expect(third.status).toBe(429);
    expect(new Date(third.body.nextAllowedAt).getTime()).toBeGreaterThan(Date.now());
    expect(ctx.sent.length).toBe(sentBefore);
  });

  it("its window is independent of the login-link endpoint's window", async () => {
    const cookie = await signIn("changer2@example.com", freshIp());
    const ip = freshIp();
    // Exhaust the login-link window for this client…
    await requestLink(ip);
    await requestLink(ip);
    expect((await requestLink(ip)).status).toBe(429);
    // …email-change from the same client still has its own window.
    expect((await requestChange(cookie, ip, "c4@example.com")).status).toBe(202);
  });
});

describe("create-account requests (FR-001/FR-004a)", () => {
  async function createAccount(ip: string, email: string) {
    return request(ctx.app)
      .post("/api/auth/create-account")
      .set("x-forwarded-for", ip)
      .send({ ...AGREED, email });
  }

  it("signup sends count toward the create-account window", async () => {
    const ip = freshIp();
    expect((await createAccount(ip, "s1@example.com")).status).toBe(200);
    expect((await createAccount(ip, "s2@example.com")).status).toBe(200);
    const sentBefore = ctx.sent.length;
    const third = await createAccount(ip, "s3@example.com");
    expect(third.status).toBe(429);
    expect(third.body.nextAllowedAt).toBeTruthy();
    expect(ctx.sent.length).toBe(sentBefore);
    // The refused signup must not have created an account either.
    expect(await ctx.db.selectFrom("user").selectAll().where("email", "=", "s3@example.com").executeTakeFirst()).toBeUndefined();
  });

  it("create-account and login-link windows are independent per endpoint", async () => {
    const ip = freshIp();
    await createAccount(ip, "s4@example.com");
    await createAccount(ip, "s5@example.com");
    expect((await createAccount(ip, "s6@example.com")).status).toBe(429);
    // Same client may still use the login-link endpoint's own window.
    expect((await requestLink(ip)).status).toBe(200);
  });
});

/**
 * 012: the limit is configurable, which is the whole point of the change — the
 * hard-coded 2-per-15-minutes made manual testing painful, since two login links
 * locked you out for a quarter of an hour.
 *
 * These drive the real limiter through a configured context rather than asserting on
 * the config object, because config that never reaches the limiter would be worse
 * than no setting at all.
 */
describe("The email rate limit honours its configuration (012)", () => {
  it("allows the configured number of requests, then refuses", async () => {
    const generous = await startTestContext({
      ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES: "15",
      ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW: "4"
    });
    try {
      await request(generous.app)
        .post("/api/auth/create-account")
        .set("x-forwarded-for", "10.9.0.1")
        .send({ ...AGREED, email: "generous@example.com" });

      const ip = "10.9.0.2";
      const send = () =>
        request(generous.app)
          .post("/api/auth/request-login-link")
          .set("x-forwarded-for", ip)
          .send({ email: "generous@example.com", staySignedIn: false });

      // Four allowed where the default would have refused the third.
      for (let i = 1; i <= 4; i += 1) {
        expect((await send()).status, `request ${i}`).toBe(200);
      }
      expect((await send()).status, "the fifth").toBe(429);
    } finally {
      await generous.stop();
    }
  });

  it("honours a shortened window, so a locked-out client recovers sooner", async () => {
    const brief = await startTestContext({
      ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES: "1",
      ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW: "1"
    });
    try {
      await request(brief.app)
        .post("/api/auth/create-account")
        .set("x-forwarded-for", "10.9.1.1")
        .send({ ...AGREED, email: "brief@example.com" });

      const ip = "10.9.1.2";
      const send = () =>
        request(brief.app)
          .post("/api/auth/request-login-link")
          .set("x-forwarded-for", ip)
          .send({ email: "brief@example.com", staySignedIn: false });

      expect((await send()).status).toBe(200);
      expect((await send()).status, "second, inside the window").toBe(429);

      // Past the one-minute window, the client is allowed again — where the default
      // would still have another fourteen minutes to wait.
      timeShiftMinutes(2);
      expect((await send()).status, "after the window").toBe(200);
    } finally {
      restoreTime();
      await brief.stop();
    }
  });
});
