# Tasks: Line Graph Readability

**Input**: Design documents from `specs/20261113-150353-LINE-GRAPH-READABILITY/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R10), data-model.md, contracts/ui.md (U1–U7), quickstart.md

**Tests**: requested (plan.md, Constitution IV). Each story writes its tests first; they fail before the implementation
tasks that follow.

**Organization**: by user story; every task names its file.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1, US2, US3 (spec.md)

---

## Phase 1: Setup

None: no dependency, setting or script is added.

---

## Phase 2: Foundational (blocks every story)

**Purpose**: the share order and the drawn set, which the readout, the highlight and the top 10 all read.

- [X] T001 Create `tests/line-graph-many-lines.test.ts` with the harness of `tests/line-graph-ui.test.ts` (same `SCRIPTS`, `open`, `cardByTitle`, `maximize`, `beforeEach` cache clearing, `startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1", ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL: "1000", ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE: "0" })`) and a helper `seedRanked(title, votesPerChoice: number[])` that inserts a line-graph-enabled poll with one choice per entry (`id` `c1`…, `label` `Choice 1`…, `position` i) and, for choice i, `votesPerChoice[i]` single-choice `vote_history` rows 3 hours ago; add one test "orders the legend and the lines by current share, ties in choice order": `seedRanked("Ordered", [1, 3, 2, 3])` gives legend labels and polyline `data-choice-id`s in the order Choice 2, Choice 4, Choice 3, Choice 1; run it and see it fail (contracts/ui.md U2, research R2)
- [X] T002 In `src/public/lineGraph.js`: in `showScale`, set `state.data.series` to a copy of `view.series` sorted by last point descending (`Array.prototype.sort` is stable, so ties keep the served order); add `const TOP_LINES = 10;`, `showAll: false` and `highlightId: null` to the `state` object in `mount`, and a function `drawnSeries()` returning `state.data.series` when `state.showAll` or its length is at most `TOP_LINES`, else its first `leadingCount()` (TWEAK06); use `drawnSeries()` in place of `state.data.series` / `data.series` in `renderLegend`, `placeCrosshair` (markers), `announce`, `axisTopFor`'s call and the polyline loop of `renderSvg`; T001 passes and `npx vitest run tests/line-graph-ui.test.ts` still passes (R2, R8)

**Checkpoint**: `npx vitest run tests/line-graph-many-lines.test.ts tests/line-graph-ui.test.ts` passes.

---

## Phase 3: User Story 1 - Read the shares at a selected time without covering the plot (Priority: P1) 🎯 MVP

**Goal**: no floating box; the readout row and the legend show the selected time and its shares; nothing moves.

**Independent Test**: select a time: `.line-graph-tooltip` never exists, `.line-graph-readout-time` reads the time, each `.line-graph-legend-pct` reads `points[i]`; clear it: "Latest" and the latest shares.

- [X] T003 [US1] In `tests/line-graph-ui.test.ts`, rewrite every tooltip assertion against the readout and see them fail: (a) replace the helpers `tooltip`, `tooltipTime` (three definitions) by `readoutTime(side)` = text of `.line-graph-readout-time` and `legendPcts(side)` = texts of `.line-graph-legend-pct`; a selected time is asserted as `readoutTime(side) === timeText(...)`, a cleared one as `readoutTime(side) === "Latest"` (where the old test expected `null`); (b) "shows every drawn choice and the time once…": assert `side.querySelector(".line-graph-tooltip")` is null, one `.line-graph-readout-time`, legend labels and `legendPcts` equal to the served series **sorted by newest point descending** at the last and at the first bucket; (c) delete the test "opens the tooltip right of the crosshair…" and its `stubWidths` / `crosshairPx` helpers; (d) "shades a colour under 3:1…": drop the tooltip-dot lines and rename the test "…the same in the line and the legend dot"; (e) "keeps a touch-placed crosshair…": replace the press on the tooltip by a press on a `.line-graph-legend-entry`, which must keep the crosshair; (f) adaptive Y axis "ends the axis at 25%…": read `legendPcts(side)` in place of the tooltip percentages; (g) "renders title, subtitle, legend…": each `.line-graph-legend-entry` is a `BUTTON` with `type="button"` and `aria-pressed="false"`, and `.line-graph-total` is a child of `.line-graph-readout`, not of `.line-graph-legend`; (h) add "reads Latest and the latest shares at rest" and, in the placeholders describe, that `.line-graph-readout` is hidden with each note; (i) add "pins a clicked time": a `pointerdown` on the SVG followed by `pointerleave` keeps the crosshair and the readout time, a following `pointermove` at another x with `buttons: 0` does not move it, one with `buttons: 1` moves it, a second `pointerdown` moves it, and Escape, a `pointerdown` on `document.body` or a scale click each clear it; "removes the crosshair on pointerleave" (hover only) stays as it is; update the file's header comment, which names the tooltip (contracts/ui.md U1, U3, U4)
- [X] T004 [US1] In `src/public/lineGraph.js`: (a) in `mount`, create `state.readoutEl = el('div', 'line-graph-readout')` holding `state.readoutTimeEl = el('span', 'line-graph-readout-time')` and `state.totalEl = el('span', 'line-graph-total')`, and append it between `state.noteEl` and `state.legendEl`; hide it in `renderNote` and show it in `renderLegend`; (b) `renderLegend` writes the total into `state.totalEl` (no longer appended to the legend), builds each entry as `button.line-graph-legend-entry` with `type = 'button'`, `dataset.choiceId` and `aria-pressed="false"`, restores focus to the entry whose choice id had focus before the rebuild (as `renderScales` does for scales), and ends by calling `updateReadout()`; (c) add `updateReadout()`: index = `state.data.buckets.indexOf(state.crosshairTime)`, or the last index when that is -1; set `state.readoutTimeEl.textContent` to `'Latest'` when `state.crosshairTime === null`, else `readoutTimeText(buckets[index])`; set each legend entry's `.line-graph-legend-pct` text to its series' `points[index] + '%'` (match by `data-choice-id`); (d) rename `tooltipTimeText` to `readoutTimeText`; (e) in `placeCrosshair`, delete the tooltip block and the `positionTooltip` call and call `updateReadout()` after setting `state.crosshairTime`; in `clearCrosshair`, delete the tooltip lines and call `updateReadout()` after `state.crosshairTime = null` when `state.data` has at least two buckets; (f) delete `positionTooltip`, `TOOLTIP_GAP`, `TOOLTIP_TOP` and `tooltip: null` from `state.view`; (g) add `keepsSelection(node)` = `node` is inside `state.graphEl`, `state.legendEl` or (when it exists) `state.showAllEl`; `onDocumentPointerDown` clears only when `!keepsSelection(event.target)`; replace the plot's `blur` listener by a `focusout` listener on the `.line-graph` root that resets `state.pointerPlaced` when `event.target === state.graphEl` and calls `clearCrosshair()` when `event.relatedTarget` is outside the keep set, or, when it is `null` (a browser that does not focus a clicked button), when the last `pointerdown` was not on a node of the keep set (`onDocumentPointerDown` records that in `state.pressedInside`; a `keydown` on the root resets it); the listener returns at once while `renderLegend` is replacing the entries (`state.rebuildingLegend`, true only during that rebuild), so a browser that fires `focusout` for a removed focused entry does not clear the time on a refresh; (h) add `pinned: false` to the state: the SVG's `pointerdown` sets it, `clearCrosshair` and the scale change in `showScale` reset it, `pointerleave` clears only when `event.pointerType !== 'touch' && !state.pinned`, and `pointermove` is ignored when `state.pinned && event.pointerType !== 'touch' && event.buttons === 0` (a drag with a button held still moves the time); update the file's header comment only if it names the tooltip; T003 passes (R3, R6)
- [X] T005 [P] [US1] In `src/public/line-graph-m3.css`: delete the "Rich tooltip" comment and the rules `.line-graph-tooltip`, `.line-graph-tooltip-time`, `.line-graph-tooltip-entry`, `.line-graph-tooltip-pct`; add `.line-graph-readout{ display:flex; align-items:baseline; gap:16px; … }` with the label-large typescale tokens and `[hidden]{ display:none }`, `.line-graph-readout-time` in `--md-sys-color-on-surface` with the title-small weight token; keep `.line-graph-total{ margin-left:auto }`; restyle `.line-graph-legend-entry` as a button (`appearance:none; border:none; background:transparent; margin:0; padding:0 8px; min-height:18px; max-width:100%; font:inherit; letter-spacing:inherit; color:inherit; cursor:pointer; position:relative; overflow:hidden; border-radius:var(--md-sys-shape-corner-small); text-align:start`) with the same `::before` state layer and `:focus-visible` outline as `.line-graph-segment` (add it to those selector lists); `.line-graph-legend-label{ overflow-wrap:anywhere }`; `.line-graph-legend-pct{ min-width:4.5ch; font-variant-numeric:tabular-nums }`; change the legend's gap to `2px 4px` to make up for the entries' padding; no literal font size, colors only as M3 tokens (R4, contracts/ui.md U7)

**Checkpoint**: `npx vitest run tests/line-graph-ui.test.ts tests/line-graph-many-lines.test.ts tests/m3-assets.test.ts` passes.

---

## Phase 4: User Story 2 - Pick out one line (Priority: P2)

**Goal**: activating a legend entry highlights its line; the rest are dimmed; one at a time.

**Independent Test**: click an entry: `aria-pressed="true"` on it only, `.line-graph.has-highlight`, its polyline is last and `.is-highlighted`; click again: all cleared.

- [X] T006 [US2] In `tests/line-graph-many-lines.test.ts`, add `describe("highlight")` on `seedRanked("Picked", [5, 4, 3, 2])` and see the tests fail: (a) clicking the entry of Choice 3 sets its `aria-pressed` to `"true"` and the others' to `"false"`, adds `has-highlight` to `.line-graph`, and makes `polyline[data-choice-id="c3"]` the last polyline with class `is-highlighted` while no other polyline has it; no polyline carries a `stroke-width` attribute; (b) clicking it again removes the class, the pressed state and `has-highlight`; (c) clicking Choice 1 then Choice 2 leaves exactly one pressed entry (Choice 2); (d) Escape `keydown` on the highlighted entry clears it and is `defaultPrevented`; Escape on an entry while nothing is highlighted is not `defaultPrevented`; (e) with a time selected by `pointerdown` on the SVG, clicking an entry keeps `.line-graph-crosshair` and the readout time, and the highlighted line's marker is the last `circle.line-graph-marker` and has class `is-highlighted`; (f) with `SiteConfig` stubbed to a 40 ms refresh interval, the highlight and the focused entry (by `data-choice-id`) survive a tick; (g) a `mouseover` / `pointerenter` on an entry changes nothing; (h) closing and re-maximizing starts with no pressed entry; (i) moving focus from the focused plot to a legend entry (`entry.focus()`) keeps the crosshair, and from there to a `.line-graph-segment` clears it; a `pointerdown` on a legend entry followed by the plot's blur with no `relatedTarget` also keeps it; (j) `localStorage.length`, `sessionStorage.length` and `document.cookie` are the same after a highlight as before it (contracts/ui.md U4, U5, FR-019)
- [X] T007 [US2] In `src/public/lineGraph.js`: (a) add `toggleHighlight(choiceId)`: set `state.highlightId` to `null` when it equals `choiceId`, else to `choiceId`; call `applyHighlight()` then `renderSvg()`; (b) add `applyHighlight()`: toggle the class `has-highlight` on the `.line-graph` root (keep it as `state.rootEl`, set in `mount`) and set every legend entry's `aria-pressed` from `state.highlightId`; call it at the end of `renderLegend`; (c) each legend entry gets a `click` listener calling `toggleHighlight` and a `keydown` listener that, on Escape while `state.highlightId` is that entry's id, calls `preventDefault`, `stopPropagation` and `toggleHighlight`; (d) in `renderSvg`, drop the `'stroke-width': 2` attribute, draw the polylines of `drawnSeries()` with the highlighted one last and give it the class `line-graph-line is-highlighted`; in `placeCrosshair`, build the markers in the same order and give the highlighted one `line-graph-marker is-highlighted`; (e) in `render`, before `renderLegend`, set `state.highlightId = null` when no series of `drawnSeries()` has that id; T006 passes (R5)
- [X] T008 [P] [US2] In `src/public/line-graph-m3.css`: add `stroke-width:2` to `.line-graph-line` and `.line-graph-line.is-highlighted{ stroke-width:4; }`; `.line-graph.has-highlight .line-graph-line:not(.is-highlighted), .line-graph.has-highlight .line-graph-marker:not(.is-highlighted){ opacity:0.25; }`; `.line-graph.has-highlight .line-graph-legend-entry[aria-pressed="false"]{ opacity:0.6; }`; `.line-graph-legend-entry[aria-pressed="true"]{ background:var(--md-sys-color-secondary-container); color:var(--md-sys-color-on-secondary-container); }` (contracts/ui.md U7)

**Checkpoint**: `npx vitest run tests/line-graph-many-lines.test.ts tests/line-graph-ui.test.ts tests/m3-assets.test.ts` passes.

---

## Phase 5: User Story 3 - A crowded graph starts with its ten leading lines (Priority: P3)

**Goal**: more than 10 lines draw the 10 leaders; "Show all N choices" / "Show top 10 choices" switches.

**Independent Test**: a 12-line poll shows 10 entries and "Show all 12 choices"; a press shows 12 and "Show top 10 choices"; a 10-line poll has no button.

- [X] T009 [US3] In `tests/line-graph-many-lines.test.ts`, add `describe("top 10")` and see the tests fail: (a) `seedRanked("Crowded", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])` draws 10 polylines and 10 legend entries, Choice 12 first and Choice 3 last, and a visible `button.line-graph-show-all` reading "Show all 12 choices"; (b) a click draws 12 of each and the button reads "Show top 10 choices"; a second click returns to 10; (c) `seedRanked("Ten", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])` draws 10 and the button is `hidden`; (d) after "Show all", a refresh tick (40 ms `SiteConfig` stub) and a scale click keep 12 drawn; closing and re-maximizing draws 10; (e) with a time selected, clicking the button keeps `.line-graph-crosshair` and the readout time, and the marker count equals the polyline count before and after; (f) after "Show all", highlighting Choice 1 (ranked 12th) then clicking "Show top 10 choices" leaves no pressed entry, no `has-highlight` and 10 polylines; (g) the live region after focusing the plot names 10 choices before "Show all" and 12 after; (h) with all four of a poll's choices tied for share (`[2, 2, 2, 2]`) the order is choice order; (i) a refresh whose stubbed response holds 10 series hides the button, and when a line was highlighted and that response no longer holds it, no entry is pressed and `has-highlight` is gone; (j) `localStorage.length`, `sessionStorage.length` and `document.cookie` are the same after "Show all" as before it (contracts/ui.md U2, U6, spec clarification 1, FR-019)
- [X] T010 [US3] In `src/public/lineGraph.js`: in `mount`, create `state.showAllEl = el('button', 'line-graph-show-all')` with `type = 'button'`, `hidden = true`, and a `click` listener that flips `state.showAll` and calls `render()`; append it, in a `div.line-graph-controls-start`, before `state.scalesEl` in a `div.line-graph-controls` placed after the plot; add `renderShowAll()`: hide it when `state.data.series.length <= TOP_LINES`, else show it with the text `'Show all ' + state.data.series.length` or `'Show top ' + leadingCount()`, each followed by `' choices'` (`leadingCount()`: the lines reaching 80% of the current shares, with ties of the last one, 10 at most; TWEAK06); call it from `render` after `renderLegend`, and hide the button in `renderNote`; register `.line-graph-show-all` and `.line-graph-legend-entry` with `window.M3Ripple?.add` beside `.line-graph-segment`; T009 passes (R7)
- [X] T011 [P] [US3] In `src/public/line-graph-m3.css`: add `.line-graph-show-all` as an M3 outlined button (`appearance:none; justify-self:start; position:relative; overflow:hidden; height:24px; padding:0 12px; margin:0; border:1px solid var(--md-sys-color-outline); label-small type since TWEAK06; border-radius:var(--md-sys-shape-corner-full); background:transparent; cursor:pointer; color:var(--md-sys-color-primary);` label-large typescale tokens), `[hidden]{ display:none }`, and add it to the `::before` state-layer and `:focus-visible` selector lists (contracts/ui.md U7)

**Checkpoint**: `npx vitest run tests/line-graph-many-lines.test.ts tests/line-graph-ui.test.ts tests/m3-assets.test.ts` passes.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T012 [P] In `ARCHITECTURE.md`, in the line-graph paragraph (the one beginning "`lineGraph.js` draws hand-rolled SVG"): replace "a legend with each line's current share and the vote total" by the readout row and the legend of buttons; replace the sentence "A pointer over the plot places a crosshair, ringed markers and a rich tooltip at the nearest bucket with every line's share and the time…" by one saying the crosshair and markers are placed and the readout row and the legend show the time and every drawn line's share at it; add that the series are ordered by current share in the browser, that the first 10 are drawn until "Show all N choices", that a legend button highlights one line (drawn last, wider, the rest dimmed in CSS), and that a press or focus move to the legend or the show-all button keeps the selected time (R10)
- [X] T013 [P] In `README.md`, in the "Vote history graph" bullet: say that touching or pointing at the graph shows the time and each choice's share at it in the legend, that tapping a choice in the legend highlights its line, and that a poll with more than 10 lines shows the 10 leading ones with **Show all**; do not reference any other project document (R10)
- [X] T014 Run `npx tsc --noEmit` and `npm test`; all pass; `grep -rn "line-graph-tooltip\|tooltipTimeText\|positionTooltip" src tests` finds nothing
- [ ] T015 Manual: the developer runs quickstart.md steps 1–13 at 360 px and at desktop width, light and dark (SC-001–SC-006, contracts/ui.md U7)

---

## Dependencies & Execution Order

- T001 → T002 first: every story reads `drawnSeries()` and the share order.
- US1: T003 → T004; T005 (CSS) any time after T002.
- US2 needs US1's legend buttons: T006 → T007 after T004; T008 after T005 (same file).
- US3: T009 → T010 after T007 (same files; test (f) needs the highlight); T011 after T008.
- T012, T013 any time after T010; T014 after everything; T015 last.

## Parallel Example

```text
US1: T005 (line-graph-m3.css) alongside T003 → T004 (test file, lineGraph.js).
Polish: T012 (ARCHITECTURE.md) and T013 (README.md) together.
```

## Implementation Strategy

- MVP: Phases 2–3 (order + readout): the covered plot, the overflow and the duplicate list are gone.
- Then US2 (highlight) and US3 (top 10), each a passing checkpoint; Polish last.
