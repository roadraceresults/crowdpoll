/**
 * /api/* endpoints (contracts/api-endpoints.md). Express routes wrap the
 * BetterAuth server API: validation, account-existence privacy, per-client
 * rate-limit consumption, and stay-signed-in cookie shaping live here.
 */
import { Router, type Request, type RequestHandler, type Response } from "express";
import { parsePid } from "../polls/sharedLink.js";
import type { AppConfig } from "../config.js";
import {
  consumeRateLimit,
  supersedeLoginLinks,
  hashToken,
  mintedTokens,
  LINK_EXPIRY_SECONDS,
  RATE_LIMITED,
  type Auth
} from "../auth/auth.js";
import type { SessionCache } from "../auth/sessionCache.js";
import type { Cache } from "../cache/cache.js";
import type { Db } from "../db/client.js";
import { effectivePermissions, isAdminEmail, type Caller } from "../polls/service.js";
import { bumpContentVersion } from "../polls/versions.js";
import { BAR_PALETTE } from "../polls/barPalette.js";
import * as mailer from "../email/mailer.js";
import { randomBytes } from "node:crypto";
import { USERNAME_MAX } from "../auth/username.js";
import { EMAIL_PATTERN, emailKey, emailKeyOf } from "../auth/emailKey.js";
import { findSignInToken, useToken } from "../invitations/tokens.js";
import { findCreateAccountToken, issueCreateAccountToken, useCreateAccountToken } from "../auth/createAccountLinks.js";
import { NOT_LAUNCHED, isAllowed, logRefusal } from "../auth/allowlist.js";
import { sql } from "kysely";
import { TERMS_VERSION } from "../legal/version.js";
import { recordAgreement } from "../legal/recordAgreement.js";
import { hasAcceptedTerms, safeNext } from "../legal/termsGate.js";
import { deleteAccount } from "../legal/deleteAccount.js";
import { maskIp } from "../auth/maskIp.js";
import { listingMaxAgeMs } from "../trending/publish.js";

export interface ApiDeps {
  auth: Auth;
  db: Db;
  cache: Cache;
  config: AppConfig;
  sessions: SessionCache;
  pageLoads: RequestHandler;
}

const EMAIL_MAX = 200;

/** Normalize + validate an email; null when unusable (FR-022 validation). */
function parseEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length === 0 || email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

/** Origin of the incoming request (https custom domain behind the proxy). */
function requestOrigin(req: Request): string {
  return `${req.protocol}://${req.get("host")}`;
}

/** Contract shape for a refused, over-limit request (FR-004a/013c). */
function respondRateLimited(res: Response, nextAllowedAt: Date): void {
  res.status(429).json({
    error: `Too many requests. You can try again at ${nextAllowedAt.toISOString()}.`,
    nextAllowedAt: nextAllowedAt.toISOString()
  });
}

const BINDING_COOKIE = "signin_binding";
const INVALID_LINK = "This sign-in link is invalid or has expired.";

function bindingCookie(value: string, maxAgeSeconds: number): string {
  return `${BINDING_COOKIE}=${value}; Path=/api/auth; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`;
}

function bindingFrom(req: Request): string | null {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === BINDING_COOKIE) return rest.join("=") || null;
  }
  return null;
}

function notLaunchedPath(pid: string | null): string {
  return `/login?error=not-launched${pid ? `&PID=${pid}` : ""}`;
}

function invalidLinkPath(pid: string | null): string {
  return `/login?error=invalid-link${pid ? `&PID=${pid}` : ""}`;
}

function respondMailFailure(res: Response): void {
  res.status(502).json({ error: "Could not send email, try again later" });
}

/** Route async errors into the central error handler (FR-022). */
const wrap =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

export function createApiRouter({ auth, db, cache, config, sessions, pageLoads }: ApiDeps): Router {
  const router = Router();
  const userIdByEmail = (email: string) =>
    db.selectFrom("user").select("id").where("email", "=", email).executeTakeFirst();
  const userByKey = (email: string, excludeUserId?: string) => {
    let query = db
      .selectFrom("user")
      .select(["id", "email"])
      .where(emailKey(sql.ref("email")), "=", emailKey(email));
    if (excludeUserId) query = query.where("id", "!=", excludeUserId);
    return query.orderBy("createdAt").executeTakeFirst();
  };
  const honeypotFilled = (req: Request): boolean => {
    const value = req.body?.homepage;
    if (typeof value !== "string" || value === "") return false;
    console.log(`[auth] Honeypot filled on ${req.path}; nothing sent`);
    return true;
  };

  // In oauth mode every native email flow is unavailable (FR-019/020); both keeps them.
  const nativeOnly: RequestHandler = (_req, res, next) => {
    if (!config.nativeSignin) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    next();
  };

  // GET /api/config — the sign-in mode drives client rendering (FR-015/019).
  router.get("/api/config", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({
      signinMethod: config.signinMethod,
      oauthProviders: Object.keys(config.oauthProviders),
      // The login card says how long "stay signed in" lasts, from the same setting that enforces it.
      signinCookieDurationMaxMs: config.signinCookieDurationMaxMs,
      staySignedInDefault: config.staySignedInDefault,
      trendingBaseUrl: config.spaces ? config.spaces.cdnUrl.replace(/\/$/, "") : "/api/trending",
      assetsBaseUrl: config.spaces ? `${config.spaces.cdnUrl.replace(/\/$/, "")}/assets` : "/assets",
      trendingRecomputeIntervalMs: config.trendingRecomputeIntervalMs,
      newestRecomputeIntervalMs: config.newestRecomputeIntervalMs,
      trendingMaxAgeMs: listingMaxAgeMs(config.trendingRecomputeIntervalMs),
      newestMaxAgeMs: listingMaxAgeMs(config.newestRecomputeIntervalMs),
      floors: config.floors,
      bursts: config.bursts,
      maxLiveResultsPerUser: config.maxLiveResultsPerUser,
      maxIdleTimeMs: config.maxIdleTimeMs,
      // 011 FR-059: the admin list refreshes on its own interval, deliberately
      // kept distinct from the poll-card polling interval above.
      pollAdminPageRefreshIntervalMs: config.pollAdminPageRefreshIntervalMs,
      // 012 FR-066: the editing page validates the voter limit as you type and labels
      // the field with it. Hard-coding 500 there would let the two disagree the moment
      // the setting changed, so the client is told rather than assuming.
      privateVoterLimitDefault: config.privateVoterLimitDefault,
      participantsViewportSize: config.participantsViewportSize,
      maxInvitationsPerDay: config.maxInvitationsPerDay,
      // 014: the choices editor counts lines against these as you type, for the
      // same reason as the voter limit above.
      minChoices: config.minChoices,
      maxChoices: config.maxChoices,
      barPalette: BAR_PALETTE,
      termsVersion: TERMS_VERSION
    });
  });

  async function issueLoginLink(
    req: Request,
    res: Response,
    email: string,
    stay: boolean,
    pid: string | null
  ): Promise<void> {
    await supersedeLoginLinks(db, email);
    const binding = randomBytes(24).toString("base64url");
    // Server-side call: controlled headers keep the library's CSRF/origin
    // checks out of play behind the deployment proxy.
    await auth.api.signInMagicLink({
      body: {
        email,
        callbackURL: "/",
        metadata: { origin: requestOrigin(req), stay, bind: hashToken(binding), ...(pid ? { pid } : {}) }
      },
      headers: new Headers()
    });
    res.append("Set-Cookie", bindingCookie(binding, LINK_EXPIRY_SECONDS));
  }

  /** Mints a sign-in token for server-side consumption; no email, no binding cookie (R5). */
  async function mintLoginToken(email: string): Promise<string> {
    await supersedeLoginLinks(db, email);
    const mint = randomBytes(18).toString("base64url");
    try {
      await auth.api.signInMagicLink({
        body: { email, callbackURL: "/", metadata: { mint } },
        headers: new Headers()
      });
      const token = mintedTokens.get(mint);
      if (!token) throw new Error("No sign-in token was minted");
      return token;
    } finally {
      mintedTokens.delete(mint);
    }
  }

  /**
   * The token form of create-account: the one-time link emailed to an address
   * with no account creates it and signs in, with no second email.
   */
  async function createAccountFromLink(req: Request, res: Response, token: string): Promise<void> {
    if (req.get("origin") !== requestOrigin(req)) {
      console.log("[auth] Create-account link refused: foreign or missing Origin");
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const link = await findCreateAccountToken(db, token);
    if (!link) {
      console.log("[auth] Create-account link refused (invalid, expired, used, or superseded)");
      res.status(400).json({ error: INVALID_LINK, code: "invalid-link" });
      return;
    }
    const account = await userByKey(link.email);
    if (!account && (req.body?.acceptedTerms !== true || req.body?.termsVersion !== TERMS_VERSION)) {
      console.log("[legal] Create-account refused: terms not accepted");
      res.status(400).json({
        error:
          req.body?.acceptedTerms === true
            ? "The Terms of Service have changed. Reload the page and accept them again."
            : "Please accept the Terms of Service to create an account.",
        code: "terms-required"
      });
      return;
    }
    const limit = await consumeRateLimit(auth, RATE_LIMITED.createAccount, req.ip ?? "", config);
    if (limit.limited) {
      console.log(`[auth] Create-account rate limit hit for client ${maskIp(req.ip)}`);
      respondRateLimited(res, limit.nextAllowedAt);
      return;
    }
    if (!isAllowed(link.email, config)) {
      logRefusal("create-account", link.email);
      res.status(403).json(NOT_LAUNCHED);
      return;
    }
    if (!(await useCreateAccountToken(db, token))) {
      console.log("[auth] Create-account link refused (invalid, expired, used, or superseded)");
      res.status(400).json({ error: INVALID_LINK, code: "invalid-link" });
      return;
    }
    if (!account) {
      const authCtx = await auth.$context;
      const created = await authCtx.internalAdapter.createUser({ email: link.email, name: "", emailVerified: false });
      await recordAgreement(db, sessions, created.id);
    }
    if (await sessions.getSession(req)) await sessions.endSession(req);
    let target: string | null = null;
    try {
      target = await completeSignIn(req, res, await mintLoginToken(account?.email ?? link.email), link.stay, link.pid);
    } catch {
      target = null;
    }
    if (!target) {
      console.log(`[auth] Create-account sign-in could not be completed for ${mailer.maskAddress(link.email)}`);
      res.status(500).json({ error: "Something went wrong, please try again later" });
      return;
    }
    console.log(`[auth] Account created from link for ${mailer.maskAddress(link.email)} (${account ? "existing account" : "new account"})`);
    res.json({ redirect: target });
  }

  // GET /api/auth/create-account/link-info?token=…: the token card's facts; writes nothing.
  router.get(
    "/api/auth/create-account/link-info",
    nativeOnly,
    wrap(async (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      const token = typeof req.query.token === "string" ? req.query.token : "";
      const link = await findCreateAccountToken(db, token);
      if (!link) {
        res.status(404).json({ error: INVALID_LINK, code: "invalid-link" });
        return;
      }
      res.json({
        email: mailer.maskAddress(link.email),
        hasAccount: Boolean(await userByKey(link.email)),
        termsVersion: TERMS_VERSION
      });
    })
  );

  // POST /api/auth/create-account (FR-001)
  router.post(
    "/api/auth/create-account",
    nativeOnly,
    wrap(async (req, res) => {
      if (honeypotFilled(req)) {
        res.json({ message: "Check your inbox" });
        return;
      }
      if (typeof req.body?.token === "string" && req.body.token) {
        await createAccountFromLink(req, res, req.body.token);
        return;
      }
      const email = parseEmail(req.body?.email);
      if (!email) {
        res.status(400).json({ error: "Please enter a valid email address (max 200 characters)." });
        return;
      }
      if (req.body?.acceptedTerms !== true || req.body?.termsVersion !== TERMS_VERSION) {
        console.log("[legal] Create-account refused: terms not accepted");
        res.status(400).json({
          error: req.body?.acceptedTerms === true
            ? "The Terms of Service have changed. Reload the page and accept them again."
            : "Please accept the Terms of Service to create an account.",
          code: "terms-required"
        });
        return;
      }
      const limit = await consumeRateLimit(auth, RATE_LIMITED.createAccount, req.ip ?? "", config);
      if (limit.limited) {
        console.log(`[auth] Create-account rate limit hit for client ${maskIp(req.ip)}`);
        respondRateLimited(res, limit.nextAllowedAt);
        return;
      }
      if (!isAllowed(email, config)) {
        logRefusal("create-account", email);
        res.status(403).json(NOT_LAUNCHED);
        return;
      }
      try {
        const existing = await userByKey(email);
        let accountId = existing?.id;
        if (existing) {
          // Same response as a fresh signup (account-existence privacy);
          // an existing account, matched by its email key, gets a normal login link.
          console.log(`[auth] Create-account for existing address ${mailer.maskAddress(email)} — sending login link`);
        } else {
          const authCtx = await auth.$context;
          accountId = (await authCtx.internalAdapter.createUser({ email, name: "", emailVerified: false })).id;
          console.log(`[auth] Created pending account for ${mailer.maskAddress(email)}`);
        }
        await recordAgreement(db, sessions, accountId!);
        await issueLoginLink(req, res, existing?.email ?? email, false, parsePid(req.body?.pid));
      } catch (err) {
        if (err instanceof mailer.MailError) {
          respondMailFailure(res);
          return;
        }
        throw err;
      }
      res.json({ message: "Check your inbox" });
    })
  );

  // POST /api/auth/request-login-link (FR-002, FR-004a)
  router.post(
    "/api/auth/request-login-link",
    nativeOnly,
    wrap(async (req, res) => {
      if (honeypotFilled(req)) {
        res.json({ message: "Check your inbox" });
        return;
      }
      const email = parseEmail(req.body?.email);
      if (!email) {
        res.status(400).json({ error: "Please enter a valid email address (max 200 characters)." });
        return;
      }
      const stay = req.body?.staySignedIn === true;
      const limit = await consumeRateLimit(auth, RATE_LIMITED.requestLoginLink, req.ip ?? "", config);
      if (limit.limited) {
        console.log(`[auth] Login-link rate limit hit for client ${maskIp(req.ip)}`);
        respondRateLimited(res, limit.nextAllowedAt);
        return;
      }
      if (!isAllowed(email, config)) {
        logRefusal("login", email);
        res.status(403).json(NOT_LAUNCHED);
        return;
      }
      try {
        const existing = await userIdByEmail(email);
        if (existing) {
          await issueLoginLink(req, res, email, stay, parsePid(req.body?.pid));
          console.log(`[auth] Login link sent to ${mailer.maskAddress(email)}`);
        } else {
          // Never reveal whether an address is registered: identical response,
          // but the inbox gets a one-time link that creates the account instead.
          const pid = parsePid(req.body?.pid);
          const token = await issueCreateAccountToken(db, { email, pid, stay });
          await mailer.sendCreateAccountInvitation(
            email,
            `${requestOrigin(req)}/create-account?token=${token}${pid ? `&PID=${pid}` : ""}`
          );
          console.log(`[auth] Login link requested for unknown address ${mailer.maskAddress(email)} — invitation sent`);
        }
      } catch (err) {
        if (err instanceof mailer.MailError) {
          respondMailFailure(res);
          return;
        }
        throw err;
      }
      res.json({ message: "Check your inbox" });
    })
  );

  /**
   * Consume a sign-in token and shape the session cookie (FR-003/004, FR-006, FR-007a).
   * Shared by the verify link's fast path and the confirmation page (R9).
   */
  async function completeSignIn(
    req: Request,
    res: Response,
    token: string,
    stay: boolean,
    pid: string | null
  ): Promise<string | null> {
    // Direct server API call: consumes the token atomically and runs the
    // session hook (other sessions revoked, account activated) without
    // touching the request-rate limiter — verification clicks are not
    // email-sending requests (FR-004a scope).
    const verifyResponse = await auth.api.magicLinkVerify({
      query: { token, callbackURL: "/" },
      headers: new Headers({ "x-forwarded-for": req.ip ?? "" }),
      asResponse: true
    });
    const setCookies = verifyResponse.headers.getSetCookie();
    const sessionCookie = setCookies.find((c) => c.startsWith("session_token="));
    const location = verifyResponse.headers.get("location") ?? "";
    if (!sessionCookie || new URL(location, "http://localhost").searchParams.has("error")) {
      console.log("[auth] Login link refused (invalid, expired, used, or superseded)");
      return null;
    }

    // Shape persistence to the user's stay-signed-in choice (FR-006):
    // persistent cookie + extended server expiry when chosen, otherwise a
    // browser-session cookie backed by the 24h server-side session.
    const attrs = sessionCookie
      .split(";")
      .map((p) => p.trim())
      .filter((p) => !/^(max-age|expires)=/i.test(p));
    if (stay) {
      const maxAgeSeconds = Math.floor(config.signinCookieDurationMaxMs / 1000);
      attrs.push(`Max-Age=${maxAgeSeconds}`);
      const rawSessionToken = decodeURIComponent(
        sessionCookie.slice("session_token=".length).split(";")[0]!
      ).split(".")[0]!;
      await db
        .updateTable("session")
        .set({ expiresAt: new Date(Date.now() + config.signinCookieDurationMaxMs) })
        .where("token", "=", rawSessionToken)
        .execute();
    }
    res.setHeader("Set-Cookie", [attrs.join("; "), bindingCookie("", 0)]);
    console.log(`[auth] Sign-in completed (staySignedIn=${stay})`);
    return pid ? `/?PID=${pid}` : "/";
  }

  /** The account and request time of an unused, unexpired sign-in link; reads only (A5). */
  async function pendingLink(token: string): Promise<{ email: string; requestedAt: Date } | null> {
    if (!token) return null;
    const row = await db
      .selectFrom("verification")
      .select(["value", "createdAt", "expiresAt"])
      .where("identifier", "=", hashToken(token))
      .executeTakeFirst();
    if (!row || new Date(row.expiresAt).getTime() <= Date.now()) return null;
    try {
      const value = JSON.parse(row.value) as { email?: unknown };
      return typeof value.email === "string"
        ? { email: value.email, requestedAt: new Date(row.createdAt ?? Date.now()) }
        : null;
    } catch {
      return null;
    }
  }

  // GET /api/auth/verify?token=…&stay=0|1[&PID=…][&bind=…] (A4, R9)
  router.get(
    "/api/auth/verify",
    nativeOnly,
    wrap(async (req, res) => {
      const token = typeof req.query.token === "string" ? req.query.token : "";
      const stay = req.query.stay === "1";
      const pid = parsePid(req.query.PID);
      const bind = typeof req.query.bind === "string" ? req.query.bind : "";
      const binding = bindingFrom(req);
      if (config.allowedEmailKeys) {
        const link = await pendingLink(token);
        if (link && !isAllowed(link.email, config)) {
          logRefusal("session", link.email);
          res.redirect(notLaunchedPath(pid));
          return;
        }
      }
      if (token && bind && binding && hashToken(binding) === bind) {
        const target = await completeSignIn(req, res, token, stay, pid);
        res.redirect(target ?? invalidLinkPath(pid));
        return;
      }
      if (!(await pendingLink(token))) {
        console.log("[auth] Login link refused (invalid, expired, used, or superseded)");
        res.redirect(invalidLinkPath(pid));
        return;
      }
      console.log("[auth] Login link opened without its binding; asking for confirmation");
      const query = new URLSearchParams({ token, stay: stay ? "1" : "0" });
      if (pid) query.set("PID", pid);
      res.redirect(`/confirm-signin?${query.toString()}`);
    })
  );

  // GET /api/auth/link-info?token=… (A5)
  router.get(
    "/api/auth/link-info",
    nativeOnly,
    wrap(async (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      const link = await pendingLink(typeof req.query.token === "string" ? req.query.token : "");
      if (!link) {
        res.status(404).json({ error: INVALID_LINK });
        return;
      }
      res.json({ email: link.email, requestedAt: link.requestedAt.toISOString() });
    })
  );

  // POST /api/auth/confirm-signin (A6): the same-origin check stops another
  // site signing a visitor into an account of its choosing.
  router.post(
    "/api/auth/confirm-signin",
    nativeOnly,
    wrap(async (req, res) => {
      if (req.get("origin") !== requestOrigin(req)) {
        console.log("[auth] Confirm-signin refused: foreign or missing Origin");
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const token = typeof req.body?.token === "string" ? req.body.token : "";
      const pid = parsePid(req.body?.pid);
      if (config.allowedEmailKeys) {
        const link = await pendingLink(token);
        if (link && !isAllowed(link.email, config)) {
          logRefusal("session", link.email);
          res.status(403).json({ ...NOT_LAUNCHED, redirect: notLaunchedPath(pid) });
          return;
        }
      }
      const target = token ? await completeSignIn(req, res, token, req.body?.stay === true, pid) : null;
      if (!target) {
        res.status(400).json({ error: INVALID_LINK, redirect: invalidLinkPath(pid) });
        return;
      }
      res.json({ redirect: target });
    })
  );

  // GET /api/invitations/link-info?PID=…&token=… (A2): the confirmation card's facts; writes nothing.
  router.get(
    "/api/invitations/link-info",
    nativeOnly,
    wrap(async (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      const pid = parsePid(req.query.PID);
      const token = typeof req.query.token === "string" ? req.query.token : "";
      const link = pid ? await findSignInToken(db, pid, token) : null;
      if (!link) {
        res.status(404).json({ error: "invalid-invitation", redirect: pid ? `/?PID=${pid}` : "/login?error=invalid-link" });
        return;
      }
      const session = await sessions.getSession(req);
      const signedInAs =
        session && emailKeyOf(session.user.email) !== emailKeyOf(link.email) ? mailer.maskAddress(session.user.email) : null;
      res.json({
        email: mailer.maskAddress(link.email),
        hasAccount: Boolean(await userByKey(link.email)),
        signedInAs,
        termsVersion: TERMS_VERSION,
        staySignedInDefault: config.staySignedInDefault,
        providers: Object.keys(config.oauthProviders)
      });
    })
  );

  // POST /api/invitations/redeem (A3): Continue on the confirmation card, in the order of research R6.
  router.post(
    "/api/invitations/redeem",
    nativeOnly,
    wrap(async (req, res) => {
      if (req.get("origin") !== requestOrigin(req)) {
        console.log("[invite] Redeem refused: foreign or missing Origin");
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const pid = parsePid(req.body?.pid);
      const token = typeof req.body?.token === "string" ? req.body.token : "";
      const link = pid ? await findSignInToken(db, pid, token) : null;
      if (!pid || !link) {
        console.log("[invite] Redeem of a link that cannot sign in");
        res.json({ redirect: pid ? `/?PID=${pid}` : "/" });
        return;
      }
      const account = await userByKey(link.email);
      if (!account && (req.body?.acceptedTerms !== true || req.body?.termsVersion !== TERMS_VERSION)) {
        console.log("[invite] Redeem refused: terms not accepted");
        res.status(400).json({
          error:
            req.body?.acceptedTerms === true
              ? "The Terms of Service have changed. Reload the page and accept them again."
              : "Please accept the Terms of Service to create an account.",
          code: "terms-required"
        });
        return;
      }
      const limit = await consumeRateLimit(auth, RATE_LIMITED.redeemInvitation, req.ip ?? "", config);
      if (limit.limited) {
        console.log(`[invite] Redeem rate limit hit for client ${maskIp(req.ip)}`);
        respondRateLimited(res, limit.nextAllowedAt);
        return;
      }
      if (!isAllowed(link.email, config)) {
        logRefusal("redeem-invitation", link.email);
        res.status(403).json({ ...NOT_LAUNCHED, redirect: notLaunchedPath(pid) });
        return;
      }
      const session = await sessions.getSession(req);
      if (session && emailKeyOf(session.user.email) !== emailKeyOf(link.email)) {
        if (req.body?.signOut !== true) {
          console.log("[invite] Redeem refused: signed in as another account");
          res.status(409).json({ error: "Signed in as another account.", code: "other-account" });
          return;
        }
        await sessions.endSession(req);
      }
      if (!account) {
        const authCtx = await auth.$context;
        const created = await authCtx.internalAdapter.createUser({ email: link.email, name: "", emailVerified: false });
        await recordAgreement(db, sessions, created.id);
      }
      let minted: string;
      try {
        minted = await mintLoginToken(account?.email ?? link.email);
      } catch {
        console.log(`[invite] Sign-in could not be completed for ${mailer.maskAddress(link.email)}`);
        res.status(500).json({ error: "Something went wrong, please try again later" });
        return;
      }
      if (!(await useToken(db, pid, token))) {
        console.log("[invite] Redeem of a link that cannot sign in");
        res.json({ redirect: `/?PID=${pid}` });
        return;
      }
      const target = await completeSignIn(req, res, minted, req.body?.stay === true, pid);
      if (!target) {
        console.log(`[invite] Sign-in could not be completed for ${mailer.maskAddress(link.email)}`);
        res.status(500).json({ error: "Something went wrong, please try again later" });
        return;
      }
      console.log(`[invite] Invitation redeemed for ${mailer.maskAddress(link.email)} (${account ? "existing account" : "new account"})`);
      res.json({ redirect: target });
    })
  );

  // POST /api/auth/logout (FR-007)
  router.post(
    "/api/auth/logout",
    wrap(async (req, res) => {
      const session = await sessions.getSession(req);
      if (!session) {
        res.status(401).json({ error: "Not signed in" });
        return;
      }
      const clearCookie = await sessions.endSession(req);
      if (clearCookie) res.setHeader("Set-Cookie", clearCookie);
      console.log(`[auth] User ${session.user.id} logged out`);
      res.status(204).end();
    })
  );

  // GET /api/me (FR-014–017 support; contract "Profile"); the one request a page load costs.
  router.get(
    "/api/me",
    pageLoads,
    wrap(async (req, res) => {
      const session = await sessions.getSession(req);
      if (!session) {
        res.status(401).json({ error: "Not signed in" });
        return;
      }
      const user = session.user as typeof session.user & {
        userName?: string;
        profileAvatar?: string;
        status?: string;
      };
      res.json({
        userName: user.userName,
        // OAuth mode: provider-supplied, read-only (not editable via PATCH).
        emailAddress: user.email,
        profileAvatar: user.profileAvatar,
        status: user.status,
        // 012 T081 (FR-049/FR-052): a rendering hint for the avatar menu, produced by
        // the same predicate that gates every admin route — never an authorization
        // decision. Forging it in devtools reveals a menu entry whose target still
        // returns 403. Guests never see it at all: this route 401s them above.
        isAdmin: isAdminEmail(user.email, config),
        permissions: effectivePermissions(user as Caller, config),
        termsAccepted: hasAcceptedTerms(session),
        termsFirstAcceptance: !(session.user as { termsVersion?: string | null }).termsVersion
      });
    })
  );

  // DELETE /api/me (A8)
  router.delete(
    "/api/me",
    wrap(async (req, res) => {
      if (req.get("origin") !== requestOrigin(req)) {
        console.log("[account] Delete refused: foreign or missing Origin");
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const session = await sessions.getSession(req);
      if (!session) {
        res.status(401).json({ error: "Not signed in" });
        return;
      }
      if (req.body?.confirm !== "DELETE") {
        res.status(400).json({ error: "Type DELETE to confirm." });
        return;
      }
      const address = session.user.email;
      let deletion;
      try {
        deletion = await deleteAccount({ db, cache }, { id: session.user.id, email: address });
      } catch (err) {
        console.error(`[account] Could not delete the account for ${mailer.maskAddress(address)}:`, err);
        res.status(500).json({ error: "Your account could not be deleted. Nothing was changed; please try again." });
        return;
      }
      console.log(
        `[account] Deleted account for ${mailer.maskAddress(address)}: ${deletion.pollsDeleted} poll(s) deleted, ${deletion.votesAnonymized} vote(s) anonymized`
      );
      res.setHeader("Set-Cookie", "session_token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax");
      try {
        await mailer.sendAccountDeleted(requestOrigin(req), address);
      } catch (err) {
        console.error(`[account] Could not send the deletion notice to ${mailer.maskAddress(address)}:`, err);
      }
      res.json({ redirect: "/" });
    })
  );

  // POST /api/legal/accept-terms (A7)
  router.post(
    "/api/legal/accept-terms",
    wrap(async (req, res) => {
      if (req.get("origin") !== requestOrigin(req)) {
        console.log("[legal] Accept-terms refused: foreign or missing Origin");
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const session = await sessions.getSession(req);
      if (!session) {
        res.status(401).json({ error: "Not signed in" });
        return;
      }
      if (req.body?.termsVersion !== TERMS_VERSION) {
        res.status(400).json({ error: "The Terms of Service have changed. Reload the page and accept them again.", code: "terms-required" });
        return;
      }
      await recordAgreement(db, sessions, session.user.id);
      console.log(`[legal] Terms ${TERMS_VERSION} accepted by user ${session.user.id}`);
      res.json({ redirect: safeNext(req.body?.next) });
    })
  );

  // PATCH /api/me — edit userName (FR-013)
  router.patch(
    "/api/me",
    wrap(async (req, res) => {
      const session = await sessions.getSession(req);
      if (!session) {
        res.status(401).json({ error: "Not signed in" });
        return;
      }
      const userName = typeof req.body?.userName === "string" ? req.body.userName.trim() : "";
      if (userName.length === 0 || userName.length > USERNAME_MAX) {
        res.status(400).json({
          error: `Please enter a userName between 1 and ${USERNAME_MAX} characters.`
        });
        return;
      }
      try {
        // The unique index on lower("userName") is the single source of truth for
        // name collisions; the rename also reaches every poll the user created.
        await db.transaction().execute(async (trx) => {
          await trx
            .updateTable("user")
            .set({ userName, updatedAt: new Date() })
            .where("id", "=", session.user.id)
            .execute();
          const created = await trx
            .updateTable("polls")
            .set({ created_by_name: userName })
            .where("created_by_id", "=", session.user.id)
            .returning("id")
            .execute();
          for (const { id } of created) await bumpContentVersion(trx, cache, id);
        });
      } catch (err) {
        if (err instanceof Error && "code" in err && (err as { code: unknown }).code === "23505") {
          res.status(409).json({ error: "That userName is already in use." });
          return;
        }
        throw err;
      }
      await sessions.forgetUserSessions(session.user.id);
      console.log(`[profile] User ${session.user.id} renamed to "${userName}"`);
      const user = session.user as typeof session.user & {
        profileAvatar?: string;
        status?: string;
      };
      res.json({
        userName,
        emailAddress: user.email,
        profileAvatar: user.profileAvatar,
        status: user.status
      });
    })
  );

  // POST /api/me/email-change (FR-013a–c; native mode only)
  router.post(
    "/api/me/email-change",
    nativeOnly,
    wrap(async (req, res) => {
      if (!config.nativeSignin) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const session = await sessions.getSession(req);
      if (!session) {
        res.status(401).json({ error: "Not signed in" });
        return;
      }
      if (honeypotFilled(req)) {
        res.status(202).json({ message: "Verification sent to new address" });
        return;
      }
      const newEmail = parseEmail(req.body?.newEmail);
      if (!newEmail) {
        res.status(400).json({ error: "Please enter a valid email address (max 200 characters)." });
        return;
      }
      const oldEmail = session.user.email.toLowerCase();
      if (newEmail === oldEmail) {
        res.status(400).json({ error: "That is already this account's email address." });
        return;
      }
      if (await userByKey(newEmail, session.user.id)) {
        res.status(409).json({ error: "That email address is already in use." });
        return;
      }
      const limit = await consumeRateLimit(auth, RATE_LIMITED.emailChangeRequest, req.ip ?? "", config);
      if (limit.limited) {
        console.log(`[profile] Email-change rate limit hit for client ${maskIp(req.ip)}`);
        respondRateLimited(res, limit.nextAllowedAt);
        return;
      }
      if (!isAllowed(newEmail, config)) {
        logRefusal("email-change", newEmail);
        res.status(403).json(NOT_LAUNCHED);
        return;
      }

      const userId = session.user.id;

      // Newer request supersedes older (FR-013a): drop the pending request
      // and its verification token before issuing a new one.
      const prior = await db
        .selectFrom("email_change_requests")
        .select("token_hash")
        .where("user_id", "=", userId)
        .execute();
      if (prior.length > 0) {
        await db
          .deleteFrom("verification")
          .where("identifier", "in", prior.map((p) => p.token_hash))
          .execute();
        await db.deleteFrom("email_change_requests").where("user_id", "=", userId).execute();
      }

      const token = randomBytes(24).toString("base64url");
      const tokenHash = hashToken(token);
      const authCtx = await auth.$context;
      await authCtx.internalAdapter.createVerificationValue({
        identifier: tokenHash,
        value: JSON.stringify({
          purpose: "email-change",
          userId: session.user.id,
          newEmail,
          oldEmail
        }),
        expiresAt: new Date(Date.now() + LINK_EXPIRY_SECONDS * 1000)
      });
      await db
        .insertInto("email_change_requests")
        .values({ user_id: userId, new_email: newEmail, old_email: oldEmail, token_hash: tokenHash, created_at: new Date() })
        .execute();

      try {
        await mailer.sendEmailChangeVerification(
          newEmail,
          `${requestOrigin(req)}/api/me/email-change/verify?token=${encodeURIComponent(token)}`
        );
      } catch (err) {
        if (err instanceof mailer.MailError) {
          respondMailFailure(res);
          return;
        }
        throw err;
      }
      console.log(`[profile] Email-change verification sent for user ${session.user.id}`);
      res.status(202).json({ message: "Verification sent to new address" });
    })
  );

  // GET /api/me/email-change/verify?token=… — self-contained, no session
  // required (FR-013a); re-checks uniqueness at consume, notifies the old
  // address on completion (FR-013d).
  router.get(
    "/api/me/email-change/verify",
    nativeOnly,
    wrap(async (req, res) => {
      const fail = () => {
        console.log("[profile] Email-change link refused (invalid, expired, used, or superseded)");
        res.redirect("/profile?error=invalid-link");
      };
      const token = typeof req.query.token === "string" ? req.query.token : "";
      if (!token) {
        fail();
        return;
      }
      const authCtx = await auth.$context;
      const consumed = await authCtx.internalAdapter.consumeVerificationValue(hashToken(token));
      if (!consumed) {
        fail();
        return;
      }
      let change: { purpose?: string; userId?: string; newEmail?: string; oldEmail?: string };
      try {
        change = JSON.parse(consumed.value);
      } catch {
        fail();
        return;
      }
      if (change.purpose !== "email-change" || !change.userId || !change.newEmail || !change.oldEmail) {
        fail();
        return;
      }
      if (!isAllowed(change.newEmail, config)) {
        logRefusal("email-change", change.newEmail);
        res.redirect("/profile?error=not-launched");
        return;
      }
      // Two accounts can race for the same new address; the first verified
      // change wins (spec edge case).
      if (await userByKey(change.newEmail, change.userId)) {
        console.log("[profile] Email-change refused at consume: address now in use");
        res.redirect("/profile?error=invalid-link");
        return;
      }
      await authCtx.internalAdapter.updateUser(change.userId, { email: change.newEmail });
      await db.deleteFrom("email_change_requests").where("user_id", "=", change.userId).execute();
      await sessions.forgetUserSessions(change.userId);
      console.log(`[profile] Email address changed for user ${change.userId}`);
      try {
        await mailer.sendEmailChangeNotice(requestOrigin(req), change.oldEmail, change.newEmail);
      } catch (err) {
        // The change is already committed; a failed notice must not undo it.
        console.error("[profile] Could not send change notice to old address:", err);
      }
      res.redirect("/profile?changed=1");
    })
  );

  return router;
}
