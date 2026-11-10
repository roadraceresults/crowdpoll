# Specification Analysis Report — specs/20261108-193031-SNACKBAR-HOURGLASS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261108-193031-SNACKBAR-HOURGLASS |
| Report created | 2026-11-09 025308 PM |
| Analysis captured | 2026-11-09 025308 PM |
| Last updated | 2026-11-09 025709 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **A2** · Ambiguity · LOW · spec.md:L84 (FR-010)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-09 2:57 PM  
  **Notes**: Recommendation accepted in file 2026-11-09: Recommendation, spec.md FR-010 now reads "Other notices and other parts of the site MUST NOT change; the Accept Terms card's 'Logged in as' line MUST NOT gain an hourglass."; the requirements document needed no change.  

  "No other notice and no other part of the site MUST change" literally means no change is *required*, not that change is *forbidden*.  
  The intent is a ban.  

  - **Recommendation**: reword FR-010 as "Other notices and other parts of the site MUST NOT change; the Accept Terms card's 'Logged in as' line MUST NOT gain an hourglass."  

    ➡️ [x] **Accepted**  
    - FR-010 then reads as the prohibition it is meant to be, in the same MUST NOT form as FR-011.  
    - Wording only: nothing that gets built or tested changes.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 hourglass at the right end | Yes | T003, T005, T007 | |
| FR-002 7 seconds | Yes | T002 | |
| FR-003 smooth single drain with stream | Yes | T004, T006, T007 | |
| FR-004 notice colours, both themes | Yes | T004, T006, T012 | |
| FR-005 22 × 32, 48 px bar, 12 px gap | Yes | T004, T006, T007 | |
| FR-006 wraps, hourglass keeps size | Yes | T004, T006, T007 | |
| FR-007 reduced motion still | Yes | T009, T011, T012 | |
| FR-008 decorative | Yes | T008, T010, T012 (developer) | |
| FR-009 trigger unchanged | Yes | existing suite, T013 | |
| FR-010 other notices unchanged | Yes | existing suite, T013 | Wording: A2 |
| FR-011 no extra download | Yes | T005, T007 | |
| FR-012 follows the reference look | Yes | T005, T007 | |
| SC-001 every provider login | Yes | T003, T007 (developer) | |
| SC-002 within 0.2 s of fade | Yes | T006, T007 (developer) | |
| SC-003 48 px at ≥ 320 px | Yes | T004, T007 | |
| SC-004 contrast ≥ 3:1 | Yes | T004, T012 | |
| SC-005 reduced motion / same announcement | Yes | T008, T009, T012 | |
| SC-006 no added requests | Yes | T007 | |

## Constitution Alignment Issues

None.
- II and III: only `showSignInNotice` and the snackbar sheet change, with no new file, setting or dependency.
- IV: every FR maps to a test or a quickstart row.
- VI: T005 forbids comments that cite the spec.
- Documentation Deliverables: T015 covers `README.md` and `ARCHITECTURE.md`.

## Unmapped Tasks

None. T001 and T014 are verification tasks, and T016 follows the project's practice.

## Metrics

- Total Requirements: 18 (12 FR and 6 SC)
- Total Tasks: 16
- Coverage: 100% (18 of 18; SC-004 is now fully covered)
- Ambiguity Count: 1
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

- You can go ahead with implementation. A2 is wording only and changes nothing that gets built or tested.
- Fix A2 first: run `/speckit-analyze-findings` to capture it and say "Accept", or edit FR-010 by hand.
- Or skip it: run `/speckit-implement` now.
