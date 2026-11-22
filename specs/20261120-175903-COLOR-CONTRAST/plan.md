# Implementation Plan: Color Contrast

**Branch**: `color-scheme` | **Date**: 2026-11-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261120-175903-COLOR-CONTRAST/spec.md`

## Summary

Options blend into the background in both schemes: vote rows are 1.1–1.2:1 from the card, selected rows 1.3–1.6:1 from
unselected ones, and six result colours are under 2:1 on the dark card. The approach (research R1–R12):

- `m3-tokens.css` becomes the one place both schemes' colours are set: a Light alias block mirrors the existing Dark one,
  so the duplicated legacy palettes no longer decide Light (R1).
- A darker page and a clearer card border (R2); muted text moves to `on-surface-variant` (R3).
- Vote rows get a 1 px `outline` edge; a selected row gets an amber fill and 2 px edge (`#643F00` with white in Light,
  `#FFB956` with `#462B00` in Dark), and its radio and check switch to the row's text colour (R4).
- Every result fill goes through the line graph's existing 3:1 lift against the card, in both schemes (R5); three palette
  entries that would collide after the lift are replaced (R6); text on a fill is black or white at ≥ 4.5:1 (R7); tracks
  take the deepest tint that reaches 1.5:1 (R8).
- Greens, icons and logo are untouched (C2, C14). `COLOR-CONTRAST.md` holds the frozen colours and required pairs as
  tables, which `tests/color-contrast.test.ts` reads and checks (R10, R11).

## Technical Context

**Language/Version**: TypeScript (Node ≥ 22, ESM) for tests; plain browser JavaScript (ES2020) and CSS for the client

**Primary Dependencies**: none new (Vitest, jsdom already present)

**Storage**: N/A — nothing stored or migrated

**Testing**: Vitest; jsdom client tests via `tests/helpers/browser.ts`; a new source-reading test
(`tests/color-contrast.test.ts`)

**Target Platform**: current desktop and mobile browsers (the site's existing support)

**Project Type**: web application (Express server, static client under `src/public/`)

**Performance Goals**: no measurable change; the per-row colour derivation stays precomputed per colour (a `Map` built
once per colour, as `BAR_COLORS` is today)

**Constraints**: frozen colours (FR-012–FR-014); no new cookie or storage; M3 layers hold only M3 tokens; scripts must not
depend on their own names at run time (obfuscation build); `m3-assets.test.ts` sheet order unchanged (no new sheet)

**Scale/Scope**: 4 stylesheets and `pollCard.js` changed; 1 new document, 1 new test; 3–4 existing tests updated

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | Two spec conflicts found in research are surfaced below (Spec follow-ups), not silently decided | Pass |
| II. Simplicity First | Reuses `lineColorOn`, `darkShadeOf`, `lightShadeFor`; no new sheet, no new dependency; the test reads the guideline instead of a second list | Pass |
| III. Surgical Changes | Legacy `:root` blocks left as they are; only the rules that draw rows, bars, card and page change | Pass |
| IV. Goal-Driven Execution | Every FR maps to a test row (G5–G7) or a quickstart step | Pass |
| V. Code Quality | One derivation function per concern; errors: an unparsable stored colour keeps today's fallback | Pass |
| VI. Self-Documenting Code | Comments only link to WCAG definitions and `COLOR-CONTRAST.md`; no spec or task ids in code | Pass |
| Documentation Deliverables | `ARCHITECTURE.md` updated after implementation (colour roles, lift rule); `README.md` unchanged in text | Pass |
| Security/Privacy | No input, storage or logging change | Pass |

**Post-design re-check**: Pass — the design adds two alias names (`--choice-edge`, `--on-choice-selected`) and changes
values; no principle is affected.

## Spec follow-ups (raised by research, resolved in analysis)

Both were accepted into the spec on 2026-11-20 (analyze-findings F1 A: FR-001, SC-007, US2 scenario 4; F2 A: FR-022, an
edge case, SC-004).

1. **Text on a bar's fill** (R7): FR-001 / SC-007 ask 7:1 for result-bar labels on "what they sit on". 7:1 on a fill
   that must also be 3:1 from a white card is impossible for mid-tone colours; the plan holds **7:1 on tracks and vote
   rows, 4.5:1 on a fill**. The spec should say so.
2. **Palette replacements** (R6): the 3:1 lift makes coral ≈ orange-red (Light) and black = darkslategray ≈ gray (Dark).
   The plan replaces three palette entries; the spec does not mention it.

## Project Structure

### Documentation (this feature)

```text
specs/20261120-175903-COLOR-CONTRAST/
├── plan.md              # This file
├── research.md          # R1–R12
├── data-model.md        # roles, pairs, result-colour derivation, palette, vote-row states
├── quickstart.md        # automated and by-eye validation
├── contracts/
│   ├── colors.md        # C1–C14: tokens, page/card, vote rows, bars, other options, logo/icons
│   └── guardrail.md     # G1–G8: COLOR-CONTRAST.md and tests/color-contrast.test.ts
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
COLOR-CONTRAST.md                 # new: guideline (G1–G3)
CLAUDE.md                         # one invariant line (G4); plan pointer
ARCHITECTURE.md                   # colour roles and lift rule (after implementation)
src/public/
├── m3-tokens.css                 # Light alias block; Dark alias values; two new aliases (C1, R1–R4)
├── pollCard.css                  # vote-row 1 px edge (C5)
├── pollCard-m3.css               # selected row: 2 px edge, label/radio/check colours (C6)
├── lineGraph.js                  # only if T020 finds the graph off the card: pass the card colour (R5)
└── pollCard.js                   # palette entries (R6), lift in both schemes (R5), tracks (R8), ink on fill (R7),
                                  # RESULTS_DARK_SURFACE (R5)
tests/
├── color-contrast.test.ts        # new (G5–G8)
├── client-bar-colours.test.ts    # updated (R12)
├── client-line-colors.test.ts    # updated (R12)
└── poll-card-assets.test.ts      # updated palette block (R12)
```

**Structure Decision**: the existing single web project; changes stay in `src/public/` and `tests/`, plus the root
documents. `lineGraph.js` changes only if T020 finds the graph off the card: it already lifts against the
computed card colour (R5), and keeps doing so wherever that is the card colour.

## Complexity Tracking

No constitution violations.
