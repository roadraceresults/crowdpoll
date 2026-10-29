Start a new spec for these requirements called `20261029-150703-BRANCH-MIGRATION-MERGE`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

It is becomming a problem when a branch is merged into the main branch  
when the branch had a new migration.  

Please create a document instructing what should be done to resolve the problem.  
Even better, implement a script that will fix it.  
The database always has the migration in the kysely_migrations table because the other branch was executed and tested before merging.  

## Additional Requirements (2026-10-29 4:07 PM)

Here is what is in the server console:
```text
[server] Starting in both sign-in mode
[auth] Sign-in method: both; providers: Google, Amazon
[auth] Sign-up allowlist off
[db] ENV_DATABASE_CA_CERT is not set: verifying the database certificate against the system roots
[server] Database migration failed; refusing to start: MigrationError: Migration (unknown) failed: corrupted migrations: previously executed migration 013-line-graph-enabled is missing
    at migrateToLatest (C:\crowdPoll\main\src\db\migrator.ts:17:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async startServer (C:\crowdPoll\main\src\server.ts:165:21)
Waiting for the debugger to disconnect...
Waiting for the debugger to disconnect...
Waiting for the debugger to disconnect...
(base) PS C:\crowdPoll\main> 
```

## Resolved Decisions

- **Which database (AM1)**: only the local development databases.  
  The script refuses any database whose host is not `localhost`, `127.0.0.1` or `::1`;  
  production is never touched.  
  Rule for production: a migration is never renumbered or renamed once it is on `main`, since production has recorded its name.  
- **The table (AM2)**: Kysely records each applied migration as one row of `kysely_migration` (singular), with columns `name` and `timestamp`, and orders the rows by `timestamp`;  
  `kysely_migration_lock` guards it.  
- **The problem (AM3)**: every branch folder runs against the same database, so a branch's migration is recorded before the branch is merged.  
  A merge that keeps the migration's name is harmless.  
  The server refuses to start in three cases:  
  - **F1**, a folder without the migration (e.g. `main` before the merge) starts after a branch folder applied it: `corrupted migrations: previously executed migration <name> is missing` (the console output above);  
  - **F2**, the migration is renumbered at merge because `main` already has that number, so the recorded name no longer exists: the same message;  
  - **F3**, `main` holds a migration numbered before one already recorded: `corrupted migrations: expected previously executed migration <a> to be at index <i> but <b> was found in its place`.  
- **What the script does (UA1)**: it prints a plan with one action per mismatch:  
  - **F2, renamed**: a row whose name is not in the folder but whose suffix is (UA2) is renamed to the folder's name, and nothing else runs;  
  - **F1, foreign**: a row whose migration is not in the folder at all is rolled back with that migration's own `down()`, found in a sibling folder under `C:\crowdPoll\*\src\db\migrations\`, and its row is deleted;  
    when no sibling has the file, the script reports it and changes nothing;  
  - **F3, out of order**: a migration of the folder with no row, named before an applied one, has its `up()` run and its row inserted with a timestamp that keeps time order equal to name order;  
  - anything it cannot classify is reported and nothing is written.  
- **Renumbered migrations (UA2)** are recognized by the part of the name after the number (`013-line-graph-enabled` matches `014-line-graph-enabled`).  
  A suffix matching more than one of the folder's migrations, or one that already has a row, is reported and not renamed.  
  A migration keeps its suffix when renumbered.  
- **Safety (UA3)**: local hosts only, printing only the host;  
  without `--apply` the plan is printed and nothing is written;  
  with `--apply` every change runs in one transaction under `kysely_migration_lock`, and any error rolls everything back.  
  The plan asks that the servers using the database be stopped first.  
- **The script (UA4)**: `devScripts/fix-migrations.ts`, run as `npm run fix-migrations [-- --apply]` from the folder whose migrations are wanted.  
  The database is `ENV_DATABASE_URL`, opened with the server's `createDb`;  
  the migrations are the folder's own `src/db/migrations/index.ts`.  
  Each output line starts `[migrations]`: the database host and name, each planned action, then `Done` or `Dry run: nothing written`;  
  an error is one `[migrations] Error:` line and exit 1;  
  a database already in line prints `Nothing to fix` and exits 0.  
  `.gitignore` gains `!devScripts/fix-migrations.ts`, `package.json` gains the `fix-migrations` script, and there is no new dependency.  
- **The document (UA5)**: `devScripts/MIGRATIONS-HOWTO.md` (with a `!` line in `.gitignore`), linked from `README.md`'s development section.  
  It covers why the server refuses to start (the two Kysely messages);  
  adding a migration on a branch (next free number, keep the suffix, register it in `index.ts`);  
  merging (renumber the second of two clashing migrations, never one already on `main`);  
  and recovering (stop the servers, `npm run fix-migrations`, check the plan, `-- --apply`).  
- **Start-up hint (UA6)**: when Kysely's message starts with `corrupted migrations`, `migrateToLatest` adds one line naming `npm run fix-migrations` and the document;  
  the server still refuses to start.  
- **The start-up message (UA9)**: when no migration ran and failed, the message is `Migration check failed:` followed by Kysely's message, then UA6's hint line, instead of `Migration (unknown) failed:`.  
  A migration that fails while running keeps the `Migration <name> failed:` wording.  
- **A database per folder (UA7)**: not part of this feature, since every folder keeps the shared `app01` (NC1).  
- **Tests (UA8)**: `tests/fix-migrations.test.ts` on the embedded PostgreSQL builds F1, F2 and F3 with small throw-away migrations, and `migrateToLatest` must succeed after `--apply`.  
  A dry run writes nothing;  
  a remote host is refused;  
  an unclassifiable row changes nothing and exits 1;  
  an already-consistent database prints `Nothing to fix`.  
- **Scope (NC1)**: the document and the repair script;  
  every folder stays on the shared `app01`.  
  Switching between a folder that has a migration and one that does not needs a repair each time;  
  repairing F1 rolls back the other folder's migration, losing what its objects held, and that folder applies it again on its next start.  
- **Naming (NC2)**: new migrations keep the `NNN-` names;  
  the branch merged second renumbers its migration to the next free number at merge, and `fix-migrations` renames its row (F2).  
