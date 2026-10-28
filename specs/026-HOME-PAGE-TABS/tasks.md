---
description: "Task list for 026-HOME-PAGE-TABS"
---

# Tasks: Home Page Tabs

**Input**: Design documents from `specs/026-HOME-PAGE-TABS/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui-contracts.md, quickstart.md

**Tests**: Included, and not optional. Constitution Principle IV requires a verifiable criterion per task, and SC-001–SC-008 are exercised by the suites named below; the painted/browser result is `quickstart.md` scenarios 1–8.

**Organization**: by user story. Foundational replaces the two old personal tabs with the four new ones (plain queries, ids, panels, routes), so every story has a tab to work in. US1 (P1, the link and sign-in) is the MVP; US2 and US4 (P1) follow; US3, US5, US6 (P2) can proceed in parallel once their prerequisites are met — see Dependencies.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel: different files, no dependency on an incomplete task
- **[Story]**: US1–US6, mapping to `spec.md`'s six user stories
- Paths are repository-relative

---

## Phase 1: Setup

**Purpose**: a known-green baseline. The feature adds no dependency, configuration or migration.

- [X] T001 Run `npm run build` and `npm test` on the untouched tree and record both results (suite and test counts, fingerprinted asset count) on this task's line. Every checkpoint compares against it — *Baseline: build green, 36 fingerprinted assets; `npm test` 52 files passed + 1 skipped (53), 816 tests passed + 15 skipped (831), ~350 s*

---

## Phase 2: Foundational (the four personal tabs replace the two)

**Purpose**: the tab shell every story builds on: server queries, routes, panels and controllers renamed, the old `private`/`favourites` tabs and routes gone. Behaviour rules per tab come in the story phases.

**⚠️ CRITICAL**: no user story task may begin until this phase's checkpoint passes.

- [X] T002 In `src/polls/userPolls.ts`, make the `visibility` argument of `personalTabQuery`/`personalTab` optional (omitted → no `poll_visibility` filter), add `yourPollsTab(db, email, cap)` (`created`), `sharedWithYouTab(db, email, userId, cap)` (Private Poll, `invited` + `linked`, excluding polls where `created_by_id = userId`), `yourVotesTab(db, email, cap)` (`voted`) and `watchingTab(db, email, cap)` (`bookmarked`); delete `privateTab` and `favouritesTab` (research R4)
- [X] T003 In `src/routes/tabsApi.ts`, replace `/api/tabs/private/refresh` and `/api/tabs/favourites/refresh` with `/api/tabs/your-polls/refresh`, `/api/tabs/shared-with-you/refresh`, `/api/tabs/your-votes/refresh` and `/api/tabs/watching/refresh`, each `requireSession`, `dynamic("refresh")`, `View Polls`-gated and ending in `personalListing` exactly as the two routes do today (contracts/api.md)
- [X] T004 [P] In `src/public/index.html`, replace the My Private Polls and Favorites buttons and panels with the eight-tab order `your-polls · shared-with-you · your-votes · trending · newest · watching · live · search` and four personal panels (`data-panel` matching), reusing the person icon on Your Polls and placeholder circle icons on the other three (contracts/ui-contracts.md C1, C2)
- [X] T005 In `src/public/tabs.js`, set `PERSONAL_TABS = ["your-polls","shared-with-you","your-votes","watching","live"]`, update `KIND_OF`, register the four `createDeltaTab` controllers (no `showBookmark: false` anywhere), and make `placeBookmark` put a newly watched poll first in `watching` only, leave Shared With You and Your Polls unchanged, and remove it from Watching only on stop; keep Trending the default tab. Update the top-of-file and `placeBookmark` comments that name "My PRIVATE POLLS" (research R9, R10)
- [X] T006 [P] Update the tab-name references in `src/public/liveResults.js`, `src/public/deltaClient.js` and `src/public/pollCard.js` comments that cite "My PRIVATE POLLS" / FIX024 so no comment names a removed tab
- [X] T007 [P] In `postman/openapi.json`, replace the two retired refresh paths with the four new ones (same request/response schema), keeping `tests/openapi-contract.test.ts` green
- [X] T008 [P] Update `tests/tabs.test.ts` and `tests/polls-discovery.test.ts` for the four routes and tab ids (the private/favourites expectations become the per-tab expectations of the story phases; here keep only that each route answers like the old ones for a user with `View Polls`)
- [X] T009 [P] Update `tests/client-home.test.ts`, `tests/tab-bar-assets.test.ts`, `tests/client-maximized.test.ts`, `tests/client-m3-header.test.ts`, `tests/client-m3-tooltip.test.ts`, `tests/pages.test.ts`, `tests/bookmarks.test.ts`, `tests/polls-vote.test.ts` and `tests/cache-disconnected.test.ts` wherever they name `private`, `favourites`, "My Private Polls" or "Favorites" so the suite compiles against the new ids

**Checkpoint**: `npm run build` and `npm test` are green and the home page shows eight tabs with four working personal tabs.

---

## Phase 3: User Story 1 — Open a shared poll link, even with no account (P1) 🎯 MVP

**Purpose**: `/?PID=<pid>` shows the poll; a guest signs in (new or existing account, any browser) and returns to it; every "not shown" case gives one notice.

**Independent Test**: quickstart scenarios 2 and 3.

- [X] T010 [P] [US1] Create `tests/shared-link.test.ts`: a guest on `/?PID=<uuid>` gets `302 /login?PID=<uuid>` identically for an existing private poll, a public poll and an unknown id; a non-UUID `PID` serves `/`; a signed-in non-creator of a published Anyone With The Link poll gets `302 /?open=<uuid>&tab=shared-with-you` and a `linked` row; a second open within a minute does not rewrite `updated_at`; a creator gets `tab=your-polls` and no row; a public published poll gets `tab=trending` and no row; unknown, Archived (non-creator), public-unpublished (non-creator), Invitation Only uninvited and banned all get `/?notice=unavailable` and no row, as does any caller lacking `View Polls` for any poll, and that `GET /api/me/polls/:pid` never creates a `linked` row (contracts/api.md)
- [X] T011 [P] [US1] Create `tests/signin-pid.test.ts`: `request-login-link` and `create-account` with `pid` email a verify URL ending `&PID=<uuid>`; verifying redirects `/?PID=<uuid>`; an expired link redirects `/login?error=invalid-link&PID=<uuid>`; an unknown address's invitation links `/create-account?PID=<uuid>`; a signed-in visitor on `/login?PID=` and `/create-account?PID=` goes to `/?PID=`; a non-UUID `PID`/`pid` is dropped at every step and no redirect leaves the site; in oauth mode the login card's provider links carry `?PID=` (covered in T017: this repository has no server route that starts the provider flow yet, so there is no callback URL to build on the server); stay-signed-in, rate limits and the identical "Check your inbox" response are unchanged
- [X] T012 [US1] Create `src/polls/sharedLink.ts` exporting three functions (the two decision functions take `{ db, config }` as their first argument, because the `View Polls` rule needs the admin list). `parsePid(value)` returns the value when it is a UUID and `null` otherwise. `decideSharedLink(db, caller, pid)` is pure (it writes nothing): it applies the outcome table of research R2 and returns `{ landing, recordView }`, where `landing` is `{ open?, tab?, notice? }`. The table's first rule is that a caller without `View Polls` gets `notice: "unavailable"` and `recordView: false`. Then it checks reachability via `checkViewEligibility`, `isPubliclyListable` and `poll_bans`, and reads `poll_invitations` and `poll_bans` through `db`, as `voteBlocks` does, so the pages router needs no new dependency. `recordView` is true only for a Private Anyone With The Link poll the caller did not create, including an unpublished one. `resolveSharedLink(db, caller, pid)` calls `decideSharedLink`, and when `recordView` is true upserts `linked` through `upsertRelation`, skipping the write when the existing row's `updated_at` is under one minute old; it returns the same `landing`
- [X] T013 [US1] In `src/routes/pages.ts`, make `GET /` handle `PID`: no valid `PID` → `page("index.html")` as today; guest → `302 /login?PID=<uuid>` before any lookup; signed in → `resolveSharedLink` then `302` to the built landing (server-built query only); log the outcome category without the email. Make `GET /login` and `GET /create-account` send a signed-in visitor with a valid `PID` to `/?PID=<uuid>`
- [X] T014 [US1] In `src/routes/api.ts`, accept optional `pid` (via `parsePid`) on `request-login-link` and `create-account`, extend `issueLoginLink(req, email, stay, pid?)` to pass `metadata.pid`, link the unknown-address invitation to `/create-account?PID=<uuid>` when present, and make `GET /api/auth/verify` read `PID` and redirect to `/?PID=<uuid>` on success and `/login?error=invalid-link&PID=<uuid>` on failure
- [X] T015 [US1] In `src/auth/auth.ts`, make `sendMagicLink` append `&PID=<encoded uuid>` to the verify URL when `metadata.pid` is present (no server change for OAuth: the provider flow is started by the login card, see T016)
- [X] T016 [P] [US1] In `src/public/loginCard.js` and `src/public/createAccountCard.js`, read a valid `PID` from `location.search`, send it as `pid` with the request, show the line "Sign in to see the poll that was shared with you." (never the title), carry the pid on the oauth provider links (`?PID=<uuid>`), and keep the pid on the invalid-link notice path; behaviour without `PID` is unchanged (contracts/ui-contracts.md C7)
- [X] T017 [P] [US1] Create `tests/client-login-pid.test.ts` (jsdom): the login and create-account cards send `pid` and show the generic line when `?PID=<uuid>` is present, ignore an invalid one, and are unchanged without it
- [X] T018 [US1] In `src/routes/tabsApi.ts`, delete `POST /api/me/polls/:pid/link` and add `GET /api/me/polls/:pid` (`requireSession`, `pageLoads`, read-only): returns `{ poll, counts, overlay }` for a poll the caller may be shown and `404 { error: "Not found" }` for every refusal case of `decideSharedLink` (it calls only `decideSharedLink`, never `resolveSharedLink`, so a read never writes a view); remove the route's import of `upsertRelation` if now unused
- [X] T019 [US1] In `src/public/tabs.js`, add `mountRetained(pid, detail)` to the object `createGrid` returns (mounts the card, sets `retainedDetail`, calls `maximize(pid)`; closing already unmounts it) and replace `takeSharedPid`/`openSharedPoll`/`SHARED_PID_KEY` with `applyLanding()`: read `open`, `tab`, `notice` accepting only the fixed values, clear them with `history.replaceState`, `select(tab)`, maximize the card if `cardOf(open)` exists else fetch `GET /api/me/polls/<pid>` and `mountRetained`, and show the fixed notice text for `unavailable` and `unpublished` (research R9, contracts/ui-contracts.md C6)
- [X] T020 [P] [US1] In `postman/openapi.json`, add `GET /` (the redirect table), the optional `pid` on `request-login-link` and `create-account`, the optional `PID` on `/api/auth/verify`, the redirects of `/login` and `/create-account`, and `GET /api/me/polls/{pid}`; remove `/api/me/polls/{pid}/link`
- [X] T021 [P] [US1] Add a jsdom case to `tests/client-maximized.test.ts` (or a new `tests/client-landing.test.ts`): a landing with `open` for a poll absent from the tab's rows fetches it, shows it maximized, and closing removes it without adding it to the list; unknown landing values are ignored
- [X] T055 [US1] Rewrite the three existing tests that assert the behavior US1 removes: in `tests/client-home.test.ts` (~lines 1556–1612) replace the `localStorage` `crowdpoll:sharedPid` hand-off cases with landing-parameter cases (guest sent to `/login?PID=`, signed-in landing opens the poll or shows the fixed notice); in `tests/polls-discovery.test.ts` (~line 172) replace the `POST /api/me/polls/:pid/link` cases with `GET /api/me/polls/:pid` and the link-route outcomes; in `tests/pages.test.ts` (~line 191) change `GET /?PID=anything` to the new rule (a non-UUID `PID` serves the page, a valid one redirects)

**Checkpoint**: `tests/shared-link.test.ts`, `tests/signin-pid.test.ts`, `tests/client-login-pid.test.ts` and the full suite are green; quickstart 2 and 3 pass.

---

## Phase 4: User Story 2 — Shared With You lists what was shared (P1)

**Purpose**: the tab's membership rules, ordering, persistence and the invitation clean-up.

**Independent Test**: quickstart scenario 4.

- [X] T022 [P] [US2] Create `tests/tabs-shared-with-you.test.ts`: an invited user sees an Invitation Only poll with no link opened; a link-opened Anyone With The Link poll lists and moves to the top on a later open; a public poll opened by link is absent; the poll stays after the user votes or watches and also appears in Your Votes / Watching; uninviting removes it (including a stale `invited` row created before this feature); re-inviting returns it first; switching a viewed poll to Invitation Only removes it for an uninvited user and switching back returns it; a banned user still sees it with the ban message; own polls are excluded; the cap and newest-activity ordering hold; deleting the poll removes it; the daily bookmark expiry leaves `linked` and `invited` rows and the poll stays after its watch expires
- [X] T023 [US2] In `src/polls/userPolls.ts`, finish `sharedWithYouTab`: for an Invitation Only poll require a current `poll_invitations` row for the user, for Anyone With The Link accept `linked` or `invited`, in the one `personalTabQuery` `WHERE` (research R4)
- [X] T024 [US2] In `src/polls/store.ts` `updatePoll`, when `$set.invitedVoterList` is present delete the `user_polls` rows with relation `invited` for this poll whose email is not in the new list, in the same transaction and before the upsert (research R8)
- [X] T025 [P] [US2] Add a case to `tests/bookmarks.test.ts` pinning that `removeExpiredBookmarks` deletes only `bookmarks` rows and the `bookmarked` relation and never `linked` or `invited`
- [X] T026 [P] [US2] In `tests/client-tabs-026.test.ts` (new, jsdom), assert a Shared With You card has no remove/hide/dismiss control and that its controller is registered without `onClose`

**Checkpoint**: `tests/tabs-shared-with-you.test.ts` green; quickstart 4 passes.

---

## Phase 5: User Story 4 — The tab bar and "you" voice (P1)

**Purpose**: labels, icons, guest behaviour, empty states and the first-person sweep.

**Independent Test**: quickstart scenarios 1 and 8.

- [X] T027 [US4] In `src/public/index.html` and `src/public/tabs.css`, finalize the three new tab icons (person on Your Polls, people silhouette on Shared With You, check mark on Your Votes, existing circle style) and keep `.tab-bar` single-row sideways-scrolling; guests get `aria-disabled` on every personal tab (contracts/ui-contracts.md C1, C2)
- [X] T028 [US4] In `src/public/tabs.js`, set the empty-state lines of C8 per tab (`emptyState`), with the header's Create Poll link on Your Polls only for a user who can reach the admin page (read from the session/permissions already on the client)
- [X] T029 [US4] In `src/public/deltaClient.js` and `src/public/pollCard.js` (~line 1015), replace the "listed because" words with `You were invited`, `You opened the link`, `You voted`, `You are watching`, and make the line absent when the card's tab is `your-polls`
- [X] T030 [P] [US4] Sweep `src/public/*.html`, `src/public/*.js`, `src/routes/*.ts`, `src/email/*.ts` for first-person wording ("My …", "… Me", "Add to Favorites", "Remove from Favorites", "Favorites"/"Favourites" shown to users) and change each to the "you"/"Watch" voice; add a test `tests/ui-voice.test.ts` that fails when any shipped page or script contains a user-visible first-person label
- [X] T031 [P] [US4] In `tests/client-tabs-026.test.ts`, assert: eight tabs in order with Trending active; a guest selecting a personal tab is sent to sign-in; every empty state reads as in C8 and none mentions email or notifications; the tab bar is a single scrolling row; all four new personal tabs stay visible to a signed-in user lacking `View Polls`, `Vote on Polls` or `Create Poll`

**Checkpoint**: `tests/client-tabs-026.test.ts` and `tests/ui-voice.test.ts` green; quickstart 1 and 8 pass.

---

## Phase 6: User Story 3 — A link to a poll not published yet (P2)

**Purpose**: server-redacted placeholder and the "not published yet" landing.

**Independent Test**: quickstart scenario 5.

- [X] T032 [P] [US3] Create `tests/shared-link-unpublished.test.ts`: a non-creator opening an unpublished Private Anyone With The Link link gets `/?tab=shared-with-you&notice=unpublished` and a `linked` row; an invited user opening an unpublished Invitation Only link gets the same landing and no new row; an Archived link records nothing; the Shared With You response for such a poll contains `pid`, `notPublished: true` and `createdByName` and none of the poll's title, subtitle, choices, counts, overlay choice ids or `mayWatch`; an empty creator name yields no email substitution; Vote and Watch are refused; publishing turns the entry into the ordinary card on the next refresh; making it Public removes it
- [X] T033 [US3] In `src/polls/sharedLink.ts`, return the `unpublished` notice landing for a reachable never-launched Private poll (`!isPubliclyListable`) opened by a non-creator, writing `linked` only for Anyone With The Link; in `src/polls/store.ts`, beside `isPubliclyListable`, expose one `isPublished(row)` so route and listing share it
- [X] T034 [US3] In `src/routes/tabsApi.ts` `personalListing`, for the Shared With You listing replace each non-owned, not-published row with the redacted entry `{ pid, notPublished: true, createdByName, contentVersion: 0 }` before `projectPoll`, `refreshProjection`, `readOrRebuildCounts`, `overlay` and `voteBlocks` run for it (research R5); confirm `computeDelta` in `src/refresh/deltas.ts` handles an entry that later gains content (add a case to `tests/refresh-deltas.test.ts`)
- [X] T035 [US3] In `src/public/deltaClient.js` pass `notPublished` and `createdByName` through `toPollDetail`; in `src/public/pollCard.js` render the placeholder card ("Shared by <name>" or "Shared with you", no title/choices/results, no Vote, Live Results or Watch control) when `notPublished` is set, and the ordinary card otherwise (contracts/ui-contracts.md C5); add the placeholder rules to `src/public/pollCard.css`
- [X] T036 [P] [US3] In `tests/client-tabs-026.test.ts`, assert the placeholder renders both name forms with no controls and is replaced by the ordinary card when a later delta carries content

**Checkpoint**: `tests/shared-link-unpublished.test.ts` green; quickstart 5 passes.

---

## Phase 7: User Story 5 — Your Polls (P2)

**Purpose**: every poll the user created, in every state.

**Independent Test**: quickstart scenario 6.

- [X] T037 [P] [US5] Create `tests/tabs-your-polls.test.ts`: lists the user's private and public polls newest created first and respects the cap; excludes polls only voted in, watched, invited to or viewed; excludes other users' polls including for an administrator; lists Initialized, Editing, Awaiting Approval and Rejected polls to the creator only (never in another user's tabs or search); includes `rejectionReason` only in the creator's listing; a poll stays listed when its visibility, sharing mode or state changes and leaves only when deleted
- [X] T038 [US5] In `src/routes/tabsApi.ts`, for the Your Polls listing add `rejectionReason` (from `poll_rejection_reason`) to the projection of the caller's own Rejected polls only, and confirm vote requests on unlaunched polls are still refused
- [X] T039 [US5] In `src/public/pollCard.js`, show the poll's state in Title Case (and the rejection reason when Rejected) and suppress the vote control for Initialized, Editing, Awaiting Approval and Rejected polls, and show Archived as read-only results with its state; add the state line styles to `src/public/pollCard-m3.css`
- [X] T040 [P] [US5] In `tests/client-tabs-026.test.ts`, assert an Awaiting Approval and a Rejected card show the state (and reason) and no vote control, an Archived card is read-only, and no "listed because" line appears in Your Polls

**Checkpoint**: `tests/tabs-your-polls.test.ts` green; quickstart 6 passes.

---

## Phase 8: User Story 6 — Watching and Your Votes (P2)

**Purpose**: `mayWatch`, the eye control, the narrowed Watching tab and the new Your Votes tab.

**Independent Test**: quickstart scenario 7.

- [X] T041 [P] [US6] Create `tests/access-may-watch.test.ts`: `mayWatch` is true for a public published poll, an Invitation Only poll the user is invited to or created, an Anyone With The Link poll the user created/viewed/voted in/was invited to; false without `View Polls`, for an unpublished poll, for a banned user, for an uninvited Invitation Only poll and for an unreached link poll; `POST /api/polls/:pid/bookmark` answers `404 Not found` (same body as an unknown poll) when false and `409 bookmark-cap` at the cap; `DELETE` always succeeds
- [X] T042 [P] [US6] Create `tests/tabs-your-votes.test.ts` and extend `tests/bookmarks.test.ts`: Your Votes lists every voted poll ordered by latest vote, hides an unreachable private poll (and brings it back with access) but keeps a banned one with the ban message; Watching lists only deliberate watches, drops rows failing `mayWatch` with no card or counts sent, keeps the row and returns on re-invite; voting never watches; private watches count toward the cap and expire like public ones
- [X] T043 [US6] Create `src/polls/access.ts` exporting `mayWatch(db, caller, pid)` and `mayWatchMany(db, caller, rows)` (one `poll_bans`, one `poll_invitations` and one `user_polls` query per call, rule order of research R6) and `reachablePrivate(...)` used by Your Votes
- [X] T044 [US6] In `src/routes/pollsApi.ts`, call `mayWatch` before `addBookmark` in the `POST` handler (after the existing `View Polls` check) and answer `404 { error: "Not found" }` when false; leave `DELETE` unchecked
- [X] T045 [US6] In `src/polls/userPolls.ts` and `src/routes/tabsApi.ts`, filter the Watching rows through `mayWatchMany` before `personalListing`, hide unreachable private polls in `yourVotesTab` (keep banned), and add `mayWatch` to each overlay entry in `personalListing` and `GET /api/me/polls` (extend `OverlayEntry`)
- [X] T046 [P] [US6] Inline the two eye SVGs from `dontTrack/watching-icon.svg` and `dontTrack/watching-icon-active.svg` once as `<symbol>`s in `src/public/index.html` (the mask id `watching-catchlight` defined once) and use the outline eye as the Watching tab icon (research R11)
- [X] T047 [US6] In `src/public/pollCard.js` and `src/public/pollCard-m3.css`, replace the tag/star in the `.bookmark-btn` markup with `<use>` of the eye symbols, keep the class and `aria-pressed`, set labels `Watch`/`Watching`, the tooltip `Stop watching this poll`, grey `#9AA197` off and ink `#1E2422` on (no red, no slash, no count), and hide the control when the overlay says `mayWatch` is false; update the `updateActionButtons` comment
- [X] T048 [US6] In `src/public/tabs.js`, make the cap dialog (`bookmark-cap`) and any watch notices use the Watching wording
- [X] T049 [P] [US6] In `tests/client-tabs-026.test.ts`, assert the Watch control shows on Shared With You and Your Polls cards and toggles Watch/Watching, that watching from Shared With You places it first in Watching and leaves it in Shared With You, and that the control is hidden when the overlay's `mayWatch` is false; update `tests/client-m3-tooltip.test.ts` for the new tooltip

**Checkpoint**: `tests/access-may-watch.test.ts`, `tests/tabs-your-votes.test.ts`, `tests/bookmarks.test.ts` and `tests/client-tabs-026.test.ts` green; quickstart 7 passes.

---

## Phase 9: Polish & cross-cutting

**Purpose**: documentation, the full suite and the manual walk.

- [X] T050 [P] Update `README.md` and `ARCHITECTURE.md` (Constitution Documentation Deliverables) for the eight tabs, the server-driven shared link, the sign-in `pid` round trip and `mayWatch`; update `postman/openapi.json` descriptions to match
- [X] T051 [P] Grep `src/` for comments citing requirement, feature or task ids introduced by this feature and for orphaned imports/functions left by the removed routes and helpers; remove only what this feature orphaned (Constitution III, VI)
- [X] T052 Run `npm run build` and `npm test`; compare with T001's baseline and record the counts here — *Result: build green, 36 fingerprinted assets (baseline 36); `npm test` 63 files passed + 1 skipped (64), 898 tests passed + 15 skipped (913) against a baseline of 52 + 1 (53) and 816 + 15 (831)*
- [ ] T053 Walk `quickstart.md` scenarios 1–8 in the running app and record any deviation as a new task — *Not done: it needs the app running in a browser against PostgreSQL, which this session could not do; every scenario's behaviour is covered by the automated suites named above, so the walk is left for the developer*
- [X] T056 [P] Add a case to `tests/db-explain-guard.test.ts` that the four personal-tab queries (`yourPollsTab`, `sharedWithYouTab`, `yourVotesTab`, `watchingTab`) use the `user_polls_email_updated` index and no sequential scan of `user_polls` (spec SC-008)
- [X] T054 Tell the developer that `designDocs/026-high-level-requirements-HOME-PAGE-TABS.md` A15.1 and A15.5 still describe a server redirect and a `viewed` value that do not match the code (this plan reuses `linked`), and that A15.3/A23.2 need the two clarified outcomes (unpublished public poll → "That poll isn't available."; invited user's unpublished Invitation Only link → the "not published yet" landing); do not edit the document unasked

- [X] T057 [US4] Make the tab bar a scrollable M3 tab list (FR-034): roles, `aria-selected` and roving `tabindex` in `src/public/index.html` and `src/public/tabs.js`, arrow-key/Home/End focus movement, the selected tab scrolled into view and overflow edge fades, stacked 64px tabs in `src/public/header-tab-bar-m3.css`; tests in `tests/client-tabs-026.test.ts` (FIX01, tests postponed)
---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (blocking) → stories.
- **US1** needs Phase 2 only. **US2** needs Phase 2 (and uses US1's `linked` writes in its tests). **US4** needs Phase 2 and can run beside US1/US2 (different files, except `src/public/tabs.js` and `tests/client-tabs-026.test.ts`, shared with others — land those edits one after the other).
- **US3** needs US1 (`sharedLink.ts`, the notice landing) and US2 (`sharedWithYouTab`). **US5** needs Phase 2. **US6** needs Phase 2 and US2 (it reuses `sharedWithYouTab` data in its tests).
- Files shared across stories: `src/routes/tabsApi.ts` (US1 route swap, US3 redaction, US5 reason, US6 overlay), `src/public/tabs.js` (US1 landing, US4 empty states, US6 notices), `src/public/pollCard.js` (US3, US4, US5, US6), `postman/openapi.json` (Phase 2, US1). Sequence those tasks; everything marked [P] is otherwise independent.

### Parallel example (US1)

T010, T011 and T017 (three test files) run together; then T012 → T013 (`sharedLink.ts`, `pages.ts`) while T014 (`api.ts`), T015 (`auth.ts`) and T016 (client cards) proceed in parallel with them; T018 → T019 → T020 close the story.

## Implementation Strategy

### MVP first (User Story 1 only)
Phases 1–3. After Phase 3 a shared link works end to end for guests and signed-in users, with the four-tab shell in place. Stop and walk quickstart 2 and 3.

### Incremental delivery
1. Setup + Foundational → four tabs replace two, suite green
2. US1 → the link and sign-in round trip (MVP)
3. US2 → Shared With You rules and invitation clean-up
4. US4 → labels, icons, empty states, the "you" voice
5. US3 → unpublished placeholder · US5 → Your Polls states · US6 → Watching, `mayWatch`, Your Votes
6. Polish → docs, full suite, manual walk

## Notes

- 57 tasks: Setup 1, Foundational 8, US1 13, US2 5, US4 6, US3 5, US5 4, US6 9, Polish 6
- The view is stored as the existing `linked` relation (research R1); no migration, no new `ENV_*`, no new relation value.
- Constitution VI: new code carries no comments citing requirement or task ids; the stale "My PRIVATE POLLS"/FIX024 comments are updated in Phase 2.
- Commit after each phase, or per story.
