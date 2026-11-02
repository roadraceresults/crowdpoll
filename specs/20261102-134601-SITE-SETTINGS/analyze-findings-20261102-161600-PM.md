# Specification Analysis Report — specs/20261102-134601-SITE-SETTINGS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261102-134601-SITE-SETTINGS |
| Report created | 2026-11-02 032303 PM |
| Analysis captured | 2026-11-02 032303 PM |
| Last updated | 2026-11-02 041500 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **U1** · Underspecification · MEDIUM · contracts/ui-contracts.md C2, C3, C4; research.md R4, R7  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ contracts/ui-contracts.md research.md tasks.md Updated: 2026-11-02 4:09 PM  
  **Notes**: Recommendation accepted in file 2026-11-02: Recommendation A, the pending choice wins while a save is in flight or queued;  
  C2 adds `ColorScheme.setSaving(flag)`, and the session subscription skips applying while it is set; C4 sets and clears it, and gains step 5 (pending choice wins); research.md R7 records it;  
  tasks.md T008 adds `setSaving`, T026 adds the mid-save snapshot test, and T027 sets and clears the flag.  

  Two code paths can overwrite a choice that is still saving: `colorScheme.js` applies every new session snapshot, and C3 keeps the Settings radios in step with the session.  
  If a different snapshot arrives while a save is in flight or queued (e.g. another tab saved, or the window regained focus after the server was written), the page and radio can flip away from the user's pending choice.  
  C4 does not say which wins.  

  - **Recommendation A** _(recommended)_: Add to C4: while a save is in flight or queued, `settingsCard.js` ignores session updates for its radio, and `colorScheme.js` leaves the page alone. The `Session.refresh()` after the last save reconciles both. Add a test to T026.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the user's latest choice always stays on screen until the server has answered; one rule for both code paths; testable.  
    - <u>Cons</u>: `ColorScheme` needs a "save pending" flag that `settingsCard.js` sets and clears.  

  - **Recommendation B**: Leave the design as it is and record in C4 that the last session snapshot wins.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no new state.  
    - <u>Cons</u>: a brief flip back to the old scheme is possible while a save is pending, and the queued choice is still sent, so the page can disagree with what is stored until the next refresh.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · MEDIUM · tasks.md T030; CLAUDE.md invariant "M3 layers hold only M3 tokens"  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-02 3:50 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-02: Recommendation; T030 now fixes M3 layers by token reference only, and allows literal colours with a dark rule only in the production sheets.  

  T030 allows a literal colour plus a `:root[data-theme="dark"]` rule "in the sheet that owns the colour", which can be an M3 layer.  
  That conflicts with the project rule that M3 layers hold only M3 tokens.  

  - **Recommendation**: Reword T030: in an M3 layer, fix only by token reference. Literal colours plus dark overrides are allowed only in the production sheets (`site.css`, `pollCard.css`, `tabs.css`, `styles.css`, `admin.css`).  

    ➡️ [X] **Accepted**  
    - Keeps the audit's fixes inside the project's sheet rules, so `m3-assets.test.ts` and the layering stay valid.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · LOW · research.md R3; contracts/ui-contracts.md C2; tasks.md T009  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ research.md Updated: 2026-11-02 3:50 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-02: Recommendation; R3 now places the head script as the first `<script>` in `<head>`, before `/fonts/fonts.css` and every other stylesheet, as C2 and T010 do.  

  R3 places the head script "as the first element after the viewport meta"; C2 and T009 place it as "the first `<script>`, before `/fonts/fonts.css`".  

  - **Recommendation**: Align R3 with C2: the first `<script>` in `<head>`, before every stylesheet.  

    ➡️ [X] **Accepted**  
    - One placement rule, the one T010's test enforces.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · LOW · contracts/ui-contracts.md C1  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ contracts/ui-contracts.md Updated: 2026-11-02 3:50 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-02: Recommendation; C1 now reads "The gear is exposed as `window.SiteGlyphs = { settings: SETTINGS_GLYPH }`".  

  "Both glyphs are exposed as `window.SiteGlyphs = { settings: SETTINGS_GLYPH }`", but only the gear is exposed, which is all C3 needs.  

  - **Recommendation**: Change to "The gear is exposed as …".  

    ➡️ [X] **Accepted**  
    - The contract then says what the code does.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage Gap · LOW · spec.md SC-002, Edge Cases; tasks.md T013  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-02 3:50 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-02: Recommendation; T013 now asserts that `data-theme` changes in the same task as the `change` event (SC-002) and that re-selecting the checked radio sends no PATCH.  

  SC-002 (visible within 100 ms) has no explicit check; T013 asserts only that the attribute is set synchronously.  
  The edge case "selecting the scheme already selected sends nothing" has no test.  

  - **Recommendation**: In T013, assert that `data-theme` changes in the same task as the `change` event (which meets SC-002), and that re-selecting the checked radio sends no PATCH.  

    ➡️ [X] **Accepted**  
    - Both are covered by assertions in a test that already exists, at no extra cost.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C2** · Constitution / Ordering · LOW · tasks.md T009, T010  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-02 3:50 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-02: Recommendation; T009 is now the failing placement test and T010 the page edit that makes it pass; the Parallel Opportunities line follows.  

  T010 writes the head-script placement test after T009 makes the edit, against "Tests … written before the change they cover".  

  - **Recommendation**: Swap them: T010 writes the failing test first, then T009 makes it pass.  

    ➡️ [X] **Accepted**  
    - Restores test-first ordering; the task ids stay as they are and only their order and wording change.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **P1** · Parallelism · LOW · tasks.md T016, T021; Dependencies section  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-02 3:50 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-02: Recommendation; Parallel Opportunities now notes that T016 and T021 both edit `tests/m3-assets.test.ts`.  

  T016 (US1) and T021 (US2) both edit `tests/m3-assets.test.ts`, and the plan runs US1 and US2 side by side.  

  - **Recommendation**: Note it under Parallel Opportunities, or move T021's check next to T010 in Phase 2.  

    ➡️ [X] **Accepted**  
    - The note warns of the shared file without reordering the stories.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · LOW · tasks.md T014; spec.md US3  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-02 4:15 PM  
  **Notes**: Recommendation accepted in file 2026-11-02: Developer Resolution C, the new Poll Administration icon (three rows, each with a checked box at the left, in a dark circle like the gear), applied as "build the icon in US1" after the developer confirmed that reading;  
  tasks.md moves T024 and T025 into Phase 3 right after T014 (labelled [US1]) and adds the icon description to T025;  
  T014 says the gear stays on Poll Administration only until T025; Phase 5 now holds no task of its own;  
  the Dependencies and Implementation Strategy sections follow;  
  spec.md FR-003 and contract C1 already describe this icon, so they did not change.  

  Between T014 and T025, Poll Administration and Site Settings share the gear, which US3 says must not happen.  
  It is acceptable only as an interim state.  

  - **Recommendation A** _(recommended)_: Note in the Implementation Strategy that the MVP ships only together with US3.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no task moves; the phases stay one per story.  
    - <u>Cons</u>: the MVP cannot be released alone.  

  - **Recommendation B**: Move T024–T025 into US1, so the MVP never shows two gears.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the MVP is releasable on its own.  
    - <u>Cons</u>: US3 is left with no tasks, and the phase-per-story layout breaks.  

  - **Developer Resolution C**:  

    ➡️ [x] **Accepted**  
    - The new icon for "Poll Administration" will be created from the image in:  
![poll admin icon](dontTrack/poll-admin-icon.jpg)   
It is three rows with a checked box to the left of each.  
It will be in a dark colored circle the same as the gear icon does now.  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 menu item, every signed-in user | Yes | T013, T014 | |
| FR-002 gear for Site Settings | Yes | T014 | |
| FR-003 checklist icon | Yes | T024, T025 | |
| FR-004 icons follow the scheme | Yes | T024, T025 | |
| FR-005 `/settings` guarded | Yes | T015 | |
| FR-006 card layout | Yes | T013, T016, T018 | |
| FR-007 radio group | Yes | T013, T017, T018 | |
| FR-008 apply at once, no Save button | Yes | T013, T018 | |
| FR-009 failure revert, `401` | Yes | T026, T027 | |
| FR-010 Light default | Yes | T021–T023 | |
| FR-011 every page, admin unpinned | Yes | T019 | |
| FR-011a contrast audit | Yes | T028–T030 | |
| FR-012 first paint from the copy | Yes | T008–T010, T012 | |
| FR-013 privacy row | Yes | T011 | |
| FR-014 other tabs and devices | Yes | T026, T027 | |
| FR-015 Logout or no session → Light | Yes | T012 | |
| FR-016 line graph | Yes | T020 | |
| FR-017 values validated | Yes | T002, T003, T006 | |
| FR-018 returned with `/api/me` | Yes | T004, T005 | |
| FR-019 removed with the account | Yes | T002 | |
| FR-020 API description | Yes | T007 | |
| SC-002 within 100 ms | Partial | T013 | See C1 |
| SC-003 no flash | Yes | T010, T034 | |
| SC-006 failure within 1 s | Yes | T026 | |
| SC-007 zero AA failures | Yes | T028–T030 | |

## Constitution Alignment Issues

None critical. C2 is a minor departure from test-first ordering.

## Unmapped Tasks

None. T001, T031–T034 are setup and polish.

## Metrics

- Total requirements: 25 (21 FRs and the 4 SCs that need building work)
- Total tasks: 34
- Coverage: 100% (SC-002 partial)
- Ambiguity count: 0
- Duplication count: 0
- Critical issues: 0

## Next Actions (as reported)

No issue is critical. The two MEDIUM issues are worth fixing before `/speckit-implement`:
- U1: say which wins between a pending save and an incoming session update.
- I1: keep contrast fixes in M3 layers to tokens.

The LOW issues are tidy-ups to the artifacts.
