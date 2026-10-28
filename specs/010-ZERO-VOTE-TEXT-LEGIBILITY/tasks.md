---

description: "Task list for 010-ZERO-VOTE-TEXT-LEGIBILITY implementation"
---

# Tasks: Zero-Vote / Low-Fill Result Text Legibility

**Input**: Design documents from `/specs/010-ZERO-VOTE-TEXT-LEGIBILITY/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md, quickstart.md

**Tests**: Test tasks ARE included, but deliberately narrow, following the precedent set
by 008/009: automated coverage is limited to asserting that the served `/pollCard.js`
carries the new `RESULTS_TRACK_COLOR` constant — extending the existing
`tests/poll-card-assets.test.ts`. There are no unit or browser tests by design; behavior
is verified manually via `quickstart.md`.

**Organization**: This feature has **one algorithmic core, not two**. Unlike 009 (where
US1's semantic-color logic and US2's palette-cursor logic were genuinely separate
branches of one function), 010's majority-coverage calculation handles the 0%-votes case
(User Story 1) and the general low-to-mid-percentage case (User Story 2) as the *same
comparison* — 0% is simply the case where the fill/track boundary sits at position 0, so
every element resolves to majority-track. There is no way to implement one story without
the other. So Phase 2 (Foundational) delivers the entire algorithm, and the User Story
phases below are **verification-only** — this is stated honestly rather than inventing
an artificial implementation split.

## ⚠️ Read before starting

Two findings from Phase 0 drive this list:

1. **Reuse `applyTruncation`'s existing reflow — do not add a second measurement
   pass.** `applyTruncation` (`src/public/pollCard.js` ~line 510) already forces a
   layout reflow every render to read real row width and label width for truncation.
   The whole point of [research.md R1](./research.md) is that the new coverage
   calculation piggybacks on that same pass instead of introducing an independent one.
   Adding a second `getBoundingClientRect`/`scrollWidth` call site elsewhere in the file
   would silently violate FR-003b/SC-005 even if the visual result looked correct.
2. **`textStyleFor` itself does not change.** Per [research.md R3](./research.md), the
   fix is entirely about which hex gets fed into the existing function, per element —
   not a new ink/halo mechanism. Resist the urge to add a "track mode" branch inside
   `textStyleFor`.
3. **The in-place update path is not proven safe by argument alone — see quickstart.md
   Q9 ⚠️ MANDATORY.** research.md R4 argues both render paths converge on
   `applyTruncation`, so they can't diverge — but 009-POLL-CHOICE-COLORS's R1 defect was
   the same kind of "they share a code path" assumption, proven wrong for a different
   part of this same file. T013 exists specifically to check this empirically rather
   than trust the argument (FR-006).

One process note carried over from 007/008/009: run `node --check src/public/pollCard.js`
after every edit. The file contains a large template literal (`POLL_CARD_TEMPLATE`,
~line 1000), and a stray backtick elsewhere in the file has silently terminated it
before — **`npm run build` did not catch it** in that instance.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Include exact file paths in descriptions

## Path Conventions

Single project, existing layout (plan.md § Project Structure). This feature touches
exactly two files: `src/public/pollCard.js` and `tests/poll-card-assets.test.ts`. No CSS
changes — `RESULTS_TRACK_COLOR` is a JS constant that mirrors, not modifies, `--track` in
`src/public/pollCard.css`.

---

## Phase 1: Setup

**Purpose**: Establish a known-good baseline so any regression, and any *new* forced
reflow, is attributable.

- [X] T001 Confirm baseline before editing, from the repository root: `npm test` passes and `node --check src/public/pollCard.js` is clean; also run `grep -n "getBoundingClientRect\|scrollWidth" src/public/pollCard.js` and save the output — this is the "before" list T011 compares against to confirm no new call site was added outside `applyTruncation`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement the entire per-element majority-coverage ink algorithm. This is
not scaffolding for later phases — per the Organization note above, this phase delivers
both user stories at once; Phases 3 and 4 only verify the two halves of what this phase
built.

**⚠️ CRITICAL**: No verification work in Phase 3/4 is meaningful until this phase is
complete.

- [X] T002 Add `const RESULTS_TRACK_COLOR = '#DDE1D6';` to `src/public/pollCard.js` as a module-scope constant near the existing color constants (e.g. beside `SEMANTIC_AFFIRMATIVE_COLOR`/`SEMANTIC_NEGATIVE_COLOR`, ~line 120), with a comment noting it MUST stay in sync with `--track` in `src/public/pollCard.css` — it is read into JS rather than looked up from CSS specifically to avoid an added DOM read (research.md R1/R3, data-model.md)
- [X] T003 In `applyTruncation` (`src/public/pollCard.js` ~line 510), inside the existing `rows.forEach` pass, add a read of `row.querySelector('.result-pct').scrollWidth` alongside the existing `row.getBoundingClientRect().width` and `label.scrollWidth` reads — this is the one new read inside the already-forced reflow (research.md R1, FR-003b)
- [X] T004 In both `data.map((item, i) => {...})` calls that build the `rows` array consumed by `applyTruncation` (`src/public/pollCard.js` ~line 550 in-place branch, ~line 597 rebuild branch), extend each returned row record to also carry `pct: item.pct` and `color: colors[i]` — the inputs `applyTruncation` needs to compute the fill/track boundary and to know each row's assigned fill color (data-model.md Element span; note the rebuild branch's existing `pct` field already holds `item.pct` for the fill-width animation, so only the in-place branch strictly needs a new field, but add it to both explicitly so `applyTruncation` doesn't depend on which branch called it)
- [X] T005 In `applyTruncation` (`src/public/pollCard.js` ~line 510), after the existing width reads (T003) and the existing truncation decision, compute `fillEdgeX = rowWidth * (pct / 100)`, then for the label and (independently) for the percentage figure: derive its rendered span (label: `[pad, pad + effectiveLabelWidth]`, where `effectiveLabelWidth` is the post-truncation `maxWidth` when truncated this pass, else the natural `scrollWidth`; percentage figure: `[rowWidth - pad - pctWidth, rowWidth - pad]`), compare that span's fill-overlap against its total width per the majority rule in [research.md R2](./research.md) (ties resolve to `'fill'`), and call the existing `textStyleFor(...)` with either `color` (fill wins) or `RESULTS_TRACK_COLOR` (track wins) — then set that element's `.style.color`/`.style.textShadow` from the result (FR-001, FR-002, FR-003, FR-003a)
- [X] T006 Remove the now-redundant per-row `textStyleFor(color)` call and the label/percentage `.style.color`/`.style.textShadow` assignments from both `data.map(...)` loops in `renderPollResults` (`src/public/pollCard.js` ~line 550–579 in-place branch, ~line 597–625 rebuild branch) — ink is now applied exclusively inside `applyTruncation` (T005); leave `.result-fill`'s own `style.background` and `style.width` assignments untouched, they are unaffected by this feature (FR-007)
- [X] T007 Verify Phase 2 compiles and runs without error: `node --check src/public/pollCard.js`, `npm run build`, then load the poll grid with at least one 0-vote poll and one voted poll and confirm no console errors — full visual/legibility confirmation happens in Phases 3–4, this is only a smoke check

**Checkpoint**: Every result row's label and percentage figure now derive ink
independently from real, measured fill/track coverage. Both user stories are
functionally complete; only verification remains.

---

## Phase 3: User Story 1 - Result text is legible on a poll nobody has voted on yet (Priority: P1) 🎯 MVP

**Goal**: At 0 votes, every label and percentage figure across all 52 assignable colors
reads with legible (dark, `#1A1A1A`) ink against the track — not just the colors that
happened to work by coincidence before this feature.

**Independent Test**: Create a poll mixing a "light bucket" pair (e.g. `Yes`/`No`) with
"dark bucket" palette choices (e.g. `Maybe`/`Undecided`), leave it at 0 votes, and
confirm every label/percentage pair is equally legible — quickstart scenarios Q1, Q4, Q5.

- [X] T008 [US1] Verify User Story 1 against `quickstart.md` scenarios **Q1** (zero votes: every element reads track ink, `#1A1A1A`, on all four choices of a mixed poll, plus the all-palette Poll B check folded into Q1), **Q4** (live transition from 0% to a non-zero percentage has no flash of illegible text and no unwanted rebuild/re-animation), and **Q5** (spot-check across a range of the 52 colors at 0 votes, one uniform rule per FR-005) (SC-001, SC-003)

**Checkpoint**: The reported defect is fully verified fixed — **except MVP completion
also requires T013 (`quickstart.md` Q9, MANDATORY, FR-006)**, not just this task. Q4
here only checks one live transition doesn't flash; it does not check that the in-place
path's *result* matches a fresh load, which is what Q9/T013 exists for and 009's R1
history is exactly why that distinction matters.

---

## Phase 4: User Story 2 - The percentage figure stays legible for as long as it sits on the unfilled track (Priority: P2)

**Goal**: The percentage figure's ink is decided by its own majority coverage,
independent of the label's, at any percentage — not only exactly 0%.

**Independent Test**: Vote a "dark bucket" choice to a low-to-mid percentage (e.g. 20%)
and confirm the percentage figure (right-anchored, still majority-track at that level)
is legible even while the label (left-anchored, majority-fill by then) shows the
opposite ink — quickstart scenarios Q2, Q3, Q6.

- [X] T009 [US2] Verify User Story 2 against `quickstart.md` scenarios **Q2** (label and percentage ink can differ on the same row), **Q3** (percentage figure specifically stays legible at low-to-mid percentages, including its straddle/tie-break sub-check per Acceptance Scenario 2.2), and **Q6** (no regression at/near 100%, where both elements are already majority-fill, FR-004) (SC-002, SC-004)

**Checkpoint**: Both stories verified. Full feature behavior confirmed correct across
the whole percentage range.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T010 [P] Extend `tests/poll-card-assets.test.ts` with a `010-ZERO-VOTE-TEXT-LEGIBILITY` describe block asserting the served `/pollCard.js` contains `RESULTS_TRACK_COLOR` and the literal value `#DDE1D6` — following the existing `expect(res.text).toContain(...)` pattern, with a comment noting this guards the constant only and cannot detect a coverage-calculation defect
- [X] T011 Verify no new forced reflow (FR-003b, SC-005, contract C5): re-run `grep -n "getBoundingClientRect\|scrollWidth" src/public/pollCard.js` and diff against the T001 baseline — confirm the only new match is the one added in T003, and it is inside `applyTruncation`
- [X] T012 Run `quickstart.md` **Q7** (code-inspection reflow check, same grep as T011 framed as a quickstart scenario) and **Q8** (no collateral change: `.result-fill` background/width unaffected, 009's trailing-edge `box-shadow` still present, bar sizing/truncation/scroll/sort/animation unaffected, back face untouched and never reads `RESULTS_TRACK_COLOR`) (FR-007, FR-008)
- [X] T013 Run `quickstart.md` **Q9 — MANDATORY** (FR-006): with a poll open in one tab, cast votes from a second browser profile until a row crosses the fill/track majority boundary, let the first tab pick it up via live refresh (no reload), then compare its `inkCheck()` output against a **freshly opened** tab on the same poll state — confirm they match exactly, for every row
- [X] T014 Run the contrast verification script at the end of `quickstart.md` and confirm it reports `track luminance: 0.7408 -> ink: #1a1a1a -> contrast: 13.11:1` and `PASS: track ink >= 4.5:1` (SC-001)
- [X] T015 Run `npm test`, `npm run build`, and `npx tsc --noEmit` from the repository root; all must pass
- [X] T016 Confirm scope with `git diff --stat`: only `src/public/pollCard.js` and `tests/poll-card-assets.test.ts` may appear — no CSS file changes, no palette/semantic-color changes, no changes outside `renderPollResults`/`applyTruncation` (Principle III)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately
- **Foundational (Phase 2)**: depends on T001 — **delivers the entire feature**; both
  user stories depend on it completing
- **User Story 1 (Phase 3)** and **User Story 2 (Phase 4)**: both depend only on Phase 2;
  neither depends on the other, since both are verification of the same underlying
  algorithm from two different angles (0% specifically vs. the general case)
- **Polish (Phase 5)**: depends on Phases 3 and 4, except T010 which may start any time
  after T002 (it only needs the constant to exist). **T013 (Q9, MANDATORY) is not
  optional polish** — per the Phase 3 checkpoint note, MVP completion depends on it
  alongside T008, even though it's listed in Phase 5 for its cross-cutting scope
  (neither story alone owns render-path parity)

### Task-Level Dependencies

- T002 (constant) and T003 (new read) are independent of each other, but both must
  complete before T005 (the calculation that consumes them)
- T004 (plumb `pct`/`color` into row records) must complete before T005 (the
  calculation reads them from the row record)
- T003, T004 → T005 → T006 (remove the old call only after the new one is proven in
  place) → T007 (smoke check needs the whole phase done)
- T007 → T008, T009, T013 (all verification needs a working build; T013 does not
  additionally depend on T008/T009 finishing, though doing it after them is the natural
  order)
- T001 → T011 (the "before" comparison needs a baseline)
- T011 → T012 (Q7 restates T011 against the quickstart scenario numbering)

### Parallel Opportunities

**This feature has almost no parallelism**, for the same reason it has no
implementation split between user stories: nearly everything is one algorithm inside one
function, in one file.

- **T010** is the only genuinely parallel task — it edits `tests/poll-card-assets.test.ts`,
  a different file from every other task, and only depends on T002 (the constant)
  existing. It could start as soon as T002 lands, alongside the rest of Phase 2.
- Everything else is sequential: T002–T007 build on each other inside the same two
  functions, and T008/T009/T011–T016 are verification passes over the finished result
  rather than independent units of work.

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 (T001) — baseline, including the reflow-call-site snapshot
2. Phase 2 (T002–T007) — the entire algorithm; there is no smaller foundational slice
3. Phase 3 (T008) — verify the 0-votes case
4. T013 (Q9, MANDATORY) — confirm the in-place refresh path matches a fresh load; per
   the Phase 3 checkpoint, this is required before the MVP is actually done, not
   optional polish, even though it's grouped with Phase 5 for its cross-cutting scope
5. **STOP and VALIDATE**: quickstart Q1, Q4, Q5, Q9
6. At this point every poll is legible at 0 votes — the feature's core reported value.
   Phase 4's general-percentage case is *already implemented* at this point (it's the
   same algorithm), just not yet separately verified.

### Incremental Delivery

1. Phase 1 → Phase 2 → both stories functionally complete simultaneously (this feature
   does not have 009's "MVP then extend" shape)
2. Phase 3 + T013 → confirms the reported defect, including render-path parity (MVP,
   demoable)
3. Phase 4 → confirms the wider percentage-figure case the same algorithm also fixed
4. Phase 5 (remaining) → asset guard, reflow-absence proof, contrast verification, full
   sweep

### Suggested commit points

- After T007 (the whole algorithm — a clean, revertible commit)
- After T009 and T013 (both stories verified, including render-path parity)
- After T016 (fully validated)

---

## Notes

- `[P]` tasks = different files, no dependencies (here: only T010)
- Run `node --check src/public/pollCard.js` after **every** edit to that file — `npm run
  build` will not catch a broken template literal
- Do not add a second `getBoundingClientRect`/`scrollWidth` call site anywhere in the
  file outside `applyTruncation` (research.md R1) — that would silently reintroduce the
  reflow cost this feature's design specifically avoids
- `textStyleFor` and `assignResultColors` are not modified by this feature — only which
  hex is passed into `textStyleFor`, and where that call happens, changes
- The palette, the two semantic colors, and the 009-POLL-CHOICE-COLORS trailing-edge
  rule are not touched by this feature
- Commit after each task or logical group; stop at any checkpoint to validate
