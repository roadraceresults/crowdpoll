# Feature Specification: Branch Migration Merge

**Feature Branch**: `main` (no dedicated branch created for this feature)

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "requirements/20261029-150703-branch-migration-merge/requirements.md"

**Source requirements**: `requirements/20261029-150703-branch-migration-merge/requirements.md` (the requirements, the server console output, and every decision of the review under "Resolved Decisions").
**Requirements report**: `requirements/20261029-150703-branch-migration-merge/requirements-report.md` (5 diagrams and 14 findings, all resolved).

## Background

Each branch is developed in its own folder, and every folder runs its local server against one shared development database.
That database keeps a record of every schema change ("migration") applied to it, by name.
On start-up the server compares that record with the migrations the folder contains, and refuses to start when they disagree.
Because a branch is run and tested before it is merged, its migration is already recorded in the shared database when it reaches `main`.
The server then refuses to start in three cases:

- **F1 — unknown migration**: a folder without the migration (for example `main` before the merge) starts after a branch folder applied it.
  The message is `corrupted migrations: previously executed migration <name> is missing`.
  This is the state of the development database today: it records `013-line-graph-enabled` and `main` stops at `012-line-graph-tally`.
- **F2 — renamed migration**: the branch's migration is renumbered at merge because `main` already uses its number, so the recorded name no longer exists.
  The message is the same as F1's.
- **F3 — out-of-order migration**: a folder holds a migration numbered before one already recorded, that was never applied.
  The message is `corrupted migrations: expected previously executed migration <a> to be at index <i> but <b> was found in its place`.

A merge that keeps the migration's name is harmless.

## Clarifications

### Session 2026-10-29

- Q: Should an F1 rollback, which can lose data, need a confirmation beyond `--apply`? → A: No; `--apply` performs every planned action, F1 rollbacks included. The local database is for development, so losing data is acceptable as long as the tables are brought up to date.
- Q: With `--apply`, what does the script do when another process holds the migration lock? → A: It waits up to 10 seconds, then stops with `[migrations] Error: the database is being migrated by another process`, having written nothing.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A developer gets the server starting again after a migration mismatch (Priority: P1)

The developer starts the server in a folder and it refuses to start with a migration mismatch.
From that folder they run the repair script without options, read the plan it prints, stop the servers using the database, and run it again with `--apply`.
The development database's migration record now agrees with the folder's migrations, and the server starts.

**Why this priority**: It is the problem the requirements describe; today `main` cannot start against the development database at all.

**Independent Test**: On a test database whose record names a migration the folder does not have, whose file exists in a sibling folder, run the script without options, then with `--apply`; the first run writes nothing, the second removes that migration's schema change and its record, and the server's start-up check then passes.

**Acceptance Scenarios**:

1. **Given** the database records a migration that this folder does not have, and a sibling folder has that migration's file (F1), **When** the script runs with `--apply`, **Then** that migration's own undo step is run, its record is deleted, and the folder's migrations then pass the start-up check.
2. **Given** the database records `013-x` and this folder has the same migration as `014-x` (F2), **When** the script runs with `--apply`, **Then** the record is renamed to `014-x`, no schema change is run, and the start-up check passes.
3. **Given** this folder has a migration named before one already recorded, with no record of its own (F3), **When** the script runs with `--apply`, **Then** that migration is applied, its record is placed so the recorded order matches the name order, and the start-up check passes.
4. **Given** any mismatch, **When** the script runs without `--apply`, **Then** it prints the plan and the database is left exactly as it was.
5. **Given** a database whose record already agrees with the folder, **When** the script runs, **Then** it prints `Nothing to fix` and exits successfully.

---

### User Story 2 - A developer follows a written procedure for migrations on branches (Priority: P2)

The developer adds a migration on a branch, merges branches into `main`, or meets a start-up refusal, and looks up what to do in one document linked from the project's main read-me.
It explains the two start-up messages, how to name and register a new migration, how to renumber the second of two clashing migrations at merge, and how to run the repair.

**Why this priority**: The requirements ask first for a document; the script alone does not tell a developer how to avoid F2 and F3.

**Independent Test**: A developer who has not seen the feature follows the document alone to recover from an F2 case on a test database, without reading the script's source.

**Acceptance Scenarios**:

1. **Given** the project read-me, **When** the developer looks for help on migrations, **Then** it links to the document.
2. **Given** the document, **When** the developer reads it, **Then** it covers why the server refuses to start (both messages), adding a migration on a branch (next free number, keep the name after the number, register it), merging (renumber the second clashing migration, never one already on `main`), and recovering (stop the servers, run the script, check the plan, apply).

---

### User Story 3 - The server says what to do when it refuses to start (Priority: P3)

When the start-up check fails, the console names the failure correctly and points at the script and the document, instead of `Migration (unknown) failed`.

**Why this priority**: It turns the existing, misleading message into a direct pointer to the fix; the server's behaviour is otherwise unchanged.

**Independent Test**: Start the server against a database recording a migration the folder does not have; the console shows `Migration check failed:` followed by the mismatch message and a line naming the script and the document, and the server does not start.

**Acceptance Scenarios**:

1. **Given** the start-up check finds a mismatch before any migration runs, **When** the server starts, **Then** the message reads `Migration check failed:` followed by the mismatch message, then a line naming the repair script and the document, and the server refuses to start.
2. **Given** a migration fails while it is being applied, **When** the server starts, **Then** the message keeps today's wording, `Migration <name> failed:`, and names the failing migration.

---

### Edge Cases

- The database's address is not a local host (`localhost`, `127.0.0.1` or `::1`): the script refuses with one error line naming only the host, and writes nothing.
- The database cannot be reached, or the address is missing: one error line, exit failure, nothing written.
- A recorded migration is not in the folder and no sibling folder has its file: the script reports it, writes nothing, and exits with failure.
- The name after the number matches more than one of the folder's migrations, or a migration that already has a record: reported, not renamed.
- A migration's undo or apply step fails during `--apply`: every change of that run is undone, the error is reported, and the database is as before the run.
- A server is migrating the same database at the same moment: the script waits up to 10 seconds for the migration lock, then stops with `[migrations] Error: the database is being migrated by another process`, having written nothing; it never interleaves its changes with the server's.
- The same name is recorded twice, or a record cannot be classified as F1, F2 or F3: reported, nothing written.
- Two sibling folders hold different files for the same unknown migration name: reported, nothing written.
- Rolling back an F1 migration removes data held in its schema change; the folder that applied it re-applies the change, empty, on its next start. The plan says so before anything is applied.

## Requirements *(mandatory)*

### Functional Requirements

**Scope**

- **FR-001**: The feature MUST act only on local development databases; production is out of scope and MUST never be changed by the script.
- **FR-002**: Every folder MUST keep using the one shared development database; this feature MUST NOT introduce a database per folder.
- **FR-003**: New migrations MUST keep the existing three-digit numbered naming (`NNN-<name>`).

**The repair script**

- **FR-004**: The script MUST be run from a folder, and MUST compare the development database's migration record with that folder's own registered migrations.
- **FR-005**: The script MUST use the same database address setting as the server (`ENV_DATABASE_URL`).
- **FR-006**: The script MUST refuse, before connecting, any database whose host is not `localhost`, `127.0.0.1` or `::1`, printing only the host.
- **FR-007**: Without `--apply`, the script MUST print its plan and change nothing.
- **FR-008**: The plan MUST name the database's host and name, every action it would take, and ask that the servers using the database be stopped first.
- **FR-009**: For a recorded migration the folder does not have, whose name after the number matches exactly one of the folder's migrations without a record (F2), the script MUST rename the record to the folder's name and run no schema change.
- **FR-010**: For a recorded migration the folder does not have at all (F1), the script MUST locate that migration's file in a sibling folder of the same parent directory, run its undo step and delete its record; when no sibling has the file, or siblings disagree, it MUST report it and change nothing. `--apply` alone performs these rollbacks, with no further confirmation, although they discard the data the rolled-back change held.
- **FR-011**: For a folder migration with no record that is named before an already-recorded migration (F3), the script MUST apply it and record it so that the recorded order equals the name order.
- **FR-012**: Anything the script cannot classify as F1, F2 or F3 MUST be reported, and the run MUST change nothing.
- **FR-013**: With `--apply`, every change of a run MUST happen as one all-or-nothing unit under the same lock the server uses to migrate, so a failure leaves the database as it was. When the lock is held by another process, the script MUST wait at most 10 seconds for it, then report `[migrations] Error: the database is being migrated by another process` and change nothing.
- **FR-014**: After a successful `--apply`, the server's start-up check MUST pass for that folder.
- **FR-015**: Every output line MUST start with `[migrations]`; an error MUST be one `[migrations] Error:` line with a failing exit status; a run ending normally MUST end with `Done`, `Dry run: nothing written` or `Nothing to fix`, with a successful exit status.
- **FR-016**: The script MUST be runnable as `npm run fix-migrations` (options after `--`), and MUST be committed to the repository although other developer scripts are not tracked by default.
- **FR-017**: The script MUST NOT add a dependency to the project.

**The document**

- **FR-018**: A document MUST be added beside the developer scripts and linked from the project read-me's development section.
- **FR-019**: The document MUST cover: the two start-up messages and what they mean;
  adding a migration on a branch (next free number, keep the name after the number, register it);
  merging (the branch merged second renumbers its clashing migration; never renumber or rename a migration already on `main`, since production has recorded its name);
  and recovering (stop the servers, run the script, check the plan, apply).
- **FR-020**: The document MUST state the cost of an F1 repair: the other folder's change is removed with any data it held, and that folder re-applies it on its next start.

**Start-up message**

- **FR-021**: When the start-up check fails before any migration runs, the server MUST print `Migration check failed:` followed by the mismatch message, instead of `Migration (unknown) failed:`.
- **FR-022**: For a mismatch, the server MUST add one line naming the repair script and the document.
- **FR-023**: A migration that fails while being applied MUST keep the `Migration <name> failed:` wording.
- **FR-024**: The server MUST still refuse to start on any migration failure or mismatch.

**Verification**

- **FR-025**: Automated tests MUST cover F1, F2 and F3 (each followed by a passing start-up check), a dry run writing nothing, a refused remote host, an unclassifiable record changing nothing with a failing exit, an already-consistent database reporting `Nothing to fix`, and the start-up message wording.

### Key Entities *(include if feature involves data)*

- **Migration record**: one entry per migration applied to a database, holding the migration's name and when it was applied; the server orders the entries by time and compares them, in that order, with the folder's migrations in name order.
- **Folder migration**: a schema change shipped in a folder's code, named `NNN-<name>`, with an apply step and an undo step, and registered in the folder's list of migrations.
- **Mismatch**: a difference between the record and a folder's migrations, classified as F1 (unknown), F2 (renamed) or F3 (out of order).
- **Plan**: the ordered list of actions the script would take for a database and a folder, printed on every run.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From a start-up refusal caused by F1, F2 or F3, a developer gets the server starting again with two runs of one command (a dry run and an apply), with no hand-written database commands.
- **SC-002**: In 100% of the tested cases (F1, F2, F3), the server's start-up check passes immediately after the apply run.
- **SC-003**: A dry run and every refused or failed run leave the database byte-for-byte unchanged in its migration record and schema.
- **SC-004**: The script never connects to a database that is not on the developer's own machine.
- **SC-005**: A developer new to the feature recovers from an F2 case using only the document, in under 5 minutes.
- **SC-006**: Every start-up refusal caused by a mismatch names the repair script and the document in the console.

## Assumptions

- All branch folders sit side by side under one parent directory (`C:\crowdPoll\`) and use the same local database server.
- A migration keeps the part of its name after the number when it is renumbered at merge.
- The migrations' undo steps are correct; they have never been run by the application, and a failing one is handled by FR-013.
- The script follows the existing developer-script pattern: run with the project's script runner, opening the database the same way the server does.
- The tests run on the project's embedded test database and need no local services.
- The document is written for this repository's developer, working on Windows 11 with PowerShell.
- No route, setting, stored data, migration or production configuration changes; the only server change is the start-up message.
