# Implementation Plan: Line Graph Material 3

**Branch**: `line-graph-m3` | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261028-183546-LINE-GRAPH-M3/spec.md`

## Summary

Restyle the maximized view's line graph as Material 3 and make every line visible in both themes.
A colour with less than 3:1 contrast on the graph's surface is drawn in the nearest same-hue shade that reaches 3:1,
computed by one new pure function on `window.PollCard` from the helpers `pollCard.js` already has (R1, R2); the
surface is read from the container's computed background, and a dark-scheme `change` redraws (R3).
The scale selector becomes an M3 segmented button with roving focus (R4), the tooltip an M3 rich tooltip that flips
beside the crosshair (R5), lines get round joins and ringed markers and the 0 % line a stronger stroke (R6).
The plot becomes one Tab stop read with the arrow keys through a polite live region (R7), a touch-placed crosshair
stays until a tap outside (R8), and the crosshair survives a redraw (R9). No server, route, data or setting change.

## Technical Context

**Language/Version**: Browser JavaScript (ES2020, no bundler) and CSS; tests in TypeScript on Node ≥ 22

**Primary Dependencies**: none new; the existing `m3-tokens.css`, `m3-ripple.js`, `pollCard.js`

**Storage**: N/A (in-memory state only, [data-model.md](data-model.md))

**Testing**: Vitest + jsdom (`tests/helpers/browser.ts`), supertest for the served page

**Target Platform**: current desktop and mobile browsers; light and dark themes

**Project Type**: web application (Express server + vanilla browser client in `src/public/`)

**Performance Goals**: a redraw stays one SVG rebuild, as today; the colour walk is ≤ 100 steps per choice per draw
(≤ 50 choices)

**Constraints**: hand-rolled SVG; M3 tokens only in the sheet; no animation; 3:1 non-text contrast (WCAG 1.4.11)

**Scale/Scope**: 3 source files (`lineGraph.js`, `line-graph-m3.css`, `pollCard.js` — one export), 3 test files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Think Before Coding | Every requirement resolved in the requirements report (10 findings) and two clarifications; reversals of POLL-LINE-GRAPH R9 and its "no keyboard crosshair" clarification stated in the spec | Pass |
| II. Simplicity First | One exported function, no new module or dependency; no animation, no legend toggling | Pass |
| III. Surgical Changes | Only the graph's module and sheet, plus one export in `pollCard.js`; the bar colours untouched (FR-005) | Pass |
| IV. Goal-Driven Execution | Each contract C1–C6 has a test (R11) and the quickstart a hand check | Pass |
| V. Code Quality | Single-purpose functions (colour, placement, keys); a failed colour read falls back to the bar hex; no new console output | Pass |
| VI. Self-Documenting Code | Comments only for external references (M3 component specs, WCAG); none citing this feature | Pass |

Post-design re-check: unchanged, Pass.

## Project Structure

### Documentation (this feature)

```text
specs/20261028-183546-LINE-GRAPH-M3/
├── plan.md
├── research.md          # R1–R11
├── data-model.md        # in-memory state, crosshair states
├── quickstart.md
├── contracts/
│   └── ui-contracts.md  # C1–C6
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/public/
├── pollCard.js          # + PollCard.lineColorOn (C1)
├── lineGraph.js         # colours per theme, segmented button, tooltip placement, markers, keyboard, touch, redraw keeping (C2–C5)
└── line-graph-m3.css    # M3 restyle (C6)

tests/
├── client-line-colors.test.ts   # new (C1)
├── line-graph-ui.test.ts        # updated selectors + new cases (C2–C5)
└── m3-assets.test.ts            # + token-only check for line-graph-m3.css (C6)
```

**Structure Decision**: the existing single repository; client files under `src/public/`, tests under `tests/`.

## Complexity Tracking

No violations.
