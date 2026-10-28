# Specification Analysis Report — specs/030-INTEGRATE-SINGLE-COLUMN

## Record

| Record | Value |
|---|---|
| Feature directory | specs/030-INTEGRATE-SINGLE-COLUMN |
| Report created | 2026-10-13 18:45 |
| Analysis captured | 2026-10-13 18:45 |
| Last updated | 2026-10-13 18:46 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.
This is run 3. The earlier reports are kept as `analyze-report-run-01.md` and `analyze-report-run-02.md`.

## Findings

- [X] **G1** · Inconsistency · LOW · plan.md Structure Decision  
  **Summary:** It says "The architecture document names one new script; the plan splits it in two". Since the architecture file was edited (I2), it names two scripts too, so the sentence is now false.  
  **Recommendation:** Reword it to "The architecture document and the plan both name two new scripts, because arrows/menu and the floating pair share nothing (research R2)".
  **Resolution:** plan.md Structure Decision now says the architecture document and the plan both name two new scripts (2026-10-13 18:46)

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 to FR-003 cards, wide unchanged | Yes | T011 to T014, T009, T055 | |
| FR-004 compact header | Yes | T047 to T050 | |
| FR-005, FR-011 tab sizing, highlights | Yes | T016, T018, T025 | static assertions plus manual |
| FR-006 to FR-010 arrows, step, hold, drag, menu | Yes | T015, T017 to T022 | first-frame case covered |
| FR-012 Refresh row | Yes | T044 to T046 | |
| FR-013 floating pair | Yes | T026 to T034 | maximized, tab switch, order |
| FR-014 Search field | Yes | T035 to T040 | |
| FR-015 Create Poll item | Yes | T041 to T044 | visible reason line |
| FR-016 accessibility | Yes | T015, T026, T022 | |
| FR-017 tests | Yes | T003, T004, T009, T015, T016, T026, T035, T041 | |
| FR-018 no server change | Yes | T054, T057 | `git diff --stat` check |
| FR-019 seven-page check | Yes | T051, T056 | manual |
| SC-001 to SC-008 | Yes | T014, T025, T015, T051, T056, T026, T034, T035, T016 | SC-007 reworded; SC-008 covered by T015, T016, T026, T035, T041 |

## Constitution Alignment Issues

None reported. Principles I to VI pass.

## Unmapped Tasks

T001, T002, T010 and T052 to T057 (setup, the Foundational checkpoint and polish), accepted earlier (D1).

## Metrics

- Total requirements: 27 (19 FR, 8 SC).
- Total tasks: 57.
- Coverage (requirements with at least one task): 27 of 27 = 100%.
- Ambiguity count: 0.
- Duplication count: 0.
- Critical issues: 0 (0 HIGH, 0 MEDIUM, 1 LOW).

## Next Actions (as reported)

- You may proceed to `/speckit-implement`. Nothing blocks it.
- G1 is one sentence in `plan.md` and can be fixed before or after. I would fix it first, since the next person reading the plan would otherwise believe the architecture file and the plan disagree.
- Suggested command: `/speckit-implement`. T001 and T002 take the baseline before any file is edited.
