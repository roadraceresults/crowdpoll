import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`alter table "user" add column "profile_avatar_hash" text null`.execute(db);
  await sql`
    create table "avatar_removals" (
      "key" text primary key,
      "queued_at" timestamptz not null default now()
    )
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop table "avatar_removals"`.execute(db);
  await sql`alter table "user" drop column "profile_avatar_hash"`.execute(db);
}
