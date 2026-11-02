# Specification Analysis Report — specs/20261101-181626-USER-ADD-CHOICES

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261101-181626-USER-ADD-CHOICES |
| Report created | 2026-11-01 072834 PM |
| Analysis captured | 2026-11-01 072834 PM |
| Last updated | 2026-11-01 084300 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **U1** · Underspecification · HIGH · tasks.md T020; contracts/ui-contracts.md C2 step 3; research.md R11  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md contracts/ui-contracts.md Updated: 2026-11-01 8:20 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-01: Recommendation, the prefetch answer becomes a card detail as `tabs.js` `mountLinkedPoll` builds it (`DeltaClient.toPollDetail`) before `applyPoll`; the full-poll check reads `poll.choices.length` — C2 step 3, R11, T020; T011 asserts the counts survive.  

  The press applies `GET /api/me/polls/:pid`'s raw `poll` projection through `applyPoll`, but the card's `applyPoll` expects the detail shape `deltaClient.toPollDetail` builds (`count`/`pct` per choice, `canVote`, `voteBlockedReason`, `myChoiceIds`, `ownPoll` from `counts` + `overlay`); applying the raw projection would blank the counts and lose eligibility.  

  - **Recommendation**: State in C2/T020 that the answer's `poll`, `counts` and `overlay` are turned into a card detail the same way the linked-poll path does (`tabs.js:1043` / `deltaClient.toPollDetail`) before `applyPoll`, and that the full-poll check reads `poll.choices.length`; add a T011 assertion that counts survive the prefetch.  

    ➡️ [X] **Accepted**  
    - The card keeps its bars and counts across the prefetch, and the shape conversion stays in one place.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · MEDIUM · spec.md FR-002; tasks.md T017; contracts/ui-contracts.md C1; contracts/api.md A1  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-01 8:43 PM  
  **Notes**: Recommendation accepted in file 2026-11-01: Recommendation B, reword FR-002 so the creator also needs `Vote on Polls`; spec.md FR-002 now lists the permission for every user, and the creator edge case says so; tasks.md and the contracts already required it.  

  FR-002 admits the poll's creator outright ("…holding the permission to vote) **or** they are the poll's creator"), but T017, C1 and A1 refuse anyone without `Vote on Polls`, the creator included.  

  - **Recommendation A** _(recommended)_: Exempt the creator from the permission check in T017/C1 (`ownPoll` client-side, `created_by_id` server-side), matching the spec.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the spec stays as written; a creator who can reach their own poll can always extend it.  
    - <u>Cons</u>: one more exemption to test; a creator without `Vote on Polls` can add but still not vote.  

  - **Recommendation B**: Reword FR-002 so the creator also needs `Vote on Polls`.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: one rule for everyone, as tasks and contracts already say; nothing to change in code plans.  
    - <u>Cons</u>: a creator whose permission was withdrawn loses the feature on their own poll.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · MEDIUM · requirements.md (UA4 decision); research.md R11; contracts/ui-contracts.md C2  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md contracts/ui-contracts.md Updated: 2026-11-01 8:20 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-01: Recommendation, R11 records that the prefetch keeps its page-load bucket; C1's `mayAddChoice` also requires `View Polls`; T011 tests the button hidden without it.  

  The prefetch route is limited by the page-load bucket (`pageLoads`, 120/min), not the manual-refresh floor the requirements name, and it answers `404` to a user without `View Polls`, whom FR-002 does not exclude, so such a user would see "Couldn't load the latest choices".  

  - **Recommendation**: Record in R11 that the route keeps its page-load bucket (no change), and have `mayAddChoice` also require `View Polls` (the session holds the permissions), so the button never leads to that 404.  

    ➡️ [X] **Accepted**  
    - The existing route is reused unchanged, and the button is offered only where the prefetch can succeed.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · MEDIUM · tasks.md T009, T028, T037  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-01 8:43 PM  
  **Notes**: Recommendation accepted in file 2026-11-01: Recommendation A, resolve each to its actual file; T009 now names `tests/helpers/poll-fixtures.ts` and `tests/refresh-deltas.test.ts` (there is no migration-list test), T028 `tests/polls-pending-update.test.ts`, T037 `tests/account-deletion.test.ts`.  

  Three tasks name their test files by description or glob ("search `lineGraphEnabled` in `tests/`", "the admin save tests (the suite covering…)", `tests/delete-account*.test.ts`) rather than an exact path.  

  - **Recommendation A** _(recommended)_: Resolve each to its actual file before implementation (e.g. `tests/line-graph-setting.test.ts`, the actual save and account-deletion suites).  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the new tests sit beside the ones covering the same routes.  
    - <u>Cons</u>: the paths must be looked up now.  

  - **Recommendation B**: Create new files with fixed names instead (e.g. `tests/voters-add-choices-setting.test.ts`, `tests/delete-account-added-by.test.ts`).  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: exact paths with no lookup; each feature's tests in its own files.  
    - <u>Cons</u>: shared fixtures and setup are repeated.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · LOW · contracts/api.md A1 ("checked in this order"); tasks.md T017, T025, T016  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md contracts/api.md Updated: 2026-11-01 8:20 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-01: Recommendation, A1's refusal table is in the implemented order, with the state refusals first on the poll as read and again under the lock; T017 pre-checks the state; T010 asserts `NOT_OPEN` comes before validation.  

  A1's table lists `404` before the permission check while T017 checks permission first, and the state refusals (`POLL_EDITING`, `PENDING_REVIEW`, `NOT_OPEN`) run in the transaction after screening, so a CLOSED poll with a deny-listed label answers `UNACCEPTABLE_LANGUAGE` rather than `NOT_OPEN`.  

  - **Recommendation**: Reorder A1's table to the implemented order and add a state pre-check on the read poll before validation (re-checked under the lock), so the poll's state is always the first answer.  

    ➡️ [X] **Accepted**  
    - The contract matches the code, and a voter on a closed poll is told it is closed before anything else.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I4** · Inconsistency · LOW · spec.md US5 scenario 2; contracts/ui-contracts.md C5; tasks.md T042  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md contracts/ui-contracts.md Updated: 2026-11-01 8:43 PM  
  **Notes**: Recommendation accepted in file 2026-11-01: Recommendation A, drop the fallback; C5 and T042 now show no line for a choice without `addedByName`.  

  Account deletion removes `addedBy` (T041), so the `Added by a deleted account` fallback in C5/T042 can never show.  

  - **Recommendation A** _(recommended)_: Drop the fallback from C5/T042 (Simplicity First).  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: no dead branch; matches US5 scenario 2 ("no longer names its author").  
    - <u>Cons</u>: none, while account deletion clears `addedBy`.  

  - **Recommendation B**: Keep it only as `addedByName: null` → no line.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: a stray id with no user row shows nothing rather than failing.  
    - <u>Cons</u>: a branch no normal path reaches.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage · LOW · spec.md FR-019, SC-001, SC-002; tasks.md T010  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-01 8:20 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-01: Recommendation, T010 adds a case where a second voter's `POST /api/tabs/shared-with-you/refresh` returns the new choice; T046 names quickstart scenario 3 as the check of SC-001.  

  No task verifies that another viewer's card (delta refresh, Live Results) shows the added choice; T010 checks only the `poll:<pid>` projection, and SC-001's 2-second figure has no check.  

  - **Recommendation**: Add a T010 case: after an addition, a second session's tab refresh returns the new choice; treat SC-001 as verified by quickstart scenario 3.  

    ➡️ [X] **Accepted**  
    - FR-019's "other views" gets an automated check through the real refresh path.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I5** · Inconsistency · LOW · tasks.md T008 (Foundational) and T013 (US1)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-01 8:20 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-01: Recommendation, the `ownPoll` copy in `deltaClient.js` moved from T008 to T013, so Foundational no longer depends on US1.  

  T008 copies `overlay.ownPoll`, which T013 creates later in US1.  

  - **Recommendation**: Move the `ownPoll` copy into T013/T020, leaving T008 with `votersAddChoices` and `pollSharingMode`.  

    ➡️ [X] **Accepted**  
    - The Foundational phase no longer depends on a US1 task.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 setting | Yes | T001–T004, T007, T029, T030 | |
| FR-002 who may add | Yes | T013, T015, T017, T020 | creator permission — I1 |
| FR-003 states | Yes | T016 | order — I3 |
| FR-004 server-side checks | Yes | T015–T017 | |
| FR-005 button | Yes | T019, T020 | |
| FR-006 prefetch | Yes | T020 | shape — U1 |
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
| FR-019 other views | Partial | T005, T016 | C1 |
| FR-020 addedBy | Yes | T016, T039–T042 | |
| FR-021 privacy | Yes | T043 | |
| FR-022 own allowance | Yes | T012, T017, T026 | |
| FR-023 creator's save | Yes | T033–T035 | |
| FR-024 API description | Yes | T044 | |
| SC-001 time to see choice | Partial | T046 | quickstart only |
| SC-002 refresh parity | Yes | T016 | |
| SC-003 refusals | Yes | T010, T022 | |
| SC-004 ceiling | Yes | T010 | |
| SC-005 no lost votes | Yes | T031 | |
| SC-006 off by default | Yes | T001, T027 | |
| SC-007 keyboard | Yes | T011 | |

## Constitution Alignment Issues

None reported. Principle VI is honoured (tasks forbid id-citing comments); Documentation Deliverables are covered by T047; server logging (Principle V) by T017 and T025.

## Unmapped Tasks

None reported. T045–T047 are cross-cutting.

## Metrics

- Total Requirements: 31 (24 FR + 7 SC)
- Total Tasks: 47
- Coverage: 100% with ≥ 1 task (2 partial: FR-019, SC-001)
- Ambiguity Count: 0
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

- No CRITICAL issues. U1 (HIGH) should be settled before `/speckit-implement`: as written, the prefetch would blank the card's counts.
- I1 and I2 are small spec/contract alignments; U2 and the LOW items can be fixed in `tasks.md` directly.
- `/speckit-analyze-findings` (next) records these findings with their recommendations so each can be accepted.
