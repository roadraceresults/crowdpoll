import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { countVote } from "../src/polls/counters.js";
import { recordVote, updatePoll } from "../src/polls/store.js";

let ctx: TestContext;
let cookie: string;
const me = "tabs@example.com";

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MAX_POLLS_SEARCH_RESULTS: "3", ENV_MAX_NEWEST_POLLS: "3", ENV_MIN_MANUAL_REFRESH_INTERVAL: "300" });
  cookie = (await forgeSession(ctx, me)).cookie;
});

afterAll(async () => {
  await ctx.stop();
});

beforeEach(async () => {
  await polls(ctx).deleteMany({});
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
});

const refresh = (tab: "your-polls" | "shared-with-you" | "your-votes" | "watching", body: unknown = {}) =>
  request(ctx.app).post(`/api/tabs/${tab}/refresh`).set("Cookie", cookie).send(body);

async function seed(at: (offsetMs: number) => Date) {
  const invitedPrivate = makePoll({
    title: "invited private",
    pollVisibility: "Private Poll",
    pollSharingMode: "Invitation Only",
    invitedVoterList: [me],
    createdAt: at(0)
  });
  const votedPrivate = makePoll({
    title: "voted private",
    pollVisibility: "Private Poll",
    currentVotes: [{ emailAddress: me, userName: "", choiceIds: ["c2"], votedAt: at(1000) }],
    createdAt: at(1000)
  });
  const votedPublic = makePoll({
    title: "voted public",
    currentVotes: [{ emailAddress: me, userName: "", choiceIds: ["c1"], votedAt: at(2000) }],
    createdAt: at(2000)
  });
  const strangerPublic = makePoll({ title: "someone else's", createdAt: at(3000) });
  for (const p of [invitedPrivate, votedPrivate, votedPublic, strangerPublic]) await polls(ctx).insertOne(p);
  return { invitedPrivate, votedPrivate, votedPublic, strangerPublic };
}

describe("personal tabs", () => {
  it("Shared With You lists the caller's invited private polls, with the overlay inline", async () => {
    const base = Date.now() - 60_000;
    const seeded = await seed((offset) => new Date(base + offset));
    const res = await refresh("shared-with-you");
    expect(res.status).toBe(200);
    expect(res.body.order).toEqual([seeded.invitedPrivate._id]);
    expect(res.body.membershipVersion).toBe(new Date(base).toISOString());
    expect(res.body.cards[seeded.invitedPrivate._id].overlay).toMatchObject({ voted: false, bookmarked: false, relations: ["invited"], voteBlockedReason: null });
    expect(typeof res.body.nextRefreshMs).toBe("number");
  });

  it("Your Votes lists every poll the caller voted in, public and private, newest vote first, and never a stranger's poll", async () => {
    const base = Date.now() - 60_000;
    const seeded = await seed((offset) => new Date(base + offset));
    const res = await refresh("your-votes");
    expect(res.status).toBe(200);
    expect(res.body.order).toEqual([seeded.votedPublic._id, seeded.votedPrivate._id]);
    expect(res.body.membershipVersion).toBe(new Date(base + 2000).toISOString());
    expect(res.body.cards[seeded.votedPrivate._id].overlay).toEqual({ voted: true, choiceIds: ["c2"], bookmarked: false, mayWatch: true, relations: ["voted"], voteBlockedReason: null });
    expect(res.body.counters[seeded.votedPrivate._id]).toEqual({ voteCount: 1, choiceCounts: { c2: 1 }, countsVersion: 0 });
  });

  it("answers 304 with the held versions, then only what moved", async () => {
    const seeded = await seed((offset) => new Date(Date.now() - 60_000 + offset));
    const first = await refresh("shared-with-you");
    const versions: Record<string, [number, number]> = {};
    for (const pid of first.body.order) {
      versions[pid] = [first.body.cards[pid].contentVersion, first.body.counters[pid].countsVersion];
    }
    await ctx.cache.del(`floor:refresh:s:${"x"}`);
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    const unchanged = await refresh("shared-with-you", { membershipVersion: first.body.membershipVersion, versions });
    expect(unchanged.status).toBe(304);

    await countVote(ctx.cache, seeded.invitedPrivate._id, ["c1"], [], true);
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    const counted = await refresh("shared-with-you", { membershipVersion: first.body.membershipVersion, versions });
    expect(counted.status).toBe(200);
    expect(counted.body.order).toBeUndefined();
    expect(counted.body.cards).toEqual({});
    expect(counted.body.counters[seeded.invitedPrivate._id]).toMatchObject({ voteCount: 1, countsVersion: 1 });

    await updatePoll(ctx, seeded.invitedPrivate._id, { title: "renamed" });
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    const changed = await refresh("shared-with-you", { membershipVersion: first.body.membershipVersion, versions });
    expect(changed.body.cards[seeded.invitedPrivate._id].title).toBe("renamed");
    expect(changed.body.order).toBeUndefined();
  });

  it("a new relation moves the membership version and sends the order", async () => {
    const seeded = await seed((offset) => new Date(Date.now() - 60_000 + offset));
    const first = await refresh("your-votes");
    await recordVote(ctx, seeded.strangerPublic._id, { emailAddress: me, userName: "", choiceIds: ["c1"], votedAt: new Date() });
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    const versions: Record<string, [number, number]> = {};
    for (const pid of first.body.order) versions[pid] = [first.body.cards[pid].contentVersion, first.body.counters[pid].countsVersion];
    const res = await refresh("your-votes", { membershipVersion: first.body.membershipVersion, versions });
    expect(res.status).toBe(200);
    expect(res.body.order).toEqual([seeded.strangerPublic._id, seeded.votedPublic._id, seeded.votedPrivate._id]);
    expect(Object.keys(res.body.cards)).toEqual([seeded.strangerPublic._id]);
    expect(res.body.membershipVersion).not.toBe(first.body.membershipVersion);
  });

  it("caps the tab at the configured size", async () => {
    for (let i = 0; i < 5; i++) {
      await polls(ctx).insertOne(
        makePoll({ title: `p${i}`, currentVotes: [{ emailAddress: me, userName: "", choiceIds: ["c1"], votedAt: new Date(Date.now() - i * 1000) }] })
      );
    }
    const res = await refresh("your-votes");
    expect(res.body.order).toHaveLength(3);
  });

  it("refuses a second refresh within the manual floor with 429 and requires a session", async () => {
    await refresh("shared-with-you");
    const early = await refresh("shared-with-you");
    expect(early.status).toBe(429);
    expect(early.body).toMatchObject({ error: "too-soon" });
    expect(early.body.nextRefreshMs).toBe(300);
    expect((await request(ctx.app).post("/api/tabs/shared-with-you/refresh").send({})).status).toBe(401);
  });

  it("marks a banned or uninvited caller's card so it offers no vote", async () => {
    const banned = makePoll({
      title: "banned here",
      pollVisibility: "Private Poll",
      pollSharingMode: "Invitation Only",
      invitedVoterList: [me],
      bannedVoterList: [me]
    });
    await polls(ctx).insertOne(banned);
    const res = await refresh("shared-with-you");
    expect(res.body.cards[banned._id].overlay.voteBlockedReason).toMatch(/removed from this poll/);
  });
});

describe("the overlay call", () => {
  it("returns the caller's vote and bookmark state for the ids asked, capped", async () => {
    const voted = makePoll({ currentVotes: [{ emailAddress: me, userName: "", choiceIds: ["c1"], votedAt: new Date() }] });
    const other = makePoll();
    await polls(ctx).insertOne(voted);
    await polls(ctx).insertOne(other);
    await ctx.db.insertInto("bookmarks").values({ email: me, poll_id: other._id }).execute();
    const res = await request(ctx.app)
      .get(`/api/me/polls?pids=${voted._id},${other._id},p3,p4,p5`)
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.overlay).toEqual({
      [voted._id]: { voted: true, choiceIds: ["c1"], bookmarked: false, mayWatch: true },
      [other._id]: { voted: false, bookmarked: true, mayWatch: true },
      p3: { voted: false, bookmarked: false, mayWatch: false }
    });
    expect(typeof res.body.nextRefreshMs).toBe("number");
  });
});
