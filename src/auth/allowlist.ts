import type { AppConfig } from "../config.js";
import { maskAddress } from "../email/mailer.js";
import { emailKeyOf } from "./emailKey.js";

export const NOT_LAUNCHED_MESSAGE =
  "CrowdPoll hasn't launched yet. For now, accounts are open to invited testers only.";

export const NOT_LAUNCHED = { error: NOT_LAUNCHED_MESSAGE, code: "not-launched" } as const;

export type RefusalPath = "create-account" | "login" | "email-change" | "session" | "redeem-invitation";

export function isAllowed(email: string, config: AppConfig): boolean {
  if (!config.allowlist) return true;
  const address = email.trim().toLowerCase();
  if (config.admins.includes(address)) return true;
  const key = emailKeyOf(address);
  return config.allowlist.keys.has(key) || config.allowlist.patterns.some((pattern) => pattern.test(key));
}

export function allowlistStatus(config: AppConfig): string {
  if (!config.allowlist) return "[auth] Sign-up allowlist off";
  const addresses = config.allowlist.keys.size;
  const patterns = config.allowlist.patterns.length;
  const parts = [
    ...(addresses ? [`${addresses} addresses`] : []),
    ...(patterns ? [`${patterns} ${patterns === 1 ? "pattern" : "patterns"}`] : [])
  ];
  const admins = config.admins.length;
  const adminNote = admins ? `; ${admins} ${admins === 1 ? "administrator" : "administrators"} always allowed` : "";
  return `[auth] Sign-up allowlist on (${parts.join(", ")}${adminNote})`;
}

export function logRefusal(path: RefusalPath, email: string): void {
  console.log(`[auth] Not launched: ${path} refused for ${maskAddress(email)}`);
}
