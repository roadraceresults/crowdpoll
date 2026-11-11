import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { clearPolls, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { down, up } from "../src/db/migrations/020-invitation-message.js";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestContext();
});

afterAll(async () => {
  await ctx.stop();
});

async function columns() {
  return sql<{ column_name: string; column_default: string | null; is_nullable: string }>`
    select "column_name", "column_default", "is_nullable" from information_schema.columns
    where "table_name" = 'polls' and "column_name" = 'invitation_message'`
    .execute(ctx.db)
    .then((r) => r.rows);
}

describe("migration 020: invitation message", () => {
  it("adds a not-null column that starts as '' for existing polls, and down removes it", async () => {
    await clearPolls(ctx);
    const poll = makePoll();
    await polls(ctx).insertOne(poll);

    await down(ctx.db);
    expect(await columns()).toEqual([]);

    await up(ctx.db);
    const [column] = await columns();
    expect(column!.is_nullable).toBe("NO");
    expect(column!.column_default).toBe("''::text");
    const row = await sql<{ invitation_message: string }>`select "invitation_message" from "polls" where "id" = ${poll._id}`
      .execute(ctx.db)
      .then((r) => r.rows[0]!);
    expect(row.invitation_message).toBe("");
  });

  it("leaves the search column alone", async () => {
    const definition = await sql<{ generation_expression: string | null }>`
      select "generation_expression" from information_schema.columns where "table_name" = 'polls' and "column_name" = 'search'`
      .execute(ctx.db)
      .then((r) => r.rows[0]?.generation_expression ?? "");
    expect(definition).not.toContain("invitation_message");
  });
});
