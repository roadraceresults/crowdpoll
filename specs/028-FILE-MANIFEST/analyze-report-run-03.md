# Specification Analysis Report — specs/028-FILE-MANIFEST

## Record

| Record | Value |
|---|---|
| Feature directory | specs/028-FILE-MANIFEST |
| Report created | 2026-10-08 15:18 |
| Analysis captured | 2026-10-08 15:18 |
| Last updated | 2026-10-08 15:41 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

## Findings

- [-] **I10** · Inconsistency · LOW · data-model.md (SkippedEntry `reason`, line 37; ListedFile case-folding bullet); research.md R7  
  **Summary:** The data model's reason list is `missing`, `symlink`, `directory`, `not a file`, `unreadable`, and its ListedFile bullet and R7 say a second spelling is merged "keeping the first", with no mention of reporting the other as skipped. The spec (FR-018, edge case) and tasks (T020, T024) now require it. The last resolve pass left these two files alone on purpose.  
  **Recommendation:** Add `duplicate (differs only in letter case)` to the reason list, and one clause to the ListedFile bullet and to R7; edit by hand, since `/speckit-analyze-resolve` does not edit `data-model.md` or `research.md`  

- [X] **G3** · Coverage Gap · LOW · spec.md User Stories, FR-018  
  **Summary:** FR-018 has no acceptance scenario in any user story; it appears only as an edge case and in tasks T020 and T024, although the case-insensitive Windows 11 machine is the developer's own.  
  **Recommendation:** Add a scenario to User Story 3: given a case-insensitive file system and a file listed as both `designdocs/a.md` and `designDocs/a.md`, when counted, then it is one file and the other spelling is skipped with the reason `duplicate (differs only in letter case)`  
  **Resolution:** added scenario 7 to User Story 3 for the duplicate spelling under FR-018; no task change needed, T020 and T024 already cover it (spec.md) (2026-10-08 15:37).

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 | Yes | T014, T029, T030 | |
| FR-002 | Yes | T029, T030, T032 | |
| FR-003 | Yes | T010 | |
| FR-004 | Yes | T005, T010 | |
| FR-005 | Yes | T011, T014, T021 | |
| FR-006 | Yes | T005, T008 | |
| FR-007 | Yes | T006, T008 | |
| FR-008 | Yes | T006, T008 | |
| FR-009 | Yes | T019, T022, T023 | |
| FR-010 | Yes | T013, T026, T027 | |
| FR-011 | Yes | T007, T012 | |
| FR-012 | Yes | T012 | |
| FR-013 | Yes | T012 | |
| FR-014 | Yes | T016, T017 | |
| FR-015 | Yes | T014 | |
| FR-016 | Yes | T002 | |
| FR-017 | Yes | T007, T008 | |
| FR-018 | Yes | T020, T024 | see G3 |
| FR-019 | Yes | T003 | |
| FR-020 | Yes | T008, T009, T016, T019 to T021, T026, T029 | |
| SC-001 | Yes | T015, T036, quickstart §2b | |
| SC-002 | Yes | T009, T020, T021, T024 | duplicates now counted as skipped |
| SC-003 | Yes | T009 | |
| SC-004 | Yes | T007, T009, T016 | |
| SC-005 | Yes | T008, T019, T021 | |
| SC-006 | Yes | T026, T028 | |
| SC-007 | Yes | T029, T032 | |
| SC-008 | Yes | T007, T012 | |

## Constitution Alignment Issues

None. Principles I to VI pass; the documentation phase is Phase 9 (T037 to T039).

## Unmapped Tasks

None without a purpose; T001, T033 to T036 and T039 are baseline, type-check, constitution, final-walk and agent-context tasks.

## Metrics

- Total requirements: 28 (20 functional, 8 success criteria)
- Total tasks: 39, IDs T001 to T039 with no gap or duplicate
- Coverage (requirements with at least one task): 100% (28 of 28)
- Ambiguity count: 0
- Duplication count: 0
- Critical issues: 0; High: 0; Medium: 0; Low: 2

## Next Actions (as reported)

No CRITICAL, HIGH or MEDIUM issues remain; proceed to `/speckit-implement`. The two LOW items do not block it:
- I10: add the `duplicate (differs only in letter case)` reason to `data-model.md` and `research.md` R7 by hand, so the design documents match FR-018.
- G3: add one acceptance scenario to User Story 3 in `spec.md`, by hand or with `/speckit-analyze-resolve`.
