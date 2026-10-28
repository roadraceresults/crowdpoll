import type { AppConfig } from "../config.js";
import type { Cache } from "../cache/cache.js";
import { adoptInvitations, markAccepted } from "../invitations/invitations.js";
import type { Db } from "./store.js";
import { isPublished } from "./store.js";
import { holdsPermission, type Caller } from "./service.js";
import { upsertRelation } from "./userPolls.js";

const POLL_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VIEW_REFRESH_AFTER_MS = 60_000;

export type LandingTab = "your-polls" | "shared-with-you" | "trending";
export type LandingNotice = "unavailable" | "unpublished";

export interface Landing {
  open?: string;
  tab?: LandingTab;
  notice?: LandingNotice;
}

export interface SharedLinkDecision {
  landing: Landing;
  recordView: boolean;
  /** The invited caller of an Invitation Only poll is shown it (R3). */
  accept?: boolean;
}

export interface SharedLinkDeps {
  db: Db;
  config: AppConfig;
}

const NOT_SHOWN: SharedLinkDecision = { landing: { notice: "unavailable" }, recordView: false };

export function parsePid(value: unknown): string | null {
  return typeof value === "string" && POLL_ID_PATTERN.test(value) ? value : null;
}

export function landingUrl(landing: Landing): string {
  const params = new URLSearchParams();
  if (landing.open) params.set("open", landing.open);
  if (landing.tab) params.set("tab", landing.tab);
  if (landing.notice) params.set("notice", landing.notice);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

async function holdsRow(db: Db, table: "poll_bans" | "poll_invitations", pid: string, email: string): Promise<boolean> {
  const row = await db.selectFrom(table).select("poll_id").where("poll_id", "=", pid).where("email", "=", email).executeTakeFirst();
  return row !== undefined;
}

/** Decides where a signed-in visitor of a poll link lands, and whether the visit counts as a view. Writes nothing. */
export async function decideSharedLink(deps: SharedLinkDeps, caller: Caller, pid: string): Promise<SharedLinkDecision> {
  const { db, config } = deps;
  if (!caller.email || !holdsPermission(caller, "View Polls", config)) return NOT_SHOWN;
  const email = caller.email.toLowerCase();
  const poll = await db
    .selectFrom("polls")
    .select(["poll_visibility", "poll_sharing_mode", "poll_state", "poll_state_before_edit_update", "created_by_id"])
    .where("id", "=", pid)
    .executeTakeFirst();
  if (!poll) return NOT_SHOWN;
  if (poll.created_by_id !== "" && poll.created_by_id === caller.id) {
    return { landing: { open: pid, tab: "your-polls" }, recordView: false };
  }
  if (poll.poll_state === "ARCHIVED" || (await holdsRow(db, "poll_bans", pid, email))) return NOT_SHOWN;

  const published = isPublished(poll);
  if (poll.poll_visibility !== "Private Poll") {
    return published ? { landing: { open: pid, tab: "trending" }, recordView: false } : NOT_SHOWN;
  }
  const invitationOnly = poll.poll_sharing_mode === "Invitation Only";
  if (invitationOnly && !(await holdsRow(db, "poll_invitations", pid, email))) return NOT_SHOWN;
  const recordView = !invitationOnly;
  return published
    ? { landing: { open: pid, tab: "shared-with-you" }, recordView, accept: invitationOnly }
    : { landing: { tab: "shared-with-you", notice: "unpublished" }, recordView };
}

/** Adopts invitations by email key, decides, then records the view or the acceptance when the decision says so. */
export async function resolveSharedLink(deps: SharedLinkDeps & { cache: Cache }, caller: Caller, pid: string): Promise<Landing> {
  if (caller.email) await adoptInvitations(deps, caller.email);
  const decision = await decideSharedLink(deps, caller, pid);
  if (decision.accept && caller.email) await markAccepted(deps.db, pid, caller.email.toLowerCase());
  if (decision.recordView && caller.email) {
    const email = caller.email.toLowerCase();
    const held = await deps.db
      .selectFrom("user_polls")
      .select("updated_at")
      .where("email", "=", email)
      .where("poll_id", "=", pid)
      .where("relation", "=", "linked")
      .executeTakeFirst();
    const recent = held !== undefined && Date.now() - new Date(held.updated_at as Date).getTime() < VIEW_REFRESH_AFTER_MS;
    if (!recent) await upsertRelation(deps.db, email, pid, "linked");
  }
  return decision.landing;
}
