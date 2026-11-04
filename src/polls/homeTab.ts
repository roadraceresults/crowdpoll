import { sql } from "kysely";
import type { AppConfig } from "../config.js";
import type { Cache } from "../cache/cache.js";
import type { PollRow, UserPollRelation } from "../db/schema.js";
import { emailKeyOf } from "../auth/emailKey.js";
import { countStat, HOME_REBUILT_KEY, HOME_REUSED_KEY } from "../refresh/tabVersions.js";
import { readTrendingObjects, type TrendingCountsObject } from "../trending/recompute.js";
import { mayWatchMany, reachableMany } from "./access.js";
import type { Caller } from "./service.js";
import { isPublished, type Db } from "./store.js";
import { sharedWithYouKept, type HomeReason } from "./userPolls.js";

export const HOME_RULE_CAP = 10;
export const HOME_LAUNCH_WINDOW_MONTHS = 2;
export const HOME_CLOSED_WINDOW_DAYS = 7;

/** The relations rules 1–4 read, in the order the card's reason line joins them. */
const HOME_RELATIONS: UserPollRelation[] = ["invited", "linked", "created", "voted", "bookmarked"];
const SHARED_RULE = 1;
const WATCHING_RULE = 4;
const TRENDING_RULE = 5;

export const HOME_TAB_KEY = (email: string) => `home:${emailKeyOf(email.toLowerCase())}`;

export interface HomeDeps {
  db: Db;
  cache: Cache;
  config: AppConfig;
}

/** One of the user's eligible polls, with when each of their relations to it last changed. */
export interface HomeCandidate {
  pid: string;
  at: Partial<Record<UserPollRelation, Date>>;
}

/** The cached Home list: the pids in rule order, the rule that placed each, and why each is listed. */
export interface HomeMembership {
  v: string;
  builtAt: string;
  order: string[];
  rules: number[];
  relations: [string, HomeReason[]][];
  trendingReady: boolean;
}

export interface HomeTab {
  order: string[];
  rules: number[];
  relations: Map<string, HomeReason[]>;
  rows: PollRow[];
  trendingReady: boolean;
}

/**
 * The user's polls that may be on Home: one read of their relations, grouped by poll, kept to polls waiting to
 * open, open and launched within two months, or closed within a week (a poll under edit counts by its stashed
 * state), most recent relation first.
 */
export async function loadHomeCandidates(db: Db, email: string, now: Date, limit: number): Promise<HomeCandidate[]> {
  const launchedSince = new Date(now);
  launchedSince.setUTCMonth(launchedSince.getUTCMonth() - HOME_LAUNCH_WINDOW_MONTHS);
  const closedSince = new Date(now.getTime() - HOME_CLOSED_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const state = sql`case when polls.poll_state = 'EDITING' then polls.poll_state_before_edit_update else polls.poll_state end`;
  const members = await db
    .selectFrom("user_polls")
    .innerJoin("polls", "polls.id", "user_polls.poll_id")
    .select([
      "user_polls.poll_id",
      (eb) => eb.fn.max("user_polls.updated_at").as("updated_at"),
      sql<Record<string, string>>`json_object_agg(user_polls.relation, user_polls.updated_at)`.as("at")
    ])
    .where("user_polls.email", "=", email)
    .where("user_polls.relation", "in", HOME_RELATIONS)
    .where(
      sql<boolean>`(${state} = 'WAITING TO OPEN'
        or (${state} = 'OPEN' and polls.launched_at >= ${launchedSince})
        or (${state} = 'CLOSED' and polls.closed_at >= ${closedSince}))`
    )
    .groupBy("user_polls.poll_id")
    .orderBy("updated_at", "desc")
    .orderBy("user_polls.poll_id")
    .limit(limit)
    .execute();
  return members.map((m) => ({
    pid: m.poll_id,
    at: Object.fromEntries(Object.entries(m.at).map(([relation, at]) => [relation, new Date(at)]))
  }));
}

async function trendingPids(cache: Cache): Promise<string[] | null> {
  try {
    const objects = await readTrendingObjects(cache);
    return objects ? (JSON.parse(objects.counts) as TrendingCountsObject).polls.map((p) => p.pid) : null;
  } catch (err) {
    console.error("[home] Could not read the TRENDING listing:", err);
    return null;
  }
}

async function rowsOf(db: Db, pids: string[]): Promise<PollRow[]> {
  if (pids.length === 0) return [];
  const rows = await db.selectFrom("polls").selectAll().where("id", "in", pids).execute();
  const position = new Map(pids.map((pid, i) => [pid, i]));
  return rows.sort((a, b) => position.get(a.id)! - position.get(b.id)!);
}

/** Builds the user's Home list: each poll under the first of the five rules it satisfies, then rule 5 from TRENDING. */
export async function composeHomeTab(deps: HomeDeps, caller: Caller, email: string, userId: string, now: Date): Promise<HomeTab> {
  const { db, cache, config } = deps;
  const candidates = await loadHomeCandidates(db, email, now, config.maxHomePagePolls);
  const candidateRows = await rowsOf(db, candidates.map((c) => c.pid));
  const atOf = new Map(candidates.map((c) => [c.pid, c.at]));
  const holding = (relations: UserPollRelation[]) =>
    candidateRows.filter((row) => relations.some((relation) => atOf.get(row.id)![relation]));
  const [shared, reachable, watchable] = await Promise.all([
    sharedWithYouKept(db, email, holding(["invited", "linked"]).filter((row) => row.created_by_id !== userId)),
    reachableMany(deps, caller, holding(["voted"])),
    mayWatchMany(deps, caller, holding(["bookmarked"]))
  ]);
  const rules: { relations: UserPollRelation[]; kept: (pid: string) => boolean; cap: number }[] = [
    { relations: ["invited", "linked"], kept: (pid) => shared.has(pid), cap: HOME_RULE_CAP },
    { relations: ["created"], kept: () => true, cap: HOME_RULE_CAP },
    { relations: ["voted"], kept: (pid) => reachable.has(pid), cap: HOME_RULE_CAP },
    { relations: ["bookmarked"], kept: (pid) => watchable.has(pid), cap: Infinity }
  ];

  const order: string[] = [];
  const ruleOf: number[] = [];
  const placed = new Set<string>();
  rules.forEach((rule, index) => {
    const latest = (c: HomeCandidate) => Math.max(...rule.relations.map((relation) => c.at[relation]?.getTime() ?? -Infinity));
    const eligible = candidates
      .filter((c) => !placed.has(c.pid) && rule.relations.some((relation) => c.at[relation]) && rule.kept(c.pid))
      .sort((a, b) => latest(b) - latest(a));
    for (const c of eligible.slice(0, rule.cap)) {
      order.push(c.pid);
      ruleOf.push(index + 1);
      placed.add(c.pid);
    }
  });

  const trending = await trendingPids(cache);
  const fromTrending = (trending ?? []).filter((pid) => !placed.has(pid)).slice(0, HOME_RULE_CAP);
  for (const pid of fromTrending) {
    order.push(pid);
    ruleOf.push(TRENDING_RULE);
  }

  const relations = new Map<string, HomeReason[]>(
    order.map((pid, i) => [
      pid,
      ruleOf[i] === TRENDING_RULE ? ["trending"] : HOME_RELATIONS.filter((relation) => atOf.get(pid)![relation])
    ])
  );
  const byId = new Map(candidateRows.map((row) => [row.id, row]));
  const trendingRows = await rowsOf(db, fromTrending);
  for (const row of trendingRows) byId.set(row.id, row);
  return {
    order,
    rules: ruleOf,
    relations,
    rows: order.map((pid) => byId.get(pid)).filter((row): row is PollRow => row !== undefined),
    trendingReady: trending !== null
  };
}

export async function readHomeMembership(cache: Cache, email: string): Promise<HomeMembership | null> {
  try {
    const raw = await cache.get(HOME_TAB_KEY(email));
    return raw ? (JSON.parse(raw) as HomeMembership) : null;
  } catch (err) {
    console.error("[home] Could not read the Home list:", err);
    return null;
  }
}

export async function writeHomeMembership(cache: Cache, email: string, membership: HomeMembership, ttlMs: number): Promise<void> {
  try {
    await cache.set(HOME_TAB_KEY(email), JSON.stringify(membership), ttlMs);
  } catch (err) {
    console.error("[home] Could not store the Home list:", err);
  }
}

async function count(cache: Cache, key: string): Promise<void> {
  await countStat(cache, key).catch((err: unknown) => console.error(`[home] Could not count ${key}:`, err));
}

/**
 * The Home list to answer with: the cached one while it was built under the user's current list version, or while
 * the browser asks to keep its order; otherwise a fresh one. Either way the listed polls are checked again for
 * access, so a poll that turned private, was archived or banned the user from watching it drops out at once.
 */
export async function homeTabListing(
  deps: HomeDeps,
  caller: Caller,
  email: string,
  userId: string,
  version: string | null,
  keepOrder: boolean,
  now: Date
): Promise<{ rows: PollRow[]; relations: Map<string, HomeReason[]>; membershipVersion: string; v: string | null }> {
  const { db, cache, config } = deps;
  const cached = version === null ? null : await readHomeMembership(cache, email);
  let membership: Omit<HomeMembership, "v"> & { v: string | null };
  let rows: PollRow[];
  if (cached && (cached.v === version || keepOrder)) {
    membership = cached;
    rows = await rowsOf(db, cached.order);
    await count(cache, HOME_REUSED_KEY);
  } else {
    const built = await composeHomeTab(deps, caller, email, userId, now);
    membership = {
      v: version,
      builtAt: now.toISOString(),
      order: built.order,
      rules: built.rules,
      relations: [...built.relations],
      trendingReady: built.trendingReady
    };
    rows = built.rows;
    if (version !== null) {
      const ttlMs = built.trendingReady ? config.homeTabRefreshIntervalMs : config.trendingPollsRecomputeSweepIntervalMs;
      await writeHomeMembership(cache, email, { ...membership, v: version }, ttlMs);
    }
    await count(cache, HOME_REBUILT_KEY);
  }

  const ruleOf = new Map(membership.order.map((pid, i) => [pid, membership.rules[i]]));
  const published = rows.filter((row) => isPublished(row));
  const [reachable, shared, watchable] = await Promise.all([
    reachableMany(deps, caller, published),
    sharedWithYouKept(db, email, published.filter((row) => ruleOf.get(row.id) === SHARED_RULE)),
    mayWatchMany(deps, caller, published.filter((row) => ruleOf.get(row.id) === WATCHING_RULE))
  ]);
  const kept = published.filter((row) => {
    const rule = ruleOf.get(row.id);
    if (!reachable.has(row.id)) return false;
    if (rule === SHARED_RULE) return shared.has(row.id);
    if (rule === WATCHING_RULE) return watchable.has(row.id);
    return true;
  });
  return { rows: kept, relations: new Map(membership.relations), membershipVersion: membership.builtAt, v: membership.v };
}
