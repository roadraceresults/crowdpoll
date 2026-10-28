---

description: "Task list for the phone tab bar"
---

# Tasks: Phone Tab Bar

**Input**: Design documents from `specs/20261023-155959-PHONE-TAB-BAR/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R10), data-model.md, contracts/ui-contracts.md (C1–C7), quickstart.md

**Tests**: Requested (SC-002, SC-003, SC-005 and quickstart §1). Behaviour is tested in jsdom with `openStubbedHome` from
`tests/helpers/single-column-page.ts` (the faked tab bar geometry: `tabWidth: 100, barWidth: 300`, eight tabs); the
stylesheet rules are pinned by reading the sheets as text, as `tests/single-column-sheets.test.ts` does. Write each
story's tests first and watch them fail.

**Organization**: Phase 2 restructures the sheet and the test helper that every story's rules and tests live in; the
four stories then each change one slice of markup, style and script.

**Branch**: `dev`. A push deploys; the change is visible at once on phones and small tablets.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task belongs to (US1–US4)

## Path Conventions

Single project: `src/`, `tests/` at the repository root. The two stylesheets are `src/public/single-column-m3.css`
(the home page's last layer; its `@media (max-width: 900px)` block holds the phone tab bar) and
`src/public/header-tab-bar-m3.css` (every page; the desktop look and the edge masks). No explanatory or
requirement-referencing comments in changed code (Constitution VI); comments inside removed regions go with them.

---

## Phase 1: Setup

No new file, dependency, setting or route is needed (plan.md, Technical Context). Nothing to set up.

---

## Phase 2: Foundational

**Purpose**: one place for the phone tab bar's rules, a fade whose width can differ by breakpoint, and a test helper
that can say "900 px or less".

### Tests for the foundation

- [X] T001 [P] In `tests/helpers/single-column-page.ts`, make the stubbed `matchMedia` answer `"(max-width: 900px)"` with `state.phone`, exactly as it answers `PHONE_QUERY` (R6), so a test can switch both with `setPhone()`
- [X] T002 [P] In `tests/single-column-sheets.test.ts`, change `split()` so the text after the phone block may be any number of `@media (max-width: 900px){` blocks, and change the "gives the tabs the same sizing from 900 px down" test into "holds the tab bar rules in one 900 px block, and none in the phone block": the phone block contains no `#tabBar`, `.tab-bar-wrap`, `.tab-menu`, `--tab-label-scale`, `--tab-label-tracking` or `--tab-pad` text; exactly one 900 px block contains `#tabBar`; `--tab-label-scale:0.9` is in that block (the avatar menu reads it, R1)
- [X] T003 [P] In `tests/client-tabs-026.test.ts`, beside the "stacks the icon over the label" test, add one that reads `src/public/header-tab-bar-m3.css` and expects each of the three `has-tabs-*` mask rules to use `var(--tab-fade, 24px)` in place of `24px` (in both the `-webkit-mask-image` and `mask-image` lines, including `calc(100% - var(--tab-fade, 24px))`), and no literal `24px` left in them (R2)

### Implementation for the foundation

- [X] T004 In `src/public/single-column-m3.css`: remove the six tab rules from the `639.98px` block (the `--tab-label-scale`, `--tab-label-tracking`/`--tab-pad` roots, the two `#tabBar .tab` rules, `#tabBar .tab.is-active::after`, and `#tabBar{ … mask-image:none !important; }`); merge the first 900 px block (the five tab rules) into the third (arrows, menu, Refresh row) so one `@media (max-width: 900px)` block holds every tab bar rule, placed where the third block is now; leave the card question's 900 px block alone (R1). Run `tests/single-column-sheets.test.ts`: T002's test passes; the old sizing assertions still pass (the rules are unchanged so far)
- [X] T005 In `src/public/header-tab-bar-m3.css`, replace the literal `24px` in the three `.tab-bar-wrap.has-tabs-* #tabBar` mask rules with `var(--tab-fade, 24px)` (R2); T003 passes; the desktop fade is unchanged

**Checkpoint**: `npm test` passes with the phone bar still looking exactly as before.

---

## Phase 3: User Story 1 — A phone visitor scrolls the tabs by swiping (Priority: P1) 🎯 MVP

**Goal**: one-line 48 px tabs with 16 px icons, no arrows, a 32 px fade at an edge where tabs wait, native touch
scrolling (contracts C1, C2, C6, C7).

**Independent Test**: at 390 px the row shows one-line tabs and no arrows; the right edge fades; after a swipe both
edges fade; at the end only the left edge; when every tab fits, neither (quickstart §2.1).

### Tests for User Story 1

- [X] T006 [P] [US1] In `tests/single-column-sheets.test.ts`, replace the "sizes the tabs to their labels" test with one on the 900 px tab block: it contains `:root{ --tab-fade:32px; }`, `#tabBar .tab{ flex-direction:row; min-width:0; height:48px; gap:6px; padding:0 12px; }`, `#tabBar .tab .tab-icon{ width:16px; height:16px; }`, `scroll-padding:0 var(--tab-fade)` inside the `#tabBar{` rule, and no `mask-image`, no `scroll-snap`, `--tab-label-tracking`, `--tab-pad`, `height:56px` or `font-size:calc(` for `#tabBar .tab` (C1, C2, R2, R3); delete the "draws the highlight behind the arrows…" and "greys a disabled arrow…" tests and reduce the highlight test to the menu button alone (`.tab-menu-btn::before`, hover, active, `aria-expanded`); delete "turns the edge fades off on a phone only…"
- [X] T007 [P] [US1] In `tests/client-tab-bar-scroll.test.ts`, delete the `tab bar arrows` and `holding an arrow` groups and the `tap`, `press` helpers they alone used; add a test that `index.html` (read from `src/public`) contains no `tab-scroll` and no `tabScrollBefore`/`tabScrollAfter`, and that the script still runs with the arrows gone (the menu button opens the menu) (R7, C7)
- [X] T008 [P] [US1] In `tests/single-column-sheets.test.ts` "keeps the arrows, the menu and the row's variables out of the phone block", drop `.tab-scroll` from the list and keep the rest; in the "the single-column sheets … outside it only hide the new controls" test, expect the hide list at the top of the sheet to be `.tab-menu-btn, .tab-menu, …` without `.tab-scroll` (read the current expected string first and remove only that selector)

### Implementation for User Story 1

- [X] T009 [US1] In `src/public/index.html`, delete the two `<button class="tab-scroll …">` elements (`#tabScrollBefore` before `#tabBar`, `#tabScrollAfter` after it) with their SVGs (R7)
- [X] T010 [US1] In `src/public/single-column-m3.css`: remove `.tab-scroll,` from the hide list at the top; in the 900 px tab block remove every `.tab-scroll` rule (the shared `.tab-scroll, .tab-menu-btn{…}` rule keeps its body for `.tab-menu-btn` alone; the `::before` highlight, `@media (hover:hover)` and `:active` rules likewise keep only `.tab-menu-btn`); remove `--tab-label-tracking`, `--tab-pad`, the `#tabBar .tab{ font-size:calc(…) }` rule and the `#tabBar .tab.is-active::after` override; add `:root{ --tab-fade:32px; }`; write `#tabBar .tab{ flex-direction:row; min-width:0; height:48px; gap:6px; padding:0 12px; }` and `#tabBar .tab .tab-icon{ width:16px; height:16px; }`; add `scroll-padding:0 var(--tab-fade);` to the `#tabBar{ flex:1 1 0; … }` rule; keep `touch-action:pan-x`, `cursor:grab`, `user-select:none` and `:root{ --tab-label-scale:0.9; }` (R1–R3, R5, C1, C2)
- [X] T011 [US1] In `src/public/tabBarScroll.js`: remove `STEP_MS`, `STEP_TABS`, `HOLD_AFTER_MS`, `HOLD_PX_PER_S`, `SETTLE_MS`, `scrollBefore`, `scrollAfter` (and their two ids from the start-up guard), `animationId`, `lastWritten`, `prefersReducedMotion`, `maxScroll`'s use by the arrows (keep `maxScroll` and `clampScroll` only if the drag still uses them; it does), `writeScroll` (the drag writes `tabBar.scrollLeft` directly), `stopAnimation`, `easeInOut`, `animateScroll`, `tabEdges`, `stepTarget`, `nearestTabEdge`, `updateArrowStates`, `onBarScrolled`, the hold loop (`holdTimer`, `holdFrame`, `holding`, `holdLoop`, `startHold`, `endHold`), `bindArrow` and its two calls, and the `scroll`, `resize` and `load` listeners that served them; keep the drag, the click swallow and the menu (R7, C7). T006–T008 and the remaining scroll tests pass

**Checkpoint**: quickstart §2.1 on a phone: one-line tabs, no arrows, the fade at the waiting edge, a swipe with
momentum. US1 alone is a shippable improvement.

---

## Phase 4: User Story 2 — Choosing a tab brings it fully into view (Priority: P1)

**Goal**: a chosen tab glides fully into view, by tap, keyboard or the All tabs menu; instant with reduced motion;
the drag is never animated (contract C3, R4).

**Independent Test**: tap a half-hidden tab and see the row glide until it is clear of the fade; press → on a focused
tab and see the same; with reduced motion the moves are instant (quickstart §2.1–2.4).

### Tests for User Story 2

- [X] T012 [P] [US2] In `tests/single-column-sheets.test.ts`, add a test on the 900 px tab block: `scroll-behavior:smooth` inside the `#tabBar{` rule, `#tabBar.is-dragging{ cursor:grabbing; scroll-behavior:auto; }`, and a nested `@media (prefers-reduced-motion: reduce){ #tabBar{ scroll-behavior:auto; } }` (C2)
- [X] T013 [P] [US2] In `tests/client-tabs-026.test.ts`, extend the arrow-key test: before pressing, replace `scrollIntoView` on every `.tab` with a recorder, and spy on `focus` of the next tab; after → the focused tab was focused with `{ preventScroll: true }` and its `scrollIntoView` was called once with `{ inline: "nearest", block: "nearest" }` (C3)
- [X] T014 [P] [US2] In `tests/client-tab-bar-scroll.test.ts` the all-tabs menu group, extend "copies a guest's greyed tabs and hands a choice to the real tab": record `scrollIntoView` calls on the chosen tab and expect none from the menu (the tab's `click()` is the only effect) (R4)

### Implementation for User Story 2

- [X] T015 [US2] In `src/public/single-column-m3.css`'s 900 px tab block, add `scroll-behavior:smooth;` to the `#tabBar{` rule, `scroll-behavior:auto;` to `#tabBar.is-dragging{ cursor:grabbing; }`, and a nested `@media (prefers-reduced-motion: reduce){ #tabBar{ scroll-behavior:auto; } }` (R4, C2); T012 passes
- [X] T016 [P] [US2] In `src/public/tabs.js` `moveTabFocus`, replace `tabs[next].focus();` with `tabs[next].focus({ preventScroll: true });` followed by `if (tabs[next].scrollIntoView) tabs[next].scrollIntoView({ inline: "nearest", block: "nearest" });` (R4, C3); T013 passes
- [X] T017 [P] [US2] In `src/public/tabBarScroll.js` `chooseMenuItem`, remove the `scrollIntoView` line (and `isDisabled` if nothing else uses it) so the item only calls `tab.click()` and closes the menu (R4); T014 passes

**Checkpoint**: quickstart §2.1–2.4; with reduced motion emulated every move is instant.

---

## Phase 5: User Story 3 — A mouse or pen user scrolls the row without arrows (Priority: P2)

**Goal**: mouse and pen drag the row; a vertical wheel scrolls it sideways while it can move, at phone widths, and
lets the page scroll otherwise; the keyboard is unchanged (contract C4, R5, R6).

**Independent Test**: in an 800 px window the wheel over the row moves it; at the end the wheel scrolls the page; a
drag follows the pointer and does not select the tab it ends on (quickstart §2.8).

### Tests for User Story 3

- [X] T018 [P] [US3] In `tests/client-tab-bar-scroll.test.ts` the drag group, add "moves the bar for a pen too": the same as the mouse drag test with `pointerType: "pen"`, expecting `tabBarScroll()` to be `80` and no click; keep "ignores touch pointers" (R5)
- [X] T019 [P] [US3] In `tests/client-tab-bar-scroll.test.ts`, add a `the mouse wheel` group using `new home.window.WheelEvent("wheel", { deltaY: 40, deltaX: 0, bubbles: true, cancelable: true })` dispatched on `#tabBar`: (a) at the start, `deltaY: 40` → `tabBarScroll()` is `40` and `defaultPrevented` is `true`; `deltaY: -40` back at the start → unchanged and not prevented; (a2) after a `deltaY: 40` tick, set the stubbed `scrollLeft` to `10` (the row mid-animation) and dispatch another `deltaY: 40` → `80`, not `50` (the target accumulates); dispatch a `scrollend` event on `#tabBar`, set `scrollLeft` to `80`, then `deltaY: 40` → `120` (the target was cleared and restarts from `scrollLeft`); (b) at `LAST_POSITION`, `deltaY: 40` → not prevented and unchanged, `deltaY: -40` → moves back and prevented; (c) `deltaX: 40, deltaY: 0` → not prevented, unchanged; (d) after `home.setPhone(false)` (which now also turns the 900 px query off, T001) `deltaY: 40` → not prevented, unchanged (R6, C4)

### Implementation for User Story 3

- [X] T020 [US3] In `src/public/tabBarScroll.js`: in `beginDrag`, replace `event.pointerType !== "mouse"` with `event.pointerType === "touch"` (R5); add `const phoneWidth = window.matchMedia ? window.matchMedia("(max-width: 900px)") : null;`, `let wheelTarget = null;` and a `scrollByWheel(event)` listener on `tabBar` (`{ passive: false }`) that returns unless `phoneWidth && phoneWidth.matches`, `event.deltaY !== 0` and `event.deltaX === 0`; computes `const from = wheelTarget === null ? tabBar.scrollLeft : wheelTarget;` and `const target = clampScroll(from + event.deltaY);`, returns when `target === from` (the row cannot move that way), else calls `event.preventDefault()`, sets `wheelTarget = target` and writes `tabBar.scrollLeft = target`; clear the target with `tabBar.addEventListener("scrollend", () => { wheelTarget = null; })` and with `wheelTarget = null;` at the top of `beginDrag`, so a tick never reads the position of a smooth scroll still in flight (R6, C4); T018–T019 pass

**Checkpoint**: quickstart §2.8 in a narrowed desktop window.

---

## Phase 6: User Story 4 — The buttons under the bar swap places (Priority: P3)

**Goal**: Refresh under the bar at the left, the All tabs menu button at the right with its menu under it (contract C5, R8).

**Independent Test**: at 390 px Refresh is at the left and the All tabs button at the right; its menu opens
right-aligned beneath it; both still work; Live Results hides Refresh (quickstart §2.2).

### Tests for User Story 4

- [X] T021 [P] [US4] In `tests/single-column-sheets.test.ts` the Refresh row group, change the expectations to `.tab-bar-wrap .tab-refresh--icon{ position:absolute; left:0; top:calc(100% + 5px); width:30px; height:30px; }`, `.tab-menu-btn{ position:absolute; right:0; top:100%; width:40px; height:40px; }` and a `.tab-menu{` rule containing `top:calc(100% + 40px);` and `right:0;` (C5); keep the `data-active`, margin-bottom and icon tests as they are

### Implementation for User Story 4

- [X] T022 [US4] In `src/public/single-column-m3.css`'s 900 px tab block, change `.tab-bar-wrap .tab-refresh--icon{ … right:0; … }` to `left:0`, `.tab-menu-btn{ … left:0; … }` to `right:0`, and `.tab-menu{ … left:0; … }` to `right:0` (R8, C5); T021 passes
- [X] T029 [US4] TWEAKS01: in the same block add `:root{ --tab-edge:20px; }` and a nested `@media (max-width: 639.98px){ :root{ --tab-edge:max(14px, calc((100% - 420px) / 2)); } }`, and make the three positions `var(--tab-edge)`, so each button is flush with the card column's edge; `tests/single-column-sheets.test.ts` expects the variable in the three rules and a new test pins its values to `pollCard.css`'s 420 px card and `tabs.css`'s 20 px / 14 px padding (R8, C5)
- [X] T030 TWEAKS02: `#tabBar{ margin-left:-16px; }` in `src/public/header-tab-bar-m3.css` and `margin-left:-12px;` in the 900 px `#tabBar{` rule of `src/public/single-column-m3.css`, each the tab's side padding, so the first tab's icon starts under the logo at every width; `tests/single-column-sheets.test.ts` pins the phone value and `tests/client-tabs-026.test.ts` the base one beside `padding:0 16px` (R3, C2, FR-014)
- [X] T031 [US1] TWEAKS03: in the 900 px block, `#tabBar .tab{ flex-direction:row; width:min-content; min-width:0; height:auto; min-height:48px; gap:6px; padding:0 12px; white-space:normal; }`, so a label of more than one word wraps to its longest word and every tab is as tall as the tallest (the row 891 → 736 px wide, 48 → 60 px tall); `tests/single-column-sheets.test.ts` "the tab bar" pins the rule (R3, C1, FR-001)
- [X] T032 TWEAKS04: `header-single-column-m3.css` `.site-header{ margin-bottom:8px; padding-top:2px; }`; `floatingActions.js` `dockPosition()` returns `x: box.right + FLOAT_ROW_GAP` (the guest pair 8 px right of Refresh, which the swap had pushed off screen); the 900 px `#tabBar .tab{` rule takes `padding:2px 12px` and the label-medium `font-size` / `line-height` (the row 684 px wide, 52 px tall); `tests/single-column-sheets.test.ts` pins both rules and `tests/client-floating-actions.test.ts` "the start beside Refresh" the new dock (R3, R8, C1, C5, FR-001, FR-013, FR-017)
- [X] T033 TWEAKS05: the 900 px `#tabBar .tab{` rule takes the four `--md-sys-typescale-label-small-*` tokens, `gap:5px` and `padding:2px 11px 2px 12px`, followed by `#tabBar .tab.is-active::after{ right:11px; }` (the row 662 px wide, 52 px tall); `header-single-column-m3.css` `.site-header{ … padding-top:3px; }`; `tests/single-column-sheets.test.ts` pins all three (R3, C1, C5, FR-001, FR-017)
- [X] T034 TWEAKS06: the 900 px `#tabBar .tab{` rule takes `gap:2px; padding:0px 10px 2px 0px;`, the underline `#tabBar .tab.is-active::after{ left:0; right:10px; }` and the block's `#tabBar{ margin-left:0; }` (no left padding to offset), so the line runs under icon and label and the first icon stays under the logo (the row 534 px wide, 48 px tall); `tests/single-column-sheets.test.ts` pins all three (R3, C1, C2, FR-001, FR-016)
- [X] T035 TWEAKS07: `text-align:left` in the 900 px `#tabBar .tab{` rule and `Shared With&nbsp;You` in `src/public/index.html`, so the lines are left-aligned and no label exceeds two lines (the row 545 px wide); `tests/single-column-sheets.test.ts` pins the rule and `tests/client-home.test.ts` maps the no-break space to a space before comparing labels (R3, C1, FR-001)
- [X] T036 TWEAKS17: a `#tabMoreBtn` (`.tab-more`, `aria-label="More"`, a vertical three-dot icon, no `.tab` class or `role="tab"`) ends `#tabBar` after Search in `src/public/index.html`; `single-column-m3.css` hides it outside the 900 px block and styles it as a phone tab inside it; `tabBarScroll.js` lets it open the All tabs menu beside `#tabMenuBtn`, which stays, with `aria-expanded` on the opener used and focus returned to it; tests in `tests/client-tab-bar-scroll.test.ts` and `tests/single-column-sheets.test.ts`
- [X] T037 TWEAKS18: the `#tabMoreBtn` icon in `src/public/index.html` is the Newest icon's `<circle cx="12" cy="12" r="12" fill="#8093a7"/>` with three `#e8edf2` dots (`r="1.8"`, `cy` 7, 12, 17); test in `tests/tab-bar-assets.test.ts`

**Checkpoint**: quickstart §2.2.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T023 [P] Add a one-line `> Amended by feature 20261023-155959-PHONE-TAB-BAR (2026-10-23): …` note under the title of each feature 030 document that describes the scroll arrows — `specs/030-INTEGRATE-SINGLE-COLUMN/spec.md`, `plan.md`, `research.md` (R5–R7), `quickstart.md`, `tasks.md`, `contracts/ui-contracts.md` — saying the arrows, the hold and the step are removed, the tabs are one line up to 900 px, and Refresh and the All tabs button have swapped sides (R7)
- [X] T024 [P] Add the same note to the feature 031 documents that describe the arrows or the Refresh row — `specs/031-SINGLE-ROW-HEADER/spec.md`, `quickstart.md`, `fix.md`, `contracts/ui-contracts.md` (R7)
- [X] T025 [P] In `CLAUDE.md`'s feature 030 paragraph, amend the "Arrows are never hidden" bullet and the "Two scripts, home page only" bullet with "(removed by feature 20261023-155959-PHONE-TAB-BAR: …)" so the two paragraphs agree
- [X] T026 Regenerate `README.md` and `ARCHITECTURE.md` (Constitution, Documentation Deliverables): the phone tab bar (one-line tabs up to 900 px, the fade, native touch scrolling, the wheel, the swapped buttons) and `tabBarScroll.js`'s new scope (drag, wheel, All tabs menu)
- [X] T027 Run `npm test` and `npm run build`; fix any failure (quickstart §1)
- [ ] T028 Manual: quickstart §2 on a phone or the device toolbar at 390, 640, 700, 900, 901 and 1400 px, with reduced motion and dark mode emulated, and §2.8 with a mouse at 800 px; check SC-001 (any tab in one swipe and one tap), SC-003 (a chosen tab glides fully into view, about half a second; at once with reduced motion) and SC-005 (the desktop bar unchanged)

---

## Dependencies & Execution Order

- **Phase 2** first: T001–T003 (tests, parallel) → T004 → T005.
- **US1** needs Phase 2 (its rules go into the merged block). **US2** needs US1's T010 (the same block and the drag class). **US3** needs US1's T011 (the trimmed script). **US4** needs Phase 2 only (T004) and can run beside US1.
- **Phase 7** after all stories; T027 before T028.

## Parallel Examples

- Phase 2: T001 ‖ T002 ‖ T003, then T004 → T005.
- US1: T006 ‖ T007 ‖ T008, then T009 → T010 → T011 (T009 and T010 touch different files and may run together; T011 after T010 so the tests see both).
- US2: T012 ‖ T013 ‖ T014, then T015; T016 ‖ T017.
- US3: T018 ‖ T019, then T020.
- US4: T021, then T022 — in parallel with US1 after T004.
- Phase 7: T023 ‖ T024 ‖ T025, then T026 → T027 → T028.

## Implementation Strategy

1. **MVP = Phase 2 + US1**: the Polymarket look, no arrows, the fade and native swiping. Deployable on its own.
2. **US2** makes every chosen tab glide into view (two lines of `tabs.js`, three CSS declarations).
3. **US3** keeps mouse and pen users whole without arrows.
4. **US4** is three CSS properties.
5. Phase 7: the earlier documents, README and ARCHITECTURE, the full suite, the phone check.
