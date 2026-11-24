Start a new spec for these requirements called `20261120-175903-COLOR-CONTRAST`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

Here is some feedback from a tester:  
```
I feel like the color scheme is lacking a lot of contrast too for the different options in both light and dark mode, I feel like they're blending in too much to the background, and they're not really looking colorful.
```

Do some deep thinking about how to improve the color contrast and make the options more visually distinct in both light and dark modes.  

We want to keep the green shades. The icons that use dark green should remain.  
We want to keep the logo that uses green, red and black.  

We want to explore ways to increase the contrast for other elements without altering the core green shades, ensuring that all options are easily distinguishable in both light and dark modes.

We should also document the color contrast guidelines and any changes made, so that future updates to the interface maintain the desired level of visual distinction and accessibility.  



## Resolved Findings (2026-11-20 7:05 PM)

### Baseline and standard (RS1, RS2)

- The measured baseline is recorded in `requirements-report.md` §1 (WCAG contrast ratios per pair, both schemes).  
  The problem is the shapes, not the text: rows, tracks, dark-mode bar fills and card edges are fixed;  
  text pairs already pass and keep at least their current contrast.  
- WCAG 2.2 AA is the floor in both schemes: text 4.5:1 (large text 3:1);  
  3:1 for every option's boundary, every selected-state cue and every result-bar fill against the surface it sits on.  
  The existing 7:1 for text inside bars stays as a stricter house rule.  
  A selected state is never shown by colour alone (the radio dot or check mark stays).  

### Techniques (RS3)

All five levers are used, each held to the floor above, and recorded in the guideline:  
1. an `outline` border (3:1) on each option row, keeping light fills;  
2. a wider tonal step between page, card and rows;  
3. a more saturated selected state from the tertiary (amber) family, not green;  
4. in dark mode, every bar fill lifted to 3:1 against the surface;  
5. lower track tints, so a bar's extent shows and the card reads as colourful.  

### Scope of "options" (AM1)

- "Options" means the poll's choices first (vote rows and result bars), plus every selectable control whose boundary or selected state is shown by colour, on every page (home tabs, search filters, Settings radios and checkboxes, admin rows).  

### Frozen colours (AM2, AM3, AM4)

- Frozen in both schemes: `primary`, `on-primary`, `primary-container`, `on-primary-container`, `inverse-primary`, the Yes colour `#006120`, and `--moss` / `--moss-dark` wherever they are still used.  
  Every other token, including the greenish `secondary` and `surface` neutrals, may change.  
- Icons keep the `primary` token: dark green `#2C6A46` in light mode, the existing light green `#94D5A8` in dark mode.  
- The logo keeps its green, red and black artwork in light mode, and today's dark-mode substitution (black drawn as `on-surface`, white parts transparent);  
  its green and red never change.  

### Vote rows (UA1)

- Each vote row gets a 1 px `outline` border (≥ 3:1 against the card) and a slightly deeper neutral fill.  
- A selected row gets a saturated accent fill and a 2 px border, with the existing radio dot or check mark, all ≥ 3:1 from an unselected row.  
- Compact rows keep a 1 px border.  

### Result bars (UA2, UA3)

- In dark mode each fill (palette, Yes/No and manual) is lifted to ≥ 3:1 against the dark card with the line graph's lightness walk (`lineColorOn`);  
  its track and inks are derived from the lifted colour as today.  
- Track tints are lowered so every track is at least 1.5:1 against the card in both schemes, while the ink on it keeps 7:1;  
  the tint values are recorded in the guideline.  

### Cards and page (UA4)

- A clearer tonal step: the page one or two surface tones darker (light) or the card one or two tones lighter (dark);  
  the card border at least 1.5:1 against both card and page, with no card border at 3:1.  

### Guideline and its guardrail (UA5)

- A new `COLOR-CONTRAST.md` at the project root holds: the frozen colours;  
  every required pair with its minimum ratio in both schemes;  
  the techniques above;  
  and a change log of this feature's before → after values.  
- `CLAUDE.md` gets a one-line invariant pointing to it.  
- `tests/color-contrast.test.ts` reads the tokens from the stylesheets and checks every listed pair and every frozen value, so `npm test` fails when a later change breaks one.  

### Success (UA6)

- Every pair in the guideline meets its minimum in both schemes (automated);  
- the frozen colours are unchanged (automated);  
- the same tester, shown the home grid, a maximized poll in vote and results mode, and Settings, in both schemes, agrees the options stand out.  

### Colour on the voting face (NC1)

- The voting face stays neutral, with the stronger contrast of the vote rows above;  
  its selected state uses a saturated amber (`tertiary` family) fill, never green.  
- The results face carries the colour, with the deeper tracks above.  
- Vote rows are not tinted with their choice's results colour, so no colour (including Yes/No green and red) hints at a result before voting.  

### Refined during specification analysis (2026-11-20)

- Text over a result bar's fill is black or white at ≥ 4.5:1; the 7:1 house rule holds for text on a bar's track and on vote rows  
  (7:1 on a fill that is also 3:1 from a white card is impossible for mid-tone colours).  
- Three palette entries are replaced so no two colours look alike after the 3:1 lift:  
  coral `#FC8E45` → darkgoldenrod `#B8860B`, darkslategray `#404040` → saddlebrown `#8B4513`, gray `#7D7D7D` → olivedrab `#6B8E23`.  
