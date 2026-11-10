import { sql, type Kysely } from "kysely";

// Generated columns: https://www.postgresql.org/docs/16/ddl-generated-columns.html
// Text search weights: https://www.postgresql.org/docs/16/textsearch-controls.html
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`alter table "polls" add column "notes" text not null default ''`.execute(db);
  await replaceSearchColumn(db, sql`
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("subtitle", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("choice_labels", '')), 'C') ||
    setweight(to_tsvector('english', coalesce("keywords", '')), 'D') ||
    setweight(to_tsvector('english', coalesce("notes", '')), 'D')`);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await replaceSearchColumn(db, sql`
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("subtitle", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("choice_labels", '')), 'C') ||
    setweight(to_tsvector('english', coalesce("keywords", '')), 'D')`);
  await sql`alter table "polls" drop column "notes"`.execute(db);
}

async function replaceSearchColumn(db: Kysely<unknown>, expression: ReturnType<typeof sql>): Promise<void> {
  await sql`drop index if exists "polls_home_search"`.execute(db);
  await sql`drop index if exists "polls_search"`.execute(db);
  await sql`alter table "polls" drop column "search"`.execute(db);
  await sql`alter table "polls" add column "search" tsvector generated always as (${expression}) stored`.execute(db);
  await sql`create index "polls_home_search" on "polls" using gin ("search") where "home_listable"`.execute(db);
  await sql`create index "polls_search" on "polls" using gin ("search")`.execute(db);
}
