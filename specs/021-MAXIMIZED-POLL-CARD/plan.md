# Implementation Plan: Maximized Poll Card

**Branch**: `dev` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/021-MAXIMIZED-POLL-CARD/spec.md`

## Summary

A visitor can open any poll card maximized, in place, inside the tab they are on. They open it by
its title, its subtitle or a new Maximize icon beside the Favorites star. The tab's grid is hidden,
and the **same card instance** moves into a `.maximized-card-grid` built from the stand-alone
layout: the card, a 2 px rule and a grey placeholder panel (FIX04 removed the stand-alone layout's
close row; the card's Maximize icon becomes a Minimize icon that closes the view). There
the card shows every bar with no scrolling. Bar height falls linearly from 50 px at `minChoices`
to 25 px at `maxChoices`, with a fixed 2 px gap. Minimize, Escape or a click on the current tab moves
the card back and restores the scroll position and focus. Another tab, a search or a sign-in change
closes the view too. A poll that leaves the listing closes it at once, except on Trending and
Newest, where the view is kept until the visitor closes it.

Every card, maximized or not, also takes the research page's colour technique. Bars get 50 vibrant
xkcd fills on an 80% tint of themselves, with text dark over the tint and a light or dark shade of
the fill over the fill, no halo (FIX05; before it, 50 light fills with dark same-hue text). Yes/No bars are
`#018826` / `#CF0234` on a pale tint, and their text turns white over the fill, split at the fill's
edge by a clipped white copy that animates with the fill. 009's black/white ink, 010's coverage rule
and the 0.40 threshold are removed. The grid card's sizes are unchanged.

Entirely client-side: `pollCard.js`, `tabs.js`, `trending.js`, `newest.js`, `index.html` and three
existing stylesheets. No server, route, contract, configuration or database change.

## Technical Context

**Language/Version**: vanilla ES2020 JavaScript served as static assets, with no framework, by
long-standing project choice. No TypeScript source file is touched. The tests are TypeScript.

**Primary Dependencies**: none new. Express 5, Kysely and BetterAuth are untouched.
`devScripts/build-assets.ts` copies and fingerprints `src/public` and is not changed, because no
file is added to it.

**Storage**: none. The feature stores nothing; see `data-model.md`.

**Testing**: Vitest 3 and jsdom through `tests/helpers/browser.ts` (`openPage` loads `index.html`
and the fixed script list, which already includes every script touched here). `tests/client-home.test.ts`
covers the tabs and cards end to end, and `tests/poll-card-assets.test.ts` covers the served card
constants. The feature's own cases go in two new files: `tests/client-maximized.test.ts` (User
Stories 1, 2, 4 and 5) and `tests/client-bar-colours.test.ts` (User Story 3). They sit beside
`client-home.test.ts` rather than in it, so the colour suite can run in parallel with the view's,
and the maximized suite can start its own context with a small `ENV_MAX_TRENDING_POLLS`. jsdom neither lays out nor paints, so geometry, the responsive thresholds and the
animated clip are checked in `quickstart.md` in a real browser.

**Target Platform**: DigitalOcean App Platform web service serving its own static client; evergreen
desktop and mobile browsers. `clip-path` transitions, `min()` and container queries are all
supported by them.

**Project Type**: Single project — an Express web service serving its own static client from
`src/public`.

**Performance Goals**: no new request. Opening and closing are DOM moves plus one render of one
card. A 50-bar maximized render is one pass, with no measurement for sizing. Ink is precomputed once
at load, so colouring a bar is a `Map` lookup. The overlay adds at most one element per Yes/No bar.

**Constraints**: the grid card's sizing, scrolling and truncation are unchanged (FR-034). Opening
and closing send no request (FR-024). A card is in exactly one place. Nothing in the maximized view
may overflow on a phone (FR-013). Contrast is at least 7:1 for palette ink and at least 4.5:1 for
white on semantic fills (FR-030, FR-031). The Yes/No split tracks the fill's edge at every moment
(FR-032).

**Scale/Scope**:
- `pollCard.js`: about 150 lines changed. The palette and semantic constants, the colour helpers, the
  ink map, the overlay, the layout function argument, `setMaximized`, the Maximize button and the
  click wiring. The black/white ink code is removed.
- `tabs.js`: about 120 lines. `maximize` and `restore`, retention, the four exits, and patching a
  retained card.
- `trending.js`, `newest.js`: one option each.
- `index.html`: one `<template>`.
- CSS: about 80 lines across `tabs.css`, `pollCard.css` and `site.css`.
- Tests: about 15 new cases, and 2 assertions replaced.
- One new asset, `designDocs/dontTrack/maximizeIcon.svg`.
- Notes in 009, 010 and 017, and README / ARCHITECTURE after implementation.

**Unknowns**: none. See `research.md` R1 – R11.

## Constitution Check

*GATE: evaluated against `.specify/memory/constitution.md` v1.1.0. Re-checked after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| **I. Think Before Coding** | Assumptions stated; no silent interpretation | **PASS.** 19 architecture findings and one clarification settled the interpretations before planning. The one limit the code imposes, that Trending and Newest cannot tell a deletion from a recompute, is surfaced in research R8 and written into the spec's edge cases and FR-026 rather than handled silently. |
| **II. Simplicity First** | Minimum code; nothing speculative | **PASS.** One card instance moved rather than a copy synced both ways (R1). One layout argument rather than a second renderer (R2). Scoped CSS overrides rather than a second template (R3). No new stylesheet or module (R6). The research page's aids (`#back`, `halo`, `rowGapFor`, the preview percentages) are not carried. |
| **III. Surgical Changes** | Every changed line traces to the request | **PASS.** The grid card's measured sizing, scrolling, truncation and in-place signature logic are untouched except where the colour rules run. The removed functions (`textStyleFor`, `majorityBackground`) are removed because the new rule replaces them (FR-036), not as cleanup. No other tab or page file is touched. |
| **IV. Goal-Driven Execution** | Verifiable success criteria per task | **PASS.** Nine measurable criteria, a test per FR the code touches (R11), a contrast test computed from rendered styles (SC-005), and 15 manual checks for what jsdom cannot see. |
| **V. Code Quality & Maintainability** | Minimal, modular, graceful errors; browser logs minimal | **PASS.** Nothing is logged. All closes go through one `restore` path. Focus targets fall back to `.tab-empty`, never to `<body>`. A vote in a deleted poll's retained card fails through the card's existing error path. |
| **VI. Self-Documenting Code** | Comments only point to external documentation | **PASS, with one obligation.** New code carries no explanatory or spec-citing comments. The comments that describe the removed black/white and coverage rules (009/010) go with that code, as the governance scope rule allows for regions being changed. A comment may point to the WCAG contrast definition, which is external. |
| **Documentation Deliverables** | README.md and ARCHITECTURE.md after implementation | **PASS, carrying one obligation.** README gains the maximize feature and the new bar colours. ARCHITECTURE gains the maximized view in the card and tab description. Both are written after implementation, and README must not reference `specs/`, `designDocs/` or `architecture/`. |

No gate fails. The Complexity Tracking table is omitted.

## Project Structure

### Documentation (this feature)

```text
specs/021-MAXIMIZED-POLL-CARD/
├── plan.md              # This file
├── research.md          # Phase 0 output: 11 decisions
├── data-model.md        # Phase 1 output: the view's state, the card's new state, palette and ink
├── quickstart.md        # Phase 1 output: npm test + 15 manual checks
├── contracts/
│   └── ui-contracts.md  # Phase 1 output: title row, maximized view, open/close, sizing, colours
├── checklists/
│   └── requirements.md  # /speckit-specify output: 16/16
└── tasks.md             # Phase 2 output (/speckit-tasks, NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/public/
├── pollCard.js      # palette (50 light entries, 1–2 restored); SEMANTIC_* #018826 / #CF0234;
│                    #   hexToRgb, contrastRatio, hexToHsl, hslToHex, darkShadeOf, mixWithWhite; ink Map at load;
│                    #   applyTruncation sets ink and no shadow; semantic tint and .result-ink-on-fill overlay,
│                    #   clip set beside every fill width; delete textStyleFor, majorityBackground, halos;
│                    #   renderers take a layout function; maximizedBarLayout(count, bounds);
│                    #   template: .maximize-btn after .bookmark-btn; title/subtitle/icon click → opts.onMaximize;
│                    #   instance: setMaximized(on), isMaximized, detail()
├── tabs.js          # createGrid: onMaximize default, choiceBounds from config, maximize(pid), restore({focus}),
│                    #   reorder loop skips the maximized card, unmount path honours retainMaximized,
│                    #   patchRetained(pid, …); module: maximized, closeMaximized() in select(), the tab-bar
│                    #   click (active tab → restore only), the session subscription, an Escape listener;
│                    #   applyVote and updateOverlayEverywhere also patch a retained card
├── trending.js      # createGrid options: retainMaximized: true
├── newest.js        # createGrid options: retainMaximized: true
├── index.html       # <template id="maximizedCardGrid">: card slot, .col-rule, .maximized-space-right
├── tabs.css         # .maximized-card-grid, .card-grid[hidden], .col-rule + container query,
│                    #   .maximized-space-right
├── pollCard.css     # .maximized-card-viewport (min(375px,100%)); no-scroll overrides under .maximized-card-flip;
│                    #   .result-ink-on-fill and its clip-path transition; compact rows hide it
└── site.css         # .maximize-btn beside .bookmark-btn (4 px gap, same colours); title/subtitle pointer + hover
                     #   underline, both off inside .maximized-card-viewport

designDocs/dontTrack/maximizeIcon.svg   # traced from maximizeIcon.jpg, black on transparent

tests/
├── client-maximized.test.ts   # new: open (title, subtitle, icon); close (Minimize, current tab without request, Escape);
│                              #   exits (another tab, search); same element + pending selection; every row, no active
│                              #   arrow row, count-based height; Favorites / Live Results close; Trending retention and
│                              #   a vote in a retained card; focus after each close
├── client-bar-colours.test.ts # new: contrast from rendered styles; the Yes/No tint and clipped overlay; the in-place
│                              #   reorder swapping fills, tints and overlays
└── poll-card-assets.test.ts   # #018826 / #CF0234 in place of #43F781 / #FC9E9E; the 0.40 assertion removed

specs/009-POLL-CHOICE-COLORS/, specs/010-ZERO-VOTE-TEXT-LEGIBILITY/,
specs/017-SEARCH-AND-SCALABILITY-DATABASE/contracts/ui-contracts.md   # a 021 note each (BC-1, BC-2)
README.md, ARCHITECTURE.md                                            # after implementation
```

**Structure Decision**: the existing single project. One asset is added under `designDocs/dontTrack/`,
and no source file is added or removed. The feature lives in the card component (`pollCard.js`), the
tab coordinator (`tabs.js`), the page shell (`index.html`) and the three stylesheets that already
hold each rule's counterpart. `liveResults.js`, `searchTab.js`, `deltaClient.js` and every server
file are **not** touched. Live Results' removal focus already runs after the render that closes the
view, and the search closes it through `Tabs.select`.

## Phase Status

| Phase | Output | Status |
|---|---|---|
| 0: Research | `research.md` (R1 – R11) | complete |
| 1: Design | `data-model.md`, `contracts/ui-contracts.md`, `quickstart.md`, agent context (`CLAUDE.md`) | complete |
| 2: Tasks | `tasks.md` | `/speckit-tasks` |

## Post-Design Constitution Re-Check

Re-evaluated after Phase 1. **No change: all gates pass.** The design added two things the first
check did not see, and both stay within the principles:
- `patchRetained`, to keep a retained Trending/Newest card working. It is about 20 lines, and it is
  the smallest way to honour FR-019 for a card whose tab no longer holds its data (II).
- A spec amendment, surfaced rather than assumed (I): on Trending and Newest a deleted or rejected
  poll is kept open like a recomputed-out one, because the browser cannot tell them apart without a
  request the spec forbids.
