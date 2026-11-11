# Specification Analysis Report — specs/20261111-132724-SHARED-LINK-MESSAGE

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261111-132724-SHARED-LINK-MESSAGE |
| Report created | 2026-11-11 015224 PM |
| Analysis captured | 2026-11-11 015224 PM |
| Last updated | 2026-11-11 020025 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · HIGH · spec.md Clarifications Q1, FR-011, Assumptions; plan.md Constitution Check I, research.md R6; tasks.md T038  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md plan.md Updated: 2026-11-11 2:00 PM  
  **Notes**: Recommendation accepted in file 2026-11-11: Recommendation A. spec.md: clarification Q1 and FR-011 now name the existing development script that renders the icon files, no new dependency (the requirements document's RS3 names no rasterizer, so it is unchanged). plan.md: Constitution Check I records the tradeoff as settled.  

  The spec requires the brand image to be rendered by "a rasterizer package added as a development dependency"; plan R6 and T038 instead extend `devScripts/favicon-ico.ts`, which already rasterizes `favicon.svg` with a headless browser and no package. The plan surfaces this tradeoff but the three artifacts disagree on what gets built.  

  - **Recommendation A** _(recommended)_: Amend the spec's clarification Q1, FR-011 and the Assumptions bullet to "rendered from `favicon.svg` by the existing development script (a headless browser), no new dependency", keeping plan R6 and T038 as they are; also update the requirements document's RS3 decision where it names a rasterizer.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: No new dependency; the same script and browser already produce `favicon.ico` and `email-logo.png`; Simplicity First.  
    - <u>Cons</u>: The render needs a Chromium-based browser on the developer's machine, as the existing outputs already do.  

  - **Recommendation B**: Keep the spec; change research R6 and T038 to a new `devScripts/og-image.ts` that uses a rasterizer added as a development dependency (for example `@resvg/resvg-js`), and add a task to update `package.json`.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: Renders without a browser, reproducibly on any machine; matches the clarification as recorded.  
    - <u>Cons</u>: A dependency (with native binaries) for one render; two ways of rasterizing the same SVG in the repository.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · tasks.md T007; spec.md FR-002  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-11 2:00 PM  
  **Notes**: Recommendation accepted in file 2026-11-11: Recommendation A. tasks.md: T007 now creates `tests/migration-link-preview-message.test.ts` (up adds the column with default '', a pre-existing row reads '', down drops it) and runs it with the admin CRUD suite.  

  T007 names `tests/migrations.test.ts`, which does not exist (the repo has `tests/migration-invitation-message.test.ts`, `tests/fix-migrations.test.ts` and others), and FR-002's "existing polls start with it empty" has no test task pinning the migration.  

  - **Recommendation A** _(recommended)_: Replace T007's suite reference with a new task: create `tests/migration-link-preview-message.test.ts` mirroring `tests/migration-invitation-message.test.ts` (column added with default `''`, existing rows read `''`, `down` drops it), and run it with `tests/polls-admin-crud.test.ts`.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: FR-002's "existing polls start with it empty" gets a test that fails before the migration exists; follows the previous migration's test.  
    - <u>Cons</u>: One more test file to write in Phase 2.  

  - **Recommendation B**: Only correct T007's reference to the existing `tests/fix-migrations.test.ts` and rely on the admin CRUD tests for the default.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: Smallest change.  
    - <u>Cons</u>: The migration's `down` and the default on existing rows are not pinned.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage gap · MEDIUM · spec.md Edge Cases ("operator's sentence containing characters that look like markup"); tasks.md T023–T025  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-11 2:00 PM  
  **Notes**: Recommendation accepted in file 2026-11-11: Recommendation. tasks.md: T024 adds the escaping case for the default sentence (`<b>x</b> & "q"` → escaped attribute, no raw tag in the body).  

  No test asserts the default sentence is escaped in the page (`<b>` → `&lt;b&gt;`), although the Custom Email Message has that test.  

  - **Recommendation**: Add to T024: render with `defaultLinkPreviewMessage: '<b>x</b> & "q"'` and assert the attribute holds the escaped form and the body no raw `<b>x</b>`.  

    ➡️ [x] **Accepted**  
    - The edge case in the spec gets a failing-first test; one assertion in a test task that already exists.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · tasks.md T024  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-11 2:00 PM  
  **Notes**: Recommendation accepted in file 2026-11-11: Recommendation. tasks.md: T024 calls `renderLoginPage` directly with the fallback instead of a second app; the end-to-end default stays in T023 (e).  

  "builds the app (or calls `renderLoginPage`) with `defaultLinkPreviewMessage: 'Have your say.'`" leaves the mechanism open; the harness's `loadConfig` takes env overrides, so a second app needs a second embedded database.  

  - **Recommendation**: State the cheap path: call `renderLoginPage(html, poll, "", ORIGIN, "Have your say.")` directly for the sentence, and leave the end-to-end default to T023 (e).  

    ➡️ [x] **Accepted**  
    - One sentence in T024; avoids a second embedded database in the SEO suite.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A2** · Ambiguity · LOW · tasks.md T038  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-11 2:00 PM  
  **Notes**: Recommendation accepted in file 2026-11-11: Recommendation. tasks.md: T038's closing clause reworded (header comment lists the third output; no .gitignore change).  

  The clause "update the script's header comment and `.gitignore` needs no change (the file is already allowlisted)" reads as one instruction; the `.gitignore` remark is about the script, not the PNG, and `src/public/og-image.png` is not ignored anyway.  

  - **Recommendation**: Reword: "update the script's header comment to list the third output; no `.gitignore` change (the script is allowlisted and `src/public/` is tracked)".  

    ➡️ [x] **Accepted**  
    - A wording fix in one task line.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **T1** · Terminology · LOW · spec.md (UI wording "Anyone you send the link to"), plan.md/tasks.md/contracts (stored value "Anyone With The Link")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-11 2:00 PM  
  **Notes**: Recommendation accepted in file 2026-11-11: Recommendation A. tasks.md: Path Conventions gains the sharing-mode mapping (UI labels to stored `poll_sharing_mode` and `poll_visibility` values).  

  Both names are used for the same mode; this follows the repository's rule that stored enumerations stay verbatim while the UI has its own label, but a reader of tasks.md alone meets both without the mapping.  

  - **Recommendation A** _(recommended)_: Add one line to tasks.md Path Conventions: "Anyone you send the link to" is the UI label of `poll_sharing_mode` `Anyone With The Link`; "Only people you invite" of `Invitation Only`.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: One line gives the mapping where the implementer reads first.  
    - <u>Cons</u>: Repeats what `adminCard.js`'s `WHO_OPTIONS` already states.  

  - **Recommendation B**: Leave the artifacts as they are; the convention is documented in CLAUDE.md's cross-feature invariants.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: No change.  
    - <u>Cons</u>: The mapping stays implicit in the task list.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage gap · LOW · spec.md SC-005, SC-006; tasks.md T042  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-11 2:00 PM  
  **Notes**: Recommendation accepted in file 2026-11-11: Recommendation A. tasks.md: T047 added after T046 (quickstart step 11 after the first deployment, result noted in tweaks.md or the PR); T042 and the Implementation Strategy point at it.  

  Both criteria can only be checked on a deployed site in real apps and the Sharing Debugger; T042 defers quickstart step 11 to "after deployment" with no task to record the outcome.  

  - **Recommendation A** _(recommended)_: Add a final task: "After the first deployment, do quickstart step 11 and note the Sharing Debugger result in the feature's tweaks.md or the PR", so the deferred check is not lost.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: SC-005 and SC-006 have a task that stays open until the real apps were checked.  
    - <u>Cons</u>: The task stays unchecked until after the deploy, as the previous feature's T021 does.  

  - **Recommendation B**: Leave T042's note as the only record; the quickstart step is enough.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: No change.  
    - <u>Cons</u>: The post-deployment check has no checkbox to show it was done.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 field in Step 1 | Yes | T013, T020 | |
| FR-002 separate column, empty default | Yes | T002–T006, T009, T013 | migration test missing (U1) |
| FR-003 100-character limit | Yes | T004, T008, T015 | |
| FR-004 twin rules (screen, pending, duplicate, non-content, admin-only) | Yes | T005, T009–T012, T016–T018 | |
| FR-005 summary line | Yes | T013, T021 | |
| FR-006 message of the mode | Yes | T023, T028, T029 | |
| FR-007 one line, 300 cut | Yes | T023, T028 | |
| FR-008 default sentence setting | Yes | T024, T025, T027, T030 | escaping edge case untested (C1) |
| FR-009 public page unchanged | Yes | T024, T029 | |
| FR-010 robots group | Yes | T032, T036 | |
| FR-011 brand image on both pages, committed | Yes | T033, T034, T037–T039 | production method disagrees (I1) |
| FR-012 nothing else changes | Yes | T001, T041 | via existing suites |
| SC-001/002/003/004 | Yes | T023–T025, T008 | |
| SC-005, SC-006 | Manual | T042 (step 11, after deployment) | C2 |
| SC-007 | Yes | T041 | |

## Constitution Alignment Issues

None reported. The plan carries the Constitution Check gate and a post-design re-check; tasks.md has the documentation phase (T043–T045) and README stays self-contained.

## Unmapped Tasks

None reported. T001, T007, T014, T022, T026, T031, T035, T040, T041 are verification runs; T046 is the CLAUDE.md review.

## Metrics

- Total Requirements: 12 FR + 7 SC
- Total Tasks: 46
- Coverage %: 100% of FRs have at least one task; 5 of 7 SCs automated, 2 manual
- Ambiguity Count: 2
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

No CRITICAL issue; implementation may proceed. I1 should be settled first, since it decides whether `package.json` changes. The rest are task-list edits (`tasks.md` T007, T024, T038, a migration-test task, a post-deployment task) and one spec edit if I1 is settled as option A.
