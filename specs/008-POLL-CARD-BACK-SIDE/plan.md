# Implementation Plan: Poll Card Back Side Parity

**Branch**: `dev` | **Date**: 2026-08-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-POLL-CARD-BACK-SIDE/spec.md`

## Summary

The reported bug has a single root cause, found during Phase 0 (research.md R1):
`007-closed-state` gave `.poll-closed-message` an unconditional `display:flex`
in `site.css` but never added the matching `[hidden]` override it added for its
neighbours (`.live-link`, `.vote-btn`, `.submit-vote-btn`). An author-origin
`display` declaration beats the UA stylesheet's `[hidden]{display:none}`, so
**both closed-message elements render on every poll, open or closed**. On the
voting side that phantom element is `flex:1 1 auto` with a `28px` basis and a
`16px` bottom margin, sitting as a sibling of the equally-`flex:1` choices
region — so it steals roughly half the card's free vertical space plus 44px.
That is exactly the shortened choices region and the empty band above the
footer in `poll-card-back-side-bug.jpg`.

The fix is correspondingly small and surgical:

1. One CSS line restores `[hidden]` for both closed-message variants — this
   alone resolves FR-001, FR-002 and FR-003.
2. A `.poll-totals` element is added to the voting side's `.question-wrap` and
   `setText()` switches from `querySelector` to `querySelectorAll`, equalising
   the two headers (FR-004, FR-005).
3. A visually-hidden width sizer stacked behind the **Vote** button's label —
   in a single-cell grid, so the button sizes to the *larger* of the two strings
   rather than their sum — makes both primary buttons resolve to the same
   content-derived width (FR-007). See research.md R7 for why the grid is
   load-bearing.
4. The two closed messages are restyled to the participation count's muted
   treatment, keeping the front variant's `28px` height so the footer does not
   move (FR-008, FR-006a).

**FR-006 needs no code change.** Both faces already derive identical footer
geometry from the same rules; the apparent difference in the screenshot is a
consequence of the phantom element, not a separate defect. See research.md R2 —
this is a verification-only requirement, and quickstart.md measures it.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS / vanilla JS + CSS
client (existing project, unchanged). This feature touches only the
vanilla-JS/CSS client — no TypeScript source files change.

**Primary Dependencies**: None new. Extends `src/public/pollCard.js`'s existing
`POLL_CARD_TEMPLATE` / `setText()` and `src/public/site.css`'s established
app-owned-additions convention (the same split `007-closed-state` used:
`pollCard.css` is the untouched reference stylesheet, `site.css` carries
app-owned overrides).

**Storage**: MongoDB, unchanged — no schema, field, index, or payload change
(data-model.md). The voting side's participation count reads `totalVoted` /
`totalNotYetVoted`, already present on every voter-facing poll payload and
already rendered on the results side.

**Testing**: Vitest + supertest (existing pattern). Per spec.md VM-001/VM-002
(clarification session 2026-08-14), the pixel-parity criteria SC-001…SC-006 are
verified **manually** via quickstart.md; no layout-measuring or
browser-automation harness is introduced. Automated coverage is limited to
supertest assertions that the served static assets carry the new markup and
rules — the same `expect(res.text).toContain(...)` pattern `tests/pages.test.ts`
already uses.

**Target Platform**: Unchanged — DigitalOcean App Platform (Linux) for
deployment; local dev on Windows 11 + PowerShell (`devScripts/launch-dev.ps1`).

**Project Type**: Single project (existing layout, extended — no new top-level
directories, no new files in `src/`).

**Performance Goals**: Not applicable. The change removes two always-rendered
flex items from every card and adds one static text element per card; per-render
cost is unchanged (`setText()` writes one more text node).

**Constraints**: The `pollCard.css` reference-stylesheet / `site.css`
app-overrides split must be preserved (research.md R3). The card's overall size,
the results-side bar rendering, and all admin pages are out of scope and must
not change (spec.md Assumptions).

**Scale/Scope**: 4 user stories, 11 functional requirements. Touches exactly two
files — `src/public/pollCard.js` (one template element, one `querySelector` →
`querySelectorAll`, one label wrapper plus sizer span) and `src/public/site.css`
(one `[hidden]` selector list extended, two rule blocks restyled, three new
button-sizing rules) — plus one new test file. No new dependencies, no API change (`postman/openapi.json`
unchanged), no server-side change.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|---|---|---|
| **I. Think Before Coding** | Four ambiguities were resolved in `/speckit-clarify` (spec.md Clarifications) before planning. Phase 0 diagnosed the actual root cause from the cascade rather than assuming the region needed new layout code, and the plan states plainly where the spec's premise did not reproduce (FR-006, research.md R2). | ✅ PASS |
| **II. Simplicity First** | The core defect is fixed by extending one existing selector list by two selectors. No new layout system, no JS measurement loop, no new abstraction. The largest single addition is a 4-line CSS rule for the button sizer. | ✅ PASS |
| **III. Surgical Changes** | Two existing files, each edited in place; `pollCard.css` (the reference stylesheet) is untouched, matching the convention set in 007. No adjacent cleanup, no refactoring of the render cycle. The pre-existing `querySelector`-vs-`querySelectorAll` inconsistency in `setText()` is changed only because FR-004 requires it. | ✅ PASS |
| **IV. Goal-Driven Execution** | Every FR maps to a named verification step in quickstart.md, and each is measurable (same top/bottom edge, same row count, identical text, ≤1px deltas, matching computed styles). FR-006's criterion is explicitly "verify unchanged", not "assume unchanged". | ✅ PASS |
| **V. Code Quality & Maintainability** | Changes follow the file's existing commenting density and the project's convention of citing the FR each rule serves. The `[hidden]` fix is added to the existing comment block that already explains this exact cascade hazard, so the next reader sees why all four selectors are listed together. No error paths are involved (no new I/O, no new failure modes). | ✅ PASS |

**Gate result: PASS** — no violations, Complexity Tracking table not required.

**Post-Phase-1 re-check**: PASS, unchanged. Phase 1 design added no new files to
`src/`, no dependencies, and no abstractions; the contract in
`contracts/ui-contracts.md` documents markup that already exists plus two small
additions.

## Project Structure

### Documentation (this feature)

```text
specs/008-POLL-CARD-BACK-SIDE/
├── plan.md              # This file (/speckit-plan command output)
├── spec.md              # /speckit-specify + /speckit-clarify output
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── ui-contracts.md  # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md  # /speckit-specify output
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── public/
│   ├── pollCard.js      # CHANGED — .poll-totals on the back face,
│   │                    #   setText() querySelectorAll, Vote button sizer
│   ├── pollCard.css     # UNCHANGED — reference stylesheet (convention from 007)
│   ├── site.css         # CHANGED — [hidden] fix, closed-message restyle,
│   │                    #   button sizer rule
│   ├── pollGrid.js      # UNCHANGED — mounts the card, no API change
│   └── ...              # all other pages unchanged
├── polls/               # UNCHANGED — no data or business-logic change
├── routes/              # UNCHANGED — no endpoint change
└── ...

tests/
├── poll-card-assets.test.ts   # NEW — VM-002 static-asset assertions
└── ...                        # all existing suites unchanged (SC-007)

postman/openapi.json     # UNCHANGED — no HTTP surface change
```

**Structure Decision**: Single project, existing layout. This is a
presentation-layer fix confined to `src/public/`, so no structural decision is
required beyond honouring the existing `pollCard.css` (reference, untouched) /
`site.css` (app-owned overrides) split that `007-closed-state` established and
`research.md` R3 re-confirms.

## Complexity Tracking

> Not required — Constitution Check passed with no violations.
