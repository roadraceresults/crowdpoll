# Overview: `specs/20261120-175903-COLOR-CONTRAST`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261120-175903-COLOR-CONTRAST` |
| Tweak file created | 2026-11-21 01:05 |
| Last updated | 2026-11-23 04:29 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Snapshot Each Tweak For Comparison  
[X] Resolved  

**Trial and Error with no intermediate tests**  
This feature is going to require many iterating through many tweaks of trial-and-error with color adjustments and may even redesigning soem UI controls and placement.  
As we do this T&E process will postpone the tests until we deem the feature complete.  
There is no point runn ing tests on something that may change.  
Lately, the time spent on tests is growing significantly.  
Before running any tests, asks the developer. We will soon put this principal in the constitution.md file.  

----------------------------------------

To help with comparing the appearance of TweakN with the previous TweakN-1,  
implement a way to select a Tweak by number (n) so that the developer can easily switch between different iterations for comparison.  
It can be done with switches in the code, but that cold get confusing.  
Or it could be done using commits to record a specific Tweak iteration.  
In this case the commits could be pushed to a remote repository, allowing the agent to easily switch between different Tweak iterations by checking out the corresponding commit that the developer has requrested.  
But those are just ideas we had.  
It is definitely better if you pursue whichever method you feel is the best overall.  

Before we start the iterating, we can record the current state as TWEAK01. It is the result of the /speckit-implement skill applied to the current feature state.  

### RECOMMENDATION

Record each iteration as a git commit with a tag, and look at any two side by side in two local servers.  
No switches in the code.  

- **`devScripts/tweak.ps1 save <n>`**: commits the whole working tree on `color-scheme` as `TWEAK<nn>: <title>` and tags it `color-contrast-TWEAK<nn>` (local tag; pushing is left to the developer).  
- **`devScripts/tweak.ps1 show <n> [-Port 8081]`**: checks the tag out into its own worktree `C:\crowdPoll\color-scheme-TWEAK<nn>` (detached, read-only use), links `node_modules` to this one, copies the local `launch-dev.ps1` with the port changed, and starts that copy.  
  The current iteration keeps running on 8080 and the chosen one opens on 8081, against the same development database.  
  The sign-in cookie is per host, not per port, so both are signed in.  
- **`devScripts/tweak.ps1 list`** and **`stop <n>`**: list the saved iterations; remove a worktree when done.  
- `.gitignore` gains `!devScripts/tweak.ps1`.  
- TWEAK01 is recorded with `save 1` once this tweak is applied: the state `/speckit-implement` delivered, plus this script.  

Tests: none; a dev script for the developer's eyes has nothing the suite observes, and the tweak asks that no test run without asking.  
Artifacts: `quickstart.md` gains a short "Comparing tweak iterations" section;  
no spec, plan or task change, since nothing the site does changes.  

2026-11-22 00:13

### ACCEPTED RECOMMENDATION

- `devScripts/tweak.ps1` (new): `save <n> "<title>"`, `list`, `show <n> [-Port 8081]`, `stop <n>`, as recommended;  
  tags are `color-contrast-TWEAK<nn>` (`-Prefix` changes it for a later feature).  
- `.gitignore`: `!devScripts/tweak.ps1`.  
- `quickstart.md`: new section "Comparing tweak iterations".  
- TWEAK01 recorded: one commit of the state `/speckit-implement` delivered plus this script, tagged `color-contrast-TWEAK01`.  
  Nothing was pushed.  

Tests: none written, since a developer script has nothing the suite observes;  
none run, as this tweak asks (no `Run Tests` line).  
The script was checked by the PowerShell parser (0 errors) and `list` ran;  
`show` and `stop` are unverified until first used.  
This tweak had no resolution checkbox line, so `[X] Resolved` was added under its heading.  

2026-11-22 00:14

## TWEAK02 Card Lifts On Hover And Touch  
[X] Resolved  
[ ] Run Tests  

To help Poll Card visibility and contrast, there will be an animation that makes it appear the card is elevating slightly, with a handler for:  

Desktop	 
- Mouse enters card → card elevates slightly	    
- Mouse leaves card → card returns to normal

Mobile
- Finger touches card → card elevates slightly
- Finger releases → card returns to normal

### RECOMMENDATION

Lift a grid card (never the maximized one) with one class, set by pointer handlers in `initPollCard` (`src/public/pollCard.js`):  

- a mouse: `pointerenter` adds `is-lifted` to the card's `.card-viewport`, `pointerleave` removes it;  
- a finger or pen: `pointerdown` adds it, `pointerup` and `pointercancel` remove it, so a card the finger starts scrolling drops back at once.  

`src/public/pollCard-m3.css`:  

- `.card-viewport:not(.maximized-card-viewport).is-lifted{ top:-4px; }` (the viewport is already `position:relative`;  
  `top` rather than a transform, so nothing inside the card gets a new containing block);  
- its faces take `box-shadow:var(--md-sys-elevation-3)`;  
  in Dark, where a shadow does not show on the near-black page, the face's border also takes `--md-sys-color-outline`;  
- `transition:top 0.15s ease, box-shadow 0.15s ease`, none under `prefers-reduced-motion: reduce` (the lift itself stays).  

Tests (written, not run): in `tests/client-maximized.test.ts`, a grid card gains `is-lifted` on a mouse `pointerenter` and loses it on `pointerleave`;  
gains it on a touch `pointerdown` and loses it on `pointerup` and on `pointercancel`;  
a maximized card never gains it.  
Artifacts: `COLOR-CONTRAST.md` Techniques gains "a lifted card on hover or touch";  
`tasks.md` gains a Polish task for this tweak.  

2026-11-22 01:54


### ACCEPTED RECOMMENDATION

Applied as recommended.  

- `src/public/pollCard.js` (`initPollCard`, "Lift"): pointer handlers toggle `is-lifted` on the card's `.card-viewport`;  
  a mouse lifts it on enter and drops it on leave;  
  a finger or pen lifts it on press and drops it on release or cancel;  
  a maximized card never lifts.  
- `src/public/pollCard-m3.css` (end of file): `top:-4px`, `box-shadow:var(--md-sys-elevation-3)`, the `outline` border in Dark, 0.15s transitions, none under reduced motion.  
- `tests/client-maximized.test.ts`: new block "a grid card lifts while pointed at or pressed", 4 tests (mouse, touch with release and cancel, maximized card, the CSS rules).  
  Tests postponed (Run Tests not ticked);  
  the 4 tests were written and not run, so the tweak is unverified by a run.  
  `npx tsc --noEmit` passes.  
- Artifacts: `COLOR-CONTRAST.md` Techniques item 6;  
  `tasks.md` T038 added.  

2026-11-22 01:55

## TWEAK03 Blue Border Grows With A Glow  
[X] Resolved  
[ ] Run Tests  
As a followup to TWEAK03, 
add the animation that is implemented in the file "specs\20261120-175903-COLOR-CONTRAST\poll-card-hover-demo-full-border-grow.html".
On a Poll Card it is a blue border that grows up to 4 pixkels and the line has a "glow". 

### RECOMMENDATION

Read as a follow-up to TWEAK02 (the lift), since this is TWEAK03.  
Play the demo's border animation whenever a grid card is lifted (`is-lifted`, so mouse and touch alike), on top of the 4 px lift.  

- `src/public/m3-tokens.css`: two new aliases in both scheme blocks, `--card-lift-edge:#2178F5` and `--card-lift-glow:#55A6FF` (the demo's blues);  
  `#2178F5` is 4.1:1 on the Light card and 4.0:1 on the Dark one.  
- `src/public/pollCard-m3.css`: a `::after` on each `.card-face` (the faces are already transformed, so it is placed on the face and turns with it), `inset:-1px` over the card's own border, `border-radius:20px`, no pointer events;  
  on a lifted card it runs `cardEdgeGrow` 1.1s ease-out once: the edge goes from 1 px to 4 px by 70%, holds, and fades by 100%, with a `--card-lift-glow` box-shadow growing from 4 px to 12 px blur and fading with it, as in the demo;  
  under reduced motion, no animation: a steady 4 px edge with a faint glow while lifted.  
- The demo uses an SVG rectangle resized by script;  
  a pseudo-element with a border and a box-shadow draws the same rounded edge with no script or resize observer.  
- All cards animate, open or closed (the demo animates only open ones), as all cards lift in TWEAK02.  

Tests (written, not run): `tests/client-maximized.test.ts` checks the `::after` rule, the keyframes' 1 px and 4 px widths and the reduced-motion rule;  
`COLOR-CONTRAST.md` gains the Required pair `--card-lift-edge` on `--paper-raised` ≥ 3 in both schemes, which `tests/color-contrast.test.ts` then checks.  
Artifacts: `COLOR-CONTRAST.md` Techniques item 6 and its Change log;  
`tasks.md` T039.  

2026-11-22 02:41



### ACCEPTED RECOMMENDATION

Applied as recommended.  

- `src/public/m3-tokens.css`: `--card-lift-edge:#2178F5` and `--card-lift-glow:#55A6FF` in the Light and Dark alias blocks.  
- `src/public/pollCard-m3.css` (end of file): `.card-viewport .card-face::after` and `@keyframes cardEdgeGrow` (1 px → 4 px by 70%, held, faded by 100%, with a glow growing to 12 px);  
  it runs once each time a grid card lifts;  
  under reduced motion, a steady 4 px edge and faint glow while lifted.  
- `tests/client-maximized.test.ts`: new block "a lifted card's edge grows with a glow", 3 tests.  
  `COLOR-CONTRAST.md`: new Required pair `--card-lift-edge` on `--paper-raised` ≥ 3, both schemes, which adds 2 checks to `tests/color-contrast.test.ts`.  
  Tests postponed (Run Tests not ticked);  
  all were written and not run, so the tweak is unverified by a run.  
  `npx tsc --noEmit` passes.  
- Artifacts: `COLOR-CONTRAST.md` (Required pair, Techniques item 6, Change log row);  
  `tasks.md` T039 added.  

2026-11-22 02:42

## TWEAK04 Border Steps Down After Growing  
[X] Resolved  
[ ] Run Tests  
This new HTML file:
"specs\20261120-175903-COLOR-CONTRAST\poll-card-hover-demo-step-down.html"  
has an update where the line thickness goes from 4,3,2,1,0 after it reaches the max width of 4.

### RECOMMENDATION

Take the new demo's timing and keyframes into `cardEdgeGrow` (`src/public/pollCard-m3.css`), replacing TWEAK03's:  

- 1.5s `ease-in-out` (was 1.1s `ease-out`);  
- the edge grows from 1 px to 4 px by 40%, holds to 55%, then steps to 3 px (55%–69%), 2 px (69%–83%) and 1 px (83%–97%), and disappears by 100%;  
- the glow follows the steps: 12 px at 50% strength, then 10 px at 42%, 7 px at 32% and 4 px at 18%, and fades with the edge.  

The steps are hard (each width starts at the demo's `.01%` keyframe), as in the demo.  
Reduced motion is unchanged: a steady 4 px edge while lifted.  

Tests (written, not run): `tests/client-maximized.test.ts`, the keyframe test now expects 1.5s `ease-in-out`, 4 px at 40% and 55%, 3 px at 55.01%, 2 px at 69.01%, 1 px at 83.01% and `opacity:0` at 100%.  
Artifacts: `COLOR-CONTRAST.md` Techniques item 6 (the steps);  
`tasks.md` T040.  

2026-11-22 02:48


### ACCEPTED RECOMMENDATION

Applied as recommended.  

- `src/public/pollCard-m3.css`: `cardEdgeGrow` now runs 1.5s `ease-in-out`;  
  4 px at 40%–55%, then hard steps to 3 px, 2 px and 1 px, gone at 100%;  
  the glow steps down with it (12/10/7/4 px at 50/42/32/18%).  
  Reduced motion unchanged.  
- `tests/client-maximized.test.ts`: the keyframe test now expects 1.5s `ease-in-out` and the 4, 3, 2 and 1 px steps.  
  Tests postponed (Run Tests not ticked);  
  the updated test was not run, so the tweak is unverified by a run.  
  `npx tsc --noEmit` passes.  
- Artifacts: `COLOR-CONTRAST.md` Techniques item 6;  
  `tasks.md` T040 added.  

2026-11-22 02:49

## TWEAK05 Closed Poll Card Comes Into View And Lifts  
[X] Resolved  
[ ] Run Tests  
When a Poll is in Maximized view and the user clicks  
and button or icon that brings htme back to a Home Page tab that has the the same Poll on it,  
the card will be scrolled into view and the Poll Card animation will play for that Poll.


### RECOMMENDATION

- **Recommendation**: when a maximized poll goes back to its tab's grid, bring its card into view and replay the lift.  
  - Which closes: every one that returns to the same tab, all through `restore` in `src/public/tabs.js`: the card's Minimize icon, the back arrow, Escape, the browser's Back, and choosing the tab that is already showing.  
    Choosing a different tab is not included: that tab's grid loads its own list later, and the card there is another card.  
  - Into view: after the page goes back to where it was, the card is scrolled only as far as needed to show it whole (`scrollIntoView({ block: "nearest" })`), below the fixed header and tab bar (`scroll-margin-top` on `.card-viewport` in `src/public/pollCard-m3.css`).  
    It matters most for a linked or kept card, which returns first in the grid, away from where the page was.  
  - The animation: a new `replayLift()` on the card (`src/public/pollCard.js`) lifts it and restarts the blue edge, then drops it after 1.5 s, when the edge has gone, unless a mouse is over it.  
    Under reduced motion the card lifts with its steady 4 px edge for those 1.5 s.  
  - Tests in `tests/client-maximized.test.ts`: the Minimize icon and the back arrow each bring the card into view and lift it, it drops after 1.5 s, and choosing another tab does neither; written, not run.  
  - Artifacts: `COLOR-CONTRAST.md` Techniques item 6 and `tasks.md` T041.  

### ACCEPTED RECOMMENDATION

Accepted automatically 2026-11-22 09:25 (the only recommendation).  

- `src/public/pollCard.js`: `replayLift()` lifts the card and restarts its edge, then drops it after 1.5 s unless a mouse is over it;
  it is on the card's API.  
- `src/public/tabs.js`: `restore`, when the card returns to its own tab's grid, calls `revealCard` (`scrollIntoView({ block: "nearest" })`) and `replayLift()` before focusing the card;
  a quiet close (another tab chosen, a sign-in change) does neither.  
- `src/public/pollCard-m3.css`: `.card-viewport` takes `scroll-margin-top:calc(var(--fixed-chrome-height, 0px) + 8px)`, so a revealed card sits below the fixed header.  
- `tests/client-maximized.test.ts`: new describe "a card closed from the maximized view comes into view and lifts", 5 tests;
  written, not run (Run Tests not ticked); `npx tsc --noEmit` passes.  
- `COLOR-CONTRAST.md` Techniques item 6 and `tasks.md` T041 updated.  

## TWEAK06 Describe The Background Gradient  
[X] Resolved  
[ ] Run Tests  
Please describe the gradient that is used on the background of the site from left to right edge.  
What variables do we have to work with for customizing the gradient?  


### RECOMMENDATION

The background is not a left-to-right gradient.  
It is the flat page colour `--paper` with two faint radial glows over it, drawn by `.page-decor` (`src/public/tabs.css` lines 33–38; a copy for the card demo page is in `src/public/pollCard.css`).  
`.page-decor` is `position:fixed`, so the glows stay put while the page scrolls.  

- **Glow 1, top left**: `radial-gradient(600px 400px at 12% 8%, rgba(61,90,70,0.06), transparent 60%)`.  
  - Moss green `#3D5A46` at 6% opacity, centred 12% from the left edge and 8% from the top.  
  - It fades to nothing 360 px to each side of that centre and 240 px above and below it.  
- **Glow 2, bottom right**: `radial-gradient(500px 380px at 90% 95%, rgba(232,163,61,0.08), transparent 60%)`.  
  - Amber `#E8A33D` at 8% opacity, centred 90% from the left edge and 95% from the top.  
  - It fades to nothing 300 px to each side and 228 px above and below.  
- **Left to right**: a faint green tint near the top left, plain `--paper` across the middle, and a faint amber tint near the bottom right.  
  The fixed header and tab bar are painted flat `--paper` (`header-fixed-m3.css`), so they cover the top of the green glow.  
- **Dark**: the same two rules apply; on the near-black `--paper` (`#0A0E0B`) at 6% and 8% they are close to invisible.  

**Variables to work with**:  
only `--paper`, the base colour, set per scheme in the alias blocks of `src/public/m3-tokens.css` (`#E5EAE2` Light, `#0A0E0B` Dark).  
The glows' colours, strengths, sizes and positions are literal values; there are no custom properties for them.  

- **Recommendation**: leave the code as it is; this tweak is a question, answered above.  
  To make the gradient adjustable, add a tweak asking for it.  
  For example, give it variables such as `--page-glow-1`, `--page-glow-2` and their strengths, set per scheme in `m3-tokens.css`.  

### ACCEPTED RECOMMENDATION

Accepted by "Tweak" 2026-11-22 10:50.  
Taken as the variables the recommendation offered, rather than leaving the code as it is, since "Tweak" asks for an implementation.  
Today's values are kept, so the page looks the same.  

- `src/public/m3-tokens.css`:
  - in both alias blocks, 
`--page-glow-1-color:#3D5A46`
`--page-glow-1-strength:6%`
`--page-glow-2-color:#E8A33D`
`--page-glow-2-strength:8%`
    change these per scheme;  
  
  - in a shared `:root`, 
`--page-glow-1-size:600px 400px`
`--page-glow-1-at:12% 8%`
`--page-glow-2-size:500px 380px`
`--page-glow-2-at:90% 95%`

  - `:root .page-decor` 
  draws the two radial gradients from them 
  (`color-mix` for the strength).  

It needs `:root` to beat the legacy 
`.page-decor` in `tabs.css`, 
which loads after 
`m3-tokens.css` 
and is left unedited.  

- `tests/m3-assets.test.ts`: 
one test for the tokens in both schemes and the rule;
written, not run (Run Tests not ticked); `npx tsc --noEmit` passes.  

- `COLOR-CONTRAST.md`: Techniques item 7 and a Change log row; `tasks.md` T042.  

## TWEAK07 Header And Tab Bar Colour Levers  
[X] Resolved  
[ ] Run Tests  
We are using the implementation from TWEAK06 to experiment with the background. 
Thanks
Can you offer similar "buttons a levers" to experiment wiith the colors in the header of the Home page, including the Tab Bar?


### RECOMMENDATION

- **Recommendation**: give the header and the Tab Bar their own colour tokens, the same way TWEAK06 did for the background.  
  - Each token is set in both alias blocks of `src/public/m3-tokens.css`, 
  so Light and Dark can be tuned apart.  
    Each starts as today's colour (a `var()` to the role it uses now), so nothing changes until a value is edited.  
  - Header: 
`--header-background`, 
`--header-divider` (the line under the header on pages without a Tab Bar), 
`--header-text` (search icon, typed search text, the user's name), 
`--header-link` (the nav link and the outlined button), 
`--header-button` / `--on-header-button` (the filled button) and 
`--header-search-background`.  

   - Tab Bar: 
`--tab-bar-background`, 
`--tab-bar-divider`, 
`--tab-text`, 
`--tab-active-text`, 
`--tab-indicator`, 
`--tab-refresh-background` and 
`--tab-refresh-icon`.  

- Wired in 
`src/public/header-fixed-m3.css` and 
`src/public/header-tab-bar-m3.css`.  
    The header applies to every page, so the header tokens change it everywhere; the Tab Bar is on Home only.  
  - Colours only (`#RRGGBB` or a `var()`), so `tests/color-contrast.test.ts` can keep checking them.  
    The two Tab Bar rows of `COLOR-CONTRAST.md` 
move to the new tokens (
    `--tab-text` and 
    `--tab-active-text` 
on 
    `--tab-bar-background`  ), 
and a `--header-text` row is added.  

  - The tests that pin today's declarations (`tests/header-fixed-sheet.test.ts`, `tests/phone-sheets.test.ts`) follow, and a new one checks the tokens in both schemes; written, not run.  

### ACCEPTED RECOMMENDATION

Accepted automatically 2026-11-23 04:29 (the only recommendation).  
Every token starts as the role it replaced, so the header and Tab Bar look the same until a value is edited.  

- `src/public/m3-tokens.css`: the fourteen `--header-*` and `--tab-*` tokens in both alias blocks, after the page-glow tokens, each with a comment naming what it colours.  
- `src/public/header-fixed-m3.css`: the header and the Tab Bar each paint their own background (`--header-background`, `--tab-bar-background`), out to both edges;
  the line under the header takes `--header-divider`, and the strip under the Tab Bar on narrow screens takes `--tab-bar-background`.  
- `src/public/header-tab-bar-m3.css`: tabs, underline, divider, Refresh button, search field, search icon and text, nav link, both header buttons and the user's name read the tokens;
  a tab icon's inner fill takes `--tab-bar-background` in the Tab Bar only.  
- `src/public/single-column-m3.css`: the narrow-screen tab menu button takes `--tab-text`.  
- The maximized card's extras tabs keep their own roles: they sit on the card, not the Tab Bar.  
- `COLOR-CONTRAST.md`: the two Tab Bar Required pairs now name the tokens, with rows added for the underline and the header's text, link and filled button;
  Techniques item 8 and a Change log row.  
- Tests: one new in `tests/m3-assets.test.ts`;
  `tests/header-fixed-sheet.test.ts` and `tests/phone-sheets.test.ts` now expect the tokens;
  written, not run (Run Tests not ticked); `npx tsc --noEmit` passes.  
- `tasks.md` T043.  

## TWEAK08 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  
