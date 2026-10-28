---

description: "Task list for 012-ADMIN-REVISIONS"
---

# Tasks: Admin Revisions

**Input**: Design documents from `/specs/012-ADMIN-REVISIONS/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: **Included, and not optional here.** Two reasons: the constitution's Principle IV
requires every task to carry a verifiable success criterion before work begins; and removing
`accessMode` and `resultsVisibility` breaks 9 existing suites plus the shared fixture helper at compile
time — 119 occurrences across 15 files — so updating them is part of the work, not an addition to it.
Tests are written before the behaviour they cover within each story.

**Organization**: Grouped by user story so each is independently implementable and testable.

> **Implementation status — 2026-09-04.** Complete. All seven original user
> stories plus four scope additions from manual validation. `tsc` clean, `npm run build` clean,
> **438/438 tests passing** (baseline 310; 128 added). `postman/openapi.json` audited against
> the contract document and guarded by standing assertions.
>
> **Manual validation (T090) passed in full** — including the browser-only checks the automated
> suite cannot make: the list layout (SC-006), one `/api/polls` request per interval rather than
> one per card (SC-008), and a manually chosen poll state surviving a full 60-second sweep
> (SC-003 step 4).
>
> It found six defects, all fixed and guarded: radio-button rendering, Save and Publish stuck
> disabled, a banned voter offered a vote that then failed silently, participant changes saving
> without confirmation, a cleared voter limit rejected as invalid, and invisible button text.
> Five scope additions came out of it: FR-055/056 (invited polls on the home grid), FR-057/058
> (a blocked viewer is told, and no refusal is silent), FR-059/060 (participant changes save with
> the poll), FR-061 to FR-064 (voter-limit behaviour and presentation), and FR-065/066
> (configurable rate limit and voter ceiling).
>
> **T002 done** — the `polls` and `voteHistory` collections were dropped on the dev machine
> before manual testing. Destructive and irreversible, and still to be repeated against any
> other target database at deploy time, since this feature ships no migration.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different files, no dependency on an incomplete task
- **[Story]**: US1–US7, mapping to the user stories in [spec.md](./spec.md)
- Exact file paths are given in every task

## Path Conventions

Single project at repository root: `src/` and `tests/`. This feature adds no directory and no
source file — it modifies ten source files and eight test files in place, per
[plan.md § Project Structure](./plan.md).

---

## Phase 1: Setup

**Purpose**: Establish a known-good baseline before a change that deliberately breaks the suite.

- [X] T001 Record the pre-change baseline: run `npm test` and `npm run build` at the repository root and note the passing suite count, so the Foundational phase's breakage is distinguishable from pre-existing failure
- [X] T002 **(done on the dev machine 2026-09-04, prior to manual testing)** Drop the local development collections `polls` and `voteHistory` in the database named by `ENV_MONGODB_NAME` (the `mongosh` snippet in [quickstart.md](./quickstart.md) § Prerequisites), per [research R13](./research.md) — this feature ships no migration and no code tolerates the old fields

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The `pollVisibility` collapse and the shared capability helper. Every user story
reads one or both.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. The collapse cannot be
staged — TypeScript `strict` breaks every reference the moment the two fields are removed, so
`src/` must be swapped in one pass (T003–T008) and the suites brought with it (T009–T011).

- [X] T003 Add `POLL_VISIBILITIES`, the `PollVisibility` union, `isPublicVisibility` and `isInvitationOnly` to `src/polls/store.ts`; remove the `AccessMode` and `ResultsVisibility` types; on the `Poll` interface remove `accessMode` and `resultsVisibility` and add `pollVisibility` — per [data-model §1](./data-model.md) and [research R1](./research.md)
- [X] T004 Set `pollVisibility: "PUBLIC POLL"` in `createDefaultPoll` in `src/polls/service.ts` and remove the two removed fields from the default document
- [X] T005 In `validatePollFields` in `src/polls/service.ts`: validate `pollVisibility` by membership in `POLL_VISIBILITIES`; **delete the access/visibility auto-switch block** ([research R2](./research.md)); **delete the public→private voter-limit auto-fill**; export `PRIVATE_VOTER_LIMIT_DEFAULT = 500`
- [X] T006 In `validateVoteSubmission` in `src/polls/service.ts`: swap the invitation check to `isInvitationOnly`, and widen the voter-limit gate from `PRIVATE_POLL_ANYONE_WITH_THE_LINK` to every non-public visibility, resolving a null limit to `PRIVATE_VOTER_LIMIT_DEFAULT` per [data-model §2](./data-model.md)
- [X] T007 In `src/routes/pollsApi.ts`: swap the `GET /api/polls` filter to `pollVisibility === "PUBLIC POLL"`, and swap the `notYetVoted` gate on `GET /api/admin/polls/:pid/results` to `isInvitationOnly`
- [X] T008 Extract `capabilitiesFor(poll, hasEverBeenVotedOn)` into `src/polls/service.ts` returning all seven booleans including the new `canOpen` and `canClose` per [data-model §5](./data-model.md), and call it from `GET /api/admin/polls` in `src/routes/pollsApi.ts` in place of the inline block
- [X] T009 [P] Replace the two removed fields with `pollVisibility` in `tests/helpers/poll-fixtures.ts`
- [X] T010 Update `tests/polls-admin-crud.test.ts`, `tests/polls-service.test.ts` and `tests/polls-editing-eligibility.test.ts` to `pollVisibility`
- [X] T011 [P] Update `tests/polls-vote.test.ts`, `tests/polls-discovery.test.ts`, `tests/polls-admin-participants.test.ts`, `tests/polls-state-machine.test.ts`, `tests/polls-editing-lock.test.ts` and `tests/polls-screening.test.ts` to `pollVisibility`
- [X] T012 Add a unit test in `tests/polls-service.test.ts` asserting `capabilitiesFor` returns the correct seven booleans for all eight poll states, per the table in [data-model §5](./data-model.md)

**Checkpoint**: `npx tsc --noEmit` is clean and `npm test` is back to the T001 baseline. No
occurrence of `accessMode` or `resultsVisibility` remains anywhere in `src/` or `tests/`.

---

## Phase 3: User Story 1 - Ban a voter and invite a participant without being blocked (Priority: P1) 🎯 MVP

**Goal**: Make the two broken participant actions work from the page that owns the editing lock,
while a stale page session is still refused.

**Independent Test**: Open a poll's editing page, add an invited address and ban a participant.
Both succeed and the lists update. Nothing from any other story is required.

### Tests for User Story 1

- [X] T013 [US1] In `tests/polls-admin-participants.test.ts`, add failing tests: the lock holder's `clientGuid` is accepted on all three participant routes while the poll is `EDITING`; a different `clientGuid` is refused with 409
- [X] T014 [US1] In `tests/polls-admin-participants.test.ts`, add failing tests: participant moderation succeeds on a poll that has votes (`UPDATE` mode), and is still refused for `AWAITING APPROVAL` and `ARCHIVED`
- [X] T015 [US1] In `tests/polls-admin-participants.test.ts`, add failing tests for FR-017a — banning removes the address from the participant list, the invited list and the counted results; un-banning removes it from the banned list only, restoring neither the invitation nor the vote
- [X] T016 [P] [US1] In `tests/polls-admin-crud.test.ts`, add a failing test for FR-023 — a visibility change away from an invitation-only value retains both `invitedVoterList` and `bannedVoterList`. This is a regression guard, not a driver of new code: nothing clears these lists today, and FR-023 exists to keep it that way

### Implementation for User Story 1

- [X] T017 [US1] In `src/routes/pollsApi.ts`, widen `resolveEditContext` usage so callers may accept both `EDIT` and `UPDATE` modes (delete `refuseWhenNotConfigurable` in T020, once its last caller is gone — removing it here leaves the file uncompilable)
- [X] T018 [US1] In `src/routes/pollsApi.ts`, adopt `resolveEditContext` on `POST /api/admin/polls/:pid/invited`, reading `clientGuid` from the body per [contracts/api-endpoints.md](./contracts/api-endpoints.md)
- [X] T019 [US1] In `src/routes/pollsApi.ts`, adopt `resolveEditContext` on `DELETE /api/admin/polls/:pid/participants/:emailAddress`, reading `clientGuid` from the JSON body
- [X] T020 [US1] In `src/routes/pollsApi.ts`, adopt `resolveEditContext` on `DELETE /api/admin/polls/:pid/banned/:emailAddress`, reading `clientGuid` from the JSON body, then delete the now-uncalled `refuseWhenNotConfigurable`
- [X] T021 [P] [US1] In `src/public/admin-poll.html`, add a participant-error element that is visible for every visibility value, outside the invite row whose error slot is hidden unless the poll is invitation-only (FR-022)
- [X] T022 [US1] In `src/public/adminPoll.js`, send `clientGuid` on all three participant calls and route their failures to the new always-visible error element
- [X] T023 [US1] In `src/public/adminPoll.js`, render the participant section on the update page as well as the editing page, gating only the invite row on `isInvitationOnly` (FR-019a, FR-020, FR-021)
- [X] T024 [P] [US1] Add `clientGuid` to the three participant request bodies in `postman/openapi.json`

**Checkpoint**: SC-001 passes — both previously broken actions work, on both editing surfaces.

---

## Phase 4: User Story 2 - Choose poll visibility as one setting (Priority: P1)

**Goal**: One visibility control with five valid options, nothing silently rewritten, and voter
count limit semantics that match it.

**Independent Test**: Select each of the five values in turn, save, reopen — each is stored and
re-displayed exactly as chosen, and no other setting changed.

### Tests for User Story 2

- [X] T025 [US2] In `tests/polls-admin-crud.test.ts`, add failing tests: each of the five values round-trips through publish verbatim, and setting one never changes another field (FR-003)
- [X] T026 [US2] In `tests/polls-admin-crud.test.ts`, add failing tests for the voter limit — forced to `null` and rejected for `PUBLIC POLL`; not auto-filled on a public→private change; `501` and non-integers rejected server-side (FR-006, FR-007, FR-009)
- [X] T027 [P] [US2] In `tests/polls-vote.test.ts`, add a failing test: on a private poll with a blank limit, the 500th voter is accepted and the 501st refused, for all four private values (FR-008, FR-010)
- [X] T028 [US2] In `tests/polls-admin-crud.test.ts`, add a failing test: `pollVisibility`, `choiceMode` and `voteMutability` are all rejected with 409 once the poll has been voted on (FR-004)

### Implementation for User Story 2

- [X] T029 [US2] In `src/polls/service.ts`, add the freeze check rejecting `pollVisibility`, `choiceMode` and `voteMutability` changes on a poll that has ever been voted on
- [X] T030 [P] [US2] In `src/public/admin-poll.html`, replace the `choiceMode`, `voteMutability` and `accessMode`/`resultsVisibility` `<select>` elements with three single-select radio groups whose labels are the stored values verbatim, per [contracts/ui-contracts.md](./contracts/ui-contracts.md)
- [X] T031 [US2] In `src/public/adminPoll.js`, wire the three radio groups to the draft and the dirty flag, and remove the re-fetch-on-change that the deleted auto-switch required
- [X] T032 [US2] In `src/public/adminPoll.js`, render all three groups as static read-only labels on the update surface (FR-004)
- [X] T033 [US2] In `src/public/adminPoll.js`, disable, grey and clear the voter-limit field for `PUBLIC POLL`; enable and leave it empty for the four private values; validate 1–500 as typed (FR-006, FR-007, FR-009)
- [X] T034 [P] [US2] In `src/public/admin.css`, style the three radio groups and the disabled voter-limit field
- [X] T035 [P] [US2] In `postman/openapi.json`, replace `accessMode` and `resultsVisibility` with `pollVisibility` across every schema that carries them

**Checkpoint**: SC-002 and SC-010 pass.

---

## Phase 5: User Story 3 - Open, close or archive a poll with one click (Priority: P2)

**Goal**: Three state buttons per row whose effect survives the schedule sweep.

**Independent Test**: Open, close and archive three polls from the list, wait past one
`ENV_POLL_DATE_CHECK_POLLING_INTERVAL`, and confirm each is still in the chosen state.

### Tests for User Story 3

- [X] T036 [US3] In `tests/polls-state-machine.test.ts`, add failing tests for the three transitions' from-state guards, asserting a 409 leaves the poll unchanged (FR-024, FR-029)
- [X] T037 [US3] In `tests/polls-state-machine.test.ts`, add failing tests for the schedule writes of each transition per [data-model §4](./data-model.md), including that archiving leaves `startAt` and `endAt` untouched (FR-027)
- [X] T038 [P] [US3] In `tests/polls-schedule-sweep.test.ts`, add failing convergence tests: perform each transition at injected time T, run `pollDateCheckSweep` at T + interval, assert the state is unchanged (FR-028) — the case that matters most is reopening a poll whose `endAt` is in the past

### Implementation for User Story 3

- [X] T039 [US3] In `validateStateAction` in `src/polls/service.ts`, accept `OPEN` in addition to `CLOSED` and `ARCHIVED`, and add the per-target from-state guards from [data-model §4](./data-model.md)
- [X] T040 [US3] In `validateStateAction` in `src/polls/service.ts`, replace the blanket `endAt = now` with the three per-transition schedule rules, so archiving preserves the schedule entirely
- [X] T041 [US3] In `src/public/admin.html`, restructure the table header to the full ten columns in [contracts/ui-contracts.md](./contracts/ui-contracts.md) — adding Open, Close and Archive in positions 3–5 and removing the retired `Subtitle`, `Waiting` and `Rejection reason` columns. **US3 owns the header for both stories**; US5 renders into it (see Dependencies)
- [X] T042 [US3] In `src/public/adminList.js`, render the three state buttons on every row, enabled from `canOpen`/`canClose`/`canArchive` and greyed otherwise, each issuing `PATCH /api/admin/polls/:pid`
- [X] T043 [US3] In `src/public/adminList.js`, display a 409 refusal inline on the requesting row and let the next refresh reconcile (FR-029)
- [X] T044 [P] [US3] In `src/public/admin.css`, style the enabled and greyed state buttons so columns stay aligned across rows of differing height
- [X] T045 [P] [US3] In `postman/openapi.json`, add `OPEN` to the `PATCH /api/admin/polls/{pid}` request schema and document the per-transition schedule side effects

**Checkpoint**: SC-003 and SC-004 pass, including the timed wait.

---

## Phase 6: User Story 4 - Save the whole poll with one button (Priority: P2)

**Goal**: One save action covering the choices, and a Cancel that works from page load.

**Independent Test**: Change only the choices — the single save button enables and stores the
change. No separate choices-save control exists.

### Tests for User Story 4

- [X] T046 [US4] In `tests/polls-admin-crud.test.ts`, add a failing test: `POST …/publish` with `labels` replaces the choice list in the same write as the other fields
- [X] T047 [US4] In `tests/polls-admin-crud.test.ts`, add a failing test for FR-013: a publish rejected on any field persists **nothing**, choices included
- [X] T048 [US4] In `tests/polls-admin-crud.test.ts`, add failing tests: `labels` is rejected in `UPDATE` mode (FR-014), and `PUT /api/admin/polls/:pid/choices` returns 404

### Implementation for User Story 4

- [X] T049 [US4] In `src/routes/pollsApi.ts`, accept `labels` on `POST /api/admin/polls/:pid/publish`, calling `replaceChoices` inside the same validation pass and merging its result into the single `$set` per [research R3](./research.md)
- [X] T050 [US4] In `src/routes/pollsApi.ts`, add `labels` to the `UPDATE`-mode disallowed-field rejection, then **delete the `PUT /api/admin/polls/:pid/choices` route**
- [X] T051 [P] [US4] In `src/public/admin-poll.html`, remove the `saveChoicesBtn` control
- [X] T052 [US4] In `src/public/adminPoll.js`, feed the choices textarea into the shared dirty flag, send `labels` with the publish payload, and remove the separate choices-save path (FR-011, FR-012)
- [X] T053 [US4] In `src/public/adminPoll.js`, enable Cancel from page load and make it release the editing session and confirm when dirty, matching the header back icon (FR-015, FR-016)
- [X] T054 [P] [US4] In `postman/openapi.json`, add `labels` to the publish request schema and remove the `PUT …/choices` path entirely

**Checkpoint**: SC-005 passes.

---

## Phase 7: User Story 5 - Read the whole poll list at a glance (Priority: P2)

**Goal**: A ten-column row with a stacked title block, zebra striping per poll, and four
one-click action icons.

**Independent Test**: Load the list with polls in a spread of states and confirm the layout, the
shading, the date wording, and that every icon works and shows a tooltip.

- [X] T055 [US5] **(done early — the row had to match T041's header or the table breaks; US5 still owns the title-block typography in T056/T057)** In `src/public/adminList.js`, remove the row cells for the retired `Subtitle`, `Waiting` and `Rejection reason` columns so each row matches the ten-column header from T041 — if US5 ships before US3, apply T041's header change first
- [X] T056 [US5] In `src/public/adminList.js`, render the stacked title block — pen icon plus title, then subtitle beneath — with the pen and the title link driven by `canEdit`/`canUpdate` and the title rendered as plain text when neither applies (FR-034, FR-035)
- [X] T057 [US5] In `src/public/adminList.js`, render the optional third line for `AWAITING APPROVAL` and `REJECTED`, including the `[Re-attempt Screening]` button only when `canRescreen` (FR-036, FR-037)
- [X] T058 [US5] In `src/public/adminList.js`, render `started` for an empty `startAt` and `does not end` for an empty `endAt` (FR-038)
- [X] T059 [US5] In `src/public/admin.html`, add a hidden `<svg><symbol>` block defining the pen, duplicate, link, chart and trash icons as inline SVG per [research R11](./research.md)
- [X] T060 [US5] In `src/public/adminList.js`, render the four action icons in column 9 via `<use>`, always present, each in a button with a `title` tooltip, with delete enabled only when `canDelete` and still confirming before it destroys (FR-039, FR-040)
- [X] T061 [US5] In `src/public/adminList.js`, keep the kebab menu at the far right dispatching the same handlers as the icons, with its wording unchanged (FR-041)
- [X] T062 [US5] In `src/public/admin.css`, add `tbody tr:nth-child(even)` zebra striping using existing surface tokens, plus the title-block, subtitle, screening-line and icon-button styles
- [X] T063 [US5] In `src/public/admin.css`, give the table container `overflow-x: auto` so the widened row scrolls sideways within itself and the page body never does
- [X] T064 [P] [US5] In `tests/poll-card-assets.test.ts`, extend the static-asset assertions to cover the new icon symbol ids referenced by `adminList.js`

**Checkpoint**: SC-006 passes.

---

## Phase 8: User Story 6 - Keep the home page trustworthy while a poll is being edited (Priority: P3)

**Goal**: No vote ever lands against a poll being edited, no selection is ever lost, and the grid
keeps its own membership current.

**Independent Test**: Put a poll into editing and confirm all four windows end on the front face
with the message; then create and close polls and confirm the grid adds and removes cards.

### Tests for User Story 6

- [X] T065 [US6] In `tests/polls-discovery.test.ts`, add failing tests: an `EDITING` poll whose `pollStateBeforeEditUpdate` is public appears in `GET /api/polls` and resolves on `GET /api/polls/:pid`; one whose pre-edit state was `INITIALIZED` or `REJECTED` stays hidden and 404s (FR-046)
- [X] T066 [US6] In `tests/polls-discovery.test.ts`, add a failing test asserting `pollStateBeforeEditUpdate` never appears in either public response body (FR-047)
- [X] T067 [P] [US6] In `tests/polls-vote.test.ts`, add a failing test: voting on an `EDITING` poll returns 409 with `code: "POLL_EDITING"` and records nothing, checked before the generic not-open refusal (FR-044)
- [X] T068 [US6] In `tests/polls-discovery.test.ts`, add a failing test asserting `GET /api/polls` includes `myChoiceIds` for a signed-in caller and omits it for a guest

### Implementation for User Story 6

- [X] T069 [US6] In `src/routes/pollsApi.ts`, admit `EDITING` polls to the `GET /api/polls` filter when `pollStateBeforeEditUpdate` is one of the three public states, per [research R6](./research.md)
- [X] T070 [US6] In `src/routes/pollsApi.ts`, apply the same admission to `GET /api/polls/:pid`, and confirm `buildPollDetail` never emits `pollStateBeforeEditUpdate`
- [X] T071 [US6] In `src/routes/pollsApi.ts`, resolve the caller's session on `GET /api/polls` so each entry carries `myChoiceIds`, per [research R8](./research.md)
- [X] T072 [US6] In `src/polls/service.ts`, add the `EDITING` branch to `validateVoteSubmission` before the generic not-open refusal, carrying the "Try Again" message, and surface `code: "POLL_EDITING"` from the vote route in `src/routes/pollsApi.ts`
- [X] T073 [US6] In `src/public/pollGrid.js`, re-fetch `GET /api/polls` every `ENV_POLLING_INTERVAL`, diff membership by `pid`, mount and unmount cards accordingly, and stop each removed card's timer (FR-048)
- [X] T074 [US6] In `src/public/pollCard.js`, feed cards from the grid's list payload and remove the per-card polling loop, keeping the route for the standalone `?PID=` view
- [X] T075 [US6] In `src/public/pollCard.js`, render the front face with the "Try Again" message and neither the vote nor the live-results control while a poll is `EDITING`, taking precedence over the closed-poll message (FR-042, FR-042a, FR-043)
- [X] T076 [US6] In `src/public/pollCard.js`, handle all four windows so each ends on the front face — including branching on `code: "POLL_EDITING"` rather than the message text — and hold the in-progress selection independently of the flip state so it survives a forced flip and is restored at W5 (FR-045, FR-049), per [research R7](./research.md) and [research R9](./research.md)
- [X] T077 [P] [US6] In `src/public/pollCard.css`, style the unavailable-message block on the card front face

**Checkpoint**: SC-007 and SC-008 pass, including the one-request-per-interval check.

---

## Phase 9: User Story 7 - Reach poll administration from the profile menu (Priority: P3)

**Goal**: A menu entry for administrators, absent for everyone else, that changes no permission.

**Independent Test**: Sign in as a listed administrator and confirm the entry appears and works;
sign in as anyone else and confirm it is absent.

### Tests for User Story 7

- [X] T078 [P] [US7] In `tests/profile.test.ts`, add failing tests: `GET /api/me` returns `isAdmin: true` for an `ENV_ADMINS` address and `false` otherwise, matching case-insensitively against trimmed entries (FR-050, FR-051)
- [X] T079 [P] [US7] In `tests/pages.test.ts`, add a failing test asserting `/admin` still returns 403 for a non-administrator regardless of the flag (FR-053)

### Implementation for User Story 7

- [X] T080 [US7] Extract `isAdminEmail(email, config)` from `createRequireAdmin` into `src/polls/service.ts` and call it from `createRequireAdmin`, per [research R10](./research.md)
- [X] T081 [US7] In `src/routes/api.ts`, add `isAdmin` to the `GET /api/me` response using `isAdminEmail` (FR-049)
- [X] T082 [US7] In `src/public/app.js`, render a `Poll Administration` entry linking to `/admin` between `Edit Profile` and `Logout` when `isAdmin` is true, and omit it entirely otherwise (FR-052)
- [X] T083 [P] [US7] In `postman/openapi.json`, document `isAdmin` on the `GET /api/me` response schema

**Checkpoint**: SC-009 passes.

---

## Phase 11: US8 — Invited polls on the home grid (added after manual validation)

**Purpose**: An invited voter could not find the poll they were invited to. 004 FR-033 promised
"a post-login suggestion to an invited user" and it was never built; no invitation email is sent
either, so invitation-only polls had no discovery path at all. Added to 012 rather than deferred,
because it makes an existing advertised feature usable.

- [X] T092 [US8] Add `INVITATION_ONLY_VISIBILITIES` and `homeGridFilter(callerEmail)` to `src/polls/store.ts`, combining the state rule and the visibility rule with `$and` so neither `$or` clause is lost
- [X] T093 [US8] Use `homeGridFilter` in `GET /api/polls` in `src/routes/pollsApi.ts`, resolving the caller before building the query
- [X] T094 [US8] Cover it in `tests/polls-discovery.test.ts`: listed for the invitee; withheld from other users and guests; withheld from a banned invitee; link-only polls still never listed; the same state rule applies; composes with the FR-046 under-edit rule
- [X] T095 [US8] Record FR-055/FR-056 in `specs/012-ADMIN-REVISIONS/spec.md`, noting they supersede 004 FR-033, and document the change on `GET /api/polls` in `postman/openapi.json`

---

## Phase 12: US9 — A blocked viewer is told, and no refusal is silent (from manual validation)

**Purpose**: A banned user on a public poll was offered a Vote button, then a Submit button,
and the refusal was then swallowed — no vote, no message. The server was always correct;
the card had never been told who may vote.

- [X] T096 [US9] Extract `viewerVoteBlock(poll, email, isNewVoter)` in `src/polls/service.ts` from `validateVoteSubmission`'s banned / not-invited / poll-full checks, so one predicate serves both the refusal and the display
- [X] T097 [US9] Report `canVote` and `voteBlockedReason` from `buildPollDetail` in `src/routes/pollsApi.ts` for a signed-in caller only
- [X] T098 [US9] In `src/public/pollCard.js`, withhold the vote and submit controls from a blocked viewer, show the reason on the front face, and keep results readable
- [X] T099 [US9] In `src/public/pollCard.js`, show every refused vote — replacing the silent fall-through to `fetchPoll()` that hid the ban — plus a network-failure message
- [X] T100 [US9] Style `.poll-blocked-message` and `.poll-vote-error` in `src/public/site.css`
- [X] T101 [US9] Cover both halves: `tests/polls-vote.test.ts` for the payload and the still-authoritative refusal, `tests/poll-card-assets.test.ts` for the card behaviour; record FR-057/FR-058 in the spec and `postman/openapi.json`

---

## Phase 13: US10 — Participant changes save with the poll (from manual validation)

**Purpose**: Add Participant, Ban and Un-Ban wrote immediately through three routes of their own.
A ban therefore took effect the instant it was clicked — voters saw their vote disappear before
anything was saved, Save and Publish stayed disabled because nothing was pending, and Cancel
could not undo it. The same two-save-models defect R1 fixed for the choice list.

- [X] T102 [US10] Accept `invitedVoterList` and `bannedVoterList` in `validatePollFields` (`src/polls/service.ts`) as the desired final state, deriving `currentVotes` from them — banning drops the vote, invitation-only seeds a placeholder per invitee
- [X] T103 [US10] Add both lists to `UPDATE_FIELDS` in `src/routes/pollsApi.ts`, and delete `POST …/invited`, `DELETE …/participants/:email` and `DELETE …/banned/:email` along with the now-orphaned `refuseParticipantChange`, `EMAIL_RE` and `EMAIL_MAX` import
- [X] T104 [US10] In `src/public/adminPoll.js`, hold the lists in local state, mutate them on click, mark the page dirty, and render both lists from that state so an unsaved change is visible
- [X] T105 [US10] Move the participant assertions in `tests/polls-admin-participants.test.ts` and `tests/polls-state-machine.test.ts` onto the publish path, and add one proving nothing is written before the save (FR-060)
- [X] T106 [US10] Guard the client behaviour in `tests/poll-card-assets.test.ts`; record FR-059/FR-060 in the spec and both lists in `postman/openapi.json`

---

## Phase 14: FR-061 — clearing the voter count limit (from manual validation)

**Purpose**: Emptying the field and saving reported "voterCountLimit must be a whole number
between 1 and 500". A number input yields `""` when emptied, and `Number("")` is `0`, which
failed the `n <= 0` check — so the ordinary act of clearing the box looked like an invalid entry.

- [X] T107 Treat a blank value (`null`, `""`, whitespace) as cleared in `validatePollFields` in `src/polls/service.ts`, before the range check
- [X] T108 Send `null` rather than `""` for a blank field in `src/public/adminPoll.js`, replacing the generic `wireDraftField` wiring that forwarded `el.value` verbatim
- [X] T116 Replace the hard-coded `PRIVATE_VOTER_LIMIT_DEFAULT` with `ENV_PRIVATE_VOTER_LIMIT_DEFAULT` (default 500) in `src/config.ts`, threading config through `effectiveVoterLimit`, `viewerVoteBlock`, `validateVoteSubmission`, `validatePollFields` and `buildPollDetail` (FR-066)
- [X] T117 Expose it on `GET /api/config` and have `src/public/adminPoll.js` fetch it before the first render, driving the input's `max`, the hint text and the as-you-type validation from it rather than a hard-coded 500
- [X] T118 Cover it in `tests/config.test.ts`, `tests/polls-admin-crud.test.ts` (a configured ceiling moves both the maximum and the blank default together) and `tests/poll-card-assets.test.ts`; set it to `10` in both `.ps1` launchers and all 14 `launch.json` configurations, and document it in `CLAUDE.md`
- [X] T114 Replace the hard-coded `EMAIL_RATE_LIMIT` with `emailRateLimit(config)` in `src/auth/auth.ts`, reading `ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW` and `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW` from `src/config.ts`, converting minutes to seconds in that one place, and threading `config` through `consumeRateLimit`'s three call sites (FR-065)
- [X] T115 Cover it in `tests/config.test.ts` (defaults, overrides, the minutes→seconds conversion, rejection of non-positive values) and `tests/rate-limit.test.ts` (a configured limit is actually honoured by the limiter, and a shortened window releases a locked-out client); document both variables in `CLAUDE.md`
- [X] T112 Add `voterCountLimit` to `UPDATE_FIELDS` in `src/routes/pollsApi.ts` and drop `edit-only` from its section in `src/public/admin-poll.html`, so it renders and saves on the update surface (FR-064)
- [X] T113 Cover it in `tests/polls-admin-crud.test.ts` — raising it on a voted poll leaves the votes alone, the 1-500 and clearing rules still apply there, and a public poll still carries no limit — and update the two 011 assertions that had frozen it
- [X] T110 Read `unlimited` in the disabled field on a public poll via its placeholder, so the stored value stays empty, in `src/public/adminPoll.js` (FR-062)
- [X] T111 Size the input for four digits in `src/public/admin.css`, dropping the spinner and the blanket opacity that would have made the placeholder illegible; widen to 11ch only while disabled (FR-063)
- [X] T109 Cover it in `tests/polls-admin-crud.test.ts` (all three blank shapes clear it; a cleared private limit still binds at 500; genuinely invalid values are still rejected) and guard the client mapping in `tests/poll-card-assets.test.ts`

---

## Phase 10: Polish & Cross-Cutting Concerns
- [X] T084 Verify `postman/openapi.json` matches [contracts/api-endpoints.md](./contracts/api-endpoints.md) in full and that `tests/openapi-contract.test.ts` passes (FR-054)
- [X] T085 Add this feature's guards to `tests/openapi-contract.test.ts`, following the per-feature pattern 011 established: assert `postman/openapi.json` contains neither `accessMode` nor `resultsVisibility`, that the `pollVisibility` schema enumerates exactly the five values from [data-model §1](./data-model.md), and that `AdminPollSummary` documents `canOpen` and `canClose` (FR-054)
- [X] T086 [P] Confirm no occurrence of `accessMode` or `resultsVisibility` remains anywhere under `src/` or `tests/`, per the greps in [quickstart.md](./quickstart.md)
- [X] T087 [P] Confirm `refuseWhenNotConfigurable` is gone from `src/routes/pollsApi.ts` and that the access/visibility auto-switch and the voter-limit auto-fill are gone from `src/polls/service.ts`, each with no remaining callers; report — do not remove — any pre-existing dead code encountered (constitution Principle III)
- [X] T088 Update the poll-lifecycle reference and any `designDocs/` notes that still describe the two removed fields
- [X] T089 Run `npm run build` and confirm `dist/public` carries the changed client assets
- [X] T090 Work through [quickstart.md](./quickstart.md) end to end, including the timed wait in SC-003 step 4 and the network-panel check in SC-008 step 3
- [X] T091 Re-read the Constitution Check in [plan.md](./plan.md) against the delivered code and confirm each principle still holds, in particular that the feature is net-negative in lines (Principle II) — `git diff --stat main...HEAD` is the evidence

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — **blocks every user story**
- **User Stories (Phases 3–9)**: All depend on Foundational; independent of each other thereafter
- **Polish (Phase 10)**: Depends on every story you intend to ship

### Why Foundational is unusually large here

The template's usual advice is to keep Phase 2 thin. It cannot be thin in this feature: removing
two fields from `Poll` under TypeScript `strict` breaks every reference at compile time, so the
collapse and the suite updates are a single atomic unit (T003–T012). Splitting it across stories
would leave the repository uncompilable between them.

### User Story Dependencies

- **US1 (P1)**: After Foundational. Independent. Uses `isInvitationOnly` from T003.
- **US2 (P1)**: After Foundational. Independent. Carries the user-visible half of the collapse.
- **US3 (P2)**: After Foundational. Independent. Uses `capabilitiesFor` from T008.
- **US4 (P2)**: After Foundational. Independent.
- **US5 (P2)**: After Foundational. Uses `capabilitiesFor` from T008. **Soft dependency on US3**:
  T041 owns the ten-column header that US5 renders into, so shipping US5 first means applying
  T041's header change first. This is the one place two stories touch the same file
  (`src/public/admin.html`); everything else is genuinely independent.
- **US6 (P3)**: After Foundational. Independent.
- **US7 (P3)**: After Foundational. Independent of everything, including the collapse — it could
  ship alone if Foundational were not a shared prerequisite.

### Within Each User Story

Tests are written first and must fail. Then domain rules in `src/polls/service.ts`, then routes in
`src/routes/`, then client files in `src/public/`, then `postman/openapi.json`.

### Parallel Opportunities

`[P]` here means *safe to run concurrently with every other task in the same phase*. Where several
tasks write to one file they are sequential even when they are otherwise unrelated, because
concurrent edits to a single file are exactly the conflict the marker exists to prevent.

- **Phase 2**: T009 and T011 in parallel. T010 is sequential (T012 adds to one of its files);
  T007 is sequential (T008 also edits `pollsApi.ts`).
- **Phase 3**: T013 and T016 in parallel; T014, T015 follow T013 in the same test file. T021 and
  T024 run alongside the route work.
- **Phase 4**: T025 and T027 in parallel; T026, T028 follow T025 in the same test file. T030,
  T034, T035 in parallel.
- **Phase 5**: T036 and T038 in parallel; T037 follows T036. T044, T045 in parallel.
- **Phase 6**: T046 in parallel with T051 and T054; T047, T048 follow T046.
- **Phase 7**: T062 and T064 in parallel; T059 follows T041's header, T063 follows T062
  (both edit `admin.css`).
- **Phase 8**: T065 and T067 in parallel; T066, T068 follow T065. T077 in parallel.
- **Phase 9**: T078, T079, T083 in parallel.
- **Across phases**: once Foundational completes, six of the seven stories proceed independently.
  US5 waits on T041 only. The one shared file is `postman/openapi.json`, where each story edits a
  different section.

---

## Parallel Example: User Story 1

```bash
# Two test files, so two tracks in parallel:
Task: "T013 Lock-holder clientGuid accepted on all three participant routes in tests/polls-admin-participants.test.ts"
Task: "T016 Participant lists retained across a visibility change in tests/polls-admin-crud.test.ts"

# T014 and T015 extend the same file as T013, so they follow it rather than running beside it.

# Then the route work in sequence (same file), with these two alongside:
Task: "Always-visible participant error element in src/public/admin-poll.html"
Task: "clientGuid on the three participant bodies in postman/openapi.json"
```

---

## Implementation Strategy

### MVP scope

**Phase 1 + Phase 2 + Phase 3 (US1).** That delivers the two live defect fixes — the only part of
this feature where something advertised is currently unusable with no workaround — on top of the
model collapse every later story needs.

Note that the MVP is larger than usual because Foundational is larger than usual. There is no
smaller shippable slice: US1 cannot compile without T003–T012.

### Incremental delivery

1. Setup + Foundational → repository compiles and the suite is green again
2. **US1** → both broken actions work → demo (MVP)
3. **US2** → one visibility control, correct voter-limit semantics → demo
4. **US3** → one-click state control that survives the sweep → demo
5. **US4** → one save button, always-available Cancel → demo
6. **US5** → the redesigned list → demo
7. **US6** → grid currency and the editing race → demo
8. **US7** → the menu entry → demo
9. Polish → quickstart end to end

### Parallel team strategy

Everyone lands Foundational together — it is one atomic change and cannot be split. After that,
seven stories can proceed concurrently. The only shared file is `postman/openapi.json`; each story
touches a different section of it, so conflicts are additive rather than semantic.

---

## Notes

- `[P]` = different files, no dependency on an incomplete task
- Every task names its file path; every user-story task carries its `[US#]` label
- Tests are written before the behaviour they cover, and must fail first
- Commit after each task or logical group
- Stop at any checkpoint to validate that story independently
- **R12 (logging) is withdrawn** by the source requirements and generates no task. The volume
  analysis behind that withdrawal is preserved in `architecture/012-admin-revisions/index.html`
  for the dedicated logging feature that follows.
