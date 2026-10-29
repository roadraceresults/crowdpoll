/**
 * US1 — session cookie flags, stay-signed-in persistence, single active
 * session, logout (FR-006–FR-009; SC-006 single-cookie check).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { AGREED,
  startTestContext,
  extractLinkPath,
  followSignInLink,
  type TestContext
} from "./helpers/setup.js";

let ctx: TestContext;
let nextIp = 1;
const freshIp = () => `10.2.0.${nextIp++}`;
let nextUser = 1;
const freshEmail = () => `user${nextUser++}@example.com`;

/** All Set-Cookie headers observed across every response in the suite. */
const observedSetCookies: string[] = [];

function recordCookies(res: { headers: Record<string, unknown> }): string[] {
  const cookies = (res.headers["set-cookie"] ?? []) as string[];
  observedSetCookies.push(...cookies);
  return cookies;
}

async function signIn(
  email: string,
  { stay = false, ip = freshIp() }: { stay?: boolean; ip?: string } = {}
): Promise<{ cookie: string; setCookie: string }> {
  await request(ctx.app)
    .post("/api/auth/create-account")
    .set("x-forwarded-for", ip)
    .send({ ...AGREED, email });
  // An existing account gets a normal login link from the same endpoint,
  // but stay-signed-in is only expressible on the login endpoint.
  if (stay) {
    await request(ctx.app)
      .post("/api/auth/request-login-link")
      .set("x-forwarded-for", ip)
      .send({ email, staySignedIn: true });
  }
  const link = extractLinkPath(ctx.sent.at(-1)!);
  const res = await followSignInLink(ctx, link);
  expect(res.status).toBe(302);
  expect(res.headers.location).toBe("/");
  const setCookie = recordCookies(res).find((c) => c.startsWith("session_token="))!;
  expect(setCookie).toBeTruthy();
  return { cookie: setCookie.split(";")[0]!, setCookie };
}

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  await ctx.stop();
});

describe("session cookie", () => {
  it("is httpOnly, secure, and sameSite=lax (FR-009)", async () => {
    const { setCookie } = await signIn(freshEmail());
    expect(setCookie).toMatch(/httponly/i);
    expect(setCookie).toMatch(/secure/i);
    expect(setCookie).toMatch(/samesite=lax/i);
  });

  it("has no Max-Age/Expires without stay-signed-in (browser-session only, FR-006)", async () => {
    const { setCookie } = await signIn(freshEmail());
    expect(setCookie).not.toMatch(/max-age/i);
    expect(setCookie).not.toMatch(/expires/i);
  });

  it("persists for the configured maximum with stay-signed-in (FR-006)", async () => {
    const { setCookie } = await signIn(freshEmail(), { stay: true });
    const maxAge = Number(/max-age=(\d+)/i.exec(setCookie)?.[1]);
    expect(maxAge).toBe(ctx.config.maxSigninCookieDurationMs / 1000);
  });
});

describe("single active session (FR-007a)", () => {
  it("a second sign-in replaces the first session", async () => {
    const email = freshEmail();
    const first = await signIn(email);
    const okBefore = await request(ctx.app).get("/api/me").set("Cookie", first.cookie);
    expect(okBefore.status).toBe(200);

    const second = await signIn(email);
    const afterFirst = await request(ctx.app).get("/api/me").set("Cookie", first.cookie);
    expect(afterFirst.status).toBe(401);
    const afterSecond = await request(ctx.app).get("/api/me").set("Cookie", second.cookie);
    expect(afterSecond.status).toBe(200);
  });
});

describe("POST /api/auth/logout (FR-007)", () => {
  it("ends the session and clears the cookie", async () => {
    const { cookie } = await signIn(freshEmail());
    const res = await request(ctx.app).post("/api/auth/logout").set("Cookie", cookie);
    expect(res.status).toBe(204);
    recordCookies(res);

    const after = await request(ctx.app).get("/api/me").set("Cookie", cookie);
    expect(after.status).toBe(401);
  });

  it("refuses guests", async () => {
    const res = await request(ctx.app).post("/api/auth/logout");
    expect(res.status).toBe(401);
  });
});

describe("US2 — profile access & guest guard (FR-014)", () => {
  it("GET /api/me returns the profile without secrets when authenticated", async () => {
    const email = freshEmail();
    const { cookie } = await signIn(email);
    const res = await request(ctx.app).get("/api/me").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.userName).toBe(email.split("@")[0]);
    expect(res.body.emailAddress).toBe(email);
    expect(res.body.profileAvatar).toBeTruthy();
    expect(res.body.status).toBe("active");
    expect(JSON.stringify(res.body)).not.toMatch(/clientSecret/i);
    expect(res.body.clientSecret).toBeUndefined();
  });

  it("GET /api/me refuses guests with 401", async () => {
    const res = await request(ctx.app).get("/api/me");
    expect(res.status).toBe(401);
  });

  it("the /profile page redirects guests to /login", async () => {
    const res = await request(ctx.app).get("/profile");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/login");
  });

  it("the /profile page is served to signed-in users", async () => {
    const { cookie } = await signIn(freshEmail());
    const res = await request(ctx.app).get("/profile").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    recordCookies(res);
  });
});

/**
 * 013 FR-002/FR-003 (contracts/page-routes.md): an email-change verification
 * link is consumed without a session and lands on /profile. Before this
 * feature the page route redirected that request to /login, so the change
 * succeeded and the confirmation was discarded. The relaxation is narrow --
 * the guard above still stands for every request that carries no result.
 */
describe("GET /profile verification results (013 FR-002/FR-003)", () => {
  it("serves the page to a guest carrying changed=1", async () => {
    const res = await request(ctx.app).get("/profile?changed=1");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });

  it("serves the page to a guest carrying error=invalid-link", async () => {
    const res = await request(ctx.app).get("/profile?error=invalid-link");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });

  it("still redirects a guest when the result value is not matched exactly", async () => {
    // A guard that accepted `changed` with any value would turn one condition
    // into an open door.
    for (const query of ["?changed=2", "?changed=", "?error=other", "?changed=1x"]) {
      const res = await request(ctx.app).get(`/profile${query}`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/login");
    }
  });

  it("serves the page when a matched result is accompanied by other parameters", async () => {
    const res = await request(ctx.app).get("/profile?changed=1&from=email");
    expect(res.status).toBe(200);
  });
});

describe("only the session cookie and the sign-in binding cookie (FR-008, SC-006; production email FR-020)", () => {
  it("a full email-change round trip sets no cookie at all", async () => {
    const email = freshEmail();
    const { cookie } = await signIn(email);
    const change = await request(ctx.app)
      .post("/api/me/email-change")
      .set("x-forwarded-for", freshIp())
      .set("Cookie", cookie)
      .send({ newEmail: `swap-${email}` });
    expect(change.status).toBe(202);
    expect(recordCookies(change)).toEqual([]);

    const link = ctx.sent.at(-1)!.text.match(/https?:\/\/\S+/)![0];
    const url = new URL(link);
    const verify = await request(ctx.app).get(url.pathname + url.search);
    expect(verify.headers.location).toBe("/profile?changed=1");
    expect(recordCookies(verify)).toEqual([]);
  });

  it("no flow in this suite set any cookie other than session_token and signin_binding", () => {
    expect(observedSetCookies.length).toBeGreaterThan(0);
    for (const cookie of observedSetCookies) {
      expect(cookie.startsWith("session_token=") || cookie.startsWith("signin_binding=")).toBe(true);
    }
  });
});
