# Research: User Permissions (025)

No NEEDS CLARIFICATION markers remain in `spec.md` — the source requirements doc went through a
full architecture review (one inconsistency, one ambiguity, three unspecified aspects, one needs-
clarification item, all resolved) before this spec was written, and `/speckit-clarify` resolved one
further spec-level gap. This file records the concrete technical decisions that follow from those
resolutions, each traced to the existing code it builds on.

## R1. Carrying `permissions` on the cached session

**Decision**: `createSessionCache`'s `lookup()` (`src/auth/sessionCache.ts`) issues one extra
`SELECT permissions FROM "user" WHERE id = ...` immediately after `auth.api.getSession()` returns,
merges the result into `session.user.permissions`, and only then caches the object. A cache hit
reads the merged value for free.

**Rationale**: `permissions` cannot be declared to BetterAuth (its Kysely adapter cannot store
`text[]`, per the requirements doc's Storage section), so it has to be fetched by a second,
independent query — but only on the existing cache-miss path, not on every request.

**Alternatives considered**: querying `permissions` on every request regardless of cache state
(rejected — defeats the point of the session cache); declaring it to BetterAuth as a computed field
(rejected — the adapter constraint is unconditional, not a configuration option).

## R2. The `CHECK` constraint shape

**Decision**: `permissions <@ ARRAY['View Polls','Vote on Polls','Create Poll']::text[]` — array
containment.

**Rationale**: allows any subset (including `{}`), in any order, so a tester hand-editing one grant
away (per the requirements doc's Exclusions testing note) never violates the constraint. Resolved
as U1 during `/speckit-mdd-architecture`.

**Alternatives considered**: exact-match equality (rejected — rejects any subset or reordering); a
PostgreSQL enum column (rejected — `text[]` plus a `CHECK` is simpler to extend than an enum, and
the requirements doc already rejected a join table and a bitmask on the same grounds).

## R3. Generalizing the single admin gate

**Decision**: `isAdminEmail` / `createRequireAdmin` (`src/polls/service.ts`) stay, but the gate they
express grows two outcomes instead of one:
- `canReachAdmin(user, config)` = admin OR (`Create Poll` AND `View Polls`) — gates `GET /admin`,
  `GET /api/admin/polls`, `POST /api/admin/polls`.
- `canActOnPoll(user, poll, config)` = admin OR (`canReachAdmin` AND `poll.created_by_id === user.id`)
  — gates every `:pid` route and `/admin/poll/results`; a `false` result is a `404`, not a `403`,
  so a creator learns nothing about a poll that isn't theirs.

**Rationale**: `createRequireAdmin` is already the one place `pollsApi.ts` and `pages.ts` share (the
shape-only difference between their two refusals is already a parameter, per the existing 013
comment at `service.ts:748`). Splitting its *predicate* in two, rather than writing new per-route
checks, keeps that one-seam property intact. Resolved I1 fixes which routes need both grants versus
one.

**Alternatives considered**: an ad hoc permission check inlined at each of the ~15
`/api/admin/*` route registrations (rejected — reintroduces exactly the duplicated-predicate problem
012 FR-050 already solved once for `isAdminEmail`).

## R4. Scoping `GET /api/admin/polls` to a creator's own polls

**Decision**: the row-fetching query behind `listAdminRows` gains an optional creator-id filter;
the route (`src/routes/pollsApi.ts`) passes the caller's id whenever they are not an admin. The
existing `adminListRow` shaping function and the `votedPids` lookup are unchanged — only which rows
reach them differs.

**Rationale**: one query path, one row-shaping function, matching the "no admin behavior changes"
requirement (FR-009) with the smallest possible diff.

**Alternatives considered**: a separate `listCreatorRows` function (rejected — would duplicate
`adminListRow`'s field list for no benefit, since the only difference is a `WHERE` clause).

## R5. The vote-permission check and the guest exemption

**Decision**: `viewerVoteBlock` (`src/polls/service.ts:327`) gains a new first-checked branch: when
the caller is signed in and their `permissions` do not include `Vote on Polls`, return
`{ status: 403, message: "You do not have permission to vote.", code: "no-vote-permission" }` (the
function's existing return shape gains a `code` field, which every current caller already ignores
safely). When there is no caller (`callerEmail` is empty — a guest), the branch is skipped
entirely.

**Rationale**: `viewerVoteBlock` already is the one place both the vote route (via
`validateVoteSubmission`) and the poll-card detail builder decide "why can't this viewer vote,"
per its own doc comment ("the card and the server cannot disagree"). Adding the branch there, rather
than as separate middleware, means the card's up-front message and the route's refusal stay
impossible to disagree — resolving N1 (guests are never evaluated) for both consumers at once with
one change.

**Alternatives considered**: a `requireVotePermission` Express middleware ahead of the vote route
(rejected — the card's own "why is voting blocked" message needs the same answer outside any
request/response cycle, so the check has to live in the shared pure function, not in middleware that
only the route can reach).

## R6. The view-permission check on bookmark and Live Results actions (Clarification session 2026-10-04)

**Decision**: a small `hasPermission(user, "View Polls")` helper (`src/polls/service.ts`, shared
with R5's branch via the same lookup) backs a guard inserted after the existing signed-in check in
two route handlers (the `POST` halves): `POST /api/polls/:pid/bookmark` (`src/routes/pollsApi.ts`)
and `POST /api/live/:pid` (`src/routes/tabsApi.ts`). `DELETE` on both stays unguarded, so a user
can always remove a bookmark or a Live Results entry. A refusal is
`403 { error: "You do not have permission to view polls.", code: "no-view-permission" }` — the same
shape as R5's vote refusal, one grant name apart.

**Rationale**: resolves the spec's Clarification session: the action is blocked, not just the tab's
later display of it, so a user missing `View Polls` gets the same kind of immediate, legible
refusal a blocked vote attempt already gets, rather than a silent success that never shows up
anywhere.

**Alternatives considered**: suppressing only the personal tabs' *rendering*
(rejected by the clarification answer — leaves the bookmark/subscribe action itself silently
succeeding, which is the confusing case the clarification was raised to avoid).

## R7. The home page's "Create Poll" link and the avatar menu's admin-only link stay two different affordances

**Decision**: `GET /api/me` (`src/routes/api.ts`) gains `permissions: string[]` — the caller's
effective grant set, including the literal string `"Administrator"` for an admin — alongside the
existing `isAdmin` boolean, which is untouched. In `app.js`'s `renderSiteHeader`, the header's
`<a class="header-nav-link is-inert" ...>Create Poll</a>` (today permanently inert) becomes live —
`is-inert`/`aria-disabled`/`tabindex="-1"` removed, `href="/admin"` set — exactly when
`me.isAdmin || (me.permissions.includes("Create Poll") && me.permissions.includes("View Polls"))`.
The avatar menu's separate "Poll Administration" link (`app.js`, gated on `me.isAdmin` alone) is
untouched: it stays admin-only, per the requirements doc naming the header link as the sole new
entry point for a creator.

**Rationale**: the requirements doc describes exactly one new entry point (the header link); the
avatar menu's existing admin link is a different, pre-existing affordance the requirements doc never
asks to change. Keeping `isAdmin` and `permissions` as two separate `GET /api/me` fields matches the
existing 012 FR-053 lesson (a rendering hint never substitutes for the server's own enforcement).

**Alternatives considered**: also exposing "Poll Administration" to creators (rejected — out of
scope; the requirements doc is explicit that the header link is "the same link" a creator uses both
to create and to return, implying no second entry point is wanted).

**Revised after implementation (fix.md FIX01, 2026-10-05)**: the developer asked for the avatar
menu's "Poll Administration" link to be shown to creators as well. It now uses the header link's
condition (`canCreatePolls(me)`: administrator, or both `Create Poll` and `View Polls`), in the same
place between Edit Profile and Logout. The alternative rejected above is the one now adopted.

## R8. `/admin` page layout branch

**Decision**: `admin.html` keeps one markup file; `adminList.js` branches at init time on whether
the signed-in caller is an admin (known from `GET /api/me`'s `isAdmin`). A non-admin creator never
has `#adminTabBar` or `#adminSearchForm` inserted into the DOM at all (not merely hidden via CSS),
and the page's one request is `GET /api/admin/polls` with no tab/search parameters — the same
request an admin's "Newest" view already makes, just pre-scoped server-side per R4.

**Rationale**: matches the requirements doc's "not rendered at all" wording precisely, and reuses
the existing list-rendering and pagination code paths rather than forking them.

**Alternatives considered**: hiding the tab bar/search form with CSS (rejected — the requirements
doc is explicit that these elements must not be rendered, not just hidden, and the admin search
route already refuses non-admins server-side regardless).

## R9. Migration, tests, and the API contract document

**Decision**: a new migration `src/db/migrations/006-user-permissions.ts`, registered in
`src/db/migrations/index.ts` alongside `001`–`005`, adds `permissions text[] NOT NULL DEFAULT
ARRAY['View Polls','Vote on Polls','Create Poll']` plus R2's `CHECK` constraint — additive, no
backfill step. `tests/polls-admin-crud.test.ts` and `tests/pages.test.ts` replace their blanket
"every non-admin refused" assertions with the four cases from the resolved Breaking Changes section
(guest, no `Create Poll`, `Create Poll` without `View Polls`, creator-on-another's-poll) plus new
coverage for a creator's own CRUD path; `tests/polls-vote.test.ts` and `tests/bookmarks.test.ts` /
`tests/live-results.test.ts` each gain a denied-permission case and a guest-is-unaffected
counterpart; `tests/openapi-contract.test.ts` and `postman/openapi.json` gain `permissions` on
`GET /api/me`'s response schema and the two new `403` shapes.

**Rationale**: follows the existing migration-numbering and test-file conventions exactly; no new
convention is introduced.

**Alternatives considered**: none — these are existing, unambiguous project conventions.
