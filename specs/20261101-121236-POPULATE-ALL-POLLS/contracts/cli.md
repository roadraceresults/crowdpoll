# CLI Contract: Populate All Polls

Both commands read the server's `ENV_*` variables from the shell (npm loads none). Relative paths are resolved
from the folder the command was typed in (`INIT_CWD`, else the working directory). `<identity>` is
`ENV_DATABASE_URL` without its password.

## C1. `npm run populate-poll <file>`

`package.json`: `"populate-poll": "tsx devScripts/populate/populate-poll.ts"`.
`npx tsx devScripts/populate/populate-poll.ts <file>` keeps working.

| Case | Output | Exit |
|---|---|---|
| exactly one argument, a valid file | unchanged from today (`[populate] Target: …` … `[populate] Done: poll <id> created\|refreshed`, `[populate]   Votes deleted: <n>   Votes written: <n>`, …) | 0 |
| path has no extension, does not exist, `<path>.json` does | as above, using `<path>.json` | 0 |
| 0 or ≥ 2 arguments | `[populate] Error: Usage: npm run populate-poll <poll-data.json>` | 1 |
| neither the path nor `<path>.json` exists | `[populate] Error: cannot read <resolved path>: …` | 1 |
| any other input error | unchanged: one `[populate] Error: …` line | 1 |

It never reads or writes the population history.

## C2. `npm run populate-all-polls [<directory>]`

`package.json`: `"populate-all-polls": "tsx devScripts/populate/populate-all-polls.ts"`.

Checks, in order, each stopping the run with one line on stderr and exit 1 before any file is populated:

| Check | Line |
|---|---|
| ≥ 2 arguments | `[populate-all] Error: Usage: npm run populate-all-polls [<directory>]` |
| `ENV_DATABASE_URL` unset or not PostgreSQL | `[populate-all] Error: ENV_DATABASE_URL is not set to a PostgreSQL URL` |
| directory missing or unreadable (given, or `<project root>/polldata`) | `[populate-all] Error: cannot read the directory <dir>: <reason>` |
| history file present but unreadable or malformed | `[populate-all] Error: cannot read <history path>: <reason>` |

Then:

```text
[populate-all] Target: <identity>
[populate-all] No .json files in <dir>                      ← only when none; exit 0
[populate-all] Skipped a.json (populated 2026-11-01T17:45:12.345Z)
[populate-all] b.json: populating
[populate] Target: …                                         ← the child's own lines, live and unchanged
…
[populate] Done: poll <id> created
[populate-all] c.json: populating
[populate] Error: no user with the email x@example.com       ← child stderr, unchanged
[populate-all] Error: c.json: no user with the email x@example.com
[populate-all] Done: 1 populated, 1 skipped, 1 failed
[populate-all] Failed files:
[populate-all]   c.json: no user with the email x@example.com
```

Exit 1 when any file failed, else 0.

## C3. Which files, in what order

Files directly in the directory whose name ends in `.json`, any letter case; no subfolders; name order.

## C4. Per-file outcome

| Child result | Outcome | Message |
|---|---|---|
| exit 0, `Done:` and `Votes written:` lines found | populated, entry written | — |
| exit 0, either line missing | failed, nothing written | `populated, but its summary could not be read` |
| exit ≠ 0 | failed, nothing written | last `[populate] Error:` / `[populate] failed:` line without its prefix, else `exited with code <n>` |
| killed by a signal | failed, nothing written | `stopped by <signal>` |

## C5. Skipping and recording

See [data-model.md](../data-model.md): skipped when (`database`, `file`, `sha256`) is recorded; on success the
entry for (`database`, `file`) is replaced and the history file is rewritten at once.
