# API Contracts: Newest Poll Tab

**Phase 1 output**. Everything below is described in `postman/openapi.json` at implementation
time (`tests/openapi-contract.test.ts` enforces the route list). Object shapes reference
[data-model.md](../data-model.md) §4; they are the Trending shapes, and the OpenAPI paths
reference the existing `TrendingCounts` and `TrendingCards` schemas.

This document **adds to** `specs/017-SEARCH-AND-SCALABILITY-DATABASE/contracts/api-endpoints.md`.
Nothing there changes; 017's file is not edited.

## The published objects (delivery network)

When Spaces is configured, both objects are PUT to the bucket root beside the Trending objects
and fetched by the browser from `trendingBaseUrl` (the CDN base):

| Key | Content | Published | Headers |
|---|---|---|---|
| `newest-counts.json` | `NewestCountsObject` | every recompute (every `ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL`, and once at start) | `Content-Type: application/json; charset=utf-8`, `Content-Encoding: gzip`, `Cache-Control: public, max-age=<interval s>`, public-read |
| `newest.json` | `NewestCardsObject` | only when `membershipVersion` differs from the last published | same |

## Instance-served objects (no delivery network) — kind: none (page-load bucket only)

### `GET /api/trending/newest-counts.json` — alias `GET /api/trending/newest-counts`

`newest-counts.json`: Newest order and live counts, every recompute. Served by the instances when
no delivery network is configured (otherwise the same object is fetched from `trendingBaseUrl`).
`/api/trending/` is the one base for every published listing object.

Request header: `If-None-Match` (optional).

| Situation | Status | Headers | Body |
|---|---|---|---|
| served | `200` | `ETag: "<32 hex>"`, `Cache-Control: public, max-age=<ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL / 1000>` | `NewestCountsObject` |
| `If-None-Match` equals the ETag | `304` | — | — |
| no recompute has published yet | `503` | — | `{ "error": "newest-not-ready", "retryAfterMs": 5000 }` |
| page-load bucket exhausted | `429` | as today | `{ "error": "too-many-loads", … }` |

### `GET /api/trending/newest.json` — alias `GET /api/trending/newest-cards`

`newest.json`: the Newest cards, republished only when the set of polls changes. Same rules and
statuses as above with `NewestCardsObject` as the body.

Neither route is a dynamic request: no floor, no budget token, no shedding by kind; they touch
only the shared cache (never the data store or the search engine).

## `GET /api/config` — one added field, one amended description

| Field | Type | Meaning |
|---|---|---|
| `newestRecomputeIntervalMs` | integer | `ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL`; also the browser copy's lifetime for the Newest tab |
| `trendingBaseUrl` | string (existing) | description becomes: "Where the TRENDING **and Newest** objects are fetched from: the delivery network base, or `/api/trending` when served by the instances" |

## Requests the Newest tab makes to the application

| When | Request | Kind | Who |
|---|---|---|---|
| after each applied counts object; on sign-in/sign-out (`reset`) | `GET /api/me/polls?pids=<up to ENV_MAX_NEWEST_POLLS ids>` (existing route, unchanged) | `refresh` (dynamic; floor and budget apply) | signed-in visitors only |

No other request of the tab's own reaches an instance. `ENV_MAX_NEWEST_POLLS ≤
ENV_MAX_POLLS_SEARCH_RESULTS` (enforced at start-up) guarantees the overlay for the whole tab is
one request.

## Configuration surface

| Variable | Default | Validation (start-up `ConfigError`) |
|---|---|---|
| `ENV_MAX_NEWEST_POLLS` | `50` | positive integer, at most `ENV_MAX_POLLS_SEARCH_RESULTS` |
| `ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL` | `60000` | positive integer, at least `1000` |

Both appear in `launch.json.example` (every configuration block), `devScripts.example/launch-dev.ps1`,
`.do/app.yaml` and the CLAUDE.md settings table, beside the Trending pair.

## Server log lines

| Line | When |
|---|---|
| `[sweeps] newestSweep every <ms>ms (lock 10)` | at start, as for every sweep |
| `[newest] published counts for N polls` / `[newest] published counts and cards for N polls` | after each tick that published (Spaces configured) |
| `[sweeps] newestSweep: another instance holds lock 10; skipped` | on a tick another instance owns |
