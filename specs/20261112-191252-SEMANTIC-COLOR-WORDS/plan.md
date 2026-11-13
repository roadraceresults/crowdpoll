# Implementation Plan: Semantic Color Words

**Branch**: `main` (no feature branch) | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261112-191252-SEMANTIC-COLOR-WORDS/spec.md`

## Summary

Extend the poll bars' semantic colors in `src/public/pollCard.js`:

- `AFFIRMATIVE_WORDS` gains approve, approved, approval, support, favor, favour, accept, yeah, yep, aye;
  `NEGATIVE_WORDS` gains disapprove, disapproved, disapproval, oppose, against, reject, nah (R2).
- A new `NEUTRAL_WORDS`, tested first in `semanticColorFor`, returns `null` so neither / neutral / undecided / unsure /
  no opinion / no preference / don't know / do not know take a palette color (R3, R4).
- `assignResultColors`, the colors, the palette and hand-picked colors are unchanged; the line graph follows the bars.
- Tests: a label table run against the served `semanticColorFor`, one rendering test, updated pinned regexes (R5).
- The comments on the rule and `ARCHITECTURE.md` follow (R6).

## Technical Context

**Language/Version**: plain browser JavaScript in `src/public/` (no framework, no bundler); TypeScript ^5.8 tests.

**Primary Dependencies**: none new.

**Storage**: none (nothing stored or migrated).

**Testing**: Vitest + supertest (`tests/poll-card-assets.test.ts`) and jsdom (`tests/client-bar-colours.test.ts`).

**Target Platform**: current browsers; the regexes use lookbehind, already used by the existing rule.

**Project Type**: web application (server + static client in one repository).

**Performance Goals**: none beyond today: one more regex test per label per draw.

**Constraints**:
- No `g` flag on any of the three regexes (stateful `lastIndex`, see the existing comment).
- Labels that hold none of the added words keep their color (SC-002).

**Scale/Scope**: about 10 changed lines of `pollCard.js` plus comments, tests, one paragraph of `ARCHITECTURE.md`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Think Before Coding | Pass | The report's RS1, UA1, UA2 are resolved; R1–R6 settle place, lists, order, tests, docs |
| II. Simplicity First | Pass | Two regexes extended, one added, one line in `semanticColorFor`; no new module |
| III. Surgical Changes | Pass | `pollCard.js` (constants, function, the two comments on the rule), two test files, `ARCHITECTURE.md` |
| IV. Goal-Driven Execution | Pass | The label table of `contracts/ui.md` is the test (R5) |
| V. Code Quality | Pass | One function decides; no browser logging added |
| VI. Self-Documenting Code | Pass | `NEUTRAL_WORDS` names itself; the existing comment block is updated, not expanded |
| Security/Privacy | Pass | No data, request, cookie or storage key |
| Documentation Deliverables | Pass | `ARCHITECTURE.md` updated in the final phase; README does not describe the lists |

Post-design re-check: Pass. No Complexity Tracking entry is needed.

## Project Structure

### Documentation (this feature)

```text
specs/20261112-191252-SEMANTIC-COLOR-WORDS/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/public/pollCard.js              # the three lists and semanticColorFor
tests/poll-card-assets.test.ts      # pinned regexes + label table
tests/client-bar-colours.test.ts    # neutral takes a palette slot in a drawn card
ARCHITECTURE.md                     # the rule's paragraph
```

**Structure Decision**: the existing single repository; no new file outside this spec folder.

## Complexity Tracking

None.
