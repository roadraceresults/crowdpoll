---

description: "Task list for the pre-launch sign-up allowlist"
---

# Tasks: Pre-Launch Sign-Up Allowlist

**Input**: Design documents from `specs/20261021-143942-PRELAUNCH-SIGNUP-ALLOWLIST/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R8), data-model.md, contracts/api.md (A1–A6), contracts/ui-contracts.md (C1–C3), quickstart.md

**Tests**: Requested. The plan's test strategy (R8) and SC-003 call for them. Write each story's tests first and watch them fail.

**Organization**: Tasks are grouped by user story. US1 and US2 share the foundational rule (Phase 2) but touch different handlers.

**Branch**: `dev`. A push to `dev` deploys. With `ENV_ALLOWED_EMAILS` not yet set in App Platform, production behaves as today; set it in the console (quickstart §2) when the list should take effect.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task belongs to (US1–US4)

## Path Conventions

Single project: `src/`, `tests/` at the repository root. Tests start the app with `startTestContext({ ENV_ALLOWED_EMAILS: … })` and read sent mail from the harness's captured transport. No explanatory comments in new code (Constitution VI).

---

## Phase 1: Setup

**Purpose**: None needed: no dependency, no migration, no new page.

---

## Phase 2: Foundational

**Purpose**: The setting, the key twin and the rule that every story uses.

### Tests for the foundation

- [X] T001 [P] Create `tests/allowlist.test.ts` with a `describe("allowlist setting")` block that fails today: `loadConfig` leaves `allowedEmailKeys` undefined for an absent, empty (`""`) and separators-only (`" , "`) `ENV_ALLOWED_EMAILS`; for `" Tester@Example.org , John.Smith+x@googlemail.com"` it holds `tester@example.org` and `johnsmith@gmail.com`; `"not-an-address"` throws a `ConfigError` naming `ENV_ALLOWED_EMAILS` (FR-001–FR-003, R1).
- [X] T002 [P] In `tests/email-key.test.ts`, add a test that `emailKeyOf` and the SQL `emailKey` give the same result on the embedded database for `a.b+c@gmail.com`, `A.B@GoogleMail.com`, `x+y@example.org`, `plain@example.org` and `dots.stay@example.org` (R2).
- [X] T003 In `tests/allowlist.test.ts`, add a `describe("isAllowed")` block: off → every address allowed; on → a listed address, the same mailbox written differently (`JohnSmith@gmail.com` for `john.smith@gmail.com`), and an `ENV_ADMINS` address not in the list are allowed; another address is refused (FR-005, FR-006).

### Implementation for the foundation

- [X] T004 In `src/auth/emailKey.ts`, add `export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/` and `export function emailKeyOf(address: string): string`, the TypeScript twin of `emailKey` (local part before the first `+`; for `gmail.com` and `googlemail.com`, dots removed and domain `gmail.com`). In `src/routes/api.ts`, replace the local `EMAIL_RE` with the imported `EMAIL_PATTERN` (R2).
- [X] T005 In `src/config.ts`, add `allowedEmailKeys?: Set<string>` to `AppConfig` and an `allowedEmailKeys(env)` reader beside `assetOrigin`: split on commas, trim, lower-case, drop empty entries; none left → `undefined`; an entry failing `EMAIL_PATTERN` → `ConfigError` `Invalid ENV_ALLOWED_EMAILS: "<entry>" is not an email address.`; otherwise a `Set` of `emailKeyOf(entry)` (R1).
- [X] T006 Create `src/auth/allowlist.ts` exporting `NOT_LAUNCHED_MESSAGE` ("CrowdPoll hasn't launched yet. For now, accounts are open to invited testers only."), `NOT_LAUNCHED` (`{ error: NOT_LAUNCHED_MESSAGE, code: "not-launched" }`), `isAllowed(email, config)` (off, the trimmed lower-cased address in `config.admins`, or the key in the set; no import from `src/polls/`) and `logRefusal(path, email)` writing `[auth] Not launched: <path> refused for <maskAddress(email)>` (R2, R4, R5).
- [X] T007 In `src/server.ts`, beside the other startup lines, log `[auth] Sign-up allowlist off` or `[auth] Sign-up allowlist on (<n> addresses)`; never an address (FR-004).

**Checkpoint**: T001–T003 pass.

---

## Phase 3: User Story 1 - Only invited testers can create an account (Priority: P1) 🎯 MVP

**Goal**: Create Account refuses an unlisted address before anything is created or sent.

**Independent Test**: With the list set to one address, submit Create Account with it and with another; the first gets a link, the second the message and nothing else.

### Tests for User Story 1

- [X] T008 [US1] In `tests/allowlist.test.ts`, add a `describe("create-account (A1)")` block with the list on: a listed address → `200` and one captured message; an unlisted one → `403` with `code: "not-launched"` and the message in `error`, no `"user"` row, no captured message, and the log line `Not launched: create-account refused for`; a filled honeypot still answers `200` (FR-007, FR-012).
- [X] T009 [P] [US1] In `tests/allowlist.test.ts`, add a test with `ENV_ALLOWED_EMAILS` unset that an arbitrary address creates an account as before (FR-002).

### Implementation for User Story 1

- [X] T010 [US1] In `POST /api/auth/create-account` in `src/routes/api.ts`, after the rate limit and before `userByKey`: when `!isAllowed(email, config)`, call `logRefusal("create-account", email)` and answer `403 NOT_LAUNCHED` (A1).

**Checkpoint**: T008–T009 pass; the Create Account card shows the message with no card change (C1).

---

## Phase 4: User Story 2 - Only invited testers can sign in (Priority: P1)

**Goal**: No sign-in path starts a session for an unlisted address; existing sessions run on.

**Independent Test**: Request a link for a listed and an unlisted address; open a link issued before the list was set; confirm from another browser; keep an existing session.

### Tests for User Story 2

- [X] T011 [US2] In `tests/allowlist.test.ts`, add `describe("request-login-link (A2)")`: unlisted with an account and unlisted without one → `403 not-launched`, nothing captured, log path `login`; listed without an account → `200` and the invitation, as today (FR-008).
- [X] T012 [US2] In `tests/allowlist.test.ts`, add `describe("sign-in link (A4, A5)")`: in a context with the list on, issue the earlier link for an unlisted address by calling `auth.api.signInMagicLink` directly (it bypasses the route's check) and read it from the captured mail; then `GET /api/auth/verify` with its binding redirects to `/login?error=not-launched`, no session cookie, and the `verification` row still exists; `POST /api/auth/confirm-signin` with the right `Origin` → `403` with `redirect: "/login?error=not-launched"` (FR-009).
- [X] T013 [US2] In `tests/allowlist.test.ts`, add `describe("session hook")`: with the list on, with a token issued as in T012, calling `auth.api.magicLinkVerify` directly creates no session (the backstop), and log path `session` appears (FR-009, R3).
- [X] T014 [US2] In `tests/allowlist.test.ts`, add a test that a session for an unlisted user, created with the existing `forgeSession` helper (`tests/helpers/setup.ts`) in a context with the list on, keeps answering `GET /api/me` with `200` afterwards (FR-013).
- [X] T015 [P] [US2] Create `tests/client-not-launched.test.ts` (jsdom, the default script list): `/login?error=not-launched` shows the message in the Login card's status line with the `error` class, and the text equals `NOT_LAUNCHED_MESSAGE` imported from `src/auth/allowlist.ts` (C2).

### Implementation for User Story 2

- [X] T016 [US2] In `POST /api/auth/request-login-link` in `src/routes/api.ts`, after the rate limit and before `userIdByEmail`: unlisted → `logRefusal("login", email)` and `403 NOT_LAUNCHED` (A2).
- [X] T017 [US2] In `GET /api/auth/verify` in `src/routes/api.ts`, before the bound fast path, only when `config.allowedEmailKeys` is set: read `pendingLink(token)`; when it exists and its email is not allowed, `logRefusal("session", email)` and redirect to `/login?error=not-launched` (with `&PID=` when present), without consuming the token (A4).
- [X] T018 [US2] In `POST /api/auth/confirm-signin` in `src/routes/api.ts`, after the `Origin` check, the same check → `403 { ...NOT_LAUNCHED, redirect }` (A5).
- [X] T019 [US2] In `session.create.before` in `src/auth/auth.ts`, first: when `config.allowedEmailKeys` is set, read the user's `email` by `session.userId`; not allowed → `logRefusal("session", email)` and `throw new APIError("FORBIDDEN", { message: "not-launched" })` (from `better-auth/api`) before any session is revoked (R3). Also in `user.create.before`, first: when the list is on and the new user's email is not allowed, `logRefusal("session", email)` and throw the same `APIError`, so a refused social sign-in creates no `"user"` row (the native Create Account route refuses earlier, T010).
- [X] T033 [US2] Map a refused social sign-in to the message: give BetterAuth's social sign-in an error callback of `/login` in `src/auth/auth.ts`, find the error value BetterAuth puts on that redirect when `session.create.before` throws `APIError("FORBIDDEN", { message: "not-launched" })` (a test in `tests/allowlist.test.ts`: start the context with `ENV_SIGNIN_METHOD=oauth` and one provider's fake `ENV_OAUTH_<NAME>_CLIENT_ID` and `_SECRET`, stub that provider's token and user-info requests with `vi.spyOn(globalThis, "fetch")` so the callback receives an unlisted email, and assert the redirect and that no `"user"` row remains), and have `src/public/loginCard.js` show the message for it as for `?error=not-launched` (spec edge case, C2).
- [X] T020 [US2] In `src/public/loginCard.js`, beside the `invalid-link` notice, show `NOT_LAUNCHED_MESSAGE`'s text for `?error=not-launched` in the action's status line with the `error` class (C2).

**Checkpoint**: T011–T015 pass.

---

## Phase 5: User Story 3 - The operator turns the list on and off (Priority: P2)

**Goal**: Safe on/off, administrators always in, a count-only log.

**Independent Test**: Start with the setting absent, empty and with two addresses, and an administrator unlisted.

### Tests for User Story 3

- [X] T021 [US3] In `tests/allowlist.test.ts`, add tests: startup logs `Sign-up allowlist on (2 addresses)` for two entries and `off` for none, with neither address in any log line; an `ENV_ADMINS` address not in the list can request a link and sign in (FR-004, FR-006, SC-005).

### Implementation for User Story 3

- [X] T022 [US3] Add `"ENV_ALLOWED_EMAILS": ""` to every configuration in `launch.json.example` and `$env:ENV_ALLOWED_EMAILS = ""` to `devScripts.example/launch-dev.ps1`, beside the SES settings; fix `launch.json.example`'s `"ENV_OPENSEARCH_URL" = "…"` line to use `:` (R7). Extend the template check in `tests/config.test.ts` to expect the empty entry.

**Checkpoint**: T021 passes; quickstart §3 step 1 holds.

---

## Phase 6: User Story 4 - A tester cannot move their account to an unlisted address (Priority: P3)

**Goal**: Email change refuses an unlisted new address, at request and at the link.

**Independent Test**: Signed in as a listed tester, request a change to a listed and to an unlisted address.

### Tests for User Story 4

- [X] T023 [US4] In `tests/allowlist.test.ts`, add `describe("email change (A3, A6)")`: to an unlisted address → `403 not-launched`, nothing captured, log path `email-change`; to a listed one → `202` as today; a change link issued with the list off for an unlisted address, opened with it on → redirect `/profile?error=not-launched` and the address unchanged (FR-010).
- [X] T024 [P] [US4] In `tests/client-not-launched.test.ts`, add: `/profile?error=not-launched` shows the message in the Profile card, and the text equals `NOT_LAUNCHED_MESSAGE` (C3).

### Implementation for User Story 4

- [X] T025 [US4] In `POST /api/me/email-change` in `src/routes/api.ts`, after the rate limit and before the older request is dropped: unlisted `newEmail` → `logRefusal("email-change", newEmail)` and `403 NOT_LAUNCHED` (A3).
- [X] T026 [US4] In `GET /api/me/email-change/verify` in `src/routes/api.ts`, after parsing and before `userByKey`: `change.newEmail` not allowed → `logRefusal("email-change", change.newEmail)` and redirect `/profile?error=not-launched` (A6).
- [X] T027 [US4] In `src/public/profileCard.js`, map `?error=not-launched` to the message where `invalid-link` is shown (C3).

**Checkpoint**: T023–T024 pass.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T028 [P] In `postman/openapi.json`, add the `403` `not-launched` response (body `{ error, code }`) to `/api/auth/create-account`, `/api/auth/request-login-link`, `/api/me/email-change` and `/api/auth/confirm-signin` (with `redirect`), and name the `error=not-launched` redirect in the `302` descriptions of `/api/auth/verify` and `/api/me/email-change/verify`; run `tests/openapi-contract.test.ts` (FR-015).
- [X] T029 [P] In `CLAUDE.md`, add `ENV_ALLOWED_EMAILS` to the Environment Variables table (unset; off when empty; administrators always allowed; encrypted console variable in production) (FR-015).
- [X] T030 [P] Regenerate the affected parts of `README.md` (environment table, sign-in description) and `ARCHITECTURE.md` (the auth flow: the allowlist check points and the session hook) per the constitution's Documentation Deliverables.
- [X] T031 Run `npm test` and `npm run build`; all suites pass (SC-003).
- [ ] T032 Run the quickstart's local checks (§3) and, when the list should take effect, the production step (§2).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2** blocks every story: T004 → T005 → T006 → T007; T001–T003 first.
- **US1 (Phase 3)** and **US2 (Phase 4)** depend only on Phase 2; both edit `src/routes/api.ts`, so run their implementation tasks one after the other.
- **US3 (Phase 5)** depends on Phase 2 (T007) and is independent of US1/US2 otherwise.
- **US4 (Phase 6)** depends on Phase 2; it edits `src/routes/api.ts` and `profileCard.js`.
- **Polish (Phase 7)** after the stories.

### Within Each User Story

Tests first, watched failing; then the handler edits in contract order.

### Parallel Opportunities

- T001 and T002 (different files).
- T009 with T008's implementation work elsewhere; T015 and T024 (client test file) alongside server tasks.
- T028, T029, T030 (different documents).

## Parallel Example: User Story 2

```text
T015 [P] client-not-launched.test.ts   (jsdom, loginCard)
T011–T014   allowlist.test.ts            (server)
then T016 → T017 → T018 (api.ts, in order), T019 (auth.ts), T033 (auth.ts, loginCard.js), T020 (loginCard.js)
```

## Implementation Strategy

### MVP First (User Story 1 Only)

Phase 2 then US1: Create Account is gated. Not enough to ship alone, since Login would still send invitations and links (US2), so treat US1 + US2 as the shippable unit.

### Incremental Delivery

1. Phase 2 + US1 + US2 → the gate is closed on every way in.
2. US3 → templates and the startup line verified.
3. US4 → email change closed.
4. Polish → documentation, full suite, quickstart.

## Notes

- With the setting unset, nothing changes; this is what makes the push to `dev` safe before the console variable exists.
- `[P]` tasks touch different files with no unfinished dependency.
- Commit after each phase; the developer decides when.
