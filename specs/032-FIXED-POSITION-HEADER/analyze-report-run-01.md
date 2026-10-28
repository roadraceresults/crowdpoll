# Specification Analysis Report — specs/032-FIXED-POSITION-HEADER

## Record

| Record | Value |
|---|---|
| Feature directory | specs/032-FIXED-POSITION-HEADER |
| Report created | 2026-10-14 16:20 |
| Analysis captured | 2026-10-14 16:20 |
| Last updated | 2026-10-14 16:30 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

## Findings

- [X] **U1** · Underspecification · HIGH · spec.md:FR-005; tasks.md T003,T010,T012,T019  
  **Summary:** FR-005 requires the reserved space to "adjust automatically" on resize, sign-in/out, and the Hamburger/Refresh row appearing. `fixedChrome.js`'s triggers (ResizeObserver, MutationObserver, `fonts.ready`) are implemented in T003, but no task tests that a *change* in height actually re-triggers a write — every fixedChrome test (T010, T012, T019) only asserts a static snapshot given one stubbed `offsetHeight`. 031's equivalent requirement got a dedicated trigger-testing story (US5); 032 has none.  
  **Recommendation:** Add a task (Foundational or US1) asserting that changing the stubbed `offsetHeight` after a `ResizeObserver`/`MutationObserver` fire (or `document.fonts.ready` resolving) updates both custom properties — mirroring `client-header-fit.test.ts`'s existing "re-measuring" coverage.  
  **Resolution:** Added T039 to `tasks.md` (Phase 2, after T010): extends `client-fixed-chrome.test.ts` to assert re-measurement on a `ResizeObserver` fire, a simulated header rebuild, and `document.fonts.ready`. (2026-10-14 16:24)

- [X] **U2** · Underspecification · HIGH · tasks.md T010, T019; plan.md Project Structure  
  **Summary:** Both tasks require testing `fixedChrome.js` "in a stubbed page with no `.tab-bar-wrap` element," but the only page-loading helper mentioned anywhere (`openStubbedHome`) always loads `index.html`, which *always* has `.tab-bar-wrap` in its markup. Neither task nor plan.md's Project Structure (unlike 031's plan.md, which explicitly called out a helper edit) says how to produce a DOM without it.  
  **Recommendation:** Specify the mechanism explicitly in T010/T019 — e.g. "remove `.tab-bar-wrap` from the stubbed home page's DOM before running the script" — so the task is implementable without the implementer having to invent an approach.  
  **Resolution:** Reworded T010 and T019 in `tasks.md` to say `.tab-bar-wrap` is removed from the stubbed home page's DOM before `fixedChrome.js` runs. (2026-10-14 16:24)

- [X] **U3** · Underspecification · MEDIUM · tasks.md T012, T016, T017  
  **Summary:** These tests need `window.FixedChrome` present in jsdom (to read a stubbed height), but none says whether `fixedChrome.js` should be added to that test's loaded-script list (so the real implementation computes the value) or whether `window.FixedChrome` should be hand-stubbed directly. Both are valid; the choice isn't stated.  
  **Recommendation:** Add one clause to each task (or a shared note) picking one approach — most consistent with project precedent is adding `fixedChrome.js` to the stubbed page's `scripts` list alongside the file under test.  
  **Resolution:** Reworded T012, T016 and T017 in `tasks.md` to specify adding `fixedChrome.js` to each test's stubbed script list, with `#site-header.offsetHeight` stubbed to drive `window.FixedChrome.height()`. (2026-10-14 16:24)

- [X] **I1** · Inconsistency · MEDIUM · plan.md:L29 (Scale/Scope) vs. plan.md:L76-79 (Project Structure) and tasks.md  
  **Summary:** Scale/Scope says "roughly 5 new test files," but the Project Structure tree lists exactly 4 (`client-fixed-chrome.test.ts`, `client-back-to-top.test.ts`, `header-fixed-sheet.test.ts`, `back-to-top-sheet.test.ts`), and tasks.md (T009, T010, T027, T028) creates exactly those same 4 — no 5th.  
  **Recommendation:** Correct plan.md's Scale/Scope line to "4 new test files."  
  **Resolution:** Changed `plan.md`'s Scale/Scope line from "roughly 5 new test files" to "4 new test files." (2026-10-14 16:24)

- [X] **G1** · Coverage Gap · MEDIUM · tasks.md T028, T030 vs. spec.md FR-010 ("on every one of the seven pages")  
  **Summary:** `client-back-to-top.test.ts`'s behavioral tests (show/hide/click/reduced-motion) run only against `openStubbedHome`'s `index.html` DOM. The other six pages get only script/link *presence* pinning (T026) and a manual walk (T037) — no automated behavioral proof the button works on, say, `admin.html` or `login.html`.  
  **Recommendation:** Low-cost mitigation: note in T028 that the behavior is page-agnostic by construction (appends to `document.body`, listens on `window`), or add one smoke test loading a second page's markup to corroborate.  
  **Resolution:** Option A applied. Reworded T028 in `tasks.md` to note `backToTopFab.js` is page-agnostic by construction, so the stubbed-home suite stands as behavioral coverage for all seven pages, with T026/T037 covering presence on the other six. (2026-10-14 16:28)

- [X] **G2** · Coverage Gap · MEDIUM · spec.md FR-017 ("a visible focus indicator") vs. tasks.md T022, T023, T027, T028  
  **Summary:** No task mentions a `:focus-visible` style for `.back-to-top-fab`, and none tests for one — not even in the manual quickstart walk (T037 lists "Tab + Enter" activation but not checking a visible focus ring). A native `<button>` gets a default outline, but nothing guards against a future rule accidentally suppressing it.  
  **Recommendation:** Add the focus-style rule to T022's description and a corresponding assertion to T027, or at minimum add a manual check to T037/quickstart.md.  
  **Resolution:** Option A applied. Reworded T022 in `tasks.md` to add a `.back-to-top-fab:focus-visible` outline rule (matching `header-tab-bar-m3.css`'s existing convention), and T027 to assert that rule exists in the sheet. (2026-10-14 16:30)

- [X] **G3** · Coverage Gap · LOW · spec.md FR-012/FR-017 (keyboard activation) vs. tasks.md T028  
  **Summary:** T028 only describes "clicking" the button; no automated test dispatches a keyboard `Enter`/`Space` and asserts the same `scrollTo` call. Manual coverage exists (T037) but no unit test.  
  **Recommendation:** Add a keyboard-activation case to T028 (jsdom doesn't auto-translate key events to `click` on a `<button>`, so this needs an explicit dispatch+assert, not just reliance on native behavior).  
  **Resolution:** Reworded T028 in `tasks.md` to add a keyboard `Enter`/`Space` activation assertion alongside the click assertion. (2026-10-14 16:24)

- [X] **G4** · Coverage Gap · LOW · spec.md FR-016 (upward-arrow icon) vs. tasks.md T028  
  **Summary:** T028's description checks `aria-label`/`title`/click/reduced-motion but never asserts the icon itself (e.g., an `<svg>` child) exists.  
  **Recommendation:** Add one assertion to T028 that the button contains an SVG icon.  
  **Resolution:** Reworded T028 in `tasks.md` to assert the button contains an `<svg>` icon. (2026-10-14 16:24)

- [X] **G5** · Coverage Gap · LOW · spec.md SC-006 vs. tasks.md T030  
  **Summary:** SC-006 describes "10 consecutive up-and-down scroll passes through the 400–600 pixel range" with ≤2 total state changes (implying the button does legitimately show once and hide once across a longer walk that also crosses 600/400). T030's described test is narrower — oscillating strictly *within* 450–550 and expecting *zero* toggles. Both are valid checks, but T030 doesn't literally reproduce SC-006's scenario.  
  **Recommendation:** Reword T030 (or add a second case) that walks scrollY down past 600, back up through the band repeatedly, and down again, asserting ≤2 total visibility changes, matching SC-006's wording directly.  
  **Resolution:** Reworded T030 in `tasks.md` in place to simulate 10 consecutive up-and-down passes crossing both the 600 and 400 pixel boundaries, asserting no more than two total visibility changes, matching SC-006 directly. (2026-10-14 16:24)

- [X] **I2** · Inconsistency · LOW · tasks.md "Dependencies and order," US1 paragraph  
  **Summary:** The sentence "Its tasks are mostly sequential because T011 and T013 both edit files T009's test and T004's sheet already created" is grammatically malformed (missing connective words) and reads ambiguously.  
  **Recommendation:** Reword to: "...because T011 edits the sheet T004 already created, and T013 extends the test T009 already created."  
  **Resolution:** Reworded the sentence in `tasks.md` exactly as recommended. (2026-10-14 16:24)

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 | Y | T004,T005,T006,T009,T010 | |
| FR-002 | Y | T011,T012,T013 | |
| FR-003 | Partial | T011 (indirect) | No dedicated test for the Hamburger/Refresh sub-row itself; relies on CSS containing-block behavior + manual T037 |
| FR-004 | Y | T004,T009 | |
| FR-005 | Partial | T037 (manual only) | See U1 |
| FR-006 | Y | T004,T009 | |
| FR-007 | Y | T015,T017 | |
| FR-008 | Y | T014,T016 | |
| FR-009 | Y | T004,T009 | |
| FR-010 | Y | T023,T028 | See G1 for page-scope depth |
| FR-011 | Y | T023,T030 | |
| FR-012 | Partial | T023,T028,T037 | Keyboard case not automated — see G3 |
| FR-013 | Y | T022,T023,T027,T028 | |
| FR-014 | Y | T022,T027 | |
| FR-015 | Y | T023,T028 | |
| FR-016 | Partial | T023 (impl only) | No test assertion — see G4 |
| FR-017 | Partial | T023 | Focus-indicator clause uncovered — see G2 |
| FR-018 | Y | (whole plan, by omission) | No dedicated task needed |
| SC-001 | Y | T009,T010,T037 | |
| SC-002 | Partial | T013,T037 | Same depth note as FR-003 |
| SC-003 | Y | T037 (manual; real layout, consistent with 031's own precedent) | |
| SC-004 | Y | T028 | |
| SC-005 | Y | T030 | |
| SC-006 | Partial | T030 | Wording gap — see G5 |
| SC-007 | Y | T016,T017 | |
| SC-008 | Y | T009,T037 | |
| SC-009 | Y | T037 (manual; real-browser timing) | |

## Constitution Alignment Issues

None found. All six principles are addressed in plan.md's Constitution Check (Pass on all); T034 enforces Principle VI (no explanatory comments); T035/T036 fulfil the Documentation Deliverables mandate — notably, something no prior feature's tasks.md in this repo actually included (checked 031 and others), so 032 is the first to comply with that constitution clause rather than perpetuating the gap.

## Unmapped Tasks

None. Every task maps to Setup, Foundational, a numbered user story, or Polish, with a clear purpose.

## Metrics

- Total Requirements: 27 (18 FR + 9 SC)
- Total Tasks: 38
- Coverage % (≥1 associated task, automated or manual): 100% (27/27) — but 7 of those are flagged Partial above
- Duplication Count: 0
- Ambiguity Count: 0
- Underspecification Count: 3 (U1, U2, U3)
- Coverage Gap Count: 5 (G1–G5)
- Inconsistency Count: 2 (I1, I2)
- Critical Issues Count: 0

## Next Actions (as reported)

No CRITICAL issues — nothing blocks `/speckit-implement`. Two HIGH items (U1, U2) are worth resolving first since they'd otherwise surface mid-implementation as "how do I even write this test" blockers rather than design gaps:
- U1: add a re-measurement-trigger test task before starting Foundational implementation.
- U2: decide and state how `client-fixed-chrome.test.ts` constructs a "no `.tab-bar-wrap`" DOM before T010/T019 are implemented.

The remaining MEDIUM/LOW items (I1, U3, G1–G5, I2) are safe to fix opportunistically during implementation or in a follow-up `/speckit-fix` pass without blocking the start of work.

Suggested commands: manually edit `tasks.md` to add the missing test coverage (U1, G2, G3, G4) and tighten the two underspecified tasks (U2, U3), and fix the one-line inconsistency in `plan.md` (I1) — or proceed straight to `/speckit-implement` and address these as they're hit.
