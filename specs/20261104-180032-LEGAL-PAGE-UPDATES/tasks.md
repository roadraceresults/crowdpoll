---

description: "Task list for the Legal Page Updates feature"
---

# Tasks: Legal Page Updates

**Input**: Design documents from `specs/20261104-180032-LEGAL-PAGE-UPDATES/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R8), data-model.md, contracts/ui-contracts.md (C1–C6), quickstart.md

**Tests**: Included: FR-021 requires the checks that pin the legal pages, their assets and the Up arrow to follow the change, and to cover the Back arrow's shown and hidden cases.

**Organization**: Tasks are grouped by user story; each story can ship on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

- Single project: `src/`, `tests/` at the repository root; browser pages and sheets in `src/public/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the starting point.

- [X] T001 Run `npm test` and `npx tsc --noEmit` from the repository root and note any failure that exists before the change, so later failures can be told apart

---

## Phase 2: Foundational (Blocking Prerequisites)

None: the three stories touch separate files, except `privacy.html`, which US1 and US2 change in different places (see Dependencies).

---

## Phase 3: User Story 1 - A reader learns that the check stops bots and AI agents (Priority: P1) 🎯 MVP

**Goal**: The Privacy Policy describes the check as Bot and AI Agent Detection, and the policies take a new version (FR-001–FR-009).

**Independent Test**: Quickstart scenarios 1–4.

### Tests for User Story 1

- [X] T002 [US1] In `tests/legal-pages.test.ts`, change "says what the bot check measures, where, and for how long" to expect the heading "Bot and AI Agent Detection", the sentence "you tick a box that checks you are not a bot or an AI agent", the Why "to prevent bots and AI agents from creating accounts, sending sign-in emails, and voting on polls.", the unchanged measured items, period, third-party and cookie lines, and the `<section id="bot-check"` address; add checks that the page contains no "Bot check", that the "In short" item reads as C1 with `<a href="#bot-check">check</a>`, and that the retention row is `<tr><td>Bot and AI agent detection measurements</td><td>in memory, one hour at most</td></tr>` (contracts C1)
- [X] T003 [US1] In `tests/legal-pages.test.ts`, add a check that `privacy.html`'s `Last updated` date is the `TERMS_VERSION` date written as `D Month YYYY`, and that `terms.html`'s stays `22 October 2026` (contracts C2); the existing "prints the current version on both pages, and no other" test covers the version lines

### Implementation for User Story 1

- [X] T004 [US1] In `src/public/privacy.html`, rewrite the `<section id="bot-check">`: the `<h3 id="bot-check-title">` text, the first paragraph and the **Why** item as contracts C1; keep the ids and the other four items' text
- [X] T005 [US1] In `src/public/privacy.html`, change the "In short" item (line 43) and the retention row "Bot check measurements" (line 139) as contracts C1
- [X] T006 [US1] Set `TERMS_VERSION` in `src/legal/version.ts` to the release date (`YYYY-MM-DD`, the day of implementation), then change the `Version …` line of `src/public/privacy.html` and `src/public/terms.html` to it and `privacy.html`'s `Last updated` to the same date as `D Month YYYY` (research R8, contracts C2)
- [X] T007 [US1] Run `npx vitest run tests/legal-pages.test.ts tests/client-human-check.test.ts tests/cookie-use-list.test.ts`, and the terms-gate suites (`npx vitest run -t "terms"`), and fix any test that pinned the previous version value instead of reading `TERMS_VERSION`

**Checkpoint**: US1 is shippable alone.

---

## Phase 4: User Story 2 - A reader goes back to the CrowdPoll page they came from (Priority: P2)

**Goal**: A Back arrow on `/privacy` and `/terms`, shown only after a same-site page in the same tab, returning past in-page anchor steps, fixed in line with the logo (FR-010–FR-018).

**Independent Test**: Quickstart scenarios 5–11 and 14.

### Tests for User Story 2

- [X] T008 [P] [US2] Add a `referrer?: string` option to `openPage` in `tests/helpers/browser.ts`, passed to the `JSDOM` constructor's `referrer` option; no other behaviour changes
- [X] T009 [P] [US2] Create `tests/back-arrow-sheet.test.ts`, in the style of `tests/back-to-top-sheet.test.ts`, reading `src/public/back-arrow-m3.css`: `.back-arrow-bar` is `position:fixed`, `left:0`, `right:0`, `top:calc(var(--fixed-chrome-height,0px) + 12px)`, `max-width:var(--max-width)`, `margin:0 auto`, `padding-inline:20px` (and `14px` under `@media (max-width: 639.98px)`), `z-index:40`, `pointer-events:none`; `.back-arrow` is 40 px square, `var(--md-sys-shape-corner-full)`, `secondary-container` / `on-secondary-container`, `pointer-events:auto`, has hover/focus/pressed state layers and the `:focus-visible` outline `3px solid var(--md-sys-color-secondary)` offset `2px`; the sheet has no token section, dark twin, literal font size or comment (contracts C4)
- [X] T010 [US2] Create `tests/client-back-arrow.test.ts` (after T008), loading `privacy.html` with `openPage` and `scripts: ["tooltip-m3.js", "backArrow.js"]` at `url: "http://localhost/privacy"`; use `beforeScripts` to add a history entry (`history.pushState`) where a test needs `history.length > 1`, and to replace `history.go` with a recorder. Cover:
  - shown, as `#backArrow` inside `.back-arrow-bar` directly after `#site-header`, with `aria-label="Back"`, type `button` and the tooltip adopted (`data-tooltip="Back"`), when the referrer is `http://localhost/login` and the history has an earlier entry;
  - absent, with no `.back-arrow-bar` in the page, for an empty referrer, a referrer on another origin, a malformed referrer, and a same-origin referrer with `history.length` 1 (clarification Q1);
  - a press with no anchor step calls `history.go(-1)`;
  - after two `hashchange` steps (`location.hash` set twice), a press calls `history.go(-3)`;
  - after a `popstate` back to the first anchor step's entry, a press calls `history.go(-2)`;
  - one anchor step that fires both `popstate` and `hashchange` counts once: a press then calls `history.go(-2)`;
  - an entry that already carries `legalDepth` (a reload) keeps its number;
  - other keys in `history.state` are kept;
  - nothing is written to the browser console (research R1, R2, contracts C3)
- [X] T011 [P] [US2] In `tests/m3-assets.test.ts`, add `"back-arrow-m3.css"` to `LAYER_ORDER` directly after `"back-to-top-m3.css"`; add it to the `layers` of `privacy.html`, `terms.html` and `admin.html`, and `"backArrow.js"` to the `scripts` of `privacy.html` and `terms.html` directly after `"fixedChrome.js"`
- [X] T012 [P] [US2] In `tests/legal-pages.test.ts`, add a check that `src/public/legal-m3.css` contains `.legal-doc{ box-sizing:border-box; padding-inline-start:max(0px, calc(56px - (100% - 72ch) / 2)); }` (contracts C5)

### Implementation for User Story 2

- [X] T013 [P] [US2] Create `src/public/back-arrow-m3.css` as contracts C4: the `.back-arrow-bar` wrapper (research R3) and the `.back-arrow` look moved from `src/public/admin.css`'s `.admin-back-link` rules (position, overflow, inline-flex centring, 40 px, full corner, secondary-container colours, `::before` state layer with hover/focus/pressed opacities, focus-visible outline, 26 px SVG), with `pointer-events:auto`; M3 tokens only, no comments
- [X] T014 [P] [US2] Create `src/public/backArrow.js`, an IIFE in the style of `backToTopFab.js`, with single-purpose functions (research R1, R2, R6):
  - `cameFromThisSite()`: `document.referrer` parses (inside `try`) to a URL whose `origin` is `location.origin`, and `history.length > 1`;
  - `numberEntry()`: at load, keep a numeric `history.state.legalDepth` or write 0 with `history.replaceState({ ...history.state, legalDepth: 0 }, "")`;
  - on `popstate` and `hashchange`: adopt the entry's number, or write the last known number plus one; one anchor step fires both events, so the first numbers the entry and the second adopts that number;
  - build the bar and button of contracts C3 (the admin link's SVG paths), insert the bar with `document.getElementById("site-header").after(bar)`, and on click call `history.go(-(legalDepth + 1))`;
  - do nothing at all when `cameFromThisSite()` is false; log nothing
- [X] T015 [US2] In `src/public/privacy.html` and `src/public/terms.html`, add `<link rel="stylesheet" href="/back-arrow-m3.css">` directly after `back-to-top-m3.css`, and `<script src="/backArrow.js" defer></script>` directly after `fixedChrome.js` (after T013, T014)
- [X] T016 [US2] In `src/public/legal-m3.css`, add `box-sizing:border-box; padding-inline-start:max(0px, calc(56px - (100% - 72ch) / 2));` to the existing `.legal-doc{ … }` rule, written so the T012 check matches (research R4, contracts C5)
- [X] T017 [US2] In `src/public/admin.html`, add `<link rel="stylesheet" href="/back-arrow-m3.css">` directly after `back-to-top-m3.css` and change the link to `class="admin-back-link back-arrow"`; in `src/public/admin.css`, remove the look now in `back-arrow-m3.css` from `.admin-back-link` and its `::before`, `:hover`, `:focus-visible`, `:active` and `svg` rules, keeping `margin-bottom:10px` and the `.admin-toolbar` placement rules; remove the `013 FR-040` comment above the link in `admin.html` and the two comments above `.admin-back-link` in `admin.css` ("Back to /admin — plain link …" and "The home page's Refresh treatment …"), since none points to external documentation (constitution Principle VI) (after T013; research R5)
- [X] T018 [US2] Run `npx vitest run tests/client-back-arrow.test.ts tests/back-arrow-sheet.test.ts tests/m3-assets.test.ts tests/legal-pages.test.ts tests/client-admin-discard.test.ts tests/polls-editing-eligibility.test.ts tests/client-m3-tooltip.test.ts` and fix what fails

**Checkpoint**: US2 works on its own; quickstart 5–11 and 14 pass.

---

## Phase 5: User Story 3 - The Up arrow sits in the centre (Priority: P3)

**Goal**: The Up arrow is centred at the bottom on every page that has it (FR-019, FR-020).

**Independent Test**: Quickstart scenarios 12–13.

### Tests for User Story 3

- [X] T019 [P] [US3] In `tests/back-to-top-sheet.test.ts`, change "fixes the button near the bottom-right corner, above the cookie banner" to "fixes the button at the bottom centre, above the cookie banner": expect `left:0;`, `right:0;` and `margin-inline:auto;`, and the existing `position`, `bottom` and `z-index` lines (contracts C6)

### Implementation for User Story 3

- [X] T020 [P] [US3] In `src/public/back-to-top-m3.css`, replace `right:20px;` with `left:0;`, `right:0;` and `margin-inline:auto;`, each on its own line as the sheet writes them; change nothing else (research R7)
- [X] T021 [US3] Run `npx vitest run tests/back-to-top-sheet.test.ts tests/client-back-to-top.test.ts` and fix what fails

**Checkpoint**: all three stories done.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T022 Run `npx tsc --noEmit` and `npm test`; all suites pass
- [X] T023 Walk `specs/20261104-180032-LEGAL-PAGE-UPDATES/quickstart.md` scenarios 1–15 in a browser at desktop width and at 375 px, and note any that fail
- [X] T024 [P] After implementation, update `README.md` (the human check's link now leads to *Bot and AI Agent Detection*, line 53; **Back to top** now sits at the bottom centre, line 132; a new line for the legal pages' **Back** arrow) and `ARCHITECTURE.md` (the layer list at line 719 gains `back-arrow`; the back-to-top paragraph at line 761 says centred; a sentence on `backArrow.js`: referrer and history check, `history.state.legalDepth`), per the constitution's Documentation Deliverables
- [X] T025 [P] After implementation, add the feature's decisions to `CLAUDE_COMPLETE.md` beside the earlier features' (the kept `#bot-check` anchor, the shared version, the Back arrow's rule and step count, the shared `back-arrow-m3.css`, the centred Up arrow), and correct its Back to Top line (line 517) if it gives the position

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: first.
- **User stories (Phases 3–5)**: each depends only on Phase 1.
- **Polish (Phase 6)**: after the stories being shipped.

### User Story Dependencies

- **US1 (P1)**: none.
- **US2 (P2)**: none on US1's behaviour; T015 edits `privacy.html` (the `<head>` and the script list) where US1 edits the body and the version line, so do not run T015 at the same moment as T004–T006.
- **US3 (P3)**: none; its sheet is shared by 13 pages but no other task edits it.

### Within Each User Story

- Tests first, failing, then the implementation that makes them pass.
- US2: T008 before T010; T013 and T014 before T015; T013 before T017.

### Parallel Opportunities

- US2: T008, T009, T011, T012 in parallel; then T013 and T014 in parallel.
- US3 (T019, T020) can run beside US1 or US2.
- Polish: T024 and T025 in parallel.

---

## Parallel Example: User Story 2

```text
T008 tests/helpers/browser.ts      — referrer option
T009 tests/back-arrow-sheet.test.ts
T011 tests/m3-assets.test.ts
T012 tests/legal-pages.test.ts      — gutter rule
then
T013 src/public/back-arrow-m3.css
T014 src/public/backArrow.js
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001.
2. T002–T007: the policy text and the new version.
3. Stop and validate with quickstart 1–4; it can ship alone.

### Incremental Delivery

1. US1 → ship (the legal text).
2. US2 → ship (the Back arrow, the shared look on the admin page).
3. US3 → ship (the centred Up arrow on every page).
4. Polish: full test run, the quickstart walk, then README.md, ARCHITECTURE.md and CLAUDE_COMPLETE.md.

---

## Notes

- No migration, route, setting or dependency; `postman/openapi.json` and `.claude/rules/environment.md` are unchanged.
- The release date in T006 is the day the change is implemented; if it ships on a later day, set it again before release.
- Comments in the new script and sheet follow Principle VI: none that cite specs, tasks or findings.
