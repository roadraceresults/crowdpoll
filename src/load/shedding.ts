import { monitorEventLoopDelay } from "node:perf_hooks";
import type { RequestHandler, Response } from "express";
import type { Cache } from "../cache/cache.js";
import type { AppConfig } from "../config.js";
import type { Budget, RequestKind } from "./budget.js";

export interface SheddingDeps {
  config: AppConfig;
  cache: Cache;
  budget: Budget;
}

/**
 * How far past the limit an instance must be before it sheds each kind: searches
 * go first, votes last. https://nodejs.org/api/perf_hooks.html#perf_hooksmonitoreventloopdelayoptions
 */
const SHED_ORDER: Record<RequestKind, number> = {
  search: 0,
  refresh: 0.05,
  live: 0.1,
  other: 0.2,
  vote: 0.5
};

const LAG_SAMPLE_MS = 20;
const SHED_LOG_EVERY_MS = 60_000;

export type ShedCounts = Record<RequestKind, number>;

export interface Shedding {
  /** Counts every request in flight; mounted first. */
  countInFlight: RequestHandler;
  /** Sheds requests of kind `other`; mounted after the dynamic routes, before everything else. */
  shedOther: RequestHandler;
  /** Declares a route's kind, sheds it when overloaded or when the cache is unreachable, and stamps `nextRefreshMs`. */
  withKind(kind: RequestKind): RequestHandler;
  counts(): ShedCounts;
  inFlight(): number;
  eventLoopLagMs(): number;
  stop(): void;
}

export function createShedding({ config, cache, budget }: SheddingDeps): Shedding {
  const histogram = monitorEventLoopDelay({ resolution: LAG_SAMPLE_MS });
  histogram.enable();
  let inFlight = 0;
  const shed: ShedCounts = { search: 0, refresh: 0, live: 0, other: 0, vote: 0 };
  let lastLoggedAt = Date.now();

  function eventLoopLagMs(): number {
    const p50 = histogram.percentile(50) / 1e6;
    histogram.reset();
    return Number.isFinite(p50) ? p50 : 0;
  }

  function overloadExcess(othersInFlight: number): number {
    const inflightExcess = (othersInFlight - config.instanceMaxInflight) / config.instanceMaxInflight;
    const lagExcess = (eventLoopLagMs() - config.instanceMaxEventLoopLagMs) / config.instanceMaxEventLoopLagMs;
    return Math.max(inflightExcess, lagExcess);
  }

  function shouldShed(kind: RequestKind, othersInFlight: number): boolean {
    if (!cache.isConnected() && kind !== "other") return true;
    const excess = overloadExcess(othersInFlight);
    return excess >= 0 && excess >= SHED_ORDER[kind];
  }

  function logShedding(): void {
    const now = Date.now();
    if (now - lastLoggedAt < SHED_LOG_EVERY_MS) return;
    lastLoggedAt = now;
    const total = Object.values(shed).reduce((a, b) => a + b, 0);
    if (total > 0) console.log(`[shedding] shed in the last minute: ${JSON.stringify(shed)}`);
  }

  async function answerShed(res: Response, kind: RequestKind): Promise<void> {
    shed[kind] += 1;
    logShedding();
    const retryAfterMs = config.shedRetryAfterMs;
    let nextRefreshMs = kind === "other" ? config.floors.refresh : config.floors[kind];
    if (cache.isConnected()) {
      try {
        nextRefreshMs = await budget.nextRefreshMs(kind);
      } catch {
        // the floor alone is the answer while the cache is unreachable
      }
    }
    res.setHeader("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
    res.status(503).json({ error: "busy", retryAfterMs, nextRefreshMs });
  }

  const countInFlight: RequestHandler = (_req, res, next) => {
    inFlight += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      inFlight -= 1;
    };
    res.once("finish", release);
    res.once("close", release);
    next();
  };

  const shedOther: RequestHandler = (_req, res, next) => {
    res.locals.kind = "other";
    if (shouldShed("other", inFlight - 1)) {
      void answerShed(res, "other");
      return;
    }
    next();
  };

  function withKind(kind: RequestKind): RequestHandler {
    return (req, res, next) => {
      res.locals.kind = kind;
      if (shouldShed(kind, inFlight - 1)) {
        void answerShed(res, kind);
        return;
      }
      budget
        .nextRefreshMs(kind)
        .then((ms) => {
          res.locals.nextRefreshMs = ms;
          next();
        })
        .catch(() => void answerShed(res, kind));
    };
  }

  return {
    countInFlight,
    shedOther,
    withKind,
    counts: () => ({ ...shed }),
    inFlight: () => inFlight,
    eventLoopLagMs,
    stop: () => histogram.disable()
  };
}
