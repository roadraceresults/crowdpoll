# Specification Analysis Report — specs/20261021-204537-PRIVACY-AND-TERMS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261021-204537-PRIVACY-AND-TERMS |
| Report created | 2026-10-21 101853 PM |
| Analysis captured | 2026-10-21 101853 PM |
| Last updated | 2026-10-21 102024 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **C1** · Coverage · MEDIUM · tasks.md T003, T005; data-model.md `polls`  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-21 10:20 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, T003 now checks the `ever_voted` backfill (true with history, false without) and that `down` drops it.  

  Migration 009 now adds and backfills `polls.ever_voted` (T005), but its test T003 checks only the `user` columns and the session clearing.  

  - **Recommendation**: Extend T003: after migrating, a poll with a `vote_history` row has `ever_voted = true` and one without has `false`; `down` drops the column.  

    ➡️ [X] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · MEDIUM · plan.md Technical Context (Storage) and Source Code tree  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ plan.md Updated: 2026-10-21 10:20 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, Storage names `polls.ever_voted`; the source tree adds `polls/store.ts`, `votes/consumer.ts`, `pollCard.js` and `adminCard.js`.  

  The plan still describes the migration as "two `user` columns, session IP/user-agent cleared", and its source tree omits the files the resolutions added: `src/polls/store.ts` (T053), `src/votes/consumer.ts` (T050, T053), `src/public/pollCard.js` and `adminCard.js` (T051).  

  - **Recommendation**: Add `polls.ever_voted` to Storage and the four files to the source tree.  

    ➡️ [X] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · MEDIUM · CLAUDE.md SPECKIT block, lines 8 and 19  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ CLAUDE.md Updated: 2026-10-21 10:20 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, the SPECKIT block now names `polls.ever_voted` and C1–C9, lists the sign-in and link routes the gate lets through, the "Deleted user" display and the queued-vote skip, and why dropping history is safe. CLAUDE.md is outside the feature folder; the finding points at it directly.  

  The agent context still lists only four routes that pass the gate and says "two `user` columns"; it misses the sign-in and link routes (I2 of the first pass), `polls.ever_voted`, the queued-vote skip and the "Deleted user" display. This is the text implementation reads first.  

  - **Recommendation**: Update the block's gate bullet, migration summary and deletion bullet to match contracts/api.md A4, data-model.md and R8.  

    ➡️ [X] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · tasks.md T037  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-21 10:20 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, T037 split into two clauses with a semicolon.  

  The sentence runs two requirements together ("…and logs the counts and a poll whose only history…").  

  - **Recommendation**: Split it: "…and logs the counts; a poll whose only history was in the dropped partition still counts as voted…".  

    ➡️ [X] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · LOW · tasks.md T050–T053  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-10-21 10:20 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, no change: the Dependencies section already states the order (T050/T051 with US3, T053 before T042).  

  The new tasks took the next free IDs, so their numbers do not follow execution order (T050/T051 sit before T034; T053 must precede T042). The dependencies section says so.  

  - **Recommendation**: No change needed; the ordering is explicit in the Dependencies section.  

    ➡️ [X] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 – FR-004 documents | Yes | T008, T011, T012, T014 | |
| FR-005 placeholders, review | Yes | T011, T012, T052 | |
| FR-006 – FR-007 agreement | Yes | T005, T007, T018, T022, T026 | |
| FR-008 gate | Yes | T019, T020, T023–T025, T028 | link routes covered |
| FR-009 OAuth | Yes | T021, T027 | reworded |
| FR-010 – FR-013 links | Yes | T009, T010, T015–T017, T021, T027 | |
| FR-014 – FR-015 Your Data, dialog | Yes | T030, T034, T043, T044 | |
| FR-016 deletion scope | Yes | T029, T031, T050, T051 | queued votes, display |
| FR-017 – FR-019 | Yes | T029, T032, T033 | |
| FR-020 retention | Yes | T037, T042, T053 | migration test gap (C1) |
| FR-021 – FR-022 | Yes | T003, T005, T036, T040, T041 | |
| FR-023 – FR-024 | Yes | T001, T035, T038, T039 | |
| FR-025 privacy@ | Yes | T049 | manual |
| SC-001 – SC-007 | Yes | T008, T009, T018–T020, T029, T035, T037, T038, T049 | SC-003 timed in T049 |

## Constitution Alignment Issues

None.

## Unmapped Tasks

None.

## Metrics

- Total requirements: 32 (25 FR, 7 SC)
- Total tasks: 53
- Coverage: 100% (no partial)
- Ambiguity count: 1
- Duplication count: 0
- Critical issues: 0 (0 HIGH, 3 MEDIUM, 2 LOW)

## Next Actions (as reported)

- No CRITICAL or HIGH issues; you may proceed to `/speckit-implement`.
- C1 and I2 are worth fixing first (an untested backfill; stale notes steering implementation), both small.
- Suggested: `/speckit-analyze-findings` to capture and resolve these five (the fixes touch tasks.md, plan.md and CLAUDE.md).
