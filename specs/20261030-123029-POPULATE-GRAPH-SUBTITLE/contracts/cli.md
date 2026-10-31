# CLI Contract: populate-poll.ts and the `subtitle` key

The command line is unchanged: `npx tsx devScripts/populate/populate-poll.ts <poll-data.json>`, exactly one
argument. These contracts cover only what the feature adds or touches.

## C1. The input key

`subtitle` is a required top-level key of the poll data JSON file (TWEAK01: it replaced `graph_subtitle`,
which is no longer read).

- Absent → an input error (C2), even when `graph_subtitle` is present.
- The value `""` → the poll's subtitle is empty.
- A string of 1 to 30 (`SUBTITLE_MAX`) characters → the poll's subtitle is exactly that string (untrimmed).
- Every other top-level key keeps today's meaning; unknown keys stay ignored (FR-009).

## C2. Validation errors

Validation happens with the file's other checks, before anything is written. Each failure prints exactly one
line to stderr and exits with code 1:

| Value | Line |
|---|---|
| absent | `[populate] Error: "subtitle" is missing` |
| a non-string (number, `null`, object, array, boolean) | `[populate] Error: "subtitle" must be text` |
| a string longer than 30 characters | `[populate] Error: "subtitle" is longer than 30 characters` |

A failed run changes no database row (the script's existing validate-before-any-write rule, feature
20261026-152737 C4).

## C3. Create run

When no poll matches the creator and title, the created poll's `subtitle` is the parsed value, alongside the
file's title and choices. The summary output is unchanged.

## C4. Refresh run

When a matching poll exists, the rerun sets the poll's `subtitle` to the parsed value — the file's current
value wins, and a file without the key (or with `""`) clears an earlier subtitle. Poll id, vote replay,
choice matching and reopening behave exactly as today.

## C5. Documentation

The key table in `devScripts/populate/README.md` gains one row for `subtitle`: optional, the poll's
subtitle shown under the title, at most 30 characters. `tests/fixtures/populate-poll.json` carries the key so
the tests exercise it.
