/**
 * Apple's client secret is a JWT that CrowdPoll signs itself with its Sign in with Apple key (research R5).
 * Apple accepts one for at most six months, so it is signed at start-up and again every 30 days.
 */
import { createSign } from "node:crypto";
import type { AppleSignin } from "../config.js";

export const APPLE_SECRET_LIFETIME_SECONDS = 180 * 24 * 60 * 60;
export const APPLE_SECRET_REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

const base64url = (value: object): string => Buffer.from(JSON.stringify(value)).toString("base64url");

export function appleClientSecret(settings: AppleSignin, now: Date = new Date()): string {
  const iat = Math.floor(now.getTime() / 1000);
  const input = `${base64url({ alg: "ES256", kid: settings.keyId })}.${base64url({
    iss: settings.teamId,
    iat,
    exp: iat + APPLE_SECRET_LIFETIME_SECONDS,
    aud: "https://appleid.apple.com",
    sub: settings.clientId
  })}`;
  const signature = createSign("SHA256").update(input).sign({ key: settings.privateKey, dsaEncoding: "ieee-p1363" });
  return `${input}.${signature.toString("base64url")}`;
}

export function appleSecretExpiry(now: Date = new Date()): Date {
  return new Date(Math.floor(now.getTime() / 1000) * 1000 + APPLE_SECRET_LIFETIME_SECONDS * 1000);
}

export function logAppleSecretExpiry(now: Date = new Date()): void {
  console.log(`[auth] Apple client secret valid until ${appleSecretExpiry(now).toISOString().slice(0, 10)}`);
}

/** Re-signs the secret into the Apple provider's options every 30 days; returns a stop function. */
export function startAppleSecretRefresh(
  options: { clientSecret: string },
  settings: AppleSignin,
  intervalMs: number = APPLE_SECRET_REFRESH_MS
): () => void {
  const timer = setInterval(() => {
    const now = new Date();
    options.clientSecret = appleClientSecret(settings, now);
    logAppleSecretExpiry(now);
  }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
