# Specification Analysis Report — specs/20261103-120521-HOME-TAB

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261103-120521-HOME-TAB |
| Report created | 2026-11-03 014842 PM |
| Analysis captured | 2026-11-03 014842 PM |
| Last updated | 2026-11-03 021700 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · HIGH · spec.md FR-014, Clarifications Q2; research.md R6 (Trade-off); tasks.md T017  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-03 2:17 PM  
  **Notes**: Recommendation accepted in file 2026-11-03: Recommendation A, the trade-off is now in the spec: FR-014 says a change made elsewhere also waits while Home is held, SC-004 adds it, and a new Edge Case describes it. research.md R6 and T017 are unchanged.  

  The spec says a change made anywhere but on a Home card rebuilds Home at the next refresh. The design instead reuses the cached list whenever `keepOrder` is set, so a change made in another window waits until Home is next opened. The spec and the plan disagree.  

  - **Recommendation A** _(recommended)_: state the trade-off in the spec: while Home is showing after an action on one of its cards, every change (wherever it was made) waits until Home is next opened or the interval ends; FR-014, SC-004 and an Edge Case say so, and research.md R6 and T017 stay as they are.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: keeps the design simple and stateless about where a change came from; the delay lasts one viewing of Home, and the other window's own Home is current.  
    - <u>Cons</u>: a change made elsewhere while Home is held does not appear in this window until Home is reopened.  

  - **Recommendation B**: make the design match the spec: with `keepOrder`, the server still rebuilds when the list version changed, and answers the rebuilt list with a `held: true` flag; the browser keeps its order and cards while held and applies the new list at the next opening (R6, A1, C3, T017, T019 change).  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the spec's wording holds; the cached list is always current.  
    - <u>Cons</u>: the browser must hold one list and display another; it cannot tell "elsewhere" changes from its own either, so in practice they still wait for the next opening — the visible behaviour is the same as A, with more code.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · tasks.md T009; research.md R4; spec.md FR-010  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-03 1:58 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-03: Recommendation, order each rule's polls by the latest date among that rule's own relations; tasks.md T009 now says so and T006 gains an order-within-rule case. research.md R4 is outside this skill's files and was left as it is.  

  T009 walks the candidates newest first and places each poll on first sight. A poll's newest relation may belong to another rule (e.g. voted yesterday, invited last month, placed in rule 1). Its position in rule 1 then follows the vote date, not the invitation date, so "most recent relation first" within a rule is not guaranteed, and T006 doesn't test the order within a rule.  

  - **Recommendation**: order each rule's polls by the latest date among that rule's own relations (rule 1: `invited`/`linked`; rule 2: `created`; rule 3: `voted`; rule 4: `bookmarked`); say so in research.md R4 and T009, and add an order-within-rule case to T006.  

    ➡️ [X] **Accepted**  
    - Matches FR-010 and the personal tabs, which order by their own relation's date.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · MEDIUM · spec.md FR-011, FR-015; research.md R5; tasks.md T017  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-03 2:17 PM  
  **Notes**: Recommendation accepted in file 2026-11-03: Recommendation A, T017's per-refresh check now keeps rule-4 polls only while `mayWatchMany` allows them, and T014 tests that a ban removes a watched poll at the next refresh, even with `keepOrder`. research.md R5 and data-model.md are outside this skill's files and were left as they are.  

  FR-011 says the same access checks as the source tab. On every refresh, R5 re-checks only "published", "reachable" and (rule 1) "still shared". Watching re-checks "may watch" (bans included) on each refresh, so a watched poll the user was banned from stays on Home until the next rebuild.  

  - **Recommendation A** _(recommended)_: add the "may watch" check (`mayWatchMany`) for rule-4 polls to the per-refresh check in research.md R5, data-model.md and T017, with a T014 case (a ban removes a watched poll at the next refresh, even with `keepOrder`).  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: every rule re-checks exactly what its source tab checks, so FR-011 holds literally.  
    - <u>Cons</u>: one more small query (bans for the listed pids) on each full refresh.  

  - **Recommendation B**: narrow FR-011's wording to the checks actually repeated on each refresh (published, reachable, still shared), and leave bans to the rebuild that the ban's own `forgetTabs` triggers.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no extra query; a ban already changes the list version, so the poll leaves at the next refresh unless `keepOrder` is held.  
    - <u>Cons</u>: with `keepOrder`, a banned user still sees the watched poll until Home is reopened (voting is blocked anyway).  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · LOW · contracts/ui-contracts.md C3; tasks.md T019  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-03 1:58 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-03: Recommendation, only a selection from another tab, or a page load, clears `keepOrder`; choosing Home again while it is showing does not. tasks.md T019 and T015 now say so; contracts/ui-contracts.md C3 was left as it is (outside this skill's files).  

  It is unclear whether choosing Home from the avatar menu while Home is already showing counts as "opening" it, which clears `keepOrder`.  

  - **Recommendation**: say that only a selection from another tab, or a page load, clears it; choosing Home again while it is showing (tab, "All tabs" menu or avatar menu) does not. Update C3 and T019.  

    ➡️ [X] **Accepted**  
    - The user is still looking at the same Home, so the card they just used should not jump.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U3** · Underspecification · LOW · research.md R2; tasks.md T008; spec.md FR-007 (rule 4 "every")  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md plan.md tasks.md Updated: 2026-11-03 2:17 PM  
  **Notes**: Recommendation accepted in file 2026-11-03: Developer Resolution C, the candidate limit is a new setting, `ENV_MAX_HOME_PAGE_POLLS`, default 200 polls: spec.md gains FR-018a, a Key Entity, an Edge Case and the Assumption; plan.md counts two settings; tasks.md T001 documents it, T002 reads and validates it, T003 tests it, T008 limits the candidate query to that many distinct polls (most recent relation first), and T014 tests it. research.md R2 and CLAUDE.md are outside this skill's files and were left as they are.  

  The candidate limit (5 × `ENV_MAX_POLLS_SEARCH_RESULTS`, 1,000 rows) could cut rule 4 short for an account with a very large relation history.  

  - **Recommendation A** _(recommended)_: record it as an edge case in the spec: the candidates are filtered by the date windows before the limit, so only an account with more than 1,000 current relations is affected, and then the most recent are kept.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no design change; the bound protects the server from a pathological account.  
    - <u>Cons</u>: rule 4's "every" has a documented exception.  

  - **Recommendation B**: apply the limit to each relation separately (one bounded read per relation, rule 4 bounded by `ENV_MAX_BOOKMARKS_PER_USER`), so the watched polls are always read in full.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: rule 4 is exact for every account.  
    - <u>Cons</u>: up to four queries per rebuild instead of one, against RS1's single-query design.  

  - **Developer Resolution C**:  

    ➡️ [x] **Accepted**  
    - the Home tab's candidate limit is 200 polls, as defined by `ENV_MAX_HOME_PAGE_POLLS`.

### **C1** · Coverage Gap · LOW · spec.md FR-005a; tasks.md T007, T015  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-03 1:58 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-03: Recommendation, tasks.md T015 now checks that a vote or watch on a Home card adds "You voted" / "You are watching" to its reason line before any request returns.  

  "A vote or watch adds its words at once" (FR-005a) is not tested.  

  - **Recommendation**: add the immediate reason-line update after a vote or watch on a Home card to T015 (the line gains "You voted" / "You are watching" before any request returns).  

    ➡️ [X] **Accepted**  
    - One more assertion in a suite already planned.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · LOW · tasks.md T010; research.md R8  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-03 2:17 PM  
  **Notes**: Recommendation accepted in file 2026-11-03: Recommendation A, US1's checkpoint in tasks.md now says that until US2 every refresh resends the whole list.  

  After US1 alone, `membershipVersion` is set to the current time on every refresh, so every refresh resends the whole list until US2's cached list provides `builtAt`. This is acceptable for an increment, but not stated.  

  - **Recommendation A** _(recommended)_: note it at US1's checkpoint in tasks.md ("until US2, every refresh resends the list").  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: one line; US2 replaces the behaviour anyway.  
    - <u>Cons</u>: the MVP alone is less efficient than the other personal tabs.  

  - **Recommendation B**: in T010, use the newest relation date among the candidates as `membershipVersion`, as `personalTab` does.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: the MVP sends only deltas.  
    - <u>Cons</u>: it misses trending changes and date-window crossings, which do not change any relation date; code US2 then replaces.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 tab, first, icon | Yes | T011, T012, T027 | |
| FR-002 signed-in only | Yes | T012, T023–T025 | |
| FR-003 landing tab | Yes | T007, T012 | |
| FR-004 sign-out → Trending | Yes | T023, T024 | |
| FR-005 ordinary cards | Yes | T010 | |
| FR-005a reason line | Yes | T009, T013, T007 | C1 |
| FR-006 empty line | Yes | T012, T007 | |
| FR-007 five rules | Yes | T006, T009 | U3 |
| FR-008 states | Yes | T006, T008 | |
| FR-009 date windows | Yes | T006, T008 | |
| FR-010 order | Partial | T009 | U1 |
| FR-011 access per source | Partial | T009, T017 | I2 |
| FR-012 no acceptance | Yes | T006, T010 | |
| FR-013 reuse | Yes | T014, T017 | |
| FR-014 own changes | Yes | T014, T015, T017, T019 | I1 |
| FR-015 per-refresh access | Yes | T014, T017 | |
| FR-016 trending not ready | Yes | T014, T017 | |
| FR-017 shared across instances | Yes | T016 | |
| FR-018 setting | Yes | T002, T003 | |
| FR-019 no all-user job | Yes | T017 | design |
| FR-020 limits | Yes | T010 | |
| FR-021 menu item | Yes | T020, T021 | |
| FR-022 menu behaviour | Yes | T020, T021 | U2 |
| FR-023 link naming Home | Yes | T012, T023, T024 | |
| FR-024 docs | Yes | T001, T026 | |
| SC-002 rule boundaries | Yes | T006 | |
| SC-003 one rebuild | Yes | T014 | |
| SC-004 own change shows | Yes | T014, T015 | |
| SC-005 live counts | Yes | T010 | |
| SC-006 guests | Yes | T020, T023 | |
| SC-007 contrast | Yes | T029 | No new colours: the token audit (`color-scheme-contrast.test.ts`) is unaffected |
| SC-008 cost | Yes | T008, T017 | |

## Constitution Alignment Issues

None reported. The tests are included, there is a documentation phase (T030), and errors are logged with the cache falling back to a rebuild. The Complexity Tracking table is empty.

## Unmapped Tasks

None reported. T001 and T026–T030 map to FR-018, FR-024, BC2 and the documentation deliverables.

## Metrics

- Total Requirements: 32 (25 FR + 7 buildable SC)
- Total Tasks: 30
- Coverage: 100% (2 partial: FR-010, FR-011)
- Ambiguity Count: 2 (U2, U3)
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

There are no CRITICAL issues. Resolve I1 before `/speckit-implement`, because the spec and the design disagree there. U1 and I2 are small edits to tasks.md and research.md, and the LOW items are optional. `/speckit-analyze-findings` now records each one with its recommendation.
