# Tasks: Poll Line Graph

**Input**: Design documents from `specs/20261027-151601-POLL-LINE-GRAPH/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R13), data-model.md, contracts/api.md (A1–A2), contracts/ui-contracts.md (C1–C9), quickstart.md

**Tests**: Included — the quickstart defines the three suites and the constitution's Goal-Driven Execution principle requires verifiable criteria. Write each suite before the code it verifies and watch it fail first.

**Organization**: Grouped by user story (spec.md US1–US4) after a foundational server phase every story shares.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story the task belongs to (US1–US4)

## Phase 1: Setup (Settings & Configuration)

**Purpose**: The two new settings, parsed and delivered — every later phase reads them

- [X] T001 Add `lineGraphMinVotePercentage` (ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE, integer ≥ 0, default 1) and `lineGraphRefreshIntervalMs` (ENV_LINE_GRAPH_REFRESH_INTERVAL, default 60000, clamped up to `minLiveRefreshIntervalMs`) to `src/config.ts`, following the existing numeric-setting parsing (research R10)
- [X] T002 Add both fields to the `GET /api/config` response in `src/routes/api.ts` (contracts/api.md A2) and extend the existing config-route test expectations in `tests/` to cover them

---

## Phase 2: Foundational (Server Series & Endpoint — blocks all user stories)

**Purpose**: The replay, the access rule and the endpoint — every story's data comes through here

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Write failing unit tests in `tests/line-graph-replay.test.ts`: cumulative replay (each email's latest `choice_ids` wins; a changed vote never double-counts), single- vs multiple-choice denominators per `computeResults`, UTC hour/day bucket alignment with a final "now" point, span and scale-availability rules (1d always; 1w ≥ 1 day; 1m ≥ 1 week; 1y ≥ 1 month; default = largest), threshold filter on current standing including `0` disables, and an anonymized deleted-account voter (`vote_history` rows rewritten the way `deleteAccount` writes them, `deleted-<uuid>@deleted.invalid` per poll) still counted exactly once and matching `computeResults` (research R4, R6)
- [X] T004 [P] Write failing route tests in `tests/line-graph-route.test.ts` (supertest + embedded-postgres): access matrix (guest/public 200, guest/private 404, invited 200, creator 200, banned 200, unpublished 404, bad pid 404, unknown scale 404, unavailable scale 404 — all refusals identical), default and explicit scales, response shape per contracts/api.md A1 (`buckets` epoch ms, `series` points pairing, manual `color` else null, `totalVoted` equals current standing), cache sharing — two requests inside one TTL cause one computation, a sparse-data `200` with `buckets.length < 2` per contracts/api.md A1, and a poll whose `vote_history` holds an anonymized deleted-account voter still matching `computeResults`; equality assertions compare against the database standing at computation time, not live counters (research R4, R5)
- [X] T005 [P] Add `mayViewResults(deps, caller, pid)` to `src/polls/access.ts`, reusing `reaches()`/`standingOf()`: published + (public, or creator, or reachable private); guests pass for public published polls only; a ban does not refuse (research R2)
- [X] T006 Create `src/polls/lineGraph.ts`: the scale table (data-model.md), span/availability, the one indexed `vote_history` query, the TypeScript bucket replay applying `computeResults`'s formula, the current-standing threshold filter, and series assembly — make T003 pass (research R4, R6)
- [X] T007 Add `GET /api/polls/:pid/line-graph` to `src/routes/tabsApi.ts`: `...dynamic("refresh")`, no `requireSession`; access via T005 before the cache; read-through `Cache` with key `line-graph:<pid>:<scale>` and TTL `lineGraphRefreshIntervalMs`; `Cache-Control: no-store`; one informative server log line per cache miss (pid, scale, events, duration — never an email) — make T004 pass (contracts/api.md A1, research R3, R5)
- [X] T008 [P] Document the endpoint in `postman/openapi.json` (path, query `scale`, 200 schema, 404)

**Checkpoint**: `GET /api/polls/:pid/line-graph` serves correct, cached, access-checked series — user stories can begin

---

## Phase 3: User Story 1 — See how the vote has moved over time (Priority: P1) 🎯 MVP

**Goal**: Maximizing a card renders the line graph in the right column: lines in bar colours, title/subtitle, legend with current percentages and the bar graph's vote count

**Independent Test**: Maximize a poll with multi-hour history → graph renders, colours match the bars, newest point and vote count equal the bar graph (spec US1 acceptance 1–4; quickstart step 2)

### Tests for User Story 1

- [X] T009 [P] [US1] Write failing jsdom tests in `tests/line-graph-ui.test.ts` (opt-in script list, as tooltip tests do): `mount` renders title/subtitle/legend/SVG from a stubbed fetch; polyline strokes use manual hex when present else `card.resultColors()`; legend shows per-line current % and total votes; sparse data (< 2 buckets) renders "Not enough voting data to graph yet"; a 404 renders "Results are not available yet"; a failed first load renders "Graph unavailable right now"; `unmount` empties the column; the SVG carries `role="img"` and an `aria-label` containing the poll title, and legend entries are text nodes (spec FR-018; contracts/ui-contracts.md C1, C2, C4–C6, C9)

### Implementation for User Story 1

- [X] T010 [P] [US1] Add the `resultColors()` getter to the card API in `src/public/pollCard.js`, returning `[{ id, label, hex }]` from the colours the card already assigns (manual, semantic yes/no, palette with the poll's offset) (research R7)
- [X] T011 [US1] Create `src/public/lineGraph.js`: `window.PollLineGraph = { mount(el, ctx), unmount() }`; fetch the default scale; render inline SVG (one polyline per drawn choice, 0–100% Y with 4–5 gridlines, natural X labels via viewer-local `Intl.DateTimeFormat`), the legend, and the C6/C9 placeholders (sparse data, 404, first-load failure); `role="img"` + `aria-label` on the SVG; `ResizeObserver` re-render on width change; guards so other pages return at once — make T009 pass (contracts/ui-contracts.md C2, C4–C6, C9; research R8, R11, R12)
- [X] T012 [US1] Mount/unmount seam in `src/public/tabs.js`: `maximize()` calls `window.PollLineGraph?.mount(view.querySelector(".maximized-space-right"), { pid, title, subtitle, card })` after the card moves; `close()` (all close paths) calls `unmount()` (contracts/ui-contracts.md C1)
- [X] T013 [US1] Create `src/public/line-graph-m3.css` (Material 3 tokens only: legend, axis text, gridlines, placeholders), add it and `lineGraph.js` to `src/public/index.html`, and add the sheet to `LAYER_ORDER` and the index.html allowlist in `tests/m3-assets.test.ts` (research R9)
- [X] T014 [US1] Remove the `.maximized-space-right` placeholder styling (hard-coded `#E6E6E6`, Inter, literal 13 px) from `src/public/tabs.css` — the element's content is replaced by this feature (research R9)

**Checkpoint**: MVP — maximizing a poll shows the full-width line graph with correct colours, legend and vote count

---

## Phase 4: User Story 2 — Choose the time window (Priority: P2)

**Goal**: The 1 Day / 1 Week / 1 Month / 1 Year selector, offering only available scales, defaulting to the largest, redrawing in place

**Independent Test**: Polls with spans under a day / week / month / over a month offer exactly the right scales with the largest selected; clicking another scale redraws (spec US2 acceptance 1–4; quickstart step 3)

### Tests for User Story 2

- [X] T015 [P] [US2] Extend `tests/line-graph-ui.test.ts` (failing first): only `availableScales` render as buttons; the served scale carries `aria-pressed`/selected marking; clicking another scale fetches `?scale=` and redraws; hourly scales label hours, daily scales label dates (contracts/ui-contracts.md C3, C5)

### Implementation for User Story 2

- [X] T016 [US2] Add the scale selector to `src/public/lineGraph.js`: buttons from `availableScales`, selected marking, refetch-and-redraw on click, per-scale X-label formatting — make T015 pass (contracts/ui-contracts.md C3)
- [X] T017 [US2] Add selector styling (tokens only, underline for the selected scale) to `src/public/line-graph-m3.css`

**Checkpoint**: Scales switch in place; availability and default follow the data span end-to-end

---

## Phase 5: User Story 3 — Inspect a moment (Priority: P3)

**Goal**: A pointer/touch crosshair with a tooltip listing every drawn choice's percentage at the hovered time

**Independent Test**: Hover and tap at several positions on hourly and daily scales → crosshair at the nearest bucket, tooltip listing all drawn lines with the date (or date and hour) once, viewer-local (spec US3 acceptance 1–4; quickstart step 4)

### Tests for User Story 3

- [X] T018 [P] [US3] Extend `tests/line-graph-ui.test.ts` (failing first): a `pointermove` over the SVG shows the crosshair at the nearest bucket with every drawn choice's dot+label+% and the time once (hour included only on hourly scales); `pointerleave` removes it; `pointerdown` (touch) places it (contracts/ui-contracts.md C7)

### Implementation for User Story 3

- [X] T019 [US3] Add the crosshair to `src/public/lineGraph.js`: `pointermove`/`pointerdown`/`pointerleave`, nearest-bucket resolution, tooltip assembly (every drawn line, time formatted once, viewer-local) — make T018 pass (contracts/ui-contracts.md C7; research R8)
- [X] T020 [US3] Add crosshair and tooltip styling (tokens only) to `src/public/line-graph-m3.css`

**Checkpoint**: Any moment on the graph is readable with one hover or tap, mouse, pen and touch alike

---

## Phase 6: User Story 4 — The graph stays current (Priority: P4)

**Goal**: Periodic refresh while maximized, stopped on close, quiet on failure, cheap for the service

**Independent Test**: With a short `ENV_LINE_GRAPH_REFRESH_INTERVAL`, votes from another session appear within one interval; closing the view stops requests; a stopped server leaves the drawn graph in place (spec US4 acceptance 1–3; quickstart steps 5, 9, 11)

### Tests for User Story 4

- [X] T021 [P] [US4] Extend `tests/line-graph-ui.test.ts` (failing first, fake timers): mount starts a timer at `lineGraphRefreshIntervalMs` from the stubbed config; each tick refetches the current scale and redraws legend + lines; a failed tick keeps the last drawn series and placeholderless view; a 404 tick stops the timer; `unmount` clears the timer (contracts/ui-contracts.md C8, C9)

### Implementation for User Story 4

- [X] T022 [US4] Add the refresh loop to `src/public/lineGraph.js`: interval from `/api/config`, in-place redraw, last-series retention on failure with at most one minimal console line, 404 → results-unavailable note + stop, timer cleared on unmount — make T021 pass (contracts/ui-contracts.md C8, C9; research R11)

**Checkpoint**: All four stories work independently; the live bar graph and the line graph never drift apart for more than one interval

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T023 Run the full suite (`npm test`) and the quickstart manual walkthrough (`specs/20261027-151601-POLL-LINE-GRAPH/quickstart.md` steps 1–11), including dark mode, phone width and the two-session cache-sharing check; fix whatever surfaces — *automated part done 2026-10-27: `npm test` 126 files / 1729 passed, 15 skipped (Valkey integration), confirmed by the developer's own run at 20:55 (same counts, 620 s); manual walkthrough (steps 1–11, dark mode, phone width, two sessions) still to do*
- [X] T024 Add `ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE` and `ENV_LINE_GRAPH_REFRESH_INTERVAL` to the Environment Variables table in `CLAUDE.md` and to the checked-in dev templates (`launch.json.example`, `devScripts.example/launch-dev.ps1`)
- [X] T025 [P] Regenerate `README.md` at the project root (post-implementation deliverable; constitution Documentation Deliverables)
- [X] T026 [P] Regenerate `ARCHITECTURE.md` at the project root (post-implementation deliverable; constitution Documentation Deliverables)
- [X] T027 Move the replay to write time (TWEAK03): migration `src/db/migrations/012-line-graph-tally.ts` (`line_graph_tally`, `line_graph_selection`, backfill); `src/polls/lineGraphTally.ts` (`tallyDeltas`, `recordLineGraphTally`, `fillLineGraphTally`, `rebuildLineGraphTally`) called beside every `vote_history` insert (`src/votes/consumer.ts` `writeBatch`, `src/polls/store.ts` `recordVote` / `insertVoteHistory`), the placeholder rewrite in `src/legal/deleteAccount.ts`, and the rebuild in `devScripts/populate/populate-poll.ts`; `serveLineGraph` sums the tally (`seriesFromTally`); tests in `tests/line-graph-tally.test.ts` and `tests/line-graph-route.test.ts` (research R1, R4)
- [X] T028 Answer every scale at once (TWEAK04): `serveLineGraph` in `src/polls/lineGraph.ts` returns `{ defaultScale, availableScales, totalVoted, scales }` under one cache key `line-graph:<pid>` and `?scale=` is no longer read (`src/routes/tabsApi.ts`, `postman/openapi.json`); `src/public/lineGraph.js` switches scales locally with no request and the refresh keeps the chosen scale; tests in `tests/line-graph-route.test.ts`, `tests/line-graph-ui.test.ts`, `tests/line-graph-replay.test.ts` (research R3, R5; contracts/api.md A1, ui-contracts C3, C8)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts immediately; T001 before T002
- **Foundational (Phase 2)**: needs Phase 1 (the route reads the settings). T003/T004/T005/T008 are parallel; T006 needs T003; T007 needs T004, T005, T006. **Blocks all user stories**
- **US1 (Phase 3)**: needs Phase 2. T009 and T010 parallel; T011 needs T009, T010; T012 needs T011; T013/T014 after T011 (T013 also edits the test allowlist)
- **US2 (Phase 4)**: needs US1's `lineGraph.js` (T011); T015 before T016; T017 parallel with T016
- **US3 (Phase 5)**: needs US1 (T011); independent of US2. T018 before T019; T020 parallel with T019
- **US4 (Phase 6)**: needs US1 (T011); independent of US2/US3. T021 before T022
- **Polish (Phase 7)**: needs every story planned for the release; T025/T026 parallel, last

### Notes on story independence

US2, US3 and US4 all extend `lineGraph.js`, so they share one file but no behaviour: each adds a separate concern
(selector, crosshair, timer) testable on its own, and any subset of them ships with US1 as a working increment.

## Parallel Example: Foundational phase

```text
# After T001–T002, launch together:
Task: T003 unit tests in tests/line-graph-replay.test.ts
Task: T004 route tests in tests/line-graph-route.test.ts
Task: T005 mayViewResults in src/polls/access.ts
Task: T008 endpoint in postman/openapi.json
```

## Parallel Example: User Story 1

```text
# After Phase 2, launch together:
Task: T009 jsdom tests in tests/line-graph-ui.test.ts
Task: T010 resultColors() in src/public/pollCard.js
```

## Implementation Strategy

**MVP first**: Phases 1–3 (T001–T014) deliver the visible feature — the graph with colours, legend and placeholders
on the default scale. Stop there, run the US1 independent test, and demo.

**Incremental delivery**: add US2 (scales), then US3 (crosshair), then US4 (refresh); each is a small, separately
testable increment on `lineGraph.js`, and the suite stays green between increments. Finish with Phase 7 (full
validation, settings documentation, README.md and ARCHITECTURE.md).
