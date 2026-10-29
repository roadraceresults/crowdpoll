import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`create table "fixture_foreign" (id integer)`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop table "fixture_foreign"`.execute(db);
}
