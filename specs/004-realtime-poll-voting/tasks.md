# Tasks: Real-Time Opinion Poll System

**Input**: Design documents from `/specs/004-realtime-poll-voting/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/page-routes.md, contracts/api-endpoints.md, quickstart.md

**Tests**: Included — the spec's Independent Tests and Acceptance Scenarios are
concrete and contract-testable (existing Vitest+supertest+mongodb-memory-server
pattern), consistent with how `001-user-auth` and `003-profile-menu-consolidation`
were built (Goal-Driven Execution).

**Organization**: Tasks are grouped by user story (US1–US8, priority order from
spec.md). Each story is independently testable per its spec.md "Independent Test".

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US8)

## Path Conventions

Single project at repository root per plan.md (`src/`, `tests/`).

---

## Phase 1: Setup

**Purpose**: None — no new dependencies. `crypto.randomUUID()` is a Node built-in
(research.md R3); the existing Express/MongoDB/Vitest stack is reused unchanged. No
setup tasks for this feature.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared data-access, business-logic, and routing infrastructure every
user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 [P] Add `pollingIntervalMs` to the `GET /api/config` response in
      `src/routes/api.ts` (currently returns only `signinMethod`) — needed by every
      voter-facing polling loop (FR-026)
- [X] T002 [P] Create `src/polls/store.ts`: `polls()`/`voteHistory()` MongoDB
      collection accessors (data-model.md), plus an index on
      `voteHistory.pid` for lookup by poll
- [X] T003 Create `src/polls/service.ts` core functions (depends on
      T002): `createDefaultPoll()` (FR-036 AC1 defaults), `deriveState(poll, now)`
      (`PENDING`/`ACTIVE`/`CLOSED`/`ARCHIVED` derivation from `startAt`/`endAt`,
      explicit `CLOSED`/`ARCHIVED` always win — FR-014), `computeResults(poll)`
      (per-choice count/percentage, FR-021: against distinct participants for single-choice, against selections for multi-choice,
      research.md R5)
- [X] T004 Add `requireAdmin` Express middleware to `src/polls/service.ts` (depends
      on T003, same file): looks up the session via `auth.api.getSession`, compares
      the signed-in `emailAddress` (lowercased) against `config.admins`, `401`/`403`
      otherwise (research.md R6)
- [X] T005 Create `src/routes/pollsApi.ts` router skeleton and mount it in
      `src/server.ts` alongside the existing `api.ts`/`pages.ts` routers (depends on
      T002–T004)
- [X] T006 [P] Write `tests/polls-service.test.ts`: unit tests for `deriveState`
      (no dates → active; future `startAt` → pending; past `endAt` → closed;
      explicit `ARCHIVED-POLL-STATE` always wins regardless of dates) and
      `computeResults` (single-choice percentages; multi-choice percentage against
      selections, so the percentages add up to 100, FR-020/021) — depends on T003

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Vote on a Public Poll and See Live Results (Priority: P1) 🎯 MVP

**Goal**: A logged-in user opens a public poll via its direct link, votes, and sees
results (including their own vote) update — and sees a peer's vote reflected within
one polling interval, no manual reload (FR-016–027, FR-034).

**Independent Test**: Single-choice, public, anonymous, final-vote poll with two
choices; log in, open it, submit a vote, confirm results show it counted and update
again after another user votes (quickstart.md US1).

### Tests for User Story 1 ⚠️

- [X] T007 [P] [US1] Write `tests/polls-vote.test.ts`: `GET /api/polls/:pid` for a
      public poll (guest sees results; signed-in user sees `myChoiceIds`) and
      `POST /api/polls/:pid/vote` (single-choice submit → results show 1
      participant / 100% on that choice; a second account's vote changes the
      percentages on the next fetch; `401` for a guest vote attempt, FR-016) per
      contracts/api-endpoints.md. Confirm these fail before T008/T009 exist

### Implementation for User Story 1

- [X] T008 [US1] Implement `GET /api/polls/:pid` in `src/routes/pollsApi.ts` (uses
      `deriveState`/`computeResults` from T003; `404` if `ARCHIVED-POLL-STATE`,
      FR-045) — depends on T007, T003
- [X] T009 [US1] Implement `submitVote()` in `src/polls/service.ts` and
      `POST /api/polls/:pid/vote` in `src/routes/pollsApi.ts`: writes/updates the
      matching `VoteEntry` in `polls.currentVotes` and appends one row to
      `voteHistory` (shared `votedAt` per submission, FR-018); rejects empty
      `choiceIds` (`400`), non-`ACTIVE-POLL-STATE` polls (`409`, names the actual
      state, FR-027) — depends on T008
- [X] T010 [P] [US1] Adapt `designDocs/pollUserInterface/poll-card.css` into
      `src/public/pollCard.css` (same tokens/layout, no functional changes needed
      yet)
- [X] T011 [US1] Adapt `designDocs/pollUserInterface/poll-card.js` into
      `src/public/pollCard.js` (research.md R7): replace `ensurePollData()`'s random
      generator with a real `GET /api/polls/:pid` fetch, re-poll on
      `APP_POLLING_INTERVAL` (from `GET /api/config`, T001), highlight the caller's
      own `myChoiceIds` in the results face, wire `submitVoteBtn` to
      `POST /api/polls/:pid/vote` instead of the placeholder flip-back — depends on
      T008, T009, T010
- [X] T012 [US1] Rework `src/public/index.html`: adopt the header and `#cardGrid`
      markup from `designDocs/responsivePollGridUserInterface/responsive-grid.html`
      (greyed-out "Create Poll"/"Search CrowdPoll"/category filter bar per spec
      Assumptions), include `pollCard.css`; remove the old member/guest-message demo
      content (`001-user-auth`, now superseded)
- [X] T013 [US1] Create `src/public/pollGrid.js`: on load, read `?PID=` from
      `location.search`; if present, fetch that one poll via `GET /api/polls/:pid`
      and mount a single `pollCard` instance standalone (multi-card grid population
      added in US3) — depends on T011, T012
- [X] T014 [US1] Adapt `renderHeader()` in `src/public/app.js` (session-driven
      login/avatar logic unchanged) so its output carries the CSS hooks needed to
      sit inside the adopted header markup from T012 (research.md R8)

**Checkpoint**: User Story 1 fully functional and independently testable
(quickstart.md US1 steps 1, 2, 4, 5 — step 3 needs a second account, same as any
manual two-user test).

---

## Phase 4: User Story 2 - Multiple-Choice Voting and Changing Your Vote (Priority: P2)

**Goal**: `MULTIPLE-CHOICE-POLL` selection/percentage semantics and
`DYNAMIC-VOTE-POLL` re-voting (FR-010, FR-012, FR-019–025).

**Independent Test**: Multi-choice, dynamic-vote poll; vote for two choices, confirm
each counts once, with percentages against the total number of selections; submit a different
set, confirm only the latest counts (quickstart.md US2).

### Tests for User Story 2 ⚠️

- [X] T015 [P] [US2] Extend `tests/polls-vote.test.ts`: multi-choice submit of two
      choices → both counted, percentage denominator = 2 selections
      (FR-020/021); re-open as the same user → `myChoiceIds` pre-populated
      (FR-025 AC2); submit a different set → only newest counts, prior kept in
      `voteHistory` (FR-018/020); `SINGLE-CHOICE-POLL` rejects a 2-choice submission
      (`400`); `FINAL-VOTE-POLL` rejects a second vote (`409`) unless the prior vote
      is `(removed)`

### Implementation for User Story 2

- [X] T016 [US2] Extend `submitVote()` in `src/polls/service.ts` (depends on T009):
      reject >1 `choiceIds` when `choiceMode=SINGLE-CHOICE-POLL` (`400`); reject a
      re-vote on `FINAL-VOTE-POLL` when the existing `VoteEntry.removed` is `false`
      (`409`); otherwise overwrite `choiceIds`/`votedAt` on the existing `VoteEntry`
      (supersession, not append — `voteHistory` retains the append-only trail
      separately)
- [X] T017 [US2] Update `GET /api/polls/:pid` (`src/routes/pollsApi.ts`) to include
      `myChoiceIds` from the caller's `VoteEntry` when signed in — depends on T008
- [X] T018 [US2] Update `src/public/pollCard.js` voting-side rendering: single-choice
      mode keeps radio-style deselect-on-new-select (already close to the reference's
      default); multi-choice mode allows independent toggles (reference default);
      disable `submitVoteBtn` until ≥1 choice selected (FR-023) — depends on T011

**Checkpoint**: US1 and US2 both independently functional.

---

## Phase 5: User Story 3 - Discover Polls via the Home Grid and Direct Links (Priority: P3)

**Goal**: Home page renders a responsive grid of all eligible `PUBLIC_POLL`s
(FR-032–034).

**Independent Test**: Guest loads home page, sees a live-updating grid; navigates
directly to a poll's link, sees the same card standalone (quickstart.md US3).

### Tests for User Story 3 ⚠️

- [X] T019 [P] [US3] Write `tests/polls-discovery.test.ts`: `GET /api/polls` returns
      only eligible `PUBLIC_POLL`s (excludes `PRIVATE_POLL_ANYONE_WITH_THE_LINK`/
      `PRIVATE_POLL_INVITATION_ONLY`/`ARCHIVED-POLL-STATE`, FR-033/045), no
      pagination params accepted or needed (Assumptions)

### Implementation for User Story 3

- [X] T020 [US3] Implement `GET /api/polls` in `src/routes/pollsApi.ts` (list
      eligible `PUBLIC_POLL`s with computed results, FR-032) — depends on T019, T003
- [X] T021 [US3] Extend `src/public/pollGrid.js`: when no `?PID=` is present, fetch
      `GET /api/polls` and mount one `pollCard` instance per result into
      `#cardGrid` — depends on T013, T020

**Checkpoint**: US1–US3 independently functional. Responsive-grid behavior itself
comes from the CSS adopted in T010/T012 (`grid-template-columns: repeat(auto-fill,
minmax(268px,1fr))`) — no additional code needed; verify via quickstart.md US3 step 3.

---

## Phase 6: User Story 4 - Admin Creates and Configures a Poll (Priority: P4)

**Goal**: Admin can create a poll with documented defaults and edit its title,
subtitle, and choices, auto-saved (FR-002–006, FR-035–039, FR-057).

**Independent Test**: As admin, "Create New Poll" opens pre-filled with documented
defaults; rename title/choices, add a third choice, confirm auto-save
(quickstart.md US4).

### Tests for User Story 4 ⚠️

- [X] T022 [P] [US4] Write `tests/polls-admin-crud.test.ts`: `POST
      /api/admin/polls` (defaults exactly match FR-036 AC1); `GET
      /api/admin/polls` (sorted `createdAt` desc, FR-037); `PATCH
      /api/admin/polls/:pid` (title/subtitle field-level save, length-limit `400`s,
      FR-002/003); `POST/PATCH/DELETE .../choices` (add appends "Choice #N", edit
      rejects empty/duplicate label, remove-with-no-votes hard-deletes, min-2/max-50
      enforcement, FR-004–006/039); all three endpoints `401`/`403` for a
      non-admin/guest

### Implementation for User Story 4

- [X] T023 [US4] Implement `POST /api/admin/polls`, `GET /api/admin/polls`, `GET
      /api/admin/polls/:pid`, `PATCH /api/admin/polls/:pid` in
      `src/routes/pollsApi.ts` (all `requireAdmin`-guarded, T004) with field
      validation in `src/polls/service.ts` — depends on T022, T004
- [X] T024 [US4] Implement `addChoice()`/`editChoiceLabel()` in
      `src/polls/service.ts` (no-votes-yet removal path only — soft-removal path
      added in US5) and `POST /api/admin/polls/:pid/choices`, `PATCH
      /api/admin/polls/:pid/choices/:choiceId`, `DELETE
      /api/admin/polls/:pid/choices/:choiceId` in `pollsApi.ts` — depends on T023
- [X] T025 [US4] Add `requireAdmin`-guarded page routes `GET /admin`, `GET
      /admin/poll` to `src/routes/pages.ts` (`404` on unknown `PID` for the latter)
      — depends on T004
- [X] T026 [P] [US4] Create `src/public/admin.html` shell (brand/back-arrow chrome
      only; content rendered by `adminList.js`)
- [X] T027 [P] [US4] Create `src/public/admin-poll.html` shell (content rendered by
      `adminPoll.js`)
- [X] T028 [US4] Create `src/public/adminList.js`: fetch `GET /api/admin/polls`,
      render the sorted list (title/subtitle/state/created/start/end), "Create New
      Poll" button (`POST` then navigate to `/admin/poll?PID=`), "Copy Poll Link"
      button (`{origin}/?PID=`, FR-034) — depends on T023, T026
- [X] T029 [US4] Create `src/public/adminPoll.js`: load `GET
      /api/admin/polls/:pid`; auto-save title/subtitle on blur (`PATCH`, no Save
      button, FR-036 AC2); choice list with add/edit/remove wired to their
      endpoints and inline validation feedback (duplicate/empty label, min-2/max-50
      messages, FR-006); client-side length-limit prevention (stop input at 100
      chars) + feedback on the `Title`/`SubTitle`/`ChoiceLabel` fields (FR-002/003/
      004, SC-008) — depends on T024, T027
- [X] T030 [US4] Add the new `/api/polls*` and `/api/admin/polls*` endpoints
      introduced so far to `postman/openapi.json` (CLAUDE.md: keep in sync with
      route changes)

**Checkpoint**: Admin authoring loop complete; combined with US1, full
create-then-vote flow works end to end.

---

## Phase 7: User Story 5 - Admin Manages Choice Removal and Poll Duplication (Priority: P5)

**Goal**: Removing a voted-on choice soft-removes it and resets affected voters;
duplication copies configuration into a fresh poll (FR-040–044).

**Independent Test**: Remove a choice with votes, confirm affected voters reset to
not-yet-voted and can re-vote even on a `FINAL-VOTE-POLL`; duplicate a poll, confirm
a fresh `PID` with no votes/`(removed)` choices (quickstart.md US5).

### Tests for User Story 5 ⚠️

- [X] T031 [P] [US5] Extend `tests/polls-admin-crud.test.ts`: removing a choice with
      votes → `(removed)` suffix + truncation (100-char cap, FR-040, research.md
      R10), excluded from voter-facing `GET /api/polls/:pid` and from exports, still
      visible (labeled) via `GET /api/admin/polls/:pid` (FR-041); affected
      `VoteEntry` → `removed:true`, empty `choiceIds`, allowed to re-vote on a
      `FINAL-VOTE-POLL` (FR-042); `POST .../duplicate` → new `PID`, no votes, no
      `(removed)` choices, `ACTIVE-POLL-STATE`, empty `startAt`/`endAt` (FR-044),
      `invitedVoterList`/`bannedVoterList` copied only when `accessMode` is
      `PRIVATE_POLL_INVITATION_ONLY`

### Implementation for User Story 5

- [X] T032 [US5] Extend choice removal in `src/polls/service.ts` (depends on T024):
      when the choice has any votes, soft-remove instead of deleting — apply the
      `(removed)` suffix/truncation (research.md R10), and reset every `VoteEntry`
      whose *sole* `choiceIds` entry was that choice (`removed:true`, `choiceIds:
      []`) regardless of `voteMutability`/`accessMode` (FR-042)
- [X] T033 [US5] Implement `duplicatePoll()` in `src/polls/service.ts` and `POST
      /api/admin/polls/:pid/duplicate` in `pollsApi.ts` (FR-044) — depends on T023
- [X] T034 [US5] Update `src/public/adminPoll.js`: render `(removed)` choices in the
      edit view as labeled, non-interactive audit entries (FR-041); add "Duplicate
      Poll" button to `src/public/adminList.js` — depends on T029, T032, T033

**Checkpoint**: US1–US5 independently functional.

---

## Phase 8: User Story 6 - Admin Manages Poll Lifecycle and Scheduling (Priority: P6)

**Goal**: Optional `startAt`/`endAt`, manual `CLOSED`/`ARCHIVED` transitions
(FR-014/015/045/046).

**Independent Test**: Future `startAt` → voters told pending; past `endAt` → voters
told closed; manual archive → hidden from voters, visible to admins
(quickstart.md US6).

### Tests for User Story 6 ⚠️

- [X] T035 [P] [US6] Extend `tests/polls-admin-crud.test.ts`: vote attempt on a
      future-`startAt` poll → told pending (FR-027); vote on a past-`endAt` poll →
      told closed; `PATCH .../:pid` setting `pollState=CLOSED-POLL-STATE` sets
      `endAt=now` and blocks further votes (FR-045); `ARCHIVED-POLL-STATE` hides
      from `GET /api/polls` and `GET /api/polls/:pid` (`404`) but not from `GET
      /api/admin/polls/:pid` (FR-045); `startAt` cannot move into the future once
      passed + poll has a vote (FR-046); `startAt`/`endAt` ordering rejected when
      violated; `choiceMode→SINGLE-CHOICE-POLL` rejected once any choice has >1 vote
      (FR-047); `accessMode` locked after first vote (FR-048)

### Implementation for User Story 6

- [X] T036 [US6] Extend `PATCH /api/admin/polls/:pid` validation in
      `src/polls/service.ts` (depends on T023): `startAt`/`endAt` ordering and
      already-passed-start lock (FR-046); `pollState` dropdown restricted to
      `CLOSED-POLL-STATE`/`ARCHIVED-POLL-STATE` with the `endAt=now` side effect
      (FR-045); `choiceMode`/`accessMode` edit locks (FR-047/048, checked against
      `voteHistory` existence per data-model.md's cross-cutting rules)
- [X] T037 [US6] Add `ChoiceMode`/`ResultsVisibility`/`VoteMutability`/`AccessMode`
      selects, a `POLL_STATE` dropdown (`CLOSED`/`ARCHIVED` only), and a
      start/end date-time picker to `src/public/adminPoll.js`/`admin-poll.html`,
      converting `startAt`/`endAt` to/from the browser's local timezone for display
      while sending UTC (research.md R11) — depends on T029, T036

**Checkpoint**: US1–US6 independently functional.

---

## Phase 9: User Story 7 - Restricted-Access Polls: Link-Only and Invitation-Only (Priority: P7)

**Goal**: `PRIVATE_POLL_ANYONE_WITH_THE_LINK` voter cap and
`PRIVATE_POLL_INVITATION_ONLY` eligibility (FR-007/008/017/029–031/033).

**Independent Test**: Link-only poll with cap 2 blocks a third voter; invitation-only
poll tells a non-invited user they're not invited (quickstart.md US7).

### Tests for User Story 7 ⚠️

- [X] T038 [P] [US7] Write `tests/polls-admin-participants.test.ts`: link-only poll
      at `voterCountLimit` rejects a new voter (`403`, "poll is full") but not a
      re-vote by an existing voter (FR-029); guest gets `403` on private-mode
      results (FR-017); invitation-only poll rejects a non-invited signed-in user
      (`403`, FR-030) and accepts an invited one; `invitedVoterList` add pre-seeds an
      empty `VoteEntry` (FR-031); private-mode polls never appear in `GET
      /api/polls` (FR-033)

### Implementation for User Story 7

- [X] T039 [US7] Extend `GET /api/polls/:pid` and `submitVote()`
      (`src/routes/pollsApi.ts`/`src/polls/service.ts`, depends on T008/T009):
      enforce guest-visibility (`403` for private modes, FR-017), invited-list
      eligibility (`403` if not invited, FR-030), and voter-cap (`403` for a *new*
      voter once `voterCountLimit` reached, FR-029) — matching by lowercased
      `emailAddress` from the session (data-model.md)
- [X] T040 [US7] Implement `POST /api/admin/polls/:pid/invited` in
      `src/polls/service.ts`/`pollsApi.ts`: adds a lowercased email, pre-seeds an
      empty `VoteEntry` (FR-031), rejects a duplicate (`409`, FR-057/US8-AC7) —
      depends on T023
- [X] T041 [US7] Add `AccessMode` selector (already scaffolded in T037; confirm all
      3 values selectable per FR-048), `voterCountLimit` field, and an
      `InvitedVoterList` add-email UI (ascending by email, FR-049) to
      `src/public/adminPoll.js`, with client-side length-limit prevention (stop
      input at 200 chars) + feedback on the invited-email field (FR-008, SC-008) —
      depends on T037, T040

**Checkpoint**: US1–US7 independently functional.

---

## Phase 10: User Story 8 - Admin Manages Participants, Bans, and Result Exports (Priority: P8)

**Goal**: Admin can remove (ban)/un-ban participants from a poll's Edit Poll
Configuration page's Participants section, and view aggregate results +
JSON/Markdown export from a separate, read-only View Results page (FR-049–055).
Participant/voter list management lives on the Edit Poll page, matching the source
requirements doc's page structure — the View Results page is display + export only.

**Independent Test**: On the Edit Poll Configuration page, remove a participant
(their vote drops, they're banned) and un-ban them; separately, on the View Results
page, export JSON and Markdown (quickstart.md US8).

### Tests for User Story 8 ⚠️

- [X] T042 [P] [US8] Extend `tests/polls-admin-participants.test.ts`: `GET
      /api/admin/polls/:pid/results` (voted list with choices; not-yet-voted list
      for invitation-only only; both exclude banned addresses, FR-054); `DELETE
      .../participants/:emailAddress` (vote dropped from results, address added to
      `bannedVoterList`, FR-050); a banned address's vote attempt rejected (FR-051);
      `DELETE .../banned/:emailAddress` (un-banned, vote NOT restored, FR-052);
      `GET .../export.json` and `.../export.md` content excludes `(removed)`
      choices/votes (FR-055)

### Implementation for User Story 8

- [X] T043 [US8] Implement `GET /api/admin/polls/:pid/results` in
      `src/polls/service.ts`/`pollsApi.ts`: builds the voted/not-yet-voted
      participant lists (`userName`+`emailAddress`, sorted per FR-053), excluding
      banned addresses (FR-054) — depends on T023
- [X] T044 [US8] Implement `DELETE /api/admin/polls/:pid/participants/:emailAddress`
      (removes the `VoteEntry`, adds to `bannedVoterList`, FR-050) and `DELETE
      /api/admin/polls/:pid/banned/:emailAddress` (removes from `bannedVoterList`
      only, no restore, FR-052) in `pollsApi.ts`/`service.ts`; extend `submitVote()`
      to reject any address on `bannedVoterList` (`403`, FR-051, if not already
      covered by T039) — depends on T039
- [X] T045 [US8] Implement `exportJson()`/`exportMarkdown()` in
      `src/polls/service.ts` (current, non-removed config + results only, FR-055)
      and `GET /api/admin/polls/:pid/export.json`/`.export.md` in `pollsApi.ts` —
      depends on T043
- [X] T046 [P] [US8] Create `src/public/admin-results.html` shell
- [X] T047 [US8] Extend `src/public/adminPoll.js`'s Participants section (T041):
      for `PRIVATE_POLL_ANYONE_WITH_THE_LINK`/`PUBLIC_POLL`, add a voter list
      (`userName`+`emailAddress`, sorted by `userName` ascending, FR-053); for all
      access modes, add a "remove" (ban) action on each participant/invited entry
      and a "Banned Voter List" section below the list with an un-ban action
      (FR-050–052) — depends on T041, T044
- [X] T048 [US8] Create `src/public/adminResults.js`: aggregate results display,
      voted/not-yet-voted lists (read-only — no remove/ban controls here, moved to
      the Edit Poll page in T047), "Export JSON"/"Export Markdown" buttons —
      depends on T043, T045, T046
- [X] T049 [US8] Add `GET /admin/poll/results` page route (`requireAdmin`-guarded,
      `404` on unknown `PID`) to `src/routes/pages.ts` — depends on T004
- [X] T050 [US8] Add the remaining `/api/admin/polls/:pid/{results,export.json,
      export.md,invited,participants,banned}` endpoints to `postman/openapi.json`
      (completes T030)

**Checkpoint**: All 8 user stories independently functional.

---

## Phase 11: Polish & Cross-Cutting Concerns

- [X] T051 [P] Add client-side length-limit prevention (stop further input at the
      limit) plus feedback to the `userName` field in `src/public/profile.html`,
      matching the same behavior as poll fields (FR-057, SC-008)
- [X] T052 Run `npm test` (full suite) and `npx tsc --noEmit` — confirm all new and
      pre-existing tests pass and the build is clean
- [X] T053 Run `specs/004-realtime-poll-voting/quickstart.md` end to end (all 8
      scenarios, two-browser-profile steps included) — confirm SC-001–SC-010
- [X] T054 Update `CLAUDE.md`'s "Current State" section (outside the managed
      `SPECKIT` block) to reflect `004-realtime-poll-voting` as implemented, matching
      how prior features updated it

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No tasks — nothing to wait on
- **Foundational (Phase 2)**: T001–T006 — BLOCKS all user stories
- **User Stories (Phase 3–10)**: All depend on Foundational; within that constraint,
  proceed in priority order (P1→P8) as written below, since several later stories
  extend the same functions/files earlier stories create (see per-task "depends on"
  notes) rather than being fully filesystem-independent
- **Polish (Phase 11)**: Depends on all 8 user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundational only
- **US2 (P2)**: Extends US1's `submitVote()`/`GET /api/polls/:pid`/`pollCard.js` —
  build after US1
- **US3 (P3)**: Extends US1's `pollGrid.js` — build after US1 (independent of US2)
- **US4 (P4)**: Foundational only (new admin routes/pages) — independent of
  US1–US3, but naturally follows them so there's something to administer end-to-end
- **US5 (P5)**: Extends US4's choice-removal/service functions — build after US4
- **US6 (P6)**: Extends US4's `PATCH .../:pid` validation — build after US4
- **US7 (P7)**: Extends US1's vote/results endpoints AND US4's admin poll
  endpoints — build after both
- **US8 (P8)**: Extends US7's ban logic and US4's admin routes — build after US7

### Within Each User Story

- Tests written first, confirmed failing, then implementation
- Service-layer logic before routes; routes before client JS
- Story complete before moving to the next priority (or parallelize across
  developers once Foundational is done, respecting the extension dependencies above)

### Parallel Opportunities

- T001/T002 (Foundational, different files) in parallel
- T006 (unit tests) in parallel with T004/T005 once T003 lands
- T010 (CSS) in parallel with T007 (tests) — different files, no shared dependency
- T026/T027 (US4 HTML shells) in parallel with each other and with T022 (tests)
- T031 (US5 tests) in parallel with nothing new — depends on US4 being done, but is
  itself independent of T032–T034 until those exist (write-first)
- Across stories: US2 and US3 can be built in parallel by different developers once
  US1 is done (they extend different files); US5 and US6 likewise once US4 is done

---

## Parallel Example: User Story 1

```bash
# Once Foundational (T001-T006) is done, launch together:
Task: "Write tests/polls-vote.test.ts contract tests (T007)"
Task: "Adapt poll-card.css into src/public/pollCard.css (T010)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational
2. Complete Phase 3: User Story 1
3. **STOP and VALIDATE**: quickstart.md US1 scenarios (needs a second test account
   for step 3)
4. Deploy/demo if ready — a single public poll, votable and live-updating, is a
   real, demonstrable increment even without discovery (US3) or admin authoring
   (US4) yet (a poll can be created directly in MongoDB for this checkpoint, or US4
   pulled forward if a real authoring UI is needed sooner)

### Incremental Delivery

1. Foundational → US1 (MVP: vote + live results) → US2 (multi-choice/dynamic) → US3
   (discovery) → US4 (admin authoring — now the whole create→discover→vote→see-live-
   results loop is real end to end) → US5 (removal/duplication) → US6 (scheduling)
   → US7 (access control) → US8 (moderation/export) → Polish
2. Each story is independently testable per its quickstart.md section before moving
   on

### Parallel Team Strategy

Once Foundational is done: one developer on US1→US2→US3 (voter-facing track), one
on US4→US5→US6 (admin-authoring track); both tracks converge for US7→US8 (which
depend on both).

---

## Notes

- `postman/openapi.json` is updated incrementally (T030, T050) rather than once at
  the end, per CLAUDE.md's "keep it in sync with route changes" — matches how new
  routes are introduced story by story.
- No new npm dependencies at any point in this feature (research.md).
- `src/routes/api.ts` (auth/profile) is touched only once, minimally, in T001 — no
  other task modifies it, preserving `001-user-auth`'s Surgical Changes boundary.
- Participant/voter-list management (remove/ban, un-ban, FR-049–053) lives on the
  Edit Poll Configuration page (`adminPoll.js`, T041/T047), not the View Results
  page (`adminResults.js`, T048) — matching the source requirements doc's page
  structure (`/speckit-analyze` finding I1, 2026-08-12).
- `src/public/profile.html` (owned by `001-user-auth`) is touched once, in T051,
  solely to add FR-057's client-side length-limit UI — no other change to that
  page.
