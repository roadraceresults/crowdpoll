# Research: Semantic Color Words

All decisions below come from the spec and the resolved requirements report
(`requirements/20261112-191252-semantic-color-words/requirements-report.md`, RS1 A, UA1 A, UA2 A). No
`NEEDS CLARIFICATION` remained in the Technical Context.

## R1. Where the rule lives

- **Decision**: change only `semanticColorFor` and its constants in `src/public/pollCard.js:96-119`.
- **Rationale**: it is the one place that decides a semantic color; `assignResultColors` calls it for the results bars and
  the vote bars, and `lineGraph.js` takes its colors from the card's `resultColors()`, so FR-010 holds with no other
  change. No server code decides a semantic color (`src/polls/barPalette.ts` only validates hand-picked colors).
- **Alternatives considered**: a shared server/client list. Rejected: nothing on the server needs it (Principle II).

## R2. The word lists

- **Decision**: extend the two existing regexes, keeping their letters-only lookaround boundary and the `i` flag, and no
  `g` flag:
  - `AFFIRMATIVE_WORDS`: `yes|true|correct|agree|yay|approve|approved|approval|support|favor|favour|accept|yeah|yep|aye`
  - `NEGATIVE_WORDS`: `no|false|incorrect|disagree|nay|disapprove|disapproved|disapproval|oppose|against|reject|nah`
- **Rationale**: a regex alternation tries alternatives left to right at each position, and the trailing `(?![a-z])`
  forces a backtrack to a longer alternative, so the order of `approve|approved|approval` does not change the result.
  The leading `(?<![a-z])` keeps "approve" inside "Disapprove" and "support" inside "Unsupported" from matching (FR-004).
- **Alternatives considered**: a word array tested one by one. Rejected: it changes the established shape the asset
  test pins for no gain.

## R3. The neutral list

- **Decision**: a third constant, tested first in `semanticColorFor`, returning `null` (palette) on a match:
  `NEUTRAL_WORDS = /(?<![a-z])(?:neither|neutral|undecided|unsure|no +opinion|no +preference|don['’]t +know|do +not +know)(?![a-z])/i`
- **Rationale**: returning `null` gives a neutral choice exactly the unmatched path of `assignResultColors`: it takes the
  next palette color and a hand-picked color still wins (FR-006, FR-009). ` +` is "one or more spaces" (FR-005), so
  "No opinion" matches and "Opinion: no" does not; `['’]` accepts the straight and the curly apostrophe. The apostrophe
  is not a letter, so the boundary inside "don't" is unaffected.
- **Alternatives considered**: a tie rule (UA1 B, rejected in the report); `\s+` (would also accept tabs and newlines,
  which a label never holds — ` +` states the spec exactly).

## R4. Order of the rules

- **Decision**: in `semanticColorFor`: empty → `null`; neutral → `null`; positive word or exact `y`/`yup` → green;
  negative word or exact `n`/`nope` → red; else `null`. `assignResultColors` is unchanged: manual first, then the
  semantic color, then the palette.
- **Rationale**: matches FR-006 and keeps "Yes and no" green (positive before negative, unchanged).

## R5. Tests

- **Decision**:
  - `tests/poll-card-assets.test.ts`: update the two pinned regex strings, pin the neutral one, and add a table test
    that extracts `semanticColorFor` and its constants from the served `pollCard.js` (as the existing `expandPalette`
    test does with `new Function`) and checks every label of the spec's user stories and edge cases (FR-011).
  - `tests/client-bar-colours.test.ts`: one rendering test: in a drawn card, a neutral choice takes the next palette
    color and a new-word choice is green, using no palette color.
- **Rationale**: the table test checks behaviour instead of spelling (TD1 of the report); the one rendering test proves
  the neutral path takes a palette slot in a real card.
- **Alternatives considered**: a rendering test per label. Rejected: about 40 labels, each needing a poll and a page,
  for the same assertion.

## R6. Documentation

- **Decision**: update the comment above `semanticColorFor` (lists and order, the "SEMANTIC CHOICE COLORS" block and
  the results-mode comment's "yes" or "no" wording), and `ARCHITECTURE.md:798`, which describes the rule. README does
  not describe the lists, so it is unchanged.
- **Rationale**: FR-012 and the constitution's Documentation Deliverables; comments are touched only where the code
  they describe changes (Principle VI scope clause).
