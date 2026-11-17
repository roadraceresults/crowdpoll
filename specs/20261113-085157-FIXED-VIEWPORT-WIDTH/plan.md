# Implementation Plan: Fixed Viewport Width Trial

**Branch**: `phone-uiux` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261113-085157-FIXED-VIEWPORT-WIDTH/spec.md`

## Summary

On a mobile device held narrower than 480 px, lay every page out 480 px wide and let the browser scale it to fit; leave
every other device as today. As a trial, judged by a written checklist:

- One new synchronous script, `src/public/viewportWidth.js`, on the line after `colorScheme.js` in the head of all 13
  pages. The static viewport meta line does not change (R1).
- The script measures the screen as held (the shorter side in portrait, the longer in landscape, the orientation taken
  from the device, not from the viewport's shape) and, below 480, rewrites the meta's content to `width=480`; otherwise
  it restores the page's own content (R2, R3).
- It decides again on `resize`, `pageshow` and the screen's orientation change, writing only when the decision
  changes (R4).
- While the fixed width applies it sets `text-size-adjust: 100%` on the root element, so browsers do not enlarge text
  blocks on their own (R5).
- No style sheet, breakpoint, existing script, route or setting changes (R6). Two new test files (R8).
- `quickstart.md` is the trial's checklist and records its outcome.

## Technical Context

**Language/Version**: browser JavaScript (plain script, no modules, no bundler), as the rest of `src/public/`; tests in
TypeScript ^5.8 on Node ≥ 22.

**Primary Dependencies**: none new.

**Storage**: N/A — nothing stored, server or browser.

**Testing**: Vitest with jsdom through `tests/helpers/browser.ts` (`openPage`, `beforeScripts`) for the script's
decisions; a file-reading test for the 13 heads; the scaling itself by hand (quickstart §2–§5), since jsdom has no
layout.

**Target Platform**: mobile browsers (Chrome on Android, Safari on iOS); desktop browsers ignore the viewport meta.

**Project Type**: web service (Express) serving static pages.

**Performance Goals**: the script runs before first paint and is a few hundred bytes; one extra same-origin request
per page, served by `express.static` like `colorScheme.js`.

**Constraints**: no change to existing sheets or scripts (FR-013); no setting (FR-012); no storage, cookie or
third-party request (FR-014); no console logging in the browser (Constitution V); no comments beyond external
references (Constitution VI); zoom never restricted (FR-005).

**Scale/Scope**: 1 new script (about 30 lines), 13 one-line page edits, 2 new test files, 2 documents after
implementation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Think before coding | Pass | Every product choice settled in the requirements report (9 findings) and the spec; technical points in research R1–R9, the unconfirmed ones marked "to verify" with a quickstart step. |
| II. Simplicity first | Pass | One small script and a one-line head edit; no setting, no server code, no CSS; the existing synchronous head script is the pattern followed. |
| III. Surgical changes | Pass | Each page changes by one inserted line; no existing sheet, script or test is edited. |
| IV. Goal-driven execution | Pass | Contract V1–V5 are tests written first; the trial's own pass conditions are quickstart §6. |
| V. Quality and maintainability | Pass | A single-purpose file, separate from `colorScheme.js`; nothing logged to the browser console; a browser without the orientation API falls back, and without scripts shows today's page. |
| VI. Self-documenting code | Pass | Names carry the meaning (`FIXED_WIDTH`, `heldWidth`, `apply`); no explanatory comments. |
| Documentation deliverables | Pass | `ARCHITECTURE.md` after implementation; `README.md` only if the outcome is "kept" (R9). |

Post-design re-check: unchanged, all pass. No Complexity Tracking entry.

One point for the reader: R5 adds a `text-size-adjust` declaration, set by the script on narrow devices only. It is
what FR-015 asks for; FR-013 forbids changing the site's existing style sheets, and none changes.

## Project Structure

### Documentation (this feature)

```text
specs/20261113-085157-FIXED-VIEWPORT-WIDTH/
├── plan.md              # This file
├── research.md          # R1–R9
├── data-model.md        # the two viewport states and their transitions; nothing stored
├── quickstart.md        # the trial's checklist and outcome
├── contracts/
│   └── viewport.md      # V1 page heads, V2 decision table, V3 re-applying, V4 text size, V5 what it never does
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/public/viewportWidth.js              # new: FIXED_WIDTH, heldWidth(), apply(), three listeners
src/public/*.html (13 files)             # one inserted line each, after the colorScheme.js line
tests/client-viewport-width.test.ts      # new: contract V2–V5 in jsdom
tests/viewport-width-pages.test.ts       # new: contract V1 over the 13 files
ARCHITECTURE.md, CLAUDE_COMPLETE.md      # after implementation (R9)
```

**Structure Decision**: the existing single project; one new file in `src/public/` and two in `tests/`.

## Complexity Tracking

None.
