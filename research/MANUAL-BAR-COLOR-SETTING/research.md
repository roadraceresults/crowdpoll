# Overview 

## Document History

| Record | Value |
|---|---|
| Research directory | research/MANUAL-BAR-COLOR-SETTING/research.md |
| Research results file created | 2026-10-08 17:46 |
| Last updated | 2026-10-08 19:27 |

Legend: `[ ]` open · `[X]` resolved · `[-]` resolved manually (or accepted as-is) by the developer.

"What's next" always returns the first `[ ]` item.  

# High Level Requirements  

We have determined that some Polls have choices that lend themselves to particular colors.  
For example, Republican and Democratic choices might be associated with red and blue colors, respectively.  
For now, we don't want to use AI to accomplish this, although that would be a good automated approach.  

So, we want to implement a method that would let the Poll Creator (or an Admin) to manually set the color from a predefined palette.  
This would be done after the Choices have been entered.  
The natural place for this setting would be on the Edit Poll Card, as a new numbered circle, "Colors".  
Each Choice would be listed, with a color selector next to it, allowing the Poll Creator or Admin to pick a color from the predefined palette.  

This would require database schema changes to the `poll` table. 
Migration really isn't necessary because the CrowdPoll webapp is still in devlopment. Even the webapp that is deployed to Digital Ocean is under development. However, if the migration is simply adding a new empty field, then that is okay.

This predefined palette should not be confused with the `const RESULTS_PALETTE_ENTRIES = []` in pollCard.js. Those colors are the colors that are automatically assigned to poll results based on the order of the choices.  
The predefined palette should be easy to extend in the future if new colors are needed.  
To start the predefined palette should include pure basic colors such as red, blue, green, yellow, and purple.  
The colors are shown in the following image:  
![Manual Assignment Color Palette](dontTrack\manual-bar-color-palette.jpg)  

One goal of the research is to recommend a intuitive and user-friendly interface for manually assigning colors to poll choices.  
This interface must adhere to Material 3 guidelines to ensure consistency with the overall design language of the CrowdPoll webapp.  

# Research Findings

Measured and read on 2026-10-08 against this repository (Node v22.22.1). Contrast figures come from the repository's own derivation functions in `src/public/pollCard.js`, run on each hex code; the palette is read from `dontTrack/manual-bar-color-palette.jpg`, which shows 16 swatches. Where a claim rests on a reading of the image, the hex codes are the ones printed beside the swatches.

## manually set the color from a predefined palette (Poll Creator or Admin, after the Choices, no AI)

**What was found**
- **Every bar colour today is automatic.** `assignResultColors(data, paletteOffset)` (`src/public/pollCard.js:284`) gives a choice a fixed colour when its label reads as yes or no (`#018826` and `#CF0234`, `:106-107`), and otherwise the next entry of the 50-entry list `RESULTS_COLOR_PALETTE` (`:74`), starting at a hash of the poll id (`paletteOffsetFor`, `:266`). The data is sorted by percentage on every refresh (`rebuildData`, `:962-970`), so an automatic colour follows a choice's **rank**, not the choice.
- **The "Poll Creator (or an Admin)" rule already exists.** The save and publish routes sit behind `requireOwnPoll` (`src/routes/pollsApi.ts:181, 389, 497`), which lets an administrator or the poll's own creator through and answers `404` to anyone else (`src/polls/service.ts:825-846`).
- **Choices are stored as a jsonb array** `[{id, label, position}]` in `polls.choices` (`src/db/migrations/002-polls.ts:11`, `src/db/schema.ts:73-77`). They are written whole by `replaceChoices` (`src/polls/service.ts:921-955`) from a flat `labels` array, and **every choice gets a new `randomUUID()` on every save** (`:948`). A colour therefore cannot be attached to a choice by its id between saves; it has to travel in the same request as the label list, in the same order.
- **`replaceChoices` trims and drops empty labels** (`:929-931`), so a parallel list of colours must be paired with its label before the empty ones are dropped, or the two lists drift.
- **Choices can be changed only until the first vote.** In the browser `canChange("labels")` is true only in `EDIT` mode (`src/public/adminCard.js:414-421`, locked at `:1498`); on the server a poll that has votes takes the `UPDATE` path, which refuses any field outside `UPDATE_FIELDS` and `labels` among them (`src/routes/pollsApi.ts:418-432`).
- **The card reads colours from a closed set.** `applyBarColors` destructures `BAR_COLORS.get(color)` and `BAR_COLORS_DARK.get(color)` (`pollCard.js:659-660`); both maps are built once from the 50 entries plus the two semantic colours (`:376, :408`). A hex outside them returns `undefined` and the destructuring throws. The functions that fill the maps, `barColorsFor` and `darkBarColorsFor`, accept any hex.
- **The card's data items carry no colour.** `rebuildData` builds `{id, label, pct, selected}` from `poll.choices` (`:963-968`) and drops everything else. Choices reach the card as `PollProjection.choices`, copied whole from the row (`src/polls/versions.ts:35`), so an extra property on a stored choice would arrive without any change to the projection code, though its TypeScript type (`:19`) names three fields.
- **Search and screening are unaffected**: they read labels only (`choice_labels`, `src/polls/store.ts:286-287`; `src/polls/sweeps.ts:210`).

**What it would take**
- Server: a colour per choice that is validated against the palette on write, accepted in the same `publish` and `save` calls as `labels` (`pollsApi.ts:436-447, 520-528`), copied by `duplicatePoll` (`service.ts:984`), described in `postman/openapi.json` (the project keeps it in step with the routes), and returned with the choices (`pollsApi.ts:601` already returns each choice object whole).
- Card: `rebuildData` passes the colour through, `assignResultColors` uses it, and the two colour maps become derive-on-demand (`barColorsFor` and `darkBarColorsFor` already work for any hex).
- Existing tests that pin the current behaviour: `tests/client-bar-colours.test.ts`, `tests/client-maximized.test.ts`, `tests/poll-card-assets.test.ts` for the bars; `tests/client-admin-wizard.test.ts`, `tests/polls-admin-wizard.test.ts`, `tests/polls-editing-eligibility.test.ts` for the wizard.
- Rough size: the server change is small (types, validation, two routes, duplicate); the wizard step and its styles are the bulk; the card change is about 40 lines.

**Recommendation**
Storage is settled (resolved: Option 1 of *Where manual colours are stored*): each choice carries its own `color`, and the step sends a `colors` list beside `labels` in the one save call, in the same order, with `null` for Automatic. The server pairs each colour with its label **before** it drops empty labels (`service.ts:929-931`), validates each colour against the palette, and writes `color` onto the choice it creates. Colours stay editable after votes (resolved: Option 2 of *Colours after the first vote*): a colour change then reaches voters who are looking at the poll, through the same content-version path as a title change (`color` lives inside `choices`, which is not in `NON_CONTENT_FIELDS`, `store.ts:272-296`); the card's in-place refresh path already recomputes every row's colour from `data` on each render (`pollCard.js:689-715`), so it follows whatever `assignResultColors` returns; at implementation, check only that `rebuildData` (`:962`) is fed the refreshed `poll.choices` when the content version changes. The card's rule is settled (resolved: Option 1 of *How manual colours combine with automatic and Yes/No colours*): a manual colour always wins, a choice left on Automatic behaves exactly as today, and two choices may share a manual colour. In code, three places in `pollCard.js` change:
- `rebuildData` (`:963-968`) adds `color: c.color` to each data item;
- `assignResultColors` (`:284-292`) returns `item.color` first when it is set, then the semantic colour, then the next palette entry; only a choice that reaches the last branch advances `paletteIndex`, so Automatic choices keep exactly the colours they have today whether or not their neighbours are coloured;
- `applyBarColors` (`:658-660`) gets its colours from a get-or-create lookup that derives and caches a hex it has not seen, instead of `BAR_COLORS.get(color)` and `BAR_COLORS_DARK.get(color)`, which return `undefined` outside the pre-built set (`:376, :408`).
This finding no longer waits on anything. What does not wait either: colours should travel with the label list in the one save call, the rule for who may set them is the existing owner-or-administrator rule, and an unset choice must behave exactly as today.

## the Edit Poll Card, as a new numbered circle, "Colors"

**What was found**
- **The card is a five-step wizard** for a poll in its new-poll state, and it also opens on a published poll with every step answered: `WIZARD_STEPS` is `Who`, `Title`, `Choices`, `How`, `When` (`src/public/adminCard.js:345-351`); an existing poll starts with `visited` and `answered` both `[1, 2, 3, 4, 5]` (`:479`).
- **The numbered circles** are built by `buildCircles` (`:803-830`); a circle is tappable only once its step is visited (`btn.disabled = !isVisited`), and **Next** is the only way forward (`nextButton`, `:833-840`), so every step is passed through in order.
- **The circle row is hard-wired to five columns**: `grid-template-columns: repeat(5, 1fr)` (`src/public/admin.css:331`) and a joining line inset 10% from each side (`:333-340`; the narrow-screen rule at `:430` moves only its height). A sixth circle needs the column count and the inset changed (an inset of 50/N percent keeps the line between the first and last circle centres). At the card's 420 px maximum a sixth column leaves about 64 px per circle, which holds the short name `Colors` at the label size in use.
- **Step numbers are written into the code**: `lockStep` tests `n === 3`, `4`, `5` (`:1498-1505`), `buildStepPanel` picks `buildStep3/4/5` by number (`:1520-1521`), and `canChange("labels")` locks step 3 with `LOCKED_BY_VOTES`. A new step in the middle renumbers the last two.
- **Step 3 holds the choices as one text box, one choice per line** (`buildStep3`, `:1151`); `wizardFields` turns it into `fields.labels` (`:1650`). A Colors step can list the choices straight from that text, including lines typed but not yet saved.
- **An existing menu pattern is already in the card**: a trigger with `aria-haspopup`/`aria-expanded` (`:1840-1843`) opening a list of `role="menuitem"` buttons (`:291, 300`), styled in `src/public/admin-card-m3.css:119-147` and positioned by `adminList.js`.
- **The admin page does not load `pollCard.js`** (`src/public/admin.html:187-191` lists `adminCard.js` and `adminList.js` only), so the bar-colour derivation is not available on the admin card without moving it.

**What it would take**
A sixth entry in `WIZARD_STEPS`, `[1, 2, 3, 4, 5, 6]` in the two places that list the steps, a `buildStep` for Colors, a lock for it in `lockStep`, `colors` added beside `fields.labels` in `wizardFields`, the circle-row CSS made to count its steps, and the wizard tests updated. If Colors sits after Choices, steps `How` and `When` become 5 and 6.

**Recommendation**
`Colors` is step 4 (resolved: Option 1 of *Where the Colors circle goes*): `Who`, `Title`, `Choices`, `Colors`, `How`, `When`. The changes that follow from it, all in the places named above:
- `WIZARD_STEPS` (`adminCard.js:345`) gets `{ n: 4, name: "Colors", short: "Colors" }`, and the old steps 4 and 5 become 5 and 6.
- The step lists `[1, 2, 3, 4, 5]` at `adminCard.js:479` become `[1, 2, 3, 4, 5, 6]`.
- `buildStepPanel` (`:1520-1521`) maps 3 to Choices, 4 to Colors, 5 to How, 6 to When; `lockStep` (`:1498-1505`) moves its `n === 4` and `n === 5` branches to 5 and 6 and gets a branch for 4; the dates code that tests the last step moves to 6.
- `admin.css:331` becomes `repeat(6, 1fr)` and the joining line inset (`:336-337`) becomes 8.33% (50 divided by 6); the narrow-screen rule (`:430`) needs no change.
- Next on step 3 leads to Colors; the Publish rule that every step must have been visited needs no change, because Next always passes through Colors.
- The wizard tests that count or number steps (`tests/client-admin-wizard.test.ts`, `tests/polls-admin-wizard.test.ts`) change.

The step sends the colours as a `colors` list beside `labels` (resolved: Option 1 of *Where manual colours are stored*), in the order of the lines in the Choices box, `null` for Automatic; it builds that list from the Choices step's current text, so it works on lines typed but not yet saved. If a line is edited or reordered after its colour was set, the colour follows the line's position in the box and is dropped for any line that was removed or renamed (the box has no stable choice identity to follow, and ids are reissued on save anyway). Because colours stay editable after votes (resolved: Option 2 of *Colours after the first vote*), on a poll that has votes the step is **not** locked while step 3 stays locked: `lockStep` (`adminCard.js:1498-1505`) gets no branch for Colors, `canChange` (`:414-421`) answers true for a `colors` field in both `EDIT` and `UPDATE` mode (its last line returns true for `EDIT` only today), the step lists the stored choices rather than the Choices box, and `wizardFields` (`:1650`) sends `colors` without `labels`. This item no longer waits on anything.

## database schema changes to the `poll` table

**What was found**
- **The table is `polls`**, and the migrations run so far are 001 to 006 (`src/db/migrations/`); the next would be 007.
- **No schema change is needed to store a colour per choice.** `choices` is a jsonb array whose elements are plain objects (`002-polls.ts:11`); `columnsFor` writes the array as JSON (`src/polls/store.ts:285-288`), and reads sort it and return the elements as stored (`store.ts:200`, `versions.ts:35`). A `color` property inside each element needs no migration and no backfill: a choice without one is "automatic", which is exactly today's behaviour for every existing poll.
- **A new column is also cheap**, and is what the requirement assumed: a nullable `choice_colors jsonb` added by migration 007 is "simply adding a new empty field". Its cost is that colours would then be a second structure kept in step with `choices` by position, while ids are reissued on every save (`service.ts:948`) and a rename or reorder shifts positions.
- **A colour change must reach other browsers.** `updatePoll` bumps `content_version` for any field not in `NON_CONTENT_FIELDS` (`store.ts:272-296`), and `choices` is not in that set, so a colour-only save refreshes the cached projection (`versions.ts:50-62`) with no extra code, under either storage choice.

**What it would take**
Option A, inside `choices`: no migration; widen the `Choice`, `PollChoiceJson` and `PollProjection` types (`store.ts:107`, `schema.ts:73`, `versions.ts:19`). Option B, a column: migration 007, `PollTable`, `Poll`, `FIELD_TO_COLUMN`, the projection and the admin list row, plus keeping the list aligned with the choices on save.

**Recommendation**
No migration (resolved: Option 1 of *Where manual colours are stored*). The change is types and code only:
- widen `Choice` (`src/polls/store.ts:107`), `PollChoiceJson` (`src/db/schema.ts:73`) and the `PollProjection` choice type (`src/polls/versions.ts:19`) with an optional `color: string`;
- `replaceChoices` (`service.ts:921`) takes the `colors` list and writes `color` on each new choice, leaving it off when the value is `null`; `duplicatePoll` (`service.ts:984`) copies it, because it rebuilds each choice from `label` alone today;
- `publish` and `save` pass `body.colors` through (`pollsApi.ts:436-447, 520-528`); and, because colours stay editable after votes (resolved: Option 2 of *Colours after the first vote*), `colors` is added to `UPDATE_FIELDS` (`pollsApi.ts:418-420`). `labels` stay refused in that mode, so `replaceChoices` cannot be the writer there: a second function sets `color` on the **existing** choices by position and returns the same ids, labels and positions, so every stored vote still points at its choice, and it answers `400` when the list is not exactly as long as the choice list;
- add `colors` to the two request bodies and `color` to the choice schema in `postman/openapi.json`.
A stored colour that is no longer in the palette (the palette was edited later) is still drawn: the check runs when a colour is written, not when it is read.

## the predefined palette, easy to extend, not the `RESULTS_PALETTE_ENTRIES` colours

**What was found**
- **The image shows 16 colours.** Read from the swatches, in the image's own order (column by column): `#0695F5`, `#784315`, `#C0C0C0`; `#FF0000`, `#0000FF`, `#06D400`, `#FFFF00`; `#800080`, `#FF6601`, `#008488`, `#FF91CB`; `#7F7F7F`, `#00A636`, `#7092BE`, `#880015`, `#000000`. The text names five (red, blue, green, yellow, purple); the image has eleven more.
- **The existing automatic palette is separate and stays separate.** `RESULTS_PALETTE_ENTRIES` is the 50-entry xkcd list (`pollCard.js:21-72`), picked by rank; the manual palette is chosen by a person. The two overlap in appearance: `#0000FF` is 16 RGB units from the automatic `#0C06F7`, `#FF6601` is 11 from `#FF5B00`, `#C0C0C0` is 12 from `#C5C9C7`, and `#000000` is an automatic entry already.
- **Colours near the Yes/No pair.** `#00A636` is 34 RGB units from the affirmative green `#018826`; `#FF0000` is 71 and `#880015` is 77 from the negative red `#CF0234`.
- **Every colour can be rendered by the existing derivation.** Text on the unfilled part of a bar (the track, an 80% tint) reaches at least 7:1 for all 16 in both light and dark mode (lowest 7.01:1). Text over the filled part is below the project's 7:1 target for 8 of the 16 and below 4.5:1 for one:

  | Colour | Ink on the fill | Ratio | Below 7:1 |
  |---|---|---|---|
  | `#008488` | `#e5feff` | 4.29 | yes, and below 4.5 |
  | `#7F7F7F` | `#141414` | 4.60 | yes |
  | `#FF0000` | `#290000` | 4.80 | yes |
  | `#00A636` | `#00290d` | 4.92 | yes |
  | `#0695F5` | `#011828` | 5.70 | yes |
  | `#7092BE` | `#0d131c` | 5.81 | yes |
  | `#FF6601` | `#291000` | 6.12 | yes |
  | `#0000FF` | `#e5e5ff` | 6.95 | yes |

  The other eight (`#784315`, `#C0C0C0`, `#06D400`, `#FFFF00`, `#800080`, `#FF91CB`, `#880015`, `#000000`) are 7.04 to 18.76. The automatic palette has the same shape: 24 of its 50 are below 7:1 and 5 are below 4.5:1, lowest 4.05 (`darkShadeOf` stops at a floor, `pollCard.js:343-352`).
- **Where a palette would live.** The browser cannot import the server's TypeScript, and the card's colour list is a constant inside `pollCard.js`. The server already tells the browser its limits through `/api/config` (`src/routes/api.ts:98-110`, for example `minChoices`).

**What it would take**
One ordered list of `{name, hex}` in a single new server module, used to validate a colour on write and sent to the browser in `/api/config`; adding a colour is then one line, and the picker grid simply grows a row. The card derives its bar colours from whatever hex it is given and caches them.

**Recommendation**
The palette is the 16 colours of the image with one change (resolved: Option 2 of *Legibility of text on the filled part of the bar*): the teal `#008488` becomes `#007A7E`, so no colour is below 4.5:1 over the fill (the teal is then 4.88:1); eight stay under 7:1, as the automatic palette does. This item no longer waits on anything. Settled in principle: store the hex, not a colour key, so a stored poll keeps its look if the palette is edited later; validate against the palette only when a colour is written, and let the card draw any stored hex. Proposed names for the picker and for assistive technology, in hue order, which you can change: Red `#FF0000`, Maroon `#880015`, Orange `#FF6601`, Yellow `#FFFF00`, Bright green `#06D400`, Green `#00A636`, Teal `#007A7E`, Sky blue `#0695F5`, Blue `#0000FF`, Steel blue `#7092BE`, Purple `#800080`, Pink `#FF91CB`, Brown `#784315`, Black `#000000`, Gray `#7F7F7F`, Silver `#C0C0C0`. Sixteen fills a 4 by 4 grid.

## an intuitive and user-friendly interface for manually assigning colors, adhering to Material 3

**What was found**
- **Material 3 has no colour-picker component.** The closest published patterns are the exposed dropdown (it shows the current selection and opens a menu), the menu itself, and radio buttons or chips for choosing one of a few options. I could not read the official `m3.material.io` pages from here; this rests on the Material Components for Android documentation and on accessibility guidance, cited below.
- **Touch targets.** Google's accessibility guidance asks for at least 48 by 48 dp per target, separated by 8 dp or more; a 24 px minimum is the WCAG 2.2 floor (SC 2.5.8, Level AA). Sources: Google Accessibility Help "Touch target size", https://support.google.com/accessibility/android/answer/7101858 ; Material Components for Android menu documentation, https://gitea.com/784622644/material-components-android/src/branch/master/docs/components/Menu.md ; WCAG 2.2 target size, https://tabnav.com/academy/wcag/success-criterion-2.5.8 .
- **Colour must not be the only cue** (WCAG 1.4.1): each swatch needs a visible or announced name and a non-colour selected marker. A swatch picker is a single-select radio pattern (`role="radiogroup"` with `role="radio"` and `aria-checked`), with arrow-key movement between swatches and a visible focus ring. Sources: https://react-spectrum.adobe.com/v3/ColorSwatchPicker.html , https://vivid.vonage.com/components/simple-color-picker/accessibility/ , https://designsystem.volvocars.com/web/components/chips/ . The 1.4.1 wording was not in the search results; it is as I know it and worth checking against W3C's "Understanding" page.
- **The card is narrow.** Its container is a 420 px column with 18 px padding, so 384 px of content; a row of sixteen 48 px swatches is 768 px, and sixteen 24 px swatches miss the 48 dp target.
- **Up to `ENV_MAX_CHOICES` choices** (default 50) can need a colour each, and each choice label is up to 100 characters.

**What it would take**
A step panel that lists one row per choice line; each row holds the label and one control. The wizard and the card already supply the visual language (M3 tokens, ripple, tonal and filled buttons, switches, chips; `src/public/admin-card-m3.css`, `m3-tokens.css`) and a menu pattern to copy.

**Recommendation** (a design, not waiting on a decision)
A **swatch button per choice that opens a swatch grid**:
- *The row.* Choice label on the left (ellipsis if long, full text in the tooltip); on the right one button, at least 48 dp tall, showing a 24 dp colour dot, the colour's name (or "Automatic") and a drop-down arrow, with `aria-haspopup`, `aria-expanded` and the label "Color for <choice>". This is the Material exposed-dropdown shape, so it looks like the other M3 fields in the card.
- *The popover.* Tapping the button opens a small elevated surface under it holding **Automatic** first (clears the colour) and then the 16 swatches as a 4-column grid of 48 dp targets with 8 dp gaps (about 216 px wide, so it fits a 320 px phone). Selecting one closes the popover, puts focus back on the button and updates the dot and name.
- *Accessible by design.* The grid is a `radiogroup`; each swatch has the colour's name as its accessible name and a tooltip; the chosen swatch shows a check mark; arrow keys move between swatches, Home and End jump, Esc closes; the popover is the same positioned-surface approach as the card's actions menu (`adminList.js`).
- *Defaults.* Every choice starts on Automatic, so nobody has to open the step; the step's one-line help says so ("Optional. Leave a choice on Automatic to colour it for you.").
- *No colour preview of the bar in the first version.* A true preview needs the bar derivation, which lives in `pollCard.js` and is not loaded on the admin page; adding it means moving those functions into a shared script. The swatch dot itself is the preview.

Alternatives considered and why they lost:
- **Inline swatch strip under each choice.** Sixteen swatches at a 48 dp target do not fit one line, so each choice becomes two to four lines; with 50 choices the step is hundreds of pixels per screen of scrolling.
- **A native `<select>`.** It cannot draw a swatch in each option, so the colours would be names only.
- **Chips or a segmented button.** Segmented buttons suit up to five options; sixteen chips per row repeat the strip's problem.
- **"Paint" mode (pick a colour, then tap choices).** Quick for two choices, awkward to review and to use by keyboard, and it hides which choice has which colour.
- **A free colour picker (a hue and brightness area, or a hex box).** Outside the request, which asks for a predefined palette, and it would let in colours the bar derivation cannot make legible.

Also noticed: choice ids are reissued on every save (`service.ts:948`), so anything else that wants a stable choice identity (for example a colour kept when a label is renamed) cannot have one today.

# Clarifications

## Clarification## Where the Colors circle goes
[X] Resolved
The wizard has five circles (`Who`, `Title`, `Choices`, `How`, `When`) and Publish lives with the last. The new circle can sit after `Choices`, where its list of choices is freshest, or after `When`. The circle row's CSS is hard-wired to five columns either way (`admin.css:331`).
### Recommendation
#### Option 1
Insert `Colors` as step 4, after `Choices`: `Who`, `Title`, `Choices`, `Colors`, `How`, `When`.
- Pros: matches "this would be done after the Choices have been entered"; Next passes through it, so the "every step visited" rule for Publish needs no change; the choices are still on screen in the mind of the person.
- Cons: `How` and `When` become steps 5 and 6, so the step numbers in `lockStep`, `buildStepPanel`, the dates code and the wizard tests change.
#### Option 2
Append `Colors` as step 6, after `When`.
- Pros: steps 1 to 5 keep their numbers, so fewer edits and fewer test changes.
- Cons: colours come after the dates, away from the choices they decorate; the dates step stops being the last step.

Recommended: Option 1. The renumbering is mechanical, the order matches how a creator thinks, and the cost shows up as test edits rather than risk.

### RESOLUTION
Option 1 taken: `Colors` is step 4, after `Choices`: `Who`, `Title`, `Choices`, `Colors`, `How`, `When`. `How` and `When` become steps 5 and 6. Recorded on the recommendation, as no option was named in the accept; you chose Option 1 beforehand (2026-10-08 19:10).

## Clarification## Where manual colours are stored
[X] Resolved
The requirement expects a schema change to the poll table. A colour can instead be a property of each element of the existing `choices` jsonb array, which needs no migration at all. Choice ids are reissued on every save, so a separate list keyed by position or id must be rewritten in step with the choices each time.
### Recommendation
#### Option 1
A `color` property (the palette hex, absent for Automatic) on each element of `polls.choices`.
- Pros: no migration and no backfill (every existing poll is already "Automatic"); the colour cannot get out of step with its choice; the cached projection, the admin list row and the duplicate code already carry the whole object.
- Cons: not the "new empty field" the requirement assumed; the colour is not queryable on its own (nothing needs it).
#### Option 2
A new nullable column `choice_colors jsonb` on `polls`, added by migration 007.
- Pros: the field the requirement pictured; a clean place to add more per-poll colour settings later.
- Cons: a second structure to keep aligned with the choices by position on every save, duplicate and edit; one more column in the types, the row mappers, the projection and the admin list.

Recommended: Option 1. The point of the colour is to belong to its choice, and the jsonb array already does that with nothing to migrate.

### RESOLUTION
Option 1 taken: a `color` property (the palette hex, absent for Automatic) on each element of `polls.choices`; no migration. You chose Option 1 beforehand and then accepted (2026-10-08 19:12).

## Clarification## Colours after the first vote
[X] Resolved
Choices, choice mode and visibility are frozen once a poll has a vote; only the title, subtitle, dates, participant lists and voter limit can change then (`pollsApi.ts:418-432`). A colour does not change what a vote means, so it could stay editable.
### Recommendation
#### Option 1
Colours follow the choices: editable only until the first vote.
- Pros: one rule for the choices step and the colours step; `UPDATE_FIELDS` and the wizard's locks stay as they are; a poll's look cannot change under people who have already voted.
- Cons: a creator who forgets to colour a choice cannot do it once voting has started.
#### Option 2
Colours stay editable after votes, for the owner and administrators.
- Pros: a late fix is possible; colours never affect results.
- Cons: `UPDATE_FIELDS` and the `UPDATE`-mode wizard gain an exception; bars change colour under voters mid-poll.

Recommended: Option 1, for one rule and no change to the frozen-after-votes list. Choose Option 2 if late colouring matters more.

### RESOLUTION
Option 2 taken: colours stay editable after votes, for the owner and administrators, so `UPDATE_FIELDS` and the `UPDATE`-mode wizard gain an exception. You chose Option 1 and then Option 2 before accepting; Option 2 stands (2026-10-08 19:22).

## Clarification## How manual colours combine with automatic and Yes/No colours
[X] Resolved
Today a choice that reads as yes or no takes a fixed colour, and every other choice takes the next automatic palette entry in rank order. With a manual colour on some choices only, three things are open: whether a manual colour beats the Yes/No colours; whether the choices left on Automatic keep today's rules unchanged; and whether two choices may share a manual colour.
### Recommendation
#### Option 1
A manual colour always wins. A choice left on Automatic behaves exactly as today (Yes/No colour if its label reads that way, otherwise the next entry of the automatic list, which only those choices consume). Two choices may have the same manual colour.
- Pros: the smallest change; nothing about an Automatic choice moves; the creator is trusted (two candidates of one party can both be red).
- Cons: an Automatic bar can land close to a manual one (three of the 16 are within 11 to 16 RGB units of an automatic entry), and a manual `#00A636` sits near the Yes green.
#### Option 2
As Option 1, but an Automatic choice also skips any automatic entry that is close to a manual colour in the same poll.
- Pros: bars in one poll stay distinguishable.
- Cons: a "close" threshold to choose and test; automatic colours then depend on the manual ones, so changing one choice's colour can change another choice's.

Recommended: Option 1. It is predictable and small; if two bars look alike the creator can pick another colour.

### RESOLUTION
Option 1 taken: a manual colour always wins over the Yes/No colours and the automatic palette; a choice left on Automatic behaves exactly as today; two choices may share a manual colour. You chose Option 1 and then accepted (2026-10-08 19:25).

## Clarification## Legibility of text on the filled part of the bar
[X] Resolved
Text on the unfilled part of every one of the 16 colours reaches 7:1, but text over the filled part is below the project's 7:1 target for eight of them, and `#008488` is at 4.29:1, under the 4.5:1 level for normal text. The automatic palette already has the same shape (24 of 50 below 7:1, lowest 4.05). The hex codes are yours, taken from the image.
### Recommendation
#### Option 1
Keep all 16 colours exactly as drawn, and the existing derivation.
- Pros: the colours you chose; no new rule; the same behaviour as the automatic palette.
- Cons: `#008488`, `#7F7F7F` (4.60), `#FF0000` (4.80) and `#00A636` (4.92) give text that is only just legible over the fill.
#### Option 2
Keep the colours but darken the one below 4.5:1 (for example a teal near `#007A7E`), leaving the rest.
- Pros: every colour reaches at least 4.5:1; one hex changes.
- Cons: that swatch no longer matches the image; the other seven stay under 7:1.

Recommended: Option 1. It matches the existing palette's behaviour and your image; the fill covers the label only where a bar is long, and the label is also on the light track beyond it. Choose Option 2 if 4.5:1 is a hard floor for you.

### RESOLUTION
Option 2 taken: the teal `#008488` is replaced by `#007A7E` (checked with the card's own derivation: 4.88:1 over the fill, 7.07:1 on the track in light mode, 9.19:1 in dark mode); the other 15 colours stay exactly as drawn. You chose Option 2 and then accepted with `#007A7E` (2026-10-08 19:27).
