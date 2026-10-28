# UI Contracts: Tab Bar

What the home page shows and does, stated as behaviour the tests and the quickstart can observe.
This document **supersedes the "Tabs" section of
`specs/017-SEARCH-AND-SCALABILITY-DATABASE/contracts/ui-contracts.md`** (five tabs); every other
section of that document — held copies, floors, deltas, the Live Results, Search and personal
tabs — is unchanged and still governs. 017's file is not edited.

Client files: `index.html` (markup), `tabs.css` (style), `tabs.js` (the Newest registration).
`pollCard.css` and `app.js` are read for the glyphs they already carry.

## The bar

- Six tabs, always present, in this order left to right, with these exact labels:
  **Trending**, **Newest**, **My Private Polls**, **Favorites**, **Live Results**, **Search**.
- Identifiers are unchanged for the five existing tabs and new for the sixth:

  | Label | `data-tab` / `data-panel` | Guests | Refresh control while open |
  |---|---|---|---|
  | Trending | `trending` | allowed | as today |
  | Newest | `newest` | allowed | **disabled** |
  | My Private Polls | `private` | disabled | as today |
  | Favorites | `favourites` | disabled | as today |
  | Live Results | `live` | disabled | hidden (as today, FIX019) |
  | Search | `search` | allowed | as today |

- Trending is selected on arrival and after a browser refresh; a `?q=` arrival opens Search — both
  as today.
- Clicking any of the five pre-existing tabs behaves exactly as 017's contract says. Nothing in
  their markup changes except the label text, the position and the added icon.
- The active tab keeps today's pill: `.tab.is-active` with `--amber-tint` background and
  `--moss-dark` text. No rule of `.tab`, `.tab.is-active`, `.tab:hover` or `.tab:disabled` is
  removed or reworded; `.tab` gains `display:inline-flex; align-items:center; gap:6px`.
- On a window too narrow for six tabs, `nav.tab-bar` scrolls horizontally with its scrollbar
  hidden and no wrapping, as today; nothing is added for narrow windows.

## The icons

Each button's **first element child** is its icon:

```html
<button class="tab" type="button" data-tab="trending">
  <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">…</svg>
  Trending
</button>
```

| Tab | First child | Colour |
|---|---|---|
| Trending | `svg.tab-icon` — one `path` with `fill="currentColor"`: a curve rising left→right ending in a solid arrowhead | follows the label (muted / moss-dark when active) |
| Newest | `svg.tab-icon` — `circle` (`r="12"` — fills the box, as the avatar does; `fill="#8093a7"`) and one `path` for an italic `!` (`fill="#e8edf2"`, `transform="skewX(-12)"`) — a plain circle, no tail, in the avatar's two colours | fixed (the avatar's) |
| My Private Polls | `svg.tab-icon` with `viewBox="0 0 64 64"` — the three shapes of `avatar-default.svg`, fills `#8093a7` and `#e8edf2` | fixed (the avatar's own) |
| Favorites | `svg.tab-icon` — the `.bookmark-star` path `d` from `pollCard.js`, `fill="none" stroke="#9AA197" stroke-width="1.8" stroke-linejoin="round"` | fixed |
| Live Results | `span.tab-icon.tab-icon--live` containing `span.live-bars` with three `<i>` — the card's markup | the card's palette |
| Search | `svg.tab-icon` — `circle cx=11 cy=11 r=7` and `line 21,21 → 16.65,16.65`, `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"` — the header's | follows the label |

- Every icon has `aria-hidden="true"`; every `svg` also has `focusable="false"`. The button's
  accessible name is its text content, trimmed — exactly the label.
- `.tab-icon` is `width:16px; height:16px; flex:0 0 auto`. `.tab-icon--live` is
  `display:flex; align-items:flex-end`, so the 14px bars sit on the bottom of the 16px box.
- The Live Results bars animate through `pollCard.css`'s existing `live-bar-bounce` whenever the
  visitor is signed in, on every tab. `app.js` toggles `is-guest` on `<body>` from the session
  snapshot (`index.html` starts with it set), and `pollCard.css` has `.is-guest .live-bars i {
  animation:none }` — so for a guest the bars are still in the bar and on every card, and start
  the moment a session is adopted. `prefers-reduced-motion: reduce` stops them for everyone via the
  same stylesheet's existing rule. No animation rule is added to `tabs.css`.
- A disabled button's `opacity:.45` dims its icon with its label; nothing else changes on the icon.
- `avatar-default.svg` carries one comment stating that its shapes are copied inline in
  `index.html`.

## The rule

- `.tab-bar-wrap` is `position:relative; align-items:flex-end`, so the tab strip and the Refresh
  control both rest on its bottom edge (the strip has no bottom padding). `.tab-bar-wrap::after` is
  `content:""; position:absolute; left:50%; bottom:-7px; width:100vw; height:2px;
  background:var(--line); transform:translateX(-50%)` — the band 5–7px below the buttons and below Refresh alike.
- `.page` is `overflow-x:clip`.
- Observable: a 2px line in `--line` (#D8DCD3) from the left edge of the window to the right, its
  top edge 5px below the bottom edge of the tab buttons, at every window width; the pill and the Refresh
  control sit above it; the page has no horizontal scrollbar because of it; scrolling the tab strip
  sideways does not move it.

## The Newest tab

- `controllers.newest` is registered in `tabs.js`'s `init()` as
  `{ guestsAllowed: true, state: window.DeltaClient.createTabState(), activate() {}, refresh: null }`.
- Panel: `<section class="tab-panel" data-panel="newest" hidden><div class="card-grid"></div><p class="tab-empty" hidden></p></section>`.
- Clicking Newest as a guest or a member: the button gains `is-active`, the panel loses `hidden`,
  the other panels are hidden, `#refreshBtn` is `disabled`, the panel's `.card-grid` has no
  children and its `.tab-empty` stays `hidden` with no text. **No request** leaves the browser on
  the tab's behalf — not on the click, not on a return to the window, not on sign-in change.
- No floor, budget token or `KIND_OF` entry is involved; `PERSONAL_TABS` is unchanged.
- Nothing in this cycle defines what Newest lists; a later feature replaces the registration.

## Unchanged, and asserted so

- No route, `postman/openapi.json` entry, `config.ts` value, `ENV_*` variable, table or cache key
  changes.
- No poll card behaviour or markup changes; `pollCard.js` and `pollCard.css` are not edited.
- The header, its search box and its avatar are not edited; `site.css` and `app.js` are read only.
- Every existing browser and API test passes unchanged; none asserts on the two label strings
  that change.
