# Research: Home Tab

Feature: `specs/20261103-120521-HOME-TAB/spec.md`; requirements report `requirements/20261103-120521-home-tab/requirements-report.md` (RS1, IN1–NC1).
Every decision below cites the finding or clarification it carries out.

## R1. Where a user's Home membership lives

- **Decision**: in the cache, one string key per user, `home:<emailKey>` (`emailKeyOf`, as `tabs:v:` and `tabs:seen:` already use), holding JSON:
  `{ v, builtAt, order, relations, trendingReady }` — `v` the user's list version (`tabs:v:<emailKey>`) the list was built under, `order` the ordered pids, `relations` per pid the reasons it is listed (R7), `trendingReady` whether rule 5 was filled.
  It is written with a TTL of `ENV_HOME_TAB_REFRESH_INTERVAL` (`homeTabRefreshIntervalMs`), or of `ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL` when the trending listing was missing (R4, FR-016).
- **Rationale**: RS1 A; FR-017 (shared by every instance: Valkey in production, `memoryCache` in development and tests); no table, no migration (spec Assumptions).
- **Alternatives**: a sweep over all users (RS1 B, rejected: work ∝ all accounts); no cache (RS1 C, rejected: ignores the periodic refresh); a table (rejected: the list is derived, short-lived state).

## R2. Rebuilding: one candidate query for rules 1–4

- **Decision**: `loadHomeCandidates(db, email, now, limit)` reads, through `user_polls_email_updated`:
  `user_polls ⨝ polls` where `user_polls.email = $email` and `relation in ('invited','linked','created','voted','bookmarked')`, and the poll passes the eligibility of R3, grouped by poll (each poll's relations with each one's `updated_at`), ordered by the poll's most recent relation first, limited to `limit` = `ENV_MAX_HOME_PAGE_POLLS` (`config.maxHomePagePolls`, default 200) distinct polls (U3 developer resolution, FR-018a).
  The distinct pids' rows are then loaded once (`selectAll`, as `personalTab` does).
- **Rationale**: RS1's measurement: one index range scan per rebuild, the cost of one personal-tab refresh (SC-008), instead of four loaders (TD2).
  The limit bounds a pathological account; a user who holds more relations than that still gets the most recent ones.
- **Alternatives**: calling `sharedWithYouTab`, `yourPollsTab`, `yourVotesTab` and `watchingTab` and merging (rejected: four queries, four caps that are not the rule caps).

## R3. Eligibility: published states and the date windows

- **Decision**: in SQL, with `s` = `case when poll_state = 'EDITING' then poll_state_before_edit_update else poll_state end`:
  - `s = 'WAITING TO OPEN'`, or
  - `s = 'OPEN' and launched_at >= now − 2 months`, or
  - `s = 'CLOSED' and closed_at >= now − 7 days`.
  Months are calendar months in UTC (`setUTCMonth(−2)`, as `removeExpiredBookmarks` does).
  Constants `HOME_LAUNCH_WINDOW_MONTHS = 2`, `HOME_CLOSED_WINDOW_DAYS = 7`, `HOME_RULE_CAP = 10` in `src/polls/homeTab.ts`.
- **Rationale**: AM3 A, AM4 A, IN1 (rule 2 has the same window); FR-008, FR-009.
  `launched_at` is cleared on close (TD1), so a CLOSED poll is judged by `closed_at` alone; a reopened poll has a new `launched_at` (spec edge case).
  An OPEN poll whose `launched_at` is null (none should exist, since every transition to OPEN stamps it) is not eligible.
- **Alternatives**: a `first_launched_at` column (AM3 B, rejected: migration, and no back-fill for closed polls).

## R4. Assigning rules, caps and rule 5

- **Decision**: `composeHomeTab` walks the candidates in `updated_at desc` order and puts each pid in the first rule its relations satisfy, in rule order:
  1. `invited` or `linked`, created by someone else, and kept by `sharedWithYouKept` (private; an Invitation Only poll needs a current invitation) — cap 10;
  2. `created` — cap 10;
  3. `voted`, kept by `reachableMany` — cap 10;
  4. `bookmarked`, kept by `mayWatchMany` — no cap of its own (bounded by `ENV_MAX_BOOKMARKS_PER_USER`, AM1 A);
  5. the pids of the cached TRENDING listing (`listing:trending:counts`, its `polls` array, already ranked), skipping those listed — cap 10.
  A pid that fails its rule's narrowing, or a full rule, may still be placed by a later rule it satisfies.
  Within rules 1–4 the order is the most recent `updated_at` among the rule's relations (AM7 A, FR-010).
  When the listing is missing, rule 5 is empty and `trendingReady` is false (R1, UA7).
- **Rationale**: FR-007; AM2 (participated = voted), AM5 (same rule as Shared With You); rule 5 needs no database read (RS1).
  Reading the counts object (not the cards object) gives the order without the projections, which the refresh reads per pid anyway.
- **Alternatives**: ranking trending afresh per user (rejected: duplicates the sweep).

## R5. Every refresh re-checks access

- **Decision**: on every refresh, after reading (or rebuilding) the membership, the listed rows are loaded (`selectAll where id in order`) and narrowed:
  - every row must be `isPublished` (an archived or deleted poll drops out);
  - rule-1 rows must stay in `sharedWithYouKept`;
  - all rows must stay in `reachableMany` (a poll made private, or an invitation withdrawn);
  - rule-4 rows must stay in `mayWatchMany` (a ban removes a watched poll at the next refresh, as on Watching; I2 A).
  Otherwise bans do not remove a poll (they block voting, as everywhere: `voteBlocks`).
- **Rationale**: FR-011, FR-015, US2 scenario 5; the same functions as the source tabs, four small `in (…)` queries.
- **Alternatives**: checking only at rebuild (rejected: a poll made private would stay up to 2 hours).

## R6. A change on a Home card does not reorder Home while it is showing (clarification Q2)

- **Decision**: the refresh request may carry `"keepOrder": true`.
  When it does, and a cached membership exists that has not expired, the server reuses it even though the user's list version changed.
  The client sets `keepOrder` once the user votes on, watches, unwatches or adds a choice to a card on Home, and clears it whenever Home is opened: the tab is selected (from another tab, the "All tabs" menu or the avatar menu) or the page loads.
  The first request after an opening never carries it, so it rebuilds when the version changed (FR-014).
  Per-refresh access narrowing (R5) still applies with `keepOrder`.
- **Rationale**: clarification Q2 A; FR-014; US2 scenario 3; keeps the server stateless about where a change came from.
- **Trade-off**: while `keepOrder` is set, a change made elsewhere (another window) also waits for the next opening or the interval; the window is one viewing of Home, and the other window's own Home is current.
- **Alternatives**: suppressing membership changes in the browser (rejected: it would also suppress the access removals of R5); a server-side "origin" flag on each relation write (rejected: touches every writer).

## R7. Why each poll is listed (clarification Q1)

- **Decision**: the overlay's `relations` (FIX020) for a Home poll carries every relation the user holds to it among `invited`, `linked`, `created`, `voted`, `bookmarked` (from the candidate rows), and `["trending"]` for a pid placed only by rule 5.
  `deltaClient.toPollDetail` passes them through unchanged; `pollCard.js`'s words gain `created: 'Your poll'` and `trending: 'Trending'`, which only Home sends.
- **Rationale**: FR-005a; acceptance 1.8; reuses the existing line (`.poll-listed-because`, `.poll-voted`).
  The `relations` overlay field widens from `UserPollRelation[]` to `HomeReason[]` = `UserPollRelation | "trending"` for the Home route only.
- **Alternatives**: group headings (AM7 B, rejected by the requirements).

## R8. The route and the refresh path

- **Decision**: `POST /api/tabs/home/refresh`, under `requireSession` and `dynamic("refresh")`, like the four personal tabs, in `tabsApi.ts`.
  It answers through the existing `personalListing` → `computeDelta` → `sendDelta` path, so the response shape, `304`, `nextRefreshMs`, overlays and vote blocks are those of the other personal tabs (FR-005, FR-020).
  The existing `shortcut(email, "home", request)` and `recordSeen` serve unchanged refreshes from the live counts alone; the `TabSeen.v` check means a rebuilt membership never meets a stale shortcut.
  `membershipVersion` is the membership's `builtAt` ISO string, so the browser sees a new list exactly when it was rebuilt.
  A caller without View Polls gets an empty listing, as on the other personal tabs.
- **Rationale**: FR-005, FR-013, FR-020; no new response shape (UA-level reuse).
- **Alternatives**: a guest-capable route (rejected: UA3, Home is signed-in only).

## R9. Guests: hidden, not disabled (UA3 developer resolution)

- **Decision**: the Home tab button is `hidden` while no session is known; `applyGuestState` shows it on sign-in and hides it on sign-out, selecting Trending when it was active (FR-002, FR-004).
  `tabBarScroll.js`'s `buildTabMenu` and `tabs.js`'s `moveTabFocus` skip hidden tabs.
  `select("home")` by a guest (a stale link) selects Trending instead of going to `/login`.
- **Rationale**: UA3 B; FR-002, FR-023; the other personal tabs keep their disabled behaviour.

## R10. Landing and the avatar menu

- **Decision**:
  - `tabs.js` `init` ends with `select(isSignedIn() ? "home" : "trending")` (NC1 A, FR-003); `/?PID=`, `/poll/:pid`, `/?open=` landings and `?q=` still run first.
  - `home` joins `PERSONAL_TABS`, `LANDING_TABS` and `KIND_OF` (`refresh` kind).
  - `app.js` adds `HOME_GLYPH` and a first menu item "Home", `href="/?tab=home"`, for every signed-in user (FR-021).
    On `/` (when `window.Tabs` exists) its click is intercepted: the menu closes and `Tabs.select("home")` runs, with no reload (FR-022).
- **Rationale**: NC1 A, UA4; BC1, BC3.

## R11. The icons

- **Decision**:
  - Tab bar: `<svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` with a house outline (roof `M3 10.5 12 3l9 7.5`, body `M5 9v11h14V9`, door `M10 20v-6h4v6`), styled like Search.
  - Avatar menu: `HOME_GLYPH`, `<circle cx="32" cy="32" r="32" fill="currentColor"/>` with the same outline scaled into the circle, stroked in `var(--paper)`, like `SETTINGS_GLYPH`.
- **Rationale**: UA2; follows `currentColor` and `--paper` in both schemes (SC-007); no image file.

## R12. The settings

- **Decision**: `ENV_HOME_TAB_REFRESH_INTERVAL` → `config.homeTabRefreshIntervalMs`, `read.int`, default `7_200_000`; below `60_000` throws `ConfigError("Invalid ENV_HOME_TAB_REFRESH_INTERVAL: <v> — must be at least 60000.")`.
  `ENV_MAX_HOME_PAGE_POLLS` → `config.maxHomePagePolls`, `read.int`, default `200`; below `1` throws `ConfigError("Invalid ENV_MAX_HOME_PAGE_POLLS: <v> — must be at least 1.")` (R2, FR-018a).
  Listed in `.claude/rules/environment.md`, `launch.json.example`, `devScripts.example/launch-dev.ps1` and `.do/app.yaml` (a plain value, not a secret).
- **Rationale**: IN2 A; FR-018; the newest-interval check is the model.

## R13. Observability

- **Decision**: two counters beside `stats:tabs:fast` / `stats:tabs:full`: `stats:home:rebuilt` and `stats:home:reused`, with `countStat` (10-minute TTL); no per-request log line.
  A failure to read or write `home:<emailKey>` logs `[home] Could not …` with the error and falls back to a rebuild (read) or to answering without caching (write).
  No email address is logged (the key is the email key).
- **Rationale**: constitution V (informative, not noisy); CLAUDE.md "logs never carry a full email address".

## R14. Tests

- **Decision**:
  - `tests/home-tab.test.ts` (supertest + embedded PostgreSQL): each rule and cap, first-rule-wins, each date-window boundary and excluded state (SC-002), rule 5 from a published listing and its absence, reuse within the interval (one rebuild, SC-003), rebuild after `forgetTabs`, `keepOrder`, per-refresh access removal, no invitation acceptance (FR-012), View Polls, `401` for guests.
  - `tests/config.test.ts`: default, value, below-minimum.
  - `tests/client-home-tab.test.ts` (jsdom): hidden for guests and in the "All tabs" menu, landing tab by session, sign-out → Trending, `keepOrder` set by a card action and cleared on opening, the reason line words.
  - `tests/client-home-menu-item.test.ts` (jsdom): Home first, for every signed-in user, `/?tab=home` from another page, in-page select on `/`.
  - Existing suites that pin the menu (`client-create-poll-item`, `client-site-settings`, `client-m3-header`, `client-home`) are checked for item order and count.
  - Existing suites that count tabs or menu items are updated (BC1, BC2).
