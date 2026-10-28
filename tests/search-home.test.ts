import { sql } from "kysely";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { createSearch, normaliseQuery, searchCacheKey } from "../src/search/search.js";
import { drainOutbox, reindexAll, searchText } from "../src/search/outbox.js";
import type { OpenSearchEngine, PollDocument } from "../src/search/openSearch.js";
import { updatePoll } from "../src/polls/store.js";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestContext({
    ENV_MAX_POLLS_SEARCH_RESULTS: "3",
    ENV_MAX_NEWEST_POLLS: "3",
    ENV_MIN_SEARCH_INTERVAL: "300",
    ENV_SEARCH_CACHE_TTL: "10000"
  });
});

afterAll(async () => {
  await ctx.stop();
});

beforeEach(async () => {
  await polls(ctx).deleteMany({});
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
  for (const key of await ctx.cache.scan("search:*")) await ctx.cache.del(key);
});

const search = (q: string, ip = "198.51.100.1") =>
  request(ctx.app).post("/api/search").set("X-Forwarded-For", ip).send({ q });

const pids = (res: request.Response): string[] => res.body.results.map((r: { pid: string }) => r.pid);

describe("home search on PostgreSQL full-text", () => {
  it("finds a distinctive word first and ranks title above subtitle above choices", async () => {
    const inTitle = makePoll({ title: "Zebra crossing rules", subtitle: "" });
    const inSubtitle = makePoll({ title: "Road safety", subtitle: "About the zebra crossing" });
    const inChoices = makePoll({ title: "Animals", choices: [{ id: "c1", label: "Zebra", position: 0 }, { id: "c2", label: "Lion", position: 1 }] });
    const unrelated = makePoll({ title: "Best biscuit" });
    for (const p of [unrelated, inChoices, inSubtitle, inTitle]) await polls(ctx).insertOne(p);
    const res = await search("zebra");
    expect(res.status).toBe(200);
    expect(pids(res)).toEqual([inTitle._id, inSubtitle._id, inChoices._id]);
    expect(res.body.truncated).toBe(false);
    expect(typeof res.body.nextRefreshMs).toBe("number");
    expect(res.body.results[0]).not.toHaveProperty("overlay");
    expect(res.body.results[0].counts).toEqual({ voteCount: 0, choiceCounts: {}, countsVersion: 0 });
  });

  it("answers an AND match first, then OR matches, then a misspelt title", async () => {
    const both = makePoll({ title: "Coffee and tea preferences" });
    const coffeeOnly = makePoll({ title: "Coffee strength" });
    const teaOnly = makePoll({ title: "Tea temperature" });
    for (const p of [teaOnly, coffeeOnly, both]) await polls(ctx).insertOne(p);
    const res = await search("coffee tea");
    expect(pids(res)[0]).toBe(both._id);
    expect(new Set(pids(res).slice(1))).toEqual(new Set([coffeeOnly._id, teaOnly._id]));

    const typo = await search("coffe strenght", "198.51.100.2");
    expect(pids(typo)).toContain(coffeeOnly._id);
  });

  it("stays within the home scope: private, never-public and archived polls are absent, a public poll under edit is present", async () => {
    const invitation = makePoll({ title: "Secret garden", pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" });
    const link = makePoll({ title: "Secret link", pollVisibility: "Private Poll" });
    const draft = makePoll({ title: "Secret draft", pollState: "INITIALIZED" });
    const archived = makePoll({ title: "Secret archive", pollState: "ARCHIVED" });
    const editing = makePoll({ title: "Secret edit", pollState: "EDITING", pollStateBeforeEditUpdate: "OPEN" });
    const closed = makePoll({ title: "Secret closed", pollState: "CLOSED" });
    for (const p of [invitation, link, draft, archived, editing, closed]) await polls(ctx).insertOne(p);
    const res = await search("secret");
    expect(new Set(pids(res))).toEqual(new Set([editing._id, closed._id]));
  });

  it("reports truncation at the cap and answers an identical query from the cache within the ttl", async () => {
    for (let i = 0; i < 5; i++) await polls(ctx).insertOne(makePoll({ title: `Common word ${i}` }));
    const first = await search("common");
    expect(pids(first)).toHaveLength(3);
    expect(first.body.truncated).toBe(true);
    const key = searchCacheKey("home", normaliseQuery("  Common "));
    expect(await ctx.cache.get(key)).not.toBeNull();
    const queriesBefore = ctx.queries.filter((q) => q.includes("websearch_to_tsquery")).length;
    const second = await search("  COMMON ", "198.51.100.9");
    expect(pids(second)).toEqual(pids(first));
    expect(ctx.queries.filter((q) => q.includes("websearch_to_tsquery")).length).toBe(queriesBefore);
  });

  it("refuses a signed-in searcher without the View Polls grant, and still answers a guest", async () => {
    await polls(ctx).insertOne(makePoll({ title: "Zebra crossing rules" }));
    const barred = await forgeSession(ctx, "search-no-view@example.com");
    await ctx.db.updateTable("user").set({ permissions: ["Vote on Polls"] }).where("id", "=", barred.userId).execute();
    const refused = await request(ctx.app).post("/api/search").set("Cookie", barred.cookie).set("X-Forwarded-For", "198.51.100.7").send({ q: "zebra" });
    expect(refused.status).toBe(403);
    expect(refused.body).toEqual({ error: "You do not have permission to view polls.", code: "no-view-permission" });
    const guest = await search("zebra", "198.51.100.8");
    expect(guest.status).toBe(200);
  });

  it("refuses a second search within the search floor with 429", async () => {
    await polls(ctx).insertOne(makePoll({ title: "Floor" }));
    expect((await search("floor", "198.51.100.3")).status).toBe(200);
    const early = await search("floor again", "198.51.100.3");
    expect(early.status).toBe(429);
    expect(early.body).toMatchObject({ error: "too-soon" });
  });

  it("the manual Refresh of a search uses the refresh floor and still counts a miss against the search sub-budget", async () => {
    await polls(ctx).insertOne(makePoll({ title: "Budgeted" }));
    const before = await ctx.budget.engineQueriesInSecond(Math.floor(Date.now() / 1000));
    const res = await request(ctx.app).post("/api/search/refresh").set("X-Forwarded-For", "198.51.100.4").send({ q: "budgeted" });
    expect(res.status).toBe(200);
    const second = Math.floor(Date.now() / 1000);
    const after = (await ctx.budget.engineQueriesInSecond(second)) + (await ctx.budget.engineQueriesInSecond(second - 1));
    expect(after).toBeGreaterThanOrEqual(before + 1);
    const key = searchCacheKey("home", "budgeted");
    expect(await ctx.cache.get(key)).not.toBeNull();
  });

  it("the application's search text equals the input of the stored search expression", async () => {
    const poll = makePoll({ title: "Weighted text", subtitle: "A subtitle", choices: [{ id: "c1", label: "Alpha", position: 0 }, { id: "c2", label: "Beta", position: 1 }] });
    await polls(ctx).insertOne(poll);
    const row = await ctx.db.selectFrom("polls").selectAll().where("id", "=", poll._id).executeTakeFirstOrThrow();
    const text = searchText(row);
    const { rows } = await sql<{ same: boolean }>`
      select (
        setweight(to_tsvector('english', ${text.title}), 'A') ||
        setweight(to_tsvector('english', ${text.subtitle}), 'B') ||
        setweight(to_tsvector('english', ${text.choiceLabels}), 'C') ||
        setweight(to_tsvector('english', ${text.keywords}), 'D')
      )::text = (select search::text from polls where id = ${poll._id}) as same`.execute(ctx.db);
    expect(rows[0]!.same).toBe(true);
  });
});

function stubEngine(healthy: () => boolean) {
  const calls: { queries: string[]; upserts: PollDocument[]; deletes: string[] } = { queries: [], upserts: [], deletes: [] };
  const engine: OpenSearchEngine = {
    name: "opensearch",
    ensureIndex: async () => {},
    healthy: async () => healthy(),
    query: async (_scope, text) => {
      calls.queries.push(text);
      return [{ pid: "from-opensearch" }];
    },
    bulk: async (upserts, deletes) => {
      calls.upserts.push(...upserts);
      calls.deletes.push(...deletes);
    }
  };
  return { engine, calls };
}

describe("engine selection and the outbox", () => {
  it("falls back to PostgreSQL when the OpenSearch probe reports unhealthy, and returns once it is healthy", async () => {
    const poll = makePoll({ title: "Fallback subject" });
    await polls(ctx).insertOne(poll);
    let healthy = false;
    const { engine, calls } = stubEngine(() => healthy);
    const search = createSearch({ db: ctx.db, cache: ctx.cache, config: ctx.config, openSearch: engine });
    expect(await search.servingEngine()).toBe("postgres");
    const viaPostgres = await search.search("home", "fallback", 3);
    expect(viaPostgres.rows.map((r) => r.id)).toEqual([poll._id]);
    expect(calls.queries).toEqual([]);

    healthy = true;
    expect(await search.servingEngine()).toBe("opensearch");
    await search.search("home", "fallback again", 3);
    expect(calls.queries).toEqual(["fallback again"]);
  });

  it("the drain coalesces per poll, indexes home-listable polls and removes the others", async () => {
    const listed = makePoll({ title: "Listed" });
    const hidden = makePoll({ title: "Hidden", pollVisibility: "Private Poll" });
    await polls(ctx).insertOne(listed);
    await polls(ctx).insertOne(hidden);
    await ctx.db.deleteFrom("search_outbox").execute();
    await updatePoll(ctx, listed._id, { title: "Listed once" });
    await updatePoll(ctx, listed._id, { title: "Listed twice" });
    await updatePoll(ctx, hidden._id, { title: "Hidden twice" });
    expect(await ctx.db.selectFrom("search_outbox").selectAll().execute()).toHaveLength(2);

    const { engine, calls } = stubEngine(() => true);
    expect(await drainOutbox(ctx.db, engine)).toBe(2);
    expect(calls.upserts.map((d) => d.pid)).toEqual([listed._id]);
    expect(calls.upserts[0]!.title).toBe("Listed twice");
    expect(calls.deletes).toEqual([hidden._id]);
    expect(await ctx.db.selectFrom("search_outbox").selectAll().execute()).toHaveLength(0);

    expect(await reindexAll(ctx.db)).toBe(1);
    expect(await drainOutbox(ctx.db, null)).toBe(1);
  });
});
