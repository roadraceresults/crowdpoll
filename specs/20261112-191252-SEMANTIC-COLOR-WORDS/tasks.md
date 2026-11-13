# Tasks: Semantic Color Words

**Input**: Design documents from `specs/20261112-191252-SEMANTIC-COLOR-WORDS/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R6), data-model.md, contracts/ui.md, quickstart.md

**Tests**: requested (FR-011). Each story writes its test cases first; they fail before the implementation task that
follows.

**Organization**: by user story; every task names its file.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1, US2, US3 (spec.md)

---

## Phase 1: Setup

None: no dependency, setting or script is added.

---

## Phase 2: Foundational (blocks every story)

- [X] T001 In `tests/poll-card-assets.test.ts`, inside `describe("pollCard.js choice colours")`, add a helper that fetches `/pollCard.js`, takes the text from `const SEMANTIC_AFFIRMATIVE_COLOR` up to and including the first `\n}\n` after `function semanticColorFor` (the function's closing brace), and returns `semanticColorFor` built with `new Function` (as the `expandPalette` test does); add a table test of the unchanged labels of contracts/ui.md U4 (`null` for palette, `#006120`, `#F91010`), which passes before any change (R5, SC-002)

**Checkpoint**: `npx vitest run tests/poll-card-assets.test.ts` passes.

---

## Phase 3: User Story 1 - Approve / disapprove answers are green and red (Priority: P1) 🎯 MVP

**Goal**: approve, approved, approval are green; disapprove, disapproved, disapproval are red.

**Independent Test**: the U1/U2 rows with those six words pass; "Disapprove" is not green; "Approves" and "Approving" stay palette.

- [X] T002 [US1] In `tests/poll-card-assets.test.ts`, add table rows: "Approve", "Strongly approve", "Approved", "Approval rating up", "Approve2", "APPROVE" → green; "Disapprove", "Somewhat disapprove", "Disapproved", "Disapproval" → red; and change the two pinned regex strings to `/(?<![a-z])(?:yes|true|correct|agree|yay|approve|approved|approval)(?![a-z])/i` and `/(?<![a-z])(?:no|false|incorrect|disagree|nay|disapprove|disapproved|disapproval)(?![a-z])/i`; run it and see them fail (contracts/ui.md U1, U2, U4)
- [X] T003 [US1] In `src/public/pollCard.js`, append `|approve|approved|approval` to `AFFIRMATIVE_WORDS` and `|disapprove|disapproved|disapproval` to `NEGATIVE_WORDS`, keeping the lookarounds, the `i` flag and no `g` flag (R2); T002 passes

**Checkpoint**: `npx vitest run tests/poll-card-assets.test.ts` passes.

---

## Phase 4: User Story 2 - Other common scale words are green and red (Priority: P2)

**Goal**: support, favor, favour, accept, yeah, yep, aye are green; oppose, against, reject, nah are red.

**Independent Test**: the remaining U1/U2 rows pass; "Unsupported", "Unacceptable", "Not sure", "Vote for Alice", "I like it", "OK" stay palette.

- [X] T004 [US2] In `tests/poll-card-assets.test.ts`, add rows: "Strongly support", "In favor", "In favour", "Accept", "Yeah", "Yep", "Aye", "support_it", "Customer support" → green; "Oppose", "Against", "Reject", "Nah" → red; "Unsupported", "Unacceptable" → `null`; and extend the two pinned regex strings to the full lists of data-model.md; run it and see them fail (U1, U2, U4)
- [X] T005 [US2] In `src/public/pollCard.js`, append `|support|favor|favour|accept|yeah|yep|aye` to `AFFIRMATIVE_WORDS` and `|oppose|against|reject|nah` to `NEGATIVE_WORDS` (R2); T004 passes

**Checkpoint**: `npx vitest run tests/poll-card-assets.test.ts` passes.

---

## Phase 5: User Story 3 - Neutral middle answers take a palette color (Priority: P3)

**Goal**: neutral words and phrases are tested first and take a palette color.

**Independent Test**: every U3 label gives `null`; "Opinion: no" stays red, "Yes and no" green; in a drawn card a neutral choice uses a palette slot.

- [X] T006 [US3] In `tests/poll-card-assets.test.ts`, add rows: every label of contracts/ui.md U3 (including "No  opinion" with two spaces, "Don’t know" with a curly apostrophe and "NEUTRAL") → `null`; "Opinion: no" → red; and pin `"/(?<![a-z])(?:neither|neutral|undecided|unsure|no +opinion|no +preference|don['’]t +know|do +not +know)(?![a-z])/i"`; run it and see them fail (U3, U4)
- [X] T007 [US3] In `src/public/pollCard.js`, add `const NEUTRAL_WORDS = /(?<![a-z])(?:neither|neutral|undecided|unsure|no +opinion|no +preference|don['’]t +know|do +not +know)(?![a-z])/i;` beside the other two, and in `semanticColorFor` return `null` when it matches, right after the empty-label check and before the positive test (R3, R4); T006 passes
- [X] T008 [P] [US3] In `tests/client-bar-colours.test.ts`, `describe("manual bar colours")`, add a test in the style of "lets a colored non-Yes/No choice use up its palette slot…": a poll with choices "Agree", "Neither agree nor disagree", "Disagree", "Other" and no votes draws green, the poll's first palette entry, red, its second palette entry (U6)

**Checkpoint**: `npx vitest run tests/poll-card-assets.test.ts tests/client-bar-colours.test.ts` passes.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T009 In `src/public/pollCard.js`, update the `SEMANTIC CHOICE COLORS` comment to say a neutral list is tested first and gives a palette color (then affirmative, then negative), and the `RESULTS-MODE` comment's "reads as "yes" or "no"" sentence to mention neutral labels taking a palette entry; no other comment changes (R6)
- [X] T010 [P] In `ARCHITECTURE.md:798`, replace "A label that reads as Yes or No takes `#006120` or `#F91010` instead, and uses up no palette colour." with a sentence naming the three lists (positive words such as yes, agree, approve, support; negative such as no, disagree, disapprove, oppose; neutral such as neither, no opinion, which keep a palette colour), pointing to `semanticColorFor` for the full lists (FR-012)
- [X] T011 Run `npx tsc --noEmit` and `npm test`; all pass
- [ ] T012 Manual: the developer runs quickstart.md steps 1–5

---

## Dependencies & Execution Order

- T001 → T002 → T003 → T004 → T005 → T006 → T007: one test file and one source file, so in sequence.
- T008 needs T007; it touches only `client-bar-colours.test.ts`.
- T009 after T007 (same file); T010 any time; T011 after everything; T012 last.

## Parallel Example

```text
After T007: T008 (client-bar-colours.test.ts) and T010 (ARCHITECTURE.md) together, then T009.
```

## Implementation Strategy

- MVP: Phases 2–3 (the six requested words).
- Then US2 and US3, each a passing checkpoint; Polish last.
