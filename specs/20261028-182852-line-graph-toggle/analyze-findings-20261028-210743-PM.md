# Specification Analysis Report — specs/20261028-182852-line-graph-toggle

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261028-182852-line-graph-toggle |
| Report created | 2026-10-28 065913 PM |
| Analysis captured | 2026-10-28 065913 PM |
| Last updated | 2026-10-28 7:15 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **G1** · Coverage gap · HIGH · spec.md FR-010, US2 scenario 1, SC-005; tasks.md T024; index.html:141  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md research.md tasks.md contracts/ui-contracts.md quickstart.md Updated: 2026-10-28 7:15 PM  
  **Notes**: Recommendation accepted in file 2026-10-28 7:15 PM: Recommendation B, weakened FR-010 so the right-hand space may stay reserved when the graph is off. Changed spec.md (User Story 2, FR-010), research.md R5, tasks.md T024, contracts/ui-contracts.md C5 and quickstart.md step 4.3. No task added.  

  FR-010 requires no empty right-hand panel and the pre-graph layout when the graph is off. The template always renders `.maximized-space-right` (`index.html:141`, styled in `pollCard-m3.css:306` and `tabs.css:214`). T024 only skips the mount, so the space stays reserved. No task changes the template or CSS.  

  - **Recommendation A** _(recommended)_: **add a US2 task (next free id, T037) that omits or collapses `.maximized-space-right` when `lineGraphEnabled` is false, and extend T021 to assert the space is absent.**  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the no-empty-panel behavior is built and tested, not assumed.  
    - <u>Cons</u>: one more task and a CSS change in the maximized layout.  

  - **Recommendation B**: **weaken FR-010 so the right-hand space may stay reserved when the graph is off.**  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: no layout change.  
    - <u>Cons</u>: an empty panel stays on every poll that is off, which is most polls.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **P1** · Task ordering · MEDIUM · tasks.md T015 vs T016–T018, T029  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-28 7:15 PM  
  **Notes**: Recommendation accepted in file 2026-10-28 7:15 PM: Recommendation A, removed [P] from T015 and the matching line from Parallel opportunities.  

  T015 is marked `[P]` but edits `src/public/adminCard.js`, the same file as T016–T018 and T029. Running it in parallel risks conflicting edits.  

  - **Recommendation A** _(recommended)_: **remove `[P]` from T015.**  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the parallel marker matches what the files allow.  
    - <u>Cons</u>: none in practice.  

  - **Recommendation B**: **merge T015 into T016, so one task changes the step name and loads the admin flag.**  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no ordering question left.  
    - <u>Cons</u>: a larger task.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage gap · MEDIUM · spec.md Edge Cases; tasks.md  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-28 7:15 PM  
  **Notes**: Recommendation accepted in file 2026-10-28 7:15 PM: Recommendation A, added T038 to tasks.md (US1 tests) for the three clarified edge cases.  

  Three edge cases the spec states have no test task: two Administrators saving at once (last save wins), an Administrator removed from the list (the setting stays), and a change on a closed or in-review poll.  

  - **Recommendation A** _(recommended)_: **add a test task (next free id, T038) covering the three cases in `tests/line-graph-setting.test.ts`.**  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: each clarified behavior is checked.  
    - <u>Cons</u>: more server test setup.  

  - **Recommendation B**: **keep the edge cases as documented behavior only, with no test.**  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: smaller test work.  
    - <u>Cons</u>: the clarified behavior can regress unnoticed.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage gap · MEDIUM · spec.md FR-007, SC-004; tasks.md T011–T012  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-28 7:15 PM  
  **Notes**: Recommendation accepted in file 2026-10-28 7:15 PM: Recommendation A, T011 in tasks.md now casts a vote before and after the change and asserts both are accepted.  

  FR-007 requires that changing the setting never pauses voting beyond the open edit session. T011 and T012 check state and review, but not that votes are still accepted.  

  - **Recommendation A** _(recommended)_: **extend T011 to cast a vote before and after the change and assert both are accepted.**  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: FR-007 is checked directly.  
    - <u>Cons</u>: a longer test.  

  - **Recommendation B**: **rely on the existing vote suites and say so in the plan.**  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no new test.  
    - <u>Cons</u>: the rule is not checked for the setting itself.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · MEDIUM · spec.md Assumptions and FR-002; plan.md R3; service.ts `effectivePermissions`  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md research.md Updated: 2026-10-28 7:15 PM  
  **Notes**: Recommendation accepted in file 2026-10-28 7:15 PM: Recommendation A, spec.md (Assumptions) and research.md R3 now state that "Administrator" means the isAdminEmail rule only, not the permission string.  

  "Administrator" means an address in the administrator list (`isAdminEmail`). The codebase also grants an `Administrator` permission string to such users, which could be read as a second meaning.  

  - **Recommendation A** _(recommended)_: **state in spec and plan that "Administrator" means the `isAdminEmail` rule only, not the permission string.**  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: one meaning across the artifacts.  
    - <u>Cons</u>: none.  

  - **Recommendation B**: **use "administrator-list address" wording everywhere instead of "Administrator".**  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no overloaded word.  
    - <u>Cons</u>: wordier throughout, and it departs from the other admin-only features' wording.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **S1** · Underspecification · LOW · plan.md R2; store.ts `bumpContentVersion`  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ research.md Updated: 2026-10-28 7:15 PM  
  **Notes**: Recommendation accepted in file 2026-10-28 7:15 PM: Recommendation A, research.md R2 now records that each change queues one search outbox row through bumpContentVersion.  

  Making the setting a content field also writes a search outbox row on each change. The plan does not mention this side effect.  

  - **Recommendation A** _(recommended)_: **note the outbox write in plan R2.**  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the cost is recorded where the decision is.  
    - <u>Cons</u>: none.  

  - **Recommendation B**: **exclude the setting from content versioning and rely on the next full refresh instead.**  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no outbox write.  
    - <u>Cons</u>: contradicts FR-012 and R2, and open cards refresh later.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · LOW · tasks.md T001; plan.md project structure  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ plan.md Updated: 2026-10-28 7:15 PM  
  **Notes**: Recommendation accepted in file 2026-10-28 7:15 PM: Recommendation A, added checklists/baseline.md to plan.md's documentation tree.  

  T001 writes `checklists/baseline.md`, which the plan's documentation tree does not list.  

  - **Recommendation A** _(recommended)_: **add `checklists/baseline.md` to the plan's documentation tree.**  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the tree matches the files.  
    - <u>Cons</u>: none.  

  - **Recommendation B**: **drop the file and record the baseline in T001's completion note.**  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: one fewer file.  
    - <u>Cons</u>: the baseline is not kept as a file for comparison.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Underspecification · LOW · plan.md R12; pollsApi.ts line 727  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-28 7:15 PM  
  **Notes**: Recommendation accepted in file 2026-10-28 7:15 PM: Recommendation A, T008 in tasks.md now confirms the route that owns line 727 and corrects research R6 if needed.  

  The plan says the admin list and admin search both build rows through `adminListRow`. I confirmed the call sites but not which route owns line 727.  

  - **Recommendation A** _(recommended)_: **confirm the owning route during T008 and correct plan R6 if needed.**  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the claim is checked when the code is touched.  
    - <u>Cons</u>: the plan stays unconfirmed until then.  

  - **Recommendation B**: **mark plan R6 as "to be confirmed in T008" now.**  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the uncertainty is visible.  
    - <u>Cons</u>: the plan still reads as unverified.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C3** · Coverage gap · LOW · spec.md FR-015, FR-016; tasks.md T035  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-28 7:15 PM  
  **Notes**: Recommendation accepted in file 2026-10-28 7:15 PM: Recommendation A, T035 in tasks.md now checks that the configuration and cookie lists are unchanged and that the existing line-graph tests still pass.  

  FR-016 (no new configuration, cookie or storage key) has no check task. FR-015 (the graph unchanged) is covered only by the full suite in T035.  

  - **Recommendation A** _(recommended)_: **add to T035 a check that the configuration and cookie lists are unchanged, and that the existing line-graph tests still pass.**  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: both requirements get a check without a new task.  
    - <u>Cons</u>: the check is manual.  

  - **Recommendation B**: **add a dedicated task (next free id, T039) that asserts no new configuration key or cookie.**  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: an automated check.  
    - <u>Cons</u>: one more task.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C4** · Coverage gap · LOW · spec.md FR-004; tasks.md T019  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-28 7:15 PM  
  **Notes**: Recommendation accepted in file 2026-10-28 7:15 PM: Recommendation A, T019 in tasks.md now asserts that the Settings Summary link to step 4 still opens the View step.  

  FR-004 requires the Settings Summary link to still reach step 4. No task verifies it.  

  - **Recommendation A** _(recommended)_: **add the link assertion to T019.**  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the link is checked where the rename is checked.  
    - <u>Cons</u>: none.  

  - **Recommendation B**: **accept it unverified, since the rename leaves the step number alone.**  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no test change.  
    - <u>Cons</u>: a broken link would go unnoticed.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **D1** · Constitution · LOW · constitution.md Principle VI; pollsApi.ts neighbouring routes  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-10-28 7:15 PM  
  **Notes**: Recommendation accepted in file 2026-10-28 7:15 PM: Recommendation B, no task added; the comment rule is left to code review.  

  Principle VI bans comments that cite requirement or spec IDs. Nearby code already does (for example "012 FR-059"). The plan avoids this, but no task checks it.  

  - **Recommendation A** _(recommended)_: **add "no comment cites a spec, requirement or finding ID" to the T035 review.**  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the rule is checked on the new code.  
    - <u>Cons</u>: a manual review step.  

  - **Recommendation B**: **leave it to code review, with no task.**  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: nothing added.  
    - <u>Cons</u>: the rule can be broken unnoticed.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 | Yes | T002–T006 | |
| FR-002 | Yes | T010, T016, T017 | |
| FR-003 | Yes | T010, T025 | |
| FR-004 | Partial | T015, T019 | Summary link not verified (C4) |
| FR-005 | Yes | T017 | |
| FR-006 | Yes | T017 | |
| FR-007 | Partial | T011 | Voting not asserted (C2) |
| FR-008 | Yes | T012, T014 | |
| FR-009 | Yes | T028, T029 | |
| FR-010 | Partial | T021, T024 | Layout gap (G1) |
| FR-011 | Yes | T020, T022 | |
| FR-012 | Yes | T007, T023 | |
| FR-013 | Yes | T008, T026 | |
| FR-014 | Yes | T030, T031 | |
| FR-015 | Weak | T035 | Only the full suite (C3) |
| FR-016 | No | none | (C3) |
| SC-001 | Yes | T011, T017 | |
| SC-002 | Yes | T025, T027 | |
| SC-003 | Yes | T002, T036 | |
| SC-004 | Partial | T011, T012 | (C2) |
| SC-005 | Partial | T021 | Layout (G1) |
| SC-006 | Yes | T028 | |

## Constitution Alignment Issues

None reported. D1 is a verification gap, not a violation.

## Unmapped Tasks

T001 (setup baseline). It is a setup task and needs no story.

## Metrics

- Total requirements: 22 (16 FR, 6 SC)
- Total tasks: 36
- Coverage: 21 of 22 requirements have at least one task (95%). Five are only partly covered: FR-004, FR-007, FR-010, FR-015 and SC-004–SC-005.
- Ambiguity count: 1
- Duplication count: 0
- Critical issues: 0 (one HIGH, G1)

## Next Actions (as reported)

- G1 is HIGH and changes how T021 and T024 are built, so resolve it before `/speckit-implement`. Everything else is medium or low and can be fixed alongside.
- Run `/speckit-specify` or `/speckit-plan` to clarify "Administrator" (A1) and the layout approach (G1).
- Then edit `tasks.md` to add the layout task, the missing test cases, and the parallel-marker fix.
