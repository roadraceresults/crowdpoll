# Migrations on branches

Every branch folder under `C:\crowdPoll\` (`main`, `line-graph-toggle`, …) runs against the one development database
`app01`. A branch's migration is therefore recorded in `app01` as soon as that branch's server starts, before the branch
is merged, and other folders can then refuse to start. This page explains why, how to avoid it, and how to repair it
with `npm run fix-migrations`.

## 1. Why the server refuses to start

At start-up the server runs every migration in `src/db/migrations/index.ts` that the database has not recorded. Kysely
keeps the record in the table `kysely_migration` (one row per applied migration, with the time it was applied) and
first checks that the record agrees with the folder. When it does not, the server stops with one of these:

```text
[server] Database migration failed; refusing to start: MigrationError: Migration check failed: corrupted migrations: previously executed migration 013-line-graph-enabled is missing
Run npm run fix-migrations in this folder; see devScripts/MIGRATIONS-HOWTO.md.
```

```text
[server] Database migration failed; refusing to start: MigrationError: Migration check failed: corrupted migrations: expected previously executed migration 014-b to be at index 12 but 013-a was found in its place
Run npm run fix-migrations in this folder; see devScripts/MIGRATIONS-HOWTO.md.
```

There are three causes:

| | What happened | What the repair does |
|---|---|---|
| **F1** | The database records a migration this folder does not have: another branch's server applied it. | Rolls it back with that migration's own `down()`, found in the folder beside this one that has it, and deletes the record. |
| **F2** | The migration was renumbered at merge (`013-x` became `014-x`), and the database still has the old name. | Renames the record. Nothing else runs: the schema is already right. |
| **F3** | This folder has a migration the database skipped, numbered before migrations it has already recorded. | Runs its `up()` and records it in name order, just before the first record named after it. |

## 2. Adding a migration on a branch

1. Take the next free number after the highest one on `main`: `src/db/migrations/013-<what-it-does>.ts`.
2. Give it a descriptive suffix (`013-poll-tags`, not `013-update`). The suffix is how the repair recognises the
   migration if it is renumbered later, so it must stay the same.
3. Add it to `migrations` in `src/db/migrations/index.ts`, under the same key as the file name.
4. Write both an `up` and a `down`. The `down` is what lets another folder roll the change back (F1).

## 3. Merging

- When two branches each add a migration with the same number, the branch merged **second** renumbers its own: it renames
  the file and its key in `index.ts` to the next free number and keeps the suffix (`013-poll-tags` →
  `014-poll-tags`).
- A migration that is already on `main` is never renumbered or renamed: production has recorded its name, and changing
  it would make the production server refuse to start.
- After the merge, each folder whose server refuses to start is repaired as in the next section.

## 4. Recovering

1. Stop every server that uses the database (every folder's `npm run dev`).
2. In PowerShell, in the folder whose server refuses to start, point the script at the database (or use a shell where
   `devScripts/launch-dev.ps1` has already set it):

   ```powershell
   $env:ENV_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/app01"
   npm run fix-migrations
   ```

3. Read the plan. Nothing has been written yet:

   ```text
   [migrations] Database app01 on localhost
   [migrations] Folder: C:\crowdPoll\main (12 migrations); database: 13 records
   [migrations] Roll back 013-line-graph-enabled (down() from C:\crowdPoll\line-graph-toggle); its data is lost and that folder applies it again on its next start
   [migrations] Stop the servers that use this database before applying.
   [migrations] Dry run: nothing written. Run npm run fix-migrations -- --apply to apply.
   ```

   A rename reads `Rename 013-line-graph-enabled → 014-line-graph-enabled`; an apply reads
   `Apply 013-poll-tags (recorded before 014-line-graph-enabled)`.

4. Apply it:

   ```powershell
   npm run fix-migrations -- --apply
   ```

   It ends `[migrations] Done: <n> change(s) applied`. Everything happens in one transaction: if any step fails, the
   line names it and says every change was rolled back, and the database is as it was.

5. Start the server again with `npm run dev`.

Notes:

- Only a database on this machine (`localhost`, `127.0.0.1` or `::1`) is repaired; any other host is refused before
  connecting.
- The script brings the database in line with **the folder it is in**. A branch folder created before the script existed
  has no `npm run fix-migrations`: merge `main` into it first, then run it there.
- If the script prints `[migrations] Problem: …` lines, it writes nothing. The usual causes: no folder beside this one has
  the recorded migration's file, two folders have different copies of it, or the file has no `down()`.
- `the database is being migrated by another process` means a server was starting; stop it and run the script again.

## 5. What a rollback costs

An F1 rollback runs the other branch's `down()`, so whatever data that change held (a column, a table and its rows) is
discarded. The folder that applied it applies it again, empty, the next time its server starts. The development database
holds nothing that cannot be recreated, so this is accepted; nothing else in the database is touched.
