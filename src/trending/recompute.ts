import { createHash } from "node:crypto";
import type { Cache } from "../cache/cache.js";
import type { AppConfig } from "../config.js";
import type { Db } from "../db/client.js";
import type { PollRow } from "../db/schema.js";
import { readOrRebuildCounts, TREND_BUCKET_MS, trendBucketKey, type LiveCounts } from "../polls/counters.js";
import { projectPoll, refreshProjection, type PollProjection } from "../polls/versions.js";

const TRAILING_BUCKETS = 12;

export interface ListingKeys {
  counts: string;
  cards: string;
  meta: string;
}

export const TRENDING_KEYS: ListingKeys = {
  counts: "listing:trending:counts",
  cards: "listing:trending:cards",
  meta: "listing:trending:meta"
};

export const NEWEST_KEYS: ListingKeys = {
  counts: "listing:newest:counts",
  cards: "listing:newest:cards",
  meta: "listing:newest:meta"
};

export interface TrendingCountsObject {
  membershipVersion: string;
  cardsVersion: string;
  recomputedAt: string;
  polls: ({ pid: string } & LiveCounts)[];
}

export interface TrendingCardsObject {
  membershipVersion: string;
  cardsVersion: string;
  cards: Record<string, PollProjection>;
}

export interface TrendingListing {
  membershipVersion: string;
  cardsVersion: string;
  recomputedAt: string;
  order: string[];
  projections: Map<string, PollProjection>;
  counts: Map<string, LiveCounts>;
  countsObject: TrendingCountsObject;
  cardsObject: TrendingCardsObject;
}

export function membershipVersionOf(pids: string[]): string {
  return createHash("sha256").update([...pids].sort().join("\n")).digest("hex");
}

export function cardsVersionOf(projections: Map<string, PollProjection>): string {
  const lines = [...projections.values()].map((p) => `${p.pid}:${p.contentVersion}`).sort();
  return createHash("sha256").update(lines.join("\n")).digest("hex");
}

export function etagOf(text: string): string {
  return `"${createHash("sha256").update(text).digest("hex").slice(0, 32)}"`;
}

export interface TrendingDeps {
  db: Db;
  cache: Cache;
  config: Pick<AppConfig, "maxTrendingPolls">;
}

export interface NewestDeps {
  db: Db;
  cache: Cache;
  config: Pick<AppConfig, "maxNewestPolls">;
}

/** Public polls that are open, or being edited after being open. */
export function listablePolls(db: Db) {
  return db
    .selectFrom("polls")
    .where("home_listable", "=", true)
    .where((eb) =>
      eb.or([
        eb("poll_state", "=", "OPEN"),
        eb.and([eb("poll_state", "=", "EDITING"), eb("poll_state_before_edit_update", "=", "OPEN")])
      ])
    );
}

async function recentVotesByPoll(cache: Cache, now: Date): Promise<Map<string, number>> {
  const keys: string[] = [];
  for (let i = 0; i < TRAILING_BUCKETS; i++) keys.push(trendBucketKey(new Date(now.getTime() - i * TREND_BUCKET_MS)));
  const hashes = await cache.hgetallMany(keys);
  const sums = new Map<string, number>();
  for (const hash of hashes) {
    for (const [pid, n] of Object.entries(hash)) sums.set(pid, (sums.get(pid) ?? 0) + Number(n));
  }
  return sums;
}

async function publishListing(
  { db, cache }: { db: Db; cache: Cache },
  keys: ListingKeys,
  top: PollRow[],
  now: Date
): Promise<TrendingListing> {
  const order = top.map((r) => r.id);
  const projections = new Map<string, PollProjection>();
  for (const row of top) {
    projections.set(row.id, projectPoll(row));
    await refreshProjection(cache, row);
  }
  const counts = await readOrRebuildCounts({ db, cache }, order);
  const membershipVersion = membershipVersionOf(order);
  const cardsVersion = cardsVersionOf(projections);
  const recomputedAt = now.toISOString();
  const countsObject: TrendingCountsObject = {
    membershipVersion,
    cardsVersion,
    recomputedAt,
    polls: order.map((pid) => ({ pid, ...(counts.get(pid) ?? { voteCount: 0, choiceCounts: {}, countsVersion: 0 }) }))
  };
  const cardsObject: TrendingCardsObject = { membershipVersion, cardsVersion, cards: Object.fromEntries(projections) };

  await cache.set(keys.counts, JSON.stringify(countsObject));
  await cache.set(keys.cards, JSON.stringify(cardsObject));
  await cache.hset(keys.meta, { membershipVersion, recomputedAt });
  return { membershipVersion, cardsVersion, recomputedAt, order, projections, counts, countsObject, cardsObject };
}

/** The top polls by votes in the trailing hour, then by lifetime votes, among open public polls. */
export async function recomputeTrending({ db, cache, config }: TrendingDeps, now: Date = new Date()): Promise<TrendingListing> {
  const recent = await recentVotesByPoll(cache, now);
  const cap = config.maxTrendingPolls;
  const recentIds = [...recent.keys()];
  const recentRows =
    recentIds.length > 0 ? await listablePolls(db).selectAll().where("id", "in", recentIds).execute() : [];
  const fillers = await listablePolls(db)
    .selectAll()
    .orderBy("vote_count", "desc")
    .orderBy("created_at", "desc")
    .limit(cap)
    .execute();
  const rows = new Map(recentRows.map((r) => [r.id, r]));
  for (const row of fillers) if (!rows.has(row.id)) rows.set(row.id, row);

  const ranked = [...rows.values()].sort(
    (a, b) =>
      (recent.get(b.id) ?? 0) - (recent.get(a.id) ?? 0) ||
      b.vote_count - a.vote_count ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return publishListing({ db, cache }, TRENDING_KEYS, ranked.slice(0, cap), now);
}

/** The most recently launched open public polls, ties by lifetime votes, then by id. */
export function newestQuery(db: Db, cap: number) {
  return listablePolls(db)
    .selectAll()
    .where("launched_at", "is not", null)
    .orderBy("launched_at", "desc")
    .orderBy("vote_count", "desc")
    .orderBy("id", "desc")
    .limit(cap);
}

export async function recomputeNewest({ db, cache, config }: NewestDeps, now: Date = new Date()): Promise<TrendingListing> {
  const top = await newestQuery(db, config.maxNewestPolls).execute();
  return publishListing({ db, cache }, NEWEST_KEYS, top, now);
}

async function readListingObjects(cache: Cache, keys: ListingKeys): Promise<{ counts: string; cards: string } | null> {
  const [counts, cards] = await Promise.all([cache.get(keys.counts), cache.get(keys.cards)]);
  if (!counts || !cards) return null;
  return { counts, cards };
}

/** The last published listing as stored, for the instance-served endpoints. */
export function readTrendingObjects(cache: Cache): Promise<{ counts: string; cards: string } | null> {
  return readListingObjects(cache, TRENDING_KEYS);
}

export function readNewestObjects(cache: Cache): Promise<{ counts: string; cards: string } | null> {
  return readListingObjects(cache, NEWEST_KEYS);
}
