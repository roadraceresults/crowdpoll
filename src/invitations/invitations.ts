import { sql, type Transaction } from "kysely";
import type { Cache } from "../cache/cache.js";
import type { AppConfig } from "../config.js";
import type { Db } from "../db/client.js";
import type { Database } from "../db/schema.js";
import { isAllowed } from "../auth/allowlist.js";
import { EMAIL_PATTERN, emailKey, emailKeyOf } from "../auth/emailKey.js";
import { maskAddress } from "../email/mailer.js";
import { reconcile } from "../polls/counters.js";
import { effectiveVoterLimit } from "../polls/service.js";
import { rememberInvitations, restoreInvitations, upsertUserPolls, type Poll } from "../polls/store.js";
import { INVITE_KEY } from "../votes/rosterCache.js";
import { forgetTabs } from "../refresh/tabVersions.js";
import { allowance, countSends, lockCreator } from "./sender.js";

export type InviteeStatus = "Not sent yet" | "Not delivered" | "Invited" | "Accepted" | "Voted";

export interface Invitee {
  email: string;
  userName: string;
  status: InviteeStatus;
  addedAt: string;
  sentAt: string | null;
  remindedAt: string | null;
  canResend: boolean;
  resendBlockedReason: string | null;
}

export interface InviteeList {
  invitees: Invitee[];
  invitationCount: number;
  acceptedCount: number;
  voterLimit: number | null;
  editable: boolean;
}

const DAY_MS = 24 * 3_600_000;

export const isClosedState = (poll: Pick<Poll, "pollState">): boolean =>
  poll.pollState === "CLOSED" || poll.pollState === "ARCHIVED";

interface InvitationRow {
  email: string;
  added_at: Date | string;
  sent_at: Date | string | null;
  reminded_at: Date | string | null;
  send_failed_at: Date | string | null;
  accepted_at: Date | string | null;
  user_name: string | null;
  voted: boolean;
}

const iso = (value: Date | string | null): string | null => (value === null ? null : new Date(value).toISOString());

function statusOf(row: InvitationRow): InviteeStatus {
  if (row.voted) return "Voted";
  if (row.accepted_at !== null) return "Accepted";
  if (row.send_failed_at !== null) return "Not delivered";
  if (row.sent_at !== null) return "Invited";
  return "Not sent yet";
}

export function resendBlockedReason(
  poll: Pick<Poll, "pollState">,
  row: Pick<InvitationRow, "email" | "sent_at" | "reminded_at" | "send_failed_at" | "user_name">,
  now: Date = new Date()
): string | null {
  if (isClosedState(poll)) return "The poll is closed.";
  if (poll.pollState !== "OPEN") return "The poll is not open.";
  if (row.reminded_at !== null) return "Already reminded once.";
  if (row.send_failed_at !== null) return null;
  const last = row.sent_at === null ? null : new Date(row.sent_at).getTime();
  if (last !== null && now.getTime() - last >= DAY_MS) return null;
  return `${row.user_name || row.email} was emailed less than 24 hours ago.`;
}

export async function listInvitees(
  db: Db,
  poll: Poll,
  config: Pick<AppConfig, "privateVoterLimitDefault">,
  now: Date = new Date()
): Promise<InviteeList> {
  const rows = (await db
    .selectFrom("poll_invitations as i")
    .leftJoin("user as u", "u.email", "i.email")
    .select([
      "i.email",
      "i.added_at",
      "i.sent_at",
      "i.reminded_at",
      "i.send_failed_at",
      "i.accepted_at",
      "u.userName as user_name",
      sql<boolean>`exists (select 1 from votes v where v.poll_id = i.poll_id and v.email = i.email and cardinality(v.choice_ids) > 0)`.as(
        "voted"
      )
    ])
    .where("i.poll_id", "=", poll._id)
    .orderBy("i.position")
    .execute()) as InvitationRow[];
  const invitees = rows.map((row): Invitee => {
    const reason = resendBlockedReason(poll, row, now);
    return {
      email: row.email,
      userName: row.user_name ?? "",
      status: statusOf(row),
      addedAt: iso(row.added_at)!,
      sentAt: iso(row.sent_at),
      remindedAt: iso(row.reminded_at),
      canResend: reason === null,
      resendBlockedReason: reason
    };
  });
  return {
    invitees,
    invitationCount: invitees.length,
    acceptedCount: invitees.filter((i) => i.status === "Accepted" || i.status === "Voted").length,
    voterLimit: effectiveVoterLimit(poll, config),
    editable: !isClosedState(poll)
  };
}

export interface InvitationDeps {
  db: Db;
  cache: Cache;
  config: AppConfig;
}

export type AddOutcome = "added" | "invalid" | "duplicate" | "banned" | "voter-limit" | "not-launched";

export interface AddResult {
  email: string;
  outcome: AddOutcome;
  reason?: string;
  waiting?: boolean;
}

export const DAILY_LIMIT_MESSAGE = "Your daily invitation limit is reached.";
const MAX_ADDRESS_LENGTH = 200;

export function parseAddresses(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((a) => a.trim().toLowerCase())
    .filter((a) => a !== "");
}

async function lockPoll(trx: Transaction<Database>, pid: string): Promise<void> {
  await trx.selectFrom("polls").select("id").where("id", "=", pid).forUpdate().executeTakeFirst();
}

async function setInvitedCount(trx: Transaction<Database>, pid: string): Promise<void> {
  const { n } = await trx
    .selectFrom("poll_invitations")
    .select((eb) => eb.fn.countAll<string>().as("n"))
    .where("poll_id", "=", pid)
    .executeTakeFirstOrThrow();
  await trx.updateTable("polls").set({ invited_count: Number(n) }).where("id", "=", pid).execute();
}

export async function addInvitees(
  { db, cache, config }: InvitationDeps,
  poll: Poll,
  text: string,
  creatorId: string,
  now: Date = new Date()
): Promise<AddResult[]> {
  const addresses = parseAddresses(text);
  const results = await db.transaction().execute(async (trx) => {
    await lockPoll(trx, poll._id);
    const listed = await trx.selectFrom("poll_invitations").select(["email", "position"]).where("poll_id", "=", poll._id).execute();
    const banned = await trx.selectFrom("poll_bans").select("email").where("poll_id", "=", poll._id).execute();
    const emailed = new Set(
      (
        await trx
          .selectFrom("invitation_history")
          .select("email_key")
          .where("poll_id", "=", poll._id)
          .where("sent_at", "is not", null)
          .execute()
      ).map((h) => h.email_key)
    );
    const listedKeys = new Set(listed.map((r) => emailKeyOf(r.email)));
    const bannedKeys = new Set(banned.map((r) => emailKeyOf(r.email)));
    const limit = effectiveVoterLimit(poll, config) ?? Number.POSITIVE_INFINITY;
    let emailsLeft =
      poll.pollState === "OPEN" ? (await allowance(trx, creatorId, config.maxInvitationsPerDay, now)).remaining : Number.POSITIVE_INFINITY;
    let count = listed.length;
    const out: AddResult[] = [];
    const added: string[] = [];
    for (const email of addresses) {
      const key = emailKeyOf(email);
      if (!EMAIL_PATTERN.test(email) || email.length > MAX_ADDRESS_LENGTH) {
        out.push({ email, outcome: "invalid", reason: "Not a valid email address." });
      } else if (listedKeys.has(key)) {
        out.push({ email, outcome: "duplicate", reason: "Already invited." });
      } else if (bannedKeys.has(key)) {
        out.push({ email, outcome: "banned", reason: "Banned from this poll." });
      } else if (count >= limit) {
        out.push({ email, outcome: "voter-limit", reason: `The poll's voter limit of ${limit} is reached.` });
      } else if (!isAllowed(email, config)) {
        out.push({ email, outcome: "not-launched", reason: "CrowdPoll has not launched for this address yet." });
      } else {
        const waiting = !emailed.has(key) && emailsLeft <= 0;
        out.push(waiting ? { email, outcome: "added", waiting } : { email, outcome: "added" });
        added.push(email);
        listedKeys.add(key);
        count += 1;
        if (!emailed.has(key)) emailsLeft -= 1;
      }
    }
    if (added.length > 0) {
      const start = listed.reduce((max, r) => Math.max(max, r.position + 1), 0);
      await trx
        .insertInto("poll_invitations")
        .values(added.map((email, i) => ({ poll_id: poll._id, email, position: start + i, added_at: now })))
        .execute();
      await restoreInvitations(trx, poll._id, added);
      await upsertUserPolls(trx, added.map((email) => ({ email, pid: poll._id, relation: "invited" as const })), now);
      await trx
        .insertInto("votes")
        .values(added.map((email) => ({ poll_id: poll._id, email, user_name: "", choice_ids: [], voted_at: null })))
        .onConflict((oc) => oc.columns(["poll_id", "email"]).doNothing())
        .execute();
      await setInvitedCount(trx, poll._id);
    }
    return out;
  });
  await cache.del(INVITE_KEY(poll._id));
  await forgetTabs(cache, results.filter((r) => r.outcome === "added").map((r) => r.email));
  const refused = results.filter((r) => r.outcome !== "added").length;
  console.log(`[invitations] Added ${results.length - refused}, refused ${refused} on poll ${poll._id}`);
  return results;
}

export type RemoveOutcome = { removed: string[] } | { voted: string[] };

export async function removeInvitees(
  { db, cache }: InvitationDeps,
  poll: Poll,
  emails: string[],
  confirmVoted: boolean
): Promise<RemoveOutcome> {
  const wanted = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter((e) => e !== ""))];
  if (wanted.length === 0) return { removed: [] };
  const outcome = await db.transaction().execute(async (trx) => {
    await lockPoll(trx, poll._id);
    const rows = await trx
      .selectFrom("poll_invitations")
      .select(["email", "sent_at", "reminded_at"])
      .where("poll_id", "=", poll._id)
      .where("email", "in", wanted)
      .execute();
    if (rows.length === 0) return { removed: [] as string[], voted: [] as string[], refused: false };
    const removed = rows.map((r) => r.email);
    const voted = (
      await trx
        .selectFrom("votes")
        .select("email")
        .where("poll_id", "=", poll._id)
        .where("email", "in", removed)
        .where(sql<boolean>`cardinality(choice_ids) > 0`)
        .execute()
    ).map((v) => v.email);
    if (voted.length > 0 && !confirmVoted) return { removed: [], voted, refused: true };
    await rememberInvitations(trx, poll._id, rows);
    await trx.deleteFrom("poll_invitations").where("poll_id", "=", poll._id).where("email", "in", removed).execute();
    await trx
      .deleteFrom("user_polls")
      .where("poll_id", "=", poll._id)
      .where("email", "in", removed)
      .where("relation", "in", ["invited", "voted"])
      .execute();
    await trx.deleteFrom("votes").where("poll_id", "=", poll._id).where("email", "in", removed).execute();
    await setInvitedCount(trx, poll._id);
    return { removed, voted, refused: false };
  });
  if (outcome.refused) return { voted: outcome.voted };
  await cache.del(INVITE_KEY(poll._id));
  await forgetTabs(cache, outcome.removed);
  if (outcome.voted.length > 0) await reconcile({ db, cache }, [poll._id]);
  if (outcome.removed.length > 0) {
    console.log(`[invitations] Removed ${outcome.removed.map(maskAddress).join(", ")} from poll ${poll._id}`);
  }
  return { removed: outcome.removed };
}

export type ResendOutcome =
  | { ok: true }
  | { ok: false; status: 404 | 409; error: string; code?: "resend-unavailable" }
  | { ok: false; status: 429; error: string; code: "daily-limit"; retryAt: string };

export async function resendInvitation(
  { db, config }: InvitationDeps,
  poll: Poll,
  address: string,
  creatorId: string,
  now: Date = new Date()
): Promise<ResendOutcome> {
  const email = address.trim().toLowerCase();
  const outcome = await db.transaction().execute(async (trx): Promise<ResendOutcome> => {
    await lockCreator(trx, creatorId);
    const row = await trx
      .selectFrom("poll_invitations as i")
      .leftJoin("user as u", "u.email", "i.email")
      .select(["i.email", "i.sent_at", "i.reminded_at", "i.send_failed_at", "u.userName as user_name"])
      .where("i.poll_id", "=", poll._id)
      .where("i.email", "=", email)
      .executeTakeFirst();
    if (!row) return { ok: false, status: 404, error: "Not on this poll's invitation list." };
    const reason = resendBlockedReason(poll, row, now);
    if (reason !== null) return { ok: false, status: 409, error: reason, code: "resend-unavailable" };
    const { remaining, retryAt } = await allowance(trx, creatorId, config.maxInvitationsPerDay, now);
    if (remaining === 0) {
      return { ok: false, status: 429, error: DAILY_LIMIT_MESSAGE, code: "daily-limit", retryAt: (retryAt ?? now).toISOString() };
    }
    await trx
      .updateTable("poll_invitations")
      .set({ reminded_at: now, send_failed_at: null })
      .where("poll_id", "=", poll._id)
      .where("email", "=", email)
      .execute();
    await countSends(trx, creatorId, 1, now);
    return { ok: true };
  });
  if (outcome.ok) console.log(`[invitations] Reminder queued for ${maskAddress(email)} on poll ${poll._id}`);
  return outcome;
}

/** Accepted = shown the poll, written once (R3). */
export async function markAccepted(db: Db, pid: string | string[], email: string, now: Date = new Date()): Promise<void> {
  const pids = Array.isArray(pid) ? pid : [pid];
  if (pids.length === 0) return;
  await db
    .updateTable("poll_invitations")
    .set({ accepted_at: now })
    .where("poll_id", "in", pids)
    .where("email", "=", email.toLowerCase())
    .where("accepted_at", "is", null)
    .execute();
}

/** Every invitation whose email key matches the account takes the account's address (research R2). */
export async function adoptInvitations({ db, cache }: { db: Db; cache?: Cache }, accountEmail: string): Promise<number> {
  const account = accountEmail.trim().toLowerCase();
  const matches = await db
    .selectFrom("poll_invitations")
    .select(["poll_id", "email"])
    .where(emailKey(sql.ref("email")), "=", emailKeyOf(account))
    .where("email", "<>", account)
    .execute();
  if (matches.length === 0) return 0;
  await db.transaction().execute(async (trx) => {
    for (const { poll_id: pid, email } of matches) {
      const listed = await trx
        .selectFrom("poll_invitations")
        .select("email")
        .where("poll_id", "=", pid)
        .where("email", "=", account)
        .executeTakeFirst();
      if (listed) {
        await trx.deleteFrom("poll_invitations").where("poll_id", "=", pid).where("email", "=", email).execute();
      } else {
        await trx.updateTable("poll_invitations").set({ email: account }).where("poll_id", "=", pid).where("email", "=", email).execute();
      }
      await trx.deleteFrom("user_polls").where("poll_id", "=", pid).where("email", "=", email).where("relation", "=", "invited").execute();
      await upsertUserPolls(trx, [{ email: account, pid, relation: "invited" }]);
      const accountVote = await trx
        .selectFrom("votes")
        .select("email")
        .where("poll_id", "=", pid)
        .where("email", "=", account)
        .executeTakeFirst();
      if (accountVote) {
        await trx
          .deleteFrom("votes")
          .where("poll_id", "=", pid)
          .where("email", "=", email)
          .where(sql<boolean>`cardinality(choice_ids) = 0`)
          .execute();
      } else {
        await trx
          .updateTable("votes")
          .set({ email: account })
          .where("poll_id", "=", pid)
          .where("email", "=", email)
          .where(sql<boolean>`cardinality(choice_ids) = 0`)
          .execute();
      }
    }
  });
  for (const pid of new Set(matches.map((m) => m.poll_id))) await cache?.del(INVITE_KEY(pid));
  if (cache) await forgetTabs(cache, [account, ...matches.map((m) => m.email)]);
  console.log(`[invitations] Adopted ${matches.length} invitation(s) for ${maskAddress(account)}`);
  return matches.length;
}

/** Invitees who were shown the poll or voted, per poll, for the admin list rows (A3). */
export async function acceptedCounts(db: Db, pids: string[]): Promise<Map<string, number>> {
  if (pids.length === 0) return new Map();
  const rows = await db
    .selectFrom("poll_invitations as i")
    .select(["i.poll_id", (eb) => eb.fn.countAll<string>().as("n")])
    .where("i.poll_id", "in", pids)
    .where((eb) =>
      eb.or([
        eb("i.accepted_at", "is not", null),
        sql<boolean>`exists (select 1 from votes v where v.poll_id = i.poll_id and v.email = i.email and cardinality(v.choice_ids) > 0)`
      ])
    )
    .groupBy("i.poll_id")
    .execute();
  return new Map(rows.map((r) => [r.poll_id, Number(r.n)]));
}

/** Stores the creator's IANA zone when it is one; anything else is ignored (A5). */
export async function storeTimeZone(db: Db, pid: string, value: unknown): Promise<void> {
  if (typeof value !== "string" || value === "") return;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
  } catch {
    return;
  }
  await db.updateTable("polls").set({ time_zone: value }).where("id", "=", pid).execute();
}
