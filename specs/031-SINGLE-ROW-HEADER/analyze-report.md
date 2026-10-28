# Specification Analysis Report — specs/031-SINGLE-ROW-HEADER

## Record

| Record | Value |
|---|---|
| Feature directory | specs/031-SINGLE-ROW-HEADER |
| Report created | 2026-10-13 21:23 |
| Analysis captured | 2026-10-13 21:23 |
| Last updated | 2026-10-13 21:25 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.
This is the second analysis run; the first is in `analyze-report-run01.md` (all 10 findings closed).

## Findings

- [X] **I1** · Inconsistency · MEDIUM · tasks T010 vs T015, T019, T027; contracts C2, C4  
  **Summary:** T010 asserts that "nothing but the custom property sits outside" the wide-range media query. The step rules (`html[data-header-fit~="no-name"] …`, `no-search`, `no-link`, `no-logo`) are added by T015, T019 and T027, and the contracts do not say where they go. If they go outside the query, T010 fails. The custom property's location is also not stated, and feature 030 defines its tunables inside its media block.  
  **Recommendation:** Say in C2, C4 and T015/T019/T027 that the custom property and the four step rules all go inside `@media not all and (max-width: 639.98px)`. Change T010 to assert that nothing sits outside it. The step rules never fire on a phone, because the script removes the attribute there, so this costs nothing.
  **Resolution:** contracts C2 and C4, tasks T003, T010, T015, T019 and T027 now put the custom property and the four step rules inside the wide-range media query, and T010 asserts nothing sits outside it. (2026-10-13 21:25)

- [X] **U1** · Underspecification · LOW · spec US5 scenario 3 ("text size … is increased"); research R4; tasks T030  
  **Summary:** A changed text size does not always resize the header, since its own width is the viewport's. The planned triggers (`ResizeObserver` on the header, child changes, fonts ready, the phone query) can therefore miss it. Zoom is covered, because it fires a resize.  
  **Recommendation:** Also observe the header's direct children with the `ResizeObserver`, and re-observe them whenever the header is rebuilt. Their widths follow the text size because they do not shrink. Add this to R4 and T030, and a case to T029.
  **Resolution:** research R4, contracts C7, tasks T029 and T030 now also observe the header's direct children for size changes. (2026-10-13 21:25)

## Coverage Summary

All 16 functional requirements and 7 success criteria are covered (22 of 23 by an explicit task; FR-015 is a constraint satisfied by the absence of server tasks). SC-005 and SC-007 are now pinned by T010 and T021 as well as by the manual checks T035 and T036.

## Constitution Alignment Issues

None reported.

## Unmapped Tasks

None reported. T001–T002 and T032–T037 are baseline and polish.

## Metrics

- Requirements: 23 (16 FR + 7 SC)
- Tasks: 37
- Requirements with a task or a recorded constraint: 23 of 23, with 22 of 23 having an explicit task
- Ambiguities: 0
- Duplications: 0
- Critical issues: 0
- High issues: 0

## Next Actions (as reported)

- You may proceed to `/speckit-implement`. Neither finding blocks implementation.
- I1 changes a test assertion and a rule placement, so resolving it first is cleaner. U1 is an improvement.
- Both have a single resolution, so `/speckit-analyze-resolve` then "apply all" would close them.
