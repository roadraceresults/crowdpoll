---

description: "Task list for the fixed viewport width trial"
---

# Tasks: Fixed Viewport Width Trial

**Input**: Design documents from `specs/20261113-085157-FIXED-VIEWPORT-WIDTH/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/viewport.md, quickstart.md

**Tests**: The plan names them (research R8): `tests/client-viewport-width.test.ts` for the script's decisions
(contract V2–V5) and `tests/viewport-width-pages.test.ts` for the 13 page heads (contract V1). They are written before
the code they check.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

Single project at the repository root: `src/public/`, `tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: A green baseline before any change.

- [X] T001 Run `npx tsc --noEmit` and `npm test` from the repository root and confirm both pass before changing anything (record any pre-existing failure instead of fixing it)

---

## Phase 2: Foundational (Blocking Prerequisites)

None: there is no shared infrastructure to build. US2 extends the script US1 creates (see Dependencies).

---

## Phase 3: User Story 1 - A phone visitor sees the same layout on every phone (Priority: P1) 🎯 MVP

**Goal**: On a device held narrower than 480 px, every one of the 13 pages is laid out 480 px wide and scaled to fit,
with zoom untouched.

**Independent Test**: `npx vitest run tests/client-viewport-width.test.ts tests/viewport-width-pages.test.ts` passes;
in device emulation at 390 px the home page reports `document.documentElement.clientWidth === 480` (quickstart §2).

### Tests for User Story 1

- [X] T002 [P] [US1] Create `tests/client-viewport-width.test.ts`, modelled on the `colorScheme.js` block of `tests/client-site-settings.test.ts` (`openPage(ctx, "privacy.html", { scripts: ["viewportWidth.js"], beforeScripts })`). Add a helper that, in `beforeScripts`, defines `window.screen.width`, `window.screen.height` and `window.screen.orientation` (an `EventTarget` with a `type` string) with `Object.defineProperty(..., { configurable: true })`. Add one test per portrait row of contract V2 with `heldWidth < 480` (320 × 568, 360 × 800, 390 × 844, 430 × 932, 479 × 900): after load, `meta[name="viewport"]` has `content` exactly `width=480`. Add a test of contract V4's first bullet (the root's inline style has `text-size-adjust: 100%` and `-webkit-text-size-adjust: 100%`) and of contract V5 (the content holds none of `initial-scale`, `minimum-scale`, `maximum-scale`, `user-scalable`; `page.requests` is empty; `localStorage` and `document.cookie` are empty; no new own property was added to `window`). They fail until T004
- [X] T003 [P] [US1] Create `tests/viewport-width-pages.test.ts`: read every `*.html` in `src/public/` with `readdirSync`/`readFileSync`, assert there are 13, and for each assert contract V1: it contains `<meta name="viewport" content="width=device-width, initial-scale=1">`; it contains `<script src="/viewportWidth.js"></script>` exactly once; that line immediately follows the line `<script src="/colorScheme.js"></script>`; and its index is greater than the viewport meta's and less than the first `<link rel="stylesheet"`. It fails until T005

### Implementation for User Story 1

- [X] T004 [US1] Create `src/public/viewportWidth.js` as an IIFE with `"use strict"`, in the style of `src/public/colorScheme.js` but with no comments (Constitution VI): a constant `FIXED_WIDTH = 480`; the viewport `meta` element and its original `content` read once; `isLandscape()` returning `screen.orientation.type.startsWith("landscape")` when `screen.orientation` exists, else `Math.abs(window.orientation) === 90`; `heldWidth()` returning `Math.max(screen.width, screen.height)` in landscape and `Math.min(...)` otherwise (research R2); `apply()` which computes the wanted content (`"width=" + FIXED_WIDTH` when `heldWidth() < FIXED_WIDTH`, else the original content), returns when the meta already holds it, and otherwise writes it and sets (fixed) or removes (device) `text-size-adjust` and `-webkit-text-size-adjust` on `document.documentElement.style` with `setProperty`/`removeProperty` (FR-015; research R3, R5); call `apply()` once. No global, no storage, no `console` call (contract V5)
- [X] T005 [US1] In each of the 13 files `src/public/accept-terms.html`, `admin.html`, `admin-results.html`, `confirm-signin.html`, `create-account.html`, `index.html`, `invite.html`, `login.html`, `not-authorized.html`, `privacy.html`, `profile.html`, `settings.html`, `terms.html`, insert the line `  <script src="/viewportWidth.js"></script>` immediately after the line `  <script src="/colorScheme.js"></script>` (`tests/m3-assets.test.ts` requires `colorScheme.js` to stay the first script); change nothing else (verify with `git diff --stat src/public/*.html`: 13 files, 1 insertion each)
- [X] T006 [US1] Run `npx vitest run tests/client-viewport-width.test.ts tests/viewport-width-pages.test.ts tests/pages.test.ts` and confirm all pass (`pages.test.ts` unchanged: the meta and icon lines did not move)

**Checkpoint**: A narrow phone that loads a page gets the 480 px layout; it does not yet follow a turn.

---

## Phase 4: User Story 2 - Wider devices and turned phones keep today's layout (Priority: P2)

**Goal**: Devices held 480 px wide or wider keep the page's own viewport content, and the decision follows a turn, a
fold and a page restored from history.

**Independent Test**: `npx vitest run tests/client-viewport-width.test.ts` passes with the cases below; in emulation a
390 × 844 phone turned to landscape shows the `main` layout and returns to 480 px when turned back (quickstart §3).

### Tests for User Story 2

- [X] T007 [US2] In `tests/client-viewport-width.test.ts`, add: (a) one test per remaining row of contract V2 (390 × 844 landscape reported iOS style as width 390, 844 × 390 landscape reported Android style, 568 × 320 landscape, 480 × 900, 768 × 1024, 1920 × 1080): the meta's content is as the table says, and where it is the device content the root's inline style has neither `text-size-adjust` property (contract V4); (b) the fallback: with `screen.orientation` undefined and `window.orientation` set to `90`, `-90`, `0` and `undefined` on a 390 × 844 screen, the content is device, device, `width=480`, `width=480`; (c) contract V3: starting portrait 390 × 844, change `screen.orientation.type` to `landscape-primary` and dispatch `change` on it → device content and no `text-size-adjust`; back to `portrait-primary` and dispatch → `width=480`; the same flip driven by `window.dispatchEvent(new window.Event("resize"))` and by `pageshow`; (d) idempotence: with a `MutationObserver` on the meta's attributes, dispatching `resize`, `pageshow` and the orientation `change` without changing the screen records no mutation. The (c) and (d) cases fail until T008

### Implementation for User Story 2

- [X] T008 [US2] In `src/public/viewportWidth.js`, after the first `apply()`, add `window.addEventListener("resize", apply)`, `window.addEventListener("pageshow", apply)` and, when `screen.orientation` exists, `screen.orientation.addEventListener("change", apply)` (research R4); nothing else changes
- [X] T009 [US2] Run `npx vitest run tests/client-viewport-width.test.ts` and confirm every case passes

**Checkpoint**: The rule of contract V1–V5 is complete and tested.

---

## Phase 5: User Story 3 - The developer judges the trial with a written checklist (Priority: P3)

**Goal**: `quickstart.md` is run from start to finish and holds the measured sizes and one outcome.

**Independent Test**: Every table cell of `specs/20261113-085157-FIXED-VIEWPORT-WIDTH/quickstart.md` §2–§5 is filled and
§6 names exactly one outcome.

- [X] T010 [US3] Compare `specs/20261113-085157-FIXED-VIEWPORT-WIDTH/quickstart.md` with FR-011 and User Story 3's acceptance scenarios: the six screen sizes, the four pages, the four pass conditions, the size table and the outcome line are all present; correct the file if anything is missing
- [X] T011 [US3] Start the development server from this branch and run quickstart §2 and §3 in a Chromium browser's device emulation (mobile device type), comparing with `main`; write each result into the tables of `specs/20261113-085157-FIXED-VIEWPORT-WIDTH/quickstart.md` (closed at the developer's decision, tweak TWEAK07: reviewed on a real phone through the tunnel and on BrowserStack; the checklist's tables were not all filled in)
- [X] T012 [US3] MANUAL (developer, on a real phone reaching the development server as the quickstart's "Reaching the development server from a phone" section describes): run quickstart §4, including the "to verify" points of research R2, R5 and R7, and write each result into `specs/20261113-085157-FIXED-VIEWPORT-WIDTH/quickstart.md` (closed at the developer's decision, tweak TWEAK07: reviewed on a real phone through the tunnel and on BrowserStack; the checklist's tables were not all filled in)
- [X] T013 [US3] MANUAL (developer): fill quickstart §5's last column and §6 (the four pass conditions, one outcome, the date and notes) in `specs/20261113-085157-FIXED-VIEWPORT-WIDTH/quickstart.md` (closed at the developer's decision, tweak TWEAK07: reviewed on a real phone through the tunnel and on BrowserStack; the checklist's tables were not all filled in)

**Checkpoint**: The trial has a recorded outcome; merging or not merging the branch follows it.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T014 Run `npx tsc --noEmit` and `npm test` and confirm both pass
- [X] T015 Run `git diff --stat origin/main -- src tests` and confirm the only changes are the new `src/public/viewportWidth.js`, one inserted line in each of the 13 `src/public/*.html`, and the two new test files (FR-013: no sheet, no other script)
- [X] T016 [P] In `ARCHITECTURE.md`, add a short section on the viewport rule beside the header and tab-bar layout notes: `viewportWidth.js` in every head after `colorScheme.js`, the held-width rule and its 480 px threshold, the three events, `text-size-adjust`, and the breakpoints a phone in portrait no longer reaches (research R6); state that it is a trial (research R9)
- [X] T019 In `src/public/viewportWidth.js` change `FIXED_WIDTH` from 640 to 480, and bring `tests/client-viewport-width.test.ts`, contract V2, research R6, the quickstart's size table and every other statement of the width into line (tweak TWEAK04: 480 px was reviewed on a phone, 480 px is tried next)
- [X] T017 [P] In `CLAUDE_COMPLETE.md`, add this feature's decisions (the five "easy to get wrong" points of the plan block in `CLAUDE.md`), following the layout of the entries already there
- [X] T018 Confirm `README.md` needs no change during the trial (its phone descriptions hold at 480 px, research R9); if T013 recorded "kept", add one sentence to its phone notes saying a phone shows the site at a fixed 480 px layout scaled to the screen (outcome: kept at 480 px; the sentence was added to `README.md`)

---

## Dependencies & Execution Order

- **Phase 1** first.
- **US1 (Phase 3)**: T002 and T003 in parallel, then T004 (makes T002 pass), T005 (makes T003 pass), T006.
- **US2 (Phase 4)** depends on US1: T007 and T008 edit files T002 and T004 created.
- **US3 (Phase 5)** depends on US1 and US2: the checklist judges the complete rule. T012 and T013 are the developer's.
- **Phase 6** after US2 for T014–T017; T018 after T013.

### Parallel Opportunities

- T002 and T003 (two new test files).
- T016 and T017 (two documents).
- T004 and T005 touch different files and may be done together once T002 and T003 exist.

## Implementation Strategy

- **MVP**: Phases 1 and 3. A narrow phone loads the 480 px layout; enough to look at the effect in emulation.
- **Complete rule**: add Phase 4, so turning the phone and wide devices behave as specified.
- **Decision**: Phase 5 is the point of the trial; nothing is merged before T013 records the outcome.
