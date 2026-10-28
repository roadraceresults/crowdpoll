# Specification Analysis Report — specs/030-INTEGRATE-SINGLE-COLUMN

## Record

| Record | Value |
|---|---|
| Feature directory | specs/030-INTEGRATE-SINGLE-COLUMN |
| Report created | 2026-10-13 18:42 |
| Analysis captured | 2026-10-13 18:42 |
| Last updated | 2026-10-13 18:44 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.
This is run 2. The first run's report is kept as `analyze-report-run-01.md`.

## Findings

- [X] **F1** · Inconsistency · MEDIUM · plan.md Project Structure and Scale/Scope; tasks T009, T011, T044, T047, T057  
  **Summary:** The plan's test tree does not list `tests/single-column-sheets.test.ts`, which T009 creates and five later tasks extend. "About 5 new test files" is really 4 new files (tab bar scroll, floating actions, search field, sheets) and 3 edited ones.  
  **Recommendation:** Add the file to the plan's tree and say "4 new test files, 3 edited".
  **Resolution:** plan.md's test tree lists `tests/single-column-sheets.test.ts`, and Scale/Scope now says 4 new test files and 3 edited. (2026-10-13 18:42)

- [X] **F2** · Inconsistency · LOW · research.md R9; data-model.md "Floating pair" rules; tasks T030  
  **Summary:** The plan says to clamp on drag, scroll and after cards mount. T030 (after U2) also clamps after a tab switch and when a card is maximized or restored, with a `MutationObserver` on the grids.  
  **Recommendation:** Add "tab switch, and maximize or restore of a card" to the clamp triggers in R9 and in the data-model rules.
  **Resolution:** research.md R9 and data-model.md add tab switch and maximize or restore to the clamp triggers. (2026-10-13 18:42)

- [X] **F3** · Inconsistency · LOW · quickstart.md step 7, step 5, automated commands  
  **Summary:** Step 7 still says the dimmed item "shows the hint", but U1 made it a visible reason line plus a pointer hint. Step 5 has no maximized-card check. The automated command list omits `tests/single-column-sheets.test.ts`.  
  **Recommendation:** Update step 7 to the visible line, add "maximize a card: the pair stays" to step 5, and add the file to the command.
  **Resolution:** quickstart.md step 7 names the visible reason line, step 5 adds the maximized-card check, and the test command includes `tests/single-column-sheets.test.ts`. (2026-10-13 18:42)

- [X] **F4** · Inconsistency · LOW · tasks.md T057  
  **Summary:** T057 sits between T015 and T016, so IDs are no longer in execution order.  
  **Recommendation:** Renumber it or move it after T024; the dependency list and checkpoints do not cite it.
  **Resolution:** Option A: tasks.md renumbered, T057 is now T016 and old T016 to T056 are T017 to T057, with every internal reference updated and checked against the task text; no other file cites task IDs (2026-10-13 18:44)

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 one column, 16 px gap | Yes | T011, T012, T014 | |
| FR-002 compact sizes, vote count | Yes | T011, T012, T014 | |
| FR-003 wide unchanged | Yes | T009, T014, T055 | |
| FR-004 compact header, 7 pages | Yes | T047, T048, T050 | |
| FR-005 label-width tabs | Yes | T017, T057 | closes the earlier gap |
| FR-006 arrows always on, greyed | Yes | T015, T017, T018 | |
| FR-007 step of two tabs | Yes | T015, T019 | |
| FR-008 hold, settle | Yes | T015, T019 | first-frame case |
| FR-009 drag and swipe | Yes | T015, T020 | |
| FR-010 menu | Yes | T015, T021 | |
| FR-011 highlights | Yes | T017, T057, T024 | |
| FR-012 Refresh row | Yes | T044, T045, T046 | |
| FR-013 floating pair | Yes | T025 to T033 | maximized, tab switch, order |
| FR-014 Search field | Yes | T034 to T039 | |
| FR-015 Create Poll item | Yes | T040 to T043 | visible reason |
| FR-016 accessibility | Yes | T015 (names, keyboard), T025 (order), T021 | |
| FR-017 tests | Yes | T003, T004, T009, T015, T025, T034, T040, T057 | |
| FR-018 no server change | Yes | T053, T056 | |
| FR-019 seven-page check | Yes | T050, T055 | manual |
| SC-001 to SC-006 | Yes | T014, T024, T015, T050, T055, T025, T033 | |
| SC-007 | Yes | T034, quickstart step 6 | reworded |
| SC-008 | Yes | T015, T025, T034, T040, T057 | |

## Constitution Alignment Issues

None reported. Principles I to VI pass; Principle IV's earlier weak spot (a red suite at checkpoints) is gone.

## Unmapped Tasks

T001, T002, T051 to T056, and T010. These were accepted as setup, polish or a deliberate checkpoint (D1).

## Metrics

- Total requirements: 27 (19 FR, 8 SC).
- Total tasks: 57.
- Coverage (requirements with at least one task): 27 of 27 = 100%.
- Ambiguity count: 0.
- Duplication count: 0.
- Critical issues: 0 (0 HIGH, 1 MEDIUM, 3 LOW).

## Next Actions (as reported)

- You may proceed to `/speckit-implement`; nothing blocks it.
- The four findings are small and take one pass: `plan.md`, `research.md` and `data-model.md` for F1 and F2, `quickstart.md` for F3, and `tasks.md` for F4. They are cheap to fix now, before the plan is quoted elsewhere.
- Suggested commands: run `/speckit-analyze-resolve` and then "Apply all"; all four have one recommended resolution each. F4's choice of renumbering or moving is yours to make, but it stays a wording matter.
