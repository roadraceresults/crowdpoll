/**
 * GET /api/polls/:pid/line-graph — access matrix, every available scale in one response,
 * its shape (contracts/api.md A1), cache sharing, and the two settings served by
 * GET /api/config (A2). Every refusal is the same 404, so a probe cannot tell
 * a private poll from a missing one.
 */
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls, voteHistory } from "./helpers/poll-fixtures.js";
import type { Poll } from "../src/polls/store.js";

let ctx: TestContext;
let me: { cookie: string; userId: string };
const meEmail = "line-graph@example.com";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1", ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE: "1" });
  me = await forgeSession(ctx, meEmail);
});
afterAll(async () => {
  await ctx.stop();
});
beforeEach(async () => {
  await polls(ctx).deleteMany({});
  for (const key of await ctx.cache.scan("line-graph:*")) await ctx.cache.del(key);
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
});

const graph = (pid: string, query = "", cookie?: string) => {
  const req = request(ctx.app).get(`/api/polls/${pid}/line-graph${query}`);
  return cookie ? req.set("Cookie", cookie) : req;
};

async function seed(overrides: Partial<Poll> = {}): Promise<Poll> {
  const poll = makePoll({ _id: randomUUID(), lineGraphEnabled: true, ...overrides });
  await polls(ctx).insertOne(poll);
  return poll;
}

type Scale = { buckets: number[]; series: { id: string; label: string; color: string | null; points: number[] }[] };
/** One scale of a served body; its default scale when none is named. */
const view = (body: { defaultScale: string; scales: Record<string, Scale> }, scale = body.defaultScale): Scale => body.scales[scale]!;

const vote = (pid: string, email: string, choiceIds: string[], agoMs: number) =>
  voteHistory(ctx).insertOne({ pid, emailAddress: email, userName: "", choiceIds, votedAt: new Date(Date.now() - agoMs) });

describe("access", () => {
  it("serves a public published poll to a guest, a banned user, an invited user and the creator", async () => {
    const pub = await seed({ bannedVoterList: [meEmail] });
    expect((await graph(pub._id)).status).toBe(200);
    expect((await graph(pub._id, "", me.cookie)).status).toBe(200);

    const invited = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: [meEmail] });
    expect((await graph(invited._id, "", me.cookie)).status).toBe(200);

    const own = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" });
    await ctx.db.updateTable("polls").set({ created_by_id: me.userId }).where("id", "=", own._id).execute();
    expect((await graph(own._id, "", me.cookie)).status).toBe(200);
  });

  it("answers every refusal with the same 404 body", async () => {
    const privateLink = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link" });
    const uninvited = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: ["x@example.com"] });
    const draft = await seed({ pollState: "INITIALIZED" });
    const refusals = [
      graph(privateLink._id), // guest, private
      graph(uninvited._id, "", me.cookie),
      graph(draft._id, "", me.cookie), // unpublished
      graph(randomUUID()), // unknown pid
      graph("not-a-pid") // malformed pid
    ];
    for (const pending of refusals) {
      const res = await pending;
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Not found" });
    }
  });
});

describe("scales", () => {
  it("serves every available scale in one response, the largest as the default", async () => {
    const poll = await seed();
    await vote(poll._id, "old@example.com", ["c1"], 32 * DAY);
    await vote(poll._id, "new@example.com", ["c2"], HOUR);

    const res = await graph(poll._id);
    expect(res.status).toBe(200);
    expect(res.body.defaultScale).toBe("1y");
    expect(res.body.availableScales).toEqual(["1d", "1w", "1m", "1y"]);
    expect(Object.keys(res.body.scales).sort()).toEqual(["1d", "1m", "1w", "1y"]);
    for (const scale of ["1d", "1w"]) for (const t of view(res.body, scale).buckets.slice(0, -1)) expect(t % HOUR).toBe(0);
    for (const scale of ["1m", "1y"]) for (const t of view(res.body, scale).buckets.slice(0, -1)) expect(t % DAY).toBe(0);
    expect(view(res.body, "1d").buckets.length).toBe(25);
    for (const scale of res.body.availableScales as string[]) {
      const last = view(res.body, scale).series.map((s) => s.points[s.points.length - 1]);
      expect(last).toEqual([50, 50]);
    }
  });

  it("offers only what the span supports", async () => {
    const young = await seed();
    await vote(young._id, "a@example.com", ["c1"], 2 * HOUR);
    const res = await graph(young._id);
    expect(res.body.defaultScale).toBe("1d");
    expect(res.body.availableScales).toEqual(["1d"]);
    expect(Object.keys(res.body.scales)).toEqual(["1d"]);
  });

  it("ignores a scale in the query string", async () => {
    const poll = await seed();
    await vote(poll._id, "a@example.com", ["c1"], 2 * HOUR);
    const plain = await graph(poll._id);
    for (const key of await ctx.cache.scan("line-graph:*")) await ctx.cache.del(key);
    const queried = await graph(poll._id, "?scale=1m");
    expect(queried.status).toBe(200);
    expect(queried.body.availableScales).toEqual(plain.body.availableScales);
  });
});

describe("response shape (contracts/api.md A1)", () => {
  it("pairs ascending UTC buckets with per-choice integer points, manual colour else null, no store", async () => {
    const poll = await seed({
      choices: [
        { id: "c1", label: "Plain", position: 0 },
        { id: "c2", label: "Coloured", position: 1, color: "#0808FD" }
      ]
    });
    await vote(poll._id, "a@example.com", ["c1"], 3 * HOUR);
    await vote(poll._id, "b@example.com", ["c2"], 2 * HOUR);
    await vote(poll._id, "c@example.com", ["c1"], HOUR);

    const res = await graph(poll._id);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    const { buckets, series } = view(res.body);
    const totalVoted = res.body.totalVoted as number;
    expect(buckets).toEqual([...buckets].sort((a, b) => a - b));
    for (const t of buckets.slice(0, -1)) expect(t % HOUR).toBe(0);
    expect(series.map((s) => s.id)).toEqual(["c1", "c2"]);
    expect(series.map((s) => s.color)).toEqual([null, "#0808FD"]);
    for (const s of series) {
      expect(s.points.length).toBe(buckets.length);
      for (const p of s.points) expect(Number.isInteger(p)).toBe(true);
    }
    expect(totalVoted).toBe(3);
    expect(series[0]!.points[buckets.length - 1]).toBe(67);
    expect(series[1]!.points[buckets.length - 1]).toBe(33);
  });

  it("answers 200 with the data it has when the poll cannot fill two buckets", async () => {
    const empty = await seed();
    const res = await graph(empty._id);
    expect(res.status).toBe(200);
    expect(res.body.defaultScale).toBe("1d");
    expect(view(res.body).buckets.length).toBeLessThan(2);
    expect(res.body.totalVoted).toBe(0);
    expect(view(res.body).series).toEqual([]);
  });

  it("counts an anonymized deleted-account voter once, as deleteAccount rewrites vote_history", async () => {
    const poll = await seed();
    const placeholder = `deleted-${randomUUID()}@deleted.invalid`;
    await vote(poll._id, placeholder, ["c1"], 3 * HOUR);
    await vote(poll._id, placeholder, ["c2"], 2 * HOUR);
    await vote(poll._id, "kept@example.com", ["c1"], HOUR);
    const res = await graph(poll._id);
    expect(res.body.totalVoted).toBe(2);
    const last = Object.fromEntries(
      view(res.body).series.map((s) => [s.id, s.points[s.points.length - 1]])
    );
    expect(last).toEqual({ c1: 50, c2: 50 });
  });
});

describe("caching (research R5)", () => {
  const replayQueries = () => ctx.queries.filter((q) => q.trimStart().startsWith("select") && q.includes("from line_graph_tally")).length;
  const historyLoads = () =>
    ctx.queries.filter((q) => q.trimStart().startsWith("select") && q.includes("vote_history") && q.includes("choice_ids")).length;

  it("sums the hourly tally and never loads the poll's vote history", async () => {
    const poll = await seed();
    await vote(poll._id, "a@example.com", ["c1"], 3 * HOUR);
    await vote(poll._id, "b@example.com", ["c2"], 2 * HOUR);
    const before = historyLoads();
    const res = await graph(poll._id);
    expect(res.status).toBe(200);
    expect(historyLoads()).toBe(before);
    expect(res.body.totalVoted).toBe(2);
  });

  it("computes once per TTL — a second request inside it is served from the cache", async () => {
    const poll = await seed();
    await vote(poll._id, "a@example.com", ["c1"], 2 * HOUR);
    const before = replayQueries();
    const first = await graph(poll._id);
    expect(first.status).toBe(200);
    expect(replayQueries()).toBe(before + 1);
    const second = await graph(poll._id, "", me.cookie);
    expect(second.status).toBe(200);
    expect(replayQueries()).toBe(before + 1);
    expect(second.body).toEqual(first.body);
  });

  it("checks access on every request, before the cache", async () => {
    const hidden = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: [meEmail] });
    await vote(hidden._id, "a@example.com", ["c1"], 2 * HOUR);
    expect((await graph(hidden._id, "", me.cookie)).status).toBe(200);
    expect((await graph(hidden._id)).status).toBe(404);
  });
});

describe("GET /api/config (contracts/api.md A2)", () => {
  it("serves the two line-graph settings, the interval post-clamp", async () => {
    const res = await request(ctx.app).get("/api/config");
    expect(res.body.lineGraphMinVotePercentage).toBe(1);
    expect(res.body.lineGraphRefreshIntervalMs).toBe(60_000);
  });
});
