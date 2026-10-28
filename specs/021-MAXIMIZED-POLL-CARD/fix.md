# Overview: `specs/021-MAXIMIZED-POLL-CARD`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/021-MAXIMIZED-POLL-CARD` |
| Fix file created | 2026-09-24 09:54 |
| Last updated | 2026-09-24 17:09 |

Legend: `[ ]` open · `[X]` resolved · `[-]` resolved manually (or accepted as-is) by the developer.
Tick `No Tests` to postpone this fix's automated tests; leave it empty to have them written and run as usual.

"What's next" always returns the first `[ ]` item below.

The developer is expected to create the individual fix requirements in this file, and then run the `/speckit-fix` command to have the AI implement them, one at a time.  
Each fix requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Fixes

## FIX01 Maximized poll card renders with multi-card grid
[X] Resolved
[X] No Tests
The screenshot in the file:
"designDocs/dontTrack/maximizePollBug01.jpg"
shows a bug in the current implementation of the maximized poll card  
where the multi-card card grid is being rendered at the same time as the maximized poll card.

### RESOLUTION
Cause: `tabs.js` does hide the tab's `.card-grid` with the `hidden` attribute while a card is maximized, but the attribute only works through the browser's built-in `[hidden]{display:none}` rule, and `tabs.css` gives `.card-grid` `display:grid`, which beats it. The maximized view had its own `[hidden]` rule; the grid never got one. The jsdom tests checked only the `hidden` property, and jsdom does not apply the page's stylesheets, so they could not see it.

- `src/public/tabs.css`: added `.card-grid[hidden]{ display:none; }` after the `.card-grid` rule, matching the file's `.tab-panel[hidden]` and `.maximized-card-grid[hidden]` rules. The other elements the feature hides by attribute (`.maximize-btn`, `.maximized-card-grid`, `.tab-panel`) already have such rules.
- `tests/poll-card-assets.test.ts`: added "tabs.css hides a tab's grid while one of its cards is maximized", asserting the served `/tabs.css` carries the rule. **Tests postponed by the developer (No Tests); this test was written but not run.** `npm run build` passes (23 fingerprinted assets).
- Artifacts: `contracts/ui-contracts.md` C2 (the `.maximized-card-grid` row now names the rule and why it is needed); `tasks.md` T009 (note).

2026-09-24 10:03


## FIX02 Maximize Icon UI/UX
[X] Resolved
[X] No Tests
Here are some UI/UX requests for the Maximize icon on the poll card:
- Normal: icon #202020 
- Hover: same icon + light gray background
- Mouse-down: slightly darker background
- Focus: same icon + light gray background + focus ring

When the card is in the Maximized state,  
a icon will be rendered in the top right corner of the card's title row, and it will be a "Minimize" icon.  
The Minimize icon will be the same as the Maximize icon except the arrow will point in the opposite direction.

### RESOLUTION
One button in two forms, as the Live Results link is:

- **The Minimize form.** While a card is maximized, its title-row button stays visible and becomes a Minimize icon. It reads "Minimize Poll Card" as its `aria-label` and tooltip, and pressing it closes the view exactly as the X does. Because it is the same element, focus after closing lands on it, now showing Maximize again. The Minimize drawing is the traced outline and box with the arrow sub-path rotated 180° about its own centre, so the arrow sits in the same place but points down-left, into the box.
- **The states**, on `.maximize-btn` only; the star keeps its own look:
  - normal: `color:#202020`;
  - hover: `rgba(0,0,0,0.06)` background;
  - mouse-down: `:active` `rgba(0,0,0,0.12)`, placed last so it wins while a focused button is pressed;
  - keyboard focus: `:focus-visible` with the light background and a `2px solid var(--moss)` ring, offset 2 px, the same ring as the X.

Files:
- `src/public/pollCard.js`:
  - the template gains a hidden `.minimize-icon` SVG;
  - the button's click calls `opts.onMinimize` when maximized, else maximizes (the title and subtitle still only maximize);
  - `setMaximized` swaps the two icons, the `aria-label` and the `title`, and no longer hides the button.
- `src/public/tabs.js`: `createGrid` supplies `onMinimize: () => restore()`.
- `src/public/site.css`:
  - adds the four states and `.maximize-btn svg[hidden]{display:none}`, which is needed because `.maximize-btn svg` sets `display:block`, the same trap as FIX01;
  - removes the now-unused `.maximize-btn[hidden]` rule.

Tests:
- `tests/client-maximized.test.ts`: "offers no way to maximize again from inside the view" is rewritten as "turns the Maximize icon into a Minimize icon inside the view, and leaves the title inert". It covers the button staying visible, the label and title, which icon shows, the title staying inert, and Minimize closing with focus left on the same button.
- `tests/poll-card-assets.test.ts`: added "site.css draws the Maximize icon's states".
- **Tests postponed by the developer (No Tests): both were written but not run.** `npm run build` (23 fingerprinted assets) and `tsc --noEmit` pass.

Artifacts:
- `spec.md`: FR-004 (colour and states), FR-022 (Minimize form), FR-023 and FR-027 (Minimize closes, like the X), User Story 1 scenario 3 and User Story 4 scenario 8.
- `contracts/ui-contracts.md`: C1 `.maximize-btn`; C2 "Inside the maximized card"; the C3 close row.
- `data-model.md`: `setMaximized`.
- `quickstart.md`: Q1 and Q2.
- `tasks.md`: notes on T006, T007 and T008.

This changes what FR-004 and FR-022 require. `designDocs/021-high-level-requirements-MAXIMIZED-POLL-CARD.md` still says the icon uses the star's grey and is hidden while maximized, and the architecture's AMB-3 records the grey. Neither was edited.

2026-09-24 10:25

## FIX03 Minimize Same As Maximize Icon
[X] Resolved
[X] No Tests
The arrow on the Minimize icon should be the same as the Maximize icon, just rotated 180 degrees. 
Currently both icons are the same.

### RESOLUTION
Cause: FIX02's `setMaximized` swapped the two icons with `svg.hidden = on`. `hidden` is an HTML-element property that `<svg>` elements do not have, so the assignment only created an unused JavaScript property. The `hidden` attribute stayed as the template set it: Maximize shown, Minimize hidden. The label and tooltip did switch, as `maximizePollBug02.jpg` shows ("Minimize Poll Card" over the up-right arrow). The Minimize drawing itself was already correct: the traced outline and box, with the arrow sub-path rotated 180° about its own centre.

- `src/public/pollCard.js`: `setMaximized` now uses `toggleAttribute('hidden', on)` on `.maximize-icon` and `toggleAttribute('hidden', !on)` on `.minimize-icon`. The existing `.maximize-btn svg[hidden]{ display:none; }` rule keys on the attribute, so nothing else changed.
- `tests/client-maximized.test.ts`: "turns the Maximize icon into a Minimize icon inside the view, and leaves the title inert" now reads `hasAttribute("hidden")` on both SVGs, before opening, while maximized and after closing. The FIX02 version read the same meaningless `.hidden` property, so it would have passed on the bug. **Tests postponed by the developer (No Tests): written but not run.** `npm run build` passes (23 fingerprinted assets).
- Artifacts: `tasks.md` (the T008 FIX02 note names the attribute). No spec, contract or quickstart change: the required behaviour is unchanged.

2026-09-24 10:40

## FIX04 Remove Close icon from Maximized Poll Card
[X] Resolved
[X] No Tests
The "Close" icon is not needed now, because the Minimize icon is always visible and does the same thing. 
Please remove the Close icon and the 

### CLARIFICATIONS
Q1 (2026-09-24 11:09): The requirement ends mid-sentence: "Please remove the Close icon and the". What else should be removed?
- **A (assumed if you just say "A"):** the row the X sits in (`.maximized-card-close-row`). It would be empty, and it takes about 52 px above the card and the panel. The card and the panel would then start at the top of the tab's content.
- **B:** only the X; keep an empty row, so the card and the panel stay where they are now.
- **C:** something else. Please finish the sentence.

Whichever you choose, focus on opening moves to the card's Minimize icon instead of the X. FR-027 changes to match; it is the same button that focus returns to on closing.

## FIX04 X/Close Icon still appears
[X] Resolved
[X] No Tests
The Close icon is still appearing in the Maximized Poll Card, even though it should be removed.
The div class="maximized-card-close-row" should be removed from the Maximized Poll Card, and the Close icon should be removed as well.

### RESOLUTION
Q1 answered by the developer in the block headed "#3 FIX05 X/Close Icon still appears" (above; it is part of FIX04's section because its heading starts `#3`, not `##`): remove `.maximized-card-close-row` **and** the Close icon, which is Option A. That block's requirement is resolved with this fix.

Code:
- `src/public/index.html`: the `maximizedCardGrid` template no longer holds `.maximized-card-close-row` or its `.maximized-card-close` button. The card and the panel now start at the top of the tab's content.
- `src/public/tabs.css`: removed the four rules for the row and the button (`.maximized-card-close-row`, and `.icon-btn.maximized-card-close` with its `svg` and `:focus-visible` variants).
- `src/public/tabs.js`: `maximizedView()` no longer wires a close button, and `maximize()` focuses the card's own `.maximize-btn`, now showing Minimize, instead of the X. Closing already returned focus to that button, so on a keyboard Enter opens and Enter closes without focus moving.

One consequence: the Minimize icon sits in the **front** face's title row, so on the voting face the card has no close control of its own. Escape, the current tab and the back arrow (which returns to the front) remain. Spec User Story 5 scenario 3 now says so.

Tests:
- `tests/client-maximized.test.ts`:
  - the seven closes by `.maximized-card-close` now press the maximized card's `.maximize-btn`;
  - the open-in-place case asserts that no `.maximized-card-close` or `.maximized-card-close-row` exists and that the card is the view's first child;
  - the keyboard case expects focus on the Minimize button after opening and after closing;
  - the back-face focus case closes with Escape.
- **Tests postponed by the developer (No Tests): written but not run.** `npm run build` (23 fingerprinted assets) and `tsc --noEmit` pass.

Artifacts:
- `spec.md`: User Story 1 (narrative, independent test, scenarios 2, 5 and 8); User Story 5 (independent test, scenarios 2, 3, 4 and 6); FR-010 (no close row); FR-011 (no separate close button); FR-023 and FR-027 (closing by Minimize, Escape or the current tab; focus on opening goes to the Minimize icon).
- `contracts/ui-contracts.md`: C2's markup and element rows; the C3 open and close rows.
- `quickstart.md`: Q2, Q3 and Q10.
- `research.md`: R5, R6, R7, R9 and R11.
- `plan.md`: the summary and the structure tree.
- `data-model.md`: the state diagram.
- `tasks.md`: notes on T003, T009, T011 and T034.

This changes what FR-010, FR-011, FR-023 and FR-027 require. `designDocs/021-high-level-requirements-MAXIMIZED-POLL-CARD.md` and `architecture/021-maximized-poll-card/architecture.md` still describe the X; neither was edited.

2026-09-24 11:19

## FIX05 
[X] Resolved
[X] No Tests
There is a new color palette for the bars in the single-card layout in:
`research\MAXIMIZED-POLL-CARD\SINGLE-CARD-LAYOUT`  
Please extract that color palette and implement it the CrowdPoll webapp for the single-card layout poll cards and the maximized poll card.  
The single-card layout in the research folder also has a new technique for determing the background color of each bar,  
as well as the text styling for each bar.  
Please implement those techniques in the CrowdPoll webapp for the single-card layout poll cards and the maximized poll card. 
The semantic colors for the Yes and No bars should remain the same as they are now.

### RESOLUTION
Developer's choice, **Option A**: the named palette in `research/MAXIMIZED-POLL-CARD/SINGLE-CARD-LAYOUT/color-palette.md`. It is 50 distinct xkcd colours: darkish blue `#014182` … light grey `#D8DCD6`.

- **Palette:** `src/public/pollCard.js` `RESULTS_PALETTE_ENTRIES` now holds that palette, and it applies to every card, grid and maximized, since they share the code.
- **The research technique, on every palette bar,** as Yes/No bars already were:
  - the empty part is the fill 80% of the way to white (`RESULTS_TRACK_TINT`);
  - the text over it is that tint's dark shade (7:1);
  - a copy of the text clipped to the fill, animated with it, is drawn in whichever of the fill's light shade (95% lightness, `lightShadeOf`) and dark shade reads better (`inkOnFillFor`).
- **Code:** `SEMANTIC_TINT`, `RESULTS_INK` and `isSemanticColor` are replaced by one `BAR_COLORS` map (track, ink over the track, ink over the fill), computed at load for the 50 palette colours and the 2 Yes/No colours. `syncInkOnFill` now gives every bar its copy, in that bar's fill ink.
- **Yes/No bars:** unchanged, as asked: `#018826` / `#CF0234`, an 85% tint, white text over the fill. The research page's move of their tint to 80% was not carried over.
- **Measured on this palette:**
  - text over the tint is 7.03:1 at the lowest;
  - text over the fill is 4.05:1 at the lowest, with five mid-brightness fills below 4.5:1, where no shade of their own hue reaches it;
  - 28 light fills are below 3:1 against their own tint, so the dark trailing edge on every fill (kept) marks where they end.
- **Tests:** `tests/client-bar-colours.test.ts` case (a) is rewritten. It expects every palette bar on its 80% tint, with text at 7:1 or better over the tint, and a clipped copy at 4:1 or better over the fill; the first two entries are `#014182` / `#1F6357`, and all 50 are distinct. Case (b)'s Maybe bar now has a copy too, and the unused `TRACK` constant is removed. **Tests postponed by the developer (No Tests): written but not run.** A jsdom load of `pollCard.js` confirmed 52 `BAR_COLORS` entries, with the Yes/No values unchanged. `npm run build` (23 fingerprinted assets) and `tsc --noEmit` pass.
- **Artifacts:**
  - `spec.md`: User Story 3 (narrative and scenario 1), FR-029, FR-030, FR-032 (the split at the fill's edge now applies to every bar), the Bar palette entity and SC-005 (7:1 over the tint, 4:1 over the fill).
  - `contracts/ui-contracts.md`: C5.
  - `data-model.md`: §3.
  - `research.md`: a FIX05 note on R10.
  - `plan.md`: the summary.
  - `quickstart.md`: Q11.
  - `tasks.md`: notes on T020–T023 and T026.
  - The project `README.md` (Result colours) and `ARCHITECTURE.md` (Result bar colours).
- **What this changes in the requirements:** FR-029 and FR-030 (a light palette with dark text at 7:1 on the fill). `designDocs/021-high-level-requirements-MAXIMIZED-POLL-CARD.md` and `architecture/021-maximized-poll-card/architecture.md` still describe the light palette; neither was edited.

2026-09-24 15:04  

## FIX06 "X" / close icon Still Appears.
[X] Resolved
[X] No Tests
The screenshot in:
"designDocs\dontTrack\closeButtonBug01.jpg"
show the location of the button that is still appearing in the Maximized Poll Card, even though it should be removed. 
It is cirecled in red in the screenshot.

### RESOLUTION
Developer's choice, **Option A**: no code change.

**Cause:** FIX04's removal was already correct: no file in `src/` or `dist/public/` contains `.maximized-card-close` or its row. `src/routes/assets.ts` keeps each page's HTML in memory (its `pages` map) from the first request until the server process restarts. `npm run dev` (`tsx watch src/server.ts`) restarts only when a TypeScript file changes. So the dev server that was running kept serving the `index.html` it had cached before FIX04, with the close row still in the template. The stylesheets are served fresh, so the row had lost its CSS, which is why the X showed at 28 px at the left of the card instead of 42 px at the top right.

**To see the fix:** stop and restart the dev server, then reload the page.

**Worth knowing:** any later edit to a page's HTML will likewise not show until the server restarts. Options B (restart `tsx watch` on HTML changes) and C (skip the page cache in development) were offered and not taken.

No code, tests or artifacts changed; `No Tests` was ticked.

2026-09-24 16:40

## FIX07 Maximize/Minimize Icons on Back Face Of Poll Card
[X] Resolved
[X] No Tests
It was an oversight not to specify that the Maximize and Minimize icons should also appear on the back face of the poll card.  
A Poll Card that is in the multi-card grid should have a Maximize icon on the back face of the card,  
and a Poll Card that is in the Maximized state should have a Minimize icon on the back face of the card. 
It will perform the same functions as the icons on the front face of the card.

### RESOLUTION
The voting face now carries the same button as the front: Maximize on a grid card, Minimize on a maximized card, doing the same things. This also closes the gap FIX04 left, where a maximized card flipped to its voting face had no close control of its own.

Code:
- `src/public/pollCard.js`:
  - `POLL_CARD_TEMPLATE`'s back face wraps its title in a `.question-row` holding the same `.maximize-btn` with both icons, and no Bookmark star (the back face has never had one).
  - The click wiring and `setMaximized` now act on every `.maximize-btn` on the card, so both faces switch between the Maximize and Minimize forms together.
- `src/public/site.css`: the two title-row rules, written for `.card-front` only, now cover `.card-back` too, so the button sits at the right of the back title.
- `src/public/tabs.js`: a `shownMaximizeButton(cardEl)` helper picks the button on the face the card is showing. It is used on opening, on closing (replacing the rule that focused the back face's title with `tabIndex = -1`) and for the tab's fallback focus.

Tests:
- `tests/client-maximized.test.ts`:
  - added "gives the voting face its own Maximize button, which becomes Minimize inside the view", which checks the back button's presence and label, and the absence of a star on the back. Flipped to vote, pressing it maximizes the card, both buttons show Minimize, and focus is on the back button; pressing it again closes the view, leaving focus there;
  - the "focuses by the face the card is on as it closes" case now expects the back face's button, not its title.
- **Tests postponed by the developer (No Tests): written but not run.** `npm run build` (23 fingerprinted assets) and `tsc --noEmit` pass.

Artifacts:
- `spec.md`: FR-003 (the voting face's icon), FR-022 (both title rows), FR-027 (focus on the button on the face showing, on opening and on closing), User Story 5 scenarios 3–4.
- `contracts/ui-contracts.md`: C1 (the back face's title-row markup; one button per face) and the C3 rows.
- `quickstart.md`: Q6.
- `research.md`: a FIX07 note before R10.
- `tasks.md`: notes on T006, T008 and T034.
- The project `README.md` (Maximize) and `ARCHITECTURE.md` (the maximized card, and its state diagram), which also still described FIX04's removed close button.

This changes what FR-003, FR-022 and FR-027 require. `designDocs/021-high-level-requirements-MAXIMIZED-POLL-CARD.md` and `architecture/021-maximized-poll-card/architecture.md` were not edited.

2026-09-24 16:48

## FIX08 Ready To Do Tests
[X] Resolved
[ ] No Tests
The recent fixes are ready to run tests on.

### RESOLUTION
Ran the tests that FIX01–FIX07 wrote but postponed (each had `No Tests` ticked). **Everything passed on the first run; no correction was needed.**

- **`npm test` (the full suite):** 44 files passed, 1 skipped; **687 tests passed, 15 skipped**. That is the T042 baseline of 684 plus the three tests the fixes added:
  - FIX01: "tabs.css hides a tab's grid while one of its cards is maximized";
  - FIX02: "site.css draws the Maximize icon's states";
  - FIX07: "gives the voting face its own Maximize button, which becomes Minimize inside the view".
- **Also run and passed:** the tests the fixes rewrote or updated:
  - FIX02 and FIX03: the Minimize-form case, now checking the `hidden` attribute;
  - FIX04: the seven closes through the Minimize button, the check that the X is absent, and the keyboard cases;
  - FIX05: the palette and tint cases in `client-bar-colours.test.ts`;
  - FIX07: the back-face focus case.
- **The three suites the fixes touched, run on their own:** `client-maximized`, `client-bar-colours` and `poll-card-assets`, 97/97.
- **`npm run build`:** clean, 23 fingerprinted assets. **`tsc --noEmit`:** no errors.

No code, test or artifact was changed by this fix. The earlier fixes' resolutions still say their tests were postponed; this resolution records that they now pass.

2026-09-24 17:09