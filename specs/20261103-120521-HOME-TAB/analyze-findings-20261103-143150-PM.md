# Specification Analysis Report — specs/20261103-120521-HOME-TAB

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261103-120521-HOME-TAB |
| Report created | 2026-11-03 022159 PM |
| Analysis captured | 2026-11-03 022159 PM |
| Last updated | 2026-11-03 022600 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

This skill may edit only `spec.md`, `plan.md` and `tasks.md` in the feature folder. Every finding below points at a
supporting document (`research.md`, `data-model.md`, `contracts/`, `CLAUDE.md`), so each offers two ways out: make
`tasks.md` the stated authority for the drifted point (this skill can do it), or accept the report's edit and make it
by hand (recorded here as Files Unchanged).

## Findings

### **D1** · Inconsistency · MEDIUM · research.md R2, R12; data-model.md "Setting"; contracts/api.md A2 vs. spec.md FR-018a, tasks.md T001–T003, T008  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-03 2:26 PM  
  **Notes**: Recommendation accepted in file 2026-11-03: Recommendation A, tasks.md's header now says tasks.md wins where it and a supporting document disagree; T008 and T017 say `ENV_MAX_HOME_PAGE_POLLS` replaces research.md R2's limit. research.md, data-model.md and contracts/api.md are unchanged.  

  The design documents still give the candidate limit as "5 × `ENV_MAX_POLLS_SEARCH_RESULTS` rows" and list one setting. spec.md and tasks.md now use `ENV_MAX_HOME_PAGE_POLLS` (200 distinct polls, at least 1). Someone implementing from research.md would build the old limit.  

  - **Recommendation A** _(recommended)_: in tasks.md, state at T008 and T017 that the limit is `ENV_MAX_HOME_PAGE_POLLS` and that it replaces research.md R2's "5 × `ENV_MAX_POLLS_SEARCH_RESULTS`"; add to tasks.md's header that where tasks.md and the supporting documents disagree, tasks.md wins.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the implementer reads the right limit in the file they work from; this skill can make the edit now.  
    - <u>Cons</u>: research.md, data-model.md and contracts/api.md keep the stale text until someone edits them.  

  - **Recommendation B**: the report's edit: update research.md R2 and R12, the data-model.md Setting table and contracts/api.md A2 to `ENV_MAX_HOME_PAGE_POLLS` — by hand (this skill may not edit those files).  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: every document agrees.  
    - <u>Cons</u>: a hand edit, outside this skill; the finding is recorded with no file changed.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **D2** · Inconsistency · LOW · research.md R5; data-model.md "Per refresh" vs. tasks.md T017  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-03 2:26 PM  
  **Notes**: Recommendation accepted in file 2026-11-03: Recommendation A, T017 now says its per-refresh check (with `mayWatchMany` for rule 4) replaces research.md R5's and data-model.md's list. Those files are unchanged.  

  The per-refresh access check in R5 and data-model.md omits "may watch" for rule-4 polls; T017 (after I2) includes it.  

  - **Recommendation A** _(recommended)_: in tasks.md T017, state that its per-refresh check (including `mayWatchMany` for rule 4) replaces research.md R5's list.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the task the implementer follows is explicit; this skill can make the edit now.  
    - <u>Cons</u>: R5 and data-model.md keep the shorter list.  

  - **Recommendation B**: the report's edit: add "rule-4 rows in `mayWatchMany`" to research.md R5 and data-model.md — by hand.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: every document agrees.  
    - <u>Cons</u>: a hand edit, outside this skill.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **D3** · Inconsistency · LOW · contracts/ui-contracts.md C3 vs. tasks.md T019  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-03 2:26 PM  
  **Notes**: Recommendation accepted in file 2026-11-03: Recommendation A, T019 now says its rule replaces the first row of contracts/ui-contracts.md C3. That file is unchanged.  

  C3 says Home "selected from another tab or a menu" clears `keepOrder`. T019 (after U2) says choosing Home from a menu while it is already showing keeps it.  

  - **Recommendation A** _(recommended)_: in tasks.md T019, state that its rule replaces the C3 table's first row.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: one line in the task the implementer follows; this skill can make it now.  
    - <u>Cons</u>: C3 keeps its looser wording.  

  - **Recommendation B**: the report's edit: reword the C3 row to "selected from another tab (directly or from a menu), or the page loads", and add "choosing Home again while it is showing keeps it" — by hand.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the contract and the task agree.  
    - <u>Cons</u>: a hand edit, outside this skill.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **D4** · Inconsistency · LOW · CLAUDE.md (plan reference block) vs. plan.md Constraints  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-11-03 2:26 PM  
  **Notes**: Recommendation accepted in file 2026-11-03: Recommendation B, the developer edits CLAUDE.md by hand to read "one route, two settings (`ENV_HOME_TAB_REFRESH_INTERVAL`, `ENV_MAX_HOME_PAGE_POLLS`)"; this skill may not edit CLAUDE.md, so no file was changed here.  

  CLAUDE.md's summary of this plan says "one route, one setting"; the plan now has two settings.  

  - **Recommendation A** _(recommended)_: leave CLAUDE.md as it is for now: tasks.md T001 and plan.md already name both settings, and the block is rewritten after implementation (`/speckit-trim-claudemd`); record the finding with no file changed.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no edit outside the feature's files.  
    - <u>Cons</u>: an agent reading CLAUDE.md before the trim sees "one setting".  

  - **Recommendation B**: the report's edit: change it to "one route, two settings (`ENV_HOME_TAB_REFRESH_INTERVAL`, `ENV_MAX_HOME_PAGE_POLLS`)" — by hand.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: CLAUDE.md is right for the implementation run.  
    - <u>Cons</u>: a hand edit, outside this skill.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001–FR-006, FR-005a | Yes | T007, T009–T013, T023–T025, T027 | |
| FR-007–FR-010 | Yes | T006, T008, T009 | order within rule now specified |
| FR-011, FR-015 | Yes | T009, T014, T017 | D2 (docs only) |
| FR-012 | Yes | T006, T010 | |
| FR-013, FR-014, FR-016, FR-017, FR-019 | Yes | T014–T019 | |
| FR-018 | Yes | T001–T003 | |
| FR-018a candidate limit | Yes | T001–T003, T008, T014 | D1 (docs only) |
| FR-020 | Yes | T010 | |
| FR-021–FR-023 | Yes | T012, T020, T021, T023, T024 | |
| FR-024 | Yes | T001, T026 | |
| SC-002–SC-008 | Yes | T006, T014, T015, T010, T020, T023, T029, T008, T017 | |

## Constitution Alignment Issues

None reported.

## Unmapped Tasks

None reported.

## Metrics

- Total Requirements: 33 (26 FR + 7 buildable SC)
- Total Tasks: 30
- Coverage: 100%
- Ambiguity Count: 0
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

There are no CRITICAL or HIGH issues. The core artifacts agree, so `/speckit-implement` can proceed. Fix D1 before implementation, because T008 and T017 send the implementer to research.md R2 and R5. D2–D4 are small edits to research.md, data-model.md, contracts/ui-contracts.md and CLAUDE.md. `/speckit-analyze-findings` can capture these, but its rules only let it edit `spec.md`, `plan.md` and `tasks.md`, so these four edits would be made by hand.
