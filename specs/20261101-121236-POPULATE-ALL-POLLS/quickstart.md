# Quickstart: Populate All Polls

Validates the feature end to end on a development database. Behaviour details are in
[contracts/cli.md](./contracts/cli.md) and [data-model.md](./data-model.md).

## Prerequisites

- The server's `ENV_*` variables set in the shell (dot-source `devScripts/launch-dev.ps1`'s variables, or set
  them by hand), `ENV_DATABASE_URL` pointing at a **local**, migrated development database.
- An account whose email is each data file's `poll_creator_email`.
- `polldata/` holding at least two `.json` data files.

## 1. Automated tests

```powershell
npx tsc --noEmit
npx vitest run tests/populate-poll.test.ts tests/populate-all-polls.test.ts
```

Expected: both pass.

## 2. Single file, short command

```powershell
npm run populate-poll polldata/trump_approval_rating_over_time
cd polldata; npm run populate-poll trump_approval_rating_over_time.json; cd ..
npm run populate-poll
```

Expected: the first two create or refresh the same poll (no extension needed; a path typed inside `polldata`
resolves there); the third prints `[populate] Error: Usage: npm run populate-poll <poll-data.json>` and exits 1.

## 3. Whole folder, first and second run

```powershell
Remove-Item devScripts/populate/populate-all-polls-history.json -ErrorAction SilentlyContinue
npm run populate-all-polls
npm run populate-all-polls
```

Expected: the first run shows each child's `[populate]` lines live and ends
`[populate-all] Done: <n> populated, 0 skipped, 0 failed`; the history file lists one entry per file, and its
`database` has no password. The second run skips every file and ends `Done: 0 populated, <n> skipped, 0 failed`.

## 4. Changed file, failure, and errors

- Change one data point in a copy of a file in a scratch folder, run `npm run populate-all-polls <scratch>`
  twice with one edit in between: the edited file is populated again and keeps its poll id; its entry is replaced.
- Set one copy's `poll_creator_email` to an address with no account: the run lists it under `Failed files:`
  and exits 1; nothing is recorded for it.
- `npm run populate-all-polls nowhere` → one `cannot read the directory` line, exit 1.
- `npm run populate-all-polls a b` → the usage line, exit 1.
