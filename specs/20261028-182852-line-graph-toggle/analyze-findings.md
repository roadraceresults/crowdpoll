# Specification Analysis Report — specs/20261028-182852-line-graph-toggle

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261028-182852-line-graph-toggle |
| Report created | 2026-10-29 1:13 PM (fifth `/speckit-analyze` run) |
| Analysis captured | 2026-10-29 1:13 PM |
| Last updated | 2026-10-29 1:18 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **C1** · Constitution · CRITICAL · README.md:324, 327, 357; tasks.md T034  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ README.md Updated: 2026-10-29 1:18 PM  
  **Notes**: Recommendation accepted in file 2026-10-29: Recommendation A, the three references to requirements/ and specs/ are removed from README.md; the sentences now describe the one-time SES, DNS and provider setup without pointing at project documents. Changed: README.md (Email and Sign-in with Google, Apple, Microsoft and Amazon sections).  

  The constitution's README rule says README MUST NOT reference other project documents. The three references (`requirements/…`, `specs/…`) predate this feature. T034 is marked done and says "no references to specs or requirements", but those lines remain.  

  - **Recommendation A** _(recommended)_: Remove the three references now, as part of T034.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: The README meets the constitution and T034's own wording.  
    - <u>Cons</u>: Touches a README section this feature did not otherwise change.  

  - **Recommendation B**: Keep the references and defer to the constitution's own follow-up TODO (next README regeneration), recording the exception in the plan.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: Keeps this feature's change surgical (Principle III).  
    - <u>Cons</u>: The README stays in breach of a MUST rule, and T034 stays marked done while its wording is not met.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · LOW · tasks.md:121; contracts/ui-contracts.md:29; quickstart.md:62  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md quickstart.md contracts/ui-contracts.md Updated: 2026-10-29 1:16 PM  
  **Notes**: Recommendation accepted in file 2026-10-29: Recommendation A, all three quotes now read "Results are not available yet". Changed: tasks.md (Phase 6 goal), quickstart.md (step 3), contracts/ui-contracts.md (C-graph switched-off line).  

  Three artifacts still quote the note as lowercase "results are not available". FR-014 and the spec's clarification now quote "Results are not available yet".  

  - **Recommendation A** _(recommended)_: Match all three quotes to FR-014.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: Every quotation of the note matches the code.  
    - <u>Cons</u>: None of note.  

  - **Recommendation B**: Leave them, since they paraphrase rather than quote.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: No change.  
    - <u>Cons</u>: The quotes differ from the note the viewer reads.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · LOW · tasks.md T020  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-29 1:16 PM  
  **Notes**: Recommendation accepted in file 2026-10-29: Recommendation A, T020 names the expected step-label list instead of a line number. Changed: tasks.md (T020).  

  T020 cites "the expected step labels at line 437". The labels array is at line 443 of `tests/client-admin-wizard.test.ts`.  

  - **Recommendation A** _(recommended)_: Drop the line number and name the array.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: The reference cannot go stale again.  
    - <u>Cons</u>: Slightly less direct for a reader looking for the line.  

  - **Recommendation B**: Keep the stale reference.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: No change.  
    - <u>Cons</u>: The task points at the wrong line.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · LOW · requirements/20261028-114023-line-graph-toggle/requirements-report.md:440  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ requirements/20261028-114023-line-graph-toggle/requirements-report.md Updated: 2026-10-29 1:18 PM  
  **Notes**: Recommendation accepted in file 2026-10-29: Recommendation A, the requirements report now says "next Refresh of the tab". Changed: requirements-report.md (finding line 440).  

  The report still says "next content refresh". The resolved I2 covered only the three artifacts it named.  

  - **Recommendation A** _(recommended)_: Change it to "next Refresh of the tab".  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: One term for the viewer's refresh in every artifact.  
    - <u>Cons</u>: Edits a requirements record outside this feature's own folder.  

  - **Recommendation B**: Leave it, as the report is a record of the requirements pass.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: The requirements record stays as it was written.  
    - <u>Cons</u>: The term stays inconsistent with the spec.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 | Yes | T002–T007 | |
| FR-002 | Yes | T009–T010, T017, T026 | |
| FR-003 | Yes | T010, T026 | |
| FR-004 | Yes | T016, T020 | |
| FR-005 | Yes | T018, T020 | |
| FR-006 | Yes | T018 | |
| FR-007 | Yes | T011, T013, T014 | |
| FR-008 | Yes | T012, T015 | |
| FR-009 | Yes | T029, T030 | |
| FR-010 | Yes | T022, T025 | |
| FR-011 | Yes | T021, T023 | |
| FR-012 | Yes | T007, T024 | |
| FR-013 | Yes | T008, T027 | |
| FR-014 | Yes | T031, T032 | |
| FR-015 | Partial | T036 | Existing line-graph suites rerun; no new test. |
| FR-016 | Yes | T036 | `tests/cookie-use-list.test.ts` checks the cookie list. |
| SC-001 | Partial | T037 | Manual only, by design. |
| SC-002 | Yes | T026, T028 | |
| SC-003 | Yes | T002, T003 | Default `false` plus migration test. |
| SC-004 | Yes | T011, T012 | |
| SC-005 | Yes | T021, T022 | |
| SC-006 | Yes | T029 | |

## Constitution Alignment Issues

- Documentation Deliverables (README rule): C1 above.
- Documentation Deliverables (task list): T033–T035 are present in the Final Phase.
- Principle VI (comments): not re-checked in this pass; the earlier session's diff check was clean.

## Unmapped Tasks

None. T001 and T033–T037 carry no story label, which the template allows for setup and polish.

## Metrics

- Total requirements: 22 (16 FR, 6 SC)
- Total tasks: 37 (T001–T037)
- Coverage: 22 of 22 requirements have at least one task (100%). Partial: FR-015, SC-001.
- Ambiguity count: 0
- Duplication count: 0
- Critical issues: 1 (C1)

## Next Actions (as reported)

- C1 is CRITICAL and should be resolved before this feature is treated as complete. It is pre-existing, but T034 claims to have cleared it. Choose A or B.
- I1–I3 are wording and reference fixes that can be applied in one pass.
- Once C1 is resolved, run `/speckit-analyze-findings` again if a new report is wanted.
