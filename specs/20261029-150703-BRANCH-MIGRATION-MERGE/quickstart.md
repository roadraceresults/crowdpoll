# Quickstart: Branch Migration Merge

How to prove the feature works. Output wording is in `contracts/cli.md`; the classification in `research.md` R3–R6.

## Prerequisites

- PostgreSQL running locally with the development database `app01`.
- In PowerShell, from `C:\crowdPoll\main`: `$env:ENV_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/app01"`.

## 1. Automated tests

```powershell
npx vitest run tests/fix-migrations.test.ts tests/server-boot.test.ts
npx tsc --noEmit
npx tsc --noEmit --module nodenext --moduleResolution nodenext --target es2023 --lib es2023 --strict --noUncheckedIndexedAccess --esModuleInterop --skipLibCheck --resolveJsonModule --types node devScripts/fix-migrations.ts
```

Expected: F1, F2 and F3 each repaired and followed by a passing `migrateToLatest`; dry run, remote host, unclassifiable
record, lock wait and `Nothing to fix` cases pass; the start-up wording test passes.

## 2. Today's database (F1)

`app01` records `013-line-graph-enabled`, applied from `C:\crowdPoll\line-graph-toggle`; `main` stops at `012`.

If the record no longer holds `013-line-graph-enabled` (this walk-through was already done, and `npm run dev` in `main`
starts at once), start the server in `C:\crowdPoll\line-graph-toggle` once and stop it: it applies
`013-line-graph-enabled` again, and `main` refuses to start as in step 2.

1. Stop every server using `app01`.
2. `npm run dev` in `main` → refuses to start with
   `Migration check failed: corrupted migrations: previously executed migration 013-line-graph-enabled is missing`
   and the line naming `npm run fix-migrations`.
3. `npm run fix-migrations` → plan shows `Roll back 013-line-graph-enabled (down() from C:\crowdPoll\line-graph-toggle)`
   and ends `Dry run: nothing written`. `polls.line_graph_enabled` still exists.
4. `npm run fix-migrations -- --apply` → `Done: 1 change(s) applied`; `polls.line_graph_enabled` is gone and
   `kysely_migration` ends at `012-line-graph-tally`.
5. `npm run fix-migrations` → `Nothing to fix`.
6. `npm run dev` in `main` → `[server] Database schema is up to date`.
7. Starting the server in `line-graph-toggle` → `Applied 1 migration(s): 013-line-graph-enabled`.

## 3. Renamed at merge (F2)

F2 and F3 are covered end to end by the automated tests. To see F2 by hand after section 2:

1. In any SQL client on `app01`: `update kysely_migration set name = '099-line-graph-tally' where name = '012-line-graph-tally'`
   (the record now carries a number the folder does not have, as after a renumbering).
2. `npm run dev` → refuses: `previously executed migration 099-line-graph-tally is missing`.
3. `npm run fix-migrations` → `Rename 099-line-graph-tally → 012-line-graph-tally`; `--apply` → `Done: 1 change(s) applied`;
   no schema change; `npm run dev` starts.

## 4. Refusals

- `$env:ENV_DATABASE_URL` pointing at a non-local host → the host-refusal line, exit 1, no connection attempt.
- `npm run fix-migrations -- --force` → the unknown-argument line, exit 1.
- With a server starting at the same moment (lock held), `--apply` → after 10 s, `the database is being migrated by
  another process`, exit 1.

## 5. The document

From `README.md`'s Testing section, open `devScripts/MIGRATIONS-HOWTO.md` and follow "Recovering" alone for step 2.
