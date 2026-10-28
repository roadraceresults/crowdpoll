# Implementation Report: Search and Scalability Database

**Feature**: `specs/017-SEARCH-AND-SCALABILITY-DATABASE/` | **Command**: `/speckit-implement` | **Date**: 2026-09-18

No `after_implement` hooks are registered in `.specify/extensions.yml`, so none were dispatched.

## Status

**All 102 tasks in `tasks.md` are complete and marked `[X]`.** Final validation: `tsc` clean,
`npm test` **589 passed / 14 skipped** (the skipped ones are the Valkey integration suite,
which passed 14/14 when run with `ENV_VALKEY_URL` against a local Redis-compatible server),
`npm run build` green. The baseline before the work was 478 tests.

## What was built, by phase

- **Setup** — `package.json` swapped (`mongodb`/`mongodb-memory-server` out; `pg`, `kysely`,
  `iovalkey`, `@opensearch-project/opensearch`, `@aws-sdk/client-s3`, `compression`, dev
  `embedded-postgres`, `jsdom` in, exact versions); `src/config.ts` with the 38 new variables
  and the two boot validations; launch templates, `CLAUDE.md` env table, `.do/app.yaml`.
- **Foundational** — Kysely schema + 4 migrations (generated `search`/`home_listable` columns,
  19 indexes, monthly `vote_history` partitions); cache interface with in-process and Valkey
  implementations; test harness on one embedded PostgreSQL per run (fresh database per suite);
  BetterAuth on the Kysely adapter with the session cache-aside; `/healthz`, shedding, floors,
  budget; store/service/routes re-based with unchanged behaviour; advisory-locked sweeps; the
  `EXPLAIN` guard, write-ownership and sweeps-lock tests.
- **US1–US9** — version-keyed deltas, TRENDING recompute + two-object publish, personal tabs
  and the overlay, the tabbed client (`tabs.js`, `trending.js`, `deltaClient.js`,
  `searchTab.js`, `liveResults.js`, `voteClient.js`, card changes, `pollGrid.*` removed);
  search on PostgreSQL FTS with the OpenSearch engine, outbox and fallback; the single-path
  vote (cache validation → count → `XADD` → respond) with the consumer group, reconcile sweep
  and `npm run reconcile`; Live Results registry/tab; budget controller with the predictive
  `k:live` and search sub-budget; admin structured search + form; bookmarks with the daily
  removal; page-load bucket, fingerprinted assets (`npm run build` →
  `dist/public/assets/<hash>/`, `npm run publish-assets`), the stored-copy notice; seed script,
  boot test, four k6 scripts.
- **Polish** — `postman/openapi.json` (31 paths, contract test extended), remnant removal,
  quickstart validation record, regenerated `README.md` and `ARCHITECTURE.md` at the root.

## Deviations worth knowing

- **Static migration registry instead of `FileMigrationProvider`**
  (`src/db/migrations/index.ts`): the file provider uses Node's native `import()`, which
  Vitest cannot route through its TypeScript transform. Same `Migrator`, one explicit
  provider, works under `tsx`, Vitest and `dist/`.
- **Client tests run in jsdom** (`tests/client-home.test.ts`, `tests/helpers/browser.ts`):
  there is no browser in the implementation environment, so the tab/card/vote/live/admin-search
  modules are exercised against the real routes through a `fetch` shim. `jsdom` was added as a
  dev dependency for that.
- **Shedding is two middlewares** (`countInFlight` first, `shedOther` after the dynamic
  routers) so kind-declaring routes are only judged at their own tier.
- **`devScripts/` ignore rule narrowed** (`devScripts/*` plus negations) so the committed
  operator scripts (`reconcile.ts`, `build-assets.ts`, `publish-assets.ts`, `load/`,
  `populate/seed-polls.ts` + README) are tracked while the developer's local
  `launch-dev.ps1` and seed data stay ignored. The git-ignored `.vscode/launch.json` and
  `devScripts/launch-dev.ps1` were also patched to the new variables (secrets untouched).
- **Harness default floors**: the test harness sets `ENV_MIN_VOTE_INTERVAL=1` and
  `ENV_BUDGET_CONTROLLER_INTERVAL=1` so legacy suites can vote repeatedly per session; suites
  that test floors set their own.

## Not verifiable in the implementation environment (needs a deployment)

The four k6 scripts (`devScripts/load/`), the OpenSearch path against a real cluster
(exercised only via the stubbed engine), and Spaces publication. The `apps-d-1vcpu-2gb` slug
in `.do/app.yaml` is unverified — docs.digitalocean.com was blocked — so confirm it before the
first deploy.

## Working tree

The working tree holds everything uncommitted since `43f6ce3` (planning artifacts and the
implementation); a commit had not yet been requested when this report was written.
