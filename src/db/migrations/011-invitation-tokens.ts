import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table "poll_invitations"
      add column "token_hash" text,
      add column "token_expires_at" timestamptz,
      add column "token_used_at" timestamptz`.execute(db);
  await sql`
    create unique index "poll_invitations_token_hash" on "poll_invitations" ("token_hash")
    where "token_hash" is not null`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop index if exists "poll_invitations_token_hash"`.execute(db);
  await sql`
    alter table "poll_invitations"
      drop column if exists "token_used_at",
      drop column if exists "token_expires_at",
      drop column if exists "token_hash"`.execute(db);
}
