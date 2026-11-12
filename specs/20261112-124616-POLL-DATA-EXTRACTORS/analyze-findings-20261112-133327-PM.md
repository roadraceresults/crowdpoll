# Specification Analysis Report — specs/20261112-124616-POLL-DATA-EXTRACTORS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261112-124616-POLL-DATA-EXTRACTORS |
| Report created | 2026-11-12 011123 PM |
| Analysis captured | 2026-11-12 011123 PM |
| Last updated | 2026-11-12 013140 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **C1** · Coverage · MEDIUM · spec.md SC-001; tasks.md T012, T018  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-12 1:31 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: tasks.md T012 now runs extract-all on every polldata/*.yaml configuration (7 today) and compares each with htmlparser's output (SC-001).  

  SC-001 requires 100% of the pages in `polldata/` to be extracted into files identical to htmlparser's, but T012 and T018 compare only one configuration of each kind. `polldata/` holds 7 configurations (dancing-with-the-stars, france, nba-2027-champion-yes-no, netflix_show, spain, trump_approval_rating_over_time, united-kingdom).  

  - **Recommendation**: Make T012 compare every `polldata/*.yaml` through `extract-all`; T018 keeps the per-kind runs.  

    ➡️ [x] **Accepted**  
    - SC-001 is then proven for every page the developer has today, for the cost of 7 runs and 7 comparisons.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · tasks.md T008, T011, T014–T017; plan.md Technical Context  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md plan.md Updated: 2026-11-12 1:31 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: tasks.md T008 adds the Vitest 3.2 rule (replace a missing API with its 3.2 equivalent, keeping every assertion), followed by T011 and T014–T017; plan.md Technical Context, Testing notes the Vitest ^5 → ^3.2 gap. research.md R4 is outside the files this skill may change and was left as is.  

  The moved tests were written for Vitest ^5, and this project runs Vitest ^3.2. R4 covers the TypeScript and Node gap, but no task says what to do if a Vitest API the tests use differs.  

  - **Recommendation**: Add to T008: "replace any API missing from Vitest 3.2 with its 3.2 equivalent, keeping every assertion"; T011 and T014–T017 follow the same rule; note the Vitest gap in plan.md's Technical Context and research R4.  

    ➡️ [x] **Accepted**  
    - The implementer has a rule to follow that keeps the tests' meaning, instead of improvising or upgrading Vitest.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · LOW · spec.md Key Entities; data-model.md  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-12 1:31 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: spec.md Key Entities, Configuration file now names the POLITICO page address and the price history (read for Polymarket, named but not read for POLITICO); Price history says the same.  

  The spec says the configuration file names "the Polymarket price history when needed" and leaves out `url`. data-model.md has `extract-politico` requiring both `url` and `input_history` (recorded, never opened).  

  - **Recommendation**: Amend the spec's Configuration file and Price history entities to name the page address and the POLITICO history the configuration records.  

    ➡️ [x] **Accepted**  
    - The spec and the data model then describe the same keys.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · spec.md SC-003; plan.md Performance Goals; tasks.md T022  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md plan.md tasks.md Updated: 2026-11-12 1:31 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation A; SC-003 in spec.md, Performance Goals in plan.md and T022 in tasks.md now bound the test-run growth at 5 seconds.  

  "No more than a few seconds" is not measurable (left Outstanding by `/speckit-clarify`).  

  - **Recommendation A** _(recommended)_: Fix a bound, "by no more than 5 seconds", in SC-003, the plan's Performance Goals and T022.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: T022 gets a pass/fail check; 21 small in-process test files fit easily in 5 seconds.  
    - <u>Cons</u>: The number is a judgement; a slow machine could brush it.  

  - **Recommendation B**: Leave the wording as it is.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: No change; the risk of a slow test run is low.  
    - <u>Cons</u>: SC-003's time part stays untestable.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · LOW · tasks.md T011  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-12 1:31 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: tasks.md T011 now says the usage assertions are the only dist/ mentions.  

  "Every other `dist/` mention follows R3": in every integration test, the only `dist/` mentions are the two usage assertions, so the clause points at nothing.  

  - **Recommendation**: Replace the clause with: "the usage assertions are the only `dist/` mentions".  

    ➡️ [x] **Accepted**  
    - The task no longer sends the implementer looking for something that is not there.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 five commands | Yes | T002, T010, T013 | |
| FR-002 same configuration files | Yes | T004, T008, T011 | via graphConfig and its tests |
| FR-003 identical output | Yes | T012, T018 | see C1 |
| FR-004 same messages, usage excepted | Yes | T005, T011, T014–T018 | |
| FR-005 no build, no htmlparser | Yes | T002 | |
| FR-006 only the closure | Yes | T004, T005, T010, T013 | Notes forbid the title extractor |
| FR-007 tests moved, pass | Yes | T006–T008, T011, T014–T018, T022 | |
| FR-008 project conventions | Yes | T004, T005, T009 | |
| FR-009 dev-only packages | Yes | T001 | |
| FR-010 source commit recorded | Yes | T023 | |
| FR-011 populate/app unchanged | Yes | T019 | |
| FR-012 README | Yes | T020 | |
| SC-001 100% of polldata identical | Partial | T012 | C1 |
| SC-002 two commands | Yes | T019 | |
| SC-003 tests pass, small time cost | Yes | T022 | A1 |
| SC-004 production install unchanged | Yes | T001 | |
| SC-005 fixtures < 1 MB | Yes | T006, T022 | |

## Constitution Alignment Issues

None. The documentation phase (T020 README, which must be self-contained; T021 ARCHITECTURE) is present, the Constitution Check gate passes, and no complexity is unjustified.

## Unmapped Tasks

None. T009 (type-check) maps to FR-008 and R4, and T023 to FR-010.

## Metrics

- Total requirements: 17 (12 FR, 5 SC)
- Total tasks: 23
- Coverage: 100% have at least one task (SC-001 only partially)
- Ambiguity count: 1
- Duplication count: 0
- Critical issues count: 0

## Next Actions (as reported)

There are no CRITICAL issues. C1 and U1 are worth resolving before `/speckit-implement`; the LOW items are wording. The remediation offer is replaced by `/speckit-analyze-findings`.
