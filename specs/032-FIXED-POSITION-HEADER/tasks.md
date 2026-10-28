---
description: "Task list for 032-FIXED-POSITION-HEADER"
---

# Tasks: Fixed-Position Site Header

**Input**: Design documents from `specs/032-FIXED-POSITION-HEADER/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md, quickstart.md

**Tests**: Included, and not optional. Constitution Principle IV requires a verifiable criterion per task. jsdom has no layout, so `fixedChrome.js`'s tests stub `offsetHeight` (research R9) and `backToTopFab.js`'s tests stub `window.scrollY` and dispatch `scroll` events; each new sheet's rules are checked by reading the sheet text, as `tests/single-row-header-sheet.test.ts` already does.

**Organization**: by user story. `src/public/header-fixed-m3.css` is edited by Foundational and US1 (incrementally, one rule block per phase, never rewritten); `tests/client-fixed-chrome.test.ts` is extended by Foundational, US1 and US2. Both files' tasks run in phase order and are not marked parallel with each other. `back-to-top-m3.css` and `backToTopFab.js` are written once, in US3; US4 only adds tests.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel: different files, no dependency on an incomplete task
- **[Story]**: US1 to US4, mapping to `spec.md`'s four user stories
- Paths are repository-relative. Test commands use `npx vitest run <file>`; the project's global setup starts its embedded PostgreSQL first, so allow a minute.
- **Code rule for every task** (Constitution VI): write no explanatory comments; names carry the meaning. Neither new sheet holds a token section, a dark twin or a literal font size.

---

## Phase 1: Setup

- [X] T001 Run `npm test` and record the result as the baseline (feature 031's suite must be green before this work starts)
- [X] T002 Run `npm run build` and confirm `dist/public` is produced

---

## Phase 2: Foundational (blocks every story)

**Purpose**: the measurement script, the header's own fixed-positioning rule, and the reserved-space override every story needs.

- [X] T003 [P] Create `src/public/fixedChrome.js` (an IIFE that returns at once when `#site-header` is missing): reads `#site-header.offsetHeight` and, when `document.querySelector(".tab-bar-wrap")` exists, its `offsetHeight` too; writes `--fixed-chrome-height-header` (the header alone) and `--fixed-chrome-height` (the sum) onto `document.documentElement.style`, coalesced into one `requestAnimationFrame`; exposes `window.FixedChrome = { height: () => number }` reading the live `--fixed-chrome-height`; a `ResizeObserver` on the header and, when present, `.tab-bar-wrap` (re-observed on rebuild), a `MutationObserver` on the header for a rebuild, and `document.fonts.ready`, the same trigger discipline as `headerFit.js` (contract C4)
- [X] T004 [P] Create `src/public/header-fixed-m3.css` with contract C3's `#site-header` rule only (not yet `.tab-bar-wrap`): `position:fixed; top:0; left:0; right:0; z-index:40; max-width:var(--max-width); margin:0 auto; padding-inline:20px` (`14px` inside `@media (max-width:639.98px)`); an opaque background (`var(--paper)`, with the dark-mode `--md-sys-color-surface` pair inside `@media (prefers-color-scheme:dark)`); and the `.container` override, `padding-top:calc(32px + var(--fixed-chrome-height,0px))` (≥ 640 px) / `calc(20px + var(--fixed-chrome-height,0px))` (≤ 639.98 px), replacing `tabs.css`'s literal values without editing that file (FIX04 later raised `#site-header` to `z-index:41`, above `.tab-bar-wrap`, so the avatar menu is not covered)
- [X] T005 Add `<link rel="stylesheet" href="/header-fixed-m3.css">` immediately after the `/header-single-row-m3.css` link in `src/public/index.html`, `login.html`, `create-account.html`, `profile.html`, `not-authorized.html`, `admin.html` and `admin-results.html`
- [X] T006 Add `<script src="/fixedChrome.js" defer></script>` immediately after the `/headerFit.js` script in the seven pages named in T005
- [X] T007 Update `tests/m3-assets.test.ts`: add `header-fixed-m3.css` to `LAYER_ORDER` after `header-single-row-m3.css` and to each of the seven pages' `layers`; run `npx vitest run tests/m3-assets.test.ts`
- [X] T008 Update `tests/pages.test.ts`: every page's asset list gains `/header-fixed-m3.css` and `/fixedChrome.js`; run `npx vitest run tests/pages.test.ts`
- [X] T009 [P] Create `tests/header-fixed-sheet.test.ts` reading the sheet text: `#site-header{position:fixed; top:0}`, the opaque background, the confined-column `max-width`/`margin`/`padding-inline` values matching `.container`'s own, and the `.container{padding-top}` override at both breakpoints
- [X] T010 [P] Create `tests/client-fixed-chrome.test.ts`: in a stubbed home page with `.tab-bar-wrap` removed from the DOM before `fixedChrome.js` runs (simulating the six pages that have none) and `#site-header.offsetHeight` stubbed to a number, `--fixed-chrome-height-header` and `--fixed-chrome-height` both equal that number, and `window.FixedChrome.height()` returns it; with `#site-header` removed from the page the script does not throw
- [X] T039 Extend `tests/client-fixed-chrome.test.ts`: after the initial measurement, changing the stubbed `offsetHeight` on `#site-header` (and, when present, `.tab-bar-wrap`) and firing the observed `ResizeObserver` callback updates both custom properties to the new values; replacing the header's children (simulating a `MutationObserver`-triggered rebuild) and resolving a stubbed `document.fonts.ready` each re-measure and update the properties too

**Checkpoint**: the header is fixed, has a background, and page content reserves space for it, on all seven pages. `.tab-bar-wrap` (home page only) is not yet pinned; `floatingActions.js` and `tabs.js` still assume `y=0`.

---

## Phase 3: User Story 1 - The header and Tab Bar stay put while scrolling the home page (Priority: P1)

**Goal**: on the home page, the Tab Bar (and, below 640 px, the Hamburger/Refresh row it already contains) is pinned along with the header, and nothing already on the page can end up positioned underneath the fixed chrome.

**Independent Test**: spec US1 scenarios; quickstart "Pinned", "Maximize", "Guest floating buttons".

- [X] T011 [US1] Add `.tab-bar-wrap{position:fixed; top:var(--fixed-chrome-height-header,0px); left:0; right:0; z-index:40; max-width:var(--max-width); margin:0 auto; padding-inline:20px}` (`14px` inside the phone query), with the same opaque background, to `src/public/header-fixed-m3.css`
- [X] T012 [US1] Extend `tests/client-fixed-chrome.test.ts`: in a stubbed home page (`fixedChrome.js` in the page's script list, as for every test in this file) with both `#site-header` and `.tab-bar-wrap` present and their `offsetHeight`s stubbed, `--fixed-chrome-height` equals the sum of both and `--fixed-chrome-height-header` equals the header's alone
- [X] T013 [US1] Extend `tests/header-fixed-sheet.test.ts`: the `.tab-bar-wrap` rule is present with the same confined-column values and background as `#site-header`, and its `top` reads `var(--fixed-chrome-height-header,0px)`
- [X] T014 [US1] Edit `src/public/floatingActions.js`'s `cardArea()`: change `top: Math.max(box.top, 0)` to `top: Math.max(box.top, window.FixedChrome ? window.FixedChrome.height() : 0)` (contract C5, architecture U5)
- [X] T015 [US1] Edit `src/public/tabs.js`'s `maximize()`: replace the `y=0` comparison and scroll target (`if (top<0) window.scrollTo(0, window.scrollY+top)`) with one that reads `window.FixedChrome ? window.FixedChrome.height() : 0` as the target offset instead of `0` (contract C5, architecture U4)
- [X] T016 [US1] Update `tests/client-floating-actions.test.ts`: add `fixedChrome.js` to the stubbed page's script list alongside `floatingActions.js`, stub `#site-header.offsetHeight` to a known non-zero value so `window.FixedChrome.height()` resolves to it, and change the existing `gridBox = { ...gridBox, top: -300, bottom: 1300 }` case so the floating pair clamps to that value instead of `0`
- [X] T017 [US1] Update `tests/client-maximized.test.ts`: add `fixedChrome.js` to the stubbed page's script list alongside `tabs.js`, stub `#site-header.offsetHeight` so `window.FixedChrome.height()` resolves to a known non-zero value, and assert that maximizing a card whose grid top is above that value scrolls so the grid lands exactly at it, not at `0`
- [X] T018 [US1] Run `npx vitest run tests/client-fixed-chrome.test.ts tests/header-fixed-sheet.test.ts tests/client-floating-actions.test.ts tests/client-maximized.test.ts`

**Checkpoint**: the home page's header, Tab Bar and Hamburger/Refresh row are all pinned; the maximized view and the guest floating buttons can no longer land underneath them.

---

## Phase 4: User Story 2 - The header stays put on every other page (Priority: P1)

**Goal**: on the six pages without a Tab Bar, the header alone is pinned, with no `.tab-bar-wrap`-shaped leakage.

**Independent Test**: spec US2 scenarios; quickstart "Pinned" on `/login`, `/create-account`, `/profile`, `/admin`, admin results and a refused admin page.

- [X] T019 [P] [US2] Extend `tests/client-fixed-chrome.test.ts`: in a stubbed home page with `.tab-bar-wrap` removed from the DOM before `fixedChrome.js` runs (the same technique T010 uses), `--fixed-chrome-height` equals `--fixed-chrome-height-header` exactly (the tab-bar-wrap term contributes nothing)
- [X] T020 [P] [US2] Extend `tests/pages.test.ts`: each of the six non-home pages' markup has no `.tab-bar-wrap` element, so the rule T011 added never applies there — implemented in `tests/m3-assets.test.ts` instead (it already reads all seven pages' raw markup directly; `pages.test.ts`'s live-server harness would need session/permission setup per page for no added value, the same deviation 031 made for its own six-page check)
- [X] T021 [US2] Run `npx vitest run tests/client-fixed-chrome.test.ts tests/pages.test.ts tests/m3-assets.test.ts`

**Checkpoint**: both P1 stories are independently verified; the shared mechanism behaves correctly with and without a Tab Bar.

---

## Phase 5: User Story 3 - A user jumps back to the top after a long scroll (Priority: P2)

**Goal**: a Back to Top button appears past 600 px scrolled, returns the page to the top on activation (smoothly, or instantly under reduced motion), and carries the right tooltip and accessible label.

**Independent Test**: spec US3 scenarios; quickstart "Appears", "Returns to top", "Tooltip and label", "Reduced motion", "Cookie banner coexistence".

- [X] T022 [P] Create `src/public/back-to-top-m3.css`: `.back-to-top-fab{position:fixed; right:20px; bottom:calc(20px + var(--cookie-banner-offset,0px)); z-index:40}`, hidden by default, shown by a class `backToTopFab.js` toggles, an opacity/transform transition that is removed inside `@media (prefers-reduced-motion:reduce)`, and `.back-to-top-fab:focus-visible{outline:3px solid var(--md-sys-color-secondary); outline-offset:2px}` matching the focus-ring convention `header-tab-bar-m3.css` already uses on the tab bar's own controls (contract C7, FR-017)
- [X] T023 [P] Create `src/public/backToTopFab.js` (an IIFE): injects one `<button id="backToTopFab" class="back-to-top-fab" type="button" aria-label="Back to top" title="Back to top">` with an inline SVG upward-arrow icon (`aria-hidden="true" focusable="false"` on the glyph, matching the codebase's existing icon convention) onto `document.body`; a passive `scroll` listener, coalesced to one check per `requestAnimationFrame`, that adds the visible class at `window.scrollY >= 600` and removes it at `window.scrollY < 400`; a `click` handler that calls `window.scrollTo({top:0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"})` (contract C6)
- [X] T024 Add `<link rel="stylesheet" href="/back-to-top-m3.css">` immediately after the `/header-fixed-m3.css` link in all seven pages
- [X] T025 Add `<script src="/backToTopFab.js" defer></script>` as the last script tag on all seven pages
- [X] T026 Update `tests/m3-assets.test.ts` and `tests/pages.test.ts` for `back-to-top-m3.css` and `backToTopFab.js` on all seven pages; run both
- [X] T027 [P] [US3] Create `tests/back-to-top-sheet.test.ts` reading the sheet text: fixed position, the `right`/`bottom` offset including the `--cookie-banner-offset` term, `z-index:40`, hidden by default, the reduced-motion query removing the transition, and a `:focus-visible` outline rule on `.back-to-top-fab`
- [X] T028 [P] [US3] Create `tests/client-back-to-top.test.ts` using `openStubbedHome`: the button exists with `aria-label="Back to top"` and `title="Back to top"` and contains an `<svg>` icon; stubbing `window.scrollY = 600` and dispatching `scroll` makes it visible; clicking it calls `window.scrollTo` with `{top:0, behavior:"smooth"}`; dispatching a keyboard `Enter` (and, separately, `Space`) on the focused button calls the same `window.scrollTo`; with the `reducedMotion` option it calls `{top:0, behavior:"auto"}` instead; after the stubbed `scrollY` returns to `0` and another `scroll` fires, it is hidden again. `backToTopFab.js` is page-agnostic by construction (it appends the button to `document.body` and listens on `window`, never on anything specific to `index.html`'s markup), so this single stubbed-home suite is the behavioral coverage for all seven pages; T026 and T037 cover that the script and link are actually present on the other six.
- [X] T029 [US3] Run `npx vitest run tests/back-to-top-sheet.test.ts tests/client-back-to-top.test.ts tests/m3-assets.test.ts tests/pages.test.ts`

**Checkpoint**: the Back to Top button works end to end, on its own, on every page.

---

## Phase 6: User Story 4 - The button stays out of the way until it's needed (Priority: P3)

**Goal**: the button never flickers while the user's scroll position hovers between the two thresholds.

**Independent Test**: spec US4 scenarios; quickstart "Hysteresis, no flicker".

- [X] T030 [US4] Extend `tests/client-back-to-top.test.ts`: at `scrollY = 599` the button is not visible; once visible, it stays visible at `scrollY = 450`; it hides only once `scrollY` drops below `400`; simulating 10 consecutive up-and-down `scroll` passes through the 400–600 pixel range (crossing down past 600, back up past 400, and repeating) changes the button's visibility no more than twice in total — one appearance and one disappearance, never flickering in between
- [X] T031 [US4] Run `npx vitest run tests/client-back-to-top.test.ts`

**Checkpoint**: all four user stories are independently functional.

---

## Phase 7: Polish and cross-cutting

- [X] T032 Run `npm test` and compare with T001; `tests/client-floating-actions.test.ts`, `tests/client-maximized.test.ts`, `tests/m3-assets.test.ts` and `tests/pages.test.ts` must be green alongside every new test file
- [X] T033 Run `npm run build` and confirm `header-fixed-m3.css`, `fixedChrome.js`, `back-to-top-m3.css` and `backToTopFab.js` appear fingerprinted under `dist/public/assets`
- [X] T034 Search the four new files for `/*` and `//` comments and remove any (Constitution VI)
- [X] T035 [P] Regenerate `README.md` at the project root (Documentation Deliverable; create if absent, otherwise update in place preserving accurate existing content)
- [X] T036 [P] Regenerate `ARCHITECTURE.md` at the project root (Documentation Deliverable)
- [ ] T037 Walk quickstart.md's manual sections at 375, 640, 1024 and 1400 px across all seven pages: pinned chrome, nothing hidden underneath, unchanged footprint at 1400 px, maximize and floating-button edge cases, re-fit on sign-in/out, the first-load shift, and the Back to Top button's appear/return/tooltip/hysteresis/reduced-motion/cookie-banner checks
- [X] T040 FIX07: title at most 50 and subtitle at most 30 characters: `TITLE_MAX`/`SUBTITLE_MAX` in `src/polls/service.ts`, `SUBTITLE_MAX = 30` for every poll in `src/public/adminCard.js`, migration `src/db/migrations/007-title-lengths.ts` (cut existing values, bump `content_version`, queue `search_outbox`), `postman/openapi.json` `maxLength` 50/30; tests in `tests/migration-title-lengths.test.ts`, `tests/polls-admin-crud.test.ts`, `tests/client-admin-wizard.test.ts`
- [X] T041 FIX08: bar text up to 13 px. `RESULTS_FONT_MAX` 11 → 13 in `src/public/pollCard.js`, which sizes the results label, its percentage and the voting label alike. Test in `tests/client-maximized.test.ts`
- [X] T042 FIX09: the card title takes the phone size (`calc(clamp(18px, 1.8vw, var(--md-sys-typescale-title-large-size)) * 0.75)`, 13.5 px) from 900 px down, on grid and maximized cards and both faces. It lives in a new `@media (max-width: 900px)` block in `src/public/single-column-m3.css`, and the phone block's own rule is removed. Bar text is unchanged (Option B). Test in `tests/single-column-sheets.test.ts`
- [X] T043 FIX10: `--md-sys-typescale-title-large-weight` 400 → 600 in `src/public/m3-tokens.css`, and Roboto `wght@400;500;600;700` in the font link of all seven pages. Tests in `tests/m3-assets.test.ts`
- [X] T044 FIX11: the `maximizedCardGrid` template's `.maximized-space-right` in `src/public/index.html` is empty, and its paragraph rules are gone from `pollCard-m3.css` and `tabs.css`. `align-self:stretch` keeps the bordered panel as tall as the card. Tests in `tests/client-maximized.test.ts` and `tests/m3-assets.test.ts`
- [X] T045 FIX12: the Maximize and Minimize icons in both faces of `src/public/pollCard.js` are a stroked rounded box (`rx` 4.125, stroke width 2.25 since FIX14) with two arrows, out to the top right and bottom left corners to maximize and in from them to the middle to minimize (FIX13), drawn in `currentColor`. Test in `tests/client-maximized.test.ts`
- [X] T046 FIX15: on a device with a pointer, hovering a grid card pulses its Maximize button in the primary colour (`maximize-pulse`, 1.8 s, an 8 px ring on the button's own `box-shadow`; a still 4 px glow under reduced motion) and shows a "Maximize Poll" label above it (FIX16), its arrow centred on the icon at either button size (`right:calc(var(--title-icon-size) / 2 - 22px)`, `top:-14px`, FIX17), in `src/public/pollCard-m3.css`. The label (`.maximize-hint`, front face only, `aria-hidden`) is removed from every card on the first maximize and stays gone for the rest of that page load (a module-level flag since FIX24; it was `localStorage` before), in `src/public/pollCard.js`. Tests in `tests/client-maximized.test.ts` and `tests/m3-assets.test.ts`
- [X] T047 FIX18: every M3 tooltip sits centred 4 px above its control, out from under the pointer, and below it only when there is no room above (`place()` in `src/public/tooltip-m3.js`; it was below first). Test in `tests/client-m3-tooltip.test.ts`
- [X] T048 FIX19: `fixedChrome.js` adds `.tab-bar-wrap`'s computed `margin-bottom` (the 60 px Hamburger/Refresh row from 900 px down) to `--fixed-chrome-height`, so cards start below the row; `header-fixed-m3.css` gives `.tab-bar-wrap::before` the page background over the row from 900 px down; `floatingActions.js` docks the guest pair 8 px left of Refresh in the row until it is dragged (`dockPosition`, `docked`), and `.floating-actions` goes to `z-index:42` in `single-column-m3.css`; `app.js` reads "Create Account To Vote". Tests in `tests/client-fixed-chrome.test.ts`, `tests/header-fixed-sheet.test.ts`, `tests/client-floating-actions.test.ts`
- [X] T049 FIX20: `fixedChrome.js` dispatches `fixedchromechange` on `window` after each `measure()`, and `floatingActions.js` re-places a docked guest pair on it, so after a reload the pair sits beside Refresh once the chrome has moved down. Tests in `tests/client-fixed-chrome.test.ts` and `tests/client-floating-actions.test.ts`
- [X] T050 FIX21: from 900 px down, in `src/public/single-column-m3.css`, Refresh is 30 × 30 (`top:calc(100% + 5px)`, icon 20 px) centred on the 40 px Hamburger (`top:100%`), both 10 px higher; the row is 50 px (`margin-bottom:calc(40px + var(--refresh-gap))`, and the same height for `header-fixed-m3.css`'s pinned background), and the menu opens at `top:calc(100% + 40px)`. Tests in `tests/single-column-sheets.test.ts` and `tests/header-fixed-sheet.test.ts`
- [X] T051 FIX22: `--refresh-gap` is `0px` in `src/public/single-column-m3.css`, so the Hamburger/Refresh row (and its pinned background) is 40 px. Test in `tests/single-column-sheets.test.ts`
- [X] T052 FIX24: the Maximize hint's dismissal is a module-level `maximizeHintDismissed` flag in `src/public/pollCard.js` instead of `localStorage`, so a refresh brings the label back. Test in `tests/client-maximized.test.ts`
- [X] T053 FIX25: the Maximize button's tooltip (`title`) reads "Maximize Poll" in both faces' markup and in `setMaximized` in `src/public/pollCard.js`; `aria-label` stays "Maximize Poll Card" and the minimize tooltip "Minimize Poll Card". Tests in `tests/client-maximized.test.ts` and `tests/client-m3-tooltip.test.ts`
- [X] T054 FIX26: at phone width with no mouse (`@media (max-width: 639.98px) and (hover: none)`), every grid card's Maximize button pulses (`maximize-pulse`, or a still glow under reduced motion) while `<html>` lacks `maximize-hint-dismissed`, in `src/public/pollCard-m3.css`; `dismissMaximizeHint()` in `src/public/pollCard.js` adds that class on the first maximize, and a refresh starts without it. Tests in `tests/m3-assets.test.ts` and `tests/client-maximized.test.ts`
- [X] T055 FIX27: `.maximized-card-flip{ min-height:0; }` in `src/public/pollCard-m3.css`, so a maximized card is only as tall as its bars need instead of at least 500 px. Test in `tests/m3-assets.test.ts`
- [ ] T038 Push to `dev` only after T032 to T037 pass (the push deploys to every visitor, on all seven pages, at every width)

---

## Dependencies and order

- Phase 1 and 2 first, in order: T003 and T004 can run together (different files); T005 → T006 → T007 → T008 follow (the seven-page edits and their pinning tests); T009 and T010 can run beside T005–T008 (different files again); T039 follows T010 (extends the same test file).
- US1 follows Phase 2 (needs `window.FixedChrome` and the header rule). Its tasks are mostly sequential because T011 edits the sheet T004 already created, and T013 extends the test T009 already created; T014/T015 and T016/T017 are two independent file pairs (production edit + its own test) and could run in either order relative to each other.
- US2 follows US1 (verifies the mechanism, including the home page's extra element, is correctly absent elsewhere) and its two tasks are independent of each other ([P]).
- US3 follows Phase 2 but has no dependency on US1 or US2 — the Back to Top button shares no file with the fixed-chrome mechanism except reading `--cookie-banner-offset`, which already exists. Its tasks T022/T023 (production) and T027/T028 (tests) are each an independent pair.
- US4 follows US3 (extends the same test file; no new production code).
- Phase 7 last.

### Parallel opportunities

- T003 and T004 (Foundational).
- T009 and T010 beside T005–T008.
- T014/T016 and T015/T017 (US1, two independent production+test pairs).
- T019 and T020 (US2).
- T022 and T023 (US3 production); T027 and T028 (US3 tests).
- T035 and T036 (Polish).

## Implementation strategy

**MVP**: Phases 1, 2, US1 and US2 together — a page that doesn't visibly lose its header while scrolling, on every page, with nothing landing underneath it. US3 and US4 (the Back to Top button) are a separable, lower-priority convenience that can ship in the same push or follow later without weakening the MVP. Deliver as one commit; the push is gated by T032–T037.
