# Data Model: Fixed-Position Site Header

There is no stored data, no schema change and no migration. The only state is in the page, and it is recomputed, never stored.

## Fixed chrome height (in memory, per page load)

| Item | Where | Values |
|---|---|---|
| `--fixed-chrome-height-header` | custom property on `<html>`, written by `fixedChrome.js` | the header's own `offsetHeight`, in pixels |
| `--fixed-chrome-height` | custom property on `<html>`, written by `fixedChrome.js` | the header's `offsetHeight` plus `.tab-bar-wrap`'s `offsetHeight` and computed `margin-bottom` (the 60 px Hamburger/Refresh row from 900 px down, FIX19), when it exists; equal to `--fixed-chrome-height-header` on the six pages that have no tab bar |
| `window.FixedChrome.height()` | function, set by `fixedChrome.js` | reads and returns the current `--fixed-chrome-height` as a number |

### Rules

- **Recomputed from a fresh read** on every measurement; no prior value is remembered between two measurements.
- **Never written** to storage, a cookie, a URL or the server.
- **Consumed by**: `.container`'s `padding-top` (via the custom property directly), `floatingActions.js`'s `cardArea()` top clamp and `tabs.js`'s `maximize()` scroll target (both via `window.FixedChrome.height()`).

### Triggers for re-measurement

Same discipline as `headerFit.js` (031): a `ResizeObserver` on `#site-header` and, when present, `.tab-bar-wrap`; a `MutationObserver` on the header for a rebuild (sign-in/sign-out); `document.fonts.ready`; coalesced into one `requestAnimationFrame` per batch of triggers.

## Back to Top button state (in memory, per page load)

| Item | Where | Values |
|---|---|---|
| Visible / hidden | a class or `hidden` attribute on `#backToTopFab`, written by `backToTopFab.js` | boolean, derived from `window.scrollY` against two thresholds |

### State transitions

```text
Hidden --(scrollY >= 600)--> Visible
Visible --(scrollY < 400)--> Hidden
```

- **Recomputed on every `scroll` event**, throttled to one evaluation per animation frame; no state persists between page loads.
- **Never written** to storage, a cookie, a URL or the server.
- Activating the button while **Visible** scrolls the window to `{top:0}` — smoothly, or instantly when the user prefers reduced motion — and the state above then transitions to **Hidden** once `scrollY` settles below 400.
