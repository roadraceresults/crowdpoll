# Specification Analysis Report — specs/20261102-154952-FIELD-LENGTH-LIMITS  

## Record  

| Record | Value |  
|---|---|  
| Feature directory | specs/20261102-154952-FIELD-LENGTH-LIMITS |  
| Report created | 2026-11-02 042525 PM |  
| Analysis captured | 2026-11-02 042525 PM |  
| Last updated | 2026-11-02 042630 PM |  

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save  
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.  
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.  
"Next" always returns the first open finding below.  

## Findings  

### **C1** · Coverage · MEDIUM · spec.md FR-012; tasks.md T029; CLAUDE_COMPLETE.md:99  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md plan.md Updated: 2026-11-02 4:26 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-02: Recommendation, T029 now also changes `CLAUDE_COMPLETE.md` line 99 to "`SUBTITLE_MAX` (40)"; plan.md's scope and source tree list `CLAUDE_COMPLETE.md` (four docs).  

  FR-012 asks for the developer guide to state the new limits; `CLAUDE_COMPLETE.md:99` still says "`SUBTITLE_MAX` (30)", and no task updates it (T029 covers README and ARCHITECTURE only).  

  - **Recommendation**: Extend T029 to change `CLAUDE_COMPLETE.md:99` to "`SUBTITLE_MAX` (40)".  

    ➡️ [X] **Accepted**  
    - The developer guide then agrees with the code; one more line in an existing task.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · LOW · tasks.md T014  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-02 4:26 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-02: Recommendation, T014 now names `tests/bar-palette.test.ts` (a case beside its `GET /api/config` request, line 46); the US2 parallel note counts eight test files.  

  T014 says to "find" an existing `/api/config` test rather than naming it; `tests/bar-palette.test.ts:46` already calls `GET /api/config`.  

  - **Recommendation**: Name `tests/bar-palette.test.ts` in T014 (a new case beside its `/api/config` request).  

    ➡️ [X] **Accepted**  
    - The task becomes executable without a search.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · LOW · tasks.md T004; tests/populate-poll.test.ts:57-60  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-02 4:26 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-02: Recommendation, T004 now also turns the case at `tests/populate-poll.test.ts:57-60` into "accepts a 40-character subtitle unchanged".  

  "accepts a 30-character subtitle unchanged" pins the old at-limit value; at 40 it still passes but no longer tests the limit, and T004 changes only the refusal cases.  

  - **Recommendation**: Add to T004: make that case "accepts a 40-character subtitle unchanged" with `"x".repeat(40)`.  

    ➡️ [X] **Accepted**  
    - The at-limit case moves with the limit, as in the other files.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · LOW · spec.md Edge Cases ("A browser that loaded an older page …"); research.md R4  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-02 4:26 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-02: Recommendation, the Edge Cases bullet now says a page loaded before the deploy keeps 40 until reloaded, the server refusing 36–40 with "A choice can be at most 35 characters."  

  A page loaded before the deploy runs the old script, which reads `wizardChoiceMax` (now absent) and falls back to 40, not 35; until reloaded, a voter can type 36–40 and gets the server's "at most 35" refusal. The edge case says such a browser uses 35.  

  - **Recommendation**: Reword the edge case: a page loaded before the deploy keeps 40 until reloaded, and the server's 35-character refusal message covers the gap.  

    ➡️ [X] **Accepted**  
    - The spec then describes what actually happens; no code change.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary  

| Requirement Key | Has Task? | Task IDs | Notes |  
|-----------------|-----------|----------|-------|  
| FR-001 title 60 | Yes | T002–T006 | |  
| FR-002 subtitle 40 | Yes | T002–T006 | see U2 |  
| FR-003 single choice limit | Yes | T015, T027, T030 | |  
| FR-004 35 everywhere new | Yes | T008–T013, T015–T020 | |  
| FR-005 stored-label exemption | Yes | T021–T023, T025, T026 | |  
| FR-006 existing poll's box | Yes | T024, T026 | |  
| FR-007 nothing stored changed | Yes | T021–T023, T031 | |  
| FR-008 `choiceLabelMax` | Yes | T014, T016–T020 | see U1 |  
| FR-009 copies equal + test | Yes | T006, T017, T027 | |  
| FR-010 messages | Yes | T002, T008, T010–T012, T015 | |  
| FR-011 views at 360 px | Yes | T007, T032 | manual, as planned (R6) |  
| FR-012 docs, migration 007 kept | Partial | T028, T029, T031 | see C1 |  
| SC-001 | Yes | T002, T003, T007 | |  
| SC-002 | Yes | T008–T013, T024 | |  
| SC-003 | Yes | T021–T023 | |  
| SC-004 | Yes | T027, T030 | |  

## Constitution Alignment Issues  

None reported. The `adminCard.js:1408` comment (Principle VI) is removed in T026; README and ARCHITECTURE are in T029.  

## Unmapped Tasks  

None reported. T001 and T030–T032 are cross-cutting verification.  

## Metrics  

- Total Requirements: 16 (12 FR + 4 SC)  
- Total Tasks: 32  
- Coverage: 100% have ≥1 task (FR-012 partial — C1)  
- Ambiguity Count: 0  
- Duplication Count: 0  
- Critical Issues Count: 0  

## Next Actions (as reported)  

No CRITICAL or HIGH issues. The four MEDIUM/LOW findings are one-line edits to `tasks.md` / `spec.md`; resolving them before `/speckit-implement` is recommended but not blocking.  
