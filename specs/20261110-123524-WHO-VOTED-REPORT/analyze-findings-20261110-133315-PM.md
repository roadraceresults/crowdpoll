# Specification Analysis Report — specs/20261110-123524-WHO-VOTED-REPORT

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261110-123524-WHO-VOTED-REPORT |
| Report created | 2026-11-10 012216 PM |
| Analysis captured | 2026-11-10 012216 PM |
| Last updated | 2026-11-10 013224 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **C1** · Constitution · CRITICAL · tasks.md T022; constitution VI  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-10 1:26 PM  
  **Notes**: Recommendation accepted in file 2026-11-10: Recommendation, T022 now deletes only the stale sentence and writes no replacement comment.  

  T022 rewrites the `adminCard.js` comment to explain who sees names; Principle VI forbids comments that explain behaviour, and the governance rule brings an existing comment into line when its region changes.  

  - **Recommendation**: Change T022 to **delete** the stale sentence "Who sees the names is unchanged: administrators only." rather than rewrite it; the behaviour is documented in README.md (T023) and the tests.  

    ➡️ [x] **Accepted**  
    - The remaining lines of that comment describe the switch's stored values and are left as they are (Principle III); only the false sentence goes.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I1** · Inconsistency · MEDIUM · spec.md FR-017, US3 scenario 2; research.md R4; tasks.md T005, T018  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-10 1:26 PM  
  **Notes**: Recommendation accepted in file 2026-11-10: Recommendation, FR-017 and US3 scenario 2 now say "when the live counts include a vote not yet in the report".  

  The spec has the browser compare the report's voter count with the card's and retry after about 2 s; the plan moved the comparison to the server (`settleMs` when the live counters are ahead of `votes`), and the browser only follows `settleMs`.  

  - **Recommendation**: Reword FR-017 and US3 scenario 2: "when the live counts include a vote not yet in the report, it is fetched once more about 2 seconds later".  

    ➡️ [x] **Accepted**  
    - The spec then states the outcome the plan delivers; research R4 already records why the server compares.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · tasks.md T011, T019  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-10 1:26 PM  
  **Notes**: Recommendation accepted in file 2026-11-10: Recommendation A, T011 adds `syncVoters`, which records the versions it showed and is called from `maximize`; T019 calls it from `render` only on a version change; T017 tests that the first render after `maximize` does not ask again.  

  `maximize` calls `WhoVoted.show` (T011), and `syncVoters` in `render` (T019) calls it again when the versions differ from "the last values shown", which T011 never records; the first render after maximizing could send a second request within the 2 s floor and get a `429`.  

  - **Recommendation A** _(recommended)_: Route both calls through `syncVoters`, which records `countsVersion`/`contentVersion` on every call, `maximize` included; add that case to T017.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: one place in `tabs.js` decides when to ask, like `syncNotes`; `whoVoted.js` stays a plain show/hide module.  
    - <u>Cons</u>: `tabs.js` keeps two more values per grid.  

  - **Recommendation B**: Let `WhoVoted.show` itself skip a fetch when `countsVersion` and `contentVersion` equal those of its last request for the pid; `tabs.js` calls it freely.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: `tabs.js` changes even less; the de-duplication is tested with the module.  
    - <u>Cons</u>: `show` gains a second job; the module must keep the versions it already receives.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · MEDIUM · tasks.md T019; `tabs.js` `patchRetained`/`mountRetained`  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-10 1:32 PM  
  **Notes**: Recommendation accepted in file 2026-11-10: Recommendation, T019 now also calls `syncVoters` from `patchRetained`; T017 tests a retained maximized poll whose counts change there.  

  A maximized poll that no tab list holds (retained/pinned) gets its counts through `patchRetained`, not `render`, so the report would not follow the bars there — including after the viewer's own vote.  

  - **Recommendation**: Extend T019 so `patchRetained` also calls `syncVoters` with the patched detail; add a case to T017.  

    ➡️ [x] **Accepted**  
    - Covers the one other path by which a maximized card's counts change.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · MEDIUM · spec.md SC-005  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-11-10 1:26 PM  
  **Notes**: Recommendation accepted in file 2026-11-10: Recommendation, SC-005 restated as the row-group announcement and M3-tokens-only outcomes.  

  "Passes the site's existing accessibility and theme checks" names no check that exists in the repo.  

  - **Recommendation**: Restate SC-005 as testable outcomes: every line's group is announced with it (`th scope="rowgroup"`), and only M3 colour tokens are used (`m3-assets.test.ts`) — already covered by T020/T021.  

    ➡️ [x] **Accepted**  
    - Makes the criterion verifiable without inventing a new tool.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **G1** · Coverage · LOW · spec.md SC-002, SC-004  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-10 1:26 PM  
  **Notes**: Recommendation accepted in file 2026-11-10: Recommendation, T016 adds a 100-voter sort switch with no request and a synchronous redraw (SC-004); T026 times quickstart step 6 against 5 s (SC-002).  

  No task checks SC-002 ("within 5 seconds") or SC-004 ("under half a second for 100 voters").  

  - **Recommendation**: Add to T016 a 100-voter sort switch that makes no request and redraws synchronously; cover SC-002 through quickstart step 6 in T026.  

    ➡️ [x] **Accepted**  
    - Both criteria then have a named check.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **G2** · Coverage · LOW · spec.md FR-008; tasks.md T013  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-10 1:26 PM  
  **Notes**: Recommendation accepted in file 2026-11-10: Recommendation, T013 asserts `localStorage` and `sessionStorage` stay empty after sorting.  

  "MUST NOT be stored in the browser" is untested.  

  - **Recommendation**: T013 asserts `localStorage`/`sessionStorage` stay empty after sorting.  

    ➡️ [x] **Accepted**  
    - Guards the "no new Cookie Use row" invariant.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U3** · Underspecification · LOW · tasks.md T021  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-10 1:26 PM  
  **Notes**: Recommendation accepted in file 2026-11-10: Recommendation, T020 asserts the Notes, Who voted, line graph DOM order; T021 drops the unverifiable single-column check, left to quickstart step 9.  

  "Check that `single-column-m3.css` keeps … adjust only if …" is not a verifiable step.  

  - **Recommendation**: Make it a T020 assertion on DOM order (Notes, Who voted, line graph in `.maximized-space-right`); leave the visual check to quickstart step 9.  

    ➡️ [x] **Accepted**  
    - The order is fixed by the template, so a DOM test proves it in both layouts.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U4** · Underspecification · LOW · contracts/ui-contracts.md C3; tasks.md T018  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-10 1:26 PM  
  **Notes**: Recommendation accepted in file 2026-11-10: Recommendation, T018 states at most one pending retry, and a `429` on a retry schedules it again once; `contracts/ui-contracts.md` is outside what this skill may edit and was left unchanged.  

  If the `settleMs` retry itself gets a `429`, whether one more retry is allowed is unstated.  

  - **Recommendation**: State "at most one pending retry; a `429` on a retry schedules it again once".  

    ➡️ [x] **Accepted**  
    - Bounds the retries while not losing the catch-up fetch to the floor.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 panel only for non-anonymous private | Yes | T005, T007, T008, T009 | |
| FR-002 who may see / 404 | Yes | T005, T007 | |
| FR-003 names only per viewer, no-store | Yes | T005, T007 | |
| FR-004 name only, no address | Yes | T004, T007 | |
| FR-005 votes the bars count | Yes | T004, T007 | |
| FR-006 placement | Yes | T001, T021 | U3 |
| FR-007 heading, control, table | Yes | T010, T014 | |
| FR-008 default sort, kept, reset, not stored | Yes | T013, T014 | G2 |
| FR-009 Sort by Voter | Yes | T008, T010 | |
| FR-010 Sort by Choice | Yes | T013, T014 | |
| FR-011 bar order | Yes | T008, T010 | |
| FR-012 group name once, announced | Yes | T008, T020 | |
| FR-013 banding | Yes | T021 | |
| FR-014 date format and hover | Yes | T008, T010 | |
| FR-015 empty state | Yes | T008, T010 | |
| FR-016 states, hide on close | Yes | T008, T009, T011 | |
| FR-017 refresh, retry, stale replies | Yes | T016–T019 | I1, U1, U2 |
| FR-018 rate limit, terms gate | Yes | T005, T007 | |
| FR-019 grows to fit, Notes look | Yes | T012, T021 | |
| FR-020 docs, comment, API | Yes | T006, T022–T025 | C1 |
| SC-001 every counted voter listed | Yes | T007, T008 | |
| SC-002 within 5 s | Partial | T016, T026 | G1 |
| SC-003 no names elsewhere | Yes | T005, T007, T008 | |
| SC-004 sort under 0.5 s | No | — | G1 |
| SC-005 a11y/theme | Yes | T020, T021 | A1 |

## Constitution Alignment Issues

C1 (Principle VI, comments).

## Unmapped Tasks

None (T001–T003 setup, T026 verification).

## Metrics

- Total requirements: 25 (20 FR, 5 SC)
- Total tasks: 26
- Coverage: 96% (24/25 with ≥1 task; SC-004 none)
- Ambiguity count: 1
- Duplication count: 0
- Critical issues: 1

## Next Actions (as reported)

- Resolve C1 before `/speckit-implement` (one-line change to T022).
- Resolve I1, U1, U2 by small edits to spec.md and tasks.md; they would otherwise ship a double request and a report that does not follow the bars for pinned cards.
- LOW items can be folded into the same pass.
