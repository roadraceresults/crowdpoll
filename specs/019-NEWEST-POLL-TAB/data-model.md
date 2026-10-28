# Data Model: Newest Poll Tab

**Phase 1 output**. One new column and one new index on `polls`; three new cache keys; two new
published objects with the Trending shapes; one browser storage key; two settings. Nothing else
in the data model changes.

## 1. `polls.launched_at`

| Column | Type | Nullable | Default | Meaning |
|---|---|---|---|---|
| `launched_at` | `timestamptz` | yes | `NULL` | When the poll most recently entered the OPEN state; `NULL` while it has never opened since creation, deployment of this feature, or its last close |

Not part of the `Poll` domain object, `projectPoll`, the card, the editor, or the exports
(assumption A1). Read only by `newestQuery`.

### Lifecycle

| Transition (`before.poll_state` → `$set.pollState`) | `launched_at` | Where |
|---|---|---|
| any non-OPEN, non-(EDITING-from-OPEN) → OPEN | `= now()` | `updatePoll` |
| EDITING with `poll_state_before_edit_update = 'OPEN'` → OPEN | unchanged | `updatePoll` |
| EDITING with prior WAITING TO OPEN → OPEN (start now past) | `= now()` | `updatePoll` |
| CLOSED → OPEN (administrator re-opens) | `= now()` (a fresh launch) | `updatePoll` |
| any → CLOSED | `= NULL` | `updatePoll` |
| OPEN → EDITING | unchanged (still eligible) | — |
| EDITING → WAITING TO OPEN | unchanged, stale; ineligible by state until it re-opens | — |
| WAITING TO OPEN → CLOSED, CLOSED → ARCHIVED | already `NULL` | — |
| insert with `pollState = 'OPEN'` | `= start_at ?? created_at` | `insertPoll` |
| insert with any other state | `NULL` | `insertPoll` |
| rows existing at migration time | `NULL` (no backfill) | migration `005-launched-at` |
| scale seed rows with `poll_state = 'OPEN'` | `= created_at` | `devScripts/populate/seed-polls.ts` |

### Index

```
create index polls_home_launched
  on polls (launched_at desc, vote_count desc, id desc)
  where home_listable and launched_at is not null
```

Matches `newestQuery`'s filter and order exactly, so the recompute is an index walk that stops
after `ENV_MAX_NEWEST_POLLS` eligible entries. `home_listable` is the stored generated column
from `002-polls.ts`. Entries move when `vote_count` is flushed (every
`ENV_COUNTER_FLUSH_INTERVAL` for dirty polls) — the same maintenance the existing
`polls_vote_count` index already pays, on a much smaller set. Guarded by
`tests/db-explain-guard.test.ts` (`"Newest"` entry).

### Migration `005-launched-at`

`up`: `alter table polls add column launched_at timestamptz;` then the index above.
`down`: drop the index, drop the column. Registered as `"005-launched-at"` in
`src/db/migrations/index.ts`. No data statement.

## 2. The Newest listing (`recomputeNewest`)

Eligibility predicate (`listablePolls`, shared with Trending):
`home_listable = true and (poll_state = 'OPEN' or (poll_state = 'EDITING' and poll_state_before_edit_update = 'OPEN'))`
— plus `launched_at is not null`.

Order: `launched_at desc, vote_count desc, id desc`. Limit: `config.maxNewestPolls`.

Result type: the existing `TrendingListing` —
`{ membershipVersion, recomputedAt, order, projections, counts, countsObject, cardsObject }` —
where `membershipVersion = sha256(sorted ids)` and `counts` come from `readOrRebuildCounts`
(live `cnt:<pid>` hashes and their `seq`), never from the row.

## 3. Cache keys

| Key | Type | Content | Written by |
|---|---|---|---|
| `listing:newest:counts` | string | `NewestCountsObject` as JSON | every `recomputeNewest` |
| `listing:newest:cards` | string | `NewestCardsObject` as JSON | every `recomputeNewest` |
| `listing:newest:meta` | hash | `{ membershipVersion, recomputedAt }` | every `recomputeNewest` |

Read by `readNewestObjects(cache)` for the instance routes; `null` when either object is absent
→ `503 newest-not-ready`.

## 4. Published objects

Same shapes as `TrendingCountsObject` and `TrendingCardsObject` (`src/trending/recompute.ts`),
same OpenAPI schemas (`TrendingCounts`, `TrendingCards`).

| Object | CDN key / instance path | Republished | Cache-Control |
|---|---|---|---|
| counts | `newest-counts.json` / `GET /api/trending/newest-counts.json` (alias `/api/trending/newest-counts`) | every recompute | `public, max-age=<ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL / 1000>` |
| cards | `newest.json` / `GET /api/trending/newest.json` (alias `/api/trending/newest-cards`) | when `membershipVersion` differs from the last published | same |

```
NewestCountsObject = {
  membershipVersion: string,          // sha256 of the sorted ids
  recomputedAt: string,               // ISO
  polls: [{ pid, voteCount, choiceCounts: { [choiceId]: n }, countsVersion }]   // in Newest order
}
NewestCardsObject = {
  membershipVersion: string,
  cards: { [pid]: PollProjection }    // the card content, with contentVersion
}
```

Both gzipped when PUT to Spaces (`ContentEncoding: gzip`, `ACL: public-read`).

## 5. Browser copy

| Key | Store | Content | Lifetime |
|---|---|---|---|
| `newest:copy` | `sessionStorage` | `{ counts: NewestCountsObject, cards: NewestCardsObject, receivedAt: epoch ms }` | rendered on page load while `Date.now() - receivedAt < newestRecomputeIntervalMs`; always kept for the `TooManyLoads` case, as Trending's is |

Tab state: the shared `DeltaClient.createTabState()` — `order`, `cards`, `counts`, `overlay`,
`membershipVersion`, `receivedAt`.

Browser bucket: `KIND_OF.newest = "newest"`, capacity `bursts.refresh`, interval
`floors.refresh` (the stretched value a response hands back applies as for Trending).

## 6. Settings

| Setting | `AppConfig` field | Default | Bound | Surfaced |
|---|---|---|---|---|
| `ENV_MAX_NEWEST_POLLS` | `maxNewestPolls` | 50 | positive integer; ≤ `ENV_MAX_POLLS_SEARCH_RESULTS` | `config.ts`, both launch templates, `.do/app.yaml`, CLAUDE.md table, `config.test.ts` |
| `ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL` | `newestRecomputeIntervalMs` | 60000 | positive integer ≥ 1000 | the same, plus `/api/config.newestRecomputeIntervalMs` and `openapi.json` |

Sweep: `SWEEP_LOCKS.newest = 10`, interval `newestRecomputeIntervalMs`, `runAtStart: true`.
