# Specification Analysis Report — specs/20261112-152622-EXTRACT-ALL-POLLDATA

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261112-152622-EXTRACT-ALL-POLLDATA |
| Report created | 2026-11-12 034049 PM |
| Analysis captured | 2026-11-12 034049 PM |
| Last updated | 2026-11-12 034837 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **U1** · Underspecification · MEDIUM · data-model.md (Identity); research.md R5; tasks.md T006  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ data-model.md research.md tasks.md Updated: 2026-11-12 3:48 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation A, the history `directory` is `fs.realpathSync.native(dir)`: data-model.md (`directory` row), research.md R5, tasks.md T006 and a T007 test for another letter case or `..`.  

  An entry is identified by the folder's absolute path as resolved. On Windows the same folder can resolve with different letter case or form (`INIT_CWD` gives `c:\crowdPoll\main\polldata`, the default from `import.meta.url` gives `C:\crowdPoll\main\polldata`), so `npm run extract-all-polldata polldata` after a default run would re-extract everything and add duplicate entries.  

  - **Recommendation A** _(recommended)_: Store `directory` as `fs.realpathSync.native(dir)` (the true on-disk path, case included); say so in data-model.md, R5 and T006, with a T007 test that a folder given in another letter case or with `..` matches the same entries.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: one entry per real folder on every platform, whatever was typed; symlinked folders also match.  
    - <u>Cons</u>: one more call per run; the recorded path is the resolved one, which may differ from what was typed.  

  - **Recommendation B**: Compare `directory` case-insensitively on Windows only (`path.resolve` then lower-case when `process.platform === "win32"`), keeping the stored value as resolved.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no file-system call; the stored path is what was typed.  
    - <u>Cons</u>: platform branch in the code; `..` segments are normalized but symlinks and 8.3 short names are not.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · MEDIUM · spec.md FR-009; research.md R2; tasks.md T010  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ research.md tasks.md Updated: 2026-11-12 3:48 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation, a thrown or rejected `runExtract` is a failure with the error message: research.md R2 (new bullet), tasks.md T010 and a T009 test with a throwing `runExtract`.  

  Only a non-zero status from `runExtractAll` is treated as a failure; if it ever throws or rejects, `extractAllPolldata` would end the whole run, against FR-009 ("MUST NOT stop the run").  

  - **Recommendation**: In T010 and R2, treat a thrown or rejected `runExtract` as a failure whose message is the error's message (`messageOf`), recorded nowhere, and go on; add a T009 test with an injected `runExtract` that throws.  

    ➡️ [x] **Accepted**  
    - Keeps FR-009 true for any failure, not only those `runExtractAll` reports itself; one `try`/`catch` around the call.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · LOW · spec.md FR-005–FR-008, Key Entities ("extraction record"); plan.md, research.md R4, data-model.md, tasks.md ("history")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-12 3:48 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation, "history" throughout spec.md (user stories, edge cases, FR-005–FR-008, FR-009, FR-013, FR-015, FR-016, Assumptions); Key Entities names it "Extraction history (the record of what was extracted)".  

  The same file is called the "record" in the spec and the "history" everywhere else.  

  - **Recommendation**: In spec.md, name it "extraction history (record)" once in Key Entities and use "history" in FR-005–FR-008, matching the file name `extract-all-polldata-history.json`.  

    ➡️ [x] **Accepted**  
    - One term across spec, plan, data model, tasks and the file name.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · tasks.md T011 ("an interrupted-run case")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-12 3:48 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation, T011 reworded: an injected `runExtract` reads the history file when called for the second configuration and finds the first entry already saved.  

  It is not clear how a test should "interrupt" a run.  

  - **Recommendation**: Reword: with an injected `runExtract` that records the history file's contents when called for the second configuration, the history on disk already holds the first configuration's entry before the second extraction starts.  

    ➡️ [x] **Accepted**  
    - Tests FR-007's "saved after each configuration that succeeds" directly, without killing a process.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 command and default folder | Yes | T001, T005, T006 | |
| FR-002 relative from INIT_CWD | Yes | T005, T006 | |
| FR-003 `.yaml`/`.yml`, name order, no subfolders | Yes | T003, T011 | |
| FR-004 same as extract-all | Yes | T005, T006 | |
| FR-005 record contents | Yes | T003, T005, T006 | |
| FR-006 skip rule | Yes | T007, T008 | |
| FR-007 save after each success, read errors | Yes | T003, T011 | |
| FR-008 git-ignored file | Yes | T003 | ignored by the existing `devScripts/extract/*` rule |
| FR-009 failure handling | Yes | T009, T010 | see U2 |
| FR-010 announce, Done, failure list, status | Yes | T005, T006, T009, T010 | |
| FR-011 argument and folder errors | Yes | T011, T012 | |
| FR-012 line prefix | Yes | T006, T010, T012 | |
| FR-013 extract-all unchanged | Yes | T007 | |
| FR-014 extraction only, no settings | Yes | T005 | tests run without `ENV_*` |
| FR-015 tracked, README | Yes | T002, T013 | |
| FR-016 tests | Yes | T004–T011 | |
| SC-001 one command | Yes | T005, T017 | |
| SC-002 second run skips all | Yes | T007 | |
| SC-003 byte-identical | Yes | T005 | |
| SC-004 failures never block, all listed | Yes | T009 | |
| SC-005 ≤ 5 s | Yes | T015 | |

## Constitution Alignment Issues

None reported. Documentation Deliverables are covered by T013 and T014.

## Unmapped Tasks

None reported. T015–T017 are validation tasks.

## Metrics

- Total Requirements: 21 (16 FR, 5 SC)
- Total Tasks: 17
- Coverage % (requirements with ≥1 task): 100%
- Ambiguity Count: 1
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

- No CRITICAL or HIGH issues; implementation may proceed.
- Resolve U1 and U2 first: each would be a real bug (duplicate entries on Windows; a thrown extraction ending the run).
- I1 and A1 are wording fixes to spec.md and tasks.md.
