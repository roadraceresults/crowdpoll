# Implementation Plan: Adaptive Y Axis for the Line Graph

**Branch**: `pop-poll-2` (no dedicated branch) | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261101-150208-ADAPTIVE-Y-AXIS/spec.md`

## Summary

The maximized poll view's line graph stops fixing its Y axis at 0–100%.
`renderSvg()` in `src/public/lineGraph.js` takes the highest point of the lines it draws for the scale shown, picks
the smallest of 25, 50, 75 and 100 at or above it, and builds `y()`, the gridlines and the labels from that top:
every 5, 10 or 15% for a 25, 50 or 75% top, every 25% for 100%, exactly as today (R1–R3).
Because `renderSvg()` runs on every open, scale switch, refresh and resize, the top follows the data with no new
state; the crosshair markers use the same `view.y`, and the tooltip keeps the real percentages (R4, R5).
Contract C5 of POLL-LINE-GRAPH is amended (R6). No server, route, data, setting or stylesheet change.

## Technical Context

**Language/Version**: browser JavaScript (ES2020, no bundler) in `src/public/lineGraph.js`; tests in TypeScript
(Vitest + jsdom).

**Primary Dependencies**: none new; hand-rolled SVG as today.

**Storage**: none.

**Testing**: Vitest + jsdom through `tests/helpers/browser.ts`, in `tests/line-graph-ui.test.ts`, seeding
`vote_history` so each of the four tops occurs (R7).

**Target Platform**: current desktop and mobile browsers; the maximized poll view on `index.html`.

**Project Type**: web application (Express server + vanilla browser client); browser-only change.

**Performance Goals**: no added request; one pass over the drawn points per draw (at most choices × buckets, a few
thousand numbers).

**Constraints**: a graph whose top is 100% must render exactly as today (FR-007); no new comments explaining the
code (Constitution VI).

**Scale/Scope**: one function in one file (about 10 changed lines), one contract paragraph, new tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | 6 requirements findings resolved; assumptions listed in the spec | Pass |
| II. Simplicity First | a pure helper and a changed loop; no setting, no state, no server work (R1, R4) | Pass |
| III. Surgical Changes | only `renderSvg()` and a new helper beside it; `placeCrosshair()` untouched (R5) | Pass |
| IV. Goal-Driven Execution | each top, its labels and the unchanged tooltip are asserted in tests (R7) | Pass |
| V. Code Quality | single-purpose helper `axisTopFor(series)`; no logging added | Pass |
| VI. Self-Documenting Code | names carry the meaning; no comment citing the feature | Pass |
| Security / Privacy | no data, request or log change | Pass |
| Performance | no request; O(points) per draw | Pass |
| Documentation Deliverables | README's "Vote history graph" and ARCHITECTURE's line-graph section gain one sentence each after implementation | Pass (task) |

Re-check after Phase 1: unchanged, all pass.

## Project Structure

### Documentation (this feature)

```text
specs/20261101-150208-ADAPTIVE-Y-AXIS/
├── plan.md              # This file
├── research.md          # R1–R7
├── data-model.md        # the axis, derived per draw; nothing stored
├── quickstart.md        # validation guide
├── contracts/
│   └── ui-contracts.md  # C1 axis top, C2 gridlines and labels, C3 redraws, C4 amended POLL-LINE-GRAPH C5
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/public/
└── lineGraph.js                       # renderSvg(): top, y(), gridlines, labels; new axisTopFor()

tests/
└── line-graph-ui.test.ts              # new cases for each top, labels, tooltip, redraws

specs/20261027-151601-POLL-LINE-GRAPH/contracts/ui-contracts.md   # C5 sentence amended
README.md, ARCHITECTURE.md                                        # one sentence each, after implementation
```

**Structure Decision**: the existing single project; the change is confined to the browser module that draws the
graph, as the requirements' UA4 resolved.

## Complexity Tracking

None.
