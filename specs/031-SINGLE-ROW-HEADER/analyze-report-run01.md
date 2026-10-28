# Specification Analysis Report — specs/031-SINGLE-ROW-HEADER

## Record

| Record | Value |
|---|---|
| Feature directory | specs/031-SINGLE-ROW-HEADER |
| Report created | 2026-10-13 21:09 |
| Analysis captured | 2026-10-13 21:09 |
| Last updated | 2026-10-13 21:20 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

## Findings

- [X] **I1** · Inconsistency · HIGH · plan.md R2; contracts C3 ("any width"); tasks T003, T010; spec FR-008, SC-007  
  **Summary:** The layout rules (`flex-wrap:nowrap`, `min-height:56px`, children `flex-shrink:0`, `nowrap`) are written for every width. Feature 030's phone header has 24 px buttons and an 8 px bottom margin, so `min-height:56px` would change it. A guest on the six pages with no floating buttons (login, profile, …) has a header of about 400 px at 360 px wide. `nowrap` would make it overflow sideways instead of wrapping. Both break "below 640 px unchanged". C3's sentence "Below 640 px these rules do not change the 030 layout" is wrong as written.  
  **Recommendation:** Put the whole of C3 inside a media query for the wide range: `@media not all and (max-width: 639.98px)` (a plain `min-width: 640px` leaves a 0.02 px gap). Change R2, C3, T003 and the T010 assertion to say so.
  **Resolution:** research R2, contracts C3, tasks T003 and T010 now put every layout rule inside @media not all and (max-width: 639.98px); plan Constraints say so. (2026-10-13 21:12)

- [X] **U1** · Underspecification · MEDIUM · tasks T003; contracts C3  
  **Summary:** `.site-header > *{flex-shrink:0}` and `.header-search{flex:1 1 auto}` have the same specificity (0,1,0), and the search box is a direct child. Only source order decides, so reordering the rules would stop the box shrinking.  
  **Recommendation:** In T003 and C3 write the search rule as `.site-header > .header-search` (higher specificity), or state that it must come after the children rule.
  **Resolution:** The search rule is now .site-header > .header-search in research R2, contracts C3 and tasks T003 and T010. (2026-10-13 21:12)

- [X] **U2** · Underspecification · MEDIUM · spec FR-007  
  **Summary:** FR-007 says "/" behaves "as today" when the Search tab field is not on screen. With the header box hidden, that is `app.js` focusing a hidden box: the key does nothing, and nothing says so. The same already happens on a phone.  
  **Recommendation:** Accept as-is and add an edge case saying so (no change to `app.js` or `searchTab.js`).
  **Resolution:** spec Edge Cases now say "/" does nothing when the header box is hidden and the Search tab field is not on screen. (2026-10-13 21:12)

- [X] **C1** · Coverage · MEDIUM · SC-005, SC-007; tasks T035, T036  
  **Summary:** "Unchanged at 1400 px and below 640 px" is checked only by hand.  
  **Recommendation:** After fixing I1, add to T010 an assertion that the C3 rules sit inside the wide-range query, and extend the 030 pin test to show the phone block is unchanged.
  **Resolution:** tasks T010 asserts the layout rules sit inside the wide-range query; T021 also pins header-single-column-m3.css outside and after its phone block. (2026-10-13 21:12)

- [X] **I2** · Inconsistency · LOW · architecture.md section 4 table, row "No link, then no logo"  
  **Summary:** It says a member who may create polls also loses the Create Poll link ("same, only if still overflowing"). The clarify answer (spec FR-004, plan R5) is that the link never goes for that user.  
  **Recommendation:** Edit that row: the link goes only for a guest or a user without permission.
  **Resolution:** architecture.md section 4: the Create Poll link is kept for a user who may create polls (member with permission, admin) and hidden only when inert (guest, member without permission), at the developer's request (2026-10-13 21:20)

- [X] **I3** · Inconsistency · LOW · plan.md Scale/Scope and Project Structure vs tasks T005, T008, T009, T021, T023  
  **Summary:** The plan says 3 test files edited and does not list `client-search-tab-field.test.ts`. The tasks edit five existing test files, including the helper and that one.  
  **Recommendation:** Update the plan's counts and tree.
  **Resolution:** plan Scale/Scope and the project tree now list the five edited test files. (2026-10-13 21:12)

- [X] **U3** · Underspecification · LOW · tasks T022  
  **Summary:** It says "dispatch an `input` event" on `#searchTabBox`. `searchTab.js` listens on `document`, so the event must bubble.  
  **Recommendation:** Write "a bubbling `input` event" in T022 and R7.
  **Resolution:** tasks T022 and research R7 now say a bubbling input event. (2026-10-13 21:12)

- [X] **U4** · Underspecification · LOW · spec FR-006; contracts C5  
  **Summary:** At 640 px and wider the Search tab field has the phone look (40 px, full width of the card area). Nothing says that is intended.  
  **Recommendation:** Accept it, and say so in the plan.
  **Resolution:** plan Constraints now say the Search tab field keeps the phone look at 640 px and wider. (2026-10-13 21:12)

- [X] **U5** · Ambiguity · LOW · spec Edge Cases ("about 860 pixels", "printed")  
  **Summary:** "About 860 px" is an estimate, and "printed" has no scenario or task.  
  **Recommendation:** Mark the 860 px figure illustrative and drop the printing item. T011's missing-header case covers the empty one.
  **Resolution:** spec Edge Cases: the 860 px figure is illustrative and the printing item is removed. (2026-10-13 21:12)

- [X] **D1** · Duplication · LOW · tasks T013, T014, T017, T018, T025, T026, T029  
  **Summary:** They are marked `[P]` but each edits a file an earlier task creates or edits (`client-header-fit.test.ts`, `single-row-header-sheet.test.ts`).  
  **Recommendation:** Remove `[P]` from them. Keep it on T010/T011, which create the two files.
  **Resolution:** tasks: [P] removed from T013, T014, T017, T018, T025, T026 and T029; Dependencies section reworded. (2026-10-13 21:12)

## Coverage Summary

| Requirement | Has task? | Task IDs | Notes |
|---|---|---|---|
| FR-001, FR-002 | Yes | T003, T010, T011, T035 | See I1 |
| FR-003, FR-009, FR-012 | Yes | T006, T011, T013 | |
| FR-004 | Yes | T013, T017, T025 | |
| FR-005 | Yes | T013 | |
| FR-006, FR-007 | Yes | T017, T019–T023 | See U2 |
| FR-008 | Yes | T006, T011 | See I1 |
| FR-010 | Yes | T029, T030 | |
| FR-011 | Yes | T003, T010 | |
| FR-013 | Yes | T011, T036 | Manual |
| FR-014 | Yes | T004, T007, T008 | |
| FR-015 | Constraint | none; T032 | Satisfied by the absence of server tasks |
| FR-016 | Yes | T017, T022 | |
| SC-001 to SC-004, SC-006 | Yes | T011–T031, T035 | Manual widths |
| SC-005, SC-007 | Manual only | T035, T036 | See C1 |

## Constitution Alignment Issues

None reported. T034 enforces principle VI, and the plan's gates hold.

## Unmapped Tasks

None reported. T001–T002 and T032–T037 are baseline and polish.

## Metrics

- Requirements: 23 (16 FR + 7 SC)
- Tasks: 37
- Requirements with a task or a recorded constraint: 23 of 23, with 22 of 23 having an explicit task
- Ambiguities: 1 (U5)
- Duplications: 1 (D1)
- Critical issues: 0
- High issues: 1

## Next Actions (as reported)

- I1 should be fixed before `/speckit-implement`. It is a spec-level miss that would change phone behavior.
- The rest are MEDIUM or LOW. `/speckit-analyze-resolve` can apply them as a batch; U2's single resolution (accept as-is) is the only one that adds an edge case.
- The 030 push is still pending. 031's tests assume 030's code is present, so push order doesn't matter.
