# Specification Analysis Report — specs/20261028-151716-REFRESH-MECHANISMS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261028-151716-REFRESH-MECHANISMS |
| Report created | 2026-10-28 103724 PM |
| Analysis captured | 2026-10-28 103724 PM |
| Last updated | 2026-10-28 103845 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · MEDIUM · spec.md US1 scenario 6 ("only missing ones are written") vs FR-008, research.md R5, T009/T010  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md requirements.md Updated: 2026-10-28 10:38 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-28: Recommendation, US1 scenario 6 in spec.md now reads "only missing or stale ones are written, all at once"; the matching sentence in requirements.md (RS9 item 2) says "missing from the cache or stale".  

  FR-008 now says "missing … or stale"; the user-story scenario still says "only missing ones", so the acceptance text and T009 ("writes a missing or stale one") disagree.  

  - **Recommendation**: Change US1 scenario 6 to "only missing or stale ones are written, all at once".  

    ➡️ [X] **Accepted**  
    - Makes the acceptance scenario say what FR-008 requires and T009 tests.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · MEDIUM · spec.md US2 scenario 3 ("returns to the window"), US2 Independent Test ("switch away and back"); quickstart.md step 3.3 ("Switch A to another window and back") vs FR-010, C2, R6 (visibility only)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md quickstart.md Updated: 2026-10-28 10:38 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-28: Recommendation, US2 scenario 3 and its Independent Test in spec.md, and quickstart.md step 3.3, now say the page becomes visible again (another browser tab, or minimize and restore).  

  FR-010 now says "the page becoming visible", and window `focus` is deliberately ignored; the story, its independent test and quickstart step 3.3 still describe a window switch, which may not change visibility, so step 3.3 can fail on a correct build.  

  - **Recommendation**: Say "the page becomes visible again (another browser tab, or minimize and restore)" in US2 scenario 3, the Independent Test and quickstart step 3.3.  

    ➡️ [X] **Accepted**  
    - The story, its test and the quickstart then describe the same trigger as FR-010, C2 and T018.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · LOW · tasks.md Notes, last bullet  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-28 10:38 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-28: Recommendation, the last Notes bullet in tasks.md now says the one refusal is allowed by US5 scenario 3 and SC-006.  

  Still says "the spec's US5 scenario 3 and SC-006 do not yet say so"; they now do (previous I1).  

  - **Recommendation**: Change it to "… can be refused once with `retryAfterMs`, as US5 scenario 3 and SC-006 allow."  

    ➡️ [X] **Accepted**  
    - Removes a stale note that would send an implementer looking for a gap that is closed.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I4** · Inconsistency · LOW · CLAUDE.md SPECKIT block, Live Results bullet ("a `200`, a vote, an add or remove, or the page becoming visible resets it") vs FR-010, R6, C2  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ CLAUDE.md Updated: 2026-10-28 10:38 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-28: Recommendation, the Live Results bullet of the CLAUDE.md SPECKIT block now lists a `429`/`503` among the resets.  

  The agent context omits that a `429`/`503` also resets the back-off (previous U1); an implementer reading CLAUDE.md alone would miss it.  

  - **Recommendation**: Add "or a `429`/`503`" to that bullet.  

    ➡️ [X] **Accepted**  
    - Keeps the agent context's summary of R6 complete.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Coverage · LOW · spec.md FR-001 ("any ban … added or removed"), US1 scenario 2; tasks.md T007 (only "ban added")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-28 10:38 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-28: Recommendation, T007 in tasks.md now tests "ban added and ban removed".  

  Ban removal goes through the same `writeRoster(trx, pid, "poll_bans", …)` in `updatePoll` (src/polls/store.ts:686) and is signalled by T012, but no test checks that a removed ban reaches the tab.  

  - **Recommendation**: Add "and ban removed" to T007.  

    ➡️ [X] **Accepted**  
    - Every relation change FR-001 names is then tested both ways.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 | ✅ | T004, T005, T007 | ban removal untested (U1) |
| FR-002 | ✅ | T007, T012–T016 | |
| FR-003 | ✅ | T008, T011 | |
| FR-003a | ✅ | T008, T012, T016 | |
| FR-004 | ✅ | T006, T011 | |
| FR-005 | ✅ | T006, T011 | |
| FR-006 | ✅ | T006, T011 | |
| FR-007 | ✅ | T008, T011 | |
| FR-008 | ✅ | T009, T010 | US1 scenario 6 wording (I1) |
| FR-009 | ✅ | T018, T020 | |
| FR-010 | ✅ | T018, T020 | US2 scenario wording (I2) |
| FR-011 | ✅ | T025, T027, T028 | |
| FR-012 | ✅ | T026, T029, T030 | |
| FR-013 | ✅ | T021–T024 | |
| FR-014 | ✅ | T031, T033 | |
| FR-014a | ✅ | T017, T032–T034 | |
| FR-015 | ✅ | T035–T037 | |
| FR-016 | ✅ | T035, T036 | |
| FR-017 | ✅ | T035 | |
| FR-018 | ✅ | T038, T039 | |
| FR-019 | ✅ | T037, T040 | |
| SC-001 | ✅ | T044 | |
| SC-002 | ✅ | T017, T034 | production check through the log line |
| SC-003 | ✅ | T018, T019 | |
| SC-004 | ✅ | T025, T026 | |
| SC-005 | ✅ | T021 | |
| SC-006 | ✅ | T031 | |
| SC-007 | ✅ | T035, T036 | by construction (5× interval) |
| SC-008 | ✅ | T041 | |

## Constitution Alignment Issues

None. Phase 9 is post-implementation documentation and depends on US1–US6; T038 ports the Mermaid diagrams; every FR has a test; no requirement-referencing comments in code (Path Conventions).

## Unmapped Tasks

None (T001, T041–T043 are setup/polish).

## Metrics

- Total Requirements: 29 (21 FR, 8 SC)
- Total Tasks: 44
- Coverage %: 100 %
- Ambiguity Count: 0
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

- No CRITICAL or HIGH issues: `/speckit-implement` may proceed.
- I2 is the one worth fixing first (a quickstart step that can fail on a correct build).
- All five have a single recommendation: `/speckit-analyze-findings` then "Accept all" resolves them in one pass, then `/speckit-analyze` again.
