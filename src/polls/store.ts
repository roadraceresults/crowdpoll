import { sql, type Kysely, type Transaction } from "kysely";
import type { Cache } from "../cache/cache.js";
import type { Database, NewPollRow, PollRow, PollRowUpdate, VoteRow } from "../db/schema.js";
import { ensureVoteHistoryPartition } from "../db/partitions.js";
import { emailKeyOf } from "../auth/emailKey.js";
import { bumpContentVersion, refreshProjection } from "./versions.js";

export type Db = Kysely<Database>;
type Executor = Kysely<Database> | Transaction<Database>;

export interface StoreDeps {
  db: Db;
  cache: Cache;
}

export type ChoiceMode = "Single-Choice Poll" | "Multiple-Choice Poll";
export type VoteMutability = "Final-Vote Poll" | "Dynamic-Vote Poll";

/**
 * 012 FR-001/FR-002: the single visibility setting, replacing 004's separate
 * `accessMode` and `resultsVisibility`. One of their six combinations was
 * impossible (public + transparent), and the server used to silently rewrite
 * whichever field the administrator had *not* just touched. Collapsing the pair
 * deletes the impossible cell and the auto-correction with it.
 *
 * Stored verbatim, exactly as displayed — there is deliberately no code-to-label
 * map anywhere. `pollState` sets the precedent: it already stores
 * "WAITING TO OPEN" and renders it unchanged.
 */
export const POLL_VISIBILITIES = ["Public Poll", "Private Poll"] as const;

export type PollVisibility = (typeof POLL_VISIBILITIES)[number];

export const POLL_SHARING_MODES = ["Anyone With The Link", "Invitation Only"] as const;

export type PollSharingMode = (typeof POLL_SHARING_MODES)[number];

export const VOTE_ANONYMITIES = ["Yes", "No"] as const;

export type VoteAnonymity = (typeof VOTE_ANONYMITIES)[number];

export const isPublicVisibility = (v: PollVisibility): boolean => v === "Public Poll";

export const isInvitationOnly = (
  poll: Pick<Poll, "pollVisibility" | "pollSharingMode">
): boolean =>
  !isPublicVisibility(poll.pollVisibility) && poll.pollSharingMode === "Invitation Only";

/**
 * The eight poll states (011 FR-001). Always stored, never derived: the schedule
 * sweep *writes* the state rather than readers computing it. Displayed to
 * administrators verbatim (FR-005).
 */
export type PollState =
  | "INITIALIZED"
  | "EDITING"
  | "AWAITING APPROVAL"
  | "REJECTED"
  | "WAITING TO OPEN"
  | "OPEN"
  | "CLOSED"
  | "ARCHIVED";

export const POLL_STATES: readonly PollState[] = [
  "INITIALIZED",
  "EDITING",
  "AWAITING APPROVAL",
  "REJECTED",
  "WAITING TO OPEN",
  "OPEN",
  "CLOSED",
  "ARCHIVED"
] as const;

/** The same rule, for a poll already in hand. */
export function isPubliclyListable(
  poll: Pick<Poll, "pollState" | "pollStateBeforeEditUpdate">
): boolean {
  if (PUBLIC_STATES.includes(poll.pollState)) return true;
  return (
    poll.pollState === "EDITING" &&
    poll.pollStateBeforeEditUpdate !== null &&
    PUBLIC_STATES.includes(poll.pollStateBeforeEditUpdate)
  );
}

/** The same rule, for a poll row as the database holds it. */
export function isPublished(row: Pick<PollRow, "poll_state" | "poll_state_before_edit_update">): boolean {
  return isPubliclyListable({
    pollState: row.poll_state as PollState,
    pollStateBeforeEditUpdate: row.poll_state_before_edit_update as PollState | null
  });
}

/** States in which a poll is shown to the public (FR-003). */
export const PUBLIC_STATES: readonly PollState[] = ["WAITING TO OPEN", "OPEN", "CLOSED"] as const;

/** States from which no editing or updating session may begin (FR-006, FR-008). */
export const SESSION_BLOCKED_STATES: readonly PollState[] = [
  "EDITING",
  "AWAITING APPROVAL",
  "ARCHIVED"
] as const;

/** States whose polls may be deleted (FR-053). */
export const DELETABLE_STATES: readonly PollState[] = ["INITIALIZED", "REJECTED", "ARCHIVED"] as const;

export interface Choice {
  id: string;
  label: string;
  position: number;
  color?: string;
}

export interface VoteEntry {
  emailAddress: string;
  userName: string;
  choiceIds: string[];
  votedAt: Date | null;
}

export interface Poll {
  _id: string; // PID
  title: string;
  subtitle: string;
  /** Comma-separated search keywords; always "" on a private poll. */
  keywords: string;
  choiceMode: ChoiceMode;
  voteMutability: VoteMutability;
  pollVisibility: PollVisibility;
  pollSharingMode: PollSharingMode;
  voteAnonymity: VoteAnonymity;
  /**
   * 012 FR-006/FR-008: null on a Public Poll means "not applicable" — the field is
   * disabled there. On any private visibility null means the configured default, not unlimited:
   * the field is never auto-filled, so a blank box and a stored default are the same
   * effective limit, where that default is ENV_PRIVATE_VOTER_LIMIT_DEFAULT.
   * See effectiveVoterLimit() in service.ts.
   */
  voterCountLimit: number | null;
  pollState: PollState;
  createdAt: Date;
  startAt: Date | null;
  endAt: Date | null;
  choices: Choice[];
  invitedVoterList: string[];
  bannedVoterList: string[];
  currentVotes: VoteEntry[];

  // --- editing session (011 FR-017..FR-023) -------------------------------
  /** State to restore when the session ends cleanly or goes stale. */
  pollStateBeforeEditUpdate: PollState | null;
  /** Refreshed by each heartbeat; its age is what makes a session stale. */
  pollEditUpdateHeartbeatTimestamp: Date | null;
  /** The owning browser tab. Part of every session write's filter, so only the
   *  holder can release the lock (FR-023). */
  pollEditUpdateClientGUID: string | null;

  // --- acceptability screening (011 FR-028..FR-040) -----------------------
  /** The screening claim. Set atomically with the attempt increment. */
  pollApprovalTimestamp: Date | null;
  /** Incremented when the claim is *taken*, not when the call fails — which is
   *  what makes the retry budget terminate for a process that dies mid-call. */
  pollAcceptabilityScreeningAttempts: number;
  /** Human-readable; shown on the editing surfaces and in the poll list. */
  pollRejectionReason: string | null;
  /** The IANA zone the creator's browser reported on the admin card's last write; null → UTC in emails. */
  timeZone: string | null;
}

export interface VoteHistoryEntry {
  pid: string;
  emailAddress: string;
  userName: string;
  choiceIds: string[];
  votedAt: Date;
}

export interface PollCreator {
  id: string;
  name: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Row <-> aggregate mapping

function rowToPoll(row: PollRow, invited: string[], banned: string[], votes: VoteRow[]): Poll {
  return {
    _id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    keywords: row.keywords,
    choiceMode: row.choice_mode as ChoiceMode,
    voteMutability: row.vote_mutability as VoteMutability,
    pollVisibility: row.poll_visibility as PollVisibility,
    pollSharingMode: row.poll_sharing_mode as PollSharingMode,
    voteAnonymity: row.vote_anonymity as VoteAnonymity,
    voterCountLimit: row.voter_count_limit,
    pollState: row.poll_state as PollState,
    createdAt: new Date(row.created_at),
    startAt: row.start_at ? new Date(row.start_at) : null,
    endAt: row.end_at ? new Date(row.end_at) : null,
    choices: [...row.choices].sort((a, b) => a.position - b.position),
    invitedVoterList: invited,
    bannedVoterList: banned,
    currentVotes: votes.map(rowToVote),
    pollStateBeforeEditUpdate: row.poll_state_before_edit_update as PollState | null,
    pollEditUpdateHeartbeatTimestamp: row.poll_edit_update_heartbeat_timestamp
      ? new Date(row.poll_edit_update_heartbeat_timestamp)
      : null,
    pollEditUpdateClientGUID: row.poll_edit_update_client_guid,
    pollApprovalTimestamp: row.poll_approval_timestamp ? new Date(row.poll_approval_timestamp) : null,
    pollAcceptabilityScreeningAttempts: row.poll_acceptability_screening_attempts,
    pollRejectionReason: row.poll_rejection_reason,
    timeZone: row.time_zone
  };
}

function rowToVote(row: VoteRow): VoteEntry {
  return {
    emailAddress: row.email,
    userName: row.user_name,
    choiceIds: row.choice_ids,
    votedAt: row.voted_at ? new Date(row.voted_at) : null
  };
}

export function choiceLabelsText(choices: Choice[]): string {
  return [...choices]
    .sort((a, b) => a.position - b.position)
    .map((c) => c.label)
    .join(" ");
}

/** The columns the counter flush maintains, computed once from a full vote list. */
export function countsFromVotes(votes: VoteEntry[]): {
  voteCount: number;
  choiceCounts: Record<string, number>;
  lastVoteAt: Date | null;
} {
  const choiceCounts: Record<string, number> = {};
  let voteCount = 0;
  let lastVoteAt: Date | null = null;
  for (const v of votes) {
    if (v.choiceIds.length === 0) continue;
    voteCount += 1;
    for (const id of v.choiceIds) choiceCounts[id] = (choiceCounts[id] ?? 0) + 1;
    if (v.votedAt && (!lastVoteAt || v.votedAt > lastVoteAt)) lastVoteAt = v.votedAt;
  }
  return { voteCount, choiceCounts, lastVoteAt };
}

const FIELD_TO_COLUMN: Partial<Record<keyof Poll, keyof PollRowUpdate>> = {
  title: "title",
  subtitle: "subtitle",
  keywords: "keywords",
  choiceMode: "choice_mode",
  voteMutability: "vote_mutability",
  pollVisibility: "poll_visibility",
  pollSharingMode: "poll_sharing_mode",
  voteAnonymity: "vote_anonymity",
  voterCountLimit: "voter_count_limit",
  pollState: "poll_state",
  createdAt: "created_at",
  startAt: "start_at",
  endAt: "end_at",
  pollStateBeforeEditUpdate: "poll_state_before_edit_update",
  pollEditUpdateHeartbeatTimestamp: "poll_edit_update_heartbeat_timestamp",
  pollEditUpdateClientGUID: "poll_edit_update_client_guid",
  pollApprovalTimestamp: "poll_approval_timestamp",
  pollAcceptabilityScreeningAttempts: "poll_acceptability_screening_attempts",
  pollRejectionReason: "poll_rejection_reason",
  timeZone: "time_zone"
};

/** Fields whose change is invisible to a voter and so leaves `content_version` alone. */
const NON_CONTENT_FIELDS: ReadonlySet<keyof Poll> = new Set<keyof Poll>([
  "pollEditUpdateHeartbeatTimestamp",
  "pollApprovalTimestamp",
  "pollAcceptabilityScreeningAttempts",
  "currentVotes",
  "timeZone"
]);

function columnsFor($set: Partial<Poll>): PollRowUpdate {
  const columns: Record<string, unknown> = {};
  for (const [field, value] of Object.entries($set) as [keyof Poll, unknown][]) {
    const column = FIELD_TO_COLUMN[field];
    if (column) columns[column] = value;
  }
  if ($set.choices !== undefined) {
    columns.choices = JSON.stringify($set.choices);
    columns.choice_labels = choiceLabelsText($set.choices);
  }
  if ($set.invitedVoterList !== undefined) columns.invited_count = $set.invitedVoterList.length;
  if ($set.bannedVoterList !== undefined) columns.banned_count = $set.bannedVoterList.length;
  return columns as PollRowUpdate;
}

function isContentChange($set: Partial<Poll>): boolean {
  return (Object.keys($set) as (keyof Poll)[]).some((field) => !NON_CONTENT_FIELDS.has(field));
}

// ---------------------------------------------------------------------------
// Reads

async function loadRelations(
  db: Executor,
  pid: string
): Promise<{ invited: string[]; banned: string[]; votes: VoteRow[] }> {
  const [invited, banned, votes] = await Promise.all([
    db.selectFrom("poll_invitations").select("email").where("poll_id", "=", pid).orderBy("position").execute(),
    db.selectFrom("poll_bans").select("email").where("poll_id", "=", pid).orderBy("position").execute(),
    db
      .selectFrom("votes")
      .selectAll()
      .where("poll_id", "=", pid)
      .orderBy(sql`voted_at asc nulls first`)
      .orderBy("email")
      .execute()
  ]);
  return { invited: invited.map((r) => r.email), banned: banned.map((r) => r.email), votes };
}

export async function findPoll(db: Executor, pid: string): Promise<Poll | null> {
  const row = await db.selectFrom("polls").selectAll().where("id", "=", pid).executeTakeFirst();
  if (!row) return null;
  const { invited, banned, votes } = await loadRelations(db, pid);
  return rowToPoll(row, invited, banned, votes);
}

export async function findPollRow(db: Executor, pid: string): Promise<PollRow | null> {
  const row = await db.selectFrom("polls").selectAll().where("id", "=", pid).executeTakeFirst();
  return row ?? null;
}

export async function pollExists(db: Executor, pid: string): Promise<boolean> {
  const row = await db.selectFrom("polls").select("id").where("id", "=", pid).executeTakeFirst();
  return row !== undefined;
}

export async function pollCreatorId(db: Executor, pid: string): Promise<string | null> {
  const row = await db.selectFrom("polls").select("created_by_id").where("id", "=", pid).executeTakeFirst();
  return row ? row.created_by_id : null;
}

async function pollsFromRows(db: Executor, rows: PollRow[]): Promise<Poll[]> {
  return Promise.all(
    rows.map(async (row) => {
      const { invited, banned, votes } = await loadRelations(db, row.id);
      return rowToPoll(row, invited, banned, votes);
    })
  );
}

export async function findPollsByIds(db: Executor, pids: string[]): Promise<Poll[]> {
  if (pids.length === 0) return [];
  const rows = await db.selectFrom("polls").selectAll().where("id", "in", pids).execute();
  return pollsFromRows(db, rows);
}

/** Every poll row, newest first — the administrator's list. */
/**
 * FIX009: the unfiltered admin list is capped like the admin search — newest
 * first, at most `cap` rows, with a cut-off flag — so a refresh never loads every
 * poll of a large store (which blocked the event loop long enough to shed page
 * loads). The admin search narrows beyond the cap.
 */
export async function listAdminRows(
  db: Executor,
  cap: number,
  createdById?: string
): Promise<{ rows: PollRow[]; truncated: boolean }> {
  let query = db.selectFrom("polls").selectAll();
  if (createdById !== undefined) query = query.where("created_by_id", "=", createdById);
  const rows = await query
    .orderBy("created_at", "desc")
    .orderBy("id", "desc")
    .limit(cap + 1)
    .execute();
  return { rows: rows.slice(0, cap), truncated: rows.length > cap };
}

/** The email address of each creator named on a page of polls, by user id. */
export async function creatorEmails(db: Executor, rows: { created_by_id: string }[]): Promise<Map<string, string>> {
  const ids = [...new Set(rows.map((row) => row.created_by_id).filter((id) => id !== ""))];
  if (ids.length === 0) return new Map();
  const users = await db.selectFrom("user").select(["id", "email"]).where("id", "in", ids).execute();
  return new Map(users.map((user) => [user.id, user.email]));
}

/** One index probe per poll that stops at its first history row, however many votes it holds. */
export function pollsEverVotedQuery(db: Executor, pids: string[]) {
  return db.selectFrom("polls").select("id").where("id", "in", pids).where("ever_voted", "=", true);
}

/** Which of these polls have ever received a vote, from the append-only history. */
export async function pollsEverVoted(db: Executor, pids: string[]): Promise<Set<string>> {
  if (pids.length === 0) return new Set();
  const rows = await pollsEverVotedQuery(db, pids).execute();
  return new Set(rows.map((r) => r.id));
}

export function hasVoteHistoryQuery(db: Executor, pid: string) {
  return db.selectFrom("polls").select("id").where("id", "=", pid).where("ever_voted", "=", true);
}

export async function markEverVoted(db: Executor, pids: string[]): Promise<void> {
  if (pids.length === 0) return;
  await db.updateTable("polls").set({ ever_voted: true }).where("id", "in", pids).where("ever_voted", "=", false).execute();
}

export async function hasVoteHistory(db: Executor, pid: string): Promise<boolean> {
  const row = await hasVoteHistoryQuery(db, pid).executeTakeFirst();
  return row !== undefined;
}

export function titlesLikeQuery(db: Executor, prefix: string) {
  return db
    .selectFrom("polls")
    .select("title")
    .where("title", "like", `${prefix.replace(/[\\%_]/g, "\\$&")} Copy%`);
}

export async function titlesLike(db: Executor, prefix: string): Promise<string[]> {
  const rows = await titlesLikeQuery(db, prefix).execute();
  return rows.map((r) => r.title);
}

export async function countTitleCollisions(db: Executor, title: string, exceptPid: string): Promise<number> {
  const row = await db
    .selectFrom("polls")
    .select((eb) => eb.fn.countAll<string>().as("n"))
    .where("title", "=", title)
    .where("id", "!=", exceptPid)
    .executeTakeFirstOrThrow();
  return Number(row.n);
}

// ---------------------------------------------------------------------------
// Writes

function newRow(poll: Poll, creator?: PollCreator): NewPollRow {
  const counts = countsFromVotes(poll.currentVotes);
  return {
    id: poll._id,
    title: poll.title,
    subtitle: poll.subtitle,
    keywords: poll.keywords,
    choices: JSON.stringify(poll.choices),
    choice_labels: choiceLabelsText(poll.choices),
    poll_state: poll.pollState,
    poll_state_before_edit_update: poll.pollStateBeforeEditUpdate,
    poll_visibility: poll.pollVisibility,
    poll_sharing_mode: poll.pollSharingMode,
    vote_anonymity: poll.voteAnonymity,
    choice_mode: poll.choiceMode,
    vote_mutability: poll.voteMutability,
    voter_count_limit: poll.voterCountLimit,
    created_by_id: creator?.id ?? "",
    created_by_name: creator?.name ?? "",
    created_at: poll.createdAt,
    start_at: poll.startAt,
    end_at: poll.endAt,
    closed_at: poll.pollState === "CLOSED" ? poll.endAt ?? poll.createdAt : null,
    launched_at: poll.pollState === "OPEN" ? poll.startAt ?? poll.createdAt : null,
    last_vote_at: counts.lastVoteAt,
    vote_count: counts.voteCount,
    invited_count: poll.invitedVoterList.length,
    banned_count: poll.bannedVoterList.length,
    choice_counts: JSON.stringify(counts.choiceCounts),
    poll_edit_update_heartbeat_timestamp: poll.pollEditUpdateHeartbeatTimestamp,
    poll_edit_update_client_guid: poll.pollEditUpdateClientGUID,
    poll_approval_timestamp: poll.pollApprovalTimestamp,
    poll_acceptability_screening_attempts: poll.pollAcceptabilityScreeningAttempts,
    poll_rejection_reason: poll.pollRejectionReason,
    time_zone: poll.timeZone
  };
}

/** Keeps the state of a removed, already emailed invitation under its email key. */
export async function rememberInvitations(
  trx: Executor,
  pid: string,
  rows: { email: string; sent_at: Date | string | null; reminded_at: Date | string | null }[]
): Promise<void> {
  const sent = rows.filter((r) => r.sent_at !== null);
  if (sent.length === 0) return;
  const keys = new Map(sent.map((r) => [emailKeyOf(r.email), r]));
  await trx
    .insertInto("invitation_history")
    .values([...keys].map(([key, r]) => ({ poll_id: pid, email_key: key, sent_at: r.sent_at, reminded_at: r.reminded_at })))
    .onConflict((oc) =>
      oc.columns(["poll_id", "email_key"]).doUpdateSet((eb) => ({
        sent_at: eb.ref("excluded.sent_at"),
        reminded_at: eb.ref("excluded.reminded_at")
      }))
    )
    .execute();
}

/** An address added back takes the sent and reminded times of its earlier invitation. */
export async function restoreInvitations(trx: Executor, pid: string, emails: string[]): Promise<void> {
  if (emails.length === 0) return;
  const history = await trx
    .selectFrom("invitation_history")
    .selectAll()
    .where("poll_id", "=", pid)
    .where("email_key", "in", emails.map(emailKeyOf))
    .execute();
  for (const h of history) {
    const email = emails.find((e) => emailKeyOf(e) === h.email_key)!;
    await trx
      .updateTable("poll_invitations")
      .set({ sent_at: h.sent_at, reminded_at: h.reminded_at })
      .where("poll_id", "=", pid)
      .where("email", "=", email)
      .execute();
    await trx.deleteFrom("invitation_history").where("poll_id", "=", pid).where("email_key", "=", h.email_key).execute();
  }
}

async function writeInvitations(trx: Transaction<Database>, pid: string, emails: string[]): Promise<void> {
  const current = await trx
    .selectFrom("poll_invitations")
    .select(["email", "sent_at", "reminded_at"])
    .where("poll_id", "=", pid)
    .execute();
  const removed = current.filter((r) => !emails.includes(r.email));
  if (removed.length > 0) {
    await rememberInvitations(trx, pid, removed);
    await trx
      .deleteFrom("poll_invitations")
      .where("poll_id", "=", pid)
      .where("email", "in", removed.map((r) => r.email))
      .execute();
  }
  if (emails.length === 0) return;
  const added = emails.filter((email) => !current.some((r) => r.email === email));
  await trx
    .insertInto("poll_invitations")
    .values(emails.map((email, position) => ({ poll_id: pid, email, position })))
    .onConflict((oc) => oc.columns(["poll_id", "email"]).doUpdateSet((eb) => ({ position: eb.ref("excluded.position") })))
    .execute();
  await restoreInvitations(trx, pid, added);
}

async function writeRoster(
  trx: Transaction<Database>,
  pid: string,
  table: "poll_invitations" | "poll_bans",
  emails: string[]
): Promise<void> {
  if (table === "poll_invitations") {
    await writeInvitations(trx, pid, emails);
    return;
  }
  await trx.deleteFrom(table).where("poll_id", "=", pid).execute();
  if (emails.length > 0) {
    await trx
      .insertInto(table)
      .values(emails.map((email, position) => ({ poll_id: pid, email, position })))
      .execute();
  }
}

export async function upsertUserPolls(
  trx: Executor,
  rows: { email: string; pid: string; relation: "created" | "invited" | "voted" | "bookmarked" | "linked" }[],
  at: Date = new Date()
): Promise<void> {
  if (rows.length === 0) return;
  await trx
    .insertInto("user_polls")
    .values(rows.map((r) => ({ email: r.email, poll_id: r.pid, relation: r.relation, updated_at: at })))
    .onConflict((oc) => oc.columns(["email", "poll_id", "relation"]).doUpdateSet({ updated_at: at }))
    .execute();
}

async function replaceVotes(trx: Transaction<Database>, pid: string, votes: VoteEntry[]): Promise<void> {
  const keep = votes.map((v) => v.emailAddress);
  let removal = trx.deleteFrom("votes").where("poll_id", "=", pid);
  if (keep.length > 0) removal = removal.where("email", "not in", keep);
  await removal.execute();
  // FIX020: a participant whose vote is removed (a ban, a reset) no longer "voted" —
  // the relation that lists the poll in their personal tab goes with the row.
  const voted = votes.filter((v) => v.choiceIds.length > 0).map((v) => v.emailAddress);
  let relationRemoval = trx.deleteFrom("user_polls").where("poll_id", "=", pid).where("relation", "=", "voted");
  if (voted.length > 0) relationRemoval = relationRemoval.where("email", "not in", voted);
  await relationRemoval.execute();
  if (votes.length > 0) {
    await trx
      .insertInto("votes")
      .values(
        votes.map((v) => ({
          poll_id: pid,
          email: v.emailAddress,
          user_name: v.userName,
          choice_ids: v.choiceIds,
          voted_at: v.votedAt
        }))
      )
      .onConflict((oc) =>
        oc.columns(["poll_id", "email"]).doUpdateSet((eb) => ({
          user_name: eb.ref("excluded.user_name"),
          choice_ids: eb.ref("excluded.choice_ids"),
          voted_at: eb.ref("excluded.voted_at")
        }))
      )
      .execute();
  }
}

/** The whole aggregate, in one transaction; counters seeded from the vote list. */
export async function insertPoll({ db, cache }: StoreDeps, poll: Poll, creator?: PollCreator): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await trx.insertInto("polls").values(newRow(poll, creator)).execute();
    await writeRoster(trx, poll._id, "poll_invitations", poll.invitedVoterList);
    await writeRoster(trx, poll._id, "poll_bans", poll.bannedVoterList);
    if (poll.currentVotes.length > 0) await replaceVotes(trx, poll._id, poll.currentVotes);
    const relations: { email: string; pid: string; relation: "created" | "invited" | "voted" }[] =
      poll.invitedVoterList.map((email) => ({ email, pid: poll._id, relation: "invited" }));
    if (creator) relations.push({ email: creator.email, pid: poll._id, relation: "created" as const });
    for (const v of poll.currentVotes) {
      if (v.choiceIds.length > 0) relations.push({ email: v.emailAddress, pid: poll._id, relation: "voted" as const });
    }
    await upsertUserPolls(trx, relations, poll.createdAt);
    const row = await trx.selectFrom("polls").selectAll().where("id", "=", poll._id).executeTakeFirstOrThrow();
    await refreshProjection(cache, row);
  });
}

export interface UpdateFilter {
  pollState?: PollState;
  pollEditUpdateClientGUID?: string | null;
}

/**
 * Applies a change to one poll; returns the poll after the write, or null when the
 * filter did not match (another writer got there first). Roster changes refresh the
 * roster tables and their counts and invalidate the cached roster sets; a content or
 * state change bumps `content_version`; the transition to CLOSED stamps `closed_at`.
 */
export async function updatePoll(
  { db, cache }: StoreDeps,
  pid: string,
  $set: Partial<Poll>,
  filter: UpdateFilter = {}
): Promise<Poll | null> {
  return db.transaction().execute(async (trx) => {
    let query = trx.selectFrom("polls").selectAll().where("id", "=", pid).forUpdate();
    if (filter.pollState !== undefined) query = query.where("poll_state", "=", filter.pollState);
    if (filter.pollEditUpdateClientGUID !== undefined) {
      query =
        filter.pollEditUpdateClientGUID === null
          ? query.where("poll_edit_update_client_guid", "is", null)
          : query.where("poll_edit_update_client_guid", "=", filter.pollEditUpdateClientGUID);
    }
    const before = await query.executeTakeFirst();
    if (!before) return null;

    const columns = columnsFor($set);
    if ($set.pollState === "CLOSED" && before.poll_state !== "CLOSED") columns.closed_at = new Date();
    if (
      $set.pollState === "OPEN" &&
      before.poll_state !== "OPEN" &&
      !(before.poll_state === "EDITING" && before.poll_state_before_edit_update === "OPEN")
    ) {
      columns.launched_at = new Date();
    }
    if ($set.pollState === "CLOSED" && before.poll_state !== "CLOSED") columns.launched_at = null;
    if (Object.keys(columns).length > 0) {
      await trx.updateTable("polls").set(columns).where("id", "=", pid).execute();
    }
    if ($set.invitedVoterList !== undefined) {
      await writeRoster(trx, pid, "poll_invitations", $set.invitedVoterList);
      let withdrawn = trx.deleteFrom("user_polls").where("poll_id", "=", pid).where("relation", "=", "invited");
      if ($set.invitedVoterList.length > 0) withdrawn = withdrawn.where("email", "not in", $set.invitedVoterList);
      await withdrawn.execute();
      await upsertUserPolls(
        trx,
        $set.invitedVoterList.map((email) => ({ email, pid, relation: "invited" as const }))
      );
    }
    if ($set.bannedVoterList !== undefined) await writeRoster(trx, pid, "poll_bans", $set.bannedVoterList);
    if ($set.currentVotes !== undefined) await replaceVotes(trx, pid, $set.currentVotes);
    if (isContentChange($set)) {
      await bumpContentVersion(trx, cache, pid);
    } else {
      const row = await trx.selectFrom("polls").selectAll().where("id", "=", pid).executeTakeFirstOrThrow();
      await refreshProjection(cache, row);
    }
    if ($set.invitedVoterList !== undefined || $set.bannedVoterList !== undefined) {
      await cache.del(`invite:${pid}`);
      await cache.del(`ban:${pid}`);
    }
    return findPoll(trx, pid);
  });
}

export async function deletePoll(db: Db, pid: string): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom("vote_history").where("poll_id", "=", pid).execute();
    await trx.deleteFrom("polls").where("id", "=", pid).execute();
  });
}

/** One participant's current vote, plus the history row, in one transaction. */
export async function recordVote(
  db: Db,
  pid: string,
  entry: VoteEntry & { votedAt: Date }
): Promise<void> {
  await ensureVoteHistoryPartition(db, entry.votedAt);
  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("votes")
      .values({
        poll_id: pid,
        email: entry.emailAddress,
        user_name: entry.userName,
        choice_ids: entry.choiceIds,
        voted_at: entry.votedAt
      })
      .onConflict((oc) =>
        oc.columns(["poll_id", "email"]).doUpdateSet({
          user_name: entry.userName,
          choice_ids: entry.choiceIds,
          voted_at: entry.votedAt
        })
      )
      .execute();
    await trx
      .insertInto("vote_history")
      .values({
        poll_id: pid,
        email: entry.emailAddress,
        user_name: entry.userName,
        choice_ids: entry.choiceIds,
        voted_at: entry.votedAt
      })
      .execute();
    await markEverVoted(trx, [pid]);
    await upsertUserPolls(trx, [{ email: entry.emailAddress, pid, relation: "voted" }], entry.votedAt);
  });
}

export async function insertVoteHistory(db: Db, entry: VoteHistoryEntry): Promise<void> {
  await ensureVoteHistoryPartition(db, entry.votedAt);
  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("vote_history")
      .values({
        poll_id: entry.pid,
        email: entry.emailAddress,
        user_name: entry.userName,
        choice_ids: entry.choiceIds,
        voted_at: entry.votedAt
      })
      .execute();
    await markEverVoted(trx, [entry.pid]);
  });
}

// ---------------------------------------------------------------------------
// Sweep queries

export function staleEditingQuery(db: Executor, cutoff: Date) {
  return db
    .selectFrom("polls")
    .selectAll()
    .where("poll_state", "=", "EDITING")
    .where("poll_edit_update_heartbeat_timestamp", "<", cutoff);
}

export async function staleEditingPolls(db: Db, cutoff: Date): Promise<Poll[]> {
  return pollsFromRows(db, await staleEditingQuery(db, cutoff).execute());
}

/** Scheduled polls whose stored state disagrees with their schedule at `now`. */
export function scheduleCandidatesQuery(db: Executor, now: Date) {
  return db
    .selectFrom("polls")
    .selectAll()
    .where("poll_state", "in", ["WAITING TO OPEN", "OPEN", "CLOSED"])
    .where(
      sql<boolean>`(
        (start_at is not null and end_at is not null and start_at > end_at)
        or (coalesce(start_at > ${now}, false) and poll_state <> 'WAITING TO OPEN')
        or (not coalesce(start_at > ${now}, false) and coalesce(end_at < ${now}, false) and poll_state <> 'CLOSED')
        or (not coalesce(start_at > ${now}, false) and not coalesce(end_at < ${now}, false) and poll_state <> 'OPEN')
      )`
    );
}

export async function scheduleCandidates(db: Db, now: Date): Promise<Poll[]> {
  return pollsFromRows(db, await scheduleCandidatesQuery(db, now).execute());
}

/** Takes a stalled screening claim back, oldest first; returns whether one was found. */
export function crashedClaimQuery(db: Executor, cutoff: Date) {
  return db
    .selectFrom("polls")
    .select("id")
    .where("poll_state", "=", "AWAITING APPROVAL")
    .where("poll_approval_timestamp", "is not", null)
    .where("poll_approval_timestamp", "<", cutoff)
    .orderBy("poll_approval_timestamp", "asc")
    .limit(1);
}

export async function recoverCrashedApprovalClaim({ db, cache }: StoreDeps, cutoff: Date): Promise<boolean> {
  const row = await db
    .updateTable("polls")
    .set({
      poll_approval_timestamp: null,
      poll_rejection_reason: sql<string>`'Acceptability Screening has timed out ' || poll_acceptability_screening_attempts || ' times'`
    })
    .where("id", "=", crashedClaimQuery(db, cutoff))
    .returningAll()
    .executeTakeFirst();
  if (row) await refreshProjection(cache, row);
  return row !== undefined;
}

export function nextForApprovalQuery(db: Executor) {
  return db
    .selectFrom("polls")
    .select("id")
    .where("poll_state", "=", "AWAITING APPROVAL")
    .where("poll_approval_timestamp", "is", null)
    .orderBy(sql`start_at asc nulls first`)
    .orderBy("created_at", "asc")
    .limit(1);
}

/** Claims the next unscreened poll (soonest to open first) and counts the attempt. */
export async function claimNextForApproval({ db }: StoreDeps, now: Date): Promise<Poll | null> {
  const row = await db
    .updateTable("polls")
    .set((eb) => ({
      poll_approval_timestamp: now,
      poll_acceptability_screening_attempts: eb("poll_acceptability_screening_attempts", "+", 1)
    }))
    .where("id", "=", nextForApprovalQuery(db))
    .returningAll()
    .executeTakeFirst();
  if (!row) return null;
  return findPoll(db, row.id);
}
