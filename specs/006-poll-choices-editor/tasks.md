# Tasks: Poll Choices Editor

**Input**: Design documents from `/specs/006-poll-choices-editor/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-endpoints.md,
quickstart.md

**Tests**: Included for User Story 1's server-side logic (unit + integration, matching how
`004-realtime-poll-voting`/`005-admin-page-improvements` were built). User Story 2's
live-typing guardrails are DOM/visual-level; this project has no browser/DOM test tooling
(no jsdom/Playwright in `package.json` devDependencies) and adding one for a 2-story UI
feature would violate Simplicity First — validated instead via the manual steps in
`quickstart.md`, per the constitution's tests-OR-manual-check allowance (Principle IV).

**Organization**: Tasks are grouped by user story (US1–US2, priority order from spec.md).
Each story is independently testable per its spec.md "Independent Test". US2 is additive to
the DOM elements US1 creates (spec.md: "the box is fully usable... without [US2]") — not
file-disjoint from US1 the way separate features' stories sometimes are, but still an
independently valuable, independently testable increment on top of a complete US1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US2)

## Path Conventions

Single project at repository root per plan.md (`src/`, `tests/`).

---

## Phase 1: Setup

**Purpose**: None — no new dependencies, no new project structure. The existing
Express/MongoDB/Vitest stack and `src/public/` vanilla JS/CSS convention are reused
unchanged (plan.md Technical Context). No setup tasks for this feature.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None. Everything server-side (the new endpoint) exists solely to serve User
Story 1's save action — there is no shared infrastructure to build ahead of it that doesn't
already belong to US1 itself. Proceed directly to Phase 3.

**Checkpoint**: N/A — proceed directly to Phase 3.

---

## Phase 3: User Story 1 - Edit All Choices as One List (Priority: P1) 🎯 MVP

**Goal**: The poll editor's Choices section shows every active choice as one line in a
single text box; typing a change reveals "Save Choices"; clicking it replaces the poll's
entire active choice list in one server call, enforcing the existing 2–50/100-char/
no-duplicate limits and resetting every current vote as a direct consequence (FR-001–009,
research.md R1). Already-removed choices stay visible, untouched, below the box (FR-008).

**Independent Test**: Open a poll's editor, confirm existing choices appear one per line,
edit/add/remove lines, click "Save Choices," and confirm the poll's stored choices — and
every voter's current vote — reflect the save, including on a poll where a choice already
has votes (spec.md US1 Acceptance Scenarios; quickstart.md US1).

### Tests for User Story 1 ⚠️

- [X] T001 [P] [US1] Write unit tests for `replaceChoices(poll, labels)` in
      `tests/polls-service.test.ts` (data-model.md): trims/drops blank labels; rejects
      fewer than 2 or more than 50 non-blank labels (`400`); rejects a label over 100
      characters (`400`); rejects two identical (post-trim) labels (`409`); assigns a fresh
      `id` to every resulting choice even when a label's text is unchanged from before
      (research.md R1); leaves any pre-existing `removed: true` choices untouched and
      appended after the new active ones (FR-008); resets every `currentVotes` entry with a
      non-empty `choiceIds` to `{ choiceIds: [], removed: true }`, regardless of which
      choice(s) it referenced (FR-007). Confirm these fail before T003 exists.
- [X] T002 [P] [US1] Extend `tests/polls-admin-crud.test.ts`: replace the existing
      `addChoice`/`editChoice`/`removeChoice` endpoint tests with equivalent coverage of
      `PUT /api/admin/polls/:pid/choices` (contracts/api-endpoints.md) — success (`200`
      with the new `choices` array), each validation failure (`400` too few/too many/too
      long, `409` duplicate), `404` unknown PID, and an HTTP-level confirmation that a poll
      with an existing vote has that vote reset after a save that doesn't even touch the
      voted-for choice's wording. Confirm these fail before T004 exists.

### Implementation for User Story 1

- [X] T003 [US1] In `src/polls/service.ts`, remove `addChoice()`, `editChoiceLabel()`,
      `removeChoice()`, and `markChoiceRemoved()`; add `replaceChoices(poll: Poll, labels:
      unknown): Choice[]` per data-model.md — depends on T001
- [X] T004 [US1] In `src/routes/pollsApi.ts`, remove the `POST
      /api/admin/polls/:pid/choices`, `PATCH .../choices/:choiceId`, and `DELETE
      .../choices/:choiceId` routes; add `PUT /api/admin/polls/:pid/choices` calling
      `replaceChoices()` and `$set`-ing both `choices` and `currentVotes` in the same
      `updateOne` (contracts/api-endpoints.md) — depends on T003, T002
- [X] T005 [P] [US1] In `postman/openapi.json`, remove the `addChoice`/`editChoice`/
      `removeChoice` operations and add a `PUT /api/admin/polls/{pid}/choices` operation
      matching contracts/api-endpoints.md (`200`/`400`/`401`/`403`/`404`/`409`) — depends on
      T004
- [X] T006 [P] [US1] In `src/public/admin-poll.html`, replace the Choices section's `<ul
      id="choiceList">` (active-choice rows) and "+ Add Choice" button with the structure
      ported from `designDocs/smart-textbox.html` (research.md R3): a hint paragraph, a
      `<textarea id="choicesBox">`, its live-count gutter (`<div class="choices-count"
      id="choicesCounter">` with the `<b>`-wrapped count span — inert until T010 wires it),
      and `<button id="saveChoicesBtn" type="button" hidden>Save Choices</button>`; keep the
      existing `#choiceError` element; add a new read-only `<ul id="removedChoiceList"
      class="admin-choice-list">` below it for already-removed/audited choices (FR-008)
- [X] T007 [US1] In `src/public/adminPoll.js`: replace `renderChoices()`'s active-row
      rendering with a `populate()`-style seed of `#choicesBox` from `poll.choices.filter(c
      => !c.removed).sort((a,b) => a.position - b.position).map(c => c.label).join("\n")`,
      keeping `renderChoices()` (or a renamed equivalent) responsible only for rendering the
      already-removed choices into `#removedChoiceList`; remove the `addChoiceBtn` click
      handler; add dirty-tracking (typing reveals `#saveChoicesBtn`, matching spec.md US1
      Acceptance Scenario 2) and a `#saveChoicesBtn` click handler that `PUT`s
      `{ labels: <#choicesBox's lines> }` to the new endpoint, shows `body.error` in
      `#choiceError` on failure, and calls the page's existing `load()` on success (matching
      every other successful action on this page) — depends on T004, T006
- [X] T008 [P] [US1] In `src/public/admin.css`, add the Choices section's layout rules:
      `.choices-editor` (textarea + gutter side by side), a taller `min-height` for
      `#choicesBox` than the shared `.admin-field textarea` default, and the small muted
      hint/count text — reusing the existing `.admin-field textarea` rule for the box's
      border/padding/font and the existing `.btn-header-ghost` class for "Save Choices"
      rather than porting `smart-textbox.html`'s own styles (research.md R4, FR-014).
      Also adds `#saveChoicesBtn:disabled{ opacity:0.5; cursor:not-allowed; }` — discovered
      during T009/T011 validation that `.btn-header-ghost`'s explicit `color`/`background`
      silently defeat the browser's default disabled dimming, so FR-009's "visibly disabled"
      needed an explicit rule of its own
- [X] T009 [US1] Manual validation: run `quickstart.md` "US1" steps 1–9 (including step 7,
      the vote-reset check, and step 9, discard-on-navigate-away) — depends on T001–T008

**Checkpoint**: User Story 1 fully functional and independently testable — the Choices
section is fully usable (typed input is validated and, if invalid, rejected with feedback
at save time) even without User Story 2's proactive guardrails.

---

## Phase 4: User Story 2 - Guided, Mistake-Resistant Typing (Priority: P2)

**Goal**: While typing in the choices box, blank lines can't be created, lines can't exceed
100 characters, the box can't exceed 50 non-blank lines, a live count is always visible, and
"Save Choices" is visibly disabled below 2 non-blank lines — all enforced in the moment,
not only reported after an attempted save (FR-010–013, spec.md US2 Acceptance Scenarios).

**Independent Test**: Type into the choices box and confirm blank lines, over-length lines,
and an excess number of lines are all prevented or cleaned up as they happen, with a visible
running count, independent of whether a save has occurred (quickstart.md US2).

### Implementation for User Story 2

- [X] T010 [US2] In `src/public/adminPoll.js`, port `designDocs/smart-textbox.html`'s
      `sanitize()`, `lineStartAt()`, `isBlank()`, and `currentLines()` helpers (research.md
      R3 — same constants: `MAX_CHOICES=50`, `MIN_CHOICES=2`, `CHOICE_LABEL_MAX=100`) and
      wire them to `#choicesBox`: a `keydown` listener blocking Enter on a blank line and
      blocking a new line once already at 50; an `input` listener that sanitizes on every
      change (strips blank lines, truncates lines over 100 characters, caps at 50 lines,
      shows the relevant message in `#choiceError`) and updates the live count in T006's
      `#choicesCounter`; a `blur` listener tidying a trailing blank line; and a `refresh()`
      that disables `#saveChoicesBtn` (with a title/tooltip explaining why) while fewer than
      2 non-blank lines remain — depends on T006, T007
- [X] T011 [US2] Manual validation: run `quickstart.md` "US2" steps 1–6 — depends on T010

**Checkpoint**: Both user stories now independently functional.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T012 [P] Run the full `npm test` suite and confirm no regressions in the existing
      `polls-*`/`auth`/`pages`/`profile`/`session` suites
- [X] T013 Full `quickstart.md` walkthrough (both user stories in one pass) as a final
      regression check — depends on T009, T011

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: None.
- **Foundational (Phase 2)**: None.
- **User Story 1 (Phase 3)**: No dependency on Setup/Foundational (both empty).
- **User Story 2 (Phase 4)**: Depends on User Story 1 — its guardrails wire onto DOM
  elements (`#choicesBox`, `#choicesCounter`, `#saveChoicesBtn`) and the dirty-tracking
  behavior T007 already creates; it does not touch the server at all.
- **Polish (Phase 5)**: Depends on whichever user stories were completed.

### Within Each User Story

- US1: Tests (T001, T002) before implementation (T003–T008); T003 (service) before T004
  (route, which calls it) before T005 (openapi doc, which describes it); T006 (markup) is
  independent of T003–T005 (different files) but must land before T007 (JS, which queries
  the elements T006 creates); T008 (CSS) is independent of T006/T007 (different file); T009
  validates all of them.
- US2: T010 depends on T007 (extends the same `#choicesBox` wiring, and needs T006's
  `#choicesCounter` element to exist); T011 validates it.

### Parallel Opportunities

- Within US1: T001 and T002 can run together (different test files); T005, T006, and T008
  can all run alongside T003/T004 and each other (different files, no shared dependency
  until T007 needs both T004 and T006 done).
- Across stories: US2 cannot start until T007 (US1) lands, since it wires additional
  behavior onto the same elements/handlers T007 creates.

---

## Parallel Example: User Story 1

```bash
# Launch both test files together:
Task: "Unit tests for replaceChoices() in tests/polls-service.test.ts"
Task: "PUT /choices endpoint tests in tests/polls-admin-crud.test.ts"

# Once tests exist, launch the independent implementation files together:
Task: "openapi.json PUT /choices operation (after pollsApi.ts route lands)"
Task: "admin-poll.html Choices section markup"
Task: "admin.css Choices section styles"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (Edit All Choices as One List).
2. **STOP and VALIDATE**: run `quickstart.md` US1 independently — pay particular attention
   to step 7 (the vote-reset check), since it's this feature's most consequential behavior.
3. Deploy/demo if ready — the row-per-choice editor is already fully replaced and usable
   even before User Story 2's typing guardrails land.

### Incremental Delivery

1. Add User Story 1 → validate → deploy/demo (MVP).
2. Add User Story 2 → validate → deploy/demo.
3. User Story 2 adds value without breaking User Story 1 (it only adds preventive
   client-side behavior on top of validation User Story 1 already enforces server-side).

### Parallel Team Strategy

Less applicable to this feature than to a fully file-disjoint one — User Story 2 genuinely
waits on User Story 1's DOM/JS (T006/T007) to exist. With two developers:

1. Developer A: server-side (T001, T003–T005) — can start immediately.
2. Developer B: markup/CSS (T006, T008) — can start immediately, in parallel with Developer A.
3. Either developer: T007 once T004 and T006 are both done, then T010 (User Story 2) once
   T007 lands.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- FR-001–008 ⇒ US1 (T003–T008). FR-009–013 ⇒ US2 (T010). FR-014 ⇒ US1 (T008, styling).
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
- No new dependencies, collections, or top-level pages anywhere in this feature (plan.md
  Technical Context) — the HTTP surface changes are a net reduction (3 endpoints removed, 1
  added, contracts/api-endpoints.md).
