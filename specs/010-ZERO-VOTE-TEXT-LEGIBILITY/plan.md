# Implementation Plan: Zero-Vote / Low-Fill Result Text Legibility

**Branch**: `dev` | **Date**: 2026-08-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-ZERO-VOTE-TEXT-LEGIBILITY/spec.md`

## Summary

`textStyleFor(hex)` picks a result bar's label/percentage ink from the choice's
*assigned* fill color, on the assumption that the text sits on that fill. It doesn't —
`.result-fill` grows from the row's left edge while `.result-pct` is anchored to the
row's right edge, so the percentage figure sits mostly on the unfilled track
(`--track`, `#DDE1D6`) for nearly every non-100% percentage, and at 0% votes the label
does too (0px of fill exists at all). For "dark bucket" colors (most of the 50-entry
palette), the ink chosen for a dark fill reads as pale, low-contrast text on the light
track.

The fix replaces one ink decision per row with one **per element** (label, percentage
figure), each based on whichever background — fill or track — covers the *majority* of
that element's actual rendered width (spec.md FR-003/FR-003a). `textStyleFor` itself is
unchanged; only which hex gets fed into it, per element, changes.

**The coverage measurement piggybacks on an existing reflow, not a new one.**
`applyTruncation` (called by `renderPollResults`, both render paths, every live refresh)
already forces a layout reflow to read real row width (`getBoundingClientRect`) and
label width (`scrollWidth`) for truncation. Phase 0 research found this during planning
and the requester revised FR-003b on the spot (see spec.md Clarifications, the
`/speckit-plan`-sourced entry): reuse those already-forced measurements — extending the
same pass to also read the percentage figure's width — rather than adding a second,
independent algebraic text-width estimate. No new forced reflow is introduced; the
result is also more accurate than an estimate would have been.

Implementation is one structural move plus one new small computation, both confined to
`src/public/pollCard.js`:

1. **Move ink assignment into `applyTruncation`.** Today, `textStyleFor(color)` is
   called once per row inside the `data.map(...)` loop (before `applyTruncation` runs),
   using the row's assigned color for both label and percentage. This feature moves that
   call — twice, independently — into `applyTruncation`'s existing per-row pass, which is
   the one place both the real row width and the real label width are already available
   without an added reflow.
2. **Compute majority coverage per element.** Using `rowWidth`, `pad`, `pct`, the
   label's effective (possibly truncated) width, and a newly-read `pctEl.scrollWidth`:
   derive each element's rendered span, compare it against the fill/track boundary
   (`rowWidth * pct/100`), and feed `textStyleFor` either the row's assigned color (fill
   wins) or a new `RESULTS_TRACK_COLOR` constant mirroring `--track` (track wins).

Both render paths (in-place update and full rebuild) call `applyTruncation`, so this one
change covers both — no separate "reapply on live refresh" fix is needed the way
009-POLL-CHOICE-COLORS R1 needed one; the risk there was code that skipped an update
path entirely, and this feature's change sits on a path both branches already share.

## Technical Context

**Language/Version**: Vanilla JS + CSS client (existing project, unchanged). This
feature touches only `src/public/pollCard.js` — no TypeScript source, no CSS changes
(the `--track` value is read into a new JS constant that mirrors, not modifies, the
existing CSS custom property).

**Primary Dependencies**: None new. Extends the file's existing `applyTruncation`,
`textStyleFor`, and `renderPollResults`.

**Storage**: MongoDB, unchanged. No schema, field, index, or payload change — this is a
render-time-only computation from data already present. See
[data-model.md](./data-model.md).

**Testing**: Vitest + supertest, existing pattern. Per spec.md's Assumptions (following
the 008/009 precedent), automated coverage is limited to asserting the served
`/pollCard.js` still carries the new `RESULTS_TRACK_COLOR` constant and majority-coverage
logic markers — extending `tests/poll-card-assets.test.ts`. Behavior is validated
manually via [quickstart.md](./quickstart.md).

**Target Platform**: Unchanged — DigitalOcean App Platform (Linux) for deployment; local
dev on Windows 11 + PowerShell.

**Project Type**: Single project, existing layout. No new directories, no new source
files.

**Performance Goals**: No new forced layout reflow beyond what `applyTruncation` already
costs today (SC-005) — this is the central constraint Phase 0 research resolved (see
[research.md R1](./research.md)). Per row per refresh, this feature adds one more
`scrollWidth` read (the percentage figure) inside a reflow that already happens, plus
cheap arithmetic — negligible against the existing DOM work.

**Constraints**: Ink is derived, not persisted or configurable (spec.md Assumptions).
Must not change the fill/track colors, the palette, the semantic colors, or the
009-POLL-CHOICE-COLORS trailing-edge boundary rule (FR-007). Must not regress any
label/percentage that is already legible today (FR-004).

**Scale/Scope**: All 52 assignable colors (50 palette + 2 semantic), every non-compact
result row, at every vote percentage from 0% to 100%.

## Constitution Check

*GATE: evaluated before Phase 0 and re-checked after Phase 1.*

| Principle | Assessment | Status |
|---|---|---|
| **I. Think Before Coding** | Two clarification rounds surfaced and resolved the real open questions before implementation: the straddle rule (majority coverage) and how coverage is computed. The second was *revised* mid-planning when Phase 0 research found `applyTruncation` already forces the reflow the original answer was chosen to avoid — surfaced to the requester rather than silently reinterpreted, and the requester's revised answer is what this plan follows. | ✅ Pass |
| **II. Simplicity First** | No new abstraction: `textStyleFor` is reused unchanged, only its input hex now varies per element. No new function beyond a small coverage calculation folded into existing `applyTruncation`. No config surface, no new dependency. | ✅ Pass |
| **III. Surgical Changes** | Only `pollCard.js` changes. `applyTruncation`'s existing truncation behavior is preserved exactly (FR-007/no collateral change); the ink call is relocated into it, not rewritten. The palette, semantic colors, trailing-edge rule, and back face are untouched (FR-007/FR-008). | ✅ Pass |
| **IV. Goal-Driven Execution** | Every FR maps to a quickstart scenario with a stated expected result (to be authored in Phase 1); SC-001/SC-002/SC-004 are verifiable by a contrast script extending 009's, SC-005 by absence of new reflow (verifiable by code inspection — no new `getBoundingClientRect`/`scrollWidth` call sites outside `applyTruncation`'s existing pass). | ✅ Pass |
| **V. Code Quality & Maintainability** | The relocated ink logic stays inside the one function that already owns per-row geometry reads, rather than duplicating a second geometry pass — reduces coupling, doesn't add it. A label/percentage with zero measurable width (defensive case) falls back to the row's assigned color, matching today's behavior — no crash. | ✅ Pass |

**Result: PASS — no violations, Complexity Tracking table not required.**

## Project Structure

### Documentation (this feature)

```text
specs/010-ZERO-VOTE-TEXT-LEGIBILITY/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md        # Phase 1 output — the primary verification artifact
├── contracts/
│   └── ui-contracts.md  # Phase 1 output — rendering contract
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
└── public/
    └── pollCard.js      # Sole source file touched
                          #   ~line 271  assignResultColors  -> unchanged (still
                          #              returns one color per choice; that color
                          #              is now "the fill color", consumed
                          #              differently downstream)
                          #   ~line 307  textStyleFor         -> unchanged signature
                          #              and behavior, called per-element now
                          #              instead of once per row
                          #   ~line 510  applyTruncation       -> extended: also
                          #              reads pctEl width, computes majority
                          #              coverage, applies ink to label AND pct
                          #   ~line 484  renderPollResults     -> both branches'
                          #              per-row loops stop calling textStyleFor
                          #              directly; ink assignment moves into the
                          #              applyTruncation call already made below
                          #              each loop

tests/
└── poll-card-assets.test.ts   # Extended with asset assertions for 010
```

Unchanged and explicitly out of scope: `src/public/pollCard.css` (reference
stylesheet), `src/public/site.css` (009's trailing-edge rule stays as-is — this feature
doesn't touch the boundary line, only the ink on either side of it), `renderVotingOptions`
(back face), the palette, and the two semantic colors.

**Structure Decision**: Single project, existing layout, no new files in `src/`. Same
shape as 009-POLL-CHOICE-COLORS: a localized change to one client-side render path.

## Phase Status

- [x] **Phase 0 — Research**: complete → [research.md](./research.md)
- [x] **Phase 1 — Design & Contracts**: complete → [data-model.md](./data-model.md),
      [contracts/ui-contracts.md](./contracts/ui-contracts.md),
      [quickstart.md](./quickstart.md); agent context updated
- [ ] **Phase 2 — Tasks**: not started; run `/speckit-tasks`

## Post-Design Constitution Re-Check

Re-evaluated after Phase 1. No gate changed status. The design adds one new module-scope
constant (`RESULTS_TRACK_COLOR`) and no new files, dependencies, or persisted state;
[data-model.md](./data-model.md) confirms zero storage impact and
[contracts/ui-contracts.md](./contracts/ui-contracts.md) confines the change to the
result-bar ink computation. **PASS.**
