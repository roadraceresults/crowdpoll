# Specification Analysis Report — specs/20261026-152737-POPULATE-TEST-POLL

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261026-152737-POPULATE-TEST-POLL |
| Report created | 2026-10-26 054535 PM |
| Analysis captured | 2026-10-26 054535 PM |
| Last updated | 2026-10-26 055839 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **E1** · Coverage gap · MEDIUM · tasks.md T024; `tsconfig.json` (`include: ["src/**/*.ts"]`, `rootDir: "src"`)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-26 5:51 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-26: Recommendation, T024 now also type-checks `devScripts/populate/populate-poll.ts` on its own with `npx tsc --noEmit --module nodenext --moduleResolution nodenext --target es2022 --strict --skipLibCheck`; `tsconfig.json` unchanged.  

  T024's `npx tsc --noEmit` only checks `src/`. The new script in `devScripts/` is never type-checked, and Vitest compiles it without checking types. So a wrong field name, such as the `Parameters<typeof writeBatch>` vote type or `config.publicOrigin`, would go unnoticed.  

  - **Recommendation**: Add a real type check of the script to T024, without changing `tsconfig.json`. One option: `npx tsc --noEmit --module nodenext --moduleResolution nodenext --target es2022 --strict --skipLibCheck devScripts/populate/populate-poll.ts`.  

    ➡️ [X] **Accepted**  
    - Catches type errors in the one new file that matters, and leaves the project's `tsconfig.json` and build untouched (Constitution III).  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **E2** · Coverage gap · MEDIUM · spec.md FR-016; tasks.md T007  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-26 5:51 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-26: Recommendation, T007 now asserts that every simulated voter's `votes` row matches their latest `vote_history` row (FR-016).  

  FR-016 requires each voter's *latest* vote to be their current one. No test checks this. T007 checks per-day counts and totals but never compares `votes` with `vote_history`.  

  - **Recommendation**: Add to T007: for every simulated voter, the `votes` row's choice and time equal their latest `vote_history` row.  

    ➡️ [X] **Accepted**  
    - One query in the existing test closes the only untested part of FR-016, which is what makes the final bars reflect the latest data point (NC1).  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **E3** · Coverage gap · MEDIUM · spec.md SC-003; tasks.md T025  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-26 5:51 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-26: Recommendation, T025 now compares the final percentages with the latest data point scaled to 100 (33.3% / 66.7%) and fails beyond 3 points (SC-003).  

  SC-003 (final bars within 3 points of the latest data point, for the example file) is only "recorded" in T025, never compared.  

  - **Recommendation**: Add to T025: compare the summary's percentages with the latest data point scaled to 100 (33.3% / 66.7%), and fail the step if either is more than 3 points off.  

    ➡️ [X] **Accepted**  
    - Makes SC-003 checkable with the numbers the summary already prints; no new code.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · LOW · contracts/cli.md C3; tasks.md T013 and T015  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-26 5:58 PM  
  **Notes**: Recommendation accepted in file 2026-10-26: Recommendation A, applied through T022 (this skill may not edit `contracts/cli.md` directly): T022 now also reorders the C3 example to the run order (target, several-match warning, Removed, was-CLOSED warning, progress lines, summary, notes); the code order in T013 and T015 is unchanged.  

  C3 shows "Warning: poll … was CLOSED" before "Removed … earlier test vote(s)". In the tasks the deletes run first (T013) and the refresh, which logs that warning, runs after (T015), so the real order is reversed.  

  - **Recommendation A** _(recommended)_: Reorder the C3 example to match the run order: target, several-match warning, Removed, was-CLOSED warning, progress, summary.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: a one-line move in the contract; the run order (delete, then refresh) stays as planned.  
    - <u>Cons</u>: the state warning appears after the deletes it relates to.  

  - **Recommendation B**: Have T013 read the poll's state and log the warning before the deletes, leaving C3 as it is.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: all warnings come together at the top of the output.  
    - <u>Cons</u>: moves logging out of the refresh step (T015) into T013, which the poll lookup in T008 then has to feed.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · LOW · contracts/cli.md C4 ("one line"); tasks.md T008 and T017  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-26 5:51 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-26: Recommendation, applied through T022 (this skill may not edit `contracts/cli.md` directly): T022 now also amends C4 to say an unknown creator's error follows the target line.  

  For an unknown creator, the target line is printed first (T008) and then the error. C4 says an input error produces one line.  

  - **Recommendation**: In C4, say that an unknown creator's error follows the target line. The other C4 errors are caught before `populatePoll` runs, so they stay one line.  

    ➡️ [X] **Accepted**  
    - The target line is useful exactly here (it shows which database lacked the creator), so the contract, not the code, should change.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · LOW · tasks.md T007  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-26 5:51 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-26: Recommendation, T007 now groups `vote_history` rows by the local calendar date of `voted_at`, computed in the test, not in SQL.  

  "`vote_history` rows per moved day" doesn't say whether "day" is the local or UTC date. Votes are stored as `timestamptz` but timed in local days.  

  - **Recommendation**: Say the rows are grouped by local calendar date, and compute it in the test (not in SQL).  

    ➡️ [X] **Accepted**  
    - SQL `date(voted_at)` uses the database session's time zone, which need not match the test process's; grouping in JavaScript matches how the script times the votes.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · LOW · data-model.md "Rows read and written"; spec.md FR-007  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md tasks.md Updated: 2026-10-26 5:51 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-26: Recommendation, FR-007 in spec.md now says newest = latest creation date, ties by poll id, and why the warning matters (creation dates are backdated); T008 orders by `created_at` desc then `id`; T022 now also amends `data-model.md` to match (this skill may not edit it directly). The requirements document (UA6, "the newest is used") needed no change.  

  "Newest" is defined by `created_at`. But the script backdates `created_at` to the first moved date, so a poll created by hand later always counts as newer than the script's own poll.  

  - **Recommendation**: Use `created_at` desc and break ties by `id`. Also state that `created_at` is backdated, so the warning in FR-007 matters.  

    ➡️ [X] **Accepted**  
    - Makes the choice deterministic and the consequence visible, without changing the rule the requirements fixed (UA6).  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · plan.md Performance Goals ("completes in minutes")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-10-26 5:58 PM  
  **Notes**: Recommendation accepted in file 2026-10-26: Recommendation A, leave it as is: plan.md keeps "completes in minutes", matching FR-020 (no time limit); T025 records the elapsed time without a pass mark.  

  Not measurable. Acceptable for a test tool with no time limit (FR-020), but T025 records an elapsed time with nothing to compare it to.  

  - **Recommendation A** _(recommended)_: Leave it as is.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: matches FR-020 (no time limit); no guessed number before the first real run.  
    - <u>Cons</u>: T025's recorded time has no reference.  

  - **Recommendation B**: State an expected range for the example (for example "under 30 minutes on a laptop") so T025 has a reference.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: gives the quickstart run a pass mark and flags a pathological slowdown.  
    - <u>Cons</u>: the figure is a guess until measured, and machines differ.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  
    

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 one argument, server env | ✅ | T011, T018, T019, T021 | |
| FR-002 print target, refuse none | ✅ | T008, T017 | |
| FR-003 read keys, choice order | ✅ | T004, T005 | |
| FR-004 sort, MM/DD/YY | ✅ | T004, T005 | |
| FR-005 shift to today | ✅ | T004, T006 | |
| FR-006 creator lookup, no email column | ✅ | T007, T008 | |
| FR-007 match poll, newest + warn | ✅ | T008, T012, T013 | see U2 |
| FR-008 new poll fields | ✅ | T007, T008 | |
| FR-009 refresh on rerun | ✅ | T012, T015 | |
| FR-010 choice matching, dropped votes | ✅ | T012, T014 | |
| FR-011 delete simulated rows | ✅ | T012, T013 | |
| FR-012 voter addresses | ✅ | T007, T009 | |
| FR-013 pool size | ✅ | T007, T009 | |
| FR-014 count spread, random voters | ✅ | T004, T006, T009 | |
| FR-015 share split | ✅ | T004, T006, T007 | |
| FR-016 vote times, oldest first | ⚠️ | T004, T006, T009 | latest-is-current untested (E2) |
| FR-017 writeBatch + reconcile always | ✅ | T007, T009, T010 | |
| FR-018 validation errors | ✅ | T016, T017, T020 | |
| FR-019 progress lines | ✅ | T009, T017 | |
| FR-020 summary, exit 0 | ✅ | T010, T011, T017 | |
| FR-021 full history, no retention change | ✅ | T009, T010 | |
| FR-022 location, gitignore, README, entry guard | ✅ | T001, T003, T023 | |
| FR-023 tests, committed fixture | ✅ | T002, T004, T007, T012, T016–T018 | |
| SC-002 per-data-point counts and shares | ✅ | T007 | |
| SC-003 final bars within 3 points (example) | ⚠️ | T025 | recorded, not compared (E3) |
| SC-004 rerun keeps one poll | ✅ | T012 | |
| SC-005 every C4 case | ✅ | T016, T017 | |
| SC-006 real votes untouched | ✅ | T012 | |
| SC-007 counters current | ✅ | T007 | |

SC-001 (one command) is covered by US1 as a whole.

## Constitution Alignment Issues

None.
- **VI:** the only comment is T003's header line pointing to the README, which counts as external documentation.
- **V:** logging is informative, and errors exit cleanly with code 1.
- **III:** nothing under `src/` is edited.
- **Documentation Deliverables:** covered by T026.

## Unmapped Tasks

None. T022 (amending the contract) and T024–T026 are polish tasks that support FR-022 and FR-023 and the constitution's documentation rule.

## Metrics

- Total Requirements: 23 functional requirements and 6 buildable success criteria (SC-001 is an outcome)
- Total Tasks: 26
- Coverage: 100% of functional requirements have at least one task; 2 items are only partly checked (FR-016, SC-003)
- Ambiguity Count: 1
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

- Nothing blocks implementation, so you can run `/speckit-implement` now.
- I'd fix E1 to E3 first. They're each a single line in `tasks.md` (T024, T007, T025) and they make the type check and two test checks real.
- I1, I2 and U2 are wording fixes in `contracts/cli.md` and `data-model.md`. U1 and A1 are optional.
- To record and apply these findings one at a time, run `/speckit-analyze-findings`.
