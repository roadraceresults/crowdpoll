# Research: Phone Tab Bar

Each decision was taken after reading the code it changes: `src/public/index.html` (the `.tab-bar-wrap` markup),
`tabs.js` (selection, keyboard, `updateOverflowFades`), `tabBarScroll.js` (arrows, drag, All tabs menu),
`header-tab-bar-m3.css` (the M3 tab look and the edge masks), `single-column-m3.css` (the phone and 900 px blocks),
`header-fixed-m3.css` (the pinned wrap), `fixedChrome.js`, and the tests that pin them.

## R1. Where the phone tab bar rules live

**Decision**: one `@media (max-width: 900px)` block in `single-column-m3.css` holds every phone tab bar rule. The
tab rules repeated in the `639.98px` phone block (`--tab-label-scale`, `--tab-label-tracking`, `--tab-pad`, the
`#tabBar .tab` font size and sizing, the `is-active::after` inset, and `mask-image: none !important`) are removed from
it; the first 900 px block (the same five tab rules) and the third (arrows, menu, Refresh row) become one block. The
900 px block about the card question's font size is not a tab bar rule and is left alone.

`:root{ --tab-label-scale:0.9; }` stays in the 900 px block: `header-tab-bar-m3.css` sizes the avatar menu's items by
it (`var(--tab-label-scale, 1)`) and the All tabs menu items use it too, and neither may change (FR-013, FR-015).
`--tab-label-tracking` and `--tab-pad` have no other reader and go.

**Rationale**: the requirements make 640–900 px and under 640 px the same design, so the second copy is pure
duplication (requirements report, Technical Debt), and the rules change anyway, which is the one time Principle III
lets a file's duplication be removed.

**Alternatives considered**: keeping both blocks and changing both (two copies to keep equal); moving the rules to
`header-tab-bar-m3.css` (that layer is on all seven pages; the phone rules belong to the home page's layer, as
feature 030 decided).

## R2. The edge fade

**Decision**: the three mask rules in `header-tab-bar-m3.css` (`.tab-bar-wrap.has-tabs-before #tabBar`, `…after`,
both) keep their shape and take their width from `var(--tab-fade, 24px)` instead of the literal `24px`; the 900 px
block sets `:root{ --tab-fade:32px; }`. The `#tabBar{ mask-image:none !important; }` rule goes, so the fade shows
at every width up to 900 px. `#tabBar`'s `scroll-padding` becomes `0 var(--tab-fade)` in the same block, so a
tab scrolled into view lands clear of the fade instead of half under it.

The classes themselves are unchanged: `tabs.js`'s `updateOverflowFades` already toggles `has-tabs-before` /
`has-tabs-after` on `.tab-bar-wrap` on scroll and resize, and the state diagram in the requirements report
(start / middle / end / fits) is exactly what it computes.

**Rationale**: above 900 px the mask keeps its 24 px, so the desktop bar is unchanged (FR-014); the mask is already
drawn by the compositor, so it costs nothing while the row scrolls (AM2). A transparency mask shows the page's own
background, so dark mode needs no second colour.

**Alternatives considered**: `backdrop-filter: blur` strips (rejected by the requirements review, AM2);
pseudo-element gradients painted over the tabs (need a colour per scheme and sit over the tabs' hit area).

## R3. The one-line tab

**Decision**: in the 900 px block, `#tabBar .tab{ flex-direction:row; min-width:0; height:48px; gap:6px; padding:0 12px; }`
and `#tabBar .tab .tab-icon{ width:16px; height:16px; }`. Nothing else is set: the label's 14 px
(`--md-sys-typescale-title-small-size`) and its normal tracking come from `.tab-bar .tab` in
`header-tab-bar-m3.css` once the 0.9 scale and the `-0.03em` override are gone; the base `.tab-bar .tab` is already
`display:inline-flex; align-items:center` (`tabs.css`), which centres icon and label vertically; the active underline is
already inset 12 px by `#tabBar .tab.is-active::after{ left:12px; right:12px; }` in the base, so the phone override is dropped.

The Live Results icon is the card's `.live-bars` (about 14 px tall) in a `.tab-icon--live` box aligned to the bottom;
it fits the 16 px box. The other icons are SVGs with a `viewBox`, so they scale.

**Rationale**: 48 px is Material 3's height for one-line tabs and the touch target the spec asks for (UA4); the fewer
overrides, the fewer rules the sheet test must pin.

**Alternatives considered**: a separate markup for the phone (two tab lists to keep in step); keeping the 0.9 label
scale (the requirements ask for 14 px at normal spacing).

**Amended by TWEAKS02 (2026-10-24)**: the header and the wrap share `header-fixed-m3.css`'s `padding-inline`, so the
first tab's box starts under the logo's box, but its icon sat one tab padding to the right. `#tabBar` now carries
`margin-left:-12px` in the 900 px block and `margin-left:-16px` in `header-tab-bar-m3.css`, each the tab's side
padding, so the first tab's content starts under the logo at every width; the left fade begins inside the wrap's
padding, which the scripts never read. `padding-left:0` on the first tab alone was rejected: it would make that tab
asymmetric (state layer, ripple, underline).

**Amended by TWEAKS03 (2026-10-24)**: the rule is now `#tabBar .tab{ flex-direction:row; width:min-content; min-width:0;
height:auto; min-height:48px; gap:6px; padding:0 12px; white-space:normal; }`. Each label is a bare text node, an
anonymous item of the button's row flex layout, so `width:min-content` sizes the tab to its icon, the gap and its longest
word and the label wraps to that width; `white-space:normal` lifts `tabs.css`'s `nowrap`; `height:auto` with the
`min-height` lets a tab grow with its lines, and `.tab-bar{ align-items:stretch }` gives every tab the tallest one's
height. The button's own `text-align:center` centres the lines. Measured in headless Edge with the page's sheets and
fonts: the row goes from 891 px to 736 px (Your Polls 110 → 78, Shared With You 151 → 91, Your Votes 115 → 83,
Live Results 123 → 93) and from 48 px to 60 px tall, Shared With You taking three lines. A trial: `height:48px` back in
place of the three new declarations restores the one-line tab.

**Amended by TWEAKS04 (2026-10-24)**: the label is `--md-sys-typescale-label-medium-size` on
`--md-sys-typescale-label-medium-line-height` (12 px on 16 px lines, Material 3's label pair below title-small; an M3
layer carries no literal size) and the padding `2px 12px`, so the row measures 684 px wide and 52 px tall (three 16 px
lines plus 2 px above and below). The 0.9 scale of title-small (12.6 px on 18 px lines) was rejected: its lines keep the
row at 58 px.

**Amended by TWEAKS05 (2026-10-24)**: the label takes the four label-small tokens (11 px on 16 px lines, weight 500,
0.5 px tracking), the gap is 5 px and the padding `2px 11px 2px 12px`; the underline keeps spanning icon and label with
`#tabBar .tab.is-active::after{ right:11px; }` beside the base rule's 12 px insets. Measured: the row is 662 px wide and
still 52 px tall, label-small sharing label-medium's 16 px lines. The header's padding above is 3 px.

**Amended by TWEAKS06 (2026-10-24)**: `gap:2px; padding:0px 10px 2px 0px;`, the developer's trial. Two things hung off
the left padding and move with it: the active underline is now `#tabBar .tab.is-active::after{ left:0; right:10px; }`,
so it runs from the icon's left edge to the label's right edge, and the 900 px block's `#tabBar` margin is `0` (the
base `-16px` stays above 900 px), so the first icon still starts under the logo. Measured: the row is 534 px wide and
every tab 48 px tall, the three label-small lines (12 px each in the working copy's tokens) fitting the minimum.

**Amended by TWEAKS07 (2026-10-24)**: `text-align:left` on the tab (a button centres its text), and at most two lines
per label. The tab is as wide as its longest word, so a three-word label took three lines; CSS cannot ask for "at most two
lines" with whole words, so `index.html` writes `Shared With&nbsp;You` and the label wraps as Shared / With You, the
narrowest two-line layout (75.7 px against 65.6 on three lines). The no-break space reads as a space in the All tabs menu
and the accessible name; `tests/client-home.test.ts` normalises it before comparing labels. Measured: the row is 545 px
wide, every tab 48 px tall.

## R4. Smooth scrolling

**Decision**: CSS, not script. In the 900 px block `#tabBar{ scroll-behavior:smooth; }`, with
`#tabBar.is-dragging{ scroll-behavior:auto; }` so a mouse drag follows the pointer, and
`@media (prefers-reduced-motion: reduce){ #tabBar{ scroll-behavior:auto; } }` so every move is instant (FR-009).

- **Tap and menu**: `tabs.js`'s `setActiveButton` already calls `scrollIntoView({ inline: "nearest", block: "nearest" })`
  on the selected tab, which honours the element's `scroll-behavior`; nothing changes there. The All tabs menu's own
  `scrollIntoView` in `chooseMenuItem` is removed: it duplicates the one `select()` makes through `tab.click()`.
- **Keyboard**: `moveTabFocus` focuses the next tab with `{ preventScroll: true }` and then calls the same
  `scrollIntoView`, so the keyboard takes the same smooth path as a tap instead of the browser's instant focus scroll
  (FR-012 keeps the keys and their order; only the scroll's motion changes).
- **Page load**: `select()` runs at start-up and the same `scrollIntoView` brings the initial tab into view (FR-008).
- **Touch**: no script; the browser's own momentum scrolling (R5).

**Rationale**: one declaration covers every programmatic scroll on the phone and leaves the desktop untouched (FR-014);
reduced motion is a media query, not a `matchMedia` check in two scripts; the drag exception reuses the `is-dragging`
class `tabBarScroll.js` already sets.

**Alternatives considered**: `behavior: "smooth"` passed at each call site with a `prefersReducedMotion()` check in
`tabs.js` (more code, applies at every width); `scroll-snap-type` (the requirements want the row to stop where the
finger leaves it, UA2).

## R5. Native touch scrolling

**Decision**: the browser scrolls the row for a finger. `tabBarScroll.js`'s drag already returns for any pointer that
is not a mouse; it now returns only for `pointerType === "touch"`, so a mouse and a pen drag the row (FR-010) and a
finger never reaches the script. `#tabBar{ touch-action:pan-x; overscroll-behavior-x:contain; }` stay as they are:
the first lets the browser pan the row, the second keeps a swipe past the end from turning into a back gesture.

**Rationale**: the hand-written drag was only ever for the mouse; the browser's touch scrolling has momentum and
respects the user's settings (UA2).

**Alternatives considered**: keeping a script drag for touch (the Technical Debt item the report names).

## R6. The mouse wheel

**Decision**: `tabBarScroll.js` listens to `wheel` on `#tabBar` (not passive, so it can prevent the default). When
`window.matchMedia("(max-width: 900px)").matches` and the event has a vertical delta and no horizontal one, it adds
`deltaY` to a running target — the previous tick's target while one is pending, else `scrollLeft` — clamped to the row's
range; when the clamped target differs from where it started (the row can still move that way) it calls
`preventDefault()` and writes the target to `scrollLeft`; otherwise it does nothing and the page scrolls (FR-011). The
target is cleared on `scrollend` and when a drag begins. The row's `scroll-behavior:smooth` (R4) animates every
`scrollLeft` write, so a tick that read `scrollLeft` would see a position still in flight and a quick series of ticks
would move the row less than their sum; the running target keeps every tick. A horizontal delta (a trackpad swipe) is
already scrolled by the browser.

The jsdom helper's `matchMedia` answers the 900 px query like the phone query, so the test can switch it.

**Rationale**: a narrow desktop window or a tablet with a mouse has no arrows left; the wheel is the one control such a
visitor has besides the drag (UA3). The width check keeps the desktop bar exactly as it is (FR-014).

**Alternatives considered**: no gate (the row can overflow slightly just above 900 px, where the desktop design is
meant to stay unchanged); a `scrollBy` call (`jsdom` has no element `scrollBy`, and the tests stub `scrollLeft`); an
instant write per tick by toggling `is-dragging` around it (the wheel would jump where a tap glides).

## R7. Removing the arrows

**Decision**: the two `<button class="tab-scroll">` elements leave `index.html`; `.tab-scroll` leaves the hide list at
the top of `single-column-m3.css` and its rules leave the 900 px block; in `tabBarScroll.js` the step, hold and settle
code goes (the `STEP_*`, `HOLD_*` and `SETTLE_MS` constants, `animateScroll`, `easeInOut`, `tabEdges`, `stepTarget`,
`nearestTabEdge`, `updateArrowStates`, `onBarScrolled`, the hold loop, `bindArrow`, the `lastWritten` tracking and
the `load`, `resize` and `scroll` listeners that served them), together with the two arrow ids in the start-up guard.
What stays: the drag (R5), the All tabs menu, the click swallow after a drag, and the new wheel handler (R6). The file
keeps its name: it still scrolls the tab bar, by drag and wheel.

The feature 030 and 031 documents that describe the arrows (030's `spec.md`, `plan.md`, `research.md` R5–R7,
`quickstart.md`, `tasks.md` and `contracts/ui-contracts.md`; 031's `spec.md`, `quickstart.md`, `fix.md` and
`contracts/ui-contracts.md`) each get a one-line "Amended by feature 20261023-155959-PHONE-TAB-BAR" note, as 031 did
to 030.

**Rationale**: the requirements remove the arrows at every phone width; with the arrows gone, only `tabs.js`'s fade
classes measure the edges (the report's second Technical Debt item).

## R8. Swapping the buttons under the bar

**Decision**: positions only, in the 900 px block: `.tab-bar-wrap .tab-refresh--icon{ left:0; }` instead of
`right:0`, `.tab-menu-btn{ right:0; }` instead of `left:0`, and the menu anchored under its button with
`.tab-menu{ right:0; }` instead of `left:0`. The markup order, the ids, the icons, the `::before` highlight, the
`margin-bottom` that reserves the row and `header-fixed-m3.css`'s `::before` that paints its background are unchanged;
`[data-active="live"]` still hides Refresh on Live Results.

**Rationale**: both buttons are absolutely positioned under the wrap, so a swap is three property changes (UA1).

**Amended by TWEAKS01 (2026-10-24)**: `left:0` / `right:0` are the wrap's padding box, so the buttons touched the
viewport while the cards start at the container's padding and, below 640 px, are centred at 420 px. The three
positions now read `var(--tab-edge)`: `20px` in the 900 px block and, in a nested 639.98 px query,
`max(14px, calc((100% - 420px) / 2))`. The percentage resolves against the wrap, which is as wide as the
container, so the edge is the card column's whether or not a card is shown; between 640 and 900 px the grid's
`minmax(268px, 1fr)` cells never exceed 420 px, so the outer cards sit at the 20 px padding. A script measuring a
card was rejected: it needs a card to measure and a fallback when there is none.

**Amended by TWEAKS04 (2026-10-24)**: feature 032's `floatingActions.js` docked a guest's Log In / Create Account pair
8 px to the left of Refresh, which was then at the right; with Refresh at the left edge the pair started off screen, and
only the rounded end of its last button showed at the edge of the Refresh row. `dockPosition()` now docks it 8 px to the
right of Refresh (`box.right + FLOAT_ROW_GAP`), centred on it as before; at 390 px it fits between Refresh and the All
tabs button. The drag, the card-area clamp and the return on resize are unchanged.

## R9. The pinned chrome

**Decision**: nothing to change. `fixedChrome.js` measures `.tab-bar-wrap` with a `ResizeObserver` and writes
`--fixed-chrome-height`, so the tabs going from 56 px to 48 px moves the page's reserved space by itself.

## R10. Tests

**Decision**:

- `tests/client-tab-bar-scroll.test.ts`: the `tab bar arrows` and `holding an arrow` groups go; the drag group gains a
  pen drag and keeps the touch case; new groups for the wheel (scrolls the row while it can move and prevents the
  page scroll; lets the page scroll at the end; does nothing above 900 px) and for the menu's removed `scrollIntoView`
  (a chosen item reaches the tab's `click()` only).
- `tests/single-column-sheets.test.ts`: the tab bar and Refresh row groups pin the new rules (one 900 px block for the
  bar, `--tab-fade:32px`, the 48 px row tab, 16 px icons, `scroll-behavior`, the swapped positions) and that the phone
  block holds no tab rule; `split()` accepts the remaining 900 px blocks.
- `tests/client-tabs-026.test.ts`: the keyboard test also checks the focused tab is scrolled into view; its
  `header-tab-bar-m3.css` assertions on the 64 px stacked tab and 24 px icon still hold (the base is unchanged).
- A sheet assertion that `header-tab-bar-m3.css`'s masks read `var(--tab-fade, 24px)`.
- Unchanged: `tab-bar-assets` (the production `tabs.css` already says 16 px), `pages` and `m3-assets` (the script list
  keeps `tabBarScroll.js`), every `#refreshBtn` click in the home tests.

**Rationale**: the breaking changes the requirements report lists are exactly these files; the stubbed home helper
already fakes the row's geometry, so the wheel and drag are tested the way the arrows were.
