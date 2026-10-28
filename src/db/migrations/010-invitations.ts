import { sql, type Kysely } from "kysely";
import { emailKey } from "../../auth/emailKey.js";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table "poll_invitations"
      add column "added_at" timestamptz not null default now(),
      add column "sent_at" timestamptz,
      add column "reminded_at" timestamptz,
      add column "send_failed_at" timestamptz,
      add column "accepted_at" timestamptz`.execute(db);
  await sql`
    update "poll_invitations" set "sent_at" = "added_at"
    from "polls"
    where "polls"."id" = "poll_invitations"."poll_id"
      and "polls"."poll_state" not in ('INITIALIZED', 'AWAITING APPROVAL', 'REJECTED', 'WAITING TO OPEN')`.execute(db);
  await sql`create index "poll_invitations_email_key" on "poll_invitations" (${emailKey(sql.ref("email"))})`.execute(db);
  await sql`alter table "polls" add column "time_zone" text`.execute(db);
  await sql`
    create table "invitation_emails" (
      "creator_id" text not null,
      "sent_at" timestamptz not null default now()
    )`.execute(db);
  await sql`create index "invitation_emails_creator_sent" on "invitation_emails" ("creator_id", "sent_at")`.execute(db);
  await sql`
    create table "invitation_history" (
      "poll_id" text not null references "polls"("id") on delete cascade,
      "email_key" text not null,
      "sent_at" timestamptz,
      "reminded_at" timestamptz,
      primary key ("poll_id", "email_key")
    )`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop table if exists "invitation_history"`.execute(db);
  await sql`drop table if exists "invitation_emails"`.execute(db);
  await sql`alter table "polls" drop column if exists "time_zone"`.execute(db);
  await sql`drop index if exists "poll_invitations_email_key"`.execute(db);
  await sql`
    alter table "poll_invitations"
      drop column if exists "accepted_at",
      drop column if exists "send_failed_at",
      drop column if exists "reminded_at",
      drop column if exists "sent_at",
      drop column if exists "added_at"`.execute(db);
}
