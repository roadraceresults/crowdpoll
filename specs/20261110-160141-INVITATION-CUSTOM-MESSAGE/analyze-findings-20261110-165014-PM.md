# Specification Analysis Report — specs/20261110-160141-INVITATION-CUSTOM-MESSAGE

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261110-160141-INVITATION-CUSTOM-MESSAGE |
| Report created | 2026-11-10 041945 PM |
| Analysis captured | 2026-11-10 041945 PM |
| Last updated | 2026-11-10 041945 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · HIGH · spec.md FR-015, US4-AC4; tasks.md T032; research.md R2  

  FR-015 says changing only the message must not refresh voters' copies. But the wizard sends every field on each save, so `updatePoll`'s `isContentChange` (`store.ts:759`) bumps `content_version` anyway. `applyPendingUpdate` also always bumps (`store.ts:836`), and a save of a poll with no votes sends it back to `AWAITING APPROVAL`. T032's test therefore cannot pass through the wizard.  

  - **Recommendation A** _(recommended)_: Narrow FR-015 and T032 to "a write that changes only `invitationMessage` (any other field unchanged and not sent) leaves `content_version` alone", tested at the store level.  

    ➡️ [x] **Accepted** <span style="font-size:smaller ;padding-left:50px"><i>(you may mark <b>[X] Accepted</b> here, or Type/Say "<b>Accept</b>" in the CC CLI terminal)</i></span>  
    - <u>Pros</u>: keeps the `NON_CONTENT_FIELDS` entry meaningful and testable; matches how the store already decides bumps.  
    - <u>Cons</u>: a creator editing the message in the wizard still causes one voter-side refresh, as any wizard save does today.  

  - **Recommendation B**: Drop FR-015, US4-AC4 and the `content_version` assertion of T032; leave `invitationMessage` out of `NON_CONTENT_FIELDS`.  

    ➡️ [ ] **Accepted** <span style="font-size:smaller ;padding-left:50px"><i>(you may mark <b>[X] Accepted</b> here, or Type/Say "<b>Accept</b>" in the CC CLI terminal)</i></span>  
    - <u>Pros</u>: one requirement and one code line fewer; an extra refresh is harmless.  
    - <u>Cons</u>: a field invisible to voters would bump their version, against the convention CLAUDE.md states for such fields.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  
    - you may enter your own resolution here and check the box above when done  
    - then Type or Say "Next" in the CC CLI terminal to have it applied  

### **I2** · Inconsistency · MEDIUM · CLAUDE.md "Cross-feature invariants"; contracts/ui-contracts.md C1; tasks.md T017–T019  

  The invariant allows only `notesPreviewHtml` and `notesHtml` (plus the editor's DOM copy) to be assigned to `innerHTML`. The new field's preview assigns `invitationMessageHtml`, which breaks the invariant as written.  

  - **Recommendation**: Add a task that extends the invariant to name `invitationMessageHtml`, which also comes from `renderNotesHtml`. Put it in CLAUDE.md beside T040.  

    ➡️ [x] **Accepted** <span style="font-size:smaller ;padding-left:50px"><i>(you may mark <b>[X] Accepted</b> here, or Type/Say "<b>Accept</b>" in the CC CLI terminal)</i></span>  
    - The invariant's intent (HTML only from `src/polls/notes.ts`) is kept; only its list of names grows.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  
    - you may enter your own resolution here and check the box above when done  
    - then Type or Say "Next" in the CC CLI terminal to have it applied  

### **T1** · Terminology · MEDIUM · spec FR-002/FR-011; contracts/api.md A1; research R3/R4; tasks T006, T024, T027  

  Creators see three names for one thing: "Custom Email Message" (the field), "Custom Invitation Email Message" (the summary) and "Invitation message" (the length error and the screening rejection). A rejection that says "invitation message" doesn't point at the field's label.  

  - **Recommendation**: Use "custom email message" in the server error (`"Custom email message must be at most 1000 characters."`) and in the screening verdict. Keep `invitationMessage` as the code name.  

    ➡️ [x] **Accepted** <span style="font-size:smaller ;padding-left:50px"><i>(you may mark <b>[X] Accepted</b> here, or Type/Say "<b>Accept</b>" in the CC CLI terminal)</i></span>  
    - Creator-facing text then matches the field's label; the summary line keeps the wording the requirements fixed.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  
    - you may enter your own resolution here and check the box above when done  
    - then Type or Say "Next" in the CC CLI terminal to have it applied  

### **U1** · Underspecification · MEDIUM · spec Edge Cases ("Hidden message changed"); research R4; tasks T027–T028  

  Under AM2 B, a message kept on a poll switched to link or public is still screened. A rejection that names it points at text the creator can't see until they switch back to "Only people you invite".  

  - **Recommendation A** _(recommended)_: State in the spec's Edge Cases that such a rejection can name a hidden message, and that the creator switches back to edit it.  

    ➡️ [x] **Accepted** <span style="font-size:smaller ;padding-left:50px"><i>(you may mark <b>[X] Accepted</b> here, or Type/Say "<b>Accept</b>" in the CC CLI terminal)</i></span>  
    - <u>Pros</u>: no new code path; every stored message stays reviewed, so a switch back can never mail unreviewed text.  
    - <u>Cons</u>: a rare, slightly puzzling rejection for a creator who forgot the hidden message.  

  - **Recommendation B**: Screen the message only while the poll is Invitation Only, and re-screen it on the switch back.  

    ➡️ [ ] **Accepted** <span style="font-size:smaller ;padding-left:50px"><i>(you may mark <b>[X] Accepted</b> here, or Type/Say "<b>Accept</b>" in the CC CLI terminal)</i></span>  
    - <u>Pros</u>: rejections only ever name visible text.  
    - <u>Cons</u>: an ever-voted poll's sharing switch applies at once (not pending), so it would need a new review path for the message on that switch.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  
    - you may enter your own resolution here and check the box above when done  
    - then Type or Say "Next" in the CC CLI terminal to have it applied  

### **C1** · Coverage · MEDIUM · spec SC-006; tasks.md  

  No task checks how the box renders in real email clients (web and phone, 600 px and phone width). The quickstart's manual steps only look at the dev mailer.  

  - **Recommendation**: Add a manual check to the quickstart and T041: send one invitation to Gmail on the web, Gmail and Apple Mail on a phone, and Outlook. Check the box, the wrapping and the absence of horizontal scrolling.  

    ➡️ [x] **Accepted** <span style="font-size:smaller ;padding-left:50px"><i>(you may mark <b>[X] Accepted</b> here, or Type/Say "<b>Accept</b>" in the CC CLI terminal)</i></span>  
    - SC-006 can only be verified in real clients; this needs no new code.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  
    - you may enter your own resolution here and check the box above when done  
    - then Type or Say "Next" in the CC CLI terminal to have it applied  

### **C2** · Coverage · LOW · spec Edge Cases ("Social sign-in mode"); tasks T010  

  No test covers an invitation sent when native sign-in is off (`config.nativeSignin=false`), where the button links to the poll instead of a sign-in link.  

  - **Recommendation**: Add that case to T010.  

    ➡️ [x] **Accepted** <span style="font-size:smaller ;padding-left:50px"><i>(you may mark <b>[X] Accepted</b> here, or Type/Say "<b>Accept</b>" in the CC CLI terminal)</i></span>  
    - One more assertion in an existing test file.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  
    - you may enter your own resolution here and check the box above when done  
    - then Type or Say "Next" in the CC CLI terminal to have it applied  

### **C3** · Coverage · LOW · spec Edge Cases ("Unbalanced formatting marks", "Very long word")  

  No task tests these for the message, though the notes parser and `overflow-wrap` already handle them.  

  - **Recommendation**: Add one assertion each to T010: a lone `**` arrives as literal text, and the box keeps `overflow-wrap:anywhere`.  

    ➡️ [x] **Accepted** <span style="font-size:smaller ;padding-left:50px"><i>(you may mark <b>[X] Accepted</b> here, or Type/Say "<b>Accept</b>" in the CC CLI terminal)</i></span>  
    - Pins two edge cases the spec lists, at no cost.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  
    - you may enter your own resolution here and check the box above when done  
    - then Type or Say "Next" in the CC CLI terminal to have it applied  

### **U2** · Underspecification · LOW · tasks T022; contracts C2  

  `summaryPart`'s activation is always `goToStep(step)`; T022 needs it to focus a field afterwards without saying how. The part is also tappable only once Step 1 has been answered, which the spec's US2-AC2 doesn't say.  

  - **Recommendation**: In T022, use `tappablePart` directly with an `onActivate` that calls `goToStep(1)` and then focuses the button, and keep `summaryPart`'s answered-step rule. Add "once Step 1 has been answered" to US2-AC2.  

    ➡️ [x] **Accepted** <span style="font-size:smaller ;padding-left:50px"><i>(you may mark <b>[X] Accepted</b> here, or Type/Say "<b>Accept</b>" in the CC CLI terminal)</i></span>  
    - Leaves `summaryPart` untouched for every other line; the spec then states the rule the wizard already applies.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  
    - you may enter your own resolution here and check the box above when done  
    - then Type or Say "Next" in the CC CLI terminal to have it applied  

### **A1** · Ambiguity · LOW · spec US3-AC5 vs. a poll with no votes  

  Editing only the message on an open poll that has no votes sends the whole poll back for screening, and while it is re-screened the invitees can't open it. This is today's behaviour for any such edit, but the spec doesn't mention it.  

  - **Recommendation**: Add an Assumption saying edits to a published poll with no votes are re-screened whole, as today.  

    ➡️ [x] **Accepted** <span style="font-size:smaller ;padding-left:50px"><i>(you may mark <b>[X] Accepted</b> here, or Type/Say "<b>Accept</b>" in the CC CLI terminal)</i></span>  
    - Documents existing behaviour; no code changes.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  
    - you may enter your own resolution here and check the box above when done  
    - then Type or Say "Next" in the CC CLI terminal to have it applied  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 field only for invite | Yes | T013, T019 | |
| FR-002 placement and label | Yes | T013, T019 | |
| FR-003 Notes editor behaviour | Yes | T012, T016–T019 | |
| FR-004 limit 1000 | Yes | T006, T011, T012 | |
| FR-005 blank stored empty | Yes | T006, T011 | |
| FR-006 box and text part | Yes | T009, T010, T014, T015 | |
| FR-007 unchanged email without a message | Yes | T009, T010 | |
| FR-008 safe rendering | Yes | T010, T015 | |
| FR-009 sent mail not revisited | Yes | T010 | |
| FR-010 kept across a switch | Yes | T018, T026 | |
| FR-011 summary line | Yes | T021, T022 | U2 |
| FR-012 screening | Yes | T024, T027, T028 | T1, U1 |
| FR-013 pending update | Yes | T025, T029, T030 | |
| FR-014 admin-only | Yes | T007, T032, T035 | I2 |
| FR-015 no voter refresh | Partial | T004, T032 | I1 |
| FR-016 Duplicate | Yes | T033, T034 | |
| FR-017 existing polls empty | Yes | T001, T037 | |
| FR-018 documentation | Yes | T036, T038, T039 | |
| SC-005 privacy | Yes | T032 | |
| SC-006 email clients | No | none | C1 |

## Constitution Alignment Issues

None reported. The documentation phase is present (T038, T039), each task has a test, and no comment or logging rule is broken.

## Unmapped Tasks

None reported. T008, T020, T023, T031, T035 and T041 are verification runs for their phases.

## Metrics

- Total Requirements: 18 FR + 2 buildable SC = 20
- Total Tasks: 41
- Coverage: 95% (19 of 20 have at least one task; FR-015's is partial)
- Ambiguity Count: 1
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

There are no CRITICAL findings, but resolve I1 (HIGH) before `/speckit-implement`, because T032 as written would fail. The MEDIUM findings are quick edits to spec.md, tasks.md and CLAUDE.md; `/speckit-analyze-findings` handles them next.
