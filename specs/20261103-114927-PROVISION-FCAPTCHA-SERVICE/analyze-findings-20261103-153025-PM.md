# Specification Analysis Report — specs/20261103-114927-PROVISION-FCAPTCHA-SERVICE  

## Record  

| Record | Value |
|---|---|
| Feature directory | specs/20261103-114927-PROVISION-FCAPTCHA-SERVICE |
| Report created | 2026-11-03 031152 PM |
| Analysis captured | 2026-11-03 031152 PM |
| Last updated | 2026-11-03 032330 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save  
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.  
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.  
"Next" always returns the first open finding below.  

## Findings  

### **I4** · Inconsistency · MEDIUM · quickstart.md Runbook 4 and 5; tasks.md T018, T019; spec.md FR-016  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ quickstart.md Updated: 2026-11-03 3:23 PM  
  **Notes**: Recommendation accepted in file 2026-11-03, applied by "Accept all": the Recommendation; quickstart.md Runbook 4 gains the CDN endpoint and the DNS-zone check (SES records kept), Runbook 5 gains noting the time, re-applying after a failure, and the encrypted state backup with both files kept out of cloud-synced folders.  

  T018 and T019 cite the quickstart Runbook, but the Runbook wasn't updated. It has no CDN-endpoint deletion and no DNS-zone check, and still says "back up somewhere private" instead of an encrypted backup.  

  - **Recommendation**: Update quickstart Runbook 4 and 5 to match T018, T019 and FR-016.  

    ➡️ [x] **Accepted**  
    - Runbook 4 gains the CDN endpoint (deleted before the bucket) and the check of the `crowdpoll.vote` DNS zone for records the old app left, keeping the SES records. Runbook 5 gains noting the time, and backing up the state in encrypted form (for example as a password-manager attachment), with it and the secrets file kept out of cloud-synced folders.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I5** · Inconsistency · LOW · research.md R5 ("recorded … in the README"); tasks.md T020 ("in quickstart.md"); spec.md FR-009 ("documented provider gap")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-03 3:23 PM  
  **Notes**: Recommendation accepted in file 2026-11-03, applied by "Accept all": Recommendation A; tasks.md T020 records scenario 3's outcome in README.md's deployment section, and T027's README text says what a second plan shows; research.md R5 already named the README.  

  The documented provider gap has two homes: R5 puts it in the README, T020 in `quickstart.md`.  

  - **Recommendation A** _(recommended)_: Make the README the record, since it outlives the feature folder. T020 records it there, and T027 mentions it.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: The operator reading the README later learns why a second plan shows SECRET changes; R5 stays as written.  
    - <u>Cons</u>: Changes T020 and T027; the README carries a provider detail that may go away with a later plugin version.  

  - **Recommendation B**: Keep the record in `quickstart.md`, and change R5 to say so.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: One edit to research.md; the README stays free of provider quirks.  
    - <u>Cons</u>: The feature folder is not where an operator looks after the feature ships, so the gap is easily forgotten.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U3** · Underspecification · LOW · spec.md FR-002 exception; tasks.md T010, T012  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-03 3:23 PM  
  **Notes**: Recommendation accepted in file 2026-11-03, applied by "Accept all": Recommendation A; tasks.md T010 adds `local.bucket_name` as the one place the name is written, and T012 builds `ENV_SPACES_BUCKET` and `ENV_SPACES_CDN_URL` from the bucket and CDN resources.  

  The bucket-rename exception needs the bucket name, `ENV_SPACES_BUCKET` and `ENV_SPACES_CDN_URL` to change together. T010 and T012 write `crowdpoll` in two places, so a rename means three hand edits.  

  - **Recommendation A** _(recommended)_: In T010 and T012, define the bucket name once (`local.bucket_name`), and build `ENV_SPACES_BUCKET` and `ENV_SPACES_CDN_URL` from the bucket and CDN resources.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: A rename under FR-002's exception is one edit, and the app can never point at a bucket or CDN that does not exist.  
    - <u>Cons</u>: `web_settings` refers to resources instead of plain literals, so `tests/infra-config.test.ts` checks a reference rather than a value.  

  - **Recommendation B**: Leave T010 and T012 as they are, and list the three places to change in T027's README text on the bucket rename.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: The settings map stays all literals, matching `.do/app.yaml` one to one.  
    - <u>Cons</u>: Three hand edits that must agree; a missed one only shows up when the app runs.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary  

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001, FR-001a | ✅ | T009–T014, T018 | |
| FR-002 | ✅ | T009, T010, T012 | U3 |
| FR-003, FR-004 | ✅ | T012, T013 | |
| FR-005 | ✅ | T013 | derived, test assertion |
| FR-006, FR-007 | ✅ | T007, T012, T013 | |
| FR-008, FR-009 | ✅ | T016, T020 | I5 |
| FR-010, FR-011 | ✅ | T001, T002, T016 | |
| FR-012 | ✅ | T032 | |
| FR-013, FR-014 | ✅ | T005–T008, T017 | |
| FR-015 | ✅ | T011–T013 | |
| FR-016 | ✅ | T019, T027 | I4 |
| FR-017 | ✅ | T004, T008, T021 | |
| FR-018 | ✅ | T005, T022 | |
| FR-019 | ✅ | T018, T019 | I4 |
| FR-020 | ✅ | T020 | |
| FR-021 | ✅ | T008, T021 | |
| FR-022 | ✅ | T020 | |
| FR-023 | ✅ | T022–T025 | |
| FR-024 | ✅ | T013, T016 | |
| FR-025, FR-026 | ✅ | T003, T024, T026–T030 | |
| SC-001 | ✅ | T019, T020 | |
| SC-002…SC-006 | ✅ | T020, T025, T032 | |

## Constitution Alignment Issues  

None reported.  

## Unmapped Tasks  

None reported.  

## Metrics  

- Total Requirements: 27 FRs + 6 SCs = 33  
- Total Tasks: 33  
- Coverage: 100 % (33 of 33)  
- Ambiguity Count: 0  
- Duplication Count: 0  
- Critical Issues Count: 0  

## Next Actions (as reported)  

Nothing is CRITICAL or HIGH, so `/speckit-implement` can start. I4 is worth fixing first: the quickstart is the runbook the operator follows during the switch-over. I5 and U3 can be fixed while implementing T010, T012 and T020.  
