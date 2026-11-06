import { sql, type Kysely } from "kysely";
import { ensureDeviceEventsPartition } from "../partitions.js";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table "device_events" (
      "id" bigserial not null,
      "account_id" text not null,
      "event" text not null check ("event" in ('sign-in', 'vote')),
      "poll_id" text,
      "browser_hash" text,
      "hardware_hash" text,
      "fingerprint_version" integer not null,
      "at" timestamptz not null,
      primary key ("id", "at"),
      check (("event" = 'vote') = ("poll_id" is not null))
    ) partition by range ("at")`.execute(db);

  const now = new Date();
  await ensureDeviceEventsPartition(db, now);
  await ensureDeviceEventsPartition(db, new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)));
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop table if exists "device_events"`.execute(db);
}
