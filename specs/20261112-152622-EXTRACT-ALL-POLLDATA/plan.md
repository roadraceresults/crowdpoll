# Implementation Plan: Extract All Poll Data

**Branch**: `main` (no feature branch) | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261112-152622-EXTRACT-ALL-POLLDATA/spec.md`

## Summary

Add `npm run extract-all-polldata [<directory>]`, the extraction twin of `populate-all-polls`:

- It lists the `.yaml`/`.yml` files directly in the folder (default `<project root>/polldata`), in name order.
- It skips each one whose history entry has the same fingerprint (one SHA-256 over the configuration, its page and its
  price history), and extracts the others by calling the existing `runExtractAll` in the same process.
- It records each success in the git-ignored `devScripts/extract/extract-all-polldata-history.json`, reports failures
  without stopping, and ends with a `Done:` line and the list of failures (status 1 if any).

The existing five extraction commands and `populate-all-polls` are unchanged (FR-013, FR-014), except for two tweaks:
`extract-all` (and `extract-polymarket-yes-no`) writes `oldest_age_in_days: 365` (TWEAK01), and `populate-poll` turns
the line graph on when the file's `type` contains "line graph" (TWEAK03).

## Technical Context

**Language/Version**: TypeScript ^5.8 on Node ≥ 22 (ESM, NodeNext), run by `tsx`, like the other dev scripts.

**Primary Dependencies**: none new. `yaml` 2.9.1 (already a devDependency) parses the configuration for the
fingerprint; `node:crypto`, `node:fs`, `node:path`, `node:url`.

**Storage**: files only — the configurations and their inputs in the folder, the poll data files `extract-all` writes,
and the history JSON (data-model.md).

**Testing**: Vitest ^3.2 (`npm test`); one integration test file under `tests/extract/integration/` using temporary
folders and the existing CNN fixture; no database (R6).

**Target Platform**: developer machines (Windows, macOS, Linux); never deployed.

**Project Type**: a developer command-line script inside the web application's repository.

**Performance Goals**: about a second per extracted configuration, milliseconds per skipped one; the new tests add no
more than 5 seconds to `npm test` (SC-005).

**Constraints**:
- Output byte-identical to `npm run extract-all <configuration>` (FR-004, SC-003), achieved by calling the same function.
- No change to `devScripts/extract/` modules other than the new file (FR-013); no `src/` change.
- Strict TypeScript with `noUncheckedIndexedAccess` (the moved code's style: `!` where an index is known).

**Scale/Scope**: one new script (~200 lines), one test file, `package.json`, `.gitignore`, README, ARCHITECTURE.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Think Before Coding | Pass | The 9 requirements findings are resolved; research R1–R7 settle every open point |
| II. Simplicity First | Pass | One file; the existing pipeline is called, not wrapped in a child process; no option flags (R1) |
| III. Surgical Changes | Pass | One new script and test; `package.json`, `.gitignore`, README, ARCHITECTURE. No existing module edited (FR-013) |
| IV. Goal-Driven Execution | Pass | Each user story has its integration test cases (R6) and quickstart steps |
| V. Code Quality | Pass | Injected dependencies make the runner testable; errors end in one prefixed line and status 1 |
| VI. Self-Documenting Code | Pass | Names follow `populate-all-polls.ts`; one header comment as in that file |
| Security/Privacy | Pass | Local files only, no network, no settings or secrets |
| Documentation Deliverables | Pass | README (command, workflow, re-extraction) and ARCHITECTURE updated in the final phase |

The repeated history helpers (~30 lines, R4) are a deliberate copy, not a violation: sharing would couple the copied
htmlparser folder to the populate folder. Post-design re-check: Pass, unchanged. No Complexity Tracking entry is needed.

## Project Structure

### Documentation (this feature)

```text
specs/20261112-152622-EXTRACT-ALL-POLLDATA/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── cli.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
devScripts/extract/extract-all-polldata.ts               # new: extractAllPolldata(), helpers, main()
devScripts/extract/extract-all-polldata-history.json     # created at run time, git-ignored
tests/extract/integration/extractAllPolldata.test.ts     # new
package.json                                             # "extract-all-polldata" script
.gitignore                                               # !devScripts/extract/extract-all-polldata.ts
README.md, ARCHITECTURE.md                               # documentation phase
```

**Structure Decision**: the script sits beside `extract-all.ts`, whose `runExtractAll` it calls, as
`populate-all-polls.ts` sits beside `populate-poll.ts`. The test sits with the other extraction integration tests so
it reuses their helpers and fixtures.

## Complexity Tracking

None.
