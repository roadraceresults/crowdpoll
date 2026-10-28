import type { Cache } from "../cache/cache.js";
import type { AppConfig } from "../config.js";
import type { Db } from "../db/client.js";
import { rebuildIfMissing } from "../polls/counters.js";
import { checkViewEligibility } from "../polls/service.js";
import type { PollSharingMode, PollVisibility } from "../polls/store.js";
import { readProjection, refreshProjection } from "../polls/versions.js";
import type { RosterCache } from "../votes/rosterCache.js";

export const LIVE_ACTIVE_KEY = "live:active";
export const LIVE_LIST_KEY = (sessionId: string) => `live:${sessionId}`;

export interface LiveRegistryDeps {
  db: Db;
  cache: Cache;
  config: Pick<AppConfig, "maxLiveResultsPerUser" | "maxIdleTimeMs" | "floors">;
  rosters: RosterCache;
}

export interface LiveRegistry {
  /** Adds a poll to the top of the session's list after checking the viewer may see it and that the list is not full. */
  addPoll(
    session: { id: string; email: string; userId: string },
    pid: string
  ): Promise<{ polls: string[] } | { refused: { status: number; error: string; limit?: number } }>;
  removePoll(sessionId: string, pid: string): Promise<string[]>;
  /** The session's polls, most recently added first. */
  polls(sessionId: string): Promise<string[]>;
  /** Records the session as live until its next refresh plus the idle allowance. */
  touch(sessionId: string, nextRefreshMs: number, now?: Date): Promise<void>;
  isRegistered(sessionId: string, now?: Date): Promise<boolean>;
  /** Drops sessions whose expiry passed; returns how many remain. */
  prune(now?: Date): Promise<number>;
}

export function createLiveRegistry({ db, cache, config, rosters }: LiveRegistryDeps): LiveRegistry {
  const listTtlMs = () => config.maxIdleTimeMs + config.floors.live * 2;

  async function ordered(sessionId: string): Promise<string[]> {
    const hash = await cache.hgetall(LIVE_LIST_KEY(sessionId));
    return Object.entries(hash)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .map(([pid]) => pid);
  }

  async function eligible(pid: string, email: string, userId: string): Promise<{ status: number; error: string } | null> {
    const projection = await readProjection(cache, db, pid);
    if (!projection) return { status: 404, error: "Not found" };
    const invited = await rosters.isInvited(pid, email);
    let creatorId = "";
    if (projection.pollVisibility === "Private Poll" && projection.pollSharingMode === "Invitation Only" && !invited) {
      const row = await db.selectFrom("polls").select("created_by_id").where("id", "=", pid).executeTakeFirst();
      creatorId = row?.created_by_id ?? "";
    }
    if (creatorId && creatorId === userId) return null;
    return checkViewEligibility(
      {
        pollVisibility: projection.pollVisibility as PollVisibility,
        pollSharingMode: projection.pollSharingMode as PollSharingMode,
        invitedVoterList: invited ? [email] : []
      },
      email
    );
  }

  return {
    async addPoll(session, pid) {
      const refused = await eligible(pid, session.email, session.userId);
      if (refused) return { refused };
      const key = LIVE_LIST_KEY(session.id);
      const current = await ordered(session.id);
      const without = current.filter((p) => p !== pid);
      // FIX028: a full tab refuses rather than evicting; re-adding a held poll still moves it up.
      if (without.length >= config.maxLiveResultsPerUser) {
        return { refused: { status: 409, error: "live-cap", limit: config.maxLiveResultsPerUser } };
      }
      await cache.hset(key, { [pid]: String(Date.now()) });
      await cache.expire(key, listTtlMs());
      const row = await db.selectFrom("polls").selectAll().where("id", "=", pid).executeTakeFirst();
      if (row) await refreshProjection(cache, row);
      await rebuildIfMissing({ db, cache }, pid);
      await this.touch(session.id, config.floors.live);
      return { polls: await ordered(session.id) };
    },
    async removePoll(sessionId, pid) {
      await cache.hdel(LIVE_LIST_KEY(sessionId), pid);
      return ordered(sessionId);
    },
    polls: ordered,
    async touch(sessionId, nextRefreshMs, now = new Date()) {
      await cache.zadd(LIVE_ACTIVE_KEY, now.getTime() + nextRefreshMs + config.maxIdleTimeMs, sessionId);
      await cache.expire(LIVE_LIST_KEY(sessionId), listTtlMs());
    },
    async isRegistered(sessionId, now = new Date()) {
      const score = await cache.zscore(LIVE_ACTIVE_KEY, sessionId);
      return score !== null && score > now.getTime();
    },
    async prune(now = new Date()) {
      await cache.zremrangebyscore(LIVE_ACTIVE_KEY, -Infinity, now.getTime());
      return cache.zcard(LIVE_ACTIVE_KEY);
    }
  };
}
