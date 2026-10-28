# UI Contracts: Maximized Poll Card

**Feature**: `specs/021-MAXIMIZED-POLL-CARD/spec.md` | **Date**: 2026-09-24

The feature exposes no HTTP interface: no route, payload or `postman/openapi.json` change. What it
exposes is user interface: the controls a visitor operates, the markup that tests and later
features select, and the colour rules every card follows. This file fixes all three.
It **supersedes**, for the card's title row, the per-tab control lists in
`specs/017-SEARCH-AND-SCALABILITY-DATABASE/contracts/ui-contracts.md` (as annotated by 020). It also
supersedes the bar colour and ink rules of `specs/009-POLL-CHOICE-COLORS/` and
`specs/010-ZERO-VOTE-TEXT-LEGIBILITY/`.

---

## C1: The card's title row (every card, every tab, grid view)

```html
<div class="question-row">
  <p class="question">…</p>
  <button class="bookmark-btn" …>…</button>            <!-- hidden on My Private Polls -->
  <button class="maximize-btn" type="button"
          aria-label="Maximize Poll Card" title="Maximize Poll Card">
    <svg class="maximize-icon" viewBox="…" aria-hidden="true" focusable="false">…</svg>
  </button>
</div>
<p class="subtitle">…</p>

<!-- the voting face (FIX07): the same button, no star -->
<div class="question-row">
  <p class="question">…</p>
  <button class="maximize-btn" …>…</button>
</div>
<p class="subtitle">…</p>
```

| Element | Contract |
|---|---|
| `.maximize-btn` | One on each face (FIX07), both switched together. Last in `.question-row`, 28 × 28 px, 4 px after `.bookmark-btn` (alone at the right when the star is hidden). Holds two 24 × 24 px icons in `currentColor`, one hidden: `.maximize-icon` on a grid card, `.minimize-icon` (the arrow turned 180°) on the maximized card, with `aria-label` / `title` "Maximize Poll Card" / "Minimize Poll Card" to match. Colour `#202020`; background `rgba(0,0,0,0.06)` on `:hover`, `rgba(0,0,0,0.12)` on `:active`, and on `:focus-visible` the light background plus `outline:2px solid var(--moss)`, offset 2 px. `cursor:pointer`. A tab stop; Enter and Space activate it (native button). |
| The icon | A single path traced from `designDocs/dontTrack/maximizeIcon.jpg` (the rounded square, the filled box at lower left, the arrow to upper right). The file `designDocs/dontTrack/maximizeIcon.svg` holds the same path in black on transparent. |
| `.question`, `.subtitle` (both faces) | `cursor:pointer`; `text-decoration:underline` on hover. A click opens the view. Not tab stops. |

## C2: The maximized view (inside the current tab's panel)

```html
<section class="tab-panel" data-panel="…">
  <div class="card-grid" hidden>…every other card, still mounted…</div>
  <div class="maximized-card-grid">
    <div class="card-viewport maximized-card-viewport">
      <div class="card-flip maximized-card-flip">…the same card…</div>
    </div>
    <div class="col-rule" aria-hidden="true"></div>
    <div class="maximized-space-right"><p>Lorem ipsum…</p> … (10 paragraphs)</div>
  </div>
  <p class="tab-empty" hidden></p>
</section>
```

| Element | Contract |
|---|---|
| `.maximized-card-grid` | A wrapping flex row, `gap:18px 8px`, `container-type:inline-size`. Shown only while a card is maximized, when `.card-grid` is `hidden`. Because `.card-grid` sets `display:grid`, which beats the browser's own `[hidden]` rule, `tabs.css` carries `.card-grid[hidden]{ display:none; }`. At most one on the page is shown. |
| `.maximized-card-viewport` | `flex:0 1 420px; min-width:min(375px, 100%); margin:0 auto`. Keeps `.card-viewport`'s 420 px cap. |
| `.maximized-card-flip` | Bars in flow and never clipped. No arrow row is active. |
| `.col-rule` | `flex:0 0 2px; background:var(--line)`, stretched to the line's height. `display:none` under `@container (max-width:767.98px)`. |
| `.maximized-space-right` | `flex:1 1 420px; min-width:min(375px, 100%); align-self:flex-start; padding:10px; background:#E6E6E6`, Inter 13 px, `var(--muted)`. The stand-alone layout's ten paragraphs. |
| Inside the maximized card | `.maximize-btn` shows its Minimize form and is the view's only close control on the card (there is no separate close button; FIX04). `.question` and `.subtitle` have no pointer, no underline and no click. |

## C3: Opening and closing

| Trigger | Result |
|---|---|
| Click `.question` / `.subtitle` (either face), or activate `.maximize-btn` | The view opens in the current tab. Focus moves to the card's `.maximize-btn` on the face showing, now in its Minimize form, and the panel's top is scrolled into view if it is above the viewport. No request is sent. |
| `.maximize-btn` in its Minimize form, **Escape**, or a click on the active tab | The view closes, the grid is shown, the page returns to its scroll position, and focus goes to the card's `.maximize-btn` on the face it is showing as the view closes. No request is sent. |
| Escape while a `[aria-modal="true"]` dialog is open, or while typing in a field | Ignored by the view. |
| Another tab, a header search, a sign-in or sign-out | The view closes without restoring the scroll position or moving focus, then the existing behaviour runs. |
| Refresh button | The tab refreshes, and the maximized card updates in place. The view stays open. |
| The poll leaves the listing on My Private Polls, Favorites, Live Results or Search | The view closes at once. Focus goes to the first card's `.maximize-btn`, or `.tab-empty`. On Live Results, 020's removal focus rule applies. |
| The poll leaves the listing on Trending or Newest | The view stays open, and the card keeps working, including its own votes and Favorites. On close, the card is removed and focus goes to the first card's `.maximize-btn`, or `.tab-empty`. |
| The page address and history | Never changed. |

## C4: Bar sizing

| Card | Bar height | Gap | Scrolling |
|---|---|---|---|
| Grid (unchanged) | fitted to the space, 50 → 25 px | 20 → 1 px, fitted | when the bars do not fit at 25 px / 1 px |
| Maximized | 50 px at `minChoices`, falling linearly to 25 px at `maxChoices` | 2 px | never, on either face |

Font size, padding, compact rows and label truncation follow the bar height by today's rules in
both.

## C5: Bar colours and text (every card, both views)

| Rule | Value |
|---|---|
| Palette | 50 distinct xkcd colours in order, starting darkish blue `#014182`, dark green blue `#1F6357` (the research's `color-palette.md`, FIX05); see `data-model.md` §3. *Since 022, a card's first palette bar takes the entry derived from its poll id, not entry 1; see `specs/022-BAR-COLORS/contracts/ui-contracts.md` C1.* |
| Yes / No fills | `#018826` / `#CF0234`; which labels match is unchanged (the 009 word and exact rules) |
| Palette bar track | the fill 80% of the way to white. *Since 024, a row's track and the tint's dark-shade text are not inline `background` / `color` but the custom properties `--bar-track` / `--bar-ink` (with `--bar-track-dark` / `--bar-ink-dark` for the dark scheme), applied by `pollCard-m3.css`; see `specs/024-MATERIAL3-MERGE/contracts/ui-contracts.md` C9.* |
| Palette text | the tint's dark shade over the tint (≥ 7:1); over the fill, a copy clipped to the fill's width in whichever of the fill's light shade (95% lightness) and dark shade reads better (≥ 4:1, 4.5:1 on all but five fills); no `text-shadow` |
| Semantic bar track | the fill 85% of the way to white |
| Semantic text | the tint's dark shade over the tint, white over the fill; the split is at the fill's edge at every moment, including during the 0.9 s width transition |
| White on semantic fills | ≥ 4.5:1 |
| Fill's trailing edge | `box-shadow: inset -2px 0 0 rgba(0,0,0,0.55)`, kept |
| Voting face rows | `--choice-unselected` / `--choice-selected`, unchanged |
| Removed | the black/white `textStyleFor` choice, the per-element fill/track coverage rule, the 0.40 threshold, the text halos, `#43F781`, `#FC9E9E` |
