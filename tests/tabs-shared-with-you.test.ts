import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { updatePoll, recordVote } from "../src/polls/store.js";
import { addBookmark } from "../src/polls/bookmarks.js";
import { upsertRelation } from "../src/polls/userPolls.js";

let ctx: TestContext;
let cookie: string;
let userId: string;
const me = "shared-reader@example.com";

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MAX_POLLS_SEARCH_RESULTS: "3", ENV_MAX_NEWEST_POLLS: "3", ENV_MIN_MANUAL_REFRESH_INTERVAL: "300" });
  const session = await forgeSession(ctx, me);
  cookie = session.cookie;
  userId = session.userId;
});
afterAll(async () => {
  await ctx.stop();
});
beforeEach(async () => {
  await polls(ctx).deleteMany({});
});

const clearFloors = async () => {
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
};
const tab = async (name: string) => {
  await clearFloors();
  return request(ctx.app).post(`/api/tabs/${name}/refresh`).set("Cookie", cookie).send({});
};
const shared = async (): Promise<string[]> => (await tab("shared-with-you")).body.order ?? [];

const privatePoll = (overrides: Parameters<typeof makePoll>[0] = {}) =>
  makePoll({ pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link", ...overrides });
const invitationOnly = (overrides: Parameters<typeof makePoll>[0] = {}) =>
  privatePoll({ pollSharingMode: "Invitation Only", invitedVoterList: [me], ...overrides });
const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000);

describe("Shared With You", () => {
  it("lists an Invitation Only poll the user is invited to without any link being opened", async () => {
    const poll = invitationOnly();
    await polls(ctx).insertOne(poll);
    expect(await shared()).toEqual([poll._id]);
  });

  it("lists a link-only poll once its link was opened, and moves it to the top when it is opened again", async () => {
    const [older, newer] = [privatePoll(), privatePoll()];
    await polls(ctx).insertMany([older, newer]);
    await upsertRelation(ctx.db, me, older._id, "linked", minutesAgo(10));
    await upsertRelation(ctx.db, me, newer._id, "linked", minutesAgo(5));
    expect(await shared()).toEqual([newer._id, older._id]);
    await upsertRelation(ctx.db, me, older._id, "linked", minutesAgo(1));
    expect(await shared()).toEqual([older._id, newer._id]);
  });

  it("never lists a public poll, even with a link row, and never lists a link-only poll the user has no relation to", async () => {
    const publicPoll = makePoll();
    const stranger = privatePoll();
    await polls(ctx).insertMany([publicPoll, stranger]);
    await upsertRelation(ctx.db, me, publicPoll._id, "linked");
    expect(await shared()).toEqual([]);
  });

  it("keeps a poll listed after the user votes in it or watches it, and the other tabs list it too", async () => {
    const poll = privatePoll();
    await polls(ctx).insertOne(poll);
    await upsertRelation(ctx.db, me, poll._id, "linked");
    await recordVote(ctx.db, poll._id, { emailAddress: me, userName: "", choiceIds: ["c1"], votedAt: new Date() });
    await addBookmark(ctx.db, me, poll._id, 200);
    expect(await shared()).toEqual([poll._id]);
    expect((await tab("your-votes")).body.order).toEqual([poll._id]);
    expect((await tab("watching")).body.order).toEqual([poll._id]);
  });

  it("drops a poll when the user is uninvited, including a stale invitation row, and brings it back first when re-invited", async () => {
    const poll = invitationOnly();
    await polls(ctx).insertOne(poll);
    expect(await shared()).toEqual([poll._id]);

    await updatePoll(ctx, poll._id, { invitedVoterList: ["someone@example.com"] });
    expect(await shared()).toEqual([]);
    expect(await ctx.db.selectFrom("user_polls").select("relation").where("poll_id", "=", poll._id).where("email", "=", me).execute()).toEqual([]);

    await upsertRelation(ctx.db, me, poll._id, "invited", minutesAgo(30));
    expect(await shared()).toEqual([]);

    const other = invitationOnly();
    await polls(ctx).insertOne(other);
    await updatePoll(ctx, poll._id, { invitedVoterList: [me] });
    expect(await shared()).toEqual([poll._id, other._id]);
  });

  it("drops a viewed poll that becomes Invitation Only without the user, and brings it back when switched again", async () => {
    const poll = privatePoll();
    await polls(ctx).insertOne(poll);
    await upsertRelation(ctx.db, me, poll._id, "linked");
    await updatePoll(ctx, poll._id, { pollSharingMode: "Invitation Only", invitedVoterList: [] });
    expect(await shared()).toEqual([]);
    await updatePoll(ctx, poll._id, { pollSharingMode: "Anyone With The Link" });
    expect(await shared()).toEqual([poll._id]);
  });

  it("keeps a banned user's card, which offers no vote", async () => {
    const poll = privatePoll({ bannedVoterList: [me] });
    await polls(ctx).insertOne(poll);
    await upsertRelation(ctx.db, me, poll._id, "linked");
    const res = await tab("shared-with-you");
    expect(res.body.cards[poll._id].overlay.voteBlockedReason).toMatch(/removed from this poll/);
  });

  it("excludes the user's own polls", async () => {
    const own = privatePoll();
    await polls(ctx).insertOne(own);
    await ctx.db.updateTable("polls").set({ created_by_id: userId }).where("id", "=", own._id).execute();
    await upsertRelation(ctx.db, me, own._id, "linked");
    expect(await shared()).toEqual([]);
  });

  it("caps the list at the configured size, newest first", async () => {
    const list = Array.from({ length: 5 }, () => privatePoll());
    await polls(ctx).insertMany(list);
    for (const [i, poll] of list.entries()) await upsertRelation(ctx.db, me, poll._id, "linked", minutesAgo(50 - i));
    const order = await shared();
    expect(order).toEqual([list[4]!._id, list[3]!._id, list[2]!._id]);
  });

  it("drops a poll when it is deleted", async () => {
    const poll = privatePoll();
    await polls(ctx).insertOne(poll);
    await upsertRelation(ctx.db, me, poll._id, "linked");
    expect(await shared()).toEqual([poll._id]);
    await ctx.db.deleteFrom("polls").where("id", "=", poll._id).execute();
    expect(await shared()).toEqual([]);
  });

  it("lists a poll closed longer ago than the watch expiry", async () => {
    const poll = privatePoll({ pollState: "CLOSED" });
    await polls(ctx).insertOne(poll);
    await ctx.db.updateTable("polls").set({ closed_at: minutesAgo(60 * 24 * 400) }).where("id", "=", poll._id).execute();
    await upsertRelation(ctx.db, me, poll._id, "linked", minutesAgo(60 * 24 * 400));
    expect(await shared()).toEqual([poll._id]);
  });
});
