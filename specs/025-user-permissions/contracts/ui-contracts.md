# UI changes: User Permissions (025)

## C1. The header's "Create Poll" link (`src/public/app.js`, `renderSiteHeader`)

Today: `<a href="#" class="header-nav-link is-inert" aria-disabled="true" tabindex="-1">Create Poll</a>`
— permanently inert markup, never activated.

025: live exactly when `me.isAdmin || (me.permissions.includes("Create Poll") &&
me.permissions.includes("View Polls"))` (A5's new field). When live: `is-inert` class removed,
`aria-disabled` removed, `tabindex` removed, `href="/admin"` set. Guests (`me` is `null`) and every
other signed-in user keep the inert markup, unchanged. (R7)

## C2. The avatar menu's "Poll Administration" link — administrators and creators

Shown under the same condition as C1 (`canCreatePolls(me)` in `app.js`): administrators, and users
holding both `Create Poll` and `View Polls`. Same place as before, between Edit Profile and Logout;
absent, not disabled, for everyone else. (R7, fix.md FIX01)

## C3. `/admin` page layout branch (`admin.html` + `adminList.js`)

| | Administrator | Non-admin creator |
|---|---|---|
| Toolbar | Back at the left edge; Create New Poll above the cards, lined up with their left edge (fix.md FIX06; below 560px the two sit side by side as before) | the same |
| `#adminTabBar` | rendered (Newest / Awaiting Approval / Rejected / Search) | **not rendered** (not hidden — absent from the DOM) |
| `#adminSearchForm` | rendered | **not rendered** |
| List | whichever tab's rows | one list: the caller's own polls, newest first (A1) |
| Empty-list message | existing per-tab text | "You haven't created any polls yet." |
| At-cap message | existing per-tab text (names Search) | "Only your newest N polls are shown." (no "Use Search" hint) |
| Refresh interval | `ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL` (unchanged) | same interval |

(R8)

## C4. Vote-blocked message (poll card, `src/public/pollCard.js`)

No new code path: A6's `no-vote-permission` refusal flows through the same `viewerVoteBlock`
result both the vote route and the card's existing `voteBlockedReason` plumbing already read
(R5), so the card shows "You do not have permission to vote." exactly where it already shows
every other vote-block reason, and withdraws vote controls the same way. No new CSS, no new
component.

## C5. Bookmark star / Live Results subscribe refusal

A7's `no-view-permission` 403 is new for these two actions. The star/subscribe control's existing
error handling (whatever already surfaces a `409 bookmark-cap` or a live-results-limit refusal
today) gains this one more case, surfaced the same way — a brief inline message, not a dialog,
and the star/subscribed state does not optimistically toggle before the response arrives.

## C6. `GET /api/me`'s `permissions` field is a rendering hint only

Exactly like `isAdmin` already is (012 FR-053): every gate in `contracts/admin-api.md` is
re-checked server-side on every request. Forging or stale-caching this field in the browser can at
most reveal C1's link or suppress it incorrectly — the routes behind it still enforce A1–A7
independently.

## C7. Arriving from a shared poll link (`src/public/tabs.js`, `init`; fix.md FIX04)

The copied link is `/?PID=<id>`. On load, the page removes `PID` from the address, then:

| Visitor | What happens |
|---|---|
| Signed in | `POST /api/me/polls/:pid/link` (A8). On `{ tab: "private" }` the My Private Polls tab opens and the poll's card is scrolled into view; a refusal shows its message as the tab notice (404 reads "This poll is not available.") and Trending opens as usual; `{ tab: null }` (public poll) opens Trending as usual |
| Guest | the id is kept in `localStorage` (`crowdpoll:sharedPid`) and the page goes to `/login`; the next signed-in load of the home page in that browser picks it up, clears it and proceeds as above |

A card listed because of its link says "shared with you" where "created by you" and "you are
invited" already appear (`src/public/pollCard.js`).

## C8. No poll cards without `View Polls` (`src/public/tabs.js`; fix.md FIX05)

When `GET /api/me`'s `permissions` holds neither `View Polls` nor `Administrator`, every grid built
by `createGrid` — Trending, Newest, My Private Polls, Favorites, Live Results and Search — mounts no
cards and removes any it holds (a maximized card included), and every tab's empty line reads "You
do not have permission to view polls." in place of its usual text. A guest has no `permissions`, so
nothing changes for them. Like C6, this is a rendering hint; A9 is the server's side.
