---
description: "Task list for 031-SINGLE-ROW-HEADER"
---

# Tasks: Single Row Header

**Input**: Design documents from `specs/031-SINGLE-ROW-HEADER/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md, quickstart.md

**Tests**: Included, and not optional. Constitution Principle IV requires a verifiable criterion per task. jsdom has no layout and applies no stylesheet, so the script tests model the header's width (research R9) and the CSS is checked by reading the sheet text, as `tests/single-column-sheets.test.ts` does.

**Organization**: by user story. `src/public/headerFit.js` and `src/public/header-single-row-m3.css` are edited by several stories, so their tasks run in story order and are not marked parallel with each other.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel: different files, no dependency on an incomplete task
- **[Story]**: US1 to US5, mapping to `spec.md`'s five user stories
- Paths are repository-relative. Test commands use `npx vitest run <file>`; the project's global setup starts its embedded PostgreSQL first, so allow a minute.
- **Code rule for every task** (Constitution VI): write no explanatory comments; names carry the meaning. The new sheet holds no token sections, no dark twins and no literal font size.

---

## Implementation status (2026-10-14)

`vitest` does not start in this sandbox (the `rollup` native module is missing) and neither does the embedded PostgreSQL the suite needs, so `npm test`, `npm run build` and anything in a real browser were not run here. What was run instead, with the stand-in runner used for feature 030:

- **The new and changed DOM and sheet tests** (`tests/client-header-fit.test.ts` 17, `single-row-header-sheet.test.ts` 8, `client-search-tab-field.test.ts` 10, `single-column-sheets.test.ts` 15, `m3-assets.test.ts` 22) and the 030 DOM suites that share the pages (`client-floating-actions.test.ts` 14, `client-tab-bar-scroll.test.ts` 18, `client-create-poll-item.test.ts` 5): all passed.
- **All fourteen home-page scripts together**, with `headerFit.js`, loaded in jsdom at phone and wide width with no script error; wide and narrow headers got `no-name no-search no-link` at a modelled 700 px (the `no-link` step was removed by FIX07), and the phone got no attribute.
- `npx tsc --noEmit`: clean (tests are not part of that project).
- **The comment check (T034)**: no `/*` or `//` in `header-single-row-m3.css` or `headerFit.js`.

**Tasks left open for the developer:** T001 and T002 (baseline run and build), T032 and T033 (the full suite and the build after the change), and T035 to T037 (the walk at six widths, the below-640 and 1400 px checks, and the push). T008's new test in `tests/pages.test.ts` and the `client-home.test.ts` run in T024 need the server and its database, so they were written but not run here.

**Deviations from the task text:**
- `modelHeaderWidth` takes `(window, clientWidth, widths?)` and returns `{ setClientWidth, naturalWidth }` (T009).
- The page test in T008 checks four pages served to a guest (`/`, `/login`, `/create-account`, `/admin`); the other three pages are pinned by `tests/m3-assets.test.ts`, which reads their files.
- The "/" case in T023 injects the real rules of `single-column-m3.css` that sit outside its phone block, so the test is made of the shipped sheet rather than a stub.
- All of T006, T022 and T030 were written together as the one file `headerFit.js`.

## Phase 1: Setup

- [ ] T001 Run `npm test` and record the result as the baseline (feature 030's suite must be green before this work starts)
- [ ] T002 Run `npm run build` and confirm `dist/public` is produced

---

## Phase 2: Foundational (blocks every story)

**Purpose**: the layer, its links, the script that measures, and the test model for the header's width.

- [X] T003 Create `src/public/header-single-row-m3.css` with the layout rules of contract C2 and C3 only: `--header-search-min-width:200px`; `.site-header{flex-wrap:nowrap; min-height:56px}`; `.site-header > *{flex-shrink:0}`; `.site-header > .header-search{flex:1 1 auto; min-width:var(--header-search-min-width)}` (the extra class so it outranks the children rule); `white-space:nowrap` on `.header-nav-link` and `.header-user`; and the `@media (max-width:767.98px)` override giving `.site-header > .header-search` back `order:0; margin-top:0; flex:1 1 auto; max-width:640px`; every layout rule, the override included, inside `@media not all and (max-width: 639.98px)`, with the custom property `--header-search-min-width:200px` on `.site-header` inside it too, so nothing sits outside the query
- [X] T004 Add `<link rel="stylesheet" href="/header-single-row-m3.css">` immediately after the `/header-single-column-m3.css` link in `src/public/index.html`, `login.html`, `create-account.html`, `profile.html`, `not-authorized.html`, `admin.html` and `admin-results.html`
- [X] T005 Update `tests/m3-assets.test.ts`: add `header-single-row-m3.css` to `LAYER_ORDER` after `header-single-column-m3.css` and to each of the seven pages' `layers`; run `npx vitest run tests/m3-assets.test.ts`
- [X] T006 Create `src/public/headerFit.js` (an IIFE that returns at once when `#site-header` is missing): the ladder `["no-name","no-search","no-link","no-logo"]` (`no-link` removed by FIX07, T041, and `no-logo` by FIX08, T042); `overflows()` comparing the header's `scrollWidth` and `clientWidth`; `evaluate()` that clears the attribute, then applies each token in turn on `document.documentElement` (`data-header-fit`, tokens joined by a space), re-measuring after each and stopping when the row fits, skipping `no-link` when `.header-nav-link` has no `is-inert` class; it removes the attribute and does nothing when `matchMedia("(max-width: 639.98px)")` matches (guarded for a missing `matchMedia`); one evaluation at load
- [X] T007 Add `<script src="/headerFit.js" defer></script>` after the `/app.js` script in the seven pages named in T004
- [X] T008 Update `tests/pages.test.ts`: the home page's asset list gains `/header-single-row-m3.css` and `/headerFit.js`; add a test that each of the other six pages links the sheet and the script; run `npx vitest run tests/pages.test.ts`
- [X] T009 Add to `tests/helpers/single-column-page.ts` an exported `modelHeaderWidth(window, { clientWidth, widths })` that defines `scrollWidth` and `clientWidth` on `#site-header` from a table of item widths (`logo`, `wordmark`, `search`, `link`, `name`, `avatar`, `buttons`), counting only the items not hidden by the tokens in `data-header-fit` and, for the link, only when it is present; no existing export changes

**Checkpoint**: the sheet and script load on all seven pages; nothing is hidden yet because no rule for a token exists.

---

## Phase 3: User Story 1 - The header is always one row (Priority: P1)

**Goal**: at 640 px and wider the header never wraps; with room, nothing changes.

**Independent Test**: spec US1 scenarios; quickstart "One row" at every width.

- [X] T010 [P] [US1] Create `tests/single-row-header-sheet.test.ts` reading the sheet text: the header is `nowrap` with `min-height:56px`; direct children `flex-shrink:0`; the search box (`.site-header > .header-search`) has `min-width:var(--header-search-min-width)` and the custom property is `200px` on `.site-header`; `white-space:nowrap` on the link and the user area; the 767.98 px query gives the search box back `order:0`; everything in the sheet (the layout rules, the custom property and the step rules) sits inside the one `@media not all and (max-width: 639.98px)` block and nothing sits outside it (so the phone header is as feature 030 left it); no `/*` comment, no token section, no `font-size:` with a literal size
- [X] T011 [P] [US1] Create `tests/client-header-fit.test.ts` with `describe("one row")`: in a stubbed home page with `modelHeaderWidth` set to a width where everything fits, `data-header-fit` is absent; with `#site-header` removed from the page the script does not throw; at a phone width the attribute is absent whatever the model says
- [X] T012 [US1] Run `npx vitest run tests/single-row-header-sheet.test.ts tests/client-header-fit.test.ts tests/m3-assets.test.ts` and fix anything in `src/public/header-single-row-m3.css` or `headerFit.js`

**Checkpoint**: US1 delivered as layout; the steps follow.

---

## Phase 4: User Story 2 - The user name steps aside first (Priority: P1)

**Goal**: the name disappears before anything else, and the avatar stays.

**Independent Test**: spec US2 scenarios; quickstart "Name first".

- [X] T013 [US2] In `tests/client-header-fit.test.ts` add `describe("the user name")`: for a signed-in user at a width where the full header overflows by less than the name's width, `data-header-fit` is exactly `no-name`; at a wider width it is absent again after the next evaluation; the avatar button and `.avatar-menu` are still present
- [X] T014 [US2] In `tests/single-row-header-sheet.test.ts` add: `html[data-header-fit~="no-name"] #header-username{ display:none; }` is in the sheet
- [X] T015 [US2] Add that rule to `src/public/header-single-row-m3.css`, inside the wide-range media block
- [X] T016 [US2] Run `npx vitest run tests/client-header-fit.test.ts tests/single-row-header-sheet.test.ts`

---

## Phase 5: User Story 3 - The search box steps aside next, and search stays possible (Priority: P2)

**Goal**: the header box hides when the name's removal is not enough, the Search tab field shows in its place, and typed terms survive.

**Independent Test**: spec US3 scenarios; quickstart "Search next".

- [X] T017 [US3] In `tests/client-header-fit.test.ts` add `describe("the search box")`: when removing the name is not enough, `data-header-fit` is `no-name no-search`; with terms typed in `#siteSearchBox`, entering `no-search` puts them in `#searchTabBox` and shows its clear button; typing in `#searchTabBox` while `no-search` is set changes `SiteSearch.value()`; after widening the window the header box holds the terms
- [X] T018 [US3] In `tests/single-row-header-sheet.test.ts` add: the `no-search` rule hides `.header-search`
- [X] T019 [US3] Add `html[data-header-fit~="no-search"] .header-search{ display:none; }` to `src/public/header-single-row-m3.css`, inside the wide-range media block
- [X] T020 [US3] In `src/public/single-column-m3.css` move the Search tab field's look (the `.search-tab-form`, `.search-tab-form input`, `::placeholder` and `::-webkit-search-cancel-button` rules) out of the phone block to before it, keep `.search-tab-form{ display:none; }` as the default, keep `display:flex` for the phone block, and add `html[data-header-fit~="no-search"] .search-tab-form{ display:flex; }` before the phone block (nothing may follow the phone block)
- [X] T021 [US3] Update `tests/single-column-sheets.test.ts`: the text outside the phone block of `single-column-m3.css` is no longer one line; assert instead that the new outside text holds the default `display:none`, the field's look and the attribute rule, that the phone block still sets `.search-tab-form{ display:flex; }`, that nothing follows the phone block, and that the text outside the phone block of `header-single-column-m3.css` is still exactly `.avatar-menu-create-poll{ display:none; }` with nothing after its phone block (SC-007)
- [X] T022 [US3] Add to `src/public/headerFit.js` `syncTerms()`: on entering `no-search` copy `SiteSearch.value()` into `#searchTabBox` when it is non-empty and dispatch a bubbling `input` event (`new Event("input", { bubbles: true })`) on the field; a delegated `input` listener on `#searchTabBox` that calls `SiteSearch.set(value)` while the attribute contains `no-search`; both guarded for a missing `window.SiteSearch` and a missing field
- [X] T023 [US3] Extend `tests/client-search-tab-field.test.ts` with a case that, with the attribute `no-search` set and the field's display made visible the way that file already does, "/" outside a text field focuses `#searchTabBox`
- [X] T024 [US3] Run `npx vitest run tests/client-header-fit.test.ts tests/single-row-header-sheet.test.ts tests/single-column-sheets.test.ts tests/client-search-tab-field.test.ts tests/client-home.test.ts`

---

## Phase 6: User Story 4 - A guest's header still fits (Priority: P2)

**Goal**: a user who may create polls keeps the Create Poll link, and the logo mark is never hidden (as first written, the inert link and then the logo mark went; FIX07 removed the link step, T041, and FIX08 the logo step, T042).

**Independent Test**: spec US4 scenarios; quickstart "Guest" and "Member who may create polls".

- [X] T025 [US4] (as first written; superseded by FIX07, T041, and FIX08, T042) In `tests/client-header-fit.test.ts` add `describe("the Create Poll link and the logo")`: a guest still overflowing after `no-search` gets `no-name no-search no-link`, then `… no-logo`; the word mark is never in a rule; a user whose link is active (no `is-inert` class) gets `no-name no-search no-logo` and never `no-link`; a user without permission (link inert) gets `no-link`
- [X] T026 [US4] (as first written; superseded by FIX07, T041, and FIX08, T042) In `tests/single-row-header-sheet.test.ts` add: the `no-link` rule hides `.header-nav-link.is-inert`, the `no-logo` rule hides `.brand-logo`, and no rule hides `.brand-wordmark` or `.header-user .avatar-btn`
- [X] T027 [US4] (as first written; superseded by FIX07, T041, and FIX08, T042) Add `html[data-header-fit~="no-link"] .header-nav-link.is-inert{ display:none; }` and `html[data-header-fit~="no-logo"] .brand-logo{ display:none; }` to `src/public/header-single-row-m3.css`, inside the wide-range media block
- [X] T028 [US4] Run `npx vitest run tests/client-header-fit.test.ts tests/single-row-header-sheet.test.ts`

---

## Phase 7: User Story 5 - The header re-fits itself when things change (Priority: P3)

**Goal**: resize, a rebuilt header, late fonts and the phone query each trigger a fresh measurement from the full header.

**Independent Test**: spec US5 scenarios; quickstart "Re-fit".

- [X] T029 [US5] In `tests/client-header-fit.test.ts` add `describe("re-measuring")`: a `resize` event changes the tokens when the model's width changes; replacing the header's contents (sign-out then sign-in through `Session.refresh`, as `client-floating-actions.test.ts` does) re-measures; `document.fonts.ready` resolving re-measures; the phone query changing to a phone removes the attribute and back to wide restores the tokens; widening removes tokens in reverse order; a direct child of the header changing size (a text-size change) re-measures; several triggers in one frame cause one evaluation
- [X] T030 [US5] Add to `src/public/headerFit.js`: a coalescing `requestAnimationFrame` scheduler; a `ResizeObserver` on `#site-header` and on each of its direct children, observed again after every rebuild (the window `resize` event when `ResizeObserver` is missing); a `MutationObserver` on the header's children; `document.fonts.ready.then(schedule)` when `document.fonts` exists; a `change` listener on the phone media query; `evaluate()` writes the attribute only when its value changes
- [X] T031 [US5] Run `npx vitest run tests/client-header-fit.test.ts`

---

## Phase 8: Polish and cross-cutting

- [ ] T032 Run `npm test` and compare with T001; `tests/client-m3-header.test.ts`, `tests/client-home.test.ts`, `tests/tabs*.test.ts`, `tests/m3-assets.test.ts`, `tests/pages.test.ts` and `tests/single-column-sheets.test.ts` must be green
- [ ] T033 Run `npm run build` and confirm `header-single-row-m3.css` and `headerFit.js` appear fingerprinted under `dist/public/assets`
- [X] T034 Search the new and edited files (`header-single-row-m3.css`, `headerFit.js`, the edited part of `single-column-m3.css`) for `/*` and `//` comments and remove any (Constitution VI)
- [X] T038 Apply the five phone tab rules from 900 px down in a `@media (max-width: 900px)` block at the end of `src/public/single-column-m3.css`, and pin it in `tests/single-column-sheets.test.ts` (FIX02)
- [X] T039 Move the tab-bar, arrow, all-tabs menu and Refresh-row rules from the phone block into a second `@media (max-width: 900px)` block (768 px at first, 900 px after FIX04) in `src/public/single-column-m3.css`, place the all-tabs button flush left on the Refresh row, and redraw its icon in `src/public/index.html`; retarget and extend `tests/single-column-sheets.test.ts` (FIX03)
- [X] T040 Size the guest header buttons like the card Vote button from 900 px down: a nested `@media (max-width: 900px)` rule in `src/public/header-single-row-m3.css` and one rule in `src/public/header-single-column-m3.css`; pin both in `tests/single-row-header-sheet.test.ts` and `tests/single-column-sheets.test.ts` (FIX05)
- [X] T041 Remove the `no-link` step and the inert Create Poll link (`src/public/app.js` renders the link only for a user who may create polls; `headerFit.js`, `header-single-row-m3.css` and the tests drop `no-link`); the earlier task lines that mention it are history (FIX07)
- [X] T042 Show the logo mark at all widths: remove `no-logo` from `src/public/headerFit.js` and `src/public/header-single-row-m3.css`, remove the phone `.brand-logo{ display:none; }` from `src/public/header-single-column-m3.css`, add `padding:0 16px` to the 641 to 900 px guest button rule, and update `tests/client-header-fit.test.ts`, `tests/single-row-header-sheet.test.ts`, `tests/single-column-sheets.test.ts` and the width model (FIX08)
- [X] T043 Add `.header-nav{ margin-left:auto; }` to the wide block of `src/public/header-single-row-m3.css` and pin it in `tests/single-row-header-sheet.test.ts` (FIX09)
- [X] T044 Replace the `LOGO` placeholder in `.brand-logo` (`SITE_HEADER_MARKUP`, `src/public/app.js`) with the brand mark traced from `dontTrack/rough-logo-mockup-04.jpg` (the FIX10 revision of `-03.png`) on the same `0 0 120 120` viewBox: bubble outline `stroke="#000000"` and inner fill `#FAFAFA` so the existing dark-theme rules in `header-tab-bar-m3.css` recolour them, a green `#3FB34F` figure in front of a red `#E04A4A` one, the gap between them cut by a `mask` (keyword `black`/`white`, which the dark-theme rules do not touch); assert it in `tests/client-header-fit.test.ts` (FIX10)
- [X] T045 In `tests/client-home.test.ts`, the Live Results overlay test (020/FIX011) waits for TRENDING's bookmark button to read `aria-pressed="true"` before handing the poll over, and asserts the `/api/me/polls` requests by URL and status (FIX11)
- [ ] T035 Walk the quickstart "Manual" section at 1400, 1024, 900, 768, 700 and 640 px as a guest, as a member who may create polls and as a member who may not, on the home page and the six other pages, and record the widths at which each step fires (these numbers replace the estimates in `architecture/031-single-row-header/architecture.md` section 4)
- [ ] T036 Check below 640 px that every page is as it was after feature 030 (SC-007), and at 1400 px that every header is unchanged apart from the plus icon FIX01 adds to the Create Poll link (SC-005)
- [ ] T037 Push to `dev` only after T032 to T036 pass (the push deploys to every visitor at 640 px and wider)

---

## Dependencies and order

- Phase 1 and 2 first, in order: T003 → T004 → T005; T006 → T007 → T008; T009 can run beside T003 to T008 (different file).
- US1 follows Phase 2. US2, US3, US4 follow US1 and are mostly sequential because they edit `header-single-row-m3.css` and `headerFit.js`; their test tasks add to `tests/client-header-fit.test.ts` and `tests/single-row-header-sheet.test.ts`, which T010 and T011 create, so they follow those and run in story order.
- US3 is the only story that edits `single-column-m3.css`, and T020 must be followed by T021 in the same sitting (the sheet pin fails until it is updated).
- US5 follows US4 because its test covers the full ladder.
- Phase 8 last.

### Parallel opportunities

- T010 and T011 (US1) create two different files and can run together.
- T009 beside T003 to T008.

## Implementation strategy

**MVP**: Phases 1 and 2, US1, US2 and US3 together. Without US3 a narrow window still overflows once the name is gone, so the search step belongs with the first two. US4 completes the ladder for guests and US5 makes it robust to resizing, sign-in and late fonts. Deliver as one commit; the push is gated by T035 and T036.
