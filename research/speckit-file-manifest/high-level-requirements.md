Start a new spec for these requirements called `028-FILE-MANIFEST`.

# Overview

A command-line script that writes a **file manifest** for a project: how many files of each type it holds,
how many lines they contain, how many of those lines are comments, and how large its binary files are. The
project is named by the script's first argument. The results are written as a set of markdown files, each
holding one table and nothing else, in a new timestamped folder under the project's `manifests` folder.

The main purposes of the script are:

- count the files of each type (extension);
- count the lines in each text file;
- report the size of each binary file;
- count the comment lines in each file written in a common programming language.

# Design

## The script

The script is TypeScript in `devScripts/file-manifest.ts`, run through `tsx` as `npm run file-manifest --
<project>`, like the other scripts in `devScripts/`. It uses only erasable TypeScript syntax and Node
built-ins, so a later move to plain JavaScript is a rename. It needs the `git` command on the path, because
git alone decides which files are ignored. It changes nothing under `src/`, the build, the deployment spec
or the existing tests.

## Which files are counted

The files of a project are the union of three git listings:

| Set | Meaning |
|---|---|
| Tracked | Files git tracks |
| Untracked | Files git does not track and does not ignore |
| Ignored | Files git does not track and `.gitignore` ignores |

*Not ignored* is Tracked plus Untracked. *Everything* is all three. Files under the top-level directories
`node_modules`, `node-modules` and `manifests` are left out of every report. The `.git` folder is never
listed by git and so is never counted. A file git lists but that is missing from the working tree is
skipped, and the console reports how many were skipped.

## What is measured

| Measure | Rule |
|---|---|
| File type | The lower-cased extension of the file name, with its dot (`.ts`). A name with no extension, including a name that only begins with a dot such as `.gitignore`, is `(none)` |
| Binary file | A file with a NUL byte in its first 8,000 bytes, the rule git itself uses. Every other file is a text file |
| Lines | For a text file, the number of lines, counting a last line that has no final newline and counting blank lines. LF and CRLF files count alike |
| Size | For a binary file, its size in bytes |
| Comment lines | For a text file in a recognised language, the lines that hold nothing but a comment. A block comment counts every line it spans. A line holding code and a trailing comment counts as code |

The recognised comment syntaxes, by extension:

| Syntax | Extensions |
|---|---|
| `//` and `/* */` | `.ts` `.tsx` `.js` `.jsx` `.mjs` `.cjs` `.css` `.scss` `.java` `.c` `.h` `.cpp` `.cs` `.go` `.rs` `.kt` `.swift` |
| `#` | `.py` `.sh` `.ps1` `.yml` `.yaml` `.rb` `.toml` |
| `--` | `.sql` `.lua` |
| `<!-- -->` | `.html` `.xml` |

A file with any other extension, including `.md`, `.json`, `.svg` and `.txt`, has no comment count.

## The output folder

The script creates `manifests` in the project folder if it is missing, and inside it a folder named for the
local time the script started, in the form `YYYY-MM-DD_HH-mm-ss`, which is legal on Windows, macOS and
Linux. If that folder already exists the script appends `-2`, `-3` and so on until it creates a new one, so
two runs never share a folder.

## The tables

Every manifest file holds one markdown table, with a header row and no other text, no title and no
footnote. Every table except `directories.md` has these columns:

| File type | Files | Lines | Comment lines | Size (bytes) |
|---|---|---|---|---|

- One row per file type, sorted by file type, then a final `**Total**` row that sums every column.
- *Lines* is filled for text files only, *Comment lines* only for text files in a recognised language, and
  *Size* only for binary files. A cell that does not apply is left empty.
- A file type that mixes text and binary files shows both its line count and its size.

## The reports

| File | Contents | Written when |
|---|---|---|
| `overall.md` | Everything | Always |
| `not-gitignored.md` | Tracked and Untracked | Always |
| `gitignored.md` | Ignored | Always |
| `directories.md` | Everything, grouped by top-level directory | Always |
| `dist.md` | Everything under `dist/` | `dist/` exists and holds files |
| `public.md` | Everything under `dist/public/` | `dist/public/` exists and holds files |
| `assets.md` | Everything under `dist/public/assets/` | `dist/public/assets/` exists and holds files |
| `src.md` | Everything under `src/` | `src/` exists and holds files |
| `tests.md` | Everything under `tests/` | `tests/` exists and holds files |

`directories.md` has these columns:

| Directory | .gitignored | File type | Files | Lines | Comment lines | Size (bytes) |
|---|---|---|---|---|---|---|

- *Directory* is the first path component of each file, and `.` for a file at the project root. Directories
  that differ only in letter case, as `designdocs` and `designDocs` do on a case-insensitive file system,
  are one row group, shown with the spelling on disk.
- *.gitignored* is `.gitignored` for the Ignored set, `committed` for the Tracked set and `untracked` for
  the Untracked set. Each directory has one row per value and file type it holds.
- Rows are sorted by directory name, ignoring letter case, with `.` first, then by *.gitignored* and file
  type. The `**Total**` row is last, with `**Total**` in the *Directory* column.

# Functional Requirements

- **FR-001.** `npm run file-manifest -- <project>` writes the manifest for the project at `<project>`. The
  first argument is required.
- **FR-002.** The script fails with a usage message and a non-zero exit code when the argument is missing,
  is not a directory, or is not a git repository. It writes nothing in that case.
- **FR-003.** Ignored and not-ignored files are decided by git's own listings (Tracked, Untracked, Ignored),
  never by re-reading `.gitignore`.
- **FR-004.** Files under the top-level directories `node_modules`, `node-modules` and `manifests` are
  excluded from every report.
- **FR-005.** A file git lists that is missing from the working tree is skipped; the number skipped is
  printed on the console and never written into a manifest.
- **FR-006.** Files are grouped by lower-cased extension, and a file with no extension is `(none)`.
- **FR-007.** A file is binary when a NUL byte appears in its first 8,000 bytes. A binary file contributes
  its size in bytes and no lines. A text file contributes its lines and no size.
- **FR-008.** A text file's lines are counted by `\n`, include blank lines and a final line without a
  newline, and count LF and CRLF files alike.
- **FR-009.** Comment lines are counted for the extensions in the syntax table only, by the rule in *What is
  measured*. Any other file type has an empty *Comment lines* cell.
- **FR-010.** The script creates `manifests/` if missing and a new `YYYY-MM-DD_HH-mm-ss` folder in it for
  each run, adding `-2`, `-3` and so on when the name is taken. It never overwrites a previous run.
- **FR-011.** Each manifest file holds one markdown table and nothing else, and ends in a `**Total**` row
  summing every column.
- **FR-012.** `overall.md`, `not-gitignored.md` and `gitignored.md` hold the columns *File type*, *Files*,
  *Lines*, *Comment lines* and *Size (bytes)* for Everything, Tracked plus Untracked, and Ignored.
- **FR-013.** `directories.md` holds the columns and ordering described under *The reports*, including the
  three *.gitignored* values `.gitignored`, `committed` and `untracked`.
- **FR-014.** `dist.md`, `public.md`, `assets.md`, `src.md` and `tests.md` are written only when their
  directory exists and holds at least one counted file; otherwise the file is omitted.
- **FR-015.** The console prints the output folder's path, the number of files counted and the number
  skipped when the run succeeds.
- **FR-016.** The script is added to `package.json` as `"file-manifest": "tsx devScripts/file-manifest.ts"`
  and needs no new dependency.

# Assumptions

- The project is a git repository and `git` is on the path of the machine running the script.
- The `node-modules` in the requirements is the `node_modules` directory; both spellings are excluded, so
  the assumption costs nothing if it is wrong.
- Text files are UTF-8. A file that is not valid UTF-8 but has no NUL byte is counted as text.
- The developer's machine is Windows 11 with Node 22 or later, which is why the script avoids shell-specific
  tooling and illegal Windows folder-name characters.
- Reading each file whole is acceptable. The largest file in this repository is about 0.5 MB.
- "Everything" includes files under `dist/`, so `dist.md`, `public.md` and `assets.md` count the build
  output even though it is ignored.
- The titles "Generated Files" on the `src` and `tests` reports do not change what they count; each report
  counts every file under its directory.

# Exclusions

- A standalone, dependency-free version of the script, and ports to PowerShell, Python, Bash, Go or Rust.
- Counting `node_modules`, `node-modules`, `manifests` or `.git`.
- Counting lines that hold code and a trailing comment as comment lines, and any string- or regex-aware
  comment parsing.
- A comment count for Markdown, JSON, SVG, plain text or any extension not in the syntax table.
- Any text beside the table in a manifest file: a title, a date, a legend or a note.
- Per-file listings, git history, authorship, or any report beyond the nine above.
- Changes to `src/`, the build, the deployment spec or the existing tests.
