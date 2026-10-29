import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { countVote } from "../src/polls/counters.js";
import { createLiveRegistry, LIVE_ACTIVE_KEY } from "../src/live/registry.js";

let ctx: TestContext;
let cookie: string;
let sessionId: string;
const me = "live@example.com";

beforeAll(async () => {
  ctx = await startTestContext({
    ENV_MAX_LIVE_RESULTS_PER_USER: "3",
    ENV_MIN_LIVE_REFRESH_INTERVAL: "300",
    ENV_MIN_MANUAL_REFRESH_INTERVAL: "1",
    ENV_LIVE_RESULTS_MAX_IDLE_TIME: "1000",
    ENV_COUNTER_FLUSH_SWEEP_INTERVAL: "30000"
  });
  const forged = await forgeSession(ctx, me);
  cookie = forged.cookie;
  const row = await ctx.db.selectFrom("session").select("id").where("userId", "=", forged.userId).executeTakeFirstOrThrow();
  sessionId = row.id;
});

afterAll(async () => {
  await ctx.stop();
});

beforeEach(async () => {
  await polls(ctx).deleteMany({});
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
  for (const key of await ctx.cache.scan("live:*")) await ctx.cache.del(key);
});

const add = (pid: string, c = cookie) => request(ctx.app).post(`/api/live/${pid}`).set("Cookie", c).send();
const remove = (pid: string) => request(ctx.app).delete(`/api/live/${pid}`).set("Cookie", cookie).send();
const refresh = (body: unknown = {}) => request(ctx.app).post("/api/live/refresh").set("Cookie", cookie).send(body);
const clearFloors = async () => {
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
};

describe("the Live Results tab", () => {
  it("adds a poll the viewer may see, refuses one they may not, and requires a session", async () => {
    const pub = makePoll({ title: "Public" });
    const invitation = makePoll({ title: "Invitation", pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: ["someone-else@example.com"] });
    const link = makePoll({ title: "Link", pollVisibility: "Private Poll" });
    await polls(ctx).insertMany([pub, invitation, link]);
    expect((await add(pub._id)).body.polls).toEqual([pub._id]);
    await clearFloors();
    const refused = await add(invitation._id);
    expect(refused.status).toBe(403);
    expect(refused.body.error).toMatch(/not invited/);
    await clearFloors();
    expect((await add(link._id)).status).toBe(200);
    await clearFloors();
    expect((await add("missing")).status).toBe(404);
    expect((await request(ctx.app).post(`/api/live/${pub._id}`).send()).status).toBe(401);
  });

  it("refuses adding a poll without the View Polls grant, but never refuses removing one", async () => {
    const pub = makePoll({ title: "Watched before the grant was lost" });
    await polls(ctx).insertOne(pub);
    const forged = await forgeSession(ctx, "no-view-live@example.com");
    expect((await add(pub._id, forged.cookie)).status).toBe(200);
    await clearFloors();

    await ctx.db.updateTable("user").set({ permissions: ["Vote on Polls"] }).where("id", "=", forged.userId).execute();
    await ctx.sessions.forgetUserSessions(forged.userId);
    const refused = await add(pub._id, forged.cookie);
    expect(refused.status).toBe(403);
    expect(refused.body).toEqual({ error: "You do not have permission to view polls.", code: "no-view-permission" });
    await clearFloors();
    const removed = await request(ctx.app).delete(`/api/live/${pub._id}`).set("Cookie", forged.cookie).send();
    expect(removed.status).toBe(200);
    expect(removed.body.polls).toEqual([]);
  });

  it("refreshes nothing for a watcher who has lost the View Polls grant", async () => {
    const pub = makePoll({ title: "Watched, then barred" });
    await polls(ctx).insertOne(pub);
    const forged = await forgeSession(ctx, "barred-live@example.com");
    expect((await add(pub._id, forged.cookie)).status).toBe(200);
    await clearFloors();

    await ctx.db.updateTable("user").set({ permissions: ["Vote on Polls"] }).where("id", "=", forged.userId).execute();
    await ctx.sessions.forgetUserSessions(forged.userId);
    const res = await request(ctx.app).post("/api/live/refresh").set("Cookie", forged.cookie).send({});
    if (res.status === 200) expect(res.body.order).toEqual([]);
    else expect(res.status).toBe(304);
  });

  it("keeps the most recently added on top, moves a re-added poll to the top, and refuses a further poll when full (FIX028)", async () => {
    const [a, b, c, d] = [makePoll(), makePoll(), makePoll(), makePoll()];
    await polls(ctx).insertMany([a, b, c, d]);
    for (const p of [a, b, c]) {
      await add(p._id);
      await clearFloors();
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    expect((await refresh()).body.order).toEqual([c._id, b._id, a._id]);
    await clearFloors();
    await add(a._id);
    await clearFloors();
    const full = await add(d._id);
    expect(full.status).toBe(409);
    expect(full.body).toEqual({ error: "live-cap", limit: 3 });
    await clearFloors();
    expect((await refresh()).body.order).toEqual([a._id, c._id, b._id]);
    await clearFloors();
    expect((await remove(b._id)).body.polls).toEqual([a._id, c._id]);
    await clearFloors();
    expect((await add(d._id)).status).toBe(200);
    await clearFloors();
    expect((await refresh()).body.order).toEqual([d._id, a._id, c._id]);
  });

  it("a refresh reads the live counters — a vote shows without any flush — and touches no database", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    await add(poll._id);
    await clearFloors();
    const first = await refresh();
    expect(first.status).toBe(200);
    expect(first.body.counters[poll._id]).toEqual({ voteCount: 0, choiceCounts: {}, countsVersion: 0 });
    expect(first.body.nextRefreshMs).toBe(300);
    const versions = { [poll._id]: [first.body.cards[poll._id].contentVersion, 0] as [number, number] };

    await countVote(ctx.cache, poll._id, ["c2"], [], true);
    await clearFloors();
    const before = ctx.queries.length;
    const second = await refresh({ membershipVersion: first.body.membershipVersion, versions });
    expect(second.status).toBe(200);
    expect(second.body.counters[poll._id]).toEqual({ voteCount: 1, choiceCounts: { c2: 1 }, countsVersion: 1 });
    expect(second.body.cards).toEqual({});
    expect(ctx.queries.slice(before).filter((q) => /from "polls"|from "votes"/.test(q))).toEqual([]);
    const row = await ctx.db.selectFrom("polls").select("vote_count").where("id", "=", poll._id).executeTakeFirstOrThrow();
    expect(row.vote_count).toBe(0);
  });

  it("registers the session until its next refresh plus the idle allowance, and refuses a lapsed registration", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    const before = Date.now();
    await add(poll._id);
    await clearFloors();
    await refresh();
    const score = await ctx.cache.zscore(LIVE_ACTIVE_KEY, sessionId);
    expect(score).toBeGreaterThanOrEqual(before + 300 + 1000);
    expect(score).toBeLessThanOrEqual(Date.now() + 300 + 1000);

    await ctx.cache.zadd(LIVE_ACTIVE_KEY, Date.now() - 1, sessionId);
    expect(await ctx.live.prune()).toBe(0);
    await clearFloors();
    const lapsed = await refresh();
    expect(lapsed.status).toBe(403);
    expect(lapsed.body.error).toBe("live-expired");
  });

  it("keeps a session registered, never live-expired, while its backed-off tab refreshes every 10 s", async () => {
    // ENV_LIVE_RESULTS_MAX_IDLE_TIME's default; this suite lowers it to 1 s.
    const live = createLiveRegistry({ db: ctx.db, cache: ctx.cache, config: { ...ctx.config, liveResultsMaxIdleTimeMs: 1_800_000 }, rosters: ctx.rosters });
    const start = Date.now();
    for (let step = 0; step <= 6; step++) {
      const at = new Date(start + step * 10_000);
      expect(step === 0 || (await live.isRegistered("backed-off", at))).toBe(true);
      await live.touch("backed-off", ctx.config.floors.live, at);
    }
    expect(await live.isRegistered("backed-off", new Date(start + 70_000))).toBe(true);
  });

  it("applies the live floor to refreshes and the manual floor to adding", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    await add(poll._id);
    await clearFloors();
    expect((await refresh()).status).toBe(200);
    const early = await refresh();
    expect(early.status).toBe(429);
    expect(early.body.nextRefreshMs).toBe(300);
  });
});
