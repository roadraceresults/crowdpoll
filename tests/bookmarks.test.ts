import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { addBookmark, removeExpiredBookmarks } from "../src/polls/bookmarks.js";
import { upsertRelation } from "../src/polls/userPolls.js";

let ctx: TestContext;
let cookie: string;
const me = "marks@example.com";

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MAX_BOOKMARKS_PER_USER: "2", ENV_BOOKMARK_EXPIRY_MONTHS: "6", ENV_MIN_MANUAL_REFRESH_INTERVAL: "1" });
  cookie = (await forgeSession(ctx, me)).cookie;
});

afterAll(async () => {
  await ctx.stop();
});

beforeEach(async () => {
  await polls(ctx).deleteMany({});
});

const add = (pid: string) => request(ctx.app).post(`/api/polls/${pid}/bookmark`).set("Cookie", cookie).send();
const drop = (pid: string) => request(ctx.app).delete(`/api/polls/${pid}/bookmark`).set("Cookie", cookie).send();
const tab = (name: "your-polls" | "shared-with-you" | "your-votes" | "watching") => request(ctx.app).post(`/api/tabs/${name}/refresh`).set("Cookie", cookie).send({});
const bookmarks = () => ctx.db.selectFrom("bookmarks").selectAll().where("email", "=", me).execute();

describe("bookmarks", () => {
  it("refuses adding a bookmark without the View Polls grant, but never refuses removing one", async () => {
    const poll = makePoll({ title: "Kept bookmark" });
    await polls(ctx).insertOne(poll);
    const email = "no-view-marks@example.com";
    const forged = await forgeSession(ctx, email);
    const send = (method: "post" | "delete") =>
      request(ctx.app)[method](`/api/polls/${poll._id}/bookmark`).set("Cookie", forged.cookie).send();
    expect((await send("post")).status).toBe(200);

    await ctx.db.updateTable("user").set({ permissions: ["Vote on Polls", "Create Poll"] }).where("id", "=", forged.userId).execute();
    await ctx.sessions.forgetUserSessions(forged.userId);
    const refused = await send("post");
    expect(refused.status).toBe(403);
    expect(refused.body).toEqual({ error: "You do not have permission to view polls.", code: "no-view-permission" });
    const removed = await send("delete");
    expect(removed.status).toBe(200);
    expect(removed.body).toMatchObject({ bookmarked: false });
  });

  it("adds and removes a bookmark, writing the relation the personal tabs read, and requires a session", async () => {
    const pub = makePoll({ title: "Public" });
    const priv = makePoll({ title: "Private", pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: [me] });
    await polls(ctx).insertMany([pub, priv]);
    const added = await add(pub._id);
    expect(added.status).toBe(200);
    expect(added.body).toMatchObject({ bookmarked: true });
    expect(typeof added.body.nextRefreshMs).toBe("number");
    expect((await add(priv._id)).status).toBe(200);
    expect((await add(pub._id)).status).toBe(200);
    expect(await bookmarks()).toHaveLength(2);

    expect((await tab("watching")).body.order).toEqual([priv._id, pub._id]);
    expect((await tab("watching")).body.cards[pub._id].overlay.bookmarked).toBe(true);

    const removed = await drop(pub._id);
    expect(removed.body).toMatchObject({ bookmarked: false });
    expect((await tab("watching")).body.order).toEqual([priv._id]);
    expect((await request(ctx.app).post(`/api/polls/${pub._id}/bookmark`).send()).status).toBe(401);
    expect((await add("no-such-poll")).status).toBe(404);
  });

  it("refuses the bookmark past the cap with 409", async () => {
    const [a, b, c] = [makePoll(), makePoll(), makePoll()];
    await polls(ctx).insertMany([a, b, c]);
    expect((await add(a._id)).status).toBe(200);
    expect((await add(b._id)).status).toBe(200);
    const capped = await add(c._id);
    expect(capped.status).toBe(409);
    expect(capped.body.error).toBe("bookmark-cap");
    expect(capped.body.limit).toBe(2);
    await drop(a._id);
    expect((await add(c._id)).status).toBe(200);
  });

  it("the daily removal drops bookmarks by each rule, silently", async () => {
    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setUTCMonth(sevenMonthsAgo.getUTCMonth() - 7);
    const archived = makePoll({ title: "archived", pollState: "ARCHIVED" });
    const oldClosed = makePoll({ title: "old closed", pollState: "CLOSED", endAt: sevenMonthsAgo });
    const freshClosed = makePoll({ title: "fresh closed", pollState: "CLOSED", endAt: new Date() });
    const neverVoted = makePoll({ title: "never voted", startAt: sevenMonthsAgo, createdAt: sevenMonthsAgo });
    const active = makePoll({ title: "active", startAt: sevenMonthsAgo, createdAt: sevenMonthsAgo, currentVotes: [{ emailAddress: "x@example.com", userName: "", choiceIds: ["c1"], votedAt: new Date() }] });
    await polls(ctx).insertMany([archived, oldClosed, freshClosed, neverVoted, active]);
    await ctx.db.updateTable("polls").set({ closed_at: sevenMonthsAgo }).where("id", "=", oldClosed._id).execute();
    for (const p of [archived, oldClosed, freshClosed, neverVoted, active]) {
      await ctx.db.insertInto("bookmarks").values({ email: me, poll_id: p._id }).execute();
      await ctx.db.insertInto("user_polls").values({ email: me, poll_id: p._id, relation: "bookmarked", updated_at: new Date() }).execute();
    }
    const sentBefore = ctx.sent.length;
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await removeExpiredBookmarks(ctx.db, 6)).toBe(3);
    log.mockRestore();
    const kept = (await bookmarks()).map((b) => b.poll_id).sort();
    expect(kept).toEqual([freshClosed._id, active._id].sort());
    const relations = await ctx.db.selectFrom("user_polls").select("poll_id").where("email", "=", me).where("relation", "=", "bookmarked").execute();
    expect(relations.map((r) => r.poll_id).sort()).toEqual(kept);
    expect(ctx.sent.length).toBe(sentBefore);
  });

  it("removes only the watch of a long-closed private poll, leaving its link and invitation relations", async () => {
    const poll = makePoll({ title: "Old shared", pollVisibility: "Private Poll", pollState: "CLOSED", invitedVoterList: [me] });
    await polls(ctx).insertOne(poll);
    await ctx.db.updateTable("polls").set({ closed_at: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000) }).where("id", "=", poll._id).execute();
    await upsertRelation(ctx.db, me, poll._id, "linked");
    await addBookmark(ctx.db, me, poll._id, 200);

    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(await removeExpiredBookmarks(ctx.db, 6)).toBe(1);
    log.mockRestore();

    expect(await bookmarks()).toEqual([]);
    const relations = await ctx.db.selectFrom("user_polls").select("relation").where("email", "=", me).where("poll_id", "=", poll._id).execute();
    expect(relations.map((r) => r.relation).sort()).toEqual(["invited", "linked"]);
    expect((await tab("shared-with-you")).body.order).toEqual([poll._id]);
  });
});
