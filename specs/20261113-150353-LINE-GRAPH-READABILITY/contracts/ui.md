# UI Contract: the line graph's legend readout, highlight and top 10

No API change. The contract is the DOM that `lineGraph.js` builds inside `.maximized-graph`, and how it reacts.

## U1. Structure

```text
div.line-graph[.has-highlight]
├── h2.line-graph-title
├── p.line-graph-subtitle
├── p.line-graph-note
├── div.line-graph-readout
│   ├── span.line-graph-readout-time        "Latest" | the selected time
│   └── span.line-graph-total               "918 votes" | "… voters"
├── div.line-graph-legend
│   └── button.line-graph-legend-entry[type=button][data-choice-id][aria-pressed]   × drawn lines
│       ├── span.line-graph-dot
│       ├── span.line-graph-legend-label
│       └── span.line-graph-legend-pct
├── div.line-graph-plot                      svg: grid, polylines, crosshair, markers — nothing else
├── div.line-graph-controls
│   ├── div.line-graph-controls-start
│   │   └── button.line-graph-show-all[type=button]  hidden when ≤ 10 lines; at the left end of the row
│   └── div.line-graph-scales                centered in the row
└── p.line-graph-live
```

- No `.line-graph-tooltip` element exists at any time.
- The readout row, the legend and the show-all button are hidden with the notes ("Not enough voting data…", etc.).

## U2. Order and the drawn set

- Legend entries and polylines are in order of current share, highest first; ties in choice order.
- More than 10 series: only the first M are drawn and listed until "Show all N choices" is pressed. M is the number of
  leading lines whose current shares together reach 80% of the sum of all the lines' current shares, with any lines
  tied with the last of them, and never more than 10.
- The Y axis, the markers and the live-region announcement use the drawn lines only.

## U3. Readout

| State | `.line-graph-readout-time` | each `.line-graph-legend-pct` |
|---|---|---|
| no time selected | `Latest` | the line's newest point + `%` |
| time selected (bucket *i*) | date + hour (1 Day, 1 Week) or date + year (1 Month, 1 Year), always in the US English form ("Nov 14, 3 PM", "Apr 16, 2026"), viewer's time zone | `points[i]` + `%` |

- Selecting or moving a time changes text only; no legend node is replaced.
- The crosshair and one `circle.line-graph-marker` per drawn line mark the time, as before.

## U4. Keeping and clearing the selected time

| Event | Selected time |
|---|---|
| pointer move / press on the plot; Left, Right, Home, End on the focused plot | set / moved |
| press on the plot (touch or mouse click) | set and **pinned**: leaving the plot keeps it; mouse movement with no button held no longer moves it; a drag or another press moves it |
| Escape on the plot; scale changed | cleared |
| mouse leaves the plot, time not pinned (hover only) | cleared |
| press, or focus moving, to a legend entry or the show-all button | **kept** |
| press, or focus moving, anywhere else outside the plot | cleared |
| refresh | kept at the same time, or moved to the newest when that time is gone (as before) |

## U5. Highlight

- Activating a legend entry (click, Enter, Space) sets `aria-pressed="true"` on it and `"false"` on all others, adds
  `has-highlight` to `.line-graph`, and redraws: that line's `polyline` has class `is-highlighted` and is the last
  polyline; its marker is the last marker and has class `is-highlighted`.
- Activating it again, or Escape while it has focus, removes all of that. Escape on an entry that is not highlighted
  is not handled.
- At most one entry has `aria-pressed="true"`.
- The highlight survives a refresh, a scale change and a time selection; legend focus survives a refresh.
- It is cleared when its line is not in the drawn set (a refresh, or "Show top 10 choices").
- Hover changes nothing.

## U6. Show-all button

| Series in the scale | Button | Drawn |
|---|---|---|
| ≤ 10 | hidden | all |
| N > 10, at mount | `Show all N choices` | first M |
| N > 10, after a press | `Show top M choices` | all N |

- The pressed state survives a refresh and a scale change; a new mount starts at the first M. M follows the current shares, so it can change on a refresh.
- N follows the response on each refresh.

## U7. Appearance (CSS, checked by hand)

| Element | Rule |
|---|---|
| `.line-graph-line` | `stroke-width:2`; `.is-highlighted` → `4` |
| other lines and markers under `.has-highlight` | `opacity:0.25` |
| other legend entries under `.has-highlight` | `opacity:0.6` |
| `.line-graph-legend-pct` | `min-width:4.5ch`, tabular numerals: an entry's width does not depend on its value |
| legend entry, show-all button | M3 state layers and the focus ring used by `.line-graph-segment` |
| `.line-graph-legend` | a table filled column by column (a CSS grid, `grid-auto-flow:column`): each column as wide as its widest entry, `column-gap:8px`, no gap between rows; `--line-graph-legend-rows`, set by `lineGraph.js`, is the fewest rows whose columns fit the legend's width, and one entry per row when not even two columns fit |
| `.line-graph-legend-entry` | `min-height:18px`, `padding:0 8px` |
| `.line-graph-dot` | 9 px across |
| `.line-graph-segment` | the show-all button's size and type: 24 px tall, `padding:0 12px`, label-small |
| X axis labels | no space inside a label: "Nov14", "3PM"; US English form on every device |
| `.line-graph-legend` | label-small type, the size of the axis labels |
| `.line-graph-show-all` | M3 outlined button: `border:1px solid` outline, `padding:0 12px`, 24 px tall, label-small type |
| `.line-graph-subtitle` | label-small type, the size of the legend and the axis labels |
| `.line-graph-title` | set as the maximized card's title: title-large type, long words break (`overflow-wrap:anywhere`), and from 900 px down the card title's smaller size, through the same rule in `single-column-m3.css` |
| `.line-graph` | `gap:4px`; the subtitle sits directly under the title (`margin-top:-4px`); the plot and the controls row keep 12 px above them (`margin-top:8px`) |
| `.line-graph-controls` | a wrapping flex row, `gap:8px`: the show-all button at the start, the scale buttons centered in the row (the button's box `.line-graph-controls-start` and an empty `::after` box share the free space, `flex:1 1 0` each); not displayed while the scale buttons are hidden |
| colors | only M3 tokens in the sheet; line and dot colors stay inline data |
