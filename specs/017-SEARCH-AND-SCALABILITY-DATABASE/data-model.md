# Data Model: Search and Scalability Database

**Phase 1 output** for `specs/017-SEARCH-AND-SCALABILITY-DATABASE/plan.md`. Tables live in
PostgreSQL (Kysely `Database` interface in `src/db/schema.ts`, DDL in `src/db/migrations/`);
transient and shared state lives in Valkey (or the in-process cache in development and tests).
Types are PostgreSQL types; `text` enumerations keep today's verbatim values.

## Tables

### `polls`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | today's `pid` |
| `title`, `subtitle` | text | |
| `choices` | jsonb | edited as a unit; capped by `ENV_MAX_CHOICES` |
| `choice_labels` | text | written on every save; feeds `search` |
| `keywords` | text NOT NULL DEFAULT '' | future field; indexed from day one |
| `search` | tsvector GENERATED ALWAYS AS (weights A title, B subtitle, C choice_labels, D keywords) STORED | |
| `home_listable` | boolean GENERATED ALWAYS AS (visibility = 'Public Poll' AND (state IN ('OPEN','CLOSED','WAITING TO OPEN') OR (state = 'EDITING' AND state_before_edit IN ('OPEN','CLOSED','WAITING TO OPEN')))) STORED | the only place the home scope is written |
| `poll_state`, `poll_state_before_edit_update` | text | 011/014 states incl. AWAITING APPROVAL |
| `poll_visibility` | text | 'Public Poll' \| 'Private Poll' |
| `poll_sharing_mode`, `vote_anonymity` | text | 016 |
| `choice_mode`, `vote_mutability` | text | |
| `voter_count_limit` | integer NULL | |
| `created_by_id` | text | new; `btree (created_by_id)` for the rename fan-out |
| `created_by_name` | text | copied at creation; updated by the profile route's rename transaction |
| `created_at`, `start_at`, `end_at` | timestamptz (nullable for start/end) | |
| `closed_at` | timestamptz NULL | set on the transition to CLOSED |
| `last_vote_at` | timestamptz NULL | written by the flush only |
| `vote_count`, `invited_count`, `banned_count` | integer NOT NULL DEFAULT 0 | vote_count by the flush/reconcile only; the other two by the roster transaction |
| `choice_counts` | jsonb NOT NULL DEFAULT '{}' | `{ choiceId: count }`; flush/reconcile only |
| `content_version` | bigint NOT NULL DEFAULT 1 | bumped by any state/content change (helper) |
| `counts_version` | bigint NOT NULL DEFAULT 0 | = `seq` at the last flush; never read by a client-facing path |
| edit-lock and screening columns | as today (014/012) | `pollEditUpdate*`, `pollApproval*`, `pollAcceptabilityScreeningAttempts`, `pollRejectionReason` |

**Indexes**: `polls_home_search GIN (search) WHERE home_listable`; `polls_home_newest
(created_at DESC, id DESC) WHERE home_listable`; `GIN (search)`; `(poll_state, created_at DESC)`;
`(poll_visibility, created_at DESC)`; `(choice_mode, created_at DESC)`; `(vote_mutability,
created_at DESC)`; `GIN (created_by_name gin_trgm_ops)`; `GIN (title gin_trgm_ops)` (typo pass);
`(created_at DESC, id DESC)`; `(start_at)`; `(end_at)`; `(vote_count)`; `(invited_count)`;
`(banned_count)`; `(created_by_id)`.

**Write ownership** (asserted by `counters-flush.test.ts`): `choice_counts`, `vote_count`,
`last_vote_at`, `counts_version` ← flush sweep and nightly reconcile only; `invited_count`,
`banned_count` ← roster transaction; `content_version` ← `bumpContentVersion` from every
state/content write, including the creator-rename transaction; `created_by_name` ← poll insert
and the rename transaction.

### `votes`

| Column | Type | Notes |
|---|---|---|
| `poll_id`, `email` | text, PK (poll_id, email) | one row per participant per poll |
| `user_name` | text | |
| `choice_ids` | text[] | |
| `voted_at` | timestamptz | |

Written only by the queue consumer in batches: `ON CONFLICT (poll_id, email) DO UPDATE` for
Dynamic-Vote polls, `DO NOTHING` for Final-Vote polls.

### `vote_history` — `PARTITION BY RANGE (voted_at)`, monthly partitions created by the schedule
sweep one month ahead. Columns: `id bigserial`, `poll_id`, `email`, `user_name`, `choice_ids`,
`voted_at`. Index `(poll_id, voted_at)` per partition. Append-only, written in the consumer's batch.

### `poll_invitations`, `poll_bans` — `(poll_id, email)` PK each. Written by the roster
transaction, which also updates `invited_count` / `banned_count`, bumps `content_version`, and
deletes `invite:<pid>` / `ban:<pid>` in the cache.

### `bookmarks`

| Column | Type | Notes |
|---|---|---|
| `email`, `poll_id` | text, PK (email, poll_id) | |
| `created_at` | timestamptz | |

Index `(poll_id)` for the removal sweep. Insert refused when `COUNT(*) WHERE email = $me` ≥
`ENV_MAX_BOOKMARKS_PER_USER`. Removal sweep (daily, advisory-locked, batches of 10,000):
`poll_state = 'ARCHIVED'`, or `poll_state = 'CLOSED' AND closed_at < now() - interval '<months>
months'`, or `poll_state = 'OPEN' AND COALESCE(last_vote_at, start_at, created_at) < now() -
interval '<months> months'`.

### `user_polls`

| Column | Type | Notes |
|---|---|---|
| `email`, `poll_id`, `relation` | text, PK (email, poll_id, relation) | relation ∈ created \| invited \| voted \| bookmarked |
| `updated_at` | timestamptz | |

Index `(email, updated_at DESC)`. Written in the same transaction as the source row: the poll
insert (`created`), the invitation insert (`invited`), the bookmark insert (`bookmarked`), the
consumer's vote batch (`voted`). Queries: My PRIVATE POLLS — `email = $me` joined to `polls WHERE
poll_visibility = 'Private Poll'`; Favourites — `email = $me AND relation IN
('created','voted','bookmarked')` joined to `polls WHERE poll_visibility = 'Public Poll'`; both
`ORDER BY updated_at DESC LIMIT cap`; membership version = `MAX(updated_at)`. Overlay —
`WHERE email = $me AND poll_id = ANY($pids)`.

### `search_outbox`

| Column | Type | Notes |
|---|---|---|
| `poll_id` | text PK | coalesced per poll |
| `version` | bigint | the `content_version` or `seq` that caused the upsert |
| `reason` | text | 'content' \| 'counters' |

Upserted by `bumpContentVersion` and by the flush; drained every `ENV_OUTBOX_DRAIN_INTERVAL` in
batches; a full re-index is "insert every home-listable id".

### Auth tables — generated by `@better-auth/cli generate` (`user`, `session`, `account`,
`verification`, `email_change_requests` as today), plus `UNIQUE INDEX ON "user"
(lower(user_name))`.

## Valkey keys

| Key | Type | Written by | Read by | Expiry |
|---|---|---|---|---|
| `sess:<sha256(token)>` | string (JSON session + expiresAt) | session cache-aside; deleted by `endSession` | every request | `ENV_SESSION_CACHE_TTL`, never past `expiresAt` |
| `floor:<kind>:<session\|ip>` | string | `SET NX PX` on the winning request | next request of that kind | that kind's floor |
| `votes-ip:<ip>` | counter | vote path | vote path | 60 s |
| `pageload:<session\|ip>` | counter | page-load bucket | `/api/me`, non-CDN listings | 60 s |
| `budget:<sec>`, `search-budget:<sec>` | counters | every dynamic request / engine query | controller | 10 s |
| `k:search`, `k:refresh`, `k:live` | integers ≥ 1 | controller | every dynamic response | none |
| `instance:<id>` | string | each instance every 10 s | controller (effective budget) | 30 s |
| `live:active` | sorted set, score = expiry | live refresh (`ZADD`); eligibility checked on add | controller (`ZREMRANGEBYSCORE`, `ZCARD`); live endpoint | pruned by score |
| `live:<session>` | hash pid → eligibility | add-to-live | live refresh | idle + interval |
| `cnt:<pid>` | hash `{ <choiceId>: n, total: n, seq: n }` | vote path | Live Results, deltas, vote response, flush | none |
| `dirty:<epoch>` | set of pids | vote path | flush | swapped per flush |
| `trend:<bucket>` | hash pid → n | vote path | trending sweep | 65 min |
| `ban:<pid>`, `invite:<pid>` | sets | loaded on first use; deleted by the roster transaction | vote validation | 1 h, refreshed on read |
| `voted:<session>` | set of pids | vote path at enqueue; rebuilt from `votes` on a miss | vote validation | session TTL, refreshed on read |
| `listing:trending` | bytes + version + membership hash | trending sweep | instance-served TRENDING | recompute interval |
| `poll:<pid>` | JSON content projection + `content_version` | `bumpContentVersion`; first read | Live Results, deltas | refreshed on content change |
| `search:<sha256(normalised query + scope)>` | bytes | search miss | search hit | `ENV_SEARCH_CACHE_TTL` |
| `queue:lag` | number (ms) | consumer, once a second | vote response `status` | 5 s |
| `lock:<name>` | string | single-flight listing rebuilds | — | seconds |
| stream `votes`, group `writers` | stream | vote path (`XADD`) | consumers (`XREADGROUP`, `XACK`, `XAUTOCLAIM`) | `XTRIM` after ack |

## Versions and what compares them

| Value | Where it lives | Changed by | Compared by |
|---|---|---|---|
| `content_version` | `polls` row and `poll:<pid>` | any state/content write (helper) | tab deltas, Live Results, `trending.json` |
| `seq` (live counts version) | `cnt:<pid>` | every vote | tab deltas, Live Results, vote response, `trending-counts.json` |
| `counts_version` (row) | `polls` row | the flush (= `seq` at flush) | nobody client-facing; the search index and admin filters read the row |
| membership version (personal tab) | computed | `MAX(user_polls.updated_at)` for the user | tab deltas |
| membership version (TRENDING) | `listing:trending`, both objects | trending sweep = `sha256(sorted ids)` | the client's decision to fetch `trending.json` |

## Lifecycle notes

- Poll states and transitions are unchanged (011/014/016). New side effects: OPEN → CLOSED sets
  `closed_at`; every transition bumps `content_version` and the outbox; a public poll entering
  EDITING from OPEN stays in TRENDING and the home scope.
- A vote's lifecycle: validated → counted in `cnt:<pid>` → `XADD` → (consumer) row insert +
  history + `user_polls` → `XACK`. `status` = recorded while `queue:lag` <
  `ENV_VOTE_QUEUE_LAG_NOTICE`, else queued.
- A live registration: created on add (eligibility checked, cached in `live:<session>`);
  refreshed on each refresh with expiry = now + `nextRefreshMs` + `ENV_MAX_IDLE_TIME`; pruned by
  the controller.
- A session: cached on first lookup; ended only by `endSession`; never served past its own
  expiry.

## Removed

The Mongo collections `polls`, `voteHistory` and the auth collections, the `mongodb` driver, the
`mongodbAdapter`, `mongodb-memory-server`, and the `?PID=` standalone poll view's data path.
Nothing is migrated.
