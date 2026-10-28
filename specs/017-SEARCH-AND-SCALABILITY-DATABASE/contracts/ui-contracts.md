# UI Contracts: Search and Scalability Database

**Phase 1 output**. The visual design is deferred by the requirements; these contracts fix
behaviour the tests can observe. Client modules: `tabs.js`, `trending.js`, `liveResults.js`,
`searchTab.js`, `deltaClient.js`, `voteClient.js`, `pollCard.js` (render only).

## Tabs

- Five tabs, always present: TRENDING, My PRIVATE POLLS, Favourites, Search, Live Results.
  TRENDING is selected on arrival and after a browser refresh; no tab is refreshed by a browser
  refresh except TRENDING (from the CDN/copy).
- Guests: My PRIVATE POLLS, Favourites and Live Results are rendered disabled; clicking one shows
  the sign-in prompt (the existing login flow).
- Each instance-served tab holds `{ cards, versions, membershipVersion, receivedAt }`. A tab click
  renders the held copy; a request is sent only when `receivedAt` is older than the manual floor,
  when nothing is held, or on Refresh after the floor. The Refresh button is disabled for the
  manual floor after any refresh of that tab.
- Every response's `nextRefreshMs` sets the tab's next-allowed time. `429`/`503` disable the
  control for `retryAfterMs` and show no error; `503` adds 0–1 s of jitter.
- Deltas: `304` → nothing; `counters` → update counts in place; `cards` → replace; `order` →
  reorder and prune. Counts never step backwards (the client keeps the higher `countsVersion`).

## TRENDING

- On interaction: fetch `trending-counts.json` from `trendingBaseUrl` with `If-None-Match`; on
  `304` re-render the held copy; on `200` apply counts and order; if `membershipVersion` differs
  from the held one, fetch `trending.json` and replace the cards.
- The held copy and both versions live in `sessionStorage`; on a page load a copy younger than
  the recompute interval renders immediately, then validates.
- Signed-in: after rendering, call `GET /api/me/polls?pids=…` for ids without an overlay entry;
  merge `overlay` into the cards; after the user's own vote or bookmark, update the overlay from
  that response — no re-fetch.
- The manual floor for TRENDING is client-enforced only (button disabled 5 s; a click within the
  floor re-renders the copy).

## Cards

- Vote button on every card except in Search; Live Results button on every card except in Live
  Results; Bookmark/Un-bookmark on every card. For guests all three prompt to sign in.
  *(Superseded by 020-LIVE-RESULTS-X: the Live Results link is on every card on every tab — with
  the animated bars and "Add to Live Results" elsewhere, and a plain X and "Remove from Live
  Results" on the Live Results tab, where it removes the poll. See
  `specs/020-LIVE-RESULTS-X/contracts/ui-contracts.md`.)*
  *(Extended by 021-MAXIMIZED-POLL-CARD: every card's title row also carries a Maximize control
  after the Favorites star, and a click on the title, the subtitle or that control shows the card
  maximized in place of the tab's grid. See `specs/021-MAXIMIZED-POLL-CARD/contracts/ui-contracts.md`.)*
- Search-result cards: no Vote; Bookmark and Live Results present; pressing Live Results adds the
  poll to the Live Results tab (top of the list) and switches to it.
- The card renders stored enumerations verbatim (014). Both faces — front and the voting back — render from the card payload and the overlay; flipping makes no request.

## Voting

- Vote → `POST …/vote`; on `200` update the card's counts and overlay from the response and
  disable the Vote buttons for `nextRefreshMs` (the vote floor); on `status: "queued"` show
  "Your vote is queued and will be processed as soon as possible."
- On `429`/`503` keep the vote pending, disable the buttons, and retry once after `retryAfterMs`
  (+ jitter for `503`); on the retry's failure show the existing retry message.
- Refusals (`403`) show the existing messages.

## Live Results tab

- List of ≤ `ENV_MAX_LIVE_RESULTS_PER_USER` polls, most recently added on top; re-adding moves to
  top; adding when full is refused with a modal naming the limit (FIX028). `POST /api/live/:pid` on add; `DELETE` on remove.
  *(020-LIVE-RESULTS-X: the removal control is the card's bottom-row link in its X form, not the
  corner button FIX025 added — that button is gone. The link is shown for every poll on the tab,
  whatever its state, and a removal places the focus on the next card's link or on the tab's
  empty-state line.)*
- Timer: `POST /api/live/refresh` with the held versions at the last `nextRefreshMs`, never
  sooner than the live floor; paused while `document.hidden`, resumed on focus.
- Idle: after `ENV_MAX_IDLE_TIME` without interaction (click, key, scroll within the tab) show the
  prompt "Do you want to continue to receive Live Results updates for this poll?" — Cancel /
  Yes — modal for the tab only; Yes restarts the timer and refreshes; Cancel closes the tab
  (`DELETE` for each poll).
- `403 live-expired` → treat as Cancel.

## Search tab

- Enter in the search box → `POST /api/search` (search floor); on `200` select the Search tab,
  clear the box, render results and the "more results not shown" notice when `truncated`.
- Refresh on the Search tab → `POST /api/search/refresh` with the last query (manual floor).
- Results are never refreshed automatically.

## Personal tabs

- My PRIVATE POLLS / Favourites → `POST /api/tabs/<tab>/refresh` with held versions; render the
  delta. Empty state: the existing empty-list treatment of the grid.

## Page load

- The page ships with fingerprinted assets; `app.js` calls `/api/config` (cacheable) then
  `/api/me`, and — signed in — the overlay for the visible TRENDING ids: at most one instance
  request per page load for a guest, two for a signed-in user. On `429 too-many-loads` the page
  renders its stored TRENDING copy with the notice "You are refreshing too quickly." and no error
  page.

## Browser console

Nothing new is logged; the session token, overlay contents and vote choices are never logged.

## Retired

`pollGrid.js`/`pollGrid.css` and the `?PID=` standalone view; `pollCard.js` no longer polls.
