import type { Cache } from "../cache/cache.js";
import type { AppConfig } from "../config.js";
import type { Search } from "../search/search.js";
import { LIVE_ACTIVE_KEY } from "../live/registry.js";
import { MULTIPLIER_KEY, secondOf, type Budget, type StretchableKind } from "./budget.js";

const ACTIVITY_MIN = 0.1;
const ACTIVITY_MAX = 1;
const ACTIVITY_SMOOTHING = 0.5;
const QUIET_LOG_EVERY_MS = 60_000;
export const ACTIVITY_KEY = "k:live:activity";
let lastQuietLogAt = 0;

export interface ControllerDeps {
  cache: Cache;
  config: Pick<
    AppConfig,
    "floors" | "maxStretch" | "budgetLowerThresholdPercent" | "serverMaxSearchPerSecond" | "serverMaxSearchPerSecondFallback"
  >;
  budget: Budget;
  search: Pick<Search, "servingEngine">;
}

export interface ControllerTick {
  requests: number;
  liveRequests: number;
  engineQueries: number;
  budget: number;
  searchBudget: number;
  liveTabs: number;
  activity: number;
  predictedLive: number;
  multipliers: Record<StretchableKind, number>;
}

async function readMultipliers(cache: Cache): Promise<Record<StretchableKind, number>> {
  const [search, refresh, live] = await Promise.all(
    (["search", "refresh", "live"] as const).map((k) => cache.get(MULTIPLIER_KEY(k)))
  );
  return { search: Math.max(1, Number(search ?? 1)), refresh: Math.max(1, Number(refresh ?? 1)), live: Math.max(1, Number(live ?? 1)) };
}

/**
 * One controller tick: stretch searches first, then manual refreshes, then Live
 * Results — never votes — while the fleet is over budget; relax in the reverse
 * order once well under it; and size the live multiplier for the tabs that are
 * open before their next refreshes land.
 */
export async function controllerTick(deps: ControllerDeps, now: Date = new Date()): Promise<ControllerTick> {
  const { cache, config, budget, search } = deps;
  const lastSecond = secondOf(now) - 1;
  const [requests, liveRequests, engineQueries, budgetNow, engine] = await Promise.all([
    budget.requestsInSecond(lastSecond),
    budget.liveRequestsInSecond(lastSecond),
    budget.engineQueriesInSecond(lastSecond),
    budget.effectiveBudget(),
    search.servingEngine()
  ]);
  const searchBudget = engine === "opensearch" ? config.serverMaxSearchPerSecond : config.serverMaxSearchPerSecondFallback;

  await cache.zremrangebyscore(LIVE_ACTIVE_KEY, -Infinity, now.getTime());
  const liveTabs = await cache.zcard(LIVE_ACTIVE_KEY);
  const k = await readMultipliers(cache);

  // Tabs that refresh less often than their interval allows are hidden or idle; the
  // factor is measured only once live traffic exists, so a surge whose refreshes have
  // not arrived yet is sized at full activity.
  const expectedLive = liveTabs / ((config.floors.live * k.live) / 1000);
  const previousActivity = Number((await cache.get(ACTIVITY_KEY)) ?? ACTIVITY_MAX);
  let activity = ACTIVITY_MAX;
  if (liveTabs > 0 && liveRequests > 0 && expectedLive > 0) {
    const observedActivity = Math.min(ACTIVITY_MAX, Math.max(ACTIVITY_MIN, liveRequests / expectedLive));
    activity = previousActivity * ACTIVITY_SMOOTHING + observedActivity * (1 - ACTIVITY_SMOOTHING);
  }
  await cache.set(ACTIVITY_KEY, String(activity));

  const budgetLeft = Math.max(1, budgetNow - (requests - liveRequests));
  const liveDemandPerSecond = (liveTabs * activity) / (config.floors.live / 1000);
  const predictedLive = Math.max(1, Math.ceil(liveDemandPerSecond / budgetLeft));

  const lowerBelow = config.budgetLowerThresholdPercent / 100;
  const overBudget = requests > budgetNow;
  const overSearch = engineQueries > searchBudget;
  const next = { ...k };

  if (overSearch && next.search < config.maxStretch) {
    next.search += 1;
  } else if (overBudget) {
    if (next.search < config.maxStretch) next.search += 1;
    else if (next.refresh < config.maxStretch) next.refresh += 1;
    else next.live += 1;
  } else if (requests < budgetNow * lowerBelow && engineQueries < searchBudget * lowerBelow) {
    if (next.live > 1 && next.live > predictedLive) next.live -= 1;
    else if (next.refresh > 1) next.refresh -= 1;
    else if (next.search > 1) next.search -= 1;
  }
  next.live = Math.max(next.live, predictedLive);

  for (const kind of ["search", "refresh", "live"] as const) {
    if (next[kind] !== k[kind]) await cache.set(MULTIPLIER_KEY(kind), String(next[kind]));
  }
  budget.forgetMultipliers();
  const changed = (["search", "refresh", "live"] as const).some((kind) => next[kind] !== k[kind]);
  if (changed || overBudget || overSearch || now.getTime() - lastQuietLogAt >= QUIET_LOG_EVERY_MS) {
    lastQuietLogAt = now.getTime();
    console.log(
      `[controller] R=${requests} B=${budgetNow} S=${engineQueries}/${searchBudget} V=${liveTabs} a=${activity.toFixed(2)} k=${next.search}/${next.refresh}/${next.live}`
    );
  }
  return { requests, liveRequests, engineQueries, budget: budgetNow, searchBudget, liveTabs, activity, predictedLive, multipliers: next };
}
