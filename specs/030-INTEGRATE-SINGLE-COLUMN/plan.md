# Implementation Plan: Integrate Single Column

**Branch**: `dev` (no dedicated branch) | **Date**: 2026-10-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/030-INTEGRATE-SINGLE-COLUMN/spec.md`

> Amended by feature 031 (2026-10-14): see the note under Clarifications in `spec.md`; the media block for the tab-bar rules is now `max-width: 900px`.

> Amended by feature 20261023-155959-PHONE-TAB-BAR (2026-10-23): the scroll arrows, the hold and the step are removed (`tabBarScroll.js` keeps the drag, now for mouse and pen, gains a mouse-wheel handler and keeps the All tabs menu); up to 900 px each tab is one line, a 16 px icon beside the label in a 48 px tab, the row has a 32 px edge fade and scrolls with the browser's own touch scrolling, smoothly when a tab is chosen, and Refresh sits under the bar at the left with the All tabs button at the right.

## Summary

Bring the approved phone prototype (`prototypes/SINGLE-COLUMN-RENDERING/`) into the real pages as **layers, not edits** (research R1, R2). Two new Material 3 layer sheets carry every rule: `header-single-column-m3.css` (the compact header, on all seven pages that have the header) and `single-column-m3.css` (the cards, tab bar, Refresh row, floating pair and Search field, on the home page only). Two new home-page scripts carry the behavior the prototype's harness proved: `tabBarScroll.js` (arrows, hold, drag, all-tabs menu) and `floatingActions.js` (the guest pair). Three existing files get small, surgical edits: `index.html` (new elements and links), `searchTab.js` (the Search tab field) and `app.js` (one avatar menu item). Tests and `CLAUDE.md` follow. No server, route, configuration, data, contract or migration change.

## Technical Context

**Language/Version**: Plain browser JavaScript and CSS in `src/public/` (no build step for the pages), TypeScript tests; Node ≥ 22.

**Primary Dependencies**: None new. Reads existing globals only: `window.Tabs` (`select`, `canRequest`, `emptyState`), `window.SearchTab`, `window.PollCard`'s `--single-column` marker.

**Storage**: N/A. The floating pair's position and the tab bar's scroll position live in memory only (data-model.md).

**Testing**: Vitest + jsdom through `tests/helpers/browser.ts` (`openPage`, scripts opt in by name); layout numbers are stubbed because jsdom has no layout and applies no stylesheet; `tests/m3-assets.test.ts` and `tests/pages.test.ts` pin each page's sheets and scripts; the look is checked by hand on a phone (quickstart).

**Target Platform**: Phone browsers (touch and mouse), 360–639 px wide; wide layouts unchanged.

**Project Type**: Web application, static pages served by the existing Express server and fingerprinted by `devScripts/build-assets.ts`.

**Performance Goals**: A tap on an arrow starts moving within one frame; a hold and a drag follow the pointer at the display's frame rate; no layout work on scroll beyond reading the card grid's rectangle.

**Constraints**: Nothing changes at 640 px and wider; no new network request; reduced-motion users get no animation; no explanatory comments in the ported code (Constitution VI); minimal browser-console logging.

**Scale/Scope**: 2 new stylesheets (about 190 lines together), 2 new scripts (about 300 lines together), 4 small edits, 5 new test files and one helper, and 3 edited.

## Constitution Check

*GATE: passed before Phase 0; re-checked after Phase 1.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | Every open question was closed by the architecture review (19 findings); assumptions are in the spec. | Pass |
| II. Simplicity First | Layers port the prototype's rules as they are; no new configuration, no switch (spec N4); two scripts of one purpose each. The prototype's tunable numbers stay as named CSS variables or script constants, as the prototype has them. | Pass |
| III. Surgical Changes | No production stylesheet is edited. Edits to `index.html`, `searchTab.js`, `app.js` are limited to the new elements and handlers; neighbouring code is untouched. | Pass |
| IV. Goal-Driven Execution | Each requirement maps to a test or a named manual check (quickstart). | Pass |
| V. Code Quality | Single-purpose functions; the prototype's long closures are split by purpose when ported (research R12); errors cannot occur on missing elements because each script returns at once if its elements are absent. | Pass |
| VI. Self-Documenting Code | The prototype is full of explanatory comments; none are ported. Intent is carried by names and the tests. | Pass, with a porting rule (R12) |

No violations, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/030-INTEGRATE-SINGLE-COLUMN/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0: R1–R14
├── data-model.md        # Phase 1: in-memory UI state only
├── quickstart.md        # Phase 1: validation guide
├── contracts/
│   └── ui-contracts.md  # Phase 1: C1–C10 (no HTTP contract changes)
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/public/
├── header-single-column-m3.css   NEW  header rules; loads after header-tab-bar-m3.css on 7 pages
├── single-column-m3.css          NEW  cards, tab bar, Refresh, floating pair, Search field; last on index.html
├── tabBarScroll.js               NEW  arrows, hold, drag, all-tabs menu (home page)
├── floatingActions.js            NEW  guest pair: move, place, clamp, drag (home page)
├── index.html                    EDIT arrows, menu button and menu in .tab-bar-wrap; #floatingActions; search form in #panel-search; 1 sheet + 2 scripts
├── searchTab.js                  EDIT the field's submit, clear, "/" and ?q= fill
├── app.js                        EDIT "Create Poll" item in the avatar menu
├── login.html, create-account.html, profile.html, not-authorized.html,
│   admin.html, admin-results.html  EDIT one <link> each (header layer)

tests/
├── m3-assets.test.ts             EDIT LAYER_ORDER and the seven pages' lists
├── pages.test.ts                 EDIT the assets the home page must reference
├── client-tab-bar-scroll.test.ts NEW  step targets, hold, first frame, drag, arrows, menu
├── client-floating-actions.test.ts NEW placement, clamp, reset, header rebuild, OAuth
├── client-search-tab-field.test.ts NEW field submit/clear/"/"/?q=
├── single-column-sheets.test.ts  NEW  sheet text: marker and defaults, card, tab bar, Refresh and header rules
├── client-create-poll-item.test.ts NEW  the avatar item (enabled, disabled, absent for guests)
├── client-home.test.ts           EDIT the avatar menu's list of links
└── helpers/single-column-page.ts NEW  home page in jsdom with no server

prototypes/SINGLE-COLUMN-RENDERING/  UNCHANGED (design record)
CLAUDE.md                         EDIT feature section (research R14)
```

**Structure Decision**: Existing layout, with new files beside their kind in `src/public/`. The architecture document and the plan both name two new scripts, because arrows/menu and the floating pair share nothing (research R2).

## Complexity Tracking

No constitution violations to justify.
