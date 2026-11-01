# Specification Analysis Report — specs/20261101-042151-CONCISE-CLAUDE-MD

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261101-042151-CONCISE-CLAUDE-MD |
| Report created | 2026-11-01 122231 PM |
| Analysis captured | 2026-11-01 122231 PM |
| Last updated | 2026-11-01 123800 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · MEDIUM · spec.md FR-009 and Clarifications Q1; research.md R5; contracts/command.md K3; tasks.md T006  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md data-model.md tasks.md Updated: 2026-11-01 12:33 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-01: Recommendation, FR-009 now says existing chain entries keep their text except the previous newest entry's opening ("The preceding feature is"); the same wording in data-model.md (complete file, chain rule) and T006 ("otherwise never rewrite").  

  FR-009 and Q1 say feature summaries already in the chain are "never rewritten". R5, K3 and T006 then change the opening of the previous newest entry to "The preceding feature is", which is a rewrite.  

  - **Recommendation**: Reword FR-009: existing chain entries keep their text, except that the opening phrase of the previous newest entry becomes "The preceding feature is".  

    ➡️ [X] **Accepted**  
    - The chain's existing form, where only the newest entry says "read the current plan", is kept, and the spec now says exactly what the skill does.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · MEDIUM · spec.md FR-001; research.md R4; data-model.md (complete file, "Other sections")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md research.md data-model.md contracts/command.md tasks.md Updated: 2026-11-01 12:38 PM  
  **Notes**: Recommendation accepted in file 2026-11-01: Recommendation B, deletions the developer made by hand are carried over; FR-001 stays as written.  
  FR-009 and a new Edge Case say so; research R4, data-model.md (complete file, "Other sections"), contracts/command.md K3 and T005 remove a passage's counterpart from `CLAUDE_COMPLETE.md` when it is missing from `CLAUDE.md` relative to the baseline.  
  The risk named under Cons is avoided because the baseline is the previous run's own output, so its condensing never shows as a deletion; the one exception, `CLAUDE_COMPLETE.md` with uncommitted changes, ignores removals and says so in the report.  

  FR-001 says the complete file holds everything "that is still current". R4 ignores text removed from `CLAUDE.md`, so a passage the developer deleted as obsolete stays in `CLAUDE_COMPLETE.md`.  

  - **Recommendation A** _(recommended)_: Reword FR-001 to match R4: the complete file keeps everything `CLAUDE.md` has held, with edits replacing their old wording, and deletions are not carried over.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: simple and safe; the condensing step removes text from `CLAUDE.md` all the time, and it must never remove the same text from the complete file.  
    - <u>Cons</u>: a passage the developer deletes as obsolete has to be deleted from `CLAUDE_COMPLETE.md` by hand.  

  - **Recommendation B**: Carry over deletions the developer made by hand: a removed passage that the previous run had not condensed away is also removed from `CLAUDE_COMPLETE.md`. FR-001 stays as written.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: the complete file stays current without hand edits.  
    - <u>Cons</u>: the skill must tell a deliberate deletion from its own condensing, which risks losing text from the complete record.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · contracts/command.md K5; tasks.md T007; spec.md Edge Cases  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md contracts/command.md tasks.md requirements.md Updated: 2026-11-01 12:33 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-01: Recommendation, the merge recipe now keeps the side of `CLAUDE.md` whose SPECKIT block names the branch's own plan: spec.md Edge Cases, contracts/command.md K5, tasks.md T007, and the requirements' Resolutions, UA6 (`requirements/20261101-042151-concise-claude-md/requirements.md`).  

  The merge recipe says to take "either side" of `CLAUDE.md`. For a branch planned before this feature, taking `main`'s side throws away the branch's own feature summary. `CLAUDE_COMPLETE.md` doesn't hold it yet, so it is lost from both files.  

  - **Recommendation**: In K5, T007 and the Edge Case, say to take the side whose SPECKIT block names the branch's own plan (the branch's side). The next run then moves that summary into `CLAUDE_COMPLETE.md`.  

    ➡️ [X] **Accepted**  
    - The run adds any plan the block names that is not yet in the chain (T006), so keeping the branch's block is enough to keep its summary.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Coverage · LOW · spec.md FR-011; tasks.md T004, T006  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-01 12:33 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-01: Recommendation, T006 now checks the new feature's decisions for a cross-feature invariant and adds it by T004's rule (FR-011).  

  FR-011 says a later run adds a cross-feature invariant from a new feature's decisions. T004 defines how an invariant is chosen, but no later-run task says to do it.  

  - **Recommendation**: Add to T006: "check the new feature's decisions for a cross-feature invariant and add it (T004's rule)".  

    ➡️ [X] **Accepted**  
    - It closes the one partial coverage gap.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U3** · Underspecification · LOW · tasks.md T003; contracts/file-layout.md F1  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-01 12:33 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-01: Recommendation, T003 now leaves today's *Current State* sentence "Every feature in the Spec Kit block above is implemented…" out of Layout.  

  Today's *Current State* opens with "Every feature in the Spec Kit block above is implemented…". That stops being true once the block holds one feature, and neither T003 nor F1 says to drop or reword it.  

  - **Recommendation**: Add to T003: Layout leaves out that sentence.  

    ➡️ [X] **Accepted**  
    - The concise file then makes no claim about a list it no longer holds.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · LOW · spec.md FR-016 and User Story 4 scenario 2; contracts/messages.md M2  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md contracts/messages.md requirements.md Updated: 2026-11-01 12:36 PM  
  **Notes**: Recommendation accepted in file 2026-11-01: Recommendation A, `/speckit-tweaks` corrected to `/speckit-tweak` in spec.md (User Story 4, scenario 2), contracts/messages.md M2 (with a note on the correction), and the requirements' Resolutions, UA7 (`requirements/20261101-042151-concise-claude-md/requirements.md`).  

  The journey list says `/speckit-tweaks`, but the skill is `/speckit-tweak`. The old list had the same slip, and the developer's text repeats it.  

  - **Recommendation A** _(recommended)_: Correct it to `/speckit-tweak` in M2 and the spec.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: the list names a command that exists, so typing it works.  
    - <u>Cons</u>: it departs from the developer's exact wording in the requirements' Resolutions (UA7).  

  - **Recommendation B**: Keep the developer's wording, `/speckit-tweaks`, as it is.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: matches the requirements word for word.  
    - <u>Cons</u>: typing `/speckit-tweaks` finds no skill.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C1** · Constitution · LOW · plan.md (Constitution Check, Documentation Deliverables); tasks.md  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-01 12:33 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-01: Recommendation, T011 now confirms that `README.md` and `ARCHITECTURE.md` need no update.  

  The constitution requires `README.md` and `ARCHITECTURE.md` to be generated after each feature. The plan says no change is needed, but no task checks this. Read-only check: neither file mentions `CLAUDE.md` or Spec Kit.  

  - **Recommendation**: Add to T011: confirm `README.md` and `ARCHITECTURE.md` need no update.  

    ➡️ [X] **Accepted**  
    - The documentation rule gets an explicit, checkable step without adding work.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 complete file | Yes | T003, T005, T006, T013 | see I2 |
| FR-002 concise contents | Yes | T003, T004 | |
| FR-003 named once, never imported | Yes | T003, T011 | |
| FR-004 absent sections | Yes | T003, T008 | |
| FR-005 no size limits | Yes | T001, T011 | |
| FR-006 settings rule | Yes | T008 | |
| FR-007 manual only | Yes | T001, T012 | |
| FR-008 first-run copy | Yes | T003, T013 | |
| FR-009 later-run merge | Yes | T005, T006 | see I1 |
| FR-010 block in any form | Yes | T006 | |
| FR-011 invariants and settings | Partial | T004, T008 | see U2 |
| FR-012 size report | Yes | T002 | |
| FR-013 no stage, no commit, no question | Yes | T002, T011 | |
| FR-014 merge recipe | Yes | T007 | see U1 |
| FR-015 tweak message | Yes | T009 | |
| FR-016 journey list | Yes | T010 | see I3 |
| FR-017 shipped files untouched | Yes | T007, T012 | |
| FR-018 no app change | Yes | (no task needed; T012 §5) | |
| SC-001 smaller, judged | Yes | T013 | |
| SC-002 verbatim | Yes | T013 | |
| SC-003 one feature in block | Yes | T014 | |
| SC-004 rule loading | Yes | T013 | |
| SC-005 one invocation, no question | Yes | T002, T014 | |
| SC-006 shipped untouched | Yes | T012 | |

## Constitution Alignment Issues

C1 (LOW) only; no MUST is violated. Principles I–IV pass, and V–VI do not apply because no code is added.

## Unmapped Tasks

None reported.

## Metrics

- Total requirements: 24 (18 FR, 6 SC)
- Total tasks: 14
- Coverage: 100% have at least one task (FR-011 partly; U2)
- Ambiguity count: 0
- Duplication count: 0
- Critical issues: 0

## Next Actions (as reported)

There are no critical or high findings, so `/speckit-implement` could go ahead. Resolving I1, I2 and U1 first is
worthwhile, because they decide how the skill's merge and merge-recipe sections are written. `/speckit-analyze-findings`
(next) captures these findings for resolution.
