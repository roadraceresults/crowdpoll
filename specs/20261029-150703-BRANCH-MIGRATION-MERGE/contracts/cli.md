# Contracts: Branch Migration Merge

## C1. Invocation

```text
npm run fix-migrations              # dry run: print the plan, write nothing
npm run fix-migrations -- --apply   # carry out the plan in one transaction
```

- Runs `tsx devScripts/fix-migrations.ts`; the folder whose migrations are used is the repository the script is in
  (R10), whatever the working directory.
- The database is `ENV_DATABASE_URL` (R7). The only option is `--apply`; any other argument is an error (C4).

## C2. Output

Every line starts with `[migrations] `. In order:

```text
[migrations] Database app01 on localhost
[migrations] Folder: C:\crowdPoll\main (12 migrations); database: 13 records
[migrations] Rename 013-line-graph-enabled → 014-line-graph-enabled
[migrations] Roll back 013-line-graph-enabled (down() from C:\crowdPoll\line-graph-toggle); its data is lost and that folder applies it again on its next start
[migrations] Apply 013-poll-tags (recorded before 014-line-graph-enabled)
[migrations] Stop the servers that use this database before applying.
[migrations] Dry run: nothing written. Run npm run fix-migrations -- --apply to apply.
```

- The header lines always appear; then one line per action, in plan order (renames, rollbacks, applies); then the
  `Stop the servers` line when there is any action.
- The last line is exactly one of:
  - `[migrations] Nothing to fix` (no action, no problem);
  - `[migrations] Dry run: nothing written. Run npm run fix-migrations -- --apply to apply.`;
  - `[migrations] Done: <n> change(s) applied`;
  - a `[migrations] Error: …` line (C4).
- The URL, user name and password are never printed; only the database name and the host.

## C3. Exit status

| Outcome | Exit |
|---|---|
| Nothing to fix, dry run, done | 0 |
| Any `[migrations] Error:` | 1 |

## C4. Errors

Each is a single line, and nothing is written.

| Cause | Line |
|---|---|
| `ENV_DATABASE_URL` empty or unparsable | `[migrations] Error: ENV_DATABASE_URL is not set to a PostgreSQL URL` |
| Host not local | `[migrations] Error: <host> is not a database on this machine; only localhost, 127.0.0.1 and ::1 are repaired` |
| Unknown argument | `[migrations] Error: unknown argument <arg>; usage: npm run fix-migrations [-- --apply]` |
| Database unreachable | `[migrations] Error: cannot reach the database: <driver message>` |
| Plan has problems | one `[migrations] Problem: <name>: <reason>` line per problem, then `[migrations] Error: <n> problem(s); nothing written` |
| Lock not taken within 10 s | `[migrations] Error: the database is being migrated by another process` |
| An action or the final check fails during `--apply` | `[migrations] Error: <action or check>: <message>; every change was rolled back` |

## C5. Server start-up message

`src/db/migrator.ts` throws `MigrationError` with:

| Case | Message |
|---|---|
| Kysely's check fails before any migration runs | `Migration check failed: <Kysely's message>` |
| …and that message starts with `corrupted migrations` | the above, then a new line `Run npm run fix-migrations in this folder; see devScripts/MIGRATIONS-HOWTO.md.` |
| A migration fails while running | `Migration <name> failed: <message>` (unchanged) |

`src/server.ts` is unchanged: it prints `[server] Database migration failed; refusing to start:` with the error and exits 1.

## C6. The document

`devScripts/MIGRATIONS-HOWTO.md`, linked from `README.md`'s Testing section, has these sections:

1. **Why the server refuses to start**: the two `corrupted migrations` messages, F1, F2 and F3.
2. **Adding a migration on a branch**: the next free `NNN-`, a descriptive suffix that is kept if renumbered, the entry
   in `src/db/migrations/index.ts`, an `up` and a `down`.
3. **Merging**: the branch merged second renumbers its clashing migration (file name and `index.ts` key) and keeps the
   suffix; a migration already on `main` is never renumbered or renamed, because production has recorded its name.
4. **Recovering**: stop the servers on the database; set `ENV_DATABASE_URL` (or run from a shell where
   `devScripts/launch-dev.ps1` set it); `npm run fix-migrations`; read the plan; `npm run fix-migrations -- --apply`;
   start the server. A branch folder created before the script existed merges `main` first.
5. **What a rollback costs**: an F1 rollback discards the data the change held; the folder that applied it applies it
   again, empty, on its next start.
