# Specification Analysis Report — specs/20261028-182852-line-graph-toggle

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261028-182852-line-graph-toggle |
| Report created | 2026-10-28 (second `/speckit-analyze` run in this session; the exact time was not recorded) |
| Analysis captured | 2026-10-29 3:14 AM |
| Last updated | 2026-10-29 3:14 AM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **C5** · Coverage gap · MEDIUM · spec.md FR-011; plan.md R7; tasks.md T020, T022  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md tests/line-graph-setting.test.ts Updated: 2026-10-29 3:18 AM  
  **Notes**: Recommendation accepted in file 2026-10-29 3:18 AM: Recommendation A, tasks.md T020 names the switch-off case; tests/line-graph-setting.test.ts holds it.  

  Research R7 requires the 404 check to run before the cached body, so a switch takes effect on the next request. No test covers a graph served while on, then switched off.  

  - **Recommendation A** _(recommended)_: Add to T020 a case: serve the graph with the setting on, switch it off, and assert the next request answers `404`.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the switch-off rule is checked on the path that could serve a stale body.  
    - <u>Cons</u>: one more server test.  

  - **Recommendation B**: accept T022's read order without a test.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no new test.  
    - <u>Cons</u>: a reordering of the check would go unnoticed.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · tasks.md T002  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md tests/line-graph-setting.test.ts Updated: 2026-10-29 3:18 AM  
  **Notes**: Recommendation accepted in file 2026-10-29 3:18 AM: Recommendation A, tasks.md T002 names the method; the test migrates down to 012 with the migrator, inserts, and migrates up (the pre-migration poll is inserted before the down step, because insertPoll writes the column).  

  T002 asks for a test where "a poll inserted before the migration" reads `false`. The test suites run migrations at start-up, so the method is not stated.  

  - **Recommendation A** _(recommended)_: Have T002 migrate down to `012-line-graph-tally`, insert a poll, migrate up, and assert `false`.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the test follows the real upgrade path.  
    - <u>Cons</u>: a little slower, and it depends on the migration's down step.  

  - **Recommendation B**: assert only the default on a new insert, and rely on quickstart step 1 for existing rows.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: a simpler test.  
    - <u>Cons</u>: the existing-row case is not automated.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C6** · Coverage gap · LOW · spec.md FR-013; tasks.md T008, T026  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-10-29 3:14 AM  
  **Notes**: Recommendation accepted in file 2026-10-29 3:14 AM: Recommendation A. tasks.md T026 already carries the search-route wording (added by hand earlier in this session), so no further edit was needed.  

  FR-013 covers the admin list and the admin search. T008 adds the field in `adminListRow`, which both routes use (`/api/admin/polls/search` at `pollsApi.ts:727`), but no test checks the search response. T026 covers only the creator's admin list row.  

  - **Recommendation A** _(recommended)_: Extend T026 to assert that `/api/admin/polls/search` rows carry `lineGraphEnabled`.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: the search route's rows are checked, not only the shared function.  
    - <u>Cons</u>: one more server assertion.  

  - **Recommendation B**: rely on the shared function and add no test.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no new test.  
    - <u>Cons</u>: a search route that stopped using the shared function would go unnoticed.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C7** · Coverage gap · LOW · spec.md FR-012; tasks.md T023  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-10-29 3:14 AM  
  **Notes**: Recommendation accepted in file 2026-10-29 3:14 AM: Recommendation A. tasks.md T023 already carries the deltaClient wording (added by hand earlier in this session), so no further edit was needed.  

  T007 tests the projection. Nothing tests that `deltaClient.js` copies `lineGraphEnabled` into the card (T023). T021 builds its card by hand, so it would not catch a missing copy.  

  - **Recommendation A** _(recommended)_: Add a test in T023 that a projection carrying the setting produces a card with it.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: the copy in `deltaClient.js` is checked.  
    - <u>Cons</u>: one more client test.  

  - **Recommendation B**: accept the gap; the maximize test covers the field only where the card is built by hand.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no new test.  
    - <u>Cons</u>: a missing copy in `deltaClient.js` would go unnoticed.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 | Yes | T002–T006 | |
| FR-002 | Yes | T010, T016, T017, T027 | |
| FR-003 | Yes | T010, T025 | |
| FR-004 | Yes | T015, T019 | |
| FR-005 | Partial | T017, T019 | No-choices case checked by hand only (quickstart 3.5) |
| FR-006 | Partial | T017 | Manual only |
| FR-007 | Yes | T011, T012, T038 | |
| FR-008 | Yes | T012, T014 | |
| FR-009 | Yes | T028, T029 | |
| FR-010 | Yes | T021, T024 | Matches the weakened wording in the spec, research R5 and C5 |
| FR-011 | Partial | T020, T022 | Cache-before-404 ordering untested (C5) |
| FR-012 | Partial | T007, T023 | Projection and version bump tested; the `deltaClient` copy is not (C7) |
| FR-013 | Partial | T008, T026 | Admin search rows untested (C6) |
| FR-014 | Yes | T030, T031 | |
| FR-015 | Weak | T035 | Manual check only |
| FR-016 | Weak | T035 | Manual check only |
| SC-001 | Partial | T036 | Manual only |
| SC-002 | Yes | T025, T027 | |
| SC-003 | Yes | T002, T036 | Depends on U1's method |
| SC-004 | Yes | T011, T012 | |
| SC-005 | Yes | T021 | |
| SC-006 | Yes | T028 | |
| Edge: no-choices note | Partial | T017 | Manual only (quickstart 3.5) |
| Edge: closed or in-review poll | Yes | T038 | |

## Constitution Alignment Issues

None reported. Principles V and VI are met, the post-implementation documentation phase is present (T033, T034), and `README.md` and `ARCHITECTURE.md` exist at the root.

## Unmapped Tasks

T001 (setup baseline), which needs no story.

## Metrics

- Total requirements: 22 (16 FR, 6 SC)
- Total tasks: 37 (T001–T036 plus T038)
- Coverage: 22 of 22 requirements have at least one task (100%). Eight are partial or weak: FR-005, FR-006, FR-011, FR-012, FR-013, FR-015, FR-016 and SC-001.
- Ambiguity count: 0
- Duplication count: 0
- Critical issues: 0

## Next Actions (as reported)

- No CRITICAL issues, so the work can go to `/speckit-implement`.
- C5 and U1 are MEDIUM. Fix both before implementation: C5 guards the rule that a switch-off takes effect on the next request, and U1 says how T002 creates the pre-migration state.
- C6 and C7 can wait until implementation.
