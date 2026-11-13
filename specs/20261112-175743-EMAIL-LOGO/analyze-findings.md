# Specification Analysis Report — specs/20261112-175743-EMAIL-LOGO

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261112-175743-EMAIL-LOGO |
| Report created | 2026-11-12 061535 PM |
| Analysis captured | 2026-11-12 061535 PM |
| Last updated | 2026-11-12 063531 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **D1** · Constitution · CRITICAL · tasks.md:L97-105, constitution "Governance"  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-12 6:35 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation, added T018 (check `README.md` after implementation) to Phase 6 of tasks.md and listed it in the dependency and parallel notes.  

  The constitution's governance section says every task list MUST have a post-implementation documentation phase covering **both** deliverables; Phase 6 has `ARCHITECTURE.md` (T014) but no task for `README.md`.  

  - **Recommendation**: Add a Polish task: check `README.md` after implementation and update it if it describes the email logo (expected: no change, research R7; the task records that).  

    ➡️ [x] **Accepted**  
    - The task list then covers both deliverables, as the constitution requires, at the cost of one short check.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C1** · Inconsistency · HIGH · tasks.md:L78 (T011), research.md:L60-62  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md Updated: 2026-11-12 6:35 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation, T011 in tasks.md now expects `topLeftAlpha(og-image.png)` to throw "The email logo is not an 8-bit RGBA PNG"; research.md R4 says the same.  

  T011 expects `topLeftAlpha` to read 255 from `src/public/og-image.png`, but that file is **8-bit RGB** (colour type 2): `topLeftAlpha` throws "not an 8-bit RGBA PNG", so the test as written would fail.  

  - **Recommendation**: In T011, expect `topLeftAlpha(og-image.png)` to throw "The email logo is not an 8-bit RGBA PNG"; correct research R4 accordingly.  

    ➡️ [x] **Accepted**  
    - The test then exercises the format refusal with a real committed file instead of failing on it.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · MEDIUM · tasks.md:L51 (T002)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-12 6:35 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation, T002 in tasks.md now says it fails until T004.  

  T002 says the new test "fails until T003", but T003 edits the fixture; the test passes only after T004 changes `templates.ts`.  

  - **Recommendation**: Change "fails until T003" to "fails until T004".  

    ➡️ [x] **Accepted**  
    - A one-word correction to the task's cross-reference.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · LOW · research.md:L74-76, tasks.md:L93 (T013)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ research.md Updated: 2026-11-12 6:35 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation, research.md R6 now says line 7 changes and the Google and Microsoft steps only name the file and stay as they are.  

  Research R6 says to update line 7 **and** the Google and Microsoft steps of `provider-setup.md`; T013 changes line 7 only and leaves the steps (which only name the file, so need no change).  

  - **Recommendation**: Reword R6 to "line 7; the steps only name the file and stay as they are".  

    ➡️ [x] **Accepted**  
    - Research and tasks then say the same thing; no change to the work.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · LOW · spec.md:L112 (FR-007), plan.md:L13, contracts/email-logo.md:L25  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-12 6:35 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation A, FR-007 in spec.md now also refuses an image that is not an RGBA image.  

  The plan and contract C2 add a third refusal ("not an 8-bit RGBA PNG") that FR-007 does not list; FR-007 names only the size and transparency refusals.  

  - **Recommendation A** _(recommended)_: Add "or is not an RGBA image" to FR-007.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the spec lists every refusal the command makes; T011 (after C1) tests it.  
    - <u>Cons</u>: a technical detail enters the spec.  

  - **Recommendation B**: Leave FR-007 as it is; treat the format check as a technical precondition of the transparency check.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the spec stays free of image-format detail.  
    - <u>Cons</u>: the contract refuses a case the spec does not mention.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **G1** · Coverage · LOW · spec.md:L137 (SC-003), tasks.md:L79 (T012)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-12 6:35 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation, T012 in tasks.md now also compares the logo side by side with the site header and `og-image.png` (SC-003).  

  SC-003 asks for a side-by-side look at the email header, the site header and a link preview; T012 reviews the email only.  

  - **Recommendation**: Extend T012: also compare with the site header and `og-image.png`.  

    ➡️ [x] **Accepted**  
    - SC-003 then has a task that verifies it, in the review step that already exists.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **G2** · Coverage · LOW · spec.md US2 scenario 2, tasks.md T008-T011  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-11-12 6:35 PM  
  **Notes**: Recommendation accepted in file 2026-11-12: Recommendation A, accept as is; no file needed to change.  

  No task runs a rendering that should be refused: the detection is unit-tested (T011), the refusal path in `main` is not.  

  - **Recommendation A** _(recommended)_: Accept as is: the script needs a browser, and the favicon's checks have the same gap.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: no extra work; the detection that decides the refusal is tested.  
    - <u>Cons</u>: the throw-and-stop wiring in `main` is checked only by reading it.  

  - **Recommendation B**: Add a manual check to T010: point the email logo at `og-image.png`'s page once, confirm the refusal message and that `email-logo.png` is not written, then revert.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the refusal path is seen to work once.  
    - <u>Cons</u>: a temporary code edit during implementation.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 every email | Yes | T004, T003, T005 | |
| FR-002 bubble colours | Yes | T007, T012 | inherits `og-logo.svg` |
| FR-003 from the link-preview master | Yes | T006, T007 | |
| FR-004 56 × 56, alt and alignment | Yes | T002, T004 | |
| FR-005 168 × 168, transparent | Yes | T007, T008, T011 | |
| FR-006 same address | Yes | T002, T005 | |
| FR-007 refusals | Yes | T008 | see U1, G2 |
| FR-008 favicon and preview image unchanged | Yes | T006, T010 | |
| FR-009 provider-setup.md | Yes | T013 | see I2 |
| FR-010 architecture and developer docs | Yes | T014, T015 | |
| FR-011 visual review | Yes | T012 | |
| SC-001 seven email kinds | Yes | T004, T005 | |
| SC-002 three pixels per displayed pixel | Yes | T007, T011 | |
| SC-003 same mark in three places | Partial | T012 | see G1 |
| SC-004 one command | Yes | T010 | |
| SC-005 no favicon change | Yes | T010 | |

## Constitution Alignment Issues

D1 — the missing `README.md` documentation task.

## Unmapped Tasks

None (T001, T016, T017 are the baseline and final verification).

## Metrics

- Total Requirements: 16 (11 FR, 5 SC)
- Total Tasks: 17
- Coverage: 100% with at least one task (SC-003 partial)
- Ambiguity Count: 0
- Duplication Count: 0
- Critical Issues Count: 1

## Next Actions (as reported)

- Resolve D1 before `/speckit-implement`: one added Polish task in `tasks.md`.
- Fix C1 before implementing: T011 as written would add a failing test.
- I1, I2, U1, G1, G2 are small wording fixes in `tasks.md`, `research.md` and `spec.md`.
