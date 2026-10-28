import { sql, type Kysely } from "kysely";

// Partial indexes: https://www.postgresql.org/docs/16/indexes-partial.html
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`alter table "polls" add column "launched_at" timestamptz`.execute(db);
  await sql`
    create index "polls_home_launched" on "polls" ("launched_at" desc, "vote_count" desc, "id" desc)
      where "home_listable" and "launched_at" is not null`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop index if exists "polls_home_launched"`.execute(db);
  await sql`alter table "polls" drop column if exists "launched_at"`.execute(db);
}
