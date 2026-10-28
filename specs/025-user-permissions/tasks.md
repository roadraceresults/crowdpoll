---
description: "Task list for 025-user-permissions"
---

# Tasks: User Permissions

**Input**: Design documents from `specs/025-user-permissions/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/admin-api.md,
contracts/ui-contracts.md, quickstart.md

**Tests**: Included, and not optional. Constitution Principle IV requires a verifiable criterion
per task, and SC-001–SC-007 are exercised by the automated suites named below; the painted/browser
result is `quickstart.md` Q1–Q11.

**Organization**: by user story. US1 (P1, create/manage own polls) is the large one — it owns the
schema/session/predicate work every other story also depends on being *present*, but Foundational
only holds what is shared by all three (the stored column, the session merge, and the one
`hasPermission` primitive). US2 (P2, voting) and US3 (P3, viewing) each touch different files and
can proceed in parallel once Foundational and US1's predicates exist — see Dependencies.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel: different files, no dependency on an incomplete task
- **[Story]**: US1, US2 or US3, mapping to `spec.md`'s three user stories
- Paths are repository-relative

---

## Phase 1: Setup

**Purpose**: a known-green baseline. The feature adds no new dependency or configuration.

- [X] T001 Run `npm test` and `npm run build` on the untouched tree and record both results in this task's line (test file/test counts; fingerprinted asset count). Every later checkpoint compares against it — *Baseline 2026-10-04 (clean worktree at HEAD): 51 files passed, 1 skipped / 778 tests passed, 15 skipped; build clean, 36 fingerprinted assets.*

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the stored column, the session-cache merge, and the one shared predicate every story
calls — nothing user-story-specific yet.

**⚠️ CRITICAL**: no user story task may begin until this phase's checkpoint passes.

- [X] T002 Create `src/db/migrations/006-user-permissions.ts` adding `permissions text[] NOT NULL DEFAULT ARRAY['View Polls','Vote on Polls','Create Poll']` to `user`, plus `CHECK (permissions <@ ARRAY['View Polls','Vote on Polls','Create Poll']::text[])` (data-model.md; research R2); register it in `src/db/migrations/index.ts` as `"006-user-permissions"` alongside `001`–`005`
- [X] T003 [P] In `src/db/schema.ts`, add `permissions: string[];` to `UserTable` (data-model.md)
- [X] T004 [P] In `src/polls/service.ts`, add `type Permission = "View Polls" | "Vote on Polls" | "Create Poll";` and `export function hasPermission(permissions: readonly string[] | undefined, grant: Permission): boolean` (a plain `includes` check; `undefined`/missing array → `false`) (research R1, R5, R6)
- [X] T005 In `src/auth/sessionCache.ts`, inside `lookup()`, after `auth.api.getSession(...)` resolves to a non-null session, run one `SELECT permissions FROM "user" WHERE id = $1` via the existing `db` and merge the result onto `session.user.permissions` before the function returns (and therefore before `getSession` caches it) — a cache hit never re-runs this query (research R1). Depends on T002, T003
- [X] T006 [P] In `tests/session-cache.test.ts`, add a case: forge a fresh session, confirm the first `GET /api/me`-driven lookup's cached session value carries `permissions: ["View Polls","Vote on Polls","Create Poll"]` (the column default), and that a second request (cache hit) issues no additional query matching `from "user"` (reuse the file's existing `countSessionQueries`-style query-counting helper, generalized to match `"user"` as well as `"session"`, or add a sibling counter). Depends on T005

**Checkpoint**: T006 passes; every pre-existing test still passes (nothing yet reads `hasPermission` or the new column outside the cache).

---

## Phase 3: User Story 1 - A trusted user creates and manages their own polls (Priority: P1) 🎯 MVP

**Goal**: a non-admin holding `Create Poll` + `View Polls` reaches a scoped `/admin`, creates and
fully manages only the polls they created; everyone else is refused exactly as today, except a
poll that isn't the caller's own now answers `404` rather than ever being named (FR-003–FR-009).

**Independent Test**: grant a non-admin user the default permissions, have them create a poll
through to publication entirely from `/admin` with no admin account involved, then confirm they
cannot see or act on a different user's poll (quickstart Q1–Q6).

### Tests for User Story 1

Write these first; they fail against today's single-admin-gate code.

- [X] T007 [US1] In `tests/polls-admin-crud.test.ts`, replace `"401/403s a guest/non-admin on every admin route"` (currently asserting only `[401,403]` for both a guest and a freshly forged non-admin) with four cases against `GET /api/admin/polls`: (a) guest → 401/403 unchanged; (b) a forged user whose `permissions` is updated (via `ctx.db.updateTable("user").set(...)`) to `[]` → 403; (c) a forged user set to `["Create Poll"]` only (no `View Polls`) → 403; (d) a forged user left at the column default (`Create Poll` **and** `View Polls`) → `200`, and its body contains no poll the caller didn't create (contracts/admin-api.md A3)
- [X] T008 [US1] In `tests/polls-admin-crud.test.ts`, add a case: a non-admin creator (default permissions) can `POST /api/admin/polls`, then `PATCH`, publish, open/close/archive, duplicate, delete, and read `.../results` and `.../export.json`/`.../export.md` for the poll they just created — every action succeeds under the same state rules admins already get (`capabilitiesFor` unchanged) (contracts/admin-api.md A2, A4; FR-006)
- [X] T009 [US1] In `tests/polls-admin-crud.test.ts`, add a case: that same non-admin creator, pointed at a **second** forged user's poll, gets `404` from every `:pid` route (edit-session, heartbeat, publish, save, `PATCH`, `DELETE`, duplicate, results, both exports) — and gets `403` (not `404`) from `GET /api/admin/polls/search` and `POST /api/admin/polls/:pid/rescreen` even when the `:pid` is their own (contracts/admin-api.md A4; FR-007, FR-008, SC-002)
- [X] T010 [US1] In `tests/pages.test.ts`, rewrite the `"Admin pages ignore the isAdmin hint (012 FR-053)"` and `"Unauthorized access to an admin page (013 FR-042/FR-044)"` blocks (around lines 45–103): `GET /admin` now returns `200` for a default-permissions non-admin instead of refusing it; add the no-`Create Poll` and `Create Poll`-without-`View Polls` 403 cases; `/admin/poll/results?pid=<another user's poll>` returns `404` for a non-admin creator rather than the not-authorized card (contracts/admin-api.md A3)
- [X] T011 [P] [US1] In `tests/client-home.test.ts`, add a case: the header's `.header-nav-link` is inert (`is-inert`, `aria-disabled`, no `href`) for a guest and for a signed-in user whose `GET /api/me` reports `permissions` lacking either grant, and is live (`href="/admin"`, no `is-inert`/`aria-disabled`) for `isAdmin: true` and for a user holding both `Create Poll` and `View Polls` (contracts/ui-contracts.md C1)
- [X] T012 [P] [US1] In `tests/openapi-contract.test.ts`, assert `GET /api/me`'s documented response schema in `postman/openapi.json` includes `permissions` as a `string` array property alongside `isAdmin` (contracts/admin-api.md A5)
- [X] T040 [US1] In `tests/polls-admin-crud.test.ts`, add a case: a non-admin creator with more than `ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS` polls gets `truncated: true` and only their own rows from `GET /api/admin/polls` (SC-006)
- [X] T041 [P] [US1] Create `tests/client-admin-creator.test.ts` using the same jsdom harness as `tests/client-admin-wizard.test.ts`. With `GET /api/me` reporting `isAdmin: false` and a truncated list, assert that the page shows "Only your newest N polls are shown." with no "Use Search" (the admin text today, at `src/public/adminList.js:265`, is "Only the newest N polls are shown. Use Search to find others."), and that `#adminTabBar` and `#adminSearchForm` are absent from the DOM (SC-006; contracts/ui-contracts.md C3)
- [X] T042 [US1] In `src/public/app.js`'s `renderSiteHeader`, show the avatar menu's "Poll Administration" entry under `canCreatePolls(me)` instead of `me.isAdmin`, in the same place between Edit Profile and Logout; update `tests/pages.test.ts`'s source check and add a `tests/client-home.test.ts` case for a creator's menu and for a user missing a creator grant (FR-003; contracts/ui-contracts.md C2; fix.md FIX01)

### Implementation for User Story 1

- [X] T013 [US1] In `src/polls/service.ts`, add `canReachAdmin(user, config)` = `isAdminEmail(...) || (hasPermission(user.permissions, "Create Poll") && hasPermission(user.permissions, "View Polls"))` and `canActOnPoll(user, poll, config)` = `isAdminEmail(...) || (canReachAdmin(user, config) && poll.created_by_id === user.id)`, beside the existing `isAdminEmail`/`createRequireAdmin` (research R3). Depends on T004
- [X] T014 [US1] In `src/routes/pollsApi.ts`, swap the `requireAdmin` middleware for a `canReachAdmin`-backed one on `POST /api/admin/polls`, and for a `canActOnPoll`-backed one (refusing with `404 { error: "Not found" }`, never `403`) on every `:pid` route (edit-session, heartbeat, `publish`, `save`, `PATCH`, `DELETE`, `duplicate`, `.../results`, both export routes); leave `GET /api/admin/polls/search` and `POST /api/admin/polls/:pid/rescreen` on the unmodified admin-only gate (contracts/admin-api.md A2, A4). Depends on T013
- [X] T015 [US1] In `src/routes/pollsApi.ts`, give the query behind `listAdminRows` an optional creator-id filter, and pass the caller's `id` on `GET /api/admin/polls` whenever `isAdminEmail` is false; `adminListRow`'s shaping is unchanged (contracts/admin-api.md A1; research R4). Depends on T014
- [X] T016 [US1] In `src/routes/pages.ts`, swap `GET /admin`'s gate to `canReachAdmin` and `/admin/poll/results`'s gate to `canActOnPoll` (404, not the not-authorized card, for a poll that isn't the caller's own) (contracts/admin-api.md A3). Depends on T013
- [X] T017 [US1] In `src/routes/api.ts`, add `permissions` to `GET /api/me`'s response: the caller's `session.user.permissions`, with `"Administrator"` prepended when `isAdminEmail` is true (contracts/admin-api.md A5). Depends on T005
- [X] T018 [US1] In `src/public/app.js`'s `renderSiteHeader`, make the header's `.header-nav-link` live (remove `is-inert`/`aria-disabled`/`tabindex`, set `href="/admin"`) when `me.isAdmin || (me.permissions.includes("Create Poll") && me.permissions.includes("View Polls"))`; otherwise leave it exactly as it is today. Leave the avatar menu's existing `isAdmin`-gated "Poll Administration" link untouched (contracts/ui-contracts.md C1, C2). Depends on T017
- [X] T019 [US1] In `src/public/adminList.js`'s init path, branch on `me.isAdmin`: when false, do not insert `#adminTabBar` or `#adminSearchForm` into the DOM at all, request `GET /api/admin/polls` with no tab/search parameters, and render the empty-list message "You haven't created any polls yet." and the at-cap message "Only your newest N polls are shown." (no "Use Search" hint) in place of the admin equivalents; `admin.html`'s markup file itself is unchanged (contracts/ui-contracts.md C3). Depends on T015, T017
- [X] T020 [US1] Update `postman/openapi.json`: add `permissions` to `GET /api/me`'s response schema; note the widened gate on `POST /api/admin/polls` and every `:pid` route's new `404` case in their descriptions (contracts/admin-api.md A2–A5). Depends on T017
- [X] T021 [US1] Run `npx vitest run tests/polls-admin-crud.test.ts tests/pages.test.ts tests/client-home.test.ts tests/openapi-contract.test.ts tests/client-admin-creator.test.ts`: T007–T012, T040 and T041 pass, and every pre-existing case in those files still passes

**Checkpoint**: US1 complete — a non-admin creator can fully author and manage their own polls; every cross-user and no-grant case is refused correctly.

---

## Phase 4: User Story 2 - Voting can be restricted to users who are allowed to vote (Priority: P2)

**Goal**: a signed-in user denied `Vote on Polls` is refused with a clear reason on every vote
attempt; a guest is never affected (FR-010, FR-011).

**Independent Test**: deny a signed-in test user `Vote on Polls`, confirm their vote attempt is
refused with a message; confirm a guest still votes on a public poll (quickstart Q7–Q8).

### Tests for User Story 2

- [X] T022 [US2] In `tests/polls-vote.test.ts`, add a case: a forged user whose `permissions` excludes `Vote on Polls` gets `403 { error: "You do not have permission to vote.", code: "no-vote-permission" }` from `POST /api/polls/:pid/vote` on a poll they'd otherwise be eligible to vote in (contracts/admin-api.md A6; FR-010)
- [X] T023 [P] [US2] In `tests/polls-vote.test.ts`, add a case confirming an unauthenticated (guest) vote on a public poll still succeeds exactly as the file's existing `"401s a guest vote attempt"` case already implies for a guest *without* a session — i.e., explicitly assert the new permission branch never fires for a request with no session (FR-011, SC-004)

### Implementation for User Story 2

- [X] T024 [US2] *Done differently — 2026-10-04: `viewerVoteBlock` and `validateVoteSubmission` have no callers in `src/`; the vote route validates through `src/votes/votePath.ts` instead. The grant is checked in the vote route itself (`src/routes/pollsApi.ts`, after the signed-in check and before `castVote`), using `holdsPermission` (administrators hold every grant). A guest never reaches it: the route already answers `401 Sign in to vote`, so guests cannot vote today and this feature leaves that unchanged. `viewerVoteBlock` was left untouched. On every tab, not just the personal ones, the card withdraws the vote controls from `GET /api/me`'s `permissions` (`src/public/pollCard.js`, `viewerMayNotVote`).* Original task: In `src/polls/service.ts`'s `viewerVoteBlock`, add a first-checked branch: when `callerEmail` is non-empty and the caller's `permissions` (threaded in as a new parameter) lack `Vote on Polls`, return `{ status: 403, message: "You do not have permission to vote.", code: "no-vote-permission" }`; thread the new parameter through `validateVoteSubmission`'s existing call site and its own caller in the vote route (research R5). Depends on T004, T005
- [X] T038 [US2] `viewerVoteBlock` is not the only place a vote-block reason reaches the client: `src/routes/tabsApi.ts`'s `voteBlocks()` (used by `personalListing()`, which feeds `POST /api/tabs/private/refresh` and `POST /api/tabs/favourites/refresh`) is a separate, hand-duplicated implementation that the poll card actually reads (`voteBlockedReason` in the overlay) to decide whether to show "no working vote controls." Add the same `Vote on Polls` branch there — when the caller's `permissions` lack it, `blocks.set(row.id, "You do not have permission to vote.")` before the existing banned/not-invited checks — so the card's up-front banner and the vote route's `403` agree (analysis finding F1). Depends on T004, T024
- [X] T039 [US2] In `tests/polls-vote.test.ts`, assert that `POST /api/tabs/favourites/refresh`'s response overlay, for a public poll the vote-denied user bookmarked, carries `voteBlockedReason: "You do not have permission to vote."` for a poll a `Vote on Polls`-denied user would otherwise see — not just the vote route's own `403` (analysis finding F1; US2 Acceptance Scenario 1)
- [X] T025 [US2] Run `npx vitest run tests/polls-vote.test.ts`: T022–T023 and T039 pass, and every pre-existing case still passes

**Checkpoint**: US1 and US2 both independently functional.

---

## Phase 5: User Story 3 - Viewing private polls and personal activity can be restricted (Priority: P3)

**Goal**: a signed-in user denied `View Polls` is refused a private poll's link the same way an
ineligible visitor already is, sees an empty "My Private Polls" tab (Favorites, which lists only
public polls, is unaffected — FR-014), and is refused — not silently ignored — when trying to
bookmark a poll or subscribe to its Live Results (FR-012, FR-013, FR-019 — the Clarification
session). Private polls already in Live Results stay there until the user removes them
(spec.md Assumptions).

**Independent Test**: deny a signed-in test user `View Polls`; confirm a private poll's link is
refused, their "My Private Polls" tab is empty while Favorites still shows their bookmarked public
polls, and a bookmark/subscribe attempt is refused rather than silently no-opping (quickstart
Q9–Q10).

### Tests for User Story 3

- [X] T026 [US3] In `tests/bookmarks.test.ts`, add a case: a forged user whose `permissions` excludes `View Polls` gets `403 { error: "You do not have permission to view polls.", code: "no-view-permission" }` from `POST /api/polls/:pid/bookmark`, while `DELETE` (removing an existing bookmark) still succeeds; a guest (no session) still gets the existing `401`, unaffected (contracts/admin-api.md A7; FR-019)
- [X] T027 [P] [US3] In `tests/live-results.test.ts`, add the same case for `POST /api/live/:pid`, and assert `DELETE /api/live/:pid` still removes the poll (contracts/admin-api.md A7; FR-019)
- [X] T028 [P] [US3] In `tests/polls-discovery.test.ts`'s `"Invited private polls on the personal tabs"` block, add two cases: (1) an invited user whose `permissions` excludes `View Polls` gets an empty `rows`/overlay from `POST /api/tabs/private/refresh` (the "My Private Polls" tab, backed by `privateTab()` in `src/polls/userPolls.ts`) despite the existing invitation, refused the same way the block's existing `"never lists an ... poll the caller has no relation to"` case already is — not a new response shape (FR-012, FR-013; `favouritesTab()` is public-poll-only and governed by FR-014, so it is not gated); (2) that same denied user still gets a normal, unaffected result from `POST /api/tabs/favourites/refresh` for a public poll they've bookmarked (FR-014; analysis finding E1) — reversed by T048: Favorites is now empty for them too

### Implementation for User Story 3

- [X] T029 [US3] In `src/routes/tabsApi.ts`'s handler for `POST /api/tabs/private/refresh`, check `hasPermission(caller.permissions, "View Polls")` before calling `privateTab()`; when it's false, skip the query and use `{ rows: [], membershipVersion: null, relations: new Map() }` instead — the same empty shape `personalTab()` already returns for "no members" (`src/polls/userPolls.ts:55`), so `personalListing()` needs no other change. `POST /api/tabs/favourites/refresh` (`favouritesTab()`) is untouched — it is public-poll-only and stays governed by FR-014 (analysis finding E1). Live Results is deliberately left unfiltered (spec.md Assumptions); this task covers only the "My Private Polls" tab. Depends on T004, T005
- [X] T030 [US3] In `src/routes/pollsApi.ts`'s `POST /api/polls/:pid/bookmark` handler only, insert `hasPermission(caller.permissions, "View Polls")` immediately after the existing signed-in check, refusing `403 no-view-permission`; `DELETE` stays unguarded so a user can always remove a bookmark (research R6). Depends on T004, T005
- [X] T031 [US3] In `src/routes/tabsApi.ts`'s `POST /api/live/:pid` only, insert the same guard immediately after `requireSession`; `DELETE` stays unguarded (research R6). Depends on T004, T005; lands after T029 (same file)
- [X] T032 [US3] Run `npx vitest run tests/bookmarks.test.ts tests/live-results.test.ts tests/polls-discovery.test.ts`: T026–T028 pass, and every pre-existing case still passes
- [X] T045 [US3] `src/routes/pages.ts`: `GET /?PID=` serves the home page instead of redirecting to `/`. `src/routes/tabsApi.ts`: new `POST /api/me/polls/:pid/link` (A8) — page-load limited; `View Polls` required; `isPubliclyListable` decides not-yet-shown polls (404); `checkViewEligibility` decides invitation-only access; a link-only poll not the caller's own stores a `linked` relation. `UserPollRelation` (`src/db/schema.ts`, `src/polls/store.ts`) gains `"linked"` and `privateTab()` (`src/polls/userPolls.ts`) lists it (FR-020; fix.md FIX04)
- [X] T046 [US3] In `src/public/tabs.js`'s `init`, before the `?q=` arrival: take `PID` from the address (and remove it), or a remembered one from `localStorage` (`crowdpoll:sharedPid`); a guest's is remembered and the page goes to `/login`; a signed-in visitor's is sent to A8 and, on `{ tab: "private" }`, My Private Polls opens with the card scrolled into view, otherwise the refusal shows as the tab notice. `src/public/pollCard.js` names the `linked` reason "shared with you" (C7; fix.md FIX04)
- [X] T047 [US3] Tests for FR-020: `tests/polls-discovery.test.ts` "Opening a shared poll link" (first open adds the poll once and lists it as `linked`; an uninvited caller is refused and an invitee gets nothing new; no View Polls refused with nothing added; a public poll answers `{ tab: null }`; unknown or not-yet-shown polls 404, a guest 401; the creator gets nothing new), `tests/client-home.test.ts` "a shared poll link in a browser" (signed-in arrival, guest then signed-in arrival, a refusal), and `tests/pages.test.ts` (`/?PID=` now serves the home page) (fix.md FIX04)
- [X] T048 [US3] Requirement change (fix.md FIX05): a signed-in user without `View Polls` sees no poll cards at all. `src/public/tabs.js`: `createGrid`'s render mounts no cards (and removes any, a maximized one included) and `emptyState` shows "You do not have permission to view polls." on every tab (C8). `src/routes/tabsApi.ts`: Favorites and Live Results refresh answer empty, and Search answers `403 no-view-permission` for such a user; guest search is unchanged (A9). Tests (written; run postponed by the developer): `tests/client-home.test.ts` (no cards on Trending, only the message), `tests/search-home.test.ts`, `tests/live-results.test.ts`, and `tests/polls-discovery.test.ts` (Favorites now empty — reverses T028's second case)

**Checkpoint**: all three user stories independently functional.

---

## Phase 6: Polish & cross-cutting concerns

- [X] T033 [P] Update `README.md`: describe the new non-admin "Create Poll" entry point and its scoped `/admin` view near the existing "For administrators" section; separately, re-read the "Anonymous Votes" row (`| **Anonymous Votes** ... | Reserved for the poll-creator role ... Until a creator role exists the setting is stored and shown but has no effect |`) — 025 adds a *Create Poll grant*, not the "creator role" that row anticipates activating the setting for, so reword it to stop implying this feature turns Anonymous Votes on (it explicitly does not — out of scope per `spec.md` Assumptions) rather than leave it reading as already stale. No references to `specs/`, `designDocs/` or `architecture/` (constitution Documentation Deliverables)
- [X] T034 [P] Update `ARCHITECTURE.md`'s "Poll administration and visibility" section: add the three stored grants, the still-derived `Administrator`, and the `canReachAdmin`/`canActOnPoll` split that replaces the single admin gate described there today
- [X] T035 [P] Confirm `postman/openapi.json` documents the `no-vote-permission` and `no-view-permission` 403 shapes on their four routes (contracts/admin-api.md A6, A7), beyond T020's `GET /api/me` update
- [X] T036 Run `npm test` and `npm run build`; compare with T001's baseline. `git grep -nE "FR-0|T0[0-9]{2}\b|025-|USER-PERMISSIONS" -- src` returns nothing new (constitution VI). Record file/test counts and the asset count here — *2026-10-04: 52 files passed, 1 skipped / 799 tests passed, 15 skipped (baseline 51 / 778: +1 file, +21 tests); build clean, 36 assets. The spec-reference grep over added `src/` lines finds nothing new (the one hit, `(FR-008/FR-009)` in `pages.ts`'s header, predates this change).*
- [ ] T037 Walk `specs/025-user-permissions/quickstart.md` Q1–Q11 in a real browser with two non-admin accounts (restart `npm run dev` first). Record any discrepancy as a FIX item for `/speckit-fix`
- [X] T043 In `src/public/adminCard.js`'s `WHO_OPTIONS`, replace the three "What does this mean?" explanations on the wizard's Who step with the developer's wording (quoted "Shared With You"; "whose email addresses you invite"; "Public polls appear after they are reviewed and approved."), and assert all three in `tests/client-admin-wizard.test.ts` (fix.md FIX02)
- [X] T044 In `src/public/admin-card-m3.css`, correct the four doubled radio selectors (`.m3-radio::before::before`, `:checked:checked`, `:checked::before:checked::before`, `:focus-visible:focus-visible`) so the chosen radio button draws its dot; add a `tests/m3-assets.test.ts` check that no doubled pseudo-selector returns (fix.md FIX03; tests written, run postponed by the developer)
- [X] T049 In `src/public/admin.css`, from 560px wide make `.admin-toolbar` a three-column grid whose middle column matches the cards' 420px column, so Back stays at the left edge and Create New Poll lines up with the cards' left edge; narrower windows keep today's row (contracts/ui-contracts.md C3; quickstart Q3; fix.md FIX06; no automated test — layout is checked in the browser)
- [X] T050 Lower `ENV_PRIVATE_VOTER_LIMIT_DEFAULT`'s default from 500 to 100: `src/config.ts`, `PRIVATE_VOTER_LIMIT_FALLBACK` in `src/polls/service.ts`, the browser placeholder in `src/public/adminCard.js`, the deployment value in `.do/app.yaml`, the comments that stated 500 (`service.ts`, `store.ts`), and the env tables in `README.md` and `CLAUDE.md`; tests `tests/config.test.ts` and `tests/polls-admin-crud.test.ts` follow (written; run postponed by the developer) (spec.md Assumptions; fix.md FIX07)
- [X] T051 Restyle the home page's Refresh (`src/public/header-tab-bar-m3.css`) and `/admin`'s Back link (`src/public/admin.css`) as Material 3 filled tonal icon buttons, 48px with a 28px icon: secondary-container background, on-secondary-container icon, M3 hover, focus and press state layers, and Refresh's disabled state at 12%/38% on-surface (quickstart Q13; fix.md FIX08; no automated test — checked in the browser)
- [X] T052 Size Refresh (`src/public/header-tab-bar-m3.css`) and Back (`src/public/admin.css`) at Material 3's 40px icon-button container with a 26px icon, keeping T051's filled tonal styling, so the 48px tab row leaves 4px between the Refresh circle and the divider below it (quickstart Q13; fix.md FIX09, adjusting FIX08)
- [X] T053 Guard every same-site link on `/admin` (banner, header Create Poll, avatar menu, Back) with one delegated click listener in `guardNavigation()` (`src/public/adminList.js`) that shows the in-page Discard dialog, and disarm `beforeunload` in `releaseSession()` (`src/public/adminCard.js`) so Discard navigates without the browser's "Leave site?"; tests in `tests/client-admin-discard.test.ts` and `tests/polls-editing-eligibility.test.ts` (quickstart Q14; fix.md FIX10)

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: none
- **Foundational (Phase 2)**: T002 ‖ T003 ‖ T004; T005 after T002+T003; T006 after T005. **Blocks all three stories**
- **US1 (Phase 3)**: after Phase 2. Tests T007–T012, T040 and T041 are written before T013 starts (T007–T009 and T040 share one file); T013→T014→T015 and T013→T016 (same predicate, two call sites); T017 after T005; T018, T019, T020 each depend on T017 (and T019 also on T015); T021 last
- **US2 (Phase 4)**: after Phase 2 (does not need US1's predicates). T022 ‖ T023 (same file, but independent assertions) before T024; T024 depends on T004/T005 only; T038 depends on T024 (same shape of branch, second file); T039 depends on T038; T025 last
- **US3 (Phase 5)**: after Phase 2 (does not need US1 or US2). T026/T027/T028 in parallel (three files) before implementation; T029/T030/T031 each depend only on T004/T005; T032 last
- **Polish (Phase 6)**: after all three stories' checkpoints

### User story dependencies

- **US1 (P1)**: depends only on Foundational
- **US2 (P2)**: depends only on Foundational — independent of US1
- **US3 (P3)**: depends only on Foundational — independent of US1 and US2

US1 touches no file US2 or US3 touches, so it can be built in parallel with either once Phase 2's
checkpoint passes. US2 and US3 have no logical dependency on each other, but they share one file:
US2's T038 (`voteBlocks()`) and US3's T029 (`POST /api/tabs/private/refresh`) and T031
(`POST /api/live/:pid`) all edit `src/routes/tabsApi.ts`, in different functions. Sequence
those three edits, or give both stories to one person, to avoid a merge conflict in that file.

### Parallel opportunities

- T002 ‖ T003 ‖ T004 (Foundational — three different files)
- US1 tests: T007–T009 and T040 share `tests/polls-admin-crud.test.ts` (write them in sequence); T010, T011, T012 and T041 are in four other files and can be written alongside
- T011 ‖ T012 (client/openapi tests) ‖ anything else in US1 once written
- T022 ‖ T023 (US2, same file but independent cases — written together, then both run)
- T026 ‖ T027 ‖ T028 (US3 tests, three different files)
- T030 ‖ T031 (two different route files; T031 lands after T029, which edits the same file)
- Once Phase 2 passes: US1 can proceed in parallel with US2 and US3; US2 and US3 can too, except that T038, T029 and T031 all edit `src/routes/tabsApi.ts` and should land one after another
- T033 ‖ T034 ‖ T035 (Polish documentation, three different files)

## Parallel example: Foundational, then all three stories

```text
# Foundational, together:
T002  src/db/migrations/006-user-permissions.ts   + index.ts registration
T003  src/db/schema.ts                            UserTable.permissions
T004  src/polls/service.ts                        Permission + hasPermission()

# Then, in parallel by story:
US1: T007-T012, T040-T041 (tests) -> T013-T020 (impl) -> T021
US2: T022-T023 (tests) -> T024, T038 (impl) -> T039 -> T025
US3: T026-T028 (tests) -> T029-T031 (impl) -> T032
```

## Implementation Strategy

### MVP first (User Story 1 only)

Phases 1–3: T001–T021. After T021, a non-admin creator can author and manage their own polls
end-to-end with admin behavior unchanged — the feature's primary, highest-priority value. Stop
and walk quickstart Q1–Q6 if wanted before continuing.

### Incremental delivery

1. Setup + Foundational → the column, the merge, and `hasPermission` exist and are proved (T006)
2. US1 → non-admin poll authoring (MVP)
3. US2 → vote-permission enforcement, guest-safe
4. US3 → view-permission enforcement: the "My Private Polls" tab, private links, and the clarified
   bookmark/Live-Results action gating
5. Polish → documentation (with the README "Anonymous Votes" wording caught in T033), full suite,
   manual walk

### Parallel team strategy

Once Phase 2's checkpoint passes, US1 can go to one developer on its own (admin routes, `pages.ts`,
`api.ts`, the two client admin files). US2 (`viewerVoteBlock` plus `voteBlocks()` in `tabsApi.ts`)
and US3 (the bookmark handlers in `pollsApi.ts`, plus `tabsApi.ts`'s private-tab and live-results
handlers) both edit `src/routes/tabsApi.ts`; give them to one developer, or have two developers
land T038 and T029/T031 one after the other.

## Notes

- 53 tasks: Setup 1, Foundational 5, US1 18, US2 6, US3 11, Polish 12
- T033 catches a real pre-existing README sentence ("Until a creator role exists...") that this
  feature's shipping makes read as stale if left untouched — worth re-reading even though nothing
  in `spec.md` asked for it, since Documentation Deliverables requires the README stay accurate.
- T038/T039 (US2) and the file correction in T028/T029 (US3) came from `/speckit-analyze`'s F1/C1/E1
  findings (`analyze-report.md`): `tabsApi.ts`'s `voteBlocks()` is a separate, hand-duplicated copy
  of `viewerVoteBlock`'s logic that the poll card's up-front banner actually reads, and the three
  personal tabs split as "My Private Polls" (private-only, `View Polls`-gated), "Favorites"
  (public-only, never gated — FR-014), and "Live Results" (mixed; only adding is gated, and
  existing entries stay until removed).
- Commit after each phase, or per story. Once Foundational is done, the only file two stories share
  is `src/routes/tabsApi.ts` (US2's T038, US3's T029/T031).
