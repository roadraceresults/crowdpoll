# Configuration and Deployment Contracts: Search and Scalability Database

**Phase 1 output**. Every variable below is read in `src/config.ts` with the default shown, and
added to `.vscode/launch.json.example`, `devScripts.example/launch-dev.ps1` and the CLAUDE.md
table (the project's env-var checklist). 38 variables added (34 rows below; the Spaces row holds five). Removed: `ENV_MONGODB_NAME`,
`ENV_MONGODB_URI`, `ENV_POLLING_INTERVAL`. Retained unchanged: everything else, including
`ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL`, `ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL` and the
`ENV_EMAIL_RATE_LIMIT_*` pair.

## Environment variables

| Variable | Default | Unit / meaning |
|---|---|---|
| `ENV_DATABASE_URL` | `postgres://localhost:5432/app01` | PostgreSQL connection string (the managed pool's URL in production) |
| `ENV_VALKEY_URL` | unset | Valkey URL; unset → in-process cache/queue/registry |
| `ENV_OPENSEARCH_URL` | unset | OpenSearch endpoint; unset → PostgreSQL full-text search |
| `ENV_SPACES_BUCKET`, `ENV_SPACES_REGION`, `ENV_SPACES_KEY`, `ENV_SPACES_SECRET`, `ENV_SPACES_CDN_URL` | unset | Where the TRENDING objects are published; unset → served from `listing:trending` |
| `ENV_SESSION_CACHE_TTL` | `300000` | ms |
| `ENV_MAX_POLLS_SEARCH_RESULTS` | `200` | home search cap; personal-tab cap; overlay id cap |
| `ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS` | `200` | admin search cap; FIX009: also caps the unfiltered admin list |
| `ENV_MAX_TRENDING_POLLS` | `200` | |
| `ENV_TRENDING_POLLS_RECOMPUTE_INTERVAL` | `60000` | ms; also CDN `max-age` and the client copy lifetime |
| `ENV_MIN_LIVE_REFRESH_INTERVAL` | `2000` | ms, floor for kind `live` |
| `ENV_MIN_MANUAL_REFRESH_INTERVAL` | `5000` | ms, floor for kind `refresh` |
| `ENV_MIN_SEARCH_INTERVAL` | `2000` | ms, floor for kind `search` |
| `ENV_MIN_VOTE_INTERVAL` | `2000` | ms, floor for kind `vote`, per session across all polls |
| `ENV_MANUAL_REFRESH_BURST` | `5` | FIX008: tokens in the `refresh` bucket per user; one back per floor interval; `1` = plain floor |
| `ENV_SEARCH_BURST` | `3` | FIX008: tokens in the `search` bucket per user; `live` and `vote` are fixed at 1 |
| `ENV_MAX_VOTES_PER_IP_PER_MINUTE` | `600` | anomaly threshold; alerts |
| `ENV_MAX_LIVE_RESULTS_PER_USER` | `5` | |
| `ENV_MAX_IDLE_TIME` | `1800000` | ms |
| `ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND` | `1250` | per live instance |
| `ENV_SERVER_MAX_REFRESH_PER_SECOND` | `15000` | cap on the effective budget |
| `ENV_SERVER_MAX_SEARCH_PER_SECOND` | `2000` | engine queries/s; not fleet-following |
| `ENV_SERVER_MAX_SEARCH_PER_SECOND_FALLBACK` | `200` | while PostgreSQL FTS serves |
| `ENV_BUDGET_CONTROLLER_INTERVAL` | `1000` | ms; ≤ the smallest floor (validated at boot) |
| `ENV_MAX_STRETCH` | `8` | cap on `k:search`, `k:refresh` |
| `ENV_BUDGET_LOWER_THRESHOLD_PERCENT` | `80` | |
| `ENV_INSTANCE_MAX_INFLIGHT` | `200` | |
| `ENV_INSTANCE_MAX_EVENT_LOOP_LAG` | `100` | ms |
| `ENV_SHED_RETRY_AFTER` | `2000` | ms |
| `ENV_COUNTER_FLUSH_INTERVAL` | `2000` | ms |
| `ENV_VOTE_BATCH_SIZE` | `500` | rows per consumer batch |
| `ENV_VOTE_QUEUE_LAG_NOTICE` | `2000` | ms of consumer lag above which `status` is `queued` |
| `ENV_SEARCH_CACHE_TTL` | `10000` | ms |
| `ENV_OUTBOX_DRAIN_INTERVAL` | `15000` | ms |
| `ENV_MAX_BOOKMARKS_PER_USER` | `200` | |
| `ENV_BOOKMARK_EXPIRY_MONTHS` | `6` | |
| `ENV_PAGE_LOADS_PER_MINUTE` | `120` | keyed by session, or by IP for guests |

Boot validation: `ENV_BUDGET_CONTROLLER_INTERVAL ≤ min(floors)`; `ENV_SERVER_MAX_REFRESH_PER_SECOND
≥ ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND`; the existing `ENV_MAX_CHOICES ≥ ENV_MIN_CHOICES`
rule stays.

## App Platform spec (`.do/app.yaml`)

```yaml
services:
  - name: web
    instance_size_slug: <dedicated 1 vCPU / 2 GiB slug>
    autoscaling:
      min_instance_count: 4
      max_instance_count: 12
      metrics: { cpu: { percent: 70 } }
    health_check: { http_path: /healthz, initial_delay_seconds: 10, period_seconds: 10 }
    termination_grace_period_seconds: 30
    envs: [ …the table above, secrets for the four connection strings and the Spaces keys… ]
```

One service component only: static assets are published to the Spaces bucket by the build
(research R16), not served by an App Platform static-site component. Development: one instance
(or `npm run dev`), no autoscaling block.

## Start-up sequence (`src/server.ts`)

1. Load config; validate. 2. Connect PostgreSQL; run migrations (abort on failure).
3. Build the cache/queue (memory or Valkey); create the `writers` consumer group.
4. Build the search engines (`createSearch`): when `ENV_OPENSEARCH_URL` is set, `ensureIndex()` and a first health probe run before routes are mounted, and a failed probe selects the PostgreSQL fallback with a logged notice; the fallback sub-budget applies while it serves (T060). 5. Register `/healthz`, then the
shedding middleware, then routes. 6. Start the instance heartbeat, the sweeps (each advisory-
locked) and the vote consumer. 7. Listen. On `SIGTERM`: stop accepting, let the consumer finish
and ack its batch, stop sweeps, close pools, exit (within 30 s).

## Sweeps (all under `pg_try_advisory_lock(<id>)`; a losing instance returns immediately)

| Sweep | Interval | Lock id |
|---|---|---|
| approval (screening) | `ENV_POLL_APPROVAL_POLLING_INTERVAL` | 1 |
| schedule (+ next month's `vote_history` partition) | `ENV_POLL_DATE_CHECK_POLLING_INTERVAL` | 2 |
| counter flush | `ENV_COUNTER_FLUSH_INTERVAL` | 3 |
| trending recompute + publish | `ENV_TRENDING_POLLS_RECOMPUTE_INTERVAL` | 4 |
| search outbox drain | `ENV_OUTBOX_DRAIN_INTERVAL` | 5 |
| bookmark removal | daily | 6 |
| nightly reconcile | daily | 7 |
| budget controller | `ENV_BUDGET_CONTROLLER_INTERVAL` | 8 |

The vote consumer is not a sweep: one consumer per instance in group `writers`.

## Load tests (`devScripts/load/`, k6)

| Script | Drives | Expected |
|---|---|---|
| `budget.js` | dynamic requests above the effective budget, including a search scenario over the 250,000-poll seed | intervals rise search → refresh → live; votes unaffected; served rate ≈ budget; recovery within a few ticks; adding an instance raises the budget within 30 s; search p95 < 1 s (SC-001) |
| `vote-burst.js` | votes on one poll above the drain rate | no refusals for load; `status` → queued past the lag notice; reconcile makes row counts equal |
| `live-surge.js` | many Live Results tabs opened within a minute | `k:live` rises before first refreshes; no `503` at the surge start |
| `page-storm.js` | reloads at the bucket limit and beyond | ≤ 1 instance request per reload; `429 too-many-loads` renders the stored copy |

Their measured per-instance rate, shedding thresholds and CPU target are written back into the
defaults above if they differ.
