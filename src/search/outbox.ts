import type { Db } from "../db/client.js";
import type { PollRow } from "../db/schema.js";
import { toDocument, type OpenSearchEngine } from "./openSearch.js";

const DRAIN_BATCH = 500;

/** The four fields the home search indexes, in the order the stored `search` column weighs them. */
export function searchText(row: Pick<PollRow, "title" | "subtitle" | "choice_labels" | "keywords">): {
  title: string;
  subtitle: string;
  choiceLabels: string;
  keywords: string;
} {
  return { title: row.title, subtitle: row.subtitle, choiceLabels: row.choice_labels, keywords: row.keywords };
}

/** One drain tick: pushes every changed poll to the index, coalesced per poll, and clears the outbox. */
export async function drainOutbox(db: Db, engine: OpenSearchEngine | null): Promise<number> {
  let drained = 0;
  for (;;) {
    const pending = await db.selectFrom("search_outbox").selectAll().orderBy("poll_id").limit(DRAIN_BATCH).execute();
    if (pending.length === 0) return drained;
    const pids = pending.map((p) => p.poll_id);
    if (engine) {
      const rows = await db.selectFrom("polls").selectAll().where("id", "in", pids).execute();
      const listable = rows.filter((r) => r.home_listable);
      const listableIds = new Set(listable.map((r) => r.id));
      await engine.bulk(
        listable.map(toDocument),
        pids.filter((pid) => !listableIds.has(pid))
      );
    }
    await db
      .deleteFrom("search_outbox")
      .where("poll_id", "in", pids)
      .where((eb) =>
        eb.or(pending.map((p) => eb.and([eb("poll_id", "=", p.poll_id), eb("version", "<=", p.version)])))
      )
      .execute();
    drained += pids.length;
    if (pending.length < DRAIN_BATCH) return drained;
  }
}

/** Queues every home-listable poll for indexing — a full re-index is just a full outbox. */
export async function reindexAll(db: Db): Promise<number> {
  const rows = await db
    .selectFrom("polls")
    .select(["id", "content_version"])
    .where("home_listable", "=", true)
    .execute();
  for (let i = 0; i < rows.length; i += DRAIN_BATCH) {
    const slice = rows.slice(i, i + DRAIN_BATCH);
    await db
      .insertInto("search_outbox")
      .values(slice.map((r) => ({ poll_id: r.id, version: r.content_version, reason: "content" as const })))
      .onConflict((oc) => oc.column("poll_id").doUpdateSet({ reason: "content" }))
      .execute();
  }
  return rows.length;
}
