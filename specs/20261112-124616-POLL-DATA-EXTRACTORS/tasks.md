# Tasks: Poll Data Extractors

**Input**: Design documents from `specs/20261112-124616-POLL-DATA-EXTRACTORS/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cli.md, quickstart.md

**Tests**: the spec asks for htmlparser's tests to move with the code (FR-007), so moving them is part of the work.

**Source**: every file is taken from `roadraceresults/htmlparser` at commit `90b7fb328d5aeb297ca12c75fb1afc418c885e9a`
(branch `latest`). Download it with
`gh api "repos/roadraceresults/htmlparser/contents/<path>?ref=90b7fb328d5aeb297ca12c75fb1afc418c885e9a" -H "Accept: application/vnd.github.raw"`.
Every copy follows research R7: double quotes and this project's formatting, with the same names, logic and `.js`
import specifiers.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task belongs to (US1, US2, US3)

## Phase 1: Setup

**Purpose**: dependencies and repository tracking for the new folders.

- [X] T001 Add `cheerio` `1.2.0` and `yaml` `2.9.1` as exact devDependencies with `npm install -D -E cheerio@1.2.0 yaml@2.9.1`. This updates `package.json` and `package-lock.json`. Check that `npm ls cheerio yaml --omit=dev` lists no `cheerio` and lists `yaml` only under `vite` (R5, SC-004).
- [X] T002 Add the five scripts to `package.json` `scripts`, after `populate-test-poll` (R2):
  - `"extract-all": "tsx devScripts/extract/extract-all.ts"`
  - `"extract-cnn": "tsx devScripts/extract/extract-cnn.ts"`
  - `"extract-politico": "tsx devScripts/extract/extract-politico.ts"`
  - `"extract-polymarket": "tsx devScripts/extract/extract-polymarket.ts"`
  - `"extract-polymarket-yes-no": "tsx devScripts/extract/extract-polymarket-yes-no.ts"`
- [X] T003 Add the extract exceptions to `.gitignore`, after the `devScripts/populate/` block and in the same pattern (R2):
  - `!devScripts/extract/`
  - `devScripts/extract/*`
  - one `!devScripts/extract/<file>` line for each of the 27 files listed in plan.md.

  Check it with `git check-ignore -v devScripts/extract/extract-all.ts`, which must report nothing once the file exists.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the 22 modules that every entry imports, with their unit tests. `graphTypes.ts` imports all four
kind-specific CLI modules, so `extract-all` needs every module.

**⚠️ CRITICAL**: no user story can start until this phase is complete.

- [X] T004 [P] Copy the parsing and file modules from htmlparser `src/` to `devScripts/extract/`:
  - `detectGraphType.ts`, `extractLineGraph.ts`, `graphConfig.ts`, `graphExtraction.ts`, `graphTypeNames.ts`, `graphTypes.ts`
  - `harPriceHistory.ts`, `normalizeTitle.ts`, `outputPath.ts`, `pollGraphFile.ts`
  - `politicoChart.ts`, `politicoGraph.ts`, `polymarketChart.ts`, `polymarketGraph.ts`, `polymarketYesNo.ts`
  - `readHtmlFile.ts`, `writeFileAtomically.ts`, `writeJsonFile.ts`
- [X] T005 [P] Copy the four CLI modules to `devScripts/extract/`: `extractCli.ts`, `politicoCli.ts`, `polymarketCli.ts` and `extractAllCli.ts`. Change only the usage text and command names (R3, contracts/cli.md):
  - `extractCli.ts`: `USAGE` becomes `Usage: npm run extract-cnn <config.yaml>`, and its `checkOwnType` name `extract-cnn.js` becomes `extract-cnn`.
  - `politicoCli.ts` and `polymarketCli.ts`: the same change, with `extract-politico` and `extract-polymarket`.
  - `extractAllCli.ts`, the `runGraphPipeline` calls (htmlparser lines 181 and 186): `usage` becomes `Usage: npm run extract-all <config.yaml>` / `Usage: npm run extract-polymarket-yes-no <config.yaml>`, and `command` becomes `extract-all` / `extract-polymarket-yes-no`.
- [X] T006 [P] Copy the five fixtures from htmlparser `tests/fixtures/` to `tests/extract/fixtures/`, byte for byte (no style change): `line-graphs.html`, `polymarket.har`, `polymarket-chart.html`, `polymarket-yes-no.html` and `polymarket-yes-no-navigated.html` (R6, SC-005).
- [X] T007 [P] Copy htmlparser `tests/politicoFixture.ts` to `tests/extract/politicoFixture.ts`, and htmlparser `tests/integration/helpers.ts` to `tests/extract/integration/helpers.ts`:
  - Keep `createWorkDir`, `copyFixture`, `removeWorkDir` and `captureConsole`.
  - Remove `startPageServer`, its `PageServer` type and `servePage`, along with the imports that only they used (`node:http`, `AddressInfo`).
  - `fixturesDir` stays `../fixtures/`, relative to the helper.
- [X] T008 Copy the 16 unit tests from htmlparser `tests/unit/` to `tests/extract/unit/`:
  - `detectGraphType`, `extractLineGraph`, `graphConfig`, `graphTypeNames`, `harPriceHistory`, `normalizeTitle`, `outputPath`, `politicoChart`
  - `politicoGraph`, `pollGraphFile`, `polymarketChart`, `polymarketGraph`, `polymarketYesNo`, `readHtmlFile`, `writeFileAtomically`, `writeJsonFile`

  Every test file is named `<name>.test.ts`. Rewrite each module import to `../../../devScripts/extract/<module>.js` and each fixture path to the new `tests/extract/fixtures/`. The tests were written for Vitest ^5: replace any API missing from Vitest 3.2 with its 3.2 equivalent, keeping every assertion (T011 and T014–T017 follow the same rule). Then run `npx vitest run tests/extract/unit`; every test must pass (depends on T004–T007).
- [X] T009 Type-check the moved code once under this project's options (R4):
  1. Write a temporary `tsconfig.extract.json` in the scratchpad that extends the repository's `tsconfig.json`, with `include` set to `devScripts/extract/**/*.ts` and `tests/extract/**/*.ts`.
  2. Run `npx tsc --noEmit -p <it>`.
  3. Fix any error (e.g. from `noUncheckedIndexedAccess`) with the smallest change that keeps the behaviour, then delete the temporary file. Nothing is added to the repository's `tsconfig.json`.

**Checkpoint**: every module is in place and its unit tests pass.

---

## Phase 3: User Story 1 - Extract any saved poll page from this project (Priority: P1) 🎯 MVP

**Goal**: `npm run extract-all <config.yaml>` writes the poll data file for each supported page kind, as htmlparser
does.

**Independent Test**: `npx vitest run tests/extract/integration/extractAll.test.ts` passes. Then
`npm run extract-all` on one `polldata/` configuration of each kind writes files identical to htmlparser's
(quickstart step 3).

- [X] T010 [US1] Copy the entry htmlparser `src/extract-all.ts` to `devScripts/extract/extract-all.ts`.
- [X] T011 [US1] Copy htmlparser `tests/integration/extractAll.test.ts` to `tests/extract/integration/extractAll.test.ts`:
  - Imports point to `../../../devScripts/extract/` and `./helpers.js`.
  - Every `Usage: node dist/extract-all.js <config.yaml>` assertion becomes `Usage: npm run extract-all <config.yaml>`.
  - The usage assertions are the only `dist/` mentions.
  - Replace any Vitest API missing from Vitest 3.2 as in T008.
  - Run it; it must pass.
- [X] T012 [US1] Run `npm run extract-all` against every `polldata/*.yaml` configuration (7 today, covering the four kinds; SC-001), and against a configuration naming a missing page. Compare each written file with htmlparser's output for the same configuration (quickstart steps 2–3, R8). The missing page must be reported by name, write nothing and exit 1.

**Checkpoint**: User Story 1 works alone; every supported page can be extracted from this project.

---

## Phase 4: User Story 2 - Run a specific extractor by name (Priority: P2)

**Goal**: the four kind-specific commands behave as htmlparser's, with the `npm run` usage line.

**Independent Test**: the four integration tests pass, and each command run on its own kind of `polldata/` page
writes the same file as htmlparser.

- [X] T013 [P] [US2] Copy the four entries from htmlparser `src/` to `devScripts/extract/`: `extract-cnn.ts`, `extract-politico.ts`, `extract-polymarket.ts` and `extract-polymarket-yes-no.ts`.
- [X] T014 [P] [US2] Copy htmlparser `tests/integration/extract.test.ts` to `tests/extract/integration/extract.test.ts`. Rewrite the imports as in T011, and change the usage assertions to `Usage: npm run extract-cnn <config.yaml>` and the command name to `extract-cnn`.
- [X] T015 [P] [US2] Copy htmlparser `tests/integration/extractPolitico.test.ts` to `tests/extract/integration/extractPolitico.test.ts`, with the same rewrites (`extract-politico`).
- [X] T016 [P] [US2] Copy htmlparser `tests/integration/extractPolymarket.test.ts` to `tests/extract/integration/extractPolymarket.test.ts`, with the same rewrites (`extract-polymarket`).
- [X] T017 [P] [US2] Copy htmlparser `tests/integration/extractYesNo.test.ts` to `tests/extract/integration/extractYesNo.test.ts`, with the same rewrites (`extract-polymarket-yes-no`).
- [X] T018 [US2] Run `npx vitest run tests/extract`; every test must pass. Then run each of the four commands:
  - on its own kind of `polldata/` page, comparing the output with htmlparser's;
  - on a page of another kind (User Story 2, scenario 2), which must report the `is not supported by <command>` message and write nothing;
  - with no argument, which must print `Usage: npm run <command> <config.yaml>` and exit 1.

**Checkpoint**: all five commands work and are covered by their tests.

---

## Phase 5: User Story 3 - Extract, then populate, from one checkout (Priority: P3)

**Goal**: extraction feeds the existing populate commands unchanged (FR-011). No code is written in this phase.

**Independent Test**: quickstart step 4.

- [X] T019 [US3] Against the local development database:
  1. Run `npm run extract-all polldata/<page>.yaml`, then `npm run populate-poll polldata/<output_json>`, and check that the poll appears with its votes.
  2. Run `npm run populate-all-polls polldata` on a folder of files written by the commands.
  3. Check that `git diff --stat -- src devScripts/populate` shows no change.

---

## Phase 6: Polish & Documentation (post-implementation, required by the constitution)

- [X] T020 [P] Update `README.md` (FR-012), keeping it self-contained (no link to specs, requirements or htmlparser). Add a section beside the populate commands that covers:
  - the five commands;
  - the configuration keys (data-model.md), with one example YAML;
  - the files written;
  - the extract-then-populate workflow (`npm run extract-all …` then `npm run populate-poll …`).
- [X] T021 [P] Update `ARCHITECTURE.md` with one short note: the extraction tools sit in `devScripts/extract/`, are development-only (devDependencies `cheerio` and `yaml`) and are not part of the deployed application.
- [X] T022 Run `npx tsc --noEmit` and `npm test`; both must pass, and the run grows by no more than 5 seconds (SC-003; compare with `npm test` before the change). Then confirm:
  - the size of `tests/extract/fixtures` is under 1 MB (`du -sh`, SC-005);
  - `git status` shows only the planned paths.
- [X] T023 Tell the developer the commit message to use, which must name the source `roadraceresults/htmlparser@90b7fb3`, with the full hash in the body (FR-010, R9). Do not commit unless asked.
- [X] T024 (TWEAK01) Add `devScripts/forget-deleted-polls.ts` (`npm run forget-deleted-polls`): forget the cached `poll:<pid>` projection of every poll no longer in the database, through `forgetProjections`; test in `tests/forget-deleted-polls.test.ts`; `.gitignore` exception, `package.json` script, README paragraph.

---

## Dependencies & Execution Order

- **Setup (T001–T003)**: start at once. T002 and T003 may run in either order after T001.
- **Foundational (T004–T009)**: after Setup; it blocks every story.
  - T004–T007 run in parallel.
  - T008 needs T004–T007.
  - T009 needs T008.
- **US1 (T010–T012)**: after Foundational.
- **US2 (T013–T018)**: after Foundational. Its code does not depend on US1, but T018 runs the whole `tests/extract` folder, so it is best done after T011.
- **US3 (T019)**: after US1 (it needs `extract-all`).
- **Polish (T020–T023)**: after every story.

### Parallel Opportunities

- T004, T005, T006 and T007 (different files).
- T013–T017 (one entry file set and four test files).
- T020 and T021.

### Parallel Example: User Story 2

```text
T014 extract.test.ts   T015 extractPolitico.test.ts   T016 extractPolymarket.test.ts   T017 extractYesNo.test.ts
```

## Implementation Strategy

### MVP first (User Story 1 only)

1. Phase 1, then Phase 2.
2. Phase 3: `npm run extract-all` alone extracts every supported page.
3. Stop and validate against htmlparser's output (T012).

### Incremental delivery

1. Add US2: the four named commands.
2. Validate US3: no code, only the extract-then-populate check.
3. Write the documentation (Phase 6) last, as the constitution requires.

## Notes

- Never edit `src/`, `devScripts/populate/` or `tsconfig.json` (FR-011, R4).
- Do not copy the title extractor's files, `reference.test.ts` or the two reference pages (FR-006, FR-007).
- Leave the fixtures byte for byte as they are; only `.ts` files are restyled.
