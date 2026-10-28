import type { Cache } from "../cache/cache.js";

const DELETED_ACCOUNTS_KEY = "deleted-accounts";
const DELETED_ACCOUNTS_TTL_MS = 3_600_000;

export async function markDeleted(cache: Cache, email: string): Promise<void> {
  await cache.sadd(DELETED_ACCOUNTS_KEY, email);
  await cache.expire(DELETED_ACCOUNTS_KEY, DELETED_ACCOUNTS_TTL_MS);
}

export async function unmarkDeleted(cache: Cache, email: string): Promise<void> {
  await cache.srem(DELETED_ACCOUNTS_KEY, email);
}

export async function withoutDeletedAccounts<T extends { email: string; pid: string }>(
  cache: Cache,
  votes: T[]
): Promise<{ kept: T[]; droppedPids: string[] }> {
  if (votes.length === 0) return { kept: votes, droppedPids: [] };
  const deleted = new Set(await cache.smembers(DELETED_ACCOUNTS_KEY));
  if (deleted.size === 0) return { kept: votes, droppedPids: [] };
  const kept = votes.filter((v) => !deleted.has(v.email));
  const droppedPids = [...new Set(votes.filter((v) => deleted.has(v.email)).map((v) => v.pid))];
  return { kept, droppedPids };
}
