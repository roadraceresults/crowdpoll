# Clarification Session Report — specs/20261019-153514-PRODUCTION-EMAIL

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261019-153514-PRODUCTION-EMAIL |
| Spec | specs/20261019-153514-PRODUCTION-EMAIL/spec.md |
| Report created | 2026-10-20 034246 PM |
| Session captured | 2026-10-20 034246 PM |
| Last updated | 2026-10-20 035221 PM |

The questions below were answered during `/speckit-clarify` and are already in `spec.md`.
The findings are the coverage categories it left Deferred or Outstanding.
A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
"Next" always returns the first open finding below.

## Questions Asked

### **Q1** · Functional Scope & Behavior  

  Scope: are the single-user integrity rules part of this feature?  
  The requirements' Scope (NC1) says this feature implements "the single-user integrity rules, including address normalization and disposable-domain blocking"; the later Decision (RS5) says single-user integrity "will be put off until after OAuth-only sign-in is implemented". The spec followed RS5.  

  **Recommended:** Option A - RS5 is the developer's later, explicit decision, and normalization and blocklists mostly matter in the native magic-link phase that OAuth-only sign-in replaces; building them now adds work and stricter rules (refused addresses, NC3) that the planned phase makes moot.  

  | Option | Description |
  |--------|-------------|
  | A | Deferred: no normalization or disposable-domain blocking in this feature (as the spec says now) |
  | B | Address normalization only (plus-tags, Gmail dots) for new sign-ups and email changes |
  | C | Disposable-domain blocking only, from a maintained list |
  | D | Both normalization and disposable-domain blocking, new sign-ups and email changes only (NC3) |
  | Short | Provide a different short answer (<=5 words) |

  **Answer:** "b" → Option B, address normalization only (plus-tags, Gmail dots), for new sign-ups and email changes; disposable-domain blocking stays deferred.  
  **Recorded in spec.md:** `- Q: Are the single-user integrity rules part of this feature? → A: Address normalization only (plus-tags, Gmail dots), for new sign-ups and email changes; disposable-domain blocking stays deferred (RS5)`  
  **Sections changed:** Clarifications; Functional Requirements (new group "One mailbox, one account", FR-024–FR-028); Edge Cases (two examples); Success Criteria (SC-008); Assumptions (single-user integrity).  

### **Q2** · Interaction & UX Flow  

  What happens when a sign-in link is opened in a browser other than the one that asked for it?  
  FR-017 said a confirmation page appears, but not what the person must do there.  

  **Recommended:** Option A - one click on a page naming the account stops silent sign-in, link pre-fetching by mail scanners and unnoticed login pushing, while keeping sign-in from another device easy, which is the point of a fallback.  

  | Option | Description |
  |--------|-------------|
  | A | One-click confirm on a page naming the account (and when the link was requested) |
  | B | Confirm by typing a short code shown in the browser that requested the link |
  | C | No fallback: refuse, and ask the person to request a new link on this device |
  | Short | Provide a different short answer (<=5 words) |

  **Answer:** "a" → Option A, one-click confirm on a page naming the account and when the link was requested.  
  **Recorded in spec.md:** `- Q: What happens when a sign-in link is opened in a browser other than the one that asked for it? → A: One-click confirm on a page naming the account and when the link was requested`  
  **Sections changed:** Clarifications; Functional Requirements (FR-017); User Story 4 (scenario 2).  

### **Q3** · Non-Functional Quality Attributes (Observability)  

  What does the log record about each sent message, so the operator can trace a "my link never arrived" report?  
  FR-005 said each send logs the message id and type, never the link, but not whether the recipient appears.  

  **Recommended:** Option A - the operator already knows the address from the person's report, so a masked recipient plus the time is enough to find the line and its message id, without putting every user's address into the logs.  

  | Option | Description |
  |--------|-------------|
  | A | Message id, type and a masked recipient (e.g. `j•••@gmail.com`) |
  | B | Message id, type and the full recipient address |
  | C | Message id and type only (as the spec says now) |
  | Short | Provide a different short answer (<=5 words) |

  **Answer:** "a" → Option A, message id, type and a masked recipient.  
  **Recorded in spec.md:** `- Q: What does the log record about each sent message? → A: Message id, type and a masked recipient (e.g. `j•••@gmail.com`)`  
  **Sections changed:** Clarifications; Functional Requirements (FR-005); User Story 5 (scenario 3).  

### **Q4** · Non-Functional Quality Attributes (Reliability)  

  How long may one send to the email service take before the person is told the email could not be sent?  
  The Edge Cases said a slow service is answered "within the existing bound", but `src/email/mailer.ts` sets no timeout.  

  **Recommended:** Option A - 10 seconds matches the bound the app already uses for its other outside call (`ENV_API_CALL_TIMEOUT`, 10,000 ms); a healthy send takes well under a second, and the person still gets an answer quickly enough to try again.  

  | Option | Description |
  |--------|-------------|
  | A | 10 seconds, as a configurable setting with that default |
  | B | 5 seconds, as a configurable setting with that default |
  | C | 30 seconds, fixed |
  | Short | Provide a different short answer (<=5 words) |

  **Answer:** "a" → Option A, 10 seconds, a configurable setting with that default.  
  **Recorded in spec.md:** `- Q: How long may one send take before the person is told the email could not be sent? → A: 10 seconds, a configurable setting with that default`  
  **Sections changed:** Clarifications; Functional Requirements (FR-004); Edge Cases (slow or unreachable service).  

## Findings

### **D1** · Constraints & Tradeoffs · Deferred · spec.md Assumptions ("The production signal"), FR-007, FR-022  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-10-20 3:52 PM  
  **Notes**: Recommendation accepted in file 2026-10-20: Recommendation A, leave it for `/speckit-plan`, as the spec's Assumptions already say;  
  no file changed: the Assumptions bullet "The production signal" already hands the signal and the variable names to `/speckit-plan`.  

  `/speckit-clarify` deferred this category: the production signal that makes missing credentials fatal, and the new variable names, are left by the spec to `/speckit-plan`.  
  FR-007 requires a production deployment to refuse to start without email credentials, but the spec does not say how the app knows it is in production.  

  - **Recommendation A** _(recommended)_: Leave it for `/speckit-plan`, as the spec's Assumptions already say.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: the signal and the variable names are configuration details, which the spec should not fix;  
      the plan can check how `config.ts` already treats the authentication secret and follow it.  
    - <u>Cons</u>: the acceptance test for FR-007 cannot name its setting until the plan exists.  

  - **Recommendation B**: Answer it now: `- Q: How does the app know it is running in production? → A: An explicit deployment setting, never inferred`.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: FR-007 becomes testable without guessing, and a development machine can never be taken for production by accident.  
    - <u>Cons</u>: one more setting in the deployment specification, which the plan still has to name.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **O1** · Misc / Placeholders · Outstanding · spec.md FR-009, FR-010  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-20 3:52 PM  
  **Notes**: Recommendation accepted in file 2026-10-20: Recommendation A, record a default in Assumptions;  
  spec.md: a new Assumptions bullet, "The new wording and the branded layout", says they are drafted during planning from the current texts and the site's logo and colours, and approved by the developer before implementation.  

  `/speckit-clarify` left this category outstanding as low impact: the reviewed wording of the four messages and the look of the branded layout are not drafted.  
  FR-009 and FR-010 say what the layout and the wording must keep, but not who drafts the new text or when it is approved.  

  - **Recommendation A** _(recommended)_: Record a default in Assumptions: the new wording and layout are drafted during planning, from the current texts and the site's existing logo and colours, and approved by the developer before implementation.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: the work has an owner and a checkpoint, and the drafts reuse the brand the site already has.  
    - <u>Cons</u>: approval adds one review step before the templates are built.  

  - **Recommendation B**: Leave it for `/speckit-plan`, with no spec change.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no spec change now.  
    - <u>Cons</u>: nothing says the drafts must be approved before they ship.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Category | Status |
|---|---|
| Functional Scope & Behavior | Resolved (Q1: normalization in scope, blocking deferred) |
| Domain & Data Model | Clear |
| Interaction & UX Flow | Resolved (Q2: one-click confirm page) |
| Non-Functional: Performance / Reliability | Resolved (Q4: 10-second send bound) |
| Non-Functional: Observability | Resolved (Q3: masked recipient in the log) |
| Non-Functional: Security & Privacy | Clear |
| Integration & External Dependencies | Clear |
| Edge Cases & Failure Handling | Clear |
| Constraints & Tradeoffs | Deferred: the production signal that makes missing credentials fatal, and the new variable names, which the spec already leaves to `/speckit-plan` |
| Terminology & Consistency | Clear |
| Completion Signals | Clear |
| Misc / Placeholders | Outstanding: the reviewed wording of the four messages and the branded layout's look are not drafted (low impact; can be drafted in planning) |

## Spec Quality Checklist

Spec Quality Checklist: 16/16 → 16/16 items passing, with no changes and no regressions.
Its Notes still describe single-user integrity as fully deferred; this skill only toggles checkbox markers, so I left that line as it is.

## Next Actions (as reported)

**Recommendation:** proceed to `/speckit-plan`. The Deferred item is a planning decision by design, and the Outstanding item is low impact.

**Suggested next command:** `/speckit-clarify-findings`, to capture this session into `clarify-report.md`, with D1 and O1 from the two rows above. Or go straight to `/speckit-plan`.
