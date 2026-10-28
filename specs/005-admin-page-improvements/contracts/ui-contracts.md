# UI Contracts: Admin Page Improvements

User Stories 1–3 change no HTTP API surface (`POST /api/admin/polls/:pid/duplicate`'s
request/response shape is unchanged — see research.md "Out of scope"). Most of the
contracts below are internal DOM/markup contracts that `adminList.js`, `app.js`, and their
tests are written against; User Story 4 does add one real HTTP contract change, documented
in its own section below.

## Shared site header contract

Every page (`index.html`, `admin.html`, `admin-poll.html`, `admin-results.html`,
`login.html`, `profile.html`, `create-account.html`) contains exactly:

```html
<header id="site-header"></header>
```

`app.js`'s `renderSiteHeader(me, config)` is the sole writer of this element's contents, on
every page, called once during page init. Its output (for a given `me`/`config`) MUST be
identical regardless of which page mounted it:

- `.brand` — the two inline brand SVGs (mark + wordmark), linking to `/`
- `nav.header-nav` — the "Create Poll" nav link (inert, matches today's home-page state)
- `.header-search` — the search box (inert, matches today's home-page state)
- `#header-actions` — session-driven: logged-out → "Log In" (+ "Create Account to Vote" in
  native sign-in mode) buttons; logged-in → username + avatar + menu (Edit Profile, Logout)

A visual/DOM diff between any two pages' rendered `#site-header` for the same session state is
a contract violation (spec SC-004).

## Admin poll-list actions menu contract

Per poll row in `#pollListBody`, the Actions `<td>` contains exactly one trigger and one menu:

```html
<td class="admin-actions-cell">
  <button type="button" class="actions-menu-trigger" aria-haspopup="true" aria-expanded="false">
    <!-- kebab icon -->
  </button>
  <div class="actions-menu" role="menu" hidden>
    <a role="menuitem" href="/admin/poll?PID=...">Edit Poll</a>
    <button role="menuitem" type="button"><!-- Duplicate Poll --></button>
    <button role="menuitem" type="button"><!-- Copy Poll Link --></button>
    <a role="menuitem" href="/admin/poll/results?PID=...">View Results</a>
  </div>
</td>
```

Note: the cell's class is `admin-actions-cell`, not the more obvious `actions` — `actions`
collides with an unrelated `.actions{ display:flex; ... }` rule in `pollCard.css` (a
poll-card button-group class also loaded on `admin.html`), which would pull the cell out of
table-row layout and break its row-height stretch. Distinct naming avoids the collision
rather than fighting it with specificity.

Rules (FR-005–FR-011):

- At most one row's `.actions-menu` is visible (not `hidden`) at a time across the whole page.
- Opening: click, or Enter/Space while the trigger has focus. Sets `aria-expanded="true"`,
  removes `hidden`, moves focus to the first `menuitem`.
- Closing: outside click, Escape, or activating a `menuitem`. Sets `aria-expanded="false"`,
  restores `hidden`, returns focus to that row's trigger — except when closed by activating
  "Edit Poll"/"View Results" (navigation) or "Copy Poll Link"/"Duplicate Poll" (in-page
  action), where the existing unchanged behavior of each item still applies.
- Arrow Up/Down while a `menuitem` has focus moves focus to the previous/next `menuitem`
  (no wraparound requirement beyond the 4 items).
- If opening would place the menu partially outside the viewport, a `.actions-menu--flip-up`
  (and/or `--flip-left`) class is added so it renders fully on-screen instead.

The four `menuitem` actions' destinations/behaviors (`Edit Poll` → `/admin/poll?PID=`,
`Duplicate Poll` → `POST /api/admin/polls/:pid/duplicate`, `Copy Poll Link` → clipboard write
of `location.origin + "/?PID="`, `View Results` → `/admin/poll/results?PID=`) are unchanged
from today's implementation — only their container changed.

## Poll editor HTTP contract (User Story 4)

`PATCH /api/admin/polls/:pid` (`004-realtime-poll-voting` contracts/api-endpoints.md) keeps
its existing shape with one field-level and one cross-field change:

- `voterCountLimit` now accepts `null` (in addition to a positive integer up to 500) to mean
  "cleared/blank"; sending `null` sets the stored value to `null` (FR-021). Omitting the key
  still means "no change," exactly as before — only an explicit `null` clears it.
- `resultsVisibility`/`accessMode` are validated together, not independently: if the request
  (combined with the poll's current stored values for whichever of the two it doesn't touch)
  would leave the poll with `resultsVisibility: "TRANSPARENT-POLL"` and `accessMode:
  "PUBLIC_POLL"` at the same time, the server rewrites whichever field the request did *not*
  just set to resolve it (FR-014–016, data-model.md), and also applies the `voterCountLimit`
  auto-default (FR-018/019, data-model.md) when `accessMode` ends up changed as a result. The
  response body (`200 updated poll`) always reflects the final, corrected values — a client
  that only sent one field must re-fetch (or read the response) to see a value it didn't
  send.
- Existing responses are otherwise unchanged: `400` for validation failures, `409` for an
  `accessMode` change once the poll has ever received a vote (`004-realtime-poll-voting`
  FR-048) — including when that lock is what prevents the cross-field auto-correction above
  from being satisfiable.

`postman/openapi.json`'s `voterCountLimit` schema is `["integer", "null"]` to reflect the
first bullet.
