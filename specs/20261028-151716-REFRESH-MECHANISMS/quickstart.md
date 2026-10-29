# Quickstart: Refresh Mechanisms

Validates the feature end to end on a development server.

## Prerequisites

- PostgreSQL as for `npm run dev`; `devScripts/launch-dev.ps1` regenerated from `devScripts.example/launch-dev.ps1` (it now sets `ENV_COUNTER_FLUSH_INTERVAL=10000`).
- Two browsers (A and B), each signed in as a different account with `View Polls` and `Vote on Polls`.
- A test poll with votes: `npx tsx devScripts/populate/populate-poll.ts tests/fixtures/populate-poll.json`.

## Automated checks

```text
npx tsc --noEmit
npm test
```

All suites pass; the tests named in `tasks.md` cover FR-001–FR-019.

## 1. Sweeps (FR-015–FR-017, contract A7)

Start the server and read the start-up log: `[sweeps] counterFlushSweep every 10000ms (lock 3)` and `[sweeps] invitationSweep every 30000ms (lock 12)`; every other sweep as before.

## 2. Personal-tab shortcut (FR-001–FR-008, A1, A6)

1. In A, open Your Votes, wait 5 s, press Refresh twice (5 s apart).
2. The second answer is `304` or counters only (Network panel).
3. Within a minute the `[controller]` line shows `tabs=<fast>/<full>` with `fast` ≥ 1.
4. In A, vote on a poll not yet on Your Votes; after about a second press Refresh: the poll appears (full answer).
5. In B (the poll's creator), edit the poll's title; in A press Refresh on Your Votes: the new title shows.
6. In B, delete a poll that A has voted on; in A press Refresh: it disappears.
7. In B, invite A's address written with a `+tag`; in A open Shared With You and press Refresh: the poll appears.

## 3. Live Results back-off (FR-009, FR-010, C2)

1. In A, add a poll nobody votes on to Live Results; watch `/api/live/refresh` requests in the Network panel: about 2, 4, 8, 10, 10 s apart.
2. Vote on that poll in B: A shows the vote within 10 s, and the next request follows 2 s later.
3. Make A's page visible again (switch to another browser tab and back, or minimize and restore the window): the next request comes at the normal interval.

## 4. Trending and Newest (FR-011, FR-012, A4, A5, C3)

1. `GET /api/config` shows `trendingMaxAgeMs: 10000` and `newestMaxAgeMs: 10000`.
2. `GET /api/trending/trending-counts.json` answers `Cache-Control: public, max-age=10`.
3. Open Trending: Refresh stays unavailable for 10 s after the list loads, then becomes available.

## 5. Refresh button tooltip (FR-013, C1)

Press Refresh on Your Polls five times quickly; hover the button: `Refresh available in N s`, counting down; the button looks as before and can still be focused with Tab.

## 6. Stretched floor (FR-014, FR-014a, A3)

In a test (or with the cache key `k:refresh` set to `3` by hand), send refreshes from one session every 6 s after the burst: they are refused with `429 too-soon`; the `[controller]` line shows `stretched=` above 0. Set `k:refresh` back to `1`: the same requests are allowed.

## 7. Documents (FR-018, FR-019)

`ARCHITECTURE.md`'s refresh and sweeps sections describe the five mechanisms and the new values; searching `CLAUDE.md`, `README.md` and `ARCHITECTURE.md` finds no "every 2 s" flush and no "Must not be below `ENV_COUNTER_FLUSH_INTERVAL`".
