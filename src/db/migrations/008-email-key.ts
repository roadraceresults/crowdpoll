import { sql, type Kysely } from "kysely";
import { emailKey } from "../../auth/emailKey.js";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`create index "user_email_key_idx" on "user" (${emailKey(sql.ref("email"))})`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop index if exists "user_email_key_idx"`.execute(db);
}
