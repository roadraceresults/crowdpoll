# Specification Analysis Report — specs/20261110-160141-INVITATION-CUSTOM-MESSAGE

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261110-160141-INVITATION-CUSTOM-MESSAGE |
| Report created | 2026-11-10 045014 PM |
| Analysis captured | 2026-11-10 045014 PM |
| Last updated | 2026-11-10 045713 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · HIGH · spec.md FR-015, US4-AC4; tasks.md T032; research.md R2  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md tasks.md Updated: 2026-11-10 4:57 PM  
  **Notes**: Recommendation accepted in file 2026-11-10: Recommendation A; spec.md FR-015 and US4-AC4 now cover a write that changes only the message (a wizard save refreshes voters as today); tasks.md T032 asserts it at the store level.  

  FR-015 says changing only the message must not refresh voters' copies. But the wizard sends every field on each save, so `updatePoll`'s `isContentChange` (`store.ts:759`) bumps `content_version` anyway. `applyPendingUpdate` also always bumps (`store.ts:836`), and a save of a poll with no votes sends it back to `AWAITING APPROVAL`. T032's test therefore cannot pass through the wizard.  

  - **Recommendation A** _(recommended)_: Narrow FR-015 and T032 to "a write that changes only `invitationMessage` (any other field unchanged and not sent) leaves `content_version` alone", tested at the store level.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: keeps the `NON_CONTENT_FIELDS` entry meaningful and testable; matches how the store already decides bumps.  
    - <u>Cons</u>: a creator editing the message in the wizard still causes one voter-side refresh, as any wizard save does today.  

  - **Recommendation B**: Drop FR-015, US4-AC4 and the `content_version` assertion of T032; leave `invitationMessage` out of `NON_CONTENT_FIELDS`.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: one requirement and one code line fewer; an extra refresh is harmless.  
    - <u>Cons</u>: a field invisible to voters would bump their version, against the convention CLAUDE.md states for such fields.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · MEDIUM · CLAUDE.md "Cross-feature invariants"; contracts/ui-contracts.md C1; tasks.md T017–T019  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-10 4:57 PM  
  **Notes**: Recommendation accepted in file 2026-11-10: Recommendation; tasks.md gains T042 (Phase 7) to extend the CLAUDE.md innerHTML invariant to `invitationMessageHtml`.  

  The invariant allows only `notesPreviewHtml` and `notesHtml` (plus the editor's DOM copy) to be assigned to `innerHTML`. The new field's preview assigns `invitationMessageHtml`, which breaks the invariant as written.  

  - **Recommendation**: Add a task that extends the invariant to name `invitationMessageHtml`, which also comes from `renderNotesHtml`. Put it in CLAUDE.md beside T040.  

    ➡️ [X] **Accepted**  
    - The invariant's intent (HTML only from `src/polls/notes.ts`) is kept; only its list of names grows.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **T1** · Terminology · MEDIUM · spec FR-002/FR-011; contracts/api.md A1; research R3/R4; tasks T006, T024, T027  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md tasks.md Updated: 2026-11-10 4:57 PM  
  **Notes**: Recommendation accepted in file 2026-11-10: Recommendation; spec.md FR-004 and FR-012 name it "custom email message"; tasks.md T006, T011, T024 and T027 use "Custom email message" in the length error and the screening verdict.  

  Creators see three names for one thing: "Custom Email Message" (the field), "Custom Invitation Email Message" (the summary) and "Invitation message" (the length error and the screening rejection). A rejection that says "invitation message" doesn't point at the field's label.  

  - **Recommendation**: Use "custom email message" in the server error (`"Custom email message must be at most 1000 characters."`) and in the screening verdict. Keep `invitationMessage` as the code name.  

    ➡️ [X] **Accepted**  
    - Creator-facing text then matches the field's label; the summary line keeps the wording the requirements fixed.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · spec Edge Cases ("Hidden message changed"); research R4; tasks T027–T028  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-10 4:57 PM  
  **Notes**: Recommendation accepted in file 2026-11-10: Recommendation A; spec.md Edge Cases gains "Rejection naming a hidden message".  

  Under AM2 B, a message kept on a poll switched to link or public is still screened. A rejection that names it points at text the creator can't see until they switch back to "Only people you invite".  

  - **Recommendation A** _(recommended)_: State in the spec's Edge Cases that such a rejection can name a hidden message, and that the creator switches back to edit it.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: no new code path; every stored message stays reviewed, so a switch back can never mail unreviewed text.  
    - <u>Cons</u>: a rare, slightly puzzling rejection for a creator who forgot the hidden message.  

  - **Recommendation B**: Screen the message only while the poll is Invitation Only, and re-screen it on the switch back.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: rejections only ever name visible text.  
    - <u>Cons</u>: an ever-voted poll's sharing switch applies at once (not pending), so it would need a new review path for the message on that switch.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage · MEDIUM · spec SC-006; tasks.md  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-10 4:57 PM  
  **Notes**: Recommendation accepted in file 2026-11-10: Recommendation; tasks.md T041 adds the real-client check (Gmail web, Gmail and Apple Mail on a phone, Outlook) for SC-006.  

  No task checks how the box renders in real email clients (web and phone, 600 px and phone width). The quickstart's manual steps only look at the dev mailer.  

  - **Recommendation**: Add a manual check to the quickstart and T041: send one invitation to Gmail on the web, Gmail and Apple Mail on a phone, and Outlook. Check the box, the wrapping and the absence of horizontal scrolling.  

    ➡️ [X] **Accepted**  
    - SC-006 can only be verified in real clients; this needs no new code.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage · LOW · spec Edge Cases ("Social sign-in mode"); tasks T010  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-10 4:57 PM  
  **Notes**: Recommendation accepted in file 2026-11-10: Recommendation; tasks.md T010 adds the native-sign-in-off invitation case.  

  No test covers an invitation sent when native sign-in is off (`config.nativeSignin=false`), where the button links to the poll instead of a sign-in link.  

  - **Recommendation**: Add that case to T010.  

    ➡️ [X] **Accepted**  
    - One more assertion in an existing test file.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C3** · Coverage · LOW · spec Edge Cases ("Unbalanced formatting marks", "Very long word")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-10 4:57 PM  
  **Notes**: Recommendation accepted in file 2026-11-10: Recommendation; tasks.md T010 adds the lone `**` and `overflow-wrap:anywhere` assertions.  

  No task tests these for the message, though the notes parser and `overflow-wrap` already handle them.  

  - **Recommendation**: Add one assertion each to T010: a lone `**` arrives as literal text, and the box keeps `overflow-wrap:anywhere`.  

    ➡️ [X] **Accepted**  
    - Pins two edge cases the spec lists, at no cost.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · LOW · tasks T022; contracts C2  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md tasks.md Updated: 2026-11-10 4:57 PM  
  **Notes**: Recommendation accepted in file 2026-11-10: Recommendation; tasks.md T022 uses `plainPart`/`tappablePart` with an onActivate that focuses the field; spec.md US2-AC2 says "once Step 1 has been answered".  

  `summaryPart`'s activation is always `goToStep(step)`; T022 needs it to focus a field afterwards without saying how. The part is also tappable only once Step 1 has been answered, which the spec's US2-AC2 doesn't say.  

  - **Recommendation**: In T022, use `tappablePart` directly with an `onActivate` that calls `goToStep(1)` and then focuses the button, and keep `summaryPart`'s answered-step rule. Add "once Step 1 has been answered" to US2-AC2.  

    ➡️ [X] **Accepted**  
    - Leaves `summaryPart` untouched for every other line; the spec then states the rule the wizard already applies.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · spec US3-AC5 vs. a poll with no votes  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-10 4:57 PM  
  **Notes**: Recommendation accepted in file 2026-11-10: Recommendation; spec.md Assumptions gains the whole-poll re-screening of polls with no votes.  

  Editing only the message on an open poll that has no votes sends the whole poll back for screening, and while it is re-screened the invitees can't open it. This is today's behaviour for any such edit, but the spec doesn't mention it.  

  - **Recommendation**: Add an Assumption saying edits to a published poll with no votes are re-screened whole, as today.  

    ➡️ [X] **Accepted**  
    - Documents existing behaviour; no code changes.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

Unchanged. 19 of 20 requirement keys have tasks: FR-015 is partial (I1) and SC-006 has none (C1).

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 – FR-014, FR-016 – FR-018 | Yes | T001–T040 (as before) | |
| FR-015 no voter refresh | Partial | T004, T032 | I1 |
| SC-005 privacy | Yes | T032 | |
| SC-006 email clients | No | none | C1 |

## Constitution Alignment Issues

None reported.

## Unmapped Tasks

None reported.

## Metrics

- Total Requirements: 20
- Total Tasks: 41
- Coverage: 95%
- Ambiguity Count: 1
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

No new findings. Say **"Next"** to apply the nine recommendations you ticked. Then run `/speckit-analyze` again to confirm they are gone, and go on to `/speckit-implement`.
