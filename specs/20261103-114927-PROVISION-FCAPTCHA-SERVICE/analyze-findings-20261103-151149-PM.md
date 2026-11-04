# Specification Analysis Report — specs/20261103-114927-PROVISION-FCAPTCHA-SERVICE

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261103-114927-PROVISION-FCAPTCHA-SERVICE |
| Report created | 2026-11-03 022456 PM |
| Analysis captured | 2026-11-03 022456 PM |
| Last updated | 2026-11-03 025028 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · HIGH · spec.md SC-002, FR-009; research.md R5; tasks.md T020  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-03 2:50 PM  
  **Notes**: Recommendation accepted in file 2026-11-03: Recommendation B, SC-002 and FR-009 now allow only a documented provider gap limited to SECRET env values in spec.md.  

  SC-002 requires "zero changes" on a second plan, but R5 / T020 accept a perpetual diff on SECRET values as a recorded provider gap, so SC-002 can fail while the task is "done".  

  - **Recommendation A**: keep SC-002 strict: a perpetual diff fails T020 and blocks completion.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: "no changes" stays a real guarantee that the configuration matches what runs.  
    - <u>Cons</u>: a provider bug outside the project's control could block the feature with no fix available here.  

  - **Recommendation B** _(recommended)_: reword SC-002 and FR-009 to "zero changes, apart from a documented provider gap limited to SECRET env values".  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: the criterion matches the plan (R5) and stays testable: any diff outside SECRET values still fails.  
    - <u>Cons</u>: if the gap appears, every plan carries noise on those values, and a real secret change is harder to spot.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · MEDIUM · spec.md FR-005; research.md R8; tasks.md T013  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md tasks.md Updated: 2026-11-03 2:50 PM  
  **Notes**: Recommendation accepted in file 2026-11-03: Recommendation, FR-005 now says the allowed hostnames are derived from the app's domains (spec.md); T013 adds the test assertion (tasks.md).  

  FR-005's "the preview MUST fail if a domain … is missing" cannot happen: the plan derives the allowed hostnames from the domain list, so the requirement's test cannot be run.  

  - **Recommendation**: reword FR-005 to "the allowed hostnames MUST be derived from the app's domains".  

    ➡️ [X] **Accepted**  
    - The spec then states the guarantee the design gives, and `tests/infra-config.test.ts` can check the derivation.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · MEDIUM · spec.md FR-002 vs Edge Cases ("the bucket takes a new name")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-03 2:50 PM  
  **Notes**: Recommendation accepted in file 2026-11-03: Recommendation A, FR-002 now names the bucket rename as its one exception, with ENV_SPACES_BUCKET and ENV_SPACES_CDN_URL following it (spec.md).  

  FR-002 says the names MUST be kept; an edge case allows renaming the bucket.  

  - **Recommendation A** _(recommended)_: make the bucket rename an explicit exception in FR-002, with `ENV_SPACES_BUCKET` and `ENV_SPACES_CDN_URL` following the new name.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: the switch-over cannot be blocked by a bucket name DigitalOcean has not released yet.  
    - <u>Cons</u>: the CDN address may change once, and the requirement gains an exception.  

  - **Recommendation B**: drop the rename from the edge case: the apply waits until the name is free.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: FR-002 stays absolute; the names never change.  
    - <u>Cons</u>: the site stays down for as long as the name is held, with no known bound.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · tasks.md T018; quickstart.md Runbook 4  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-03 2:50 PM  
  **Notes**: Recommendation accepted in file 2026-11-03: Recommendation, T018 now deletes the bucket's CDN endpoint before the bucket (tasks.md); quickstart.md is outside this skill's files and follows T018.  

  The old Spaces CDN endpoint is not in the deletion list; if it survives, creating the new CDN endpoint for the same origin fails.  

  - **Recommendation**: add the old CDN endpoint (deleted before the bucket) to T018 and to quickstart Runbook 4.  

    ➡️ [X] **Accepted**  
    - The deletion list then matches every resource `infra/` will create, so the apply meets no leftover.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage · MEDIUM · spec.md SC-001 (45 minutes)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-03 2:50 PM  
  **Notes**: Recommendation accepted in file 2026-11-03: Recommendation, T019 notes the start time and T020 records the time to the site answering against 45 minutes (tasks.md).  

  No task measures the apply's duration.  

  - **Recommendation**: in T019/T020, record the time from `terraform apply` to the site answering, against 45 minutes.  

    ➡️ [X] **Accepted**  
    - SC-001 becomes checked rather than assumed, at the cost of noting two times.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **S1** · Security · MEDIUM · spec.md FR-016; research.md R4; tasks.md T019, T027  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md tasks.md Updated: 2026-11-03 2:50 PM  
  **Notes**: Recommendation accepted in file 2026-11-03: Recommendation, FR-016 asks for an encrypted backup and both files out of cloud-synced folders (spec.md); T019 and T027 say so (tasks.md).  

  The state and the secrets file hold production secrets in plain text; "back it up somewhere private" is vague.  

  - **Recommendation**: specify an encrypted backup (e.g. a password-manager attachment) and keeping both files out of synced folders, in T019 / T027 and FR-016.  

    ➡️ [X] **Accepted**  
    - It keeps the accepted local-state decision (UA7) and makes its backup safe and testable.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · LOW · tasks.md T018; spec.md FR-001a  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-03 2:50 PM  
  **Notes**: Recommendation accepted in file 2026-11-03: Recommendation, T018 now checks the crowdpoll.vote zone for records the old app left, leaving the SES records (tasks.md).  

  Leftover records of the old app in the `crowdpoll.vote` zone are not checked before the new app claims the domain.  

  - **Recommendation**: after T018, check the DigitalOcean DNS zone for leftover app records and remove them (add to T018).  

    ➡️ [X] **Accepted**  
    - It avoids a domain claim failing on a stale record, and leaves the SES records alone.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage · LOW · spec.md FR-020  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-03 2:50 PM  
  **Notes**: Recommendation accepted in file 2026-11-03: Recommendation, T020 now checks /healthz and an account creation on the fresh database (tasks.md).  

  No check that the new databases start empty and the schema is created at start-up.  

  - **Recommendation**: add to T020: `/healthz` ok and an account creation works on the fresh database.  

    ➡️ [X] **Accepted**  
    - Scenario 7's sign-in email already exercises the database; this names the check.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C3** · Coverage · LOW · spec.md US3 acceptance scenario 2 ("previous version keeps serving")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-03 2:50 PM  
  **Notes**: Recommendation accepted in file 2026-11-03: Recommendation A, the spec's Assumptions note that a failed deployment leaving the previous version serving is platform behaviour, not tested (spec.md).  

  No task exercises a failing deployment.  

  - **Recommendation A** _(recommended)_: note it as untested platform behaviour in the spec's Assumptions.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: App Platform keeps the active deployment on a failed one by design; no risky test against production.  
    - <u>Cons</u>: the acceptance scenario stays unverified by this feature.  

  - **Recommendation B**: add an optional scenario deploying a deliberately broken build.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the scenario is proven, and the deploy command's failure output too.  
    - <u>Cons</u>: a broken commit on `main` and a revert, against the live site.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **S2** · Security · LOW · research.md R13  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-03 2:50 PM  
  **Notes**: Recommendation accepted in file 2026-11-03: Recommendation, T021 now replaces the all-buckets Spaces key with one limited to the crowdpoll bucket (tasks.md).  

  The Spaces key pair has access to all buckets, broader than FR-017's "limited to the resources it manages".  

  - **Recommendation**: after the switch-over, replace it with a key limited to the `crowdpoll` bucket (part of T021).  

    ➡️ [X] **Accepted**  
    - The all-buckets key is needed only while the bucket does not exist yet.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001, FR-001a | ✅ | T009–T014 | |
| FR-002 | ✅ | T009, T010, T012 | I3 |
| FR-003 | ✅ | T013 | |
| FR-004 | ✅ | T012 | |
| FR-005 | ✅ | T013 | I2 |
| FR-006, FR-007 | ✅ | T012, T013, T007 | |
| FR-008, FR-009 | ✅ | T016, T020 | I1 |
| FR-010, FR-011 | ✅ | T002, T016, T001 | |
| FR-012 | ✅ | T032 | |
| FR-013, FR-014 | ✅ | T005–T008, T017 | |
| FR-015 | ✅ | T011–T013 | |
| FR-016 | ✅ | T019, T027 | S1 |
| FR-017 | ✅ | T004, T008 | S2 |
| FR-018 | ✅ | T005, T022 | |
| FR-019 | ✅ | T018–T019 | U1, U2 |
| FR-020 | ⚠️ | T018 (implied) | C2 |
| FR-021 | ✅ | T008, T021 | |
| FR-022 | ✅ | T020 | |
| FR-023 | ✅ | T022–T025 | |
| FR-024 | ✅ | T013, T016 | |
| FR-025, FR-026 | ✅ | T026–T030, T003, T024 | |
| SC-001 | ❌ | — | C1 |
| SC-002…SC-006 | ✅ | T020, T032, T025 | |

## Constitution Alignment Issues

None reported. The plan's Constitution Check covers every principle; its documentation phase (T027–T028, T033) keeps the README self-contained.

## Unmapped Tasks

None reported. T031 and T033 are cross-cutting polish.

## Metrics

- Total Requirements: 27 FR + 6 SC = 33
- Total Tasks: 33
- Coverage: 32 of 33 with at least one task (97 %); SC-001 has none, FR-020 is implicit
- Ambiguity Count: 1 (I1)
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

No CRITICAL issues: implementation may proceed. Settle I1 first, because it decides what "done" means for US1. Fix U1 before the switch-over, because a leftover CDN endpoint would make the apply fail.
