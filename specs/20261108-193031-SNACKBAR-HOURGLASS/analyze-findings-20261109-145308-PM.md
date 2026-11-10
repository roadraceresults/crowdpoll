# Specification Analysis Report — specs/20261108-193031-SNACKBAR-HOURGLASS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261108-193031-SNACKBAR-HOURGLASS |
| Report created | 2026-11-09 075452 AM |
| Analysis captured | 2026-11-09 075452 AM |
| Last updated | 2026-11-09 084827 AM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · MEDIUM · spec.md:L50 (Story 2 AS2), spec.md:L78 (FR-004), quickstart.md row 6  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-09 8:46 AM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-09: Recommendation, spec.md Story 2 AS2 now reads "the dark theme (the site's own theme choice)" and FR-004 ends "(the dark theme being the site's own theme choice)"; the requirements document needed no change.  

  The spec says the dark theme can come "from the device setting or the site's own theme choice".  
  The site has no device-driven dark theme: `m3-tokens.css:38` switches only on `:root[data-theme="dark"]`, which `colorScheme.js` sets from the member's saved choice.  
  The device-setting half of AS2 can't be tested and doesn't exist.  

  - **Recommendation**: reword AS2 and FR-004 to "the dark theme (the site's own theme choice)", and drop "rather than on the device" from FR-004.  

    ➡️ [X] **Accepted**  
    - The spec then describes the theme switch that exists, and quickstart row 6 (the site's own setting) already tests it.  
    - Adding a device-driven dark theme would be a new feature, out of this one's scope.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · tasks.md T007, T012, T013  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-09 8:48 AM  
  **Notes**: Recommendation accepted in file 2026-11-09: Recommendation A, tasks.md T007, T012 and T013 each split into "Automated (the implementer runs these)" and "Developer to verify" (real provider login, fade timing, screen reader, background tab), which the implementation summary lists as not yet verified.  

  These tasks mix automated runs with manual checks: a real provider login, watching the animation, a screen reader, and a background tab.  
  An implementing agent can do the first part but not a screen reader or an exact fade timing.  
  No task says which checks the developer does, so implementation could stop or claim checks it didn't run.  

  - **Recommendation A** _(recommended)_: split each into an automated part, which the agent runs (the tests, plus `/?signedIn=1` on a signed-in session in a browser), and a "developer to verify" list (screen reader, timing, real provider login), which the implementation summary reports as not yet verified.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: implementation runs to the end unattended, and its report says exactly what was and wasn't checked.  
    - <u>Cons</u>: a few checks wait for the developer after implementation.  

  - **Recommendation B**: leave T007, T012 and T013 as they are; the implementing agent attempts every check and reports any it could not perform.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no change to tasks.md.  
    - <u>Cons</u>: whether a check counts as done is left to judgement during implementation.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · tasks.md T004  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-09 8:46 AM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-09: Recommendation, tasks.md T004's last assertion now reads "no rule in snackbar-m3.css selects both is-shown and an hourglass class".  

  "No animation selector mentions `.is-shown`" isn't precise enough to test (which selectors count?).  

  - **Recommendation**: assert that no rule in `snackbar-m3.css` selects both `is-shown` and an `hourglass` class.  

    ➡️ [X] **Accepted**  
    - It can be checked mechanically, and it guards exactly the mistake research R4 warns about: tying the drain to `is-shown`, so the fade refills the sand.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage Gap · LOW · spec.md SC-004; tasks.md T004, T012  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-09 8:48 AM  
  **Notes**: Recommendation accepted in file 2026-11-09: Recommendation A, tasks.md T012's automated part now confirms the research R7 contrast ratios against src/public/m3-tokens.css (SC-004).  

  The 3:1 contrast target has no checking task.  
  T004 pins the token names, and the measured ratios (5.00–11.55) are only in research R7.  

  - **Recommendation A** _(recommended)_: add to T012: "confirm the ratios in research R7 still hold against `m3-tokens.css`".  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: SC-004 is checked against the tokens as they are at implementation time.  
    - <u>Cons</u>: one more step in T012.  

  - **Recommendation B**: accept research R7 as the evidence; no change.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the ratios were measured from the current tokens two days ago, and this feature doesn't change the tokens.  
    - <u>Cons</u>: SC-004 has no task of its own.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **T1** · Terminology · LOW · spec.md (throughout "notice"); plan.md, tasks.md, contracts (mostly "snackbar")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-09 8:46 AM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-09: Recommendation, spec.md Assumptions gains a first line saying the "notice" is the sign-in snackbar (m3-snackbar).  

  The spec calls it the "notice"; the plan, tasks and contracts call it the "snackbar", and sometimes both.  

  - **Recommendation**: add one Assumptions line to the spec: "The 'notice' is the sign-in snackbar (`m3-snackbar`)".  

    ➡️ [X] **Accepted**  
    - One line ties the stakeholder word to the code word, without rewording any artifact.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 hourglass at the right end | Yes | T003, T005, T007 | |
| FR-002 7 seconds | Yes | T002 | |
| FR-003 smooth single drain with stream | Yes | T004, T006, T007 | Visual check is manual (U1) |
| FR-004 notice colours, both themes | Yes | T004, T006, T012 | Wording issue I1 |
| FR-005 22 × 32, 48 px bar, 12 px gap | Yes | T004, T006, T007 | |
| FR-006 wraps, hourglass keeps size | Yes | T004, T006, T007 | |
| FR-007 reduced motion still | Yes | T009, T011, T012 | |
| FR-008 decorative | Yes | T008, T010 | |
| FR-009 trigger unchanged | Yes | existing suite, T013 | |
| FR-010 other notices unchanged | Yes | T013 | |
| FR-011 no extra download | Yes | T005, T007 (row 11) | |
| FR-012 follows the reference look | Yes | T005, T007 | |
| SC-001 every provider login | Yes | T003, T007 | |
| SC-002 within 0.2 s of fade | Yes | T006, T007 | Manual timing (U1) |
| SC-003 48 px at ≥ 320 px | Yes | T004, T007 | |
| SC-004 contrast ≥ 3:1 | Partial | T004 | C1 |
| SC-005 reduced motion / same announcement | Yes | T008, T009, T012 | |
| SC-006 no added requests | Yes | T007 | |

## Constitution Alignment Issues

None.
- Principles II and III: two source files, no new file, setting or dependency.
- Principle VI: T005 forbids spec-citing comments.
- Documentation Deliverables: T015 updates `README.md` and `ARCHITECTURE.md` after implementation.

## Unmapped Tasks

None.
- T001 (baseline) and T014 (full suite) are verification tasks.
- T016 (`CLAUDE_COMPLETE.md`) follows the project's practice.

## Metrics

- Total Requirements: 18 (12 FR + 6 SC)
- Total Tasks: 16
- Coverage: 100% with at least one task (SC-004 partial)
- Ambiguity Count: 1
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

- There are no CRITICAL or HIGH issues, so `/speckit-implement` could go ahead.
- I1 and U1 are worth fixing first, because they change what gets tested and what the implementation can honestly report as verified.
- `/speckit-analyze-findings` (next) records these five findings with their recommendations, so you can accept them.
