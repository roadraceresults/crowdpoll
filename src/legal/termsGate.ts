import type { RequestHandler } from "express";
import { sessionTokenOf, type Session, type SessionCache } from "../auth/sessionCache.js";
import { TERMS_VERSION } from "./version.js";

export const TERMS_REQUIRED = { error: "Please accept the updated Terms of Service.", code: "terms-required" } as const;

const PAGE_ROUTES = new Set(["/", "/login", "/create-account", "/confirm-signin", "/invite", "/profile", "/admin", "/admin/poll/results"]);

const ALLOWED_API = new Set([
  "POST /api/legal/accept-terms",
  "POST /api/auth/logout",
  "GET /api/me",
  "GET /api/config",
  "POST /api/auth/create-account",
  "GET /api/auth/create-account/link-info",
  "POST /api/auth/request-login-link",
  "GET /api/auth/verify",
  "POST /api/auth/confirm-signin",
  "GET /api/auth/link-info",
  "GET /api/invitations/link-info",
  "POST /api/invitations/redeem",
  "GET /api/me/email-change/verify"
]);

export function hasAcceptedTerms(session: Session): boolean {
  return (session.user as { termsVersion?: string | null }).termsVersion === TERMS_VERSION;
}

export function safeNext(raw: unknown): string {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//") || /[\\\u0000-\u001f]/.test(raw)) return "/";
  return raw;
}

export function createTermsGate({ sessions }: { sessions: SessionCache }): RequestHandler {
  return (req, res, next) => {
    if (!sessionTokenOf(req)) {
      next();
      return;
    }
    const isApi = req.path.startsWith("/api/");
    const isPage = req.method === "GET" && PAGE_ROUTES.has(req.path);
    if ((!isApi && !isPage) || ALLOWED_API.has(`${req.method} ${req.path}`)) {
      next();
      return;
    }
    sessions
      .getSession(req)
      .then((session) => {
        if (!session || hasAcceptedTerms(session)) {
          next();
          return;
        }
        if (isApi) {
          res.status(403).json(TERMS_REQUIRED);
          return;
        }
        res.redirect(`/accept-terms?next=${encodeURIComponent(req.originalUrl)}`);
      })
      .catch(next);
  };
}
