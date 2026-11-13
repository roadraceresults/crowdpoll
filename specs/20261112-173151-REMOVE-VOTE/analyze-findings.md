# Specification Analysis Report — specs/20261112-173151-REMOVE-VOTE

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261112-173151-REMOVE-VOTE |
| Report created | 2026-11-12 060549 PM |
| Analysis captured | 2026-11-12 060549 PM |
| Last updated | 2026-11-12 061328 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · MEDIUM · spec.md SC-004; plan.md R6; tasks.md T010  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-12 6:13 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation A; SC-004 now allows the card label test's selector and sizer values to follow the new button structure, beside the empty-selection rule.  

  SC-004 promises the existing suite passes "without modification of its expectations, apart from the one rule that an empty selection used to be refused", but R6/T010 change the `client-home` label test to read `.btn-vote-label` and expect new sizer values, because the back button gains hidden sizer text.  

  - **Recommendation A** _(recommended)_: Amend SC-004 to also allow the label test's selector and sizer expectations to follow the new button structure (or phrase it as "no behavioural expectation changes").  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the success criterion states what is actually true after R6; the sizer change (FR-004) is kept.  
    - <u>Cons</u>: one more exception named in a success criterion.  

  - **Recommendation B**: Keep SC-004 as written and drop the back button's sizer restructure (R6, T010, T014), accepting that the back button's width may change slightly between "Submit vote" and "Remove vote".  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: smaller change to the card and no test rewrite.  
    - <u>Cons</u>: contradicts FR-004 (one width for all three labels) and requirements decision NC1.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · MEDIUM · tasks.md T013, T014, Parallel Opportunities  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-12 6:13 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation A; T013 is now the template-and-sizers task and T014 the state-and-label task; the dependency, parallel, US2 and strategy lines name the order.  

  T013 writes the label to the back button's `.btn-vote-label`, a span that only exists after T014 changes the template; the list orders T013 before T014 and only says they "run one after the other".  

  - **Recommendation A** _(recommended)_: Swap T013 and T014 (template and sizers first), renumbering so the ids stay in execution order, and say "T013 (template) before T014 (state and label)" in the dependency section.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the task ids read in execution order, as the format requires.  
    - <u>Cons</u>: two task descriptions trade places; the parallel section's references follow.  

  - **Recommendation B**: Keep the order and add "T014 before T013" to Within Each User Story and Parallel Opportunities.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the smallest edit.  
    - <u>Cons</u>: ids out of execution order, which the checklist format discourages.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage · MEDIUM · spec.md FR-015; tasks.md T003–T005  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-12 6:13 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation; T005 asserts the trending bucket unchanged and `ever_voted` still true after a removal, and the bucket +1 after a re-vote.  

  FR-015 (a removal does not reduce the trending bucket and leaves `ever_voted` true) is implemented by T003 but asserted by no test.  

  - **Recommendation**: Add to T005: after a removal the hour's `trend:*` bucket count for the pid is unchanged and `polls.ever_voted` is still true; after a re-vote the bucket is +1.  

    ➡️ [x] **Accepted**  
    - FR-015 gets a test, as Principle IV asks; the assertion fits the existing `votes-path` harness, which already reads cache keys and rows.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage · LOW · tasks.md T005  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-12 6:13 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation; T005 adds the vote, runOnce, removal, runOnce case proving the `voted` relation row is deleted.  

  The consumer test puts the vote and the removal in one batch, where no `voted` relation is ever upserted, so it does not prove the new `DELETE` removes a relation written by an earlier batch (T006 proves it only indirectly through the tab).  

  - **Recommendation**: Add to T005 a case: vote, `runOnce`, removal, `runOnce` → the `user_polls` row is gone.  

    ➡️ [x] **Accepted**  
    - The consumer's one new statement (R4) is then tested directly where it lives.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · LOW · tasks.md T015; research.md R5  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-12 6:13 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation; T015 names where the relations are read from: `state.overlay.get(pid) || state.cards.get(pid).overlay`.  

  T015 filters "the current overlay's relations" but `toPollDetail` reads `state.overlay.get(pid) || card.overlay`; the task does not say which of the two to read the relations from.  

  - **Recommendation**: State in T015: read `(controller.state.overlay.get(pid) || controller.state.cards.get(pid).overlay || {}).relations`.  

    ➡️ [x] **Accepted**  
    - The task becomes executable without re-deriving `toPollDetail`'s lookup order.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · LOW · spec.md FR-017; tasks.md T009  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-12 6:13 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation; T009 asserts `.vote-btn` is disabled after the removal and re-enables after `nextRefreshMs`.  

  FR-017 requires the Vote button to be held after a removal; T009's assertions do not include the hold.  

  - **Recommendation**: Add to T009: after the removal `.vote-btn` is disabled and re-enables after `nextRefreshMs`.  

    ➡️ [x] **Accepted**  
    - The last unasserted clause of FR-017 gets its test.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **D1** · Duplication · LOW · spec.md FR-013, FR-017  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-12 6:13 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation A; FR-013 covers the tabs only and points at FR-017 for the card's "You voted".  

  Both requirements state that the card stops saying "You voted".  

  - **Recommendation A** _(recommended)_: Keep it in FR-017 (the card after a removal) and let FR-013 cover the tabs only.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: one requirement per fact; FR-013 reads as the tabs' rule, FR-017 as the card's.  
    - <u>Cons</u>: FR-013's wording changes slightly; the requirements document's UA3 decision still mentions the card, which is fine as a decision record.  

  - **Recommendation B**: Leave both as they are; the duplication is harmless.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no edit.  
    - <u>Cons</u>: two places to keep in step if the card's behaviour changes.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 | ✓ | T009, T013 | |
| FR-002 | ✓ | T009, T013 | |
| FR-003 | ✓ | T018, T013, T019 | |
| FR-004 | ✓ | T010, T014 | |
| FR-005 | ✓ | T009, T013 | no confirmation step exists to test; covered by the single click |
| FR-006 | ✓ | T009 (multi variant), T013 | |
| FR-007 | ✓ | T020, T011, T022 | |
| FR-008 | ✓ | T017, T002 | |
| FR-009 | ✓ | T017, T002 | |
| FR-010 | ✓ | T020, T021, T022 | |
| FR-011 | ✓ | T004, T005, T007, T008, T011, T012 | |
| FR-012 | ✓ | T005, T007 | |
| FR-013 | ✓ | T006, T012, T015 | |
| FR-014 | ✓ | T004, T005, T006, T011 | |
| FR-015 | ✓ | T003 | implementation only; no test (C1) |
| FR-016 | ✓ | T020, T011 | |
| FR-017 | ✓ | T009, T013 | hold not asserted (U2) |
| FR-018 | ✓ | T009, T013 | |
| FR-019 | ✓ | T023 | |
| FR-020 | ✓ | T024 | |
| SC-004 (full suite) | ✓ | T026 | wording conflict (I1) |
| SC-005 (one voter counted once) | ✓ | T005, T004 | |

SC-001, SC-002, SC-003 are outcomes verified by the tests above and the quickstart; they need no buildable work of their own.

## Constitution Alignment Issues

None reported. The plan's gate passes before and after design; T024/T025 carry the mandated documentation phase; no requirement ids are to be written into source (Principle VI); `countVote`'s callers stay untouched (Principle III).

## Unmapped Tasks

None reported. T001 (baseline) and T026–T027 (full suite, manual quickstart) are verification tasks serving every story.

## Metrics

- Total Requirements: 20 FR + 2 buildable SC = 22
- Total Tasks: 27
- Coverage %: 100% (every key has at least one task)
- Ambiguity Count: 0
- Duplication Count: 1
- Critical Issues Count: 0

## Next Actions (as reported)

No CRITICAL issues; implementation may proceed. The two MEDIUM items are worth fixing first: amend SC-004's wording in `spec.md` (I1), swap or annotate T013/T014 in `tasks.md` (I2), and add the FR-015 assertions to T005 (C1). The remaining LOW items are small edits to `tasks.md` (T005, T009, T015) and `spec.md` (FR-013).
