# Specification Analysis Report — specs/20261027-133129-SINGLE-EMAIL-INVITE

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261027-133129-SINGLE-EMAIL-INVITE |
| Report created | 2026-10-27 040140 PM |
| Analysis captured | 2026-10-27 040140 PM |
| Last updated | 2026-10-27 040422 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **A1** · Ambiguity · LOW · tasks.md T038; research.md R6 step 4  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md Updated: 2026-10-27 4:04 PM  
  **Notes**: Recommendation accepted in file 2026-10-27: Recommendation A. T038 now raises `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW` from `2` to `5` (per the 15-minute window); research.md R6 step 4 names the same value.  

  T038 raises `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW` "to the value the developer chooses". The value is undecided, so nothing can confirm the task is done.  

  - **Recommendation A** _(recommended)_: Write the number into T038 and R6 (for example `5` per 15 minutes).  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: T038 becomes checkable; production's limit is recorded beside the reason for it.  
    - <u>Cons</u>: Picks a number now; to use a value other than `5`, write it under Developer Resolution C.  

  - **Recommendation B**: Leave the value to deployment: T038 becomes "set the value in `.do/app.yaml` before the feature ships" and stays open until it is set.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: The value can follow real traffic.  
    - <u>Cons</u>: The task can still be ticked without a decided value.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · LOW · tasks.md T013 vs research.md R6 steps 3–5  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-27 4:03 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-27: T013's allowlist case now reads "an address outside `ENV_ALLOWED_EMAILS`, with the Terms accepted → `403 not-launched`".  

  Continue now checks the Terms before the allowlist. T013's "outside `ENV_ALLOWED_EMAILS` → `403 not-launched`" case doesn't say the request carries the Terms. Without them it gets `400 terms-required` instead.  

  - **Recommendation**: Add "with the Terms accepted" to that case in T013.  

    ➡️ [X] **Accepted**  
    - The test then reaches the allowlist check, as R6's order requires.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **F1** · Format · LOW · tasks.md lines 174–175  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-27 4:04 PM  
  **Notes**: Recommendation accepted in file 2026-10-27: Recommendation A. tasks.md: the T037 and T038 lines swapped, so the IDs read in order; "T037 last" in Dependencies keeps the run order.  

  T038 sits above T037, so the IDs are out of order. The dependency note ("T037 last") makes the order clear.  

  - **Recommendation A** _(recommended)_: Swap the two lines, keeping their IDs.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: IDs read in order.  
    - <u>Cons</u>: T037, the final run, is no longer the last line of the phase; the note "T037 last" carries the order.  

  - **Recommendation B**: Leave them as they are.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: The final run stays the last line, where it is done.  
    - <u>Cons</u>: IDs out of order.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001–FR-002 | Yes | T002, T006, T008 | |
| FR-003 | Yes | T002, T006 | |
| FR-004 | Yes | T002, T031 | |
| FR-005 | Yes | T002, T006, T013 | logs now tested |
| FR-006–FR-007 | Yes | T003, T007, T008 | |
| FR-008 | Yes | T012, T031 | |
| FR-009–FR-011 | Yes | T012, T014, T019 | |
| FR-012 | Yes | T021, T023 | |
| FR-013 | Yes | T027–T030 | |
| FR-014 | Yes | T033 | |
| FR-015–FR-016 | Yes | T002, T017, T031 | list now matches data-model.md |
| FR-017 | Yes | T013, T016, T038 | limit order stated; value open (A1) |
| FR-018 | Yes | T012, T016 | |
| FR-019 | Yes | T013 | |
| FR-020 | Yes | T021 | |
| FR-021 | Yes | T025, T026 | |
| FR-022 | Yes | T012 | now asserted |
| FR-023 | Yes | T031, T037 | |
| FR-024 | Yes | T003, T037 | |
| SC-001–SC-003 | Yes | T012, T014, T021 | |
| SC-004 | Yes | T025 | |
| SC-005–SC-006 | Yes | T031 | |

## Constitution Alignment Issues

None. The new failure path is logged with a masked address and fails safely, which satisfies principle V.

## Unmapped Tasks

None. T001 and T037 are run steps.

## Metrics

- Total requirements: 30 (24 functional requirements, 6 success criteria)
- Total tasks: 38
- Coverage: 100%, with no partial coverage left
- Ambiguities: 1
- Duplications: 0
- Critical issues: 0

## Next Actions (as reported)

There are no critical, high or medium findings, so you can go ahead with `/speckit-implement`. The one worth settling first is A1: the limit's new value. I1 is a one-phrase test fix, and F1 is cosmetic.
