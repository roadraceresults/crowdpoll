Start a new spec for these requirements called `017-SEARCH-AND-SCALABILITY-DATABASE`.

# Overview
This requirements document replaces MongoDB with DigitalOcean Managed PostgreSQL, adds a free-text
search to the home page and a structured search to the `/admin` page, and restructures the home
page and its refresh model so that the application supports **250,000 polls and 1,000,000
concurrently connected users** (50% signed in) on DigitalOcean App Platform.

It accepts every recommendation of the research in
`research/017-SEARCH-AND-SCALABILITY-DATABASE-SCENARIO-2/research-results-option-2.md`, whose
recommendations were adopted, by name, into
`research/017-SEARCH-AND-SCALABILITY-DATABASE-SCENARIO-2/017-research-requirements-SEARCH-AND-SCALABILITY-DATABASE-SCENARIO-2.md`;
the two documents agree on every mechanism and every default, and this document carries them
forward as requirements:

- **Datastore**: DigitalOcean Managed PostgreSQL, accessed through Kysely with versioned
  migrations applied at boot; BetterAuth on the same database. MongoDB is removed entirely,
  authentication collections included; accounts are re-created.
- **Search**: DigitalOcean Managed OpenSearch in production; PostgreSQL full-text search in
  development, in tests, and as the production fallback; one retrieval interface so the engine is
  a configuration choice; an identical-query result cache; a search outbox drained on an interval;
  a search sub-budget that sizes the engine.
- **Shared cache and queue**: DigitalOcean Managed Valkey (with a standby node in production) for
  sessions, per-kind floors, the server budget and its controller, vote counters, trending
  buckets, cached listings, cached search results, per-poll projections, the live registry, the
  instance heartbeats and the vote queue (Valkey Streams). In development and tests an in-process
  implementation of the same interface is used.
- **Refresh model**: polling/refreshing, not push — no automatic tab refresh; no refresh of any
  kind for guests; one per-user floor per request kind; one server-wide budget that follows the
  fleet, with adaptive intervals handed to clients in a fixed priority order and a predictive
  multiplier for the one kind that can burst; a Live Results tab that is the only automatically
  refreshing surface, served from live counters.
- **Refresh protocol**: version-keyed deltas — every refresh sends the versions the client holds
  and receives only what changed; TRENDING is published as two CDN objects for the same reason.
- **Vote path**: one path for every vote — validate, count in the cache, enqueue, respond with the
  counts — with a consumer group writing rows to PostgreSQL in batches; a vote is never lost to
  load; a per-session floor and a per-IP cap bound abuse.
- **Load bounds at three speeds**: per-instance load shedding (milliseconds), the budget
  controller (seconds), CPU autoscaling of a stateless fleet (minutes).
- **Page loads**: static assets and TRENDING served from a CDN with immutable and time-bounded
  caching, a client-side copy of TRENDING, and a per-client page-load limit, so that a browser
  Refresh costs the server one cache read.
- **Production sizing**: App Platform autoscaling 4–12 dedicated-CPU instances (8 at the load
  target), Managed Valkey 2 GiB with standby, Managed PostgreSQL 16 GB / 8 vCPU, Managed
  OpenSearch 3 × 4 GiB, Spaces + CDN.

The UI/UX design of the tabbed home page and of clickable topics is **not** part of this
document; the requirements below define what each surface does and what it costs the server, not
how it looks. Database changes for topics will be specified in the future.

# Load Target and Design Rules
The application must hold the following at once, in production:

- 250,000 polls.
- 1,000,000 concurrently connected users, of whom 50% are signed in.
- Any vote rate: votes have no limit and are absorbed by the vote queue; the drain capacity of the
  recommended PostgreSQL node (≈ 20,000 votes per second sustained) is the design ceiling, and a
  backlog above it is reported to the voter as "queued", never dropped.
- A server-wide dynamic-request rate bounded by the effective budget —
  `ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND` × live instances, capped by
  `ENV_SERVER_MAX_REFRESH_PER_SECOND` — enforced by the server itself.

Seven rules follow from the research and apply to every feature below:

1. **Nothing reads the whole `polls` table on a request.** Every listing is capped and served by an
   index or from the cache.
2. **Anything identical for every visitor is built once and served as bytes** (pre-serialised,
   pre-compressed, versioned) — from Valkey or from the CDN — never rebuilt per request.
3. **Anything per user is one indexed query**, backed by the materialised `user_polls` table.
4. **Counters are accumulated in the cache and flushed**, never updated in a poll row per vote;
   what a viewer sees live is read from the cache, not from the flushed row.
5. **A request the server cannot afford is slowed down, not failed**: the client is told the
   interval to use next; a vote is queued rather than rejected.
6. **Only changed data travels.** Every refresh carries the versions the client holds and receives
   deltas.
7. **No instance holds state that matters.** Every shared state is in Valkey or PostgreSQL, so
   any instance can serve any request and instances come and go under autoscaling.

# Datastore

## PostgreSQL replaces MongoDB
The application's only database is a DigitalOcean Managed PostgreSQL cluster. MongoDB is removed
entirely: its driver, its adapter, the `ENV_MONGODB_NAME` and `ENV_MONGODB_URI` variables, the
`mongodb-memory-server` test harness and every collection — the authentication collections
included. Accounts are re-created on PostgreSQL; there is no data migration (see Exclusions).

- Connection: `ENV_DATABASE_URL`. In production the application connects through the managed
  connection pool (PgBouncer, transaction mode); each instance holds a pool of 20 connections, so
  that the autoscaling maximum of 12 instances plus the sweeps stays within the node's limit.
- Query layer: **Kysely** (typed SQL builder). No ORM.
- Migrations: versioned SQL migrations applied at boot by Kysely's `Migrator`, replacing today's
  "ensure indexes at startup". A migration that fails stops the server from starting.
- Authentication: BetterAuth on PostgreSQL (`database: new Pool(...)`); its tables are generated by
  `npx @better-auth/cli generate`; the case-insensitive unique `userName` becomes a unique index on
  `lower(user_name)`. The single-cookie policy of `001-user-auth` is unchanged.
- Tests: `embedded-postgres` starts a real PostgreSQL per Vitest worker (Windows included);
  `pg_trgm` is available. No Docker is required to run the suite.

## Schema
The poll becomes a row; votes, invitations, bans and bookmarks become rows in their own tables so
that a public poll's participation is unbounded and the composite keys enforce
one-vote-per-participant and no-duplicate-invitations in the database.

```
polls            id PK, title, subtitle, choices JSONB, choice_labels TEXT, keywords TEXT,
                 search TSVECTOR (generated, see Home Page Search),
                 home_listable BOOLEAN (generated, see Home Page Search),
                 poll_state, poll_state_before_edit_update, poll_visibility, poll_sharing_mode,
                 vote_anonymity, choice_mode, vote_mutability, voter_count_limit,
                 created_by_id, created_by_name, created_at, start_at, end_at,
                 closed_at, last_vote_at,
                 vote_count, invited_count, banned_count, choice_counts JSONB,
                 content_version BIGINT, counts_version BIGINT,
                 the edit-lock and screening columns of 014
votes            (poll_id, email) PK, user_name, choice_ids TEXT[], voted_at
poll_invitations (poll_id, email) PK
poll_bans        (poll_id, email) PK
bookmarks        (email, poll_id) PK, created_at; index (poll_id)
user_polls       (email, poll_id, relation) PK, updated_at
                 relation ∈ {created, invited, voted, bookmarked}; index (email, updated_at DESC)
vote_history     id, poll_id, email, user_name, choice_ids, voted_at — PARTITION BY RANGE (voted_at), monthly
search_outbox    poll_id PK, version, reason
```

Field rules:

- `choices` stays JSONB because choices are edited as a unit and capped by `ENV_MAX_CHOICES`;
  `choice_labels` is written on every save so the generated `search` column can include them.
- `choice_counts` (per-choice tallies), `vote_count`, `last_vote_at` and `counts_version` are
  written only by the counter flush and the nightly reconcile (see Counters); a test asserts this.
  `invited_count` and `banned_count` are written in the roster transaction.
- `content_version` is incremented by any change of state or content (title, subtitle, choices,
  keywords, visibility, schedule); `counts_version` is the poll's per-vote sequence number
  (`seq` in `cnt:<pid>`). **The row's `counts_version` is the `seq` as of the last flush and is
  read only by the database, the admin filters, the TRENDING recompute and the search index.**
  Everything a client sees — the refresh protocol's deltas, the Live Results response, the vote
  response and the TRENDING counts object — compares and returns the **live** `seq` from
  `cnt:<pid>`, so a poll shows the same number on every surface and a delta can never step
  backwards. The refresh protocol and the TRENDING two-object split compare `content_version`
  and the live `seq`; nothing else compares them.
- `closed_at` is set on the transition to `CLOSED`; `last_vote_at` by the counter flush. Both exist
  for the bookmark removal rules.
- `created_by_name` is copied from the creator's user record when the poll is created. When a user
  changes `userName`, the **profile route** that performs the rename, in the same transaction as
  the user-row update, runs `UPDATE polls SET created_by_name = $new, content_version =
  content_version + 1 WHERE created_by_id = $id` and upserts the affected poll ids into
  `search_outbox` with `reason = 'content'`; `polls` carries a `btree (created_by_id)` index for
  this. The outbox drain then re-indexes those polls within `ENV_OUTBOX_DRAIN_INTERVAL`, the bumped
  `content_version` makes the next delta send their cards, and TRENDING shows the new name at its
  next recompute. No database trigger is used; a creator with many polls makes the rename request
  proportionally longer, which is acceptable for an action a user performs rarely.
- `user_polls` is written **in the same transaction** as the row it mirrors: the poll insert
  (`created`), the invitation insert (`invited`), the bookmark insert (`bookmarked`), and the
  consumer's vote batch (`voted`). It exists so that each personal tab is one index range scan.
- Stored enumerations continue to be rendered verbatim; no code-to-label map is introduced.

## Counters: accumulated in the cache and flushed
Vote counts are not real-time in the database and are never updated in the poll row per vote.

- A vote increments the poll's counters in Valkey: `HINCRBY cnt:<pid> <choiceId> 1`,
  `HINCRBY cnt:<pid> total 1`, and `HINCRBY cnt:<pid> seq 1` (a per-vote sequence number), and the
  trending bucket `HINCRBY trend:<5-minute bucket> <pid> 1`.
- The **counter flush sweep** runs every `ENV_COUNTER_FLUSH_INTERVAL` (default 2000 ms). Each tick
  it takes the polls whose counters changed since the last tick and, in one batched `UPDATE`,
  writes their `choice_counts`, `vote_count`, `last_vote_at` and `counts_version` (the `seq` value
  at flush time) to their rows; refreshes their cached content projections if needed; and upserts
  them into `search_outbox` with `reason = 'counters'`. A poll receiving thousands of votes per
  second costs one row update per flush.
- Counters are stored and transmitted as **absolute values**, never increments, so a delta applied
  twice or out of order is harmless and a missed delta is repaired by the next one.
- The flushed row is what the database, the admin search filters, the TRENDING recompute and the
  search index see; it lags the live counters by at most one flush interval. **Live Results reads
  the live hash, not the row** (see Live Results tab), so the flush interval does not limit
  Live Results freshness.
- A **nightly reconcile** recomputes `vote_count` and `choice_counts` from `votes` for every poll
  that received a vote that day and corrects any drift — including votes lost from the queue.
  If Valkey is lost, the counters are rebuilt from `votes` the same way at startup.

## Sweeps on multiple instances
Every sweep — approval, schedule, counter flush, trending recompute and publish, search outbox
drain, bookmark removal, nightly reconcile, budget controller — takes
`pg_try_advisory_lock(<sweep id>)` at the start of a tick and returns immediately if another
instance holds it, so each sweep runs once site-wide regardless of the instance count. The
existing claim semantics (`UPDATE … RETURNING`) remain as the safety net. The vote-queue consumer
is the one exception: it runs on every instance as a member of one consumer group.

# Shared Cache and Queue (Valkey)

## Interface
One module provides `get / set / incr / hincrby / hgetall / zadd / zcard / expire / lock / xadd /
xreadgroup / xack` and is implemented twice: an in-process implementation with TTLs (used when
`ENV_VALKEY_URL` is unset — development and tests) and a Valkey client (production). Every
feature in this document is written against the interface; the queue adapter is the only file
that would change if the queue technology were ever replaced.

## Sessions
Session lookup is cache-aside: the session helper looks up `sess:<hash of token>` in the cache
before BetterAuth's database lookup, stores the result for `ENV_SESSION_CACHE_TTL` (default
300000 ms), and deletes the key on logout. PostgreSQL remains the session system of record. No
second cookie is introduced: BetterAuth's `cookieCache` option **must not** be used, because it
adds a second cookie and breaks the `001-user-auth` single-cookie policy. Every dynamic request
and every page load (`/api/me`) therefore costs one cache read for its session, not a database
read.

**Ending a session.** The session helper exposes one `endSession(token)` that calls BetterAuth's
sign-out and deletes `sess:<hash>`, and it is the only way any route ends a session — logout
today, and account deletion or administrator revocation when those exist — so an
application-driven revocation takes effect on the next request. The cache entry stores the
session's own expiry, and the helper never serves a session past it. A session removed directly
in the database (an operator action) is honoured within `ENV_SESSION_CACHE_TTL`; this window is
accepted. A test asserts that `endSession` is the sole caller of BetterAuth's sign-out.

## When Valkey is unreachable
Every request path depends on Valkey, so its unavailability — a failover to the standby, or a
longer outage — has one defined behaviour rather than one per path:

- Every Valkey call has a short timeout (100 ms). While the client reports disconnected, an
  instance **sheds every dynamic request with `503` and `Retry-After`** (`ENV_SHED_RETRY_AFTER`)
  — the same path and the same client behaviour as load shedding — and keeps serving the
  CDN-backed page-load paths and `/healthz`, which stays `200` so the load balancer does not pull
  the fleet.
- Votes are not accepted while Valkey is down (they cannot be counted or queued); the client shows
  the pending-vote notice and retries after `Retry-After`. Reads that have a database source —
  `/api/me` through BetterAuth's own lookup, the personal tabs' membership query, the admin
  search — continue at database cost, protected by the in-flight cap alone.
- The vote consumer and every sweep pause on a disconnect and resume on reconnect; the controller
  multipliers persist in Valkey and are merely stale for the duration.
- On reconnection the counters, registry and queue are the standby's (a loss of at most about one
  second, as accepted); the nightly reconcile corrects any counter gap; `voted:<session>` and the
  roster sets rebuild lazily from PostgreSQL on their next miss.
- Nothing falls back to PostgreSQL for floors, budgets, counters or the vote write: doing so would
  put the unbounded load the design exists to prevent onto the database at the moment nothing is
  bounding it.

## Keys
| Key | Content | Expiry |
|---|---|---|
| `sess:<token-hash>` | session lookup result | `ENV_SESSION_CACHE_TTL` |
| `floor:<kind>:<session or ip>` | the per-user minimum-interval marker for a request kind | that kind's floor |
| `votes-ip:<ip>` | votes from an address in the current minute | 60 s |
| `ban:<pid>`, `invite:<pid>` (sets) | a poll's roster, loaded on first use; invalidated by the roster transaction | 1 h, refreshed on read |
| `voted:<session>` (set) | the pids this session has voted on, written at enqueue; rebuilt from `votes` on a miss | `ENV_SESSION_CACHE_TTL`, refreshed on read |
| `budget:<second>` | count of dynamic requests in that second | 10 s |
| `search-budget:<second>` | count of search-engine queries in that second | 10 s |
| `k:search`, `k:refresh`, `k:live` | the current interval multipliers | none |
| `instance:<id>` | an instance's heartbeat (the effective budget follows their count) | 30 s |
| `live:active` (sorted set) | every live tab, scored by its expiry = last refresh + the interval handed to it + `ENV_MAX_IDLE_TIME` — the live registry | pruned by the controller when the score has passed |
| `pageload:<session>` (signed in) / `pageload:<ip>` (guest) | page loads in the current minute | 60 s |
| `cnt:<pid>` | per-choice counters, `total` and `seq` | none |
| `trend:<bucket>` | votes per poll in a 5-minute bucket | 65 min |
| `listing:<name>` | pre-serialised, pre-compressed listing bytes + version | recompute interval |
| `poll:<pid>` | the poll's content projection with `content_version` | refreshed on content change |
| `search:<hash of normalised query + scope>` | search response bytes | `ENV_SEARCH_CACHE_TTL` |
| `lock:<sweep>` | single-flight lock for listing rebuilds | seconds |
| stream `votes`, group `writers` | the vote queue | trimmed after acknowledgement |

# Home Page

## Tabs
The home page is a tabbed control. The tabs in scope of this document are:

- **TRENDING** — the default tab on arrival and after a browser refresh.
- **My PRIVATE POLLS** — private polls the signed-in user created, is invited to, or has voted in.
- **Favourites** — public polls the signed-in user created, has voted in, or has bookmarked.
- **Search** — the results of the last search.
- **Live Results** — the polls the user has selected to watch.

Every poll card in every tab except Search has a **Vote** button; every card in every tab except
Live Results has a **Live Results** button — search-result cards included, so a search result can
be added to the Live Results tab, where it can be voted on; every card has a **Bookmark** /
**Un-bookmark** button. For a guest, the Vote, Live Results and Bookmark buttons prompt to sign
in. All five tabs are always shown; for a guest, My PRIVATE POLLS, Favourites and Live Results are
disabled and clicking one prompts to sign in.

Tab content is refreshed **only** when the user clicks the tab, clicks the tab's **Refresh**
button, or — on the Live Results tab only — automatically. A refresh is a single request that
returns the current state of every poll in that tab, as a delta (see Refresh Protocol).

## TRENDING
TRENDING is the same list for every visitor: the `ENV_MAX_TRENDING_POLLS` (default 200) Public
polls that are `OPEN` — or `EDITING` with `pollStateBeforeEditUpdate = OPEN`, shown with their
last published content, so a poll does not leave TRENDING merely because an administrator opened
it for editing — with the most votes in the trailing hour, ties broken by `voteCount` descending.

- The **trending sweep** recomputes it every `ENV_TRENDING_POLLS_RECOMPUTE_INTERVAL` (default
  60000 ms) by summing the trailing twelve `trend:<bucket>` hashes over the polls that appear in
  them — never by querying `votes` — and taking the top `ENV_MAX_TRENDING_POLLS`.
- **Two-object publishing.** The sweep publishes two objects to a DigitalOcean Spaces bucket
  served through the Spaces CDN, both with `Cache-Control: public, max-age=<recompute interval in
  seconds>` and an `ETag`:
  - `trending-counts.json` — the poll ids **in TRENDING order**, each with its `voteCount`,
    per-choice counts and `counts_version`, plus a **membership version** — a hash of the
    **set** of ids, independent of their order; published **every** recompute; ≈ 2 KB compressed.
  - `trending.json` — the full poll cards keyed by id, with their `content_version`s, in no
    significant order; published **only when the set of ids changed**; ≈ 32 KB compressed at
    200 cards. Because TRENDING is re-ranked every recompute, order changes on nearly every
    recompute while the set changes by a few ids at most; order therefore travels in the counts
    object and never triggers a republish of the full object.
- The client fetches `trending-counts.json` on each interaction (page load, TRENDING tab click,
  Refresh click), renders the cards it holds in the order that object gives, and applies its
  counters as a delta; it fetches `trending.json` only when the membership version (the set of
  ids) differs from the one it holds. A client whose copy is current receives a `304` from the CDN.
- **TRENDING interactions are not dynamic requests.** They never reach an application instance, so
  the server cannot apply a floor, count them against the budget or hand out `nextRefreshMs` for
  them. The manual floor for TRENDING is enforced by the client alone (the Refresh button is
  disabled for `ENV_MIN_MANUAL_REFRESH_INTERVAL`; a tab click within the floor re-renders the held
  copy without a request), and the server-side bound is the CDN itself — `max-age=60` on both
  objects and the `sessionStorage` copy — so a client that bypasses the button cannot obtain a
  fresher object than the CDN holds. The signed-in overlay call that follows a TRENDING render is
  a server request and is classified with the tab it accompanies (see Refresh rules).
- The same bytes are held in `listing:trending` so that an instance can serve TRENDING with
  `ETag` / `304` support when the CDN is not configured; such a request touches neither
  PostgreSQL nor OpenSearch.
- Because the listing is identical for everyone, it carries no per-user fields. A signed-in
  client obtains its **overlay** — which of the visible polls it has voted in (and with which
  choice ids) or bookmarked — with one call, `GET /api/me/polls?pids=<the visible ids>`, answered
  by a single `user_polls` lookup (`WHERE email = $me AND poll_id = ANY($pids)`) and returning, per
  pid, `{ voted, choiceIds?, bookmarked }`. The client fetches it on page load and whenever
  `trending-counts.json` brings ids for which it holds no overlay entry (a set change); after its
  own vote or bookmark action it **updates the overlay locally** from that action's response,
  which is authoritative for the user, and does not re-fetch. The call is a manual-kind dynamic
  request (floor `ENV_MIN_MANUAL_REFRESH_INTERVAL`, counted against the effective budget). The
  personal tabs return the same per-pid overlay fields inline, so one card component renders every
  tab.
- Future topic listings (Sport, Politics, …) will use the same mechanism — one more pair of
  CDN-served objects each — and need nothing from this document beyond it.

## My PRIVATE POLLS and Favourites
Each personal tab is one indexed query on `user_polls` joined to `polls` by primary key, capped at
`ENV_MAX_POLLS_SEARCH_RESULTS`:

- My PRIVATE POLLS: rows for the user with `poll_visibility = 'Private Poll'` (every relation).
- Favourites: rows for the user with `relation IN ('created','voted','bookmarked')` and
  `poll_visibility = 'Public Poll'`.

Both are ordered by `updated_at` descending and require a session. The tab's membership version
is the maximum `updated_at` of the user's `user_polls` rows (one indexed `MAX`).

## Search tab
Typing a search and pressing Enter switches to the Search tab and replaces its content with the
results; the search box is cleared and the Search tab remains selected. A search is a dynamic
request subject to `ENV_MIN_SEARCH_INTERVAL`, the budget and the search sub-budget. The Refresh
button on the Search tab re-runs the last query through the result cache; **it is a Refresh click,
not a search**, for the per-user floor and the multiplier (`floor:manual`,
`nextRefreshMs = ENV_MIN_MANUAL_REFRESH_INTERVAL × k:refresh`), because that is the control the
user pressed and the floor its disabled state follows — but if it misses the result cache, the
engine query it causes counts against the search sub-budget like any other miss, since the
sub-budget measures engine load, not user intent. Search results are never refreshed
automatically. Behaviour and engine are specified under Home Page Search.

## Live Results tab
The Live Results tab is the only surface that refreshes automatically, and only for signed-in
users.

- Adding a poll requires the same view eligibility as viewing it today (public; private with the
  link; invitation-only only if invited or the creator); the check runs when the poll is added
  and its result is cached with the registration, so refreshes need no further check and an
  ineligible user cannot watch a poll by supplying its id.
- It holds an ordered list of at most `ENV_MAX_LIVE_RESULTS_PER_USER` (default 5) polls.
  Requesting Live Results for a poll already in the list moves it to the top; requesting it for a
  new poll when the list is full removes the least recently added poll. Watching five polls costs
  the same one request per interval as watching one; only the response size grows.
- A refresh of the tab is **one request** for all polls in the list. The response reads each
  poll's content from its projection `poll:<pid>` and its counts from the **live hash
  `cnt:<pid>`**, using `seq` as `counts_version`; it never reads the database. The counts a viewer
  sees are therefore as of the request itself, not as of the last flush.
- The client refreshes at the interval the server last handed it (`nextRefreshMs`), never more
  often than `ENV_MIN_LIVE_REFRESH_INTERVAL` (default 2000 ms). The timer pauses while the page is
  hidden (`document.hidden`) and resumes on focus.
- Every Live Results refresh registers the tab in the **live registry** — `ZADD live:active
  <expiry> <session>`, where `expiry = now + nextRefreshMs + ENV_MAX_IDLE_TIME` and `nextRefreshMs`
  is the interval the response hands that session (the floor × `k:live` at that moment). "One
  interval" is therefore the interval the client was actually told to use, never the bare floor:
  a client stretched to a long interval by the controller is never pruned before its own next
  scheduled refresh. The budget controller prunes entries whose expiry has passed
  (`ZREMRANGEBYSCORE live:active -inf now`) and counts *V* as the entries that remain; a tab whose
  registration has expired is not served, so a page that never answers the idle prompt cannot keep
  refreshing.
- After `ENV_MAX_IDLE_TIME` (default 1800000 ms) without user interaction the client shows a
  prompt, modal for that tab only: "Do you want to continue to receive Live Results updates for
  this poll?" with buttons **Cancel** and **Yes**. **Yes** restarts the timer; **Cancel** closes
  the Live Results tab.

## Refresh rules and the per-kind floors
Every **Vote**, **Search**, **Live Results refresh** and **Refresh button or tab click on a tab
served by an instance** (My PRIVATE POLLS, Favourites, Search, Live Results) is a *dynamic
request*. Each kind has its own per-user minimum interval (a "floor"); a user may make at most one
request of a kind per its floor, enforced client-side (the Refresh button is disabled for its
floor after a refresh) and server-side with the key `floor:<kind>:<session>` (`floor:<kind>:<ip>`
for guests), set with `SET NX PX`. TRENDING is the exception: its interactions are served by the
CDN and bounded there (see TRENDING); its manual floor is client-enforced only, and the signed-in
overlay call a TRENDING render issues is counted as a manual-kind dynamic request.

| Variable | Default (ms) | Applies to |
|---|---|---|
| `ENV_MIN_LIVE_REFRESH_INTERVAL` | 2000 | the automatic refresh of the Live Results tab; independent of the flush interval, so it may be set as low as the budget allows |
| `ENV_MIN_MANUAL_REFRESH_INTERVAL` | 5000 | the Refresh button and tab clicks (server-enforced for instance-served tabs; client-enforced for TRENDING) |
| `ENV_MIN_SEARCH_INTERVAL` | 2000 | a search (Enter in the search box) |
| `ENV_MIN_VOTE_INTERVAL` | 2000 | submitting a vote — the only per-user bound on votes, since the budget never lengthens them |

A dynamic request that arrives early is answered `429` with `Retry-After` and the interval the
client should be using. The `429` is a backstop, not the normal path: **the client holds the last
response for each tab with the time it was received, and a tab click renders that copy
immediately; it sends a refresh request only when the held copy is older than
`ENV_MIN_MANUAL_REFRESH_INTERVAL`, when no copy is held, or when the Refresh button is pressed
after the floor has elapsed.** A user switching between tabs within the floor therefore sees the
copies without any request and never a `429`; a just-switched-to tab may be up to one floor
stale, which is within what tabs that refresh only on click already accept. The floors bound each
user; the budget (see Server Load Budget) bounds the server and lengthens the intervals it hands
out above these floors when load is high. A browser refresh resets the UI to the TRENDING tab and
refreshes no other tab.

## Bookmarks
- A user may hold at most `ENV_MAX_BOOKMARKS_PER_USER` (default 200) bookmarks; the insert checks
  the count and refuses beyond it.
- The **bookmark removal sweep** runs once a day and removes, in batches of 10,000 rows and in one
  statement per batch, every bookmark whose poll is `ARCHIVED`, or has been `CLOSED` for
  `ENV_BOOKMARK_EXPIRY_MONTHS` (default 6) months (`closed_at`), or is `OPEN` and has received no
  vote for that long. For the third rule the reference time is
  `COALESCE(last_vote_at, start_at, created_at)`: a poll that has never received a vote
  (`last_vote_at` is `NULL`, since only the counter flush writes it) leaves bookmark lists six
  months after it opened, or after it was created if it has no `start_at`. Removal is silent. The
  user's own Un-bookmark removes a bookmark immediately.

## Guests
Guests have no automatic refreshing of any kind and no Live Results. They see TRENDING and Search
and may click Refresh subject to the per-IP floors. They see the changes made by others only by
refreshing the page, which is made cheap by the Page Loads section. The IP is the only key
available for a guest, so guests behind one shared address (a campus, an office, a carrier NAT)
are served at a shared rate for Search and Refresh; this is accepted — a guest who signs in gets
their own key, and TRENDING, the guest's main surface, is served by the CDN with no per-IP bound.

# Refresh Protocol: Version-Keyed Deltas
Every refresh of a tab — the personal tabs, Search and Live Results — uses the same protocol, so
that only changed data travels and the client's merge logic is shared. TRENDING uses its
two-object form of the same idea.

- **Request**: the client sends the versions it holds — for each poll in the tab,
  `[content_version, counts_version]`, and the tab's membership version. For a tab of 200 polls
  this is about 4 KB.
- **Response**, computed from the cache without touching PostgreSQL for counters or content: the
  server reads `content_version` from `poll:<pid>` and the **live** `seq` from `cnt:<pid>` for
  each poll in the tab (a pipelined read of ≤ 200 hashes) and compares them with the versions
  the client sent; the row's flushed `counts_version` is never used here. Only a personal tab's
  membership (the `user_polls` query) touches PostgreSQL.
  - `304 Not Modified` when nothing changed;
  - otherwise a body containing, for each poll whose live `seq` moved, its counters only;
    for each poll whose `content_version` moved, its full card; and, when the tab's membership
    changed, the ordered list of poll ids now in the tab (ids the client lacks are then included
    as full cards in the same response).
- Every JSON response is compressed; cached listings are stored pre-compressed so an instance
  never compresses per request.
- Listings return only the fields a card renders; a card's back side is fetched on demand.

# Server Load Budget

## The effective budget
The server processes at most the **effective budget** of dynamic requests per second, site-wide:
`ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND` (default 1250) × the number of live instances,
capped by `ENV_SERVER_MAX_REFRESH_PER_SECOND` (default 15000, the value at 12 instances). Each
instance registers a heartbeat key `instance:<id>` (TTL 30 s) so the count is known to every
instance. A 4-instance fleet therefore hands out intervals for 5,000 requests per second, an
8-instance fleet for 10,000. Every dynamic request increments `budget:<second>`; the observed rate
*R* is the count for the current second.

## The budget controller
The controller runs every `ENV_BUDGET_CONTROLLER_INTERVAL` (default 1000 ms) on one instance
under the sweep lock; the tick must not exceed the smallest floor.

- Three multipliers `k:search`, `k:refresh` and `k:live` (each ≥ 1) are held in the cache. The
  interval handed to a client for a kind is that kind's floor × its multiplier, returned as
  `nextRefreshMs` in **every** response of that kind, whether or not the server is over budget.
- **Raise rule**: while *R* exceeds the effective budget, raise the first multiplier below its
  cap, in the order **Search, then Refresh clicks, then Live Results**. Search and Refresh cap at
  `ENV_MAX_STRETCH` (default 8) × their floor so the loop moves on to the next kind; Live Results
  is uncapped, as the last resort. **Votes are never lengthened.** The search sub-budget raises
  `k:search` by the same rule.
- **Lower rule**: while *R* is below `ENV_BUDGET_LOWER_THRESHOLD_PERCENT` (default 80) of the
  effective budget, lower the multipliers in the reverse order, one step per tick, until each is
  back at 1.
- **Predictive Live Results multiplier.** Live Results is the one kind that can burst ahead of an
  observing controller, because its refreshes are timer-driven at the floor rather than
  click-driven. Each tick the controller prunes expired entries and reads *V* = `ZCARD live:active` and
  computes `k_pred = ceil((V × a / floor_live) / budget_left)`, where `budget_left` is the effective
  budget minus the observed rate of votes, searches and Refresh clicks, and *a* is an activity
  factor — the ratio of Live Results requests observed in the last tick to the number *V* would
  produce at the current interval — which corrects for tabs whose timers are paused because their
  page is hidden. Then `k:live = max(k_pred, k_observed)`; decreases follow the lower rule. When *V*
  rises, `k:live` rises in the same tick, before the new tabs' first refreshes arrive; when *V*
  falls, `k:live` falls without waiting for the lower-rule threshold.

## Search sub-budget
The server processes at most `ENV_SERVER_MAX_SEARCH_PER_SECOND` (default 2000) **search-engine
queries** per second, site-wide, counted in `search-budget:<second>`. A search served from the
result cache does not count (it never reaches the engine); a cache miss does. Every search still
counts against the effective budget and against `ENV_MIN_SEARCH_INTERVAL`. Over the sub-budget,
`k:search` rises exactly as over the effective budget. The sub-budget **does not follow the
fleet**: it is tied to the search cluster's capacity and changes only when the cluster is resized.
When searches are served by PostgreSQL full-text (OpenSearch unset, unreachable or re-indexing) the
sub-budget is `ENV_SERVER_MAX_SEARCH_PER_SECOND_FALLBACK` (default 200), so an engine outage slows
search intervals rather than putting the database that writes the votes at risk.

## Response contract
Every response to a dynamic request carries `nextRefreshMs`: the kind's floor × its multiplier
for searches, Refresh clicks and Live Results refreshes, and the unstretched `ENV_MIN_VOTE_INTERVAL`
for votes. A request that arrives before its interval has elapsed is answered `429` with
`Retry-After` and `nextRefreshMs`. An instance that is
shedding load answers `503` with `Retry-After` (see Per-Instance Load Shedding); the client treats
both the same way — wait, then retry.

# Per-Instance Load Shedding
Each instance bounds its own concurrency so that an overloaded instance sheds load in
milliseconds instead of stalling, failing its health check and cascading its traffic onto the
others.

- An instance sheds a request with `503` and `Retry-After` when its in-flight request count
  exceeds `ENV_INSTANCE_MAX_INFLIGHT` (default 200) or its event-loop lag exceeds
  `ENV_INSTANCE_MAX_EVENT_LOOP_LAG` (default 100 ms). The response body carries `retryAfterMs`
  (`ENV_SHED_RETRY_AFTER`, default 2000 ms) and, for dynamic requests, `nextRefreshMs`; the client
  adds 0–1 s of jitter before retrying.
- Shedding order is the budget's: Search first, then Refresh clicks, then Live Results; **votes
  and the health check are shed last** — votes because they are cheap (validate, increment,
  enqueue) and losing them is what the vote design exists to avoid; the health check because
  shedding is not ill health, and an instance that failed its health check while shedding would be
  pulled by the load balancer, which is the cascade the cap prevents.
- Client behaviour is identical to `429`: a shed vote is kept pending and retried once
  automatically after `Retry-After`; a shed refresh waits for the interval; a shed page load renders
  the stored TRENDING copy.
- **The health check is `GET /healthz`.** It is registered before the shedding middleware and is
  excluded from the in-flight count; it takes no session and touches no dependency other than a
  Valkey `PING` with a short timeout, and it answers `200` even if that `PING` fails, reporting the
  dependency state in the body for the metric rather than in the status code. It answers the one
  question the load balancer should ask — can this process accept traffic? — and never conflates
  that with dependency health, which the budget and shedding already handle; a health check that
  failed on a Valkey blip would pull every instance at once and turn a shed into an outage. The
  App Platform health check in `.do/app.yaml` points at this path.
- The count of shed requests per instance is a metric with an alert policy. The two thresholds
  are set by the load test.

# Voting

## One path for every vote
Every vote follows the same path; there is no separate "under load" path.

1. **Validate synchronously**: session, poll `OPEN`, not banned, invited where the poll requires
   it, and — for a Final-Vote poll — not already voted. On the hot path these are **Valkey reads,
   not database reads**:
   - poll state and mutability from `poll:<pid>`;
   - `SISMEMBER ban:<pid>` and, for an invitation-only poll, `SISMEMBER invite:<pid>` — per-poll
     sets loaded from `poll_bans` / `poll_invitations` on first use (TTL 1 h, refreshed on read)
     and **invalidated by the roster transaction** whenever an administrator changes the roster,
     so a ban or invitation change is visible on the next vote;
   - `SISMEMBER voted:<session>` — the set of pids this session has voted on, **written at enqueue**
     (step 3, before the queue) with the session-cache TTL, refreshed on read, and rebuilt from
     `votes` on a miss. Because it is written at enqueue, a second vote from the same session
     inside the queue's lag window is refused: a queued vote is final from the user's perspective.
   PostgreSQL is consulted only on a cache miss (a poll nobody has voted on recently, or a session
   whose set has expired). A vote that fails validation is refused with the existing messages and
   never queued; a second vote on a Final-Vote poll therefore costs a cache read and never becomes
   a row.
2. **Count**: `HINCRBY cnt:<pid>` for each chosen choice id, `total` and `seq`, and
   `HINCRBY trend:<current bucket> <pid> 1`.
3. **Enqueue**: `XADD` the vote (poll id, email, user name, choice ids, timestamp) to the stream
   `votes`, and `SADD voted:<session> <pid>`.
4. **Respond** with the poll's new `voteCount`, per-choice counts and `counts_version` read from
   `cnt:<pid>`, and a `status`: `"recorded"` when the consumer group's lag is below
   `ENV_VOTE_QUEUE_LAG_NOTICE` (default 2000 ms), `"queued"` when it is above. On `"queued"` the
   client tells the user that their vote is queued and will be processed as soon as possible.
   The response's `nextRefreshMs` is always `ENV_MIN_VOTE_INTERVAL`, unstretched — votes are
   never lengthened by the controller — and the client uses it to time the re-enabling of the
   Vote buttons; a `429` for an early vote carries the remainder of that same floor.

A queued vote has already been validated and counted; it can fail only by system error. A changed
vote on a Dynamic-Vote poll is a vote request like any other and replaces the row on insert.

## Consumer
Every instance runs a consumer in the group `writers`. It reads up to `ENV_VOTE_BATCH_SIZE`
(default 500) entries, inserts them into `votes` in one multi-row statement — `ON CONFLICT
(poll_id, email) DO UPDATE` for Dynamic-Vote polls, `DO NOTHING` for Final-Vote polls, so delivery
may be at-least-once — inserts the matching `vote_history` rows and `user_polls` (`voted`) rows in
the same transaction, and acknowledges the batch. Entries pending longer than the lag notice are
reclaimed from a failed consumer. The stream is trimmed after acknowledgement. On `SIGTERM` an
instance finishes and acknowledges its in-flight batch before exiting (see Deployment).

## Durability
A Valkey node failure loses the entries not yet consumed — of the order of one second of votes
with the consumer lag held under a second and a standby node in place. This is accepted. The
nightly reconcile corrects the counters from `votes`, so a lost entry costs one vote row and never
a permanently wrong tally.

## Abuse resistance
- `ENV_MIN_VOTE_INTERVAL` is per session across **all** polls: at most one vote every 2 s,
  whichever poll it is for. An early vote is answered `429` with `Retry-After`; the client disables
  the Vote buttons for the interval and retries the pending vote after `Retry-After`.
- At most `ENV_MAX_VOTES_PER_IP_PER_MINUTE` (default 600) votes per minute from one IP address
  (`votes-ip:<ip>`), because the per-session floor says nothing about many sessions behind one
  address. The value is deliberately in the **anomaly range**, not the honest range: a client IP
  is a poor proxy for one person — a campus, an office or a mobile carrier's NAT puts hundreds of
  honest users behind one address, and sixty accounts voting together from one address is a
  classroom, whereas six hundred a minute is a script. Crossing the cap raises an alert as well
  as refusing the vote. The tight bound on a script that has obtained many sessions is the
  sign-in rate limit, not this cap.
- Account creation is the outer bound: every session needs a magic-link sign-in, which the
  existing `ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW` and `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW`
  already limit per client.
- Honest bursts (a viral poll) are absorbed by the queue up to the drain ceiling; above it voters
  see "queued", never a refusal.

# Home Page Search

## Scope
The home search covers polls with `pollVisibility = "Public Poll"` and `pollState ∈ {OPEN, CLOSED,
WAITING TO OPEN}`, plus Public polls in `EDITING` whose `pollStateBeforeEditUpdate` is in that set.
Invitation-only polls are never in scope. The rule is written once, as a generated column:

```sql
home_listable boolean GENERATED ALWAYS AS (
  poll_visibility = 'Public Poll' AND (
    poll_state IN ('OPEN','CLOSED','WAITING TO OPEN') OR
    (poll_state = 'EDITING' AND poll_state_before_edit_update IN ('OPEN','CLOSED','WAITING TO OPEN'))
  )) STORED;
```

## `searchText`
`searchText` combines `title`, `subtitle`, the choice labels and `keywords` (a future field, empty
until then). It is a pure function of the poll, recomputed on every save by one code path, and is
the source of both engines' indexes. In PostgreSQL it is the generated column
`search tsvector` with weights A (title), B (subtitle), C (choices), D (keywords).

## Behaviour
- Input is free text with no grammar; any input is accepted.
- Words are ANDed. If fewer than the cap match, the words are OR'd and the ranked results appended;
  if still fewer, a typo-tolerant pass is appended. Rows are de-duplicated across passes and a pass
  runs only when needed.
- Best match first: text relevance with title > subtitle > choices > keywords, then `voteCount`
  descending, then `createdAt` descending.
- At most `ENV_MAX_POLLS_SEARCH_RESULTS` (default 200) results; the query fetches one more row than
  the cap and the response carries `truncated: true` when it exists. No total count is computed.
- Result cards have no Vote button; they carry Bookmark and Live Results buttons (a signed-in
  user acts on a result by bookmarking it or adding it to the Live Results tab); they are never
  refreshed.

## Result cache
- The cache is in Valkey, so every instance shares hits. The key is the normalised query text
  (trimmed, whitespace collapsed, lower-cased) together with the scope; the value is the complete,
  compressed response (cards, order, `truncated` flag).
- A cached response is served for `ENV_SEARCH_CACHE_TTL` (default 10000 ms) and then expires;
  nothing invalidates it earlier. The counts on a result card may be up to `ENV_SEARCH_CACHE_TTL`
  plus `ENV_OUTBOX_DRAIN_INTERVAL` old; this is accepted.
- A cache hit never reaches the engine and does not count against the search sub-budget; it still
  counts against the effective budget and `ENV_MIN_SEARCH_INTERVAL`.

## Engines
Retrieval is behind one interface, `search(scope, text, limit)`, with two implementations selected
by configuration:

- **OpenSearch** (production; `ENV_OPENSEARCH_URL` set): BM25 relevance with field boosts for the
  weight order, `fuzziness: AUTO` for the typo pass, `minimum_should_match: 100%` then a relaxed
  query for the AND → OR fallback, and `function_score` for the `voteCount` and `createdAt`
  tie-breaks. The index holds the home-scope polls only.
- **PostgreSQL full-text** (development, tests, and the fallback whenever OpenSearch is unset,
  unreachable or re-indexing): `websearch_to_tsquery` over the `search` column under the partial
  index `WHERE home_listable`; the OR pass with `to_tsquery` terms joined by `|`; the typo pass with
  `pg_trgm` similarity on `title` (query of three or more characters); `ts_rank_cd` with the
  A/B/C/D weights; the common-word case bounded by ranking the 5,000 newest matches. While this
  engine serves, the fallback sub-budget applies.

## Keeping the engine in sync
`search_outbox (poll_id, version, reason)` is upserted in the same transaction as any change to a
searchable field, state or visibility, and by the counter flush. The **outbox sweep** drains it
every `ENV_OUTBOX_DRAIN_INTERVAL` (default 15000 ms) in batches, coalesced per poll, building each
document with the same function that computes `searchText`; `reason = 'counters'` sends numbers
only. A new or edited poll is searchable within one drain interval; a trending poll re-indexes at
most once per drain. A full re-index is "insert every poll id into the outbox".

# Admin Page Search
The `/admin` page gains a search form: a free-text box and structured controls, combined with AND;
blank controls are ignored; results sorted by `createdAt` descending and capped at
`ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS` (default 200) with the same `truncated` flag and no count.

Controls and their predicates:

| Control | Predicate |
|---|---|
| free text | `search @@ websearch_to_tsquery('english', $text)` — AND only, no ranking, over every poll (no scope restriction) |
| `pollState` dropdown: INITIALIZED, EDITING, AWAITING APPROVAL, REJECTED, WAITING TO OPEN, OPEN, CLOSED, ARCHIVED | `poll_state = $state` |
| `pollVisibility` dropdown: Public Poll, Private Poll | `poll_visibility = $visibility` |
| `choiceMode` dropdown: Single-Choice Poll, Multiple-Choice Poll | `choice_mode = $mode` |
| `voteMutability` dropdown: Final-Vote Poll, Dynamic-Vote Poll | `vote_mutability = $mutability` |
| `createdByName` textbox | `created_by_name ILIKE '%' || $text || '%'` — case-insensitive contains; admin only |
| `createdAt`, `startAt`, `endAt`: operator `>=`, `<=`, `=` and a `YYYY-MM-DD` day | the day is interpreted in the administrator's browser time zone, which the browser sends as an IANA zone name; the server converts it to a UTC `[from, to)` window in Node (`>=` from 00:00 of the day, `<=` through its end, `=` the day itself); a `NULL` `startAt` / `endAt` never matches |
| `voteCount`, `invitedVoterCount`, `bannedVoterCount`: operator `>=`, `<=`, `=` and a positive integer | the operator applied to the flushed column value |

Indexes: `GIN (search)`; `btree (poll_state, created_at DESC)`, `btree (poll_visibility,
created_at DESC)`, `btree (choice_mode, created_at DESC)`, `btree (vote_mutability, created_at
DESC)`; `GIN (created_by_name gin_trgm_ops)`; `btree (created_at DESC, id DESC)`, `btree
(start_at)`, `btree (end_at)`; `btree (vote_count)`, `btree (invited_count)`, `btree
(banned_count)`.

The admin page keeps its `ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL` list refresh and its edit
heartbeat; the 014 rule that a card in `Edit` mode is exempt from the refresh is unchanged.

# Page Loads and Browser Refresh
A browser Refresh cannot be prevented and must never be answered with an error page. Instead a
page load is made almost free, and only the part that is not free is limited:

1. Static assets use fingerprinted filenames served with `Cache-Control: public,
   max-age=31536000, immutable`; the HTML carries an `ETag`. They are served by App Platform's
   static component or by Spaces + CDN, not by an application instance.
2. TRENDING is fetched from the CDN as the two objects described under TRENDING; a browser
   Refresh therefore costs one small conditional request for `trending-counts.json`.
3. The page keeps its last TRENDING objects and their versions in `sessionStorage`; on load, if the
   copy is younger than the recompute interval it renders immediately and sends only a conditional
   request (`If-None-Match`).
4. `/api/config` is served with `Cache-Control: max-age=300`. `/api/me` is the only per-user call
   on a page load for a guest and is answered from the session cache; for a signed-in user the
   overlay for the visible TRENDING polls is the one other per-user request on a page load.
5. `/api/me` and any listing not served from the CDN are subject to a per-client page-load limit
   of `ENV_PAGE_LOADS_PER_MINUTE`, keyed `pageload:<session>` for a signed-in user and
   `pageload:<ip>` only for guests. The default is **120** — generous because the IP key is shared
   by every guest behind one address, and because the cost of being wrong is a notice, not a
   lockout: over the limit the API answers `429` with `Retry-After`; the page renders its stored
   copy with a "you are refreshing too quickly" notice and never a broken page.

# Deployment and Scaling

## Production (at the load target)
| Component | Specification |
|---|---|
| App Platform | dedicated-CPU instances of 1 vCPU / 2 GiB, **autoscaling between 4 and 12 on 70% average CPU utilisation** (8 at the load target); settings in `.do/app.yaml`, not `ENV_` variables |
| Managed Valkey | 2 GiB with a standby node — the queue puts Valkey on the write path, and the standby is what bounds the loss window to about one second |
| Managed PostgreSQL | 16 GB / 8 vCPU (a standby node for high availability is recommended); the application uses the managed connection pool; a read-only replica is the next step if the personal-tab queries outgrow the primary |
| Managed OpenSearch | 3 nodes × 4 GiB, sized to the search sub-budget of 2,000 engine queries per second (3 × 8 GiB at 5,000) |
| Spaces + CDN | one bucket for the TRENDING objects (and future topic listings) and, if used, the static assets |

Estimated monthly cost at list prices (verify before budgeting): App Platform ≈ $117–155
(4 instances all month plus peak instance-hours), PostgreSQL $240–480, OpenSearch $114, Valkey
$60, Spaces $5, egress ≈ $300–600 with the delta protocol and the CDN — about **$850–1,400 per
month**, against about $14,000–16,000 for the current refresh model at the same concurrency. At
low load the fleet sits at 4 instances for ≈ $100–116.

## How the architecture scales
- The fleet is **stateless**: every shared state is in Valkey or PostgreSQL, sweeps run under
  advisory locks, and the consumer joins its group on start, so instances are added or removed
  without coordination. This is what allows CPU-based autoscaling to work in both directions; a
  design holding open connections per viewer would neither autoscale on CPU nor scale down while
  viewers stayed connected.
- **Graceful shutdown**: on `SIGTERM` an instance stops accepting new requests, finishes and
  acknowledges its in-flight vote batch, and exits. The App Platform termination grace period is
  **30 s** in `.do/app.yaml` — a 500-row batch completes in well under a second, so the period
  leaves ample margin.
- **Connection arithmetic**: 12 instances × 20 pooled connections plus the sweeps ≈ 260, within
  the 397 connections of the 16 GB node, and through the managed pool in any case.
- **Three load bounds interlock**: per-instance shedding reacts in milliseconds, the budget
  controller in seconds (and raises its budget as instances join), autoscaling in minutes. A
  surge costs freshness, never errors.
- The most frequent request (TRENDING, and every browser Refresh) is served by the CDN and never
  reaches an instance.
- Growth beyond the load target is a matter of raising the instance maximum, the per-instance
  budget, the search sub-budget and the managed node sizes — not of changing the architecture.

## Development
One instance (or `npm run dev`), no autoscaling; Managed PostgreSQL 1 GB ($15) or a local
PostgreSQL; the in-process cache and queue (`ENV_VALKEY_URL` unset); PostgreSQL full-text search
with the fallback sub-budget (`ENV_OPENSEARCH_URL` unset); TRENDING served from the instance cache
(`ENV_SPACES_BUCKET` unset). A single-node OpenSearch ($19) is optional for parity.

## Environment variables
Removed: `ENV_MONGODB_NAME`, `ENV_MONGODB_URI`, and `ENV_POLLING_INTERVAL` (retired — no
voter-facing page polls on it once Live Results uses `ENV_MIN_LIVE_REFRESH_INTERVAL`).
`ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL`, `ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL`, the
`ENV_EMAIL_RATE_LIMIT_*` variables and every other existing variable are retained.

| Variable | Default | Meaning |
|---|---|---|
| `ENV_DATABASE_URL` | `postgres://localhost:5432/app01` | PostgreSQL connection string (the managed pool's URL in production) |
| `ENV_VALKEY_URL` | unset | Valkey connection string; unset selects the in-process cache and queue |
| `ENV_OPENSEARCH_URL` | unset | OpenSearch endpoint; unset selects PostgreSQL full-text search |
| `ENV_SPACES_BUCKET`, `ENV_SPACES_REGION`, `ENV_SPACES_KEY`, `ENV_SPACES_SECRET`, `ENV_SPACES_CDN_URL` | unset | Where the TRENDING objects and static assets are published; unset serves them from the instance |
| `ENV_SESSION_CACHE_TTL` | `300000` | Session cache-aside lifetime (ms) |
| `ENV_MAX_POLLS_SEARCH_RESULTS` | `200` | Cap on home search results and on each personal tab |
| `ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS` | `200` | Cap on admin search results |
| `ENV_MAX_TRENDING_POLLS` | `200` | Polls in TRENDING |
| `ENV_TRENDING_POLLS_RECOMPUTE_INTERVAL` | `60000` | TRENDING recompute and publish interval (ms); also the CDN `max-age` and the client-copy lifetime |
| `ENV_MIN_LIVE_REFRESH_INTERVAL` | `2000` | Floor for the automatic Live Results refresh (ms) |
| `ENV_MIN_MANUAL_REFRESH_INTERVAL` | `5000` | Floor for the Refresh button and tab clicks (ms) |
| `ENV_MIN_SEARCH_INTERVAL` | `2000` | Floor for searches (ms) |
| `ENV_MIN_VOTE_INTERVAL` | `2000` | Floor for votes, per session across all polls (ms) |
| `ENV_MAX_VOTES_PER_IP_PER_MINUTE` | `600` | Per-IP vote cap, set in the anomaly range (shared addresses); crossing it alerts |
| `ENV_MAX_LIVE_RESULTS_PER_USER` | `5` | Polls in a user's Live Results tab |
| `ENV_MAX_IDLE_TIME` | `1800000` | Live Results idle time before the prompt (ms); a registry entry expires at its last refresh plus the interval handed to it plus this |
| `ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND` | `1250` | Dynamic-request budget per live instance |
| `ENV_SERVER_MAX_REFRESH_PER_SECOND` | `15000` | Cap on the effective budget (the value at 12 instances) |
| `ENV_SERVER_MAX_SEARCH_PER_SECOND` | `2000` | Search-engine query sub-budget (does not follow the fleet) |
| `ENV_SERVER_MAX_SEARCH_PER_SECOND_FALLBACK` | `200` | Sub-budget while PostgreSQL full-text serves searches |
| `ENV_BUDGET_CONTROLLER_INTERVAL` | `1000` | Controller tick (ms); ≤ the smallest floor |
| `ENV_MAX_STRETCH` | `8` | Cap on the Search and Refresh multipliers, as a multiple of the floor |
| `ENV_BUDGET_LOWER_THRESHOLD_PERCENT` | `80` | Budget utilisation below which multipliers are lowered |
| `ENV_INSTANCE_MAX_INFLIGHT` | `200` | In-flight requests above which an instance sheds |
| `ENV_INSTANCE_MAX_EVENT_LOOP_LAG` | `100` | Event-loop lag (ms) above which an instance sheds |
| `ENV_SHED_RETRY_AFTER` | `2000` | `Retry-After` handed out when shedding (ms) |
| `ENV_COUNTER_FLUSH_INTERVAL` | `2000` | Counter flush interval (ms); independent of the Live Results floor |
| `ENV_VOTE_BATCH_SIZE` | `500` | Rows per consumer batch |
| `ENV_VOTE_QUEUE_LAG_NOTICE` | `2000` | Consumer lag above which a vote response says "queued" (ms) |
| `ENV_SEARCH_CACHE_TTL` | `10000` | Lifetime of a cached search response (ms) |
| `ENV_OUTBOX_DRAIN_INTERVAL` | `15000` | Search outbox drain interval (ms) |
| `ENV_MAX_BOOKMARKS_PER_USER` | `200` | Bookmark cap |
| `ENV_BOOKMARK_EXPIRY_MONTHS` | `6` | Bookmark removal age |
| `ENV_PAGE_LOADS_PER_MINUTE` | `120` | Page-load limit, keyed by session for signed-in users and by IP only for guests |

Each new variable is added to `.vscode/launch.json.example`, `devScripts.example/launch-dev.ps1`,
`src/config.ts` and the CLAUDE.md table, following the project's env-var checklist. The
autoscaling settings (instance size, minimum, maximum, CPU target) live in `.do/app.yaml`.

# Testing and Deliverables
- The Vitest suite runs on `embedded-postgres` and the in-process cache and queue; no Docker, no
  MongoDB. An integration test exercises the Valkey client and skips when `ENV_VALKEY_URL` is unset.
- An `EXPLAIN` test runs every admin filter combination and every home listing with
  `enable_seqscan = off` and fails on any `Seq Scan` of `polls`.
- Unit tests cover: the budget controller (the three multipliers, their order, caps and lowering;
  the effective budget following the instance count; the predictive `k:live` from the registry
  and the activity factor); the per-kind floors and the per-IP vote cap; the search sub-budget and
  its fallback; per-instance shedding and its order; the counter flush and the `seq`-based
  `counts_version`; the trending computation from buckets and the two-object publish (the counts
  object every recompute, the full object only when the set of ids changes); the bookmark removal
  statement; the consumer's idempotent batch insert and graceful shutdown; the version-keyed delta
  (a refresh with current versions is a `304`; a moved `counts_version` returns counters only; a
  moved `content_version` returns the card; a membership change returns the id list); and the
  `nextRefreshMs` / `429` / `503` contracts.
- A test asserts that the counters and `counts_version` in a poll row are written only by the
  flush and the reconcile, and that a Live Results response never reads the database.
- A test asserts that the session helper's `endSession` is the sole caller of BetterAuth's
  sign-out, and that a cached session is never served past its own expiry.
- A test drives the cache interface into a disconnected state and asserts that dynamic requests
  are answered `503` with `Retry-After` within the call timeout, that `/healthz` still answers
  `200`, that the consumer and sweeps pause and resume, and that no path falls back to PostgreSQL
  for floors, budgets, counters or the vote write.
- `devScripts/populate/` gains a 250,000-poll generator with a realistic vote skew so that
  trending, `user_polls` and the flush are exercised at shape.
- A load-test script drives (a) dynamic requests at the effective budget against a deployed fleet,
  to confirm the controller converges, the fleet holds its budget and the shedding thresholds are
  right; (b) votes against one poll, to measure consumer lag and the batch-insert ceiling; (c) a
  Live Results surge, to confirm the predictive multiplier prevents a `503` transient; (d) a
  page-load storm against the Page Loads requirements. Its results fix the shedding thresholds
  and confirm the CPU target.
- `postman/openapi.json` is updated for every changed and new endpoint, including the delta
  request and response shapes and the `nextRefreshMs`, `retryAfterMs`, `status` and `truncated`
  fields.
- `launch.json.example`, `devScripts.example/launch-dev.ps1`, `.do/app.yaml` and the CLAUDE.md
  environment table are updated for the new and removed variables, the autoscaling settings, the
  `/healthz` health check and the 30 s termination grace period.

# Success Criteria
- With 250,000 seeded polls, no request on the home page, the search or the admin search performs
  a sequential scan of `polls` (the `EXPLAIN` test passes), and a home search returns in under
  150 ms warm on PostgreSQL full-text and under 20 ms on OpenSearch.
- A browser Refresh reaches an application instance with at most one request (`/api/me`); a
  TRENDING interaction with a current membership version fetches only `trending-counts.json`, and
  `trending.json` is republished only when the set of ids changes — never on a reorder alone.
- A tab refresh in which nothing changed is a `304`; one in which only counters changed carries no
  card content.
- A Live Results response reflects a vote counted in `cnt:<pid>` on the very next refresh,
  regardless of `ENV_COUNTER_FLUSH_INTERVAL`, and never queries PostgreSQL.
- With dynamic requests driven above the effective budget, the Search interval rises first, then
  Refresh, then Live Results; votes continue to be accepted; the processed rate stays at the
  budget; all intervals return to the floors within a few ticks of the load ending. Adding an
  instance raises the effective budget within one heartbeat.
- Opening a large number of Live Results tabs within a minute raises `k:live` before their first
  refreshes arrive; no `503` transient is observed at the surge start.
- With votes driven above the consumer's drain rate, no vote is refused for load, every response
  carries the counts, the `status` becomes `"queued"` once the lag exceeds the notice threshold,
  and the counters in `polls` equal the row counts in `votes` after the nightly reconcile.
- A session cannot vote more than once per `ENV_MIN_VOTE_INTERVAL` across all polls; an IP cannot
  exceed `ENV_MAX_VOTES_PER_IP_PER_MINUTE`; a second vote on a Final-Vote poll never becomes a
  queue entry.
- A user cannot hold more than `ENV_MAX_LIVE_RESULTS_PER_USER` polls in the Live Results tab,
  cannot refresh faster than the assigned interval, and stops being served when the registry
  entry expires.
- An instance driven beyond `ENV_INSTANCE_MAX_INFLIGHT` answers `503` with `Retry-After` within
  milliseconds, keeps passing its health check, and sheds searches before Live Results and Live
  Results before votes.
- Each sweep runs exactly once per tick across any number of instances; an instance removed by
  autoscaling acknowledges its in-flight vote batch before exiting.

# Assumptions
- The vote rate is unbounded by design; the recommended PostgreSQL node drains about 20,000
  votes per second sustained, and the queue and the "queued" notice cover bursts above it.
- Search, Live Results and Refresh rates are bounded by the budgets and need no separate estimate.
- A loss window of about one second of queued votes during a rare Valkey failure is acceptable.
- Prices are DigitalOcean list prices as of September 2026 and are verified before budgeting; the
  totals above are order-of-magnitude, not commitments.
- The shedding thresholds, the per-instance request rate behind the budget default, the CPU
  target and the search-cache hit rate are engineering estimates fixed by the load test.
- The open-connection ceiling of one App Platform instance is not needed by this design, which
  holds no long-lived connections.

# Exclusions
- **No data migration.** The application has no real users; MongoDB is removed and every
  collection with it, including the authentication collections. Accounts are re-created on
  PostgreSQL. Nothing is converted or copied.
- **No push transport for live data.** Server-Sent Events per poll, fed by Valkey pub/sub, is the
  documented upgrade for Live Results if a larger live population at the floor interval is ever
  required; WebSockets are not needed by any surface; neither is built now. The version-keyed
  delta protocol is the payload either would carry, so adding one later changes the transport,
  not the data.
- **No Web Push notifications.** They are unsuitable for live counts (one third-party request per
  subscriber per update, permission-gated, not guaranteed) and are reserved for a future
  requirement covering rare per-user events such as "your poll closed" or "you were invited".
- **No semantic or vector search**, and **no third-party search or queue service** (Algolia,
  Meilisearch Cloud, Typesense Cloud, RabbitMQ, Kafka): the requirements are met by DigitalOcean
  managed products at a fraction of the cost.
- **No edge rate limiting outside DigitalOcean** (for example a Cloudflare rule in front of the
  app); the Page Loads requirements make it unnecessary.
- **No topics.** Clickable topics (Sport, Politics, …) and their database changes will be
  specified in the future; the TRENDING mechanism is designed so that each topic can later be one
  more pair of CDN-served objects.
- **No UI/UX design** of the tabbed home page; a later requirement covers it.
- **No total match counts** on either search.
- **`ENV_POLLING_INTERVAL` is retired**; the admin page's own refresh variables stay.
- **The standalone poll page and the single-poll view are retired**; Live Results replaces them,
  and any link, control or route that led to them is removed or redirected to the home page.
  Every other existing feature this document does not mention — the admin poll editor and its
  edit lock, screening and the schedule sweep, rosters, the profile page, the result exports — is
  preserved with unchanged behaviour on the new data store.
