# Specification Analysis Report — specs/20261104-180032-LEGAL-PAGE-UPDATES

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261104-180032-LEGAL-PAGE-UPDATES |
| Report created | 2026-11-04 102633 PM |
| Analysis captured | 2026-11-04 102633 PM |
| Last updated | 2026-11-04 105500 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **C1** · Constitution · CRITICAL · tasks.md T017; `src/public/admin.html:69-70`; `src/public/admin.css:27-29`  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-04 10:55 PM  
  **Notes**: Recommendation accepted in file 2026-11-04: Recommendation, tasks.md T017 now removes the `013 FR-040` comment in `admin.html` and the two comments above `.admin-back-link` in `admin.css`.  

  T017 edits the admin back link and its rules. The comments in that region cite requirement IDs ("013 FR-040") and describe behaviour ("plain link (not History.back())…", "The home page's Refresh treatment…"). Under Principle VI and its Governance scope, comments in a region being changed must be brought into line. T017 tells the implementer to keep the admin.css comment "where it still describes the remaining rule".  

  - **Recommendation**: Reword T017: remove the `013 FR-040` comment in `admin.html` and the behaviour comments above `.admin-back-link` in `admin.css`, keeping only comments that point to external documentation.  

    ➡️ [x] **Accepted**  
    - Neither comment points to external documentation, so both go; the link's markup and the remaining placement rule say what they do by their names.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · HIGH · spec.md SC-004, Edge Cases ("Both arrows at once"); research R7; requirements AM1  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-04 10:55 PM  
  **Notes**: Recommendation accepted in file 2026-11-04: Recommendation, spec.md SC-004 now holds the Back arrow only, and the Edge Cases' "Both arrows at once" says the Up arrow floats over the content while it shows.  

  SC-004 says neither arrow covers any of the legal pages' text, and the edge case says the arrows never overlap "the text". But the Up arrow is now centred (AM1 B) and sits over the 72ch text column whenever it shows; the mockup shows it covering part of a line. No task can meet SC-004 as written.  

  - **Recommendation**: Limit SC-004 and the edge case to the Back arrow (the FR-015 gutter). State that the Up arrow overlays the content while it shows, as it already does on phones.  

    ➡️ [x] **Accepted**  
    - SC-004 becomes "At every width from 320 px up, the Back arrow covers none of the legal pages' text"; the edge case keeps "never overlap each other" and drops "or the text", adding that the Up arrow floats over the content while it shows.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · research R2; tasks.md T014, T010  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-04 10:55 PM  
  **Notes**: Recommendation accepted in file 2026-11-04: Recommendation, tasks.md T014 now says one anchor step fires both events and is counted once, and T010 has a case for it expecting `history.go(-2)`; research.md R2 was left as it is.  

  One click on an in-page link fires both `popstate` and `hashchange` in current browsers. R2 numbers an entry "on `popstate` and `hashchange`", but no task requires one anchor step to be counted once. The T010 cases set `location.hash` without saying whether both events fire.  

  - **Recommendation**: Add to T014: the first event numbers the entry and the second adopts that number. Add a T010 case that fires both events for one step and expects `history.go(-2)`.  

    ➡️ [x] **Accepted**  
    - R2 gets the same sentence, so research, tasks and test agree.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · LOW · quickstart.md scenario 6; contracts C1  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ quickstart.md Updated: 2026-11-04 10:55 PM  
  **Notes**: Recommendation accepted in file 2026-11-04: Recommendation, quickstart.md scenario 6 now says to follow "check" in "In short".  

  Scenario 6 says to follow "bot check" in "In short", but C1 renames that link's text to "check".  

  - **Recommendation**: Change scenario 6 to "follow 'check' in 'In short'".  

    ➡️ [x] **Accepted**  
    - A one-word edit to `quickstart.md`.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · LOW · plan.md Technical Context, Scale/Scope  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ plan.md Updated: 2026-11-04 10:55 PM  
  **Notes**: Recommendation accepted in file 2026-11-04: Recommendation, plan.md Scale/Scope now says 4 files added.  

  "About 8 files changed and 3 added": the structure lists 4 new files (`backArrow.js`, `back-arrow-m3.css`, `client-back-arrow.test.ts`, `back-arrow-sheet.test.ts`).  

  - **Recommendation**: Say 4 added.  

    ➡️ [x] **Accepted**  
    - A one-word edit to `plan.md`.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Coverage · LOW · spec.md SC-005; tasks.md T019, T023  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-11-04 10:55 PM  
  **Notes**: Recommendation accepted in file 2026-11-04: Recommendation, accepted as is; T023 checks the centring in a browser, and no file needed to change.  

  The 1 px centring of SC-005 is checked only through the sheet's rules (T019) and by hand (T023); jsdom has no layout.  

  - **Recommendation**: Accept as is; T023 covers it in a browser.  

    ➡️ [x] **Accepted**  
    - No file changes.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001–FR-004 (section text, case) | Yes | T002, T004 | |
| FR-005, FR-006 (summary, retention row) | Yes | T002, T005 | |
| FR-007 (anchor kept) | Yes | T002, T004, T007 | `client-human-check` run in T007 |
| FR-008 (version, Last updated) | Yes | T003, T006 | |
| FR-009 (accept once, no email) | Yes | T006, T007 | Existing gate suites |
| FR-010, FR-011 (when shown) | Yes | T008, T010, T014 | |
| FR-012 (back past anchors) | Yes | T010, T014 | See U1 |
| FR-013 (look) | Yes | T009, T013, T017 | |
| FR-014 (fixed, under logo) | Yes | T009, T013 | |
| FR-015 (gutter) | Yes | T012, T016 | |
| FR-016 (button, tooltip, keyboard) | Yes | T010, T014 | |
| FR-017 (guests, unaccepted) | Yes | T010 | The test runs without a session |
| FR-018 (no storage, no third party) | Yes | T007, T010, T014 | |
| FR-019, FR-020 (Up arrow centred) | Yes | T019, T020, T021 | |
| FR-021 (checks updated) | Yes | T002, T003, T009–T012, T019 | |
| SC-001 | Yes | T002 | |
| SC-002, SC-003 | Yes | T010, T023 | |
| SC-004 | Partly | T012, T016, T023 | See I1 |
| SC-005 | Yes | T019, T023 | See U2 |
| SC-006 | Yes | T006, T007 | |
| SC-007 | Yes | T010, T023 | |

## Constitution Alignment Issues

C1 (Principle VI: comments in the region T017 changes).

## Unmapped Tasks

None. T001 is setup. T022–T025 cover the full test run, the quickstart walk and the documentation the constitution requires.

## Metrics

- Total Requirements: 21 functional, plus 7 success criteria
- Total Tasks: 25
- Coverage: 100% (every FR and SC has at least one task)
- Ambiguity Count: 0
- Duplication Count: 0
- Critical Issues Count: 1

## Next Actions (as reported)

- **Before `/speckit-implement`:** resolve C1 (critical) and I1 (high). Both are edits to `tasks.md` and `spec.md`.
- **Before implementing T014:** fix U1, so the step count is tested.
- **Optional:** I2, I3 and U2 are wording fixes.
