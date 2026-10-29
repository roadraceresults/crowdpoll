import { sql } from "kysely";
import type { Cache, StreamEntry } from "../cache/cache.js";
import type { AppConfig } from "../config.js";
import type { Db } from "../db/client.js";
import { ensureVoteHistoryPartition } from "../db/partitions.js";
import { markEverVoted, upsertUserPolls } from "../polls/store.js";
import { forgetTabs } from "../refresh/tabVersions.js";
import { recordLineGraphTally } from "../polls/lineGraphTally.js";
import { reconcile } from "../polls/counters.js";
import { withoutDeletedAccounts } from "../legal/deletedAccounts.js";
import { VOTE_GROUP, VOTE_STREAM } from "./queue.js";
import { QUEUE_LAG } from "./votePath.js";

const BLOCK_MS = 1000;
const LAG_SAMPLE_MS = 1000;
const LAG_TTL_MS = 5000;
const TRIM_EVERY_BATCHES = 20;
const RECLAIM_COUNT = 100;

interface QueuedVote {
  pid: string;
  email: string;
  userName: string;
  choiceIds: string[];
  votedAt: Date;
  voteMutability: string;
}

function parseEntry(entry: StreamEntry): QueuedVote | null {
  try {
    return {
      pid: entry.fields.pid!,
      email: entry.fields.email!,
      userName: entry.fields.userName ?? "",
      choiceIds: JSON.parse(entry.fields.choiceIds ?? "[]") as string[],
      votedAt: new Date(entry.fields.votedAt ?? Date.now()),
      voteMutability: entry.fields.voteMutability ?? "Final-Vote Poll"
    };
  } catch {
    return null;
  }
}

function idTimestamp(id: string): number {
  return Number(id.split("-")[0]);
}

export interface ConsumerDeps {
  db: Db;
  cache: Cache;
  config: Pick<AppConfig, "voteBatchSize" | "voteQueueLagNoticeMs">;
  consumerName: string;
}

/** One batch: the rows of every vote, idempotently, in one transaction. */
export async function writeBatch(db: Db, queued: QueuedVote[]): Promise<void> {
  if (queued.length === 0) return;
  const existing = new Set(
    (await db.selectFrom("polls").select("id").where("id", "in", [...new Set(queued.map((v) => v.pid))]).execute()).map((r) => r.id)
  );
  const votes = queued.filter((v) => existing.has(v.pid));
  if (votes.length < queued.length) console.log(`[votes] dropped ${queued.length - votes.length} vote(s) for polls that no longer exist`);
  if (votes.length === 0) return;
  const months = new Set(votes.map((v) => `${v.votedAt.getUTCFullYear()}-${v.votedAt.getUTCMonth()}`));
  for (const month of months) {
    const [year, m] = month.split("-").map(Number);
    await ensureVoteHistoryPartition(db, new Date(Date.UTC(year!, m!, 1)));
  }
  await db.transaction().execute(async (trx) => {
    // One row per participant per poll in a statement: the last vote of a
    // Dynamic-Vote poll wins, the first of a Final-Vote poll.
    const current = new Map<string, QueuedVote>();
    for (const vote of votes) {
      const key = `${vote.pid}\n${vote.email}`;
      const held = current.get(key);
      const replaces = !held || (vote.voteMutability === "Dynamic-Vote Poll" ? vote.votedAt >= held.votedAt : vote.votedAt < held.votedAt);
      if (replaces) current.set(key, vote);
    }
    const byMutability = new Map<string, QueuedVote[]>();
    for (const vote of current.values()) {
      const group = byMutability.get(vote.voteMutability) ?? [];
      group.push(vote);
      byMutability.set(vote.voteMutability, group);
    }
    for (const [mutability, group] of byMutability) {
      const values = sql.join(
        group.map((v) => sql`(${v.pid}, ${v.email}, ${v.userName}, ${v.choiceIds}::text[], ${v.votedAt}::timestamptz)`)
      );
      if (mutability === "Dynamic-Vote Poll") {
        await sql`
          insert into votes (poll_id, email, user_name, choice_ids, voted_at)
          values ${values}
          on conflict (poll_id, email) do update
            set user_name = excluded.user_name, choice_ids = excluded.choice_ids, voted_at = excluded.voted_at
            where votes.voted_at is null or excluded.voted_at >= votes.voted_at`.execute(trx);
      } else {
        await sql`
          insert into votes (poll_id, email, user_name, choice_ids, voted_at)
          values ${values}
          on conflict (poll_id, email) do update
            set user_name = excluded.user_name, choice_ids = excluded.choice_ids, voted_at = excluded.voted_at
            where cardinality(votes.choice_ids) = 0`.execute(trx);
      }
    }
    await trx
      .insertInto("vote_history")
      .values(
        votes.map((v) => ({ poll_id: v.pid, email: v.email, user_name: v.userName, choice_ids: v.choiceIds, voted_at: v.votedAt }))
      )
      .execute();
    await recordLineGraphTally(trx, votes);
    await markEverVoted(trx, [...new Set(votes.map((v) => v.pid))]);
    const latest = new Map<string, Date>();
    for (const v of votes) {
      const key = `${v.email}\n${v.pid}`;
      const seen = latest.get(key);
      if (!seen || v.votedAt > seen) latest.set(key, v.votedAt);
    }
    await upsertUserPolls(
      trx,
      [...latest.keys()].map((key) => {
        const [email, pid] = key.split("\n");
        return { email: email!, pid: pid!, relation: "voted" as const };
      })
    );
  });
}

export interface Consumer {
  start(): void;
  /** Finishes and acknowledges the batch in hand, then resolves. */
  stop(): Promise<void>;
  pause(): void;
  resume(): void;
  /** Runs one read-write-ack round without blocking; for tests and the reconcile script. */
  runOnce(): Promise<number>;
}

// Consumer groups: https://valkey.io/topics/streams-intro/#consumer-groups
export function createConsumer({ db, cache, config, consumerName }: ConsumerDeps): Consumer {
  let running = false;
  let stopping = false;
  let paused = !cache.isConnected();
  let loop: Promise<void> | null = null;
  let batches = 0;
  let lastLagSampleAt = 0;

  async function sampleLag(entries: StreamEntry[]): Promise<void> {
    const now = Date.now();
    if (now - lastLagSampleAt < LAG_SAMPLE_MS) return;
    lastLagSampleAt = now;
    const oldest = entries.length > 0 ? idTimestamp(entries[0]!.id) : now;
    const lagMs = Math.max(0, now - oldest);
    await cache.set(QUEUE_LAG, String(lagMs), LAG_TTL_MS);
    if (lagMs >= config.voteQueueLagNoticeMs) console.log(`[votes] consumer lag ${lagMs}ms (${entries.length} in this batch)`);
  }

  async function processEntries(entries: StreamEntry[]): Promise<number> {
    if (entries.length === 0) return 0;
    const parsed = entries.map(parseEntry).filter((v): v is QueuedVote => v !== null);
    const { kept: votes, droppedPids } = await withoutDeletedAccounts(cache, parsed);
    await writeBatch(db, votes);
    await forgetTabs(cache, votes.map((v) => v.email));
    if (droppedPids.length > 0) {
      console.log(`[votes] Skipped ${parsed.length - votes.length} queued vote(s) from deleted accounts`);
      await reconcile({ db, cache }, droppedPids);
    }
    await cache.xack(VOTE_STREAM, VOTE_GROUP, entries.map((e) => e.id));
    batches += 1;
    if (batches % TRIM_EVERY_BATCHES === 0) await cache.xtrim(VOTE_STREAM, entries[entries.length - 1]!.id);
    return votes.length;
  }

  async function round(blockMs: number): Promise<number> {
    const reclaimed = await cache.xautoclaim(VOTE_STREAM, VOTE_GROUP, consumerName, config.voteQueueLagNoticeMs, RECLAIM_COUNT);
    let written = await processEntries(reclaimed);
    const entries = await cache.xreadgroup(VOTE_STREAM, VOTE_GROUP, consumerName, config.voteBatchSize, blockMs);
    await sampleLag(entries);
    written += await processEntries(entries);
    return written;
  }

  async function run(): Promise<void> {
    while (!stopping) {
      if (paused || !cache.isConnected()) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        continue;
      }
      try {
        await round(BLOCK_MS);
      } catch (err) {
        console.error("[votes] consumer round failed; retrying shortly:", err);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  cache.onDisconnect(() => {
    paused = true;
    console.log("[votes] consumer paused: cache unreachable");
  });
  cache.onReconnect(() => {
    paused = false;
    console.log("[votes] consumer resumed");
  });

  return {
    start() {
      if (running) return;
      running = true;
      stopping = false;
      console.log(`[votes] consumer ${consumerName} started (batch ${config.voteBatchSize})`);
      loop = run();
    },
    async stop() {
      stopping = true;
      if (loop) await loop;
      running = false;
      console.log(`[votes] consumer ${consumerName} stopped; batch in hand acknowledged`);
    },
    pause: () => {
      paused = true;
    },
    resume: () => {
      paused = false;
    },
    runOnce: () => round(0)
  };
}
