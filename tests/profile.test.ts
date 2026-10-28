/**
 * US3 — userName editing with case-insensitive uniqueness, verified email
 * change with old-address notice (FR-011, FR-013–FR-013d; spec Story 3).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { AGREED,
  startTestContext,
  forgeSession,
  extractLink,
  extractLinkPath,
  followSignInLink,
  timeShiftMinutes,
  restoreTime,
  type TestContext
} from "./helpers/setup.js";

let ctx: TestContext;
let nextIp = 1;
const freshIp = () => `10.4.0.${nextIp++}`;
let nextUser = 1;
const freshEmail = () => `profile${nextUser++}@example.com`;

async function signIn(email: string, ip = freshIp()): Promise<string> {
  await request(ctx.app)
    .post("/api/auth/create-account")
    .set("x-forwarded-for", ip)
    .send({ ...AGREED, email });
  const link = extractLinkPath(ctx.sent.at(-1)!);
  const res = await followSignInLink(ctx, link);
  expect(res.headers.location).toBe("/");
  const setCookie = (res.headers["set-cookie"] as unknown as string[]).find((c) =>
    c.startsWith("session_token=")
  )!;
  return setCookie.split(";")[0]!;
}

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  await ctx.stop();
});
afterEach(() => {
  restoreTime();
});

describe("PATCH /api/me — userName (FR-013)", () => {
  it("saves a free userName and returns the updated profile", async () => {
    const email = freshEmail();
    const cookie = await signIn(email);
    const res = await request(ctx.app)
      .patch("/api/me")
      .set("Cookie", cookie)
      .send({ userName: "Fresh Name" });
    expect(res.status).toBe(200);
    expect(res.body.userName).toBe("Fresh Name");

    const me = await request(ctx.app).get("/api/me").set("Cookie", cookie);
    expect(me.body.userName).toBe("Fresh Name");
  });

  it("rejects a name already in use, case-insensitively (409)", async () => {
    const takenOwner = await signIn(freshEmail());
    await request(ctx.app).patch("/api/me").set("Cookie", takenOwner).send({ userName: "TakenHandle" });

    const cookie = await signIn(freshEmail());
    const res = await request(ctx.app)
      .patch("/api/me")
      .set("Cookie", cookie)
      .send({ userName: "takenhandle" });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/in use|taken/i);
  });

  it("rejects empty and oversized names (400) and guests (401)", async () => {
    const cookie = await signIn(freshEmail());
    expect(
      (await request(ctx.app).patch("/api/me").set("Cookie", cookie).send({ userName: "" })).status
    ).toBe(400);
    expect(
      (
        await request(ctx.app)
          .patch("/api/me")
          .set("Cookie", cookie)
          .send({ userName: "x".repeat(201) })
      ).status
    ).toBe(400);
    expect((await request(ctx.app).patch("/api/me").send({ userName: "y" })).status).toBe(401);
  });

  it("keeping your own current name is not a conflict", async () => {
    const cookie = await signIn(freshEmail());
    const me = await request(ctx.app).get("/api/me").set("Cookie", cookie);
    const res = await request(ctx.app)
      .patch("/api/me")
      .set("Cookie", cookie)
      .send({ userName: me.body.userName });
    expect(res.status).toBe(200);
  });
});

describe("POST /api/me/email-change (FR-013a–c)", () => {
  it("sends a verification link to the NEW address; profile keeps the old one", async () => {
    const email = freshEmail();
    const cookie = await signIn(email);
    const res = await request(ctx.app)
      .post("/api/me/email-change")
      .set("x-forwarded-for", freshIp())
      .set("Cookie", cookie)
      .send({ newEmail: "new-address@example.com" });
    expect(res.status).toBe(202);

    const mail = ctx.sent.at(-1)!;
    expect(mail.to).toBe("new-address@example.com");
    expect(extractLink(mail)).toContain("/api/me/email-change/verify?token=");

    const me = await request(ctx.app).get("/api/me").set("Cookie", cookie);
    expect(me.body.emailAddress).toBe(email);
  });

  it("refuses an address used by another account (409) and sends no email", async () => {
    const otherEmail = freshEmail();
    await signIn(otherEmail);
    const cookie = await signIn(freshEmail());
    const sentBefore = ctx.sent.length;
    const res = await request(ctx.app)
      .post("/api/me/email-change")
      .set("x-forwarded-for", freshIp())
      .set("Cookie", cookie)
      .send({ newEmail: otherEmail });
    expect(res.status).toBe(409);
    expect(ctx.sent.length).toBe(sentBefore);
  });

  it("refuses the account's own current address (400) and sends no email", async () => {
    const email = freshEmail();
    const cookie = await signIn(email);
    const sentBefore = ctx.sent.length;
    const res = await request(ctx.app)
      .post("/api/me/email-change")
      .set("x-forwarded-for", freshIp())
      .set("Cookie", cookie)
      .send({ newEmail: email.toUpperCase() });
    expect(res.status).toBe(400);
    expect(ctx.sent.length).toBe(sentBefore);
  });

  it("refuses guests (401) and invalid addresses (400)", async () => {
    expect(
      (await request(ctx.app).post("/api/me/email-change").send({ newEmail: "a@b.c" })).status
    ).toBe(401);
    const cookie = await signIn(freshEmail());
    expect(
      (
        await request(ctx.app)
          .post("/api/me/email-change")
          .set("x-forwarded-for", freshIp())
          .set("Cookie", cookie)
          .send({ newEmail: "nope" })
      ).status
    ).toBe(400);
  });
});

describe("GET /api/me/email-change/verify (FR-013a/d)", () => {
  async function requestChange(cookie: string, newEmail: string): Promise<string> {
    const res = await request(ctx.app)
      .post("/api/me/email-change")
      .set("x-forwarded-for", freshIp())
      .set("Cookie", cookie)
      .send({ newEmail });
    expect(res.status).toBe(202);
    return extractLinkPath(ctx.sent.at(-1)!);
  }

  it("completes the swap without a session and notifies the old address with no links", async () => {
    const oldEmail = freshEmail();
    const cookie = await signIn(oldEmail);
    const newEmail = `changed-${oldEmail}`;
    const link = await requestChange(cookie, newEmail);

    // Session-less browser: no cookie sent.
    const res = await request(ctx.app).get(link);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/profile?changed=1");

    const me = await request(ctx.app).get("/api/me").set("Cookie", cookie);
    expect(me.body.emailAddress).toBe(newEmail);

    const notice = ctx.sent.at(-1)!;
    expect(notice.to).toBe(oldEmail);
    expect(notice.text).not.toMatch(/https?:\/\//);
  });

  it("refuses expired, reused, and superseded links; profile keeps its address", async () => {
    const oldEmail = freshEmail();
    const cookie = await signIn(oldEmail);

    // Reuse.
    const link = await requestChange(cookie, `r1-${oldEmail}`);
    await request(ctx.app).get(link);
    const reuse = await request(ctx.app).get(link);
    expect(reuse.headers.location).toBe("/profile?error=invalid-link");

    // Supersession: a newer request invalidates the older link.
    const older = await requestChange(cookie, `r2-${oldEmail}`);
    const newer = await requestChange(cookie, `r3-${oldEmail}`);
    expect((await request(ctx.app).get(older)).headers.location).toBe(
      "/profile?error=invalid-link"
    );

    // Expiry.
    timeShiftMinutes(16);
    expect((await request(ctx.app).get(newer)).headers.location).toBe(
      "/profile?error=invalid-link"
    );
    restoreTime();

    const me = await request(ctx.app).get("/api/me").set("Cookie", cookie);
    expect(me.body.emailAddress).toBe(`r1-${oldEmail}`);
  });

  it("re-checks uniqueness at consume — the first verified change wins", async () => {
    const emailA = freshEmail();
    const emailB = freshEmail();
    const cookieA = await signIn(emailA);
    const cookieB = await signIn(emailB);
    const contested = `contested-${nextUser}@example.com`;

    const linkA = await requestChange(cookieA, contested);
    const linkB = await requestChange(cookieB, contested);

    expect((await request(ctx.app).get(linkA)).headers.location).toBe("/profile?changed=1");
    expect((await request(ctx.app).get(linkB)).headers.location).toBe(
      "/profile?error=invalid-link"
    );

    const meB = await request(ctx.app).get("/api/me").set("Cookie", cookieB);
    expect(meB.body.emailAddress).toBe(emailB);
  });
});

/**
 * 012 US7 (FR-049..FR-053): the Poll Administration menu entry.
 *
 * `isAdmin` is a *rendering hint*, never an authorization decision. It exists so the
 * header can decide whether to draw a menu item; every admin route keeps its own
 * server-side gate, which is what makes forging the flag in devtools harmless.
 */
describe("GET /api/me exposes isAdmin (012 US7)", () => {
  let adminCtx: TestContext;

  beforeAll(async () => {
    // Deliberately odd casing and padding: config normalises the allow-list, and the
    // predicate must normalise the incoming address the same way (FR-050).
    adminCtx = await startTestContext({ ENV_ADMINS: "  Boss@Example.COM , second@example.com " });
  });
  afterAll(async () => {
    await adminCtx.stop();
  });

  it("is true for an address on the allow-list, whatever its casing", async () => {
    const { cookie } = await forgeSession(adminCtx, "boss@example.com");
    const res = await request(adminCtx.app).get("/api/me").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.isAdmin).toBe(true);
  });

  it("is true for every entry on the list, not only the first", async () => {
    const { cookie } = await forgeSession(adminCtx, "second@example.com");
    const res = await request(adminCtx.app).get("/api/me").set("Cookie", cookie);
    expect(res.body.isAdmin).toBe(true);
  });

  it("is false for a signed-in user who is not on the list", async () => {
    const { cookie } = await forgeSession(adminCtx, "nobody@example.com");
    const res = await request(adminCtx.app).get("/api/me").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.isAdmin).toBe(false);
  });

  it("is simply absent for a guest, because /api/me refuses them first", async () => {
    const res = await request(adminCtx.app).get("/api/me");
    expect(res.status).toBe(401);
    expect(res.body.isAdmin).toBeUndefined();
  });
});
