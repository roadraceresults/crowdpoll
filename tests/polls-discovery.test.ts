/**
 * Discovery on the tabbed home page: TRENDING is the public scope (built by the
 * trending sweep and served as two objects), the personal tabs carry a visitor's
 * own private and invited polls, and no listing endpoint serves guests' requests
 * for the personal tabs.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { startTestContext, forgeSession, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { trendingSweep } from "../src/polls/sweeps.js";
import { addBookmark } from "../src/polls/bookmarks.js";

describe("TRENDING scope", () => {
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

  async function trendingPids(): Promise<string[]> {
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    const res = await request(ctx.app).get("/api/trending/counts");
    expect(res.status).toBe(200);
    return res.body.polls.map((p: { pid: string }) => p.pid);
  }

  it("lists open public polls and excludes private, closed, archived and never-public polls", async () => {
    const pub = makePoll({ title: "Public one" });
    const link = makePoll({ pollVisibility: "Private Poll" });
    const invite = makePoll({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" });
    const closed = makePoll({ pollState: "CLOSED" });
    const archived = makePoll({ pollState: "ARCHIVED" });
    const neverPublic = makePoll({ pollState: "EDITING", pollStateBeforeEditUpdate: "INITIALIZED" });
    await polls(ctx).insertMany([pub, link, invite, closed, archived, neverPublic]);
    expect(await trendingPids()).toEqual([pub._id]);
  });

  it("keeps a public poll under edit that was open before the edit began", async () => {
    const editing = makePoll({ pollState: "EDITING", pollStateBeforeEditUpdate: "OPEN" });
    await polls(ctx).insertOne(editing);
    expect(await trendingPids()).toEqual([editing._id]);
  });

  it("never discloses the pre-edit state, the sharing mode or the anonymity setting on a card", async () => {
    const editing = makePoll({ pollState: "EDITING", pollStateBeforeEditUpdate: "OPEN" });
    await polls(ctx).insertOne(editing);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    const res = await request(ctx.app).get("/api/trending/cards");
    const card = res.body.cards[editing._id];
    expect(card.pollState).toBe("EDITING");
    expect(card).not.toHaveProperty("pollStateBeforeEditUpdate");
    expect(card).not.toHaveProperty("voteAnonymity");
    expect(card).not.toHaveProperty("invitedVoterList");
    expect(card).not.toHaveProperty("bannedVoterList");
  });

  it("the overlay, not the card, carries a signed-in caller's own choice", async () => {
    const { cookie } = await forgeSession(ctx, "voter@example.com");
    const poll = makePoll({
      currentVotes: [{ emailAddress: "voter@example.com", userName: "v", choiceIds: ["c2"], votedAt: new Date() }]
    });
    await polls(ctx).insertOne(poll);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    const cards = await request(ctx.app).get("/api/trending/cards");
    expect(cards.body.cards[poll._id]).not.toHaveProperty("myChoiceIds");
    const overlay = await request(ctx.app).get(`/api/me/polls?pids=${poll._id}`).set("Cookie", cookie);
    expect(overlay.body.overlay[poll._id]).toEqual({ voted: true, choiceIds: ["c2"], bookmarked: false, mayWatch: true });
    expect((await request(ctx.app).get(`/api/me/polls?pids=${poll._id}`)).status).toBe(401);
  });
});

describe("Invited private polls on the personal tabs", () => {
  let ctx: TestContext;
  let cookie: string;
  const invitee = "invitee@example.com";
  beforeAll(async () => {
    ctx = await startTestContext();
    cookie = (await forgeSession(ctx, invitee)).cookie;
  });
  afterAll(async () => {
    await ctx.stop();
  });
  beforeEach(async () => {
    await polls(ctx).deleteMany({});
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
  });

  const privateTab = (c = cookie) => request(ctx.app).post("/api/tabs/shared-with-you/refresh").set("Cookie", c).send({});

  it("lists an invitation-only poll for the invited user and for nobody else", async () => {
    const poll = makePoll({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: [invitee] });
    await polls(ctx).insertOne(poll);
    const mine = await privateTab();
    expect(mine.status).toBe(200);
    expect(mine.body.order).toEqual([poll._id]);
    const other = await forgeSession(ctx, "other@example.com");
    const theirs = await privateTab(other.cookie);
    expect(theirs.status).toBe(304);
  });

  it("keeps a banned invitee's card but offers no vote on it", async () => {
    const poll = makePoll({
      pollVisibility: "Private Poll",
      pollSharingMode: "Invitation Only",
      invitedVoterList: [invitee],
      bannedVoterList: [invitee]
    });
    await polls(ctx).insertOne(poll);
    const res = await privateTab();
    expect(res.body.cards[poll._id].overlay.voteBlockedReason).toMatch(/removed/);
  });

  it("never lists an ANYONE WITH THE LINK poll the caller has no relation to", async () => {
    const poll = makePoll({ pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link" });
    await polls(ctx).insertOne(poll);
    expect((await privateTab()).status).toBe(304);
  });

  it("empties Shared With You and Watching without the View Polls grant", async () => {
    const email = "no-view-invitee@example.com";
    const forged = await forgeSession(ctx, email);
    await ctx.db.updateTable("user").set({ permissions: ["Vote on Polls"] }).where("id", "=", forged.userId).execute();
    const invited = makePoll({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: [email] });
    const pub = makePoll({ title: "Public favourite" });
    await polls(ctx).insertMany([invited, pub]);
    await addBookmark(ctx, email, pub._id, 200);

    expect((await privateTab(forged.cookie)).status).toBe(304);
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    const favourites = await request(ctx.app).post("/api/tabs/watching/refresh").set("Cookie", forged.cookie).send({});
    expect(favourites.status).toBe(304);
  });

  it("refuses guests on the personal tabs", async () => {
    for (const tab of ["your-polls", "shared-with-you", "your-votes", "watching"]) {
      expect((await request(ctx.app).post(`/api/tabs/${tab}/refresh`).send({})).status).toBe(401);
    }
  });

  it("the retired grid endpoints are gone", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    expect((await request(ctx.app).get("/api/polls")).status).toBe(404);
    expect((await request(ctx.app).get(`/api/polls/${poll._id}`)).status).toBe(404);
  });
});
