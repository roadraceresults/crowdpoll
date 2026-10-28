/**
 * US1 — account creation, login-link issue/verify, expiry/reuse/supersede
 * (FR-001–FR-004; spec Story 1 scenarios 1–4).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { AGREED,
  startTestContext,
  extractLink,
  extractLinkPath,
  followSignInLink,
  timeShiftMinutes,
  restoreTime,
  type TestContext
} from "./helpers/setup.js";

let ctx: TestContext;

async function countUsers(): Promise<number> {
  const row = await ctx.db.selectFrom("user").select((eb) => eb.fn.countAll<string>().as("n")).executeTakeFirstOrThrow();
  return Number(row.n);
}
let nextIp = 1;
/** Fresh client identity per test so per-client rate limits never interfere. */
const freshIp = () => `10.1.0.${nextIp++}`;

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  await ctx.stop();
});
afterEach(() => {
  restoreTime();
});

describe("POST /api/auth/create-account", () => {
  it("creates a pending profile and auto-sends the first login link", async () => {
    const res = await request(ctx.app)
      .post("/api/auth/create-account")
      .set("x-forwarded-for", freshIp())
      .send({ ...AGREED, email: "alice@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/inbox/i);

    const user = await ctx.db.selectFrom("user").selectAll().where("email", "=", "alice@example.com").executeTakeFirst();
    expect(user).toBeDefined();
    expect(user!.status).toBe("pending");
    expect(user!.userName).toBe("alice");
    expect(user!.clientId).toBeTruthy();
    expect(user!.clientSecret).toBeTruthy();
    expect(user!.profileAvatar).toBeTruthy();

    const mail = ctx.sent.at(-1)!;
    expect(mail.to).toBe("alice@example.com");
    expect(extractLink(mail)).toContain("/api/auth/verify?token=");
  });

  it("rejects an invalid email address", async () => {
    const res = await request(ctx.app)
      .post("/api/auth/create-account")
      .set("x-forwarded-for", freshIp())
      .send({ ...AGREED, email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("rejects an oversized email address", async () => {
    const res = await request(ctx.app)
      .post("/api/auth/create-account")
      .set("x-forwarded-for", freshIp())
      .send({ ...AGREED, email: `${"a".repeat(195)}@example.com` });
    expect(res.status).toBe(400);
  });

  it("answers identically for an already-registered address and sends a login link, not a duplicate account", async () => {
    const before = await countUsers();
    const res = await request(ctx.app)
      .post("/api/auth/create-account")
      .set("x-forwarded-for", freshIp())
      .send({ ...AGREED, email: "alice@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/inbox/i);
    expect(await countUsers()).toBe(before);
    const mail = ctx.sent.at(-1)!;
    expect(mail.to).toBe("alice@example.com");
    expect(extractLink(mail)).toContain("/api/auth/verify?token=");
  });
});

describe("POST /api/auth/request-login-link", () => {
  it("sends a one-time login link for a registered address", async () => {
    const res = await request(ctx.app)
      .post("/api/auth/request-login-link")
      .set("x-forwarded-for", freshIp())
      .send({ email: "alice@example.com", staySignedIn: false });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/inbox/i);
    const mail = ctx.sent.at(-1)!;
    expect(mail.to).toBe("alice@example.com");
    expect(extractLink(mail)).toContain("/api/auth/verify?token=");
  });

  it("answers identically for an unknown address but sends a create-account invitation instead", async () => {
    const known = await request(ctx.app)
      .post("/api/auth/request-login-link")
      .set("x-forwarded-for", freshIp())
      .send({ email: "alice@example.com", staySignedIn: false });
    const unknown = await request(ctx.app)
      .post("/api/auth/request-login-link")
      .set("x-forwarded-for", freshIp())
      .send({ email: "nobody@example.com", staySignedIn: false });
    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual(known.body);

    const mail = ctx.sent.at(-1)!;
    expect(mail.to).toBe("nobody@example.com");
    // Invitation, not a sign-in credential.
    expect(mail.text).not.toContain("/api/auth/verify?token=");
    expect(extractLink(mail)).toContain("/create-account?token=");
    // No account and no session may result.
    expect(await ctx.db.selectFrom("user").selectAll().where("email", "=", "nobody@example.com").executeTakeFirst()).toBeUndefined();
  });

  it("rejects an invalid email address", async () => {
    const res = await request(ctx.app)
      .post("/api/auth/request-login-link")
      .set("x-forwarded-for", freshIp())
      .send({ email: "nope", staySignedIn: true });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/verify", () => {
  async function issueLink(email: string, ip: string): Promise<string> {
    const res = await request(ctx.app)
      .post("/api/auth/request-login-link")
      .set("x-forwarded-for", ip)
      .send({ email, staySignedIn: false });
    expect(res.status).toBe(200);
    return extractLinkPath(ctx.sent.at(-1)!);
  }

  it("signs the user in, activates a pending account, and redirects home", async () => {
    await request(ctx.app)
      .post("/api/auth/create-account")
      .set("x-forwarded-for", freshIp())
      .send({ ...AGREED, email: "bob@example.com" });
    const link = extractLinkPath(ctx.sent.at(-1)!);

    const res = await followSignInLink(ctx, link);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/");
    const cookies = res.headers["set-cookie"] ?? [];
    expect(cookies.some((c: string) => c.startsWith("session_token="))).toBe(true);

    const user = await ctx.db.selectFrom("user").selectAll().where("email", "=", "bob@example.com").executeTakeFirst();
    expect(user!.status).toBe("active");
  });

  it("refuses a reused link non-revealingly and keeps no session", async () => {
    const link = await issueLink("bob@example.com", freshIp());
    const first = await followSignInLink(ctx, link);
    expect(first.status).toBe(302);
    expect(first.headers.location).toBe("/");

    const again = await followSignInLink(ctx, link);
    expect(again.status).toBe(302);
    expect(again.headers.location).toBe("/login?error=invalid-link");
    expect(again.headers["set-cookie"] ?? []).toEqual([]);
  });

  it("refuses an expired link", async () => {
    const link = await issueLink("bob@example.com", freshIp());
    timeShiftMinutes(16);
    const res = await followSignInLink(ctx, link);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/login?error=invalid-link");
  });

  it("refuses a superseded link (newer request invalidates older links)", async () => {
    const ip = freshIp();
    const oldLink = await issueLink("bob@example.com", ip);
    const newLink = await issueLink("bob@example.com", ip);

    const res = await request(ctx.app).get(oldLink);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/login?error=invalid-link");

    const ok = await followSignInLink(ctx, newLink);
    expect(ok.headers.location).toBe("/");
  });

  it("refuses a malformed link", async () => {
    const res = await request(ctx.app).get("/api/auth/verify?token=garbage&stay=0");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/login?error=invalid-link");
  });
});

describe("masked addresses in the [auth] log lines (production email R5)", () => {
  it("create-account and request-login-link never log the full address", async () => {
    const log = vi.spyOn(console, "log");
    try {
      for (const [path, email] of [
        ["/api/auth/create-account", "masked-new@example.com"],
        ["/api/auth/create-account", "masked-new@example.com"],
        ["/api/auth/request-login-link", "masked-new@example.com"],
        ["/api/auth/request-login-link", "masked-unknown@example.com"]
      ] as const) {
        await request(ctx.app).post(path).set("x-forwarded-for", freshIp()).send({ ...AGREED, email });
      }
      const lines = log.mock.calls.map((call) => call.map(String).join(" ")).filter((line) => line.startsWith("[auth]"));
      expect(lines.some((line) => line.includes("m•••@example.com"))).toBe(true);
      const all = lines.join(" | ");
      expect(all).not.toContain("masked-new@example.com");
      expect(all).not.toContain("masked-unknown@example.com");
    } finally {
      log.mockRestore();
    }
  });
});
