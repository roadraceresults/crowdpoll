# Quickstart: Populate Test Poll

Validation guide for [spec.md](./spec.md); command and output in [contracts/cli.md](./contracts/cli.md).

## Prerequisites

- A migrated development database and the server's `ENV_*` variables (load them as `devScripts/launch-dev.ps1` does).
- An account for the file's `poll creator email` (sign in once as that user, e.g. `devadmin01@crowdpoll.vote`).
- A poll data file, e.g. `polldata/trump_approval_rating_over_time.json` (git-ignored).

## 1. Automated tests

```
npx vitest run tests/populate-poll.test.ts
```

Expected: all pass, covering the date shift, count spread, share rounding, every C4 error, create, rerun, a changed choice list, a closed poll reopened, real votes untouched and counters in cache and row.

## 2. Create a poll (User Story 1)

```
npx tsx devScripts/populate/populate-poll.ts polldata/trump_approval_rating_over_time.json
```

Expected:
- the first line names the target origin and database host;
- 119 progress lines, the last dated today;
- `Done: poll <pid> created`, about 14.7 million votes written, Approve about 34% and Disapprove about 66%;
- the 12-month note, and without `ENV_VALKEY_URL` the restart note.

Restart the dev server if told to, open the home page: the poll is open and public, owned by the creator, its bars close to 34 / 66, its start date about 20 months ago.

## 3. Rerun (User Story 2)

Run the same command again.

Expected: `Removed … earlier test vote(s)`, `Done: poll <pid> refreshed` with the **same** `<pid>`, votes written about the same as before, and the poll card's total equal to about the largest single day's votes (between about 105,000 and 142,000), not twice it.

## 4. Errors (User Story 3)

```
npx tsx devScripts/populate/populate-poll.ts
npx tsx devScripts/populate/populate-poll.ts a.json b.json
```

Expected: one `[populate] Error:` line each, exit code 1 (`$LASTEXITCODE` in PowerShell), no poll created.
Copy the example, change its creator email to an unknown address, run it: one error line naming the email, nothing written.
