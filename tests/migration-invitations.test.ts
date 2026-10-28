import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { clearPolls, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { down, up } from "../src/db/migrations/010-invitations.js";
import type { PollState } from "../src/polls/store.js";

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

async function tableExists(table: string): Promise<boolean> {
  const result = await sql<{ n: number }>`
    select count(*)::int as n from information_schema.tables where table_name = ${table}`.execute(ctx.db);
  return result.rows[0]!.n > 0;
}

async function indexExists(name: string): Promise<boolean> {
  const result = await sql<{ n: number }>`select count(*)::int as n from pg_indexes where indexname = ${name}`.execute(ctx.db);
  return result.rows[0]!.n > 0;
}

const INVITATION_COLUMNS = ["added_at", "sent_at", "reminded_at", "send_failed_at", "accepted_at"];

describe("migration 010: invitations", () => {
  it("adds the invitation columns, index, time zone and tables; down removes them", async () => {
    await down(ctx.db);
    for (const c of INVITATION_COLUMNS) expect(await columns("poll_invitations")).not.toContain(c);
    expect(await columns("polls")).not.toContain("time_zone");
    expect(await tableExists("invitation_emails")).toBe(false);
    expect(await tableExists("invitation_history")).toBe(false);
    expect(await indexExists("poll_invitations_email_key")).toBe(false);

    await up(ctx.db);
    for (const c of INVITATION_COLUMNS) expect(await columns("poll_invitations")).toContain(c);
    expect(await columns("polls")).toContain("time_zone");
    expect(await columns("invitation_emails")).toEqual(expect.arrayContaining(["creator_id", "sent_at"]));
    expect(await columns("invitation_history")).toEqual(
      expect.arrayContaining(["poll_id", "email_key", "sent_at", "reminded_at"])
    );
    expect(await indexExists("poll_invitations_email_key")).toBe(true);
    expect(await indexExists("invitation_emails_creator_sent")).toBe(true);
  });

  it("marks existing invitations sent on polls past launch and leaves the others pending", async () => {
    const states: PollState[] = [
      "OPEN", "EDITING", "CLOSED", "ARCHIVED",
      "INITIALIZED", "AWAITING APPROVAL", "REJECTED", "WAITING TO OPEN"
    ];
    const made = states.map((pollState) =>
      makePoll({
        pollState,
        pollVisibility: "Private Poll",
        pollSharingMode: "Invitation Only",
        invitedVoterList: [`${pollState.toLowerCase().replace(/ /g, "-")}@example.org`]
      })
    );
    await polls(ctx).insertMany(made);

    await down(ctx.db);
    await up(ctx.db);

    const rows = await ctx.db
      .selectFrom("poll_invitations")
      .innerJoin("polls", "polls.id", "poll_invitations.poll_id")
      .select(["polls.poll_state", "poll_invitations.sent_at", "poll_invitations.added_at"])
      .execute();
    const sent = Object.fromEntries(rows.map((r) => [r.poll_state, r.sent_at === null ? null : new Date(r.sent_at).getTime()]));
    for (const r of rows) {
      const launched = ["OPEN", "EDITING", "CLOSED", "ARCHIVED"].includes(r.poll_state);
      expect(sent[r.poll_state], r.poll_state).toBe(launched ? new Date(r.added_at).getTime() : null);
    }
  });

  it("removes a poll's history with the poll", async () => {
    const poll = makePoll({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" });
    await polls(ctx).insertOne(poll);
    await ctx.db.insertInto("invitation_history").values({ poll_id: poll._id, email_key: "a@example.org", sent_at: new Date(), reminded_at: null }).execute();
    await ctx.db.deleteFrom("polls").where("id", "=", poll._id).execute();
    expect(await ctx.db.selectFrom("invitation_history").selectAll().execute()).toEqual([]);
  });
});
