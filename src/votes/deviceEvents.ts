import { createHmac } from "node:crypto";
import type { Cache } from "../cache/cache.js";
import type { Db } from "../db/client.js";
import { ensureDeviceEventsPartition } from "../db/partitions.js";

/** Bumped when the fingerprint library or the key changes, so analysis never compares across them. */
export const DEVICE_FINGERPRINT_VERSION = 1;

const FINGERPRINT_HEADER = /^([0-9a-f]{32})\.([0-9a-f]{32})$/;

export interface DeviceHashes {
  browserHash: string | null;
  hardwareHash: string | null;
}

export function parseFingerprintHeader(value: string | undefined): { browser: string; hardware: string } | null {
  const match = value === undefined ? null : FINGERPRINT_HEADER.exec(value);
  return match ? { browser: match[1]!, hardware: match[2]! } : null;
}

const keyedHash = (key: string, value: string) => createHmac("sha256", key).update(value).digest("hex");

export function keyedDeviceHashes(header: string | undefined, key: string): DeviceHashes {
  const parts = parseFingerprintHeader(header);
  if (!parts) return { browserHash: null, hardwareHash: null };
  return { browserHash: keyedHash(key, parts.browser), hardwareHash: keyedHash(key, parts.hardware) };
}

const SIGN_IN_KEY = (sessionId: string) => `device-signin:${sessionId}`;

/** A cache that cannot answer means not due: this must never disturb the request that asks. */
export async function isSignInDue(cache: Cache, sessionId: string): Promise<boolean> {
  try {
    return !(await cache.get(SIGN_IN_KEY(sessionId)));
  } catch {
    return false;
  }
}

/** Claims the session's one sign-in event; a failed insert gives the claim back, so a later page can report. */
export async function recordSignInEvent(
  { db, cache }: { db: Db; cache: Cache },
  event: { sessionId: string; accountId: string; hashes: DeviceHashes; ttlMs: number; now?: Date }
): Promise<void> {
  const key = SIGN_IN_KEY(event.sessionId);
  if (!(await cache.setNx(key, "1", event.ttlMs))) return;
  const at = event.now ?? new Date();
  try {
    await ensureDeviceEventsPartition(db, at);
    await db
      .insertInto("device_events")
      .values({
        account_id: event.accountId,
        event: "sign-in",
        poll_id: null,
        browser_hash: event.hashes.browserHash,
        hardware_hash: event.hashes.hardwareHash,
        fingerprint_version: DEVICE_FINGERPRINT_VERSION,
        at
      })
      .execute();
  } catch (err) {
    await cache.del(key).catch(() => undefined);
    throw err;
  }
}
