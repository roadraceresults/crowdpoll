import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { castVote, QUEUE_LAG, VOTED_KEY } from "../src/votes/votePath.js";
import { createConsumer, writeBatch } from "../src/votes/consumer.js";
import { VOTE_GROUP, VOTE_STREAM } from "../src/votes/queue.js";
import { readLiveCounts } from "../src/polls/counters.js";
import { VoteError } from "../src/polls/service.js";

let ctx: TestContext;
let n = 0;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_VOTE_QUEUE_LAG_NOTICE: "200", ENV_VOTE_BATCH_SIZE: "3" });
});

afterAll(async () => {
  await ctx.stop();
});

beforeEach(async () => {
  await polls(ctx).deleteMany({});
  for (const key of await ctx.cache.scan("votes-ip:*")) await ctx.cache.del(key);
  await ctx.consumer.runOnce();
});

function cast(pid: string, email: string, choiceIds: string[], extra: Partial<Parameters<typeof castVote>[1]> = {}) {
  n += 1;
  return castVote(ctx, { sessionId: `s-${email}`, email, userName: email.split("@")[0]!, ip: `10.9.0.${n % 250}`, pid, choiceIds, ...extra });
}

describe("the vote path", () => {
  it("counts, enqueues and remembers the vote without touching the votes table", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    const before = ctx.queries.length;
    const outcome = await cast(poll._id, "a@example.com", ["c1"]);
    expect(outcome).toMatchObject({ status: "recorded", voteCount: 1, choiceCounts: { c1: 1 }, countsVersion: 1, myChoiceIds: ["c1"] });
    const writes = ctx.queries.slice(before).filter((q) => /^(insert|update|delete)/i.test(q));
    expect(writes).toEqual([]);
    expect(await ctx.cache.sismember(VOTED_KEY("s-a@example.com"), poll._id)).toBe(true);
    expect(await ctx.cache.xpendingCount(VOTE_STREAM, VOTE_GROUP)).toBe(0);
    expect(await ctx.consumer.runOnce()).toBe(1);
  });

  it("validates from the cache: a second lookup of the same poll and rosters reads no rows", async () => {
    const poll = makePoll({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: ["a@example.com", "b@example.com"] });
    await polls(ctx).insertOne(poll);
    await cast(poll._id, "a@example.com", ["c1"]);
    const before = ctx.queries.length;
    await expect(cast(poll._id, "a@example.com", ["c2"])).rejects.toMatchObject({ status: 409 });
    expect(ctx.queries.slice(before).filter((q) => /from "poll_invitations"|from "poll_bans"|from "polls"/.test(q))).toEqual([]);
  });

  it("rebuilds the voted set from the votes table on a cache miss", async () => {
    const poll = makePoll({ currentVotes: [{ emailAddress: "old@example.com", userName: "", choiceIds: ["c1"], votedAt: new Date() }] });
    await polls(ctx).insertOne(poll);
    await expect(cast(poll._id, "old@example.com", ["c2"])).rejects.toMatchObject({ status: 409 });
    expect(await ctx.cache.sismember(VOTED_KEY("s-old@example.com"), poll._id)).toBe(true);
  });

  it("reports queued while the consumer lags past the notice", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    await ctx.cache.set(QUEUE_LAG, "250", 5000);
    expect((await cast(poll._id, "lag@example.com", ["c1"])).status).toBe("queued");
    await ctx.cache.set(QUEUE_LAG, "50", 5000);
    expect((await cast(poll._id, "lag2@example.com", ["c1"])).status).toBe("recorded");
  });

  it("refuses with VoteError and the established messages", async () => {
    const poll = makePoll({ pollState: "CLOSED" });
    await polls(ctx).insertOne(poll);
    await expect(cast(poll._id, "c@example.com", ["c1"])).rejects.toBeInstanceOf(VoteError);
    await expect(cast("missing", "c@example.com", ["c1"])).rejects.toMatchObject({ status: 404 });
  });
});

describe("the consumer", () => {
  it("writes batches idempotently: a repeated Final-Vote entry is ignored, a Dynamic-Vote one replaces", async () => {
    const finalPoll = makePoll();
    const dynamicPoll = makePoll({ voteMutability: "Dynamic-Vote Poll" });
    await polls(ctx).insertMany([finalPoll, dynamicPoll]);
    const at = new Date();
    const later = new Date(at.getTime() + 1000);
    await writeBatch(ctx.db, [
      { pid: finalPoll._id, email: "f@example.com", userName: "f", choiceIds: ["c1"], votedAt: at, voteMutability: "Final-Vote Poll" },
      { pid: dynamicPoll._id, email: "d@example.com", userName: "d", choiceIds: ["c1"], votedAt: at, voteMutability: "Dynamic-Vote Poll" }
    ]);
    await writeBatch(ctx.db, [
      { pid: finalPoll._id, email: "f@example.com", userName: "f", choiceIds: ["c2"], votedAt: later, voteMutability: "Final-Vote Poll" },
      { pid: dynamicPoll._id, email: "d@example.com", userName: "d", choiceIds: ["c2"], votedAt: later, voteMutability: "Dynamic-Vote Poll" }
    ]);
    const finalRow = await ctx.db.selectFrom("votes").selectAll().where("poll_id", "=", finalPoll._id).executeTakeFirstOrThrow();
    const dynamicRow = await ctx.db.selectFrom("votes").selectAll().where("poll_id", "=", dynamicPoll._id).executeTakeFirstOrThrow();
    expect(finalRow.choice_ids).toEqual(["c1"]);
    expect(dynamicRow.choice_ids).toEqual(["c2"]);
    const history = await ctx.db.selectFrom("vote_history").selectAll().where("poll_id", "in", [finalPoll._id, dynamicPoll._id]).execute();
    expect(history).toHaveLength(4);
    const relations = await ctx.db.selectFrom("user_polls").selectAll().where("relation", "=", "voted").execute();
    expect(relations.map((r) => r.email).sort()).toEqual(["d@example.com", "f@example.com"]);
  });

  it("drains the stream in batches, acks, and reclaims an entry a dead consumer left pending", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    const lengthBefore = await ctx.cache.xlen(VOTE_STREAM);
    for (const who of ["a", "b", "c", "d"]) await cast(poll._id, `${who}@example.com`, ["c1"]);
    expect(await ctx.cache.xlen(VOTE_STREAM)).toBe(lengthBefore + 4);

    const stuck = await ctx.cache.xreadgroup(VOTE_STREAM, VOTE_GROUP, "dead-instance", 1, 0);
    expect(stuck).toHaveLength(1);
    expect(await ctx.consumer.runOnce()).toBe(3);
    expect(await ctx.db.selectFrom("votes").selectAll().where("poll_id", "=", poll._id).execute()).toHaveLength(3);
    expect(await ctx.cache.xpendingCount(VOTE_STREAM, VOTE_GROUP)).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(await ctx.consumer.runOnce()).toBe(1);
    expect(await ctx.db.selectFrom("votes").selectAll().where("poll_id", "=", poll._id).execute()).toHaveLength(4);
    expect(await ctx.cache.xpendingCount(VOTE_STREAM, VOTE_GROUP)).toBe(0);
  });

  it("stop() finishes and acknowledges the batch in hand before resolving", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    const own = createConsumer({ db: ctx.db, cache: ctx.cache, config: ctx.config, consumerName: "stopping" });
    own.start();
    for (const who of ["x", "y"]) await cast(poll._id, `${who}@example.com`, ["c2"]);
    await new Promise((resolve) => setTimeout(resolve, 150));
    await own.stop();
    expect(await ctx.cache.xpendingCount(VOTE_STREAM, VOTE_GROUP)).toBe(0);
    const rows = await ctx.db.selectFrom("votes").selectAll().where("poll_id", "=", poll._id).execute();
    expect(rows).toHaveLength(2);
    expect((await readLiveCounts(ctx.cache, [poll._id])).get(poll._id)?.voteCount).toBe(2);
  });
});
