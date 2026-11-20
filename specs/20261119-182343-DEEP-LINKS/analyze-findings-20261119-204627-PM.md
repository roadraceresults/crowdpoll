# Specification Analysis Report — specs/20261119-182343-DEEP-LINKS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261119-182343-DEEP-LINKS |
| Report created | 2026-11-19 080932 PM |
| Analysis captured | 2026-11-19 080932 PM |
| Last updated | 2026-11-19 081400 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · HIGH · spec.md FR-010, SC-003; data-model.md "Choosing the tab"; research.md R2; tasks T021, T025  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md data-model.md research.md tasks.md Updated: 2026-11-19 8:14 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation A, `shared-with-you` is kept only when the poll is private and the visitor did not create it; FR-010, the data-model table and R2 say so, and T021 asserts a creator asking for it gets `your-polls`.  

  `shared-with-you` is kept whenever the poll is private, including for its **creator**. The Shared With You list leaves out the visitor's own polls (`created_by_id <> userId` in `src/polls/userPolls.ts`), so a creator opening `/?tab=shared-with-you&PID=<own private poll>` lands on a tab that does not list it, which breaks SC-003.  

  - **Recommendation A** _(recommended)_: Keep `shared-with-you` only when the poll is private **and** the visitor did not create it. Change FR-010, the data-model table and R2, and assert it in T021.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: every kept tab is one whose list holds the poll for the visitor, as SC-003 says; the creator falls back to Your Polls, where the poll is listed.  
    - <u>Cons</u>: one more condition in `chooseTab` and its table.  

  - **Recommendation B**: keep FR-010 as it is and narrow SC-003 so it no longer covers Shared With You for the creator.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no change to the rules.  
    - <u>Cons</u>: a creator's reload of their own address can show a tab that does not list the poll once it is minimized.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · MEDIUM · spec.md FR-020, US2 scenario 1; research.md R8; data-model.md "Share button visibility"; contracts/share.md S2; T011, T017  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md contracts/share.md Updated: 2026-11-19 8:14 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation A, FR-020 and US2 scenario 1 now say "a published poll (waiting to open, open or closed)"; a spec edge case and S2 say the creator's own card hides Share while editing.  

  The spec puts Share on "open or closed" polls. The plan adds `WAITING TO OPEN` and hides Share on the creator's own card while it is `EDITING`; neither case is in the spec.  

  - **Recommendation A** _(recommended)_: Amend FR-020 to "every published poll (waiting to open, open or closed)", and add an edge case: the creator's card hides Share while editing.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: a poll waiting to open can be shared ahead of its opening, and its link already works; the spec then matches the plan.  
    - <u>Cons</u>: a small change to the spec's wording.  

  - **Recommendation B**: follow the spec literally: Share only on open or closed polls; change R8, the data model, S2, T011 and T017 to hide it for `WAITING TO OPEN`.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the spec stays as written.  
    - <u>Cons</u>: a published poll's card has no Share until it opens, although its link works.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · MEDIUM · spec.md US1 scenario 4; tasks.md Phase 3 "Independent Test" and Dependencies  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-19 8:14 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation A, T025–T028 (the server's tab choice) moved into Foundational without their [US3] label; the checkpoint, dependencies, graph and parallel notes follow.  

  US1's reload scenario (the same poll over the same tab) needs the server to honour `tab` (T026–T028, US3). Today `GET /?PID=` ignores `tab`, so US1 cannot be tested on its own, and the dependency graph shows US1 before US3.  

  - **Recommendation A** _(recommended)_: Move the server's tab choice (T025–T028) into Foundational, so US1 and US3 both build on it.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: US1's reload works and is testable as soon as US1 is done; the graph becomes true.  
    - <u>Cons</u>: a larger foundational phase before the MVP.  

  - **Recommendation B**: Keep the phases; limit US1's independent test to the address on maximize and close, and check reload after US3.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the MVP stays small.  
    - <u>Cons</u>: the MVP's reload lands on today's tab (Your Polls, Shared With You or Trending), not the tab in the address.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · MEDIUM · spec.md FR-012; research.md R4; contracts/links.md L10; T024, T029  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ research.md contracts/links.md tasks.md Updated: 2026-11-19 8:14 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation A, the card stays until the tab's next server answer: R4 adds the grid's `keptPid` and `releaseKept()`, L10 says other redraws keep it, and T024/T029 follow; FR-012 already said "next refresh" and is unchanged.  

  FR-012 says the poll's card stays "until the tab's next refresh"; the plan says "until the tab's next render". A grid re-renders on more than a refresh: `placeFirst` after Watch, `remove`, and `activate` on returning to the tab (`src/public/tabs.js` around lines 925–955). So a closed linked poll can vanish when the visitor watches another poll, well before a refresh.  

  - **Recommendation A**: keep the card until the tab's next server refresh: `render` keeps a "closed retained" pid until `request()` answers.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: matches FR-012 exactly; the card does not vanish on an unrelated Watch.  
    - <u>Cons</u>: another piece of grid state, and a rule in `render` to honour it.  

  - **Recommendation B** _(recommended)_: accept "next render": reword FR-012 to "until the tab next redraws its list (a refresh, a Watch or Remove on that tab, or returning to the tab)".  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: uses the existing render rule unchanged (constitution II); the card is gone only after another action on that tab.  
    - <u>Cons</u>: the card may leave sooner than a refresh.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · tasks.md T029; `src/public/tabs.js` `restore`  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ research.md tasks.md Updated: 2026-11-19 8:14 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation, focus returns to the kept card's Maximize button (`leftTheTab` from `options.left` only), stated in R4 and T029 and tested in T024.  

  `restore` sets `leftTheTab = options.left || retainedDetail` and moves focus to the start of the tab. When the retained card now stays in the grid, focus should return to its own Maximize button, as for any card. T029 does not say so.  

  - **Recommendation**: Add to T029: set `leftTheTab` from `options.left` only when the retained card stays; test where focus lands in T024.  

    ➡️ [X] **Accepted**  
    - Keyboard and screen-reader users return to the card they closed, as they do for every other card.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · LOW · spec.md FR-015, FR-018; research.md R5, R6  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-19 8:14 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation A, a spec edge case says a guest's search link lands on the fallback tab after login.  

  A guest opening `/?PID=&tab=search&q=x` is sent to login, where only `PID` and `tab` are carried; `q` is lost. After login, `search` with no terms falls back, so the copied search is not shown.  

  - **Recommendation A** _(recommended)_: state in the spec's edge cases that a guest's search link lands on the fallback tab after login.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: no change to the login paths; the poll itself is still shown.  
    - <u>Cons</u>: the guest does not see the sharer's search results behind the poll.  

  - **Recommendation B**: carry `q` beside `tab` through every login path.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the guest sees the same search after login.  
    - <u>Cons</u>: search terms travel through emailed login links and provider callbacks, about ten more touch points.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U3** · Underspecification · LOW · tasks.md T012  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-19 8:14 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation, T012 names `tests/client-admin-wizard.test.ts`.  

  "In `tests/client-admin-wizard.test.ts` (or the admin card test that covers …)" leaves the file undecided.  

  - **Recommendation**: Name the file: `tests/client-admin-wizard.test.ts`, the only suite that tests "Copy poll link" (`wizard-summary-copy-link`, `Link copied`).  

    ➡️ [X] **Accepted**  
    - The task becomes executable without searching.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U4** · Underspecification · LOW · tasks.md T034; `src/public/tabs.js` `init`  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-19 8:14 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation, T034 now confirms the lazily created Search grid exists before `showLandingPoll`.  

  `init` already runs `searchFromAddress` and then `showLandingPoll(tab, pid)` for `tab=search`. T034 adds little, and its real gap is not covered: whether `mountLinkedPoll` works on the Search grid, which is created lazily by `ensureGrid`.  

  - **Recommendation**: Reword T034: confirm `controllers.search.grid` exists before `showLandingPoll`, and let T030 cover it.  

    ➡️ [X] **Accepted**  
    - The task targets the actual risk rather than code that already exists.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage · LOW · spec.md FR-027  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-19 8:14 PM  
  **Notes**: Recommendation accepted in file 2026-11-19: Recommendation, T035 asserts `/login?PID=&tab=` still renders the poll preview (FR-027).  

  No task checks that the login page's link preview and `/poll/<pid>` are unchanged. The existing suites cover them, but no task says to run or extend them for the new `tab` parameter.  

  - **Recommendation**: In T035, add an assertion that `/login?PID=&tab=` still renders the poll preview.  

    ➡️ [X] **Accepted**  
    - FR-027 gets an explicit check where the new parameter meets the preview.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 | Yes | T004, T006, T008 | |
| FR-002 | Yes | T004, T005, T009, T010 | |
| FR-003 | Yes | T004, T005, T006 | |
| FR-004 | Yes | T005, T026, T028 | See I3 |
| FR-005 | Yes | T008, T035 | |
| FR-006 | Yes | T001, T003 | |
| FR-007 | Yes | T022, T026 | |
| FR-008 | Yes | T026, T028 | |
| FR-009 | Yes | T022, T025 | |
| FR-010 | Yes | T021, T025 | See I1 |
| FR-011 | Yes | T021, T025 | |
| FR-012 | Yes | T024, T029 | See A1, U1 |
| FR-013 | Yes | T023 | |
| FR-014 | Yes | T035, T037 | |
| FR-015 | Yes | T036–T039 | See U2 |
| FR-016 | Yes | T035 (and the existing guest landing) | |
| FR-017 | Yes | T030, T032, T033 | |
| FR-018 | Yes | T031, T034 | |
| FR-019 | Yes | T030 | |
| FR-020 | Yes | T011, T016, T017 | See I2 |
| FR-021 | Yes | T011, T017 | |
| FR-022 | Yes | T012, T013, T015 | |
| FR-023 | Yes | T011, T013 | |
| FR-024 | Yes | T011, T013 | |
| FR-025 | Yes | T016, T017, T018, T019, T020 | |
| FR-026 | Yes | T022 | |
| FR-027 | Partial | — | See C1 |
| SC-001 | Yes | T004, T005, T043 | |
| SC-002 | Yes | T021, T022 | |
| SC-003 | Yes | T021 | Breaks today (I1) |
| SC-004 | Yes | T043 (by hand) | |
| SC-005 | Yes | T022 | |
| SC-006 | Yes | T023 | |
| SC-007 | Yes | T030, T031 | |

## Constitution Alignment Issues

None. Documentation deliverables are covered (T044, T045); the one comment planned links to external docs (T013); server logging is informative and logs nothing about the visitor (T028).

## Unmapped Tasks

None. T041–T043 and T046 are polish.

## Metrics

- Total Requirements: 34 (27 FR, 7 SC)
- Total Tasks: 46
- Coverage: 97% (33 of 34 with at least one task; FR-027 partial)
- Ambiguity Count: 1
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

- No critical issue blocks `/speckit-implement`. I1 (HIGH) should be fixed first, because it makes a tested success criterion false; I2, I3, A1 and U1 are worth settling before implementing.
- Suggested edits: FR-010 and the data-model table (I1); FR-020 (I2); the tasks dependency graph (I3); FR-012 or T029 (A1, U1).
