# Quickstart: Line Graph Material 3

**Feature**: `20261028-183546-LINE-GRAPH-M3` · **Date**: 2026-10-28

## Automated

```
npx tsc --noEmit
npx vitest run tests/client-line-colors.test.ts   # C1: every palette colour ≥ 3:1 on both surfaces, unchanged when it passes, same hue
npx vitest run tests/line-graph-ui.test.ts        # C2–C5: segments, tooltip flip, markers, keyboard, live region, touch, redraw
npx vitest run tests/m3-assets.test.ts            # C6: no literal colour or font size in line-graph-m3.css
npm test
```

Expected: all pass.

## By hand

Prerequisites: the development server (`devScripts/launch-dev.ps1`) and a poll with a year of history, e.g. from
`devScripts/populate/populate-poll.ts` with choices whose colours include black, dark red, blue and yellow
(manual) and an automatic grey.

1. **Light theme, 1400 px**: maximize the poll. The scale selector is one pill-shaped segmented button, the selected
   segment tinted green-grey with a check mark. Yellow is drawn as olive (`#999900`); every other line matches its bar.
2. Hover the plot near the right edge: the tooltip opens left of the crosshair and is wholly inside the plot; a ringed
   marker sits on every line. Move to the left edge: it opens to the right.
3. **Dark theme** (switch the OS appearance with the graph open): the graph redraws at once; black and dark grey are a
   mid grey, dark red a brighter red, blue lighter; the bars are unchanged.
4. **Keyboard**: Tab to the segmented button; Left/Right move between segments, Enter selects, no network request in
   DevTools. Tab to the plot: the crosshair appears at the newest point and a screen reader reads the time and shares;
   Left, Right, Home, End move it; Escape hides it.
5. **900 px and 375 px** (DevTools device mode, touch): tap the plot and lift — the tooltip stays; drag sideways — it
   follows; swipe up — the page scrolls; tap outside — it hides. The tooltip is never cut off.
6. Leave the graph open a minute with the crosshair shown from the keyboard: after the refresh it is still at the
   same time.
