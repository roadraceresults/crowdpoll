# Research: Line Graph Material 3

**Feature**: `20261028-183546-LINE-GRAPH-M3` · **Spec**: [spec.md](spec.md) · **Date**: 2026-10-28

Every decision below is client-side; the server, the route, the data and the configuration are untouched (FR-020).

## R1. Where the contrast shade is computed

- **Decision**: one new function on the existing `window.PollCard` export in `src/public/pollCard.js`,
  `lineColorOn(hex, surfaceHex)`, built from the helpers already there (`hexToHsl`, `hslToHex`, `contrastRatio`).
  `lineGraph.js` calls it for every choice on every draw.
- **Rationale**: the helpers exist once, in the file that owns the bar colours; `pollCard.js` loads before
  `lineGraph.js` (`index.html` script order), so the export is ready at mount. Exporting one function adds no module
  and copies no code.
- **Alternatives considered**: copying the helpers into `lineGraph.js` (two copies of the WCAG maths to keep in
  step); a new shared `colorMath.js` (a new script on `index.html` and in `m3-assets.test.ts`'s allowlist, for one
  caller); computing shades on the server (the server does not know the viewer's theme).

## R2. The shading rule ("nearest shade of itself that reaches 3:1")

- **Decision**: keep the colour's HSL hue and saturation and step its lightness from its own value by 0.01 —
  toward 1 when the surface is dark, toward 0 when it is light — until `contrastRatio(shade, surface) >= 3`, stopping
  at 0 or 1 (pure black or white for a grey). A colour already at 3:1 is returned unchanged (upper-cased as given).
- **Rationale**: the same lightness walk `darkShadeOf` and `lightShadeFor` already use for bar ink, so the result
  keeps the bar's hue (FR-001, FR-002); starting from the colour's own lightness gives the *nearest* passing shade.
  Measured on today's palettes (24 distinct colours, light `#FFFFFF`, dark `#0F1511`): 17 of 48 pairs are shaded,
  31 are unchanged, every result reaches 3:1 (3.01–3.15) and no hue moves more than 0.3°.
  Examples: dark `#000000`, `#404040`, `#545454` → `#636363`; `#880015` → `#C7001F`; `#0808FD` → `#4444FD`;
  light `#FFFF00` → `#999900`; `#E0E0E0`, `#9E9E9E` → `#949494`; `#FC8E45` → `#F66404`.
  Greys meet at one shade, so two grey choices on one poll can draw the same line colour in one theme; they stay
  told apart by their legend labels and tooltip rows (the spec's edge case), and the bars are unchanged.
- **Alternatives considered**: mixing toward white or black (RGB mix shifts hue less predictably for saturated
  blues and loses saturation faster); a fixed per-theme lookup table (would not cover a manual colour that is
  stored on a poll but no longer in the palette).

## R3. How the graph knows its surface and theme

- **Decision**: at each draw, read the computed `background-color` of the graph's container
  (`.maximized-space-right`, painted `--md-sys-color-surface`) and convert it to hex. When it is not an opaque
  `rgb()` colour, no shade is applied. A `matchMedia("(prefers-color-scheme: dark)")` `change` listener, added at
  mount and removed at unmount, redraws the graph (User Story 1, scenario 4).
- **Rationale**: the stylesheet stays the single source of the surface colour — no hex is copied into script; the
  same code is right under `prefers-color-scheme` and under a `data-theme` override. On `index.html` the theme
  follows the device setting only, so the media query is the one thing that can change it while the graph is open.
- **Alternatives considered**: hard-coding `#FFFFFF`/`#0F1511` in `lineGraph.js` (a second copy of two tokens);
  reading the `--md-sys-color-surface` custom property (the panel's actual paint is what the line is drawn over).

## R4. The scale selector as an M3 segmented button

- **Decision**: `div.line-graph-scales[role=group][aria-label="Time scale"]` holding one
  `button.line-graph-segment[aria-pressed]` per available scale; the selected one carries an inline SVG check icon
  (`.line-graph-segment-icon`, `aria-hidden`). Sizes from M3's segmented-button spec: 40 px high, 1 px `outline`
  border shared between segments, full-pill outer corners (`--md-sys-shape-corner-full`), selected fill
  `secondary-container` with `on-secondary-container` text, unselected `on-surface`, `label-large` type, 12 px side
  padding, 8 px between icon and label. State layers by `::before` at the token opacities, as `pollCard-m3.css`
  does; the press ripple by `window.M3Ripple?.add(".line-graph-segment")`. Roving `tabindex` (the selected segment is
  `0`, the others `-1`); Left/Right move focus with wrap-around, Enter/Space are the button's own click (FR-015).
- **Rationale**: [M3 segmented buttons](https://m3.material.io/components/segmented-buttons/specs) are the component
  for picking one of two to five options; `aria-pressed` is already what the tests and screen readers read. A group
  with roving focus is one Tab stop, as WAI-ARIA's toolbar pattern recommends.
- **Alternatives considered**: `role=radiogroup` with radios (changes the announced semantics and the existing
  `aria-pressed` contract for no gain); M3 filter chips (meant for multi-select filters).

## R5. The tooltip as an M3 rich tooltip, kept inside the plot

- **Decision**: `.line-graph-tooltip` restyled: `surface-container` background, `--md-sys-elevation-2` shadow,
  `--md-sys-shape-corner-medium`, no border, 12 px × 16 px padding, the time in `title-small`
  (`.line-graph-tooltip-time`), rows in `body-medium`. Placement in script: `left = x + 12 px` (to the right of the
  crosshair); when that would pass the plot's right edge, `left = x − 12 px − width`; when neither fits, clamped to
  `[0, plotWidth − width]`. No `translateX(-50%)`.
- **Rationale**: [M3 rich tooltips](https://m3.material.io/components/tooltips/specs) use `surface-container`,
  elevation 2 and the medium corner; placing beside the crosshair keeps the lines at the crosshair visible, and the
  flip satisfies FR-008 and SC-005.
- **Alternatives considered**: centring with a clamp (covers the very point being read).

## R6. Lines, markers and the baseline

- **Decision**: polylines keep `stroke-width:2` and gain `stroke-linejoin:round; stroke-linecap:round` (CSS on
  `.line-graph-line`). At the crosshair, one `circle.line-graph-marker` per line (`r=4`, `fill` = the line colour,
  `stroke: var(--md-sys-color-surface)`, `stroke-width:2`), drawn after the lines. The 0 % grid line gets the
  `line-graph-baseline` class, stroked in `--md-sys-color-outline`. No transition anywhere (FR-011).
- **Rationale**: FR-009, FR-010, FR-014; the ring in the surface colour separates overlapping markers in either
  theme.

## R7. Keyboard reading of the plot

- **Decision**: `.line-graph-plot` gets `tabindex="0"`, `role="group"` and an `aria-label`
  (`"Vote share over time for <title>. Use the Left and Right arrow keys to read the values."`); the SVG gets
  `aria-hidden="true"` in place of its `role="img"` and label, so the title is read once. On `focus` without a
  preceding pointer press the crosshair goes to the newest bucket
  (Clarification Q1); `keydown` Left/Right ±1 (clamped), Home/End to the ends, Escape hides; `blur` hides. Every
  keyboard placement writes the tooltip's text (time, then `label share%` per drawn choice) into a visually hidden
  `p.line-graph-live[aria-live=polite]` (FR-017). The focus ring on the plot, the segments and nothing else is
  `outline:3px solid var(--md-sys-color-secondary); outline-offset:2px`, the card's ring (FR-018).
- **Rationale**: one Tab stop, standard keys; the polite region does not interrupt. A pointer press sets a
  `pointerPlaced` flag before the `focus` event fires, so a mouse click on the plot does not jump to the newest point;
  `blur` resets it too, since a click on an already focused plot fires no `focus`.
- **Alternatives considered**: a focusable element per point (hundreds of Tab stops on a 1-year scale).

## R8. Touch: the crosshair stays after the finger lifts

- **Decision**: `pointerleave` clears the crosshair only when `event.pointerType !== "touch"`; a `pointerdown`
  listener on `document`, added at mount and removed at unmount, clears it when the press is outside the plot.
  `.line-graph-plot` gets `touch-action:pan-y`, so a horizontal drag moves the crosshair while a vertical swipe still
  scrolls the page (Clarification Q2, FR-019).
- **Rationale**: on touch, `pointerleave` follows `pointerup`, which is what hides the tooltip today.

## R9. Keeping the crosshair across a redraw

- **Decision**: the crosshair's bucket time is kept in state while it is shown; after a redraw (refresh, resize,
  theme change, scale change) it is placed again at the same bucket time when that bucket still exists, else at the
  newest bucket; on a scale change it is hidden instead (the bucket set is different).
- **Rationale**: the spec's refresh edge case; without it the minute refresh would make a keyboard or touch reading
  vanish.

## R10. Title, legend and the literal font size

- **Decision**: `.line-graph-title` takes `--md-sys-typescale-title-large-size` with no `clamp()`; legend text
  `label-large`, dots 12 px (`.line-graph-dot` is shared by the legend and the tooltip); axis labels unchanged.
- **Rationale**: FR-012 and SC-003; `tests/m3-assets.test.ts` gains a check that `line-graph-m3.css` has no hex
  colour, no `rgb(`/`hsl(` and no `font-size` outside `var(--md-sys-…)`.

## R11. Tests touched

- **Decision**: `tests/line-graph-ui.test.ts` — the scale tests read `.line-graph-segment` instead of
  `.line-graph-scale` / `is-selected` (selection by `aria-pressed`); new cases for the check icon and roving focus,
  the tooltip flip, markers, keyboard, live region, touch persistence and redraw keeping. A new
  `tests/client-line-colors.test.ts` loads `pollCard.js` in jsdom and asserts, for every automatic colour (parsed
  from `RESULTS_PALETTE_ENTRIES` as `client-bar-colours.test.ts` does), Yes/No and every `BAR_PALETTE` colour, on
  `#FFFFFF` and `#0F1511`: result ≥ 3:1, unchanged when the input already passes, same hue within 1°.
- **Rationale**: SC-001, SC-002 and UA6's verification, with no browser beyond jsdom.
