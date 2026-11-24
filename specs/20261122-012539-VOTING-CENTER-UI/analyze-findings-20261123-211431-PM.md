# Specification Analysis Report — specs/20261122-012539-VOTING-CENTER-UI

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261122-012539-VOTING-CENTER-UI |
| Report created | 2026-11-23 090547 PM |
| Analysis captured | 2026-11-23 090547 PM |
| Last updated | 2026-11-23 091311 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **C1** · Constitution · CRITICAL · tasks.md T012; site.css:310–331; pollCard.css:482–492  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-23 9:07 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-23: Recommendation. tasks.md T012 now brings the comments in its changed `site.css` (lines ~310–331) and `pollCard.css` (~482–492) regions into line with Principle VI (FR/FIX/feature references removed, the sizer comment made true, rule-describing comments deleted); T013, T019 and T028 carry the same instruction for their regions.  

  T012 changes the `site.css` button-width rules, but the comment above them cites "008-POLL-CARD-BACK-SIDE FR-007", "FIX017" and "007-closed-state". That comment also says the sizers carry "every label the back button may show", which will become untrue. T012 only asks to "correct its FIX017 comment" and the sentence about label sizing. The `pollCard.css` action-row comments it rewrites ("Clicking the arrow flips back…") only describe what the rules do. The Governance scope clause requires comments in a region being changed to follow Principle VI.  

  - **Recommendation**: In T012, bring the comments in the changed `site.css` and `pollCard.css` regions into line: remove the FR/FIX/feature references, make the sizer comment true, and delete comments that only describe the rules. Give T013, T019 and T028 the same instruction for the regions they change.  

    ➡️ [X] **Accepted**  
    - The scope clause makes this mandatory for regions being changed; comments outside them stay as they are (Principle III). It matches the earlier C1 resolution for `pollCard.js`.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · MEDIUM · tasks.md Notes (lines 336–337); plan.md Constitution Check III (line 68); research.md R12 (line 175)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md plan.md research.md Updated: 2026-11-23 9:07 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-23: Recommendation. The narrower wording is replaced with the scope clause (comments in a region being changed are brought into line with Principle VI; elsewhere left alone) in tasks.md Notes, plan.md Constitution Check III and research.md R12.  

  Three places say "an existing comment is corrected only where its rule changes". That is narrower than the constitution's scope clause, and it contradicts T009, T010 and T026 as resolved.  

  - **Recommendation**: Reword all three to the scope clause: comments in a region being changed are brought into line with Principle VI; comments elsewhere are left alone.  

    ➡️ [X] **Accepted**  
    - The plan, research and task notes then state the rule the tasks already follow.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · MEDIUM · spec.md Edge Cases; research.md R4; tasks.md T017, T014  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md research.md tasks.md Updated: 2026-11-23 9:13 PM  
  **Notes**: Recommendation accepted in file 2026-11-23: Recommendation A. "after the row is left or emptied" became "once the row is both left and empty" in spec.md (Edge Cases), research.md R4 and tasks.md T017, matching the guard (focus or text) and T014.  

  The turn-back is skipped while the row has focus **or** text, so the card can only turn back once the row has neither. The spec, R4 and T017 say it turns back "after the row is left **or** emptied", which reads as either one being enough. T014 says "blurred **and** emptied".  

  - **Recommendation A** _(recommended)_: Say "once the row is both left and empty" in the spec, R4 and T017, to match the guard and T014.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: A wording change only; typed text is never lost to a turn the voter did not ask for.  
    - <u>Cons</u>: A voter who leaves text in the row and clicks elsewhere keeps an over-full compact ballot (bars at the floor height) until they empty it.  

  - **Recommendation B**: Skip the turn-back only while the row has focus; once the row is left, the next refresh turns the card back and drops any text, as any flip does (FR-025). Change the guard in T017, R4, the spec edge case, the data model and T014.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: The over-full ballot lasts only while the voter is in the row.  
    - <u>Cons</u>: Text left in the row is lost without the voter turning the card; more files change.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · LOW · tasks.md T011; contracts V5  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-23 9:07 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-23: Recommendation. tasks.md T011: `fitLabel` measures the label's own `scrollWidth` against its `clientWidth`, not the button's.  

  `fitLabel` compares `scrollWidth` with `clientWidth` without naming the element. Now that the label fills the cell exactly, it matters whether the label or the button is measured.  

  - **Recommendation**: State that it measures `.btn-vote-label` (the label's `scrollWidth` against its own `clientWidth`).  

    ➡️ [X] **Accepted**  
    - The label is the element that overflows under the new width rule, so measuring it is what detects a label that does not fit.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · LOW · plan.md Source Code (`site.css` line) and "Decisions that are easy to get wrong"  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ plan.md Updated: 2026-11-23 9:07 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-23: Recommendation. plan.md: the `site.css` line in Source Code and the "sizers keep today's labels" Decision now record `.btn-vote-label{width:0; min-width:100%}` (and `.top-submit-btn` in the grid rules), and why `fitLabel` depends on it.  

  The plan doesn't record the new label-width rule from the earlier I1 resolution. Its `site.css` line mentions only the `margin-left` move, and the Decisions list says only that "the sizers keep today's labels".  

  - **Recommendation**: Add the label-width rule to the plan's `site.css` line and to that Decisions bullet.  

    ➡️ [X] **Accepted**  
    - The plan is what CLAUDE.md points implementers at, so the decision most likely to be missed is recorded there.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **F1** · Inconsistency · LOW · tasks.md T028, T031 (both [P], both edit `pollCard-m3.css`); T013, T019, T032 (all edit `index.html`)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-23 9:13 PM  
  **Notes**: Recommendation accepted in file 2026-11-23: Recommendation A. tasks.md Phase Dependencies: tasks in different stories that edit the same file run in ID order even when marked [P]: `pollCard-m3.css` (T028, T031), `index.html` (T002, T013, T019, T032), `phone-card-m3.css` (T013, T019, T020).  

  The Dependencies section says US4 and US5 are independent of each other, so T028 and T031 could run at the same time on one file. Likewise T013 (US1), T019 (US2) and T032 (US5) all edit `index.html`.  

  - **Recommendation A** _(recommended)_: Add to Dependencies that tasks in different stories which edit the same file (`pollCard-m3.css`, `index.html`, `phone-card-m3.css`) run in ID order.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: One line; the [P] markers keep their meaning within each story.  
    - <u>Cons</u>: The rule sits in Dependencies, not on each task line.  

  - **Recommendation B**: Remove [P] from T031 and T032, so only one task in each shared file is marked parallel.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: The marker on each task line is always right.  
    - <u>Cons</u>: Loses parallelism within US5, where T031 and T032 do not share a file with T030.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **E1** · Coverage · LOW · FR-005, SC-005; tasks.md T008, T011, T012  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-23 9:07 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-23: Recommendation. tasks.md T008: in `poll-card-assets.test.ts`'s `site.css` button-sizing describe, assert the label-width rule and `.top-submit-btn` in the grid and stacking rules, and update the two existing sizing cases (V5 added).  

  jsdom has no layout, so the width behaviour has only a manual check (quickstart 15). The `site.css` rule it depends on has no automated guard. Also, the existing `poll-card-assets.test.ts` cases "stacks the Vote label and its sizer in one grid cell" and "carries the width sizer…" will need updating, but no task names them.  

  - **Recommendation**: Extend T008 to assert that `site.css` has the label-width rule and that `.top-submit-btn` is in the grid rules, and to update those two existing cases.  

    ➡️ [X] **Accepted**  
    - Guards the one rule FR-005 depends on, in the suite that already pins these button rules.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 | ✅ | T009, T012, T008 | |
| FR-002 | ✅ | T010, T007 | |
| FR-003 | ✅ | T009, T008 | |
| FR-004 | ✅ | T013, T008 | |
| FR-005 | ✅ | T010, T011, T012 | see U1, E1 |
| FR-006 | ✅ | T018, T019, T014 | |
| FR-007 | ✅ | T003, T006, T023, T014, T022 | |
| FR-008 | ✅ | T001, T004, T020 | |
| FR-009 | ✅ | T004, T006 | |
| FR-010 | ✅ | T005, T017, T023 | |
| FR-011 | ✅ | T015, T014 | |
| FR-012 | ✅ | T015, T014 | |
| FR-013 | ✅ | T015, T014 | |
| FR-014 | ✅ | T015, T014 | |
| FR-015 | ✅ | T015, T014 | |
| FR-016 | ✅ | T024, T022 | |
| FR-017 | ✅ | T022 | |
| FR-018 | ✅ | T026, T027, T025 | |
| FR-019 | ✅ | T027, T025 | |
| FR-020 | ✅ | T026, T027, T028, T025 | |
| FR-021 | ✅ | T030, T031, T029 | |
| FR-022 | ✅ | T030, T032, T029, T037 | |
| FR-023 | ✅ | T032, T029 | |
| FR-024 | ✅ | T034, T033 | |
| FR-025 | ✅ | T005, T016, T017, T021, T014 | see A1 |
| SC-001 | ✅ | T015 | |
| SC-003 | ✅ | T027 | |
| SC-004 | ✅ | T029, T035, T037 | |
| SC-005 | ✅ | T011, T012 | manual only; see E1 |
| SC-006 | ✅ | T029, T032 | |

SC-002 is a usability check with users and needs nothing built, so it is left out.

## Constitution Alignment Issues

- C1 (Principle VI and the Governance scope clause).
- I1: three documents state the scope clause more narrowly than the constitution does.

## Unmapped Tasks

None.

## Metrics

- Total requirements: 30 (25 FR, 5 buildable SC)
- Total tasks: 39
- Coverage: 100% (30 of 30)
- Ambiguity count: 2 (A1, U1)
- Duplication count: 0
- Critical issues: 1

## Next Actions (as reported)

- **C1 is critical; resolve it before `/speckit-implement`.** It is the same kind of finding as the earlier C1, now for the CSS tasks, and is fixed by rewording T012 (plus T013, T019 and T028).
- **Fix I1 together with C1**, so the plan and the task notes no longer state the narrower rule.
- **The medium and low findings are wording changes** to the spec, research, plan and tasks.
- **To work through the findings, run `/speckit-analyze-findings`.** It records this report as a new `analyze-findings.md`, after backing up the current one.
