---

description: "Task list for Fixed Width 640"
---

# Tasks: Fixed Width 640

**Input**: Design documents from `specs/20261117-050854-FIXED-WIDTH-640/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/viewport.md, contracts/breakpoints.md,
quickstart.md

**Tests**: The plan names them (research R7) and they are updated before the code they check: the viewport table and
sequences (contract V1–V5) in `tests/client-viewport-width.test.ts`, and the query literals and the single-boundary
guard (contract B1–B3) in the sheet tests. The appearance (B5, B6) is checked by hand with quickstart.md, since jsdom
has no layout.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)

## Path Conventions

Single project at the repository root: `src/public/`, `tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: A green baseline and the "before" pictures the unchanged-width checks compare against.

- [X] T001 Run `npx tsc --noEmit` and `npm test` from the repository root and confirm both pass before changing anything (record any pre-existing failure in specs/20261117-050854-FIXED-WIDTH-640/quickstart.md instead of fixing it)
- [X] T002 With the site running from the feature branch `481-640px` as it is before T012 (not from `main`), take the "before" screenshots listed in the Prerequisites of specs/20261117-050854-FIXED-WIDTH-640/quickstart.md (home page and admin page at 320, 360, 390, 430, 479, 768 and 1280 px) and keep them outside the repository

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: One phone boundary at 640 px inclusive (research R3, R5; contract B1–B3). Every story needs it: without
it a 640 px page shows the wide layout. The sheets and scripts move together in T012–T016, because a half-moved
boundary shows a mixed layout.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests first (they fail until T012–T016)

- [X] T003 In tests/phone-sheets.test.ts set `PHONE_QUERY` to `"(max-width: 640px)"`, update the file's header comment, keep the `.page` `min-width:480px` assertion, and add a test "one phone boundary" that reads every `.css` and `.js` file in `src/public` and expects none to contain `639.98px`, `max-width: 480px`, `max-width:480px` or `min-width: 640px` (contract B1)
- [X] T004 [P] In tests/helpers/phone-page.ts set `PHONE_LAYOUT_QUERY` to `"(max-width: 640px)"` and update its doc comment; in tests/helpers/single-column-page.ts replace `PHONE_QUERY` and `PHONE_LAYOUT_QUERY` by the one query `"(max-width: 640px)"`, which matches when `phone` or `phoneLayout` is set (`phone` alone still decides the 900 px tablet query), and update the `phoneLayout` doc comment; then review the helper's callers, which now get the phone layout whenever `phone` is true: tests/client-back-to-top.test.ts, tests/client-create-poll-item.test.ts, tests/client-fixed-chrome.test.ts, tests/client-header-fit.test.ts, tests/client-home-menu-item.test.ts, tests/client-phone-card.test.ts, tests/client-site-settings.test.ts, tests/client-tab-bar-scroll.test.ts and tests/essential-choices.test.ts, changing only an assertion that expected the older single-column behaviour at `phone: true` without `phoneLayout`
- [X] T005 [P] In tests/single-column-sheets.test.ts set `PHONE_BLOCK` to `"@media (max-width: 640px){"` and change the two quoted queries at the `--tab-edge` and `.container` assertions (lines 174 and 178) to `640px`
- [X] T006 [P] In tests/single-row-header-sheet.test.ts set `WIDE_BLOCK` to `"@media not all and (max-width: 640px){"` and reword the test title "between 640 and 767 px" to "between 641 and 767 px"
- [X] T007 [P] Change the quoted `639.98px` queries to `640px` in tests/header-fixed-sheet.test.ts (2), tests/back-arrow-sheet.test.ts, tests/back-to-top-sheet.test.ts, tests/client-footer.test.ts, tests/client-search-tab-field.test.ts, tests/admin-search-assets.test.ts, tests/tab-bar-assets.test.ts (`max-width:640px`, no space) and tests/m3-assets.test.ts (the two maximize-hint queries, lines 354–355)
- [X] T008 [P] In tests/legal-pages.test.ts change the two patterns to `@media (min-width: 640.02px)` and `@media (max-width: 640px)` and reword the test title to "above 640px … at 640px and below"
- [X] T009 [P] In tests/client-admin-wizard.test.ts make the `matchMedia` stub match `"(max-width: 640px)"`, and in tests/client-phone-card.test.ts update the header comment's query
- [X] T010 [P] Add to tests/client-phone-card.test.ts a test that `pollCard.js` contains no `isSingleColumn`, `singleColumnBarLayout`, `SINGLE_COLUMN_` or `--single-column`, and to tests/single-column-sheets.test.ts a test that `single-column-m3.css` does not set `--single-column` (contract B3); remove any existing assertion in those files or in tests/helpers/single-column-page.ts that expects the marker
- [X] T011 Run `npx vitest run tests/phone-sheets.test.ts tests/single-column-sheets.test.ts tests/single-row-header-sheet.test.ts tests/legal-pages.test.ts` and confirm the changed assertions fail for the expected reason (the old literals are still in `src/public`)

### The boundary

- [X] T012 Change `@media (max-width: 480px)` to `@media (max-width: 640px)` in src/public/m3-tokens.css, src/public/phone-m3.css, src/public/phone-card-m3.css and src/public/phone-admin-m3.css, changing no declaration inside the blocks (contract B2)
- [X] T013 Change every `max-width: 639.98px` / `max-width:639.98px` to `640px`, keeping each file's spacing, in src/public/admin.css, src/public/back-arrow-m3.css, src/public/back-to-top-m3.css, src/public/footer-m3.css, src/public/header-fixed-m3.css (2), src/public/header-single-column-m3.css, src/public/header-tab-bar-m3.css (2), src/public/legal-m3.css, src/public/pollCard-m3.css (2), src/public/single-column-m3.css (2, the nested `--tab-edge` one included), src/public/site.css and src/public/tabs.css
- [X] T014 Change `@media not all and (max-width: 639.98px)` to `@media not all and (max-width: 640px)` in src/public/header-single-row-m3.css, and `@media (min-width: 640px)` to `@media (min-width: 640.02px)` in src/public/legal-m3.css
- [X] T015 Set `PHONE_LAYOUT_QUERY` to `'(max-width: 640px)'` in src/public/pollCard.js, the query in `isPhoneLayout()` to `"(max-width: 640px)"` in src/public/adminCard.js, and `PHONE_QUERY` to `"(max-width: 640px)"` in src/public/headerFit.js (contract B3)
- [X] T016 In src/public/pollCard.js delete `isSingleColumn()`, `singleColumnBarLayout()`, `SINGLE_COLUMN_BAR_HEIGHT`, `SINGLE_COLUMN_GAP` and the comment above them, delete `defaultBarLayout` and use `measuredBarLayout` where it was used (the `layoutFor` initial value and the reset in the maximize toggle); delete `:root{ --single-column:1; }` from src/public/single-column-m3.css (research R6)
- [X] T017 Run `npx tsc --noEmit` and `npm test`; every suite passes, the new "one phone boundary" guard included

**Checkpoint**: A desktop window of 640 px or less shows the phone layout; a device under 480 px is unchanged; a
device held 481–639 px is still laid out at its own width, now in the phone layout.

---

## Phase 3: User Story 1 - A visitor on a mid-width device gets the phone layout (Priority: P1) 🎯 MVP

**Goal**: A device held 481–639 px wide is laid out 640 px wide and scaled to fit, in the phone layout, with content
filling the frame.

**Independent Test**: quickstart §2, home-page items, at 481, 540, 600 and 639 px: `width=640`, identical arrangement,
cards 608 px wide, no sideways scrolling, the phone card behaviour.

### Tests for User Story 1 (write first, they fail until T020)

- [X] T018 [US1] In tests/client-viewport-width.test.ts replace the single `FIXED` constant by `FIXED_480 = "width=480"` and `FIXED_640 = "width=640"`, keep the under-480 rows, and add a `describe` "on a screen held between 481 and 639 px" with the portrait rows 481 × 900, 540 × 720, 600 × 960 and 639 × 900 expecting the content to be exactly `width=640` (so no `initial-scale`, `minimum-scale`, `maximum-scale` or `user-scalable` beside it on a non-iOS agent) and the root's two `text-size-adjust` properties at `100%` (contract V1, V3, V5)
- [X] T019 [US1] In tests/client-viewport-width.test.ts add the iOS cases: a 320 × 568 iPhone user agent in landscape gives `width=640, maximum-scale=0.8875`, and the existing 390 portrait case still gives `width=480, maximum-scale=0.8125`; a non-iOS agent gets no `maximum-scale` at either width (contract V4)

### Implementation for User Story 1

- [X] T020 [US1] In src/public/viewportWidth.js replace `FIXED_WIDTH` by a function `fixedWidth()` returning 480 when `heldWidth() < 480`, 640 when it is above 480 and below 640, and 0 otherwise; make `fixedContent(width)` build `width=<width>` and the iOS `maximum-scale` from that width, and `apply()` use `fixedWidth()` for both the content and the `text-size-adjust` decision (research R1, R2; contract V1, V3, V4)
- [X] T021 [US1] Run `npx vitest run tests/client-viewport-width.test.ts`; T018 and T019 pass and no earlier case regresses
- [ ] T022 [US1] Work through the home-page items of quickstart §2 at 481 × 900, 540 × 720, 600 × 960 and 639 × 900 (compact header, tab bar, 608 px cards, leaders, Vote opening the maximized view, notes, fixed header, 15 px smallest text, 48 px buttons, both color schemes), add to §2 and check the item "pinch zoom works on a non-iOS device or in device mode", and record the result in specs/20261117-050854-FIXED-WIDTH-640/quickstart.md
- [ ] T023 [US1] For each defect T022 finds (an element still capped or centred at 420 px, an edge not at 16 px, a width-dependent value of research R8), fix it in the phone layer that owns the element (src/public/phone-m3.css or src/public/phone-card-m3.css) in a way that leaves the 480 px page's computed styles unchanged: prefer a width-relative value that computes to the same result at 480 px; only when none exists, put the rule in one `@media (min-width: 480.02px) and (max-width: 640px)` block at the end of that phone layer, record the exception in quickstart.md, and update the "one block each" assertion of tests/phone-sheets.test.ts to allow exactly that block (contract B2); add its assertion to tests/phone-sheets.test.ts; if T022 finds none, record "no defect" in quickstart.md

**Checkpoint**: The home page on a mid-width device is the phone layout in a 640 px page.

---

## Phase 4: User Story 2 - Phones and wide screens are unchanged, and turning a device follows (Priority: P1)

**Goal**: Under 480 px and over 640 px nothing changes; turning a device moves between the 480 px page, the 640 px
page and the device's own width.

**Independent Test**: quickstart §3 and §5.

### Tests for User Story 2

- [X] T024 [US2] In tests/client-viewport-width.test.ts extend the "480 px wide or wider" cases with 640 × 900 portrait (device content) and both reporting styles of 568 landscape (`width=640`), and keep 480 × 900, 768 × 1024, 844 landscape and 1920 × 1080 on the device content with no `text-size-adjust` on the root, and add one case without `screen.orientation`: a 320 × 568 screen with `window.orientation = 90` gives `width=640` (contract V1, V3)
- [X] T025 [US2] In tests/client-viewport-width.test.ts add the three sequences of contract V2 (320 × 568: `width=480` → `width=640` → `width=480`; 390 × 844: `width=480` → device → `width=480`; 600 × 960: `width=640` → device → `width=640`), each driven by the orientation `change`, `resize` and `pageshow` events, and assert that an event which does not change the decision causes no attribute mutation, and that the root's `text-size-adjust` stays set across a 480 ↔ 640 transition

### Implementation for User Story 2

- [X] T026 [US2] Run `npx vitest run tests/client-viewport-width.test.ts`; if T024 or T025 fails, correct `apply()` in src/public/viewportWidth.js so that the meta is rewritten whenever the wanted content differs and the root properties follow whether any fixed width is in force
- [ ] T027 [US2] Work through quickstart §3 (turning, with a maximized view and a wizard in progress surviving each turn; add to §3 and check the item "the layout follows each turn within one second, with no reload") and §5 (320, 360, 390, 430, 479 px, 480 × 900, 768 and 1280 px against the T002 screenshots) and record the result in specs/20261117-050854-FIXED-WIDTH-640/quickstart.md; any difference at an unchanged width is a defect to trace to T012–T016 or T023 and fix there

**Checkpoint**: Stories 1 and 2 both hold; the feature is shippable for the home page.

---

## Phase 5: User Story 3 - Every other page uses the same frame (Priority: P2)

**Goal**: The legal, sign-in, account and Poll Administration pages show the phone layout in the same 640 px page.

**Independent Test**: quickstart §2, the "each of" and admin items, at 600 × 960.

- [ ] T028 [US3] Work through the remaining items of quickstart §2 at 600 × 960 for privacy, terms, login, create account, confirm sign-in, accept terms, not authorized, invite, profile and settings (content 608 px wide, the same header, no sideways scrolling, both color schemes) and record the result in specs/20261117-050854-FIXED-WIDTH-640/quickstart.md
- [ ] T029 [US3] Work through the admin items of quickstart §2 at 600 × 960: the search form, the result rows and an opened admin card 608 px wide, and the wizard's phone footer and brief summary on create and on edit; record the result in specs/20261117-050854-FIXED-WIDTH-640/quickstart.md
- [ ] T030 [US3] For each defect T028 or T029 finds, fix it in the phone layer that owns the element (src/public/phone-m3.css for the page frame, legal and sign-in pages; src/public/phone-admin-m3.css for Poll Administration) in the form T023 allows (a width-relative value first, otherwise the single `(min-width: 480.02px) and (max-width: 640px)` block at the end of the layer, recorded in quickstart.md), and add its assertion to tests/phone-sheets.test.ts; if none, record "no defect" in quickstart.md

**Checkpoint**: Every page of the site is the phone layout on a mid-width device.

---

## Phase 6: User Story 4 - A narrow desktop window gets the phone layout (Priority: P3)

**Goal**: A desktop window of 481–640 px shows the phone layout fitted to the window; 641 px and wider shows the wide
layout.

**Independent Test**: quickstart §6.

- [ ] T031 [US4] Work through quickstart §6 in a desktop browser without device mode (700 → 481 px, exactly 640 and 641 px, below 480 px), on the home page, a legal page and the admin page, and record the result in specs/20261117-050854-FIXED-WIDTH-640/quickstart.md
- [ ] T032 [US4] For each defect T031 finds (a sideways scrollbar between 481 and 640 px, a wide-layout rule still applying at exactly 640 px), fix the query or rule in the sheet that owns it under `src/public/` per contract B1 and extend the "one phone boundary" guard in tests/phone-sheets.test.ts if a literal escaped it; if none, record "no defect" in quickstart.md

**Checkpoint**: All four stories hold.

---

## Phase 7: Removal of the older phone rules (FR-019)

**Purpose**: Prune the declarations in the former `639.98px` blocks that a phone layer overrides (research R6,
contract B4). It changes no computed style; it is done last so that it can be reverted alone.

- [X] T033 Take screenshots of the home page and the admin page at 600 × 960 and at 390 × 844 (quickstart §7, "just before")
- [X] T034 For each declaration inside the re-labelled `(max-width: 640px)` blocks of src/public/single-column-m3.css, src/public/header-single-column-m3.css, src/public/site.css, src/public/tabs.css, src/public/admin.css, src/public/header-fixed-m3.css, src/public/header-tab-bar-m3.css, src/public/back-arrow-m3.css, src/public/back-to-top-m3.css and src/public/footer-m3.css, apply the four conditions of contract B4 against src/public/phone-m3.css, src/public/phone-card-m3.css, src/public/phone-admin-m3.css and the phone block of src/public/m3-tokens.css, and list in specs/20261117-050854-FIXED-WIDTH-640/research.md (a table under R6: sheet, selector, property, the phone-layer rule that overrides it) only the declarations that meet all four; a declaration in doubt is left out of the list
- [X] T035 Delete the declarations listed by T034 from their sheets, then any rule left empty and any media block left empty; do not delete src/public/single-column-m3.css or src/public/header-single-column-m3.css, and leave src/public/legal-m3.css and src/public/pollCard-m3.css as T013–T014 left them
- [X] T036 Remove or rewrite the assertions that quoted a deleted declaration in tests/single-column-sheets.test.ts, tests/header-fixed-sheet.test.ts, tests/back-arrow-sheet.test.ts, tests/back-to-top-sheet.test.ts, tests/client-footer.test.ts, tests/admin-search-assets.test.ts, tests/tab-bar-assets.test.ts and tests/client-search-tab-field.test.ts, keeping every assertion about a declaration that stays
- [X] T037 Run `npx tsc --noEmit` and `npm test`, then repeat the T033 screenshots ("just after") and compare: no difference at either width (quickstart §7); a difference means a listed declaration was not overridden, so restore it and correct the T034 table

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: The documentation deliverables (research R10) and the final run.

- [X] T038 [P] Update ARCHITECTURE.md: the viewport rule section (two fixed widths, the decision diagram with the 481–639 branch, the iOS guard from the width in force) and the phone layout section (`max-width: 640px`, the sentence about 481 to 639 px and the older rules replaced by the single boundary, `--single-column` and `isSingleColumn()` removed, the legal Back arrow "above 640 px")
- [X] T039 [P] Update README.md line 144 ("On a phone"): a phone is laid out 480 px wide, and a small tablet, folding phone or small phone held sideways 640 px wide, each scaled to fit the screen; do not reference any specification document
- [X] T040 [P] Update CLAUDE.md (the block between the SPECKIT markers: mark this feature's decisions as implemented and correct the phone layout redesign's bullets "`@media (max-width: 480px)` only", "`matchMedia("(max-width: 480px)")`" and "`--single-column` stays for 481–639 px") and the matching entries of CLAUDE_COMPLETE.md
- [X] T041 Run `npx tsc --noEmit` and `npm test` a last time, work through quickstart §4 on an iPhone or the simulator where available (record "not available" otherwise), and fill the Outcome table of specs/20261117-050854-FIXED-WIDTH-640/quickstart.md
- [X] T042 TWEAK01: in src/public/pollCard.js a card that hides choices returns to its results side when the maximized view closes on its voting side (the selection is kept), and the card's Back redraws the ballot, so no ballot is left behind the results side; tests in tests/client-phone-card.test.ts (written, run postponed)
- [X] T043 TWEAK02: in src/public/pollCard.js the phone layout's result bars are `RESULTS_MIN_BAR_HEIGHT` (25 px) tall, on the compact card and in the maximized view, at both fixed widths; the two bar-height tests in tests/client-phone-card.test.ts expect 25 px (run postponed); ARCHITECTURE.md and CLAUDE_COMPLETE.md say 25 px
- [X] T044 TWEAK03: the phone layout's result bars are 28 px tall (`PHONE_BAR_HEIGHT` in src/public/pollCard.js), and the "More choices" and "Show all" rows are 48 px tall with a 32 px outline (`min-height:48px` in src/public/phone-card-m3.css); tests in tests/client-phone-card.test.ts and tests/phone-sheets.test.ts (run postponed); ARCHITECTURE.md and CLAUDE_COMPLETE.md say 28 px
- [X] T045 TWEAK04: the phone layout's result bars are 30 px tall (`PHONE_BAR_HEIGHT` in src/public/pollCard.js), and the "More choices" and "Show all" rows are 52 px tall with a 36 px outline (`min-height:52px` in src/public/phone-card-m3.css); the tests of T044 expect the new values (run postponed); ARCHITECTURE.md and CLAUDE_COMPLETE.md say 30 px
- [X] T046 TWEAK05: the phone layout's voting rows are 52 px tall with a 44 px visible bar (`PHONE_VOTE_ROW_HEIGHT` in src/public/pollCard.js; the 4 px borders in src/public/phone-card-m3.css are unchanged); tests in tests/client-phone-card.test.ts and tests/phone-sheets.test.ts expect 52 px (run postponed); ARCHITECTURE.md and CLAUDE_COMPLETE.md say 52 px
- [X] T047 TWEAK06: the phone layout's footer text is 4 px larger than the small text (`font-size:calc(var(--md-sys-typescale-body-small-size) + 4px)` on `.site-footer` in src/public/phone-m3.css, 19 px); test in tests/phone-sheets.test.ts (run postponed)
- [X] T048 TWEAK07: in src/public/tabs.js a maximized view opened from the notes line in the phone layout is scrolled (`revealNotes`) until the card's action row is under the fixed header, when the extras tab bar would start below the middle of the screen, and again when the notes arrive; three tests in tests/client-phone-view.test.ts (run postponed); ARCHITECTURE.md and quickstart step 2e updated
- [X] T049 TWEAK08: the phone layout's avatar menu items have `min-height:36px` (src/public/phone-m3.css; the tab menu's items stay 64 px); tests in tests/phone-sheets.test.ts (run postponed); ARCHITECTURE.md updated
- [X] T050 TWEAK09: the phone layout's tab menu items have `min-height:36px` too, in the one rule they share with the avatar menu's items in src/public/phone-m3.css; test in tests/phone-sheets.test.ts (run postponed); ARCHITECTURE.md updated

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none; T002 must be done before T012.
- **Foundational (Phase 2)**: after Setup; blocks every story.
- **US1 (Phase 3)**: after Phase 2.
- **US2 (Phase 4)**: after US1 (it tests and checks the script US1 changes, in the same test file).
- **US3 (Phase 5)** and **US4 (Phase 6)**: after Phase 2 for the desktop-window checks; their device checks need US1's T020.
- **Removal (Phase 7)**: after every story's checks, so that it starts from a verified layout.
- **Polish (Phase 8)**: after Phase 7.

### Within Each Phase

- Tests before the code they check (T003–T011 before T012–T016; T018–T019 before T020; T024–T025 before T026).
- T012–T016 are one change: commit them together.
- T018, T019, T024 and T025 edit the same file, so they are sequential.
- A fix task (T023, T030, T032) follows its check task and is empty when the check finds nothing.

### Parallel Opportunities

- T004–T010 touch different test files and can be done together after T003.
- T028, T029 and T031 are independent checks once T020 is in.
- T038–T040 touch different documents.

## Parallel Example: Phase 2 tests

```text
T004 tests/helpers/phone-page.ts, tests/helpers/single-column-page.ts
T005 tests/single-column-sheets.test.ts
T006 tests/single-row-header-sheet.test.ts
T007 the eight sheet tests that quote 639.98px
T008 tests/legal-pages.test.ts
T009 tests/client-admin-wizard.test.ts, tests/client-phone-card.test.ts
```

## Implementation Strategy

### MVP First (Phases 1–4)

1. Setup, then the boundary (Phase 2): desktop windows already show the phone layout up to 640 px.
2. US1: the 640 px fixed width; check the home page.
3. US2: prove nothing else moved. **Stop and validate**: this is shippable.

### Incremental Delivery

4. US3 and US4: the remaining pages and the desktop window, checks with fixes only where needed.
5. Removal: a separate commit, revertible alone.
6. Documents.
