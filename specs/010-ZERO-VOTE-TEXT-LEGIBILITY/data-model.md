# Phase 1 Data Model: Zero-Vote / Low-Fill Result Text Legibility

**Feature**: `010-ZERO-VOTE-TEXT-LEGIBILITY` | **Date**: 2026-08-19 | **Plan**: [plan.md](./plan.md)

## Storage impact: none

This feature adds no persisted state. No MongoDB collection, document field, index, or
API payload changes. Nothing in `src/polls/`, `src/routes/`, or `postman/openapi.json`
requires an update — it is a render-time-only correction to how existing, already-derived
values (assigned color, vote percentage) are turned into ink, per
spec.md's "No stored data changes" assumption.

## Runtime entities

These exist only within one `renderPollResults` call (specifically, within its
`applyTruncation` sub-call). None outlive the render.

### Choice datum (existing — unchanged)

Read, not modified, exactly as in 009-POLL-CHOICE-COLORS.

| Field | Type | Used by this feature |
|---|---|---|
| `label` | string, ≤200 chars | Indirectly — its rendered width (`scrollWidth`) is measured, but the text itself isn't re-interpreted |
| `pct` | number | **Yes** — determines the fill/track boundary x-position |

### Assigned color (existing — unchanged, from `assignResultColors`)

One hex per choice, index-parallel to the sorted dataset, produced by
009-POLL-CHOICE-COLORS's unchanged `assignResultColors(data)`. This feature reads it as
"the fill color", one of the two candidate ink-source colors per row.

### Track color (new — module-scope constant)

`RESULTS_TRACK_COLOR = '#DDE1D6'`. Mirrors `--track` in `src/public/pollCard.css`; not
read from CSS at runtime (would require a DOM read this feature is explicitly avoiding
adding — see research.md R1/R3). Must be kept in sync by hand if `--track` ever
changes, same pattern already used by 009's contrast-verification script.

### Element span (new — transient, computed per row per refresh)

For each of the label and the percentage figure, within `applyTruncation`:

| Field | Type | Derivation |
|---|---|---|
| `rowWidth` | number (px) | `row.getBoundingClientRect().width` — **already read** by existing truncation logic |
| `pad` | number (px) | Already computed by `renderPollResults` (`scalePad(fontSize)`) |
| `fillEdgeX` | number (px) | `rowWidth * (item.pct / 100)` |
| `effectiveLabelWidth` | number (px) | `naturalLabelWidth` (already read via `label.scrollWidth`) unless truncated this pass, in which case the same `maxWidth` truncation already computes |
| `pctWidth` | number (px) | `pctEl.scrollWidth` — **new** read, added to the same existing pass |
| `labelSpan` | `[start, end]` | `[pad, pad + effectiveLabelWidth]` |
| `pctSpan` | `[start, end]` | `[rowWidth - pad - pctWidth, rowWidth - pad]` |

### Majority background (new — transient, computed per element)

`'fill'` or `'track'`, per research.md R2's coverage comparison. Feeds directly into
the existing `textStyleFor(hex)`: `'fill'` → the row's assigned color; `'track'` →
`RESULTS_TRACK_COLOR`.

## Assignment rules

Applied per row, per render (both the in-place and rebuild branches, since both already
call `applyTruncation`):

1. Compute `fillEdgeX` from the row's real width and the choice's vote percentage.
2. For the label: determine its post-truncation effective span, compare against
   `fillEdgeX`, pick the majority background, call `textStyleFor` with the
   corresponding hex.
3. For the percentage figure: same comparison, independently — it commonly resolves to
   a different majority than the label, since the two are anchored to opposite edges of
   the row (research.md, spec.md User Story 2).
4. Apply the resulting `{ color, shadow }` to each element independently. No change to
   `.result-fill`'s own background or width — only the text ink.

### Validation and degenerate input

| Input | Behavior |
|---|---|
| `pct` is `0` | `fillEdgeX = 0`; both label and percentage span entirely past it → both resolve to `'track'` (this is the reported defect's exact case, now fixed). |
| `pct` is `100` | `fillEdgeX = rowWidth`; both elements resolve to `'fill'` — matches today's already-correct behavior (no regression). |
| Compact row (`RESULTS_COMPACT_THRESHOLD`) | `applyTruncation` returns before any of this runs — label/percentage are `display:none` anyway (spec.md Edge Cases: out of scope by construction). |
| Zero-width element (defensive) | `effectiveLabelWidth` or `pctWidth` of `0` → span is empty → coverage comparison still total (an empty span's fill overlap is `0`, `total` is `0`; guarded to resolve to `'fill'`, matching the tie-break rule in research.md R2, not a divide-by-zero). |

## Derived-state consistency

Like 009-POLL-CHOICE-COLORS, this is a pure function of already-available render-time
values (row width, padding, percentage, rendered text widths) — recomputed on every
render, never cached across renders, so a bar that reorders or changes percentage on a
live refresh always gets ink recomputed for its *current* geometry. Because both render
paths already call `applyTruncation` (research.md R4), there is no equivalent of 009's
R1 defect where one path could silently skip the recomputation.
