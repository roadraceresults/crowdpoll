import type { Request, RequestHandler } from "express";
import type { Cache } from "../cache/cache.js";
import type { AppConfig } from "../config.js";
import type { SessionCache } from "../auth/sessionCache.js";
import type { Budget, RequestKind } from "./budget.js";

export type FloorKind = Exclude<RequestKind, "other">;

export const FLOOR_KEY = (kind: FloorKind, who: string) => `floor:${kind}:${who}`;

export interface FloorDeps {
  config: AppConfig;
  cache: Cache;
  sessions: SessionCache;
  budget: Budget;
}

/** The session id for a signed-in caller, the client address for a guest. */
export async function floorSubject(sessions: SessionCache, req: Request): Promise<string> {
  const session = await sessions.getSession(req);
  return session ? `s:${session.session.id}` : `ip:${req.ip ?? "unknown"}`;
}

export function createFloors({ config, cache, sessions, budget }: FloorDeps) {
  /*
    FIX008: each user holds a bucket of `bursts[kind]` tokens per kind, refilled
    one per floor interval, so a few requests may follow each other at once while
    the sustained rate stays one per floor. A burst of 1 is the plain floor.
  */
  function enforceFloor(kind: FloorKind): RequestHandler {
    return (req, res, next) => {
      (async () => {
        const key = FLOOR_KEY(kind, await floorSubject(sessions, req));
        const remaining = await cache.takeToken(key, config.bursts[kind], config.floors[kind]);
        if (remaining === 0) {
          next();
          return;
        }
        res.setHeader("Retry-After", String(Math.ceil(remaining / 1000)));
        res.status(429).json({
          error: "too-soon",
          retryAfterMs: remaining,
          nextRefreshMs: await budget.nextRefreshMs(kind)
        });
      })().catch(next);
    };
  }
  return { enforceFloor };
}
