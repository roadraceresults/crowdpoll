# Specification Analysis Report — specs/20261113-085157-FIXED-VIEWPORT-WIDTH

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261113-085157-FIXED-VIEWPORT-WIDTH |
| Report created | 2026-11-13 091400 AM |
| Analysis captured | 2026-11-13 091400 AM |
| Last updated | 2026-11-13 095224 AM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · MEDIUM · spec.md:L154 (FR-013); research.md R5; contracts/viewport.md V4; tasks.md T004  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md plan.md Updated: 2026-11-13 9:52 AM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation A; spec.md FR-013 now says "style sheets" and a new FR-015 forbids the browser enlarging text on its own while the fixed width applies; plan.md's note under the Constitution Check now cites FR-015.  

  FR-013 says the feature must not change the site's styles, but the plan has the script set `text-size-adjust: 100%` on the root element on narrow devices. The spec never mentions it.  

  - **Recommendation A** _(recommended)_: Amend FR-013 to "existing style sheets", and add a requirement that text is not enlarged by the browser on its own while the fixed width applies.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: The spec then states the behaviour the plan builds and SC-001 depends on ("the same layout, differing only in size"); no plan or task changes.  
    - <u>Cons</u>: One more requirement (FR-015) in the spec, and its effect can only be confirmed on a real phone.  

  - **Recommendation B**: Keep FR-013 as written and remove `text-size-adjust` from the plan (research R5, contract V4, T002, T004, T007), leaving the browsers' own text enlargement on.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: The script only rewrites the meta tag; the trial shows the technique exactly as browsers apply it by default.  
    - <u>Cons</u>: Browsers may enlarge some text blocks and not others, so phones may not show "the same layout" and the trial would judge the browser's guess as well as the technique.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · MEDIUM · tasks.md T015; quickstart.md Prerequisites, §3  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md quickstart.md Updated: 2026-11-13 9:52 AM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation; tasks.md T015 now diffs against `origin/main`; quickstart.md's prerequisites define the comparison site as a checkout of `origin/main` or the production site.  

  T015 runs `git diff --stat main -- src tests`, but this checkout has no local `main` branch (only `origin/main`), so the command fails.  

  - **Recommendation**: Use `origin/main` in T015. In the quickstart say "the `origin/main` checkout or the production site".  

    ➡️ [x] **Accepted**  
    - The task then runs as written; the quickstart's later mentions of `main` as the comparison site read against that one definition.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · LOW · spec.md:L3; plan.md:L3  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-13 9:52 AM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation; spec.md's Feature Branch is now `phone-uiux`, named as the trial branch of FR-012.  

  The spec's Feature Branch is `20261113-085157-FIXED-VIEWPORT-WIDTH`; the plan's is `phone-uiux`, the branch actually checked out. FR-012 makes "the branch" the trial, so the name matters.  

  - **Recommendation**: Name `phone-uiux` as the trial branch in the spec header.  

    ➡️ [x] **Accepted**  
    - `phone-uiux` is level with `origin/main` today, so it carries nothing but this feature; the spec and plan then name the same branch.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I4** · Inconsistency · LOW · spec.md:L187; research.md R8  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-13 9:52 AM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation; spec.md's assumption now says the automated tests check the pages' heads and the rule's decisions, and only the scaling is judged by hand.  

  The spec's assumption says the automated tests "check only that every page carries what the rule needs". The plan also tests the script's decisions in jsdom.  

  - **Recommendation**: Reword the assumption: tests check the pages' heads and the rule's decisions; only the scaling is judged by hand.  

    ➡️ [x] **Accepted**  
    - The assumption then matches the two test files the plan and tasks name.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **G1** · Coverage gap · LOW · spec.md:L115, L117; quickstart.md §3–§4  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ quickstart.md Updated: 2026-11-13 9:52 AM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation; quickstart.md §3 gained the tablet split-screen row and §4 the zoom-then-turn row.  

  Two spec edge cases have no check anywhere: a narrow split-screen pane on a tablet, and zooming in before turning the phone.  

  - **Recommendation**: Add two rows to quickstart §3 or §4.  

    ➡️ [x] **Accepted**  
    - The zoom-then-turn row goes in §4 (real phone); the split-screen row in §3, to be run on a tablet or skipped with a note when none is at hand.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · LOW · quickstart.md Prerequisites; tasks.md T011  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ quickstart.md Updated: 2026-11-13 9:52 AM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation; quickstart.md's prerequisites now name a signed-in account that may create polls.  

  The checklist opens the poll-creation wizard on `/admin`, but the prerequisites do not say a signed-in account that may create polls is needed.  

  - **Recommendation**: Add that prerequisite to the quickstart.  

    ➡️ [x] **Accepted**  
    - One sentence in the quickstart's prerequisites; T011 follows the quickstart and needs no change.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 fixed layout below 640 | Yes | T002, T004, T011 | |
| FR-002 device width at 640 and above | Yes | T007, T004, T011 | |
| FR-003 all 13 pages | Yes | T003, T005 | |
| FR-004 applied again on a turn or fold | Yes | T007, T008, T011 | |
| FR-005 zoom never limited, opens fitted | Yes | T002, T011 | fit judged by hand |
| FR-006 no sideways scroll | Yes | T011, T012 | manual only (no layout in jsdom) |
| FR-007 no-script fallback | Yes | T003, T011 | |
| FR-008 desktop unchanged | Yes | T007, T011 | |
| FR-009 no flash before first draw | Yes | T003, T005, T012 | head position tested; the flash itself by hand |
| FR-010 page check keeps passing | Yes | T003, T006 | |
| FR-011 manual checklist | Yes | T010–T013 | |
| FR-012 no setting or switch | Yes | T004, T015 | |
| FR-013 no change to existing styles | Yes | T015 | see I1 |
| FR-014 no third party, cookie or storage | Yes | T002 | |
| SC-001 same layout at four widths | Yes | T011 | |
| SC-002 no sideways scrolling | Yes | T011, T012 | |
| SC-003 tablet and landscape as today | Yes | T011 | |
| SC-004 10 of 10 turns | Yes | T011, T012 | |
| SC-005 controls tappable | Yes | T012 | |
| SC-006 checklist completed | Yes | T013 | |
| SC-007 no-script and desktop unchanged | Yes | T011 | |

## Constitution Alignment Issues

None. The documentation phase the constitution requires is present (T016, T018), and T004 forbids comments and console logging.

## Unmapped Tasks

T001 and T014 (baseline and final test runs) and T017 (`CLAUDE_COMPLETE.md`) map to no requirement; all three are project convention.

## Metrics

- Total Requirements: 21 (14 functional, 7 success criteria)
- Total Tasks: 18
- Coverage: 100%
- Ambiguity Count: 0
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

No critical or high findings, so implementation is not blocked. I2 should be fixed first because T015 fails as written.
