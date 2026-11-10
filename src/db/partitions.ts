import { sql, type Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = Kysely<any>;

export function partitionName(month: Date): string {
  return childName("vote_history", month);
}

function monthStart(month: Date): Date {
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
}

function nextMonth(month: Date): Date {
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));
}

function childName(table: string, month: Date): string {
  return `${table}_${month.getUTCFullYear()}_${String(month.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Range partitioning: https://www.postgresql.org/docs/16/ddl-partitioning.html
async function ensurePartition(db: AnyDb, table: string, month: Date, indexes: Record<string, string[]>): Promise<void> {
  const name = childName(table, month);
  const from = monthStart(month).toISOString();
  const to = nextMonth(month).toISOString();
  await sql`
    create table if not exists ${sql.table(name)}
      partition of ${sql.table(table)}
      for values from (${sql.lit(from)}) to (${sql.lit(to)})`.execute(db);
  for (const [suffix, columns] of Object.entries(indexes)) {
    await sql`
      create index if not exists ${sql.id(`${name}_${suffix}`)}
        on ${sql.table(name)} (${sql.join(columns.map((column) => sql.id(column)))})`.execute(db);
  }
}

export function ensureVoteHistoryPartition(db: AnyDb, month: Date): Promise<void> {
  return ensurePartition(db, "vote_history", month, { poll_voted: ["poll_id", "voted_at"] });
}

export function ensureDeviceEventsPartition(db: AnyDb, month: Date): Promise<void> {
  return ensurePartition(db, "device_events", month, { account: ["account_id"], poll: ["poll_id"] });
}
