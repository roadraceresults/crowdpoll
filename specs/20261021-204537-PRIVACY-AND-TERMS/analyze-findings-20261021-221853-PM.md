# Specification Analysis Report — specs/20261021-204537-PRIVACY-AND-TERMS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261021-204537-PRIVACY-AND-TERMS |
| Report created | 2026-10-21 100859 PM |
| Analysis captured | 2026-10-21 100859 PM |
| Last updated | 2026-10-21 101646 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **U1** · Underspecification · HIGH · research.md R9; data-model.md Retention; tasks.md T037, T042; src/polls/store.ts `pollsEverVoted`/`hasVoteHistory`  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md data-model.md Updated: 2026-10-21 10:16 PM  
  **Notes**: Recommendation accepted in file 2026-10-21: Recommendation A, an `ever_voted` flag on `polls`: data-model.md adds the column (backfilled by migration 009, set by every `vote_history` insert); research.md R9 says "ever voted" reads the flag; tasks.md T005 adds it to the migration, new T053 changes the writers and the two queries, T037 tests that a poll whose history was dropped stays frozen, and US4 dependencies put T053 before T042.  

  Dropping `vote_history` partitions older than 12 months changes behaviour, not just retention. `hasVoteHistory` (`service.ts:166`) and `pollsEverVoted` (`pollsApi.ts:623`) decide from that table whether a poll "has ever had a vote", which freezes its fields. An old poll whose history has been dropped would count as never voted on.  

  - **Recommendation A** _(recommended)_: Before dropping history, make "ever voted" independent of it: an `ever_voted` boolean on `polls`, set on the first recorded vote and backfilled by migration `009` from `vote_history`; `hasVoteHistory` and `pollsEverVoted` read the flag; the retention sweep then drops partitions older than 12 months.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: keeps the 12-month retention promised in the policy; the flag is also a cheaper read than an index probe.  
    - <u>Cons</u>: one more column, a backfill, a change to `recordVote` and to two queries, and their tests.  

  - **Recommendation B**: keep vote history for the life of the poll (deleted with the poll or anonymized with the account), drop the partition rule from R9 and the sweep, and change the retention row in spec FR-020, data-model.md and the policy draft to "as long as the poll exists".  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no schema or query change; the history stays an audit trail as long as the poll.  
    - <u>Cons</u>: history grows without limit; the requirements' decision (UA3, 12 months) changes.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · HIGH · spec Edge Cases (mid-vote deletion); research.md R8; tasks.md T029, T031  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md Updated: 2026-10-21 10:11 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, the consumer skips queued votes from deleted accounts: new task T050 (`src/votes/consumer.ts`), T029 adds the queued-vote test, research.md R8 gains a "Queued votes" paragraph.  

  Votes go through a queue (`votes/consumer.ts`, a Valkey stream). A vote accepted just before deletion can be written by the consumer **after** the deletion commits, with the deleted address. R8 does not mention the queue, yet the spec's edge case says this must never happen.  

  - **Recommendation**: In `deleteAccount`, refuse new votes for the address first (the sessions are already gone). After the commit, have the consumer drop or anonymize queued entries for that address, or anonymize again after the queue has drained. Add a test that queues a vote, deletes the account, then drains.  

    ➡️ [X] **Accepted**  
    Concretely: the consumer, before inserting a batch, skips entries whose address has no `user` row (a deleted account), logging the count; this needs no extra state and covers votes queued before and during the deletion.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · HIGH · spec.md FR-009; research.md R7; contracts/api.md A4  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-21 10:16 PM  
  **Notes**: Recommendation accepted in file 2026-10-21: Recommendation A, FR-009 reworded: the provider buttons stay unavailable until the box is ticked; the provider may create the account, but it can do nothing until it accepts (FR-008); US2 scenario 5 matches.  

  FR-009 says that in OAuth mode "a new account MUST NOT be created without it". R7 lets the provider callback create the account, and the gate blocks it until it accepts.  

  - **Recommendation A** _(recommended)_: Reword FR-009: "in OAuth mode the account may be created by the provider, but it can do nothing until it accepts the current Terms (the gate)".  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: matches the plan; the gate already guarantees no unaccepted account acts; OAuth is not yet enabled.  
    - <u>Cons</u>: an account row (address, name) exists briefly for a person who then declines.  

  - **Recommendation B**: Require a server-side check at the provider start route: refuse to start the provider flow without `terms=<TERMS_VERSION>`, and record the agreement in `user.create.before` in OAuth mode.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: FR-009 holds as written.  
    - <u>Cons</u>: the start route is BetterAuth's own; wrapping it is new code for a mode that is not switched on.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · HIGH · contracts/api.md A4; research.md R5; tasks.md T019, T023  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md contracts/api.md Updated: 2026-10-21 10:11 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, the sign-in and link routes pass the gate: contracts/api.md A4 and research.md R5 list create-account, request-login-link, verify, confirm-signin, link-info and email-change/verify as allowed; T019 tests them with an old session cookie; T023 refers to the A4 list.  

  The gate refuses every `/api/*` route except four. A browser still holding an older session cookie that opens a new sign-in link (`GET /api/auth/verify`), or `/api/auth/confirm-signin`, `/api/auth/link-info` or `/api/me/email-change/verify`, gets a JSON `403` instead of being signed in or redirected.  

  - **Recommendation**: Let the link endpoints through the gate as well: `/api/auth/verify`, `/api/auth/confirm-signin`, `/api/auth/link-info`, `/api/me/email-change/verify`, plus `create-account` and `request-login-link`. Each creates a new session or needs none, and the gate applies on the next request. Add them to T019.  

    ➡️ [X] **Accepted**  
    The verify redirect then lands on a page route, where the gate sends a not-yet-accepted account to `/accept-terms`.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage · MEDIUM · spec.md FR-022; tasks.md T036, T040  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-21 10:11 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, T036 now captures the console across sign-up, sign-in, email change, voting and deletion and fails on any full address or IP, fixing any line it finds.  

  FR-022 also forbids full email addresses in log lines, but no task checks existing lines; only the two IP lines are covered.  

  - **Recommendation**: Add to T036 a test that captures logs across sign-up, sign-in, email change, voting and deletion and fails on any full address or full IP; fix any line it finds.  

    ➡️ [X] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U3** · Underspecification · MEDIUM · contracts/ui-contracts.md; data-model.md "Anonymized vote"  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md contracts/ui-contracts.md Updated: 2026-10-21 10:11 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, new UI contract C9 (`@deleted.invalid` shown as "Deleted user"; exports carry no address), new task T051 (`pollCard.js`, `adminCard.js`), and T030 tests it.  

  The placeholder `deleted-<uuid>@deleted.invalid` will show wherever addresses are shown to poll owners and admins (Participants, Banned Voter List editors, exports). No contract says it should display as "Deleted user".  

  - **Recommendation**: Add a UI rule: any address ending `@deleted.invalid` displays as "Deleted user" in `pollCard.js` and `adminCard.js`. Add a client test, and check that exports carry no address.  

    ➡️ [X] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · MEDIUM · spec.md SC-003, FR-016; research.md R8 "Known limit"  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md research.md contracts/privacy-policy.md Updated: 2026-10-21 10:16 PM  
  **Notes**: Recommendation accepted in file 2026-10-21: Recommendation A, SC-003 now says "current address" and that rows under an earlier address are removed on request to privacy@; research.md R8 "Known limit" and the policy draft §8 say the same.  

  SC-003 says that after deletion "no record holds their address except the bans", but R8 accepts that rows written under an earlier address (before an email change) stay.  

  - **Recommendation A** _(recommended)_: State the limit in SC-003 and in the policy draft: deletion covers rows under the account's current address; rows written under an address the account had before an email change are removed on request to `privacy@`.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: honest, no new code; the case is rare (email change is native-only and used little).  
    - <u>Cons</u>: a manual step for those rows.  

  - **Recommendation B**: In `deleteAccount` also search the addresses in `email_change_requests` and notices.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: SC-003 holds as written.  
    - <u>Cons</u>: `email_change_requests` rows are deleted once a change completes, so past addresses are not actually recorded anywhere; this would need a new record of past addresses.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I4** · Inconsistency · MEDIUM · tasks.md T016, T025, T039  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-21 10:11 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, T025 gives `accept-terms.html` the same head as `privacy.html` and adds it to `tests/m3-assets.test.ts`.  

  `accept-terms.html` is new, but neither T016 (the footer layer and the `m3-assets` page entries: only privacy and terms) nor T025 says it carries `footer-m3.css` and `/fonts.css` or joins the asset test.  

  - **Recommendation**: In T025, give `accept-terms.html` the same head as `privacy.html`, and add it to `tests/m3-assets.test.ts`.  

    ➡️ [X] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I5** · Inconsistency · LOW · tasks.md Dependencies vs T023  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-21 10:11 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, the Dependencies note now says the accepted-account helper is added as part of T023, as the test-session note does.  

  The accepted-account test helper is "added with T019" in one place and "as part of T023" in another.  

  - **Recommendation**: Pick T023 (the gate is what breaks the old tests) and write it only there.  

    ➡️ [X] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **G1** · Coverage · LOW · quickstart.md §5; spec FR-005, FR-020  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-21 10:11 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, new task T052 (manual, operator): quickstart §5 before `ENV_ALLOWED_EMAILS` is removed.  

  The pre-launch operator steps (placeholders, `[TO CONFIRM]` facts, the lawyer's review) are not a task.  

  - **Recommendation**: Add T050 (manual): quickstart §5, before `ENV_ALLOWED_EMAILS` is removed.  

    ➡️ [X] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · spec.md SC-003  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-21 10:16 PM  
  **Notes**: Recommendation accepted in file 2026-10-21: Recommendation A, T049 times quickstart §3 step 6 against SC-003 (under one minute).  

  "Under one minute" is not measured by any test.  

  - **Recommendation A** _(recommended)_: Leave it as a manual check in T049.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: keeps a user-facing target in the spec; quickstart §3 step 6 already walks it.  
    - <u>Cons</u>: not automated.  

  - **Recommendation B**: Drop the time from SC-003.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: every success criterion is then checked automatically.  
    - <u>Cons</u>: loses the usability target.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **A2** · Ambiguity · LOW · plan.md Scale/Scope  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ plan.md Updated: 2026-10-21 10:11 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-21: Recommendation, plan.md Scale/Scope now says 5 new routes and names them.  

  "3 new routes", while contracts A1–A8 add five (`/privacy`, `/terms`, `/accept-terms`, `POST /api/legal/accept-terms`, `DELETE /api/me`).  

  - **Recommendation**: Correct the count.  

    ➡️ [X] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 pages | Yes | T008, T011, T012, T014 | |
| FR-002 version | Yes | T002, T008 | |
| FR-003 policy content | Yes | T008, T011 | |
| FR-004 terms content | Yes | T012 | |
| FR-005 placeholders | Partial | T011, T012 | review step not a task (G1) |
| FR-006 agreement required | Yes | T018, T022, T026 | |
| FR-007 recorded | Yes | T005, T007, T018 | |
| FR-008 gate | Yes | T019, T020, T023–T025, T028 | link routes (I2) |
| FR-009 OAuth | Yes | T021, T027 | wording conflict (I1) |
| FR-010 login line | Yes | T021, T027 | |
| FR-011 footer | Yes | T009, T013, T015, T016 | accept page (I4) |
| FR-012 banner link | Yes | T009, T015 | |
| FR-013 email footer | Yes | T010, T017 | |
| FR-014 Your Data | Yes | T030, T034, T043, T044 | |
| FR-015 dialog | Yes | T030, T034 | |
| FR-016 deletion scope | Yes | T029, T031 | queued votes (U2), display (U3) |
| FR-017 sessions ended, email | Yes | T029, T032, T033 | |
| FR-018 all or nothing | Yes | T029 | |
| FR-019 deletion log | Yes | T029, T033 | |
| FR-020 retention | Yes | T037, T042 | history partition side effect (U1) |
| FR-021 no session IP | Yes | T003, T005, T036, T041 | |
| FR-022 masked logs | Partial | T036, T040 | email lines (C1) |
| FR-023 no third party | Yes | T001, T035, T039 | |
| FR-024 Cookie Use check | Yes | T038 | |
| FR-025 privacy@ | Yes | T049 | manual |
| SC-001 – SC-007 | Yes | T008–T009, T018–T020, T029, T035, T037–T038 | SC-003 time manual (A1) |

## Constitution Alignment Issues

None. The documentation phase is T047, the Constitution Check is in plan.md, and nothing adds complexity without justification.

## Unmapped Tasks

None. T045–T049 are cross-cutting (contract, docs, suite, manual checks).

## Metrics

- Total requirements: 32 (25 FR, 7 SC)
- Total tasks: 49
- Coverage: 100% have at least one task (2 partial: FR-005, FR-022)
- Ambiguity count: 2
- Duplication count: 0
- Critical issues: 0 (4 HIGH)

## Next Actions (as reported)

- No CRITICAL issues, but resolve the four HIGH findings before `/speckit-implement`:
  - **U1** and **U2** are real defects the design would ship: older polls would lose their "has had votes" freeze, and a queued vote could keep a deleted address;
  - **I2** would turn a sign-in link into a JSON error for anyone with an old cookie;
  - **I1** is a wording fix.
- The MEDIUM and LOW findings can be fixed in the same pass.
- Suggested: run `/speckit-analyze-findings` to capture this report and resolve it finding by finding (the fixes touch `spec.md`, `research.md`, `data-model.md`, `contracts/` and `tasks.md`).
