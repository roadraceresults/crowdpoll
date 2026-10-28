---
description: "Task list for 019-NEWEST-POLL-TAB"
---

# Tasks: Newest Poll Tab

**Input**: Design documents from `specs/019-NEWEST-POLL-TAB/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-endpoints.md,
contracts/ui-contracts.md, quickstart.md

**Tests**: Test tasks are included and are **not** optional here. Constitution v1.1.0 Principle IV
requires a verifiable criterion per task and Principle VI treats the suite as documentation;
SC-009 ("every existing test still passes") is only meaningful with the new behaviour under test
too. Every test task names the file, the `describe`, and the assertions. The quickstart's manual
steps (network timing, the CDN on staging, the admin-page walk-through) are the final task.

**Organization**: grouped by user story. Server-side mechanics that every story depends on — the
column, the ranking query, the publisher, the sweep, the routes — are foundational; each story
phase then delivers a demonstrable increment with its tests.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel — different files, no dependency on an incomplete task
- **[Story]**: US1–US4, mapping to the user stories in `spec.md`
- Paths are repository-relative

---

## Phase 1: Setup

**Purpose**: a known-green baseline. This feature adds no dependency; setup is the regression
baseline SC-009 is measured against.

- [X] T001 Run `npm test` and `npm run build` on the untouched tree and record both as green (file and test counts) in this task's line; every later checkpoint compares against it — *baseline 2026-09-21: 41 files / 628 tests passed, 1 file / 15 tests skipped; build clean (22 assets)*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the launch timestamp with its rules and index, the two settings, the Newest recompute,
the parameterised publisher, the second sweep and the instance routes. Nothing here is visible
yet; everything in Phases 3–6 reads from it.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Create `src/db/migrations/005-launched-at.ts` exporting `up`/`down` in the style of `004-vote-history.ts`: `up` runs `alter table "polls" add column "launched_at" timestamptz` then `create index "polls_home_launched" on "polls" ("launched_at" desc, "vote_count" desc, "id" desc) where "home_listable" and "launched_at" is not null` (one comment linking https://www.postgresql.org/docs/16/indexes-partial.html); `down` drops the index then the column; **no `UPDATE`** (data-model.md §1; research R1, R2). Register it as `"005-launched-at"` at the end of `migrations` in `src/db/migrations/index.ts`
- [X] T003 [P] In `src/db/schema.ts`, add `launched_at: NullableTimestamp;` to `PollTable` directly after `closed_at`
- [X] T004 In `src/polls/store.ts`: in `insertPoll`'s column mapping add `launched_at: poll.pollState === "OPEN" ? poll.startAt ?? poll.createdAt : null,` after the `closed_at` line; in `updatePoll`, directly after the `closed_at` stamp, add `if ($set.pollState === "OPEN" && before.poll_state !== "OPEN" && !(before.poll_state === "EDITING" && before.poll_state_before_edit_update === "OPEN")) columns.launched_at = new Date();` and `if ($set.pollState === "CLOSED" && before.poll_state !== "CLOSED") columns.launched_at = null;`; leave the function's doc comment as it is (Constitution VI — do not extend a behaviour-describing comment; the T012 tests document the rule) (research R1)
- [X] T005 [P] In `src/config.ts`: add `maxNewestPolls: number;` and `newestRecomputeIntervalMs: number;` to `AppConfig` after `trendingRecomputeIntervalMs`; in `loadConfig`, read `maxPollsSearchResults` into a local before the returned object, then `const maxNewestPolls = intVar(env, "ENV_MAX_NEWEST_POLLS", 50);` with `ConfigError` `Invalid ENV_MAX_NEWEST_POLLS: ${n} — must not exceed ENV_MAX_POLLS_SEARCH_RESULTS (${max}).` when larger, and `const newestRecomputeIntervalMs = intVar(env, "ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL", 60_000);` with `ConfigError` `Invalid ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL: ${n} — must be at least 1000.` when below; place both in the returned object after `trendingRecomputeIntervalMs` (research R7)
- [X] T006 In `src/trending/recompute.ts`: lift the local `listable` arrow out of `recomputeTrending` into an exported module-level `listablePolls(db: Db)` returning `db.selectFrom("polls")` with the same `home_listable`/state predicate, and use it in `recomputeTrending`; add `export const NEWEST_KEYS = { counts: "listing:newest:counts", cards: "listing:newest:cards", meta: "listing:newest:meta" } as const;`; add `export function newestQuery(db: Db, cap: number)` = `listablePolls(db).selectAll().where("launched_at", "is not", null).orderBy("launched_at", "desc").orderBy("vote_count", "desc").orderBy("id", "desc").limit(cap)`; add `export async function recomputeNewest({ db, cache, config }: { db: Db; cache: Cache; config: Pick<AppConfig, "maxNewestPolls"> }, now = new Date()): Promise<TrendingListing>` that runs `newestQuery(db, config.maxNewestPolls)` and then the same tail as `recomputeTrending` (projections + `refreshProjection`, `readOrRebuildCounts`, `membershipVersionOf`, the two objects, `cache.set`/`hset` on `NEWEST_KEYS`); add `readNewestObjects(cache)` mirroring `readTrendingObjects` on `NEWEST_KEYS`. Extract the shared tail into one private helper (`buildListing(cache, keys, rows, now)`) used by both recomputes rather than duplicating it (research R2)
- [X] T007 In `src/trending/publish.ts`: rename `createTrendingPublisher(store, config)` to `createListingPublisher(store: ObjectStore | null, intervalMs: number, objects: { counts: string; cards: string })`, deriving `cacheControl` from `intervalMs` and PUTting `objects.counts` / `objects.cards`; add `export const NEWEST_OBJECTS = { counts: "newest-counts.json", cards: "newest.json" } as const;`. Update the two callers: `src/server.ts` (`createListingPublisher(store, deps.config.trendingRecomputeIntervalMs, TRENDING_OBJECTS)`) and `tests/trending.test.ts` (research R3)
- [X] T008 In `src/server.ts`: build the store once (`const store = deps.config.spaces ? createSpacesStore(deps.config.spaces) : null`), add `newestPublisher: Publisher;` to `AppContext`, create it with `createListingPublisher(store, deps.config.newestRecomputeIntervalMs, NEWEST_OBJECTS)` and return it from `createAppContext` (research R3)
- [X] T009 In `src/polls/sweeps.ts`: add `newest: 10` to `SWEEP_LOCKS`; add `export async function newestSweep(deps, config, publisher, now = new Date()): Promise<number>` mirroring `trendingSweep` with `recomputeNewest` and the log line `[newest] published counts${cards ? " and cards" : ""} for ${n} polls`; add `newestPublisher: Publisher` to `SweepServices`; append to `buildSweepSchedules` `{ name: "newestSweep", intervalMs: config.newestRecomputeIntervalMs, lockId: SWEEP_LOCKS.newest, runAtStart: true, tick: (deps, now) => newestSweep(deps, config, services.newestPublisher, now) }` directly after the `trendingSweep` entry (research R4)
- [X] T010 In `src/routes/tabsApi.ts`: generalise `serveTrendingObject(which)` to `serveListingObject(read: (cache: Cache) => Promise<{ counts: string; cards: string } | null>, notReady: string, intervalMs: number, which: "counts" | "cards")` — `503 { error: notReady, retryAfterMs: 5000 }` when `read` returns null, `Cache-Control` from `intervalMs`, ETag/304 unchanged; rewire the two Trending routes with `readTrendingObjects`, `"trending-not-ready"`, `config.trendingRecomputeIntervalMs`; add `router.get(["/api/trending/newest-counts", "/api/trending/newest-counts.json"], pageLoads, serveListingObject(readNewestObjects, "newest-not-ready", config.newestRecomputeIntervalMs, "counts"))` and `router.get(["/api/trending/newest-cards", "/api/trending/newest.json"], pageLoads, serveListingObject(readNewestObjects, "newest-not-ready", config.newestRecomputeIntervalMs, "cards"))` (contracts/api-endpoints.md; research R5)
- [X] T011 [P] In `src/routes/api.ts` `GET /api/config`, add `newestRecomputeIntervalMs: config.newestRecomputeIntervalMs,` directly after `trendingRecomputeIntervalMs` (research R6)
- [X] T012 Create `tests/newest.test.ts` with `startTestContext({ ENV_MAX_NEWEST_POLLS: "3", ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL: "60000" })` and a `describe("launched_at")` that reads the column with `ctx.db.selectFrom("polls").select("launched_at")` and asserts, through `polls(ctx).updateOne({ _id }, { $set })` from `tests/helpers/poll-fixtures.js` (or `updatePoll` from `src/polls/store.js` directly): WAITING TO OPEN → OPEN sets a value within 5 s of now; OPEN → CLOSED sets null; CLOSED → OPEN sets a value later than the first; OPEN → EDITING (with `pollStateBeforeEditUpdate: "OPEN"`) keeps the value; EDITING(prior OPEN) → OPEN keeps it; EDITING(prior WAITING TO OPEN) → OPEN stamps; OPEN → WAITING TO OPEN keeps it; and through `insertPoll`: OPEN with `startAt` gets `startAt`, OPEN without gets `createdAt`, CLOSED gets null (spec FR-001–FR-005; data-model.md §1); plus a `describe("schedule")` asserting `buildSweepSchedules(ctx.config, ctx).find((s) => s.name === "newestSweep")` has `runAtStart === true`, `lockId === 10` and `intervalMs === 60000` (FR-012, FR-013)
- [X] T013 Run `npx tsc --noEmit` and `npm test`: the new `launched_at` block passes; `trending.test.ts` passes with the renamed publisher; every pre-existing suite is green against the T001 baseline (the migration runs on the embedded database at context start) — *2026-09-21: green after adding `ENV_MAX_NEWEST_POLLS` to the two harness configs that lower `ENV_MAX_POLLS_SEARCH_RESULTS` (`tabs.test.ts`, `search-home.test.ts`) and to `config.test.ts`'s override loop — the FR-027 cross-check refuses the default 50 above a cap of 3/7*

**Checkpoint**: the column exists with its rules and index, the settings load, one instance can
recompute and publish Newest, and the instance routes serve it. Nothing in the browser yet.

---

## Phase 3: User Story 1 — See the newest public polls (Priority: P1) 🎯 MVP

**Goal**: any visitor clicks Newest and sees the grid — most recently launched first, ties by
votes then id, capped, public open polls only, with the empty-state message when there are none.

**Independent Test**: seed a handful of open polls with known `launched_at` values; as a guest and
a member click Newest: the cards appear in reverse launch order, capped at
`ENV_MAX_NEWEST_POLLS`; private, waiting, closed and archived polls are absent; with no launched
polls the panel reads "No polls have been launched yet."

- [X] T014 [US1] Create `src/public/newest.js` as a copy of `src/public/trending.js` with exactly these substitutions: the header paragraph names `newest-counts.json` / `newest.json`; `const TAB = "newest"`, `const COPY_KEY = "newest:copy"`; `recomputeIntervalMs(config)` reads `config.newestRecomputeIntervalMs`; the two `fetchObject` URLs are `base + "/newest-counts.json"` and `base + "/newest.json"`; the panel selector is `'.tab-panel[data-panel="newest"]'`; the empty-state text is `"No polls have been launched yet."`; `Tabs.register("newest", …)` with the same controller shape (`guestsAllowed: true`, `state`, `grid`, `activate`, `refresh`, `reset`). Omit the trailing `window.Trending = …` export and the `updateOverlay`/`updateCounts` functions it exposed (contracts/ui-contracts.md; research R6)
- [X] T015 [P] [US1] In `src/public/index.html`, add `<script src="/newest.js" defer></script>` directly after the `trending.js` script tag
- [X] T016 [US1] In `src/public/tabs.js`: add `newest: "newest"` to `KIND_OF`; in `bucketOf`, change `const floorKind = kind === "trending" ? "refresh" : kind;` to map both `"trending"` and `"newest"` to `"refresh"`; **delete** the line `controllers.newest = { guestsAllowed: true, state: window.DeltaClient.createTabState(), activate() {}, refresh: null };` from `init()` (research R6; architecture BC-1). No other change
- [X] T017 [US1] In `tests/newest.test.ts`, add `describe("NEWEST recompute")`: (a) five open public polls inserted with `createdAt` one minute apart and no `startAt` → `recomputeNewest(ctx).order` is the three most recent, newest first (cap 3); (b) two polls with equal `launched_at` (same `createdAt`) and different vote totals (`updatePoll` with `currentVotes`, then `flushDirty`, or set `vote_count` directly) → more votes first; equal votes → higher `id` first, and the order is identical across two recomputes; (c) an EDITING poll with `pollStateBeforeEditUpdate: "OPEN"` is listed with its projection; a private OPEN poll, a WAITING TO OPEN poll whose `launched_at` was set then left stale (`updatePoll` to OPEN then to WAITING TO OPEN), a CLOSED poll, an ARCHIVED poll and an OPEN poll with `launched_at` null (updated directly) are absent (spec FR-008–FR-011)
- [X] T018 [US1] In `tests/client-home.test.ts`, replace the `describe("the Newest tab in a browser")` block: `beforeEach` runs `trendingSweep` **and** `newestSweep(ctx, ctx.config, ctx.newestPublisher)`; (a) with two open public polls "First"/"Second" (Second launched later): a guest clicks Newest → no redirect, the tab is `is-active`, the panel is shown, `page.cardTitles("newest")` is `["Second", "First"]`, `requestsTo(page, "/api/trending/newest-counts.json").length === 1` and `…/newest.json` is 1, no request to `/api/me/polls`, and `#refreshBtn` is `disabled` immediately (the activation spent the tab's only token) but **enabled** after `page.settle(1300)` — the 018 contract disabled it permanently; (b) a member (`forgeSession`) clicking Newest sees the same cards; after `page.settle(1300)` (Trending's own overlay call on page load holds the refresh floor, so Newest's is refused with 429 and retried — FIX06), the requests to `/api/me/polls` whose `pids` query names exactly the Newest ids include exactly one with `status === 200`, and the Newest cards show the member's voted/bookmarked state; (c) with no launched polls, the `.tab-empty` in the newest panel is visible with text "No polls have been launched yet." and the grid is empty (spec US1 scenarios 1, 5, 6; FR-022, FR-025, FR-028)
- [X] T019 [US1] Run `npx vitest run tests/newest.test.ts tests/client-home.test.ts` then `npm test`; all green; `git grep -n "controllers.newest" -- src/public` returns nothing — *2026-09-21: `tests/helpers/browser.ts` loads a fixed script list; `newest.js` added to it (the jsdom equivalent of the `index.html` script tag)*

**Checkpoint**: the Newest tab lists the right polls in the right order for guests and members.

---

## Phase 4: User Story 2 — A launch shows up promptly, and a poll leaves when it closes (Priority: P2)

**Goal**: the life-cycle is honoured end to end through the sweep — a launch is published on
the next tick, a close removes, a re-open re-launches at the top, an edit keeps the poll in place.

**Independent Test**: drive polls through `updatePoll` and run `newestSweep` between steps; the
published counts object reflects each transition, and the cards object is republished only when
the set of ids changes.

- [X] T020 [US2] In `tests/newest.test.ts`, add `describe("publication")`: with a recording `ObjectStore` (as in `trending.test.ts`) and `createListingPublisher(store, ctx.config.newestRecomputeIntervalMs, NEWEST_OBJECTS)`: first publish → `{ counts: true, cards: true }` and PUT keys `["newest-counts.json", "newest.json"]`; a vote on a listed poll then publish → `{ counts: true, cards: false }`; a new open poll (membership change) then publish → both; every PUT has `cacheControl === "public, max-age=60"` and `contentEncoding === "gzip"`; FR-015: with the row's `vote_count` still 0, `countVote(ctx.cache, pid, ["c1"], [], true)` three times **without** `flushDirty`, then `recomputeNewest(ctx)` → the `countsObject.polls` entry for `pid` has `voteCount: 3`, `countsVersion: 3` and `choiceCounts: { c1: 3 }` (the pattern at `trending.test.ts:27-45`) (spec FR-014, FR-015; SC-004)
- [X] T021 [US2] In `tests/newest.test.ts`, add `describe("life-cycle through the sweep")` using `newestSweep(ctx, ctx.config, ctx.newestPublisher)` and `readNewestObjects(ctx.cache)`: (a) open a WAITING TO OPEN poll (`updatePoll` → OPEN), sweep → it is `polls[0].pid` (SC-001); (b) close it, sweep → absent (SC-006); (c) re-open it, sweep → `polls[0]` again with a `launched_at` later than the original (FR-002); (d) put a listed poll into EDITING with prior OPEN and a changed subtitle unpublished, sweep → still listed at the same index, `cards[pid].subtitle` is the old one; publish the edit (→ OPEN), sweep → new subtitle, same index (FR-009, FR-002); (e) edit a listed poll to a future `startAt` and publish (→ WAITING TO OPEN), sweep → absent; set `startAt` to the past and run `pollDateCheckSweep` (→ OPEN), sweep → present as the newest (FR-004)
- [X] T022 [P] [US2] In `specs/018-TAB-BAR/spec.md`, directly under the **Newest** heading of its Functional Requirements, add one italic note: "*Superseded by 019-NEWEST-POLL-TAB: FR-023 (sends nothing), FR-024 (Refresh disabled) and FR-025 (no message) no longer apply once 019 is implemented — see `specs/019-NEWEST-POLL-TAB/spec.md` FR-028.*" (research R10). Adjust the FR numbers to whichever three 018 requirements state those rules
- [X] T023 [US2] Run `npx vitest run tests/newest.test.ts`; all green

**Checkpoint**: every state edge produces the right published objects; only membership changes
republish the cards.

---

## Phase 5: User Story 3 — Newest is fast for the visitor and free for the servers (Priority: P3)

**Goal**: the session copy renders first on reload, tab clicks inside the floor send nothing,
Refresh obeys the browser bucket, the cards object is skipped when membership is unchanged,
guests make no application request, members make exactly the overlay call, and the instance
routes validate with ETag and answer "not ready" before the first tick.

**Independent Test**: seed `sessionStorage["newest:copy"]` and open the page: cards render before
any request completes and the cards object is not fetched; as a guest no `/api/me/polls`; as a
member exactly one; `GET /api/trending/newest-counts.json` with `If-None-Match` answers 304;
before any sweep it answers 503 `newest-not-ready`.

- [X] T024 [US3] In `tests/newest.test.ts`, add `describe("instance routes")`: in a **fresh** context (or after `ctx.cache.del` of the three `NEWEST_KEYS`) `GET /api/trending/newest-counts.json` → `503` with body `{ error: "newest-not-ready", retryAfterMs: 5000 }`; after `newestSweep`: `GET /api/trending/newest-counts.json` → `200`, `cache-control` `public, max-age=60`, an `etag`, `body.polls[0].pid` is the newest poll; the same with `If-None-Match` → `304`; `GET /api/trending/newest-counts` (alias) → `200` with the same ETag; `GET /api/trending/newest.json` → `200` with `body.membershipVersion` equal to the counts object's and `body.cards[pid].title`; `GET /api/trending/newest-cards` (alias) → `304` with the ETag (contracts/api-endpoints.md; FR-016, FR-017)
- [X] T025 [US3] In `tests/client-home.test.ts` "the Newest tab in a browser", add: (a) after a sweep and a first visit, read `page.window.sessionStorage.getItem("newest:copy")`; open a new page with `{ sessionStorage: { "newest:copy": copy } }` → `page.cardTitles("newest")` is populated **before** `page.settle`, `requestsTo(page, "/api/trending/newest-counts.json").length === 1` and `…/newest.json` is 0 (FR-018, FR-019); (b) a copy with `receivedAt` older than `newestRecomputeIntervalMs` → the cards fetch happens (both objects requested once); (c) click Trending then Newest within the floor → no additional `newest-counts.json` request (FR-021); (d) after `page.settle` past the floor, `#refreshBtn.disabled === false`; `page.click("#refreshBtn")` → one more `newest-counts.json` request; immediately after, `#refreshBtn.disabled === true` and a second click sends nothing and shows no notice; after `page.settle(floor + 100)` it is enabled again (FR-021; the pattern at `client-home.test.ts:105-131`); (e) sign a member in with Newest open (set the cookie and dispatch the session change as the existing sign-in test does); after `page.settle(1300)` — every tab's `reset()` asks again and the floor serialises them — exactly one more `/api/me/polls` with `status === 200` whose `pids` name the Newest ids, and the Newest cards show the member's state (FR-023); (f) as a guest, over the whole visit, the only application requests from the tab are the two object paths (FR-020; SC-003); (g) FR-024: a member with one open public poll listed on both Trending and Newest (both sweeps run); after visiting Newest once so it holds the card, on Trending click `.vote-btn`, `.vote-row`, `.submit-vote-btn` (one `/api/polls/{pid}/vote` request, as at `client-home.test.ts:366-384`); click Newest and assert synchronously, before any further `newest-counts.json` response can arrive, that its `.poll-totals` contains "1 vote" and its `.vote-btn` is disabled — the update is local; a refetch past the floor is allowed and changes nothing; likewise a bookmark toggled on the Trending card is reflected on the Newest card at once
- [X] T026 [US3] Run `npx vitest run tests/newest.test.ts tests/client-home.test.ts`; all green

**Checkpoint**: the browser's copy, bucket and overlay behaviour match Trending's; the routes
validate and fail safe.

---

## Phase 6: User Story 4 — The operator sizes and paces the tab (Priority: P4)

**Goal**: the two settings exist everywhere the Trending pair exists, are validated at start-up,
the contract documents the surface, the ranking query is under the explain guard, and the scale
seed populates the tab.

**Independent Test**: `loadConfig` with each out-of-bound value throws a `ConfigError` naming the
setting; the defaults are 50 and 60000; the contract test finds the two routes; the explain guard
finds no sequential scan for "Newest"; the templates, `.do/app.yaml` and the CLAUDE.md table
carry both variables.

- [X] T027 [P] [US4] In `launch.json.example`, add `"ENV_MAX_NEWEST_POLLS": "50",` and `"ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL": "60000",` directly after the `ENV_TRENDING_POLLS_RECOMPUTE_INTERVAL` line in **every** configuration block (seven occurrences today); in `devScripts.example/launch-dev.ps1`, add `$env:ENV_MAX_NEWEST_POLLS = "50"` and `$env:ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL = "60000"` after the Trending pair (FR-026)
- [X] T028 [P] [US4] In `.do/app.yaml`, add `- key: ENV_MAX_NEWEST_POLLS` / `value: "50"` and `- key: ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL` / `value: "60000"` directly after the `ENV_TRENDING_POLLS_RECOMPUTE_INTERVAL` entry (FR-026)
- [X] T029 [P] [US4] In `CLAUDE.md`'s Environment Variables table, add rows `ENV_MAX_NEWEST_POLLS` | `50` | "Polls in the Newest tab; must not exceed `ENV_MAX_POLLS_SEARCH_RESULTS`" and `ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL` | `60000` | "How often Newest is recomputed and published (ms; at least 1000); also the CDN `max-age` and the browser copy's lifetime" directly after the Trending pair (FR-026)
- [X] T030 [P] [US4] In `postman/openapi.json`: add exactly two paths, `/api/trending/newest-counts` and `/api/trending/newest-cards` — no separate entries for the `.json` aliases; instead the `summary` begins with the object file name ("newest-counts.json: Newest order and live counts, every recompute" / "newest.json: the Newest cards, republished only when the set of polls changes") and the `description` says the object is also served at `/api/trending/newest-counts.json` / `/api/trending/newest.json`, mirroring the `/api/trending/counts` and `/api/trending/cards` entries — with `operationId` `newestCounts` / `newestCards`, tag `home`, the `If-None-Match` parameter, responses `200` referencing `#/components/schemas/TrendingCounts` / `TrendingCards` with a description naming `newest-counts.json` / `newest.json`, `304`, and `503` with `error` enum `["newest-not-ready"]`; add `newestRecomputeIntervalMs` (integer, "ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL; also the browser copy's lifetime for the Newest tab") to the `/api/config` response properties and `required`; change `trendingBaseUrl`'s description to "Where the TRENDING and Newest objects are fetched from: the delivery network base, or /api/trending when served by the instances" (contracts/api-endpoints.md; research R10)
- [X] T031 [P] [US4] In `tests/openapi-contract.test.ts`, add `"GET /api/trending/newest-counts"` and `"GET /api/trending/newest-cards"` to the documented-routes list, and assert the `/api/config` response schema's `properties` include `newestRecomputeIntervalMs`
- [X] T032 [P] [US4] In `tests/config.test.ts`, in the describe that covers the 017 settings' defaults and overrides, add: defaults `maxNewestPolls === 50` and `newestRecomputeIntervalMs === 60000`; `ENV_MAX_NEWEST_POLLS: "0"` throws `ConfigError` matching `/ENV_MAX_NEWEST_POLLS/`; `ENV_MAX_NEWEST_POLLS: "201"` with the default search cap throws matching `/must not exceed ENV_MAX_POLLS_SEARCH_RESULTS/`; `ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL: "500"` throws matching `/at least 1000/`; `"1000"` is accepted (FR-027; SC-008)
- [X] T033 [P] [US4] In `tests/db-explain-guard.test.ts`, import `newestQuery` from `../src/trending/recompute.js` and add `"Newest": newestQuery(ctx.db, 50)` to `listings()` (the seeded OPEN rows already carry `launched_at` through `insertPoll`, so the partial index has entries) (FR-007; SC-005)
- [X] T034 [P] [US4] In `devScripts/populate/seed-polls.ts`, add `launched_at: state === "OPEN" ? new Date(now - j * 60_000) : null` to each row after `closed_at` (FR-006; research R9)
- [X] T035 [US4] Run `npx vitest run tests/config.test.ts tests/openapi-contract.test.ts tests/db-explain-guard.test.ts` then `npm test`; all green

**Checkpoint**: the operator surface is complete and documented; the query is guarded.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: the constitution's documentation deliverables and the manual validation the suites
cannot perform.

- [X] T036 [P] Update `README.md` in place: replace the "**Newest** — a placeholder for a coming feature…" bullet with "**Newest** — the public polls opened most recently, newest first (fifty at most); a poll re-opened by an administrator counts as new. **Refresh** works as on Trending."; keep the file free of references to `specs/`, `designDocs/` and `architecture/` (constitution Documentation Deliverables)
- [X] T037 [P] Update `ARCHITECTURE.md` in place: change the `tabs.js` node text "six tabs (Newest a no-op stub)" to "six tabs"; replace the paragraph beginning "Newest is registered as a controller with no behaviour" with a paragraph on the second listing publication (`launched_at` stamped in `updatePoll`, `newestQuery` over `polls_home_launched`, `newestSweep` on lock 10, `createListingPublisher` with `NEWEST_OBJECTS`, instance routes under `/api/trending/`, `newest.js` as Trending's twin); add the `polls_home_launched` index and the `listing:newest:*` keys wherever the Trending equivalents are listed; add a Mermaid node for `newest.js` beside `trending.js` if the client diagram lists modules
- [X] T038 Run `npm test` and `npm run build`; compare against T001: every pre-existing test passes except the three 018 Newest tests replaced in T018 (SC-009); `git grep -n "FR-0\|T0[0-9][0-9]\|019-" -- src` returns nothing new (constitution VI) — *2026-09-21: 42 files / 648 tests passed, 15 skipped; build clean (23 assets); the grep's only hits predate 019*
- [ ] T039 Walk `specs/019-NEWEST-POLL-TAB/quickstart.md` manually with the lowered settings (US1 steps 1–5, US2 steps 1–5, US3 steps 1–7, US4 steps 1–5); record any discrepancy as a FIX item for `/speckit-fix` rather than patching ad hoc — *left for the developer: needs a running server, an admin identity and a browser; everything automated in the quickstart's coverage map is green*

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none — start immediately
- **Foundational (Phase 2)**: T002 → T003/T004 (schema before store); T005 before T006/T009/T010/T011 (config fields); T006 before T009/T010; T007 before T008/T009; T008 before T009; T012 after T004; T013 last. **Blocks every story**
- **US1 (Phase 3)**: after Phase 2. T014 and T015 in parallel; T016 independent of both; T017 after T006; T018 after T014–T016
- **US2 (Phase 4)**: after Phase 2 (T020 needs T007; T021 needs T009). Independent of US1's client tasks; T022 any time
- **US3 (Phase 5)**: T024 after Phase 2; T025 after US1 (T014–T016)
- **US4 (Phase 6)**: T027–T034 after T005 (config) and T010 (routes); all eight in parallel; T035 last
- **Polish (Phase 7)**: after every story

### Parallel Opportunities

- Phase 2: T003 ‖ T005 ‖ T011 while T002/T004/T006/T007 proceed in sequence
- Phase 3: T014 ‖ T015 ‖ T016; then T017 ‖ T018
- Phase 4: T020 ‖ T021 ‖ T022
- Phase 6: T027 ‖ T028 ‖ T029 ‖ T030 ‖ T031 ‖ T032 ‖ T033 ‖ T034
- Phase 7: T036 ‖ T037

---

## Parallel Example: User Story 1

```bash
# Client files, no shared edits:
Task: "Create src/public/newest.js from trending.js with the five substitutions"
Task: "Add the newest.js script tag to src/public/index.html"
Task: "KIND_OF.newest, bucketOf mapping, delete the placeholder in src/public/tabs.js"

# Then the two test files:
Task: "NEWEST recompute ranking/eligibility in tests/newest.test.ts"
Task: "Rewrite 'the Newest tab in a browser' in tests/client-home.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: baseline
2. Phase 2: column, rules, index, settings, recompute, publisher, sweep, routes (T002–T013)
3. Phase 3: `newest.js`, the script tag, `tabs.js`, the two test blocks (T014–T019)
4. **STOP and VALIDATE**: guest and member see the newest polls in order; empty state; Refresh enabled
5. Demo: open a poll on the admin page, wait an interval, click Newest

### Incremental Delivery

1. Phase 2 → the objects exist and are served (verifiable with `curl /api/trending/newest-counts.json`)
2. + US1 → the tab works (MVP)
3. + US2 → the life-cycle is proven through the sweep; 018's spec annotated
4. + US3 → copy, bucket, overlay and route validation proven
5. + US4 → operator surface complete; seed populates the tab
6. Polish → README, ARCHITECTURE, full regression, quickstart walk-through

---

## Notes

- Constitution III: `trending.js` is read, never written; the only Trending code that changes is
  the lifted `listablePolls` predicate, the shared listing tail and the publisher's signature
- Constitution VI: no comment in `src/` may cite an FR, a task id or "019"; the migration's one
  comment is an external link; `newest.js`'s header describes what the module reads, as
  `trending.js`'s does
- The 018 placeholder deletion (T016) is not optional cleanup — with it in place the registered
  controller is overwritten and the tab does nothing
- Commit after each phase checkpoint; `npm run build` after T013 and T038 proves `newest.js` is
  fingerprinted and copied like every other asset
