# Specification Analysis Report — specs/20261117-131915-WIDE-MORE-CHOICES

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261117-131915-WIDE-MORE-CHOICES |
| Report created | 2026-11-17 021114 PM |
| Analysis captured | 2026-11-17 021114 PM |
| Last updated | 2026-11-17 021852 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · HIGH · tasks.md T011; spec.md FR-018; plan.md Constraints  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-17 2:17 PM  
  **Notes**: Recommendation accepted in file 2026-11-17: Recommendation; T011 no longer adds the rows to the `M3Ripple` list and says why; the parallel note lost its mention of the ripple list.  

  T011 adds `.card-face .more-row, .card-face .show-all-row` to the `M3Ripple` list, which applies at every width, so the phone rows would gain a ripple; FR-018 and the plan say the phone layout does not change.  

  - **Recommendation**: Drop the ripple from T011; the wide rows get their state layer from the `not all and (max-width: 640px)` block only.  

    ➡️ [X] **Accepted**  
    - The phone layout stays untouched by construction, and the wide rows still show hover, focus and press through the state layer. The rows have no ripple, unlike the arrow rows they replace.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · tasks.md T021  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-17 2:17 PM  
  **Notes**: Recommendation accepted in file 2026-11-17: Recommendation; T021 now says to write the case from scratch in `tests/client-maximized.test.ts`, with the stubs and the spy named.  

  T021 says to add the test "beside the existing phone-layout notes case", but no test of `revealNotes` exists; only `client-phone-card.test.ts:156` checks the card's `{ open: "notes" }` call.  

  - **Recommendation**: Reword T021: write the case from scratch in `tests/client-maximized.test.ts`, on its grid harness, stubbing `getBoundingClientRect` on `.maximized-notes` and `.card-front .actions` and spying on `window.scrollTo`.  

    ➡️ [X] **Accepted**  
    - The task names one file and says how the positions are faked, so it can be carried out without searching for a case that is not there.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · MEDIUM · tasks.md T012  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-17 2:17 PM  
  **Notes**: Recommendation accepted in file 2026-11-17: Recommendation; T012 keeps the `restore()` change and gains its test; new task T029 holds the tab-show check, its record in quickstart.md and the conditional fix.  

  The second half of T012 is an open-ended check ("verify by reading … if a path renders them only while hidden, add the same re-render") with no stated outcome or test.  

  - **Recommendation**: Split it: T012 keeps the `restore()` change with a test; a new task records the result of the tab-show check in quickstart.md and adds the re-render and a test only if needed.  

    ➡️ [X] **Accepted**  
    - Each task then has one checkable outcome, and the result of the check is written down where the by-hand checks are recorded.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage gap · MEDIUM · spec.md SC-004; quickstart.md §6  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-17 2:17 PM  
  **Notes**: Recommendation accepted in file 2026-11-17: Recommendation; T025 repeats quickstart §6 at 600 px tall and adds that line to §6; quickstart.md itself is outside what this skill may edit, so the line is added when T025 runs.  

  SC-004 sets a 600 px window height; the quickstart checks "Show more" at 900 px tall only, and no task checks 600 px.  

  - **Recommendation**: Add a 600 px-tall check to quickstart §6 (covered by T025).  

    ➡️ [X] **Accepted**  
    - The success criterion is then checked at the height it names. `quickstart.md` is changed, and T025 names the height.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage gap · LOW · spec.md Story 1 scenario 6, SC-005; tasks.md T005  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-17 2:17 PM  
  **Notes**: Recommendation accepted in file 2026-11-17: Recommendation; T005 asserts the row is an enabled `<button type="button">` with no `tabindex="-1"`.  

  Keyboard activation of the row is only checked by hand; T005 tests the click.  

  - **Recommendation**: Have T005 assert the row is a `<button type="button">` that is not disabled or `tabindex="-1"`, which is what makes Enter and Space work.  

    ➡️ [X] **Accepted**  
    - jsdom does not turn a key press into a click, so the test pins the element that gives the keyboard behaviour for free.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C3** · Coverage gap · LOW · spec.md Edge Cases (live update); tasks.md T019  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-17 2:17 PM  
  **Notes**: Recommendation accepted in file 2026-11-17: Recommendation; T019 gains the live-update case.  

  "The maximized view keeps the viewer's Show all / Show fewer state across a live update" has no wide-layout test.  

  - **Recommendation**: Add one case to T019: `applyPoll` with new shares while "Show fewer choices" is shown keeps every row.  

    ➡️ [X] **Accepted**  
    - One more assertion in a test file that is being written anyway.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U3** · Underspecification · LOW · spec.md Edge Cases; research.md R1; tasks.md T008  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md tasks.md Updated: 2026-11-17 2:17 PM  
  **Notes**: Recommendation accepted in file 2026-11-17: Recommendation; spec.md has the edge case "a card with room for one row or none"; T005 has the two cases (capacity 1 and 0).  

  A card with room for one bar or none is not described: `places` is 0 and the row alone is shown, possibly taller than the room.  

  - **Recommendation**: Add the edge case to the spec ("a card with room for one row shows the 'More choices' row alone") and one case to T005.  

    ➡️ [X] **Accepted**  
    - The smallest card is defined and tested. It cannot happen at the card's 420 px minimum height, so this is a guard, not a visible change.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · LOW · spec.md Story 3, lines 104–116  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-17 2:17 PM  
  **Notes**: Recommendation accepted in file 2026-11-17: Recommendation; Story 3's scenarios now read 1 to 6: scenarios 5 and 6 were moved after 4 instead of renumbered, so "scenarios 1 and 6" in research.md still points at the right ones and no other file changed.  

  The acceptance scenarios are numbered 1, 2, 5, 6, 3, 4.  

  - **Recommendation**: Renumber 1–6 in reading order and update tasks.md and contracts if they cite the numbers (plan.md cites "scenarios 1 and 6").  

    ➡️ [X] **Accepted**  
    - The scenarios read in order; `plan.md` and `research.md` are updated where they cite the old numbers.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · LOW · checklists/requirements.md Notes  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-11-17 2:17 PM  
  **Notes**: Recommendation accepted in file 2026-11-17: Recommendation; the checklist note is outside the files this skill may edit, so nothing was changed; spec.md (Clarifications, FR-004) is the authority, and the note in checklists/requirements.md is left for the developer to correct.  

  The note still says the own-choices edge case "is settled by an assumption (all of them are shown)"; the clarification replaced that.  

  - **Recommendation**: Update the note to the clarified rule.  

    ➡️ [X] **Accepted**  
    - This skill may change only `spec.md`, `plan.md`, `tasks.md` and the related artifacts, so the checklist note cannot be edited here: accepting records that the spec is the authority and leaves the note for the developer to correct.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C4** · Coverage gap · LOW · spec.md FR-019; tasks.md  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-17 2:17 PM  
  **Notes**: Recommendation accepted in file 2026-11-17: Recommendation; T025 names FR-019 for its Back checks in quickstart §3 and §6.  

  Back from the three new routes is checked by hand only (quickstart §3, §6); no task names it.  

  - **Recommendation**: Acceptable, since the history step is existing behaviour at every width; name FR-019 in T025.  

    ➡️ [X] **Accepted**  
    - T025 says which requirement its Back checks cover; no test is added for behaviour that does not change.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 no scrolling | Yes | T016, T017, T018 | |
| FR-002 fitting cards unchanged | Yes | T003, T005, T025 | |
| FR-003 leaders + row | Yes | T004, T005, T007, T008 | |
| FR-004 own choices | Yes | T004, T005, T007 | |
| FR-005 row text | Yes | T005, T008 | |
| FR-006 row opens view | Yes | T005, T010 | keyboard by hand (C2) |
| FR-007 nothing else opens | Yes | T005, T010 | |
| FR-008 row appearance | Yes | T006, T009, T011 | I1 |
| FR-009 maximized rules | Yes | T019, T020 | |
| FR-010 Show all / fewer | Yes | T019, T020 | |
| FR-011 arrival from row | Yes | T019, T020 | |
| FR-012 ballot lists all | Yes | T019 | |
| FR-013 rows' look and focus | Yes | T011, T019, T020 | |
| FR-014 Vote opens view | Yes | T013, T014, T015 | |
| FR-015 checks before voting | Yes | T013 | |
| FR-016 notes position | Yes | T021, T022 | U1 |
| FR-017 panels stacked | Yes | T021, T025 | |
| FR-018 phone unchanged | Yes | T023, T024, T025 | I1 |
| FR-019 Back | Yes | T025 | by hand (C4) |
| FR-020 nothing stored | Yes | T024 | no code touches storage or routes |
| FR-021 documents | Yes | T026, T027, T028 | |
| SC-001 no card scrolls | Yes | T016, T025 | |
| SC-002 fitting cards same | Yes | T002, T025 | |
| SC-003 clicks to reach | Yes | T005, T013, T025 | |
| SC-004 notes in sight | Partly | T025 | C1 |
| SC-005 keyboard | Yes | T025 | C2 |
| SC-006 phone same | Yes | T002, T023, T025 | |

## Constitution Alignment Issues

None. The documentation phase the constitution requires is present (T026, T027).

## Unmapped Tasks

T001 and T002 (baseline and screenshots) and T012 (re-render after restore) map to no requirement directly; all three support FR-002 and SC-002.

## Metrics

- Total Requirements: 27 (21 functional, 6 success criteria)
- Total Tasks: 28
- Coverage: 100% (27 of 27 with at least one task; SC-004 partly)
- Ambiguity Count: 0
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

- No critical issue. I1 should be fixed before `/speckit-implement`, since T011 as written would change the phone layout.
- U1, U2 and C1 are small edits to tasks.md and quickstart.md; the LOW items are optional.
- The remediation offer is replaced by the next step, which captures these findings for acceptance.
