# Specification Analysis Report — specs/020-LIVE-RESULTS-X

## Record

| Record | Value |
|---|---|
| Feature directory | specs/020-LIVE-RESULTS-X |
| Report created | 2026-09-22 13:38 |
| Analysis captured | 2026-09-22 13:38 |
| Last updated | 2026-09-22 13:39 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

Second analysis pass (the first pass's seven findings, all resolved, are recorded in `analyze-report-01.md`).

## Findings

- [X] **I2** · Inconsistency · MEDIUM · tasks.md T019, T020; Dependencies L140  
  **Summary:** The dependency line reads "T019 needs T020", but T019 is listed **before** T020 in Phase 5 — T019 focuses the next card through `grid.cardOf(next)`, and T020 is the task that adds `cardOf` to `createGrid`. Task IDs are meant to be sequential *in execution order*, so an implementer working top to bottom writes a call to a method that does not exist yet. (This inversion predates the renumbering — it was "T018 needs T019" before.)  
  **Recommendation:** Swap them: make the `cardOf` accessor T019 and the `removePoll` focus placement T020, then the dependency line reads "T020 needs T019" and the order is honest. One swap, two line edits.  
  **Resolution:** tasks.md Phase 5 now lists the `cardOf` accessor as T019 and the `removePoll` focus placement as T020, with the dependency line and the two Notes references updated to match (2026-09-22 13:39)

- [X] **L3** · Inconsistency · LOW · tasks.md L168  
  **Summary:** The MVP strategy says "Phase 3: the rewritten removal assertions (T011–T014)"; Phase 3 is now T011–**T015** after G1's insertion.  
  **Recommendation:** Change the range to T011–T015.  
  **Resolution:** tasks.md's MVP strategy now reads T011–T015 for Phase 3 (2026-09-22 13:39)

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 (control in the bottom row) | ✅ | T002, T009, T011, T014 | T014 added by G1 |
| FR-002 (plain X, bars' box) | ✅ | T002, T004, T006, T011 | |
| FR-003 (no corner control anywhere) | ✅ | T003, T005, T012 | |
| FR-004 (star returns to its corner) | ✅ | T005 | visual check in quickstart |
| FR-005 (other tabs unchanged) | ✅ | T011, T017, T022 | |
| FR-006 (removal unchanged) | ✅ | T009, T013 | |
| FR-007 (label, tooltip, accessible name) | ✅ | T006, T011 | |
| FR-008 (one hover treatment) | ⚠️ | — | manual only (quickstart US1 step 3); jsdom cannot paint |
| FR-009 (X static; bars' rules unchanged) | ✅ | T011 | **resolved by G2** |
| FR-010 (shown for every poll state) | ✅ | T008, T016 | |
| FR-011 (notes keep their place) | ✅ | T016 | |
| FR-012 (add form still hides) | ✅ | T006, T008, T017 | T006 now carries the "never write `hidden`" rule |
| FR-013 (front-face control) | ✅ | inherent | quickstart US2 step 6 |
| FR-014 (Enter and Space) | ✅ | T007, T021, T022 | |
| FR-015 (focus placement) | ✅ | T019, T020, T021 | **I2** — ordering, not coverage |
| FR-016 (017's rules superseded) | ✅ | T024 | |
| SC-001–SC-003, SC-005 | ✅ | T013, T012, T016, T021 | |
| SC-004 (other tabs unchanged) | ✅ | T015, T027 | |
| SC-006 (regression) | ✅ | T001, T014, T015, T027 | |

## Constitution Alignment Issues

None.

## Unmapped Tasks

None. T001/T010/T015/T018/T023/T027 are checkpoints; T024–T026 are the contract and documentation deliverables; T028 is the manual walk-through.

## Metrics

- Total requirements: 16 FR + 6 SC = 22
- Total tasks: 28
- Coverage: 21/22 with ≥1 task (95%); FR-008 is manual-only by nature (jsdom cannot paint)
- Ambiguity count: 0
- Duplication count: 0
- Critical issues: 0 · High: 0 · Medium: 1 · Low: 1

## Next Actions (as reported)

No CRITICAL or HIGH issues; **you may proceed to `/speckit-implement`**. I2 is worth the 30 seconds before you do — an implementer following the list in order would write `grid.cardOf(...)` one task before adding it, which is a self-inflicted red test. L3 is a stale range in prose.

- I2: swap T019 and T020 in `tasks.md` (and the dependency line).
- L3: correct the range in the MVP strategy.
