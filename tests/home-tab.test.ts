/**
 * The Home tab's refresh route: the five rules and their caps, the date windows, the reasons on each card,
 * the per-user membership reused until the user's list changes or it expires, `keepOrder`, and the access
 * check every refresh repeats.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { startTestContext, forgeSession, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { trendingSweep } from "../src/polls/sweeps.js";
import { insertPoll, type Poll } from "../src/polls/store.js";
import { upsertRelation } from "../src/polls/userPolls.js";
import type { UserPollRelation } from "../src/db/schema.js";
import { forgetTabs, HOME_REBUILT_KEY, HOME_REUSED_KEY, TAB_SEEN_KEY } from "../src/refresh/tabVersions.js";
import { HOME_TAB_KEY } from "../src/polls/homeTab.js";

const DAY = 24 * 60 * 60 * 1000;
const me = "home-user@example.com";
const author = { id: "author-id", name: "Author", email: "author@example.com" };

let ctx: TestContext;
let cookie: string;
let userId: string;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1" });
  ({ cookie, userId } = await forgeSession(ctx, me));
});

afterAll(async () => {
  await ctx.stop();
});

beforeEach(async () => {
  await polls(ctx).deleteMany({});
  for (const pattern of ["floor:*", "home:*", "listing:*", "stats:*"]) {
    for (const key of await ctx.cache.scan(pattern)) await ctx.cache.del(key);
  }
});

const home = (body: Record<string, unknown> = {}, c = cookie) => request(ctx.app).post("/api/tabs/home/refresh").set("Cookie", c).send(body);

/** A poll by someone else (or by the user, when `mine`), open and launched a day ago unless told otherwise. */
async function seed(overrides: Partial<Poll> = {}, mine = false): Promise<string> {
  const poll = makePoll({ startAt: new Date(Date.now() - DAY), ...overrides });
  await insertPoll(ctx, poll, mine ? { id: userId, name: "Me", email: me } : author);
  return poll._id;
}

async function relate(pid: string, relation: UserPollRelation, ageMs = 0): Promise<void> {
  await upsertRelation(ctx.db, me, pid, relation, new Date(Date.now() - ageMs));
  await forgetTabs(ctx.cache, [me]);
}

async function stat(key: string): Promise<number> {
  return Number((await ctx.cache.get(key)) ?? 0);
}

describe("POST /api/tabs/home/refresh — the rules", () => {
  it("401s a guest", async () => {
    expect((await request(ctx.app).post("/api/tabs/home/refresh").send({})).status).toBe(401);
  });

  it("lists nothing for a user without View Polls", async () => {
    const forged = await forgeSession(ctx, "no-view@example.com");
    await ctx.db.updateTable("user").set({ permissions: [] }).where("id", "=", forged.userId).execute();
    const pid = await seed({ pollVisibility: "Private Poll" });
    await upsertRelation(ctx.db, "no-view@example.com", pid, "linked");
    // Nothing to send to a browser that holds nothing: the empty listing is unchanged.
    expect((await home({}, forged.cookie)).status).toBe(304);
  });

  it("lists each poll once, under the first rule it satisfies, in rule order", async () => {
    const shared = await seed({ pollVisibility: "Private Poll" });
    await relate(shared, "linked");
    await relate(shared, "voted");
    await relate(shared, "bookmarked");
    const own = await seed({}, true);
    const votedIn = await seed();
    await relate(votedIn, "voted");
    const watched = await seed();
    await relate(watched, "bookmarked");
    const res = await home();
    expect(res.status).toBe(200);
    expect(res.body.order).toEqual([shared, own, votedIn, watched]);
  });

  it("orders a rule by that rule's own relation dates", async () => {
    const invitedLastMonth = await seed({ pollVisibility: "Private Poll" });
    await relate(invitedLastMonth, "linked", 30 * DAY);
    await relate(invitedLastMonth, "voted", DAY);
    const invitedLastWeek = await seed({ pollVisibility: "Private Poll" });
    await relate(invitedLastWeek, "linked", 7 * DAY);
    const res = await home();
    expect(res.body.order).toEqual([invitedLastWeek, invitedLastMonth]);
  });

  it("caps rules 1, 2 and 3 at ten polls and lists every watched poll", async () => {
    const byRule: Record<string, string[]> = { shared: [], own: [], voted: [], watched: [] };
    for (let i = 0; i < 12; i++) {
      const shared = await seed({ pollVisibility: "Private Poll" });
      await relate(shared, "linked", i * 1000);
      byRule.shared!.push(shared);
      byRule.own!.push(await seed({ createdAt: new Date(Date.now() - i * 1000) }, true));
      const voted = await seed();
      await relate(voted, "voted", i * 1000);
      byRule.voted!.push(voted);
      const watched = await seed();
      await relate(watched, "bookmarked", i * 1000);
      byRule.watched!.push(watched);
    }
    const res = await home();
    expect(res.body.order).toEqual([
      ...byRule.shared!.slice(0, 10),
      ...byRule.own!.slice(0, 10),
      ...byRule.voted!.slice(0, 10),
      ...byRule.watched!
    ]);
  });

  it("keeps rule 1 to what Shared With You lists", async () => {
    const ownLinked = await seed({ pollVisibility: "Private Poll" }, true);
    await relate(ownLinked, "linked");
    const uninvited = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" });
    await relate(uninvited, "linked");
    const publicLinked = await seed();
    await relate(publicLinked, "linked");
    const res = await home();
    // The user's own poll is listed by rule 2; the others satisfy no rule.
    expect(res.body.order).toEqual([ownLinked]);
    expect(res.body.cards[ownLinked].overlay.relations).toEqual(["linked", "created"]);
  });

  it("applies the date windows by state", async () => {
    const at = (days: number) => new Date(Date.now() - days * DAY);
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setUTCMonth(twoMonthsAgo.getUTCMonth() - 2);
    const listed = [
      await seed({ startAt: new Date(twoMonthsAgo.getTime() + DAY) }),
      await seed({ pollState: "CLOSED", endAt: at(6) }),
      await seed({ pollState: "WAITING TO OPEN", startAt: null }),
      await seed({ pollState: "EDITING", pollStateBeforeEditUpdate: "OPEN" })
    ];
    const unlisted = [
      await seed({ startAt: new Date(twoMonthsAgo.getTime() - DAY) }),
      await seed({ pollState: "CLOSED", endAt: at(8) }),
      await seed({ pollState: "INITIALIZED", startAt: null }),
      await seed({ pollState: "AWAITING APPROVAL", startAt: null }),
      await seed({ pollState: "REJECTED", startAt: null }),
      await seed({ pollState: "ARCHIVED", startAt: null }),
      await seed({ pollState: "EDITING", pollStateBeforeEditUpdate: "INITIALIZED" })
    ];
    const editing = listed[3]!;
    await ctx.db.updateTable("polls").set({ launched_at: at(1) }).where("id", "=", editing).execute();
    for (const [i, pid] of [...listed, ...unlisted].entries()) await relate(pid, "voted", i * 1000);
    const res = await home();
    expect(res.body.order).toEqual(listed);
  });

  it("fills rule 5 from the TRENDING listing in its order, skipping polls already listed, and leaves it empty without one", async () => {
    const votedIn = await seed();
    await relate(votedIn, "voted");
    const trendingOnly = [await seed(), await seed(), await seed()];
    expect((await home()).body.order).toEqual([votedIn]);

    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    const published: string[] = (await request(ctx.app).get("/api/trending/counts")).body.polls.map((p: { pid: string }) => p.pid);
    expect(published).toHaveLength(4);
    await forgetTabs(ctx.cache, [me]);
    const res = await home();
    expect(res.body.order).toEqual([votedIn, ...published.filter((pid) => pid !== votedIn)]);
    for (const pid of trendingOnly) expect(res.body.cards[pid].overlay.relations).toEqual(["trending"]);
  });

  it("caps rule 5 at ten polls", async () => {
    for (let i = 0; i < 12; i++) await seed();
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    expect((await home()).body.order).toHaveLength(10);
  });

  it("carries why each poll is listed in the overlay", async () => {
    const invited = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: [me] });
    await relate(invited, "bookmarked");
    const own = await seed({}, true);
    const res = await home();
    expect(res.body.cards[invited].overlay.relations).toEqual(["invited", "bookmarked"]);
    expect(res.body.cards[own].overlay.relations).toEqual(["created"]);
  });

  it("never accepts an invitation", async () => {
    const invited = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: [me] });
    expect((await home()).body.order).toEqual([invited]);
    const row = await ctx.db.selectFrom("poll_invitations").select("accepted_at").where("poll_id", "=", invited).executeTakeFirstOrThrow();
    expect(row.accepted_at).toBeNull();
  });
});

describe("POST /api/tabs/home/refresh — the cached membership", () => {
  it("rebuilds once within the interval and keeps the membership version", async () => {
    const votedIn = await seed();
    await relate(votedIn, "voted");
    const first = await home();
    await ctx.cache.del(TAB_SEEN_KEY(me, "home"));
    const second = await home();
    expect(second.body.membershipVersion).toBe(first.body.membershipVersion);
    expect(await stat(HOME_REBUILT_KEY)).toBe(1);
    expect(await stat(HOME_REUSED_KEY)).toBe(1);
  });

  it("rebuilds after the user's own change, unless the browser asks to keep its order", async () => {
    const votedIn = await seed();
    await relate(votedIn, "voted");
    const first = await home();
    const watched = await seed();
    const bookmark = await request(ctx.app).post(`/api/polls/${watched}/bookmark`).set("Cookie", cookie).send({});
    expect(bookmark.status).toBe(200);

    const held = await home({ membershipVersion: first.body.membershipVersion, keepOrder: true });
    expect(held.body.membershipVersion ?? first.body.membershipVersion).toBe(first.body.membershipVersion);
    expect(await stat(HOME_REBUILT_KEY)).toBe(1);

    const reopened = await home({ membershipVersion: first.body.membershipVersion });
    expect(reopened.body.order).toEqual([votedIn, watched]);
    expect(await stat(HOME_REBUILT_KEY)).toBe(2);
  });

  it("rebuilds an expired membership", async () => {
    const votedIn = await seed();
    await relate(votedIn, "voted");
    await home();
    await ctx.cache.del(HOME_TAB_KEY(me));
    await ctx.cache.del(TAB_SEEN_KEY(me, "home"));
    await home();
    expect(await stat(HOME_REBUILT_KEY)).toBe(2);
  });

  it("keeps the membership for the interval, or for the TRENDING interval while there is no listing", async () => {
    await seed({}, true);
    await home();
    const withoutListing = await ctx.cache.pttl(HOME_TAB_KEY(me));
    expect(withoutListing).toBeGreaterThan(0);
    expect(withoutListing).toBeLessThanOrEqual(ctx.config.trendingPollsRecomputeSweepIntervalMs);

    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    await forgetTabs(ctx.cache, [me]);
    await home();
    const withListing = await ctx.cache.pttl(HOME_TAB_KEY(me));
    expect(withListing).toBeGreaterThan(ctx.config.trendingPollsRecomputeSweepIntervalMs);
    expect(withListing).toBeLessThanOrEqual(ctx.config.homeTabRefreshIntervalMs);
  });

  it("drops a poll at the next refresh once the user may no longer see it, even while keeping the order", async () => {
    const madePrivate = await seed();
    await relate(madePrivate, "voted");
    const archived = await seed();
    await relate(archived, "voted", 1000);
    const deleted = await seed();
    await relate(deleted, "voted", 2000);
    const banned = await seed();
    await relate(banned, "bookmarked");
    const kept = await seed({}, true);
    const first = await home();
    expect(first.body.order).toEqual([kept, madePrivate, archived, deleted, banned]);

    await polls(ctx).updateOne({ _id: madePrivate }, { $set: { pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" } });
    await polls(ctx).updateOne({ _id: archived }, { $set: { pollState: "ARCHIVED" } });
    await ctx.db.deleteFrom("polls").where("id", "=", deleted).execute();
    await ctx.db.insertInto("poll_bans").values({ poll_id: banned, email: me }).execute();
    await forgetTabs(ctx.cache, [me]);

    const held = await home({ membershipVersion: first.body.membershipVersion, keepOrder: true });
    expect(held.status).toBe(200);
    expect(held.body.order ?? []).toEqual([kept]);
    expect(await stat(HOME_REBUILT_KEY)).toBe(1);
  });

  it("considers at most ENV_MAX_HOME_PAGE_POLLS polls, those with the most recent relations", async () => {
    const small = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1", ENV_MAX_HOME_PAGE_POLLS: "3" });
    try {
      const forged = await forgeSession(small, me);
      const pids: string[] = [];
      for (let i = 0; i < 5; i++) {
        const poll = makePoll({ startAt: new Date(Date.now() - DAY) });
        await insertPoll(small, poll, author);
        await upsertRelation(small.db, me, poll._id, "bookmarked", new Date(Date.now() - i * 1000));
        pids.push(poll._id);
      }
      const res = await request(small.app).post("/api/tabs/home/refresh").set("Cookie", forged.cookie).send({});
      expect(res.body.order).toEqual(pids.slice(0, 3));
    } finally {
      await small.stop();
    }
  });

  it("falls back to a rebuild when the cached membership cannot be read", async () => {
    const votedIn = await seed();
    await relate(votedIn, "voted");
    await home();
    await ctx.cache.set(HOME_TAB_KEY(me), "{not json", 60_000);
    await ctx.cache.del(TAB_SEEN_KEY(me, "home"));
    const res = await home();
    expect(res.body.order).toEqual([votedIn]);
    expect(await stat(HOME_REBUILT_KEY)).toBe(2);
  });
});
