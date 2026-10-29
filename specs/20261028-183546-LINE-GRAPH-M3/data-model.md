# Data Model: Line Graph Material 3

**Feature**: `20261028-183546-LINE-GRAPH-M3` · **Date**: 2026-10-28

No stored data, no migration, no setting, no cookie or browser storage key changes.
Everything below lives in memory in `lineGraph.js`'s `state` object while a graph is mounted, and is dropped by
`unmount()`.

## Line colour (derived, never stored)

| Field | Meaning |
|---|---|
| `hex` | The choice's colour as today: the response's manual hex, else `card.resultColors()` |
| `surfaceHex` | The graph container's computed background, as `#RRGGBB`, or none when not an opaque colour (R3) |
| `lineColor` | `PollCard.lineColorOn(hex, surfaceHex)`; equals `hex` when it already has 3:1 on the surface, or when there is no surface (R2) |

Rules: computed on every draw; used for the polyline, the legend dot, the tooltip dot and the marker of that choice
(FR-003). Never cached across draws, so a theme change is honoured at the next draw.

## Additions to `state`

| Field | Type | Meaning |
|---|---|---|
| `crosshairTime` | number or `null` | Bucket time (ms) the crosshair is at while shown; `null` when hidden (R9) |
| `pointerPlaced` | boolean | A pointer press on the plot happened just before its `focus` event, so focus does not jump to the newest point; reset on `focus` and on `blur` (R7) |
| `liveEl` | element | The visually hidden polite live region (R7) |
| `colorScheme` | `MediaQueryList` or `null` | The dark-scheme query whose `change` redraws the graph (R3) |
| `onSchemeChange` | function | The `change` listener on `colorScheme`, kept so `unmount()` can remove it (R3) |
| `onDocumentPointerDown` | function | Clears a touch-placed crosshair on a press outside the plot (R8) |

## Additions to `state.view`

`state.view` is rebuilt by every SVG draw.

| Field | Type | Meaning |
|---|---|---|
| `markers` | element array | The `circle.line-graph-marker`s at the crosshair; empty when hidden (R6) |
| `y` | function | The share-to-y mapping of the current draw, used to place the markers (R6) |

## Crosshair states

```text
hidden ──pointermove / pointerdown / focus (newest) / arrow, Home, End──▶ shown(at bucket t)
shown ──pointer leaves (mouse, pen) / Escape / blur / press outside plot / scale change──▶ hidden
shown ──refresh, resize, theme change──▶ shown(t if t still a bucket, else newest)
```
