import { randomBytes } from "node:crypto";
import type { Cache } from "../cache/cache.js";
import { emailKeyOf } from "../auth/emailKey.js";
import type { ClientVersions } from "./deltas.js";

export const TAB_VERSION_KEY = (email: string) => `tabs:v:${emailKeyOf(email.toLowerCase())}`;
export const TAB_SEEN_KEY = (email: string, tab: string) => `tabs:seen:${emailKeyOf(email.toLowerCase())}:${tab}`;
export const TABS_FAST_KEY = "stats:tabs:fast";
export const TABS_FULL_KEY = "stats:tabs:full";

const VERSION_TTL_MS = 24 * 60 * 60 * 1000;
const SEEN_TTL_MS = 5 * 60 * 1000;
export const STATS_TTL_MS = 10 * 60 * 1000;

/** What one personal tab last sent: every loaded row as `[pid, rowContentVersion, sentContentVersion]`. */
export interface TabSeen {
  v: string;
  membershipVersion: string | null;
  order: string[];
  rows: [string, number, number][];
}

const newVersion = () => `${Date.now()}-${randomBytes(6).toString("hex")}`;

export async function readVersion(cache: Cache, email: string): Promise<string | null> {
  return cache.get(TAB_VERSION_KEY(email));
}

/** The user's list version, created when missing; a value that lost a race is never stored, so it never matches. */
export async function ensureVersion(cache: Cache, email: string): Promise<string> {
  const value = newVersion();
  if (await cache.setNx(TAB_VERSION_KEY(email), value, VERSION_TTL_MS)) return value;
  return (await readVersion(cache, email)) ?? value;
}

/** Called after commit by every write to a user's relations, invitations or bans. */
export async function forgetTabs(cache: Cache, emails: Iterable<string>): Promise<void> {
  const keys = new Set([...emails].map((email) => TAB_VERSION_KEY(email)));
  for (const key of keys) {
    try {
      await cache.del(key);
    } catch (err) {
      console.error(`[tabs] Could not forget the list version ${key}:`, err);
    }
  }
}

export async function recordSeen(cache: Cache, email: string, tab: string, seen: TabSeen): Promise<void> {
  await cache.set(TAB_SEEN_KEY(email, tab), JSON.stringify(seen), SEEN_TTL_MS);
}

export function parseSeen(raw: string | null): TabSeen | null {
  return raw ? (JSON.parse(raw) as TabSeen) : null;
}

export async function readSeen(cache: Cache, email: string, tab: string): Promise<TabSeen | null> {
  return parseSeen(await cache.get(TAB_SEEN_KEY(email, tab)));
}

/** True when nothing the tab shows can have changed since `seen` was sent, so the live counts alone answer. */
export function shortcutAnswerable(
  seen: TabSeen | null,
  version: string | null,
  request: ClientVersions,
  projections: Map<string, { contentVersion: number } | null>
): boolean {
  if (!seen || version === null || seen.v !== version) return false;
  if (request.membershipVersion !== seen.membershipVersion) return false;
  const held = Object.keys(request.versions);
  if (held.length !== seen.order.length) return false;
  const order = new Set(seen.order);
  if (held.some((pid) => !order.has(pid))) return false;
  for (const [pid, rowVersion, sentVersion] of seen.rows) {
    if (projections.get(pid)?.contentVersion !== rowVersion) return false;
    if (order.has(pid) && request.versions[pid]![0] !== sentVersion) return false;
  }
  return true;
}

export async function countStat(cache: Cache, key: string): Promise<void> {
  if ((await cache.incr(key)) === 1) await cache.expire(key, STATS_TTL_MS);
}
