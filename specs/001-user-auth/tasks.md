# Tasks: User Authentication System

**Input**: Design documents from `/specs/001-user-auth/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-endpoints.md, quickstart.md

**Tests**: Included — the plan mandates tests-first for token, rate-limit, and uniqueness
logic (research R9), and the test files under `./tests` are themselves part of the FR-024
deliverable.

**Organization**: Tasks are grouped by user story to enable independent implementation and
testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Include exact file paths in descriptions

## Path Conventions

Single project at repository root per plan.md: `src/`, `src/public/`, `tests/`,
`postman/`, `devScripts/` (git-ignored), `.vscode/` (git-ignored except settings.json).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Initialize Node.js 22 + TypeScript 5 project: `package.json` (scripts: `dev`, `build`, `start`, `test`), strict `tsconfig.json`, and dependencies (express@5, better-auth, mongodb, nodemailer) + dev-dependencies (typescript, tsx, vitest, supertest, mongodb-memory-server, @types/*)
- [X] T002 Create source tree per plan.md: `src/{auth,email,routes,public}/` and `tests/` directories with placeholder `.gitkeep`/entry files, `src/server.ts` stub
- [X] T003 [P] Update `.gitignore`: add `devScripts/` and `.vscode/launch.json` (FR-024/025 git-ignore mandates); verify existing `node_modules/`, `dist/`, `.env*` entries
- [X] T004 [P] Configure `vitest.config.ts` (node environment, `./tests` include glob, sequential DB-bound suites) and `tests/helpers/setup.ts` scaffold

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Implement `src/config.ts`: parse + validate all `APP_*` env vars (APP_PORT, APP_MONGODB_NAME default `app01`, APP_MONGODB_URI, APP_ADMINS, APP_POLLING_INTERVAL, APP_SIGNIN_COOKIE_DURATION_MAX, APP_SIGNIN_METHOD `native|oauth`); fail fast with a friendly console error naming the missing/invalid variable (FR-021, FR-022). TLS note: `APP_MONGODB_URI` is passed through verbatim so DigitalOcean's managed-MongoDB connection string (`tls=true`) works as-is; if the driver rejects DO's CA, support an optional CA-file reference (e.g. `tlsCAFile` in the URI pointing at DO's downloadable `ca-certificate.crt`) — no code branching, configuration only
- [X] T006 [P] Implement `src/email/mailer.ts`: nodemailer transport from Mailtrap SMTP env config, JSON transport injection point for tests, and four typed send functions — login link, unknown-address create-account invitation, email-change verification, old-address change notice (research R3; templates minimal text/HTML)
- [X] T007 Implement `src/auth/auth.ts`: BetterAuth instance with MongoDB adapter (db from config), magic-link plugin wired to `mailer.sendLoginLink`, session cookie named `session_token` with httpOnly/secure/sameSite=lax and maxAge from config only when stay-signed-in (FR-006, FR-008/009; non-persistent sessions expire server-side after 24 h per data-model.md), token expiry ~15 min, delete-on-issue supersession (verify exact plugin option names against installed better-auth version per research R2). Build login/verification link URLs from the request's forwarded protocol/host (correct once `trust proxy` is set in T009) so emailed links are `https://` on DigitalOcean and `http://localhost:9999` in dev without configuration
- [X] T008 Configure BetterAuth's built-in rate limiting in `src/auth/auth.ts`: database-backed storage, custom per-endpoint rules of 2 requests per 15-minute window per client for login-link request, create-account, and email-change request; map limiter 429s to the contract shape `{ error, nextAllowedAt }` using the limiter's retry-after (FR-004a, FR-013c; research R5 revised — client IP correctness relies on `trust proxy` from T009)
- [X] T009 Implement `src/server.ts`: Express bootstrap — `trust proxy`, JSON parsing, static hosting of `src/public/`, BetterAuth handler mount, central error handler that logs and returns friendly JSON (FR-022), startup logging of port/mode; export app factory for tests
- [X] T010 Implement `tests/helpers/setup.ts`: app factory bound to mongodb-memory-server, JSON mail transport capturing sent messages with link extraction helper, fake-timer utilities for expiry/window tests (research R9)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create Account & Sign In with Email Link (Priority: P1) 🎯 MVP

**Goal**: Complete passwordless loop — create pending account (auto-sends first link), sign in via one-time link, single active session, logout (FR-001–FR-007a).

**Independent Test**: With a clean database: create account → link arrives → click link → signed in (account active); link reuse refused; 3rd link request in window refused with next-allowed time; second sign-in replaces first session; logout ends session (quickstart US1/US5 scenarios).

### Tests for User Story 1 (write first, ensure they FAIL) ⚠️

- [X] T011 [P] [US1] Write `tests/auth.test.ts`: create-account issues pending user + sends link; link click activates + signs in; identical 200 for unknown vs known email, with unknown address receiving a create-account invitation email instead of a login link; expired/reused/superseded/malformed link refused non-revealingly (FR-001–004, US1 scenarios 1–4)
- [X] T012 [P] [US1] Write `tests/session.test.ts` (US1 portion): cookie flags (httpOnly/secure/lax), maxAge present only with staySignedIn, second sign-in revokes first session (FR-006–FR-007a, single-cookie check for SC-006), logout clears session
- [X] T013 [P] [US1] Write `tests/rate-limit.test.ts` (login-link portion): 2 requests from one client OK, 3rd within the 15-minute window refused with `nextAllowedAt` and no email sent; limits are per client per endpoint (different emails from the same client share the window); signup send counts toward the create-account endpoint's window (FR-004a)

### Implementation for User Story 1

- [X] T014 [P] [US1] Implement `src/auth/username.ts`: default userName from email local-part truncated ≤200, numeric-suffix loop against case-insensitive unique index until free (FR-012; research R7); create the collation index at startup
- [X] T015 [US1] Implement `POST /api/auth/create-account` in `src/routes/api.ts`: validate email (format, ≤200), covered by the built-in per-client limit (T008), create pending profile (clientId/clientSecret GUIDs, default avatar, T014 userName) or fall through to normal login link if account exists, auto-send first link (FR-001, contract)
- [X] T016 [US1] Implement `POST /api/auth/request-login-link` in `src/routes/api.ts`: validation + built-in per-client rate limit (T008) + magic-link issue carrying staySignedIn; unknown addresses get an identical on-screen response but receive a create-account invitation email instead of a login link (FR-002, FR-004a, account-existence privacy)
- [X] T017 [US1] Implement `GET /api/auth/verify` in `src/routes/api.ts`: consume link via BetterAuth, flip `pending→active`, revoke all other sessions before issuing the new one (FR-007a; research R4), set cookie per staySignedIn, redirect `/` on success or `/login?error=invalid-link` on any failure (FR-003/004)
- [X] T018 [US1] Implement `POST /api/auth/logout` in `src/routes/api.ts` (FR-007) and wire all US1 routes + console logging of auth events into `src/server.ts`
- [X] T019 [P] [US1] Create `src/public/login.html` (email field, "Stay signed in on this device" checkbox, submit → request-login-link, error/next-allowed-time display, FR-005) and `src/public/create-account.html` (email field + submit → create-account)

**Checkpoint**: All US1 tests green; quickstart US1 + US5(single-session) manual scenarios pass — deployable MVP

---

## Phase 4: User Story 2 - Signed-In vs. Guest Experience (Priority: P2)

**Goal**: State-dependent demo client — header links, userName + avatar with menu, member/guest messages, guarded member content (FR-014–FR-017).

**Independent Test**: Signed out: guest header, "Guest-mode: You are not logged in", /profile redirects to login. Signed in: userName + avatar in header, avatar menu with Edit Profile, "You are logged in as <userName>" (quickstart US2).

### Tests for User Story 2 (write first, ensure they FAIL) ⚠️

- [X] T020 [P] [US2] Extend `tests/session.test.ts` (US2 portion): `GET /api/me` returns profile (no clientSecret, correct fields) when authenticated, 401 for guests; page route `/profile` redirects guests to `/login` (FR-014)

### Implementation for User Story 2

- [X] T021 [US2] Implement `GET /api/me` in `src/routes/api.ts` per contract (omit `emailAddress` in oauth mode; never expose clientSecret) and `src/routes/pages.ts` serving `/`, `/login`, `/create-account`, `/profile` with guest-redirect guard on `/profile`
- [X] T022 [P] [US2] Create `src/public/index.html` + `src/public/styles.css`: header with Login/Logout/Create Account/Edit Profile links, avatar + userName slots, member message "You are logged in as <userName>" and guest message "Guest-mode: You are not logged in" containers (FR-015–017)
- [X] T023 [US2] Implement `src/public/app.js`: fetch `/api/me`, toggle header links/content by auth state, render avatar + userName, avatar-click menu with Edit Profile item, logout wiring (FR-015–017)

**Checkpoint**: US1 and US2 both pass their tests and quickstart scenarios independently

---

## Phase 5: User Story 3 - View & Edit Profile (Priority: P3)

**Goal**: Display/Edit Profile page — userName editing with uniqueness, verified email change with both-counter rate limit, old-address notice (FR-011, FR-013–FR-013d).

**Independent Test**: Sign in → edit userName (free name saves + header updates; taken name rejected; >200 rejected) → request email change (verification to new inbox; taken address refused; limit refusals name next-allowed time) → click link in a session-less browser → email swapped, old address notified (quickstart US3).

### Tests for User Story 3 (write first, ensure they FAIL) ⚠️

- [X] T024 [P] [US3] Write `tests/profile.test.ts`: PATCH userName success/409-taken(case-insensitive)/400-length; email-change request → token issued + mail to new address; taken new address → 409, no mail; own current address → 400, no mail; verification without session completes swap + old-address notice sent; expired/superseded/reused change link refused; uniqueness race at consume refused (spec Story 3 scenarios 1–9, edge cases)
- [X] T025 [P] [US3] Extend `tests/rate-limit.test.ts` (email-change portion): 2 email-change requests from one client OK, 3rd within the window refused with `nextAllowedAt` and no email sent; window independent of the login-link endpoint's window (FR-013c)

### Implementation for User Story 3

- [X] T026 [US3] Implement `PATCH /api/me` in `src/routes/api.ts`: userName validation (≤200, non-empty) + case-insensitive uniqueness via T014 index → 200/400/409 per contract (FR-013)
- [X] T027 [US3] Implement `POST /api/me/email-change` in `src/routes/api.ts`: native-mode gate, format/length validation (400 when the new address equals the account's current address), uniqueness pre-check (FR-013b), covered by the built-in per-client limit (T008), create supersede-on-issue email_change_request + send verification to new address (FR-013a/c; research R6)
- [X] T028 [US3] Implement `GET /api/me/email-change/verify` in `src/routes/api.ts`: session-less token consumption, re-check uniqueness at consume (race → refuse), swap emailAddress, send FR-013d notice to old address via `src/email/mailer.ts`, redirect per contract
- [X] T029 [P] [US3] Create `src/public/profile.html` + extend `src/public/app.js`: display userName/email/avatar (avatar read-only), userName edit form, email-change form with pending-state and error/next-allowed-time messaging (FR-013, spec Story 3)

**Checkpoint**: US1–US3 all pass independently

---

## Phase 6: User Story 4 - Cookie Notification Banner (Priority: P4)

**Goal**: Informational single-button cookie banner, acknowledged once per device via localStorage — never a second cookie (FR-010).

**Independent Test**: Fresh browser profile shows banner with only "I Understand"; acknowledgement persists across reloads; DevTools shows `session_token` as the only cookie ever set (quickstart US4).

### Implementation for User Story 4

- [X] T030 [US4] Add banner markup/styles to `src/public/index.html`, `login.html`, `create-account.html`, `profile.html` (shared include or duplicated block) + `src/public/styles.css`, and acknowledgement persistence in `src/public/app.js` using localStorage (FR-010; spec cookie-banner rules)
- [X] T031 [US4] Extend `tests/session.test.ts`: assert no server flow ever sets a cookie other than `session_token` (scan Set-Cookie headers across all endpoints exercised by the suite) (FR-008, SC-006)

**Checkpoint**: US1–US4 independently functional

---

## Phase 7: User Story 5 - Switch to OAuth Social Sign-In (Priority: P5)

**Goal**: `APP_SIGNIN_METHOD=oauth` flips the deployment to provider-exclusive sign-in with no code changes (FR-018–FR-020).

**Independent Test**: With `APP_SIGNIN_METHOD=oauth`: login page offers provider buttons and no email field, `/create-account` hidden, email-link and email-change endpoints disabled, no login emails sent (quickstart switch rehearsal; full provider round-trip deferred until approvals).

### Tests for User Story 5 (write first, ensure they FAIL) ⚠️

- [X] T032 [P] [US5] Write `tests/signin-mode.test.ts`: in oauth mode native endpoints return 404/disabled and send no mail; in native mode OAuth endpoints absent; `/api/me` omits emailAddress in oauth mode (FR-018–020)

### Implementation for User Story 5

- [X] T033 [US5] Add mode gating in `src/routes/api.ts` + `src/routes/pages.ts` driven by `config.signinMethod`, and social-provider plugin scaffold (providers read from env, unconfigured by default; provider sign-in path reuses single-session revoke + userName suffixing) in `src/auth/auth.ts` (FR-018/019; research R2)
- [X] T034 [US5] Update `src/public/login.html` + `src/public/app.js`: render provider buttons and hide email flow in oauth mode (mode exposed via `/api/me`-adjacent config endpoint or page injection); hide Create Account header link in oauth mode (FR-015, FR-019)

**Checkpoint**: All five user stories independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns (Developer Deliverables FR-023–FR-026)

- [X] T035 [P] Write `postman/openapi.json` (OpenAPI 3.1) covering every endpoint in `specs/001-user-auth/contracts/api-endpoints.md` with request/response schemas and error shapes incl. `nextAllowedAt` (FR-026); cross-check against implemented routes
- [X] T036 [P] Write `README.md` section: Windows 11 development database install + launch instructions (winget/MSI service install, `Get-Service MongoDB` verification) per quickstart.md (FR-023)
- [X] T037 [P] Create `devScripts/launch-dev.ps1` locally (git-ignored) + checked-in `devScripts.example/launch-dev.ps1` template: set all APP_* defaults from spec, start MongoDB Windows service if stopped, launch server (FR-025)
- [X] T038 [P] Create `.vscode/launch.json` locally (git-ignored) + checked-in `launch.json.example`: server debug entry + one entry per `./tests/*.test.ts` file, each setting the APP_* defaults (APP_PORT=9999, APP_MONGODB_NAME=app01, APP_MONGODB_URI=mongodb://localhost:27017/app01, APP_ADMINS=roadraceresults@gmail.com, APP_POLLING_INTERVAL=5000, APP_SIGNIN_COOKIE_DURATION_MAX=2592000000, APP_SIGNIN_METHOD=native) (FR-024)
- [X] T039 Security & logging pass: verify cookie flags end-to-end, non-revealing error messages, no token/secret ever logged or returned, informative console logging on every flow (constitution V; spec Security standards). Include the TLS deployment checks: `trust proxy` makes `secure` cookies stick behind DigitalOcean's HTTPS termination, emailed links carry the https custom-domain origin, and the managed-MongoDB connection succeeds over `tls=true` (adding DO's CA file only if the driver requires it)
- [X] T040 Run full `specs/001-user-auth/quickstart.md` validation (automated suites + manual scenarios) and fix any gaps; confirm SC-001–SC-008

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories. Within it: T005 → T007/T009 (config feeds auth/server); T006 parallel after T005; T008 after T007 (both edit `src/auth/auth.ts`); T010 after T009
- **User Stories (Phases 3–7)**: All depend on Phase 2. US2–US5 build on US1's session in practice but each is independently testable; sequential P1→P5 is the low-risk path
- **Polish (Phase 8)**: T035–T038 parallel anytime after their subject matter stabilizes (T035 after Phase 7); T039–T040 last

### User Story Dependencies

- **US1 (P1)**: Only Phase 2 — the MVP
- **US2 (P2)**: Phase 2; consumes US1's session for the signed-in half of its test
- **US3 (P3)**: Phase 2 + US1 (needs sign-in to reach /profile); reuses T008 and T014
- **US4 (P4)**: Touches US1–US3 pages; keep last among page work to avoid file conflicts in `app.js`/HTML
- **US5 (P5)**: Phase 2 + US1 routes to gate; provider round-trip blocked externally

### Within Each User Story

- Tests first (must fail) → models/helpers → endpoints → pages/client → checkpoint
- Tasks in the same file are sequential (e.g., T015→T018 all touch `src/routes/api.ts`; T023/T029/T030/T034 all touch `app.js`)

### Parallel Opportunities

- Phase 1: T003, T004 parallel after T001/T002
- Phase 2: T006 ∥ T007 (after T005); T008 follows T007 (same file)
- Each story's test tasks: T011 ∥ T012 ∥ T013; T024 ∥ T025
- T014 ∥ T019 (different files) while T015–T018 proceed sequentially
- Phase 8: T035 ∥ T036 ∥ T037 ∥ T038

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (write first, watch them fail):
Task: "Write tests/auth.test.ts — signup, link verify, expiry/reuse/supersede"
Task: "Write tests/session.test.ts — cookie flags, single session, logout"
Task: "Write tests/rate-limit.test.ts — 2-per-15-min login-link windows"

# Then launch independent implementation files together:
Task: "Implement src/auth/username.ts default + suffix loop"
Task: "Create src/public/login.html and src/public/create-account.html"
# (src/routes/api.ts tasks T015–T018 run sequentially — same file)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run US1 suites + quickstart US1 scenarios
5. Deployable MVP: the full passwordless loop works end-to-end

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → test → **MVP** (deployable to DigitalOcean)
3. US2 → test → demo client complete for guests/members
4. US3 → test → profile + email change
5. US4 → test → banner/compliance
6. US5 → test (mode rehearsal) → OAuth-ready pending provider approvals
7. Phase 8 → developer deliverables + full quickstart validation

### Parallel Team Strategy

After Phase 2, one developer can take US1 while another prepares US2 pages (T022) and
Phase 8 docs (T036–T038); US3 should wait for US1's auth flow to stabilize. Single-file
hotspots to coordinate: `src/routes/api.ts` and `src/public/app.js`.

---

## Notes

- [P] tasks = different files, no dependencies; [Story] labels map to spec.md stories US1–US5
- Verify each story's tests fail before implementing; commit after each task or logical group
- Exact BetterAuth option/plugin names must be verified against the installed version (research R2) — adjust T007/T017/T027 details accordingly, not the contracts
- Stop at any checkpoint to validate the story independently against quickstart.md
