# Implementation Plan: User Permissions

**Branch**: `dev` (no dedicated branch) | **Date**: 2026-10-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/025-user-permissions/spec.md`

## Summary

Today exactly one gate — `isAdminEmail`/`createRequireAdmin` — decides every `/admin` and
`/api/admin/*` request: an address is either on `ENV_ADMINS` or refused outright. 025 splits that
into three independently-grantable, per-user stored abilities (`View Polls`, `Vote on Polls`,
`Create Poll`, as a `permissions text[]` column) plus the one still-derived `Administrator`, so a
non-admin holding `Create Poll` and `View Polls` can reach a scoped `/admin`, create polls, and act
only on polls they created (everything else answers `404`). `Vote on Polls` gates voting (never for
guests); `View Polls` gates private-poll links, every poll card a signed-in user is shown (since
fix.md FIX05: no cards at all, on any tab, without it), and — per the spec's one clarification —
the bookmark/subscribe actions themselves. The admin experience,
`ENV_ADMINS`, and every existing per-poll rule are untouched. One additive migration; no new
environment variable, queue, cache, or search-index change.

## Technical Context

**Language/Version**: TypeScript 5.8 (server, `src/`); JavaScript (browser, classic scripts) for
`src/public/*.js`; Node 22

**Primary Dependencies**: none new — reuses Express, Kysely, BetterAuth, the existing session cache

**Storage**: PostgreSQL — one additive column + `CHECK` constraint on `user` (`data-model.md`); no
change to `polls` or any other table

**Testing**: Vitest + supertest + embedded-postgres + jsdom, the project's existing suite

**Target Platform**: unchanged — Linux server (Express) + evergreen browsers

**Project Type**: web application (Express server + static client under `src/public/`)

**Performance Goals**: no material cost — the permissions lookup piggybacks on the session cache's
existing cache-miss round trip (R1); the per-poll ownership check reuses the poll row the route
already fetches

**Constraints**: no new `ENV_*` variable (requirements doc Assumptions); migration is additive only,
no backfill step; `postman/openapi.json` stays in sync with every route/response change (project
Architecture Notes)

**Scale/Scope**: ~15 `/api/admin/*` + `/admin*` routes, the vote route, 2 bookmark/live-results
routes (the `POST` halves), the "My Private Polls" refresh route, `GET /api/me`, 3 client files
(`app.js`, `admin.html`, `adminList.js`), 1 migration, 11 test files, `postman/openapi.json`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | Every ambiguity was surfaced and resolved before this plan: 1 inconsistency + 1 ambiguity + 3 unspecified aspects + 1 clarification during architecture review, 1 further gap (bookmark/Live-Results action gating) put to the developer in `/speckit-clarify` | Pass |
| II. Simplicity First | Reuses the single existing admin predicate (`isAdminEmail`/`createRequireAdmin`) rather than inventing new per-route logic; explicitly excludes a permissions-management UI and site-wide banning (FR-016, FR-017) | Pass |
| III. Surgical Changes | Touched files are enumerated in full in Project Structure below; nothing outside that list changes | Pass |
| IV. Goal-Driven Execution | FR-001–FR-019 and SC-001–SC-007 give an explicit, testable definition of done; `research.md` R9 names every test file that must change | Pass |
| V. Code Quality | Two new single-purpose predicates (`canReachAdmin`, `canActOnPoll`) replace what would otherwise be duplicated per-route checks; every new refusal returns a clear, non-crashing response, matching the existing convention that authorization refusals (guest/banned/not-invited, `createRequireAdmin`'s own denial branch) are not logged — adding new logging here would itself be the inconsistent choice | Pass |
| VI. Self-Documenting Code | No new comment cites a requirement/task id in `src/`; the one external reference worth a comment (why `permissions` isn't declared to BetterAuth) states a library constraint, not a requirement number | Pass |
| Documentation Deliverables | README.md/ARCHITECTURE.md updates are deferred to the post-implementation phase, per the constitution's own ordering — not produced by this plan | Pass (deferred, correctly) |

Post-design re-check (after Phase 1): unchanged, all pass. No Complexity Tracking entries — every
generalization (R3, R5, R6) narrows what would otherwise be duplicated per-route logic into one
shared predicate, rather than adding a new layer.

## Project Structure

### Documentation (this feature)

```text
specs/025-user-permissions/
├── spec.md               # includes the Clarifications session (2026-10-04)
├── plan.md               # this file
├── research.md           # R1–R9
├── data-model.md          # the one column change; ER diagram carried from architecture.md
├── quickstart.md          # automated run + Q1–Q13 manual checks
├── contracts/
│   ├── admin-api.md       # A1–A9
│   └── ui-contracts.md    # C1–C8
├── checklists/
│   └── requirements.md
└── tasks.md               # /speckit-tasks (not created by this command)
```

### Source Code (repository root)

```text
src/db/
├── migrations/
│   ├── 006-user-permissions.ts   # new: permissions text[] + CHECK (R2, R9)
│   └── index.ts                  # +1 registration
└── schema.ts                      # UserTable.permissions: string[]

src/auth/sessionCache.ts           # lookup() merges permissions into session.user (R1)

src/polls/service.ts               # Permission union; hasPermission(); canReachAdmin() / canActOnPoll()
                                    #   generalizing isAdminEmail/createRequireAdmin (R3);
                                    #   viewerVoteBlock() gains the Vote on Polls branch (R5)
src/polls/userPolls.ts             # privateTab() also lists "linked" polls (A8, T045); its empty-result
                                    #   shape is reused by tabsApi.ts (T029)
src/polls/store.ts                 # upsertUserPolls accepts the "linked" relation (T045)

src/routes/
├── pollsApi.ts                    # admin routes swap to canReachAdmin/canActOnPoll (A1–A4);
                                    #   listAdminRows gains the creator-id filter (A1);
                                    #   bookmark handlers gain the View Polls guard (A7)
├── pages.ts                       # /admin, /admin/poll/results swap gates (A3);
                                    #   GET /?PID= serves the home page instead of redirecting (A8, T045)
├── tabsApi.ts                     # voteBlocks() gains the Vote on Polls branch (T038);
                                    #   POST /api/tabs/private/refresh returns an empty tab without View Polls (T029);
                                    #   POST /api/live/:pid gains the View Polls guard (A7, T031);
                                    #   new POST /api/me/polls/:pid/link (A8, T045);
                                    #   without View Polls: Favorites and Live Results refresh empty,
                                    #   search refused (A9, T048)
└── api.ts                         # GET /api/me gains permissions (A5)

src/public/
├── app.js                         # renderSiteHeader: the Create Poll link and the avatar menu's
                                    #   Poll Administration entry share one condition (C1, C2)
├── admin.html                     # unchanged markup; #adminTabBar/#adminSearchForm omitted by JS
├── adminList.js                   # admin-vs-creator branch at init (C3)
├── tabs.js                        # a shared link's arrival: open My Private Polls at the poll (C7, T046);
                                    #   no cards on any tab without View Polls (C8, T048)
└── pollCard.js                    # "shared with you" beside the card's other listed-because words (C7)

postman/openapi.json                # GET /api/me.permissions; the two new 403 shapes (A5–A7); the link route (A8)

tests/
├── session-cache.test.ts           # cached session carries permissions; no extra query on a hit (T006)
├── polls-admin-crud.test.ts        # four-case refusal rewrite + creator-own-CRUD coverage + truncated own list (R9, T040)
├── pages.test.ts                   # same four-case rewrite for the page routes
├── client-home.test.ts             # the header's Create Poll link, inert vs. live (T011); no cards without View Polls (T048)
├── search-home.test.ts             # a signed-in searcher without View Polls is refused (T048)
├── client-admin-creator.test.ts    # new: creator's /admin — at-cap notice, no tab bar or search form (T041)
├── polls-vote.test.ts              # no-vote-permission case + guest-unaffected case; overlay voteBlockedReason (T039)
├── bookmarks.test.ts                # no-view-permission case + guest-unaffected case
├── live-results.test.ts             # no-view-permission case for POST /api/live/:pid; DELETE still allowed
├── polls-discovery.test.ts          # empty "My Private Polls" and, since FIX05, Favorites (T028, T048)
└── openapi-contract.test.ts         # permissions field + the two new 403 shapes
```

**Structure Decision**: the existing single web application (Express + static `src/public/`
client over PostgreSQL); every change lives inside files that already own the behavior being
extended — no new module, no new top-level directory.

## Design notes

- **`hasPermission(user, grant)`** (`src/polls/service.ts`) is the one primitive: `user.permissions
  includes grant`. `canReachAdmin` and `canActOnPoll` (R3) are built from it plus the existing
  `isAdminEmail`; R5's vote branch and R6's bookmark/live guard call it directly.
- **`canActOnPoll` returns `404`, never `403`,** for a poll that isn't the caller's and the caller
  isn't an admin for — the existing `createRequireAdmin` refusal-shape parameter stays for the
  `canReachAdmin` cases (401/403), but the per-poll path is a new, simpler "not found" branch
  inserted ahead of each `:pid` handler's existing logic.
- **`GET /api/me` orders `permissions` and `isAdmin` as two independent fields**, never merging
  them — `isAdmin` already has an established "rendering hint, not enforcement" status (012
  FR-053) that `permissions` inherits unchanged rather than re-deriving.
- **The avatar-menu "Poll Administration" link follows the header link** (R7/C2, fix.md FIX01) —
  both use `canCreatePolls(me)`, so an administrator or a creator sees both, in the same places as
  before; everyone else sees neither.
- **`admin.html`'s markup file does not change** — `adminList.js` decides at init whether to insert
  `#adminTabBar`/`#adminSearchForm` at all, reusing the element ids the CSS and the rest of
  `adminList.js` already key off.
- **Guest exemption is structural, not a special case**: R5's new branch in `viewerVoteBlock` and
  R6's new guard both sit *after* the existing "is anyone signed in at all" check each call site
  already has, so a guest never reaches the new code at all — there is no `if (guest) skip` to get
  wrong.
- **`viewerVoteBlock` is not the only vote-block seam (analysis finding F1).** `src/routes/tabsApi.ts`'s
  `voteBlocks()` — called from `personalListing()`, which backs `POST /api/tabs/private/refresh`
  and `POST /api/tabs/favourites/refresh` — is a second, hand-duplicated implementation of the same
  banned/not-invited logic, and it is what actually populates the overlay's `voteBlockedReason` the
  poll card reads to withdraw vote controls. R5's new `Vote on Polls` branch must be added to
  **both** functions (tasks T024 and T038), or the vote route's `403` would gain the new reason
  while the card's own up-front banner would not.
- **The three personal tabs split by content, not by name (analysis finding C1).** "My Private
  Polls" (`privateTab()`, `src/polls/userPolls.ts`) lists only private-visibility polls — it is the
  one tab `View Polls` actually gates (FR-013). "Favorites" (`favouritesTab()`) lists only
  public-visibility polls — it is never gated by `View Polls`, per FR-014. "Live Results" is mixed
  (its registry, `src/live/registry.ts`, tracks poll ids with no visibility filter at all); only its
  add/subscribe action is gated here (T031) — a private poll added before the ability was lost
  stays until the user removes it, by design (spec.md Assumptions).
- **Superseded by fix.md FIX05 (requirement change, 2026-10-05): no cards at all without `View
  Polls`.** Every tab mounts its cards through `createGrid` in `src/public/tabs.js`; for a signed-in
  user whose `/api/me` grants lack `View Polls` (and `Administrator`), its render mounts none and
  `emptyState` shows "You do not have permission to view polls." on every tab. The routes that know
  the user refuse as well: Favorites and Live Results refresh answer as empty (My Private Polls
  already did), and Search answers `403 no-view-permission`; guest search is unchanged. Trending and
  Newest are the same object for everyone, so the page is the only place they can be withheld.

## Complexity Tracking

None.
