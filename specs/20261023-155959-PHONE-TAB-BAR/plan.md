# Implementation Plan: Phone Tab Bar

**Branch**: `dev` (no dedicated branch) | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261023-155959-PHONE-TAB-BAR/spec.md`

## Summary

Up to 900 px the home page's tab bar becomes Polymarket's: row tabs (a 16 px icon beside the label, at least 48 px
tall; since TWEAKS03 to TWEAKS05 the 11 px label wraps to its longest word and the tabs are as tall as the tallest, R3), no scroll arrows, a 32 px fade at an edge where tabs wait, the browser's own touch scrolling with smooth
programmatic moves, a mouse wheel that scrolls the row sideways, and Refresh and the All tabs menu swapped under the
bar. The approach (research R1–R10): one 900 px block in `single-column-m3.css` for every phone tab rule, the edge
masks' width as `--tab-fade`, `scroll-behavior:smooth` on the row (instant while dragging and under reduced motion),
the arrows deleted from markup, styles and `tabBarScroll.js`, a wheel handler and a pen-capable drag in that script,
and a two-line change in `tabs.js` so the keyboard scrolls like a tap. Above 900 px nothing changes.

## Technical Context

**Language/Version**: browser scripts in plain JavaScript (ES2017, no build step), CSS layers; TypeScript tests.

**Primary Dependencies**: none new; the browser's `scroll-behavior`, `scrollIntoView`, `touch-action`, CSS masks and
`matchMedia`, all already used by the page.

**Storage**: N/A (in-memory classes on the tab bar, `data-model.md`).

**Testing**: Vitest with jsdom: `tests/helpers/single-column-page.ts` (the stubbed home page with a faked tab bar
geometry) for behaviour, and the stylesheet tests (`single-column-sheets`, `client-tabs-026`, `tab-bar-assets`) for the
rules.

**Target Platform**: phones and small tablets up to 900 px, in every browser the site already serves; desktops unchanged.

**Project Type**: web app, client-side change on one page.

**Performance Goals**: the fade and the smooth scroll are compositor work (a mask and native scrolling); no script runs
per frame any more (the hold loop goes).

**Constraints**: no new stylesheet, script, route, setting or dependency; the desktop bar is unchanged above 900 px
(FR-014); `tabBarScroll.js` keeps its name and place in the script list.

**Scale/Scope**: `index.html` (two buttons removed), `tabBarScroll.js` (about half of it removed, a wheel handler
added), `tabs.js` (two lines in `moveTabFocus`), `header-tab-bar-m3.css` (three mask rules read a variable),
`single-column-m3.css` (the phone tab rules rewritten into one block), one test helper line, four test files, amendment
notes in the 030 and 031 documents.

## Constitution Check

| Principle | Check | Status |
|---|---|---|
| I. Think before coding | The two scripts, both layers, the fixed-chrome measurement and every test that names the arrows were read before deciding (R1–R10); the one width question (gating the wheel) is decided and recorded (R6) | Pass |
| II. Simplicity first | Smoothness is one CSS declaration, not animation code; the hold and step animation is deleted, not rewritten; no new file | Pass |
| III. Surgical changes | `tabs.js` changes in one function; `header-tab-bar-m3.css` changes three literals to a variable; the card question's 900 px block and the avatar menu's `--tab-label-scale` are left alone; the duplicated phone tab rules go only because they are being replaced | Pass |
| IV. Goal-driven | Every contract (C1–C7) has a stylesheet or jsdom test named in R10, and quickstart §2 is the phone check | Pass |
| V. Code quality | The script shrinks to three concerns (drag, wheel, menu); no browser console output | Pass |
| VI. Self-documenting code | No explanatory or requirement-referencing comments are added; comments in the regions removed go with them | Pass |
| Security, privacy | No request, storage or logging change | Pass |
| Documentation deliverables | README/ARCHITECTURE regenerated in the final tasks phase | Pass (to carry into tasks) |

Post-design re-check: all pass; no Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/20261023-155959-PHONE-TAB-BAR/
├── spec.md
├── plan.md                      # this file
├── research.md                  # R1–R10
├── data-model.md                # the row's in-memory state
├── quickstart.md
├── contracts/
│   └── ui-contracts.md          # C1–C7
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/public/
├── index.html                   # the two .tab-scroll buttons removed (R7)
├── tabBarScroll.js              # arrows, hold, step and settle removed; drag for mouse and pen; wheel handler; menu kept (R5–R7)
├── tabs.js                      # moveTabFocus: focus({ preventScroll }) then scrollIntoView (R4)
├── header-tab-bar-m3.css        # masks read var(--tab-fade, 24px) (R2)
└── single-column-m3.css         # phone block loses its tab rules; one 900 px block: --tab-fade, --tab-label-scale,
                                 # row tab, label wrapped to its longest word, ≥ 48 px, 16 px icons, scroll-behavior, scroll-padding, swapped buttons (R1–R4, R8)
tests/
├── helpers/single-column-page.ts   # matchMedia answers "(max-width: 900px)" like the phone query (R6)
├── client-tab-bar-scroll.test.ts   # arrows and hold removed; pen drag, wheel, menu without scrollIntoView (R10)
├── single-column-sheets.test.ts    # the new tab bar and Refresh row rules (R10)
└── client-tabs-026.test.ts         # keyboard scrolls the focused tab into view; mask variable (R10)
specs/030-INTEGRATE-SINGLE-COLUMN/, specs/031-SINGLE-ROW-HEADER/   # "Amended by" notes where the arrows are described (R7)
```

**Structure Decision**: the existing single project; no file is added or renamed.

## Complexity Tracking

No violations to justify.
