/**
 * The recurring background processes. Each sweep is exported as a single-tick
 * function taking the current time, so tests call one tick directly with a chosen
 * timestamp instead of waiting out a real interval. Timer scheduling lives in
 * `startSweeps`, where each tick runs under a PostgreSQL advisory lock so that one
 * instance of the fleet performs it and the others return at once.
 * https://www.postgresql.org/docs/16/explicit-locking.html#ADVISORY-LOCKS
 */
import { sql } from "kysely";
import type { AppConfig } from "../config.js";
import type { Db } from "../db/client.js";
import { ensureVoteHistoryPartition } from "../db/partitions.js";
import {
  claimNextForApproval,
  recoverCrashedApprovalClaim,
  scheduleCandidates,
  staleEditingPolls,
  updatePoll,
  type StoreDeps
} from "./store.js";
import { evaluateSchedule, correctInvertedSchedule } from "./service.js";
import { screenWithTimeout, localScreener, type Screener } from "./screening.js";
import { dirtyDayKey, flushDirty, reconcile } from "./counters.js";
import { recomputeNewest, recomputeTrending } from "../trending/recompute.js";
import type { Publisher } from "../trending/publish.js";
import { drainOutbox } from "../search/outbox.js";
import type { Search } from "../search/search.js";
import { controllerTick } from "../load/controller.js";
import { removeExpiredBookmarks } from "./bookmarks.js";
import type { Budget } from "../load/budget.js";
import { sendPendingInvitations } from "../invitations/sender.js";

export interface SweepDeps extends StoreDeps {
  config?: AppConfig;
}

export interface SweepTick {
  (deps: SweepDeps, now?: Date): Promise<number>;
}

export interface SweepSchedule {
  name: string;
  intervalMs: number;
  lockId: number;
  tick: SweepTick;
  /** Also run once as soon as the sweeps start, so the listing exists before the first visitor. */
  runAtStart?: boolean;
}

export const SWEEP_LOCKS = {
  approval: 1,
  schedule: 2,
  counterFlush: 3,
  trending: 4,
  outbox: 5,
  bookmarks: 6,
  reconcile: 7,
  controller: 8,
  staleEdit: 9,
  newest: 10,
  retention: 11,
  invitations: 12
} as const;

const INVITATION_SWEEP_INTERVAL_MS = 5_000;

/**
 * Runs `fn` while holding the advisory lock, or returns null at once when another
 * instance holds it. The lock is transaction-scoped, so it is released however `fn` ends.
 */
export async function withAdvisoryLock<T>(db: Db, lockId: number, fn: () => Promise<T>): Promise<T | null> {
  return db.transaction().execute(async (trx) => {
    const { rows } = await sql<{ locked: boolean }>`select pg_try_advisory_xact_lock(${lockId}) as locked`.execute(trx);
    if (!rows[0]?.locked) return null;
    return fn();
  });
}

/** The cache client gives each command a short deadline and fails at once when it is missed (valkeyCache.ts). */
function isCacheTimeout(err: unknown): boolean {
  return err instanceof Error && err.message === "Command timed out";
}

/**
 * Wraps a tick so that it never overlaps itself on this instance, never throws
 * into the timer, and yields to whichever instance holds the sweep's lock.
 */
export function guardTick(name: string, lockId: number, tick: SweepTick): (deps: SweepDeps) => Promise<void> {
  let running = false;
  return async (deps: SweepDeps) => {
    if (running) return;
    running = true;
    try {
      const result = await withAdvisoryLock(deps.db, lockId, () => tick(deps));
      if (result === null) console.log(`[sweeps] ${name}: another instance holds lock ${lockId}; skipped`);
      else if (result > 0) console.log(`[sweeps] ${name}: ${result} change(s)`);
    } catch (err) {
      // A missed cache deadline corrects itself on the next tick: one line, no stack.
      if (isCacheTimeout(err)) console.warn(`[sweeps] ${name}: the cache did not answer in time; retrying next tick`);
      else console.error(`[sweeps] ${name} tick failed:`, err);
    } finally {
      running = false;
    }
  };
}

export interface RunningSweeps {
  stop(): void;
  pause(): void;
  resume(): void;
}

/** Starts every sweep on its own interval; paused while the cache is unreachable. */
export function startSweeps(deps: SweepDeps, schedules: SweepSchedule[]): RunningSweeps {
  let paused = !deps.cache.isConnected();
  const timers = schedules.map(({ name, intervalMs, lockId, tick, runAtStart }) => {
    const guarded = guardTick(name, lockId, tick);
    console.log(`[sweeps] ${name} every ${intervalMs}ms (lock ${lockId})`);
    if (runAtStart && !paused) void guarded(deps);
    const t = setInterval(() => {
      if (!paused) void guarded(deps);
    }, intervalMs);
    t.unref();
    return t;
  });
  const running: RunningSweeps = {
    stop() {
      for (const t of timers) clearInterval(t);
    },
    pause() {
      if (!paused) console.log("[sweeps] paused: cache unreachable");
      paused = true;
    },
    resume() {
      if (paused) console.log("[sweeps] resumed: cache reachable");
      paused = false;
    }
  };
  deps.cache.onDisconnect(() => running.pause());
  deps.cache.onReconnect(() => running.resume());
  return running;
}

/**
 * `staleEditUpdateSweep` — releases editing sessions whose client stopped
 * signalling. A session is stale once its heartbeat is older than twice the
 * heartbeat interval; the poll returns to the state it held before editing began.
 */
export async function staleEditUpdateSweep(
  deps: SweepDeps,
  heartbeatIntervalMs: number,
  now: Date = new Date()
): Promise<number> {
  const cutoff = new Date(now.getTime() - heartbeatIntervalMs * 2);
  const stale = await staleEditingPolls(deps.db, cutoff);
  let released = 0;
  for (const poll of stale) {
    const updated = await updatePoll(
      deps,
      poll._id,
      {
        pollState: poll.pollStateBeforeEditUpdate ?? "INITIALIZED",
        pollStateBeforeEditUpdate: null,
        pollEditUpdateHeartbeatTimestamp: null,
        pollEditUpdateClientGUID: null
      },
      { pollEditUpdateClientGUID: poll.pollEditUpdateClientGUID }
    );
    if (updated) released += 1;
  }
  return released;
}

export interface ApprovalSweepDeps {
  maxAttempts: number;
  callTimeoutMs: number;
  screener?: Screener;
}

/**
 * `pollsAwaitingApprovalSweep` — one poll per tick. A claim abandoned by a process
 * that died mid-call is recovered before any new screening starts; the attempt is
 * counted when the claim is taken, never re-counted on a timeout.
 */
export async function pollsAwaitingApprovalSweep(
  deps: SweepDeps,
  approval: ApprovalSweepDeps,
  now: Date = new Date()
): Promise<number> {
  const screener = approval.screener ?? localScreener;

  const cutoff = new Date(now.getTime() - approval.callTimeoutMs * 2);
  if (await recoverCrashedApprovalClaim(deps, cutoff)) return 1;

  const claimed = await claimNextForApproval(deps, now);
  if (!claimed) return 0;

  if (claimed.pollAcceptabilityScreeningAttempts > approval.maxAttempts) {
    await updatePoll(deps, claimed._id, {
      pollState: "REJECTED",
      pollRejectionReason: `Acceptability Screening has failed ${approval.maxAttempts} times and will not automatically be re-attempted.`,
      pollApprovalTimestamp: null,
      pollAcceptabilityScreeningAttempts: approval.maxAttempts
    });
    return 1;
  }

  let verdict: string;
  try {
    verdict = await screenWithTimeout(
      screener,
      {
        title: claimed.title,
        subtitle: claimed.subtitle,
        choiceLabels: claimed.choices.map((c) => c.label)
      },
      approval.callTimeoutMs
    );
  } catch {
    await updatePoll(deps, claimed._id, {
      pollApprovalTimestamp: null,
      pollRejectionReason: `Acceptability Screening has timed out ${claimed.pollAcceptabilityScreeningAttempts} times`
    });
    return 1;
  }

  if (verdict !== "") {
    await updatePoll(deps, claimed._id, {
      pollState: "REJECTED",
      pollRejectionReason: verdict,
      pollApprovalTimestamp: null,
      pollAcceptabilityScreeningAttempts: 0
    });
    return 1;
  }

  await updatePoll(deps, claimed._id, {
    pollState: evaluateSchedule(claimed, now),
    pollRejectionReason: null,
    pollApprovalTimestamp: null,
    pollAcceptabilityScreeningAttempts: 0
  });
  return 1;
}

/**
 * `pollDateCheckSweep` — moves polls between WAITING TO OPEN, OPEN and CLOSED as
 * their schedule dictates. Only polls whose stored state disagrees with their
 * schedule are read, so the pass stays cheap however many polls exist.
 */
export async function pollDateCheckSweep(deps: SweepDeps, now: Date = new Date()): Promise<number> {
  const candidates = await scheduleCandidates(deps.db, now);
  let changed = 0;
  for (const poll of candidates) {
    const correction = correctInvertedSchedule(poll);
    if (correction) {
      await updatePoll(deps, poll._id, { startAt: correction.startAt, pollState: correction.pollState });
      changed += 1;
      continue;
    }
    const next = evaluateSchedule(poll, now);
    if (next !== poll.pollState) {
      await updatePoll(deps, poll._id, { pollState: next });
      changed += 1;
    }
  }
  return changed;
}

/** The schedule sweep also keeps next month's vote-history partition ready. */
export async function scheduleSweep(deps: SweepDeps, now: Date = new Date()): Promise<number> {
  const changed = await pollDateCheckSweep(deps, now);
  await ensureVoteHistoryPartition(deps.db, new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)));
  return changed;
}

export async function counterFlushSweep(deps: SweepDeps, now: Date = new Date()): Promise<number> {
  return flushDirty(deps, now);
}

const DAY_MS = 24 * 3_600_000;

const VOTE_HISTORY_RETENTION_MONTHS = 12;
const EMAIL_CHANGE_LINK_MS = 15 * 60_000;

/** Daily: removes what the Privacy Policy says is no longer kept (data-model.md Retention). */
export async function retentionSweep(deps: SweepDeps, config: AppConfig, now: Date = new Date()): Promise<number> {
  const { db } = deps;
  const sessions = await db.deleteFrom("session").where("expiresAt", "<", now).executeTakeFirst();
  const links = await db.deleteFrom("verification").where("expiresAt", "<", now).executeTakeFirst();
  const changes = await db
    .deleteFrom("email_change_requests")
    .where("created_at", "<", new Date(now.getTime() - EMAIL_CHANGE_LINK_MS))
    .executeTakeFirst();
  const limits = await db
    .deleteFrom("rateLimit")
    .where("lastRequest", "<", now.getTime() - config.emailRateLimitWindowMinutes * 60_000)
    .executeTakeFirst();
  const invitationSends = await db
    .deleteFrom("invitation_emails")
    .where("sent_at", "<", new Date(now.getTime() - DAY_MS))
    .executeTakeFirst();
  const partitions = await dropOldVoteHistory(db, now);
  const counts = [sessions, links, changes, limits, invitationSends].map((r) => Number(r.numDeletedRows));
  console.log(
    `[retention] Removed ${counts[0]} session(s), ${counts[1]} link(s), ${counts[2]} email change(s), ${counts[3]} rate-limit record(s), ${counts[4]} invitation send record(s); dropped ${partitions} vote-history partition(s)`
  );
  return counts.reduce((a, b) => a + b, partitions);
}

async function dropOldVoteHistory(db: Db, now: Date): Promise<number> {
  const keepFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - VOTE_HISTORY_RETENTION_MONTHS, now.getUTCDate()));
  const children = await sql<{ name: string }>`
    select c.relname as name from pg_inherits i
    join pg_class c on c.oid = i.inhrelid
    join pg_class p on p.oid = i.inhparent
    where p.relname = 'vote_history'`.execute(db);
  let dropped = 0;
  for (const { name } of children.rows) {
    const match = /^vote_history_(\d{4})_(\d{2})$/.exec(name);
    if (!match) continue;
    const monthEnd = new Date(Date.UTC(Number(match[1]), Number(match[2]), 1));
    if (monthEnd >= keepFrom) continue;
    await sql`drop table if exists ${sql.table(name)}`.execute(db);
    dropped += 1;
  }
  return dropped;
}

/** Nightly: recompute yesterday's dirty polls from their vote rows. */
export async function reconcileSweep(deps: SweepDeps, now: Date = new Date()): Promise<number> {
  const yesterday = new Date(now.getTime() - DAY_MS);
  const pids = await deps.cache.smembers(dirtyDayKey(yesterday));
  return reconcile(deps, pids);
}

export async function trendingSweep(
  deps: SweepDeps,
  config: AppConfig,
  publisher: Publisher,
  now: Date = new Date()
): Promise<number> {
  const listing = await recomputeTrending({ db: deps.db, cache: deps.cache, config }, now);
  const published = await publisher.publish(listing);
  if (published.counts) {
    console.log(`[trending] published counts${published.cards ? " and cards" : ""} for ${listing.order.length} polls`);
  }
  return listing.order.length;
}

export async function newestSweep(
  deps: SweepDeps,
  config: AppConfig,
  publisher: Publisher,
  now: Date = new Date()
): Promise<number> {
  const listing = await recomputeNewest({ db: deps.db, cache: deps.cache, config }, now);
  const published = await publisher.publish(listing);
  if (published.counts) {
    console.log(
      `[newest] published counts${published.cards ? " and cards" : ""} for ${listing.order.length} polls to Spaces bucket "${config.spaces?.bucket}"`
    );
  }
  return listing.order.length;
}

export interface SweepServices {
  trendingPublisher: Publisher;
  newestPublisher: Publisher;
  search: Search;
  budget: Budget;
}

export function buildSweepSchedules(config: AppConfig, services: SweepServices): SweepSchedule[] {
  return [
    {
      name: "staleEditUpdateSweep",
      intervalMs: config.pollEditUpdateHeartbeatIntervalMs * 2,
      lockId: SWEEP_LOCKS.staleEdit,
      tick: (deps, now) => staleEditUpdateSweep(deps, config.pollEditUpdateHeartbeatIntervalMs, now)
    },
    {
      name: "pollsAwaitingApprovalSweep",
      intervalMs: config.pollApprovalPollingIntervalMs,
      lockId: SWEEP_LOCKS.approval,
      tick: (deps, now) =>
        pollsAwaitingApprovalSweep(
          deps,
          { maxAttempts: config.maxAcceptabilityScreeningAttempts, callTimeoutMs: config.apiCallTimeoutMs },
          now
        )
    },
    {
      name: "scheduleSweep",
      intervalMs: config.pollDateCheckPollingIntervalMs,
      lockId: SWEEP_LOCKS.schedule,
      tick: (deps, now) => scheduleSweep(deps, now)
    },
    {
      name: "counterFlushSweep",
      intervalMs: config.counterFlushIntervalMs,
      lockId: SWEEP_LOCKS.counterFlush,
      tick: (deps, now) => counterFlushSweep(deps, now)
    },
    {
      name: "trendingSweep",
      intervalMs: config.trendingRecomputeIntervalMs,
      lockId: SWEEP_LOCKS.trending,
      runAtStart: true,
      tick: (deps, now) => trendingSweep(deps, config, services.trendingPublisher, now)
    },
    {
      name: "newestSweep",
      intervalMs: config.newestRecomputeIntervalMs,
      lockId: SWEEP_LOCKS.newest,
      runAtStart: true,
      tick: (deps, now) => newestSweep(deps, config, services.newestPublisher, now)
    },
    {
      name: "outboxDrainSweep",
      intervalMs: config.outboxDrainIntervalMs,
      lockId: SWEEP_LOCKS.outbox,
      tick: (deps) => drainOutbox(deps.db, services.search.openSearch)
    },
    {
      name: "bookmarkRemovalSweep",
      intervalMs: DAY_MS,
      lockId: SWEEP_LOCKS.bookmarks,
      tick: (deps, now) => removeExpiredBookmarks(deps.db, config.bookmarkExpiryMonths, now)
    },
    {
      name: "invitationSweep",
      intervalMs: INVITATION_SWEEP_INTERVAL_MS,
      lockId: SWEEP_LOCKS.invitations,
      tick: (deps, now) => sendPendingInvitations({ db: deps.db, config }, undefined, now)
    },
    {
      name: "retentionSweep",
      intervalMs: DAY_MS,
      lockId: SWEEP_LOCKS.retention,
      tick: (deps, now) => retentionSweep(deps, config, now)
    },
    {
      name: "reconcileSweep",
      intervalMs: DAY_MS,
      lockId: SWEEP_LOCKS.reconcile,
      tick: (deps, now) => reconcileSweep(deps, now)
    },
    {
      name: "budgetController",
      intervalMs: config.budgetControllerIntervalMs,
      lockId: SWEEP_LOCKS.controller,
      tick: async (deps, now) => {
        await controllerTick({ cache: deps.cache, config, budget: services.budget, search: services.search }, now);
        return 0;
      }
    }
  ];
}

