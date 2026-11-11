# Specification Analysis Report — specs/20261110-204911-LINK-PREVIEW-MESSAGE

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261110-204911-LINK-PREVIEW-MESSAGE |
| Report created | 2026-11-10 090701 PM |
| Analysis captured | 2026-11-10 090701 PM |
| Last updated | 2026-11-11 073050 AM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **C1** · Coverage · MEDIUM · spec.md SC-005; tasks.md T004  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-11 7:30 AM  
  **Notes**: Recommendation accepted in file 2026-11-11: Recommendation A, T004(a) now also asserts the rendered login page contains none of the poll's choice labels, notes text or vote counts, the helper's poll getting a distinctive choice label and notes text to assert against (SC-005).  

  SC-005 ("no poll content other than title, subtitle and approved message is exposed") has no assertion: T004 checks what is present, not what is absent (choices, notes, counts).  

  - **Recommendation A** _(recommended)_: Add to T004 an assertion that the rendered login page contains none of the poll's choice labels, notes text or vote counts.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: SC-005 becomes a test; the poll T004 already creates gets a distinctive choice label and notes text to assert against, so no new task or fixture is needed.  
    - <u>Cons</u>: T004 grows by one case.  

  - **Recommendation B**: Add a separate task in Phase 5 (US3) that creates a poll with choices and notes and asserts their absence from the login page.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: keeps T004 focused on what is present.  
    - <u>Cons</u>: one more task and fixture for an assertion that fits the existing poll; SC-005 belongs to US1's page, not US3's state table.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · spec.md US2 scenario 3, FR-003; research.md R3; tasks.md T010(c)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-11 7:30 AM  
  **Notes**: Recommendation accepted in file 2026-11-11: Recommendation A, US2 scenario 3 and FR-003 now read "cut to 300 characters, the ellipsis included", matching research R3, data-model.md and T010(c).  

  Spec says "cut to 300 characters, ending with an ellipsis" — readable as 300 + "…"; R3 and T010(c) settle it as 300 including the ellipsis.  

  - **Recommendation A** _(recommended)_: Reword FR-003/US2-3 to "300 characters, the ellipsis included" so spec, plan and tests say the same thing.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: one reading in every artifact; the test's expected length is unambiguous.  
    - <u>Cons</u>: two lines of the spec change.  

  - **Recommendation B**: Leave the spec as it is; research R3 and T010(c) already fix the convention.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no edit.  
    - <u>Cons</u>: a reader of the spec alone can take the limit as 301 characters.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · LOW · spec.md US1 scenario 1; data-model.md; tasks.md T004  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-11 7:30 AM  
  **Notes**: Recommendation accepted in file 2026-11-11: Recommendation A, the Poll entry of Key Entities now reads `sharing mode ("Anyone you send the link to", stored as `Anyone With The Link`, or invitation only)`; US1 scenario 1, data-model.md and T004 are unchanged.  

  The spec uses the UI label "Anyone you send the link to"; data-model and tasks use the stored value "Anyone With The Link".  

  - **Recommendation A** _(recommended)_: Acceptable (CLAUDE.md: stored enumerations stay verbatim; UI wording in the spec); add "(stored as `Anyone With The Link`)" once in the spec's Key Entities.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the two names are tied together once, where the Poll entity is defined; the spec keeps the words the creator sees.  
    - <u>Cons</u>: one implementation term enters the spec.  

  - **Recommendation B**: Leave every artifact as it is.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no edit; the previous feature's spec used the same UI wording.  
    - <u>Cons</u>: a reader must know the UI-label-to-stored-value mapping.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · LOW · tasks.md T010(a)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-11 7:30 AM  
  **Notes**: Recommendation accepted in file 2026-11-11: the single Recommendation, T010(a) now expects `escapeHtml("S\n\n" + notesPlainText("Line **one**\nLine two"))`, `notesPlainText` imported from `src/polls/notes.ts`, in place of the literal `escapeHtml("S\n\nLine one\nLine two")`.  

  The expected value `S\n\nLine one\nLine two` assumes `notesPlainText` keeps the line break and strips `**` marks; not verified against `src/polls/notes.ts` in the plan.  

  - **Recommendation**: When writing T010, derive the expectation from `notesPlainText`'s actual output for that input rather than a literal; keep the literal only if it matches.  

    ➡️ [x] **Accepted**  
    - T010(a)'s text is amended to compute the expected description as `escapeHtml("S\n\n" + notesPlainText("Line **one**\nLine two"))`, so the test pins the composition rule, not an assumption about the notes markup.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 head tags for a published PID | ✅ | T002, T004, T005, T007, T008 | public and private (Q2) |
| FR-002 `<title>` suffix, plain description = preview description | ✅ | T004, T007 | |
| FR-003 description composition and 300 cut | ✅ | T007, T010, T013 | see A1 |
| FR-004 approved column, plain text, escaped | ✅ | T008, T010(d)(e), T013 | |
| FR-005 plain page otherwise | ✅ | T008, T016, T018 | |
| FR-006 flows unchanged, no UA detection | ✅ | T004(b)(c), T009 | structural: no UA code is planned |
| FR-007 no-cache | ✅ | T004, T008, T016(a) | |
| FR-008 support text | ✅ | T011, T014 | |
| FR-009 no image | ✅ | T004 | |
| FR-010 logs carry no link/token | ✅ | T008 | pid only |
| SC-001 title instead of "Login" | ✅ | T004 | |
| SC-002 message words, never pending | ✅ | T010 | |
| SC-003 existing tests unchanged | ✅ | T001, T009, T020 | |
| SC-004 unpublished → plain page | ✅ | T016 | |
| SC-005 nothing else exposed | ⚠️ partial | T004 | see C1 |
| US1 / US2 / US3 | ✅ | Phases 3 / 4 / 5 | each with failing-first tests |

## Constitution Alignment Issues

None reported. T002's refactor of `pollPage.ts` is the minimal export needed for reuse (II, III); every story has tests written first (IV); logging is one pid line (V); documentation phase present (Documentation Deliverables).

## Unmapped Tasks

None reported. T024 (moving the previous feature's CLAUDE.md block into `CLAUDE_COMPLETE.md`) maps to the Documentation Deliverables section rather than an FR.

## Metrics

- Total Requirements: 15 (10 FR + 5 SC)
- Total Tasks: 25
- Coverage %: 100% (SC-005 partial)
- Ambiguity Count: 1
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

No CRITICAL issues; implementation may proceed. The one MEDIUM item (C1) is a missing negative assertion in T004; A1/I1/U1 are wording and test-authoring notes. `/speckit-analyze-findings` captures these next.
