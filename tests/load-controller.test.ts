import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { ACTIVITY_KEY, controllerTick, type ControllerDeps } from "../src/load/controller.js";
import { BUDGET_KEY, INSTANCE_KEY, LIVE_BUDGET_KEY, MULTIPLIER_KEY, SEARCH_BUDGET_KEY, secondOf } from "../src/load/budget.js";
import { LIVE_ACTIVE_KEY } from "../src/live/registry.js";
import { STRETCHED_KEY } from "../src/load/floors.js";
import { TABS_FAST_KEY, TABS_FULL_KEY } from "../src/refresh/tabVersions.js";

let ctx: TestContext;
let engine: "opensearch" | "postgres" = "opensearch";
let deps: ControllerDeps;

beforeAll(async () => {
  ctx = await startTestContext({
    ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND: "1250",
    ENV_SERVER_MAX_REFRESH_PER_SECOND: "15000",
    ENV_MAX_STRETCH: "3",
    ENV_MIN_LIVE_REFRESH_INTERVAL: "2000",
    ENV_MIN_VOTE_INTERVAL: "2000",
    ENV_BUDGET_CONTROLLER_INTERVAL: "1000"
  });
  deps = { cache: ctx.cache, config: ctx.config, budget: ctx.budget, search: { servingEngine: async () => engine } };
});

afterAll(async () => {
  await ctx.stop();
});

const now = () => new Date(Math.floor(Date.now() / 1000) * 1000 + 500);
const lastSecond = () => secondOf(now()) - 1;

async function load(requests: number, options: { live?: number; engine?: number } = {}) {
  await ctx.cache.set(BUDGET_KEY(lastSecond()), String(requests));
  await ctx.cache.set(LIVE_BUDGET_KEY(lastSecond()), String(options.live ?? 0));
  await ctx.cache.set(SEARCH_BUDGET_KEY(lastSecond()), String(options.engine ?? 0));
}

async function multipliers() {
  return {
    search: Number((await ctx.cache.get(MULTIPLIER_KEY("search"))) ?? 1),
    refresh: Number((await ctx.cache.get(MULTIPLIER_KEY("refresh"))) ?? 1),
    live: Number((await ctx.cache.get(MULTIPLIER_KEY("live"))) ?? 1)
  };
}

beforeEach(async () => {
  for (const key of await ctx.cache.scan("k:*")) await ctx.cache.del(key);
  for (const key of await ctx.cache.scan("budget:*")) await ctx.cache.del(key);
  for (const key of await ctx.cache.scan("search-budget:*")) await ctx.cache.del(key);
  for (const key of await ctx.cache.scan("instance:*")) await ctx.cache.del(key);
  await ctx.cache.del(LIVE_ACTIVE_KEY);
  await ctx.cache.del(ACTIVITY_KEY);
  engine = "opensearch";
  await ctx.cache.set(INSTANCE_KEY("a"), "1", 30000);
});

describe("the budget controller", () => {
  it("raises search, then manual refreshes, then Live Results, one step per tick, capping the first two", async () => {
    await load(2000);
    const seen: string[] = [];
    for (let i = 0; i < 8; i++) {
      await controllerTick(deps, now());
      const k = await multipliers();
      seen.push(`${k.search}/${k.refresh}/${k.live}`);
    }
    expect(seen).toEqual(["2/1/1", "3/1/1", "3/2/1", "3/3/1", "3/3/2", "3/3/3", "3/3/4", "3/3/5"]);
  });

  it("lowers in reverse order, one step per tick, only below the lower threshold", async () => {
    await ctx.cache.set(MULTIPLIER_KEY("search"), "3");
    await ctx.cache.set(MULTIPLIER_KEY("refresh"), "3");
    await ctx.cache.set(MULTIPLIER_KEY("live"), "2");
    await load(1100);
    await controllerTick(deps, now());
    expect(await multipliers()).toEqual({ search: 3, refresh: 3, live: 2 });
    await load(500);
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) {
      await controllerTick(deps, now());
      const k = await multipliers();
      seen.push(`${k.search}/${k.refresh}/${k.live}`);
    }
    expect(seen).toEqual(["3/3/1", "3/2/1", "3/1/1", "2/1/1", "1/1/1", "1/1/1"]);
  });

  it("votes are never stretched whatever the multipliers", async () => {
    await ctx.cache.set(MULTIPLIER_KEY("live"), "9");
    await ctx.cache.set(MULTIPLIER_KEY("refresh"), "3");
    ctx.budget.forgetMultipliers();
    expect(await ctx.budget.nextRefreshMs("vote")).toBe(2000);
    expect(await ctx.budget.nextRefreshMs("live")).toBe(18000);
    expect(await ctx.budget.nextRefreshMs("refresh")).toBe(15000);
  });

  it("the effective budget follows the instance heartbeats and is capped", async () => {
    expect(await ctx.budget.effectiveBudget()).toBe(1250);
    for (let i = 0; i < 7; i++) await ctx.cache.set(INSTANCE_KEY(`i${i}`), "1", 30000);
    expect(await ctx.budget.effectiveBudget()).toBe(10000);
    for (let i = 0; i < 20; i++) await ctx.cache.set(INSTANCE_KEY(`j${i}`), "1", 30000);
    expect(await ctx.budget.effectiveBudget()).toBe(15000);
    await load(1300);
    await controllerTick(deps, now());
    expect((await multipliers()).search).toBe(1);
  });

  it("sizes k:live for the tabs that are open before any live request is observed", async () => {
    for (let i = 0; i < 10000; i++) await ctx.cache.zadd(LIVE_ACTIVE_KEY, now().getTime() + 60000, `s${i}`);
    await load(100);
    const tick = await controllerTick(deps, now());
    expect(tick.liveTabs).toBe(10000);
    expect(tick.predictedLive).toBe(Math.ceil(5000 / (1250 - 100)));
    expect((await multipliers()).live).toBe(tick.predictedLive);
  });

  it("prunes lapsed registrations and lets the activity factor discount hidden tabs", async () => {
    for (let i = 0; i < 100; i++) await ctx.cache.zadd(LIVE_ACTIVE_KEY, now().getTime() - 1, `old${i}`);
    for (let i = 0; i < 4000; i++) await ctx.cache.zadd(LIVE_ACTIVE_KEY, now().getTime() + 60000, `live${i}`);
    await load(200, { live: 200 });
    const first = await controllerTick(deps, now());
    expect(first.liveTabs).toBe(4000);
    expect(first.activity).toBeLessThan(1);
    const second = await controllerTick(deps, now());
    expect(second.activity).toBeLessThan(first.activity);
    expect(second.predictedLive).toBeLessThanOrEqual(first.predictedLive);
  });

  it("the search sub-budget raises k:search alone, at the engine's bound or the fallback's", async () => {
    await load(100, { engine: 2100 });
    await controllerTick(deps, now());
    expect(await multipliers()).toEqual({ search: 2, refresh: 1, live: 1 });
    await load(100, { engine: 150 });
    await controllerTick(deps, now());
    expect((await multipliers()).search).toBe(1);
    engine = "postgres";
    await load(100, { engine: 250 });
    await controllerTick(deps, now());
    expect(await multipliers()).toEqual({ search: 2, refresh: 1, live: 1 });
  });

  it("ends its line with the shortcut and full tab answers and the stretched refusals since the last line, then clears them (R9)", async () => {
    const lines: string[] = [];
    const log = vi.spyOn(console, "log").mockImplementation((line: string) => {
      lines.push(line);
    });
    try {
      await ctx.cache.set(TABS_FAST_KEY, "7");
      await ctx.cache.set(TABS_FULL_KEY, "2");
      await ctx.cache.set(STRETCHED_KEY, "1");
      await load(20000);
      await controllerTick(deps, now());
      expect(lines.at(-1)).toMatch(/^\[controller\] .* tabs=7\/2 stretched=1$/);
      for (const key of [TABS_FAST_KEY, TABS_FULL_KEY, STRETCHED_KEY]) {
        expect(await ctx.cache.get(key)).toBeNull();
        expect(await ctx.cache.get(`${key}:read`)).toBeNull();
      }

      // An answer counted while the line is being written lands in the next line.
      await ctx.cache.set(TABS_FAST_KEY, "4");
      const rename = ctx.cache.rename.bind(ctx.cache);
      vi.spyOn(ctx.cache, "rename").mockImplementation(async (key, newKey) => {
        const moved = await rename(key, newKey);
        if (key === TABS_FAST_KEY) await ctx.cache.incr(TABS_FAST_KEY);
        return moved;
      });
      await load(20000);
      await controllerTick(deps, now());
      expect(lines.at(-1)).toMatch(/ tabs=4\/0 stretched=0$/);
      vi.mocked(ctx.cache.rename).mockRestore();
      await load(20000);
      await controllerTick(deps, now());
      expect(lines.at(-1)).toMatch(/ tabs=1\/0 stretched=0$/);
    } finally {
      log.mockRestore();
    }
  });
});
