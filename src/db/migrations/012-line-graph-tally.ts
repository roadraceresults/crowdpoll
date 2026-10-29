import { sql, type Kysely } from "kysely";
import { fillLineGraphTally } from "../../polls/lineGraphTally.js";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create table "line_graph_tally" (
      "poll_id" text not null references "polls"("id") on delete cascade,
      "hour" timestamptz not null,
      "choice_id" text not null,
      "delta" integer not null,
      primary key ("poll_id", "hour", "choice_id")
    )`.execute(db);
  await sql`
    create table "line_graph_selection" (
      "poll_id" text not null references "polls"("id") on delete cascade,
      "email" text not null,
      "choice_ids" text[] not null,
      "voted_at" timestamptz not null,
      primary key ("poll_id", "email")
    )`.execute(db);
  await fillLineGraphTally(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop table if exists "line_graph_selection"`.execute(db);
  await sql`drop table if exists "line_graph_tally"`.execute(db);
}
