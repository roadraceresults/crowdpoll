---

description: "Task list for 011-SIMPLIFY-POLL-STATES"
---

# Tasks: Simplify Poll States

**Input**: Design documents from `/specs/011-SIMPLIFY-POLL-STATES/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: INCLUDED. `plan.md` names four new suites and `quickstart.md` specifies which checks to
write first, so tests are requested by the design. **No test may sleep** — every time-dependent
behaviour is exercised by passing a chosen timestamp and calling a single sweep tick directly.

**Organization**: Grouped by user story so each can be implemented, tested and demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable — different file, no dependency on an incomplete task
- **[Story]**: US1–US10, mapping to the user stories in spec.md

## Path Conventions

Single project: `src/` and `tests/` at repository root, per plan.md.

---

## Phase 1: Setup

**Purpose**: Establish a baseline and create the two new modules. No new dependency is introduced.

- [X] T001 Run `npm test` and record the passing baseline before any change, so later failures are attributable
- [X] T002 [P] Create `src/polls/screening.ts` with the `ScreeningResult` type and an exported `screenPoll(title, subtitle, choiceLabels): Promise<string>` interface returning empty for acceptable (research R1)
- [X] T003 [P] Create `src/polls/sweeps.ts` exporting three named single-tick functions as stubs, with timer scheduling kept out of the tick bodies (research R2)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The state model, storage shape, configuration and shared helpers every story needs.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Replace `StoredPollState`/`PollState` with the eight-value `PollState` union (`INITIALIZED`, `EDITING`, `AWAITING APPROVAL`, `REJECTED`, `WAITING TO OPEN`, `OPEN`, `CLOSED`, `ARCHIVED`) in `src/polls/store.ts`, deleting the derived-state distinction
- [X] T005 Add `pollStateBeforeEditUpdate`, `pollEditUpdateHeartbeatTimestamp`, `pollEditUpdateClientGUID`, `pollApprovalTimestamp`, `pollAcceptabilityScreeningAttempts` and `pollRejectionReason` to the `Poll` interface in `src/polls/store.ts` per data-model.md
- [X] T006 Remove `removed` from `Choice` and from `VoteEntry` in `src/polls/store.ts`
- [X] T007 Add the three new indexes to `ensurePollIndexes` in `src/polls/store.ts`: `{pollState,pollApprovalTimestamp}`, `{pollState,startAt}`, `{pollState,pollEditUpdateHeartbeatTimestamp}`
- [X] T008 Add the six new settings to `AppConfig` and `loadConfig` in `src/config.ts` with the defaults from data-model.md: call timeout 10s, approval interval 5s, date-check interval 1min, heartbeat interval 10s, max screening attempts 10, admin refresh 5s
- [X] T009 [P] Implement `hasEverBeenVotedOn(db, pid)` in `src/polls/service.ts` querying `voteHistory` by `pid`, not `currentVotes` (research R8)
- [X] T010 [P] Replace `deriveState` with `evaluateSchedule(poll, now)` in `src/polls/service.ts` returning `WAITING TO OPEN`/`OPEN`/`CLOSED`, treating absent start as started, absent end as never closing, and both bounds as inclusive
- [X] T011 Implement the interval runner in `src/polls/sweeps.ts`: overlap guard per sweep, `try/catch` around each tick body that logs and continues, and `unref()` so test runs do not hang
- [X] T012 Change `createDefaultPoll` to produce `INITIALIZED` in `src/polls/service.ts`
- [X] T013 Remove `removed` filtering from `computeResults`, `exportPollData`, `exportPollMarkdown` and `duplicatePoll` in `src/polls/service.ts`
- [X] T014 Update `tests/helpers/poll-fixtures.ts` to the new poll shape: eight-state values, the six new fields, no `removed` markers
- [X] T015 Wire sweep startup and shutdown into `startServer()` in `src/server.ts`, reading intervals from config

**Checkpoint**: The data model, config and shared helpers are in place. User stories may begin.

---

## Phase 3: User Story 1 - Edit a poll that has never been voted on (Priority: P1) 🎯 MVP

**Goal**: Full editing is offered only for polls with no vote history, and a saved choice list replaces the stored one wholesale.

**Independent Test**: Create a poll, edit every field including choices, save. Cast one vote, confirm the full-edit surface is refused. Delete that vote, confirm it is still refused.

### Tests for User Story 1

- [X] T016 [P] [US1] Test edit eligibility in `tests/polls-admin-crud.test.ts`: never-voted granted; voted refused; **vote cast then deleted still refused**; banned-voter deletion still refused (FR-007)
- [X] T017 [P] [US1] Test in `tests/polls-state-machine.test.ts` that a new poll is `INITIALIZED`, is absent from public listings, and offers only edit and delete actions (FR-002, FR-054)
- [X] T018 [P] [US1] Test wholesale choice replacement in `tests/polls-service.test.ts`: the saved list replaces the stored list and no prior choice survives (FR-010)

### Implementation for User Story 1

- [X] T019 [US1] Implement `canEditPoll(poll, hasVotes)` and `canUpdatePoll(poll, hasVotes)` in `src/polls/service.ts` — refuse when state is `EDITING`, `AWAITING APPROVAL` or `ARCHIVED`; otherwise split on vote history (FR-006, FR-008)
- [X] T020 [US1] Add `POST /api/admin/polls/:pid/edit-session` to `src/routes/pollsApi.ts` returning `{granted, mode}` with `mode` decided server-side from vote history; re-check every eligibility condition server-side and make no change when refusing (FR-019)
- [X] T021 [US1] Rewrite `replaceChoices` in `src/polls/service.ts` to replace the list outright, deleting the previously-removed carry-over and the vote-reconciliation branch
- [X] T022 [US1] Restrict `PUT /api/admin/polls/:pid/choices` to `EDIT`-mode sessions in `src/routes/pollsApi.ts`, refusing 409 for a poll that has ever been voted on
- [X] T023 [US1] Add the eligibility guard to the `/admin/poll` route in `src/routes/pages.ts`, redirecting to `/admin/poll/update` when the poll has votes and to `/admin` with a reason when refused
- [X] T024 [US1] Request an edit session on page load in `src/public/adminPoll.js` and redirect to `/admin` with the refusal message when not granted
- [X] T025 [US1] Remove the removed-choices UI, dead once `Choice.removed` is deleted: `renderRemovedChoices()` and its call in `src/public/adminPoll.js` (~46-56, ~412), the `.filter((c) => c.removed)` at ~155, and the `<ul class="admin-choice-list" id="removedChoiceList">` in `src/public/admin-poll.html` (~52)

**Checkpoint**: US1 is fully functional and independently testable.

---

## Phase 4: User Story 2 - Update a poll that already has votes (Priority: P1)

**Goal**: A reduced surface offering only title, subtitle, start and end for polls that have votes, preserving every vote.

**Independent Test**: Vote on a poll, confirm the reduced surface is offered, change the title and end time, confirm the vote count and choice list are unchanged.

### Tests for User Story 2

- [X] T026 [P] [US2] Test update eligibility in `tests/polls-admin-crud.test.ts`: voted granted; never-voted redirected to edit; `EDITING`/`AWAITING APPROVAL`/`ARCHIVED` refused
- [X] T027 [P] [US2] Test vote preservation in `tests/polls-admin-crud.test.ts`: after a title and schedule change through the update surface, every vote and the full choice list survive (FR-011, SC-002)

### Implementation for User Story 2

- [X] T028 [US2] Add the `/admin/poll/update` route with its guard to `src/routes/pages.ts`, redirecting to `/admin/poll` when the poll has no votes
- [X] T029 [US2] Branch `src/public/adminPoll.js` on the session's `mode`, hiding choices, access mode, mechanics, invited list and voter limit in `UPDATE` mode
- [X] T030 [US2] Reject any field outside title, subtitle, `startAt` and `endAt` with 400 for an `UPDATE`-mode publish in `src/routes/pollsApi.ts` (FR-009)

**Checkpoint**: US1 and US2 both work independently; every poll in the system has exactly one editing surface.

---

## Phase 5: User Story 3 - Publish deliberately, after screening (Priority: P1)

**Goal**: Publishing is an explicit act; nothing becomes public before screening passes; autosave is gone.

**Independent Test**: Publish a poll with unacceptable wording and confirm it is `REJECTED` with a readable reason and never public; repeat with acceptable wording and confirm it becomes visible per its schedule.

### Tests for User Story 3

- [X] T031 [P] [US3] Test the default-value guards in `tests/polls-state-machine.test.ts`: all-defaults stays `INITIALIZED`; changed title and subtitle with default choices still stays `INITIALIZED` (FR-024, FR-025)
- [X] T032 [P] [US3] Test screening verdicts in `tests/polls-screening.test.ts`: non-empty return → `REJECTED` with the returned reason; empty return → reason cleared and state written from the schedule
- [X] T033 [P] [US3] Test in `tests/polls-screening.test.ts` that a poll is never publicly visible while `AWAITING APPROVAL` or `REJECTED` (FR-003, SC-003)

### Implementation for User Story 3

- [X] T034 [P] [US3] Implement the local deny-list screener behind the `screenPoll` interface in `src/polls/screening.ts`, returning a human-readable objection or empty (research R1)
- [X] T035 [US3] Implement `isAllDefaults(poll)` in `src/polls/service.ts` covering both the all-fields and the choices-only cases
- [X] T036 [US3] Add `POST /api/admin/polls/:pid/publish` to `src/routes/pollsApi.ts`: save fields, set `AWAITING APPROVAL`, clear reason, approval timestamp and all three session fields, reset attempts to 0, and return immediately (FR-026)
- [X] T037 [US3] Return the still-default response leaving the poll `INITIALIZED` in `src/routes/pollsApi.ts` when `isAllDefaults` holds
- [X] T038 [US3] Implement query 2 of `pollsAwaitingApprovalSweep` in `src/polls/sweeps.ts`: select unclaimed polls ordered by oldest `startAt` with nulls first, then apply the verdict handling from data-model.md
- [X] T039 [US3] Write the post-approval state from `evaluateSchedule` in `src/polls/sweeps.ts` (FR-041)
- [X] T040 [US3] Remove autosave from `src/public/adminPoll.js`, replacing `wireAutosaveField` with local form state
- [X] T041 [US3] Add the `Save and Publish` and `Cancel` controls to `src/public/admin-poll.html` in the order back-arrow, publish, cancel, both disabled initially
- [X] T042 [US3] Enable both controls on first field change in `src/public/adminPoll.js` (FR-013)
- [X] T043 [US3] Display `pollRejectionReason` at the top of the editing page in `src/public/adminPoll.js` when the poll is `REJECTED` (FR-030)
- [X] T044 [US3] Remove content and schedule fields from `PATCH /api/admin/polls/:pid` in `src/routes/pollsApi.ts`, leaving only the explicit `CLOSED` and `ARCHIVED` actions
- [X] T045 [US3] Remove the legacy poll-state control, which hardcodes two deleted values: delete `wirePollStateField()` and its call in `src/public/adminPoll.js` (~304-315), the population at ~407-408 referencing `CLOSED-POLL-STATE`/`ARCHIVED-POLL-STATE`, and the `<select id="pollState">` block in `src/public/admin-poll.html` (~95-96). Poll state is no longer set from the editing page

**Checkpoint**: The publish path works end to end. This is the first point at which the feature's core purpose is demonstrable.

---

## Phase 6: User Story 4 - Polls open and close on their own schedule (Priority: P2)

**Goal**: Unattended schedule-driven transitions, and a vote gate that depends on state rather than on listing visibility.

**Independent Test**: Set a poll to open shortly, confirm it is not votable, wait past the start, confirm it becomes votable with no administrator action.

### Tests for User Story 4

- [X] T046 [P] [US4] Test schedule transitions in `tests/polls-schedule-sweep.test.ts` by injecting timestamps: waiting → open → closed, and closed → open when the end moves out
- [X] T047 [P] [US4] Test absent bounds in `tests/polls-schedule-sweep.test.ts`: no start opens immediately on approval; no end never closes (FR-043, FR-044)
- [X] T048 [P] [US4] Test the inverted-dates fail-safe in `tests/polls-schedule-sweep.test.ts`: start later than end sets start to one second before end and closes the poll (FR-046)
- [X] T049 [P] [US4] Test the vote gate in `tests/polls-vote.test.ts`: votes refused in all seven non-`OPEN` states, including from a session that began while the poll was open (FR-004, SC-004)

### Implementation for User Story 4

- [X] T050 [US4] Implement `pollDateCheckSweep` in `src/polls/sweeps.ts` over polls in `WAITING TO OPEN`, `OPEN` and `CLOSED`, writing the evaluated state
- [X] T051 [US4] Add the inverted-dates fail-safe to `pollDateCheckSweep` in `src/polls/sweeps.ts`
- [X] T052 [US4] Replace the derived-state check in `validateVoteSubmission` in `src/polls/service.ts` with an exact `OPEN` test
- [X] T053 [US4] Update `checkViewEligibility` in `src/polls/service.ts` to the eight-state visibility rules from data-model.md
- [X] T054 [US4] Replace the `poll.pollState === 'CLOSED-POLL-STATE'` comparison at `src/public/pollCard.js:898` with the eight-state value `CLOSED`, so the closed-date rendering keeps working
- [X] T055 [US4] Prevent a start later than an end on both editing surfaces in `src/public/adminPoll.js` (FR-047)

**Checkpoint**: Polls transition unattended and the vote gate is state-based.

---

## Phase 7: User Story 5 - Two administrators cannot edit at once (Priority: P2)

**Goal**: A per-tab editing lock that only its holder can release and that recovers itself within a bounded time.

**Independent Test**: Open a poll in two tabs and confirm the second is refused; close the first abruptly and confirm the poll frees itself within 40s.

### Tests for User Story 5

- [X] T056 [P] [US5] Test lock acquisition and refusal in `tests/polls-editing-lock.test.ts`: a second session on an `EDITING` poll is refused with the locked reason
- [X] T057 [P] [US5] Test non-re-entrancy in `tests/polls-editing-lock.test.ts`: a fresh identifier for the same poll is refused while the lock is held (FR-023)
- [X] T058 [P] [US5] Test stale recovery in `tests/polls-editing-lock.test.ts` by injecting a timestamp older than twice the heartbeat interval and calling one tick: the stashed state is restored and all three session fields cleared
- [X] T059 [P] [US5] Test ownership in `tests/polls-editing-lock.test.ts`: after A goes stale, is recovered, and B takes the lock, A's release makes no change and reports failure (SC-006)

### Implementation for User Story 5

- [X] T060 [US5] Set `pollStateBeforeEditUpdate`, `EDITING`, the heartbeat timestamp and the client identifier atomically in the edit-session handler in `src/routes/pollsApi.ts`
- [X] T061 [US5] Add `POST /api/admin/polls/:pid/edit-session/heartbeat` to `src/routes/pollsApi.ts`, filtered on both the client identifier and the state still being `EDITING`
- [X] T062 [US5] Add `DELETE /api/admin/polls/:pid/edit-session` to `src/routes/pollsApi.ts`, filtered on the client identifier so only the holder may release (FR-023)
- [X] T063 [US5] Implement `staleEditUpdateSweep` in `src/polls/sweeps.ts` per data-model.md, restoring the stashed state and clearing all three session fields
- [X] T064 [US5] Generate a fresh identifier per page load and start the heartbeat loop in `src/public/adminPoll.js`
- [X] T065 [US5] On a non-alive heartbeat response in `src/public/adminPoll.js`, stop the loop, show the message, navigate to `/admin`, and write nothing

**Checkpoint**: Concurrent editing is prevented and every lock is recoverable.

---

## Phase 8: User Story 6 - Abandoning an edit changes nothing (Priority: P2)

**Goal**: Every exit route warns, and discarding restores the poll exactly.

**Independent Test**: Change fields, leave by all four routes, confirm each warns and that the stored poll is unchanged.

### Tests for User Story 6

- [X] T066 [P] [US6] Test that a released session restores the stashed state and writes no field change in `tests/polls-editing-lock.test.ts` (FR-015)

### Implementation for User Story 6

- [X] T067 [US6] Add the confirmation dialog for `Cancel` and `Back Arrow` in `src/public/adminPoll.js` with `No` returning to editing and `Yes` discarding
- [X] T068 [US6] Add the `beforeunload` handler in `src/public/adminPoll.js`, armed on first edit, covering tab close and navigation away
- [X] T069 [US6] Push a history entry on first edit in `src/public/adminPoll.js` so the browser back button triggers the same prompt (research R9)
- [X] T070 [US6] Return to `/admin` by in-application navigation rather than browser history in `src/public/adminPoll.js` (FR-016)

**Checkpoint**: No exit route can silently lose or half-apply an edit.

---

## Phase 9: User Story 7 - Screening failures resolve without stranding a poll (Priority: P2)

**Goal**: A bounded retry budget that terminates even when the process dies mid-call, plus an administrator retry control.

**Independent Test**: Make screening fail, publish, confirm retries stop at the maximum with a reason, then restore the service and confirm the retry control works.

### Tests for User Story 7

- [X] T071 [P] [US7] Test claim atomicity in `tests/polls-screening.test.ts`: two concurrent ticks against one unclaimed poll produce exactly one claim and one attempt increment
- [X] T072 [P] [US7] Test the timeout path in `tests/polls-screening.test.ts`: a call exceeding the timeout leaves `AWAITING APPROVAL`, clears the claim, sets the timed-out reason, and does **not** increment
- [X] T073 [P] [US7] Test crashed-claim recovery in `tests/polls-screening.test.ts`: a claim older than twice the call timeout is released without an extra increment
- [X] T074 [P] [US7] Test budget termination under a process that dies every attempt in `tests/polls-screening.test.ts`: exactly `max` screening calls are attempted and the poll ends `REJECTED` — **this test loops forever if the counter is incremented on failure instead of on claim** (SC-008, SC-009)
- [X] T075 [P] [US7] Test that a completed call resets the attempt count whatever its verdict in `tests/polls-screening.test.ts` (FR-038)

### Implementation for User Story 7

- [X] T076 [US7] Take the claim with a single atomic `findOneAndUpdate` that sets `pollApprovalTimestamp` and increments `pollAcceptabilityScreeningAttempts` in one write in `src/polls/sweeps.ts` (research R3, FR-036)
- [X] T077 [US7] Wrap the screening call in an `ENV_API_CALL_TIMEOUT` bound in `src/polls/screening.ts`, treating timeout and throw identically
- [X] T078 [US7] Implement query 1 of `pollsAwaitingApprovalSweep` in `src/polls/sweeps.ts` — crashed claims ordered by oldest `pollApprovalTimestamp` — and run it **before** query 2 (FR-033)
- [X] T079 [US7] Reject with the exhausted-attempts reason and make no screening call once attempts reach the maximum in `src/polls/sweeps.ts` (FR-039)
- [X] T080 [US7] Reset the attempt count on every completed call, either verdict, in `src/polls/sweeps.ts`
- [X] T081 [US7] Add `POST /api/admin/polls/:pid/rescreen` to `src/routes/pollsApi.ts`, returning the poll to `AWAITING APPROVAL` with attempts, reason, approval timestamp and session fields cleared
- [X] T082 [US7] Surface the re-screen control in `src/public/adminList.js` only when the poll is `REJECTED` with attempts at the maximum (FR-040)

**Checkpoint**: A screening outage can no longer strand a poll or loop indefinitely.

---

## Phase 10: User Story 8 - The poll list reflects reality (Priority: P3)

**Goal**: The admin list updates changed rows in place on its own interval.

**Independent Test**: Change a poll's state from another session and confirm the row updates within the interval with no page reload.

### Tests for User Story 8

- [X] T083 [P] [US8] Test that list rows carry `pollState`, `pollApprovalTimestamp`, `pollRejectionReason`, `hasEverBeenVotedOn` and the four `can*` booleans in `tests/polls-admin-crud.test.ts`

### Implementation for User Story 8

- [X] T084 [US8] Compute and return `canEdit`, `canUpdate`, `canDelete`, `canRescreen` and `canArchive` per row in `src/routes/pollsApi.ts` so the client does not re-derive the rules. `canArchive` is true only when the poll is `CLOSED` (FR-049)
- [X] T085 [US8] Add the interval refresh reading `ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL` in `src/public/adminList.js`
- [X] T086 [US8] Re-render changed rows in place in `src/public/adminList.js`, preserving scroll position and any open action menu
- [X] T087 [US8] Add the waiting-time and rejection-reason columns to `src/public/adminList.js` (FR-030, FR-032)

**Checkpoint**: The list is trustworthy without manual refresh.

---

## Phase 11: User Story 9 - Retiring a poll (Priority: P3)

**Goal**: Archiving is terminal and closed-only; deletion is restricted to the three safe states; duplicates start unscreened-safe.

**Independent Test**: Archive a closed poll, confirm it leaves public view with votes intact and cannot change state; confirm delete appears only for initialized, rejected and archived polls.

### Tests for User Story 9

- [X] T088 [P] [US9] Test archive rules in `tests/polls-state-machine.test.ts`: permitted only from `CLOSED`; every transition out of `ARCHIVED` refused (FR-049, FR-050)
- [X] T089 [P] [US9] Test delete restrictions in `tests/polls-admin-crud.test.ts`: allowed for `INITIALIZED`/`REJECTED`/`ARCHIVED`, refused otherwise, and never for a poll that has been voted on and is not archived (SC-012)
- [X] T090 [P] [US9] Test that a duplicate starts `INITIALIZED` with no votes, schedule or bookkeeping fields, and that the source is unchanged, in `tests/polls-admin-crud.test.ts`

### Implementation for User Story 9

- [X] T091 [US9] Enforce archive-only-from-`CLOSED` and refuse every change to an `ARCHIVED` poll in `src/polls/service.ts`
- [X] T092 [US9] Restrict `DELETE /api/admin/polls/:pid` to the three permitted states in `src/routes/pollsApi.ts`
- [X] T093 [US9] Change `duplicatePoll` to produce `INITIALIZED` with no bookkeeping fields in `src/polls/service.ts` so a copy cannot reach the public unscreened
- [X] T094 [US9] Delete votes outright for participant removal and banning in `src/routes/pollsApi.ts`, retaining the `voteHistory` entries (FR-055)
- [X] T095 [US9] Render the action menu from the server's `can*` booleans in `src/public/adminList.js`, hiding edit and update entirely for `ARCHIVED` (FR-052), and wire the Archive item to `PATCH /api/admin/polls/:pid` with `{"pollState": "ARCHIVED"}` behind a confirmation dialog, since archiving is irreversible (FR-050)
- [X] T096 [US9] Add the delete confirmation dialog in `src/public/adminList.js` (FR-053)
- [X] T097 [US9] Refuse `PUT /api/admin/polls/:pid/invited` when the poll is `EDITING`, `AWAITING APPROVAL` or `ARCHIVED` in `src/routes/pollsApi.ts`

**Checkpoint**: The end of the lifecycle is safe; nothing votable can be destroyed.

---

## Phase 12: User Story 10 - Configuration reads consistently (Priority: P3)

**Goal**: One naming convention for every environment-supplied setting, with no superseded name anywhere.

**Independent Test**: Start with the renamed settings and confirm every one is read; grep the project and confirm no old name survives.

### Tests for User Story 10

- [X] T098 [P] [US10] Update `tests/config.test.ts` to the new names and add coverage for the six new settings and their defaults
- [X] T099 [P] [US10] Test that a missing no-default setting fails startup with a message naming it in `tests/config.test.ts` (FR-057)

### Implementation for User Story 10

- [X] T100 [US10] Rename all fifteen existing settings to the `ENV_` prefix in `src/config.ts` with no fallback to the old names (research R6)
- [X] T101 [US10] Update the interpolated OAuth variable **template** in `src/auth/auth.ts` — renaming literals alone will not work
- [X] T102 [P] [US10] Rename settings referenced in `src/email/mailer.ts`
- [X] T103 [P] [US10] Rename settings across the remaining suites in `tests/`
- [X] T104 [P] [US10] Update setting names in `launch.json.example` and `devScripts.example/launch-dev.ps1`, adding the six new ones
- [X] T105 [P] [US10] Update setting names in `README.md` and the environment table in `CLAUDE.md`
- [X] T106 [P] [US10] Update setting names in `postman/openapi.json` descriptions

**Checkpoint**: One convention throughout.

---

## Phase 13: Polish & Cross-Cutting Concerns

- [X] T107 Add the five new endpoints and the eight changed ones to `postman/openapi.json` per `contracts/api-endpoints.md`
- [X] T108 [P] Remove `removed` from the poll shapes documented in `postman/openapi.json`
- [X] T109 Verify no superseded name survives: `grep -rn "APP_" src/ tests/ postman/ README.md CLAUDE.md launch.json.example devScripts.example/` must return nothing (SC-013)
- [X] T110 Verify no marker survives: `grep -rn "removed" src/polls/ src/routes/pollsApi.ts` must show no `Choice.removed` or `VoteEntry.removed` (SC-014)
- [X] T111 Run the full `quickstart.md` walkthrough, Parts 1 through 4, against a freshly dropped database
- [ ] T112 Update the DigitalOcean environment to the new setting names **before** deploying — the hard cutover means a partial rename fails at startup

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — **blocks every user story**
- **User stories (Phases 3–12)**: all depend on Foundational; then parallelizable subject to the file conflicts below
- **Polish (Phase 13)**: depends on all desired stories

### User Story Dependencies

Every story is independently testable after Foundational. Three soft couplings are worth planning around, none of which breaks independence:

- **US5 deepens US1's edit-session endpoint.** US1 delivers the eligibility and mode decision; US5 adds the lock, heartbeat and recovery. US1 is demonstrable without US5 — an unlocked editing surface still enforces who may edit.
- **US7 deepens US3's approval sweep.** US3 delivers query 2 and verdict handling; US7 adds the claim atomicity, timeout, query 1 and the attempt budget. US3 is demonstrable with a screener that always succeeds.
- **US9's action menu consumes US8's `can*` booleans.** Build US8 first if doing both; US9 can compute them inline if not.

### File Conflicts (do not run these in parallel)

| File | Contested by |
|---|---|
| `src/routes/pollsApi.ts` | US1, US2, US3, US5, US7, US8, US9 |
| `src/public/adminPoll.js` | US1, US2, US3, US4, US5, US6 |
| `src/polls/sweeps.ts` | US3, US4, US5, US7 |
| `src/polls/service.ts` | US1, US4, US9 |
| `src/public/adminList.js` | US7, US8, US9 |
| `src/config.ts` | Foundational (T008), US10 (T100) |

### Within Each User Story

Tests first and failing → service logic → endpoints → page routes → client. Story complete before the next priority.

### Parallel Opportunities

- T002 and T003 in Setup
- T009 and T010 in Foundational
- Every test task within a story phase (all marked [P], all different files)
- T102–T106 in US10 — six different files, no interdependency
- Whole stories across developers, respecting the conflict table above

---

## Parallel Example: User Story 7

```bash
# All five tests first — different concerns, same file, so write them together then run once:
Task: "T071 Claim atomicity in tests/polls-screening.test.ts"
Task: "T072 Timeout path in tests/polls-screening.test.ts"
Task: "T073 Crashed-claim recovery in tests/polls-screening.test.ts"
Task: "T074 Budget termination under a dying process in tests/polls-screening.test.ts"
Task: "T075 Attempt reset on any completed call in tests/polls-screening.test.ts"

# Then implementation, which is sequential — T076-T080 all touch src/polls/sweeps.ts
```

## Parallel Example: User Story 10

```bash
# Six files, no interdependency — fully parallel:
Task: "T102 Rename settings in src/email/mailer.ts"
Task: "T103 Rename settings across tests/"
Task: "T104 Update launch.json.example and devScripts.example/launch-dev.ps1"
Task: "T105 Update README.md and CLAUDE.md"
Task: "T106 Update postman/openapi.json descriptions"
```

---

## Implementation Strategy

### MVP scope

**Phases 1, 2 and 3 (T001–T025)** deliver the minimum that demonstrates this feature's purpose: full
editing restricted to never-voted polls, choices replaced wholesale, and the reconciliation
machinery gone.

A more satisfying demo is **Phases 1–5 (T001–T045)** — all three P1 stories — which gives every poll
exactly one editing surface and makes publishing explicit. That is the natural first deployable
increment, because US1 and US2 are complementary halves of one rule and US3 removes autosave.

### Incremental delivery

1. Setup + Foundational → foundation ready
2. + US1 → MVP, stop and validate
3. + US2 → every poll has exactly one editing surface
4. + US3 → explicit publish with a screening gate — **first deployable increment**
5. + US4 → unattended scheduling
6. + US5, US6 → safe concurrent editing
7. + US7 → outage resilience
8. + US8, US9 → operational polish and lifecycle end
9. + US10 → configuration consistency
10. Polish → contract sync and full quickstart validation

### Parallel team strategy

After Foundational: one developer on US1 → US2 → US5 → US6 (the editing surface and its lock), one
on US3 → US7 (the screening pipeline), one on US4 → US8 → US9 (scheduling and the admin list). US10
is independent of all three and can go to whoever finishes first. The conflict table above is the
merge risk to watch — `pollsApi.ts` and `adminPoll.js` are contested by nearly every story.

---

## Notes

- **No test may sleep.** Inject timestamps and call single sweep ticks directly. A suite that waits
  out a real interval is a defect in the test.
- T074 is the single most valuable test in this feature: it is the one that fails, by hanging, if the
  screening attempt counter is incremented on failure rather than on claim.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
