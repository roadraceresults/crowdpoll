# High Level Requirements

Requirements: `requirements/20261029-150703-branch-migration-merge/requirements.md`  
External Files: none  
Generated: 2026-10-29 3:07 PM  

It is becomming a problem when a branch is merged into the main branch  
when the branch had a new migration.  

Please create a document instructing what should be done to resolve the problem.  
Even better, implement a script that will fix it.  
The database always has the migration in the kysely_migrations table because the other branch was executed and tested before merging.  

## Additional Requirements and Research Requests

**Instructions To The Developer**  
Enter any additional requirements or research requests under the ## Additional Requirements and Research Requests heading above.  
When you Type or Say: "Next" in the CC CLI terminal, the additional requirements and research requests will be applied to the report.  
  
You may leave these instructions here. They will be ignored when "Next" is executed.  

✅ Applied 2026-10-29 4:07 PM: 1 requirement added to requirements.md (the server console output; finding UA9);  
no research request.  

## 1. Overview and Scope

Every branch is worked on in its own folder under `C:\crowdPoll\` (`main`, `line-graph-toggle`, `line-graph-m3`, `poll-line-graph`, `refresh-research`, `speckit-skills`).  
Every one of those folders starts its server against the **same** local database, `postgres://…@localhost:5432/app01` (each folder's git-ignored `devScripts/launch-dev.ps1`).  
So, as the requirements say, a branch's migration is already recorded in the database before the branch is merged: the branch folder applied it while it was being run and tested.  

At start-up the server runs `migrateToLatest` (`src/db/migrator.ts`), Kysely 0.29.6's `Migrator` with the default `allowUnorderedMigrations: false`.  
Kysely records each applied migration as a row in the table `kysely_migration` (singular) and checks those rows against the folder's `src/db/migrations/index.ts` before doing anything.  
Two of its checks stop the server ("Database migration failed; refusing to start"):  

- **Missing**: a row names a migration this folder does not have: `corrupted migrations: previously executed migration <name> is missing`.  
- **Out of order**: the applied migrations, in time order, are not the first ones of the folder's list in name order: `corrupted migrations: expected previously executed migration <a> to be at index <i> but <b> was found in its place`.  

The problem is live today: `app01` holds `013-line-graph-enabled` (applied 2026-10-29 17:37 UTC by the `line-graph-toggle` folder, not yet merged), and `main` has migrations only up to `012-line-graph-tally`, so `main`'s server cannot start against `app01` right now.  

This feature delivers a written procedure and a script that brings a development database back in line with the migrations of the folder that uses it.  

- **In scope**:  
  - a document: what to do before and after merging a branch that adds a migration, and how to recover;  
  - a developer script that detects and repairs the mismatches between `kysely_migration` and the folder's migrations;  
  - whatever stops the problem from coming back (NC1, NC2).  
- **Out of scope (assumed)**:  
  - the production database: it is only ever migrated by a deploy of `main`, so it never sees a branch's migration (AM1);  
  - the tests: each suite gets a fresh embedded PostgreSQL database, so they never see another folder's rows;  
  - changing any existing migration's content.  

### Current code this touches

| File | Today |
|---|---|
| `src/db/migrator.ts` | `new Migrator({ db, provider })` over the static `migrations` record; wraps a failure in `MigrationError` |
| `src/db/migrations/index.ts` | Hand-registered record `"NNN-name": module`, applied in key (name) order; "add a new migration by appending the next number" |
| `src/server.ts` | Runs `migrateToLatest` at start-up and exits on failure, printing only Kysely's message |
| `devScripts/launch-dev.ps1` (git-ignored, one per folder) | `ENV_DATABASE_URL = postgres://postgres:postgres@localhost:5432/app01` in every folder |
| `devScripts.example/launch-dev.ps1`, `launch.json.example` | `ENV_DATABASE_URL` left empty |
| `.gitignore` | `devScripts/*` ignored except named scripts |

## 2. Architecture Diagrams

### 2.1 Today: every folder shares one database

```mermaid
flowchart LR
  subgraph Folders["C:\crowdPoll\ (one clone per branch)"]
    M["main<br/>001 … 012"]
    T["line-graph-toggle<br/>001 … 013-line-graph-enabled"]
    S["speckit-skills<br/>001 … 011"]
    O["line-graph-m3, poll-line-graph,<br/>refresh-research<br/>001 … 012"]
  end
  subgraph PG["Local PostgreSQL"]
    A[("app01<br/>kysely_migration: 001 … 013")]
  end
  M -- "migrateToLatest at start" --> A
  T -- "migrateToLatest at start" --> A
  S -- "migrateToLatest at start" --> A
  O -- "migrateToLatest at start" --> A
  GH["GitHub main"] -- "deploy by hand" --> P[("Production database<br/>main's migrations only")]
```

### 2.2 Kysely's checks at start-up

```mermaid
flowchart TD
  start(["server start: migrateToLatest"]) --> read["read kysely_migration rows<br/>sorted by timestamp"]
  read --> list["list the folder's migrations<br/>sorted by name"]
  list --> miss{"every row names a migration<br/>the folder has?"}
  miss -- "no" --> e1["corrupted migrations:<br/>previously executed migration X is missing"]
  miss -- "yes" --> ord{"rows, in time order, are the first N<br/>of the folder's list, in name order?"}
  ord -- "no" --> e2["corrupted migrations:<br/>expected X at index i but Y was found"]
  ord -- "yes" --> run["apply the pending migrations in name order,<br/>one row each"]
  e1 --> stop(["server refuses to start"])
  e2 --> stop
  run --> ok(["server starts"])
```

### 2.3 How the three failures arise

```mermaid
sequenceDiagram
  autonumber
  participant B as Branch folder (adds 013-b)
  participant DB as app01.kysely_migration
  participant M as main folder
  participant C as Other branch (adds 013-a)

  Note over B,M: F1. Tested on the branch, not yet merged
  B->>DB: start: apply 013-b, insert row 013-b
  M->>DB: start: row 013-b not in main's list
  DB-->>M: "previously executed migration 013-b is missing"

  Note over B,C: F2. Renumbered at merge
  C->>M: merged first, main now has 013-a
  B->>M: merged second, its 013-b renumbered to 014-b
  M->>DB: start: row 013-b not in main's list
  DB-->>M: "previously executed migration 013-b is missing"

  Note over B,C: F3. Applied out of order
  M->>DB: rows end with 014-b (after F2's row is renamed)
  M->>DB: 013-a sorts before 014-b but has no row
  DB-->>M: "expected 014-b at index 12 but 013-a was found"
```

### 2.4 Proposed repair, per folder (UA1–UA3)

```mermaid
flowchart TD
  s(["fix-migrations (dry run unless --apply)"]) --> host{"ENV_DATABASE_URL host is local?"}
  host -- "no" --> refuse["[migrations] Error: refuses a remote database; exit 1"]
  host -- "yes" --> cmp["compare kysely_migration rows<br/>with this folder's index.ts"]
  cmp --> each{"each mismatch"}
  each -- "row's name unknown, same suffix<br/>under another number (F2)" --> ren["rename the row<br/>013-b → 014-b"]
  each -- "row's name unknown, no match<br/>in this folder (F1)" --> foreign{"file found in a<br/>sibling folder?"}
  foreign -- "yes" --> down["run its down(), delete the row"]
  foreign -- "no" --> stuck["report it; change nothing; exit 1"]
  each -- "pending migration sorts before<br/>an applied one (F3)" --> up["run its up(), insert its row<br/>timestamped in name order"]
  ren --> plan["print the plan"]
  down --> plan
  up --> plan
  plan --> apply{"--apply?"}
  apply -- "no" --> dry(["dry run: nothing written; exit 0"])
  apply -- "yes" --> tx(["one transaction; then the server starts cleanly"])
```

### 2.5 Proposed: one database per folder (NC1 Recommendation A, UA7)

```mermaid
flowchart LR
  subgraph PG["Local PostgreSQL"]
    A[("app01<br/>main's database")]
    T1[("app01_line_graph_toggle")]
    T2[("app01_line_graph_m3")]
  end
  M["main folder"] --> A
  T["line-graph-toggle folder"] --> T1
  L["line-graph-m3 folder"] --> T2
  A -. "CREATE DATABASE … TEMPLATE app01<br/>when a branch folder is set up" .-> T1
  A -. "same" .-> T2
```

## 3. Breaking Changes

- **None for the application or production.**  
  The script and the document touch only local development databases;  
  no route, setting, data or migration changes.  
- **The development set-up changes** if NC1 Recommendation A is accepted: each branch folder's git-ignored `launch-dev.ps1` and `.vscode/launch.json` point at their own database instead of `app01`.  
  Data entered in one branch folder is then no longer seen from another.  

## 4. Technical Debt

- **One shared development database for every branch folder** is the root cause;  
  Kysely has no option to ignore an executed migration it does not know.  
- **Migrations are not idempotent** (`alter table … add column` without `if not exists`), so a row removed by hand makes the next start fail with "column already exists".  
- **No `down()` is ever run** by the application; the `down()` functions are untested.  
- **`index.ts` is a hand-kept list**: two branches that each append a line conflict in git at merge, and the numbering is decided by whoever merges.  
- **Start-up prints Kysely's message only**, with no hint of what to do.  
- **The git-ignored launch files carry a commented production database URL**: one uncommented line points a branch folder's migrations at production.  

## 5. Assumptions

- The problem is in the local development databases only (AM1).  
- All branch folders run against the same PostgreSQL server on `localhost`.  
- A migration keeps the part of its name after the number (`-line-graph-enabled`) when it is renumbered at merge.  
- The script follows `devScripts/populate/populate-poll.ts`: a `tsx` script, the server's own `createDb`, no new dependency.  
- The document is written for the developer of this repository, on Windows 11 with PowerShell.  

## 6. Findings

### 6.1 Inconsistencies

None found.  

### 6.2 Ambiguities

**AM1. Which database has the problem?**  
<span style="font-size:large">✅ Resolved</span>  
✅ Requirements File Updated: 2026-10-29 4:07 PM  
**Notes**: Recommendation accepted in file 2026-10-29: Recommendation, the local development databases only;  
the script refuses any database not on `localhost`, and production is never touched;  
`requirements.md` "Resolved Decisions" records it, with the rule never to renumber a migration already on `main`.  

The requirements say "the database", and a merge into `main` could suggest the production database.  
Production is migrated only when `main` is deployed by hand, so it only ever sees `main`'s migrations, in order.  
The failures happen in the local `app01`, which every branch folder shares (diagram 2.1).  

  - **Recommendation**: **the local development databases only;  
    the script refuses any database that is not on `localhost` (UA3) and production is never touched.**  

    ➡️ [X] **Accepted**  
    - The document adds one rule for production: never renumber or rename a migration once it is on `main`, since production has already recorded its name.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

**AM2. The table is `kysely_migration`, not `kysely_migrations`.**  
<span style="font-size:large">✅ Resolved</span>  
✅ Requirements File Updated: 2026-10-29 4:07 PM  
**Notes**: Recommendation accepted in file 2026-10-29: Recommendation, record the table as `kysely_migration`;  
"Resolved Decisions" names the table, its columns and its ordering by `timestamp`.  

The requirements name `kysely_migrations`.  
Kysely's default table, which this app uses, is `kysely_migration` (`DEFAULT_MIGRATION_TABLE`), with columns `name` and `timestamp`;  
there is also a `kysely_migration_lock` table.  

  - **Recommendation**: **record the table as `kysely_migration` in the requirements.**  

    ➡️ [X] **Accepted**  
    - "Always has the migration" is then stated precisely: a row per applied migration, by name, which Kysely orders by `timestamp`.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

**AM3. When exactly does the server fail, given that the branch's migration is already recorded?**  
<span style="font-size:large">✅ Resolved</span>  
✅ Requirements File Updated: 2026-10-29 4:07 PM  
**Notes**: Recommendation accepted in file 2026-10-29: Recommendation, state the problem as the three failures F1, F2 and F3;  
"Resolved Decisions" lists each with its Kysely message, and notes that a merge keeping the name is harmless.  

The requirements place the failure at the merge into `main`, with the branch's migration already in `kysely_migration` from testing.  
A merge that keeps the migration's name is in fact harmless: `main` gains the file and the recorded row then matches it.  
The failures come from three other moments (diagram 2.3):  
F1, before the merge, when `main` (or any folder without the migration) starts against the database the branch migrated;  
F2, at the merge, when the migration is renumbered because `main` already has that number, so the recorded name no longer exists;  
F3, after the merge, when `main` holds a migration numbered before one already recorded.  

  - **Recommendation**: **state the problem as the three failures F1, F2 and F3, each with the Kysely message it produces.**  

    ➡️ [X] **Accepted**  
    - Each failure then has a testable fix (UA1, UA8).  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### 6.3 Unspecified Aspects

**UA1. What does the script do for each kind of mismatch?**  
<span style="font-size:large">✅ Resolved</span>  
✅ Requirements File Updated: 2026-10-29 4:07 PM  
**Notes**: Recommendation accepted in file 2026-10-29: Recommendation, one action per failure, shown as a plan first;  
"Resolved Decisions" lists the rename, roll-back and out-of-order actions.  

"A script that will fix it" does not say what fixing means for each failure.  

  - **Recommendation**: **one action per failure, shown as a plan first (diagram 2.4):**  

    ➡️ [X] **Accepted**  
    - **F2, renamed**: a row whose name is not in the folder, but whose suffix is (UA2), is renamed to the folder's name;  
      the schema is already right, so nothing else runs.  
    - **F1, foreign**: a row whose migration is not in the folder at all is rolled back with that migration's own `down()`, found in a sibling folder under `C:\crowdPoll\*\src\db\migrations\`, and its row deleted;  
      when no sibling has the file, the script reports it and changes nothing.  
    - **F3, out of order**: a migration of the folder with no row, named before an applied one, has its `up()` run and its row inserted with a timestamp that keeps time order equal to name order, since Kysely sorts the rows by timestamp.  
    - Anything else the script cannot classify is reported and nothing is written.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

**UA2. How does the script recognize a migration that was renumbered?**  
<span style="font-size:large">✅ Resolved</span>  
✅ Requirements File Updated: 2026-10-29 4:07 PM  
**Notes**: Recommendation accepted in file 2026-10-29: Recommendation, match by the part of the name after the number;  
recorded in "Resolved Decisions", with the ambiguous cases left unrenamed.  

The database stores only the name;  
there is no hash of the migration's content to compare.  

  - **Recommendation**: **by the part of the name after the number: `013-line-graph-enabled` matches `014-line-graph-enabled`.**  

    ➡️ [X] **Accepted**  
    - A suffix that matches more than one of the folder's migrations, or one that already has a row, is reported and not renamed.  
    - The document asks that a migration keep its suffix when renumbered.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

**UA3. What keeps the script from damaging a database?**  
<span style="font-size:large">✅ Resolved</span>  
✅ Requirements File Updated: 2026-10-29 4:07 PM  
**Notes**: Recommendation accepted in file 2026-10-29: Recommendation, local only, dry run by default, one transaction;  
recorded in "Resolved Decisions".  

The script rewrites the migration record and may run `up()` and `down()`.  
The git-ignored launch files in every folder carry a commented-out production database URL.  

  - **Recommendation**: **local only, dry run by default, one transaction.**  

    ➡️ [X] **Accepted**  
    - It refuses any host but `localhost`, `127.0.0.1` and `::1`, printing only the host.  
    - Without `--apply` it prints the plan and writes nothing.  
    - With `--apply` every change runs in one transaction under Kysely's own `kysely_migration_lock`, so a running server cannot migrate at the same moment;  
      any error rolls everything back.  
    - It asks that the servers using the database be stopped first, and says so in its plan.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

**UA4. What are the script's name, inputs and output?**  
<span style="font-size:large">✅ Resolved</span>  
✅ Requirements File Updated: 2026-10-29 4:07 PM  
**Notes**: Recommendation accepted in file 2026-10-29: Recommendation, `devScripts/fix-migrations.ts` run as `npm run fix-migrations [-- --apply]`;  
"Resolved Decisions" records its inputs, output lines, exit codes and the `.gitignore` and `package.json` lines.  

The requirements ask for a script without naming it or its interface.  

  - **Recommendation**: **`devScripts/fix-migrations.ts`, run as `npm run fix-migrations [-- --apply]` from the folder whose migrations are wanted.**  

    ➡️ [X] **Accepted**  
    - The database is `ENV_DATABASE_URL` (as `launch-dev.ps1` sets it), opened with the server's `createDb`;  
      the folder's migrations are its own `src/db/migrations/index.ts`.  
    - Each line starts `[migrations]`: the database host and name, each planned action, then `Done` or `Dry run: nothing written`;  
      an error is one `[migrations] Error:` line and exit 1;  
      a database already in line prints `Nothing to fix` and exits 0.  
    - `.gitignore` gains `!devScripts/fix-migrations.ts`;  
      `package.json` gains the `fix-migrations` script;  
      no new dependency.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

**UA5. Where does the document live, and what does it cover?**  
<span style="font-size:large">✅ Resolved</span>  
✅ Requirements File Updated: 2026-10-29 4:07 PM  
**Notes**: Recommendation accepted in file 2026-10-29: Recommendation, a new `devScripts/MIGRATIONS-HOWTO.md` linked from `README.md`;  
"Resolved Decisions" records its outline, without the per-folder database part, since NC1 chose Recommendation B.  

The requirements ask for "a document instructing what should be done" without a place or an outline.  

  - **Recommendation**: **a new `devScripts/MIGRATIONS-HOWTO.md` (with a `!` line in `.gitignore`), linked from `README.md`'s development section.**  

    ➡️ [X] **Accepted**  
    - It covers: why the server refuses to start (the two Kysely messages);  
      adding a migration on a branch (next free number, keep the suffix, register it in `index.ts`);  
      merging (renumber the second of two clashing migrations, never one already on `main`);  
      recovering (stop the servers, `npm run fix-migrations`, check the plan, `-- --apply`);  
      and setting up a branch folder's own database, if NC1 A is accepted.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

**UA6. Should the server say what to do when it refuses to start?**  
<span style="font-size:large">✅ Resolved</span>  
✅ Requirements File Updated: 2026-10-29 4:07 PM  
**Notes**: Recommendation accepted in file 2026-10-29: Recommendation, `migrateToLatest` adds a line naming `npm run fix-migrations` and the document;  
recorded in "Resolved Decisions".  

Today it prints "Database migration failed; refusing to start" and Kysely's `corrupted migrations` message, with no pointer to a fix.  

  - **Recommendation**: **when the message starts with `corrupted migrations`, `migrateToLatest` adds one line naming `npm run fix-migrations` and the document.**  

    ➡️ [X] **Accepted**  
    - The server still refuses to start;  
      the only server change is the wording of `MigrationError`.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

**UA7. How is a branch folder's own database created and named?** (applies if NC1 Recommendation A is accepted)  
<span style="font-size:large">✅ Resolved</span>  
✅ Requirements File Updated: 2026-10-29 4:07 PM  
**Notes**: Recommendation accepted in file 2026-10-29: Recommendation, `--new-database` creating `app01_<folder>`;  
it applied only if NC1 Recommendation A was accepted, and NC1 was resolved with Recommendation B;  
"Resolved Decisions" records that there is no per-folder database in this feature, and diagram 2.5 no longer applies.  

Giving each folder its own database needs a name and a starting copy of the data.  

  - **Recommendation**: **`npm run fix-migrations -- --new-database` creates `app01_<folder>` (the folder name, lower case, `-` → `_`) as `CREATE DATABASE … TEMPLATE app01`, then repairs the copy for the folder.**  

    ➡️ [X] **Accepted**  
    - PostgreSQL copies a template only while nothing is connected to it, so every server on `app01` must be stopped;  
      the script says so if the copy is refused.  
    - It refuses a name that already exists, and prints the `ENV_DATABASE_URL` line to paste into the folder's `launch-dev.ps1` and `.vscode/launch.json`;  
      it never edits those files.  
    - `main` keeps `app01`.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

**UA8. How is the script tested?**  
<span style="font-size:large">✅ Resolved</span>  
✅ Requirements File Updated: 2026-10-29 4:07 PM  
**Notes**: Recommendation accepted in file 2026-10-29: Recommendation, `tests/fix-migrations.test.ts`, one case per failure;  
recorded in "Resolved Decisions".  

The requirements give no success criteria for the script.  

  - **Recommendation**: **a `tests/fix-migrations.test.ts` on the embedded PostgreSQL, one case per failure.**  

    ➡️ [X] **Accepted**  
    - F1, F2 and F3 are each built with small throw-away migrations, then `migrateToLatest` must succeed after `--apply`.  
    - A dry run writes nothing;  
      a remote host is refused;  
      an unclassifiable row changes nothing and exits 1;  
      an already-consistent database prints `Nothing to fix`.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

**UA9. The start-up error says "Migration (unknown) failed" when no migration ran.**  
<span style="font-size:large">✅ Resolved</span>  
✅ Requirements File Updated: 2026-10-29 4:30 PM  
**Notes**: Recommendation accepted by "Accept all" 2026-10-29: Recommendation, `Migration check failed:` followed by Kysely's message, then UA6's hint line;  
"Resolved Decisions" gains the start-up message bullet, keeping `Migration <name> failed:` for a migration that fails while running.  

The console output added to the requirements shows `MigrationError: Migration (unknown) failed: corrupted migrations: previously executed migration 013-line-graph-enabled is missing`.  
Kysely refuses before running any migration, so no result has the status `Error`, and `migrateToLatest` (`src/db/migrator.ts`) fills the name with `(unknown)`.  
The message reads as if a migration had failed, and hides that the database and the folder disagree.  

  - **Recommendation**: **when no migration failed, the message says `Migration check failed:` followed by Kysely's message, then UA6's hint line.**  

    ➡️ [X] **Accepted**  
    - For example: `Migration check failed: corrupted migrations: previously executed migration 013-line-graph-enabled is missing`, then `Run npm run fix-migrations (see devScripts/MIGRATIONS-HOWTO.md).`  
    - A migration that fails while running keeps today's `Migration <name> failed:` wording.  
    - The server still refuses to start.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### 6.4 Needs Clarifications

**NC1. Repair after the fact, or also stop the folders sharing one database?**  
<span style="font-size:large">✅ Resolved</span>  
✅ Requirements File Updated: 2026-10-29 4:07 PM  
**Notes**: Recommendation accepted in file 2026-10-29: Recommendation B, the document and the repair script, still on the shared `app01`;  
"Resolved Decisions" records the scope and its cost: a repair at each switch, and F1's roll-back losing what the other folder's migration held.  

The requirements ask for a document, "even better" a script that fixes the problem.  
A repair alone leaves every folder on `app01`, so the next migration tested on any branch breaks the other folders again (F1).  
Repairing F1 for one folder (rolling back with `down()`) also breaks the folder that applied it, until it restarts and applies it again, losing what that column held.  

  - **Recommendation A** _(recommended)_: **the document, the repair script, and one database per branch folder (UA7).**  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: removes F1 for good;  
      folders can run side by side;  
      the repair is then needed only for F2 and F3, once, after a merge into `main`.  
    - <u>Cons</u>: a branch folder's data is a copy taken when it was set up;  
      each new folder takes one extra step.  

  - **Recommendation B**: **the document and the repair script, still on the shared `app01`.**  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: one database, the same data everywhere.  
    - <u>Cons</u>: switching between a folder with a migration and one without needs a repair each time, and each repair undoes the other folder's schema.  

  - **Recommendation C**: **the document only.**  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no code.  
    - <u>Cons</u>: every recovery is SQL by hand on `kysely_migration` and the schema, easy to get wrong.  

  - **Developer Resolution D**:  

    ➡️ [ ] **Accepted**  

**NC2. Keep numbering new migrations `NNN-`, or switch to timestamp names?**  
<span style="font-size:large">✅ Resolved</span>  
✅ Requirements File Updated: 2026-10-29 4:07 PM  
**Notes**: Recommendation accepted in file 2026-10-29: Recommendation A, keep `NNN-` and renumber the second clashing migration at merge;  
recorded in "Resolved Decisions".  

Two branches that each add migration `013` clash at merge, which causes F2 and F3.  
Features are already numbered by timestamp (`.specify/init-options.json`).  
Timestamp names (`20261029-150703-line-graph-enabled`) would sort after `012-…` and rarely clash, but Kysely would still refuse one merged with an earlier timestamp than an applied one, unless `allowUnorderedMigrations: true` is set.  

  - **Recommendation A** _(recommended)_: **keep `NNN-`;  
    the branch merged second renumbers its migration to the next free number at merge, and `fix-migrations` renames its row (F2).**  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: no change to the migrator or to production;  
      migrations always run in one known order everywhere.  
    - <u>Cons</u>: a renumbering step at each clashing merge.  

  - **Recommendation B**: **timestamp names for new migrations, with `allowUnorderedMigrations: true`.**  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no renumbering, so F2 and F3 disappear.  
    - <u>Cons</u>: production may apply migrations in a different order from development;  
      two migrations touching the same table can then behave differently;  
      F1 remains.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## 7. Requirements Report Complete Report  
  
- **Requirements Report Document:** requirements/20261029-150703-branch-migration-merge/requirements-report.md  
- **Requirements Document:** requirements/20261029-150703-branch-migration-merge/requirements.md  
- **Software Architecture Diagrams:** 5  
- **Inconsistencies:** 0  
- **Ambiguities:** 3  
- **Unspecified Aspects:** 9  
- **Needs Clarifications:** 2  
- **Research Results:** 0  
- **Breaking Changes:** 0  
- **Technical Debt items:** 6  
  
The requirements are ready for /speckit-specify.  
To generate specs from the requirements document, use the `/speckit-specify` skill followed by the path (relative to the project root) to the requirements file.  
At the prompt, Type:  
🟩 👉 /speckit-specify requirements/20261029-150703-branch-migration-merge/requirements.md  
