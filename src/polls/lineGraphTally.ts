/**
 * The line graph's running totals, kept beside vote_history so the graph never
 * reads the history itself: line_graph_tally holds, per poll, hour and choice,
 * how much the count changed in that hour (the voter count under TALLY_VOTERS),
 * and line_graph_selection holds each address's latest selection, which the
 * next vote replaces. Every vote_history insert calls recordLineGraphTally in
 * the same transaction.
 */
import { sql, type Kysely } from "kysely";

/** The tally's choice id for the number of addresses with a non-empty selection. */
export const TALLY_VOTERS = "";

const HOUR = 3_600_000;
const ROWS_PER_STATEMENT = 2000;

export interface TallyEvent {
  pid: string;
  email: string;
  choiceIds: string[];
  votedAt: Date;
}

export interface Selection {
  choiceIds: string[];
  votedAt: number;
}

export interface TallyDelta {
  pid: string;
  hour: number;
  choiceId: string;
  delta: number;
}

const selectionKey = (pid: string, email: string) => `${pid}\n${email}`;

/**
 * Applies the events in time order to the selections held (keyed pid\nemail,
 * updated in place) and returns the non-zero changes per poll, hour and choice.
 * An event's hour is the first hour boundary at or after it, so a graph point
 * at boundary t sums every hour <= t. An event older than the address's latest
 * selection was superseded before it arrived and changes nothing.
 */
export function tallyDeltas(latest: Map<string, Selection>, events: TallyEvent[]): TallyDelta[] {
  const sums = new Map<string, TallyDelta>();
  const add = (pid: string, hour: number, choiceId: string, delta: number) => {
    const key = `${pid}\n${hour}\n${choiceId}`;
    const held = sums.get(key);
    if (held) held.delta += delta;
    else sums.set(key, { pid, hour, choiceId, delta });
  };
  for (const event of [...events].sort((a, b) => a.votedAt.getTime() - b.votedAt.getTime())) {
    const key = selectionKey(event.pid, event.email);
    const votedAt = event.votedAt.getTime();
    const held = latest.get(key);
    if (held && votedAt < held.votedAt) continue;
    const hour = Math.ceil(votedAt / HOUR) * HOUR;
    const previous = held?.choiceIds ?? [];
    const next = [...new Set(event.choiceIds)];
    for (const id of previous) add(event.pid, hour, id, -1);
    for (const id of next) add(event.pid, hour, id, 1);
    add(event.pid, hour, TALLY_VOTERS, (next.length > 0 ? 1 : 0) - (previous.length > 0 ? 1 : 0));
    latest.set(key, { choiceIds: next, votedAt });
  }
  return [...sums.values()].filter((d) => d.delta !== 0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Executor = Kysely<any>;

/** Folds vote_history rows just inserted into the tally; call inside their transaction. */
export async function recordLineGraphTally(trx: Executor, events: TallyEvent[]): Promise<void> {
  if (events.length === 0) return;
  const pairs = [...new Map(events.map((e) => [selectionKey(e.pid, e.email), e])).values()];
  const latest = new Map<string, Selection>();
  for (let i = 0; i < pairs.length; i += ROWS_PER_STATEMENT) {
    const keys = sql.join(pairs.slice(i, i + ROWS_PER_STATEMENT).map((e) => sql`(${e.pid}, ${e.email})`));
    const { rows } = await sql<{ poll_id: string; email: string; choice_ids: string[]; voted_at: Date }>`
      select poll_id, email, choice_ids, voted_at from line_graph_selection
      where (poll_id, email) in (${keys})
      for update`.execute(trx);
    for (const row of rows) latest.set(selectionKey(row.poll_id, row.email), { choiceIds: row.choice_ids, votedAt: row.voted_at.getTime() });
  }

  const deltas = tallyDeltas(latest, events);
  for (let i = 0; i < deltas.length; i += ROWS_PER_STATEMENT) {
    const values = sql.join(
      deltas.slice(i, i + ROWS_PER_STATEMENT).map((d) => sql`(${d.pid}, ${new Date(d.hour)}::timestamptz, ${d.choiceId}, ${d.delta}::int)`)
    );
    await sql`
      insert into line_graph_tally (poll_id, hour, choice_id, delta)
      values ${values}
      on conflict (poll_id, hour, choice_id) do update set delta = line_graph_tally.delta + excluded.delta`.execute(trx);
  }

  const changed = pairs
    .map((e) => ({ pid: e.pid, email: e.email, selection: latest.get(selectionKey(e.pid, e.email)) }))
    .filter((s): s is { pid: string; email: string; selection: Selection } => s.selection !== undefined);
  for (let i = 0; i < changed.length; i += ROWS_PER_STATEMENT) {
    const values = sql.join(
      changed
        .slice(i, i + ROWS_PER_STATEMENT)
        .map((s) => sql`(${s.pid}, ${s.email}, ${s.selection.choiceIds}::text[], ${new Date(s.selection.votedAt)}::timestamptz)`)
    );
    await sql`
      insert into line_graph_selection (poll_id, email, choice_ids, voted_at)
      values ${values}
      on conflict (poll_id, email) do update set choice_ids = excluded.choice_ids, voted_at = excluded.voted_at
        where excluded.voted_at >= line_graph_selection.voted_at`.execute(trx);
  }
}

/**
 * Computes the tally and the latest selections from vote_history, for one
 * poll or (pid omitted) every poll, into empty rows: the backfill of migration
 * 012 and the rebuild after history rows are deleted.
 */
export async function fillLineGraphTally(db: Executor, pid?: string): Promise<void> {
  const only = pid === undefined ? sql`` : sql`where h.poll_id = ${pid}`;
  await sql`
    insert into line_graph_selection (poll_id, email, choice_ids, voted_at)
    select distinct on (h.poll_id, h.email) h.poll_id, h.email, h.choice_ids, h.voted_at
    from vote_history h join polls p on p.id = h.poll_id
    ${only}
    order by h.poll_id, h.email, h.voted_at desc`.execute(db);
  await sql`
    insert into line_graph_tally (poll_id, hour, choice_id, delta)
    with h as (
      select h.poll_id, h.email, h.choice_ids, h.voted_at,
             to_timestamp(ceil(extract(epoch from h.voted_at) / 3600) * 3600) as hour
      from vote_history h join polls p on p.id = h.poll_id
      ${only}
    ), last as (
      select distinct on (poll_id, email, hour) poll_id, email, hour, choice_ids
      from h order by poll_id, email, hour, voted_at desc
    ), d as (
      select poll_id, hour, choice_ids, lag(choice_ids) over (partition by poll_id, email order by hour) as prev
      from last
    )
    select poll_id, hour, choice_id, sum(delta)::int from (
      select poll_id, hour, unnest(choice_ids) as choice_id, 1 as delta from d
      union all select poll_id, hour, unnest(prev), -1 from d where prev is not null
      union all select poll_id, hour, ${TALLY_VOTERS}::text, 1 from d where cardinality(choice_ids) > 0
      union all select poll_id, hour, ${TALLY_VOTERS}::text, -1 from d where cardinality(prev) > 0
    ) x
    group by poll_id, hour, choice_id
    having sum(delta) <> 0`.execute(db);
}

/** Replaces one poll's tally with one computed afresh from its vote_history. */
export async function rebuildLineGraphTally(db: Executor, pid: string): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom("line_graph_tally").where("poll_id", "=", pid).execute();
    await trx.deleteFrom("line_graph_selection").where("poll_id", "=", pid).execute();
    await fillLineGraphTally(trx, pid);
  });
}
