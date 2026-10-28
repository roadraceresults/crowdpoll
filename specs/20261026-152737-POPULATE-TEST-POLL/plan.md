# Implementation Plan: Populate Test Poll

**Branch**: `populatepoll` (no dedicated branch) | **Date**: 2026-10-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/20261026-152737-POPULATE-TEST-POLL/spec.md`; requirements `requirements/20261026-152737-populate-test-poll/requirements.md` (report: 4 diagrams, 20 findings, all resolved).

## Summary

A stand-alone developer script, `devScripts/populate/populate-poll.ts`, reads one poll data file, finds or creates the creator's public, open, single-choice, dynamic-vote poll with that title, and replays the file's dated percentages as simulated votes from `test_<n>@crowdpolltest.test` voters, numbered from 1 for every data point, dated relative to today.
It reuses the application's own write paths: `createDefaultPoll` + `insertPoll` to create, `updatePoll` to refresh, `writeBatch` to write votes, and `reconcile` to recompute counters and queue the search entry.
A rerun keeps the poll's id, removes the earlier simulated votes and their history, and matches choices by label.
No server, route, configuration, table or dependency changes.

## Technical Context

**Language/Version**: TypeScript on Node.js ≥ 22, run with `tsx` (as the other `devScripts`)

**Primary Dependencies**: existing only: Kysely (`src/db/client.ts`), the app's poll store and counters, `node:crypto`, `node:fs`, `node:url`

**Storage**: PostgreSQL (`polls`, `votes`, `vote_history`, `user_polls`, `search_outbox`, read `user`); the cache (`cnt:<pid>`, poll projection), Valkey when `ENV_VALKEY_URL` is set

**Testing**: Vitest on the embedded PostgreSQL (`tests/helpers/setup.ts` `startTestContext`)

**Target Platform**: a developer's machine (Windows 11 primary), against any database `ENV_DATABASE_URL` names

**Project Type**: CLI developer script inside the existing single project

**Performance Goals**: the example (about 14.7 million vote events) completes in minutes; one data point's votes in memory at a time

**Constraints**: validate everything before the first write; never print the database credentials; no migration (so the rerun's `vote_history` delete is a full scan); PostgreSQL's 65,535-parameter limit per statement (slices of 5,000 votes, 5 parameters per row)

**Scale/Scope**: one file per run; up to `ENV_MAX_CHOICES` choices; at most `round(1.15 × vote_count)` voters (the largest single data point)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Think Before Coding | ✅ | 20 requirement findings resolved before the spec; every reuse checked in code (research R1–R12) |
| II. Simplicity First | ✅ | one file of small functions; existing write paths reused; no flags, no configuration, no seed option |
| III. Surgical Changes | ✅ | new script, test and fixture; one `.gitignore` line; one README section; no edit to `src/` (the unexported `QueuedVote` is reached through `Parameters<typeof writeBatch>`) |
| IV. Goal-Driven Execution | ✅ | each requirement maps to a test in `tests/populate-poll.test.ts` (R12) and a quickstart step |
| V. Code Quality | ✅ | single-purpose exported functions; `InputError` → one line, exit 1; informative `[populate]` logging |
| VI. Self-Documenting Code | ✅ | no explanatory comments; the file header points only to the README, as `seed-polls.ts`'s usage line does |
| Security, Privacy & Reliability | ✅ | inputs validated (FR-018); only the database host is printed; `.test` addresses never belong to real users; real votes untouched except a dropped choice's |
| Documentation Deliverables | ✅ | README/ARCHITECTURE updates in the post-implementation phase (a mention of the script under development tools) |

No violation; Complexity Tracking is empty.

**Post-design re-check**: unchanged, all ✅. The design adds no abstraction beyond the exported pure steps the tests need.

## Project Structure

### Documentation (this feature)

```text
specs/20261026-152737-POPULATE-TEST-POLL/
├── plan.md              # This file
├── research.md          # R1–R12
├── data-model.md        # input file, in-memory structures, rows touched
├── quickstart.md        # validation guide
├── contracts/
│   └── cli.md           # C1–C5: invocation, exit codes, output, errors, exported functions
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
devScripts/populate/
├── populate-poll.ts     # new: parsePollData, shiftDates, voteCountFor, splitByShares,
│                        #      voteTimesFor, populatePoll, main
└── README.md            # + a section for populate-poll
tests/
├── populate-poll.test.ts      # new
└── fixtures/
    └── populate-poll.json     # new: 2 choices, 3 data points, vote_count 100
.gitignore               # + !devScripts/populate/populate-poll.ts
```

Reused, unchanged: `src/config.ts` (`loadConfig`), `src/db/client.ts` (`createDb`, `closeDb`), `src/cache/cache.ts` (`createCache`), `src/polls/service.ts` (`createDefaultPoll`, `TITLE_MAX`, `CHOICE_LABEL_MAX`), `src/polls/store.ts` (`insertPoll`, `updatePoll`, `findPollRow`), `src/polls/versions.ts` (`refreshProjection`), `src/votes/consumer.ts` (`writeBatch`), `src/polls/counters.ts` (`reconcile`).

**Structure Decision**: one script beside `seed-polls.ts` (R1); tests in the flat `tests/` folder, with the first `tests/fixtures/` file.

## Run order (populatePoll)

1. Print the target (R11).
2. Look up the creator; unknown → `InputError` (nothing written).
3. Look up the newest poll with that `created_by_id` and title; warn when several match.
4. Move the dates (R9); compute the start midnight.
5. **New poll**: `insertPoll` (R3).
   **Rerun**: delete simulated rows (R6); match choices, delete dropped-choice votes (R5); `updatePoll`, set `launched_at`, refresh projection, warn if it was not OPEN (R4).
6. For each moved data point, oldest first: count, voters, split, times; `writeBatch` in slices of 5,000; one progress line (R7).
7. `reconcile` the poll (R8); read the row's counts.
8. Print the summary and notes; return it.

## Complexity Tracking

None.
