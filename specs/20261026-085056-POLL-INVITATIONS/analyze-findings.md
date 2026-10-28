# Specification Analysis Report — specs/20261026-085056-POLL-INVITATIONS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261026-085056-POLL-INVITATIONS |
| Report created | 2026-10-26 045918 PM |
| Analysis captured | 2026-10-26 045918 PM |
| Last updated | 2026-10-26 050132 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **C1** · Coverage · MEDIUM · spec.md Edge Cases (new); tasks.md T015  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-26 5:01 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-26: T015 now tests that an address added during EDITING stays `Not sent yet` and is emailed by the first sweep tick after the poll returns to OPEN, and that those already emailed are not.  

  The new edge case (addresses added while the poll is being edited are emailed when it reopens) has no test: T015 checks only that OPEN → EDITING → OPEN sends nothing again.  

  - **Recommendation**: In T015, add: an address added while the poll is EDITING stays `Not sent yet` and is emailed by the first sweep tick after the poll returns to OPEN; those already emailed are not.  

    ➡️ [X] **Accepted**  
    - Gives the edge case, added by the previous round's U2, a test in the suite that already covers the sweep.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · LOW · contracts/ui-contracts.md C3; tasks.md T041, T045  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-26 5:01 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-26: T045 shows a resend refused `429 daily-limit` as `Your daily invitation limit is reached until <time>.` from `retryAt` in the browser's zone; T041 tests it.  

  C3 has the card write the time for a resend refused `429 daily-limit`, and T023 refers to it ("as on a refused resend"), but the resend UI task (T045) and its test (T041) do not show that line.  

  - **Recommendation**: In T045, show a resend's `429 daily-limit` as `Your daily invitation limit is reached until <time>.` from `retryAt` in the browser's zone; test it in T041.  

    ➡️ [X] **Accepted**  
    - Puts the behaviour in the task that builds the resend UI, so it is not left to T023, which comes before it.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · LOW · contracts/api.md A2 (`daily-limit` reason holds no time); tasks.md T014, T040  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-26 5:01 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-26: T014 and T040 assert the exact time-free text `Your daily invitation limit is reached.`  

  The tests check `daily-limit` with `retryAt` but not that `reason`/`error` is the time-free "Your daily invitation limit is reached.", so a server-built time could return unnoticed.  

  - **Recommendation**: In T014 and T040, assert the exact time-free text.  

    ➡️ [X] **Accepted**  
    - Locks in the previous round's A1 decision on the server side.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001–FR-006 (panel, rows, chips, paging, counts, refresh) | Yes | T012, T017, T023, T028, T030–T032 | |
| FR-007 (panel as the stand-alone card) | Yes | T023, T051 | Now points to FR-039 |
| FR-008–FR-012 (add, validate, mailbox key, voter limit, allowlist) | Yes | T014, T019, T022 | |
| FR-013, FR-014 (editable states; no pause) | Yes | T014, T022 | |
| FR-015, FR-016 (when sent) | Yes | T015, T020–T022 | C1 (edits during EDITING) |
| FR-017–FR-023 (wording, dates, zone, privacy link, reminder) | Yes | T008, T013, T016, T018, T025, T042 | |
| FR-024 (time zone from the card) | Yes | T009, T034, T035, T038, T039 | |
| FR-025, FR-026 (daily limit, Not delivered) | Yes | T014, T015, T017, T020, T023, T040 | U1, U2 |
| FR-027–FR-030 (remove, confirm, resend, bans) | Yes | T040–T045 | |
| FR-031–FR-034 (recognized, accepted, vote, sign-in) | Yes | T027, T029, T033, T036, T037 | |
| FR-035–FR-037 (privacy, deletion, Terms) | Yes | T046, T047 | |
| FR-038–FR-040 (stand-alone drafts) | Yes | T001–T004, T025, T051 | |
| SC-001, SC-003, SC-005, SC-008 | Yes | T052 (manual), T014, T028 | |
| SC-002, SC-004, SC-006, SC-007, SC-009 | Yes | T015, T033, T014/T017, T016/T025, T001–T004 | |

## Constitution Alignment Issues

None. The documentation phase (T049), no explanatory comments, and surgical layer changes are all present.

## Unmapped Tasks

None.

## Metrics

- Total Requirements: 49 (40 FR + 9 SC)
- Total Tasks: 52 (4 done)
- Coverage %: 100% (every requirement has at least one task)
- Ambiguity Count: 0
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

- No CRITICAL or HIGH issues: you can go ahead to `/speckit-implement`.
- The three gaps above are small task-wording additions in `tasks.md` (T014, T015, T040, T041, T045). Resolving them first gives the new edge case and the daily-limit line their tests.
- To work through them, run `/speckit-analyze-findings`. It captures this report and resolves the findings one at a time or all at once.
