# Colour contrast

## Purpose and standard

How far every colour on the site stands from what it is drawn on, in the Light and the Dark scheme, and the
colours that never change. `tests/color-contrast.test.ts` reads the tables below and checks each row against the
colours `src/public/m3-tokens.css` sets, so a colour change that loses contrast fails a test named after the pair.

The standard is [WCAG 2.2](https://www.w3.org/TR/WCAG22/) level AA, measured with its
[contrast ratio](https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio):

- text at least 4.5:1 against what it sits on; a control's boundary, a selected state or a chart mark at least 3:1;
- house rules above that: 7:1 for text on a vote row, an amber selected row and a result bar's track; 4.5:1 for text
  over a bar's fill (black or white), which is also the rule for a selected vote row, drawn in its bar's fill and
  text-on-fill colours (TWEAK30); 1.5:1 for a bar's track against the card unless `--bar-track-contrast` (or its `-dark`
  twin) in `m3-tokens.css` sets another ratio; a card's border at least 1.5:1 and below
  3:1 against the card and the page, so it frames the card without outshouting its content.

Each scheme's colours are set in one place: the two alias blocks of `m3-tokens.css`,
`:root:not([data-theme="dark"])` (Light) and `:root[data-theme="dark"]` (Dark). The legacy `:root` palettes in
`tabs.css`, `pollCard.css` and `site.css` are shadowed by them. To add a pair, add a row to **Required pairs**; to
change a colour, change it in `m3-tokens.css` and run `npx vitest run tests/color-contrast.test.ts`.

## Frozen colours

These colours are the brand: their values never change, in either scheme.

| Role | Light | Dark |
|---|---|---|
| `--md-sys-color-primary` | `#2C6A46` | `#94D5A8` |
| `--md-sys-color-on-primary` | `#FFFFFF` | `#00391E` |
| `--md-sys-color-primary-container` | `#AFF1C3` | `#0D5130` |
| `--md-sys-color-on-primary-container` | `#0D5130` | `#AFF1C3` |
| `--md-sys-color-inverse-primary` | `#94D5A8` | `#2C6A46` |
| `--moss` | `#3D5A46` | `#94D5A8` |
| `--moss-dark` | `#2C4234` | `#2C4234` |
| `SEMANTIC_AFFIRMATIVE_COLOR` | `#006120` | `#006120` |

## Required pairs

| Foreground | Background | Minimum | Schemes | Why |
|---|---|---|---|---|
| `--choice-edge` | `--paper-raised` | 3 | both | a vote row's edge marks the row on the card |
| `--choice-selected` | `--choice-unselected` | 3 | both | a selected row stands apart from the others |
| `--ink` | `--choice-unselected` | 7 | both | a vote row's label |
| `--on-choice-selected` | `--choice-selected` | 7 | both | a selected row's label, radio and check |
| `--md-sys-color-on-surface-variant` | `--choice-unselected` | 3 | both | an unselected row's radio ring |
| `--paper-raised` | `--paper` | 1.1 | both | a card is a different tone from the page |
| `--line` | `--paper-raised` | 1.5–<3 | both | a card's border is seen on the card, without outshouting its content |
| `--line` | `--paper` | 1.5–<3 | both | a card's border is seen on the page |
| `--ink` | `--paper` | 4.5 | both | text on the page |
| `--ink` | `--paper-raised` | 7 | both | text on a card |
| `--muted` | `--paper` | 4.5 | both | secondary text on the page |
| `--muted` | `--paper-raised` | 4.5 | both | secondary text on a card |
| `--tab-text` | `--tab-bar-background` | 4.5 | both | an inactive tab's text |
| `--tab-active-text` | `--tab-bar-background` | 3 | both | the active tab's text |
| `--tab-indicator` | `--tab-bar-background` | 3 | both | the active tab's underline |
| `--header-text` | `--header-background` | 4.5 | both | the header's search text and the user's name |
| `--header-link` | `--header-background` | 3 | both | the header's nav link and outlined button |
| `--on-header-button` | `--header-button` | 4.5 | both | the header's filled button's text |
| `--md-sys-color-on-surface-variant` | `--paper-raised` | 4.5 | both | radio and checkbox rings; an admin list row's text |
| `--md-sys-color-outline` | `--paper-raised` | 3 | both | the admin search field's border |
| `--md-sys-color-on-surface-variant` | `--md-sys-color-surface-container` | 4.5 | both | an admin list row's text on an even row |
| `--md-sys-color-on-secondary-container` | `--md-sys-color-secondary-container` | 4.5 | both | an open admin list row's text |
| `--md-sys-color-primary` | `--paper-raised` | 3 | both | the focus outline and green icons on a card |
| `--md-sys-color-primary` | `--md-sys-color-surface-container` | 3 | both | the focus outline on an even admin row |
| `--card-lift-edge` | `--paper-raised` | 3 | both | a lifted card's growing edge |
| `--md-sys-color-on-secondary-container` | `--icon-button-background` | 3 | both | the glyph on a filled icon button (Refresh, back arrow, phone vote bar) |
| `--md-sys-color-on-surface` | `--poll-notes-background` | 4.5 | both | a card's notes |
| `--md-sys-color-primary` | `--poll-notes-background` | 4.5 | both | the notes' Read more button |

## Result colours

A result bar's colour is stored once (a creator's choice, Yes/No green and red, or the poll's palette entry) and is
never changed. `pollCard.js` derives what is drawn from it, once per colour and scheme, against the card colour
(`#FFFFFF` in Light, `#1C211D` in Dark):

- **Fill**: the stored colour if it already stands 3:1 from the card, else the nearest shade of its hue that does
  (darker on the light card, lighter on the dark one). The results graph draws its line for that choice in the same
  shade, so a bar and its line match; the graph is always drawn on the card colour.
- **Track**: the fill mixed into the card, as pale as it can be (at most `--bar-track-tint` card in Light, 90%, and
  `--bar-track-tint-dark` in Dark, 80%, both in `m3-tokens.css`; in 5% steps) while still standing `--bar-track-contrast` (Light) or `--bar-track-contrast-dark` (Dark) from the card,
  1.5:1 unless changed; a lower ratio gives a paler track, so the fill stands further from it.
- **Text on the track**: a deep (Light) or pale (Dark) shade of the track's own hue at 7:1.
- **Text on the fill**: black or white, whichever contrasts more with the fill (never below 4.58:1); a colour listed
  in `TEXT_ON_FILL_OVERRIDES` keeps its chosen text colour only while that reaches 4.5:1.

Each row carries these as `--bar-fill`, `--bar-track`, `--bar-ink`, `--bar-ink-on-fill` and their `-dark` twins;
the stylesheet picks the scheme's set.

The base palette (`RESULTS_PALETTE_ENTRIES` in `pollCard.js`, `RESULTS_PALETTE` in `src/polls/barPalette.ts`) is the
reviewed original, in the order that keeps neighbouring bars from clashing. The creator's palette is the Yes and No
colours followed by that list. The aim is that, as drawn, no two of its colours are closer than ΔE 13
([CIE76](https://en.wikipedia.org/wiki/Color_difference#CIE76)) in either scheme; `tests/color-contrast.test.ts` checks it.
Each name is the nearest CSS named colour.

The Dark scheme has its own palette, `RESULTS_PALETTE_ENTRIES_DARK` in `pollCard.js`, one entry for each entry of the
Light list, in the same order: in Dark, a bar or graph line in Light entry *i* (automatic, or chosen by the creator) is
drawn from Dark entry *i*, then through the same fill, track and text rules. Yes and No have their own Dark colours
(`SEMANTIC_AFFIRMATIVE_COLOR_DARK` `#00872C`, `SEMANTIC_NEGATIVE_COLOR_DARK` `#EC0606`); any other colour (an older
creator's) is drawn from itself. The colour stored is always the Light hex. `src/polls/barPalette.ts` holds the same Dark
list and Dark Yes and No (`BAR_PALETTE_DARK`), sent to the creator's picker as each colour's `darkHex`, so in Dark the
picker shows what Dark voters see (TWEAK26, TWEAK28). Dark Yes, No, mediumvioletred, royalblue, mediumorchid, chocolate
and olivedrab are dark enough for white text at 4.5:1 and are listed with white in `TEXT_ON_FILL_OVERRIDES`, since black
is only just higher on them (TWEAK29). So are No `#EC0606` (the same in both schemes) and olive `#7B7924` in Light,
darkened from `#F91010` and `#817F26` for white text (TWEAK31); polls that stored either old colour keep it, drawn from
itself with black text.

## Techniques

1. **An edge on every option**: a vote row has a 1 px `outline` border (3:1 on the card) and keeps a light fill.
2. **A wider tonal step**: the page is darker than the card in both schemes, and the card's border is visible on both.
3. **A saturated selected state from the amber (tertiary) family, never green**: a selected row is `#643F00` with
   white text in Light and `#FFB956` with `#462B00` text in Dark, 3:1 or more from an unselected row; its radio, dot
   and check take the row's text colour.
4. **Every bar fill at 3:1 on the card**, in both schemes, by the shade rule above.
5. **Lower track tints**, so a bar's length shows and the card reads as colourful.
6. **A lifted card**: a grid card rises 4 px with M3 elevation 3 while a mouse is over it or a finger presses it; in
   Dark, where a shadow does not show, its border also takes `outline`. As it rises, a blue edge (`--card-lift-edge`
   `#2178F5`) grows from 1 px to 4 px with a glow (`--card-lift-glow` `#55A6FF`), holds, then steps down through 3, 2
   and 1 px and goes, within 1.5 s; under reduced motion it stays at 4 px while lifted. The maximized card never lifts.
   When it returns to its tab's grid (Minimize, the back arrow, Escape, Back, or its own tab chosen again) it is
   scrolled into view below the fixed header and lifts once, for those 1.5 s.
7. **The page background**: `--paper` with two faint glows fixed to the window (`.page-decor`), moss green at the top
   left and amber at the bottom right, each fading out at 60% of its radii. Each glow's colour and strength are set per
   scheme (`--page-glow-1-color`, `--page-glow-1-strength`, `--page-glow-2-color`, `--page-glow-2-strength`), its size
   and centre once (`--page-glow-N-size`, `--page-glow-N-at`), all in `m3-tokens.css`. They are decoration, not part of
   any Required pair: text never relies on them. They are drawn under the page's content and the footer, so the
   footer keeps its own colours.
8. **The header and the Tab Bar** take their colours from their own tokens, set per scheme in `m3-tokens.css`:
   `--header-background`, `--header-divider`, `--header-text`, `--header-link`, `--header-button`,
   `--on-header-button`; `--tab-bar-background`, `--tab-bar-divider`, `--tab-text`,
   `--tab-active-text`, `--tab-indicator`, `--tab-refresh-background`, `--tab-refresh-icon`. The filled icon buttons
   (Refresh, the back arrow, the phone vote bar's) share `--icon-button-background`. Each starts as the role it
   replaced (a `var()`), and must stay a `#RRGGBB` colour or a `var()` so the pairs above can be checked.
   Every Tab Bar icon is a circle in the tab's text colour with its glyph cut in `--tab-bar-background`, and the
   wordmark has no ground of its own in either scheme, so the header's background and glows show around its letters.
   The header's Search field and the Search tab's field are bordered as a card is (`1px solid var(--line)`) and
   filled from one token, `--search-field-background`, so both change together; both are fully rounded, with the
   header's magnifier (`.search-icon-btn`) at the left.
9. **The header's glows**: two horizontal gradients over the header and the Tab Bar (`--header-background`,
   `--tab-bar-background`), the width of the window, moss from the left edge and amber from the right, one band from the
   top of the header to the foot of the Tab Bar (`--header-glows`). The header's layer is pinned to the window, not
   drawn wider than the header, so the header never measures as overflowing and keeps its Search field. Each is full strength from its edge to `--header-glow-<side>-at`, then
   fades out over `--header-glow-<side>-size` (both shared); its colour and strength
   (`--header-glow-<side>-color`, `--header-glow-<side>-strength`, `0%` turns it off) are set per scheme. Like the
   page glows they are decoration, not part of any Required pair.

Green (`primary`) stays the brand: icons, links, buttons and the logo; it is never a selected-row colour, and no vote
row takes its choice's result colour.

## CrowdPoll green shades

The brand green `#2C6A46` lightened toward white. Each shade is written once, as a custom property in the plain
`:root` block of `m3-tokens.css`; roles and rules name it with `var()`. The emails' copy is `src/brandColors.ts`, and
`tests/color-contrast.test.ts` keeps the two the same and finds no other place that spells a shade's hex.

| Shade | CSS custom property | Server constant |
|---|---|---|
| `#F4F8F6` | `--crowdpoll-green-5-percent` | `CROWDPOLL_GREEN_5_PERCENT` |
| `#EAF0ED` | `--crowdpoll-green-10-percent` | `CROWDPOLL_GREEN_10_PERCENT` |
| `#D5E1DA` | `--crowdpoll-green-20-percent` | `CROWDPOLL_GREEN_20_PERCENT` |
| `#C0D2C8` | `--crowdpoll-green-30-percent` | `CROWDPOLL_GREEN_30_PERCENT` |
| `#ABC3B5` | `--crowdpoll-green-40-percent` | `CROWDPOLL_GREEN_40_PERCENT` |
| `#96B5A3` | `--crowdpoll-green-50-percent` | `CROWDPOLL_GREEN_50_PERCENT` |
| `#80A690` | `--crowdpoll-green-60-percent` | `CROWDPOLL_GREEN_60_PERCENT` |
| `#6B977E` | `--crowdpoll-green-70-percent` | `CROWDPOLL_GREEN_70_PERCENT` |
| `#56886B` | `--crowdpoll-green-80-percent` | `CROWDPOLL_GREEN_80_PERCENT` |
| `#417959` | `--crowdpoll-green-90-percent` | `CROWDPOLL_GREEN_90_PERCENT` |
| `#2C6A46` | `--crowdpoll-green-100-percent` | `CROWDPOLL_GREEN_100_PERCENT` |

White is not one of them: it stays `#FFFFFF`. The Google sign-in button's borders, the email's small grey text
(`#5C6058`, 6.42:1 on white) and the legacy `:root` palettes keep their own colours.

## Change log

### 2026-11-24 — CrowdPoll green shades

| Colour | Light before → after | Dark before → after |
|---|---|---|
| `--md-sys-color-primary`, Dark `--md-sys-color-inverse-primary` | `#2C6A46` → 100% (same value) | `#2C6A46` → 100% (same value) |
| `--md-sys-color-surface-container-high` | `#F4F8F6` → 5% (same value) | `#262B27` (unchanged) |
| `--md-sys-color-surface-container`, `-low`, `--md-sys-color-inverse-on-surface`, `--header-paper` | `#EAEFE8`, `#F1F3EE`, `#EDF2EB`, `#E5EAE2` → 10% | unchanged |
| `--md-sys-color-surface-container-highest`, `--md-sys-color-secondary-container` | `#DFE4DD`, `#D1E8D5` → 20% | unchanged |
| `--md-sys-color-on-surface`, `--md-sys-color-inverse-surface`, `--md-sys-color-on-secondary-container` | unchanged | `#DFE4DD`, `#DFE4DD`, `#D1E8D5` → 20% |
| `--md-sys-color-outline-variant` | `#C0C9C0` → 30% | `#414942` (unchanged) |
| `--md-sys-color-on-surface-variant` | `#414942` (unchanged) | `#C0C9C0` → 30% |
| `--icon-button-background`, page and header glows | `#C0D2C8` → 30% (same value) | unchanged |
| `--md-sys-color-secondary` | `#4F6354` (unchanged) | `#B6CCB9` → 40% |
| `--line` | `#919790` → 50% | `#4A524B` (unchanged) |
| `--md-sys-color-outline` (and `--choice-edge`) | `#717971` → 70% (4.49 → 3.31:1 on the card) | `#8A938B` → 70% |
| Search field hint (`.search-kbd`), header search focus border, vote radio border, ballot rules and bookmark icon | `#C3C8BC` → 30%, `#B7BDB5` → 40%, `#9AA197` → 50% | same |
| Filled pill buttons' text (`.btn-primary`, `.btn-header-primary`) | `#F7F8F5` → `#FFFFFF` | same |
| Email: header and button fill, footer rule | `#2C6A46` → 100% (same value), `#E0E3DB` → 20% | — |

### 2026-11-20 — colour contrast

| Colour | Light before → after | Dark before → after |
|---|---|---|
| `--paper` (page) | `#F1F3EE` → `#E5EAE2` | `#0F1511` → `#0A0E0B` |
| `--paper-raised` (card) | `#FFFFFF` (unchanged) | `#181D19` → `#1C211D` |
| `--line` (card border) | `#D8DCD3` → `#A3ABA2` | `#414942` → `#4A524B` |
| `--muted` | `#6B7268` → `#414942` | `#C0C9C0` (unchanged) |
| `--track` | `#DDE1D6` → `#DFE4DD` | `#313631` (unchanged) |
| `--choice-unselected` | `#F1F3EE` → `#EAEFE8` | `#262B27` → `#313631` |
| `--choice-selected` | `#E4D3AE` → `#643F00` | `#643F00` → `#FFB956` |
| `--choice-edge` (new) | `#717971` | `#8A938B` |
| `--on-choice-selected` (new) | `#FFFFFF` | `#462B00` |
| Maximized side panel and phone graph background | `--md-sys-color-surface` / page → `--paper-raised` | same |
| `--card-lift-edge`, `--card-lift-glow` (new) | `#2178F5`, `#55A6FF` | `#2178F5`, `#55A6FF` |
| `--page-glow-1-color` / `-strength`, `--page-glow-2-color` / `-strength` (new; were literal in `tabs.css`) | `#3D5A46` 6%, `#E8A33D` 8% | same |
| `--header-*`, `--tab-bar-*`, `--tab-*` (new; header and Tab Bar levers) | the roles used before | same |
| `--header-glow-left-*`, `--header-glow-right-*` (new; header glows, 0% at, 40% size) | `#3D5A46` 12%, `#E8A33D` 12% | `#94D5A8` 10%, `#FFB956` 10% |
| `--icon-button-background` (new; Refresh, back arrow, phone vote bar icon buttons; was `--md-sys-color-secondary-container`) | `#D1E8D5` → `#C0D2C8` | `#374B3D` (unchanged) |
| `--poll-notes-background` (new; a card's notes and Read more; was `--md-sys-color-surface-container-low`, Read more 8% primary) | `#F1F3EE` → `#E0E0E0` | `#181D19` (unchanged) |
| `--header-search-background` → `--search-field-background` (now also the Search tab's field, which was `--md-sys-color-surface`) | `--md-sys-color-surface-container-high` | same |

Base palette: three entries were replaced here (darkslategray → saddlebrown, gray → olivedrab, coral → darkgoldenrod),
then restored to the reviewed original (TWEAK22); the creator's palette became the Yes and No colours followed by the
base palette (it had been a separate list of eighteen). Bar fills are now drawn at 3:1 on the card in Light
as well as Dark (before: Dark only, in the graph), text over a fill is black or white at 4.5:1, and tracks take the
palest tint that reaches 1.5:1.
