import { sql, type Kysely } from "kysely";
import { ensureVoteHistoryPartition } from "../partitions.js";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table "vote_history" (
      "id" bigserial not null,
      "poll_id" text not null,
      "email" text not null,
      "user_name" text not null default '',
      "choice_ids" text[] not null default '{}',
      "voted_at" timestamptz not null,
      primary key ("id", "voted_at")
    ) partition by range ("voted_at")`.execute(db);

  const now = new Date();
  await ensureVoteHistoryPartition(db, now);
  await ensureVoteHistoryPartition(db, new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)));
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop table if exists "vote_history"`.execute(db);
}
