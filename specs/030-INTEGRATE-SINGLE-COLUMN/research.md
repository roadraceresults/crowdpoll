# Research: Integrate Single Column

Decisions for the plan. The architecture review (`architecture/030-integrate-single-column-prototype/architecture.md`) already settled scope; this file settles how.

> Amended by feature 031 (2026-10-14): the logo icon is shown at every width (FIX08); the guest buttons take the card Vote button's size (FIX05); the tab sizing, arrows, all-tabs button and menu and Refresh row apply from 900 px down, with the all-tabs button on the Refresh row (FIX02 to FIX04); the media block for those rules is `max-width: 900px`, not 639.98 px. Decisions R3 and R4 below describe the 030 state.

> Amended by feature 20261023-155959-PHONE-TAB-BAR (2026-10-23): the scroll arrows, the hold and the step are removed (`tabBarScroll.js` keeps the drag, now for mouse and pen, gains a mouse-wheel handler and keeps the All tabs menu); up to 900 px each tab is one line, a 16 px icon beside the label in a 48 px tab, the row has a 32 px edge fade and scrolls with the browser's own touch scrolling, smoothly when a tab is chosen, and Refresh sits under the bar at the left with the All tabs button at the right.

## R1. Two layers, loaded where they are needed

**Decision**: `header-single-column-m3.css` goes right after `header-tab-bar-m3.css` on `index`, `login`, `create-account`, `profile`, `not-authorized`, `admin`, `admin-results`. `single-column-m3.css` goes last on `index.html` only. Both are `<link>`s in each page, so `build-assets` fingerprints them like every other sheet.
**Rationale**: The prototype's one sheet loads last and wins by order; the header rules must also win over `header-tab-bar-m3.css` on pages that have no card sheet. Spec 024's rule is "layers, not rewrites".
**Alternatives**: Merging into `site.css`, `tabs.css`, `header-tab-bar-m3.css`, `pollCard-m3.css` (rejected, a large risky diff across four sheets); one sheet on all pages (rejected, loads card rules where there are no cards).

## R2. Two scripts, one purpose each

**Decision**: `tabBarScroll.js` (tab bar: arrows, hold, drag, menu) and `floatingActions.js` (guest pair), loaded after `tabs.js` on the home page only.
**Rationale**: They share no state. One file would be 300 lines with two unrelated halves, against Constitution V. The architecture's "one new script" is refined; nothing else changes.
**Alternatives**: One script (rejected above); folding into `tabs.js` (rejected, a 1,100-line file already, and the spec says it is not changed).

## R3. Which rules go in which sheet

**Decision**: Header sheet: banner/logo 24 px, logo icon hidden, header buttons 24 px, `.site-header` margin 8 px, search box, Create Poll link and user name hidden, the avatar menu's Create Poll item shown. Home sheet: the `--single-column: 1` marker and the tunables (`--tab-label-scale`, `--tab-label-tracking`, `--tab-pad`, `--tab-hover-opacity`, `--tab-press-opacity`, `--card-gap`, `--refresh-gap`), card sizing, tab bar, arrows, menu, Refresh row, floating pair, Search tab field. Controls added by the feature are `display:none` above the media block, shown inside it.
**Rationale**: Matches the prototype one to one (its sheet is the source). The marker belongs with the cards because only `pollCard.js` reads it.
**Alternatives**: Marker in the header sheet (rejected, would activate card sizing on pages with no cards, harmless but untidy).

## R4. Breakpoint

**Decision**: `@media (max-width: 639.98px)` in both sheets, the same value as `tabs.css`; scripts use `window.matchMedia` on the same string, guarded when `matchMedia` is missing (jsdom), as `m3-ripple.js` does.
**Rationale**: One line for the page's own single column. A guard keeps every existing jsdom page test loading.

## R5. Scrolling animation

**Decision**: Own `requestAnimationFrame` animation with ease-in-out, 500 ms for a step, 200 ms for the settle, a steady 200 px/s hold after 300 ms. The time step is `Math.max(0, now - last)` and a hold ends only at the end in its direction. Reduced motion jumps instead. An animation is cancelled when the bar's `scrollLeft` differs from the value the animation last wrote (something else, such as `scrollIntoView` in `tabs.js`, scrolled it) and on any press or drag.
**Rationale**: The browser's smooth scroll cannot be slowed; the first-frame fault was reproduced and fixed in the prototype (2 Tweaks). Comparing with the last written value is the least code that stays out of `tabs.js`.
**Alternatives**: CSS `scroll-behavior` (cannot set speed); wrapping `scrollIntoView` (touches `tabs.js`).

## R6. Which tab is "two tabs on"

**Decision**: Tabs are measured from their bounding rectangles relative to the bar plus `scrollLeft`; going right the target puts the `STEP_TABS`-th tab (or the last) whose right edge lies beyond the bar's right edge flush right; going left the same with left edges. `STEP_TABS = 2`.
**Rationale**: As prototyped and tested with 8 tabs of 100 px in a 300 px bar (200, 400, 500; then 300, 100, 0).

## R7. Arrows' state

**Decision**: `aria-disabled` on the arrow when the bar is at that end (|scrollLeft| ≤ 1 or at `scrollWidth - clientWidth`); never `hidden`, never `disabled`. Recomputed on `scroll`, `resize` and after the tab bar changes (guest state, window rotation). `tabs.js` keeps toggling `has-tabs-before/after`; the home sheet turns the edge-fade masks off with `mask-image:none !important` inside the media block.
**Rationale**: No layout shift (spec FR-006); keyboard users keep their focus. `tabs.js` is untouched.

## R8. All-tabs menu

**Decision**: Rebuilt from `#tabBar .tab` on every open (icon clone, label, `is-active`, copied `aria-disabled`). An item calls the real tab's `click()`, then scrolls the tab into view and closes the menu; a greyed item's `click()` takes a guest to sign-in because `tabs.js` already does that. Keyboard: Arrow Up/Down, Home, End, Enter, Escape; focus returns to the menu button on close. `role="menu"` / `role="menuitem"`, `aria-expanded`, `aria-controls` on the button. A tap outside closes it.
**Rationale**: One implementation of "select a tab" (spec N3). The prototype only toggled state; the keyboard rules are the accessibility decision (U4).
**Alternatives**: Static markup for the menu (rejected, would copy the tab list in two places).

## R9. Floating pair

**Decision**: The guest buttons are the header's own nodes: `#header-actions > .btn-header-ghost, .btn-header-primary`. A `MutationObserver` on `#site-header` (childList, subtree) runs `syncFloatingActions()`, and so do `matchMedia` changes: if the header slot holds guest buttons and the screen is a phone, empty `#floatingActions`, move the slot's buttons there and show it; if not, put nothing there and hide it. The slot is the source of truth, so a rebuilt header (sign-out, sign-in, `ENV_SIGNIN_METHOD` oauth showing only Log In) is always replaced, never duplicated. The position is `{x, y}` in screen pixels, or none; the area is the rectangle of the visible tab panel's `.card-grid`, or of its `.maximized-card-grid` while a card is maximized (`.tab-panel:not([hidden])` then `.card-grid:not([hidden])` or `.maximized-card-grid:not([hidden])`; production has one grid per panel and no `#cardGrid`, and maximizing hides the grid) cut to the viewport; start = flush right, 4 px under the grid's top; clamp on drag, scroll, after cards mount, after a tab switch, and when a card is maximized or restored; on resize a pair that no longer fits fully inside returns to the start. A press that moves more than 5 px drags the pair as a unit; the click that follows is swallowed in the capture phase. Fixed position, z-index above the cards and below the tab menu; `touch-action: none` on the pair.
**Rationale**: Spec FR-013; no `app.js` change (architecture U1). Moving nodes keeps their handlers (`location.href`).
**Alternatives**: Cloning buttons (rejected, handlers and OAuth variant duplicated); hooking `renderSiteHeader` (rejected, edits `app.js`).

## R10. Search tab field

**Decision**: A second form inside `#panel-search`, above the card grid, `id="searchTabForm"`, input `searchTabBox` (placeholder "Search CrowdPoll", `maxlength` 200, `type=search`, `aria-label`), clear button `searchTabClear`, shown only in the media block. In `searchTab.js`: submit calls `submit(terms)` (which already selects the tab and honors the search floor), clear calls `clear()` and empties the field, `submit` copies the terms into the field, a capture-phase `keydown` on `/` (outside typing targets, no modifiers) focuses and selects the field when it is displayed and stops the event so `app.js`'s handler does not also run, and `tabs.js`'s `?q=` path (`window.SiteSearch.set`) is unchanged: `SearchTab.submit` fills the field.
**Rationale**: Architecture I4, Option A; `app.js` search code is untouched. The header box stays in the page, hidden.
**Alternatives**: Generalising `app.js` (rejected, shared by every page).

## R11. Create Poll avatar item

**Decision**: In `app.js`'s avatar menu build, after Edit Profile and before Poll Administration, an `<a class="avatar-menu-create-poll">Create Poll</a>`: with `canCreatePolls(me)` it has `href="/admin"`; without it, `aria-disabled="true"`, the same `href`, a click handler that calls `preventDefault()`, `title="You need permission to create polls"` (adopted into a tooltip by `tooltip-m3.js`, for pointers), and a visible second line, `<span id="createPollReason" class="avatar-menu-create-poll-reason">Needs permission to create polls</span>`, that the item points to with `aria-describedby`, so touch, keyboard and screen-reader users see why it is dimmed. Hidden by default and shown in the header layer's media block. Disabled look: the colour the header link's `.is-inert` state uses.
**Rationale**: Spec FR-015 and architecture U9. Focusable and announced as disabled, unlike removing it.

## R12. Porting rules (Constitution VI and V)

**Decision**: No comment that explains what code does; none that cite requirements, features or tasks; the prototype's long closures become single-purpose functions with descriptive names (`stepTarget`, `nearestTabEdge`, `holdLoop`, `clampToCardArea`, `buildTabMenu`); constants stay named (`STEP_MS`, `HOLD_AFTER_MS`, `HOLD_PX_PER_S`, `SETTLE_MS`, `DRAG_START_PX`, `STEP_TABS`, `FLOAT_TOP_GAP`). Each script returns at once when its elements are missing, so pages without them are safe. No browser-console logging.
**Rationale**: Constitution V and VI are non-negotiable.

## R13. Tests

**Decision**: New test files named in plan.md. jsdom has no layout: tests stub `getBoundingClientRect`, `clientWidth`, `scrollWidth` and `scrollLeft` on the bar (as the prototype's checks did) and drive pointer events; first-frame fault: the animation frame callback is given a time stamp older than the hold's start. New scripts load only in tests that name them in `scripts` (the default list is unchanged, as with the tooltips). `m3-assets.test.ts` and `pages.test.ts` are updated for the new links and scripts.
**Rationale**: Spec FR-017; the existing suite stays green untouched.

## R14. Documentation and release

**Decision**: `CLAUDE.md`'s plan section points at this plan with the decisions that are easy to get wrong (R1, R9, R10). The prototype folder and its `ENV_PROTOTYPES` value stay until the seven-page phone check passes; removing the value from `.do/app.yaml` is a later change. Release is a push to `dev` (autodeploy), no switch.
**Rationale**: Spec FR-018 and architecture A4, N4.
