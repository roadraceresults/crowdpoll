import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`alter table "polls" add column "link_preview_message" text not null default ''`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`alter table "polls" drop column "link_preview_message"`.execute(db);
}
