# Research: Single Row Header

Each item: **Decision**, **Rationale**, **Alternatives considered**.

## R1. What decides a step: measured overflow
**Decision**: a step is taken when `#site-header.scrollWidth > #site-header.clientWidth` with `flex-wrap: nowrap`.
**Rationale**: whether the row fits depends on the user (guest, member, long name), the Create Poll link, fonts and zoom (architecture A1). A measurement is right in every case and has no constants to maintain.
**Alternatives**: fixed `@media` widths per session type (breaks with a long name or large text, needs three sets of numbers); CSS-only container queries (cannot know the content width).

## R2. Making overflow observable
**Decision**: in the new layer, inside `@media not all and (max-width: 639.98px)` (the complement of feature 030's phone query, with no gap at 639.99 px), `.site-header{flex-wrap:nowrap; min-height:56px}`, every direct child `.site-header > *{flex-shrink:0}` with `white-space:nowrap` on the Create Poll link and the user area, and `.site-header > .header-search{flex:1 1 auto; min-width:var(--header-search-min-width)}` (the extra class outranks the children rule, so source order cannot undo it) with `--header-search-min-width:200px`. The 767.98 px rule that gives the search box `order:3; flex:1 1 100%` is neutralised inside the same query. Nothing in the layer applies below 640 px: feature 030's 24 px buttons and 8 px bottom margin stay, and a guest's header on a page without floating buttons keeps wrapping as it does today.
**Rationale**: a shrinkable item whose text wraps (the Create Poll link) would make the header taller without overflowing; non-shrinking items make the row overflow instead, which is what R1 measures. The search box is the one item allowed to shrink, down to its minimum. `min-height:56px` keeps the row as tall as it is with the search box (56 px in the M3 layer), so the tabs below do not jump when the box disappears.
**Alternatives**: measure the header's height instead of its width (a layout that wraps has already moved the tabs); leave the link shrinkable (it wraps its text).

## R3. Where the step lives
**Decision**: space-separated tokens in `data-header-fit` on `document.documentElement`, in the order they were applied: `no-name`, `no-search`. Rules are written `html[data-header-fit~="no-name"] #header-username{display:none}` and so on. The attribute is removed when empty and when the viewport is a phone.
**Rationale**: `renderSiteHeader` sets `header.className = "site-header"` and replaces `innerHTML` on every session change, wiping anything on the header or inside it (architecture U3). The root is never rebuilt.
**Alternatives**: a class on `#site-header` (wiped); a `<style>` element per stage (more code, harder to test).

## R4. When to measure
**Decision**: coalesce into one `requestAnimationFrame` after: a `ResizeObserver` on the header and on each of its direct children, observed again after every rebuild (the window's `resize` event when `ResizeObserver` is missing); a `MutationObserver` on the header's children (a rebuild); `document.fonts.ready`; a change of the phone media query. The first measurement runs at load.
**Rationale**: covers resize, sign-in and sign-out, late fonts, zoom and text size, which all change the row's natural width (FR-010, US5). The children do not shrink, so their widths follow the text size even when the header's own width, which is the viewport's, does not change.
**Alternatives**: poll with a timer (wasteful); resize event only (misses rebuilds and fonts).

## R5. The ladder and the Create Poll step
**Decision**: evaluation clears the attribute, then walks `no-name`, `no-search`; before each step it stops if the row fits. (FIX08: the `no-logo` step is gone too, so the logo mark is always shown and the guest buttons are tightened instead. FIX07: the `no-link` step is gone, because `app.js` renders the Create Poll link only for a user who may create polls, who never loses it.)
**Rationale**: spec FR-004 and the Q1 clarification. The permission test stays in `app.js` (`canCreatePolls`) and is not copied (Constitution II). Each step is applied and re-measured in the same task, so no intermediate state is painted.
**Alternatives**: copy `canCreatePolls` into the script (duplication that can drift); hide the nav wrapper (also hides the link for those who may create polls).

## R6. Showing the Search tab field while the header box is hidden
**Decision**: in `single-column-m3.css`, the Search tab field's look (flex row, 40 px, border, input rules) moves out of the phone `@media` block and `.search-tab-form{display:none}` stays the default; the phone block and `html[data-header-fit~="no-search"] .search-tab-form{display:flex}` both show it. `searchTab.js`'s capture-phase `/` already tests `isOnScreen` with `getComputedStyle`, so it needs no change; on pages without the Search tab `app.js`'s own `/` handler applies as it does at phone width today.
**Rationale**: the rules must be shown from the stylesheet so the field is on screen before any script runs on it, and the attribute selector outranks the plain class so the later-loading file still shows it. Only the home page has the field.
**Alternatives**: duplicate the look in the new sheet (about 20 duplicated lines); show the field from the script (flash of a missing field, and a style written in JS).

## R7. Carrying typed terms
**Decision**: when `headerFit.js` enters `no-search`, it copies `SiteSearch.value()` into `#searchTabBox` when the header box has text and fires a bubbling `input` event on the field so `searchTab.js` updates its own clear button; while `no-search` is set, an `input` listener on `#searchTabBox` calls `SiteSearch.set(value)`, so the header box already holds the terms when it returns. A search already shown is not touched.
**Rationale**: spec FR-016. Both APIs exist (`window.SiteSearch` in `app.js`; the field's `input` handler in `searchTab.js`), so neither file changes.
**Alternatives**: copy only on leaving (loses terms typed while the box was hidden if the header is rebuilt); shared storage (new state for a small need).

## R8. Phone width
**Decision**: when `matchMedia("(max-width: 639.98px)")` matches, the script removes the attribute and does not measure; the 030 rules apply. Its guard for a missing `matchMedia` is the one `floatingActions.js` uses.
**Rationale**: FR-008, SC-007: nothing in this feature applies below 640 px.

## R9. Testing without layout
**Decision**: the test models the header's width: `scrollWidth` is a function summing the widths of the items that are not hidden by the current tokens (read from the attribute), `clientWidth` a number the test sets, and the page's own markup supplies which items exist (guest, member, link active or inert). The tests then check the ladder at several widths and the order of return. The CSS rules are checked by reading the sheet text (`single-row-header-sheet.test.ts`), as 030's `single-column-sheets.test.ts` does.
**Rationale**: jsdom applies no stylesheet and does no layout; what can be tested is the ladder logic and that the sheet holds each rule.
**Alternatives**: a real browser in CI (not available in this project).

## R10. Why a separate script and not `app.js`
**Decision**: `headerFit.js`, loaded with `defer` after `app.js` on all seven pages.
**Rationale**: it keeps the header-drawing code untouched (Constitution III), mirrors 030 (`floatingActions.js` observes the header from outside), and returns at once on a page without `#site-header`.
**Alternatives**: a function inside `renderSiteHeader` (couples measurement to drawing and adds an `app.js` edit).

## R11. Focus when the focused header box is hidden
**Decision**: no special handling; the browser moves focus to the page when the focused element becomes `display:none`, and `/` or Tab brings the user to the Search tab field.
**Rationale**: deferred by clarify as low impact; a script that moves focus would surprise a user who is typing in the box while resizing.
