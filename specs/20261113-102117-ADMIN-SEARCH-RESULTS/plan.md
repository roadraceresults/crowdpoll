# Implementation Plan: Admin Search Results List

**Branch**: `admin-search` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261113-102117-ADMIN-SEARCH-RESULTS/spec.md`

## Summary

In the admin page's Search view, show each matching poll as a compact row instead of a full Admin Poll Card; selecting
a row opens that poll's unchanged card directly under it:

- The rows are list code in `adminList.js`: one `div.admin-result` per poll (a disclosure `<button>` and a panel), a
  `resultRows` map and one `openPid` (R1, R3). A card is created only when its row is opened and forgotten when it is
  closed (R5), so only the open poll requests its invitees.
- One card is open at a time; a search the administrator ran (Search, Clear, a view tab — all through `selectTab`)
  starts with every row closed and opens a single result by itself; the periodic refresh and card actions never open
  or close anything (R6, R8).
- While a card is being edited, every row, Search and Clear are disabled with "Finish editing the open poll first"
  (R7).
- The notice reads "N polls match." / "1 poll matches." (R9).
- Styles go in `admin-search-m3.css`, M3 tokens only (R11). The server, the contract and `adminCard.js` are untouched.
- **The list's width (R2, FR-003)**: the page is a 420 px column, where six facts cannot fit on one line. The results
  list is therefore `min(840px, 100%)` wide in the Search view: one card-like frame of two-line rows with zebra
  striping (tweaks.md, TWEAK01; one-line rows from 720 px were planned first); the open card keeps its 420 px.

## Technical Context

**Language/Version**: plain browser JavaScript, HTML and CSS in `src/public/` (no framework, no bundler); TypeScript
^5.8 on Node ≥ 22 for the tests only.

**Primary Dependencies**: none new. Uses the page's own `window.AdminCard`, `window.M3Ripple` and `tooltip-m3.js`.

**Storage**: none. No table, cache key, setting, cookie or browser storage entry.

**Testing**: Vitest ^3.2 with jsdom client tests through `tests/helpers/browser.ts`
(`tests/client-admin-search.test.ts`), the stylesheet assertions in `tests/admin-search-assets.test.ts`, and
`tests/m3-assets.test.ts` unchanged.

**Target Platform**: the admin page (`/admin`) in current desktop and phone browsers, light and dark schemes.

**Project Type**: web application (server + static client in one repository); this feature is client-only.

**Performance Goals**: 200 results draw as 200 small rows and at most one card; a refresh rewrites only changed cell
text and detaches nothing (SC-003, SC-005).

**Constraints**:
- `GET /api/admin/polls/search`, its response and `postman/openapi.json` do not change (FR-033).
- `adminCard.js` does not change; the Newest, Awaiting Approval and Rejected views and the creator-only page keep
  their cards (FR-031).
- M3 layers hold only M3 tokens; the admin page's stylesheet and script lists are unchanged (`m3-assets.test.ts`).
- The edit latch (`editingPid`) stays the single rule for holding the page.
- Browser logging stays minimal; the existing `[adminList]` count line is kept as it is.

**Scale/Scope**: about 150 lines of `adminList.js`, about 120 lines of CSS, no HTML change, tests, two
documentation paragraphs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Think Before Coding | Pass | 9 requirements findings and 1 clarification resolved; research R1–R13; the width conflict (R2) is surfaced, not hidden |
| II. Simplicity First | Pass | One map, one variable and one flag (`fresh`) on the existing loader; no server change, no new file |
| III. Surgical Changes | Pass | `adminList.js`, `admin-search-m3.css`, two test files, README, ARCHITECTURE; `adminCard.js` untouched |
| IV. Goal-Driven Execution | Pass | Each user story has jsdom tests against `contracts/ui.md` and quickstart steps for what jsdom cannot measure |
| V. Code Quality | Pass | Small single-purpose functions (build a result, paint its cells, open, close, hold); failures keep the existing notice |
| VI. Self-Documenting Code | Pass | Names follow the contract (`resultRows`, `openPid`, `admin-result-row`); one comment linking the APG disclosure pattern |
| Security/Privacy | Pass | Admin-only view as before; no new data reaches the browser; nothing new is logged or stored |
| Performance | Pass | Fewer cards and invitee requests than today |
| Documentation Deliverables | Pass | README and ARCHITECTURE updated in the final phase |

Post-design re-check: Pass. No Complexity Tracking entry is needed.

## Project Structure

### Documentation (this feature)

```text
specs/20261113-102117-ADMIN-SEARCH-RESULTS/
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
src/public/adminList.js                 # result rows, open/close, fresh loads, held list, count line
src/public/admin-search-m3.css          # the result row's styles
tests/client-admin-search.test.ts       # rows, open/close, single result, held, refresh, count, ARIA
tests/admin-search-assets.test.ts       # the row's CSS
README.md, ARCHITECTURE.md              # documentation phase
```

**Structure Decision**: every change sits in the two files that already implement the admin list and the search
panel's M3 layer; no file is added to `src/`.

## Complexity Tracking

None.
