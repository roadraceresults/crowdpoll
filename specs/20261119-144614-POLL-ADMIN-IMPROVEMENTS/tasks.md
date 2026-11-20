---

description: "Task list for Poll Admin Improvements"
---

# Tasks: Poll Admin Improvements

**Input**: Design documents from `specs/20261119-144614-POLL-ADMIN-IMPROVEMENTS/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui.md, quickstart.md

**Tests**: The plan names them (research R15) and they are written before the code they check: contracts A1–A6 in two
new server suites, U1–U15 in four new client suites, U16 in `tests/admin-search-assets.test.ts`. Sizes, colors, the
dialog's scrolling, Back and SC-001's counts (U17) are checked by hand with quickstart.md, since jsdom has no layout.

**Organization**: Tasks are grouped by user story. The server work (the stored setting and `canWatch`) is foundational:
Stories 2 and 3 read its payloads. Story 4 (info icons) comes before Story 5 (the Choices step) as the plan orders
them, because both rebuild step 3's switch rows.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1 … US6)

## Path Conventions

Single project at the repository root: `src/`, `src/public/`, `tests/`, `postman/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: A green baseline and the "before" pictures SC-001 compares against.

- [X] T001 In specs/20261119-144614-POLL-ADMIN-IMPROVEMENTS/quickstart.md make the long poll 50 choices wherever it says 30 ("By hand", §5 and §7), as SC-006 measures; then run `npx tsc --noEmit` and `npm test` from the repository root and confirm both pass before changing anything (record any pre-existing failure in specs/20261119-144614-POLL-ADMIN-IMPROVEMENTS/quickstart.md instead of fixing it)
- [-] T002 (skipped by the developer, 2026-11-20; the "before" count of 2 was supplied instead of the screenshots) With the site running from branch `poll-admin` as it is before T010, create the accounts and polls listed under "By hand" in specs/20261119-144614-POLL-ADMIN-IMPROVEMENTS/quickstart.md, take the "before" screenshots of Newest at 1280 × 800 and at 400 px wide, count the polls visible without scrolling at 1280 × 800 and write that number beside SC-001's "before" in quickstart.md §1; keep the screenshots outside the repository

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The stored setting and the `canWatch` fact, through every payload. No page changes yet.

**⚠️ CRITICAL**: Stories 2 and 3 cannot be completed before this phase.

### Tests (write first, see them fail)

- [X] T003 [P] Create tests/polls-entered-order.test.ts (saving through `POST /api/admin/polls/:pid/publish` and `POST /api/admin/polls/:pid/save` in src/routes/pollsApi.ts, the routes contract A2 names; supertest and embedded-postgres, following the setup of tests/polls-admin-crud.test.ts and the helpers in tests/helpers/poll-fixtures.ts) covering contracts A1–A4 of specs/20261119-144614-POLL-ADMIN-IMPROVEMENTS/contracts/api.md: a new poll and a pre-existing row read `choicesInEnteredOrder: false`; saving `true` and `false` on a public and on a private poll; saving it on a poll with votes (UPDATE mode), alone and with a title; `"yes"`, `1` and `null` answer 400 with `choicesInEnteredOrder must be true or false.` and save nothing; an absent field keeps the stored value; a poll made public keeps its value; the admin list item, the admin poll detail and the card payload carry it; a saved change raises `contentVersion` and a delta request holding the old version receives the card with the new value (the pattern of tests/refresh-deltas.test.ts); a poll in `EDITING` serves the stored value; duplicate copies `true` and still resets `lineGraphEnabled`; the poll page's link preview, built by src/seo/pollPage.ts (the poll summary and `og:description`), is the same with the setting on and off (FR-023), asserted in the pattern of tests/seo.test.ts
- [X] T004 [P] Create tests/polls-admin-can-watch.test.ts covering every row of contract A5 on both `GET /api/admin/polls` and `GET /api/admin/polls/search`: one poll per state (`INITIALIZED`, `AWAITING APPROVAL`, `REJECTED`, `ARCHIVED`, `WAITING TO OPEN`, `OPEN`, `CLOSED`, `EDITING` from `OPEN`, `EDITING` from `INITIALIZED`), public and private, the caller as creator, as an administrator with no relation, with a `linked` and a `voted` relation, invited and not invited to an Invitation Only poll, and banned; assert `canWatch` for each and that every other field of the items, their order and `truncated` are as before
- [X] T005 [P] In specs/20261119-144614-POLL-ADMIN-IMPROVEMENTS/contracts/api.md name the routes in A2 (`POST /api/admin/polls/:pid/publish` and `POST /api/admin/polls/:pid/save` in place of "the poll's save route"); in tests/openapi-contract.test.ts add or extend the cases so that postman/openapi.json must describe `choicesInEnteredOrder` (boolean) in each schema that describes `votersAddChoices`, and `canWatch` (boolean) on the admin list item schema (contract A6)

### Implementation

- [X] T006 Create src/db/migrations/023-choices-in-entered-order.ts in the form of src/db/migrations/015-voters-add-choices.ts (`alter table "polls" add column "choices_in_entered_order" boolean not null default false`; `down` drops it), register it in src/db/migrations/index.ts after `022-admin-search-flags`, and add `choices_in_entered_order: Generated<boolean>` to the polls table in src/db/schema.ts beside `voters_add_choices`
- [X] T007 In src/polls/store.ts add `choicesInEnteredOrder: boolean` to `Poll`, to the row-to-poll mapping (`row.choices_in_entered_order`), to `FIELD_TO_COLUMN` and to the poll-to-row mapping, beside each `votersAddChoices` line; do not add it to `NON_CONTENT_FIELDS` (research R6)
- [X] T008 In src/polls/service.ts set `choicesInEnteredOrder: false` on a new poll beside `votersAddChoices: false`; in `validatePollFields` add, after the `lineGraphEnabled` block, a check that a defined `body.choicesInEnteredOrder` is a boolean (else `AdminError(400, "choicesInEnteredOrder must be true or false.")`) and sets `$set.choicesInEnteredOrder`, with no visibility rule; in the duplicate builder copy `source.choicesInEnteredOrder`
- [X] T009 In src/polls/versions.ts add `choicesInEnteredOrder: boolean` to `PollProjection` and `choicesInEnteredOrder: row.choices_in_entered_order` to `projectPoll`
- [X] T010 In src/routes/pollsApi.ts add `"choicesInEnteredOrder"` to `UPDATE_FIELDS`; add `choicesInEnteredOrder: p.choices_in_entered_order` and a `canWatch` property to `adminListRow`, which takes a new parameter `openable: Set<string>`; in both list routes compute `const openable = caller ? await mayWatchMany({ db, config }, caller, rows) : new Set<string>()` once per request (import `mayWatchMany` from `../polls/access.js`) and pass it; make sure the admin poll detail (`namedAdminPollDetail`) carries `choicesInEnteredOrder`; do not edit src/polls/access.ts (research R5)
- [X] T011 In postman/openapi.json add `choicesInEnteredOrder` (boolean, with a one-line description: "On: voters see the choices in the order entered; off: from most votes to least.") in each of the five places `votersAddChoices` is described, and `canWatch` (boolean: "Whether the caller can open this poll from its link.") on the admin list item schema next to `canRescreen`
- [X] T012 Run `npx tsc --noEmit` and `npx vitest run tests/polls-entered-order.test.ts tests/polls-admin-can-watch.test.ts tests/openapi-contract.test.ts tests/polls-discovery.test.ts tests/polls-admin-crud.test.ts tests/refresh-deltas.test.ts`; fix any fixture in tests/helpers/poll-fixtures.ts that builds a `Poll` or a polls row literally and now lacks the field

**Checkpoint**: the server carries both fields; every page looks as before.

---

## Phase 3: User Story 1 - Scan any list as rows and open one poll's card (Priority: P1) 🎯 MVP

**Goal**: Newest, Awaiting Approval, Rejected and the creator's list draw the Search view's rows; a row opens its
card.

**Independent Test**: quickstart §1–§3.

### Tests for User Story 1 (write first, see them fail)

- [X] T013 [US1] Create tests/client-admin-rows.test.ts with the page helper tests/client-admin-search.test.ts uses to open `admin.html` with stubbed `fetch` (list payloads per view, `/api/me` as administrator or creator, `/api/config`), and cases for contracts U1–U5 of specs/20261119-144614-POLL-ADMIN-IMPROVEMENTS/contracts/ui.md: for each of Newest, Awaiting Approval and Rejected with three polls, three `div.admin-result` and no `.poll-admin-card`; the view's own notice and no count line; click opens (panel shown, one card, `aria-expanded="true"`, `.admin-result--open`), click again closes and forgets the controller, a second row closes the first; a first load or a tab selection with exactly one poll opens it, with two opens none; a refresh tick that leaves one poll opens nothing and keeps an open card's element in its panel; a refresh without the open poll removes its row, but not while it is being edited; during an edit every other row, tab, Search, Clear and `#createPollBtn` are disabled with the title "Finish editing the open poll first" and are enabled after Cancel
- [X] T014 [US1] In tests/client-admin-rows.test.ts add cases for contract U6: Create New Poll from Search and from Rejected ends on the Newest tab with the new poll's row open and its card in wizard mode; when the list returned lacks the new poll no row opens; and the same in the creator's list
- [X] T015 [P] [US1] In tests/client-admin-creator.test.ts replace the expectations of cards in the list by rows: a creator with three polls sees three `div.admin-result` and no card; a creator with one sees its card open; a row with saved wizard progress keeps it across close and reopen (contract U2)

### Implementation for User Story 1

- [X] T016 [US1] In src/public/adminList.js remove `cardElements` and, in `loadList`, the `inSearch` branch that chose it: every view runs `if (fresh && editingPid === null) closeResult()`, `syncChildren(container, resultElements(container, polls))`, `dropControllers(new Set(openPid === null ? [] : [openPid]))` and `if (fresh && editingPid === null && polls.length === 1) openResult(polls[0].pid)`; keep the error handling's `inSearch` test for the search notice; update the file's header comment to say the list is rows in every view (research R1)
- [X] T017 [US1] In src/public/adminList.js make the page's first load fresh (`await loadList({ fresh: true })` in the `DOMContentLoaded` handler), and move `window.M3Ripple?.add("#pollList .admin-result-row")` out of the `if (searchForm)` block so that the creator's list registers it (research R2, R3)
- [X] T018 [US1] In src/public/adminList.js rewrite the Create New Poll handler's ending: after `await selectTab("newest")`, return when `resultRows.get(pid)` is missing; else `openResult(pid)`, `revealRow(resultRows.get(pid).button)` and `controllers.get(pid).openWizard()`; correct the comment above the handler, which speaks of "the card" being scrolled into view, to speak of the row (research R2)
- [X] T019 [US1] In src/public/adminList.js confirm the expected outcome: the four `deps.refresh({ focusPid, message })` calls of src/public/adminCard.js (after Save, after Publish, and the two action answers, near its lines 2441, 2456, 2497 and 2504) all run from a card whose row is open, so `controllers.get(focusPid)` exists and nothing changes; record that in research.md R2. Only if one is found running from a closed row: when `controllers.get(focusPid)` is missing because the row is closed, focus that row's button and show the message with the page's snackbar instead of dropping it; add a case for it to tests/client-admin-rows.test.ts if such a path exists, or note in research.md R2 that none does
- [X] T020 [US1] Update tests/client-admin-wizard.test.ts, tests/client-admin-discard.test.ts and tests/client-admin-invitees.test.ts so that each test that used a card in a list first clicks that poll's `button.admin-result-row` (one shared helper per file, e.g. `openRow(pid)`), without changing what the tests assert about the card
- [X] T021 [US1] Run `npx vitest run tests/client-admin-rows.test.ts tests/client-admin-search.test.ts tests/client-admin-creator.test.ts tests/client-admin-wizard.test.ts tests/client-admin-discard.test.ts tests/client-admin-invitees.test.ts` and make them pass

**Checkpoint**: every list is rows; the card and all its actions work inside an open row.

---

## Phase 4: User Story 2 - Open a poll as its voters see it (Priority: P2)

**Goal**: A round link on each row whose poll the viewer can open.

**Independent Test**: quickstart §4.

### Tests for User Story 2 (write first, see them fail)

- [X] T022 [US2] In tests/client-admin-rows.test.ts add cases for contract U7 in Newest, Search and the creator's list: a poll with `canWatch: true` has one `a.admin-result-open` that is a child of `div.admin-result` and not a descendant of the row's button, with `href` `/?PID=<encodeURIComponent(pid)>`, no `target`, `aria-label` "View Poll: <title>" ("View Poll: (untitled)" for an empty title), `data-tooltip` "View Poll", and one `svg[aria-hidden="true"][viewBox="0 0 46 46"]` whose descendants carry no `fill` or `stroke` attribute with a `#` color; `canWatch: false` has none; a refresh flipping `canWatch` adds or removes the link on the same row element; a click on the link leaves every `aria-expanded` unchanged; while another poll is edited the link has no `disabled` or `aria-disabled` and a click raises the "Not Saved" dialog when the draft is dirty
- [X] T023 [P] [US2] In tests/admin-search-assets.test.ts add a case for contract U16's first item: src/public/admin-search-m3.css has an `.admin-result-open` rule with a 48 px box, `position:absolute`, a `:focus-visible` outline, and rules filling the disc with `var(--md-sys-color-primary)` and the mark with `var(--md-sys-color-on-primary)`, no `#` color and no `font-size`; src/public/phone-admin-m3.css gives `.admin-result-open` its halo inside `@media (max-width: 640px)`

### Implementation for User Story 2

- [X] T024 [US2] In src/public/adminList.js add `resultOpenLink(poll)` beside `resultChevron`: an `<a class="admin-result-open">` with the `href`, `aria-label` and `data-tooltip` of contract U7, holding an SVG built with `createElementNS` from the shapes of requirements/20261119-144614-poll-admin-improvements/launchPoll-circle.svg (`viewBox="0 0 46 46"`; `circle` cx 23, cy 23, r 23 with class `admin-result-open-disc`; a `g transform="translate(6.75 8.75)"` with class `admin-result-open-mark` holding the four `path` and two `rect` shapes, and the stroked diagonal with class `admin-result-open-stroke`), with no color attribute; in `paintResult` create the link and insert it before the row's button when `result.poll.canWatch === true` and none exists, remove it when not, and refresh its `aria-label` when the title changes; add `link: null` to the object `createResult` returns (research R4)
- [X] T025 [P] [US2] In src/public/admin-search-m3.css give `.admin-result` `position:relative`, position `.admin-result-open` over the row's left padding (48 px square, vertically centred on the row's first 64 px, `border-radius:var(--md-sys-shape-corner-full)`, `z-index` above the row's button, a 36 px `svg`, a focus ring like the row's), fill `.admin-result-open-disc` with `var(--md-sys-color-primary)`, `.admin-result-open-mark` with `var(--md-sys-color-on-primary)` and stroke `.admin-result-open-stroke` with `var(--md-sys-color-on-primary)` at width 2.4 with no fill, and raise `.admin-result-row`'s left padding by the link's width and gap in every row; in src/public/phone-admin-m3.css add the transparent 64 px halo for `.admin-result-open` inside the existing `@media (max-width: 640px)` block, as the other phone targets have it
- [X] T026 [US2] Run `npx vitest run tests/client-admin-rows.test.ts tests/admin-search-assets.test.ts tests/m3-assets.test.ts tests/phone-sheets.test.ts` and make them pass

**Checkpoint**: quickstart §4 can be walked.

---

## Phase 5: User Story 3 - Show the choices in the order entered (Priority: P2)

**Goal**: The switch on step 3, the field saved, and the card and Maximized view drawing by position when it is on.

**Independent Test**: quickstart §5.

### Tests for User Story 3 (write first, see them fail)

- [X] T027 [P] [US3] Create tests/client-entered-order.test.ts with the `poll(count, overrides)` and `mount` helpers of tests/client-phone-card.test.ts and tests/client-wide-card.test.ts, and cases for contract U15: choices A, B, C at positions 0, 1, 2 with shares 10, 30, 60 draw C, B, A in results and ballot when `choicesInEnteredOrder` is `false` or absent, and A, B, C in both when `true`, on a card and maximized, in the phone and the wide layout; for a 30-choice poll on the phone card, on a wide card with a stubbed results height, and maximized, the set of labels drawn, the last row's class and its text are equal with the setting on and off, and the drawn order is by position when on; "Show all 30 choices" then lists all 30 by position; `applyAddedChoices` with a new last position draws that choice last when on; maximized with all 30 shown, "Show fewer choices" returns to the same kept choices and the same row text with the setting on and off (FR-022); and a card mounted with the setting off, then given a delta card through src/public/deltaClient.js carrying `choicesInEnteredOrder: true`, redraws its bars in position order (FR-025, T031)
- [X] T028 [US3] Create tests/client-admin-choices-field.test.ts with the wizard-opening helpers of tests/client-admin-wizard.test.ts (through an opened row) and cases for contract U8: step 3 shows, after `.wizard-paste`, a `input[role="switch"]` whose label reads "Display Choices in the order above", unchecked for `choicesInEnteredOrder: false` and checked for `true`; its support line reads the Off or the On sentence of FR-019 and is its `aria-describedby`; it is present on a public and on a private poll and enabled on a poll with `canUpdate` and votes; toggling it marks the wizard dirty and the save request's body carries `choicesInEnteredOrder: true`

### Implementation for User Story 3

- [X] T029 [US3] In src/public/pollCard.js carry `position: c.position` into each item `rebuildData` builds; add `inDisplayOrder(choices)` inside `initPollCard` (when `poll.choicesInEnteredOrder === true` return a copy sorted by ascending `position`, else return `choices` itself); apply it to `shown` in every `return` of `resultsView()` and to the non-empty result of `ballot()`; leave `data`, `essentialChoices`, `fittingChoices`, `votedChoices` and the `allData` argument of `renderPollResults` as they are (research R7)
- [X] T030 [US3] In src/public/pollCard.js read how `renderPollResults` gives a bar its automatic color; if it depends on the row's index in the list drawn, make it depend on what it depends on today when the setting is off (the choice's rank in `allData`), so that turning the setting on moves bars without recoloring them; add a case for it to tests/client-entered-order.test.ts (research R7, "to verify")
- [X] T031 [P] [US3] In src/public/deltaClient.js add `choicesInEnteredOrder: card.choicesInEnteredOrder === true` to the card mapping beside `votersAddChoices`
- [X] T032 [US3] In src/public/adminCard.js add `enteredOrder` to the wizard state wherever `addChoices` is (`current.choicesInEnteredOrder === true` in the two base builders, `from.enteredOrder` in `openWizardState`, the dirty comparison's key list, the saved-progress snapshot), send `fields.choicesInEnteredOrder = s.enteredOrder === true` beside `fields.votersAddChoices`, and make `canChange("choicesInEnteredOrder")` return `true` beside `votersAddChoices` (research R14)
- [X] T033 [US3] In src/public/adminCard.js add `buildEnteredOrderSwitch()` built from the start in the with-icon row shape of research R10 (`div.m3-switch-row` holding `span.m3-switch-text` with `span.m3-row-heading` > `label[for].m3-switch-label`, and `label[for].m3-switch-support`; then `input#id`), with no icon yet (label constant "Display Choices in the order above", `role="switch"`, an `id` of `enteredOrderSwitch-<pid>`, the two support sentences of FR-019, `wizard.enteredOrder` on change, then `howChanged()`), and append it in `buildStep3` after `pasteWrap`
- [X] T034 [US3] Run `npx vitest run tests/client-entered-order.test.ts tests/client-admin-choices-field.test.ts tests/client-phone-card.test.ts tests/client-wide-card.test.ts tests/client-maximized.test.ts` and make them pass

**Checkpoint**: quickstart §5 can be walked, except its summary line (T049).

---

## Phase 6: User Story 4 - Read what a setting means from an info icon (Priority: P3)

**Goal**: One dialog, an icon beside each label of FR-031, and no "What does this mean?".

**Independent Test**: quickstart §6.

### Tests for User Story 4 (write first, see them fail)

- [X] T035 [US4] Create tests/client-admin-info.test.ts with the wizard helpers of tests/client-admin-choices-field.test.ts and cases for contract U11: on each of the six steps no `details.wizard-help` and no text "What does this mean?"; for each row of U11's table exactly one `button.wizard-info` with `aria-label` "About: <label>" and `closest("label") === null`; the two private-only icons are absent on a public poll; pressing an icon leaves every `input`'s `checked` as it was and the wizard not dirty; clicking the label text and the support line of a row with an icon switches its control; an icon in a row with class `is-disabled` is not disabled
- [X] T036 [US4] In tests/client-admin-info.test.ts add cases for contract U12: pressing an icon adds one `.modal-backdrop` > `.modal[role="dialog"][aria-modal="true"]` whose headline and text equal FR-031's row for that icon (assert each of the twelve rows of the table in spec.md, the quoted texts word for word and the unquoted ones against the present `help` strings); the three step-6 icons give the headline "When to vote" and five headings in the present order; the "Voters may add choices" text ends with "This is only available for Private polls."; the single button reads "Close" and has focus; Close, Escape and a click on the backdrop each remove the dialog and focus the icon; a second press while open adds no second dialog; a `showInfo` text holding `<b>` is shown literally; while it is open, Tab and Shift+Tab from "Close" leave the focus on it, and a click on a wizard control under the backdrop changes no control and does not mark the wizard as changed (FR-032)
- [X] T037 [P] [US4] In tests/client-admin-wizard.test.ts remove or replace every assertion that reads "What does this mean?", `.wizard-help` or its `dl`, and adapt the selectors that assume a radio or switch row is a `<label>` element (they keep `.m3-radio-item` and `.m3-switch-row`)

### Implementation for User Story 4

- [X] T038 [US4] In src/public/adminCard.js add, beside `askToDeleteChoices`, the module-level `showInfo(title, blocks)` of research R9: the `.modal-backdrop` and `.modal modal--info` markup with `role="dialog"`, `aria-modal`, `aria-labelledby` and `aria-describedby`; a `.modal-headline`; a `.modal-text` holding, per block, an optional `p.modal-info-heading` and a `p` for the text, all through `textContent`; one `button.tab-refresh.modal-action.modal-keep` "Close" that takes the focus; Tab stays on it; Close, Escape and a click on the backdrop close it and return focus to the opener; a call while one is open returns without adding another
- [X] T039 [US4] In src/public/adminCard.js add `infoButton(label, title, blocks)` returning `button.wizard-info` (`type="button"`, `aria-label="About: " + label`, a DOM-built SVG of a circle and a lower-case "i" using `currentColor`, `aria-hidden` on the SVG) whose click calls `event.stopPropagation()` and `showInfo(title, blocks)`
- [X] T040 [US4] In src/public/adminCard.js give `m3RadioRow` an optional last parameter `info`, and build the Who options of `buildStep1` through the same shape: with `info`, the row is `div.m3-radio-item` holding `input#<name>-<pid>-<value>`, and `span.m3-radio-text` holding `span.m3-row-heading` (a `label[for].m3-radio-label` and the button) and a `label[for].m3-radio-support`; without `info` the row is built exactly as today (research R10)
- [X] T041 [US4] In src/public/adminCard.js give `buildEnteredOrderSwitch` (already in the R10 shape from T033) its `info` argument only, and give the voters and add-choices switch builders the with-icon shape of research R10: `div.m3-switch-row` holding `span.m3-switch-text` (`span.m3-row-heading` with `label[for].m3-switch-label` and the button; `label[for].m3-switch-support`) and `input#id`; leave `buildLineGraphSwitch` and `buildColorsSwitch` as they are; make `howChanged` restore focus by `'#' + a.id` when the active element has an `id`, before its present `role="switch"` rule
- [X] T042 [US4] In src/public/adminCard.js remove the three `details.wizard-help` blocks from `buildStep1`, `buildStep5` and `buildStep6`, and pass their texts to the icons: `WHO_OPTIONS[].help` and `VOTERS_SWITCH_HELP` on step 1; four constants for the How entries on step 5, each icon titled with its option's label; on step 6 one constant list of the five `{ heading, text }` entries, opened under the title "When to vote" by three buttons appended inside the two `p.wizard-question` elements and `p.wizard-tz`; append " This is only available for Private polls." to `ADD_CHOICES_HELP`; add the display-order text of FR-031 as two blocks; remove the comments that described the removed blocks
- [X] T043 [US4] In src/public/adminCard.js give `m3RichTextField` and `m3Field` an optional `info`: with it, the field's `label.m3-field-label` is wrapped with the button in `span.m3-row-heading`; pass it from `m3NotesField` with the title "Notes" and the text of FR-031
- [X] T044 [P] [US4] In src/public/admin-card-m3.css add `.poll-admin-card .wizard-info` (48 px box, transparent, `color:inherit`, a 20 px mark, a state layer and a focus ring in the tokens the card's icon buttons use), `.poll-admin-card .m3-row-heading` (inline flex, centred, a small gap), the label-and-support `label` resets needed so the rows look as before, and `.modal--info .modal-text` (`max-height` from the viewport, `overflow-y:auto`) with `.modal-info-heading` in the title-small tokens; remove every `.wizard-help` rule from src/public/admin-card-m3.css, src/public/admin.css and src/public/phone-admin-m3.css; in src/public/phone-admin-m3.css give `.wizard-info` the 64 px halo
- [X] T045 [US4] Run `npx vitest run tests/client-admin-info.test.ts tests/client-admin-wizard.test.ts tests/client-admin-choices-field.test.ts tests/m3-assets.test.ts tests/phone-sheets.test.ts` and make them pass

**Checkpoint**: quickstart §6 can be walked.

---

## Phase 7: User Story 5 - Edit a long list of choices without it filling the step (Priority: P3)

**Goal**: The five-line preview, the open list with Cancel and Done, and "Voters may add choices" on step 3.

**Independent Test**: quickstart §7.

### Tests for User Story 5 (write first, see them fail)

- [X] T046 [US5] In tests/client-admin-choices-field.test.ts add cases for contract U13: step 3 opens as a preview with at most five lines as text, "Enter your choices here" when empty, a `button` "... edit" named "Edit choices" and no `textarea`; the counter and a duplicate's message under the preview; every row of U13's table (opening by the lines and by the link, Done, the three Cancel outcomes with the "Not Saved" dialog, Next / a step circle / Save / Publish with the list open, Paste in both states with a stubbed `navigator.clipboard.readText` and the snackbar texts, a switch toggled with the list open); a poll with votes reads "... edit" and its list is editable
- [X] T047 [US5] In tests/client-admin-choices-field.test.ts add cases for contracts U9 and U10: on a private poll step 3's last two controls are the entered-order switch then the add-choices switch with its two present support lines, and step 5 has no `input[role="switch"]`; on a public poll step 3 ends with the entered-order switch; both are enabled on a poll with votes; toggling the second switch leaves focus on the second; the summary, once step 3 is answered, shows "Voters may add choices: Yes." or "No." on a private poll with a part labelled "… change in Step 3", and "Choices are shown in the order entered." only when the setting is on, also on the read-only card
- [X] T048 [P] [US5] In tests/client-admin-wizard.test.ts make every test that types into or reads the choices `textarea` first open the list (one helper, e.g. `openChoices(card)`), and move the expectations about the add-choices switch and its summary part from step 5 to step 3

### Implementation for User Story 5

- [X] T049 [US5] In src/public/adminCard.js move `buildAddChoicesSwitch()` from `buildStep5` to the end of `buildStep3` (after the entered-order switch, private polls only), correct its comment, and in the summary builder move the "Voters may add choices" line into the `answered.has(3)` block with its part pointing to step 3, followed, when `s.enteredOrder`, by a line with class `wizard-summary-entered-order` reading "Choices are shown in the order entered." whose part is `part("Choices are shown in the order entered.", 3, "choicesInEnteredOrder")` (research R14)
- [X] T050 [US5] In src/public/adminCard.js add `choicesOpen: false` and `choicesAtOpen: ""` to the wizard state (not to the dirty comparison) and split `buildStep3`: when `wizard.choicesOpen` is false build `div.wizard-choices-preview` (a `div.wizard-choices-lines` with the first five `choiceLines()` entries, one `div` each, through `textContent`, or the placeholder; and `button.wizard-notes-edit` "... edit" with the chevron and `aria-label="Edit choices"`), a click on either setting `choicesAtOpen = wizard.choicesText`, `choicesOpen = true`, redrawing and focusing the textarea; fill the field's counter from `choiceLines().length` and its error from `duplicateMessage()` and the touched `choicesProblem()` in both states; add `.wizard-choices-preview .wizard-notes-edit` to `lockStep`'s step-3 selector (today `.m3-field-input, .wizard-paste .m3-tonal-btn`), so that the lock also covers the "... edit" link in the preview state and FR-043 holds there; do not give the button the class `m3-field-input`, which carries the field's own styles (research R12, R13)
- [X] T051 [US5] In src/public/adminCard.js, when `wizard.choicesOpen` is true, build above today's `textarea` (kept with all its wiring) a bar `div.notes-editor-bar` with `button.notes-editor-cancel` "Cancel" and `button.notes-editor-done` "Done": Done sets `choicesTouched = true`, `choicesOpen = false`, redraws and focuses the "... edit" button; Cancel, when `wizard.choicesText !== wizard.choicesAtOpen`, awaits `confirmDiscard()` and returns on "Keep editing", then restores `choicesText`, closes, syncs the dirty state and redraws
- [X] T052 [US5] In src/public/adminCard.js add `commitChoices()` (when the list is open: `choicesTouched = true`, `choicesOpen = false`) and call it at each of the four sites that call `commitNotes()`, before their validation; make the "Paste choices" handler work without a textarea: in the preview, apply the same normalization, `withoutDuplicateChoices` and snackbars to `wizard.choicesText`, sync the dirty state and redraw the step (research R12)
- [X] T053 [P] [US5] In src/public/admin-card-m3.css add `.poll-admin-card .wizard-choices-preview` and `.wizard-choices-lines` (the Notes preview's box, pointer cursor, each line on one row with `overflow:hidden; text-overflow:ellipsis; white-space:nowrap`, the placeholder in the on-surface-variant color), reusing the `.wizard-notes-edit` and `.notes-editor-bar` rules by adding these selectors where those rules are scoped to the Notes field; tokens only, no literal font size
- [X] T054 [US5] Run `npx vitest run tests/client-admin-choices-field.test.ts tests/client-admin-wizard.test.ts tests/client-admin-discard.test.ts tests/client-add-choice.test.ts` and make them pass

**Checkpoint**: quickstart §7 can be walked.

---

## Phase 8: User Story 6 - Clearer sentences on the View step (Priority: P4)

**Goal**: Two sentences reworded.

**Independent Test**: quickstart §8.

- [X] T055 [P] [US6] In tests/client-admin-info.test.ts add the two cases of contract U14 (step 4 with manual colors on and one choice; step 4 as an administrator with the line graph on), and a file-reading case that neither replaced sentence appears in any file of src/public/
- [X] T056 [US6] In src/public/adminCard.js change "Optional. Leave a choice on Automatic to color it for you." to "Optional. Leave a choice on Automatic and an appropriate color is automatically assigned." in `buildColorsStep`, and "On: the line graph is drawn beside the poll when it is maximized." to "On: the line graph is drawn on the Maximized view of a poll." in `buildLineGraphSwitch`; update any test in tests/client-admin-wizard.test.ts that quotes the old sentences

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T057 [P] In tests/admin-search-assets.test.ts add the remaining cases of contract U16: src/public/admin-card-m3.css has rules for `.wizard-info`, `.m3-row-heading`, `.wizard-choices-preview` and `.modal--info` with no `#` color and no `font-size` in px; no file of src/public/ contains `.wizard-help`
- [X] T058 In specs/20261119-144614-POLL-ADMIN-IMPROVEMENTS/research.md R13 replace "`lockStep` keeps its step-3 line as it is" with a sentence saying the step-3 lock also covers the preview's "... edit" link (T050); read src/public/adminList.js, the changed regions of src/public/adminCard.js and src/public/pollCard.js once more against Constitution V and VI: no `console.log` added, no explanatory comment added, comments beside changed code still true, no dead function left (`cardElements`, unused help constants)
- [X] T059 Run `npx tsc --noEmit`, `npm test`, then `npm run build` and `npm run test:built`; fix what fails without weakening a test
- [X] T060 Walk specs/20261119-144614-POLL-ADMIN-IMPROVEMENTS/quickstart.md §1–§9 by hand at 1280 × 800 and at 400 px, in the light and the dark scheme; in §1 write the measured "after" count beside SC-001, and if the two counts are not "at least eight" and "at most two", correct SC-001 in specs/20261119-144614-POLL-ADMIN-IMPROVEMENTS/spec.md to the measured numbers
- [X] T061 [P] Update README.md (the administration lists as rows, the open-poll link and when it shows, "Display Choices in the order above", the info icons, the Choices step) and ARCHITECTURE.md (`canWatch` on the admin lists from `mayWatchMany`; `choices_in_entered_order` through the projection; the card ranks by share and draws by position)
- [X] T062 [P] Update CLAUDE_COMPLETE.md with this feature's decisions, and in CLAUDE.md correct the ADMIN-SEARCH-RESULTS entry's "Search view only … the other views and the creator-only page keep cards" to say that every list is rows since this feature, keeping the current-plan block written by `/speckit-plan`
- [X] T063 TWEAK03 (US3): in src/public/pollCard.js give each `.vote-row` `data-choice-id` and make the ballot's click handler find the choice by id, not by `data[index]`, so a pick in the entered order selects the row clicked; case in tests/client-entered-order.test.ts
- [X] T064 TWEAK05 (US4): in src/public/adminCard.js give every step-1 info icon one "Who can vote" dialog (`whoHelp()`: the three options' labels as headings over their texts, then the voters switch's entry on a private poll; `infoSwitchRow` takes an optional `title`); cases in tests/client-admin-info.test.ts and tests/client-admin-wizard.test.ts
- [X] T065 TWEAK06 (US5): in src/public/adminCard.js open the editor from a click anywhere in a rich-text or Choices preview (`openFromBox`, nothing while "... edit" is disabled), and open the date and time picker from a click anywhere in the "Poll starts on" / "Poll ends on" row (`opensPicker`, `showDatePicker`); `cursor` rules in src/public/admin-card-m3.css; cases in tests/client-admin-choices-field.test.ts and the new tests/client-admin-field-click.test.ts
- [X] T066 TWEAK07 (US4): in src/public/admin-card-m3.css draw `.wizard-info` 24 px square with a 24 × 48 px `::after` target, keep `.m3-row-heading` on one line (`nowrap`, label `min-width:0`) and lay a switch row with an icon out as a two-line grid; in src/public/phone-admin-m3.css a 64 px halo (`inset:-20px`); cases in tests/admin-search-assets.test.ts
- [X] T067 TWEAK08 (US4): in src/public/adminCard.js give every step-3 icon one "Choices" dialog (`choicesHelp()`, `CHOICES_TITLE`) and every step-5 icon one "How to vote" dialog (`howInfo`); cases in tests/client-admin-info.test.ts
- [X] T068 TWEAK09 (US1): in src/public/adminCard.js route both footers' Cancel through one `requestCancel()` (returns whether the edit ended) and expose it; in src/public/adminList.js leave the edited poll's row enabled, titled "Cancel editing" (`holdResult`), and make its click run `requestCancel()` and then close the row (`cancelFromRow`); cases in tests/client-admin-rows.test.ts, and tests/client-admin-search.test.ts's held case updated

---

## Dependencies & Execution Order

- **Phase 1** first. **Phase 2** blocks Stories 2 and 3 (they read `canWatch` and `choicesInEnteredOrder`); Story 1
  does not need it but follows it in the plan's order.
- **Story 1 (Phase 3)** before Story 2: the link sits on the rows. Every later client test opens a row first (T020).
- **Story 3 (Phase 5)** needs Phase 2 only; T029–T031 (the card) and T032–T033 (the wizard) are independent of each
  other.
- **Story 4 (Phase 6)** before Story 5: T041 gives the two step-3 switches their final shape, and T049 then moves
  one of them.
- **Story 5 (Phase 7)**: T050 → T051 → T052 in order (one function); T049 is independent of them.
- **Story 6 (Phase 8)** can be done at any time after Phase 1.
- **Phase 9** last; T060 after T059.

Within a phase, tests come before the implementation tasks they check, and tasks naming the same file run in the
order listed.

## Parallel Opportunities

- Phase 2: T003, T004 and T005 together (three files); then T006 → T007 → T008 → T009 → T010 in order, T011 beside
  them.
- Phase 3: T015 beside T013–T014.
- Phase 4: T023 beside T022; T025 beside T024.
- Phase 5: T027 beside T028; T031 beside T029.
- Phase 6: T037 beside T035–T036; T044 beside T038–T043.
- Phase 7: T048 beside T046–T047; T053 beside T050–T052.
- Phase 9: T057, T061 and T062 together.

Example, Phase 2 tests:

```
Task: "Create tests/polls-entered-order.test.ts covering contracts A1–A4"
Task: "Create tests/polls-admin-can-watch.test.ts covering contract A5"
Task: "Extend tests/openapi-contract.test.ts for contract A6"
```

## Implementation Strategy

- **MVP**: Phases 1–3. Every list is rows and every card action still works; this alone can be released.
- **Then, each a releasable step**: Story 2 (the link), Story 3 (the display order), Story 4 (info icons), Story 5
  (the Choices step), Story 6 (wording).
- Phase 2 may be released with the MVP: it changes no page, and the column defaults to off.
- Stop after any checkpoint to walk that story's quickstart section before going on.
