---
description: "Task list for 030-INTEGRATE-SINGLE-COLUMN"
---

> Amended by feature 031 (2026-10-14): tasks that placed the logo hide, 24 px buttons, or the arrows, menu and Refresh row inside the 639.98 px block describe the 030 state; see `spec.md` under Clarifications.

> Amended by feature 20261023-155959-PHONE-TAB-BAR (2026-10-23): the scroll arrows, the hold and the step are removed (`tabBarScroll.js` keeps the drag, now for mouse and pen, gains a mouse-wheel handler and keeps the All tabs menu); up to 900 px each tab is one line, a 16 px icon beside the label in a 48 px tab, the row has a 32 px edge fade and scrolls with the browser's own touch scrolling, smoothly when a tab is chosen, and Refresh sits under the bar at the left with the All tabs button at the right.

# Tasks: Integrate Single Column

**Input**: Design documents from `specs/030-INTEGRATE-SINGLE-COLUMN/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md, quickstart.md

**Tests**: Included, and not optional. Spec FR-017 requires them and Constitution Principle IV requires a verifiable criterion per task. jsdom has no layout and applies no stylesheet, so script tests stub the bar's measurements and CSS is checked by reading the sheet's text; how it looks is checked by hand on a phone (quickstart).

**Organization**: by user story. `src/public/single-column-m3.css` and `src/public/index.html` are edited by several stories, so their tasks run in story order and are not marked parallel with each other.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel: different files, no dependency on an incomplete task
- **[Story]**: US1 to US7, mapping to `spec.md`'s seven user stories
- Paths are repository-relative. Test commands use `npx vitest run <file>`; the project's global setup starts its embedded PostgreSQL first, so allow a minute.
- **Porting rule for every task that copies from `prototypes/SINGLE-COLUMN-RENDERING/`** (Constitution VI, research R12): copy the rules and the behavior, not the comments; the prototype's harness (session picker, width readout, sample data, sample notices) is never copied; name functions by purpose.

---

## Implementation status (2026-10-13)

`vitest` does not start in this sandbox (the `rollup` native module is missing) and neither does the embedded PostgreSQL the suite needs, so `npm test`, `npm run build` and anything on a phone were not run here. What was run instead:

- **The four new DOM tests and the sheets test** (`tests/client-tab-bar-scroll.test.ts`, `client-floating-actions.test.ts`, `client-search-tab-field.test.ts`, `client-create-poll-item.test.ts`, `single-column-sheets.test.ts`: 60 tests) were run with a small stand-in runner that transpiles them and supplies `describe`, `it` and `expect`: all pass. They use `tests/helpers/single-column-page.ts` (new), which loads `index.html` and the named scripts in jsdom with `/api/me` and `/api/config` answered from the test, so they need no server or database. Reverting the hold fix made the two first-frame tests fail.
- **The pin test's logic** (`tests/m3-assets.test.ts`) was run against the real pages: all seven match.
- **All eleven production scripts together** (`app.js` to `floatingActions.js`) were loaded in jsdom at phone and wide width with no script error; on the phone the guest buttons float, in the wide layout they are in the header.
- `npx tsc --noEmit`: clean (tests are not part of that project).

**Tasks left open for the developer:** T001 and T002 (baseline run and build), the "run vitest" checkpoints T010, T013, T024, T033, T039, T044, T047 and T050 (they run existing suites such as `client-home`, `client-m3-header`, `tabs` and `pages`, which need the database), T014, T025, T034, T040 and T051 (manual phone checks), T054 (whole suite), T055 (build), T056 (real phone and deploy) and T057 (commit note).

**Deviations from the task text:**
- T015, T026 and T035 do not open the page through `openPage` and the server; they use the helper above (T035 stubs the tab controller around `searchTab.js`).
- T041 became a new file, `tests/client-create-poll-item.test.ts`; the existing menu test in `tests/client-home.test.ts` was updated for the new item (it lists the menu's links).

## Phase 1: Setup

**Purpose**: a known baseline. The feature adds no dependency, configuration or migration.

- [ ] T001 Run `npm test` on the current tree and note the result (green, with the count of files and tests) in the commit message of the first commit of this feature; nothing is edited.
- [ ] T002 [P] Run `npm run build` and confirm `dist/public` exists, so the later check that the new sheets and scripts are fingerprinted has a baseline (`devScripts/build-assets.ts`).

---

## Phase 2: Foundational (blocks every story)

**Purpose**: the two sheets exist, are linked on the right pages, in the right order, and the project's pin tests know about them. After this phase nothing looks different yet.

- [X] T003 Edit `tests/m3-assets.test.ts`: add `header-single-column-m3.css` to `LAYER_ORDER` immediately after `header-tab-bar-m3.css` and `single-column-m3.css` last; add `header-single-column-m3.css` to the `layers` of all seven pages (`index.html`, `login.html`, `create-account.html`, `profile.html`, `not-authorized.html`, `admin.html`, `admin-results.html`) and `single-column-m3.css` to `index.html`'s; the script lines are added later, with the tasks that add the script tags (T023, T032). Run it and watch it fail.
- [X] T004 [P] Edit `tests/pages.test.ts` (the home-page asset list near line 186): add `/header-single-column-m3.css` and `/single-column-m3.css` to the assets the home page must reference (the scripts are added at T023 and T032). Run it and watch it fail.
- [X] T005 [P] Create `src/public/header-single-column-m3.css` containing only the empty block `@media (max-width: 639.98px){ }` (contract C1).
- [X] T006 [P] Create `src/public/single-column-m3.css` containing, above the media block, the `display:none` defaults for `.tab-scroll`, `.tab-menu-btn`, `.tab-menu`, `.floating-actions` and `.search-tab-form`, and, inside `@media (max-width: 639.98px)`, the marker `:root{ --single-column:1; }` and the tunable variables of contract C2 with their values.
- [X] T007 Edit `src/public/index.html`: add `<link rel="stylesheet" href="/header-single-column-m3.css">` after the `header-tab-bar-m3.css` link and `<link rel="stylesheet" href="/single-column-m3.css">` after the `pollCard-m3.css` link.
- [X] T008 [P] Edit `src/public/login.html`, `src/public/create-account.html`, `src/public/profile.html`, `src/public/not-authorized.html`, `src/public/admin.html` and `src/public/admin-results.html`: add `<link rel="stylesheet" href="/header-single-column-m3.css">` in the position `LAYER_ORDER` gives (after `header-tab-bar-m3.css` where the page has it).
- [X] T009 Create `tests/single-column-sheets.test.ts` that reads both new sheets and asserts: `--single-column:1` appears only inside the media block of `single-column-m3.css`; every selector rule other than the listed `display:none` defaults is inside a media block with `max-width: 639.98px`; neither sheet has a token section, a dark twin, a literal `font-size` in px, or a comment other than a URL or external reference. Run it: green.
- [ ] T010 Run `npx vitest run tests/m3-assets.test.ts tests/pages.test.ts tests/single-column-sheets.test.ts`; the suites are all green now that T007 and T008 have added the links.

**Checkpoint**: both sheets are linked on the right pages; nothing renders differently.

---

## Phase 3: User Story 1 - Read and vote on polls comfortably on a phone (Priority: P1) 🎯 MVP

**Goal**: one column of compact poll cards on a phone (FR-001 to FR-003).

**Independent Test**: at 384 px the home page has one column, 16 px between cards, compact card sizes, no sideways scroll; at 640 px and wider nothing changes.

- [X] T011 [US1] Extend `tests/single-column-sheets.test.ts` with the US1 assertions: `single-column-m3.css` sets `.card-grid{ gap:var(--card-gap); }`, and `.poll-totals`/`.poll-voted` and `.btn-vote`/`.live-link` use the same `label-large size * 0.75` expression; the maximized card keeps its sizing (every card rule is scoped by `:not(.maximized-card-flip)`); `--card-gap` is `16px`. Run it and watch it fail.
- [X] T012 [US1] Port the card rules into `src/public/single-column-m3.css`, inside the media block, from `prototypes/SINGLE-COLUMN-RENDERING/single-column.css`: `.card-flip:not(.maximized-card-flip)` min-height/bar-scroll/results/voting/arrow-row rules, `.question`, `.subtitle`, `.poll-totals, .poll-voted` (label-large × 0.75), `.btn-vote, .live-link` (21 px high, label-large × 0.75), `.icon-btn, .bookmark-btn, .maximize-btn` (24 px, svg 15 px), `.live-bars` (10.5 px), and `.card-grid{ gap:var(--card-gap); }`.
- [ ] T013 [US1] Run `npx vitest run tests/single-column-sheets.test.ts tests/client-m3-header.test.ts tests/client-home.test.ts tests/client-maximized.test.ts`: green.
- [ ] T014 [US1] Manual (quickstart, home page step 1 and step 8): at 384 px one column, compact cards, Vote, bookmark, Live Results and maximize work, a maximized card keeps today's size; at 700 and 1200 px nothing differs from the last deploy.

**Checkpoint**: the cards are the MVP of the layout and can be demoed alone.

---

## Phase 4: User Story 2 - Reach every tab with a thumb (Priority: P1)

**Goal**: arrows, hold, drag and the all-tabs menu (FR-005 to FR-011).

**Independent Test**: at 384 px reach each of the eight tabs using only the arrows, then only the menu, then only swiping.

### Tests for User Story 2

- [X] T015 [P] [US2] Create `tests/client-tab-bar-scroll.test.ts` (opens `index.html` with `scripts` naming `tabBarScroll.js` after `tabs.js`, stubbing `getBoundingClientRect`, `clientWidth`, `scrollWidth` and `scrollLeft` on `#tabBar` for 8 tabs of 100 px in a 300 px bar, and `matchMedia` for the single column): assert both arrows exist without `hidden`, the left is `aria-disabled` at the start and the right at the end; three taps right give 200, 400, 500 and four taps left from the end give 300, 100, 0, 0; a press under 300 ms steps, a press over 300 ms scrolls and ends with a settle to a tab edge; **a hold of the right arrow at the very left and of the left arrow at the very right scrolls even when the first frame's time stamp is older than the start**; a hold to the end greys the arrow; a keyboard activation takes one step; a press on a greyed arrow does nothing; reduced motion jumps; a mouse drag of 3 px selects the tab and a drag of 8 px moves the bar and swallows the click; `#tabScrollBefore`, `#tabScrollAfter`, `#tabMenuBtn` and `#tabMenu` each have an accessible name (`aria-label`); the menu lists 8 items with the current one marked, an item calls the real tab's `click()`, a guest's greyed item goes to `/login`, Escape closes and returns focus, Arrow keys move, a tap outside closes. Run it and watch it fail.
- [X] T016 [US2] Extend `tests/single-column-sheets.test.ts` with the tab bar assertions (FR-005, FR-011): `single-column-m3.css` gives `#tabBar .tab` `min-width:0`, a 56 px height, `padding:0 var(--tab-pad)` and `letter-spacing:var(--tab-label-tracking)`; gives `.tab-scroll::before` and `.tab-menu-btn::before` a 32 px round shape with `opacity:var(--tab-hover-opacity)` inside `@media (hover:hover)` and `opacity:var(--tab-press-opacity)` for `:active`; greys `.tab-scroll[aria-disabled="true"]` and removes its highlight; and `--tab-hover-opacity` is `0.08`, `--tab-press-opacity` `0.2`, `--tab-pad` `6px`, `--tab-label-tracking` `-0.03em`. Run it and watch it fail (green after T018).

### Implementation for User Story 2

- [X] T017 [US2] Edit `src/public/index.html`: add `#tabScrollBefore` before `#tabBar`, and `#tabScrollAfter`, `#tabMenuBtn` and `#tabMenu` after it, with the markup and attributes of contract C3 (no `hidden` on the arrows; the menu is `hidden`); copy the arrow and hamburger SVGs from the prototype's `index.html`.
- [X] T018 [US2] Port the tab bar rules into `src/public/single-column-m3.css` inside the media block from the prototype: `#tabBar` (flex, `min-width:0`, masks off with `mask-image:none !important`, `touch-action:pan-x`, grab cursor and the dragging cursor), `#tabBar .tab` (`min-width:0`, 56 px, no gap, `padding:0 var(--tab-pad)`, `letter-spacing:var(--tab-label-tracking)`, font size from `--tab-label-scale`), the underline inset, `.tab-bar-wrap` gap, `.tab-scroll`/`.tab-menu-btn` (32 px wide, arrow 56 px high centred, hamburger 32 px high at the top, 24 px glyphs, glyph at the outer end of each arrow), the `::before` highlight circles with the hover (inside `@media (hover:hover)`) and pressed opacities, the disabled arrow colour, and the `.tab-menu` and `.tab-menu-item` rules.
- [X] T019 [US2] Create `src/public/tabBarScroll.js` (an IIFE that returns at once if `#tabBar`, `#tabScrollBefore`, `#tabScrollAfter`, `#tabMenuBtn` or `#tabMenu` is missing): constants `STEP_MS`, `STEP_TABS`, `HOLD_AFTER_MS`, `HOLD_PX_PER_S`, `SETTLE_MS`, `DRAG_START_PX`; `matchMedia` guarded; functions `tabEdges`, `stepTarget`, `nearestTabEdge`, `updateArrowStates` (sets `aria-disabled` on scroll, resize and after the tab bar changes).
- [X] T020 [US2] In `src/public/tabBarScroll.js` add `animateScroll(target, duration)` (rAF, ease-in-out, reduced motion jumps, cancelled when `scrollLeft` differs from the last written value or on any press) and the arrow handlers: tap steps, press over `HOLD_AFTER_MS` runs `holdLoop` with `Math.max(0, now - last)` and ends only at the end in its direction, release settles to `nearestTabEdge`, a keyboard click steps, a greyed arrow ignores everything, `contextmenu` suppressed on the arrows.
- [X] T021 [US2] In `src/public/tabBarScroll.js` add the mouse drag on `#tabBar` (mouse pointers only, `DRAG_START_PX`, grab cursor class, a capture-phase click swallow so a drag never selects a tab).
- [X] T022 [US2] In `src/public/tabBarScroll.js` add the all-tabs menu: `buildTabMenu` rebuilds items from `#tabBar .tab` on every open (icon clone, label, `is-active`, copied `aria-disabled`), `setMenuOpen` toggles `hidden` and `aria-expanded`, an item calls the real tab's `click()` then scrolls it into view and closes, outside tap and Escape close, Arrow Up/Down/Home/End/Enter move and activate, focus returns to `#tabMenuBtn` on Escape and on a keyboard choice.
- [X] T023 [US2] Edit `src/public/index.html`: add `<script src="/tabBarScroll.js" defer></script>` after `/liveResults.js`; then add `tabBarScroll.js` to `index.html`'s `scripts` in `tests/m3-assets.test.ts` (after `liveResults.js`) and `/tabBarScroll.js` to the home-page asset list in `tests/pages.test.ts`.
- [ ] T024 [US2] Run `npx vitest run tests/client-tab-bar-scroll.test.ts tests/m3-assets.test.ts tests/pages.test.ts tests/client-home.test.ts tests/client-tabs-026.test.ts`: all green, including `m3-assets` and `pages`.
- [ ] T025 [US2] Manual (quickstart, home page steps 2 and 3) on a phone: arrows, step, hold, swipe, drag, menu, highlights; the tabs never shift when an arrow greys.

**Checkpoint**: US1 and US2 together are the usable phone home page and can ship.

---

## Phase 5: User Story 3 - Sign in or create an account from anywhere (Priority: P2)

**Goal**: the guest's pair floats, drags, stays inside the card area (FR-013).

**Independent Test**: as a guest at 384 px, scroll, drag, resize, sign out and in.

### Tests for User Story 3

- [X] T026 [P] [US3] Create `tests/client-floating-actions.test.ts` (opens `index.html` with `floatingActions.js` in `scripts`, stubbing `getBoundingClientRect` on the visible panel's `.card-grid` taken from the real `index.html` (which has no `#cardGrid`), the pair's size, `innerHeight` and `matchMedia`): a guest on a phone has both buttons in `#floatingActions` and none in `#header-actions`, at the start position (flush right, 4 px under the grid's top); a member or administrator has none; the wide layout moves the buttons back into the header; a 3 px movement is an ordinary press and the click goes through; an 8 px drag moves the pair, is clamped to the grid's left, right and the viewport's bottom, and the click is swallowed; a scroll that brings the grid's top under the pair pushes it down; a resize that leaves the pair outside returns it to the start, one that still fits keeps it; **a header rebuild (sign-out then sign-in, and sign-in then sign-out) replaces the buttons and never duplicates them**; a sign-in-only site shows one button; the pair's buttons keep their order in the page (Log In before Create Account); after a tab switch the pair is held inside the newly visible grid; when a card is maximized (the grid hidden, `.maximized-card-grid` shown) the pair keeps its position if it still fits, is clamped into the maximized area if not, and is never moved to the corner of the screen. Run it and watch it fail.

### Implementation for User Story 3

- [X] T027 [US3] Edit `src/public/index.html`: add `<div class="floating-actions" id="floatingActions" hidden></div>` as the last element of `<body>` before the scripts (contract C5).
- [X] T028 [US3] Add the floating rules to `src/public/single-column-m3.css` inside the media block: `.floating-actions` fixed, `left:0; top:0`, z-index above the cards and below `.tab-menu`, flex with an 8 px gap, `touch-action:none`, grab cursor and the dragging cursor, `[hidden]` hides it, the buttons get the shadow and `.btn-header-ghost` the surface background.
- [X] T029 [US3] Create `src/public/floatingActions.js` (an IIFE returning at once without `#floatingActions` or `#site-header`; the card area is read at use time from `.tab-panel:not([hidden])`'s `.card-grid:not([hidden])` or, while a card is maximized, its `.maximized-card-grid:not([hidden])`): constants `FLOAT_TOP_GAP`, `FLOAT_DRAG_PX`; `cardArea`, `clampToCardArea`, `startPosition`, `fitsInCardArea`, `paintFloatingActions`.
- [X] T030 [US3] In `src/public/floatingActions.js` add `syncFloatingActions` (the header slot is the source of truth: empty `#floatingActions`, then move the slot's `.btn-header-ghost` and `.btn-header-primary` there when the screen is a phone and the user is a guest, else hide it), run by a `MutationObserver` on `#site-header` (childList, subtree) and by `matchMedia` changes; guard `matchMedia`.
- [X] T031 [US3] In `src/public/floatingActions.js` add the drag (press then more than `FLOAT_DRAG_PX` moves the pair as a unit, clamped, capture-phase click swallow), the scroll handler (clamp), the resize handler (reset to the start if the pair no longer fits fully), and a clamp after cards mount, after a tab switch and when a card is maximized or restored (a `MutationObserver` on the panel's grids' `hidden` attributes).
- [X] T032 [US3] Edit `src/public/index.html`: add `<script src="/floatingActions.js" defer></script>` after `/tabBarScroll.js`; then add `floatingActions.js` to `index.html`'s `scripts` in `tests/m3-assets.test.ts` (after `tabBarScroll.js`) and `/floatingActions.js` to the home-page asset list in `tests/pages.test.ts`.
- [ ] T033 [US3] Run `npx vitest run tests/client-floating-actions.test.ts tests/m3-assets.test.ts tests/pages.test.ts tests/client-home.test.ts tests/client-landing.test.ts`: all green, including the two pin tests.
- [ ] T034 [US3] Manual (quickstart, home page step 5) on a phone.

---

## Phase 6: User Story 4 - Search on a phone (Priority: P2)

**Goal**: a Search tab field (FR-014).

**Independent Test**: at 384 px, search from the Search tab, clear, press "/", open a `?q=` link.

### Tests for User Story 4

- [X] T035 [P] [US4] Create `tests/client-search-tab-field.test.ts` (opens `index.html`, default scripts): submitting `#searchTabForm` calls the same `POST /api/search` as the header box and shows results; the clear button empties the field and the results; `SearchTab.submit("x")` writes `x` into `#searchTabBox`; `/` outside a text field focuses and selects the field when it is displayed and the header box is not focused; with the field `display:none`, `/` still focuses the header box; the `app.js` search handlers still work for `#siteSearchBox`; `/?q=senate` fills the field and runs. Run it and watch it fail.

### Implementation for User Story 4

- [X] T036 [US4] Edit `src/public/index.html`: add the form of contract C6 inside `#panel-search` before its `.card-grid`.
- [X] T037 [US4] Add the field's rules to `src/public/single-column-m3.css` inside the media block (`.search-tab-form` shown, styled like `.header-search`; the clear button uses the existing `.header-search-clear`).
- [X] T038 [US4] Edit `src/public/searchTab.js`: delegated handlers for `#searchTabForm` submit (calls `submit`), `#searchTabClear` click (calls `clear`), `#searchTabBox` input (shows or hides the clear button), a capture-phase `keydown` for `/`; `submit` and `clear` write to and empty the field (contract C7). `app.js` is not touched.
- [ ] T039 [US4] Run `npx vitest run tests/client-search-tab-field.test.ts tests/search-home.test.ts tests/client-home.test.ts`: green.
- [ ] T040 [US4] Manual (quickstart, home page step 6).

---

## Phase 7: User Story 5 - Start a new poll from the avatar menu (Priority: P2)

**Goal**: the avatar menu's Create Poll item (FR-015).

**Independent Test**: open the avatar menu at 384 px as an administrator, a user with the creating permissions and a plain member.

- [X] T041 [P] [US5] Edit `tests/client-m3-header.test.ts`: add cases that, signed in as an administrator, as a user with both `Create Poll` and `View Polls`, and as a plain member, the avatar menu has `a.avatar-menu-create-poll` between Edit Profile and Poll Administration; enabled with `href="/admin"` for the first two; for the plain member it has `aria-disabled="true"`, the title "You need permission to create polls", `aria-describedby="createPollReason"`, a visible `#createPollReason` line reading "Needs permission to create polls", is focusable, and a click does not navigate (`defaultPrevented`); Poll Administration is absent for the plain member; a guest has no avatar menu. Run it and watch it fail.
- [X] T042 [US5] Edit `src/public/app.js` (the avatar menu build, after the Edit Profile link): create the item per contract C8 (the disabled variant includes the visible reason line) using the existing `canCreatePolls(me)`; no other change to the file.
- [X] T043 [US5] Add to `src/public/header-single-column-m3.css` inside the media block: `.avatar-menu-create-poll` shown, its `[aria-disabled="true"]` look (the colour `.header-nav-link.is-inert` uses), and the smaller dimmed second line `.avatar-menu-create-poll-reason`; and above the block `.avatar-menu-create-poll{ display:none; }`. Update `tests/single-column-sheets.test.ts` for the new default.
- [ ] T044 [US5] Run `npx vitest run tests/client-m3-header.test.ts tests/single-column-sheets.test.ts tests/client-home.test.ts`: green. Manual (quickstart, home page step 7).

---

## Phase 8: User Story 6 - Refresh the current tab (Priority: P3)

**Goal**: the Refresh row (FR-012).

**Independent Test**: at 384 px press Refresh on Trending, then open Live Results.

- [X] T045 [US6] Extend `tests/single-column-sheets.test.ts`: `single-column-m3.css` places `.tab-bar-wrap .tab-refresh--icon` absolutely at `right:0` and `top:calc(100% + var(--refresh-gap))`, gives `.tab-bar-wrap` `margin-bottom:calc(40px + var(--refresh-gap) * 2)` and `.tab-bar-wrap[data-active="live"]` a 20 px margin; `--refresh-gap` is `10px`. Run it and watch it fail.
- [X] T046 [US6] Add those three rules to `src/public/single-column-m3.css` inside the media block; no change to the button's markup or `tabs.js`.
- [ ] T047 [US6] Run `npx vitest run tests/single-column-sheets.test.ts tests/tabs.test.ts`: green. Manual (quickstart, home page step 4): Refresh under the line, flush right, 10 px above and below; gone with no space on Live Results; its disabled look unchanged.

---

## Phase 9: User Story 7 - A compact header on every page (Priority: P3)

**Goal**: the compact header on all seven pages (FR-004, FR-019).

**Independent Test**: the seven-page checklist at four widths.

- [X] T048 [US7] Extend `tests/single-column-sheets.test.ts`: `header-single-column-m3.css`, inside the media block only, sets `.site-header` margin-bottom 8 px, `.brand-logo, .brand-wordmark` 24 px high, `.btn-header-ghost, .btn-header-primary` 24 px high, hides `.brand-logo`, `.header-nav`, `#header-username` and `.header-search`. Run it and watch it fail.
- [X] T049 [US7] Port the header rules into `src/public/header-single-column-m3.css` inside the media block (values from the task above; the logo icon hidden as the approved prototype shows it).
- [ ] T050 [US7] Run `npx vitest run tests/single-column-sheets.test.ts tests/m3-assets.test.ts tests/client-m3-header.test.ts`: green.
- [ ] T051 [US7] Manual (quickstart, seven pages): at 360, 384, 414 and 639 px on `/`, `/login`, `/create-account`, `/profile`, `/not-authorized`, `/admin`, `/admin/results`: no overflow, nothing cut off or overlapped, the avatar menu opens and its items are reachable, the page's own cards or forms keep their layout. Record any failing page in a note at the end of this file and fix it before T056.

---

## Phase 10: Polish & cross-cutting

- [X] T052 Read `src/public/tabBarScroll.js`, `src/public/floatingActions.js`, the two sheets and the `searchTab.js` and `app.js` diffs for any explanatory comment, requirement or task reference, browser-console logging or leftover harness code, and remove them (Constitution V and VI).
- [X] T053 [P] Run `npx tsc --noEmit` and the project's linters if configured: clean.
- [ ] T054 Run the whole suite, `npm test`: green, with no skipped file that was running at T001, and `git diff --stat` against the last deploy shows only `src/public/`, `tests/`, `specs/`, `designDocs/`, `architecture/`, `CLAUDE.md` and `.specify/` (FR-018: no server, data or configuration change).
- [ ] T055 [P] Run `npm run build` and confirm `dist/public` holds fingerprinted copies of the two sheets and two scripts and that the home page and the six other pages reference them by fingerprinted name.
- [ ] T056 Run the full quickstart (home page steps 1 to 8, then the seven pages) on a real phone against `npm run dev`, then push to `dev` and repeat the seven-page check on the deployed site; record the result at the end of this file.
- [ ] T057 After the deployed check passes, note in the commit message that removing `SINGLE-COLUMN-RENDERING` from `ENV_PROTOTYPES` in `.do/app.yaml` is a later change (plan R14); do not make it here.

---

## Dependencies & Execution Order

- **Phase 1** (T001, T002): no dependencies.
- **Phase 2** (T003 to T010): after Phase 1; blocks every story. T003 and T004 are tests that must fail first; T005 and T006 create the sheets in parallel; T007, T008 link them; T009 pins them.
- **US1 (P1)** after Phase 2; touches `single-column-m3.css`. **US2 (P1)** after US1 only because it edits the same sheet and `index.html` (no behavioral dependency); US1 can ship alone.
- **US3, US4 (P2)** after US2's `index.html` and sheet edits (same files); they do not depend on US2's behavior. **US5 (P2)** needs only Phase 2 and the header sheet; it can run beside US3 and US4.
- **US6 (P3)** after the sheet exists; **US7 (P3)** needs only Phase 2.
- **Polish** after every story you intend to ship.

```text
Phase 1 ─▶ Phase 2 ─┬▶ US1 ─▶ US2 ─┬▶ US3
                    │              ├▶ US4
                    │              └▶ US6
                    ├▶ US5 (header sheet, app.js)
                    └▶ US7 (header sheet)
                                   all ─▶ Polish
```

## Parallel Examples

- Phase 2: T004, T005, T006 and T008 touch different files and can run together after T003.
- Tests first, one per story, in different files: T015, T026, T035 and T041 can be written in parallel, then run and watched failing.
- US5 and US7 only touch `header-single-column-m3.css`, `app.js` and their tests, so they can run beside US3 and US4.
- Polish: T053 and T055 are independent.

## Implementation Strategy

### MVP first

1. Phase 1 and Phase 2.
2. US1, then stop and check the cards on a phone (T014).
3. US2: the home page is usable on a phone. This is the suggested first release candidate (US1 + US2).

### Incremental delivery

4. US3, US4, US5 (all P2), each checked on its own.
5. US6 and US7 (P3), then Polish and the deployed seven-page check (T056).

Nothing in this feature changes the server, so every story can be demoed from `npm run dev` and reverted by removing its sheet rules or script tag.

## Notes

- [P] tasks = different files, no dependencies.
- [Story] labels map each task to a user story in `spec.md`.
- Verify the test fails before implementing it (each story's first task).
- Commit after each task or logical group.
- Avoid: copying the prototype's comments or harness, editing a production stylesheet, touching `tabs.js`, and any change to `app.js` beyond the avatar item.
