# Specification Analysis Report — specs/20261101-181626-USER-ADD-CHOICES

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261101-181626-USER-ADD-CHOICES |
| Report created | 2026-11-01 085046 PM |
| Analysis captured | 2026-11-01 085046 PM |
| Last updated | 2026-11-01 090211 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I6** · Inconsistency · LOW · spec.md FR-002, FR-005; contracts/ui-contracts.md C1; tasks.md T011, T017  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md tasks.md contracts/api.md Updated: 2026-11-01 9:01 PM  
  **Notes**: Recommendation accepted in file 2026-11-01: Recommendation A. FR-002 now requires that the user can view the poll (holds the permission to view polls); T017 step 2 checks `View Polls` with `holdsPermission` after `Vote on Polls` (`404`, as the prefetch route answers); A1's `404` row names a caller without `View Polls`.  

  C1's `mayAddChoice` now requires `View Polls` (I2 resolution), but FR-002 does not list it and the server route (T017) does not check it, so the button is stricter than the rule the server enforces. Harmless in practice: without `View Polls` the poll card is not shown at all (feature 025) and the prefetch answers 404.  

  - **Recommendation A** _(recommended)_: Add to FR-002 that the user can view the poll (holds `View Polls`).  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the spec names every condition the button checks; one rule across spec, UI and tests.  
    - <u>Cons</u>: the server still does not check it (viewing is already gated elsewhere), so FR-004's "every rule checked by the server" needs T017 to check it too — one more `holdsPermission` call.  

  - **Recommendation B**: Leave the spec as it is and note in R11 that the extra client check only prevents a dead button.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no spec or server change.  
    - <u>Cons</u>: the UI rule stays a little stricter than the spec's.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I7** · Inconsistency · LOW · research.md R5; tasks.md T017; contracts/api.md A1  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ research.md Updated: 2026-11-01 9:01 PM  
  **Notes**: Recommendation accepted in file 2026-11-01: R5's decision now says the state is checked first on the poll as read (so it is the first answer) and again on the raw row under the row lock.  

  R5 still says the state is checked "inside the write transaction", while T017 and A1 (I3 resolution) also pre-check it on the poll as read; R5 does not describe the pre-check.  

  - **Recommendation**: Add one line to R5: the state is checked first on the poll as read (so it is the first answer) and again under the row lock.  

    ➡️ [x] **Accepted**  
    - The research note matches the route and the contract.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 setting | Yes | T001–T004, T007, T029, T030 | |
| FR-002 who may add | Yes | T013, T015, T017, T020 | creator now needs the permission (I1 B); I6 |
| FR-003 states | Yes | T016, T017 | pre-check added (I3); I7 |
| FR-004 server-side checks | Yes | T015–T017 | |
| FR-005 button | Yes | T019, T020 | |
| FR-006 prefetch | Yes | T020 | detail conversion (U1) |
| FR-007 dialog | Yes | T018, T019 | |
| FR-008 length cap / Save disabled | Yes | T018, T026 | |
| FR-009 focus and keys | Yes | T018 | |
| FR-010 refusal display | Yes | T018 | |
| FR-011 empty | Yes | T014 | |
| FR-012 40 characters | Yes | T004, T006, T024, T029 | |
| FR-013 characters | Yes | T024 | |
| FR-014 duplicates | Yes | T014, T024, T026 | |
| FR-015 screening | Yes | T025 | |
| FR-016 ceiling under concurrency | Yes | T014, T016 | |
| FR-017 immediate append | Yes | T016 | |
| FR-018 no vote | Yes | T020 | |
| FR-019 other views | Yes | T005, T010, T016 | second-voter refresh case (C1) |
| FR-020 addedBy | Yes | T016, T039–T042 | |
| FR-021 privacy | Yes | T043 | |
| FR-022 own allowance | Yes | T012, T017, T026 | |
| FR-023 creator's save | Yes | T033–T035 | |
| FR-024 API description | Yes | T044 | |
| SC-001 time to see choice | Yes | T046 | quickstart scenario 3 |
| SC-002 refresh parity | Yes | T010, T016 | |
| SC-003 refusals | Yes | T010, T022 | |
| SC-004 ceiling | Yes | T010 | |
| SC-005 no lost votes | Yes | T031 | |
| SC-006 off by default | Yes | T001, T027 | |
| SC-007 keyboard | Yes | T011 | |

## Constitution Alignment Issues

None reported.

## Unmapped Tasks

None reported. T045–T047 are cross-cutting.

## Metrics

- Total Requirements: 31 (24 FR + 7 SC)
- Total Tasks: 47
- Coverage: 100% with ≥ 1 task (FR-019 and SC-001 now covered)
- Ambiguity Count: 0
- Duplication Count: 0
- Critical Issues Count: 0
- All 8 findings of the previous report confirmed resolved; none recurs.

## Next Actions (as reported)

- No CRITICAL, HIGH or MEDIUM issues remain; `/speckit-implement` may proceed.
- I6 and I7 are one-line wording alignments; record and accept them with `/speckit-analyze-findings`, or proceed and leave them.
- Outside the three core artifacts: `requirements/20261101-181626-user-add-choices/requirements.md` (AM1) still says "The poll's creator always may", which I1 B changed in the spec.
