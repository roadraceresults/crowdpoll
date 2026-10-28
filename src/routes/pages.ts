/**
 * HTML page routes: /, /login, /create-account, /profile (contract "Pages"),
 * plus /admin and /admin/poll/results (contracts/page-routes.md,
 * 004-realtime-poll-voting). The /profile page is guarded — guests are
 * redirected to sign in (FR-014). The /login page is guarded the other way
 * — a signed-in user is redirected home instead of ever seeing the login
 * form (FR-008/FR-009). The /admin* pages are open to administrators and poll
 * creators, and 404 on a poll PID the caller may not manage.
 */
import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AppConfig } from "../config.js";
import type { SessionCache } from "../auth/sessionCache.js";
import type { Cache } from "../cache/cache.js";
import { pollExists, type Db } from "../polls/store.js";
import { canReachAdmin, createRequireAdmin, createRequirePollOwner, type Caller } from "../polls/service.js";
import { landingUrl, parsePid, resolveSharedLink } from "../polls/sharedLink.js";
import { findSignInToken, useToken } from "../invitations/tokens.js";
import { emailKeyOf } from "../auth/emailKey.js";
import { createAssetServing } from "./assets.js";
import { hasAcceptedTerms, safeNext } from "../legal/termsGate.js";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

export interface PageDeps {
  sessions: SessionCache;
  config: AppConfig;
  db: Db;
  cache: Cache;
}

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

export function createPagesRouter({ sessions, config, db, cache }: PageDeps): Router {
  const router = Router();
  const assets = createAssetServing(publicDir, config);
  const page = (name: string, status = 200, cacheControl?: string) => assets.sendPage(name, status, cacheControl);
  /**
   * 013 FR-042: the page routes answer a refusal with a page. The API router
   * builds its own instance from the same factory and keeps JSON (FR-045) —
   * the shape is a parameter here precisely so that stays true.
   *
   * 403 is kept: the request is still refused, and a 200 would report a
   * successful load to caches, crawlers and monitoring.
   */
  const requireCreator = createRequireAdmin({
    sessions,
    config,
    allow: (user) => canReachAdmin(user, config),
    refuse: (res) => {
      console.log("[admin] Refused an unauthorised visitor");
      page("not-authorized.html", 403)(res.req, res, () => undefined);
    }
  });
  const requireOwnResults = createRequirePollOwner({
    sessions,
    config,
    db,
    pidOf: (req) => (typeof req.query.PID === "string" ? req.query.PID : ""),
    refuse: (res) => { res.status(404).send("Not found"); }
  });

  router.use("/assets", assets.fingerprinted);

  router.get(
    "/",
    wrap(async (req, res) => {
      const pid = parsePid(req.query.PID);
      if (!pid) {
        page("index.html")(req, res, () => undefined);
        return;
      }
      const session = await sessions.getSession(req);
      if (!session) {
        res.redirect(`/login?PID=${pid}`);
        return;
      }
      const landing = await resolveSharedLink({ db, config, cache }, session.user as Caller, pid);
      console.log(`[link] Poll link opened: ${landing.notice ?? landing.tab}`);
      res.redirect(landingUrl(landing));
    })
  );

  router.get("/login", (req, res, next: NextFunction) => {
    sessions
      .getSession(req)
      .then((session) => {
        if (session) {
          const pid = parsePid(req.query.PID);
          res.redirect(pid ? `/?PID=${pid}` : "/");
          return;
        }
        page("login.html")(req, res, next);
      })
      .catch(next);
  });

  router.get("/confirm-signin", (req, res, next: NextFunction) => {
    if (!config.nativeSignin) {
      res.status(404).send("Not found");
      return;
    }
    page("confirm-signin.html")(req, res, next);
  });

  // GET /invite?PID=…&token=… (A1): decided on the server, writing nothing.
  router.get(
    "/invite",
    wrap(async (req, res) => {
      if (!config.nativeSignin) {
        res.status(404).send("Not found");
        return;
      }
      const pid = parsePid(req.query.PID);
      if (!pid) {
        res.redirect((await sessions.getSession(req)) ? "/" : "/login?error=invalid-link");
        return;
      }
      const token = typeof req.query.token === "string" ? req.query.token : "";
      const link = await findSignInToken(db, pid, token);
      if (!link) {
        res.redirect(`/?PID=${pid}`);
        return;
      }
      const session = await sessions.getSession(req);
      if (session && emailKeyOf(session.user.email) === emailKeyOf(link.email)) {
        await useToken(db, pid, token);
        res.redirect(`/?PID=${pid}`);
        return;
      }
      page("invite.html", 200, "no-store")(req, res, () => undefined);
    })
  );

  router.get(
    "/create-account",
    wrap(async (req, res) => {
      // Accounts come from the provider in oauth mode (FR-019).
      if (!config.nativeSignin) {
        res.status(404).send("Not found");
        return;
      }
      const pid = parsePid(req.query.PID);
      if (pid && (await sessions.getSession(req))) {
        res.redirect(`/?PID=${pid}`);
        return;
      }
      page("create-account.html")(req, res, () => undefined);
    })
  );

  /**
   * 013 FR-002/FR-003 (contracts/page-routes.md): an email-change verification
   * link requires no session, consumes its token, and redirects here. When the
   * link opens in a browser that holds no session — the ordinary outcome for a
   * mail client's in-app browser — this guard used to redirect it to /login, so
   * the change succeeded and the confirmation was discarded.
   *
   * The relaxation is narrow, and the match is exact: a guard that accepted
   * `changed` with any value would turn one condition into an open door. The
   * relaxed branch discloses nothing — it sends a static file, /api/me still
   * answers 401 to that window, and the page renders only the result state.
   */
  function carriesVerificationResult(req: Request): boolean {
    return req.query.changed === "1" || req.query.error === "invalid-link";
  }

  router.get("/profile", (req, res, next: NextFunction) => {
    sessions
      .getSession(req)
      .then((session) => {
        if (!session) {
          if (!carriesVerificationResult(req)) {
            res.redirect("/login");
            return;
          }
          console.log("[profile] Verification result served without a session");
        }
        page("profile.html")(req, res, next);
      })
      .catch(next);
  });

  router.get(
    "/accept-terms",
    wrap(async (req, res) => {
      const session = await sessions.getSession(req);
      if (!session || hasAcceptedTerms(session)) {
        res.redirect(safeNext(req.query.next));
        return;
      }
      page("accept-terms.html")(req, res, () => undefined);
    })
  );

  // Apple checks the domain with this file; static serving skips dot-folders (research R10).
  router.get("/.well-known/apple-developer-domain-association.txt", (_req, res) => {
    const file = path.join(publicDir, ".well-known", "apple-developer-domain-association.txt");
    res.sendFile(file, { dotfiles: "allow" }, (err) => {
      if (err && !res.headersSent) res.status(404).send("Not found");
    });
  });

  router.get("/privacy", page("privacy.html"));
  router.get("/terms", page("terms.html"));

  router.get("/admin", requireCreator, page("admin.html"));

  router.get(
    "/admin/poll/results",
    requireCreator,
    requireOwnResults,
    wrap(async (req, res) => {
      const pid = typeof req.query.PID === "string" ? req.query.PID : undefined;
      const exists = pid && (await pollExists(db, pid));
      if (!exists) {
        res.status(404).send("Not found");
        return;
      }
      page("admin-results.html")(req, res, () => undefined);
    })
  );

  return router;
}
