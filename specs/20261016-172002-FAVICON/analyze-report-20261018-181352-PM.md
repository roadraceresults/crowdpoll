# Specification Analysis Report — specs/20261016-172002-FAVICON

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261016-172002-FAVICON |
| Report created | 2026-10-17 21:34 |
| Analysis captured | 2026-10-17 21:34 |
| Last updated | 2026-10-18 061037 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **C1** · Constitution · CRITICAL · tasks.md Phase 6; constitution, Governance and Documentation Deliverables  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-18 5:54 PM  
  **Notes**: Recommendation accepted in file 2026-10-18: added Phase 7: Documentation to tasks.md, with T022 [P] (README.md: the favicon-ico command, its browser prerequisite and when to rerun it) and T023 [P] (ARCHITECTURE.md: the two icon files, how they are served, and the dev script), plus its dependency, flow and strategy lines.  

  The constitution says "every feature's task list MUST carry a post-implementation documentation phase" for `README.md` and `ARCHITECTURE.md`.  
  `tasks.md` has none.  
  Feature 032's T035/T036 show the expected form.  

  - **Recommendation**: Add a phase after T021: regenerate `README.md` (in its developer-commands section, add `npx tsx devScripts/favicon-ico.ts`, Edge or `FAVICON_BROWSER` as a prerequisite, and "rerun when `favicon.svg` changes") and `ARCHITECTURE.md` (the two static icon files, the asset pipeline serving them, and the dev script beside `file-manifest.ts`).  

    ➡️ [X] **Accepted**  
    - The constitution's documentation rule is non-negotiable within the analysis, so leaving the phase out is not an option.  
    - This adds T022 and T023, both `[P]` (different files), in a new Phase 7: Documentation.  

### **C2** · Constitution · MEDIUM · plan.md, Constitution Check  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ plan.md Updated: 2026-10-18 5:54 PM  
  **Notes**: Recommendation accepted in file 2026-10-18: added a "Documentation Deliverables" row to the Constitution Check table in plan.md, Pass (Phase 7).  

  The gate table covers principles I–VI only.  
  It never mentions the Documentation Deliverables, which is why C1 slipped through.  

  - **Recommendation**: Add a row: "Documentation Deliverables: README and ARCHITECTURE updated after implementation (Phase 7)".  

    ➡️ [X] **Accepted**  
    - This is one new row at the end of the Constitution Check table in `plan.md`, with Result `Pass (Phase 7)`.  

### **U1** · Underspecification · MEDIUM · tasks.md T013; constitution V  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md contracts/ui-contracts.md Updated: 2026-10-18 5:59 PM  
  **Notes**: Recommendation accepted in file 2026-10-18 (edits outside spec/plan/tasks approved by the developer): T013 step 3 now passes `timeout: 30000` and prints `[favicon] Browser failed rendering <s> px: <message>` and exits 1 when the call throws; step 4 first checks the screenshot exists (`[favicon] No screenshot for <s> px`); contract C5 lists both failures.  

  T013 handles a missing browser and a wrong-size PNG.  
  It says nothing about the browser exiting non-zero, hanging, or writing no screenshot.  
  `execFileSync` would then throw an uncaught stack trace or block forever.  

  - **Recommendation**: Pass `timeout: 30000` to `execFileSync`. Catch the error, print `[favicon] Browser failed rendering <s> px: <message>`, and exit 1. Before reading each PNG, check it exists, and print `[favicon] No screenshot for <s> px` if it doesn't.  

    ➡️ [X] **Accepted**  
    - This edits steps 3 and 4 of T013 in `tasks.md`, and the C5 error list in `contracts/ui-contracts.md`, so both describe the same failures.  

### **I1** · Inconsistency · MEDIUM · quickstart.md §3 (`/admin-results/<pid>`), research.md R6 (`/admin-results`) vs `src/routes/pages.ts`  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ quickstart.md research.md Updated: 2026-10-18 5:59 PM  
  **Notes**: Recommendation accepted in file 2026-10-18 (edits outside spec/plan/tasks approved by the developer): quickstart.md §3 and research.md R6.1 now give the results page as `/admin/poll/results?PID=<pid>`.  

  The real results-page address is `/admin/poll/results?PID=<pid>`.  
  tasks.md T003 already uses it; quickstart and research do not.  

  - **Recommendation**: Correct quickstart §3 and R6.  

    ➡️ [X] **Accepted**  
    - This replaces `/admin-results/<pid>` in `quickstart.md` §3 and `/admin-results` in `research.md` R6.1 with `/admin/poll/results?PID=<pid>`.  

### **I2** · Inconsistency · MEDIUM · research.md R6.1 vs tasks.md T003  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ research.md Updated: 2026-10-18 5:59 PM  
  **Notes**: Recommendation accepted in file 2026-10-18 (edit outside spec/plan/tasks approved by the developer): research.md R6.1 now says each page answers 200 (403 for the not-authorized card).  

  R6.1 implies all seven pages answer 200.  
  The not-authorized card answers `403` (`pages.test.ts`, "Unauthorized access…").  

  - **Recommendation**: Add "(403 for the not-authorized card)" to R6.1.  

    ➡️ [X] **Accepted**  
    - This is a one-phrase edit to `research.md` R6.1, made on the same line as I1's correction.  

### **G1** · Coverage · LOW · spec FR-008 ("documented procedure"), SC-005  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-10-18 5:54 PM  
  **Notes**: Recommendation accepted in file 2026-10-18: no edit; C1's T022 documents the procedure in README.md.  

  The procedure is documented only in the script's usage header and in quickstart §1, a spec artifact.  

  - **Recommendation**: C1's README update covers it.  

    ➡️ [X] **Accepted**  
    - No file changes for G1 itself, once C1 is resolved: the `README.md` task names the command, its prerequisite and when to rerun it.  

### **G2** · Coverage · LOW · spec FR-004 (prototype pages)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-10-18 5:54 PM  
  **Notes**: Recommendation accepted in file 2026-10-18: Recommendation B, T020 left as it is; the root icon is tested by T016.  

  Nothing checks the icon on a prototype page.  
  T020 checks only a plain-text `Not found` address.  

  - **Recommendation A** _(recommended)_: In T020, also open one `/prototypes/<name>/` with `ENV_PROTOTYPES` set.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: every response FR-004 names is checked once, at the cost of one more line in a by-eye task.  
    - <u>Cons</u>: it needs `ENV_PROTOTYPES` set for the dev run.  

  - **Recommendation B**: Leave T020 as it is.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: no edit; the prototypes are temporary, and the root icon is already tested by T016.  
    - <u>Cons</u>: one FR-004 case is never looked at.  

### **G3** · Coverage · LOW · spec FR-006, FR-007  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-10-18 6:10 PM  
  **Notes**: Recommendation accepted by "Accept" 2026-10-18: Recommendation A (recommended), accepted as it is; no test added. Recommendation B was also marked in the file and is left marked as the developer set it, but not applied.  

  The 1 px margin and the `<title>CrowdPoll</title>` are set by T002's exact markup but not tested.  

  - **Recommendation A** _(recommended)_: Accept it: the geometry is fixed in T002, and the look is judged in T020.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: no test of fixed, hand-written markup.  
    - <u>Cons</u>: a later edit could drop the title unnoticed.  

  - **Recommendation B**: Add `expect(svg).toContain("<title>CrowdPoll</title>")` to the T012 test.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: FR-007 gets an automated check for one line of test.  
    - <u>Cons</u>: the T012 test then covers two files rather than the ICO alone.  

### **A1** · Ambiguity · LOW · spec, User Story 1, scenario 3; SC-004  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-10-18 5:54 PM  
  **Notes**: Recommendation accepted in file 2026-10-18: no change; SC-004 names the by-eye method.  

  "Distinguishable" is judged by eye, with no contrast threshold.  

  - **Recommendation**: Acceptable, since SC-004 names the method (by eye, light and dark). No change.  

    ➡️ [X] **Accepted**  
    - No file changes.  

### **D1** · Duplication · LOW · tasks.md T011, T015, T017  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-10-18 5:54 PM  
  **Notes**: Recommendation accepted in file 2026-10-18: no change; each run closes its own story's cycle.  

  Three near-identical "run the favicon tests" steps.  

  - **Recommendation**: Acceptable: each closes its own story's red-to-green cycle. No change.  

    ➡️ [X] **Accepted**  
    - No file changes.  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 two files | Yes | T002, T013–T014 | |
| FR-002 three sizes | Yes | T012–T015 | |
| FR-003 links on 7 pages | Yes | T003–T011 | |
| FR-004 root `/favicon.ico` | Yes | T016–T017, T020 | prototype pages not checked (G2) |
| FR-005 figures only, colours | Yes | T002, T020 | |
| FR-006 centred, transparent, 1 px | Yes | T002, T020 | by eye only (G3) |
| FR-007 title, no alt | Yes | T002 | untested (G3) |
| FR-008 repeatable procedure, no build step | Yes | T001, T013–T014, T021 | "documented" gap (G1) |
| FR-009 logo unchanged | Yes | T002, T021 | |
| FR-010 automated checks | Yes | T003, T012, T016 | |
| SC-001 7 tabs | Yes | T011, T020 | |
| SC-002 root succeeds | Yes | T016–T017 | |
| SC-003 3 images | Yes | T012, T015 | |
| SC-004 light/dark by eye | Yes | T020 | |
| SC-005 one step | Yes | T013–T014 | |
| SC-006 nothing else changes | Yes | T018, T021 | |

## Constitution Alignment Issues

- C1 (CRITICAL): the documentation phase is missing.
- C2: the plan's gate table omits it.
- U1 touches Principle V (fail gracefully, with a clear message).
- Principles I–IV and VI are satisfied: T002 and T013 forbid explanatory comments, the scope check is T021, and every task has a verifiable result.

## Unmapped Tasks

None. T001 serves FR-008 (the script must be tracked); T018–T021 serve SC-006 and the quickstart checks.

## Metrics

- Total requirements: 16 (FR-001 to FR-010, SC-001 to SC-006)
- Total tasks: 21
- Coverage: 100% (16/16 have at least one task)
- Ambiguity count: 1
- Duplication count: 1
- Critical issues: 1

## Next Actions (as reported)

- **Resolve C1 before `/speckit-implement`:** add the documentation phase to `tasks.md`, and the C2 row to `plan.md`.
- **Worth fixing at the same time:** U1 (T013's browser-failure handling), plus I1/I2 (correct quickstart §3 and research R6).
- The LOW items may stay as they are.
- Suggested route: `/speckit-analyze-resolve`, or approve the edits below.
