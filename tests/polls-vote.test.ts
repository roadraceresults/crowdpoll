/**
 * The vote route on the single vote path: validated from the cache, counted at
 * once, queued for the consumer, answered with the live counts. Refusals keep
 * their established messages and codes.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { startTestContext, forgeSession, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { POLL_STATES } from "./helpers/state-helpers.js";
import { readLiveCounts } from "../src/polls/counters.js";
import { addBookmark } from "../src/polls/bookmarks.js";

let ctx: TestContext;
let users = 0;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MIN_VOTE_REFRESH_INTERVAL: "100", ENV_MAX_PRIVATE_POLL_VOTERS: "3" });
});

afterAll(async () => {
  await ctx.stop();
});

beforeEach(async () => {
  await polls(ctx).deleteMany({});
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
  for (const key of await ctx.cache.scan("votes-ip:*")) await ctx.cache.del(key);
});

async function voter(email = `v${users++}@example.com`) {
  const { cookie } = await forgeSession(ctx, email);
  return { cookie, email };
}

const vote = (pid: string, cookie: string | null, choiceIds: unknown, ip = `10.0.0.${users}`) => {
  let req = request(ctx.app).post(`/api/polls/${pid}/vote`).set("X-Forwarded-For", ip);
  if (cookie) req = req.set("Cookie", cookie);
  return req.send({ choiceIds });
};

async function drain(): Promise<number> {
  return ctx.consumer.runOnce();
}

describe("POST /api/polls/:pid/vote", () => {
  it("401s a guest vote attempt", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    expect((await vote(poll._id, null, ["c1"])).status).toBe(401);
  });

  async function voterWithPermissions(permissions: string[]) {
    const email = `granted${users++}@example.com`;
    const forged = await forgeSession(ctx, email);
    await ctx.db.updateTable("user").set({ permissions }).where("id", "=", forged.userId).execute();
    return { cookie: forged.cookie, email };
  }

  it("403s a logged-in voter without the Vote on Polls grant, and counts nothing", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    const { cookie } = await voterWithPermissions(["View Polls", "Create Poll"]);
    const res = await vote(poll._id, cookie, ["c1"]);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "You do not have permission to vote.", code: "no-vote-permission" });
    expect((await readLiveCounts(ctx.cache, [poll._id])).get(poll._id)?.voteCount ?? 0).toBe(0);
  });

  it("never applies the grant to a guest, who is still refused only for not being logged in", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    const res = await vote(poll._id, null, ["c1"]);
    expect(res.status).toBe(401);
    expect(res.body.code).toBeUndefined();
  });

  it("carries the missing grant to the card through the personal tab's overlay", async () => {
    const poll = makePoll({ title: "Bookmarked, cannot vote" });
    await polls(ctx).insertOne(poll);
    const { cookie, email } = await voterWithPermissions(["View Polls"]);
    await addBookmark(ctx, email, poll._id, 200);
    const res = await request(ctx.app).post("/api/tabs/watching/refresh").set("Cookie", cookie).send({});
    expect(res.status).toBe(200);
    expect(res.body.cards[poll._id].overlay.voteBlockedReason).toBe("You do not have permission to vote.");
  });

  it("answers at once with the live counts, the status, the voter's choices and the vote floor", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    const { cookie } = await voter();
    const res = await vote(poll._id, cookie, ["c1"]);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "recorded",
      voteCount: 1,
      choiceCounts: { c1: 1 },
      countsVersion: 1,
      myChoiceIds: ["c1"],
      nextRefreshMs: 100
    });
    expect(await ctx.db.selectFrom("votes").selectAll().where("poll_id", "=", poll._id).execute()).toHaveLength(0);
    expect(await drain()).toBe(1);
    const rows = await ctx.db.selectFrom("votes").selectAll().where("poll_id", "=", poll._id).execute();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.choice_ids).toEqual(["c1"]);
  });

  it("a second account's vote moves the counts and the sequence", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    const a = await voter();
    const b = await voter();
    await vote(poll._id, a.cookie, ["c1"], "10.0.1.1");
    const res = await vote(poll._id, b.cookie, ["c2"], "10.0.1.2");
    expect(res.body).toMatchObject({ voteCount: 2, choiceCounts: { c1: 1, c2: 1 }, countsVersion: 2 });
  });

  it("400s an empty, unknown or over-long selection", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    const { cookie } = await voter();
    expect((await vote(poll._id, cookie, [])).status).toBe(400);
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    expect((await vote(poll._id, cookie, ["nope"])).status).toBe(400);
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    const two = await vote(poll._id, cookie, ["c1", "c2"]);
    expect(two.status).toBe(400);
    expect(two.body.error).toMatch(/one choice/);
  });

  it("refuses a vote in every state that is not effectively OPEN", async () => {
    // EDITING-POLL-AVAILABLE R1: a poll under edit serves its stashed state, so a
    // poll stashed from OPEN votes exactly like an OPEN one, and one stashed from
    // CLOSED refuses like a CLOSED one — never with POLL_EDITING.
    for (const pollState of POLL_STATES) {
      const poll = makePoll({ pollState, pollStateBeforeEditUpdate: pollState === "EDITING" ? "OPEN" : null });
      await polls(ctx).insertOne(poll);
      const { cookie } = await voter();
      const res = await vote(poll._id, cookie, ["c1"]);
      if (pollState === "OPEN" || pollState === "EDITING") expect(res.status, pollState).toBe(200);
      else expect(res.status, pollState).toBe(409);
      if (pollState === "CLOSED") expect(res.body.code).toBeUndefined();
    }
    const stashedClosed = makePoll({ pollState: "EDITING", pollStateBeforeEditUpdate: "CLOSED" });
    await polls(ctx).insertOne(stashedClosed);
    const { cookie } = await voter();
    const closed = await vote(stashedClosed._id, cookie, ["c1"]);
    expect(closed.status).toBe(409);
    expect(closed.body.code).toBeUndefined();
  });

  it("multi-choice counts both choices against one participant", async () => {
    const poll = makePoll({ choiceMode: "Multiple-Choice Poll" });
    await polls(ctx).insertOne(poll);
    const { cookie } = await voter();
    const res = await vote(poll._id, cookie, ["c1", "c2"]);
    expect(res.body).toMatchObject({ voteCount: 1, choiceCounts: { c1: 1, c2: 1 } });
  });

  it("a Dynamic-Vote re-vote supersedes the first, even while the first is still queued", async () => {
    const poll = makePoll({ voteMutability: "Dynamic-Vote Poll" });
    await polls(ctx).insertOne(poll);
    const { cookie } = await voter();
    expect((await vote(poll._id, cookie, ["c1"])).body).toMatchObject({ voteCount: 1, choiceCounts: { c1: 1 } });
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    const changed = await vote(poll._id, cookie, ["c2"]);
    expect(changed.body).toMatchObject({ voteCount: 1, choiceCounts: { c1: 0, c2: 1 }, myChoiceIds: ["c2"] });
    await drain();
    const rows = await ctx.db.selectFrom("votes").selectAll().where("poll_id", "=", poll._id).execute();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.choice_ids).toEqual(["c2"]);
  });

  it("removes a Dynamic-Vote vote on an empty selection, refuses a second removal, and lets the voter vote again", async () => {
    const poll = makePoll({ voteMutability: "Dynamic-Vote Poll" });
    await polls(ctx).insertOne(poll);
    const { cookie } = await voter();
    expect((await vote(poll._id, cookie, ["c1"])).status).toBe(200);
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    const removed = await vote(poll._id, cookie, []);
    expect(removed.status).toBe(200);
    expect(removed.body).toMatchObject({ status: "recorded", voteCount: 0, choiceCounts: { c1: 0 }, myChoiceIds: [] });
    await drain();
    const rows = await ctx.db.selectFrom("votes").selectAll().where("poll_id", "=", poll._id).execute();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.choice_ids).toEqual([]);
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    const again = await vote(poll._id, cookie, []);
    expect(again.status).toBe(400);
    expect(again.body.error).toBe("Select at least one choice.");
    expect((await readLiveCounts(ctx.cache, [poll._id])).get(poll._id)).toMatchObject({ voteCount: 0, choiceCounts: { c1: 0 } });
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    const revote = await vote(poll._id, cookie, ["c2"]);
    expect(revote.status).toBe(200);
    expect(revote.body).toMatchObject({ voteCount: 1, choiceCounts: { c1: 0, c2: 1 }, myChoiceIds: ["c2"] });
  });

  it("refuses an empty selection where it removes nothing: a Final-Vote vote, no vote held, an unused invitation", async () => {
    const finalPoll = makePoll({ voteMutability: "Final-Vote Poll" });
    await polls(ctx).insertOne(finalPoll);
    const { cookie } = await voter();
    expect((await vote(finalPoll._id, cookie, ["c1"])).status).toBe(200);
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    const finalRemoval = await vote(finalPoll._id, cookie, []);
    expect(finalRemoval.status).toBe(409);
    expect(finalRemoval.body.error).toBe("You have already voted on this poll and cannot change your vote.");
    expect((await readLiveCounts(ctx.cache, [finalPoll._id])).get(finalPoll._id)).toMatchObject({ voteCount: 1, choiceCounts: { c1: 1 }, countsVersion: 1 });

    const dynamicPoll = makePoll({ voteMutability: "Dynamic-Vote Poll" });
    await polls(ctx).insertOne(dynamicPoll);
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    const noVote = await vote(dynamicPoll._id, cookie, []);
    expect(noVote.status).toBe(400);
    expect(noVote.body.error).toBe("Select at least one choice.");

    const invitation = makePoll({
      voteMutability: "Dynamic-Vote Poll",
      pollVisibility: "Private Poll",
      pollSharingMode: "Invitation Only",
      invitedVoterList: ["placeholder@example.com"],
      currentVotes: [{ emailAddress: "placeholder@example.com", userName: "", choiceIds: [], votedAt: null }]
    });
    await polls(ctx).insertOne(invitation);
    const invitee = await voter("placeholder@example.com");
    const placeholder = await vote(invitation._id, invitee.cookie, []);
    expect(placeholder.status).toBe(400);
    expect(placeholder.body.error).toBe("Select at least one choice.");
  });

  it("puts a removal through the same gates as a vote: the poll's state, the ban, the vote floor and the address cap", async () => {
    const poll = makePoll({ voteMutability: "Dynamic-Vote Poll" });
    await polls(ctx).insertOne(poll);
    const { cookie } = await voter();
    expect((await vote(poll._id, cookie, ["c1"])).status).toBe(200);
    const removal = async () => {
      for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
      return vote(poll._id, cookie, []);
    };
    // A poll under edit serves its stashed state; without one it reads as never launched.
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "EDITING", pollStateBeforeEditUpdate: null } });
    const editing = await removal();
    expect(editing.status).toBe(409);
    expect(editing.body).toEqual({ error: "This poll is not open for voting." });
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "CLOSED" } });
    const closed = await removal();
    expect(closed.status).toBe(409);
    expect(closed.body.error).toBe("This poll is not open for voting.");
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "WAITING TO OPEN" } });
    const waiting = await removal();
    expect(waiting.status).toBe(409);
    expect(waiting.body.error).toBe("This poll has not started yet.");
    expect((await readLiveCounts(ctx.cache, [poll._id])).get(poll._id)).toMatchObject({ voteCount: 1, choiceCounts: { c1: 1 } });
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "EDITING", pollStateBeforeEditUpdate: "OPEN" } });
    const stashedOpen = await removal();
    expect(stashedOpen.status).toBe(200);
    expect(stashedOpen.body).toMatchObject({ voteCount: 0, choiceCounts: { c1: 0 }, myChoiceIds: [] });
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "OPEN", pollStateBeforeEditUpdate: null } });
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    expect((await vote(poll._id, cookie, ["c1"])).status).toBe(200);

    const bannedPoll = makePoll({ voteMutability: "Dynamic-Vote Poll", bannedVoterList: ["banned-removal@example.com"] });
    await polls(ctx).insertOne(bannedPoll);
    const banned = await voter("banned-removal@example.com");
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    const refused = await vote(bannedPoll._id, banned.cookie, []);
    expect(refused.status).toBe(403);
    expect(refused.body.error).toMatch(/removed from this poll/);

    // The removal spends the session's vote floor, so a vote right after it waits.
    const removed = await removal();
    expect(removed.status).toBe(200);
    const tooSoon = await vote(poll._id, cookie, ["c2"]);
    expect(tooSoon.status).toBe(429);
    expect(tooSoon.body.retryAfterMs).toBeGreaterThan(0);
    expect(tooSoon.body.nextRefreshMs).toBe(100);
  });

  it("counts a removal toward the per-address cap", async () => {
    const small = await startTestContext({ ENV_MAX_VOTES_PER_IP_PER_MINUTE: "2", ENV_MIN_VOTE_REFRESH_INTERVAL: "1" });
    try {
      const poll = makePoll({ voteMutability: "Dynamic-Vote Poll" });
      await polls(small).insertOne(poll);
      const { cookie } = await forgeSession(small, "capped-remover@example.com");
      const send = (choiceIds: string[]) =>
        request(small.app).post(`/api/polls/${poll._id}/vote`).set("X-Forwarded-For", "203.0.113.78").set("Cookie", cookie).send({ choiceIds });
      expect((await send(["c1"])).status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect((await send([])).status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 5));
      const capped = await send(["c2"]);
      expect(capped.status).toBe(429);
      expect(capped.body.code).toBe("ip-vote-cap");
    } finally {
      await small.stop();
    }
  });

  it("409s a second vote on a Final-Vote Poll, inside the lag window and after it", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    const { cookie } = await voter();
    expect((await vote(poll._id, cookie, ["c1"])).status).toBe(200);
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    const queuedAgain = await vote(poll._id, cookie, ["c2"]);
    expect(queuedAgain.status).toBe(409);
    expect(queuedAgain.body.error).toMatch(/already voted/);
    await drain();
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    expect((await vote(poll._id, cookie, ["c2"])).status).toBe(409);
    expect((await readLiveCounts(ctx.cache, [poll._id])).get(poll._id)).toMatchObject({ voteCount: 1 });
  });

  it("allows a re-vote on a Final-Vote Poll when the prior record is an unused invitation", async () => {
    const poll = makePoll({
      pollVisibility: "Private Poll",
      pollSharingMode: "Invitation Only",
      invitedVoterList: ["invited@example.com"],
      currentVotes: [{ emailAddress: "invited@example.com", userName: "", choiceIds: [], votedAt: null }]
    });
    await polls(ctx).insertOne(poll);
    const { cookie } = await voter("invited@example.com");
    expect((await vote(poll._id, cookie, ["c1"])).status).toBe(200);
    await drain();
    const row = await ctx.db.selectFrom("votes").selectAll().where("poll_id", "=", poll._id).executeTakeFirstOrThrow();
    expect(row.choice_ids).toEqual(["c1"]);
  });

  it("refuses a banned voter, an uninvited voter, and a private poll that is full, with the established messages", async () => {
    const poll = makePoll({
      pollVisibility: "Private Poll",
      pollSharingMode: "Invitation Only",
      invitedVoterList: ["in1@example.com", "in2@example.com", "in3@example.com", "in4@example.com", "banned@example.com"],
      bannedVoterList: ["banned@example.com"],
      voterCountLimit: 2
    });
    await polls(ctx).insertOne(poll);
    const banned = await voter("banned@example.com");
    expect((await vote(poll._id, banned.cookie, ["c1"])).body.error).toMatch(/removed from this poll/);
    const stranger = await voter("stranger@example.com");
    expect((await vote(poll._id, stranger.cookie, ["c1"])).body.error).toMatch(/not invited/);
    const in1 = await voter("in1@example.com");
    const in2 = await voter("in2@example.com");
    const in3 = await voter("in3@example.com");
    expect((await vote(poll._id, in1.cookie, ["c1"], "10.0.2.1")).status).toBe(200);
    expect((await vote(poll._id, in2.cookie, ["c1"], "10.0.2.2")).status).toBe(200);
    const full = await vote(poll._id, in3.cookie, ["c1"], "10.0.2.3");
    expect(full.status).toBe(403);
    expect(full.body.error).toMatch(/maximum number of votes/);
  });

  it("lets the creator of an Invitation Only poll vote without an invitation, outside the voter limit", async () => {
    const creator = await forgeSession(ctx, "uninvited-creator@example.com");
    const poll = makePoll({
      pollVisibility: "Private Poll",
      pollSharingMode: "Invitation Only",
      invitedVoterList: ["guest1@example.com", "guest2@example.com"],
      voterCountLimit: 2
    });
    await polls(ctx).insertOne(poll);
    await ctx.db.updateTable("polls").set({ created_by_id: creator.userId }).where("id", "=", poll._id).execute();
    expect((await vote(poll._id, creator.cookie, ["c1"], "10.0.4.1")).status).toBe(200);
    await drain();
    const guest1 = await voter("guest1@example.com");
    const guest2 = await voter("guest2@example.com");
    expect((await vote(poll._id, guest1.cookie, ["c1"], "10.0.4.2")).status).toBe(200);
    expect((await vote(poll._id, guest2.cookie, ["c1"], "10.0.4.3")).status).toBe(200);
    await drain();
    const voted = await ctx.db.selectFrom("votes").select("email").where("poll_id", "=", poll._id).where("email", "=", "uninvited-creator@example.com").execute();
    expect(voted).toHaveLength(1);
    expect(await ctx.db.selectFrom("poll_invitations").select("email").where("poll_id", "=", poll._id).execute()).toHaveLength(2);
  });

  it("a blank limit on a private poll binds at the configured default", async () => {
    const poll = makePoll({ pollVisibility: "Private Poll", voterCountLimit: null });
    await polls(ctx).insertOne(poll);
    for (let i = 0; i < 3; i++) {
      const { cookie } = await voter();
      expect((await vote(poll._id, cookie, ["c1"], `10.0.3.${i}`)).status).toBe(200);
    }
    const { cookie } = await voter();
    expect((await vote(poll._id, cookie, ["c1"], "10.0.3.9")).status).toBe(403);
  });

  it("applies one vote floor per session across polls and never stretches it", async () => {
    const a = makePoll();
    const b = makePoll();
    await polls(ctx).insertMany([a, b]);
    await ctx.cache.set("k:live", "4");
    await ctx.cache.set("k:refresh", "4");
    ctx.budget.forgetMultipliers();
    const { cookie } = await voter();
    const first = await vote(a._id, cookie, ["c1"]);
    expect(first.status).toBe(200);
    expect(first.body.nextRefreshMs).toBe(100);
    const second = await vote(b._id, cookie, ["c1"]);
    expect(second.status).toBe(429);
    expect(second.body.nextRefreshMs).toBe(100);
    await ctx.cache.del("k:live");
    await ctx.cache.del("k:refresh");
    ctx.budget.forgetMultipliers();
  });

  it("caps votes per address per minute, counting the excess for the operator", async () => {
    const small = await startTestContext({ ENV_MAX_VOTES_PER_IP_PER_MINUTE: "2", ENV_MIN_VOTE_REFRESH_INTERVAL: "100" });
    try {
      const poll = makePoll();
      await polls(small).insertOne(poll);
      const results: number[] = [];
      for (let i = 0; i < 3; i++) {
        const { cookie } = await forgeSession(small, `ip${i}@example.com`);
        results.push((await request(small.app).post(`/api/polls/${poll._id}/vote`).set("X-Forwarded-For", "203.0.113.77").set("Cookie", cookie).send({ choiceIds: ["c1"] })).status);
      }
      expect(results).toEqual([200, 200, 429]);
      const health = await request(small.app).get("/healthz");
      expect(health.body.abuse.ipVoteCap).toBe(1);
    } finally {
      await small.stop();
    }
  });
});
