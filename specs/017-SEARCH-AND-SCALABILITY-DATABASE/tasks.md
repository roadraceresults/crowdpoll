---
description: "Task list for 017-SEARCH-AND-SCALABILITY-DATABASE"
---

# Tasks: Search and Scalability Database

**Input**: Design documents from `specs/017-SEARCH-AND-SCALABILITY-DATABASE/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R16), data-model.md, contracts/
(api-endpoints.md, ui-contracts.md, config-and-deployment.md), quickstart.md

**Tests**: Test tasks are included and are **not** optional. The specification names them as
deliverables (FR-064: the `EXPLAIN` guard, the write-ownership assertion, the controller, floor,
flush, consumer and delta unit tests, the seed and the four load tests), constitution v1.1.0
Principle IV requires a verifiable criterion per task, and Principle VI treats the suite as
documentation. Where a task's verification is manual it says so and points at `quickstart.md`.

**Organization**: grouped by user story. Because this feature replaces the datastore, the
Foundational phase is large and blocking — nothing compiles or runs until MongoDB is gone and the
request pipeline (session cache, floors, budget accounting, shedding, `/healthz`) exists. After it,
the nine story phases are independently demonstrable increments.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel — different files, no dependency on an incomplete task
- **[Story]**: US1–US9, mapping to the user stories in `spec.md`
- Paths are repository-relative

---

## Phase 1: Setup

**Purpose**: a known-green baseline, the dependency swap, and the configuration surface every
later task reads (`contracts/config-and-deployment.md`).

- [X] T001 Run `npm test` and `npm run build` on the untouched tree and record both as green; every later checkpoint compares against this
- [X] T002 Swap dependencies in `package.json`: remove `mongodb` and `mongodb-memory-server`; add `pg`, `kysely`, `iovalkey`, `@opensearch-project/opensearch`, `@aws-sdk/client-s3`, `compression`, and dev `embedded-postgres`, `@types/pg`, `@types/compression`; pin exact versions (research R1–R5, R15); run `npm install`
- [X] T003 Replace the storage and polling variables in `src/config.ts`: remove `ENV_MONGODB_NAME`, `ENV_MONGODB_URI`, `ENV_POLLING_INTERVAL`; add the 38 variables of `contracts/config-and-deployment.md` (34 table rows; the Spaces row holds five) with their defaults and the boot validations (`ENV_BUDGET_CONTROLLER_INTERVAL ≤ min(floors)`, cap ≥ per-instance budget); keep every retained variable untouched
- [X] T004 [P] Extend `tests/config.test.ts` for the new defaults, the removed variables and the two boot validations
- [X] T005 [P] Update `.vscode/launch.json.example` and `devScripts.example/launch-dev.ps1` with the new variables (development values: `ENV_DATABASE_URL` only; cache, search and Spaces unset) and remove the three retired ones
- [X] T006 [P] Update the environment-variable table in `CLAUDE.md` (Environment Variables section) for the 38 added and 3 removed variables, following the project's env-var checklist
- [X] T007 [P] Add `.do/app.yaml` per `contracts/config-and-deployment.md`: dedicated 1 vCPU / 2 GiB, autoscaling 4–12 at 70% CPU, health check `/healthz`, 30 s termination grace, the env list with the four connection strings and Spaces keys as secrets — one service component only; static assets are published to Spaces (T089), not an App Platform static component

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: PostgreSQL through Kysely with migrations, the cache/queue interface and both
implementations, the session cache-aside, the request pipeline (floors, budget accounting,
shedding, `/healthz`), the shared counters/versions/membership modules, the re-based store and
services with unchanged behaviour (FR-065), the test harness on `embedded-postgres`, and every
existing suite green again. **No user story can begin until this phase is complete.**

### Database

- [X] T008 Create `src/db/schema.ts` with the Kysely `Database` interface for every table in `data-model.md` (`polls`, `votes`, `vote_history`, `poll_invitations`, `poll_bans`, `bookmarks`, `user_polls`, `search_outbox`, the auth tables)
- [X] T009 Create `src/db/client.ts`: a `pg` `Pool` from `ENV_DATABASE_URL` (max 20) wrapped in `Kysely<Database>` with `PostgresDialect`; export `createDb()` and `closeDb()` (research R1)
- [X] T010 Create `src/db/migrator.ts`: Kysely `Migrator` with `FileMigrationProvider` over `src/db/migrations/`; `migrateToLatest()` rejects on any failure so `server.ts` aborts start-up
- [X] T011 Write `src/db/migrations/001-extensions-and-auth.ts`: `CREATE EXTENSION IF NOT EXISTS pg_trgm`; the BetterAuth tables emitted by `npx @better-auth/cli generate` for the Kysely/PostgreSQL adapter; `UNIQUE INDEX ON "user" (lower(user_name))` (research R2)
- [X] T012 Write `src/db/migrations/002-polls.ts`: the `polls` table with every column of `data-model.md`, the generated `search` tsvector (weights A/B/C/D) and `home_listable` boolean, and all sixteen indexes including the two partial home indexes and `GIN (title gin_trgm_ops)`
- [X] T013 [P] Write `src/db/migrations/003-participation.ts`: `votes`, `poll_invitations`, `poll_bans`, `bookmarks` (+ `(poll_id)` index), `user_polls` (+ `(email, updated_at DESC)` index), `search_outbox`
- [X] T014 [P] Write `src/db/migrations/004-vote-history.ts`: `vote_history` partitioned by range on `voted_at` with the current and next month's partitions and a `(poll_id, voted_at)` index per partition; a helper `ensureVoteHistoryPartition(month)` in `src/db/partitions.ts` for the schedule sweep

### Cache and queue

- [X] T015 Create `src/cache/cache.ts`: the interface of research R3 (`get/set/setNx/incr/expire/hincrby/hgetall/sadd/sismember/srem/zadd/zcard/zremrangebyscore/lock/xadd/xreadgroup/xack/xautoclaim/xtrim/isConnected/onDisconnect/onReconnect`) and the `createCache(config)` selector (`ENV_VALKEY_URL` unset → memory)
- [X] T016 [P] Implement `src/cache/memoryCache.ts`: `Map`-backed values with TTL timers, sets, sorted sets, hashes, an in-process stream with consumer-group semantics (pending entries, ack, claim, trim) and a test-only `setDisconnected(bool)` switch
- [X] T017 [P] Implement `src/cache/valkeyCache.ts` with `iovalkey`: `commandTimeout` 100 ms, `maxRetriesPerRequest` 0, `enableOfflineQueue` false, `isConnected()` from `ready`/`end` events, disconnect/reconnect hooks
- [X] T018 [P] Write `tests/cache-memory.test.ts` covering every interface method against `memoryCache`, including consumer-group pending/ack/claim behaviour, and `tests/cache-valkey.integration.test.ts` running the same assertions against `valkeyCache` and skipping when `ENV_VALKEY_URL` is unset

### Test harness

- [X] T019 Rewrite `tests/helpers/setup.ts`: start one `embedded-postgres` cluster per Vitest worker (per-worker port and data directory), run `migrateToLatest()`, build the app with `memoryCache`, expose `db`, `cache`, `app`, `auth`, `sent`, `stop()`; drop every MongoDB reference (research R15)
- [X] T020 [P] Rewrite `tests/helpers/poll-fixtures.ts` and `tests/helpers/state-helpers.ts` to insert rows through Kysely (polls, votes via the `votes` table, rosters, `user_polls`) with the same fixture names the existing suites use

### Authentication and sessions

- [X] T021 Re-base `src/auth/auth.ts` on BetterAuth's Kysely/PostgreSQL adapter (`database: { db, type: "postgres" }`), leave `session.cookieCache` disabled, and re-base `src/auth/username.ts` on the migration's unique index (research R2)
- [X] T022 Create `src/auth/sessionCache.ts`: cache-aside `getSession(req)` on `sess:<sha256(token)>` storing `expiresAt`, TTL `ENV_SESSION_CACHE_TTL`, never served past `expiresAt`; `endSession(token)` — the sole caller of `auth.api.signOut` — deletes the key; replace every `auth.api.getSession` call in `src/routes/api.ts` and `src/routes/pollsApi.ts` with it and route `POST /api/auth/logout` through `endSession`
- [X] T023 [P] Write `tests/session-cache.test.ts`: second lookup hits the cache; `endSession` deletes the entry; an entry is not served past the session's own expiry; `endSession` is the sole caller of sign-out (static assertion over `src/`)

### Request pipeline

- [X] T024 Create `src/routes/healthz.ts`: `GET /healthz` answering `200 { ok, cache, shed }` with a 50 ms Valkey `PING`, registered in `server.ts` before any middleware (research R12)
- [X] T025 Create `src/load/shedding.ts`: in-flight counter and `perf_hooks.monitorEventLoopDelay` sampler; per-route `kind` (`search | refresh | live | vote | other`) set by a `withKind(kind)` helper; sheds `503` + `Retry-After` + `{ retryAfterMs, nextRefreshMs }` in the order search → refresh → live → other → vote when over `ENV_INSTANCE_MAX_INFLIGHT` or `ENV_INSTANCE_MAX_EVENT_LOOP_LAG`, or while `cache.isConnected()` is false for every kind but `other`; per-kind shed counters exposed to `/healthz` and logged once a minute when non-zero
- [X] T026 [P] Create `src/load/floors.ts`: `enforceFloor(kind)` middleware doing `SET NX PX floor:<kind>:<session|ip>` (session for signed-in, `req.ip` with `trust proxy` for guests), answering `429` + `Retry-After` + `{ error: "too-soon", retryAfterMs, nextRefreshMs }` from `PTTL` on failure (research R13)
- [X] T027 [P] Create `src/load/budget.ts`: `INCR budget:<sec>` / `search-budget:<sec>` with `EXPIRE 10`; the instance heartbeat `SET instance:<id> 1 EX 30` every 10 s; `effectiveBudget()` from a `SCAN` of `instance:*` capped by `ENV_SERVER_MAX_REFRESH_PER_SECOND`; `nextRefreshMs(kind)` = floor × `k:<kind>` with the three keys cached in-process for 250 ms and `k = 1` when absent; the vote kind always returns the unstretched vote floor
- [X] T028 Wire the pipeline in `src/server.ts`: `compression()`, `trust proxy`, `/healthz`, then shedding, then routes; every dynamic response passes through `withNextRefresh(kind)` so it carries `nextRefreshMs` (`contracts/api-endpoints.md` envelope)
- [X] T029 [P] Write `tests/load-floors.test.ts` (per-kind keys, session vs IP, `429` body and header, PTTL remainder) and `tests/load-shedding.test.ts` (201 in flight → `503` within milliseconds in the stated order; `/healthz` stays `200`; disconnected cache → every dynamic kind `503`, `other` served)

### Shared poll modules

- [X] T030 Create `src/polls/versions.ts`: `bumpContentVersion(db, cache, pid)` — increments `polls.content_version`, refreshes `poll:<pid>` from the row, upserts `search_outbox (reason 'content')`, all in the caller's transaction (research R7)
- [X] T031 Create `src/polls/counters.ts`: `countVote(pid, choiceIds)` (`HINCRBY` choice/`total`/`seq`, `HINCRBY trend:<bucket>`, `SADD dirty:<epoch>`); `readLiveCounts(pids)` (pipelined `HGETALL`); `flushDirty(db)` (swap the dirty set, one `UPDATE … FROM (VALUES …)` writing `choice_counts`, `vote_count`, `last_vote_at`, `counts_version`, then outbox upserts with reason `counters`); `reconcile(db, pids)` recomputing from `votes`; `rebuildIfMissing(pid)`
- [X] T032 [P] Create `src/polls/userPolls.ts`: `upsertRelation(trx, email, pid, relation)`; `privateTab(email, cap)` and `favouritesTab(email, cap)` queries with `membershipVersion = MAX(updated_at)`; `overlay(email, pids)` returning `{ voted, choiceIds?, bookmarked }` per pid
- [X] T033 Rewrite `src/polls/store.ts` as Kysely queries with the same exported function names the services call today (find by id, list for admin, create, update, state transitions, rosters, participants, exports' reads), calling `bumpContentVersion` on every state/content write, setting `closed_at` on the CLOSED transition, writing `invited_count`/`banned_count` and deleting `invite:<pid>`/`ban:<pid>` in the roster transaction, and upserting `user_polls` on create and invite
- [X] T034 Re-base `src/polls/service.ts` and `src/polls/screening.ts` on the new store with **no change of behaviour** (FR-065): eligibility, edit lock, screening, duplicate, exports; remove the `currentVotes` array reads in favour of `votes`-table queries; correct requirement-ID comments only in rewritten regions
- [X] T035 Re-base `src/routes/api.ts` (profile, sign-in) and the admin routes of `src/routes/pollsApi.ts` on the new store; keep `GET /api/polls` and `GET /api/polls/:pid` serving the existing grid from the new store until US1 retires them (T050); add the `created_by_name` rename fan-out (`UPDATE polls … WHERE created_by_id`, `bumpContentVersion`, outbox) to the profile route's rename transaction (research R16; architecture U-3)
- [X] T036 Rewrite `src/polls/sweeps.ts`: each sweep tick takes `pg_try_advisory_lock(<id>)` per the lock table in `contracts/config-and-deployment.md` and returns immediately when it loses; register approval, schedule (+ `ensureVoteHistoryPartition` for next month), counter flush, and a stub for the sweeps later stories add; `pause()/resume()` wired to `cache.onDisconnect/onReconnect`; informative one-line log per tick
- [X] T037 Retire the standalone route: `src/routes/pages.ts` redirects `/?PID=…` to `/`; leave `src/public/pollGrid.js`, `pollGrid.css` and `pollCard.js`'s polling in place until US1 replaces them (T050–T054); remove from `tests/poll-card-assets.test.ts` and `tests/pages.test.ts` only the cases that exercised the standalone route (FR-066)
- [X] T038 Re-base every existing suite on the new harness with assertions unchanged — `auth`, `session`, `profile`, `signin-mode`, `rate-limit`, `pages`, `polls-admin-crud`, `polls-admin-participants`, `polls-editing-eligibility`, `polls-editing-lock`, `polls-schedule-sweep`, `polls-screening`, `polls-service`, `polls-state-machine`, `poll-lifecycle-e2e`; `polls-discovery` and `polls-vote` are rewritten in US1 and US3 — and run `npm test` green
- [X] T039 [P] Write `tests/db-explain-guard.test.ts`: with `enable_seqscan = off` and a 200-row seed, run every listing query and every admin filter combination through `EXPLAIN (FORMAT JSON)` and fail on any `Seq Scan` of `polls` (research R15)
- [X] T040 [P] Write `tests/counters-flush.test.ts`: `countVote` increments choice/`total`/`seq` and the trend bucket; `flushDirty` writes the four row columns and the outbox; `reconcile` corrects a forced drift; write ownership — instrument Kysely so any `UPDATE polls` touching `vote_count`/`choice_counts`/`last_vote_at`/`counts_version` outside `flushDirty`/`reconcile` fails the test
- [X] T040a [P] Write `tests/sweeps-lock.test.ts`: build two app instances on the same `embedded-postgres` cluster and memory cache, fire one tick of the flush and trending sweeps on both, and assert exactly one instance ran the tick (the other's `pg_try_advisory_lock` returned false and it logged the skip) while the consumer loop runs on both (FR-058, SC-013)

**Checkpoint**: `npm test` green on `embedded-postgres` with the memory cache; MongoDB gone; the
home grid still renders through the re-based `GET /api/polls` until US1 replaces it;
`/healthz` and the pipeline live; admin page, screening, rosters, profile and exports behave as
before.

---

## Phase 3: User Story 1 — Tabs that refresh only when asked (Priority: P1) 🎯 MVP

**Goal**: the five-tab home page; TRENDING recomputed every minute from buckets and published as
two objects (CDN or instance-served); personal tabs as one query with version-keyed deltas; the
overlay; held copies and floors on the client; card buttons and guest states.

**Independent Test**: `quickstart.md` US1 — TRENDING on arrival with ≤ 200 cards; no tab
changes on its own; Refresh twice in 5 s → one request; tab switches within 5 s → no request;
browser refresh → TRENDING via `304`; signed-in overlay shown; guests see the personal tabs
disabled.

- [X] T041 [US1] Create `src/refresh/deltas.ts`: `computeDelta(request, current)` producing `304` / `{ counters }` / `{ cards }` / `{ order, cards }` per `contracts/api-endpoints.md`, comparing `content_version` from `poll:<pid>` and the live `seq` from `cnt:<pid>` (research R8, R9)
- [X] T042 [P] [US1] Write `tests/refresh-deltas.test.ts`: current versions → `304`; moved `seq` → counters only; moved `content_version` → the card; membership change → `order` plus cards for missing ids; counts never step backwards
- [X] T043 [US1] Create `src/trending/recompute.ts`: sum the trailing twelve `trend:<bucket>` hashes, filter candidates to `home_listable` polls in `OPEN` or `EDITING`-with-prior-`OPEN`, take the top `ENV_MAX_TRENDING_POLLS` by bucket sum then `vote_count`, compute `membershipVersion = sha256(sorted ids)`, write `listing:trending` (compressed bytes + version) (research R10)
- [X] T044 [US1] Create `src/trending/publish.ts`: build `trending-counts.json` and `trending.json`; when `ENV_SPACES_BUCKET` is set, `PUT` the counts object every recompute and the cards object only when the membership hash changed, with `Cache-Control: public, max-age=<interval s>`, gzip and `ETag`, via `@aws-sdk/client-s3`
- [X] T045 [US1] Register the trending sweep (lock id 4, `ENV_TRENDING_POLLS_RECOMPUTE_INTERVAL`) in `src/polls/sweeps.ts` and add `GET /api/trending/counts` and `GET /api/trending/cards` (instance-served from `listing:trending`, `If-None-Match` → `304`, `max-age`) to `src/routes/tabsApi.ts`
- [X] T046 [P] [US1] Write `tests/trending.test.ts`: bucket recompute; ties by `vote_count`; EDITING-with-prior-OPEN kept, CLOSED excluded; membership hash unchanged on reorder; counts object published every run, cards object only on a set change (S3 client stubbed); instance endpoints honour `If-None-Match`
- [X] T047 [US1] Add the tab endpoints to `src/routes/tabsApi.ts`: `POST /api/tabs/private/refresh` and `POST /api/tabs/favourites/refresh` (kind `refresh`, session required, `userPolls` queries + `computeDelta`, overlay inline) and `GET /api/me/polls?pids=` (kind `refresh`, cap `ENV_MAX_POLLS_SEARCH_RESULTS`); mount in `server.ts`
- [X] T048 [US1] Extend `GET /api/config` in `src/routes/api.ts` with `trendingBaseUrl`, the four floors and `ENV_MAX_LIVE_RESULTS_PER_USER`; add `Cache-Control: public, max-age=300`
- [X] T049 [P] [US1] Write `tests/tabs.test.ts`: personal tabs return only the user's relations with the right visibility, ordered by `updated_at`, capped; membership version = `MAX(updated_at)`; overlay shape and cap; `429` on an early refresh; `nextRefreshMs` present on every response
- [X] T050 [US1] Rewrite `src/public/index.html` as the tabbed page (five tabs always present; search box; TRENDING selected); create `src/public/tabs.css`; delete `src/public/pollGrid.js` and `src/public/pollGrid.css`; remove the standalone mount and the polling timer from `src/public/pollCard.js`; retire `GET /api/polls` and the polled `GET /api/polls/:pid` in `src/routes/pollsApi.ts` (FR-066)
- [X] T051 [US1] Create `src/public/deltaClient.js`: version map per tab, apply `counters` (keep the higher `countsVersion`), replace `cards`, apply `order` and prune
- [X] T052 [US1] Create `src/public/tabs.js`: tab state and held copies with `receivedAt`; click renders the copy and requests only when older than the manual floor, none held, or Refresh after the floor; Refresh button disabled for the floor; `nextRefreshMs`, `429`/`503` handling with `retryAfterMs` (+ jitter on `503`); guest state — personal tabs disabled with the sign-in prompt (`contracts/ui-contracts.md`)
- [X] T053 [US1] Create `src/public/trending.js`: fetch `trending-counts.json` from `trendingBaseUrl` with `If-None-Match`, apply counts and order, fetch `trending.json` only when the membership hash differs; `sessionStorage` copy rendered first when younger than the recompute interval; client-enforced manual floor; overlay fetch for ids without an entry and local overlay updates after the user's own actions
- [X] T054 [US1] Update `src/public/pollCard.js` for the card contract: Vote on every card except Search, Live Results on every card except the Live Results tab, Bookmark on every card, guest prompts; render the overlay; keep enumerations verbatim
- [X] T055 [US1] Rewrite `tests/polls-discovery.test.ts` for the tab model (TRENDING scope, personal tabs, guest access to instance-served tabs → `401`) and extend `tests/pages.test.ts` for the tabbed `index.html` and the `?PID=` redirect

**Checkpoint**: the home page works end to end on the memory cache with instance-served
TRENDING; `quickstart.md` US1 passes.

---

## Phase 4: User Story 2 — Find polls by typing words (Priority: P2)

**Goal**: free-text search behind one interface with two engines, the normalised result cache,
the outbox drain, and the Search tab.

**Independent Test**: `quickstart.md` US2 — distinctive word first; common word → 200 +
truncated in < 1 s; misspelling found; invitation-only absent; second Enter within 2 s waits;
identical query within 10 s served from cache; OpenSearch down → PostgreSQL FTS.

- [X] T056 [US2] Create `src/search/search.ts`: `search(scope, text, limit)` interface, engine selection by `ENV_OPENSEARCH_URL` and health, the normalised-key result cache (`search:<sha256(normalised + scope)>`, TTL `ENV_SEARCH_CACHE_TTL`), `truncated` from `cap + 1`
- [X] T057 [P] [US2] Implement `src/search/pgSearch.ts`: AND pass (`websearch_to_tsquery`), OR pass (`to_tsquery` joined by `|`), typo pass (`similarity(title, $q) > 0.3`, ≥ 3 chars), each bounded to the 5,000 newest under `WHERE home_listable`, `ts_rank_cd` then `vote_count`, `created_at`; de-duplicated across passes (research R6)
- [X] T058 [P] [US2] Implement `src/search/openSearch.ts`: index mapping (`title`, `subtitle`, `choice_labels`, `keywords`, `vote_count`, `created_at`, versions; `english` analyzer), the three-pass `multi_match` + `function_score` queries, `ensureIndex()`, a `cluster.health` probe cached 5 s that selects the fallback (research R5)
- [X] T059 [US2] Create `src/search/outbox.ts`: the drain sweep (lock id 5, `ENV_OUTBOX_DRAIN_INTERVAL`) reading `search_outbox` in batches, building each document with the `searchText` function shared with the generated column's inputs, bulk-indexing home-listable polls and deleting others, coalesced per poll; register in `src/polls/sweeps.ts`; `reindexAll()` = insert every home-listable id
- [X] T060 [US2] Add `POST /api/search` (kind `search`) and `POST /api/search/refresh` (kind `refresh`; a miss still increments `search-budget`) to `src/routes/tabsApi.ts`; responses carry `results`, `truncated`, `nextRefreshMs` and cards without overlay; wire the engines into `src/server.ts` boot step 4 — `createSearch(config, cache)` selects OpenSearch when `ENV_OPENSEARCH_URL` is set, runs `ensureIndex()` and the first health probe before routes are mounted, and falls back to PostgreSQL FTS (logging which engine is serving) when the probe fails (`contracts/config-and-deployment.md`, start-up sequence)
- [X] T061 [P] [US2] Write `tests/search-home.test.ts`: scope (states, EDITING-after-public, invitation-only absent); title beats subtitle beats choices; AND then OR then typo; `truncated` at cap + 1; normalised cache hit within TTL; search floor `429`; fallback when the OpenSearch stub reports unhealthy; outbox drain coalesces per poll and removes non-listable polls; the application's `searchText()` equals the input of the stored `search` expression for sampled polls (FR-048)
- [X] T062 [US2] Create `src/public/searchTab.js`: Enter → `POST /api/search`, select the Search tab, clear the box, render results and the truncated notice; Refresh → `POST /api/search/refresh` with the last query; wire into `tabs.js`

**Checkpoint**: search works on PostgreSQL FTS locally and on OpenSearch when configured;
`quickstart.md` US2 passes.

---

## Phase 5: User Story 3 — A vote is always accepted and immediately reflected (Priority: P3)

**Goal**: the single-path vote (validate from cache → count → `XADD` → respond with counts and
status), the consumer group with batched idempotent inserts, abuse bounds, and the client's
pending-vote retry.

**Independent Test**: `quickstart.md` US3 — response carries counts and `status: recorded`;
buttons disabled 2 s; burst above drain → no refusals, `queued` past 2 s lag, reconcile makes
rows equal counts; second Final-Vote vote refused inside the lag window; per-IP cap alerts.

- [X] T063 [US3] Create `src/votes/rosterCache.ts`: `ban:<pid>` / `invite:<pid>` sets loaded from the roster tables on first use (TTL 1 h, refreshed on read), `isBanned(pid, email)`, `isInvited(pid, email)`; invalidation hook called by the roster transaction in `src/polls/store.ts`
- [X] T064 [US3] Create `src/votes/votePath.ts`: validation from cache (`poll:<pid>` state and mutability, roster sets, `SISMEMBER voted:<session>` with rebuild from `votes` on a miss, PostgreSQL only on a miss); per-IP counter `votes-ip:<ip>` with `429 ip-vote-cap`, an `abuse.ipVoteCap` counter exposed on `/healthz` and an `[abuse]` server log line (the platform alert policy matches it) at `ENV_MAX_VOTES_PER_IP_PER_MINUTE`; `countVote`; `XADD votes`; `SADD voted:<session>`; response `{ status, voteCount, choiceCounts, countsVersion, myChoiceIds, nextRefreshMs = vote floor }` with `status` from `queue:lag` (research R4, R13)
- [X] T065 [US3] Rewrite `POST /api/polls/:pid/vote` in `src/routes/pollsApi.ts` to call `votePath` with kind `vote` (never stretched; counted in the budget)
- [X] T066 [US3] Create `src/votes/consumer.ts`: `XGROUP CREATE writers MKSTREAM` at boot; per-instance consumer loop `XREADGROUP COUNT ENV_VOTE_BATCH_SIZE BLOCK 1000`; group the batch by `vote_mutability`; one multi-row `INSERT … ON CONFLICT DO UPDATE` / `DO NOTHING` plus `vote_history` and `user_polls (voted)` rows in one transaction; `XACK`; periodic `XTRIM`; `XAUTOCLAIM` pass with `MIN-IDLE-TIME ENV_VOTE_QUEUE_LAG_NOTICE`; `queue:lag` sampled once a second; `pause()/resume()` on cache disconnect; `stop()` finishes and acks the held batch (research R4)
- [X] T067 [US3] Wire the consumer into `src/server.ts` start-up and `SIGTERM` handling (stop accepting → consumer `stop()` → sweeps stop → pools close → exit), and register the nightly reconcile sweep (lock id 7) over yesterday's dirty sets in `src/polls/sweeps.ts`; add an `npm run reconcile` script (`devScripts/reconcile.ts`) that runs one reconcile tick over every poll with a `cnt:<pid>` hash and exits, for quickstart US3 and operator use
- [X] T068 [P] [US3] Rewrite `tests/polls-vote.test.ts` and write `tests/votes-path.test.ts`: validation outcomes (open, banned, uninvited, already voted incl. during the lag window via `voted:<session>`); counts in the response equal `cnt:<pid>`; `status` flips to `queued` when `queue:lag` ≥ notice; per-session floor across polls; per-IP cap; consumer idempotency (Dynamic-Vote replaces, Final-Vote ignores duplicates); `vote_history` and `user_polls` rows; `XAUTOCLAIM` reclaims a stuck entry; `stop()` acks before resolving
- [X] T069 [US3] Create `src/public/voteClient.js`: vote → update counts and overlay from the response, disable Vote buttons for `nextRefreshMs`, show the queued notice on `status: "queued"`; on `429`/`503` keep the vote pending and retry once after `retryAfterMs` (+ jitter on `503`); existing refusal messages on `403`; wire into `pollCard.js`

**Checkpoint**: votes never fail for load on the memory stream; `quickstart.md` US3 passes.

---

## Phase 6: User Story 4 — Watch up to five polls live (Priority: P4)

**Goal**: the Live Results tab served from live counters, the LRU list, view eligibility on add,
the expiry-scored registry, the idle prompt and the hidden-page pause.

**Independent Test**: `quickstart.md` US4 — a vote appears within 2 s with the flush set to
30 s; sixth poll evicts the oldest; hidden page sends nothing; idle prompt at the configured
time; a lapsed registration gets `403 live-expired`; uninvited add → `403`.

- [X] T070 [US4] Create `src/live/registry.ts`: `addPoll(session, pid)` with the 016 view-eligibility check (public; private with link; invitation-only if invited or creator) cached in `live:<session>`, LRU of `ENV_MAX_LIVE_RESULTS_PER_USER`; `removePoll`; `touch(session, nextRefreshMs)` → `ZADD live:active <now + nextRefreshMs + ENV_MAX_IDLE_TIME> <session>`; `isRegistered(session)`
- [X] T071 [US4] Create `src/live/liveTab.ts`: the one-request refresh reading `poll:<pid>` and `readLiveCounts` for the session's polls and returning `computeDelta` output; never PostgreSQL (assert in tests via the instrumented Kysely)
- [X] T072 [US4] Add `POST /api/live/:pid`, `DELETE /api/live/:pid` (kind `refresh`) and `POST /api/live/refresh` (kind `live`; `403 live-expired` when not registered; `nextRefreshMs = ENV_MIN_LIVE_REFRESH_INTERVAL × k:live`) to `src/routes/tabsApi.ts`
- [X] T073 [P] [US4] Write `tests/live-results.test.ts`: eligibility on add (`403` for an uninvited user by id); LRU move-to-top and eviction; refresh reads the live `seq` (vote visible with the flush disabled); registry score = now + handed interval + idle time; pruned entry → `403 live-expired`; live floor `429`; no database access during a refresh
- [X] T074 [US4] Create `src/public/liveResults.js`: the LRU list UI; timer at the last `nextRefreshMs`, never below the live floor; pause on `document.hidden`, resume on focus; idle prompt after `ENV_MAX_IDLE_TIME` (Yes restarts and refreshes; Cancel removes all and closes the tab); `403 live-expired` treated as Cancel; wire the Live Results button (every card except the Live Results tab, search results included) to `POST /api/live/:pid` and tab switch

**Checkpoint**: Live Results is the only auto-refreshing surface and reads live counts;
`quickstart.md` US4 passes.

---

## Phase 7: User Story 5 — The site protects itself under load (Priority: P5)

**Goal**: the budget controller with the priority order, caps and predictive `k:live`; the
search sub-budget; the disconnected-cache behaviour; alerting; the budget and surge load tests.

**Independent Test**: `quickstart.md` US5 — unit: multipliers rise search → refresh → live and
lower in reverse; votes unstretched; heartbeat raises the budget; V in the registry raises
`k:live` before any live request; shedding order; disconnected cache → `503`s, `/healthz` `200`,
sweeps paused, no PostgreSQL fallback. Deployed: `budget.js` and `live-surge.js` outcomes.

- [X] T075 [US5] Create `src/load/controller.ts` as the budget-controller sweep (lock id 8, `ENV_BUDGET_CONTROLLER_INTERVAL`): read R and the search counter for the last full second, prune `live:active`, read V, compute the activity factor and `k_pred`, apply the raise rule (search → refresh → live; `ENV_MAX_STRETCH` caps on search and refresh; live uncapped) and the lower rule (below `ENV_BUDGET_LOWER_THRESHOLD_PERCENT`, reverse order, one step per tick), `k:live = max(k_pred, k_observed)`; write `k:search`, `k:refresh`, `k:live`; log each tick's R, B, V and multipliers (research R11)
- [X] T076 [US5] Wire the search sub-budget: `src/search/search.ts` increments `search-budget:<sec>` on engine queries only and the controller raises `k:search` above `ENV_SERVER_MAX_SEARCH_PER_SECOND` (or `_FALLBACK` while PostgreSQL FTS serves)
- [X] T077 [P] [US5] Write `tests/load-controller.test.ts`: raise order and caps; lowering in reverse one step per tick; votes' `nextRefreshMs` unchanged; effective budget = 1,250 × heartbeats, capped; predictive `k:live` from V before observed live traffic; activity factor with hidden tabs; search sub-budget raises `k:search` alone; fallback sub-budget applies when the engine is unhealthy
- [X] T078 [P] [US5] Write `tests/cache-disconnected.test.ts`: with `memoryCache.setDisconnected(true)` every dynamic request is `503` within the timeout, `/healthz` is `200` with `cache: "down"`, `/api/me` and the admin search still answer, sweeps and the consumer pause and resume, and the instrumented Kysely records no floor/budget/counter/vote write during the outage
- [X] T079 [P] [US5] Write `devScripts/load/budget.js` and `devScripts/load/live-surge.js` (k6) with the checks in `contracts/config-and-deployment.md`, plus `devScripts/load/README.md` describing targets, expected outcomes and how to write measured values back into the defaults; `budget.js` includes a search scenario over the 250,000-poll seed (distinctive, common and misspelt terms) with a p95 < 1 s check (SC-001)

**Checkpoint**: load is bounded by configuration and a surge produces no `503`s at its start;
`quickstart.md` US5 unit steps pass; the k6 scripts are ready for a deployment.

---

## Phase 8: User Story 6 — Administrators search polls with structured filters (Priority: P6)

**Goal**: the one-statement admin search with every control, day windows in the administrator's
zone and the admin page's search form; the admin list's own refresh untouched.

**Independent Test**: `quickstart.md` US6 — state + creator "dav"; `created = today` in a
non-UTC zone; `voteCount >= 100` on flushed counts; the `EXPLAIN` guard for every combination.

- [X] T080 [US6] Create `src/search/adminSearch.ts`: the parameterised query of `contracts/api-endpoints.md` (free text `@@`, four equalities, `ILIKE '%x%'`, three UTC `[from, to)` windows computed with `Intl.DateTimeFormat` from the `tz` parameter, three counter comparisons), `ORDER BY created_at DESC, id DESC LIMIT cap + 1`, `truncated`
- [X] T081 [US6] Add `GET /api/admin/polls/search` behind the existing admin guard in `src/routes/pollsApi.ts` (not a dynamic request)
- [X] T082 [P] [US6] Write `tests/search-admin.test.ts`: every control alone and combined; blanks ignored; contains matches any case and position; `=`/`>=`/`<=` day windows in a non-UTC zone across a DST boundary; `NULL` start/end never match; `truncated`; the `EXPLAIN` guard extended with every filter combination
- [X] T083 [US6] Add the search form to `src/public/admin.html` and `src/public/adminList.js` (free text, four dropdowns, creator box, three date selectors with operators, three counter controls, a truncated notice) rendering results into the existing admin list without altering its periodic refresh or the edit-mode exemption

**Checkpoint**: `quickstart.md` US6 passes; the admin list refresh and edit lock behave as before.

---

## Phase 9: User Story 7 — Favourites and bookmarks (Priority: P7)

**Goal**: bookmarks with the cap, the `bookmarked` relation feeding Favourites and My PRIVATE
POLLS, and the daily silent removal sweep.

**Independent Test**: `quickstart.md` US7 — bookmark → appears in the right tab; 201st →
`409`; closed seven months → removed silently; never-voted open poll seven months after `start_at`
→ removed.

- [X] T084 [US7] Create `src/polls/bookmarks.ts`: `add(email, pid)` refusing at `ENV_MAX_BOOKMARKS_PER_USER` and upserting `user_polls (bookmarked)` in the same transaction; `remove`; the daily removal sweep (lock id 6) deleting in batches of 10,000 by the three rules with `COALESCE(last_vote_at, start_at, created_at)`
- [X] T085 [US7] Add `POST` and `DELETE /api/polls/:pid/bookmark` (kind `refresh`, session required) to `src/routes/pollsApi.ts`; register the sweep in `src/polls/sweeps.ts`
- [X] T086 [P] [US7] Write `tests/bookmarks.test.ts`: cap refusal `409`; relation rows; Favourites and My PRIVATE POLLS membership after bookmarking public and private polls; removal by each rule including the never-voted case; silent (no notification side effects)
- [X] T087 [US7] Wire the Bookmark/Un-bookmark button in `src/public/pollCard.js` and the local overlay update in `trending.js`/`tabs.js`; guests prompted to sign in

**Checkpoint**: `quickstart.md` US7 passes.

---

## Phase 10: User Story 8 — Guests and browser refreshes cost almost nothing (Priority: P8)

**Goal**: fingerprinted immutable assets, the cacheable configuration call, the page-load bucket
on `/api/me` with the stored-copy notice, and the page-storm load test.

**Independent Test**: `quickstart.md` US8 — a reload costs one instance request; the 121st reload
in a minute renders the stored copy with the notice; two guests behind one address share floors.

- [X] T088 [US8] Create `src/load/pageLoads.ts`: `INCR pageload:<session|ip>` with `EXPIRE 60`; over `ENV_PAGE_LOADS_PER_MINUTE` answer `429 { error: "too-many-loads", retryAfterMs }`; apply to `GET /api/me` and the instance-served trending endpoints in `src/routes/api.ts` and `src/routes/tabsApi.ts`
- [X] T089 [US8] Add asset fingerprinting and publishing: the build emits `dist/public` with content-hashed filenames and rewrites `index.html` to reference them through `assetsBaseUrl` from `/api/config`; `devScripts/publish-assets.ts` uploads them to the Spaces bucket with `Cache-Control: public, max-age=31536000, immutable` using the S3 client of `src/trending/publish.ts` (skipped when `ENV_SPACES_BUCKET` is unset, in which case `src/routes/pages.ts` serves `dist/public` with the same fingerprinted names and headers); the HTML carries an `ETag` (research R16)
- [X] T090 [US8] Update `src/public/app.js`: on `429 too-many-loads` render the `sessionStorage` TRENDING copy with the "You are refreshing too quickly." notice and no error page; no new browser logging
- [X] T091 [P] [US8] Write `tests/page-loads.test.ts`: bucket keyed by session when signed in and by IP for guests; `429` past the limit; `/api/config` carries `max-age=300`; assets carry the immutable header; one `/api/me` per page load in the harness's request log
- [X] T092 [P] [US8] Write `devScripts/load/page-storm.js` (k6) per `contracts/config-and-deployment.md`

**Checkpoint**: `quickstart.md` US8 passes.

---

## Phase 11: User Story 9 — The site runs on its new foundation at the load target (Priority: P9)

**Goal**: the operator-facing remainder — migrations abort start-up on failure, the seed, the
vote-burst load test, the Valkey integration path, and the retired-view checks.

**Independent Test**: `quickstart.md` US9 — fresh database migrates on `npm run dev`; a broken
migration aborts start-up; `npm test` needs no Docker/Valkey/OpenSearch/MongoDB; `/?PID=` redirects.

- [X] T093 [US9] Create `devScripts/populate/seed-polls.ts`: 250,000 polls with a Zipf-skewed vote distribution written through the consumer's batch insert path, `user_polls` rows, and a `--polls N --skew` interface; document it in `devScripts/populate/README.md`
- [X] T094 [P] [US9] Write `devScripts/load/vote-burst.js` (k6) per `contracts/config-and-deployment.md`
- [X] T095 [P] [US9] Write `tests/server-boot.test.ts`: a failing migration rejects `createApp`; a fresh database is migrated to latest; `SIGTERM` handling stops the consumer after its batch (using the memory stream) and resolves within the grace period
- [X] T096 [US9] Verify the Valkey path end to end against a local Valkey (`ENV_VALKEY_URL` set): `tests/cache-valkey.integration.test.ts` green, consumer group created, heartbeats visible; record the run in `quickstart.md` US9 (manual verification)

**Checkpoint**: the foundation is complete and operable; `quickstart.md` US9 passes.

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: the API contract, the documentation deliverables the constitution requires after
implementation, and the final validation pass.

- [X] T097 Update `postman/openapi.json` for every endpoint in `contracts/api-endpoints.md` (tabs, search, overlay, trending, live, vote, bookmarks, admin search, `/healthz`, `/api/config` fields) with the `nextRefreshMs`, `retryAfterMs`, `status` and `truncated` fields and the `429`/`503` envelopes; remove `GET /api/polls` and the polled `GET /api/polls/:pid`; `tests/openapi-contract.test.ts` green
- [X] T098 Remove every MongoDB remnant (imports, types, comments referencing collections) that the re-base orphaned, and nothing else (Principle III)
- [X] T099 Run the full `quickstart.md` validation (US1–US9 and the contract check) against a local run and record the outcome in `quickstart.md`
- [X] T100 [P] Regenerate `README.md` at the project root (post-implementation deliverable): overview, prerequisites (PostgreSQL; optional Valkey/OpenSearch/Spaces), install/run/test commands, the `ENV_` table, App Platform deployment with autoscaling; no references to `specs/`, `designDocs/` or `architecture/`
- [X] T101 [P] Regenerate `ARCHITECTURE.md` at the project root (post-implementation deliverable): deployment and runtime components (fleet, Valkey, PostgreSQL, OpenSearch, Spaces/CDN), the three load bounds, the vote path, counters and versions, the refresh protocol, sweeps and the consumer group, with Mermaid diagrams; free of secrets

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)**: T002 and T003 must precede everything in
  Phase 2; T004–T007 are parallel with Phase 2.
- **Foundational (Phase 2)** blocks every story. Within it: database (T008–T014) and cache
  (T015–T018) are parallel groups; the harness (T019–T020) needs T010–T014 and T016; sessions
  (T021–T023) need T009 and T015; the pipeline (T024–T029) needs T015 and T027 needs T026 for the
  envelope helper; the shared poll modules (T030–T037) need the database and cache; T038 (green
  suites) needs everything before it; T039–T040a need T033, T031 and T036.
- **User stories (Phases 3–11)** all depend on Phase 2. They are independent of one another with
  these integration points, none of which breaks a story's own test: US3's `voteClient.js` and
  US7's bookmark button plug into US1's `pollCard.js`; US4's Live Results button on search cards
  needs US2's Search tab to exist to be exercised from there (it is exercised from other tabs
  without US2); US5's controller reads `search-budget`, which US2 writes (the controller test
  stubs it); US8's page-load bucket applies to trending endpoints US1 adds.
- **Polish (Phase 12)** depends on every story the release includes; T100–T101 run last.

### Parallel opportunities

- Phase 1: T004–T007 together after T003.
- Phase 2: T011–T014 together after T008; T016–T018 together after T015; T023, T029, T039, T040,
  T040a as soon as their subjects exist.
- Every story's test task marked [P] can be written alongside its implementation tasks; the k6
  scripts (T079, T092, T094) are independent of the code.
- After Phase 2, stories can be assigned to different developers: US1 and US2 first (they define
  the tabs and the search the others attach to), then US3/US4/US5 in parallel, then US6/US7/US8/US9.

### Parallel example: Phase 2 database and cache

```bash
# after T008 and T015:
Task: "Write src/db/migrations/003-participation.ts"          # T013
Task: "Write src/db/migrations/004-vote-history.ts"           # T014
Task: "Implement src/cache/memoryCache.ts"                    # T016
Task: "Implement src/cache/valkeyCache.ts"                    # T017
Task: "Write tests/cache-memory.test.ts and the Valkey integration test"   # T018
```

---

## Implementation Strategy

### MVP: Phases 1–3 (Setup + Foundational + US1)

1. Setup (T001–T007) and Foundational (T008–T040) — the datastore swap, green suites, the
   request pipeline. This is most of the risk and about a third of the tasks.
2. US1 (T041–T055) — the tabbed home page with TRENDING and the personal tabs.
3. **STOP and VALIDATE**: `quickstart.md` US1 on the memory cache with instance-served TRENDING.
   This is a deployable MVP: the site runs on PostgreSQL, the home page no longer lists every
   poll, and nothing refreshes on its own. Votes still use today's synchronous insert until US3.

### Incremental delivery

1. US2 (search) → the site is navigable at 250,000 polls.
2. US3 (votes) → votes never fail for load; **deploy Valkey with a standby before this story
   reaches production**, since the queue puts the cache on the write path.
3. US4 (Live Results) → the one live surface.
4. US5 (self-protection) → the fleet can be sized by configuration; run the k6 budget and
   surge tests against a staging deployment before raising the instance maximum.
5. US6–US8 in any order; US9's seed and burst test whenever a staging database is available.
6. Polish, then the documentation deliverables.

### Two things to keep visible throughout

- **Write ownership**: T040's instrumented assertion is the guard against the most likely
  regression — a handler writing `vote_count` to the row. Keep it green from Phase 2 onward.
- **The three `kind`s and `nextRefreshMs`**: every dynamic route declares its kind and every
  response carries the interval; a route that forgets either breaks the client's floor handling
  silently. The contract test (T097) and `tests/tabs.test.ts` assert the field on every response.
