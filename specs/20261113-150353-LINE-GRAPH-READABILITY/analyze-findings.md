# Specification Analysis Report — specs/20261113-150353-LINE-GRAPH-READABILITY

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261113-150353-LINE-GRAPH-READABILITY |
| Report created | 2026-11-13 070414 PM |
| Analysis captured | 2026-11-13 070414 PM |
| Last updated | 2026-11-14 044737 AM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

This is the second analysis of the feature. The first one's six findings (all resolved) are in
`analyze-findings-20261113-190414-PM.md`.

## Findings

### **I3** · Inconsistency · MEDIUM · quickstart.md steps 2 and 4; spec.md FR-021; tasks.md T015  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ quickstart.md tasks.md Updated: 2026-11-14 4:34 AM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-14: quickstart.md step 2 now reads "Touch, or click, a time"; added step 12 (hover only is cleared, a click pins) and step 13 (iPhone Safari); tasks.md T015 runs steps 1–13.  

  Step 2 says "Touch or point at a time" and step 4 expects that time to still be selected after tapping a legend entry. With a mouse, a pointed-at (hovered) time is cleared on leaving the plot, so step 4 fails at desktop width as written. No manual step covers the pinned click or a real iPhone Safari tap.  

  - **Recommendation**: Change step 2 to "Touch, or click, a time". Add a step for hover-only (cleared on leaving) and one for step 4 on an iPhone in Safari.  

    ➡️ [X] **Accepted**  
    - The manual run (T015) then checks what FR-021 says, and the one case the automated tests cannot show (Safari does not focus a tapped button) is checked on a real phone. T015's step range follows the new step count.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U3** · Underspecification · MEDIUM · tasks.md T004(h); spec.md US1 scenario 4, FR-021  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md tasks.md research.md contracts/ui.md quickstart.md Updated: 2026-11-14 4:47 AM  
  **Notes**: Recommendation accepted in file 2026-11-14: Recommendation A, a mouse drag with a button held still moves a pinned time: spec.md US1 scenario 8 and FR-021; tasks.md T003(i) (a `pointermove` with `buttons: 1` moves it) and T004(h) (`event.buttons === 0` in the condition); research.md R6, contracts/ui.md U4 and quickstart.md step 12 say the same.  

  The press sets `pinned` at once and mouse `pointermove` is then ignored, so pressing and dragging with a mouse no longer moves the time. It does today, and scenario 4 says "drags or moves".  

  - **Recommendation A** _(recommended)_: Let `pointermove` through while a button is held (`event.buttons !== 0`), say so in FR-021, and add the case to T003(i).  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: A mouse drag across the plot keeps working as it does today; the time is pinned where the button is released.  
    - <u>Cons</u>: One more condition in the `pointermove` handler and one more test case.  

  - **Recommendation B**: Keep the time fixed at the press point; say in FR-021 and US1 scenario 4 that a mouse drag does not move a time, only hover (before a click) and further clicks do.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: No code beyond what T004(h) already describes.  
    - <u>Cons</u>: A behaviour that works today is lost; pressing and dragging across a chart is a common mouse gesture.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · spec.md FR-013, tie edge case; research.md R2  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md research.md Updated: 2026-11-14 4:34 AM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-14: spec.md tie edge case now says a tie is an equal displayed whole percent; research.md R2 notes the same and that ordering by vote count is out of scope.  

  The served points are whole percentages (`Math.round` in `src/polls/lineGraph.ts:115`). A "tie" is therefore an equal displayed percent: a choice at 2.6% can take tenth place from one at 3.4% that comes later in choice order.  

  - **Recommendation**: State in the edge case that ties are decided at the displayed whole percent. Ordering by vote count would need a server change, which is out of scope.  

    ➡️ [X] **Accepted**  
    - The two choices show the same number in the legend, so the viewer sees a tie either way; the spec then says what the code can do with the data it receives.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A2** · Ambiguity · LOW · spec.md FR-005  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-14 4:34 AM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-14: spec.md FR-005 now reads "MUST NOT re-order when the selected time changes".  

  "MUST NOT re-order while a time is selected" reads as absolute, but the next sentence re-makes the order on each refresh, which can happen while a time is pinned.  

  - **Recommendation**: Reword to "MUST NOT re-order when the selected time changes".  

    ➡️ [X] **Accepted**  
    - Wording only; the behaviour in the plan and tasks is unchanged.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I4** · Inconsistency · LOW · spec.md US1 scenarios 5 and 8, FR-021; contracts/ui.md U4  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-14 4:34 AM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-14: spec.md US1 scenarios 5 and 8 and FR-021 now say "anywhere other than the plot, the legend and the show-all button"; scenario 8 and FR-021 also list the focus move.  

  The spec clears on a press "outside the graph". The contract and T004(g) clear on a press anywhere but the plot, the legend and the show-all button, so the title or the readout row also clears. FR-021's list of what clears a pinned time also omits a focus move, which scenario 5 includes.  

  - **Recommendation**: Use the contract's wording in the spec and add the focus move to FR-021.  

    ➡️ [X] **Accepted**  
    - Wording only: the spec then matches what the tests in T003 and T006 assert. A press outside the plot clears today too.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I5** · Inconsistency · LOW · plan.md Storage and Constitution row II; data-model.md intro; CLAUDE.md  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ plan.md data-model.md CLAUDE.md Updated: 2026-11-14 4:34 AM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-14: "two" in-memory fields is now "four" in plan.md (Storage, Constitution row II), data-model.md and CLAUDE.md; data-model.md gained the `pressedInside` row.  

  "Two in-memory fields" is out of date: the table lists three new ones (`showAll`, `highlightId`, `pinned`), and T004(g) adds `pressedInside`, which data-model.md does not list.  

  - **Recommendation**: Say "four" and add a `pressedInside` row.  

    ➡️ [X] **Accepted**  
    - Changes `plan.md`, `data-model.md` and the count in `CLAUDE.md`'s plan reference.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage · LOW · spec.md US2 scenario 6, FR-011; tasks.md T006, T009  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-14 4:34 AM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-14: tasks.md T009(i) also asserts that a refresh whose response drops the highlighted line leaves no pressed entry and no `has-highlight`.  

  The highlight being cleared when a refresh drops its line has no test. Only the "Show top 10" path is tested in T009(f), though both run through `render()`.  

  - **Recommendation**: Add the case to T009(i), which already stubs a refresh response.  

    ➡️ [X] **Accepted**  
    - One more assertion in a test that already exists in the task list.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U4** · Underspecification · LOW · tasks.md T004(b), T004(g)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md data-model.md plan.md CLAUDE.md Updated: 2026-11-14 4:47 AM  
  **Notes**: Recommendation accepted in file 2026-11-14: Recommendation A, the `focusout` listener ignores events while the legend is rebuilt: tasks.md T004(g) (`state.rebuildingLegend`); research.md R6 gained a "Legend rebuild" bullet; data-model.md gained the field's row, and the field count is now "five" in data-model.md, plan.md and CLAUDE.md.  

  A refresh rebuilds the legend buttons. In a browser that fires `focusout` when the focused entry is removed, a keyboard user's selected time would be cleared on every refresh, against contract U4. I have not checked which browsers do this, and jsdom will not show it.  

  - **Recommendation A** _(recommended)_: Have the `focusout` listener ignore events during the legend rebuild.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: The selected time survives a refresh in every browser, whatever it does on removing a focused element.  
    - <u>Cons</u>: One flag in `lineGraph.js` for a case that may not occur in the browsers in use.  

  - **Recommendation B**: Add no guard; check it by hand in the quickstart (focus a legend entry with a time selected and wait for a refresh) and add the guard only if the time is lost.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: No code for a problem that is not confirmed.  
    - <u>Cons</u>: Only the browsers tried by hand are covered; a later browser change would bring the fault back unnoticed.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **T2** · Terminology · LOW · contracts/ui.md U2, U3; tasks.md T001, T012; CLAUDE.md  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ contracts/ui.md tasks.md CLAUDE.md Updated: 2026-11-14 4:34 AM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-14: "newest share" is now "current share" in contracts/ui.md U2, tasks.md T001 and T012 and CLAUDE.md; tasks.md Phase 3 and T003(h) say "latest shares" as the spec does. "newest point" stays where it names a data point.  

  "newest share" is still used where the spec and plan now say "current share". This is the remainder of the earlier T1.  

  - **Recommendation**: Replace with "current share".  

    ➡️ [X] **Accepted**  
    - Wording only, where the text means the share and not the data point ("newest point" stays where it names the last value of a series).  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 to FR-004 (readout) | Yes | T003, T004, T005, T015 | FR-003 "plot does not move" is manual only, because jsdom has no layout |
| FR-005 (order) | Yes | T001, T002, T009(h) | A2 |
| FR-006, FR-007 (keep and clear) | Yes | T003, T004(g), T006(e, i), T009(e) | |
| FR-021 (pinned time) | Yes | T003(i), T004(h) | I3, U3, I4 |
| FR-008 to FR-012 (highlight) | Yes | T006, T007, T008 | C2 |
| FR-013 to FR-016 (top 10) | Yes | T009, T010, T011 | A1 |
| FR-017, FR-020 (every width, inside the card) | Yes | T005, T011, T015 | Manual |
| FR-018 (colors) | Yes | T003(d), T006(a) | |
| FR-019 (nothing stored) | Yes | T006(j), T009(j) | |
| SC-001 to SC-003 | Yes | T015 | Manual at 360 px and desktop |
| SC-004 to SC-006 | Yes | T009, T006, T003, T015 | |

## Constitution Alignment Issues

None. The documentation phase is present (T012, T013), the README task forbids references to other documents, and no
task puts requirement ids in code or literal font sizes in the M3 sheet.

## Unmapped Tasks

None. T014 is the verification gate.

## Metrics

- Total Requirements: 27 (21 functional, 6 success criteria)
- Total Tasks: 15
- Coverage: 100%
- Ambiguity Count: 2
- Duplication Count: 0
- Critical Issues Count: 0

One consequence of the accepted 40 px legend buttons is not a finding but matters for the phone goal: at 360 px, ten
entries take about five rows of 40 px, and "Show all 15" about eight. The legend is taller than today's, so the plot
starts lower on the screen. Quickstart step 1 is where to judge it.

## Next Actions (as reported)

- Nothing blocks `/speckit-implement`.
- I would resolve I3 and U3 first. I3 would make the manual run report a false failure, and U3 changes how a mouse drag
  behaves today.
- The seven low findings are wording, one extra test and one guard, and can be resolved in the same pass.
- To work through them as a checklist, run `/speckit-analyze-findings`. It backs up the current `analyze-findings.md`
  and captures this report.
