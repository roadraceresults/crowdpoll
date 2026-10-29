import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { startSweeps } from "../src/polls/sweeps.js";
import { trendingSweep } from "../src/polls/sweeps.js";

let ctx: TestContext;
let cookie: string;
let adminCookie: string;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_ADMINS: "admin@example.com", ENV_MIN_MANUAL_REFRESH_INTERVAL: "1", ENV_MIN_SEARCH_REFRESH_INTERVAL: "1", ENV_MIN_LIVE_REFRESH_INTERVAL: "1" });
  cookie = (await forgeSession(ctx, "outage@example.com")).cookie;
  adminCookie = (await forgeSession(ctx, "admin@example.com")).cookie;
});

afterAll(async () => {
  ctx.cache.setDisconnected(false);
  await ctx.stop();
});

describe("while the shared cache is unreachable", () => {
  it("every dynamic request is 503 at once; the health check, the profile, static pages and the admin routes still answer; nothing falls back to the database", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    // The session is cached before the outage so the profile route can still answer.
    expect((await request(ctx.app).get("/api/me").set("Cookie", cookie)).status).toBe(200);
    expect((await request(ctx.app).get("/api/me").set("Cookie", adminCookie)).status).toBe(200);

    ctx.cache.setDisconnected(true);
    const before = ctx.queries.length;
    const started = Date.now();
    const dynamic = [
      request(ctx.app).post("/api/tabs/shared-with-you/refresh").set("Cookie", cookie).send({}),
      request(ctx.app).post("/api/tabs/watching/refresh").set("Cookie", cookie).send({}),
      request(ctx.app).post("/api/search").send({ q: "anything" }),
      request(ctx.app).post("/api/live/refresh").set("Cookie", cookie).send({}),
      request(ctx.app).post(`/api/polls/${poll._id}/vote`).set("Cookie", cookie).send({ choiceIds: ["c1"] }),
      request(ctx.app).get(`/api/me/polls?pids=${poll._id}`).set("Cookie", cookie)
    ];
    const answers = await Promise.all(dynamic);
    expect(Date.now() - started).toBeLessThan(1000);
    for (const res of answers) {
      expect(res.status).toBe(503);
      expect(res.body.error).toBe("busy");
      expect(res.body.retryAfterMs).toBeGreaterThan(0);
      expect(res.headers["retry-after"]).toBeTruthy();
    }
    const health = await request(ctx.app).get("/healthz");
    expect(health.status).toBe(200);
    expect(health.body.cache).toBe("down");

    expect((await request(ctx.app).get("/api/me").set("Cookie", cookie)).status).toBe(200);
    expect((await request(ctx.app).get("/")).status).toBe(200);
    expect((await request(ctx.app).get("/api/admin/polls").set("Cookie", adminCookie)).status).toBe(200);

    const writes = ctx.queries.slice(before).filter((q) => /^(insert|update|delete)/i.test(q));
    expect(writes).toEqual([]);
    expect(ctx.queries.slice(before).some((q) => /from "votes"/.test(q))).toBe(false);
    ctx.cache.setDisconnected(false);
    expect((await request(ctx.app).post("/api/search").send({ q: "anything" })).status).toBe(200);
  });

  it("sweeps and the consumer pause on disconnect and resume on reconnect", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const ticks: number[] = [];
    const sweeps = startSweeps(ctx, [
      { name: "probe", intervalMs: 20, lockId: 42, tick: async () => { ticks.push(Date.now()); return 0; } }
    ]);
    try {
      await new Promise((resolve) => setTimeout(resolve, 80));
      expect(ticks.length).toBeGreaterThan(0);
      ctx.cache.setDisconnected(true);
      await new Promise((resolve) => setTimeout(resolve, 40));
      const paused = ticks.length;
      await new Promise((resolve) => setTimeout(resolve, 80));
      expect(ticks.length).toBe(paused);
      expect(log.mock.calls.some((c) => String(c[0]).includes("[sweeps] paused"))).toBe(true);
      expect(log.mock.calls.some((c) => String(c[0]).includes("[votes] consumer paused"))).toBe(true);
      ctx.cache.setDisconnected(false);
      await new Promise((resolve) => setTimeout(resolve, 80));
      expect(ticks.length).toBeGreaterThan(paused);
      expect(log.mock.calls.some((c) => String(c[0]).includes("[sweeps] resumed"))).toBe(true);
      expect(log.mock.calls.some((c) => String(c[0]).includes("[votes] consumer resumed"))).toBe(true);
    } finally {
      sweeps.stop();
      log.mockRestore();
    }
  });
});
