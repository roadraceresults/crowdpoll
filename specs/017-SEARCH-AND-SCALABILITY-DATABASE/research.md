# Research: Search and Scalability Database

**Phase 0 output** for `specs/017-SEARCH-AND-SCALABILITY-DATABASE/plan.md`. The specification carries
no `[NEEDS CLARIFICATION]` markers, so every item here is a technology binding or a best-practice
decision for a mechanism the requirements already fix. Each records the decision, the rationale,
and the alternatives considered. Library versions are those current in September 2026; pin exact
versions in `package.json` at implementation time.

---

## R1 — Query layer and migrations: Kysely over `pg`

**Decision**: `kysely` with `PostgresDialect` over a `pg` `Pool` created from `ENV_DATABASE_URL`;
a `Database` interface in `src/db/schema.ts` typed per table; Kysely's `Migrator` with
`FileMigrationProvider` runs every migration in `src/db/migrations/` at boot, before routes are
mounted, and a failed migration rejects start-up. Raw SQL through `sql\`\`` for the generated
columns, `pg_trgm`, `ON CONFLICT`, advisory locks and `EXPLAIN`.

**Rationale**: Kysely is already a transitive dependency of BetterAuth, gives compile-time column
names for the ≈ 20 indexed predicates of the two searches, and its migrator is the "ensure at
startup" contract the project already has for Mongo indexes. Generated columns and partial
indexes are plain DDL in a migration.

**Alternatives considered**: Prisma (own migration engine and client generation step, heavier
runtime, no generated-column expression support without raw SQL); Drizzle (comparable, but not
already in the dependency graph); raw `pg` only (no typing for the searches' many predicates).

## R2 — BetterAuth on PostgreSQL, one cookie

**Decision**: `createAuth` passes the Kysely instance to BetterAuth (`database: { db, type:
"postgres" }`); `npx @better-auth/cli generate` emits the auth tables as a migration checked into
`src/db/migrations/`; the unique index on `lower(user_name)` is part of the same migration.
`session.cookieCache` is left disabled. The session helper (`src/auth/sessionCache.ts`) wraps
`auth.api.getSession` with a cache-aside on `sess:<sha256(token)>` for `ENV_SESSION_CACHE_TTL`,
stores the session's `expiresAt` in the entry and never serves past it, and exposes
`endSession(token)` — the only caller of `auth.api.signOut` — which deletes the key.

**Rationale**: BetterAuth's Kysely adapter is first-class; hashing the token keeps the raw
credential out of the cache; disabling `cookieCache` is what preserves 001's single-cookie
policy, which the requirements make explicit.

**Alternatives considered**: BetterAuth `secondaryStorage` (would move every session to Valkey and
make Valkey the system of record for sessions — the requirements keep PostgreSQL as the record);
`cookieCache` (adds a second cookie).

## R3 — Valkey client and the in-process twin

**Decision**: `iovalkey` (the Valkey-maintained fork of ioredis) with `commandTimeout: 100`,
`maxRetriesPerRequest: 0`, `enableOfflineQueue: false`, and a `disconnected` flag driven by its
`ready`/`end` events. `src/cache/cache.ts` declares the interface
(`get/set/setNx/incr/expire/hincrby/hgetall/sadd/sismember/srem/zadd/zcard/zremrangebyscore/lock/
xadd/xreadgroup/xack/xautoclaim/xtrim/isConnected/pause hooks`); `memoryCache.ts` implements it
with a `Map` and TTL timers and an in-process stream with consumer-group semantics (pending
entries, ack, claim) sufficient for the tests. `ENV_VALKEY_URL` unset selects the memory
implementation.

**Rationale**: the requirements make the interface with two implementations a rule (FR-061) so
that tests need no Valkey and the queue adapter is the only file that changes if the technology
does. Short timeouts and no offline queue are what make the disconnected behaviour (R14) fail fast
rather than hang.

**Alternatives considered**: `ioredis` (works against Valkey but is Redis-branded and slower to
track Valkey commands); `node-redis` (client-side caching features not needed); a mock per test.

## R4 — Vote queue on Valkey Streams

**Decision**: stream `votes`, consumer group `writers` created idempotently at boot
(`XGROUP CREATE … MKSTREAM`), one consumer per instance named by the instance id. The consumer
loop: `XREADGROUP GROUP writers <instance> COUNT 500 BLOCK 1000 STREAMS votes >`; one multi-row
`INSERT INTO votes … ON CONFLICT (poll_id, email) DO UPDATE` (Dynamic-Vote) or `DO NOTHING`
(Final-Vote) — chosen per poll by grouping the batch by `vote_mutability` — plus the
`vote_history` and `user_polls` rows in one transaction; then `XACK`; then `XTRIM MINID` to the
oldest unacknowledged id periodically. A reclaim pass runs `XAUTOCLAIM … MIN-IDLE-TIME
<ENV_VOTE_QUEUE_LAG_NOTICE>` each loop for entries a failed consumer left pending. Consumer lag
for the vote response's `status` is `XPENDING` summary count plus the stream length beyond the
group's last-delivered id, sampled once a second into `queue:lag` rather than per request.
`SIGTERM` sets a stopping flag; the loop finishes the batch it holds, acks, and resolves the
shutdown promise.

**Rationale**: the requirements select Valkey Streams (no extra service, ≈ 0.1 ms enqueue, the
accepted one-second loss window); consumer groups give at-least-once delivery, which the
idempotent insert makes safe; sampling the lag keeps the vote path at three cache operations.

**Alternatives considered**: RabbitMQ on a Droplet, Managed Kafka, a Postgres queue table — all
evaluated and rejected in the research results (§6.5); a per-request `XPENDING` (adds a round
trip to every vote for a number that changes once a second).

## R5 — OpenSearch: client, mapping, queries, fallback

**Decision**: `@opensearch-project/opensearch` against `ENV_OPENSEARCH_URL`. One index `polls`
holding home-scope polls only: `pid` (keyword), `title`, `subtitle`, `choice_labels`, `keywords`
(text, `english` analyzer), `vote_count` (integer), `created_at` (date), `content_version`,
`counts_version`. Query: `multi_match` over `title^4, subtitle^3, choice_labels^2, keywords`
with `minimum_should_match: "100%"` (the AND pass); if fewer than the cap, a second query with
`minimum_should_match: "1"` (OR), then a third with `fuzziness: "AUTO"` (typo pass); each wrapped
in `function_score` with `field_value_factor` on `vote_count` and a `gauss` decay on `created_at`
as tie-breaks; results merged and de-duplicated in order; `size: cap + 1` for the `truncated`
flag. A health probe (`cluster.health` cached 5 s) selects the fallback; any request-level error
also falls back for that query. While the fallback serves, the search sub-budget is
`ENV_SERVER_MAX_SEARCH_PER_SECOND_FALLBACK`.

**Rationale**: BM25 top-k is what makes the common-word case cheap; boosts give the required
field order; the three-pass chain mirrors the PostgreSQL implementation so the two engines rank
the same way to a first approximation.

**Alternatives considered**: a single query with `should` clauses (cannot express "AND first, OR
only if short"); Typesense/Meilisearch/SaaS (rejected in the research results §4).

## R6 — PostgreSQL full-text as the development engine and fallback

**Decision**: generated column `search tsvector` with `setweight` A/B/C/D over `title`,
`subtitle`, `choice_labels`, `keywords`; partial `GIN (search) WHERE home_listable`;
`websearch_to_tsquery('english', $q)` for the AND pass; the words joined by `|` through
`to_tsquery` for the OR pass; `similarity(title, $q) > 0.3` on a `GIN (title gin_trgm_ops)` index
for the typo pass (query ≥ 3 characters); each pass bounded by `ORDER BY created_at DESC LIMIT
5000` in a CTE before `ts_rank_cd`; `LIMIT cap + 1`. `CREATE EXTENSION IF NOT EXISTS pg_trgm` in
the first migration (available on Managed PostgreSQL and in `embedded-postgres`).

**Rationale**: zero extra services for development and tests; the 5,000-newest bound keeps a
common word from scanning 50,000 matches; the weights give the required ranking order.

**Alternatives considered**: `plainto_tsquery` (no quote handling); no bound (seconds on common
words); `ILIKE` (no ranking).

## R7 — Counters, versions and the flush

**Decision**: a vote does `HINCRBY cnt:<pid> <choiceId> 1`, `HINCRBY cnt:<pid> total 1`,
`HINCRBY cnt:<pid> seq 1` and `HINCRBY trend:<bucket> <pid> 1` (bucket = `floor(now / 5 min)`);
`SADD dirty:<flushEpoch> <pid>` marks the poll for the flush. The flush sweep (every
`ENV_COUNTER_FLUSH_INTERVAL`, advisory-locked) swaps the dirty set, reads each dirty poll's hash,
and writes `choice_counts`, `vote_count`, `last_vote_at = now()`, `counts_version = seq` in one
`UPDATE polls AS p SET … FROM (VALUES …) AS v WHERE p.id = v.id`, then upserts `search_outbox`
rows with `reason = 'counters'`. The nightly reconcile recomputes from `votes` for polls in
yesterday's dirty sets, and a boot-time rebuild runs the same statement for every poll whose
`cnt:<pid>` is missing on first read. `content_version` is bumped by one helper
(`bumpContentVersion(pid)`) called from every state/content write, which also refreshes
`poll:<pid>` and upserts the outbox with `reason = 'content'`.

**Rationale**: absolute values with a sequence make deltas order-independent; one batched
`UPDATE` per window bounds hot-row writes; the outbox rides the same transaction.

**Alternatives considered**: `INCR` per choice on the row (hot-row lock); Valkey keyspace
notifications for dirtiness (unnecessary — the vote path knows the pid).

## R8 — Live counters for Live Results and deltas

**Decision**: `poll:<pid>` holds the card's content projection and `content_version`, refreshed
by `bumpContentVersion`; a Live Results response and every delta read `poll:<pid>` and
`HGETALL cnt:<pid>` in one pipeline (≤ 5 or ≤ 200 pids) and compare `seq` with the client's
`counts_version`. The flushed row's `counts_version` is never read by a client-facing path — a
test asserts it by instrumenting the store.

**Rationale**: the requirements' rule that a poll shows the same number on every surface and a
count never steps backwards; independence of the Live Results floor from the flush interval.

## R9 — Version-keyed deltas: wire shape

**Decision**: a tab refresh is `POST /api/tabs/<tab>/refresh` with body
`{ membershipVersion, versions: { [pid]: [contentVersion, countsVersion] } }` (POST because the
body can be 4 KB); the response is `304` with no body when nothing moved, else `200` with
`{ membershipVersion, order?: [pid], counters: { [pid]: { voteCount, choiceCounts, countsVersion } },
cards: { [pid]: Card }, nextRefreshMs }`. `order` is present only when membership changed;
`cards` contains full cards for moved content and for ids the client lacks. The client's
`deltaClient.js` applies counters, replaces cards, reorders, and prunes ids not in `order`.
Every dynamic response also carries `nextRefreshMs`; `429` and `503` bodies carry
`{ retryAfterMs, nextRefreshMs }` and the `Retry-After` header.

**Rationale**: the minimal patch for this data model; the same payload a push frame would carry
(the excluded upgrade path); one merge routine for every tab.

**Alternatives considered**: JSON Patch (a generic engine for four fixed shapes); `ETag` alone
(cannot express per-poll partial changes).

## R10 — TRENDING: recompute, membership hash, two objects on Spaces

**Decision**: the trending sweep sums the trailing twelve `trend:<bucket>` hashes with a Lua
script or a pipelined `HGETALL` × 12 merged in-process, filters to `home_listable` polls in
state `OPEN` or `EDITING` with `poll_state_before_edit_update = 'OPEN'` (one `WHERE id = ANY`
query for the candidates), takes the top `ENV_MAX_TRENDING_POLLS` by bucket sum then
`vote_count`, and computes `membershipVersion = sha256(sorted ids)`. It writes
`listing:trending` (compressed bytes + version) and, when `ENV_SPACES_BUCKET` is set, `PUT`s
`trending-counts.json` every recompute and `trending.json` only when the membership hash changed,
both with `Cache-Control: public, max-age=<ENV_TRENDING_POLLS_RECOMPUTE_INTERVAL/1000>`,
`Content-Encoding: gzip` and an `ETag` equal to the object's hash, via `@aws-sdk/client-s3`
(`endpoint: <region>.digitaloceanspaces.com`, `forcePathStyle: false`). The client reads
`ENV_SPACES_CDN_URL` from `/api/config`; when unset it fetches both objects from
`/api/trending/counts` and `/api/trending/cards`, served from `listing:trending` with
`If-None-Match` support.

**Rationale**: Spaces is S3-compatible and the CDN honours `Cache-Control` and `ETag`; the
membership hash over the *set* is what keeps the full object rare (architecture finding I-1).

**Alternatives considered**: one object (republished every minute — the cost case rejected in the
research results §6.6.1); Spaces CDN purge on every recompute (rate-limited, unnecessary with
`max-age`).

## R11 — The budget controller

**Decision**: `budget.ts` increments `budget:<sec>` (and `search-budget:<sec>` on an engine
query) with `INCR` + `EXPIRE 10`; instances `SET instance:<id> 1 EX 30` every 10 s; the effective
budget is `min(ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND × count(instance:*),
ENV_SERVER_MAX_REFRESH_PER_SECOND)`, with the count taken by `SCAN` of the small `instance:`
keyspace once per tick (≤ 12 keys). `controller.ts` runs as an advisory-locked sweep every
`ENV_BUDGET_CONTROLLER_INTERVAL`: reads R (last full second), the search counter, prunes
`live:active` (`ZREMRANGEBYSCORE -inf now`), reads V = `ZCARD`, computes `k_pred =
ceil((V × a / floorLive) / budgetLeft)` where `a = observedLive / (V / (floorLive × k_live))`
clamped to `[0.1, 1]` and smoothed with the previous tick, then applies the raise/lower rules
(raise: search → refresh → live, caps `ENV_MAX_STRETCH`; lower below
`ENV_BUDGET_LOWER_THRESHOLD_PERCENT`: reverse order, one step per tick; `k_live = max(k_pred,
k_observed)`), writing `k:search`, `k:refresh`, `k:live`. Every handler reads the three keys
(cached in-process for 250 ms) to compute `nextRefreshMs = floor × k`.

**Rationale**: implements FR-037–FR-040 literally; the in-process 250 ms cache keeps the per-
request cost at zero extra round trips; `SCAN` of a dozen keys is cheaper than maintaining a
counter that must survive crashes.

**Alternatives considered**: a PID controller (unnecessary smoothing for integer multipliers);
per-instance budgets without a shared counter (would let instances disagree on the interval).

## R12 — Per-instance shedding and `/healthz`

**Decision**: `shedding.ts` is an Express middleware registered after `/healthz` and before every
other route: it keeps an in-flight counter (increment on entry, decrement on `finish`/`close`)
and samples `perf_hooks.monitorEventLoopDelay({ resolution: 20 })` (`p50` over the last second).
When the counter exceeds `ENV_INSTANCE_MAX_INFLIGHT` or the delay exceeds
`ENV_INSTANCE_MAX_EVENT_LOOP_LAG`, it sheds by request kind (a `kind` set by each route: search,
refresh, live, vote, other) in the order search → refresh → live → other → vote, answering `503`
with `Retry-After` and `{ retryAfterMs, nextRefreshMs }`; a shed count per kind is exposed on
`/healthz` and logged once a minute when non-zero. `/healthz` performs a Valkey `PING` with a
50 ms timeout and always answers `200` with `{ ok: true, cache: "up" | "down", shed: {…} }`.

**Rationale**: the two signals the requirements name; the health check exempt so the load
balancer never pulls a shedding instance; the order keeps votes last.

**Alternatives considered**: `toobusy-js` (unmaintained; reimplemented in a few lines with
`perf_hooks`); a deep health check (rejected in architecture finding U-4).

## R13 — Floors, per-IP caps and page loads

**Decision**: `floors.ts` does `SET floor:<kind>:<key> 1 PX <floor> NX`; the key is the session
id for signed-in users and the client IP (from `req.ip` behind App Platform's trusted proxy,
`app.set("trust proxy", true)`) for guests; on failure it computes the remaining time with `PTTL`
and answers `429` with `Retry-After` and `{ retryAfterMs, nextRefreshMs }`. `votes-ip:<ip>` and
`pageload:<session|ip>` use `INCR` + `EXPIRE 60`; the vote cap logs an `[abuse]` line and raises
an alert metric at the threshold. Server logs record every shed, cap and disconnect event
informatively; the browser logs nothing about floors, sessions, overlays or vote choices.

**Rationale**: `SET NX PX` is atomic and self-expiring; the per-IP values are the anomaly-range
defaults the requirements chose (600/min, 120/min).

## R14 — Behaviour while Valkey is unreachable

**Decision**: `valkeyCache.isConnected()` is checked by the shedding middleware: while false, every
request whose route has a `kind` other than `other` is answered `503` immediately; `/healthz`,
static and CDN-backed paths, `/api/me` (BetterAuth's own lookup), the personal tabs' membership
query and the admin search continue. Sweeps and the consumer call `cache.onDisconnect(pause)` /
`cache.onReconnect(resume)`. No code path falls back to PostgreSQL for floors, budgets, counters
or the vote write; a test asserts it by running the suite's memory cache in a "disconnected"
mode.

**Rationale**: FR-042 verbatim; the same `503` path clients already handle.

## R15 — Tests: `embedded-postgres`, the `EXPLAIN` guard, write ownership

**Decision**: `tests/helpers/setup.ts` starts one `embedded-postgres` cluster per Vitest worker
(`EmbeddedPostgres` with a per-worker port and data directory under the OS temp dir), runs the
migrations, and creates the app with the memory cache/queue; `ENV_DATABASE_URL` points at it.
The `EXPLAIN` guard sets `enable_seqscan = off`, runs each listing and every admin filter
combination with `EXPLAIN (FORMAT JSON)` against a 200-row seed, and fails on any `Seq Scan` node
whose relation is `polls`. Write ownership is asserted by wrapping the Kysely instance in the
test and recording every `UPDATE polls` statement's `SET` columns per caller. Vote-path tests use
the memory stream's consumer-group semantics; the Valkey integration test is skipped unless
`ENV_VALKEY_URL` is set.

**Rationale**: the project already runs a real database per worker; the guard is the cheapest way
to keep 250,000-row behaviour honest with a small seed.

**Alternatives considered**: `pglite` (WASM; no `pg_trgm`, no advisory locks); Docker
(the project's tests must not require it).

## R16 — Seed, load tests, app spec, retirement of the standalone view

**Decision**: `devScripts/populate/seed-polls.ts` generates 250,000 polls with a Zipf-skewed vote
distribution (a few hundred polls receive most votes), writing through the same `votes` batch
insert; `devScripts/load/` holds four k6 scripts (budget saturation, one-poll vote burst, Live
Results surge, page-load storm) with documented expected outcomes. `.do/app.yaml` declares the
service with `instance_size_slug` for dedicated 1 vCPU / 2 GiB, `autoscaling: { min_instance_count:
4, max_instance_count: 12, metrics: { cpu: { percent: 70 } } }`, `health_check: { http_path:
/healthz }` and `termination_grace_period_seconds: 30`. The `?PID=` standalone view is retired:
`routes/pages.ts` redirects `/?PID=…` to `/`, `pollCard.js` loses its polling and standalone
mount, and the two tests that exercised the standalone view are removed; every other existing
suite is re-based on the new harness with its assertions unchanged.

**Rationale**: FR-064 and FR-066; the app spec is where autoscaling lives (not `ENV_`).

**Static assets** are published to the same Spaces bucket as the TRENDING objects by the build
(`npm run build` → `devScripts/publish-assets.ts`) under `assets/<content-hash>/…` with
`Cache-Control: public, max-age=31536000, immutable`; `index.html` references them through
`assetsBaseUrl` from `/api/config`. When `ENV_SPACES_BUCKET` is unset (development) Express serves
`dist/public` with the same fingerprinted names and headers. This keeps `.do/app.yaml` to one
component and makes "served from the delivery network" literally true.

**Alternatives considered**: `autocannon` (single-scenario; k6 expresses the four scenarios and
their checks in one tool); an App Platform static-site component for the assets (a second
component and a split build, for the same CDN result Spaces already gives).

---

## Terminology mapping

| Specification term | Requirements / code term |
|---|---|
| ceiling, effective ceiling | budget, effective budget (`ENV_SERVER_MAX_REFRESH_*`) |
| search sub-ceiling | search sub-budget (`ENV_SERVER_MAX_SEARCH_PER_SECOND`) |
| floor | per-kind floor (`ENV_MIN_*_INTERVAL`) |
| "try again" | `503` / `429` with `Retry-After`, `retryAfterMs`, `nextRefreshMs` |
| shared cache | Managed Valkey (`iovalkey`) / `memoryCache` |
| primary data store | Managed PostgreSQL (Kysely) |
| search engine | Managed OpenSearch; PostgreSQL FTS as fallback |
| delivery network | Spaces + CDN |
| counts version | `seq` in `cnt:<pid>`; `polls.counts_version` for the row |
