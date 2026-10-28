import { randomBytes } from "node:crypto";
import type { Db } from "../db/client.js";
import { hashToken } from "../auth/auth.js";

const TOKEN_LIFE_MS = 30 * 24 * 3_600_000;

/** Issues the invitation's newest sign-in token and returns it; only its hash is stored. */
export async function issueInvitationToken(
  db: Db,
  pid: string,
  email: string,
  endAt: Date | null,
  now: Date = new Date()
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const latest = new Date(now.getTime() + TOKEN_LIFE_MS);
  const expiresAt = endAt && endAt.getTime() < latest.getTime() ? endAt : latest;
  await db
    .updateTable("poll_invitations")
    .set({ token_hash: hashToken(token), token_expires_at: expiresAt, token_used_at: null })
    .where("poll_id", "=", pid)
    .where("email", "=", email)
    .execute();
  return token;
}

/** The invited address when the token can sign in (data-model "can a token sign in?"), else null. */
export async function findSignInToken(db: Db, pid: string, token: string): Promise<{ email: string } | null> {
  if (!token) return null;
  const row = await db
    .selectFrom("poll_invitations as i")
    .innerJoin("polls as p", "p.id", "i.poll_id")
    .select("i.email")
    .where("i.poll_id", "=", pid)
    .where("i.token_hash", "=", hashToken(token))
    .where("i.token_used_at", "is", null)
    .where("i.token_expires_at", ">", new Date())
    .where("p.poll_state", "not in", ["CLOSED", "ARCHIVED"])
    .where("p.poll_visibility", "=", "Private Poll")
    .where("p.poll_sharing_mode", "=", "Invitation Only")
    .executeTakeFirst();
  return row ? { email: row.email } : null;
}

/** Marks the token used; false when another request already did. */
export async function useToken(db: Db, pid: string, token: string): Promise<boolean> {
  const rows = await db
    .updateTable("poll_invitations")
    .set({ token_used_at: new Date() })
    .where("poll_id", "=", pid)
    .where("token_hash", "=", hashToken(token))
    .where("token_used_at", "is", null)
    .returning("email")
    .execute();
  return rows.length > 0;
}
