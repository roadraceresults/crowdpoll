---

description: "Task list for Branch Migration Merge"
---

# Tasks: Branch Migration Merge

**Input**: Design documents from `specs/20261029-150703-BRANCH-MIGRATION-MERGE/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R10), data-model.md, contracts/cli.md (C1–C6), quickstart.md

**Tests**: Requested by the spec (FR-025), so each story has test tasks, written before the code they cover.

**Organization**: Tasks are grouped by user story, so each story can be built and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: make the new files tracked and runnable

- [X] T001 Add `!devScripts/fix-migrations.ts` and `!devScripts/MIGRATIONS-HOWTO.md` after the existing `!devScripts/…` lines in `.gitignore`
- [X] T002 [P] Add `"fix-migrations": "tsx devScripts/fix-migrations.ts"` to `scripts` in `package.json`, after `"reconcile"`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the pure planner that every repair depends on (data-model.md, research.md R3–R6)

- [X] T003 Create `devScripts/fix-migrations.ts` with one header comment line naming `devScripts/MIGRATIONS-HOWTO.md` as its usage document (as `devScripts/populate/populate-poll.ts` has), and the in-memory types of data-model.md: `MigrationRecord { name; timestamp }`, `ForeignMigration { name; file; folders }`, `Action` (`rename {from,to}` | `rollback {name,file}` | `apply {name,timestamp}`), `Problem { name; reason }`, `Plan { actions; problems }`
- [X] T004 In `devScripts/fix-migrations.ts`, export `planRepair(recordsInTimeOrder: MigrationRecord[], folderNames: string[], findForeign: (name) => ForeignMigration | Problem): Plan` implementing R3 exactly: duplicate record → problem `duplicate record`; unknown record → suffix after a leading `/^\d{3}-/` (else the whole name); exactly one unrecorded folder migration with that suffix → `rename`; none → `findForeign` result → `rollback` or its problem; more than one → problem `<n> folder migrations end in -<suffix>`; then, against the records left after renames and rollbacks, each unrecorded folder migration whose name sorts before the greatest recorded name → `apply` with the `timestamp` of the earliest-applied (time order) record whose name sorts after it (R5). Order the actions: renames, rollbacks newest record first, applies in name order (R4). Pure: no I/O
- [X] T005 In `devScripts/fix-migrations.ts`, export `findForeignIn(siblingsRoot: string, ownFolder: string): (name) => Promise<ForeignMigration | Problem>` (R6): look for `<siblingsRoot>/<each directory except ownFolder>/src/db/migrations/<name>.ts`; none → problem `no folder beside this one has <name>.ts`; copies whose bytes differ → problem `the folders beside this one disagree on <name>.ts` naming the folders; otherwise load the first file with `import(pathToFileURL(file).href)` and, when it exports no `down` function, return problem `<name>.ts has no down()`, so a dry run reports it; otherwise a `ForeignMigration` with the first file and every folder holding it. `main` (T012) resolves it for every recorded name not in the folder before calling the synchronous `planRepair`, passing `name => resolved.get(name)`
- [X] T006 [P] Create `tests/fix-migrations.test.ts` with a `describe("planRepair")` block covering, with no database: an already-consistent record → no actions, no problems; F2 (`013-x` recorded, folder has `014-x`) → one `rename`; F1 (record not in folder, `findForeign` returns a file) → one `rollback`; F1 with `findForeign` returning a problem → that problem; F3 (folder `013-a` unrecorded, records end `014-b`) → one `apply` with `014-b`'s timestamp; F2 then F3 together (records `…012, 013-b`; folder `…012, 013-a, 014-b`) → `rename 013-b → 014-b` then `apply 013-a` at `013-b`'s original timestamp; duplicate record name → problem; suffix matching two folder migrations → problem; two rollbacks ordered newest first; a folder migration named after every record → no action (left for the server)
- [X] T007 In `tests/fix-migrations.test.ts`, add a `describe("findForeignIn")` block using fixture folders under `tests/fixtures/fix-migrations/` (create `siblingA/src/db/migrations/013-fixture-foreign.ts` and an identical copy in `siblingB`, and `siblingC/src/db/migrations/013-fixture-disagree.ts` differing from a `siblingA` copy of the same name; and `siblingA/src/db/migrations/013-fixture-no-down.ts` exporting only `up`; each other fixture's `up` creates and `down` drops a table named after the file, using `sql` from `kysely`): found → `ForeignMigration` naming both identical folders; disagreeing copies → problem; missing → problem; no `down` → problem `013-fixture-no-down.ts has no down()`; the own folder is skipped

**Checkpoint**: `npx vitest run tests/fix-migrations.test.ts -t "planRepair|findForeignIn"` passes

---

## Phase 3: User Story 1 - A developer gets the server starting again after a migration mismatch (Priority: P1) 🎯 MVP

**Goal**: `npm run fix-migrations [-- --apply]` prints the plan and, with `--apply`, repairs F1, F2 and F3 in one transaction, after which the server's start-up check passes (FR-004–FR-017)

**Independent Test**: on a fresh database migrated with the real migrations, build each of F1, F2 and F3, run the repair with `apply`, and `migrateToLatest` then succeeds; a dry run leaves the record and schema unchanged

### Tests for User Story 1

- [X] T008 [US1] In `tests/fix-migrations.test.ts`, add a `freshDatabase(name)` helper copied from `tests/server-boot.test.ts` (create via `inject("pgAdminUrl")`, drop `with (force)`), and a `describe("applyRepair")` block whose cases each create a fresh database, run `migrateToLatest`, then: **F1** — insert a `kysely_migration` row `013-fixture-foreign` and create its table as its `up` would; resolve `findForeignIn("tests/fixtures/fix-migrations", "none")` for each recorded name not in the folder first, as `main` does (T005), then call `planRepair` with a lookup into those results; apply; the table and row are gone and `migrateToLatest` resolves. **F2** — temporarily add a throw-away folder migration `013-fixture-renamed` to `migrations` (restore in `finally`, as the `005-broken` test does), migrate, rename its row to `099-fixture-renamed` (the same suffix under a number the folder does not have); plan and apply; the row is `013-fixture-renamed`, no schema change ran, `migrateToLatest` resolves. **F3** — migrate with a throw-away `014-fixture-late` registered, then register `013-fixture-early` (no row); plan and apply; its `up` ran, its row has `014-fixture-late`'s timestamp, and `migrateToLatest` resolves with nothing applied
- [X] T009 [US1] In `tests/fix-migrations.test.ts`, add a `snapshot(db)` helper returning the `kysely_migration` rows (name and timestamp) and every `information_schema.columns` row (table, column, type, nullability, default) of the `public` schema, in a fixed order, for SC-003; then add `applyRepair` failure cases: an action whose `up` throws → the error names the action, and `snapshot` equals the one taken before the run; another connection holding `pg_advisory_lock(3853314791062309107)` → `applyRepair` rejects within ~10 s with an error the caller reports as `the database is being migrated by another process`, and `snapshot` is unchanged
- [X] T010 [US1] In `tests/fix-migrations.test.ts`, add `describe("main")` cases calling the exported `main(argv, env, log, siblingsRoot)` with captured output and `siblingsRoot` = `tests/fixtures/fix-migrations`: `ENV_DATABASE_URL` empty → C4 line, exit 1; host `db.example.com` → host-refusal line naming only the host, exit 1, no connection attempted; unknown argument `--force` → usage line, exit 1; consistent database → header lines then `[migrations] Nothing to fix`, exit 0; an F1 database without `--apply` → plan lines, `Stop the servers…`, `Dry run: nothing written…`, exit 0, `snapshot` (T009) unchanged; every refused or problem run also leaves `snapshot` unchanged; with `--apply` → `Done: 1 change(s) applied`, exit 0; a plan with a problem → `[migrations] Problem: …` then `[migrations] Error: 1 problem(s); nothing written`, exit 1; no line ever contains the URL's password

### Implementation for User Story 1

- [X] T011 [US1] In `devScripts/fix-migrations.ts`, export `applyRepair(db: Db, plan: Plan, folderMigrations: Record<string, Migration>): Promise<number>` (R2, R4, R5): in one `db.transaction()`, run `select set_config('lock_timeout', '10000', true)` then `select pg_advisory_xact_lock(3853314791062309107)` (a `55P03` error becomes `the database is being migrated by another process`); for each action in order — `rename`: update `kysely_migration.name`; `rollback`: `import(pathToFileURL(file).href)`, call its `down(trx)`, delete the row; `apply`: `folderMigrations[name].up(trx)`, insert `{ name, timestamp }`; then re-read the rows, sort them as Kysely does (by date of `timestamp`, equal strings by `name.localeCompare`), and throw unless every row is in `folderMigrations` and the rows are the first N of its sorted names; return the number of actions. Any error rolls the whole transaction back and is rethrown naming the action or the check
- [X] T012 [US1] In `devScripts/fix-migrations.ts`, export `main(argv = process.argv.slice(2), env = process.env, log = console.log, siblingsRoot = <the parent of the repository root>): Promise<number>` per contracts/cli.md C1–C4: accept only `--apply`; parse `env.ENV_DATABASE_URL` with `new URL`; refuse unless `hostname` is `localhost`, `127.0.0.1` or `[::1]`, before connecting; `createDb` from `src/db/client.ts`; read `kysely_migration` (time order as in T011); folder = `migrations` from `src/db/migrations/index.ts`; the default `siblingsRoot` is the parent of the repository root, `dirname(dirname(dirname(scriptFile)))` (the repository root is two levels above the script), and the own folder is the repository folder's name; print the header lines, each action line, the `Stop the servers…` line, then the closing line; on problems print each `[migrations] Problem:` line and the error line; always `closeDb`; return the exit status. Run `main()` and set `process.exitCode` only when the file is the entry point (`import.meta.url === pathToFileURL(process.argv[1]).href`, as `populate-poll.ts` does)
- [X] T013 [US1] Run `npx vitest run tests/fix-migrations.test.ts`, `npx tsc --noEmit`, and `npx tsc --noEmit --module nodenext --moduleResolution nodenext --target es2023 --lib es2023 --strict --noUncheckedIndexedAccess --esModuleInterop --skipLibCheck --resolveJsonModule --types node devScripts/fix-migrations.ts` (the root `tsconfig.json` checks only `src/`, so this is the script's type check); fix until all pass

**Checkpoint**: US1 works on its own: quickstart §2 repairs today's `app01` (F1, `013-line-graph-enabled`)

---

## Phase 4: User Story 2 - A developer follows a written procedure for migrations on branches (Priority: P2)

**Goal**: one document covering the start-up messages, adding a migration on a branch, merging, recovering and the cost of a rollback (FR-019–FR-020); its README link (FR-018) is T015, in Phase 6, because the constitution has README.md updated only after implementation

**Independent Test**: following only `devScripts/MIGRATIONS-HOWTO.md` "Recovering", a developer repairs quickstart §3's F2 case

- [X] T014 [P] [US2] Write `devScripts/MIGRATIONS-HOWTO.md` with the five sections of contracts/cli.md C6, in PowerShell for commands (`$env:ENV_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/app01"; npm run fix-migrations`), showing example plan output from C2, stating that a migration already on `main` is never renumbered or renamed, the cost of an F1 rollback, and that a branch folder created before the script existed merges `main` first (R10); no passwords other than the local default already in the templates

**Checkpoint**: US2 readable on its own; its commands match contracts/cli.md (the README link is added after implementation, T015 in Phase 6)

---

## Phase 5: User Story 3 - The server says what to do when it refuses to start (Priority: P3)

**Goal**: `Migration check failed:` plus a hint line instead of `Migration (unknown) failed` (FR-021–FR-024, R8, C5)

**Independent Test**: start-up against a database recording a migration the code does not have rejects with the new wording and the hint

- [X] T016 [US3] In `tests/server-boot.test.ts` `describe("start-up")`, add a test: fresh database, `migrateToLatest`, insert a `kysely_migration` row `099-not-in-code`; `migrateToLatest` rejects with a `MigrationError` whose message starts `Migration check failed: corrupted migrations: previously executed migration 099-not-in-code is missing` and contains `npm run fix-migrations`; the existing `005-broken` test still expects `005-broken.*simulated failure`
- [X] T017 [US3] In `src/db/migrator.ts` `migrateToLatest`, when no result has status `Error`, build the message as `Migration check failed: <message>`, appending `\nRun npm run fix-migrations in this folder; see devScripts/MIGRATIONS-HOWTO.md.` when the message starts with `corrupted migrations`; keep `Migration <name> failed: <message>` when a migration failed; run `npx vitest run tests/server-boot.test.ts`

**Checkpoint**: all three stories work independently

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T018 Run `npm test`, `npx tsc --noEmit` and `npx tsc --noEmit --module nodenext --moduleResolution nodenext --target es2023 --lib es2023 --strict --noUncheckedIndexedAccess --esModuleInterop --skipLibCheck --resolveJsonModule --types node devScripts/fix-migrations.ts` (the root `tsconfig.json` checks only `src/`); all pass
- [X] T015 In `README.md`'s `## Testing` section, after the populate-poll paragraph, add one paragraph: when the server refuses to start with `corrupted migrations`, run `npm run fix-migrations` (dry run) then `npm run fix-migrations -- --apply` from that folder; see `devScripts/MIGRATIONS-HOWTO.md` (after T018, per the constitution's Documentation Deliverables)
- [X] T019 Walk through `specs/20261029-150703-BRANCH-MIGRATION-MERGE/quickstart.md` §2–§5 on `app01` (stop the servers first; §2 rolls back `013-line-graph-enabled`, which `line-graph-toggle` re-applies on its next start; §5 repeats §3's F2 case following only `devScripts/MIGRATIONS-HOWTO.md`, in under 5 minutes, for SC-005)
- [X] T020 [P] Update `ARCHITECTURE.md` (constitution, Documentation Deliverables): one short paragraph where start-up migrations are described — Kysely's record check, the `Migration check failed` message, and `npm run fix-migrations` for development databases
- [X] T021 [P] Update `CLAUDE.md` outside the SPECKIT block only if needed: add `npm run fix-migrations` to the Commands list

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none
- **Foundational (Phase 2)**: after T001 (T003 creates a file `.gitignore` must already track)
- **US1 (Phase 3)**: after Phase 2
- **US2 (Phase 4)**: independent of code; its commands must match C1–C4, so best after US1's T012
- **US3 (Phase 5)**: independent of Phases 2–4 (only `src/db/migrator.ts` and `tests/server-boot.test.ts`); its hint names the script and the document by path
- **Polish (Phase 6)**: after all stories

### Within Each Story

- Tests first (T006–T010, T016), then the code that makes them pass (T004–T005, T011–T012, T017)
- T004 before T005's use in T012; T011 before T012

### Parallel Opportunities

- T001 and T002
- US3 (T016–T017) alongside US1 (different files)
- T014 alongside US1 implementation
- T020 and T021

---

## Parallel Example: User Story 1 and User Story 3

```text
Agent A: T008 → T009 → T010 → T011 → T012 → T013   (devScripts/fix-migrations.ts, tests/fix-migrations.test.ts)
Agent B: T016 → T017                               (tests/server-boot.test.ts, src/db/migrator.ts)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 → Phase 2 → Phase 3
2. **Stop and validate**: quickstart §2 repairs today's `app01`, and `main` starts again
3. That alone removes the current blocker

### Incremental Delivery

1. US1 → the repair works
2. US2 → the procedure is written down
3. US3 → the start-up message points at both
4. Polish → full suite, quickstart, ARCHITECTURE.md
