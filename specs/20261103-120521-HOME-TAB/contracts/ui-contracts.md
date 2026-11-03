# UI Contracts: Home Tab

## C1. The tab button (`src/public/index.html`)

- First child of `#tabBar`, before Your Polls:
  `<button class="tab" type="button" data-tab="home" role="tab" id="tab-home" aria-controls="panel-home" aria-selected="false" tabindex="-1" hidden>` + the house icon (research R11) + `Home`.
- A panel, first in the panel list, like the other personal panels: `<section class="tab-panel" data-panel="home" role="tabpanel" id="panel-home" aria-labelledby="tab-home" hidden><div class="card-grid"></div><p class="tab-empty" hidden></p></section>`.
- `hidden` while no session is known (guests, and before the session answer); shown for a signed-in user (FR-002).
- The "All tabs" menu (`tabBarScroll.js`) and arrow-key movement skip hidden tabs.

## C2. Tab behaviour (`src/public/tabs.js`)

- `home` is a personal tab (`PERSONAL_TABS`, `KIND_OF: refresh`, `LANDING_TABS`), its controller `createDeltaTab("home", "/api/tabs/home/refresh", { showVote: true, showLive: true, tab: "home" })` with `keepOrder` (C3).
- **Landing** (FR-003): after the poll-page, link and search landings, a signed-in user gets `select("home")`, a guest `select("trending")`.
- **Sign-out** while on Home: the tab hides and Trending is selected (FR-004). **Sign-in**: the tab shows; the current tab stays.
- `select("home")` by a guest selects Trending (FR-023).
- **Empty**: `EMPTY_LINES.home` = "Nothing here yet. Polls shared with you, your polls, your votes, the polls you watch and what's trending will appear here." (FR-006).
- A bookmark or vote made on another tab marks Home due, so its next request confirms the server's list.

## C3. Keeping the order while Home is shown (clarification Q2)

| Event | `keepOrder` |
|---|---|
| Home opened: selected from another tab (directly or from a menu), or the page loads on it | cleared before the request |
| Home chosen again (tab bar or menu) while it is already showing | kept |
| Vote, added choice, watch or unwatch on a card owned by Home | set |
| Refresh (manual or timed) while Home stays selected | sent as held |

While set, the Home grid is not reordered and no card leaves it except by the server's access removals (research R5).

## C4. The reason line (`pollCard.js`, `deltaClient.js`; clarification Q1)

- On Home, `listedBecause` comes from `overlay.relations` as on the personal tabs.
- Words: `invited` "You were invited", `linked` "You opened the link", `bookmarked` "You are watching", `created` "Your poll", `trending` "Trending"; `voted` shows as "You voted" on the count's line.
- Joined with " · " in relation order; follows the user's vote or watch at once (FR-005a).
- Your Polls still shows no line; no other tab receives `created` or `trending`.

## C5. The avatar menu (`src/public/app.js`)

- First item, before Edit Profile, for every signed-in user: `<a href="/?tab=home">` filled with `HOME_GLYPH` (research R11) and the label "Home" (FR-021).
- On `/` (`window.Tabs` present) a click closes the menu and calls `Tabs.select("home")` without navigating (FR-022).
- Guests have no avatar menu, so no Home item (UA3).

## C6. Styles

No new stylesheet: the tab and menu icons use the existing `.tab-icon` and `.avatar-menu-icon` rules; `m3-assets.test.ts`'s `LAYER_ORDER` is unchanged.
Both schemes are contrast-checked as the site's audit requires (SC-007).
