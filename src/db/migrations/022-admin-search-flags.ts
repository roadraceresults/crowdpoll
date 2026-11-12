import { sql, type Kysely } from "kysely";

// One partial index per admin search checkbox; adminSearchQuery repeats each predicate verbatim so the planner uses it.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`create index "polls_line_graph_created" on "polls" ("created_at" desc) where "line_graph_enabled"`.execute(db);
  await sql`
    create index "polls_custom_colors_created" on "polls" ("created_at" desc)
    where jsonb_path_exists("choices", '$[*] ? (@.color != null)')
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop index if exists "polls_custom_colors_created"`.execute(db);
  await sql`drop index if exists "polls_line_graph_created"`.execute(db);
}
