/**
 * The line graph's hourly tally on a real database: the vote writers keep it
 * equal to one computed afresh from vote_history (the migration backfill and
 * the populate rebuild), a superseded vote that arrives late changes nothing,
 * account deletion keeps the counts, and a deleted poll takes its rows along.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { writeBatch } from "../src/votes/consumer.js";
import { recordVote, deletePoll } from "../src/polls/store.js";
import { rebuildLineGraphTally, TALLY_VOTERS } from "../src/polls/lineGraphTally.js";
import { deleteAccount } from "../src/legal/deleteAccount.js";

const HOUR = 3_600_000;
const BASE = Date.UTC(2026, 9, 20, 9, 0, 0);
const at = (hours: number) => new Date(BASE + hours * HOUR);

let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  await ctx.stop();
});
beforeEach(async () => {
  await polls(ctx).deleteMany({});
});

async function seedPoll(choiceMode = "Single-Choice Poll"): Promise<string> {
  const poll = makePoll({
    _id: randomUUID(),
    choiceMode: choiceMode as never,
    voteMutability: "Dynamic-Vote Poll",
    choices: [
      { id: "c1", label: "One", position: 0 },
      { id: "c2", label: "Two", position: 1 },
      { id: "c3", label: "Three", position: 2 }
    ]
  });
  await polls(ctx).insertOne(poll);
  return poll._id;
}

const dynamic = (pid: string, email: string, choiceIds: string[], votedAt: Date) => ({
  pid,
  email,
  userName: "",
  choiceIds,
  votedAt,
  voteMutability: "Dynamic-Vote Poll"
});

async function tallyOf(pid: string): Promise<string[]> {
  const rows = await ctx.db
    .selectFrom("line_graph_tally")
    .select(["hour", "choice_id", "delta"])
    .where("poll_id", "=", pid)
    .where("delta", "<>", 0)
    .orderBy("hour")
    .orderBy("choice_id")
    .execute();
  return rows.map((r) => `${r.hour.toISOString()} ${r.choice_id === TALLY_VOTERS ? "voters" : r.choice_id} ${r.delta}`).sort();
}

async function selectionsOf(pid: string): Promise<string[]> {
  const rows = await ctx.db
    .selectFrom("line_graph_selection")
    .select(["email", "choice_ids"])
    .where("poll_id", "=", pid)
    .orderBy("email")
    .execute();
  return rows.map((r) => `${r.email} ${r.choice_ids.join(",")}`);
}

describe("kept by the vote writers", () => {
  it("equals the tally computed afresh from vote_history", async () => {
    const pid = await seedPoll("Multiple-Choice Poll");
    await writeBatch(ctx.db, [
      dynamic(pid, "a@example.com", ["c1"], at(0.25)),
      dynamic(pid, "b@example.com", ["c1", "c2"], at(0.5)),
      dynamic(pid, "a@example.com", ["c2"], at(0.75)),
      dynamic(pid, "c@example.com", ["c3"], at(1.5))
    ]);
    await writeBatch(ctx.db, [
      dynamic(pid, "b@example.com", [], at(2.2)),
      dynamic(pid, "a@example.com", ["c3", "c1"], at(3)),
      dynamic(pid, "d@example.com", ["c2"], at(26))
    ]);
    await recordVote(ctx, pid, { emailAddress: "e@example.com", userName: "", choiceIds: ["c1"], votedAt: at(30) });

    const incremental = await tallyOf(pid);
    const latest = await selectionsOf(pid);
    expect(incremental.length).toBeGreaterThan(0);

    await rebuildLineGraphTally(ctx.db, pid);
    expect(await tallyOf(pid)).toEqual(incremental);
    expect(await selectionsOf(pid)).toEqual(latest);
  });

  it("records a change in the hour it happened, replacing the voter's previous selection", async () => {
    const pid = await seedPoll();
    await writeBatch(ctx.db, [dynamic(pid, "a@example.com", ["c1"], at(0.5))]);
    await writeBatch(ctx.db, [dynamic(pid, "a@example.com", ["c2"], at(2.5))]);
    expect(await tallyOf(pid)).toEqual([
      `${at(1).toISOString()} c1 1`,
      `${at(1).toISOString()} voters 1`,
      `${at(3).toISOString()} c1 -1`,
      `${at(3).toISOString()} c2 1`
    ]);
  });

  it("ignores a vote older than the voter's latest one, which it would not have replaced", async () => {
    const pid = await seedPoll();
    await writeBatch(ctx.db, [dynamic(pid, "a@example.com", ["c2"], at(5))]);
    const before = await tallyOf(pid);
    await writeBatch(ctx.db, [dynamic(pid, "a@example.com", ["c1"], at(1))]);
    expect(await tallyOf(pid)).toEqual(before);
    expect(await selectionsOf(pid)).toEqual(["a@example.com c2"]);
  });
});

describe("rebuilt and carried along", () => {
  it("rebuilds one poll after history rows are deleted, as a populate rerun does", async () => {
    const pid = await seedPoll();
    await writeBatch(ctx.db, [dynamic(pid, "test_1@crowdpolltest.test", ["c1"], at(1)), dynamic(pid, "real@example.com", ["c2"], at(2))]);
    await ctx.db.deleteFrom("vote_history").where("poll_id", "=", pid).where("email", "=", "test_1@crowdpolltest.test").execute();
    await rebuildLineGraphTally(ctx.db, pid);
    expect(await tallyOf(pid)).toEqual([`${at(2).toISOString()} c2 1`, `${at(2).toISOString()} voters 1`]);
    expect(await selectionsOf(pid)).toEqual(["real@example.com c2"]);
  });

  it("keeps the counts and anonymizes the selection when the voter deletes their account", async () => {
    const pid = await seedPoll();
    const leaver = "leaver@example.org";
    const { userId } = await forgeSession(ctx, leaver);
    await recordVote(ctx, pid, { emailAddress: leaver, userName: "leaver", choiceIds: ["c1"], votedAt: at(1) });
    const before = await tallyOf(pid);

    await deleteAccount({ db: ctx.db, cache: ctx.cache }, { id: userId, email: leaver });

    expect(await tallyOf(pid)).toEqual(before);
    const history = await ctx.db.selectFrom("vote_history").select("email").where("poll_id", "=", pid).execute();
    expect(await selectionsOf(pid)).toEqual([`${history[0]!.email} c1`]);
    expect(history[0]!.email).toMatch(/@deleted\.invalid$/);
  });

  it("goes with its poll", async () => {
    const pid = await seedPoll();
    await writeBatch(ctx.db, [dynamic(pid, "a@example.com", ["c1"], at(1))]);
    await deletePoll(ctx, pid);
    expect(await tallyOf(pid)).toEqual([]);
    expect(await selectionsOf(pid)).toEqual([]);
  });
});
