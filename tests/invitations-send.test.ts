import request from "supertest";
import type { Transporter } from "nodemailer";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { clearPolls, forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { insertPoll, type Poll, type PollState } from "../src/polls/store.js";
import { setTransport } from "../src/email/mailer.js";
import { sendPendingInvitations } from "../src/invitations/sender.js";
import { buildSweepSchedules } from "../src/polls/sweeps.js";

const CREATOR = "creator-send@example.com";
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
  ctx = await startTestContext({ ENV_MAX_INVITATIONS_PER_DAY: "2" });
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
  vi.restoreAllMocks();
});

async function seed(pollState: PollState, overrides: Partial<Poll> = {}): Promise<Poll> {
  const poll = makePoll({ pollState, pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", ...overrides });
  await insertPoll(ctx, poll, { id: creatorId, name: "Cree", email: CREATOR });
  return poll;
}

const add = (pid: string, text: string) =>
  request(ctx.app).post(`/api/admin/polls/${pid}/invitees`).set("Cookie", cookie).send({ add: text });

const tick = () => sendPendingInvitations({ db: ctx.db, config: ctx.config });

async function until(check: () => boolean | Promise<boolean>): Promise<void> {
  for (let i = 0; i < 100 && !(await check()); i += 1) await new Promise((r) => setTimeout(r, 20));
}

async function state(pid: string) {
  return ctx.db
    .selectFrom("poll_invitations")
    .select(["email", "sent_at", "send_failed_at"])
    .where("poll_id", "=", pid)
    .orderBy("position")
    .execute();
}

const sends = async () => (await ctx.db.selectFrom("invitation_emails").selectAll().execute()).length;

describe("sending invitations", () => {
  it("emails each address added to an OPEN poll once, after the response", async () => {
    const poll = await seed("OPEN");
    const res = await add(poll._id, "ann@example.com bob@example.com");
    expect(res.status).toBe(200);
    await until(() => ctx.sent.length === 2);
    expect(ctx.sent.map((m) => m.to).sort()).toEqual(["ann@example.com", "bob@example.com"]);
    expect(ctx.sent[0]!.subject).toBe('creator-send invited you to a private poll on CrowdPoll: "Test Poll"');
    expect(ctx.sent[0]!.text).toContain(`http://localhost:8080/invite?PID=${poll._id}&token=`);
    await tick();
    expect(ctx.sent).toHaveLength(2);
    expect(await sends()).toBe(2);
  });

  it("the invitation sweep runs at ENV_INVITATION_SWEEP_INTERVAL, and the counter flush at ENV_COUNTER_FLUSH_SWEEP_INTERVAL (feature 20261028 R10)", () => {
    const intervals = Object.fromEntries(buildSweepSchedules(ctx.config, ctx).map((s) => [s.name, s.intervalMs]));
    expect(ctx.config.invitationSweepIntervalMs).toBe(30_000);
    expect(intervals.invitationSweep).toBe(ctx.config.invitationSweepIntervalMs);
    expect(Object.fromEntries(buildSweepSchedules({ ...ctx.config, invitationSweepIntervalMs: 7000 }, ctx).map((s) => [s.name, s.intervalMs])).invitationSweep).toBe(7000);
    expect(intervals.counterFlushSweep).toBe(ctx.config.counterFlushSweepIntervalMs);
    expect(intervals.scheduleSweep).toBe(ctx.config.pollDateCheckSweepIntervalMs);
    expect(intervals.outboxDrainSweep).toBe(ctx.config.outboxDrainSweepIntervalMs);
    expect(intervals.trendingSweep).toBe(ctx.config.trendingPollsRecomputeSweepIntervalMs);
    expect(intervals.newestSweep).toBe(ctx.config.newestPollsRecomputeSweepIntervalMs);
  });

  it("sends nothing before the poll opens, then one tick sends every pending invitation", async () => {
    for (const pollState of ["INITIALIZED", "AWAITING APPROVAL", "REJECTED", "WAITING TO OPEN"] as const) {
      const poll = await seed(pollState);
      await add(poll._id, "ann@example.com");
      await tick();
      expect(ctx.sent, pollState).toEqual([]);
      await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "OPEN" } });
      await tick();
      expect(ctx.sent.map((m) => m.to), pollState).toEqual(["ann@example.com"]);
      await clearPolls(ctx);
      ctx.sent.length = 0;
    }
  });

  it("sends the oldest within the daily allowance and the rest once the window frees", async () => {
    const poll = await seed("WAITING TO OPEN");
    await add(poll._id, "first@example.com");
    await add(poll._id, "second@example.com");
    await add(poll._id, "third@example.com");
    await ctx.db.updateTable("poll_invitations").set({ added_at: new Date(Date.now() - 1000) }).where("email", "=", "first@example.com").execute();
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "OPEN" } });
    await tick();
    expect(ctx.sent.map((m) => m.to)).toEqual(["first@example.com", "second@example.com"]);
    expect((await state(poll._id)).find((r) => r.email === "third@example.com")!.sent_at).toBeNull();

    await ctx.db.updateTable("invitation_emails").set({ sent_at: new Date(Date.now() - 25 * 3_600_000) }).execute();
    await tick();
    expect(ctx.sent.map((m) => m.to)).toEqual(["first@example.com", "second@example.com", "third@example.com"]);
  });

  it("never sends one invitation twice when the route and a sweep tick race", async () => {
    const poll = await seed("WAITING TO OPEN");
    await add(poll._id, "ann@example.com bob@example.com");
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "OPEN" } });
    await Promise.all([tick(), tick(), sendPendingInvitations({ db: ctx.db, config: ctx.config }, poll._id)]);
    expect(ctx.sent.map((m) => m.to).sort()).toEqual(["ann@example.com", "bob@example.com"]);
    expect(await sends()).toBe(2);
  });

  it("sends nothing again after EDITING, but sends an address added while EDITING", async () => {
    const poll = await seed("OPEN");
    await add(poll._id, "ann@example.com");
    await until(() => ctx.sent.length === 1);
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "EDITING", pollStateBeforeEditUpdate: "OPEN" } });
    await add(poll._id, "bob@example.com");
    await tick();
    expect(ctx.sent).toHaveLength(1);
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "OPEN", pollStateBeforeEditUpdate: null } });
    await tick();
    expect(ctx.sent.map((m) => m.to)).toEqual(["ann@example.com", "bob@example.com"]);
  });

  it("never sends for a poll closed before it opened", async () => {
    const poll = await seed("WAITING TO OPEN");
    await add(poll._id, "ann@example.com");
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "CLOSED" } });
    await tick();
    expect(ctx.sent).toEqual([]);
  });

  it("marks a failed send, counts the attempt and logs only masked addresses", async () => {
    const log = vi.spyOn(console, "log");
    setTransport({
      sendMail: async () => {
        throw new Error("boom");
      }
    } as unknown as Transporter);
    const poll = await seed("WAITING TO OPEN");
    await add(poll._id, "ann@example.com");
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "OPEN" } });
    await tick();
    const [row] = await state(poll._id);
    expect(row!.sent_at).not.toBeNull();
    expect(row!.send_failed_at).not.toBeNull();
    expect(await sends()).toBe(1);
    await tick();
    expect(await sends()).toBe(1);
    const lines = log.mock.calls.map((c) => c.join(" "));
    expect(lines.some((l) => l.includes("a•••@example.com"))).toBe(true);
    expect(lines.some((l) => l.includes("ann@example.com"))).toBe(false);
  });
});
