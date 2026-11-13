# Specification Analysis Report — specs/20261113-102117-ADMIN-SEARCH-RESULTS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261113-102117-ADMIN-SEARCH-RESULTS |
| Report created | 2026-11-13 014043 PM |
| Analysis captured | 2026-11-13 014043 PM |
| Last updated | 2026-11-13 021200 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · HIGH · spec.md FR-003, SC-001, Edge Cases; plan.md Summary; research.md R2  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md requirements.md Updated: 2026-11-13 2:12 PM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation A, FR-003 now gives the 840 px list, the 720 px threshold and the 420 px card; US1 scenario 8, the long-names edge case and SC-001 (1920 × 1080) follow; the requirements' Decisions (UA1) say the same.  

  The admin page is a centred 420 px column, where six facts cannot fit on one line. The plan widens the results list to `min(840px, 100%)` with one-line rows from 720 px; the spec says neither, and "desktop-width" is undefined.  

  - **Recommendation A** _(recommended)_: Record the plan's decision in the spec: the results list is up to 840 px wide in the Search view, a row is one line when the window is at least 720 px wide and two lines below, and the open card keeps its 420 px, centred under its row.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: Keeps the accepted requirement (one line on desktop) and SC-001 (15 results visible); plan, contract and tasks already describe it, so only the spec and the requirements' Decisions change.  
    - <u>Cons</u>: In the Search view the list is wider than the tabs, the search form and the open card, so the page is no longer one even column.  

  - **Recommendation B**: Keep the 420 px column: rows are two lines at every width (title, then the other facts); FR-003 says so and SC-001 drops to at least 10 results visible.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: The page stays one even column on every screen; one row layout instead of two; less CSS.  
    - <u>Cons</u>: Changes an accepted requirement (UA1, one line on desktop); fewer results per screen (about 11 on a 1080p screen instead of 15 or more); spec, plan, research, contract, tasks and the requirements' Decisions all change.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · MEDIUM · spec.md FR-002, Assumptions; research.md R4; contracts/ui.md U2  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md requirements.md Updated: 2026-11-13 2:12 PM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation, FR-002 and the Assumptions entry say the creator's user name, else the email; the requirements' Decisions (UA1) say the same.  

  The spec says the row shows "the same name the card's Created By field shows", which is `name (email)`; the plan shows the user name, or the email when there is none.  

  - **Recommendation**: Make the spec say the user name, else the email.  

    ➡️ [x] **Accepted**  
    - FR-002 and the Assumptions entry are reworded: the row shows the creator's user name, or the email address when the creator has no user name; the full `name (email)` stays on the card. The requirements' Decisions entry for UA1 is reworded the same way.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · MEDIUM · spec.md FR-013; research.md R10; tasks.md T008  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md requirements.md Updated: 2026-11-13 2:12 PM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation, FR-013 and its edge case carry the plan's rule (scroll to the top only when the row is not fully visible; never for a single result that opens by itself); the requirements' Decisions (UA2) say the same.  

  FR-013 says the page scrolls "only as far as needed to bring the row to the top"; the plan scrolls only when the row is not fully visible, and then to the top under the fixed header. No scroll for a single result that opens by itself is only in the plan.  

  - **Recommendation**: Reword FR-013 to the plan's rule.  

    ➡️ [x] **Accepted**  
    - FR-013 becomes: when the administrator opens a row and the row is not fully inside the visible area afterwards, the page scrolls the row to the top of the visible area, below the fixed header; otherwise the page does not scroll; a single result that opens by itself does not scroll. The matching Edge Case and the requirements' Decisions entry for UA2 are reworded the same way.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage gap · MEDIUM · spec.md FR-034; tasks.md T004  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-13 2:12 PM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation, T004 asserts no invitees request after the search and one after the row opens (FR-034).  

  No test asserts that the invitees request is made only when a row opens; it is checked by hand only (quickstart step 2).  

  - **Recommendation**: Add the assertion to T004: no `/invitees` request after the search, one after opening an invitation-only poll's row.  

    ➡️ [x] **Accepted**  
    - T004 gains a case with an invitation-only poll among the results, recording the page's `fetch` calls: none to `/api/admin/polls/<pid>/invitees` after the search, at least one after its row is opened.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage gap · MEDIUM · spec.md SC-003; quickstart.md; tasks.md T024  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ quickstart.md tasks.md Updated: 2026-11-13 2:12 PM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation, quickstart.md gains step 17 (200 results) and T024 walks steps 1–17.  

  SC-003 is measured "with 200 results", but the quickstart asks for 20 polls and no task draws 200.  

  - **Recommendation**: Add a quickstart step with 200 results and name it in T024.  

    ➡️ [x] **Accepted**  
    - quickstart.md gains step 17: with at least 200 polls, an empty search shows 200 rows (or the cut-off message), opening a row shows its card with no perceptible wait, and the page does not jump across several refreshes. T024 walks steps 1–17. quickstart.md is a plan artifact of this feature; it is edited as plan.md's companion.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · LOW · spec.md FR-002; contracts/ui.md U2  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md requirements.md Updated: 2026-11-13 2:12 PM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation, FR-002 gives "1 voter" for one; the requirements' Decisions (UA1) say the same.  

  FR-002 says "N voters"; the contract adds "1 voter" for one.  

  - **Recommendation**: Add the singular to FR-002.  

    ➡️ [x] **Accepted**  
    - FR-002 reads: its voter count as "N voters" ("1 voter" for one). The requirements' Decisions entry for UA1 gains the same words.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · LOW · tasks.md T012  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-13 2:12 PM  
  **Notes**: Recommendation accepted in file 2026-11-13: Recommendation, T012 adds the two `:disabled` rules unconditionally.  

  "…the same for the Search and Clear buttons if they have none" leaves the implementer to decide.  

  - **Recommendation**: State it unconditionally: add the two `:disabled` rules, scoped to the search panel.  

    ➡️ [x] **Accepted**  
    - T012 names the two rules, `.admin-search .admin-search-btn:disabled` and `.admin-search .admin-search-clear:disabled`, with the same disabled opacity and `cursor:default` as the rows.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001–FR-007 (the row) | Yes | T002, T003, T007, T009 | I1, I2, I3 |
| FR-008–FR-011 (open/close) | Yes | T004, T008 | |
| FR-012, FR-014, FR-023 (fresh loads) | Yes | T005, T009, T013, T015 | |
| FR-013 (scroll) | Yes | T008, T019, T024 | by hand only (jsdom); A1 |
| FR-015–FR-018 (held) | Yes | T010, T011, T012 | U1 |
| FR-019–FR-022 (refresh) | Yes | T013, T015 | |
| FR-024–FR-026 (count, collapse) | Yes | T006, T009, T014, T016 | |
| FR-027–FR-030 (accessibility, look) | Yes | T017, T018, T019, T024 | |
| FR-031–FR-033 (scope) | Yes | T003, T020, T021 | |
| FR-034 (invitees on open) | Yes | T008 | no automated test; C1 |
| SC-003 (200 results) | Partly | T024 | C2 |

## Constitution Alignment Issues

None. The documentation phase (T022, T023) is present, and the tests precede their implementation tasks.

## Unmapped Tasks

None.

## Metrics

- Total Requirements: 34 functional, 7 success criteria
- Total Tasks: 24
- Coverage: 100% of functional requirements have at least one task
- Ambiguity Count: 1
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

No critical issue blocks `/speckit-implement`, but I1 should be decided first: it changes the row's layout, FR-003 and SC-001.
