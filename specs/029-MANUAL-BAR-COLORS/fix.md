# Overview: `specs/029-MANUAL-BAR-COLORS`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/029-MANUAL-BAR-COLORS` |
| Fix file created | 2026-10-09 08:13 |
| Last updated | 2026-10-11 03:18 |

Legend: `[ ]` open · `[X]` resolved · `[-]` resolved manually (or accepted as-is) by the developer.
Tick `No Tests` to postpone this fix's automated tests; leave it empty to have them written and run as usual.

"What's next" always returns the first `[ ]` item below.

The developer is expected to create the individual fix requirements in this file, and then run the `/speckit-fix` command to have the AI implement them, one at a time.  
Each fix requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Fixes

## FIX01 <short title here>
[X] Resolved
[X] No Tests

When doing manual testing we found that the after setting the colors for a Poll,  
the Trending and Newest tabs did not reflect the updated colors.  
Even after a couple hours, and after clicking the refresh icon.  
The "Your Polls" tab DID show the new colors.  

See screenshot image below for reference.  

![Screenshot](dontTrack/bar-colors-newest-trending.jpg)

We didn't try refreshing using the browser Refresh, and we didn't try restarting the server in case there are any diagnostics we need to do in this state.

### RESOLUTION

Option B. The cards object of Trending and Newest was republished, and refetched by the browser, only when the set of poll ids changed, so a content change (a color, a title) never reached the tabs. Added `cardsVersion`, a hash of the sorted `pid:contentVersion` lines, beside the unchanged `membershipVersion`:
- `src/trending/recompute.ts`: `cardsVersionOf`, and `cardsVersion` on the counts object, the cards object and `TrendingListing`.
- `src/trending/publish.ts`: the cards object is uploaded when `cardsVersion` changes.
- `src/public/trending.js`, `src/public/newest.js`: refetch the cards when the counts object's `cardsVersion` differs from the held cards object's (an object without one behaves as before).
- Tests written, not run (No Tests): a publisher case in `tests/trending.test.ts` and a Trending and a Newest refresh case in `tests/client-home.test.ts`. `tsc --noEmit` is clean; the suites are unverified by a run.
- Artifacts: `postman/openapi.json` (`TrendingCounts`, `TrendingCards`), `ARCHITECTURE.md`, `CLAUDE.md`, and `tasks.md` (T043).
- A color change now shows on these tabs within one recompute plus the CDN `max-age` (about two minutes by default). The CDN copy published before this fix is stale until the next upload; the first recompute after the server restarts uploads the cards again.
2026-10-09 08:38

## FIX02 Summary Text For Colors
[X] Resolved
[X] No Tests

When doing manual testing we realized that we didn't specify an addition to the Summary Text for the Colors setting.  

## New requirement
On the Admin Poll Card, the summary text for the Colors setting will be:
1. When one or more colors are set manually, the summary text will read,   
"N color(s) have been set manually: [ ] [ ]. "

2. When no colors have been set, the summary text will read, "Bar colors are assigned automatically."    

This text will be rendered after the "Voters choose from" sentence, on the next line with no blank line between them.

### RESOLUTION

Option A. Added the Settings Summary's line for colors in `src/public/adminCard.js` (`buildColorsSummaryLine`, called from `buildSummary` after the choices line, once Step 4 is answered). With no manual color it reads "Bar colors are assigned automatically."; otherwise "1 color has been set manually: ●." or "N colors have been set manually: ● ●.", with a 24 dp swatch per colored choice named "<choice>: <color name>". The sentence is a Summary part for Step 4, so it opens the wizard like the other parts do wherever colors can change. `refreshSummaryLine`'s ordering pattern knows the new line. The swatch rule is in `src/public/admin-card-m3.css`.
- Tests written, not run (No Tests), in `tests/client-admin-wizard.test.ts`: three cases for the line, and the two link lists of the "links only what the poll's state lets change" test now include the new link. `tsc --noEmit` is clean.
- Artifacts: `spec.md` (FR-021, and the scope limit no longer excludes the Summary), `tasks.md` (T044), `README.md`, `ARCHITECTURE.md`. The high-level requirements document in `designDocs/` still lists the Settings Summary as unchanged and may need the same change; I did not edit it.
2026-10-09 09:48

## FIX03 New Mewthod Of Filling AUTOMATED PALETTE ENTRIES
[X] Resolved
[ ] No Tests

In the previous update of the AUTOMATED_PALETTE_ENTRIES, we accidentally incluyded only 49 colors.  
As a result, a test failed.  
We are now going to change the requirement so that the AUTOMATED_PALETTE_ENTRIES is expanded by taking the array that is in the code and  
repeating it until the desired number of colors is reached.  
This will allow the AUTOMATED_PALETTE_ENTRIES to always have enough colors for the tests to pass, regardless of how many colors are needed.  
Also, if the max number of bars is changed the AUTOMATED_PALETTE_ENTRIES will automatically expand to accommodate the new requirement.  

Of course, this means that the array of AUTOMATED_PALETTE_ENTRIES will contain repeated colors once it reaches the end of the original list.  
That is okay, as long as duplicate colors are not consecutive.  

Please update the code to fulfill this new requirement.

The starting array of AUTOMATED_PALETTE_ENTRIES will include the following 14 colors:

  { hex: '#880015', name: 'darkred' },
  { hex: '#C8468B', name: 'palevioletred' },
  { hex: '#0808FD', name: 'blue' },
  { hex: '#1A539E', name: 'darkslateblue' },
  { hex: '#0695F5', name: 'dodgerblue' },
  { hex: '#000000', name: 'black' },
  { hex: '#404040', name: 'darkslategray' },
  { hex: '#7D7D7D', name: 'gray' },
  { hex: '#800080', name: 'purple' },
  { hex: '#B045B0', name: 'darkorchid' },
  { hex: '#FF6601', name: 'orangered' },
  { hex: '#FC8E45', name: 'coral' },
  { hex: '#007A7E', name: 'teal' },
  { hex: '#399FA2', name: 'lightseagreen' },

### RESOLUTION

Option B, with the seam rule you described. `RESULTS_PALETTE_ENTRIES` in `src/public/pollCard.js` is now the 14-color base list. A new `expandPalette(base, count)` repeats it until it has `count` entries, and adds one more only when the last would equal the first, so no neighbors repeat, the wrap included. For 50 choices the result is your 50-entry list, ending in gray before darkred.
- Each card builds its palette from `opts.choiceBounds.maxChoices` (`ENV_MAX_CHOICES`), so raising the limit grows the palette. `paletteOffsetFor(pid, length)` and `assignResultColors(data, offset, palette)` take it; with no argument they use a 50-entry default, so the existing callers and tests still work. `renderPollResults` passes the palette through.
- `designdocs/pollUserInterface/poll-card.js` got the same base list and function.
- Tests: `tests/client-bar-colours.test.ts` builds the expected palette with an independent copy of the rule and checks no equal neighbors; `tests/poll-card-assets.test.ts` extracts `expandPalette` and checks it for 50, 60 and the counts just above whole copies. Not run: Vitest cannot start in this sandbox. `tsc --noEmit` is clean, and running `expandPalette` directly gave no repeated neighbors for counts 2, 14, 15, 29, 50, 60 and 200.
- Artifacts: `tasks.md` (T045), `data-model.md`, `ARCHITECTURE.md`, `CLAUDE.md`. The 022 documents still describe 50 xkcd colors and were left as history. The white-on-`#F0003C` check (4.40:1) is unchanged by this fix.
2026-10-10 16:13

## FIX04 Test Errors
[X] Resolved
[ ] No Tests

Here are the text errors encountered during `npm run test`:

 FAIL  tests/client-admin-wizard.test.ts > the Settings Summary's line for colors > counts the colors set by hand, one swatch each, with singular and plural wording
AssertionError: expected [ 'Cakes: red', 'Cookies: blue' ] to deeply equal [ 'Cakes: red', 'Cookies: Blue' ]

- Expected
+ Received

  [
    "Cakes: red",
-   "Cookies: Blue",
+   "Cookies: blue",
  ]

 ❯ tests/client-admin-wizard.test.ts:869:50
    867|     line = colorsLine(wizardCard(p))!;
    868|     expect(line.textContent).toBe("2 colors have been set manually:  .");
    869|     expect(swatchesIn(line).map((s) => s.title)).toEqual(["Cakes: red", "Cookies: Blue"]);
       |                                                  ^
    870|   });
    871| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/5]⎯

 FAIL  tests/client-bar-colours.test.ts > bar colours and text on every card > derives a stable start from the poll id
AssertionError: expected 9 to be greater than or equal to 10
 ❯ tests/client-bar-colours.test.ts:135:59
    133|     expect(uses.every((n) => n > 0)).toBe(true);
    134|     expect(Math.max(...uses)).toBeLessThanOrEqual(50);
    135|     expect(new Set(ids.slice(0, 20).map(offsetFor)).size).toBeGreaterThanOrEqual(10);
       |                                                           ^
    136|     for (const missing of [undefined, "", 42]) expect(offsetFor(missing)).toBe(0);
    137|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/5]⎯

 FAIL  tests/client-home.test.ts > a bar's percentage > is the share of selections on a multiple-choice poll, so the bars add up to 100
AssertionError: expected [ '67%', '67%', '33%', '33%' ] to deeply equal [ '67%', '33%' ]

- Expected
+ Received

  [
    "67%",
+   "67%",
+   "33%",
    "33%",
  ]

 ❯ tests/client-home.test.ts:259:27
    257|     await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    258|     page = await openPage(ctx, "index.html");
    259|     expect(percentages()).toEqual(["67%", "33%"]);
       |                           ^
    260|   });
    261| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/5]⎯

 FAIL  tests/client-home.test.ts > a bar's percentage > stays the share of voters on a single-choice poll
AssertionError: expected [ '67%', '67%', '33%', '33%' ] to deeply equal [ '67%', '33%' ]

- Expected
+ Received

  [
    "67%",
+   "67%",
+   "33%",
    "33%",
  ]

 ❯ tests/client-home.test.ts:270:27
    268|     await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    269|     page = await openPage(ctx, "index.html");
    270|     expect(percentages()).toEqual(["67%", "33%"]);
       |                           ^
    271|   });
    272| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/5]⎯

 FAIL  tests/polls-colors.test.ts > publish with colors > stores the colors beside the labels of a poll that has no votes
AssertionError: expected 400 to be 200 // Object.is equality

- Expected
+ Received

- 200
+ 400

 ❯ tests/polls-colors.test.ts:107:24
    105|     const poll = await draft();
    106|     const res = await publish(poll._id, { clientGuid: "tab-1", title: "Parties", labels: ["Republican", "Democratic"], colors: ["#F91010", "#0000ff"] });
    107|     expect(res.status).toBe(200);
       |                        ^
    108|     expect(res.body.pollState).toBe("AWAITING APPROVAL");
    109|     expect((await storedChoices(poll._id)).map((c) => [c.label, c.color])).toEqual([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/5]⎯


 Test Files  4 failed | 67 passed (71)
      Tests  5 failed | 1141 passed (1146)
   Start at  21:42:14
   Duration  494.48s (transform 673ms, setup 0ms, collect 35.21s, tests 447.19s, environment 6ms, prepare 2.62s)

### RESOLUTION

All five failures were out-of-date tests; no product code changed.
- `tests/client-admin-wizard.test.ts`: the expected swatch title is `Cookies: blue` (the palette name is lowercase).
- `tests/polls-colors.test.ts`: the publish request sends `#0808fd`, a palette color; the test still expects the stored `#0808FD`.
- `tests/client-bar-colours.test.ts`: `.map((id) => offsetFor(id))`, because `map` passed its index as the palette length.
- `tests/client-home.test.ts`: `percentages()` skips the `.result-pct` copies inside `.result-ink-on-fill`.
- Not run: Vitest cannot start in this sandbox, so `npm test` is yours to run. `tsc --noEmit` is clean.
2026-10-11 03:18
