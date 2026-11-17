---

description: "Task list for Wide More Choices"
---

# Tasks: Wide More Choices

**Input**: Design documents from `specs/20261117-131915-WIDE-MORE-CHOICES/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui.md, quickstart.md

**Tests**: The plan names them (research R11) and they are written before the code they check: contract W1–W6 in
`tests/client-wide-card.test.ts` and `tests/client-maximized.test.ts`, W8 and W9 in `tests/poll-card-assets.test.ts`.
The appearance and real scrolling (W10) are checked by hand with quickstart.md, since jsdom has no layout.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.
Story 3 (voting) comes before the removal of the scrolling code and before Story 2, as the plan orders them, so that
no card is ever left with a ballot that neither fits nor scrolls.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)

## Path Conventions

Single project at the repository root: `src/public/`, `tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: A green baseline and the "before" pictures the unchanged cases compare against.

- [X] T001 Run `npx tsc --noEmit` and `npm test` from the repository root and confirm both pass before changing anything (record any pre-existing failure in specs/20261117-131915-WIDE-MORE-CHOICES/quickstart.md instead of fixing it)
- [X] T002 With the site running from branch `641px+` as it is before T008, create the polls listed under "By hand" in specs/20261117-131915-WIDE-MORE-CHOICES/quickstart.md and take the "before" screenshots of the tab at 1280 px and 400 px wide; keep them outside the repository

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The test scaffolding every story's tests use.

- [X] T003 Create tests/client-wide-card.test.ts with the `poll(count, overrides)` and `mount(detail, options)` helpers of tests/client-phone-card.test.ts adapted to the wide layout: `openStubbedHome({ scripts: ["pollCard.js"], phone: false, phoneLayout: false })`, and a `heights: { results: number; voting: number }` option that, after `PollCard.mount` and before `applyPoll`, defines `clientHeight` (configurable getter) on `.results-scroll-wrap` and `.voting-scroll-wrap` of the card; add one passing case, "shows every bar of a twelve-choice poll when the wraps have no height" (12 result rows, no `.more-row`), which holds before and after the feature (research R4, R11)

**Checkpoint**: `npx vitest run tests/client-wide-card.test.ts` passes.

---

## Phase 3: User Story 1 - Reach the hidden choices without scrolling inside the card (Priority: P1) 🎯 MVP

**Goal**: A wide card whose bars do not fit shows the leaders that fit and a "More choices" row that opens the
maximized view.

**Independent Test**: quickstart §1–§3: cards that fit are unchanged; a 37-choice card shows bars and the row; the
row opens the maximized view; Back returns to the grid.

### Tests for User Story 1 (write first, see them fail)

- [X] T004 [P] [US1] In tests/client-wide-card.test.ts add `describe("fittingChoices")` covering every row of contract W1 in specs/20261117-131915-WIDE-MORE-CHOICES/contracts/ui.md through `window.PollCard.fittingChoices(sorted, ownIds, places)`, including that `shown` keeps share order, `shown.length <= places`, and `hiddenCount`/`hiddenShare`
- [X] T005 [US1] In tests/client-wide-card.test.ts add `describe("the wide card")` for contract W2 and W3 with a results wrap of 259 px (capacity 10: `floor((259 + 1) / 26)`): a 10-choice poll shows 10 rows and no `.more-row`; an 11- and a 37-choice poll show 9 rows and a last `.more-row` reading "More choices · p%" (p = the hidden choices' combined share), "More choices" on a `Multiple-Choice Poll`; the row's `li` has the result rows' `style.height` and the button the rows' label `font-size`; an own choice outside the leaders is the ninth row; with 12 own choices only the 9 with the highest share show; clicking `.more-row` records `["pid-1", { choices: "voted" }]`; clicking `.poll-notes-more` records `["pid-1", { open: "notes" }]`; clicking a `.result-row` or `.poll-notes` records nothing; the row count follows a changed height after `card.render()`; the `.more-row` is a `<button type="button">` that is not disabled and has no `tabindex="-1"` (what makes Enter and Space work, SC-005); with a results wrap of 25 px (capacity 1) or 10 px (capacity 0) the list holds the `.more-row` alone
- [X] T006 [P] [US1] In tests/poll-card-assets.test.ts add a case for contract W8: src/public/pollCard-m3.css has exactly one `@media not all and (max-width: 640px)` block naming `.card-face .more-row` and `.card-face .show-all-row`, with `border:1px solid var(--md-sys-color-outline-variant)`, `color:var(--md-sys-color-primary)`, `cursor:pointer`, a `:hover::before`, `:focus-visible::before` and `:active::before` state layer, an `outline:3px solid var(--md-sys-color-secondary)` focus ring, and no `font-size`

### Implementation for User Story 1

- [X] T007 [US1] In src/public/pollCard.js add `fittingChoices(sorted, ownIds, places)` beside `essentialChoices` as research R2 defines it, and export it on `window.PollCard`
- [X] T008 [US1] In src/public/pollCard.js add `capacity(wrap)` inside `initPollCard` (`wrap.clientHeight === 0` → `Infinity`, else `computeMaxBarsAtFloor(wrap.clientHeight)`), rename `phoneResultsView` to `resultsView` and give its not-maximized, not-phone branch: no view when `data.length <= capacity(resultsWrap)`, else `fittingChoices(data, poll.myChoiceIds || [], Math.max(0, capacity(resultsWrap) - 1))` with the `more-row` last row built as the phone branch builds it (same text rule, FR-005); the maximized branch stays behind `isPhoneLayout()` until T020 (research R1, R4, R6)
- [X] T009 [US1] In src/public/pollCard.js `renderPollResults`: ask `layoutFor(count + (lastRow ? 1 : 0), wrap)`; when the layout is not the phone's and there is a last row, set the `.more-item` `li`'s `style.height` to `barHeight + 'px'` and the button's `style.fontSize` to `fontSize + 'px'`, in the rebuild path and (for a changed size) through the render signature; make `measuredBarLayout(count, wrap)` return `computeBarMetrics(count, wrap.clientHeight)` when `count <= computeMaxBarsAtFloor(wrap.clientHeight)` and keep the scrolling branch for any other count until T017 (research R3)
- [X] T010 [US1] In src/public/pollCard.js `resultsList` click handler: handle `.more-row` (`requestMaximize({ choices: 'voted' })`) at every width, keep the `.show-all-row` branch behind `isPhoneLayout()` until T020 and the `.result-row` branch behind `isPhoneLayout()` for good; leave the `notesBox` click phone-only (research R7)
- [X] T011 [P] [US1] In src/public/pollCard-m3.css add the `@media not all and (max-width: 640px)` block of research R9 and contract W8 for `.card-face .more-row` and `.card-face .show-all-row` (width and height 100%, flex-centred, `border-radius:8px`, 2 px inside `.more-item.is-compact`, label-large weight and tracking tokens, transparent background, state layers through `::before`, focus ring), and `.card-face .results-list > .more-item{ flex:0 0 auto; }`; the rows are not added to the `window.M3Ripple.add` list, which applies at every width (FR-018)
- [X] T012 [US1] In src/public/tabs.js `restore()`: re-render the mounted cards at every width (`mounted.forEach((held) => held.render())` without the `isPhoneLayout()` test), with a case in tests/client-maximized.test.ts with the phone query not matching: a card given a results height while its view is maximized shows its `.more-row` after `restore()` (research R4)
- [X] T029 [US1] Read `selectTab` and the grid's mount path in src/public/tabs.js and record in the "Outcome" section of specs/20261117-131915-WIDE-MORE-CHOICES/quickstart.md whether a tab's cards are rendered after its panel is shown; only if some path renders them while the panel is hidden and never again, add `mounted.forEach((held) => held.render())` where the panel is shown and a case for it in tests/client-maximized.test.ts (research R4)

**Checkpoint**: T004–T006 pass; quickstart §1, §2 (except "no arrow rows" on the voting side) and §3.

---

## Phase 4: User Story 3 - Vote on a long poll (Priority: P2)

**Goal**: Vote on a wide card whose ballot does not fit opens the maximized view on its voting side.

**Independent Test**: quickstart §5.

### Tests for User Story 3 (write first, see them fail)

- [X] T013 [US3] In tests/client-wide-card.test.ts add `describe("voting from the wide card")` for contract W4 with heights `{ results: 259, voting: 259 }` unless stated: a 10-choice poll flips in place with 10 vote rows; a 37-choice poll records `["pid-1", { face: "vote" }]`, does not flip and has no `.vote-row`; with `{ results: 259, voting: 1000 }` a 37-choice card shows `.more-row` and flips in place with 37 vote rows; with `{ results: 1000, voting: 259 }` it shows 37 result rows, no `.more-row`, and Vote records `{ face: "vote" }`; a guest (`signedIn: false`) records nothing; a flipped 10-choice card that receives an 11th choice by `applyPoll` is no longer flipped, and after `card.setMaximized(true)` and `card.showVoteFace()` the earlier selection is still selected

### Implementation for User Story 3

- [X] T014 [US3] In src/public/pollCard.js replace `hiddenChoiceCount()` by `ballotOpensMaximized()`: false when maximized or without data; in the phone layout `essential().hiddenCount > 0` as today; otherwise `data.length > capacity(votingWrap)`; use it in `ballot()`, the `.vote-btn` handler and `setMaximized` (research R5)
- [X] T015 [US3] In src/public/pollCard.js `render()`: before drawing, when the layout is not the phone's and the card is flipped, not maximized and `ballotOpensMaximized()`, set `pendingSelection = selectedIds()` and remove `is-flipped`, the step `setMaximized` takes (research R5; spec edge case "the viewer was on the voting side")

**Checkpoint**: T013 passes; no wide card can show a ballot that does not fit.

---

## Phase 5: Removal of the scrolling list (completes Stories 1 and 3, FR-001)

**Purpose**: Nothing scrolls inside a card, and the code that did is gone.

- [X] T016 In tests/poll-card-assets.test.ts replace the arrow-row assertions (around lines 663–668) by contract W9: `POLL_CARD_TEMPLATE` and the sheets src/public/pollCard.css, pollCard-m3.css and single-column-m3.css hold no `arrow-row` and no `is-dragging`; src/public/pollCard.js holds no `computeBarLayout`, `initScrollArrows`, `initDragScroll`, `attachArrowBehavior`, `updateArrowRows` or `scrolling:`; `.results-list` and `.voting-list` in pollCard.css declare `overflow:hidden` and no `overflow-y:auto`; and in tests/client-maximized.test.ts remove the `.arrow-row.is-active` assertion (line 276), keeping the rest of that case
- [X] T017 In src/public/pollCard.js remove what research R10 lists: `computeBarLayout` (so `measuredBarLayout` is `computeBarMetrics(count, wrap.clientHeight)`), the `scrolling` field of every layout object, the "SCROLL / ARROW ROWS" section (`updateArrowRows`, `attachArrowBehavior`, `initDragScroll`, `initScrollArrows`, their constants and comments), the two `initScrollArrows` calls, the `resultsUp`/`resultsDown`/`votingUp`/`votingDown` lookups and the `upRow`/`downRow` parameters and resets in `renderPollResults` and `renderVotingOptions`, the scroll-position save and restore in both, the four `.arrow-row` buttons in `POLL_CARD_TEMPLATE`, `.card-face .arrow-row` in the `M3Ripple` list, and the sentences about scrolling in the comments of the regions touched
- [X] T018 [P] In src/public/pollCard.css remove the `.arrow-row*` rules, the two `.is-dragging` rules, the scrollbar-hiding declarations and rules of `.results-list` and `.voting-list`, replace their `overflow-x:hidden; overflow-y:auto` by `overflow:hidden`, and trim the comment above `.bar-scroll-wrap` to why the list is out of flow (research R10); in src/public/pollCard-m3.css remove `.card-face .arrow-row` from the state-layer and focus selector lists and its own two rules; in src/public/single-column-m3.css remove `.card-flip:not(.maximized-card-flip) .arrow-row{ display:none; }`; if tests/single-column-sheets.test.ts or tests/m3-assets.test.ts pins any removed line, update that assertion

**Checkpoint**: `npm test` passes; quickstart §1 and §2 in full.

---

## Phase 6: User Story 2 - The maximized view by its leaders first (Priority: P2)

**Goal**: At wide widths the maximized view shows the leaders with "Show all N choices" and "Show fewer choices".

**Independent Test**: quickstart §4.

### Tests for User Story 2 (write first, see them fail)

- [X] T019 [US2] In tests/client-wide-card.test.ts add `describe("the maximized view at wide widths")` for contract W5, mirroring the cases of "the maximized card in the phone layout" in tests/client-phone-card.test.ts with the phone query not matching (bar-size assertions left out), and one more: `applyPoll` with new shares while "Show fewer choices" is shown keeps every row and the row; in tests/client-phone-card.test.ts change "is as today outside the phone layout: every bar, no row" to expect ten rows and a `.show-all-row`, and rename it; leave "changes nothing outside the phone layout" and "flips a twelve-choice card in place outside the phone layout" as they are (they hold through research R4)

### Implementation for User Story 2

- [X] T020 [US2] In src/public/pollCard.js remove the `isPhoneLayout()` test from the maximized branch of `resultsView()` and from the `.show-all-row` branch of the `resultsList` click handler; when the layout is not the phone's, size the `.show-all-row` item as T009 sizes the `.more-row` item (research R6, FR-013)

**Checkpoint**: T019 passes; quickstart §4.

---

## Phase 7: User Story 4 - From a card's notes to the full notes (Priority: P3)

**Goal**: "Show more" opens the maximized view positioned at the notes, under the card's Vote row.

**Independent Test**: quickstart §6.

### Tests for User Story 4 (write first, see them fail)

- [X] T021 [US4] In tests/client-maximized.test.ts write a new case on its grid harness (no test of `revealNotes` exists yet) for contract W6 with the phone query not matching, stubbing `getBoundingClientRect` on `.maximized-notes` and `.card-front .actions` and spying on `window.scrollTo`: opened with `{ open: "notes" }` and `.maximized-notes` reported below the middle of the window, `window.scrollTo` is called with the position that puts `.card-front .actions` 16 px under the fixed chrome, once the notes' text has arrived; with `.maximized-notes` in the upper half, it is not called; `.extras-tabs` is not consulted

### Implementation for User Story 4

- [X] T022 [US4] In src/public/pollCard.js make `requestMaximizedNotes()` call `requestMaximize({ open: 'notes' })` at every width; in src/public/tabs.js set `notesAsked = how.open === "notes"` in `maximize()` and, in `revealNotes()`, measure the top of `.extras-tabs` when `window.PollCard.isPhoneLayout()` and of `.maximized-notes` otherwise (research R8)

**Checkpoint**: T021 passes; quickstart §6.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T023 Run `npx tsc --noEmit` and `npm test`; every suite passes, the phone-layout cases of tests/client-phone-card.test.ts unchanged except the one renamed in T019 (contract W7)
- [X] T024 Confirm `git diff --stat 5b7a09c -- src/public/phone-card-m3.css src/public/phone-m3.css src/public/phone-admin-m3.css` is empty (FR-018), and that `grep -rn "console\." src/public/pollCard.js src/public/tabs.js` shows nothing new (Constitution V)
- [X] T025 Walk specs/20261117-131915-WIDE-MORE-CHOICES/quickstart.md §1–§7 in a desktop browser, comparing §1 and §7 with the screenshots of T002, repeating §6 with the window 600 px tall (SC-004) and checking Back in §3 and §6 (FR-019), and record the outcome in its "Outcome" section; fix only defects of this feature
- [X] T026 [P] Update README.md: the wide card (leaders and "More choices" in place of scrolling), the maximize bullet ("Show all" and "Show fewer choices" at every width, Vote on a long poll, "Show more" landing on the notes), and "Show few choices" corrected to "Show fewer choices"; no reference to specs or requirements (Constitution, README rule)
- [X] T027 [P] Update ARCHITECTURE.md: the card-sizing paragraph that names `computeBarLayout` and scrolling (around line 613), the maximize state diagram and the notes paragraph, to `capacity`, `fittingChoices`, `resultsView`, `ballotOpensMaximized` and `revealNotes` at every width
- [X] T028 [P] Update CLAUDE.md (drop "planned, not yet implemented" from the current plan's decisions; the `essentialChoices` and "Vote with hidden choices" bullets of the phone plan are no longer phone-only) and CLAUDE_COMPLETE.md to match

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US3) → Phase 5 (removal) → Phase 6 (US2) → Phase 7 (US4) → Phase 8.
- US3 depends on `capacity` from T008. The removal depends on US1 and US3 (T017 deletes the scrolling branch T009 kept).
- US2 depends on T008–T010 (the view function and the click handler). US4 is independent of US2 and US3 and could
  follow Phase 3 directly.
- Within each story: tests first, then implementation. T007 before T008; T008 before T009 and T010.

### Parallel Opportunities

- T004 and T006 (different files) while T005 is written; T011 beside T008–T010 (a sheet).
- T018 beside T017 (sheets and script).
- T026, T027 and T028 together.
- Phase 7 (US4) can be done by a second person at any time after Phase 3: it touches `requestMaximizedNotes` and
  two functions of `tabs.js` that no other phase edits except T012 (`restore()`) and, if it changes anything, T029.

## Implementation Strategy

**MVP**: Phases 1–5 (Story 1, Story 3 and the removal): the scrolling list is gone and every choice is reachable to
read and to vote. Stop and walk quickstart §1–§3 and §5.

**Then**: Phase 6 (the maximized view's rows), Phase 7 (the notes), Phase 8 (checks and documents), each of which
leaves the site working.
