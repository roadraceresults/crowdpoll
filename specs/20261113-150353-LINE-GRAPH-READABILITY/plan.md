# Implementation Plan: Line Graph Readability

**Branch**: `line-graph-fix` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261113-150353-LINE-GRAPH-READABILITY/spec.md`

## Summary

Make the maximized view's line graph readable with many lines, in `src/public/lineGraph.js` and
`src/public/line-graph-m3.css` only:

- **Readout**: the floating value box is deleted. A readout row above the legend shows "Latest" or the selected time,
  and the legend's percentages follow the selected time (R3). Entry widths do not depend on their values, so the plot
  never moves (R4).
- **Order and top 10**: the browser orders the series by current share (the response is in choice order, R2) and draws
  the leading ones (those reaching 80% of the shares, 10 at most, on a graph of more than 10 lines); an outlined
  button "Show all N choices" / "Show top M choices" switches (R7, R8).
- **Highlight**: legend entries become `aria-pressed` buttons; one line at a time is drawn last and wider while the
  rest are dimmed by CSS (R5).
- **Selection rules**: a press or focus move to the legend or the show-all button keeps the selected time, and a
  mouse click on the plot pins it as a touch does (R6).
- Tests: `line-graph-ui.test.ts` updated, new `line-graph-many-lines.test.ts` (R9). Docs: `ARCHITECTURE.md`,
  `README.md` (R10).

## Technical Context

**Language/Version**: plain browser JavaScript and CSS in `src/public/` (no framework, no bundler); TypeScript ^5.8
tests.

**Primary Dependencies**: none new.

**Storage**: none (five in-memory fields, see [data-model.md](data-model.md)).

**Testing**: Vitest + jsdom through `tests/helpers/browser.ts` (`tests/line-graph-ui.test.ts`, new
`tests/line-graph-many-lines.test.ts`), `tests/m3-assets.test.ts` for the sheet; layout checks by hand
([quickstart.md](quickstart.md)).

**Target Platform**: current desktop and phone browsers, 320 px wide and up.

**Project Type**: web application (server + static client in one repository).

**Performance Goals**: moving the selected time changes text nodes only (no legend rebuild); a highlight or show-all
press is one SVG redraw of at most `ENV_MAX_CHOICES` (50) polylines.

**Constraints**:
- `line-graph-m3.css` holds M3 tokens only, no literal font sizes (`m3-assets.test.ts`).
- Line and dot colors stay inline data from `card.resultColors()` / the response (FR-018).
- No cookie or storage key (FR-019); no server, route, `postman/openapi.json` or setting change.
- Keyboard reading and the live-region announcement keep working (FR-006).

**Scale/Scope**: about 120 changed lines of `lineGraph.js`, 80 of CSS, one updated and one new test file, two
documentation paragraphs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Think Before Coding | Pass | The report's 8 findings and 2 clarifications are resolved; R2 surfaces that the response is not in share order and R6 the one exception to "leaving the plot clears" |
| II. Simplicity First | Pass | Five state fields, one `drawnSeries()`, one `updateReadout()`; dimming is CSS; no setting, no storage, no new module |
| III. Surgical Changes | Pass | `lineGraph.js`, `line-graph-m3.css`, their tests, two doc paragraphs; `tabs.js`, `pollCard.js` and the server untouched |
| IV. Goal-Driven Execution | Pass | `contracts/ui.md` U1–U6 are the tests, written before the code in each story; U7 and SC-001–SC-003 are the manual quickstart |
| V. Code Quality | Pass | Single-purpose functions; no browser logging added |
| VI. Self-Documenting Code | Pass | Names carry the meaning (`drawnSeries`, `keepsSelection`, `toggleHighlight`); no requirement ids in comments |
| Security/Privacy | Pass | No data, request, cookie or storage key; labels are still written with `textContent` |
| Documentation Deliverables | Pass | `README.md` and `ARCHITECTURE.md` updated in the final phase |

Post-design re-check: Pass. No Complexity Tracking entry is needed.

## Project Structure

### Documentation (this feature)

```text
specs/20261113-150353-LINE-GRAPH-READABILITY/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/public/lineGraph.js               # order, drawn set, readout, highlight, show-all, selection rules
src/public/line-graph-m3.css          # readout row, legend buttons, dimming, show-all button; tooltip rules removed
tests/line-graph-ui.test.ts           # tooltip assertions → readout; legend markup
tests/line-graph-many-lines.test.ts   # new: top 10, button, order, highlight, keep/clear
ARCHITECTURE.md                       # the line graph paragraph
README.md                             # the "Vote history graph" bullet
```

**Structure Decision**: the existing single repository; one new test file, no new source file.

## Complexity Tracking

None.
