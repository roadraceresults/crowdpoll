# Quickstart: validating Search and Scalability Database

**Phase 1 output** — one runnable validation per user story in `spec.md`. Contracts are in
`contracts/`; the data model in `data-model.md`. This is a validation guide, not an
implementation guide.

## Prerequisites

- Node 22, `npm install` (adds `pg`, `kysely`, `iovalkey`, `@opensearch-project/opensearch`,
  `@aws-sdk/client-s3`, `compression`, `embedded-postgres`; removes `mongodb`,
  `mongodb-memory-server`).
- **Tests**: nothing else — `embedded-postgres` downloads a PostgreSQL binary on first run.
- **Local run**: a PostgreSQL 16 (the Windows installer or Docker Desktop);
  `devScripts/launch-dev.ps1` regenerated from the example with `ENV_DATABASE_URL`. Leave
  `ENV_VALKEY_URL`, `ENV_OPENSEARCH_URL` and `ENV_SPACES_BUCKET` unset to use the in-process
  cache/queue, PostgreSQL full-text search and instance-served TRENDING.
- **Optional parity**: a local Valkey (`ENV_VALKEY_URL`) enables the integration test; a local
  OpenSearch (Docker) enables the S2 path. See "Optional local services" below.

```
npm test                     # whole suite on embedded-postgres + the in-process cache/queue
npm run dev                  # http://localhost:9999 with ENV_* from launch-dev.ps1
npx tsx devScripts/populate/seed-polls.ts --polls 250000 --skew   # 250k polls with vote skew
```

## Optional local services (Valkey and OpenSearch)

Neither is needed for `npm test` or `npm run dev`; both run as Docker Desktop containers.
Neither has a native Windows installer worth using. Docker Desktop must be running first — a
`failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine` error means
it is not; start it and wait until `docker info` succeeds.
new = """Neither is needed for `npm test` or `npm run dev`; both run as Docker Desktop containers.

### Valkey — enables `tests/cache-valkey.integration.test.ts`

```powershell
docker run -d --name valkey -p 6379:6379 --restart unless-stopped valkey/valkey:8
docker exec valkey valkey-cli ping        # PONG
```

Set `ENV_VALKEY_URL` in `devScripts/launch-dev.ps1` / `.vscode/launch.json`, or for one test
run:

```powershell
$env:ENV_VALKEY_URL = "redis://localhost:6379"
npm test
```

The suite is `describe.skipIf(!url)`, so it runs only when the variable is set. Running the dev
server with it set also puts the fleet-shared state (sessions, floors, the vote stream and its
`writers` consumer group, the `instance:<id>` heartbeat) in Valkey, where `valkey-cli` can
inspect it (US5).

### OpenSearch — enables the S2 search path

`src/search/openSearch.ts` builds the client as `new Client({ node: url })` — no credentials, no
TLS options — so the local container must serve **plain HTTP with the security plugin
disabled**:

```powershell
docker run -d --name opensearch -p 9200:9200 -p 9600:9600 --restart unless-stopped `
  -e "discovery.type=single-node" `
  -e "DISABLE_SECURITY_PLUGIN=true" `
  -e "OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m" `
  opensearchproject/opensearch:2
curl http://localhost:9200               # cluster JSON once it is up (allow ~30 s)
```

```powershell
$env:ENV_OPENSEARCH_URL = "http://localhost:9200"
npm run dev
```

On first boot the app creates the index itself (`[search] Created the OpenSearch index
"polls"`); the outbox drain then pushes changed polls into it every
`ENV_OUTBOX_DRAIN_INTERVAL` ms, so a freshly seeded set appears within that interval.

Notes:

- The mapping asks for `number_of_replicas: 1`; on a single node the index stays **yellow**,
  which is fine — searches work.
- If the container exits at once, `docker logs opensearch`: the usual causes are Docker
  Desktop's WSL2 memory ceiling (give it ≥ 2 GB) or `vm.max_map_count` — fix with
  `wsl -d docker-desktop sysctl -w vm.max_map_count=262144`.
- `npm test` covers the S2 path through the stubbed engine; a real OpenSearch is only for
  exercising it via `npm run dev` and for US2's "stop OpenSearch → PostgreSQL FTS answers"
  check (`docker stop opensearch`).
- `docker stop valkey opensearch` / `docker start valkey opensearch` to pause and resume.

## US1 — Tabs that refresh only when asked

1. `npm run dev`; open `/` as a guest → TRENDING selected, ≤ 200 cards, the three personal tabs
   disabled (clicking prompts to sign in). Watch five minutes: nothing changes.
2. Sign in; click Refresh on Favourites twice within 5 s → one request; the button disabled for
   the remainder. Switch Favourites → My PRIVATE POLLS → Favourites within 5 s → no requests
   (DevTools network).
3. Browser refresh → TRENDING selected; the network shows `trending-counts.json` (or
   `/api/trending/counts`) answered `304` when unchanged.
4. Automated: `tests/refresh-deltas.test.ts`, `tests/trending.test.ts`.

## US2 — Search

1. With the seed loaded, search a distinctive title word → that poll first; a common word →
   200 results and the truncated notice, in < 1 s; a misspelt title → still found; an
   invitation-only poll's title → absent.
2. Press Enter twice within 2 s → the second waits. Search the same words from another browser
   within 10 s → identical result (cache).
3. Stop OpenSearch (if configured) → searches still answer from PostgreSQL FTS; `search-budget`
   falls back to 200/s.
4. Automated: `tests/search-home.test.ts`, `tests/db-explain-guard.test.ts` (no `Seq Scan`). Latency at 250,000 polls (SC-001, p95 < 1 s) is measured by the search scenario of `devScripts/load/budget.js` against a seeded deployment.

## US3 — Votes always accepted

1. Vote → response carries `voteCount`, `choiceCounts`, `countsVersion`, `status: recorded`,
   `nextRefreshMs: 2000`; the Vote buttons disable for 2 s.
2. `k6 run devScripts/load/vote-burst.js` against a deployment → no `4xx/5xx` for load,
   `status` becomes `queued` once lag > 2 s, and after `npm run reconcile` (or the nightly sweep)
   `polls.vote_count` equals `COUNT(*) FROM votes` for the poll.
3. Vote twice on a Final-Vote poll within the lag window → the second is `403 already voted`.
4. Automated: `tests/votes-path.test.ts` (validation from cache, `voted:<session>` at enqueue,
   idempotent batch insert, per-IP cap, graceful stop).

## US4 — Live Results

1. Signed in, press Live Results on a card → the tab shows the poll; from a second browser vote
   on it → the count changes within 2 s, with `ENV_COUNTER_FLUSH_INTERVAL` set to 30 s to prove
   the flush is not involved.
2. Add five more polls → the first is gone, the newest on top; re-add one → it moves to the top.
3. Hide the tab → no requests; focus → they resume. Set `ENV_MAX_IDLE_TIME=60000` → the prompt
   appears after a minute; Cancel closes the tab; a page that never answers stops being served
   after 60 s + its interval (`403 live-expired`).
4. Attempt `POST /api/live/<invitation-only pid>` as an uninvited user → `403`.
5. Automated: `tests/live-results.test.ts`.

## US5 — Self-protection under load

1. Unit: `tests/load-controller.test.ts` drives R above the effective budget → `k:search` rises
   to 8, then `k:refresh` to 8, then `k:live`; votes' `nextRefreshMs` stays 2000; R < 80% →
   lowering in reverse; adding an `instance:` heartbeat raises the budget; V = 100,000 in
   `live:active` raises `k:live` before any live request is observed.
2. Unit: `tests/load-shedding.test.ts` pushes 201 requests in flight → `503` within milliseconds
   in the order search → refresh → live → other → vote; `/healthz` stays `200`.
3. Unit: `tests/cache-disconnected.test.ts` → every dynamic request `503`, `/healthz` `200`,
   sweeps and consumer paused, no PostgreSQL call for floors/budget/counters/votes.
4. Deployed: `k6 run devScripts/load/budget.js` and `live-surge.js` — see
   `contracts/config-and-deployment.md` for expected outcomes.

## US6 — Admin search

1. On `/admin`, filter state OPEN + creator "dav" → only open polls whose creator's name contains
   "dav" (any case), newest first; add `created = today` with a non-UTC browser zone → that
   calendar day only; `voteCount >= 100` → flushed counts.
2. Automated: `tests/search-admin.test.ts` (every control, day windows, `NULL` dates never
   match) and the `EXPLAIN` guard for every filter combination.

## US7 — Favourites and bookmarks

1. Bookmark a public poll → it appears in Favourites; a private poll → My PRIVATE POLLS; the
   201st → `409 bookmark-cap`. Vote in a private poll → listed in My PRIVATE POLLS.
2. Set a bookmarked poll's `closed_at` seven months back; run the removal sweep → gone, silently;
   a never-voted OPEN poll with `start_at` seven months back → gone.
3. Automated: `tests/bookmarks.test.ts`; the personal-tab membership behind Favourites and My PRIVATE POLLS is covered by `tests/tabs.test.ts`.

## US8 — Guests and reloads

1. As a guest, reload 30 times in a minute → each reload: assets `304`, trending `304`,
   `/api/config` cached, exactly one `/api/me` request; the 121st reload in a minute → `429
   too-many-loads` and the page still renders from `sessionStorage` with the notice.
2. Two guests behind one address search within 2 s → the second `429`; sign one in → separate
   floors.
3. Automated: `tests/page-loads.test.ts`.

## US9 — The new foundation

1. Fresh database → `npm run dev` runs the migrations; break a migration → start-up aborts.
2. `npm test` passes with no Docker, no Valkey, no OpenSearch, no MongoDB.
3. Deployed: scale the app to 4 → drive `budget.js` → the fleet grows and the budget follows
   within 30 s; remove load → it shrinks; watch a retiring instance's log: batch finished and
   acknowledged before exit.
4. `GET /?PID=<pid>` → redirect to `/`.
5. Automated: `tests/session-cache.test.ts` (`endSession` sole caller; never past expiry),
   `tests/counters-flush.test.ts` (write ownership), `tests/cache-valkey.integration.test.ts`
   (with `ENV_VALKEY_URL`).

## Contract check

`tests/openapi-contract.test.ts` — every route in `contracts/api-endpoints.md` is present in
`postman/openapi.json` with the `nextRefreshMs`, `retryAfterMs`, `status` and `truncated` fields;
the retired `GET /api/polls` and polled `GET /api/polls/:pid` are absent.

## Validation record — 2026-09-18

Run at the end of `/speckit-implement`, on the sandbox's embedded PostgreSQL 16.14 (tests) and
a Redis-compatible server standing in for Valkey (integration path). Nothing here needed
Docker, OpenSearch or Spaces.

| Story | Automated (`npm test`, 589 tests green) | Local run |
|---|---|---|
| US1 | `refresh-deltas`, `trending`, `tabs`, `polls-discovery`, `pages`, `client-home` (jsdom: one `/api/me` per guest load, the overlay call for a signed-in visitor, Refresh and tab switches within the floor send nothing, `304` on an unchanged TRENDING object, `trending.json` fetched only when the set changed) | `npm run dev` on a fresh database migrates and serves the tabbed page; `/?PID=x` → `302 /` |
| US2 | `search-home` (ranking, scope, AND/OR/typo, truncation, cache, floor, fallback, outbox), `db-explain-guard` (every search pass index-served), `client-home` (Enter searches, Refresh re-runs) | `POST /api/search` answers on PostgreSQL full-text search; OpenSearch not available in the sandbox — the S2 path is exercised only through the stubbed engine |
| US3 | `polls-vote` (response shape, states, mutability, rosters, cap, floor, per-IP cap), `votes-path` (cache-only validation, `queued` past the lag notice, idempotent batches, reclaim, graceful `stop()`), `client-home` (vote from a card, queued notice) | — (`k6 vote-burst.js` needs a deployment) |
| US4 | `live-results` (eligibility, LRU, live counters with the flush disabled, registry expiry, `live-expired`, floors), `client-home` (add → tab switch → timed refresh, hidden page pauses, idle prompt, Cancel) | — |
| US5 | `load-controller` (raise/lower order, caps, votes unstretched, fleet budget, predictive `k:live`, activity factor, search sub-budget), `load-shedding`, `load-floors`, `cache-disconnected` | Built server: `/healthz` `200` with `cache:"up"`, controller ticking, consumer group `writers` and the `instance:<id>` heartbeat visible in Valkey, SIGTERM stops the consumer after its batch |
| US6 | `search-admin` (every control alone and combined, day windows across a DST change, `NULL` never matches, flushed counts, `EXPLAIN` guard over every pair of controls), `client-home` (the admin form narrows the list; the periodic refresh keeps the search) | — |
| US7 | `bookmarks` (relation rows, both tabs, `409 bookmark-cap`, the three removal rules, silence), `client-home` (button toggles through the endpoints, local overlay update) | — |
| US8 | `page-loads` (bucket by session/address, `429 too-many-loads`, `max-age=300` on the configuration, fingerprinted assets immutable, HTML `ETag`, the stored copy with the notice) | Built server serves `/` with `src="/assets/<hash>/tabs.js"` and the asset with `public, max-age=31536000, immutable` |
| US9 | `server-boot` (fresh database migrated, a broken migration rejects, graceful consumer stop), `session-cache`, `counters-flush` (write ownership), `sweeps-lock` (one instance runs a tick; two consumers share the stream), `cache-valkey.integration` (14 tests green with `ENV_VALKEY_URL`) | `seed-polls.ts --polls 2000 --votes 20000 --skew` seeded a Zipf-skewed set and reconciled the counters |
| Contract | `openapi-contract` (every route documented; retired routes absent; the dynamic-request fields and envelopes present) | — |

Still to run against a deployment: the four k6 scripts in `devScripts/load/` (with the
250,000-poll seed for SC-001's search p95), the OpenSearch path with a Managed OpenSearch
cluster, and the Spaces publication of the TRENDING objects and the assets.
