/**
 * Test harness: app factory bound to a fresh PostgreSQL database inside the
 * run's embedded cluster, the in-process cache/queue, a captured mail transport
 * with link extraction, and time-shift helpers for expiry/window tests (fakes
 * Date only, so real DB and network timers keep working).
 */
import express, { type Express } from "express";
import request from "supertest";
import type { Transporter } from "nodemailer";
import { sql } from "kysely";
import pg from "pg";
import { inject, vi } from "vitest";
import { loadConfig, type AppConfig } from "../../src/config.js";
import { createAuth, hashToken, type Auth } from "../../src/auth/auth.js";
import { MemoryCache } from "../../src/cache/memoryCache.js";
import { migrateToLatest } from "../../src/db/migrator.js";
import { createDb, type Db } from "../../src/db/client.js";
import { setTransport } from "../../src/email/mailer.js";
import { createApp, createAppContext, type AppContext } from "../../src/server.js";
import { VOTE_GROUP, VOTE_STREAM } from "../../src/votes/queue.js";
import { TERMS_VERSION } from "../../src/legal/version.js";

/** The agreement every create-account request now carries (A3). */
export const AGREED = { acceptedTerms: true, termsVersion: TERMS_VERSION } as const;

export interface CapturedMail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface TestContext extends AppContext {
  app: Express;
  db: Db;
  auth: Auth;
  cache: MemoryCache;
  config: AppConfig;
  /** Every message "sent" since startup, oldest first. */
  sent: CapturedMail[];
  /** Every sign-in binding cookie the app set, keyed by the hash its link carries. */
  bindings: Map<string, string>;
  /** Every SQL statement the app ran, for suites that assert on database access. */
  queries: string[];
  stop(): Promise<void>;
}

let databaseCounter = 0;

async function createTestDatabase(): Promise<{ url: string; drop: () => Promise<void> }> {
  const adminUrl = inject("pgAdminUrl");
  const name = `t_${process.pid}_${Date.now().toString(36)}_${databaseCounter++}`;
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`create database "${name}"`);
  await admin.end();
  return {
    url: adminUrl.replace(/\/postgres$/, `/${name}`),
    drop: async () => {
      const client = new pg.Client({ connectionString: adminUrl });
      await client.connect();
      await client.query(`drop database "${name}" with (force)`);
      await client.end();
    }
  };
}

export async function startTestContext(
  envOverrides: Record<string, string> = {}
): Promise<TestContext> {
  const database = await createTestDatabase();
  const queries: string[] = [];
  const db = createDb(database.url, { max: 10, log: (event) => void queries.push(event.query.sql) });
  await migrateToLatest(db);
  await sql`alter table "user" alter column "terms_version" set default ${sql.lit(TERMS_VERSION)}`.execute(db);

  const config = loadConfig({
    ENV_PORT: "8080",
    ENV_DATABASE_URL: database.url,
    // FR-010: the secret is mandatory everywhere; the harness supplies its own.
    ENV_BETTER_AUTH_SECRET: "vitest-harness-secret-0123456789-0123456789",
    ENV_PUBLIC_ORIGIN: "http://localhost:8080",
    ENV_PARTICIPANTS_VIEWPORT_SIZE: "10",
    ENV_MIN_CHOICES: "2",
    ENV_MAX_CHOICES: "50",
    // Suites that exercise the floors set their own; the rest vote freely.
    ENV_MIN_VOTE_INTERVAL: "1",
    // FIX008: the floors' tests are written one request at a time; the suites
    // about the burst allowance set their own sizes.
    ENV_MANUAL_REFRESH_BURST: "1",
    ENV_SEARCH_BURST: "1",
    ENV_BUDGET_CONTROLLER_INTERVAL: "1",
    ...envOverrides
  });

  const sent: CapturedMail[] = [];
  setTransport({
    sendMail: async (opts: CapturedMail) => {
      sent.push({
        to: String(opts.to),
        subject: String(opts.subject),
        text: String(opts.text),
        html: String(opts.html)
      });
      return { messageId: `test-${sent.length}` };
    }
  } as unknown as Transporter);

  const cache = new MemoryCache();
  await cache.xgroupCreate(VOTE_STREAM, VOTE_GROUP);
  const auth = createAuth(db, config, cache);
  const context = createAppContext({ auth, db, cache, config });
  const bindings = new Map<string, string>();
  const app = express();
  app.set("trust proxy", true);
  app.use((_req, res, next) => {
    const setHeader = res.setHeader.bind(res);
    res.setHeader = (name, value) => {
      if (String(name).toLowerCase() === "set-cookie") {
        for (const cookie of [value].flat()) {
          const match = /^signin_binding=([^;]+)/.exec(String(cookie));
          if (match) bindings.set(hashToken(match[1]!), match[1]!);
        }
      }
      return setHeader(name, value);
    };
    next();
  });
  app.use(createApp(context));

  return {
    ...context,
    app,
    db,
    auth,
    cache,
    config,
    sent,
    bindings,
    queries,
    stop: async () => {
      context.shedding.stop();
      await cache.close();
      await db.destroy();
      await database.drop();
    }
  };
}

/** Removes every poll-related row so a suite can start each case from nothing. */
export async function clearPolls(ctx: TestContext): Promise<void> {
  await sql`truncate table vote_history, votes, poll_invitations, invitation_history, invitation_emails, poll_bans, bookmarks, user_polls, search_outbox, polls`.execute(
    ctx.db
  );
}

/**
 * Create a user + session directly through the library's stores and return
 * a validly signed session cookie — lets suites exercise signed-in behavior
 * in configurations whose sign-in flow is externally blocked (OAuth mode).
 */
export async function forgeSession(
  ctx: TestContext,
  email: string
): Promise<{ cookie: string; userId: string }> {
  const authCtx = await ctx.auth.$context;
  const user = await authCtx.internalAdapter.createUser({
    email,
    name: "",
    emailVerified: true
  });
  const session = await authCtx.internalAdapter.createSession(user.id);
  const { createHmac } = await import("node:crypto");
  const signature = createHmac("sha256", ctx.config.authSecret)
    .update(session.token)
    .digest("base64");
  return {
    cookie: `session_token=${encodeURIComponent(`${session.token}.${signature}`)}`,
    userId: user.id
  };
}

/** Marks a user as not having accepted the current Terms, so the terms gate applies to them. */
export async function withoutAgreement(ctx: TestContext, userId: string): Promise<void> {
  await ctx.db.updateTable("user").set({ terms_version: null, terms_accepted_at: null }).where("id", "=", userId).execute();
  await ctx.sessions.forgetUserSessions(userId);
}

/** First absolute URL found in a captured mail's text body. */
export function extractLink(mail: CapturedMail): string {
  const match = mail.text.match(/https?:\/\/\S+/);
  if (!match) throw new Error(`No link found in mail "${mail.subject}" to ${mail.to}`);
  return match[0];
}

/**
 * Follows an emailed sign-in link from the browser that asked for it: sends the
 * signin_binding cookie the request set, plus any other cookies given.
 */
export function followSignInLink(ctx: TestContext, link: string, cookie?: string) {
  const bind = new URL(link, "http://localhost").searchParams.get("bind");
  const binding = bind ? ctx.bindings.get(bind) : undefined;
  const cookies = [cookie, binding ? `signin_binding=${binding}` : undefined].filter(Boolean).join("; ");
  const req = request(ctx.app).get(link);
  return cookies ? req.set("Cookie", cookies) : req;
}

/** Path + query of the first link, ready to feed to supertest. */
export function extractLinkPath(mail: CapturedMail): string {
  const url = new URL(extractLink(mail));
  return url.pathname + url.search;
}

/**
 * Shift Date.now()/new Date() forward without faking timers (the database
 * driver and supertest need real timers to function).
 */
export function timeShiftMinutes(minutes: number): void {
  vi.useFakeTimers({ toFake: ["Date"], now: Date.now() + minutes * 60_000 });
}

export function restoreTime(): void {
  vi.useRealTimers();
}
