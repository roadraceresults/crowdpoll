# Implementation Plan: Fixed Width 640

**Branch**: `481-640px` | **Date**: 2026-11-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261117-050854-FIXED-WIDTH-640/spec.md`

## Summary

A device held between 481 and 639 px wide is laid out 640 px wide and scaled to fit, and shows the phone layout that
narrower phones already have. Phones under 480 px and viewports over 640 px do not change.

- `viewportWidth.js` chooses between two fixed widths, 480 (held under 480) and 640 (held 481–639); the rest of the
  technique, the iOS guard included, uses the width in force (R1, R2).
- Every media query that reads 480 px or 639.98 px is re-labelled to one boundary, 640 px inclusive. A viewport of
  640 px or less then matches exactly the blocks a 480 px viewport matches today, so the 480 px page is unchanged and
  the 640 px page is the same layout by construction, not by inspection (R3).
- The content fills the 640 px frame with the rules the phone layers already have; no new rule is expected (R4).
- `pollCard.js`, `adminCard.js` and `headerFit.js` ask `(max-width: 640px)` (R5).
- The `--single-column` marker and its script code are removed, and the older phone declarations that a phone layer
  overrides are pruned in a last, behaviour-neutral phase (R6).
- No page, route, setting, cookie or stored data changes (R9). Tests first (R7); documents after (R10).

**One deviation the developer should know about (R6).** The requirements' Resolved Findings (AM2) first said the older
481–639 px rules become unreachable and named `single-column-m3.css` and `header-single-column-m3.css` for deletion
(`requirements.md` and FR-019 have since been corrected to what follows).
The sheets show otherwise: the `639.98px` blocks also apply at 480 px and less, and the phone layout depends on part
of them (hiding the header's navigation and search, the one-column grid, cards that grow, the search tab's field),
and both files also hold rules used outside the range (the tab bar up to 900 px). So the files stay, the blocks are
re-labelled, and only overridden declarations are deleted (contract B4). The spec's outcome (FR-019: no viewport shows
the older layout) is met.

## Technical Context

**Language/Version**: browser JavaScript (plain scripts, no modules, no bundler) and CSS, as the rest of
`src/public/`; tests in TypeScript ^5.8 on Node ≥ 22.

**Primary Dependencies**: none new.

**Storage**: N/A, nothing stored on the server or in the browser.

**Testing**: Vitest with jsdom through `tests/helpers/browser.ts` for `viewportWidth.js` and the client scripts;
file-reading tests for the sheets' queries and declarations; the appearance by hand with the quickstart, since jsdom
has no layout.

**Target Platform**: mobile browsers (Chrome on Android, Safari on iOS) for the fixed width; every browser for the
boundary; desktop browsers ignore the viewport meta.

**Project Type**: web service (Express) serving static pages.

**Performance Goals**: no added request or file; the viewport script stays a synchronous head script of a few
hundred bytes; a turn of the device switches layout without a reload (SC-004).

**Constraints**: the 480 px page and the wide layout above 640 px render exactly as before (FR-021); no declaration
value in the phone layers changes except a defect found at 640 px (B2), fixed with a width-relative value that is
the same at 480 px or, failing that, in one `(min-width: 480.02px) and (max-width: 640px)` block at the end of the
owning phone layer; M3 layers hold only M3 tokens
(`m3-assets.test.ts`); no console logging in the browser (Constitution V); no explanatory comments (Constitution VI).

**Scale/Scope**: 1 script reworked (`viewportWidth.js`, about 10 lines), 3 one-line script edits, about 15 lines of
script removed from `pollCard.js`, 22 media queries re-labelled in 17 sheets, a bounded pruning in the re-labelled
blocks, about 18 test files and helpers touched, 4 documents after implementation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Think before coding | Pass | Product choices settled in the requirements report (10 findings) and the spec; technical points in research R1–R10; the one place where the code contradicts the requirements' wording (R6) is stated in the summary rather than silently resolved. |
| II. Simplicity first | Pass | Re-labelling queries instead of copying or rewriting rules; no new sheet, setting or abstraction; the width choice is one small function. |
| III. Surgical changes | Pass | Phone-layer declarations are not touched (B2). The pruning removes only what this feature orphans (declarations made dead by the widened query), by a written rule (B4), and nothing else in those sheets. |
| IV. Goal-driven execution | Pass | Contracts V1–V5 and B1–B4 are tests updated before the code; B5 and B6 are the quickstart's checks, with before/after screenshots for the unchanged widths and for the pruning. |
| V. Quality and maintainability | Pass | One boundary literal instead of two, guarded by a test; dead script code removed; nothing logged in the browser. |
| VI. Self-documenting code | Pass | Names carry the meaning (`fixedWidth`, `PHONE_LAYOUT_QUERY`); the comment above the removed single-column code goes with it; no comment is added. |
| Documentation deliverables | Pass | `ARCHITECTURE.md` and `README.md` after implementation (R10). |

Post-design re-check: unchanged, all pass. No Complexity Tracking entry.

## Project Structure

### Documentation (this feature)

```text
specs/20261117-050854-FIXED-WIDTH-640/
├── plan.md              # This file
├── research.md          # R1–R10
├── data-model.md        # the three viewport states and the two layouts; nothing stored
├── quickstart.md        # the device checklist and its outcome
├── contracts/
│   ├── viewport.md      # V1 decision table, V2 re-applying, V3 text size, V4 iOS, V5 what it never does
│   └── breakpoints.md   # B1 queries, B2 phone layers, B3 scripts, B4 pruning rule, B5 the 640 px page, B6 unchanged
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/public/viewportWidth.js            # FIXED_WIDTH → fixedWidth(held): 480, 640 or none (R1, R2)
src/public/pollCard.js                 # PHONE_LAYOUT_QUERY 640; single-column code removed (R5, R6)
src/public/adminCard.js                # isPhoneLayout() asks 640 (R5)
src/public/headerFit.js                # PHONE_QUERY 640 (R5)

src/public/m3-tokens.css               # phone type scale: 480 → 640 (R3)
src/public/phone-m3.css                # query 480 → 640
src/public/phone-card-m3.css           # query 480 → 640
src/public/phone-admin-m3.css          # query 480 → 640

src/public/single-column-m3.css        # 639.98 → 640 (2); --single-column removed; pruning (R6)
src/public/header-single-column-m3.css # 639.98 → 640; pruning
src/public/header-single-row-m3.css    # not all and (max-width: 640px)
src/public/header-fixed-m3.css         # 639.98 → 640 (2); pruning
src/public/header-tab-bar-m3.css       # 639.98 → 640 (2); pruning
src/public/legal-m3.css                # 639.98 → 640; min-width 640 → 640.02
src/public/pollCard-m3.css             # 639.98 → 640 (2)
src/public/back-arrow-m3.css           # 639.98 → 640; pruning
src/public/back-to-top-m3.css          # 639.98 → 640; pruning
src/public/footer-m3.css               # 639.98 → 640; pruning
src/public/admin.css                   # 639.98 → 640; pruning
src/public/site.css                    # 639.98 → 640; pruning
src/public/tabs.css                    # 639.98 → 640; pruning

tests/client-viewport-width.test.ts    # V1–V5
tests/phone-sheets.test.ts             # B1, B2 and the new single-boundary guard
tests/single-column-sheets.test.ts, single-row-header-sheet.test.ts, header-fixed-sheet.test.ts,
tests/back-arrow-sheet.test.ts, back-to-top-sheet.test.ts, client-footer.test.ts,
tests/client-search-tab-field.test.ts, admin-search-assets.test.ts, legal-pages.test.ts,
tests/tab-bar-assets.test.ts, m3-assets.test.ts, client-admin-wizard.test.ts, client-phone-card.test.ts
tests/helpers/phone-page.ts, tests/helpers/single-column-page.ts

ARCHITECTURE.md, README.md, CLAUDE.md, CLAUDE_COMPLETE.md   # after implementation (R10)
```

**Structure Decision**: the existing single project; no file is added to or removed from `src/public/`, so no page
head and no `LAYER_ORDER` changes.

## Phases for `/speckit-tasks`

1. **Tests first**, before the code each checks: the query literals and the single-boundary guard (B1–B3); the
   viewport table and sequences (V1–V5).
2. **The boundary**: re-label the sheets and the three scripts in one step, since a half-moved boundary shows a
   mixed layout (Stories 1, 3 and 4); the `--single-column` marker and its script code go in the same step, being
   dead the moment the phone query is 640 px. It comes before the viewport rule so that a device given `width=640`
   never shows the wide layout.
3. **The viewport rule**: `viewportWidth.js` (Stories 1 and 2).
4. **Check at 640 px**: quickstart §2–§6; fix only defects, in the phone layer that owns the element.
5. **Removal**: the pruning by B4, with quickstart §7 before and after.
6. **Documents**: `ARCHITECTURE.md`, `README.md`, `CLAUDE.md`, `CLAUDE_COMPLETE.md`.

## Complexity Tracking

None.
