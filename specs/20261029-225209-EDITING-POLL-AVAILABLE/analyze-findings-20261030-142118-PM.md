# Specification Analysis Report — specs/20261029-225209-EDITING-POLL-AVAILABLE

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261029-225209-EDITING-POLL-AVAILABLE |
| Report created | 2026-10-30 010110 PM |
| Analysis captured | 2026-10-30 010110 PM |
| Last updated | 2026-10-30 015852 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · MEDIUM · spec.md FR-005 vs plan.md research R2 / contracts/api.md A2  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-30 1:58 PM  
  **Notes**: Recommendation A accepted in file 2026-10-30: FR-003 now records the rule — any change to the choice list goes through review as one unit, deletions included, with R2's atomicity rationale (a rename can never apply half-way).  

  The spec says changes needing no content review take effect at save, but the plan routes **every** choice-list change — including a deletions-only save, which adds no screenable text — through the pending review (~5 s). The spec never classifies a deletions-only save.  

  - **Recommendation A** _(recommended)_: Record the plan's rule in the spec (Assumptions or FR-003): "any change to the choice list goes through review as one unit, deletions included", with R2's atomicity rationale.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: One apply path keeps a rename atomic; a one-line spec edit; still inside SC-003's 10-second budget.  
    - <u>Cons</u>: A deletions-only save waits ~5 s it strictly would not need to.  

  - **Recommendation B**: Carve deletions-only saves out of the pending path in plan/tasks: a choice-list change with no added or changed label applies at save.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: Honours FR-005 literally; deletions land instantly.  
    - <u>Cons</u>: Two apply paths for choices (save-time and sweep-time vote rewrite), and a rename splits across them — exactly the transient state R2 avoids.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage Gap · MEDIUM · spec.md FR-022; tasks.md T004/T007  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-30 1:54 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-30: extended T004 with the regression assertion that an open, never-voted poll's save still sets AWAITING APPROVAL with the full EDIT-mode flow unchanged (FR-022).  

  No task asserts that an open **never-voted** poll's editor and `/publish` → AWAITING APPROVAL flow stay byte-identical. T007 touches exactly that route, so a regression is plausible and nothing would catch it beyond pre-existing tests.  

  - **Recommendation**: Extend T004 with an explicit regression assertion: an open, never-voted poll's save still sets AWAITING APPROVAL and the full EDIT-mode editor is unchanged.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: Guards the seam T007 edits; one sentence in an existing task.  
    - <u>Cons</u>: Slightly widens T004's scope.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage Gap · MEDIUM · spec.md FR-017; tasks.md T020  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-30 1:54 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-30: added to T020 the assertion that after the switch to Anyone With The Link the `poll_invitations` rows, sent/accepted fields included, are unchanged (FR-017).  

  T020 tests access and vote survival across the sharing-mode switch but never asserts the invitation record itself is unchanged (FR-017's "kept unchanged as history").  

  - **Recommendation**: Add to T020: after switching to Anyone With The Link, the `poll_invitations` rows (and their sent/accepted fields) are byte-identical.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: FR-017's only untested clause gains an assertion; one sentence in an existing task.  
    - <u>Cons</u>: None of substance.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **T1** · Terminology · LOW · spec.md Key Entities ("Pending change set") vs plan/data-model/contracts ("pending update")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-30 1:54 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-30: the Key Entities entry now reads "**Pending change set** (implemented as `pending_update`)", ending the terminology drift.  

  The same concept has two names across artifacts.  

  - **Recommendation**: Add one alias line in spec's Key Entities: "Pending change set (implemented as `pending_update`)".  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: One line ends the drift without renaming either side.  
    - <u>Cons</u>: The spec names an implementation identifier (a deliberate, single exception).  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · LOW · spec.md Clarification Q1 / FR-024 vs contracts/ui-contracts.md C6/C8  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-30 1:54 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-30: appended the realization sentence to FR-024 — the card returns to its read-only face carrying the pending status, and the editor refuses entry until the review resolves.  

  The clarification reads as the card staying open with Save disabled; the design closes the wizard to the read-only face and refuses re-entering the editor while pending. Substance (visible status, no second save, quiet clear) is satisfied, but the literal wording differs.  

  - **Recommendation**: Add a sentence to FR-024 stating the realization: the card returns to its read-only face, which carries the pending status, and the editor refuses entry until resolved.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: Removes the literal mismatch before implementation reads FR-024.  
    - <u>Cons</u>: FR-024 grows slightly more prescriptive about UI mechanics.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · spec.md Edge Cases ("refused as invalid"); plan research R4 (vote path behaviour)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md spec.md Updated: 2026-10-30 1:58 PM  
  **Notes**: Recommendation B accepted in file 2026-10-30: added T035 — word the unknown-choice refusal in src/votes/votePath.ts as "That choice is no longer available — please choose again.", asserted in tests/polls-pending-update.test.ts — and updated the spec's Edge Cases and Assumptions lines so "refused as invalid" now names the clearer message instead of the generic one.  

  A vote naming a just-deleted choice is refused with the existing message "Select at least one choice." — technically the unknown-id path, but misleading for this scenario. The spec only says "refused as invalid".  

  - **Recommendation A** _(recommended)_: Accept the existing behaviour and record it: note in the spec's edge case that the refusal is the generic invalid-choice response, unchanged by this feature (Principle III).  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: No behaviour change; the window is seconds wide and the voter's retry simply works.  
    - <u>Cons</u>: The message stays slightly misleading for that rare case.  

  - **Recommendation B**: Add a task to word the unknown-id refusal (e.g. "That choice is no longer available — please choose again.") in src/votes/votePath.ts.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: A clearer message for the affected voter.  
    - <u>Cons</u>: Touches the vote hot path for a rare transient; widens scope beyond the requirements.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **F1** · Inconsistency · LOW · tasks.md T020/T024/T028  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-30 1:58 PM  
  **Notes**: Recommendation A accepted in file 2026-10-30: dropped the [P] markers on T020, T024 and T028 and rewrote the parallel-execution note — the three tasks extend the same suite and run serially.  

  All three carry [P] but extend the same new test file (`polls-pending-update.test.ts`); the file-level conflict is only acknowledged in a note.  

  - **Recommendation A** _(recommended)_: Drop the [P] markers on T020, T024 and T028 (serialize the writes to the shared suite).  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: The markers become truthful; zero structural change.  
    - <u>Cons</u>: Loses a theoretical parallelism the note already discouraged.  

  - **Recommendation B**: Split the suite into one file per story (e.g. polls-sharing-mode.test.ts, polls-choice-mode.test.ts, polls-mutability.test.ts) and keep [P].  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: True parallelism across stories.  
    - <u>Cons</u>: Three more embedded-postgres suite start-ups for small test sets; suites run sequentially anyway.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C3** · Coverage Gap · LOW · spec.md FR-002; tasks.md T003  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-30 1:54 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-30: T003 now names FR-002's preservation assertions — a second opener is refused LOCKED and the stale sweep still restores the stashed state while the projection publishes it.  

  FR-002 (exclusivity/expiry preserved) has no dedicated task text; it leans on the existing `polls-editing-lock` suite, which T003 happens to extend.  

  - **Recommendation**: Mention FR-002's preservation assertions explicitly in T003's description (second-opener refusal and stale-sweep expiry unchanged while the projection publishes the stashed state).  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: The intent survives into implementation; one clause in an existing task.  
    - <u>Cons</u>: None of substance.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 | ✔ | T003, T005 | |
| FR-002 | ⚠ | (T003, implicit) | Finding C3 |
| FR-003, FR-004 | ✔ | T004, T007, T008, T010 | |
| FR-005 | ✔ | T007, T021, T025, T029 | Finding I1 (deletions-only classification) |
| FR-006 | ✔ | T004, T006, T007 | |
| FR-007–FR-009 | ✔ | T012, T014, T017 | |
| FR-010, FR-011 | ✔ | T018, T019 | |
| FR-012 | ✔ | T013, T015, T017 | |
| FR-013, FR-014 | ✔ | T012, T014 | |
| FR-015 | ✔ | T012, T016 | |
| FR-016, FR-018 | ✔ | T020, T021 | |
| FR-017 | ⚠ | T020 (partial) | Finding C2 |
| FR-019 | ✔ | T024–T027 | |
| FR-020 | ✔ | T028–T030 | |
| FR-021 | ✔ | T020, T021 | |
| FR-022 | ⚠ | (implicit) | Finding C1 |
| FR-023 | ✔ | T021/T022, T025/T026, T029/T030 | enforced pairwise per setting |
| FR-024 | ✔ | T006, T009, T010, T011 | Finding I2 (wording) |
| FR-025 | ✔ | T004, T008 | |
| SC-001–SC-007 | ✔ | T003, T004, T012, T016, T032 | SC-008 is a qualitative UX outcome (C1 contract keeps the editor unchanged) |

## Constitution Alignment Issues

None reported. Documentation deliverables are tasked (T033/T034); no MUST principle is violated; the one judged complexity (whole-list pending) is justified in the plan's post-design re-check.

## Unmapped Tasks

None reported — T001/T002 are setup, T031–T034 map to A7, validation and the constitution's documentation phase.

## Metrics

- Total Requirements: 25 FR + 8 SC (7 buildable)
- Total Tasks: 34
- Coverage %: 92 % of FRs with ≥1 explicit task (23/25; FR-002 and FR-022 are preservation requirements relying on implicit coverage — findings C1/C3)
- Ambiguity Count: 1 (A1)
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

No CRITICAL issues — implementation is not blocked. The two MEDIUM coverage gaps (C1, C2) and the MEDIUM classification gap (I1) are each one-line edits to spec.md or tasks.md; `/speckit-analyze-findings` captures all findings for resolution, which replaces the analyze command's remediation offer.
