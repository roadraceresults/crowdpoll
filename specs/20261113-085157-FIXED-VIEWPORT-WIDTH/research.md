# Research: Fixed Viewport Width Trial

Sources are the codebase (paths given) and how mobile browsers treat the viewport meta tag. Points that could not be
confirmed from this machine are marked **to verify** and have a step in `quickstart.md`.

## R1. How the rule reaches 13 static pages

**Decision**: one new synchronous script, `src/public/viewportWidth.js`, loaded in every page's `<head>` on the line
after `<script src="/colorScheme.js"></script>` (`tests/m3-assets.test.ts` requires `colorScheme.js` to be each page's first script). The static line
`<meta name="viewport" content="width=device-width, initial-scale=1">` stays as it is; the script rewrites its
`content` attribute when the fixed width applies.

**Rationale**: the pages are static files sent by `res.sendFile` (`src/routes/pages.ts`), with no templating, and a
meta tag cannot be conditional. All 13 pages already load one synchronous head script before any stylesheet
(`colorScheme.js`, line 10 of each), for the same reason this one needs it: to act before the first paint (FR-009).
Mobile browsers re-read the viewport meta when its `content` changes, so no reload is needed (FR-004). With scripts
off the static line is all the browser sees (FR-007). `tests/pages.test.ts:241` keeps passing unchanged, because the
meta line and the icon links after it do not move.

**Alternatives considered**: changing the static line to `width=480` (rejected in the requirements, UA2: tablets and
landscape phones would be enlarged); server-side substitution by user agent (new server code and guessing devices from
a header); folding the logic into `colorScheme.js` (two unrelated jobs in one file, Constitution V).

## R2. Measuring "the width of the screen as it is held"

**Decision**: `heldWidth = landscape ? max(screen.width, screen.height) : min(screen.width, screen.height)`, where
`landscape` is `screen.orientation.type.startsWith("landscape")`, or, where `screen.orientation` is missing,
`Math.abs(window.orientation) === 90`. The fixed width applies when `heldWidth < 480`.

**Rationale**: `screen.width` alone is not enough: Android browsers report it for the current orientation, iOS Safari
reports the portrait width whatever the orientation (**to verify**, quickstart §4). Taking the smaller or larger of
the two screen sides by orientation gives the same answer on both. The orientation must come from the device, not from
the `(orientation: …)` media query: that query compares the viewport's width and height, so an on-screen keyboard that
halves the height turns a portrait phone into "landscape" and would switch the layout while the visitor types.
`screen.orientation` is in every current mobile browser; `window.orientation` covers iOS before 16.4. The screen is
measured, not the window (spec Assumptions), so `window.innerWidth`, which also depends on the viewport being set, is
not used.

**Alternatives considered**: `window.innerWidth` or `documentElement.clientWidth` (they report the layout viewport,
which the rule itself changes: circular); `matchMedia("(max-device-width: 479.98px)")` (deprecated, and has the same
iOS orientation behaviour as `screen.width`); the `(orientation: landscape)` media query (keyboard problem above).

## R3. The fixed declaration, and zoom

**Decision**: when the rule applies, the meta's `content` is exactly `width=480`; otherwise it is the page's original
content, read once from the meta at start-up (`width=device-width, initial-scale=1`).

**Rationale**: with a width and no `initial-scale`, the browser picks the scale that fits the 480 px layout to the
screen (FR-001, FR-006). Keeping `initial-scale=1` would open the page at 1:1, showing only its left part. Nothing
that limits zoom is written (FR-005). Reading the original content from the page, rather than repeating the string in
the script, keeps one source for it.

**Alternatives considered**: `width=480, initial-scale=<computed>` (the browser already computes it, and a computed
value would be wrong after a turn until rewritten).

## R4. When the rule is applied again

**Decision**: `apply()` runs once when the script loads, and again on `window` `resize`, `window` `pageshow` and
`screen.orientation` `change` (when that object exists). `apply()` writes the meta only when the content it wants
differs from the content there.

**Rationale**: a turn fires `resize` and the orientation event; opening or closing a folding phone fires `resize`
(spec edge case); a page restored from the back/forward cache fires `pageshow` and no other event (spec edge case).
Rewriting the meta itself causes a `resize`; because `apply()` is idempotent that second call writes nothing, so there
is no loop. The on-screen keyboard also fires `resize`, and changes neither the screen's sides nor the device
orientation, so nothing is written.

**Alternatives considered**: `orientationchange` only (deprecated, and misses folding and the back/forward cache).

## R5. Browsers enlarge text on pages wider than the screen

**Decision**: while the fixed width applies the script sets `text-size-adjust: 100%` (and `-webkit-text-size-adjust`)
on the root element's inline style, and removes both when it does not apply.

**Rationale**: Chrome on Android ("font boosting") and Safari on iOS enlarge blocks of text on pages whose layout is
wider than the screen, each block by its own factor. That would break "the same layout, differing only in size"
(SC-001) and make the trial judge the browser's guess rather than the technique. No sheet sets `text-size-adjust`
today (searched `src/public/*.css`), because at `width=device-width` the browsers do not enlarge. Setting it from the
script keeps every existing style sheet untouched (FR-013) and leaves the no-script path exactly as today (FR-007).
The size of the effect without the declaration is **to verify** (quickstart §4, an optional comparison).

**Alternatives considered**: a rule in `site.css` (a sheet change for every device, against FR-013); leaving the
browsers' enlargement on (text blocks would differ in size from phone to phone).

## R6. What the fixed width does to the existing breakpoints

**Decision**: no CSS or script other than the new file changes. On a phone in portrait the layout width is 480 px, so:

| Rule | At 480 px | Effect on a phone in portrait |
|---|---|---|
| `max-width: 900px` (tab bar, question size, header buttons; `tabBarScroll.js`) | matches | compact scrolling tab bar, as today |
| `max-width: 767.98px` (header search position) | matches | as today |
| `max-width: 639.98px` (phone layout; `headerFit.js` `PHONE_QUERY`) | matches | the phone layout as designed: one card column with the card at its full 420 px, compact header, `headerFit.js` in its phone mode |
| `(max-width: 639.98px) and (hover: none)` (`pollCard-m3.css:447`, the pulsing maximize hint) | matches | the hint pulses, as today |
| `min-width: 560px` (`admin.css:13`) | does not match | admin toolbar not in three columns, as today on a phone |
| 479.98 px rules (tighter card and admin-card padding and corner radius) | do not match | cards keep the padding and radius of a wider screen |
| 359.98 and 319.98 px rules (admin wizard spacing, stacked admin fields) | do not match | never reached on a phone |

**Rationale**: 480 px is the narrowest width at which the 420 px card is shown at its full width inside the phone
layout. The trial began at 480 px (requirements NC1), where no phone reached the phone layout and each showed two card
columns; that was reviewed on a phone before 480 px was tried. The table is the list of things to look at in the
quickstart. The rules stay in the sheets: they still apply to a narrow
desktop window, and to every device if the trial is dropped.

## R7. Tap delay with a fixed width

**Decision**: no code; the quickstart checks that taps respond at once.

**Rationale**: browsers may keep double-tap-to-zoom, and with it a short delay before a tap is delivered, on pages
that do not declare `width=device-width`. Whether current Chrome and Safari do so for `width=480` is **to verify**
(quickstart §4). If the delay is noticeable it is a finding of the trial, recorded with the outcome, not something to
patch inside it (FR-013).

## R8. Tests

**Decision**: two new test files and no change to an existing one.

- `tests/client-viewport-width.test.ts` (jsdom, through `openPage` with `beforeScripts` installing `screen` sizes and
  `screen.orientation`): the cases of contract V2–V5.
- `tests/viewport-width-pages.test.ts` (reads the 13 files in `src/public/*.html`): contract V1, so a page added later
  without the script, or with it deferred or after a stylesheet, fails (FR-010).

**Rationale**: jsdom has no layout, so the scaling itself cannot be asserted; what can be is the decision the script
takes and what it writes. `openPage` strips the page's `<script>` tags and runs the named scripts itself
(`tests/helpers/browser.ts`), so the head position is checked from the files, not through jsdom.
`tests/pages.test.ts` needs no edit: its pinned text (the meta line and the two icon links) is unchanged.

## R9. Documents

**Decision**: after implementation, `ARCHITECTURE.md` gains a short section on the viewport rule (the script, the
rule, the events, the consequences of R6), and `CLAUDE_COMPLETE.md` this feature's decisions. `README.md` is not
changed during the trial: its phone descriptions (the tab bar "on screens up to 900 px wide", line 139) stay true at
480 px, and it does not describe the single-column layout by width. No route, setting, cookie or storage key is
added, so `postman/openapi.json`, `.claude/rules/environment.md` and `privacy.html` are unchanged.

**Rationale**: Constitution, Documentation Deliverables; the README must describe what a user sees, and that is only
settled when the trial's outcome is "kept".
