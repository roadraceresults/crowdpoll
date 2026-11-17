# Specification Analysis Report — specs/20261113-140600-PHONE-LAYOUT-REDESIGN

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261113-140600-PHONE-LAYOUT-REDESIGN |
| Report created | 2026-11-13 032022 PM |
| Analysis captured | 2026-11-13 032022 PM |
| Last updated | 2026-11-13 032803 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · MEDIUM · spec.md:L254-255 (FR-004); research.md R2; contracts/phone-layout.md P2; requirements.md (UA2)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md requirements.md Updated: 2026-11-13 3:28 PM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation A; spec.md FR-004 and requirements.md (UA2) now read "labels 15 to 18 px"; research R2 and contract P2 already held the smallest label at 15 px.  

  FR-004 says "labels 14 to 18 px" and also "no text may be smaller than 15 px". The smallest label (11 px × 1.25) is 13.75 px, so both cannot hold. The plan already holds that label at 15 px.  

  - **Recommendation A** _(recommended)_: Change FR-004 to "labels 15 to 18 px", and the same phrase in `requirements.md`.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: The floor, which protects readability, stays whole; the spec then agrees with the plan (research R2) and contract P2, which need no change.  
    - <u>Cons</u>: The smallest label is 36 % larger than its base size instead of 25 %, so the few places that use it (tab labels, step labels) take slightly more room.  

  - **Recommendation B**: Lower the floor to 14 px in FR-004 and keep "labels 14 to 18 px"; `label-small` becomes 14 / 15 in research R2 and contract P2, and the 15 px minimum becomes 14 px in the spec, contracts, tasks and quickstart.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: The scale is a uniform × 1.25.  
    - <u>Cons</u>: 14 px shows at 10.5 px on a 360 px phone; it contradicts the resolved requirement of a 15 px minimum (UA2), and five artifacts change.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **G1** · Coverage gap · MEDIUM · spec.md:L358 (SC-002); tasks.md T041; quickstart.md §4  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md quickstart.md Updated: 2026-11-13 3:28 PM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation; tasks.md T041 now measures the 12- and 50-choice compact cards against 500 px; quickstart.md §4 gained a box for SC-002.  

  SC-002 limits a compact card to 500 px for polls of 6 to 50 choices. No test, task or checklist step measures a card's height.  

  - **Recommendation**: Add the measurement to T041 (12- and 50-choice cards no taller than 500 px with a two-line title) and one box to quickstart §4.  

    ➡️ [x] **Accepted**  
    - The height depends on real layout, which jsdom cannot compute, so the headless-browser pass of T041 and the checklist are where it can be checked.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **G2** · Coverage gap · LOW · spec.md Edge Cases; tasks.md T013, T014, T011  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-13 3:28 PM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation; tasks.md T014 now cuts long bar labels with an ellipsis, and T011 gained the 35-character label case and the five-to-six-choices case.  

  Two spec edge cases have no task or test: a 35-character choice label cut with an ellipsis on a bar, and a choice added while a card is flipped to its voting side.  

  - **Recommendation**: Add the ellipsis rule to T014 and a case for each to T011.  

    ➡️ [x] **Accepted**  
    - T014 gains one clause (bar labels on one line, cut with an ellipsis); T011 gains two cases (a 35-character label keeps its full text in the row's accessible name; a card on its voting side stays there when the poll goes from five to six choices).  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **G3** · Coverage gap · LOW · spec.md FR-007; contracts/phone-layout.md P5; tasks.md T003  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-13 3:28 PM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation; tasks.md T003(b) now also forbids literal colors, which T014 and T028 reuse for the other two phone sheets.  

  "No new color" is checked only by the absence of `prefers-color-scheme` and `data-theme`. A literal color in a phone sheet would pass.  

  - **Recommendation**: In T003(b), also forbid hex, `rgb()` and `hsl()` colors in the three phone sheets, as the line-graph sheet's test does.  

    ➡️ [x] **Accepted**  
    - The same check then applies to `phone-card-m3.css` and `phone-admin-m3.css` through T014 and T028, which reuse T003(b).  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · LOW · tasks.md T032  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-13 3:28 PM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation; tasks.md T032 now names the five client-admin test files that exist.  

  T032 runs `tests/admin-card*.test.ts`, but no test file matches that pattern.  

  - **Recommendation**: Replace it with the files that exist: `client-admin-wizard`, `client-admin-invitees`, `client-admin-search`, `client-admin-creator`, `client-admin-discard`.  

    ➡️ [x] **Accepted**  
    - These are the client suites that load `adminCard.js` and the admin sheets.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **T1** · Terminology · LOW · spec.md Key Entities ("Submit bar"); tasks.md T018; research.md R9  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ research.md Updated: 2026-11-13 3:28 PM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation; research.md R9 now says its `#voteBar` element is the spec's Submit bar.  

  The same element is the "Submit bar" in the spec and contracts, and `#voteBar` / `.vote-bar` in the plan and tasks.  

  - **Recommendation**: Keep "Submit bar" in prose and say once, in research R9, that its element is `#voteBar`.  

    ➡️ [x] **Accepted**  
    - Research R9 already introduces the element; one sentence there ties the two names together, and no identifier changes.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 phone layout at 480 and narrower only | Yes | T003–T005, T045 | |
| FR-002 480 px minimum width | Yes | T003, T005 | |
| FR-003 64 px touch targets | Yes | T014, T028–T031, T042 | tap accuracy by hand |
| FR-004 type scale, 15 px floor | Yes | T003, T004, T041 | see I1 |
| FR-005 no shrink rules | Yes | T014, T030 | |
| FR-006 sub-480 rules removed | Yes | T028, T032 | see U1 |
| FR-007 existing palette | Yes | T003, T005 | see G3 |
| FR-008 one page frame | Yes | T005, T030 | |
| FR-009 one card frame | Yes | T005 | |
| FR-010 legal text | Yes | T030 | |
| FR-011 admin page in the frame | Yes | T031 | |
| FR-012 wizard usable | Yes | T031, T033, T042 | |
| FR-013–FR-015 essential bars, "more" row | Yes | T010–T013 | |
| FR-016 tap to maximize | Yes | T011, T013 | |
| FR-017 title, subtitle, notes lines | Yes | T014 | |
| FR-018 nothing scrolls in a card | Yes | T013 | arrow rows are already hidden below 640 px |
| FR-019 share order | Yes | T011, T013 | unchanged sort |
| FR-020–FR-023 two-sided vote, routing | Yes | T016, T017 | |
| FR-024 Submit bar | Yes | T016, T018 | |
| FR-025 vote rules unchanged | Yes | T019 | existing suites |
| FR-026–FR-028 maximized bars, Show all | Yes | T020, T022, T023 | |
| FR-029–FR-030 extras rows, fetch on open | Yes | T020, T023 | |
| FR-031 card as tall as its visible side | Yes | T024 | verified in a browser |
| FR-032–FR-034 Back | Yes | T021, T025, T026 | |
| FR-035–FR-036 Results and exports removed | Yes | T034–T037 | |
| FR-037 documents and interface description | Yes | T038, T046, T047 | |
| FR-038 kept features | Yes | T035, T039 | |
| FR-039 checklist | Yes | T040–T043 | |
| FR-040 viewport rule unchanged | Yes | T045 | |
| SC-001 first card wholly visible | Yes | T042 | quickstart §4 |
| SC-002 card no taller than 500 px | No | — | see G1 |
| SC-003–SC-011 | Yes | T041–T044 | |

## Constitution Alignment Issues

None. The one cost the plan carries (overriding the old phone rules) is justified in Complexity Tracking, and the documentation phase is present (T046, T047).

## Unmapped Tasks

T001 and T044 (baseline and final test runs) and T048 (`CLAUDE_COMPLETE.md`), all project convention.

## Metrics

- Total Requirements: 51 (40 functional, 11 success criteria)
- Total Tasks: 48
- Coverage: 98% (50 of 51 with at least one task)
- Ambiguity Count: 0
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

No critical or high findings, so implementation is not blocked. I1 and G1 are worth fixing first: I1 because the spec contradicts itself, G1 because a stated success criterion has no check.
