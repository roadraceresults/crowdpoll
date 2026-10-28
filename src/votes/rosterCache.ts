import type { Cache } from "../cache/cache.js";
import type { Db } from "../db/client.js";

const ROSTER_TTL_MS = 3_600_000;
const PRESENT = "_";

export const BAN_KEY = (pid: string) => `ban:${pid}`;
export const INVITE_KEY = (pid: string) => `invite:${pid}`;

export interface RosterCache {
  isBanned(pid: string, email: string): Promise<boolean>;
  isInvited(pid: string, email: string): Promise<boolean>;
  /** Called by the roster transaction so the next vote reads the new lists. */
  invalidate(pid: string): Promise<void>;
}

/** The ban and invitation lists as cached sets, loaded from their tables on first use. */
export function createRosterCache(db: Db, cache: Cache): RosterCache {
  async function members(key: string, pid: string, table: "poll_bans" | "poll_invitations", email: string): Promise<boolean> {
    if (await cache.sismember(key, PRESENT)) {
      await cache.expire(key, ROSTER_TTL_MS);
      return cache.sismember(key, email);
    }
    const rows = await db.selectFrom(table).select("email").where("poll_id", "=", pid).execute();
    await cache.sadd(key, PRESENT, ...rows.map((r) => r.email));
    await cache.expire(key, ROSTER_TTL_MS);
    return rows.some((r) => r.email === email);
  }
  return {
    isBanned: (pid, email) => members(BAN_KEY(pid), pid, "poll_bans", email),
    isInvited: (pid, email) => members(INVITE_KEY(pid), pid, "poll_invitations", email),
    async invalidate(pid) {
      await cache.del(BAN_KEY(pid));
      await cache.del(INVITE_KEY(pid));
    }
  };
}
