# Feature Specification: File Manifest Script

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "designDocs/028-high-level-requirements-FILE-MANIFEST-SCRIPT.md"

**Source requirements**: `designDocs/028-high-level-requirements-FILE-MANIFEST-SCRIPT.md` (every finding of the
architecture review is resolved). Where this specification and that document differ, this specification
governs: FR-006, FR-015 and FR-018 were revised after the requirements were written.
**Architecture**: `architecture/028-file-manifest-script/architecture.md` (10 findings, all resolved).
**Research**: `research/speckit-file-manifest/research.md`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Get a file manifest for a project (Priority: P1)

A developer wants to know what a project is made of: how many files of each type it holds, how many lines
of text, how many of those lines are comments, and how large its binary files are. They run one command and
name the project. The command writes a set of report files, each one a single table, into a new folder
named for the time of the run, under a `manifests` folder inside the project. The reports cover everything
in the project, the files that are not ignored by git, the files that are ignored by git, and a breakdown by
top-level folder.

**Why this priority**: This is the whole feature. Without the four always-written reports nothing else has
value.

**Independent Test**: Run the command against a small git repository built for the test (a few text files,
one image, one ignored file, one untracked file) and check the four reports against counts worked out by
hand.

**Acceptance Scenarios**:

1. **Given** a git repository, **When** the developer runs the command with its path, **Then** a new
   `manifests/<timestamp>/` folder exists in that repository containing `overall.md`, `not-gitignored.md`,
   `gitignored.md` and `directories.md`, each holding one table and no other text.
2. **Given** a repository with tracked, untracked and ignored files, **When** the reports are read, **Then**
   `overall.md` covers all three groups, `not-gitignored.md` covers the tracked and untracked files, and
   `gitignored.md` covers the ignored files, with `overall.md`'s file count equal to the other two added
   together.
3. **Given** the same repository, **When** `directories.md` is read, **Then** each top-level folder has one
   row per file type for each of the values `.gitignored`, `committed` and `untracked` it holds, files at the
   project root appear under `.`, and rows are in alphabetical order of folder name ignoring letter case.
4. **Given** any report, **When** its last row is read, **Then** it is a `**Total**` row that sums each
   column.
5. **Given** a repository with a `node_modules` folder or an earlier `manifests` folder, **When** the
   command runs, **Then** no file under either is counted in any report.

---

### User Story 2 - Break the totals down by area (Priority: P2)

The developer also wants separate totals for the build output (`dist`), the built public files
(`dist/public`), the built asset files (`dist/public/assets`), the source (`src`) and the tests (`tests`),
so they can see how much of the project is generated and how much is written by hand. Each of these reports
appears only when its folder exists and holds files.

**Why this priority**: It builds on the same counts as Story 1 and adds the per-area views the requirements
ask for, but the manifest is useful without it.

**Independent Test**: Run the command on a repository that has `src/` and `tests/` but no `dist/`, then on
one that also has `dist/public/assets/`, and check which of the five reports are written.

**Acceptance Scenarios**:

1. **Given** a project with a `dist` folder holding files, **When** the command runs, **Then** `dist.md`
   exists and counts every file under `dist/`, including ignored ones.
2. **Given** a project with no `dist` folder, **When** the command runs, **Then** `dist.md`, `public.md` and
   `assets.md` are not written.
3. **Given** a project with `dist/public/` but no `dist/public/assets/`, **When** the command runs, **Then**
   `public.md` is written and `assets.md` is not.
4. **Given** a project with `src/` and `tests/` holding files, **When** the command runs, **Then** `src.md`
   and `tests.md` exist and count every file under their folders.
5. **Given** a folder that exists but is empty or holds only excluded files, **When** the command runs,
   **Then** its report is not written.

---

### User Story 3 - Trust the numbers (Priority: P2)

The developer relies on the counts, so the rules must be exact and the same every time. A file is binary or
text by one fixed test. A text file's lines, blank lines included, are counted the same way whatever its
line endings. Comment lines are counted only for the languages the manifest knows, by one rule: a line
counts when it holds nothing but a comment, and a block comment counts every line it spans. Anything the
command cannot count is skipped, and the console says how many were skipped and why, without putting any of
that into a report.

**Why this priority**: A manifest with unclear rules cannot be compared between runs or between projects.

**Independent Test**: Run the content rules on small fixed inputs (a file ending without a newline, an empty
file, a CRLF file, a block comment with blank lines inside, a line of code with a trailing comment, a file
with a zero byte, a symlink, a file that has been deleted from the working tree) and check each result.

**Acceptance Scenarios**:

1. **Given** a text file `a\nb` and another `a\nb\n`, **When** they are counted, **Then** each has 2 lines;
   an empty file has 0 lines; a CRLF file counts the same as its LF twin.
2. **Given** a file with a zero byte in its first 8,000 bytes, **When** it is counted, **Then** it is binary:
   its size in bytes is added to the *Size* column and it adds no lines.
3. **Given** a TypeScript file with a three-line block comment (one line blank inside it), a line of code
   followed by a `//` comment, and a line holding only a `//` comment, **When** comment lines are counted,
   **Then** the result is 4 (three block lines plus the `//`-only line) and the code line is not counted.
4. **Given** a Markdown, JSON, SVG or plain-text file, **When** it is counted, **Then** its *Comment lines*
   cell is empty, and its *Lines* cell is filled.
5. **Given** a file git lists that is missing from the working tree, a symlink, a folder (such as a
   submodule) or an unreadable file, **When** the command runs, **Then** it is skipped, the run still
   succeeds, and the console prints the number skipped and the first five paths with the reason.
6. **Given** a file with no extension, or one such as `.gitignore` whose name only begins with a dot,
   **When** the files are grouped, **Then** it appears under the file type `(none)`, and extensions are
   grouped in lower case.
7. **Given** a case-insensitive file system and a file listed as both `designdocs/a.md` and
   `designDocs/a.md`, **When** the files are counted, **Then** it is counted once, the other spelling is
   skipped with the reason `duplicate (differs only in letter case)`, and the folder appears once in
   `directories.md` in the spelling on disk.

---

### User Story 4 - Run it again and compare (Priority: P3)

The developer runs the command again after changing the project, and later compares the runs. Each run
writes a new folder named for the local time it started, `YYYY-MM-DD_HH-mm-ss`; if that name is already
taken the command adds `-2`, `-3` and so on, so no run ever overwrites another. In this repository the
`manifests` folder is ignored by git, so the output does not appear as untracked work; in another project the
developer adds it to that project's ignore file, because the command edits no file outside `manifests/`.

**Why this priority**: It makes the output safe to keep and compare but does not change what is measured.

**Independent Test**: Run the command twice within the same second and check that two different folders
exist, the second one ending `-2`.

**Acceptance Scenarios**:

1. **Given** a project with no `manifests` folder, **When** the command runs, **Then** the folder is created
   and holds one new run folder.
2. **Given** a run folder with the current second's name already exists, **When** the command runs again,
   **Then** a second folder with the suffix `-2` is created and the first is untouched.
3. **Given** a finished run in this repository, **When** `git status` is run, **Then** `manifests/` does not
   appear.

---

### User Story 5 - Clear failures (Priority: P3)

The developer mistypes the path, forgets it, or points the command at a folder that is not a git
repository. The command stops before writing anything and prints a message saying how to use it.

**Why this priority**: It protects the project from stray output but is not part of the measuring.

**Independent Test**: Run the command with no argument, with a path to a file, with a folder that is not a
git repository, and with two arguments, and check each exits with an error and creates no folder.

**Acceptance Scenarios**:

1. **Given** no argument, a path that is not a folder, or a folder that is not a git repository, **When**
   the command runs, **Then** it prints a usage message, exits with a non-zero code, and writes nothing.
2. **Given** more than one argument, **When** the command runs, **Then** it prints
   `ERROR: Unrecognized argument(s): <args>. Usage: npm run file-manifest -- <project>`, exits with a
   non-zero code, and writes nothing.
3. **Given** a relative path typed in a subfolder of this repository, **When** the command runs, **Then**
   the path is resolved from the folder where it was typed, not from the repository root.
4. **Given** a path to a subfolder of a larger repository, **When** the command runs, **Then** that
   subfolder is treated as the project: its files, its top-level folders and its own `manifests` folder.

---

### Edge Cases

- A project with no ignored files: `gitignored.md` is still written, as a header row and a `**Total**` row
  of zeros. The same holds for any always-written report whose set is empty.
- A file type that mixes text and binary files (for example a `.dat` that is sometimes text): its row shows
  both a line count and a size.
- A tracked file that also matches an ignore rule counts as tracked (`committed`), not ignored.
- A file listed under two spellings that differ only in letter case, on a case-insensitive file system, is
  counted once and the other spelling is reported as skipped; on a case-sensitive file system the two names are kept apart and nothing is folded.
- A file type with no applicable measure has an empty cell, not a zero; a `**Total**` cell is `0` when
  nothing contributes.
- A literal pipe in a cell is written `\|` so the table keeps its shape.
- A `//` or `/*` at the start of a line inside a multi-line string is counted as a comment: strings and
  regular expressions are not parsed. This is an accepted limit.
- A file that is not valid UTF-8 but holds no zero byte counts as text.
- Python docstrings and the bodies of `<script>` and `<style>` inside HTML count as code, not comments; a
  `#!` first line counts as a comment line.
- The `.git` folder is never listed, so it is never counted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The command `npm run file-manifest -- <project>` MUST write the manifest for the project at
  `<project>`. The first argument is required. A relative path MUST be resolved from the folder the command
  was typed in, not the repository root, and the folder given MUST be treated as the project even when it is
  a subfolder of a larger repository.
- **FR-002**: The command MUST fail with a usage message and a non-zero exit code, writing nothing, when the
  argument is missing, is not a folder, or is not a git repository, or when more than one argument is given
  (`ERROR: Unrecognized argument(s): <args>. Usage: npm run file-manifest -- <project>`).
- **FR-003**: Which files are tracked, untracked and ignored MUST be decided by git's own listings, never by
  re-reading ignore files. Tracked and Untracked together are *not ignored*; all three together are
  *everything*.
- **FR-004**: Files under the top-level folders `node_modules`, `node-modules` and `manifests` MUST be left
  out of every report.
- **FR-005**: A listed path that is not a readable regular file (missing from the working tree, a symlink, a
  folder, or unreadable) MUST be skipped. The console MUST print the number skipped and the first five paths
  with the reason; none of this MUST appear in a manifest.
- **FR-006**: Files MUST be grouped by lower-cased extension with its dot; a file with no extension,
  including one whose name only begins with, or only ends with, a dot, MUST be grouped as `(none)`.
- **FR-007**: A file MUST be binary when a zero byte appears in its first 8,000 bytes; a binary file
  contributes its size in bytes and no lines, and a text file contributes its lines and no size.
- **FR-008**: A text file's lines MUST be the number of `\n` bytes plus one when the file is not empty and
  its last byte is not `\n`; blank lines count, an empty file has 0 lines, and LF and CRLF files count
  alike.
- **FR-009**: Comment lines MUST be counted only for the extensions in the syntax table below, as lines that
  hold nothing but a comment; a block comment counts every line it spans, and a line of code with a trailing
  comment counts as code. Any other file type MUST have an empty *Comment lines* cell.

  | Syntax | Extensions |
  |---|---|
  | `/* */` only | `.css` |
  | `//` and `/* */` | `.ts` `.tsx` `.js` `.jsx` `.mjs` `.cjs` `.scss` `.java` `.c` `.h` `.cpp` `.cs` `.go` `.rs` `.kt` `.swift` |
  | `--` and `/* */` | `.sql` |
  | `--` and `--[[ ]]` | `.lua` |
  | `#` and `<# #>` | `.ps1` |
  | `#` only | `.py` `.sh` `.rb` `.toml` `.yml` `.yaml` |
  | `<!-- -->` only | `.html` `.xml` |

- **FR-010**: Each run MUST create `manifests/` if missing and a new folder in it named for the local start
  time as `YYYY-MM-DD_HH-mm-ss`, adding `-2`, `-3` and so on when the name is taken, and MUST never
  overwrite an earlier run.
- **FR-011**: Each report MUST hold one markdown table and no other text, and MUST end in a `**Total**` row
  summing every column, with `0` where nothing contributes. A report whose set is empty MUST still be
  written, as the header row and a `**Total**` row of zeros.
- **FR-012**: `overall.md`, `not-gitignored.md` and `gitignored.md` MUST hold the columns *File type*,
  *Files*, *Lines*, *Comment lines* and *Size (bytes)* for everything, for not ignored, and for ignored, one
  row per file type sorted by file type.
- **FR-013**: `directories.md` MUST hold the columns *Directory*, *.gitignored*, *File type*, *Files*,
  *Lines*, *Comment lines* and *Size (bytes)*: *Directory* is the first path component (`.` for a file at
  the project root); *.gitignored* is `.gitignored` for ignored, `committed` for tracked and `untracked` for
  untracked files; rows are sorted by folder ignoring letter case with `.` first, then by *.gitignored*
  and file type; the `**Total**` row is last with `**Total**` in the *Directory* column.
- **FR-014**: `dist.md`, `public.md`, `assets.md`, `src.md` and `tests.md` MUST cover every file under
  `dist/`, `dist/public/`, `dist/public/assets/`, `src/` and `tests/` respectively, ignored or not, and MUST
  be written only when that folder exists and holds at least one counted file.
- **FR-015**: On success the console MUST print the output folder's path, the number of files counted,
  the number skipped (with the detail FR-005 requires) and the names of the reports written.
- **FR-016**: The command MUST be available as the `file-manifest` script of the project and MUST need no
  new dependency.
- **FR-017**: Each report MUST be UTF-8 without a byte-order mark, with `\n` line endings and a final
  newline; numbers MUST be plain integers; a literal pipe in a cell MUST be written `\|`.
- **FR-018**: The command MUST detect once, at the start, whether the file system is case-insensitive. If it
  is, folder names that differ only in letter case MUST form one row group in `directories.md`, shown
  with the spelling the folder listing returns, and a file listed under two spellings MUST be counted
  once, the other spelling being skipped with the reason `duplicate (differs only in letter case)` so that
  counted plus skipped still equals listed. If it is not, nothing MUST be folded.
- **FR-019**: The project's ignore file MUST give the command's script an exception beside those of the
  other scripts, so the script is committed. (`/manifests/` is already ignored.)
- **FR-020**: The rules for the binary test, line count, comment count, folder grouping and table text
  MUST be separately testable without a repository on disk, and MUST be covered by automated tests, plus one
  test that builds a throwaway git repository to check the tracked, untracked and ignored split and the
  skipping of a missing file.

### Key Entities *(include if feature involves data)*

- **Project**: the folder named by the argument, a git repository or a subfolder of one; the only place the
  command writes (`<project>/manifests/`).
- **File group**: Tracked, Untracked or Ignored, exactly one per counted file; *not ignored* and *everything*
  are unions of them.
- **File type**: the lower-cased extension (or `(none)`) a file is grouped under.
- **Measure**: for a file type, its file count, text line count, comment line count and binary size in bytes.
- **Report**: one markdown file holding one table; nine are possible per run, four always written.
- **Run folder**: `manifests/YYYY-MM-DD_HH-mm-ss` (with an optional `-2`, `-3`), unique per run.
- **Skipped entry**: a listed path that could not be counted, reported on the console only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a project of 10,000 files the command finishes in under 10 seconds on the developer's
  Windows 11 machine, and on this repository (about 900 files outside `node_modules`) in under 2 seconds.
- **SC-002**: For every run, the files counted plus the files skipped equal the files git listed (after the
  three exclusions), so no listed file is silently lost.
- **SC-003**: For every run, `overall.md`'s *Files* total equals the sum of the *Files* totals of
  `not-gitignored.md` and `gitignored.md`, and `directories.md`'s totals equal `overall.md`'s in every
  column.
- **SC-004**: In every report, each column's `**Total**` equals the sum of the rows above it.
- **SC-005**: On a set of fixed fixture files covering every rule in the Edge Cases and User Story 3
  (unterminated last line, empty file, CRLF, zero byte, block comment, trailing comment, symlink, missing
  file), 100% of line, size and comment counts match the values worked out by hand.
- **SC-006**: Two runs started in the same second produce two separate folders and neither changes the
  other; no file outside `<project>/manifests/` is created or changed by any run.
- **SC-007**: A mistyped or missing argument is rejected with a usage message within 3 seconds of the command being
  started, runner start-up included, and leaves the project untouched, in every one of the cases listed in User Story 5.
- **SC-008**: A reader can understand any report with no explanation beside it: every report is a table
  with a header row and a `**Total**` row, and nothing else.

## Assumptions

- The project is a git repository and `git` is available on the machine running the command.
- The `node-modules` of the requirements is the `node_modules` folder; both spellings are excluded.
- Text files are UTF-8; a file that is not valid UTF-8 but has no zero byte counts as text.
- Reading each file whole is acceptable: the largest file in this repository is about 0.5 MB.
- The ignored set is whatever git reports as ignored, which includes nested ignore files, the repository's
  own exclude file and the user's global ignore rules, not only the root ignore file.
- The comment counter does not parse strings, template literals or regular expressions, so a comment marker
  at the start of a line inside a multi-line string is miscounted. This is an accepted limit.
- Scope limits: no per-file listing, no git history or authorship, no report beyond the nine, no comment
  count for Markdown, JSON, SVG or plain text, no text beside a table, and no standalone copy or port of the
  command to another language.
- The command is built as TypeScript run through `tsx` in the project's `devScripts` folder, using only
  erasable TypeScript syntax and Node's built-in modules, and is tested with Vitest, following the
  project's other scripts (a constraint from the requirements, recorded here because it fixes how the
  command is run).
- The developer's machine is Windows 11 with Node 22 or later, so run-folder names avoid characters that
  are illegal on Windows.
- The titles "Generated Files" on the `src` and `tests` reports in the requirements do not change what they
  count: every file under the folder.
- The command prints no progress while it runs.
