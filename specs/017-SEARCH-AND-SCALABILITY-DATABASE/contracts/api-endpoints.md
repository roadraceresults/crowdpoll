# API Contracts: Search and Scalability Database

**Phase 1 output**. Every endpoint below is described in `postman/openapi.json` at implementation
time (the OpenAPI contract test enforces it). Field shapes reference `data-model.md`.

## Common envelope for dynamic requests

Dynamic requests: votes, searches, Live Results refreshes, and Refresh/tab refreshes of the
instance-served tabs (My PRIVATE POLLS, Favourites, Search), plus the overlay call. Each route
declares its `kind` ∈ `search | refresh | live | vote` for floors, the controller and shedding.

| Situation | Status | Headers | Body |
|---|---|---|---|
| served | `200` (or `304` for an unchanged delta) | — | kind-specific body **plus** `nextRefreshMs` (floor × multiplier; the unstretched vote floor for votes) |
| earlier than the floor | `429` | `Retry-After: <s>` | `{ "error": "too-soon", "retryAfterMs", "nextRefreshMs" }` |
| shed by the instance, or cache unreachable | `503` | `Retry-After: <s>` | `{ "error": "busy", "retryAfterMs", "nextRefreshMs" }` |
| not signed in (where required) | `401` | — | existing shape |
| not eligible | `403` | — | existing message |

Clients treat `429` and `503` identically: wait `retryAfterMs` (+ 0–1 s jitter for `503`), then
retry; a pending vote is retried once automatically.

## Home page tabs

### `POST /api/tabs/private/refresh` and `POST /api/tabs/favourites/refresh` — kind `refresh`, session required

Request: `{ "membershipVersion": string|null, "versions": { [pid]: [contentVersion, countsVersion] } }`.

Response `304` when nothing moved; else `200`:

```json
{
  "membershipVersion": "2026-09-18T10:00:00.000Z",
  "order": ["p1", "p7", "..."],
  "counters": { "p1": { "voteCount": 120, "choiceCounts": { "c1": 70, "c2": 50 }, "countsVersion": 120 } },
  "cards": { "p7": { "...card fields...": "", "contentVersion": 3, "overlay": { "voted": true, "choiceIds": ["c1"], "bookmarked": false } } },
  "nextRefreshMs": 5000
}
```

`order` only when membership changed; `cards` for moved content and for ids the client lacks;
`counters` for polls whose live `seq` moved. Personal-tab cards include the overlay inline.

### `POST /api/search` — kind `search`

Request: `{ "q": string }`. Response `200`:
`{ "results": [Card], "truncated": boolean, "nextRefreshMs": number }` — cards without the
`overlay`; at most `ENV_MAX_POLLS_SEARCH_RESULTS`. A Refresh click on the Search tab calls
`POST /api/search/refresh` with the same body; it is kind `refresh` (manual floor, `k:refresh`)
and a cache miss counts against the search sub-budget.

### `GET /api/me/polls?pids=p1,p2,…` — kind `refresh`, session required

Response `200`: `{ "overlay": { [pid]: { "voted": boolean, "choiceIds"?: string[], "bookmarked": boolean } }, "nextRefreshMs": number }`.
At most `ENV_MAX_POLLS_SEARCH_RESULTS` ids. Fetched on page load and on a TRENDING set change;
updated locally after the user's own actions.

### `GET /api/trending/counts` and `GET /api/trending/cards` — not dynamic requests

Served from `listing:trending` only when `ENV_SPACES_BUCKET` is unset; honour `If-None-Match`
with `304`; `Cache-Control: public, max-age=<recompute interval s>`. Same bodies as the CDN
objects below.

## CDN objects (Spaces)

`trending-counts.json` — published every recompute:

```json
{ "membershipVersion": "<sha256 of sorted ids>", "recomputedAt": "…",
  "polls": [ { "pid": "p1", "voteCount": 120, "choiceCounts": { "c1": 70, "c2": 50 }, "countsVersion": 120 }, "…" ] }
```

`trending.json` — published only when `membershipVersion` changed:

```json
{ "membershipVersion": "<same hash>", "cards": { "p1": { "...card fields...": "", "contentVersion": 3 } } }
```

Both: `Cache-Control: public, max-age=60`, `ETag`, `Content-Encoding: gzip`. `/api/config`
exposes `trendingBaseUrl` (the CDN base or `/api/trending`).

## Live Results — session required

### `POST /api/live/:pid` — kind `refresh` (adding is a manual action)

Checks view eligibility (public; private with the link; invitation-only if invited or creator);
`403` otherwise. Adds the pid to the user's list (LRU, cap `ENV_MAX_LIVE_RESULTS_PER_USER`;
re-adding moves to top; when full the add is refused with `409 live-cap` and `limit` — FIX028). Response `200`:
`{ "polls": [pid, …], "nextRefreshMs": number }`.

### `DELETE /api/live/:pid` — kind `refresh`. Removes a poll; `200 { "polls": [...] }`.

### `POST /api/live/refresh` — kind `live`

Request: `{ "versions": { [pid]: [contentVersion, countsVersion] } }` for the polls in the tab.
Response `304` when nothing moved, else `200` with the delta envelope above (no `order`; content
from `poll:<pid>`, counts from `cnt:<pid>`; never PostgreSQL). Registers the session in
`live:active` with expiry `now + nextRefreshMs + ENV_MAX_IDLE_TIME`; `403 { "error":
"live-expired" }` when the registration has lapsed. `nextRefreshMs = ENV_MIN_LIVE_REFRESH_INTERVAL
× k:live`.

## Votes — session required

### `POST /api/polls/:pid/vote` — kind `vote`

Request: `{ "choiceIds": string[] }` (unchanged). Validation as today (`403` with the existing
messages; a second vote on a Final-Vote poll is refused even while the first is queued). Response
`200`:

```json
{ "status": "recorded" | "queued",
  "voteCount": 121, "choiceCounts": { "c1": 71, "c2": 50 }, "countsVersion": 121,
  "myChoiceIds": ["c1"], "nextRefreshMs": 2000 }
```

`status` is `"queued"` while `queue:lag` ≥ `ENV_VOTE_QUEUE_LAG_NOTICE`; the client shows the
queued notice. `nextRefreshMs` is always the unstretched vote floor. Per-IP cap:
`429 { "error": "ip-vote-cap" }` beyond `ENV_MAX_VOTES_PER_IP_PER_MINUTE`, with an operator alert.

## Bookmarks — session required, kind `refresh`

`POST /api/polls/:pid/bookmark` → `200 { "bookmarked": true, "nextRefreshMs" }` or `409 { "error":
"bookmark-cap" }` at `ENV_MAX_BOOKMARKS_PER_USER`. `DELETE /api/polls/:pid/bookmark` → `200 {
"bookmarked": false, "nextRefreshMs" }`.

## Admin search — admin only

### `GET /api/admin/polls/search`

Query parameters: `q`, `state`, `visibility`, `choiceMode`, `voteMutability`, `createdBy`,
`createdAt`/`startAt`/`endAt` each as `<op>:<YYYY-MM-DD>` (`op` ∈ `gte|lte|eq`), `tz` (IANA zone,
required when any date is set), `voteCount`/`invitedVoterCount`/`bannedVoterCount` each as
`<op>:<n>`. Blank parameters ignored; all ANDed. Response `200`: `{ "polls": [AdminPollRow],
"truncated": boolean }`, newest first, at most `ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS`. Not a
dynamic request (administrators are few); protected by the existing admin guard.

## Page load and operations

- `GET /api/me` — unchanged shape; answered from the session cache; subject to the page-load
  bucket (`429 { "error": "too-many-loads", "retryAfterMs" }`).
- `GET /api/config` — gains `trendingBaseUrl`, `assetsBaseUrl`, the floors and `ENV_MAX_LIVE_RESULTS_PER_USER`;
  `Cache-Control: public, max-age=300`.
- `GET /healthz` — always `200 { "ok": true, "cache": "up" | "down", "shed": { "search": n,
  "refresh": n, "live": n, "other": n, "vote": n }, "abuse": { "ipVoteCap": n } }`; registered
  before shedding; no session.
- `POST /api/auth/logout` — unchanged contract; now the sole route calling `endSession`.

## Retired

- `GET /api/polls` (the full home listing) and its per-caller fields — retired in US1 (T050), after serving the existing grid from the new store through Phase 2.
- `GET /api/polls/:pid` as a polled single-poll fetch; `/?PID=…` redirects to `/`.

## Unchanged

Admin poll CRUD, edit session and heartbeat, rescreen, publish, results, exports (`export.json`,
`export.md`), duplicate, rosters; profile and sign-in routes. Their storage calls are re-based;
their contracts are not touched.
