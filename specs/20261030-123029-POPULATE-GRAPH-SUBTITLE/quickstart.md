# Quickstart: Populate Script Graph Subtitle

Validation guide for the feature. Contracts: [contracts/cli.md](./contracts/cli.md); parse and write rules:
[research.md](./research.md) R2–R3.

## Prerequisites

- A migrated local PostgreSQL (`ENV_DATABASE_URL`, e.g. `postgres://localhost:5432/app01`) and the server's
  other `ENV_*` variables (use `devScripts/launch-dev.ps1`'s environment).
- An existing account whose email the data file names as `poll creator email`.
- A data file in the documented format (see the key table in `devScripts/populate/README.md`). The two local
  files under `polldata/` must first be corrected by hand (research R6): documented keys, plus
  `"graph_subtitle"` of at most 30 characters (e.g. `"For Demonstration Purposes"`).

## 1. Automated tests

```powershell
npx vitest run tests/populate-poll.test.ts
```

Expected: the suite passes, including the new cases — fixture subtitle parsed and stored on create, applied
and cleared on rerun, non-string and 31-character values refused (contracts C1–C4).

## 2. Create run stores the subtitle

```powershell
npx tsx devScripts/populate/populate-poll.ts polldata/trump_approval_rating_over_time.json
```

Expected: the run succeeds as before. Open the home page, find the poll, and confirm the subtitle appears
under the title on the poll card; maximize the poll and confirm the same text under the line graph's title.

## 3. Rerun applies and clears

1. Change the file's `graph_subtitle` value and rerun: the poll keeps its id and shows the new subtitle.
2. Remove the `graph_subtitle` key and rerun: the subtitle disappears (empty again).

(Without `ENV_VALKEY_URL`, restart the dev server between runs to drop in-memory state, as the script's own
note says.)

## 4. Validation refuses a bad value

1. Set `"graph_subtitle"` to a 31-character string and run: exactly one line,
   `[populate] Error: "graph_subtitle" is longer than 30 characters`, exit code 1 (`$LASTEXITCODE` is 1), and
   no database change.
2. Set `"graph_subtitle": 7` and run: `[populate] Error: "graph_subtitle" must be text`, exit code 1.

## 5. Backward compatibility

Run the script on a file with no `graph_subtitle` key (e.g. a copy of `tests/fixtures/populate-poll.json`
with the key removed and a real creator email): the run succeeds exactly as before this feature, and the
poll's subtitle is empty.
