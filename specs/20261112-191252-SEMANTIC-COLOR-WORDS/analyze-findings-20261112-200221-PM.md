# Specification Analysis Report — specs/20261112-191252-SEMANTIC-COLOR-WORDS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261112-191252-SEMANTIC-COLOR-WORDS |
| Report created | 2026-11-12 075659 PM |
| Analysis captured | 2026-11-12 075659 PM |
| Last updated | 2026-11-12 080047 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **U1** · Underspecification · MEDIUM · tasks.md T001  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-12 8:00 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation, T001 now cuts the served script at the first `
}
` after `function semanticColorFor` (tasks.md T001).  

  T001 cuts the served script "up to the `SHARED BAR SIZING` comment". That text would still hold the comment's opening `/*`, so `new Function` would fail with a syntax error.  

  - **Recommendation**: Cut at the end of `semanticColorFor` instead: the first `\n}\n` after `function semanticColorFor`.  

    ➡️ [x] **Accepted**  
    - The extracted text then ends exactly at the function's closing brace, and it still holds all three lists, since the constants come before the function.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage Gap · MEDIUM · spec.md Edge Cases; contracts/ui.md; tasks.md T002, T004  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md contracts/ui.md Updated: 2026-11-12 8:00 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation, "APPROVE" added to T002 and "Customer support" to T004 (both green), and both to contracts/ui.md U1.  

  FR-011 requires a test for every label named in the edge cases. "APPROVE" (letter case on a new word) and "Customer support" (→ green) are in no table row.  

  - **Recommendation**: Add "APPROVE" → green to U1 and T002, and "Customer support" → green to U1 and T004.  

    ➡️ [x] **Accepted**  
    - Two more table rows make every edge-case label a test, as FR-011 asks, and they record the accepted "Customer support" trade-off.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage Gap · LOW · spec.md FR-010; tasks.md T008  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-11-12 8:00 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation A, leave as is; `tests/client-line-colors.test.ts` already checks that the lines follow `resultColors()`.  

  Only the results bars are tested (T008). The vote bars and the line graph get the rule through the shared `assignResultColors` and `resultColors()`, but no task checks them.  

  - **Recommendation A** _(recommended)_: Leave as is. `tests/client-line-colors.test.ts` already checks that the lines follow `resultColors()`, and both bar paths call the same function.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: no new test for a path that this feature does not change.  
    - <u>Cons</u>: FR-010 rests on the existing tests rather than one of its own.  

  - **Recommendation B**: Extend T008 to also check the neutral choice's line color in the line graph.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: FR-010 gets a direct test for the new neutral path.  
    - <u>Cons</u>: the line graph needs vote history to draw lines, so the test needs more setup.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **D1** · Duplication · LOW · tasks.md T001, T002, T006  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-12 8:00 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation A, dropped "Approves", "Approving" from T002 and "Yes and no" from T006; T001 tests them through U4.  

  "Approves", "Approving" and "Yes and no" are in U4, which T001 already tests, and T002 and T006 list them again.  

  - **Recommendation A** _(recommended)_: Drop the repeated rows from T002 and T006.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: each label is tested once, in T001.  
    - <u>Cons</u>: the story tasks no longer show those labels next to the story they illustrate.  

  - **Recommendation B**: Keep them as harmless.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no edit, and each story still shows its own boundary cases.  
    - <u>Cons</u>: three labels end up in the table twice.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 positive list | Yes | T003, T005 | |
| FR-002 negative list | Yes | T003, T005 | |
| FR-003 neutral list | Yes | T007 | |
| FR-004 whole word, any case | Yes | T002, T004, T006 | Upper case on a new word is missing (C1) |
| FR-005 phrase spaces, apostrophe | Yes | T006, T007 | |
| FR-006 order | Yes | T006, T007 | |
| FR-007 listed forms only | Yes | T002 | |
| FR-008 unchanged rules | Yes | T001 | |
| FR-009 palette slots | Yes | T008 | |
| FR-010 one rule everywhere | Partial | T008 | C2 |
| FR-011 tests | Yes | T001–T008 | C1 |
| FR-012 docs | Yes | T009, T010 | |
| SC-001 | Yes | T001–T008 | |
| SC-002 | Yes | T001 | |
| SC-003 | Yes | T012 | manual |
| SC-004 | n/a | none | Not buildable work (nothing stored) |

## Constitution Alignment Issues

None reported.

## Unmapped Tasks

None. T011 and T012 are validation tasks.

## Metrics

- Total Requirements: 12 FR + 4 SC
- Total Tasks: 12
- Coverage: 100% of FRs (FR-010 partly), 3 of 3 buildable SCs
- Ambiguity Count: 0
- Duplication Count: 1
- Critical Issues Count: 0

## Next Actions (as reported)

Nothing is CRITICAL or HIGH. U1 and C1 are cheap to fix before `/speckit-implement`. `/speckit-analyze-findings` takes
the place of the offer of remediation edits.
