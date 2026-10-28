---
description: "Task list for 028-FILE-MANIFEST"
---

# Tasks: File Manifest Script

**Input**: Design documents from `specs/028-FILE-MANIFEST/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cli.md, contracts/reports.md, quickstart.md

**Tests**: Included, and not optional. FR-020 requires them and Constitution Principle IV requires a verifiable criterion per task. SC-002 to SC-005 are asserted by `tests/file-manifest.test.ts`; SC-006 and SC-007 and the real-repository results are `quickstart.md` scenarios 1 to 8.

**Organization**: by user story. This is one new script plus one new test file, so almost every task edits one of two files and cannot run in parallel with another task on the same file; the `[P]` marker appears only where the files differ. There is no server, route, data or contract task. US1 (P1, the four always-written reports) is the MVP; US2 and US3 (P2) and US4 and US5 (P3) add to it in order.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel: different files, no dependency on an incomplete task
- **[Story]**: US1 to US5, mapping to `spec.md`'s five user stories
- Paths are repository-relative.

---

## Phase 1: Setup

**Purpose**: a known baseline and the three small edits outside the script. The feature adds no dependency, configuration, server code or migration.

- [X] T001 Run `node -v`, `git --version` and `npm test` once and note the result (Node 22 or later, git present, the suite's pass count). The feature touches no production code, so that result must be identical at T035.
- [X] T002 [P] Add `"file-manifest": "tsx devScripts/file-manifest.ts"` to the `scripts` of `package.json`, after `publish-assets` (FR-016, R15). No dependency is added.
- [X] T003 [P] Add the line `!devScripts/file-manifest.ts` to `.gitignore` directly after `!devScripts/build-assets.ts` (FR-019, R15). The file uses CRLF line endings: keep them, and check with `git diff --ignore-space-at-eol` that only that line was added. `/manifests/` is already ignored.

---

## Phase 2: Foundational (blocks every story)

**Purpose**: the types and the pure functions every report depends on, each with its unit tests. All of these edit `devScripts/file-manifest.ts` and `tests/file-manifest.test.ts`, so they run in order.

**⚠️ CRITICAL**: no user story work can begin until this phase is complete.

- [X] T004 Create `devScripts/file-manifest.ts` with the exported types from `data-model.md` (`FileGroup`, `ListedFile`, `SkippedEntry`, `Measure`, `MeasuredFile`, `Row`) and an empty `main()` that runs only when `import.meta.url === pathToFileURL(process.argv[1]).href` (R11). Use only erasable TypeScript syntax: `import type`, no `enum`, `namespace` or parameter properties. No behaviour comments (Constitution VI).
- [X] T005 Add to `devScripts/file-manifest.ts`: `isExcludedPath(path)` (a first component of `node_modules`, `node-modules` or `manifests`; FR-004) and `extensionOf(fileName)` (lower-cased `path.extname`, `(none)` when it is empty or only a dot, which includes `.gitignore` and `file.`; FR-006).
- [X] T006 Add to `devScripts/file-manifest.ts`: `isBinary(bytes)` (a zero byte in the first 8,000 bytes; R2), `countLines(bytes)` (the `\n` bytes plus one when the file is not empty and its last byte is not `\n`; R3) and `measureFile(bytes, extension)` returning a binary `{bytes}` or a text `{lines}` (no comment count yet; FR-007, FR-008).
- [X] T007 Add to `devScripts/file-manifest.ts`: `renderTable(header, rows)` (UTF-8 text, `\n` line endings, a final newline, `\|` escaping, plain integers, empty cells for `undefined`; FR-017, `contracts/reports.md` Text format) and `summarizeByType(files)` (group by `fileType`; a *Lines*, *Comment lines* or *Size* cell sums only the defined values and stays empty when no file in the row has one; sort by lower-cased code-unit order so `(none)` is first, then the `**Total**` row that sums every column and shows `0` where nothing contributes; FR-011, FR-012, R6).
- [X] T008 Create `tests/file-manifest.test.ts` (Vitest, importing `../devScripts/file-manifest.js`) with unit tests for T005 to T007: excluded and not-excluded first components (including `node_modules_x` and a nested `src/node_modules`, which are not excluded); `extensionOf` for `a.TS`, `a`, `.gitignore`, `file.`, `a.tar.gz`; `isBinary` with the zero byte at index 7,999 (binary) and 8,000 (text); `countLines` for `a\nb`, `a\nb\n`, the empty file, `\n` alone and a CRLF file (SC-005); `renderTable` escaping a pipe, ending in one `\n`, no byte-order mark; `summarizeByType` ordering and a `**Total**` row of zeros for no files, including a type that mixes text and binary files.

**Checkpoint**: the pure counting rules are in place and tested; `npx vitest run tests/file-manifest.test.ts` is green.

---

## Phase 3: User Story 1 - Get a file manifest for a project (Priority: P1) 🎯 MVP

**Goal**: one command writes `overall.md`, `not-gitignored.md`, `gitignored.md` and `directories.md` into a new `manifests/<run>/` folder, each a single table ending in a `**Total**` row.

**Independent Test**: build the quickstart §3 fixture repository and run the command; the four reports match the hand-worked counts, and identities 1 to 4 of `contracts/reports.md` hold. On this repository, quickstart §1 and §2.

### Tests for User Story 1

- [X] T009 [US1] In `tests/file-manifest.test.ts`, add a helper that builds the quickstart §3 fixture in a temporary folder (`git init`, the seven tracked files, the ignored `dist/out.js`, the untracked `untracked.md`, a `node_modules` folder and an old `manifests/old` run) and tests that fail until T010 to T014 exist: `generateManifest` writes exactly the four reports; the `overall.md` table equals the quickstart §3 table; `gitignored.md` holds one `.js` row; `not-gitignored.md` has 8 files; `directories.md` shows `dist` as `.gitignored`, root files as `committed` under `.`, and `untracked.md` as `untracked`; identities 1 to 4 (SC-002, SC-003, SC-004); nothing from `node_modules` or `manifests` is counted; an empty set still yields a header row and a `**Total**` row of zeros.

### Implementation for User Story 1

- [X] T010 [US1] Add `listProjectFiles(projectDir)` to `devScripts/file-manifest.ts`: three `execFileSync("git", [...])` calls with the project as working folder and an argument array, `-z`, a large `maxBuffer`, split on NUL, each path tagged `tracked`, `untracked` or `ignored`, and `isExcludedPath` applied (FR-003, FR-004, R1).
- [X] T011 [US1] Add `readAndMeasure(projectDir, listed)` to `devScripts/file-manifest.ts`: `lstat` each path; a path that is missing, a symlink, a folder, not a regular file or unreadable becomes a `SkippedEntry` with its reason; otherwise read the bytes and return a `MeasuredFile` with `fileType`, `topDirectory` (`.` for a root file) and `measure` (FR-005, R8).
- [X] T012 [US1] Add `summarizeByDirectory(files)` and `buildReports(files)` to `devScripts/file-manifest.ts`: `overall.md`, `not-gitignored.md`, `gitignored.md` by file type, and `directories.md` with the status mapping (`ignored` to `.gitignored`, `tracked` to `committed`, `untracked` to `untracked`), rows sorted by lower-cased folder with `.` first, then status, then file type, and a `**Total**` row (FR-012, FR-013). Return a map of file name to text.
- [X] T013 [US1] Add `createRunFolder(projectDir, date)` and `formatRunFolderName(date)` (local `YYYY-MM-DD_HH-mm-ss`; `manifests/` created recursively, the run folder with a plain `mkdirSync`) and `generateManifest({projectDir, startedAt})` to `devScripts/file-manifest.ts`: list, measure, build, create the folder last, write each report, return `{runFolder, counted, skipped, written}` (FR-010, R9). The retry suffix is US4.
- [X] T014 [US1] Add `parseArguments(argv, initCwd, cwd)` (one argument, resolved with `path.resolve(initCwd ?? cwd, argument)`; R10) and `main()` to `devScripts/file-manifest.ts`: call `generateManifest` and print the four success lines of `contracts/cli.md` (folder, counted, skipped with the first five `path: reason`, reports written). Errors are US5.
- [X] T015 [US1] Make T009 pass, then run quickstart §1 and §2 on this repository and record the counts: exit 0, the run folder exists, `git status` does not list `manifests/`, and the identities hold. Time the run (`time npm run file-manifest -- .` in Git Bash): under 2 seconds in total, runner start-up included (SC-001).

**Checkpoint**: US1 is complete and demonstrable. Stop and walk quickstart §1 to §3.

---

## Phase 4: User Story 2 - Break the totals down by area (Priority: P2)

**Goal**: `dist.md`, `public.md`, `assets.md`, `src.md` and `tests.md` are written when their folder holds counted files, and only then.

**Independent Test**: quickstart §1 on a repository with `src/` and `tests/` but no `dist/`, then with `dist/public/assets/`.

- [X] T016 [US2] In `tests/file-manifest.test.ts`, add cases to the fixture: with `src/` and `tests/` files and no `dist/`, `src.md` and `tests.md` exist and `dist.md`, `public.md`, `assets.md` do not; with `dist/public/assets/x.js` ignored, all three exist and count ignored files; `dist/` without `dist/public/` writes `dist.md` only; a folder holding only excluded files writes no report; each folder report's `**Total**` equals the sum of the rows (SC-004).
- [X] T017 [US2] Extend `buildReports` in `devScripts/file-manifest.ts` with the five path-prefix filters (`dist/`, `dist/public/`, `dist/public/assets/`, `src/`, `tests/`), each written only when the filter matches at least one counted file, and list them in the `Reports:` line `main` prints (FR-014).
- [X] T018 [US2] Run quickstart §1 on this repository (after `npm run build`, so `dist/` exists) and compare `dist.md`, `public.md` and `assets.md` Files totals with `find dist -type f | wc -l`, `find dist/public -type f | wc -l` and `find dist/public/assets -type f | wc -l`; compare `src.md` and `tests.md` with `git ls-files src tests | wc -l`.

**Checkpoint**: US1 and US2 work together; the manifest has all nine reports where they apply.

---

## Phase 5: User Story 3 - Trust the numbers (Priority: P2)

**Goal**: comment lines are counted by one documented rule for the listed languages; a file listed under two spellings on a case-insensitive file system is counted once; skipped entries are reported on the console only.

**Independent Test**: unit fixtures for every comment rule and the quickstart §3 and §4 fixture repositories.

### Tests for User Story 3

- [X] T019 [US3] In `tests/file-manifest.test.ts`, add `countCommentLines` cases, one per rule and per syntax row: a C-family file with a three-line block comment (one blank line inside), a line of code followed by `//`, and a `//`-only line gives 4 of 5 lines (the spec's worked example); `*/ code` is code; `code /* start` opens a block for the next lines; `/* a */ /* b */` is a comment line; `.css` with a `//` line has none; `.sql` `--` and `/* */`; `.lua` `--[[ ]]` before `--`; `.ps1` `<# #>` and `#`; `#!` first line counts in `.sh`; `.html` `<!-- -->` multi-line; a Python docstring and a `<script>` body count as code; an unknown extension, `.md`, `.json`, `.svg` and `.txt` return no count (empty cell), while a recognised file with no comments returns `0`.
- [X] T020 [US3] In `tests/file-manifest.test.ts`, add `detectCaseInsensitive` and `dedupeAndFold` cases with a fake `pathExists`: a swapped-case path that exists and is not listed means case-insensitive; a listing with no letters or no files means case-sensitive; when the swapped path is itself listed it is skipped for the test; on a case-insensitive file system `designdocs/a.md` and `designDocs/a.md` are one file (first listed kept; the other returned as a skipped entry with the reason `duplicate (differs only in letter case)`) and the top-level name takes the spelling of a fake `readdir`; on a case-sensitive one both stay and nothing folds (FR-018).
- [X] T021 [US3] In `tests/file-manifest.test.ts`, add integration cases on the fixture: a tracked file deleted from the working tree, a symlink (skipped with a clear message when the platform cannot create one), and a folder entry are skipped, `counted + skipped` equals the files listed after the exclusions (SC-002), and none of this text appears in any report (FR-005).

### Implementation for User Story 3

- [X] T022 [US3] Add `commentSyntaxFor(extension)` (the FR-009 table as `lineMarkers` and `blocks`, keyed by extension) and `countCommentLines(text, syntax)` (the two-state scanner of R4: block openers before line markers, keep scanning after code, a line counts when it has comment and no code) to `devScripts/file-manifest.ts`.
- [X] T023 [US3] Change `measureFile` in `devScripts/file-manifest.ts` to decode UTF-8 and add `commentLines` only when the extension has a syntax (FR-009); the summaries need no change, because an undefined value already leaves the cell empty (T007).
- [X] T024 [US3] Add `detectCaseInsensitive(paths, pathExists)` and `dedupeAndFold(files, caseInsensitive, topLevelNames)` to `devScripts/file-manifest.ts` and call them in `generateManifest` between listing and measuring, reading the project folder once with `readdirSync` for the top-level spellings; the dropped spelling is added to the skipped entries (FR-018, SC-002, R7).
- [X] T025 [US3] Make T019 and T020 pass (T021 stays green), then run quickstart §3 and §4 and confirm the console shows `2` skipped with `newline.txt: missing` and `link.txt: symlink`.

**Checkpoint**: every counting rule in the spec has a failing-then-passing test.

---

## Phase 6: User Story 4 - Run it again and compare (Priority: P3)

**Goal**: each run gets its own folder, named for its start time, and no run touches another.

**Independent Test**: quickstart §5.

- [X] T026 [US4] In `tests/file-manifest.test.ts`, add: `formatRunFolderName` for a `Date` built from local components (not UTC) gives `YYYY-MM-DD_HH-mm-ss`; with the base folder and `-2` already present the next run creates `-3`; two `generateManifest` calls with the same `startedAt` produce two different folders and leave the first untouched; after a run, a before and after listing (path, size, modified time) of everything in the fixture outside `manifests/` is identical (SC-006), and `git status --porcelain` does not list `manifests/` because this test builds its own fixture variant, the §3 fixture plus a `/manifests/` line in its `.gitignore` (the command edits no ignore file), leaving the shared fixture and the quickstart §3 table unchanged.
- [X] T027 [US4] Change `createRunFolder` in `devScripts/file-manifest.ts` to retry: on `EEXIST` from the plain `mkdirSync`, append `-2`, `-3`, and so on until a new folder is made; any other error propagates (FR-010, R9).
- [X] T028 [US4] Run quickstart §5 on this repository (where `/manifests/` is ignored) and confirm `git status` lists nothing under `manifests/` and no file outside `<project>/manifests/` changed (SC-006).

---

## Phase 7: User Story 5 - Clear failures (Priority: P3)

**Goal**: a bad invocation stops before anything is written and says how to use the command.

**Independent Test**: quickstart §6.

- [X] T029 [US5] In `tests/file-manifest.test.ts`, add: `parseArguments` for no argument, two arguments (the exact message names the extras), a relative argument resolved from `INIT_CWD` and not from the working folder, and an absolute one; `runCli` (T030) returns exit code 1 and writes no `manifests` folder for a path that is a file, a folder that is not a git work tree (a fresh temporary folder), and no argument; a subfolder of the fixture repository is treated as the project (its own `manifests/`, its own top-level names); a file named `manifests` blocking the folder gives `ERROR: Could not write <path>: <message>` and exit 1 (R14).
- [X] T030 [US5] Add to `devScripts/file-manifest.ts`: `validateProject(projectDir)` (a folder; `git rev-parse --is-inside-work-tree` prints `true`), the exact messages of `contracts/cli.md`, and `runCli(argv, environment, output)` returning the exit code; `main()` calls it and `process.exit`s with the result. Standard error carries the messages, standard output the success lines (FR-001, FR-002).
- [X] T031 [US5] In `devScripts/file-manifest.ts`, wrap the folder creation and report writes in `generateManifest` so a failure becomes `ERROR: Could not write <path>: <system message>` and exit 1, leaving any report already written in place (R14).
- [X] T032 [US5] Run quickstart §6 end to end, including the relative path typed from `src/`.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T033 [P] Type-check the script with the one-off command in quickstart §7 (`tsc --noEmit` with `--strict --target ES2023 --module NodeNext`), and fix every error in `devScripts/file-manifest.ts` (R16).
- [X] T034 Constitution VI pass over `devScripts/file-manifest.ts` and `tests/file-manifest.test.ts`: no comment describes behaviour, cites a requirement, spec, task or feature number, or records history; the only comments allowed point to external documentation (for example git's `ls-files` manual). Check function names read as the rules they implement and each function does one thing.
- [X] T035 Run `npm test`; the result must equal T001's baseline plus the new file's cases, with nothing else changed.
- [X] T036 Walk quickstart §1 to §8 once more on this repository and on the fixture, repeat the §2b timing on the 10,000-file fixture (under 10 seconds; SC-001), then clean up with §8. Confirm `git status` shows only: `devScripts/file-manifest.ts`, `tests/file-manifest.test.ts`, `package.json`, `.gitignore`, the docs tasks below and `CLAUDE.md`.
---

## Phase 9: Documentation (post-implementation)

**Purpose**: the post-implementation documentation phase the constitution requires for every feature: `README.md` and `ARCHITECTURE.md`, then the agent context. It starts only after Phase 8, because the documents describe the final behaviour.

- [X] T037 [P] Update the root `README.md`: add a short "File manifest" entry giving the command `npm run file-manifest -- <project>`, what it writes and where, its prerequisites (Node 22 or later, `git`), and the nine report names. The README is self-contained: it names no spec, requirements or architecture document (Constitution, Documentation Deliverables).
- [X] T038 [P] Update the root `ARCHITECTURE.md`: add a section on the file manifest script with a Mermaid diagram of the pipeline (listing, exclusion, skip, binary test, line and comment counts, the nine reports, the run folder) and the pure-core and thin-shell split. Keep existing accurate content; name no spec or requirements document.
- [X] T039 Re-read the `CLAUDE.md` plan block against what was built; correct any decision that changed during implementation (it already points at this plan).

---

## Dependencies & Execution Order

### Phase dependencies
- **Setup (1)**: T001 first; T002 and T003 are independent of everything and of each other.
- **Foundational (2)**: T004 to T008 in order; blocks every story.
- **US1 (3)**: T009 (tests) first, then T010 to T014 in order, T015 last. It is the MVP.
- **US2 (4)**: after US1 (it extends `buildReports`).
- **US3 (5)**: after US1 (it changes `measureFile` and `generateManifest`); independent of US2.
- **US4 (6)** and **US5 (7)**: each after US1; independent of US2, US3 and each other. US5's `runCli` wraps the `generateManifest` from US1.
- **Polish (8)**: after all stories.
- **Documentation (9)**: after Phase 8; T037 and T038 need the behaviour to be final.

### Within the shared files
`devScripts/file-manifest.ts` and `tests/file-manifest.test.ts` are each one file, so every task that edits them is sequential; the order above is the order to edit. Only T002, T003, T033, T037 and T038 touch other files and can run in parallel with anything that does not touch theirs.

### Parallel example
T002 (`package.json`) and T003 (`.gitignore`) run together at the start. T033 (type check) runs alongside the other Phase 8 work, and T037 (`README.md`) and T038 (`ARCHITECTURE.md`) run together in Phase 9.

## Implementation Strategy

### MVP first (User Story 1)
Phases 1 to 3. After Phase 3 the command writes the four always-present reports for any git project. Stop and walk quickstart §1 to §3.

### Incremental delivery
1. Setup + Foundational: the script skeleton, the counting rules and their tests
2. US1: listing, measuring, four reports, the run folder, the console output (MVP)
3. US2: the five folder reports
4. US3: comment lines and case folding
5. US4: unique run folders
6. US5: clear failures
7. Polish
8. Documentation

## Notes

- 39 tasks: Setup 3, Foundational 5, US1 7, US2 3, US3 7, US4 3, US5 4, Polish 4, Documentation 3.
- Tests come first within US1, US2, US3, US4 and US5 where the story adds behaviour (T009, T016, T019 to T021, T026, T029); T008 covers the Foundational rules.
- Constitution VI: the script and its tests carry no requirement ids or behaviour comments; the tests are the documentation of the rules.
- The spec's script file name is `devScripts/file-manifest.ts`; one file is deliberate (R11), so the file may reach about 350 lines. Split only if it passes about 400.
- Commit after each phase, or per story.
