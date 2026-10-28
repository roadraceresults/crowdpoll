# UI Contracts: Single Row Header

> Amended by feature 20261023-155959-PHONE-TAB-BAR (2026-10-23): the scroll arrows, the hold and the step are removed (`tabBarScroll.js` keeps the drag, now for mouse and pen, gains a mouse-wheel handler and keeps the All tabs menu); up to 900 px each tab is one line, a 16 px icon beside the label in a 48 px tab, the row has a 32 px edge fade and scrolls with the browser's own touch scrolling, smoothly when a tab is chosen, and Refresh sits under the bar at the left with the All tabs button at the right.

There is **no HTTP, database or configuration contract change**; `postman/openapi.json` is untouched. These contracts are the page, style and script surfaces that tests and other pages rely on.

## C1. Style sheets and order

| Page | New link | Position |
|---|---|---|
| all seven pages that have the header (`index`, `login`, `create-account`, `profile`, `not-authorized`, `admin`, `admin-results` `.html`) | `/header-single-row-m3.css` | immediately after `/header-single-column-m3.css` |

`LAYER_ORDER` in `tests/m3-assets.test.ts` gains `header-single-row-m3.css` after `header-single-column-m3.css`, and each page's layer list gains it. The sheet holds no token sections, no dark twins and no literal font size.

## C2. Custom property (inside the wide-range query, on `.site-header`)

| Property | Value | Meaning |
|---|---|---|
| `--header-search-min-width` | `200px` | The narrowest the header search box shrinks to before the `no-search` step hides it |

## C3. Header layout (new sheet, inside `@media not all and (max-width: 639.98px)`)

| Selector | Rule |
|---|---|
| `.site-header` | `flex-wrap:nowrap; min-height:56px` |
| `.site-header > *` | `flex-shrink:0` |
| `.site-header > .header-search` | `flex:1 1 auto; min-width:var(--header-search-min-width); order:0; margin-top:0` (higher specificity than the children rule above; also repeated inside the 767.98 px query) |
| `.header-nav-link, .header-user` | `white-space:nowrap` |
| `.header-nav` | `margin-left:auto` (FIX09): after the search box has taken the free space up to its maximum, the rest pushes the Create Poll link against the user area |

All of C3 sits inside the wide-range query, so below 640 px the header is exactly as feature 030 left it: no `nowrap`, no `min-height`, 24 px buttons and an 8 px bottom margin.

## C4. Steps (new sheet, inside `@media not all and (max-width: 639.98px)`)

| Selector | Rule |
|---|---|
| `html[data-header-fit~="no-name"] #header-username` | `display:none` |
| `html[data-header-fit~="no-search"] .header-search` | `display:none` |

## C5. Search tab field (`single-column-m3.css`)

| Selector | Rule |
|---|---|
| `.search-tab-form` | `display:none` by default; the field's look (row, height 40 px, border, input) outside any media query |
| `.search-tab-form` in the phone query | `display:flex` (as in 030) |
| `html[data-header-fit~="no-search"] .search-tab-form` | `display:flex` |

## C6. `headerFit.js`

- Loaded with `defer` after `app.js`, on all seven pages. Returns at once if `#site-header` is missing.
- Guards `matchMedia` and `ResizeObserver` the way `m3-ripple.js` and `floatingActions.js` do.
- Writes only `data-header-fit` on `document.documentElement`, and (while `no-search` is set) the value of `#searchTabBox` and, through `window.SiteSearch.set`, the header box.
- Exposes nothing on `window`.

## C7. Behavior

1. Measurement starts from no tokens and applies, in order, `no-name`, `no-search`, re-measuring after each and stopping as soon as the row fits. `app.js` renders the Create Poll link only for a user who may create polls (FIX07), so no step hides it.
2. On a phone (`max-width: 639.98px`) the attribute is removed.
3. Triggers: header resize, header or one of its direct children changing size (a text-size change), header children replaced, fonts ready, the phone query changing; coalesced to one frame.
4. Entering `no-search` copies the header box's terms into the Search tab field; while it is set, typing in the field is copied to the header box.

## C8. Tab sizing from 900 px and the Create Poll icon

`single-column-m3.css` ends with `@media (max-width: 900px)` holding only the five tab rules of the phone block, with the same values (FIX02). `header-tab-bar-m3.css` styles `.header-nav-icon`, the SVG that `app.js` puts first in the Create Poll link (FIX01).

`single-column-m3.css` also ends with a second `@media (max-width: 900px)` block (FIX03, widened from 768 px by FIX04): the tab-bar wrap and scroll rules, the arrows, the all-tabs button and menu, the Refresh row and the highlight variables moved out of the phone block. `#tabMenuBtn` is absolute at `left:0` under the row, `#tabMenu` opens from `left:0` below it, and the Live Results override of the row's room is gone. `index.html`'s all-tabs icon is three circles before three lines (`viewBox="0 0 30 24"`). The edge fades of `header-tab-bar-m3.css` are turned off only in the phone block, so from 640 to 900 px they stay beside the arrows. From 900 px down the guest buttons (`.btn-header-ghost`, `.btn-header-primary` inside `.header-actions` or `.floating-actions`) are sized like the card's Vote button (FIX05): a nested `@media (max-width: 900px)` rule in `header-single-row-m3.css` (32 px, 16 px side padding, Label Large size) and one rule in `header-single-column-m3.css` (21 px, three quarters of the size). Feature 030's statement that the arrows and menu exist only below 640 px no longer holds.

## C9. Not changed

`app.js` (apart from the Create Poll link and its icon), `searchTab.js`, `tabBarScroll.js`, `floatingActions.js`, every production stylesheet, every route, `postman/openapi.json`, the server and the database.
