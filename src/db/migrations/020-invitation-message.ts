import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`alter table "polls" add column "invitation_message" text not null default ''`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`alter table "polls" drop column "invitation_message"`.execute(db);
}
