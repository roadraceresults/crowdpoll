# Implementation Plan: Populate Oldest Age

**Branch**: `20261109-083912-POPULATE-OLDEST-AGE` | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/20261109-083912-POPULATE-OLDEST-AGE/spec.md`

## Summary

A poll data file may carry an optional `oldest_age_in_days`, a whole number ≥ 0. `parsePollData` validates it with the
other keys, before the database is opened, and returns it as `PollData.oldestAgeInDays` (`null` when absent) (R1, R2).
`populatePoll` moves the dates as today, then keeps only the points whose calendar day is no earlier than today minus
the limit, with a new pure `keepRecent` (R3). The kept list replaces the existing `points` variable, so the poll's
dates, the replay and the 12-month note follow it with no other change (R4); when points were ignored, one line
`[populate] Kept X of Y data points (oldest_age_in_days N)` is printed (R5). Reruns and `populate-all-polls` need no
change (R6). The populate README and `tests/populate-poll.test.ts` are extended (R7). No server, schema, migration,
setting or dependency change.

## Technical Context

**Language/Version**: TypeScript on Node.js ≥ 22 (ESM), run with `tsx`

**Primary Dependencies**: none new

**Storage**: the existing PostgreSQL writes of `populate-poll.ts`, unchanged in kind; fewer rows when a limit is set

**Testing**: Vitest + embedded-postgres, `tests/populate-poll.test.ts` extended

**Target Platform**: developer machines (Windows 11 primary)

**Project Type**: single project; one developer script, its README and its tests

**Performance Goals**: a run with limit N replays at most N + 1 data points instead of the whole file (SC-001)

**Constraints**: a file without the key behaves exactly as before (SC-002); an invalid value is refused before any
write (FR-002); the lines `populate-all-polls` reads keep their form

**Scale/Scope**: files touched: `devScripts/populate/populate-poll.ts`,
`devScripts/populate/README-populate-poll-and-seed-poll.md`, `tests/populate-poll.test.ts`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Think Before Coding** — PASS: six requirements findings resolved; the clarify pass found no open question.
- **II. Simplicity First** — PASS: one optional key, one pure function, one log line; no option, no setting.
- **III. Surgical Changes** — PASS: `populatePoll` changes in one assignment and one log line; the README's unrelated
  debt (file name, stale limits) is reported, not fixed.
- **IV. Goal-Driven Execution** — PASS: every FR maps to a test in R7; the quickstart gives the manual checks.
- **V. Code Quality & Maintainability** — PASS: validation stays in `parsePollData`; filtering is a separate exported
  pure function; an invalid value is one `[populate] Error:` line and exit 1.
- **VI. Self-Documenting Code** — PASS: names (`keepRecent`, `oldestAgeInDays`) carry the meaning; no new comments.
- **Security, Privacy & Reliability** — PASS: input validated before use; no new data collected or logged.

**Post-Phase-1 re-check**: PASS — the design added one optional key and one output line, nothing else.

## Project Structure

### Documentation (this feature)

```text
specs/20261109-083912-POPULATE-OLDEST-AGE/
├── plan.md              # This file
├── research.md          # Phase 0: R1–R7
├── data-model.md        # Phase 1: the new key and the kept/ignored rule
├── quickstart.md        # Phase 1: automated and manual checks
├── contracts/
│   └── data-file.md     # D1–D3: the key, the refusals, the kept-points line
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
devScripts/populate/
├── populate-poll.ts                          # PollData.oldestAgeInDays; parsePollData check; keepRecent; Kept line
└── README-populate-poll-and-seed-poll.md     # key-table row and example

tests/
└── populate-poll.test.ts                     # parsePollData, keepRecent and populatePoll cases
```

**Structure Decision**: the change lives in the existing developer-script area; no `src/` file changes.

## Complexity Tracking

No Constitution Check violations; the table is intentionally empty.
