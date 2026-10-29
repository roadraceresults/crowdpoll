Start a new spec for these requirements called `20261028-183546-LINE-GRAPH-M3`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

Update the line graph so that it adheres to Material 3 design guidelines and functionality.  
Also, colors that are consistend with the CrowdPoll webapp should be used, ensuring visual consistency across the platform.  


## Resolved Decisions

- **What "Material 3 design guidelines and functionality" means (AM1).**  
  Material 3 has no chart component, so each part of the graph follows the nearest Material 3 element, in its look and its behaviour:  
  the title and subtitle follow the typescale;  
  the scale selector is a single-select segmented button;  
  the hover tooltip is a rich tooltip;  
  the legend, axes and grid use Material 3 colour roles and type;  
  the lines and markers keep data colours;  
  every control has Material 3 state layers and the card's focus ring, and can be used from the keyboard.  
- **The scale selector (UA2).**  
  The scale selector is a Material 3 single-select segmented button: 40 px high, an `outline` border, full-pill ends, the selected segment in `secondary-container` with a check mark, `label-large` text.  
  It has state layers (`M3Ripple`) and the card's focus ring, Arrow keys move between segments, and it keeps `aria-pressed`.  
  It shows the available scales only, as today, and choosing one still sends no request.  
- **The hover tooltip (UA3).**  
  The tooltip is a Material 3 rich tooltip: `surface-container`, `--md-sys-elevation-2`, `corner-medium`, no border, 12 px × 16 px padding, the time in `title-small` and each choice's row in `body-medium`.  
  It is always kept inside the plot: near an edge it flips to the other side of the crosshair.  
- **Reading values without a pointer (UA5).**  
  The plot is one Tab stop with the card's focus ring.  
  Left and Right move the crosshair one bucket, Home and End move it to the ends, and Escape or leaving the plot hides it.  
  The tooltip's text is announced through a polite live region.  
- **How the feature is verified (UA6).**  
  The graph's stylesheet uses only Material 3 tokens, with no literal colour or font size, checked as `m3-assets.test.ts` checks the other sheets.  
  Every drawn line meets 3:1 contrast on both themes' surface, checked by a unit test over the automatic and manual palettes.  
  jsdom tests cover the segmented button, the tooltip and the keyboard.  
  A hand check is made in the light and dark themes at 1400, 900 and 375 px.  
- **Title, legend and axes (UA7).**  
  The title is `title-large` and the subtitle `body-medium`, from tokens only.  
  Legend entries are `label-large` with 12 px dots, the share in `on-surface-variant`.  
  The axes and grid stay as today, and the 0 % baseline is drawn in `outline`.  
- **Which colours are "consistent with the CrowdPoll webapp" (AM2).**  
  The graph's chrome (text, grid, axes, tooltip, controls) takes the app's Material 3 colour roles.  
  Each line keeps its bar's colour, the creator's manual colour when the choice has one, so the lines never disagree with the bars;  
  the only adjustment is the contrast shade below (UA1).  
- **Line colours too faint for a theme (UA1).**  
  In each theme, a line colour under 3:1 contrast on the graph's surface is drawn in the nearest shade of itself that reaches 3:1;  
  a colour already at 3:1 is drawn as it is.  
  The legend dots, the tooltip dots and the point markers use the same shade as the line.  
  This replaces the line-graph feature's "identical hexes in both themes" rule.  
- **Lines, markers and motion (UA4).**  
  Lines are 2 px with round joins and caps.  
  At the crosshair each line shows a 4 px-radius marker in the line's colour with a 2 px `surface` ring.  
  Nothing is animated: a scale change or a refresh redraws at once.  
- **The legend (NC1).**  
  The legend stays a static key and is only restyled;  
  a viewer cannot hide or show lines.  
