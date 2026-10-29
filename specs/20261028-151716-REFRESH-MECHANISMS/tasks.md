---

description: "Task list for the refresh mechanisms"
---

# Tasks: Refresh Mechanisms

**Input**: Design documents from `specs/20261028-151716-REFRESH-MECHANISMS/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R10), data-model.md, contracts/api.md (A1–A7),
contracts/ui-contracts.md (C1–C3), quickstart.md

**Tests**: Requested (Constitution IV: every FR is verified by a test). Server suites use supertest on embedded
PostgreSQL with `memoryCache`; the database-free shortcut is proven by counting queries (wrap the Kysely instance's
`executeQuery`, as `tests/db-explain-guard.test.ts` does) or by stopping the database between two refreshes. Browser
scripts are tested in jsdom through `tests/helpers/browser.ts` with fake timers. Write each story's tests first and
watch them fail. Run one vitest file at a time when debugging (the embedded PostgreSQL uses a fixed port).

**Organization**: Phase 2 adds the two cache methods and the list-version module that US1 builds on. The stories
follow in priority order; US1 and US2 are P1 and independent of each other.

**Branch**: `refresh-research`. Autodeploy is off; nothing deploys until a build is started by hand.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task belongs to (US1–US7)

## Path Conventions

Single project: `src/`, `tests/` at the repository root. No explanatory or requirement-referencing comments in changed
code (Constitution VI); match the surrounding style. Server log lines keep their `[area]` prefix; the browser logs
nothing new.

---

## Phase 1: Setup

- [X] T001 Confirm the baseline: `npx tsc --noEmit` and `npm test` pass before any change; record any pre-existing failure in this file under "Notes" rather than fixing it here

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the batched cache calls (research R5) and the list-version module (R1, R2) that US1 uses.

- [X] T002 [P] Write tests for `getMany(keys)` (values in key order, `null` for missing or expired) and `setMany(entries: { key, value, ttlMs? }[])` in tests/cache-memory.test.ts, and the same cases in tests/cache-valkey.integration.test.ts (skipped without `ENV_VALKEY_URL`)
- [X] T003 Add `getMany(keys: string[]): Promise<(string | null)[]>` and `setMany(entries: { key: string; value: string; ttlMs?: number }[]): Promise<void>` to the `Cache` interface in src/cache/cache.ts; implement them in src/cache/memoryCache.ts (same expiry and `DisconnectedError` rules as `get`/`set`) and src/cache/valkeyCache.ts (`MGET`; one pipeline of `SET … PX` / `SET`); an empty list makes no call
- [X] T004 [P] Write tests for src/refresh/tabVersions.ts in tests/tab-versions.test.ts: `ensureVersion` creates `tabs:v:<emailKey>` once (`setNx`, 24 h) and returns the existing value otherwise; two creations after a delete never return the same value; `forgetTabs(cache, ["A.b+x@gmail.com", "ab@gmail.com"])` deletes the one key both addresses share (`emailKeyOf`); `recordSeen`/`readSeen` round-trip a `TabSeen` with a 5 min TTL; `shortcutAnswerable` returns true only when all four conditions of research R2 hold, and false for each one broken alone (version missing, version differs, membership or held ids differ, a loaded row's projection missing, a projection's `contentVersion` differs, a held content version differs from the one sent)
- [X] T005 Create src/refresh/tabVersions.ts per data-model.md: `TAB_VERSION_KEY`, `TAB_SEEN_KEY`, `ensureVersion(cache, email)`, `readVersion(cache, email)`, `forgetTabs(cache, emails)` (deduplicated by email key; logs and swallows a cache failure, so a write never fails because of it), `recordSeen(cache, email, tab, seen)`, `readSeen(cache, email, tab)` and `shortcutAnswerable(seen, version, request, projections)`; values are the opaque `<Date.now()>-<random>` string of research R1

**Checkpoint**: T002 and T004 pass; nothing user-visible has changed.

---

## Phase 3: User Story 1 - A personal tab's Refresh is quick when nothing has changed (Priority: P1) 🎯 MVP

**Goal**: an unchanged personal tab is answered from the live counts without the database; every change still reaches the tab (FR-001–FR-008, contract A1, A2).

**Independent Test**: quickstart step 2.

### Tests for User Story 1

- [X] T006 [P] [US1] In tests/tabs-refresh-shortcut.test.ts: on each of the four tabs, a second refresh with the versions from the first answers `304` (or counters only after a vote moved a count) with zero database queries (FR-004, FR-006); the first refresh after the version key is deleted, or after `tabs:seen` expires, is a full answer (FR-005); a refresh without `View Polls` still answers empty
- [X] T007 [P] [US1] In tests/tabs-refresh-signals.test.ts, each change below is visible on the very next refresh of the affected tab (FR-001, FR-002): a vote written by the consumer (Your Votes), bookmark add, remove and expiry removal (Watching), poll creation (Your Polls), invitation added, removed and adopted by email key including a `+tag` address (Shared With You), ban added and ban removed (the card's vote-blocked reason), a voted relation removed by a choice deletion, and a shared-link `linked` relation; and that sending, reminding or marking an invitation accepted does **not** delete the version
- [X] T008 [P] [US1] In tests/tabs-refresh-shortcut.test.ts: a listed poll's creator edits its title → the next refresh returns the edited card (FR-003); a poll narrowed out of Watching by lost access that regains access through its own content change reappears (research R2); a listed poll deleted by `deletePoll` and one deleted with its creator's account disappear on the next refresh (FR-003a); a Shared With You shortcut runs neither `adoptInvitations` nor `markAccepted` (FR-007)
- [X] T009 [P] [US1] In tests/tabs-refresh-shortcut.test.ts: a full answer writes no projection already cached with the row's `content_version`, writes a missing or stale one, and makes at most one `setMany` call; the same for `POST /api/search` (FR-008)

### Implementation for User Story 1

- [X] T010 [US1] In src/routes/tabsApi.ts `personalListing` and `answerSearch`: replace the `for … await refreshProjection` loops with one `getMany` of `POLL_PROJECTION_KEY` for the readable rows and one `setMany` of those missing or whose cached `contentVersion` differs from the row's (research R5); export `POLL_PROJECTION_KEY` use from src/polls/versions.ts as today
- [X] T011 [US1] In src/routes/tabsApi.ts `personalTabRoute`: after the `View Polls` check, read the version and `TabSeen` (one `getMany` of `tabs:v` and `tabs:seen`) and the projections of `seen.rows`; when `shortcutAnswerable`, answer `computeDelta` over `readOrRebuildCounts` of `seen.order` with projections from the cache, without calling `load` or `narrow`; otherwise `ensureVersion` **before** `load`, build the full answer as today, then `recordSeen` with every loaded row (before narrowing), its row `content_version` and the content version sent (0 for "not published"); any cache error on the shortcut path falls back to the full answer
- [X] T012 [US1] Signal after commit in src/polls/store.ts: `insertPoll` (creator, invited, banned addresses), `updatePoll` (old ∪ new invitees and bans, withdrawn `invited` rows, removed `voted` rows), `deletePoll` deletes `poll:<pid>` after its transaction (research R3, R4); where a store function runs inside a caller's transaction, return the affected addresses so the caller signals after commit
- [X] T013 [P] [US1] Signal after commit in src/polls/bookmarks.ts (add, remove, the expiry removal sweep's addresses) and in the shared-link path: after `upsertRelation(deps.db, email, pid, "linked")` in src/polls/sharedLink.ts:96
- [X] T014 [P] [US1] Signal after commit in src/invitations/invitations.ts: roster additions and removals (`writeRoster` paths, lines writing `poll_invitations` and `user_polls`), and adoption (both the invited and the account address); do not signal for `sent_at`, `reminded_at`, `send_failed_at`, `accepted_at`, `added_at` or token writes
- [X] T015 [P] [US1] Signal after commit in src/votes/consumer.ts for every voter address of a written batch (one `forgetTabs` call per batch)
- [X] T016 [P] [US1] In src/legal/deleteAccount.ts: after the transaction commits, delete `poll:<pid>` for each of the account's own polls deleted (FR-003a)
- [X] T017 [US1] Count each personal-tab answer: `INCR stats:tabs:fast` on the shortcut, `stats:tabs:full` on a full answer, each with a 10 min TTL set on the first increment (research R9), in src/routes/tabsApi.ts

**Checkpoint**: T006–T009 pass; quickstart step 2 behaves as written.

---

## Phase 4: User Story 2 - Live Results eases off while nothing is happening (Priority: P1)

**Goal**: an unchanged Live Results tab waits 2 → 4 → 8 → 10 s; a change or user action resets it (FR-009, FR-010, contract C2).

**Independent Test**: quickstart step 3.

### Tests for User Story 2

- [X] T018 [P] [US2] In tests/client-live-backoff.test.ts (jsdom, fake timers, stubbed `fetch`): consecutive `304`s schedule requests 2, 4, 8, 10, 10 s apart; a `200` returns the next wait to its `nextRefreshMs`; a `nextRefreshMs` of 16000 under load is never shortened; a vote in the panel, `addPoll`, `removePoll` and `visibilitychange` to visible reset a pending 10 s wait to the normal interval; `429` and `503` keep today's waits and reset the back-off (the next `304` after one waits 4 s); a window `focus` on a visible page does not reset it
- [X] T019 [P] [US2] In tests/live-results.test.ts: a session whose tab refreshes every 10 s stays registered (`live.touch`) and is never answered `403 live-expired`

### Implementation for User Story 2

- [X] T020 [US2] In src/public/liveResults.js: keep `serverNextMs` (last `nextRefreshMs` from a 200, else the live floor) and `backoffMs`; after a `304` set `backoffMs = Math.min(Math.max(backoffMs * 2, serverNextMs * 2), 10000)` and schedule `Math.max(serverNextMs, backoffMs)`; after a 200 set `backoffMs = 0`; add `resetBackoff()` (clears `backoffMs` and reschedules a pending longer timer at `serverNextMs`) and call it from the vote path of the panel listener, `addPoll`, `removePoll` and the `visibilitychange` handler when the page is visible; on a `429` or `503` set `backoffMs = 0` and keep today's wait

**Checkpoint**: T018–T019 pass.

---

## Phase 5: User Story 4 - The Refresh button explains why it is waiting (Priority: P2)

**Goal**: `aria-disabled` Refresh with a counting-down tooltip, unchanged look (FR-013, contract C1).

**Independent Test**: quickstart step 5.

### Tests for User Story 4

- [X] T021 [P] [US4] In tests/client-refresh-wait.test.ts (jsdom with `tooltip-m3.js` loaded, fake timers): after the burst is spent, `#refreshBtn` has `aria-disabled="true"`, no `disabled` property, `data-tooltip` `Refresh available in 5 s`, then `4 s` a second later; a click while waiting sends no request; when the wait ends `aria-disabled` is removed and the tooltip reads `Refresh`; update any existing assertion on `refreshBtn.disabled` in tests/client-home.test.ts, tests/client-tabs-026.test.ts, tests/client-maximized.test.ts and tests/client-bar-colours.test.ts to `aria-disabled`
- [X] T022 [P] [US4] In tests/m3-assets.test.ts (or tests/tab-bar-assets.test.ts): each `:disabled` rule for `.tab-refresh` and `.tab-refresh--icon` in src/public/tabs.css and src/public/header-tab-bar-m3.css has an `[aria-disabled="true"]` twin with the same declarations

### Implementation for User Story 4

- [X] T023 [US4] In src/public/tabs.js `updateRefreshButton`: set or remove `aria-disabled="true"` instead of `btn.disabled`; while waiting set `title` to `Refresh available in ${Math.ceil(wait / 1000)} s` and re-run in `Math.min(wait, 1000) + 10` ms; when available set `title` to `Refresh`; the click handler returns at once while `aria-disabled` is `"true"`
- [X] T024 [P] [US4] Add `[aria-disabled="true"]` selectors beside `.tab-refresh:disabled` in src/public/tabs.css and beside `.tab-bar-wrap .tab-refresh--icon:disabled` and `.tab-refresh--icon:disabled::before` in src/public/header-tab-bar-m3.css

**Checkpoint**: T021–T022 pass; T030 can now land.

---

## Phase 6: User Story 3 - Trending and Newest are fresher, and Refresh is offered only when something newer can exist (Priority: P2)

**Goal**: published lifetime min(interval, 10 s); Refresh waits for it (FR-011, FR-012, contracts A4, A5, C3).

**Independent Test**: quickstart step 4.

### Tests for User Story 3

- [X] T025 [P] [US3] Update tests/trending.test.ts and tests/newest.test.ts: Spaces puts and the instance-served objects carry `public, max-age=10` at the defaults, and `public, max-age=5` when the recompute interval is 5000; `/api/config` has `trendingMaxAgeMs` and `newestMaxAgeMs`
- [X] T026 [P] [US3] In tests/client-home.test.ts (or a new tests/client-listing-refresh.test.ts): on Trending and on Newest, the Refresh button is `aria-disabled` for 10 s after the copy's `receivedAt` and enabled after it; a tab click within the recompute interval shows the stored copy without a fetch

### Implementation for User Story 3

- [X] T027 [US3] Export `LISTING_MAX_AGE_CAP_MS = 10_000` and `listingMaxAgeMs(intervalMs)` from src/trending/publish.ts and use it in `createListingPublisher`'s `Cache-Control`; use it in `serveListingObject` in src/routes/tabsApi.ts
- [X] T028 [US3] Add `trendingMaxAgeMs` and `newestMaxAgeMs` to `GET /api/config` in src/routes/api.ts and to its schema in postman/openapi.json
- [X] T029 [P] [US3] In src/public/trending.js and src/public/newest.js: register `refreshAvailableIn()` on the controller, `Math.max(0, maxAge - (Date.now() - state.receivedAt))`, `maxAge` from the config field (10000 when absent)
- [X] T030 [US3] In src/public/tabs.js `updateRefreshButton` and the Refresh click handler: the wait is the larger of `nextAllowedIn(activeTab)` and the active controller's `refreshAvailableIn()` when it has one, in the `aria-disabled` form T023 introduced

**Checkpoint**: T025–T026 pass.

---

## Phase 7: User Story 5 - Every client is held to the stretched interval under load (Priority: P2)

**Goal**: search and refresh buckets refill at `floor × k`; stretched refusals counted; the controller line reports both counters (FR-014, FR-014a, contracts A3, A6).

**Independent Test**: quickstart step 6.

### Tests for User Story 5

- [X] T031 [P] [US5] In tests/load-floors.test.ts: with `k:refresh = 3`, a session's sixth refresh 6 s after a burst of five is refused `429 too-soon` and increments `stats:floor:stretched`; at 16 s it is allowed; with `k = 1` the same sequence matches today; `vote` and `live` buckets ignore `k`
- [X] T032 [P] [US5] In tests/load-controller.test.ts: the log line ends with `tabs=<fast>/<full> stretched=<n>` using the counts since the previous line, and the counters are cleared after they are logged (an increment between `rename` and `del` is never lost)

### Implementation for User Story 5

- [X] T033 [US5] In src/load/floors.ts `enforceFloor`: the refill interval is `await budget.nextRefreshMs(kind)` for `search` and `refresh`, `config.floors[kind]` otherwise; on a refusal where `interval > config.floors[kind]` and `remaining <= interval - config.floors[kind]`, `INCR stats:floor:stretched` (10 min TTL)
- [X] T034 [US5] In src/load/controller.ts: when the line is written, read and clear `stats:tabs:fast`, `stats:tabs:full`, `stats:floor:stretched` (`rename` to `<key>:read`, `get`, `del`; a missing key is 0) and append `tabs=<fast>/<full> stretched=<n>`

**Checkpoint**: T031–T032 pass.

---

## Phase 8: User Story 6 - Background work runs less often, with no visible difference (Priority: P3)

**Goal**: counter flush 10 s, invitation sweep 30 s (FR-015–FR-017, contract A7).

**Independent Test**: quickstart step 1.

### Tests for User Story 6

- [X] T035 [P] [US6] Update tests/config.test.ts: `ENV_COUNTER_FLUSH_SWEEP_INTERVAL` defaults to 10000, an explicit value is used, and `ENV_MIN_MANUAL_REFRESH_INTERVAL` below it is accepted; in tests/sweeps-lock.test.ts (or tests/invitations-send.test.ts) the schedule list has `invitationSweep` at 30000 and every other sweep unchanged; tests/invitations-send.test.ts still shows invitations sent at once when an open poll is saved

### Implementation for User Story 6

- [X] T036 [P] [US6] Set the `ENV_COUNTER_FLUSH_SWEEP_INTERVAL` default to `10_000` in src/config.ts and `INVITATION_SWEEP_INTERVAL_MS` to `30_000` in src/polls/sweeps.ts (since TWEAK03 the setting `ENV_INVITATION_SWEEP_INTERVAL`)
- [X] T037 [P] [US6] Set `ENV_COUNTER_FLUSH_SWEEP_INTERVAL` to `10000` in .do/app.yaml, every configuration in launch.json.example and devScripts.example/launch-dev.ps1

**Checkpoint**: T035 passes.

---

## Phase 9: User Story 7 - Developers can find how refreshes work (Priority: P3) — Post-implementation documentation

**Goal**: the documents explain refreshes and state the new values (FR-018, FR-019).

**Independent Test**: quickstart step 7.

- [X] T038 [US7] Rewrite `ARCHITECTURE.md` *Refresh model and the three load bounds*: the five mechanisms (sweeps, vote path and consumer, Refresh button, implicit refreshes, Live Results timer), sweeps produce and refreshes read, the load table at the defaults (from the requirements report RS2), the rate and freshness limits (RS4), the personal-tab shortcut and its signals, the Live Results back-off, the 10 s listing lifetime and Refresh availability, the stretched floors and the controller line fields; port Mermaid diagrams 2.1, 2.2 and 2.6 from requirements/20261028-151716-refresh-mechanisms/requirements-report.md; replace "Nothing refreshes on its own except the Live Results tab"; record the Trending/Newest browser-only floor as by design
- [X] T039 [US7] Update `ARCHITECTURE.md` *Sweeps*: invitations 30 s, the counter-flush sequence note "every 2 s" to "every 10 s (`ENV_COUNTER_FLUSH_SWEEP_INTERVAL`)"
- [X] T040 [P] [US7] Update the settings tables in CLAUDE.md and README.md: `ENV_COUNTER_FLUSH_SWEEP_INTERVAL` 10000; remove "Must not be below `ENV_COUNTER_FLUSH_SWEEP_INTERVAL`" from `ENV_MIN_MANUAL_REFRESH_INTERVAL`; `ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL` and `ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL` say the published lifetime is the smaller of the interval and 10 s; update any README sentence stating the 2 s flush or 5 s invitation pickup

**Checkpoint**: searching the three documents finds no 2 s flush and no manual-floor rule.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [X] T041 Run `npx tsc --noEmit` and `npm test`; fix only failures caused by this feature
- [X] T042 Run tests/openapi-contract.test.ts and confirm `/api/config`'s new fields are described
- [ ] T043 Walk through quickstart.md steps 1–7 on a development server and note the results under "Notes"
- [X] T044 Measure SC-001 with `memoryCache`: time 100 shortcut refreshes of a 200-poll tab in a test (in production it is checked through the `[controller]` line's `tabs=` counts); record the median and the 95th percentile under "Notes"
- [X] T045 Rename the eleven sweep and refresh settings and add `ENV_INVITATION_SWEEP_INTERVAL` (30000) in src/config.ts (old names refused at start-up), src/polls/sweeps.ts, .do/app.yaml, launch.json.example, devScripts.example/launch-dev.ps1, the docs and tests/config.test.ts, tests/invitations-send.test.ts (TWEAK03)
- [X] T046 Regroup devScripts.example/launch-dev.ps1 (and the local devScripts/launch-dev.ps1) into the eleven groups of requirements/environmentVariablesGroups.md, add `ENV_PROTOTYPES`, `ENV_DATABASE_CA_CERT` and `ENV_EMAIL_SEND_TIMEOUT`, fix `ENV_PUBLIC_ORIGIN` (8081) and the duplicate `ENV_MAX_INVITATIONS_PER_DAY`, and bring the groups document up to date (TWEAK04)
- [X] T047 Rename eight more settings (`ENV_POLL_EDIT_HEARTBEAT_INTERVAL`, `ENV_LIVE_RESULTS_MAX_IDLE_TIME`, `ENV_SCREENING_CALL_TIMEOUT`, `ENV_MAX_SIGNIN_COOKIE_DURATION`, `ENV_MAX_PRIVATE_POLL_VOTERS`, `ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES`, `ENV_SERVER_MAX_REQUESTS_PER_SECOND`, `ENV_SERVER_MAX_REQUESTS_PER_INSTANCE_PER_SECOND`) in src/config.ts (old names refused at start-up), the configuration files, docs, source comments and tests (TWEAK06)
- [X] T048 Rename `ENV_SERVER_MAX_SEARCH_PER_SECOND_FALLBACK` to `ENV_SERVER_MAX_SEARCH_FALLBACK_PER_SECOND` in src/config.ts (old name refused at start-up), the configuration files, docs and tests/config.test.ts (TWEAK08)
- [X] T049 Rename eighteen `AppConfig` fields after their settings (`Ms` kept), and the six matching `/api/config` keys, in src/, src/public/ (adminCard.js, liveResults.js, loginCard.js, newest.js, trending.js), postman/openapi.json, contracts/api.md and the tests (TWEAK11)
- [X] T050 Bring every setting in .do/app.yaml, launch.json.example, devScripts.example/launch-dev.ps1 and the local launch files to its code default, except the commented development overrides (port, stay signed in, email rate limit, private voter limit); production email requests per window 5 → 2; add the missing `ENV_EMAIL_SEND_TIMEOUT`, `ENV_MAX_INVITATIONS_PER_DAY` and `ENV_STAY_SIGNED_IN` (TWEAK12)

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 → Phase 2 → stories. Phase 2 blocks US1 only; US2–US6 can start after Phase 1; US7 (post-implementation documentation) follows US1–US6.
- Phase 10 after the stories you ship.

### User Story Dependencies

- **US1** needs T003 and T005.
- **US2**, **US5**, **US6** are independent.
- **US7** depends on US1–US6: it documents their behaviour after implementation (constitution, Documentation Deliverables).

### Within Each User Story

Tests first and failing → implementation → checkpoint.
Within US1: T010 before T011 (both in src/routes/tabsApi.ts); T012–T016 in any order after T005.

### Parallel Opportunities

- T002 ∥ T004; T003 ∥ T005 once their tests exist.
- US1 tests T006–T009 together; signal tasks T013–T016 together.
- US2, US5 and US6 can be built in parallel with US1 (different files).
- T029 ∥ T023 ∥ T024; T036 ∥ T037; T040 ∥ T038.

---

## Parallel Example: User Story 1

```text
Task: T006 shortcut tests in tests/tabs-refresh-shortcut.test.ts
Task: T007 signal tests in tests/tabs-refresh-signals.test.ts
Then, after T011:
Task: T013 bookmarks and shared link signals
Task: T014 invitation signals
Task: T015 consumer signals
Task: T016 account deletion projections
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

Phases 1–3: the largest load saving and the most visible speed-up. Stop at the Phase 3 checkpoint and run quickstart step 2.

### Incremental Delivery

1. US1 → the shortcut.
2. US2 → Live Results back-off.
3. US4, then US3 → the button's wait, then Trending/Newest.
4. US5 → stretched floors (needs its own load test before production, spec Assumptions).
5. US6 → intervals.
6. US7 → documents.

---

## Notes

- Commit after each checkpoint.
- A missed change signal shows a stale tab for at most 5 minutes (research R2); T007 is the guard, so extend it whenever a new write to `user_polls`, `poll_invitations` or `poll_bans` is added.
- Research R9: when `k` rises, an obedient browser can be refused once with `retryAfterMs`, as US5 scenario 3 and SC-006 allow.
- T001 (2026-10-28): `npx tsc --noEmit` passed before any change. The full `npm test` baseline run overlapped edits to the test files, so its failures cannot be attributed; every suite that failed in it passes on its own after the change. The whole suite is rerun in T041.
- Implementation (2026-10-28): Shared With You now narrows by access after loading (`sharedWithYouKept`) instead of in SQL, so the shortcut's condition 3 sees a poll that changes its sharing mode (research R2 updated); `tests/tabs-shared-with-you.test.ts` caught it.
- T041 (2026-10-28): `npx tsc --noEmit` passes. Full `npm test`: 131 files passed, 3 failed with 9 tests, all pressing Refresh on Trending or Newest about 1.2 s after load; they now wait for the 10 s max-age (FR-012). The three suites (`client-home`, `client-maximized`, `client-bar-colours`) now use a 1 s recompute interval (`LISTING_MAX_AGE_1S` in `tests/helpers/browser.ts`) and pass (113/113).
- T042 (2026-10-28): `tests/openapi-contract.test.ts` passes; `/api/config` describes `trendingMaxAgeMs` and `newestMaxAgeMs` (required).
- T043 (2026-10-28), partly done: step 1, the sweep intervals, is checked by `buildSweepSchedules` in `tests/invitations-send.test.ts` (the log line prints them as `[sweeps] <name> every <ms>ms (lock <n>)`); steps 4.1–4.2 by `tests/trending.test.ts`; step 6 by `tests/load-floors.test.ts` and `tests/load-controller.test.ts`; step 7 by a search of the three documents (feature 017's note in CLAUDE.md amended). Steps 2, 3 and 5 need two signed-in browsers and are still to be walked through by hand.
- T044 (2026-10-28): 100 shortcut refreshes of a 200-poll Your Polls tab with `memoryCache`, timed through supertest: median 1.6 ms, 95th percentile 2.3 ms, no table queries (`tests/tabs-refresh-shortcut.test.ts`, "SC-001").
- Implementation (2026-10-28): `liveResults.js`'s `restore()` (opening the tab with nothing held) did not record `nextRefreshMs`, so a back-off after it started from the floor; `tests/client-live-backoff.test.ts` caught it.
