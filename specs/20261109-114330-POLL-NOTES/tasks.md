---

description: "Tasks for the Poll Notes feature"
---

# Tasks: Poll Notes

**Input**: Design documents from `specs/20261109-114330-POLL-NOTES/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: included, because the constitution's Principle IV makes each change verifiable and the project's features all carry suites. Write each test first and see it fail.

**Organization**: by user story, so each can be built and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task serves

## Phase 1: Setup

- [X] T001 Install dependencies in this worktree, which has no `node_modules`, with `npm ci` in the repository root, and confirm `npx tsc --noEmit` and `npm test` pass before any change

---

## Phase 2: Foundational

**Purpose**: the column, the types and the one notes module that every story uses. No story can start before this is finished.

- [X] T002 Create `src/db/migrations/018-poll-notes.ts` per `data-model.md`. It adds `polls.notes` (`text not null default ''`); drops `polls_home_search`, `polls_search` and the generated `search` column; re-adds `search` with the four parts of `002-polls.ts` plus `setweight(to_tsvector('english', coalesce("notes", '')), 'D')`; and recreates both GIN indexes exactly as in `002-polls.ts`. Register it in `src/db/migrations/index.ts`
- [X] T003 [P] Add `notes: Generated<string>` to `PollTable` and `notes?: string` to `PendingUpdateJson` in `src/db/schema.ts`
- [X] T004 Add `notes: string` to `Poll` and `notes?: string` to `PendingUpdate` in `src/polls/store.ts`. Map it in `rowToPoll`, `FIELD_TO_COLUMN` and `newRow`, and write `pending.notes` in `applyPendingUpdate`. Set `notes: ""` in `createDefaultPoll` in `src/polls/service.ts`, and in `makePoll` in `tests/helpers/poll-fixtures.ts`
- [X] T005 [P] Move `escapeHtml` from `src/email/templates.ts` into a new `src/html.ts`, and import it from there in `src/email/templates.ts` and `src/seo/pollPage.ts`
- [X] T006 [P] Write `tests/poll-notes.test.ts` (renderer section) for `src/polls/notes.ts`. Cover each rule of research R1 and R2:
  - escapes, a trailing `\`, `**`, `*`, `++`;
  - `***x***` in both nestings; marks across a newline; unbalanced openers and closers shown as typed;
  - `<script>`, `<img onerror>`, `javascript:`, quotes and `&amp;` shown as text (SC-002);
  - the preview cut at a space at `NOTES_PREVIEW_CHARS`, with open marks closed, "…" appended, and `hasMore`;
  - `notesPlainText` and `normalizeNotes`.
  Add a JSON list of canonical round-trip cases at `tests/fixtures/notes-cases.json`, for T014 to reuse
- [X] T007 Create `src/polls/notes.ts` per research R1 and R2 (`NOTES_MAX`, `NOTES_PREVIEW_CHARS`, `parseNotes`, `renderNotesHtml`, `renderNotesPreview`, `notesPlainText`, `normalizeNotes`), using `escapeHtml` from `src/html.ts`, until T006 passes. `renderNotesPreview` appends "…" after the closed marks when `hasMore` is true

**Checkpoint**: the suites still pass with the new column, and the renderer's tests pass.

---

## Phase 3: User Story 1 - Write notes for my poll (Priority: P1) 🎯 MVP

**Goal**: a creator writes formatted notes in step 2 and saves them with the poll.

**Independent Test**: open a draft's step 2, edit and format notes, click Done and Save, reopen, and see the same notes (spec US1).

### Tests for User Story 1

- [X] T008 [P] [US1] In `tests/poll-notes.test.ts` (API section), test `POST /api/admin/polls/:pid/save` and `/publish`:
  - `notes` is stored;
  - 6001 UTF-16 units is refused with `400` "Notes must be at most 6000 characters.";
  - whitespace-only notes are stored as `""`;
  - a non-string is refused;
  - the admin detail carries `notes` and `notesHtml`, and admin list rows carry only `notesPreviewHtml` and `hasMoreNotes` (plan, analysis I1).
- [X] T009 [P] [US1] Add `NOTES_MAX` = 6000 to the limits checked in `tests/field-limits.test.ts`
- [X] T010 [P] [US1] Write `tests/client-notes-editor.test.ts` (jsdom; stub `execCommand` and `queryCommandState` with `beforeScripts`). Test that `NotesEditor.open`:
  - builds the bar, toolbar and text box of contract C3;
  - moves the focus in;
  - toggles `aria-pressed` from `queryCommandState`;
  - turns a paste or drop into one `insertText` of the plain text;
  - cancels `formatFontName` and turns `insertParagraph` into `insertLineBreak` in `beforeinput`;
  - shows the serialized length in the counter, and disables Done above 6000;
  - asks `confirmDiscard` on Cancel or Escape only when changed, and an Escape in the editor does not reach the card's own key handling;
  - returns the focus on close.
- [X] T011 [P] [US1] In `tests/client-admin-wizard.test.ts`, test step 2:
  - the Notes field after Subtitle, with the preview and "... edit ⌄";
  - Done puts the notes into the wizard state and the preview;
  - "Next >>" and a numbered step keep an open editor's changes;
  - the card's Cancel drops them;
  - Save sends `notes`.

### Implementation for User Story 1

- [X] T012 [US1] In `src/polls/service.ts`, add `NOTES_MAX` to `LIMITS`. In `validatePollFields`, when `body.notes !== undefined`, set `$set.notes = normalizeNotes(validateFieldLength(body.notes, NOTES_MAX, "Notes"))`
- [X] T013 [US1] In `src/routes/pollsApi.ts`, add `notesHtml: renderNotesHtml(poll.notes)` to `buildAdminPollDetail`, and `notesPreviewHtml` and `hasMoreNotes` from `renderNotesPreview(p.notes)` to `adminListRow`, leaving `notes` out of the list rows, until T008 passes
- [X] T014 [US1] Create `src/public/notesEditor.js` per research R5 and contract C3: `window.NotesEditor.open(host, { html, onDone, onCancel, confirmDiscard })` returning `{ commit, close }`; one `applyMark` wrapper; `serialize(root)` and `runsOf(root)` exposed on `window.NotesEditor` for tests; a sticky bar; the counter; Escape handled with `stopPropagation()`. Add a case to `tests/client-notes-editor.test.ts` that loads `renderNotesHtml(s)` for each canonical case of `tests/fixtures/notes-cases.json` and expects `serialize` to give `s` back (contract C5, SC-003)
- [X] T015 [US1] In `src/public/adminCard.js`:
  - add `notes` and `notesHtml` to the wizard state wherever `subtitle` is (`pollAnswers`, `wizardBase`, `openWizardState`, `wizardDirty`, `wizardFields`, `keepWizardProgress`), taken from the poll's admin details; when the card holds only a list row, fetch the admin details before the editor opens;
  - answer `canChange("notes")` as for `subtitle`;
  - build the Notes field in `buildStep2` after Subtitle (contract C3);
  - open `NotesEditor` from "... edit ⌄";
  - on Done, set `wizard.notes` and rebuild the preview from `runsOf` with `textContent` and the four elements;
  - call the open editor's `commit()` at the start of `goToStep`;
  - add `notes` to `reviewNeeded()`.
  Work until T011 passes
- [X] T016 [P] [US1] Load `notesEditor.js` before `adminCard.js` in `src/public/admin.html`, and add it to the admin page's scripts in `tests/m3-assets.test.ts`
- [X] T017 [P] [US1] Style the Notes field, its two-line clamped preview, "... edit ⌄", and the editor (bar, toolbar, text box, the max-height of research R5) in `src/public/admin-card-m3.css`, with M3 tokens only
- [X] T018 [P] [US1] Add `notes` to the request bodies of `/save` and `/publish`, and `notes`, `notesHtml` and `pendingUpdate.notes` to `AdminPollSummary` and the admin detail, in `postman/openapi.json`

**Checkpoint**: notes can be written, saved and reopened. They are not yet shown to voters.

---

## Phase 4: User Story 2 - Read the notes on a poll card (Priority: P1)

**Goal**: anyone who may see a poll sees two lines of its notes between the title and the choices, and the creator sees them on the admin card's read-only face.

**Independent Test**: give a published poll long notes, and open it as a guest and as a voter: two lines, an ellipsis, "Show more ⌄" (spec US2).

### Tests for User Story 2

- [X] T019 [P] [US2] In `tests/poll-notes.test.ts` (projection section), test that `projectPoll`, the listings, `GET /api/polls/:pid/card` and a delta carry `notesPreviewHtml` and `hasMoreNotes`. Test that a poll the caller may not see still answers `404` (contract A1). Update `tests/refresh-deltas.test.ts` where it pins the projection's keys
- [X] T020 [P] [US2] Write `tests/client-poll-notes.test.ts` (card section). Test:
  - `.poll-notes` between `.question-row` and the choices on the front only;
  - hidden with no notes;
  - the preview set from `notesPreviewHtml`;
  - "Show more ⌄" shown when `hasMoreNotes` is true and hidden when it is false and nothing overflows;
  - a card drawn while hidden shows the button once it is shown and its notes overflow (a stubbed `ResizeObserver`);
  - clicking it calls `requestMaximize`;
  - a placeholder shows no notes.
- [X] T021 [P] [US2] In `tests/client-admin-wizard.test.ts`, test the read-only face (contract C4):
  - the preview appears after the summary when there are notes;
  - it opens step 2 when the poll can be edited and `canChange("notes")` is true;
  - otherwise it is plain text.

### Implementation for User Story 2

- [X] T022 [US2] Add `notesPreviewHtml` and `hasMoreNotes` to `PollProjection`, and fill them with `renderNotesPreview(row.notes)` in `projectPoll`, in `src/polls/versions.ts`. Work until T019 passes
- [X] T023 [US2] In `src/public/pollCard.js`:
  - add the `.poll-notes` markup of contract C1 to `POLL_CARD_TEMPLATE`'s front;
  - set it in `setText`, blank for a placeholder in `applyPoll`;
  - decide the button after setting the text (research R13), and again from a `ResizeObserver` on `.poll-notes-text`;
  - wire the button to `requestMaximize`.
  Work until T020 passes
- [X] T024 [P] [US2] Map `notesPreviewHtml` and `hasMoreNotes` in `toPollDetail`, `""` and `false` for a placeholder, in `src/public/deltaClient.js`
- [X] T025 [P] [US2] Style `.poll-notes` in `src/public/pollCard-m3.css`:
  - an M3 container, body-medium type, `line-clamp: 2`;
  - "Show more ⌄" as a text button;
  - the card's minimum height raised by two lines and the button;
  - hidden under `maximized-card-viewport`.
- [X] T026 [US2] Add the read-only face's preview, from the list row's `notesPreviewHtml`, after the summary in `renderReadOnly` in `src/public/adminCard.js`, through `readOnlyPart` with step 2 (contract C4), and style it in `src/public/admin-card-m3.css`, until T021 passes (TWEAK04 later moved it into the summary, after the subtitle: "Notes: " and up to 4 lines)
- [X] T027 [P] [US2] Add `notesPreviewHtml` and `hasMoreNotes` to the `Card` and `PollContent` schemas in `postman/openapi.json`

**Checkpoint**: voters see the preview. US1 and US2 together are the MVP.

---

## Phase 5: User Story 3 - Read the full notes in the Maximized view (Priority: P2)

**Goal**: "Show more ⌄" opens the Maximized view with the full notes above the line graph.

**Independent Test**: click "Show more ⌄" on a long-notes card, and see the full notes before the graph and no preview on the card (spec US3).

### Tests for User Story 3

- [X] T028 [P] [US3] In `tests/poll-notes.test.ts`, test that `GET /api/polls/:pid/card` and `GET /api/me/polls/:pid` carry `notesHtml`, and that listings do not (contract A2, SC-007)
- [X] T029 [P] [US3] In `tests/client-poll-notes.test.ts` (Maximized section), test contract C2:
  - one fetch, with the notes above `.maximized-graph`;
  - no fetch without notes;
  - a refetch on a new `contentVersion`;
  - the area hidden on a failed fetch;
  - the area emptied on close;
  - the line graph mounted into `.maximized-graph`.
  Update `tests/client-maximized.test.ts` and `tests/line-graph-ui.test.ts` where they find the graph's host

### Implementation for User Story 3

- [X] T030 [US3] Add `notesHtml: renderNotesHtml(row.notes)` to `poll` in the `GET /api/polls/:pid/card` and `GET /api/me/polls/:pid` handlers in `src/routes/tabsApi.ts`, until T028 passes
- [X] T031 [US3] Give `.maximized-space-right` the children `section.maximized-notes` and `div.maximized-graph` in the template in `src/public/index.html`
- [X] T032 [US3] In `src/public/tabs.js`, mount the line graph into `.maximized-graph`. In `maximize`, fetch the card and fill `.maximized-notes` when the detail has `notesPreviewHtml`. Refetch on a content refresh with a new `contentVersion`, and empty the area in `restore`. Work until T029 passes
- [X] T033 [P] [US3] Style `.maximized-notes` (an M3 container above the graph) in `src/public/pollCard-m3.css`
- [X] T034 [P] [US3] Add `notesHtml` to the one-card responses in `postman/openapi.json`

**Checkpoint**: the full notes are one click away (SC-005).

---

## Phase 6: User Story 4 - Notes are safe, screened and findable (Priority: P2)

**Goal**: notes are screened with the poll, found by search, and shown on the public page. Nothing active gets in.

**Independent Test**: unacceptable notes are refused with the new message; a word only in the notes finds the poll; `/poll/:pid` shows the notes (spec US4).

### Tests for User Story 4

- [X] T035 [P] [US4] In `tests/polls-screening.test.ts`, test that a screened word in the notes rejects a first publish and a pending update. Test that the reason reads "Please revise the title, subtitle, notes and choices." (contract A5)
- [X] T036 [P] [US4] In `tests/search-home.test.ts`, test that a word only in the notes finds the poll, ranked below a title, subtitle and choice match. Update the `setweight` expression the test rebuilds, and test that `**`, `++` and `\` make no terms
- [X] T037 [P] [US4] In `tests/seo.test.ts`, test that `/poll/:pid` shows `.poll-notes` with the rendered notes after the subtitle and escapes `</script>` in notes. Test that it leaves the meta description unchanged and omits the block without notes (contract A7)

### Implementation for User Story 4

- [X] T038 [US4] In `src/polls/screening.ts`, add `notes` to `ScreeningInput`, join it in `localScreener` and change the message. Pass `notesPlainText(claimed.notes)` and `notesPlainText(pending.notes ?? claimed.notes)` in `src/polls/sweeps.ts`, and `notes: ""` for an added choice in `src/routes/pollsApi.ts`. Work until T035 passes
- [X] T039 [US4] In `src/search/openSearch.ts`:
  - add `notes` to `PollDocument` (`notesPlainText` in `toDocument`) and to the mapping;
  - add `"notes"` to `multi_match`;
  - make `ensureIndex` call `indices.putMapping` for `notes` when the index exists.
  Update the ranking description in `postman/openapi.json`. Work until T036 passes
- [X] T040 [US4] Give `renderPollPage` a `notesHtml` argument and add `<div class="poll-notes">` in `summary()` in `src/seo/pollPage.ts`. Pass `renderNotesHtml(row.notes)` from the `/poll/:pid` route in `src/routes/seo.ts`. Work until T037 passes

**Checkpoint**: SC-002 and SC-006 hold.

---

## Phase 7: User Story 5 - Change the notes of a published poll (Priority: P3)

**Goal**: notes follow the subtitle through edits, pending updates, copies and exports.

**Independent Test**: change an OPEN, voted poll's notes. Voters see the old notes until the update is applied, then open cards refresh (spec US5).

### Tests for User Story 5

- [X] T041 [P] [US5] In `tests/polls-pending-update.test.ts`, test that a changed `notes` in UPDATE mode goes into `pending_update`, that the projection keeps the old preview until it is applied, and that applying it bumps `content_version`
- [X] T042 [P] [US5] In `tests/polls-admin-crud.test.ts`, test that a duplicate copies `notes`, and that `export.json` carries `notes`. Test that `export.md` writes the notes after the subtitle and omits them when empty (contract A4)

### Implementation for User Story 5

- [X] T043 [US5] Add `notes` to `UPDATE_FIELDS` and to the fields moved into `pending` in the `/publish` handler, and to its log line, in `src/routes/pollsApi.ts`, until T041 passes
- [X] T044 [US5] In `src/polls/service.ts`, copy `notes` in `duplicatePoll`. Add `notes` to `exportPollData`, and write it in `exportPollMarkdown`, until T042 passes
- [X] T045 [P] [US5] Add `notes` to the export and duplicate descriptions and to `pendingUpdate` in `postman/openapi.json`

**Checkpoint**: every story works on its own.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T046 [P] Add to `CLAUDE.md`'s Cross-feature invariants: notes reach HTML only through `src/polls/notes.ts`, and only `notesPreviewHtml` and `notesHtml` may reach `innerHTML`. Add the feature's notes to `CLAUDE_COMPLETE.md`
- [X] T047 [P] Update `README.md` and `ARCHITECTURE.md` per the constitution's Documentation Deliverables: notes, the editor and the preview/full split
- [X] T048 Run `npx tsc --noEmit`, `npm test` and `tests/openapi-contract.test.ts`, and fix what fails
- [ ] T049 Run the manual checks of `specs/20261109-114330-POLL-NOTES/quickstart.md` in Chrome, Firefox and Safari or Edge, and record anything a browser's editing does differently. Time Q1 and record whether writing and saving formatted notes took under one minute without leaving step 2 (SC-001)

---

## Dependencies & Execution Order

- **Setup (Phase 1)** comes first, then **Foundational (Phase 2)**.
- **US1** and **US2** need Phase 2, and are the MVP together: notes that can be written but not read, or read but not written, are no use.
- **US3** needs US2's projection fields (T022) and the card button (T023).
- **US4** needs Phase 2 only. **US5** needs US1's validation (T012).
- `src/public/adminCard.js` is edited by T015 and T026, `tests/client-admin-wizard.test.ts` by T011 and T021, `tests/client-notes-editor.test.ts` by T010 and T014, `src/public/admin-card-m3.css` by T017 and T026, `src/public/pollCard-m3.css` by T025 and T033, `tests/poll-notes.test.ts` by T008, T019 and T028, `src/routes/pollsApi.ts` by T013, T038 and T043, and `postman/openapi.json` by T018, T027, T034, T039 and T045: each group is done one task after another.
- **Polish** comes last.

### Within each story

Tests come first and must fail; then the implementation.

### Parallel Opportunities

- Phase 2: T003, T005 and T006 touch different files.
- US1: T008, T009, T010 and T011 are separate test files or sections; T016, T017 and T018 are separate files.
- US2: T024, T025 and T027 run beside T023.
- US4 can run beside US2 and US3 once Phase 2 is finished.

```text
# User Story 1 tests, in parallel:
T009 tests/field-limits.test.ts
T010 tests/client-notes-editor.test.ts
T011 tests/client-admin-wizard.test.ts
```

## Implementation Strategy

### MVP First

Phases 1–4 let a creator write notes and every voter read the preview. Stop and check quickstart Q1–Q5 before going on.

### Incremental Delivery

1. Phases 1–2: the column and the renderer.
2. US1 and US2: writing and the preview (MVP).
3. US3: the full notes.
4. US4: screening, search and the public page. **Required before release**: notes must be screened before voters can see them.
5. US5: edits of voted polls, copies and exports.
6. Polish, including the manual checks.

## Notes

- [P] tasks touch different files and depend on no unfinished task.
- Commit after each task or logical group.
- Comments follow Principle VI: only links to external documentation (`execCommand`, `beforeinput`, text search).
