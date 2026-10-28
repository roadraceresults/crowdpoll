# Specification Analysis Report — specs/026-HOME-PAGE-TABS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/026-HOME-PAGE-TABS |
| Report created |  |
| Analysis captured |  |
| Last updated | 2026-10-05 15:11 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.
The first round's checklist (nine findings, all resolved) is kept in `analyze-report.round1.md`.

## Findings

- [X] **I1** · Inconsistency · MEDIUM · tasks T010/T012 vs research R2, contracts/api.md (`GET /` "not shown" list), spec FR-014/FR-017  
  **Summary:** The `View Polls` rule was added only to the tasks. The R2 outcome table, the `contracts/api.md` redirect table and the spec's FR-017 "not shown" list don't include "caller lacks `View Polls`". `GET /api/me/polls/:pid` is also meant to answer `404` for it.  
  **Recommendation:** Add "caller lacks `View Polls`" to the "not shown" row in R2 and `contracts/api.md`. Add it to FR-017's list, with one sentence in the spec's Assumptions citing 025.
  **Resolution:** `View Polls` rule added to research R2, contracts/api.md, spec FR-017 and Assumptions (2026-10-05 15:11)

- [X] **U1** · Underspecification · MEDIUM · tasks T012, T018; research R9  
  **Summary:** T018 says `GET /api/me/polls/:pid` uses "the same predicate as the link route", but `resolveSharedLink` (T012) also writes the `linked` row. A read-only fetch must not record a view. Neither task says to split the decision from the write.  
  **Recommendation:** In T012, export a pure `decideSharedLink(db, caller, pid)` that returns `{ landing, recordView }`. `resolveSharedLink` calls it and writes the view when `recordView` is true. T018 calls only `decideSharedLink`. Add a test that the fetch route never creates a `linked` row to T010.
  **Resolution:** T012 now splits `decideSharedLink` (pure) from `resolveSharedLink`; T018 uses only the pure one; T010 asserts the fetch writes nothing; R2 and plan structure updated (2026-10-05 15:11)

- [X] **I2** · Inconsistency · LOW · plan.md Technical Context ("~8 new test files") vs research R12 / tasks (10 new test files)  
  **Summary:** The new-test-file count is out of date after the previous fixes.  
  **Recommendation:** Change the plan's Scale/Scope line to "~10 new test files".
  **Resolution:** plan.md Scale/Scope now says "~10 new test files" (2026-10-05 15:11)

## Coverage Summary

| Requirement | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001–FR-006 | Yes | T002–T009, T027–T031 | |
| FR-007–FR-013 | Yes | T002, T022–T026, T045 | |
| FR-014–FR-019 | Yes | T010, T012–T013, T018–T019, T033–T036, T055 | See I1, U1 |
| FR-020–FR-024 | Yes | T011, T013–T017 | OAuth case is now in T011 |
| FR-025–FR-028 | Yes | T041–T049 | |
| FR-029–FR-031 | Yes | T037–T040, T029 | |
| FR-032–FR-033 | Yes | T012, T022, T024 | |
| SC-001–SC-008 | Yes | tests above; SC-008 via T056 | |

## Constitution Alignment Issues

None reported.

## Unmapped Tasks

None reported. (T001, T053 and T054 are baseline, walkthrough and report tasks; T055 and T056 map to FR-014 and SC-008.)

## Metrics

- Requirements: 33 FR and 8 SC
- Tasks: 56
- Coverage: 100% of FR and of the buildable SC
- Ambiguities: 0 · Duplications: 0 · Critical issues: 0

## Next Actions (as reported)

- No CRITICAL issues. I1 and U1 are small edits best made before implementation (they touch T012 and T018, in the MVP phase). I2 is a one-line fix.
- Run `/speckit-analyze` again after resolving, then `/speckit-implement`.
