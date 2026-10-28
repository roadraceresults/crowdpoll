import express, { type Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { createHealthRouter } from "../src/routes/healthz.js";

let ctx: TestContext;
let app: Express;
const held: Array<() => void> = [];
const releaseHeld = () => {
  for (const release of held.splice(0)) release();
};

beforeAll(async () => {
  ctx = await startTestContext({ ENV_INSTANCE_MAX_INFLIGHT: "10", ENV_SHED_RETRY_AFTER: "2000" });
  app = express();
  app.use(createHealthRouter({ cache: ctx.cache, shedding: ctx.shedding, abuseCounts: () => ({ ipVoteCap: 0 }) }));
  app.use(ctx.shedding.countInFlight);
  for (const kind of ["search", "refresh", "live", "vote"] as const) {
    app.get(`/${kind}`, ctx.shedding.withKind(kind), (_req, res) => {
      res.json({ kind, nextRefreshMs: res.locals.nextRefreshMs });
    });
  }
  app.get("/hold", (_req, res) => {
    held.push(() => res.json({ held: true }));
  });
  app.use(ctx.shedding.shedOther);
  app.get("/other", (_req, res) => {
    res.json({ kind: "other" });
  });
});

afterAll(async () => {
  releaseHeld();
  await ctx.stop();
});

async function hold(n: number): Promise<void> {
  const target = ctx.shedding.inFlight() + n;
  for (let i = 0; i < n; i++) void request(app).get("/hold").then(() => undefined);
  const started = Date.now();
  while (ctx.shedding.inFlight() < target && Date.now() - started < 2000) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  expect(ctx.shedding.inFlight()).toBe(target);
}

async function statusOf(path: string): Promise<number> {
  return (await request(app).get(path)).status;
}

describe("per-instance shedding", () => {
  it("sheds search, refresh and live first, then other, then votes, as the excess grows", async () => {
    await hold(11);
    expect(await statusOf("/search")).toBe(503);
    expect(await statusOf("/refresh")).toBe(503);
    expect(await statusOf("/live")).toBe(503);
    expect(await statusOf("/other")).toBe(200);
    expect(await statusOf("/vote")).toBe(200);

    await hold(3);
    expect(await statusOf("/other")).toBe(503);
    expect(await statusOf("/vote")).toBe(200);

    await hold(3);
    const vote = await request(app).get("/vote");
    expect(vote.status).toBe(503);
    expect(vote.body).toEqual({ error: "busy", retryAfterMs: 2000, nextRefreshMs: ctx.config.floors.vote });
    expect(vote.headers["retry-after"]).toBe("2");

    expect(await statusOf("/healthz")).toBe(200);
    releaseHeld();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(ctx.shedding.inFlight()).toBe(0);
    expect(await statusOf("/search")).toBe(200);
    const counts = ctx.shedding.counts();
    expect(counts.search).toBeGreaterThanOrEqual(1);
    expect(counts.vote).toBe(1);
  });

  it("answers every dynamic kind 503 while the cache is unreachable, and other kinds normally", async () => {
    ctx.cache.setDisconnected(true);
    try {
      expect(await statusOf("/search")).toBe(503);
      expect(await statusOf("/refresh")).toBe(503);
      expect(await statusOf("/live")).toBe(503);
      expect(await statusOf("/vote")).toBe(503);
      expect(await statusOf("/other")).toBe(200);
      const health = await request(app).get("/healthz");
      expect(health.status).toBe(200);
      expect(health.body.cache).toBe("down");
    } finally {
      ctx.cache.setDisconnected(false);
    }
    expect(await statusOf("/search")).toBe(200);
    expect((await request(app).get("/healthz")).body.cache).toBe("up");
  });
});
