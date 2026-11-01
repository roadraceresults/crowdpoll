# Implementation Plan: Populate All Polls

**Branch**: `20261101-121236-POPULATE-ALL-POLLS` | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/20261101-121236-POPULATE-ALL-POLLS/spec.md`

## Summary

Two `package.json` scripts make the demonstration-poll tooling one command each. `npm run populate-poll <file>`
runs the existing `devScripts/populate/populate-poll.ts`, which gains `resolveDataPath` (relative to `INIT_CWD`,
with a `.json` fallback for an extensionless path) and an npm usage line (R2, R3); nothing else in it changes.
`npm run populate-all-polls [<directory>]` runs a new `devScripts/populate/populate-all-polls.ts`: it lists the
directory's `.json` files in name order, skips each one recorded for the same password-free database identity
with the same SHA-256, and runs `populate-poll.ts` on the rest as a child process (`process.execPath --import tsx`,
no shell), showing its output live while reading its `Done:` and `Votes written:` lines (R4, R5). Each success
replaces that (database, file) entry in the git-ignored `devScripts/populate/populate-all-polls-history.json`,
written by temp-file-and-rename (R7, R8). Failures are logged, not recorded, and listed again after the
`Done:` summary; any failure exits 1 (R10). No server, route, configuration, schema or migration change; no new
dependency.

## Technical Context

**Language/Version**: TypeScript on Node.js ≥ 22 (ESM), run with `tsx` — the scripts' existing toolchain

**Primary Dependencies**: none new; `node:child_process`, `node:crypto`, `node:fs`, `node:path`, `node:url`; the
child keeps its existing imports

**Storage**: the existing PostgreSQL writes of `populate-poll.ts` (unchanged); one new local JSON file,
`devScripts/populate/populate-all-polls-history.json` (git-ignored)

**Testing**: Vitest + embedded-postgres: `tests/populate-poll.test.ts` extended; new
`tests/populate-all-polls.test.ts` (fake child runner and temporary folders, plus one real-child end-to-end test)

**Target Platform**: developer machines; Windows 11 primary, so no shell and no `.cmd` shims in the spawn

**Project Type**: single project; developer scripts, their README, `package.json`, `.gitignore`, tests

**Performance Goals**: none beyond today's; files run one after another and each costs one `tsx` start-up
(about a second) on top of its population

**Constraints**: the single-file script's output and writes unchanged (SC-006); no password in the history or
the log (FR-020); validate arguments, `ENV_DATABASE_URL`, directory and history before any file

**Scale/Scope**: a handful of data files per folder; files touched: `package.json`, `.gitignore`,
`devScripts/populate/populate-poll.ts`, `devScripts/populate/populate-all-polls.ts` (new),
`devScripts/populate/README.md`, `tests/populate-poll.test.ts`, `tests/populate-all-polls.test.ts` (new), and the
Commands block of `CLAUDE.md`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Think Before Coding** — PASS: 13 requirements findings and 3 clarifications are resolved; the one detail
  left to planning (the failure message) is decided in R5 from the child's existing output.
- **II. Simplicity First** — PASS: no new option, no machine-readable output mode, no configuration; the history
  is one JSON object; the only injection seam is the child runner the tests need.
- **III. Surgical Changes** — PASS: `populate-poll.ts` changes only in path resolution and the usage string; its
  population logic and log lines are untouched (the new script depends on them as they are).
- **IV. Goal-Driven Execution** — PASS: each FR maps to a test in R11; the quickstart gives the end-to-end check.
- **V. Code Quality & Maintainability** — PASS: small single-purpose exported functions (`resolveDataPath`,
  `databaseIdentity`, `readPopulateResult`, `listDataFiles`, `readHistory`, `writeHistory`, `populateAllPolls`);
  every error is one prefixed line and a non-zero exit, never a stack trace; the operator log names what each step
  does.
- **VI. Self-Documenting Code** — PASS: the new file keeps the one-line header style of `populate-poll.ts`
  (pointing to the README); no explanatory or requirement-referencing comments.
- **Security, Privacy & Reliability** — PASS: no shell, argument array only; the password is stripped before it
  is stored or printed; the history write is atomic.

**Post-Phase-1 re-check**: PASS — the design added one local file format and one CLI contract, no other entity,
and no file outside the eight listed.

## Project Structure

### Documentation (this feature)

```text
specs/20261101-121236-POPULATE-ALL-POLLS/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output: R1–R11
├── data-model.md        # Phase 1 output: the history file
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── cli.md           # C1–C5: both commands, files, outcomes, skipping
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
package.json                         # scripts: populate-poll, populate-all-polls
.gitignore                           # !devScripts/populate/populate-all-polls.ts
CLAUDE.md                            # Commands block: the two npm commands
devScripts/populate/
├── populate-poll.ts                 # resolveDataPath (INIT_CWD, .json fallback); npm usage line
├── populate-all-polls.ts            # new: list, skip, spawn, read result, record, summarize
└── README.md                        # both npm commands, the history file, how to repopulate

tests/
├── populate-poll.test.ts            # resolveDataPath; usage text
└── populate-all-polls.test.ts       # new: unit (fake runner) + one real-child end-to-end test
```

**Structure Decision**: the feature lives in the existing developer-script area beside `populate-poll.ts`;
no `src/` file changes.

## Complexity Tracking

No Constitution Check violations; the table is intentionally empty.
