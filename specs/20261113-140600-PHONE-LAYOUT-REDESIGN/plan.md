# Implementation Plan: Phone Layout Redesign

**Branch**: `phone-uiux` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261113-140600-PHONE-LAYOUT-REDESIGN/spec.md`

## Summary

Give every phone (laid out at exactly 480 px) a layout designed for it, and remove the Poll Results page:

- **Removal first**: the Results page, its page route, its data route, both exports, their service functions, the
  admin card's two entry points, and their tests, OpenAPI entries and documents (R13).
- **Sizing**: the typescale tokens × 1.25 under `@media (max-width: 480px)` in `m3-tokens.css`, `label-small` held at
  the 15 px floor (R2); 64 px touch targets by a transparent halo on 48 px controls, or 64 px rows (R3).
- **Three new last-loaded layers**: `phone-m3.css` (frame and shared card frame, every page), `phone-card-m3.css`
  (home), `phone-admin-m3.css` (admin); the old 480, 360 and 320 px blocks are deleted; 481 px and wider is untouched
  (R1, R11, R12).
- **Compact card**: `essentialChoices` picks the four leaders (all if five or fewer) plus the viewer's own; a
  "more choices" row opens the maximized view; Vote flips in place or, when choices are hidden, opens the maximized
  view on its voting side (R4 to R7).
- **Maximized view**: the leaders above 2%, ten at most, with "Show all" (TWEAK05), or every choice at 1% or more when opened from the "More choices" row (TWEAK07), extras behind a tab bar and fetched when first shown (TWEAK01), the card as tall
  as the visible side, and a Submit bar fixed at the bottom while voting (R8, R9).
- **Back**: at every width a view opened from a card pushes one history step, and every way of closing it consumes
  that step (R10).
- **Validation**: `quickstart.md` is the device checklist.

## Technical Context

**Language/Version**: browser JavaScript and CSS (plain scripts and sheets, no bundler) in `src/public/`; TypeScript
^5.8 on Node ≥ 22 for the server and tests.

**Primary Dependencies**: none new.

**Storage**: N/A — nothing stored; four routes removed.

**Testing**: Vitest with jsdom through `tests/helpers/browser.ts` and `tests/helpers/single-column-page.ts`
(`matchMedia` stubbed by query); static sheet tests reading `src/public/*.css`; supertest for the removed routes; the
layout itself by hand on devices and BrowserStack (`quickstart.md`).

**Target Platform**: phones in portrait (Safari on iOS, Chrome on Android, Samsung Internet), laid out at 480 px by
`viewportWidth.js`; every other device unchanged except Back.

**Project Type**: web service (Express) serving static pages.

**Performance Goals**: no new request on page load; the Who voted report and the graph are requested later than
today (on open) in the phone layout; three small sheets added.

**Constraints**: nothing changes at 481 px and wider except the history step (FR-001, FR-032); no new color, no
`prefers-color-scheme` (FR-007); Material 3 layers hold no literal font size, no comment, no token section; each
page's sheets follow `LAYER_ORDER`; poll access, vote and refresh rules unchanged (FR-025); `viewportWidth.js`
unchanged (FR-040); no comments beyond external references (Constitution VI).

**Scale/Scope**: 3 new sheets, 1 token block, 2 scripts changed substantially (`pollCard.js`, `tabs.js`), 2 lightly
(`adminCard.js`, `backToTopFab.js` or its sheet), 2 pages' markup (`index.html`, `admin.html`), 12 pages' sheet lists;
2 files and 4 routes deleted; about 5 new test files and 12 edited; 4 documents.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Think before coding | Pass | 14 findings resolved in the requirements report, one clarification in the spec; research R1 to R15; four points marked "to verify" with a task or quickstart step each. |
| II. Simplicity first | Pass, with one justified cost | One token block resizes every sheet; one pure function decides the bars; the Submit bar delegates to the card's own buttons. The cost is in Complexity Tracking. |
| III. Surgical changes | Pass | Old phone blocks are not edited (they still serve 481 to 639 px); only the three sub-480 threshold blocks named in R12 are deleted; the removal deletes exactly what R13 lists. |
| IV. Goal-driven execution | Pass | Contracts P, C, H and X are tests written first; SC-001 to SC-011 map to quickstart steps. |
| V. Quality and maintainability | Pass | `essentialChoices` and `isPhoneLayout` are single-purpose; history handling is in one place in `tabs.js`; nothing new is logged to the browser console. |
| VI. Self-documenting code | Pass | No explanatory comments in new code; the new sheets are comment-free, as their neighbours are tested to be. |
| Documentation deliverables | Pass | `README.md` and `ARCHITECTURE.md` after implementation (tasks in the last phase). |

Post-design re-check: unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/20261113-140600-PHONE-LAYOUT-REDESIGN/
├── plan.md              # This file
├── research.md          # R1–R15
├── data-model.md        # essentialChoices, card view state, history state, removed routes
├── quickstart.md        # the device checklist
├── contracts/
│   ├── phone-layout.md  # P1–P6: boundary, type, touch targets, frame, colors, unchanged
│   ├── poll-card.md     # C1–C5 and H1–H6: essential choices, card, vote, maximized, Submit bar, Back
│   └── removed-results.md   # X1–X4
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/public/m3-tokens.css                 # + phone typescale block
src/public/phone-m3.css                  # new: frame, card frame, card-shell and legal pages, 480 px minimum
src/public/phone-card-m3.css             # new: compact card, maximized view, extras rows, Submit bar
src/public/phone-admin-m3.css            # new: admin toolbar, tabs, search, card, wizard
src/public/pollCard.js                   # isPhoneLayout, essentialChoices, phone bar layout, more / show-all rows, Vote routing, onFace / onSelection
src/public/tabs.js                       # maximize(pid, options), extras headers and fetch-on-open, Submit bar, history step
src/public/index.html                    # extras headers in #maximizedCardGrid, #voteBar, two sheets
src/public/admin.html                    # icon-results symbol removed, two sheets
src/public/*.html (other 10)             # + phone-m3.css
src/public/adminCard.js                  # results icon, menu item and their two helpers removed
src/public/admin.css, pollCard.css, admin-card-m3.css, admin-search-m3.css   # sub-480 blocks and results-only rules removed
src/public/admin-results.html, adminResults.js    # deleted
src/routes/pages.ts, src/routes/pollsApi.ts, src/polls/service.ts, src/polls/access.ts, src/legal/termsGate.ts   # removal
postman/openapi.json                     # three paths and two schemas removed
tests/                                   # new: essential-choices, client-phone-card, client-maximized-history, phone-sheets, removed-results; edited: contract X3, m3-assets, client-maximized
README.md, ARCHITECTURE.md, CLAUDE_COMPLETE.md
```

**Structure Decision**: the existing single project; new files only in `src/public/` and `tests/`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| The phone layout overrides the old phone rules instead of replacing them | FR-001 keeps the old phone layout for 481 to 639 px, so its rules must stay and also match at 480 px | Deleting the old rules changes unscaled devices, which the requirements (NC1) chose not to do; narrowing each old block's query edits about 20 blocks and their pinned tests for a range that is meant to be left alone |
