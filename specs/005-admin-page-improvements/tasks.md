# Tasks: Admin Page Improvements

**Input**: Design documents from `/specs/005-admin-page-improvements/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/ui-contracts.md, quickstart.md

**Tests**: Partially included. User Story 2 (duplicate-title uniqueness) and User Story 4's
server-side logic (Results Visibility/Access Mode auto-correction, Voter Count Limit
defaults, the null-safety fix) get automated Vitest/supertest coverage, consistent with how
`004-realtime-poll-voting` was built. User Stories 1 and 3 (actions-menu keyboard/ARIA
behavior, cross-page header visual identity) and User Story 4's back-navigation/layout are
DOM/visual-level; this project has no browser/DOM test tooling (no jsdom/Playwright in
`package.json` devDependencies) and adding one for a UI feature this size would violate
Simplicity First — these are validated via the manual steps in `quickstart.md`, per the
constitution's tests-OR-manual-check allowance (Principle IV).

**Organization**: Tasks are grouped by user story (US1–US4, priority order from
spec.md). Each story is independently testable per its spec.md "Independent Test".

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)

## Path Conventions

Single project at repository root per plan.md (`src/`, `tests/`).

---

## Phase 1: Setup

**Purpose**: None — no new dependencies, no new project structure. The existing
Express/MongoDB/Vitest stack and `src/public/` vanilla JS/CSS convention are reused
unchanged (plan.md Technical Context). No setup tasks for this feature.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None. US1 (`admin.css`, `adminList.js`), US2 (`service.ts`, `pollsApi.ts`,
their tests), and US3 (`pollGrid.css`, `site.css`, `styles.css`, `app.js`, and all 7
HTML pages' headers) touch entirely disjoint file sets (plan.md Project Structure) — no
shared schema, middleware, or scaffolding needs to exist first. All three stories can
start immediately, in any order or in parallel.

**Checkpoint**: N/A — proceed directly to user story phases.

---

## Phase 3: User Story 1 - Consolidated Actions Menu (Priority: P1) 🎯 MVP

**Goal**: The admin poll list's Actions column shows one menu-trigger icon per row;
clicking (or operating via keyboard) it opens a menu with the four existing actions —
"Edit Poll", "Duplicate Poll", "Copy Poll Link", "View Results" — each unchanged in
behavior (FR-005–FR-009, FR-011).

**Independent Test**: Load `/admin` with at least one poll, open a row's menu, confirm
all four actions are present and behave as today, confirm single-open/outside-click/
Escape/keyboard behavior (spec.md US1 Acceptance Scenarios; quickstart.md US1).

### Implementation for User Story 1

- [X] T001 [P] [US1] Add `.actions-menu-trigger`, `.actions-menu`,
      `.actions-menu--flip-up`, `.actions-menu--flip-left` styles to
      `src/public/admin.css` for the kebab trigger icon and the dropdown menu
      (contracts/ui-contracts.md "Admin poll-list actions menu contract")
- [X] T002 [US1] In `src/public/adminList.js`'s `loadList()`, replace the Actions
      `<td>`'s 4 flat elements with one `<button class="actions-menu-trigger"
      aria-haspopup="true" aria-expanded="false">` (kebab icon) and one
      `<div class="actions-menu" role="menu" hidden>` containing the same 4 items as
      `role="menuitem"` elements (Edit Poll `<a>`, Duplicate Poll `<button>`, Copy Poll
      Link `<button>`, View Results `<a>`) — each keeps its exact current
      href/click-handler (FR-005, FR-006)
- [X] T003 [US1] In `adminList.js`, wire open/close: clicking a trigger toggles that
      row's `hidden`/`aria-expanded`; opening one row's menu closes any other row's open
      menu (FR-007); a document-level click outside the open menu, or Escape, closes it
      (FR-008) — depends on T002
- [X] T004 [US1] In `adminList.js`, add keyboard support: Enter/Space on a focused
      trigger opens the menu and moves focus to the first `menuitem`; Arrow Down/Up
      moves focus to the next/previous `menuitem`; Escape or activating an item closes
      the menu and returns focus to that row's trigger (FR-011) — depends on T003
- [X] T005 [US1] In `adminList.js`, after a menu opens, measure its bounding rect and
      add `actions-menu--flip-up`/`actions-menu--flip-left` (styled in T001) when it
      would overflow the viewport bottom/right (FR-009) — depends on T002, T001
- [ ] T006 [US1] Manual validation: run `quickstart.md` "US1 — Consolidated Actions
      Menu" steps 1–7 (mouse pass and keyboard-only pass) — depends on T001–T005

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Unique Titles for Duplicated Polls (Priority: P2)

**Goal**: Duplicating a poll always yields a title unique among every existing poll's
title, checked across every poll state, even under concurrent duplicate requests
(FR-001–FR-004).

**Independent Test**: Duplicate the same poll repeatedly and confirm predictable,
non-colliding titles; confirm archived/closed polls' titles count toward the check
(spec.md US2 Acceptance Scenarios; quickstart.md US2).

### Tests for User Story 2 ⚠️

- [X] T007 [P] [US2] Write unit tests in `tests/polls-service.test.ts` for
      `nextAvailableCopyTitle(baseTitle, existingTitles)` (data-model.md): no collision
      → `"X Copy"`; `"X Copy"` already used → `"X Copy 1"`; `"X Copy"` and `"X Copy 1"`
      already used → `"X Copy 2"`; a base title that already ends in "Copy"
      (`nextAvailableCopyTitle("Team Offsite Copy", [])` → `"Team Offsite Copy Copy"`,
      per spec.md's named edge case); existing titles `"X Copy"`, `"X Copy 1"`,
      `"X Copy 2"`, `"X Copy 4"` (gap at 3) → returns `"X Copy 3"`, confirming the first
      free slot is returned rather than `max + 1`. Confirm these fail before T009 exists
- [X] T008 [P] [US2] Extend `tests/polls-admin-crud.test.ts`: duplicating the same
      source poll three times in a row yields `"X Copy"`, `"X Copy 1"`, `"X Copy 2"`;
      a poll titled `"X Copy"` that is **archived** and another titled `"X Copy 1"`
      that is **closed** both still block those titles on the next duplication (spec.md
      US2 Acceptance Scenario 4). Confirm these fail before T010/T011 exist

### Implementation for User Story 2

- [X] T009 [US2] Implement the pure `nextAvailableCopyTitle(baseTitle: string,
      existingTitles: string[]): string` in `src/polls/service.ts`, alongside the
      existing `duplicatePoll()` (research.md R1, data-model.md) — depends on T007
- [X] T010 [US2] In `src/routes/pollsApi.ts`'s `POST /api/admin/polls/:pid/duplicate`
      handler, after loading `source`: query `pollsCol()` projecting `title` for
      documents matching `^<escaped source.title> Copy( \d+)?$` across every
      `pollState` (no state filter), call `nextAvailableCopyTitle(source.title,
      matchedTitles)`, and set the result as `title` on `duplicatePoll(source)`'s
      return value before `insertOne` (research.md R1) — depends on T009, T008
- [X] T011 [US2] In the same handler, add the bounded race guard: immediately after
      insert, `countDocuments({ title, _id: { $ne: copy._id } })`; if any collision is
      found, recompute the title against fresh titles and update the new document,
      retrying up to 5 attempts; if a collision still exists after 5 attempts, append a
      short disambiguator derived from the new poll's own `_id` (its first 8 hex
      characters) to the title and update the document once more — unique by
      construction, so FR-004's guarantee holds unconditionally rather than only up to
      the retry bound (FR-004, research.md R1); log a `console.warn` (source poll id +
      computed title) whenever a retry occurs, so this rare race is observable if it
      ever fires in production — depends on T010
- [X] T012 [US2] Run `npm test` (`polls-service.test.ts`, `polls-admin-crud.test.ts`)
      and `quickstart.md` "US2" steps to confirm green — depends on T007–T011

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Consistent Site Header (Priority: P3)

**Goal**: Every page (`/`, `/admin`, the poll editor, admin results, `/login`,
`/profile`, `/create-account`) renders an identical header — same brand, nav, search,
and account area — via one shared implementation instead of today's four divergent
variants (FR-010).

**Independent Test**: Visually compare the header on all 7 pages, signed in and signed
out (spec.md US3 Acceptance Scenarios; quickstart.md US3).

### Implementation for User Story 3

- [X] T013 [P] [US3] Move the header-related rules — `.site-header`, `.brand`,
      `.brand-logo`, `.brand-wordmark`, `.header-nav`, `.header-nav-link`,
      `.header-search` (+ its `input`/`::placeholder`/`:focus-within`), `.header-actions`,
      `.btn-header-primary`, `.btn-header-ghost` (including their responsive
      media-query variants) — plus the `:root` tokens they reference (`--ink`,
      `--paper`, `--moss`, `--moss-dark`, `--line`, `--muted`, `--max-width`, etc.) —
      out of `src/public/pollGrid.css` and into `src/public/site.css`, which becomes
      the canonical header stylesheet loaded by every page (research.md R3);
      `pollGrid.css` keeps only the card-grid/filter-bar rules `index.html` still needs
- [X] T014 [P] [US3] In `src/public/styles.css`, remove the now-superseded
      `#site-header`, `#site-header nav`, `#site-header a`, `.header-user`,
      `.avatar-menu` rules (site.css's class-based versions from T013 now apply
      everywhere, and the higher-specificity ID rules here would otherwise partially
      override them); leave `styles.css`'s non-header rules (`main.narrow`, forms,
      etc.) unchanged
- [X] T015 [P] [US3] In `src/public/app.js`, merge `renderHeader()` and
      `renderHeaderActions()` into one `renderSiteHeader(me, config)` that builds the
      exact header markup currently hardcoded in `index.html` (the `.brand` mark +
      wordmark SVGs, the inert `nav.header-nav` "Create Poll" link, the inert
      `.header-search` box, and the session-driven `#header-actions` area) and mounts
      it into `<header id="site-header">`; update `init()` to call it once
      (research.md R3, contracts/ui-contracts.md "Shared site header contract")
- [X] T016 [P] [US3] In `src/public/index.html`, replace the hardcoded
      `<header class="site-header">...</header>` block with
      `<header id="site-header"></header>` — depends on T015
- [X] T017 [P] [US3] In `src/public/admin.html`, replace the `.admin-brand` header
      block with `<header id="site-header"></header>` — depends on T015
- [X] T018 [P] [US3] In `src/public/admin-poll.html`, replace the back-arrow-only
      header with `<header id="site-header"></header>` — depends on T015
- [X] T019 [P] [US3] In `src/public/admin-results.html`, replace the back-arrow-only
      header with `<header id="site-header"></header>` — depends on T015
- [X] T020 [P] [US3] In `src/public/login.html`, wrap the existing
      `<header id="site-header"></header>` + `<main class="narrow">` in the same
      `.page-decor`/`.page`/`.container`/`.layout` structure `index.html` uses, and add
      `<link rel="stylesheet" href="/site.css">` (research.md R3) — depends on T013
- [X] T021 [P] [US3] In `src/public/profile.html`, apply the same wrapper + `site.css`
      link as T020 — depends on T013
- [X] T022 [P] [US3] In `src/public/create-account.html`, apply the same wrapper +
      `site.css` link as T020 — depends on T013
- [X] T023 [US3] Remove the now-orphaned `.admin-brand`, `.admin-brand-mark`,
      `.admin-brand-name` rules from `src/public/site.css` (dead once `admin.html` no
      longer references them) — depends on T017
- [ ] T024 [US3] Manual validation: run `quickstart.md` "US3 — Consistent Site Header"
      steps 1–4 across all 7 pages, signed out and signed in — depends on
      T013–T023

**Checkpoint**: All user stories now independently functional.

---

## Phase 6: User Story 4 - Streamlined, Contradiction-Free Poll Editing (Priority: P4)

**Goal**: The poll editor page gains a back-to-`/admin` control, relabeled Access Mode
options, a server-enforced Results Visibility/Access Mode invariant with auto-correction,
a Voter Count Limit that defaults blank and tracks Access Mode transitions (capped at 500,
clearable), a "Ban from Voting" participant-list label, and a tighter label-left/
reduced-spacing layout for its top fields (FR-012–024).

**Independent Test**: Open a poll's editor, use the back control, and exercise the Results
Visibility/Access Mode/Voter Count Limit fields to confirm the described auto-corrections
and defaults (spec.md US4 Acceptance Scenarios; quickstart.md US4).

### Tests for User Story 4 ⚠️

- [X] T027 [P] [US4] Extend `tests/polls-service.test.ts`'s `createDefaultPoll` test
      (data-model.md) to assert `voterCountLimit` is `null` (FR-017)
- [X] T028 [P] [US4] Extend `tests/polls-admin-crud.test.ts`: setting Results Visibility to
      Transparent on a Public poll auto-switches Access Mode to Private Invitation Only and
      sets Voter Count Limit to 500 (FR-014/018); setting Access Mode to Public on a
      Transparent poll auto-switches Results Visibility to Anonymous and clears Voter Count
      Limit (FR-015/019); Access Mode's Public↔private transitions set Voter Count Limit to
      500/blank in each direction (FR-018/019); an explicit `voterCountLimit: null` PATCH
      clears it (FR-021)
- [X] T029 [P] [US4] Extend `tests/polls-admin-participants.test.ts`: a blank
      `voterCountLimit` does not cap voting on a `PRIVATE_POLL_ANYONE_WITH_THE_LINK` poll
      (FR-021, data-model.md "Null-safety fix")

### Implementation for User Story 4

- [X] T030 [US4] In `src/polls/store.ts`, narrow `Poll.voterCountLimit`'s type from
      `number` to `number | null` (data-model.md) — depends on T027–T029
- [X] T031 [US4] In `src/polls/service.ts`: `createDefaultPoll()` sets `voterCountLimit:
      null`; `validatePollPatch()` gains the Results Visibility/Access Mode cross-field
      invariant with auto-correction and the accessMode-driven Voter Count Limit default
      (data-model.md); `validateVoteSubmission()`'s voter-cap check is guarded against a
      `null` limit (FR-014–021) — depends on T030
- [X] T032 [US4] Update `postman/openapi.json`'s `voterCountLimit` schema to
      `["integer", "null"]` (contracts/ui-contracts.md "Poll editor HTTP contract") —
      depends on T031
- [X] T033 [P] [US4] In `src/public/admin-poll.html`: relabel the Access Mode options
      "Private Anyone with the link"/"Private Invitation Only" (FR-013); add a back link to
      `/admin` above the Title field, below the header (FR-012); add `max="500"` and a
      dedicated error slot to the Voter Count Limit input; add `.admin-field--inline`/
      `.admin-field--tight` classes to Title/Subtitle/Choices/Voter Count Limit (FR-023/024)
- [X] T034 [P] [US4] In `src/public/admin.css`, add `.admin-back-link`,
      `.admin-field--inline`, and `.admin-field--tight` styles for T033 (FR-012/023/024)
- [X] T035 [US4] In `src/public/adminPoll.js`: give `wireSelectField()` an opt-in
      `reloadOnSuccess` flag and pass it for `resultsVisibility`/`accessMode` (so a
      server-driven change to the other field or to Voter Count Limit is picked up); add
      `wireVoterCountLimitField()` (clamps to 500, sends `null` when cleared); change
      `removeButton()`'s label to "Ban from Voting" (FR-022); null-coalesce
      `voterCountLimit` to `""` in `load()` — depends on T031, T033
- [ ] T036 [US4] Manual validation: run `quickstart.md` "US4" steps 1–9 — depends on
      T030–T035

**Checkpoint**: All four user stories now independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T025 [P] Run the full `npm test` suite and confirm no regressions in the existing
      `polls-*`/`auth`/`pages`/`profile`/`session` suites
- [ ] T026 Full `quickstart.md` walkthrough (all three original user stories in one pass) as
      a final regression check; confirm `postman/openapi.json` needs no changes
      (research.md "Out of scope" — the duplicate endpoint's request/response shape is
      unchanged). Superseded by T037 once User Story 4 lands.
- [X] T037 [P] In `src/public/adminList.js`/`admin.css`, rename the admin poll-list's
      Actions `<td>` class from `actions` to `admin-actions-cell` — an unrelated
      `.actions{ display:flex; ... }` rule in `pollCard.css` (also loaded on `admin.html`)
      was pulling the cell out of table-row layout, breaking its row-height stretch
      (contracts/ui-contracts.md "Admin poll-list actions menu contract" note)
- [ ] T038 Full `quickstart.md` walkthrough (all four user stories in one pass) as the
      final regression check, superseding T026 now that User Story 4 has landed — depends
      on T036, T037

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: None.
- **Foundational (Phase 2)**: None — all four stories are file-disjoint or additive within
  a shared file (US4 only adds to functions US2 already touches; it doesn't conflict with
  US2's own logic).
- **User Stories (Phase 3–6)**: No dependency on Setup/Foundational (both empty). US1,
  US2, and US3 do not depend on each other and may be implemented in any order or in
  parallel (different developers/sessions), though this doc lists them in spec.md
  priority order (P1 → P2 → P3). US4 (P4) is logically independent of US1–US3 too, but
  shares `src/polls/service.ts` with US2 and `src/public/admin.css` with US1 — safe to
  implement in parallel with either (different functions/rules), just not truly
  file-disjoint the way US1/US2/US3 are from each other.
- **Polish (Phase 7)**: Depends on whichever user stories were completed.

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on US2 or US3 — touches only `admin.css`/`adminList.js`.
- **User Story 2 (P2)**: No dependency on US1 or US3 — touches only `service.ts`/`pollsApi.ts`/their tests.
- **User Story 3 (P3)**: No dependency on US1 or US2 — touches only CSS/`app.js`/the 7 HTML pages' headers.
- **User Story 4 (P4)**: No dependency on US1, US2, or US3 — logically independent, though
  it edits the same `service.ts` (different function region than US2's `duplicatePoll()`/
  `nextAvailableCopyTitle()`) and `admin.css` (new rules, not edits to US1's actions-menu
  rules) files.

### Within Each User Story

- US1: T001 (CSS) is independent; T002 must land before T003–T005 (same file, each
  builds on the previous); T006 validates all of them.
- US2: Tests (T007, T008) before implementation (T009–T011); T012 validates all of them.
- US3: The three cross-cutting edits (T013 CSS move, T014 styles.css cleanup, T015
  app.js merge) are mutually independent; the 7 HTML edits (T016–T022) each depend only
  on T015 (need `renderSiteHeader` to exist so the empty shell still renders correctly)
  and are independent of each other; T023 depends on T017; T024 validates all of them.
- US4: Tests (T027–T029) before implementation (T030–T032, T033–T034); T030 (store.ts
  type) before T031 (service.ts logic using that type); T031 before T032 (openapi.json
  documents T031's accepted shape); T033/T034 (HTML/CSS) are independent of T030–T032 and
  of each other; T035 (adminPoll.js) depends on T031 (server behavior it reflects) and
  T033 (markup it wires); T036 validates all of them.

### Parallel Opportunities

- Within US1: T001 can run alongside T002 (different files).
- Within US2: T007 and T008 can run together (different test files).
- Within US3: T013, T014, T015 can run together (different files); once T015 lands,
  T016–T022 (all 7 HTML pages) can run together (different files, no cross-file
  dependency among them).
- Within US4: T027–T029 can run together (different test files); T033 and T034 can run
  together (different files).
- Across stories: since US1/US2/US3 are file-disjoint, all three stories' first tasks
  (T001, T007+T008, T013+T014+T015) can start at the same time; US4's tests (T027–T029)
  and markup/CSS tasks (T033/T034) can start alongside any of them too.

---

## Parallel Example: User Story 3

```bash
# Launch the three independent cross-cutting edits together:
Task: "Move header CSS from pollGrid.css into site.css (research.md R3)"
Task: "Remove superseded #site-header/.header-user/.avatar-menu rules from styles.css"
Task: "Merge renderHeader()/renderHeaderActions() into renderSiteHeader() in app.js"

# Once the app.js merge lands, launch all 7 HTML header swaps together:
Task: "Swap index.html's header for the empty #site-header shell"
Task: "Swap admin.html's header for the empty #site-header shell"
Task: "Swap admin-poll.html's header for the empty #site-header shell"
Task: "Swap admin-results.html's header for the empty #site-header shell"
Task: "Add page wrapper + site.css link to login.html"
Task: "Add page wrapper + site.css link to profile.html"
Task: "Add page wrapper + site.css link to create-account.html"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (Consolidated Actions Menu).
2. **STOP and VALIDATE**: run `quickstart.md` US1 independently.
3. Deploy/demo if ready — the admin list's clutter problem is fixed even before US2/US3 land.

### Incremental Delivery

1. Add User Story 1 → validate → deploy/demo (MVP).
2. Add User Story 2 → validate → deploy/demo.
3. Add User Story 3 → validate → deploy/demo.
4. Add User Story 4 → validate → deploy/demo.
5. Each story adds value without breaking the others (US1/US2/US3 are file-disjoint; US4
   only adds new functions/rules to files US1/US2 already touch, per Dependencies above).

### Parallel Team Strategy

With multiple developers, since Setup/Foundational are empty and US1/US2/US3 share no
files (US4 additively shares two files with US1/US2, see Dependencies above):

1. Developer A: User Story 1 (`admin.css`, `adminList.js`)
2. Developer B: User Story 2 (`service.ts`, `pollsApi.ts`, tests)
3. Developer C: User Story 3 (CSS reorg, `app.js`, 7 HTML pages)
4. Developer D: User Story 4 (`store.ts`, `service.ts`, `admin-poll.html`, `admin.css`,
   `adminPoll.js`, `postman/openapi.json`, tests)
5. Stories complete and integrate independently — no merge conflicts expected between
   stories (only within US3's own 7-file batch, and between US2/US4's shared `service.ts`
   and US1/US4's shared `admin.css`, each a same-file-different-region overlap).

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- FR-001–FR-004 ⇒ US2 (T009–T011). FR-005–FR-009, FR-011 ⇒ US1 (T002–T005). FR-010 ⇒ US3
  (T013–T023). FR-012–FR-024 ⇒ US4 (T030–T035).
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
- No new dependencies, collections, indexes, or top-level API endpoints anywhere in this
  feature (plan.md Technical Context, research.md "Out of scope") — User Story 4 changes
  the accepted body/response shape of the existing `PATCH /api/admin/polls/:pid` endpoint
  (contracts/ui-contracts.md "Poll editor HTTP contract") but adds no new endpoint.
