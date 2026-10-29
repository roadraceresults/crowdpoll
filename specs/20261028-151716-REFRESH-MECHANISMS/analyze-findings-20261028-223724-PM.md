# Specification Analysis Report — specs/20261028-151716-REFRESH-MECHANISMS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261028-151716-REFRESH-MECHANISMS |
| Report created | 2026-10-28 102526 PM |
| Analysis captured | 2026-10-28 102526 PM |
| Last updated | 2026-10-28 103311 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **C1** · Constitution · CRITICAL · tasks.md Dependencies ("US2, US5, US6, US7 are independent", "Phase 2 blocks US1 only; US2–US7 can start after Phase 1")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-28 10:28 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-28: Recommendation, Phase 9 titled "Post-implementation documentation"; US7 removed from the independent list and made to depend on US1–US6 in tasks.md.  

  The constitution requires `README.md`/`ARCHITECTURE.md` to be generated **after** implementation. tasks.md declares US7 (the documents) independent and startable after Phase 1; only a soft "write it last" contradicts that.  

  - **Recommendation**: Make US7 depend on US1–US6 explicitly, title Phase 9 "Post-implementation documentation", and remove US7 from the independent list.  

    ➡️ [X] **Accepted**  
    - Satisfies the constitution's Documentation Deliverables rule with a dependency note and a phase title; no task changes.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · HIGH · spec.md:117 (US5 scenario 3), spec.md:239 (SC-006); research.md R9; tasks.md Notes  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-28 10:33 PM  
  **Notes**: Recommendation accepted in file 2026-10-28: Recommendation A, US5 scenario 3 and SC-006 in spec.md now allow at most one refusal when k rises, and then with the time to wait.  

  Spec says an obedient browser is never refused; the plan accepts one refusal (with `retryAfterMs`) at the instant `k` rises.  

  - **Recommendation A** _(recommended)_: Reword US5 scenario 3 and SC-006 to "never refused, except at most once when k rises, and then with `retryAfterMs`".  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: matches the simplest design (one bucket); `tabs.js` already retries after `retryAfterMs`.  
    - <u>Cons</u>: a rare, visible refusal at the moment the fleet tightens.  

  - **Recommendation B**: Keep the spec; change R9 and T033 so the bucket refills at the base floor for one interval after `k` rises (a grace period), so no obedient browser is refused.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the spec's promise holds exactly.  
    - <u>Cons</u>: remembers the previous `k` and when it changed; more code and a harder test, for a one-off refusal.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · HIGH · spec.md:179 (FR-001); research.md R3; src/db/schema.ts:177  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-28 10:28 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-28: Recommendation, FR-001 lists the five relations created, invited, voted, bookmarked, linked and states that invitation delivery and acceptance timestamps are not changes in spec.md.  

  FR-001 lists relations "own, invited, voted, bookmarked, linked, accepted"; the schema has `created | invited | voted | bookmarked | linked`, and R3 deliberately does *not* signal on `accepted_at`, so T007 tests the opposite of FR-001's wording.  

  - **Recommendation**: Change FR-001 to the schema's five relations and add "invitation delivery and acceptance timestamps are not changes".  

    ➡️ [X] **Accepted**  
    - Makes the spec say what T007 checks; acceptance is not shown on the invitee's tabs.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · MEDIUM · spec.md:187 (FR-008) vs research.md R5, tasks.md T009/T010  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-28 10:33 PM  
  **Notes**: Recommendation accepted in file 2026-10-28: Recommendation A, FR-008 in spec.md now says summaries that are missing or stale (cached content version differs from the poll's).  

  FR-008 says write only *missing* summaries; the plan also rewrites *stale* ones (cached `contentVersion` ≠ row), to keep Live Results self-healing after a deploy changes `projectPoll`.  

  - **Recommendation A** _(recommended)_: Amend FR-008 to "missing or stale (cached content version differs from the poll's)".  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: keeps the self-healing; usually still no write at all.  
    - <u>Cons</u>: none of note.  

  - **Recommendation B**: Keep FR-008 as written; drop the stale rewrite from R5, T009 and T010.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the narrowest change.  
    - <u>Cons</u>: a projection left stale by a deploy is served by Live Results until the poll next changes.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I4** · Inconsistency · MEDIUM · spec.md:179–180, Key Entities ("per signed-in user") vs data-model.md, research.md R1 (keyed by email key)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md requirements.md Updated: 2026-10-28 10:28 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-28: Recommendation, spec.md gains the assumption "one account per email key" and Key Entities says "per email key"; requirements.md item 1 now reads `tabs:v:<emailKey>`, deleted after commit.  

  The spec says the list version is per user; the design keys it per email key (to catch `+tag` invitations). They are equivalent only because one email key cannot have two accounts.  

  - **Recommendation**: Add an assumption: "one account per email key; the list version is kept per email key", and say "per email key" in the Key Entities entry.  

    ➡️ [X] **Accepted**  
    - Names the dependency on the existing create-account rule (email key uniqueness) that the design relies on.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · spec.md Edge Cases ("…back-off resumes from the normal interval afterwards") vs research.md R6, tasks.md T018 ("429 and 503 keep today's waits")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md research.md contracts/ui-contracts.md tasks.md Updated: 2026-10-28 10:33 PM  
  **Notes**: Recommendation accepted in file 2026-10-28: Recommendation A, a 429 or 503 keeps today's wait and resets the back-off: FR-010 in spec.md, R6 in research.md, C2 in contracts/ui-contracts.md, T018 (checks it) and T020 in tasks.md.  

  Whether a refusal resets the Live Results back-off is unspecified; the spec implies yes, R6 and T018 are silent.  

  - **Recommendation A** _(recommended)_: Add to R6, ui-contracts C2 and T020: "a 429 or 503 also resets the back-off", and extend T018 to check it.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: matches the spec's edge case; after a refusal the server's own wait already governs.  
    - <u>Cons</u>: a quiet tab under load restarts its doubling after each refusal.  

  - **Recommendation B**: Keep the back-off through a refusal, and change the spec's edge case to say so.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: fewer requests under load.  
    - <u>Cons</u>: one more state rule to test; the spec changes.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · LOW · spec.md:192 (FR-010 "a return to the window") vs ui-contracts.md C2, research.md R6 (`visibilitychange` only)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md research.md contracts/ui-contracts.md tasks.md requirements.md Updated: 2026-10-28 10:33 PM  
  **Notes**: Recommendation accepted in file 2026-10-28: Recommendation A, visibility only: FR-010 in spec.md says "the page becoming visible"; R6, C2 and T018 state that window `focus` does not reset the back-off; requirements.md item drops "focus".  

  The requirements said "focus or visibilitychange"; the plan uses visibility only, so focusing a window that stayed visible does not reset the back-off.  

  - **Recommendation A** _(recommended)_: Accept visibility only and say so in C2 and FR-010 ("the page becoming visible").  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: a visible page keeps refreshing anyway; no extra listener.  
    - <u>Cons</u>: a user clicking back into a visible window may wait up to 10 s.  

  - **Recommendation B**: Also reset on window `focus`: add it to R6, C2 and T020, and to T018.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: matches the requirements' wording exactly.  
    - <u>Cons</u>: one more listener and test.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U3** · Underspecification · LOW · tasks.md T013 ("src/polls/sharedLink.ts or its caller in src/routes/pages.ts")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-28 10:28 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-28: Recommendation, T013 names the call site `upsertRelation(deps.db, email, pid, "linked")` in src/polls/sharedLink.ts:96.  

  Ambiguous file path.  

  - **Recommendation**: Name the actual call site: `upsertRelation(deps.db, email, pid, "linked")` in src/polls/sharedLink.ts:96.  

    ➡️ [X] **Accepted**  
    - It is the only caller of `upsertRelation`.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **O1** · Ordering · LOW · tasks.md T026 (Phase 5, US3) depends on T029 (Phase 6, US4)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-28 10:28 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-28: Recommendation, Phase 5 is now US4 (T021–T024) and Phase 6 US3 (T025–T030); the cross-phase dependency note is removed and T030 refers to T023 in tasks.md.  

  IDs run against the dependency; a note covers it but the phases are out of order.  

  - **Recommendation**: Swap Phase 5 and Phase 6 (US4 before US3) and renumber.  

    ➡️ [X] **Accepted**  
    - Task order then matches execution order; the dependency note can go.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · spec.md:234 (SC-001 "under 50 ms at the server"); tasks.md T044  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md tasks.md Updated: 2026-10-28 10:28 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-28: Recommendation, SC-001 says it is measured with the in-memory cache in tests and in production through the FR-014a counts; T044 says the same.  

  The measurement in T044 runs against `memoryCache`, not representative of Valkey round trips.  

  - **Recommendation**: State that SC-001 is measured with `memoryCache` in tests, and add the production check through the `[controller]` counts.  

    ➡️ [X] **Accepted**  
    - Makes the criterion verifiable where it is measured.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **D1** · Documentation · LOW · tasks.md T038; constitution, Documentation Deliverables (Mermaid where a diagram helps)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-28 10:28 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-28: Recommendation, T038 ports Mermaid diagrams 2.1, 2.2 and 2.6 from the requirements report into ARCHITECTURE.md.  

  T038 asks for prose only; the requirements report already has 7 diagrams of these mechanisms.  

  - **Recommendation**: Add to T038: port the relevant diagrams (2.1, 2.2, 2.6) into `ARCHITECTURE.md`.  

    ➡️ [X] **Accepted**  
    - The diagrams exist; porting them is cheap and the constitution asks for diagrams where they carry the meaning.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 | ✅ | T004, T005, T011 | wording I2 |
| FR-002 | ✅ | T007, T012–T015 | |
| FR-003 | ✅ | T008, T011 | |
| FR-003a | ✅ | T008, T012, T016 | creator and admin delete through `deletePoll` (pollsApi.ts:427) |
| FR-004 | ✅ | T006, T011 | |
| FR-005 | ✅ | T006, T011 | |
| FR-006 | ✅ | T006 | |
| FR-007 | ✅ | T008, T011 | |
| FR-008 | ✅ | T009, T010 | I3 |
| FR-009 | ✅ | T018, T020 | |
| FR-010 | ✅ | T018, T020 | U1, U2 |
| FR-011 | ✅ | T021, T023, T024 | |
| FR-012 | ✅ | T022, T025, T026 | |
| FR-013 | ✅ | T027–T030 | |
| FR-014 | ✅ | T031, T033 | I1 |
| FR-014a | ✅ | T017, T032–T034 | |
| FR-015 | ✅ | T035–T037 | |
| FR-016 | ✅ | T035, T036 | |
| FR-017 | ✅ | T035, T040 | |
| FR-018 | ✅ | T038, T039 | D1 |
| FR-019 | ✅ | T040, T024 | |
| SC-001 | ✅ | T006, T044 | A1 |
| SC-003 | ✅ | T018 | |
| SC-004 | ✅ | T021, T022 | |
| SC-005 | ✅ | T027 | |
| SC-006 | ✅ | T031 | I1 |
| SC-007 | ✅ | T035–T037 | follows from the 10 s interval |
| SC-008 | ✅ | T041 | |

(SC-002 excluded as a post-launch outcome; FR-014a provides its measurement.)

## Constitution Alignment Issues

C1 only. The plan's Constitution Check is present and evaluated; Complexity Tracking is empty and correctly so; logging rules (server `[controller]` fields, nothing new in the browser) and Principle VI (no finding-id comments) hold.

## Unmapped Tasks

None (T001, T041–T043 are baseline/polish).

## Metrics

- Total Requirements: 30 (23 FR, 7 buildable SC)
- Total Tasks: 44
- Coverage: 100 % (30/30)
- Ambiguity Count: 1 (A1)
- Duplication Count: 0
- Critical Issues Count: 1 (C1)

## Next Actions (as reported)

- **Resolve C1 before `/speckit-implement`** — a dependency note in tasks.md.
- Fix I1 and I2 in spec.md so the tests (T007, T031) do not contradict the spec they verify.
- I3, I4, U1, U2 are one-line spec/plan amendments; O1, U3, A1, D1 are optional tidy-ups to tasks.md.
- Suggested: run `/speckit-analyze-findings` to capture these as a findings file and resolve them one by one, or edit by hand.
