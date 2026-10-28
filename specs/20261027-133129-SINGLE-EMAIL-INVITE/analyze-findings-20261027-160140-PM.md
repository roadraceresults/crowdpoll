# Specification Analysis Report — specs/20261027-133129-SINGLE-EMAIL-INVITE

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261027-133129-SINGLE-EMAIL-INVITE |
| Report created | 2026-10-27 034618 PM |
| Analysis captured | 2026-10-27 034618 PM |
| Last updated | 2026-10-27 035446 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **F1** · Format / inconsistency · MEDIUM · tasks.md T012, T013, T021, T027, T031 (all in `tests/invitations-redeem.test.ts`); T014, T022, T028, T033 (all in `tests/client-invite-card.test.ts`)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-27 3:54 PM  
  **Notes**: Recommendation accepted in file 2026-10-27: Recommendation A. tasks.md: `[P]` removed from T013, T021, T022, T027, T028 and T031; the Parallel Opportunities line now reads "T012 then T013 (one file), beside T014" and the US1 example says T013 comes after T012.  

  Several of these are marked `[P]` (parallel) although they edit the same file. `[P]` means "different files, no dependency".  

  - **Recommendation A** _(recommended)_: Drop `[P]` from the tasks that share a file with an earlier one (T013, T021, T027, T031, T022, T028).  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: One-character edits; `[P]` then means what the template says; the suites stay one per contract, as planned.  
    - <u>Cons</u>: Fewer tasks can run side by side (in practice one person writes them in order anyway).  

  - **Recommendation B**: Split the redeem suite by story (e.g. `invitations-redeem-new.test.ts`, `-existing`, `-other-account`, `-old-links`), so each `[P]` task owns its own file.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: Keeps the parallel markers true; each story's tests stand alone.  
    - <u>Cons</u>: Four suites repeat the same setup (poll, invitation, server); more files in `tests/` and in plan.md's tree.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · MEDIUM · spec FR-017; research R6 step 2; data-model "Rate-limit rule"  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md tasks.md research.md data-model.md contracts/api.md Updated: 2026-10-27 3:54 PM  
  **Notes**: Developer Resolution C accepted in file 2026-10-27 (Recommendation A, and the limit setting raised). spec.md FR-017 names the shared limit (`ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW` per `ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW`) and says only a press that would sign in counts. research.md R6 reordered: Origin, token check, Terms check, rate limit, allowlist and account creation. data-model.md: the rule is consumed after the token and Terms checks. contracts/api.md A3: rows in the new order. tasks.md: T016 in the new order; T013 also asserts that a Terms or dead-token press consumes no attempt; new T038 raises the value in `.do/app.yaml` from `2`, to a value the developer has not yet chosen.  

  Continue reuses the email-sending limit, which defaults to 2 per 15 minutes per address. The limit is consumed before the Terms and token checks, so a single "forgot to tick the Terms" attempt uses half of it. Two invitees on one home network could also lock each other out. The spec only says "too many sign-in attempts".  

  - **Recommendation A** _(recommended)_: State the limit in the spec, keep `emailRateLimit`, and move the limit check after the token and Terms checks, so only real sign-in attempts count.  

    ➡️ [] **Accepted**  
    - <u>Pros</u>: No new setting; a Terms slip or a dead link never costs an attempt; the limit still caps sign-ins as for an emailed link.  
    - <u>Cons</u>: Token lookups before the limit are unthrottled (cheap, indexed, and the token is 32 random bytes, so guessing is not a risk).  

  - **Recommendation B**: State the limit in the spec and give the redeem route its own, more generous rule (e.g. 10 per 15 minutes), checked where R6 has it.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: Shared networks and retries are tolerated; the check stays first.  
    - <u>Cons</u>: A second rate-limit rule (and perhaps a setting) to document and test; still counts failed Terms attempts.  

  - **Developer Resolution C**:  

    ➡️ [x] **Accepted**  
    Recopmmendation A - the limit ENV will be bumped up.

### **C1** · Coverage gap · MEDIUM · spec FR-005; tasks T012, T013  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-27 3:49 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-27: T013 now also asserts that the console output captured over a full send and redeem never contains the token text, and cites FR-005.  

  "Never write a token to a log" has no test. T002 only checks the stored value is a hash.  

  - **Recommendation**: Add to T013: capture the console output for a full send-and-redeem and assert the token text never appears.  

    ➡️ [X] **Accepted**  
    - FR-005 becomes tested end to end: the send's `[invitations]` lines, the `[invite]` lines and the sign-in lines are all checked for the token.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage gap · MEDIUM · spec FR-022; tasks T012  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-27 3:49 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-27: T012 now follows the redirect and asserts the invitation's `accepted_at` is set (Accepted in the invitee list), and cites FR-022.  

  "Shown the poll counts as accepting" relies on the existing poll-link logic after the redirect. No task asserts that the invitee's status becomes Accepted after Continue.  

  - **Recommendation**: Add to T012: follow the redirect, then assert the invitation's `accepted_at` is set (Accepted in the invitee list).  

    ➡️ [X] **Accepted**  
    - FR-022 gets its own assertion, so a later change to the redirect cannot silently drop acceptance.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · MEDIUM · data-model "can a token sign in?" vs spec FR-003, FR-015  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-27 3:49 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-27: FR-015's list now reads "(replaced, used, expired, revoked or unknown, or its poll closed, archived or no longer Invitation Only)", matching data-model.md's rule (archived included, as the data model has it) and T002.  

  The data model also stops a token when the poll is archived, or is no longer Private / Invitation Only. The spec's list in FR-015 doesn't include those cases. Only the closed poll appears, in an edge case.  

  - **Recommendation**: Add "the poll closed or is no longer Invitation Only" to FR-015's list, so spec and data model agree. T002 already tests it.  

    ➡️ [X] **Accepted**  
    - One phrase in FR-015; spec, data model and T002 then list the same cases.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · LOW · plan R5; tasks T010, T016  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md contracts/api.md Updated: 2026-10-27 3:49 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-27: research R6 now mints before marking the token used (step 7: on failure log `[invite] Sign-in could not be completed for <masked>`, `500` with the generic error body, token left unused; step 8 the conditional `useToken`, whose losing double press drops the minted token unused; step 9 `completeSignIn`). T010: `mintLoginToken` throws when the plugin fails or no token is under the id. T016: the same order and failure handling. contracts/api.md A3: a `500` row.  

  No task covers `mintLoginToken` failing (the plugin errors, or no token is found under the key). The constitution says errors must fail safely with a log line.  

  - **Recommendation**: Add to T010/T016: on failure, log `[invite] … sign-in could not be completed`, answer `500` with the generic error body, and don't mark the token used.  

    ➡️ [X] **Accepted**  
    - The invitee can press Continue again; the failure is visible in the server log. Needs `mintLoginToken` to run before `useToken` (or `useToken` in the same transaction), noted in R6.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · LOW · tasks T025; plan source tree  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md plan.md Updated: 2026-10-27 3:49 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-27: T025 and plan.md's source tree now name `tests/client-landing.test.ts`, the existing suite that already lands with `?open=` through `applyLanding`.  

  The landing test's file is undecided ("existing suite or new `client-landing-maximize.test.ts`").  

  - **Recommendation**: Name one file. The suite that already loads `tabs.js` with a landing is the smallest change.  

    ➡️ [X] **Accepted**  
    - T025 and plan.md's tree name the same file; the implementer does not have to choose.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · LOW · contracts/api.md A1 vs termsGate  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ research.md Updated: 2026-10-27 3:54 PM  
  **Notes**: Recommendation accepted in file 2026-10-27: Recommendation A. research.md R4 now records that `/invite` is a terms-gate page route like every other page, so a browser signed in as another account without the current Terms goes through `/accept-terms?next=` before the card.  

  Adding `/invite` to `PAGE_ROUTES` sends a signed-in *other* account without the current Terms to `/accept-terms` before the card. The spec doesn't mention this.  

  - **Recommendation A** _(recommended)_: Accept it (consistent with every other page) and record the choice in research R4.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: One gate rule for every page; the rare case (signed in elsewhere, behind on the Terms) is handled as today.  
    - <u>Cons</u>: That user accepts the Terms for the other account before seeing the card.  

  - **Recommendation B**: Leave `/invite` out of `PAGE_ROUTES` and record the choice in research R4.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: The card always shows first.  
    - <u>Cons</u>: An exception to the gate's page rule; the straight-to-poll case still meets the gate on `/?PID=`.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001–FR-002 | Yes | T002, T006, T008 | |
| FR-003 | Yes | T002, T006 | |
| FR-004 | Yes | T002, T031 | |
| FR-005 | Partial | T002, T006 | logs untested (C1) |
| FR-006–FR-007 | Yes | T003, T007, T008 | |
| FR-008 | Yes | T012, T031 | |
| FR-009–FR-011 | Yes | T012, T014, T019 | |
| FR-012 | Yes | T021, T023 | |
| FR-013 | Yes | T027–T030 | |
| FR-014 | Yes | T033 | |
| FR-015–FR-016 | Yes | T017, T031 | |
| FR-017 | Yes | T013, T016 | limit undecided (A1) |
| FR-018 | Yes | T012, T016 | |
| FR-019 | Yes | T013 | |
| FR-020 | Yes | T021 | |
| FR-021 | Yes | T025, T026 | |
| FR-022 | Partial | (existing code) | not asserted (C2) |
| FR-023 | Yes | T031, T037 | |
| FR-024 | Yes | T003, T037 | full suite |
| SC-001–SC-003 | Yes | T012, T014, T021 | |
| SC-004 | Yes | T025 | |
| SC-005–SC-006 | Yes | T031 | |

## Constitution Alignment Issues

None. Logging (principle V) is covered by T016. Self-documenting code (principle VI) is stated in the tasks' path conventions. The README and ARCHITECTURE updates are T036.

## Unmapped Tasks

None. T001 and T037 are run steps.

## Metrics

- Total requirements: 30 (24 functional requirements, 6 success criteria)
- Total tasks: 37
- Coverage: 100% have at least one task; FR-005 and FR-022 only partially
- Ambiguities: 1
- Duplications: 0
- Critical issues: 0

## Next Actions (as reported)

There are no critical issues, so you can go ahead with `/speckit-implement`. Two improvements are worth making first:
- **A1:** decide the rate limit's position and size. It changes what users see when they forget the Terms box.
- **C1 and C2:** two assertions that close the only gaps in test coverage.

The rest (F1, I1, U1, U2, I2) are small edits to `tasks.md`, `spec.md` and `research.md`.
