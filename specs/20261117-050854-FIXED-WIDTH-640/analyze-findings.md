# Specification Analysis Report — specs/20261117-050854-FIXED-WIDTH-640

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261117-050854-FIXED-WIDTH-640 |
| Report created | 2026-11-17 053052 AM |
| Analysis captured | 2026-11-17 053052 AM |
| Last updated | 2026-11-17 053300 AM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **F1** · Inconsistency · MEDIUM · spec.md FR-019; plan.md Summary; research.md R6; breakpoints.md B4  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md plan.md requirements.md Updated: 2026-11-17 5:33 AM  
  **Notes**: Recommendation accepted in file 2026-11-17: Recommendation A, FR-019 in spec.md now says no viewport shows the older layout, its overridden rules are deleted and the rules the phone layout depends on remain; the AM2 bullet of requirements.md says the same (blocks re-labelled and kept, only dead declarations and the `--single-column` code deleted); plan.md Summary notes the correction.  

  FR-019 says the older single-column layout's "rules … no longer exist". The plan keeps most of those rules, re-labelled to 640 px, because the phone layout depends on them; only overridden declarations are deleted.  

  - **Recommendation A** _(recommended)_: Reword FR-019 to the outcome the plan delivers: no viewport shows the older layout, declarations the phone layout overrides are removed, and those it depends on remain as part of it.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: The spec then says what the code allows. The 480 px page stays unchanged by construction (research R3), and `single-column-m3.css` keeps the tab bar rules the wide layout uses up to 900 px. The requirements' Resolved Findings (AM2) are corrected the same way.  
    - <u>Cons</u>: The phone layout stays spread over the phone layers and the re-labelled older blocks, so two places must be read to understand it.  

  - **Recommendation B**: Keep FR-019 as written and change the plan: move every declaration the phone layout depends on from the older blocks into the phone layers, then delete the older blocks (and the two sheets' phone blocks) entirely.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: The phone layout is then wholly in the phone layers, and FR-019 is literally true.  
    - <u>Cons</u>: Moving declarations between sheets changes their order in the cascade, so the 480 px page is no longer unchanged by construction and must be re-verified element by element. It is a larger change than the feature needs, and the two sheets still cannot be deleted, since they hold rules used above 640 px.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · tasks.md T023, T030; breakpoints.md B1, B2  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md plan.md Updated: 2026-11-17 5:32 AM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-17: Recommendation, T023 and T030 now state the allowed form of a 640-only fix (a width-relative value first, otherwise one `(min-width: 480.02px) and (max-width: 640px)` block at the end of the owning phone layer, recorded in quickstart.md); plan.md Constraints says the same. contracts/breakpoints.md is outside the files this skill edits, so B2 is unchanged.  

  A defect fix must "leave the 480 px page's computed styles unchanged", but the phone layers are now one block serving both widths and B1/B2 allow no second query. The tasks do not say how a 640-only fix may be written.  

  - **Recommendation**: State the allowed form in B2 and the fix tasks: prefer a width-relative value that is identical at 480 px; otherwise a `(min-width: 480.02px) and (max-width: 640px)` block at the end of the owning phone layer, recorded in quickstart.md.  

    ➡️ [X] **Accepted**  
    - It gives the implementer one sanctioned way to fix a 640-only defect without touching the 480 px page, and keeps the "one phone boundary" guard meaningful by naming the single exception.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage gap · MEDIUM · spec.md FR-007, US1 scenario 9; quickstart.md §2, §4; tasks.md T022  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-17 5:32 AM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-17: Recommendation, T018 now asserts the content is exactly `width=640` (contract V5); T022 adds and checks a pinch-zoom item in quickstart §2.  

  Pinch zoom at the 640 px width is only checked on iOS (quickstart §4). No task or automated assertion covers it on other browsers, or asserts that `user-scalable` / `minimum-scale` are never written beside `width=640` (contract V5).  

  - **Recommendation**: Add a pinch-zoom item to quickstart §2 and a V5 assertion for `width=640` to T018.  

    ➡️ [X] **Accepted**  
    - FR-007 then has an automated check (the content written is exactly `width=640`, or with `maximum-scale` only on iOS) and a manual one on a non-iOS device.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · LOW · tasks.md T004  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-17 5:32 AM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-17: Recommendation, T004 now defines how the one 640 px query follows `phone` and `phoneLayout` and lists the nine test files that call the helper.  

  "Adjust the callers that passed the separate 480 flag" names no files.  

  - **Recommendation**: List the test files that call the `single-column-page.ts` helper with that flag.  

    ➡️ [X] **Accepted**  
    - The task becomes executable without a search; the files are found by grepping `tests/` for the helper's 480 option when the finding is resolved.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage gap · LOW · viewport.md V1 (last line); tasks.md T024  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-17 5:32 AM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-17: Recommendation, T024 now includes a case without `screen.orientation` (320 × 568, `window.orientation = 90` → `width=640`).  

  The `window.orientation` fallback (no `screen.orientation`) is in the contract but no new case exercises it for the 481–639 band.  

  - **Recommendation**: Add one fallback case (568 held, `window.orientation = 90` → `width=640`) to T024.  

    ➡️ [X] **Accepted**  
    - Older iOS versions take this path, and a small iPhone held sideways is the main iOS device in the new band.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · LOW · quickstart.md Prerequisites; tasks.md T002  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-17 5:32 AM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-17: Recommendation, T002 now says the feature branch `481-640px` before T012, not `main`, and corrects the quickstart Prerequisites line when it runs.  

  The quickstart says the "before" screenshots come from branch `main`; T002 says "the unchanged branch".  

  - **Recommendation**: Use one wording: the feature branch before T012.  

    ➡️ [X] **Accepted**  
    - The comparison must be against the code this feature starts from, and `main` may not hold the phone layout redesign that branch `481-640px` was cut from.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · LOW · plan.md "Phases for /speckit-tasks"; tasks.md Phases 2–3  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ plan.md Updated: 2026-11-17 5:32 AM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-17: Recommendation, the plan's phase list now puts the boundary before the viewport rule, as tasks.md does.  

  The plan lists the viewport rule before the boundary; the tasks do the boundary first (Foundational) and the viewport rule in US1.  

  - **Recommendation**: Reorder the plan's list to match the tasks; the tasks' order is the right one.  

    ➡️ [X] **Accepted**  
    - With the boundary first, a device given `width=640` never shows the wide layout in between.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C3** · Coverage gap · LOW · spec.md SC-004; tasks.md T027  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-17 5:32 AM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-17: Recommendation, T027 adds and checks "the layout follows each turn within one second, with no reload" in quickstart §3.  

  "Within one second" is never measured; T027 checks the turn but not its duration.  

  - **Recommendation**: Add "the layout follows within one second" to quickstart §3.  

    ➡️ [X] **Accepted**  
    - T027 already works through §3, so the check is made with no new task.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 fixed 640 for 481–639 | Yes | T018, T020, T021 | |
| FR-002 under 480 unchanged | Yes | T018, T021, T027 | |
| FR-003 exactly 480 / 640+ device width | Yes | T024, T026 | |
| FR-004 held width by orientation | Yes | T024, T025 | fallback case missing (C2) |
| FR-005 decided again, no reload | Yes | T025, T026, T027 | |
| FR-006 text enlargement, iOS guard | Yes | T018, T019, T020, T041 | |
| FR-007 pinch zoom | Partial | T041 | iOS only (C1) |
| FR-008 phone layout up to 640 inclusive | Yes | T003, T012–T014, T031 | |
| FR-009 same layout | Yes | T012, T022 | by construction (R3) |
| FR-010 same sizes | Yes | T012, T022 | |
| FR-011 content fills, 608 px | Yes | T022, T023, T028–T030 | |
| FR-012 every page | Yes | T022, T028, T029 | |
| FR-013 fixed header and tab bar | Yes | T022 | |
| FR-014 color schemes | Yes | T022, T028 | |
| FR-015 desktop window | Yes | T031, T032 | |
| FR-016 phone behaviours | Yes | T009, T015, T022, T029 | |
| FR-017 bars ordered by share | Yes | T017 | existing suites; no change |
| FR-018 Back unchanged | Yes | T017, T022 | existing suites |
| FR-019 older layout removed | Yes | T010, T016, T033–T037 | wording differs from plan (F1) |
| FR-020 boundaries moved consistently | Yes | T003, T005–T008, T013–T015 | |
| FR-021 unchanged widths | Yes | T002, T027, T037 | |
| FR-022 no server/storage change | Yes | T017 | no task touches them |
| FR-023 documents | Yes | T038–T040 | |
| SC-008 automated checks, table extended | Yes | T017, T018, T024, T041 | |

## Constitution Alignment Issues

None. Principle III ("do not remove pre-existing dead code unless asked") is met because the removal was asked for (finding AM2) and is bounded by contract B4. The post-implementation documentation phase is present (Phase 8).

## Unmapped Tasks

None. T001, T002, T011, T033 are baseline and verification steps.

## Metrics

- Total Requirements: 24 (23 FR + SC-008)
- Total Tasks: 41
- Coverage: 100% (24 of 24 with at least one task; FR-007 partial)
- Ambiguity Count: 0
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

- No CRITICAL or HIGH issue: implementation could proceed, but F1, U1 and C1 are worth settling first.
- F1 is the one to read: it is the plan's deviation from the requirements' "delete the older sheets" wording, now visible as a spec/plan mismatch.
