# Research: Refresh Mechanisms

Every decision below is taken from reading the code on branch `refresh-research`.
The requirements report (`requirements/20261028-151716-refresh-mechanisms/requirements-report.md`) holds the background research RS1–RS9; this file holds only what the implementation needs.

## R1. What the per-user list version is keyed by, and how a change is signalled

**Decision**: one cache key per **email key** (`emailKeyOf` in `src/auth/allowlist.ts`'s TypeScript twin), `tabs:v:<emailKey>`, holding an opaque unique value (`<Date.now()>-<random>`), created with `setNx` (24 h TTL) at the start of a full personal-tab answer.
A change is signalled by **deleting** the key (`forgetTabs(cache, emails)`), never by incrementing it.

**Rationale**:
- `user_polls`, `poll_invitations` and `poll_bans` are keyed by address, not user id; an invitation can be written for an address that differs from the account's only by email key (dots, `+tag`), and the Shared With You tab adopts it (`adoptInvitations`). Keying by email key catches that write.
- Deleting is race-free against a concurrent full answer: the answer reads the value **before** its queries and records it; a delete during the queries leaves the key missing, so the next refresh is full.
- A fresh random value after every recreation means an old record can never match a new key (no A-B-A), which an incremented counter recreated at 1 would allow.

**Alternatives considered**: keyed by user id (misses email-key invitations); `incr` on change (A-B-A after expiry); fan-out to every user listing a poll on a content change (spec FR-003 rejects it).

## R2. What a refresh must remember to answer without the database

**Decision**: after every full answer, store `tabs:seen:<emailKey>:<tab>` (TTL 5 minutes) holding:
`v` (the version read before the queries), `membershipVersion` and `order` as sent, and for **every row loaded before narrowing** its id, its row `content_version`, and the content version sent to the browser (0 for a "not published" placeholder).

A refresh takes the shortcut only when all hold:
1. `tabs:v:<emailKey>` exists and equals `seen.v`;
2. the request's `membershipVersion` and held ids equal `seen.membershipVersion` and `seen.order`;
3. for every loaded row, the cached projection exists and its `contentVersion` equals the recorded row version;
4. for every held id, the request's content version equals the one sent.

The answer is then `computeDelta` over the cached counts only: `304`, or the moved counters.

**Rationale**:
- Your Votes and Watching narrow their rows by access (`reachableMany`, `mayWatchMany`); a poll hidden by narrowing can become visible again through its own content change, so its version must be checked even though it is not in `order`.
  Shared With You narrows the same way (`sharedWithYouKept`: private, and an Invitation Only poll only with a current invitation) instead of filtering in SQL, so a poll that turns private or Anyone With The Link again is among the loaded rows (found in implementation).
- The 5-minute TTL is the safety net for a write site that forgets to signal (spec edge case): staleness is bounded, and the record is small (≤ 200 entries).
- The response shape is today's, so the browser cannot tell the two paths apart (FR-006).

**Alternatives considered**: trusting the browser's held ids alone (cannot see narrowed-out polls); caching the whole finished listing (spec UA2 option B, rejected).

## R3. Where a change must be signalled (FR-002)

**Decision**: after the transaction commits, call `forgetTabs` with every address whose relations, invitations or bans changed:

| Write | File | Addresses |
|---|---|---|
| `upsertUserPolls` (created, invited, voted, bookmarked, linked) | `store.ts` callers: `insertPoll`, `updatePoll`, `writeBatch` (consumer), `bookmarks.ts`, `invitations.ts`, `userPolls.ts` `upsertRelation` (shared link) | the rows' emails |
| `deleteFrom("user_polls")` | `store.ts` (voted removal, withdrawn invited), `bookmarks.ts` (remove, expiry sweep), `invitations.ts` (removed invitees, adoption) | the rows' emails |
| `writeRoster` (`poll_invitations`, `poll_bans`) | `store.ts` `insertPoll`, `updatePoll`; `invitations.ts` | old ∪ new roster |
| invitation adoption (address swap) | `invitations.ts` | both addresses |


Permissions are not written by any route (they are set in the database); the personal-tab routes keep checking `View Polls` before the shortcut, so losing it empties the tabs at once, and a lost `Vote on Polls` reaches the cards' vote-blocked reason within the 5-minute record lifetime of R2.
Not signalled: `sent_at`, `reminded_at`, `send_failed_at`, `accepted_at`, `added_at`, tokens: none of them changes what the invitee's tabs show.
Account deletion needs none for the deleted account; its polls go through R4.

**Rationale**: a signal before commit can be overtaken by a refresh that reads the uncommitted (old) state and records the new key; only after commit is safe.
Where a function receives a caller's transaction (`trx`), it returns or collects the addresses and the caller signals after commit.

**Alternatives considered**: a database trigger feeding a queue (new machinery); signalling inside the transaction (unsafe, above).

## R4. Deleted polls (FR-003a)

**Decision**: `deletePoll` in `store.ts` and `deleteAccount` (own polls) delete each poll's `poll:<pid>` projection after commit.
A tab listing a deleted poll fails condition 3 of R2 and builds a full answer without it.

**Rationale**: two delete sites, no lookup of related users (clarification 2026-10-28).

## R5. Projection writes (FR-008)

**Decision**: two new cache methods, `getMany(keys)` (Valkey `MGET`) and `setMany(entries)` (one pipeline of `SET`), in `cache.ts`, `memoryCache.ts` and `valkeyCache.ts`.
`personalListing` and `answerSearch` read the readable rows' projections with one `getMany` and write, with one `setMany`, those that are missing **or whose `contentVersion` differs from the row's**; the store's own writes are unchanged.
The shortcut of R2 reuses the same `getMany` for condition 3.

**Rationale**: today up to 200 sequential `SET`s per refresh (`for … await refreshProjection`).
Rewriting a stale projection keeps the self-healing that Live Results relies on after a deploy changes `projectPoll`.

## R6. Live Results back-off (FR-009, FR-010)

**Decision**: all in `liveResults.js`.
A module variable `backoffMs` (0 = none) and `serverNextMs` (the last `nextRefreshMs` from a 200, else the live floor).
- After a `304`: `backoffMs = min(max(backoffMs * 2, serverNextMs * 2), 10000)`; schedule `max(serverNextMs, backoffMs)`.
- After a `200`: `backoffMs = 0`; schedule `nextRefreshMs` as today.
- `resetBackoff()` (sets 0 and, if a timer is pending longer than `serverNextMs`, reschedules at `serverNextMs`) is called from the panel interaction listener when the interaction is a vote, from `addPoll`, `removePoll`, and from the `visibilitychange` handler when the page becomes visible (visibility only: a page that stays visible keeps refreshing, so window `focus` is not listened to).
Refusals (`429`, `503`) keep today's wait (`retryAfterMs`) and also reset the back-off (`backoffMs = 0`), so the next unchanged answer starts again from `serverNextMs`.

**Rationale**: `live.touch` registers the tab until `now + nextRefreshMs + ENV_LIVE_RESULTS_MAX_IDLE_TIME`, so a 10 s wait cannot expire it; the budget controller's activity factor reads backed-off tabs as less active, which is the intended effect.
Sequence for a quiet poll: 2, 4, 8, 10, 10… s, so at most 8 requests a minute (SC-003).

## R7. CDN lifetime of Trending and Newest (FR-011, FR-012)

**Decision**: `listingMaxAgeMs(intervalMs) = Math.min(intervalMs, 10000)` exported from `src/trending/publish.ts`, used by `createListingPublisher` (Spaces `Cache-Control`) and `serveListingObject` in `tabsApi.ts` (instance-served copy), and sent by `/api/config` as `trendingMaxAgeMs` and `newestMaxAgeMs`.
`trending.js` and `newest.js` expose `refreshAvailableIn()` on their controller: `max(0, maxAge − (now − state.receivedAt))`.
`tabs.js`'s `updateRefreshButton` and its click handler take the larger of the bucket wait and the controller's `refreshAvailableIn()` when present.
The browser copy's own lifetime for tab clicks stays the recompute interval.

**Rationale**: one constant on the server; the browser learns it from `/api/config`, as it already learns the recompute intervals.

## R8. The Refresh button's wait (FR-013)

**Decision**: `#refreshBtn` uses `aria-disabled="true"` instead of the `disabled` property; its click handler ignores clicks while `aria-disabled` is true; the two CSS rules that style `:disabled` (`tabs.css` `.tab-refresh:disabled`, `header-tab-bar-m3.css` `.tab-refresh--icon:disabled` and its `::before`) gain `[aria-disabled="true"]` selectors with the same declarations.
While waiting, `updateRefreshButton` sets `title` to `Refresh available in N s` (N = `Math.ceil(wait / 1000)`) and re-runs every second; when available, `title` returns to `Refresh`.
`tooltip-m3.js` already adopts a changed `title` into `data-tooltip` and re-shows it when its element is the current anchor, so a shown tooltip counts down.

**Rationale**: a `disabled` button receives neither focus nor, in several browsers, pointer events, so its tooltip could never show (spec: "hovering or focusing the disabled button").
The codebase already uses `aria-disabled` for guest tabs (feature 024).

## R9. Holding clients to the stretched interval (FR-014) and counting it (FR-014a)

**Decision**: in `src/load/floors.ts`, the refill interval is `await budget.nextRefreshMs(kind)` for `search` and `refresh`, and `config.floors[kind]` for `live` and `vote` (unchanged).
A refusal counts as **stretched** when `interval > base floor` and `remaining ≤ interval − base floor`: at the base floor that request would have been allowed.

Three fleet-wide counters, `INCR` with a 10-minute TTL: `stats:tabs:fast`, `stats:tabs:full` (personal-tab answers by path) and `stats:floor:stretched`.
`controllerTick` reads and clears them, by `rename` to `<key>:read` then `get` and `del`, only when it writes its log line, and appends `tabs=<fast>/<full> stretched=<n>`.

**Rationale**: the controller line is already written at least once a minute by the one instance holding lock 8; renaming before reading loses no increment.
The bucket keeps one state across interval changes, so when `k` rises a browser that obeyed the previous `nextRefreshMs` can be refused once, with `retryAfterMs`, which `tabs.js` already honours; the spec's "none refused" (US5 scenario 3, SC-006) holds except at that instant.

**Alternatives considered**: a second, base-rate bucket to count exactly (doubles the cache work per request).

## R10. Sweep intervals and documents (FR-015–FR-019)

**Decision**:
- `ENV_COUNTER_FLUSH_SWEEP_INTERVAL` default `10_000` in `src/config.ts`; `10000` in `.do/app.yaml`, every configuration of `launch.json.example` and `devScripts.example/launch-dev.ps1`.
- The invitation sweep runs at `ENV_INVITATION_SWEEP_INTERVAL`, default `30_000` (`config.invitationSweepIntervalMs`; a constant in `src/polls/sweeps.ts` until TWEAK03).
- TWEAK03 renamed eleven settings (`ENV_COUNTER_FLUSH_INTERVAL` → `ENV_COUNTER_FLUSH_SWEEP_INTERVAL`, `ENV_MAX_STRETCH` → `ENV_MAX_REFRESH_AND_SEARCH_STRETCH`, …); `loadConfig` refuses to start while an old name is set, naming its replacement (`RENAMED_VARS` in `src/config.ts`).
- `CLAUDE.md` and `README.md` settings tables: the flush row says 10000; the manual floor row loses "Must not be below `ENV_COUNTER_FLUSH_SWEEP_INTERVAL`"; the two recompute rows say the published lifetime is at most 10 s.
- `ARCHITECTURE.md`: *Refresh model and the three load bounds* rewritten around the five mechanisms (sweeps, vote path, Refresh button, implicit refreshes, Live Results timer), the load table, the rate and freshness limits, the per-user list version, the Live Results back-off and the 10 s listing lifetime; the sentence "Nothing refreshes on its own except the Live Results tab" replaced; *Sweeps* table: invitations 30 s, the flush's "every 2 s" note updated; TD3 recorded as by design.
- Tests that pin old values: `tests/config.test.ts` (flush default), `tests/newest.test.ts` and `tests/trending.test.ts` (`max-age=60`), and any jsdom test reading `refreshBtn.disabled`.

**Rationale**: the counter flush must not be below the manual floor only in documentation; RS6 shows nothing relies on it, so no `loadConfig` check is added.
