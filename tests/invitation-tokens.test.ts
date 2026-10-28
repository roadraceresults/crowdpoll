import request from "supertest";
import type { Transporter } from "nodemailer";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clearPolls, forgeSession, restoreTime, startTestContext, timeShiftMinutes, type CapturedMail, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { insertPoll, type Poll } from "../src/polls/store.js";
import { setTransport } from "../src/email/mailer.js";
import { sendPendingInvitations, sendReminder } from "../src/invitations/sender.js";
import { findSignInToken, issueInvitationToken, useToken } from "../src/invitations/tokens.js";
import { hashToken } from "../src/auth/auth.js";

const CREATOR = "creator-tokens@example.com";
const INVITEE = "ann@example.com";
let ctx: TestContext;
let cookie = "";
let creatorId = "";

function capture(): void {
  setTransport({
    sendMail: async (opts: { to: string; subject: string; text: string; html: string }) => {
      ctx.sent.push({ to: String(opts.to), subject: String(opts.subject), text: String(opts.text), html: String(opts.html) });
      return { messageId: `test-${ctx.sent.length}` };
    }
  } as unknown as Transporter);
}

beforeAll(async () => {
  ctx = await startTestContext();
  const creator = await forgeSession(ctx, CREATOR);
  cookie = creator.cookie;
  creatorId = creator.userId;
});

afterAll(async () => {
  await ctx.stop();
});

beforeEach(async () => {
  await clearPolls(ctx);
  ctx.sent.length = 0;
  capture();
});

afterEach(() => {
  restoreTime();
});

async function seed(overrides: Partial<Poll> = {}): Promise<Poll> {
  const poll = makePoll({ pollState: "OPEN", pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", ...overrides });
  await insertPoll(ctx, poll, { id: creatorId, name: "Cree", email: CREATOR });
  return poll;
}

async function invite(pid: string, email: string = INVITEE): Promise<string> {
  const res = await request(ctx.app).post(`/api/admin/polls/${pid}/invitees`).set("Cookie", cookie).send({ add: email });
  expect(res.status).toBe(200);
  for (let i = 0; i < 100 && !ctx.sent.some((m) => m.to === email); i += 1) await new Promise((r) => setTimeout(r, 20));
  return tokenOf(ctx.sent.find((m) => m.to === email)!);
}

function tokenOf(mail: CapturedMail): string {
  const match = mail.text.match(/https?:\/\/\S+/);
  expect(match).not.toBeNull();
  const url = new URL(match![0]!);
  expect(url.pathname).toBe("/invite");
  const token = url.searchParams.get("token");
  expect(token).toBeTruthy();
  return token!;
}

async function row(pid: string, email: string = INVITEE) {
  return ctx.db
    .selectFrom("poll_invitations")
    .select(["token_hash", "token_expires_at", "token_used_at"])
    .where("poll_id", "=", pid)
    .where("email", "=", email)
    .executeTakeFirstOrThrow();
}

describe("issuing at a send", () => {
  it("stores the hash, a 30-day expiry and no used mark; the email carries the token", async () => {
    const poll = await seed();
    const before = Date.now();
    const token = await invite(poll._id);
    const stored = await row(poll._id);
    expect(stored.token_hash).toBe(hashToken(token));
    expect(stored.token_hash).not.toBe(token);
    expect(stored.token_used_at).toBeNull();
    const expires = new Date(stored.token_expires_at!).getTime();
    expect(expires).toBeGreaterThan(before + 29 * 24 * 3_600_000);
    expect(expires).toBeLessThan(before + 31 * 24 * 3_600_000);
    const link = ctx.sent[0]!.text.match(/https?:\/\/\S+/)![0]!;
    expect(link.startsWith(`http://localhost:8080/invite?PID=${poll._id}&token=`)).toBe(true);
    expect(await findSignInToken(ctx.db, poll._id, token)).toEqual({ email: INVITEE });
  });

  it("expires at the poll's end when that comes first", async () => {
    const endAt = new Date(Date.now() + 10 * 24 * 3_600_000);
    const poll = await seed({ endAt });
    await invite(poll._id);
    const stored = await row(poll._id);
    expect(new Date(stored.token_expires_at!).getTime()).toBe(endAt.getTime());
  });

  it("a reminder replaces the hash, so only the newest token signs in", async () => {
    const poll = await seed();
    const first = await invite(poll._id);
    await sendReminder({ db: ctx.db, config: ctx.config }, poll._id, INVITEE);
    expect(ctx.sent).toHaveLength(2);
    const second = tokenOf(ctx.sent[1]!);
    expect(second).not.toBe(first);
    expect((await row(poll._id)).token_hash).toBe(hashToken(second));
    expect(await findSignInToken(ctx.db, poll._id, first)).toBeNull();
    expect(await findSignInToken(ctx.db, poll._id, second)).toEqual({ email: INVITEE });
  });

  it("issues no token and keeps the /?PID= link without native sign-in", async () => {
    const poll = await seed();
    await ctx.db.insertInto("poll_invitations").values({ poll_id: poll._id, email: INVITEE }).execute();
    await sendPendingInvitations({ db: ctx.db, config: { ...ctx.config, nativeSignin: false } });
    expect(ctx.sent).toHaveLength(1);
    expect(ctx.sent[0]!.text).toContain(`http://localhost:8080/?PID=${poll._id}`);
    expect(ctx.sent[0]!.text).not.toContain("/invite?");
    expect(ctx.sent[0]!.text).not.toContain("signs you in");
    expect((await row(poll._id)).token_hash).toBeNull();
  });
});

describe("can a token sign in?", () => {
  it("not after it was used, and useToken wins only once", async () => {
    const poll = await seed();
    const token = await invite(poll._id);
    expect(await useToken(ctx.db, poll._id, token)).toBe(true);
    expect((await row(poll._id)).token_used_at).not.toBeNull();
    expect(await findSignInToken(ctx.db, poll._id, token)).toBeNull();
    expect(await useToken(ctx.db, poll._id, token)).toBe(false);
  });

  it("not after it expires", async () => {
    const poll = await seed();
    const token = await invite(poll._id);
    timeShiftMinutes(31 * 24 * 60);
    expect(await findSignInToken(ctx.db, poll._id, token)).toBeNull();
  });

  it("not while the poll is closed or archived, nor when it is no longer Invitation Only", async () => {
    const poll = await seed();
    const token = await invite(poll._id);
    for (const pollState of ["CLOSED", "ARCHIVED"] as const) {
      await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState } });
      expect(await findSignInToken(ctx.db, poll._id, token), pollState).toBeNull();
    }
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "OPEN" } });
    expect(await findSignInToken(ctx.db, poll._id, token)).toEqual({ email: INVITEE });
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollSharingMode: "Anyone With The Link" } });
    expect(await findSignInToken(ctx.db, poll._id, token)).toBeNull();
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollSharingMode: "Invitation Only", pollVisibility: "Public Poll" } });
    expect(await findSignInToken(ctx.db, poll._id, token)).toBeNull();
  });

  it("not after the address is removed, and not for another poll's id", async () => {
    const poll = await seed();
    const other = await seed();
    const token = await invite(poll._id);
    expect(await findSignInToken(ctx.db, other._id, token)).toBeNull();
    const res = await request(ctx.app).post(`/api/admin/polls/${poll._id}/invitees`).set("Cookie", cookie).send({ remove: [INVITEE] });
    expect(res.status).toBe(200);
    expect(await findSignInToken(ctx.db, poll._id, token)).toBeNull();
  });

  it("issueInvitationToken clears an old used mark", async () => {
    const poll = await seed();
    const token = await invite(poll._id);
    await useToken(ctx.db, poll._id, token);
    const next = await issueInvitationToken(ctx.db, poll._id, INVITEE, null);
    const stored = await row(poll._id);
    expect(stored.token_hash).toBe(hashToken(next));
    expect(stored.token_used_at).toBeNull();
    expect(await findSignInToken(ctx.db, poll._id, next)).toEqual({ email: INVITEE });
  });
});
