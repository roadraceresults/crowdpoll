# Specification Analysis Report — specs/20261026-085056-POLL-INVITATIONS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261026-085056-POLL-INVITATIONS |
| Report created | 2026-10-26 035737 PM |
| Analysis captured | 2026-10-26 035737 PM |
| Last updated | 2026-10-26 044736 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **U1** · Underspecification · HIGH · tasks.md T009, T038; research.md R14; `src/polls/store.ts:273`  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md data-model.md Updated: 2026-10-26 4:40 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-26: T009 now adds `timeZone` to `NON_CONTENT_FIELDS` in `src/polls/store.ts`; R14 and data-model name it.  

  `updatePoll` bumps `content_version` for any field not in `NON_CONTENT_FIELDS`; no task adds `timeZone` there, so a save that only sets the zone would bump the content version (cards refetch) and T034's "no content version change" would fail.  

  - **Recommendation**: In T009, add `timeZone` to `NON_CONTENT_FIELDS` in `src/polls/store.ts`; name it in R14 and data-model ("bumps no content version").  

    ➡️ [X] **Accepted**  
    - The zone is invisible to voters, exactly what `NON_CONTENT_FIELDS` is for; one line in the task that already touches `store.ts`.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · MEDIUM · contracts/api.md A2 (`daily-limit` reason "…until 4:02 PM"); tasks.md T019, T020, T044  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ contracts/api.md contracts/ui-contracts.md tasks.md Updated: 2026-10-26 4:47 PM  
  **Notes**: Recommendation accepted in file 2026-10-26: Recommendation A: A2's `daily-limit` reason is now "Your daily invitation limit is reached." (no time) beside `retryAt`; C3 has the card write the time from `retryAt` in the browser's time zone, for an add and a resend; T023 builds that line and T017 tests it.  

  The refusal's `reason` holds a clock time built on the server, in an unstated time zone; the server's own (UTC in production) would show the creator the wrong time.  

  - **Recommendation A** _(recommended)_: The card writes the time from `retryAt` in the browser's time; the server sends `retryAt` and a reason without a time ("Your daily invitation limit is reached."); update A2, C3 and T023.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: always the creator's current local time, wherever they are; the server never formats a time for a screen.  
    - <u>Cons</u>: the card builds that one line itself instead of showing `reason` as it is.  

  - **Recommendation B**: The server writes the time in the poll's stored `time_zone` (UTC when none), named like the email's dates (`4:02 PM EDT`).  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the card shows every `reason` as it is; reuses `formatPollDate`'s zone handling.  
    - <u>Cons</u>: a poll with no stored zone shows UTC until the card's first write stores one (the add itself carries `timeZone`, so mostly harmless).  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · LOW · spec.md FR-015, FR-016, Edge Cases; research.md R6  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-26 4:40 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-26: added the edge case "Addresses added while the poll is being edited are emailed when it reopens; those already emailed are not emailed again."  

  An address added while a launched poll is in EDITING waits and is sent by the sweep when it returns to OPEN (never sent); the spec says only that nothing is resent after an edit.  

  - **Recommendation**: Add an edge case: "Addresses added while the poll is being edited are emailed when it reopens; those already emailed are not emailed again."  

    ➡️ [X] **Accepted**  
    - States in the spec what the sweep already does, so the test (T015) has a requirement to point at.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · LOW · contracts/email-messages.md M1 Closing 2; research.md R12; ui-contracts C7  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ requirements.md contracts/email-messages.md spec.md research.md contracts/ui-contracts.md devScripts/render-invitation-email.ts invitation-email.html Updated: 2026-10-26 4:47 PM  
  **Notes**: Recommendation accepted in file 2026-10-26: Recommendation B: the email's personal-data sentence links to `<origin>/privacy#invitations` in requirements.md (the GDPR bullet and UA15 Closing 2), M1, FR-022, R12 and C7; the render script was changed and `invitation-email.html` re-rendered (16 links, all to `#invitations`).  

  The plan adds `privacy.html#invitations` for invitees, but the approved email links `<origin>/privacy`, so it does not land on that section.  

  - **Recommendation A** _(recommended)_: Keep the approved wording (SC-007 compares the email word for word with the draft); the section stays reachable from the policy's own page.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no change to the approved requirements or draft.  
    - <u>Cons</u>: the invitee lands at the top of the policy, not on the invitation section.  

  - **Recommendation B**: Change the email's link to `<origin>/privacy#invitations` in `requirements.md` (UA15 Closing 2), M1 and FR-022, and re-render the draft.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the invitee goes straight to the paragraph about them.  
    - <u>Cons</u>: changes approved wording; the draft must be re-rendered.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · LOW · spec.md Clarifications and US4 scenario 5 ("The poll is not open"); contracts/api.md, data-model, tasks T012, T040 ("The poll is not open.")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-26 4:40 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-26: the Clarification, US4 scenario 5 and FR-029 now write "The poll is not open." with the full stop, as the contracts and tasks do.  

  The spec writes the reason without a full stop; the contracts and tasks end it with one.  

  - **Recommendation**: Use the contracts' form with the full stop, as every other A1 reason does, and change the spec to match.  

    ➡️ [X] **Accepted**  
    - One wording for tests to assert.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **D1** · Duplication · LOW · spec.md FR-007, FR-039  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-26 4:47 PM  
  **Notes**: Recommendation accepted in file 2026-10-26: Recommendation A: FR-007 now reads "The panel MUST look and behave as the approved stand-alone card (FR-039)."; its number is kept.  

  Both say the production panel follows the stand-alone card.  

  - **Recommendation A** _(recommended)_: Make FR-007 point to FR-039 ("The panel MUST look and behave as the approved stand-alone card, FR-039"), keeping its number so task references stay valid.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the panel's requirements stay together; no renumbering.  
    - <u>Cons</u>: still two lines about one rule.  

  - **Recommendation B**: Delete FR-007, leaving a gap in the numbering.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: one statement of the rule.  
    - <u>Cons</u>: a gap in the FR numbers; T051's and the coverage table's references move to FR-039.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage / ordering · LOW · tasks.md T028 (US2), T035 (US3), T041 (US4); Dependencies  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-26 4:40 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-26: Dependencies note that T017, T028, T035 and T041 edit `tests/client-admin-invitees.test.ts` one story at a time.  

  Three tasks in stories marked parallel (US2 ‖ US3) edit the same file, `tests/client-admin-invitees.test.ts`.  

  - **Recommendation**: Note in Dependencies that additions to this test file are made one story at a time.  

    ➡️ [X] **Accepted**  
    - Avoids two agents editing one file at once.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U3** · Underspecification · LOW · tasks.md T008, T013  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-26 4:40 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-26: T008 records its snapshots before T013 starts; Dependencies order T008 → T013.  

  T008's snapshots of every existing email must come from the code before T013 changes `layout()`, but both are listed as parallel after T009.  

  - **Recommendation**: Say in T008 that the snapshots are recorded before T013 starts, and order T008 → T013 in Dependencies.  

    ➡️ [X] **Accepted**  
    - Otherwise the snapshot could record the changed output and prove nothing.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001–FR-006 (panel, rows, chips, paging, counts, refresh) | Yes | T012, T017, T023, T028, T030, T031, T032 | |
| FR-007 (panel follows the card) | Yes | T023, T051 | Overlaps FR-039 (D1) |
| FR-008–FR-012 (add, validate, mailbox key, voter limit, allowlist) | Yes | T014, T019, T022 | |
| FR-013, FR-014 (editable states; no pause) | Yes | T014, T022 | |
| FR-015, FR-016 (when sent) | Yes | T015, T020, T021, T022 | U2 |
| FR-017–FR-023 (email wording, dates, zone, reminder) | Yes | T008, T013, T016, T018, T025, T042 | |
| FR-024 (time zone from the card) | Yes | T034, T035, T038, T039 | U1 |
| FR-025, FR-026 (daily limit, not delivered) | Yes | T014, T015, T019, T020, T021 | A1 |
| FR-027–FR-030 (remove, confirm, resend, ban) | Yes | T040–T045 | |
| FR-031–FR-034 (invitee: mailbox, accepted, vote, sign-in) | Yes | T027, T029, T033, T036, T037 | |
| FR-035–FR-037 (privacy, deletion, Terms) | Yes | T046, T047 | |
| FR-038–FR-040 (stand-alone drafts) | Yes | T001–T004, T025, T051 | |
| SC-001, SC-003, SC-005 | Yes | T052, with tests T014, T028 | Manual timing in T052 |
| SC-002, SC-004, SC-006 | Yes | T015, T033, T014 | |
| SC-007, SC-008 | Yes | T016, T025, T052 | |
| SC-009 | Yes | T001–T004, T051 | |

## Constitution Alignment Issues

None. The documentation phase is present (T049); no comments in changed code and masked logging are required in the
tasks; the Constitution Check was done in the plan with no exceptions.

## Unmapped Tasks

None. T048–T050 and T052 are cross-cutting: documentation, the full test suite and the end-to-end walk.

## Metrics

- Total requirements: 40 functional requirements and 9 success criteria
- Total tasks: 52, of which 4 are already done
- Coverage: 100% of requirements have at least one task
- Ambiguities: 1
- Duplications: 1
- Critical issues: 0

## Next Actions (as reported)

There are no critical issues, so `/speckit-implement` could start now. Fix U1 first: its own test (T034) would catch it,
but only after the code is written. A1 is worth deciding now too, since it changes what A2 returns. The LOW findings
are wording and ordering fixes, and can wait.
- U1, U3, C1: edit `tasks.md`; U1 also needs one line each in `research.md` R14 and `data-model.md`.
- A1: edit `contracts/api.md` A2, `contracts/ui-contracts.md` C3 and tasks T019, T023 and T044.
- U2, I2, D1: edit `spec.md`.
- I1: decide whether to keep the approved link or change it through the requirements.
