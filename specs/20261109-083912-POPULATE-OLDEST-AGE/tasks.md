# Tasks: Populate Oldest Age

**Input**: Design documents from `specs/20261109-083912-POPULATE-OLDEST-AGE/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/data-file.md, quickstart.md

**Tests**: requested by the spec (FR-011), in `tests/populate-poll.test.ts`.

**Organization**: tasks are grouped by user story. Every code change is in `devScripts/populate/populate-poll.ts`, so
tasks touching it run one after another; only the README and test tasks of different files may run in parallel.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: the user story the task belongs to (US1–US4)

---

## Phase 1: Setup

No setup: no dependency, setting or file to create.

---

## Phase 2: Foundational (blocking prerequisites)

- [X] T001 Add `oldestAgeInDays: number | null` to the `PollData` interface, and make `parsePollData` read the optional `oldest_age_in_days` key into it (`null` when the key is `undefined`), with no validation yet, in `devScripts/populate/populate-poll.ts` (R1, data-model)

**Checkpoint**: `npx tsc --noEmit` passes; every existing test in `tests/populate-poll.test.ts` still passes.

---

## Phase 3: User Story 1 — Replay only the recent part of a long data file (Priority: P1) 🎯 MVP

**Goal**: with `oldest_age_in_days` N, only points whose moved date is no earlier than today − N are replayed, and the
poll's dates and the 12-month note follow them.

**Independent Test**: populate the test fixture with a limit that drops points; votes exist only on kept days,
`start_at` is the first kept day, and the kept-points line is printed.

### Tests for User Story 1

- [X] T002 [US1] Add a `describe("keepRecent")` block to `tests/populate-poll.test.ts`: the boundary is inclusive (a point exactly N days before `today` is kept, one N + 1 days before is not); `0` keeps only today's point; a limit larger than the span keeps every point; the order is kept; a span across a daylight-saving change keeps the right calendar days (R3). A file whose data points are out of date order needs no case here: the existing `parsePollData` test "sorted data points" asserts the sort, and `keepRecent` relies on it
- [X] T003 [US1] Add a `populatePoll` case to `tests/populate-poll.test.ts` (in the "create" block, with its fixed `now`): `oldestAgeInDays` set so that some fixture points are ignored → every vote's `voted_at` falls on a kept day, the poll's `start_at`, `launched_at` and `created_at` are the first kept day, `Votes written` counts only kept points, the log holds `[populate] Kept <k> of <n> data points (oldest_age_in_days <N>)` after the `Target:` line, and no 12-month note is logged (FR-004–FR-007)
- [X] T004 [US1] Add a rerun case to the "rerun" block of `tests/populate-poll.test.ts`: populate the fixture with no limit, then again with a limit → no simulated vote or `vote_history` row of the poll is older than the first kept day, the poll's `start_at` and `launched_at` are the first kept day, and its `created_at` keeps the value of the first run (FR-005, FR-008)

### Implementation for User Story 1

- [X] T005 [US1] Export a pure `keepRecent(points: DataPoint[], today: Date, oldestAgeInDays: number): DataPoint[]` returning the points with `calendarDay(p.date) >= calendarDay(today) - oldestAgeInDays`, in `devScripts/populate/populate-poll.ts` (R3)
- [X] T006 [US1] In `populatePoll`, keep the `shiftDates(data.dataPoints, now)` result as `shifted`, set `points` to `shifted` when `data.oldestAgeInDays` is `null` and to `keepRecent(shifted, now, data.oldestAgeInDays)` otherwise, so `firstDay`, `lastDay`, the poll's dates, the replay loop and the 12-month note use the kept points, in `devScripts/populate/populate-poll.ts` (R4)
- [X] T007 [US1] In `populatePoll`, when `points.length < shifted.length`, log `[populate] Kept ${grouped(points.length)} of ${grouped(shifted.length)} data points (oldest_age_in_days ${N})` after the `Target:` line and before the first write, in `devScripts/populate/populate-poll.ts` (R5, contract D3)

**Checkpoint**: T002–T004 pass.

---

## Phase 4: User Story 2 — Files without the limit behave as before (Priority: P1)

**Goal**: a file without the key, or with a limit at least as large as its span, replays every point and prints no
kept-points line.

**Independent Test**: populate the fixture without the key, and with a large limit; the output and votes match the
existing expectations.

- [X] T008 [US2] Add `parsePollData` cases to `tests/populate-poll.test.ts`: the fixture without the key gives `oldestAgeInDays` `null`; `0` and `30` are read as numbers (FR-001)
- [X] T009 [US2] Add a `populatePoll` case to `tests/populate-poll.test.ts`: with a limit larger than the fixture's span, every point is replayed and no `Kept` line is logged; and assert that the existing no-key "create" case logs no `Kept` line (SC-002)

**Checkpoint**: T008–T009 pass with no change to the implementation beyond US1.

---

## Phase 5: User Story 3 — An invalid limit is refused before anything is written (Priority: P2)

**Goal**: `-1`, `2.5`, `"30"` and `null` stop the run with the contract D2 line, before the database is opened.

**Independent Test**: `parsePollData` throws `InputError` with the exact message for each invalid value.

- [X] T010 [US3] Add the four invalid values to the table of the "parsePollData — input errors" block of `tests/populate-poll.test.ts`, each expecting `"oldest_age_in_days" must be a whole number of at least 0, not <JSON value>` (FR-002, contract D2)
- [X] T011 [US3] In `parsePollData`, when `oldest_age_in_days` is not `undefined` and not (`Number.isInteger(value) && value >= 0`), throw `InputError` `"oldest_age_in_days" must be a whole number of at least 0, not ${JSON.stringify(value)}`, in `devScripts/populate/populate-poll.ts` (R2)

**Checkpoint**: T010 passes.

---

## Phase 6: User Story 4 — Folder runs pick up the limit (Priority: P3)

**Goal**: adding or changing the key in one file makes `populate-all-polls` repopulate only that file.

**Independent Test**: quickstart manual check 4. No code change: `populate-all-polls.ts` already compares each file's
SHA-256, and the new `Kept` line does not match the lines it reads (R5, R6).

- [X] T012 [US4] Confirm by reading `devScripts/populate/populate-all-polls.ts` that its `DONE_LINE`, `VOTES_LINE` and `ERROR_LINE` patterns do not match the `Kept` line and that a changed file is repopulated; change nothing in that file (FR-009)

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T013 [P] Add an `oldest_age_in_days` row to the key table of `devScripts/populate/README-populate-poll-and-seed-poll.md` ("optional; a whole number ≥ 0; only the data points no older than this many days, counted back from the latest point, which falls on today, are replayed; absent: every point"), and a sentence with the `Kept … data points` line as an example (FR-010)
- [X] T014 Run `npx tsc --noEmit` and `npx vitest run tests/populate-poll.test.ts tests/populate-all-polls.test.ts`; both pass
- [ ] T015 Run the quickstart manual checks 1–4 in `specs/20261109-083912-POPULATE-OLDEST-AGE/quickstart.md` against the development database

---

## Dependencies & Execution Order

- **Phase 2 (T001)** blocks every story: the field must exist before it is used or tested.
- **US1 (T002–T007)**: tests T002–T004 first (they fail), then T005 → T006 → T007 (same file, in order).
- **US2 (T008–T009)**: after T006 (a limit is honoured), since T009 runs with a limit.
- **US3 (T010–T011)**: after T001; independent of US1 and US2.
- **US4 (T012)**: after US1 (the `Kept` line exists).
- **Polish**: T013 any time after T001; T014 after every code task; T015 last.

### Parallel Opportunities

- T013 (README) can run beside any task of `populate-poll.ts` or the test file.
- The test tasks all edit `tests/populate-poll.test.ts` and the code tasks all edit `populate-poll.ts`, so within each
  file they run in order; one test task and one code task of different files can run side by side, e.g. T010 beside T005.

## Implementation Strategy

- **MVP**: Phase 2 + US1 (T001–T007): a limit works for valid values.
- **Then**: US3 (refusals), US2 (no-limit regression checks), US4 (confirmation), Polish.
- Each checkpoint leaves `npx tsc --noEmit` and `tests/populate-poll.test.ts` passing.
