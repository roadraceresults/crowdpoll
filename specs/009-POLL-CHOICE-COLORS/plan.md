# Implementation Plan: Poll Choice Colors

**Branch**: `dev` | **Date**: 2026-08-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-POLL-CHOICE-COLORS/spec.md`

## Summary

Result bars on the front of a poll card are currently colored by position alone —
`getResultColor(i)` indexes the palette by row number. This feature makes affirmative
labels render `#43F781` and negative labels `#FC9E9E`, with all remaining choices
drawing from the existing palette in display order, skipping the semantic ones.

The change is small in surface area but has one non-obvious trap, found in Phase 0 and
documented as [research.md R1](./research.md):

**The in-place update path will invert the colors of a Yes/No poll.**
`renderPollResults` has two branches. When row count and geometry are unchanged — every
live refresh — it updates text and fill width but deliberately leaves colors alone,
relying on the invariant that *color is a function of position*. This feature replaces
that invariant with *color is a function of label*, while `data` still re-sorts by
percentage on every refresh. So when a "No" overtakes a "Yes", the rows swap labels but
keep their old fills, and the card shows **"No" in green and "Yes" in red** until
something forces a rebuild. It fails silently, never on page load, only after a live vote
change — and it inverts exactly the signal the feature exists to convey. Fixing it is the
core of the work, not an edge case.

The implementation is four edits to `src/public/pollCard.js`:

1. **Add the matching rules and a whole-dataset assignment pass.** Two `\b`-anchored
   regexes plus two exact-label lists, and `assignResultColors(data)` returning a
   parallel colors array — one pass carrying the palette cursor, which is what lets
   semantic choices skip palette entries (FR-007). Built without the `g` flag; see
   [R3](./research.md) for why that flag would be a live defect here.
2. **Replace `getResultColor(index)`.** One call site; the rebuild path takes its color
   from the precomputed array.
3. **Reapply colors in the in-place branch.** Fill background plus label/percentage ink
   and shadow, from the same array the rebuild path uses. This is the R1 fix.
4. **Lower the ink threshold in `textStyleFor` from `0.55` to `0.40`.** `#FC9E9E`'s
   luminance is 0.476, so the unmodified rule gives it white text at 2.00:1; dark ink
   reaches 8.72:1. Measured across all 52 colors, `#FC9E9E` is the only one whose ink
   changes (FR-011a, [R4](./research.md)).

**The back face needs no change** — `renderVotingOptions` sets no background color, so
FR-013 and SC-006 are satisfied by not touching it. This is why step 1 returns a separate
array instead of writing a color onto each item: both faces share one cached dataset, and
a mutation there would leak a front-face concern into the back face ([R5](./research.md)).

**The palette recolor is already done.** Seven entries were darkened to meet SC-004
before this feature began; all 50 now pass, lowest is moss at 4.93:1. This plan does not
change the palette.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS server / vanilla JS + CSS client
(existing project, unchanged). This feature touches `src/public/pollCard.js`, one CSS rule
in `src/public/site.css`, and one test file — no TypeScript source. `src/public/pollCard.css`
stays untouched: it is the reference stylesheet, and app-owned rules belong in `site.css`
(the convention 007 and 008 followed).

**Primary Dependencies**: None new. Uses the file's existing module-scope constant style
and its established `luminanceOf` / `textStyleFor` helpers.

**Storage**: MongoDB, unchanged. No schema, field, index, or payload change — colors are
derived at render time from the choice label already present on every poll payload. See
[data-model.md](./data-model.md).

**Testing**: Vitest + supertest, existing pattern. Per spec.md's clarification session
(2026-08-15), automated coverage is limited to asserting the served `/pollCard.js` still
carries the two hex values and the `0.40` threshold — extending
`tests/poll-card-assets.test.ts`, which already fetches that asset and asserts on its
text. Behavior is validated manually via [quickstart.md](./quickstart.md). No jsdom, no
new test dependency. The accepted limitation is stated in [R6](./research.md): asset
assertions cannot catch the R1 defect, so the quickstart reorder scenario is mandatory.

**Target Platform**: Unchanged — DigitalOcean App Platform (Linux) for deployment; local
dev on Windows 11 + PowerShell (`devScripts/launch-dev.ps1`).

**Project Type**: Single project, existing layout. No new directories, no new source
files.

**Performance Goals**: Not applicable as a target, but the change must not regress the
live-refresh path. Per bar per refresh it adds two regex tests against a label of ≤200
characters and a few style writes — negligible against the existing DOM work, and far
cheaper than the full rebuild that R1's rejected alternatives would have triggered.

**Constraints**: Colors are display-derived only — nothing persisted, nothing configurable
(spec.md Assumptions). The back face must remain byte-for-byte unchanged in behavior.

**Scale/Scope**: Up to 50 choices per poll; 52 distinct colors in play (50 palette + 2
semantic). Every bar must receive a color at any choice count (SC-005).

## Constitution Check

*GATE: evaluated before Phase 0 and re-checked after Phase 1.*

| Principle | Assessment | Status |
|---|---|---|
| **I. Think Before Coding** | Four ambiguities were surfaced and resolved with the requester before planning (spec.md Clarifications). Phase 0 surfaced the R1 in-place-update trap and the `g`-flag hazard rather than discovering them mid-implementation. Two accepted limitations are stated openly: "Not true" renders green, and asset assertions cannot catch R1. | ✅ Pass |
| **II. Simplicity First** | Four edits to one file. No new abstraction, no config surface, no new dependency, no speculative support for extra trigger words. The assignment pass is a single function because FR-007's skip rule genuinely requires whole-dataset context ([R2](./research.md)) — not for flexibility. | ✅ Pass |
| **III. Surgical Changes** | Only `pollCard.js`'s color path changes, plus assertions in an existing test file. `getResultColor` is replaced rather than left orphaned. The back face, the palette, CSS, and all layout/sorting/scrolling code are untouched. The threshold move is one comparison, measured to affect exactly one color. | ✅ Pass |
| **IV. Goal-Driven Execution** | Every FR maps to a numbered quickstart scenario with a stated expected result; SC-004 is verifiable by computation. The R1 defect has a dedicated reorder scenario because it is the one failure mode no static check can reach. | ✅ Pass |
| **V. Code Quality & Maintainability** | Two single-purpose functions (`semanticColorFor`, `assignResultColors`) matching the file's existing style. The stale invariant comment at line 466 is corrected as part of the change rather than left contradicting the code. A label that is null, empty, or non-string coerces to `''` and takes a palette color — no crash. | ✅ Pass |

**Result: PASS — no violations, Complexity Tracking table not required.**

One judgment call worth recording: Principle V favors automated verification, and the
chosen approach leaves the matching logic and the R1 fix without automated coverage. That
was the requester's explicit decision during clarification, taken with the tradeoff
stated. It is mitigated — not resolved — by making the quickstart reorder scenario
mandatory and by keeping the assignment logic small enough to review by eye.

## Project Structure

### Documentation (this feature)

```text
specs/009-POLL-CHOICE-COLORS/
├── plan.md              # This file
├── research.md          # Phase 0 output — R1..R6
├── data-model.md        # Phase 1 output
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
    ├── pollCard.js      # Primary source file
    │                    #   ~line 204  getResultColor  -> replaced by
    │                    #              semanticColorFor + assignResultColors
    │                    #   ~line 224  textStyleFor    -> threshold 0.55 -> 0.40
    │                    #   ~line 461  in-place branch -> reapply colors (R1 fix)
    │                    #   ~line 493  rebuild branch  -> read from colors array
    └── site.css         # One added rule: .result-fill trailing edge (FR-012)

tests/
└── poll-card-assets.test.ts   # Extended with asset assertions for 009
```

Unchanged and explicitly out of scope: `src/public/pollCard.css` (the reference
stylesheet — app-owned rules go in `site.css` instead), `src/public/pollGrid.js`,
everything under `src/routes/` and `src/polls/`, and `renderVotingOptions` within
`pollCard.js` itself.

**Structure Decision**: Single project, existing layout, no new files in `src/`. The
feature is a localized change to one client-side render path, so it introduces no
modules, directories, or build steps. The only new artifacts are this feature's spec
documents.

## Phase Status

- [x] **Phase 0 — Research**: complete → [research.md](./research.md) (R1–R6, no
      unresolved NEEDS CLARIFICATION)
- [x] **Phase 1 — Design & Contracts**: complete → [data-model.md](./data-model.md),
      [contracts/ui-contracts.md](./contracts/ui-contracts.md),
      [quickstart.md](./quickstart.md); agent context updated
- [ ] **Phase 2 — Tasks**: not started; run `/speckit-tasks`

## Post-Design Constitution Re-Check

Re-evaluated after Phase 1. No gate changed status. The design added no source files, no
dependencies, and no persisted state; `data-model.md` confirms zero storage impact and
`contracts/ui-contracts.md` confines the change to one render path. **PASS.**
