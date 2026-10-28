import { sql } from "kysely";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { fullScansOfVoteHistory, planNodes, planNodesOfSql, seqScansOfPolls } from "./helpers/explain.js";
import { searchPasses } from "../src/search/pgSearch.js";
import {
  crashedClaimQuery,
  hasVoteHistoryQuery,
  nextForApprovalQuery,
  pollsEverVotedQuery,
  scheduleCandidatesQuery,
  staleEditingQuery,
  titlesLikeQuery,
  type PollState
} from "../src/polls/store.js";
import { personalTabQuery } from "../src/polls/userPolls.js";
import { newestQuery } from "../src/trending/recompute.js";

let ctx: TestContext;

const STATES: PollState[] = ["INITIALIZED", "EDITING", "AWAITING APPROVAL", "REJECTED", "WAITING TO OPEN", "OPEN", "CLOSED", "ARCHIVED"];

beforeAll(async () => {
  ctx = await startTestContext();
  for (let i = 0; i < 200; i++) {
    await polls(ctx).insertOne(
      makePoll({
        title: `Seeded poll ${i}`,
        pollState: STATES[i % STATES.length]!,
        pollVisibility: i % 5 === 0 ? "Private Poll" : "Public Poll",
        pollSharingMode: i % 5 === 0 ? "Invitation Only" : "Anyone With The Link",
        invitedVoterList: i % 5 === 0 ? ["guard@example.com"] : [],
        startAt: i % 3 === 0 ? new Date(Date.now() + 3_600_000) : null,
        endAt: i % 4 === 0 ? new Date(Date.now() - 3_600_000) : null,
        pollApprovalTimestamp: i % 7 === 0 ? new Date(Date.now() - 60_000) : null,
        pollEditUpdateHeartbeatTimestamp: i % 8 === 1 ? new Date(Date.now() - 60_000) : null
      })
    );
  }
  await sql`analyze polls`.execute(ctx.db);
  const seeded = await ctx.db.selectFrom("polls").select("id").execute();
  const history = seeded.slice(0, 150).flatMap((p) => Array.from({ length: 40 }, (_, k) => ({ poll_id: p.id, email: `v${k}@example.com`, user_name: "", choice_ids: ["c1"], voted_at: new Date() })));
  await ctx.db.insertInto("vote_history").values(history).execute();
  await sql`analyze vote_history`.execute(ctx.db);
  await sql`set enable_seqscan = off`.execute(ctx.db);
});

afterAll(async () => {
  await ctx.stop();
});

/** Named so a failure says which listing lost its index. */
function listings(): Record<string, Parameters<typeof planNodes>[0]> {
  const now = new Date();
  return {
    "stale editing sessions": staleEditingQuery(ctx.db, now),
    "schedule candidates": scheduleCandidatesQuery(ctx.db, now),
    "crashed screening claims": crashedClaimQuery(ctx.db, now),
    "next poll for screening": nextForApprovalQuery(ctx.db),
    "duplicate titles": titlesLikeQuery(ctx.db, "Seeded poll 1"),
    "Your Polls": personalTabQuery(ctx.db, "guard@example.com", 200, undefined, ["created"]),
    "Shared With You": personalTabQuery(ctx.db, "guard@example.com", 200, "Private Poll", ["invited", "linked"]),
    "Your Votes": personalTabQuery(ctx.db, "guard@example.com", 200, undefined, ["voted"]),
    "Watching": personalTabQuery(ctx.db, "guard@example.com", 200, undefined, ["bookmarked"]),
    "Newest": newestQuery(ctx.db, 50)
  };
}

describe("vote history is probed, never scanned", () => {
  it("which-of-these-polls-were-ever-voted-on and has-history are index probes with no parallel plan", async () => {
    const pids = (await ctx.db.selectFrom("polls").select("id").limit(200).execute()).map((p) => p.id);
    const offenders: string[] = [];
    const cases = {
      "polls ever voted (admin list)": pollsEverVotedQuery(ctx.db, pids),
      "has vote history (one poll)": hasVoteHistoryQuery(ctx.db, pids[0]!)
    };
    // With the planner free to choose: a shape that matches most history rows is
    // answered by a sequential (and, at scale, parallel) scan even though the index exists.
    await sql`set enable_seqscan = on`.execute(ctx.db);
    try {
      for (const [name, query] of Object.entries(cases)) {
        if (fullScansOfVoteHistory(await planNodes(query)).length > 0) offenders.push(name);
      }
    } finally {
      await sql`set enable_seqscan = off`.execute(ctx.db);
    }
    expect(offenders).toEqual([]);
  });
});

describe("no listing reads the whole polls table", () => {
  it("every home search pass is answered from an index", async () => {
    const passes = searchPasses("seeded poll", 4);
    const offenders: string[] = [];
    for (const [name, pass] of Object.entries(passes)) {
      if (!pass) continue;
      const nodes = await planNodesOfSql(ctx.db, pass);
      if (seqScansOfPolls(nodes).length > 0) offenders.push(name);
    }
    expect(offenders).toEqual([]);
  });

  it("the guard itself detects a predicate no index serves", async () => {
    const unindexed = ctx.db.selectFrom("polls").selectAll().where("subtitle", "=", "nothing");
    expect(seqScansOfPolls(await planNodes(unindexed))).toHaveLength(1);
  });

  it("every listing query is answered from an index with sequential scans disabled", async () => {
    const offenders: string[] = [];
    for (const [name, query] of Object.entries(listings())) {
      const nodes = await planNodes(query);
      if (seqScansOfPolls(nodes).length > 0) offenders.push(name);
    }
    expect(offenders).toEqual([]);
  });
});
