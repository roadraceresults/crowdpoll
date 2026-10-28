# UI Contracts: Phone Tab Bar

All contracts apply to the home page (`index.html`) at widths up to 900 px unless stated. Above 900 px the bar is
exactly as before this feature (FR-014).

## C1. The tab

- In a row: a 16 px icon, a 2 px gap, an 11 px label on the label-small line height at weight 500 and 0.5 px tracking
  (the four `--md-sys-typescale-label-small-*` tokens, TWEAKS05, TWEAKS06), both vertically centred.
- The label wraps to its longest word (`width:min-content; white-space:normal`) on at most two lines (`index.html` writes
  `Shared With&nbsp;You`, so it wraps as Shared / With You), its lines left-aligned (`text-align:left`, TWEAKS07), so the
  tab is as wide as its icon, the gap and that word or pair; no padding above or at the left, 2 px below and 10 px at the right (TWEAKS06), no
  minimum width (TWEAKS03).
- At least 48 px tall (`height:auto; min-height:48px`) and, through the row's `align-items:stretch`, as tall as the
  tallest tab: 48 px, Shared With You's three label-small lines fitting the minimum (TWEAKS03 to TWEAKS06).
- The active tab: label in `--md-sys-color-primary` and a 3 px underline in the same colour, flush with the tab's left edge
  and inset 10 px at the right, the tab's padding (`#tabBar .tab.is-active::after{ left:0; right:10px; }`, TWEAKS06), so
  it spans the icon and the label.
- A guest's personal tabs stay greyed (`aria-disabled="true"`) and still lead to `/login` when tapped.
- Icons, names, order and `data-tab` values are unchanged.

## C2. The row

- No scroll arrows: `#tabScrollBefore` and `#tabScrollAfter` do not exist.
- At an edge where tabs wait, the last 32 px of the row fade from opaque to transparent (`--tab-fade:32px`); the fade
  follows `.tab-bar-wrap`'s `has-tabs-before` / `has-tabs-after` classes, updated on scroll and resize. No fade at an
  edge with nothing beyond it; none when every tab fits.
- The row scrolls with the browser's own touch scrolling (`touch-action:pan-x`), with momentum, no snapping; a swipe
  past the end does not become a browser gesture (`overscroll-behavior-x:contain`).
- `scroll-behavior:smooth`, so every programmatic scroll (a chosen tab coming into view) glides; `auto` while
  `.is-dragging` and under `prefers-reduced-motion: reduce`.
- `scroll-padding:0 var(--tab-fade)`, so a tab scrolled into view stops clear of the fade.
- Above 900 px the bar starts one tab padding left of the wrap's content edge (`#tabBar{ margin-left:-16px; }` in the
  base rule); up to 900 px the tab has no left padding, so the 900 px block sets `margin-left:0`. Either way the first
  tab's icon, label and underline begin under the left edge of the header's logo (TWEAKS02, TWEAKS06).

## C3. Choosing a tab

- A tap, Enter or Space on a focused tab, or an All tabs menu item selects the tab as today, and `tabs.js` scrolls it
  fully into view (`scrollIntoView`, `inline: "nearest"`), smoothly on the phone.
- Arrow keys, Home and End move focus between tabs as today; the newly focused tab is scrolled into view the same way
  (focus with `preventScroll`, then `scrollIntoView`).
- At page load the selected tab is scrolled into view by the same call.

## C4. Mouse, pen and wheel

- A mouse or pen pressed on the row and moved more than 5 px drags it (`#tabBar.is-dragging`, `cursor:grabbing`); the
  click that ends such a drag does not select a tab. A smaller movement is a click.
- A vertical wheel over the row, while the row can still move in that direction and the width is 900 px or less,
  scrolls the row sideways by the wheel's delta and prevents the page from scrolling; otherwise the page scrolls as
  usual. Each tick is added to the previous tick's target (cleared when the row comes to rest or a drag begins), so a
  quick series of ticks lands in full while the row glides. A horizontal wheel or trackpad swipe is left to the browser.
- A touch pointer is ignored by the script.

## C5. Under the bar

- Refresh (`#refreshBtn`, 30 px, icon 20 px) sits under the row at the **left** (`left:var(--tab-edge); top:calc(100% + 5px)`).
- The All tabs menu button (`#tabMenuBtn`, 40 px) sits under the row at the **right** (`right:var(--tab-edge); top:100%`);
  its menu (`#tabMenu`) opens below it, right-aligned (`right:var(--tab-edge); top:calc(100% + 40px)`).
- A More item (`#tabMoreBtn`, `.tab-more`, `aria-label="More"`, a vertical three-dot icon over the label `More`) is the last
  child of `#tabBar`, after Search, so it scrolls with the tabs. It is shown only up to 900 px, looks like a phone tab
  (C2), and is not a tab: no `.tab` class, no `role="tab"`, never active, not listed in the menu. It opens the same
  `#tabMenu` as the All tabs button, which stays (TWEAKS17).
  Its icon is the Newest icon's filled `#8093a7` circle with three `#e8edf2` dots, 16 px like the other phone tab icons
  (TWEAKS18).
- `--tab-edge` is the card column's edge, set in the 900 px block: `20px`, the container's side padding, and below
  640 px `max(14px, calc((100% - 420px) / 2))`, the 14 px padding or the inset of the centred 420 px card
  (`pollCard.css` `.card-viewport`), so each button's box is flush with the cards and its glyph 5 px inside, with
  or without a card in the tab (TWEAKS01).
- Both keep their ids, icons, accessible names, highlight and behaviour; Refresh is hidden on Live Results
  (`[data-active="live"]`) as today. The wrap keeps `margin-bottom:calc(40px + var(--refresh-gap))` to make room for them.
- A guest's floating Log In / Create Account pair (`floatingActions.js`, feature 032) docks in the row 8 px to the right of
  Refresh, centred on it; the rest of its behaviour is 032's (TWEAKS04).
- Below 640 px the header has `padding-top:3px` (`header-single-column-m3.css`), which `fixedChrome.js` measures, so the
  bar and the page move down 3 px (TWEAKS04, TWEAKS05).

## C6. Stylesheets

- `single-column-m3.css`: the `639.98px` phone block holds no tab bar rule; one `@media (max-width: 900px)` block
  holds every phone tab bar rule (C1, C2, C4's cursor rules, C5). The card question's 900 px block is unchanged.
- `header-tab-bar-m3.css`: the three edge masks read their width from `var(--tab-fade, 24px)`; nothing else changes,
  so the desktop keeps 64 px stacked tabs, 24 px icons and a 24 px fade.
- No layer is added or reordered; the `m3-assets` layer list is unchanged.

## C7. Scripts

- `tabBarScroll.js` keeps its name and its place in the script list; it returns at once when `#tabBar`, `#tabMenuBtn`
  or `#tabMenu` is missing; it holds the drag, the wheel and the All tabs menu, and nothing about arrows.
  `#tabMoreBtn`, when present, is a second opener of the menu: `aria-expanded` is `true` on the opener used only, and
  Escape or a chosen item returns focus to it; a tap on either opener is not an outside tap (TWEAKS17).
- `tabs.js` changes in `moveTabFocus` only (C3).
