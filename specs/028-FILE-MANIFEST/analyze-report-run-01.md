# Specification Analysis Report — specs/028-FILE-MANIFEST

## Record

| Record | Value |
|---|---|
| Feature directory | specs/028-FILE-MANIFEST |
| Report created | 2026-10-08 14:40 |
| Analysis captured | 2026-10-08 14:53 |
| Last updated | 2026-10-08 14:53 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

## Findings

- [X] **I1** · Inconsistency · MEDIUM · spec.md US4 and its scenario 3; tasks.md T026, T028  
  **Summary:** "The `manifests` folder is ignored by git, so the output never appears as untracked work" is true only here, where `.gitignore` has `/manifests/`. In any other project, and in the T009 fixture repository, `manifests/` shows as untracked. The command does not edit other projects' ignore files.  
  **Recommendation:** Reword US4 and scenario 3 to "in this repository"; in T026 say the fixture's own ignore file must list `/manifests/` for that check, and keep the "does not edit ignore files" limit explicit  
  **Resolution:** Option A taken: spec.md US4 and scenario 3, quickstart.md and T026/T028 now say "in this repository" and state that the command edits no ignore file (spec.md, quickstart.md, tasks.md). (2026-10-08 14:45)

- [X] **A1** · Ambiguity · MEDIUM · spec.md SC-007  
  **Summary:** "Rejected in under 1 second" is measured from where? `npx tsx` alone took 0.61 s and `npm run` 0.23 s here before the script starts; a slower Windows machine will pass 1 s without the script doing anything wrong.  
  **Recommendation:** Change to "within 3 seconds of pressing Enter", or measure from script start  
  **Resolution:** SC-007 now reads "within 3 seconds of the command being started, runner start-up included"; quickstart §6 repeats it (spec.md, quickstart.md). (2026-10-08 14:45)

- [X] **G1** · Coverage Gap · MEDIUM · spec.md SC-001; tasks.md T015, T036  
  **Summary:** SC-001 (under 10 s for 10,000 files, under 2 s here) has no task or quickstart step that times a run; T015 and T036 record counts only.  
  **Recommendation:** Add to T015 a timed run on this repository, and a quickstart step that generates 10,000 small files in a fixture and times it; or relax SC-001 to this repository only  
  **Resolution:** Added quickstart §2b (timing on this repository and a 10,000-file fixture) and timing lines to T015 and T036 (quickstart.md, tasks.md). (2026-10-08 14:45)

- [X] **U1** · Underspecification · MEDIUM · quickstart.md §3 to §6; spec.md Assumptions  
  **Summary:** The developer's machine is Windows 11 with PowerShell (Assumptions; `CLAUDE.md`), but scenarios 3 to 6 are Bash only (`mktemp`, `printf`, `ln -s`, `&`/`wait`); PowerShell gets one sentence.  
  **Recommendation:** State that Git Bash (installed with git) is the shell for these scenarios, or add PowerShell blocks  
  **Resolution:** Quickstart now names Git Bash as the shell for the scenarios and drops the half PowerShell hint (quickstart.md). (2026-10-08 14:45)

- [X] **C1** · Constitution Alignment · MEDIUM · tasks.md Phase 8; constitution "Compliance review"  
  **Summary:** The constitution requires "a post-implementation documentation phase covering the two Documentation Deliverables". T037 and T038 do that in substance, but they sit inside "Polish & Cross-Cutting Concerns" after the final walk-through, not as their own phase. Not a violation of a principle; the mandated phase is implicit.  
  **Recommendation:** Split Phase 8: keep T033 to T036 as Polish and make T037 to T039 a Phase 9 "Documentation"  
  **Resolution:** Phase 8 split: T033 to T036 stay Polish, T037 to T039 are a new Phase 9 Documentation; dependencies, strategy and counts updated (tasks.md). (2026-10-08 14:45)

- [X] **G2** · Coverage Gap · LOW · spec.md SC-006; tasks.md T026, T028  
  **Summary:** "No file outside `manifests/` is created or changed" is checked only through `git status`, which cannot see changes to ignored files.  
  **Recommendation:** In T026 compare a before and after listing (path, size, modified time) of the fixture outside `manifests/`  
  **Resolution:** T026 now compares a before and after listing (path, size, modified time) of everything outside manifests/ (tasks.md). (2026-10-08 14:45)

- [X] **I2** · Inconsistency · LOW · plan.md function table; tasks.md T022, T030  
  **Summary:** The table omits `commentSyntaxFor`, `validateProject` and `runCli`, which tasks add; it gives argv, console and exit codes to `main`.  
  **Recommendation:** Add the three functions to the table and say `main` only calls `runCli`  
  **Resolution:** Function table gained commentSyntaxFor, validateProject and runCli; main now calls runCli (plan.md). (2026-10-08 14:45)

- [X] **I3** · Inconsistency · LOW · tasks.md T007, T023  
  **Summary:** T007 already renders `undefined` as an empty cell, yet T023 changes both summarize functions for the empty *Comment lines* cell. One of them is incomplete.  
  **Recommendation:** Say in T007 that a column sums only defined values and is empty when none is defined; reduce T023 to the `measureFile` change  
  **Resolution:** T007 states that a cell sums only defined values and stays empty otherwise; T023 reduced to the measureFile change (tasks.md). (2026-10-08 14:45)

- [X] **I4** · Inconsistency · LOW · tasks.md T021, T025  
  **Summary:** T025 says "make T019 to T021 pass", but T021's skip cases exercise `readAndMeasure` from T011 and already pass in US1, so they are not tests-first.  
  **Recommendation:** Reword T025 to "T019 and T020 pass; T021 stays green" or move T021 into US1  
  **Resolution:** T025 reworded to "T019 and T020 pass (T021 stays green)" (tasks.md). (2026-10-08 14:45)

- [X] **I5** · Inconsistency · LOW · spec.md, data-model.md, plan.md, tasks.md  
  **Summary:** Terminology drift: "folder" in spec prose and tasks, "directory" in the data model, the plan and FR-004's source wording; the `Directory` column name is fixed.  
  **Recommendation:** Use "folder" in prose everywhere; keep "directory" only for the column and `topDirectory`  
  **Resolution:** Prose "directory" changed to "folder" across spec, data model, research, quickstart and contracts; identifiers, backticked names and the Directory column kept; the not-a-folder error text aligned (spec.md, data-model.md, research.md, quickstart.md, contracts/cli.md, contracts/reports.md, tasks.md). (2026-10-08 14:45)

- [X] **I6** · Inconsistency · LOW · spec.md FR-015; contracts/cli.md  
  **Summary:** The contract prints a `Reports:` line that FR-015 does not list; FR-015 names path, counted and skipped only (the first-five paths live in FR-005).  
  **Recommendation:** Add the report names to FR-015, or drop the line from the contract  
  **Resolution:** FR-015 now lists the report names and refers to FR-005 for the skipped-entry detail (spec.md). (2026-10-08 14:45)

- [X] **D1** · Duplication · LOW · spec.md FR-005, FR-015, US3 scenario 5  
  **Summary:** The skipped-entry console output is specified three times in near-identical words.  
  **Recommendation:** Keep it in FR-005 and have FR-015 refer to it  
  **Resolution:** Resolved together with I6: FR-015 refers to FR-005 instead of repeating the skipped-entry output (spec.md). (2026-10-08 14:45)

- [X] **U2** · Underspecification · LOW · spec.md FR-006  
  **Summary:** A name ending in a dot (`file.`) has `path.extname` of `.`, which would group under the type `.`; the spec does not say.  
  **Recommendation:** Add: an extension that is only a dot is `(none)`  
  **Resolution:** FR-006, data-model.md, T005 and T008 now treat an extension that is only a dot ("file.") as (none) (spec.md, data-model.md, tasks.md). (2026-10-08 14:45)

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 argument and path resolution | Yes | T014, T029, T030 | |
| FR-002 failures and usage message | Yes | T029, T030, T032 | |
| FR-003 git decides ignored | Yes | T010 | tested by T009 |
| FR-004 excluded folders | Yes | T005, T010 | |
| FR-005 skipped entries | Yes | T011, T014, T021 | see D1, I4 |
| FR-006 file type grouping | Yes | T005 | see U2 |
| FR-007 binary test | Yes | T006, T008 | |
| FR-008 line count | Yes | T006, T008 | |
| FR-009 comment lines | Yes | T019, T022, T023 | |
| FR-010 run folder | Yes | T013, T026, T027 | |
| FR-011 one table, Total row | Yes | T007, T012 | |
| FR-012 by-type reports | Yes | T012 | |
| FR-013 directories report | Yes | T012 | |
| FR-014 folder reports | Yes | T016, T017 | |
| FR-015 success output | Yes | T014 | see I6 |
| FR-016 package script | Yes | T002 | |
| FR-017 text format | Yes | T007, T008 | |
| FR-018 case folding | Yes | T020, T024 | |
| FR-019 ignore exception | Yes | T003 | |
| FR-020 tests | Yes | T008, T009, T016, T019 to T021, T026, T029 | |
| SC-001 performance | **No** | none | G1 |
| SC-002 counted + skipped = listed | Yes | T009, T021 | |
| SC-003 totals identities | Yes | T009 | |
| SC-004 column sums | Yes | T007, T009, T016 | |
| SC-005 hand-worked fixtures | Yes | T008, T019, T021 | |
| SC-006 separate folders, no outside writes | Partial | T026, T028 | G2 |
| SC-007 rejection speed | Partial | T029, T032 | A1: no timing step |
| SC-008 readable reports | Yes | T007, T012 | |

## Constitution Alignment Issues

None that violate a principle. C1 (documentation phase not set apart) is a structure point against the "Compliance review" clause. Principles I to VI pass; Principle VI is enforced by T034, Principle IV by the per-story tests.

## Unmapped Tasks

None without a purpose. T001, T033, T034, T035, T036 and T039 are baseline, type-check (plan R16), constitution and final-walk tasks that map to no single requirement.

## Metrics

- Total requirements: 28 (20 functional, 8 success criteria)
- Total tasks: 39
- Coverage (requirements with at least one task): 96% (27 of 28); all 20 functional requirements are covered, SC-001 has no task
- Ambiguity count: 1 (A1)
- Duplication count: 1 (D1)
- Critical issues: 0; High: 0; Medium: 5; Low: 8

## Next Actions (as reported)

No CRITICAL or HIGH issues. You may proceed to `/speckit-implement`; the five MEDIUM items are cheap to fix first and two of them change what gets tested:
- Fix I1 and A1 in `spec.md` (reword the US4 claim; relax SC-007), either by hand or by re-running `/speckit-specify designDocs/028-high-level-requirements-FILE-MANIFEST-SCRIPT.md` after editing the requirements.
- Add the timing step for G1 and the PowerShell note for U1 in `quickstart.md`, and the timing line in T015, by editing `tasks.md` by hand.
- Split Phase 8 in `tasks.md` for C1.

Would you like me to suggest concrete remediation edits for the top 5 issues? (Nothing has been changed.)
