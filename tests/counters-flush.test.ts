import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import {
  COUNTS_KEY,
  DIRTY_KEY,
  countVote,
  counterWriter,
  flushDirty,
  readLiveCounts,
  rebuildIfMissing,
  reconcile,
  trendBucketKey
} from "../src/polls/counters.js";
import { recordVote, updatePoll } from "../src/polls/store.js";

let ctx: TestContext;

const COUNTER_COLUMNS = ["vote_count", "choice_counts", "last_vote_at", "counts_version"];

/** Every UPDATE of polls that touches a counter column, tagged with the code path that ran it. */
const counterWrites: { sql: string; writer: string | undefined }[] = [];

beforeAll(async () => {
  ctx = await startTestContext();
  const seen = new Set<string>();
  const original = ctx.queries;
  // The harness log carries no caller; sample the writer context at log time instead.
  Object.defineProperty(original, "push", {
    value: (statement: string) => {
      if (/update "?polls"?/i.test(statement) && COUNTER_COLUMNS.some((c) => statement.includes(c)) && !seen.has(statement + counterWriter.getStore())) {
        counterWrites.push({ sql: statement, writer: counterWriter.getStore() });
      }
      return Array.prototype.push.call(original, statement);
    }
  });
});

afterAll(async () => {
  await ctx.stop();
});

afterEach(() => {
  counterWrites.length = 0;
});

async function rowCounters(pid: string) {
  return ctx.db
    .selectFrom("polls")
    .select(["vote_count", "choice_counts", "last_vote_at", "counts_version"])
    .where("id", "=", pid)
    .executeTakeFirstOrThrow();
}

describe("live counters", () => {
  it("countVote increments the choice, the total, the sequence and the trend bucket, and marks the poll dirty", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    const at = new Date();
    const first = await countVote(ctx.cache, poll._id, ["c1"], [], true, at);
    expect(first).toEqual({ voteCount: 1, choiceCounts: { c1: 1 }, countsVersion: 1 });
    const second = await countVote(ctx.cache, poll._id, ["c2"], [], true, at);
    expect(second).toEqual({ voteCount: 2, choiceCounts: { c1: 1, c2: 1 }, countsVersion: 2 });
    const moved = await countVote(ctx.cache, poll._id, ["c1"], ["c2"], false, at);
    expect(moved).toEqual({ voteCount: 2, choiceCounts: { c1: 2, c2: 0 }, countsVersion: 3 });
    expect(await ctx.cache.hgetall(trendBucketKey(at))).toEqual({ [poll._id]: "2" });
    expect(await ctx.cache.sismember(DIRTY_KEY, poll._id)).toBe(true);
    expect((await readLiveCounts(ctx.cache, [poll._id])).get(poll._id)?.countsVersion).toBe(3);
  });

  it("flushDirty writes the four row columns, the outbox, and swaps the dirty set", async () => {
    await flushDirty(ctx);
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    await countVote(ctx.cache, poll._id, ["c1"], [], true);
    await countVote(ctx.cache, poll._id, ["c1"], [], true);
    const before = new Date();
    expect(await flushDirty(ctx, before)).toBe(1);
    const row = await rowCounters(poll._id);
    expect(row.vote_count).toBe(2);
    expect(row.choice_counts).toEqual({ c1: 2 });
    expect(row.counts_version).toBe(2);
    expect(new Date(row.last_vote_at!).getTime()).toBe(before.getTime());
    const outbox = await ctx.db.selectFrom("search_outbox").selectAll().where("poll_id", "=", poll._id).executeTakeFirst();
    expect(outbox).toMatchObject({ reason: "counters", version: 2 });
    expect(await ctx.cache.smembers(DIRTY_KEY)).toEqual([]);
    expect(await flushDirty(ctx)).toBe(0);
    expect(counterWrites.every((w) => w.writer === "flush")).toBe(true);
  });

  it("a content change keeps the outbox reason at content over counters", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    await updatePoll(ctx, poll._id, { title: "Renamed" });
    await countVote(ctx.cache, poll._id, ["c1"], [], true);
    await flushDirty(ctx);
    const outbox = await ctx.db.selectFrom("search_outbox").selectAll().where("poll_id", "=", poll._id).executeTakeFirstOrThrow();
    expect(outbox.reason).toBe("content");
  });

  it("reconcile recomputes drifted counters from the votes table and bumps the sequence", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    const at = new Date();
    await recordVote(ctx, poll._id, { emailAddress: "a@example.com", userName: "a", choiceIds: ["c1"], votedAt: at });
    await recordVote(ctx, poll._id, { emailAddress: "b@example.com", userName: "b", choiceIds: ["c2"], votedAt: at });
    await ctx.cache.hset(COUNTS_KEY(poll._id), { c1: "9", total: "9", seq: "9" });
    expect(await reconcile(ctx, [poll._id])).toBe(1);
    const live = (await readLiveCounts(ctx.cache, [poll._id])).get(poll._id);
    expect(live).toEqual({ voteCount: 2, choiceCounts: { c1: 1, c2: 1 }, countsVersion: 10 });
    const row = await rowCounters(poll._id);
    expect(row.vote_count).toBe(2);
    expect(row.choice_counts).toEqual({ c1: 1, c2: 1 });
    expect(row.counts_version).toBe(10);
    expect(counterWrites.every((w) => w.writer === "reconcile")).toBe(true);
  });

  it("rebuildIfMissing seeds the hash from the flushed row and leaves an existing hash alone", async () => {
    const poll = makePoll({
      currentVotes: [{ emailAddress: "a@example.com", userName: "a", choiceIds: ["c2"], votedAt: new Date() }]
    });
    await polls(ctx).insertOne(poll);
    expect(await rebuildIfMissing(ctx, poll._id)).toEqual({ voteCount: 1, choiceCounts: { c2: 1 }, countsVersion: 0 });
    await countVote(ctx.cache, poll._id, ["c1"], [], true);
    expect((await rebuildIfMissing(ctx, poll._id))?.countsVersion).toBe(1);
    expect(await rebuildIfMissing(ctx, "no-such-poll")).toBeNull();
  });
});

describe("write ownership of the row counters", () => {
  it("only the flush and the reconcile write vote_count, choice_counts, last_vote_at or counts_version", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    await updatePoll(ctx, poll._id, { title: "A content write", pollState: "CLOSED" });
    await updatePoll(ctx, poll._id, { invitedVoterList: ["x@example.com"], bannedVoterList: ["y@example.com"] });
    await recordVote(ctx, poll._id, { emailAddress: "a@example.com", userName: "a", choiceIds: ["c1"], votedAt: new Date() });
    await countVote(ctx.cache, poll._id, ["c1"], [], true);
    await flushDirty(ctx);
    await reconcile(ctx, [poll._id]);
    const unowned = counterWrites.filter((w) => w.writer !== "flush" && w.writer !== "reconcile");
    expect(unowned).toEqual([]);
    expect(counterWrites.some((w) => w.writer === "flush")).toBe(true);
    expect(counterWrites.some((w) => w.writer === "reconcile")).toBe(true);
  });
});
