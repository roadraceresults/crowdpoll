# Quickstart: Validating the Newest Poll Tab

Runnable scenarios that prove the feature works end to end, one section per user story. Details
live in [data-model.md](./data-model.md), [contracts/api-endpoints.md](./contracts/api-endpoints.md)
and [contracts/ui-contracts.md](./contracts/ui-contracts.md) rather than being repeated here.

## Prerequisites

```
npm install
npm test                # all suites on an embedded PostgreSQL; no local services needed
npm run build           # tsc + devScripts/build-assets.ts
```

For manual validation you need a running server, one ordinary account and one admin identity
(listed in `ENV_ADMINS`) to open, close and re-open polls. Regenerate the git-ignored dev tooling
from the checked-in templates (`launch.json.example`, `devScripts.example/`), then:

```
npm run dev             # needs ENV_*; use devScripts/launch-dev.ps1 on Windows
```

Settings worth changing while validating:

| Setting | Set to | Why |
|---|---|---|
| `ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL` | `5000` | Launches show within five seconds instead of a minute; the browser copy and the instance `Cache-Control` follow |
| `ENV_MAX_NEWEST_POLLS` | `3` | The cap is reached with four polls (US1 step 3, US4) |
| `ENV_MIN_MANUAL_REFRESH_INTERVAL` / `ENV_MANUAL_REFRESH_BURST` | `2000` / `2` | The floor and the burst are observable in seconds (US3) |
| `ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW` / `…_MAX_REQUESTS_PER_WINDOW` | `1` / `20` | You sign in and out more than twice |
| `ENV_COUNTER_FLUSH_INTERVAL` | `2000` (default) | Vote totals used for tie-breaks are at most two seconds behind |

Without Spaces configured the objects are served from the instances at
`/api/trending/newest-counts.json` and `/api/trending/newest.json` — watch them in the browser's
network panel. Start from an empty poll set, or note that pre-existing open polls are **not**
listed until they next open (FR-006).

## Automated checks

```
npx vitest run tests/newest.test.ts tests/client-home.test.ts tests/db-explain-guard.test.ts tests/config.test.ts tests/openapi-contract.test.ts
npm test
```

Expected: the new `newest` suite passes (launch-timestamp rules on every state edge and at
insert; ranking, tie-breaks and eligibility; counts every run and cards only on membership
change; the two routes with ETag/304/aliases and `503 newest-not-ready`); the explain guard
lists "Newest" with no sequential scan; config accepts the defaults and rejects the three
out-of-bound values; the contract test finds the two routes documented; the home-page suite's
rewritten "Newest tab in a browser" block passes; every pre-existing suite passes unchanged
(SC-009) — except the three 018 Newest tests it replaces.

## US1 — See the newest public polls

Sign in as the admin. Create four public polls A, B, C, D and open them in that order, a few
seconds apart (publish, then **Open** on the admin page). Wait one interval.

1. Sign out. Click **Newest** as a guest: the tab highlights, no sign-in prompt; the grid shows
   **D, C, B** — most recently opened first, capped at three, so A has fallen off the bottom
   (FR-008, FR-010, FR-011, FR-025, SC-007).
2. Vote in B from another account, then close and re-open C and D at the same moment (two
   admin tabs, click Open together). After an interval: C and D share a launch time; the one
   with more votes comes first; on equal votes the order is the same on every reload (edge
   case; FR-010).
3. Create a private poll and open it; create a public poll with a start date tomorrow; close A.
   After an interval: none of the three is listed (FR-008).
4. Two browsers (one guest, one member) fetch Newest within the same interval: identical order
   (SC-002).
5. Delete every poll (or start on an empty database) and reload: the panel reads **No polls
   have been launched yet.**, the grid is empty (FR-022).

## US2 — A launch shows up promptly; closing removes; re-opening re-launches; editing keeps

With three listed polls and the 5 s interval:

1. Open a fourth public poll. Within 5 s the counts object is republished; click Newest (or
   Refresh) — it heads the list (SC-001). Watch the network: `newest-counts.json` **and**
   `newest.json` were fetched (membership changed).
2. Close the top poll. Refresh after an interval: it is gone (SC-006).
3. Re-open it. Refresh: it is back **at the top** — a fresh launch (FR-002, SC-006).
4. On the admin page, open a listed poll for editing (change its subtitle, do not publish).
   Refresh Newest: still listed, same position, **old** subtitle (FR-009). Publish the edit:
   new subtitle, same position — publishing is not a launch (FR-002). Only `newest-counts.json`
   moved on that refresh unless the set changed (SC-004).
5. Edit a listed poll and give it a start date tomorrow; publish. Refresh: gone (waiting to
   open). Set the date back to now and publish (or wait): it re-enters as newly launched
   (FR-004).
6. Automated: `tests/newest.test.ts` covers every edge of the state machine in seconds.

## US3 — Fast for the visitor, free for the servers

1. With Newest open and populated, reload the page: the grid is on screen before the network
   panel shows `newest-counts.json` completing; `sessionStorage["newest:copy"]` exists (FR-019).
   Wait longer than the interval and reload: the fetch precedes the render.
2. Click Trending, then Newest again within 2 s: the grid shows at once and **no** request is
   sent (FR-021).
3. Press **Refresh** twice quickly: two requests go out (burst 2); the control then greys out
   until a token returns — no notice — and is usable again after the pause (FR-021). The Refresh
   control is available on Newest at all (FR-028).
4. Network panel, as a guest: the only requests Newest makes are the two objects — no
   `/api/…/refresh`, no `/api/me/polls` (FR-020, FR-023, SC-003). Sign in: each applied counts
   object is followed by exactly one `GET /api/me/polls?pids=…` and the cards show your voted
   and bookmarked state (FR-023).
5. Vote in a Newest card from the Trending tab (the same poll listed on both): switch to Newest —
   the card already shows your vote, with no fetch (FR-024).
6. Sign out with Newest open: the tab stays open and populated; the cards' personal state clears;
   sign in again: it refetches (FR-023).
7. Restart the server and, within the first second, open Newest in a fresh browser: the panel
   shows nothing and the instance answered `503 newest-not-ready` (network panel); after the
   start-up recompute, the next click fills it (FR-013, FR-017).
8. With Spaces configured (staging): the objects come from the CDN with `max-age` equal to the
   interval; the instances receive nothing for the listing (SC-003).

## US4 — The operator sizes and paces the tab

1. Start with `ENV_MAX_NEWEST_POLLS=3` and five open polls: three are listed, the three most
   recently launched (SC-007).
2. Start with `ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL=5000`: `[sweeps] newestSweep every 5000ms
   (lock 10)` in the server log; the instance routes answer `Cache-Control: public, max-age=5`;
   `/api/config` reports `newestRecomputeIntervalMs: 5000` (FR-019, FR-026).
3. Start with `ENV_MAX_NEWEST_POLLS=0`, then `=201` (above the default search cap), then
   `ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL=500`: each start fails with a message naming the setting
   and the bound (FR-027, SC-008).
4. Start with both unset: the log shows `newestSweep every 60000ms`; `launch.json.example`,
   `devScripts.example/launch-dev.ps1`, `.do/app.yaml`, the CLAUDE.md table and
   `postman/openapi.json` all carry the two settings (FR-026).
5. Scale seed (`devScripts/populate/`): after seeding, Newest lists the fifty most recently
   created open seed polls — the seed wrote `launched_at` itself (FR-006).

## Coverage map

| Story | Automated | Manual only |
|---|---|---|
| US1 | `newest` (ranking, tie-breaks, cap, eligibility), `client-home` (guest/member open, empty state) | two-browser identity (SC-002) |
| US2 | `newest` (every state edge via `updatePoll`; insert values) | the admin-page walk-through |
| US3 | `client-home` (session copy, no cards fetch on unchanged membership, Refresh enabled, overlay once, none for guests), `newest` (`503` before the first sweep) | network timing, CDN staging |
| US4 | `config` (defaults, bounds), `openapi-contract`, `db-explain-guard` | templates and `.do/app.yaml` by inspection; the seed run |
