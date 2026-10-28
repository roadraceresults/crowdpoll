import { sql } from "kysely";
import type { Db } from "../db/client.js";
import { upsertUserPolls } from "./store.js";

const REMOVAL_BATCH = 10_000;

export class BookmarkCapError extends Error {
  constructor() {
    super("bookmark-cap");
  }
}

export async function addBookmark(db: Db, email: string, pid: string, cap: number, now: Date = new Date()): Promise<void> {
  await db.transaction().execute(async (trx) => {
    const existing = await trx
      .selectFrom("bookmarks")
      .select("poll_id")
      .where("email", "=", email)
      .where("poll_id", "=", pid)
      .executeTakeFirst();
    if (existing) return;
    const held = await trx
      .selectFrom("bookmarks")
      .select((eb) => eb.fn.countAll<string>().as("n"))
      .where("email", "=", email)
      .executeTakeFirstOrThrow();
    if (Number(held.n) >= cap) throw new BookmarkCapError();
    await trx.insertInto("bookmarks").values({ email, poll_id: pid, created_at: now }).execute();
    await upsertUserPolls(trx, [{ email, pid, relation: "bookmarked" }], now);
  });
}

export async function removeBookmark(db: Db, email: string, pid: string): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom("bookmarks").where("email", "=", email).where("poll_id", "=", pid).execute();
    await trx.deleteFrom("user_polls").where("email", "=", email).where("poll_id", "=", pid).where("relation", "=", "bookmarked").execute();
  });
}

/**
 * The daily removal: bookmarks of archived polls, of polls closed longer than the
 * expiry, and of open polls with no activity for longer than the expiry, in batches.
 */
export async function removeExpiredBookmarks(db: Db, expiryMonths: number, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - expiryMonths);
  let removed = 0;
  for (;;) {
    const batch = await db
      .selectFrom("bookmarks")
      .innerJoin("polls", "polls.id", "bookmarks.poll_id")
      .select(["bookmarks.email", "bookmarks.poll_id"])
      .where((eb) =>
        eb.or([
          eb("polls.poll_state", "=", "ARCHIVED"),
          eb.and([eb("polls.poll_state", "=", "CLOSED"), eb("polls.closed_at", "<", cutoff)]),
          eb.and([
            eb("polls.poll_state", "=", "OPEN"),
            eb(sql`coalesce(polls.last_vote_at, polls.start_at, polls.created_at)`, "<", cutoff)
          ])
        ])
      )
      .limit(REMOVAL_BATCH)
      .execute();
    if (batch.length === 0) return removed;
    await db.transaction().execute(async (trx) => {
      for (const { email, poll_id } of batch) {
        await trx.deleteFrom("bookmarks").where("email", "=", email).where("poll_id", "=", poll_id).execute();
        await trx.deleteFrom("user_polls").where("email", "=", email).where("poll_id", "=", poll_id).where("relation", "=", "bookmarked").execute();
      }
    });
    removed += batch.length;
    if (batch.length < REMOVAL_BATCH) return removed;
  }
}
