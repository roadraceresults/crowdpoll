import { Router } from "express";
import type { Cache } from "../cache/cache.js";
import type { Shedding } from "../load/shedding.js";

const PING_TIMEOUT_MS = 50;

export interface HealthDeps {
  cache: Cache;
  shedding: Shedding;
  abuseCounts: () => { ipVoteCap: number };
}

export function createHealthRouter({ cache, shedding, abuseCounts }: HealthDeps): Router {
  const router = Router();
  router.get("/healthz", (_req, res) => {
    cache
      .ping(PING_TIMEOUT_MS)
      .catch(() => false)
      .then((up) => {
        res.json({ ok: true, cache: up ? "up" : "down", shed: shedding.counts(), abuse: abuseCounts() });
      });
  });
  return router;
}
