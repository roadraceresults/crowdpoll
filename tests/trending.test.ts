import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { countVote } from "../src/polls/counters.js";
import { membershipVersionOf, recomputeTrending } from "../src/trending/recompute.js";
import { createListingPublisher, listingMaxAgeMs, TRENDING_OBJECTS, type ObjectStore } from "../src/trending/publish.js";
import { trendingSweep } from "../src/polls/sweeps.js";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MAX_TRENDING_POLLS: "3", ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL: "60000" });
});

afterAll(async () => {
  await ctx.stop();
});

function vote(pid: string, times: number, at = new Date()) {
  return (async () => {
    for (let i = 0; i < times; i++) await countVote(ctx.cache, pid, ["c1"], [], true, at);
  })();
}

describe("TRENDING recompute", () => {
  it("ranks by votes in the trailing hour, then by lifetime votes, within the cap", async () => {
    await polls(ctx).deleteMany({});
    const hot = makePoll({ title: "hot" });
    const warm = makePoll({ title: "warm" });
    const bigButQuiet = makePoll({
      title: "big",
      currentVotes: Array.from({ length: 5 }, (_, i) => ({ emailAddress: `v${i}@x`, userName: "", choiceIds: ["c2"], votedAt: new Date() }))
    });
    const cold = makePoll({ title: "cold" });
    for (const p of [hot, warm, bigButQuiet, cold]) await polls(ctx).insertOne(p);
    await vote(hot._id, 3);
    await vote(warm._id, 1);

    const listing = await recomputeTrending(ctx);
    expect(listing.order).toEqual([hot._id, warm._id, bigButQuiet._id]);
    expect(listing.countsObject.polls.map((p) => p.pid)).toEqual(listing.order);
    expect(listing.countsObject.polls[0]).toMatchObject({ pid: hot._id, voteCount: 3, countsVersion: 3 });
    expect(listing.countsObject.polls[2]).toMatchObject({ pid: bigButQuiet._id, voteCount: 5, choiceCounts: { c2: 5 } });
    expect(Object.keys(listing.cardsObject.cards).sort()).toEqual([...listing.order].sort());
    expect(listing.cardsObject.cards[hot._id]!.title).toBe("hot");
  });

  it("keeps a public poll that is being edited after being open, and excludes closed and private polls", async () => {
    await polls(ctx).deleteMany({});
    const editing = makePoll({ title: "editing", pollState: "EDITING", pollStateBeforeEditUpdate: "OPEN" });
    const closed = makePoll({ title: "closed", pollState: "CLOSED" });
    const privatePoll = makePoll({ title: "private", pollVisibility: "Private Poll" });
    const open = makePoll({ title: "open" });
    for (const p of [editing, closed, privatePoll, open]) await polls(ctx).insertOne(p);
    await vote(closed._id, 5);
    await vote(privatePoll._id, 5);
    await vote(editing._id, 2);
    const listing = await recomputeTrending(ctx);
    expect(listing.order).toEqual([editing._id, open._id]);
  });

  it("membership version depends on the set of polls, not their order", () => {
    expect(membershipVersionOf(["b", "a"])).toBe(membershipVersionOf(["a", "b"]));
    expect(membershipVersionOf(["a"])).not.toBe(membershipVersionOf(["a", "b"]));
  });

  it("publishes the counts object every run and the cards object only when the set changed", async () => {
    await polls(ctx).deleteMany({});
    const a = makePoll({ title: "a" });
    const b = makePoll({ title: "b" });
    await polls(ctx).insertOne(a);
    await polls(ctx).insertOne(b);
    await vote(a._id, 2);
    await vote(b._id, 1);
    const puts: { key: string; cacheControl: string; contentEncoding?: string }[] = [];
    const store: ObjectStore = {
      put: async (key, _body, headers) => {
        puts.push({ key, cacheControl: headers.cacheControl, contentEncoding: headers.contentEncoding });
      }
    };
    const publisher = createListingPublisher(store, ctx.config.trendingPollsRecomputeSweepIntervalMs, TRENDING_OBJECTS);

    expect(await publisher.publish(await recomputeTrending(ctx))).toEqual({ counts: true, cards: true });
    await vote(b._id, 5);
    expect(await publisher.publish(await recomputeTrending(ctx))).toEqual({ counts: true, cards: false });
    const c = makePoll({ title: "c" });
    await polls(ctx).insertOne(c);
    await vote(c._id, 9);
    expect(await publisher.publish(await recomputeTrending(ctx))).toEqual({ counts: true, cards: true });

    expect(puts.map((p) => p.key)).toEqual([
      TRENDING_OBJECTS.counts, TRENDING_OBJECTS.cards,
      TRENDING_OBJECTS.counts,
      TRENDING_OBJECTS.counts, TRENDING_OBJECTS.cards
    ]);
    expect(puts.every((p) => p.cacheControl === "public, max-age=10" && p.contentEncoding === "gzip")).toBe(true);
  });

  it("publishes with the smaller of the recompute interval and 10 s as max-age, and sends both lifetimes in /api/config", async () => {
    const puts: string[] = [];
    const store: ObjectStore = {
      put: async (_key, _body, headers) => {
        puts.push(headers.cacheControl);
      }
    };
    await createListingPublisher(store, 5000, TRENDING_OBJECTS).publish(await recomputeTrending(ctx));
    expect(puts.length).toBeGreaterThan(0);
    expect(puts.every((c) => c === "public, max-age=5")).toBe(true);
    expect(listingMaxAgeMs(60_000)).toBe(10_000);
    expect(listingMaxAgeMs(5000)).toBe(5000);
    const config = (await request(ctx.app).get("/api/config")).body;
    expect(config.trendingMaxAgeMs).toBe(10_000);
    expect(config.newestMaxAgeMs).toBe(10_000);
  });

  it("republishes the cards object when a listed poll's content changed, though the set of polls did not", async () => {
    await polls(ctx).deleteMany({});
    const a = makePoll({ title: "before" });
    await polls(ctx).insertOne(a);
    const puts: string[] = [];
    const store: ObjectStore = { put: async (key) => { puts.push(key); } };
    const publisher = createListingPublisher(store, ctx.config.trendingPollsRecomputeSweepIntervalMs, TRENDING_OBJECTS);

    const first = await recomputeTrending(ctx);
    expect(await publisher.publish(first)).toEqual({ counts: true, cards: true });
    expect(await publisher.publish(await recomputeTrending(ctx))).toEqual({ counts: true, cards: false });

    await polls(ctx).updateOne({ _id: a._id }, { $set: { choices: a.choices.map((c, i) => (i === 0 ? { ...c, color: "#FF0000" } : c)) } });
    const second = await recomputeTrending(ctx);
    expect(second.membershipVersion).toBe(first.membershipVersion);
    expect(second.cardsVersion).not.toBe(first.cardsVersion);
    expect(second.countsObject.cardsVersion).toBe(second.cardsVersion);
    expect(second.cardsObject.cardsVersion).toBe(second.cardsVersion);
    expect(await publisher.publish(second)).toEqual({ counts: true, cards: true });
    expect(second.cardsObject.cards[a._id]!.choices[0]!.color).toBe("#FF0000");
  });

  it("the instance endpoints serve both objects with a validator and answer 304 to If-None-Match", async () => {
    await polls(ctx).deleteMany({});
    const a = makePoll({ title: "served" });
    await polls(ctx).insertOne(a);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);

    const counts = await request(ctx.app).get("/api/trending/counts");
    expect(counts.status).toBe(200);
    expect(counts.headers["cache-control"]).toBe("public, max-age=10");
    expect(counts.headers.etag).toBeTruthy();
    expect(counts.body.polls[0].pid).toBe(a._id);
    const again = await request(ctx.app).get("/api/trending/trending-counts.json").set("If-None-Match", counts.headers.etag!);
    expect(again.status).toBe(304);

    const cards = await request(ctx.app).get("/api/trending/cards");
    expect(cards.status).toBe(200);
    expect(cards.body.membershipVersion).toBe(counts.body.membershipVersion);
    expect(cards.body.cards[a._id].title).toBe("served");
    expect((await request(ctx.app).get("/api/trending/trending.json").set("If-None-Match", cards.headers.etag!)).status).toBe(304);
  });
});
