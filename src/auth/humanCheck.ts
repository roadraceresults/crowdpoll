import type { NextFunction, Request, RequestHandler, Response as ExpressResponse } from "express";
import { maskIp } from "./maskIp.js";
import type { HumanCheckConfig } from "../config.js";

export const HUMAN_CHECK_ACTIONS = ["login", "create-account", "invite"] as const;
export type HumanCheckAction = (typeof HUMAN_CHECK_ACTIONS)[number];

export type HumanCheckOutcome = "valid" | "invalid" | "unreachable";

export interface HumanCheck {
  verify(token: string, accepted: readonly HumanCheckAction[], clientIp: string | undefined): Promise<HumanCheckOutcome>;
  isReachable(): Promise<boolean>;
}

export interface HumanCheckOptions {
  /** Send the client address so FCaptcha refuses a pass presented from another address. */
  bindToClientAddress?: boolean;
}

const VERIFY_TIMEOUT_MS = 3_000;
const HEALTH_TIMEOUT_MS = 1_000;

/** App Platform's edge sets do-connecting-ip; `req.ip` reads a forwardable X-Forwarded-For. */
export function clientAddressOf(req: Request): string | undefined {
  const header = req.get("do-connecting-ip")?.trim();
  return header || req.ip;
}

// Token check: https://github.com/WebDecoy/FCaptcha/blob/main/INSTALLATION.md (server-side token verification).
export function createHumanCheck(
  settings: HumanCheckConfig,
  publicOrigin: string,
  fetchImpl: typeof fetch = fetch,
  { bindToClientAddress = false }: HumanCheckOptions = {}
): HumanCheck {
  const expectedHostname = new URL(publicOrigin).hostname;
  return {
    async verify(token, accepted, clientIp) {
      let response: Response;
      try {
        response = await fetchImpl(`${settings.url}/api/token/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            secret: settings.verifySecret,
            ...(bindToClientAddress && clientIp ? { remoteip: clientIp } : {})
          }),
          signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS)
        });
      } catch {
        return "unreachable";
      }
      if (response.status >= 500) return "unreachable";
      if (response.status !== 200) return "invalid";
      let answer: { valid?: unknown; hostname?: unknown; action?: unknown };
      try {
        answer = (await response.json()) as typeof answer;
      } catch {
        return "unreachable";
      }
      if (answer.valid !== true || answer.hostname !== expectedHostname) return "invalid";
      // FCaptcha's checkbox widget mints passes without an action; one that carries an action must match.
      const action = typeof answer.action === "string" ? answer.action : "";
      if (action !== "" && !(accepted as readonly string[]).includes(action)) return "invalid";
      return "valid";
    },
    async isReachable() {
      try {
        const response = await fetchImpl(`${settings.url}/health`, { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
        return response.ok;
      } catch {
        return false;
      }
    }
  };
}

export interface HumanCheckGuardDeps {
  /** Read on every request, so a context built later (or by a test) takes effect. */
  humanCheck: HumanCheck | null;
  abuse: { humanCheckSkipped: number };
}

export const HUMAN_CHECK_HEADER = "X-Human-Check";

/**
 * Refuses a sign-in start that carries no good pass. When FCaptcha cannot be reached the request goes on
 * under the route's own limits, and the skip is counted for /healthz.
 */
export function requireHumanCheck(deps: HumanCheckGuardDeps, accepted: readonly HumanCheckAction[]): RequestHandler {
  return (req: Request, res: ExpressResponse, next: NextFunction) => {
    const humanCheck = deps.humanCheck;
    if (!humanCheck) {
      next();
      return;
    }
    const clientIp = clientAddressOf(req);
    const token = req.get(HUMAN_CHECK_HEADER)?.trim();
    const outcome: Promise<HumanCheckOutcome> = token
      ? humanCheck.verify(token, accepted, clientIp)
      : humanCheck.isReachable().then((up) => (up ? "invalid" : "unreachable"));
    outcome.then(
      (result) => {
        if (result === "valid") {
          next();
          return;
        }
        if (result === "unreachable") {
          deps.abuse.humanCheckSkipped += 1;
          console.log(`[human-check] Skipped: service unreachable (${maskIp(clientIp)})`);
          next();
          return;
        }
        console.log(`[human-check] Refused ${req.path} (${maskIp(clientIp)})`);
        res.status(400).json({ error: "Please complete the human check.", code: "challenge-required" });
      },
      (err: unknown) => next(err)
    );
  };
}
