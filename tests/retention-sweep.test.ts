import { sql } from "kysely";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { clearPolls, forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls, voteHistory } from "./helpers/poll-fixtures.js";
import { retentionSweep } from "../src/polls/sweeps.js";
import { hasVoteHistory, pollsEverVoted } from "../src/polls/store.js";
import { partitionName } from "../src/db/partitions.js";

let ctx: TestContext;
const NOW = new Date(Date.UTC(2026, 10, 15, 12));
const monthsAgo = (n: number) => new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth() - n, 10));

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  await ctx.stop();
});
beforeEach(async () => {
  await clearPolls(ctx);
});

async function partitionExists(month: Date): Promise<boolean> {
  const result = await sql<{ n: string }>`select count(*) as n from pg_class where relname = ${partitionName(month)}`.execute(ctx.db);
  return Number(result.rows[0]!.n) === 1;
}

describe("retentionSweep (FR-020, R9)", () => {
  it("removes only expired rows and only vote history older than 12 months, logging the counts", async () => {
    const live = await forgeSession(ctx, "live@example.org");
    const gone = await forgeSession(ctx, "gone@example.org");
    await ctx.db.updateTable("session").set({ expiresAt: new Date(NOW.getTime() - 1000) }).where("userId", "=", gone.userId).execute();
    await ctx.db.updateTable("session").set({ expiresAt: new Date(NOW.getTime() + 86_400_000) }).where("userId", "=", live.userId).execute();
    const stamp = { createdAt: NOW, updatedAt: NOW };
    await ctx.db.insertInto("verification").values([
      { id: "v-old", identifier: "a", value: "{}", expiresAt: new Date(NOW.getTime() - 1000), ...stamp },
      { id: "v-new", identifier: "b", value: "{}", expiresAt: new Date(NOW.getTime() + 60_000), ...stamp }
    ]).execute();
    await ctx.db.insertInto("email_change_requests").values([
      { user_id: live.userId, new_email: "x@example.org", old_email: "live@example.org", token_hash: "old", created_at: new Date(NOW.getTime() - 16 * 60_000) },
      { user_id: live.userId, new_email: "y@example.org", old_email: "live@example.org", token_hash: "new", created_at: new Date(NOW.getTime() - 60_000) }
    ]).execute();
    await ctx.db.insertInto("rateLimit").values([
      { id: "r-old", key: "old-key", count: 1, lastRequest: NOW.getTime() - 16 * 60_000 },
      { id: "r-new", key: "new-key", count: 1, lastRequest: NOW.getTime() - 60_000 }
    ]).execute();

    const old = makePoll();
    const recent = makePoll();
    await polls(ctx).insertMany([old, recent]);
    await voteHistory(ctx).insertOne({ pid: old._id, emailAddress: "o@example.org", userName: "o", choiceIds: ["c1"], votedAt: monthsAgo(13) });
    await voteHistory(ctx).insertOne({ pid: recent._id, emailAddress: "r@example.org", userName: "r", choiceIds: ["c1"], votedAt: monthsAgo(11) });
    await sql`update polls set ever_voted = true where id in (${old._id}, ${recent._id})`.execute(ctx.db);

    const log = vi.spyOn(console, "log");
    await retentionSweep(ctx, ctx.config, NOW);
    const lines = log.mock.calls.map((c) => c.map(String).join(" "));
    log.mockRestore();

    expect((await ctx.db.selectFrom("session").select("userId").execute()).map((s) => s.userId)).toEqual([live.userId]);
    expect((await ctx.db.selectFrom("verification").select("id").execute()).map((v) => v.id)).toEqual(["v-new"]);
    expect((await ctx.db.selectFrom("email_change_requests").select("token_hash").execute()).map((e) => e.token_hash)).toEqual(["new"]);
    expect((await ctx.db.selectFrom("rateLimit").select("id").where("id", "in", ["r-old", "r-new"]).execute()).map((r) => r.id)).toEqual(["r-new"]);
    expect(await partitionExists(monthsAgo(13))).toBe(false);
    expect(await partitionExists(monthsAgo(11))).toBe(true);
    expect(lines).toContain("[retention] Removed 1 session(s), 1 link(s), 1 email change(s), 1 rate-limit record(s), 0 invitation send record(s); dropped 1 vote-history partition(s)");

    expect(await hasVoteHistory(ctx.db, old._id)).toBe(true);
    expect(await pollsEverVoted(ctx.db, [old._id, recent._id])).toEqual(new Set([old._id, recent._id]));
  });

  it("sets ever_voted on the first recorded vote", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    expect(await hasVoteHistory(ctx.db, poll._id)).toBe(false);
    await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "first@example.org", userName: "f", choiceIds: ["c1"], votedAt: new Date() });
    expect(await hasVoteHistory(ctx.db, poll._id)).toBe(true);
  });
});
