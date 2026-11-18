# Implementation Plan: Wide More Choices

**Branch**: `641px+` | **Date**: 2026-11-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261117-131915-WIDE-MORE-CHOICES/spec.md`

## Summary

At 641 px and up a poll card stops scrolling its choices. A card whose bars do not fit shows the leaders that fit
and a "More choices" row that opens the maximized view; the maximized view takes the phone layout's "Show all" and
"Show fewer choices" rows; Vote on a card whose ballot does not fit opens the maximized view on its voting side; and
"Show more" on the notes opens the view positioned at the notes under the card's Vote row. The phone layout does not
change.

- The capacity of a card is the number the existing floor computation gives, so only cards that scroll today change
  (R1). A new pure function, `fittingChoices`, gives the places to the viewer's own choices first, then the leaders
  (R2). The row is sized as one more bar (R3).
- A card with no height (a hidden grid) shows everything, and the grid re-renders its cards when it returns (R4).
- Each side of the card is judged by its own room (R5).
- The maximized view's rows and the notes step lose their phone-only tests (R6, R8); clicking a bar or the notes box
  stays phone-only (R7).
- The wide rows are styled in one block of `pollCard-m3.css` that cannot match at 640 px or less (R9).
- The scrolling code, markup and rules are removed (R10). Tests first (R11); documents after (R12).

**Two corrections the developer should know about.**

1. *The voting side can have more room than the results side* (R5). The notes box is on the front face only.
   FR-014, as first clarified, said every card that shows the row also has a ballot that does not fit; the spec now
   says either side may hold every choice while the other does not, which is what "each side decides for itself"
   already meant. A poll with notes can therefore show "More choices" and still turn over in place.
2. *The phone rows have no chevron* (R9). The requirements report (UA4) said "the same shape, colours and chevron";
   the chevron belongs to "Show more". None is added, and FR-008 says "outlined shape and colours".

## Technical Context

**Language/Version**: browser JavaScript (plain scripts, no modules, no bundler) and CSS, as the rest of
`src/public/`; tests in TypeScript ^5.8 on Node ≥ 22.

**Primary Dependencies**: none new.

**Storage**: N/A, nothing stored on the server or in the browser.

**Testing**: Vitest with jsdom through `tests/helpers/single-column-page.ts`; wrap heights are stubbed, since jsdom
has no layout (R11); file-reading tests for the template and the sheets; appearance and real scrolling by hand with
the quickstart.

**Target Platform**: every browser at viewport widths of 641 px and up.

**Project Type**: web service (Express) serving static pages.

**Performance Goals**: no added request, file or listener; one `clientHeight` read per wrap per render, as today.

**Constraints**: the phone layout is unchanged (FR-018): `phone-card-m3.css` is not edited and the phone's code
paths keep their tests; cards that fit are unchanged (FR-002); M3 layers hold only M3 tokens and no literal font
size (`m3-assets.test.ts`); every phone query stays `max-width: 640px` and the wide side
`not all and (max-width: 640px)` (`phone-sheets.test.ts`); no console logging in the browser (Constitution V); no
explanatory comments in new code, and comments in the regions changed are brought into line (Constitution VI).

**Scale/Scope**: `pollCard.js` about 190 lines removed and 60 added; `tabs.js` 4 lines; `pollCard.css` about 50
lines removed; `pollCard-m3.css` about 10 removed and 35 added; `single-column-m3.css` 1 line removed; 1 new test
file and 4 touched; 4 documents after implementation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Think before coding | Pass | Product choices settled in the requirements report (8 findings) and two clarifications; technical points in research R1–R12; the two places where the code contradicts earlier wording are stated in the summary, and the spec is corrected, rather than silently resolved. |
| II. Simplicity first | Pass | The existing capacity computation and the phone's view states are reused; one new 6-line function; no setting, sheet or abstraction is added; more code is removed than written. |
| III. Surgical changes | Pass | Only the scrolling code this feature orphans is removed (R10); `.bar-scroll-*` names and the phone layer are left alone; `phoneResultsView` and `hiddenChoiceCount` are renamed because their meaning changes. |
| IV. Goal-driven execution | Pass | Contracts W1–W9 are tests written before the code; W10 is the quickstart, with before/after screenshots for the unchanged cases. |
| V. Quality and maintainability | Pass | Single-purpose functions (`capacity`, `fittingChoices`, `ballotFits`, `ballotOpensMaximized`, `resultsView`); nothing logged in the browser. |
| VI. Self-documenting code | Pass | No comment is added; the scrolling comments go with their code; the comment above `.bar-scroll-wrap` is trimmed to what stays true. |
| Documentation deliverables | Pass | `README.md` and `ARCHITECTURE.md` after implementation (R12). |

Post-design re-check: unchanged, all pass. No Complexity Tracking entry.

## Project Structure

### Documentation (this feature)

```text
specs/20261117-131915-WIDE-MORE-CHOICES/
├── plan.md              # This file
├── research.md          # R1–R12
├── data-model.md        # derived values, in-memory fields, the wide card's states; nothing stored
├── quickstart.md        # automated commands and the by-hand checklist
├── contracts/
│   └── ui.md            # W1 fittingChoices, W2 card, W3 opening, W4 voting, W5 maximized, W6 notes,
│                        # W7 phone unchanged, W8 styles, W9 removed, W10 by hand
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/public/pollCard.js           # fittingChoices, capacity, resultsView, ballotFits; scrolling removed (R1–R7, R10)
src/public/tabs.js               # notesAsked and revealNotes at every width; restore() re-renders (R4, R8)
src/public/pollCard.css          # arrow rows, dragging and list scrolling removed (R10)
src/public/pollCard-m3.css       # arrow rows out of the state layers; the wide rows' block (R9, R10)
src/public/single-column-m3.css  # one arrow-row rule removed (R10)

tests/client-wide-card.test.ts   # new: W1–W5
tests/client-phone-card.test.ts  # the three "outside the phone layout" cases (W5, W7)
tests/client-maximized.test.ts   # arrow-row assertion removed; W6
tests/poll-card-assets.test.ts   # arrow-row assertions replaced by W9; W8
tests/single-column-sheets.test.ts  # only if it pins the removed rule

README.md, ARCHITECTURE.md, CLAUDE.md, CLAUDE_COMPLETE.md   # after implementation (R12)
```

**Structure Decision**: the existing single project; no file is added to or removed from `src/public/`, so no page
head and no `LAYER_ORDER` changes.

## Phases for `/speckit-tasks`

1. **Tests first**: W1 (`fittingChoices`), then W2–W5 on a card with stubbed heights, W6 on the grid, W8 and W9 on
   the files; the phone file's three wide cases updated. They fail before the code.
2. **Story 1, the card**: `capacity`, `fittingChoices`, `resultsView`, the row as one more bar, the `.more-row`
   click, the wide rows' styles; `restore()` re-renders.
3. **Story 3, voting**: `ballotFits`, `ballotOpensMaximized`, the flipped card that stops fitting. It comes before
   the removal so that no card is ever left with a ballot that neither fits nor scrolls.
4. **Removal**: the scrolling code, markup and rules (R10), with quickstart §1 and §2.
5. **Story 2, the maximized view**: the phone tests come off the view and the show-all handler.
6. **Story 4, the notes**: `requestMaximizedNotes`, `notesAsked`, `revealNotes`.
7. **Check by hand**: quickstart §1–§7, the phone before and after.
8. **Documents**: `README.md`, `ARCHITECTURE.md`, `CLAUDE.md`, `CLAUDE_COMPLETE.md`.

## Complexity Tracking

None.
