import { randomUUID } from "node:crypto";
import type { Cache } from "../cache/cache.js";
import type { AppConfig } from "../config.js";

export type RequestKind = "search" | "refresh" | "live" | "vote" | "other";
export type StretchableKind = "search" | "refresh" | "live";

export const BUDGET_KEY = (second: number) => `budget:${second}`;
export const LIVE_BUDGET_KEY = (second: number) => `budget:live:${second}`;
export const SEARCH_BUDGET_KEY = (second: number) => `search-budget:${second}`;
export const INSTANCE_KEY = (id: string) => `instance:${id}`;
export const MULTIPLIER_KEY = (kind: StretchableKind) => `k:${kind}`;

const COUNTER_TTL_MS = 10_000;
const HEARTBEAT_TTL_MS = 30_000;
const HEARTBEAT_EVERY_MS = 10_000;
const MULTIPLIER_CACHE_MS = 250;

export const secondOf = (at: number | Date = Date.now()) => Math.floor((typeof at === "number" ? at : at.getTime()) / 1000);

export interface Budget {
  readonly instanceId: string;
  countRequest(kind?: RequestKind, at?: Date): Promise<void>;
  countEngineQuery(at?: Date): Promise<void>;
  requestsInSecond(second: number): Promise<number>;
  liveRequestsInSecond(second: number): Promise<number>;
  engineQueriesInSecond(second: number): Promise<number>;
  heartbeat(): Promise<void>;
  startHeartbeat(): () => void;
  liveInstances(): Promise<number>;
  effectiveBudget(): Promise<number>;
  multiplier(kind: StretchableKind): Promise<number>;
  nextRefreshMs(kind: RequestKind): Promise<number>;
  forgetMultipliers(): void;
}

export function createBudget(config: AppConfig, cache: Cache, instanceId: string = randomUUID()): Budget {
  let multipliers: { at: number; values: Record<StretchableKind, number> } | null = null;

  async function count(key: string): Promise<void> {
    const n = await cache.incr(key);
    if (n === 1) await cache.expire(key, COUNTER_TTL_MS);
  }

  async function readMultipliers(): Promise<Record<StretchableKind, number>> {
    if (multipliers && Date.now() - multipliers.at < MULTIPLIER_CACHE_MS) return multipliers.values;
    const [search, refresh, live] = await Promise.all(
      (["search", "refresh", "live"] as const).map((k) => cache.get(MULTIPLIER_KEY(k)))
    );
    const values = {
      search: Math.max(1, Number(search ?? 1)),
      refresh: Math.max(1, Number(refresh ?? 1)),
      live: Math.max(1, Number(live ?? 1))
    };
    multipliers = { at: Date.now(), values };
    return values;
  }

  return {
    instanceId,
    async countRequest(kind = "other", at = new Date()) {
      await count(BUDGET_KEY(secondOf(at)));
      if (kind === "live") await count(LIVE_BUDGET_KEY(secondOf(at)));
    },
    countEngineQuery: (at = new Date()) => count(SEARCH_BUDGET_KEY(secondOf(at))),
    requestsInSecond: async (second) => Number((await cache.get(BUDGET_KEY(second))) ?? 0),
    liveRequestsInSecond: async (second) => Number((await cache.get(LIVE_BUDGET_KEY(second))) ?? 0),
    engineQueriesInSecond: async (second) => Number((await cache.get(SEARCH_BUDGET_KEY(second))) ?? 0),
    heartbeat: () => cache.set(INSTANCE_KEY(instanceId), "1", HEARTBEAT_TTL_MS),
    startHeartbeat() {
      const beat = () =>
        cache.set(INSTANCE_KEY(instanceId), "1", HEARTBEAT_TTL_MS).catch((err) => {
          console.error("[budget] Heartbeat failed:", err);
        });
      void beat();
      const timer = setInterval(beat, HEARTBEAT_EVERY_MS);
      timer.unref();
      return () => clearInterval(timer);
    },
    liveInstances: async () => (await cache.scan("instance:*")).length,
    async effectiveBudget() {
      const instances = Math.max(1, (await cache.scan("instance:*")).length);
      return Math.min(instances * config.serverMaxRefreshPerInstancePerSecond, config.serverMaxRefreshPerSecond);
    },
    async multiplier(kind) {
      return (await readMultipliers())[kind];
    },
    async nextRefreshMs(kind) {
      if (kind === "vote") return config.floors.vote;
      if (kind === "other") return config.floors.refresh;
      return config.floors[kind] * (await readMultipliers())[kind];
    },
    forgetMultipliers() {
      multipliers = null;
    }
  };
}
