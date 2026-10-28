---
description: "Task list for 018-TAB-BAR"
---

# Tasks: Tab Bar

**Input**: Design documents from `specs/018-TAB-BAR/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md, quickstart.md

**Tests**: Test tasks are included and are **not** optional here. Constitution v1.1.0 Principle IV
requires a verifiable criterion per task and Principle VI treats the suite as documentation; and
SC-003 ("100% of existing home-page checks pass unchanged") is only meaningful if the new
behaviour is also under test. jsdom cannot lay out or paint, so the four geometry checks (the
rule reaching both window edges, no horizontal scrollbar, 16px icons, one-row scroll on a phone)
are manual tasks that point at `quickstart.md` (research R8).

**Organization**: grouped by user story. Each story phase is a complete, demonstrable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel — different files, no dependency on an incomplete task
- **[Story]**: US1–US3, mapping to the user stories in `spec.md`
- Paths are repository-relative

---

## Phase 1: Setup

**Purpose**: a known-green baseline. This feature adds no dependency, configuration or source
file, so setup is the regression baseline SC-003 is measured against.

- [X] T001 Run `npm test` and `npm run build` on the untouched tree and record both as green (file and test counts) — *baseline 2026-09-20: 40 files / 611 tests passed, 1 file / 15 tests skipped; build clean*; every later checkpoint compares against this

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the bar's skeleton — six working tabs in the right order with the right labels. Every
story builds on this: US1 puts icons on these buttons, US2 verifies nothing else moved, US3
verifies the sixth. A button without a controller is a dead button (`select()` returns when
`controllers[name]` is missing — research R6), so the Newest registration is foundational, not
polish.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 In `src/public/index.html`, rewrite the six `.tab` buttons inside `nav.tab-bar#tabBar` in this order with these exact labels and `data-tab` values: `Trending`/`trending` (keeps `is-active`), `Newest`/`newest`, `My Private Polls`/`private`, `Favorites`/`favourites`, `Live Results`/`live`, `Search`/`search`; no other attribute changes (contracts/ui-contracts.md § The bar; research R7)
- [X] T003 In `src/public/index.html`, reorder the `.tab-panel` sections inside `main.all-markets` to match T002 and add `<section class="tab-panel" data-panel="newest" hidden><div class="card-grid"></div><p class="tab-empty" hidden></p></section>` second; the `trending` section keeps no `hidden` attribute (contracts/ui-contracts.md § The Newest tab)
- [X] T004 In `src/public/tabs.js` `init()`, immediately after `controllers.favourites = …`, add `controllers.newest = { guestsAllowed: true, state: window.DeltaClient.createTabState(), activate() {}, refresh: null };` — no `KIND_OF` entry, no change to `PERSONAL_TABS`, no other line (research R6)
- [X] T005 In `tests/client-home.test.ts` (the "the home page in a browser" describe), add a test: the bar has exactly six `.tab` buttons whose `data-tab` values are `["trending","newest","private","favourites","live","search"]` in document order and whose trimmed `textContent`s are `["Trending","Newest","My Private Polls","Favorites","Live Results","Search"]`; Trending is `is-active` on load; every `.tab-panel` except `trending` is `hidden` (spec FR-001, FR-002)
- [X] T006 Run `npm test`; every suite is green with the six-button bar (the existing suites select tabs by `data-tab` and never assert on label text — if one does, that is a finding, not a fix to make here). `git grep -n "TRENDING</button>\|My PRIVATE POLLS" -- src/public` returns nothing — *2026-09-20: 40 files / 612 tests green (+1). The grep's only hits are three pre-existing prose comments (`deltaClient.js:3`, `pollCard.js:1052`, `tabs.js:527`), not markup; left untouched per Principle III*

**Checkpoint**: six tabs, right order, right words, all six selectable, nothing else changed.

---

## Phase 3: User Story 1 — Recognise every tab at a glance (Priority: P1) 🎯 MVP

**Goal**: an icon before each label, sized and coloured per the contract, and the full-width rule
under the row.

**Independent Test**: open `/` as a guest — six icons, the rule to both window edges at every
width, the Trending pill unchanged with its icon in the label's colour; `quickstart.md` US1.

- [X] T007 [US1] In `src/public/tabs.css` under `/* ---------- Tab bar ---------- */`, add `display:inline-flex; align-items:center; gap:6px;` to the existing `.tab-bar .tab` rule (change nothing else in it), and add `.tab-icon{ width:16px; height:16px; flex:0 0 auto; }` and `.tab-icon--live{ display:flex; align-items:flex-end; }` after the `.tab-bar .tab:disabled` rule (research R2, R3)
- [X] T008 [US1] In `src/public/index.html`, insert the Favorites icon as the first child of the `favourites` button: `<svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55-4.76-4.64 6.58-.96z" fill="none" stroke="#9AA197" stroke-width="1.8" stroke-linejoin="round"/></svg>` — the `d` string copied character-for-character from the `.bookmark-star` path in `src/public/pollCard.js` (research R4)
- [X] T009 [US1] In `src/public/index.html`, insert the Search icon as the first child of the `search` button: the `.search-icon` SVG from `src/public/app.js` (`<circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>` with `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`), with `class="tab-icon"`, `aria-hidden="true"` and `focusable="false"` (research R4, R5)
- [X] T010 [US1] In `src/public/index.html`, insert the My Private Polls icon as the first child of the `private` button: `<svg class="tab-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">` containing the three shapes of `src/public/avatar-default.svg` verbatim (`circle r=32 fill=#8093a7`, `circle cx=32 cy=25 r=11 fill=#e8edf2`, the body path `fill=#e8edf2`); then add one comment line to `src/public/avatar-default.svg` stating that these shapes are copied inline in `src/public/index.html` (spec FR-008, FR-015; research R4)
- [X] T011 [US1] In `src/public/index.html`, insert the Live Results icon as the first child of the `live` button: `<span class="tab-icon tab-icon--live" aria-hidden="true"><span class="live-bars"><i></i><i></i><i></i></span></span>` — the card's markup; add no CSS for `.live-bars` anywhere (research R3)
- [X] T012 [US1] In `src/public/index.html`, insert the Trending icon as the first child of the `trending` button: `<svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">` with one `<path fill="currentColor" d="…"/>` — the shape FR-006 describes: a downward-bowing swoosh from the lower left to the upper right ending in a solid arrowhead pointing upper-right, stroke weight ≈ 1/5 of the box; no stroke attribute; the untracked `designDocs/dontTrack/trendingupicon.jpg` is a reference only, not required (research R4, R5)
- [X] T013 [US1] In `src/public/index.html`, insert the Newest icon as the first child of the `newest` button: `<svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="12" fill="#8093a7"/><path fill="#e8edf2" transform="skewX(-12) …" d="…"/></svg>` where the path is an exclamation mark (a tapered bar and a dot) centred in the circle, skewed for the italic; no `<text>` element (spec FR-007, FR-014; research R4)
- [X] T014 [US1] In `src/public/tabs.css`, add `position:relative;` to the existing `.tab-bar-wrap` rule and, after it, `.tab-bar-wrap::after{ content:""; position:absolute; left:50%; bottom:-7px; width:100vw; height:2px; background:var(--line); transform:translateX(-50%); }`; make `.tab-bar-wrap` `align-items:flex-end` and drop `.tab-bar`'s `padding-bottom:4px`, so the buttons and the Refresh control both rest on the wrap's bottom edge, 5px above the 2px line (FR-017, FR-019; FIX06, FIX07); add `overflow-x:clip;` to the existing `.page` rule (research R1; spec FR-017–FR-021)
- [X] T015 [P] [US1] Create `tests/tab-bar-assets.test.ts` following `tests/poll-card-assets.test.ts`'s pattern (start the test context, `GET` the served files as text): `index.html` contains six `.tab` buttons each with a first child carrying `class="tab-icon"` and `aria-hidden="true"`, and every `<svg class="tab-icon"` carries `focusable="false"`; the `favourites` button's path `d` equals the `.bookmark-star` `d` in the served `pollCard.js`; the `search` button contains `cx="11" cy="11" r="7"` and `x1="21" y1="21" x2="16.65" y2="16.65"` and both appear in the served `app.js`; the `private` button's SVG has `viewBox="0 0 64 64"` and both fills `#8093a7` and `#e8edf2` exactly as in `avatar-default.svg`; the `live` button contains `class="live-bars"`; the `trending` and `search` icons use `currentColor` and the `newest` icon uses the avatar's `#8093a7` and `#e8edf2`; `tabs.css` matches `/\.tab-bar-wrap::after\s*\{[^}]*width:\s*100vw/` and `/\.page\s*\{[^}]*overflow-x:\s*clip/` and `/\.tab-icon\s*\{[^}]*width:\s*16px/`; `avatar-default.svg` mentions `index.html`; `tabs.css` contains no `live-bar` rule (spec FR-005–FR-015, SC-005)
- [X] T016 [P] [US1] In `tests/client-home.test.ts`, add a test: for each of the six `.tab` buttons the first element child has `aria-hidden="true"` and, when it is an `svg`, `focusable="false"`; the button's trimmed `textContent` equals its label (the accessible name — FR-014); the `live` button contains `.live-bars` with three `i` children; the `private` button's icon is the 64-unit avatar and not an `img` (spec FR-008, FR-014, SC-007)
- [ ] T017 [US1] Complete the US1 scenario in `quickstart.md` in a real browser: the rule meets both window edges at 900px, 1400px and 2000px; no horizontal scrollbar with a vertical one present; icon box 16×16 and 6px gap in the inspector; the pill and Refresh above the rule; Trending's icon in moss-dark when active and Search's in muted grey; the Live bars still for a guest, bouncing on every tab once signed in, and still under reduced motion (spec SC-002, SC-006)

**Checkpoint**: the bar looks as the mockup shows; every icon is present, sized, coloured and
silent to assistive technology; the rule is full-width and anchored.

---

## Phase 4: User Story 2 — Every existing tab still does what it did (Priority: P2)

**Goal**: prove the five pre-existing tabs, the Refresh control, guest gating, search deep links,
bookmarking and Live Results are unchanged.

**Independent Test**: the whole existing suite green with no test edited for behaviour; the
`quickstart.md` US2 walk-through in a browser.

- [X] T018 [US2] Run `npm test` and diff the file and test counts against T001: every pre-existing test passes; the only tests touched by this feature are the additions in T005, T015, T016 and T021; no existing assertion was changed to make it pass (spec FR-003, SC-003). If any existing test needed editing beyond a label string, stop and record why in this file before continuing
- [X] T019 [P] [US2] In `tests/client-home.test.ts`, add a test that the Refresh control's rules hold across the new order: on `trending` it is present; on `live` the wrap has `data-active="live"` (hidden by the existing stylesheet rule); a `?q=` arrival opens `search` (the sixth button) with `is-active` (spec FR-003, acceptance US2-3/4)
- [ ] T020 [US2] Complete the US2 scenario in `quickstart.md` in a real browser signed in: personal tabs enabled; bookmark lands in Favorites; a card's Live Results opens the fifth tab with Refresh hidden; header search and `/?q=` open the last tab; sign-out dims the three; at ≈375px the bar is one scrolling row, the rule does not move as the tabs scroll; the network panel shows zero icon fetches (spec FR-021, FR-022, SC-005)

**Checkpoint**: nothing but the cosmetics changed.

---

## Phase 5: User Story 3 — The Newest tab is there, and empty (Priority: P3)

**Goal**: Newest opens for anyone, shows an empty grid, sends nothing, disables Refresh.

**Independent Test**: as a guest and as a member, click Newest — highlighted, empty, silent,
Refresh disabled; `quickstart.md` US3.

- [X] T021 [US3] In `tests/client-home.test.ts`, add tests: (a) a **guest** clicks `.tab[data-tab="newest"]` — the button gains `is-active`, `.tab-panel[data-panel="newest"]` loses `hidden` and every other panel is `hidden`, `page.window.location.pathname` is unchanged (no sign-in redirect), the panel's `.card-grid` has no children and its `.tab-empty` is `hidden` with empty text, `#refreshBtn` is `disabled`, and `page.requests.length` did not grow from the click, nor after `settle(1500)`; (b) the same for a **member** (`forgeSession` cookie); (c) with Newest open, a `window` `focus` event and a `visibilitychange` add no request; (d) clicking `trending` then `newest` again leaves the panel empty and adds no request; (e) open the page as a **guest**, click `newest`, then forge a session cookie for the page's fetch and call `page.window.Session.refresh()` (it re-reads `/api/me` and notifies `tabs.js`'s subscriber with the changed sign-in state — `tabs.js:750`); after `settle(100)`: `newest` is still `is-active`, its panel still visible and empty, `#refreshBtn` still `disabled`, and the only new request is the `/api/me` call `refresh()` itself makes — nothing to `/api/tabs`, `/api/live` or `/api/me/polls` (spec FR-023–FR-026, SC-004, edge case "Newest is the open tab when the visitor signs out or signs in")
- [ ] T022 [US3] Complete the US3 scenario in `quickstart.md` in a real browser as a guest and as a member, including the 30-second wait, the sign-in with Newest open, and the screen-reader pass (each button announced by its label only; "exclamation mark" never spoken) (spec FR-014, SC-007)

**Checkpoint**: the sixth tab is real, empty and silent.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T023 [P] Review every region changed in `src/public/index.html`, `src/public/tabs.css` and `src/public/tabs.js`: the new markup, rules and the controller literal carry no explanatory, historical or requirement-citing comments; the one permitted comment is the pointer in `src/public/avatar-default.svg`; pre-existing FIX-numbered comments in the tab bar region are left untouched where their line did not change (constitution Principle VI)
- [X] T024 [P] Confirm `src/public/tabs.js` and `src/public/index.html` write nothing new to the browser console and add no error path (constitution Principle V) — Newest has no request to fail
- [X] T025 `npm test` and `npm run build` both green; `git grep -n "TRENDING</button>\|My PRIVATE POLLS\|data-tab=\"favorites\"" -- src/public` returns nothing (identifiers unchanged, labels changed) — *2026-09-20: 41 files / 624 tests green, build clean, `tsc --noEmit` clean; the grep's only hits are the three pre-existing prose comments noted at T006*
- [ ] T026 Run the full `quickstart.md` validation end to end, including its "Done when" list
- [X] T027 [P] Update `README.md` at the project root: the overview's "five-tab" home page becomes six tabs with Newest named as a placeholder for a coming feature, and the Live Results sentence "the oldest leaves when a sixth is added" is corrected to "a sixth is refused until one is removed"; it must not reference `specs/`, `designDocs/`, `research/` or `architecture/` (constitution Documentation Deliverables)
- [X] T028 [P] Update `ARCHITECTURE.md` at the project root: the `tabs.js` node reads "six tabs" and the home page description mentions the icon-per-tab bar with its full-width rule; keep existing content that is still accurate (constitution Documentation Deliverables)

---

## Outstanding at the end of the implementation run (2026-09-20)

Four tasks need a real browser or a screen reader, which the implementation environment does not
have; everything they verify is implemented and covered by the automated suites as far as jsdom
can see. They are left open for the developer:

- **T017** — US1 in a browser: the rule to both window edges at 900/1400/2000px; no horizontal
  scrollbar with a vertical one present; 16×16 icons and the 6px gap in the inspector; the pill
  and Refresh above the rule; icon colours; the bars bouncing on every tab and still under
  reduced motion.
- **T020** — US2 in a browser signed in: personal tabs, bookmark → Favorites, Live Results as the
  fifth tab with Refresh hidden, `/?q=` opening the last tab, sign-out dimming, the one-row
  scroll at ≈375px with the rule fixed, zero icon fetches in the network panel.
- **T022** — US3 in a browser as guest and member, plus the screen-reader pass (each button
  announced by its label only).
- **T026** — the full `quickstart.md` run, which is T017 + T020 + T022 plus the automated
  commands (already green).

Also outside this run: `designDocs/018-high-level-requirements-TAB-BAR.md` § Trending Icon still
defines the icon by the untracked JPEG alone; FR-006's sentence can be pasted there.

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: depends on Phase 1. T002 → T003 (same file, panels follow
  buttons); T004 independent of those but before T005; T005 after T002–T004; T006 last.
  **Blocks every story.**
- **US1 (Phase 3)**: after Phase 2. T007 first (the button rule the icons rely on); T008–T013 in
  sequence (all edit `index.html` — one icon per task, any order among themselves); T014
  independent of the icons; T015 and T016 in parallel once T008–T014 are in; T017 after all.
- **US2 (Phase 4)**: after US1 (it verifies the finished bar). T018 and T019 in parallel; T020
  after both.
- **US3 (Phase 5)**: after Phase 2 only — T004 is the whole implementation; T021 can be written
  as soon as Phase 2 is green, in parallel with US1. T022 after T021.
- **Polish (Phase 6)**: after every story. T023, T024, T027, T028 in parallel; T025 → T026 last.

### A note on story independence

US1 and US3 are independent after Phase 2: the icons and the rule do not touch the Newest
controller, and the Newest tests do not look at icons. US2 is a verification story and comes
last by design — it proves the finished bar, not a half-built one.

### Parallel opportunities

- US1: T015 and T016 — two test files, once the markup is in.
- US1 ∥ US3: T021 alongside T007–T014.
- US2: T018 and T019.
- Polish: T023, T024, T027, T028.

### Parallel example: after Phase 2 is green

```bash
# Two streams, no shared files:
Task: "T007–T014 src/public/index.html, src/public/tabs.css, src/public/avatar-default.svg"   # US1 markup and style
Task: "T021 tests/client-home.test.ts (Newest tests)"                                            # US3 verification
# Then, once T014 is in:
Task: "T015 tests/tab-bar-assets.test.ts"
Task: "T016 tests/client-home.test.ts (icon tests)"
```

---

## Implementation Strategy

### MVP: Phases 1–3 (Setup + Foundational + US1)

1. T001 baseline.
2. Phase 2 — the skeleton: six buttons, six panels, the Newest registration, the order test.
   T006 green means every existing suite survived the reorder and relabel.
3. US1 — the button rule, six icons one at a time (Favorites and Search are pure copies — do
   them first to settle the pattern; the avatar and the bars next; the two new drawings last),
   the rule, the two test files, the browser walk-through.

That is the feature as a user sees it. US2 and US3 add certainty, not pixels.

### Incremental delivery

- After Phase 2: a bar with the right words in the right order and a working sixth tab.
- After US1: the mockup, realised.
- After US2: proof nothing else moved.
- After US3: proof the sixth tab is silent.
- After Polish: root documentation current; the constitution's two deliverables met.
