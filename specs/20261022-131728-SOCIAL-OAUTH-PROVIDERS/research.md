# Research: Social Sign-In With Google, Apple, Microsoft and Amazon

Each entry: Decision, Rationale, Alternatives considered.
The provider research itself (what each provider requires, with sources) is RS1–RS4 in
`requirements/20261022-131728-social-oauth-providers/requirements-report.md`; this file settles how CrowdPoll builds it,
checked against `better-auth@1.6.26` in `node_modules`.

## R1. One public origin

- **Decision**: a required `ENV_PUBLIC_ORIGIN` (`https://crowdpoll.vote`; `http://localhost:8080` in the templates),
  validated by `loadConfig` (scheme `http`/`https`, no path), passed to BetterAuth as `baseURL` and as its only
  `trustedOrigins` entry.
- **Rationale**: BetterAuth builds every redirect URI from `baseURL`; today it is `http://localhost:<port>`, so a
  provider would be sent back to localhost (FR-004).
- **Alternatives**: deriving it from each request's `Host` (the providers need one fixed, registered URI).

## R2. Three sign-in modes

- **Decision**: `ENV_SIGNIN_METHOD` accepts `native` (default, unchanged), `oauth` (unchanged: providers only) and
  `both`.
  Two derived flags in the config, `nativeSignin` (native or both) and `oauthSignin` (oauth or both), replace every
  `signinMethod === …` test: `nativeOnly` in `api.ts`, the `/create-account` and `/confirm-signin` page guards, the
  email-change section, and the Login card (through `/api/config`).
- **Rationale**: FR-006/FR-007; the existing two modes keep their exact behaviour.

## R3. Mount BetterAuth's handler for the OAuth paths only

- **Decision**: in `oauth` and `both` modes, `server.ts` mounts `toNodeHandler(auth)` for exactly
  `POST /api/auth/sign-in/social`, `GET|POST /api/auth/callback/:provider`, `POST /api/auth/sign-in/oauth2` and
  `GET /api/auth/oauth2/callback/:providerId`, before `express.json()`.
- **Rationale**: today's catch-all `app.all("/api/auth/{*splat}")` would swallow the native routes
  (`/api/auth/create-account`, `/verify`, …) in `both` mode. Apple's callback is a `POST` (`form_post`); BetterAuth
  answers it by redirecting to the same callback as a `GET`, so the `SameSite=Lax` state cookie is sent
  (`api/routes/callback.mjs`).
- The terms gate already lets these through: they are `/api/*` paths it never sees (mounted earlier) and they create
  a session, after which the gate applies.

## R4. Provider settings in `loadConfig`

- **Decision**: `config.oauthProviders`, filled only when `oauthSignin`:

  | Provider | Settings | BetterAuth |
  |---|---|---|
  | Google | `ENV_OAUTH_GOOGLE_CLIENT_ID`, `ENV_OAUTH_GOOGLE_CLIENT_SECRET` | `socialProviders.google` |
  | Apple | `ENV_OAUTH_APPLE_CLIENT_ID` (Services ID), `ENV_OAUTH_APPLE_TEAM_ID`, `ENV_OAUTH_APPLE_KEY_ID`, `ENV_OAUTH_APPLE_PRIVATE_KEY` (PEM, `\n` pairs read as line breaks) | `socialProviders.apple` |
  | Microsoft | `ENV_OAUTH_MICROSOFT_CLIENT_ID`, `ENV_OAUTH_MICROSOFT_CLIENT_SECRET` | `socialProviders.microsoft`, `tenantId: "common"` |
  | Amazon | `ENV_OAUTH_AMAZON_CLIENT_ID`, `ENV_OAUTH_AMAZON_CLIENT_SECRET` | `genericOAuth` plugin (R6) |

  A provider is on when all its settings are set; some but not all → `ConfigError` naming the provider and the missing
  ones; `oauth`/`both` with no provider on → `ConfigError`. Start-up logs `[auth] Sign-in providers: Google, Apple`
  (never a value). The Facebook and GitHub settings are no longer read (FR-001).
- **Rationale**: FR-003, SC-005; matches how `ENV_SES_*` are validated.

## R5. Apple's client secret is signed by CrowdPoll

- **Decision**: `src/auth/appleSecret.ts` signs an ES256 JWT with `node:crypto` (`createSign("SHA256")`,
  `dsaEncoding: "ieee-p1363"`): header `{ alg: "ES256", kid: keyId }`, claims `iss: teamId`, `iat: now`,
  `exp: now + 180 days`, `aud: "https://appleid.apple.com"`, `sub: clientId`.
  It is generated at start-up and regenerated every 30 days by an in-process timer that writes the new value into the
  Apple provider's options object; start-up logs its expiry date.
- **Rationale**: FR-005; Apple caps the secret at six months, and an App Platform instance can run longer than that
  without a deploy. `node:crypto` signs ES256 directly, so no JWT dependency.
- **To verify in a test**: that BetterAuth's Apple provider reads `clientSecret` from the options object at each code
  exchange (so the refresh takes effect); if it does not, regenerate the auth instance instead.

## R6. Amazon through `genericOAuth`

- **Decision**: `genericOAuth({ config: [{ providerId: "amazon", clientId, clientSecret, authorizationUrl:
  "https://www.amazon.com/ap/oa", tokenUrl: "https://api.amazon.com/auth/o2/token", scopes: ["profile"],
  getUserInfo }] })`, where `getUserInfo` fetches `https://api.amazon.com/user/profile` with the access token and
  returns `{ id: user_id, name, email, emailVerified: true }` (Clarifications 2026-10-22: Amazon's email is trusted).
- **Callback path**: the plugin's route is **`/api/auth/oauth2/callback/amazon`** (not `/api/auth/callback/amazon`);
  sign-in starts with `POST /api/auth/sign-in/oauth2 { providerId: "amazon" }`. The spec's FR-004 and the Amazon
  procedure use this path.
- **Rationale**: BetterAuth has no built-in Amazon provider; the plugin is installed with `better-auth`.

## R7. Linking to existing accounts, by email key

- **Decision**: `account.accountLinking = { enabled: true }`, with **no** `trustedProviders`: in better-auth 1.6.26 a
  trusted provider links even when it reports the address unverified (`link-account.mjs`), which would defeat FR-013.
  Each provider's own flag decides instead: Google's and Apple's `email_verified`; Microsoft's `email_verified` when
  present, else verified for a personal account (`tid` = the consumer tenant) or an address in
  `verified_primary_email`/`verified_secondary_email`; Amazon's `getUserInfo` returns `emailVerified: true`
  (Clarifications 2026-10-22). Found during implementation. Each provider's `mapProfileToUser` (Amazon: `getUserInfo`) looks up an existing user by email key
  (`emailKeyOf`) and, when one exists, returns that user's stored address as `email`, so BetterAuth's own exact-email
  lookup finds and links it.
- BetterAuth links only when the local account's `emailVerified` is true (`requireLocalEmailVerified`, default on);
  an email-link sign-in sets it (the magic-link plugin), so every tester who has signed in once qualifies; a pending
  account that never signed in is refused with `account_not_linked` (R8).
- **Rationale**: FR-012, SC-002; the email key keeps the one-mailbox-one-account rule of the production-email feature.
- An Apple relay address has its own key and never matches (FR-014).

## R8. Refusals land on the Login card

- **Decision**: `onAPIError.errorURL = "/login"` in `oauth` and `both`; the Login card maps `?error=` codes to
  messages: `not-launched` (existing), `access_denied` → "Sign-in was cancelled.", `account_not_linked` → "An account
  already uses this email address. Sign in the way you usually do.", `email_not_found` / `email_is_missing` →
  "CrowdPoll needs your email address to sign you in; try another way.", anything else → "Sign-in with that provider
  failed. Please try again." BetterAuth logs the provider's error; `user.create.before` logs refusals with a masked
  address as today.
- **Rationale**: FR-011 and the spec's edge cases.

## R9. The buttons

- **Decision**: `/api/config` adds `oauthProviders: ["google","apple","microsoft","amazon"]` (the enabled ones, in that
  order) and `signinMethod` may be `both`. `loginCard.js` renders one button per provider from it, with the provider's
  official logo (`src/public/oauth/<provider>.svg`, served by CrowdPoll) and wording ("Sign in with Google", "Sign in
  with Apple", "Sign in with Microsoft", "Login with Amazon"); pressing one posts to the start route (`sign-in/social`,
  or `sign-in/oauth2` for Amazon) with `callbackURL` = the shared-poll landing (`/?PID=…`) or `/`, then sets
  `location.href` to the returned `url`. In `both` the email form follows under a divider "or".
- **Rationale**: FR-008–FR-010; the existing links point at a route that does not exist.

## R10. Apple's domain-association file

- **Decision**: `pages.ts` serves `GET /.well-known/apple-developer-domain-association.txt` from
  `src/public/.well-known/apple-developer-domain-association.txt` as `text/plain` when the file exists, else `404`;
  the operator commits the file Apple gives them.
- **Rationale**: `express.static` ignores dot-directories by default, so the file needs its own route (FR-017).

## R11. Privacy Policy and procedures

- **Decision**: the OAuth `state` cookie (5 minutes, every provider sign-in, set by BetterAuth even with database state
  storage) is renamed `oauth_state` through BetterAuth's cookie settings and listed as strictly necessary in Cookie Use,
  the "In short" line and CLAUDE.md's cookie policy.
  `privacy.html` and `contracts/privacy-policy.md` (of feature 20261021-204537, the published text) gain
  a row per provider in "Who processes your data" ("the name and email address you choose to share when you sign in
  with it") and a sentence on Apple relay addresses (FR-018). `contracts/provider-setup.md` holds the four
  registration procedures (FR-019).
