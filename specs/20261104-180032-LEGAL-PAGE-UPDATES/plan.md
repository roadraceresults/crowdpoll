# Implementation Plan: Legal Page Updates

**Branch**: `legal-page-updates` | **Date**: 2026-11-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261104-180032-LEGAL-PAGE-UPDATES/spec.md`

## Summary

Three changes to the browser pages, no server change beyond one constant:

- the Privacy Policy's bot-check section becomes **Bot and AI Agent Detection**, with its summary line and retention row renamed, the anchor `#bot-check` kept, and a new policy version (`TERMS_VERSION`) that every account accepts once (research R8);
- a new **Back arrow** on `/privacy` and `/terms` (`backArrow.js`, `back-arrow-m3.css`), shown only when the previous page is CrowdPoll's in the same tab (R1), going back through history past in-page anchor steps (R2), fixed under the header in line with the logo (R3), with a text gutter on narrow screens (R4), its look shared with the admin page's back link (R5);
- the **Up arrow** centred on every page by one rule in `back-to-top-m3.css` (R7).

## Technical Context

**Language/Version**: TypeScript on Node ≥ 22 (ESM) for the server constant; plain browser JavaScript (IIFE, no bundler) and CSS for the pages.

**Primary Dependencies**: none added; the pages' existing `fixedChrome.js` (`--fixed-chrome-height`) and `tooltip-m3.js` (`title` → tooltip).

**Storage**: none; the accepted version is the existing `user.terms_version`; the arrow's step count lives in `history.state` (data-model).

**Testing**: Vitest; jsdom client tests through `tests/helpers/browser.ts` (`openPage`, with `beforeScripts` to set the referrer and history); sheet tests reading the CSS; `m3-assets.test.ts` for each page's assets.

**Target Platform**: current desktop and mobile browsers; DigitalOcean App Platform for the server (unchanged).

**Project Type**: web application (Express server, static pages under `src/public/`).

**Performance Goals**: no measurable cost: one small deferred script on two pages, no request, no scroll listener (the Back arrow listens only to `popstate` and `hashchange`).

**Constraints**: no third-party request; no cookie or browser storage key; M3 layers hold only M3 tokens; the page works at 320 px wide.

**Scale/Scope**: 2 pages get the Back arrow, 13 pages move the Up arrow, 1 constant, about 8 files changed and 4 added.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Think Before Coding | The 10 requirements findings and 2 clarifications are settled; R1–R8 record each design choice and its alternative. | Pass |
| II. Simplicity First | One script, one sheet, one rule change for the Up arrow, one constant; no configuration, no Navigation API dependency, no storage. | Pass |
| III. Surgical Changes | Only the section, the two renamed lines, the version lines, the Up arrow's horizontal rule, and the admin link's duplicated look (moved, not restyled). | Pass, see Complexity Tracking for the admin sheet |
| IV. Goal-Driven Execution | Each FR maps to a test (sheet, client or page test) or a quickstart scenario. | Pass |
| V. Code Quality | `backArrow.js` has single-purpose functions (decide, number the entry, go back); a malformed referrer is caught and hides the arrow; nothing is logged in the browser. | Pass |
| VI. Self-Documenting Code | No comments citing specs or tasks; names say what they hold (`legalDepth`, `cameFromThisSite`). | Pass |
| Security & privacy | No new data; `history.state` never leaves the tab; the referrer is only compared, never logged or sent. | Pass |
| Documentation deliverables | README (Back to top, the check's link, the Back arrow) and ARCHITECTURE (the layer list, the arrows) updated after implementation. | Planned |

Post-design re-check (after Phase 1): unchanged, all pass.

## Project Structure

### Documentation (this feature)

```text
specs/20261104-180032-LEGAL-PAGE-UPDATES/
├── plan.md
├── research.md            # R1–R8
├── data-model.md          # the version; history.state.legalDepth
├── quickstart.md          # 15 scenarios
├── contracts/
│   └── ui-contracts.md    # C1–C6
├── checklists/requirements.md
└── tasks.md               # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── legal/version.ts               # TERMS_VERSION = release date
└── public/
    ├── privacy.html               # section, summary line, retention row, version; loads the arrow
    ├── terms.html                 # version; loads the arrow
    ├── admin.html                 # loads back-arrow-m3.css; link gains class back-arrow
    ├── admin.css                  # loses the link's copied look, keeps its placement
    ├── backArrow.js               # new
    ├── back-arrow-m3.css          # new
    ├── back-to-top-m3.css         # centred
    └── legal-m3.css               # narrow-screen gutter

tests/
├── client-back-arrow.test.ts      # new: shown/hidden, depth, press
├── back-arrow-sheet.test.ts       # new: the sheet's rules
├── back-to-top-sheet.test.ts      # centred, not right:20px
├── legal-pages.test.ts            # new name and wording, gutter rule
└── m3-assets.test.ts              # LAYER_ORDER and the three pages' assets
```

**Structure Decision**: the existing single project; every change is in `src/public/`, plus the one constant and the tests.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Moving the admin back link's look out of `admin.css` into the shared `back-arrow-m3.css` (touches `admin.html`, `admin.css`) | FR-013 asks for the same look; one rule set keeps the two arrows from drifting (requirements TD1, research R5) | Copying the rules into a second sheet leaves two copies of one look to keep in step |
