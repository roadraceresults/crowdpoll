---

description: "Task list for the phone layout redesign"
---

# Tasks: Phone Layout Redesign

**Input**: Design documents from `specs/20261113-140600-PHONE-LAYOUT-REDESIGN/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/phone-layout.md, contracts/poll-card.md,
contracts/removed-results.md, quickstart.md

**Tests**: The plan names them (research R14); each contract is a test written before the code it checks. The look and
touch of the layout are judged by `quickstart.md` on devices.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1 to US6)

## Path Conventions

Single project at the repository root: `src/public/`, `src/`, `tests/`. "Phone query" is `(max-width: 480px)`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: A green baseline before any change.

- [X] T001 Run `npx tsc --noEmit` and `npm test` from the repository root and confirm both pass before changing anything (record any pre-existing failure instead of fixing it)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The phone type scale, the frame sheet and the way scripts and tests recognise the phone layout. Every story needs these.

- [X] T002 In `tests/helpers/single-column-page.ts`, add a `phoneLayout?: boolean` option (default `false`) and make the stubbed `matchMedia` answer the query `(max-width: 480px)` with it, with a `setPhoneLayout(value)` on the returned page that notifies listeners as `setPhone` does; existing tests keep their behaviour
- [X] T003 [P] Create `tests/phone-sheets.test.ts`: (a) `m3-tokens.css` has one `@media (max-width: 480px)` block whose `:root` sets each typescale size and line height to the phone values of contract P2; (b) `phone-m3.css` exists, is one `@media (max-width: 480px){…}` block and has no `/*` comment, no `font-size:` with a literal `px|rem|em`, no top-level `--md-sys-*` declaration, no `prefers-color-scheme`, no `data-theme` and no literal color (no `#` hex, `rgb(` or `hsl(`); (c) it sets `.page{…min-width:480px` (contract P1); (d) the string `(max-width: 480px)` is the value of `PHONE_LAYOUT_QUERY` in `pollCard.js`. Fails until T004 to T007
- [X] T004 In `src/public/m3-tokens.css`, after the existing token definitions, add `@media (max-width: 480px){ :root{ … } }` redefining the ten typescale roles' `-size` and `-line-height` to the values of research R2 (label-small 15 / 18); change no existing declaration
- [X] T005 Create `src/public/phone-m3.css` as one `@media (max-width: 480px)` block with the frame of research R11: `.page{min-width:480px}`; `.container` padding-inline 16px; the shared card frame for `.card-viewport`, `.poll-admin-card`, `.admin-search` and the card-shell face (`max-width:none; width:100%`, padding 20px, radius 20px); the header at 64px; `#tabBar .tab` at 56px; the footer and cookie notice at the column's width; the Back-to-top button at 64px. Colors only from `--md-sys-color-*` tokens (contract P5)
- [X] T006 In `tests/m3-assets.test.ts`, append `"phone-m3.css"`, `"phone-card-m3.css"`, `"phone-admin-m3.css"` to `LAYER_ORDER` in that order, and add `"phone-m3.css"` to the `PAGES` entry of the 12 pages other than `admin-results.html` (which US5 deletes and which is not restyled)
- [X] T007 In each of the 12 pages `src/public/*.html` other than `admin-results.html`, add `<link rel="stylesheet" href="/phone-m3.css">` as the last stylesheet link
- [X] T008 In `src/public/pollCard.js`, add the constant `PHONE_LAYOUT_QUERY = "(max-width: 480px)"` and `isPhoneLayout()` returning `Boolean(window.matchMedia) && window.matchMedia(PHONE_LAYOUT_QUERY).matches`, and expose it as `PollCard.isPhoneLayout` beside the existing exports
- [X] T009 Run `npx vitest run tests/phone-sheets.test.ts tests/m3-assets.test.ts tests/viewport-width-pages.test.ts` and confirm they pass

**Checkpoint**: On a phone every page has the new type sizes and frame; cards are not yet compact.

---

## Phase 3: User Story 1 - A phone visitor reads a poll's result from a short card (Priority: P1) 🎯 MVP

**Goal**: The compact card: essential bars, a "more choices" row, comfortable sizes, tap to maximize.

**Independent Test**: `npx vitest run tests/essential-choices.test.ts tests/client-phone-card.test.ts`; quickstart §4's first five boxes on a phone.

### Tests for User Story 1

- [X] T010 [P] [US1] Create `tests/essential-choices.test.ts`: load `pollCard.js` in jsdom and assert `PollCard.essentialChoices` against every row of contract C1 (shown ids in order, hidden count), and that the hidden share is the sum of the hidden choices' `pct`. Fails until T012
- [X] T011 [P] [US1] Create `tests/client-phone-card.test.ts` with `openStubbedHome(…, { phoneLayout: true })`: a 4-choice poll's card has four `.result-row` and no `.more-row`; a 12-choice single-choice poll has four and a `.more-row` reading `8 more choices · N%` with N the hidden share; a 12-choice multiple-choice poll reads `8 more choices`; a card whose `myChoiceIds` holds the 7th choice shows it fifth and reads `7 more choices`; bars are 44px high with an 8px gap and their label and percentage use the label-large size; clicking the title, a bar, the `.more-row` and `.maximize-btn` each call `onMaximize` with the pid; clicking the notes line calls it with `{ open: "notes" }`; a choice with a 35-character label keeps its whole label in the row's accessible name; a card flipped to its voting side stays on that side when the poll is refreshed from five choices to six; with `phoneLayout: false` the same polls render exactly as before (all rows, no `.more-row`). Fails until T013
- [X] T012 [US1] In `src/public/pollCard.js`, add the pure function `essentialChoices(sorted, ownIds, limits)` of `data-model.md` and expose it as `PollCard.essentialChoices`; add the two limits as constants (`COMPACT_LIMITS = { lead: 4, allUpTo: 5 }`, `MAXIMIZED_LIMITS = { lead: 10, allUpTo: 12 }`)
- [X] T013 [US1] In `src/public/pollCard.js`, when `isPhoneLayout()` and the card is not maximized: use a `phoneBarLayout()` (`{ scrolling:false, barHeight:44, gap:8 }`) in place of `singleColumnBarLayout()`; render only `essentialChoices(…).shown` in the results list, followed, when `hiddenCount > 0`, by an `li` holding `button.more-row` with the text of contract C2 (share only when the poll is single-choice); size the bar label and percentage from `--md-sys-typescale-label-large-size`; make a click on a result row, the `.more-row` and the subtitle call `requestMaximize()`, and the notes line and its "Show more" call `opts.onMaximize(pid, { open: "notes" })`. Outside the phone layout nothing changes (research R5, R6)
- [X] T014 [US1] Create `src/public/phone-card-m3.css` as one `@media (max-width: 480px)` block for the compact card (`.card-flip:not(.maximized-card-flip)`): title clamped to three lines and subtitle and notes to one, in the plain typescale tokens (overriding the `* 0.75` rules of `single-column-m3.css:42-72`); bar labels on one line, cut with an ellipsis when too long for the bar; `.more-row` as a 64px row in the bar's outline style; Watch, Maximize, Live Results and Vote 48px visible with the `::after` halo of research R3 and at least 16px between neighbours; the footer on one line. Add the link after `phone-m3.css` in `src/public/index.html`, the sheet to `PAGES["index.html"]` in `tests/m3-assets.test.ts`, and the same static checks as T003(b) for this sheet to `tests/phone-sheets.test.ts`
- [X] T015 [US1] Run `npx vitest run tests/essential-choices.test.ts tests/client-phone-card.test.ts tests/phone-sheets.test.ts tests/m3-assets.test.ts tests/single-column-sheets.test.ts tests/client-poll-notes.test.ts` and confirm they pass (the last two must pass unchanged: the 481 to 639 px card is not touched)

**Checkpoint**: A phone tab shows short cards; a long poll's Vote still flips to a full ballot until US2.

---

## Phase 4: User Story 2 - A phone visitor votes without hunting for the button (Priority: P1)

**Goal**: Vote flips in place on a whole card and opens the maximized voting side otherwise; Submit stays on screen.

**Independent Test**: `npx vitest run tests/client-phone-card.test.ts`; quickstart §4's last three boxes.

### Tests for User Story 2

- [X] T016 [US2] In `tests/client-phone-card.test.ts` add, for a signed-in viewer in the phone layout: Vote on the 4-choice card adds `.is-flipped` and calls no `onMaximize`; the back has four `.vote-row` at least 64px high; Vote on the 12-choice card does not flip and calls `onMaximize(pid, { face: "vote" })`; after `maximize(pid, { face: "vote" })` the card is `.maximized-card-flip.is-flipped`, lists all twelve `.vote-row`, `#voteBar` is not `hidden`, its Submit has the card Submit's text and `disabled` state, its count reads `0 selected` then `1 selected` after a row is clicked, the card's `.card-back .actions` is hidden and `.back-to-top` is hidden; clicking the bar's Back unflips the card and hides the bar; clicking the bar's Submit triggers the card's submit; with `phoneLayout: false`, Vote on the 12-choice card flips in place and `#voteBar` stays `hidden`. A guest's Vote still goes to `/login`. Fails until T017 and T018
- [X] T017 [US2] In `src/public/pollCard.js`: in the Vote click handler, after the existing sign-in, editing and blocked checks, when `isPhoneLayout()`, the card is not maximized and its `hiddenCount > 0`, call `opts.onMaximize(pid, { face: "vote" })` and return; add the options `onFace(pid, face)` (called whenever `.is-flipped` is added or removed) and `onSelection(pid, count)` (called whenever the selection changes); give the voting list 64px rows with no gap in the phone layout; add a method `showVoteFace()` on the mounted card that performs the same flip as Vote without re-running the routing
- [X] T018 [US2] In `src/public/index.html`, add `<div id="voteBar" class="vote-bar" hidden>` holding a Back `button.icon-btn`, a `span.vote-bar-count` and a `button.btn-primary.vote-bar-submit`, outside the card grid. In `src/public/tabs.js`: `maximize(pid, options)` accepts `{ face: "vote" }` and calls the card's `showVoteFace()` after `setMaximized(true)`; pass `onFace` and `onSelection` to every card; show `#voteBar` when a view is maximized, its card's face is `vote` and `PollCard.isPhoneLayout()`, mirror the card Submit's label and `disabled`, write `N selected`, forward the bar's two clicks to the card's `.back-btn` and `.submit-vote-btn`, and hide the bar on unflip and on `restore()`. In `src/public/phone-card-m3.css`: `.vote-bar` fixed at `bottom: var(--cookie-banner-offset, 0px)`, full width, 48px controls with halos; while it shows, hide the maximized card's `.card-back .actions` and `.back-to-top`, and pad the page's bottom by the bar's height (research R9)
- [X] T019 [US2] Run `npx vitest run tests/client-phone-card.test.ts tests/client-maximized.test.ts tests/client-remove-vote.test.ts tests/client-add-choice.test.ts` and confirm they pass

**Checkpoint**: Voting works on short and long polls in the phone layout.

---

## Phase 5: User Story 3 - A phone visitor explores a poll in the maximized view and comes back (Priority: P2)

**Goal**: Ten bars and "Show all", extras as closed rows, the card as tall as its visible side, Back closes the view.

**Independent Test**: `npx vitest run tests/client-phone-card.test.ts tests/client-maximized-history.test.ts`; quickstart §5.

### Tests for User Story 3

- [X] T020 [P] [US3] In `tests/client-phone-card.test.ts` add, in the phone layout: a maximized 12-choice poll shows twelve `.result-row` and no `.show-all-row`; a 37-choice poll shows ten (eleven when `myChoiceIds` holds the 27th) and a `.show-all-row` reading `Show all 37 choices`; clicking it shows 37 rows and the text `Show fewer`; clicking again shows ten; closing and reopening the view starts at ten; bars are 44px with an 8px gap; the view has an `.extras-header` for each of Notes, Who voted and Vote history that the poll has and none for the others, each `aria-expanded="false"` with its content hidden; no request to `/api/me/polls/<pid>/voters` is made until its header is clicked, and exactly one after two clicks; opening from the notes line gives Notes `aria-expanded="true"`. With `phoneLayout: false` the view is as today (every bar, no headers shown, voters fetched at open). Fails until T022 and T023
- [X] T021 [P] [US3] Create `tests/client-maximized-history.test.ts` covering contract H1 to H6 at `phoneLayout: true` and `false`: H1 `history.length` +1 and `location.href` unchanged after a card is maximized; H2 `history.back()` closes the view and restores the scroll position; H3 the Back arrow, Minimize, Escape and the active tab each close the view and leave `history.length` usable as before (a following `history.back()` does not reopen it); H4 choosing another tab closes it and a following `history.back()` neither reopens it nor leaves a view open; H5 and H6 a `/?PID=` landing leaves `history.length` unchanged and its Back arrow closes to the list. In `tests/client-maximized.test.ts`, replace "changes neither the address nor the browser history" with the address-unchanged half only. Fails until T025
- [X] T022 [US3] In `src/public/pollCard.js`, when `isPhoneLayout()` and the card is maximized: results use `phoneBarLayout()` and `essentialChoices(…, MAXIMIZED_LIMITS)` unless the card's `showAll` flag is set; after the bars render `button.show-all-row` (`Show all N choices` / `Show fewer`) when the full list is longer than the essential one; the flag is cleared by `setMaximized(false)`; the voting list is unaffected
- [X] T023 [US3] In `src/public/index.html` `#maximizedCardGrid`, put a `button.extras-header` (`aria-expanded="false"`, `aria-controls`) before the content of each of `.maximized-notes`, `.maximized-voters` and `.maximized-graph`, labelled Notes, Who voted and Vote history. In `src/public/tabs.js`: a header toggles `aria-expanded` and its content's `hidden`; when `PollCard.isPhoneLayout()` the voters report is fetched and the graph mounted on the first open of their header, otherwise at open as today; `maximize(pid, { open: "notes" })` opens Notes; a section the poll lacks stays `hidden`, header included. In `src/public/phone-card-m3.css`: the view as one column, `.extras-header` as 64px rows, content shown only when expanded, and `.extras-header{display:flex}`. In `src/public/tabs.css`, beside `.maximized-space-right`, add `.extras-header{display:none}` so the headers do not show above 480px
- [X] T024 [US3] In `src/public/phone-card-m3.css`, make the maximized card as tall as its visible side: the face turned away (`.card-back` without `.is-flipped`, `.card-front` with it) takes no part in the grid's height. Check the 0.7s rotation in a browser at the phone query with a 50-choice ballot; if the turn shows a wrong height or clipped face, replace the rotation for `.maximized-card-flip` in the phone sheet with an opacity cross-fade, and record which was kept in research R8
- [X] T025 [US3] In `src/public/tabs.js`, implement research R10 in one place: push `{ ...history.state, maximizedPid }` in `maximize(pid)` when called from a card (not from `showLandingPoll` or `applyPollPage`); a `popstate` listener that closes an open view when the new state has no `maximizedPid`, reopens (without pushing) when it has one and that card is in the current tab, and otherwise clears the key with `replaceState`; the Back arrow, Minimize, Escape and active-tab paths call `history.back()` when `history.state.maximizedPid` is set and otherwise `restore()` as today; tab change, search and session change set a `closingQuietly` flag and call `history.back()`, which the listener consumes; on load a stale `maximizedPid` with no view is cleared
- [X] T026 [US3] Verify research R10's open point: run `npx vitest run tests/client-back-arrow.test.ts tests/client-profile*.test.ts` and, in a browser, open and close a maximized view, go to `/profile`, press its Cancel, and confirm it returns to the home page; record the result in research R10
- [X] T027 [US3] Run `npx vitest run tests/client-phone-card.test.ts tests/client-maximized-history.test.ts tests/client-maximized.test.ts tests/client-poll-notes.test.ts tests/line-graph-ui.test.ts tests/client-home.test.ts tests/client-tabs-026.test.ts` and confirm they pass

**Checkpoint**: The home page's phone experience is complete.

---

## Phase 6: User Story 4 - Every other page is readable and tappable on a phone (Priority: P2)

**Goal**: The card-shell, legal and admin pages in the same frame, type and touch sizes; the old sub-480 rules gone.

**Independent Test**: `npx vitest run tests/phone-sheets.test.ts tests/m3-assets.test.ts`; quickstart §3 and §6.

- [X] T028 [P] [US4] In `tests/phone-sheets.test.ts` add: for each control of contract P3 a check that its selector in the phone sheets has either `min-height:64px` or a 48px height with the `::after` halo rule; `phone-admin-m3.css` passes the same static checks as T003(b); no sheet in `src/public/` contains `max-width: 479.98px`, `max-width:479.98px`, `359.98px` or `319.98px`. Fails until T029 to T032
- [X] T029 [US4] In `src/public/phone-m3.css`, the card-shell pages (login, create account, confirm sign-in, invitation, accept terms, not authorized, profile, settings): text fields 64px tall in body-large (overriding the literal `card-shell-m3.css:41`); the primary button 48px, full width, with halo; provider buttons 56px; links and checkboxes inside the card as 64px rows; the profile face without its `min-height:640px`
- [X] T030 [US4] In `src/public/phone-m3.css`, the header's Search, Log In and avatar controls at 48px with halos (overriding the 21 and 24px rules of `header-single-column-m3.css:4-30`), the home tab bar's Refresh, All tabs and maximized Back at 48px with halos, footer links and the cookie notice button as contract P3; the legal pages' `.legal-doc` across the column in body-large with the back arrow in the frame
- [X] T031 [US4] Create `src/public/phone-admin-m3.css` as one `@media (max-width: 480px)` block: toolbar in one row; view tabs as the home tab bar; `.admin-search` one field per row (field pairs, radio groups and the checkbox row in one column), Clear and Search 48px with halos; on `.poll-admin-card` the icon buttons, menu button, Open / Close / Archive and Re-attempt Screening 48px with halos, menu items and invitee rows 64px, pager buttons 48px; the wizard's step circles 48px with halos across the card, one field or switch per row, Next, Paste choices, chip removes, Cancel, Save and Publish 48px with halos (overriding the literals at `admin-card-m3.css:258`, `:287`). Link it last in `src/public/admin.html` and add it to `PAGES["admin.html"]` in `tests/m3-assets.test.ts`
- [X] T032 [US4] Delete the blocks of research R12 from `src/public/pollCard.css`, `admin.css`, `admin-card-m3.css` and `admin-search-m3.css` (the 479.98, 359.98 and 319.98px blocks, the comment at `admin.css:390-394` and the `min-width:292px` floor), then run `npx vitest run tests/poll-card-assets.test.ts tests/admin-search-assets.test.ts tests/client-admin-wizard.test.ts tests/client-admin-invitees.test.ts tests/client-admin-search.test.ts tests/client-admin-creator.test.ts tests/client-admin-discard.test.ts` and update any assertion that pinned a deleted block
- [X] T033 [US4] Run `npx vitest run tests/phone-sheets.test.ts tests/m3-assets.test.ts tests/client-admin-wizard.test.ts tests/client-admin-invitees.test.ts tests/client-header-fit.test.ts tests/legal-pages.test.ts` and confirm they pass

**Checkpoint**: Every remaining page follows the phone layout.

---

## Phase 7: User Story 5 - The Poll Results page and its exports are gone (Priority: P3)

**Goal**: The page, its four addresses, its entry points and everything only they used are removed.

**Independent Test**: `npx vitest run tests/removed-results.test.ts tests/openapi-contract.test.ts tests/pages.test.ts`.

- [X] T034 [P] [US5] Create `tests/removed-results.test.ts`: as the poll's owner and as an administrator, each of the four requests of contract X1 answers 404; `src/public/admin-results.html` and `src/public/adminResults.js` do not exist. Fails until T036 and T037
- [X] T035 [P] [US5] Edit the tests of contract X3 as its table says (`polls-admin-participants`, `polls-admin-crud`, `polls-discovery`, `who-voted-route`, `client-delete-account`, `pages`, `poll-card-assets`, `m3-assets`, and `viewport-width-pages` to 12 pages)
- [X] T036 [US5] Server: in `src/routes/pages.ts` remove the `/admin/poll/results` route, `requireOwnResults` and the header comment's mention (and the `pollExists` import if nothing else uses it); in `src/routes/pollsApi.ts` remove the three routes at `:1096-1162` and the imports of `exportPollData`, `exportPollMarkdown` and `hidesChoicesFrom`; in `src/polls/service.ts` remove `exportPollData` and `exportPollMarkdown`; in `src/polls/access.ts` remove `hidesChoicesFrom`; in `src/legal/termsGate.ts` remove `"/admin/poll/results"`. Keep `computeResults`. Run `npx tsc --noEmit`
- [X] T037 [US5] Client: delete `src/public/admin-results.html` and `src/public/adminResults.js`; in `src/public/adminCard.js` remove the "View Results" menu item, the results icon and the helpers `menuLink` and `iconLink`; remove the `icon-results` symbol from `src/public/admin.html`; remove the `.admin-field*`, `.admin-choice-list` and `.admin-participant-list` rules and the first-line comment's page names from `src/public/admin.css`
- [X] T038 [US5] In `postman/openapi.json`, remove the three paths, the `PollResults` and `Participant` schemas, and reword the descriptions at `:243`, `:252` and `:440` so none mentions the results page or an export
- [X] T039 [US5] Run `npx vitest run tests/removed-results.test.ts tests/openapi-contract.test.ts tests/pages.test.ts tests/poll-card-assets.test.ts tests/m3-assets.test.ts tests/viewport-width-pages.test.ts tests/polls-admin-participants.test.ts tests/polls-admin-crud.test.ts tests/polls-discovery.test.ts tests/who-voted-route.test.ts tests/client-delete-account.test.ts tests/terms-gate.test.ts` and confirm they pass

**Checkpoint**: The site has 12 pages.

---

## Phase 8: User Story 6 - The developer validates the layout on real phones (Priority: P3)

**Goal**: The checklist is run and recorded.

**Independent Test**: `quickstart.md` §9 has a row per device and browser of §2, and §7's two blanks are filled.

- [X] T040 [US6] Compare `specs/20261113-140600-PHONE-LAYOUT-REDESIGN/quickstart.md` with FR-039 and User Story 6's scenarios (widths, browsers, both schemes, the three checks per page, the five flows, landscape and tablet, the two questions); correct it if anything is missing
- [X] T041 [US6] With the development server running, drive a headless Chromium at 320, 360, 390 and 430px mobile emulation over the 12 pages and the 4-, 12- and 50-choice polls: record for each that `documentElement.scrollWidth` equals `clientWidth` (480), that no element's computed `font-size` is under 15px, that the compact cards of the 12- and 50-choice polls (two-line titles, no own vote outside the leaders) are no taller than 500px (SC-002), and take a screenshot of the home tab, a maximized results side, a maximized voting side with the Submit bar and the admin wizard; fix what the measurements show before the manual runs
- [ ] T042 [US6] MANUAL (developer, real phones and BrowserStack): run quickstart §3 to §6 on each device and browser of §2 in both schemes and add a row to §9 for each
- [ ] T043 [US6] MANUAL (developer): fill quickstart §7 (landscape phone, tablet, and the two questions on iOS zoom and the visitor's text size)

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T044 Run `npx tsc --noEmit` and `npm test` and confirm both pass
- [X] T045 Run `git diff origin/main -- src/public/*.css src/public/*.js` and confirm that outside `@media (max-width: 480px)` blocks and `isPhoneLayout()` branches the only changes are: the deletions of research R12 and R13, the history step of R10, the extras headers (hidden above 480px), `#voteBar` (hidden above 480px) and the new card options (contract P6)
- [X] T046 [P] In `ARCHITECTURE.md`: add a section on the phone layout (the three sheets and the token block, `isPhoneLayout`, `essentialChoices`, the compact card, the maximized view's extras and Submit bar, the history step) beside "The maximized card" and "The viewport rule"; correct "The maximized card" where it says the view never changes the history; remove the Poll Results page and exports at the lines research R13 lists
- [X] T047 [P] In `README.md`: describe the phone card (leading choices, "more choices", Vote on a long poll, the phone's Back) in the phone notes; remove "export" and the results page at `:8`, `:206`, `:258`, `:767`
- [X] T048 [P] In `CLAUDE_COMPLETE.md`, add this feature's decisions (the plan block of `CLAUDE.md`) following the entries there, and correct `:221` and `:1017`
- [X] T049 TWEAK01: in `src/public/index.html`, `src/public/tabs.js`, `src/public/phone-card-m3.css` and `src/public/tabs.css`, replace the three `button.extras-header` of T023 with the `.extras-tabs` tab bar (Read More, Polling History, Who Voted; one section shown, the leftmost available by default, missing ones greyed out); tests in `tests/client-phone-view.test.ts` and `tests/phone-sheets.test.ts` written, run postponed
- [X] T050 TWEAK02: in `src/public/phone-m3.css` set the footer lines 32 px apart with its links in the text (no 64 px link rows) and double the separator dots, which `src/public/app.js` now builds as `span.site-footer-dot`; tests in `tests/client-footer.test.ts` and `tests/phone-sheets.test.ts` written, run postponed
- [X] T051 TWEAK03: in `src/public/pollCard.js` give `MAXIMIZED_LIMITS` `abovePct: 1` and have `essentialChoices` keep only the leaders above it (all of them when none is); tests in `tests/essential-choices.test.ts` and `tests/client-phone-card.test.ts` written, run postponed
- [X] T052 TWEAK05 (on trial): in `src/public/pollCard.js` set `MAXIMIZED_LIMITS` to `abovePct: 2, allAbovePct: 0`, so `essentialChoices` also leaves the 0% choices out of a poll of twelve or fewer; tests in `tests/essential-choices.test.ts` and `tests/client-phone-card.test.ts` written, run postponed
- [X] T054 TWEAK07: in `src/public/pollCard.js` word the rows "More choices · p%", "Show all N choices · p%" and "Show few choices", and replace `showAll` by `choiceView` so a view opened from the "More choices" row (`setMaximized(true, { choices: 'voted' })`, passed on by `src/public/tabs.js`) shows every choice at 1% or more and "Remaining choices · 0%"; tests in `tests/client-phone-card.test.ts` written, run postponed
- [X] T053 TWEAK06: in `src/public/phone-card-m3.css` draw the extras tab bar's icons at 30 px (were 20 px); test in `tests/phone-sheets.test.ts` written, run postponed
- [X] T055 TWEAK11: in `src/public/phone-admin-m3.css` give the admin search result rows (merged from `admin-search`) a 16 px gap and a 28 px chevron; the rows are 64 px tall at every width already; test in `tests/phone-sheets.test.ts` written, run postponed
- [X] T056 TWEAK12: in `src/public/phone-admin-m3.css` set the Admin Search text (notice, toggle, field labels, radios, checkboxes, Search and Clear, result rows) in the `label-small` size and line height; typed fields keep `body-large`; test in `tests/phone-sheets.test.ts` written, run postponed
- [X] T057 TWEAK13: in `src/public/phone-admin-m3.css` leave each Admin Search radio group in its row of three (no longer stacked) and let the labels wrap; test in `tests/phone-sheets.test.ts` written, run postponed
- [X] T058 TWEAK14: in `src/public/phone-admin-m3.css` put the Admin Search's two checkboxes side by side in two equal columns and let their labels wrap; test in `tests/phone-sheets.test.ts` written, run postponed
- [X] T059 TWEAK16: in `src/public/phone-admin-m3.css` draw a 1 px `outline-variant` line under the admin tab bar, as under the Home tab bar; test in `tests/phone-sheets.test.ts` written, run postponed
- [X] T060 TWEAK17: in `src/public/phone-admin-m3.css` fill the Admin Search toggle with `primary` and set its text and icon in `on-primary`, as the Search button; test in `tests/phone-sheets.test.ts` written, run postponed (replaced by T061)
- [X] T061 TWEAK18: in `src/public/phone-admin-m3.css` make the Admin Search toggle an outlined button instead: a 1 px `primary` outline, `primary` text and icon, no fill; test in `tests/phone-sheets.test.ts` rewritten, run postponed
- [X] T062 TWEAK19: in `src/public/phone-admin-m3.css` give the Admin Search toggle the `corner-small` radius (8 px) in place of the pill; test in `tests/phone-sheets.test.ts` written, run postponed
- [X] T063 TWEAK20: in `src/public/phone-admin-m3.css` stop stacking the Admin Search field pairs, so each operator sits beside its value; tests in `tests/phone-sheets.test.ts` and `tests/admin-search-assets.test.ts` updated, run postponed
- [X] T064 TWEAK21: in `src/public/phone-admin-m3.css` draw the Admin Search toggle as a full-width control bar joined to the top of the search form (replaces the outlined button of T061 and T062); tests in `tests/phone-sheets.test.ts` rewritten, run postponed
- [X] T065 TWEAK22: in `src/public/phone-admin-m3.css` outline the search form under the control bar in `primary`, so bar and form share one outline; test in `tests/phone-sheets.test.ts` written, run postponed
- [X] T066 TWEAK23: in `src/public/admin.html` give both Reset controls a text span and an X icon, in `src/public/admin-search-m3.css` and `src/public/phone-admin-m3.css` lay them out (three right-aligned lines 15 px apart on a phone), and in `src/public/adminList.js` attach and hold both by class (one id only); tests in `tests/phone-sheets.test.ts` and `tests/client-admin-search.test.ts` written, run postponed
- [X] T067 TWEAK24: in `src/public/admin.html` draw the Reset controls' X on a solid circle, and in `src/public/admin-search-m3.css` stroke the X in `on-primary`; test in `tests/phone-sheets.test.ts` written, run postponed
- [X] T068 TWEAK25: in `src/public/phone-admin-m3.css` draw the facts' separator dot before a search result's first fact too; test in `tests/phone-sheets.test.ts` written, run postponed
- [X] T069 TWEAK26: in `src/public/phone-admin-m3.css` set the admin poll card's `label-medium` texts (field labels, current step label, chips, switch mark) in `label-small`; on a phone both are 15 px, so only two labels' line height changes; test in `tests/phone-sheets.test.ts` written, run postponed
- [X] T070 TWEAK27: in `src/public/adminCard.js` name five choices at most in the read-only card's "Voters choose from" line, followed by "... (N more choices)"; the wizard's summary still names all; tests in `tests/client-admin-wizard.test.ts` written, run postponed
- [X] T071 TWEAK28: in `src/public/phone-admin-m3.css` clamp the admin card's Notes summary to three lines (four at 481 px and wider); test in `tests/phone-sheets.test.ts` written, run postponed
- [X] T072 TWEAK29: in `src/public/phone-admin-m3.css` set the gap between the rows of the Admin Search form to 8 px (16 px at 481 px and wider; the 16 px gaps inside a row stay); test in `tests/phone-sheets.test.ts` written, run postponed
- [X] T073 TWEAK30: in `src/public/phone-admin-m3.css` raise that gap from 8 px to 9 px; the T072 test updated, run postponed
- [X] T074 TWEAK31: in `src/public/phone-admin-m3.css` draw each radio group of the Admin Search form 4 px closer to the row below it (`margin-bottom:-4px`), and give a floated field label a background that is transparent in its upper half; two tests in `tests/phone-sheets.test.ts` written, run postponed
- [X] T075 TWEAK32: in `src/public/phone-admin-m3.css` set the admin card's summary sentences (`.wizard-summary-text`) in `body-small` on 28 px lines (was `body-medium` on 32 px); test in `tests/phone-sheets.test.ts` written, run postponed
- [X] T076 TWEAK33: in `src/public/phone-admin-m3.css` reduce those lines from 28 px to 24 px and the padding of `.wizard-summary-link` from 5 px to 3 px; the T075 test updated, run postponed
- [X] T077 TWEAK34: give the admin card's Banned Voter Count field the class `card-banned-count` (`src/public/adminCard.js`) and hide it in `src/public/phone-admin-m3.css`; test in `tests/phone-sheets.test.ts` written, run postponed
- [X] T078 TWEAK35: in `src/public/adminCard.js` put Voter Count (and Vote Count) after Launched in the dates panel on the phone layout, and draw the counts panel there only on a poll with invitations; test in `tests/client-admin-wizard.test.ts` written, run postponed
- [X] T079 TWEAK36: in `src/public/adminCard.js` apply the five-choice limit of T070 to the summary of the open wizard as well (this replaces "the wizard's summary still names all"); its test in `tests/client-admin-wizard.test.ts` rewritten, run postponed
- [X] T080 TWEAK38 (option C): in `src/public/phone-admin-m3.css` set the wizard's Choices text area to 16 px on 24 px lines; in `src/public/viewportWidth.js` add `maximum-scale=<held width / 480>` to the fixed viewport on iOS only, so Safari does not zoom in on a focused field; tests in `tests/phone-sheets.test.ts` and `tests/client-viewport-width.test.ts` written, run postponed; a check on an iPhone is still to do
- [X] T081 TWEAK39: in `src/public/adminCard.js` add a second Next beside the heading of wizard Steps 1 to 5 on the phone layout (`.wizard-panel-top`, laid out in `src/public/phone-admin-m3.css`); both are blocked together and focus still goes to the lower one; tests in `tests/client-admin-wizard.test.ts` written, run postponed
- [X] T082 TWEAK40: density pass on the admin card's wizard in `src/public/phone-admin-m3.css` (fields and rows 64 → 48 px, step circles 48 → 40 px, gaps and paddings reduced; 23 declarations); test in `tests/phone-sheets.test.ts` written, run postponed; not checked in a browser
- [X] T083 TWEAK41: in `src/public/phone-admin-m3.css` set every typed field of the wizard (`.m3-field-input`, the notes preview and editor, `.m3-datetime`) to the Choices size, 16 px on 24 px lines; the T080 test in `tests/phone-sheets.test.ts` rewritten, run postponed
- [X] T084 TWEAK42: in `src/public/phone-admin-m3.css` remove the half-transparent label background of T074 and add `margin-top:2px` to the State field and to each operator and value pair of the Admin Search form; the label test in `tests/phone-sheets.test.ts` replaced, run postponed
- [X] T085 TWEAK43: in `src/public/adminCard.js` build the open wizard's summary as the title and subtitle alone, plain text, on the phone layout; an empty summary is hidden in `src/public/phone-admin-m3.css`; test in `tests/client-admin-wizard.test.ts` written, run postponed
- [X] T086 TWEAK44: in `src/public/adminCard.js` draw the wizard's footer buttons a second time between the summary and the step circles on the phone layout (`.wizard-footer--top`), both refreshed together and the review note kept above the lower one; tests in `tests/client-admin-wizard.test.ts` written, run postponed

---

## Dependencies & Execution Order

- **Phase 1**, then **Phase 2**, block everything.
- **US1 (Phase 3)** needs Phase 2. **US2 (Phase 4)** needs US1 (`hiddenCount`). **US3 (Phase 5)** needs US1 and US2 (`maximize(pid, options)`).
- **US4 (Phase 6)** needs Phase 2 only; it can run beside US1 to US3 (different sheets), except `tests/phone-sheets.test.ts` and `tests/m3-assets.test.ts`, which several tasks edit.
- **US5 (Phase 7)** needs nothing but Phase 1 and touches no phone sheet. It is listed by priority, but doing it right after Phase 2 saves work: T031 then restyles an admin card that no longer has the results icon.
- **US6 (Phase 8)** needs US1 to US5. T042 and T043 are the developer's.
- **Phase 9** after US5 for T044 to T048.

### Parallel Opportunities

- T010 and T011; T020 and T021; T034 and T035; T046, T047 and T048.
- US4's sheets (T029 to T031) beside US1 to US3's scripts.
- US5 beside any other story.

## Implementation Strategy

- **MVP**: Phases 1 to 3. Phone tabs show short, readable cards.
- **Voting and exploring**: Phases 4 and 5 complete the home page.
- **The rest of the site**: Phases 6 and 7.
- **Decision to ship**: Phase 8; nothing is merged before the checklist's runs are recorded.
