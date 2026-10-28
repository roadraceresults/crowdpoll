# Phase 0 Research: Zero-Vote / Low-Fill Result Text Legibility

**Feature**: `010-ZERO-VOTE-TEXT-LEGIBILITY` | **Date**: 2026-08-19 | **Plan**: [plan.md](./plan.md)

## R1 — Coverage measurement reuses `applyTruncation`'s existing reflow

**Decision**: Compute each element's fill/track coverage using **real, measured**
widths (`row.getBoundingClientRect().width`, `label`/`.result-pct` `.scrollWidth`),
read inside `applyTruncation`'s existing per-row pass — not a separate algebraic
text-width estimate.

**Rationale**: spec.md's clarification session originally resolved FR-003b as "compute
algebraically, no DOM reads, to avoid adding a forced reflow to the live-refresh path."
While drafting this plan, reading `renderPollResults` closely (`src/public/pollCard.js`)
found that `applyTruncation` — called by **both** the in-place update branch (every live
refresh) and the full-rebuild branch — already does exactly that kind of read:

```js
function applyTruncation(rows){
  if (compact) return;
  rows.forEach(({ row, label }) => {
    const rowWidth = row.getBoundingClientRect().width;   // forces reflow
    const naturalLabelWidth = label.scrollWidth;            // forces reflow
    ...
  });
}
```

This is pre-existing behavior (truncation has needed real widths since before this
feature), not something 010 introduces. So the original FR-003b rationale — "algebraic
avoids a reflow cost DOM measurement would add" — rested on a premise that doesn't hold:
the reflow already happens, every refresh, regardless of this feature.

Surfaced to the requester directly (constitution Principle I — surface tradeoffs rather
than silently reinterpreting an explicit decision); the requester revised FR-003b to
reuse the real measurements. See spec.md Clarifications for the recorded exchange.

**Consequence**: extend `applyTruncation`'s existing forEach to also read
`row.querySelector('.result-pct').scrollWidth`, one more read inside the same
already-forced reflow. No second measurement pass, no new reflow-triggering call site
anywhere else in the file.

**Alternatives considered**:

- *Algebraic estimate (canvas `measureText` or similar), as originally clarified* —
  rejected once R1 was found: it would have added net-new code to avoid a cost that
  isn't actually avoided (the reflow happens anyway, for truncation), while being less
  accurate than the real measurement sitting one line away.
- *A second, independent DOM-read pass just for coverage* — rejected; would double the
  reflow-triggering reads per row for no benefit over extending the existing pass.

---

## R2 — Majority-coverage algorithm

**Decision**: For each of the label and the percentage figure, compute its rendered
span, compare it against the fill/track boundary, and pick whichever background covers
more of that span:

```js
const fillEdgeX = rowWidth * (item.pct / 100);

// label: left-anchored at `pad`, width = post-truncation effective width
const labelStart = pad;
const labelEnd = labelStart + effectiveLabelWidth;

// percentage figure: right-anchored at `pad` from the row's right edge
const pctEnd = rowWidth - pad;
const pctStart = pctEnd - pctWidth;

function majorityBackground(start, end){
  const fillOverlap = Math.max(0, Math.min(end, fillEdgeX) - start);
  const total = end - start;
  return fillOverlap * 2 >= total ? 'fill' : 'track';
  // tie (exactly 50/50) resolves to 'fill' -- see tie-break note below
}
```

`effectiveLabelWidth` is `naturalLabelWidth` unless `applyTruncation` truncated the
label this pass, in which case it's the same `maxWidth` truncation already computes —
the coverage decision must reflect what's actually rendered, not the untruncated
natural width.

**Tie-break**: an exact 50/50 split is vanishingly unlikely with real pixel widths, but
resolves to `'fill'` — the pre-010 baseline behavior always chose ink from the assigned
fill color, so ties preserve today's outcome rather than introducing a new one,
minimizing surprise (FR-004: don't regress a case that reads fine today).

**The halo, not a split-color rendering, carries the minority side.** FR-003a is
explicit that a single label or percentage element gets **one** ink+shadow pair, chosen
by majority coverage — not per-character coloring. `textStyleFor`'s existing halo
(`0 0 4px rgba(255,255,255,.9)…` / `0 1px 3px rgba(0,0,0,.9)…`) is what already keeps
that one ink legible as it crosses from one background to the other; this feature
changes *which* background majority-decides the ink, not the halo mechanism itself.

**Alternatives considered**:

- *Per-character split coloring at the boundary* — rejected; explicitly out of scope
  per FR-003a, and would need multiple spans or a CSS clip-path trick for one line of
  text, disproportionate to the problem (constitution Principle II).
- *Any-track-exposure-wins (conservative)* — considered during `/speckit-clarify` and
  rejected there in favor of majority coverage (see spec.md Clarifications); would flip
  ink on many bars that already read fine today, risking FR-004.

---

## R3 — `textStyleFor` and `assignResultColors` are unchanged

**Decision**: Neither function's signature or internal logic changes.
`assignResultColors(data)` still returns one hex per choice — that hex now means "this
choice's fill color" (as it always has); it is simply no longer assumed to also be the
correct input for every ink decision on that row. `textStyleFor(hex)` still takes one
hex and returns `{ color, shadow }`; this feature just calls it with a different hex
per element (the row's assigned color, or the new `RESULTS_TRACK_COLOR`) instead of
always the row's assigned color.

**Rationale**: minimal-diff, matches constitution Principle II (no speculative
abstraction) and the codebase's existing style — `textStyleFor` was already
general-purpose (any hex in, ink out); reusing it as-is is simpler than adding a
parallel "track-aware" variant.

**New constant needed**: `RESULTS_TRACK_COLOR = '#DDE1D6'`, mirroring `--track` in
`src/public/pollCard.css`. A comment must note the two must stay in sync — this
duplicates a value across a CSS custom property and a JS constant, the same pattern
009-POLL-CHOICE-COLORS's contrast-verification script already uses (hardcoding
`TRACK="#DDE1D6"` rather than parsing the CSS file). `pollCard.css` stays the untouched
reference stylesheet either way; the JS constant does not modify it.

---

## R4 — Both render paths are already covered by one change

**Decision**: No separate fix is needed for the in-place update branch the way
009-POLL-CHOICE-COLORS R1 needed one.

**Rationale**: 009's R1 defect existed because the in-place branch *skipped* a code
path (color reapplication) that the rebuild branch ran. Here, both the in-place branch
(`src/public/pollCard.js` ~line 580) and the rebuild branch (~line 632) already call
`applyTruncation(rows)` on every pass — that's the single point this feature's ink logic
moves into. Relocating ink assignment there means both paths get it automatically,
with no risk of one branch silently missing the update.

**Verification implication**: unlike 009, there's no dedicated "live reorder" scenario
required to catch a skipped-path defect — but a live-refresh scenario is still worth
keeping in quickstart.md to confirm the *transition* itself (0% → non-zero) doesn't
flash illegible text for a frame, per spec.md Acceptance Scenario 1.3.
