import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { clearPolls, forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls, voteHistory } from "./helpers/poll-fixtures.js";
import { down, up } from "../src/db/migrations/009-terms-and-privacy.js";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestContext();
});

afterAll(async () => {
  await ctx.stop();
});

beforeEach(async () => {
  await clearPolls(ctx);
});

async function columns(table: string): Promise<string[]> {
  const result = await sql<{ column_name: string }>`
    select column_name from information_schema.columns where table_name = ${table}`.execute(ctx.db);
  return result.rows.map((r) => r.column_name);
}

describe("migration 009: terms and privacy", () => {
  it("adds nullable terms columns, backfills ever_voted, clears session IPs, and down drops the columns", async () => {
    const { userId } = await forgeSession(ctx, "migrating@example.org");
    const voted = makePoll();
    const unvoted = makePoll();
    await polls(ctx).insertMany([voted, unvoted]);
    await voteHistory(ctx).insertOne({ pid: voted._id, emailAddress: "v@example.org", userName: "v", choiceIds: ["c1"], votedAt: new Date() });

    await down(ctx.db);
    expect(await columns("user")).not.toContain("terms_version");
    expect(await columns("user")).not.toContain("terms_accepted_at");
    expect(await columns("polls")).not.toContain("ever_voted");
    await sql`update "session" set "ipAddress" = '203.0.113.42', "userAgent" = 'Test/1.0' where "userId" = ${userId}`.execute(ctx.db);

    await up(ctx.db);

    const user = await sql<{ terms_version: string | null; terms_accepted_at: Date | null }>`
      select terms_version, terms_accepted_at from "user" where id = ${userId}`.execute(ctx.db);
    expect(user.rows[0]).toEqual({ terms_version: null, terms_accepted_at: null });
    const session = await sql<{ ipAddress: string | null; userAgent: string | null }>`
      select "ipAddress", "userAgent" from "session" where "userId" = ${userId}`.execute(ctx.db);
    expect(session.rows[0]).toEqual({ ipAddress: null, userAgent: null });
    const flags = await ctx.db.selectFrom("polls").select(["id", "ever_voted"]).execute();
    expect(Object.fromEntries(flags.map((f) => [f.id, f.ever_voted]))).toEqual({ [voted._id]: true, [unvoted._id]: false });
  });
});
