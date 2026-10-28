import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { clearPolls, forgeSession, restoreTime, startTestContext, timeShiftMinutes, type TestContext } from "./helpers/setup.js";
import { makePoll } from "./helpers/poll-fixtures.js";
import { insertPoll, type Poll } from "../src/polls/store.js";
import { mintedTokens } from "../src/auth/auth.js";
import { findSignInToken, issueInvitationToken, useToken } from "../src/invitations/tokens.js";
import { sendReminder } from "../src/invitations/sender.js";
import { maskAddress } from "../src/email/mailer.js";
import { TERMS_VERSION } from "../src/legal/version.js";

const CREATOR = "creator-redeem-owner@example.com";
let ctx: TestContext;
let creatorCookie = "";
let creatorId = "";
let serial = 0;
const freshAddress = () => `invitee-${++serial}@example.com`;
const freshIp = () => `9.9.9.${++serial}`;

beforeAll(async () => {
  ctx = await startTestContext();
  const creator = await forgeSession(ctx, CREATOR);
  creatorCookie = creator.cookie;
  creatorId = creator.userId;
});

afterAll(async () => {
  await ctx.stop();
});

beforeEach(async () => {
  await clearPolls(ctx);
  ctx.sent.length = 0;
  mintedTokens.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function seedPoll(overrides: Partial<Poll> = {}): Promise<Poll> {
  const poll = makePoll({ _id: randomUUID(), pollState: "OPEN", pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", ...overrides });
  await insertPoll(ctx, poll, { id: creatorId, name: "Cree", email: CREATOR });
  return poll;
}

async function invite(pid: string, email: string): Promise<string> {
  const res = await request(ctx.app).post(`/api/admin/polls/${pid}/invitees`).set("Cookie", creatorCookie).send({ add: email });
  expect(res.status).toBe(200);
  for (let i = 0; i < 100 && !ctx.sent.some((m) => m.to === email); i += 1) await new Promise((r) => setTimeout(r, 20));
  const mail = ctx.sent.find((m) => m.to === email)!;
  return new URL(mail.text.match(/https?:\/\/\S+/)![0]!).searchParams.get("token")!;
}

interface RedeemOptions {
  ip?: string;
  origin?: string | null;
  cookie?: string;
}

function redeem(body: Record<string, unknown>, options: RedeemOptions = {}) {
  let req = request(ctx.app).post("/api/invitations/redeem").set("Host", "127.0.0.1");
  if (options.origin !== null) req = req.set("Origin", options.origin ?? "http://127.0.0.1");
  if (options.ip) req = req.set("x-forwarded-for", options.ip);
  if (options.cookie) req = req.set("Cookie", options.cookie);
  return req.send(body);
}

const AGREE = { acceptedTerms: true, termsVersion: TERMS_VERSION };

function sessionCookieOf(res: { headers: Record<string, unknown> }): string {
  const cookies = res.headers["set-cookie"] as unknown as string[];
  const cookie = cookies.find((c) => c.startsWith("session_token="));
  expect(cookie).toBeTruthy();
  return cookie!.split(";")[0]!;
}

async function invitationRow(pid: string, email: string) {
  return ctx.db
    .selectFrom("poll_invitations")
    .select(["token_used_at", "accepted_at", "token_hash"])
    .where("poll_id", "=", pid)
    .where("email", "=", email)
    .executeTakeFirstOrThrow();
}

const userCount = async () => Number((await ctx.db.selectFrom("user").select((eb) => eb.fn.countAll<string>().as("n")).executeTakeFirstOrThrow()).n);
const sessionCount = async () => Number((await ctx.db.selectFrom("session").select((eb) => eb.fn.countAll<string>().as("n")).executeTakeFirstOrThrow()).n);

async function createPendingAccount(email: string): Promise<string> {
  const authCtx = await ctx.auth.$context;
  return (await authCtx.internalAdapter.createUser({ email, name: "", emailVerified: false })).id;
}

async function mint(email: string): Promise<string> {
  const id = `mint-${Math.random().toString(36).slice(2)}`;
  await ctx.auth.api.signInMagicLink({
    body: { email, callbackURL: "/", metadata: { mint: id } },
    headers: new Headers()
  });
  const token = mintedTokens.get(id);
  mintedTokens.delete(id);
  expect(token).toBeTruthy();
  return token!;
}

async function userRow(email: string) {
  return ctx.db
    .selectFrom("user")
    .select(["id", "emailVerified", "status", "terms_version"])
    .where("email", "=", email)
    .executeTakeFirstOrThrow();
}

describe("minted sign-in (foundation)", () => {
  it("minting stores the token in the map and sends no email", async () => {
    const invitee = freshAddress();
    await createPendingAccount(invitee);
    const token = await mint(invitee);
    expect(token.length).toBeGreaterThan(20);
    expect(ctx.sent).toEqual([]);
    expect(mintedTokens.size).toBe(0);
  });

  it("the minted token signs in through the confirmation route, verifies the address and activates the account", async () => {
    const invitee = freshAddress();
    await createPendingAccount(invitee);
    const before = await userRow(invitee);
    expect(before.emailVerified).toBe(false);
    expect(before.status).toBe("pending");
    const token = await mint(invitee);
    const res = await request(ctx.app)
      .post("/api/auth/confirm-signin")
      .set("Host", "127.0.0.1")
      .set("Origin", "http://127.0.0.1")
      .send({ token, stay: false });
    expect(res.status).toBe(200);
    expect(res.body.redirect).toBe("/");
    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c) => c.startsWith("session_token="))).toBe(true);
    const after = await userRow(invitee);
    expect(after.emailVerified).toBe(true);
    expect(after.status).toBe("active");
  });

  it("signing in with a minted token adopts invitations matched by email key", async () => {
    const creator = await forgeSession(ctx, "creator-redeem@example.com");
    const poll = makePoll({ pollState: "OPEN", pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" });
    await insertPoll(ctx, poll, { id: creator.userId, name: "Cree", email: "creator-redeem@example.com" });
    const invitee = "maria.chen@gmail.com";
    await ctx.db.insertInto("poll_invitations").values({ poll_id: poll._id, email: "mariachen+poll@gmail.com" }).execute();
    await createPendingAccount(invitee);
    const token = await mint(invitee);
    const res = await request(ctx.app)
      .post("/api/auth/confirm-signin")
      .set("Host", "127.0.0.1")
      .set("Origin", "http://127.0.0.1")
      .send({ token, stay: false });
    expect(res.status).toBe(200);
    const rows = await ctx.db.selectFrom("poll_invitations").select("email").where("poll_id", "=", poll._id).execute();
    expect(rows.map((r) => r.email)).toEqual([invitee]);
  });
});

describe("US1: a new invitee reaches the poll from the invitation alone", () => {
  it("GET /invite serves the card with no-store and writes nothing", async () => {
    const poll = await seedPoll();
    const invitee = freshAddress();
    const token = await invite(poll._id, invitee);
    const users = await userCount();
    const sessions = await sessionCount();
    const res = await request(ctx.app).get(`/invite?PID=${poll._id}&token=${token}`);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain("inviteCard");
    const row = await invitationRow(poll._id, invitee);
    expect(row.token_used_at).toBeNull();
    expect(row.accepted_at).toBeNull();
    expect(await userCount()).toBe(users);
    expect(await sessionCount()).toBe(sessions);
  });

  it("link-info answers the card's facts for a new address", async () => {
    const poll = await seedPoll();
    const invitee = freshAddress();
    const token = await invite(poll._id, invitee);
    const res = await request(ctx.app).get(`/api/invitations/link-info?PID=${poll._id}&token=${token}`);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.body).toEqual({
      email: maskAddress(invitee),
      hasAccount: false,
      signedInAs: null,
      termsVersion: TERMS_VERSION,
      staySignedInDefault: false,
      providers: []
    });
  });

  it("a press without the Terms refuses with terms-required and creates nothing", async () => {
    const poll = await seedPoll();
    const invitee = freshAddress();
    const token = await invite(poll._id, invitee);
    const users = await userCount();
    const bare = await redeem({ pid: poll._id, token, stay: false }, { ip: freshIp() });
    expect(bare.status).toBe(400);
    expect(bare.body.code).toBe("terms-required");
    const stale = await redeem({ pid: poll._id, token, stay: false, acceptedTerms: true, termsVersion: "2000-01-01" }, { ip: freshIp() });
    expect(stale.status).toBe(400);
    expect(stale.body.code).toBe("terms-required");
    expect(await userCount()).toBe(users);
    expect((await invitationRow(poll._id, invitee)).token_used_at).toBeNull();
  });

  it("Continue signs the new address in; following the redirect accepts the invitation", async () => {
    const poll = await seedPoll();
    const invitee = freshAddress();
    const token = await invite(poll._id, invitee);
    const res = await redeem({ pid: poll._id, token, stay: false, ...AGREE }, { ip: freshIp() });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ redirect: `/?PID=${poll._id}` });
    const cookie = sessionCookieOf(res);
    const user = await ctx.db
      .selectFrom("user")
      .select(["name", "emailVerified", "status", "terms_version"])
      .where("email", "=", invitee)
      .executeTakeFirstOrThrow();
    expect(user.name).toBe("");
    expect(user.emailVerified).toBe(true);
    expect(user.status).toBe("active");
    expect(user.terms_version).toBe(TERMS_VERSION);
    expect((await invitationRow(poll._id, invitee)).token_used_at).not.toBeNull();
    expect(ctx.sent.map((m) => m.to)).toEqual([invitee]);
    await request(ctx.app).get(`/?PID=${poll._id}`).set("Cookie", cookie);
    expect((await invitationRow(poll._id, invitee)).accepted_at).not.toBeNull();
  });
});

describe("US1: refusals", () => {
  it("refuses a foreign or missing Origin without touching the token", async () => {
    const poll = await seedPoll();
    const invitee = freshAddress();
    const token = await invite(poll._id, invitee);
    const foreign = await redeem({ pid: poll._id, token, stay: false, ...AGREE }, { origin: "https://evil.example" });
    expect(foreign.status).toBe(403);
    const missing = await redeem({ pid: poll._id, token, stay: false, ...AGREE }, { origin: null });
    expect(missing.status).toBe(403);
    expect((await invitationRow(poll._id, invitee)).token_used_at).toBeNull();
  });

  it("counts only presses that pass the token and Terms checks against the limit", async () => {
    const poll = await seedPoll();
    const ip = freshIp();
    const first = freshAddress();
    const second = freshAddress();
    const third = freshAddress();
    const tokens = [await invite(poll._id, first), await invite(poll._id, second), await invite(poll._id, third)];
    for (let i = 0; i < 3; i += 1) {
      const dead = await redeem({ pid: poll._id, token: "not-a-token", stay: false, ...AGREE }, { ip });
      expect(dead.status).toBe(200);
      expect(dead.body).toEqual({ redirect: `/?PID=${poll._id}` });
      const bare = await redeem({ pid: poll._id, token: tokens[0], stay: false }, { ip });
      expect(bare.status).toBe(400);
    }
    expect((await redeem({ pid: poll._id, token: tokens[0], stay: false, ...AGREE }, { ip })).status).toBe(200);
    expect((await redeem({ pid: poll._id, token: tokens[1], stay: false, ...AGREE }, { ip })).status).toBe(200);
    expect((await redeem({ pid: poll._id, token: tokens[2], stay: false, ...AGREE }, { ip })).status).toBe(429);
    expect((await invitationRow(poll._id, third)).token_used_at).toBeNull();
    expect(await ctx.db.selectFrom("user").select("id").where("email", "=", third).executeTakeFirst()).toBeUndefined();
  });

  it("a second press with the same token redirects without a second session", async () => {
    const poll = await seedPoll();
    const invitee = freshAddress();
    const token = await invite(poll._id, invitee);
    const first = await redeem({ pid: poll._id, token, stay: false, ...AGREE }, { ip: freshIp() });
    expect(first.status).toBe(200);
    const sessions = await sessionCount();
    const again = await redeem({ pid: poll._id, token, stay: false, ...AGREE }, { ip: freshIp() });
    expect(again.status).toBe(200);
    expect(again.body).toEqual({ redirect: `/?PID=${poll._id}` });
    expect(await sessionCount()).toBe(sessions);
  });

  it("never prints the token over a full send and redeem, and logs the redemption masked", async () => {
    const log = vi.spyOn(console, "log");
    const poll = await seedPoll();
    const invitee = freshAddress();
    const token = await invite(poll._id, invitee);
    const res = await redeem({ pid: poll._id, token, stay: false, ...AGREE }, { ip: freshIp() });
    expect(res.status).toBe(200);
    const lines = log.mock.calls.map((call) => call.join(" "));
    expect(lines.some((line) => line.includes(token))).toBe(false);
    expect(lines.some((line) => line.includes(`[invite] Invitation redeemed for ${maskAddress(invitee)} (new account)`))).toBe(true);
    expect(lines.some((line) => line.includes(invitee))).toBe(false);
  });
});

describe("US2: an existing account holder reaches the poll in one click", () => {
  it("link-info says hasAccount, and Continue signs in without the Terms, keeping the name", async () => {
    const poll = await seedPoll();
    const invitee = freshAddress();
    const authCtx = await ctx.auth.$context;
    await authCtx.internalAdapter.createUser({ email: invitee, name: "Maria", emailVerified: true });
    const token = await invite(poll._id, invitee);
    const info = await request(ctx.app).get(`/api/invitations/link-info?PID=${poll._id}&token=${token}`);
    expect(info.body.hasAccount).toBe(true);
    const res = await redeem({ pid: poll._id, token, stay: false }, { ip: freshIp() });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ redirect: `/?PID=${poll._id}` });
    sessionCookieOf(res);
    const user = await ctx.db.selectFrom("user").select(["name"]).where("email", "=", invitee).executeTakeFirstOrThrow();
    expect(user.name).toBe("Maria");
    expect((await invitationRow(poll._id, invitee)).token_used_at).not.toBeNull();
  });

  it("an account without the current Terms meets the gate on the landing", async () => {
    const poll = await seedPoll();
    const invitee = freshAddress();
    const authCtx = await ctx.auth.$context;
    const user = await authCtx.internalAdapter.createUser({ email: invitee, name: "", emailVerified: true });
    const token = await invite(poll._id, invitee);
    const res = await redeem({ pid: poll._id, token, stay: false }, { ip: freshIp() });
    expect(res.status).toBe(200);
    await ctx.db.updateTable("user").set({ terms_version: null, terms_accepted_at: null }).where("id", "=", user.id).execute();
    await ctx.sessions.forgetUserSessions(user.id);
    const landing = await request(ctx.app).get(`/?PID=${poll._id}`).set("Cookie", sessionCookieOf(res)).redirects(0);
    expect(landing.status).toBe(302);
    expect(landing.headers.location).toContain("/accept-terms?next=");
  });

  it("GET /invite from a browser already signed in as the invited address uses the token and goes straight in", async () => {
    const poll = await seedPoll();
    const invitee = freshAddress();
    const token = await invite(poll._id, invitee);
    const session = await forgeSession(ctx, invitee);
    const res = await request(ctx.app).get(`/invite?PID=${poll._id}&token=${token}`).set("Cookie", session.cookie).redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/?PID=${poll._id}`);
    expect((await invitationRow(poll._id, invitee)).token_used_at).not.toBeNull();
  });

  it("matches the signed-in address by email key, Gmail dots and tags included", async () => {
    const poll = await seedPoll();
    const invited = `m.c.invitee+${++serial}@gmail.com`;
    const account = `mcinvitee+${serial}@gmail.com`;
    const token = await invite(poll._id, invited);
    const session = await forgeSession(ctx, account);
    const res = await request(ctx.app).get(`/invite?PID=${poll._id}&token=${token}`).set("Cookie", session.cookie).redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/?PID=${poll._id}`);
    const row = await ctx.db
      .selectFrom("poll_invitations")
      .select("token_used_at")
      .where("poll_id", "=", poll._id)
      .executeTakeFirstOrThrow();
    expect(row.token_used_at).not.toBeNull();
  });
});

describe("US4: a browser signed in as someone else", () => {
  it("names the other account, refuses without signOut, and switches with it", async () => {
    const poll = await seedPoll();
    const invitee = freshAddress();
    const token = await invite(poll._id, invitee);
    const otherEmail = freshAddress();
    const other = await forgeSession(ctx, otherEmail);

    const info = await request(ctx.app)
      .get(`/api/invitations/link-info?PID=${poll._id}&token=${token}`)
      .set("Cookie", other.cookie);
    expect(info.body.signedInAs).toBe(maskAddress(otherEmail));

    const users = await userCount();
    const refuse = await redeem({ pid: poll._id, token, stay: false, ...AGREE }, { ip: freshIp(), cookie: other.cookie });
    expect(refuse.status).toBe(409);
    expect(refuse.body.code).toBe("other-account");
    expect(await userCount()).toBe(users);
    expect((await invitationRow(poll._id, invitee)).token_used_at).toBeNull();
    const otherSessions = await ctx.db.selectFrom("session").select("id").where("userId", "=", other.userId).execute();
    expect(otherSessions).toHaveLength(1);

    const ok = await redeem({ pid: poll._id, token, stay: false, signOut: true, ...AGREE }, { ip: freshIp(), cookie: other.cookie });
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ redirect: `/?PID=${poll._id}` });
    sessionCookieOf(ok);
    expect(await ctx.db.selectFrom("session").select("id").where("userId", "=", other.userId).execute()).toHaveLength(0);
    const invited = await ctx.db.selectFrom("user").select("id").where("email", "=", invitee).executeTakeFirstOrThrow();
    expect(await ctx.db.selectFrom("session").select("id").where("userId", "=", invited.id).execute()).toHaveLength(1);
    expect((await invitationRow(poll._id, invitee)).token_used_at).not.toBeNull();
  });

  it("still requires the Terms for an address without an account, signOut or not", async () => {
    const poll = await seedPoll();
    const invitee = freshAddress();
    const token = await invite(poll._id, invitee);
    const other = await forgeSession(ctx, freshAddress());
    const res = await redeem({ pid: poll._id, token, stay: false, signOut: true }, { ip: freshIp(), cookie: other.cookie });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("terms-required");
    expect(await ctx.db.selectFrom("session").select("id").where("userId", "=", other.userId).execute()).toHaveLength(1);
  });
});

describe("US5: old, used and expired links still lead somewhere sensible", () => {
  it("falls back to /?PID= for a replaced, used, revoked or unknown token", async () => {
    const poll = await seedPoll();
    const invitee = freshAddress();
    const replaced = await invite(poll._id, invitee);
    await sendReminder({ db: ctx.db, config: ctx.config }, poll._id, invitee);
    const current = new URL(ctx.sent[1]!.text.match(/https?:\/\/\S+/)![0]!).searchParams.get("token")!;
    const follow = (token: string) => request(ctx.app).get(`/invite?PID=${poll._id}&token=${token}`).redirects(0);

    for (const [name, token] of [
      ["replaced", replaced],
      ["unknown", "not-a-token"]
    ] as const) {
      const res = await follow(token);
      expect(res.status, name).toBe(302);
      expect(res.headers.location, name).toBe(`/?PID=${poll._id}`);
    }

    await useToken(ctx.db, poll._id, current);
    const used = await follow(current);
    expect(used.headers.location).toBe(`/?PID=${poll._id}`);

    const fresh = await issueInvitationToken(ctx.db, poll._id, invitee, null);
    await request(ctx.app).post(`/api/admin/polls/${poll._id}/invitees`).set("Cookie", creatorCookie).send({ remove: [invitee] });
    const revoked = await follow(fresh);
    expect(revoked.headers.location).toBe(`/?PID=${poll._id}`);
  });

  it("falls back once the token expires", async () => {
    const poll = await seedPoll();
    const invitee = freshAddress();
    const token = await invite(poll._id, invitee);
    timeShiftMinutes(31 * 24 * 60);
    try {
      const res = await request(ctx.app).get(`/invite?PID=${poll._id}&token=${token}`).redirects(0);
      expect(res.headers.location).toBe(`/?PID=${poll._id}`);
    } finally {
      restoreTime();
    }
  });

  it("treats a missing or invalid PID as an invalid link", async () => {
    const signedOut = await request(ctx.app).get("/invite?PID=not-a-poll&token=x").redirects(0);
    expect(signedOut.status).toBe(302);
    expect(signedOut.headers.location).toBe("/login?error=invalid-link");
    const { cookie } = await forgeSession(ctx, freshAddress());
    const signedIn = await request(ctx.app).get("/invite?PID=not-a-poll&token=x").set("Cookie", cookie).redirects(0);
    expect(signedIn.headers.location).toBe("/");
  });

  it("a plain GET of a valid link (a mail scanner) leaves the token able to sign in", async () => {
    const poll = await seedPoll();
    const invitee = freshAddress();
    const token = await invite(poll._id, invitee);
    for (let i = 0; i < 3; i += 1) {
      const res = await request(ctx.app).get(`/invite?PID=${poll._id}&token=${token}`);
      expect(res.status).toBe(200);
    }
    expect(await findSignInToken(ctx.db, poll._id, token)).toEqual({ email: invitee });
  });

  it("answers 404 for the page, link-info and redeem in oauth mode", async () => {
    const oauthCtx = await startTestContext({
      ENV_SIGNIN_METHOD: "oauth",
      ENV_OAUTH_GOOGLE_CLIENT_ID: "google-client",
      ENV_OAUTH_GOOGLE_CLIENT_SECRET: "google-secret"
    });
    try {
      const pid = randomUUID();
      expect((await request(oauthCtx.app).get(`/invite?PID=${pid}&token=x`)).status).toBe(404);
      expect((await request(oauthCtx.app).get(`/api/invitations/link-info?PID=${pid}&token=x`)).status).toBe(404);
      expect(
        (
          await request(oauthCtx.app)
            .post("/api/invitations/redeem")
            .set("Host", "127.0.0.1")
            .set("Origin", "http://127.0.0.1")
            .send({ pid, token: "x", stay: false })
        ).status
      ).toBe(404);
    } finally {
      await oauthCtx.stop();
    }
  });
});

describe("US1: behind the pre-launch allowlist", () => {
  it("refuses an address outside the allowlist, with the Terms accepted, creating nothing", async () => {
    const listedCtx = await startTestContext({ ENV_ALLOWED_EMAILS: "listed@example.com, creator-allow@example.com" });
    try {
      const creator = await forgeSession(listedCtx, "creator-allow@example.com");
      const poll = makePoll({ _id: randomUUID(), pollState: "OPEN", pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" });
      await insertPoll(listedCtx, poll, { id: creator.userId, name: "Cree", email: "creator-allow@example.com" });
      const outsider = "outsider@example.com";
      await listedCtx.db.insertInto("poll_invitations").values({ poll_id: poll._id, email: outsider }).execute();
      const token = await issueInvitationToken(listedCtx.db, poll._id, outsider, null);
      const res = await request(listedCtx.app)
        .post("/api/invitations/redeem")
        .set("Host", "127.0.0.1")
        .set("Origin", "http://127.0.0.1")
        .send({ pid: poll._id, token, stay: false, ...AGREE });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("not-launched");
      expect(res.body.redirect).toBe(`/login?error=not-launched&PID=${poll._id}`);
      expect(await listedCtx.db.selectFrom("user").select("id").where("email", "=", outsider).executeTakeFirst()).toBeUndefined();
      const row = await listedCtx.db
        .selectFrom("poll_invitations")
        .select("token_used_at")
        .where("poll_id", "=", poll._id)
        .executeTakeFirstOrThrow();
      expect(row.token_used_at).toBeNull();
    } finally {
      await listedCtx.stop();
    }
  });
});
