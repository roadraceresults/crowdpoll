# Specification Analysis Report — specs/20261119-144614-POLL-ADMIN-IMPROVEMENTS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261119-144614-POLL-ADMIN-IMPROVEMENTS |
| Report created | 2026-11-19 063633 PM |
| Analysis captured | 2026-11-19 063633 PM |
| Last updated | 2026-11-19 063906 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · LOW · quickstart.md §5, §7 (30 choices); spec SC-006 (50); tasks.md T002  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-19 6:39 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation A. tasks.md T001 now begins by making the quickstart's long poll 50 choices ("By hand", §5, §7); T002's bridging clause removed. quickstart.md itself is outside this skill's files and is changed by T001.  

  The quickstart still uses a 30-choice poll. T002 bridges it by saying "30" means "50", so the two files disagree.  

  - **Recommendation A** _(recommended)_: Change the quickstart's long poll to 50 choices in "By hand", §5 and §7, then drop the bridging clause from T002.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: The quickstart, the spec and T002 all say 50.  
    - <u>Cons</u>: quickstart.md is outside the files this skill may change: on acceptance, T001 gains a first step that makes this quickstart edit, and T002's clause is dropped.  

  - **Recommendation B**: Leave it as it is; T002 already tells the person walking the quickstart to read "30" as "50".  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: No change; SC-006 is still checked as written.  
    - <u>Cons</u>: The quickstart read alone says 30.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · LOW · research.md R13 ("`lockStep` keeps its step-3 line as it is"); tasks.md T050  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-19 6:39 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation A. tasks.md T058 now begins by replacing R13's "`lockStep` keeps its step-3 line as it is" with the step-3 lock covering "... edit". research.md itself is changed by T058.  

  After the earlier fix, T050 widens the step-3 lock to cover "... edit"; R13 still says the lock is left as it is.  

  - **Recommendation A** _(recommended)_: Change that R13 sentence to say the step-3 lock also covers the preview's "... edit" link.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: Research and tasks agree.  
    - <u>Cons</u>: research.md is outside the files this skill may change: on acceptance, T058 gains a step that makes this edit to R13.  

  - **Recommendation B**: Leave it as it is; T050 says it supersedes R13 on this point.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: No change.  
    - <u>Cons</u>: R13 read alone is out of date.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · LOW · contracts/api.md A2 ("the poll's save route"); tasks.md T003  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-19 6:39 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation A. tasks.md T005 now begins by naming `PATCH /api/admin/polls/:pid` in contracts/api.md A2. contracts/api.md itself is changed by T005.  

  T003 names `PATCH /api/admin/polls/:pid`; the contract still doesn't.  

  - **Recommendation A** _(recommended)_: Name the route in A2.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: The contract names the route its tests call.  
    - <u>Cons</u>: contracts/api.md is outside the files this skill may change: on acceptance, T005 gains a step that makes this edit to A2.  

  - **Recommendation B**: Leave it as it is; T003 names the route.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: No change.  
    - <u>Cons</u>: The contract read alone leaves the route unnamed.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · LOW · tasks.md T003 (link preview assertion); spec FR-023  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-19 6:39 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation. tasks.md T003's link preview assertion now names src/seo/pollPage.ts (summary and `og:description`) and the pattern of tests/seo.test.ts.  

  T003 checks "the page's link preview text" without saying where it comes from. It is built in `src/seo/pollPage.ts` (the poll summary and `og:description`) and tested in `tests/seo.test.ts`. That page lists choices from `poll.choices` and never reads the new setting.  

  - **Recommendation**: In T003, name `src/seo/pollPage.ts` and follow the pattern of `tests/seo.test.ts`, or move the assertion into that suite.  

    ➡️ [x] **Accepted**  
    - The assertion then has a definite target and an existing pattern to follow.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001–FR-010 | Yes | T013–T021 | |
| FR-011–FR-017 | Yes | T022–T026 | |
| FR-018–FR-020 | Yes | T003, T006–T010, T028, T033 | |
| FR-021, FR-022, FR-024 | Yes | T027, T029 | "Show fewer choices" now covered |
| FR-023 | Yes | T003, T027 | link preview now covered (U1) |
| FR-025 | Yes | T003, T027, T031 | delta client now covered |
| FR-026–FR-028 | Yes | T003, T008, T047, T049 | |
| FR-029–FR-034 | Yes | T035–T045 | FR-032's "page behind" is now tested |
| FR-035–FR-043 | Yes | T046–T054 | FR-043 now also holds in the preview |
| FR-044, FR-045 | Yes | T055, T056 | |
| FR-046–FR-048 | Yes | T005, T011, T058–T060 | |
| SC-001, SC-006 | Yes | T002, T060 | measured by hand; I1 |
| SC-002–SC-005, SC-007–SC-009 | Yes | across story phases, T060 | |

## Constitution Alignment Issues

None. The comment fix from D1 is now in T018.

## Unmapped Tasks

None.

## Metrics

- Total Requirements: 48 FR + 9 SC (57)
- Total Tasks: 62
- Coverage: 100%
- Ambiguity Count: 0
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

All four findings are LOW and none affects how the work is done, so you can run `/speckit-implement` now. If you want
the supporting files to match first, fix I1–I3 by hand, or capture this report with `/speckit-analyze-findings`. Note
that the findings skill may only edit `spec.md`, `plan.md` and `tasks.md`, so I1–I3 would still need a hand edit.
