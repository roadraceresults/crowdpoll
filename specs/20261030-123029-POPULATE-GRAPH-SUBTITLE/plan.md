# Implementation Plan: Populate Script Graph Subtitle

**Branch**: `20261030-123029-POPULATE-GRAPH-SUBTITLE` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/20261030-123029-POPULATE-GRAPH-SUBTITLE/spec.md`

## Summary

`devScripts/populate/populate-poll.ts` gains one optional input key, `graph_subtitle`, read by `parsePollData`
onto a new `PollData.subtitle` field and written as the poll's existing `subtitle` on both the create path
(`insertPoll`) and the refresh path (`updatePoll`), replacing the hard-coded `""`. The value must be a string
of at most `SUBTITLE_MAX` (30) characters; a bad value is one `[populate] Error:` line and exit 1 before any
write, like every other input error. Absent or empty means an empty subtitle, so every existing data file and
the test fixture keep working; a rerun always applies the file's current value, clearing the subtitle when
the key is gone. No server, route, schema, configuration or browser change: the poll card and the maximized
view's line graph already display `polls.subtitle` (research R1). The README key table, the test fixture and
the populate tests gain the key (R5); the two local `polldata/` files are corrected by hand (R6).

## Technical Context

**Language/Version**: TypeScript on Node.js ≥ 22 (ESM), run with `tsx` — the script's existing toolchain

**Primary Dependencies**: none new; the script's existing imports (`src/config.ts`, `src/db/client.ts`,
`src/cache/cache.ts`, `src/polls/service.ts`, `src/polls/store.ts`, `src/votes/consumer.ts`, Kysely)

**Storage**: PostgreSQL through the existing store functions (`insertPoll`, `updatePoll`); the value lands in
the existing `polls.subtitle` column — no schema change, no migration

**Testing**: Vitest + embedded-postgres, extending the existing `tests/populate-poll.test.ts` and
`tests/fixtures/populate-poll.json`

**Target Platform**: developer machines (the script is a dev tool; Windows 11 is the primary environment)

**Project Type**: single project; one developer script plus its documentation, fixture and tests

**Performance Goals**: none beyond today's — the parse change is O(1) per file

**Constraints**: validate before any write (every input error is one `[populate] Error:` line and exit 1);
the input format otherwise unchanged (FR-009); surgical change to one script

**Scale/Scope**: 4 files touched (`devScripts/populate/populate-poll.ts`, `devScripts/populate/README.md`,
`tests/fixtures/populate-poll.json`, `tests/populate-poll.test.ts`); two git-ignored local data files
corrected by hand

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Think Before Coding** — PASS: all six requirements findings (AM1, UA1–UA3, NC1, NC2) were resolved in
  `/speckit-requirements`; the one residual detail (whitespace handling) is decided in R2 from the existing
  code's behaviour, not guessed silently.
- **II. Simplicity First** — PASS: one optional key, parsed with a small helper beside `requiredText`, two
  `subtitle: ""` literals replaced; no second input format (NC2 rejected it), no new abstraction.
- **III. Surgical Changes** — PASS: four files, each edit traceable to an FR; no adjacent cleanup; the
  non-standard keys in the local data files are fixed in the data files, not accommodated in code.
- **IV. Goal-Driven Execution** — PASS: each FR maps to a named test (stored on create, applied/cleared on
  refresh, length and type validation); the quickstart gives the end-to-end check.
- **V. Code Quality & Maintainability** — PASS: the error path reuses the script's `InputError` →
  `[populate] Error:` → exit 1 discipline; the limit is imported from `src/polls/service.ts`, not copied.
- **VI. Self-Documenting Code** — PASS: a descriptive helper name (`optionalText`), no explanatory or
  requirement-referencing comments added.

**Post-Phase-1 re-check**: PASS — the design added no entity, no contract beyond the CLI input key, and no
new file outside the four listed.

## Project Structure

### Documentation (this feature)

```text
specs/20261030-123029-POPULATE-GRAPH-SUBTITLE/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── cli.md           # C1–C5: the input key, validation, create/refresh behaviour, docs
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
devScripts/populate/
├── populate-poll.ts     # parsePollData reads graph_subtitle → PollData.subtitle; both write paths use it
└── README.md            # key table gains the graph_subtitle row

tests/
├── fixtures/
│   └── populate-poll.json   # gains "graph_subtitle"
└── populate-poll.test.ts    # parse validation, stored on create, applied/cleared on rerun
```

**Structure Decision**: the feature lives entirely in the existing developer-script area and its tests; no
`src/` file changes (the script imports `SUBTITLE_MAX` from `src/polls/service.ts`, which already exports it).

## Complexity Tracking

No Constitution Check violations; the table is intentionally empty.
