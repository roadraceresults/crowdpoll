# Contract: the report files

Each run writes up to nine files into `<project>/manifests/<run>/`. Each file is one markdown table and
nothing else: no title, no date, no legend, no footnote.

## Files

| File | Table | Written when |
|---|---|---|
| `overall.md` | by file type | always |
| `not-gitignored.md` | by file type | always |
| `gitignored.md` | by file type | always |
| `directories.md` | by folder, status and file type | always |
| `dist.md` | by file type | `dist/` holds at least one counted file |
| `public.md` | by file type | `dist/public/` holds at least one counted file |
| `assets.md` | by file type | `dist/public/assets/` holds at least one counted file |
| `src.md` | by file type | `src/` holds at least one counted file |
| `tests.md` | by file type | `tests/` holds at least one counted file |

Which files each one covers is in [data-model.md](../data-model.md) (Report). A report that is always
written, but whose set is empty, holds the header row and a `**Total**` row of zeros.

## Text format

- UTF-8 without a byte-order mark; `\n` line endings; one final newline.
- A GitHub-flavoured table: a header row, a separator row of at least three dashes per column, then rows.
- Numbers are plain integers with no separators. A cell that does not apply is empty (two spaces between
  its pipes). A literal pipe inside a cell is written `\|`.
- The last row is the `**Total**` row.

## Table by file type

Columns, in order:

| File type | Files | Lines | Comment lines | Size (bytes) |
|---|---|---|---|---|

| Column | Meaning | Empty when |
|---|---|---|
| File type | lower-cased extension with its dot, or `(none)` | never |
| Files | count of counted files of that type | never |
| Lines | sum of lines of its text files | the type has no text file |
| Comment lines | sum of comment-only lines | no file of the type has a comment syntax |
| Size (bytes) | sum of the sizes of its binary files | the type has no binary file |

Rows are sorted by file type in code-unit order of the lower-cased value, so `(none)` is first. The
`**Total**` row has `**Total**` in the first column, and each other column is the sum of the rows above it,
`0` where none contributes.

Example (invented figures):

```markdown
| File type | Files | Lines | Comment lines | Size (bytes) |
|---|---|---|---|---|
| (none) | 1 | 29 |  |  |
| .jpg | 2 |  |  | 804176 |
| .md | 4 | 310 |  |  |
| .ts | 3 | 540 | 62 |  |
| **Total** | 10 | 879 | 62 | 804176 |
```

## `directories.md`

Columns, in order:

| Directory | .gitignored | File type | Files | Lines | Comment lines | Size (bytes) |
|---|---|---|---|---|---|---|

| Column | Meaning |
|---|---|
| Directory | the first path component; `.` for a file at the project root |
| .gitignored | `.gitignored` (ignored), `committed` (tracked) or `untracked` (not tracked, not ignored) |

The other columns are as above. One row for each folder, status and file type that holds a counted file.
Rows are sorted by folder (lower-cased code-unit order, so `.` is first), then status compared as text
(`.gitignored`, then `committed`, then `untracked`), then file type. The last row is
`| **Total** |  |  | <files> | <lines> | <comment lines> | <bytes> |`, with `0` in any column nothing
contributes to.

On a case-insensitive file system, folder names that differ only in letter case form one group, shown in
the spelling the project folder's listing returns (FR-018).

Example (invented figures):

```markdown
| Directory | .gitignored | File type | Files | Lines | Comment lines | Size (bytes) |
|---|---|---|---|---|---|---|
| . | committed | .json | 2 | 120 |  |  |
| . | committed | .md | 1 | 80 |  |  |
| dist | .gitignored | .js | 4 | 900 | 40 |  |
| src | committed | .ts | 3 | 540 | 62 |  |
| tests | untracked | .ts | 1 | 60 | 4 |  |
| **Total** |  |  | 11 | 1700 | 106 | 0 |
```

## Identities every run satisfies

These are what the integration test and the quickstart assert.

| # | Identity | Success criterion |
|---|---|---|
| 1 | `overall.md` Files total = `not-gitignored.md` Files total + `gitignored.md` Files total | SC-003 |
| 2 | every column of the `directories.md` `**Total**` row = the same column of `overall.md` | SC-003 |
| 3 | in every report each `**Total**` cell = the sum of the cells above it | SC-004 |
| 4 | files counted + files skipped = files git listed after the three exclusions | SC-002 |
| 5 | a report listed as optional is absent exactly when its folder holds no counted file | FR-014 |
