import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`create table "fixture_no_down" (id integer)`.execute(db);
}
