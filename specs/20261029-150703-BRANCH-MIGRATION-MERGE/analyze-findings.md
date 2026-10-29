# Specification Analysis Report — specs/20261029-150703-BRANCH-MIGRATION-MERGE

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261029-150703-BRANCH-MIGRATION-MERGE |
| Report created | 2026-10-29 045816 PM |
| Analysis captured | 2026-10-29 045816 PM |
| Last updated | 2026-10-29 050500 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **C1** · Constitution · CRITICAL · tasks.md T015 (Phase 4); constitution "Documentation Deliverables"  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-29 5:05 PM  
  **Notes**: Recommendation accepted in file 2026-10-29: Recommendation A, moved T015 (the README.md paragraph) into Phase 6, right after T018, without its [US2] label; the US2 Goal and Checkpoint now say the README link comes after implementation.  

  The constitution says README.md and ARCHITECTURE.md are updated only *after* the implementation phase. T015 edits `README.md` in Phase 4, before the US3 code (T016–T017) and before the full test run (T018).  

  - **Recommendation A** _(recommended)_: Move T015 into Phase 6 after T018, next to T020. The how-to document itself (T014) is not covered by this rule and can stay in US2.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: satisfies the constitution's ordering; the README paragraph is written once every command it names exists and the suite passes.  
    - <u>Cons</u>: US2's checkpoint no longer includes the README link; it is checked in Phase 6 instead.  

  - **Recommendation B**: keep T015 in Phase 4.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: US2 is complete in one phase.  
    - <u>Cons</u>: violates a constitution MUST, which `/speckit-analyze` reports as CRITICAL every time.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · HIGH · tasks.md T010, T012; research.md R6  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md Updated: 2026-10-29 5:02 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-29: Recommendation, a `siblingsRoot` parameter on `main`; tasks.md T010 passes `tests/fixtures/fix-migrations`, T012 gives `main` the parameter with the parent of the repository root as default; research.md R6 names `main` beside the planning function.  

  `main(argv, env, log)` always looks for the other folders' migration files in the folders next to this repository (`C:\crowdPoll\`). T010's F1 `--apply` case through `main` would therefore not find `013-fixture-foreign`, and would report a problem where the test expects `Done: 1 change(s) applied`.  

  - **Recommendation**: Give `main` a fourth parameter, `siblingsRoot` (default: the parent of the repository root), and have T010 pass `tests/fixtures/fix-migrations`.  

    ➡️ [X] **Accepted**  
    - The default keeps the command line unchanged; only tests pass the parameter.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · MEDIUM · tasks.md T012; research.md R6  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-29 5:02 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-29: Recommendation, reword T012; tasks.md T012 now says the default `siblingsRoot` is `dirname(dirname(dirname(scriptFile)))`, the parent of the repository root, which is two levels above the script.  

  T012 calls the folder holding the other branch folders "the parent of the repository root (two levels above the script)". That folder is three levels above `devScripts/fix-migrations.ts`; the repository root is the one two levels above.  

  - **Recommendation**: Reword T012 so the folder searched is `dirname(dirname(dirname(scriptFile)))`, the parent of the repository root.  

    ➡️ [X] **Accepted**  
    - research.md R6 is already right ("the repository root is two levels above the script; its parent…"); only T012 changes.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · MEDIUM · data-model.md (Problem); tasks.md T005, T011  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md Updated: 2026-10-29 5:05 PM  
  **Notes**: Recommendation accepted in file 2026-10-29: Recommendation A, a missing down() is found while planning; tasks.md T005 makes findForeignIn async, importing the file and returning the problem, with main resolving it before the synchronous planRepair; T007 adds a 013-fixture-no-down fixture and case; T011 no longer checks down; research.md R6 says the file is loaded while planning. data-model.md already lists the problem and is unchanged.  

  data-model lists "`<name>.ts has no down()`" as a planning-time problem, which means nothing is written. T011 instead raises it only during `--apply`, so a dry run would not show it.  

  - **Recommendation A** _(recommended)_: Have T005 load the file and report a missing `down` as a problem.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: fits FR-012 better: a dry run shows every reason the repair cannot be done.  
    - <u>Cons</u>: planning becomes asynchronous (it imports the file); `findForeignIn` returns a promise.  

  - **Recommendation B**: Remove that reason from data-model.md and keep it as an apply-time error.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: planning stays synchronous and file-reading only.  
    - <u>Cons</u>: the problem appears only with `--apply`, after the transaction has started (it is still rolled back).  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **G1** · Coverage · MEDIUM · tasks.md T013, T018; tsconfig.json `include: ["src/**/*.ts"]`  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-29 5:05 PM  
  **Notes**: Recommendation accepted in file 2026-10-29: Recommendation A, T013 and T018 add a tsc --noEmit run on devScripts/fix-migrations.ts with tsconfig.json's compiler options, since the root tsconfig.json checks only src/.  

  `npx tsc --noEmit` only checks `src/`, so `devScripts/fix-migrations.ts` and the tests are never type-checked. Vitest strips types without checking them, so T013 and T018 overstate what they verify.  

  - **Recommendation A** _(recommended)_: Add a check, for example `npx tsc --noEmit --module nodenext --moduleResolution nodenext --target es2023 --strict devScripts/fix-migrations.ts`, to T013 and T018.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: the script is type-checked, with the files it imports from `src/`; no change to `tsconfig.json`.  
    - <u>Cons</u>: one extra command; its flags must match `tsconfig.json`'s module settings.  

  - **Recommendation B**: Say plainly in T013 that the tests are the only check on the script.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: matches how the other developer scripts are checked today.  
    - <u>Cons</u>: type errors in paths the tests do not run go unnoticed.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **G2** · Coverage · MEDIUM · spec.md SC-005; tasks.md T019; quickstart §5  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-29 5:02 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-29: Recommendation, extend T019 to §5; tasks.md T019 now walks quickstart §2–§5, §5 repeating the F2 case from the document alone in under 5 minutes (SC-005).  

  SC-005 says a developer recovers from F2 using only the document in under 5 minutes. T019 walks through quickstart §2–§4 but not §5, which is the document check.  

  - **Recommendation**: Extend T019 to §5.  

    ➡️ [X] **Accepted**  
    - SC-005 then has a task that verifies it.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Constitution (VI) · LOW · tasks.md T004  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-29 5:02 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-29: Recommendation, name the parameter `recordsInTimeOrder`; tasks.md T004 signature no longer carries `/* time order */`.  

  The planned signature carries an explanatory inline comment, `/* time order */`.  

  - **Recommendation**: Name the parameter `recordsInTimeOrder` instead.  

    ➡️ [X] **Accepted**  
    - The name carries what the comment said, as Principle VI asks.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A2** · Ambiguity · LOW · spec.md SC-003; tasks.md T008–T010  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-29 5:05 PM  
  **Notes**: Recommendation accepted in file 2026-10-29: Recommendation A, T009 adds a snapshot(db) helper (kysely_migration rows and every public column), and the failure, lock-wait, dry-run, refused and problem cases in T009 and T010 compare snapshots; spec.md SC-003 is unchanged.  

  SC-003 says "byte-for-byte unchanged", but the tests only check the migration records and the named fixture tables.  

  - **Recommendation A** _(recommended)_: Have the dry-run and failure tests compare a snapshot of `kysely_migration` rows plus the database's tables and columns.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: SC-003 is tested as written.  
    - <u>Cons</u>: a small snapshot helper in the test file.  

  - **Recommendation B**: Soften SC-003 to "record and schema unchanged".  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no extra test code.  
    - <u>Cons</u>: the criterion stays only partly verified.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **D1** · Drift · LOW · requirements.md UA9 example vs research R8 / contracts C5 / T017  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-10-29 5:02 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-29: Recommendation, nothing needed; contracts/cli.md C5 stays the source of the hint wording, and no file changed.  

  The hint wording differs: `Run npm run fix-migrations (see …)` against `Run npm run fix-migrations in this folder; see …`. The core artifacts agree with each other.  

  - **Recommendation**: Nothing needed; C5 is the source of truth.  

    ➡️ [X] **Accepted**  
    - The requirements give the wording as an example ("For example: …").  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **K1** · Constitution (README rule) · LOW · plan.md Constitution Check; T015  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-10-29 5:02 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-29: Recommendation, acceptable as planned; T015's paragraph carries both commands, and no file changed.  

  `README.md` must not reference requirements, specs, architecture or design documents. The how-to is none of these, and the README already points at `devScripts/populate/README.md`.  

  - **Recommendation**: Acceptable as planned. Keep T015's paragraph useful on its own by including both commands, which it already does.  

    ➡️ [X] **Accepted**  
    - No artifact changes.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 local only, production never | ✅ | T010, T012 | |
| FR-002 shared database kept | n/a | — | A constraint; nothing to build |
| FR-003 `NNN-` naming | ✅ | T014 | Documented |
| FR-004 compare with own folder | ✅ | T004, T012 | |
| FR-005 `ENV_DATABASE_URL` | ✅ | T010, T012 | |
| FR-006 refuse non-local before connecting | ✅ | T010, T012 | |
| FR-007 dry run by default | ✅ | T010, T012 | |
| FR-008 plan content | ✅ | T010, T012 | |
| FR-009 F2 rename | ✅ | T004, T006, T008, T011 | |
| FR-010 F1 rollback from another folder | ✅ | T005, T007, T008, T011 | See I1 and I3 |
| FR-011 F3 apply in order | ✅ | T004, T006, T008, T011 | |
| FR-012 unclassifiable → nothing written | ✅ | T004, T006, T010 | |
| FR-013 one transaction, lock, 10 s | ✅ | T009, T011 | Test timeout is 30 s, which is enough |
| FR-014 server check passes afterwards | ✅ | T008, T011 | |
| FR-015 output and exit codes | ✅ | T010, T012 | |
| FR-016 npm script, file tracked by git | ✅ | T001, T002 | |
| FR-017 no new dependency | n/a | — | A constraint |
| FR-018 document linked from README | ✅ | T014, T015 | See C1 |
| FR-019, FR-020 document content | ✅ | T014 | |
| FR-021–FR-024 start-up message | ✅ | T016, T017 | |
| FR-025 tests | ✅ | T006–T010, T016 | |
| SC-001, SC-002 | ✅ | T008, T019 | |
| SC-003 unchanged on dry run or failure | ⚠️ | T009, T010 | Partial; see A2 |
| SC-004 never connects remotely | ✅ | T010 | |
| SC-005 recovery from the document alone | ⚠️ | T014 | Not walked through; see G2 |
| SC-006 refusal names the fix | ✅ | T016, T017 | |

## Constitution Alignment Issues

C1 (critical), A1 (low), K1 (low, acceptable).

## Unmapped Tasks

None. T020 and T021 are the documentation tasks the constitution requires.

## Metrics

- Requirements: 25 FR + 6 SC = 31.
- Tasks: 21.
- Coverage: 100% of the 29 requirements that need work (two are constraints with nothing to build). Two success criteria are only partly covered: SC-003 and SC-005.
- Ambiguities: 1.
- Duplications: 0.
- Critical issues: 1.

## Next Actions (as reported)

- Fix **C1** before `/speckit-implement` by moving T015 into Phase 6. It is a one-line move in `tasks.md`.
- Fix **I1** too, or T010's F1 case through `main` fails as written.
- The medium items (I2, I3, G1, G2) are each small edits to `tasks.md` and `data-model.md`. The low items are optional.
- After that, run `/speckit-implement`. You can also run `/speckit-analyze-findings` to work through these one at a time.
