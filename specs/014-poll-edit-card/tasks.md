---
description: "Task list for 014-poll-edit-card"
---

# Tasks: Poll Edit Card

**Input**: Design documents from `specs/014-poll-edit-card/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Test tasks are included and are **not** optional here, for two reasons that are specific to
this feature rather than a TDD preference. First, deleting `adminPoll.js`, `admin-poll.html` and the two
editing routes breaks 13 assertions in existing suites — the build does not pass without repairing them.
Second, constitution v1.1.0 Principle IV requires a verifiable criterion per task, and Principle VI
treats the suite as documentation. Where a task's verification is manual, it says so and points at
`quickstart.md`.

**Organization**: grouped by user story. Each story phase is a complete, demonstrable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel — different files, no dependency on an incomplete task
- **[Story]**: US1–US5, mapping to the user stories in `spec.md`
- Paths are repository-relative

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: the one new configuration value and its plumbing. Small, and every later phase can assume
it exists.

- [X] T001 Add `participantsViewportSize` via `intVar(env, "ENV_PARTICIPANTS_VIEWPORT_SIZE", 10)` to `AppConfig` and `loadConfig()` in `src/config.ts`
- [X] T002 Add `participantsViewportSize` to the `GET /api/config` response in `src/routes/api.ts`
- [X] T003 [P] Add the `participantsViewportSize` field to the `/api/config` response schema in `postman/openapi.json`
- [X] T004 [P] Add an `ENV_PARTICIPANTS_VIEWPORT_SIZE` row to the environment table in `CLAUDE.md` and a description in `README.md`
- [X] T005 [P] Add `ENV_PARTICIPANTS_VIEWPORT_SIZE` to `launch.json.example` and `devScripts.example/setup-dev.ps1` (the real `launch.json` and `devScripts/launch-dev.ps1` are git-ignored — regenerate them locally, do not commit)
- [X] T006 Set `ENV_PARTICIPANTS_VIEWPORT_SIZE` in the shared test environment in `tests/helpers/setup.ts` so every suite touching `/admin` has it
- [X] T007 Extend `tests/config.test.ts` to cover the new setting: default of 10, a valid override, and rejection of a non-positive value

**Checkpoint**: `npm test` passes; `/api/config` serves the new field.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the widened list response. This blocks every user story, because a read-only card cannot
be painted without it and every other story builds on that card.

**⚠️ No user story phase may start until this phase is complete.**

- [X] T008 Widen the `GET /api/admin/polls` response mapping in `src/routes/pollsApi.ts` to include `choices`, `choiceMode`, `voteMutability` and `voterCountLimit` alongside the existing projection — response shaping only, no change to the query
- [X] T009 Add `voteCount` (entries in `currentVotes` with a non-empty `choiceIds`, i.e. `computeResults().totalVoted`), `invitationCount` (`invitedVoterList.length`) and `bannedVoterCount` (`bannedVoterList.length`) to the same response in `src/routes/pollsApi.ts`
- [X] T010 Update the `GET /api/admin/polls` response schema in `postman/openapi.json` with all seven fields
- [X] T011 Add coverage in `tests/polls-admin-crud.test.ts` for the seven new fields, including `voteCount` on an invitation-only poll holding unused invitations — it must be lower than `currentVotes.length`
- [X] T012 Add an assertion in `tests/polls-admin-crud.test.ts` that `invitedVoterList` and `bannedVoterList` are **not** in the `GET /api/admin/polls` response, failing if they are later added

**Checkpoint**: one request returns everything a read-only card needs, and nothing it does not.

---

## Phase 3: User Story 1 — Administer every poll from one page (Priority: P1) 🎯 MVP

**Goal**: replace the table with a column of read-only cards carrying each poll's full configuration
and all existing actions.

**Independent test**: load `/admin` with polls in several states; every poll's configuration is legible
with no further interaction, and every action the table offered still works.

- [X] T013 [US1] Replace the `<table class="admin-poll-list">` block in `src/public/admin.html` with a card-list container, keeping the existing SVG icon symbol definitions
- [X] T014 [US1] Create `src/public/adminCard.js` exposing a card factory that renders one poll's read-only form, and load it `defer` before `adminList.js` in `src/public/admin.html`
- [X] T015 [US1] Render the read-only fields in `src/public/adminCard.js`: title, subtitle, choices, start, end and voter count limit as read-only values; choice mode, vote mutability and visibility as text; state, rejection reason and created
- [X] T016 [US1] Render the three counts as read-only fields with labels in `src/public/adminCard.js`
- [X] T017 [US1] Render the italicised `started` and `does not end` placeholders for an absent start or end in `src/public/adminCard.js`, matching the existing `fmtStart`/`fmtEnd` behaviour
- [X] T018 [US1] Render `Open`, `Close` and `Archive` on the read-only form in `src/public/adminCard.js`, enabled from the server's capability flags, dispatching the existing `PATCH` and keeping the archive confirmation
- [X] T019 [US1] Render the action icons and the actions menu on the read-only form in `src/public/adminCard.js`, reusing the existing menu positioning, keyboard navigation and Escape handling from `src/public/adminList.js`, and ensuring every state and action control on the card is reachable in tab order and activated by Enter and Space (FR-045)
- [X] T020 [US1] Remove the `Edit Poll` / `Update Poll` menu item from the actions menu; the poll title becomes a field on the card rather than a link. **`editHref()` itself is deferred to US2 (T045a)**: US1 is meant to be shippable on its own, and the pen has to keep working until the editing routes are actually deleted
- [X] T021 [US1] Rewrite `loadList()` in `src/public/adminList.js` to render cards instead of table rows, preserving the existing selection, `createdAt` descending order, scroll restoration and open-menu restoration
- [X] T022 [US1] Point the back control at `/` in `src/public/admin.html`
- [X] T023 [P] [US1] Remove every `table.admin-poll-list` rule and the `.admin-poll-list-wrap` horizontal-scroll wrapper from `src/public/admin.css`, and add the card list and card layout rules
- [X] T024 [P] [US1] Give every control on the card an accessible name identifying both its action and its poll, in `src/public/adminCard.js` (FR-045, FR-046)
- [X] T025 [US1] Update `tests/poll-card-assets.test.ts` to assert the card markup and the absence of the table markup
- [ ] T026 [US1] Verify against `quickstart.md` US1: full configuration legible without interaction, no horizontal scroll at phone width, capability rules unchanged, `Vote Count` lower than the invitation row count on an invitation-only poll

**Checkpoint**: `/admin` is a working card list. No poll needs to be locked in order to be read. Shippable alone.

---

## Phase 4: User Story 2 — Edit a poll without leaving the page (Priority: P2)

**Goal**: the pen turns a card into an editing surface in place; save or cancel returns it. The two
editing routes and their assets are deleted.

**Independent test**: edit a poll's title and choices from its card, save, and confirm the change took
effect with no navigation.

**Depends on**: US1's card.

- [X] T027 [US2] Add the editing-form render to `src/public/adminCard.js`: editable title, subtitle, start, end and voter count limit, with the action icons, menu, state controls, state, rejection reason and the three counts hidden
- [X] T028 [US2] Port the editing-session lifecycle from `src/public/adminPoll.js` into `src/public/adminCard.js` — per-session `clientGuid`, begin, heartbeat, release — scoped to one card rather than one page
- [X] T029 [US2] Add the pen control with its pending state in `src/public/adminCard.js`: it shows it is working, cannot be activated twice while the claim is in flight, and the card changes form only once the claim succeeds (FR-013a)
- [X] T030 [US2] Add the page-local `editingPid` latch to `src/public/adminList.js`, disabling every other card's pen while a card is in editing form
- [X] T031 [US2] Port the draft model, the `dirty` flag and the single `refreshPublishButton()` decision point from `src/public/adminPoll.js` into `src/public/adminCard.js`
- [X] T032 [US2] Port the choices editor from `src/public/adminPoll.js` into `src/public/adminCard.js` unchanged — `sanitizeChoicesText()`, the caret arithmetic, the blank-line rule, the per-line and count caps, and the select-the-defaults-on-focus behaviour (research R8)
- [X] T033 [US2] Port the voter-count-limit availability and validation from `src/public/adminPoll.js`, including clearing and disabling it for a public poll and the `blank = N` hint
- [X] T034 [US2] Render the mechanics settings in `src/public/adminCard.js` as selectable groups or frozen text according to the poll's vote history, so a value the server would refuse never looks editable
- [X] T035 [US2] Implement `Save and Publish` in `src/public/adminCard.js`: both outcomes end the session and return the card to read-only form, with the held-back message shown on the card and the poll re-rendered as `INITIALIZED`
- [X] T036 [US2] Implement `Cancel` in `src/public/adminCard.js`: always enabled, releases the session, restores the poll's stashed state, and re-renders the card read-only in place
- [X] T037 [US2] Port the unsaved-changes guards from `src/public/adminPoll.js` — the in-application confirmation and the `beforeunload` prompt — arming on first change and disarming on save or cancel
- [X] T038 [US2] Release the editing session when navigating away from `/admin`, including via the back control, after the unsaved-changes gate, in `src/public/adminCard.js`
- [X] T039 [US2] Exempt the editing card from the periodic refresh in `src/public/adminList.js`: do not replace its DOM node **and** ignore its row in the response (research R5 — both halves)
- [X] T040 [US2] Repaint the card from fresh list data when it leaves editing form, so a save that changed the rosters cannot leave stale counts on screen, in `src/public/adminList.js` and `src/public/adminCard.js`
- [X] T041 [US2] Add the card status line in `src/public/adminCard.js` as an element separate from the standing state-detail field, stacked above it and cleared on the next successful action (FR-042, FR-043)
- [X] T042 [US2] Handle a lost session in `src/public/adminCard.js`: return the card to read-only form with a message, releasing nothing
- [X] T043 [US2] Move focus to the title field on entering editing form and back to the card's pen on leaving by any route, in `src/public/adminCard.js` (FR-047)
- [X] T044 [US2] Delete `src/public/adminPoll.js` and `src/public/admin-poll.html`
- [X] T045a [US2] Remove `editHref()` from `src/public/adminList.js` once the pen flips the card instead of navigating (carried over from T020)
- [X] T045 [US2] Delete `editSurface()` and both `router.get` registrations for `/admin/poll` and `/admin/poll/update` from `src/routes/pages.ts`, leaving `/admin/poll/results` untouched
- [X] T046 [US2] Remove the `?notice=` redirect production from `src/routes/pages.ts`; nothing consumes the parameter
- [X] T047 [US2] Rewrite or delete the 13 assertions in `tests/poll-card-assets.test.ts` and `tests/polls-editing-eligibility.test.ts` that read `adminPoll.js`/`admin-poll.html` or assert the `/admin/poll` ↔ `/admin/poll/update` redirect
- [X] T048 [US2] Add a test in `tests/polls-editing-lock.test.ts` asserting the session invariant: after cancel, the poll's `pollState` is its restored value and every session field is cleared
- [ ] T049 [US2] Verify against `quickstart.md` US2, including the held-back publish and the lost-session path

**Checkpoint**: editing happens entirely on `/admin`. The old editing surface is gone.

---

## Phase 5: User Story 3 — Participants and banned voters in the card (Priority: P3)

**Goal**: both roster sections inside the editing form, paginated, with local ban, un-ban and invite.

**Independent test**: on an invitation-only poll with more invitations than fit a page, expand the
section, page through it, ban someone, cancel, and confirm the ban was discarded.

**Depends on**: US2's editing form.

- [X] T050 [US3] Enforce the roster size cap in `buildAdminPollDetail()` in `src/routes/pollsApi.ts`: a list longer than `config.privateVoterLimitDefault` is replaced by an empty array (covers five endpoints)
- [X] T051 [US3] Enforce the same cap on `voted` and `notYetVoted` in the `GET /api/admin/polls/:pid/results` handler in `src/routes/pollsApi.ts`, leaving both export endpoints exempt
- [X] T052 [P] [US3] Note the possibly-empty roster arrays in the affected response schemas in `postman/openapi.json`
- [X] T053 [US3] Add the two collapsible sections to the editing form in `src/public/adminCard.js`, collapsed by default, labelled `Invitations` on an invitation-only poll and `Participants` otherwise, with the banned section always `Banned Voter List` — each section's expand and collapse control being a real button, focusable and keyboard-activated (FR-045)
- [X] T054 [US3] Seed the rosters from the edit-session response and fetch `GET /api/admin/polls/:pid/results` once per editing session on the first expansion of either section, reusing it thereafter, in `src/public/adminCard.js` (research R7)
- [X] T055 [US3] Port row rendering and the shared sort from `src/public/adminPoll.js`: address first, display name in angle brackets where known, one suffix per applicable state, ascending by lower-cased address in code-point order; banned rows carry an address only
- [X] T056 [US3] Port the local ban and un-ban actions into `src/public/adminCard.js` — a ban adds to the banned list, removes the invitation and drops the vote; an un-ban restores neither — all pending until save
- [X] T057 [US3] Port the invite row into `src/public/adminCard.js`, rendered only for an invitation-only poll, hidden when its section collapses, with the existing validation, duplicate and banned-address checks
- [X] T058 [US3] Build the pager in `src/public/adminCard.js`: range `i - j` with `j` clamped to the total, `(N items)`, `Page [p] of [q]`, previous and next, at `participantsViewportSize` rows per page, fixed height and no scrollbar, with the previous and next controls and the page box all reachable in tab order (FR-045)
- [X] T059 [US3] Implement the page box semantics in `src/public/adminCard.js`: commit on Enter or blur, clamp to `[1, q]`, revert unparseable input, and always display the page actually rendered
- [X] T060 [US3] Render the empty state in `src/public/adminCard.js` — "No participants yet." / "No invitations yet." / "No banned voters." — with no pager and the list area at its usual height
- [X] T061 [US3] Render the over-cap state in `src/public/adminCard.js` — no rows, no pager, and a message taking `N` from the card's matching count field, not from the empty array
- [X] T062 [P] [US3] Convey each section's expanded state and the current and total page counts to assistive technology, and announce a message when it appears, in `src/public/adminCard.js` (FR-048, FR-049)
- [X] T063 [US3] Add coverage in `tests/polls-admin-participants.test.ts` for the cap at, one below and one above the ceiling, and that the three counts stay accurate when a roster is withheld
- [X] T064 [US3] Add a test asserting `GET /api/admin/polls/:pid/export.json` still returns a complete participant list for an over-cap poll
- [X] T064a [US3] Add an assertion in `tests/polls-admin-participants.test.ts` that `GET /api/admin/polls/:pid/results` still returns correct `totalVoted` and choice aggregates for an over-cap poll with `voted` empty — `totalVoted` comes from `computeResults()`, not from `voted.length`, and must not be made to follow the withheld array (FR-005)
- [ ] T065 [US3] Verify against `quickstart.md` US3, including the last-page range, the over-cap message on a public poll, and a discarded ban

**Checkpoint**: moderation works entirely inside the card.

---

## Phase 6: User Story 4 — Create a poll into an editable card (Priority: P4)

**Goal**: creating a poll inserts a card already in editing form rather than navigating.

**Independent test**: create a poll, confirm a card appears at the top already editable, fill it in and
publish without navigation.

**Depends on**: US2's editing form.

- [X] T066 [US4] Change the create handler in `src/public/adminList.js` to reload the list, enter editing form on the new poll and scroll it into view, instead of navigating to `/admin/poll`
- [X] T067 [US4] Disable the create control in `src/public/adminList.js` while any card holds the editing latch
- [ ] T068 [US4] Verify against `quickstart.md` US4, including that a created-then-cancelled poll remains as an unstarted poll that can be deleted

**Checkpoint**: no administrative task navigates away from `/admin`.

---

## Phase 7: User Story 5 — Setting names (Priority: P5)

**Goal**: the three enumerations take readable values and render verbatim everywhere.

**Independent test**: display a poll with settings frozen and one with them editable, as administrator
and as voter, and confirm every occurrence reads identically.

**Independent of US1–US4** — can be done before or after them.

- [X] T069 [US5] Rename the values of `POLL_VISIBILITIES`, `ChoiceMode` and `VoteMutability` in `src/polls/store.ts` to their title-case forms, then let `tsc` enumerate every typed use (research R3, pass one)
- [X] T070 [US5] Re-case the substring in `isInvitationOnly()` in `src/polls/store.ts` to `"Invitation Only"` — this is a substring test, not an equality test, and a miss changes who may vote
- [X] T071 [US5] Update `isPublicVisibility()` and the literal in `homeGridFilter()` in `src/polls/store.ts`
- [X] T072 [US5] Update the renamed values in `src/polls/service.ts` — `createDefaultPoll()`, the `validatePollFields` accept-lists, and the single-choice and final-vote rules in `validateVoteSubmission`
- [X] T073 [US5] Update the `choiceMode` comparison at `src/public/pollCard.js:1123` — the only voter-facing site; a miss silently turns a single-choice poll into a multiple-choice one
- [X] T074 [P] [US5] Update the renamed values in the five enumerations in `postman/openapi.json`
- [X] T075 [US5] Update the mechanics option values and labels in `src/public/adminCard.js` and `src/public/admin.html` so each renders the constant verbatim, removing the friendly-label-when-editable / raw-constant-when-frozen split (FR-039)
- [X] T076 [US5] Update `tests/helpers/poll-fixtures.ts` to the renamed values, preferring imports of the exported constants over repeated literals so the next rename is compiler-driven
- [X] T077 [US5] Update the remaining literals across `tests/polls-admin-crud.test.ts`, `polls-vote.test.ts`, `polls-service.test.ts`, `polls-discovery.test.ts`, `polls-admin-participants.test.ts`, `polls-state-machine.test.ts`, `polls-editing-lock.test.ts`, `polls-screening.test.ts`, `polls-editing-eligibility.test.ts` and `openapi-contract.test.ts`
- [X] T078 [US5] Add a test in `tests/polls-vote.test.ts` asserting a single-choice poll still permits only one selection, guarding the voter-facing site in T073
- [X] T079 [US5] Add a test in `tests/polls-discovery.test.ts` asserting an invited voter still sees an invitation-only poll on the home grid, guarding the substring in T070
- [ ] T080 [US5] Drop the local `polls` and `voteHistory` collections before running the app with renamed constants — two `drop()` calls, never `dropDatabase()`; leave `user`, `session`, `verification` and `email_change_requests` alone (research R4)
- [ ] T081 [US5] Verify against `quickstart.md` US5, including both voter-facing checks

**Checkpoint**: every setting reads the same everywhere, and voting behaviour is unchanged.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T082 [P] Audit the accessibility work built in T019, T024, T043, T053, T058 and T062 by completing the accessibility pass in `quickstart.md` with the pointing device unplugged: every control reachable and operable, focus correct across mode changes, states announced (SC-011)
- [X] T083 [P] Confirm no roster content, invited address, banned address or participant email is written to the browser console anywhere in `src/public/adminCard.js` (constitution Principle V)
- [X] T084 [P] Review every function moved from `adminPoll.js` and remove comments that explain behaviour, record history or cite requirement, feature or task identifiers; leave pre-existing comments outside changed regions alone (constitution Principle VI, research R11)
- [ ] T085 Run the full `quickstart.md` validation end to end
- [X] T086 `npm test` and `npm run build` both clean
- [X] T087 Regenerate `README.md` at the project root, removing the "Project docs" section that references `specs/` and `designDocs/` — the constitution forbids a README referencing other project documents
- [X] T088 Create `ARCHITECTURE.md` at the project root: deployment and runtime components and their interactions, the patterns in use, and Mermaid diagrams where they carry the meaning better than prose
- [ ] T089 Drop **only** the `polls` and `voteHistory` collections on the deployed instance as part of the release — two `drop()` calls, never `dropDatabase()`. Autodeploy from `dev` means there is no later moment to decide this
- [ ] T089a Immediately after T089, confirm the auth collections survived: `user`, `session`, `verification` and `email_change_requests` still hold their documents, and an existing administrator can still sign in without re-registering (FR-041). If they did not survive, the drop ran at the wrong scope and the accounts are gone — there is no recovery step, which is why this check exists
- [ ] T090 [P] Seed 100 polls in a scratch database, load `/admin`, and record time-to-interactive against SC-012 (100 polls, usable within 3 seconds) per the measurement section of `quickstart.md`. Record the result whether it passes or fails — this is the only evidence for the decision not to page the card list

---

---

## Outstanding at the end of the implementation run (2026-09-10)

82 of 92 tasks are complete: every code, contract, test and documentation task. The 11 that
remain all need something this environment does not have, and none is blocked on a decision.

**Need a browser** — T026, T049, T065, T068, T081, T082, T085, T090. These are the
`quickstart.md` verification passes and the accessibility audit. Each names what to look for;
run them against a local server.

**Need a database** — T080. Drop the local `polls` and `voteHistory` collections before first
running the app: every stored poll holds the pre-rename constant values and will misbehave
silently rather than erroring.

**Need the deployed instance** — T089, T089a. The release-time drop and its verification.

Nothing in the codebase is left half-finished: `npm test` (453 tests), `npm run build` and
`tsc --noEmit` are all clean.


## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — **blocks every user story**
- **US1 (Phase 3)**: depends on Foundational
- **US2 (Phase 4)**: depends on US1 — the editing form is a second face of US1's card
- **US3 (Phase 5)**: depends on US2 — both sections live inside the editing form
- **US4 (Phase 6)**: depends on US2 — creating a poll opens it in editing form
- **US5 (Phase 7)**: depends on Setup only — **independent of US1–US4**
- **Polish (Phase 8)**: depends on every story being delivered

### A note on story independence

US2, US3 and US4 are layered, not independent: each needs the one before it. This is stated in the
specification rather than glossed. Each remains independently *testable* and *demonstrable*, which is
what the checkpoints assert. US5 is genuinely independent and is the one story that can be worked in
parallel with the rest by a second person.

### Parallel opportunities

- Setup: T003, T004, T005 in parallel after T001 and T002
- Foundational: T008 and T009 touch the same handler and are sequential; T010 can follow either
- US1: T023 (CSS) and T024 (accessible names) in parallel with the render tasks
- US3: T050 and T051 (server) in parallel with T053–T062 (client); T052 in parallel with both
- US5: T074 (contract) in parallel with the source renames; T076 and T077 after T069
- **Whole-story parallelism**: US5 alongside US1–US4, if two people are available

### Parallel example: User Story 3

```bash
# Server-side cap and client-side sections are independent files:
Task: "T050 Enforce the roster cap in buildAdminPollDetail() in src/routes/pollsApi.ts"
Task: "T053 Add the two collapsible sections in src/public/adminCard.js"
Task: "T052 Note the possibly-empty roster arrays in postman/openapi.json"
```

---

## Implementation Strategy

### MVP: Phases 1–3 (Setup + Foundational + US1)

26 tasks. Delivers a working card-based administration page: every poll's full configuration legible
without interaction, every existing action available, and no poll locked merely to be read. That last
point is a real improvement over today, where choices, mechanics and the voter limit cannot be seen
without taking an editing lock.

Stop here and the feature is coherent — the old editing routes still work, because they are not removed
until US2.

### Incremental delivery

1. **Phases 1–3** → cards replace the table. Ship, validate, gather feedback.
2. **Phase 4 (US2)** → editing moves into the card; the old surface is deleted. The largest phase, and
   the point of no return for the editing routes.
3. **Phase 5 (US3)** → moderation inside the card.
4. **Phase 6 (US4)** → creation inside the card.
5. **Phase 7 (US5)** → the rename. Deliberately last among the sequential work, because it invalidates
   stored data and is the phase most likely to need a data reset mid-flight.
6. **Phase 8** → polish, documentation deliverables, release-step data drop.

### Two things to keep visible throughout

Both come from research R3 and neither fails loudly:

- **T073** — `pollCard.js:1123` is the only voter-facing rename site. Missing it turns single-choice
  polls into multiple-choice ones with no error anywhere. T078 exists to catch it.
- **T070** — `isInvitationOnly()` is a substring test. Missing the re-casing makes every invitation-only
  poll behave as though it were not one, changing who may vote. T079 exists to catch it.
