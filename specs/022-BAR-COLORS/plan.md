# Implementation Plan: Bar Colors

**Branch**: `dev` (no dedicated branch) | **Date**: 2026-09-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/022-BAR-COLORS/spec.md`

## Summary

Every poll card starts its palette colours at entry 1, so a grid of cards looks themed. 022 starts
each card at an entry derived from the poll's id: `paletteOffsetFor(pid)` (32-bit FNV-1a, modulo
50) is computed once in `initPollCard` and passed to `renderPollResults`, whose
`assignResultColors(data, paletteOffset)` starts its cursor there and wraps. Colours still follow
display order, Yes/No keep their fixed colours and consume no entry, and everything that derives
from a fill (`BAR_COLORS` tints, inks, the clipped copy) follows unchanged. Client-only: one new
function and one new parameter in `src/public/pollCard.js`, plus tests and documentation.

## Technical Context

**Language/Version**: JavaScript (browser, classic script) for `src/public/pollCard.js`; TypeScript 5.8 for tests; Node 22

**Primary Dependencies**: none new

**Storage**: N/A (no stored data changes; `data-model.md`)

**Testing**: Vitest + supertest + jsdom (`tests/helpers/browser.js`) on an embedded PostgreSQL

**Target Platform**: evergreen browsers; the server is untouched

**Project Type**: web application (Express server + static client under `src/public/`)

**Performance Goals**: one hash of a ~36-character string per card mount; no per-render cost

**Constraints**: identical result in every browser (integer arithmetic only); no server, route, `postman/openapi.json`, configuration or database change

**Scale/Scope**: every poll card on every tab; up to 50 bars per card

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | Assumptions are stated in the spec and research; the one real choice (rank vs choice) was put to the developer (NC-1 → A) | Pass |
| II. Simplicity First | One pure function and one parameter; no configuration, no stored value, no collision handling | Pass |
| III. Surgical Changes | Only `assignResultColors`, `renderPollResults`'s signature, its one caller and `initPollCard` change; the two comments made false by the change are corrected, nothing else | Pass |
| IV. Goal-Driven Execution | FR-009 and research R7 define the tests first; SC-001–SC-006 are measurable | Pass |
| V. Code Quality | Single-purpose function; total over any input (R4); no logging needed | Pass |
| VI. Self-Documenting Code | The only new comment points to the external FNV reference; no spec or feature numbers in `src/` | Pass |
| Documentation Deliverables | `README.md` and `ARCHITECTURE.md` updated in place, without references to `specs/` or `designDocs/` | Pass |

Post-design re-check (after Phase 1): unchanged, all pass. No Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/022-BAR-COLORS/
├── spec.md
├── plan.md              # this file
├── research.md          # R1–R7
├── data-model.md        # no stored change; the derived offset
├── quickstart.md        # automated run + Q1–Q9 manual checks
├── contracts/
│   └── ui-contracts.md  # C1 the start rule; amends 021's "Palette" row
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/public/
└── pollCard.js          # + paletteOffsetFor(pid); assignResultColors(data, paletteOffset);
                         #   renderPollResults(..., layoutFor, paletteOffset); initPollCard computes it once

tests/
└── client-bar-colours.test.ts   # fixed ids, offset-aware expectations, wrap, distribution, maximized

README.md                                            # bar colours differ from poll to poll
ARCHITECTURE.md                                      # "Result bar colours": the start rule
specs/021-MAXIMIZED-POLL-CARD/contracts/ui-contracts.md   # "Palette" row points to 022
```

**Structure Decision**: the existing single web application; the change lives entirely in the
client script that already owns bar colours, `src/public/pollCard.js`.

## Design notes

- **`paletteOffsetFor(pid)`** sits beside `assignResultColors`. Non-string or empty → `0`. Otherwise
  FNV-1a over `pid.charCodeAt(i)`, `>>> 0`, `% RESULTS_COLOR_PALETTE.length` (research R1, R4).
- **`assignResultColors(data, paletteOffset)`**: `let paletteIndex = paletteOffset;` and the existing
  `RESULTS_COLOR_PALETTE[paletteIndex++ % RESULTS_COLOR_PALETTE.length]`. Inside it, the two
  statements made false (Maybe "gets palette color 1"; the modulo "can't actually wrap") are removed,
  and the true comments around them stay (R3, R6).
- **`renderPollResults(wrap, list, upRow, downRow, data, layoutFor, paletteOffset)`** passes it to
  `assignResultColors`. Both the rebuild and the in-place path already colour from that one array.
- **`initPollCard`**: `const paletteOffset = paletteOffsetFor(opts.pid);` next to `layoutFor`; `render()`
  passes it. The maximized view moves this same instance (021 R1), so it keeps the offset (R2).
- **Unchanged**: `renderVotingOptions`, `BAR_COLORS`, `syncInkOnFill`, `setFillWidth`, the palette, the
  semantic rules, and every server file (R5).

## Complexity Tracking

None.
