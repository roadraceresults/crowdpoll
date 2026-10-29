import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clearPolls, forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { insertPoll, type Poll } from "../src/polls/store.js";
import { emailKeyOf } from "../src/auth/emailKey.js";

const ADMIN = "admin-invitees@example.com";
const CREATOR = "creator-invitees@example.com";
let ctx: TestContext;
let adminCookie = "";
let creatorCookie = "";
let creatorId = "";

beforeAll(async () => {
  ctx = await startTestContext({ ENV_ADMINS: ADMIN, ENV_MAX_INVITATIONS_PER_DAY: "2" });
  adminCookie = (await forgeSession(ctx, ADMIN)).cookie;
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
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
});

async function seed(overrides: Partial<Poll> = {}): Promise<Poll> {
  const poll = makePoll({
    pollState: "INITIALIZED",
    pollVisibility: "Private Poll",
    pollSharingMode: "Invitation Only",
    voterCountLimit: 10,
    ...overrides
  });
  await insertPoll(ctx, poll, { id: creatorId, name: "Cree", email: CREATOR });
  return poll;
}

const post = (pid: string, body: Record<string, unknown>, cookie = creatorCookie) =>
  request(ctx.app).post(`/api/admin/polls/${pid}/invitees`).set("Cookie", cookie).send(body);
const get = (pid: string, cookie = creatorCookie) =>
  request(ctx.app).get(`/api/admin/polls/${pid}/invitees`).set("Cookie", cookie);

const outcomes = (body: { results: { email: string; outcome: string }[] }) =>
  body.results.map((r) => [r.email, r.outcome]);

async function settled(): Promise<void> {
  for (let i = 0; i < 50; i += 1) {
    const pending = await ctx.db
      .selectFrom("poll_invitations")
      .select("email")
      .where("sent_at", "is", null)
      .where("send_failed_at", "is", null)
      .execute();
    if (pending.length === 0) break;
    await new Promise((r) => setTimeout(r, 20));
  }
  await new Promise((r) => setTimeout(r, 50));
}

async function sessionFields(pid: string) {
  return ctx.db
    .selectFrom("polls")
    .select([
      "poll_state",
      "poll_edit_update_client_guid",
      "poll_approval_timestamp",
      "poll_acceptability_screening_attempts",
      "poll_rejection_reason"
    ])
    .where("id", "=", pid)
    .executeTakeFirstOrThrow();
}

describe("A2 add", () => {
  it("splits on commas, spaces and new lines and answers in input order", async () => {
    const poll = await seed();
    const res = await post(poll._id, { add: "Ann@example.com, bob@example.com\ncara@example.com  dan@example" });
    expect(res.status).toBe(200);
    expect(outcomes(res.body)).toEqual([
      ["ann@example.com", "added"],
      ["bob@example.com", "added"],
      ["cara@example.com", "added"],
      ["dan@example", "invalid"]
    ]);
    expect(res.body.results[3].reason).toBe("Not a valid email address.");
    expect(res.body.invitees.map((i: { email: string; status: string }) => [i.email, i.status])).toEqual([
      ["ann@example.com", "Not sent yet"],
      ["bob@example.com", "Not sent yet"],
      ["cara@example.com", "Not sent yet"]
    ]);
    expect(res.body.invitationCount).toBe(3);
    expect(res.body.acceptedCount).toBe(0);
    expect(res.body.voterLimit).toBe(10);
    expect(res.body.editable).toBe(true);
  });

  it("refuses duplicates by email key, in the input and against the list", async () => {
    const poll = await seed({ invitedVoterList: ["jdoe@gmail.com"] });
    const res = await post(poll._id, { add: "j.doe+polls@gmail.com ann@example.com ANN@example.com" });
    expect(outcomes(res.body)).toEqual([
      ["j.doe+polls@gmail.com", "duplicate"],
      ["ann@example.com", "added"],
      ["ann@example.com", "duplicate"]
    ]);
    expect(res.body.results[0].reason).toBe("Already invited.");
  });

  it("refuses a banned address by email key", async () => {
    const poll = await seed({ bannedVoterList: ["eve@gmail.com"] });
    const res = await post(poll._id, { add: "e.ve@gmail.com" });
    expect(res.body.results[0]).toEqual({ email: "e.ve@gmail.com", outcome: "banned", reason: "Banned from this poll." });
  });

  it("stops at the poll's voter limit, and at the default when it has none", async () => {
    const poll = await seed({ voterCountLimit: 2, invitedVoterList: ["a@example.com"] });
    const res = await post(poll._id, { add: "b@example.com c@example.com" });
    expect(outcomes(res.body)).toEqual([
      ["b@example.com", "added"],
      ["c@example.com", "voter-limit"]
    ]);
    expect(res.body.results[1].reason).toBe("The poll's voter limit of 2 is reached.");

    const unlimited = await seed({ voterCountLimit: null });
    const many = Array.from({ length: ctx.config.maxPrivatePollVoters + 1 }, (_, i) => `v${i}@example.com`).join(" ");
    const body = (await post(unlimited._id, { add: many })).body;
    expect(body.results.at(-1).outcome).toBe("voter-limit");
    expect(body.invitationCount).toBe(ctx.config.maxPrivatePollVoters);
  });

  it("refuses an address the allowlist does not hold", async () => {
    const poll = await seed();
    const saved = ctx.config.allowedEmailKeys;
    (ctx.config as { allowedEmailKeys: Set<string> | null }).allowedEmailKeys = new Set([emailKeyOf("ok@example.com")]);
    try {
      const res = await post(poll._id, { add: "ok@example.com kim@example.com" });
      expect(outcomes(res.body)).toEqual([
        ["ok@example.com", "added"],
        ["kim@example.com", "not-launched"]
      ]);
      expect(res.body.results[1].reason).toBe("CrowdPoll has not launched for this address yet.");
    } finally {
      (ctx.config as { allowedEmailKeys: Set<string> | null }).allowedEmailKeys = saved;
    }
  });

  it("adds past the daily allowance on an OPEN poll, marked waiting, and keeps them Not sent yet", async () => {
    const open = await seed({ pollState: "OPEN" });
    const res = await post(open._id, { add: "a@example.com b@example.com c@example.com d@example.com" });
    expect(outcomes(res.body)).toEqual([
      ["a@example.com", "added"],
      ["b@example.com", "added"],
      ["c@example.com", "added"],
      ["d@example.com", "added"]
    ]);
    expect(res.body.results.map((r: { waiting?: boolean }) => r.waiting === true)).toEqual([false, false, true, true]);
    for (let i = 0; i < 50 && ctx.sent.length < 2; i += 1) await new Promise((r) => setTimeout(r, 20));
    expect(ctx.sent.map((m) => m.to).sort()).toEqual(["a@example.com", "b@example.com"]);
    const listed = (await get(open._id)).body.invitees.map((r: { email: string; status: string }) => [r.email, r.status]);
    expect(listed.filter((r: string[]) => r[1] === "Not sent yet").map((r: string[]) => r[0])).toEqual(["c@example.com", "d@example.com"]);

    const draft = await seed();
    const drafted = await post(draft._id, { add: "x@example.com y@example.com z@example.com" });
    expect(drafted.body.results.every((r: { outcome: string; waiting?: boolean }) => r.outcome === "added" && !r.waiting)).toBe(true);
  });

  it("writes invited_count, the invited user_polls row and the empty placeholder vote", async () => {
    const poll = await seed();
    await post(poll._id, { add: "ann@example.com" });
    const row = await ctx.db.selectFrom("polls").select("invited_count").where("id", "=", poll._id).executeTakeFirstOrThrow();
    expect(row.invited_count).toBe(1);
    const relation = await ctx.db
      .selectFrom("user_polls")
      .select("relation")
      .where("poll_id", "=", poll._id)
      .where("email", "=", "ann@example.com")
      .execute();
    expect(relation.map((r) => r.relation)).toEqual(["invited"]);
    const vote = await ctx.db
      .selectFrom("votes")
      .select(["choice_ids", "voted_at"])
      .where("poll_id", "=", poll._id)
      .where("email", "=", "ann@example.com")
      .executeTakeFirstOrThrow();
    expect(vote.choice_ids).toEqual([]);
    expect(vote.voted_at).toBeNull();
  });

  it("never changes the poll's state, edit session or review", async () => {
    for (const pollState of ["INITIALIZED", "OPEN", "EDITING"] as const) {
      const poll = await seed({
        pollState,
        pollStateBeforeEditUpdate: pollState === "EDITING" ? "OPEN" : null,
        pollEditUpdateClientGUID: pollState === "EDITING" ? "tab-1" : null
      });
      const before = await sessionFields(poll._id);
      await post(poll._id, { add: "ann@example.com bob@example.com" });
      await post(poll._id, { remove: ["bob@example.com"] });
      await post(poll._id, { resend: "ann@example.com" });
      expect(await sessionFields(poll._id)).toEqual(before);
    }
  });
});

describe("A1 and the common refusals", () => {
  it("lists the invitees", async () => {
    const poll = await seed({ invitedVoterList: ["a@example.com", "b@example.com"] });
    const res = await get(poll._id);
    expect(res.status).toBe(200);
    expect(res.body.invitees.map((i: { email: string }) => i.email)).toEqual(["a@example.com", "b@example.com"]);
    expect(res.body.invitees[0]).toEqual(
      expect.objectContaining({ userName: "", status: "Not sent yet", sentAt: null, remindedAt: null, canResend: false })
    );
  });

  it("answers 404 for another creator's poll", async () => {
    const other = makePoll({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" });
    await insertPoll(ctx, other, { id: "someone-else", name: "Other", email: "other@example.com" });
    expect((await get(other._id)).status).toBe(404);
    expect((await post(other._id, { add: "a@example.com" })).status).toBe(404);
    expect((await get(other._id, adminCookie)).status).toBe(200);
  });

  it("answers 400 for a poll that is not Invitation Only", async () => {
    const poll = makePoll();
    await insertPoll(ctx, poll, { id: creatorId, name: "Cree", email: CREATOR });
    expect((await get(poll._id)).body).toEqual({ error: "This poll is not Invitation Only." });
    expect((await post(poll._id, { add: "a@example.com" })).status).toBe(400);
  });

  it("answers 400 unless exactly one of add, remove and resend is sent", async () => {
    const poll = await seed();
    for (const body of [{}, { add: "a@example.com", resend: "a@example.com" }, { remove: "a@example.com" }, { add: 3 }]) {
      const res = await post(poll._id, body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Send one of add, remove or resend.");
    }
  });

  it("answers 409 poll-closed on a CLOSED or ARCHIVED poll", async () => {
    for (const pollState of ["CLOSED", "ARCHIVED"] as const) {
      const poll = await seed({ pollState });
      const res = await post(poll._id, { add: "a@example.com" });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("poll-closed");
      expect((await get(poll._id)).body.editable).toBe(false);
    }
  });
});

describe("A2 remove", () => {
  it("removes a non-voter, their invited row and placeholder", async () => {
    const poll = await seed({ pollState: "OPEN" });
    await post(poll._id, { add: "ann@example.com bob@example.com" });
    const res = await post(poll._id, { remove: ["bob@example.com"] });
    expect(res.status).toBe(200);
    expect(res.body.removed).toEqual(["bob@example.com"]);
    expect(res.body.invitationCount).toBe(1);
    const left = await ctx.db.selectFrom("votes").select("email").where("poll_id", "=", poll._id).execute();
    expect(left.map((v) => v.email)).toEqual(["ann@example.com"]);
    const rel = await ctx.db.selectFrom("user_polls").select("email").where("poll_id", "=", poll._id).where("relation", "=", "invited").execute();
    expect(rel.map((r) => r.email)).toEqual(["ann@example.com"]);
    const row = await ctx.db.selectFrom("polls").select("invited_count").where("id", "=", poll._id).executeTakeFirstOrThrow();
    expect(row.invited_count).toBe(1);
  });

  it("refuses to remove a voter without confirmVoted, and removes the vote with it", async () => {
    const poll = await seed({
      pollState: "OPEN",
      invitedVoterList: ["vee@example.com"],
      currentVotes: [{ emailAddress: "vee@example.com", userName: "Vee", choiceIds: ["c1"], votedAt: new Date() }]
    });
    const refused = await post(poll._id, { remove: ["vee@example.com"] });
    expect(refused.status).toBe(409);
    expect(refused.body).toEqual(expect.objectContaining({ code: "invitee-voted", voted: ["vee@example.com"] }));
    expect((await get(poll._id)).body.invitationCount).toBe(1);

    const done = await post(poll._id, { remove: ["vee@example.com"], confirmVoted: true });
    expect(done.status).toBe(200);
    expect(await ctx.db.selectFrom("votes").selectAll().where("poll_id", "=", poll._id).execute()).toEqual([]);
    const row = await ctx.db.selectFrom("polls").select("vote_count").where("id", "=", poll._id).executeTakeFirstOrThrow();
    expect(row.vote_count).toBe(0);
  });

  it("remembers an emailed invitee, and adding the mailbox back restores its state without emailing", async () => {
    const poll = await seed({ pollState: "OPEN", invitedVoterList: ["jdoe@gmail.com"] });
    const sentAt = new Date(Date.now() - 2 * 3_600_000);
    await ctx.db.updateTable("poll_invitations").set({ sent_at: sentAt, reminded_at: sentAt }).where("poll_id", "=", poll._id).execute();
    await post(poll._id, { remove: ["jdoe@gmail.com"] });
    const history = await ctx.db.selectFrom("invitation_history").selectAll().where("poll_id", "=", poll._id).execute();
    expect(history.map((h) => h.email_key)).toEqual(["jdoe@gmail.com"]);

    const back = await post(poll._id, { add: "j.doe@gmail.com" });
    expect(back.body.results[0].outcome).toBe("added");
    const invitee = back.body.invitees[0];
    expect(invitee.email).toBe("j.doe@gmail.com");
    expect(Date.parse(invitee.sentAt)).toBe(sentAt.getTime());
    expect(Date.parse(invitee.remindedAt)).toBe(sentAt.getTime());
    expect(invitee.resendBlockedReason).toBe("Already reminded once.");
    await settled();
    expect(ctx.sent).toEqual([]);
    expect(await ctx.db.selectFrom("invitation_history").selectAll().execute()).toEqual([]);
  });

  it("withdraws an invitation banned through the edit path and keeps the others' state", async () => {
    const poll = await seed({ pollState: "OPEN", invitedVoterList: ["a@example.com", "b@example.com"] });
    const sentAt = new Date(Date.now() - 3_600_000);
    await ctx.db.updateTable("poll_invitations").set({ sent_at: sentAt }).where("poll_id", "=", poll._id).execute();
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { invitedVoterList: ["a@example.com"], bannedVoterList: ["b@example.com"] } });
    const list = (await get(poll._id)).body;
    expect(list.invitees.map((i: { email: string }) => i.email)).toEqual(["a@example.com"]);
    expect(Date.parse(list.invitees[0].sentAt)).toBe(sentAt.getTime());
    const history = await ctx.db.selectFrom("invitation_history").select("email_key").execute();
    expect(history.map((h) => h.email_key)).toEqual(["b@example.com"]);
  });
});

describe("A2 resend", () => {
  async function emailed(poll: Poll, email: string, sentAt: Date, extra: Record<string, Date | null> = {}) {
    await ctx.db
      .updateTable("poll_invitations")
      .set({ sent_at: sentAt, ...extra })
      .where("poll_id", "=", poll._id)
      .where("email", "=", email)
      .execute();
  }
  const dayAgo = () => new Date(Date.now() - 25 * 3_600_000);

  it("sends M2 once, sets reminded_at and counts one send", async () => {
    const poll = await seed({ pollState: "OPEN", invitedVoterList: ["ann@example.com"] });
    await emailed(poll, "ann@example.com", dayAgo());
    const res = await post(poll._id, { resend: "ann@example.com" });
    expect(res.status).toBe(200);
    await settled();
    expect(ctx.sent.map((m) => [m.to, m.subject.startsWith("Reminder: ")])).toEqual([["ann@example.com", true]]);
    expect(res.body.invitees[0].remindedAt).not.toBeNull();
    expect(await ctx.db.selectFrom("invitation_emails").selectAll().execute()).toHaveLength(1);

    const again = await post(poll._id, { resend: "ann@example.com" });
    expect(again.status).toBe(409);
    expect(again.body).toEqual({ error: "Already reminded once.", code: "resend-unavailable" });
  });

  it("refuses within 24 hours of the last email", async () => {
    const poll = await seed({ pollState: "OPEN", invitedVoterList: ["ann@example.com"] });
    await emailed(poll, "ann@example.com", new Date());
    const res = await post(poll._id, { resend: "ann@example.com" });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("ann@example.com was emailed less than 24 hours ago.");
  });

  it("refuses on a poll that is not open, and nothing is sent later", async () => {
    for (const pollState of ["EDITING", "WAITING TO OPEN", "AWAITING APPROVAL"] as const) {
      const poll = await seed({ pollState, invitedVoterList: ["ann@example.com"] });
      await emailed(poll, "ann@example.com", dayAgo());
      const res = await post(poll._id, { resend: "ann@example.com" });
      expect(res.status).toBe(409);
      expect(res.body.error).toBe("The poll is not open.");
    }
    await settled();
    expect(ctx.sent).toEqual([]);
    expect(await ctx.db.selectFrom("invitation_emails").selectAll().execute()).toEqual([]);
  });

  it("allows a resend after a failed send and clears send_failed_at", async () => {
    const poll = await seed({ pollState: "OPEN", invitedVoterList: ["ann@example.com"] });
    await emailed(poll, "ann@example.com", new Date(), { send_failed_at: new Date() });
    const res = await post(poll._id, { resend: "ann@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.invitees[0].status).toBe("Invited");
  });

  it("answers 429 daily-limit past the allowance, with retryAt and no time in the error", async () => {
    const poll = await seed({ pollState: "OPEN", invitedVoterList: ["ann@example.com"] });
    await emailed(poll, "ann@example.com", dayAgo());
    await ctx.db
      .insertInto("invitation_emails")
      .values([{ creator_id: creatorId, sent_at: new Date() }, { creator_id: creatorId, sent_at: new Date() }])
      .execute();
    const res = await post(poll._id, { resend: "ann@example.com" });
    expect(res.status).toBe(429);
    expect(res.body.error).toBe("Your daily invitation limit is reached.");
    expect(res.body.code).toBe("daily-limit");
    expect(Number.isNaN(Date.parse(res.body.retryAt))).toBe(false);
  });

  it("answers 404 for an address not on the list", async () => {
    const poll = await seed({ pollState: "OPEN" });
    expect((await post(poll._id, { resend: "nobody@example.com" })).status).toBe(404);
  });
});
