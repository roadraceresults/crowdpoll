import { sql, type Kysely } from "kysely";

const TITLE_MAX = 50;
const SUBTITLE_MAX = 30;

export function cutToLength(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const last = cut.charCodeAt(cut.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut;
}

export async function up(db: Kysely<unknown>): Promise<void> {
  const { rows } = await sql<{ id: string; title: string; subtitle: string }>`
    select "id", "title", "subtitle" from "polls"
      where length("title") > ${TITLE_MAX / 2} or length("subtitle") > ${SUBTITLE_MAX / 2}`.execute(db);
  for (const row of rows) {
    const title = cutToLength(row.title, TITLE_MAX);
    const subtitle = cutToLength(row.subtitle, SUBTITLE_MAX);
    if (title === row.title && subtitle === row.subtitle) continue;
    await sql`
      with changed as (
        update "polls" set "title" = ${title}, "subtitle" = ${subtitle}, "content_version" = "content_version" + 1
          where "id" = ${row.id}
          returning "id", "content_version"
      )
      insert into "search_outbox" ("poll_id", "version", "reason")
        select "id", "content_version", 'content' from changed
      on conflict ("poll_id") do update set "version" = excluded."version", "reason" = excluded."reason"`.execute(db);
  }
}

export async function down(): Promise<void> {}
