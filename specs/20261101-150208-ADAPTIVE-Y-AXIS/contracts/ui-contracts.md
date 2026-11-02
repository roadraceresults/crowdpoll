# UI Contracts: Adaptive Y Axis for the Line Graph

The line graph of the maximized poll view (`src/public/lineGraph.js`). Everything not named here behaves as in
POLL-LINE-GRAPH and LINE-GRAPH-M3.

## C1. Axis top

The Y axis runs from 0% to `top`, where `top` is the smallest of 25, 50, 75 and 100 that every point of every drawn
line in the scale shown is at or below. No drawn line, or every point 0% → 25. Choices not drawn (under the vote
threshold) and other scales do not count.

| Highest point | Top |
|---|---|
| 0–25 | 25 |
| 26–50 | 50 |
| 51–75 | 75 |
| 76–100 | 100 |

## C2. Gridlines and labels

| Top | Gridlines and labels |
|---|---|
| 25 | 0, 5, 10, 15, 20, 25% |
| 50 | 0, 10, 20, 30, 40, 50% |
| 75 | 0, 15, 30, 45, 60, 75% |
| 100 | 0, 25, 50, 75, 100% (as today) |

Each gridline is a `line.line-graph-grid` with a `<text>` label `"<pct>%"` at the same `y`; the 0% line also has
`line-graph-baseline`. Lines, markers and the crosshair are placed with the same mapping, so a point equal to the top
lies on the top gridline. Tooltip and live-region values are the real percentages, unchanged.

## C3. Redraws

The top is derived on every draw — mount, scale switch, automatic refresh, resize — with no animation, and can rise
or fall between draws. A crosshair shown before a redraw stays at the same bucket time.

## C4. Amendment to POLL-LINE-GRAPH C5

In `specs/20261027-151601-POLL-LINE-GRAPH/contracts/ui-contracts.md` C5, the sentence
"The Y axis spans 0–100% with four or five gridlines" becomes
"The Y axis spans 0% to 25, 50, 75 or 100%, chosen per draw (20261101-150208-ADAPTIVE-Y-AXIS C1–C3), with five or six
gridlines".
