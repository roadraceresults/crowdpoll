# Specification Analysis Report — specs/20261028-183546-LINE-GRAPH-M3

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261028-183546-LINE-GRAPH-M3 |
| Report created | 2026-10-28 090724 PM |
| Analysis captured | 2026-10-28 090724 PM |
| Last updated | 2026-10-28 9:57 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **C1** · Constitution · CRITICAL · tasks.md T007 (last bullet)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-28 9:57 PM  
  **Notes**: Recommendation accepted in file 2026-10-28: Recommendation A. tasks.md T007: dropped the header-comment sub-step; the opening comment is left as it is.  

  T007 tells the implementer to extend `lineGraph.js`'s header comment to describe the 3:1 shading. Constitution VI forbids comments that explain what the code does; the tests are the record of the behaviour.  

  - **Recommendation A** _(recommended)_: Drop the header-comment sub-step from T007.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: The simplest change that satisfies VI; `tests/client-line-colors.test.ts` documents the rule.  
    - <u>Cons</u>: The header comment keeps saying the lines are drawn in the card's colours, with nothing about the shading. It is unchanged pre-existing text, which the Governance scope allows.  

  - **Recommendation B**: Replace the sub-step with an external reference only: a `// https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html` comment above `lineColorOn` in `pollCard.js`.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: A reader is pointed to why 3:1 is the threshold, and VI allows comments that point to external documentation.  
    - <u>Cons</u>: Adds a comment line to a file that otherwise only gains one function.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · HIGH · tasks.md T005 cases 1–3; `src/public/tabs.js:239-247`  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-28 9:57 PM  
  **Notes**: Recommendation accepted in file 2026-10-28: Recommendation A. tasks.md Shared facts: the panel is cloned from <template id="maximizedCardGrid">, so its background is set on the template before Maximize; T005 cases 1–3 restated that way.  

  T005 says to set the panel's background "before maximizing", but the panel does not exist until the first maximize. `maximizedView()` clones it from `<template id="maximizedCardGrid">`, and `mount()` runs in the same call, so the test cannot set the background before the first draw.  

  - **Recommendation A** _(recommended)_: Set the background on the template before the click: `document.getElementById("maximizedCardGrid").content.querySelector(".maximized-space-right").style.backgroundColor = …`. Restate T005 that way.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: The first draw already sees the surface, the same way the stylesheet would supply it; no extra redraw step.  
    - <u>Cons</u>: The test reaches into the template, which ties it to how `tabs.js` builds the view.  

  - **Recommendation B**: Set the background after `maximize()` returns, then force a redraw by calling the fake `matchMedia`'s recorded `change` listeners, and assert after that.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: Uses only the public seam (the scheme-change redraw), not the template.  
    - <u>Cons</u>: Cases 1 and 2 then depend on T008's listener, so they cannot go green until T008 is done. The first draw is never checked shaded.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · MEDIUM · tasks.md T024; data-model.md `pointerPlaced`  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md data-model.md research.md contracts/ui-contracts.md Updated: 2026-10-28 9:57 PM  
  **Notes**: Recommendation accepted in file 2026-10-28: Recommendation. tasks.md T024 blur also resets pointerPlaced, T021 case 8 added (click on a focused plot, blur, refocus → newest); data-model.md, research.md R7 and contracts C4 note the reset on blur.  

  `pointerPlaced` is cleared only in the `focus` handler. A click on a plot that already has focus fires no `focus`, so the flag stays `true`. The next Tab back into the plot then skips the jump to the newest point (FR-016).  

  - **Recommendation**: In T024, clear `pointerPlaced` on `blur` as well. Add a case to T021: click while the plot is focused, Tab away, Tab back, and expect the newest point.  

    ➡️ [x] **Accepted**  
    - A one-line addition to the blur handler closes the gap, and the new test case pins it down.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · MEDIUM · spec.md FR-016 and US3 scenario 2; research.md R7; contracts C4  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-28 9:57 PM  
  **Notes**: Recommendation accepted in file 2026-10-28: Recommendation. spec.md FR-016 gains "unless the focus comes from a pointer press on the plot, which places the crosshair at that point (FR-019)".  

  The spec says focus shows the newest point, with no exception. R7, C4 and T024 make one: focus that follows a pointer press keeps the pressed point. The behaviour is sensible, but the spec does not state it.  

  - **Recommendation**: Add to FR-016: "…unless the focus comes from a pointer press on the plot, which places the crosshair at that point (FR-019)."  

    ➡️ [x] **Accepted**  
    - The spec then states the behaviour that the plan, contracts and tasks already build and test.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · tasks.md T010 case 4  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-28 9:57 PM  
  **Notes**: Recommendation accepted in file 2026-10-28: Recommendation. tasks.md T010 case 4 now expects style.left 0px at bucket 0 and the newest bucket.  

  "Left is clamped to `[0, 10]` px" gives a range, not a value to assert. Worked through, it is `0px` at both the oldest and the newest bucket.  

  - **Recommendation**: State the expected `style.left` (`0px`) for both buckets.  

    ➡️ [x] **Accepted**  
    - Turns the case into an exact assertion.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A2** · Ambiguity · LOW · tasks.md T019  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-28 9:57 PM  
  **Notes**: Recommendation accepted in file 2026-10-28: Recommendation. tasks.md T019 captures const previous = state.data && state.data.scale before state.data is reassigned.  

  T019 compares "`state.data.scale` with the new `state.scale`", but `showScale()` overwrites `state.data`. The comparison only works if it is made before that assignment.  

  - **Recommendation**: Say: "capture `const previous = state.data && state.data.scale` before reassigning `state.data`".  

    ➡️ [x] **Accepted**  
    - Removes the ordering trap from the task text.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **G1** · Coverage · LOW · spec.md FR-009; tasks.md T020, T011  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-28 9:57 PM  
  **Notes**: Recommendation accepted in file 2026-10-28: Recommendation A. tasks.md T014 also asserts .line-graph-line declares stroke-linejoin:round and stroke-linecap:round.  

  Round joins and caps are set only in CSS (T020), and no automated check covers them.  

  - **Recommendation A** _(recommended)_: Add one assertion to T014 that `.line-graph-line` declares `stroke-linejoin:round` and `stroke-linecap:round`.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: FR-009 gets an automated check, in a test that already reads the sheet.  
    - <u>Cons</u>: A check on one CSS declaration; slightly brittle if the rule moves to another selector.  

  - **Recommendation B**: Accept the hand check in T029; change nothing.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: No extra test code.  
    - <u>Cons</u>: A regression in the joins would be caught only by eye.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **P1** · Constitution (II) · LOW · tasks.md T007  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-28 9:57 PM  
  **Notes**: Recommendation accepted in file 2026-10-28: Recommendation. tasks.md T007 lineColorOf no longer guards a missing window.PollCard; the currentColor check stays.  

  `lineColorOf` falls back when `window.PollCard?.lineColorOn` is missing, but `pollCard.js` always loads before `lineGraph.js` on the one page that uses it. That is handling for an impossible case. The `'currentColor'` check is needed and should stay.  

  - **Recommendation**: Remove the missing-PollCard guard from T007.  

    ➡️ [x] **Accepted**  
    - Matches Simplicity First: no error handling for impossible scenarios.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **D1** · Terminology drift · LOW · data-model.md "Additions to state"; tasks.md T002, T008, T017  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ data-model.md Updated: 2026-10-28 9:57 PM  
  **Notes**: Recommendation accepted in file 2026-10-28: Recommendation. data-model.md lists state.onSchemeChange and a new "Additions to state.view" table (markers, y).  

  The tasks add state fields that `data-model.md` does not list: `state.onSchemeChange`, `view.markers` and `view.y`.  

  - **Recommendation**: Add the three fields to data-model.md.  

    ➡️ [x] **Accepted**  
    - The data model then names every in-memory field the tasks create.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **D2** · Redundancy · LOW · contracts C4; T023  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md contracts/ui-contracts.md Updated: 2026-10-28 9:57 PM  
  **Notes**: Recommendation accepted in file 2026-10-28: Recommendation A. tasks.md T023 replaces the SVG role/aria-label with aria-hidden="true", T021 case 9 added and the existing mount case (lines 132–133) moved to the plot; research.md R7 and contracts C4 updated.  

  The plot (`role=group`) and its SVG (`role=img`) both carry an "Vote share over time for <title>" label, so a screen reader may read the title twice.  

  - **Recommendation A** _(recommended)_: Give the SVG `aria-hidden="true"`, since the plot group and the live region carry the meaning.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: One announcement of the title; the SVG drawing has nothing a screen reader can use beyond the label.  
    - <u>Cons</u>: Changes the existing `role="img"` SVG, which earlier tests may assert. They would need updating in T009 or T021.  

  - **Recommendation B**: Leave both labels as they are.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: No change to existing markup or tests.  
    - <u>Cons</u>: Some screen readers read the title twice on entering the plot.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 line = bar colour | ✅ | T005, T007 | |
| FR-002 shade to 3:1 | ✅ | T004, T006 | |
| FR-003 dots and marker share the colour | ✅ | T005, T007, T011, T017 | |
| FR-004 M3 colour roles | ✅ | T014, T020 | |
| FR-005 bars unchanged | ✅ | T006 (note), T028 | The existing `client-bar-colours` suite guards it |
| FR-006 segmented button | ✅ | T009, T015, T020 | |
| FR-007 no request on scale change | ✅ | T009, T015 | The existing case is kept |
| FR-008 rich tooltip inside the plot | ✅ | T010, T016, T020 | |
| FR-009 2 px, round joins | ⚠️ | T020 | G1 |
| FR-010 ringed markers | ✅ | T011, T017, T020 | |
| FR-011 no animation | ✅ | T014, T020 | |
| FR-012 type scale | ✅ | T014, T020 | The current sheet has `clamp(18px…)` (line 15), which T014 will catch |
| FR-013 static legend | — | none | Unchanged behaviour; the existing legend tests still cover it |
| FR-014 stronger baseline | ✅ | T011, T017, T020 | |
| FR-015 segment keys | ✅ | T021, T022 | |
| FR-016 plot Tab stop and keys | ✅ | T021, T023, T024 | I1, U2 |
| FR-017 polite announcement | ✅ | T021, T024 | |
| FR-018 focus ring | ✅ | T025 | Hand check in T029 |
| FR-019 mouse and pen vs touch | ✅ | T012, T018 | |
| FR-020 nothing else changes | — | none | A constraint; T028 runs the full suite |
| SC-001 / SC-002 | ✅ | T004 | |
| SC-003 | ✅ | T014 | |
| SC-004 | ✅ | T021 | |
| SC-005 | ✅ | T010, T029 | |
| SC-006 | ✅ | T029 | Hand check only, by design |

## Constitution Alignment Issues

- C1 conflicts with VI, so it is CRITICAL.
- P1 is a minor II issue.
- The documentation phase the constitution requires is present (T026, T027).

## Unmapped Tasks

None. T001 (baseline) and T028 (full suite) are cross-cutting.

## Metrics

| Metric | Value |
|---|---|
| Total requirements | 26 (20 FR, 6 SC) |
| Total tasks | 29 |
| Coverage | 92 % (24 of 26 have a task; FR-013 and FR-020 are "unchanged" constraints) |
| Ambiguity count | 2 |
| Duplication count | 0 |
| Critical issues | 1 |

## Next Actions (as reported)

- Fix C1 before `/speckit-implement`: remove the comment sub-step from T007. That is a one-line edit to `tasks.md`.
- Fix U1 and U2 too: as written, T005 can't be done and T024 leaves a focus bug.
- The rest (I1, A1, A2, G1, P1, D1, D2) are small wording fixes in `spec.md` and `tasks.md`.
- `/speckit-analyze-findings` can record these findings and walk through them one at a time, or you can edit the files directly.
