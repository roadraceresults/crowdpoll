# Specification Analysis Report — specs/20261023-155959-PHONE-TAB-BAR

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261023-155959-PHONE-TAB-BAR |
| Report created | 2026-10-23 061743 PM |
| Analysis captured | 2026-10-23 061743 PM |
| Last updated | 2026-10-23 092718 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · MEDIUM · spec.md Edge Cases ("The All tabs menu is open and the visitor swipes the row: the menu closes"); src/public/tabBarScroll.js `closeMenuOnOutsideClick`; tasks.md (no task)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-23 9:27 PM  
  **Notes**: Recommendation accepted in file 2026-10-23: Recommendation A, the edge case in spec.md now reads "the menu stays open; a tap outside closes it, as today".  

  The menu closes on a click outside; a touch swipe is a scroll gesture and produces no click, so today it would stay open, and no task adds a scroll-to-close.  

  - **Recommendation A** _(recommended)_: Reword the edge case to "a tap outside closes it, as today".  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: no code; the spec describes what the menu already does; a swipe with the menu open is rare, since a tap anywhere closes it.  
    - <u>Cons</u>: a visitor who swipes with the menu open sees it stay until they tap.  

  - **Recommendation B**: Keep the edge case and add to T020 a `scroll` listener on `#tabBar` that calls `setMenuOpen(false, false)` while the menu is open, with a test in `tests/client-tab-bar-scroll.test.ts`.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the menu never lingers over a moving row.  
    - <u>Cons</u>: more code in the script the feature is shrinking; a smooth programmatic scroll (choosing a menu item) also fires `scroll`, so the listener must not run during the close it causes.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · spec.md SC-003 ("arriving within 500 ms"); plan.md research R4  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md tasks.md Updated: 2026-10-23 9:27 PM  
  **Notes**: Recommendation accepted in file 2026-10-23: Recommendation A, SC-003 in spec.md now reads "arriving within the browser's smooth-scroll animation, about half a second, or at once with reduced motion"; T028 in tasks.md names SC-003 among its manual checks.  

  `scroll-behavior:smooth` has no duration; the browser chooses it, so 500 ms is not something the implementation controls or a test can assert.  

  - **Recommendation A** _(recommended)_: Reword SC-003 to "the row arrives within the browser's smooth-scroll animation, about half a second, or at once with reduced motion"; keep the check manual in T028.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the criterion states what can be observed and what the implementation decides (smooth or instant).  
    - <u>Cons</u>: no fixed number to time against.  

  - **Recommendation B**: Keep the 500 ms and have T028 time it on a real phone; accept that the number is the browser's.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: a number to check in the manual pass.  
    - <u>Cons</u>: a slower browser fails a criterion the code cannot change; the wording still implies the implementation sets the duration.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · LOW · spec.md FR-012 ("focus moving a tab into view … MUST be unchanged") vs User Story 2 scenario 3, contracts/ui-contracts.md C3, tasks.md T016  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-23 9:27 PM  
  **Notes**: Recommendation accepted in file 2026-10-23: FR-012 in spec.md now reads "Keyboard behaviour (arrow keys between tabs, Enter and Space) MUST be unchanged; the newly focused tab scrolls into view as a tapped one does (FR-008)."  

  FR-012 lists the focus scroll as unchanged while US2 and C3 make it smooth via `preventScroll` + `scrollIntoView`.  

  - **Recommendation**: Reword FR-012: "Keyboard behaviour (arrow keys between tabs, Enter and Space) MUST be unchanged; the newly focused tab scrolls into view as a tapped one does (FR-008)."  

    ➡️ [x] **Accepted**  
    - The keys and their order stay as they are; only the motion of the scroll is described by FR-008, so the two requirements no longer disagree.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · LOW · research.md R2 (`0 var(--tab-fade, 16px)`), contracts/ui-contracts.md C2 (`scroll-padding: 0 32px`), tasks.md T006/T010 and CLAUDE.md (`0 var(--tab-fade)`)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ research.md contracts/ui-contracts.md Updated: 2026-10-23 9:27 PM  
  **Notes**: Recommendation accepted in file 2026-10-23: R2 in research.md and C2 in contracts/ui-contracts.md now both say `scroll-padding:0 var(--tab-fade)`, as tasks.md T006/T010 and CLAUDE.md already did.  

  Three spellings of the same declaration.  

  - **Recommendation**: Use `scroll-padding:0 var(--tab-fade)` everywhere (the block sets the variable); fix R2 and C2.  

    ➡️ [x] **Accepted**  
    - The tasks and CLAUDE.md already say `var(--tab-fade)`; the research and the contract are brought to the same spelling, so the implementer and the sheet test agree.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage · LOW · spec.md FR-007 (no snapping); tasks.md T006  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-23 9:27 PM  
  **Notes**: Recommendation accepted in file 2026-10-23: T006 in tasks.md now also asserts no `scroll-snap` in the 900 px tab block, so FR-007 has a test.  

  No assertion that the row has no `scroll-snap-type`.  

  - **Recommendation**: Add "and no `scroll-snap`" to T006's list of absent text.  

    ➡️ [x] **Accepted**  
    - One more string in an existing assertion; FR-007 then has a test.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · tasks.md T012 ("or the two declarations in that rule")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-23 9:27 PM  
  **Notes**: Recommendation accepted in file 2026-10-23: T012 in tasks.md now pins `#tabBar.is-dragging{ cursor:grabbing; scroll-behavior:auto; }` and drops "(or the two declarations in that rule)", matching T015.  

  Two acceptable forms for the `is-dragging` rule leave the test's expected string open.  

  - **Recommendation**: Pin one: `#tabBar.is-dragging{ cursor:grabbing; scroll-behavior:auto; }`, matching T015.  

    ➡️ [x] **Accepted**  
    - T012 and T015 then name the same rule, so the test written first is the one the implementation satisfies.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 one-line 48 px tab, 16 px icon | ✓ | T006, T010 | |
| FR-002 active marker, guest greying | ✓ | T010 | base rules kept; existing 026 tests cover `aria-disabled` |
| FR-003 no arrows | ✓ | T007, T009, T010, T011 | |
| FR-004 32 px fade, edge rules | ✓ | T003, T005, T006, T010 | |
| FR-005 fades update on scroll/resize | ✓ | — | unchanged `tabs.js` listeners; no task needed |
| FR-006 native touch scrolling | ✓ | T018, T020 | |
| FR-007 no snapping | ✗ | — | see C1 |
| FR-008 chosen tab fully in view, smooth | ✓ | T012–T017 | |
| FR-009 reduced motion instant | ✓ | T012, T015 | |
| FR-010 mouse/pen drag, no select after drag | ✓ | T018, T020 | existing drag tests kept |
| FR-011 wheel | ✓ | T019, T020 | |
| FR-012 keyboard | ✓ | T013, T016 | see I2 |
| FR-013 swapped buttons | ✓ | T021, T022 | |
| FR-014 desktop unchanged | ✓ | T003, T005, T019(d), T028 | existing 026 test pins 64 px / 24 px |
| FR-015 nothing else changes | ✓ | T027 | |
| SC-002 no arrow, fade exactly at waiting edges | ✓ | T006, T007 | |
| SC-003 fully visible, timing | ✓ | T013, T028 | see U1 |
| SC-005 desktop as before | ✓ | T003, T005, T028 | |

## Constitution Alignment Issues

None. No new file or dependency (II); edits confined to the regions the feature changes (III); every contract has a named test (IV); no comments in changed code (VI); README/ARCHITECTURE regeneration is T026 (Documentation Deliverables).

## Unmapped Tasks

T023, T024, T025 (the amendment notes in the 030/031 documents and CLAUDE.md) map to no FR; they are deliberate cross-cutting documentation, as 031 did for 030.

## Metrics

- Total Requirements: 18 (15 FR + 3 buildable SC)
- Total Tasks: 28
- Coverage %: 94% (17/18; FR-007 lacks an assertion)
- Ambiguity Count: 1
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

No CRITICAL issue, so you may proceed to `/speckit-implement`. The two MEDIUM items are worth settling first: I1 (decide whether a swipe closes the menu) and U1 (SC-003's 500 ms). The four LOW items are one-line edits to spec.md, research.md, contracts/ui-contracts.md and tasks.md. `/speckit-analyze-findings` captures this report and applies the accepted recommendations.
