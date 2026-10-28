import type { Cache } from "../cache/cache.js";
import type { Db } from "../db/client.js";
import { readOrRebuildCounts } from "../polls/counters.js";
import { readProjections } from "../polls/versions.js";
import { computeDelta, type ClientVersions, type Delta } from "../refresh/deltas.js";

/** One Live Results refresh: the session's polls from the cache only, as a delta. */
export async function liveTabDelta(
  deps: { db: Db; cache: Cache },
  pids: string[],
  request: ClientVersions
): Promise<Delta> {
  const projections = await readProjections(deps.cache, deps.db, pids);
  const counts = await readOrRebuildCounts(deps, pids);
  const order = pids.filter((pid) => projections.has(pid));
  return computeDelta(request, { membershipVersion: order.join(","), order, projections, counts });
}
