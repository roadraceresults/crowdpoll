import { createHash } from "node:crypto";
import type { Request } from "express";
import { fromNodeHeaders } from "better-auth/node";
import type { Cache } from "../cache/cache.js";
import type { Db } from "../db/client.js";
import type { Auth } from "./auth.js";

export type Session = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;

export interface SessionCacheDeps {
  auth: Auth;
  db: Db;
  cache: Cache;
  ttlMs: number;
}

export interface SessionCache {
  getSession(req: Request): Promise<Session | null>;
  /** Signs the session out and drops its cached copy; the only path that calls sign-out. */
  endSession(req: Request): Promise<string | null>;
  /** Drops every cached copy of a user's sessions after their profile changed. */
  forgetUserSessions(userId: string): Promise<void>;
}

const COOKIE_NAME = "session_token";
const FAILURE_LOG_EVERY_MS = 30_000;
let lastFailureLogAt = 0;

function logCacheFailure(what: string, err: unknown): void {
  const now = Date.now();
  if (now - lastFailureLogAt < FAILURE_LOG_EVERY_MS) return;
  lastFailureLogAt = now;
  console.error(`[session] ${what} (repeated failures are logged once every ${FAILURE_LOG_EVERY_MS / 1000}s):`, err);
}

export function sessionKey(token: string): string {
  return `sess:${createHash("sha256").update(token).digest("base64url")}`;
}

/** The raw session token carried by the request's cookie, before its signature. */
export function sessionTokenOf(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name !== COOKIE_NAME) continue;
    const value = decodeURIComponent(rest.join("="));
    return value.split(".")[0] || null;
  }
  return null;
}

export function createSessionCache({ auth, db, cache, ttlMs }: SessionCacheDeps): SessionCache {
  // The column is read here rather than declared to BetterAuth, whose Kysely adapter cannot
  // store arrays: https://www.better-auth.com/docs/concepts/database#extending-core-schema
  async function lookup(req: Request): Promise<Session | null> {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) return null;
    const row = await db
      .selectFrom("user")
      .select(["permissions", "terms_version"])
      .where("id", "=", session.user.id)
      .executeTakeFirst();
    const user = session.user as Session["user"] & { permissions: string[]; termsVersion: string | null };
    user.permissions = row?.permissions ?? [];
    user.termsVersion = row?.terms_version ?? null;
    return session;
  }

  async function getSession(req: Request): Promise<Session | null> {
    const token = sessionTokenOf(req);
    if (!token) return null;
    const key = sessionKey(token);
    try {
      const cached = await cache.get(key);
      if (cached) {
        const session = JSON.parse(cached) as Session;
        if (new Date(session.session.expiresAt).getTime() > Date.now()) return session;
        await cache.del(key);
      }
    } catch (err) {
      logCacheFailure("Cache read failed, falling back to the database", err);
    }
    const session = await lookup(req);
    if (!session) return null;
    const remaining = new Date(session.session.expiresAt).getTime() - Date.now();
    if (remaining <= 0) return null;
    try {
      await cache.set(key, JSON.stringify(session), Math.min(ttlMs, remaining));
    } catch (err) {
      logCacheFailure("Cache write failed", err);
    }
    return session;
  }

  async function endSession(req: Request): Promise<string | null> {
    const token = sessionTokenOf(req);
    const response = await auth.api.signOut({
      headers: fromNodeHeaders(req.headers),
      asResponse: true
    });
    if (token) {
      try {
        await cache.del(sessionKey(token));
      } catch (err) {
        logCacheFailure("Cache delete failed", err);
      }
    }
    return response.headers.getSetCookie().find((c) => c.startsWith(`${COOKIE_NAME}=`)) ?? null;
  }

  async function forgetUserSessions(userId: string): Promise<void> {
    const rows = await db.selectFrom("session").select("token").where("userId", "=", userId).execute();
    for (const { token } of rows) {
      try {
        await cache.del(sessionKey(token));
      } catch (err) {
        logCacheFailure("Cache delete failed", err);
      }
    }
  }

  return { getSession, endSession, forgetUserSessions };
}
