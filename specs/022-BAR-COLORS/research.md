# Research: Bar Colors (022)

Every decision here was either settled by the source requirements
(`designDocs/022-high-level-requirements-BAR-COLORS.md`, after three architecture passes) or follows
from the current code in `src/public/pollCard.js`. The Technical Context has no open unknowns; this
file records why each choice stands.

## R1. The mapping function: 32-bit FNV-1a, modulo the palette length

- **Decision**: `paletteOffsetFor(pid)` hashes the id string's UTF-16 code units with 32-bit FNV-1a
  (offset basis `0x811C9DC5`, prime `0x01000193`), multiplying with `Math.imul` and reducing with
  `>>> 0`, then takes the result modulo `RESULTS_COLOR_PALETTE.length` (50). The result, `0 … 49`,
  is the palette array index; the requirements' 1-based "index" is that plus one.
- **Rationale**: integer-only arithmetic, so every engine gives the same number (FR-006); synchronous
  and a few dozen operations per card; spreads both random UUIDs and sequential ids evenly. Measured
  on 2026-09-25: 1,000 sequential UUID-shaped ids fill all 50 starts, busiest 27, least 13;
  200 trials of 1,000 random UUIDs gave a busiest start of 38 and a least of 6 (SC-002's limit is
  50, 2.5 × the average of 20); 20 random ids gave at least 12 distinct starts in every trial
  (SC-001's floor is 10).
- **Alternatives considered**: `crypto.subtle.digest` (asynchronous, and absent on plain `http://`
  in development); summing char codes (clusters on UUIDs, whose characters are hex digits); taking
  the id's first hex digits (breaks on the test fixtures' `poll-…` ids, and couples the colour to
  the id's format).

## R2. Where the offset is computed: once per card, in `initPollCard`

- **Decision**: `initPollCard` computes `const paletteOffset = paletteOffsetFor(opts.pid)` once, beside
  `layoutFor`, and `render()` passes it to `renderPollResults` as a new last argument.
- **Rationale**: the pid never changes for a card instance, and every card is mounted through the
  one call in `window.PollCard.mount` (`initPollCard(viewport, Object.assign({ pid: pid }, opts))`).
  The maximized view moves this same instance (021 R1), so the grid and the maximized view share the
  offset by construction (FR-005).
- **Alternatives considered**: computing it inside `renderPollResults` from a pid argument (hashes on
  every live refresh for no gain); storing it on the poll payload (a server change the requirements
  exclude).

## R3. Assignment order: display order, cursor starting at the offset

- **Decision**: `assignResultColors(data, paletteOffset)` keeps its single pass over the display-ordered
  dataset; only its cursor starts at `paletteOffset` instead of 0. Semantic labels still take their
  fixed colour and do not advance the cursor. `RESULTS_COLOR_PALETTE[paletteIndex++ % length]` now
  really wraps.
- **Rationale**: NC-1 of the architecture chose colour by rank (Option A). Both render paths already
  colour from the one array this returns, and the in-place path already re-applies colours on every
  refresh, so nothing else changes.
- **Alternatives considered**: colour by the choice's authored position (Option B, rejected in NC-1).

## R4. A card without an id

- **Decision**: `paletteOffsetFor` returns 0 for a missing, empty or non-string id (FR-007).
- **Rationale**: the app never reaches it; it keeps the function total for tests and matches
  `semanticColorFor`'s own handling of a non-string label.

## R5. What does not change

- **Decision**: `RESULTS_PALETTE_ENTRIES`, `SEMANTIC_*`, the word rules, `BAR_COLORS` and its tints and
  inks, `syncInkOnFill`, `setFillWidth`, bar sizing, `renderVotingOptions`, the admin pages, and every
  server file (FR-004, FR-008).
- **Rationale**: `BAR_COLORS` already holds an entry for every palette colour, so a bar that moves to a
  different palette entry picks up that entry's tint, inks and clipped copy with no further change.

## R6. Comments at the changed lines

- **Decision**: two statements in the comment inside `assignResultColors` become false: that Maybe
  "gets palette color 1, not 3", and that the modulo "can't actually wrap". Only those are removed;
  the comment's first clause and the comments above the function stay, because they remain true
  (constitution III). The one new comment is a pointer to the FNV reference
  (`http://www.isthe.com/chongo/tech/comp/fnv/`) above `paletteOffsetFor`; no requirement or feature
  number goes into `src/` (constitution VI, applied only where the code is being changed).

## R7. Tests

- **Decision**: in `tests/client-bar-colours.test.ts`:
  - a reference `paletteStartOf(pid)` in the test, written independently from the spec, so the test
    checks the page's function rather than copying it;
  - `seed()` takes a fixed `_id`, so expectations are deterministic: `poll-fifty` (start 25, so its
    50 bars wrap past entry 50 at bar 25, FR-009) and `poll-agree` (start 39, "Maybe" takes
    `palette[39]`);
  - the in-order test expects `palette[(start + i) % 50]`; the Yes/No/Maybe test expects
    `palette[start]` for Maybe;
  - new: the page's `paletteOffsetFor` matches the reference over 1,000 sequential ids, fills all 50
    starts, and none exceeds 50 (SC-002);
  - new: two polls with different starts (`poll-colours-a` → 40, `poll-colours-b` → 21) show
    different first colours, and each card keeps its colours when maximized (FR-005).
- **Rationale**: FR-009, SC-002–SC-004. Fixed ids avoid the fixture's random `_id` making a colour
  expectation depend on the run.
