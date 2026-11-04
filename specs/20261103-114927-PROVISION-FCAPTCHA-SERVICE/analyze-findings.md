# Specification Analysis Report — specs/20261103-114927-PROVISION-FCAPTCHA-SERVICE  

## Record  

| Record | Value |
|---|---|
| Feature directory | specs/20261103-114927-PROVISION-FCAPTCHA-SERVICE |
| Report created | 2026-11-03 033025 PM |
| Analysis captured | 2026-11-03 033025 PM |
| Last updated | 2026-11-03 055013 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save  
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.  
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.  
"Next" always returns the first open finding below.  

## Findings  

### **I6** · Inconsistency · MEDIUM · quickstart.md Runbook 7; tasks.md T021; spec.md FR-017  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ quickstart.md Updated: 2026-11-03 5:50 PM  
  **Notes**: Recommendation accepted in file 2026-11-03: the Recommendation; quickstart.md Runbook 7 adds replacing the all-buckets Spaces key with one limited to the crowdpoll bucket, applying, and revoking the all-buckets key (FR-017), as T021 does.  

  This is the same kind of drift as I4. T021 points to "quickstart Runbook 7" and adds a step: replace the all-buckets Spaces key with one limited to the `crowdpoll` bucket, apply, then revoke the all-buckets key. Runbook 7 only says to revoke the old SES and Spaces keys once scenario 7 passes, so an operator following the runbook keeps the all-buckets key.  

  - **Recommendation**: Add T021's bucket-limited key replacement to quickstart Runbook 7.  

    ➡️ [x] **Accepted**  
    - Runbook 7 then reads: revoke the old SES access key and the old Spaces key pair once scenario 7 passes; replace the all-buckets Spaces key with one limited to the `crowdpoll` bucket, set it in `infra/secrets.auto.tfvars`, apply, and revoke the all-buckets key (FR-017, FR-021).  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C4** · Coverage · LOW · tasks.md T012, T007/T013; spec.md FR-002 exception  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-03 5:50 PM  
  **Notes**: Recommendation accepted in file 2026-11-03: Recommendation A; tasks.md T012 adds a tests/infra-config.test.ts assertion that infra/app.tf sets ENV_SPACES_BUCKET and ENV_SPACES_CDN_URL from digitalocean_spaces_bucket.crowdpoll / digitalocean_cdn.crowdpoll and holds no cdn.digitaloceanspaces.com literal.  

  U3 made T012 build `ENV_SPACES_BUCKET` and `ENV_SPACES_CDN_URL` from the bucket and CDN resources. No test protects that: if someone writes the literal CDN address back into `infra/app.tf`, the tests still pass. FR-005's derived hostnames already have a matching assertion (T013).  

  - **Recommendation A** _(recommended)_: Add an assertion to `tests/infra-config.test.ts` in T012: `infra/app.tf` sets both settings from `digitalocean_spaces_bucket.crowdpoll` / `digitalocean_cdn.crowdpoll` and holds no `cdn.digitaloceanspaces.com` literal.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: Matches the guard FR-005 already has; a literal written back fails `npm test` rather than surfacing after a bucket rename.  
    - <u>Cons</u>: One more text-matching assertion on HCL, which a reformatting of `infra/app.tf` could break.  

  - **Recommendation B**: Leave T012 as it is; `terraform plan` and review are the guard.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: No change; the rename exception may never be used.  
    - <u>Cons</u>: A literal written back looks correct in a plan until the bucket is renamed, and then the app points at the wrong bucket.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary  

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001, FR-001a | ✅ | T009–T014, T018 | |
| FR-002 | ✅ | T009, T010, T012 | C4 |
| FR-003, FR-004 | ✅ | T012, T013 | |
| FR-005 | ✅ | T013 | derived, test assertion |
| FR-006, FR-007 | ✅ | T007, T012, T013 | |
| FR-008, FR-009 | ✅ | T016, T020, T027 | README record (I5 fixed) |
| FR-010, FR-011 | ✅ | T001, T002, T016 | |
| FR-012 | ✅ | T032 | |
| FR-013, FR-014 | ✅ | T005–T008, T017 | |
| FR-015 | ✅ | T011–T013 | |
| FR-016 | ✅ | T019, T027 | Runbook 5 matches (I4 fixed) |
| FR-017 | ✅ | T004, T008, T021 | I6 |
| FR-018 | ✅ | T005, T022 | |
| FR-019 | ✅ | T018, T019 | Runbook 4 matches (I4 fixed) |
| FR-020 | ✅ | T020 | |
| FR-021 | ✅ | T008, T021 | I6 |
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

Nothing is CRITICAL or HIGH, so `/speckit-implement` can start.  
- **I6**: fix it before the switch-over. It is one runbook step, and without it an operator keeps a broader key than FR-017 allows.  
- **C4**: you can add it while implementing T012.  
