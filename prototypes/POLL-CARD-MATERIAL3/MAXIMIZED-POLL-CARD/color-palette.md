# Color palette: bar fills from the single-card layout

The palette validated in the single-card layout research (`single-card.html`,
`RESULTS_PALETTE_ENTRIES`), with every entry now an xkcd colour-survey colour. It is not yet in
the CrowdPoll webapp: it goes there through the speckit workflow once the colours are accepted for
the webapp.

**How the palette was made:**
- **Order:** 50 entries, one per allowed choice, in bar order.
- **Entries 1–10:** xkcd colour-survey colours, chosen by name.
- **Entries 11–50, generated:** each was first generated as the entry ten before it made slightly
  lighter: the same hue and saturation, 7 points more HSL lightness.
- **Entries 11–50, snapped:** each generated colour was then replaced by its **nearest named xkcd
  colour**, by Euclidean distance in RGB (0–255 per channel). Where the nearest colour was already
  in the palette, the entry takes the nearest one not yet used, so no two bars share a colour.
- **`name`:** the survey's name for each hex value. The webapp reads `hex` alone.
- **Not included:** the Yes/No colours (`SEMANTIC_AFFIRMATIVE_COLOR`,
  `SEMANTIC_NEGATIVE_COLOR`), which the webapp already defines.

```js
const RESULTS_PALETTE_ENTRIES = [
  { hex: '#014182', name: 'darkish blue' },
  { hex: '#1F6357', name: 'dark green blue' },
  { hex: '#FCC006', name: 'marigold' },
  { hex: '#C45508', name: 'rust orange' },
  { hex: '#0203E2', name: 'pure blue' },
  { hex: '#000000', name: 'black' },
  { hex: '#DB4BDA', name: 'pink purple' },
  { hex: '#7F5F00', name: 'shit' },
  { hex: '#8B3103', name: 'rust brown' },
  { hex: '#929591', name: 'grey' },
  { hex: '#016795', name: 'peacock blue' },
  { hex: '#137E6D', name: 'blue green' },
  { hex: '#FEC615', name: 'golden yellow' },
  { hex: '#E17701', name: 'pumpkin' },
  { hex: '#0C06F7', name: 'strong blue' },
  { hex: '#070D0D', name: 'almost black' },
  { hex: '#F075E6', name: 'purply pink' },
  { hex: '#A87900', name: 'bronze' },
  { hex: '#A83C09', name: 'rust' },
  { hex: '#A8A495', name: 'greyish' },
  { hex: '#0485D1', name: 'cerulean' },
  { hex: '#3C9992', name: 'sea' },
  { hex: '#F4D054', name: 'maize' },
  { hex: '#F97306', name: 'orange' },
  { hex: '#3A2EFE', name: 'light royal blue' },
  { hex: '#1B2431', name: 'dark' },
  { hex: '#DD85D7', name: 'lavender pink' },
  { hex: '#C69C04', name: 'ocre' },
  { hex: '#DC4D01', name: 'deep orange' },
  { hex: '#C8ACA9', name: 'pinkish grey' },
  { hex: '#056EEE', name: 'cerulean blue' },
  { hex: '#42B395', name: 'greeny blue' },
  { hex: '#FDDE6C', name: 'pale gold' },
  { hex: '#F0833A', name: 'dusty orange' },
  { hex: '#6140EF', name: 'purpleish blue' },
  { hex: '#363737', name: 'dark grey' },
  { hex: '#D6B4FC', name: 'light violet' },
  { hex: '#FCB001', name: 'yellow orange' },
  { hex: '#FF5B00', name: 'bright orange' },
  { hex: '#C5C9C7', name: 'silver' },
  { hex: '#0D75F8', name: 'deep sky blue' },
  { hex: '#24BCA8', name: 'tealish' },
  { hex: '#FFF39A', name: 'dark cream' },
  { hex: '#FFA756', name: 'pale orange' },
  { hex: '#6A79F7', name: 'cornflower' },
  { hex: '#3C4142', name: 'charcoal grey' },
  { hex: '#EFC0FE', name: 'light lavendar' },
  { hex: '#FFC512', name: 'sunflower' },
  { hex: '#FB7D07', name: 'pumpkin orange' },
  { hex: '#D8DCD6', name: 'light grey' }
];
```

## Generated colour → nearest named colour

Distances are in RGB units, out of a possible 441.7 (black to white).

| # | Generated | Named | Name | Distance | Note |
|---|---|---|---|---|---|
| 11 | `#0153A5` | `#016795` | peacock blue | 25.6 |
| 12 | `#287E6F` | `#137E6D` | blue green | 21.1 |
| 13 | `#FCC929` | `#FEC615` | golden yellow | 20.3 |
| 14 | `#E66409` | `#E17701` | pumpkin | 21.2 |
| 15 | `#0B0CFD` | `#0C06F7` | strong blue | 8.5 |
| 16 | `#121212` | `#070D0D` | almost black | 13.1 |
| 17 | `#E169E0` | `#F075E6` | purply pink | 20.1 |
| 18 | `#A37A00` | `#A87900` | bronze | 5.1 |
| 19 | `#AE3D04` | `#A83C09` | rust | 7.9 |
| 20 | `#A4A7A3` | `#A8A495` | greyish | 14.9 |
| 21 | `#0165C8` | `#0485D1` | cerulean | 33.4 |
| 22 | `#319987` | `#3C9992` | sea | 15.6 |
| 23 | `#FCD24C` | `#F4D054` | maize | 11.5 |
| 24 | `#F6761D` | `#F97306` | orange | 23.4 |
| 25 | `#2E2FFD` | `#3A2EFE` | light royal blue | 12.1 |
| 26 | `#242424` | `#1B2431` | dark | 15.8 |
| 27 | `#E787E6` | `#DD85D7` | lavender pink | 18.1 |
| 28 | `#C79500` | `#C69C04` | ocre | 8.1 |
| 29 | `#D14905` | `#DC4D01` | deep orange | 12.4 |
| 30 | `#B6B8B5` | `#C8ACA9` | pinkish grey | 24.7 |
| 31 | `#0177EC` | `#056EEE` | cerulean blue | 10.0 |
| 32 | `#3AB49F` | `#42B395` | greeny blue | 12.8 |
| 33 | `#FDDB6F` | `#FDDE6C` | pale gold | 4.2 |
| 34 | `#F78B3F` | `#F0833A` | dusty orange | 11.7 |
| 35 | `#5152FD` | `#6140EF` | purpleish blue | 27.9 |
| 36 | `#363636` | `#363737` | dark grey | 1.4 |
| 37 | `#EDA5EC` | `#D6B4FC` | light violet | 31.8 |
| 38 | `#EBB000` | `#FCB001` | yellow orange | 17.0 |
| 39 | `#F45506` | `#FF5B00` | bright orange | 13.9 |
| 40 | `#C8C9C7` | `#C5C9C7` | silver | 3.0 |
| 41 | `#1389FE` | `#0D75F8` | deep sky blue | 21.7 |
| 42 | `#4CC5B1` | `#24BCA8` | tealish | 42.0 | nearest, greeny blue #42B395, already used
| 43 | `#FDE492` | `#FFF39A` | dark cream | 17.1 |
| 44 | `#F8A061` | `#FFA756` | pale orange | 14.8 |
| 45 | `#7475FD` | `#6A79F7` | cornflower | 12.3 |
| 46 | `#484848` | `#3C4142` | charcoal grey | 15.1 |
| 47 | `#F3C3F2` | `#EFC0FE` | light lavendar | 13.0 |
| 48 | `#FFC310` | `#FFC512` | sunflower | 2.8 |
| 49 | `#FA6B24` | `#FB7D07` | pumpkin orange | 34.1 | nearest, orange #F97306, already used
| 50 | `#DADBD9` | `#D8DCD6` | light grey | 3.7 |

**Things to check when validating:**
- **Hue changes:** RGB distance does not track what the eye sees. Three entries moved into a
  neighbouring hue family:
  - 30 (grey, two steps lighter) became `pinkish grey`;
  - 35 (pure blue, three steps lighter) became `purpleish blue`;
  - 37 (pink purple, three steps lighter) became `light violet`.
- **Uneven lightness:** snapping does not keep the even 7-point lightness steps, so a few columns
  get lighter unevenly (HSL lightness):
  - 42 `tealish` (0.44) is darker than 32 `greeny blue` (0.48);
  - 49 `pumpkin orange` (0.51) is barely lighter than 39 `bright orange` (0.50);
  - 12 `blue green` (0.28) is barely lighter than 2 `dark green blue` (0.25).
- **The single-card page:** `single-card.html` still carries the generated (unsnapped) values. To
  see these colours on the card, copy this array into it.
