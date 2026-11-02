# Tasks: Adaptive Y Axis for the Line Graph

**Input**: Design documents from `specs/20261101-150208-ADAPTIVE-Y-AXIS/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md, quickstart.md

**Tests**: Included (plan R7, Constitution IV), in `tests/line-graph-ui.test.ts`, written before the change they cover.

**Organization**: Every code task edits `src/public/lineGraph.js` or `tests/line-graph-ui.test.ts`, so tasks run in
order except where marked [P].

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Run `npx vitest run tests/line-graph-ui.test.ts` and record that it passes before any change (baseline for FR-007).

---

## Phase 2: Foundational

- [X] T002 In `tests/line-graph-ui.test.ts`, add helpers: `yAxisLabels(svg)` (the `<text>` elements whose content ends in `%` and whose `text-anchor` is `end`, as numbers, bottom to top) and a seeding helper that inserts `vote_history` rows for given choices all at one identical `votedAt`, at least two hours ago, so the 1 Day scale has at least two buckets and every bucket shows the final shares (research R7, seeding note).

**Checkpoint**: the helpers compile and the existing tests still pass.

---

## Phase 3: User Story 1 — Low shares fill the graph (P1) 🎯 MVP

**Goal**: The axis ends at 25, 50, 75 or 100% with the C2 gridlines.

**Independent Test**: quickstart §1 and §2.

- [X] T003 [US1] In `tests/line-graph-ui.test.ts`, add failing tests: a 4-choice poll with one vote on each (labels 0, 5, 10, 15, 20, 25), a 2-choice poll with one vote each (0…50 by 10), a 2-choice poll split 3:1 (0…75 by 15), and a poll whose highest share is above 75% (0, 25, 50, 75, 100). For the 25% case, assert that a polyline point at 25% has the same `y` as the 25% label, and that the tooltip at that bucket shows `25%` (contracts C1, C2; FR-001, FR-004, FR-006, FR-007).
- [X] T004 [US1] Add a `describe` block with its own test context (`startTestContext` with `ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE: "30"`), and in it a failing test for a graph with no drawn line: a 4-choice poll with one vote on each, so every choice is at 25% and none is drawn; the labels are 0…25 by 5 (FR-003).
- [X] T005 [US1] In `src/public/lineGraph.js`, add `AXIS_TOPS = [25, 50, 75, 100]` and `axisTopFor(series)` beside `renderSvg()`, returning the smallest top at or above the highest point; the highest point is taken as 0 when there are no points, so the top is 25 (FR-003) (research R2).
- [X] T006 [US1] In `renderSvg()` in `src/public/lineGraph.js`, compute `top = axisTopFor(data.series)` and `step = top === 100 ? 25 : top / 5`; change `y` to `(pct) => pad.top + ((top - pct) / top) * innerHeight`; replace the `[0, 25, 50, 75, 100]` loop with `0, step, …, top`, keeping `line-graph-baseline` on the 0% line. Add no explanatory comments (Constitution VI). Make T003 and T004 pass (research R3, R5).

**Checkpoint**: User Story 1 works; the existing line-graph tests still pass unchanged.

---

## Phase 4: User Story 2 — The axis follows what is shown (P2)

**Goal**: The top is derived again on every draw, from the scale shown only.

**Independent Test**: quickstart §3.

- [X] T007 [US2] In `tests/line-graph-ui.test.ts`, add a test with a 4-choice poll where c1 votes 20 days ago and c2, c3 and c4 vote at one identical time 10 days ago: the 1 Month scale peaks at 100% (c1 alone) and the 1 Day scale stays at 25% throughout; the labels end at 100 on 1 Month and at 25 after clicking the 1 Day segment (FR-002, FR-005; contract C3).
- [X] T008 [US2] Add a test that a refresh which raises the highest point changes the labels, and that a crosshair placed before the refresh stays at the same bucket time (FR-005, C3). Drive the refresh as the existing refresh tests in the same file do.
- [X] T009 [US2] In T004's `describe` block (threshold 30), add a test that a choice under the threshold (not drawn) with a higher earlier share does not raise the top: c1 gets a lone vote 5 hours ago (100% at first), c2 three votes at one identical time 3 hours ago, so c1 ends at 25% and is not drawn and c2 is drawn at 75%; the labels end at 75, not 100 (FR-002). If T005–T006 already make T007–T009 pass, record that no code change was needed (research R4). Recorded: T007–T009 passed with no code change beyond T005–T006.

**Checkpoint**: User Stories 1 and 2 are complete.

---

## Phase 5: Polish and Documentation

- [X] T010 [P] In `specs/20261027-151601-POLL-LINE-GRAPH/contracts/ui-contracts.md` C5, replace "The Y axis spans 0–100% with four or five gridlines" with the sentence of contracts/ui-contracts.md C4.
- [X] T011 Run `npx tsc --noEmit` and `npm test`; all pass.
- [ ] T012 Run quickstart §2–§4 in the browser, including §3's resize check (the axis keeps its top on a window resize; FR-005), which jsdom cannot test. Check §2's polls once the next hour has begun (votes in the current hour give the "not enough data" note), or seed them with `populate-poll` using votes dated at least two hours ago.
- [X] T013 [P] Documentation (Constitution, Documentation Deliverables): in `README.md`'s "Vote history graph" bullet, add that the graph's scale ends at 25, 50, 75 or 100%, whichever fits the lines shown; in `ARCHITECTURE.md`'s "The vote-history line graph" section, add one sentence that `renderSvg()` derives the axis top from the drawn series on every draw.

---

## Dependencies & Execution Order

```text
T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T011 → T012
T010, T013 (any time after T006; parallel with each other) → T011
```

- Tests (T003, T004, T007–T009) are written before the code they cover; T005–T006 make them pass.
- US2 needs US1's code: the redraw behaviour comes from the same `renderSvg()` change.

## Parallel Example

```text
Task: "T010 [P] amend POLL-LINE-GRAPH contracts/ui-contracts.md C5"
Task: "T013 [P] one sentence each in README.md and ARCHITECTURE.md"
```

## Implementation Strategy

1. **MVP**: T001–T006, which deliver User Story 1 and already redraw on every scale switch and refresh.
2. T007–T009 confirm User Story 2 with tests.
3. T010–T013 amend the earlier contract, verify, and update the documentation.
