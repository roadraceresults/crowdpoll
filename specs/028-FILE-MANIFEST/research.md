# Research: File Manifest Script

Every decision below is checked against this repository. No `NEEDS CLARIFICATION` item remained in the
Technical Context; the points here are the choices the spec leaves to the plan. Numbers marked *measured*
come from a throwaway prototype run on this repository on 2026-10-08 (Node v22.22.1, git 2.53.0).

## R1. Listing files: three `git ls-files` calls, filtered in the script

- **Decision**: run `git ls-files -z`, `git ls-files -z -o --exclude-standard` and
  `git ls-files -z -o -i --exclude-standard` with the project folder as the working folder, through
  `execFileSync("git", [...])` with an argument array (no shell) and a large `maxBuffer`. Split on NUL.
  Drop paths whose first component is `node_modules`, `node-modules` or `manifests` in the script.
- **Rationale**: git alone applies nested ignore files, `.git/info/exclude` and the user's global excludes
  (FR-003). `-z` avoids quoting of odd names. Run in a subfolder, git lists only that subtree with
  subfolder-relative paths, which is exactly the "folder given is the project" rule (FR-001). No shell
  means no quoting problem for a project path with spaces, and nothing for an argument to inject into.
- **Alternatives considered**: the `ignore` package (not installed, would not match git's global and
  nested rules); a recursive folder walk (re-implements ignoring, and walks `.git` and `node_modules`);
  exclusion pathspecs on the git call (*measured* 49 ms against 112 ms for 14,365 ignored paths here, but
  it would put FR-004 in two places; the script filter alone is fast enough, see R12).
- **Measured**: the three calls together take about 0.08 s on this repository. A repository with a very
  large ignored `node_modules` lists every file in it; the filter discards them after the call, which costs
  time and memory in proportion but stays far inside SC-001's 10 seconds for 10,000 counted files.

## R2. Binary or text: a zero byte in the first 8,000 bytes

- **Decision**: `isBinary(bytes)` is true when `bytes.subarray(0, 8000).includes(0)`.
- **Rationale**: this is git's own rule (its "first few bytes" window is 8,000), needs no extension list,
  and classified exactly the 10 images (9 `.jpg`, 1 `.png`) as binary on this repository (*measured*).
  `.svg` and `.excalidraw` are text.
- **Alternatives considered**: an extension allow-list (misclassifies unknown types); the `isbinaryfile`
  package (new dependency for one line).

## R3. Counting lines

- **Decision**: lines = the number of `\n` bytes, plus one when the file is non-empty and its last byte is
  not `\n`. Counted on the raw bytes with a loop over `Buffer.indexOf(10, from)`; the file is decoded to a
  string only when it needs comment scanning.
- **Rationale**: matches FR-008 and the three worked cases in the spec (`a\nb` = 2, `a\nb\n` = 2, empty = 0).
  CRLF needs no special case because the `\r` precedes the counted `\n`. A first prototype that split the
  decoded text on `\n` overcounted newline-terminated files by one, which is why the rule is written on bytes.

## R4. The comment scanner

- **Decision**: a table `Record<extension, CommentSyntax>` with `lineMarkers: string[]` and
  `blocks: {open: string; close: string}[]`, and one scanner. Per line, with `closer` carried between lines:
  - scan left to right; while inside a block look for the closer, otherwise skip whitespace and test, in
    this order, the block openers, then the line markers, else the character is code;
  - a line marker ends the line (the rest is comment); a block opener sets `closer`; any code character
    sets `hasCode`; reaching a comment sets `hasComment`; a line that starts inside a block has `hasComment`;
  - the line counts when `hasComment && !hasCode`. A blank line outside a block is neither; a blank line
    inside a block counts.
  - the table is the spec's FR-009 table: `.css` blocks only; the C-family list `//` and `/* */`; `.sql`
    `--` and `/* */`; `.lua` `--` and `--[[ ]]`; `.ps1` `#` and `<# #>`; `#`-only list; `<!-- -->` only for
    `.html` and `.xml`.
- **Rationale**: block openers are tested before line markers so `--[[` is not read as `--`. Scanning on
  after code is needed because `code /* start` must still open a block for the following lines. A `#!`
  line is a `#` line, so shell, Python and Ruby shebangs count with no special case. Python docstrings and
  `<script>` bodies are code by construction because their syntax is not in the table for that extension.
  Strings and regexes are not parsed (accepted limit).
- **Alternatives considered**: counting any line that contains comment text (needs string awareness,
  rejected in the clarification); a tokenizer or `strip-comments` package per language (new dependency,
  more code, still imperfect).

## R5. Reports come from one list of measured files

- **Decision**: read each file once and keep an array of `MeasuredFile` (path, group, file type, lines,
  comment lines, bytes). Every report is a filter over that array followed by a group-by on file type
  (and on top-level folder and group for `directories.md`).
- **Rationale**: simpler than the architecture's keyed accumulator and equally single-pass over the disk.
  The nine filters are one-liners, and `public.md`/`assets.md` (path prefixes below `dist/`) need no special
  case. Hundreds of thousands of small objects are well within memory.
- **Alternatives considered**: a multi-key accumulator (the architecture's Figure 6): it cannot serve the
  two nested prefixes without a second structure.

## R6. Ordering

- **Decision**: file types sort by plain code-unit order of the lower-cased type, so `(none)` comes first
  (`(` sorts before `.`); folders sort by plain code-unit order of the lower-cased name, so `.` is first
  and hidden folders follow it; ties break on the original spelling. No locale-aware comparison.
- **Rationale**: the same order on every machine and locale (the spec's "ignoring letter case, with `.`
  first"); `localeCompare` varies with the operating system's locale and ICU data.

## R7. Detecting a case-insensitive file system, and folding

- **Decision**: `detectCaseInsensitive(paths, pathExists)`: take the first listed path whose name has a
  letter and whose case-swapped spelling is not itself in the listing, and test whether the swapped path
  exists on disk. If it does the file system is case-insensitive. With no such path, report
  case-sensitive (there is nothing to fold). When case-insensitive, de-duplicate on the lower-cased path,
  keeping the first listed and reporting the other as skipped with the reason `duplicate (differs only in letter case)`, and fold top-level folder names, using the spelling returned by reading the
  project folder.
- **Rationale**: no probe file is written, so the "writes only under `manifests/`" rule and the
  "validation writes nothing" rule hold. On this repository (Linux, case-sensitive) nothing folds; the
  `designdocs`/`designDocs` entries are four missing paths that the skip rule counts.
- **Alternatives considered**: writing a probe file in the run folder (adds a write before the reports and
  a cleanup step); `os.platform()` (wrong for macOS case-sensitive volumes and Windows case-sensitive
  folders).

## R8. Skipping uncountable entries

- **Decision**: `lstat` each path; if it is not a regular file, skip it with the reason `symlink`,
  `directory` or `not a file`; a missing path is `missing`; a read that throws is `unreadable (<code>)`.
  The console prints the count and the first five `path: reason` pairs.
- **Rationale**: `lstat` does not follow links, so a link out of the project is never read. Four tracked
  paths are missing from this working tree (*measured*), so the case is real here.

## R9. The run folder and its name

- **Decision**: `formatRunFolderName(date)` builds `YYYY-MM-DD_HH-mm-ss` from the local getters (not
  `toISOString`, which is UTC). `mkdirSync(manifests, {recursive: true})`, then try `mkdirSync(manifests/name)`
  and on `EEXIST` retry with `name-2`, `name-3`, and so on. The folder is created after all tables are
  built, just before the reports are written.
- **Rationale**: a non-recursive `mkdir` is atomic, so two runs in one second cannot share a folder.
  Creating it last means a failure while measuring leaves nothing behind. Colons are not legal in Windows
  folder names, which rules out an ISO timestamp.

## R10. Argument handling and the working folder

- **Decision**: `parseArguments(argv, initCwd, cwd)`: exactly one argument; resolve it with
  `path.resolve(initCwd ?? cwd, argument)`; check it is a folder; check
  `git -C <dir> rev-parse --is-inside-work-tree` prints `true`. Any failure prints the usage line to
  standard error and exits 1 before any file is written.
- **Rationale**: `npm run` starts a script in the package root and reports where the shell was in
  `INIT_CWD` (verified with a test package: `process.cwd()` was the package root and `INIT_CWD` the
  subfolder). Without this a relative path would silently mean this repository.

## R11. Where the code lives, and the entry-point guard

- **Decision**: one file, `devScripts/file-manifest.ts`, of about 350 lines: exported pure functions, a
  thin shell, and `main()` that runs only when
  `import.meta.url === pathToFileURL(process.argv[1]).href` (checked under `tsx`: true when run, false when imported). Only erasable TypeScript syntax: no `enum`,
  `namespace` or parameter properties; `import type` for types.
- **Rationale**: `.gitignore` ignores everything in `devScripts/` except named files, so one file needs
  one exception line, and a helper folder would need more. Under Vitest `process.argv[1]` is the runner,
  so importing the module for a test does not run `main`. Plain `node` cannot run `.ts` on Node 22.22.1
  (`ERR_NO_TYPESCRIPT`), so the script runs through `tsx`, as the other three scripts do.
- **Alternatives considered**: a folder `devScripts/file-manifest/` with one file per concern (more
  ignore lines, more imports for a script that fits in one file); splitting only if the single file passes
  about 400 lines.

## R12. Performance

- **Decision**: no streaming and no worker threads. Read each file with `readFileSync`.
- **Rationale**: 880 files outside the exclusions read and measured in about 160 ms (*measured*); the
  largest file is 509 KB. SC-001 allows 10 seconds for 10,000 files and 2 seconds here, which is more than a
  tenfold margin.

## R13. Tests

- **Decision**: `tests/file-manifest.test.ts` (Vitest, matched by the existing
  `include: ["tests/**/*.test.ts"]`), importing `../devScripts/file-manifest.js` like the other tests import
  from `../src/...js`. Unit tests: byte arrays and strings for `isBinary`, `countLines`, `countCommentLines`
  (every syntax row, each rule in the spec's edge cases), `extensionOf`, `formatRunFolderName`,
  `isExcludedPath`, `detectCaseInsensitive`, `parseArguments`, `renderTable` and the row sorting. One
  integration test builds a throwaway repository in `os.tmpdir()` (`git init`, files added or left
  untracked, an ignore file, a deleted tracked file, a symlink where the platform allows it), runs
  `generateManifest`, and checks the reports and the totals identities of SC-003 and SC-004.
- **Rationale**: the pure functions need no repository, and the one integration test covers the git
  split and the skip rule. The global setup in `vitest.config.ts` still starts the shared PostgreSQL, so
  the suite runs in the usual way (`npm test`); the new test does not use the database.
- **Note**: the spec requires the pure rules to be testable without a repository on disk; the integration
  test is the single exception, as FR-020 allows.

## R14. Failures while writing

- **Decision**: if `manifests/` or the run folder cannot be created, or a report cannot be written, print
  `ERROR: <what> failed: <system message>` naming the path and exit 1. A report that was already written
  stays; the folder name is in the message.
- **Rationale**: this is the low-impact point the clarify pass left for planning. It follows FR-002's
  pattern of one clear message and a non-zero exit.

## R15. Package script, ignore rule and agent context

- **Decision**: add `"file-manifest": "tsx devScripts/file-manifest.ts"` to `package.json` scripts after
  `publish-assets`; add `!devScripts/file-manifest.ts` to `.gitignore` after
  `!devScripts/build-assets.ts`; point the `CLAUDE.md` plan reference at this plan.
- **Rationale**: FR-016 and FR-019. `/manifests/` is already ignored (done earlier, `.gitignore` line 29).

## R16. Type checking

- **Decision**: `tsconfig.json` is not changed. `devScripts/` stays outside `tsc`'s `include`; the quickstart
  gives a one-off `tsc --noEmit` command for the new file.
- **Rationale**: changing the compiler's `rootDir`/`include` to cover scripts is outside this feature and
  would affect `npm run build`; the other three scripts are in the same position.
