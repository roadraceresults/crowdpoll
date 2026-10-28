# Implementation Plan: Fixed-Position Site Header

**Branch**: `dev` (no dedicated branch) | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/032-FIXED-POSITION-HEADER/spec.md`

## Summary

Pin `#site-header`, and on the home page `.tab-bar-wrap` beneath it (which already contains the Hamburger/Refresh row that only forms its own absolutely-positioned strip below 640 px — pinning the wrap pins it for free), to the top of the viewport at every width, on all seven pages (research R3). A new script, `fixedChrome.js` (all seven pages, right after `headerFit.js`), measures the fixed chrome's real rendered height with a `ResizeObserver` and writes it as two CSS custom properties on `<html>` — `--fixed-chrome-height-header` (the header alone) and `--fixed-chrome-height` (header plus tab-bar-wrap, when present) — exposing the latter through `window.FixedChrome.height()`. A new layer, `header-fixed-m3.css` (all seven pages, after `header-single-row-m3.css`), gives the header and tab-bar-wrap `position:fixed` with an opaque background, keeps their width to the same centred column `.container` already uses (NC2), and adds the reserved-space term to `.container`'s existing top padding. `floatingActions.js`'s `cardArea()` and `tabs.js`'s `maximize()` each read `window.FixedChrome.height()` in place of the literal `0` they assume today, so neither the guest floating buttons nor a maximized poll's results view can land underneath the fixed chrome (architecture U4, U5). A second new script, `backToTopFab.js` (all seven pages, loaded last), injects one button with an inline SVG upward-arrow icon, shows it once `window.scrollY` passes 600 px and hides it below 400 px (two thresholds, not one, so it never flickers at a single boundary), and scrolls to the top on activation — smoothly, or instantly under `prefers-reduced-motion`. Its own stylesheet, `back-to-top-m3.css`, positions it 20 px from the viewport's physical corner, reusing the existing `--cookie-banner-offset` variable so it rides above the cookie banner. No server, route, configuration, data or migration change; no new dependency. Amended by FIX07: one server change and one data-only migration, `007-title-lengths`. The title is limited to 50 characters and the subtitle to 30, and existing values are cut once.

## Technical Context

**Language/Version**: Plain browser JavaScript and CSS in `src/public/`, TypeScript tests; Node ≥ 22.

**Primary Dependencies**: None new. `fixedChrome.js` reads `#site-header` / `.tab-bar-wrap` and writes custom properties on `document.documentElement`, exposing `window.FixedChrome.height()`; `backToTopFab.js` reads `window.FixedChrome` only to avoid guessing the fixed chrome's height a second time, and reuses the `--cookie-banner-offset` variable `app.js` already maintains.

**Storage**: N/A. `--fixed-chrome-height-header` / `--fixed-chrome-height` are recomputed on every measurement; the Back to Top button's shown/hidden state is recomputed on every scroll event. Nothing is stored.

**Testing**: Vitest + jsdom through the existing `openStubbedHome` helper (`tests/helpers/single-column-page.ts`), which already supports a `reducedMotion` option. jsdom has no layout, so `fixedChrome.js`'s tests stub `offsetHeight` on the header and tab-bar-wrap, the way `client-header-fit.test.ts` already stubs `scrollWidth`/`clientWidth`; `backToTopFab.js`'s tests stub `window.scrollY` and dispatch `scroll` events to assert the threshold/hysteresis transitions directly. `tests/m3-assets.test.ts` and `tests/pages.test.ts` pin the two new sheets and two new scripts on all seven pages. `tests/client-floating-actions.test.ts` and `tests/client-maximized.test.ts` gain cases for the new `window.FixedChrome.height()` clamp/offset (the existing `top: -300` case in `client-floating-actions.test.ts` changes from clamping to `0` to clamping to the stubbed fixed-chrome height). The look is checked by hand at 375, 640, 1024 and 1400 px (quickstart).

**Target Platform**: All browsers the site supports, every width; this feature makes no width-conditional change of its own (unlike 030/031) beyond the existing Hamburger/Refresh row forming below 640 px, which already exists and is simply carried along inside the pinned `.tab-bar-wrap`.

**Project Type**: Web application, static pages served by the existing Express server and fingerprinted by `devScripts/build-assets.ts`.

**Performance Goals**: One `fixedChrome.js` measurement is two `offsetHeight` reads and up to two `style.setProperty` calls, coalesced to one per animation frame, the same discipline `headerFit.js` already uses. `backToTopFab.js`'s scroll handler is a single `scrollY` read, throttled to one check per animation frame.

**Constraints**: The header and tab-bar-wrap's on-screen horizontal footprint must stay pixel-identical to today's (SC-008, NC2) — no edge-to-edge band. No production stylesheet is edited for positioning; the one necessary edit to an existing file is `.container`'s `padding-top`, done by an override in the new `header-fixed-m3.css` layer, not by editing `tabs.css` itself. `floatingActions.js` and `tabs.js` each get the smallest possible one-line change (U4, U5); no other line in either file changes. No explanatory comments in new code (Constitution VI).

**Scale/Scope**: 2 new stylesheets (`header-fixed-m3.css` ~30 lines, `back-to-top-m3.css` ~25 lines), 2 new scripts (`fixedChrome.js` ~45 lines, `backToTopFab.js` ~70 lines), 2 new `<link>` + 2 new `<script>` lines on all seven pages, 1-line changes to `floatingActions.js` and `tabs.js`, 4 new test files and 4 edited (`m3-assets.test.ts`, `pages.test.ts`, `client-floating-actions.test.ts`, `client-maximized.test.ts`).

## Constitution Check

*GATE: passed before Phase 0; re-checked after Phase 1.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | The architecture review closed 15 findings (3 ambiguities, 10 unspecified aspects, 2 needs-clarification); the clarify session closed one more (initial-load layout shift). Assumptions are in the spec. | Pass |
| II. Simplicity First | Two small scripts, two small sheets, two one-line consumer edits. No configuration beyond two CSS custom properties and the existing `--cookie-banner-offset`. | Pass |
| III. Surgical Changes | No production stylesheet is edited for positioning (the `.container` padding-top change is an override in the new layer, not an edit to `tabs.css`); `floatingActions.js` and `tabs.js` each get exactly the one line U4/U5 require. | Pass |
| IV. Goal-Driven Execution | Every FR and SC maps to a test or a named quickstart check. | Pass |
| V. Code Quality | `fixedChrome.js` and `backToTopFab.js` follow the existing IIFE-with-small-named-functions shape (`headerFit.js`, `floatingActions.js`) and return at once when their elements are missing. | Pass |
| VI. Self-Documenting Code | No explanatory comments are written; names carry the meaning (`overflows`, `fixedChromeHeight`, `isVisible`, `scrollToTop`). | Pass |

Post-design re-check: unchanged, all pass.

## Project Structure

### Documentation (this feature)

```text
specs/032-FIXED-POSITION-HEADER/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/ui-contracts.md
├── checklists/requirements.md
├── spec.md
└── tasks.md              # /speckit-tasks
```

### Source Code (repository root)

```text
src/public/
├── header-fixed-m3.css        # NEW: position:fixed, opaque background, .container padding-top override (all seven pages)
├── fixedChrome.js              # NEW: measure header/tab-bar-wrap, set the two custom properties, window.FixedChrome (all seven pages)
├── back-to-top-m3.css          # NEW: the Back to Top button's position, size, icon, transition (all seven pages)
├── backToTopFab.js             # NEW: inject the button, show/hide on scroll, scroll-to-top on activation (all seven pages)
├── floatingActions.js          # EDIT (1 line): cardArea().top clamps to window.FixedChrome.height(), not 0; FIX19: the pair starts docked beside Refresh
├── tabs.js                     # EDIT (1 line): maximize()'s scroll target accounts for window.FixedChrome.height()
├── index.html
├── admin.html  admin-results.html  profile.html
├── login.html  create-account.html  not-authorized.html   # EDIT: 2 new <link> + 2 new <script> lines each
tests/
├── client-fixed-chrome.test.ts       # NEW
├── client-back-to-top.test.ts        # NEW
├── header-fixed-sheet.test.ts        # NEW
├── back-to-top-sheet.test.ts         # NEW
├── m3-assets.test.ts  pages.test.ts  client-floating-actions.test.ts  client-maximized.test.ts   # EDIT
```

**Structure Decision**: two independent layer-plus-script pairs, each mirroring the 031 pattern (a new M3 layer sheet, a new script loaded after `app.js`/`headerFit.js`) rather than one combined file, because the fixed-chrome concern (header/tab-bar positioning and reserved space) and the Back to Top button are independently testable and independently toggleable (R1). `floatingActions.js` and `tabs.js` consume the fixed-chrome measurement through `window.FixedChrome` instead of re-measuring it themselves, the same `window.SiteSearch`-style small global API 031 already established (R6).

## Complexity Tracking

No constitution violations; nothing to justify.
