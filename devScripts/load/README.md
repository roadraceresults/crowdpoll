# Load tests

Four [k6](https://k6.io/) scripts that drive a **deployed** fleet — never CI or a
laptop — and check the bounds the server promises. Each script reads:

| Variable | Meaning | Default |
|---|---|---|
| `BASE_URL` | The deployment's origin | `http://localhost:8080` |
| `COOKIES` | Comma-separated `session_token=…` cookies of signed-in test accounts (one per virtual user, reused round-robin) | none (guest traffic) |
| `PIDS` | Comma-separated poll ids to vote on / watch | required by `vote-burst.js` and `live-surge.js` |
| `SEARCH_TERMS` | Comma-separated search words: a distinctive title word, a common word and a misspelling | `budget.js` |

Run one with `k6 run -e BASE_URL=https://… devScripts/load/<script>.js`.

## Expected outcomes

| Script | Drives | Expected |
|---|---|---|
| `budget.js` | dynamic requests above the effective budget, plus searches over the 250,000-poll seed | `nextRefreshMs` rises for searches first, then manual refreshes, then Live Results; votes keep `nextRefreshMs = ENV_MIN_VOTE_REFRESH_INTERVAL`; the served rate settles at about the budget; multipliers fall within a few ticks after the load stops; adding an instance raises the budget within 30 s; search p95 < 1 s |
| `vote-burst.js` | votes on one poll above the drain rate | no `4xx`/`5xx` for load (only floors and caps refuse); `status` becomes `queued` past the lag notice; `npm run reconcile` makes `polls.vote_count` equal `count(*) from votes` |
| `live-surge.js` | many Live Results tabs opened within a minute | `k:live` rises before the first refreshes land (the first refresh responses already carry a stretched `nextRefreshMs`); no `503` at the surge's start |
| `page-storm.js` | reloads at the page-load bucket and beyond | at most one instance request per reload; the 121st reload in a minute answers `429 too-many-loads` |

## Writing measured values back

The defaults of `ENV_SERVER_MAX_REQUESTS_PER_INSTANCE_PER_SECOND`, `ENV_INSTANCE_MAX_INFLIGHT`,
`ENV_INSTANCE_MAX_EVENT_LOOP_LAG` and the app spec's CPU target were chosen from
estimates. After a run, read the served rate per instance from `budget.js`'s summary
and the instance CPU from the App Platform metrics, and change the defaults in
`src/config.ts`, `CLAUDE.md`, the launch templates and `.do/app.yaml` together when
the measured values differ.
