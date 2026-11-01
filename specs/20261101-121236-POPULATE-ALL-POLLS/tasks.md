---
description: "Task list for Populate All Polls"
---

# Tasks: Populate All Polls

**Input**: Design documents from `specs/20261101-121236-POPULATE-ALL-POLLS/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R11), data-model.md, contracts/cli.md (C1–C5), quickstart.md

**Tests**: included. The plan's R11 and the constitution (IV. Goal-Driven Execution) require each FR to be
proved by a test; tests are written before the code they prove and must fail first.

**Organization**: one phase per user story (US1 single-file command, US2 folder command, US3 failures).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1, US2, US3 from spec.md

## Path Conventions

Single project: developer scripts in `devScripts/populate/`, tests in `tests/` at the repository root.

---

## Phase 1: Setup

**Purpose**: register both commands and keep the new script in version control.

- [X] T001 Add `"populate-poll": "tsx devScripts/populate/populate-poll.ts"` and `"populate-all-polls": "tsx devScripts/populate/populate-all-polls.ts"` to `scripts` in `package.json`, after `"reconcile"` (R1)
- [X] T002 [P] Add `!devScripts/populate/populate-all-polls.ts` after `!devScripts/populate/populate-poll.ts` in `.gitignore` (R8)

---

## Phase 2: Foundational

None. US1 changes only `populate-poll.ts`; US2 depends on that script's existing `[populate] Done:` and
`Votes written:` lines, which do not change.

---

## Phase 3: User Story 1 - Populate one poll with a short command (Priority: P1) 🎯 MVP

**Goal**: `npm run populate-poll <file>` works from any folder, with or without `.json` (C1).

**Independent Test**: from the project root, `npm run populate-poll polldata/trump_approval_rating_over_time`
creates or refreshes the poll; from `polldata/`, `npm run populate-poll trump_approval_rating_over_time.json`
does the same; no argument prints the npm usage line and exits 1.

### Tests for User Story 1

- [X] T003 [US1] In `tests/populate-poll.test.ts`, add a `describe("resolveDataPath")` with a fake `exists`: a relative path resolves against the given base folder; an existing path is returned as is; an extensionless path that does not exist but whose `.json` does resolves to `<path>.json`; a path with an extension never gets `.json` added; a path where neither exists resolves to the path as typed (R2). Update the existing `readArguments` test to expect the message `Usage: npm run populate-poll <poll-data.json>` (R3). Run it and confirm the new tests fail

### Implementation for User Story 1

- [X] T004 [US1] In `devScripts/populate/populate-poll.ts`, export `resolveDataPath(arg: string, baseDir: string, exists: (file: string) => boolean): string` per R2 (import `path` from `node:path`); change the `readArguments` usage message to `Usage: npm run populate-poll <poll-data.json>`; in `main()`, read `resolveDataPath(readArguments(process.argv.slice(2)), process.env.INIT_CWD ?? process.cwd(), existsSync)` (import `existsSync` beside `readFileSync`). Change nothing else in the file. T003 passes

**Checkpoint**: US1 works on its own; `npx tsx devScripts/populate/populate-poll.ts <file>` from the root behaves as before (SC-006).

---

## Phase 4: User Story 2 - Populate every new data file in a folder (Priority: P2)

**Goal**: `npm run populate-all-polls [<directory>]` populates every unrecorded or changed `.json` file and
records each success (C2, C3, C5; data-model.md).

**Independent Test**: on a folder of two valid files and no history, both are populated and recorded; a second
run skips both and writes nothing.

### Tests for User Story 2

- [X] T005 [P] [US2] Create `tests/populate-all-polls.test.ts` with unit tests for the pure helpers: `databaseIdentity` strips the password and keeps user, host, port, database and query (`postgres://u:secret@h:5432/db?sslmode=require` → `postgres://u@h:5432/db?sslmode=require`), and leaves a password-free URL unchanged (R7); `readPopulateResult` on exit 0 with both summary lines returns `{ ok: true, pollId, outcome, votesWritten }` with grouping commas removed (`1,234` → 1234), for both `created` and `refreshed`, and also when the lines end in `\r\n` (R5); `listDataFiles` on a temporary folder holding `b.json`, `A.JSON`, `a.har`, `notes.yaml` and a subfolder `sub/` with `c.json` returns `["A.JSON", "b.json"]` (R9); `readHistory` returns `{ entries: [] }` for a missing file and `writeHistory` then `readHistory` round-trips, leaving no `.tmp` file (R8). Confirm they fail
- [X] T006 [US2] In `tests/populate-all-polls.test.ts`, add `describe("populateAllPolls")` tests using temporary folders, a temporary history path, a fake `runPopulate` that records the files it was given and returns a successful child result, and captured `log`/`logError`: first run on `a.json`, `b.json`, `a.har` populates `a.json` then `b.json` (absolute paths, name order), writes one entry each with `database` (password-free), `file`, `sha256`, `pollId`, `outcome`, `votesWritten`, ISO `populatedAt`, prints `[populate-all] Target: <identity>` first and ends `[populate-all] Done: 2 populated, 0 skipped, 0 failed`, returns exit code 0, and — read by the fake runner when it is called for `b.json` — the history file already holds `a.json`'s entry (FR-014, SC-005); a second run calls the runner zero times, logs `[populate-all] Skipped a.json (populated <populatedAt>)` for each and ends `Done: 0 populated, 2 skipped, 0 failed`; after editing `b.json`, only `b.json` runs and its entry is replaced (still one entry for it); a different `ENV_DATABASE_URL` populates both again and adds entries; with no argument the folder is `<projectRoot>/polldata`; a relative argument resolves against `env.INIT_CWD`; a folder with no `.json` file logs `[populate-all] No .json files in <dir>` and returns 0 (C2, C3, C5, FR-017)
- [X] T007 [US2] In `tests/populate-all-polls.test.ts`, add one end-to-end test that uses `startTestContext`, inserts the fixture's creator account exactly as `insertCreator` in `tests/populate-poll.test.ts` does (a `user` row `creator-1`, `Creator One`, `creator@example.com`, `emailVerified: true`), copies `tests/fixtures/populate-poll.json` into a temporary folder, and calls `populateAllPolls` with the real child runner and an `env` holding `ENV_DATABASE_URL` (the suite's database), `ENV_BETTER_AUTH_SECRET` and `ENV_PUBLIC_ORIGIN`; it expects exit code 0, one poll row with the fixture's title, and a history entry whose `pollId` is that poll's id and whose `outcome` is `created` (R4, R11). Give it a generous timeout (the child starts `tsx`)

### Implementation for User Story 2

- [X] T008 [US2] Create `devScripts/populate/populate-all-polls.ts` with a one-line header comment in the style of `populate-poll.ts` (pointing to `devScripts/populate/README.md`), and the exported helpers: `databaseIdentity(url)` (R7); `readPopulateResult(exitCode, signal, stdout, stderr)` (R5, success branch and both failure branches; each summary-line pattern ends in `\r?$`, so a CRLF line still matches); `listDataFiles(dir)` (R9); `readHistory(path)` / `writeHistory(path, history)` with temp-file-and-rename (R8); `sha256Of(file)` (R6); constants `POPULATE_POLL_SCRIPT` and `HISTORY_FILE` resolved from `import.meta.url`, and `PROJECT_ROOT` two folders up. T005 passes
- [X] T009 [US2] In `devScripts/populate/populate-all-polls.ts`, add `runPopulateChild(file)`: `spawn(process.execPath, ["--import", "tsx", POPULATE_POLL_SCRIPT, file], { stdio: ["inherit", "pipe", "pipe"] })`, no shell, writing each stdout/stderr chunk to `process.stdout`/`process.stderr` as it arrives and keeping copies, resolving `{ exitCode, signal, stdout, stderr }` on `close` (R4)
- [X] T010 [US2] In `devScripts/populate/populate-all-polls.ts`, add the exported `populateAllPolls({ argv, env, historyPath, projectRoot, runPopulate, log, logError }): Promise<number>` per C2/R10: check arguments, then `env.ENV_DATABASE_URL`, then the directory (given → `path.resolve(env.INIT_CWD ?? process.cwd(), arg)`, else `<projectRoot>/polldata`), then the history, in that order, returning 1 when one fails (the exact C2 wording of each line is T013's); log the target line; for each listed file compute `sha256Of`, skip when (`database`, `file`, `sha256`) is recorded, else log `<file>: populating`, `await runPopulate(absolutePath)`, read it with `readPopulateResult`, and on success replace the (`database`, `file`) entry and `writeHistory` at once; end with the `Done:` line and return the exit code. Add `main()` wiring the real values and `process.exitCode`, run only when the file is the entry point (as in `populate-poll.ts`). T006 and T007 pass

**Checkpoint**: US1 and US2 both work; a second folder run writes nothing to the database.

---

## Phase 5: User Story 3 - Failures are reported and never recorded (Priority: P3)

**Goal**: a failing file is logged, not recorded, listed again at the end, and makes the exit code 1; argument,
environment, directory and history errors stop the run before any file (C2, C4).

**Independent Test**: a folder with one valid and one invalid file populates and records the valid one, lists the
invalid one under `Failed files:` with its message, and exits 1.

### Tests for User Story 3

- [X] T011 [US3] In `tests/populate-all-polls.test.ts`, add `readPopulateResult` failure tests: exit 0 without the `Done:` line, and without the `Votes written:` line → `populated, but its summary could not be read`; exit 1 with stderr ending `[populate] Error: no user with the email x@example.com` → `no user with the email x@example.com`; exit 1 with `[populate] failed: boom` → `boom`; exit 3 with no such line → `exited with code 3`; signal `SIGTERM` → `stopped by SIGTERM` (C4)
- [X] T012 [US3] In `tests/populate-all-polls.test.ts`, add `populateAllPolls` failure tests with the fake runner: `a.json` succeeds and `b.json` fails → `[populate-all] Error: b.json: <message>` on `logError`, only `a.json` recorded, `Done: 1 populated, 0 skipped, 1 failed`, then `[populate-all] Failed files:` and `[populate-all]   b.json: <message>`, exit code 1; a following run with `b.json` now succeeding populates only `b.json`; a successful child whose summary cannot be read is counted as failed and not recorded; and each pre-check returns 1 with its one line and calls the runner zero times: two arguments (usage line), no `ENV_DATABASE_URL` or a non-PostgreSQL one, a missing directory given, a missing default `polldata`, a history file holding `not json`, a history file holding `{}` (C2). Confirm the new tests fail where behaviour is missing

### Implementation for User Story 3

- [X] T013 [US3] In `devScripts/populate/populate-all-polls.ts`, complete the failure paths in `populateAllPolls`: give each pre-check that T010 runs its exact C2 line on `logError` (T010 already returns 1); per-file failures logged as `[populate-all] Error: <file>: <message>`, collected, not recorded, and the run continuing; after the `Done:` line, when any failed, `[populate-all] Failed files:` and one `[populate-all]   <file>: <message>` line each, returning 1. T011 and T012 pass

**Checkpoint**: all three stories work independently.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T014 [P] Update `devScripts/populate/README.md`: show `npm run populate-poll <file>` (the `.json` may be left off; paths are relative to the folder the command is typed in) beside the existing `npx tsx` examples; add a section for `npm run populate-all-polls [<directory>]` covering the default `polldata`, which files are taken, skipping by database, file name and contents, the history file `devScripts/populate/populate-all-polls-history.json` and its fields (no password), failures and the exit code, and how to populate a recorded file again (remove its entry or the file, or use `npm run populate-poll`) (FR-022)
- [X] T015 [P] Add `npm run populate-poll <file>` and `npm run populate-all-polls [<dir>]` to the Commands block in `CLAUDE.md`, beside `npm run reconcile`
- [ ] T016 Run `npx tsc --noEmit` and `npx vitest run tests/populate-poll.test.ts tests/populate-all-polls.test.ts`; both pass
- [ ] T017 Walk through `specs/20261101-121236-POPULATE-ALL-POLLS/quickstart.md` sections 2–4 against a local development database and confirm every expected result

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001–T002)**: none; T001 is needed before any `npm run` check (T017).
- **US1 (T003–T004)**: after Setup.
- **US2 (T005–T010)**: after Setup; independent of US1's code (the child is invoked with an absolute path),
  though T007 runs the real `populate-poll.ts` and so is best run after T004.
- **US3 (T011–T013)**: after T010 (it extends `populateAllPolls`).
- **Polish (T014–T017)**: after the stories it documents or checks.

### Within Each User Story

- Tests first, failing; then implementation until they pass.
- T008 → T009 → T010 → T013 edit the same file in order.

### Parallel Opportunities

- T002 beside T001.
- T003 (US1 tests) and T005 (US2 helper tests) touch different files and can be written together.
- T014 and T015 together.

---

## Parallel Example: User Story 2

```text
Task: "T005 Unit tests for databaseIdentity, readPopulateResult, listDataFiles, readHistory/writeHistory in tests/populate-all-polls.test.ts"
Task: "T003 resolveDataPath tests in tests/populate-poll.test.ts"   # US1, different file
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001–T002, then T003–T004.
2. Validate: quickstart section 2. Stop here if only the short command is wanted.

### Incremental Delivery

1. US1 → the short single-file command.
2. US2 → the folder command with history (quickstart section 3).
3. US3 → failure reporting and pre-checks (quickstart section 4).
4. Polish → README, CLAUDE.md commands, full test and quickstart pass.

---

## Notes

- `populate-poll.ts` changes only in T004; its population logic and log lines must stay as they are, because
  `readPopulateResult` parses them.
- No comment may explain the code or cite tasks or requirements (Constitution VI).
- Commit after each phase.
