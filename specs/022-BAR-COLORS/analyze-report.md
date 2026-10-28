# Specification Analysis Report — specs/022-BAR-COLORS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/022-BAR-COLORS |
| Report created | 2026-09-25 12:35 |
| Analysis captured | 2026-09-25 12:35 |
| Last updated | 2026-09-25 12:37 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

## Findings

- [X] **C1** · Constitution (III Surgical) / Inconsistency · MEDIUM · tasks.md T008; plan.md research R6; `src/public/pollCard.js:255-283`  
  **Summary:** T008 says to remove the block comment above `assignResultColors`. That block also describes `renderPollResults`, and its colour sentence ("the next unused entry … in display order") stays true. The comments that become false are the two lines inside the function: "Maybe gets palette color 1, not 3" and "it can't actually wrap". T008 aims at the wrong comment and would delete accurate text.  
  **Recommendation:** Change T008 so it removes only those two lines, and align R6 with it.  
  **Resolution:** T008 now removes only the two false statements inside `assignResultColors`'s in-body comment and keeps the true comments; research R6 and the plan's design note match (tasks.md, research.md, plan.md) (2026-09-25 12:37)

- [X] **U1** · Coverage gap · MEDIUM · spec.md SC-001; tasks.md T004, T007  
  **Summary:** SC-001 asks for at least 10 different first colours on a 20-poll grid. No task checks it: T007 uses 2 polls and T004 checks the spread over 1,000 ids.  
  **Recommendation:** Add to T004: the first 20 of its 1,000 sequential ids give at least 10 different starts. I measured 14.  
  **Resolution:** T004 now also asserts the first 20 of its 1,000 ids give at least 10 different starts (SC-001) (tasks.md) (2026-09-25 12:37)

- [X] **U2** · Underspecification · LOW · tasks.md T007, T011  
  **Summary:** "Find each card's rows" doesn't say how to pick out one card when two are on Trending. `rowsOf` collects every row on the panel.  
  **Recommendation:** Say to find the card whose `.question` text is the seeded title, then read that card's `.results-list > .result-row`.  
  **Resolution:** T007 and T011 now find a card as the `.card-viewport` whose `.question` is the seeded title and read its `.results-list > .result-row` fills (tasks.md) (2026-09-25 12:37)

- [X] **U3** · Underspecification · LOW · tasks.md T012  
  **Summary:** "A fixed-id poll" has no id, so its expected colours aren't pinned down.  
  **Recommendation:** Name one, e.g. `poll-swap` (start 36), or note that the check compares before and after and needs no fixed start.  
  **Resolution:** T012 now seeds the fixed id `poll-swap` (start 36) and expects `palette[36]`, `palette[37]` before and after the swap (tasks.md) (2026-09-25 12:37)

- [X] **U4** · Coverage (manual only) · LOW · spec.md FR-006, SC-003 ("second user in a different browser")  
  **Summary:** Automated tests can't cover "every browser" or "a second user". FR-006 rests on the integer-only design and T004's comparison with the reference copy; the rest is quickstart Q6.  
  **Recommendation:** Accept. Q6 in T018 covers it.  
  **Resolution:** accepted; no artifact change — FR-006 rests on the integer-only design and T004, and the second-user check is quickstart Q6 in T018 (2026-09-25 12:37)

- [X] **I1** · Terminology · LOW · spec.md FR-001–FR-003 (colours numbered 1–50); contracts C1, data-model, tasks (array index 0–49)  
  **Summary:** Two numberings are used for the same thing. Each file states its own, and the contract gives the conversion.  
  **Recommendation:** Accept. Optionally add "(array index `s`, 1-based colour `s + 1`)" to T005.  
  **Resolution:** T005 now notes "(array index `s`; 1-based colour `s + 1`)" beside its expectation (tasks.md) (2026-09-25 12:37)

- [X] **I2** · Content quality · LOW · spec.md Assumptions  
  **Summary:** The spec names FNV-1a, which is an implementation detail.  
  **Recommendation:** Accept. The requirements fixed it, and it appears only in Assumptions.  
  **Resolution:** accepted; no artifact change — the hash is fixed by the source requirements and named only in the spec's Assumptions (2026-09-25 12:37)

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 start from poll id | Yes | T002, T004, T007, T009 | |
| FR-002 consecutive, wrapping | Yes | T005, T008 | Wrap checked at row 25 of `poll-fifty` |
| FR-003 display order | Yes | T008, T012 | |
| FR-004 Yes/No unchanged | Yes | T006, T010 | The existing swap case is kept |
| FR-005 same everywhere | Yes | T009, T011 | Other tabs are checked manually (Q5) |
| FR-006 same in every browser | Partial | T002, T004 | U4 |
| FR-007 no id → 1 | Yes | T002, T004 | |
| FR-008 technique unchanged | Yes | T005 (tint, ink and overlay assertions kept), T017 | |
| FR-009 tests rewritten and added | Yes | T003–T007, T011, T012 | |
| FR-010 docs | Yes | T014–T016 | |
| SC-001 ≥10 of 20 | **No** | — | U1 |
| SC-002 distribution | Yes | T004 | |
| SC-003 identical everywhere | Yes | T011, T018 | The other-user part is manual |
| SC-004 no repeats in a card | Yes | T005 | |
| SC-005 contrast unchanged | Yes | T005, T006 | |
| SC-006 suite passes | Yes | T010, T013, T017 | |

## Constitution Alignment Issues

C1 is the only one, and it's MEDIUM rather than CRITICAL. Principle III is followed in intent, but T008's instruction would remove accurate text beside the change. Principle VI (the only new comment points to an outside reference, and a grep in T017 checks `src/` for spec numbers) and the Documentation Deliverables (T014–T015) are covered.

## Unmapped Tasks

None. T001 and T018 are the baseline and the manual walk-through.

## Metrics

- Total requirements: 16 (10 FR, 6 SC)
- Total tasks: 18
- Coverage: 15 of 16 have at least one task (94%); SC-001 has none, and FR-006 is partly covered
- Ambiguity count: 2 (U2, U3)
- Duplication count: 0 (FR-002 and SC-004 overlap on purpose: one is the rule, the other its measure)
- Critical issues: 0

## Next Actions (as reported)

There are no CRITICAL issues, so you can go ahead with `/speckit-implement`. I'd fix C1 and U1 in `tasks.md` first, because both change what gets written:
- C1: narrow T008 to the two comment lines that become false, and match research R6.
- U1: add the 20-id check to T004.
- U2/U3 (optional): name how T007 and T011 find a card, and give T012 an id.
