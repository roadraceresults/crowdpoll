import request from "supertest";
import { sql } from "kysely";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { clearPolls, forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll } from "./helpers/poll-fixtures.js";
import { insertPoll, recordVote } from "../src/polls/store.js";
import { castVote } from "../src/votes/votePath.js";

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

const remove = (cookie: string, body: Record<string, unknown> = { confirm: "DELETE" }, origin = "http://127.0.0.1") =>
  request(ctx.app).delete("/api/me").set("Host", "127.0.0.1").set("Origin", origin).set("Cookie", cookie).send(body);

async function count(table: "votes" | "vote_history" | "bookmarks" | "user_polls" | "poll_invitations" | "poll_bans", email: string) {
  const row = await ctx.db.selectFrom(table).select((eb) => eb.fn.countAll<string>().as("n")).where("email", "=", email).executeTakeFirstOrThrow();
  return Number(row.n);
}

describe("DELETE /api/me (A8, R8)", () => {
  it("refuses a foreign Origin and a missing confirmation", async () => {
    const { cookie } = await forgeSession(ctx, "keep-me@example.org");
    expect((await remove(cookie, { confirm: "DELETE" }, "https://evil.example")).status).toBe(403);
    const unconfirmed = await remove(cookie, { confirm: "delete" });
    expect(unconfirmed.status).toBe(400);
    expect(unconfirmed.body).toEqual({ error: "Type DELETE to confirm." });
    expect(await ctx.db.selectFrom("user").select("id").where("email", "=", "keep-me@example.org").executeTakeFirst()).toBeDefined();
  });

  it("deletes what is the user's, anonymizes their votes elsewhere and keeps bans", async () => {
    const leaver = "leaver@example.org";
    const { cookie, userId } = await forgeSession(ctx, leaver);
    expect((await request(ctx.app).get("/api/me").set("Cookie", cookie)).status).toBe(200);
    const owner = await forgeSession(ctx, "owner@example.org");

    const own = makePoll({ title: "Mine" });
    await insertPoll(ctx, own, { id: userId, name: "leaver", email: leaver });
    await recordVote(ctx, own._id, { emailAddress: "owner@example.org", userName: "owner", choiceIds: ["c1"], votedAt: new Date() });

    const theirs = makePoll({ title: "Theirs", invitedVoterList: [leaver], bannedVoterList: [] });
    const barred = makePoll({ title: "Barred", bannedVoterList: [leaver] });
    await insertPoll(ctx, theirs, { id: owner.userId, name: "owner", email: "owner@example.org" });
    await insertPoll(ctx, barred, { id: owner.userId, name: "owner", email: "owner@example.org" });
    await recordVote(ctx, theirs._id, { emailAddress: leaver, userName: "leaver", choiceIds: ["c2"], votedAt: new Date() });
    await ctx.db.insertInto("bookmarks").values({ email: leaver, poll_id: theirs._id }).execute();
    await ctx.db.insertInto("verification").values({
      id: "link-1", identifier: "hash-1", value: JSON.stringify({ email: leaver }), expiresAt: new Date(Date.now() + 60_000), createdAt: new Date(), updatedAt: new Date()
    }).execute();
    await sql`truncate table "search_outbox"`.execute(ctx.db);
    const before = await ctx.db.selectFrom("polls").select(["choice_counts", "vote_count", "content_version"]).where("id", "=", theirs._id).executeTakeFirstOrThrow();

    const log = vi.spyOn(console, "log");
    const res = await remove(cookie);
    const lines = log.mock.calls.map((c) => c.map(String).join(" "));
    log.mockRestore();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ redirect: "/" });
    expect(String(res.headers["set-cookie"])).toMatch(/session_token=;/);

    expect(await ctx.db.selectFrom("user").select("id").where("id", "=", userId).executeTakeFirst()).toBeUndefined();
    expect(await ctx.db.selectFrom("session").select("id").where("userId", "=", userId).executeTakeFirst()).toBeUndefined();
    expect(await ctx.db.selectFrom("verification").select("id").where("id", "=", "link-1").executeTakeFirst()).toBeUndefined();
    expect(await ctx.db.selectFrom("polls").select("id").where("id", "=", own._id).executeTakeFirst()).toBeUndefined();
    expect(await ctx.db.selectFrom("vote_history").select("id").where("poll_id", "=", own._id).executeTakeFirst()).toBeUndefined();
    expect((await ctx.db.selectFrom("search_outbox").select("poll_id").execute()).map((r) => r.poll_id)).toContain(own._id);
    for (const table of ["votes", "vote_history", "bookmarks", "user_polls", "poll_invitations"] as const) {
      expect(await count(table, leaver), table).toBe(0);
    }
    expect(await count("poll_bans", leaver)).toBe(1);

    const anonymized = await ctx.db.selectFrom("votes").selectAll().where("poll_id", "=", theirs._id).execute();
    expect(anonymized).toHaveLength(1);
    expect(anonymized[0]!.email).toMatch(/^deleted-[0-9a-f-]+@deleted\.invalid$/);
    expect(anonymized[0]!.user_name).toBe("Deleted user");
    expect(anonymized[0]!.choice_ids).toEqual(["c2"]);
    const history = await ctx.db.selectFrom("vote_history").select("email").where("poll_id", "=", theirs._id).execute();
    expect(history.map((h) => h.email)).toEqual([anonymized[0]!.email]);
    const after = await ctx.db.selectFrom("polls").select(["choice_counts", "vote_count", "content_version"]).where("id", "=", theirs._id).executeTakeFirstOrThrow();
    expect(after.choice_counts).toEqual(before.choice_counts);
    expect(after.vote_count).toEqual(before.vote_count);
    expect(Number(after.content_version)).toBeGreaterThan(Number(before.content_version));

    expect((await request(ctx.app).get("/api/me").set("Cookie", cookie)).status).toBe(401);
    const mail = ctx.sent.at(-1)!;
    expect(mail.to).toBe(leaver);
    expect(mail.subject).toBe("Your CrowdPoll account was deleted");
    expect(lines.some((l) => l === "[account] Deleted account for l•••@example.org: 1 poll(s) deleted, 1 vote(s) anonymized")).toBe(true);
    expect(lines.join("\n")).not.toContain(leaver);
  });

  it("removes invitations and invitation history spelled differently from the account (R10, R15)", async () => {
    const { cookie } = await forgeSession(ctx, "jdoe@gmail.com");
    const owner = await forgeSession(ctx, "owner-key@example.org");
    const poll = makePoll({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: ["j.doe@gmail.com", "other@example.org"] });
    await insertPoll(ctx, poll, { id: owner.userId, name: "owner", email: "owner-key@example.org" });
    await ctx.db.updateTable("poll_invitations").set({ email: "j.doe@gmail.com" }).where("email", "=", "jdoe@gmail.com").execute();
    await ctx.db.insertInto("invitation_history").values({ poll_id: poll._id, email_key: "jdoe@gmail.com", sent_at: new Date(), reminded_at: null }).execute();

    expect((await remove(cookie)).status).toBe(200);

    const left = await ctx.db.selectFrom("poll_invitations").select("email").where("poll_id", "=", poll._id).execute();
    expect(left.map((r) => r.email)).toEqual(["other@example.org"]);
    const row = await ctx.db.selectFrom("polls").select("invited_count").where("id", "=", poll._id).executeTakeFirstOrThrow();
    expect(row.invited_count).toBe(1);
    expect(await ctx.db.selectFrom("invitation_history").selectAll().execute()).toEqual([]);
  });

  it("changes nothing when the deletion fails, and says so", async () => {
    const stuck = "stuck@example.org";
    const { cookie, userId } = await forgeSession(ctx, stuck);
    const own = makePoll();
    await insertPoll(ctx, own, { id: userId, name: "stuck", email: stuck });
    await sql`create or replace function refuse_delete() returns trigger language plpgsql as $$ begin raise exception 'refused'; end $$`.execute(ctx.db);
    await sql`create trigger refuse_stuck before delete on "user" for each row when (old.email = 'stuck@example.org') execute function refuse_delete()`.execute(ctx.db);
    try {
      const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const res = await remove(cookie);
      error.mockRestore();
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Your account could not be deleted. Nothing was changed; please try again." });
      expect(await ctx.db.selectFrom("polls").select("id").where("id", "=", own._id).executeTakeFirst()).toBeDefined();
      expect((await request(ctx.app).get("/api/me").set("Cookie", cookie)).status).toBe(200);
    } finally {
      await sql`drop trigger if exists refuse_stuck on "user"`.execute(ctx.db);
    }
  });

  it("never stores a vote queued before the deletion (U2)", async () => {
    const quick = "quick@example.org";
    const { cookie } = await forgeSession(ctx, quick);
    const owner = await forgeSession(ctx, "quick-owner@example.org");
    const poll = makePoll();
    await insertPoll(ctx, poll, { id: owner.userId, name: "o", email: "quick-owner@example.org" });
    await castVote(ctx, { sessionId: "s-quick", email: quick, userName: "quick", ip: "10.40.0.1", pid: poll._id, choiceIds: ["c1"] });

    expect((await remove(cookie)).status).toBe(200);
    await ctx.consumer.runOnce();

    expect(await count("votes", quick)).toBe(0);
    expect(await count("vote_history", quick)).toBe(0);
    const row = await ctx.db.selectFrom("polls").select("vote_count").where("id", "=", poll._id).executeTakeFirstOrThrow();
    expect(Number(row.vote_count)).toBe(0);
  });
});
