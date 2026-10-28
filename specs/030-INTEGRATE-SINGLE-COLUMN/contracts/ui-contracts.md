# UI Contracts: Integrate Single Column

There is **no HTTP, database or configuration contract change**; `postman/openapi.json` is untouched. These contracts are the page, style and script surfaces that tests and other pages rely on.

> Amended by feature 031 (2026-10-14): the tab-bar, arrow, menu and Refresh-row rules (and `--tab-hover-opacity`, `--tab-press-opacity`, `--refresh-gap`) now sit in `@media (max-width: 900px)` in `single-column-m3.css`, the tab sizing too; `#tabMenuBtn` is placed on the Refresh row, flush left, and drawn as three dots before three lines; the phone block no longer hides `.brand-logo`; the guest buttons are 21 px high there. See `specs/031-SINGLE-ROW-HEADER/contracts/ui-contracts.md` C8.

> Amended by feature 20261023-155959-PHONE-TAB-BAR (2026-10-23): the scroll arrows, the hold and the step are removed (`tabBarScroll.js` keeps the drag, now for mouse and pen, gains a mouse-wheel handler and keeps the All tabs menu); up to 900 px each tab is one line, a 16 px icon beside the label in a 48 px tab, the row has a 32 px edge fade and scrolls with the browser's own touch scrolling, smoothly when a tab is chosen, and Refresh sits under the bar at the left with the All tabs button at the right.

## C1. Style sheets and order

| Page | New link | Position |
|---|---|---|
| `index.html` | `/header-single-column-m3.css` | immediately after `/header-tab-bar-m3.css` |
| `index.html` | `/single-column-m3.css` | last, after `/pollCard-m3.css` |
| `login`, `create-account`, `profile`, `not-authorized`, `admin`, `admin-results` (`.html`) | `/header-single-column-m3.css` | in the order `LAYER_ORDER` gives, which is immediately after `/header-tab-bar-m3.css` |

`LAYER_ORDER` in `tests/m3-assets.test.ts` gains `header-single-column-m3.css` after `header-tab-bar-m3.css` and `single-column-m3.css` last. Both sheets hold no token sections, no dark twins and no literal font size (the project's M3 sheet rules); they use `var(--md-sys-…)` tokens and the tunables in C2.

## C2. Tunable custom properties (home sheet, inside the media block)

| Property | Value | Meaning |
|---|---|---|
| `--single-column` | `1` | Marker read by `pollCard.js`; set only by this sheet |
| `--tab-label-scale` | `0.9` | Tab label size, 1 = the site's 14 px |
| `--tab-label-tracking` | `-0.03em` | Tab label letter spacing |
| `--tab-pad` | `6px` | Space each side of a tab; also the underline inset |
| `--tab-hover-opacity` | `0.08` | Highlight behind arrows and menu button on hover |
| `--tab-press-opacity` | `0.2` | Highlight while pressed or held |
| `--card-gap` | `16px` | Space between poll cards |
| `--refresh-gap` | `10px` | Space above and below the Refresh button |

## C3. Tab bar markup (inside `.tab-bar-wrap`, home page)

```text
button#tabScrollBefore.tab-scroll.tab-scroll--before[type=button][aria-label="Scroll tabs left"]
div#tabBar.tab-bar                                  (existing)
button#tabScrollAfter.tab-scroll.tab-scroll--after[type=button][aria-label="Scroll tabs right"]
button#tabMenuBtn.tab-menu-btn[type=button][aria-label="All tabs"][aria-haspopup=true][aria-expanded=false][aria-controls=tabMenu]
div#tabMenu.tab-menu[role=menu][aria-label="All tabs"][hidden]
button#refreshBtn.tab-refresh.tab-refresh--icon     (existing, unchanged)
```
Arrows never carry `hidden`. They carry `aria-disabled="true"` when their side has no more tabs.

## C4. Menu item markup (built by `tabBarScroll.js`)

`button.tab-menu-item[type=button][role=menuitem][data-tab]`, with `.is-active` for the current tab and `aria-disabled="true"` for a greyed one; children: the tab's icon (cloned) and a `span` with the label.

## C5. Floating pair markup

`div#floatingActions.floating-actions[hidden]` as the last element of `<body>` before the scripts; its children are the header's own `.btn-header-ghost` and `.btn-header-primary` nodes while it is shown. The "card area" the pair stays inside is the rectangle of the visible tab panel's `.card-grid`, or of its `.maximized-card-grid` while a card is maximized (the one that is not `hidden`), read each time it is needed, so maximizing a card never sends the pair to the corner of the screen; production has one `.card-grid` per panel and no `#cardGrid`.

## C6. Search tab field markup (inside `#panel-search`, before its `.card-grid`)

```text
form#searchTabForm.search-tab-form[role=search]
  input#searchTabBox[type=search][name=q][placeholder="Search CrowdPoll"][aria-label="Search CrowdPoll"][maxlength=200]
  button#searchTabClear.header-search-clear[type=button][aria-label="Clear Search Terms"][hidden]
```
`display:none` outside the media block.

## C7. `window.SearchTab` (existing) — behavior additions

`submit(terms)` additionally writes `terms` into `#searchTabBox` and shows `#searchTabClear` when non-empty; `clear()` additionally empties the field and hides the clear button. No new public method. A `keydown` for `/` (no Alt, Ctrl or Meta; target not a text field) focuses and selects the field when it is displayed, and stops the event.

## C8. Avatar menu item

`a.avatar-menu-create-poll`, text `Create Poll`, between the Edit Profile link and the Poll Administration link. Enabled: `href="/admin"`. Disabled: `href="/admin"`, `aria-disabled="true"`, `title="You need permission to create polls"`, `aria-describedby="createPollReason"`, click handler calls `preventDefault()`; it contains a second line `span#createPollReason.avatar-menu-create-poll-reason` with the text `Needs permission to create polls`. Hidden outside the media block.

## C9. Script load order (home page)

`app.js`, `pollCard.js`, `voteClient.js`, `deltaClient.js`, `tabs.js`, `trending.js`, `newest.js`, `searchTab.js`, `liveResults.js`, **`tabBarScroll.js`**, **`floatingActions.js`**. Neither new script is on any other page. The default script list in `tests/helpers/browser.ts` is unchanged; tests name the new scripts.

## C10. Events and globals

Neither script defines a global. Each reads the DOM by the ids in C3 and C5 and returns without effect when an element is missing.
