# Specification Analysis Report — specs/027-ADMIN-SEARCH-MATERIAL3

## Record

| Record | Value |
|---|---|
| Feature directory | specs/027-ADMIN-SEARCH-MATERIAL3 |
| Report created | 2026-10-05 19:29 |
| Analysis captured | 2026-10-05 19:29 |
| Last updated | 2026-10-05 19:35 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.
The first round's checklist (four findings, all resolved) is kept in `analyze-report.round1.md`.

## Findings

- [X] **O1** · Inconsistency · MEDIUM · tasks T005, T007, T008 vs T018; admin.css  
  **Summary:** The new markup orphans the old `.admin-search input, .admin-search select`, `.admin-search-btn`, `.admin-search-clear` and `.admin-search-row` rules the moment T007 lands, but T018 (Polish) is where they are removed. Until then they fight the new styles. `admin.css` sets a literal `font-size:13px`, a 1 px `--line` border, 8 px corners, 7 px padding and a 36 px button height, and it loads before the new sheet. Whichever selector is more specific wins, so a token-based rule of equal or lower specificity would lose, and the fields would not be the 56 px outlined fields. T005 also says the old `.admin-search` rule is reduced, but the rest of the old rules stay until T018.  
  **Recommendation:** Move the removal into US2: T008 deletes those old `admin.css` rules as its first step, since T007 orphans them. T018 becomes only the check that nothing else selects them.
  **Resolution:** T008 now removes the old `admin.css` search rules first and T018 only confirms nothing else selects them (tasks.md) (2026-10-05 19:35)

- [X] **I1** · Inconsistency · LOW · research R2; plan; tasks T008  
  **Summary:** R2 puts the floating label on "a background patch matched to `--md-sys-color-surface-container-low`", but the panel's surface is the cards' own `var(--paper-raised)` (the shared rule from R1). A patch of a different colour would show as a box behind the floating label.  
  **Recommendation:** Change R2 to say the label patch uses the panel's own background (`var(--paper-raised)`), and have T008 use that, so the border appears cut.
  **Resolution:** research R2 and T008 now put the floating-label patch on `var(--paper-raised)`, the panel's own background (research.md, tasks.md) (2026-10-05 19:35)

## Coverage Summary

| Requirement | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 | Yes | T004, T005 | |
| FR-002 | Yes | T005, T008, T010, T022 | `min-width:0` and the 320 px check are now in |
| FR-003, FR-009 | Yes | T006 | |
| FR-004–FR-008 | Yes | T006–T010 | See O1 |
| FR-010–FR-014 | Yes | T011–T015 | creator-view case in T011 |
| FR-015–FR-016 | Yes | T016, T017 | |
| FR-017 | Yes | T010, T003 | |
| SC-001–SC-007 | Yes | T004, T006, T010, T011, T016, T022 | SC-005 via T022 and quickstart |

## Constitution Alignment Issues

None reported.

## Unmapped Tasks

None reported. (T001 is a baseline, T021 the full run, T022 the manual walk.)

## Metrics

- Requirements: 17 FR and 7 SC
- Tasks: 22
- Coverage: 100% of FR and SC
- Ambiguities: 0 · Duplications: 0 · Critical issues: 0

## Next Actions (as reported)

- No CRITICAL issues. Fix O1 before implementing, since it would make the fields render as the old styles rather than Material 3; I1 is a one-line correction.
- Run `/speckit-analyze-resolve` to capture and close them, then `/speckit-analyze` and `/speckit-implement`.
