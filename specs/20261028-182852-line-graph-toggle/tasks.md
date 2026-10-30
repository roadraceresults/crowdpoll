# Tasks: Per-Poll Line Graph Toggle

**Input**: Design documents from `specs/20261028-182852-line-graph-toggle/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. Plan R12 and the constitution's verification principle require them. Each story's test tasks come before its implementation tasks.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: the user story the task serves (US1–US4)
- Every description names the exact file path

## Path Conventions

Single project: `src/`, `tests/`, `postman/` at the repository root. Browser code lives in `src/public/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish a green baseline before any change.

- [X] T001 Run `npx tsc --noEmit` and `npm test` on branch `line-graph-toggle` before any change, and record any pre-existing failures in `specs/20261028-182852-line-graph-toggle/checklists/baseline.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The stored attribute, its mapping, its projection and admin rows, and the Administrator-only rule. Every story depends on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Write the failing migration test in `tests/line-graph-setting.test.ts`: a new poll and a poll inserted before the migration both read `lineGraphEnabled` as `false`. The migration test migrates down to `012-line-graph-tally` with the migrator, inserts a poll, migrates up, and asserts `false`; the poll that predates the migration is inserted before the down step, because `insertPoll` writes the column
- [X] T003 Create `src/db/migrations/013-line-graph-enabled.ts` with `alter table "polls" add column "line_graph_enabled" boolean not null default false` and a down step that drops the column
- [X] T004 Register `"013-line-graph-enabled"` after `"012-line-graph-tally"` in `src/db/migrations/index.ts`
- [X] T005 Add `line_graph_enabled` to the polls table type in `src/db/schema.ts` as a boolean column with input and output types
- [X] T006 Map the column to a `lineGraphEnabled` field in `src/polls/store.ts`: add the field to `Poll`, read it in the row-to-poll mapping, and add `lineGraphEnabled: "line_graph_enabled"` to the field-to-column map; do not add it to `NON_CONTENT_FIELDS`
- [X] T007 Add `lineGraphEnabled: boolean` to `PollProjection` and set it from `row.line_graph_enabled` in `projectPoll` in `src/polls/versions.ts`; add a test in `tests/line-graph-setting.test.ts` that the projection carries `lineGraphEnabled` and that a change to the setting bumps `content_version`
- [X] T008 Add `lineGraphEnabled: p.line_graph_enabled` to the row built by `adminListRow` in `src/routes/pollsApi.ts`, so the admin list and admin search rows carry it for every caller; both call sites are confirmed: the admin list at `src/routes/pollsApi.ts` line 676 and the admin search at line 744
- [X] T009 Accept `lineGraphEnabled` in `validatePollFields` in `src/polls/service.ts`: a boolean is stored, and any other type is refused with `400`
- [X] T010 Add the Administrator gate in `src/routes/pollsApi.ts` for the publish, save and colors routes: when the body carries `lineGraphEnabled` and `isAdminEmail(caller.email, config)` is false, answer `403` `{ "error": "Only an Administrator can change the line graph." }`, write nothing, and log `[admin] Refused line graph setting for poll <pid>: not an Administrator` with no address

**Checkpoint**: The column exists and defaults to `false`, projections and admin rows carry the value, and a non-Administrator's save carrying the field is refused.

---

## Phase 3: User Story 1 - Administrator turns the line graph on for a poll (Priority: P1) 🎯 MVP

**Goal**: An Administrator can switch a poll's graph on or off on the "View" step, with or without votes, in any poll state.

**Independent Test**: As an Administrator, tick "Show the line graph" on a poll, save, and confirm the stored value changes and the poll's state does not.

### Tests for User Story 1

- [X] T011 [US1] Add a test to `tests/line-graph-setting.test.ts`: an Administrator's publish of a poll without votes stores `lineGraphEnabled: true` and keeps `pollState`, and a publish of a poll with votes accepts the field alone; on the poll with votes, cast a vote before and after the setting changes and assert both votes are accepted
- [X] T012 [US1] Add a test to `tests/line-graph-setting.test.ts`: a setting-only colors save on a poll with votes, inside an edit session, stores the setting, leaves `choices` unchanged, and restores the pre-edit state
- [X] T013 [US1] Add tests to `tests/line-graph-setting.test.ts` for three clarified edge cases: two Administrators saving the setting in turn leave the later save's value with no conflict; an address removed from the administrator list leaves the setting on its poll as it is; an Administrator's change on a closed poll is stored, and on a poll awaiting approval it is refused, as for any other field

### Implementation for User Story 1

- [X] T014 [US1] Add `"lineGraphEnabled"` to `UPDATE_FIELDS` in `src/routes/pollsApi.ts` (the publish and save path for a poll with votes)
- [X] T015 [US1] Let `POST /api/admin/polls/:pid/colors` in `src/routes/pollsApi.ts` accept a body with `lineGraphEnabled` and no `colors`: leave the choices as they are, keep the existing edit-session and votes guards, and store the setting
- [X] T016 [US1] Change wizard step 4 to `name: "View"` and `short: "View"` in `WIZARD_STEPS` in `src/public/adminCard.js`; its number stays 4
- [X] T017 [US1] Learn whether the viewer is an Administrator in `src/public/adminCard.js` from `GET /api/me` (`isAdmin`), the same field `src/public/adminList.js` reads
- [X] T018 [US1] Render the "Show the line graph" checkbox first in `buildColorsStep()` in `src/public/adminCard.js`, for Administrators only, checked from the card's `lineGraphEnabled`; when there are no choices, show "Add your choices first, then come back to choose their colors." in place of the color pickers
- [X] T019 [US1] In `src/public/adminCard.js`, include `lineGraphEnabled` in the saved fields only for an Administrator's card, add it to the changed-field check, and let `savesColorsOnly` treat it as a key that does not disqualify a colors-only save
- [X] T020 [US1] Update `tests/client-admin-wizard.test.ts` (the expected step-label list in the test becomes "View") and add a test that an Administrator's View step shows the checkbox checked from the stored value; add an assertion that the Settings Summary link to step 4 still opens the View step

**Checkpoint**: User Story 1 works end to end and is testable on its own.

---

## Phase 4: User Story 2 - Viewers see the graph only where it is on (Priority: P1)

**Goal**: A maximized poll draws the graph only when the setting is on, makes no graph request when it is off, and the graph route answers `404` when it is off.

**Independent Test**: Maximize one poll with the setting on and one with it off, and compare the graph area and the requests made.

### Tests for User Story 2

- [X] T021 [US2] Add tests to `tests/line-graph-setting.test.ts`: `GET /api/polls/:pid/line-graph` answers `404` when the setting is off and the normal body when it is on for a caller who may view results; once the setting is switched off, the next request answers `404` even while the series is cached
- [X] T022 [US2] Add tests to `tests/line-graph-ui.test.ts`: maximizing a card with `lineGraphEnabled: false` does not mount the graph and makes no graph request; with `true` it mounts the graph

### Implementation for User Story 2

- [X] T023 [US2] In `GET /api/polls/:pid/line-graph` in `src/routes/tabsApi.ts`, read `line_graph_enabled` by primary key before `serveLineGraph` and answer `404` `{ "error": "Not found" }` when it is false, so a cached body is never served while the setting is off
- [X] T024 [US2] Copy `lineGraphEnabled` into the card built from the projection in `src/public/deltaClient.js` (the card-building block that copies `choices`, `pollState` and `contentVersion`); a test in `tests/client-delta-line-graph.test.ts` checks that a card carrying the setting, and one without it, reach the detail
- [X] T025 [US2] In `maximize()` in `src/public/tabs.js`, call `window.PollLineGraph?.mount(...)` only when the card's `lineGraphEnabled` is true; otherwise do not mount the graph and do not request it; the maximized view's right-hand space is left as the template renders it, so it may stay reserved and empty

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Creators see the setting's effect but not the control (Priority: P2)

**Goal**: A creator who is not an Administrator sees no checkbox, cannot change the setting, and sees the Settings Summary line that says whether the graph is shown.

**Independent Test**: Sign in as a creator who is not an Administrator, open a poll whose graph is on, and check the View step and its summary.

### Tests for User Story 3

- [X] T026 [US3] Add tests to `tests/line-graph-setting.test.ts`: a non-Administrator's publish, save and colors request carrying `lineGraphEnabled` answers `403` and writes nothing; the same request without the field leaves the stored value as it is
- [X] T027 [US3] Add a test to `tests/line-graph-setting.test.ts`: a creator's admin list row for their own poll carries `lineGraphEnabled`, and every row of `/api/admin/polls/search` carries it
- [X] T028 [US3] Add a test to `tests/client-admin-wizard.test.ts`: a creator's View step shows no checkbox and still shows the color pickers
- [X] T029 [US3] Add a test to `tests/client-admin-wizard.test.ts`: the Settings Summary "View" line contains "The line graph is shown." when `lineGraphEnabled` is true, for a creator, and contains no graph text when it is false

### Implementation for User Story 3

- [X] T030 [US3] In `buildColorsSummaryLine()` in `src/public/adminCard.js`, add "The line graph is shown." to the View line when the card's `lineGraphEnabled` is true, for every viewer of the card

**Checkpoint**: User Stories 1, 2 and 3 work independently.

---

## Phase 6: User Story 4 - An Administrator switches a graph off while it is on screen (Priority: P2)

**Goal**: A graph already on screen stays until the maximized view closes, and its next refresh shows the graph's existing "Results are not available yet" note.

**Independent Test**: Keep a maximized poll open with its graph drawn, switch the setting off as an Administrator, and wait for the next refresh.

### Tests for User Story 4

- [X] T031 [US4] Add tests to `tests/line-graph-ui.test.ts`: a Refresh of the tab that brings `lineGraphEnabled: false` leaves the graph mounted; the next graph refresh answering `404` shows the note "Results are not available yet"

### Implementation for User Story 4

- [X] T032 [US4] Confirm in `src/public/tabs.js` that a Refresh of the tab does not unmount a mounted graph; change code only if it does, so that the graph is removed only when the maximized view closes

**Checkpoint**: All four stories work independently.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and full verification once every story is in place.

- [X] T033 [P] Document the new request field, the `403`, the admin rows field and the graph route's `404` in `postman/openapi.json`, per `specs/20261028-182852-line-graph-toggle/contracts/api.md`
- [X] T034 [P] Update `README.md` with the View step's checkbox and the graph's on/off behavior, written for devops and end users, with no references to specs or requirements
- [X] T035 [P] Update `ARCHITECTURE.md` with the setting's path: column, projection, admin rows, the graph route's check, and the browser mount
- [X] T036 Run `npx tsc --noEmit` and `npm test` and confirm they match the baseline recorded in T001 plus the new passing tests; confirm that the configuration and cookie lists are unchanged (no new `ENV_*` value, cookie or storage key; `tests/cookie-use-list.test.ts` checks the cookie list automatically) and that the existing line-graph tests still pass
- [X] T037 Walk through `specs/20261028-182852-line-graph-toggle/quickstart.md` steps 1–7 against a running `npm run dev`, and confirm SC-001 by hand: a viewer sees the graph within one Refresh of the tab after an Administrator turns it on

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup; blocks every user story.
- **User stories (Phases 3–6)**: each depends only on Foundational, except US4, which depends on US2's mount behavior (T025).
- **Polish (Final Phase)**: depends on the stories it documents.

### Story dependencies

- **US1 (P1)**: after Foundational. Independent of other stories.
- **US2 (P1)**: after Foundational. Independent of US1 for the server, but T025 is best checked with the View step from US1 in place.
- **US3 (P2)**: after Foundational. The server refusals (T026) need T010; the summary (T030) needs the projection from T007.
- **US4 (P2)**: after US2.

### Within each story

- Tests before implementation, and each test fails before its implementation lands.
- Server before browser where the browser depends on the server contract.

### Parallel opportunities

- T033, T034 and T035 can run in parallel in the Final Phase.
- Once Foundational is done, US1 and US2 can be built by different people.

---

## Implementation Strategy

### MVP first (User Story 1 only)

1. Phase 1, then Phase 2.
2. Phase 3 (US1).
3. Stop and validate the checkbox and the saved setting with quickstart steps 3 and 7.

### Incremental delivery

1. Foundational, then US1: an Administrator can set the flag.
2. US2: viewers see the graph only where it is on.
3. US3 and US4: creator view, refusals and switch-off behavior.
4. Final Phase: documentation and the full run.

---

## Notes

- The graph's own code is already on this branch (commit `3f4b6de`); no task rewrites it.
- No task adds a configuration value, cookie or browser storage key (FR-016).
