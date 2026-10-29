# UI Contracts: Poll Line Graph

## C1. Mount and unmount

`tabs.js` `maximize(pid)` calls `window.PollLineGraph?.mount(rightColumnEl, { pid, title, subtitle, card })` after
the card has moved into the maximized view; every close path (Escape, the active-tab click restore, `select()`,
the session subscription) funnels through `close()`, which calls `window.PollLineGraph?.unmount()`. Unmount clears
the refresh timer and empties the column. `lineGraph.js` returns at once on pages without its elements and guards
`matchMedia`, like `tabBarScroll.js`.

## C2. Right-column composition (top to bottom)

Poll title and subtitle; the legend (C4); the SVG graph at the column's full width; the scale selector (C3).
The column's placeholder styling in `tabs.css` (grey box) is gone; the new rules live in `line-graph-m3.css`,
Material 3 tokens only. Below the maximized grid's existing 767.98 px container breakpoint the column wraps under
the card at full width — the wrap itself is existing behaviour and is not re-implemented.

## C3. Scale selector

Four text buttons — `1 Day`, `1 Week`, `1 Month`, `1 Year` — of which only `availableScales` render; the served
scale is marked selected (underline + `aria-pressed`). Clicking an offered scale redraws it from the response
already held, with no request (amended by TWEAK04), without leaving the maximized view. There is no "ALL" control, ever.

## C4. Legend

One entry per drawn series: a colour dot (the line's hex), the choice label, and its current (newest-point)
percentage; plus the total vote count ("N votes"), equal to the card's. Entries are real text (no canvas/SVG),
wrap on narrow columns, and update on every successful refresh. The legend is the accessible reading of the graph
(spec FR-018); the SVG itself carries `role="img"` and `aria-label` "Vote share over time for <poll title>".

## C5. Lines and colours

One polyline per drawn choice. Stroke = the manual `color` from the response when present, else the colour the
card assigned that choice (`card.resultColors()` — palette with the poll's offset, or the fixed yes/no colours),
identical in light and dark themes. Axes, gridlines, labels, crosshair and tooltip take Material 3 tokens and
follow the theme. The Y axis spans 0–100% with four or five gridlines; X labels sit at natural steps (days on
daily scales, hours on hourly ones), formatted in the viewer's local time via `Intl.DateTimeFormat`.

## C6. Sparse data placeholder

When the served scale has fewer than two buckets (and no larger scale is available), the column renders title,
subtitle and the quiet line "Not enough voting data to graph yet" instead of axes; a later refresh that yields two
or more points replaces it with the graph.

## C7. Crosshair

`pointermove` (mouse/pen) or `pointerdown` (touch tap) places a vertical crosshair at the nearest bucket and a
tooltip listing, for every drawn line: colour dot, label, percentage at that bucket; the bucket's time renders
once — date on daily scales, date and hour on hourly ones, viewer-local. The crosshair leaves on `pointerleave`.
No keyboard equivalent (spec FR-018).

## C8. Refresh

On mount: fetch the series (every available scale in one response), render the default scale, then refetch the
series every `lineGraphRefreshIntervalMs` (from `/api/config`) while mounted, redrawing the scale the viewer chose
(amended by TWEAK04); unmount stops the timer. Each successful refresh redraws lines, legend and
vote count in place.

## C9. Failure behaviour

A failed refresh (network error or non-OK) keeps the last drawn graph and retries at the next tick, logging at
most one minimal console line. A failed **first** load shows "Graph unavailable right now" until a fetch
succeeds. A `404` renders "Results are not available yet" under the title and stops the timer (the viewer may not
see this poll's results). No sensitive data is ever logged to the browser console.
