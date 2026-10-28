import { randomBytes, randomUUID } from "node:crypto";
import type { Db } from "../db/client.js";
import { LINK_EXPIRY_SECONDS, hashToken } from "./auth.js";

const PREFIX = "create-account:";

export interface CreateAccountLink {
  email: string;
  pid: string | null;
  stay: boolean;
}

/* The value must not start with `{"email":`, or supersedeLoginLinks would delete it. */
function likeEmail(email: string): string {
  return `{"createAccount":${JSON.stringify(email).replace(/[\\%_]/g, "\\$&")}%`;
}

/** Stores a single-use create-account token for an address with no account; returns the token. Only the newest signs in. */
export async function issueCreateAccountToken(db: Db, link: CreateAccountLink, now: Date = new Date()): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom("verification").where("identifier", "like", `${PREFIX}%`).where("value", "like", likeEmail(link.email)).execute();
    await trx
      .insertInto("verification")
      .values({
        id: randomUUID(),
        identifier: PREFIX + hashToken(token),
        value: JSON.stringify({ createAccount: link.email, pid: link.pid, stay: link.stay }),
        expiresAt: new Date(now.getTime() + LINK_EXPIRY_SECONDS * 1000),
        createdAt: now,
        updatedAt: now
      })
      .execute();
  });
  return token;
}

/** The link a token still stands for, or null when it is unknown, used or expired; reads only. */
export async function findCreateAccountToken(db: Db, token: string, now: Date = new Date()): Promise<CreateAccountLink | null> {
  if (!token) return null;
  const row = await db
    .selectFrom("verification")
    .select("value")
    .where("identifier", "=", PREFIX + hashToken(token))
    .where("expiresAt", ">", now)
    .executeTakeFirst();
  if (!row) return null;
  const value = JSON.parse(row.value) as { createAccount?: unknown; pid?: unknown; stay?: unknown };
  if (typeof value.createAccount !== "string") return null;
  return { email: value.createAccount, pid: typeof value.pid === "string" ? value.pid : null, stay: value.stay === true };
}

/** Uses the token up; false when another request already did. */
export async function useCreateAccountToken(db: Db, token: string): Promise<boolean> {
  const deleted = await db.deleteFrom("verification").where("identifier", "=", PREFIX + hashToken(token)).executeTakeFirst();
  return Number(deleted.numDeletedRows) > 0;
}
