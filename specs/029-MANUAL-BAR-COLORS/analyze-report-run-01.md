# Specification Analysis Report — specs/029-MANUAL-BAR-COLORS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/029-MANUAL-BAR-COLORS |
| Report created | 2026-10-08 20:41 |
| Analysis captured | 2026-10-08 20:41 |
| Last updated | 2026-10-08 21:01 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

## Findings

- [X] **G1** · Coverage Gap · MEDIUM · FR-017, SC-008; T021, T017  
  **Summary:** Nothing tests that a card that is already open receives a changed colour. T021 only checks that `content_version` moves, and no task touches `tests/refresh-deltas.test.ts`.  
  **Recommendation:** T021: add a delta case in which a card holding the older version gets choices with the new `color`. T017: add a case that a refresh with a new `color` repaints the bar in place.
  **Resolution:** added the delta case to T021 and the in-place repaint case to T017 in tasks.md (2026-10-08 20:43)

- [X] **I1** · Inconsistency · MEDIUM · T014, T015  
  **Summary:** T015 is marked `[P]` but also edits `src/public/adminCard.js` (ripple registration), the same file T014 edits.  
  **Recommendation:** Move the ripple registration into T014 and keep T015 CSS-only, or drop `[P]` from T015.
  **Resolution:** Option A: moved the ripple registration from T015 into T014 in tasks.md; T015 is CSS-only and keeps [P] (2026-10-08 20:57)

- [X] **C1** · Constitution · MEDIUM · T023; Principle V  
  **Summary:** The new route changes a live poll, but T023 doesn't mention a log line. Sibling routes log their writes (e.g. `[admin] Saved poll … without publishing` at `pollsApi.ts:540`).  
  **Recommendation:** Add to T023: log `[admin] Saved colors of poll <pid>`, and a line on a refused session. Nothing sensitive.
  **Resolution:** added the success and refusal log lines to T023 and removed T015 from the adminCard.js list in tasks.md (2026-10-08 20:59)

- [X] **U1** · Underspecified · LOW · FR-010; plan R4; contracts/api.md  
  **Summary:** The plan and contract answer `409` for a colours-route call on a poll with no votes; the spec only describes the route "for a poll that has votes".  
  **Recommendation:** Add one clause to FR-010: a poll with no votes is refused with `409` and uses Publish (already FR-020).
  **Resolution:** added the no-votes refusal sentence to FR-010 in spec.md (2026-10-08 21:00)

- [X] **G2** · Coverage Gap · LOW · SC-001, SC-003; T017, T020  
  **Summary:** SC-001 (30 s with a pointer, 60 s with the keyboard) has no timed step. SC-003 names 2 to 50 choices with and without Yes/No, but T017 tests one arrangement.  
  **Recommendation:** T017: loop over 2, 3, 10 and 50 choices, with and without a yes/no choice. Quickstart §2: add a timing step, or relax SC-001 to "completes §2 step 3 unaided".
  **Resolution:** Option A: T017 loops over 2/3/10/50 choices with and without yes/no, quickstart §2 step 3 times the step, T020 records the times, in tasks.md and quickstart.md (2026-10-08 21:01)

## Coverage Summary

All 28 requirements (20 FR, 8 SC) have at least one task (100%). Partly verified: FR-017 (G1), SC-001 (G2), SC-003 (G2), SC-008 (G1).

## Constitution Alignment Issues

C1 only (a missing log line in T023). Principles I–IV and VI pass.

## Unmapped Tasks

None reported.

## Metrics

Requirements 28 · Tasks 42 (T001–T042) · Ambiguities 0 · Duplications 0 · Critical 0 · High 0 · Medium 3 · Low 2

## Next Actions (as reported)

No critical or high issues; may proceed to /speckit-implement. Medium items are small edits to tasks.md (G1, I1, C1); U1 is one clause in spec.md; G2 extends T017 and the quickstart.
