import { sql, type Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = Kysely<any>;

export function partitionName(month: Date): string {
  return `vote_history_${month.getUTCFullYear()}_${String(month.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthStart(month: Date): Date {
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
}

function nextMonth(month: Date): Date {
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));
}

// Range partitioning: https://www.postgresql.org/docs/16/ddl-partitioning.html
export async function ensureVoteHistoryPartition(db: AnyDb, month: Date): Promise<void> {
  const name = partitionName(month);
  const from = monthStart(month).toISOString();
  const to = nextMonth(month).toISOString();
  await sql`
    create table if not exists ${sql.table(name)}
      partition of "vote_history"
      for values from (${sql.lit(from)}) to (${sql.lit(to)})`.execute(db);
  await sql`
    create index if not exists ${sql.id(`${name}_poll_voted`)}
      on ${sql.table(name)} ("poll_id", "voted_at")`.execute(db);
}
