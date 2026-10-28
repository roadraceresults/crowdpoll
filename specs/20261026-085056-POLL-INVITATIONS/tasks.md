---

description: "Task list for poll invitations"
---

# Tasks: Poll Invitations

**Input**: Design documents from `specs/20261026-085056-POLL-INVITATIONS/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R16), data-model.md, contracts/api.md (A1–A5),
contracts/ui-contracts.md (C1–C9), contracts/email-messages.md (M1–M2), quickstart.md

**Tests**: Requested (quickstart §1, Constitution IV). Server suites use supertest on embedded PostgreSQL with the
mailer's `setTransport` stub recording messages; the admin card is tested in jsdom, as the `client-admin-*` suites
do. Write each story's tests first and watch them fail. Run one vitest at a time (the embedded PostgreSQL uses a
fixed port).

**Organization**: Phase 1 records the stand-alone drafts (User Story 5), which the spec requires before production
code changes (FR-038 to FR-040) and which are already done. Phase 2 lays the storage, the setting, the email
layout's second heading line and the status reading every story uses. The stories then follow in priority order.

**Branch**: `dev`. A push deploys; the migration runs at start-up.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task belongs to (US1–US5)

## Path Conventions

Single project: `src/`, `tests/` at the repository root; the drafts live in
`requirements/20261026-085056-poll-invitations/`. No explanatory or requirement-referencing comments in changed code
(Constitution VI). Every log line masks addresses with `maskAddress`.

---

## Phase 1: Setup — the stand-alone drafts (User Story 5, Priority P3, done first by FR-039, FR-040)

**Goal**: a stand-alone copy of today's admin card with the Invitees panel drawn on it, and a draft of the invitation
email, both opened from disk.

**Independent Test**: double-click `requirements/20261026-085056-poll-invitations/admin-card.html` and
`invitation-email.html` with no server running (quickstart §2).

- [X] T001 [US5] `devScripts/capture-admin-card.ts` (negated in `.gitignore`) renders `renderReadOnly()` of `src/public/adminCard.js` in jsdom for the reference poll and writes `requirements/20261026-085056-poll-invitations/admin-card.html`, `admin-card.css` (the used rules of the production sheets in light, dark and no-attribute states) and `fonts/`; it refuses to overwrite without `--force` (R11, C1)
- [X] T002 [US5] `requirements/20261026-085056-poll-invitations/admin-card.js`: production's ripple and tooltips, the Light/Dark and Open poll/Closed poll switches, and the fixture Invitees panel (add, refusals, row menus, inline confirmation, paging); no request to any server (C1)
- [X] T003 [US5] The Invitees panel drawn on `admin-card.html` / `admin-card.css` (`/* Invitees panel (new) */`, Material 3 tokens only) with one fixture invitee in each status and `Accepted Count` in the counts panel; reviewed (C2–C6)
- [X] T004 [US5] `devScripts/render-invitation-email.ts` (negated in `.gitignore`) renders the approved wording through `layout()` into `requirements/20261026-085056-poll-invitations/invitation-email.html` with `email-logo.png`, with switches for the message, votes, the end and the part (C9, M1, M2)

**Checkpoint**: done and reviewed. The production panel follows `admin-card.html`; the production email follows `invitation-email.html`.

---

## Phase 2: Foundational

**Purpose**: the migration, the setting, the roster write that keeps invitation state, the layout's second heading
line and the status reading.

### Tests for the foundation

- [X] T005 [P] Create `tests/migration-invitations.test.ts`, modelled on `tests/migration-terms-privacy.test.ts`: `010-invitations` adds `added_at`, `sent_at`, `reminded_at`, `send_failed_at`, `accepted_at` to `poll_invitations`, the `poll_invitations_email_key` expression index, `polls.time_zone`, `invitation_emails (creator_id, sent_at)` with its index, and `invitation_history (poll_id, email_key, sent_at, reminded_at)` with its primary key and cascade from `polls`; existing invitation rows on polls in `OPEN`, `EDITING`, `CLOSED` or `ARCHIVED` get `sent_at = added_at`, rows on `INITIALIZED`, `AWAITING APPROVAL`, `REJECTED`, `WAITING TO OPEN` polls keep `sent_at` null; `down` reverses it (data-model)
- [X] T006 [P] In `tests/config.test.ts`, add: `ENV_MAX_INVITATIONS_PER_DAY` unset → `maxInvitationsPerDay` 200; `"5"` → 5; `"0"`, `"-1"`, `"abc"` → `loadConfig` refuses to start, naming the variable (data-model, Setting)
- [X] T007 [P] Create `tests/invitations-store.test.ts`: after setting `sent_at` and `accepted_at` on one invitation, writing the poll's `invitedVoterList` again through `updatePoll` with one address added and one removed keeps the first row's `sent_at` and `accepted_at`, inserts the new row with nulls, deletes the removed row, and keeps the list order in `position` (R1); `listInvitees` returns each status of data-model's Status table in the right precedence, and `invitationCount`/`acceptedCount` (a voter counts as accepted) (R8)
- [X] T008 [P] Create `tests/email-layout.test.ts`: `layout()` with `headingLine2` writes `<h1>…heading<br>line 2</h1>` (both escaped) and puts line 2 on its own line directly after the heading in the text part; every existing message in `src/email/templates.ts` (sign-in, create account, email change, account deleted, email changed) produces exactly the same `html` and `text` as before the change (compare against snapshots recorded from the current code before T013 starts) (R9, FR-017)

### Implementation for the foundation

- [X] T009 Create `src/db/migrations/010-invitations.ts` (the five columns, the `emailKey(email)` index using `src/auth/emailKey.ts`, `polls.time_zone text null`, `invitation_emails` and its index, `invitation_history` with `primary key (poll_id, email_key)` and `references polls(id) on delete cascade`, the `sent_at` backfill by poll state; `down` drops them) and register it as `"010-invitations"` in `src/db/migrations/index.ts`; add the columns to `PollInvitationTable` and `PollTable`, and `InvitationEmailTable` (`invitation_emails`) and `InvitationHistoryTable` (`invitation_history`) to `Database` in `src/db/schema.ts`; map `time_zone` ↔ `timeZone: string | null` on `Poll` in `src/polls/store.ts` and add `timeZone` to `NON_CONTENT_FIELDS` there, so setting it bumps no content version (R14, data-model); T005 passes
- [X] T010 [P] In `src/config.ts`, read `ENV_MAX_INVITATIONS_PER_DAY` as `maxInvitationsPerDay` (default 200, positive integer, refusing anything else as the other integer settings do); add it with `200` to `launch.json.example` and `devScripts.example/launch-dev.ps1` (data-model, Setting); T006 passes
- [X] T011 In `src/polls/store.ts`, change `writeRoster` for `"poll_invitations"` only: delete the poll's rows whose email is not in the new list, insert the new addresses `on conflict (poll_id, email) do nothing`, and update `position` to each address's index; `"poll_bans"` keeps delete-all-then-insert (R1)
- [X] T012 Create `src/invitations/invitations.ts` with `listInvitees(db, poll)` → `{ invitees, invitationCount, acceptedCount, voterLimit, editable }` per contract A1: each row's `email`, `userName` (from `user` by exact email, else `""`), `status` by data-model's precedence (a `votes` row with `cardinality(choice_ids) > 0` → `Voted`; `accepted_at` → `Accepted`; `send_failed_at` → `Not delivered`; `sent_at` → `Invited`; else `Not sent yet`), `addedAt`, `sentAt`, `remindedAt`, and `canResend`/`resendBlockedReason` by the data-model's reminder rule, its reasons in data-model's order (`The poll is closed.`, `The poll is not open.`, `Already reminded once.`, `<name or address> was emailed less than 24 hours ago.`); one query for the list (R8, R16); T007 passes
- [X] T013 [P] In `src/email/templates.ts`, add the optional `headingLine2` to `LayoutInput` and `layout()`: after a `<br>` inside the `<h1>` (escaped), and on the line after the heading in the text part (`textParts` gets `heading + "\n" + headingLine2`); nothing else in the layout changes (R9); T008 passes

**Checkpoint**: `npm test` passes; nothing visible has changed.

---

## Phase 3: User Story 1 — A creator invites people by email (Priority: P1) 🎯 MVP

**Goal**: the Invitees panel with its add field; invitation emails in the approved wording, sent once the poll is
open, never twice, within the daily limit.

**Independent Test**: create an Invitation Only poll, open it, paste three addresses (one invalid), see two rows and one refusal, and see M1 arrive at both (spec US1).

### Tests for User Story 1

- [X] T014 [P] [US1] Create `tests/invitations-api.test.ts` for A2 `add` and A1: the input split on commas, spaces and new lines, results in input order; each outcome `added`, `invalid`, `duplicate` (repeated in the input, and a Gmail address differing only by dots or `+tag` from one already listed), `banned` (by email key), `voter-limit` (at `voterCountLimit`, and at `ENV_PRIVATE_VOTER_LIMIT_DEFAULT` when the poll has none), `not-launched` (allowlist on), `daily-limit` with `retryAt` and the time-free reason exactly `Your daily invitation limit is reached.` (an OPEN poll and `ENV_MAX_INVITATIONS_PER_DAY` 2), and no `daily-limit` on a poll not yet open; `invited_count`, the `invited` `user_polls` row and the empty placeholder vote follow each add; another creator's poll → `404`; a Public poll → `400`; a CLOSED poll → `409 poll-closed`; `pollState`, `pollEditUpdateClientGUID` and the screening fields are unchanged after every call (FR-014)
- [X] T015 [P] [US1] Create `tests/invitations-send.test.ts`: an add on an OPEN poll sends M1 to each added address once, after the response; an add on an `INITIALIZED`, `AWAITING APPROVAL`, `REJECTED` or `WAITING TO OPEN` poll sends nothing; when such a poll becomes OPEN (publish, the approval sweep, the schedule sweep), one `invitationSweep` tick sends every pending invitation; with `ENV_MAX_INVITATIONS_PER_DAY` 2 and three pending, the tick sends the two oldest by `added_at`, the third stays `Not sent yet` and goes once the window frees up (Clarification 1); the route's send and a concurrent sweep tick never send one invitation twice; a poll that goes OPEN → EDITING → OPEN sends nothing again, while an address added during EDITING stays `Not sent yet` and is emailed by the first sweep tick after the poll returns to OPEN (those already emailed are not); a poll closed before opening never sends; a mailer failure sets `send_failed_at`; each attempt adds one `invitation_emails` row; logs show only masked addresses (R6, R7)
- [X] T016 [P] [US1] Create `tests/invitation-email.test.ts`: `invitationMessage` produces every string of M1 exactly (subject with the title, heading and `headingLine2`, the four paragraphs, button, both closings) and of M2 (the `Reminder:` subject and heading, the reminder's closing 1); the anonymity paragraph only when `anonymous`; `Poll Started` always and `Poll Ends` only with an `endAt`, last before the button, in html and text; `formatPollDate` writes `Monday, October 26, 2026, 12:59 PM EDT` for `2026-10-26T16:59:00Z` in `America/New_York`, `Monday, November 2, 2026, 5:00 PM EST` for `2026-11-02T22:00:00Z`, and `… UTC` for a null zone; every value is escaped in the html (M1, M2, R9, R14, SC-007)
- [X] T017 [P] [US1] Create `tests/client-admin-invitees.test.ts` (jsdom, as `tests/client-admin-wizard.test.ts`): the Invitees panel shows below the counts panel on the read-only face of an Invitation Only poll, below the wizard of a saved Invitation Only `INITIALIZED` poll, and nowhere for any other poll or for an unsaved wizard choice; its markup uses the stand-alone card's classes (`card-invitees-panel`, `invitees-input`, `invitees-invite-btn`, `invitees-results`, `invitee-list`, `invitee-row`); `Invite` (and Ctrl+Enter) posts A2 `add` with the field's text and disables the field while it runs; after the response the field keeps only the refused addresses, one line per refusal shows the address and its reason, and the `role="status"` summary reads `Invited 2. 3 could not be added.`; a `daily-limit` refusal reads `Your daily invitation limit is reached until <time>.` with the time from `retryAt` in the browser's zone; added addresses appear as rows (C2, C3, R13)

### Implementation for User Story 1

- [X] T018 [US1] In `src/email/templates.ts`, add `formatPollDate(date, timeZone)` (R14: `Intl.DateTimeFormat("en-US", …).formatToParts`, `UTC` when `timeZone` is null) and `invitationMessage({ creatorName, creatorEmail, title, link, origin, anonymous, reminder, launchedAt, endAt, timeZone })` returning `EmailMessage` with exactly the wording of M1 and M2 through `layout()` and `headingLine2`; in `src/email/mailer.ts`, add `"invitation"` to the message types and `sendInvitation(to, message)` through the existing `send()` (R9); T016 passes
- [X] T019 [US1] In `src/invitations/invitations.ts`, add `addInvitees(deps, poll, text, creator)`: parse (R5), check each address in order (`EMAIL_PATTERN` and 200 characters; email key against the list, the input so far and the ban list; the voter limit; `isAllowed` from `src/auth/allowlist.ts`; on an OPEN poll the creator's daily allowance from `src/invitations/sender.ts`), then in one transaction insert the `poll_invitations` rows, the `invited` `user_polls` rows and the empty placeholder votes, set `invited_count`, bump the poll's counts version, and invalidate the roster cache; return A2's `results`; log `[invitations] Added n, refused m on poll <pid>`
- [X] T020 [US1] Create `src/invitations/sender.ts`: `allowance(db, creatorId, max, now)` (max minus `invitation_emails` rows of the last 24 hours, and the `retryAt` of the oldest) and `sendPendingInvitations(deps, pid?)`: for each OPEN poll with rows where `sent_at is null and send_failed_at is null` (one poll when `pid` is given), claim at most the creator's allowance, oldest `added_at` first, with `update … set sent_at = now() … returning`, insert one `invitation_emails` row per claimed row, build M1 with `invitationMessage` from the poll (creator name and email, title, `${ENV_PUBLIC_ORIGIN}/?PID=<pid>`, `voteAnonymity`, `launched_at`, `end_at`, `time_zone`), send it, and on a send failure set `send_failed_at`; log each send with `maskAddress` (R6, R7)
- [X] T021 [US1] In `src/polls/sweeps.ts`, add `invitations: 12` to `SWEEP_LOCKS` and an `invitationSweep` schedule (5 000 ms, lock 12) calling `sendPendingInvitations`; in `retentionSweep`, delete `invitation_emails` rows older than 24 hours and add the count to its log line (R6, R7)
- [X] T022 [US1] In `src/routes/pollsApi.ts`, add `GET /api/admin/polls/:pid/invitees` (A1) and `POST /api/admin/polls/:pid/invitees` with `add` (A2) behind `requireOwnPoll`: `400` for a poll that is not Invitation Only and for a body without exactly one of `add`/`remove`/`resend`, `409 poll-closed` on CLOSED or ARCHIVED; after the transaction, when the poll is OPEN, call `sendPendingInvitations(deps, pid)` without holding the response on it; respond with `results`, `invitees`, `invitationCount`, `acceptedCount`, `voterLimit`, `editable`; T014 and T015 pass
- [X] T023 [US1] In `src/public/adminCard.js`, add the Invitees panel as drawn in `admin-card.html` (`card-panel card-invitees-panel`, heading `Invitees` with `n of limit`) below the counts panel on the read-only face and below the wizard of a saved Invitation Only `INITIALIZED` poll, shown only when the stored poll is Invitation Only (R13); fetch A1 when the panel is first shown; build the `Invite by email` label, field, `Ctrl+Enter` hint, `Invite` button (and Ctrl/⌘+Enter), refusal lines (a `daily-limit` line written by the card from `retryAt` in the browser's time zone, as on a refused resend) and `role="status"` summary of C3; render the rows from the response; call `window.M3Ripple?.add` for the button (C2, C3)
- [X] T024 [P] [US1] In `src/public/admin-card-m3.css`, add the panel, field, results and pager rules of the stand-alone card's `/* Invitees panel (new) */` section, with Material 3 tokens only, no literal font size and no dark twin (C6); keep `tests/m3-assets.test.ts` passing; T017 passes
- [X] T025 [US1] In `devScripts/render-invitation-email.ts`, import `invitationMessage` and `formatPollDate` from `src/email/templates.ts` and delete the script's own copies and its `withSecondHeadingLine` post-process; re-run it with `--force` and check that `invitation-email.html` is unchanged in every switch combination (C9, SC-007)
- [X] T026 [P] [US1] In `postman/openapi.json`, describe A1 and A2 (all three request forms with `timeZone`, every outcome and refusal code); keep `tests/openapi-contract.test.ts` passing

**Checkpoint**: US1 works alone — a creator can invite, and invitees receive M1 once the poll is open (quickstart §3 steps 1–3, 6, 9).

---

## Phase 4: User Story 2 — A creator sees who has accepted and who has voted (Priority: P1)

**Goal**: status chips, `Accepted Count`, paging, and a panel that follows the admin refresh.

**Independent Test**: with three invitees, one opens the poll and one votes; within one admin refresh the chips read `Invited`, `Accepted`, `Voted`, `Accepted Count` 2, `Invitation Count` 3 (spec US2).

### Tests for User Story 2

- [X] T027 [P] [US2] Create `tests/invitations-accept.test.ts`: a signed-in invitee following `/?PID=<pid>` sets `accepted_at` once (a second visit leaves it unchanged); `GET /api/me/tabs/shared-with-you` sets `accepted_at` for each invited Invitation Only poll it returns; a non-invited visitor sets nothing; a vote makes the status `Voted` and counts toward `acceptedCount` without writing `accepted_at`; `GET /api/admin/polls` rows carry `acceptedCount` (and `0` for other polls) (R3, R8, A3, A4)
- [X] T028 [P] [US2] In `tests/client-admin-invitees.test.ts`, add: each status renders its chip text with the colour role of C4 (`invitee-chip`); the user name follows the address when known; rows are paged by `participantsViewportSize` with the `invitees-pager` (`1–5 of 7`), and an add whose rows land on a later page moves the pager there; the counts panel lists `Vote Count`, `Invitation Count`, `Accepted Count`, `Banned Voter Count` for an Invitation Only poll only; an admin list refresh refetches A1 and updates chips and counts without clearing a draft in the add field or closing an open menu or confirmation (C4, C5, C2)

### Implementation for User Story 2

- [X] T029 [US2] In `src/invitations/invitations.ts`, add `markAccepted(db, pid, email)` (`update poll_invitations set accepted_at = now() where poll_id = … and email = … and accepted_at is null`); call it in `src/polls/sharedLink.ts` (`decideSharedLink`/`resolveSharedLink`, for an invited caller of an Invitation Only poll) and in the Shared With You route of `src/routes/tabsApi.ts` (for each Invitation Only poll it returns to its invitee) (R3)
- [X] T030 [US2] In `src/routes/pollsApi.ts`, add `acceptedCount` to each `GET /api/admin/polls` row beside `invitationCount` (`0` for a poll that is not Invitation Only), counted in the rows' query (A3); T027 passes
- [X] T031 [US2] In `src/public/adminCard.js`, render each row's user name and status chip (C4), page the rows with the `invitees-pager` by `participantsViewportSize`, add `Accepted Count` to the counts panel after `Invitation Count` (C5), and refetch A1 on every admin list refresh without touching the add field's draft or an open menu (C2)
- [X] T032 [P] [US2] In `src/public/admin-card-m3.css`, add the row, user-name and five chip colour rules of C4 from the stand-alone card (C6); T028 passes

**Checkpoint**: US1 + US2 — the creator invites and watches responses (quickstart §3 steps 4–5).

---

## Phase 5: User Story 3 — An invitee responds to the invitation (Priority: P2)

**Goal**: an invitee is recognized by mailbox, however they spell it, reaches the poll from the email, and reads its
dates in the creator's time zone.

**Independent Test**: invite `j.doe@gmail.com` to a poll with an end date, sign in as `jdoe@gmail.com` from the email's link, land on the poll and vote; the email's dates are in the creator's zone (spec US3).

### Tests for User Story 3

- [X] T033 [P] [US3] Create `tests/invitations-adopt.test.ts`: an invitation for `j.doe@gmail.com` is adopted by the account `jdoe@gmail.com` at sign-in (`session.create.after`), at `/?PID=<pid>`, and at the Shared With You tab — the invitation's email, its `invited` `user_polls` row and its placeholder vote all take the account's address, and the roster cache is invalidated; after adoption the account can vote, sees the poll in Shared With You, and its status becomes `Accepted` then `Voted`; an account whose key matches nothing is unchanged; a signed-out visitor of `/?PID=` is sent to sign in and comes back to the poll (feature 026); a person not invited still cannot vote (R2, A4, FR-031, FR-034)
- [X] T034 [P] [US3] Create `tests/poll-time-zone.test.ts`: `PATCH /api/admin/polls/:pid`, `/save`, `/publish`, `/colors` and A2 store a valid `timeZone` as `polls.time_zone`; an invalid one (`"Mars/Base"`) or none leaves it unchanged and is not refused; none of them changes the poll's content version, state or review because of it; an invitation sent afterwards writes its dates in that zone (A5, R14, FR-024)
- [X] T035 [P] [US3] In `tests/client-admin-invitees.test.ts`, add: every write `adminCard.js` makes to a poll (`PATCH`, `/save`, `/publish`, `/colors`, `/invitees`) carries `timeZone` equal to `Intl.DateTimeFormat().resolvedOptions().timeZone` (C8)

### Implementation for User Story 3

- [X] T036 [US3] In `src/invitations/invitations.ts`, add `adoptInvitations(deps, accountEmail)`: in one transaction, for every `poll_invitations` row whose `emailKey(email)` equals `emailKeyOf(accountEmail)` and whose email differs, rewrite that row's email, the `invited` `user_polls` row and the empty placeholder vote to `accountEmail` (when a row for `accountEmail` already exists on the poll, delete the other spelling's rows instead), then invalidate each changed poll's roster cache; log `[invitations] Adopted n invitation(s) for <masked>` (R2)
- [X] T037 [US3] Call `adoptInvitations` in `src/auth/auth.ts` (a new `databaseHooks.session.create.after` beside the existing `before`, with the session's user email), in `src/polls/sharedLink.ts` (before the invitation check in `decideSharedLink`), and in the Shared With You route of `src/routes/tabsApi.ts` (before the query); T033 passes
- [X] T038 [US3] In `src/routes/pollsApi.ts`, read an optional `timeZone` on `PATCH /api/admin/polls/:pid`, `/save`, `/publish`, `/colors` and `/invitees`; when `new Intl.DateTimeFormat("en-US", { timeZone })` does not throw, store it as `time_zone` with a write that bumps no content version and queues no screening; otherwise ignore it (A5, R14); T034 passes
- [X] T039 [US3] In `src/public/adminCard.js`, add `timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone` to the JSON body of every write to a poll (`PATCH`, `/save`, `/publish`, `/colors`, `/invitees`) (C8); describe `timeZone` on those routes in `postman/openapi.json`; T035 passes

**Checkpoint**: US3 — any spelling of an invited mailbox reaches and votes in the poll, and the email's dates are the creator's (quickstart §3 steps 3–4 with a Gmail variant).

---

## Phase 6: User Story 4 — A creator removes an invitee or sends a reminder (Priority: P2)

**Goal**: remove (with confirmation when the invitee has voted), one reminder per invitee while the poll is open, and
an address added back that is not emailed again.

**Independent Test**: remove an invitee who has not voted; resend to another and see M2 arrive and Resend become unavailable with its reason; remove and re-add an emailed address and see no new email (spec US4).

### Tests for User Story 4

- [X] T040 [P] [US4] In `tests/invitations-api.test.ts`, add A2 `remove` and `resend`: removing a non-voter deletes the invitation, its `invited` row and placeholder, updates `invited_count`, and the person can no longer vote; removing a voter without `confirmVoted` → `409 invitee-voted` listing them and nothing removed, with `confirmVoted: true` → the vote is removed and `vote_count` drops; resend → M2 sent once, `reminded_at` set, one `invitation_emails` row; a second resend → `409 resend-unavailable` "Already reminded once."; within 24 hours of the last email → `409` with the "emailed less than 24 hours ago" reason; on a poll in EDITING, WAITING TO OPEN or AWAITING APPROVAL → `409` "The poll is not open." and nothing queued (sending it later never happens); a resend after a failed send is allowed and clears `send_failed_at`; over the allowance → `429 daily-limit` with `retryAt` and the error exactly `Your daily invitation limit is reached.` (no time); removing an emailed invitee writes an `invitation_history` row, and adding the same mailbox back (another spelling included) is `added` with `sentAt`/`remindedAt` restored, sends no email, and keeps the reminder state and its 24-hour wait; a ban through the existing edit path withdraws the invitation, writes history and keeps the other rows' state (FR-027–FR-030, R15, R16, Clarifications 2 and 3)
- [X] T041 [P] [US4] In `tests/client-admin-invitees.test.ts`, add: each row's menu offers `Resend invitation` and `Remove`; Resend is disabled with `resendBlockedReason` shown when `canResend` is false (including "The poll is not open."); `Remove` of a voter shows the inline confirmation (`invitee-confirm`) "Remove <address>? Their vote will be removed too." and posts with `confirmVoted: true` only on `Remove`; a `409 invitee-voted` on a plain remove opens the same confirmation; a resend refused `429 daily-limit` shows `Your daily invitation limit is reached until <time>.` with the time from `retryAt` in the browser's zone; on a CLOSED or ARCHIVED poll the panel has `data-readonly`, no add field and no row menus (C4, C2, C3)

### Implementation for User Story 4

- [X] T042 [US4] In `src/invitations/invitations.ts`, add `removeInvitees(deps, poll, emails, confirmVoted)` (delete the invitation, `invited` row and placeholder; upsert `invitation_history` for a sent one; for a voter, only with `confirmVoted`, also delete the vote through the existing vote-replacement path so the counters follow; update `invited_count`, bump the counts version, invalidate the roster cache) and `resendInvitation(deps, poll, email)` (the reminder rule, the poll OPEN; the allowance; set `reminded_at`, clear `send_failed_at`, add an `invitation_emails` row, send M2 with `invitationMessage({ …, reminder: true })` after the response); in `addInvitees`, restore `sent_at`/`reminded_at` from a matching `invitation_history` row and delete it (R10, R15, R16)
- [X] T043 [US4] In `src/polls/store.ts`, make `writeRoster`'s invitation diff upsert `invitation_history` for each deleted row whose `sent_at` is set (R15)
- [X] T044 [US4] In `src/routes/pollsApi.ts`, handle A2 `remove` (with `409 invitee-voted`) and `resend` (with `409 resend-unavailable` and `429 daily-limit`); describe both in `postman/openapi.json`; T040 passes
- [X] T045 [US4] In `src/public/adminCard.js`, add each row's kebab menu (`Resend invitation`, `Remove`), the disabled Resend with its reason, a resend refused `429 daily-limit` shown as `Your daily invitation limit is reached until <time>.` with the time from `retryAt` in the browser's zone (C3), the inline confirmation for removing a voter, and the read-only panel (`data-readonly`, no field, no menus) on CLOSED and ARCHIVED polls, as drawn in `admin-card.html` (C4, C2); add the menu and confirmation rules to `src/public/admin-card-m3.css` (C6); T041 passes

**Checkpoint**: all four user-facing stories work (quickstart §3 steps 7–11).

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T046 [P] In `src/public/privacy.html`, add the `id="invitations"` paragraph of R12 (the invitation email and its one reminder, sent at a poll creator's request; the address used only for that poll; a removed invitee's address kept as an email key only so it is not emailed again; how an address with no account is removed); add a test in `tests/privacy-minimization.test.ts` that the page has `#invitations` and names the reminder; `TERMS_VERSION` stays unchanged (C7, FR-035, FR-037)
- [X] T047 [P] In `src/legal/deleteAccount.ts`, select and delete the person's `poll_invitations` rows by `emailKey(email) = emailKey(<address>)` instead of exact address, decrementing `invited_count` per poll as today, and delete their `invitation_history` rows by email key; add a case to `tests/account-deletion.test.ts` with an invitation and a history row spelled differently from the account (R10, R15, FR-036)
- [X] T048 [P] Add `ENV_MAX_INVITATIONS_PER_DAY` to the environment table in `CLAUDE.md` (default `200`, invitation and reminder emails per creator per rolling 24 hours; what does not fit waits)
- [X] T049 Regenerate `README.md` and `ARCHITECTURE.md` (Constitution, Documentation Deliverables): the Invitees panel, the invitee route, adoption by email key, the invitation sweep and lock 12, the daily limit, the invitation history, the creator's time zone, the layout's second heading line, and the new migration
- [X] T050 Run `npm test` and `npm run build`; fix any failure (quickstart §1)
- [X] T053 [US1] TWEAK01: in `src/invitations/invitations.ts`, `addInvitees` no longer refuses `daily-limit`; on an OPEN poll an address past the creator's allowance is `added` with `waiting: true` and waits as `Not sent yet` for `invitationSweep`; `src/public/adminCard.js`'s summary adds `n will be sent as your daily limit frees up.`; `postman/openapi.json` drops the add outcome; tests in `tests/invitations-api.test.ts` and `tests/client-admin-invitees.test.ts` (FR-009, FR-025)
- [X] T054 [US1] TWEAK02: in `src/public/adminCard.js`, the add summary keeps its `waiting` addresses (`invitees.addSummary`, cleared by any other summary) and `renderInvitees` rewrites it on each list refresh, dropping each address whose row has left `Not sent yet`; test in `tests/client-admin-invitees.test.ts` (C3)
- [X] T055 TWEAK03: bring four stale tests in line with earlier changes: `tests/client-admin-wizard.test.ts` compares the pre-filled end as 7 calendar days at `09:00` (not 168 hours, which fails across a clock change); `tests/client-login-pid.test.ts` no longer ticks the oauth card's removed `#terms` box (Social sign-in TWEAKS06); `tests/client-tab-bar-scroll.test.ts` and `tests/m3-assets.test.ts` expect the scroll arrows, `tab-bar-scroll-arrows-m3.css` and `tabBarScrollArrows.js` (Phone tab bar TWEAKS09)
- [X] T056 [US1] TWEAK04: in `src/public/adminCard.js`, the add summary puts each message on a line of its own (`Invited Emails: n.`, `n will be sent as your daily limit frees up.`, `Emails that could not be added: n`), with `white-space:pre-line` on `.invitees-summary` in `src/public/admin-card-m3.css`; expectations in `tests/client-admin-invitees.test.ts` (C3)
- [X] T057 [US1] TWEAK05: `/api/config` (`src/routes/api.ts`) sends `maxInvitationsPerDay`; `src/public/adminCard.js`'s waiting line reads `n emails will be sent when your daily limit allows. Your daily limit is: <limit>` (`1 email` for one); `postman/openapi.json`; expectation in `tests/client-admin-invitees.test.ts` (C3)
- [X] T058 [US1] TWEAK07: in `src/public/adminCard.js`, the waiting message puts the limit on a line of its own, `Daily Limit: <limit> Emails` (`1 Email` for one); expectation in `tests/client-admin-invitees.test.ts` (C3)
- [X] T059 [US1] TWEAK08: in `src/public/adminCard.js`, the waiting message capitalizes `Emails` (`1 Email` for one); expectation in `tests/client-admin-invitees.test.ts` (C3)
- [X] T060 [US5] TWEAK09: admin list and search rows carry `ownPoll` (`src/routes/pollsApi.ts`), and the read-only card marks another creator's poll with a `Not your poll` chip on its Created By line (`src/public/adminCard.js`, `src/public/admin-card-m3.css`); tests in `tests/polls-admin-crud.test.ts` and `tests/client-admin-search.test.ts` (C1)
- [X] T061 [US1] TWEAK10: in `src/votes/votePath.ts`, the creator of an Invitation Only poll votes without an invitation (`userId` on the vote request, from `src/routes/pollsApi.ts`) and their uninvited vote is left out of the voter-limit count; test in `tests/polls-vote.test.ts` (FR-041, A4)
- [X] T062 [US5] TWEAK11: in `src/public/adminCard.js` `renderReadOnly()`, the Settings Summary moves to the top of the read-only card's body, above the dates panel; order check in `tests/client-admin-invitees.test.ts` (C1, C2)
- [X] T063 TWEAK12: `loadConfig` (`src/config.ts`) refuses a remote `ENV_VALKEY_URL` beside a local `ENV_DATABASE_URL`, naming both hosts and no credentials; tests in `tests/config.test.ts`; `CLAUDE.md` (the `ENV_VALKEY_URL` row); the local `.vscode/launch.json` and `devScripts/launch-dev.ps1` no longer set the production Valkey
- [ ] T051 [US5] Compare the production admin card's Invitees panel with `requirements/20261026-085056-poll-invitations/admin-card.html`, light and dark, at desktop width and 390 px, and fix any difference in `adminCard.js` or `admin-card-m3.css` (quickstart §2, FR-039)
- [ ] T052 Manual: quickstart §3 end to end in development with SES in the sandbox and `ENV_MAX_INVITATIONS_PER_DAY=3`; check SC-001 (10 addresses in under a minute), SC-003 (a status change within one refresh), SC-005 (voting never paused), SC-007 (the received email matches the draft) and SC-008 (its dates match the admin card's)

---

## Dependencies & Execution Order

- **Phase 1** is done.
- **Phase 2**: T005 ‖ T006 ‖ T007 ‖ T008, then T009 → T010 ‖ T011 ‖ T013 → T012; T008 records its snapshots before T013 starts (T008 → T013).
- **US1** needs Phase 2. **US2** needs US1's route and panel (T022, T023). **US3** needs Phase 2 and T019 (rows to adopt) and T020 (an email to date); it can run beside US2. **US4** needs US1 (T018, T020, T022, T023).
- `tests/client-admin-invitees.test.ts` is edited by T017 (US1), T028 (US2), T035 (US3) and T041 (US4): additions to it are made one story at a time, even while US2 and US3 run side by side.
- **Phase 7** after all stories; T046 ‖ T047 ‖ T048, then T049 → T050 → T051 → T052.

## Parallel Examples

- Phase 2: T005 ‖ T006 ‖ T007 ‖ T008; T010 ‖ T011 ‖ T013 after T009.
- US1: T014 ‖ T015 ‖ T016 ‖ T017; then T018 → T019 → T020 → T021 → T022 → T023, with T024, T025 (after T018) and T026 alongside.
- US2: T027 ‖ T028; T029 → T030, T031 ‖ T032.
- US3: T033 ‖ T034 ‖ T035; T036 → T037, T038 → T039 — alongside US2.
- US4: T040 ‖ T041; T042 ‖ T043 → T044 → T045.
- Phase 7: T046 ‖ T047 ‖ T048.

## Implementation Strategy

1. **Drafts first** (Phase 1, done): the panel's look and the email's wording are settled before any production file changes.
2. **MVP = Phase 2 + US1**: an Invitation Only poll can finally get invitees, and they are emailed, in the approved wording, once it opens. Deployable on its own; dates are in UTC until US3 stores the creator's zone.
3. **US2** shows who accepted and voted.
4. **US3** makes every spelling of an invited mailbox work and writes the dates in the creator's zone.
5. **US4** adds remove, the one reminder and the history that keeps a re-added address from being emailed again.
6. Phase 7: the Privacy Policy, account deletion by mailbox, docs, the full suite, the comparison with the drafts, and the end-to-end walk.
