import { sql, type Kysely } from "kysely";

// Generated columns: https://www.postgresql.org/docs/16/ddl-generated-columns.html
// Text search weights: https://www.postgresql.org/docs/16/textsearch-controls.html
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table "polls" (
      "id" text not null primary key,
      "title" text not null default '',
      "subtitle" text not null default '',
      "choices" jsonb not null default '[]',
      "choice_labels" text not null default '',
      "keywords" text not null default '',
      "search" tsvector generated always as (
        setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
        setweight(to_tsvector('english', coalesce("subtitle", '')), 'B') ||
        setweight(to_tsvector('english', coalesce("choice_labels", '')), 'C') ||
        setweight(to_tsvector('english', coalesce("keywords", '')), 'D')
      ) stored,
      "poll_state" text not null,
      "poll_state_before_edit_update" text,
      "poll_visibility" text not null,
      "poll_sharing_mode" text not null,
      "vote_anonymity" text not null,
      "choice_mode" text not null,
      "vote_mutability" text not null,
      "voter_count_limit" integer,
      "home_listable" boolean generated always as (
        "poll_visibility" = 'Public Poll' and (
          "poll_state" in ('OPEN', 'CLOSED', 'WAITING TO OPEN') or
          ("poll_state" = 'EDITING' and "poll_state_before_edit_update" in ('OPEN', 'CLOSED', 'WAITING TO OPEN'))
        )
      ) stored,
      "created_by_id" text not null default '',
      "created_by_name" text not null default '',
      "created_at" timestamptz not null default now(),
      "start_at" timestamptz,
      "end_at" timestamptz,
      "closed_at" timestamptz,
      "last_vote_at" timestamptz,
      "vote_count" integer not null default 0,
      "invited_count" integer not null default 0,
      "banned_count" integer not null default 0,
      "choice_counts" jsonb not null default '{}',
      "content_version" bigint not null default 1,
      "counts_version" bigint not null default 0,
      "poll_edit_update_heartbeat_timestamp" timestamptz,
      "poll_edit_update_client_guid" text,
      "poll_approval_timestamp" timestamptz,
      "poll_acceptability_screening_attempts" integer not null default 0,
      "poll_rejection_reason" text
    )`.execute(db);

  await sql`create index "polls_home_search" on "polls" using gin ("search") where "home_listable"`.execute(db);
  await sql`create index "polls_home_newest" on "polls" ("created_at" desc, "id" desc) where "home_listable"`.execute(db);
  await sql`create index "polls_search" on "polls" using gin ("search")`.execute(db);
  await sql`create index "polls_state_created" on "polls" ("poll_state", "created_at" desc)`.execute(db);
  await sql`create index "polls_visibility_created" on "polls" ("poll_visibility", "created_at" desc)`.execute(db);
  await sql`create index "polls_choice_mode_created" on "polls" ("choice_mode", "created_at" desc)`.execute(db);
  await sql`create index "polls_vote_mutability_created" on "polls" ("vote_mutability", "created_at" desc)`.execute(db);
  await sql`create index "polls_created_by_name_trgm" on "polls" using gin ("created_by_name" gin_trgm_ops)`.execute(db);
  await sql`create index "polls_title_trgm" on "polls" using gin ("title" gin_trgm_ops)`.execute(db);
  await sql`create index "polls_created" on "polls" ("created_at" desc, "id" desc)`.execute(db);
  await sql`create index "polls_start_at" on "polls" ("start_at")`.execute(db);
  await sql`create index "polls_end_at" on "polls" ("end_at")`.execute(db);
  await sql`create index "polls_vote_count" on "polls" ("vote_count")`.execute(db);
  await sql`create index "polls_invited_count" on "polls" ("invited_count")`.execute(db);
  await sql`create index "polls_banned_count" on "polls" ("banned_count")`.execute(db);
  await sql`create index "polls_created_by_id" on "polls" ("created_by_id")`.execute(db);
  await sql`create index "polls_state_approval" on "polls" ("poll_state", "poll_approval_timestamp")`.execute(db);
  await sql`create index "polls_state_heartbeat" on "polls" ("poll_state", "poll_edit_update_heartbeat_timestamp")`.execute(db);
  await sql`create index "polls_state_start" on "polls" ("poll_state", "start_at")`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop table if exists "polls"`.execute(db);
}
