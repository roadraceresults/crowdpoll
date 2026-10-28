---

description: "Task list for the single-email invitation"
---

# Tasks: Single-Email Invitation

**Input**: Design documents from `specs/20261027-133129-SINGLE-EMAIL-INVITE/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R11), data-model.md, contracts/api.md (A1–A3),
contracts/ui-contracts.md (C1–C2, M1), quickstart.md

**Tests**: Requested (Constitution IV). Server suites use supertest on embedded PostgreSQL with the mailer's
`setTransport` stub recording messages (the link is read from the recorded invitation); the card and `tabs.js` are
tested in jsdom, as the `client-*` suites do. Write each story's tests first and watch them fail. Run one vitest at a
time (the embedded PostgreSQL uses a fixed port).

**Organization**: Phase 2 lays the storage, the token, the email and the server-side sign-in every story uses. The
stories then follow in priority order; US1 and US2 are both P1.

**Branch**: `dev`. A push deploys; the migration runs at start-up.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task belongs to (US1–US5)

## Path Conventions

Single project: `src/`, `tests/` at the repository root. No explanatory or requirement-referencing comments in changed
code (Constitution VI). Log lines mask addresses with `maskAddress`; no log line, response or stored value holds a
token (FR-005).

---

## Phase 1: Setup

- [X] T001 Confirm the baseline: `npm run build` and `npm test` pass on `dev` before any change; note any pre-existing failure in this file rather than fixing it here

---

## Phase 2: Foundational

**Purpose**: the token columns, issuing a token at each send, the email's link and sentence, and the server-side
sign-in that Continue uses.

### Tests for the foundation

- [X] T002 [P] `tests/invitation-tokens.test.ts`: after a send, the row holds a `token_hash` that is not the token, `token_expires_at` = the earlier of `end_at` and 30 days, `token_used_at` null; a reminder replaces the hash; `canSignIn` is false for a replaced, used or expired token, a closed or archived poll, a poll no longer Invitation Only and a removed address; `useToken` succeeds once and then fails (data-model "can a token sign in?")
- [X] T003 [P] `tests/invitation-email.test.ts`: with `signInAddress`, the HTML and text parts carry "This button signs you in to CrowdPoll as <address>. Please don't forward this email." under the button and the link `/invite?PID=<pid>&token=…`; in `oauth` mode the link is `/?PID=<pid>` and the sentence is absent; `tests/email-layout.test.ts`'s fixture of every other email still matches (M1)
- [X] T004 [P] `tests/invitations-redeem.test.ts` (foundation part): `mintLoginToken(email)` sends no email, and `completeSignIn` with the minted token signs in, sets `emailVerified`, activates a pending account and adopts its invitations (R5)

### Implementation for the foundation

- [X] T005 `src/db/migrations/011-invitation-tokens.ts` adds `token_hash text`, `token_expires_at timestamptz`, `token_used_at timestamptz` to `poll_invitations` and the unique partial index `poll_invitations_token_hash`; register it in `src/db/migrations/index.ts`; add the three fields to `PollInvitationTable` in `src/db/schema.ts` (data-model)
- [X] T006 `src/invitations/tokens.ts`: `issueInvitationToken(db, pid, email, endAt, now)` (32 random bytes `base64url`, stores `hashToken`, expiry, clears `token_used_at`, returns the token); `findSignInToken(db, pid, token)` returning `{ email }` or `null` per the data-model rule; `useToken(db, pid, token)` as a conditional update on `token_used_at is null` returning whether it won (R1, R2)
- [X] T007 `src/email/templates.ts`: `invitationMessage` takes an optional `signInAddress` and, when set, adds the M1 sentence under the button in both parts, escaped like the rest; nothing else in the layout changes (R10)
- [X] T008 `src/invitations/sender.ts`: `buildInvitation` reads the poll once and returns a renderer per recipient; in `sendPendingInvitations` and `sendReminder`, when `config.nativeSignin`, issue a token for each address just before `deliver` and render with `link: ${publicOrigin}/invite?PID=<pid>&token=<token>` and `signInAddress: email`; otherwise keep `/?PID=<pid>` and no sentence (R2, R3)
- [X] T009 `src/auth/auth.ts`: in `sendMagicLink`, when `metadata.mint` is a string, store the token in an exported in-process map under it instead of emailing; add `RATE_LIMITED.redeemInvitation = "/redeem-invitation"` with `emailRateLimit(config)` to `customRules` (R5, R6)
- [X] T010 `src/routes/api.ts`: `mintLoginToken(email)` beside `issueLoginLink` — `supersedeLoginLinks`, `auth.api.signInMagicLink` with `metadata: { mint }`, takes the token out of the map and deletes the entry, sets no binding cookie; throws when the plugin fails or no token is under the id (R5)
- [X] T011 [P] `devScripts/render-invitation-email.ts` renders with a sample `signInAddress` and an `/invite?PID=…&token=sample` link

**Checkpoint**: invitations carry a working token link; the server can sign an address in without an email.

---

## Phase 3: User Story 1 - A new invitee reaches the poll from the invitation alone (Priority: P1) 🎯 MVP

**Goal**: an address with no account opens the invitation, ticks the Terms box, presses Continue and sees the poll.

**Independent Test**: quickstart §1.

### Tests for User Story 1

- [X] T012 [P] [US1] `tests/invitations-redeem.test.ts`: `GET /invite` with a valid token and no session answers `200` `invite.html` with `no-store` and writes nothing (row unchanged, no user, no session); A2 answers `{ email: masked, hasAccount: false, signedInAs: null, termsVersion, staySignedInDefault, providers: [] }`; A3 without `acceptedTerms` → `400 terms-required` and nothing created; A3 with the Terms → `200 { redirect: "/?PID=<pid>" }`, a `session_token` cookie, a user with `name ""`, `emailVerified` true, `terms_version` current, the token used, and the recorder holding only the invitation; following the redirect sets the invitation's `accepted_at` (Accepted in the invitee list) (A1–A3, SC-001, FR-022)
- [X] T013 [US1] `tests/invitations-redeem.test.ts`: A3 with a foreign or missing `Origin` → `403`; past the rate limit → `429`, while a press without the Terms and a press with a token that cannot sign in consume no attempt; an address outside `ENV_ALLOWED_EMAILS`, with the Terms accepted → `403 not-launched` and nothing created; a second A3 with the same token → `200 { redirect: "/?PID=<pid>" }` and no second session; the console output captured over a full send and redeem never contains the token text (FR-005, FR-017, FR-019, edge cases)
- [X] T014 [P] [US1] `tests/client-invite-card.test.ts`: with A2 stubbed `hasAccount: false`, the card shows "Continue as j•••@gmail.com", the unticked Terms box, Stay signed in as `staySignedInDefault` says, Continue disabled until the box is ticked; Continue posts A3 with `acceptedTerms`, `termsVersion` and `stay` and goes to `redirect`; an A3 error shows its `error` in the `role="status"` area; an A2 `404` follows its `redirect` (C1)

### Implementation for User Story 1

- [X] T015 [US1] `src/routes/api.ts`: `GET /api/invitations/link-info` (A2, `nativeOnly`, `no-store`) using `findSignInToken`, `userByKey`, the current session and `maskAddress`
- [X] T016 [US1] `src/routes/api.ts`: `POST /api/invitations/redeem` (A3) in the order of research R6 — `Origin`, `findSignInToken`, the Terms check for an address without an account, `consumeRateLimit(RATE_LIMITED.redeemInvitation)`, `isAllowed`, account creation as `create-account` does (`createUser`, `recordAgreement`), `mintLoginToken` (on failure: log `[invite] Sign-in could not be completed for <masked>`, answer `500` with the generic error body, token left unused), `useToken`, `completeSignIn(req, res, token, stay, pid)`; logs `[invite] Invitation redeemed for <masked> (new account|existing account)` and each refusal
- [X] T017 [US1] `src/routes/pages.ts`: `GET /invite` (A1) — invalid `PID` → `/login?error=invalid-link` or `/`; token cannot sign in → `/?PID=<pid>`; otherwise `invite.html` with `no-store`; `404` when `!config.nativeSignin`
- [X] T018 [US1] `src/legal/termsGate.ts`: add `/invite` to `PAGE_ROUTES` and `GET /api/invitations/link-info`, `POST /api/invitations/redeem` to `ALLOWED_API`
- [X] T019 [P] [US1] `src/public/invite.html` and `src/public/inviteCard.js`: the card of C1 for a signed-out browser (both account cases), from `confirm-signin.html` / `confirmSigninCard.js` and the Terms box of `createAccountCard.js`, with the site's header, footer and cookie banner like the other sign-in pages
- [X] T020 [US1] Register the page's sheets in `tests/m3-assets.test.ts` `PAGES` (as `confirm-signin.html`) and in `devScripts/build-assets.ts` if it lists pages

**Checkpoint**: User Story 1 works end to end; SC-001 and SC-003 (new invitee) hold.

---

## Phase 4: User Story 2 - An existing account holder reaches the poll in one click (Priority: P1)

**Goal**: an account holder continues without the Terms box, or goes straight in when already signed in.

**Independent Test**: quickstart §3.

### Tests for User Story 2

- [X] T021 [US2] `tests/invitations-redeem.test.ts`: for an existing account, A2 says `hasAccount: true`; A3 without the Terms signs in and uses the token, leaving the account's name unchanged; an account without the current Terms then meets the gate's `/accept-terms?next=` on `/?PID=`; `GET /invite` from a browser signed in as the invited address (also with a dot or `+tag` variant of a Gmail address) sets `token_used_at` and redirects to `/?PID=<pid>` with no card (FR-012, FR-020, SC-002)
- [X] T022 [US2] `tests/client-invite-card.test.ts`: with `hasAccount: true`, no Terms box and Continue enabled at once

### Implementation for User Story 2

- [X] T023 [US2] `src/routes/pages.ts` `GET /invite`: when the session's address has the invited address's email key (`emailKeyOf`), `useToken` and redirect to `/?PID=<pid>` (R4 step 3)
- [X] T024 [US2] `src/public/inviteCard.js`: hide the Terms box and enable Continue when `hasAccount` is true; posts without `acceptedTerms`

**Checkpoint**: SC-002 holds.

---

## Phase 5: User Story 3 - Every poll link lands on the poll, maximized (Priority: P2)

**Goal**: a landing that names a poll always shows it maximized.

**Independent Test**: quickstart §7.

### Tests for User Story 3

- [X] T025 [P] [US3] jsdom test in `tests/client-landing.test.ts` (the suite that already covers `applyLanding`): `/?open=<pid>&tab=shared-with-you` for a poll already in the tab and for one fetched by `mountLinkedPoll` both end maximized; Escape restores the tab with the card in it (C2, SC-004)

### Implementation for User Story 3

- [X] T026 [US3] `src/public/tabs.js` `applyLanding`: after `await mountLinkedPoll(grid, landing.pid)`, call `grid.maximize(landing.pid)` when the card was mounted (R9)

**Checkpoint**: SC-004 holds.

---

## Phase 6: User Story 4 - A browser signed in as someone else (Priority: P2)

**Goal**: the card explains the other address and switches in one press, or stays.

**Independent Test**: quickstart §4.

### Tests for User Story 4

- [X] T027 [US4] `tests/invitations-redeem.test.ts`: signed in as another account, A2 returns `signedInAs` masked; A3 without `signOut` → `409 other-account` and nothing changes; with `signOut: true` the other account's session row and cache entry are gone, the browser is signed in as the invited address, and for an address with no account the Terms are required first (FR-013, clarification 2026-10-27)
- [X] T028 [US4] `tests/client-invite-card.test.ts`: with `signedInAs` set, the card shows the full message of C1, "Sign out and continue as j•••@gmail.com" (disabled behind the Terms box when `hasAccount` is false) and "Stay as <signedInAs>"; the first posts `signOut: true`; the second goes to `/` with no request

### Implementation for User Story 4

- [X] T029 [US4] `src/routes/api.ts` A3: when the request carries a session for another account, require `signOut: true` (else `409`), then end that session as `POST /api/auth/logout` does before signing in; A2 adds `signedInAs`
- [X] T030 [US4] `src/public/inviteCard.js`: the other-account variant of C1

**Checkpoint**: User Story 4 works in both directions.

---

## Phase 7: User Story 5 - Old, used and expired links still lead somewhere sensible (Priority: P3)

**Goal**: no invitation link dead-ends.

**Independent Test**: quickstart §2 and §5.

### Tests for User Story 5

- [X] T031 [US5] `tests/invitations-redeem.test.ts`: `GET /invite` with a replaced, used, expired, revoked (address removed) or unknown token → `302 /?PID=<pid>`; with `PID=not-a-poll` → `/login?error=invalid-link` signed out and `/` signed in; a plain `GET` of a valid link (a scanner) leaves the token able to sign in; in `oauth` mode `/invite`, A2 and A3 answer `404` (FR-015, FR-016, SC-005, SC-006)

### Implementation for User Story 5

- [X] T032 [US5] Confirm `GET /invite` and A2/A3 meet T031 with the code of T006, T015–T017; fix only what fails

**Checkpoint**: SC-005 and SC-006 hold.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T033 [P] `src/public/inviteCard.js` with `providers` non-empty (`both`): the provider buttons as on the Login page; a jsdom case in `tests/client-invite-card.test.ts` (FR-014)
- [X] T034 [P] `src/public/privacy.html` `#invitations`: add that the invitation's button can sign the invitee in once, for up to 30 days, and cannot be used by anyone else after that (R11)
- [X] T035 [P] `postman/openapi.json`: add A2 and A3 with their responses
- [X] T036 [P] `README.md` and `ARCHITECTURE.md`: the invitation link, the confirmation card and the migration `011-invitation-tokens`, in the places the Poll Invitations feature is described
- [X] T037 Run `npm run build` and the full `npm test`; walk quickstart §1–§7 by hand (build passed, 58 fingerprinted assets; full suite 125 files / 1687 tests passed, 15 skipped Valkey-integration tests; the quickstart §1–§7 browser walk is left to the developer)
- [X] T038 [P] `.do/app.yaml`: raise `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW` from `2` to `5` (per the 15-minute `ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW`), since Continue now counts against the same limit as the emailed sign-in links (R6)

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T011)** → stories.
- **US1 (T012–T020)** needs the foundation; **US2 (T021–T024)** needs US1's routes and card; **US4 (T027–T030)** needs US1's routes and card; **US5 (T031–T032)** needs US1's routes.
- **US3 (T025–T026)** needs nothing but `tabs.js` and can run at any time after Setup.
- **Polish (T033–T038)** after the stories it touches; T037 last.

### Parallel Opportunities

- T002, T003, T004 together; T011 beside T005–T010.
- In US1: T012 then T013 (one file), beside T014; T019 beside T015–T018.
- US3 entirely in parallel with US1, US2, US4, US5.
- In Polish: T033–T036 and T038 together.

## Parallel Example: User Story 1

```text
Task: "T012 tests/invitations-redeem.test.ts — new-invitee path"
Task: "T013 tests/invitations-redeem.test.ts — refusals"   (same file as T012: after it)
Task: "T014 tests/client-invite-card.test.ts — new-account card"
Task: "T019 src/public/invite.html + inviteCard.js"
```

## Implementation Strategy

### MVP First (User Story 1)

1. T001, then the foundation T002–T011.
2. US1 T012–T020; stop and walk quickstart §1.

### Incremental Delivery

1. US1 → US2 (both P1) → deploy-ready.
2. US3 and US4 (P2), US5 (P3) checks, then Polish.
