# Phase 0 Research: Newest Poll Tab

Ten decisions. Each records what was chosen, why, and what was rejected. No
`[NEEDS CLARIFICATION]` items remained from the specification, so nothing here resolves an
unknown — these are the choices the implementation would otherwise make ad hoc, plus the three
places (R1, R2, R6) where the obvious copy of Trending's code is wrong or wasteful.

---

## R1 — `launched_at` is stamped and cleared in `updatePoll`, beside `closed_at`; no backfill

**Decision**: in `updatePoll` (`src/polls/store.ts`), after `columnsFor($set)` and beside the
existing `closed_at` line:

```
if ($set.pollState === "OPEN" && before.poll_state !== "OPEN"
    && !(before.poll_state === "EDITING" && before.poll_state_before_edit_update === "OPEN"))
  columns.launched_at = new Date();
if ($set.pollState === "CLOSED" && before.poll_state !== "CLOSED") columns.launched_at = null;
```

In `insertPoll`'s column mapping, beside `closed_at`:
`launched_at: poll.pollState === "OPEN" ? poll.startAt ?? poll.createdAt : null`. The migration
`005-launched-at` adds the nullable column and the index (R2) and performs no `UPDATE`.

**Rationale**: every transition into or out of OPEN — the approval sweep, the schedule sweep,
the stale-edit release, the admin PATCH, the editing publish — calls `updatePoll`, which already
reads the row `for update` as `before`, so the rule has one home and the `before` row carries
both fields it needs. Excluding `EDITING` with `poll_state_before_edit_update = 'OPEN'` is what
keeps "publish an edit" from counting as a launch (FR-002); `EDITING` with a prior
`WAITING TO OPEN` whose start has passed *is* a launch and is correctly stamped. Clearing on
CLOSED, not on every exit from OPEN, is the spec's rule (FR-003/004) and is all that is needed:
archiving is only ever from CLOSED, and a poll edited to WAITING TO OPEN is filtered by state
until it re-opens and is re-stamped. `startAt ?? createdAt` at insert mirrors
`closed_at: endAt ?? createdAt` so fixtures rank by the dates they declare (FR-005). No backfill
is the developer's decision (FR-006); the seed script writes the column itself (R9).

**Alternatives considered**: a database trigger — rejected: the project keeps state rules in
`store.ts`/`service.ts` where tests exercise them, and a trigger would silently fire on the seed
script's direct inserts, which the requirements say must set the value explicitly. Deriving
"launched" from `start_at ?? created_at` at query time — rejected: neither is cleared on close
or refreshed on re-open, so a re-opened poll would rank by a stale date. Stamping in
`service.ts`'s transition helpers — rejected: there are five callers; `updatePoll` is the one
chokepoint.

---

## R2 — One indexed query, `newestQuery`, shared `listablePolls` predicate, no in-memory merge

**Decision**: in `src/trending/recompute.ts`, lift the local `listable` arrow inside
`recomputeTrending` to a module-level `listablePolls(db)` and use it from both recomputes. Add:

```
export const NEWEST_KEYS = { counts: "listing:newest:counts", cards: "listing:newest:cards", meta: "listing:newest:meta" };
export function newestQuery(db, cap) {
  return listablePolls(db).selectAll()
    .where("launched_at", "is not", null)
    .orderBy("launched_at", "desc").orderBy("vote_count", "desc").orderBy("id", "desc")
    .limit(cap);
}
export async function recomputeNewest({ db, cache, config }, now = new Date()): Promise<TrendingListing>
export async function readNewestObjects(cache)
```

`recomputeNewest` runs `newestQuery(db, config.maxNewestPolls)`, then the same tail as
`recomputeTrending`: `projectPoll` + `refreshProjection` per row, `readOrRebuildCounts(order)`,
`membershipVersionOf(order)`, build the two objects, write the three cache keys. It returns the
existing `TrendingListing` shape. The migration creates
`polls_home_launched on polls (launched_at desc, vote_count desc, id desc) where home_listable and launched_at is not null`
with a comment linking https://www.postgresql.org/docs/16/indexes-partial.html.
`tests/db-explain-guard.test.ts` adds `"Newest": newestQuery(ctx.db, 50)` to `listings()`.

**Rationale**: Trending merges "recently voted" (from cache buckets) with "top by lifetime
votes" and sorts in memory because its key is not a column. The Newest key is a column, so the
database ranks and `LIMIT` returns exactly `cap` rows; with the partial index in the query's
exact order the plan is an index walk that stops after `cap` eligible entries. `home_listable`
is a stored generated column, so it can appear in the index predicate; `launched_at is not null`
keeps the index to open-or-recently-open public polls (small on a million-row table). The state
predicate (`OPEN` or `EDITING`-from-`OPEN`) stays as a filter over the walk — a stale
`WAITING TO OPEN` entry is skipped and the walk continues, so the tab still gets `cap` rows.
Returning `TrendingListing` lets the publisher, the sweep and the routes take either listing
unchanged. Keeping the code in `src/trending/` avoids renaming a module every import knows.

**Alternatives considered**: reading `ORDER BY launched_at` without the partial index — rejected:
a sort of every open public poll each minute on the busiest instance, and the explain guard
would fail. An index without `vote_count`/`id` — rejected: ties would be sorted in memory and
the order could differ between ticks. A separate `src/newest/` module — rejected: it would
either import Trending's private helpers or copy them.

---

## R3 — The publisher takes its object names: `createListingPublisher(store, intervalMs, objects)`

**Decision**: in `src/trending/publish.ts`, rename `createTrendingPublisher(store, config)` to
`createListingPublisher(store, intervalMs, objects: { counts: string; cards: string })` and add
`NEWEST_OBJECTS = { counts: "newest-counts.json", cards: "newest.json" }`. `server.ts` builds two
publishers — `trendingPublisher` with `config.trendingRecomputeIntervalMs` and
`TRENDING_OBJECTS`, `newestPublisher` with `config.newestRecomputeIntervalMs` and
`NEWEST_OBJECTS` — and `AppContext` gains `newestPublisher`. The two existing callers
(`server.ts`, `tests/trending.test.ts`) are updated.

**Rationale**: the publisher's whole logic is "PUT counts every time; PUT cards when
`membershipVersion` differs from the last one I published" plus a closure holding that last
version. Two listings need two closures with two names and two cache lifetimes — a parameter,
not a copy. The `Cache-Control: max-age` is derived from the interval passed in, so Newest's
objects live for Newest's interval (FR-014).

**Alternatives considered**: one publisher publishing both listings from one call — rejected:
the two sweeps run on different intervals and under different locks. Keeping
`createTrendingPublisher` as a wrapper — rejected: two names for one function.

---

## R4 — A second sweep schedule: `newestSweep`, lock 10, `runAtStart`

**Decision**: in `src/polls/sweeps.ts`, `SWEEP_LOCKS.newest = 10`; `newestSweep(deps, config,
publisher, now)` mirroring `trendingSweep` (recompute, publish, log
`[newest] published counts[ and cards] for N polls`, return `order.length`);
`buildSweepSchedules` gains `{ name: "newestSweep", intervalMs: config.newestRecomputeIntervalMs,
lockId: SWEEP_LOCKS.newest, runAtStart: true, tick: … services.newestPublisher }`; `SweepServices`
gains `newestPublisher`.

**Rationale**: FR-012/013. A separate schedule keeps the two intervals independent and lets one
instance own Trending while another owns Newest; `runAtStart` makes the objects exist seconds
after boot. The log line satisfies the constitution's server-side observability rule with the
same shape operators already read for Trending.

**Alternatives considered**: a second step inside `trendingSweep` — rejected: binds the two
intervals and doubles the work under one lock.

---

## R5 — The instance routes reuse the Trending handler with a different reader

**Decision**: in `src/routes/tabsApi.ts`, generalise `serveTrendingObject(which)` to
`serveListingObject(read, notReady, intervalMs, which)` where `read` is `readTrendingObjects` or
`readNewestObjects`, `notReady` is `"trending-not-ready"` or `"newest-not-ready"`, and
`intervalMs` sets `Cache-Control`. Routes:

```
router.get(["/api/trending/newest-counts", "/api/trending/newest-counts.json"], pageLoads, serveListingObject(readNewestObjects, "newest-not-ready", config.newestRecomputeIntervalMs, "counts"));
router.get(["/api/trending/newest-cards",  "/api/trending/newest.json"],        pageLoads, serveListingObject(readNewestObjects, "newest-not-ready", config.newestRecomputeIntervalMs, "cards"));
```

`503` bodies keep `{ error, retryAfterMs: 5000 }`. ETag via the existing `etagOf`.

**Rationale**: FR-016/017 name these paths and the one-base rule; the handler already does ETag,
`304`, `Cache-Control` and the not-ready `503` — only the reader, the error string and the
interval differ. Both routes sit behind `pageLoads` only, like Trending's (not dynamic, FR-020).

**Alternatives considered**: `/api/newest/…` — rejected by the requirements (AMB-1 resolution).
A single parameterised route `/api/trending/:object` — rejected: the OpenAPI contract and its
test enumerate fixed paths.

---

## R6 — `newest.js` is a clone of `trending.js` with five substitutions; the 018 placeholder is deleted

**Decision**: `src/public/newest.js` is `trending.js` with `TAB = "newest"`,
`COPY_KEY = "newest:copy"`, the object names `newest-counts.json` / `newest.json`, the interval
read from `config.newestRecomputeIntervalMs`, and the empty-state text
"No polls have been launched yet.". It registers `Tabs.register("newest", { guestsAllowed: true,
state, grid, activate, refresh, reset })`. It does **not** carry `trending.js`'s trailing
`window.Trending = { updateOverlay, updateCounts, state }` export — nothing in the page calls it.
`index.html` adds `<script src="/newest.js" defer>` after `trending.js`. In `tabs.js`:
`KIND_OF.newest = "newest"`; `bucketOf` maps `newest` (like `trending`) to the `refresh` floor and
burst; and the line `controllers.newest = { guestsAllowed: true, state: …, activate() {}, refresh:
null };` in `init()` is **deleted**. `/api/config` (`src/routes/api.ts`) adds
`newestRecomputeIntervalMs: config.newestRecomputeIntervalMs`.

**Rationale**: FR-018–025 are Trending's browser rules verbatim; the clone inherits the
session-copy-then-validate load, the membership-version gate on the cards fetch, the browser
bucket, the overlay fetcher (which returns at once for a guest) and `reset()` on sign-in/out.
Cross-tab vote/bookmark propagation needs nothing: `tabs.js` iterates every registered
controller with a `state` and `grid`. The placeholder must go because `init()` runs after the
deferred scripts have executed and registered — left in place it overwrites the real controller
and the tab keeps doing nothing (architecture BC-1). Refresh becomes enabled on Newest
automatically: `updateRefreshButton` disables it only when the active controller has no
`refresh`.

**Alternatives considered**: a shared `listingTab.js` factory taking the five values — rejected
(Simplicity First): two 160-line modules do not justify a third file and an indirection every
reader must follow; the 017 modules are one file per tab. Keeping `window.Trending`'s shape as
`window.Newest` — rejected: dead code copied is still dead code.

---

## R7 — Two settings with two cross-checks in `loadConfig`

**Decision**: `AppConfig` gains `maxNewestPolls` and `newestRecomputeIntervalMs`. In
`loadConfig`, after `maxPollsSearchResults` is read:

```
const maxPollsSearchResults = intVar(env, "ENV_MAX_POLLS_SEARCH_RESULTS", 200);
const maxNewestPolls = intVar(env, "ENV_MAX_NEWEST_POLLS", 50);
if (maxNewestPolls > maxPollsSearchResults) throw new ConfigError(`Invalid ENV_MAX_NEWEST_POLLS: ${maxNewestPolls} — must not exceed ENV_MAX_POLLS_SEARCH_RESULTS (${maxPollsSearchResults}).`);
const newestRecomputeIntervalMs = intVar(env, "ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL", 60_000);
if (newestRecomputeIntervalMs < 1000) throw new ConfigError(`Invalid ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL: ${newestRecomputeIntervalMs} — must be at least 1000.`);
```

`intVar` already rejects zero and negatives, which covers "at least 1". The two variables are
added to `launch.json.example` (every configuration block), `devScripts.example/launch-dev.ps1`,
`.do/app.yaml` and the CLAUDE.md table, next to the Trending pair.

**Rationale**: FR-026/027; the messages follow the existing `ENV_MAX_CHOICES` /
`ENV_SERVER_MAX_REFRESH_PER_SECOND` cross-check style.

**Alternatives considered**: silently clamping — rejected: every other bound here is a
`ConfigError`.

---

## R8 — Tests: one new suite, four touched

**Decision**: `tests/newest.test.ts` (context with `ENV_MAX_NEWEST_POLLS: "3"`,
`ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL: "60000"`):

- *launched_at*: via `updatePoll` — WAITING TO OPEN → OPEN stamps; OPEN → CLOSED clears;
  CLOSED → OPEN re-stamps with a later value; OPEN → EDITING keeps; EDITING(prior OPEN) → OPEN
  keeps; EDITING(prior WAITING TO OPEN) → OPEN stamps; OPEN → WAITING TO OPEN keeps. Via
  `insertPoll` — OPEN with `startAt` gets `startAt`; OPEN without gets `createdAt`; CLOSED gets
  null.
- *ranking and eligibility*: launch order desc; same `launched_at` → `vote_count` desc → `id`
  desc; cap honoured; EDITING-from-OPEN listed with its last projection; private, WAITING TO
  OPEN (with stale `launched_at`), CLOSED, ARCHIVED and never-opened absent.
- *publication*: counts every run; cards only on membership change (the Trending test's shape
  with `NEWEST_OBJECTS`); `Cache-Control` uses the Newest interval.
- *routes*: `200` with ETag and `Cache-Control`, `304` on `If-None-Match`, both aliases, and
  `503 newest-not-ready` before the first sweep.

Touched: `db-explain-guard.test.ts` (`"Newest": newestQuery(ctx.db, 50)`), `config.test.ts`
(defaults 50/60000; the three bounds), `openapi-contract.test.ts` (the two routes in the
documented list), and `client-home.test.ts` — the "Newest tab in a browser" block is rewritten:
guest click fetches `newest-counts.json` and `newest.json` and renders the cards, Refresh
enabled, no `/api/me/polls`; member click adds exactly one `/api/me/polls`; a seeded
`newest:copy` renders before the counts request and skips the cards request; empty list shows
the message; sign-in with Newest open refetches the overlay.

**Rationale**: constitution IV — each FR has a test that fails before the change; the tests
mirror `trending.test.ts` and the Trending browser tests so their shape is already known to
pass in jsdom and on embedded PostgreSQL.

**Alternatives considered**: putting the `launched_at` edge tests in
`polls-state-machine.test.ts` — rejected: that file is organised by 011's FR numbers and
concerns state validity, not side columns; one feature, one suite.

---

## R9 — The scale seed writes `launched_at` for its OPEN rows

**Decision**: `devScripts/populate/seed-polls.ts` adds
`launched_at: state === "OPEN" ? new Date(now - j * 60_000) : null` (its `created_at`) to each
row.

**Rationale**: FR-006 — with no backfill, the seeded database would show an empty Newest tab;
the seed inserts through Kysely directly, so `insertPoll`'s mapping does not apply. Using the
row's `created_at` gives the seeded tab a spread of launch times.

**Alternatives considered**: `now` for every seeded row — rejected: fifty polls with identical
launch times exercise only the tie-breaks.

---

## R10 — Contract and documentation: reference the Trending schemas; annotate 018

**Decision**: `postman/openapi.json` gains `GET /api/trending/newest-counts` (+ `.json`) and
`GET /api/trending/newest-cards` (+ `newest.json`) whose responses reference the existing
`TrendingCounts` / `TrendingCards` schemas with a Newest description, the `503 newest-not-ready`
response, and `newestRecomputeIntervalMs` in the `/api/config` response (with `trendingBaseUrl`'s
description extended to "and the Newest objects"). `specs/018-TAB-BAR/spec.md` gains one note
under its Newest requirements that 019 supersedes FR-023–FR-025. The CLAUDE.md sentence "no
module, no `KIND_OF` entry, no request" is replaced by the agent-context update of this plan.
`README.md` and `ARCHITECTURE.md` are updated after implementation (constitution).

**Rationale**: the objects are byte-identical in shape (data-model), so a second schema would be
a copy the contract test cannot tell apart; the paths are what `openapi-contract.test.ts`
enumerates. The 018 note prevents the two specifications from contradicting each other in the
repository.

**Alternatives considered**: `NewestCounts` / `NewestCards` schemas as `allOf` wrappers —
rejected: adds nothing but a name.
