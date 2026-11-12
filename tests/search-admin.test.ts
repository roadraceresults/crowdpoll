import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { planNodes, seqScansOfPolls } from "./helpers/explain.js";
import { adminSearchQuery, dayStartUtc, dayWindow, parseAdminSearch, type AdminSearchFilters } from "../src/search/adminSearch.js";
import { flushDirty, countVote } from "../src/polls/counters.js";

let ctx: TestContext;
let cookie: string;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_ADMINS: "admin@example.com", ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS: "3" });
  cookie = (await forgeSession(ctx, "admin@example.com")).cookie;
});

afterAll(async () => {
  await ctx.stop();
});

beforeEach(async () => {
  await polls(ctx).deleteMany({});
});

const search = (params: Record<string, string>) =>
  request(ctx.app).get("/api/admin/polls/search").query(params).set("Cookie", cookie);
const pids = (res: request.Response): string[] => res.body.polls.map((p: { pid: string }) => p.pid);

async function setCreator(pid: string, name: string) {
  await ctx.db.updateTable("polls").set({ created_by_name: name, created_by_id: `id-${name}` }).where("id", "=", pid).execute();
}

describe("day windows in the administrator's zone", () => {
  it("computes the UTC start of a calendar day in a non-UTC zone, across a DST change", () => {
    expect(dayStartUtc("2026-01-15", "America/New_York").toISOString()).toBe("2026-01-15T05:00:00.000Z");
    expect(dayStartUtc("2026-07-15", "America/New_York").toISOString()).toBe("2026-07-15T04:00:00.000Z");
    expect(dayStartUtc("2026-03-08", "America/New_York").toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(dayStartUtc("2026-03-09", "America/New_York").toISOString()).toBe("2026-03-09T04:00:00.000Z");
    expect(dayStartUtc("2026-06-01", "Australia/Sydney").toISOString()).toBe("2026-05-31T14:00:00.000Z");
    const eq = dayWindow({ op: "eq", day: "2026-03-08" }, "America/New_York");
    expect(eq.from!.toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(eq.to!.toISOString()).toBe("2026-03-09T04:00:00.000Z");
    expect(dayWindow({ op: "gte", day: "2026-03-08" }, "UTC").to).toBeNull();
    expect(dayWindow({ op: "lte", day: "2026-03-08" }, "UTC").from).toBeNull();
  });

  it("parses the query string, ignoring blanks and refusing malformed controls", () => {
    expect(parseAdminSearch({ q: " ", state: "", createdBy: "dav" })).toMatchObject({ q: undefined, state: undefined, createdBy: "dav" });
    expect(parseAdminSearch({ createdAt: "eq:2026-01-01", tz: "UTC" }).createdAt).toEqual({ op: "eq", day: "2026-01-01" });
    expect(() => parseAdminSearch({ createdAt: "eq:2026-01-01" })).toThrow(/tz/);
    expect(() => parseAdminSearch({ voteCount: "gt:5" })).toThrow(/operator/);
    expect(() => parseAdminSearch({ startAt: "eq:yesterday", tz: "UTC" })).toThrow(/YYYY-MM-DD/);
  });

  it("reads each checkbox as true only, ignoring a blank and refusing anything else", () => {
    expect(parseAdminSearch({ lineGraphEnabled: "true" }).lineGraphEnabled).toBe(true);
    expect(parseAdminSearch({ lineGraphEnabled: " " }).lineGraphEnabled).toBeUndefined();
    expect(parseAdminSearch({}).lineGraphEnabled).toBeUndefined();
    expect(() => parseAdminSearch({ lineGraphEnabled: "false" })).toThrow(`Invalid lineGraphEnabled "false"; expected true.`);
    expect(parseAdminSearch({ customColors: "true" }).customColors).toBe(true);
    expect(parseAdminSearch({ customColors: "" }).customColors).toBeUndefined();
    expect(() => parseAdminSearch({ customColors: "yes" })).toThrow(`Invalid customColors "yes"; expected true.`);
  });
});

describe("GET /api/admin/polls/search", () => {
  it("every control alone and combined, ANDed, newest first, with the truncated flag", async () => {
    const base = Date.now() - 86_400_000;
    const a = makePoll({ title: "Alpha budget", pollState: "OPEN", createdAt: new Date(base + 1000), choiceMode: "Multiple-Choice Poll" });
    const b = makePoll({ title: "Beta budget", pollState: "CLOSED", createdAt: new Date(base + 2000), voteMutability: "Dynamic-Vote Poll" });
    const c = makePoll({ title: "Gamma", pollState: "OPEN", pollVisibility: "Private Poll", createdAt: new Date(base + 3000), invitedVoterList: ["x@example.com", "y@example.com"], bannedVoterList: ["z@example.com"] });
    const d = makePoll({ title: "Delta budget", pollState: "OPEN", createdAt: new Date(base + 4000) });
    await polls(ctx).insertMany([a, b, c, d]);
    await setCreator(a._id, "David");
    await setCreator(b._id, "Sandra");
    await setCreator(c._id, "davina");
    await setCreator(d._id, "Bob");

    expect(pids(await search({}))).toEqual([d._id, c._id, b._id]);
    expect((await search({})).body.truncated).toBe(true);
    expect(pids(await search({ q: "budget" }))).toEqual([d._id, b._id, a._id]);
    expect(pids(await search({ state: "CLOSED" }))).toEqual([b._id]);
    expect(pids(await search({ visibility: "Private Poll" }))).toEqual([c._id]);
    expect(pids(await search({ choiceMode: "Multiple-Choice Poll" }))).toEqual([a._id]);
    expect(pids(await search({ voteMutability: "Dynamic-Vote Poll" }))).toEqual([b._id]);
    expect(pids(await search({ createdBy: "DAV" }))).toEqual([c._id, a._id]);
    expect(pids(await search({ state: "OPEN", createdBy: "dav" }))).toEqual([c._id, a._id]);
    expect(pids(await search({ state: "OPEN", createdBy: "dav", q: "budget" }))).toEqual([a._id]);
    expect(pids(await search({ invitedVoterCount: "gte:2" }))).toEqual([c._id]);
    expect(pids(await search({ bannedVoterCount: "eq:1" }))).toEqual([c._id]);
    expect(pids(await search({ bannedVoterCount: "lte:0" }))).toEqual([d._id, b._id, a._id]);
    expect((await search({ voteCount: "gt:1" })).status).toBe(400);
    expect((await request(ctx.app).get("/api/admin/polls/search")).status).toBe(403);
  });

  it("Line graph enabled keeps only polls with the line graph on, ANDed with the other controls", async () => {
    const base = Date.now() - 86_400_000;
    const plain = makePoll({ title: "Plain", createdAt: new Date(base + 1000) });
    const graphFinal = makePoll({ title: "Graph final", lineGraphEnabled: true, createdAt: new Date(base + 2000) });
    const graphDynamic = makePoll({ title: "Graph dynamic", lineGraphEnabled: true, voteMutability: "Dynamic-Vote Poll", createdAt: new Date(base + 3000) });
    await polls(ctx).insertMany([plain, graphFinal, graphDynamic]);
    expect(pids(await search({ lineGraphEnabled: "true" }))).toEqual([graphDynamic._id, graphFinal._id]);
    expect(pids(await search({ lineGraphEnabled: "true", voteMutability: "Final-Vote Poll" }))).toEqual([graphFinal._id]);
    expect(pids(await search({ lineGraphEnabled: "" }))).toEqual([graphDynamic._id, graphFinal._id, plain._id]);
    expect(pids(await search({}))).toEqual([graphDynamic._id, graphFinal._id, plain._id]);
    const refused = await search({ lineGraphEnabled: "1" });
    expect(refused.status).toBe(400);
    expect(refused.body.error).toBe(`Invalid lineGraphEnabled "1"; expected true.`);
  });

  it("Custom colors set keeps only polls with a hand-picked color on a saved choice, never a pending one", async () => {
    const base = Date.now() - 86_400_000;
    const automatic = makePoll({ title: "Automatic", createdAt: new Date(base + 1000) });
    const oneColor = makePoll({
      title: "One color",
      lineGraphEnabled: true,
      createdAt: new Date(base + 2000),
      choices: [
        { id: "c1", label: "Red", position: 0, color: "#F91010" },
        { id: "c2", label: "Automatic", position: 1 },
        { id: "c3", label: "Added by a voter", position: 2, addedBy: "voter-1" }
      ]
    });
    const allColors = makePoll({
      title: "All colors",
      createdAt: new Date(base + 3000),
      choices: [
        { id: "c1", label: "Red", position: 0, color: "#F91010" },
        { id: "c2", label: "Blue", position: 1, color: "#0808FD" }
      ]
    });
    const pendingOnly = makePoll({
      title: "Pending colors",
      createdAt: new Date(base + 4000),
      pendingUpdate: { choices: [{ id: "c1", label: "Red", position: 0, color: "#F91010" }] }
    });
    await polls(ctx).insertMany([automatic, oneColor, allColors, pendingOnly]);
    expect(pids(await search({ customColors: "true" }))).toEqual([allColors._id, oneColor._id]);
    expect(pids(await search({ customColors: "true", lineGraphEnabled: "true" }))).toEqual([oneColor._id]);
    expect((await search({ customColors: "false" })).status).toBe(400);
  });

  it("day windows use the administrator's zone and NULL dates never match", async () => {
    const created = new Date("2026-03-09T03:30:00.000Z");
    const withStart = makePoll({ title: "Scheduled", createdAt: created, startAt: new Date("2026-03-09T12:00:00.000Z"), endAt: null });
    const noDates = makePoll({ title: "Unscheduled", createdAt: created, startAt: null, endAt: null });
    await polls(ctx).insertMany([withStart, noDates]);
    expect(pids(await search({ createdAt: "eq:2026-03-08", tz: "America/New_York" })).sort()).toEqual([withStart._id, noDates._id].sort());
    expect(pids(await search({ createdAt: "eq:2026-03-09", tz: "UTC" })).sort()).toEqual([withStart._id, noDates._id].sort());
    expect(pids(await search({ createdAt: "eq:2026-03-09", tz: "America/New_York" }))).toEqual([]);
    expect(pids(await search({ startAt: "gte:2026-03-09", tz: "UTC" }))).toEqual([withStart._id]);
    expect(pids(await search({ startAt: "lte:2026-03-09", tz: "UTC" }))).toEqual([withStart._id]);
    expect(pids(await search({ endAt: "lte:2030-01-01", tz: "UTC" }))).toEqual([]);
    expect((await search({ createdAt: "eq:2026-03-09" })).status).toBe(400);
  });

  it("counter comparisons read the flushed counts", async () => {
    const poll = makePoll({ title: "Counted" });
    await polls(ctx).insertOne(poll);
    for (let i = 0; i < 3; i++) await countVote(ctx.cache, poll._id, ["c1"], [], true);
    expect(pids(await search({ voteCount: "gte:3" }))).toEqual([]);
    await flushDirty(ctx);
    expect(pids(await search({ voteCount: "gte:3" }))).toEqual([poll._id]);
    expect(pids(await search({ voteCount: "lte:2" }))).toEqual([]);
  });

  it("every filter combination is answered from an index", async () => {
    for (let i = 0; i < 200; i++) {
      await polls(ctx).insertOne(makePoll({
        title: `Combination ${i}`,
        pollState: i % 2 ? "OPEN" : "CLOSED",
        createdAt: new Date(Date.now() - i * 60_000),
        lineGraphEnabled: i % 10 === 0,
        ...(i % 15 === 0 ? { choices: [{ id: "c1", label: "Red", position: 0, color: "#F91010" }] } : {})
      }));
    }
    await sql`analyze polls`.execute(ctx.db);
    await sql`set enable_seqscan = off`.execute(ctx.db);
    const controls: AdminSearchFilters[] = [
      { q: "combination" },
      { state: "OPEN" },
      { visibility: "Public Poll" },
      { choiceMode: "Single-Choice Poll" },
      { voteMutability: "Final-Vote Poll" },
      { lineGraphEnabled: true },
      { customColors: true },
      { createdBy: "dav" },
      { createdAt: { op: "gte", day: "2026-01-01" }, tz: "UTC" },
      { startAt: { op: "lte", day: "2026-12-31" }, tz: "UTC" },
      { endAt: { op: "eq", day: "2026-06-01" }, tz: "UTC" },
      { voteCount: { op: "gte", n: 1 } },
      { invitedVoterCount: { op: "lte", n: 3 } },
      { bannedVoterCount: { op: "eq", n: 0 } }
    ];
    const offenders: string[] = [];
    for (let i = 0; i < controls.length; i++) {
      for (let j = i; j < controls.length; j++) {
        const filters = { ...controls[i], ...controls[j] };
        const nodes = await planNodes(adminSearchQuery(ctx.db, filters, 200));
        if (seqScansOfPolls(nodes).length > 0) offenders.push(JSON.stringify(filters));
      }
    }
    expect(offenders).toEqual([]);
    const indexOf = async (filters: AdminSearchFilters) =>
      (await planNodes(adminSearchQuery(ctx.db, filters, 200))).map((n) => (n as { "Index Name"?: string })["Index Name"]).filter(Boolean);
    expect(await indexOf({ lineGraphEnabled: true })).toContain("polls_line_graph_created");
    expect(await indexOf({ customColors: true })).toContain("polls_custom_colors_created");
    await sql`set enable_seqscan = on`.execute(ctx.db);
  });
});
