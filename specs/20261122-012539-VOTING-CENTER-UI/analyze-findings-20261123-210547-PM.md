# Specification Analysis Report — specs/20261122-012539-VOTING-CENTER-UI

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261122-012539-VOTING-CENTER-UI |
| Report created | 2026-11-23 044651 PM |
| Analysis captured | 2026-11-23 044651 PM |
| Last updated | 2026-11-23 084546 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **C1** · Constitution · CRITICAL · tasks.md T009, T010, T026; pollCard.js:1733–1747, 1800–1801  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-23 7:30 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-23: Recommendation. tasks.md T009 now brings the comments in the front and back `.actions` regions into line with Principle VI (FR/FIX references removed, old-order comments corrected, code-describing comments deleted); T010 rewrites the two sizer comments so they are true; T026 does the same for the regions it changes.  

  The template regions that T009, T010 and T026 change carry comments that cite requirement IDs ("008 FR-007", "012 FR-042", "012 FR-057"). The sizer comment also becomes false: it says the spans carry "every label the back button may show". The constitution's scope clause requires existing comments to be brought into line with Principle VI in any region being changed. T009 only asks to *update* comments that state the old order.  

  - **Recommendation**: Make T009, T010 and T026 bring the comments in the changed regions into line: remove the FR/FIX references, and delete any comment that only describes what the code does.  

    ➡️ [X] **Accepted**  
    - The constitution's Governance scope clause makes this mandatory for the regions being changed. Comments outside them stay as they are (Principle III).  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · HIGH · research.md R11; tasks.md T010, T011; spec FR-005  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ research.md tasks.md Updated: 2026-11-23 8:45 PM  
  **Notes**: Recommendation accepted in file 2026-11-23: Recommendation A. research.md R11 records that the visible label is taken out of the width calculation (`.btn-vote-label{width:0; min-width:100%}` in `site.css`; `.top-submit-btn` joins the grid rules), so only the sizers set the width and `fitLabel` shrinks the label; tasks.md T012 adds that `site.css` rule and T011 notes that it relies on it.  

  Today's width is not actually kept. `.btn-vote` stacks its label and sizers in one grid cell with `white-space:nowrap`, so the visible label also sets the width. "Voting Center" (and "Cast these votes") would widen the button past the sizers. `fitLabel` would then never see an overflow, so FR-005 and V5 fail. The front and back buttons could also end up different widths.  

  - **Recommendation A** _(recommended)_: Take the visible label out of intrinsic sizing (e.g. `.btn-vote-label{min-width:0; width:0; min-width:100%}` in a `minmax(0,1fr)` column, or `contain:inline-size`), so only the sizers set the width and `fitLabel` shrinks the label. Record this in R11 and T011.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: Meets FR-005 exactly: both buttons keep today's width and match each other.  
    - <u>Cons</u>: Long labels show smaller text (down to 9px) or wrap onto two lines.  

  - **Recommendation B**: Let the sizers carry the new labels ("Voting Center", "Cast these votes", "Remove vote"), so both buttons grow to the longest label. Change FR-005 and US1 scenario 7 to "the buttons share one width, wide enough for every label", and drop `fitLabel`.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: Simpler code (no measuring), and labels always at full size.  
    - <u>Cons</u>: Reverses the requirements decision IN5 (today's width); the buttons grow by up to a third and crowd the action row on narrow cards.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · MEDIUM · pollCard.js:1246–1249 (`render`); spec FR-025; tasks.md T016, T017  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md research.md tasks.md data-model.md contracts/ui.md Updated: 2026-11-23 8:45 PM  
  **Notes**: Recommendation accepted in file 2026-11-23: Recommendation A. spec.md: new edge case (a compact Voting Center whose row is in use is not turned back until the row is left or emptied); research.md R4, tasks.md T017 (skip the forced turn-back in `render()` while the voting row has focus or text) and T014 (a test); data-model.md `ballotOpensMaximized()` rule; contracts/ui.md V15.  

  `render()` turns a compact card back to its front when `ballotOpensMaximized()` becomes true. With T017, another voter's added choice can trigger that while this voter is typing in the compact Voting Center's row. The row then disappears from view, against FR-025. No task covers this.  

  - **Recommendation A** _(recommended)_: Add to T017: while the voting row's input has focus or text, skip the forced turn-back, so it happens at the next render after the row is left or emptied. Add a test in T014.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: A small guard in one place; the voter keeps typing undisturbed, as FR-025 requires.  
    - <u>Cons</u>: For that moment the compact ballot holds one more bar than fits, so its bars are drawn at the floor height (and may scroll) until the row is left.  

  - **Recommendation B**: When the forced turn-back would happen while the row is in use, open the maximized ballot instead, carrying the typed text, caret and focus into it.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: The ballot always fits.  
    - <u>Cons</u>: A view change the voter did not ask for; more code (moving text and focus between rows); and it contradicts FR-025's rule that maximizing drops the text.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · spec FR-007, FR-011; data-model states  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md tasks.md data-model.md contracts/ui.md requirements.md Updated: 2026-11-23 8:45 PM  
  **Notes**: Recommendation accepted in file 2026-11-23: Recommendation A. spec.md: new edge case and FR-011 (an addition that fills the poll moves focus to the face's primary button if shown and enabled, else Maximize/Minimize); tasks.md T015 (focus move) and T014 (a test); data-model.md state diagram; contracts/ui.md V10; requirements.md UA1 line ("keeps focus" qualified).  

  When the voter's own addition brings the poll to the maximum, FR-007 hides the row but FR-011 says it "keeps focus". Neither says where focus goes, so it falls to `<body>`.  

  - **Recommendation A** _(recommended)_: Add an edge case and a task: when the addition fills the poll, focus moves to the face's primary button (Cast on the Voting Center, Voting Center on the results face, or the card's Maximize button when neither is shown), and FR-011's "keeps focus" holds otherwise.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: These buttons are always focusable and are the natural next step (cast, or open the ballot).  
    - <u>Cons</u>: The voter has to find the new choice themselves.  

  - **Recommendation B**: Move focus to the new choice: its vote row on the Voting Center (made focusable), or its bar on the results face.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: Points the voter at what they just added.  
    - <u>Cons</u>: Result bars and vote rows are not focusable today; making them so changes keyboard order on every card, beyond this edge case. On a compact results face the new 0% bar may be under "More choices" and not drawn at all.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · MEDIUM · spec FR-020, US4 scenario 4; research R14; tasks T026–T027  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md research.md data-model.md contracts/ui.md Updated: 2026-11-23 8:45 PM  
  **Notes**: Recommendation accepted in file 2026-11-23: Recommendation A. spec.md FR-020 and US4 scenario 4: the phone voting bar is not an action row for the help line, the card's bottom row's line is the one shown; research.md R14, data-model.md help-line rule and contracts/ui.md V18 say the same. No task change: no task added a help line to `#voteBar`.  

  FR-020 puts the help line under "every action row with a Cast button". In the phone layout the maximized ballot's Cast button is in `#voteBar`, which gets no help line in any task. It is unclear whether the bar counts as an action row.  

  - **Recommendation A** _(recommended)_: FR-020 excludes the phone vote bar. State in the spec and R14 that the bar mirrors the card's action row, and that the card's own help line (under the card's bottom action row) is the one shown.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: The fixed bottom bar keeps its height and takes no more of a phone screen; no change to `index.html` or `syncVoteBar`.  
    - <u>Cons</u>: A phone voter sees the line only when scrolled to the card's bottom row.  

  - **Recommendation B**: The phone vote bar shows the help line above its buttons on a Multiple-Choice poll: add it to T013 (markup) and to T027 or `syncVoteBar` (visibility).  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: The most literal reading of "every action row with a Cast button"; the line is always in view while voting on a phone.  
    - <u>Cons</u>: The fixed bar grows by a line, covering more of the ballot; one more element to keep in step.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **F1** · Inconsistency · MEDIUM · tasks.md T028, T031 (marked [P], both edit `pollCard.js`); T019 and T020 (both [P], both may edit `tests/phone-sheets.test.ts`)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-23 7:30 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-23: Recommendation. tasks.md: the `M3Ripple` selector edit moved from T028 into T027 and the `syncTitleIcons` change from T031 into T030, so T028 and T031 touch only `pollCard-m3.css`; T020 loses [P] and runs after T019 (both edit `phone-sheets.test.ts` and `phone-card-m3.css`); the US2 parallel line now reads "T019 then T020, ∥ T021".  

  Tasks marked parallel edit the same files. This contradicts the tasks file's own rule that `pollCard.js` tasks run in sequence.  

  - **Recommendation**: Move T028's `M3Ripple` selector edit into T027 and T031's `syncTitleIcons` change into T030. Remove [P] from T020, or give the phone-sheets edit to T019 only.  

    ➡️ [X] **Accepted**  
    - Keeps every [P] task to its own files, so the tasks can really run side by side.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · LOW · tasks.md T008  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-23 7:30 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-23: Recommendation. tasks.md T008 now names `tests/poll-card-assets.test.ts`, its `pollCard.js card template` describe, which already checks the template's buttons and sizers.  

  "`tests/poll-card-assets.test.ts` (or the closest card-markup suite)" leaves the target file open.  

  - **Recommendation**: Name the suite: check what `poll-card-assets.test.ts` covers and pick it or `client-home.test.ts`.  

    ➡️ [X] **Accepted**  
    - Makes T008 something an implementer can do without making a choice.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **E1** · Coverage · LOW · spec FR-023, SC-006; tasks.md T029, T032  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-23 7:30 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-23: Recommendation. tasks.md T029 adds a case to `tests/client-tab-address.test.ts`: `/?tab=watching` selects the `[data-tab="watching"]` tab labelled "Following"; `tests/shared-link-tab.test.ts`'s `tab=watching` cases must pass unchanged (FR-023, SC-006).  

  No task adds or confirms an automated check that `/?tab=watching&PID=…` still opens the renamed tab. Only quickstart 12 covers it by hand.  

  - **Recommendation**: In T029, assert an existing deep-link suite still passes with `tab=watching`, or add one case.  

    ➡️ [X] **Accepted**  
    - Gives SC-006 an automated check.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **P1** · Performance · LOW · tasks.md T011  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-23 7:30 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-23: Recommendation. tasks.md T011: `fitLabel` measures only when the button's label text or `clientWidth` differs from its last fit, kept per button.  

  `fitLabel` measures layout at the end of every `render()`, which runs on every live refresh for every mounted card.  

  - **Recommendation**: Run it only when the label text or the card's width changed (cache the last label and `clientWidth`).  

    ➡️ [X] **Accepted**  
    - Avoids a forced layout per card per refresh, in line with the constitution's Performance section.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **T1** · Terminology · LOW · spec.md lines 278–284  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-11-23 8:45 PM  
  **Notes**: Recommendation accepted in file 2026-11-23: Recommendation A. FR-025 stays beside the add-your-own requirements; references use the ID.  

  FR-025 sits between FR-017 and FR-018.  

  - **Recommendation A** _(recommended)_: Leave it; references use the ID.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: No edit; FR-025 stays beside the add-your-own requirements it belongs with.  
    - <u>Cons</u>: The numbering is out of order in the list.  

  - **Recommendation B**: Move FR-025 to the end of the Functional Requirements list without renumbering.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: The list reads in order.  
    - <u>Cons</u>: Separates it from its group ("Add your own choice").  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 | ✅ | T009, T012, T008 | |
| FR-002 | ✅ | T010, T007 | |
| FR-003 | ✅ | T009, T008 | |
| FR-004 | ✅ | T013, T008 | see A1 |
| FR-005 | ✅ | T010, T011 | see I1 |
| FR-006 | ✅ | T018, T019, T014 | |
| FR-007 | ✅ | T003, T006, T023, T014, T022 | |
| FR-008 | ✅ | T004, T005, T020 | |
| FR-009 | ✅ | T004, T006 | |
| FR-010 | ✅ | T005, T017, T023 | |
| FR-011 | ✅ | T015 | see U1 |
| FR-012 | ✅ | T015, T014 | |
| FR-013 | ✅ | T015, T014 | |
| FR-014 | ✅ | T015 | |
| FR-015 | ✅ | T015, T014 | relies on existing `applyPoll` |
| FR-016 | ✅ | T024, T022 | |
| FR-017 | ✅ | T022 | existing `Tabs.applyAddedChoices` |
| FR-018 | ✅ | T026, T027, T025 | |
| FR-019 | ✅ | T027, T025 | |
| FR-020 | ✅ | T026, T027, T028 | see A1 |
| FR-021 | ✅ | T030, T031, T029 | |
| FR-022 | ✅ | T030, T032, T037 | |
| FR-023 | ✅ | T032 | see E1 |
| FR-024 | ✅ | T034, T033 | |
| FR-025 | ✅ | T005, T016, T021, T014 | see I2 |
| SC-001 | ✅ | T015 | |
| SC-003 | ✅ | T027 | |
| SC-004 | ✅ | T029, T035, T037 | |
| SC-005 | ✅ | T011 | see I1 |
| SC-006 | ✅ | T032 | see E1 |

SC-002 (a usability check with users) needs nothing built, so it is left out.

## Constitution Alignment Issues

C1 (Principle VI and the Governance scope clause).

## Unmapped Tasks

None. T001 and T002 are setup for FR-008 and FR-006. T035–T039 are polish and documentation deliverables.

## Metrics

- Total requirements: 30 (25 FR, 5 buildable SC)
- Total tasks: 39
- Coverage: 100% (30/30 have at least one task)
- Ambiguity count: 1
- Duplication count: 0
- Critical issues: 1

## Next Actions (as reported)

- Resolve C1 before `/speckit-implement`. It is a wording change to T009, T010 and T026.
- Fix I1 before implementing US1. As planned, the button-width design cannot meet FR-005.
- I2, U1, A1 and F1 each need a small change to the spec and tasks. The LOW items can be fixed in passing.
- `/speckit-analyze-findings` (next step) records each finding with its recommendation, ready for "Next", "Accept" or
  "Accept all".
