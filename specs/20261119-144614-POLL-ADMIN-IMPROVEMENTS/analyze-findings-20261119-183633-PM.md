# Specification Analysis Report — specs/20261119-144614-POLL-ADMIN-IMPROVEMENTS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261119-144614-POLL-ADMIN-IMPROVEMENTS |
| Report created | 2026-11-19 055502 PM |
| Analysis captured | 2026-11-19 055502 PM |
| Last updated | 2026-11-19 060314 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · MEDIUM · plan.md "Phases for /speckit-tasks" last paragraph; tasks.md T033, T041  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-19 6:02 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation A. tasks.md T033 builds `buildEnteredOrderSwitch` in research R10's with-icon row shape from the start (no icon); T041 now only adds its `info` argument.  

  The plan puts Story 4 before Story 5 so that the two step-3 switches "are built once, in the shape that takes an icon". But T033 (Story 3, Phase 5) builds `buildEnteredOrderSwitch` in the old `<label>` shape, and T041 (Phase 6) then rebuilds it.  

  - **Recommendation A** _(recommended)_: Have T033 build the switch in the `div`/`<label for>` shape of research R10 straight away, with no icon; T041 then only adds the `info` argument.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: The switch is built once, as the plan intends; T041's change to it becomes one argument.  
    - <u>Cons</u>: T033 must follow research R10 before Story 4's tests exist, so that shape is checked only later, by T035.  

  - **Recommendation B**: Reword the plan's sentence to say Story 4 comes before Story 5 because of the add-choices switch only, and that T041 reshapes the display-order switch built by T033.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: Keeps each story's tasks independent of the next story's design.  
    - <u>Cons</u>: The display-order switch is written twice.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage · MEDIUM · spec FR-025, US3 scenario 10; tasks.md T031  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-19 6:02 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation. tasks.md T027 gains a case: a card given a delta card through deltaClient.js with `choicesInEnteredOrder: true` redraws in position order (FR-025, T031).  

  `deltaClient.js` names card fields one by one. T031 adds the new field there, but no test checks it. If it is left out, open cards never take the new order without a reload, and nothing catches it.  

  - **Recommendation**: Add a case to T027 (or to an existing delta client suite): a delta card with `choicesInEnteredOrder: true` reaches `PollCard` and reorders the bars.  

    ➡️ [x] **Accepted**  
    - Closes the one gap between the server's delta (T003) and the card's drawing (T027).  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · tasks.md T019; research.md R2 "To verify"  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-19 6:02 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation. tasks.md T019 names the four `deps.refresh` sites (Save, Publish, two action answers), states the expected outcome (all from an open row, nothing changes, recorded in research.md R2) and keeps the fallback.  

  T019 is an investigation task with two outcomes ("if such a path exists… or note… that none does"). It can't be checked off against a test in advance.  

  - **Recommendation**: Keep it, but make the expected outcome explicit: name the four `deps.refresh` sites and say they all run from an open card, so the task is to confirm that and record it.  

    ➡️ [x] **Accepted**  
    - The task gets a definite expected result, and keeps the fallback if the expectation proves wrong.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · LOW · spec FR-043; research.md R13; tasks.md T050  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-19 6:02 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation A. tasks.md T050 adds `.wizard-choices-preview .wizard-notes-edit` to `lockStep`'s step-3 selector, so the lock covers "... edit" in the preview state. Applied by widening the selector rather than reusing the class `m3-field-input`, which carries the field's own styles. research.md R13 is not changed by this skill (outside its files); its "lockStep keeps its step-3 line as it is" is superseded by T050.  

  `lockStep`'s step-3 line selects `.m3-field-input`. In the new preview state there is no textarea, so a lock would leave "... edit" usable. The state can't occur (R13), but FR-043 still describes it.  

  - **Recommendation A** _(recommended)_: In T050, give the "... edit" button the field's lock class too, so `lockStep` covers it.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: FR-043 holds in the preview state as well as the open list.  
    - <u>Cons</u>: Code for a state no path reaches (Constitution II).  

  - **Recommendation B**: Say in research R13 that FR-043's second sentence is checked only by reading the code, and leave T050 as it is.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: Nothing built for an unreachable state.  
    - <u>Cons</u>: If the state ever occurs, "... edit" would open a list whose textarea is then locked.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage · LOW · spec FR-022 ("Show fewer choices"); contracts/ui.md U15; tasks.md T027  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-19 6:02 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation. tasks.md T027 gains a "Show fewer choices" case with the setting on and off (FR-022).  

  U15 and T027 check "More choices" and "Show all N" but not "Show fewer choices" with the setting on.  

  - **Recommendation**: Add the "Show fewer choices" row to T027's 30-choice case.  

    ➡️ [x] **Accepted**  
    - Covers every row FR-022 names.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C3** · Coverage · LOW · spec FR-023 (link preview)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-19 6:02 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation, second form. tasks.md T003 asserts the link preview text is the same with the setting on and off (FR-023); quickstart.md not changed.  

  No task or test checks that the page's link preview ignores the setting. It reads the poll server-side and is untouched, so the risk is low.  

  - **Recommendation**: Add one line to quickstart §5, or an assertion in T003 that the preview text is the same with the setting on and off.  

    ➡️ [x] **Accepted**  
    - Every place FR-023 names is then checked.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C4** · Coverage · LOW · spec FR-032 ("page behind… MUST NOT be operable"); tasks.md T036  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-19 6:02 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation. tasks.md T036 asserts Tab and Shift+Tab stay on "Close" and a click under the backdrop changes nothing (FR-032).  

  T036 checks focus and closing, but not that the page behind can't be used.  

  - **Recommendation**: In T036, assert that Tab from "Close" stays on it, and that a click on a wizard control under the backdrop changes nothing.  

    ➡️ [x] **Accepted**  
    - Puts FR-032's last sentence under test.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **T1** · Terminology · LOW · spec SC-006 (50 choices); quickstart.md §7, §5 (30 choices)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-19 6:02 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation. quickstart.md is outside the files this skill may change, so tasks.md T002 now has the long poll created with 50 choices, as SC-006 measures, and "30" read as "50" in quickstart §5 and §7. spec.md SC-006 unchanged.  

  SC-006 measures a 50-choice poll; the quickstart checks it on a 30-choice poll.  

  - **Recommendation**: Make the quickstart's long poll 50 choices, or make SC-006 say 30.  

    ➡️ [x] **Accepted**  
    - Applied as: the quickstart's long poll becomes 50 choices, so SC-006 is checked as written.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · contracts/api.md A2 ("the poll's save route")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-19 6:02 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation. tasks.md T003 names the route, `PATCH /api/admin/polls/:pid` in src/routes/pollsApi.ts; contracts/api.md is outside this skill's files and unchanged.  

  The route isn't named.  

  - **Recommendation**: Name it (the admin poll update route in `src/routes/pollsApi.ts`) so T003 targets it directly.  

    ➡️ [x] **Accepted**  
    - The contract names the route its tests call.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **D1** · Constitution (VI) · LOW · src/public/adminList.js l.772–773; tasks.md T016, T018  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-19 6:02 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation. tasks.md T018 adds: correct the comment above the Create New Poll handler, which speaks of the card being scrolled into view.  

  The comment above the Create New Poll handler says "where the card is scrolled into view". T018 changes that code, but only T016 asks for a comment update (the header). T058 covers this generally.  

  - **Recommendation**: Add to T018: correct the comment above the handler.  

    ➡️ [x] **Accepted**  
    - The comment is fixed in the task that makes it untrue.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 | Yes | T013, T015, T016 | |
| FR-002 | Yes | T013, T016 | |
| FR-003 | Yes | T013, T015 | |
| FR-004 | Yes | T013, T016, T017 | |
| FR-005 | Yes | T013, T019 | |
| FR-006 | Yes | T013 | existing code |
| FR-007 | Yes | T013 | existing code |
| FR-008 | Yes | T014, T018 | creator path checked: `VIEWS.newest = CREATOR_VIEW` |
| FR-009 | Yes | T013, T016 | |
| FR-010 | Yes | T020, T060 | |
| FR-011 | Yes | T022, T024, T025 | |
| FR-012 | Yes | T004, T010 | |
| FR-013 | Yes | T022–T025 | |
| FR-014 | Yes | T022, T024 | |
| FR-015 | Yes | T022, T024 | |
| FR-016 | Yes | T023, T025, T060 | |
| FR-017 | Yes | T022 | existing `guardNavigation` |
| FR-018 | Yes | T003, T006 | |
| FR-019 | Yes | T028, T033 | |
| FR-020 | Yes | T003, T008, T010, T028 | |
| FR-021 | Yes | T027, T029 | |
| FR-022 | Yes | T027, T029 | C2 |
| FR-023 | Partial | T027 (line graph untouched by design) | C3 |
| FR-024 | Yes | T027 | |
| FR-025 | Yes | T003, T031 | C1 |
| FR-026 | Yes | T003, T008 | |
| FR-027 | Yes | T047, T049 | |
| FR-028 | Yes (by omission) | T006–T010 | nothing added to search |
| FR-029 | Yes | T035, T042, T044 | |
| FR-030 | Yes | T035, T039, T044 | |
| FR-031 | Yes | T036, T042, T043 | |
| FR-032 | Yes | T036, T038, T044 | C4 |
| FR-033 | Yes | T035 | |
| FR-034 | Yes | T035 | |
| FR-035–FR-040 | Yes | T046, T050–T053 | |
| FR-041 | Yes | T046 | |
| FR-042 | Yes | T047, T049 | |
| FR-043 | Yes | T047 | U2 |
| FR-044, FR-045 | Yes | T055, T056 | |
| FR-046 | Yes | T022, T035, T036, T046, T060 | |
| FR-047 | Yes | T058, T059 (`cookie-use-list`, no new file) | |
| FR-048 | Yes | T005, T011 | |
| SC-001 | Yes | T002, T060 | measured by hand |
| SC-006 | Yes | T060 | T1 |
| SC-009 | Yes | T003, T027 | |

## Constitution Alignment Issues

None at MUST level. The plan's gate table covers I–VI and the documentation deliverables (T061, T062). D1 is a reminder
within Principle VI, and T058 already covers it.

## Unmapped Tasks

None. T001, T002 and T057–T062 are setup and cross-cutting work.

## Metrics

- Total Requirements: 48 FR + 9 SC (57)
- Total Tasks: 62
- Coverage: 100% of requirements have at least one task (FR-023 partly)
- Ambiguity Count: 1
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

There are no CRITICAL or HIGH findings, so you can go on to `/speckit-implement`. I1 and C1 are worth fixing first,
since both are cheap changes to tasks.md.
