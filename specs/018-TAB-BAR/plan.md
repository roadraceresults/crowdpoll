# Implementation Plan: Tab Bar

**Branch**: `dev` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/018-TAB-BAR/spec.md`

## Summary

The home page's tab bar gains an icon before each label, a one-pixel rule under the row that
spans the browser window while the row stays inside the 1280px column, Title Case labels in the
mockup's order (Trending · Newest · My Private Polls · Favorites · Live Results · Search), and a
sixth tab, Newest, that highlights when clicked, shows an empty grid, asks the server for nothing
and disables Refresh. Every existing tab keeps its behaviour to the letter.

The approach is markup and stylesheet work with one script stub. Six inline SVGs go into
`index.html` — three copied from glyphs the page already ships (the card's star, the card's
animated bars, the header's magnifying glass) plus the default avatar's shapes, and two drawn
new (the rising arrow, the circled exclamation mark). `tabs.css` makes each button an
`inline-flex` row, sizes the icons, and draws the rule as a `::after` on the non-scrolling
`.tab-bar-wrap` with `overflow-x:clip` on `.page` as the scrollbar guard. `tabs.js` registers a
Newest controller with no behaviour, because `select()` ignores a tab it has no controller for.
No endpoint, contract, configuration, table or poll card behaviour changes.

## Technical Context

**Language/Version**: TypeScript 5.8 (server, ES modules, `node >=22`); vanilla ES2020 JavaScript
served as static assets (client — no framework, by long-standing project choice). This feature
touches no TypeScript.

**Primary Dependencies**: Express 5, Kysely 0.29 + `pg`, BetterAuth 1.3 — none exercised here.
No client dependencies; the build (`devScripts/build-assets.ts`) copies `src/public` to
`dist/public` and fingerprints assets, and is not changed

**Storage**: PostgreSQL / Valkey / OpenSearch — untouched. Nothing is stored by this feature

**Testing**: Vitest 3; the home page is exercised in jsdom 30 through `tests/helpers/browser.ts`
(`openPage`, `click`, `cardTitles`, request capture); the shipped client files are read as text by
the asset suites. jsdom does not lay out or paint, so pixel geometry (16px icons, the 100vw rule)
is asserted on the stylesheet text and verified visually in `quickstart.md`

**Target Platform**: DigitalOcean App Platform web service serving its own static client;
evergreen desktop and mobile browsers. `overflow:clip` and `100vw` are supported by every
evergreen browser since 2022

**Project Type**: Single project — an Express web service serving its own static client from
`src/public`

**Performance Goals**: none new. Zero additional requests on page load (icons are inline;
SC-005); zero requests from the Newest tab (SC-004); the Live Results bars reuse the card's
existing animation, so no new continuous work runs in the page

**Constraints**: the page DOM around the bar is not restructured (the rule is a pseudo-element,
FR-021); tab identifiers (`data-tab` / `data-panel`) are unchanged so every existing selector,
deep link and test keeps working; the active pill's CSS is untouched (FR-004); the card's
`.live-bars` definition is *shared*, not copied (FR-010, assumption); icons are decorative to
assistive technology (FR-014)

**Scale/Scope**: 1 HTML file (six buttons, six icons, one panel), 1 stylesheet (≈ 30 lines), 1
script (one controller registration, one line), 1 SVG file (one comment line), 1 UI contract,
1 browser test file (+ ≈ 5 tests), 1 asset test file (+ ≈ 4 tests). `README.md` and
`ARCHITECTURE.md` updated after implementation

**Unknowns**: none. The specification carries no `[NEEDS CLARIFICATION]` markers — two
architecture passes closed 13 findings against the source requirements and `/speckit-clarify`
found nothing further to ask.

## Constitution Check

*GATE: evaluated against `.specify/memory/constitution.md` v1.1.0. Re-checked after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| **I. Think Before Coding** | Assumptions stated; no silent interpretation | **PASS** — every interpretation the feature needed (order, casing, colours, sizes, the line's host, Newest's behaviour, animation lifetime, accessibility, where the SVGs live) was raised as an architecture finding and written into the requirements before this plan; the nine assumptions in `spec.md` are the residue |
| **II. Simplicity First** | Minimum code; nothing speculative | **PASS** — the Newest controller is an object literal in `tabs.js`, not a module (R6); no icon sprite, no icon component, no new CSS custom properties; the rule is one pseudo-element rule plus one guard; the Live Results icon is the card's markup and stylesheet, not a copy. Nothing is built for what Newest will one day list |
| **III. Surgical Changes** | Every changed line traces to the request | **PASS** — six buttons rewritten (order, casing, icons), one section and one registration added, ≈ 30 lines of CSS, one comment in `avatar-default.svg` (FR-015). The pill, hover, disabled and Refresh rules are not touched; no other page or stylesheet changes. README's stale "the oldest leaves when a sixth is added" (FIX028) is corrected only because the tab count on the same line changes |
| **IV. Goal-Driven Execution** | Verifiable success criteria per task | **PASS** — eight measurable success criteria; `quickstart.md` gives a runnable scenario per user story, with the geometry checks (rule width, no horizontal scrollbar, icon size) as manual steps since jsdom cannot paint |
| **V. Code Quality & Maintainability** | Minimal, modular, graceful errors; browser logs minimal and never sensitive | **PASS** — nothing new is logged; no error paths are added (Newest has no request to fail) |
| **VI. Self-Documenting Code** | Comments only point at external documentation | **PASS with one deliberate comment** — the note in `avatar-default.svg` that its shapes are copied inline in `index.html` is a pointer to another artifact, which the principle allows; FR-015 requires it. The new HTML and CSS carry no explanatory or requirement-citing comments; the existing FIX-numbered comments in the tab bar region of `index.html` are left where the surrounding line does not change |
| **Documentation Deliverables** | `README.md` and `ARCHITECTURE.md` regenerated at the project root *after* implementation | **PASS — carries two obligations.** Both files exist; each is updated in place: README's "five-tab" overview becomes six with Newest named as coming, and its Live Results sentence is corrected to the FIX028 refusal; ARCHITECTURE's `tabs.js` node reads "six tabs". `README.md` must remain free of references to `specs/`, `designDocs/` and `architecture/` |

No gate fails. The Complexity Tracking table is omitted.

## Project Structure

### Documentation (this feature)

```text
specs/018-TAB-BAR/
├── plan.md              # This file
├── research.md          # Phase 0 output — 8 decisions
├── data-model.md        # Phase 1 output — the tab and its icon (no stored data)
├── quickstart.md        # Phase 1 output — validation scenarios per user story
├── contracts/
│   └── ui-contracts.md  # Phase 1 output — the bar's markup, states and rule; supersedes 017's "Tabs" section
├── checklists/
│   └── requirements.md  # /speckit-specify output — 16/16
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/public/
├── index.html            # six .tab buttons in the stated order, Title Case labels, an inline SVG
│                         #   (or the .live-bars span) before each label; a sixth .tab-panel[data-panel="newest"]
├── tabs.css              # .tab as inline-flex with a 6px gap; .tab-icon 16×16; the .live-bars box;
│                         #   the Newest and Favorites fixed greys; .tab-bar-wrap position:relative + ::after
│                         #   rule; .page overflow-x:clip
├── tabs.js               # init(): controllers.newest = { guestsAllowed, state, activate, refresh: null }
├── avatar-default.svg    # one comment: the shapes are copied inline in index.html
├── pollCard.css          # unchanged — .live-bars and live-bar-bounce already load on the home page
└── site.css              # unchanged — the header's .search-icon SVG is copied, not its class

tests/
├── client-home.test.ts   # six tabs in order with Title Case labels; icons aria-hidden and the label is the
│                         #   accessible name; Newest opens for a guest and a member, sends nothing, Refresh
│                         #   disabled, panel empty with no message; existing suites unchanged
└── tab-bar-assets.test.ts   # new: index.html carries six icons and the .live-bars span in the Live tab; the
                          #   Favorites star path equals pollCard.js's; tabs.css carries the ::after rule and
                          #   overflow-x:clip; avatar-default.svg carries the note

README.md, ARCHITECTURE.md   # updated after implementation (constitution)
```

**Structure Decision**: single project, existing layout; one test file is added, no source file.
The change is confined to the home page's markup, its stylesheet and one registration in its tab
script. `pollCard.css` and `site.css` are read, not written. No server file, contract file or
seed changes.

## Phase Status

| Phase | Output | Status |
|---|---|---|
| 0 — Research | `research.md` (R1–R8) | complete |
| 1 — Design | `data-model.md`, `contracts/ui-contracts.md`, `quickstart.md`, agent context (`CLAUDE.md`) | complete |
| 2 — Tasks | `tasks.md` | `/speckit-tasks` |

## Post-Design Constitution Re-Check

Re-evaluated after Phase 1 with the UI contract and quickstart in hand.

- **II. Simplicity First** — held. The design added nothing beyond the Technical Context's count.
  The one temptation resisted: a `newestTab.js` module mirroring `trending.js`, "ready for the
  next feature". The next feature will write that module against its own requirements; a stub
  file now is speculative structure (R6).
- **III. Surgical Changes** — held. The contract lists exactly the lines that change in
  `index.html`; the `.tab` rule gains `display:inline-flex; align-items:center; gap:6px` and
  loses nothing (R2).
- **VI. Self-Documenting Code** — held. One pointer comment (`avatar-default.svg`), required by
  the spec and pointing at another file rather than describing behaviour.
- **Documentation Deliverables** — unchanged obligation; carried as the final task phase.

No new violations. Ready for `/speckit-tasks`.
