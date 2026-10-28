# Specification Analysis Report — specs/028-FILE-MANIFEST

## Record

| Record | Value |
|---|---|
| Feature directory | specs/028-FILE-MANIFEST |
| Report created | 2026-10-08 14:55 |
| Analysis captured | 2026-10-08 14:55 |
| Last updated | 2026-10-08 15:15 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

## Findings

- [X] **I7** · Inconsistency · MEDIUM · spec.md SC-002; data-model.md (SkippedEntry); contracts/reports.md identity 4; quickstart.md §2; FR-018  
  **Summary:** SC-002 says files counted plus files skipped equal the files git listed. On a case-insensitive file system FR-018 drops the second spelling of a file listed twice (`designdocs/x` and `designDocs/x`): it is neither counted nor skipped, so the identity fails on the developer's own Windows machine.  
  **Recommendation:** Record each dropped spelling as a skipped entry with the reason `duplicate (differs only in letter case)`, add it to the data model's reason list, and say so in FR-018; the identity then holds everywhere  
  **Resolution:** FR-018 and the edge case now report the dropped spelling as skipped with the reason `duplicate (differs only in letter case)`; T020 asserts it and T024 records it; the plan's function table says so (spec.md, tasks.md, plan.md). data-model.md and research.md R7 still need the matching line. (2026-10-08 14:57)

- [X] **I8** · Inconsistency · MEDIUM · tasks.md T009 and T026; quickstart.md §3  
  **Summary:** T009 builds the quickstart §3 fixture, whose `.gitignore` holds only `dist/`; its expected table has `(none)` at 1 line. T026 now needs the fixture's `.gitignore` to list `/manifests/`. If the shared fixture gets that line, `(none)` becomes 2 lines and T009's and §3's expected tables are wrong; the task does not say which fixture T026 uses.  
  **Recommendation:** Say in T026 that it builds its own fixture variant (the §3 fixture plus a `/manifests/` line) and leaves the shared one unchanged  
  **Resolution:** T026 now builds its own fixture variant (the §3 fixture plus a `/manifests/` line) and leaves the shared fixture and the quickstart §3 table unchanged (tasks.md). (2026-10-08 14:57)

- [X] **I9** · Inconsistency · LOW · designDocs/028-high-level-requirements-FILE-MANIFEST-SCRIPT.md FR-006, FR-015; spec.md Input  
  **Summary:** The spec names the requirements document as its source, but that document still has the pre-resolution FR-006 (no trailing-dot rule) and FR-015 (no report names). The resolve pass told you this and left it.  
  **Recommendation:** Copy the FR-006 and FR-015 wording from the spec into the requirements document, or add a line to the spec that it supersedes the document where they differ  
  **Resolution:** Option B taken: spec.md Source requirements now says this specification governs where it differs from the requirements document (FR-006, FR-015, FR-018); designDocs/ was not edited (2026-10-08 15:14).

- [X] **A2** · Ambiguity · LOW · spec.md SC-001  
  **Summary:** "On a typical developer laptop" names no reference machine, so 10,000 files in under 10 seconds cannot be checked the same way twice.  
  **Recommendation:** Say "on the developer's Windows 11 machine" or give a reference (a laptop with an SSD and four cores)  
  **Resolution:** Option A taken: SC-001 now reads "on the developer's Windows 11 machine" instead of "a typical developer laptop" (spec.md) (2026-10-08 15:15).

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 | Yes | T014, T029, T030 | |
| FR-002 | Yes | T029, T030, T032 | |
| FR-003 | Yes | T010 | |
| FR-004 | Yes | T005, T010 | |
| FR-005 | Yes | T011, T014, T021 | see I7 |
| FR-006 | Yes | T005, T008 | `file.` now covered |
| FR-007 | Yes | T006, T008 | |
| FR-008 | Yes | T006, T008 | |
| FR-009 | Yes | T019, T022, T023 | |
| FR-010 | Yes | T013, T026, T027 | |
| FR-011 | Yes | T007, T012 | |
| FR-012 | Yes | T012 | |
| FR-013 | Yes | T012 | |
| FR-014 | Yes | T016, T017 | |
| FR-015 | Yes | T014 | report names printed |
| FR-016 | Yes | T002 | |
| FR-017 | Yes | T007, T008 | |
| FR-018 | Yes | T020, T024 | see I7 |
| FR-019 | Yes | T003 | |
| FR-020 | Yes | T008, T009, T016, T019 to T021, T026, T029 | |
| SC-001 | Yes | T015, T036, quickstart §2b | see A2 |
| SC-002 | Yes | T009, T021 | see I7 |
| SC-003 | Yes | T009 | |
| SC-004 | Yes | T007, T009, T016 | |
| SC-005 | Yes | T008, T019, T021 | |
| SC-006 | Yes | T026, T028 | before and after listing |
| SC-007 | Yes | T029, T032 | 3-second step in quickstart §6 |
| SC-008 | Yes | T007, T012 | |

## Constitution Alignment Issues

None. The documentation phase is now its own Phase 9 (T037 to T039); Principles I to VI pass; T034 enforces Principle VI.

## Unmapped Tasks

None without a purpose; T001, T033 to T036 and T039 are baseline, type-check, constitution, final-walk and agent-context tasks.

## Metrics

- Total requirements: 28 (20 functional, 8 success criteria)
- Total tasks: 39
- Coverage (requirements with at least one task): 100% (28 of 28)
- Ambiguity count: 1 (A2)
- Duplication count: 0
- Critical issues: 0; High: 0; Medium: 2; Low: 2

## Next Actions (as reported)

No CRITICAL or HIGH issues; you may proceed to `/speckit-implement`. I7 and I8 are worth fixing first because each would make a planned test fail or pass for the wrong reason:
- I7: edit FR-018 in `spec.md`, the SkippedEntry reasons in `data-model.md` and, in `tasks.md`, T024 (record the duplicate as skipped) and T020 (assert it).
- I8: edit T026 in `tasks.md` to build its own fixture variant.
- I9 and A2 are wording fixes (the requirements document, SC-001).
