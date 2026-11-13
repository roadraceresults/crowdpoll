# Tasks: Admin Search Results List

**Input**: Design documents from `specs/20261113-102117-ADMIN-SEARCH-RESULTS/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R13), data-model.md, contracts/ui.md (U1–U9), quickstart.md

**Tests**: requested (research R12, constitution Principle IV). Each story writes its test cases first; they fail
before the implementation task that follows.

**Organization**: by user story; every task names its file.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US4 (spec.md)

---

## Phase 1: Setup

None: no dependency, setting, script or file is added to `src/`.

---

## Phase 2: Foundational (blocks every story)

- [X] T001 In `tests/client-admin-search.test.ts`, add the helpers the new cases share beside the existing `cards` helper: `results(p)` (`#pollList .admin-result`), `rowOf(p, title)` (the `.admin-result-row` whose `.admin-result-title` text is `title`), `openResults(p)` (`#pollList .admin-result--open`), and `search(p, values)` (click the Search tab, fill, `submitForm("#adminSearchForm", {})`, `settle(300)`)
- [X] T002 [P] Add a "Result rows" section at the end of `src/public/admin-search-m3.css` with the layout only: `.admin-result{ width:min(840px,100%); margin:0 auto; }`, `.admin-result-row` as a full-width grid button (`min-height:48px`, columns title `minmax(0,1fr)` then the five other cells and the 24 px chevron, `text-align:left`, no border, transparent background, `font-family:var(--md-sys-typescale-font)`), `.admin-result-title{ overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }`, `.admin-result-panel[hidden]{ display:none; }`, and `@media (max-width: 719.98px)` putting the title on the first grid row and the other cells on the second (R2, R11, U9)

**Checkpoint**: `npx vitest run tests/m3-assets.test.ts tests/admin-search-assets.test.ts` passes.

---

## Phase 3: User Story 1 - Scan the results and open one poll (Priority: P1) 🎯 MVP

**Goal**: a search shows compact rows; selecting a row opens that poll's full card under it, one at a time.

**Independent Test**: a search matching several polls shows rows and no card; a click on a row opens its card; a click
on another moves it; a click on the open row closes it; a single result is drawn open.

- [X] T003 [US1] In `tests/client-admin-search.test.ts`, add `describe("the search results list")` with cases for the structure and the cells: after a two-poll search each `#pollList` child is `div.admin-result[data-pid]` holding `button.admin-result-row[type="button"]` then `div.admin-result-panel` whose id is the button's `aria-controls`; the button's children are title, state, visibility, creator, created, voters, chevron in that order; the cell texts follow contracts/ui.md U2 (a poll with no title shows "(untitled)", the button's `title` attribute is the full title, "0 voters" / "1 voter" / "1,204 voters", "Public"/"Private", the creator's name or else email); rows are in the response's order; no `.poll-admin-card` exists; the Newest view still holds `.poll-admin-card` children directly (U1, U2, FR-001–FR-007, FR-031)
- [X] T004 [US1] In the same `describe`, add the open/close cases: a click on a closed row sets `aria-expanded="true"`, adds `admin-result--open`, un-hides the panel and puts exactly that poll's `.poll-admin-card` in it; a click on the open row empties and hides the panel; a click on a second row leaves exactly one `.admin-result--open`; `document.activeElement` is the clicked button; the opened card's read-only face is the same as in Newest (its `.card-readonly` exists and a summary part opens the wizard); with an invitation-only poll among the results and the page's `fetch` calls recorded (`beforeScripts`), no request goes to `/api/admin/polls/<pid>/invitees` after the search and at least one does after its row is opened (U3, FR-008–FR-011, FR-034)
- [X] T005 [US1] In the same `describe`, add the fresh-load cases: a search with exactly one match is drawn with that result open; a search with two matches is drawn with none open; with a card open, a new search, Clear, and a click on Newest then Search each leave no result open (and the single result open again on return); Clear leaves `#pollList` empty and the notice hidden (U4, FR-012, FR-014, clarification 2026-11-13)
- [X] T006 [US1] In `tests/client-admin-search.test.ts`, update the existing cases in `describe("collapsing the search panel")`, `describe("the admin search request")`, `describe("the status line")` and `describe("the read-only card's Created By field")` that count or read `.poll-admin-card` after a multi-result search in the Search view: count `.admin-result` instead, or open the row before reading the card; leave single-result cases that still pass unchanged (U8)
- [X] T007 [US1] In `src/public/adminList.js`, add the result-row code next to `syncChildren`: `const resultRows = new Map()`, `let openPid = null`, `createResult(poll)` building the markup of research R3 with `el`-style DOM calls (no `innerHTML` except the chevron's static SVG), `paintResult(result, poll)` writing the six cell texts of R4 only when they differ and setting the button's `title` to the full title, and the formatters `resultTitle`, `resultVisibility`, `resultCreator`, `resultCreated`, `resultVoters` (R1, R3, R4)
- [X] T008 [US1] In `src/public/adminList.js`, add `openResult(pid)`, `closeResult()` and the row's click handler: opening closes the open result first, takes the controller from `controllers` or creates it with `window.AdminCard.create(poll, deps)`, appends `controller.element` to the panel, sets `aria-expanded`, the `admin-result--open` class and `openPid`; closing removes the element, hides the panel and deletes the controller unless `controller.hasSavedProgress()`; a click toggles and, when the row is not fully inside the visible area afterwards, calls `row.scrollIntoView({ block: "start" })` (R5, R10)
- [X] T009 [US1] In `src/public/adminList.js`, make `loadList` draw results in the Search view: accept a `fresh` option; when `activeTab === "search"`, build `nextOrder` from `resultRows` (create or repaint one result per poll, keep each result's `poll`), call `controller.update(poll)` only for `openPid`, drop results whose pid is gone, and pass the result elements to `syncChildren`; on a fresh load call `closeResult()` before drawing and `openResult(pid)` after it when exactly one poll came back; when leaving the Search view (any other tab's load) clear `resultRows` and `openPid`; `selectTab` calls `loadList({ fresh: true })`; the search form's auto-collapse test becomes `#pollList .admin-result`; `focusPid`/`message` and the reopened actions menu keep working for the open card; add `window.M3Ripple?.add("#pollList .admin-result-row")` beside the existing ripple call (R6, R8, R11, U4, U8)

**Checkpoint**: `npx vitest run tests/client-admin-search.test.ts` passes; quickstart steps 1–5, 9, 10 and 15 pass by hand.

---

## Phase 4: User Story 2 - Edit a poll without losing the draft (Priority: P2)

**Goal**: while a card is being edited, the rows, Search and Clear are held.

**Independent Test**: start editing from an open card: every row, Search and Clear are disabled with the explanation;
Cancel releases them and the card is still open.

- [X] T010 [US2] In `tests/client-admin-search.test.ts`, add `describe("the results list while a card is being edited")`: after opening a row and starting an edit (click a `.wizard-summary-link`, settle), every `.admin-result-row`, the form's submit button and `#adminSearchClear` are `disabled` with `title="Finish editing the open poll first"`; a click on another row opens nothing and the editing result stays open; submitting the form sends no request; a refresh that adds a poll draws its row disabled; after Cancel all are enabled, the rows' `title` is the poll title again, the two buttons have no `title`, and the card is still in its panel (U5, FR-015–FR-018)
- [X] T011 [US2] In `src/public/adminList.js`, extend `refreshCreateButton` to set `disabled` and `title` on every `.admin-result-row`, on `#adminSearchForm .admin-search-btn` and on `#adminSearchClear` while `editingPid !== null` and to restore them (row title from its poll, buttons with no title) otherwise; make `createResult` apply the held state to a row created during an edit; return early from the form's submit handler and the Clear handler while `editingPid !== null` (R7)
- [X] T012 [P] [US2] In `src/public/admin-search-m3.css`, add the disabled look to the "Result rows" section: `.admin-result-row:disabled` with the M3 disabled content opacity and `cursor:default`, and add `.admin-search .admin-search-btn:disabled` and `.admin-search .admin-search-clear:disabled` with the same opacity and `cursor:default` (R11, U9)

**Checkpoint**: quickstart step 6 passes by hand.

---

## Phase 5: User Story 3 - A list that stays put while it stays current (Priority: P3)

**Goal**: refreshes update rows in place and never open, close or move a card; a line says how many polls matched.

**Independent Test**: with a card open, change a matching poll and let the list reload: the row text changes, the same
DOM nodes remain, the card stays open, the count line is right.

- [X] T013 [US3] In `tests/client-admin-search.test.ts`, add `describe("the results list on a refresh")`, driving a non-fresh load through the page's own refresh (a short `ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL` context or the card's reload after a state button): the `.admin-result` nodes of polls still matching are the same objects with updated voter and state text; the open result is still open with the same card element and `document.activeElement` unchanged; a poll that stops matching loses its result (and `openResults` is empty if it was the open one); a newly matching poll appears closed at its position in the order; a single result the administrator closed is not reopened; a poll being edited that stops matching keeps its result and card until the edit ends (U6, FR-019–FR-023)
- [X] T014 [US3] In `tests/client-admin-search.test.ts`, extend `describe("the status line")`: "2 polls match." after a two-poll search, "1 poll matches." for one, "No polls match." and the cut-off sentence unchanged (use a context with `ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS=1` for the cut-off), no count in Newest, Awaiting Approval or Rejected, and the count following a reload (U7, FR-024, FR-025)
- [X] T015 [US3] In `src/public/adminList.js`, complete the non-fresh path of `loadList` for the Search view: keep the result of `editingPid` in `nextOrder` at its current position when the response no longer holds it; set `openPid = null` when the open poll is gone and not being edited; never call `openResult` or `closeResult` on a non-fresh load (R8)
- [X] T016 [US3] In `src/public/adminList.js`, add `count: (n) => (n === 1 ? "1 poll matches." : n + " polls match.")` to `VIEWS.search` and make `loadList`'s notice `truncated ? view.cutOff(n) : n === 0 ? view.empty : view.count ? view.count(n) : ""` (R9)

**Checkpoint**: quickstart steps 7 and 8 pass by hand.

---

## Phase 6: User Story 4 - Use the list from the keyboard or a screen reader (Priority: P3)

**Goal**: rows are focusable disclosure buttons with clear hover, focus, selected and open looks in both schemes.

**Independent Test**: Tab reaches each row, Enter and Space toggle it, the state is announced, the focus ring is
visible in light and dark.

- [X] T017 [US4] In `tests/client-admin-search.test.ts`, add to `describe("the search results list")`: every row is a native `button` with no `tabindex`, `aria-expanded` is exactly `"true"` or `"false"`, `aria-controls` names an element that exists, the chevron is `aria-hidden="true"`, the panel follows the button in document order, and activating the button through `button.click()` (what Enter and Space do on a native button) toggles it with focus kept on the button (U1, U3, FR-027, FR-028)
- [X] T018 [P] [US4] In `tests/admin-search-assets.test.ts`, add `describe("the result rows' Material 3 layer")` on `admin-search-m3.css`: `.admin-result` is `width:min(840px,100%)`; `.admin-result-row` has `min-height:48px`, a `::before` state layer with the hover, focus and pressed token opacities, a `:focus-visible` outline in `var(--md-sys-color-primary)`, a `:disabled` rule and a `scroll-margin-top` using `--fixed-chrome-height`; `.admin-result--open .admin-result-row` uses `--md-sys-color-secondary-container`; the chevron rotates on `[aria-expanded="true"]` and has no transition inside `@media (prefers-reduced-motion: reduce)`; the `(max-width: 719.98px)` block moves the title to its own line; the section has no hex color and no literal `font-size` (U9, FR-029, FR-030)
- [X] T019 [US4] In `src/public/admin-search-m3.css`, finish the "Result rows" section to satisfy T018: type from `--md-sys-typescale-body-large-*` (title) and `--md-sys-typescale-body-medium-*` (other cells), colors `on-surface` / `on-surface-variant`, corner `--md-sys-shape-corner-small`, the `::before` state layer copied in form from `.admin-search-toggle`, the focus outline, the selected background and `on-secondary-container` text, `.admin-result-state` as an outlined chip (1 px `--md-sys-color-outline`, `corner-small`, label-large tokens), the chevron's rotation and reduced-motion rule, and `scroll-margin-top:calc(var(--fixed-chrome-height, 0px) + 8px)` (R10, R11)

**Checkpoint**: quickstart steps 11–14 pass by hand.

---

## Phase 7: Polish and cross-cutting

- [X] T020 Search `tests/` for other client suites that read a card in the admin Search view (`grep -ln "adminSearchForm\|data-tab=\"search\"" tests/client-admin-*.test.ts tests/line-graph-ui.test.ts tests/client-poll-notes.test.ts`) and, where one does, open the result's row before reading the card; change nothing in suites that use the other views
- [X] T021 Run `npx tsc --noEmit` and `npm test`; fix what this feature broke; confirm `tests/search-admin.test.ts`, `tests/openapi-contract.test.ts` and `tests/m3-assets.test.ts` pass unchanged
- [X] T022 [P] Update the "For administrators" section of `README.md`: the Search view lists compact rows (title, state, visibility, creator, created date, voters), a row opens the poll's card under it, one at a time, the list is held during an edit, and the line "N polls match."
- [X] T023 [P] Update `ARCHITECTURE.md` where it describes the admin page: the Search view's result rows live in `adminList.js`, a card is created when its row opens, and the search request and response are unchanged
- [X] T024 Walk through `specs/20261113-102117-ADMIN-SEARCH-RESULTS/quickstart.md` steps 1–17 in a browser, step 17 with at least 200 polls, (desktop and under 720 px, light and dark) and record the outcome in this file under a "Quickstart result" heading

### Quickstart result

2026-11-13 18:45: the developer reported that the manual tests passed, after TWEAK01 (framed, zebra-striped two-line rows)
and TWEAK02 (hidden chevron while editing, green dots) were applied.

---

## Dependencies

- Phase 2 before every story; T001 before every test task in `tests/client-admin-search.test.ts`.
- US1 (T003–T009) is the MVP and blocks US2, US3 and US4, which all act on the rows it draws.
- US2, US3 and US4 are independent of each other; inside each, the test task precedes its implementation task.
- Tasks in `tests/client-admin-search.test.ts` (T001, T003–T006, T010, T013, T014, T017) are sequential with each other, as are the tasks in `src/public/adminList.js` (T007–T009, T011, T015, T016) and in `src/public/admin-search-m3.css` (T002, T012, T019).
- Phase 7 after all stories.

## Parallel opportunities

- T002 with T001.
- T012 with T010/T011 (CSS against JS and tests).
- T018 with T017 (different test files).
- T022 with T023.

## Implementation strategy

1. **MVP**: Phase 2 and Phase 3. The Search view is already far easier to scan; editing still works through the
   existing latch on tabs and Create.
2. **Then US2** before any release: without it a draft can be lost by closing its row.
3. **Then US3 and US4**, in either order, and Phase 7.
