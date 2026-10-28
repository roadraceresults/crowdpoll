# Implementation Plan: Search and Scalability Database

**Branch**: `dev` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/017-SEARCH-AND-SCALABILITY-DATABASE/spec.md`

**Note**: This plan is the `/speckit-plan` output. The source requirements are
`designDocs/017-high-level-requirements-SEARCH-AND-SCALABILITY-DATABASE-SCENARIO-2.md`; the
architecture artifact is `architecture/017-search-scalability-database/architecture.md`
(11 diagrams, 16 findings resolved); the research behind both is
`research/017-SEARCH-AND-SCALABILITY-DATABASE-SCENARIO-2/research-results-option-2.md`.

## Summary

Replace MongoDB with DigitalOcean Managed PostgreSQL (Kysely, migrations at boot, BetterAuth on
the same database; no data migration, accounts re-created), add a free-text home search
(OpenSearch in production, PostgreSQL full-text in development and as fallback) and a structured
admin search, and rebuild the home page as five tabs whose refresh model holds 1,000,000
concurrent users on 4–12 autoscaled App Platform instances: no automatic tab refresh, per-kind
per-user floors, a server-wide budget that follows the fleet with a controller that stretches
searches → manual refreshes → Live Results (never votes) and predicts the live population, a
search sub-budget, per-instance shedding, a single-path vote queue on Valkey Streams with counters
accumulated in Valkey and flushed, version-keyed deltas on every refresh, TRENDING published as two
CDN objects, and page loads that cost one cache read. Live Results reads the live counters and is
the only automatically refreshing surface; the standalone poll page is retired.

## Technical Context

**Language/Version**: TypeScript 5.8 (server, ES modules, `node >=22`); vanilla ES2020 JavaScript
in `src/public/` (no bundler, no client framework — unchanged).

**Primary Dependencies**: Express 5, BetterAuth 1.3 (adapter switches from `mongodbAdapter` to
its Kysely/PostgreSQL adapter), nodemailer 7 — retained. **Added**: `pg` + `kysely` (typed SQL and
migrations), `iovalkey` (Valkey client; ioredis-compatible API), `@opensearch-project/opensearch`,
`@aws-sdk/client-s3` (Spaces is S3-compatible; used only by the trending sweep), `compression`.
**Removed**: `mongodb`, `mongodb-memory-server`. Research R1–R6.

**Storage**: DigitalOcean Managed PostgreSQL 16 (16 GB / 8 vCPU with standby at the load target;
1 GB in development) reached through the managed PgBouncer pool in production; DigitalOcean Managed
Valkey 2 GiB with standby (shared cache, floors, budget, registry, counters, vote stream);
DigitalOcean Managed OpenSearch 3 × 4 GiB (home search index); DigitalOcean Spaces + CDN (the two
TRENDING objects and static assets). Development: PostgreSQL only — in-process implementations of
the cache/queue interface and PostgreSQL full-text search.

**Testing**: Vitest 3 with supertest; `embedded-postgres` starts a real PostgreSQL per worker
(replaces `mongodb-memory-server`); the in-process cache/queue serves the suite; an integration test
exercises the Valkey client and skips without `ENV_VALKEY_URL`; the OpenAPI contract test
continues to read `postman/openapi.json`; an `EXPLAIN` guard fails on any `Seq Scan` of `polls`.
Load tests (`devScripts/load/`) run against a deployed fleet, not in CI.

**Target Platform**: DigitalOcean App Platform — dedicated-CPU 1 vCPU / 2 GiB instances,
autoscaling 4–12 on 70% CPU (app spec), health check `GET /healthz`, 30 s termination grace;
autodeploy from `dev`.

**Project Type**: Single project — one Express web service serving its own static client, plus
sweeps and a queue consumer in the same process; `devScripts/` for seed and load tools.

**Performance Goals**: 250,000 polls; 1,000,000 concurrent users (50% signed in); an effective
budget of 1,250 dynamic requests/s per instance (10,000 at 8 instances, cap 15,000); ≈ 20,000
votes/s drain capacity; search sub-budget 2,000 engine queries/s; home search < 1 s p95 (< 20 ms
warm on OpenSearch, < 150 ms on PostgreSQL FTS); Live Results at a 2 s floor for ≈ 9,500–17,500
live tabs at 8 instances; a browser reload reaching an instance with at most one request; total
cost of the order of $850–1,400/month at the load target.

**Constraints**: no request reads the whole `polls` table; anything identical for every visitor is
served as pre-built bytes; anything per user is one indexed query (`user_polls`); counters are
accumulated in Valkey and flushed (row counters written only by the flush and the reconcile);
a request the server cannot afford is slowed, not failed; only changed data travels
(`content_version` / live `seq`); no instance holds state that matters; the single-cookie policy
of 001 is preserved (BetterAuth `cookieCache` forbidden); every new `ENV_` variable follows the
project's env-var checklist; stored enumerations remain verbatim (014); no push transport, no
Web Push, no vector search, no third-party search or queue service, no topics, no UI/UX redesign.

**Scale/Scope**: 9 tables (8 new or reshaped + partitions), ≈ 20 indexes, 17 Valkey key
families, 8 sweeps under advisory locks + 1 consumer group, 2 search engines behind one
interface, 3 load bounds (shedding, controller, autoscaling), ≈ 14 endpoints changed or added and
2 CDN objects, 5 client modules replaced (`pollGrid.js`, `pollCard.js` polling, plus new tabs,
live and search modules), 38 `ENV_` variables added (34 table rows, the Spaces row holding five) and 3 removed, a 250,000-poll seed and 4 load tests.

**Unknowns**: none. The specification carries no `[NEEDS CLARIFICATION]` markers — the
architecture pass resolved 16 findings and `/speckit-clarify` settled 5 more before this plan.
Phase 0 therefore researches technology bindings and best practices only (R1–R16).

## Constitution Check

*GATE: evaluated against `.specify/memory/constitution.md` v1.1.0. Re-checked after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| **I. Think Before Coding** | Assumptions stated; no silent interpretation | **PASS** — every interpretation was raised as an architecture finding or a clarification question and written into the requirements; the spec's assumptions are the residue, each traceable to a resolved item. The one technology choice the requirements leave to the plan (clients and libraries) is decided in `research.md` with alternatives recorded |
| **II. Simplicity First** | Minimum code; nothing speculative | **PASS with three justified structures** — see Complexity Tracking. The cache/queue interface with two implementations, the budget controller, and the vote queue are not speculative flexibility: each is the minimum that the load target (a stated requirement) can be met with, and each has a simpler alternative that was evaluated and fails a requirement. Nothing else is abstracted: one engine interface with two implementations because the requirements demand a fallback; no repository layer over Kysely; no generic patch engine (versioned deltas are the minimal patch for this data) |
| **III. Surgical Changes** | Every changed line traces to the request | **PASS** — the datastore swap touches every store-facing file by necessity (FR-002); the client rewrite is bounded to the home page and the retired standalone view (FR-066); the admin page's own refresh, editor, screening and roster code paths are preserved unchanged (FR-065) and their files are touched only where the storage call changes. Pre-existing requirement-ID comments are corrected only in regions rewritten for this feature |
| **IV. Goal-Driven Execution** | Verifiable success criteria per task | **PASS** — 13 measurable success criteria; `quickstart.md` gives a runnable validation per user story; the `EXPLAIN` guard, the write-ownership test, the controller/floor/flush/consumer unit tests and the four load tests are named deliverables (FR-064) |
| **V. Code Quality & Maintainability** | Minimal, modular, graceful errors; server logs informative, browser logs minimal and never sensitive | **PASS** — every failure path has a defined graceful outcome (`429`/`503` with `Retry-After`, shed rather than stall, pause rather than crash on cache loss); sweeps log each tick's outcome server-side; the browser logs nothing new and never the session token, the overlay or vote choices. Research R13 |
| **VI. Self-Documenting Code** | Comments only point at external documentation | **PASS with a constraint** — new modules carry no explanatory or requirement-citing comments; names carry the meaning (`effectiveBudget`, `stretchMultiplier`, `liveRegistry`, `voteStream`); the only comments permitted point at the PostgreSQL, Valkey, OpenSearch and App Platform documentation for a non-obvious call (e.g. `XAUTOCLAIM` semantics). Files rewritten for the datastore swap lose their historical requirement-ID comments in the rewritten regions only |
| **Documentation Deliverables** | `README.md` and `ARCHITECTURE.md` regenerated at the project root *after* implementation | **PASS — carries two obligations.** Both exist; both are substantially outdated by this feature (new datastore, services, deployment, env vars) and will be regenerated rather than patched. `README.md` must remain free of references to `specs/`, `designDocs/` and `architecture/` |

No gate fails. Three Principle II structures are justified below.

## Project Structure

### Documentation (this feature)

```text
specs/017-SEARCH-AND-SCALABILITY-DATABASE/
├── plan.md                      # This file
├── research.md                  # Phase 0 — R1–R16
├── data-model.md                # Phase 1 — tables, indexes, Valkey keys, versions, lifecycle
├── quickstart.md                # Phase 1 — a runnable validation per user story
├── contracts/
│   ├── api-endpoints.md         # every changed/new endpoint, envelopes, 429/503, CDN objects
│   ├── ui-contracts.md          # tabs, cards, floors, held copies, prompts, guest states
│   └── config-and-deployment.md # ENV_ table, app spec, sweeps, health check, load tests
├── checklists/requirements.md   # spec quality (16/16)
└── tasks.md                     # Phase 2 — /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
src/
├── config.ts                    # ENV_ parsing: 3 removed, 38 added (contracts/config-and-deployment.md)
├── server.ts                    # boot: migrate → cache/queue → engines → sweeps + consumer → listen; SIGTERM
├── db/
│   ├── client.ts                # Kysely<Database> over pg Pool (ENV_DATABASE_URL)
│   ├── schema.ts                # Database interface (data-model.md)
│   ├── migrator.ts              # Kysely Migrator, run at boot; failure aborts start-up
│   └── migrations/              # 001-initial.ts … (tables, generated columns, indexes, partitions)
├── cache/
│   ├── cache.ts                 # the interface: get/set/incr/hincrby/hgetall/zadd/zcard/expire/lock/xadd/xreadgroup/xack
│   ├── memoryCache.ts           # in-process implementation (ENV_VALKEY_URL unset)
│   └── valkeyCache.ts           # iovalkey implementation; 100 ms timeouts; disconnected flag
├── auth/
│   ├── auth.ts                  # BetterAuth on Kysely/PostgreSQL; cookieCache off
│   ├── username.ts              # unique index on lower(user_name) via migration
│   └── sessionCache.ts          # cache-aside lookup, endSession(token), expiry-bounded
├── load/
│   ├── floors.ts                # per-kind SET NX PX; 429 with Retry-After + nextRefreshMs
│   ├── budget.ts                # heartbeats, effective budget, budget:<sec>, search-budget:<sec>
│   ├── controller.ts            # sweep: raise/lower k:*, predictive k:live, activity factor
│   ├── shedding.ts              # in-flight + event-loop-delay middleware; 503; order; healthz exempt
│   └── pageLoads.ts             # pageload:<session|ip> bucket
├── polls/
│   ├── store.ts                 # Kysely queries (replaces the Mongo collection module)
│   ├── service.ts               # business rules — unchanged logic, storage calls re-based
│   ├── screening.ts             # unchanged logic
│   ├── sweeps.ts                # advisory-locked ticks: approval, schedule, flush, trending, outbox, bookmarks, reconcile, controller
│   ├── counters.ts              # cnt:<pid> increments, projections, flush, reconcile
│   ├── versions.ts              # content_version bump helper
│   ├── userPolls.ts             # membership upserts; personal-tab queries; overlay lookup
│   └── bookmarks.ts             # cap, add/remove, daily removal
├── votes/
│   ├── votePath.ts              # validate (cached rosters, voted:<session>) → count → XADD → respond
│   ├── consumer.ts              # XREADGROUP writers; batched idempotent INSERT; XACK/XAUTOCLAIM; graceful stop
│   └── rosterCache.ts           # ban:<pid> / invite:<pid> sets; invalidation hook for roster writes
├── live/
│   ├── registry.ts              # live:active ZSET (expiry-scored), eligibility check on add
│   └── liveTab.ts               # the one-request refresh from poll:<pid> + cnt:<pid>, deltas
├── trending/
│   ├── recompute.ts             # bucket sum → top N; listing:trending; membership hash
│   └── publish.ts               # trending-counts.json / trending.json to Spaces (S3 SDK) with Cache-Control + ETag
├── search/
│   ├── search.ts                # search(scope, text, limit) interface + result cache
│   ├── pgSearch.ts              # websearch_to_tsquery / OR / pg_trgm passes; 5,000-newest bound
│   ├── openSearch.ts            # BM25 query builder; index mapping; health probe → fallback
│   ├── outbox.ts                # search_outbox upserts and the drain sweep
│   └── adminSearch.ts           # the one SQL query; day windows from IANA zone
├── refresh/
│   └── deltas.ts                # version-keyed delta computation (304 / counters / cards / membership)
├── routes/
│   ├── api.ts                   # auth/profile — storage calls re-based; logout via endSession
│   ├── pollsApi.ts              # votes, bookmarks, /api/me/polls, admin search, exports (unchanged), duplicate (unchanged)
│   ├── tabsApi.ts               # /api/tabs/private, /api/tabs/favourites, /api/search, /api/live/*
│   ├── pages.ts                 # ?PID= route retired → redirect to /
│   └── healthz.ts               # GET /healthz (registered before shedding)
├── email/mailer.ts              # unchanged
└── public/
    ├── index.html               # the tabbed home page
    ├── tabs.js                  # tab state, held copies + receipt times, floors, 429/503 handling, nextRefreshMs
    ├── trending.js              # CDN objects, sessionStorage copy, membership hash, overlay merge
    ├── liveResults.js           # LRU ≤ 5, timer, hidden-page pause, idle prompt
    ├── searchTab.js             # Enter → search; Refresh re-runs
    ├── deltaClient.js           # version map, apply counters/cards/membership
    ├── voteClient.js            # vote, pending vote retry after Retry-After, status notice
    ├── pollCard.js              # card render only (polling and standalone removed); Bookmark button
    ├── cardShell.js, app.js, admin*.js, profileCard.js, …   # unchanged (admin refresh untouched)
    └── pollGrid.js, pollGrid.css   # removed (replaced by tabs.js / tabs.css)

tests/
├── helpers/setup.ts             # embedded-postgres per worker; memory cache/queue; app factory
├── db-explain-guard.test.ts     # no Seq Scan on polls for every listing and admin filter combination
├── counters-flush.test.ts       # write-ownership; seq; flush; reconcile
├── votes-path.test.ts           # validate → count → queue → status; abuse bounds; consumer idempotency; graceful stop
├── load-controller.test.ts      # multipliers, order, caps, lowering, effective budget, predictive k:live
├── load-floors.test.ts, load-shedding.test.ts, page-loads.test.ts
├── live-results.test.ts         # LRU, eligibility, registry expiry, live counters, deltas
├── trending.test.ts             # bucket recompute, EDITING-after-OPEN, two-object publish rules
├── search-home.test.ts          # scope, AND/OR/typo, ranking, truncated, cache, fallback + sub-budget
├── search-admin.test.ts         # every control, day windows, contains
├── refresh-deltas.test.ts       # 304 / counters / cards / membership
├── session-cache.test.ts        # cache-aside, endSession sole caller, expiry-bounded
├── cache-valkey.integration.test.ts   # skips without ENV_VALKEY_URL
├── cache-disconnected.test.ts   # 503 path, healthz 200, sweeps pause, no PG fallback
└── (existing suites re-based on the new harness; standalone-view tests removed)

devScripts/
├── populate/                    # 250,000-poll seed with vote skew (new generator)
└── load/                        # budget, vote burst, live surge, page-load storm (k6 scripts)

.do/app.yaml                     # dedicated 1 vCPU/2 GiB, autoscaling 4–12 @70%, /healthz, 30 s grace
postman/openapi.json             # every changed/new endpoint (contracts/api-endpoints.md)
.vscode/launch.json.example, devScripts.example/launch-dev.ps1, CLAUDE.md   # env-var checklist
```

**Structure Decision**: single project, existing layout, with new sub-modules grouped by the
mechanism they implement (`db/`, `cache/`, `load/`, `votes/`, `live/`, `trending/`, `search/`,
`refresh/`) rather than by layer, so that each of the three load bounds and each sweep is one
file a reader can find from the architecture document's diagram of it. `polls/service.ts` keeps
the business rules the feature preserves (FR-065) and is re-based on `polls/store.ts`'s Kysely
queries; the admin page's client files are untouched.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| One cache/queue interface with two implementations (`memoryCache.ts`, `valkeyCache.ts`) | The requirements demand that development and tests need only PostgreSQL (FR-060) while production uses Managed Valkey, and that the queue adapter be the only file to change if the technology does (FR-061) | Calling `iovalkey` directly would make every test require a Valkey server and put the queue's API in fourteen files; a mock per test would duplicate the in-process semantics fourteen times |
| The budget controller (three multipliers, priority order, predictive live term) | FR-037–FR-039: the server must bound its own load in a fixed priority order, never lengthen votes, and absorb a Live Results surge without `503`s; a single global multiplier cannot express the priority order and an observing-only controller cannot prevent the surge tick | A fixed per-user interval (the earlier 15 s floor) protects nothing once the budget exists and gives up the near-real-time experience the requirements adopted |
| The single-path vote queue (Valkey Streams + consumer group) | FR-031–FR-036: a vote must never be refused for load, must respond with counts at once, and must reach storage in batches at ≈ 20,000/s; a synchronous row insert per vote caps at a few thousand/s on one hot row | Writing the row in the request path (today's design) is the exact ceiling the load target exceeds; a second "under load" path would double the code for the same outcome |

## Phase Status

| Phase | Output | Status |
|---|---|---|
| 0 — Research | `research.md` (R1–R16) | complete |
| 1 — Design | `data-model.md`, `contracts/api-endpoints.md`, `contracts/ui-contracts.md`, `contracts/config-and-deployment.md`, `quickstart.md`, agent context (`CLAUDE.md`) | complete |
| 2 — Tasks | `tasks.md` | `/speckit-tasks` |

## Post-Design Constitution Re-Check

Re-evaluated after Phase 1 with the data model and contracts in hand.

- **II. Simplicity First** — held. The data model adds exactly the columns the requirements name;
  `content_version` and `seq` are the only version fields; the delta protocol has four response
  shapes and no generic patch format; the search interface has two implementations and no
  third; the OpenSearch index holds only the home-scope fields a query touches (R5); the card's
  back face renders from the card payload, so no per-card endpoint replaces the retired
  single-poll fetch.
- **III. Surgical Changes** — held, with the widening the datastore swap forces: every module
  that called a Mongo collection is re-based, and `pollGrid.js`/the standalone view are removed
  because the feature retires them (FR-066). The admin client, screening, the schedule sweep and
  the exports change only at their storage calls.
- **V. Code Quality** — the disconnected-cache behaviour (FR-042) is one middleware decision
  (`cache.isConnected()`), not a branch in every handler; sweeps and the consumer share one
  `pause()/resume()` hook.
- **VI. Self-Documenting Code** — the contracts name every response field and status, so the
  handlers need no comment to say what they return.
- **Documentation Deliverables** — unchanged obligation; carried as the final task phase, with
  regeneration (not patching) of both root files because the deployment topology changed.

No new violations. Ready for `/speckit-tasks`.
