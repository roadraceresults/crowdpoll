# Specification Analysis Report — specs/030-INTEGRATE-SINGLE-COLUMN

## Record

| Record | Value |
|---|---|
| Feature directory | specs/030-INTEGRATE-SINGLE-COLUMN |
| Report created | 2026-10-13 18:24 |
| Analysis captured | 2026-10-13 18:24 |
| Last updated | 2026-10-13 18:39 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

## Findings

- [X] **C1** · Inconsistency · HIGH · research.md R9; data-model.md "Floating pair"; contracts C5, C10; tasks T025, T028, T030  
  **Summary:** The plan, data model and tasks all use `#cardGrid` as "the card area". The prototype has that id, but production `index.html` has no `#cardGrid`. It has eight `.card-grid` elements, one per tab panel, and only the active panel is shown. Per C10, `floatingActions.js` returns without effect when an element is missing, so it would never float. T025 stubs `#cardGrid`, so the test would pass while production fails.  
  **Recommendation:** Define the card area as the visible panel's `.card-grid` (`.tab-panel:not([hidden]) .card-grid`). Change R9, data-model, C5/C10 and T025/T028/T030 to that, and make T025 build the DOM from the real `index.html` panels.
  **Resolution:** research.md R9, data-model.md, contracts C5 and tasks T025, T028, T030 now define the card area as the visible panel's `.card-grid`; T025 uses the real page's DOM. (2026-10-13 18:25)

- [X] **C2** · Coverage Gap · MEDIUM · tasks T010, T023, T031; Phase checkpoints  
  **Summary:** T003 and T004 put both new scripts into the pin tests at the start. `m3-assets` and `pages` then stay red until T022 and T031, so Phases 2–4 end with a failing suite. That is against "commit after each task" and Principle IV.  
  **Recommendation:** Move each script's line in T003/T004 into the task that adds its tag (T022 and T031), so every checkpoint is green.
  **Resolution:** tasks.md T003, T004 and T010 no longer list the scripts; T022 and T031 add each script to the two pin tests with its tag, so every checkpoint is green. (2026-10-13 18:25)

- [X] **C3** · Coverage Gap · MEDIUM · spec FR-005, FR-011, FR-016, SC-008; tasks T015, T017, T044, T047  
  **Summary:** SC-008 says the new tests fail if any of FR-006 to FR-015 is reverted. But FR-011 (highlights) and FR-005 (tab sizing) are CSS only and have no static assertion, as FR-012 does at T044. FR-016's accessible names and the floating pair's keyboard reachability have no test either.  
  **Recommendation:** Extend `tests/single-column-sheets.test.ts` with FR-005 and FR-011 assertions in US2. Add `aria-label` assertions to T015 and a DOM-order check to T025.
  **Resolution:** tasks.md: new T057 (static assertions for FR-005 and FR-011), aria-label assertions added to T015, button-order check added to T025. (2026-10-13 18:25)

- [X] **C4** · Coverage Gap · MEDIUM · spec SC-007  
  **Summary:** "Results in the same time as from the header box today" has no task. Nothing measures it or reuses the existing search request.  
  **Recommendation:** Reword SC-007 as "the same request and rate limit" (T034 already asserts that), or add a manual timing step to the quickstart.
  **Resolution:** Option A: spec.md SC-007 now reads "reaches the search field with one tap on the Search tab, and a search from it makes the same request under the same rate limit as the header box does today"; T034 asserts the request and the quickstart's search step covers the tap (2026-10-13 18:27)

- [X] **A1** · Inconsistency · MEDIUM · spec US3 scenario 1, FR-013; plan R9; spec FR-012  
  **Summary:** The spec says the pair starts "just under the line beneath the tab bar". The plan starts it 4 px under the card grid's top. Since FR-012 puts the Refresh row between the line and the grid, the pair starts below Refresh, not under the line. Only on Live Results (no Refresh) are the two close.  
  **Recommendation:** Reword the spec as "4 px under the top of the cards, flush right (below the Refresh row)".
  **Resolution:** spec.md US3 scenario 1 and FR-013 now say the pair starts at the top right of the cards, 4 px under their top (below the Refresh row where there is one). (2026-10-13 18:25)

- [X] **U1** · Underspecified · MEDIUM · spec US5 scenario 2, FR-015; research R11; task T041  
  **Summary:** The disabled Create Poll item's hint is a `title`, which becomes a hover tooltip. The item only exists at phone width, where there is usually no hover, so touch users never see why it is dimmed.  
  **Recommendation:** State how touch users learn it. For example, a tap on the dimmed item shows the hint as a short notice, or it carries visible secondary text. Add the matching case to T040.
  **Resolution:** Option C: the dimmed Create Poll item shows a visible second line "Needs permission to create polls" linked by `aria-describedby`; spec.md US5 scenario 2 and FR-015, research.md R11, contract C8 and tasks T040, T041, T042 updated, and the pointer hint stays (2026-10-13 18:32)

- [X] **U2** · Underspecified · MEDIUM · spec Edge Cases; plan R9; tasks T030  
  **Summary:** When a card is maximized, the grid is hidden and the card area is undefined. The spec says what the card looks like, not where the floating pair goes.  
  **Recommendation:** Decide: keep the pair on screen where it is, or hide it while a card is maximized. Add one edge case and one T025 case.
  **Resolution:** Option A: while a card is maximized the card area is the visible `.maximized-card-grid`, and the pair stays (moved only if it no longer fits); spec.md Edge Cases, research.md R9, data-model.md, contract C5 and tasks T025, T028, T030 updated (2026-10-13 18:33)

- [X] **I1** · Terminology · LOW · spec (all), FR-005  
  **Summary:** "phone layout", "single column", "narrow screen" and "phone width" all mean "narrower than 640 px". FR-005 says "slightly tighter lettering", which is vague.  
  **Recommendation:** Define "phone width" once in the spec. In FR-005 name the value (-0.03 em, as contract C2 does).
  **Resolution:** spec.md Assumptions define "phone", "phone width", "single column" and "narrow screen" once; FR-005 names the tightening (0.03 em). (2026-10-13 18:25)

- [X] **I2** · Inconsistency · LOW · architecture.md Figures 1 and 8, section 10  
  **Summary:** It says one new script, `tabBarScroll.js`, also moves the floating buttons. The plan (R2) splits this into two scripts.  
  **Recommendation:** Run `/speckit-architecture ... UPDATEONLY` or edit the three places.
  **Resolution:** at the developer's direction, architecture.md was edited in the three places the finding named (the approach paragraph and Figure 1, Figure 8, and the section 10 mapping table) so it describes two scripts, `tabBarScroll.js` and `floatingActions.js` (2026-10-13 18:38)

- [-] **D1** · Unmapped Task · LOW · T001, T002, T010, T051 to T056  
  **Summary:** These have no requirement. They are setup, polish or a note, and T010 is a note, not an action.  
  **Recommendation:** Accept T001, T002 and T051 to T056. Fold T010 into T009 or T023.
  **Resolution:** accepted as-is by the developer (Option A); T010 is now a real checkpoint (run the three suites, all green) after C2, and the other unmapped tasks are setup and polish (2026-10-13 18:39)

- [X] **U3** · Ambiguity · LOW · spec SC-002  
  **Summary:** "At most three taps" assumes about 2.5 tabs visible. At 360 px, 8 tabs may need four.  
  **Recommendation:** State the width (384 px, as SC-001 does).
  **Resolution:** spec.md SC-002 states the width (384 px). (2026-10-13 18:25)

- [X] **U4** · Coverage Gap · LOW · spec FR-018; tasks T053, T056  
  **Summary:** "No server, data, configuration or contract change" has no verifying task.  
  **Recommendation:** Add to T053: `git diff --stat` shows only `src/public/`, `tests/`, `specs/`, `designDocs/`, `architecture/`, `CLAUDE.md` and `.specify/`.
  **Resolution:** tasks.md T053 adds the `git diff --stat` check for FR-018. (2026-10-13 18:25)

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 one column, 16 px gap | Yes | T011, T012, T014 | |
| FR-002 compact card sizes, vote count | Yes | T011, T012, T014 | |
| FR-003 wide unchanged | Yes | T009, T014, T055 | static scoping check plus manual |
| FR-004 compact header, 7 pages | Yes | T047, T048, T050 | |
| FR-005 label-width tabs | Partial | T017 | no test (C3) |
| FR-006 arrows always on, greyed | Yes | T015, T017, T018 | |
| FR-007 step of two tabs, 0.5 s | Yes | T015, T019 | |
| FR-008 hold, settle | Yes | T015, T019 | first-frame case covered |
| FR-009 drag and swipe | Yes | T015, T020 | |
| FR-010 menu | Yes | T015, T021 | |
| FR-011 highlights | Partial | T017, T024 | CSS only, manual (C3) |
| FR-012 Refresh row | Yes | T044, T045, T046 | |
| FR-013 floating pair | Yes | T025 to T033 | C1, A1, U2 |
| FR-014 Search field | Yes | T034 to T039 | |
| FR-015 Create Poll item | Yes | T040 to T043 | U1 |
| FR-016 accessibility | Partial | T015, T016, T021 | C3 |
| FR-017 tests | Yes | T003, T004, T009, T015, T025, T034, T040 | |
| FR-018 no server change, ships directly | Partial | T056 | U4 |
| FR-019 seven-page phone check | Yes | T050, T055 | manual |
| SC-001 | Yes | T014 | manual |
| SC-002 | Yes | T015, T024 | U3 |
| SC-003 | Yes | T015, T024 | manual for the layout part |
| SC-004 | Yes | T050 | manual |
| SC-005 | Yes | T014, T055 | manual |
| SC-006 | Yes | T025, T033 | |
| SC-007 | No | none | C4 |
| SC-008 | Partial | T015, T025, T034, T040 | C3 |

## Constitution Alignment Issues

None reported. Principles I to VI pass. Principle VI is enforced by T009 (no comments in sheets), T012 and T051 (the porting rule). Principle IV is weakened only by C2, which is a MEDIUM finding.

## Unmapped Tasks

T001, T002, T010 and T051 to T056, as above.

## Metrics

- Total requirements: 19 FR + 8 SC = 27.
- Total tasks: 56.
- Coverage (requirements with at least one task): 26 of 27 = 96%. FR 19 of 19; SC 7 of 8.
- Partial coverage: FR-005, FR-011, FR-016, FR-018, SC-008.
- Ambiguity count: 2 (I1, U3).
- Duplication count: 0.
- Critical issues: 0 (1 HIGH, 7 MEDIUM, 4 LOW).

## Next Actions (as reported)

- C1 is real and should be fixed before `/speckit-implement`. With the wrong element id, the floating buttons would never appear on the real page, and its test would still pass.
- The rest can be fixed in one pass or deferred. C2 to C4, A1, U1 and U2 are worth doing first. I1, I2, D1, U3 and U4 are wording and housekeeping.
- Suggested commands: edit `plan.md`, `research.md` (R9), `data-model.md`, `contracts/ui-contracts.md` and `tasks.md` for C1. Then `/speckit-specify` refinement or a manual edit of `spec.md` for A1, U1, U2, I1, U3 and C4.
- After the fixes, run `/speckit-analyze` again, then `/speckit-implement`.
