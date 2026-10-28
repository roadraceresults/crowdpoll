import { AsyncLocalStorage } from "node:async_hooks";
import { sql } from "kysely";
import type { Cache } from "../cache/cache.js";
import type { Db } from "../db/client.js";

export const COUNTS_KEY = (pid: string) => `cnt:${pid}`;
export const DIRTY_KEY = "dirty";
export const TREND_BUCKET_MS = 5 * 60_000;
const TREND_BUCKET_TTL_MS = 65 * 60_000;
const DIRTY_DAY_TTL_MS = 48 * 3_600_000;

export const trendBucketKey = (at: Date) => `trend:${Math.floor(at.getTime() / TREND_BUCKET_MS)}`;
export const dirtyDayKey = (at: Date) => `dirty:day:${at.toISOString().slice(0, 10)}`;

/** Names the code path allowed to write the row counters; tests assert nobody else does. */
export const counterWriter = new AsyncLocalStorage<"flush" | "reconcile">();

export interface LiveCounts {
  voteCount: number;
  choiceCounts: Record<string, number>;
  countsVersion: number;
}

export interface CounterDeps {
  db: Db;
  cache: Cache;
}

export function countsFromHash(hash: Record<string, string>): LiveCounts | null {
  if (hash.seq === undefined) return null;
  const choiceCounts: Record<string, number> = {};
  for (const [field, value] of Object.entries(hash)) {
    if (field === "total" || field === "seq") continue;
    choiceCounts[field] = Number(value);
  }
  return { voteCount: Number(hash.total ?? 0), choiceCounts, countsVersion: Number(hash.seq) };
}

export async function countVote(
  cache: Cache,
  pid: string,
  addChoiceIds: string[],
  removeChoiceIds: string[] = [],
  isNewVoter = true,
  now: Date = new Date()
): Promise<LiveCounts> {
  const key = COUNTS_KEY(pid);
  for (const id of addChoiceIds) await cache.hincrby(key, id, 1);
  for (const id of removeChoiceIds) await cache.hincrby(key, id, -1);
  if (isNewVoter) await cache.hincrby(key, "total", 1);
  await cache.hincrby(key, "seq", 1);
  if (isNewVoter) {
    const bucket = trendBucketKey(now);
    await cache.hincrby(bucket, pid, 1);
    await cache.expire(bucket, TREND_BUCKET_TTL_MS);
  }
  await cache.sadd(DIRTY_KEY, pid);
  const day = dirtyDayKey(now);
  await cache.sadd(day, pid);
  await cache.expire(day, DIRTY_DAY_TTL_MS);
  return countsFromHash(await cache.hgetall(key))!;
}

export async function readLiveCounts(cache: Cache, pids: string[]): Promise<Map<string, LiveCounts>> {
  const hashes = await cache.hgetallMany(pids.map(COUNTS_KEY));
  const out = new Map<string, LiveCounts>();
  hashes.forEach((hash, i) => {
    const counts = countsFromHash(hash);
    if (counts) out.set(pids[i]!, counts);
  });
  return out;
}

/** Seeds `cnt:<pid>` from the flushed row when the cache holds nothing for the poll. */
export async function rebuildIfMissing({ db, cache }: CounterDeps, pid: string): Promise<LiveCounts | null> {
  const existing = countsFromHash(await cache.hgetall(COUNTS_KEY(pid)));
  if (existing) return existing;
  const row = await db
    .selectFrom("polls")
    .select(["vote_count", "choice_counts", "counts_version"])
    .where("id", "=", pid)
    .executeTakeFirst();
  if (!row) return null;
  const fields: Record<string, string> = { total: String(row.vote_count), seq: String(row.counts_version) };
  for (const [id, n] of Object.entries(row.choice_counts)) fields[id] = String(n);
  await cache.hset(COUNTS_KEY(pid), fields);
  return countsFromHash(fields);
}

export async function readOrRebuildCounts(deps: CounterDeps, pids: string[]): Promise<Map<string, LiveCounts>> {
  const counts = await readLiveCounts(deps.cache, pids);
  for (const pid of pids) {
    if (counts.has(pid)) continue;
    const rebuilt = await rebuildIfMissing(deps, pid);
    if (rebuilt) counts.set(pid, rebuilt);
  }
  return counts;
}

async function writeRowCounters(
  db: Db,
  rows: { pid: string; counts: LiveCounts; lastVoteAt: Date | null }[]
): Promise<void> {
  if (rows.length === 0) return;
  const values = sql.join(
    rows.map(
      (r) =>
        sql`(${r.pid}, ${r.counts.voteCount}::int, ${JSON.stringify(r.counts.choiceCounts)}::jsonb, ${r.counts.countsVersion}::bigint, ${r.lastVoteAt}::timestamptz)`
    )
  );
  await sql`
    update polls as p
    set vote_count = v.vote_count,
        choice_counts = v.choice_counts,
        counts_version = v.counts_version,
        last_vote_at = coalesce(v.last_vote_at, p.last_vote_at)
    from (values ${values}) as v(id, vote_count, choice_counts, counts_version, last_vote_at)
    where p.id = v.id`.execute(db);
  await db
    .insertInto("search_outbox")
    .values(rows.map((r) => ({ poll_id: r.pid, version: r.counts.countsVersion, reason: "counters" as const })))
    .onConflict((oc) =>
      oc.column("poll_id").doUpdateSet((eb) => ({
        version: eb.ref("excluded.version"),
        reason: sql<"content" | "counters">`case when search_outbox.reason = 'content' then 'content' else 'counters' end`
      }))
    )
    .execute();
}

/** One flush tick: swap the dirty set and write every dirty poll's counters to its row. */
export async function flushDirty(deps: CounterDeps, now: Date = new Date()): Promise<number> {
  const { db, cache } = deps;
  const flushing = `dirty:flushing:${now.getTime()}`;
  if (!(await cache.rename(DIRTY_KEY, flushing))) return 0;
  const pids = await cache.smembers(flushing);
  const counts = await readLiveCounts(cache, pids);
  const rows = pids
    .filter((pid) => counts.has(pid))
    .map((pid) => ({ pid, counts: counts.get(pid)!, lastVoteAt: now }));
  await counterWriter.run("flush", () => writeRowCounters(db, rows));
  await cache.del(flushing);
  return rows.length;
}

/** Recomputes the counters of these polls from the `votes` table and corrects both copies. */
export async function reconcile(deps: CounterDeps, pids: string[]): Promise<number> {
  const { db, cache } = deps;
  if (pids.length === 0) return 0;
  const totals = await db
    .selectFrom("votes")
    .select(["poll_id", (eb) => eb.fn.countAll<string>().as("n"), (eb) => eb.fn.max("voted_at").as("last")])
    .where("poll_id", "in", pids)
    .where(sql<boolean>`cardinality(choice_ids) > 0`)
    .groupBy("poll_id")
    .execute();
  const perChoice = await db
    .selectFrom("votes")
    .select(["poll_id", sql<string>`unnest(choice_ids)`.as("choice_id"), (eb) => eb.fn.countAll<string>().as("n")])
    .where("poll_id", "in", pids)
    .groupBy(["poll_id", sql`unnest(choice_ids)`])
    .execute();
  const rows: { pid: string; counts: LiveCounts; lastVoteAt: Date | null }[] = [];
  for (const pid of pids) {
    const total = totals.find((t) => t.poll_id === pid);
    const choiceCounts: Record<string, number> = {};
    for (const c of perChoice) if (c.poll_id === pid) choiceCounts[c.choice_id] = Number(c.n);
    const current = countsFromHash(await cache.hgetall(COUNTS_KEY(pid)));
    const rowVersion = await db
      .selectFrom("polls")
      .select("counts_version")
      .where("id", "=", pid)
      .executeTakeFirst();
    if (!rowVersion) continue;
    const seq = Math.max(current?.countsVersion ?? 0, rowVersion.counts_version) + 1;
    const counts: LiveCounts = { voteCount: Number(total?.n ?? 0), choiceCounts, countsVersion: seq };
    const fields: Record<string, string> = { total: String(counts.voteCount), seq: String(seq) };
    for (const [id, n] of Object.entries(choiceCounts)) fields[id] = String(n);
    for (const stale of Object.keys(current?.choiceCounts ?? {})) if (!(stale in choiceCounts)) fields[stale] = "0";
    await cache.hset(COUNTS_KEY(pid), fields);
    rows.push({ pid, counts, lastVoteAt: total?.last ? new Date(total.last as Date) : null });
  }
  await counterWriter.run("reconcile", () => writeRowCounters(db, rows));
  return rows.length;
}

/** Every poll with a live counter hash — the operator's reconcile and the seed use it. */
export async function pollsWithCounters(cache: Cache): Promise<string[]> {
  const keys = await cache.scan("cnt:*");
  return keys.map((k) => k.slice("cnt:".length));
}
