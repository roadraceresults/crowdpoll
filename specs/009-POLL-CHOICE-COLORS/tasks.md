---

description: "Task list for 009-POLL-CHOICE-COLORS implementation"
---

# Tasks: Poll Choice Colors

**Input**: Design documents from `/specs/009-POLL-CHOICE-COLORS/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md, quickstart.md

**Tests**: Test tasks ARE included, but deliberately narrow. Per spec.md's clarification
session (2026-08-15), automated coverage is limited to asserting that the served
`/pollCard.js` carries the required constants — extending the existing
`tests/poll-card-assets.test.ts`. There are no unit or browser tests by design; behavior
is verified manually via `quickstart.md`. See [research.md R6](./research.md) for the
accepted limitation this creates.

**Organization**: Tasks are grouped by user story. Both stories modify the same function
in the same file, so they are **sequential, not parallel** — this is stated honestly
below rather than papered over with fake `[P]` markers.

## ⚠️ Read before starting

Two findings from Phase 0 drive the ordering of this list:

1. **The in-place update path will invert Yes/No colors unless fixed** — see
   [research.md R1](./research.md). It is handled in Phase 2 (T003) because both stories
   depend on it, and it is the defect most likely to ship silently. Quickstart **Q3 is
   mandatory** and is the only check that can catch it.
2. **The word-matching regexes must not carry the `g` flag** — a module-scope `/…/gi`
   retains `lastIndex` across `.test()` calls and would produce order-dependent colors
   ([research.md R3](./research.md)).

One process note carried over from `008`: run `node --check src/public/pollCard.js` after
every edit. That file contains a large template literal (`POLL_CARD_TEMPLATE`), and in
008 a stray backtick inside a comment silently terminated it — **`npm run build` did not
catch it**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Include exact file paths in descriptions

## Path Conventions

Single project, existing layout (plan.md § Project Structure). This feature touches
exactly three files: `src/public/pollCard.js`, one added rule in `src/public/site.css`,
and `tests/poll-card-assets.test.ts`. `src/public/pollCard.css` stays untouched.

---

## Phase 1: Setup

**Purpose**: Establish a known-good baseline so any regression is attributable.

- [X] T001 Confirm baseline before editing: `npm test` passes (13 files / 143 tests) and `node --check src/public/pollCard.js` is clean, from the repository root

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Move color assignment from a per-index lookup to a whole-dataset pass, and
make **both** render paths apply it. This phase is deliberately **behavior-preserving** —
when it is done the card must look exactly as it does today.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. T003 in
particular is the [R1](./research.md) fix; without it US1's FR-009 fails silently.

- [X] T002 Replace `getResultColor(index)` (~line 204) with `assignResultColors(data)` in `src/public/pollCard.js`, returning a hex array index-parallel to the sorted dataset and, for now, drawing purely from `RESULTS_COLOR_PALETTE` by position; update the sole call site in the rebuild branch (~line 493) to read `colors[i]` instead
- [X] T003 In the in-place update branch of `renderPollResults` (~lines 461–478) in `src/public/pollCard.js`, reapply each row's color on every update — set `.result-fill` background and both `.result-label` and `.result-pct` `color`/`textShadow` from `textStyleFor(colors[i])` — and replace the now-false invariant comment at ~line 466 that states color never changes on an in-place update
- [X] T004 Verify Phase 2 changed nothing visually: run `node --check src/public/pollCard.js`, `npm run build`, then load the poll grid and confirm bar colors, ordering, and the fill grow-in animation are identical to the pre-change baseline (no flicker or re-animation on a live refresh) — confirmed via full manual quickstart.md walkthrough, 2026-08-19

**Checkpoint**: Both render paths now compute and apply colors from one shared function,
with no user-visible change yet.

---

## Phase 3: User Story 1 - Affirmative and negative choices are instantly recognizable (Priority: P1) 🎯 MVP

**Goal**: Labels reading as "yes" render `#43F781`; labels reading as "no" render
`#FC9E9E`; both stay attached to their label across live reorders and stay legible.

**Independent Test**: Create a poll with choices `Yes` and `No`, vote so each leads in
turn, and confirm the colors follow the labels rather than the positions — quickstart
scenarios Q1, Q3, Q4, Q5, Q8.

### Implementation for User Story 1

- [X] T005 [US1] Add module-scope semantic constants to `src/public/pollCard.js` near the palette definitions: `#43F781` and `#FC9E9E`, the affirmative word regex `/(?<![a-z])(?:yes|true|correct|agree|yay)(?![a-z])/i`, the negative word regex `/(?<![a-z])(?:no|false|incorrect|disagree|nay)(?![a-z])/i`, and the exact-label lists `['y','yup']` and `['n','nope']` — **no `g` flag on either regex** (research.md R3). Regex amended 2026-08-19 to a letters-only boundary (was `\b`-based, which treated digits/underscore as word characters) and again to add `yay`/`nay`; see spec.md Clarifications Session 2026-08-19.
- [X] T006 [US1] Add `semanticColorFor(label)` to `src/public/pollCard.js`: coerce a null/undefined/non-string label to `''`, trim it, test the affirmative rule first (word regex OR exact-label match, case-insensitive) then the negative rule, and return `null` when neither matches — affirmative-first precedence per FR-002, so `"Yes and no"` returns `#43F781`
- [X] T007 [US1] Wire `semanticColorFor` into `assignResultColors` in `src/public/pollCard.js` so a semantic match returns its color immediately **without advancing the palette cursor** (FR-001, FR-002, FR-009)
- [X] T008 [US1] Lower the ink threshold in `textStyleFor` (~line 224) in `src/public/pollCard.js` from `luminanceOf(hex) > 0.55` to `> 0.40`, and update the adjacent comment to record why (FR-011a: `#FC9E9E` at luminance 0.476 would otherwise take white ink at 2.00:1; dark ink reaches 8.72:1; no palette color changes because all 50 sit at or below 0.163)
- [X] T009 [US1] Add a trailing-edge rule for `.result-fill` to `src/public/site.css` — `box-shadow:inset -2px 0 0 rgba(0,0,0,0.55)` — with a comment citing FR-012 and the measured ratios. **Put this in `site.css`, not `pollCard.css`**: the latter is the untouched reference stylesheet and app-owned rules belong in `site.css`, the convention 007 and 008 both followed (FR-012, FR-012a)
- [X] T010 [US1] Verify User Story 1 against `quickstart.md` scenarios **Q1** (basic colors), **Q3 — MANDATORY** (live reorder keeps colors with labels; also confirm no flicker/re-animation), **Q4** (case insensitivity and exact rules), **Q5** (duplicate colors allowed), **Q8** (both bars use dark ink `#1A1A1A`; palette bars still white), and **Q11** (fill boundary visible at 30% and 70%) (SC-001, SC-007, SC-008) — passed 2026-08-19, including the `yay`/`nay` additions to Poll D and the letters-only boundary rule

**Checkpoint**: Semantic coloring is fully functional and independently demonstrable. This
is the MVP.

---

## Phase 4: User Story 2 - Remaining choices keep distinct, stable palette colors (Priority: P2)

**Goal**: Every non-semantic choice takes the next palette entry in display order, with
the cursor skipping semantically colored choices and never exhausting the palette.

**Independent Test**: A `Yes/No/Maybe/Undecided` poll gives `Maybe` and `Undecided`
palette entries **1 and 2**, not 3 and 4; a 50-choice poll with no trigger words consumes
entries 1–50 in order with no gaps — quickstart scenarios Q2, Q6, Q7.

**Note on independence**: US2 edits the same `assignResultColors` function as US1, so it
cannot be developed in parallel with Phase 3. It is separately *verifiable* — the palette
branch and its cursor semantics are distinct observable behavior — but not separately
*deliverable*.

### Implementation for User Story 2

- [X] T011 [US2] In `assignResultColors` in `src/public/pollCard.js`, confirm the non-semantic branch draws from a cursor that advances only for choices reaching it, indexed modulo `RESULTS_COLOR_PALETTE.length` so the expression stays total, producing no gaps and no repeats at any choice count up to 50 (FR-007, SC-005)
- [X] T012 [US2] Verify User Story 2 against `quickstart.md` scenarios **Q2** (semantic choices do not consume palette entries), **Q6** (word boundaries: `Agreement`/`Y or N` take palette colors with no gaps, `Agree2`/`yes_please`/`No1` now match semantically per the 2026-08-19 boundary amendment, `Yes and no` is green), and **Q7** (50 choices — palette entries 1–50 in order, every bar colored) (SC-002, SC-003) — passed 2026-08-19

**Checkpoint**: Both stories functional. Full feature behavior is in place.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T013 [P] Extend `tests/poll-card-assets.test.ts` with a `009-POLL-CHOICE-COLORS` describe block asserting the served `/pollCard.js` contains `#43F781`, `#FC9E9E`, and the `0.40` ink threshold, and that the served `/site.css` carries the `.result-fill` edge rule — following the existing `expect(res.text).toContain(...)` pattern, with a comment noting these guard the constants only and cannot detect the R1 defect (research.md R6)
- [X] T014 [P] Add an assertion to `tests/poll-card-assets.test.ts` that the served `/pollCard.js` carries at least `MAX_CHOICES` palette entries, importing the limit from `../src/polls/service.js` so the palette size and the choice cap cannot silently diverge (FR-008)
- [X] T015 Update the RESULTS-MODE doc comment above `assignResultColors` (~lines 196–202) in `src/public/pollCard.js` so it describes the semantic-then-palette rule instead of the old palette-by-position rule
- [X] T016 Run the complete `quickstart.md` suite Q1–Q11, including **Q9** (back face unchanged: rows show `#F1F3EE`/`#E4D3AE`, neither semantic color appears) and **Q10** (no collateral change to sizing, truncation, scroll arrows, sort order, or animation) (SC-006) — passed 2026-08-19
- [X] T017 Run the contrast verification snippet at the end of `quickstart.md` and confirm both lines pass — `all 52 colors >= 4.5:1` and `all 52 fill boundaries legible`, split 50 by fill contrast / 2 by the edge (SC-004, SC-008)
- [X] T018 Run `npm test`, `npm run build`, and `npx tsc --noEmit` from the repository root; all must pass
- [X] T019 Confirm scope with `git diff --stat`: only `src/public/pollCard.js`, `src/public/site.css`, and `tests/poll-card-assets.test.ts` may appear — `src/public/pollCard.css` stays untouched (it is the reference stylesheet; app-owned rules belong in `site.css`), and no palette entries change (Principle III)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately
- **Foundational (Phase 2)**: depends on T001 — **BLOCKS both user stories**
- **User Story 1 (Phase 3)**: depends on Phase 2 complete
- **User Story 2 (Phase 4)**: depends on Phase 3 complete (same function — see note above)
- **Polish (Phase 5)**: depends on Phases 3 and 4, except T013 and T014 which may start
  any time

### Task-Level Dependencies

- T002 → T003 (the in-place branch consumes the array T002 introduces)
- T003 → T004 (verification needs both plumbing edits)
- T005 → T006 → T007 (constants, then matcher, then wiring)
- T007 → T011 (both branches of the same function; semantic branch first)
- T008 and T009 are independent of T005–T007 and of each other; either may be done at any
  point in Phase 3 (T008 edits `pollCard.js`, T009 edits `site.css`)
- T009 → T010 (Q11 cannot pass before the edge rule exists)
- T015 → after T007 (the comment must describe the final rule)
- T016–T019 last

### Parallel Opportunities

**This feature has very little parallelism, and that is a property of the work, not an
oversight.** Most of the 19 tasks touch `src/public/pollCard.js`, and several touch the
same two functions within it.

- **T013 and T014** are the genuinely parallel tasks — both edit
  `tests/poll-card-assets.test.ts` and neither depends on the source edits, since they
  assert on constants already fixed by the spec. Both are marked `[P]`. They touch the
  same file as each other, so run them as one unit of work rather than concurrently.
- **T009** edits `src/public/site.css` while T005–T008 edit `pollCard.js`, so it could run
  alongside them, but it is small enough that sequencing costs nothing.
- Everything else is sequential. Assigning two developers to Phases 3 and 4 concurrently
  would produce conflicting edits to `assignResultColors`.

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 (T001) — baseline
2. Phase 2 (T002–T004) — plumbing, behavior-preserving
3. Phase 3 (T005–T010) — semantic colors
4. **STOP and VALIDATE**: quickstart Q1, Q3, Q4, Q5, Q8, Q11. Q3 is mandatory.
5. At this point a Yes/No poll reads correctly at a glance — the feature's core value.

Non-semantic polls already work through Phase 2's palette-by-position path, so stopping
after the MVP leaves no poll broken.

### Incremental Delivery

1. Phase 2 → nothing changes visually; the refactor is verified in isolation
2. Phase 3 → semantic colors appear (MVP, demoable)
3. Phase 4 → palette-skip semantics confirmed across mixed and high-count polls
4. Phase 5 → asset guards, comment accuracy, full validation sweep

### Suggested commit points

- After T004 (behavior-preserving refactor — a clean, revertible commit)
- After T010 (MVP)
- After T012 (feature complete)
- After T019 (validated)

---

## Notes

- `[P]` tasks = different files, no dependencies (here: T013 and T014)
- CSS rules for this feature go in `src/public/site.css`, never `src/public/pollCard.css`
  — the latter is the untouched reference stylesheet (the convention 007 and 008 followed)
- `[Story]` label maps a task to its user story for traceability
- Run `node --check src/public/pollCard.js` after **every** edit to that file — `npm run
  build` will not catch a broken template literal
- Do not add the `g` flag to either word regex (research.md R3)
- Do not write assigned colors onto items in the shared dataset — both faces read it, and
  a mutation there would leak into the back face (research.md R5)
- The palette itself is not modified by this feature; its recolor was completed
  beforehand
- Commit after each task or logical group; stop at any checkpoint to validate
