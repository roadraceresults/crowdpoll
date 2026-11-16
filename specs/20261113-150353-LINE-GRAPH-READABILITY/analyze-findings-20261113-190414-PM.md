# Specification Analysis Report — specs/20261113-150353-LINE-GRAPH-READABILITY

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261113-150353-LINE-GRAPH-READABILITY |
| Report created | 2026-11-13 042907 PM |
| Analysis captured | 2026-11-13 042907 PM |
| Last updated | 2026-11-13 044449 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **U1** · Underspecification · HIGH · spec.md:L94, L130, L172 (US2-4, US3-6, FR-007); research.md R6; tasks.md T004(g)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md plan.md tasks.md research.md contracts/ui.md data-model.md requirements.md Updated: 2026-11-13 4:44 PM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation A, a press on the plot pins the time: spec.md gained US1 scenario 8 and FR-021 and scenario 5 says "after only hovering"; plan.md Summary; tasks.md T003(i) and T004(g, h), where (g) also keeps the time in browsers that do not focus a clicked button; research.md R6, contracts/ui.md U4, data-model.md and requirements.md (Legend order) follow.  

  With a mouse, a selected time is cleared the moment the pointer leaves the plot (`pointerleave`), so a mouse user can never reach a legend entry or the show-all button with a time still selected. FR-007 is unreachable by mouse, and R6's last bullet ("clicks the plot first, then the legend") is wrong: `pointerleave` clears regardless of a click.  

  - **Recommendation A** _(recommended)_: A mouse click on the plot pins the time until a press outside, Escape or a scale change (as touch already does); hover alone still clears on leave.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: FR-007, US2 scenario 4 and US3 scenario 6 work with a mouse; mouse and touch behave alike; a desktop viewer can hold a time while reading the legend, which is now the only readout.  
    - <u>Cons</u>: one more state (`pinned`) in `lineGraph.js` and its tests; a clicked time stays until the viewer clicks elsewhere.  

  - **Recommendation B**: Accept it, and say in the spec that FR-007 applies to touch and keyboard only.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no new code; hover behaves exactly as today.  
    - <u>Cons</u>: with a mouse the legend shows the selected time's shares only while the pointer is on the plot, so a time and a highlight cannot be combined, and the readout must be read without moving the pointer.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · MEDIUM · spec.md:L142 (Edge Cases), L168 (FR-005), Assumptions; research.md R2  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md requirements.md Updated: 2026-11-13 4:44 PM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation: spec.md edge case now reads "ties keep the poll's choice order", FR-005 says the graph orders the lines itself, and Assumptions state the legend order changes on some polls; requirements.md (Legend order) says the same.  

  The spec says the legend's share order is "as supplied". The response is in choice order; the plan sorts in the browser (R2). The legend's order therefore changes on existing polls, which the spec does not state.  

  - **Recommendation**: Reword the tie edge case to "ties keep the poll's choice order", and add to FR-005 / Assumptions that the graph orders the lines itself and that the legend order changes for polls whose choice order is not their share order.  

    ➡️ [X] **Accepted**  
    - The plan and tasks (T001, T002, T009(h)) already do this; only the spec's wording, and the same claim in the requirements report's UA1, are out of step.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · MEDIUM · spec.md:L61 (US1-5) vs L172 (FR-007); research.md R6  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-13 4:44 PM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation: US1 scenario 5 now excepts a focus move to a legend entry or the show-all button.  

  US1 scenario 5 says moving keyboard focus away from the plot clears the selection; FR-007 and R6 keep it when focus moves to a legend entry or the show-all button.  

  - **Recommendation**: Amend scenario 5: "…or moves keyboard focus away from the plot to anything other than a legend entry or the show-all button".  

    ➡️ [X] **Accepted**  
    - It makes the scenario agree with FR-007, with contracts/ui.md U4 and with the test T006(i); no plan or task changes.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · MEDIUM · tasks.md T005; contracts/ui.md U7; spec.md FR-008  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md contracts/ui.md Updated: 2026-11-13 4:44 PM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation A, 40 px: tasks.md T005 `min-height:40px`; contracts/ui.md U7 gained the row.  

  Legend buttons are given `min-height:32px`. They are the feature's main touch control on a phone, and every other button of the graph is 40 px; the spec and contract give no size.  

  - **Recommendation A** _(recommended)_: Set `min-height:40px` in T005 and add the row to U7 (10 entries in 5 rows is about the height of today's 15-entry legend).  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: an easier tap target, the same height as the scale and show-all buttons.  
    - <u>Cons</u>: the legend is about a quarter taller per row; after "Show all" on a 15-line poll it is 8 rows of 40 px.  

  - **Recommendation B**: Keep 32 px and record it in U7.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the most compact legend, so more of the plot stays on screen.  
    - <u>Cons</u>: smaller than the usual touch target; neighbouring entries are easier to hit by mistake.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage · LOW · spec.md:L203 (FR-019); tasks.md T006, T009  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-13 4:44 PM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation: tasks.md T006(j) and T009(j) assert storage and cookies are unchanged.  

  No test asserts that the highlight and show-all state write nothing to storage.  

  - **Recommendation**: Add to T006 and T009: `localStorage.length`, `sessionStorage.length` and `document.cookie` are unchanged after a highlight and after "Show all".  

    ➡️ [X] **Accepted**  
    - Two assertions in tests that already exist; they keep a later change from quietly adding a storage key, which would also need a Cookie Use row.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **T1** · Terminology · LOW · spec.md ("current share", "latest share"); plan.md, research.md, contracts/ui.md ("newest share", "newest point")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ plan.md research.md Updated: 2026-11-13 4:44 PM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation: plan.md Summary and research.md R2 now say "current share"; "newest point" stays where the array element is meant.  

  The same value has three names.  

  - **Recommendation**: Use "current share" in plan, research and contract prose; keep "newest point" only where the array element is meant.  

    ➡️ [X] **Accepted**  
    - Wording only, in `plan.md`; `research.md`, `data-model.md` and `contracts/ui.md` are outside the files this skill edits, so they keep "newest".  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 no floating box | Yes | T003, T004, T005, T014 | |
| FR-002 legend shows shares at the time | Yes | T003, T004 | |
| FR-003 time label always shown, plot does not move | Yes | T003, T004, T005, T015 | "does not move" is manual (jsdom has no layout) |
| FR-004 crosshair and markers only | Yes | T003, T004 | |
| FR-005 fixed order | Yes | T001, T002, T009(h) | see I1 |
| FR-006 selection and keyboard as today | Yes | T003, T004 | |
| FR-007 legend / show-all keep the time | Yes | T003(e), T004(g), T006(e, i), T009(e) | see U1, I2 |
| FR-008 entries are buttons | Yes | T003(g), T004, T006, T007 | see U2 |
| FR-009 one highlight, toggle, Escape | Yes | T006, T007 | |
| FR-010 front, wider, rest dimmed | Yes | T006, T007, T008, T015 | appearance is manual |
| FR-011 highlight survives / is cleared | Yes | T006(f, h), T007(e), T009(f) | |
| FR-012 hover does nothing | Yes | T006(g) | |
| FR-013 top 10 at first | Yes | T002, T009, T010 | |
| FR-014 Show all N / Show top 10 | Yes | T009, T010, T011 | |
| FR-015 no button at 10 or fewer | Yes | T009(c, i), T010 | |
| FR-016 show-all persistence | Yes | T009(d), T010 | |
| FR-017 every width, any count | Yes | T015 | no width branch exists in code |
| FR-018 colors unchanged | Yes | T007(d), T014 | existing colour tests stay |
| FR-019 nothing stored | Partly | T014 | see C1 |
| FR-020 nothing outside the card | Yes | T005, T015 | manual |
| SC-001 – SC-006 | Yes | T015 (SC-004, SC-005 also T006, T009) | |

## Constitution Alignment Issues

None reported. The documentation phase (T012, T013) is present; no task puts requirement ids in code comments.

## Unmapped Tasks

None reported (T012–T015 are documentation and verification).

## Metrics

- Total Requirements: 20 functional, 6 success criteria
- Total Tasks: 15
- Coverage: 100% (FR-019 partly)
- Ambiguity Count: 0
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

No critical issue. U1 should be decided before `/speckit-implement`, because it changes T004 and its tests; the others are wording and small additions.
