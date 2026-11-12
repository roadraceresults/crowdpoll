# Tasks: Extract All Poll Data

**Input**: Design documents from `specs/20261112-152622-EXTRACT-ALL-POLLDATA/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R7), data-model.md, contracts/cli.md, quickstart.md

**Tests**: requested (FR-016). Each story writes its test cases first, in
`tests/extract/integration/extractAllPolldata.test.ts`, and they fail before the implementation task that follows.

**Organization**: by user story; every task names its file.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1, US2, US3 (spec.md)

---

## Phase 1: Setup

- [X] T001 [P] Add `"extract-all-polldata": "tsx devScripts/extract/extract-all-polldata.ts"` to the `scripts` of `package.json`, after `extract-polymarket-yes-no` (R7)
- [X] T002 [P] Add `!devScripts/extract/extract-all-polldata.ts` to `.gitignore`, after the existing `!devScripts/extract/<file>.ts` lines (R7)

---

## Phase 2: Foundational (blocks every story)

- [X] T003 Create `devScripts/extract/extract-all-polldata.ts` with a one-line header comment (as `populate-all-polls.ts`), the constants `SCRIPT_DIR`, `HISTORY_FILE` (`extract-all-polldata-history.json` beside it) and `PROJECT_ROOT`, the types `HistoryEntry` (`directory`, `file`, `sha256`, `outputJson`, `extractedAt`), `History` and `RunOptions` (`argv`, `env`, `historyPath`, `projectRoot`, `runExtract: (configPath: string) => Promise<number>`, `log`, `logError`), the class `RunError`, and the helpers (data-model.md, R3, R4, R5):
  - `listConfigFiles(dir)`: files directly in `dir` matching `/\.ya?ml$/i`, sorted with `localeCompare(…, "en")`;
  - `readHistory(path)` / `writeHistory(path, history)`: missing → `{ entries: [] }`; not JSON or no `entries` array → `RunError("cannot read <path>: <reason>")`; write to `<path>.tmp`, then rename;
  - `configInputs(configPath)`: parse the YAML (a list of single-key mappings, or one mapping) and return `{ inputHtml, inputHistory?, outputJson }` resolved from the configuration's folder, or `undefined` when it cannot be read or parsed or `input_html`/`output_json` is not a non-empty string;
  - `fingerprintOf(configPath)`: SHA-256 over `config:<n>\0` + bytes, `html:<n>\0` + bytes, and `history:<n>\0` + bytes when there is a history file; `undefined` when `configInputs` is `undefined` or a named input cannot be read;
  - `main()` behind `if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)`, calling `extractAllPolldata` with `runExtractAll` from `./extractAllCli.js`, `console.log`/`console.error`, `process.env`, and setting `process.exitCode`.
- [X] T004 Create `tests/extract/integration/extractAllPolldata.test.ts` with the setup the stories share: a work folder per test (`createWorkDir`, `copyFixture(workDir, "line-graphs.html")`, `removeWorkDir`), `captureConsole()`, a `writeConfig(name, outputJson)` helper writing a CNN configuration (`graph_title`, `input_html: line-graphs.html`, `output_json`), a history path inside the work folder, and a `run(argv, env?)` helper calling `extractAllPolldata` with the real `runExtractAll`, `log`/`logError` collecting lines, and `projectRoot` set to the work folder

**Checkpoint**: the module and test file import cleanly; `npx tsc --noEmit` passes.

---

## Phase 3: User Story 1 - Extract every new configuration with one command (Priority: P1) 🎯 MVP

**Goal**: one run extracts every configuration of the folder, byte-identical to `extract-all`, and records each.

**Independent Test**: three never-processed configurations → three poll data files identical to direct `runExtractAll` output, `Done: 3 extracted, 0 skipped, 0 failed`, status 0, three history entries.

- [X] T005 [US1] Add US1 tests to `tests/extract/integration/extractAllPolldata.test.ts`: three configurations extracted in name order with `: extracting` lines; each output equals the file a direct `runExtractAll([config])` writes; the `Done:` line and status 0; the history holds one entry per configuration with the data-model fields; no argument uses `<projectRoot>/polldata`; a relative argument is resolved from `env.INIT_CWD`
- [X] T006 [US1] Implement `extractAllPolldata(options)` in `devScripts/extract/extract-all-polldata.ts`: resolve the folder (`argv[0]` undefined → `path.join(projectRoot, "polldata")`, else `path.resolve(env.INIT_CWD ?? process.cwd(), argv[0])`), list the configurations (`RunError("cannot read the directory <dir>: <reason>")`), take the history's `directory` as `fs.realpathSync.native(dir)` (U1), read the history, then for each file log `[extract-all-polldata] <file>: extracting`, call `runExtract(<absolute path>)`, and on status 0 replace the entry for (`directory`, `file`) with `{ directory, file, sha256, outputJson, extractedAt }` and write the history; end with `[extract-all-polldata] Done: <n> extracted, <n> skipped, <n> failed`; a `RunError` becomes one `[extract-all-polldata] Error: <message>` line and status 1 (R5, contracts/cli.md)

**Checkpoint**: US1 tests pass.

---

## Phase 4: User Story 2 - Skip what was extracted, redo what changed (Priority: P2)

**Goal**: unchanged configurations are skipped; changed or unrecorded ones are extracted again.

**Independent Test**: a second run skips all; changing one page extracts only that one.

- [X] T007 [US2] Add US2 tests to `tests/extract/integration/extractAllPolldata.test.ts`: a second run logs `Skipped <file> (extracted <time>)` for each and `Done: 0 extracted, 3 skipped, 0 failed`; editing the page of one (and, separately, its configuration) extracts only that one; removing one history entry extracts only that one; a direct `runExtractAll` run leaves the history unchanged; a same-named configuration in a second folder is recorded separately; the same folder given in another letter case (on Windows) or through `..` matches the existing entries and is skipped (U1)
- [X] T008 [US2] Implement the skip rule in `devScripts/extract/extract-all-polldata.ts`: compute `fingerprintOf` before each extraction; when an entry with the same `directory` and `file` has the same `sha256`, log `[extract-all-polldata] Skipped <file> (extracted <extractedAt>)` and count it; when the fingerprint is `undefined`, never skip (R3)

**Checkpoint**: US1 and US2 tests pass.

---

## Phase 5: User Story 3 - One bad configuration does not stop the others (Priority: P3)

**Goal**: failures are reported, recorded nowhere, listed again, and make the status 1.

**Independent Test**: two good configurations and one bad → two outputs, the bad one reported twice, status 1.

- [X] T009 [US3] Add US3 tests to `tests/extract/integration/extractAllPolldata.test.ts`: a configuration with an unknown key and one naming a missing page each fail with `extract-all`'s `Error:` line then `[extract-all-polldata] Error: <file>: <message>`, while the others are extracted; the `Done:` line counts the failures, `Failed files:` lists each with its message, status 1; a configuration that succeeded once and then fails keeps its earlier entry and is tried again on the next run; an injected `runExtract` that throws for one configuration is reported with the error's message and the others are still extracted (U2)
- [X] T010 [US3] Implement failure handling in `devScripts/extract/extract-all-polldata.ts`: wrap `console.error` during each `runExtract` call (lines still printed, the last `Error: ` line kept, restored in `finally`), take the message from it or `exited with status <n>`; a thrown or rejected `runExtract` is caught and is a failure with the error's message (`messageOf`) (U2); log `[extract-all-polldata] Error: <file>: <message>`, record nothing, go on; after `Done:` log `[extract-all-polldata] Failed files:` and `[extract-all-polldata]   <file>: <message>` per failure and return 1 (R2)
- [X] T011 [US3] Add the edge-case tests to `tests/extract/integration/extractAllPolldata.test.ts`: two arguments → the usage error and status 1, nothing extracted; a missing folder → the directory error, status 1; a folder with no configuration → `No .yaml or .yml files in <dir>`, status 0; a history file that is not JSON (and one without `entries`) → the history error before any extraction, status 1; `.yml` and `.YAML` files are taken and a subfolder's configuration is not; saved after each success: with an injected `runExtract` that reads the history file when called for the second configuration, the file already holds the first configuration's entry (A1)
- [X] T012 [US3] Complete `devScripts/extract/extract-all-polldata.ts` for T011: the argument check first (`RunError("Usage: npm run extract-all-polldata [<directory>]")`), then the folder, then the history; the empty-folder line and status 0 (R5)

**Checkpoint**: every test in the file passes.

---

## Phase 6: Polish & Documentation

- [X] T013 [P] Update `README.md`'s extraction section: `npm run extract-all-polldata [<directory>]`, the default folder, what is skipped and why, the history file, the two-command workflow (`extract-all-polldata` then `populate-all-polls`), and the two ways to extract a recorded configuration again (remove its entry or delete the history file; run `npm run extract-all <configuration>`) (FR-015)
- [X] T014 [P] Update `ARCHITECTURE.md`'s "Poll data extractors" section: the batch runner beside `extract-all`, its history file, and its place in the extract-then-populate workflow (diagram updated)
- [X] T015 Run `npx tsc --noEmit` and `npx vitest run tests/extract/integration/extractAllPolldata.test.ts`; confirm the new file adds no more than 5 seconds (SC-005)
- [X] T016 Run `npm test` (the full suite) and confirm no other test changed result
- [X] T017 Validate with `quickstart.md`'s manual steps on the real `polldata/` folder (developer)

---

## Dependencies & Execution Order

- **Setup (T001, T002)**: independent of everything; parallel.
- **Foundational (T003, T004)**: T004 imports T003's module; both block the stories.
- **US1 (T005 → T006)** → **US2 (T007 → T008)** → **US3 (T009 → T010, T011 → T012)**: every story edits the same two
  files, so the stories run in order; each test task precedes its implementation task.
- **Polish**: T013 and T014 in parallel once US3 is done; then T015, T016, T017.

## Parallel Example

```text
T001 package.json script  |  T002 .gitignore line
T013 README.md            |  T014 ARCHITECTURE.md
```

## Implementation Strategy

- **MVP**: Phases 1–3 (US1): one command extracts the whole folder and records it.
- **Then**: US2 makes re-runs cheap; US3 makes the command usable on the real `polldata/`, where two pages are known to
  fail.
- Stop at each checkpoint and run the test file.
