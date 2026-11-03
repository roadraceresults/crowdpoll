---

description: "Task list for Field Length Limits"
---

# Tasks: Field Length Limits

**Input**: Design documents from `specs/20261102-154952-FIELD-LENGTH-LIMITS/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui-contracts.md, quickstart.md

**Tests**: Included. FR-009 and SC-004 require an automated test, and Constitution IV asks for a check on every
requirement (research R9).

**Organization**: Tasks are grouped by user story; all three stories are P1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

Single repository: server in `src/`, browser in `src/public/`, tests in `tests/`.

---

## Phase 1: Setup

**Purpose**: Know the starting point.

- [X] T001 Run `npx tsc --noEmit` and `npm test` from the repository root and note the pass/skip counts as the baseline

---

## Phase 2: Foundational

**Purpose**: None. Each story edits the constants it needs; there is no shared prerequisite.

---

## Phase 3: User Story 1 - Longer titles and subtitles (Priority: P1) 🎯 MVP

**Goal**: Titles up to 60 characters and subtitles up to 40, in the wizard and on every save (FR-001, FR-002).

**Independent Test**: In the wizard, 60 and 40 characters are accepted and the 61st and 41st are not; a direct save
of 61 or 41 is refused with "at most 60" / "at most 40"; the views show both whole at 360 px.

### Tests for User Story 1

- [X] T002 [P] [US1] In `tests/polls-admin-crud.test.ts` (lines 317–333), change the title cases to 61 refused ("at most 60") and 60 accepted, and the subtitle cases to 40 accepted and 41 refused ("at most 40")
- [X] T003 [P] [US1] In `tests/client-admin-wizard.test.ts` (lines 1172–1173), expect the subtitle field's `maxLength` to be 40 and the title field's 60
- [X] T004 [P] [US1] In `tests/populate-poll.test.ts` (lines 370 and 373), use a 61-character title (expect `/60/`) and a 41-character subtitle (expect `"subtitle" is longer than 40 characters`); and in the case at lines 57–60 make it "accepts a 40-character subtitle unchanged" with `"x".repeat(40)`

### Implementation for User Story 1

- [X] T005 [US1] In `src/polls/service.ts` (lines 31–32), set `TITLE_MAX = 60` and `SUBTITLE_MAX = 40` (research R1)
- [X] T006 [P] [US1] In `src/public/adminCard.js` (lines 519–520), set the copies `TITLE_MAX = 60` and `SUBTITLE_MAX = 40`
- [X] T007 [US1] Do the 360 px check from `specs/20261102-154952-FIELD-LENGTH-LIMITS/quickstart.md` step 2 (poll card, maximized card with line graph, admin card, search results) with a 60-character title and a 40-character subtitle; fix only an overflow found, in the view's stylesheet under `src/public/` (research R6, contract C5)

**Checkpoint**: `npx vitest run tests/polls-admin-crud.test.ts tests/client-admin-wizard.test.ts tests/populate-poll.test.ts` passes.

---

## Phase 4: User Story 2 - One 35-character limit for every new choice (Priority: P1)

**Goal**: `CHOICE_LABEL_MAX = 35` is the only choice-label limit, applied wherever a choice is entered;
`WIZARD_CHOICE_MAX` and `wizardChoiceMax` are gone (FR-003, FR-004, FR-008).

**Independent Test**: A 36-character new choice is cut or refused in the new poll's wizard, a direct save, the Add
Choice dialog and endpoint, and the populate script; 35 is accepted; `/api/config` has `choiceLabelMax: 35`.

**Ships with US3**: lowering the server's check to 35 without US3's exemption would refuse saves of polls holding
longer stored labels, so US2 and US3 are deployed together.

### Tests for User Story 2

- [X] T008 [P] [US2] In `tests/add-choice.test.ts` (lines 238–240), accept 35 characters and refuse 36 with `{ error: "A choice can be at most 35 characters.", code: "CHOICE_TOO_LONG" }` (contract A3)
- [X] T009 [P] [US2] In `tests/client-add-choice.test.ts` (lines 280–285), expect the dialog field to stop at 35 (`maxLength` 35, counter "n / 35"), with the page given `choiceLabelMax: 35` (contract C4)
- [X] T010 [P] [US2] In `tests/client-admin-wizard.test.ts`, change the case at lines 365–372 to cut a new poll's choice to 35 with "Choices are capped at 35 characters.", and rename the case at line 1723 to "caps a new poll's choices at choiceLabelMax from /api/config", feeding `choiceLabelMax` (contract C2)
- [X] T011 [P] [US2] In `tests/polls-service.test.ts` (line 168) and `tests/polls-pending-update.test.ts` (line 56), use a new 36-character label and expect the 400 / `/at most 35/`
- [X] T012 [P] [US2] In `tests/polls-admin-crud.test.ts` (line 373), save a new 36-character label and expect 400 "Choice label must be at most 35 characters." (contract A2)
- [X] T013 [P] [US2] In `tests/populate-poll.test.ts` (line 375), use a 36-character `choice_b` and expect the `/choice_b/` error naming 1 to 35 characters
- [X] T014 [P] [US2] In `tests/bar-palette.test.ts`, add a case beside its `GET /api/config` request (line 46) with an expectation that the response has `choiceLabelMax: 35` and no `wizardChoiceMax` (contract A1)

### Implementation for User Story 2

- [X] T015 [US2] In `src/polls/service.ts`, set `CHOICE_LABEL_MAX = 35`, delete `WIZARD_CHOICE_MAX` and its doc comment (lines 34–35), and make `validateAddedChoice` (lines 975–976) check and word its message with `CHOICE_LABEL_MAX` (research R1)
- [X] T016 [US2] In `src/routes/api.ts`, import `CHOICE_LABEL_MAX` instead of `WIZARD_CHOICE_MAX` (line 21) and send `choiceLabelMax: CHOICE_LABEL_MAX` in place of `wizardChoiceMax` (line 165) (research R4)
- [X] T017 [P] [US2] In `src/public/adminCard.js`, set `CHOICE_LABEL_MAX = 35` (line 10); in `runtime` (line 40) replace `wizardChoiceMax: 40` with `choiceLabelMax: CHOICE_LABEL_MAX`; in `setRuntimeConfig` (line 48) read `cfg.choiceLabelMax`; in Step 3's `wireChoicesBox` call (line 1409) pass `maxLabel: runtime.choiceLabelMax` for new and existing polls
- [X] T018 [P] [US2] In `src/public/tabs.js` (line 195), replace `wizardChoiceMax: (config && config.wizardChoiceMax) || 40` with `choiceLabelMax: (config && config.choiceLabelMax) || 35`
- [X] T019 [P] [US2] In `src/public/pollCard.js` (line 1501), pass `maxLength: bounds.choiceLabelMax || 35`
- [X] T020 [P] [US2] In `src/public/addChoiceDialog.js` (line 18), default `maxLength` to 35

**Checkpoint**: the US2 tests above pass.

---

## Phase 5: User Story 3 - Choices already saved stay whole (Priority: P1)

**Goal**: A label whose trimmed text equals a stored label is exempt from the 35 limit in saves and in the wizard; a
stored line is cut to 35 as soon as its text changes (FR-005, FR-006, FR-007, clarification Q1).

**Independent Test**: A voted poll with a 72-character choice opens in the wizard with the line whole, saves with a new
short choice, and keeps the long choice's id and votes; one keystroke in the long line cuts it to 35.

### Tests for User Story 3

- [X] T021 [P] [US3] In `tests/polls-service.test.ts`, add: `replaceChoices` on a poll with a stored 72-character label accepts it repeated (also with surrounding spaces) beside a new 30-character label, and still refuses a new 36-character label
- [X] T022 [P] [US3] In `tests/polls-pending-update.test.ts`, add: `mergeChoices` on a stored 72-character label repeated unchanged keeps its id (no deletion), and the same label with one character changed is refused as a new label over 35
- [X] T023 [P] [US3] In `tests/polls-admin-crud.test.ts`, add: a poll whose stored choice is 72 characters (set through the store, as other tests seed polls) accepts a `PATCH /api/admin/polls/:pid` save that repeats it and adds a short label (contract A2)
- [X] T024 [P] [US3] In `tests/client-admin-wizard.test.ts`, add: `AdminCard.sanitizeChoicesText` leaves a line in `storedLabels` whole and cuts any other line to 35; and an existing poll with a 72-character choice shows the line whole in Step 3, and typing one character into it cuts it to 35 with "Choices are capped at 35 characters." (contract C3)

### Implementation for User Story 3

- [X] T025 [US3] In `src/polls/service.ts`, add `labelTooLong(label, storedLabels)` (true when `label.length > CHOICE_LABEL_MAX` and `storedLabels` lacks it), and in `replaceChoices` and `mergeChoices` build `storedLabels` from `poll.choices.map((c) => c.label.trim())` and refuse only `cleaned.some((label) => labelTooLong(label, storedLabels))` (research R2)
- [X] T026 [US3] In `src/public/adminCard.js`, give `sanitizeChoicesText` (line 233) a `storedLabels` option (a `Set`, empty by default) whose lines (by trimmed text) are not cut; pass `hooks.storedLabels` through both calls in `wireChoicesBox` (lines 2795, 2813); in Step 3 (lines 1407–1409) pass `storedLabels: new Set(existing ? session.poll.choices.map((c) => c.label.trim()) : [])` and remove the comment about the server's 100 characters (research R3)

**Checkpoint**: the US3 tests above pass; quickstart step 5 behaves as described.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T027 [P] Add `tests/field-limits.test.ts`: read `src/public/adminCard.js` as text, extract `const TITLE_MAX = n;`, `const SUBTITLE_MAX = n;` and `const CHOICE_LABEL_MAX = n;`, and expect each to equal the value imported from `src/polls/service.ts`; also expect `service.ts` to export no `WIZARD_CHOICE_MAX` (research R5, FR-009)
- [X] T028 [P] Update `postman/openapi.json` per contract A4: title `maxLength` 60 and subtitle 40 in every schema; `labels.items.maxLength` 35 with the stored-label exemption in its description; `/api/config` property `choiceLabelMax` (35) replacing `wizardChoiceMax` (line 1662); add-choice `label.maxLength` 35 (line 6851) and its 400 description "at most 35 characters" (line 6885)
- [X] T029 [P] Update `README.md` line 47 ("up to 40" → "up to 35"), `ARCHITECTURE.md` line 281 ("40 characters" → "35 characters") and `CLAUDE_COMPLETE.md` line 99 ("`SUBTITLE_MAX` (30)" → "`SUBTITLE_MAX` (40)") (research R7, FR-012)
- [X] T030 Search `src/`, `tests/`, `devScripts/` and `postman/` for `WIZARD_CHOICE_MAX` and `wizardChoiceMax`; none may remain
- [X] T031 Run `npx tsc --noEmit` and `npm test`; all pass, `tests/migration-title-lengths.test.ts` unchanged and passing
- [X] T032 Run the manual checks in `specs/20261102-154952-FIELD-LENGTH-LIMITS/quickstart.md` (steps 1–6)

---

## Dependencies & Execution Order

- **Setup (T001)** first.
- **US1 (T002–T007)** is independent of US2 and US3 and can ship alone (MVP).
- **US2 (T008–T020)** and **US3 (T021–T026)** edit the same functions (`service.ts` choice checks, `adminCard.js`
  Step 3); do US2 then US3, and deploy them together.
- **Polish (T027–T032)** after the stories; T027 needs T006 and T017; T030–T032 come last.
- Within each story, the tests are written first and fail until the implementation tasks land.

## Parallel Opportunities

- US1: T002, T003, T004 together; then T005 and T006 together.
- US2: T008–T014 together (eight test files); T017–T020 together after T015–T016.
- US3: T021–T024 together; T025 and T026 touch different files and can run together.
- Polish: T027, T028, T029 together.

### Parallel Example: User Story 2

```text
Task: "T008 add-choice.test.ts 35/36"
Task: "T009 client-add-choice.test.ts maxLength 35"
Task: "T011 polls-service / polls-pending-update 36 refused"
Task: "T013 populate-poll.test.ts 36-character choice_b"
```

## Implementation Strategy

1. **MVP**: T001, then US1 (T002–T007); validate it and it can ship alone.
2. **Choices**: US2 and US3 together (T008–T026), never US2 alone.
3. **Polish**: T027–T032, ending with the full test run and the quickstart.
