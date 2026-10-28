---

description: "Task list for social sign-in with Google, Apple, Microsoft and Amazon"
---

# Tasks: Social Sign-In With Google, Apple, Microsoft and Amazon

**Input**: Design documents from `specs/20261022-131728-SOCIAL-OAUTH-PROVIDERS/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R11), data-model.md, contracts/api.md (A1–A6), contracts/ui-contracts.md (C1–C3), contracts/provider-setup.md (P0–P5), quickstart.md

**Tests**: Requested (SC-005 and the quickstart's automated checks). Providers are stubbed by intercepting `fetch` in the test process, as `tests/allowlist.test.ts` does for its GitHub callback; no network. Write each story's tests first and watch them fail.

**Organization**: Phase 2 holds the settings, origin and mode work every story needs.

**Branch**: `dev`. A push deploys; with `ENV_SIGNIN_METHOD=native` (production today) nothing visible changes until the operator configures a provider and switches to `both`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task belongs to (US1–US5)

## Path Conventions

Single project: `src/`, `tests/` at the repository root. Server tests use `startTestContext({ ENV_SIGNIN_METHOD: "both", ENV_PUBLIC_ORIGIN: "http://localhost", ENV_OAUTH_GOOGLE_CLIENT_ID: "g-id", … })`; the harness's default config must gain `ENV_PUBLIC_ORIGIN`. No explanatory comments in new code (Constitution VI).

---

## Phase 1: Setup

- [X] T001 [P] Add the official provider logos as `src/public/oauth/google.svg`, `apple.svg`, `apple-white.svg`, `microsoft.svg`, `amazon.svg`, taken from each provider's brand-guidelines download (contracts/ui-contracts.md C1), and add `!` exceptions in `.gitignore` if needed
- [X] T002 [P] Add `ENV_PUBLIC_ORIGIN` (`http://localhost:8080`), `ENV_SIGNIN_METHOD` comment listing `native|oauth|both`, and empty `ENV_OAUTH_GOOGLE_*`, `ENV_OAUTH_APPLE_*` (4), `ENV_OAUTH_MICROSOFT_*`, `ENV_OAUTH_AMAZON_*` entries to `launch.json.example` and `devScripts.example/launch-dev.ps1`; remove the Facebook/GitHub entries; add `ENV_PUBLIC_ORIGIN: https://crowdpoll.vote` to `.do/app.yaml` (the OAuth secrets are console variables, never in the file)

---

## Phase 2: Foundational

**Purpose**: the origin, the three modes and the provider settings.

### Tests for the foundation

- [X] T003 [P] Write `tests/oauth-config.test.ts`: `ENV_PUBLIC_ORIGIN` is required and must be an `http(s)` origin without a path; `ENV_SIGNIN_METHOD` accepts `native|oauth|both` and derives `nativeSignin`/`oauthSignin`; each provider is on only with all its settings, a partial set throws a `ConfigError` naming the provider and the missing setting, `oauth`/`both` with no provider throws, Apple's private key reads `\n` pairs as line breaks; Facebook/GitHub settings are ignored (R1, R2, R4, FR-003)
- [X] T004 [P] Write `tests/oauth-modes.test.ts`: for each mode, the routes of contracts/api.md A4 answer as listed (`404` where off), `/api/config` reports `signinMethod` and `oauthProviders` in display order (A1), and in `both` `POST /api/auth/create-account` still reaches CrowdPoll's handler (not BetterAuth's) (R3)

### Implementation for the foundation

- [X] T005 In `src/config.ts`, add `publicOrigin`, the `both` value, `nativeSignin`/`oauthSignin`, and `oauthProviders` (google, apple, microsoft, amazon) with the completeness rule (R1, R2, R4); add `ENV_PUBLIC_ORIGIN` to the harness defaults in `tests/helpers/setup.ts`; give the five suites that start `ENV_SIGNIN_METHOD: "oauth"` (`signin-mode`, `allowlist`, `client-login-pid`, `client-not-launched`, `client-terms-box`) a Google client id and secret in their `startTestContext` overrides, since `oauth` with no provider becomes a start-up error
- [X] T006 In `src/auth/auth.ts`, set `baseURL: config.publicOrigin` and `trustedOrigins: [config.publicOrigin]`; replace `socialProviders()` with the configured providers (Google; Microsoft with `tenantId: "common"`; Apple added in US4 T020); set `onAPIError.errorURL` to `/login` when `oauthSignin` (R1, R4)
- [X] T007 In `src/server.ts`, mount `toNodeHandler(auth)` only for `POST /api/auth/sign-in/social`, `GET|POST /api/auth/callback/:provider`, `POST /api/auth/sign-in/oauth2` and `GET /api/auth/oauth2/callback/:providerId` when `oauthSignin`, before `express.json()`; log `[auth] Sign-in method: <mode>; providers: <names>` at start-up (R3, A6)
- [X] T008 Replace every `signinMethod === "native"`/`"oauth"` test with `nativeSignin`/`oauthSignin` in `src/routes/api.ts` (`nativeOnly`, `/api/config` adds `oauthProviders`), `src/routes/pages.ts` (`/create-account`, `/confirm-signin`), and `src/public/profileCard.js` (email section hidden only when not `nativeSignin`) (R2, A1, A4, C3)

**Checkpoint**: T003–T004 pass; `native` and `oauth` behave as before.

---

## Phase 3: User Story 1 — A person signs in with a provider account (Priority: P1) 🎯 MVP

**Goal**: buttons that start a real provider flow and land the person signed in (FR-006–FR-011, FR-015).

**Independent Test**: with a stubbed Google, press its button, follow the returned URL's callback, land signed in with a new account sent to `/accept-terms`.

### Tests for User Story 1

- [X] T009 [P] [US1] Write `tests/oauth-providers.test.ts` (sign-in part): `POST /api/auth/sign-in/social { provider: "google", callbackURL: "/" }` returns a Google authorize URL whose `redirect_uri` is `<origin>/api/auth/callback/google`; with Google's token and user-info calls stubbed, `GET /api/auth/callback/google?code=…&state=…` creates the user, sets `session_token` and redirects to `/`; the next page load redirects to `/accept-terms` (the suite first clears the harness's `terms_version` column default, which otherwise marks every new user as having accepted); with the allowlist on and the address unlisted, it redirects to `/login?error=not-launched` and creates nothing; a provider error redirects to `/login?error=<code>`; a profile with no email → `/login?error=email_not_found` and no user; a token exchange failing as if the client secret were revoked → `/login?error=…` while another provider still works (FR-010, FR-011, FR-015, edge cases)
- [X] T010 [P] [US1] Extend `tests/client-terms-box.test.ts` and write `tests/client-oauth-login.test.ts`: in `oauth` and `both` the Login card shows one button per `oauthProviders` entry in order with its logo and wording, `aria-disabled` until the box is ticked; pressing one posts to the start route and navigates to the returned `url`; in `both` the email form follows a divider "or"; each `?error=` code shows its C2 message (C1, C2)

### Implementation for User Story 1

- [X] T011 [US1] In `src/public/loginCard.js`, render the provider buttons from `/api/config` `oauthProviders` (C1), each posting to `/api/auth/sign-in/social` (or `/api/auth/sign-in/oauth2` for Amazon) with `callbackURL` = the shared-poll landing or `/`, then `location.href = url`; show the email form below a divider in `both`; map the R8 error codes (C2); replace the dead `/api/auth/oauth/<provider>` links
- [X] T012 [P] [US1] Add the provider button styles (each provider's colours, logo size, full width, focus ring, light and dark variants) to `src/public/card-shell-m3.css`

**Checkpoint**: T009–T010 pass for Google.

---

## Phase 4: User Story 2 — An existing member keeps their account (Priority: P1)

**Goal**: link by email key for all four providers (FR-012–FR-014, FR-016).

**Independent Test**: an email-link account signs in with a stubbed provider under the same (or Gmail-variant) address and lands in the same account.

### Tests for User Story 2

- [X] T013 [P] [US2] Extend `tests/oauth-providers.test.ts` (linking part): an existing verified account `john.smith@gmail.com` + Google returning verified `johnsmith@gmail.com` → same user id, an `account` row `google` added, no second user; the same for Microsoft and Amazon (stubbed); an existing account that never signed in (`emailVerified` false) → `/login?error=account_not_linked`; an Apple relay address creates its own account; a stubbed Microsoft profile with `email_verified: false` matching an existing account → refused, no link; after an email change on a Google-linked account, the next Google sign-in opens the same account and leaves the new address; a second sign-in whose profile shows another name or address does not overwrite the stored ones; deleting the account removes its `account` rows (FR-007, FR-012–FR-016, edge cases)

### Implementation for User Story 2

- [X] T014 [US2] In `src/auth/auth.ts`, set `account.accountLinking = { enabled: true }` (no `trustedProviders`, which would link unverified addresses; research R7) and give each provider a `mapProfileToUser` that looks up an existing user by `emailKeyOf` and returns that user's stored address as `email` (R7)

**Checkpoint**: T013 passes.

---

## Phase 5: User Story 3 — Email-link sign-in stays available (Priority: P2)

**Goal**: `both` keeps every native route (FR-006, FR-007).

**Independent Test**: in `both`, request and follow an email link, create an account by email, and sign in with a stubbed provider.

- [X] T015 [P] [US3] Extend `tests/oauth-modes.test.ts`: in `both`, a full email-link sign-in (request → follow link → signed in), create-account and an email change work exactly as in `native`; `tests/signin-mode.test.ts` still passes for `oauth` (SC-004)
- [X] T016 [US3] Fix whatever T015 shows in `src/routes/api.ts` or `src/server.ts` so the native routes are never reached by BetterAuth's handler in `both` (R3)

**Checkpoint**: T015 passes.

---

## Phase 6: User Story 4 — The operator registers CrowdPoll with each provider (Priority: P2)

**Goal**: Apple and Amazon configured; the procedures written (FR-001–FR-005, FR-019).

**Independent Test**: with Apple's four settings (a test key), start-up logs Apple on and its secret's expiry; the Amazon flow completes against stubs.

### Tests for User Story 4

- [X] T017 [P] [US4] Write `tests/apple-secret.test.ts`: `appleClientSecret({ teamId, keyId, clientId, privateKey }, now)` returns a JWT whose header is `{ alg: "ES256", kid }`, whose claims are `iss`, `iat`, `exp = iat + 180 days`, `aud: "https://appleid.apple.com"`, `sub`, and whose signature verifies with the key's public half (a key generated in the test with `generateKeyPairSync("ec", { namedCurve: "P-256" })`); the refresh timer replaces the secret in the Apple provider's options (R5)
- [X] T018 [P] [US4] Extend `tests/oauth-providers.test.ts`: Apple's `POST /api/auth/callback/apple` (form_post) redirects to the GET callback and completes with a stubbed token response (an `id_token` signed by a test key, Apple's JWKS stubbed); Amazon's `POST /api/auth/sign-in/oauth2 { providerId: "amazon" }` returns a URL to `https://www.amazon.com/ap/oa` with `redirect_uri` `<origin>/api/auth/oauth2/callback/amazon`, and its callback with stubbed token and profile calls signs the person in; a second Apple sign-in without a name keeps the stored user name (R5, R6, edge cases)

### Implementation for User Story 4

- [X] T019 [P] [US4] Create `src/auth/appleSecret.ts`: `appleClientSecret(settings, now)` (ES256 via `node:crypto` `createSign("SHA256")` with `dsaEncoding: "ieee-p1363"`) and `startAppleSecretRefresh(options, settings)` (every 30 days, logs the new expiry) (R5)
- [X] T020 [US4] In `src/auth/auth.ts`, add `socialProviders.apple` with the generated secret, and the `genericOAuth` plugin for Amazon (authorize, token, scopes `["profile"]`, `getUserInfo` reading `https://api.amazon.com/user/profile` and returning `emailVerified: true`, with the same email-key mapping as T014) (R5, R6)
- [X] T021 [US4] In `src/server.ts`, start the Apple refresh when Apple is on and log `[auth] Apple client secret valid until <date>` (A6)

**Checkpoint**: T017–T018 pass.

---

## Phase 7: User Story 5 — Providers can verify the domain and reach relay addresses (Priority: P3)

**Goal**: Apple's domain file and the relay note (FR-017, FR-018).

**Independent Test**: with a file in place, `GET /.well-known/apple-developer-domain-association.txt` returns it as plain text to a guest.

- [X] T022 [P] [US5] Write `tests/well-known.test.ts`: the route returns the file as `text/plain` to a guest and a signed-in user who has not accepted the Terms; `404` when the file is absent (a temporary file written and removed by the test) (A5)
- [X] T023 [US5] In `src/routes/pages.ts`, add `GET /.well-known/apple-developer-domain-association.txt` serving `src/public/.well-known/apple-developer-domain-association.txt` when it exists (R10); in `.gitignore`, make sure `src/public/.well-known/` is not ignored
- [X] T024 [P] [US5] Update `src/public/privacy.html` and `specs/20261021-204537-PRIVACY-AND-TERMS/contracts/privacy-policy.md`: a row per provider in "Who processes your data for us" ("the name and email address you choose to share when you sign in with it"), a sentence that an Apple "Hide My Email" address is stored as given, the `oauth_state` cookie (5 minutes, provider sign-in only, strictly necessary) in the Cookie Use table and in the "In short" line; set its name with BetterAuth's cookie settings in `src/auth/auth.ts`; update CLAUDE.md's cookie policy lines (R11, FR-018)

**Checkpoint**: T022 passes; `tests/cookie-use-list.test.ts` and `tests/legal-pages.test.ts` still pass.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T025 [P] Update `postman/openapi.json`: `signinMethod` `both`, `oauthProviders`, the start routes (A2), the callback routes (A3), `/.well-known/apple-developer-domain-association.txt` (A5); keep `tests/openapi-contract.test.ts` passing
- [X] T026 [P] Update `CLAUDE.md` (environment table: `ENV_PUBLIC_ORIGIN`, `ENV_SIGNIN_METHOD` values, the `ENV_OAUTH_*` rows)
- [X] T027 Regenerate `README.md` and `ARCHITECTURE.md` (Constitution, Documentation Deliverables): the three modes, the four providers, linking, Apple's secret, the procedures in `contracts/provider-setup.md`
- [X] T028 Run `npm test` and `npm run build`; fix any failure (quickstart §1)
- [ ] T029 Manual (operator): quickstart §2 (time a provider sign-in against SC-001: under 30 seconds and two clicks after the provider's own sign-in) with development clients for Google, Microsoft and Amazon; then contracts/provider-setup.md P0–P4 and quickstart §3 in production

---

## Dependencies & Execution Order

- **Phase 1** → **Phase 2** → stories.
- **US1** needs Phase 2 (T005–T008). **US2** needs US1's flow (T009, T011) to test linking. **US3** needs Phase 2 only. **US4** needs US1 and US2 (it adds two providers to the same flow and mapping). **US5** is independent of the others.
- **Phase 8** after all stories.

## Parallel Examples

- Phase 1: T001 ‖ T002.
- Phase 2: T003 ‖ T004, then T005 → T006 → T007 → T008.
- US1: T009 ‖ T010, then T011 ‖ T012.
- US4: T017 ‖ T018, then T019 ‖ (T020 after T019).
- US5: T022 ‖ T024, then T023.

## Implementation Strategy

1. **MVP = Phase 2 + US1 + US2 with Google**: the origin, `both`, working Google sign-in and linking; deployable with production still on `native`.
2. **US3**: prove email links survive `both`.
3. **US4**: Apple and Amazon, plus the procedures already in `contracts/provider-setup.md`.
4. **US5**: Apple's domain file and the Privacy Policy rows.
5. Phase 8; then the operator registers and switches production to `both`.
