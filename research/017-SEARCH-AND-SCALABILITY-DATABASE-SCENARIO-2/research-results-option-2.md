# Research: 017 — Search and Scalability Datastore (Option 2)

**Source**: `research/017-SEARCH-AND-SCALABILITY-DATABASE-SCENARIO-2/017-research-requirements-SEARCH-AND-SCALABILITY-DATABASE-SCENARIO-2.md`
**Status**: complete. **No clarifications are outstanding.** The document fixes every input the
sizing depends on and has adopted, by name, each recommendation this research made in earlier
iterations — per-kind floors, the fleet-following budget and its controller with a predictive
Live Results multiplier, the search sub-budget, per-instance load shedding, CPU autoscaling, the
session cache-aside, the two-object TRENDING publication, live-counter reads for Live Results,
the vote queue and its abuse bounds, and the low-load defaults. This revision restates the
research against those decisions so that the three documents — requirements, research and
high-level requirements — agree on every number.

Prices are DigitalOcean list prices and vendor list prices as of September 2026, monthly, USD;
verify on the vendor pages before budgeting (links in §12).

---

## 1. Clarifications Resolved — and the traffic scenarios used

Every clarification raised in earlier iterations is answered in the document. Two of its answers
are deliberately *not numbers*, and the research treats them as follows:

| Input | What the document says | How this research uses it |
|---|---|---|
| Vote rate | "No limit" — votes are queued and flushed to the database in batches; a loss window of about one second on a rare queue failure is acceptable; eligibility is checked before a vote is queued, so a queued vote fails only by system error; the response carries the new counts; votes are never lengthened by the budget and are bounded per session (2 s) and per IP (60/min) | The vote path is designed with **no rate assumption**: its capacity is the queue's drain rate, stated in §6.10 (≈ 20,000 votes/s sustained on the recommended node; a backlog and the "queued" notice beyond). Votes still *count* against the budget, so the tables in §6.4 show three **vote-rate scenarios** — 1,000, 2,500 and 5,000 votes/s — to display the sensitivity, not as assumptions the design needs |
| Search, Live Results and Refresh rates | Bounded by the effective budget (`ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND` × live instances, capped at 15,000), lengthened when over budget in the order Search → Refresh → Live Results; searches additionally bounded by the sub-budget (2,000 engine queries/s) | The server's dynamic load is a configuration value that follows the fleet; the search engine is sized to the sub-budget; the tables use 1,700 searches/s and 300 Refresh clicks/s before stretching as the scenario |

---

## 2. What the requirements demand

| Requirement | Technical consequence |
|---|---|
| 250,000 polls; the home page no longer lists all polls; tabs and a search replace it | Every listing is capped and index-driven; nothing reads the whole table on a request |
| Counters exist on the poll, are **not** real-time in the database, and **must be accumulated in a cache and flushed**; Live Results reads the live counters | Vote counters live in Valkey (`cnt:<pid>` with a per-vote `seq`) and are written to the row by a sweep every `ENV_COUNTER_FLUSH_INTERVAL` (2 s); the flush and the Live Results floor are independent (§8) |
| Home search: free text over `searchText`; AND → OR-ranked → typo-tolerant; best match = relevance (title > subtitle > choices > keywords), then `voteCount` desc, then `createdAt` desc; cap `ENV_MAX_POLLS_SEARCH_RESULTS` (200); `truncated` flag, no count; an identical-query result cache (`ENV_SEARCH_CACHE_TTL` 10 s, normalised key); an outbox drained every `ENV_OUTBOX_DRAIN_INTERVAL` (15 s); results never refreshed; no Vote / Live Results buttons | Ranked full-text retrieval with field weights and two fallback passes; response bytes cached by normalised query text; index lag bounded by the drain interval |
| Home scope: Public and state ∈ {OPEN, CLOSED, WAITING TO OPEN}, or Public and EDITING with a prior state in that set; invitation-only never in scope | One generated boolean `home_listable` (§4) — the only place the rule is written |
| Admin search: free text AND dropdowns (`pollState` incl. AWAITING APPROVAL, `pollVisibility` ∈ {Public Poll, Private Poll}, `choiceMode`, `voteMutability`), `createdByName` case-insensitive *contains* (admin only), day-precision dates in the administrator's zone, three counters with operators; `createdAt` desc; cap `ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS` (200); `truncated` flag | One SQL query in which every field is an indexed predicate; a trigram index for *contains*; fetch cap + 1 rows to set the flag |
| **1,000,000 concurrent users, 50% signed in**; state instances and shared cache | Today's five-second polling would be 200,000 requests/s (§6.1). Under the adopted rules the load is *user-driven*, and the refresh-class part of it is **bounded by a budget that follows the fleet** (§6.2, §6.4) |
| Guests: no automatic refresh, no Live Results, sign-in prompt on Vote / Live Results, manual page refresh only; **prevent browser-Refresh storms** | Half the population generates load only on page load; §6.6 makes a page load cost one cache read |
| Sessions: cache-aside with `ENV_SESSION_CACHE_TTL` (5 min); no `cookieCache`; PostgreSQL the system of record | Every dynamic request and page load costs one Valkey `GET` for its session (§6.2) |
| Tabs: TRENDING (Public OPEN, trailing-hour votes, `ENV_MAX_TRENDING_POLLS` 200, recomputed every `ENV_TRENDING_POLLS_RECOMPUTE_INTERVAL` 60 s, **published as two CDN objects**), My PRIVATE POLLS, Favourites, Search, Live Results (an LRU of ≤ `ENV_MAX_LIVE_RESULTS_PER_USER` 5 polls, refreshed as **one request**); Vote on all but Search; Live Results button on all but Search and Live Results | Shared cached bytes for TRENDING and a 2 KB counts object per interaction; one indexed per-user query for the personal tabs; one request per tab refresh |
| **Per-kind floors**: Live Results 2 s, manual Refresh 5 s, Search 2 s, Vote 2 s, per session (per IP for guests), client- and server-enforced | One Valkey key per kind per user; a vote never delays a Live Results refresh |
| **Effective budget** `ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND` (1,250) × live instances, cap `ENV_SERVER_MAX_REFRESH_PER_SECOND` (15,000); the **budget controller** (tick 1 s, three multipliers, priority Search → Refresh → Live Results, `ENV_MAX_STRETCH` 8, lower at 80%, **predictive `k:live`** from the live registry); votes never lengthened | Adaptive polling with a controller that knows the live population before it polls (§6.4) |
| **Search sub-budget** `ENV_SERVER_MAX_SEARCH_PER_SECOND` (2,000 engine queries/s; cache hits do not count; does not follow the fleet; fallback 200 under PostgreSQL full-text) | The search engine is sized to one number (§4, §6.9) |
| **Per-instance load shedding**: `ENV_INSTANCE_MAX_INFLIGHT` 200, `ENV_INSTANCE_MAX_EVENT_LOOP_LAG` 100 ms, `503` + `Retry-After` (`ENV_SHED_RETRY_AFTER` 2 s), shedding order with votes and the health check last | The millisecond-scale bound of three (§6.3) |
| **App Platform autoscaling**: dedicated-CPU 1 vCPU / 2 GiB, 4–12 instances at 70% CPU; statelessness; graceful shutdown; connection arithmetic | The minute-scale bound of three; the fleet is sized by CPU, and the budget follows it (§6.10) |
| **Votes have no limit**: one path (validate, count, enqueue, respond with counts and `status`), Valkey Streams, batched inserts (`ENV_VOTE_BATCH_SIZE` 500), `ENV_VOTE_QUEUE_LAG_NOTICE` 2 s; a one-second loss window accepted; abuse bounded by `ENV_MIN_VOTE_INTERVAL` per session across polls and `ENV_MAX_VOTES_PER_IP_PER_MINUTE` 60 | §6.5 |
| Live Results: separate tab; 5-poll LRU; floor 2 s; 30-minute idle prompt (`ENV_MAX_IDLE_TIME`) with server-side expiry through the live registry; timer pauses when the page is hidden | §6.2, §6.4 |
| Bookmarks: cap 200; four removal rules; one daily silent sweep | A `bookmarks` table, `closed_at` and `last_vote_at`, one batched `DELETE` under a daily lock |
| Alternative architectures: pros and cons of push notifications, WebSockets and polling; update only changed data; scale on DigitalOcean, automatically | §6.7 |
| Near real-time when load is low | §6.12 — resolved by the per-kind floors and the low-load defaults the document adopted |
| Cost-effective, entirely on DigitalOcean; external services priced at 250,000 polls; cost of every option | §3, §4.6, §6.5, §6.11, §9 |

Two facts about scale shape everything below:

1. **Structured queries are easy at 250,000 rows.** Indexed equality, ranges and
   `ORDER BY created_at DESC LIMIT N` are sub-10 ms; the admin search is entirely this.
2. **Ranked full-text over a common word is the hard case, and its cost is multiplied by the
   query rate.** A word like `best` or `2026` may match 50,000 polls; an engine either scores them
   all (Postgres full-text — tens to hundreds of ms) or keeps a relevance-ordered index that yields
   the top-k directly (OpenSearch-class engines — milliseconds). At 2,000 engine queries/s that
   difference is several database nodes (§4).

---

## 3. System of record

| Candidate | Fit | Full text built in | Auth library (BetterAuth) | Tests without Docker | Price (DO managed, single node) |
|---|---|---|---|---|---|
| **PostgreSQL** | Indexed counters, dates, enums; row-per-vote with a `(poll_id, email)` key; `UPDATE … RETURNING` for claims; generated columns for derived fields; advisory locks for the sweeps | `tsvector` / `websearch_to_tsquery` / `ts_rank_cd`, GIN; `pg_trgm` for typos and *contains*; `pgvector` if semantic search is ever wanted | First-class (`database: new Pool(...)`) | `embedded-postgres` downloads a real binary per platform, Windows included | $15 (1 GB) → $60 (4 GB) → $120 (8 GB) → $240 (16 GB) |
| MySQL | Same relational fit | InnoDB `FULLTEXT`: boolean mode, weaker ranking, no trigram | Supported | Weaker tooling | $15 → $60 |
| SQLite + FTS5 | Excellent search, but App Platform has no persistent disk and no multi-instance story | FTS5 (BM25, trigram) | Supported | Trivial | **rejected by deployment** |

**Recommendation: DigitalOcean Managed PostgreSQL.** It carries the admin search alone, the home
search either alone (§4 S1) or as the source feeding an engine (S2/S3), the auth tables and the
new per-user tables; one vendor. MongoDB is removed entirely, its authentication collections
included — the document states that accounts are re-created on PostgreSQL. At 250,000 polls the
`polls` table with `searchText`, counters and indexes is ≈ 400–500 MB; `votes` at 50 per poll
≈ 12.5M rows, 1.5–2.5 GB; `vote_history` (append-only) larger, partitioned by month. **Data volume
does not size the node; the batched vote inserts and the per-user tab query rate do** (§6.10).

---

## 4. Home-page search: the options

All options share a `searchText` column maintained on the poll, the fixed home scope and the cap;
they differ in where the ranked retrieval runs. The identical-query result cache the document
specifies sits in front of every option: normalised query text + scope → compressed response
bytes, TTL `ENV_SEARCH_CACHE_TTL` (10 s), in Valkey so all instances share hits; a hit never
reaches the engine and does not count against the search sub-budget.

**The home scope as one column**, so every home query and index use the identical rule and an
invitation-only poll can never leak into it:

```sql
home_listable boolean GENERATED ALWAYS AS (
  poll_visibility = 'Public Poll' AND (
    poll_state IN ('OPEN','CLOSED','WAITING TO OPEN') OR
    (poll_state = 'EDITING' AND poll_state_before_edit_update IN ('OPEN','CLOSED','WAITING TO OPEN'))
  )) STORED;
```

### S1 — Postgres full-text search (no additional service)

```sql
search tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', title), 'A') ||           -- title > subtitle > choices > keywords
  setweight(to_tsvector('english', subtitle), 'B') ||
  setweight(to_tsvector('english', choice_labels), 'C') ||
  setweight(to_tsvector('english', keywords), 'D')) STORED;
CREATE INDEX polls_home_search ON polls USING gin (search)         WHERE home_listable;
CREATE INDEX polls_home_newest ON polls (created_at DESC, id DESC) WHERE home_listable;
```

- `websearch_to_tsquery('english', $q)` accepts any input without error, ANDs the words, honours
  quotes and stems (`elections` finds "election"). Fewer than the cap → pass 2 re-runs with the
  words OR'd, ranked, appended after the pass-1 rows; still short → pass 3 is a bounded `pg_trgm`
  pass (`similarity(title, $q) > 0.3`, query ≥ 3 characters, `LIMIT`) that catches `basketbal`.
  Rows are de-duplicated across passes; passes run only as needed.
- Best match: `ts_rank_cd(search, query)` with the A/B/C/D weights, then `vote_count DESC`, then
  `created_at DESC` — the order the document specifies.
- Common words are bounded explicitly — rank the 5,000 newest matches (an index-driven CTE), not
  all of them — so one query can never take seconds; "best of recent" rather than "best of all".
  Warm latency 5–150 ms. The query fetches cap + 1 rows to set `truncated`.
- **Cost**: $0 per node — but **5–150 ms of the Postgres node's CPU per query**. At the 2,000/s
  sub-budget (average ≈ 40 ms) that is **≈ 80 CPU-seconds per second**: ten 8-vCPU nodes' worth,
  before a single vote is written. This is why the document sets the **fallback sub-budget to
  200/s** while S1 serves: 200 × 40 ms ≈ 8 CPU-seconds per second, one node's spare capacity.
  S1 cannot be the production engine at 1,000,000 users; it is the development, test and fallback
  engine.

### S2 — DigitalOcean Managed OpenSearch

- BM25 relevance with index-ordered top-k (a common word costs the same as a rare one),
  `fuzziness: AUTO` for the typo pass, field boosts for title > subtitle > choices > keywords,
  `function_score` to fold in `vote_count` and recency as the tie-breaks; the AND → OR fallback is
  `minimum_should_match: 100%` then a relaxed query. 250,000 short documents ≈ 300 MB.
- A top-200 query is 3–8 ms of one node's CPU: the 2,000/s sub-budget is 6–16 CPU-seconds per
  second — a 3 × 4 GiB cluster; 5,000/s a 3 × 8 GiB cluster. Behind the result cache the engine
  sees only the long tail, so the user-visible search rate is the sub-budget ÷ (1 − hit rate).
- Fed from Postgres by a transactional outbox drained every `ENV_OUTBOX_DRAIN_INTERVAL` (15 s)
  (§8); S1 is the fallback while the engine is down or re-indexing, at the fallback sub-budget.
- **Cost**: $19 (1 node, 2 GiB) in development; **3 × 4 GiB ≈ $114** at the load target, by the
  sub-budget (see the sizing table in §6.9).
- **Weight**: a JVM cluster and a verbose query DSL, contained in one query-builder module.

### S3 — Typesense or Meilisearch on a Droplet (self-hosted on DO)

- Same capabilities as S2 for this workload (BM25-class ranking, typo tolerance, field weights,
  numeric sorts), simpler API. 250,000 documents ≈ 0.5–1 GB RAM.
- **Cost**: Droplet **$24** (4 GiB) to **$48** (8 GiB) plus backups (+20%) — and you patch,
  upgrade, back up and monitor it, on a private network to App Platform. "Entirely on
  DigitalOcean" but not managed.

### S4 — Third-party search SaaS (external), priced at 250,000 polls

| Service | Monthly cost at 250,000 polls | Note |
|---|---|---|
| Typesense Cloud | ≈ **$22** (0.5 GB burst node) to ≈ **$60** (2 GB, non-HA) | Resource-priced; 250k short documents fit a small node |
| Meilisearch Cloud | Build ($30) caps at 100k documents; **Pro $300** (1M documents, **10M searches/month**) | The search allowance is consumed in **under two hours** at the sub-budget |
| Algolia (Grow) | records (250,000 − 100,000 free) / 1,000 × $0.40 = **$60**; searches beyond 10k/month at $0.50 per 1,000 — at 2,000/s for four peak hours a day ≈ 860M searches/month ≈ **$430,000** | Per-query pricing is disqualifying at this concurrency, independent of the DO preference |

### S5 — Semantic / vector search

Not required: "best match" over `searchText` is a lexical ranking problem, which every option
above provides. If meaning-matching ("hoops" finds "basketball") is ever wanted: embeddings for
250,000 polls ≈ 15M tokens — cents (DO Gradient AI serverless models, or Voyage AI at $0.02 per
1M tokens); the vector index in `pgvector` (250,000 × 512 dims ≈ 0.5 GB) fits the existing
Postgres node for **$0–60** extra; Pinecone Serverless from **$50**; DO Managed OpenSearch k-NN on
a 4 GiB node **$38**. Do not build it now.

### 4.6 Comparison

| | S1 Postgres FTS | S2 DO OpenSearch | S3 Droplet | S4 SaaS | S5 Vector |
|---|---|---|---|---|---|
| Best match, non-technical, 250k polls | Yes, with the bounded-candidate compromise | Yes | Yes | Yes | Not required |
| AND → OR → typo chain | Three passes | Native | Native | Native | Inherent |
| CPU per query | 5–150 ms of Postgres | 3–8 ms of its own node | 2–10 ms | vendor's | 5–30 ms |
| Holds the 2,000/s sub-budget | **No** (≈ 80 Postgres CPU-s/s; fallback budget 200/s) | Yes, $114 | Yes, $24–48 + your time | At $300–430,000 | n/a |
| Extra services | 0 | 1 managed | 1 self-managed | 1 external | 0–1 |
| Entirely on DO | Yes | Yes | Yes | No | pgvector: yes |
| Falls back when down | — | to S1 at 200/s | to S1 | to S1 | to lexical |

**Recommendation: S2 (DO Managed OpenSearch) in production; S1 in development, in tests, and as
the fallback at the fallback sub-budget.** Put retrieval behind one interface
(`search(scope, text, limit)`) so the engine is a configuration choice; keep `searchText` a pure
function of the poll.

---

## 5. Admin search: one indexed SQL query

Every dropdown, textbox and date selector maps to an indexed predicate; the free-text box is a
boolean predicate (no ranking — the sort is `createdAt DESC`). Both visibilities are stored
literally, so the dropdown is an equality.

```sql
SELECT … FROM polls
WHERE ($text = ''            OR search @@ websearch_to_tsquery('english', $text))
  AND ($state IS NULL        OR poll_state = $state)          -- incl. 'AWAITING APPROVAL'
  AND ($visibility IS NULL   OR poll_visibility = $visibility) -- 'Public Poll' | 'Private Poll'
  AND ($mode IS NULL         OR choice_mode = $mode)
  AND ($mutability IS NULL   OR vote_mutability = $mutability)
  AND ($creator = ''         OR created_by_name ILIKE '%' || $creator || '%')   -- case-insensitive contains
  AND ($createdFrom IS NULL  OR created_at >= $createdFrom)   -- Node turns YYYY-MM-DD + the admin's IANA
  AND ($createdTo   IS NULL  OR created_at <  $createdTo)     -- zone into a UTC [from, to) window:
  AND ($startFrom   IS NULL  OR start_at   >= $startFrom)     -- "=" is [day, next day), ">=" is [day, ∞),
  AND ($startTo     IS NULL  OR start_at   <  $startTo)       -- "<=" is (-∞, next day)
  AND ($endFrom     IS NULL  OR end_at     >= $endFrom)
  AND ($endTo       IS NULL  OR end_at     <  $endTo)
  AND ($voteOp IS NULL       OR <vote_count op $vote>)        -- built per operator, parameterised
  AND ($invOp  IS NULL       OR <invited_count op $inv>)
  AND ($banOp  IS NULL       OR <banned_count op $ban>)
ORDER BY created_at DESC, id DESC
LIMIT $max + 1;                       -- ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS + 1 → truncated flag, no count
```

A `NULL` `start_at` / `end_at` (unscheduled) never matches a date filter on that field. The day
window is computed once in Node from the string and the browser's zone (`Intl.DateTimeFormat`
handles DST), so SQL only sees UTC timestamps and the `timestamptz` indexes apply directly.

| Predicate | Index |
|---|---|
| free text | `GIN (search)` (unfiltered; the home partial index is separate) |
| state, visibility, mode, mutability + sort | `btree (poll_state, created_at DESC)`, `btree (poll_visibility, created_at DESC)`, `btree (choice_mode, created_at DESC)`, `btree (vote_mutability, created_at DESC)` |
| `createdByName` contains | `GIN (created_by_name gin_trgm_ops)` — a trigram index serves `ILIKE '%x%'` for 3+ characters; shorter inputs fall back to the sort index and filter |
| dates | `btree (created_at DESC, id DESC)` (also the default admin listing), `btree (start_at)`, `btree (end_at)` |
| counters | `btree (vote_count)`, `btree (invited_count)`, `btree (banned_count)` — the flushed row values (§8), so a filter sees counts at most one flush interval old |

For a rare word the planner uses the GIN index and sorts a few rows; for a common word it walks
`created_at DESC` and filters until it has `LIMIT` rows — both fast, because the admin search does
not rank. A test runs each filter combination under `EXPLAIN` with `enable_seqscan = off` and
fails on any `Seq Scan` of `polls` — the way to keep 250,000-row behaviour honest with a 200-row
test database. Administrators are a handful of users; the admin page keeps its
`ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL` polling and edit heartbeat unchanged.

---

## 6. Load target: 250,000 polls and 1,000,000 concurrently connected users

### 6.1 The baseline: today's refresh at 1,000,000 users

From the current code: every open home page re-fetches the whole listing every
`ENV_POLLING_INTERVAL` (5 s, `src/public/pollGrid.js`); each request looks up the session and
builds a body that includes per-caller fields (the caller's own choice ids and vote eligibility,
`src/routes/pollsApi.ts`), so no two visitors' responses are byte-identical and none can be served
as cached bytes; a standalone card polls its poll every 5 s; each server process runs its own
approval (5 s) and schedule (60 s) sweeps.

| | Today's polling at 1,000,000 users |
|---|---|
| Requests | **200,000 req/s**, each with a session lookup |
| Bytes out (50 cards ≈ 8 KB compressed) | ≈ 1.6 GB/s ≈ **5.6 TB per hour** ≈ $110 per hour of egress at $0.02/GiB |
| App Platform instances | ≈ 80 × 1 vCPU (≈ 2,500 req/s per vCPU even with pre-compressed cached bytes) |
| Postgres | 200,000 session reads/s unless sessions are cached; the listing itself only if cached |

The document's own conclusion — not scalable — holds: ≈ $13,000 a month of egress alone at four
peak hours a day, and eighty instances.

### 6.2 The load model under the adopted rules

The adopted rules change the *shape* of the load, not only its size. With no automatic tab
refresh, no guest refresh, a per-kind floor per user, and one effective budget over every dynamic
request, the steady-state load has two parts: **page loads** (unbounded in principle — §6.6 makes
them cheap) and **refresh-class requests** (votes, searches, Live Results refreshes, tab and
Refresh clicks), which the floors bound per user and the budget caps site-wide at
`ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND` (1,250) × live instances — **10,000/s with the
8-instance fleet of §6.10, 15,000/s at the 12-instance maximum**.

| Symbol | Assumption |
|---|---|
| U | 1,000,000 users with a page open; 50% signed in (from the document) |
| page loads | arrival or browser Refresh once per user per 10 minutes → **1,700/s**; storms handled in §6.6 |
| tab and Refresh clicks | once per user per 5 minutes → **3,300 req/s**; the 5 s manual floor caps the whole class at 200,000/s in theory — the reason the budget exists |
| tab mix | guests: TRENDING or Search only; signed-in users: half of their clicks on My PRIVATE POLLS / Favourites → **≈ 800 per-user queries/s** typical |
| Live Results | population *V* of open Live Results tabs (≤ 5 polls each, **one request per tab**, trimmed by the 30-minute idle rule and the hidden-page pause); floor 2 s |
| votes, searches | votes: **no limit** (the queue absorbs any rate, §6.5); the tables use 1,000 / 2,500 / 5,000 votes/s as scenarios. Searches: up to 1,700/s in the scenarios, bounded by the sub-budget (2,000 engine queries/s) and stretched first when over budget |
| payloads | TRENDING at 200 cards ≈ 160 KB raw / **32 KB compressed** (`trending.json`), its counts object ≈ **2 KB**; a personal tab ≤ 200 cards ≈ 32 KB, its delta ≈ 1–4 KB; a search page ≈ 32 KB; a Live Results response ≈ 1–6 KB (1–5 polls; ≈ 0.5–1 KB as a counts delta); a vote response ≈ 0.5 KB; a `304` ≈ 0.2 KB |

What each request costs:

- **TRENDING** — one list for everyone, recomputed by one sweep every 60 s from cached vote
  buckets (§6.8 item 4), published as two CDN objects (§6.6). An interaction fetches
  `trending-counts.json` (≈ 2 KB) from the CDN; `trending.json` only on a membership change.
  **Instance and Postgres cost per interaction: zero.**
- **My PRIVATE POLLS / Favourites** — per user, so not shareable. Done naïvely each is a four-way
  `UNION` over "created by me", "invited", "voted", "bookmarked": four indexed lookups plus a
  join, 3–8 ms. With a **materialised membership table** `user_polls (email, poll_id, relation,
  updated_at)`, written in the same transaction as the create / invite / vote / bookmark, each tab
  is one index range scan plus a primary-key join of ≤ 200 polls ≈ 1 ms, answered as a
  version-keyed delta (§6.7.3). **Postgres cost per request: one query.** ≈ 800 req/s typical
  → ≈ 1 CPU-second per second on Postgres.
- **Search** — the normalised-key result cache in front of OpenSearch (§4); a miss costs an engine
  query against the sub-budget; at 200 cards a search page is the largest payload on the site.
- **Live Results** — served **from Valkey, not Postgres**: content from the projection
  `poll:<pid>` and counts from the live hash `cnt:<pid>` with `seq` as `counts_version` (§8).
  Cost per request ≈ two Valkey operations per poll; the response is a delta against the
  versions the client holds.
- **Votes** — the dominant *write*: a session `GET`, a synchronous eligibility check (banned /
  invited / already voted / state — indexed lookups), three Valkey increments, an `XADD`, and a
  response carrying the new counts from Valkey (§6.5).
- **The per-kind floors** — one Valkey key per kind per session (per IP for guests) with the
  floor as its expiry (`SET NX PX`); a rejected request costs one Valkey round trip and a `429`
  carrying `Retry-After`. ≤ 4 keys per user ≈ 320 B; ≈ 100–300 MB at the load target.
- **The session lookup** — cache-aside keyed by a hash of the session token
  (`ENV_SESSION_CACHE_TTL` 5 min, deleted on logout), so a request costs a Valkey `GET` instead of
  a Postgres read while Postgres remains the session system of record and the single-cookie policy
  is untouched — the document forbids BetterAuth's `cookieCache` for that reason. 500,000 active
  sessions × ≈ 300 B ≈ 150 MB.

Bytes out at the typical rate, with the adopted delta protocol and the CDN: TRENDING counts
objects 2,500/s × 2 KB ≈ 5 MB/s from the CDN at $0.01/GiB; personal-tab deltas 800/s × 2 KB
≈ 1.6 MB/s; searches up to 1,700/s × 32 KB ≈ 54 MB/s ≈ 196 GB/h — **the dominant line**; Live
Results ≤ 10,000/s × ≈ 1 KB ≈ 10 MB/s; votes negligible. **≈ 260–300 GB/h ≈ $5.00–5.50 per peak
hour**, of which searches are ≈ $3.65. Without the delta protocol and the CDN it would be
≈ 700 GB/h ≈ $13/h — which is why the document adopts both.

### 6.3 Scrutiny of each adopted measure

| Measure | Verdict | What the arithmetic requires of it |
|---|---|---|
| No automatic tab refresh; refresh only on click / Refresh button | **The decisive change.** 200,000 req/s → ≈ 3,300 req/s user-driven | The floor keys must be in the shared cache, not per instance, or a client alternating instances gets *N* refreshes per interval |
| Guests: no automatic refresh, no Live Results, sign-in prompt to vote | Halves the population that can generate steady load and removes guests from the write path; correct | Guests must still be rate-limited per IP on Refresh and Search, and page loads must be cheap (§6.6) |
| Browser Refresh lands on TRENDING, served from the CDN | Correct — the CDN is the better of the two | §6.6: with the two-object split, a client-side copy and `304`s, a page load costs the server one Valkey read |
| TRENDING: Public OPEN by trailing-hour votes, 200 polls, recomputed every 60 s, two objects | Correct for a shared list; the split makes the 1-minute recompute cheaper than a 10-minute single object (§6.6.1) | The trailing-hour count must come from **bucketed counters in Valkey**, not from `votes` (§6.8 item 4) |
| One request per tab refresh; Live Results tab is a 5-poll LRU refreshed as one request | Correct — the LRU needs no server state beyond the registry | Each personal tab must be one query — `user_polls` (§6.2) |
| Counters accumulated in a cache and flushed; Live Results reads the live hash | Correct and necessary: the ≈ 200 trending polls receive most of an unlimited vote rate; a row update per vote would serialise on one row lock at ≈ 1,000–5,000 updates/s. Reading `cnt:<pid>` decouples the Live Results floor from the flush at the cost of one `HGETALL` where there was a `GET` | A windowed flush (§8) that writes `last_vote_at` and `counts_version` and feeds the trending buckets and the outbox |
| Per-kind floors: Live 2 s, manual 5 s, Search 2 s, Vote 2 s | Correct: a single floor cannot be both fast for the automatic tab and protective for votes; a manual button below a few seconds invites rapid clicking | Keys per kind; the manual floor drives the Refresh button's disabled state |
| **Effective budget following the fleet** (1,250 × instances, cap 15,000) | **The strongest measure in the document: the server's dynamic load is a configuration value, and it grows with the fleet.** 1,250/s per 1 vCPU instance is ≈ 60–70% of what the cached paths sustain, which is the autoscaling target | Instance heartbeats in Valkey; the controller reads the count each tick |
| Priority order Search → Refresh → Live Results; votes never lengthened; `ENV_MAX_STRETCH` 8 | Correct — protects the tab the user is watching and the action that must not be lost; with a 2 s floor, 8× lets Search and Refresh stretch to 16 s and 40 s before Live Results degrades at all | Three multipliers, one comparison each per tick |
| **Predictive `k:live`** from the live registry | Correct: Live Results is the one kind that can burst ahead of an observing controller; the server knows *V* and need not observe the burst | A sorted set updated on every live refresh; the activity factor for hidden pages (§6.4) |
| Search sub-budget 2,000/s, cache hits excluded, fallback 200/s, not fleet-following | Correct: the engine is the one component priced per request, so it needs its own ceiling; the fallback keeps an engine outage from reaching the database | One more counter; the cache's normalised key sets the hit rate |
| Per-instance shedding: 200 in flight / 100 ms lag, `503` + `Retry-After` 2 s, votes and health check last | Correct — the millisecond bound the other two cannot provide; keeping the health check out of shedding is what prevents the cascade | Thresholds set by the load test |
| Autoscaling 4–12 dedicated 1 vCPU / 2 GiB at 70% CPU; graceful shutdown; connection arithmetic | Correct: the stateless fleet is what makes CPU a safe signal in both directions; a minimum of 4 leaves 3 during a deploy | The consumer must acknowledge its batch on `SIGTERM` |
| Sessions cache-aside, `cookieCache` forbidden | Correct — the one implementation shortcut that would silently violate the single-cookie policy | TTL 5 min; delete on logout |
| Bookmarks: cap 200; daily silent sweep | Correct; cheap | `closed_at` and `last_vote_at` on the poll so the four rules are one `DELETE` |
| Votes: one path, Valkey Streams, batched inserts, "queued" as a status; per-session floor across polls; per-IP 60/min | Correct — a vote is never lost to load, and the abuse bounds close the one gap the budget leaves | §6.5 |
| 30-minute idle prompt with server-side expiry via the registry; hidden-page pause | Correct — the registry prune is what makes the idle rule a load rule; the pause removes background tabs from *V* | Prune at idle time + one interval |

### 6.4 The budget controller, and the freshness it delivers

Mechanics (all state in Valkey, so every instance sees the same numbers):

- **Effective budget** *B* = `ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND` (1,250) × the
  number of live instances (heartbeat keys `instance:<id>`, TTL 30 s), capped by
  `ENV_SERVER_MAX_REFRESH_PER_SECOND` (15,000). Every dynamic request increments
  `budget:<second>`; the observed rate *R* is the count for the current second.
- **Controller tick** `ENV_BUDGET_CONTROLLER_INTERVAL` (1 s) on one instance under the sweep
  lock. Three multipliers `k:search`, `k:refresh`, `k:live` (each ≥ 1); the interval handed to a
  client for a kind is that kind's floor × its multiplier, returned as `nextRefreshMs` in **every**
  response of that kind. Raise rule: while *R* > *B*, raise the first multiplier below its cap in
  the order Search, Refresh clicks, Live Results; Search and Refresh cap at `ENV_MAX_STRETCH` (8)
  × their floor, Live Results is uncapped. Lower rule: while *R* < 80% of *B*, lower them in the
  reverse order, one step per tick. Votes are never lengthened.
- **Predictive `k:live`**: every Live Results refresh does `ZADD live:active <now> <session>`;
  each tick the controller prunes entries older than `ENV_MAX_IDLE_TIME` + one interval and reads
  *V* = `ZCARD live:active`. Then `k_pred = ceil((V × a / floor_live) / budget_left)`, where
  `budget_left` is *B* minus the observed rate of votes, searches and Refresh clicks, and *a* is
  the activity factor (observed live requests ÷ the number *V* would produce at the current
  interval — the correction for tabs paused because their page is hidden). `k:live = max(k_pred,
  k_observed)`; decreases one step per tick. When *V* rises, `k:live` rises in the same tick,
  before the new tabs' first refreshes arrive; when *V* falls, it falls without waiting for the
  80% threshold. An overestimate errs toward a slightly longer interval, never toward `503`s.
- **Search sub-budget**: `search-budget:<second>` counts engine queries (cache hits excluded);
  over `ENV_SERVER_MAX_SEARCH_PER_SECOND` (2,000; 200 while S1 serves) `k:search` rises by the
  same rule.
- **Cost of the budget** is linear: **each 1,000 req/s of budget ≈ 0.5–0.8 vCPU and ≈ 1–5 MB/s of
  egress** depending on the mix — which is exactly why it is expressed per instance.

Because votes are never lengthened and searches and clicks are stretched first, the Live Results
share of the budget is *B* minus the vote rate minus what searches and clicks still consume at
their 8× cap (≈ 210 + 40 per second in the scenario). The loop settles at the smallest `k:live` at
which the live requests fit into that remainder; with prediction it settles there *before* the
surge rather than a tick after. The table shows that equilibrium — the freshness by live
population *V* (one request per Live Results tab, floor 2 s) — under three vote-rate scenarios
and two fleet sizes:

| Fleet (effective budget) | Votes/s | Budget left for Live Results | Live tabs held at the 2 s floor | 4 s | 6 s | 10 s |
|---|---|---|---|---|---|---|
| 8 instances (10,000/s) | 5,000 | ≈ 4,750 | 9,500 | 19,000 | 28,500 | 47,500 |
| 8 instances (10,000/s) | 2,500 | ≈ 7,250 | 14,500 | 29,000 | 43,500 | 72,500 |
| 8 instances (10,000/s) | 1,000 | ≈ 8,750 | 17,500 | 35,000 | 52,500 | 87,500 |
| 12 instances (15,000/s) | 5,000 | ≈ 9,750 | 19,500 | 39,000 | 58,500 | 97,500 |
| 12 instances (15,000/s) | 1,000 | ≈ 13,750 | 27,500 | 55,000 | 82,500 | 137,500 |

Reading the table: the fleet at the load target keeps the 2-second floor for 9,500–17,500
simultaneous Live Results tabs depending on how busy voting is, and 4 seconds for twice that —
searches and Refresh clicks have been stretched to 16 s and 40 s by then; autoscaling to 12
instances raises every figure by half or more. With the 5-per-user cap, the 30-minute idle rule and the
hidden-page pause, *V* is a small fraction of the 500,000 signed-in users. Each additional
instance adds 1,250/s of budget; each additional 1,000/s of budget costs ≈ 0.5–0.8 vCPU.

### 6.5 The vote path: one queue, and its cost

The document's rule — a vote is never lost to load; if it cannot be written at once it is queued
and the user is told — is met by **one path for every vote**, never a "normal" path and an
"under load" path.

**Where the cost of a vote is.** Validation (banned, invited, already voted, state OPEN) is a few
indexed lookups or cache reads; the counter increments are three Valkey ops; the counts in the
response are one Valkey read. The only expensive step is the **durable write** — an `INSERT` into
`votes` plus `vote_history` and `user_polls` rows, ≈ 1–2 ms of Postgres and the row's WAL. A queue
takes that step off the request path and lets a consumer write it **in batches** (500 rows per
statement — 2–10 statements/s instead of 1,000–5,000). Everything else is cheap enough to always
do synchronously — which is what the document requires: eligibility is checked before a vote is
queued, so a queued vote can fail only by system error.

**The path**: validate → `HINCRBY cnt:<pid>` for each choice, `total` and `seq`, and the trend
bucket → `XADD` to the stream `votes` → respond with the counts and `counts_version` from
`cnt:<pid>` and a `status` of `"recorded"` (consumer lag below `ENV_VOTE_QUEUE_LAG_NOTICE`, 2 s)
or `"queued"`. A consumer group `writers` on every instance reads up to `ENV_VOTE_BATCH_SIZE`
(500) entries, inserts idempotently (`ON CONFLICT (poll_id, email) DO UPDATE` for Dynamic-Vote
polls, `DO NOTHING` for Final-Vote), writes the `vote_history` and `user_polls` rows in the same
transaction, acknowledges, and on `SIGTERM` finishes its batch before the instance exits.

**Queue options, all costed:**

| | Q1 — Valkey Streams (`XADD` / consumer groups) | Q2 — RabbitMQ on a Droplet (the document's example) | Q3 — DO Managed Kafka | Q4 — Postgres table as the queue |
|---|---|---|---|---|
| Extra service | none — the Managed Valkey the design already requires | one more server to run: no DO-managed RabbitMQ | managed, replicated log | none |
| Enqueue cost | ≈ 0.1 ms, one round trip | ≈ 1 ms, AMQP with publisher confirms | ≈ 1–5 ms, batched producer | the same `INSERT` the queue exists to avoid — **defeats the purpose** |
| Throughput available (the document sets no vote limit) | > 100,000/s enqueue; the drain rate is the consumer's batch insert (§6.10) | 20,000–50,000/s per node | far above need | n/a |
| Durability | in-memory with snapshots and standby replication; **loss window ≈ the last second of unconsumed entries on a node failure** — within what the document accepts | durable queues survive a restart; a single Droplet is still one failure domain | replicated across 3 brokers; no loss on a single failure — more than the document requires | fully durable |
| Consumer | `XREADGROUP` on every instance; `XACK` after the batch insert; `XAUTOCLAIM` for stuck entries | a consumer per instance with prefetch | a consumer group | polling `SELECT … FOR UPDATE SKIP LOCKED` |
| Monthly cost | **$0** (within the 2 GiB Valkey; a backlog of 100,000 votes ≈ 30 MB) | $12–24 Droplet + backups + your time | ≈ **$150+** for the smallest cluster (verify) | $0 but pointless |
| Verdict | **Recommended** | Only if a broker with routing and dead-letter semantics is wanted for other reasons | Not needed: the document accepts a one-second loss window | Rejected |

**Abuse resistance** (adopted): `ENV_MIN_VOTE_INTERVAL` (2 s) is per session across *all* polls —
the scope that bounds write volume; a second vote on a Final-Vote poll is refused before the queue
and never becomes a row; `ENV_MAX_VOTES_PER_IP_PER_MINUTE` (60) covers many sessions behind one
address; account creation is the outer bound through the existing email rate limit. What this
avoids: a script voting once a second from 10,000 sessions would otherwise write ≈ 36M rows an
hour (≈ 20–35 GB a day, ≈ $4–7 a day in storage, compounding) and consume half the drain ceiling.

**Recommendation: Q1, Valkey Streams, as the single always-on vote path**, consumer lag kept
under ≈ 1 s so both the loss window and the "queued" notice are rare; counters incremented at
enqueue so TRENDING, Live Results and the voter's own response are never behind the queue; the
nightly reconcile (§8) corrects a lost entry to one missing vote row, never a wrong tally.

### 6.6 Page loads, browser-Refresh storms, and the two-object TRENDING

A browser Refresh cannot be prevented and must not be answered with a `429` for the page itself —
a user who sees an error page refreshes again. The answer is to make a page load **almost free**,
then rate-limit only the part that is not.

1. **Static assets from the CDN with immutable caching.** Fingerprinted filenames served with
   `Cache-Control: public, max-age=31536000, immutable`; the HTML with an `ETag`. App Platform's
   static component or Spaces + CDN serves them; a Refresh fetches nothing from an instance for
   assets.
2. **TRENDING as two CDN objects** (adopted). The trending sweep publishes `trending-counts.json`
   (ids in order, counters, `counts_version`s, a membership version; ≈ 2 KB) every recompute and
   `trending.json` (the full cards; ≈ 32 KB) only when the membership changed, both with
   `Cache-Control: public, max-age=60` and an `ETag`. An interaction fetches the counts object and
   applies it as a delta; the full object only when the membership version moved.
3. **A client-side copy.** The page stores the last TRENDING objects and versions in
   `sessionStorage` (survives F5, not a new tab); on load, if the copy is younger than the recompute
   interval it renders immediately and sends only a conditional request — a `304` from the CDN.
4. **`/api/config` cacheable** (`max-age=300`), and **`/api/me` the only per-user call**, answered
   from the session cache: one Valkey `GET`, ≈ 0.3 KB — the one request per Refresh that reaches an
   instance.
5. **A per-IP / per-session page-load token bucket** — `ENV_PAGE_LOADS_PER_MINUTE` (20), `INCR`
   with expiry — applied to `/api/me` and to any listing not served from the CDN. Over the limit
   the API answers `429` with `Retry-After` and the page renders its stored copy with a notice;
   the HTML and assets are never blocked, so the user never sees a broken page.
6. **Optional edge rate limiting.** App Platform does not expose a configurable edge rate limit;
   a CDN/WAF in front of the app (Cloudflare's free tier offers per-IP rules) blocks abusive IPs
   before DigitalOcean. Not on DigitalOcean; the document excludes it as unnecessary.

With items 1–5, a Refresh storm of 1,000 loads/minute from one client costs the instances ≈ 20
Valkey reads a minute and the CDN a few hundred `304`s; a site-wide storm (a million users
refreshing within a minute) is 17,000 Valkey reads/s — well inside one Valkey node — plus CDN
traffic that never touches an instance.

#### 6.6.1 Why 60 s and two objects cost less than 600 s and one

The recompute itself is one bucket sum (≈ 100–300 ms of one instance), one primary-key query for
200 rows and one Spaces `PUT` — negligible at either interval; Spaces charges no per-request fee.
The only real cost is CDN egress, and it is bounded by how often users interact, not by how often
TRENDING is recomputed:

| | 600 s, one object | 60 s, one object | **60 s, two objects (adopted)** |
|---|---|---|---|
| What a client fetches per interaction | the full 32 KB at most once per 10 min, otherwise `304` | the full 32 KB every interaction, because the object changed | the 2 KB counts object; the 32 KB object only when membership changed |
| CDN egress at 1M users, ≈ 3,300 interactions/s | ≈ 190 GB/h ≈ $1.80/peak hour ≈ $220/month | ≈ 380 GB/h ≈ $3.55/h ≈ $430/month | ≈ 24 GB/h ≈ **$0.22/h ≈ $27/month**, plus occasional full fetches |
| Freshness | a viral poll appears within 10 minutes | within a minute | within a minute; counts at most a minute old |

### 6.7 Alternative architectures: push notifications, WebSockets, polling — and updating only what changed

#### 6.7.1 The approaches, and what each costs at 1,000,000 users

**Push notifications** here means the Web Push API: the browser's service worker subscribes
through the browser vendor's push service (Google, Apple, Mozilla), the server sends each message
with an HTTPS request to that service (VAPID-signed, payload ≤ 4 KB), and the browser shows a
notification or wakes the page. It is a different thing from a server-to-page stream, and it is
built for *events*, not for *data*.

| | Polling / refreshing (adopted: on demand, budgeted, adaptive) | WebSockets (bidirectional stream per viewer) | Server-Sent Events (one-way stream per viewer) | Web Push notifications |
|---|---|---|---|---|
| What it is good at | Bounded, stateless, cache-friendly; the server decides its own load | Interactive two-way traffic (chat, games) | Server → page updates with automatic reconnection | Reaching a user whose page is **closed** — "a poll you created just closed", "you were invited" |
| Freshness | On demand; Live Results at the 2 s floor while within budget, longer beyond | ≤ one window (seconds) | ≤ one window (seconds) | Seconds to minutes; the push service may delay, batch or drop; no guarantee |
| Server state per viewer | none — a few Valkey keys | one open socket ≈ 20 KB of memory, heartbeats, per-instance bookkeeping | same as WebSocket | a subscription record (endpoint + keys) per browser |
| Scaling dimension | requests/s → CPU → **autoscales on CPU** (adopted) | open sockets → memory → instances sized for peak *connections*, mostly idle; App Platform autoscaling is CPU-based, so it does not follow connection count | same | outbound HTTPS requests to push services: one per subscriber per event — 1,000,000 requests for one site-wide event |
| Deploys and failover | no effect | every rolling replacement drops every socket — ≈ 100,000 reconnects/s for ten seconds at 1M viewers even with jitter | same | no effect |
| Fan-out of a hot poll | none — nothing is pushed | needs the coalescing of §6.7.2 or it is 100,000,000 messages/s | same | impossible for live counts: one HTTPS request per subscriber per update |
| Browser support and permissions | universal; no permission | universal; no permission | universal; no permission | needs an explicit permission prompt; declined by most users; iOS only for installed web apps |
| Bytes per update | request + response (or `304`, ≈ 0.2 KB) | a frame ≈ 0.1–0.3 KB, no headers | same, plus `data:` framing | ≤ 4 KB, encrypted, via a third party |
| Library / protocol weight | none — plain HTTP | `ws` library, ping/pong, custom reconnect | none — `EventSource`, `Last-Event-ID`, `retry` built in | service worker, VAPID keys, subscription storage, the `web-push` library |
| Entirely on DigitalOcean | yes | yes | yes | **no** — every message transits Google's, Apple's or Mozilla's push service |
| Instances at 1M concurrent (listings) | **4–12 autoscaled** | ≈ 24 × 2 GiB (memory-bound, idle CPU) | ≈ 24 × 2 GiB | n/a for live data |
| Monthly cost at the load target | ≈ $850–1,400 (§6.11) | ≈ $1,020–1,630 plus deploy storms | same as WebSocket | $0 for the push services; the outbound request volume is the cost, and it lands on the instances |
| Verdict | **Primary model (adopted)** | Not for this workload — two-way traffic is not needed | **The upgrade for Live Results** if freshness below the floor is ever required at a large live population | **Reserve for rare, per-user events** — never for counts |

Two further approaches were considered and set aside: **long polling** (the server holds each
request until something changes or a timeout expires) costs a held connection like SSE *plus* the
HTTP overhead of re-issuing the request each cycle — the worst of both; and **HTTP/2 server push**
is deprecated in browsers.

#### 6.7.2 How a push model would have to be built: coalesced, lossless fan-out

Whatever the transport, pushing per vote is impossible: 100 votes/s on trending polls ×
1,000,000 viewers = 100,000,000 messages/s. A push model works only if it is *coalesced* and the
coalescing is *lossless*: the payload is a poll's **absolute** counters with a version (never an
increment), so any number of messages for one poll collapse to the newest and arrival order does
not matter; fan-out happens in two stages of very different width — a change publishes once on a
Valkey channel to which each **instance** subscribes (tens of subscribers, not a million), and each
instance writes **one frame per connection per window** carrying only the changed counters among
that connection's visible polls. A viral poll with 10,000 votes/s then costs the same egress as one
with one vote per window. `LISTEN`/`NOTIFY` can replace Valkey as the bus, at the price of one
direct (non-pooled) connection per instance, an 8,000-byte payload limit, and a global lock taken
at commit that becomes measurable at thousands of committing votes/s.

| | Adopted (on-demand tabs + budgeted adaptive polling) | Push to every viewer (listings, 2 s window) | Push per poll for Live Results only |
|---|---|---|---|
| Requests or frames/s | ≤ the effective budget by configuration | 0 requests; ≤ 500,000 frames/s, only in windows with a change | 0 requests; ≤ V/2 frames/s |
| Open connections | none held | **1,000,000 sockets** ≈ 20 GB of instance memory | V sockets (≈ 20 KB each) |
| Instances | **4–12 autoscaled** (§6.10) | ≈ 24 × 2 GiB, memory-bound | +1 per ≈ 50,000 live tabs |
| Freshness | on demand; Live Results 2 s up to V ≈ 2 × (budget left) | ≤ 2 s for everyone | ≤ window at any V |
| Deploys | no effect | rolling replacement drops every socket — ≈ 100,000 reconnects/s for 10 s even with jitter | reconnect storm proportional to V |
| Egress per peak hour | ≈ $5.00–5.50 (deltas + CDN) | ≈ $10 fully hot (60 KB/s per 1,000 viewers at a 2 s window), ≈ 0 when quiet | ≈ $0.75 per 100,000 tabs |
| Cost of the model, monthly | ≈ $850–1,400 (§6.11) | ≈ $1,020–1,630 (§6.11) | + $10–29 per 50,000 live tabs |

Verdict: push to every viewer is *feasible* — coalescing does solve the fan-out — but it buys
freshness the document has deliberately removed from the listings, at the price of 24 instances
holding a million idle sockets and a reconnect storm on every deploy. **The adopted on-demand,
budgeted model is more scalable and cheaper for the listings.** For Live Results, the budget
already delivers the 2-second floor for tens of thousands of live tabs; SSE per poll is the
upgrade if a business requirement ever fixes both a larger live population *and* the floor, and
nothing in the polling design has to be undone to add it, because both are served from the same
Valkey counters and the same version-keyed deltas (§6.7.3).

#### 6.7.3 Updating only what changed

The document asks for techniques that avoid re-fetching all the data for a poll or a tab. They
apply to polling and push alike; the first three are adopted.

1. **Version-keyed deltas (adopted).** Every poll carries `content_version` (title, choices, state
   — changes rarely) and `counts_version` (the per-vote `seq`). A tab refresh sends the versions
   it holds — `{ pid: [content_version, counts_version] }` for its ≤ 200 polls (≈ 4 KB) — and the
   server answers with only the polls whose versions moved: counters only when `counts_version`
   moved, the full card when `content_version` moved, and a membership list when the tab's set
   changed. A refresh in which nothing moved is `304`. This is the same payload a push frame would
   carry, so the client's merge logic is shared between the two transports. Cost: the server
   compares ≤ 200 versions from the cache — no database access. Effect: listing egress falls ≈ 8×,
   and a Live Results refresh of five unchanged polls is 0.2 KB.
2. **`ETag` / `If-None-Match` on shared objects (adopted).** TRENDING's two objects each carry one
   version for everyone; a request carrying the current version is a `304` from the CDN.
3. **Counters as absolute values with a sequence, never increments (adopted).** A delta can be
   applied out of order or twice without error, and a missed delta is repaired by the next one —
   no replay.
4. **JSON Patch / JSON Merge Patch (RFC 6902 / 7386).** A general diff format; not adopted, because
   the versioned-delta payload above is already the minimal patch for this data model and needs
   no generic patch engine on the client.
5. **Field-level projections.** Listings return only the fields a card renders; a card's back side
   is fetched on demand.
6. **Compression.** Every JSON response is compressed; cached listings are stored pre-compressed so
   the instance never compresses per request.

#### 6.7.4 Scaling on DigitalOcean — up, and down

| Component | How it scales | Automatic? |
|---|---|---|
| App Platform instances | Horizontally: the polling model is stateless, so instances are interchangeable and a request may land anywhere; sized by requests/s, i.e. CPU | **Yes (adopted)** — App Platform autoscaling on dedicated-CPU instances between 4 and 12 on CPU utilisation; the effective budget follows the instance count within one heartbeat. A connection-based model scales on memory and holds idle sockets, so it neither autoscales on CPU nor scales *down* while viewers stay connected |
| Managed Valkey | Vertically (larger plan) and by adding a standby; the working set here is < 1 GB at 1M users | Manual resize, minutes, no downtime with a standby |
| Managed PostgreSQL | Vertically (larger node — resize with a brief failover), plus read-only replicas for the personal-tab queries; `vote_history` partitioned monthly so its growth never affects `polls` | Manual resize; replicas added in the console; automatic storage growth |
| Managed OpenSearch | Add nodes or resize; the index is ≈ 300 MB, so it is sized by the search sub-budget only | Manual, minutes; the sub-budget is raised with it |
| Spaces + CDN | Elastic; the TRENDING objects and static assets scale to any number of viewers at $0.01/GiB | Inherent |
| The budgets | The per-instance budget follows the fleet automatically; the cap and the search sub-budget are raised when the cluster or the engine grows | Semi-automatic |

The properties that make the adopted model scale are that **no request depends on which instance
serves it**, that **the expensive requests are bounded by configuration** (the effective budget,
the search sub-budget, the vote queue's drain rate), that **overload is shed in milliseconds per
instance** rather than cascading, and that **the most frequent request never reaches an instance
at all** (TRENDING on the CDN). Growth from 1,000,000 users is therefore a matter of raising the
instance maximum, the budgets and the node sizes — not of changing the architecture.

### 6.8 Are the adopted changes sufficient?

**Yes — for reads, writes and Live Results.** The effective budget makes the answer unconditional
on the traffic assumptions: whatever the users do, the server's dynamic load is at most the
budget, and the per-kind floors bound it again from the other side. Every condition the earlier
research attached to that verdict is now in the document:

| Concern at 1,000,000 users | Covered by the document | Where |
|---|---|---|
| Listing request rate (200,000/s → ≈ 3,300/s, capped by the floors and the budget) | Yes — TRENDING as CDN objects; personal tabs on `user_polls`; floors and budget in Valkey; sessions cached | §6.2, §6.4, §6.6 |
| Page-load storms (guests; browser Refresh) | Yes — CDN + two-object split + client copy + `304`s + page-load bucket | §6.6 |
| Listing egress ($110/h → ≈ $5/h) | Yes — version-keyed deltas and the CDN | §6.7.3 |
| Vote writes — unlimited, concentrated on ≈ 200 trending polls | Yes — counters in Valkey, windowed flush, single-path queue with batched inserts, abuse bounds | §6.5, §8 |
| Live Results load and freshness | Yes — served from the live hash; predictive multiplier; registry expiry; hidden-page pause | §6.4, §8 |
| TRENDING recompute | Yes — from bucketed counters, every 60 s | §6.8 item 4 |
| Search rate | Yes — the sub-budget, the cache, the fallback budget; S2 sized to it | §4, §6.9 |
| Overload of one instance or one dependency | Yes — per-instance shedding with the health check exempt | §6.3 |
| Fleet growth and shrink | Yes — CPU autoscaling of a stateless fleet, graceful shutdown, connection arithmetic | §6.7.4, §6.10 |
| Per-user state (500,000 sessions, floor keys, registry, queue backlog) | Yes — Valkey 2 GiB with standby | §6.10 |
| Sweeps on *N* instances | Yes — `pg_try_advisory_lock` per sweep; the consumer group is the exception | §8 |

### 6.9 Sizing rules that follow from the adopted mechanisms

1. **Version-keyed deltas on every refresh** (§6.7.3) and the **two-object TRENDING** (§6.6.1):
   without them the 200-card listings cost ≈ $13 per peak hour of egress; with them ≈ $5.
2. **Session cache-aside** (§6.2): without it every click, vote and search is a Postgres read.
3. **TRENDING — and each future topic list — from Spaces + CDN**: each topic is one more pair of
   CDN-served objects; the listing mechanism needs nothing further.
4. **Trending and counters from bucketed Valkey counters, not from `votes`**: the trending sweep
   sums the trailing twelve `trend:<bucket>` hashes over the active polls (tens of thousands of
   keys at most) every 60 s; computing the same from `votes` would scan up to 18M rows a minute.
5. **The single-path vote queue** as the always-on write path (§6.5).
6. **Batched vote persistence** is the design, not a fallback: 500 rows per statement, so the
   database sees 2–10 statements/s for 1,000–5,000 votes/s.
7. **The search index lags** by design: outbox drained every 15 s, results cached 10 s.
8. **Refresh only visible pages**: the Live Results timer pauses while `document.hidden`; the
   activity factor in the controller accounts for it.
9. **Autoscale on CPU** with the budget following the fleet; nothing in the design has a shared
   phase that would make load spiky.
10. **The search sub-budget sizes the engine**:

| Sub-budget (engine queries/s) | Cluster | Monthly |
|---|---|---|
| 500 | 3 × 2 GiB (HA) | ≈ $57 |
| **2,000 (default)** | **3 × 4 GiB** | **≈ $114** |
| 5,000 | 3 × 8 GiB | ≈ $228 |
| 10,000 | 3 × 16 GiB | ≈ $456 |
| No sub-budget — sized for the 15,000/s cap all being searches | 3 × 16–32 GiB | ≈ $456–900 |

### 6.10 Sizing at the load target

**App Platform instances — autoscaling 4 to 12 dedicated-CPU instances of 1 vCPU / 2 GiB at 70%
CPU; 8 at the load target.** Dynamic load is capped at the effective budget (10,000/s at 8
instances — a mix of cache hits, Valkey-served Live Results, votes that cost three increments and
an `XADD`, and searches with a cache or OpenSearch round trip) plus ≈ 1,700 page loads/s that cost
one Valkey read each (§6.6), plus a session `GET` on everything, plus the consumers' batch
inserts. At ≈ 2,000 cached-path req/s and ≈ 1,000 vote/search req/s per vCPU, 1,250/s per instance
sits at ≈ 60–70% of capacity — the autoscaling target. In development, one instance.

**Cost of the fleet** (dedicated 1 vCPU / 2 GiB ≈ $25–29 per month ≈ $0.035–0.040 per
instance-hour; verify):

| Fleet | Monthly | Notes |
|---|---|---|
| 8 fixed shared-CPU | ≈ $80–160 | Cheapest on paper; CPU not guaranteed; cannot autoscale |
| 8 fixed dedicated-CPU | ≈ $200–232 | Guaranteed CPU; pays for peak capacity all month |
| **Autoscaled dedicated, 4 → 8–12 for 4 peak hours/day (adopted)** | **≈ $117–155** | 4 × $25–29 all month plus 480–960 extra instance-hours |
| Autoscaled, pinned at 12 all month | ≈ $300–350 | A ceiling, not an expectation; the budget bounds CPU demand |

**Managed Valkey — 2 GiB ($30), standby ($60, adopted).** Contents: active sessions ≈ 150 MB,
floor and rate keys ≈ 100–300 MB, the live registry ≤ 10 MB, instance heartbeats and budget
counters ≤ 1 MB, vote counters and trend buckets ≈ 50 MB, shared listings and the search result
cache ≈ 100–200 MB, content projections for live polls ≤ 50 MB, the vote stream (a backlog of
100,000 votes ≈ 30 MB; trimmed after `XACK`) — ≈ 0.6–1.0 GB with headroom. Operation rate
≈ 10,000 budget increments + 10,000 floor checks + 12,000 session `GET`s + 15,000 counter
increments + 5,000 `XADD`s + 10,000 registry `ZADD`s ≈ 60,000 ops/s, a fraction of one node. **The
standby is not optional**: the queue makes Valkey part of the write path, and the standby is what
bounds the loss window to the last second rather than the last snapshot.

**Managed PostgreSQL — 16 GB / 8 vCPU (≈ $240), standby for HA (≈ $480).** Load: votes arriving
as batched inserts of 500 rows plus `user_polls` and `vote_history` rows in the same batches,
≈ 800 personal-tab queries/s at ≈ 1 ms, one counter update per hot poll per flush window (a few
hundred rows every 2 s), the sweeps, admin, and up to 200 fallback searches/s if OpenSearch is
down. **Vote drain capacity — the ceiling the document's "no limit" rests on**: multi-row inserts on
an 8-vCPU node sustain ≈ 20,000–40,000 rows/s with the `votes` and `user_polls` indexes; the
research states **≈ 20,000 votes/s sustained** as the design figure, with the queue absorbing
bursts above it and the "queued" notice appearing when the backlog exceeds
`ENV_VOTE_QUEUE_LAG_NOTICE`. Above that sustained rate the next step is a larger node (32 GB /
16 vCPU ≈ $480) or partitioning `votes` by `poll_id` hash. Connections: 12 instances × 20 pooled
plus sweeps ≈ 260 of the 16 GB node's 397, through the managed PgBouncer pool. A read-only replica
(priced as the primary) is the next step if the personal-tab queries outgrow the primary's spare
CPU.

**Managed OpenSearch — 3 × 4 GiB (≈ $114)** for the 2,000/s sub-budget (§6.9 item 10).

**Spaces + CDN — $5**, with 1 TiB of transfer included; the TRENDING objects use ≈ 24 GB/h at peak.

**Egress** — ≈ $5.00–5.50 per peak hour (§6.2), dominated by search pages: ≈ $300–600 per month
at two to four peak hours a day.

The one number this research cannot source is the open-connection ceiling of one App Platform
instance; it matters only if push is ever adopted. The per-instance request rate behind the
1,250/s default, the shedding thresholds and the CPU target are engineering estimates fixed by the
load tests of §10.

### 6.11 Recommendation and the cost of each model

**Adopt the document as written** — it already contains every recommendation of this research —
and build it in the order the load bounds depend on each other: the cache/queue interface and
sessions first; the counters, flush and vote queue; the floors, budget and controller; shedding;
TRENDING and the delta protocol; search; autoscaling last, once the load test has fixed the
per-instance rate.

| Monthly, production at the load target (list prices) | A. Today's polling at 1M | B. The adopted model | C. Coalesced push to every viewer |
|---|---|---|---|
| App Platform instances | ≈ 80 × $10–29 = $800–2,300 | **≈ $117–155** (autoscaled 4–12 dedicated) | ≈ 24 × $20–29 = $480–700 |
| Managed Valkey (standby under B — the queue) | $30–60 | **$60** | $30–60 |
| Vote queue | — | **$0** (Valkey Streams) | — |
| Spaces + CDN | — | **$5** | — |
| Egress at 2–4 peak hours/day | ≈ $13,000 | **≈ $300–600** (deltas + CDN; ≈ $3.65/h of it is search pages) | ≈ $500 fully hot (≈ $0 quiet) |
| Postgres, OpenSearch (same under all) | $240–480; $114 | same | same |
| **Total** | **≈ $14,200–16,000**, and operationally infeasible | **≈ $850–1,400** | **≈ $1,020–1,630**, plus a reconnect storm per deploy and freshness the listings no longer require |

### 6.12 Near real-time refreshing when load is very low — resolved

The document asked whether the 15-second floor of earlier drafts had any reason to exist at low
load, and which defaults could improve the experience when the server has headroom. Both are now
resolved in the document; this section records the reasoning that led there.

**What a floor is for, once the budget exists.** Before the budget, a per-user floor was the only
protection the server had. With the effective budget, the search sub-budget, per-instance shedding
and the vote queue in place, **the floor no longer protects the server** — the controller does, at
any floor: the interval it hands out is floor × *k*, and *k* rises until the observed rate fits
the budget. Lowering the floor changes what users get *when there is headroom*, not what the server
has to survive. Four things still bound how low a floor can usefully go, and each is now answered:

| Consideration | Resolution in the document |
|---|---|
| Data does not change faster than it is flushed — polling a flushed projection below the flush interval returns identical data | Live Results reads the **live counters** (`cnt:<pid>`, `seq`), so the Live Results floor and the flush interval are independent (COUNTER FLUSH AND LIVE RESULTS FRESHNESS) |
| Votes are never lengthened by the budget, so a shared floor at 1 s would let a script vote every second | A separate **`ENV_MIN_VOTE_INTERVAL`** (2 s) per session across polls, plus the per-IP cap (VOTING AND SEARCH RATE LIMITS) |
| The controller reacts once per tick; a low floor lets a Live Results surge exceed the budget for a tick | The **predictive `k:live`** from the live registry (BUDGET CONTROLLER) |
| A manual Refresh below a few seconds is worse UX — a button re-enabling every second invites rapid clicking | **Per-kind floors**: manual Refresh 5 s, automatic Live Results 2 s, Search 2 s (HOME PAGE CHANGES) |

**What the adopted floor delivers.** At the 2-second floor the fleet keeps 9,500–17,500 Live
Results tabs at the floor (§6.4) and degrades in 2-second steps; the server's load is the same at
any floor, because the budget is the same. A 1-second Live Results floor is now a pure budget and
user-experience trade-off — the two changes that make it safe are both adopted — and costs
≈ +$30–95 per month at the load target (twice the live request rate, so half the population held
at the floor and double the Live Results egress), nothing at low load.

**The low-load defaults, all adopted**: TRENDING recompute 60 s (with the two-object split that
makes it cheaper than 600 s, §6.6.1); 5 polls per Live Results tab (one request regardless);
30-minute idle time (the budget, not the idle rule, protects the server; the registry still
reclaims abandoned pages); search cache 10 s and outbox drain 15 s (fresher counts, bounded by the
sub-budget); `ENV_MAX_STRETCH` 8 (with a 2 s floor, Search and Refresh stretch to 16 s and 40 s
before Live Results degrades at all); controller tick 1 s. Not lowered, and rightly: the page-load
limit and the per-IP guest floors (abuse bounds, not experience), and the TRENDING recompute below
a minute (the bucket sum is the one sweep whose cost is not trivial).

---

## 7. Schema sketch (Postgres)

```
polls            id PK, title, subtitle, choices JSONB, choice_labels TEXT, keywords TEXT,
                 search TSVECTOR (generated), home_listable BOOLEAN (generated, §4),
                 poll_state, poll_state_before_edit_update, poll_visibility, poll_sharing_mode,
                 vote_anonymity, choice_mode, vote_mutability, voter_count_limit,
                 created_by_id, created_by_name, created_at, start_at, end_at,
                 closed_at         (set on the transition to CLOSED — bookmark rule 2),
                 last_vote_at      (set by the counter flush — bookmark rule 3),
                 vote_count, invited_count, banned_count, choice_counts JSONB,
                 content_version BIGINT (bumped by any state or content change),
                 counts_version BIGINT  (the per-vote seq as of the last flush) — the pair behind §6.7.3,
                 edit-lock and screening columns as today
                 (topics: deferred by the document; no column now)
votes            (poll_id, email) PK, user_name, choice_ids TEXT[], voted_at
                 — written by the queue consumer in batches; ON CONFLICT per vote_mutability
poll_invitations (poll_id, email) PK
poll_bans        (poll_id, email) PK
bookmarks        (email, poll_id) PK, created_at; index (poll_id) for the expiry sweep;
                 ≤ ENV_MAX_BOOKMARKS_PER_USER (200) rows per email, checked on insert
user_polls       (email, poll_id, relation) PK, updated_at — relation ∈ {created, invited, voted, bookmarked};
                 index (email, updated_at DESC); written in the same transaction as the source row
                 (for 'voted', in the consumer's batch).
                 My PRIVATE POLLS: WHERE email = $me AND poll_visibility = 'Private Poll' (joined to polls)
                 Favourites:       WHERE email = $me AND relation IN ('created','voted','bookmarked') AND poll_visibility = 'Public Poll'
vote_history     id, poll_id, email, user_name, choice_ids, voted_at — PARTITION BY RANGE (voted_at)
search_outbox    poll_id PK, version, reason
```

Choices stay JSONB because they are edited as a unit and capped by `ENV_MAX_CHOICES`;
`choice_labels` (written on save) lets the generated `tsvector` include them; `choice_counts` lets
a listing, a search document and the flushed row be built from the poll row alone. Votes,
invitations and bans become rows so a public poll's participation is unbounded and the composite
keys enforce one-vote-per-participant and no-duplicate-invitations in the database.

Valkey keys: `sess:<token-hash>` (`ENV_SESSION_CACHE_TTL`), `floor:<kind>:<session|ip>` (the
kind's floor), `votes-ip:<ip>` (1 min), `budget:<second>`, `search-budget:<second>`, `k:search` /
`k:refresh` / `k:live`, `instance:<id>` (30 s), `live:active` (sorted set, pruned by the
controller), `pageload:<session|ip>` (1 min), `cnt:<pid>` (hash: choice counts, `total`, `seq`),
`trend:<bucket>` (hash, twelve live buckets), `listing:<name>` (bytes + version), `poll:<pid>`
(content projection + `content_version`), `search:<hash>` (bytes, `ENV_SEARCH_CACHE_TTL`),
`lock:<sweep>`, and the stream `votes` with consumer group `writers`.

---

## 8. Keeping `searchText`, the counters and the search engine in sync

- `searchText` is a **pure function of the poll** (`title`, `subtitle`, choice labels,
  `keywords`) recomputed by the same code path on every save. In Postgres it is a generated
  column and cannot drift; the OpenSearch document is built by the same function.
- **Counters — accumulated in the cache and flushed, as the document requires.** A vote does
  `HINCRBY cnt:<pid> <choiceId> 1`, `HINCRBY cnt:<pid> total 1` and `HINCRBY cnt:<pid> seq 1` in
  Valkey and is appended to the vote stream (§6.5); the flush sweep (every
  `ENV_COUNTER_FLUSH_INTERVAL`, 2 s, under the sweep lock) reads the dirty pids, writes their
  `choice_counts`, `vote_count`, `last_vote_at` and `counts_version` (the `seq` at flush time) in
  one `UPDATE … FROM (VALUES …)`, and upserts them into `search_outbox`. A poll receiving 2,000
  votes/s is 2,000 × 3 Valkey increments and **one** row update per window. **Live Results does
  not wait for the flush**: it reads `cnt:<pid>` directly with `seq` as `counts_version`, so the
  flush interval and the Live Results floor are independent. A nightly reconcile
  (`UPDATE … SET vote_count = (SELECT count(*) …)`) corrects any drift — including a queue loss —
  and if Valkey is lost the counters rebuild from `votes` the same way. `invited_count` and
  `banned_count` are updated in the roster transaction directly.
- **Transactional outbox** for the engine: `search_outbox (poll_id PK, version, reason)`, upserted
  in the same transaction as any change to searchable fields, state or visibility, and by the
  counter flush; a sweep drains it every `ENV_OUTBOX_DRAIN_INTERVAL` (15 s) in batches. Coalescing
  on `poll_id` means a poll receiving thousands of votes a minute costs one engine update per
  drain; `reason = 'counters'` sends only numbers. A full re-index is "insert every id into the
  outbox".
- **Sweeps** — approval, schedule, counter flush, trending recompute and publish, outbox drain,
  bookmark removal, nightly reconcile, budget controller — each take `pg_try_advisory_lock` per
  tick so they run once site-wide; the vote consumer is a consumer group on every instance.

---

## 9. Total monthly cost

**Development** (one instance, no load): Postgres $15, in-process cache, queue and registry,
S1 at the fallback sub-budget — **$15** (the same as today's managed database); +$19 for a
single-node OpenSearch if parity with production is wanted locally.

**Production at the load target** (the adopted model, §6.11): App Platform ≈ $117–155
(autoscaled), Postgres $240–480, OpenSearch $114, Valkey with standby $60, Spaces $5, vote queue
$0, egress ≈ $300–600 → **≈ $850–1,400 per month**. The levers are the Postgres standby, the
search-page egress and peak hours per day. Storage above the included disk: $0.21/GiB. Every
option considered, with its cost, is in §3 (datastore), §4.6 (search), §6.5 (queue), §6.7
(refresh transports), §6.9 (search cluster by sub-budget), §6.10 (fleet) and §6.11.

---

## 10. Development and test environment

- **BetterAuth**: `database: new Pool({ connectionString })`; `npx @better-auth/cli generate`
  emits the auth tables; the case-insensitive unique `userName` becomes a unique index on
  `lower(user_name)`. The session cache-aside sits in the app's own session helper, behind the
  same cache interface as everything else; `cookieCache` is not used.
- **Cache and queue interface**: one module with `get/set/incr/hincrby/hgetall/zadd/zcard/expire/
  lock/xadd/xreadgroup/xack` implemented twice — an in-process version (development, tests,
  `ENV_VALKEY_URL` unset) and a Valkey client (production). Every feature above is written against
  the interface, so the queue adapter is the only file that changes if the queue technology were
  ever replaced.
- **Query layer**: Kysely (typed SQL builder, already a transitive dependency of BetterAuth) with
  its `Migrator` for versioned SQL migrations applied at boot. No ORM.
- **Tests**: `embedded-postgres` starts a real Postgres per Vitest worker (Windows included;
  `pg_trgm` is a contrib module and is present); the in-process cache/queue serves the suite; an
  integration test exercises the Valkey client and skips when `ENV_VALKEY_URL` is unset; the
  `EXPLAIN` guard of §5 runs in the suite; the controller (multipliers, order, caps, the effective
  budget following the heartbeat count, the predictive `k:live` and activity factor), the per-kind
  floors and per-IP vote cap, the search sub-budget and its fallback, shedding and its order, the
  counter flush and `seq`, the trending computation and two-object publish, the consumer's
  idempotent batch insert and graceful shutdown, and the version-keyed delta are unit-tested
  against the in-process implementation.
- **Local dev on Windows 11**: the PostgreSQL installer or Docker Desktop; S1 needs nothing else;
  OpenSearch locally is Docker-only.
- **Seed**: a 250,000-poll generator with a realistic vote skew (a few hundred polls receiving
  most votes) so the trending sweep, `user_polls` and the counter flush are exercised at shape.
- **Load test**: (a) refresh-class requests at the effective budget against the fleet, to confirm
  the controller converges, the fleet holds its budget at the 70% CPU target, and the shedding
  thresholds are right; (b) votes/s against one poll to measure consumer lag and the batch-insert
  ceiling; (c) a Live Results surge, to confirm the predictive multiplier prevents a `503`
  transient; (d) a page-load storm against §6.6. These fix the per-instance rate behind the
  1,250/s default, the shedding thresholds and the CPU target.
- **Env** — the document's variables with its defaults, followed by the variables this research
  proposes. Each follows the project's env-var checklist (`src/config.ts`, `launch.json.example`,
  `devScripts.example/launch-dev.ps1`, the CLAUDE.md table). Removed: `ENV_MONGODB_NAME`,
  `ENV_MONGODB_URI`, and `ENV_POLLING_INTERVAL` (retired — no voter-facing page polls on it once
  Live Results uses `ENV_MIN_LIVE_REFRESH_INTERVAL`); the admin-page variables and the
  `ENV_EMAIL_RATE_LIMIT_*` variables are retained. The autoscaling settings (instance size,
  minimum, maximum, CPU target) live in the app spec, not in `ENV_` variables.

| ENV_ variable name | Default value | Notes |
|---|---|---|
| `ENV_DATABASE_URL` | `postgres://localhost:5432/app01` | PostgreSQL connection string; replaces the MongoDB variables. In production, the managed pool's (PgBouncer) URL |
| `ENV_VALKEY_URL` | unset | Valkey connection string. Unset selects the in-process cache, queue and registry (development, tests) |
| `ENV_OPENSEARCH_URL` | unset | OpenSearch endpoint. Unset selects PostgreSQL full-text search (S1) at the fallback sub-budget; set selects OpenSearch (S2) with S1 as the fallback |
| `ENV_SPACES_BUCKET`, `ENV_SPACES_CDN_URL` | unset | Proposed. Where the trending sweep publishes the two TRENDING objects; unset serves them from the instance cache only (§6.6) |
| `ENV_SESSION_CACHE_TTL` | `300000` | Session cache-aside lifetime (ms); deleted on logout |
| `ENV_MAX_POLLS_SEARCH_RESULTS` | `200` | Cap on home search results; also the cap on each personal tab |
| `ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS` | `200` | Cap on admin search results |
| `ENV_MAX_TRENDING_POLLS` | `200` | Polls in TRENDING |
| `ENV_TRENDING_POLLS_RECOMPUTE_INTERVAL` | `60000` | TRENDING recompute and publish interval (ms); also the CDN `max-age` and the client-copy lifetime (§6.6.1) |
| `ENV_MIN_LIVE_REFRESH_INTERVAL` | `2000` | Floor for the automatic Live Results refresh (ms). Independent of `ENV_COUNTER_FLUSH_INTERVAL` because Live Results reads the live counters (§8); may be set as low as the budget allows (§6.12) |
| `ENV_MIN_MANUAL_REFRESH_INTERVAL` | `5000` | Floor for the Refresh button and tab clicks (ms); a UX choice, not a load bound |
| `ENV_MIN_SEARCH_INTERVAL` | `2000` | Floor for searches (ms) |
| `ENV_MIN_VOTE_INTERVAL` | `2000` | Floor for votes (ms), per session across all polls; the only per-user bound on votes, which the budget never lengthens (§6.5) |
| `ENV_MAX_VOTES_PER_IP_PER_MINUTE` | `60` | Per-IP vote cap — defence in depth against many sessions behind one address (§6.5) |
| `ENV_MAX_LIVE_RESULTS_PER_USER` | `5` | Polls in a user's Live Results tab (LRU); one request per refresh regardless |
| `ENV_MAX_IDLE_TIME` | `1800000` | Live Results idle time before the prompt (ms); the registry prunes at this plus one interval |
| `ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND` | `1250` | Dynamic-request budget per live instance; the effective budget is this × the heartbeat count (§6.4) |
| `ENV_SERVER_MAX_REFRESH_PER_SECOND` | `15000` | Cap on the effective budget (the value at 12 instances) |
| `ENV_SERVER_MAX_SEARCH_PER_SECOND` | `2000` | Search sub-budget in engine queries/s (cache hits excluded); does not follow the fleet; sizes the OpenSearch cluster (§6.9) |
| `ENV_SERVER_MAX_SEARCH_PER_SECOND_FALLBACK` | `200` | Sub-budget while PostgreSQL full-text serves searches |
| `ENV_BUDGET_CONTROLLER_INTERVAL` | `1000` | Controller tick (ms); must not exceed the smallest floor |
| `ENV_MAX_STRETCH` | `8` | Cap on the Search and Refresh multipliers, as a multiple of the floor; Live Results is uncapped |
| `ENV_BUDGET_LOWER_THRESHOLD_PERCENT` | `80` | Budget utilisation below which the multipliers are lowered, one step per tick |
| `ENV_INSTANCE_MAX_INFLIGHT` | `200` | In-flight requests above which an instance sheds with `503`; set by the load test (§6.3) |
| `ENV_INSTANCE_MAX_EVENT_LOOP_LAG` | `100` | Event-loop lag (ms) above which an instance sheds |
| `ENV_SHED_RETRY_AFTER` | `2000` | `Retry-After` handed out when shedding (ms); the client adds 0–1 s of jitter |
| `ENV_COUNTER_FLUSH_INTERVAL` | `2000` | Counter flush interval (ms); independent of the Live Results floor (§8) |
| `ENV_VOTE_BATCH_SIZE` | `500` | Rows per consumer batch insert (§6.5) |
| `ENV_VOTE_QUEUE_LAG_NOTICE` | `2000` | Consumer lag (ms) above which a vote response reports `status: "queued"` |
| `ENV_SEARCH_CACHE_TTL` | `10000` | Lifetime of a cached search response (ms); key = normalised query + scope |
| `ENV_OUTBOX_DRAIN_INTERVAL` | `15000` | Search outbox drain interval (ms); the index lags a change by at most this |
| `ENV_MAX_BOOKMARKS_PER_USER` | `200` | Bookmark cap, checked on insert |
| `ENV_BOOKMARK_EXPIRY_MONTHS` | `6` | Proposed. Age after which a CLOSED or vote-less OPEN poll leaves bookmark lists |
| `ENV_PAGE_LOADS_PER_MINUTE` | `20` | Proposed (§6.6). Per-client page-load limit applied to `/api/me` and to listings not served from the CDN |

---

## 11. Recommendation

1. **Datastore: DigitalOcean Managed PostgreSQL** — $15 in development; 16 GB / 8 vCPU at the load
   target, sized by the batched vote inserts and personal-tab queries rather than by 250,000 polls.
2. **Home search: DO Managed OpenSearch (S2) in production; Postgres full-text (S1) in
   development, tests and as the fallback at the fallback sub-budget.** At the 2,000/s sub-budget
   S1's CPU per query would cost ten Postgres nodes; S2 does it for $114 and is the only managed
   search product on DigitalOcean. No SaaS search (per-query pricing reaches hundreds of thousands
   per month) and no vector store.
3. **Refresh model: the document as written** — no automatic tab refresh, no guest refresh,
   TRENDING as two CDN objects, per-kind floors, an effective budget that follows the fleet with a
   controller that stretches Search, then Refresh, then Live Results and predicts the live
   population rather than observing it, a search sub-budget that sizes the engine, and per-instance
   shedding as the millisecond backstop. Of the alternatives (§6.7): coalesced push to every viewer
   is feasible but costs ≈ 24 instances and a reconnect storm per deploy to deliver freshness the
   listings no longer need; SSE per poll remains the documented upgrade for Live Results; Web Push
   notifications are unsuitable for live data and are reserved for rare per-user events.
   **Version-keyed deltas** are adopted for every refresh so that only changed data travels.
4. **Vote queue: Valkey Streams as the single always-on vote path** (§6.5) — validate
   synchronously, count in Valkey, append, respond with the counts; a consumer group inserts in
   batches; "queued" is a status reported when consumer lag exceeds a threshold. $0 extra; a loss
   window of about one second on a Valkey failure — the window the document accepts — corrected in
   tally by the nightly reconcile; drain capacity ≈ 20,000 votes/s sustained; abuse bounded per
   session and per IP. DO Managed Kafka (≈ $150+) only if the durability requirement ever tightens
   to zero loss; RabbitMQ — the document's example — only if a broker is wanted for other reasons.
5. **Sufficiency**: the adopted changes are sufficient — the effective budget and the per-kind
   floors make the server's dynamic load a configuration value that grows with the fleet, and
   every condition earlier revisions attached to that verdict is now in the document (§6.8).
6. **Browser-Refresh storms** (§6.6): a page load costs one Valkey read — immutable assets and the
   two TRENDING objects on the CDN, a `sessionStorage` copy revalidated with `304`s, a cacheable
   `/api/config`, and a per-IP page-load bucket that degrades to the stored copy rather than an
   error page.
7. **Near real-time when load is low** (§6.12): resolved by the per-kind floors (Live Results 2 s,
   manual 5 s, Search 2 s, Vote 2 s), live-counter reads, the predictive controller and the low-load
   defaults — TRENDING every 60 s, 5-poll Live Results tab, 30-minute idle time, 10 s search cache,
   15 s outbox drain, `ENV_MAX_STRETCH` 8. A 1 s Live Results floor is available by changing one
   default, at ≈ +$30–95 per month at the load target.
8. **Instances and shared cache at the load target**: one App Platform instance in development;
   **autoscaling 4–12 dedicated-CPU instances (1 vCPU / 2 GiB, 70% CPU; 8 at the load target)**
   and **Managed Valkey 2 GiB with standby** in production. Estimated total **≈ $850–1,400 per
   month**, against ≈ $14,000–16,000 for the current refresh model at the same concurrency.

---

## 12. Sources

- DigitalOcean Managed PostgreSQL pricing and limits — https://docs.digitalocean.com/products/databases/postgresql/details/pricing/ , https://docs.digitalocean.com/products/databases/postgresql/details/limits/
- DigitalOcean Managed OpenSearch pricing — https://docs.digitalocean.com/products/databases/opensearch/details/pricing/
- DigitalOcean Managed Valkey pricing — https://docs.digitalocean.com/products/databases/valkey/details/pricing/
- DigitalOcean Managed Kafka pricing — https://docs.digitalocean.com/products/databases/kafka/details/pricing/
- DigitalOcean App Platform pricing, scaling and autoscaling — https://docs.digitalocean.com/products/app-platform/details/pricing/ , https://docs.digitalocean.com/products/app-platform/how-to/scale-app/
- DigitalOcean Spaces pricing (CDN, included transfer) — https://docs.digitalocean.com/products/spaces/details/pricing/
- DigitalOcean Droplet pricing — https://www.digitalocean.com/pricing/droplets
- DigitalOcean pgvector support — https://docs.digitalocean.com/products/vector-databases/postgresql/
- PostgreSQL full-text search — https://www.postgresql.org/docs/current/textsearch.html ; `pg_trgm` — https://www.postgresql.org/docs/current/pgtrgm.html ; advisory locks — https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS ; `NOTIFY` — https://www.postgresql.org/docs/current/sql-notify.html
- Valkey streams and consumer groups — https://valkey.io/topics/streams-intro/ ; sorted sets — https://valkey.io/topics/data-types/#sorted-sets ; pub/sub — https://valkey.io/topics/pubsub/
- RabbitMQ — https://www.rabbitmq.com/docs
- HTTP caching (`Cache-Control`, `ETag`, `304`) — https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching
- Server-Sent Events (WHATWG) — https://html.spec.whatwg.org/multipage/server-sent-events.html
- Push API (W3C) and the `web-push` library — https://www.w3.org/TR/push-api/ , https://github.com/web-push-libs/web-push
- JSON Patch (RFC 6902) and JSON Merge Patch (RFC 7386) — https://www.rfc-editor.org/rfc/rfc6902 , https://www.rfc-editor.org/rfc/rfc7386
- Better Auth PostgreSQL — https://better-auth.com/docs/adapters/postgresql
- embedded-postgres (npm) — https://github.com/leinelissen/embedded-postgres
- Cloudflare rate-limiting rules (free tier) — https://developers.cloudflare.com/waf/rate-limiting-rules/
- Typesense Cloud pricing — https://www.xpay.sh/saas-pricing/typesense/
- Meilisearch Cloud pricing — https://www.meilisearch.com/pricing
- Algolia Grow billing — https://support.algolia.com/hc/en-us/articles/15745996583441-How-am-I-billed-on-the-Grow-plan
- Pinecone pricing analysis — https://pecollective.com/tools/pinecone-pricing/
- Voyage AI embedding pricing — https://docs.litellm.ai/docs/providers/voyage

---

## 13. Speckit Implementation Readiness Status

**Status: ready.** This research is complete against the source document as it stands, has no
outstanding clarifications, and every recommendation it made has been adopted into the source
document by name and carried into
`017-high-level-requirements-SEARCH-AND-SCALABILITY-DATABASE-SCENARIO-2.md`, the document that
`/speckit-specify` and `/speckit-mdd-architecture` consume. The three documents agree on every
default. What each skill can take from here, and what it will still have to decide, is set out
below.

### What is settled for `/speckit-specify`

| Area | Settled | Where |
|---|---|---|
| Datastore and schema | Managed PostgreSQL; Kysely with boot-time migrations; BetterAuth on PostgreSQL; the table sketch with every new column (`home_listable`, `search`, `closed_at`, `last_vote_at`, `choice_counts`, `content_version`, `counts_version`), the `user_polls`, `bookmarks` and `search_outbox` tables, monthly `vote_history` partitions; MongoDB removed with its auth collections | §3, §7 |
| Search | OpenSearch in production, PostgreSQL full-text in development/tests/fallback behind one interface; the scope column; the AND → OR → typo chain; the best-match order; the `truncated` flag; the normalised-key result cache (10 s); the outbox drained every 15 s; the sub-budget (2,000) and its fallback (200) | §4, §6.9, §8 |
| Admin search | The predicate for every control, the index set, the day-window rule, the `EXPLAIN` guard | §5 |
| Home page and refresh | The tabs and their queries; TRENDING from bucketed counters every 60 s as two CDN objects; per-kind floors; the 5-poll Live Results LRU served from the live counters with registry expiry and the hidden-page pause; bookmarks and their daily sweep; guests | §6.2, §6.3, §6.6, §8 |
| Server load budget | The effective budget following instance heartbeats (1,250 × instances, cap 15,000); the controller (tick 1 s, three multipliers, priority order, `ENV_MAX_STRETCH` 8, 80% lowering, predictive `k:live` with the activity factor); the `nextRefreshMs` / `429` / `503` contract | §6.4 |
| Load shedding | In-flight 200 / event-loop lag 100 ms, `Retry-After` 2 s, shedding order with votes and the health check last, client retry rules | §6.3 |
| Autoscaling | Dedicated-CPU 1 vCPU / 2 GiB, 4–12 at 70% CPU (app-spec settings), statelessness, graceful shutdown, connection arithmetic | §6.7.4, §6.10 |
| Votes | The single path, the Valkey Streams queue, the consumer group and its idempotent batch insert, the `status` field, the accepted loss window, the drain ceiling, the per-session and per-IP abuse bounds | §6.5, §6.10 |
| Refresh protocol | Version-keyed deltas: the request (`{pid: [content_version, counts_version]}` + membership version) and the four response shapes; the two-object TRENDING | §6.6, §6.7.3 |
| Page loads | Immutable assets, CDN TRENDING, the `sessionStorage` copy, cacheable `/api/config`, the page-load bucket that degrades rather than errors | §6.6 |
| Operations | Sweeps under advisory locks; sessions cache-aside with `cookieCache` forbidden; the cache/queue interface with two implementations | §8, §10 |
| Configuration | Every environment variable with its default (the document's and the research's) | §10 |
| Verification | The `EXPLAIN` test, the unit-test list, the 250k seed, the four load tests | §10 |

### What `/speckit-specify` will still have to decide

These are implementation details deliberately left open; none changes an architectural decision.

- The exact wire shapes: endpoint paths, the delta request/response JSON, the two TRENDING object
  schemas, the vote response body, the error bodies for `429` and `503`. The research fixes the
  fields (`nextRefreshMs`, `retryAfterMs`, `status`, `truncated`, the version pairs, the membership
  version), not the paths.
- The client-side state machine for the tabs, the per-kind disabled states, the Live Results
  LRU, the idle prompt, the hidden-page pause, the `sessionStorage` copy and the retry-after-`429`
  handling of a pending vote — the document defers UI/UX.
- The migration file set and their order; the Kysely type definitions.
- The OpenSearch index mapping and analyzer, and the query DSL for the three passes.
- How `created_by_name` is refreshed when a user renames themselves (a trigger, or the profile
  route writing it).
- The consumer's reclaim policy (`XAUTOCLAIM` idle time), the stream trim policy, and the exact
  activity-factor smoothing in the controller.
- The `.do/app.yaml` autoscaling stanza and the health-check path exempted from shedding.

### What is settled for `/speckit-mdd-architecture`

The research fixes the components and every interaction between them: an autoscaled fleet of 4–12
stateless App Platform instances behind the edge; a Spaces + CDN origin for static assets and the
two TRENDING objects; Managed Valkey (2 GiB, standby) as the shared cache, floor and budget store,
live registry, counter accumulator and vote queue; Managed PostgreSQL (16 GB / 8 vCPU, standby)
as the system of record with the managed pool in front; Managed OpenSearch (3 × 4 GiB) fed by the
outbox; the sweeps (approval, schedule, counter flush, trending recompute and publish, outbox
drain, bookmark removal, nightly reconcile, budget controller) each under an advisory lock; and
the consumer group on every instance. The data flows to diagram are: a page load (§6.6), a tab
refresh with deltas (§6.7.3), a vote from request to row (§6.5 → §8), a Live Results cycle under
the controller (§6.4), a search through the cache to either engine under the sub-budget (§4), the
TRENDING recompute and two-object publish (§6.6), and the three load bounds acting at three
timescales (§6.3, §6.4, §6.7.4). The blast radius of the cross-cutting rules — counters written
to rows only by the flush; `home_listable` as the only scope predicate; the live hash as the only
source of Live Results counts; the health check exempt from shedding — is stated so the
architecture can name every reader of each.

### What is not covered, by the document's own decision

- The UI/UX of the tabbed home page and the topics control (a future requirement).
- Database changes for topics (a future requirement; §6.9 item 3 reserves the listing mechanism).
- Any push transport (SSE per poll is the documented upgrade for Live Results, §6.7) and Web Push
  notifications (reserved for rare per-user events).
- Edge rate limiting outside DigitalOcean.
- Data migration from MongoDB (none; accounts are re-created).

### Residual risks the specs should carry as assumptions

- DigitalOcean list prices were not re-verified from this environment; the totals in §6.11 and §9
  are order-of-magnitude and the specs should not cite them as commitments.
- The per-instance request rate behind the 1,250/s default, the shedding thresholds, the CPU
  target and the vote drain ceiling (≈ 20,000 votes/s) are engineering estimates; the load tests
  in §10 are what fix them, and the specs should make those tests deliverables rather than assume
  the numbers.
- The search-cache hit rate — which turns the 2,000/s sub-budget into the user-visible search
  rate — is a load-test output, not an assumption.
- The open-connection ceiling of one App Platform instance is unsourced; it matters only if the
  push upgrade is ever built.
