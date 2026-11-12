# Implementation Plan: Poll Data Extractors

**Branch**: `main` (no feature branch) | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261112-124616-POLL-DATA-EXTRACTORS/spec.md`

## Summary

Copy htmlparser's five poll-page extraction commands into `devScripts/extract/`, with exactly the modules they import:

- Source: the `latest` branch, commit `90b7fb328d5aeb297ca12c75fb1afc418c885e9a`.
- Size: 27 files (5 entries and 22 modules), about 1,600 lines.
- Running: `tsx`, through five `npm run` scripts beside the populate scripts.
- Dependencies: `cheerio` and `yaml`, as pinned devDependencies.
- Tests: the 21 tests and 5 small fixtures move to `tests/extract/`.

The code is converted to this project's style (double quotes), with no change of behaviour. The one visible
difference is the usage line and the command name, which now give the `npm run` form instead of `node dist/…`
(research R3).

## Technical Context

**Language/Version**: TypeScript ^5.8 on Node ≥ 22 (ESM, NodeNext). htmlparser's code targets TS 7 and Node 26, but
it uses nothing newer than ES2023 (R4).

**Primary Dependencies**: `cheerio` 1.2.0 and `yaml` 2.9.1, as devDependencies only. `tsx` (already a devDependency)
runs the commands (R2, R5).

**Storage**: files only.
- In: YAML configuration, saved HTML pages and `.har` price histories.
- Out: JSON poll data files.
- Both sit in `polldata/`, which is git-ignored.

**Testing**: Vitest ^3.2 (`npm test`). The moved unit and integration tests under `tests/extract/` run in process,
with temporary work folders, and need no database (R6). They were written for Vitest ^5; an API missing from 3.2
is replaced by its 3.2 equivalent, keeping every assertion.

**Target Platform**: developer machines (Windows, macOS, Linux); never deployed.

**Project Type**: developer command-line tools inside the web application's repository.

**Performance Goals**: one extraction takes about a second; the moved tests add no more than 5 seconds to `npm test`
(SC-003).

**Constraints**:
- The poll data files are byte-identical to htmlparser's (FR-003).
- The production application loads none of the new packages; the production install gains only `yaml`, kept by npm as
  an optional peer of the already-installed `vite` (FR-009, SC-004).
- Fixtures stay under 1 MB (SC-005).
- The tests hold under `tsconfig.json`'s `strict` and `noUncheckedIndexedAccess` (R4).

**Scale/Scope**: 5 commands, 27 source files, 21 test files, 5 fixtures.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Think Before Coding | Pass | All 8 requirements findings, and every open point of the plan, are resolved in research.md |
| II. Simplicity First | Pass | A copy of existing, tested code: no new abstraction, no build step, no wrapper around populate (NC3) |
| III. Surgical Changes | Pass | Only new folders, plus `package.json`, `package-lock.json`, `.gitignore`, the README and ARCHITECTURE. `src/` and the populate scripts are not touched (FR-011) |
| IV. Goal-Driven Execution | Pass | Each story is checked by the moved tests and by comparing its output with htmlparser's (quickstart) |
| V. Code Quality | Pass | The code keeps its single-purpose modules and its error handling (message on stderr, exit status 1) |
| VI. Self-Documenting Code | Pass | Names are kept; no explanatory comments are added |
| Security/Privacy | Pass | Local files only, no network. No secret, address or token is handled |
| Documentation Deliverables | Pass | The final phase updates README.md (the commands and the workflow, self-contained) and ARCHITECTURE.md (where the tools sit) |

Post-design re-check: Pass, unchanged. No Complexity Tracking entry is needed.

## Project Structure

### Documentation (this feature)

```text
specs/20261112-124616-POLL-DATA-EXTRACTORS/
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
devScripts/extract/                  # new, tracked through .gitignore exceptions (R2)
├── extract-all.ts                   # the five entries
├── extract-cnn.ts
├── extract-politico.ts
├── extract-polymarket.ts
├── extract-polymarket-yes-no.ts
├── extractAllCli.ts, extractCli.ts, politicoCli.ts, polymarketCli.ts
├── detectGraphType.ts, extractLineGraph.ts, graphConfig.ts, graphExtraction.ts, graphTypeNames.ts, graphTypes.ts
├── harPriceHistory.ts, normalizeTitle.ts, outputPath.ts, pollGraphFile.ts
├── politicoChart.ts, politicoGraph.ts, polymarketChart.ts, polymarketGraph.ts, polymarketYesNo.ts
└── readHtmlFile.ts, writeFileAtomically.ts, writeJsonFile.ts

tests/extract/                       # new
├── unit/<module>.test.ts            # 16 files
├── integration/extract*.test.ts     # 5 files, plus helpers.ts (without the page server)
├── politicoFixture.ts
└── fixtures/                        # line-graphs.html, polymarket.har, polymarket-chart.html,
                                     # polymarket-yes-no.html, polymarket-yes-no-navigated.html

package.json                         # five scripts, two devDependencies
.gitignore                           # !devScripts/extract/ exceptions
README.md, ARCHITECTURE.md           # documentation phase
devScripts/forget-deleted-polls.ts   # TWEAK01: forgets cached projections of polls deleted in SQL
```

**Structure Decision**: the commands live beside `devScripts/populate/` and run the same way (`tsx` through npm
scripts), so the developer finds extraction and population together. The tests live under `tests/`, so `npm test`
runs them with no change to its configuration.

## Complexity Tracking

None.
