# Specification Analysis Report — specs/20261105-162941-MULTIPLE-ACCOUNT-PREVENTION

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261105-162941-MULTIPLE-ACCOUNT-PREVENTION |
| Report created | 2026-11-05 081241 PM |
| Analysis captured | 2026-11-05 081241 PM |
| Last updated | 2026-11-05 083458 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · HIGH · `.gitignore:34`, research.md R1, tasks.md T001  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md plan.md Updated: 2026-11-05 8:21 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation B, keep the name and add the `.gitignore` exception; tasks.md T001 and the plan's source tree now say so. `.gitignore` itself changes in T001.  

  R1 says to commit `fingerprintjs-5.3.0.min.js`, but `.gitignore` ignores `*.min.js`. The file would work locally and be missing from the deployed app.  

  - **Recommendation A** _(recommended)_: Name it `src/public/vendor/fingerprintjs-5.3.0.js`, keeping the minified content, and update R1, C1, the quickstart and T001.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: it leaves `.gitignore` untouched, and nothing can silently exclude the file.  
    - <u>Cons</u>: the name no longer says the file is minified.  

  - **Recommendation B**: Keep the name and add `!src/public/vendor/*.min.js` to `.gitignore`.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the file keeps its conventional name.  
    - <u>Cons</u>: it adds an exception to a project-wide rule, for one file.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · HIGH · research.md R3, spec.md FR-004 and US1 scenario 6  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md research.md contracts/ui-contracts.md tasks.md requirements.md CLAUDE.md Updated: 2026-11-05 8:34 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation A, removed `deviceMemory` and the GPU family from the hardware value; FR-004, R3, T012, T017, the wording in C5, the AM1 decision in requirements.md and the line in CLAUDE.md now agree. research.md, ui-contracts.md and CLAUDE.md are outside this skill's usual files, and were changed because the recommendation names them.  

  The hardware value exists to link two browsers on one device, but two of its inputs break that. The library deliberately skips `rendererUnmasked` on Firefox (`shouldAvoidDebugRendererInfo` returns `isGecko()`), so the GPU family would be empty there. `deviceMemory` is, to my knowledge, Chromium-only. Chrome and Firefox would therefore rarely match.  

  - **Recommendation A** _(recommended)_: Remove `deviceMemory` and the GPU family from the hash, leaving screen, colour depth, CPU count, time zone and platform. Update FR-004, R3, CLAUDE.md and the wording in C5.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the value can match across browsers on one device, which is its purpose, and it uses less data.  
    - <u>Cons</u>: it is less distinctive, so more unrelated devices share a value, and it departs from the GPU named in the requirements decision AM1.  

  - **Recommendation B**: Keep the GPU family, remove only `deviceMemory`, and accept that Firefox will not match other browsers.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the value stays more distinctive among Chromium and Safari browsers, and it keeps the decision as written.  
    - <u>Cons</u>: the second-browser route stays open through Firefox, the route this value was added to close.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · HIGH · spec.md SC-002  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-05 8:21 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation; SC-002 now measures all vote events.  

  "At least 90% of vote events from ordinary browsers" can't be measured, because the record deliberately holds no browser type.  

  - **Recommendation**: Measure "at least 90% of all vote events during the test period".  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the coverage line in the log can show this directly.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · MEDIUM · spec.md FR-008, SC-005; research.md R2  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md requirements.md Updated: 2026-11-05 8:21 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation; FR-008 and SC-005 now say nothing remains and name the test cookie; the verification decision in requirements.md matches.  

  The spec says no new cookie appears, but the library sets `cookietest` and removes it in the same call. R2 accepts this, while the spec still reads as forbidding it.  

  - **Recommendation**: Reword both to "no cookie or storage key remains", and name the momentary test cookie.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the requirement then matches what the library does and what the policy says.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I4** · Inconsistency · MEDIUM · spec.md FR-024, US5; ui-contracts.md C1  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md requirements.md Updated: 2026-11-05 8:21 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation; FR-024, the US5 test and the start-of-collection decision in requirements.md now say the library is not loaded.  

  "When off, no script runs", yet `deviceEvidence.js` still loads and exits.  

  - **Recommendation**: Reword to "the fingerprint library is not loaded, and nothing is computed or sent".  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: it states the outcome that matters and can be tested as written.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I5** · Inconsistency · MEDIUM · spec.md FR-003, US2; research.md R8  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md requirements.md Updated: 2026-11-05 8:21 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation; FR-003, US2 and the sign-in decision in requirements.md now say the first page of the signed-in site.  

  "The first page loaded after sign-in" may be `/privacy` or `/terms`, which have no script, so the report would come from a later page.  

  - **Recommendation**: Reword FR-003 to "the first page of the signed-in site that loads".  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: it matches R8, and the event is still recorded once.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage · MEDIUM · spec.md FR-025, FR-026, FR-028; tasks.md  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-05 8:21 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation; added T045 in Polish.  

  These three release conditions have no task, only quickstart text: confirm test users, tell them, the lawyer's review and the later 30-day rule. Nothing drafts the message to test users.  

  - **Recommendation**: Add a task to draft the message and record the three conditions as a release checklist in `quickstart.md`.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the steps the code cannot enforce become something to tick off.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage · MEDIUM · spec.md SC-009; tasks.md  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-05 8:21 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation; added T046 in the US1 tests.  

  No test proves the later analysis can answer its example question from these records.  

  - **Recommendation**: Add a test running that query over seeded rows in `tests/device-events.test.ts`.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: it guards the purpose of the whole feature: data that cannot answer this would be noticed now, not months later.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C3** · Coverage · MEDIUM · tasks.md T004, T005  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-05 8:21 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation; T004 extends `tests/infra-config.test.ts`, and T005 names `tests/config.test.ts`.  

  `tests/infra-config.test.ts` also checks `infra/` and isn't mentioned, and T005 names no file.  

  - **Recommendation**: Name `tests/config.test.ts` in T005, and add `tests/infra-config.test.ts` to T004.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: each task then names the files it changes.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · tasks.md T013  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-05 8:21 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation; T013 now covers what jsdom can show and points to quickstart Q8 and Q9.  

  T013 runs the real library in jsdom, which lacks canvas, WebGL and audio, so the result may not reflect a browser. It could also fail for unrelated reasons.  

  - **Recommendation**: Keep the test on what jsdom can show (`cookietest` gone, no storage key), and leave the rest to quickstart Q8 and Q9.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the automated check stays dependable, and real browsers cover the rest.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · LOW · research.md R9, tasks.md T027  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-05 8:21 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation; T027 now ensures the partition.  

  A sign-in insert fails if the month's partition is missing, for example after downtime across a month end. The vote path ensures its partition, but this path doesn't.  

  - **Recommendation**: Call `ensureDeviceEventsPartition` in `recordSignInEvent`; it runs once per session.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: both write paths behave alike, at the cost of one quick statement per session.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U3** · Underspecification · LOW · research.md R12  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-11-05 8:21 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation A, accept the daily scan for now; nothing needed to change.  

  The daily count scans whole partitions, since no index covers `at`.  

  - **Recommendation A** _(recommended)_: Accept this for now; leave the design as it is.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: no extra index to maintain on every vote event, for one query a day.  
    - <u>Cons</u>: the daily scan grows with volume.  

  - **Recommendation B**: Add an index on `at` to each partition.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the count stays quick at any volume, and the later analysis will likely want it.  
    - <u>Cons</u>: every vote event pays a small extra write.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **T1** · Terminology · LOW · spec.md, data-model.md, ui-contracts.md C5  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-05 8:21 PM  
  **Notes**: Recommendation accepted in file 2026-11-05: Recommendation; the Key Entities now name "device event" as canonical and note the policy's "Device Evidence".  

  "Device event", "record", "device evidence" and "scrambled codes" all name related things.  

  - **Recommendation**: Keep "device event" for the record and "Device Evidence" for the policy's wording.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: readers of the artifacts see one name for each thing, while the policy stays in plain words.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001, FR-002 | Yes | T011, T014–T016 | |
| FR-003 | Yes | T025–T030 | I5 |
| FR-004, FR-005 | Yes | T007, T008, T011, T017 | I2 |
| FR-006 | Yes | T012, T022, T025 | |
| FR-007 | Yes | T001, T017 | I1 |
| FR-008 | Yes | T013 | I3, U1 |
| FR-009 | Yes | T009, T010, T037 | |
| FR-010, FR-011 | Yes | T011, T012, T017, T019 | |
| FR-012, FR-013 | Yes | T011, T014–T016 | |
| FR-014–FR-018 | Yes | T021, T023, T024 | |
| FR-019 | Yes | T032, T035 | |
| FR-020, FR-021 | Yes | T031–T034 | |
| FR-022 | Partial | T037 | The privacy-request query is in the quickstart only |
| FR-023 | Yes | T037 | |
| FR-024 | Yes | T002, T011, T036 | I4 |
| FR-025, FR-026, FR-028 | **No** | none | C1 |
| FR-027 | Yes | T036, T038 | |
| SC-001, SC-003 | Yes | T011 | |
| SC-002 | Partial | T038, T043 | A1 |
| SC-004 | Yes | T044 | |
| SC-005 | Yes | T012, T013, T043 | I3 |
| SC-006 | Yes | T011, T037 | |
| SC-007 | Yes | T031, T032 | |
| SC-008 | Yes | T022, T025 | |
| SC-009 | **No** | none | C2 |

## Constitution Alignment Issues

None reported.

## Unmapped Tasks

None reported. T039–T044 are the documentation and verification the constitution requires.

## Metrics

- Total Requirements: 37 (28 functional, 9 success criteria)
- Total Tasks: 44
- Coverage: 89% (33 of 37 have a task, counting the two partial ones)
- Ambiguity Count: 1
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

There are no critical issues, but resolve the three HIGH findings before `/speckit-implement`. I1 would break production, and I2 would defeat the purpose of the hardware value. `/speckit-analyze-findings` takes these one at a time.
