---
description: "Task list for 021-MAXIMIZED-POLL-CARD"
---

# Tasks: Maximized Poll Card

**Input**: Design documents from `specs/021-MAXIMIZED-POLL-CARD/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md,
quickstart.md

**Tests**: Test tasks are included and are **not** optional here. Constitution v1.1.0 Principle IV
requires a verifiable criterion per task, and Principle VI treats the suite as documentation. SC-005
and SC-009 are automated checks by definition. jsdom does not lay out, paint or animate, so the
responsive thresholds, the icon's look and the clip's tracking of the moving fill are manual steps
in `quickstart.md`. Inline styles, element identity, `document.activeElement`, requests and the
address are all observable in jsdom, so those are automated.

**Test files**: the plan names `tests/client-home.test.ts`. The feature's cases go into two **new**
files instead: `tests/client-maximized.test.ts` (US1, US2, US4, US5) and
`tests/client-bar-colours.test.ts` (US3). That keeps the 1,500-line home suite untouched, lets the
colour story's tests run in parallel with the view's, and lets the maximized suite start its own
context with a small `ENV_MAX_TRENDING_POLLS` for the retention cases.

**Organization**: grouped by user story. US1 and US2 together are the maximized view. US3, the
colours, is independent of both and can proceed in parallel. US4 and US5 build on US1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel: different files, no dependency on an incomplete task
- **[Story]**: US1–US5, mapping to the user stories in `spec.md`
- Paths are repository-relative

---

## Phase 1: Setup

**Purpose**: a known-green baseline. The feature adds no dependency, configuration or source file.

- [X] T001 Run `npm test` and `npm run build` on the untouched tree and record both results in this task's line (test files and counts; built asset count). Every later checkpoint compares against it. *Baseline 2026-09-24: 42 files passed, 1 skipped / 653 tests passed, 15 skipped; build clean, 23 fingerprinted assets.*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the icon asset, the view's markup, a behaviour-preserving refactor of the renderers'
sizing, and the new test file's scaffolding.

**⚠️ CRITICAL**: no user story work can begin until this phase is complete

- [X] T002 [P] Trace `designDocs/dontTrack/maximizeIcon.jpg` into `designDocs/dontTrack/maximizeIcon.svg`. Threshold the image (every non-white pixel black, white transparent), vectorise it (e.g. `potrace`; install with `sudo apt-get install -y potrace imagemagick` if absent), and reduce it to **one** `<path>` with `fill="#000"` in a square `viewBox` with no background. If `potrace` cannot be installed (the sandbox's network policy may block the download) or its output is not one clean path, hand-author the icon from simple shapes instead: a rounded-square outline broken at its lower left, a filled rounded square in that corner, and a round-capped arrow to the upper right, merged into one `<path>` (stroked shapes converted to outlines). Either way, check it by rendering the SVG back to PNG and comparing it with the JPG by eye: the rounded square, the filled box at lower left, and the arrow to upper right (FR-006; contracts C1) — *2026-09-24: traced with `potrace` (installed by apt), threshold at mid-grey so the JPG's faint watermark lines stay out; 3 sub-paths in one path, 0.25% of pixels differ from the thresholded JPG at 560 px*
- [X] T003 [P] In `src/public/index.html`, add one `<template id="maximizedCardGrid">` before the scripts. It holds `<div class="maximized-card-grid">` with, in order: `<div class="maximized-card-close-row"><button class="icon-btn maximized-card-close" type="button" aria-label="Close Poll Card">` + the × SVG from `src/public/cardShell.js` (`viewBox="0 0 24 24"`, two paths `M18 6L6 18`, `M6 6l12 12`, `aria-hidden="true"`) + `</button></div>`; `<div class="col-rule" aria-hidden="true"></div>`; and `<div class="maximized-space-right">` holding the ten Lorem ipsum `<p>` paragraphs copied verbatim from `research/MAXIMIZED-POLL-CARD/SINGLE-CARD-LAYOUT/single-card.html`'s `.maximized-space-right` (research R5; contracts C2) — *FIX04: the close row and its button are removed from the template; the card's Minimize icon closes the view.*
- [X] T004 In `src/public/pollCard.js`, make `renderPollResults` and `renderVotingOptions` take a final `layoutFor(count, wrap)` argument in place of their internal `computeBarLayout(count, wrap.clientHeight)` calls. Add `function measuredBarLayout(count, wrap){ return computeBarLayout(count, wrap.clientHeight); }`. In `initPollCard`, hold `let layoutFor = measuredBarLayout;` and pass it from `render()` and from the Vote button's `renderVotingOptions` call. No behaviour change: run `npx vitest run tests/client-home.test.ts tests/poll-card-assets.test.ts` and confirm green (research R2)
- [X] T005 [P] Create `tests/client-maximized.test.ts`, modelled on `tests/client-home.test.ts`'s imports, `beforeAll` / `afterAll` / `beforeEach`. Start its own context with `startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1200", ENV_MAX_TRENDING_POLLS: "3" })`, lowering any partner setting `loadConfig` cross-checks. Add helpers: `seedPoll(title, choiceCount, opts)` (via `makePoll`, then `trendingSweep` / `newestSweep`), `cardByTitle(page, title)`, `maximizedGrid(page, tab)`, and `requestsTo` (copied). Stub `window.scrollTo` (jsdom does not implement it) and a writable `window.scrollY` on every opened page, recording each `scrollTo` call on the page object, so no case logs "Not implemented". Add one smoke case that opens `index.html` and finds a seeded card.

**Checkpoint**: the suites are as green as T001, and the template and icon exist.

---

## Phase 3: User Story 1 — Open one poll large, then go back to the tab (Priority: P1) 🎯 MVP

**Goal**: title, subtitle and Maximize icon open the poll in place; the X and the current tab put the
grid back exactly as it was.

**Independent Test**: scroll part-way down Trending, open a card by its title, check that only it is
shown with the panel and the X and the tab bar, press the X, and check the grid, order and scroll
position. Repeat with the icon, closing by the current tab.

- [X] T006 [US1] In `src/public/pollCard.js`'s `POLL_CARD_TEMPLATE`, add after the front face's `.bookmark-btn`: `<button class="maximize-btn" type="button" aria-label="Maximize Poll Card" title="Maximize Poll Card"><svg class="maximize-icon" viewBox="…" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path fill="currentColor" d="…"/></svg></button>`, with the `viewBox` and `d` from T002's file (contracts C1; FR-003 – FR-005) — *FIX02: the button now holds a second, hidden `.minimize-icon` — the same drawing with the arrow sub-path rotated 180° about its own centre.* — *FIX07: the voting face gets a title row holding the same `.maximize-btn` (both icons, no star).*
- [X] T007 [P] [US1] In `src/public/site.css`, beside the `.bookmark-btn` rules: `.maximize-btn` with the same box, border, background, cursor and colour rules as `.bookmark-btn` (28 px, `#9AA197`, `var(--muted)` on `:hover` / `:focus-visible`), `.maximize-btn svg{ width:24px; height:24px; display:block; }`, `.maximize-btn[hidden]{ display:none; }`, and `.bookmark-btn + .maximize-btn{ margin-left:-4px; }`, so the row's 8 px gap becomes 4 px between the pair. *Implemented differently: `.bookmark-btn` already carries `margin-right:-4px`, so the row's 8 px gap is already 4 px between the pair; `.maximize-btn` takes the same `margin:-4px -4px 0 0` so it sits in the corner the star used to, and no extra rule is needed.* Also `.card-viewport:not(.maximized-card-viewport) .question, .card-viewport:not(.maximized-card-viewport) .subtitle{ cursor:pointer; }`, with `text-decoration:underline` on `:hover` (contracts C1; FR-002 – FR-004) — *FIX02: `.maximize-btn` is now `#202020` with light / darker grey backgrounds on hover / press, the grey background plus a moss focus ring on `:focus-visible`, and `.maximize-btn svg[hidden]{display:none}`; the star's grey no longer applies, and the unused `.maximize-btn[hidden]` rule is gone.*
- [X] T008 [US1] In `src/public/pollCard.js` `initPollCard`: add `let isMaximized = false;`. Add one `requestMaximize()` that returns if `isMaximized` or there is no `opts.onMaximize`, else calls `opts.onMaximize(opts.pid, { fromBack: cardFlip.classList.contains('is-flipped') })`. Wire it to `click` on `.maximize-btn` and on every `.question` and `.subtitle` in the viewport (both faces). Add `setMaximized(on)`: set `isMaximized`, toggle `maximized-card-viewport` on the viewport and `maximized-card-flip` on `cardFlip`, set `.maximize-btn.hidden = on`, and `render()`. Add `detail()`, returning `poll`. Expose `setMaximized`, `detail` and a getter `isMaximized` on the returned instance (data-model §2; FR-001, FR-022) — *FIX02: `setMaximized` no longer hides the button; it swaps the icons (by the `hidden` attribute, FIX03: SVG elements have no `hidden` property), `aria-label` and `title` to the Minimize form, and a click in that form calls `opts.onMinimize` (the grid's `restore`).* — *FIX07: the click wiring and `setMaximized` act on every `.maximize-btn` on the card, both faces.*
- [X] T009 [P] [US1] In `src/public/tabs.css`, add the maximized view's layout, ported from `research/MAXIMIZED-POLL-CARD/SINGLE-CARD-LAYOUT/single-card.html`'s `<style>`:
  - `.maximized-card-grid{ display:flex; flex-wrap:wrap; align-items:stretch; gap:18px 8px; container-type:inline-size; }` and `.maximized-card-grid[hidden]{ display:none; }`
  - `.maximized-card-close-row{ flex:0 0 100%; display:flex; justify-content:flex-end; margin-bottom:-8px; }`
  - `.maximized-card-close{ width:42px; height:42px; border-radius:16.5px; }`, its `svg{ width:21px; height:21px; }` and `:focus-visible{ outline:2px solid var(--moss, #3D5A46); outline-offset:2px; }`
  - `.col-rule{ flex:0 0 2px; align-self:stretch; background:var(--line); }` and `@container (max-width:767.98px){ .col-rule{ display:none; } }`
  - `.maximized-space-right{ flex:1 1 420px; min-width:min(375px, 100%); align-self:flex-start; padding:10px; background:#E6E6E6; font-family:'Inter', system-ui, sans-serif; font-size:13px; color:var(--muted); }` and its two `p` rules

  (research R6; contracts C2; FR-010 – FR-015) — *FIX01 added `.card-grid[hidden]{ display:none; }` here: `.card-grid`'s `display:grid` overrode the `hidden` attribute, so the grid stayed on screen beside the maximized view.* — *FIX04: the close-row and `.icon-btn.maximized-card-close` rules are removed with the button.*
- [X] T010 [P] [US1] In `src/public/pollCard.css`, beside `.card-viewport`: `.maximized-card-viewport{ flex:0 1 420px; min-width:min(375px, 100%); margin:0 auto; }` (research R6; FR-012, FR-013)
- [X] T011 [US1] In `src/public/tabs.js`: add a module-level `let maximized = null;` (`{ grid, pid }`) and `function closeMaximized(options){ if (maximized) maximized.grid.restore(options); }`. In `createGrid`:
  - add an `onMaximize: (pid, from) => maximize(pid, from)` default to the merged `opts`;
  - add `maximize(pid, from)`: call `closeMaximized({ quiet: true })` first; clone `#maximizedCardGrid` once, on first use, into `gridEl.parentNode` right after `gridEl`, wiring its `.maximized-card-close` click as `() => restore()`, so the click event is never passed as options; record `returnScrollY = window.scrollY`; set `gridEl.hidden = true` and `maximizedEl.hidden = false`; insert `card.element` before `.col-rule`; call `card.setMaximized(true)`; if the panel's top is above the viewport, `window.scrollTo(0, window.scrollY + panel.getBoundingClientRect().top)`; set `maximized = { grid: api, pid }`;
  - add `restore(options = {})`: `setMaximized(false)`; put the element back at its index in the last rendered order; show `gridEl` and hide `maximizedEl`; unless `options.quiet`, `window.scrollTo(0, returnScrollY)`; clear the grid's pid and `maximized`. `quiet` is for closes caused by leaving the tab (another tab, a search, a sign-in change): they neither restore the scroll position nor move focus, because the panel is about to be hidden;
  - in `render`, skip the maximized pid in the reordering loop, so a refresh never moves it back.

  Return `maximize` and `restore` on the grid API (research R1, R7, R9; data-model §1; FR-008, FR-009, FR-023) — *FIX04: `maximizedView()` no longer wires a close button.*
- [X] T012 [US1] In `src/public/tabs.js` `init`'s tab-bar click handler: when `btn.dataset.tab === activeTab && maximized`, call `closeMaximized()` and return **before** `select()`, so no `activate()` runs and no token is spent (research R7; FR-024)
- [X] T013 [US1] In `tests/client-maximized.test.ts`, add a "maximizing and restoring" describe:
  - (a) clicking a card's `.question`, its `.subtitle`, and its `.maximize-btn` each hide `.card-grid`, show one `.maximized-card-grid` in the active panel containing that card's viewport with class `maximized-card-viewport`, and keep `#tabBar` present;
  - (b) `.maximize-btn` is the last child of `.question-row`, right after `.bookmark-btn`, with `aria-label` and `title` "Maximize Poll Card";
  - (c) on My Private Polls, where `.bookmark-btn` is hidden, `.maximize-btn` is still present and shown;
  - (d) the X closes: `.card-grid` is shown, the card is back at its index, and the grid's pid order equals the order before;
  - (e) clicking the active tab closes, and `requestsTo(page, "/api/")` gains no entry;
  - (f) `window.scrollTo` is called with the recorded `scrollY` on close (using T005's stub);
  - (g) a guest, with no session, opens a card by its title: the view opens, and pressing Vote inside it goes to `/login`, as in the grid (FR-007)
- [X] T014 [US1] Run `npx vitest run tests/client-maximized.test.ts tests/client-home.test.ts` and `npm run build`; both green — *2026-09-24: client-maximized 9/9; client-home + poll-card-assets 110/110; build clean, 23 assets*

**Checkpoint**: any card opens in place and closes back to the same grid. **MVP.**

---

## Phase 4: User Story 2 — See every choice at once (Priority: P1)

**Goal**: in the maximized card, every bar on both faces, with height by choice count, a 2 px gap
and no scrolling.

**Independent Test**: maximize 2-, 7- and 50-choice polls; every row is present with the expected
inline height and a 2 px gap; no arrow row is active; closing brings back the measured layout.

- [X] T015 [US2] In `src/public/pollCard.js`, add `const RESULTS_GAP_FIXED = 2;` beside `RESULTS_GAP_MIN` and `function maximizedBarLayout(count, bounds)`. With `n` clamped to `[bounds.minChoices, bounds.maxChoices]`, it returns `{ scrolling: false, barHeight, gap: RESULTS_GAP_FIXED }`, where `barHeight` is `RESULTS_MAX_BAR_HEIGHT` when `maxChoices <= minChoices`, else `RESULTS_MAX_BAR_HEIGHT - (n - minChoices) / (maxChoices - minChoices) * (RESULTS_MAX_BAR_HEIGHT - RESULTS_MIN_BAR_HEIGHT)`. In `setMaximized(on)`, set `layoutFor = on ? (count) => maximizedBarLayout(count, opts.choiceBounds) : measuredBarLayout` before `render()`. Because the height and gap change, the in-place signature changes too, so the switch takes the rebuild path both ways (research R2; data-model §2; FR-017)
- [X] T016 [US2] In `src/public/tabs.js` `createGrid`, add `choiceBounds: { minChoices: (config && config.minChoices) || 2, maxChoices: (config && config.maxChoices) || 50 }` to the merged card options. `config` is loaded before `init` creates any grid (research R2)
- [X] T017 [P] [US2] In `src/public/pollCard.css`, after the `.bar-scroll-wrap` / `.bar-scroll-inner` / `.results-list` / `.voting-list` rules:
  - `.maximized-card-flip .bar-scroll-wrap{ flex:0 0 auto; }`
  - `.maximized-card-flip .bar-scroll-inner{ position:static; overflow:visible; }`
  - `.maximized-card-flip .results-list, .maximized-card-flip .voting-list{ flex:0 0 auto; overflow:visible; }`

  (research R3; FR-016)
- [X] T018 [US2] In `tests/client-maximized.test.ts`, add a "every choice at once" describe:
  - (a) with 2, 7 and 50 choices, after maximizing, every `.results-list > .result-row` and every `.voting-list > .vote-row` is present; their `style.height` is `50px`, about `47.4px` and `25px` (compare numerically, within 0.01); both lists' `style.rowGap` is `2px`; no `.arrow-row.is-active` exists in the card;
  - (b) after closing, the rows' heights no longer come from `maximizedBarLayout` (the list's `data-render-signature` differs from the maximized one)
  - (c) for a 7-choice poll, record every `.result-row`'s fill background, the row's own background, and each `.result-label` / `.result-pct` colour and `textShadow` in the grid card; maximize it; record the same from the maximized card; the two lists are equal (FR-018, SC-004)
- [X] T019 [US2] Run `npx vitest run tests/client-maximized.test.ts`; green

**Checkpoint**: the maximized card is the full, non-scrolling view.

---

## Phase 5: User Story 3 — The same colours and lettering on every card (Priority: P2)

**Goal**: every card, in both views, uses the research palette, dark-shade ink with no halo, and the
Yes/No tint with white text clipped to the moving fill.

**Independent Test**: render a 50-choice poll and a Yes/No/Maybe poll; every label's and
percentage's ink reaches 7:1 on its fill and at least 4.5:1 on the track, with no `text-shadow`; the
Yes/No rows carry their tint and a clipped white overlay whose clip equals the fill's width; a
reorder swaps colours and overlays correctly.

*Independent of US1 and US2: it can start right after Phase 2.*

- [X] T020 [US3] In `src/public/pollCard.js`:
  - replace `RESULTS_PALETTE_ENTRIES` with the 50 entries of `research/MAXIMIZED-POLL-CARD/SINGLE-CARD-LAYOUT/single-card.html`, restoring entries 1–2 to `{ hex: '#98EFF9', name: "robin's egg blue" }` and `{ hex: '#FFE5AD', name: 'pale peach' }`;
  - set `SEMANTIC_AFFIRMATIVE_COLOR = '#018826'` and `SEMANTIC_NEGATIVE_COLOR = '#CF0234'`;
  - replace the palette's header comment (the "dark/saturated … 4.5:1 against textStyleFor" text) with nothing, or with a pointer to the WCAG contrast definition only (constitution VI).

  (FR-029, FR-031; contracts C5) — *FIX05: the palette is now the research's vibrant `color-palette.md` (starting darkish blue `#014182`).*
- [X] T021 [US3] In `src/public/pollCard.js`:
  - add, from the research page: `hexToRgb`, `contrastRatio`, `hexToHsl`, `hslToHex`, `darkShadeOf` (with `RESULTS_INK_TARGET_CONTRAST = 7`, `RESULTS_INK_START_LIGHTNESS = 0.25`, `RESULTS_INK_FLOOR_LIGHTNESS = 0.08`), `mixWithWhite` and `SEMANTIC_TRACK_TINT = 0.85`, `SEMANTIC_TEXT_COLOR = '#FFFFFF'`. Keep the existing `luminanceOf`;
  - build, at script load, `const RESULTS_INK = new Map()` holding `darkShadeOf(hex)` for every palette hex, and `SEMANTIC_TINT` for both semantic colours with `RESULTS_INK` entries for each tint;
  - delete `textStyleFor` and `majorityBackground` with their comments.

  (research R10; data-model §3) — *Implemented with one deviation: `RESULTS_TRACK_COLOR` is removed too. Once `textStyleFor` and `majorityBackground` are gone nothing reads it, and constitution III requires removing what a change orphans; the track colour itself stays in `pollCard.css` as `--track`. `luminanceOf`'s comment now points to the WCAG definition.* — *FIX05: `SEMANTIC_TINT`, `RESULTS_INK` and `isSemanticColor` are replaced by one `BAR_COLORS` map (track, ink over the track, ink over the fill) for every palette and semantic colour, with `lightShadeOf` and `inkOnFillFor` added.*
- [X] T022 [US3] In `src/public/pollCard.js` `renderPollResults` `applyTruncation`:
  - keep the truncation logic, and replace the ink block (fill-edge, `majorityBackground`, `textStyleFor`) with: `const semantic = isSemanticColor(color)`, where the new helper `isSemanticColor(hex)` compares with the two constants;
  - set the row's `style.background` to `SEMANTIC_TINT.get(color)` when semantic, else `''`;
  - set `ink = RESULTS_INK.get(semantic ? SEMANTIC_TINT.get(color) : color)` on the label and the percentage, with `style.textShadow = 'none'`.

  Both render paths already call `applyTruncation`, so the in-place path re-inks after a reorder (research R10; FR-030, FR-031) — *Implemented as a separate `applyBarColors(rows)`, called right after `applyTruncation` on both paths: `applyTruncation` returns early for compact rows, and colouring is its own job.* — *FIX05: every bar now gets its tint as the row background, and the tint's dark shade as its text.*
- [X] T023 [US3] In `src/public/pollCard.js`, add `syncInkOnFill(row, semantic, fillWidth)`, called for every row at the end of `applyTruncation`:
  - when not semantic, remove any `.result-ink-on-fill`;
  - when semantic, create one if absent (`<span class="result-ink-on-fill" aria-hidden="true">`, with its `clip-path` set **first** to the fill's current `style.width || '0%'`), then replace its children with fresh `cloneNode(true)` copies of the row's `.result-label` and `.result-pct`, coloured `SEMANTIC_TEXT_COLOR`;
  - add `setFillWidth(row, pct)`, which sets the fill's `style.width` **and** any overlay's `style.clipPath = 'inset(0 calc(100% - ' + pct + '%) 0 0)'`, and use it in the in-place path (replacing `row.querySelector('.result-fill').style.width = item.pct + '%'`) and in the deferred `requestAnimationFrame` / `setTimeout` block of the rebuild path. *On the in-place path the widths are now set after `applyBarColors`, so a newly created overlay starts at the fill's current width; a new overlay's style is flushed before its clip moves, so it animates.*

  (research R10; FR-032) — *FIX05: every bar now has the clipped copy, in its fill ink (white for Yes/No).*
- [X] T024 [P] [US3] In `src/public/pollCard.css`, beside `.result-fill`:
  - `.result-ink-on-fill{ position:absolute; inset:0; z-index:3; pointer-events:none; clip-path:inset(0 100% 0 0); transition:clip-path 0.9s cubic-bezier(0.22,1,0.36,1); }`, with the same duration and easing as `.result-fill`'s width transition;
  - `.result-row.is-compact .result-ink-on-fill{ display:none; }`;
  - if `@media (prefers-reduced-motion: reduce)` disables the fill's transition anywhere, disable this one in the same rule. *Neither needed: the compact rule `.result-row.is-compact .result-label` already hides the overlay's copies (descendant selector), and reduced motion does not disable the fill's transition.*

  (research R10; FR-032)
- [X] T025 [P] [US3] In `tests/poll-card-assets.test.ts` "pollCard.js choice colours":
  - replace `#43F781` / `#FC9E9E` with `#018826` / `#CF0234`;
  - delete the "keeps the label-ink threshold at 0.40" case;
  - keep the whole-word regex, palette-size and `RESULTS_TRACK_COLOR` cases.

  Update the describe's comment to refer to the dark-shade rule (FR-036; BC-2) — *Also removes the 010 `RESULTS_TRACK_COLOR` describe with the constant (see T021).*
- [X] T026 [US3] Create `tests/client-bar-colours.test.ts`, with its own context and a local `contrast(hexA, hexB)` helper implementing WCAG relative luminance, and normalise the `rgb(…)` inline styles jsdom returns to hex. Cases:
  - (a) a 50-choice poll on Trending: every row's `.result-fill` background is the palette entry for its index, the first two being `#98EFF9` and `#FFE5AD`; every `.result-label` and `.result-pct` colour reaches ≥ 7 against its fill and ≥ 4.5 against `#DDE1D6`; every `textShadow` is `none`;
  - (b) a Yes / No / Maybe poll: Yes fill `#018826` and No fill `#CF0234`, each row's background is its 85% tint, each has one `.result-ink-on-fill` holding white copies of the label and percentage; after the deferred frame (wait on real time, `await new Promise((r) => setTimeout(r, 120))`, as the existing browser suites do; fake timers may not drive `requestAnimationFrame`), each overlay's `clipPath` equals `inset(0 calc(100% - W) 0 0)` for its fill's width W; white reaches ≥ 4.5 on both fills; Maybe's row has no overlay and takes palette entry 1;
  - (c) counts that make No overtake Yes, applied through a refresh (the in-place path): the rows swap fills, tints and overlays, and no row keeps its previous occupant's overlay.

  (SC-004, SC-005; FR-029 – FR-032) — *FIX05: case (a) now expects every palette bar on its 80% tint, with dark text at 7:1 over it and a copy on the fill at 4:1 or better; case (b)'s Maybe bar now has a copy too.*
- [X] T027 [US3] Run `npx vitest run tests/client-bar-colours.test.ts tests/poll-card-assets.test.ts tests/client-home.test.ts`. Green; any `client-home` assertion on the old ink is a regression to fix, not to delete — *2026-09-24: 4 files, 125/125*

**Checkpoint**: every card uses the new colours; the grid and maximized cards match.

---

## Phase 6: User Story 4 — The maximized card keeps working, and stays in step with the tab (Priority: P2)

**Goal**: votes, Favorites, Live Results and refreshes behave as in the grid. The view closes on the
other exits, and on a drop from any tab but Trending and Newest, where it is retained.

**Independent Test**: vote in a maximized card, then close; carry a pending selection through open
and close; un-favourite on Favorites and remove on Live Results (the view closes); push a maximized
poll off Trending (the view stays and a vote in it shows); click another tab and search (the view
closes).

- [X] T028 [US4] In `src/public/tabs.js` `createGrid` `render`, before unmounting a pid that has left `state.order`, handle the maximized pid:
  - if `opts.retainMaximized`, keep the card mounted and shown, mark it `retained`, and store `retainedDetail = card.detail()`;
  - otherwise call `restore({ left: true })`, then unmount it as today, then place focus by the tab rule: the first mounted card's `.maximize-btn`, else the panel's `.tab-empty` with `tabIndex = -1`. On Live Results, `removePoll`'s `focusAfterRemoval` runs after this render and overrides it.

  In `restore`, when the card is `retained`, unmount it instead of moving it back, then apply the same tab focus rule (research R8; FR-026; data-model §1) — *The tab focus rule runs one tick after the render, and only when nothing holds focus (or focus is still inside the hidden view), so the tab's empty-state line is shown first and 020's Live Results rule, which runs synchronously after the render, wins.*
- [X] T029 [US4] In `src/public/tabs.js`:
  - add `patchRetained(pid, patch)` to the grid API. When `pid` is the retained card, merge into `retainedDetail`: `bookmarked` from an overlay patch, or `myChoiceIds`, `totalVoted`, and each choice's `count` and `pct` (rounded as `DeltaClient.toPollDetail` does) from a vote outcome's `voteCount` / `choiceCounts` / `myChoiceIds`. Then call `card.applyPoll(retainedDetail)`;
  - at the end of `applyVote` and of `updateOverlayEverywhere`, call `maximized && maximized.grid.patchRetained(pid, …)` with the same data.

  (research R8; FR-019)
- [X] T030 [P] [US4] In `src/public/trending.js` and `src/public/newest.js`, add `retainMaximized: true` to their `window.Tabs.createGrid(…)` options (research R8)
- [X] T031 [US4] In `src/public/tabs.js`:
  - call `closeMaximized({ quiet: true })` at the top of `select(name)` (another tab, the header search through `SearchTab.submit`, and every programmatic selection);
  - in the session subscription's sign-in-change branch, call `closeMaximized({ quiet: true })` before the controllers' `reset()`.

  The X, Escape (T035) and the active-tab click (T012) call `closeMaximized()` without `quiet`, so they restore the scroll position and focus.

  (research R7; FR-025)
- [X] T032 [US4] In `tests/client-maximized.test.ts`, add a "the maximized card stays in step" describe:
  - (a) the maximized viewport is the same element as the grid card's (identity), before, during and after;
  - (b) flip, select two choices, click the back face's `.question`: the maximized card is flipped with both `.vote-row.is-selected`; close: the same in the grid;
  - (c) vote from the maximized card: its `.poll-totals` changes, and after close the grid card shows the same;
  - (d) on Favorites, un-favourite a maximized poll not voted in: the view closes and the card is gone;
  - (e) on Live Results, press the maximized card's `.live-link`: the view closes, the card is gone, and focus follows 020's rule;
  - (f) on Trending (cap 3), push the maximized poll out (votes on a fourth poll, then `trendingSweep`, then Refresh): the view stays; a vote in it updates its `.poll-totals`; close: the poll is gone and focus is on the first card's `.maximize-btn`;
  - (g) clicking Newest, and submitting a header search, each close the view;
  - (h) Refresh while maximized keeps the view open, and after the poll's counts change on the server (`countVote`, then the counter flush), Refresh updates the maximized card's `.poll-totals` and its rows' percentages;
  - (i) inside the view, `.maximize-btn` is hidden, and clicking `.question` does nothing;
  - (j) a maximized Search card has no visible Vote button.

  (FR-019 – FR-026)
- [X] T033 [US4] Run `npx vitest run tests/client-maximized.test.ts tests/client-home.test.ts`; green

**Checkpoint**: the maximized card is indistinguishable in behaviour from the grid card, and its
exits follow the clarified rules.

---

## Phase 7: User Story 5 — Keyboard, focus and the browser's own controls (Priority: P3)

**Goal**: focus on the X when opened, back where it came from when closed; Escape closes; the
address and history are untouched.

**Independent Test**: keyboard only, open and close twice (X, Escape); check `activeElement` each
time; check the address and `history.length`.

- [X] T034 [US5] In `src/public/tabs.js`:
  - `maximize` focuses the view's `.maximized-card-close` after showing it;
  - `restore` without `left` or `quiet` focuses by the face the card is on **as it closes**: the card's `.maximize-btn` when `cardFlip` is not `is-flipped`, else the card's `.card-back .question` with `tabIndex = -1`. With `left`, T028's tab rule applies. With `quiet`, focus is not moved.

  (research R9; FR-027) — *FIX04: `maximize` focuses the card's `.maximize-btn` (now showing Minimize) instead of the removed X.* — *FIX07: focus goes to the button on the face showing (`shownMaximizeButton`), both on opening and on closing; there is no longer a special case for the back face's title.*
- [X] T035 [US5] In `src/public/tabs.js` `init`, add a `document` `keydown` listener. On `event.key === 'Escape'`, when `maximized` is set, no `[aria-modal="true"]` element is in the document, and the target is not an `INPUT`, `TEXTAREA`, `SELECT` or content-editable element, it calls `closeMaximized()` (research R7; FR-023)
- [X] T036 [US5] In `tests/client-maximized.test.ts`, add a "keyboard and focus" describe:
  - (a) `.question` and `.subtitle` carry no `tabindex` and `.maximize-btn` is a `<button>`;
  - (b) after opening from the icon, `activeElement` is `.maximized-card-close`; after X, Escape and the active-tab click, it is that card's `.maximize-btn`;
  - (c) on the back face as it closes, the close puts focus on the back `.question`, and on the front face (opened from the back, then flipped with the back arrow) on `.maximize-btn`;
  - (c2) clicking another tab while maximized leaves no focus inside the now hidden panel, and makes no `scrollTo` call;
  - (d) Escape is ignored while `Tabs.modal("…")` is open and while the search box has focus;
  - (e) `location.href` and `history.length` are unchanged by opening and closing.

  (FR-005, FR-023, FR-027, FR-028; SC-008)
- [X] T037 [US5] Run `npx vitest run tests/client-maximized.test.ts`; green

**Checkpoint**: the feature is complete for keyboard users.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: superseded records, the constitution's documentation deliverables, full regression and
the manual validation.

- [X] T038 [P] At the top of `specs/009-POLL-CHOICE-COLORS/spec.md` and `specs/010-ZERO-VOTE-TEXT-LEGIBILITY/spec.md`, add a one-paragraph note: the palette, the Yes/No colours and the black/white ink rule (with 010's coverage rule) are superseded by `specs/021-MAXIMIZED-POLL-CARD/` (contracts C5); the word rules for Yes/No labels still stand (FR-036; BC-2)
- [X] T039 [P] In `specs/017-SEARCH-AND-SCALABILITY-DATABASE/contracts/ui-contracts.md`, annotate the card-controls section: every card's title row also carries the Maximize control, and any card can be maximized in place; cite `specs/021-MAXIMIZED-POLL-CARD/contracts/ui-contracts.md` (BC-1)
- [X] T040 [P] Update `README.md` in place: how to open a poll maximized and close it, and that the bars' colours changed. No references to `specs/`, `designDocs/`, `architecture/` or `research/` (constitution Documentation Deliverables)
- [X] T041 [P] Update `ARCHITECTURE.md` in place: the maximized view (the card instance moved between `.card-grid` and `.maximized-card-grid`, the one close path in `tabs.js`, and retention on Trending and Newest), and the bar colour rule (palette, derived ink, the semantic tint and the clipped overlay), with a Mermaid state diagram of the view
- [X] T042 Run `npm test` and `npm run build`; compare with T001. Every pre-existing test passes except the two `poll-card-assets` assertions replaced in T025 (SC-009). `git grep -nE "FR-0|T0[0-9]{2}\b|021-|SINGLE-CARD-LAYOUT" -- src` returns nothing new (constitution VI). `git grep -n "textStyleFor\|majorityBackground\|#43F781\|#FC9E9E" -- src` returns nothing (FR-036) — *2026-09-24: 44 files passed, 1 skipped / 684 tests passed, 15 skipped (baseline 653 − the 2 replaced `poll-card-assets` assertions + 33 new); build clean, 23 assets. No new spec references in `src/`. The old-rule grep's one hit was `site.css`'s comment on the fill's trailing edge, which cited `#43F781` / `#FC9E9E`; it now points to WCAG's non-text contrast criterion, and the rule is unchanged.*
- [X] T043 Walk `specs/021-MAXIMIZED-POLL-CARD/quickstart.md` Q1–Q15 in a real browser. It covers what jsdom cannot see: the icon's look and size, the 4 px gap, hover, the responsive thresholds and phone width, the painted colours, and the clip following the growing and moving fill. Record any discrepancy as a FIX item for `/speckit-fix` — *2026-09-25: walked by the developer in a real browser; Q1–Q15 all pass. The discrepancies found along the way were fixed as FIX01–FIX08 in `fix.md`.*

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none
- **Foundational (Phase 2)**: T002 ‖ T003 ‖ T005; T004 alone in `pollCard.js`. **Blocks every story**
- **US1 (Phase 3)**: after Phase 2. T006 needs T002's path. T008 after T006 (same file). T007 ‖ T009 ‖ T010 (three stylesheets). T011 needs T003 and T008. T012 after T011. T013 after T011 and T012. T014 last
- **US2 (Phase 4)**: after US1 (it sizes the view US1 opens). T015 needs T004 and T008. T016 in `tabs.js` after T011. T017 ‖ T015. T018 after T015 – T017
- **US3 (Phase 5)**: after Phase 2 only, **independent of US1 and US2**. T020 → T021 → T022 → T023 in `pollCard.js`, sequential. T024 ‖ T025 alongside. T026 after T023 and T024
- **US4 (Phase 6)**: after US1. T028 → T029 → T031 in `tabs.js`. T030 ‖ those. T032 after all
- **US5 (Phase 7)**: after US1, and after T028 (the `left` focus rule). T034 → T035 in `tabs.js`. T036 after
- **Polish (Phase 8)**: T038 ‖ T039 ‖ T040 ‖ T041 after every story; T042, then T043

### Same-file sequencing (the real constraint)

- `src/public/pollCard.js`: T004 → T006 → T008 → T015, and T020 → T021 → T022 → T023. The two
  chains touch different regions (the card's wiring and sizing versus its colours), but they are
  one file: run them one chain after the other, or in separate branches merged by hand
- `src/public/tabs.js`: T011 → T012 → T016 → T028 → T029 → T031 → T034 → T035
- `tests/client-maximized.test.ts`: T005 → T013 → T018 → T032 → T036

### Parallel Opportunities

- Phase 2: T002 ‖ T003 ‖ T005 (and T004)
- US1: T007 ‖ T009 ‖ T010 while T006 / T008 proceed
- US3 as a whole ‖ US1 + US2, except that both edit `pollCard.js` (see above); T024 ‖ T025 anywhere in US3
- US4: T030 ‖ the `tabs.js` chain
- Polish: T038 ‖ T039 ‖ T040 ‖ T041

---

## Parallel Example: User Story 1

```bash
# Three stylesheets, no shared edits:
Task: "Add .maximize-btn and title/subtitle hover rules in src/public/site.css"          # T007
Task: "Add the .maximized-card-grid layout rules in src/public/tabs.css"                 # T009
Task: "Add .maximized-card-viewport in src/public/pollCard.css"                          # T010
```

## Parallel Example: User Story 3

```bash
Task: "Add .result-ink-on-fill and its clip-path transition in src/public/pollCard.css"  # T024
Task: "Replace the 009/010 colour assertions in tests/poll-card-assets.test.ts"           # T025
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 baseline; Phase 2 (icon, template, layout argument, test scaffold)
2. Phase 3: the Maximize icon and the title/subtitle clicks, the view, the X and the current tab
3. **STOP and VALIDATE**: open and close on every tab; the grid returns unchanged
4. Demo: a scrolled Trending tab, open one poll, close it

### Incremental Delivery

1. + US2 → every bar shows, no scrolling (the feature's point)
2. + US3 → the new colours on every card (can land before or after the view)
3. + US4 → votes, Favorites, Live Results and refreshes in step; the clarified exits
4. + US5 → keyboard, focus and Escape
5. Polish → superseded notes, README, ARCHITECTURE, full regression, quickstart

---

## Notes

- Constitution III: the grid card's measured sizing, scrolling and truncation are untouched (T004 is
  a pure refactor, verified green). `liveResults.js`, `searchTab.js`, `deltaClient.js` and every
  server file are not edited
- Constitution VI: no comment in `src/` may cite an FR, a task, "021" or the research folder. The
  009/010 comments go with the code they describe (T020, T021)
- T023 is the task that makes the colours correct in a live app: the clip must be set wherever the
  fill's width is set, including on the in-place path, and a new overlay starts at the fill's
  current width
- T028 is the task that implements the clarification: retention is by tab (`retainMaximized`),
  because Trending and Newest cannot tell a recompute from a deletion (research R8)
- Commit after each phase checkpoint
