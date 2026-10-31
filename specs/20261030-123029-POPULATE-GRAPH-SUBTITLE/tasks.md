# Tasks: Populate Script Graph Subtitle

**Input**: Design documents from `specs/20261030-123029-POPULATE-GRAPH-SUBTITLE/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R6), data-model.md, contracts/cli.md (C1–C5), quickstart.md

**Tests**: included — the spec requests them explicitly (FR-008). Within each story, tests come first and
must fail before the implementation task makes them pass.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single project at the repository root: the script in `devScripts/populate/`, tests in `tests/`.

---

## Phase 1: Setup

**Purpose**: the shared fixture change every story's tests read

- [X] T001 Add `"subtitle": "Fixture subtitle"` to `tests/fixtures/populate-poll.json` (research R5)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the parse change every user story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 In `devScripts/populate/populate-poll.ts`: extend the `src/polls/service.js` import with
      `SUBTITLE_MAX`; add `subtitle: string` to the `PollData` interface; add an `optionalText`-style helper
      beside `requiredText` and read `subtitle` in `parsePollData` — absent or `""` → `""`, a
      non-string → `InputError` `"subtitle" must be text`, a string over `SUBTITLE_MAX` → `InputError`
      `"subtitle" is longer than 30 characters`, otherwise the untrimmed value (contracts C1–C2,
      research R2, R4)

**Checkpoint**: `parsePollData` returns `subtitle`; both write paths still hard-code `""` (US1 changes that)

---

## Phase 3: User Story 1 - A populated demonstration poll carries a subtitle (Priority: P1) 🎯 MVP

**Goal**: the file's `subtitle` becomes the poll's subtitle on create and on refresh, visible on the
poll card and the maximized line graph with no browser change

**Independent Test**: run the script on a data file with a valid `subtitle`; the poll row's `subtitle`
equals the value, and a rerun with a changed value updates it (quickstart §2–3)

### Tests for User Story 1

> **NOTE: T003 verifies T002's parse output (T002 is a strict prerequisite, so T003 cannot fail-first);
> the fail-first discipline applies to T004, which must fail before T005/T006 land**

- [X] T003 [US1] In `tests/populate-poll.test.ts`, `parsePollData` suite: the fixture's `subtitle`
      lands on `PollData.subtitle` (passes once T002 is in; fails before it)
- [X] T004 [US1] In `tests/populate-poll.test.ts`: `populatePoll — create` asserts the created poll row's
      `subtitle` equals the fixture's value; `populatePoll — rerun` asserts a rerun with a changed
      `subtitle` updates `polls.subtitle` while keeping the poll id

### Implementation for User Story 1

- [X] T005 [US1] In `devScripts/populate/populate-poll.ts`, create path: replace `subtitle: ""` in the
      `Object.assign(poll, …)` with `subtitle: data.subtitle` (research R3)
- [X] T006 [US1] In `devScripts/populate/populate-poll.ts`, refresh path: replace `subtitle: ""` in the
      `updatePoll` call with `subtitle: data.subtitle` (research R3)

**Checkpoint**: User Story 1 fully functional — T003/T004 pass; the subtitle shows on the card and the line
graph (they already render `polls.subtitle`, research R1)

---

## Phase 4: User Story 2 - Existing data files keep working (Priority: P2)

**Goal**: a file without the key behaves exactly as today, and a rerun without the key clears an earlier
subtitle (the file is the source of truth)

**Independent Test**: run the script on a file with `"subtitle": ""`; the poll's subtitle is empty, a rerun
with `""` clears a previously set subtitle, and a file with no `subtitle` key is refused (quickstart §3, §5;
amended by TWEAK01)

### Tests for User Story 2

- [X] T007 [US2] In `tests/populate-poll.test.ts`, `parsePollData` suite: `"subtitle": ""`
      parses to `subtitle: ""`, and data without a `subtitle` key is refused with `"subtitle" is missing` (TWEAK01)
- [X] T008 [US2] In `tests/populate-poll.test.ts`, `populatePoll — rerun` suite: a rerun whose data has
      `"subtitle": ""` clears `polls.subtitle` to `""` (TWEAK01)

### Implementation for User Story 2

No implementation task: the behaviour falls out of T002 (absent → `""`) and T006 (the refresh always writes
`data.subtitle`); T007/T008 prove it.

**Checkpoint**: User Stories 1 AND 2 both pass independently

---

## Phase 5: User Story 3 - An invalid subtitle stops the run before any write (Priority: P3)

**Goal**: a non-string or over-long `subtitle` is one `[populate] Error:` line and exit 1, with nothing
written

**Independent Test**: run the script on a file with a 31-character value; one error line, exit code 1, zero
rows changed (quickstart §4)

### Tests for User Story 3

- [X] T009 [US3] In `tests/populate-poll.test.ts`, `parsePollData — input errors` table: a non-string
      `subtitle` (e.g. `7`) is refused with `"subtitle" must be text`; a 31-character string is
      refused with `"subtitle" is longer than 30 characters`; and in the `parsePollData` suite a
      30-character string is accepted unchanged (contract C2, boundary from the spec's edge cases)

### Implementation for User Story 3

No implementation task: the validation is T002's helper; T009 proves the messages and the boundary. The
no-write guarantee is structural — `parsePollData` runs before the database is touched, as the existing
`refuses an unknown creator without writing anything` test shows.

**Checkpoint**: All user stories independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T010 [P] Add the `subtitle` row to the key table in `devScripts/populate/README.md`: optional,
      the poll's subtitle shown under the title, at most 30 characters (contract C5)
- [X] T011 Correct the two git-ignored files under `polldata/` by hand: documented keys
      (`poll_creator_email`, `title`, `choice_a`/`choice_b`, choice-keyed `data_points`, `vote_count`),
      keeping `subtitle` with a value within the limit, e.g. `"For Demonstration Purposes"`
      (research R6; local only, nothing committed)
- [X] T015 TWEAK01: rename the input key `graph_subtitle` to `subtitle` and make it required —
      `parsePollData` refuses an absent key with `"subtitle" is missing`; the fixture, the populate tests
      (absent key refused, `""` clears) and the README key table follow; the `polldata/` files are renamed by
      hand
- [X] T016 TWEAK02: rename the input key `poll creator email` to `poll_creator_email` — `parsePollData` reads
      it with `requiredText`, so an absent key is `"poll_creator_email" is missing or empty`; the fixture, the
      populate tests (the old key alone is refused) and the README key table follow; the `polldata/` files are
      renamed by hand
- [X] T017 TWEAK03: `.do/app.yaml` sets `NODE_ENV=production` (`RUN_AND_BUILD_TIME`) and builds with
      `npm ci --include=dev`, so the buildpack prunes devDependencies; `tsx` moves to `dependencies` for
      `npm run reconcile`; `tests/config.test.ts` checks all three; root `README.md` deploy line updated
- [X] T012 Run `npx tsc --noEmit` and `npx vitest run tests/populate-poll.test.ts`; fix anything they report
- [X] T013 Run the quickstart validation end to end (`specs/20261030-123029-POPULATE-GRAPH-SUBTITLE/quickstart.md`):
      create run shows the subtitle on the card and the line graph, rerun applies and clears, error cases
      exit 1 with one line
- [X] T014 Review the root `README.md` and `ARCHITECTURE.md` (post-implementation documentation
      deliverables): update only if either describes the populate input format; otherwise record that no
      change was needed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: independent of T001 in code, but T003's test reads the fixture — complete both
  before the stories
- **User Stories (Phase 3–5)**: all depend on T001 + T002; US2 and US3 also lean on US1's T006 for the
  rerun-clears case (T008)
- **Polish (Phase 6)**: after the stories; T010 and T011 touch no code and can start any time after T002
  fixes the format

### User Story Dependencies

- **US1 (P1)**: starts after Phase 2 — the MVP
- **US2 (P2)**: tests only; T007 needs T002, T008 needs T006 (US1)
- **US3 (P3)**: tests only; T009 needs T002

### Within Each User Story

- Tests are written first and must fail before the implementation task lands
- T005 and T006 edit the same file — sequential, not [P]

### Parallel Opportunities

- T001 ∥ T002 (different files)
- T010 ∥ anything after T002; T011 ∥ anything (data files only)

---

## Parallel Example: User Story 1

```bash
# After T001 + T002, write US1's tests (same test file — one edit session):
Task: "T003 parsePollData maps the fixture's subtitle onto PollData.subtitle"
Task: "T004 create stores the subtitle; rerun applies a changed value"

# Then the two write-path edits in devScripts/populate/populate-poll.ts, in order:
Task: "T005 create path subtitle: data.subtitle"
Task: "T006 refresh path subtitle: data.subtitle"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (T001) + Phase 2 (T002)
2. Phase 3: T003–T006
3. **STOP and VALIDATE**: `npx vitest run tests/populate-poll.test.ts`; quickstart §2 shows the subtitle on
   the card and the graph
4. US2/US3 are test-only phases that lock the behaviour in; Polish finishes the docs and the local data files

### Incremental Delivery

1. T001–T002 → parse ready
2. US1 → MVP: the subtitle is stored and shown
3. US2 → backward compatibility proven
4. US3 → validation proven
5. Polish → README row, corrected local files, type-check, quickstart, root-docs review

---

## Notes

- [P] tasks = different files, no dependencies
- T003, T004, T007, T008, T009 all edit `tests/populate-poll.test.ts` — do them as sequential edits even
  across phases
- Verify T004 fails before T005/T006 land; T003 and the US2/US3 tests verify behaviour earlier tasks already
  implement, so they pass as soon as they are written
- Commit after each phase checkpoint
