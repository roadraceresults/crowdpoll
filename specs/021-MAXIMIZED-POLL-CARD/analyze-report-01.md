# Specification Analysis Report — specs/021-MAXIMIZED-POLL-CARD

## Record

| Record | Value |
|---|---|
| Feature directory | specs/021-MAXIMIZED-POLL-CARD |
| Report created | 2026-09-24 06:33 |
| Analysis captured | 2026-09-24 06:44 |
| Last updated | 2026-09-24 06:44 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

## Findings

- [X] **U1** · Underspecification · MEDIUM · spec.md FR-027 (L342); tasks.md T034; research R9  
  **Summary:** Where focus goes on close depends on the face the card was on **when opened**. If the visitor flips the card while maximized (opened on the front, then Vote; or opened on the back, then the back arrow), focus lands on an element on the face that is now turned away.  
  **Recommendation:** Choose the focus target by the face the card is on **when it closes**: the front's `.maximize-btn`, or the back's `.question`. Reword FR-027 and T034 to match.  
  **Resolution:** FR-027 and User Story 5 scenario 4 in spec.md now pick the focus target by the face the card is on as the view closes; tasks.md T011 no longer records `openedFromBack`, T034 reads the face at close, and T036(c) tests both flips. (2026-09-24 06:36)

- [X] **U2** · Underspecification · MEDIUM · tasks.md T011, T031, T034; research R7  
  **Summary:** `closeMaximized()` calls `restore()`, which restores the scroll position and moves focus into the card. When the close happens because of another tab, a header search or a sign-in change, that moves focus into a panel that is about to be hidden, and scrolls the page for a tab the visitor is leaving.  
  **Recommendation:** Give `restore` a quiet mode (`{ quiet: true }`) with no focus and no scroll restore. Use it from `select()` and the session subscription. The X, Escape and the current-tab click keep full restore.  
  **Resolution:** tasks.md T011 gives `restore` a `quiet` option (no scroll restore, no focus move), T031 uses it from `select()` and the session subscription, T034 honours it, and a new T036(c2) checks another-tab closes move neither focus nor scroll. (2026-09-24 06:36)

- [X] **C1** · Coverage · MEDIUM · spec.md FR-007 (L277); tasks.md  
  **Summary:** "Guests MUST be able to maximize a poll" has no test. T008's `requestMaximize` has no sign-in check, so it works by construction, but nothing guards against a later `requireSignIn()` being added.  
  **Recommendation:** Add a case to T013: a guest (no session) opens a card by its title, and Vote inside the view still goes to `/login`.  
  **Resolution:** tasks.md T013 gains case (g): a guest opens a card by its title and Vote inside the view goes to `/login` (FR-007). (2026-09-24 06:36)

- [X] **C2** · Coverage · MEDIUM · spec.md SC-004 (L399), FR-018; tasks.md T026  
  **Summary:** "Each bar's fill and text colour are identical between grid and maximized" is left to manual Q11. T026 checks only the grid card.  
  **Recommendation:** Add a case to T026, or to T018: render a poll, record every row's fill and ink, maximize it, and compare. It's cheap, because both views run the same code.  
  **Resolution:** Option B: tasks.md T018 gains case (c), comparing every row's fill, row background, ink and text shadow between the grid card and the maximized card of a 7-choice poll (FR-018, SC-004), which keeps User Story 3 independent of the maximize feature. (2026-09-24 06:39)

- [X] **U3** · Underspecification · MEDIUM · tasks.md T002  
  **Summary:** Tracing the icon depends on installing `potrace` and ImageMagick with `apt`. The sandbox's network policy has already blocked one download this session, and a traced path from a JPG is usually noisy, not one clean path.  
  **Recommendation:** Allow a fallback in T002: hand-author the icon from simple shapes (a rounded-square outline with a gap, a filled rounded square, a round-capped arrow), merged into one path. Check it against the JPG the same way.  
  **Resolution:** tasks.md T002 now allows a hand-authored single-path icon from simple shapes when `potrace` is unavailable or noisy, checked against the JPG the same way. (2026-09-24 06:36)

- [X] **C3** · Coverage · MEDIUM · spec.md FR-021 (L319); tasks.md T032(h)  
  **Summary:** T032(h) only checks that Refresh keeps the view open. Nothing checks that the maximized card actually updates when a refresh brings new counts.  
  **Recommendation:** Extend T032(h): change a poll's counts on the server, press Refresh, and assert the maximized card's `.poll-totals` or a row's percentage changes.  
  **Resolution:** tasks.md T032(h) now also asserts that Refresh after a server-side count change updates the maximized card's totals and percentages (FR-021). (2026-09-24 06:36)

- [X] **I1** · Inconsistency · LOW · plan.md Technical Context and Project Structure; tasks.md header  
  **Summary:** The plan names `tests/client-home.test.ts`; the tasks put the new cases in two new files. The tasks file says why, but the plan wasn't updated.  
  **Recommendation:** Update plan.md's tests lines, or accept the documented deviation.  
  **Resolution:** Option A: plan.md's Testing paragraph and Project Structure now name `tests/client-maximized.test.ts` and `tests/client-bar-colours.test.ts` and say why they sit beside `client-home.test.ts`, which is not modified. (2026-09-24 06:40)

- [X] **A1** · Ambiguity · LOW · spec.md FR-004 (L269)  
  **Summary:** "In the star's colours" could be read to include the star's pressed (favourited) look, which is `--ink`. The contract fixes it to grey `#9AA197` and `--muted`.  
  **Recommendation:** Reword to "the star's colours at rest, and on hover and focus".  
  **Resolution:** spec.md FR-004 now says the icon takes the star's colours at rest and on hover and focus, not its favourited colour. (2026-09-24 06:36)

- [X] **A2** · Ambiguity · LOW · spec.md SC-006 (L404)  
  **Summary:** "In any browser the site supports" names no browsers, and it can only be checked by hand.  
  **Recommendation:** Name the supported browsers (e.g. current Chrome, Firefox and Safari) in quickstart Q12.  
  **Resolution:** spec.md SC-006 now names current Chrome, Firefox and Safari in place of "any browser the site supports" (the finding's own location; quickstart.md is outside this skill's scope). (2026-09-24 06:36)

- [X] **U4** · Underspecification · LOW · tasks.md T011, T013(f)  
  **Summary:** jsdom doesn't implement `window.scrollTo`; calling it reports "Not implemented" on every open and close in any suite that maximizes a card.  
  **Recommendation:** Stub `window.scrollTo` in T005's shared helper, not only in T013(f).  
  **Resolution:** tasks.md T005 now stubs `window.scrollTo` and `scrollY` on every page the suite opens, and T013(f) uses that stub. (2026-09-24 06:36)

- [X] **U5** · Underspecification · LOW · tasks.md T026(b)  
  **Summary:** "Advance timers past 60 ms" assumes fake timers also drive `requestAnimationFrame`, which Vitest's defaults may not.  
  **Recommendation:** Wait on real time (`await new Promise(r => setTimeout(r, 120))`), as the existing browser suites do.  
  **Resolution:** tasks.md T026(b) now waits on real time (120 ms) instead of advancing fake timers. (2026-09-24 06:36)

- [X] **D1** · Duplication · LOW · spec.md FR-023 / FR-024; FR-026 / FR-027  
  **Summary:** Closing by the current tab appears in both FR-023 and FR-024, and the focus rule after a drop in both FR-026 and FR-027. They agree, so the cost is only upkeep.  
  **Recommendation:** Leave them, or have FR-027 point to FR-026 instead of repeating it.  
  **Resolution:** Option B: spec.md FR-027 now covers only its own cases (focus on opening; scroll and focus for the X, Escape and the current tab; neither for closes caused by leaving the tab, per FR-025) and points to FR-026 for a poll that left the tab, which also brings the spec in line with U2's quiet rule; FR-023 / FR-024 left as they are. (2026-09-24 06:41)

## Coverage Summary

| Requirement | Has task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 Two ways to maximize | ✅ | T006, T008, T013 | |
| FR-002 Title and subtitle hover and click | ✅ | T007, T008, T013, T036 | |
| FR-003 Icon position, 4 px gap | ✅ | T006, T007, T013 | Gap checked by hand (Q1) |
| FR-004 Icon look and colours | ✅ | T002, T006, T007, T043 | A1 |
| FR-005 Button, name, keys | ✅ | T006, T036 | |
| FR-006 SVG asset | ✅ | T002 | U3 |
| FR-007 Guests may maximize | ❌ | — | C1 |
| FR-008 In place, shell visible | ✅ | T011, T013 | |
| FR-009 Grid hidden, not discarded | ✅ | T011, T013 | |
| FR-010 Stand-alone layout | ✅ | T003, T009 | |
| FR-011 1.5× close X | ✅ | T003, T009 | |
| FR-012 Widths, wrap, centring | ✅ | T009, T010, T043 | Checked by hand (Q5) |
| FR-013 375 px floor, no overflow | ✅ | T009, T010, T043 | Checked by hand (Q5) |
| FR-014 Rule height, panel height | ✅ | T009, T043 | Checked by hand |
| FR-015 Placeholder text | ✅ | T003 | |
| FR-016 Every choice, no scroll | ✅ | T015, T017, T018 | |
| FR-017 Height by count, 2 px gap | ✅ | T015, T016, T018 | |
| FR-018 Renders as the grid card | ⚠️ partly | T004 (shared code path) | C2 |
| FR-019 Behaves as the grid card | ✅ | T029, T032 | |
| FR-020 Face and selection carried | ✅ | T032(b) | |
| FR-021 Keeps receiving updates | ⚠️ partly | T032(c, h) | C3 |
| FR-022 No entry points inside the view | ✅ | T008, T032(i) | |
| FR-023 X, Escape, current tab close it | ✅ | T011, T012, T035, T036 | |
| FR-024 Current tab: no request | ✅ | T012, T013(e) | |
| FR-025 Other exits | ✅ | T031, T032(g) | U2 |
| FR-026 Leaving the listing; retention | ✅ | T028, T030, T032(d–f) | |
| FR-027 Scroll and focus | ✅ | T011, T034, T036 | U1 |
| FR-028 No address change | ✅ | T036(e) | |
| FR-029 Palette | ✅ | T020, T026 | |
| FR-030 Dark-shade ink, 7:1 | ✅ | T021, T022, T026 | |
| FR-031 Yes/No colours and tint | ✅ | T020–T023, T026 | |
| FR-032 White text follows the fill | ✅ | T023, T024, T026, T043 | Tracking during the animation checked by hand (Q12) |
| FR-033 Trailing edge kept | ✅ | existing `site.css` test, kept by T025; T042 | No work needed |
| FR-034 Grid card sizing unchanged | ✅ | T004, T014 | |
| FR-035 Vote rows and admin unchanged | ⚠️ no work | T043 (Q13) | Nothing to build; checked by hand only |
| FR-036 Old rules retired and recorded | ✅ | T025, T038, T042 | |
| SC-001 One action in, one out | ✅ | T013 | |
| SC-002 100% of choices | ✅ | T018 | |
| SC-003 Same grid, order, scroll, no request | ✅ | T013 | |
| SC-004 Same colours in both views | ⚠️ by hand | T043 (Q11) | C2 |
| SC-005 Contrast | ✅ | T026 | |
| SC-006 No white text outside the fill | ⚠️ by hand | T043 (Q12) | jsdom can't animate; A2 |
| SC-007 No cut-off at any width | ⚠️ by hand | T043 (Q5) | jsdom can't lay out |
| SC-008 Keyboard round trip | ✅ | T036 | |
| SC-009 Suite green except the replaced assertions | ✅ | T025, T042 | |

## Constitution Alignment Issues

None reported.
- **I–IV:** covered by the plan's gate table; every task names its check.
- **V (errors, browser logging):** nothing new is logged.
- **VI (comments):** T020, T021 and T042 enforce it.
- **Documentation Deliverables:** T040 and T041 come after implementation, and README is barred from referencing specs, design docs, the architecture folder or the research folder.

## Unmapped Tasks

None reported.
- T001 is the baseline test run.
- T005 builds the test scaffolding.
- T038 and T039 are the notes marking the old rules as superseded (BC-1 and BC-2).
- T040 and T041 are the README and ARCHITECTURE updates the constitution requires.

## Metrics

- **Requirements:** 36 FRs and 9 SCs, 45 in all.
- **Tasks:** 43.
- **Coverage:**
  - 44 of 45 requirements (98%) have at least one task, counting FR-035, which needs no work.
  - FR-007 is the only one with none.
  - 5 are only partly covered by automated tests or checked by hand: FR-018, FR-021, SC-004, SC-006 and SC-007.
- **Ambiguities:** 2 (A1, A2).
- **Duplications:** 1 (D1).
- **Critical issues:** 0.

## Next Actions (as reported)

- **No critical or high issues, so you can go ahead with `/speckit-implement`.**
- **Before starting, apply U1 and U2.** Both are small changes to T011, T031 and T034, and both would otherwise ship focus bugs that the tests as written wouldn't catch.
- **C1, C2 and C3** each add one test case to an existing task. U3 heads off a likely stall on T002.
- **The LOW items** can be handled during implementation or left as they are.
- To track these one at a time, `/speckit-analyze-resolve` saves this report as a checklist and walks the findings in order.
