# Implementation Plan: File Manifest Script

**Branch**: `dev` (no dedicated branch) | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/028-FILE-MANIFEST/spec.md`

**Note**: This plan is filled in by the `/speckit-plan` command. Research is in [research.md](research.md)
(R1 to R16), the data model in [data-model.md](data-model.md), the command and report contracts in
[contracts/cli.md](contracts/cli.md) and [contracts/reports.md](contracts/reports.md), and the validation
guide in [quickstart.md](quickstart.md). The architecture artifact is
`architecture/028-file-manifest-script/architecture.md` (7 diagrams, 10 findings, all resolved).

## Summary

Add `npm run file-manifest -- <project>`: a single script, `devScripts/file-manifest.ts`, that lists a
project's files with three `git ls-files` calls (tracked, untracked, ignored), measures each file once
(binary test, lines, comment-only lines, bytes), and writes up to nine markdown tables into a new
`manifests/YYYY-MM-DD_HH-mm-ss/` folder inside the project. The script is split into exported pure
functions (binary test, line count, comment scanner, grouping, table text) and a thin shell (arguments,
git, file reads, folder and report writes), so the rules are tested with Vitest without a repository on disk
and one integration test covers the git split. No server, route, database, configuration or contract change;
no new dependency. Three small edits outside the script: one `package.json` script, one `.gitignore`
exception, and this plan's pointer in `CLAUDE.md`.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node >= 22 (`package.json` engines), run through `tsx` 4.23 as the
other `devScripts` are; erasable syntax only (no `enum`, `namespace` or parameter properties).

**Primary Dependencies**: none new. Node built-ins `node:child_process`, `node:fs`, `node:path`, `node:url`;
the `git` command on the path.

**Storage**: files only. Reads the project's working tree; writes `<project>/manifests/<run>/*.md`.

**Testing**: Vitest 3.2 (`tests/**/*.test.ts`), one new file `tests/file-manifest.test.ts`: unit tests of
the pure functions plus one integration test on a throwaway git repository in the operating system's
temporary folder.

**Target Platform**: the developer's Windows 11 machine first; also macOS and Linux. Run-folder names use
only characters legal on all three.

**Project Type**: command-line script inside an existing web-service repository.

**Performance Goals**: SC-001: under 10 seconds for a project of 10,000 files, under 2 seconds on this
repository. Measured: about 0.16 s for the 880 files outside the exclusions here, and about 0.08 s for the
three git calls.

**Constraints**: writes only under `<project>/manifests/`; never follows a symlink; no shell is spawned and
no argument is interpolated into a command line; no new dependency; comments in the code only point to
external documentation (constitution VI).

**Scale/Scope**: the project sizes the developer meets: up to tens of thousands of counted files, files up
to a few MB. Whole-file reads are acceptable (largest file here is 509 KB).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design: unchanged, all pass.*

| Principle | Status | How the plan meets it |
|---|---|---|
| I. Think Before Coding | Pass | Research, an architecture pass with 10 resolved findings and a clarify pass came first; the assumptions are in the spec and in R1 to R16 |
| II. Simplicity First | Pass | One file, no new dependency, no configuration, no streaming or worker threads (R11, R12); reports are filters over one array rather than a keyed accumulator (R5) |
| III. Surgical Changes | Pass | One new script, one new test file, one `package.json` line, one `.gitignore` line, the `CLAUDE.md` pointer; nothing under `src/`, the build or existing tests changes |
| IV. Goal-Driven Execution | Pass | Every success criterion has a check: SC-002 to SC-004 are identities the integration test asserts; SC-005 is the unit-test fixtures; SC-006 and SC-007 are quickstart scenarios |
| V. Code Quality & Maintainability | Pass | Single-purpose exported functions; errors become one message and exit 1; the console reports the folder, counts and skipped paths (informative); nothing sensitive is logged |
| VI. Self-Documenting Code | Pass | Names carry the meaning; no comment describes behaviour or cites a requirement; the tests document the rules |
| Security, privacy, reliability | Pass | The project path is validated before use; `execFileSync` with an argument array; `lstat` so links are not followed; output confined to `manifests/` |
| Performance and efficiency | Pass | Runs once and exits; measured far inside the target |
| Documentation deliverables | Pass | `/speckit-tasks` must end with the post-implementation phase for the root `README.md` and `ARCHITECTURE.md` (the README gets a short "File manifest" usage entry) |

## Project Structure

### Documentation (this feature)

```text
specs/028-FILE-MANIFEST/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── cli.md           # the command: arguments, console output, exit codes
│   └── reports.md       # the nine report files: names, tables, ordering, cell rules
├── checklists/
│   └── requirements.md  # spec quality checklist (/speckit-specify output)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
devScripts/
└── file-manifest.ts           # NEW: exported pure functions, thin shell, main() guarded as the entry point
tests/
└── file-manifest.test.ts      # NEW: unit tests of the pure functions + one throwaway-repository test
package.json                   # +1 script: "file-manifest": "tsx devScripts/file-manifest.ts"
.gitignore                     # +1 line: !devScripts/file-manifest.ts   (/manifests/ is already ignored)
CLAUDE.md                      # plan pointer between the SPECKIT markers
```

**Structure Decision**: a single script file in the existing `devScripts/` folder, next to `reconcile.ts`,
`build-assets.ts` and `publish-assets.ts`, which are run the same way. One file keeps the `.gitignore`
exception to one line (the folder is otherwise ignored), and keeps the module small enough (about 350
lines) to read at once. The pure functions are exported from it so the test imports them; `main()` runs only
when the file is the entry point (R11).

### Design in brief

The functions below are all exported from `devScripts/file-manifest.ts`; the first group is pure.

| Function | Purpose | Spec |
|---|---|---|
| `isExcludedPath(path)` | true for a top-level `node_modules`, `node-modules` or `manifests` | FR-004 |
| `extensionOf(name)` | lower-cased extension with its dot, or `(none)` | FR-006 |
| `isBinary(bytes)` | zero byte in the first 8,000 | FR-007 |
| `countLines(bytes)` | `\n` bytes plus one for an unterminated last line | FR-008 |
| `commentSyntaxFor(extension)` | the syntax table lookup; none for other extensions | FR-009 |
| `countCommentLines(text, syntax)` | the two-state scanner of R4 | FR-009 |
| `measureFile(bytes, extension)` | binary: bytes; text: lines and, when the syntax is known, comment lines | FR-007 to FR-009 |
| `detectCaseInsensitive(paths, pathExists)` | the probe-free test of R7 | FR-018 |
| `dedupeAndFold(files, caseInsensitive, topLevelNames)` | counts a file listed under two spellings once, reports the other spelling as skipped, and folds top-level names | FR-018 |
| `summarizeByType(files)` / `summarizeByDirectory(files)` | rows, sorted as in R6, plus the `**Total**` row | FR-011 to FR-013 |
| `renderTable(header, rows)` | UTF-8 text with `\n` endings and `\|` escaping | FR-011, FR-017 |
| `buildReports(files)` | the file name to text map: the four always-written reports and the five folder reports that apply | FR-012 to FR-014 |
| `formatRunFolderName(date)` | `YYYY-MM-DD_HH-mm-ss` from local time | FR-010 |
| `parseArguments(argv, initCwd, cwd)` | one argument, resolved from `INIT_CWD` | FR-001, FR-002 |
| `validateProject(projectDir)` | a folder inside a git work tree | FR-002 |
| `runCli(argv, environment, output)` | parse, validate, generate, print; returns the exit code | FR-001, FR-002, FR-015 |
| `listProjectFiles(projectDir)` | shell: the three git calls | FR-003 |
| `readAndMeasure(projectDir, listed)` | shell: `lstat`, read, measure; returns measured files and skipped entries | FR-005 |
| `createRunFolder(projectDir, date)` | shell: `manifests/` and the unique run folder | FR-010 |
| `generateManifest({projectDir, startedAt})` | orchestration; returns the folder, counted and skipped | FR-015 |
| `main()` | calls `runCli` and exits with its code | FR-002, FR-015 |

## Complexity Tracking

No constitution violations; nothing to justify.
