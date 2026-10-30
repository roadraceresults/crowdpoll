# Specification Analysis Report — specs/20261028-182852-line-graph-toggle

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261028-182852-line-graph-toggle |
| Report created | 2026-10-28 9:07 PM |
| Analysis captured | 2026-10-28 9:07 PM |
| Last updated | 2026-10-28 10:05 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **C1** · Coverage gap · MEDIUM · spec.md FR-012 and Edge Cases ("open home-page card"); tasks.md T007, T023  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-28 10:05 PM  
  **Notes**: Recommendation accepted in file 2026-10-28 10:05 PM: Recommendation A, T007 in tasks.md now requires a test that the projection carries `lineGraphEnabled` and that a change bumps `content_version`.

  FR-012 requires that each poll's card data carries the setting, so an open card shows a change on its next content refresh. Nothing tests that the projection carries `lineGraphEnabled` or that a change bumps `content_version`. T007 and T023 are implementation tasks only.  

  - **Recommendation A** _(recommended)_: **add a test to T007 asserting that the projection carries the setting and that a change bumps `content_version`.**  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the content-refresh behaviour FR-012 depends on is checked automatically.  
    - <u>Cons</u>: one more server test.  

  - **Recommendation B**: **rely on quickstart step 6 (manual) and add no test.**  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no new test.  
    - <u>Cons</u>: a regression in the projection or the version bump goes unnoticed.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage gap · LOW · spec.md FR-005, FR-006; tasks.md T017, T019  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ quickstart.md Updated: 2026-10-28 10:05 PM  
  **Notes**: Recommendation accepted in file 2026-10-28 10:05 PM: Recommendation B, no test added; quickstart.md step 3 gains a step 5 for the no-choices case, to be checked by hand.

  FR-005 requires the checkbox for an Administrator in every case, including before the poll has choices. FR-006 requires the "Add your choices first" note in place of the pickers. No test covers the no-choices case; T019 and T027 check only the checked state and the creator's view.  

  - **Recommendation A** _(recommended)_: **extend T019 with a test for the no-choices case: the checkbox shows first and the note replaces the pickers.**  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: both FR-005 and FR-006 are checked automatically.  
    - <u>Cons</u>: a slightly larger client test.  

  - **Recommendation B**: **accept the manual check in quickstart step 3 and add no test.**  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: no new test.  
    - <u>Cons</u>: the empty-poll layout can regress unnoticed.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · LOW · spec.md Assumptions (lines 149–150); plan.md Summary; tasks.md Notes  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-28 10:05 PM  
  **Notes**: Recommendation accepted in file 2026-10-28 10:05 PM: the two Assumptions in spec.md now say the graph's code is already on this branch (commit `3f4b6de`) and that the setting is merged with it.

  The spec says the graph's code "come[s] into this feature's branch with it" and that the change ships "in one merge with the graph". The plan and the tasks say the graph is already on this branch (commit `3f4b6de`), and this feature adds only the setting.  

  - **Recommendation**: **reword the two Assumptions in `spec.md` to say the graph is already on this branch and this feature adds only the setting.**  

    ➡️ [x] **Accepted**  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **F1** · Format · LOW · tasks.md T038 (Phase 3, after T012)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-28 10:05 PM  
  **Notes**: Recommendation accepted in file 2026-10-28 10:05 PM: Recommendation A, T038 keeps its ID; the Notes section of tasks.md records that it is allocated out of sequence.

  T038 sits between T012 and T013, although it is the last ID in the list, and there is no T037. The format calls for sequential IDs in execution order.  

  - **Recommendation A** _(recommended)_: **keep T038 and state in `tasks.md` that the ID was allocated out of sequence.** Renumbering would break the references in the resolved records of the previous analysis.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: no ID changes.  
    - <u>Cons</u>: the ID order stays unusual.  

  - **Recommendation B**: **renumber T038 to T037 in `tasks.md`.**  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: sequential IDs.  
    - <u>Cons</u>: the earlier analysis records would name a task that no longer exists under that ID.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C3** · Coverage gap · LOW · spec.md SC-001; tasks.md T011, T021, T036  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-28 10:05 PM  
  **Notes**: Recommendation accepted in file 2026-10-28 10:05 PM: Recommendation A, T036 in tasks.md now names SC-001 as checked by hand, with no automated test added.

  SC-001 requires that a viewer sees the graph within one content refresh of an Administrator turning it on. Only the manual walk-through in T036 checks it; no automated test does.  

  - **Recommendation A** _(recommended)_: **accept the manual check and name SC-001 in T036's steps.**  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: no new test; the walk-through names what it proves.  
    - <u>Cons</u>: the end-to-end timing is not checked automatically.  

  - **Recommendation B**: **add an automated UI test that a maximized card with the setting on mounts the graph after a content refresh.**  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the path from setting to viewer is checked automatically.  
    - <u>Cons</u>: one more client test, against a timing that the graph's own refresh already covers.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 | Yes | T002–T006 | |
| FR-002 | Yes | T010, T016, T017 | |
| FR-003 | Yes | T010, T025 | |
| FR-004 | Yes | T015, T019 | |
| FR-005 | Partial | T017, T019 | No-choices case untested (C2) |
| FR-006 | Partial | T017 | No test (C2) |
| FR-007 | Yes | T011, T012 | |
| FR-008 | Yes | T012, T014 | |
| FR-009 | Yes | T028, T029 | |
| FR-010 | Yes | T021, T024 | Matches the weakened wording in spec, research R5, C5 |
| FR-011 | Yes | T020, T022 | |
| FR-012 | Partial | T007, T023 | No test (C1) |
| FR-013 | Yes | T008, T026 | |
| FR-014 | Yes | T030, T031 | |
| FR-015 | Weak | T035 | Manual check only |
| FR-016 | Weak | T035 | Manual check only |
| SC-001 | Partial | T036 | Manual only (C3) |
| SC-002 | Yes | T025, T027 | |
| SC-003 | Yes | T002, T036 | |
| SC-004 | Yes | T011, T012 | |
| SC-005 | Yes | T021 | |
| SC-006 | Yes | T028 | |
| Edge: setting change while open | Partial | T030 | Covered by the US4 path |
| Edge: closed or in-review poll | Yes | T038 | |

## Constitution Alignment Issues

None reported. Principles V and VI are met: the logging rules are in T010 and no task adds a comment citing spec IDs. The post-implementation documentation phase is present (T033, T034), and `README.md` and `ARCHITECTURE.md` both exist at the root.

## Unmapped Tasks

T001 (setup baseline). It is a setup task and needs no story.

## Metrics

- Total requirements: 22 (16 FR, 6 SC)
- Total tasks: 37 (T001–T036 plus T038)
- Coverage: 22 of 22 requirements have at least one task (100%). Six are partial or weak: FR-005, FR-006, FR-012, FR-015, FR-016 and SC-001.
- Ambiguity count: 0
- Duplication count: 0
- Critical issues: 0

## Next Actions (as reported)

- No CRITICAL issues. The work can go to `/speckit-implement`, but C1 (FR-012) is worth fixing first because it is a stated requirement with no test.
- Fix I1 in `spec.md` before implementation so the branch premise reads the same in every artifact.
- C2, F1 and C3 can wait until implementation.
