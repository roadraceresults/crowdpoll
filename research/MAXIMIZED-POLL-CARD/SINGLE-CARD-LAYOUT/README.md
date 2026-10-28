# Single-card layout — static extraction

One poll card, rendered and frozen, with the card grid taken away. Open
`single-card.html` in a browser (`file://` is enough; nothing here fetches anything but the Google
font the application itself uses) and design against it.

The page has one inline `<script>`. It declares `ENV_MIN_CHOICES` (2) and `ENV_MAX_CHOICES` (50),
which stand in for the application's environment variables of the same names and are removed when
the layout is integrated, and `RESULTS_MAX_BAR_HEIGHT` (50) / `RESULTS_MIN_BAR_HEIGHT` (25) from
`src/public/pollCard.js`, with `RESULTS_GAP_MAX` (20) / `RESULTS_GAP_MIN` (1). On load,
`setBarHeights` sets every bar in `.maximized-card-flip` to a height interpolated linearly from 50px at 2
bars to 25px at 50 bars (`barHeightFor`), and both lists' row gap to a fixed `RESULTS_GAP_FIXED`
(2px). `rowGapFor`, which would scale the gap from 20px to 1px the same way, and the two gap
bounds it uses are kept but not called for now. `setResultTextStyle` then gives every result label and
percentage the same text style, black on a pronounced white halo (`RESULTS_TEXT_COLOR`,
`RESULTS_TEXT_SHADOW`, which also reaches a few pixels left of the first letter), in place of
the black-or-white choice baked into the markup. Each text box is padded by `RESULTS_TEXT_PAD` so
the halo is not clipped, and `RESULTS_TEXT_BAND` adds a soft white band behind the whole text
(the `.text-band` rule in the page's `<style>`). That halo style is now the `'halo'` option of `RESULTS_TEXT_MODE`.
The `'shade'` option follows Polymarket: each bar's fill comes from `RESULTS_PALETTE_ENTRIES`
(then 50 light xkcd colour-survey colours, by bar order; now the vibrant palette described below) or, for a Yes/No label, from
`SEMANTIC_AFFIRMATIVE_COLOR` / `SEMANTIC_NEGATIVE_COLOR` (`#019529` / `#CF0234`, which are dark:
those bars get a pale tint of their colour as their track, and text that is white over the fill
and dark over the tint, changing colour where the fill ends), and its label and percentage take a very dark shade of that fill (`darkShadeOf`: same hue, lightness stepped
down from 25% until 7:1 contrast or a floor of 8%), with no halo.

The default is now `'vibrant'` (`setVibrantStyle`), which draws every bar the way the Yes/No bars
already are, using a vibrant palette.

**The palette.**
- Entries 1–10 are xkcd colours: darkish blue `#014182`, dark green blue `#1F6357`, marigold
  `#FCC006`, rust orange `#C45508`, pure blue `#0203E2`, black `#000000`, pink purple `#DB4BDA`,
  shit `#7F5F00`, rust brown `#8B3103` and grey `#929591`.
- Each later entry is the entry ten before it made slightly lighter: the same hue and
  saturation, 7 points more HSL lightness (`PALETTE_LIGHTER_STEP`). So 41–50 are 1–10 four steps
  lighter.
- The hex values are baked into the page. The names are only for reading; the webapp reads
  `hex` alone.

**Each bar:**
- **The fill:** the palette colour as it is.
- **The track:** the fill 80% of the way to white (`RESULTS_TRACK_TINT`; the Yes/No bars'
  `SEMANTIC_TRACK_TINT` is 80% too), a very light shade of the same colour. 90% and then 85% were
  tried first and read as too pale.
- **The text:**
  - over the fill, whichever of the fill's light shade (`lightShadeOf`, 95% lightness) and dark
    shade (`darkShadeOf`) reads better on it (`inkOnFillFor`): light on the darker fills, dark on
    the lighter ones;
  - over the track, the track's dark shade (`darkShadeOf`, 7:1);
  - the colour changes exactly at the fill's edge, through the same clipped copy the Yes/No
    bars use (`addInkOnFill`).

Measured on this palette:
- dark text on every track is 7.02:1 or better;
- text on the fill is 4.05:1 or better. It is below 4.5:1 on four mid-brightness fills, where no
  shade of their own hue reaches it: rust brown lighter ×2 and rust orange (4.05), shit lighter ×1
  (4.14) and darkish blue lighter ×3 (4.29);
- a light fill cannot stand far from a tint of itself: 29 fills are below 3:1 against their own
  track (marigold lighter ×4 is the lowest, at 1.20). The dark trailing edge on every fill
  (`poll-card-app.css`, `.result-fill`) marks where those fills end.
- The Yes/No bars at 80%: dark text 7.33:1 (Yes) and 8.21:1 (No); the Yes fill against its
  tint is 3.05:1.

The `'shade'` option still reads the same palette. It was designed for light fills, so on these
dark ones its dark text reads poorly. The sample bars are 4% or less, so most labels sit on the
track. For checking the palette, `RESULTS_PREVIEW_PERCENT` (50) sets every bar's fill and
percentage to 50%, so each colour shows its text half over the fill and half over the track.

**Temporary:** `RESULTS_PREVIEW_PERCENT` and `setPreviewPercent` are a validation aid. Set the
constant to `null` to see the markup's real numbers, and remove both before integrating.

Nothing else runs.

**Prepared for integration** (2026-09-24): the temporary `[-] n [+]` bar-count control, its hot
keys and the 50% palette preview are gone. The five page classes carry a `maximized-` name, in
the markup, the page's `<style>`, its script and all three stylesheets:

| Was | Now |
|---|---|
| `.container` | `.maximized-card-container` |
| `.layout` | `.maximized-card-grid` |
| `.card-viewport` | `.maximized-card-viewport` |
| `.card-flip` | `.maximized-card-flip` |
| `.space-right` | `.maximized-space-right` |

What you see is the DOM the live card
produces, written out as plain HTML. Edit it directly — change a label, a percentage, a bar height —
and reload.

Extracted 2026-09-22 from the working tree at that date.

## The files

| File | What it is |
|---|---|
| `single-card-back.html` | Opens `single-card.html#back`, which shows the back face. It has no copy of the card. |
| `single-card.html` | The page: the `.page-decor` / `.page` / `.maximized-card-container` / `.maximized-card-grid` shell from `src/public/index.html`, with one card as `.maximized-card-grid`'s only child. Both faces are present — front (results) and back (voting). |
| `poll-card.css` | The card's own stylesheet, copied from `src/public/pollCard.css`. |
| `page-layout.css` | The four page-shell rules, extracted from `src/public/tabs.css`. |
| `poll-card-app.css` | The rules the application adds on top (title row, totals, messages, the `[hidden]` overrides), curated from `src/public/site.css`. |

Load order is production's and matters: `poll-card.css`, then `page-layout.css`, then
`poll-card-app.css`. Several rules in the last deliberately beat the first at equal specificity.

## What was removed

From the page:

- the **`.card-grid`** — both the element and its rule. `.maximized-card-grid` holds the card directly, so a new
  single-card layout can be designed without the grid's columns getting in the way. The rule is at
  `src/public/tabs.css:185-189` if it is ever wanted back.
- the **`#site-header`**, the **`.tab-bar-wrap`** tab row and the **`.tab-notice`** line;
- every other tab panel, the empty-state line and the idle prompt;
- **every script** — `pollCard.js`, `tabs.js`, `deltaClient.js` and the rest. None is needed for
  layout.

Kept, as asked: the container and the layout (now **`class="maximized-card-container"`** and
**`class="maximized-card-grid"`**), with `.page-decor` and `.page`
around them, because the container is what gives the page its 1280px column and its padding, and
without `.page` that column is not centred.

The page adds exactly one rule of its own, in a `<style>` block at the top:

```css
.maximized-card-grid{ display:flex; justify-content:center; }
.maximized-card-grid > .maximized-card-viewport{ margin:0; }
```

Delete that block and the card sits at the container's top-left, which is where the grid would have
put its first cell.

## The card in the page

The sample is the stress case: a long question and 50 choices, many long enough to truncate. Each
bar's percentage came from a random whole number from 0 to 10, scaled so the 50 add up to exactly
100% (largest remainder), then sorted largest first, so the first bar has the largest share and
the last the smallest, as the application orders them. The numbers are baked into the markup: the fill width, the percentage
text and the row's `title`.

```
.maximized-card-viewport            max-width 420px, centred
  .maximized-card-flip              holds both faces in one grid cell (equal height, no resize on flip)
    .card-face.card-front question · bookmark star · results bars · actions · totals
    .card-face.card-back  question · vote rows · back + submit · totals
```

The back face is hidden until the flip. To see it in the same page layout, open
`single-card-back.html`, which opens `single-card.html#back`. The page reads the `#back` hash and
flips the card at load, with no turn animation (`showFace`). Adding or removing `#back` in the
address bar flips the card in place. There is only one copy of the card, so edits to
`single-card.html` show on both faces.

## The close control

An × button, `.icon-btn.maximized-card-close` with `aria-label="Close Poll Card"`, sits at the top
right of `.maximized-card-grid`. It uses the same markup and × icon as the app's card-shell close
control (`src/public/cardShell.js`), and `.icon-btn` gives it the pointer cursor. It is 1.5 times the
app's size: a 42px button, a 21px icon and a 16.5px corner radius, against `.icon-btn`'s 28, 14 and 11. It is on a row of
its own ahead of the card (`.maximized-card-close-row`, `flex-basis:100%`), so it covers neither the
bookmark star nor the panel. It stays at the top right when the panel wraps below the card. It sits
outside `.maximized-card-flip`, so it shows on both faces.

A click calls `closeMaximizedCard`, which here just goes back one page in the browser history. In
the application it has to close the maximized card and return to the current tab: replace its body
when integrating.

## About the frozen numbers

The bar rows carry inline styles because in the application the card **measures** before it renders:
it reads the height left for the bar region and the width of a row, then decides bar height, gap,
font size, padding, radio size and whether a label needs an ellipsis. A static copy has to bake
those numbers in, and these were produced by running the card's own layout functions
(`computeBarLayout`, `scaleFontSize`, `scalePad`, `scaleRadioSize`, `assignResultColors`,
`textStyleFor`, `majorityBackground`) against the measurements a browser reports for a card in the
1280px container:

| Input | Value |
|---|---|
| bar region height | 236 px |
| row width | 372 px |
| label ink width | ≈ characters × font-size × 0.55 |

| Result | Value |
|---|---|
| bar height | 32.86 px |
| row gap | 1 px |
| font size | 11 px |
| side padding | 10 px |
| radio size | 18 px |
| scrolling | no (seven rows fit; the arrow rows stay inactive) |

The label-width figure is an approximation — a real browser measures the glyphs — so which labels
truncate can differ by a character or two from what the live card would choose at exactly this size.
Everything else is the card's own arithmetic.

Change the card's height or width in your design and those numbers no longer hold; recompute them,
or mount the live card from `../poll-card.html` at the new size and copy what it renders.

## Taking a layout back to the application

These files are a copy, not a link. When the layout is settled, the change lands in
`src/public/pollCard.css`, `src/public/pollCard.js` (the markup is `POLL_CARD_TEMPLATE` at the
bottom) and, for the rules that live there, `src/public/site.css` and `src/public/tabs.css`. Diff
against the sources first — the application may have moved on since the extraction date above.

For a card that actually works — votes, flips, bookmarks, the Live Results link — use
`../poll-card.html`, the interactive harness in the parent directory.
