import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`alter table "polls" add column "pending_update" jsonb`.execute(db);
  await sql`alter table "polls" add column "pending_rejection_reason" text`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`alter table "polls" drop column "pending_rejection_reason"`.execute(db);
  await sql`alter table "polls" drop column "pending_update"`.execute(db);
}
