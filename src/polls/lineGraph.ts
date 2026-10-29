/**
 * The maximized view's line-graph series: the poll's hourly tally summed into
 * UTC buckets with computeResults's percentage formula, filtered by current
 * share, and cached per poll and scale.
 */
import { sql } from "kysely";
import type { AppConfig } from "../config.js";
import type { Cache } from "../cache/cache.js";
import type { PollChoiceJson } from "../db/schema.js";
import type { Db } from "./store.js";
import { TALLY_VOTERS, tallyDeltas } from "./lineGraphTally.js";

export type ScaleKey = "1d" | "1w" | "1m" | "1y";

interface ScaleSpec {
  windowMs: number;
  bucketMs: number;
  minSpanMs: number;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const SCALES: Record<ScaleKey, ScaleSpec> = {
  "1d": { windowMs: DAY, bucketMs: HOUR, minSpanMs: 0 },
  "1w": { windowMs: 7 * DAY, bucketMs: HOUR, minSpanMs: DAY },
  "1m": { windowMs: 31 * DAY, bucketMs: DAY, minSpanMs: 7 * DAY },
  "1y": { windowMs: 366 * DAY, bucketMs: DAY, minSpanMs: 31 * DAY }
};

const SCALE_ORDER: readonly ScaleKey[] = ["1d", "1w", "1m", "1y"];

/** The scales a poll's data span supports, ordered smallest to largest. */
export function availableScales(spanMs: number): ScaleKey[] {
  return SCALE_ORDER.filter((key) => spanMs >= SCALES[key].minSpanMs);
}

/**
 * UTC-aligned bucket boundaries from the first vote (clamped to the scale's
 * window) up to now, plus a final point at now. No votes yields just the now
 * point, so a graphless poll shows fewer than two buckets.
 */
export function bucketTimes(scale: ScaleKey, firstVoteAt: Date | undefined, now: Date): number[] {
  const end = now.getTime();
  const { windowMs, bucketMs } = SCALES[scale];
  const times: number[] = [];
  if (firstVoteAt) {
    const start = Math.max(end - windowMs, firstVoteAt.getTime());
    for (let t = Math.ceil(start / bucketMs) * bucketMs; t < end; t += bucketMs) times.push(t);
  }
  times.push(end);
  return times;
}

export interface ReplayEvent {
  email: string;
  choice_ids: string[];
  voted_at: Date;
}

export interface LineGraphSeries {
  id: string;
  label: string;
  color: string | null;
  points: number[];
}

/** A tally change at or before `at` (ms): it counts toward every point whose bucket is >= at. */
export interface TallyRow {
  at: number;
  choiceId: string;
  delta: number;
}

/**
 * Sums the tally rows into every bucket — a row counts toward a point when its
 * `at` is <= the bucket, and every row toward the final "now" point — and gives
 * each point computeResults's formula: single-choice: count / voters with a
 * non-empty selection; multiple-choice: count / total selections of current
 * choices. Choices are then filtered by current (newest-point) share > the
 * threshold; 0 disables the filter.
 */
export function seriesFromTally(
  poll: { choices: PollChoiceJson[]; choice_mode: string },
  rows: TallyRow[],
  buckets: number[],
  minVotePercentage: number
): { totalVoted: number; series: LineGraphSeries[] } {
  const choices = [...poll.choices].sort((a, b) => a.position - b.position);
  const multiple = poll.choice_mode === "Multiple-Choice Poll";
  const counts = new Map<string, number>(choices.map((c) => [c.id, 0]));
  const sorted = [...rows].sort((a, b) => a.at - b.at);
  let totalVoted = 0;
  let totalSelections = 0;

  function apply(row: TallyRow): void {
    if (row.choiceId === TALLY_VOTERS) {
      totalVoted += row.delta;
      return;
    }
    const held = counts.get(row.choiceId);
    if (held === undefined) return;
    counts.set(row.choiceId, held + row.delta);
    totalSelections += row.delta;
  }

  const points = new Map<string, number[]>(choices.map((c) => [c.id, []]));
  let next = 0;
  buckets.forEach((bucket, i) => {
    const last = i === buckets.length - 1;
    while (next < sorted.length && (last || sorted[next]!.at <= bucket)) apply(sorted[next++]!);
    const share = multiple ? totalSelections : totalVoted;
    for (const choice of choices) {
      const count = counts.get(choice.id)!;
      points.get(choice.id)!.push(share > 0 ? Math.round((count / share) * 100) : 0);
    }
  });

  const series = choices
    .filter((choice) => {
      if (minVotePercentage === 0) return true;
      const line = points.get(choice.id)!;
      return line[line.length - 1]! > minVotePercentage;
    })
    .map((choice) => ({
      id: choice.id,
      label: choice.label,
      color: choice.color ?? null,
      points: points.get(choice.id)!
    }));

  return { totalVoted, series };
}

/**
 * The graph of one poll's raw history, ascending or not: each email's latest
 * selection wins. The same tally arithmetic the vote writers keep, so tests can
 * state a graph as the votes behind it.
 */
export function buildSeries(
  poll: { choices: PollChoiceJson[]; choice_mode: string },
  events: ReplayEvent[],
  buckets: number[],
  minVotePercentage: number
): { totalVoted: number; series: LineGraphSeries[] } {
  const deltas = tallyDeltas(
    new Map(),
    events.map((e) => ({ pid: "", email: e.email, choiceIds: e.choice_ids, votedAt: e.voted_at }))
  );
  return seriesFromTally(
    poll,
    deltas.map((d) => ({ at: d.hour, choiceId: d.choiceId, delta: d.delta })),
    buckets,
    minVotePercentage
  );
}

export interface LineGraphDeps {
  db: Db;
  cache: Cache;
  config: Pick<AppConfig, "lineGraphMinVotePercentage" | "lineGraphRefreshIntervalMs">;
}

/**
 * The response body for GET /api/polls/:pid/line-graph, as serialized JSON:
 * every available scale at once, so switching scales needs no request;
 * read-through on the shared cache, key line-graph:<pid>, TTL the refresh
 * interval. Null means the poll does not exist (404). The caller has already
 * checked access (mayViewResults).
 */
export async function serveLineGraph(deps: LineGraphDeps, pid: string, now = new Date()): Promise<string | null> {
  const { db, cache, config } = deps;
  const key = `line-graph:${pid}`;
  const cached = await cache.get(key);
  if (cached !== null) return cached;

  const poll = await db.selectFrom("polls").select(["choices", "choice_mode"]).where("id", "=", pid).executeTakeFirst();
  if (!poll) return null;
  const started = performance.now();
  const first = await db
    .selectFrom("vote_history")
    .select("voted_at")
    .where("poll_id", "=", pid)
    .orderBy("voted_at")
    .limit(1)
    .executeTakeFirst();
  const available = availableScales(first ? now.getTime() - first.voted_at.getTime() : 0);

  let totalVoted = 0;
  let tallyRows = 0;
  const scales: Partial<Record<ScaleKey, { buckets: number[]; series: LineGraphSeries[] }>> = {};
  for (const scale of available) {
    const buckets = bucketTimes(scale, first?.voted_at, now);
    const bucketSeconds = SCALES[scale].bucketMs / 1000;
    // Hours before the first bucket fold into it; every hour lands on the first bucket boundary at or after it.
    const { rows } = await sql<{ at: Date; choice_id: string; delta: number }>`
      select to_timestamp(ceil(extract(epoch from greatest(hour, ${new Date(buckets[0]!)}::timestamptz)) / ${bucketSeconds}) * ${bucketSeconds}) as at,
             choice_id, sum(delta)::int as delta
      from line_graph_tally
      where poll_id = ${pid}
      group by 1, 2`.execute(db);
    tallyRows += rows.length;
    const tally = rows.map((r) => ({ at: r.at.getTime(), choiceId: r.choice_id, delta: r.delta }));
    const view = seriesFromTally(poll, tally, buckets, config.lineGraphMinVotePercentage);
    totalVoted = view.totalVoted;
    scales[scale] = { buckets, series: view.series };
  }
  const defaultScale = available[available.length - 1]!;
  const body = JSON.stringify({ defaultScale, availableScales: available, totalVoted, scales });
  await cache.set(key, body, config.lineGraphRefreshIntervalMs);
  console.log(
    `[line-graph] poll ${pid} scales ${available.join(",")} — ${tallyRows} tally rows summed in ${Math.round(performance.now() - started)} ms`
  );
  return body;
}
