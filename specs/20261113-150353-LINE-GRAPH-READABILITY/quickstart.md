# Quickstart: Line Graph Readability

## Automated

```
npx tsc --noEmit
npx vitest run tests/line-graph-ui.test.ts tests/line-graph-many-lines.test.ts tests/m3-assets.test.ts
npm test
```

Expected: the readout, order, top-10, highlight and keep/clear rules of [contracts/ui.md](contracts/ui.md) U1–U6 pass;
no test refers to `.line-graph-tooltip`; the full suite stays green.

## Manual (dev server, PostgreSQL only)

Use a poll with 15 or more voted choices and the line graph on (for example one filled by `npm run populate-poll`).
Do every step at a 360 px wide viewport (browser device toolbar) and again at desktop width, in the light and the dark
scheme.

1. Maximize the poll. The legend lists the leading choices (10 at most; fewer when fewer reach 80% of the shares), highest share first; the row above it reads "Latest" and the vote
   total; a button reads "Show all 15 choices" (U2, U6).
2. Touch, or click, a time in the middle of the plot. The crosshair and a marker per drawn line appear; the row reads that time;
   the legend's percentages change. No box opens, and **the plot does not move** (U3, U7).
3. Drag across the plot. The legend follows; entries keep their places; nothing re-wraps or jumps. The legend is a table read down each column, in as few rows as fit; narrow the window and it takes more rows, down to one entry per row.
4. Tap a legend entry. Its line is thicker and in front, the rest are dimmed but still in their colors, and the time
   from step 2 is still selected (U4, U5).
5. Tap another entry: the highlight moves. Tap it again: the graph is back to normal.
6. Press "Show all 15 choices": 15 lines and entries; the button reads "Show top M choices", M being the number first shown. Highlight the last entry, then press
   it: the highlight is gone and the M plain lines are drawn (U5, U6).
7. Tap outside the graph: the row reads "Latest" again and the percentages are the latest shares.
8. Keyboard only: Tab to a legend entry, press Space (highlight), Escape (cleared); Tab to the plot, use Left, Right,
   Home, End, Escape. With a screen reader, the entry is announced as a button, pressed or not, and the plot reads the
   time and shares as before.
9. Wait for a refresh (or change the scale) with a highlight and "Show all" active: both stay. Close and reopen the
   maximized view: top 10, no highlight.
10. Nothing in the graph extends outside its card at 320 px, 360 px or desktop width; a very long choice label wraps
    inside the legend.
11. A poll with 3 lines: no button, the legend is the readout, no box.
12. Mouse, desktop width: point at a time without clicking, then move the pointer off the plot: the row reads
    "Latest" again. Click a time and move the pointer off the plot: the time stays; moving the mouse over the plot
    without a button held does not move it, and a drag or another click does (U4).
13. On an iPhone in Safari: repeat steps 2, 4 and 6. The time stays selected after tapping a legend entry and after
    tapping the show-all button (U4).
