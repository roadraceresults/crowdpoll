import { sql, type Kysely, type Transaction } from "kysely";
import type { AppConfig } from "../config.js";
import type { Db } from "../db/client.js";
import type { Database } from "../db/schema.js";
import { emailLogoOrigin, maskAddress, sendInvitation } from "../email/mailer.js";
import { invitationMessage, type EmailMessage } from "../email/templates.js";
import { issueInvitationToken } from "./tokens.js";

export interface SenderDeps {
  db: Db;
  config: Pick<AppConfig, "maxInvitationsPerDay" | "publicOrigin" | "nativeSignin">;
}

type Executor = Kysely<Database> | Transaction<Database>;

const DAY_MS = 24 * 3_600_000;

export interface Allowance {
  remaining: number;
  retryAt: Date | null;
}

export async function allowance(db: Executor, creatorId: string, max: number, now: Date = new Date()): Promise<Allowance> {
  const since = new Date(now.getTime() - DAY_MS);
  const row = await db
    .selectFrom("invitation_emails")
    .select([(eb) => eb.fn.countAll<string>().as("n"), (eb) => eb.fn.min("sent_at").as("oldest")])
    .where("creator_id", "=", creatorId)
    .where("sent_at", ">", since)
    .executeTakeFirstOrThrow();
  const used = Number(row.n);
  const oldest = row.oldest ? new Date(row.oldest as Date) : null;
  return { remaining: Math.max(0, max - used), retryAt: oldest ? new Date(oldest.getTime() + DAY_MS) : null };
}

/** Serializes one creator's sends across instances, so the allowance is never overspent. */
export async function lockCreator(trx: Executor, creatorId: string): Promise<void> {
  await sql`select pg_advisory_xact_lock(hashtext(${`invitations:${creatorId}`}))`.execute(trx);
}

export async function countSends(trx: Executor, creatorId: string, n: number, at: Date): Promise<void> {
  if (n <= 0) return;
  await trx
    .insertInto("invitation_emails")
    .values(Array.from({ length: n }, () => ({ creator_id: creatorId, sent_at: at })))
    .execute();
}

export interface InvitationBuild {
  endAt: Date | null;
  render(link: string, signInAddress?: string): EmailMessage;
}

export async function buildInvitation(
  db: Db,
  config: SenderDeps["config"],
  pid: string,
  reminder: boolean
): Promise<InvitationBuild | null> {
  const poll = await db
    .selectFrom("polls as p")
    .leftJoin("user as u", "u.id", "p.created_by_id")
    .select([
      "p.title",
      "p.vote_anonymity",
      "p.launched_at",
      "p.start_at",
      "p.created_at",
      "p.end_at",
      "p.time_zone",
      "p.created_by_name",
      "u.userName as creator_user_name",
      "u.email as creator_email"
    ])
    .where("p.id", "=", pid)
    .executeTakeFirst();
  if (!poll) return null;
  const origin = emailLogoOrigin() ?? config.publicOrigin;
  const endAt = poll.end_at ? new Date(poll.end_at) : null;
  return {
    endAt,
    render: (link, signInAddress) =>
      invitationMessage({
        creatorName: poll.creator_user_name || poll.created_by_name,
        creatorEmail: poll.creator_email ?? "",
        title: poll.title,
        link,
        origin,
        anonymous: poll.vote_anonymity === "Yes",
        reminder,
        launchedAt: new Date(poll.launched_at ?? poll.start_at ?? poll.created_at),
        endAt,
        timeZone: poll.time_zone,
        signInAddress
      })
  };
}

async function renderFor(
  db: Db,
  config: SenderDeps["config"],
  pid: string,
  email: string,
  build: InvitationBuild,
  now: Date
): Promise<EmailMessage> {
  if (!config.nativeSignin) return build.render(`${config.publicOrigin}/?PID=${pid}`);
  const token = await issueInvitationToken(db, pid, email, build.endAt, now);
  return build.render(`${config.publicOrigin}/invite?PID=${pid}&token=${token}`, email);
}

async function deliver(db: Db, pid: string, email: string, message: EmailMessage): Promise<boolean> {
  try {
    await sendInvitation(email, message);
    return true;
  } catch {
    await db
      .updateTable("poll_invitations")
      .set({ send_failed_at: new Date() })
      .where("poll_id", "=", pid)
      .where("email", "=", email)
      .execute();
    console.log(`[invitations] Could not deliver the invitation to ${maskAddress(email)} for poll ${pid}`);
    return false;
  }
}

/** Claims and sends every pending invitation of each open Invitation Only poll (one poll when `pid` is given). */
export async function sendPendingInvitations({ db, config }: SenderDeps, pid?: string, now: Date = new Date()): Promise<number> {
  let pending = db
    .selectFrom("poll_invitations as i")
    .innerJoin("polls as p", "p.id", "i.poll_id")
    .select(["p.id", "p.created_by_id"])
    .distinct()
    .where("i.sent_at", "is", null)
    .where("i.send_failed_at", "is", null)
    .where("p.poll_state", "=", "OPEN")
    .where("p.poll_visibility", "=", "Private Poll")
    .where("p.poll_sharing_mode", "=", "Invitation Only");
  if (pid !== undefined) pending = pending.where("p.id", "=", pid);
  const polls = await pending.execute();

  let sent = 0;
  for (const poll of polls) {
    const claimed = await db.transaction().execute(async (trx) => {
      await lockCreator(trx, poll.created_by_id);
      const { remaining } = await allowance(trx, poll.created_by_id, config.maxInvitationsPerDay, now);
      if (remaining === 0) return [];
      const rows = await trx
        .updateTable("poll_invitations")
        .set({ sent_at: now })
        .where("poll_id", "=", poll.id)
        .where("email", "in", (eb) =>
          eb
            .selectFrom("poll_invitations as c")
            .innerJoin("polls as p", "p.id", "c.poll_id")
            .select("c.email")
            .where("c.poll_id", "=", poll.id)
            .where("c.sent_at", "is", null)
            .where("c.send_failed_at", "is", null)
            .where("p.poll_state", "=", "OPEN")
            .orderBy("c.added_at")
            .orderBy("c.position")
            .limit(remaining)
            .modifyEnd(sql`for update of c skip locked`)
        )
        .returning("email")
        .execute();
      await countSends(trx, poll.created_by_id, rows.length, now);
      return rows.map((r) => r.email);
    });
    if (claimed.length === 0) continue;
    const build = await buildInvitation(db, config, poll.id, false);
    if (!build) continue;
    for (const email of claimed) {
      const message = await renderFor(db, config, poll.id, email, build, now);
      if (await deliver(db, poll.id, email, message)) sent += 1;
    }
    console.log(`[invitations] Sent ${claimed.length} invitation(s) for poll ${poll.id}`);
  }
  return sent;
}

export async function sendReminder(deps: SenderDeps, pid: string, email: string): Promise<void> {
  const build = await buildInvitation(deps.db, deps.config, pid, true);
  if (!build) return;
  const message = await renderFor(deps.db, deps.config, pid, email, build, new Date());
  await deliver(deps.db, pid, email, message);
}
