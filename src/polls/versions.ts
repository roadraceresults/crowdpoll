import type { Kysely } from "kysely";
import type { Cache } from "../cache/cache.js";
import type { Database, PollRow } from "../db/schema.js";

export const POLL_PROJECTION_KEY = (pid: string) => `poll:${pid}`;

/** The card's content, shared by every listing and by Live Results; counts travel separately. */
export interface PollProjection {
  pid: string;
  title: string;
  subtitle: string;
  choiceMode: string;
  voteMutability: string;
  pollVisibility: string;
  pollSharingMode: string;
  pollState: string;
  startAt: string | null;
  endAt: string | null;
  choices: { id: string; label: string; position: number; color?: string }[];
  contentVersion: number;
}

export function projectPoll(row: PollRow): PollProjection {
  return {
    pid: row.id,
    title: row.title,
    subtitle: row.subtitle,
    choiceMode: row.choice_mode,
    voteMutability: row.vote_mutability,
    pollVisibility: row.poll_visibility,
    pollSharingMode: row.poll_sharing_mode,
    pollState: row.poll_state,
    startAt: row.start_at ? new Date(row.start_at).toISOString() : null,
    endAt: row.end_at ? new Date(row.end_at).toISOString() : null,
    choices: [...row.choices].sort((a, b) => a.position - b.position),
    contentVersion: row.content_version
  };
}

export async function bumpContentVersion(
  trx: Kysely<Database>,
  cache: Cache,
  pid: string
): Promise<PollRow | null> {
  const row = await trx
    .updateTable("polls")
    .set((eb) => ({ content_version: eb("content_version", "+", 1) }))
    .where("id", "=", pid)
    .returningAll()
    .executeTakeFirst();
  if (!row) return null;
  await trx
    .insertInto("search_outbox")
    .values({ poll_id: pid, version: row.content_version, reason: "content" })
    .onConflict((oc) =>
      oc.column("poll_id").doUpdateSet({ version: row.content_version, reason: "content" })
    )
    .execute();
  await refreshProjection(cache, row);
  return row;
}

export async function refreshProjection(cache: Cache, row: PollRow): Promise<void> {
  try {
    await cache.set(POLL_PROJECTION_KEY(row.id), JSON.stringify(projectPoll(row)));
  } catch (err) {
    console.error(`[versions] Could not refresh the projection of poll ${row.id}:`, err);
  }
}

export async function readProjection(
  cache: Cache,
  db: Kysely<Database>,
  pid: string
): Promise<PollProjection | null> {
  const cached = await cache.get(POLL_PROJECTION_KEY(pid));
  if (cached) return JSON.parse(cached) as PollProjection;
  const row = await db.selectFrom("polls").selectAll().where("id", "=", pid).executeTakeFirst();
  if (!row) return null;
  await refreshProjection(cache, row);
  return projectPoll(row);
}

export async function readProjections(
  cache: Cache,
  db: Kysely<Database>,
  pids: string[]
): Promise<Map<string, PollProjection>> {
  const out = new Map<string, PollProjection>();
  const missing: string[] = [];
  for (const pid of pids) {
    const cached = await cache.get(POLL_PROJECTION_KEY(pid));
    if (cached) out.set(pid, JSON.parse(cached) as PollProjection);
    else missing.push(pid);
  }
  if (missing.length > 0) {
    const rows = await db.selectFrom("polls").selectAll().where("id", "in", missing).execute();
    for (const row of rows) {
      await refreshProjection(cache, row);
      out.set(row.id, projectPoll(row));
    }
  }
  return out;
}
