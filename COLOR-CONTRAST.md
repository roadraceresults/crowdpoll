# Colour contrast

## Purpose and standard

How far every colour on the site stands from what it is drawn on, in the Light and the Dark scheme, and the
colours that never change. `tests/color-contrast.test.ts` reads the tables below and checks each row against the
colours `src/public/m3-tokens.css` sets, so a colour change that loses contrast fails a test named after the pair.

The standard is [WCAG 2.2](https://www.w3.org/TR/WCAG22/) level AA, measured with its
[contrast ratio](https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio):

- text at least 4.5:1 against what it sits on; a control's boundary, a selected state or a chart mark at least 3:1;
- house rules above that: 7:1 for text on a vote row, a selected row and a result bar's track; 4.5:1 for text over a
  bar's fill (black or white); 1.5:1 for a bar's track against the card; a card's border at least 1.5:1 and below
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

## Result colours

A result bar's colour is stored once (a creator's choice, Yes/No green and red, or the poll's palette entry) and is
never changed. `pollCard.js` derives what is drawn from it, once per colour and scheme, against the card colour
(`#FFFFFF` in Light, `#1C211D` in Dark):

- **Fill**: the stored colour if it already stands 3:1 from the card, else the nearest shade of its hue that does
  (darker on the light card, lighter on the dark one). The results graph draws its line for that choice in the same
  shade, so a bar and its line match; the graph is always drawn on the card colour.
- **Track**: the fill mixed into the card, as pale as it can be (at most 90% card in Light, 80% in Dark, in 5% steps)
  while still standing 1.5:1 from the card.
- **Text on the track**: a deep (Light) or pale (Dark) shade of the track's own hue at 7:1.
- **Text on the fill**: black or white, whichever contrasts more with the fill (never below 4.58:1); a colour listed
  in `TEXT_ON_FILL_OVERRIDES` keeps its chosen text colour only while that reaches 4.5:1.

Each row carries these as `--bar-fill`, `--bar-track`, `--bar-ink`, `--bar-ink-on-fill` and their `-dark` twins;
the stylesheet picks the scheme's set. The base palette is chosen so that, as drawn, no two of its fourteen colours are
closer than ΔE 13 ([CIE76](https://en.wikipedia.org/wiki/Color_difference#CIE76)) in either scheme.

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
   any Required pair: text never relies on them.
8. **The header and the Tab Bar** take their colours from their own tokens, set per scheme in `m3-tokens.css`:
   `--header-background`, `--header-divider`, `--header-text`, `--header-link`, `--header-button`,
   `--on-header-button`, `--header-search-background`; `--tab-bar-background`, `--tab-bar-divider`, `--tab-text`,
   `--tab-active-text`, `--tab-indicator`, `--tab-refresh-background`, `--tab-refresh-icon`. Each starts as the role it
   replaced (a `var()`), and must stay a `#RRGGBB` colour or a `var()` so the pairs above can be checked.

Green (`primary`) stays the brand: icons, links, buttons and the logo; it is never a selected-row colour, and no vote
row takes its choice's result colour.

## Change log

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

Base palette entries replaced (same positions): darkslategray `#404040` → saddlebrown `#8B4513`; gray `#7D7D7D` →
olivedrab `#6B8E23`; coral `#FC8E45` → darkgoldenrod `#B8860B`. Bar fills are now drawn at 3:1 on the card in Light
as well as Dark (before: Dark only, in the graph), text over a fill is black or white at 4.5:1, and tracks take the
palest tint that reaches 1.5:1.
