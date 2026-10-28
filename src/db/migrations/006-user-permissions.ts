import { sql, type Kysely } from "kysely";

// Array containment operator: https://www.postgresql.org/docs/16/functions-array.html
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table "user" add column "permissions" text[] not null
      default array['View Polls', 'Vote on Polls', 'Create Poll']::text[]`.execute(db);
  await sql`
    alter table "user" add constraint "user_permissions_known"
      check ("permissions" <@ array['View Polls', 'Vote on Polls', 'Create Poll']::text[])`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`alter table "user" drop constraint if exists "user_permissions_known"`.execute(db);
  await sql`alter table "user" drop column if exists "permissions"`.execute(db);
}
