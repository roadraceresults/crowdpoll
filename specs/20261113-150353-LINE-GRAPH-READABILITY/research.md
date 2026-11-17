# Research: Line Graph Readability

All decisions are for the browser files `src/public/lineGraph.js` and `src/public/line-graph-m3.css`. The server, the
route `GET /api/polls/:pid/line-graph` and its response are unchanged.

## R1. Where the change lives

- **Decision**: `lineGraph.js` and `line-graph-m3.css` only, plus tests and the two documentation files.
- **Rationale**: the response already carries every line of every scale; choosing what to draw, the readout and the
  highlight are presentation.
- **Alternatives considered**: a `limit` on the route (rejected: "Show all" would need a second request, and the cache
  key would grow).

## R2. The order of the lines, and the top 10

- **Finding**: the response lists the series in the poll's **choice order** (`seriesFromTally` sorts by `position`),
  not by share. The requirements report and the first draft of the spec assumed "highest current share first"; that
  was true of the screenshot's poll only because its choices were entered in that order.
- **Decision**: `showScale` orders the scale's series by their current share (the newest point), highest first, ties in choice order (a
  stable sort of the served array), and stores that as `state.data.series`. `drawnSeries()` returns the first
  `leadingCount()` of it, or all of it when `state.showAll` is true. `leadingCount()` is the series' length when
  there are `TOP_LINES = 10` or fewer; else the lines whose current shares together reach `TOP_SHARE_PCT = 80` percent of the
  sum of all the lines' current shares, with those tied with the last of them, and never more than 10 (TWEAK06).
- **Rationale**: the spec's FR-005 and FR-013 both need the share order, and it is the order of the card's result
  bars. Sorting once per draw keeps the order fixed while a time is selected (FR-005); it is re-made on a refresh,
  when the current shares themselves change.
- **Consequence**: on polls whose choice order is not their share order, the legend's order changes with this feature.
- The points are whole percentages, so a tie is an equal displayed percent; ordering by vote count would need the
  counts in the response, which is out of scope.
- **Alternatives considered**: keep choice order in the legend and use the share order only to pick the top 10
  (rejected: the ten shown would look arbitrary, and FR-005 says share order).

## R3. The readout

- **Decision**: a new row `.line-graph-readout` above the legend holds the time label `.line-graph-readout-time`
  (left) and the existing `.line-graph-total` (right, moved out of the legend). One function, `updateReadout()`, writes
  the label ("Latest", or `tooltipTimeText` of the selected bucket, renamed `readoutTimeText`) and each legend entry's
  percentage (`points[index]` of the selected bucket, or the newest point). It is called by `renderLegend`,
  `placeCrosshair` and `clearCrosshair`.
- The legend's nodes are **not rebuilt** while a time moves: only the text of `.line-graph-legend-pct` changes, so a
  focused legend button keeps focus and nothing flickers under a dragging finger.
- `positionTooltip`, `TOOLTIP_GAP`, `TOOLTIP_TOP`, `view.tooltip` and every `.line-graph-tooltip*` rule are deleted.
- **Rationale**: FR-001 to FR-004; the readout row is always present, so it never adds or removes a line.

## R4. Nothing moves when a time is selected (FR-003)

- **Decision**: the legend is a table filled column by column, each column as wide as its widest entry, in the fewest rows whose columns fit the legend's width (TWEAK13; it was one entry per row), each row 18 px tall (TWEAK01, TWEAK02, TWEAK09). `layoutLegend()` reads each entry's own width once, under `.is-measuring`, and `legendRows()` tries 1 row, then 2, and so on, summing each column's widest entry and the gaps; the first count that fits is set as `--line-graph-legend-rows` on the legend, which is a CSS grid (`grid-auto-flow:column`, `max-content` columns). It runs when the legend is rebuilt and on a resize, never when the selected time moves. (Before TWEAK01 it was a
  wrapping row of 40 px entries). Each `.line-graph-legend-pct` gets
  `min-width:4.5ch` and `font-variant-numeric:tabular-nums`, left-aligned, so an entry is as wide with "5%" as with
  "100%" and no label re-wraps as the values change. The readout row has the height of one label-large line
  whether it reads "Latest" or a time.
- **Rationale**: a legend that re-wraps would change its height and push the plot under the finger.
- **Alternatives considered**: a fixed-column grid (rejected: at phone width two 150 px columns cut labels such as
  "Jacksonville Jaguars" short, which costs more readability than it buys).
- Long labels: `overflow-wrap:anywhere` on the label and `max-width:100%` on the entry (FR-020).

## R5. The highlight

- **Decision**: `state.highlightId` (a choice id or `null`). Each legend entry is a
  `<button type="button" class="line-graph-legend-entry" data-choice-id aria-pressed>`; a click calls
  `toggleHighlight(id)`, which sets or clears the id, sets `aria-pressed` on the existing buttons, toggles the class
  `has-highlight` on the `.line-graph` root, and calls `renderSvg()` (which already keeps the selected time).
- `renderSvg` draws the highlighted polyline **after** the others with the class `is-highlighted`; markers follow the
  same order. Width and dimming are CSS:
  - `.line-graph-line.is-highlighted{ stroke-width:4 }` (the inline `stroke-width` attribute moves to the sheet as
    `.line-graph-line{ stroke-width:2 }`);
  - `.has-highlight .line-graph-line:not(.is-highlighted)` and `.has-highlight .line-graph-marker:not(.is-highlighted)`
    at `opacity:0.25`;
  - `.has-highlight .line-graph-legend-entry[aria-pressed="false"]` at `opacity:0.6`, so the dimmed entries stay
    readable: they are still the readout.
- Escape on a legend entry whose line is highlighted clears it, with `preventDefault` and `stopPropagation` (as the
  plot's Escape does); on any other entry Escape is left alone.
- `render()` clears `highlightId` when that id is not among `drawnSeries()` (spec clarification, FR-011).
- A refresh rebuilds the legend; like `renderScales`, `renderLegend` restores focus to the entry with the same choice
  id.
- No `pointerenter` or `mouseover` handler (FR-012). Nothing is written to storage (FR-019).
- **Alternatives considered**: toggling classes on the existing polylines without a redraw (rejected: bringing a line
  to the front means moving nodes anyway, and `renderSvg` is already the one place that orders them).

## R6. What keeps and what clears a selected time (FR-006, FR-007)

Today a selected time is cleared by (a) a `pointerdown` outside `.line-graph-plot` and (b) the plot's `blur`. Tapping a
legend entry does both, so it would clear the time.

- **Decision**: one helper `keepsSelection(node)` is true for a node inside the plot, the legend or the show-all
  button.
  - `onDocumentPointerDown` clears only when `!keepsSelection(event.target)`.
  - The plot's `blur` listener becomes a `focusout` listener on the `.line-graph` root: it clears when
    `!keepsSelection(event.relatedTarget)`. `state.pointerPlaced` is still reset when the plot itself loses focus.
- **Effect**: moving focus from the plot to a legend entry or the show-all button keeps the time; moving it anywhere
  else (the scale buttons, the page) clears it, as today. Spec US1 scenario 5 ("moves keyboard focus away from the
  plot") is read with that one exception, which US2 scenario 4 and FR-007 require.
- **Pinning**: a press on the plot (`pointerdown`, touch or mouse) sets `state.pinned`. `pointerleave` clears only an
  unpinned (hovered) time; while a mouse-clicked time is pinned, `pointermove` with no button held does not move it, and a
  drag (`event.buttons !== 0`) or another
  `pointerdown` does. `clearCrosshair` and a scale change reset `pinned`. This is what lets a mouse user reach the
  legend with a time selected (spec FR-021).
- **Browsers that do not focus a clicked button** (Safari) blur the plot with no `relatedTarget`: the `focusout`
  listener then keeps the time when the last `pointerdown` was inside the keep set (`state.pressedInside`).
- **Legend rebuild**: a refresh replaces the legend buttons, and a browser may fire `focusout` for the focused one
  as it is removed. The listener ignores events while `state.rebuildingLegend` is true, so the time is kept.

## R7. The show-all button

- **Decision**: `<button type="button" class="line-graph-show-all">` in the row of the scale buttons under the plot, at its left end, the scale buttons centered (TWEAK10, TWEAK11, TWEAK12; it was under the subtitle, and first after the legend), an M3 outlined button (TWEAK04; it was a text button)
  (label-large, `--md-sys-color-primary`, state layer, ripple registered with `M3Ripple`). `renderShowAll()` hides it
  when the series holds 10 lines or fewer, else sets its text to `Show all N choices` or `Show top M choices` (M = `leadingCount()`). A click flips
  `state.showAll` and calls `render()`.
- `state.showAll` starts `false` in `mount` (a new state object per mount), and is otherwise never reset (FR-016).
- **Rationale**: above the legend it keeps its place when the legend grows or shrinks; pressing it changes the
  legend's height, which is expected because the viewer asked for it.

## R8. What follows the drawn set

`drawnSeries()` replaces `state.data.series` in: the legend, the polylines, the markers, `axisTopFor` (the Y axis is
already derived from the drawn lines), and `announce` (the live region reads the drawn lines).

## R9. Tests

- `tests/line-graph-ui.test.ts`: the tooltip assertions become readout assertions (time label, legend percentages);
  the tooltip-position test is removed with the code; the legend entry assertions follow the `<button>` markup. The
  3-choice fixtures keep their order under R2 (50, 25, 25 is already descending and the sort is stable).
- New `tests/line-graph-many-lines.test.ts` (jsdom, same harness): a 12-choice poll for the top 10, the button, the
  share order, the highlight, and the keep/clear rules of R6.
- jsdom does no layout, so R4 (nothing moves) and the 360 px checks are in the manual quickstart.

## R10. Documentation

- `ARCHITECTURE.md`: the line-graph paragraph (the "rich tooltip" sentence) is rewritten for the readout, highlight
  and top 10.
- `README.md`: the "Vote history graph" bullet gains the readout, the highlight and "Show all".
- `CLAUDE.md`: the SPECKIT block points at this plan.
