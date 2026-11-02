# Specification Analysis Report — specs/20261101-150208-ADAPTIVE-Y-AXIS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261101-150208-ADAPTIVE-Y-AXIS |
| Report created | 2026-11-01 033814 PM |
| Analysis captured | 2026-11-01 033814 PM |
| Last updated | 2026-11-02 112349 AM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · MEDIUM · tasks.md T002; research.md R7 (seeding note)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md Updated: 2026-11-02 11:24 AM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-02: the Recommendation; T002's seeding helper now places every vote at one identical `votedAt`, at least two hours ago, and research.md R7's seeding note says the same (at least two buckets, every bucket at the final shares).  

  T002 seeds votes "all within the last hour", but the 1 Day scale's buckets start at the first vote (`bucketTimes`, `src/polls/lineGraph.ts`): votes inside the current hour give fewer than two buckets (the sparse note, not a graph), and votes straddling an hour boundary leave a bucket with partial shares (the first voter alone is 100%).  

  - **Recommendation**: Seed every vote at one identical `votedAt`, at least two hours ago, so every bucket shows the final shares and there are at least two; correct T002 and R7's seeding note.  

    ➡️ [X] **Accepted**  
    - The new tests then see a graph whose highest point is exactly the final share, which is what each top's assertions need.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · tasks.md T004, T009  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md Updated: 2026-11-02 11:24 AM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-02: the Recommendation; T004 adds a `describe` block with its own context and `ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE: "30"` (4 choices, one vote each → none drawn, top 25), T009 runs in it (c1 lone early vote, c2 three later votes → top 75); research.md R7 names the block.  

  T004 (no drawn line) and T009 (an undrawn choice does not count) depend on the vote threshold, but the suite shares one test context (`startTestContext` in `beforeAll`), so the threshold cannot be changed per test; and "a poll whose every share is 0%" cannot be seeded (any vote gives a share above 0; no votes gives under two buckets).  

  - **Recommendation**: Add a `describe` block with its own context, `ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE: "30"`. T004: 4 choices with one vote each → every choice at 25%, none drawn, top 25. T009: c1 gets a lone early vote (100% at first), c2 three later votes → c1 ends at 25% and is not drawn, c2 drawn at 75% → top 75, not 100.  

    ➡️ [X] **Accepted**  
    - Both tests become writable with one extra test context, and each asserts a top that would differ if the rule counted undrawn choices.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U2** · Underspecification · MEDIUM · tasks.md T007  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md Updated: 2026-11-02 11:24 AM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-02: the Recommendation; T007 pins the seed (c1 20 days ago; c2–c4 at one identical time 10 days ago → 1 Month top 100, 1 Day top 25); research.md R7's scale switch now reads 100% 1 Month to 25% 1 Day.  

  "An early lone vote more than a day ago" does not give a 1 Day scale at or below 25%: the replay is cumulative, so any later vote within the day starts from the lone voter's 100%. The 1 Month scale also needs a data span of at least 7 days (`minSpanMs`).  

  - **Recommendation**: Pin the seed: c1 votes 20 days ago; c2, c3 and c4 vote at one identical time 10 days ago. 1 Month then shows 100% (top 100), 1 Day 25% throughout (top 25).  

    ➡️ [X] **Accepted**  
    - The scale switch then changes the axis from 100% to 25%, a difference the test can assert from the labels.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage · LOW · spec.md FR-005 ("on a resize"); tasks.md  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-02 11:24 AM  
  **Notes**: Recommendation accepted by "Accept all" 2026-11-02: the Recommendation; T012 now names quickstart §3's resize check, which jsdom cannot test.  

  No task checks that the top is kept on a resize; jsdom has no layout to resize.  

  - **Recommendation**: Leave it to quickstart §3, which T012 runs; name resize in T012.  

    ➡️ [X] **Accepted**  
    - The resize behaviour is then checked by hand in the browser, where layout exists.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 top rule | Yes | T003, T005, T006 | |
| FR-002 drawn lines, scale shown | Yes | T007, T009 | see U1, U2 |
| FR-003 no line → 25 | Yes | T004 | see U1 |
| FR-004 gridlines and labels | Yes | T003, T006 | |
| FR-005 redraw on every draw | Yes | T007, T008, T012 | resize: C1 |
| FR-006 markers on lines, real tooltip | Yes | T003, T008 | |
| FR-007 100% unchanged | Yes | T001, T003 | |
| FR-008 no server/data/setting change | Yes | (scope of T005–T006) | |
| SC-001 highest line ≥ 80% height | Yes | T003 | the 25% case asserts the top |
| SC-002 empty band < half | Yes | T003 | the four tops |
| SC-003 boundaries | Partial | T003 | 25, 50, 75, 100; 0 via T004 |
| SC-004 tooltip identical | Yes | T003 | |
| SC-005 100% unchanged | Yes | T001, T003 | |

## Constitution Alignment Issues

None (documentation phase T013; no explanatory comments per plan).

## Unmapped Tasks

None (T001–T002 setup; T010 is the contract amendment, R6).

## Metrics

- Total Requirements: 13 (8 FR, 5 SC)
- Total Tasks: 13
- Coverage %: 100% (SC-003 partial)
- Ambiguity Count: 0
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

No critical issues. I1, U1 and U2 would make the new tests fail or impossible to write as described: fix them before
`/speckit-implement`. C1 is optional. Run `/speckit-analyze-findings` to capture and resolve them.
