import { sql, type Kysely, type Transaction } from "kysely";
import type { Database, PollRow, UserPollRelation } from "../db/schema.js";
import { upsertUserPolls } from "./store.js";

type Executor = Kysely<Database> | Transaction<Database>;

export async function upsertRelation(
  trx: Executor,
  email: string,
  pid: string,
  relation: UserPollRelation,
  at: Date = new Date()
): Promise<void> {
  await upsertUserPolls(trx, [{ email, pid, relation }], at);
}

export interface PersonalTab {
  rows: PollRow[];
  membershipVersion: string | null;
  /** FIX020: why each poll is listed — the relations the user holds to it. */
  relations: Map<string, UserPollRelation[]>;
}

type PersonalTabQuery = ReturnType<typeof personalTabQuery>;

export function personalTabQuery(
  db: Executor,
  email: string,
  cap: number,
  visibility: "Private Poll" | "Public Poll" | undefined,
  relations: UserPollRelation[]
) {
  return db
    .selectFrom("user_polls")
    .innerJoin("polls", "polls.id", "user_polls.poll_id")
    .select([
      "user_polls.poll_id",
      (eb) => eb.fn.max("user_polls.updated_at").as("updated_at"),
      sql<string[]>`array_agg(distinct user_polls.relation)`.as("relations")
    ])
    .where("user_polls.email", "=", email)
    .where("user_polls.relation", "in", relations)
    .$if(visibility !== undefined, (qb) => qb.where("polls.poll_visibility", "=", visibility!))
    .groupBy("user_polls.poll_id")
    .orderBy("updated_at", "desc")
    .limit(cap);
}

async function personalTab(
  db: Executor,
  email: string,
  cap: number,
  visibility: "Private Poll" | "Public Poll" | undefined,
  relations: UserPollRelation[],
  refine: (query: PersonalTabQuery) => PersonalTabQuery = (query) => query
): Promise<PersonalTab> {
  const members = await refine(personalTabQuery(db, email, cap, visibility, relations)).execute();
  if (members.length === 0) return { rows: [], membershipVersion: null, relations: new Map() };
  const rows = await db
    .selectFrom("polls")
    .selectAll()
    .where("id", "in", members.map((m) => m.poll_id))
    .execute();
  const order = new Map(members.map((m, i) => [m.poll_id, i]));
  rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  const newest = members.reduce<Date | null>((max, m) => {
    const at = new Date(m.updated_at as Date);
    return !max || at > max ? at : max;
  }, null);
  return {
    rows,
    membershipVersion: newest ? newest.toISOString() : null,
    relations: new Map(members.map((m) => [m.poll_id, (m.relations ?? []) as UserPollRelation[]]))
  };
}

export function yourPollsTab(db: Executor, email: string, cap: number): Promise<PersonalTab> {
  return personalTab(db, email, cap, undefined, ["created"]);
}

/**
 * Private polls someone else created that the user was invited to or opened by link.
 * An Invitation Only poll needs a current invitation, so an invitation withdrawn
 * earlier never lists it; an Anyone With The Link poll lists on either relation.
 */
export function sharedWithYouTab(db: Executor, email: string, userId: string, cap: number): Promise<PersonalTab> {
  return personalTab(db, email, cap, "Private Poll", ["invited", "linked"], (query) =>
    query
      .where("polls.created_by_id", "<>", userId)
      .where(
        sql<boolean>`(polls.poll_sharing_mode <> 'Invitation Only' or exists (select 1 from poll_invitations where poll_invitations.poll_id = polls.id and poll_invitations.email = ${email}))`
      )
  );
}

export function yourVotesTab(db: Executor, email: string, cap: number): Promise<PersonalTab> {
  return personalTab(db, email, cap, undefined, ["voted"]);
}

export function watchingTab(db: Executor, email: string, cap: number): Promise<PersonalTab> {
  return personalTab(db, email, cap, undefined, ["bookmarked"]);
}

export interface OverlayEntry {
  voted: boolean;
  choiceIds?: string[];
  bookmarked: boolean;
  /** False when the user may not watch the poll, so the card hides the control. */
  mayWatch?: boolean;
  /** Personal tabs only (FIX020): the relations that put the poll in the tab. */
  relations?: UserPollRelation[];
}

export async function overlay(db: Executor, email: string, pids: string[]): Promise<Record<string, OverlayEntry>> {
  const out: Record<string, OverlayEntry> = {};
  if (pids.length === 0) return out;
  for (const pid of pids) out[pid] = { voted: false, bookmarked: false };
  const votes = await db
    .selectFrom("votes")
    .select(["poll_id", "choice_ids"])
    .where("email", "=", email)
    .where("poll_id", "in", pids)
    .execute();
  for (const v of votes) {
    if (v.choice_ids.length > 0) out[v.poll_id] = { ...out[v.poll_id]!, voted: true, choiceIds: v.choice_ids };
  }
  const bookmarks = await db
    .selectFrom("bookmarks")
    .select("poll_id")
    .where("email", "=", email)
    .where("poll_id", "in", pids)
    .execute();
  for (const b of bookmarks) out[b.poll_id] = { ...out[b.poll_id]!, bookmarked: true };
  return out;
}
