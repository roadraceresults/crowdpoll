# Specification Analysis Report — specs/20261109-083912-POPULATE-OLDEST-AGE

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261109-083912-POPULATE-OLDEST-AGE |
| Report created | 2026-11-09 101814 AM |
| Analysis captured | 2026-11-09 101814 AM |
| Last updated | 2026-11-09 114701 AM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **C1** · Coverage · MEDIUM · spec.md FR-005; tasks.md T003, T004  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-09 11:47 AM  
  **Notes**: Recommendation accepted in file 2026-11-09: in tasks.md, T003 now asserts `launched_at` with `start_at` and `created_at`; T004 asserts that `start_at` and `launched_at` are the first kept day after the limited rerun and that `created_at` keeps the first run's value (FR-005 added to its references).  

  FR-005 makes the first kept day the poll's start **and launch** date, but T003 asserts only `start_at` and `created_at`, and the rerun case T004 checks neither date (on a rerun, `launched_at` is set separately: `launched_at = start_at`).  

  - **Recommendation**: In T003, also assert `launched_at`; in T004, assert that `start_at` and `launched_at` are the first kept day after the limited rerun, while `created_at` keeps its original value.  

    ➡️ [x] **Accepted**  
    - Both paths that set the dates (create, and rerun through `updatePoll` plus the `launched_at = start_at` update) are then checked against FR-005.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage · LOW · spec.md Edge Cases ("out of date order")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-09 11:47 AM  
  **Notes**: Recommendation accepted in file 2026-11-09: Recommendation A, T002 in tasks.md notes that the existing `parsePollData` test "sorted data points" covers out-of-order files and that `keepRecent` relies on it.  

  No task covers a file whose data points are out of date order; `parsePollData` already sorts them, so this is a test gap only.  

  - **Recommendation A** _(recommended)_: Note in T002 that the existing `parsePollData` test "sorted data points" already covers the order, and that `keepRecent` relies on it.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: no duplicate test; the sort is already asserted where it happens.  
    - <u>Cons</u>: the edge case is covered indirectly, by two tests together.  

  - **Recommendation B**: Add to T003 an unsorted copy of the fixture with a limit, asserting that the kept points are the most recent by date.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the edge case has its own end-to-end assertion.  
    - <u>Cons</u>: a second database-backed run in the test file for a behaviour already tested.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · spec.md SC-001  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-09 11:47 AM  
  **Notes**: Recommendation accepted in file 2026-11-09: SC-001 in spec.md now reads "replays at most N + 1 (31) data points, and writes votes only for them"; the time clause is gone.  

  "takes a correspondingly small fraction of the full replay's time" is not measurable, and no task measures time.  

  - **Recommendation**: Reword SC-001 to its countable part: "replays at most N + 1 data points (and writes votes only for them)".  

    ➡️ [x] **Accepted**  
    - The run time follows from the number of points replayed, which T003 and T015 already check.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · LOW · tasks.md Dependencies (US2)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-09 11:47 AM  
  **Notes**: Recommendation accepted in file 2026-11-09: the US2 dependency in tasks.md now reads "after T006 (a limit is honoured), since T009 runs with a limit".  

  "T009 relies on the `Kept` line existing to assert its absence" is not a real dependency; T009's larger-limit case needs `oldestAgeInDays` to be honoured (T006).  

  - **Recommendation**: Reword the US2 dependency to "after T006 (a limit is honoured), since T009 runs with a limit".  

    ➡️ [x] **Accepted**  
    - The execution order stays the same; only the stated reason changes.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · LOW · research.md R5; contracts/data-file.md D3; tasks.md T007  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ research.md contracts/data-file.md tasks.md Updated: 2026-11-09 11:47 AM  
  **Notes**: Recommendation accepted in file 2026-11-09: R5 (research.md), D3 (contracts/data-file.md) and T007 (tasks.md) all place the `Kept` line "after the `Target:` line and before the first write".  

  R5 and D3 place the `Kept` line "right after the `Target:` line", T007 "before the first write"; the creator lookup comes between the two. Both hold, but the wording differs and T003 asserts "after the `Target:` line".  

  - **Recommendation**: Align R5, D3 and T007 on "after the `Target:` line and before the first write".  

    ➡️ [x] **Accepted**  
    - One placement rule in all three documents; a missing creator still errors out before the line.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 key optional, absent = all | ✅ | T001, T008, T009 | |
| FR-002 whole number ≥ 0, refused before writing | ✅ | T010, T011 | |
| FR-003 measured after moving, inclusive | ✅ | T002, T005, T006 | |
| FR-004 only kept points replayed | ✅ | T003, T006 | |
| FR-005 start/launch/creation dates | ⚠️ | T003, T006 | launch date not asserted (C1) |
| FR-006 12-month note on kept span | ✅ | T003, T006 | |
| FR-007 kept-points line | ✅ | T003, T007, T009 | |
| FR-008 rerun leaves no older votes | ✅ | T004 | |
| FR-009 folder command unchanged | ✅ | T012, T015 | |
| FR-010 README | ✅ | T013 | |
| FR-011 tests | ✅ | T002–T004, T008–T010 | |
| SC-001 fewer points replayed | ✅ | T003, T015 | time not measured (A1) |
| SC-002 no-key files unchanged | ✅ | T009, T014 | |
| SC-003 refusals leave DB unchanged | ✅ | T010, T015 | |
| SC-004 folder repopulates one file | ✅ | T012, T015 | manual |

## Constitution Alignment Issues

None reported.

## Unmapped Tasks

None reported. T014 and T015 are verification tasks covering every requirement.

## Metrics

- Total Requirements: 15 (11 FR, 4 SC)
- Total Tasks: 15
- Coverage: 100% (15/15 with ≥ 1 task; FR-005 partly asserted)
- Ambiguity Count: 1
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

No critical issues. The one MEDIUM and four LOW findings can be resolved here in `/speckit-analyze-findings`, then `/speckit-implement`.
