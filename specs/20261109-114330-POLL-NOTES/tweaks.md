# Overview: `specs/20261109-114330-POLL-NOTES`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261109-114330-POLL-NOTES` |
| Tweak file created | 2026-11-09 15:41 |
| Last updated | 2026-11-09 20:25 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Chevrons Match The Avatar Chevron  
[X] Resolved  
[ ] Run Tests  

Make the chevron on the Admin Poll Card "Title" tab 2, or other similar tabs, be more like the chevron seen to the right of the Avatar.  
This screenshot illustrates the current appearance of the chevron on the Admin Poll Card "Title" tab 2: 
![Current Chevron Appearance](requirements\20261109-114330-poll-notes\edit-chevron.jpg)


The "Show more" chevron on the front of the Poll Card should also have a chevron with the same appearance.

### RECOMMENDATION

Today the chevrons are text characters: "... edit ⌄" (`adminCard.js:1332`, step 2), "Show more ⌄" (`pollCard.js:1638`, card front) and the colour selector's `▾` (`adminCard.js:1566`, the Colors step).  
The avatar's chevron is an inline SVG, `app.js:274` `AVATAR_CHEVRON`: a `m6 9 6 6 6-6` stroke path, `stroke-width="2"`, round caps, `currentColor`, 20×20 (`header-tab-bar-m3.css:251`).  

- **Option A** _(recommended)_: give all three the avatar's SVG chevron.  
  - Each button's text loses its `⌄` / `▾` ("... edit", "Show more") and gains the same SVG, `aria-hidden`, after the text.  
  - The SVG is built by DOM (`createElementNS`), not `innerHTML`, so the notes `innerHTML` invariant is untouched.  
  - CSS: the buttons become `inline-flex` with `align-items:center` and a 4px gap; the SVG is 20×20 on the card and the wizard, 18×18 in the colour selector; colour is inherited (`currentColor`).  
  - Tests: `client-admin-wizard.test.ts` and `client-poll-notes.test.ts` expect "... edit" and "Show more" and an `svg` child.  
- **Option B**: change only the two notes chevrons ("... edit" and "Show more"), and leave the colour selector's `▾` as it is.  
  - Smaller change, but the wizard then shows two chevron styles.  

### ACCEPTED RECOMMENDATION

Option B, accepted by "Tweak" 2026-11-09 4:24 PM.  
"... edit" and "Show more" now end with the avatar menu's SVG chevron;  
the colour selector's `▾` is unchanged.  

- `src/public/adminCard.js`: a `chevron(className)` helper builds the SVG with `createElementNS` (no `innerHTML`);  
  the edit button's text is "... edit" followed by `svg.wizard-notes-edit-chevron`.  
- `src/public/pollCard.js`: the card template's button is "Show more" followed by `svg.poll-notes-more-chevron`.  
- `src/public/admin-card-m3.css`, `src/public/pollCard-m3.css`: the buttons lay out as flex with `align-items:center` and a 4px gap;  
  the chevrons are 20×20, as in `header-tab-bar-m3.css`.  
- Tests (written, not run: `Run Tests` is not ticked):  
  - `tests/client-admin-wizard.test.ts` expects "... edit" and the chevron's path;  
  - `tests/client-poll-notes.test.ts` expects "Show more" and the chevron's path.  
- Artifacts: `contracts/ui-contracts.md` C1 and C4 describe the SVG chevron.  
  The spec and the other documents keep "⌄" as the name of the chevron.  

## TWEAK02 Show More Button Size, Gap And Fill  
[X] Resolved  
[ ] Run Tests  
tweak requirements...  

Change the size of the "Show more" text from large to medium.
md-sys-typescale-label-large-size
to
md-sys-typescale-label-medium-size

Eliminate the space between the bo00ttom of the notes text and the "Show more" button as shown in this screenshot:  
![poll-notes-show-more](requirements\20261109-114330-poll-notes\poll-notes-show-more.jpg)

Make the "Show more" button visible even when not mouse-over, as shown in the screenshot below.  
And then on mouse-over, make the button a bit darker.

### RECOMMENDATION

The button is styled in `src/public/pollCard-m3.css` (`.card-face .poll-notes-more`):  
today it uses the label-large type (14px), `min-height:32px`, a transparent background, and an 8% primary tint only on hover.  
The space under the text comes from two things: the text's 20px line height leaves about 4px below the second line's letters, and the 32px button centres its smaller label, which adds a few more.  

- **Option A** _(recommended)_: smaller label, a shorter button pulled up to the text, and a resting tint.  
  - Type: `label-medium` size, weight and tracking (12px, 500, 0.5px) in place of `label-large`.  
  - Gap: `min-height:24px` and `margin:-4px 0 0 auto`, so the button's top meets the bottom of the second line's letters;  
    the chevron shrinks from 20×20 to 18×18 to suit the smaller label.  
  - Resting fill: `color-mix(in srgb, var(--md-sys-color-primary) 8%, transparent)`, the tint the screenshot shows, now always on.  
  - Hover: a bit darker, `color-mix(in srgb, var(--md-sys-color-primary) 16%, transparent)`;  
    focus keeps its outline.  
  - Tests: none needed for these looks in jsdom;  
    `m3-assets.test.ts` still passes, since only tokens and px sizes for boxes are used.  
- **Option B**: the same type and fill, but no negative margin;  
  only `min-height:24px`, which leaves the 4px of line height under the letters.  
  - Safer if a font's descenders reach lower, but a small gap stays.    

### ACCEPTED RECOMMENDATION

Option A, accepted by "Tweak" 2026-11-09.  

- `src/public/pollCard-m3.css`, `.card-face .poll-notes-more`:  
  - label-medium size, weight and tracking in place of label-large;  
  - `min-height:24px` (was 32px) and `margin:-4px 0 0 auto`, so the button meets the bottom of the second line;  
  - a resting fill of 8% primary, and 16% primary on hover (was transparent, 8% on hover);  
  - the chevron is 18×18 (was 20×20).  
- `src/public/pollCard-m3.css`, `.card-flip`: the minimum height's extra for the notes drops from 40px to 28px, the 12px the button lost (FR-019).  
- Tests: none added;  
  these are looks jsdom does not lay out, and `m3-assets.test.ts` still holds (tokens only, no literal font size).  
  Not run: `Run Tests` is not ticked.  
- Artifacts: `contracts/ui-contracts.md` C1 describes the button.  

## TWEAK03 Notes Box Margin And Padding  
[X] Resolved  
[ ] Run Tests  

Change:
.poll-notes  
margin-top: 0px;
margin-bottom: 8px;

.poll-notes  
padding-top: 4px;
padding-right: 0px;
padding-bottom: 0px;
padding-left: 14px;

### RECOMMENDATION

`.card-face .poll-notes` in `src/public/pollCard-m3.css` has `margin:8px 0 4px` and `padding:8px 12px 4px` today.  
The new values take 12px off its height (margins 12px → 8px, vertical padding 12px → 4px), and the box's right edge loses its 12px inset, so "Show more" sits flush with the box's right edge.  

- **Option A** _(recommended)_: set `margin:0 0 8px` and `padding:4px 0 0 14px`, and take the same 12px off the card's minimum height.  
  - `.card-flip` goes from `+ 28px` to `+ 16px`, so the extra room for notes still matches the notes box (FR-019).  
  - Artifacts: `contracts/ui-contracts.md` C1 records the box's spacing.  
  - Tests: none; jsdom does not lay out, and `m3-assets.test.ts` still holds.  
- **Option B**: set only the margin and padding, and leave the card's minimum height as it is.  
  - Cards keep 12px more room than the notes need, below the choices.  

### ACCEPTED RECOMMENDATION

Option A, accepted by "Tweak" 2026-11-09.  

- `src/public/pollCard-m3.css`:  
  - `.card-face .poll-notes`: `margin:0 0 8px` (was `8px 0 4px`) and `padding:4px 0 0 14px` (was `8px 12px 4px`);  
  - `.card-flip`: the minimum height's extra for notes drops from `+ 28px` to `+ 16px`, the 12px the box lost (FR-019).  
- Tests: none added; these are looks jsdom does not lay out.  
  Not run: `Run Tests` is not ticked.  
- Artifacts: `contracts/ui-contracts.md` C1 records the box's spacing.  

## TWEAK04 Notes In The Admin Summary  
[X] Resolved  
[ ] Run Tests  
On the Admin Poll Card, put the notes inside the "wizard-summary" section  
and add the prefix "Notes: " before the content.  
Include up to 4 lines in the summary only.

### RECOMMENDATION

Today the summary (`buildSummary` in `src/public/adminCard.js`) has no notes.  
The read-only face shows them in a separate `.card-notes-preview` after the summary (`readOnlyNotes`), clamped to two lines;  
the wizard's summary does not show them at all.  
Step 2's own preview ("... edit") is not part of the summary and keeps its two lines ("in the summary only").  

- **Option A** _(recommended)_: a notes line right after the subtitle, as on the poll card.  
  - `buildSummary` adds `p.wizard-summary-text.wizard-summary-notes` when there are notes: the plain text "Notes: " and then the rendered notes as a part, so they are tappable ("Notes: change in Step 2") exactly when the other Step 2 parts are.  
  - Its HTML: in the wizard, `wizard.notesHtml`;  
    on the read-only face, `notesPreviewHtml` (up to 300 characters, enough for four lines at the card's width).  
    These stay the only values assigned to `innerHTML`.  
  - `summaryPart` and `readOnlyPart` accept an element part with a label ("Notes"), as `tappablePart` already does.  
  - CSS (`admin-card-m3.css`): the line is clamped to 4 lines with `line-clamp`;  
    the separate `.card-notes-preview` and `readOnlyNotes` are removed.  
  - The wizard's summary follows the notes after the editor's Done (`refreshWizardChrome` already runs on close).  
  - Tests (`client-admin-wizard.test.ts`): the read-only test looks for `.wizard-summary .wizard-summary-notes` with "Notes: " and the link;  
    a wizard test checks the summary shows the notes after Done.  
  - Artifacts: `contracts/ui-contracts.md` (the Admin Poll Card contracts) describe the line.  
- **Option B**: the same line, but at the end of the summary, after the when-line.  
  - Keeps the settings sentences together, but separates the notes from the title they belong to.  

### ACCEPTED RECOMMENDATION

Option A, accepted by "Tweak" 2026-11-09.  

- `src/public/adminCard.js`:  
  - `buildSummary` adds `p.wizard-summary-text.wizard-summary-notes` after the subtitle when there are notes: "Notes: " and a part holding `.wizard-summary-notes-text`;  
  - the wizard's summary uses `wizard.notesHtml`, and `readOnlyAnswers` gives the read-only face the row's `notesPreviewHtml`;  
  - `summaryPart` and `readOnlyPart` take an optional label and accept an element part, through a new `plainPart`;  
  - `readOnlyNotes` and the separate preview after the summary are removed.  
- `src/public/admin-card-m3.css`: `.wizard-summary-notes` is clamped to 4 lines;  
  the `.card-notes-preview` rules are removed.  
- Tests (written, not run: `Run Tests` is not ticked), in `tests/client-admin-wizard.test.ts`:  
  - the read-only test checks the line after the subtitle, its "Notes: " text, its HTML and its link;  
  - the Done test checks the wizard's summary shows the new notes.  
- Artifacts: `contracts/ui-contracts.md` C4 now describes the summary's notes line.  

## TWEAK05 Back Arrow On The Maximized Poll  
[X] Resolved  
[ ] Run Tests  

Add a back arrow to the Maximized Poll card.  
It will navigate back to the current tab.  
Here is a mockup of it:  
![maximize poll back arrow](requirements\20261109-114330-poll-notes\maximize-poll-back-arrow.jpg)

### RECOMMENDATION

The Maximized view is `.maximized-card-grid` (the `#maximizedCardGrid` template in `src/public/index.html`), a wrapping flex row: the card, `.col-rule`, `.maximized-space-right`.  
It closes today with the card's restore button or Escape, both through `closeMaximized()` → `restore()` in `src/public/tabs.js`, which puts the card back in the tab's grid, scrolls back to where the visitor was, and focuses the card (or the tab's start when the poll has left the tab).  
The legal pages' back arrow has its look in `src/public/back-arrow-m3.css` (`.back-arrow`: 40px tonal circle, state layers, focus ring, 26px arrow), which `index.html` does not load yet.  

- **Option A** _(recommended)_: an in-flow arrow above the card, as in the mockup.  
  - Template: a first child `div.maximized-back-row` holding `button.back-arrow.maximized-back` (`aria-label="Back"`, `title="Back"`, the legal pages' arrow SVG);  
    the row takes the full width (`flex:0 0 100%`) so the card and the notes stay side by side under it.  
  - Click: `closeMaximized()`, exactly what Escape does, so the scroll position and focus come back as today.  
  - `index.html` loads `back-arrow-m3.css` in its M3 layer order, and `tests/m3-assets.test.ts` adds it to the index page's layers.  
  - Tests (`tests/client-maximized.test.ts`): the arrow is shown above the card while maximized, and a click restores the grid and focuses the card's maximize button.  
  - Artifacts: `contracts/ui-contracts.md` C2 (the Maximized view) gains the arrow.  
- **Option B**: the same arrow, but fixed under the header (the legal pages' `.back-arrow-bar`), so it stays in view while a long poll scrolls.  
  - It then overlaps the top of the card unless the view gets a top gutter, and the mockup shows it in the flow.  

### ACCEPTED RECOMMENDATION

Option B, accepted by "Tweak" 2026-11-09.  

- `src/public/index.html`:  
  - loads `back-arrow-m3.css` after `back-to-top-m3.css`, its place in the M3 layer order;  
  - the `#maximizedCardGrid` template gains a second element, `div.back-arrow-bar.maximized-back-bar` holding `button.back-arrow.maximized-back` ("Back", the legal pages' arrow).  
- `src/public/tabs.js`:  
  - `maximizedView` clones the bar and puts it just before the view, not inside it;  
    the view's `container-type:inline-size` would make it the containing block of a fixed child, so the arrow would not stay fixed.  
  - `maximize` shows it and `restore` hides it;  
    a click is `closeMaximized()`, as Escape is, so scroll and focus come back as before.  
- `src/public/pollCard-m3.css`: `.maximized-card-grid` has a 56px top gutter, so the fixed arrow does not cover the card at the page's top;  
  `.maximized-back-bar[hidden]` is not displayed.  
- Tests (written, not run: `Run Tests` is not ticked):  
  - `tests/client-maximized.test.ts`: the arrow shows while maximized, sits just before the view, and a click closes it and focuses the card's Maximize button;  
  - `tests/m3-assets.test.ts`: the index page's layers include `back-arrow-m3.css`.  
- Artifacts: `contracts/ui-contracts.md` C2 describes the arrow.  

## TWEAK06 Back Arrow Placement By Layout  
[X] Resolved  
[ ] Run Tests  

When the maximized view is in single column mode, there is already a top gutter, so the back arrow can go there.  
And the "refresh" icon can move over to the right to make room.
See this screenshot for reference:  
![Maximized Back Arrow Single Column View](requirements\20261109-114330-poll-notes\maximized-back-arrow-single-column-view.jpg)

When the maximized view is not in single column mode, the back arrow can have less margin at the bottom: 
See this screenshot for reference:
![Back Arrow Bottom Margin](requirements\20261109-114330-poll-notes\back-arrow-bottom-margin.jpg)

### RECOMMENDATION

Today (TWEAK05) the arrow is a fixed bar 12px under the fixed chrome, and the Maximized view has a 56px top gutter.  
At 900px and narrower, the tab bar already has a 40px row under it (`single-column-m3.css`): Refresh on the left (`.tab-refresh--icon`, `left:var(--tab-edge)`), the All-tabs menu on the right (`.tab-menu-btn`).  
The page's `.container` starts 32px under the chrome, so the arrow (12px to 52px) overlaps the view by 20px without a gutter.  

- **Option A** _(recommended)_: decide by the tab bar's row, at the same 900px breakpoint.  
  - The arrow moves out of the `#maximizedCardGrid` template into `.tab-bar-wrap` in `index.html`, as `#maximizedBack` (the same `back-arrow-bar` wrapper and `back-arrow` button), hidden until a card is maximized;  
    `tabs.js` shows it in `maximize` and hides it in `restore`, with the same click (`closeMaximized()`).  
  - Wider than 900px: the wrapper stays fixed 12px under the chrome, lined up with the logo;  
    the view's gutter drops from 56px to 32px, so the card sits 12px under the arrow, the same as above it.  
  - 900px and narrower: the arrow takes Refresh's place in the row (`left:var(--tab-edge)`, `top:calc(100% + 5px)`), and while it is shown Refresh moves right, just left of the All-tabs menu (`.tab-bar-wrap:has(#maximizedBack:not([hidden])) .tab-refresh--icon`);  
    the view has no extra gutter.  
  - Tests: `client-maximized.test.ts` checks the arrow is in `.tab-bar-wrap`, shown only while maximized, and closes the view;  
    `line-graph-ui.test.ts` and the others keep using the template, which is back to one element.  
  - Artifacts: `contracts/ui-contracts.md` C2.  
- **Option B**: the same, but only at the single-column width (639.98px and narrower);  
  between 640px and 900px the arrow stays fixed under the chrome as on wide screens, with Refresh left where it is.  

### ACCEPTED RECOMMENDATION

Option A, accepted by "Tweak" 2026-11-09.  

- `src/public/index.html`: the arrow leaves the `#maximizedCardGrid` template (back to one element) and sits in `.tab-bar-wrap` after Refresh, as `div#maximizedBack.back-arrow-bar.maximized-back-bar` (hidden) holding `button.back-arrow.maximized-back`.  
- `src/public/tabs.js`: `setBackArrowShown` shows it in `maximize` and hides it in `restore`;  
  the click (`closeMaximized()`) is bound once at start-up, next to the Escape handler;  
  the per-grid clone of TWEAK05 is removed.  
- `src/public/pollCard-m3.css`: the view's top gutter is 32px (was 56px), so the card sits 12px under the arrow.  
- `src/public/single-column-m3.css`, at 900px and under:  
  - the arrow is placed in the row under the tab bar, at `left:var(--tab-edge)`;  
  - while it is shown, Refresh moves right, 4px left of the All-tabs menu;  
  - the view has no top gutter.  
- Tests (written, not run: `Run Tests` is not ticked): `tests/client-maximized.test.ts` checks the arrow is in `.tab-bar-wrap`, hidden until a card is maximized, and that a click closes the view and focuses the card.  
- Artifacts: `contracts/ui-contracts.md` C2 has the arrow's placement by width.  

## TWEAK07 Divider Under The Summary Heading  
[X] Resolved  
[ ] Run Tests  

We want to try a line under the title, subtitle and notes in the wizard summary section.
See the mockup here:
![line under title, subtitle and notes](requirements\20261109-114330-poll-notes\line-under-title-subtitle-notes.jpg)

### RECOMMENDATION

The summary (`buildSummary` in `src/public/adminCard.js`) is the title (`.wizard-summary-title`), the subtitle (`.wizard-summary-subtitle`) and the notes (`.wizard-summary-notes`, TWEAK04), then the settings sentences, always starting with `.wizard-summary-who` ("Your poll is a …").  
Its spacing is in `admin.css` (`.wizard-summary-text{ margin:6px 0 0 }`), its look in `admin-card-m3.css`.  
So the line can be CSS only: a top border on the who-line, drawn only when a title, subtitle or notes line comes before it (a new poll's wizard before Step 2 has none, and gets no line).  

- **Option A** _(recommended)_: as the mockup shows, a 1px `--md-sys-color-outline` line, the content's full width.  
  - `admin-card-m3.css`: `.wizard-summary-title ~ .wizard-summary-who, .wizard-summary-subtitle ~ .wizard-summary-who, .wizard-summary-notes ~ .wizard-summary-who { margin-top:8px; padding-top:8px; border-top:1px solid var(--md-sys-color-outline); }`.  
  - Both faces get it, since they share `buildSummary`.  
  - Tests: none; a border is not something jsdom lays out, and `m3-assets.test.ts` still holds.  
  - Artifacts: `contracts/ui-contracts.md` C4 mentions the line.  
- **Option B**: the same line in `--md-sys-color-outline-variant`, the lighter colour of the card's other dividers (the dates and counts panels, the footer).  
  - Quieter and consistent with the rest of the card, but fainter than the mockup.  

### ACCEPTED RECOMMENDATION

Option B, accepted by "Tweak" 2026-11-09.  

- `src/public/admin-card-m3.css`: `.wizard-summary-who` gets `margin-top:8px`, `padding-top:8px` and a 1px `--md-sys-color-outline-variant` top border, only when a title, subtitle or notes line comes before it;  
  the wizard and the read-only face both show it, through `buildSummary`.  
- Tests: none added; a border is not something jsdom lays out.  
  Not run: `Run Tests` is not ticked.  
- Artifacts: `contracts/ui-contracts.md` C4 mentions the line.  

## TWEAK08 Back Arrow Padding At 900px  
[X] Resolved  
[ ] Run Tests  
 Add 2px padding above and below the Back icon when the view is 900px or less.

### RECOMMENDATION

At 900px and under (TWEAK06), the arrow's wrapper sits at `top:100%` of `.tab-bar-wrap` with `padding:0` (`single-column-m3.css`), and the 40px button fills the 40px row under the tab bar exactly (`--refresh-gap` is 0).  
`fixedChrome.js` measures that row through the wrapper's `margin-bottom`, and re-measures only when an element's size changes or the window resizes.  

- **Option A** _(recommended)_: keep the row at 40px and make room inside it.  
  - The wrapper gets `padding-block:2px`, and the button becomes 36×36 there (its arrow 24px), so there are 2px above and below it.  
  - Nothing else moves: the row, the page's top and Refresh stay as they are.  
- **Option B**: keep the 40px button and grow the row to 44px while a card is maximized (`--refresh-gap:4px` on `.tab-bar-wrap:has(> #maximizedBack:not([hidden]))`), with the wrapper at `top:calc(100% + 2px)`.  
  - The arrow keeps its size, but the page shifts 4px on every maximize and restore;  
    a margin change does not trigger `fixedChrome.js`'s `ResizeObserver`, so `tabs.js` would also have to ask it to re-measure (a new `FixedChrome.measure()`).  

For either: no tests (a size jsdom does not lay out), and `contracts/ui-contracts.md` C2's table notes the padding.  
 

### ACCEPTED RECOMMENDATION

Option A, accepted by "Tweak" 2026-11-09.  

- `src/public/single-column-m3.css`, at 900px and under:  
  - the arrow's wrapper has `padding:2px 0` (was `padding:0`);  
  - the button is 36×36 and its arrow 24px, so it fits the 40px row with 2px above and below.  
  The row, the page's top and Refresh do not move.  
- Tests: none added; a size jsdom does not lay out.  
  Not run: `Run Tests` is not ticked.  
- Artifacts: `contracts/ui-contracts.md` C2's table notes the size and the padding.  

## TWEAK09 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  
