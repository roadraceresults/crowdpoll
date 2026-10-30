import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`alter table "polls" add column "line_graph_enabled" boolean not null default false`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`alter table "polls" drop column "line_graph_enabled"`.execute(db);
}
