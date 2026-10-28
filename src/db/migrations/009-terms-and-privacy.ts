import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`alter table "user" add column "terms_version" text`.execute(db);
  await sql`alter table "user" add column "terms_accepted_at" timestamptz`.execute(db);
  await sql`alter table "polls" add column "ever_voted" boolean not null default false`.execute(db);
  await sql`
    update "polls" set "ever_voted" = true
    where exists (select 1 from "vote_history" where "vote_history"."poll_id" = "polls"."id")`.execute(db);
  await sql`update "session" set "ipAddress" = null, "userAgent" = null`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`alter table "polls" drop column if exists "ever_voted"`.execute(db);
  await sql`alter table "user" drop column if exists "terms_accepted_at"`.execute(db);
  await sql`alter table "user" drop column if exists "terms_version"`.execute(db);
}
