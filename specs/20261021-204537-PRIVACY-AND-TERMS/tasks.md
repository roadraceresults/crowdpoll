---

description: "Task list for the Privacy Policy, Terms of Service and account deletion"
---

# Tasks: Privacy Policy, Terms of Service and Account Deletion

**Input**: Design documents from `specs/20261021-204537-PRIVACY-AND-TERMS/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R14), data-model.md, contracts/api.md (A1–A9), contracts/ui-contracts.md (C1–C8), contracts/email-messages.md (M1–M2), contracts/privacy-policy.md, contracts/terms-of-service.md, quickstart.md

**Tests**: Requested. SC-001–SC-007 and FR-024 call for automated checks (quickstart §2). Write each story's tests first and watch them fail.

**Organization**: Tasks are grouped by user story. Phase 2 holds the version, the migration and the session read that US2, US3 and US4 share.

**Branch**: `dev`. A push to `dev` deploys; the migration runs at start-up and the existing tester accounts are asked to accept the Terms on their next visit (quickstart §4).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task belongs to (US1–US5)

## Path Conventions

Single project: `src/`, `tests/` at the repository root. Server tests use `startTestContext()` from `tests/helpers/setup.js` and the captured mail transport; browser tests use `openPage()` from `tests/helpers/browser.js`. No explanatory comments in new code (Constitution VI).

---

## Phase 1: Setup

**Purpose**: The committed font files and the reviewed draft texts the pages are built from.

- [X] T001 Fetch the Fraunces, Inter and Roboto variable `woff2` files (Latin and Latin Extended) per quickstart §1 into `src/public/fonts/` (`fraunces-latin.woff2`, `fraunces-latin-ext.woff2`, `inter-latin.woff2`, `inter-latin-ext.woff2`, `roboto-latin.woff2`, `roboto-latin-ext.woff2`) with `OFL-fraunces.txt`, `OFL-inter.txt`, `OFL-roboto.txt`, and write `src/public/fonts/fonts.css` with one `@font-face` per file (`font-display: swap`, its `unicode-range`, `url("/fonts/<file>.woff2")`) (R11)
- [X] T002 [P] Create `src/legal/version.ts` exporting `TERMS_VERSION = "2026-11-01"` (R2)

---

## Phase 2: Foundational

**Purpose**: The migration, the schema, and the session read that carries the agreement.

### Tests for the foundation

- [X] T003 [P] Write `tests/migration-terms-privacy.test.ts`: after migrating, `user` has nullable `terms_version` and `terms_accepted_at`; a `session` row inserted with an IP address and user agent before migration `009` has both null after it; a poll with a `vote_history` row has `ever_voted = true` and one without has `false`; `down` drops the `user` columns and `ever_voted` (data-model)
- [X] T004 [P] Extend `tests/session-cache.test.ts`: a cache-miss lookup returns `user.termsVersion` read from `terms_version` alongside `permissions`, and the cached copy carries it (R3)

### Implementation for the foundation

- [X] T005 Create `src/db/migrations/009-terms-and-privacy.ts` (add both `user` columns; add `polls.ever_voted boolean not null default false` backfilled from `vote_history`; null `ipAddress`/`userAgent` on every `session` row; `down` drops the columns) and register it in `src/db/migrations/index.ts`; add `terms_version: string | null` and `terms_accepted_at: Timestamp | null` to `UserTable` in `src/db/schema.ts`
- [X] T006 In `src/auth/sessionCache.ts`, select `terms_version` with `permissions` in `lookup()` and set `session.user.termsVersion` (R3)
- [X] T007 Create `src/legal/recordAgreement.ts` exporting `recordAgreement(db, sessions, userId, now)` that sets `terms_version = TERMS_VERSION` and `terms_accepted_at = now` and calls `sessions.forgetUserSessions(userId)` (R3)

**Checkpoint**: T003 and T004 pass; nothing visible has changed.

---

## Phase 3: User Story 1 — Anyone can read how CrowdPoll treats their data (Priority: P1) 🎯 MVP

**Goal**: `/privacy` and `/terms` for everyone, linked from a footer on every page and from the cookie banner (FR-001–FR-005, FR-011–FR-013).

**Independent Test**: As a guest, open each page, follow each footer link; the documents open without signing in and Cookie Use lands on the cookie table.

### Tests for User Story 1

- [X] T008 [P] [US1] Write `tests/legal-pages.test.ts`: `GET /privacy` and `/terms` answer `200` for a guest; each contains `TERMS_VERSION` and no other `Version ` value; `/privacy` has the ids `cookies`, `retention`, `rights`, `contact` and an "In short" section; `/privacy.html` redirects to `/privacy`; `/api/config` includes `termsVersion` (A1, A2, R2)
- [X] T009 [P] [US1] Write `tests/client-footer.test.ts`: on `index.html`, `login.html`, `profile.html`, `privacy.html` the footer exists once with links `/privacy`, `/terms`, `/privacy#cookies` and both `mailto:` addresses; the cookie banner contains a `/privacy#cookies` link (C1, C2)
- [X] T010 [P] [US1] Extend `tests/mailer.test.ts`: every message's text part contains `<origin>/privacy` and `<origin>/terms` and its HTML part links both (M2)

### Implementation for User Story 1

- [X] T011 [P] [US1] Create `src/public/privacy.html` from `contracts/privacy-policy.md` (head as `profile.html`'s with `/fonts/fonts.css`, `legal-m3.css`, `footer-m3.css`; `<main class="legal-doc">`; the version line; the In short box; section ids; the Cookie Use table rows carrying `data-storage` and `data-name`; placeholders kept) (R1, C8)
- [X] T012 [P] [US1] Create `src/public/terms.html` from `contracts/terms-of-service.md` the same way (R1, C8)
- [X] T013 [P] [US1] Create `src/public/legal-m3.css` (C8) and `src/public/footer-m3.css` (C1), Material 3 tokens only
- [X] T014 [US1] In `src/routes/pages.ts`, add `router.get("/privacy", page("privacy.html"))` and `router.get("/terms", page("terms.html"))`; in `src/routes/api.ts` add `termsVersion: TERMS_VERSION` to `/api/config` (A1, A2)
- [X] T015 [US1] In `src/public/app.js`, add `renderSiteFooter()` (C1, current year) called beside `renderCookieBanner()`, and the Cookie Use link in the banner (C2)
- [X] T016 [US1] Add `<link rel="stylesheet" href="/footer-m3.css">` as the last layer to the eight existing pages in `src/public/*.html`, and add `footer-m3.css` and `legal-m3.css` to `LAYER_ORDER` and the page entries (including `privacy.html`, `terms.html`) in `tests/m3-assets.test.ts`
- [X] T017 [US1] In `src/email/templates.ts`, add the policy line to `FOOTER` for the text and HTML parts (M2)

**Checkpoint**: T008–T010 pass; a guest can read both documents from any page.

---

## Phase 4: User Story 2 — A new person agrees to the Terms before an account is created (Priority: P1)

**Goal**: agreement required and recorded at Create Account; every account that has not accepted `TERMS_VERSION` is stopped by the gate until it accepts (FR-006–FR-010).

**Independent Test**: Create Account without the box (refused, nothing created), then with it (version and time recorded); an older account lands on `/accept-terms` and its API calls answer `403 terms-required`.

### Tests for User Story 2

- [X] T018 [P] [US2] Write `tests/terms-agreement.test.ts`: create-account without `acceptedTerms`, or with another `termsVersion`, answers `400 terms-required`, creates no user, sends no mail and consumes no rate limit; with both, the new user has `terms_version = TERMS_VERSION` and a `terms_accepted_at`; an existing account submitted with agreement is stamped too (A3, R4)
- [X] T019 [P] [US2] Write `tests/terms-gate.test.ts` with a session whose `terms_version` is null: `GET /api/me/polls` → `403 terms-required`; `GET /api/me` → `200` with `termsAccepted: false`; `GET /api/config`, `POST /api/auth/logout` pass; `GET /profile` and `GET /?PID=…` → `302 /accept-terms?next=…`; `GET /privacy`, `/terms`, an asset and `/healthz` pass; with that old session cookie still set, `GET /api/auth/verify` for a fresh link signs in and redirects (no `403`), and `POST /api/auth/confirm-signin`, `GET /api/auth/link-info`, `GET /api/me/email-change/verify`, `POST /api/auth/create-account` and `POST /api/auth/request-login-link` are not refused by the gate (I2); a guest and an accepted user are unaffected (A4, A5, R5)
- [X] T020 [P] [US2] Write `tests/accept-terms.test.ts`: `POST /api/legal/accept-terms` with a foreign `Origin` → `403`; without session → `401`; wrong version → `400`; correct → records, returns `redirect` = `next` for `/profile`, `/` for `//evil.example` and `https://evil.example`; the next request passes the gate; `GET /accept-terms` for a guest or an accepted user redirects to `next` (A6, A7, R6)
- [X] T021 [P] [US2] Write `tests/client-terms-box.test.ts`: on `create-account.html` the action stays disabled with an address and no tick, enables once ticked, and the request body carries `acceptedTerms: true` and `termsVersion`; on `login.html` (native) the agreement line links both documents; in oauth mode the provider buttons are `aria-disabled` until the box is ticked; on `accept-terms.html` Accept is disabled until ticked and posts to `/api/legal/accept-terms` (C3–C5)

### Implementation for User Story 2

- [X] T022 [US2] In `src/routes/api.ts` create-account, after email validation and before the rate limit, refuse a missing agreement or other version with `400 { error, code: "terms-required" }` (A3 wording) and log `[legal] Create-account refused: terms not accepted`; after creating (or finding) the account, call `recordAgreement` (R4)
- [X] T023 [US2] Create `src/legal/termsGate.ts` exporting `createTermsGate({ sessions })` per R5/A4 (`PAGE_ROUTES` set, the allowed API routes of A4 including the sign-in and verification link routes, `next` built from `req.originalUrl`), and mount it in `src/server.ts` right after `app.use("/api", express.json())`
- [X] T024 [US2] In `src/routes/api.ts`, add `termsAccepted` to `GET /api/me`, and `POST /api/legal/accept-terms` (Origin check as confirm-signin, version check, `recordAgreement`, safe `next`, log line) (A5, A7)
- [X] T025 [P] [US2] Create `src/public/accept-terms.html` (the same head as `privacy.html`: `/fonts/fonts.css`, `card-shell-m3.css`, `footer-m3.css`; added to the page entries of `tests/m3-assets.test.ts`) and `src/public/acceptTermsCard.js` (C5), and in `src/routes/pages.ts` add `GET /accept-terms` (page for a signed-in user who has not accepted; otherwise redirect to the safe `next`) (A6)
- [X] T026 [P] [US2] In `src/public/createAccountCard.js`, add the agreement box (C3), gate the action on field and box, and send `acceptedTerms` and `termsVersion` from `/api/config`
- [X] T027 [P] [US2] In `src/public/loginCard.js`, add the agreement line in native mode and the gating box above the provider buttons in oauth mode (C4)
- [X] T028 [US2] In `src/public/app.js`, add the shared helper that sends the browser to `/accept-terms?next=<current path>` when `/api/me` reports `termsAccepted: false` or a response carries `code: "terms-required"` (C5)

**Checkpoint**: T018–T021 pass; a fresh account records agreement and an old one is stopped until it accepts.

---

## Phase 5: User Story 3 — A user deletes their account (Priority: P2)

**Goal**: Delete Account on the Profile page deletes what is the user's and anonymizes their votes on others' polls, in one transaction (FR-014–FR-019).

**Independent Test**: An account with its own poll, a vote on another's poll, a bookmark, an invitation and a ban is deleted; check each table and the other poll's counts.

### Tests for User Story 3

- [X] T029 [P] [US3] Write `tests/account-deletion.test.ts`: `DELETE /api/me` with a foreign `Origin` → `403`, `confirm` other than `DELETE` → `400`; on success → `200 { redirect: "/" }`, cookie cleared, the user, sessions, sign-in links, bookmarks, `user_polls`, invitations and own polls (with votes, history and a `search_outbox` row each) are gone; the vote on another user's poll has a `@deleted.invalid` address and `Deleted user`, its history row the same address, and that poll's counts and `content_version` reflect it (counts equal, version bumped); the ban remains; the user's other session is refused at once (cache dropped); M1 is sent to the address; a forced failure inside the transaction leaves everything in place and answers `500`; the log line has the masked address and counts; a vote queued for the account before deletion and drained after it is not stored (U2) (A8, R8, FR-016–FR-019)
- [X] T030 [P] [US3] Write `tests/client-delete-account.test.ts`: on `profile.html` the Your Data section has Delete Account; the dialog is `aria-modal`, its delete button is disabled until the field is exactly `DELETE`, Escape closes it, success navigates to `/`, a failure shows in the dialog; a Participants row and an admin roster entry whose address ends `@deleted.invalid` show "Deleted user" and never the address (C6, C7, C9)

### Implementation for User Story 3

- [X] T031 [US3] Create `src/legal/deleteAccount.ts` exporting `deleteAccount({ db, cache, sessions }, user)` per R8 and data-model "What deletion touches", returning `{ pollsDeleted, votesAnonymized }`
- [X] T032 [US3] In `src/email/templates.ts` and `src/email/mailer.ts`, add the M1 message and `sendAccountDeleted(origin, address)`
- [X] T033 [US3] In `src/routes/api.ts`, add `DELETE /api/me` (Origin check, `confirm`, `deleteAccount`, clear-cookie header, M1 with its failure logged, the `[account]` log line, `500` on failure) (A8)
- [X] T050 [US3] In `src/votes/consumer.ts`, before inserting a batch, skip entries whose address is in the `deleted-accounts` cache set (written by `deleteAccount`, one hour), reconcile the affected polls' counters, and log `[votes] Skipped <n> queued vote(s) from deleted accounts` (R8, U2). Implemented with the cache set rather than "no `user` row": several suites queue votes for addresses that have no account
- [X] T051 [P] [US3] In `src/public/adminResults.js` (the results page is the only place a voter's address is shown; the cards show none), show any address ending `@deleted.invalid` as "Deleted user" (C9)
- [X] T034 [US3] In `src/public/profileCard.js` (and its sheet `src/public/profile-editor-m3.css`), add the Your Data section with Delete Account and the dialog (C6, C7)

**Checkpoint**: T029–T030 pass (T050, T051 included).

---

## Phase 6: User Story 4 — CrowdPoll keeps only what it needs (Priority: P2)

**Goal**: no third-party request, no IP or user agent on sessions, masked IPs in logs, the retention sweep, and a checked Cookie Use list (FR-020–FR-024).

**Independent Test**: Every page's references stay on CrowdPoll's origin; a new session has null IP and user agent; the rate-limit log line is masked; the sweep removes expired rows and old partitions; the Cookie Use list matches.

### Tests for User Story 4

- [X] T035 [P] [US4] Write `tests/no-third-party.test.ts`: no resource a page loads points at another origin, i.e. no `<link href>`, `<script src>` or `<img src>` in `src/public/*.html` and no `url(...)` or `@import` in `src/public/*.css` with an absolute `http(s)://` or `//` URL (plain `<a href>` links, such as priv.gc.ca, are allowed; in particular nothing names `fonts.googleapis.com` or `fonts.gstatic.com`); every page links `/fonts/fonts.css`; every `url(...)` in `fonts.css` names a file that exists in `src/public/fonts/` (FR-023, SC-005)
- [X] T036 [P] [US4] Write `tests/privacy-minimization.test.ts`: after sign-in the `session` row has null `ipAddress` and `userAgent`; `maskIp` gives `203.0.113.x` and `2001:db8:85a3::x`; hitting the create-account and login-link rate limits logs a masked IP and never the full one; with the console captured across sign-up, sign-in, email change, voting and account deletion, no line contains a full email address or a full IP address, and any existing line it finds is fixed to use `maskAddress`/`maskIp` (FR-021, FR-022, R10)
- [X] T037 [P] [US4] Write `tests/retention-sweep.test.ts`: with expired and live `session`, `verification`, `email_change_requests` and `rateLimit` rows and a `vote_history` partition 13 months old and one 11 months old, `retentionSweep` removes only the expired rows and drops only the old partition, and logs the counts; a poll whose only history was in the dropped partition still counts as voted (`hasVoteHistory` true, its fields still frozen) (FR-020, R9)
- [X] T038 [P] [US4] Write `tests/cookie-use-list.test.ts`: the `data-name` rows of `privacy.html`'s Cookie Use table equal the set of cookie names the server sets during create-account, sign-in and verify plus the `localStorage`/`sessionStorage` keys used in `src/public/*.js` (literal keys and constants such as `AUTH_FALLBACK_KEY`, `COPY_KEY`, `TAB_KEY`) (FR-024, R13)

### Implementation for User Story 4

- [X] T039 [US4] In the eight existing `src/public/*.html` heads (and the three new pages), replace the two `preconnect` links and the Google Fonts stylesheet with `<link rel="stylesheet" href="/fonts/fonts.css">` (R11)
- [X] T040 [P] [US4] Create `src/auth/maskIp.ts`; in `src/routes/api.ts` use it in the two rate-limit log lines (R10)
- [X] T041 [P] [US4] In `src/auth/auth.ts` `session.create.before`, return `{ data: { ...session, ipAddress: null, userAgent: null } }` (R10)
- [X] T042 [US4] In `src/polls/sweeps.ts`, add `SWEEP_LOCKS.retention = 11`, `retentionSweep(deps, config, now)` per R9, and its daily schedule in `buildSweepSchedules`
- [X] T053 [US4] In `src/polls/store.ts`, set `ever_voted = true` wherever a `vote_history` row is inserted (`recordVote` and the second insert in `src/polls/store.ts`, and the batch insert in `src/votes/consumer.ts`, each in the same transaction) and make `hasVoteHistory` / `pollsEverVoted` read `polls.ever_voted` instead of probing `vote_history`; add `ever_voted` to `PollTable` in `src/db/schema.ts` (R9, U1)

**Checkpoint**: T035–T038 pass.

---

## Phase 7: User Story 5 — A user knows how to reach CrowdPoll about their data (Priority: P3)

**Goal**: the Your Data section explains how to get a copy and links the policy; `privacy@` delivers (FR-014, FR-025).

**Independent Test**: The Profile page shows the copy text and the policy link; a message to `privacy@crowdpoll.vote` arrives.

- [X] T043 [P] [US5] Extend `tests/client-delete-account.test.ts`: the Your Data section contains `privacy@crowdpoll.vote`, "within 30 days" and a link to `/privacy` (C6)
- [X] T044 [US5] In `src/public/profileCard.js`, add the copy-request text and the policy link to Your Data (C6)

**Checkpoint**: T043 passes; the alias itself is checked in T049.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T045 [P] Update `postman/openapi.json`: `termsVersion` in config, the create-account request fields and its `400 terms-required`, the `terms-required` 403 response on signed-in operations, `termsAccepted` on `/api/me`, `POST /api/legal/accept-terms`, `DELETE /api/me`, `GET /accept-terms`, `/privacy`, `/terms`; keep `tests/openapi-contract.test.ts` passing
- [X] T046 [P] Update `CLAUDE.md`: the cookie banner and cookie policy lines mention the Cookie Use section; Project Overview mentions account deletion and the Terms agreement
- [X] T047 Regenerate `README.md` and `ARCHITECTURE.md` (Constitution, Documentation Deliverables): the legal pages, the terms gate, account deletion, the retention sweep, self-hosted fonts
- [X] T048 Run `npm test` and `npm run build`; fix any failure (quickstart §2)
- [X] T049 Manual: quickstart §3 local checks (time step 6, deleting an account from the Profile page: under one minute, SC-003); then, after the operator pushes, quickstart §4 (the ImprovMX `privacy` alias and a test message)
- [ ] T052 Manual (operator, before `ENV_ALLOWED_EMAILS` is removed): quickstart §5: replace the placeholders, confirm the two `[TO CONFIRM]` facts and ImprovMX's location, and have a lawyer review both documents (FR-005, FR-020) — placeholders, retention facts and ImprovMX location done 2026-10-22 (TWEAKS05, TWEAKS06); the lawyer review is still open

---

## Dependencies & Execution Order

- **Phase 1** → **Phase 2** → user stories.
- **US1** needs T001 only for the page heads it creates (fonts.css exists); otherwise independent.
- **US2** needs Phase 2 (T005–T007). T025 needs T024's route; T028 after T024.
- **US3** needs Phase 2 (the migration) and is independent of US2's code, but its tests run with the gate on, so test sessions are created with an accepted `terms_version` (the shared helper in `tests/helpers/`, added as part of T023).
- **US4**: T039 needs T001; T041 and T040 are independent; T053 before T042 (the sweep may drop history only once "ever voted" reads the flag).
- **US5** after US3 (same file, `profileCard.js`).
- **Phase 8** after all stories.

Test-session note: once the gate exists (T023), every existing test that signs in must create users with `terms_version = TERMS_VERSION`; do this once in the test helpers (`forgeSession` and the sign-in helpers in `tests/helpers/`), as part of T023.

## Parallel Examples

- Phase 1: T001 ‖ T002.
- US1: T008 ‖ T009 ‖ T010, then T011 ‖ T012 ‖ T013.
- US2: T018 ‖ T019 ‖ T020 ‖ T021; then T025 ‖ T026 ‖ T027 after T024.
- US3: T029 ‖ T030; T051 ‖ T031.
- US4: T035 ‖ T036 ‖ T037 ‖ T038; then T040 ‖ T041.

## Implementation Strategy

1. **MVP = US1**: the documents and the footer; deployable alone (the allowlist keeps the public out).
2. **US2** next: the agreement and the gate, so launch can follow the lawyer's review.
3. **US3 + US4**: deletion and minimization, which make the policy true.
4. **US5** and Phase 8.
