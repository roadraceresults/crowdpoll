# Implementation Plan: Live Results X

**Branch**: `dev` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/020-LIVE-RESULTS-X/spec.md`

## Summary

On the Live Results tab the poll card's removal control moves from the title row's corner button
into the bottom row's existing link: a plain X in place of the three animated bars, the same
"Live Results" label, "Remove from Live Results" as its tooltip and accessible name, and the same
`DELETE /api/live/:pid` behind it. The corner button, its stylesheet rules and its `showClose`
option are deleted. Two rules that hide the link — for a closed poll and for one being edited —
become form-aware, so the control survives every state the corner X survived. The link gains a
keydown handler (Enter and Space) and, after a removal, focus is placed on the next card's link,
the previous card's link, or the tab's empty-state line.

The approach is entirely client-side and confined to four files. `pollCard.js` gains a
`.live-x` span beside `.live-bars` in the card template, a `removeMode` derived from
`opts.onClose`, the form-aware visibility rules and the keydown handler; `pollCard.css` sizes the
new span; `site.css` loses the two `.card-close-btn` rules; `liveResults.js` stops passing
`showLive: false, showClose: true` and takes the focus placement after a successful removal. No
server file, route, contract, configuration or database change.

## Technical Context

**Language/Version**: vanilla ES2020 JavaScript served as static assets (client — no framework, by
long-standing project choice). No TypeScript file is touched by this feature.

**Primary Dependencies**: none exercised. Express 5, Kysely, BetterAuth are untouched; the build
(`devScripts/build-assets.ts`) copies `src/public` to `dist/public` and fingerprints assets, and
is not changed.

**Storage**: none. PostgreSQL, the cache, the Live Results registry and the published listing
objects are all untouched; the feature stores nothing.

**Testing**: Vitest 3 with jsdom 30 through `tests/helpers/browser.ts` (`openPage`, `click`,
`cardTitles`, request capture); the removal flow is already covered end to end in
`tests/client-home.test.ts` (the "Live Results" describe, lines ~505-570) and the card's markup in
`tests/poll-card-assets.test.ts`. jsdom does not lay out or paint, so the icon's size and the
label's position are asserted on the stylesheet text and confirmed visually in `quickstart.md`.

**Target Platform**: DigitalOcean App Platform web service serving its own static client;
evergreen desktop and mobile browsers.

**Project Type**: Single project — an Express web service serving its own static client from
`src/public`.

**Performance Goals**: none new. No request is added or removed; the X replaces three animated
`<i>` elements with one static SVG on the Live Results tab, so the tab's continuous work goes
slightly down.

**Constraints**: the removal request, its allowance (`live-membership` kind), its refusal notice
and the server's answer are untouched (FR-006); every other tab's card is untouched (FR-005,
FR-012); the card's other controls, faces and messages are untouched (FR-011); the control is
front-face only (FR-013); focus must never be left on the document body (FR-015).

**Scale/Scope**: 1 template edit + ~25 lines of logic in `pollCard.js`, ~8 lines of CSS added, 5
lines of CSS deleted, ~10 lines in `liveResults.js`, 1 rewritten browser test block (+2 tests),
possible touch-ups in `poll-card-assets.test.ts`, 1 annotation in 017's UI contract,
README/ARCHITECTURE after implementation.

**Unknowns**: none. The specification carries no `[NEEDS CLARIFICATION]` markers — two
architecture passes closed 12 findings against the source requirements and `/speckit-clarify`
closed the thirteenth (the focus target when the bottom card of several is removed).

## Constitution Check

*GATE: evaluated against `.specify/memory/constitution.md` v1.1.0. Re-checked after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| **I. Think Before Coding** | Assumptions stated; no silent interpretation | **PASS** — every interpretation the feature needed (which X drawing, the accessible name, the option shape, the closed/editing states, the card face, the keyboard keys, the focus target) was raised as an architecture finding or a clarification question and written into the requirements before this plan; the eight assumptions in `spec.md` are the residue |
| **II. Simplicity First** | Minimum code; nothing speculative | **PASS** — one element in two forms rather than two controls; the X reuses the two `<path>` strokes the corner button already carries; `showClose` is deleted rather than kept "in case"; no icon component, no new option object, no CSS custom property |
| **III. Surgical Changes** | Every changed line traces to the request | **PASS** — `pollCard.js`: one template edit, one derived flag, two conditionals made form-aware, one keydown handler, one deleted button and its handler; `site.css`: two rules deleted with their comment; `liveResults.js`: one options line and the focus placement. The Vote button, the Bookmark star, the results bars, the messages and every other tab's card are not touched |
| **IV. Goal-Driven Execution** | Verifiable success criteria per task | **PASS** — six measurable criteria; every task names its check; `quickstart.md` gives a runnable scenario per user story with the geometry and focus steps that jsdom cannot assert |
| **V. Code Quality & Maintainability** | Minimal, modular, graceful errors; browser logs minimal and never sensitive | **PASS** — nothing new is logged; no error path is added (the removal's refusal and failure handling are unchanged); the focus placement fails safe (if the target is gone, focus goes to the panel's empty-state line, never to the body) |
| **VI. Self-Documenting Code** | Comments only point at external documentation | **PASS** — the two FIX025 comments die with the code they describe; the new code carries no explanatory or requirement-citing comment; the behaviour is documented by the rewritten tests |
| **Documentation Deliverables** | `README.md` and `ARCHITECTURE.md` regenerated at the project root *after* implementation | **PASS — carries one obligation.** README's Live Results bullet describes removing a poll; ARCHITECTURE's card/tab description mentions the X in the corner. Both are updated after implementation; `README.md` must stay free of references to `specs/`, `designDocs/` and `architecture/` |

No gate fails. The Complexity Tracking table is omitted.

## Project Structure

### Documentation (this feature)

```text
specs/020-LIVE-RESULTS-X/
├── plan.md              # This file
├── research.md          # Phase 0 output — 7 decisions
├── data-model.md        # Phase 1 output — the control's two forms (no stored data)
├── quickstart.md        # Phase 1 output — validation scenarios per user story
├── contracts/
│   └── ui-contracts.md  # Phase 1 output — the card's controls; supersedes 017's Live Results rows
├── checklists/
│   └── requirements.md  # /speckit-specify output — 16/16
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/public/
├── pollCard.js        # template: <span class="live-x"> beside .live-bars; delete .card-close-btn and its SVG
│                      # logic: removeMode = typeof opts.onClose === "function";
│                      #        updateActionButtons picks icon, title, aria-label and shows the link;
│                      #        updateClosedState / updateEditingState hide the link only in add form;
│                      #        click + keydown (Enter, Space) route to onClose or onLive;
│                      #        delete closeBtn, its handler and the showClose option
├── pollCard.css       # .live-x { display:flex; width:14px; height:14px } and its svg sizing;
│                      #   .live-link .live-bars[hidden] / .live-x[hidden] { display:none }
├── site.css           # delete .card-front .question-row .card-close-btn and .card-close-btn[hidden]
│                      #   with the FIX025 comment above them
└── liveResults.js     # grid options: { showVote: true, onClose: removePoll, tab: TAB } — no showLive:false,
                       #   no showClose; removePoll places focus after a successful removal

tests/
├── client-home.test.ts        # the Live Results describe: removal through the link; the add form elsewhere;
│                              #   a closed-while-watched poll; keyboard (Enter, Space) and focus placement;
│                              #   no .card-close-btn anywhere
└── poll-card-assets.test.ts   # any assertion naming the close button's markup or the icon symbols

specs/017-SEARCH-AND-SCALABILITY-DATABASE/contracts/ui-contracts.md   # annotated (BC-2)
README.md, ARCHITECTURE.md                                            # updated after implementation
```

**Structure Decision**: single project, existing layout; no file is added and none is removed. The
change is confined to the poll card's markup, its two stylesheets and the Live Results tab module.
`tabs.js` is **not** touched — its universal `onLive` default and its `createGrid` merge already
give the card everything the two forms need.

## Phase Status

| Phase | Output | Status |
|---|---|---|
| 0 — Research | `research.md` (R1–R7) | complete |
| 1 — Design | `data-model.md`, `contracts/ui-contracts.md`, `quickstart.md`, agent context (`CLAUDE.md`) | complete |
| 2 — Tasks | `tasks.md` | `/speckit-tasks` |

## Post-Design Constitution Re-Check

Re-evaluated after Phase 1 with the UI contract and quickstart in hand.

- **II. Simplicity First** — held. Two temptations resisted: a shared `iconFor(mode)` helper for
  one branch, and keeping `.card-close-btn` hidden "in case a future feature wants a corner
  control" (R6 — 017's record is how it comes back).
- **III. Surgical Changes** — held. The contract lists exactly the lines that change; the
  `.live-link` rule itself is untouched, and the new `.live-x` rule sits beside `.live-bars`.
- **VI. Self-Documenting Code** — held. Two comments are deleted with their code; none is added.
- **Documentation Deliverables** — unchanged obligation; carried as the final task phase.

No new violations. Ready for `/speckit-tasks`.
