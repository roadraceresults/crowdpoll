/**
 * BetterAuth instance (research R2, tasks T007/T008), verified against
 * better-auth@1.6.26:
 * - magic-link plugin, hashed token storage, 15-minute expiry (FR-004)
 * - Kysely/PostgreSQL adapter owns the user/session/verification/rateLimit tables
 *   (https://www.better-auth.com/docs/adapters/postgresql); session.cookieCache stays
 *   off, so besides the session cookie only the sign-in binding cookie is set (api.ts)
 * - session cookie named exactly `session_token`, httpOnly/secure/lax (FR-008/009)
 * - single-active-session + pending→active flip via session.create hook (FR-001, FR-007a)
 * - built-in rate limiter, database-backed, per-client per-endpoint custom
 *   rules of 2 requests / 15 minutes (FR-004a, FR-013c, research R5)
 */
import { betterAuth } from "better-auth";
import { genericOAuth, magicLink } from "better-auth/plugins";
import { APIError } from "better-auth/api";
import { createHash, randomUUID } from "node:crypto";
import { sql } from "kysely";
import type { Cache } from "../cache/cache.js";
import type { Db } from "../db/client.js";
import type { AppConfig } from "../config.js";
import { sessionKey } from "./sessionCache.js";
import * as mailer from "../email/mailer.js";
import { defaultUserName } from "./username.js";
import { isAllowed, logRefusal } from "./allowlist.js";
import { appleClientSecret } from "./appleSecret.js";
import { emailKey } from "./emailKey.js";
import { adoptInvitations } from "../invitations/invitations.js";

function refuseNotLaunched(email: string): never {
  logRefusal("session", email);
  throw new APIError("FORBIDDEN", { message: "not-launched", code: "not-launched" });
}

export const DEFAULT_AVATAR = "/avatar-default.svg";
export const LINK_EXPIRY_SECONDS = 15 * 60;
export const NON_PERSISTENT_SESSION_SECONDS = 24 * 60 * 60;

/**
 * The window shared by every email-sending endpoint, built from configuration.
 *
 * 012: was a hard-coded 2 requests / 15 minutes. Both halves are now settable —
 * `ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW` and
 * `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW` — because the defaults make manual
 * testing painful: two login links and you are locked out for a quarter of an hour.
 *
 * The operator sets the window in MINUTES; BetterAuth's limiter wants seconds, and
 * this is the one place that conversion happens.
 */
export function emailRateLimit(config: AppConfig): { window: number; max: number } {
  return {
    window: config.emailRateLimitWindowMinutes * 60,
    max: config.emailRateLimitMaxRequests
  };
}

/**
 * Logical endpoint paths metered by BetterAuth's built-in limiter. The
 * limiter runs before route matching, so consuming a path that no library
 * route serves still counts against that path's own per-client window.
 */
export const RATE_LIMITED = {
  createAccount: "/create-account",
  requestLoginLink: "/request-login-link",
  emailChangeRequest: "/email-change-request",
  redeemInvitation: "/redeem-invitation"
} as const;

/** Sign-in tokens minted for server-side consumption, keyed by the mint id that requested them. */
export const mintedTokens = new Map<string, string>();

export type Auth = ReturnType<typeof createAuth>;

const MICROSOFT_CONSUMER_TENANT = "9188040d-6c67-4c5b-b112-36a304b66dad";

/**
 * A provider address that shares an existing account's email key is replaced by that account's stored
 * address, so BetterAuth's exact-email lookup finds the account and links to it (research R7).
 */
function emailByKey(db: Db) {
  return async (email: unknown): Promise<{ email?: string }> => {
    if (typeof email !== "string" || email === "") return {};
    const owner = await db
      .selectFrom("user")
      .select("email")
      .where(emailKey(sql.ref("email")), "=", emailKey(email.toLowerCase()))
      .orderBy("createdAt")
      .executeTakeFirst();
    return owner ? { email: owner.email } : {};
  };
}

/**
 * A personal Microsoft account's address is verified by Microsoft; a work or school account's only when
 * the token says so (research R7).
 */
function microsoftEmailVerified(profile: Record<string, unknown>): boolean {
  if (typeof profile.email_verified === "boolean") return profile.email_verified;
  const email = profile.email;
  if (typeof email !== "string") return false;
  const listed = (claim: unknown) => Array.isArray(claim) && claim.includes(email);
  return profile.tid === MICROSOFT_CONSUMER_TENANT || listed(profile.verified_primary_email) || listed(profile.verified_secondary_email);
}

/** The configured providers (research R4); Apple's secret is signed here and re-signed by the server. */
function socialProviders(db: Db, config: AppConfig) {
  const byKey = emailByKey(db);
  const { google, apple, microsoft } = config.oauthProviders;
  return {
    ...(google && {
      google: { ...google, mapProfileToUser: (profile: { email?: string }) => byKey(profile.email) }
    }),
    ...(apple && {
      apple: {
        clientId: apple.clientId,
        clientSecret: appleClientSecret(apple),
        mapProfileToUser: (profile: { email?: string }) => byKey(profile.email)
      }
    }),
    ...(microsoft && {
      microsoft: {
        ...microsoft,
        tenantId: "common",
        disableProfilePhoto: true,
        mapProfileToUser: async (profile: Record<string, unknown>) => ({
          ...(await byKey(profile.email)),
          emailVerified: microsoftEmailVerified(profile)
        })
      }
    })
  };
}

/** Amazon has no built-in provider; Login with Amazon is plain OAuth 2.0 (research R6). */
function amazonSignin(db: Db, config: AppConfig) {
  const amazon = config.oauthProviders.amazon;
  if (!amazon) return [];
  const byKey = emailByKey(db);
  return [
    genericOAuth({
      config: [
        {
          providerId: "amazon",
          clientId: amazon.clientId,
          clientSecret: amazon.clientSecret,
          authorizationUrl: "https://www.amazon.com/ap/oa",
          tokenUrl: "https://api.amazon.com/auth/o2/token",
          scopes: ["profile"],
          getUserInfo: async (tokens) => {
            const res = await fetch("https://api.amazon.com/user/profile", {
              headers: { Authorization: `Bearer ${tokens.accessToken}` }
            });
            if (!res.ok) return null;
            const profile = (await res.json()) as { user_id?: string; name?: string; email?: string };
            const email = profile.email ?? "";
            return {
              id: profile.user_id ?? "",
              name: profile.name || email.split("@")[0] || "",
              email,
              emailVerified: true
            };
          },
          mapProfileToUser: (profile) => byKey(profile.email)
        }
      ]
    })
  ];
}

export function createAuth(db: Db, config: AppConfig, cache?: Cache) {
  const auth = betterAuth({
    appName: "NativeAuthOAuth",
    baseURL: config.publicOrigin,
    trustedOrigins: [config.publicOrigin],
    secret: config.authSecret,
    database: { db, type: "postgres" },
    account: { accountLinking: { enabled: true } },
    session: {
      // Server-side lifetime when "stay signed in" is NOT chosen; the
      // verify route extends stay-signed-in sessions to the configured max.
      expiresIn: NON_PERSISTENT_SESSION_SECONDS
    },
    user: {
      additionalFields: {
        clientId: { type: "string", required: false, input: false },
        clientSecret: { type: "string", required: false, input: false, returned: false },
        userName: { type: "string", required: false, input: false },
        profileAvatar: { type: "string", required: false, input: false },
        status: { type: "string", required: false, input: false }
      }
    },
    databaseHooks: {
      user: {
        create: {
          // Fill profile defaults (FR-011/012): system-assigned clientId /
          // clientSecret, unique userName from the email local-part (or the
          // provider-supplied name in the OAuth phase), default avatar. A provider's
          // picture is not kept: the pages load nothing from other websites.
          before: async (user) => {
            const record = user as Record<string, unknown>;
            if (typeof record.email === "string" && !isAllowed(record.email, config)) refuseNotLaunched(record.email);
            const nameSource =
              (typeof record.name === "string" && record.name.trim()) ||
              (typeof record.email === "string" ? record.email : "user");
            return {
              data: {
                ...user,
                image: null,
                clientId: randomUUID(),
                clientSecret: randomUUID(),
                userName: await defaultUserName(db, nameSource),
                profileAvatar: DEFAULT_AVATAR,
                status: "pending"
              }
            };
          }
        }
      },
      session: {
        create: {
          // Single active session (FR-007a): a new sign-in — native or OAuth —
          // revokes every other session first. First successful sign-in also
          // activates a pending account (FR-001).
          before: async (session) => {
            const userId = String(session.userId);
            if (config.allowedEmailKeys) {
              const owner = await db.selectFrom("user").select("email").where("id", "=", userId).executeTakeFirst();
              if (owner && !isAllowed(owner.email, config)) refuseNotLaunched(owner.email);
            }
            const revoked = await db.deleteFrom("session").where("userId", "=", userId).returning("token").execute();
            if (revoked.length > 0) {
              console.log(`[auth] Revoked ${revoked.length} prior session(s) for user ${userId}`);
              for (const { token } of revoked) await cache?.del(sessionKey(token)).catch(() => undefined);
            }
            await db
              .updateTable("user")
              .set({ status: "active", updatedAt: new Date() })
              .where("id", "=", userId)
              .where("status", "=", "pending")
              .execute();
            return { data: { ...session, ipAddress: null, userAgent: null } };
          },
          // R2: the signed-in address adopts every invitation with the same email key.
          after: async (session) => {
            const owner = await db.selectFrom("user").select("email").where("id", "=", String(session.userId)).executeTakeFirst();
            if (owner) await adoptInvitations({ db, cache }, owner.email);
          }
        }
      }
    },
    plugins: [
      magicLink({
        expiresIn: LINK_EXPIRY_SECONDS,
        storeToken: "hashed",
        // Accounts are created explicitly by POST /api/auth/create-account;
        // a login link must never create one implicitly.
        disableSignUp: true,
        rateLimit: emailRateLimit(config),
        sendMagicLink: async ({ email, token, metadata }) => {
          if (typeof metadata?.mint === "string") {
            mintedTokens.set(metadata.mint, token);
            return;
          }
          // Build the emailed link ourselves so it carries the requesting
          // origin (https custom domain on DigitalOcean, localhost in dev)
          // and the stay-signed-in choice (FR-006).
          const origin = String(metadata?.origin ?? `http://localhost:${config.port}`);
          const stay = metadata?.stay ? "1" : "0";
          const pid = typeof metadata?.pid === "string" ? metadata.pid : "";
          const bind = typeof metadata?.bind === "string" ? metadata.bind : "";
          const url = `${origin}/api/auth/verify?token=${encodeURIComponent(token)}&stay=${stay}${pid ? `&PID=${encodeURIComponent(pid)}` : ""}${bind ? `&bind=${encodeURIComponent(bind)}` : ""}`;
          await mailer.sendLoginLink(email, url);
        }
      }),
      ...amazonSignin(db, config)
    ],
    socialProviders: socialProviders(db, config),
    onAPIError: config.oauthSignin ? { errorURL: "/login" } : undefined,
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: {
        [RATE_LIMITED.createAccount]: emailRateLimit(config),
        [RATE_LIMITED.requestLoginLink]: emailRateLimit(config),
        [RATE_LIMITED.emailChangeRequest]: emailRateLimit(config),
        [RATE_LIMITED.redeemInvitation]: emailRateLimit(config)
      }
    },
    advanced: {
      // Exactly one cookie named `session_token` (FR-008). useSecureCookies
      // would add a `__Secure-` name prefix, so the secure attribute is set
      // directly instead — it must hold in deployment (platform-terminated
      // HTTPS) and is honored on localhost by modern browsers.
      useSecureCookies: false,
      cookies: {
        session_token: {
          name: "session_token",
          attributes: { httpOnly: true, secure: true, sameSite: "lax" }
        },
        // The 5-minute forgery check on a provider sign-in, strictly necessary (research R11).
        state: {
          name: "oauth_state",
          attributes: { httpOnly: true, secure: true, sameSite: "lax" }
        }
      }
    }
  });
  return auth;
}

/**
 * Consume one request from the built-in limiter's window for a logical
 * endpoint (FR-004a/013c). Returns the refusal time when over the limit.
 */
export async function consumeRateLimit(
  auth: Auth,
  path: (typeof RATE_LIMITED)[keyof typeof RATE_LIMITED],
  clientIp: string,
  config: AppConfig
): Promise<{ limited: false } | { limited: true; nextAllowedAt: Date }> {
  const response = await auth.handler(
    new Request(`http://localhost/api/auth${path}`, {
      method: "POST",
      headers: { "x-forwarded-for": clientIp }
    })
  );
  if (response.status === 429) {
    // The limiter normally reports how long is left; the configured window is the
    // fallback when it does not.
    const retryAfter = Number(
      response.headers.get("x-retry-after") ?? emailRateLimit(config).window
    );
    return { limited: true, nextAllowedAt: new Date(Date.now() + retryAfter * 1000) };
  }
  return { limited: false };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

/**
 * Supersession (FR-004): delete any unused login-link tokens for an email
 * before issuing a new one. Magic-link verification values are stored as
 * `{"email":"…",…}` JSON keyed by hashed token, so match on the value.
 */
export async function supersedeLoginLinks(db: Db, email: string): Promise<void> {
  await db
    .deleteFrom("verification")
    .where("value", "like", `{"email":"${email.replace(/[\\%_]/g, "\\$&")}"%`)
    .execute();
}
