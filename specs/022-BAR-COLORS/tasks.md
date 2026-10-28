---
description: "Task list for 022-BAR-COLORS"
---

# Tasks: Bar Colors

**Input**: Design documents from `specs/022-BAR-COLORS/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md,
quickstart.md

**Tests**: Included, and not optional. FR-009 makes the rewritten and new colour tests part of the
feature, constitution Principle IV requires a verifiable criterion per task, and SC-002–SC-006 are
automated checks. Every colour case lives in `tests/client-bar-colours.test.ts` (research R7); jsdom
exposes each bar's inline fill, tint and text colours, so everything but the painted result is
automated. The painted result is `quickstart.md` Q1–Q9.

**Organization**: by user story. US1 (each poll has its own colours) is the change itself. US2 (a
poll's colours never change) needs no code beyond US1's; its phase adds the tests that prove it.
Most tasks touch one of two files, `src/public/pollCard.js` or `tests/client-bar-colours.test.ts`,
so there is little parallelism inside the stories; the documentation tasks are parallel.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel: different files, no dependency on an incomplete task
- **[Story]**: US1 or US2, mapping to the user stories in `spec.md`
- Paths are repository-relative

---

## Phase 1: Setup

**Purpose**: a known-green baseline. The feature adds no dependency, configuration or source file.

- [X] T001 Run `npm test` and `npm run build` on the untouched tree and record both results in this task's line (test files and counts; built asset count). Every later checkpoint compares against it — *Baseline 2026-09-25: 44 files passed, 1 skipped / 687 tests passed, 15 skipped; build clean, 23 fingerprinted assets.*

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the offset function and the test scaffolding both stories use.

- [X] T002 In `src/public/pollCard.js`, add `function paletteOffsetFor(pid)` directly above `assignResultColors`: return `0` when `pid` is not a non-empty string; otherwise 32-bit FNV-1a over `pid.charCodeAt(i)` for each index (start `0x811C9DC5`; per character `h ^= code; h = Math.imul(h, 0x01000193);`), then `(h >>> 0) % RESULTS_COLOR_PALETTE.length`. Its only comment is a link to the FNV reference, `http://www.isthe.com/chongo/tech/comp/fnv/` (research R1, R4, R6; constitution VI)
- [X] T003 [P] In `tests/client-bar-colours.test.ts`, add the test-side reference `paletteStartOf(pid: string): number`, written from the spec (same constants, `Math.imul`, `>>> 0`, `% 50`), not copied from the page; and give `seed(title, labels, votes, id?)` an optional fixed `_id` passed through `makePoll({ _id: id, … })` (research R7)
- [X] T004 In `tests/client-bar-colours.test.ts`, add a case "derives a stable start from the poll id": open `index.html` and read `page.window.paletteOffsetFor`. Assert it equals `paletteStartOf` for the four fixed ids (`poll-fifty` → 25, `poll-agree` → 39, `poll-colours-a` → 40, `poll-colours-b` → 21) and for 1,000 ids `00000000-0000-4000-8000-${i.toString(16).padStart(12, "0")}`; that those 1,000 fill all 50 starts with none used more than 50 times (SC-002); that the first 20 of them give at least 10 different starts (SC-001; 14 measured); and that `undefined`, `""` and `42` give 0 (FR-007). Depends on T002, T003

**Checkpoint**: T004 passes; every pre-existing test still passes (the function is not yet called).

---

## Phase 3: User Story 1 - Each poll has its own colours (Priority: P1) 🎯 MVP

**Goal**: each card's non-Yes/No bars start at the poll's own palette entry and continue in order,
wrapping, with Yes/No unchanged (FR-001–FR-004, FR-008).

**Independent Test**: load Trending with several polls without Yes/No choices; their first bars
differ, and no card repeats a colour (quickstart Q1–Q3).

### Tests for User Story 1

Write these first and see them fail against today's code (which starts every card at entry 0).

- [X] T005 [US1] In `tests/client-bar-colours.test.ts`, rewrite the first case ("takes each palette fill in order …") to seed "Fifty" with the fixed id `poll-fifty` and expect row `i`'s fill to be `palette[(paletteStartOf("poll-fifty") + i) % 50]` (array index `s`; 1-based colour `s + 1`); keep every tint, ink and overlay assertion; add that the 50 fills are 50 distinct colours and that row 25's fill is `palette[0]` (the wrap past entry 50; FR-002, FR-009, SC-004). Rename the case to say the fills start at the poll's own entry
- [X] T006 [US1] In the same file, in the Yes/No/Maybe case, seed with the fixed id `poll-agree` and expect Maybe's fill and tint from `palette[paletteStartOf("poll-agree")]` instead of `palette[0]`; Yes and No assertions stay as they are (FR-004)
- [X] T007 [US1] In the same file, add "starts different polls at different entries": seed `poll-colours-a` and `poll-colours-b`, each with choices "Alpha", "Beta", "Gamma" and no votes; on the Trending panel, find each card as the `.card-viewport` whose `.question` text is the seeded title, read that card's `.results-list > .result-row` fills, and assert each card's fills are `palette[(start + i) % 50]` and that the two cards' first fills differ (SC-001, FR-001)

### Implementation for User Story 1

- [X] T008 [US1] In `src/public/pollCard.js`, change `assignResultColors(data)` to `assignResultColors(data, paletteOffset)` with `let paletteIndex = paletteOffset;`. In the in-body comment above the `return RESULTS_COLOR_PALETTE[…]` line, keep its first clause (only choices that reach here consume a palette entry) and remove the two statements the change makes false: that Maybe "gets palette color 1, not 3", and that the modulo "can't actually wrap". Leave the block comment above `renderPollResults`/`assignResultColors` and the one describing the whole-dataset pass untouched, since both stay true; add no comment that restates the code (research R3, R6; constitution III). Depends on T002
- [X] T009 [US1] In `src/public/pollCard.js`, add a last parameter `paletteOffset` to `renderPollResults(wrap, list, upRow, downRow, data, layoutFor, paletteOffset)` and pass it to `assignResultColors(data, paletteOffset)`; in `initPollCard`, add `const paletteOffset = paletteOffsetFor(opts.pid);` beside `let layoutFor = measuredBarLayout;`, and pass it from `render()`. `renderVotingOptions` is unchanged (research R2). Depends on T008
- [X] T010 [US1] Run `npx vitest run tests/client-bar-colours.test.ts tests/client-maximized.test.ts tests/poll-card-assets.test.ts`: T004–T007 pass, and the "No overtakes Yes" case still passes unchanged — *2026-09-25: 3 files, 99 tests passed; the "No overtakes Yes" case passes unchanged.*

**Checkpoint**: US1 complete; cards are coloured from their own start.

---

## Phase 4: User Story 2 - A poll's colours never change (Priority: P1)

**Goal**: the same poll shows the same colours in the grid and maximized, across reloads, and keeps
its colour sequence through a reorder (FR-003, FR-005).

**Independent Test**: note a card's colours, maximize it, reload, compare (quickstart Q4–Q7).

### Tests for User Story 2

- [X] T011 [US2] In `tests/client-bar-colours.test.ts`, add "keeps a poll's colours when maximized and after a reload": seed `poll-colours-a` with "Alpha", "Beta", "Gamma", open `index.html`, find the Trending card as the `.card-viewport` whose `.question` text is the seeded title, record its `.results-list > .result-row` fills, click its `.maximize-btn` (as `tests/client-maximized.test.ts` does), and assert the `.maximized-card-grid` card's fills are the same list; close the page, open `index.html` again and assert the grid card's fills are still the same list (FR-005, SC-003)
- [X] T012 [US2] In the same file, add "keeps the colour sequence when non-Yes/No choices swap": seed the fixed id `poll-swap` (start 36) with "Alpha", "Beta" and votes `[3, 1]`, record the fills top to bottom, add votes so Beta leads (as the existing "No overtakes Yes" case drives its refresh), wait for the refresh, and assert the fills top to bottom are the same list (`palette[36]`, `palette[37]`) while the labels have swapped (FR-003)

### Implementation for User Story 2

- [X] T013 [US2] Run `npx vitest run tests/client-bar-colours.test.ts`. T011 and T012 are expected to pass on US1's code alone (the maximized view moves the same card instance, and colours follow display order); if either fails, fix the cause in `src/public/pollCard.js` and record it in this line — *2026-09-25: 7 of 7 pass on US1's code alone; no fix needed.*

**Checkpoint**: US1 and US2 complete.

---

## Phase 5: Polish & cross-cutting concerns

- [X] T014 [P] Update `README.md` in place: the "Result colours" bullet says each poll's bars take their own run of colours from the palette, the same for that poll wherever it appears, with Yes and No still green and red. No references to `specs/`, `designDocs/`, `architecture/` or `research/` (constitution Documentation Deliverables)
- [X] T015 [P] Update `ARCHITECTURE.md` in place, section "Result bar colours": replace "taken in bar order" with the start rule (`paletteOffsetFor`: FNV-1a of the poll id, mod 50, computed once per card; bars take consecutive entries from there in display order, wrapping; Yes/No consume none). No spec references
- [X] T016 [P] In `specs/021-MAXIMIZED-POLL-CARD/contracts/ui-contracts.md`, annotate the "Palette" row: the starting entry is now per poll; see `specs/022-BAR-COLORS/contracts/ui-contracts.md` C1 (FR-010)
- [X] T017 Run `npm test` and `npm run build`; compare with T001. Every pre-existing test passes except the assertions T005 and T006 rewrote; record file and test counts and the asset count here. `git grep -nE "FR-0|T0[0-9]{2}\b|022-|BAR-COLORS" -- src` returns nothing new (constitution VI). `git diff --stat -- src` touches only `src/public/pollCard.js` (plan: no server change) (SC-006) — *2026-09-25: 44 files passed, 1 skipped / 691 tests passed, 15 skipped (baseline 687 + 4 new cases; T005/T006 rewrote existing assertions in place); build clean, 23 assets. The spec-reference grep over the added `src/` lines finds nothing; `git diff --stat -- src` shows only `src/public/pollCard.js` (+18 −9).*
- [X] T018 Walk `specs/022-BAR-COLORS/quickstart.md` Q1–Q9 in a real browser (restart `npm run dev` first; it caches page HTML). Record any discrepancy as a FIX item for `/speckit-fix` — *2026-09-25: walked by the developer in a real browser; Q1–Q9 all pass, no discrepancies, so `fix.md` has no fixes.*

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: none
- **Foundational (Phase 2)**: T002 ‖ T003; T004 after both. **Blocks both stories**
- **US1 (Phase 3)**: after Phase 2. T005 → T006 → T007 (same file), written before T008. T008 → T009 (same file). T010 last
- **US2 (Phase 4)**: after US1 (its tests exercise US1's code). T011 → T012 (same file). T013 last
- **Polish (Phase 5)**: T014 ‖ T015 ‖ T016 any time after T009; T017 after everything else; T018 last

### User story dependencies

- **US1**: depends only on the foundational phase
- **US2**: depends on US1; it adds proof, not code

### Parallel opportunities

- T002 (`pollCard.js`) ‖ T003 (test file)
- T005–T007 (test file) can be written while T008–T009 (`pollCard.js`) are made
- T014 ‖ T015 ‖ T016 (three documentation files)

## Parallel example: Foundational and User Story 1

```text
# Together:
T002  src/public/pollCard.js           paletteOffsetFor
T003  tests/client-bar-colours.test.ts paletteStartOf + seed(id)

# Then, together:
T005–T007  tests/client-bar-colours.test.ts  (tests, failing first)
T008–T009  src/public/pollCard.js             (offset through the renderer)
```

## Implementation strategy

### MVP first

Phases 1–3: T001–T010. After T010 every card starts at its own palette entry, which is the feature's
visible value; stop and check Q1–Q3 in a browser if wanted.

### Incremental delivery

1. Setup + Foundational → the function exists and is proved (T004)
2. US1 → cards recoloured (MVP)
3. US2 → stability proved (T011–T013)
4. Polish → documentation, full suite, manual walk

## Notes

- 18 tasks: Setup 1, Foundational 3, US1 6, US2 3, Polish 5
- The source change is about fifteen lines in one file; everything else is tests and documentation
- Commit after each phase, or as one commit at the end; nothing here changes the server
