# Specification Analysis Report — specs/027-ADMIN-SEARCH-MATERIAL3

## Record

| Record | Value |
|---|---|
| Feature directory | specs/027-ADMIN-SEARCH-MATERIAL3 |
| Report created | 2026-10-05 19:21 |
| Analysis captured | 2026-10-05 19:21 |
| Last updated | 2026-10-05 19:22 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

## Findings

- [X] **U1** · Underspecification · MEDIUM · tasks T014; adminList.js becomeCreatorView(); spec Edge Cases (creator view)  
  **Summary:** A poll creator who isn't an administrator has `#adminSearchForm` removed (`becomeCreatorView`). T014 adds a toggle, a region and listeners keyed on elements that are then missing. The existing handler already guards `searchForm`, but the new block doesn't say to. An unguarded `getElementById(...).addEventListener` would throw inside `DOMContentLoaded` and stop the page's setup for creators.  
  **Recommendation:** Add to T014: all new code runs only when the form exists (inside the existing `if (searchForm)` block) and is null-safe. T012 gains a case that a creator-only page loads with no error.
  **Resolution:** T013 now runs inside `if (searchForm)` and is null-safe; T011 gains a creator-only case (tasks.md) (2026-10-05 19:22)

- [X] **C1** · Coverage · MEDIUM · spec FR-002, SC-001, US2 scenario 2; tasks T009, T011  
  **Summary:** "No sideways scrolling at any width down to 320 px" has no rule or check. jsdom can't measure layout, and T009/T011 assert only heights and type. A date input or a 40/60 operator pair can overflow a narrow panel unless fields are allowed to shrink.  
  **Recommendation:** In T009 give the fields, controls and pairs `min-width:0; max-width:100%; box-sizing:border-box`, and in T011 assert those rules statically. Have T022 measure at 320 px.
  **Resolution:** T008 adds `min-width:0; max-width:100%; box-sizing:border-box`; T010 asserts it; T022 measures at 320px (tasks.md, quickstart.md) (2026-10-05 19:22)

- [X] **I1** · Inconsistency · LOW · plan.md Technical Context ("3 edited stylesheets", "3 test files updated") and Project Structure (lists client-tabs-026.test.ts as edited); tasks.md  
  **Summary:** The plan says `client-tabs-026.test.ts` moves its FIX03/FIX04 assertions to the new rule. No task edits it, and research R10 says it keeps passing, which is right: those two rules stay in `admin.css`. The "3 stylesheets" figure also lists only two.  
  **Recommendation:** Correct plan.md: 2 edited stylesheets (`admin.css`, `m3-tokens.css`), tests updated are `m3-assets.test.ts` only, and drop `client-tabs-026.test.ts` from the edited files.
  **Resolution:** plan.md now says 2 edited stylesheets and 1 updated test file, and no longer lists `client-tabs-026.test.ts` (plan.md) (2026-10-05 19:22)

- [X] **C2** · Coverage · LOW · spec SC-005; tasks T022, quickstart  
  **Summary:** "First results visible without scrolling past a form taller than one screen at laptop height" has no check.  
  **Recommendation:** Add to quickstart scenario 3 and T022: at 1366×768 the collapsed panel plus the tabs leaves the first card's top visible.
  **Resolution:** T022 and quickstart scenario 3 add the 1366×768 above-the-fold check (tasks.md, quickstart.md) (2026-10-05 19:22)

## Coverage Summary

| Requirement | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 | Yes | T004, T005 | |
| FR-002 | Partial | T005 | See C1 |
| FR-003, FR-009 | Yes | T007 | |
| FR-004–FR-008 | Yes | T007–T011 | |
| FR-010–FR-014 | Yes | T012–T016 | See U1 |
| FR-015–FR-016 | Yes | T017, T018 | |
| FR-017 | Yes | T011, T003 (existing admin-light test) | |
| SC-001 | Partial | T004, T011 | See C1 |
| SC-002–SC-004, SC-006, SC-007 | Yes | T004, T007, T011, T012, T017 | |
| SC-005 | No | none | See C2 |

## Constitution Alignment Issues

None reported.

## Unmapped Tasks

None reported. (T001 is a baseline and T022 is the manual walk.)

## Metrics

- Requirements: 17 FR and 7 SC
- Tasks: 22
- Coverage: 17/17 FR have a task (FR-002 partly); 6 of 7 SC have one (SC-005 has none)
- Ambiguities: 0 · Duplications: 0 · Critical issues: 0

## Next Actions (as reported)

- No CRITICAL issues. Fix U1 and C1 before implementing; I1 and C2 are small wording and verification additions.
- Run `/speckit-analyze-resolve` to capture and close them, then `/speckit-analyze` and `/speckit-implement`.
