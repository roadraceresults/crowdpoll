import type { AppConfig } from "../config.js";
import type { Cache } from "../cache/cache.js";
import { adoptInvitations, markAccepted } from "../invitations/invitations.js";
import type { Db } from "./store.js";
import { isPublished } from "./store.js";
import { holdsPermission, type Caller } from "./service.js";
import { upsertRelation } from "./userPolls.js";
import { forgetTabs } from "../refresh/tabVersions.js";

const POLL_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VIEW_REFRESH_AFTER_MS = 60_000;

export const LANDING_TABS = ["home", "your-polls", "shared-with-you", "your-votes", "trending", "newest", "watching", "live", "search"] as const;
export type TabName = (typeof LANDING_TABS)[number];
export type LandingTab = TabName;
export type LandingNotice = "unavailable" | "unpublished";

export interface Landing {
  open?: string;
  tab?: LandingTab;
  notice?: LandingNotice;
  q?: string;
}

export interface LinkRequest {
  tab?: TabName;
  hasTerms?: boolean;
}

export interface PollFacts {
  created: boolean;
  private: boolean;
  published: boolean;
  voted: boolean;
  watching: boolean;
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

export function parseTab(value: unknown): TabName | null {
  return typeof value === "string" && (LANDING_TABS as readonly string[]).includes(value) ? (value as TabName) : null;
}

/** The query that carries a poll link through login: the poll, and the tab when it is a tab name. */
export function sharedLinkQuery(pid: string, tab: unknown): string {
  const valid = parseTab(tab);
  return valid ? `PID=${pid}&tab=${valid}` : `PID=${pid}`;
}

function tabFits(tab: TabName, facts: PollFacts, request: LinkRequest): boolean {
  switch (tab) {
    case "your-polls":
      return facts.created;
    case "shared-with-you":
      return facts.private && !facts.created;
    case "your-votes":
      return facts.voted;
    case "watching":
      return facts.watching;
    case "home":
    case "trending":
    case "newest":
      return !facts.private && facts.published;
    case "search":
      return request.hasTerms === true;
    case "live":
      return false;
  }
}

/** Keeps the requested tab when the poll belongs on it for this visitor, otherwise picks the first that does. */
export function chooseTab(facts: PollFacts, request: LinkRequest): TabName {
  if (request.tab && tabFits(request.tab, facts, request)) return request.tab;
  if (facts.created) return "your-polls";
  if (facts.private) return "shared-with-you";
  if (facts.voted) return "your-votes";
  if (facts.watching) return "watching";
  return "home";
}

export function landingUrl(landing: Landing): string {
  const params = new URLSearchParams();
  if (landing.open) params.set("open", landing.open);
  if (landing.tab) params.set("tab", landing.tab);
  if (landing.q) params.set("q", landing.q);
  if (landing.notice) params.set("notice", landing.notice);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

async function holdsRow(db: Db, table: "poll_bans" | "poll_invitations", pid: string, email: string): Promise<boolean> {
  const row = await db.selectFrom(table).select("poll_id").where("poll_id", "=", pid).where("email", "=", email).executeTakeFirst();
  return row !== undefined;
}

async function relationsOf(db: Db, pid: string, email: string): Promise<{ voted: boolean; watching: boolean }> {
  const rows = await db
    .selectFrom("user_polls")
    .select("relation")
    .where("email", "=", email)
    .where("poll_id", "=", pid)
    .where("relation", "in", ["voted", "bookmarked"])
    .execute();
  return { voted: rows.some((r) => r.relation === "voted"), watching: rows.some((r) => r.relation === "bookmarked") };
}

/** Decides where a logged-in visitor of a poll link lands, and whether the visit counts as a view. Writes nothing. */
export async function decideSharedLink(deps: SharedLinkDeps, caller: Caller, pid: string, request: LinkRequest = {}): Promise<SharedLinkDecision> {
  const { db, config } = deps;
  if (!caller.email || !holdsPermission(caller, "View Polls", config)) return NOT_SHOWN;
  const email = caller.email.toLowerCase();
  const poll = await db
    .selectFrom("polls")
    .select(["poll_visibility", "poll_sharing_mode", "poll_state", "poll_state_before_edit_update", "created_by_id"])
    .where("id", "=", pid)
    .executeTakeFirst();
  // An archived poll's link is a deleted poll's, for its creator too: only Poll Administration shows it.
  if (!poll || poll.poll_state === "ARCHIVED") return NOT_SHOWN;
  const isPrivate = poll.poll_visibility === "Private Poll";
  const published = isPublished(poll);
  const tabFor = async (created: boolean): Promise<TabName> =>
    chooseTab({ created, private: isPrivate, published, ...(await relationsOf(db, pid, email)) }, request);
  if (poll.created_by_id !== "" && poll.created_by_id === caller.id) {
    return { landing: { open: pid, tab: await tabFor(true) }, recordView: false };
  }
  if (await holdsRow(db, "poll_bans", pid, email)) return NOT_SHOWN;

  if (!isPrivate) {
    return published ? { landing: { open: pid, tab: await tabFor(false) }, recordView: false } : NOT_SHOWN;
  }
  const invitationOnly = poll.poll_sharing_mode === "Invitation Only";
  if (invitationOnly && !(await holdsRow(db, "poll_invitations", pid, email))) return NOT_SHOWN;
  const recordView = !invitationOnly;
  return published
    ? { landing: { open: pid, tab: await tabFor(false) }, recordView, accept: invitationOnly }
    : { landing: { tab: "shared-with-you", notice: "unpublished" }, recordView };
}

/** Adopts invitations by email key, decides, then records the view or the acceptance when the decision says so. */
export async function resolveSharedLink(
  deps: SharedLinkDeps & { cache: Cache },
  caller: Caller,
  pid: string,
  request: LinkRequest = {}
): Promise<Landing> {
  if (caller.email) await adoptInvitations(deps, caller.email);
  const decision = await decideSharedLink(deps, caller, pid, request);
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
    if (!recent) {
      await upsertRelation(deps.db, email, pid, "linked");
      await forgetTabs(deps.cache, [email]);
    }
  }
  return decision.landing;
}
