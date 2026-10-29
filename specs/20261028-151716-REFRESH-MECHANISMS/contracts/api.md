# HTTP and Operator Contracts: Refresh Mechanisms

No route is added or removed, and no request or response body changes shape.
`postman/openapi.json` changes only for `/api/config` (A4).

## A1. `POST /api/tabs/{your-polls|shared-with-you|your-votes|watching}/refresh`

Request and response bodies as today (`membershipVersion`, `versions`; `304`, or `{ membershipVersion, counters, cards, order?, nextRefreshMs }`).

New behaviour (research R1–R3):
- When the caller lacks `View Polls`: an empty answer, as today, before anything below.
- **Shortcut**: when every condition of research R2 holds, the answer is `304` or `200` with `counters` only, computed from the live counts; no database query is made, `adoptInvitations` and `markAccepted` do not run.
- **Full answer** otherwise: as today, then `TabSeen` is recorded; projections are written only when missing or stale (R5).
- Each answer increments `stats:tabs:fast` or `stats:tabs:full`.

## A2. `POST /api/search`, `POST /api/search/refresh`

Unchanged, except that projections are written only when missing or stale (R5).

## A3. Floors on every dynamic route (`dynamic(kind)`)

- `search` and `refresh` buckets refill at `floor × k` (`nextRefreshMs`); burst sizes unchanged.
- `live` and `vote` unchanged.
- A refusal is unchanged in form: `429 { error: "too-soon", retryAfterMs, nextRefreshMs }` with `Retry-After`.

## A4. `GET /api/config`

Two new fields, beside the existing `trendingPollsRecomputeSweepIntervalMs` and `newestPollsRecomputeSweepIntervalMs`:

| Field | Value |
|---|---|
| `trendingMaxAgeMs` | `min(ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL, 10000)` |
| `newestMaxAgeMs` | `min(ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL, 10000)` |

## A5. Trending and Newest objects

Spaces objects (`trending-counts.json`, `trending.json`, `newest-counts.json`, `newest.json`) and the instance-served copies under `/api/trending/`:
`Cache-Control: public, max-age=<maxAgeMs / 1000>`, i.e. `public, max-age=10` at the defaults (today `60`).

## A6. Budget controller log line

The existing line gains two fields, counted fleet-wide since the previous line:

```text
[controller] R=<n> B=<n> S=<n>/<n> V=<n> a=<x.xx> k=<s>/<r>/<l> tabs=<fast>/<full> stretched=<n>
```

- `tabs=<fast>/<full>`: personal-tab answers by the shortcut / by a full answer.
- `stretched=<n>`: requests refused by a floor that the base floor would have allowed.

The line is still written when a multiplier changes, when over budget, and at least once a minute.

## A7. Sweeps (operator)

| Sweep | Interval |
|---|---|
| `counterFlushSweep` | `ENV_COUNTER_FLUSH_SWEEP_INTERVAL`, default **10000** (was 2000) |
| `invitationSweep` | `ENV_INVITATION_SWEEP_INTERVAL`, default **30000** (was a fixed 5000) |

The start-up lines `[sweeps] <name> every <ms>ms (lock <n>)` show the new values.
