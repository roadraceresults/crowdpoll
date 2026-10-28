import type { AppConfig } from "../config.js";
import type { PollRow } from "../db/schema.js";
import { holdsPermission, type Caller } from "./service.js";
import { isPublished, type Db } from "./store.js";

export interface AccessDeps {
  db: Db;
  config: AppConfig;
}

export type AccessRow = Pick<
  PollRow,
  "id" | "poll_visibility" | "poll_sharing_mode" | "poll_state" | "poll_state_before_edit_update" | "created_by_id"
>;

export const ACCESS_COLUMNS = ["id", "poll_visibility", "poll_sharing_mode", "poll_state", "poll_state_before_edit_update", "created_by_id"] as const;

interface Standing {
  banned: Set<string>;
  invited: Set<string>;
  related: Set<string>;
}

async function standingOf(db: Db, email: string, pids: string[]): Promise<Standing> {
  if (pids.length === 0) return { banned: new Set(), invited: new Set(), related: new Set() };
  const [bans, invitations, relations] = await Promise.all([
    db.selectFrom("poll_bans").select("poll_id").where("email", "=", email).where("poll_id", "in", pids).execute(),
    db.selectFrom("poll_invitations").select("poll_id").where("email", "=", email).where("poll_id", "in", pids).execute(),
    db
      .selectFrom("user_polls")
      .select("poll_id")
      .where("email", "=", email)
      .where("poll_id", "in", pids)
      .where("relation", "in", ["linked", "voted", "invited"])
      .execute()
  ]);
  return {
    banned: new Set(bans.map((r) => r.poll_id)),
    invited: new Set(invitations.map((r) => r.poll_id)),
    related: new Set(relations.map((r) => r.poll_id))
  };
}

function isInvitationOnly(row: AccessRow): boolean {
  return row.poll_visibility === "Private Poll" && row.poll_sharing_mode === "Invitation Only";
}

/** A private poll the user can still get to: Invitation Only needs an invitation (or being its creator). */
function reaches(row: AccessRow, userId: string | undefined, standing: Standing): boolean {
  const created = row.created_by_id !== "" && row.created_by_id === userId;
  if (row.poll_visibility !== "Private Poll" || created) return true;
  return isInvitationOnly(row) ? standing.invited.has(row.id) : standing.related.has(row.id);
}

/**
 * Which of these polls the caller may watch: they hold the View Polls grant, the poll is
 * published, they are not banned, and it is public or a private poll they can reach.
 */
export async function mayWatchMany(deps: AccessDeps, caller: Caller, rows: AccessRow[]): Promise<Set<string>> {
  if (!caller.email || !holdsPermission(caller, "View Polls", deps.config)) return new Set();
  const email = caller.email.toLowerCase();
  const published = rows.filter((row) => isPublished(row));
  const standing = await standingOf(deps.db, email, published.map((row) => row.id));
  return new Set(published.filter((row) => !standing.banned.has(row.id) && reaches(row, caller.id, standing)).map((row) => row.id));
}

export async function mayWatch(deps: AccessDeps, caller: Caller, pid: string): Promise<boolean> {
  const row = await deps.db.selectFrom("polls").select([...ACCESS_COLUMNS]).where("id", "=", pid).executeTakeFirst();
  return row !== undefined && (await mayWatchMany(deps, caller, [row])).has(pid);
}

/** Polls the user voted in that they can still reach; a ban does not hide a poll, and having voted already reached a link-only poll. */
export async function reachableMany(deps: AccessDeps, caller: Caller, rows: AccessRow[]): Promise<Set<string>> {
  const email = (caller.email ?? "").toLowerCase();
  const standing = await standingOf(deps.db, email, rows.filter(isInvitationOnly).map((row) => row.id));
  return new Set(rows.filter((row) => !isInvitationOnly(row) || reaches(row, caller.id, standing)).map((row) => row.id));
}
