/**
 * userName defaulting & uniqueness (FR-011/012, research R7).
 * Default = email local-part truncated to 200 chars; on collision append
 * 2, 3, … (base truncated so base+suffix ≤ 200), checked against the
 * case-insensitive unique index the first migration creates on lower("userName").
 */
import type { Db } from "../db/client.js";

export const USERNAME_MAX = 200;

export async function isUserNameTaken(db: Db, userName: string): Promise<boolean> {
  const existing = await db
    .selectFrom("user")
    .select("id")
    .where((eb) => eb(eb.fn("lower", ["userName"]), "=", userName.toLowerCase()))
    .executeTakeFirst();
  return existing !== undefined;
}

/** Derive a free userName from an email address (or any base name). */
export async function defaultUserName(db: Db, baseSource: string): Promise<string> {
  const localPart = baseSource.includes("@") ? baseSource.split("@")[0]! : baseSource;
  const base = (localPart || "user").slice(0, USERNAME_MAX);
  if (!(await isUserNameTaken(db, base))) return base;
  for (let suffix = 2; ; suffix++) {
    const suffixStr = String(suffix);
    const candidate = base.slice(0, USERNAME_MAX - suffixStr.length) + suffixStr;
    if (!(await isUserNameTaken(db, candidate))) return candidate;
  }
}
