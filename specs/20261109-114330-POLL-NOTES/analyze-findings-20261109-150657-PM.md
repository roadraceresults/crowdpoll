# Specification Analysis Report — specs/20261109-114330-POLL-NOTES

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261109-114330-POLL-NOTES |
| Report created | 2026-11-09 025338 PM |
| Analysis captured | 2026-11-09 025338 PM |
| Last updated | 2026-11-09 030400 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · MEDIUM · spec.md FR-021, SC-007; contracts/api.md A3; tasks.md T013  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md plan.md tasks.md Updated: 2026-11-09 3:04 PM  
  **Notes**: Recommendation accepted in file 2026-11-09: Recommendation A, FR-021 now includes the admin list and gives the full notes to one poll's admin details; plan.md "Decisions Easy to Get Wrong" says list rows carry the preview only; tasks.md T008, T013, T015 and T026 changed to match.  

  Admin list rows (`adminListRow`) are planned to carry the full `notes` and `notesHtml`, while FR-021 and SC-007 say lists of cards carry only the two-line preview.  

  - **Recommendation A** _(recommended)_: Give admin list rows the projection's `notesPreviewHtml` and `hasMoreNotes`, and only the admin detail `notes` and `notesHtml` (which the editor needs).  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: every list keeps to FR-021 and SC-007; the read-only face uses the same preview as the poll card.  
    - <u>Cons</u>: opening step 2 must have the admin detail's full `notes` before the editor can open; T013, T021 and T026 change.  

  - **Recommendation B**: State in FR-021 that the creator's own admin list is exempt, and keep the full notes in admin list rows.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no change to the plan's payloads; the editor has the notes at once.  
    - <u>Cons</u>: a creator with many long notes downloads them all on every admin list load; a second rule for lists.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · MEDIUM · spec.md FR-016; research.md R14; tasks.md T015  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md plan.md Updated: 2026-11-09 3:04 PM  
  **Notes**: Recommendation accepted in file 2026-11-09: Recommendation A, FR-016 now covers saved notes, and says unsaved notes are previewed from the editor's own content; plan.md records the decision.  

  After Done, the step 2 preview is rebuilt in the browser from `runsOf`, while FR-016 says notes become formatted text "on the server by one shared rule".  

  - **Recommendation A** _(recommended)_: Reword FR-016 to say that unsaved notes in the editor are previewed from the editor's own content, and saved notes are rendered by the server's one rule.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: matches the plan; no server call to preview unsaved text; the preview is built with `textContent` and four elements, so it stays safe.  
    - <u>Cons</u>: two code paths produce the formatted look (server HTML, editor DOM), held together by the round-trip test.  

  - **Recommendation B**: Keep FR-016 as written, and have Done keep the editor's sanitised DOM as the preview.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no spec change.  
    - <u>Cons</u>: the sanitised DOM is still a browser rendering, so FR-016's wording stays inexact; the editor's DOM may hold browser markup until it is sanitised.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · spec.md FR-018; research.md R2, R13  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ plan.md tasks.md Updated: 2026-11-09 3:04 PM  
  **Notes**: Recommendation accepted in file 2026-11-09: Recommendation, the preview ends in "…" when cut; plan.md's preview bullet, tasks.md T006 (a test case) and T007 changed.  

  The preview adds no "…", relying on CSS; when the 300-character cut fits in two lines (a wide card, short words), `hasMore` is true but no ellipsis shows, breaking "end in an ellipsis when cut".  

  - **Recommendation**: Append "…" in `renderNotesPreview` when `hasMore` (a CSS clamp hides it anyway when it clamps); add the case to T006.  

    ➡️ [X] **Accepted**  
    - The ellipsis then shows whenever the preview stops early, whatever the card's width.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · MEDIUM · research.md R13; contracts/ui-contracts.md C1; tasks.md T023  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ plan.md tasks.md Updated: 2026-11-09 3:04 PM  
  **Notes**: Recommendation accepted in file 2026-11-09: Recommendation, "Show more ⌄" is measured again with a `ResizeObserver`; plan.md records it; tasks.md T020 (a hidden-card case) and T023 changed.  

  "Show more ⌄" depends on `scrollHeight > clientHeight` measured once after the text is set; a card rendered while hidden (an inactive tab) measures 0 and never shows the button for notes that only overflow by width.  

  - **Recommendation**: Re-measure when the card becomes visible or resizes (a `ResizeObserver` on `.poll-notes-text`); add the case to T020.  

    ➡️ [X] **Accepted**  
    - The button then follows the clamp in every tab and at every width.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U3** · Underspecification · MEDIUM · spec.md FR-014, FR-027; research.md R14; tasks.md T015, T026  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ plan.md tasks.md Updated: 2026-11-09 3:04 PM  
  **Notes**: Recommendation accepted in file 2026-11-09: Recommendation, `canChange("notes")` answers as for `subtitle`; plan.md records it; tasks.md T015 and T021 changed.  

  "Notes may change" is not defined: `adminCard.js` `canChange(field)` (line 494) lists title and subtitle as always changeable; FR-027/contract C4 depend on it, and no task adds `notes` to it.  

  - **Recommendation**: In T015 add `notes` to `canChange` beside subtitle; in T021 test that the read-only preview follows it.  

    ➡️ [X] **Accepted**  
    - Notes then change exactly where the subtitle does (FR-014), by the card's one existing rule.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U4** · Underspecification · LOW · contracts/ui-contracts.md C3; tasks.md T014  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ plan.md tasks.md Updated: 2026-11-09 3:04 PM  
  **Notes**: Recommendation accepted in file 2026-11-09: Recommendation, the editor's Escape calls `stopPropagation()`; plan.md records it; tasks.md T010 (a test) and T014 changed.  

  Escape in the editor is Cancel, but the Admin Poll Card or page may already handle Escape (dialogs, card cancel); the plan and tasks do not say the editor stops propagation.  

  - **Recommendation**: In T014 the editor's Escape handler calls `stopPropagation()`; add a test in T010 that the card's own Escape handling is not triggered.  

    ➡️ [X] **Accepted**  
    - One Escape then cancels only the editor, never the card behind it.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage · LOW · spec.md SC-004, FR-015  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-11-09 3:04 PM  
  **Notes**: Recommendation accepted in file 2026-11-09: Recommendation A, accepted as covered by "no new dependency" and the existing asset tests; nothing needed to change.  

  No automated check that the editor adds no third-party request or dependency; only T049's manual check covers it.  

  - **Recommendation A** _(recommended)_: Accept as covered by "no new dependency" and the existing asset tests.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: no new test; `package.json` and the page's asset list already show any dependency or script added.  
    - <u>Cons</u>: an absolute URL inside `notesEditor.js` would be caught only by review or the manual check.  

  - **Recommendation B**: In T016, assert that `notesEditor.js` contains no `import` and no absolute URL.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: SC-004 gets an automated check for the new script.  
    - <u>Cons</u>: a text check on one file; it does not cover other scripts.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · spec.md SC-001  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-09 3:04 PM  
  **Notes**: Recommendation accepted in file 2026-11-09: Recommendation A, tasks.md T049 now times quickstart Q1 and records SC-001.  

  "Under one minute" is only manually verifiable, and T049 does not name it.  

  - **Recommendation A** _(recommended)_: Name SC-001 in T049's quickstart Q1 timing.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: the criterion is checked and recorded once, by hand.  
    - <u>Cons</u>: one more item in the manual run.  

  - **Recommendation B**: Leave SC-001 as a usability goal.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: nothing changes.  
    - <u>Cons</u>: a success criterion no step verifies.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 notes field | Yes | T002–T004 | |
| FR-002 6000 limit | Yes | T008, T009, T012 | UTF-16, per R3 |
| FR-003 three marks only | Yes | T006, T007, T010, T014 | |
| FR-004 stored format | Yes | T006, T007, T014 | |
| FR-005 step 2 preview | Yes | T011, T015, T017 | |
| FR-006 editor layout | Yes | T010, T014, T017 | |
| FR-007 editor height | Yes | T014, T017 | |
| FR-008 shortcuts and state | Yes | T010, T014 | |
| FR-009 plain paste | Yes | T010, T014 | |
| FR-010 Done/Next/steps | Yes | T011, T015 | |
| FR-011 Cancel/Escape | Yes | T010, T014 | U4 |
| FR-012 counter | Yes | T010, T014, T015 | |
| FR-013 focus and labels | Yes | T010, T014 | |
| FR-014 editable like subtitle | Yes | T041, T043, T015 | U3 |
| FR-015 no third party | Partial | T014, T049 | C1 |
| FR-016 one server rule | Yes | T006, T007 | I2 |
| FR-017 who sees | Yes | T019, T020 | |
| FR-018 card preview | Yes | T020, T023, T025 | U1, U2 |
| FR-019 card height | Yes | T025 | |
| FR-020 Maximized view | Yes | T029–T033 | |
| FR-021 lists vs one card | Yes | T019, T028, T030 | I1 |
| FR-022 screening | Yes | T035, T038 | |
| FR-023 search | Yes | T002, T036, T039 | |
| FR-024 public page | Yes | T037, T040 | |
| FR-025 duplicate | Yes | T042, T044 | |
| FR-026 exports | Yes | T042, T044 | |
| FR-027 read-only face | Yes | T021, T026 | U3 |
| SC-001 under a minute | Manual | T049 | A1 |
| SC-002 dangerous inputs | Yes | T006 | |
| SC-003 round trip | Yes | T006, T014 | |
| SC-004 no third party | Manual | T049 | C1 |
| SC-005 one click to full notes | Yes | T020, T029 | |
| SC-006 found by notes | Yes | T036 | |
| SC-007 lists stay small | Yes | T028 | I1 |

## Constitution Alignment Issues

None — comments are limited to external-documentation links (Principle VI), no dependency is added (II), and tests precede code (IV).

## Unmapped Tasks

None — T001 (setup) and T046–T049 (polish/docs) are cross-cutting by design.

## Metrics

- Total Requirements: 34 (27 FR + 7 SC)
- Total Tasks: 49
- Coverage: 100% have ≥1 task (SC-001 and SC-004 by manual check only)
- Ambiguity Count: 1
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

No CRITICAL or HIGH findings: implementation may proceed. The four MEDIUM findings (I1, I2, U1, U2, U3) are cheap to settle now and would otherwise change tests written in US1/US2; `/speckit-analyze-findings` captures them next.
