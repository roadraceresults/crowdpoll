# Research: Maximized Poll Card

**Feature**: `specs/021-MAXIMIZED-POLL-CARD/spec.md` | **Date**: 2026-09-24

The specification carries no `[NEEDS CLARIFICATION]` markers. The architecture pass closed 19
findings, and `/speckit-clarify` settled the one remaining behaviour: when the view closes on its
own. The decisions below are the design questions the plan had to answer against the code as it
stands. Each gives the decision, the reason, and what was rejected.

---

## R1: The view moves the card; it does not copy it

**Decision**: Maximizing moves the tab's existing card instance, its `.card-viewport` element, out
of `.card-grid` and into the tab's `.maximized-card-grid`, and closing moves it back to its position
in the order. The instance stays in the grid's `mounted` map throughout. A new instance method
`setMaximized(on)` toggles the maximized classes and re-renders.

**Rationale**: FR-019 – FR-021 ask for the same card, not a lookalike: its face, its unsubmitted
selection (`pendingSelection`), its vote notice and error, its handlers and its live updates.
Moving the instance makes all of that true by construction. Every existing update path
(`grid.render`, `grid.reapply`, `applyVote`, `updateOverlayEverywhere`) keeps reaching it through
the `mounted` map, and the tab removes it in the ordinary way when the poll leaves.

**Alternatives considered**: *A second instance mounted into the maximized grid* would need the
face, the selection, the vote notice and the error copied across in both directions. Every update
path would also have to learn a second target, and tests counting `.card-viewport` would see the
poll twice. *An overlay or modal above the grid* was ruled out by FR-008, which says the view sits
in the place of the grid, in the tab.

## R2: Sizing in the maximized view: a layout function passed to the renderers

**Decision**: `renderPollResults` and `renderVotingOptions` take the bar layout as a function of
the choice count, instead of calling `computeBarLayout(count, wrap.clientHeight)` themselves. The
grid card passes today's measured layout, unchanged. The maximized card passes
`maximizedBarLayout(count)`, which returns `{ scrolling: false, barHeight, gap: RESULTS_GAP_FIXED }`,
with `barHeight` interpolated linearly from `RESULTS_MAX_BAR_HEIGHT` (50) at `minChoices` to
`RESULTS_MIN_BAR_HEIGHT` (25) at `maxChoices`, clamped. It does not measure anything.
`RESULTS_GAP_FIXED` is 2. The bounds come from `/api/config` (`minChoices`, `maxChoices`), which
`tabs.js` has already loaded before any grid exists. `createGrid` passes them in the card options.

**Rationale**: FR-017 makes bar height a function of the count alone. The stand-alone layout's
`barHeightFor` is exactly that, and its hard-coded `ENV_MIN_CHOICES` / `ENV_MAX_CHOICES` become the
configuration values (requirements: "what is not carried"). The measured path is untouched, so
FR-034 (the grid card's sizing is unchanged) holds by construction. `updateArrowRows` already hides
both arrow rows when `layout.scrolling` is false.

**Alternatives considered**: *Rewriting the maximized card's rows' heights after a normal render*
(the stand-alone page's `setBarHeights`) renders twice and fights the in-place update signature.
*A separate maximized renderer* would duplicate the colour, truncation and in-place logic that
must stay shared (FR-018, SC-004).

## R3: No scrolling: five CSS overrides scoped to `.maximized-card-flip`

**Decision**: `pollCard.css` gains overrides under `.maximized-card-flip` that undo the scroll
machinery, as the stand-alone copy marks them `SINGLE-CARD-LAYOUT`:
`.bar-scroll-wrap { flex:0 0 auto }`, `.bar-scroll-inner { position:static }` with visible
overflow, and `.results-list` / `.voting-list { flex:0 0 auto; overflow:visible }`. The arrow rows
stay in the markup and stay hidden, because the maximized layout never reports `scrolling`.

**Rationale**: The grid card keeps its bars out of flow so that the bar count never grows the card
(the long comment above `.bar-scroll-wrap` in `pollCard.css`). The maximized card wants the
opposite: the bars in flow, so `.card-flip`'s `minmax(min-content, 1fr)` row grows with them. The
two are exact inverses, so scoped overrides are the smallest change, and the grid card's rules are
not touched.

**Alternatives considered**: *Removing the arrow rows from the maximized card's markup* would give
the moving card (R1) two templates. The layout already keeps them hidden.

## R4: Class names are added, not substituted

**Decision**: While maximized, the viewport carries `card-viewport maximized-card-viewport` and the
flip carries `card-flip maximized-card-flip`. `.maximized-card-grid` is a new element beside
`.card-grid`. `.container` and `.layout` keep their names.

**Rationale**: This is the requirements' own resolution. Every `.card-viewport` / `.card-flip` rule
(the 420 px cap, the 3-D flip, the face grid) and every lookup in `initPollCard` keeps working, and
the maximized rules override only what differs: the width floor (R6) and the no-scroll rules (R3).

**Alternatives considered**: renaming, as the stand-alone copy did. That copy had no JavaScript to
break.

## R5: The maximized view's markup comes from one `<template>` in `index.html`

**Decision**: `index.html` carries one `<template id="maximizedCardGrid">` holding the stand-alone
structure: an empty slot where the card is moved in, the `.col-rule`, and
`.maximized-space-right` with its ten placeholder paragraphs. A grid clones it into its tab panel,
beside `.card-grid`, the first time one of its cards is maximized. (The stand-alone layout's close
row and its 1.5× X were carried at first and removed by FIX04: the card's Minimize icon closes the
view.)

**Rationale**: The placeholder is about 5 KB of text. One copy in the page, rather than six (one
per panel) or a JavaScript string, keeps the markup in HTML, where the rest of the page shell lives.
The browser-test helper already loads `index.html`, so tests see it with no helper change.

**Alternatives considered**: *Building the elements in `tabs.js`* would put 5 KB of placeholder
prose in a script. *Six copies in the panels* would put it on the page six times.

## R6: Width floor `min(375px, 100%)`, and where the layout rules live

**Decision**: The stand-alone layout's rules go where their counterparts already live:
- **`tabs.css`**, the page and tab layout: `.maximized-card-grid` (wrapping flex row, `gap:18px 8px`,
  `container-type:inline-size`), `.col-rule` and its
  `@container (max-width:767.98px)` rule, and `.maximized-space-right`.
- **`pollCard.css`**, the card component: `.maximized-card-viewport { flex:0 1 420px;
  min-width:min(375px, 100%); margin:0 auto }` and R3's overrides.
- **`site.css`**, the app's card additions beside the Bookmark rules: the Maximize button and the
  title and subtitle hover.

The floor is `min(375px, 100%)` on both the card and the panel. The stand-alone copy's floor on
`.card-flip` is not carried, because the viewport's floor bounds it.

**Rationale**: No new stylesheet means no `index.html` link, no build change and no new
fingerprinted asset. `min()` keeps the side-by-side thresholds (898 px and 808 px) and removes the
phone overflow that `.page { overflow-x:clip }` would otherwise cut off (FR-013, SC-007).

**Alternatives considered**: *A new `maximizedCard.css`* is tidier to review but adds a link and a
fingerprinted asset for about 60 lines of CSS.

## R7: One maximized view per page, coordinated by `tabs.js`

**Decision**: `createGrid` gains `maximize(pid, from)` and `restore({ focus })`, plus an
`onMaximize` default in the card options it merges, the same way it supplies `onLive` today.
`tabs.js` holds one module-level `maximized = { grid, pid }` and closes it in four places:
1. **`select(name)`**, which covers another tab, the header search (`SearchTab.submit` selects
   Search) and the initial load;
2. **the tab bar's click handler**: when the clicked tab is the active one and a card is
   maximized, it restores and returns without calling `activate()`, so no request is made and no
   token is spent (FR-024);
3. **the session subscription**, before the reset it already runs on a sign-in change;
4. **a document `keydown` for Escape**, ignored while a dialog is open (`[aria-modal="true"]`: the
   tab's OK modal or Live Results' idle prompt) and while typing in a field.

The Refresh button is untouched: it refreshes the tab, and the maximized card updates in place
through `grid.render`.

**Rationale**: FR-023 – FR-025. All four exits reach the same `restore`, so scroll and focus
handling (R9) are written once. The exits that leave the tab (`select()` and the session
subscription) pass `{ quiet: true }`, and the Minimize icon, Escape and the active-tab click do not. The Escape guard stops one key press from closing both a dialog and
the view.

## R8: When the poll leaves the listing: by tab, because the browser cannot tell why

**Decision**: `grid.render` already unmounts a card whose pid has left `state.order`. For the
maximized pid it now asks the grid's `retainMaximized` option first:
- **Trending and Newest** (`retainMaximized: true` in their grid options): the card stays mounted
  and maximized, marked *retained*. It keeps working until the visitor closes the view. Then it is
  unmounted instead of moved back, and focus goes to the tab's first card's Maximize icon, or to
  `.tab-empty`.
- **Every other tab**: the view closes at once, the card is unmounted, and focus goes to the first
  card's Maximize icon or `.tab-empty`. On Live Results, `removePoll`'s existing
  `focusAfterRemoval` runs after the render and places focus by 020's rule, which overrides this.

A retained card has no tab state behind it any more, so the grid keeps its last `PollDetail`, and
`applyVote` and `updateOverlayEverywhere` in `tabs.js` also patch the retained card. A vote made in
it shows its result, and a Favorites toggle shows its star, as FR-019 asks.

**Rationale**: `/speckit-clarify` chose Option B: close at once when the visitor caused the drop or
the poll was deleted, rejected or made inaccessible; stay open when a recompute dropped it. On the
personal tabs, Live Results and Search, every drop is one of the "close" causes, and the delta
tells the browser at once. On Trending and Newest the browser receives a new published list and
nothing more. A deleted or rejected poll disappears from it exactly as a recomputed-out one does,
and the two cannot be told apart without a new request per drop, which the spec rules out ("no new
request"). The safe consequence: a deleted poll's retained card stays open until closed, and if
the visitor votes in it, the server's `404` is shown by the card's existing vote-error path, "Your
vote could not be recorded". **This refines FR-026 for Trending and Newest.** The spec's edge
cases are amended to say so (see the note in `spec.md`).

**Alternatives considered**: *Asking the server about every dropped poll* adds a request the spec
excludes, for a rare case. *Closing at once on Trending and Newest too* reverses the clarified
answer for the common case, a recompute, to cover the rare one.

## R9: Scroll and focus

**Decision**: `maximize` records `window.scrollY`. It then shows `.maximized-card-grid`, hides
`.card-grid`, moves the card in, scrolls the panel's top into view only if the top is above the
viewport, and focuses the card's `.maximize-btn`, which now shows Minimize (FIX04; it focused the
X before the X was removed). `restore` reverses the moves, restores the recorded scroll position,
and places focus by the face the card is on **as it closes**, whichever face it was opened from:
the card's `.maximize-btn` on the front, or the back face's title, which gets `tabIndex = -1` for
that, as 020 did for `.tab-empty`. Choosing by the face at open would focus an element on the face
now turned away when the visitor flipped the card while maximized. Two variants:
- when the view closed because the poll left the tab, `restore` applies the tab's focus rule
  instead (R8);
- `restore({ quiet: true })`, used by closes caused by leaving the tab (R7: another tab, a search, a
  sign-in change), restores neither the scroll position nor focus, because the panel is about to
  be hidden.

**Rationale**: FR-027. The title is not a tab stop (FR-002), so it can take focus only
programmatically, which is what `tabIndex = -1` gives.

**Revised by FIX07 (`fix.md`):** the voting face now has its own `.maximize-btn` in a title row. So focus goes to the button on the face the card is showing, both on opening and on closing, instead of to the back face's title. `tabs.js` does this with `shownMaximizeButton`.

## R10: Colours: the research technique, precomputed, with the Yes/No text clipped to the fill

**Decision**, in `pollCard.js`:
1. `RESULTS_PALETTE_ENTRIES` becomes the research page's 50 light xkcd entries, with entries 1 – 2
   restored to robin's egg blue `#98EFF9` and pale peach `#FFE5AD`.
   `SEMANTIC_AFFIRMATIVE_COLOR` becomes `#018826`, and `SEMANTIC_NEGATIVE_COLOR` becomes `#CF0234`.
2. The research page's `hexToRgb`, `contrastRatio`, `hexToHsl`, `hslToHex`, `darkShadeOf` and
   `mixWithWhite` come across. `luminanceOf` already exists and is kept. Ink is computed **once at
   load** into a `Map` from fill to ink, for every palette fill and both semantic tints, not per
   render.
3. `applyTruncation` keeps its truncation logic and sets each label and percentage to its bar's
   ink with `textShadow: 'none'`. A semantic bar's row background becomes its tint
   (`SEMANTIC_TRACK_TINT = 0.85`), and its ink is the tint's dark shade.
4. **The white copy.** Each semantic row holds one `.result-ink-on-fill` overlay: white copies of
   its label and percentage, including truncation state, clipped with
   `clip-path: inset(0 calc(100% - W) 0 0)`. The clip gets the **same** transition as the fill
   (`clip-path 0.9s cubic-bezier(0.22,1,0.36,1)`), and **W is set wherever the fill's width is
   set**: in the deferred frame on a rebuild, and immediately on the in-place path. The two
   animate together from the same start. On the in-place path, rows can change occupant after a
   reorder, so the overlay is created, updated or removed per row on every render. It is created
   with its clip at the fill's current width, so it starts where the fill is. Compact rows hide it,
   as they hide the text.
5. `textStyleFor`, `majorityBackground`, the 0.40 threshold and both halo shadows are deleted.
   `RESULTS_TRACK_COLOR` stays, because the test that measures ink against the track uses it. The
   fill's trailing edge (`site.css`, `inset -2px 0 0 rgba(0,0,0,0.55)`) stays.

**Measured** with the final palette (entries 1 – 2 restored) and the research page's own
`darkShadeOf`:

| Check | Result | Requirement |
|---|---|---|
| Palette ink on its own fill, lowest | 7.03:1 (duck egg blue `#C3FBF4` → `#065B50`) | ≥ 7:1 (FR-030) |
| Palette ink on the empty track `#DDE1D6`, lowest | 5.71:1 (butter `#FFFF81` → `#575700`) | readable (FR-030) |
| White on Yes `#018826` | 4.61:1 | ≥ 4.5:1 (FR-031) |
| White on No `#CF0234` | 5.66:1 | ≥ 4.5:1 (FR-031) |
| Yes ink `#275332` on tint `#D9EDDE` | 7.22:1 | dark shade of the tint |
| No ink `#6C142B` on tint `#F8D9E1` | 9.03:1 | dark shade of the tint |
| Distinct fills among the 50 | 35 (repeats allowed by the requirements) | — |

**Rationale**: FR-029 – FR-033. Precomputing makes the colour cost of a render one `Map` lookup per
bar. Animating the clip beside the width is the only way FR-032 ("at every moment") holds, and it
needs no measurement. Keeping one overlay per semantic row is what makes the in-place path correct
after a reorder, the defect 009's research R1 recorded.

**Alternatives considered**: *`background-clip:text` with a gradient whose stop is animated
through a registered custom property* avoids the copy. But the label is positioned and truncated
independently of the fill's coordinates, so the gradient stop would need per-element offsets. The
overlay needs none. *A static clip* (the research page) fails FR-032 for most of a second after
every change.

**Revised by FIX05 (`fix.md`):** the palette is now the research's vibrant `color-palette.md` (50 distinct xkcd colours, starting darkish blue `#014182`), and every palette bar is drawn as the Yes/No bars are: its empty part is the fill 80% of the way to white, the text over it is the tint's dark shade (7:1), and a copy clipped to the fill carries whichever of the fill's light shade (95% lightness) and dark shade reads better. On the new palette that copy reaches 4.05:1 at the lowest, and five fills are below 4.5:1. `SEMANTIC_TINT`, `RESULTS_INK` and `isSemanticColor` gave way to one `BAR_COLORS` map computed at load. The Yes/No bars are unchanged.

## R11: Tests

**Decision**:
- **`tests/client-home.test.ts`** (jsdom, through `tests/helpers/browser.ts`, which already loads
  `index.html` and every script involved; no helper change): opening by title, subtitle and icon;
  closing by the Minimize icon, the current tab (asserting no request is sent) and Escape; the view closing on
  another tab and on a search; the card being the same element, keeping a pending selection
  through open and close; the maximized card showing every row with no active arrow row and with
  the count-based height; Favorites un-favourite and Live Results removal closing the view;
  a Trending recompute keeping it open; a vote in a retained card updating it; focus after each
  close.
- **`tests/poll-card-assets.test.ts`**: replace the `#43F781` / `#FC9E9E` and
  `luminanceOf(hex) > 0.40` assertions with `#018826` / `#CF0234`, keep the palette-size assertion,
  and keep `RESULTS_TRACK_COLOR`.
- **A contrast test** that renders a 50-choice poll and a Yes/No poll in jsdom and computes, from
  the rendered inline styles, every label's contrast with its fill and with the track, and white's
  contrast with each semantic fill (SC-005). jsdom does not paint, so the fill animation and the
  clip's tracking (SC-006) are checked in `quickstart.md` in a real browser.

**Rationale**: The existing suites already cover the card's other behaviour. The additions assert
each FR the plan touches, and what jsdom cannot see is named in the quickstart.
