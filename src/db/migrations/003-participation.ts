import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table "votes" (
      "poll_id" text not null references "polls" ("id") on delete cascade,
      "email" text not null,
      "user_name" text not null default '',
      "choice_ids" text[] not null default '{}',
      "voted_at" timestamptz,
      primary key ("poll_id", "email")
    )`.execute(db);

  await sql`
    create table "poll_invitations" (
      "poll_id" text not null references "polls" ("id") on delete cascade,
      "email" text not null,
      "position" integer not null default 0,
      primary key ("poll_id", "email")
    )`.execute(db);

  await sql`
    create table "poll_bans" (
      "poll_id" text not null references "polls" ("id") on delete cascade,
      "email" text not null,
      "position" integer not null default 0,
      primary key ("poll_id", "email")
    )`.execute(db);

  await sql`
    create table "bookmarks" (
      "email" text not null,
      "poll_id" text not null references "polls" ("id") on delete cascade,
      "created_at" timestamptz not null default now(),
      primary key ("email", "poll_id")
    )`.execute(db);
  await sql`create index "bookmarks_poll_id" on "bookmarks" ("poll_id")`.execute(db);

  await sql`
    create table "user_polls" (
      "email" text not null,
      "poll_id" text not null references "polls" ("id") on delete cascade,
      "relation" text not null,
      "updated_at" timestamptz not null default now(),
      primary key ("email", "poll_id", "relation")
    )`.execute(db);
  await sql`create index "user_polls_email_updated" on "user_polls" ("email", "updated_at" desc)`.execute(db);
  await sql`create index "user_polls_poll_id" on "user_polls" ("poll_id")`.execute(db);

  await sql`
    create table "search_outbox" (
      "poll_id" text not null primary key,
      "version" bigint not null,
      "reason" text not null
    )`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop table if exists "search_outbox"`.execute(db);
  await sql`drop table if exists "user_polls"`.execute(db);
  await sql`drop table if exists "bookmarks"`.execute(db);
  await sql`drop table if exists "poll_bans"`.execute(db);
  await sql`drop table if exists "poll_invitations"`.execute(db);
  await sql`drop table if exists "votes"`.execute(db);
}
