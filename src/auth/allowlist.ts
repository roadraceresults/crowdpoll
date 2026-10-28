import type { AppConfig } from "../config.js";
import { maskAddress } from "../email/mailer.js";
import { emailKeyOf } from "./emailKey.js";

export const NOT_LAUNCHED_MESSAGE =
  "CrowdPoll hasn't launched yet. For now, accounts are open to invited testers only.";

export const NOT_LAUNCHED = { error: NOT_LAUNCHED_MESSAGE, code: "not-launched" } as const;

export type RefusalPath = "create-account" | "login" | "email-change" | "session" | "redeem-invitation";

export function isAllowed(email: string, config: AppConfig): boolean {
  if (!config.allowedEmailKeys) return true;
  const address = email.trim().toLowerCase();
  return config.admins.includes(address) || config.allowedEmailKeys.has(emailKeyOf(address));
}

export function allowlistStatus(config: AppConfig): string {
  const size = config.allowedEmailKeys?.size;
  return size ? `[auth] Sign-up allowlist on (${size} addresses)` : "[auth] Sign-up allowlist off";
}

export function logRefusal(path: RefusalPath, email: string): void {
  console.log(`[auth] Not launched: ${path} refused for ${maskAddress(email)}`);
}
