# Research: Adaptive Y Axis for the Line Graph

Sources: the requirements report (`requirements/20261101-150208-adaptive-y-axis/requirements-report.md`, 6 findings
resolved), `src/public/lineGraph.js`, `src/polls/lineGraph.ts` and `tests/line-graph-ui.test.ts`, as read on
2026-11-01.

## R1 — Where the top is chosen

- **Decision**: in the browser, in `renderSvg()`, from `state.data.series` (the lines drawn for the scale shown).
- **Rationale**: the server already sends whole-percent points for every scale (`Math.round((count / share) * 100)`
  in `src/polls/lineGraph.ts`), and `state.data` holds exactly the drawn lines of one scale, which is the set FR-002
  names. `series` already excludes choices under `ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE`.
- **Alternatives considered**: a `yMax` per scale in the response. Rejected (requirements UA4): a server, contract and
  cache change for a number the browser can derive.

## R2 — The rule

- **Decision**: a helper beside `renderSvg()`:

  ```js
  const AXIS_TOPS = [25, 50, 75, 100];
  function axisTopFor(series) {
    const highest = Math.max(0, ...series.flatMap((s) => s.points));
    return AXIS_TOPS.find((top) => highest <= top) || 100;
  }
  ```

  "Every point ≤ X" is "the highest point ≤ X". `Math.max(0, …)` gives 0 for no line, so the top is 25 (FR-003).
- **Rationale**: one pass, no state, testable through the rendered labels.
- **Alternatives considered**: `Math.ceil(highest / 25) * 25` with a floor of 25. Equivalent, but the list states the
  four allowed tops directly. The spread into `Math.max` is safe: at most 50 choices × the largest bucket count (the
  1 Year scale's daily buckets) is far below the argument limit.

## R3 — Gridlines and labels

- **Decision**: step = 5, 10, 15 or 25 for a top of 25, 50, 75 or 100; lines and labels at `0, step, …, top`. The 0%
  line keeps `line-graph-grid line-graph-baseline`; the others `line-graph-grid`. Labels stay `pct + '%'`.
- **Rationale**: requirements UA1 A: whole, round labels; six lines on a shorter axis, today's five on 100%, so a
  100% graph is identical (FR-007). The step can be derived as `top === 100 ? 25 : top / 5`.
- **Alternatives considered**: quarters of the top (6.25% steps). Rejected in UA1.

## R4 — When the top changes

- **Decision**: no stored top. `renderSvg()` computes it on every call, and `renderSvg()` already runs on mount,
  `showScale()` (a scale switch or a refresh) and resize.
- **Rationale**: FR-005 asks for exactly the redraw points that exist; keeping no state means nothing to reset.
- **Alternatives considered**: hysteresis (only lower the top after several refreshes). Not asked for (Constitution II).

## R5 — Crosshair, markers, tooltip

- **Decision**: `y` becomes `(pct) => pad.top + ((top - pct) / top) * innerHeight`. `state.view.y` is that function,
  so `placeCrosshair()` puts the markers on the lines unchanged. The tooltip and live region print
  `series.points[index] + '%'`, untouched (FR-006). The crosshair kept across a redraw (`keptTime`) is unchanged.
- **Rationale**: one mapping drives every vertical position.

## R6 — The earlier contract

- **Decision**: amend POLL-LINE-GRAPH `contracts/ui-contracts.md` C5: "The Y axis spans 0–100% with four or five
  gridlines" → "The Y axis spans 0% to 25, 50, 75 or 100%, chosen per draw (feature 20261101-150208-ADAPTIVE-Y-AXIS),
  with five or six gridlines".
- **Rationale**: that contract is the reference a later reader uses; leaving 0–100% would contradict the code.

## R7 — Tests

- **Decision**: in `tests/line-graph-ui.test.ts`, seed polls whose 1 Day lines top out at 25, 50, 75 and 100%, and
  assert the `<text>` labels of the Y axis (0…25 by 5, 0…50 by 10, 0…75 by 15, 0…100 by 25), that the highest point's
  polyline `y` equals the top gridline's `y` when the highest point equals the top, and that the tooltip shows the
  same percentages. A scale switch from a 100% 1 Month to a 25% 1 Day changes the labels (c1 votes 20 days ago; c2,
  c3 and c4 at one identical time 10 days ago). A poll with no drawn line shows the 25% axis, and an undrawn choice
  with a higher earlier share does not raise the top; both run in a `describe` block with its own test context and
  `ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE: "30"`, since the suite's shared context cannot change the threshold per test.
  The existing baseline test stays.
- **Rationale**: Constitution IV; the jsdom harness already renders the SVG (`clientWidth` falls back to 320).
- **Seeding note**: with N voters on separate choices the share is 100/N per choice, so 4 voters on 4 choices gives
  25% (top 25), 2 on 2 gives 50%, 4 voters split 3:1 gives 75%, 1 voter gives 100%. Shares before the last vote can be
  higher (the first voter alone is 100%), so a seed for a low top places every vote at one identical `votedAt`, at
  least two hours ago: the 1 Day scale then has at least two buckets (fewer shows the sparse note) and every bucket
  shows the final shares.
