# Overview 

## Document History

| Record | Value |
|---|---|
| Research directory | research/speckit-file-manifest/research.md |
| Research results file created | 2026-10-08 11:54 |
| Last updated | 2026-10-08 14:04 |

Legend: `[ ]` open · `[X]` resolved · `[-]` resolved manually (or accepted as-is) by the developer.

"What's next" always returns the first `[ ]` item.  

# High Level Requirements  

We want to create a script that will generate a File Manifest for the current project.  
The path to the current project will be specified as the first argument to the script.  

The main purposes of the script are:  
- count the number of files of various types (extension)
- the total number of lines in each file if it is not a binary file
- the size of the file if it is a binary file
- the count of comment lines in the file if it is a file written in a common programming language

## Recommended Implementation  

The first part of this research is to suggest the most appropriate programming language or scripting language for implementing the script.  

Part of this research will involve evaluating the pros and cons of different languages in terms of ease of use, performance, and compatibility with common project structures.

## Output Manifest Files

The script will generate various manifest files summarizing the collected information.  
The manifest files will be markdown format, i.e. .md file extension.  
The manifest files will contain only a markdown table with no additional text.  

The manifest files will be placed in a directory called `manifests` within the project directory.  
If the `manifests` directory does not exist, the script will create it.  
Under the `manifests` directory, the script will create a folder with the name that is the timestamp of when the script started.  
Of course, the script will ensure that the directory name is unique and is a properly formed directory name.  

For all the manifest reports described below, if the top level directory 'node-modules' exists, it will be excluded from the counts and summaries.
For all the manifest reports described below, if the top level directory 'manifests' exists, it will be excluded from the counts and summaries.


### Overall Totals Groups by File Extension

A file will be generated called `overall.md`.  
This will include all files in the project, regardless of whether they are .gitignored or not.  
This will include a table of the following columns:  
- file type
- total file count
- total lines (for non-binary files)
- total comment lines (for non-binary files that are written in a common programming language)
- total file size (for binary files)

An appropriate table header will be generated.

### Total of Files Not .gitignored

A file will be generated called `not-gitignored.md`.  
This will include all files in the project that are not .gitignored.  
This will include a table of the following columns:  
- file type
- total file count
- total lines (for non-binary files)
- total comment lines (for non-binary files that are written in a common programming language)
- total file size (for binary files)

An appropriate table header will be generated.

### Total of Files That Are .gitignored

A file will be generated called `gitignored.md`.  
This will include all files in the project that are .gitignored.  

This will include a table of the following columns:  
- file type
- total file count
- total lines (for non-binary files)
- total comment lines (for non-binary files that are written in a common programming language)
- total file size (for binary files)

An appropriate table header will be generated.

### Total of Files Groups by Top Level Directory

This manifest will summarize the total of files grouped by their top-level directory.  
This includes all sub-directories under each top-level directory.  
 
A file will be generated called `directories.md`.  
This will include a table of the following columns:  
- directory name
- .gitignored 
- file type
- total file count
- total lines (for non-binary files)
- total comment lines (for non-binary files that are written in a common programming language)
- total file size (for binary files)

The possible column values for the .gitignored column are:  
- .gitignored
- committed

The directory names will appear in the table in alphabetical order.
An appropriate table header will be generated.

### Total of Generated Files That Are the dist Directory 

If there is a top level directory called `dist`, this section will summarize the total of files within that directory, and sub-directories under it.  
If there is no top level directory called `dist`, this section will be omitted.  

A file will be generated called `dist.md`.  
This will include a table of the following columns:  
- file type
- total file count
- total lines (for non-binary files)
- total comment lines (for non-binary files that are written in a common programming language)
- total file size (for binary files)

An appropriate table header will be generated.

### Total of Generated Files That Are the public Directory 

If there is a directory under `dist` called `public`, this section will summarize the total of files within that directory, and sub-directories under it.    
If there is no directory under `dist` called `public`, this section will be omitted.  

A file will be generated called `public.md`.  
This will include a table of the following columns:  
- file type
- total file count
- total lines (for non-binary files)
- total comment lines (for non-binary files that are written in a common programming language)
- total file size (for binary files)

An appropriate table header will be generated.

### Total of Generated Files That Are the dist/public/assets Directory 

If there is a directory under `dist/public` called `assets`, this section will summarize the total of files within that directory, and sub-directories under it.    
If there is no directory under `dist/public` called `assets`, this section will be omitted.  

A file will be generated called `assets.md`.
This will include a table of the following columns:  
- file type
- total file count
- total lines (for non-binary files)
- total comment lines (for non-binary files that are written in a common programming language)
- total file size (for binary files)

An appropriate table header will be generated.


### Total of Generated Files That Are the src Directory 

If there is a top level directory called `src`, this section will summarize the total of files within that directory, and sub-directories under it.    
If there is no top level directory called `src`, this section will be omitted.  

A file will be generated called `src.md`.
This will include a table of the following columns:  
- file type
- total file count
- total lines (for non-binary files)
- total comment lines (for non-binary files that are written in a common programming language)
- total file size (for binary files)

An appropriate table header will be generated.

### Total of Generated Files That Are the tests Directory 

If there is a top level directory called `tests`, this section will summarize the total of files within that directory, and sub-directories under it.    
If there is no top level directory called `tests`, this section will be omitted.  

A file will be generated called `tests.md`.
This will include a table of the following columns:  
- file type
- total file count
- total lines (for non-binary files)
- total comment lines (for non-binary files that are written in a common programming language)
- total file size (for binary files)

An appropriate table header will be generated.









# Research Findings

Measured on 2026-10-08 against this repository (Node v22.22.1, git 2.53.0, Python 3.14.4 in the sandbox; the developer's primary environment is Windows 11 / PowerShell, `CLAUDE.md` line 254). A throwaway prototype (not committed, scratchpad only) listed and read every file in 158 ms: 880 files outside `node_modules` and `manifests` (679 not ignored, 201 ignored), 10 binary, 215,554 lines. The `git ls-files` calls it relied on take about 57 ms for the 14,365 ignored paths including `node_modules`. Speed is not a differentiator between languages here.

## Recommended Implementation

**What was found**
- The repo's own tooling is TypeScript run through `tsx`: `devScripts/reconcile.ts`, `build-assets.ts` and `publish-assets.ts` are `.ts` files with a `Usage:` doc comment (`devScripts/reconcile.ts:1-5`), launched by `npm run` scripts (`package.json:10-17`). `tsx` is a dev dependency (`package.json:39`), the package is ESM (`package.json:6`) and requires Node >= 22 (`package.json:7-9`).
- `devScripts/` is outside `tsconfig.json`'s `include` (`src/**/*.ts`), so `tsc` does not type-check scripts there; `tsx` strips types without checking them.
- Plain `node` cannot run a `.ts` file here: `node t.ts` fails with a `SyntaxError`, and `node --experimental-strip-types t.ts` fails with `ERR_NO_TYPESCRIPT` on v22.22.1. `npx tsx t.ts` runs. So a TypeScript script needs `tsx` (or a newer Node) wherever it runs.
- Windows 11 is the developer's primary environment. `pwsh` and `bash` are not guaranteed there; Python is not a project dependency (no `.py` files, no Python tooling in `package.json` or `.do/app.yaml`).
- Exact `.gitignore` semantics (nested `.gitignore` files, `.git/info/exclude`, the user's global excludes) are only reproduced reliably by git itself. `git ls-files -z` (tracked), `git ls-files -z -o --exclude-standard` (untracked, not ignored) and `git ls-files -z -o -i --exclude-standard` (ignored) between them cover every file git knows, never list `.git/`, and handle odd file names with `-z`. The `ignore` npm package is not installed (`node_modules/ignore` is absent).

**Comparison**

| Language | Ease of use | Performance | Compatibility with common project structures |
|---|---|---|---|
| TypeScript on `tsx` | Matches the repo's conventions; typed; needs `npm ci` first | Fast enough (measured above) | Any OS with Node >= 22; to run against another project, invoke this repo's script by path, with `tsx` available |
| Plain ESM JavaScript (`.mjs`, no dependencies) | One file, `node file.mjs <path>`; no types (JSDoc only) | Same as above | Any machine with Node; no install step |
| PowerShell | Native on the developer's machine; weak at streaming text and regex-heavy comment scanning; slow per-file loops | Noticeably slower on tens of thousands of files | Windows-first; PowerShell 7 needed elsewhere |
| Python | Good text handling, stdlib has everything needed | Fast | Not a project dependency; not guaranteed on Windows |
| Bash | Terse for listing; poor for comment parsing and for tables | Fast on Unix | Not available natively on Windows |
| Go / Rust | Single static binary, fastest | Fastest | A new toolchain and build step for a script that takes 158 ms in Node; unjustified |

**What it would take**
A single new file (about 300-400 lines) plus one `package.json` script entry (for example `"file-manifest": "tsx devScripts/file-manifest.ts"`). No change to `src/`, the build, the DigitalOcean spec or any existing test.

**Recommendation**
TypeScript in `devScripts/file-manifest.ts`, run through `tsx` with a new `package.json` script `"file-manifest": "tsx devScripts/file-manifest.ts"` (resolved: Option 1 of *Script language and portability*). It follows the other three `devScripts`, is typed, and needs no new dependency. Use only erasable TypeScript syntax and Node built-ins (`node:child_process`, `node:fs`, `node:path`), so a later move to plain `.mjs` stays a rename plus removing annotations. Alternatives rejected: a dependency-free `.mjs` (portable, but untyped and unlike the neighbouring scripts), PowerShell, Python, Bash and Go/Rust (reasons in the table above).

## Output Manifest Files

**What was found**
- `node_modules/` is the first line of `.gitignore` (`.gitignore:1`) and is the only dependency directory in the project. The requirements say `node-modules` (hyphen); no such directory exists. This reads as a typo for `node_modules`.
- `dist/` is ignored (`.gitignore:2`); `dontTrack/`, `fileRemote/`, `.vscode/launch.json` and `devScripts/launch-dev.ps1` are ignored too, so the ignored set is not just build output.
- The prototype found 4 paths that `git ls-files` returns but that are missing on disk (`git ls-files -d`: `designdocs/skills/speckit-mdd-architecture/SKILL.md`, `designdocs/speckit-mdd-architecture/requirements.md`, `prototypes/FILE-REMOTE-SKILL/SKILL.md`, `prototypes/FILE-REMOTE-SKILL/iterative-requirements.md`). A script that reads every listed file must skip files absent from the working tree, or it will crash on this repository.
- Windows file systems are case-insensitive, and the index here holds both `designdocs/` and `designDocs/` spellings (see the `git status` list at the top of the session). Counting by the listed path can therefore count a file twice or miss it; skipping missing files and reading from the working tree avoids a crash but not a double count.
- Colons are not legal in Windows directory names, so an ISO timestamp such as `2026-10-08T13:25:00` cannot be a directory name as written.

**What it would take**
- Exclude, by first path component, `node_modules` and `node-modules` (both spellings, harmless) and `manifests`. `.git` is never listed by `git ls-files`, so it needs no rule.
- Create `<project>/manifests/` if absent (`mkdir` recursive), then `manifests/<YYYY-MM-DD_HH-mm-ss>/` from the local start time, created with a non-recursive `mkdir`. On `EEXIST`, retry with a `-2`, `-3` suffix, which guarantees uniqueness without a race. The characters are all legal on Windows, macOS and Linux.
- Skip tracked paths that are missing on disk and report the count on the console (not in the manifest files, which must hold only a table).
- Require the project path as the first argument; fail with a usage message if it is missing, is not a directory, or is not a git repository (the ignored/not-ignored split is meaningless otherwise).
- `manifests/` is not in `.gitignore`, so after a run it shows up as untracked output. Adding `manifests/` to `.gitignore` is outside this research's scope (see *Also noticed*).

**Recommendation**
Implement as above. Treat the requirements' `node-modules` as `node_modules`, and exclude both spellings. Use the `YYYY-MM-DD_HH-mm-ss` directory name with a numeric suffix on collision.

## Overall Totals Groups by File Extension

**What was found**
- "All files regardless of .gitignore" is the union of three git listings: tracked, untracked-not-ignored and ignored (`git ls-files -z`, `-o --exclude-standard`, `-o -i --exclude-standard`). In this repository that is 880 files after exclusions.
- Extension grouping already exists as a convention: `path.extname(name)` in `devScripts/build-assets.ts:19`. Extensions in the tracked set include `.md` (331), `.ts` (135), `.js` (62), `.css` (60), `.html` (32), `.json` (11), `.jpg` (9), `.ps1` (8), `.svg` (7), `.yml` (4), `.excalidraw` (4), `.yaml`, `.sh`, `.png`, `.registry`, and two dotfiles with no extension (`.gitignore`, `.specify/extensions/.registry`). No extension has mixed case today.
- Binary detection: git itself treats a file as binary when a NUL byte appears in its first 8,000 bytes. The prototype used that rule and classified 10 files binary in the working set (the 9 `.jpg` plus the `.png`); `.svg` and `.excalidraw` are text. An extension list would misclassify unknown types; the NUL test needs no list.
- Line counting: splitting on `\n` handles both LF and CRLF files; the last line is counted whether or not it ends in a newline.
- Largest file is 509 KB (`prototypes/POLL-CARD-MATERIAL3/iterative-requirements.md`), so reading whole files into memory is safe.

**What it would take**
One pass over the union, accumulating per extension: file count, text-file lines, comment lines (text files in a recognised language) and bytes (binary files). Render one markdown table with no other text.

**Recommendation**
Comment lines are counted per Option 1 of *What counts as a comment line* (resolved): lines holding only a comment, block comments counted per line spanned, trailing comments counted as code, no count for Markdown, JSON, SVG, text or unknown extensions. The table ends in a final `**Total**` row summing every column (resolved: Option 2 of *Totals row*); cells that do not apply are left empty. The grouping, binary rule and line rule above stand: group by lower-cased `path.extname`, with dotfiles such as `.gitignore` grouped under their own name (shown as `(none)` for names with no extension), binary by NUL-in-first-8,000-bytes, lines by `\n` count.

## Total of Files Not .gitignored

**What was found**
The not-ignored set is `git ls-files -z` plus `git ls-files -z -o --exclude-standard`: 679 files after exclusions today. The second listing is 10 files (6 under `prototypes/`, 3 under `.claude/`, 1 under `research/`), untracked but not ignored. No tracked file is also ignored (`git ls-files -ci --exclude-standard` returns nothing).

**What it would take**
The same accumulator as `overall.md` over a smaller input. No extra code beyond the set definition.

**Recommendation**
Comment lines follow the resolved *What counts as a comment line* (Option 1); each table ends in a final `**Total**` row summing every column (resolved: Option 2 of *Totals row*). The set definition stands: tracked plus untracked-not-ignored, so it equals `overall.md` minus `gitignored.md`.

## Total of Files That Are .gitignored

**What was found**
The ignored set is `git ls-files -z -o -i --exclude-standard`: 201 files after excluding `node_modules` and `manifests` (all of `dist/`, plus `dontTrack/`, `fileRemote/`, `.vscode/launch.json`, `.vscode/launch.jsonbackup`, `devScripts/launch-dev.ps1`, `devScripts/password-cycling-HOWTO.md`). Because `node_modules/` is the dominant ignored directory (about 14,000 files), the exclusion rule decides whether this report describes the project or its dependencies.

**What it would take**
The same accumulator over the ignored listing.

**Recommendation**
Comment lines follow the resolved *What counts as a comment line* (Option 1); each table ends in a final `**Total**` row summing every column (resolved: Option 2 of *Totals row*). The set definition stands.

## Total of Files Groups by Top Level Directory

**What was found**
- The top-level directory of a listed path is its first component; files at the project root have none. The repo has root files (`CLAUDE.md`, `package.json`, `tsconfig.json`, ...) alongside directories such as `src`, `tests`, `specs`, `designDocs`, `architecture`, `prototypes`, `research`.
- The `.gitignored` column takes two values in the requirements: `.gitignored` and `committed`. A third group exists today: 10 untracked, not-ignored files (see above). They are neither committed nor ignored.
- Case-insensitive file systems list `designdocs/` and `designDocs/` as distinct strings (see *Output Manifest Files*), which would produce two rows for one folder on Windows if grouped by exact string.

**What it would take**
Group by (top-level directory, ignored flag, extension) and sort by directory name. Use a locale-independent, case-insensitive comparison for the sort so the order is the same on every machine. Fold directory names that differ only in case into one row, using the spelling on disk.

**Recommendation**
The `.gitignored` column takes three values: `.gitignored`, `committed` (tracked) and `untracked` (not tracked, not ignored), each its own row (resolved: Option 2 of *Untracked files in directories.md*). Comment lines follow the resolved *What counts as a comment line* (Option 1); each table ends in a final `**Total**` row summing every column (resolved: Option 2 of *Totals row*). Files at the project root are shown under the directory name `.` (the conventional name for the current directory); sorting is case-insensitive with `.` first.

## Total of Generated Files That Are the dist Directory

**What was found**
`dist/` exists at the top level and is ignored (`.gitignore:2`). The section's title says "generated", which is accurate for `dist/`.

**What it would take**
Filter the union by `dist/` prefix; omit `dist.md` entirely when `dist/` is absent or holds no files. The requirement says to omit the section, so no empty file is written.

**Recommendation**
Comment lines follow the resolved *What counts as a comment line* (Option 1); each table ends in a final `**Total**` row summing every column (resolved: Option 2 of *Totals row*). Condition and filter stand.

## Total of Generated Files That Are the public Directory

**What was found**
`dist/public/` exists. A second `public` directory exists at `src/public/`; the requirement says "under `dist`", which is unambiguous, and `public.md` is the only file name given, so `src/public` is not covered by any report except `src.md`.

**What it would take**
Filter by the `dist/public/` prefix; omit `public.md` when absent.

**Recommendation**
Comment lines follow the resolved *What counts as a comment line* (Option 1); each table ends in a final `**Total**` row summing every column (resolved: Option 2 of *Totals row*). Condition and filter stand.

## Total of Generated Files That Are the dist/public/assets Directory

**What was found**
`dist/public/assets/` exists with 37 files in 37 hash-named subdirectories (one file each). The generated files are `.js`, `.css` and `.svg` copies of `src/public` (`devScripts/build-assets.ts:12`), so `assets.md` will largely repeat `public.md` minus the HTML pages and the manifest.

**What it would take**
Filter by the `dist/public/assets/` prefix; omit `assets.md` when absent.

**Recommendation**
Comment lines follow the resolved *What counts as a comment line* (Option 1); each table ends in a final `**Total**` row summing every column (resolved: Option 2 of *Totals row*). Condition and filter stand.

## Total of Generated Files That Are the src Directory

**What was found**
`src/` exists at the top level and is tracked. Its title says "Generated Files" but `src/` is hand-written source; only the file name and filter matter.

**What it would take**
Filter by the `src/` prefix; omit `src.md` when absent.

**Recommendation**
Comment lines follow the resolved *What counts as a comment line* (Option 1); each table ends in a final `**Total**` row summing every column (resolved: Option 2 of *Totals row*). Condition and filter stand; the title's word "Generated" does not change behaviour.

## Total of Generated Files That Are the tests Directory

**What was found**
`tests/` exists at the top level and is tracked. Same wording point as `src`.

**What it would take**
Filter by the `tests/` prefix; omit `tests.md` when absent.

**Recommendation**
Comment lines follow the resolved *What counts as a comment line* (Option 1); each table ends in a final `**Total**` row summing every column (resolved: Option 2 of *Totals row*). Condition and filter stand.

Also noticed: `manifests/` is not in `.gitignore`, so each run leaves untracked output in the working tree; the requirements exclude it from the counts but do not say whether to ignore it.

# Clarifications

## Clarification## Script language and portability
[X] Resolved
The requirements ask for the most appropriate language. The comparison is under *Recommended Implementation*. The deciding question only the developer can answer is whether this is a tool for this repository or a tool to point at other projects ("the path to the current project" is an argument, which suggests the latter). Plain `node` here cannot run TypeScript (`ERR_NO_TYPESCRIPT` on v22.22.1), so TypeScript always needs `tsx` present.
### Recommendation
#### Option 1
TypeScript in `devScripts/file-manifest.ts`, run with `npm run file-manifest` (`tsx`).
- Pros: matches `reconcile.ts`, `build-assets.ts` and `publish-assets.ts`; typed; the repo already pins `tsx`.
- Cons: needs `npm ci` first; running it against another project means calling this repo's script by path with `tsx` available; `tsc` does not type-check `devScripts/`.
#### Option 2
One dependency-free ES module, `devScripts/file-manifest.mjs`, run with `node devScripts/file-manifest.mjs <project>`.
- Pros: runs anywhere Node >= 22 and git exist, with no install step; can be copied to another machine as a single file.
- Cons: no TypeScript; types only by JSDoc comments; differs from the other three scripts.

Recommended: Option 1. The only stated target today is this project, the whole team toolchain already has `tsx`, and a typed script is easier to extend with more languages. Choose Option 2 if you expect to run it on projects without a `package.json`.

### RESOLUTION
Option 1 taken: TypeScript in `devScripts/file-manifest.ts`, run with `npm run file-manifest` (`tsx`). Recorded on the recommendation, as no option was named (2026-10-08 13:58).

## Clarification## Untracked files in directories.md
[X] Resolved
`directories.md` has a `.gitignored` column whose only values are `.gitignored` and `committed`. Ten files today (6 under `prototypes/`, 3 under `.claude/`, 1 under `research/`) are untracked and not ignored: not `.gitignored`, but not committed either. The manifests may contain only a table, so no footnote can explain the label.
### Recommendation
#### Option 1
Label every not-ignored file `committed`, untracked ones included.
- Pros: exactly the two values the requirements list; `directories.md` then agrees with `not-gitignored.md` (which includes untracked files).
- Cons: the label is wrong for untracked files.
#### Option 2
Add a third value, `untracked`, shown as its own row.
- Pros: every label is true; the reader can see uncommitted work.
- Cons: departs from the two-value list; the not-ignored rows no longer add up to `not-gitignored.md` row by row.

Recommended: Option 2. A manifest that mislabels files is worse than one extra value, and it costs one line of code.

### RESOLUTION
Option 2 taken: add a third `.gitignored` column value, `untracked`, shown as its own row. Recorded on the recommendation, as no option was named (2026-10-08 14:00).

## Clarification## What counts as a comment line
[X] Resolved
"Count of comment lines for a file written in a common programming language" leaves three things open: which extensions are "a common programming language", whether a line holding code plus a trailing comment counts, and how block comments that span lines are counted. Blank lines also need a stated rule so "total lines" and "comment lines" are consistent. Today's tracked extensions are mostly Markdown (331 files), TypeScript, JavaScript, CSS, HTML and JSON.
### Recommendation
#### Option 1
Count lines that contain only a comment (after trimming). Block comments count every line they span. A line with code and a trailing comment counts as code. Total lines include blank lines. Recognised syntaxes by extension: `//` and `/* */` for `.ts .tsx .js .jsx .mjs .cjs .css .scss .java .c .h .cpp .cs .go .rs .kt .swift`; `#` for `.py .sh .ps1 .yml .yaml .rb .toml`; `--` for `.sql .lua`; `<!-- -->` for `.html .xml`. `.md`, `.json`, `.svg`, `.txt` and unknown extensions report no comment count.
- Pros: simple line scanner; no tokenizer; stable and easy to explain; a count means "lines you could delete without touching code".
- Cons: undercounts trailing comments; comment markers inside strings or template literals (a `//` in a URL string, `/*` in a regex) can be miscounted.
#### Option 2
Count any line containing comment text, including trailing comments, using the same syntax table.
- Pros: closer to "how much commenting is there".
- Cons: needs string and regex awareness to avoid counting `http://` as a comment, so it is a small tokenizer per language; more code, more edge cases.

Recommended: Option 1. It is accurate enough for a manifest, and the stated purpose is a summary, not a linter. Markdown is excluded because it is documentation rather than a programming language.

### RESOLUTION
Option 1 taken: count only lines holding nothing but a comment; block comments count every line they span; code with a trailing comment counts as code; total lines include blank lines; syntax table by extension as written in the option; `.md`, `.json`, `.svg`, `.txt` and unknown extensions report no comment count. Recorded on the recommendation, as no option was named (2026-10-08 14:02).

## Clarification## Totals row
[X] Resolved
Each manifest "will contain only a markdown table with no additional text". A grand-total row is table content rather than extra text, but the requirements do not ask for one, and the tables already have a column per measure. Cells that do not apply (comment lines for a `.jpg`, file size for a `.ts`) also need a value.
### Recommendation
#### Option 1
No totals row. Rows are one per file type, sorted by file type. Cells that do not apply are left empty.
- Pros: exactly what the requirements say; every row is the same kind of row, so the table is easy to parse or diff.
- Cons: the reader must add up the columns to see the project total.
#### Option 2
Add a final `**Total**` row. Cells that do not apply are left empty.
- Pros: the project total is visible at a glance, and the console can stay quiet.
- Cons: not requested; a parser must skip the last row; the row mixes line counts of text files with bytes of binary files.

Recommended: Option 1. Keep the table to what was asked for; empty cells for measures that do not apply, as in the other cell rule above.

### RESOLUTION
Option 2 taken: each manifest table ends in a final `**Total**` row; cells that do not apply are left empty. Chosen by the developer ("2"), then accepted (2026-10-08 14:04).
