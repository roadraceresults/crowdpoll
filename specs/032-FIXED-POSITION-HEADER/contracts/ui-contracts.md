# UI Contracts: Fixed-Position Site Header

There is **no HTTP, database or configuration contract change**; `postman/openapi.json` is untouched. These contracts are the page, style and script surfaces that tests and other pages rely on.

## C1. Style sheets and order

| Page | New link | Position |
|---|---|---|
| all seven pages that have the header (`index`, `login`, `create-account`, `profile`, `not-authorized`, `admin`, `admin-results` `.html`) | `/header-fixed-m3.css` | immediately after `/header-single-row-m3.css` |
| all seven pages | `/back-to-top-m3.css` | immediately after `/header-fixed-m3.css` |

`LAYER_ORDER` in `tests/m3-assets.test.ts` gains `header-fixed-m3.css` after `header-single-row-m3.css`, and `back-to-top-m3.css` after that; each page's layer list gains both. Neither sheet holds token sections, dark twins or a literal font size.

## C2. Custom properties

| Property | Set by | Meaning |
|---|---|---|
| `--fixed-chrome-height-header` | `fixedChrome.js`, on `document.documentElement` | the header's own rendered height, in pixels |
| `--fixed-chrome-height` | `fixedChrome.js`, on `document.documentElement` | the header's height plus `.tab-bar-wrap`'s, when present |
| `--cookie-banner-offset` | `app.js` (unchanged) | reused by `back-to-top-m3.css`, as it already is by `.tab-notice`/`.profile-snackbar` |

## C3. Fixed positioning (new sheet, `header-fixed-m3.css`)

| Selector | Rule |
|---|---|
| `#site-header` | `position:fixed; top:0; left:0; right:0; z-index:41; max-width:var(--max-width); margin:0 auto; padding-inline:20px` (`14px` ≤ 639.98 px); opaque background (`var(--paper)`, dark-mode `--md-sys-color-surface`); one above `.tab-bar-wrap`, because both are fixed layers and at equal z-index the later Tab Bar would cover the avatar menu (FIX04) |
| `.tab-bar-wrap` | `position:fixed; top:var(--fixed-chrome-height-header,0px); left:0; right:0; z-index:40; max-width:var(--max-width); margin:0 auto; padding-inline:20px` (`14px` ≤ 639.98 px); same opaque background |
| `.container` | `padding-top:calc(32px + var(--fixed-chrome-height,0px))` (≥ 640 px) / `calc(20px + var(--fixed-chrome-height,0px))` (≤ 639.98 px) — overrides `tabs.css`'s literal values |

No rule in C3 changes `#site-header`'s or `.tab-bar-wrap`'s painted width or side padding relative to today's `.container`-derived values (SC-008, R5); only `position`, `z-index` and the background are new.

## C4. `fixedChrome.js`

- Loaded with `defer`, immediately after `headerFit.js`, on all seven pages. Returns at once if `#site-header` is missing.
- Guards `ResizeObserver` the way `headerFit.js`/`floatingActions.js` already do.
- Writes only `--fixed-chrome-height-header` and `--fixed-chrome-height` on `document.documentElement.style`.
- `--fixed-chrome-height` is the header's `offsetHeight` plus `.tab-bar-wrap`'s `offsetHeight` and computed `margin-bottom`. The margin is the Hamburger/Refresh row the wrap reserves from 900 px down, which a fixed element's margin no longer pushes aside (FIX19). From 900 px down, `header-fixed-m3.css` also gives `.tab-bar-wrap::before` the page background over that row.
- Exposes `window.FixedChrome = { height: () => number }`. Nothing else on `window`; after each measurement it dispatches a `fixedchromechange` event on `window`, on which `floatingActions.js` re-places a docked guest pair (FIX20).
- Triggers: `ResizeObserver` on the header and (when present) `.tab-bar-wrap`; `MutationObserver` on the header for a rebuild; `document.fonts.ready`; coalesced to one frame.

## C5. Consumer changes (one line each)

| File | Before | After |
|---|---|---|
| `floatingActions.js` (`cardArea()`) | `top: Math.max(box.top, 0)` | `top: Math.max(box.top, window.FixedChrome ? window.FixedChrome.height() : 0)` |
| `floatingActions.js` (start, FIX19) | the pair starts at the top right of the cards | while the Refresh icon is shown, the pair starts docked in the Hamburger/Refresh row, 8 px left of Refresh and centred on it (8 px to its right since feature 20261023-155959-PHONE-TAB-BAR's TWEAKS04, Refresh being at the left); it stays there on scroll, leaves it on the first drag (then clamped to the card area as above) and goes back to it on a resize that leaves it outside. `.floating-actions` is `z-index:42`, above the pinned row|
| `tabs.js` (`maximize()`) | `if (top<0) window.scrollTo(0, window.scrollY+top)` | `const offset = window.FixedChrome ? window.FixedChrome.height() : 0; if (top<offset) window.scrollTo(0, window.scrollY+top-offset);` |

No other line in either file changes.

## C6. `backToTopFab.js`

- Loaded with `defer`, last on every page (after `floatingActions.js` on `index.html`; after each page's own card script elsewhere).
- Injects one `<button id="backToTopFab" class="back-to-top-fab" type="button" aria-label="Back to top" title="Back to top">` (with an inline SVG upward arrow) onto `document.body`, once, on all seven pages (NC1).
- A `scroll` listener (passive, coalesced to one check per `requestAnimationFrame`) shows the button at `scrollY >= 600` and hides it at `scrollY < 400`.
- Activation (`click`, or `Enter`/`Space` while focused) calls `window.scrollTo({top:0, behavior:"smooth"})`, or `behavior:"auto"` under `matchMedia("(prefers-reduced-motion: reduce)")`.
- Exposes nothing on `window`.

## C7. `back-to-top-m3.css`

| Selector | Rule |
|---|---|
| `.back-to-top-fab` | `position:fixed; right:20px; bottom:calc(20px + var(--cookie-banner-offset,0px)); z-index:40`; hidden by default, shown by the class/attribute `backToTopFab.js` toggles; opacity/transform transition, skipped under `prefers-reduced-motion` |

## C8. Not changed

`app.js`, `headerFit.js`, `searchTab.js`, `tabBarScroll.js`, every production stylesheet (`tabs.css` included — only overridden from a later-loading layer, never edited), every route, `postman/openapi.json`, the server and the database. `floatingActions.js` and `tabs.js` change exactly the one line each in C5.
