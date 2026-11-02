# Data Model: Adaptive Y Axis for the Line Graph

Nothing is stored, sent or migrated. The axis is derived in the browser on every draw.

## Inputs (existing, unchanged)

- **Scale view** (`state.data` in `lineGraph.js`): `buckets` (UTC times) and `series` — the drawn choices, each with
  `id`, `label`, `color` and `points` (whole percentages, 0–100, one per bucket).

## Derived per draw

| Value | Rule | Values |
|---|---|---|
| `highest` | largest point over every drawn series; 0 when none | 0–100 |
| `top` | smallest of 25, 50, 75, 100 with `highest ≤ top` | 25, 50, 75, 100 |
| `step` | 5, 10, 15 for top 25, 50, 75; 25 for top 100 | 5, 10, 15, 25 |
| gridlines / labels | `0, step, 2·step, …, top` | six lines, or five for 100 |
| `y(pct)` | `pad.top + ((top − pct) / top) · innerHeight` | pixels |

## Lifecycle

The values exist only for one `renderSvg()` call. A later call — scale switch, refresh, resize — derives them again;
the top can rise or fall between calls.
