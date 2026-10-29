# Implementation Plan: Branch Migration Merge

**Branch**: `main` (no dedicated branch) | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261029-150703-BRANCH-MIGRATION-MERGE/spec.md`

## Summary

Every branch folder under `C:\crowdPoll\` runs against the one development database `app01`, so a branch's migration is
recorded there before it is merged, and Kysely then refuses to start a folder whose migrations disagree with the record
(F1 unknown, F2 renamed, F3 out of order).
This feature adds `devScripts/fix-migrations.ts` (`npm run fix-migrations [-- --apply]`), which plans one action per
mismatch — rename the record, roll a foreign migration back with its own `down()` found in a sibling folder, or apply a
skipped migration and record it in name order — and applies them in one transaction under Kysely's own advisory lock
(10 s wait), checking Kysely's two rules before it commits (R1–R6).
It adds `devScripts/MIGRATIONS-HOWTO.md`, linked from `README.md`, and changes `migrateToLatest`'s message from
`Migration (unknown) failed` to `Migration check failed`, with a line naming the script (R8).
No route, setting, stored data, migration or production change; no new dependency.

## Technical Context

**Language/Version**: TypeScript on Node ≥ 22 (ESM), run with `tsx`

**Primary Dependencies**: Kysely 0.29.6 (`kysely/migration` types, `sql`), `pg` through the server's `createDb`; no new dependency

**Storage**: the local PostgreSQL development database; only Kysely's `kysely_migration` table and the schema objects the
migrations themselves change

**Testing**: Vitest on the embedded PostgreSQL; a fresh database per case, as `tests/server-boot.test.ts` does

**Target Platform**: the developer's Windows 11 machine (PowerShell); the script also runs wherever `tsx` runs

**Project Type**: developer CLI script inside the existing web-service repository

**Performance Goals**: none beyond finishing in seconds; the record holds tens of rows

**Constraints**: local hosts only; one transaction; lock wait ≤ 10 s; never print the database URL's credentials

**Scale/Scope**: one script (~200 lines), one document, a two-line change to `src/db/migrator.ts`, one new test file,
one test added to an existing file, fixture migrations, `package.json` and `.gitignore` lines, a README paragraph

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Think Before Coding | ✅ | 14 requirements findings and 2 clarifications resolved; R1–R10 record each technical fact checked in the installed Kysely and in `app01` |
| II. Simplicity First | ✅ | One script, no options beyond `--apply`, no new dependency; Kysely's own lock and record are reused; no per-folder database, no `--folder` (R10) |
| III. Surgical Changes | ✅ | The only server change is the `MigrationError` wording in `migrator.ts`; `server.ts` and every migration are untouched |
| IV. Goal-Driven Execution | ✅ | Each failure has a test that ends in a passing `migrateToLatest` (FR-014, FR-025); quickstart §2 repairs today's `app01` |
| V. Code Quality | ✅ | Pure `planRepair` separated from `applyRepair`; every failure is one `[migrations] Error:` line and exit 1, never a stack trace; nothing is written on any problem |
| VI. Self-Documenting Code | ✅ | One header line naming the usage document, as `populate-poll.ts` has; no requirement or task ids in code |
| Security, Privacy & Reliability | ✅ | Local hosts only, refused before connecting; credentials never printed; all-or-nothing transaction; final check before commit |
| Documentation Deliverables | ✅ | `README.md` gains a paragraph in Testing naming the command; it already points at `devScripts/populate/README.md`, a developer how-to like this one, not a requirement, spec or design document. `ARCHITECTURE.md` gets a short note on the start-up check after implementation |

Re-check after Phase 1: unchanged, all ✅.

## Project Structure

### Documentation (this feature)

```text
specs/20261029-150703-BRANCH-MIGRATION-MERGE/
├── plan.md              # This file
├── research.md          # R1–R10
├── data-model.md        # In-memory plan of a run; no stored-data change
├── quickstart.md        # Validation guide
├── contracts/
│   └── cli.md           # C1–C6: invocation, output, exit status, errors, start-up message, the document
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
devScripts/
├── fix-migrations.ts          # new: planRepair, applyRepair, main (R9)
└── MIGRATIONS-HOWTO.md        # new: the document (C6)
src/db/
└── migrator.ts                # changed: "Migration check failed" + hint line (R8, C5)
tests/
├── fix-migrations.test.ts     # new: planner cases, F1–F3 end to end, refusals (R9)
├── server-boot.test.ts        # changed: one start-up wording test
└── fixtures/fix-migrations/   # new: sibling folders holding foreign migration files (R6)
package.json                   # changed: "fix-migrations" script
.gitignore                     # changed: !devScripts/fix-migrations.ts, !devScripts/MIGRATIONS-HOWTO.md
README.md                      # changed: Testing paragraph (C6)
```

**Structure Decision**: the existing single repository. The script sits beside the other developer scripts and imports
the server's `createDb` and the folder's `src/db/migrations/index.ts`, as `devScripts/populate/populate-poll.ts` imports
server modules.

## Complexity Tracking

No constitution violations to justify.
