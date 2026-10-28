# Implementation Plan: Single Row Header

**Branch**: `dev` (no dedicated branch) | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/031-SINGLE-ROW-HEADER/spec.md`

## Summary

Keep the site header on one row at every width from 640 px up by giving up parts in a fixed order when the row is full: the user name, then the header search box (the logo mark never goes, FIX08); the Create Poll link exists only for a user who may create polls and is never hidden (FIX07). The decision is measured on the page, not taken from fixed widths (research R1). One new Material 3 layer sheet, `header-single-row-m3.css` (all seven pages, after `header-single-column-m3.css`), carries the rules; one new script, `headerFit.js` (all seven pages, after `app.js`), measures the row and writes one attribute, `data-header-fit`, on `<html>` (R3). While the header search box is hidden, the Search tab field shows in its place and the typed terms are kept in both (R6, R7). The Search tab field's look moves out of the phone-only block of `single-column-m3.css`, the one edit to existing files besides the seven `<link>` and `<script>` additions. `searchTab.js` and every production stylesheet are untouched; `app.js` is edited only for the Create Poll link (FIX01, FIX07) and the logo mark, a hand-traced speech bubble holding a green figure in front of a red one that replaces the `LOGO` placeholder (FIX10). No server, route, configuration, data or migration change.

## Technical Context

**Language/Version**: Plain browser JavaScript and CSS in `src/public/`, TypeScript tests; Node ≥ 22.

**Primary Dependencies**: None new. Reads existing globals only: `window.SiteSearch` (`value`, `set`, from `app.js`), the `#searchTabBox` / `#searchTabClear` elements of the Search tab, and nothing about the Create Poll link, which `app.js` renders only for a user who may create polls.

**Storage**: N/A. The step is held in `data-header-fit` on `<html>`, recomputed on every measurement, never stored.

**Testing**: Vitest + jsdom through the existing `openStubbedHome` helper (`tests/helpers/single-column-page.ts`). jsdom has no layout, so a test models the header's width: it stubs `scrollWidth` / `clientWidth` of `#site-header` from a table of item widths that honors the current `data-header-fit` tokens (R9). `tests/m3-assets.test.ts`, `tests/pages.test.ts` and `tests/single-column-sheets.test.ts` pin the new sheet and script. The look is checked by hand at 640, 700, 768, 900, 1024 and 1400 px (quickstart).

**Target Platform**: All browsers the site supports, 640 px and wider; below it feature 030 is unchanged.

**Project Type**: Web application, static pages served by the existing Express server and fingerprinted by `devScripts/build-assets.ts`.

**Performance Goals**: One evaluation is at most four reads of two layout properties and four attribute writes, in one animation frame, with no paint between them; evaluations are coalesced to one per frame.

**Constraints**: At 1400 px every page's header is unchanged (SC-005); below 640 px nothing changes (SC-007), so every layout rule of the new sheet sits inside `@media not all and (max-width: 639.98px)`; at 640 px and wider the Search tab field has the phone look (40 px high, the card area's width), which is accepted; no network request; no explanatory comments in new code (Constitution VI).

**Scale/Scope**: 1 new stylesheet (about 50 lines), 1 new script (about 110 lines), 8 `<link>` / `<script>` lines on 7 pages, one block moved in `single-column-m3.css`, 2 new test files and 5 edited (the helper, `m3-assets`, `pages`, `single-column-sheets`, `client-search-tab-field`).

## Constitution Check

*GATE: passed before Phase 0; re-checked after Phase 1.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | The architecture review closed 9 findings; the clarify session closed two more (Create Poll access, typed terms). Assumptions are in the spec. | Pass |
| II. Simplicity First | One sheet, one script, one attribute. The ladder is a list of four names. No configuration beyond one CSS custom property. | Pass |
| III. Surgical Changes | No production stylesheet and no `app.js` / `searchTab.js` edit; the only edit to an existing 030 sheet moves one block so the form can be shown at two widths. | Pass |
| IV. Goal-Driven Execution | Every FR and SC maps to a test or a named check (quickstart). | Pass |
| V. Code Quality | `headerFit.js` has small named functions (`overflows`, `applyStep`, `evaluate`, `syncTerms`) and returns at once when `#site-header` is missing. | Pass |
| VI. Self-Documenting Code | No explanatory comments are written; names carry the meaning. | Pass |

Post-design re-check: unchanged, all pass.

## Project Structure

### Documentation (this feature)

```text
specs/031-SINGLE-ROW-HEADER/
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
├── header-single-row-m3.css   # NEW: nowrap, shrink rules, the steps (all seven pages)
├── headerFit.js               # NEW: measure and set data-header-fit (all seven pages)
├── single-column-m3.css       # EDIT: Search tab field's look moved out of the phone block
├── index.html                 # EDIT: link + script
├── login.html  create-account.html  profile.html
├── not-authorized.html  admin.html  admin-results.html   # EDIT: link + script
tests/
├── helpers/single-column-page.ts      # EDIT (small): optional header model
├── client-header-fit.test.ts          # NEW
├── single-row-header-sheet.test.ts    # NEW
├── m3-assets.test.ts  pages.test.ts  single-column-sheets.test.ts  client-search-tab-field.test.ts   # EDIT
```

**Structure Decision**: a layer and a script on every page that has the header, as 030 did for its header layer. The script is separate from `app.js` so the header drawing code is not touched (R10).

## Complexity Tracking

No constitution violations; nothing to justify.
