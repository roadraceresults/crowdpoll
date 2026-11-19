# Specification Analysis Report — specs/20261118-160304-CLIENT-CODE-OBFUSCATION

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261118-160304-CLIENT-CODE-OBFUSCATION |
| Report created | 2026-11-18 060007 PM |
| Analysis captured | 2026-11-18 060007 PM |
| Last updated | 2026-11-18 061525 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · HIGH · tasks.md T004, T007, T018; contracts/build.md B9  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-18 6:15 PM  
  **Notes**: Recommendation accepted in file 2026-11-18: Recommendation A, T004 now requires a fixture script of at least 6,000 bytes with at least 4,000 of varied comments, so its compressed size shrinks by at least 10% and the size check passes on the fixture.  

  The fixture script is a few lines, but each transformed script carries its own string-table decoder. The fixture's compressed total will be larger after transformation, so once T018 adds the size check every transformed fixture build stops with "compressed size grew" and T007, T008, T013, T024, T029 and T033 fail.  

  - **Recommendation A** _(recommended)_: Make the fixture script large enough to shrink (several kilobytes of comments and code), and have T004 say so.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: The tests exercise the build exactly as a release runs it, size check included.  
    - <u>Cons</u>: The fixture is longer than its assertions need, and T004 must state a size that holds a margin.  

  - **Recommendation B**: Let tests switch the size check off through an option of `buildAssets`.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: The fixture stays a few lines.  
    - <u>Cons</u>: It adds a way to build without the check, which the contract says a release never does, and the check is then tested only through its function.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · MEDIUM · contracts/build.md B4; tasks.md T007, T009  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-18 6:15 PM  
  **Notes**: Recommendation accepted in file 2026-11-18: Recommendation, T007 checks the published name by running the built script in a `node:vm` context; T009 keeps text search for top-level names only and leaves the `window` names to `npm run test:built`.  

  The tests look for `Sample`, `PollCard` as text in the built script. With the string table at full threshold the obfuscator may turn `window.Sample = …` into a computed access whose name is in the encoded table. The name still works at run time, but the text search fails or passes by accident.  

  - **Recommendation**: Check FR-007 by running the built script in a `node:vm` context with a stub `window` and asserting the published names exist; keep text search only for top-level declarations.  

    ➡️ [X] **Accepted**  
    - It tests what FR-007 requires, that other scripts can still reach the names, instead of how the tool happens to spell them.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · tasks.md T013, T015, T019  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-18 6:15 PM  
  **Notes**: Recommendation accepted in file 2026-11-18: Recommendation, T013 exports and tests `checkTransformed` directly; T019 exports `checkCompiles` and T015 tests it directly; the `function (` build case is labelled as the transformation's own failure.  

  Two checks cannot be made to fail through the build as written. T013's `.a{color:red}` sheet is not identical after `esbuild` (it adds a line end), and no input makes the obfuscator emit a script that does not compile (`function (` fails earlier, in the transform).  

  - **Recommendation**: Export the two checks as functions, as T015 already does for the size check, and test them directly.  

    ➡️ [X] **Accepted**  
    - Each check then has a failing case that does not depend on a tool's output format.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage gap · MEDIUM · spec.md FR-017, Edge Cases; tasks.md  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-18 6:15 PM  
  **Notes**: Recommendation accepted in file 2026-11-18: Recommendation, added T041 (test) and T042 (the tools are loaded through `loadBuildTools()` only when the switch is on, with a message naming the missing package); T032 now runs T041 too.  

  "The tools are missing while the switch is on" has no task or test. With ordinary imports the build would also fail with the switch off, and with Node's module error rather than a message naming the cause.  

  - **Recommendation**: Load the three transform packages only when the switch is on, through a loader the test can replace, and reject with a message naming the missing package.  

    ➡️ [X] **Accepted**  
    - A readable build then needs no build tool, which keeps the revert path working even where the development packages were not installed, and the failure names its cause as FR-017 requires.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage gap · MEDIUM · spec.md FR-008; tasks.md T007, T009  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-18 6:15 PM  
  **Notes**: Recommendation accepted in file 2026-11-18: Recommendation, added T043: a built `src/public` is served through `createAssetServing` and the legal pages and `index.html` are checked; T014 now runs T043 too.  

  The tests show the markers and references survive in the built pages, but nothing serves a built page through the page routes to show they are filled in.  

  - **Recommendation**: Add a case that gives a built `src/public` to `createAssetServing` and checks a legal page has no `{{` left and every reference points under `/assets/`.  

    ➡️ [X] **Accepted**  
    - It covers FR-008 end to end with the code that serves pages in production.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · MEDIUM · spec.md FR-026; research.md R1  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md requirements.md Updated: 2026-11-18 6:15 PM  
  **Notes**: Recommendation accepted in file 2026-11-18: Recommendation, FR-026 now says the feature adds no package to what the running site installs and the running site never loads a build tool; the security rule in requirements.md says the same.  

  FR-026 says the tools must be absent from the running site. `esbuild` is already installed there, because `tsx` (a run-time dependency) brings it, and it stays after pruning. As written the requirement cannot be met.  

  - **Recommendation**: Reword FR-026: the feature adds no run-time package, and the running site never loads the build tools; B16 already tests the first half.  

    ➡️ [X] **Accepted**  
    - It states what the feature can guarantee and what the requirement was for.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I4** · Inconsistency · MEDIUM · spec.md SC-009; contracts/build.md B15; tasks.md T009, T015, T024  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md tasks.md Updated: 2026-11-18 6:15 PM  
  **Notes**: Recommendation accepted in file 2026-11-18: Recommendation A, T009 adds `siteBuild()`, which builds `src/public` once for the whole file, and T015 and T024 use it; SC-009 now says the existing suites are unchanged and the new suite adds no more than 20 seconds.  

  SC-009 says running the existing tests takes "no measurable additional time", but `tests/build-assets.test.ts` is part of `npm test` and builds the real client files several times.  

  - **Recommendation A** _(recommended)_: Build `src/public` once for the whole file, and reword SC-009 to say the existing suites are unchanged and the new suite adds a stated few seconds.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: The build contract is checked on the real files on every `npm test`, so a new script that breaks the build is caught at once.  
    - <u>Cons</u>: `npm test` gets a few seconds longer and needs the build packages installed.  

  - **Recommendation B**: Move the real-files cases to `npm run test:built`; `npm test` keeps only the fixture cases.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: `npm test` grows by well under a second.  
    - <u>Cons</u>: A source change that breaks the transformation is found only when someone runs the separate command before a release.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I5** · Inconsistency · LOW · tasks.md T033; plan.md Primary Dependencies; contracts/build.md B16  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-18 6:15 PM  
  **Notes**: Recommendation accepted in file 2026-11-18: Recommendation, T033 reads the map with Node's built-in `SourceMap` from `node:module`; no fifth package.  

  T033 may add `@jridgewell/trace-mapping` as a fifth development dependency, while the plan and B16 say four.  

  - **Recommendation**: Read the map with Node's built-in `module.SourceMap` in the test; no fifth package.  

    ➡️ [X] **Accepted**  
    - The plan, the contract and the task then agree on four packages.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I6** · Inconsistency · LOW · spec.md Assumptions; research.md R2  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-18 6:15 PM  
  **Notes**: Recommendation accepted in file 2026-11-18: Recommendation, the Assumptions now state the measured reason and that the string table is used without wrapper, rotation and shuffling.  

  The spec's assumption still describes the obfuscator's "lightest setting" without the correction the plan made (no wrapper, rotation or shuffling, because the fuller setting fails the size limit).  

  - **Recommendation**: Add one sentence to the assumption pointing at the leaner table and the measured reason.  

    ➡️ [X] **Accepted**  
    - A reader of the spec alone then learns the setting is leaner than the requirements' wording.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 scope of files | Yes | T012, T009 |  |
| FR-002 script transformation | Yes | T010, T007 |  |
| FR-003 transforms that stay off | Yes | T010 | by settings; no separate test |
| FR-004 same for every script | Yes | T012, T020 |  |
| FR-005 sheets and pages | Yes | T011, T007, T009 |  |
| FR-006 untouched files | Yes | T012, T008, T009 |  |
| FR-007 shared names | Yes | T010, T007, T009 | see I2 |
| FR-008 page placeholders | Partial | T007, T009 | see C2 |
| FR-009 one content, two addresses | Yes | T005, T006, T008 |  |
| FR-010 address from transformed content | Yes | T005, T006 |  |
| FR-011 no readable copy, no map | Yes | T008, T033 |  |
| FR-012 not-identical check | Yes | T013 | see U1 |
| FR-013 part of the usual build | Yes | T005 |  |
| FR-014 development and tests on source | Yes | T025, T027, T028 |  |
| FR-015 repeatable | Yes | T024 |  |
| FR-016 report and size stop | Yes | T015, T018 | see I1 |
| FR-017 stop, nothing partly built | Partial | T012, T013, T019 | missing-tools case: see C1 |
| FR-018 client tests on built files | Yes | T025–T027 |  |
| FR-019 compile and reference checks | Yes | T015, T019 | see U1 |
| FR-020 lighter transformation | Yes | T017, T020, T023 |  |
| FR-021 manual checklist, six browsers | Yes | T022 |  |
| FR-022 language level | Yes | T016, T010 |  |
| FR-023 one-time review | Yes | T036 |  |
| FR-024 server keeps its rules | Yes | T036 | by reading |
| FR-025 no third party, no code from text | Yes | T007, T010 |  |
| FR-026 tools build-only | Yes | T002, T024 | see I3 |
| FR-027 the switch | Yes | T029, T030 |  |
| FR-028 invalid value | Yes | T029, T030 |  |
| FR-029 app never reads it | Yes | T024 |  |
| FR-030 unset in production | Yes | T031 |  |
| FR-031 revert and restore | Yes | T031, T032 | quickstart 6 |
| FR-032 mapping files | Yes | T033–T035 | see I5 |
| FR-033 documentation | Yes | T037, T038 |  |
| FR-034 switch listed | Yes | T031 |  |
| SC-003 size | Yes | T015, T018 |  |
| SC-004 speed | Yes | T023 | by hand |
| SC-005 tests pass on built files | Yes | T027 |  |
| SC-007 identical builds | Yes | T024 |  |
| SC-009 unchanged everyday loop | Partial | T028 | see I4 |
| SC-010 review result | Yes | T036 |  |

## Constitution Alignment Issues

None reported. Tests precede code (IV), documents follow the implementation, and the README task forbids references to other project documents.

## Unmapped Tasks

None reported. T001 to T003 are setup, T039 and T040 are housekeeping.

## Metrics

- Total requirements: 34 functional, 6 buildable success criteria
- Total tasks: 40
- Coverage: 100% with at least one task (3 partial)
- Ambiguity count: 0
- Duplication count: 0
- Critical issues: 0

## Next Actions (as reported)

- No critical issue. I1 should be fixed before `/speckit-implement`, or the first test run after T018 fails for a reason unrelated to the code.
- I2, U1, C1 and C2 change what the tests assert; they are cheaper to settle now than during implementation.
- I3, I4 and I6 are wording changes to the spec; I5 is one task.
