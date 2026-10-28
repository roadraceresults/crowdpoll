import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { supersedeLoginLinks } from "../auth/auth.js";
import { emailKey, emailKeyOf } from "../auth/emailKey.js";
import { sessionKey } from "../auth/sessionCache.js";
import type { Cache } from "../cache/cache.js";
import type { Db } from "../db/client.js";
import { COUNTS_KEY } from "../polls/counters.js";
import { bumpContentVersion } from "../polls/versions.js";
import { BAN_KEY, INVITE_KEY } from "../votes/rosterCache.js";
import { markDeleted, unmarkDeleted } from "./deletedAccounts.js";

export const DELETED_USER_NAME = "Deleted user";

export interface AccountDeletion {
  pollsDeleted: number;
  votesAnonymized: number;
}

function placeholderAddress(): string {
  return `deleted-${randomUUID()}@deleted.invalid`;
}

export async function deleteAccount(
  { db, cache }: { db: Db; cache: Cache },
  user: { id: string; email: string }
): Promise<AccountDeletion> {
  const { email } = user;
  await markDeleted(cache, email);
  const outcome = await removeInOneTransaction(db, cache, user).catch(async (err: unknown) => {
    await unmarkDeleted(cache, email).catch(() => undefined);
    throw err;
  });

  const staleKeys = [
    ...outcome.tokens.map(sessionKey),
    ...outcome.invitedPids.map(INVITE_KEY),
    ...outcome.ownIds.flatMap((pid) => [INVITE_KEY(pid), BAN_KEY(pid), COUNTS_KEY(pid)])
  ];
  for (const key of staleKeys) await cache.del(key).catch(() => undefined);
  return { pollsDeleted: outcome.pollsDeleted, votesAnonymized: outcome.votesAnonymized };
}

function removeInOneTransaction(db: Db, cache: Cache, user: { id: string; email: string }) {
  const { email } = user;
  return db.transaction().execute(async (trx) => {
    const tokens = (await trx.selectFrom("session").select("token").where("userId", "=", user.id).execute()).map((r) => r.token);
    const ownPolls = await trx.selectFrom("polls").select(["id", "content_version"]).where("created_by_id", "=", user.id).execute();
    const ownIds = ownPolls.map((p) => p.id);
    if (ownIds.length > 0) {
      await trx
        .insertInto("search_outbox")
        .values(ownPolls.map((p) => ({ poll_id: p.id, version: Number(p.content_version) + 1, reason: "content" as const })))
        .onConflict((oc) => oc.column("poll_id").doUpdateSet({ version: sql`excluded.version`, reason: "content" }))
        .execute();
      await trx.deleteFrom("vote_history").where("poll_id", "in", ownIds).execute();
      await trx.deleteFrom("polls").where("id", "in", ownIds).execute();
    }

    const votedPids = [
      ...new Set([
        ...(await trx.selectFrom("votes").select("poll_id").where("email", "=", email).execute()).map((r) => r.poll_id),
        ...(await trx.selectFrom("vote_history").select("poll_id").where("email", "=", email).execute()).map((r) => r.poll_id)
      ])
    ];
    let votesAnonymized = 0;
    for (const pid of votedPids) {
      const placeholder = placeholderAddress();
      const updated = await trx
        .updateTable("votes")
        .set({ email: placeholder, user_name: DELETED_USER_NAME })
        .where("poll_id", "=", pid)
        .where("email", "=", email)
        .executeTakeFirst();
      votesAnonymized += Number(updated.numUpdatedRows);
      await trx
        .updateTable("vote_history")
        .set({ email: placeholder, user_name: DELETED_USER_NAME })
        .where("poll_id", "=", pid)
        .where("email", "=", email)
        .execute();
    }

    // By email key: an invitation typed in another spelling of the address is theirs too (R10, R15).
    const removedInvitations = await trx
      .deleteFrom("poll_invitations")
      .where(emailKey(sql.ref("email")), "=", emailKeyOf(email))
      .returning("poll_id")
      .execute();
    const invitedPids = [...new Set(removedInvitations.map((r) => r.poll_id))];
    for (const pid of invitedPids) {
      const removed = removedInvitations.filter((r) => r.poll_id === pid).length;
      await trx
        .updateTable("polls")
        .set((eb) => ({ invited_count: eb("invited_count", "-", removed) }))
        .where("id", "=", pid)
        .execute();
    }
    await trx.deleteFrom("invitation_history").where("email_key", "=", emailKeyOf(email)).execute();
    await trx.deleteFrom("bookmarks").where("email", "=", email).execute();
    await trx.deleteFrom("user_polls").where("email", "=", email).execute();
    await supersedeLoginLinks(trx, email);
    await trx.deleteFrom("user").where("id", "=", user.id).execute();

    const changedPids = [...new Set([...votedPids, ...invitedPids])];
    for (const pid of changedPids) await bumpContentVersion(trx, cache, pid);
    return { tokens, ownIds, invitedPids, pollsDeleted: ownIds.length, votesAnonymized };
  });
}
