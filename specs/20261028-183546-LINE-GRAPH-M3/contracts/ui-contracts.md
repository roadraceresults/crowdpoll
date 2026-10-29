# UI Contracts: Line Graph Material 3

**Feature**: `20261028-183546-LINE-GRAPH-M3` · **Date**: 2026-10-28

The HTTP contract (`GET /api/polls/:pid/line-graph`, POLL-LINE-GRAPH A1–A2) and the mount seam
(`window.PollLineGraph.mount(element, ctx)` / `unmount()`, POLL-LINE-GRAPH C1) are unchanged.
These contracts replace POLL-LINE-GRAPH C3 (scale selector), C5 (colours, for the theme rule only) and C7
(crosshair) where they differ, and add the rest.

## C1. `PollCard.lineColorOn(hex, surfaceHex)`

- Added to `window.PollCard` in `pollCard.js`.
- `hex`: `#RRGGBB` (either case). `surfaceHex`: `#RRGGBB`, or `undefined`/`null`.
- Returns `hex` unchanged when `surfaceHex` is absent or `contrastRatio(hex, surfaceHex) >= 3`; otherwise the HSL
  shade of `hex` with the same hue and saturation and the lightness nearest to `hex`'s own, stepping by 0.01 away
  from the surface's lightness, that reaches 3:1 (research R2); upper-case `#RRGGBB`.
- Pure, no DOM access.

## C2. Line colours in `lineGraph.js`

- At every draw: `surfaceHex` = the mount element's computed `background-color` as hex (absent unless an opaque
  `rgb()`/`rgba(…, 1)`); each choice's colour = `PollCard.lineColorOn(colourAsToday, surfaceHex)`.
- That one colour is the polyline's `stroke`, the legend `.line-graph-dot` background, the tooltip
  `.line-graph-dot` background and the `.line-graph-marker` `fill` for the choice.
- A `change` on `matchMedia("(prefers-color-scheme: dark)")` redraws the legend and the plot. Listener added at
  mount, removed at unmount; guarded when `matchMedia` is missing.

## C3. Scale selector (segmented button)

```html
<div class="line-graph-scales" role="group" aria-label="Time scale">
  <button type="button" class="line-graph-segment" aria-pressed="true" tabindex="0">
    <svg class="line-graph-segment-icon" aria-hidden="true" …>…check…</svg>1 Day
  </button>
  <button type="button" class="line-graph-segment" aria-pressed="false" tabindex="-1">1 Week</button>
</div>
```

- One button per `availableScales` entry, in order, labels `1 Day` / `1 Week` / `1 Month` / `1 Year`; only the
  selected button has the icon. Shown with one segment when one scale is available; hidden with the plot when a note
  shows (as today).
- Click (and so Enter/Space) on an unselected segment: `showScale(scale)`, no request; focus stays on that segment.
- Left/Right on a segment: focus the previous/next segment, wrapping; selection does not change.
- The class `line-graph-scale` and `is-selected` are removed.
- `window.M3Ripple?.add(".line-graph-segment")`.

## C4. Plot, crosshair and markers

- `.line-graph-plot`: `tabindex="0"`, `role="group"`, `aria-label="Vote share over time for <title>. Use the Left
  and Right arrow keys to read the values."`; the SVG has `aria-hidden="true"` and no `role` or label, so the title
  is read once.
- Shown crosshair: `line.line-graph-crosshair` at the bucket's x, plus one `circle.line-graph-marker` per drawn line
  (`r="4"`, `fill` per C2) after the polylines, plus the tooltip (C5).
- Polylines: class `line-graph-line`, `stroke-width` 2, round joins and caps. The 0 % grid line has the extra class
  `line-graph-baseline`.
- Pointer: `pointermove`/`pointerdown` place at the nearest bucket and set `pointerPlaced`; `pointerleave` hides it
  unless `pointerType === "touch"`; a document `pointerdown` outside the plot hides it.
- Keyboard (focus on the plot): `focus` without `pointerPlaced` → newest bucket (`pointerPlaced` is reset on
  `focus` and `blur`); `ArrowRight`/`ArrowLeft` → ±1,
  clamped; `Home`/`End` → first/last; `Escape` → hide (consumed only while the crosshair is shown,
  so a second Escape still closes the maximized view through `tabs.js`); `blur` → hide. Handled keys call `preventDefault()`.
- A keyboard placement (including focus) sets `.line-graph-live`'s text to the tooltip text: the time, then
  `<label> <share>%` per drawn choice, joined by `, `.
- Redraw (refresh, resize, theme change) while shown: placed again at the same bucket time if present, else the
  newest; a scale change hides it.

## C5. Tooltip

- `div.line-graph-tooltip` inside `.line-graph-plot`: `.line-graph-tooltip-time` then one
  `.line-graph-tooltip-entry` per drawn choice (dot, label, `.line-graph-tooltip-pct`), as today.
- Position: `left` in px = crosshair x + 12; if that plus its width passes the plot's width, crosshair x − 12 − width;
  then clamped to `[0, plotWidth − width]`. `top` 8 px. No `transform`.

## C6. Stylesheet `line-graph-m3.css`

- Only `var(--md-sys-…)` for colour, font size, shape and elevation; no hex, `rgb(`, `hsl(`, and no `font-size`
  other than a `var(--md-sys-typescale-…)` (checked in `m3-assets.test.ts`).
- Title `title-large`; subtitle and note `body-medium`; legend `label-large`, dots 12 px; tooltip
  `surface-container`, `--md-sys-elevation-2`, `corner-medium`, padding 12 px 16 px, time `title-small`, rows
  `body-medium`; segments 40 px high, `outline` border, `corner-full` ends, selected `secondary-container` /
  `on-secondary-container`, `label-large`; grid `outline-variant`, baseline `outline`; markers stroked `surface`,
  2 px.
- State layers on `.line-graph-segment::before` at the hover/focus/pressed token opacities; focus ring on
  `.line-graph-segment:focus-visible` and `.line-graph-plot:focus-visible`:
  `outline:3px solid var(--md-sys-color-secondary); outline-offset:2px`.
- `.line-graph-plot{ touch-action:pan-y; }`; `.line-graph-live` visually hidden (clip pattern).
- No `transition` or `animation` on any graph element.
