import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`alter table "user" add column "color_scheme" text null check ("color_scheme" in ('light', 'dark'))`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`alter table "user" drop column "color_scheme"`.execute(db);
}
