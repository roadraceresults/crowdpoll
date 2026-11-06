# Specification Analysis Report — specs/20261105-161242-SOCIAL-LOGIN-AVATAR

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261105-161242-SOCIAL-LOGIN-AVATAR |
| Report created | 2026-11-05 080442 PM |
| Analysis captured | 2026-11-05 080442 PM |
| Last updated | 2026-11-05 080911 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **U1** · Underspecification · HIGH · spec.md Assumptions, contracts/ui-contracts.md C6, FR-025  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ ui-contracts.md spec.md requirements.md Updated: 2026-11-05 8:09 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation A, added the sentence on the public address, the day's delay and copies outside Canada to C6 (contracts/ui-contracts.md) and FR-024 (spec.md), and to the IN2 decision (requirements.md).  

  The Privacy Policy wording doesn't say the picture sits at a public address, that a deleted picture can stay reachable for up to a day, or that the CDN may hold copies outside the "Toronto, Canada" given for DigitalOcean. The edge locations weren't confirmed.  

  - **Recommendation A** _(recommended)_: Add one sentence to C6 and FR-024: "The copy is kept on our content delivery network at an address that cannot be guessed and that we give only to you, though anyone holding that address could load it. If you delete your account it is removed within minutes, a cached copy can last up to a day, and the network may hold cached copies outside Canada."  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the policy says what actually happens to a photograph, before each account accepts the new version.  
    - <u>Cons</u>: more legal text, for a detail few people read; the wording is yours to adjust.  

  - **Recommendation B**: Leave the wording as in C6.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the shortest policy, matching the IN2 decision as written.  
    - <u>Cons</u>: the policy says nothing about a public address, a day's delay or copies outside Canada.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · MEDIUM · tasks.md T005, src/server.ts:76, src/server.ts:209, tests/helpers/setup.ts:112  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-05 8:09 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation, T005 (tasks.md) now builds the store before `createAuth`, passes it through `AppDeps`, and gives the harness an explicit fake.  

  T005 puts the store on `AppContext`, but `createAuth` runs before `createAppContext`, both in the server and in the test harness. The tests of A1 also need `config.spaces` without creating a real S3 client.  

  - **Recommendation**: Build the store before `createAuth`, pass it in through `AppDeps`, and give the harness an explicit fake.  

    ➡️ [x] **Accepted**  
    - T005 is reworded to say this; `createAppContext` takes the store from `deps` instead of building it.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U3** · Underspecification · MEDIUM · contracts/ui-contracts.md C4 and C5, src/public/admin-card-m3.css:768  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ ui-contracts.md tasks.md Updated: 2026-11-05 8:09 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation, the moved rule takes the cookie banner's offset, in C5 (contracts/ui-contracts.md) and T023 (tasks.md).  

  The moved snackbar rule uses `bottom:16px` with no `--cookie-banner-offset`, unlike `card-shell-m3.css:86`. On `/` it can collide with the cookie banner, and a first-time visitor is exactly who sees both.  

  - **Recommendation**: Add the offset when moving the rule, and test it.  

    ➡️ [x] **Accepted**  
    - C5 and T023 gain `bottom:calc(16px + var(--cookie-banner-offset, 0px))`; the admin page simply benefits.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · MEDIUM · requirements.md UA5, research.md R3  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ requirements.md Updated: 2026-11-05 8:09 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation A, one day confirmed by the developer; the UA5 decision (requirements.md) now names it, and research R3 already says it.  

  The requirements say "a long, immutable `Cache-Control`", while the plan chose one day to limit how long a deleted picture stays reachable. The developer hasn't approved this departure.  

  - **Recommendation A** _(recommended)_: Have the developer confirm one day, and record it in the requirements' decision trail.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: a deleted photograph is gone from the CDN within about a day; the only cost is one extra load a day, by its owner.  
    - <u>Cons</u>: it departs from the wording of the UA5 decision.  

  - **Recommendation B**: Keep the requirements' wording: one year, and change research R3, the data model and the plan.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: matches UA5 as written, and the fewest possible reloads.  
    - <u>Cons</u>: a deleted photograph could stay reachable through the CDN for up to a year, with no purge.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · spec.md FR-009, SC-002, research.md R9  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-05 8:09 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation, FR-009 (spec.md) now covers fetching and storing, about 3 seconds in all.  

  FR-009 limits the fetch to about 3 seconds, while the plan limits the fetch and upload together. A slow upload could pass FR-009 and still break SC-002.  

  - **Recommendation**: Reword FR-009 to cover fetching and storing.  

    ➡️ [x] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage · LOW · spec.md FR-014, tasks.md  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ quickstart.md Updated: 2026-11-05 8:09 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation, quickstart Q1 (quickstart.md) now checks that the CDN's root address lists nothing.  

  Nothing checks that the bucket can't be listed. The Terraform already makes it private, and only a check is missing.  

  - **Recommendation**: Add it to quickstart Q1.  

    ➡️ [x] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage · LOW · spec.md FR-017, tasks.md T007, T011  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-05 8:09 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation, T007 (tasks.md) now asserts that a stored change drops the session's cached copy.  

  T011 drops the session's cached copy, but no test asserts it.  

  - **Recommendation**: Add the assertion to T007.  

    ➡️ [x] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C3** · Unmapped task · LOW · tasks.md T031  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-05 8:09 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation, T031 removed from tasks.md; the numbering of the other tasks is kept.  

  T031 only says to update a test if it fails, and `npm test` in T034 already catches that.  

  - **Recommendation**: Remove T031.  

    ➡️ [x] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001, FR-002 | Yes | T007, T010, T011 | |
| FR-003, FR-004 | Yes | T008, T012 | |
| FR-005, FR-006 | Yes | T007, T008, T010 | |
| FR-007 | Yes | T012, T035 | Checked manually in Q1 |
| FR-008, FR-009, FR-010 | Yes | T006, T010 | See A1 |
| FR-011, FR-012 | Yes | T007, T011 | |
| FR-013 | Yes | T004, T005, T010 | |
| FR-014 | Partial | T010 | Random key only; see C1 |
| FR-015 | Yes | T007, T008, T010 | |
| FR-016 | Yes | T008, T012, T013 | |
| FR-017 | Yes | T011 | No test; see C2 |
| FR-018 | Yes | T007, T010, T028, T029 | |
| FR-019 | Yes | T028, T030 | |
| FR-020 | Yes | T014, T015, T016 | |
| FR-021 | Yes | T018, T021 | |
| FR-022, FR-023 | Yes | T017, T019, T020, T022, T023 | See U3 |
| FR-024, FR-025, FR-026 | Yes | T025, T026 | See U1 |
| FR-027 | Yes | T027 | |
| FR-028 | Yes | T035 | Quickstart Q8 |
| SC-001, SC-002 | Yes | T007, T011, T035 | |
| SC-003 | Yes | T035 | Manual |
| SC-004 | Yes | T014 | |
| SC-005 | Yes | T017, T018 | |
| SC-006 | Yes | T028, T035 | |
| SC-007 | Yes | T027 | Existing Terms gate |

## Constitution Alignment Issues

None. The principle that the system "MUST respect user privacy" is a live consideration for U1, but the public address was the developer's explicit choice in IN1, so it is rated HIGH for disclosure rather than as a constitution violation.

## Unmapped Tasks

T031 (C3). T001 and T032–T034 are setup and project chores.

## Metrics

- Total Requirements: 35 (28 FR, 7 SC)
- Total Tasks: 35
- Coverage: 100% with at least one task (FR-014 is only partly covered)
- Ambiguity Count: 1
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

There are no critical issues. Resolve U1 before implementing, since it decides the legal wording, and U2 and U3 first too, because they affect the code you'd write. The rest are small edits.
