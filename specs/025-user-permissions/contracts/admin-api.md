# Server/API changes: User Permissions (025)

Every change below is additive to an existing route or response shape; no route is removed or
renamed. `postman/openapi.json` is updated to match each item (R9).

## A1. `GET /api/admin/polls` (query scoped for non-admins)

**Before**: every row, regardless of caller.

**After**: an admin still gets every row. A non-admin caller (who, by A3's gate, necessarily holds
`Create Poll` and `View Polls`) gets only rows whose `created_by_id` matches their own id.
`adminListRow`'s response shape is unchanged (R4).

| Caller | Rows returned |
|---|---|
| Administrator | all polls, as today |
| Non-admin with `Create Poll` + `View Polls` | only polls they created |

## A2. `POST /api/admin/polls` (gate widened)

**Before**: `requireAdmin` only.

**After**: `canReachAdmin` (R3) — admin, or both `Create Poll` and `View Polls`. Request/response
body unchanged (`createDefaultPoll`, `201 { pid }`).

## A3. `GET /admin`, `/admin/poll/results`, and the admin-page gate (`src/routes/pages.ts`)

**Before**: `requireAdmin` (page-shaped 403 via `notAuthorizedCard`).

**After**: `canReachAdmin` (R3) gates `GET /admin` itself. `canActOnPoll` (R3) additionally gates
`/admin/poll/results` per the `pid` it's given — a poll that isn't the caller's own and the caller
isn't an admin for → `404`, not the 403 card, so its existence is never revealed to a non-owner.

| Caller | `GET /admin` | `/admin/poll/results?pid=X` (not the caller's own poll) |
|---|---|---|
| Guest | 401/403 (unchanged) | 401/403 (unchanged) |
| Signed in, no `Create Poll` | 403 (not-authorized card) | 403 (not-authorized card — never reaches the per-poll check) |
| `Create Poll`, no `View Polls` | 403 (not-authorized card) | 403 (not-authorized card) |
| `Create Poll` + `View Polls`, not admin | **200**, scoped to own polls | **404** |
| Administrator | 200, unchanged | 200, unchanged |

## A4. Every `/api/admin/polls/:pid/*` route (edit-session, heartbeat, `publish`, `save`, `PATCH`,
`DELETE`, `duplicate`, `results`, `export.json`, `export.md`)

**Before**: `requireAdmin` only; every route acts on any `pid`.

**After**: `canActOnPoll(user, poll, config)` (R3). An admin is unaffected. A non-admin caller who
owns the poll keeps every existing action and every existing state rule (`canOpen`, `canDelete`,
etc., from `capabilitiesFor` — untouched). A non-admin caller who does not own the poll gets `404`.

**Exception — stays admin-only regardless of ownership**:

| Route | Who |
|---|---|
| `GET /api/admin/polls/search` | Administrator only |
| `POST /api/admin/polls/:pid/rescreen` | Administrator only |

## A5. `GET /api/me` (new field)

**Before**: `{ userName, emailAddress, profileAvatar, status, isAdmin }`.

**After**: adds `permissions: string[]` — the caller's effective grant set, including the literal
`"Administrator"` when `isAdminEmail` is true (R7). `isAdmin` is unchanged and still present; both
are rendering hints only, exactly as `isAdmin` already is (012 FR-053) — every decision above is
still enforced server-side regardless of what this field says.

```json
{
  "userName": "…",
  "emailAddress": "…",
  "profileAvatar": "…",
  "status": "…",
  "isAdmin": false,
  "permissions": ["View Polls", "Vote on Polls", "Create Poll"]
}
```

## A6. `POST /api/polls/:pid/vote`

**Before**: refuses for poll-specific reasons only (banned, not invited, voter cap, state/choice
validation).

**After**: gains one more reason, checked only for a signed-in caller (R5):

| Status | Body | When |
|---|---|---|
| 403 | `{ "error": "You do not have permission to vote.", "code": "no-vote-permission" }` | signed in, `permissions` lacks `Vote on Polls` |

A guest (no session) is never evaluated against this reason — unaffected, per the resolved
Needs-Clarification N1.

## A7. `POST /api/polls/:pid/bookmark`, `POST /api/live/:pid`

**Before**: refuse only an unauthenticated caller (`401`) or poll-specific limits (bookmark cap,
live-results cap).

**After**: gains one more reason, inserted after the existing signed-in check (R6):

| Status | Body | When |
|---|---|---|
| 403 | `{ "error": "You do not have permission to view polls.", "code": "no-view-permission" }` | signed in, `permissions` lacks `View Polls` |

Existing cap-related refusals (`409 bookmark-cap`, the live-results `409`/limit shape) are
unaffected and still checked after this new gate.

`DELETE` on both routes is unchanged: removing a bookmark or a Live Results entry never needs
`View Polls`.

## A8. `POST /api/me/polls/:pid/link` (new — opening a shared poll link; fix.md FIX04)

Signed in only; counted as a page load (`ENV_PAGE_LOADS_PER_MINUTE`), not against the manual
refresh floor, because it is part of loading the home page from a link.

| Status | Body | When |
|---|---|---|
| 200 | `{ "tab": "private" }` | private poll the caller may see; for a link-only poll they did not create, a `linked` relation is stored, so it is listed in My Private Polls |
| 200 | `{ "tab": null }` | public poll — nothing stored; the page stays on the home page |
| 401 | `{ "error": "Not signed in" }` | guest |
| 403 | `{ "error": "You do not have permission to view polls.", "code": "no-view-permission" }` | caller lacks `View Polls`; nothing stored |
| 403 | `{ "error": "You are not invited to this poll." }` | invitation-only poll; caller neither invited nor its creator |
| 404 | `{ "error": "Not found" }` | unknown poll, or one not yet shown to voters (not `WAITING TO OPEN`, `OPEN` or `CLOSED`, nor under edit after being one of those) |

`GET /?PID=<id>` now serves the home page instead of redirecting to `/`; the page calls this route.

## A9. Without `View Polls`: the listings that know the user (fix.md FIX05)

For a signed-in caller who lacks `View Polls` (and is not an administrator):

| Route | Answer |
|---|---|
| `POST /api/tabs/private/refresh` | an empty tab (unchanged since T029) |
| `POST /api/tabs/favourites/refresh` | an empty tab — nothing the user bookmarked is removed |
| `POST /api/live/refresh` | an empty list — nothing the user added is removed |
| `POST /api/search`, `POST /api/search/refresh` | `403 { "error": "You do not have permission to view polls.", "code": "no-view-permission" }`; a guest's search is unchanged |

The Trending and Newest objects are the same for everyone and are not changed; the page withholds
their cards (C8).
