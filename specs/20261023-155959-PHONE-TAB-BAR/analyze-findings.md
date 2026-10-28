# Specification Analysis Report — specs/20261023-155959-PHONE-TAB-BAR

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261023-155959-PHONE-TAB-BAR |
| Report created | 2026-10-23 093900 PM |
| Analysis captured | 2026-10-23 093900 PM |
| Last updated | 2026-10-23 094634 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

This is the second analysis of the feature; the first, with its six resolved findings, is `analyze-findings-20261023-213900-PM.md`.

## Findings

### **U1** · Underspecification · MEDIUM · research.md R6; tasks.md T020 (`tabBar.scrollLeft += event.deltaY`); R4 / T015 (`#tabBar{ scroll-behavior:smooth; }`); contracts/ui-contracts.md C4  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md contracts/ui-contracts.md Updated: 2026-10-23 9:46 PM  
  **Notes**: Recommendation accepted in file 2026-10-23: Recommendation A. tasks.md T020 now keeps a running `wheelTarget` (clamped with `clampScroll`, compared with its start to decide whether the row can move, cleared on `scrollend` and at the top of `beginDrag`) and T019 gains step (a2): a second tick while the stubbed `scrollLeft` sits mid-animation lands at 80, and after `scrollend` the target restarts from `scrollLeft`; research.md R6 describes the target and names the instant-write alternative; contracts/ui-contracts.md C4 says each tick is added to the previous tick's target.  

  The wheel handler adds each tick's delta to `scrollLeft`, but with `scroll-behavior:smooth` on the row a `scrollLeft` write starts an animation and the next tick reads a mid-animation position, so a quick series of ticks moves the row less than the sum of their deltas and the "can still move" test is made against a stale position. jsdom does not animate, so T019 cannot see it.  

  - **Recommendation A** _(recommended)_: In T020 (and R6, C4) keep a running wheel target: `wheelTarget = clamp((pendingTarget ?? tabBar.scrollLeft) + deltaY, 0, maxScroll())`, test "can move" and prevent the default against that target, write it to `scrollLeft`, and clear it on `scrollend` (or on the next `pointerdown`); T019 (a) adds two consecutive `deltaY: 40` ticks → `80`.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: every tick counts in full and the row still glides, so the wheel feels like the browser's own smooth wheel scrolling; the end-of-row check is made against where the row is going, not where it is mid-animation.  
    - <u>Cons</u>: one more variable and a `scrollend` listener in `tabBarScroll.js`; `scrollend` is recent (Chrome 114, Firefox 109, Safari 2024), so the `pointerdown` reset is the fallback where it is missing.  

  - **Recommendation B**: Have the wheel scroll instantly: in T020 add the `is-dragging` class before the `scrollLeft` write and remove it right after, so the write uses `scroll-behavior:auto`; R6 and C4 say the wheel moves the row at once, tick by tick.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: two lines; every tick lands in full; no new state and no `scrollend`.  
    - <u>Cons</u>: the wheel jumps instead of gliding, unlike a tap or the keyboard; it borrows a class that means something else and briefly sets `cursor:grabbing`.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 one-line 48 px tab, 16 px icon | ✓ | T006, T010 | |
| FR-002 active marker, guest greying | ✓ | T010 | base rules kept; existing 026 tests cover `aria-disabled` |
| FR-003 no arrows | ✓ | T007, T009, T010, T011 | |
| FR-004 32 px fade, edge rules | ✓ | T003, T005, T006, T010 | |
| FR-005 fades update on scroll/resize | ✓ | — | `tabs.js` lines 1045–1047 already listen; T011 removes only `tabBarScroll.js`'s own listeners |
| FR-006 native touch scrolling | ✓ | T018, T020 | `touch-action:pan-x` kept by T010 |
| FR-007 no snapping | ✓ | T006 | resolved C1 |
| FR-008 chosen tab fully in view, smooth | ✓ | T012–T017 | page load: existing `setActiveButton` call, smooth by T015 |
| FR-009 reduced motion instant | ✓ | T012, T015 | |
| FR-010 mouse/pen drag, no select after drag | ✓ | T018, T020 | existing drag tests kept |
| FR-011 wheel | ✓ | T019, T020 | see U1 |
| FR-012 keyboard | ✓ | T013, T016 | resolved I2 |
| FR-013 swapped buttons | ✓ | T021, T022 | |
| FR-014 desktop unchanged | ✓ | T003, T005, T019(d), T028 | |
| FR-015 nothing else changes | ✓ | T027 | |
| SC-002 no arrow, fade exactly at waiting edges | ✓ | T006, T007 | |
| SC-003 fully visible, smooth or instant | ✓ | T013, T028 | resolved U1 (first run) |
| SC-005 desktop as before | ✓ | T003, T005, T028 | |

## Constitution Alignment Issues

None. No new file or dependency (II); edits confined to the regions the feature changes (III); every contract has a named test (IV); no comments in changed code (VI); README/ARCHITECTURE regeneration is T026 (Documentation Deliverables).

## Unmapped Tasks

T023, T024, T025 (the amendment notes in the 030/031 documents and CLAUDE.md) map to no FR; they are deliberate cross-cutting documentation, as 031 did for 030.

## Metrics

- Total Requirements: 18 (15 FR + 3 buildable SC)
- Total Tasks: 28
- Coverage %: 100% (18/18)
- Ambiguity Count: 0
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

No CRITICAL issue; you may proceed to `/speckit-implement`. The one MEDIUM item, U1, is worth settling first because it decides how T020 is written and what T019 asserts: `/speckit-analyze-findings` captures this report (backing up the resolved `analyze-findings.md`) and applies the accepted recommendation to research.md R6, contracts C4 and tasks.md T019/T020.
