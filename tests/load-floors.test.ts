import express, { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { FLOOR_KEY, STRETCHED_KEY } from "../src/load/floors.js";

let ctx: TestContext;
let app: Express;

beforeAll(async () => {
  ctx = await startTestContext({
    ENV_MIN_SEARCH_INTERVAL: "300",
    ENV_MIN_MANUAL_REFRESH_INTERVAL: "500",
    ENV_MIN_LIVE_REFRESH_INTERVAL: "200",
    ENV_MIN_VOTE_INTERVAL: "250"
  });
  app = express();
  app.set("trust proxy", true);
  app.use(ctx.shedding.countInFlight);
  for (const kind of ["search", "refresh", "live", "vote"] as const) {
    app.post(`/${kind}`, ctx.shedding.withKind(kind), ctx.floors.enforceFloor(kind), (_req, res) => {
      res.json({ ok: true, nextRefreshMs: res.locals.nextRefreshMs });
    });
  }
});

afterAll(async () => {
  await ctx.stop();
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("per-kind floors", () => {
  it("serves the first request and refuses a second within the floor with 429, Retry-After and the remainder", async () => {
    const ip = "203.0.113.10";
    const first = await request(app).post("/search").set("X-Forwarded-For", ip);
    expect(first.status).toBe(200);
    expect(first.body.nextRefreshMs).toBe(300);
    const second = await request(app).post("/search").set("X-Forwarded-For", ip);
    expect(second.status).toBe(429);
    expect(second.body.error).toBe("too-soon");
    expect(second.body.retryAfterMs).toBeGreaterThan(0);
    expect(second.body.retryAfterMs).toBeLessThanOrEqual(300);
    expect(second.body.nextRefreshMs).toBe(300);
    expect(second.headers["retry-after"]).toBe("1");
    expect(await ctx.cache.pttl(FLOOR_KEY("search", `ip:${ip}`))).toBeGreaterThan(0);
    await sleep(320);
    expect((await request(app).post("/search").set("X-Forwarded-For", ip)).status).toBe(200);
  });

  it("keeps one key per kind, so a refresh is not blocked by a search", async () => {
    const ip = "203.0.113.11";
    expect((await request(app).post("/search").set("X-Forwarded-For", ip)).status).toBe(200);
    expect((await request(app).post("/refresh").set("X-Forwarded-For", ip)).status).toBe(200);
    expect((await request(app).post("/live").set("X-Forwarded-For", ip)).status).toBe(200);
    expect((await request(app).post("/vote").set("X-Forwarded-For", ip)).status).toBe(200);
    expect((await request(app).post("/refresh").set("X-Forwarded-For", ip)).status).toBe(429);
  });

  it("keys signed-in callers by session and guests by address", async () => {
    const ip = "203.0.113.12";
    const { cookie } = await forgeSession(ctx, "floors@example.com");
    expect((await request(app).post("/vote").set("X-Forwarded-For", ip)).status).toBe(200);
    const signedIn = await request(app).post("/vote").set("X-Forwarded-For", ip).set("Cookie", cookie);
    expect(signedIn.status).toBe(200);
    const again = await request(app).post("/vote").set("X-Forwarded-For", ip).set("Cookie", cookie);
    expect(again.status).toBe(429);
    const keys = await ctx.cache.scan("floor:vote:*");
    expect(keys).toContain(FLOOR_KEY("vote", `ip:${ip}`));
    expect(keys.some((k) => k.startsWith("floor:vote:s:"))).toBe(true);
  });

  it("a burst allowance serves that many back to back, then holds to one per floor (FIX008)", async () => {
    const burst = await startTestContext({
      ENV_MIN_MANUAL_REFRESH_INTERVAL: "400",
      ENV_MIN_SEARCH_INTERVAL: "300",
      ENV_MIN_VOTE_INTERVAL: "250",
      ENV_MANUAL_REFRESH_BURST: "3",
      ENV_SEARCH_BURST: "2"
    });
    const burstApp = express();
    burstApp.set("trust proxy", true);
    burstApp.use(burst.shedding.countInFlight);
    for (const kind of ["search", "refresh", "vote"] as const) {
      burstApp.post(`/${kind}`, burst.shedding.withKind(kind), burst.floors.enforceFloor(kind), (_req, res) => {
        res.json({ ok: true, nextRefreshMs: res.locals.nextRefreshMs });
      });
    }
    try {
      const ip = "203.0.113.20";
      const statuses = async (kind: string, n: number) => {
        const out: number[] = [];
        for (let i = 0; i < n; i++) out.push((await request(burstApp).post(`/${kind}`).set("X-Forwarded-For", ip)).status);
        return out;
      };
      expect(await statuses("refresh", 4)).toEqual([200, 200, 200, 429]);
      expect(await statuses("search", 3)).toEqual([200, 200, 429]);
      // Votes stay strictly one per interval.
      expect(await statuses("vote", 2)).toEqual([200, 429]);
      // One interval later one token is back — not the whole burst.
      await sleep(420);
      expect(await statuses("refresh", 2)).toEqual([200, 429]);
      const refused = await request(burstApp).post("/refresh").set("X-Forwarded-For", ip);
      expect(refused.body.error).toBe("too-soon");
      expect(refused.body.retryAfterMs).toBeGreaterThan(0);
      expect(refused.body.retryAfterMs).toBeLessThanOrEqual(400);
    } finally {
      await burst.stop();
    }
  });

  it("reports the stretched interval for a stretchable kind and the plain floor for votes", async () => {
    await ctx.cache.set("k:search", "4");
    await ctx.cache.set("k:live", "3");
    ctx.budget.forgetMultipliers();
    const search = await request(app).post("/search").set("X-Forwarded-For", "203.0.113.13");
    expect(search.body.nextRefreshMs).toBe(1200);
    const vote = await request(app).post("/vote").set("X-Forwarded-For", "203.0.113.13");
    expect(vote.body.nextRefreshMs).toBe(250);
    await ctx.cache.del("k:search");
    await ctx.cache.del("k:live");
    ctx.budget.forgetMultipliers();
  });

  it("refills searches and manual refreshes at the stretched interval and counts the refusals only the stretch caused (R9)", async () => {
    const statuses = async (kind: string, ip: string, n: number) => {
      const out: number[] = [];
      for (let j = 0; j < n; j++) out.push((await request(app).post(`/${kind}`).set("X-Forwarded-For", ip)).status);
      return out;
    };
    await ctx.cache.del(STRETCHED_KEY);
    await ctx.cache.set("k:refresh", "3");
    await ctx.cache.set("k:live", "3");
    ctx.budget.forgetMultipliers();
    try {
      // floor 500 ms × k 3 (this suite's burst is 1): the next request waits 1.5 s, not 0.5 s.
      expect(await statuses("refresh", "203.0.113.40", 1)).toEqual([200]);
      await sleep(600);
      const refused = await request(app).post("/refresh").set("X-Forwarded-For", "203.0.113.40");
      expect(refused.status).toBe(429);
      expect(refused.body.nextRefreshMs).toBe(1500);
      expect(Number(await ctx.cache.get(STRETCHED_KEY))).toBe(1);
      expect(await ctx.cache.pttl(STRETCHED_KEY)).toBeGreaterThan(9 * 60 * 1000);
      await sleep(1000);
      expect(await statuses("refresh", "203.0.113.40", 1)).toEqual([200]);

      // Live Results and votes keep their plain floors whatever k says.
      expect(await statuses("live", "203.0.113.41", 1)).toEqual([200]);
      await sleep(250);
      expect(await statuses("live", "203.0.113.41", 1)).toEqual([200]);

      await ctx.cache.set("k:refresh", "1");
      ctx.budget.forgetMultipliers();
      expect(await statuses("refresh", "203.0.113.42", 1)).toEqual([200]);
      await sleep(600);
      expect(await statuses("refresh", "203.0.113.42", 1)).toEqual([200]);
      expect(Number(await ctx.cache.get(STRETCHED_KEY))).toBe(1);
    } finally {
      await ctx.cache.del("k:refresh");
      await ctx.cache.del("k:live");
      ctx.budget.forgetMultipliers();
    }
  });
});
