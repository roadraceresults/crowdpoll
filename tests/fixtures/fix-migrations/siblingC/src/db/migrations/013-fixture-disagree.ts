import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`create table "fixture_disagree" (id bigint)`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop table "fixture_disagree"`.execute(db);
}
