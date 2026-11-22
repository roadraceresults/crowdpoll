# Specification Analysis Report — specs/20261120-175903-COLOR-CONTRAST

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261120-175903-COLOR-CONTRAST |
| Report created | 2026-11-20 074229 PM |
| Analysis captured | 2026-11-20 074229 PM |
| Last updated | 2026-11-20 080903 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **F1** · Inconsistency · HIGH · spec.md:191 (FR-001), spec.md:279 (SC-007), spec.md US2 scenario 4; research.md R7; tasks.md T014, T018  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md plan.md research.md Updated: 2026-11-20 8:08 PM  
  **Notes**: Recommendation accepted in file 2026-11-20: Recommendation A, 7:1 on tracks and vote rows, 4.5:1 on a bar's fill (black or white): spec.md FR-001, SC-007, US2 scenario 4, the measured-baseline sentence and the clarification note now say so; plan.md Spec follow-ups and research.md R7 record it as accepted.  

  The spec asks 7:1 for result-bar labels "on what they sit on", which includes the fill; the plan and tasks hold 4.5:1 on a fill and 7:1 only on tracks. 7:1 on a fill that is also 3:1 from a white card is impossible for mid-tone colours, so the plan is right and the spec is not.  

  - **Recommendation A** _(recommended)_: Amend FR-001, SC-007 and US2 scenario 4: 7:1 on tracks and vote rows, 4.5:1 on a bar's fill (black or white).  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: achievable for every colour (black or white always gives at least 4.58:1); meets WCAG AA; keeps the bars colourful.  
    - <u>Cons</u>: text on a fill is held to a lower bar than text on a track; orange, red, pink, dodgerblue and lightseagreen bars switch to black text.  

  - **Recommendation B**: keep 7:1 on fills too, and darken (Light) or lighten (Dark) each fill until black or white reaches 7:1.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: one 7:1 rule for all bar text.  
    - <u>Cons</u>: in Light every mid-tone fill becomes near-black (luminance ≤ 0.1), so orange turns brown and blues turn navy, against the "colourful" goal; bars and lines would drift apart unless the graph follows.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **F2** · Underspecification · MEDIUM · research.md R6; data-model.md Palette; tasks.md T015; spec.md:275 (SC-004)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md plan.md research.md Updated: 2026-11-20 8:08 PM  
  **Notes**: Recommendation accepted in file 2026-11-20: Recommendation A, palette replacements specified: spec.md gains FR-022 (no two base palette colours closer than ΔE 13 after the lift, in either scheme), an edge case naming the three replacements, and SC-004 notes them; plan.md Spec follow-ups and research.md R6 record it as accepted.  

  The plan replaces three palette colours (coral, darkslategray, gray) because the lift makes them collide; the spec never mentions changing the palette, and SC-004 counts "all fourteen palette colours" as if unchanged.  

  - **Recommendation A** _(recommended)_: Add an FR: after the lift, no two palette colours may look alike in either scheme (ΔE rule); record the three replacements in the spec's Edge Cases.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: two choices of one poll never look the same; the spec states what the plan does.  
    - <u>Cons</u>: three familiar palette colours change in both schemes.  

  - **Recommendation B**: keep the palette as it is, drop T015, and accept that coral ≈ orange-red in Light and black = darkslategray ≈ gray in Dark.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no palette change.  
    - <u>Cons</u>: a poll that draws those neighbours shows two identical bars, against "options easily distinguishable".  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **F3** · Coverage gap · MEDIUM · spec.md (option definition, FR-002, FR-016); research.md R9; tasks.md T025, T028  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md research.md tasks.md Updated: 2026-11-20 8:06 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-20: Recommendation, admin list rows: spec.md option definition now says an admin row has no edge (alternating tones, expanded panel, focus outline carries FR-002); research.md R9 gains an Admin list rows bullet with its pairs; tasks.md T025 adds those pair rows.  

  The spec names "admin list rows" as options, but R9's audit and T025's pair rows cover only the admin search field and admin radios; the admin list rows' edges are neither audited nor listed.  

  - **Recommendation**: Add the admin list row's edge or divider to R9 and a pair row in T025 (or state it has no edge and why that is acceptable).  

    ➡️ [X] **Accepted**  
    - Closes the one named option the plan does not check.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **F4** · Coverage gap · MEDIUM · spec.md Edge Cases (hover and keyboard focus, 3:1)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md quickstart.md Updated: 2026-11-20 8:06 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-20: Recommendation, adapted: vote rows take no keyboard focus today (no tabindex, no :focus-visible rule), so tasks.md T012 checks whether a row can take focus and, if it can, adds the focus-outline pair rows (≥ 3 on both row states); quickstart.md step 2 checks it by eye.  

  No task checks the vote row's focus indicator against the new amber and outline colours.  

  - **Recommendation**: Add a pair row (focus ring on `--choice-unselected` and on `--choice-selected` ≥ 3) to T008, and a step to quickstart step 2.  

    ➡️ [X] **Accepted**  
    - Keyboard users keep a visible focus on both row states.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **F5** · Coverage gap · MEDIUM · spec.md Edge Cases (disabled vote row)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md quickstart.md Updated: 2026-11-20 8:06 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-20: Recommendation, tasks.md T012 now checks a disabled vote row (edge and selected look kept, label ≥ 4.5:1 or marked disabled); quickstart.md step 2 closes the poll and checks it by eye.  

  The edge case "disabled row keeps its edge … text meets 4.5:1 or is marked disabled" has no task or test.  

  - **Recommendation**: Add it to T012 (check the disabled rule) and to quickstart step 2.  

    ➡️ [X] **Accepted**  
    - The edge case gets a check; no new rule unless the check fails.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **F6** · Inconsistency · MEDIUM · CLAUDE.md invariant "M3 layers hold only M3 tokens"; tasks.md T011, T019, T027; contracts/colors.md C3  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ contracts/colors.md tasks.md Updated: 2026-11-20 8:06 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-20: Recommendation, contracts/colors.md C3 now says the aliases of m3-tokens.css and the per-row --bar-* properties count as tokens for the M3-layer invariant; tasks.md T007 confirms tests/m3-assets.test.ts accepts them.  

  T011, T019 and T027 make M3 layers read app aliases (`--choice-selected`, `--bar-fill`, `--paper`); `pollCard-m3.css` already reads `--ink` and `--bar-track`, but whether the invariant allows it is not stated, and `m3-assets.test.ts` may enforce it.  

  - **Recommendation**: State in C3 that the aliases set in `m3-tokens.css` count as tokens, and confirm `m3-assets.test.ts` accepts them (add to T007).  

    ➡️ [X] **Accepted**  
    - Makes the existing precedent explicit and catches a test conflict before implementation.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **F7** · Inconsistency · LOW · data-model.md alias table (`--track` Light `#DFE4DD`); tasks.md T002 (`#DDE1D6`)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-20 8:06 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-20: Recommendation, tasks.md T026 also sets the Light --track to var(--md-sys-color-surface-container-highest), as data-model.md lists.  

  The data model gives a new Light `--track`, but no task changes it from today's value.  

  - **Recommendation**: Set it in T026, or mark it unchanged in the data model; it is only a fallback behind `--bar-track`.  

    ➡️ [X] **Accepted**  
    - Will be applied as: T026 also sets the Light `--track` to `var(--md-sys-color-surface-container-highest)`.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **F8** · Ambiguity · LOW · spec.md:202 (FR-004) "slightly deeper than today"  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-20 8:06 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-20: Recommendation, spec.md FR-004 now reads "a neutral fill one tone further from the card than today".  

  "Deeper" in Dark means lighter (`#262B27` → `#313631`); the word reads as darker.  

  - **Recommendation**: Reword: "a neutral fill one tone further from the card than today".  

    ➡️ [X] **Accepted**  
    - Reads correctly in both schemes.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **F9** · Ambiguity · LOW · data-model.md Palette rule; tasks.md T014 (ΔE 14)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ data-model.md research.md tasks.md Updated: 2026-11-20 8:06 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-20: Recommendation, the ΔE threshold is 13 (one below today's closest pair, 14.0) in data-model.md (Palette rule), research.md R6 and tasks.md T014.  

  Today's closest intended pair (teal/lightseagreen) is exactly 14.0, so a threshold of 14 is fragile to rounding.  

  - **Recommendation**: Use 13, or "no pair closer than today's closest".  

    ➡️ [X] **Accepted**  
    - Will be applied as: ΔE 13 in the data model, research R6 and T014.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **F10** · Coverage gap · LOW · spec.md:242 (FR-017)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-20 8:06 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-20: Recommendation, tasks.md T030 now confirms src/public/colorScheme.js is unchanged against main (FR-017).  

  No task confirms the device appearance setting stays unread and no third scheme is added.  

  - **Recommendation**: Add to T030: `colorScheme.js` unchanged (`git diff main`).  

    ➡️ [X] **Accepted**  
    - A one-line check closes the last uncovered requirement.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **F11** · Underspecification · LOW · tasks.md T013  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-20 8:06 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-20: Recommendation, tasks.md T013 now names the seven client test files that render vote rows.  

  `npx vitest run -t "vote"` is a vague filter that may match nothing or too much.  

  - **Recommendation**: Name the client vote test files.  

    ➡️ [X] **Accepted**  
    - The run is reproducible.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 | Yes | T008, T014, T018, T025 | conflicts with R7 (F1) |
| FR-002 | Yes | T008, T025, T028 | admin list rows missing (F3) |
| FR-003 | Yes | T008, T011, T025 | |
| FR-004 | Yes | T009, T010 | |
| FR-005 | Yes | T009, T011 | |
| FR-006 | Yes | T011, T012 | |
| FR-007 | Yes | T014, T016 | |
| FR-008 | Yes | T020, T022 | |
| FR-009 | Yes | T014, T017 | |
| FR-010 | Yes | T016 | |
| FR-011 | Yes | T004, T025, T026, T027 | |
| FR-012 | Yes | T005, T006, T030 | |
| FR-013 | Yes | T029, T030 | |
| FR-014 | Yes | T030 | |
| FR-015 | Yes | implicit (T009, T026) | permissive |
| FR-016 | Yes | T028 | by eye + pair rows |
| FR-017 | Partial | — | F10 |
| FR-018 | Yes | T005, T031 | |
| FR-019 | Yes | T032 | |
| FR-020 | Yes | T006, T014, T033 | |
| FR-021 | Yes | T021, T022, T023 | |
| SC-001 – SC-007 | Yes | T006–T033 | automated |
| SC-008 | Yes | T037 | tester review |

## Constitution Alignment Issues

None reported. VI (comments only for external links) is respected (T006, Notes); Documentation Deliverables — `ARCHITECTURE.md` after implementation (T034).

## Unmapped Tasks

None reported. T001, T007, T036, T037 are verification tasks.

## Metrics

- Total Requirements: 29 (21 FR + 8 SC)
- Total Tasks: 37
- Coverage: 97% (28/29 with ≥ 1 task; FR-017 implicit)
- Ambiguity Count: 2 (F8, F9)
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

- No CRITICAL issues. F1 (HIGH) should be settled before `/speckit-implement`: it decides what the bar test asserts.
- F2–F6 (MEDIUM) are spec/task additions, each a small edit to `spec.md` or `tasks.md`.
- Suggested: `/speckit-analyze-findings` to record and resolve them one at a time or all at once.
