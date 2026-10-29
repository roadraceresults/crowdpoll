import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { countVote } from "../src/polls/counters.js";
import { buildSweepSchedules, newestSweep, pollDateCheckSweep } from "../src/polls/sweeps.js";
import { NEWEST_KEYS, readNewestObjects, recomputeNewest } from "../src/trending/recompute.js";
import { createListingPublisher, NEWEST_OBJECTS, type ObjectStore } from "../src/trending/publish.js";
import type { Poll } from "../src/polls/store.js";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MAX_NEWEST_POLLS: "3", ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL: "60000" });
});

afterAll(async () => {
  await ctx.stop();
});

async function launchedAt(pid: string): Promise<Date | null> {
  const row = await ctx.db.selectFrom("polls").select("launched_at").where("id", "=", pid).executeTakeFirstOrThrow();
  return row.launched_at;
}

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000);

async function seed(overrides: Partial<Poll> = {}): Promise<Poll> {
  const poll = makePoll(overrides);
  await polls(ctx).insertOne(poll);
  return poll;
}

describe("launched_at", () => {
  it("is stamped when a poll enters OPEN and cleared when it enters CLOSED", async () => {
    const poll = await seed({ pollState: "WAITING TO OPEN", startAt: new Date(Date.now() + 3_600_000) });
    expect(await launchedAt(poll._id)).toBeNull();

    const before = Date.now();
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "OPEN", startAt: null } });
    const first = await launchedAt(poll._id);
    expect(first).not.toBeNull();
    expect(Math.abs(first!.getTime() - before)).toBeLessThan(5_000);

    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "CLOSED", endAt: new Date() } });
    expect(await launchedAt(poll._id)).toBeNull();

    await new Promise((r) => setTimeout(r, 5));
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "OPEN", endAt: null } });
    const again = await launchedAt(poll._id);
    expect(again!.getTime()).toBeGreaterThan(first!.getTime());
  });

  it("is kept through an edit of an open poll and across the publish back to OPEN", async () => {
    const created = minutesAgo(30);
    const poll = await seed({ createdAt: created });
    const original = await launchedAt(poll._id);
    expect(original).toEqual(created);

    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "EDITING", pollStateBeforeEditUpdate: "OPEN" } });
    expect(await launchedAt(poll._id)).toEqual(original);

    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "OPEN", pollStateBeforeEditUpdate: null } });
    expect(await launchedAt(poll._id)).toEqual(original);
  });

  it("is stamped when an edited waiting poll publishes into OPEN", async () => {
    const poll = await seed({ pollState: "EDITING", pollStateBeforeEditUpdate: "WAITING TO OPEN" });
    expect(await launchedAt(poll._id)).toBeNull();
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "OPEN", pollStateBeforeEditUpdate: null } });
    expect(await launchedAt(poll._id)).not.toBeNull();
  });

  it("is kept, stale, when an edit sends an open poll back to waiting", async () => {
    const created = minutesAgo(10);
    const poll = await seed({ createdAt: created });
    await polls(ctx).updateOne(
      { _id: poll._id },
      { $set: { pollState: "WAITING TO OPEN", startAt: new Date(Date.now() + 3_600_000) } }
    );
    expect(await launchedAt(poll._id)).toEqual(created);
  });

  it("at insert, an open poll gets its start date, else its creation date; a closed poll gets nothing", async () => {
    const started = minutesAgo(5);
    const scheduled = await seed({ createdAt: minutesAgo(60), startAt: started });
    expect(await launchedAt(scheduled._id)).toEqual(started);
    const created = minutesAgo(20);
    const direct = await seed({ createdAt: created });
    expect(await launchedAt(direct._id)).toEqual(created);
    const closed = await seed({ pollState: "CLOSED", endAt: minutesAgo(1) });
    expect(await launchedAt(closed._id)).toBeNull();
  });
});

describe("schedule", () => {
  it("runs the Newest recompute on its own lock and interval, once at start", () => {
    const entry = buildSweepSchedules(ctx.config, ctx).find((s) => s.name === "newestSweep");
    expect(entry).toMatchObject({ runAtStart: true, lockId: 10, intervalMs: 60_000 });
  });
});

describe("NEWEST recompute", () => {
  it("lists the most recently launched polls first, within the cap", async () => {
    await polls(ctx).deleteMany({});
    const ids: string[] = [];
    for (let i = 5; i >= 1; i--) ids.push((await seed({ title: `launched ${i} min ago`, createdAt: minutesAgo(i) }))._id);
    const listing = await recomputeNewest(ctx);
    expect(listing.order).toEqual(ids.slice(-3).reverse());
    expect(listing.countsObject.polls.map((p) => p.pid)).toEqual(listing.order);
    expect(Object.keys(listing.cardsObject.cards).sort()).toEqual([...listing.order].sort());
  });

  it("breaks launch-time ties by votes, then by id, identically on every run", async () => {
    await polls(ctx).deleteMany({});
    const at = minutesAgo(2);
    const a = await seed({ title: "a", createdAt: at });
    const b = await seed({ title: "b", createdAt: at });
    const c = await seed({ title: "c", createdAt: at });
    await ctx.db.updateTable("polls").set({ vote_count: 7 }).where("id", "=", b._id).execute();
    const first = await recomputeNewest(ctx);
    expect(first.order[0]).toBe(b._id);
    expect(first.order.slice(1)).toEqual([a._id, c._id].sort().reverse());
    const second = await recomputeNewest(ctx);
    expect(second.order).toEqual(first.order);
  });

  it("lists an open poll under edit with its last projection, and nothing else", async () => {
    await polls(ctx).deleteMany({});
    const editing = await seed({ title: "Edited", subtitle: "published", createdAt: minutesAgo(1) });
    await polls(ctx).updateOne({ _id: editing._id }, { $set: { pollState: "EDITING", pollStateBeforeEditUpdate: "OPEN" } });
    await seed({ title: "Private", pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" });
    const waiting = await seed({ title: "Waiting" });
    await polls(ctx).updateOne(
      { _id: waiting._id },
      { $set: { pollState: "WAITING TO OPEN", startAt: new Date(Date.now() + 3_600_000) } }
    );
    await seed({ title: "Closed", pollState: "CLOSED", endAt: minutesAgo(1) });
    await seed({ title: "Archived", pollState: "ARCHIVED" });
    const never = await seed({ title: "Never launched" });
    await ctx.db.updateTable("polls").set({ launched_at: null }).where("id", "=", never._id).execute();

    const listing = await recomputeNewest(ctx);
    expect(listing.order).toEqual([editing._id]);
    expect(listing.cardsObject.cards[editing._id]!.subtitle).toBe("published");
  });
});

describe("publication", () => {
  it("publishes the counts every run, the cards only when the set changed, with the live counts", async () => {
    await polls(ctx).deleteMany({});
    const a = await seed({ title: "a", createdAt: minutesAgo(2) });
    const puts: { key: string; cacheControl: string; contentEncoding?: string }[] = [];
    const store: ObjectStore = {
      put: async (key, _body, headers) => {
        puts.push({ key, cacheControl: headers.cacheControl, contentEncoding: headers.contentEncoding });
      }
    };
    const publisher = createListingPublisher(store, ctx.config.newestPollsRecomputeSweepIntervalMs, NEWEST_OBJECTS);

    expect(await publisher.publish(await recomputeNewest(ctx))).toEqual({ counts: true, cards: true });
    for (let i = 0; i < 3; i++) await countVote(ctx.cache, a._id, ["c1"], [], true);
    const listing = await recomputeNewest(ctx);
    expect(listing.countsObject.polls[0]).toMatchObject({ pid: a._id, voteCount: 3, countsVersion: 3, choiceCounts: { c1: 3 } });
    expect(await publisher.publish(listing)).toEqual({ counts: true, cards: false });
    await seed({ title: "b", createdAt: minutesAgo(1) });
    expect(await publisher.publish(await recomputeNewest(ctx))).toEqual({ counts: true, cards: true });

    expect(puts.map((p) => p.key)).toEqual([
      NEWEST_OBJECTS.counts, NEWEST_OBJECTS.cards,
      NEWEST_OBJECTS.counts,
      NEWEST_OBJECTS.counts, NEWEST_OBJECTS.cards
    ]);
    expect(puts.every((p) => p.cacheControl === "public, max-age=10" && p.contentEncoding === "gzip")).toBe(true);
  });
});

describe("life-cycle through the sweep", () => {
  const published = async () => JSON.parse((await readNewestObjects(ctx.cache))!.counts) as { polls: { pid: string }[] };
  const publishedCards = async () =>
    JSON.parse((await readNewestObjects(ctx.cache))!.cards) as { cards: Record<string, { subtitle: string }> };
  const sweep = () => newestSweep(ctx, ctx.config, ctx.newestPublisher);

  it("a launch heads the list; a close removes it; a re-open launches it again", async () => {
    await polls(ctx).deleteMany({});
    await seed({ title: "older", createdAt: minutesAgo(5) });
    const poll = await seed({ pollState: "WAITING TO OPEN", startAt: new Date(Date.now() + 3_600_000) });
    await sweep();
    expect((await published()).polls.map((p) => p.pid)).not.toContain(poll._id);

    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "OPEN", startAt: null } });
    await sweep();
    expect((await published()).polls[0]!.pid).toBe(poll._id);
    const first = await launchedAt(poll._id);

    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "CLOSED", endAt: new Date() } });
    await sweep();
    expect((await published()).polls.map((p) => p.pid)).not.toContain(poll._id);

    await new Promise((r) => setTimeout(r, 5));
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "OPEN", endAt: null } });
    await sweep();
    expect((await published()).polls[0]!.pid).toBe(poll._id);
    expect((await launchedAt(poll._id))!.getTime()).toBeGreaterThan(first!.getTime());
  });

  it("an edit keeps the poll in place with its old content until published", async () => {
    await polls(ctx).deleteMany({});
    await seed({ title: "newer", createdAt: minutesAgo(1) });
    const poll = await seed({ title: "edited", subtitle: "before", createdAt: minutesAgo(2) });
    await seed({ title: "oldest", createdAt: minutesAgo(3) });
    await sweep();
    expect((await published()).polls[1]!.pid).toBe(poll._id);

    await polls(ctx).updateOne({ _id: poll._id }, { $set: { pollState: "EDITING", pollStateBeforeEditUpdate: "OPEN" } });
    await sweep();
    expect((await published()).polls[1]!.pid).toBe(poll._id);
    expect((await publishedCards()).cards[poll._id]!.subtitle).toBe("before");

    await polls(ctx).updateOne(
      { _id: poll._id },
      { $set: { pollState: "OPEN", pollStateBeforeEditUpdate: null, subtitle: "after" } }
    );
    await sweep();
    expect((await published()).polls[1]!.pid).toBe(poll._id);
    expect((await publishedCards()).cards[poll._id]!.subtitle).toBe("after");
  });

  it("an edit to a future start removes the poll until it opens, when it is newly launched", async () => {
    await polls(ctx).deleteMany({});
    await seed({ title: "other", createdAt: minutesAgo(1) });
    const poll = await seed({ title: "rescheduled", createdAt: minutesAgo(2) });
    await polls(ctx).updateOne(
      { _id: poll._id },
      { $set: { pollState: "WAITING TO OPEN", startAt: new Date(Date.now() + 3_600_000) } }
    );
    await sweep();
    expect((await published()).polls.map((p) => p.pid)).not.toContain(poll._id);

    await polls(ctx).updateOne({ _id: poll._id }, { $set: { startAt: minutesAgo(1) } });
    await pollDateCheckSweep(ctx);
    await sweep();
    expect((await published()).polls[0]!.pid).toBe(poll._id);
  });
});

describe("instance routes", () => {
  it("answer not-ready before the first recompute, then serve both objects with a validator", async () => {
    for (const key of Object.values(NEWEST_KEYS)) await ctx.cache.del(key);
    const early = await request(ctx.app).get("/api/trending/newest-counts.json");
    expect(early.status).toBe(503);
    expect(early.body).toEqual({ error: "newest-not-ready", retryAfterMs: 5000 });

    await polls(ctx).deleteMany({});
    const a = await seed({ title: "served" });
    await newestSweep(ctx, ctx.config, ctx.newestPublisher);

    const counts = await request(ctx.app).get("/api/trending/newest-counts.json");
    expect(counts.status).toBe(200);
    expect(counts.headers["cache-control"]).toBe("public, max-age=10");
    expect(counts.headers.etag).toBeTruthy();
    expect(counts.body.polls[0].pid).toBe(a._id);
    expect((await request(ctx.app).get("/api/trending/newest-counts.json").set("If-None-Match", counts.headers.etag!)).status).toBe(304);
    const alias = await request(ctx.app).get("/api/trending/newest-counts");
    expect(alias.status).toBe(200);
    expect(alias.headers.etag).toBe(counts.headers.etag);

    const cards = await request(ctx.app).get("/api/trending/newest.json");
    expect(cards.status).toBe(200);
    expect(cards.body.membershipVersion).toBe(counts.body.membershipVersion);
    expect(cards.body.cards[a._id].title).toBe("served");
    expect((await request(ctx.app).get("/api/trending/newest-cards").set("If-None-Match", cards.headers.etag!)).status).toBe(304);
  });
});
