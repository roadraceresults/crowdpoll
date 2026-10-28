# Phase 0 Research: Poll Choice Colors

**Feature**: `009-POLL-CHOICE-COLORS` | **Date**: 2026-08-15 | **Plan**: [plan.md](./plan.md)

All line references are to `src/public/pollCard.js` as of the start of this feature.

---

## R1 — The in-place update path silently breaks semantic color stability

**Decision**: `renderPollResults`'s in-place update branch (lines 461–478) MUST be
extended to recompute and reapply each row's color. This is not optional polish; without
it FR-009 fails in the single most common scenario the feature exists for.

**Rationale**: The card has two render paths. When the row count and all geometry are
unchanged — the normal case on every `APP_POLLING_INTERVAL` refresh — it takes an
in-place branch that updates only text and fill width, deliberately leaving colors
alone. The existing comment at line 466 states the invariant it relies on:

```js
// Bar color is assigned by rendered position (getResultColor(i)),
// so it never changes on an in-place update — only the text and
// the fill width can.
```

That invariant is exactly what this feature removes. Colors become a function of the
**label**, but `data` is re-sorted by percentage on every refresh, so a label moves
between positions while the DOM rows stay put.

Concrete failure, entirely within normal use:

1. A "Yes"/"No" poll where Yes leads. Row 0 = Yes (green), row 1 = No (red).
2. Votes shift so No leads. `data` re-sorts: `data[0]` is now No, `data[1]` is Yes.
3. Row count (2) and all geometry are unchanged, so the signature matches and the
   in-place branch runs.
4. It rewrites row 0's label text to "No" and row 1's to "Yes" — but leaves row 0's fill
   green and row 1's red.
5. **The card now shows "No" in green and "Yes" in red.** The colors are inverted, and
   they stay inverted until something forces a rebuild.

This is worse than having no semantic colors at all: the feature's entire purpose is
letting a viewer read agree/disagree from color without reading labels, and here the
color actively lies. It also fails silently — no error, no visual glitch, just wrong
colors — and it will not reproduce on a page load, only after a live vote change.

**Alternatives considered**:

- *Force a full rebuild whenever the label order changes* — rejected. It would replay
  the grow-in fill animation on every reorder, which is precisely the flicker the
  in-place path was built to avoid (see the comment at lines 443–458). Recomputing three
  style properties is far cheaper than discarding the DOM.
- *Include the label order in the render signature* — rejected for the same reason: a
  signature miss triggers the full rebuild and the flicker with it.
- *Leave the in-place path alone and accept stale colors* — rejected; directly violates
  FR-009 and SC-001.

---

## R2 — Color assignment must become a whole-dataset pass, not a per-index lookup

**Decision**: Replace `getResultColor(index)` (line 204) with a function that takes the
ordered dataset and returns a parallel array of colors — one pass, carrying the palette
cursor.

**Rationale**: FR-007 requires semantic choices to *not* consume palette entries, so the
palette index for a given row depends on how many earlier rows were semantically
colored. That cannot be derived from the row's own index alone, which is all
`getResultColor(index)` receives. A single left-to-right pass over the dataset with a
separate palette counter satisfies FR-007 and FR-008 naturally:

```js
function assignResultColors(data){
  let paletteIndex = 0;
  return data.map(item => {
    const semantic = semanticColorFor(item.label);
    if (semantic) return semantic;
    return RESULTS_COLOR_PALETTE[paletteIndex++ % RESULTS_COLOR_PALETTE.length];
  });
}
```

`getResultColor` has exactly one call site (line 493) and no other references, so
replacing it is contained. Returning an array rather than a per-row callback means both
render paths compute colors identically from the same input, which is what keeps R1's
fix and the rebuild path in agreement.

**Alternatives considered**:

- *Keep `getResultColor(index)` and pass a precomputed skip-count* — rejected; pushes
  bookkeeping to both call sites and invites them to drift apart.
- *Store the assigned color on each `item` during sorting* — rejected; mutates the shared
  cached dataset that both faces read, coupling the back face to a front-face concern
  that FR-013 explicitly says must stay separate.

---

## R3 — Whole-word matching: letters-only boundary via lookaround, never with the `g` flag

**Decision** *(amended 2026-08-19 — see spec.md Clarifications, Session 2026-08-19)*:
Match with a case-insensitive alternation bounded by lookaround, built once at module
scope and used **without** the `g` flag:

```js
const AFFIRMATIVE_WORDS = /(?<![a-z])(?:yes|true|correct|agree|yay)(?![a-z])/i;
const NEGATIVE_WORDS    = /(?<![a-z])(?:no|false|incorrect|disagree|nay)(?![a-z])/i;
const AFFIRMATIVE_EXACT = ['y', 'yup'];
const NEGATIVE_EXACT    = ['n', 'nope'];
```

`yay`/`nay` were added 2026-08-19 (spec.md Clarifications, Session 2026-08-19) as
ordinary word-rule entries — same letters-only boundary as the rest of the list, so
`Naysayer` does not match.

**Original decision (superseded)**: `\b`-anchored alternation. JavaScript's `\b` sits
between a `\w` character (letter, digit, *or underscore*) and a non-`\w` character, so
it treated `Agree2` and `yes_please` as NOT containing a whole word — the boundary
FR-004 specified at the time. Manual quickstart verification of Q6 flagged that result
as unintuitive: a viewer reading `yes_please` reasonably expects it to read as
affirmative. FR-004 was narrowed to a **letters-only** boundary — a space, hyphen,
digit, or underscore all delimit a word now, matching `\b`'s original behavior for
punctuation and whitespace but changing it for digits and underscore.

**Rationale for lookaround over `\b`**: `\b` cannot express a letters-only boundary
directly — it is hardwired to `\w` (letters, digits, underscore). A negative lookbehind
`(?<!...)` and lookahead `(?!...)` against `[a-z]` (case-insensitive, so it covers both
cases) reproduce the same "boundary" concept but restricted to letters only:

| Label | Result | Spec requires |
|---|---|---|
| `Yes!` | match | match ✓ |
| `(true)` | match | match ✓ |
| `Don't agree` | match | match ✓ |
| `Option 1 - Yes` | match | match ✓ |
| `Agree2` | match | match ✓ |
| `yes_please` | match | match ✓ |
| `No1` | match | match ✓ |
| `option_no` | match | match ✓ |
| `Agreement` | no match | no match ✓ |
| `Disagreement` | no match | no match ✓ |
| `Incorrect` (vs. `correct`) | no match on `correct`, matches whole word `incorrect` | matches whole word `incorrect` ✓ |

**The `g` flag would be a live defect here.** A regex with `g` carries mutable
`lastIndex` state across `.test()` calls, so a module-scope `/…/gi` reused across rows
would return `true`, `false`, `true`, … for identical inputs — producing colors that
change depending on how many bars were checked before them, and differing between the
two render paths. Build these literals without `g`.

**Alternatives considered**:

- *Split the label on non-word characters and compare tokens* — rejected; more code for
  identical behavior, and it has to re-derive the boundary rule that the regex already
  encodes.
- *Construct the regex per call* — rejected; needless allocation on a path that runs for
  every bar on every refresh, and module-scope literals are the existing file's style.
- *Keep `\b` and special-case digits/underscore separately* — rejected; two boundary
  mechanisms doing one job is more code than a single lookaround-based rule.

---

## R4 — Ink threshold: 0.55 → 0.40, measured as safe

**Decision**: Change the single comparison in `textStyleFor` (line 224) from
`luminanceOf(hex) > 0.55` to `> 0.40`.

**Rationale**: `#FC9E9E` has relative luminance **0.476**, just under the current 0.55
threshold, so the unmodified rule classifies it as "dark" and gives it white ink at
**2.00:1** — unreadable. Dark ink on the same color reaches **8.72:1**.

Measured against the current palette plus both semantic colors (52 total):

| Threshold | Colors failing 4.5:1 | Minimum ratio | Colors whose ink changes |
|---|---|---|---|
| 0.55 (current) | 1 (`#FC9E9E` at 2.00:1) | 2.00:1 | — |
| **0.40** | **0 of 52** | **4.93:1** | **1 — `#FC9E9E` only** |

The change is provably contained: after the pre-feature recolor, all 50 palette entries
sit at or below **0.163** luminance, so the nearest palette color is 0.237 away from the
new threshold. Nothing occupies the 0.22–0.55 band, and no palette bar changes
appearance. `#43F781` (0.693) was already above the old threshold and is unaffected.

**Alternatives considered**:

- *Special-case the two semantic hexes to force dark ink* — rejected during clarification
  (session 2026-08-15). It leaves the general rule wrong for any future light color and
  adds an exception the rule immediately contradicts.
- *Darken `#FC9E9E` until it clears 0.55* — rejected; overrides a color the requirements
  state explicitly.
- *A midpoint such as 0.45* — works identically given the empty band, but 0.40 leaves a
  wider margin above the palette's 0.163 ceiling without approaching `#FC9E9E`'s 0.476.

---

## R5 — The back face needs no change, and that is verifiable by inspection

**Decision**: No edit to `renderVotingOptions` (line 573) or to the `.vote-row` rules in
`pollCard.css`. FR-013 and SC-006 are satisfied by *not* touching them.

**Rationale**: `renderVotingOptions` sets no background color at all — row appearance
comes entirely from the `.vote-row` / `.vote-row.is-selected` CSS classes, which resolve
`--choice-unselected` (`#F1F3EE`) and `--choice-selected` (`#E4D3AE`). It never calls
`getResultColor` or `textStyleFor`, so replacing the former and retuning the latter
cannot reach it.

The one real coupling risk is the shared cached dataset: both faces render from the same
sorted array (see the SHARED POLL DATA comment at the top of the file). This is why R2
returns a separate colors array rather than writing a color onto each `item` — a mutation
there would be visible to the back face and would make SC-006 depend on the back face
ignoring a field rather than never receiving one.

---

## R6 — Verification approach

**Decision**: Follow the precedent set by `008-POLL-CARD-BACK-SIDE`: automated coverage
asserts the *served asset* still carries the required values; behavior is validated
manually via `quickstart.md`. Extend `tests/poll-card-assets.test.ts` rather than adding
a new test file or test dependency.

**Rationale**: Recorded in spec.md's clarification session (2026-08-15). `pollCard.js` is
a browser script exposing only `window.PollCard.mount`; the color functions are
module-scoped, `vitest.config.ts` runs `environment: "node"`, and jsdom is not installed.
The existing suite already fetches `/pollCard.js` over HTTP and asserts on its text, so
guarding the two hex values and the `0.40` threshold costs three assertions in a file
built for exactly this.

**Accepted limitation, stated plainly**: these assertions prove the constants are present
in the shipped file. They cannot catch a wrong boundary regex, an off-by-one in the
palette cursor, or — most importantly — the R1 in-place-update defect, which is invisible
to static inspection and only appears after a live vote reorder. `quickstart.md`
therefore carries a mandatory reorder scenario, and it is the only thing standing between
that defect and production. It must not be skipped when validating this feature.

**Alternatives considered**: exposing the pure function on `window.PollCard` for unit
testing, and installing jsdom for a real render test. Both were presented during
clarification; the asset-assertion approach was chosen.
