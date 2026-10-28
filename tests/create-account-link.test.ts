/**
 * TWEAK04 — the create-account email sent to an address with no account is a
 * one-time link: it creates the account and signs in, with no second email.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { startTestContext, extractLink, forgeSession, timeShiftMinutes, restoreTime, type TestContext } from "./helpers/setup.js";
import { TERMS_VERSION } from "../src/legal/version.js";
import { supersedeLoginLinks } from "../src/auth/auth.js";

let ctx: TestContext;
let serial = 0;
const freshAddress = () => `newcomer-${++serial}@example.com`;
let nextIp = 1;
const freshIp = () => `10.44.0.${nextIp++}`;
const AGREE = { acceptedTerms: true, termsVersion: TERMS_VERSION };

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  await ctx.stop();
});
afterEach(() => {
  restoreTime();
});

/** Asks for a sign-in link for an address with no account; returns the emailed token and link. */
async function requestLink(email: string, body: Record<string, unknown> = {}): Promise<{ token: string; link: URL }> {
  const res = await request(ctx.app)
    .post("/api/auth/request-login-link")
    .set("x-forwarded-for", freshIp())
    .send({ email, staySignedIn: false, ...body });
  expect(res.status).toBe(200);
  const mail = ctx.sent.at(-1)!;
  expect(mail.to).toBe(email);
  const link = new URL(extractLink(mail));
  return { token: link.searchParams.get("token")!, link };
}

interface PostOptions {
  ip?: string;
  origin?: string | null;
  cookie?: string;
}

function create(body: Record<string, unknown>, options: PostOptions = {}) {
  let req = request(ctx.app).post("/api/auth/create-account").set("Host", "127.0.0.1");
  if (options.origin !== null) req = req.set("Origin", options.origin ?? "http://127.0.0.1");
  req = req.set("x-forwarded-for", options.ip ?? freshIp());
  if (options.cookie) req = req.set("Cookie", options.cookie);
  return req.send(body);
}

const userOf = (email: string) => ctx.db.selectFrom("user").selectAll().where("email", "=", email).executeTakeFirst();
const sessionCount = async () =>
  Number((await ctx.db.selectFrom("session").select((eb) => eb.fn.countAll<string>().as("n")).executeTakeFirstOrThrow()).n);

describe("the create-account email for an address with no account", () => {
  it("carries a one-time token, stores only its hash and creates no account", async () => {
    const email = freshAddress();
    const { token, link } = await requestLink(email);
    expect(link.pathname).toBe("/create-account");
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(ctx.sent.at(-1)!.text).toContain("The button works once, for 15 minutes.");
    const rows = await ctx.db.selectFrom("verification").select(["identifier", "value"]).where("identifier", "like", "create-account:%").execute();
    expect(rows.some((r) => r.identifier.includes(token) || r.value.includes(token))).toBe(false);
    expect(rows.some((r) => r.value.includes(email))).toBe(true);
    expect(await userOf(email)).toBeUndefined();
  });

  it("keeps only the newest link for an address", async () => {
    const email = freshAddress();
    const first = await requestLink(email);
    const second = await requestLink(email);
    expect((await request(ctx.app).get(`/api/auth/create-account/link-info?token=${first.token}`)).status).toBe(404);
    expect((await request(ctx.app).get(`/api/auth/create-account/link-info?token=${second.token}`)).status).toBe(200);
  });

  it("survives the sign-in link supersession that minting runs", async () => {
    const email = freshAddress();
    const { token } = await requestLink(email);
    await supersedeLoginLinks(ctx.db, email);
    expect((await request(ctx.app).get(`/api/auth/create-account/link-info?token=${token}`)).status).toBe(200);
  });
});

describe("GET /api/auth/create-account/link-info", () => {
  it("answers the masked address and writes nothing", async () => {
    const email = freshAddress();
    const { token } = await requestLink(email);
    const res = await request(ctx.app).get(`/api/auth/create-account/link-info?token=${token}`);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.body).toEqual({ email: expect.stringMatching(/^n•••@example\.com$/), hasAccount: false, termsVersion: TERMS_VERSION });
    expect(await userOf(email)).toBeUndefined();
    expect((await request(ctx.app).get(`/api/auth/create-account/link-info?token=${token}`)).status).toBe(200);
  });

  it("answers 404 for an unknown or expired token", async () => {
    expect((await request(ctx.app).get("/api/auth/create-account/link-info?token=nope")).body).toMatchObject({ code: "invalid-link" });
    const { token } = await requestLink(freshAddress());
    timeShiftMinutes(16);
    expect((await request(ctx.app).get(`/api/auth/create-account/link-info?token=${token}`)).status).toBe(404);
  });

  it("serves the page that opens the link without writing anything", async () => {
    const email = freshAddress();
    const { link } = await requestLink(email);
    const page = await request(ctx.app).get(link.pathname + link.search);
    expect(page.status).toBe(200);
    expect(await userOf(email)).toBeUndefined();
  });
});

describe("POST /api/auth/create-account with a token", () => {
  it("requires the Terms for a new address and creates nothing without them", async () => {
    const email = freshAddress();
    const { token } = await requestLink(email);
    const res = await create({ token });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("terms-required");
    expect(await userOf(email)).toBeUndefined();
  });

  it("creates the account, confirms the address and signs in, with no second email", async () => {
    const email = freshAddress();
    const pid = randomUUID();
    const { token } = await requestLink(email, { pid });
    const mails = ctx.sent.length;
    const res = await create({ token, ...AGREE });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ redirect: `/?PID=${pid}` });
    expect((res.headers["set-cookie"] as unknown as string[]).some((c) => c.startsWith("session_token="))).toBe(true);
    expect(ctx.sent.length).toBe(mails);
    const user = await userOf(email);
    expect(user).toMatchObject({ emailVerified: true, status: "active", terms_version: TERMS_VERSION });
  });

  it("signs in once: a second press is an invalid link", async () => {
    const { token } = await requestLink(freshAddress());
    expect((await create({ token, ...AGREE })).status).toBe(200);
    const again = await create({ token, ...AGREE });
    expect(again.status).toBe(400);
    expect(again.body.code).toBe("invalid-link");
  });

  it("refuses a foreign or missing Origin", async () => {
    const email = freshAddress();
    const { token } = await requestLink(email);
    expect((await create({ token, ...AGREE }, { origin: "https://evil.example" })).status).toBe(403);
    expect((await create({ token, ...AGREE }, { origin: null })).status).toBe(403);
    expect(await userOf(email)).toBeUndefined();
  });

  it("refuses an expired token", async () => {
    const email = freshAddress();
    const { token } = await requestLink(email);
    timeShiftMinutes(16);
    const res = await create({ token, ...AGREE });
    expect(res.body.code).toBe("invalid-link");
    expect(await userOf(email)).toBeUndefined();
  });

  it("signs an address that gained an account meanwhile in, without asking for the Terms", async () => {
    const email = freshAddress();
    const { token } = await requestLink(email);
    await forgeSession(ctx, email);
    const info = await request(ctx.app).get(`/api/auth/create-account/link-info?token=${token}`);
    expect(info.body.hasAccount).toBe(true);
    const before = await sessionCount();
    const res = await create({ token });
    expect(res.status).toBe(200);
    expect(await sessionCount()).toBe(before);
  });

  it("counts against the create-account rate limit", async () => {
    const ip = freshIp();
    const tokens = [];
    for (let i = 0; i < 3; i++) tokens.push((await requestLink(freshAddress())).token);
    expect((await create({ token: tokens[0], ...AGREE }, { ip })).status).toBe(200);
    expect((await create({ token: tokens[1], ...AGREE }, { ip })).status).toBe(200);
    const limited = await create({ token: tokens[2], ...AGREE }, { ip });
    expect(limited.status).toBe(429);
    expect((await request(ctx.app).get(`/api/auth/create-account/link-info?token=${tokens[2]}`)).status).toBe(200);
  });
});

describe("the allowlist", () => {
  let listed: TestContext;
  beforeAll(async () => {
    listed = await startTestContext({ ENV_ALLOWED_EMAILS: "listed@example.com" });
  });
  afterAll(async () => {
    await listed.stop();
  });

  it("refuses a token whose address is not listed and creates nothing", async () => {
    const { issueCreateAccountToken } = await import("../src/auth/createAccountLinks.js");
    const token = await issueCreateAccountToken(listed.db, { email: "stranger@example.com", pid: null, stay: false });
    const res = await request(listed.app)
      .post("/api/auth/create-account")
      .set("Host", "127.0.0.1")
      .set("Origin", "http://127.0.0.1")
      .set("x-forwarded-for", freshIp())
      .send({ token, ...AGREE });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("not-launched");
    expect(await listed.db.selectFrom("user").select("id").where("email", "=", "stranger@example.com").executeTakeFirst()).toBeUndefined();
  });
});
