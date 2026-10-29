# Research: Branch Migration Merge

All facts about Kysely are from the installed `kysely@0.29.6` (`node_modules/kysely/dist/migration/migrator.js`,
`node_modules/kysely/dist/dialect/postgres/postgres-adapter.js`) and were checked against the development database
`app01` on 2026-10-29.

## R1. What Kysely records and checks

- **Decision**: the script reads and writes the same record Kysely keeps: the table `kysely_migration`, one row per
  applied migration, columns `name` (`varchar(255)`, primary key) and `timestamp` (`varchar(255)`, an ISO string written
  with `new Date().toISOString()`).
- **Rationale**: on every `migrateToLatest`, Kysely reads the rows, sorts them by `timestamp` (compared as dates; equal
  strings fall back to `name.localeCompare`), and lists the code's migrations sorted by name. It then throws:
  - `corrupted migrations: previously executed migration <x> is missing` when a row's name is not in the code
    (`#ensureNoMissingMigrations`, always on);
  - `corrupted migrations: expected previously executed migration <x> to be at index <i> but <y> was found in its place`
    when the rows, in time order, are not the first N names of the code (`#ensureMigrationsInOrder`, on because
    `allowUnorderedMigrations` defaults to `false`).
  The script's final check (R4) repeats exactly these two tests.
- **Alternatives considered**: turning on `allowUnorderedMigrations` (rejected by NC2 of the requirements);
  a separate record of the script's own (rejected: two sources of truth).

## R2. Locking against a running server, 10 seconds

- **Decision**: `--apply` opens one transaction and first runs
  `select set_config('lock_timeout', '10000', true)` then `select pg_advisory_xact_lock(3853314791062309107)`.
  A lock wait that times out raises SQLSTATE `55P03` (`lock_not_available`), which the script reports as
  `[migrations] Error: the database is being migrated by another process`.
- **Rationale**: Kysely's PostgreSQL adapter takes the session-level advisory lock `pg_advisory_lock(3853314791062309107)`
  (after setting `lock_timeout` to one hour) for the whole of a migration run. Session and transaction advisory locks on
  the same key conflict, so holding the transaction-level lock keeps any server from migrating while the script works,
  and releases itself at commit or rollback. `lock_timeout` applies to advisory-lock waits, which is how Kysely bounds
  its own wait. `set_config(…, true)` is local to the transaction.
- **Alternatives considered**: running Kysely's `Migrator` itself (cannot rename, roll back a foreign migration or
  insert out of order); a polling loop on `pg_try_advisory_xact_lock` (more code, same result).

## R3. Classifying a mismatch

- **Decision**: with `records` (time order) and `folder` (the folder's names, name order):
  1. a name recorded twice → problem `duplicate record`;
  2. each record whose name is not in `folder` is **unknown**; its suffix is the text after a leading `NNN-`
     (`/^\d{3}-(.+)$/`), or the whole name;
     - exactly one folder migration with the same suffix and no record → **F2**, rename;
     - none → **F1**, roll back (R6);
     - more than one → problem `<n> folder migrations end in -<suffix>`;
  3. after the renames and rollbacks, each folder migration with no record whose name sorts before the greatest
     recorded name → **F3**, apply (R5).
  Folder migrations named after every record are ordinary pending migrations: the script leaves them for the server.
- **Rationale**: the suffix survives renumbering (requirements, Resolved Decisions, UA2); the three outcomes map one to
  one onto F1–F3; anything else is a problem and nothing is written (FR-012).
- **Alternatives considered**: matching by file content (the record holds no hash); fuzzy name matching (could pair the
  wrong migrations).

## R4. Order of actions and the final check

- **Decision**: one transaction, in this order: take the lock (R2); renames; F1 rollbacks, newest record first;
  F3 applies, in name order; then re-read the record and run R1's two checks against the folder. If either fails, the
  transaction is rolled back and the failure is reported as a problem. Commit only after the check passes.
- **Rationale**: a newer migration can depend on an older one, so rollbacks run newest first and applies oldest first,
  as Kysely itself does. The final check guarantees FR-014 (the server's check passes) instead of trusting the
  classification. PostgreSQL DDL is transactional, so a failing `up`/`down` leaves nothing behind (FR-013).
- **Alternatives considered**: one transaction per action (a failure halfway would leave a half-repaired record).

## R5. Where an F3 record goes in time order

- **Decision**: an applied F3 migration is recorded with **the same `timestamp` string** as the earliest-applied record
  whose name sorts after it.
- **Rationale**: Kysely breaks a tie of equal `timestamp` strings by name, so the new row sorts directly before that
  record and after every earlier one, without touching any existing row. Several F3 migrations before the same record
  share its timestamp and sort among themselves by name.
- **Alternatives considered**: subtracting a millisecond (collides when the previous record is one millisecond older);
  rewriting every timestamp (changes rows that were right).

## R6. Finding and running a foreign migration (F1)

- **Decision**: the repository root is two levels above the script; its parent (`C:\crowdPoll\`) holds the sibling
  folders. For an unknown name `x`, every sibling `<parent>/<sibling>/src/db/migrations/x.ts` that exists is read:
  - none → problem `no folder beside this one has <x>.ts`;
  - two or more with different bytes → problem `the folders beside this one disagree on <x>.ts`, naming them;
  - otherwise the file is loaded with `import(pathToFileURL(file).href)` (the script runs under `tsx`, which loads
    TypeScript) while planning, so a file with no `down` is a problem a dry run reports; at `--apply` its `down` is
    called with the transaction.
  The search root is a parameter of the planning function and of `main` (default: the parent of the repository root),
  so tests point it at a fixture folder.
- **Rationale**: the sibling's file resolves `kysely` from the sibling's own `node_modules`; its `sql` template only
  needs the executor of the database object it is given, which a transaction from this folder's Kysely 0.29 provides.
  The line-graph-toggle folder has `node_modules/kysely`, and `013-line-graph-enabled.ts` imports only `sql` and the
  `Kysely` type. No confirmation beyond `--apply` (spec Clarifications, Q1).
- **Alternatives considered**: asking the developer for the file's path (an extra step for the common case);
  deleting the record without a rollback (the column would stay, and the branch's `up` would fail with
  "column already exists" when it is merged).

## R7. Database address and the local-host rule

- **Decision**: the script reads `process.env.ENV_DATABASE_URL` directly, parses it with `new URL`, and refuses before
  connecting unless `hostname` is `localhost`, `127.0.0.1` or `[::1]` (the form `URL` gives IPv6), naming only the host.
  An empty or unparsable value is an error. It connects with the server's `createDb`.
- **Rationale**: `loadConfig` requires the whole server environment (`ENV_PUBLIC_ORIGIN` and others), which the script
  does not need. The same three hostnames are already the rule in `tests/helpers/global-setup.ts`. Only the host is
  printed, so the password in the URL never reaches the console.
- **Alternatives considered**: a `--database` argument (a second way to say the same thing; the server's setting is the
  one that must agree).

## R8. The start-up message

- **Decision**: in `src/db/migrator.ts`, when no result has status `Error`, the `MigrationError` message is
  `Migration check failed: <Kysely's message>`; when Kysely's message starts with `corrupted migrations`, a second line
  follows: `Run npm run fix-migrations in this folder; see devScripts/MIGRATIONS-HOWTO.md.` A failing migration keeps
  `Migration <name> failed: <message>`.
- **Rationale**: Kysely returns `error` with no `Error` result when its checks fail before any migration runs, which is
  what produced `Migration (unknown) failed` in the console output of the requirements. `server.ts` already prints the
  error and exits; it is not changed.
- **Alternatives considered**: catching the error in `server.ts` (two places that know the message).

## R9. Shape of the script, its tests and the document

- **Decision**:
  - `devScripts/fix-migrations.ts` exports a pure `planRepair(records, folderNames, findForeign)` returning a plan
    (`data-model.md`), `applyRepair(db, plan, folderMigrations)`, and `main()`, which runs only when the file is the
    entry point (as `populate-poll.ts` does). `package.json` gains `"fix-migrations": "tsx devScripts/fix-migrations.ts"`;
    `.gitignore` gains `!devScripts/fix-migrations.ts` and `!devScripts/MIGRATIONS-HOWTO.md`.
  - `tests/fix-migrations.test.ts` creates a fresh database per case (the `freshDatabase` pattern of
    `tests/server-boot.test.ts`), migrates it with the real migrations, then builds F1, F2 and F3 with throw-away
    migrations and fixture files under `tests/fixtures/fix-migrations/`, and asserts that `migrateToLatest` passes after
    the repair. The start-up wording is tested in `tests/server-boot.test.ts`.
  - `devScripts/MIGRATIONS-HOWTO.md` is the document; `README.md`'s Testing section, which already points at
    `devScripts/populate/README.md`, gains one paragraph naming the command and the document.
- **Rationale**: a pure planner tests every classification without a database; the database tests prove FR-014 end to
  end; the README link follows an existing precedent.
- **Alternatives considered**: a `migrations` sub-command in the server (`npm run dev` must then start for the fix,
  which is the thing that fails).

## R10. The script exists only in folders that include it

- **Decision**: the document says to run the script from the folder whose server refuses to start, and, for a branch
  folder created before this feature, to merge `main` into it first.
- **Rationale**: the script reads its own folder's `src/db/migrations/index.ts`; running `main`'s copy would bring the
  database in line with `main`, not with the branch.
- **Alternatives considered**: a `--folder` argument (not requested; it could repair a database for the wrong folder).
