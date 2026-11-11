# Specification Analysis Report — specs/20261111-091956-FOOTER-LINKS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261111-091956-FOOTER-LINKS |
| Report created | 2026-11-11 124151 PM |
| Analysis captured | 2026-11-11 124151 PM |
| Last updated | 2026-11-11 1:34 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · HIGH · spec.md:L105 (Edge Case "The session ends while away") vs spec.md:L120 (FR-004), plan.md research R5  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-11 1:34 PM  
  **Notes**: Recommendation accepted in file 2026-11-11: Recommendation A, reworded the "session ends while away" edge case in spec.md: Trending shows, no login prompt, the address reads `/?tab=trending`, the bookmark or link still names the tab.  

  The edge case says a guest's logged-in tab address "stays in the address bar and is honoured again after the next login"; FR-004 and clarification Q1 say the address always names the tab shown, so the plan rewrites it to `/?tab=trending`. The login flow always returns to `/`, so the stale address could never be honoured.  

  - **Recommendation A** _(recommended)_: Reword the edge case: "a return to a logged-in tab shows Trending, with no login prompt, and the address reads `/?tab=trending`; the bookmark or link the visitor came from still names the tab for after they log in."  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: One rule for the address, as clarification Q1 decided; the spec, the plan (R5) and the tests (T009) already agree with it.  
    - <u>Cons</u>: A visitor who logs in from the fallback lands on Home, not on the tab their session lost; the login flow returns to `/` today anyway.  

  - **Recommendation B**: Keep the edge case and exempt the guest fallback from FR-004: when a personal tab in the address falls back to Trending, the address is left as it was; change plan.md R5 and tasks T009/T011 so `select` skips the address write for that one fallback.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: The address bar keeps the tab the visitor had, for a reload after they log in from that very page.  
    - <u>Cons</u>: Reverses the clarification's "one rule, no exception"; the address then names a tab that is not showing, and the login flow still returns to `/`, so the kept address is honoured only if the visitor reloads it themselves.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · spec.md:L125 (FR-009), spec.md:L58–59, plan.md research R3  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-11 1:34 PM  
  **Notes**: Recommendation accepted in file 2026-11-11: Recommendation A, FR-009 in spec.md now says the terms are in the address only when the visitor arrived with them and a search made on the page does not add them.  

  FR-009 says the tab name "MUST coexist with the search terms" while Search shows, but the spec never says whether a search made on the page itself writes its terms into the address. The plan decides it does not (the terms are in the address only when they arrived there, as today), so a reload after an in-page search shows an empty Search tab.  

  - **Recommendation A** _(recommended)_: State it in FR-009: "the terms are in the address only when the visitor arrived with them; a search made on the page does not add them."  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: Matches the plan (R3) and today's behaviour; no extra code or test.  
    - <u>Cons</u>: A reload while on the Search tab after an in-page search shows an empty Search tab (today it shows Home, so nothing is lost).  

  - **Recommendation B**: Decide the opposite: the Search tab writes its terms into the address on every search (`q` set by `SearchTab.submit`, removed by `clear`); add it to plan.md R3, contracts C2, tasks T011 and T009.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: A reload or a return to the Search tab shows the same results; the address is a complete description of the page.  
    - <u>Cons</u>: More scope than the requirements asked for; every keystroke-and-Enter rewrites the address, and the search re-runs on each reload (a request the floors may refuse).  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage · MEDIUM · spec.md:L124 (FR-008), tasks.md T009  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-11 1:34 PM  
  **Notes**: Recommendation accepted in file 2026-11-11: Recommendation, T009 in tasks.md gains the case: after maximizing a Trending card a fresh `/?tab=trending` shows the list with no visible maximized card.  

  FR-008 (a fresh load restores the tab, not a maximized card) relies on the design (nothing stores the card) but T009 has no case for it.  

  - **Recommendation**: Add to T009: maximize a Trending card, then open `/?tab=trending` afresh: the tab shows with its list and no `.maximized-card-grid` visible.  

    ➡️ [X] **Accepted**  
    - FR-008 gets a test of its own, so a later change that stores the card in the address would be caught.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **T1** · Constitution scope · LOW · tasks.md T013, src/public/tabs.js:L1288  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-11 1:34 PM  
  **Notes**: Recommendation accepted in file 2026-11-11: Recommendation, T013 in tasks.md now drops the FIX013 comment in the rewritten region and names the branch clearly.  

  T013 rewrites the end of `init()`, the region holding the `// FIX013: arriving from another page's search box…` comment that cites a fix id; the constitution's Governance clause brings comments in the changed region into line with Principle VI.  

  - **Recommendation**: Add to T013: drop the FIX013 comment in the rewritten region (and name the branch clearly, e.g. `searchFromAddress`).  

    ➡️ [X] **Accepted**  
    - The rewritten region follows Principle VI (no comment citing a fix or requirement id), within the Governance clause's scope.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · spec.md:L139 (SC-001), tasks.md T008/T022  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-11 1:34 PM  
  **Notes**: Recommendation accepted in file 2026-11-11: Recommendation A, T008 in tasks.md notes that SC-001's 90% width is a visual check at 360, 390 and 430 px.  

  "at least 90% of the width between the site's side margins" is checked only by eye (quickstart step 1); jsdom does not lay out.  

  - **Recommendation A** _(recommended)_: Acceptable as a manual check; note in T008 that the 90% is a visual check at 360, 390 and 430 px.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: The success criterion is checked at the three phone widths it names, with no new tooling.  
    - <u>Cons</u>: Still a manual check; a regression would be seen only by eye.  

  - **Recommendation B**: Leave T008 as it is; quickstart step 1 already covers the phone widths.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: No change.  
    - <u>Cons</u>: The 90% figure is checked nowhere by name.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage · LOW · spec.md:L131 (FR-015), tasks.md  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-11-11 1:34 PM  
  **Notes**: Recommendation accepted in file 2026-11-11: Recommendation, none needed: FR-015's control is untouched and T021's full run covers it; no file changed.  

  FR-015 (the maximized card's arrow keeps closing in place) has no task; the control is untouched and `client-landing.test.ts` already covers Escape/close.  

  - **Recommendation**: None needed; T021's full run covers the regression.  

    ➡️ [X] **Accepted**  
    - The control is not changed by any task, and the existing suite pins its behaviour; no file changes.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **D1** · Duplication · LOW · spec.md:L126 (FR-010), L130 (FR-014)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-11-11 1:34 PM  
  **Notes**: Recommendation accepted in file 2026-11-11: Recommendation A, FR-010 and FR-014 kept as they are; no file changed.  

  Both state the back rule; FR-014 cites FR-010, so it is a reference, not a conflict.  

  - **Recommendation A** _(recommended)_: Keep both as they are.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: FR-010 states the rule for the legal pages, FR-014 extends it to the three controls; each is testable on its own.  
    - <u>Cons</u>: The rule is described twice.  

  - **Recommendation B**: Shorten FR-014 to "The legal pages' Back arrow, the Delete Account dialog's Cancel and the Poll Administration page's Back arrow MUST share the rule of FR-010; the admin arrow's fallback MUST be the home page, as today."  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: One statement of the rule.  
    - <u>Cons</u>: A wording change with no effect on the plan or tasks.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **F1** · Terminology · LOW · spec.md "Back arrow" (admin), contracts C5 / tasks T018–T019 `.admin-back-link` "back link"  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-11 1:34 PM  
  **Notes**: Recommendation accepted in file 2026-11-11: Recommendation, T018 and T019 in tasks.md name the control "the admin page's Back arrow (`.admin-back-link`)".  

  The admin control is "Back arrow" in the spec and "back link" in the code and tests (its CSS class).  

  - **Recommendation**: Keep the class; have the tasks say "the admin page's Back arrow (`.admin-back-link`)" once so both names meet.  

    ➡️ [X] **Accepted**  
    - T018 and T019 name the control as the spec does, with its class beside it; no code or test rename.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 full-width legal text < 640 px | ✅ | T006, T007, T008 | |
| FR-002 arrow in flow < 640 px, unchanged ≥ 640 px | ✅ | T006, T007 | |
| FR-003 in-page links land below header | ✅ | T006 (scroll-margin pins), T008 | |
| FR-004 address names the tab, replaceState | ✅ | T009, T011 | |
| FR-005 nine tabs honoured on load | ✅ | T009, T012, T013 | |
| FR-006 guest fallback to Trending, never login | ✅ | T009, T012, T013 | |
| FR-007 every return shows the tab left | ✅ | T009–T014 (address), T016, T019 (controls) | |
| FR-008 tab restored, not the card | ⚠️ | T013 (design) | see C1 |
| FR-009 search terms with Search only | ✅ | T009, T011, T013 | see U1 |
| FR-010 legal arrow rule unchanged | ✅ | T003, T004 | |
| FR-011 Cancel/Escape return | ✅ | T015, T016 | |
| FR-012 close in place, decided at open | ✅ | T015, T016 | |
| FR-013 scrim inert, Delete unchanged | ✅ | T015, T016 | |
| FR-014 one shared rule, admin fallback `/` | ✅ | T003, T018, T019 | |
| FR-015 maximized arrow unchanged | ✅ | T021 (regression run) | see C2 |
| FR-016 no cookie/storage/setting/route/page | ✅ | T005, T021 (`cookie-use-list`, `m3-assets`) | |
| FR-017 footer and texts unchanged | ✅ | T017 (`client-footer`), T021 | |
| SC-006 existing checks updated and passing | ✅ | T004, T006, T010, T015, T018, T021 | SC-001–SC-005 are outcome checks (quickstart T022) |

## Constitution Alignment Issues

None reported. The Constitution Check gate is present in plan.md and passes; the documentation phase (T023, T024) is in tasks.md. T1 is a scope note, not a violation.

## Unmapped Tasks

None reported. T001–T002 (markup), T003–T005 (foundation), T021–T025 (polish and documentation) serve every story.

## Metrics

- Total Requirements: 17 FR + 1 buildable SC (SC-006) = 18
- Total Tasks: 25
- Coverage %: 100% (18/18 with ≥ 1 task; FR-008 and FR-015 by design/regression only)
- Ambiguity Count: 2 (U1, A1)
- Duplication Count: 1 (D1)
- Critical Issues Count: 0

## Next Actions (as reported)

No CRITICAL issue; implementation may proceed. I1 should be settled before `/speckit-implement` so the spec and plan agree on what the address says after a guest fallback (one sentence in spec.md's Edge Cases). U1 and C1 are one sentence in FR-009 and one case in T009. The rest are optional wording.
