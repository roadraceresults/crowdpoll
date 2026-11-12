# Specification Analysis Report — specs/20261112-173521-ADMIN-SEARCH-CHECKBOXES

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261112-173521-ADMIN-SEARCH-CHECKBOXES |
| Report created | 2026-11-12 055018 PM |
| Analysis captured | 2026-11-12 055018 PM |
| Last updated | 2026-11-12 055838 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · MEDIUM · spec.md Assumptions (last bullet); plan.md Constitution Check; research.md R3; tasks.md T001–T002  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md plan.md Updated: 2026-11-12 5:58 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation, spec.md Assumptions now name the two partial indexes as the only database change; plan.md's post-design re-check says it was reconciled.  

  The spec says "No new setting, cookie, browser storage key or database change is needed", but the plan adds migration `022-admin-search-flags` with two partial indexes.  

  - **Recommendation**: Reword the assumption: "No new setting, cookie or browser storage key; the only database change is two partial indexes (no new column or data change)."  

    ➡️ [X] **Accepted**  
    - The spec then states what the plan builds; the plan's Constitution Check note about reconciling it is updated to say it was reconciled.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · spec.md SC-004  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-12 5:58 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation, spec.md SC-004 now reads: a search with either box ticked, alone or with any other filter, is answered from an index like every other filter.  

  "as fast as a search on another filter… (no noticeable delay)" has no measurable target; the plan turns it into "answered from an index" (R3, T013).  

  - **Recommendation**: Reword SC-004 so it can be checked: "a search with either box ticked, alone or with any other filter, is answered from an index like every other filter".  

    ➡️ [X] **Accepted**  
    - SC-004 becomes exactly what T013's index-combination test verifies.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · LOW · spec.md Edge Cases (periodic refresh); tasks.md  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-12 5:58 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation A, tasks.md T014 now also checks that the periodic refresh still sends the submitted parameters after the boxes are unticked.  

  The edge case "the periodic refresh re-runs the search with the boxes as they were when it was submitted" has no task or test. It is inherited from `activeSearch` in `adminList.js`.  

  - **Recommendation A** _(recommended)_: Extend T014 to check that a refresh after unticking still sends the submitted parameters.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: the edge case is tested for the new parameters, at the cost of a few lines in a test already being written.  
    - <u>Cons</u>: it re-tests behaviour `activeSearch` already gives every control.  

  - **Recommendation B**: Note in tasks.md that the refresh behaviour is inherited and covered by the existing refresh tests.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no extra test.  
    - <u>Cons</u>: nothing checks that the new parameters go through the same path.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage Gap · LOW · spec.md FR-009; tasks.md T004, T018  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-12 5:58 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation A, tasks.md T018 now states that quickstart step 6 verifies FR-009 (48 px targets, focus ring, narrow-screen stacking).  

  The 48 px targets, focus ring and narrow-screen stacking are implemented in CSS (T004) but checked only manually (quickstart step 6); jsdom cannot measure layout.  

  - **Recommendation A** _(recommended)_: Accept the manual check, and state in T018 that FR-009 is verified by quickstart step 6.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: the same way the radio groups' sizes were verified; `m3-assets.test.ts` still guards the tokens.  
    - <u>Cons</u>: a later CSS change could shrink the targets unnoticed.  

  - **Recommendation B**: Add a client test asserting the classes and `role="group"` that the CSS relies on (extending T007), and a CSS-text check that `.admin-checkbox` sets `min-height:48px`.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: an automated guard on the selectors and the 48 px rule.  
    - <u>Cons</u>: tests the stylesheet's text, not the rendered size.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · LOW · tasks.md T005 (Foundational) vs T010/T014 (US1/US2)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-12 5:58 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation A, tasks.md T005 moved from Phase 2 into US1 after its test T010, keeping its id; the dependency and parallel notes updated.  

  The form-reader change T005 is implemented before its tests T010/T014, against the "tests first" rule stated in the tasks header.  

  - **Recommendation A** _(recommended)_: Move T005 into US1 after T010 (renumbering nothing: T005 keeps its id, placed after T010 with the dependency noted).  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: the tasks follow their own test-first rule.  
    - <u>Cons</u>: a task id out of numeric order in the file.  

  - **Recommendation B**: Keep T005 in Phase 2 and note that the client wiring is one line, tested by T010/T014.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no reordering.  
    - <u>Cons</u>: an exception to the stated rule.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 row and labels | Yes | T003, T007 | |
| FR-002 unticked = no filter | Yes | T005, T008, T010 | |
| FR-003 line graph filter | Yes | T008, T009 | |
| FR-004 custom colors filter | Yes | T011, T012 | |
| FR-005 AND combination | Yes | T008, T011, T014 | |
| FR-006 saved values only | Yes | T011 (pending_update case), T012 | |
| FR-007 parameters and validation | Yes | T008, T009, T011 | |
| FR-008 API description | Yes | T006, T015 | |
| FR-009 look, 48 px, focus, narrow | Partial | T004, T018 (manual) | C1 |
| FR-010 not remembered | Yes | T007 (unticked at load), T005 (no storage) | |
| FR-011 tests | Yes | T007, T008, T010, T011, T013–T015 | |
| SC-001 one search | Yes | T009, T012 | |
| SC-002 exact results | Yes | T008, T011 | |
| SC-003 unchanged when unticked | Yes | T008 | |
| SC-004 speed | Yes | T001, T013 | A1 |

## Constitution Alignment Issues

None. The documentation phase (T016, T017) is present.

## Unmapped Tasks

None. T001 and T002 serve SC-004 and the index-combination test, and T018 is validation.

## Metrics

- Total Requirements: 15 (11 FR + 4 SC)
- Total Tasks: 18
- Coverage %: 100% (FR-009 partly manual)
- Ambiguity Count: 1
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

No CRITICAL or HIGH issues, so implementation may proceed. I1 is worth resolving so the spec matches the migration; the LOW items are optional refinements. `/speckit-analyze-findings` captures them next.
