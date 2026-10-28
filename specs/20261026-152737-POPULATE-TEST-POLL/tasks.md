---
description: "Task list for the populate-poll developer script"
---

# Tasks: Populate Test Poll

**Input**: Design documents from `specs/20261026-152737-POPULATE-TEST-POLL/`
**Prerequisites**: plan.md, spec.md, research.md (R1–R12), data-model.md, contracts/cli.md (C1–C5), quickstart.md

**Tests**: Requested by the spec (FR-023): the pure steps and a full create-then-rerun run on the test database with a committed fixture. Within each story, write the tests first and see them fail.

**Organization**: Tasks are grouped by user story. Every code task edits one of three files, so tasks on the same file are sequential; `[P]` marks the few that touch a different file with no pending dependency.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (create, P1), US2 (rerun, P2), US3 (errors and output, P3)

## Path Conventions

- Script: `devScripts/populate/populate-poll.ts`
- Tests: `tests/populate-poll.test.ts`, fixture `tests/fixtures/populate-poll.json`
- No file under `src/` is edited (plan, Constitution III)

---

## Phase 1: Setup

**Purpose**: Make the new files trackable and give the tests their fixture.

- [X] T001 Add `!devScripts/populate/populate-poll.ts` to `.gitignore` directly after `!devScripts/populate/README.md`, so the script is tracked despite `devScripts/populate/*` (R12)
- [X] T002 [P] Create `tests/fixtures/populate-poll.json`: `"poll creator email": "creator@example.com"`, `"title": "Fixture Approval"`, `"choice_a": "Approve"`, `"choice_b": "Disapprove"`, `"choice_c": "Unsure"`, `"vote_count": 100`, and three `data_points` deliberately out of order — `"10/03/26"` (`choice_a` 40, `choice_b` 50, no `choice_c`), `"10/01/26"` (`choice_a` 48, `choice_b` 49, `choice_c` 0), `"10/05/26"` (`choice_a` 34, `choice_b` 65, `choice_c` 0) — so `Unsure` has 0% everywhere (spec US1 scenario 5) and one data point omits a choice
- [X] T003 [P] Create `devScripts/populate/populate-poll.ts` with: a one-line header comment pointing to `devScripts/populate/README.md` for usage (as `seed-polls.ts` does; no other comments, Constitution VI); `export class InputError extends Error`; the exported types `PollData` (`creatorEmail`, `title`, `choices: { key: string; label: string }[]`, `voteCount`, `dataPoints: { date: Date; percentages: number[] }[]`) and `Summary` (`pollId`, `outcome: "created" | "refreshed"`, `votesDeleted`, `votesWritten`, `final: { label: string; count: number; percent: number }[]`, `elapsedMs`, `notes: string[]`) per data-model.md; constants `SIMULATED_DOMAIN = "crowdpolltest.test"`, `POOL_FACTOR = 1.15`, `SPREAD = 0.15`, `BATCH = 1000`; an empty `async function main()`; and the entry guard `if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();` copied from `devScripts/file-manifest.ts` (R1)

---

## Phase 2: Foundational (the pure steps every story uses)

**Purpose**: Parse a valid file and compute dates, counts, shares, voters and times (R9, C5).

**⚠️ CRITICAL**: US1–US3 all call these functions.

- [X] T004 Write unit tests in `tests/populate-poll.test.ts` (new file, `describe` per function, importing from `../devScripts/populate/populate-poll.js`): `parsePollData` on the fixture returns three choices in key order (`Approve`, `Disapprove`, `Unsure`), `voteCount` 100, data points sorted ascending (`10/01/26`, `10/03/26`, `10/05/26` as local midnights of 2026), and a missing `choice_c` read as 0; choice keys `choice_b`, `choice_a`, `choice_aa`, `choice_z` order as `choice_a`, `choice_b`, `choice_z`, `choice_aa`; `shiftDates` with today = 2026-10-26 moves the three dates to 2026-10-22, 10-24, 10-26 (intervals kept) and across a daylight-saving change still lands on local midnights; `voteCountFor(100, () => 0)` = 85, `() => 1` = 115, `() => 0.5` = 100; `splitByShares(100, [48, 49, 0])` = `[49, 51, 0]` and always sums to the count (largest remainder, ties by order) including `splitByShares(7, [1, 1, 1])`; `pickVoters(10, 4, random)` returns 4 distinct numbers in 1..10 and `pickVoters(10, 10, random)` all of them; `voteTimesFor(day, now, random)` returns times in `[day, nextMidnight)`, and in `[day, now)` when `now` is within `day`. Run them and confirm they fail
- [X] T005 Implement `parsePollData(json, bounds)` for a valid file in `devScripts/populate/populate-poll.ts`: read `poll creator email`, `title`, the keys matching `^choice_[a-z]+$` ordered by length then alphabetically, `vote_count`, `data_points`; parse `MM/DD/YY` as `new Date(2000 + YY, MM - 1, DD)`; one percentage per choice, 0 when missing; sort data points ascending (validation errors come in T020) (R9, R10)
- [X] T006 Implement `shiftDates(points, today)`, `voteCountFor(base, random)`, `splitByShares(count, percentages)`, `pickVoters(poolSize, count, random)` (partial Fisher–Yates over 1..poolSize) and `voteTimesFor(day, now, random)` in `devScripts/populate/populate-poll.ts` exactly as R9 and C5 state; the day offset is computed from `Date.UTC` of the local calendar fields, and each moved date is `new Date(y, m, d + offset)`. Make T004 pass

**Checkpoint**: `npx vitest run tests/populate-poll.test.ts` passes.

---

## Phase 3: User Story 1 — Create a poll that replays a time series (Priority: P1) 🎯 MVP

**Goal**: A valid file and an existing creator produce a new, populated poll whose counters and search entry are current.

**Independent Test**: Run `populatePoll` against the test database with the fixture; one poll exists with the FR-008 fields, each data point's votes are within ±15% and split by its scaled percentages, the votes fall on the moved days, and the counters agree in the cache and the row.

### Tests for User Story 1

- [X] T007 [US1] Add a `describe("populatePoll — create")` block to `tests/populate-poll.test.ts`: `beforeAll` `startTestContext()` (`tests/helpers/setup.ts`), `afterAll` `ctx.stop()`, `beforeEach` `clearPolls(ctx)`; insert the creator directly into `"user"` (`id: "creator-1"`, `name`/`userName: "Creator One"`, `email: "creator@example.com"`, `emailVerified: true`, timestamps now); run `populatePoll({ db: ctx.db, cache: ctx.cache, config: ctx.config }, parsePollData(fixture, ctx.config), { now: new Date(2026, 9, 26, 12), random: seeded, log: lines.push })` with a small deterministic `random` (e.g. a linear congruential generator defined in the test). Assert: the summary's `outcome` is `created`; one `polls` row with title `Fixture Approval`, choices `Approve`/`Disapprove`/`Unsure` at positions 0–2, `poll_state` `OPEN`, `poll_visibility` `Public Poll`, `poll_sharing_mode` `Anyone With The Link`, `vote_anonymity` `Yes`, `choice_mode` `Single-Choice Poll`, `vote_mutability` `Dynamic-Vote Poll`, `voter_count_limit` null, `keywords` `""`, `subtitle` `""`, `end_at` null, `created_by_id` `creator-1`, `created_by_name` `Creator One`, and `created_at` = `start_at` = `launched_at` = local midnight 2026-10-22; `vote_history` rows per moved day (grouped by the local calendar date of `voted_at`, computed in the test, not in SQL) are between 85 and 115 and each day's per-choice counts equal `splitByShares` of that day's count; no `vote_history` row is later than `now`; for every simulated voter, the `votes` row's choice and `voted_at` equal those of their latest `vote_history` row (FR-016); `Unsure` has no votes but is still a choice; every `votes` email matches `test_<n>@crowdpolltest.test` with `n` ≤ 115; `user_polls` has the creator's `created` row and a `voted` row per voter; `polls.vote_count` and `choice_counts` equal the `votes` table's counts, `ctx.cache.hgetall("cnt:<pid>")` holds the same total, and `search_outbox` has a row for the poll; the summary's `votesWritten` equals the `vote_history` row count and its `final` percentages sum to 100 (±0.1). Run and confirm it fails

### Implementation for User Story 1

- [X] T008 [US1] Implement the start of `populatePoll(deps, data, options)` in `devScripts/populate/populate-poll.ts` (defaults: `now = new Date()`, `random = Math.random`, `log = console.log`): log `[populate] Target: <config.publicOrigin> (database <new URL(config.databaseUrl).host>)` (C3, R11); select `id`, `userName`, `name` from `"user"` where `email` = `data.creatorEmail` (unknown → `throw new InputError(...)`, T020 covers it); select polls with that `created_by_id` and `title`, newest `created_at` first, ties broken by `id`; move the dates with `shiftDates(data.dataPoints, now)`; when no poll matched, build the poll from `createDefaultPoll(now)` (`src/polls/service.ts`) with `title`, `subtitle: ""`, `choices` (`randomUUID()` ids, positions in key order), `pollState: "OPEN"`, `startAt` and `createdAt` = the first moved date, `endAt: null`, and call `insertPoll({ db, cache }, poll, { id, name: userName ?? name, email })` (`src/polls/store.ts`) (R3)
- [X] T009 [US1] Implement the vote loop in `populatePoll`: `poolSize = Math.ceil(POOL_FACTOR * data.voteCount)`; for each moved data point, oldest first: `count = voteCountFor`, `voters = pickVoters`, `perChoice = splitByShares`, assign the first `perChoice[0]` voters to choice 0 and so on, time each vote with `voteTimesFor(date, now, random)`, build `{ pid, email: \`test_${n}@${SIMULATED_DOMAIN}\`, userName: \`test_${n}\`, choiceIds: [choiceId], votedAt, voteMutability: "Dynamic-Vote Poll" }` typed as `Parameters<typeof writeBatch>[1][number]`, write them with `writeBatch(db, slice)` (`src/votes/consumer.ts`) in slices of `BATCH`, and log `[populate] <YYYY-MM-DD>  votes <n>  total <running>` with `en-US` grouping (R7, C3)
- [X] T010 [US1] Finish `populatePoll`: call `reconcile({ db, cache }, [pid])` (`src/polls/counters.ts`) always (R8, UA13); read `vote_count` and `choice_counts` from the poll row to build `final` (label, count, percent to one decimal); add the note when the first and last moved dates are more than 12 months apart, and the restart note when `config.valkeyUrl` is unset (C3); log the summary lines of C3 and return the `Summary` with `elapsedMs`. Make T007 pass
- [X] T011 [US1] Implement `main()` in `devScripts/populate/populate-poll.ts`: read the single argument (full checks in T021), `JSON.parse(readFileSync(path, "utf8"))`, `loadConfig()` (`src/config.ts`), `createDb(config.databaseUrl, { caCert: config.databaseCaCert })`, `createCache(config)` (as `devScripts/reconcile.ts`); `parsePollData(json, config)`; `populatePoll`; in `finally` close the cache and `closeDb(db)`; exit 0 on success; no migration (R2)

**Checkpoint**: US1 is the MVP: the fixture produces a correct, current poll.

---

## Phase 4: User Story 2 — Rerun to refresh the same poll (Priority: P2)

**Goal**: A second run keeps the poll's id, replaces the simulated votes, brings the poll back in line with the file and reopens it.

**Independent Test**: Run `populatePoll` twice; one poll with the same id, simulated `votes` rows equal to the voters of the second run, no duplicated history, a real vote untouched.

### Tests for User Story 2

- [X] T012 [US2] Add a `describe("populatePoll — rerun")` block to `tests/populate-poll.test.ts` (same context and creator setup as T007): run twice (second with `now` one day later): one poll, same id, `outcome` `refreshed`, `votesDeleted` > 0, `vote_history` rows for simulated voters equal the second run's `votesWritten`, `start_at` = `launched_at` = the new first moved date, `created_at` unchanged; insert a real vote (`votes`, `vote_history`, `user_polls` for `real@example.com` on `Approve`) between runs and assert all three rows survive the rerun; change the fixture's `choice_b` label to `Against` before the second run and assert `Approve` keeps its id, `Against` has a new id, `Disapprove` is gone, and no `votes` row names its old id; set the poll `CLOSED` (and in another case `EDITING` with an edit-session client id) between runs and assert it is `OPEN` with edit-session fields null and a `Warning:` line logged; with two polls of that creator and title, assert the newer one is used and a warning names the count. Run and confirm it fails

### Implementation for User Story 2

- [X] T013 [US2] In `populatePoll` (`devScripts/populate/populate-poll.ts`), when a poll matched: delete from `votes`, `vote_history` and `user_polls` (`relation = 'voted'`) the rows with that `poll_id` and `` sql`email like ${"test\\_%@" + SIMULATED_DOMAIN} escape '\\'` ``; take `votesDeleted` from the `votes` delete; log `[populate] Removed <n> earlier test vote(s)`; when several polls matched, log the warning of C3 naming the count and the chosen id (R6, C3)
- [X] T014 [US2] Add `matchChoices(existing, labels)` to `devScripts/populate/populate-poll.ts`: reuse the id of an existing choice with exactly the same label, else `randomUUID()`, positions in key order; return `{ choices, droppedIds }`; delete `votes` rows of the poll whose `choice_ids` overlap `droppedIds` (`` sql`choice_ids && ${droppedIds}::text[]` ``) when any were dropped (R5)
- [X] T015 [US2] Refresh the matched poll: `updatePoll({ db, cache }, pid, { title, subtitle: "", keywords: "", choiceMode: "Single-Choice Poll", voteMutability: "Dynamic-Vote Poll", pollVisibility: "Public Poll", pollSharingMode: "Anyone With The Link", voteAnonymity: "Yes", voterCountLimit: null, endAt: null, startAt, choices, pollState: "OPEN", pollStateBeforeEditUpdate: null, pollEditUpdateHeartbeatTimestamp: null, pollEditUpdateClientGUID: null })` (`src/polls/store.ts`); then `update polls set launched_at = start_at where id = pid`, re-read the row with `findPollRow` and `refreshProjection(cache, row)` (`src/polls/versions.ts`); log `[populate] Warning: poll <pid> was <state>; it is OPEN again` when the state before was not `OPEN`. Order: T013 deletes, T014 choice match, this refresh, then the vote loop. Make T012 pass (R4)

**Checkpoint**: US1 and US2 both pass; rerunning is safe.

---

## Phase 5: User Story 3 — Clear errors, progress and summary (Priority: P3)

**Goal**: Every bad input stops before any write with one line and exit code 1; a good run's output follows C3.

**Independent Test**: Each C4 case yields one `[populate] Error:` line, exit code 1 and an unchanged database.

### Tests for User Story 3

- [X] T016 [US3] Add unit tests to `tests/populate-poll.test.ts` asserting `parsePollData` throws `InputError` (with a message naming the key, value or index per C4) for: missing or empty `poll creator email`; missing or empty `title`; a 51-character title; an empty label, a 101-character label, two equal labels; fewer than `minChoices` and more than `maxChoices` choices; `vote_count` of 0, 2.5, `"100"` and missing; missing and empty `data_points`; dates `"2026-10-01"`, `"02/30/25"`; two data points on the same date; a data point key `choice_d` not among the choices; a percentage `"40"` and `-1`; a data point whose percentages add up to 0
- [X] T017 [US3] Add integration tests to `tests/populate-poll.test.ts`: `populatePoll` with an unknown creator email rejects with `InputError` and leaves `polls`, `votes` and `vote_history` empty; the first logged line of a valid run is the target line and names only the database host (no user name or password from the URL); the log has one progress line per data point and the summary lines of C3 in order
- [X] T018 [US3] Add tests to `tests/populate-poll.test.ts` for `readArguments(argv)` (new export, C5 amended in T022): `[]` and `["a.json", "b.json"]` throw `InputError` carrying the usage line; `["a.json"]` returns `"a.json"`. Run T016–T018 and confirm the new cases fail

### Implementation for User Story 3

- [X] T019 [US3] Export `readArguments(argv: string[]): string` from `devScripts/populate/populate-poll.ts`: exactly one argument, else `InputError("Usage: npx tsx devScripts/populate/populate-poll.ts <poll-data.json>")`
- [X] T020 [US3] Add every C4 check to `parsePollData` in `devScripts/populate/populate-poll.ts`, using `TITLE_MAX` and `CHOICE_LABEL_MAX` from `src/polls/service.ts` and `bounds.minChoices` / `bounds.maxChoices`; a date must match `^\d{2}/\d{2}/\d{2}$` and round-trip through `new Date` (R9, R10, UA12)
- [X] T021 [US3] Wrap `main()` in `devScripts/populate/populate-poll.ts`: `readArguments(process.argv.slice(2))`; a read or `JSON.parse` failure becomes `InputError` naming the path and reason; an `InputError` prints `[populate] Error: <message>` and sets `process.exitCode = 1`; any other error prints `[populate] failed: <message>` and sets `process.exitCode = 1`; the connections are closed on every path. Make T016–T018 pass

**Checkpoint**: All stories pass; `npx vitest run tests/populate-poll.test.ts` is green.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T022 [P] Amend `specs/20261026-152737-POPULATE-TEST-POLL/contracts/cli.md` C5 with `readArguments(argv)` and `matchChoices(existing, labels)`, C3 so its example lists the lines in run order (target, several-match warning, Removed, was-CLOSED warning, progress lines, summary, notes), and C4 with a note that an unknown creator's error follows the target line (every other C4 error is raised before `populatePoll` runs, so it stays one line); amend `specs/20261026-152737-POPULATE-TEST-POLL/data-model.md` "Rows read and written" so the poll lookup reads "newest `created_at` first, ties by `id`", noting that the script backdates `created_at`
- [X] T023 [P] Add a "Populating one poll from a data file" section to `devScripts/populate/README.md`: the command, the JSON shape (the data-model.md input table), what a rerun does, the target warning (any `ENV_DATABASE_URL` is written to), the restart note without `ENV_VALKEY_URL`, and that the database must already be migrated
- [X] T024 Run `npx tsc --noEmit` (covers `src/` only), then type-check the script on its own with `npx tsc --noEmit --module nodenext --moduleResolution nodenext --target es2022 --strict --skipLibCheck devScripts/populate/populate-poll.ts` (`tsconfig.json` is unchanged), then `npm test`; all three must pass with no new failures
- [ ] T025 Validate with `specs/20261026-152737-POPULATE-TEST-POLL/quickstart.md` §2–§4 against the development database using `polldata/trump_approval_rating_over_time.json`; record the run's elapsed time and final percentages, and compare the percentages with the latest data point scaled to 100 (Approve 33.3%, Disapprove 66.7%): the step fails if either is more than 3 points off (SC-003)
- [X] T026 Regenerate `README.md` and `ARCHITECTURE.md` (Constitution, Documentation Deliverables): the populate-poll developer script under the development tools (what it does, how to run it, that it reuses the app's poll, vote and counter paths)
- [X] T027 (TWEAK01) Replace the random voter pool (`POOL_FACTOR`, `pickVoters`) with sequential voters `test_1..test_<count>` per data point in `devScripts/populate/populate-poll.ts`, so the Dynamic-Vote upsert keeps the poll's voter count at about one data point's votes; in `tests/populate-poll.test.ts` drop the `pickVoters` tests and assert each day's `vote_history` voter numbers are exactly `1..count`; amend spec FR-013/FR-014, plan, data-model, contracts C5, research R1/R9, quickstart §3 and `devScripts/populate/README.md`
- [X] T028 (TWEAK03) Raise `BATCH` in `devScripts/populate/populate-poll.ts` from 1,000 to 5,000 (5 parameters per row keeps a slice well under PostgreSQL's 65,535-parameter statement limit); amend the plan's constraints and flow and research R7; `seed-polls.ts` keeps its own `BATCH = 1000`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none; T002 and T003 can run alongside T001.
- **Foundational (Phase 2)**: needs T002 (fixture) and T003 (file); blocks every story.
- **US1 (Phase 3)**: needs Phase 2.
- **US2 (Phase 4)**: needs US1 (`populatePoll` exists); it adds the matched-poll branch.
- **US3 (Phase 5)**: needs Phase 2 for the parser checks and US1 for `main()` and the run's output; independent of US2.
- **Polish (Phase 6)**: after the stories wanted.

### Within Each Story

Tests first and failing; then the implementation tasks in order (they share one file).

### Parallel Opportunities

- T002 and T003 (different files) alongside T001.
- US2 and US3 can be developed in parallel by two people after US1, since US3 only touches `parsePollData`, `readArguments` and `main()`; merge `tests/populate-poll.test.ts` carefully (separate `describe` blocks).
- T022 and T023 in parallel with each other.

## Parallel Example: Setup

```text
Task: "T002 Create tests/fixtures/populate-poll.json"
Task: "T003 Create devScripts/populate/populate-poll.ts skeleton"
```

## Parallel Example: after US1

```text
Developer A: T012 → T013 → T014 → T015   (US2, rerun)
Developer B: T016 → T017 → T018 → T019 → T020 → T021   (US3, errors and output)
```

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 → Phase 2 → Phase 3.
2. Stop and validate: T007 green; quickstart §2 on the development database.

### Incremental Delivery

1. US1: a poll can be created and populated.
2. US2: reruns refresh it safely.
3. US3: bad input is refused cleanly with one line.
4. Polish: contract, README, full suite, quickstart, documentation deliverables.
