import type { RequestHandler } from "express";
import type { Cache } from "../cache/cache.js";
import type { AppConfig } from "../config.js";
import type { SessionCache } from "../auth/sessionCache.js";
import { floorSubject } from "./floors.js";

const WINDOW_MS = 60_000;
export const PAGE_LOAD_KEY = (who: string) => `pageload:${who}`;

export interface PageLoadDeps {
  config: Pick<AppConfig, "pageLoadsPerMinute">;
  cache: Cache;
  sessions: SessionCache;
}

/**
 * One bucket per session (or address) per minute for the requests a page load
 * costs. The bucket protects the instance and is never a dependency: while the
 * cache is unreachable the page load is served unmetered.
 */
export function createPageLoadBucket({ config, cache, sessions }: PageLoadDeps): RequestHandler {
  return (req, res, next) => {
    if (!cache.isConnected()) {
      next();
      return;
    }
    (async () => {
      const key = PAGE_LOAD_KEY(await floorSubject(sessions, req));
      const count = await cache.incr(key);
      if (count === 1) await cache.expire(key, WINDOW_MS);
      if (count <= config.pageLoadsPerMinute) {
        next();
        return;
      }
      const retryAfterMs = Math.max(1, await cache.pttl(key));
      res.setHeader("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
      res.status(429).json({ error: "too-many-loads", retryAfterMs });
    })().catch(() => next());
  };
}
