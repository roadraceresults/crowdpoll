import type { SessionCache } from "../auth/sessionCache.js";
import type { Db } from "../db/client.js";
import { TERMS_VERSION } from "./version.js";

export async function recordAgreement(db: Db, sessions: SessionCache, userId: string, now = new Date()): Promise<void> {
  await db
    .updateTable("user")
    .set({ terms_version: TERMS_VERSION, terms_accepted_at: now })
    .where("id", "=", userId)
    .execute();
  await sessions.forgetUserSessions(userId);
}
