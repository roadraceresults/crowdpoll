# Overview: `specs/032-FIXED-POSITION-HEADER`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/032-FIXED-POSITION-HEADER` |
| Fix file created | 2026-10-14 17:46 |
| Last updated | 2026-10-15 16:04 |

Legend: `[ ]` open · `[X]` resolved · `[-]` resolved manually (or accepted as-is) by the developer.
Tick `No Tests` to postpone this fix's automated tests; leave it empty to have them written and run as usual.

"What's next" always returns the first `[ ]` item below.

The developer is expected to create the individual fix requirements in this file, and then run the `/speckit-fix` command to have the AI implement them, one at a time.  
Each fix requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Fixes

## FIX01 
[-] Resolved  
[ ] Run Tests  

The Maximized Poll Card page is esseentially always a single column Poll Card,  
so we want it to use the layout that is consistent with a single column Poll Card.

Also, let's set the maximized-space-right div to be blank for now, but still have the border it has now.

## FIX02 Brand Logo Icon
[X] Resolved  
[ ] Run Tests  

Change the Brand Logo Icon so that the "arrow" coming out of the speech bubble is on the right and pointing towards the content area  
as shown in the image:
![Brand Icon Arrow on Right](dontTrack/brand-logo-icon-02.jpg)

As before this will need to be converted to an SVG.
We have exited the sandbox so that this conversion can be done.

### RESOLUTION
The speech bubble's outline in the `.brand-logo` SVG (`src/public/app.js`, `SITE_HEADER_MARKUP`) is mirrored left to right (x → 120 − x), in both the `#FAFAFA` fill and the black stroke. The tail now leaves the bottom edge at x 78–96, with its tip at (100,116), so it points right toward the content. The figures, mask, colours, `<title>` and `<desc>` are unchanged, matching the reference image.  
Tests: tests postponed by the developer (No Tests). One test was added to `tests/client-header-fit.test.ts` ("puts the speech bubble's tail on the right, pointing toward the content"), asserting that the outline contains `H78 L100 116 L96 96` and no `L20 116`. It has not been run.  
Artifacts: none needed, because no 032 artifact describes the logo's shape. Prototypes and earlier features' documents still show the left-hand tail and were left as historical records.  
2026-10-14 19:19

## FIX03 Avatar Menu Icons

[X] Resolved
[ ] Run Tests

Make the avatar menu have the same appearance as the hamburger menu. i.e. resembling a Poll Card 

Give each item in the menu an icon as follows:
- Edit Profile: same as the default Avatar (a circle with a shilouette inside)
- Create Poll: save as the icon used for the Create Poll button in the header
- Poll Administration: the familiar circle with a gear inside
- Logout: resembling the image in `dontTrack/logout-icon.jpg`

### RESOLUTION
The avatar menu now looks like the hamburger (all-tabs) menu. In `src/public/header-tab-bar-m3.css`, the `.avatar-menu` rule has a surface background, a 1px outline-variant border, the corner-medium radius, a `0 2px 6px rgba(0,0,0,.15)` shadow, 4px vertical padding and a 200px minimum width. Its items have a 12px gap, `10px 16px` padding, the title-small size × `var(--tab-label-scale, 1)` and the on-surface-variant colour. The new `.avatar-menu-icon` rule sizes the icons at 24px and clips them to a circle.  
Icons, in `src/public/app.js`: `fillMenuItem(link, glyph, text)` puts an `svg.avatar-menu-icon` before a `span.avatar-menu-label`.
- Edit Profile: `PROFILE_GLYPH`, the default avatar's shapes.
- Create Poll: `CREATE_POLL_GLYPH`, which the header's `CREATE_POLL_NAV` now uses too.
- Poll Administration: `ADMIN_GLYPH`, a `var(--paper)` gear on a `currentColor` circle. Its teeth come from a dashed ring.
- Logout: `LOGOUT_GLYPH`, a door bracket and a right arrow on a `currentColor` circle, after `dontTrack/logout-icon.jpg`.

The disabled Create Poll item's reason now sits inside its label. In `src/public/header-single-column-m3.css`, the column layout moved from the link to `.avatar-menu-label`, so the icon stays beside both lines.  
Tests: tests postponed by the developer (No Tests). The type-check passes. Updated: `tests/client-home.test.ts` (menu labels are read from `.avatar-menu-label`), `tests/client-create-poll-item.test.ts` (the same, plus two new tests: every item has an icon and a label, Create Poll's icon matches the header's, and the reason is inside the label) and `tests/single-column-sheets.test.ts` (pins the label's column rule). None of these have been run.  
Artifacts: none needed. No 032 artifact describes the avatar menu, and the 030 contract for the phone Create Poll item (dimmed, focusable, with a reason) still holds.  
2026-10-14 19:28

## FIX04 Avatar Menu Bug
[X] Resolved
[ ] Run Tests

The image below shows that the avatar menu is being obscured by the task bar row.

![Avatar Menu](dontTrack/avatar-menu-bug-01.jpg)

### RESOLUTION
Cause: `header-fixed-m3.css` gave `#site-header` and `.tab-bar-wrap` the same `z-index:40`, which made each a separate layer. At equal z-index the later `.tab-bar-wrap` paints on top, so it covered everything hanging out of the header, including the avatar menu. The menu's own z-index only counts inside the header's layer, so it couldn't help.  
Fix: `src/public/header-fixed-m3.css` now has `#site-header{ top:0; z-index:41; }`, so the header and its avatar menu sit above the Tab Bar row. The Tab Bar stays above the cards.  
Tests: tests postponed by the developer (No Tests). `tests/header-fixed-sheet.test.ts` now expects `#site-header{ top:0; z-index:41; }` (its old `top:0` assertion would have failed), and the test's title says why. It has not been run.  
Artifacts: `contracts/ui-contracts.md` C3 (`#site-header` z-index 40 → 41, with the reason); `tasks.md` T004 (a note that FIX04 raised it).  
2026-10-14 19:38

## FIX05 Poll with Long Title
[X] Resolved
[ ] No Tests

While testing the current implementation, we discovered that polls with long titles caused the Poll Card to grow in width.  
See the screenshot below:
![Poll with Long Title](dontTrack/long-poll-title-bug.jpg) 

### RESOLUTION
Cause: `.question` and `.subtitle` only broke lines at spaces, so the shortest an unbroken title could be was the whole string. The card's grid item keeps the default minimum width (auto, meaning no narrower than its content), so the card grew past its column and spilled under its neighbour. This predates 032.  
Fix: `src/public/pollCard.css` gives `.question` and `.subtitle` `overflow-wrap:anywhere;`. A long unbroken run now breaks inside the card, and the card's minimum width drops, so it stays in its column. Titles with spaces still wrap at spaces.  
Tests: `tests/poll-card-assets.test.ts` gained "lets the question and the subtitle break inside an unbroken run, so a long title cannot widen the card", which checks the served `pollCard.css` rules. The developer ran `tests/poll-card-assets.test.ts` and `tests/m3-assets.test.ts` from a non-administrator terminal and both passed. An earlier run had failed because of a lookup bug in the new test itself, fixed before the passing run. Claude's session is elevated, so embedded PostgreSQL won't start there.  
Artifacts: `quickstart.md` manual check 8 (a 60-character unbroken title keeps its card inside its column).  
2026-10-14 21:49

## FIX06 Poll Card Title and Font
[X] Resolved
[ ] No Tests

## Title font-size
Try adjusting the CSS variable `--md-sys-typescale-title-large-size` 

>Set it to 20px for approval.  
>[ ] Approved

## Title Wrapping
If it possible, please make change to the CSS rules governing the Poll Card title so that it wraps around the Watch and Maximize icons as shown:
![Title Wrapping](dontTrack/title-wrapping.jpg)

### RESOLUTION
Title font size: `src/public/m3-tokens.css` now sets `--md-sys-typescale-title-large-size:20px` (it was 22px). The grid card's title is `clamp(18px, 1.8vw, 20px)`, and 0.75× that on a phone. The maximized card's title and the admin wizard summary also drop by 2px. The `Approved` box above is still yours to tick once you have looked at it.  
Title wrapping (Option A, CSS only): the markup, the button order and the focus order are unchanged. The new rules are in `src/public/pollCard-m3.css`:
- `.card-face .question-row` is now `display:block; position:relative` with `--title-icon-size:32px`, in place of `site.css`'s flex row.
- The Watch and Maximize buttons are `position:absolute; top:0`. Maximize sits at `right:0` and Watch at `right:calc(var(--title-icon-size) - 4px)`. The existing `-6px` margins keep them exactly where they were.
- `.question::before` is an empty right float, `height:1lh`, so only the first line is shortened. It is `calc(size + 2px)` wide, or `calc(2 × size + 4px)` when the row `:has(.bookmark-btn:not([hidden]))`.

`src/public/single-column-m3.css` sets `--title-icon-size:24px` for non-maximized cards in the phone block, to match its 24px buttons.  
Tests: `tests/m3-assets.test.ts` now expects the 20px token and has a new test, "wraps the card title around the Watch and Maximize icons, shortening only its first line". `tests/single-column-sheets.test.ts` has a new test, "shrink the room the title leaves for its icons to the 24 px buttons". The targeted run passed: 3 files, 77 tests, including `client-maximized.test.ts`'s title-row order test. The full suite passed: 83 files passed and 1 skipped; 1282 tests passed and 15 skipped.  
Artifacts: `quickstart.md` manual check 9 (the title wraps around its icons, at 20px).  
2026-10-15 03:05


## FIX07 Poll Card Title and Subtitle Max Length
[X] Resolved
[ ] No Tests

We are reducing the maximum length of the:
- Title to 50 Characters
- Subtitle to 30 Characters

Existing Title and Subtitle can be truncated on the server side if they exceed the new maximum lengths.  
When a new Title or Subtitle is entered, it should be validated against the new maximum lengths on the client side before submission.  
New Polls will have the max lengths (enforced by the Admin Poll Card Wizard) applied on the client side so that new "poll" table records in the database will be compliant with the new constraints.

### RECOMMENDATION
**What the code does now**
- **Server:** `src/polls/service.ts:31` sets `TITLE_MAX = 100`, and it is used for both the title and the subtitle (`:489`, `:492`).
- **Wizard:** `src/public/adminCard.js:436-437` already sets `TITLE_MAX = 50` and `SUBTITLE_MAX = 50`. At `:1176` an existing poll's subtitle gets `TITLE_MAX`, so its old 100-character text isn't cut off.
- **Database:** the `title` and `subtitle` columns are plain `text`. The search vector is a generated column, and OpenSearch is fed through `search_outbox`.
- **API description:** `postman/openapi.json` gives `maxLength: 100` for the title and subtitle in about five places.
- **Tests:** `tests/polls-admin-crud.test.ts:281` checks that a 101-character title is rejected.

**Recommended resolution**
1. **Server limits.** In `service.ts`, set `TITLE_MAX = 50` and add `SUBTITLE_MAX = 30`. Use it at `:492` and add it to `LIMITS`.
2. **Wizard.** In `adminCard.js`, set `SUBTITLE_MAX = 30` and use it for every subtitle, new or existing (`:1176`). Remove the comment about existing polls keeping 100 characters. The existing `maxlength` and character counter already stop typing at the limit, so they act as the browser-side check.
3. **Existing polls (Option A, recommended): a new migration, `src/db/migrations/007-title-lengths.ts`, registered in `migrations/index.ts`.**
   - It finds rows where `length(title) > 25 or length(subtitle) > 15`. That catches every row that could be over the limit when counted in UTF-16 units, the way the server counts. It then trims each value in TypeScript to 50 or 30 units, without splitting an emoji in half.
   - For each changed row it writes the new values and `content_version + 1`, and puts a `search_outbox` row in, so OpenSearch picks up the change. The PostgreSQL search vector updates by itself.
   - `down()` can't restore the cut text and does nothing.
   - The cached poll in Valkey will show the old title until it is next refreshed. I'd accept that.
4. **API description.** Change `postman/openapi.json` to `maxLength` 50 for the title and 30 for the subtitle.
5. **Tests.**
   - `tests/polls-admin-crud.test.ts:281`: 51 characters are rejected and 50 accepted; a subtitle of 31 is rejected and 30 accepted.
   - A migration test: seed rows that are too long (one with an emoji at the cut point), run the migration, and check the trimmed values, the `content_version` bump and the outbox rows.
   - The adminCard client test: the subtitle field has `maxLength` 30 on both new and existing polls.
   - Then the full suite.
6. **Artifacts.** This changes a requirement and isn't in 032's spec, so I'd add notes to `spec.md` (under Assumptions, citing FIX07) and to `quickstart.md`. The high-level requirements document that first set 100 characters may need the same change; I won't edit it unless you ask.

**Options for existing data**
- **A: one-time migration (recommended).**
  - Pros: the stored data meets the limits, so every reader, export and search agrees, and a later save never fails with "Title must be at most 50".
  - Cons: the extra text is cut off permanently.
- **B: cut the text when it is read.**
  - Pros: no data is lost and nothing is migrated.
  - Cons: the database stays out of line with the limits. Exports, search and the admin card would each need to cut the text, and saving an existing poll would be rejected until someone shortened it by hand.

Choose an option (A/B) and say "Apply it", or say "I resolved it" if you handle it yourself.  
2026-10-15 11:39

### RESOLUTION
Option A was applied.
- **Server:** in `src/polls/service.ts`, `TITLE_MAX` is now 50 (it was 100). A new `SUBTITLE_MAX` of 30 is used for the subtitle and added to `LIMITS`. A longer value is refused with `400 Title must be at most 50 characters.` (or `Subtitle … 30`).
- **Wizard:** `src/public/adminCard.js` sets `SUBTITLE_MAX = 30` and uses it for every poll. The existing-poll exception and its comment are gone. The fields' `maxlength` and the `n / max` counters stop typing at 50 and 30 before anything is sent.
- **Existing data:** a new migration, `src/db/migrations/007-title-lengths.ts`, is registered in `migrations/index.ts`.
  - It selects rows where `length(title) > 25 or length(subtitle) > 15` and trims them with `cutToLength`. That cuts to 50 or 30 UTF-16 units and drops a high surrogate left at the cut, so an emoji is never split in half.
  - Each changed row gets `content_version + 1` and a `search_outbox` row in one statement, so OpenSearch reindexes it. The PostgreSQL search vector is generated, so it follows by itself.
  - `down()` does nothing, because the cut text can't be restored.
  - A projection cached in Valkey shows the old title until it is next refreshed.
- **API description:** `postman/openapi.json` now gives `maxLength` 50 for the title and 30 for the subtitle in all five places.

Tests:
- New `tests/migration-title-lengths.test.ts` (4 tests): values are cut with a version bump and an outbox row, and rows already within the limits are untouched; an emoji at the cut point isn't split; a second run changes nothing; `cutToLength` handles its edge cases.
- `tests/polls-admin-crud.test.ts`: a 51-character title and a 31-character subtitle are refused, and 50 and 30 are accepted.
- `tests/client-admin-wizard.test.ts`: "keeps a stored subtitle longer than a new poll allows" was replaced by "caps the subtitle at 30 characters and the title at 50, on an existing poll as on a new one".

Results: the type-check passes. The targeted run passed: 4 files, 118 tests, including `server-boot.test.ts`'s migrate-from-fresh test. The full suite passed: 84 files passed and 1 skipped; 1286 tests passed and 15 skipped.

Artifacts: `spec.md` Assumptions and `plan.md` Summary (amended by FIX07), `tasks.md` T040, and `quickstart.md` manual check 10. This changes a requirement. The high-level requirements document that set 100 characters (feature 012's FR-002/003) may need the same change; it was not edited.  
2026-10-15 11:53

## FIX08 Bar Label Font Size
[X] Fixed
[ ] Run Tests

Change the font-size of class="result-label" of the bar label to 13px.

### RECOMMENDATION
**How the bar text is sized now**  
- The CSS `font-size:11px` on `.result-label` (`src/public/pollCard.css:241`) is always overridden by an inline style.  
- `renderPollResults` (`src/public/pollCard.js:784`) sets each label, and its `%` (`:790`), to `scaleFontSize(barHeight)`.  
  That runs from `RESULTS_FONT_MIN` (7px) to `RESULTS_FONT_MAX` (11px, reached at a 26px bar).  
  Bars are never shorter than 25px, so in practice the text is about 10.75–11px.  
- The voting face's `.vote-label` (`:893`) uses the same value, and so does the side padding (`scalePad`).  
- `designDocs/034-high-level-requirements-bar-font-size.md` is an unfinished requirement on the same subject.  

**Options**  
- **A: raise `RESULTS_FONT_MAX` from 11 to 13 in `pollCard.js` (recommended).**  
  - Pros: the label, its `%` and the voting face's label stay the same size, and the existing scaling still works.  
    It is a one-line change.  
  - Cons: the `%` and the voting labels grow as well, which goes beyond the literal requirement.  
    The padding grows from 10px to its 10px cap, so it doesn't change.  
- **B: set only `.result-label` to 13px.**  
  `renderPollResults` would set `label.style.fontSize = '13px'`, and `pollCard.css` would say `13px`.  
  - Pros: exactly what the requirement says.  
  - Cons: the `%` stays at 11px beside a 13px label, and the voting face's labels stay at 11px, so the two faces no longer match.  

**Tests (either option)**  
- `tests/poll-card-assets.test.ts`, or a client card test: a rendered results bar's `.result-label` has `style.fontSize` `13px` at a 50px bar.  
  - Option A also checks the `%` and the voting face's `.vote-label`.  
- The tests are written but not run, because `Run Tests` isn't ticked.  

**Artifacts**  
- `quickstart.md` gets a manual check (bar labels at 13px).  
- No 032 requirement covers the bar text, so `spec.md` and `plan.md` don't change.  
- This may overlap `designDocs/034-…`.  

Choose an option (A/B) and say "Fix", or say "I fixed it" if you handle it yourself.  
2026-10-15 13:06

### FIX ACCEPTED
Option A was applied.  
- `src/public/pollCard.js:132`: `RESULTS_FONT_MAX` went from 11 to 13.  
  `scaleFontSize` now runs from 7px to 13px, reaching 13px at a 26px bar.  
  So every results label, its percentage and every voting-face label is 13px on a bar of 26px or more.  
  The side padding stays at its 10px cap.  
  The CSS `font-size:11px` in `pollCard.css` is still overridden inline, so it wasn't changed.  

Tests: postponed (Run Tests not ticked).  
- `tests/client-maximized.test.ts` gained "writes a 50 px bar's label, percentage and voting label at 13 px".  
  It checks that all six text elements of a two-choice maximized card have `style.fontSize` `13px`.  
  It has not been run, so the fix is unverified by a run.  

Artifacts:  
- `quickstart.md` manual check 11 (bar text size).  
- `tasks.md` T041.  
- `spec.md` and `plan.md` were not changed, because no 032 requirement covers the bar text.  
- `designDocs/034-high-level-requirements-bar-font-size.md` covers the same subject and may need to take this into account.  

2026-10-15 13:08

## FIX09 Card Font Sizes at 900 px and Below  
[X] Fixed  
[ ] Run Tests  

For all browser widths 900px and less,
on the Poll Card (and Maximized Poll Card, and viting side) set the Title font-size to the same as it is for the browser width 640px and less (single poll card mode),
and set the Bar Title font-size (and % label and voting side) to match the size for the browser width 640px and less.

### RECOMMENDATION
**What the sizes are now**  
- **Title at 640 px and below:** a grid card's title is `calc(clamp(18px, 1.8vw, 20px) * 0.75)` (`single-column-m3.css:45`).  
  At these widths that works out to 13.5px.  
  A maximized card keeps 20px (`pollCard-m3.css`, `.maximized-card-flip .card-face .question`).  
- **Title from 641 to 900 px:** a grid card is 18px and a maximized card is 20px.  
  The voting face uses the same `.question` rules, so it follows whatever is set.  
- **Bar text at 640 px and below:** grid bars are fixed at 30px (`singleColumnBarLayout`), so `scaleFontSize` gives 13px every time (the FIX08 cap).  
- **Bar text from 641 to 900 px, and in a maximized card at any width:** bars run from 25 to 50px.  
  So the text is 13px except on 25px bars (many choices), where it is 12.625px.  
  The bar part of this fix is therefore already almost met.  

**Options**  
- **A: title by CSS, bar text pinned by JS (recommended).**  
  - `src/public/single-column-m3.css`: a new `@media (max-width: 900px)` block, placed right after the phone block, holding `.card-flip .card-face .question{ font-size:calc(clamp(18px, 1.8vw, var(--md-sys-typescale-title-large-size)) * 0.75); line-height:1.27; }`.  
    That is the phone expression, and it gives 13.5px at every width up to 900.  
    The `.card-flip` raises the rule above the maximized one, so the grid card, the maximized card and both faces all match.  
    The phone block's own `.question` rule is removed, because the new block covers it.  
  - `src/public/pollCard.js`: `scaleFontSize` returns `RESULTS_FONT_MAX` (13px) whenever `matchMedia('(max-width: 900px)')` matches, guarded the way `m3-ripple.js` guards `matchMedia`.  
    The results label, its `%` and the voting label are then 13px at 900 px and below, as on a phone.  
  - Pros: exactly what the requirement says, at every choice count.  
  - Cons: a second media query, in JS.  
    The bars change by at most 0.375px.  
- **B: the title CSS only.**  
  - Pros: one stylesheet edit.  
    The bars already match to within 0.375px.  
  - Cons: a card with many choices at 641–900 px, or maximized, still shows 12.625px bar text.  

**Tests (written, not run, because `Run Tests` isn't ticked)**  
- `tests/single-column-sheets.test.ts`:  
  - the new 900 px block holds the `.card-flip .card-face .question` rule with the 0.75 expression;  
  - the phone block no longer has it;  
  - the existing tab-block assertions still find their blocks.  
- Option A only: `tests/client-maximized.test.ts`.  
  With `matchMedia('(max-width: 900px)')` stubbed to match, a 50-choice maximized card (25px bars) writes 13px labels, percentages and voting labels.  
  Unstubbed, it writes 12.625px.  

**Artifacts**  
- `quickstart.md` gets manual check 12 (at 375, 640, 768 and 900 px: grid, maximized and voting titles 13.5px, bar text 13px; at 1024 px, unchanged).  
- `tasks.md` gets T042.  
- The 030/031 notes that tie the 0.75 scale to the phone block may need an "amended by FIX09" note in `specs/032-FIXED-POSITION-HEADER/plan.md`.  

Choose an option (A/B) and say "Fix", or say "I fixed it" if you handle it yourself.  
2026-10-15 13:21

### FIX ACCEPTED
Option B was applied: the title only, in CSS.  
- `src/public/single-column-m3.css`: a new `@media (max-width: 900px)` block holds `.card-flip .card-face .question{ font-size:calc(clamp(18px, 1.8vw, var(--md-sys-typescale-title-large-size)) * 0.75); line-height:1.27; }`.  
  - It sits between the two existing 900px blocks, so the tab-bar and Refresh-row tests still find theirs.  
  - At 900px and below this gives 13.5px, the phone size, on the grid card, the maximized card and both faces.  
  - It loads after `pollCard-m3.css` with the same specificity, so it overrides the maximized 20px rule.  
  - `line-height:1.27` replaces the maximized card's 28px.  
  - The phone block's own `.card-flip:not(.maximized-card-flip) .card-face .question` rule was removed, because the new block covers it.  
- Bar text was not changed.  
  It is already 13px except on 25px bars, where it is 12.625px.  

Tests: postponed (Run Tests not ticked).  
- `tests/single-column-sheets.test.ts` gained "give the title the phone's size from 900 px down, on the grid card, the maximized card and both faces".  
  It checks that exactly one 900px block holds the rule and that the phone block no longer has a `.question` rule.  
  It has not been run, so the fix is unverified by a run.  
- The type-check passes.  

Artifacts:  
- `quickstart.md` manual check 12.  
- `tasks.md` T042.  
- `spec.md` and `plan.md` were not changed, because no 032 requirement covers card type sizes.  

2026-10-15 13:24

## FIX10 Title Large Weight 600  
[X] Fixed  
[ ] Run Tests  
Change     --md-sys-typescale-title-large-weight to 600

### RECOMMENDATION
- `src/public/m3-tokens.css:136`: `--md-sys-typescale-title-large-weight` goes from `400` to `600`.  
  The token is read by the poll card's `.question` (`pollCard-m3.css:12`) and by the admin wizard summary's `.question` (`admin-card-m3.css:161`), so both titles become semi-bold.  
- Roboto is requested at `wght@400;500;700` only, so a 600 would be drawn with the 700 face.  
  `wght@400;500;600;700` is requested instead in the Google Fonts link of all seven pages: `index.html`, `login.html`, `create-account.html`, `profile.html`, `not-authorized.html`, `admin.html` and `admin-results.html`.  
  The prototypes are left alone.  
- Tests (written, not run, because `Run Tests` isn't ticked):  
  - `tests/m3-assets.test.ts:137` expects `family=Roboto:wght@400;500;600;700&display=swap`;  
  - a new check in the same file expects `--md-sys-typescale-title-large-weight:600;`.  
- Artifacts: `quickstart.md` manual check 13 (card and wizard titles in semi-bold Roboto), and `tasks.md` T043.  
2026-10-15 13:26

### FIX ACCEPTED
- `src/public/m3-tokens.css:136`: `--md-sys-typescale-title-large-weight` went from `400` to `600`.  
  The poll card title (`pollCard-m3.css`) and the admin wizard summary title (`admin-card-m3.css`) are now semi-bold.  
- `src/public/{index,login,create-account,profile,not-authorized,admin,admin-results}.html`: the Google Fonts link now asks for `family=Roboto:wght@400;500;600;700`, so a real 600 face is drawn instead of the 700 one.  
  The prototypes were not changed.  

Tests: postponed (Run Tests not ticked).  
- `tests/m3-assets.test.ts`:  
  - each page's font-request test expects `wght@400;500;600;700`;  
  - a new test, "draws Title Large semi-bold, at a weight every page loads", checks the token.  
- They have not been run, so the fix is unverified by a run.  
- The type-check passes.  

Artifacts:  
- `quickstart.md` manual check 13.  
- `tasks.md` T043.  

2026-10-15 13:26

## FIX11 Blank Maximized Side Panel  
[X] Fixed  
[ ] Run Tests  

For class="maximized-space-right" remove the filler text:
"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent sit amet malesuada ante. Curabitur feugiat aliquet ante vel hendrerit. Vestibulum vel viverra odio. Nam accumsan, nulla nec consequat elementum, nisi nunc tempor turpis, id convallis n...."

### RECOMMENDATION
**What is there now**  
- `src/public/index.html:134-145`: the `<template id="maximizedCardGrid">` puts ten Lorem ipsum `<p>`s in `.maximized-space-right`.  
- `pollCard-m3.css:305` gives the panel its border, surface background, 16px padding and type.  
  `tabs.css:214` gives it `align-self:flex-start`, so its height comes from its text.  
- `tests/client-maximized.test.ts:129` expects 10 paragraphs.  
- FIX01 asked for this panel to be blank but keep its border.  

**Common to both options**  
- Remove the ten `<p>`s, leaving `<div class="maximized-space-right"></div>`.  
- Delete the rules that only styled them: `.maximized-space-right p` in `pollCard-m3.css:317`, and `.maximized-space-right p` and `p:last-child` in `tabs.css:224-225`.  
- `client-maximized.test.ts:129` changes to expect an empty panel (`childElementCount` 0, no text).  

**Options**  
- **A: also stretch the panel to the card's height (recommended).**  
  In `pollCard-m3.css`'s `.maximized-space-right` rule, add `align-self:stretch;`, which overrides `tabs.css`'s `flex-start`.  
  - Pros: the blank panel stays a full bordered box beside the card, as it looked with text.  
  - Cons: when the grid wraps (narrow widths) it is a separate row, where stretch has no effect and the panel is only its padding tall.  
- **B: remove the text only.**  
  - Pros: exactly what the requirement says.  
  - Cons: with nothing inside, the panel shrinks to a 34px bordered strip (16px padding × 2 + border) at the top beside the card.  

**Tests (written, not run, because `Run Tests` isn't ticked)**  
- `tests/client-maximized.test.ts:129`: the panel is present and empty.  
- Option A also gets a check in `tests/m3-assets.test.ts` that `pollCard-m3.css`'s `.maximized-space-right` rule holds `align-self:stretch`.  

**Artifacts**  
- `quickstart.md` manual check 14 (a maximized card shows a blank bordered panel beside it).  
- `tasks.md` T044.  
- The 021 contract that describes the template's filler is historical and is not changed.  

Choose an option (A/B) and say "Fix", or say "I fixed it" if you handle it yourself.  
2026-10-15 13:30

### FIX ACCEPTED
Option A was applied.  
- `src/public/index.html`: the `maximizedCardGrid` template's `.maximized-space-right` is now an empty `<div>`.  
  Its ten Lorem ipsum paragraphs were removed.  
- `src/public/pollCard-m3.css`:  
  - the `.maximized-space-right` rule gains `align-self:stretch;`, so the bordered panel is as tall as the card beside it;  
  - the `.maximized-space-right p` rule was removed.  
- `src/public/tabs.css`: the `.maximized-space-right p` and `p:last-child` rules were removed.  
  Its `align-self:flex-start` is overridden by the later M3 layer.  

Tests: postponed (Run Tests not ticked).  
- `tests/client-maximized.test.ts`: the maximize test now expects the panel to have no children and no text, instead of 10 paragraphs.  
- `tests/m3-assets.test.ts` gained "stretches the blank panel beside a maximized card to the card's height".  
- They have not been run, so the fix is unverified by a run.  
- The type-check passes.  

Artifacts:  
- `quickstart.md` manual check 14.  
- `tasks.md` T044.  

2026-10-15 13:35

## FIX12 Maximize and Minimize Arrow Icons  
[X] Fixed  
[ ] Run Tests  

Rebuild the SVG for the "maximize-icon" to have the same rounded box outline as it has now,
but inside the box have 4 arrows pointing from the middle of the box to the corners. 

Also, rebuild the SVG for the "minimize-icon" to have the same rounded box outline as it has now,
but inside the box have 4 arrows pointing from the corners of the box to the middle.

### RECOMMENDATION
**What is there now**  
- `src/public/pollCard.js:1471-1472` (front face) and `:1533-1534` (voting face) draw both icons as filled traced paths in `viewBox="-2 -2 28 28"`.  
  The outline is a rounded 24 × 24 box about 1.5 units thick, corner radius about 5, with a gap at the lower left where a small filled square sits.  
  One diagonal arrow points to the upper right (the Minimize icon turns it 180°).  
- Nothing in the stylesheets sets `fill` or `stroke` on these icons;
  `site.css:776` sizes them at 24 px, and `single-column-m3.css:63` at 15 px on a phone grid card.  

**Change**  
- Replace each icon's paths, in both places, with one stroked outline and one stroked arrow path, keeping the class, `viewBox`, `aria-hidden`, `focusable` and `hidden` attributes:  
  - the box: `<rect x="0.75" y="0.75" width="22.5" height="22.5" rx="4.5"/>`, the same size, thickness and corners as now, but closed all round now that the small square is gone;  
  - Maximize: four arrows from the middle to the corners, `M10 10L5 5M5 9.5V5H9.5M14 10L19 5M14.5 5H19V9.5M10 14L5 19M5 14.5V19H9.5M14 14L19 19M19 14.5V19H14.5`;  
  - Minimize: four arrows from the corners to the middle, `M4.5 4.5L10 10M6 10H10V6M19.5 4.5L14 10M18 10H14V6M4.5 19.5L10 14M6 14H10V18M19.5 19.5L14 14M18 14H14V18`;  
  - each `<svg>` gets `fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`, so the icons keep following the button's colour.  
- No CSS or script change; `setMaximized` still toggles `hidden` on the two classes.  

**Tests (written, not run, because `Run Tests` isn't ticked)**  
- `tests/client-maximized.test.ts`: a new test checks that, on both faces, each icon has a rounded `rect` and four arrows (four `M` moves to a shaft start at the middle for Maximize, at a corner for Minimize).  

**Artifacts**  
- `quickstart.md` manual check 15 (the arrow icons at 24 px and 15 px).  
- `tasks.md` T045.  

2026-10-15 13:53
### FIX ACCEPTED
- `src/public/pollCard.js`: the `.maximize-icon` and `.minimize-icon` SVGs, on the front face and the voting face, were rebuilt as strokes in `currentColor` (width 1.5, round caps and joins).  
  They keep their classes, `viewBox="-2 -2 28 28"`, `aria-hidden`, `focusable` and the Minimize icon's `hidden`.  
  - Box: `<rect x="0.75" y="0.75" width="22.5" height="22.5" rx="4.5"/>`, with the same size, thickness and corners as before, now closed all round.  
  - Maximize: four arrows from the middle to the corners, with tips at (5,5), (19,5), (5,19) and (19,19).  
  - Minimize: four arrows from the corners to the middle, with tips at (10,10), (14,10), (10,14) and (14,14).  
- No CSS or script change.  
  `setMaximized` still toggles `hidden` on the two classes.  

Tests: postponed (Run Tests not ticked).  
- `tests/client-maximized.test.ts` gained "draws four arrows in a rounded box: out to the corners to maximize, in to the middle to minimize".  
  On both faces it checks the stroke, the `rx="4.5"` box and each icon's four arrow shafts.  
- It has not been run, so the fix is unverified by a run.  
- The type-check passes.  

Artifacts:  
- `quickstart.md` manual check 15.  
- `tasks.md` T045.  

2026-10-15 13:54

## FIX13 Two-Arrow Maximize and Minimize Icons  
[X] Fixed  
[ ] Run Tests  

Rebuild the SVG for the "maximize-icon" to have the same rounded box outline as it has now,
but inside the box have just 2 arrows pointing from the middle of the box to the top right corner and the bottom left corner. 

Also, rebuild the SVG for the "minimize-icon" to have the same rounded box outline as it has now,
but inside the box have just 2 arrows pointing from the top right corner and the bottom left corner of the box to the middle.

### RECOMMENDATION
- `src/public/pollCard.js` (front face and voting face): keep FIX12's stroked rounded box and attributes, and keep only the top-right and bottom-left arrows from each icon's arrow path:  
  - Maximize: `M14 10L19 5M14.5 5H19V9.5M10 14L5 19M5 14.5V19H9.5`, out to the top right and bottom left corners;  
  - Minimize: `M19.5 4.5L14 10M18 10H14V6M4.5 19.5L10 14M6 14H10V18`, in from those corners to the middle.  
- Tests (written, not run, because `Run Tests` isn't ticked): the FIX12 test in `tests/client-maximized.test.ts` expects two shafts per icon instead of four, and its title says two arrows.  
- Artifacts: `quickstart.md` manual check 15 and `tasks.md` T045 now describe two arrows.  

2026-10-15 13:57
### FIX ACCEPTED
- `src/public/pollCard.js`: on both faces, each icon keeps FIX12's stroked rounded box and now has two arrows instead of four.  
  - Maximize: `M14 10L19 5M14.5 5H19V9.5M10 14L5 19M5 14.5V19H9.5`, from the middle out to the top right and bottom left corners.  
  - Minimize: `M19.5 4.5L14 10M18 10H14V6M4.5 19.5L10 14M6 14H10V18`, from those corners in to the middle.  

Tests: postponed (Run Tests not ticked).  
- `tests/client-maximized.test.ts`: the FIX12 test is renamed "draws two arrows in a rounded box: out to the top right and bottom left corners to maximize, in from them to minimize".  
  It now expects two shafts per icon.  
- It has not been run, so the fix is unverified by a run.  

Artifacts:  
- `quickstart.md` manual check 15.  
- `tasks.md` T045.  

2026-10-15 13:57

## FIX14 Bolder Maximize and Minimize Icons  
[X] Fixed  
[ ] Run Tests  
Rebuild the SVG for the "maximize-icon" and the "minimize-icon" so that the outline and the arrows are more bold.

### RECOMMENDATION
- `src/public/pollCard.js`, all four icon SVGs on both faces:  
  - `stroke-width` goes from `1.5` to `2.25`, half as heavy again.  
    It is about 1.9 px at the 24 px size and 1.2 px at the phone's 15 px, up from 1.3 px and 0.8 px.  
  - The box becomes `<rect x="1.125" y="1.125" width="21.75" height="21.75" rx="4.125"/>`, so its outer edge (0 to 24) and outer corner radius (5.25) stay where they are and the extra weight grows inward.  
  - The arrow paths are unchanged.  
    Their round caps stay clear of the box's inner edge.  
- Tests (written, not run, because `Run Tests` isn't ticked): the icon test in `tests/client-maximized.test.ts` expects `stroke-width="2.25"` and the box's `rx="4.125"`.  
- Artifacts: `tasks.md` T045 records the weight.  

2026-10-15 13:59

### FIX ACCEPTED
- `src/public/pollCard.js`: the Maximize and Minimize icons on both faces now have `stroke-width="2.25"` (was `1.5`).  
  The box is now `<rect x="1.125" y="1.125" width="21.75" height="21.75" rx="4.125"/>`, so its outer size and corners are unchanged and the extra weight grows inward.  
  The arrow paths are unchanged.  

Tests: postponed (Run Tests not ticked).  
- `tests/client-maximized.test.ts`: the icon test now checks `stroke-width="2.25"` and `rx="4.125"`.  
- It has not been run, so the fix is unverified by a run.  

Artifacts:  
- `tasks.md` T045.  

2026-10-15 13:59

## FIX15 Highlight Maximize Icon on Card Hover  
[X] Fixed  
[ ] Run Tests  

We want to highlight the maximize-icon on a Poll Card when the user mouses over a Poll Card.  
The suggested implementation is found in "dontTrack/maximize-icon.html".

### RECOMMENDATION
**What is there now**  
- `dontTrack/maximize-icon.html` does not exist.  
  The suggestion is taken from `dontTrack/maximize-hint.html`, the closest match.  
- That file does not highlight on hover.  
  It pulses one card's button (marked `data-hint`) all the time and shows a "Maximize Poll" label above it until the first click.  
  The dismissal is remembered in `localStorage` (`maximizeHintDismissed`).  
- The card's Maximize button (`pollCard-m3.css:65-98, 200-262`) already uses its `::before` for the Material 3 state layer and has `overflow:hidden`.  
  The suggestion's `::before` pulse and its label would therefore be clipped, or would collide with that layer, and must move to the button's own `box-shadow`.  
- The button already gets a "Maximize Poll Card" tooltip (`tooltip-m3.js`) when the pointer is on the button itself.  

**Options**  
- **A: pulse the icon while the pointer is over the card (recommended).**  
  In `pollCard-m3.css`, add `@media (hover:hover)` with `.card-flip:not(.maximized-card-flip) .card-face:hover .maximize-btn`: colour `var(--md-sys-color-primary)` and the suggestion's `maximize-pulse` animation (1.8 s, ease-out, infinite) on the button's own `box-shadow`.  
  The ring is 8 px rather than 12 px so the card edge does not clip it, and its colour comes from `color-mix` of the primary token.  
  Under `prefers-reduced-motion: reduce` it becomes a static 4 px glow.  
  CSS only: no label, no `localStorage`, no script.  
  - Pros: exactly what the requirement says, on every card, for every visitor.  
  - Cons: the pulse comes back each time a card is hovered, even for people who already know the button.  
- **B: A, plus the suggestion's "Maximize Poll" label until first use.**  
  `pollCard.js` adds a `.maximize-hint` span to the front-face button and hides it for good after the first maximize, using `localStorage`, as `app.js` already does for the cookie banner.  
  The label shows only on card hover, and the button's `overflow:hidden` is lifted for it.  
  - Pros: teaches the button once, then stops.  
  - Cons: it duplicates the existing tooltip, adds script and per-device state, and lifting `overflow` affects the state layer's clipping.  
- **C: the suggestion as written.**  
  It ignores hover: one card's button pulses with the label until its first click, remembered in `localStorage`.  
  - Pros: matches the file.  
  - Cons: it is not the hover behaviour the requirement asks for, and a permanent pulse is distracting in the grid.  

**Tests (written, not run, because `Run Tests` isn't ticked)**  
- A: `tests/m3-assets.test.ts` checks that `pollCard-m3.css` holds the hover rule inside `@media (hover:hover)`, the `maximize-pulse` keyframes and the reduced-motion fallback.  
- B: as A, and `tests/client-maximized.test.ts` checks that the label is there before the first maximize and gone after it (and after a reload).  

**Artifacts**  
- `quickstart.md` manual check 16.  
- `tasks.md` T046.  

Type or Say an option (A/B/C) and "Fix", or "I fixed it" if you handle it yourself.  
2026-10-15 14:33

### FIX ACCEPTED
Option B was applied, with one change from its description.  
The label is a sibling of the button, not its child, so the button's `overflow:hidden` (which clips its state layer and ripple) is left alone.  
The label sits below the icon rather than above it, because the card clips anything above its top edge.  
- `src/public/pollCard-m3.css`, appended:  
  - `.maximize-hint{ display:none; }` by default;  
  - inside `@media (hover:hover)`, for `.card-flip:not(.maximized-card-flip) .card-face:hover`, the Maximize button turns `var(--md-sys-color-primary)` and runs `maximize-pulse` (1.8 s, ease-out, infinite).  
    The pulse is an 8 px ring on the button's own `box-shadow`, `color-mix`ed from the primary token.  
  - in the same block, the label shows below the icon (`top:calc(var(--title-icon-size) + 6px)`, right-aligned, with an arrow pointing up) in inverse-surface colours at label-medium size, and fades in with `maximize-hint-in`;  
  - `.maximize-btn:hover + .maximize-hint` hides it while the button's own tooltip shows;  
  - under `prefers-reduced-motion: reduce`, the pulse becomes a still 4 px glow and the label does not animate.  
- `src/public/pollCard.js`:  
  - the front face's `.question-row` gains `<span class="maximize-hint" aria-hidden="true">Maximize Poll</span>` after the Maximize button;  
  - `MAXIMIZE_HINT_KEY`, `maximizeHintDismissed()` and `dismissMaximizeHint()` read and write `localStorage` inside `try`, as `app.js` does for the cookie banner;  
  - `requestMaximize` (the button and the title or subtitle) calls `dismissMaximizeHint()`, which stores `'1'` and removes every `.maximize-hint` on the page;  
  - a card created once the key is set removes its own label straight away.  
- The pulse stays after first use;  
  only the label goes.  

Tests: postponed (Run Tests not ticked).  
- `tests/client-maximized.test.ts`: "labels the front Maximize button until the first maximize, then never again on this device".  
  It checks the label and its place, that maximizing removes every label and stores the key, and that a Newest card created later has no label.  
- `tests/m3-assets.test.ts`: "pulses the Maximize button and shows its label while a pointer is over a grid card".  
- They have not been run, so the fix is unverified by a run.  
- The type-check passes.  

Artifacts:  
- `tasks.md` T046.  
- `quickstart.md` manual check 16.  

2026-10-15 14:37

## FIX16 Maximize Hint Above the Icon  
[X] Fixed  
[ ] Run Tests  
Regarding the Maximize hint on hover, is it possible to make the label appear above the icon instead of below it, while still keeping it visible and not clipped by the card?  
If so, please implement it.

### RECOMMENDATION
**Yes.**  
Nothing on the card clips above its top edge.  
- `.card-face` (`pollCard.css:111`) has no `overflow`;  
  only `.bar-scroll-inner`, `.result-row` and the scroll lists inside it clip.  
- `.card-viewport` and `.card-flip` do not clip either.  
- `.card-grid` has an 18 px gap, and `.page`'s `overflow-x:clip` is horizontal only.  
- Each `.card-viewport` is `position:relative; z-index:1`, so a later card paints over an earlier one.  
  The hovered card's label therefore lies over the row above it, not under it.  
- FIX15's reason for putting the label below ("the card clips anything above its top edge") was wrong.  

**Change**, in `src/public/pollCard-m3.css`'s hover rule for `.maximize-hint`:  
- `top:calc(var(--title-icon-size) + 6px)` becomes `top:-6px; translate:0 -100%;`.  
  The question row's top is the button's top, so the label sits 6 px above the icon, right-aligned to it.  
  `translate` is used rather than `transform`, so it does not conflict with the entrance animation.  
- The arrow (`.maximize-hint::after`) moves to `top:100%`, with `border-top-color`, so it points down at the icon.  
- `maximize-hint-in` starts from `translateY(4px)`, rising into place as the suggestion does.  
- The label pokes about 15 px above the card, into the grid gap.  
  On the first row, it can go under the fixed header and tab bar (z-index 40/41) only when the page is scrolled so that the card's top is just below them.  

**Tests (written, not run, because `Run Tests` isn't ticked)**  
- `tests/m3-assets.test.ts`: the hover test also expects `top:-6px; translate:0 -100%;` in the label rule and `border-top-color` on its arrow.  

**Artifacts**  
- `tasks.md` T046 and `quickstart.md` manual check 16 now say "above".  

2026-10-15 14:45

### FIX ACCEPTED
- `src/public/pollCard-m3.css`:  
  - the hover rule for `.maximize-hint` now has `top:-6px; translate:0 -100%;` in place of `top:calc(var(--title-icon-size) + 6px)`, so the label sits 6 px above the icon, right-aligned to it;  
  - `.maximize-hint::after` is at `top:100%` with `border-top-color`, so its arrow points down at the icon;  
  - `maximize-hint-in` starts from `translateY(4px)`, so the label rises into place.  
- Nothing on the card clips it.  
  It extends about 15 px into the grid gap, over the row above, because a later card paints over an earlier one.  
- FIX15's reason for putting the label below was mistaken.  

Tests: postponed (Run Tests not ticked).  
- `tests/m3-assets.test.ts`: the hover test now checks the label's `top:-6px; translate:0 -100%;` and the arrow's `top:100%` / `border-top-color`.  
- It has not been run, so the fix is unverified by a run.  

Artifacts:  
- `tasks.md` T046.  
- `quickstart.md` manual check 16.  

2026-10-15 14:44

## FIX17 Maximize Hint Points at the Icon  
[X] Fixed  
[ ] Run Tests  
fix requirements...
The maximize hint text should be move to point directly at the icon. 
The image below show that it points too far to the left.  
![Maximize icon hover text](dontTrack/maximize-icon-hover-text.jpg)  

Also, move it slightly upward a few pixels.

### RECOMMENDATION
**Why it misses**  
- The label is `right:0` in `.question-row`, and its arrow (`.maximize-hint::after`) is `right:11px`, 10 px wide, so its tip is 16 px in from the row's right edge.  
- The button is `right:0` with `margin:-6px -6px 0 0` (`pollCard-m3.css:77`), so it is shifted 6 px right and 6 px up.  
  It is `--title-icon-size` wide: 32 px, or 24 px at 900 px and below (`single-column-m3.css:59-60`, the screenshot).  
  Its centre is therefore `--title-icon-size / 2 - 6px` from the row's right edge: 10 px, or 6 px, and the arrow lands 6–10 px to the left, toward the Watch eye.  
- With `top:-6px`, the label's bottom sits at the button's top, so the 5 px arrow overlaps the button.  

**Change**, in `src/public/pollCard-m3.css`'s hover rule for `.maximize-hint`:  
- `right:0` becomes `right:calc(var(--title-icon-size) / 2 - 22px)` (−6 px, or −10 px at 900 px and below).  
  The arrow, still 11 px from the label's edge, then sits on the button's centre at either size.  
  The label reaches up to 10 px into the card's 20–22 px side padding.  
- `top:-6px` becomes `top:-14px`, which raises the label 8 px.  
  The arrow's tip ends 3 px above the button's box, about 7–8 px above the drawn icon.  
- The arrow rule is unchanged.  

**Tests (written, not run, because `Run Tests` isn't ticked)**  
- `tests/m3-assets.test.ts`: the hover test expects `top:-14px; translate:0 -100%; right:calc(var(--title-icon-size) / 2 - 22px);`.  

**Artifacts**  
- `tasks.md` T046 records that the arrow is centred on the icon.  

2026-10-15 14:52

### FIX ACCEPTED
- `src/public/pollCard-m3.css`, the hover rule for `.maximize-hint`:  
  - `right:0` became `right:calc(var(--title-icon-size) / 2 - 22px)`, so the arrow sits on the Maximize button's centre: −6 px with the 32 px button, −10 px with the 24 px one at 900 px and below;  
  - `top:-6px` became `top:-14px`, so the label is 8 px higher and the arrow's tip clears the button.  
- The arrow rule is unchanged.  

Tests: postponed (Run Tests not ticked).  
- `tests/m3-assets.test.ts`: the hover test now checks `top:-14px` and the new `right`.  
- It has not been run, so the fix is unverified by a run.  

Artifacts:  
- `tasks.md` T046.  

2026-10-15 14:51

## FIX18 Maximize Tooltip Above the Icon  
[X] Fixed  
[ ] Run Tests  
Is it possible to move the tooltip for the Maximize Icon so that it is above the icon?  
The reason is that the text is obscured by the mouse pointer when it hovers over the icon.  

![Maximize poll card tooltip](dontTrack/maximize-poll-card-tooltip.jpg)

### RECOMMENDATION
**Yes.**  
- The tooltip is the single `.m3-tooltip` that `src/public/tooltip-m3.js` positions, fixed, from the anchor's box in `place()`.  
  It always goes `GAP_PX` (4 px) below the anchor, and goes above only when there is no room below.  
- The pointer's arrow hangs down and to the right from its hotspot, so a label below an icon is under the pointer.  
- With the tooltip above, it also takes the place of FIX15–17's "Maximize Poll" label, which hides while the pointer is on the button.  

**Options**  
- **A: above for the Maximize button only (recommended).**  
  - The two `.maximize-btn` buttons in `src/public/pollCard.js`'s markup get `data-tooltip-placement="above"`.  
  - In `place()`, an anchor with that attribute goes `box.top - GAP_PX - height`, falling back to below when that would pass `EDGE_PX` at the top of the viewport.  
    That is the mirror of today's rule.  
  - The tooltip (z-index 1000) shows over the fixed header (40/41) if the card is just under it.  
  - Pros: exactly what was asked, one attribute and three lines, and every other tooltip is unchanged.  
  - Cons: the Watch eye beside it, and other icon buttons, still put their tooltip under the pointer.  
- **B: above for every control.**  
  - In `place()`, above becomes the first choice and below the fallback, for all tooltips (tab labels, header buttons, card icons, cut-off bar labels).  
  - Pros: the pointer never covers any tooltip, consistently.  
  - Cons: it changes every tooltip on every page.  
    Tabs and header buttons near the top of the viewport would mostly fall back to below anyway, so the placement would vary by position.  

**Tests (written, not run, because `Run Tests` isn't ticked)**  
- `tests/client-m3-tooltip.test.ts`: with the anchor's `getBoundingClientRect` and the tooltip's size stubbed, the tooltip's `top` is above the anchor.  
  It falls back to below when the anchor is at the top of the viewport.  
  - A: one test for a `data-tooltip-placement="above"` anchor, and one that an anchor without it still goes below.  
  - B: the same two for any anchor.  
- A also gets a check in `tests/client-maximized.test.ts` that both Maximize buttons carry the attribute.  

**Artifacts**  
- `quickstart.md` manual check 17.  
- `tasks.md` T047.  

Type or Say an option (A/B) and "Fix", or "I fixed it" if you handle it yourself.  
2026-10-15 14:57

### FIX ACCEPTED
Option B was applied.  
- `src/public/tooltip-m3.js`, `place()`: the tooltip now goes `GAP_PX` (4 px) above its control first (`box.top - GAP_PX - height`).  
  It goes below only when above would pass `EDGE_PX` at the top of the viewport and below has room.  
  The horizontal centring and the edge clamps are unchanged.  
- This applies to every tooltip on every page.  
  It changes 024's FR-018 ("centred 4px below its control, above it when there is no room"), which now reads the other way round.  
  024's spec and its design document were left as historical records.  

Tests: postponed (Run Tests not ticked).  
- `tests/client-m3-tooltip.test.ts`: "sit above their control, where the pointer does not cover them, and below only when there is no room above".  
  With the viewport, the tooltip's size and the Maximize button's box stubbed, it checks `top` 272 px and `left` 456 px for a button at 300 px.  
  It also checks the fallback to 46 px below a button at 10 px.  
- It has not been run, so the fix is unverified by a run.  

Artifacts:  
- `tasks.md` T047.  
- `quickstart.md` manual check 17.  

2026-10-15 14:58

## FIX19 Cards Below the Hamburger and Refresh Row  
[X] Fixed  
[ ] Run Tests  

The Hamburger and Refresh icons' positions are shown in the image below.
![Hamburger and Refresh Icons Position](dontTrack/hamburger-refresh-icons-position.jpg)

We want the poll cards to start rendering below the fixed header, ensuring they are not obscured by the Hamburger and Refresh icons.  
Also, ensure that the "Log In" button and the "Create Account to Vote" button are initially place to the right of the "refresh" icon so that it isn't obscured. 

While we are at it, let's change the "Create Account to Vote" text to be title case, i.e. "Create Account To Vote".
### RECOMMENDATION
**Why the cards are covered**  
- At 900 px and below, the Hamburger (`.tab-menu-btn`) and Refresh (`.tab-refresh--icon`) sit in a row *under* `.tab-bar-wrap`.  
  Each is absolutely positioned at `top:calc(100% + var(--refresh-gap))`.  
  `single-column-m3.css:119` reserves that row with `margin-bottom:calc(40px + var(--refresh-gap) * 2)` (60 px).  
- Since 032 the wrap is `position:fixed`, so that margin no longer pushes anything down.  
  `fixedChrome.js` measures `wrap.offsetHeight`, which leaves the margin out, so `--fixed-chrome-height` is 60 px short.  
  `.container`'s `padding-top` (20 px, or 32 px above 640 px) cannot clear the row, and the cards start under the icons, as the screenshot shows.  
  `tabs.js`'s maximize scroll and `floatingActions.js`'s clamp read the same short height.  
- The row has no background, so while scrolling the cards would show between the icons even once they start lower.  

**Common to both options**  
- `src/public/fixedChrome.js`, `measure()`: the total adds the wrap's computed `margin-bottom`, i.e. `header + wrap.offsetHeight + parseFloat(getComputedStyle(wrap).marginBottom)`.  
  It is 0 above 900 px, where `tabs.css`'s 20 px margin is replaced by the container's own 32 px.  
  > Check: `tabs.css` gives the wrap `margin-bottom:20px` at every width, so above 900 px the total would grow by 20 px too.  
  > To keep 1400 px unchanged (R5), `header-fixed-m3.css` sets `.tab-bar-wrap{ margin-bottom:0; }` outside the 900 px block, and `single-column-m3.css`'s 900 px rule still wins there because it loads later.  
- `src/public/header-fixed-m3.css`, inside `@media (max-width: 900px)`, adds `.tab-bar-wrap::before{ content:''; position:absolute; left:0; right:0; top:100%; height:calc(40px + var(--refresh-gap) * 2); background:var(--paper); }`.  
  The pinned row then hides the cards scrolling under it.  
  `::after` is already the line under the tabs, and the icons come later in the wrap, so they paint above it.  
- `src/public/app.js:410`: "Create Account to Vote" becomes "Create Account To Vote".  

**Options for the guest buttons (phone width, below 640 px)**  
- **A: start them in the row, just left of Refresh (recommended).**  
  I read "to the right of the refresh icon" as next to it on its left, since Refresh is at the far right.  
  - `floatingActions.js`:  
    - `startPosition` puts the pair 8 px left of the Refresh icon's box, vertically centred on it, when the icon is shown;  
    - `cardArea().top` becomes the bottom of the tab bar (`.tab-bar-wrap`'s box), not the total chrome height, so that start is inside the area and the pair can be dragged back up into the row;  
    - the pair still cannot reach the tabs or the header.  
  - `.floating-actions` `z-index` goes from 15 to 42, above the pinned row's background.  
  - Pros: the buttons fill the empty space between the icons, and cover no card and no icon.  
  - Cons: at 320 px the pair (about 210 px) only just fits between the 40 px icons, and a drag can put the pair over the Hamburger.  
- **B: start them below the row.**  
  This needs no change to `floatingActions.js`: with the corrected height, the clamp starts the pair 4 px under the row, at the top right of the cards.  
  - Pros: smallest change.  
  - Cons: the pair covers the first card's Watch and Maximize icons, as it did before 032.  

**Tests (written, not run, because `Run Tests` isn't ticked)**  
- `tests/client-fixed-chrome.test.ts`: with the wrap's `margin-bottom` stubbed at 60 px, `--fixed-chrome-height` is header + wrap + 60.  
- `tests/header-fixed-sheet.test.ts`: the 900 px `::before` row background, and `margin-bottom:0`.  
- `tests/client-floating-actions.test.ts`:  
  - the labels become "Create Account To Vote";  
  - A: the pair starts left of a stubbed Refresh box, and `cardArea` lets it sit in the row.  

**Artifacts**  
- `spec.md`: the edge case on the floating buttons (line 97) and the label.  
- `contracts/ui-contracts.md`: the chrome-height contract includes the row.  
- `quickstart.md` manual check 18.  
- `tasks.md` T048.  
- The text change also touches feature 030's documents, which are left as they are.  

Type or Say an option (A/B) and "Fix", or "I fixed it" if you handle it yourself.  
2026-10-15 15:12

### FIX ACCEPTED
Option A was applied.  
- `src/public/fixedChrome.js`, `measure()`: the Tab Bar's term is now `wrap.offsetHeight + (parseFloat(getComputedStyle(wrap).marginBottom) || 0)`.  
  From 900 px down, `--fixed-chrome-height` includes the 60 px Hamburger/Refresh row, so `.container` starts the cards below it, and `tabs.js`'s maximize scroll and the floating clamp clear it too.  
  Above 900 px the margin is already 0 (`header-fixed-m3.css`'s `margin:0 auto`), so 1400 px is unchanged.  
  The planned `margin-bottom:0` rule was not needed.  
- `src/public/header-fixed-m3.css`: inside `@media (max-width: 900px)`, `.tab-bar-wrap::before` paints `var(--paper)` over the row (`top:100%`, `calc(40px + var(--refresh-gap) * 2)` tall), so cards scroll under it.  
- `src/public/floatingActions.js`:  
  - `dockPosition()` places the pair 8 px (`FLOAT_ROW_GAP`) left of `.tab-refresh--icon`, centred on it, while that icon has a box;  
  - a `docked` flag keeps it there: `keepInsideCardArea` leaves it alone on scroll, the first drag undocks it and clamps it to the card area, and a resize that leaves an undocked pair outside the area sends it back to the row;  
  - with Refresh hidden (the Live Results tab) the pair starts at the top right of the cards, as before.  
  - This differs from the option's description: `cardArea().top` was not changed.  
    Changing it would have broken the existing "pushed down when scrolling brings the top of the cards under it" behaviour, so a dragged pair cannot be dragged back into the row.  
- `src/public/single-column-m3.css`: `.floating-actions` `z-index` 15 → 42, above the pinned row.  
  A pair dragged over the cards now also sits above an open Hamburger menu (z-index 40 context).  
- `src/public/app.js`: "Create Account to Vote" → "Create Account To Vote".  

Tests: postponed (Run Tests not ticked).  
- `tests/client-fixed-chrome.test.ts`: "adds the Tab Bar's bottom margin, the row the pinned bar reserves, to the total but not to the header".  
- `tests/header-fixed-sheet.test.ts`: "pins a background behind the Hamburger and Refresh row from 900 px down, so cards scroll under it".  
- `tests/client-floating-actions.test.ts`:  
  - labels read "Create Account To Vote";  
  - "starts in the row, 8 px left of Refresh and centred on it, and stays there while the cards scroll";  
  - "leaves the row when dragged, into the card area below it, and goes back to the row on a resize that leaves it outside".  
- They have not been run, so the fix is unverified by a run.  
- The type-check passes.  

Artifacts:  
- `spec.md`: the label in the Q at line 22, the edge case at line 97 and FR-008.  
- `data-model.md`: `--fixed-chrome-height`.  
- `contracts/ui-contracts.md`: C4 and C5.  
- `plan.md`: the `floatingActions.js` line.  
- `tasks.md` T048.  
- `quickstart.md` manual check 18.  
- Feature 030's documents still say "Create Account to Vote" and were left as historical records.  

2026-10-15 15:18

## FIX20 Docked Guest Buttons Follow the Chrome  
[X] Fixed  
[ ] Run Tests  

The "login" and "Create Account To Vote" buttons are now positioned too far upwards when the page is refreshed, as shown in the image below:
![Login and Create Account Buttons](dontTrack/login-create-account-buttons.jpg)
### RECOMMENDATION
**Why they sit too high**  
- `floatingActions.js` docks the pair (FIX19) from the Refresh icon's box when it first runs, at script start.  
- At that moment `fixedChrome.js` has not measured yet, because its `measure()` runs on the next animation frame.  
  `.tab-bar-wrap` is still at `top:var(--fixed-chrome-height-header,0px)`, i.e. 0, so Refresh, and with it the pair, sits one header height too high.  
- The wrap then moves down, and moves again when fonts load or `headerFit.js` changes the header, but a docked pair is never re-placed.  
  Only a window resize re-docks it.  

**Change**  
- `src/public/fixedChrome.js`: at the end of `measure()`, `window.dispatchEvent(new Event("fixedchromechange"))`, so anything that depends on where the pinned chrome sits can follow it.  
- `src/public/floatingActions.js`: `window.addEventListener("fixedchromechange", …)` calls `placeFloatingActions()` when the pair is shown and docked.  
  `placeFloatingActions()` already re-homes a docked pair, and falls back to the top right of the cards when Refresh has no box.  
  An undocked (dragged) pair is left where it is.  

**Tests (written, not run, because `Run Tests` isn't ticked)**  
- `tests/client-fixed-chrome.test.ts`: `measure()` dispatches `fixedchromechange` on `window`.  
- `tests/client-floating-actions.test.ts`:  
  - a docked pair follows Refresh when it moves down and `fixedchromechange` fires;  
  - a dragged pair does not.  

**Artifacts**  
- `contracts/ui-contracts.md` C4: the event.  
- `tasks.md` T049.  
- `quickstart.md` manual check 18: the pair is beside Refresh after a reload.  

2026-10-15 15:22

### FIX ACCEPTED
- `src/public/fixedChrome.js`: `measure()` ends with `window.dispatchEvent(new Event("fixedchromechange"))`.  
- `src/public/floatingActions.js`: a `fixedchromechange` listener calls `placeFloatingActions()` while the pair is shown and docked.  
  The pair therefore re-docks beside Refresh each time the pinned chrome is measured: on load, after fonts load, or when the header is rebuilt or resized.  
  A dragged pair is left where it is.  

Tests: postponed (Run Tests not ticked).  
- `tests/client-fixed-chrome.test.ts`: "dispatches fixedchromechange on window after each measurement".  
- `tests/client-floating-actions.test.ts`: "follows Refresh when the fixed chrome is re-measured while docked, and not once dragged".  
  The describe's Refresh box is now reset before each test.  
- They have not been run, so the fix is unverified by a run.  

Artifacts:  
- `contracts/ui-contracts.md` C4.  
- `tasks.md` T049.  
- `quickstart.md` manual check 18.  

2026-10-15 15:21

## FIX21 Smaller Refresh and Shorter Icon Row  
[X] Fixed  
[ ] Run Tests  

Make the "refresh" icon 30X30 pixels rather than 40X40.
Then move both the "refresh" and "hamburger" icons upwards by 10 pixels,  
and reduce the height of the fixed row they are in by 10 pixels.
### RECOMMENDATION
**Now (900 px and below, `single-column-m3.css`)**  
- The row is `margin-bottom:calc(40px + var(--refresh-gap) * 2)` = 60 px, and `--refresh-gap` is 10 px.  
- The 40 × 40 Hamburger and Refresh both sit at `top:calc(100% + var(--refresh-gap))`, with centres 30 px below the tab bar.  
- The Hamburger menu is at `top:calc(100% + var(--refresh-gap) + 40px)`.  
- FIX19's pinned background (`header-fixed-m3.css`) has the same 60 px height.  

**Change** (only at 900 px and below, where the row exists; above it Refresh sits in the tab row and stays 40 px):  
- Refresh becomes 30 × 30, keeping its centre, and its icon goes from 26 px to 20 px to fit.  
- Both icons move up 10 px:  
  - Hamburger: `top:100%` (was `+10px`);  
  - Refresh: `top:calc(100% + 5px)` (its 30 px centred on the Hamburger's 40 px).  
  Both centres are 20 px below the tab bar.  
- The row shrinks by 10 px, to 50 px:  
  - `.tab-bar-wrap{ margin-bottom:calc(40px + var(--refresh-gap)); }`;  
  - the pinned background is `height:calc(40px + var(--refresh-gap))`.  
  `fixedChrome.js` reads the margin, so the cards move up 10 px with it.  
- The Hamburger menu follows the button: `top:calc(100% + 40px)`.  
- The docked guest pair (FIX19/FIX20) centres on Refresh's box, so it moves up with it.  

**Tests (written, not run, because `Run Tests` isn't ticked)**  
- `tests/single-column-sheets.test.ts:168-179`: the new margin, the Refresh `top`/`width`/`height` and icon size, the Hamburger `top` and the menu `top`.  
- `tests/header-fixed-sheet.test.ts`: the background's new height.  

**Artifacts**  
- `tasks.md` T050.  
- `quickstart.md` manual check 18 (icon sizes and row).  

2026-10-15 15:27

### FIX ACCEPTED
- `src/public/single-column-m3.css`, inside `@media (max-width: 900px)`:  
  - Refresh: `top:calc(100% + 5px); width:30px; height:30px;`, and its icon `width:20px; height:20px` (was 26 px);  
  - Hamburger: `top:100%` (was `calc(100% + var(--refresh-gap))`);  
  - Both are 10 px higher, with their centres level, 20 px below the tab bar.  
  - Row: `.tab-bar-wrap{ margin-bottom:calc(40px + var(--refresh-gap)); }`, 50 px (was 60 px).  
    `fixedChrome.js` reads it, so the cards start 10 px higher.  
  - Hamburger menu: `top:calc(100% + 40px)`.  
- `src/public/header-fixed-m3.css`: the pinned row background is `height:calc(40px + var(--refresh-gap))`.  
- Above 900 px Refresh stays 40 px in the tab row.  
- The docked guest pair centres on Refresh's box and follows it.  

Tests: postponed (Run Tests not ticked).  
- `tests/single-column-sheets.test.ts`: the margin, Refresh, its icon, the Hamburger and the menu `top`.  
- `tests/header-fixed-sheet.test.ts`: the background height.  
- They have not been run, so the fix is unverified by a run.  

Artifacts:  
- `tasks.md` T050.  
- `quickstart.md` manual check 18.  

2026-10-15 15:27

## FIX22 Icon Row 40 px  
[X] Fixed  
[ ] Run Tests  

Please reduce the height of the fixed row containing the "refresh" and "hamburger" icons  
by 10 pixels.
### RECOMMENDATION
- Since FIX21, the row is `calc(40px + var(--refresh-gap))` = 50 px, in both `single-column-m3.css`'s `.tab-bar-wrap` `margin-bottom` and `header-fixed-m3.css`'s pinned background.  
  `--refresh-gap` (10 px, `single-column-m3.css:107`) is now used only for that space under the icons.  
- Change `:root{ --refresh-gap:10px; }` to `:root{ --refresh-gap:0px; }`.  
  The row becomes 40 px, exactly the Hamburger's height, with Refresh still centred on it.  
  `fixedChrome.js` reads the margin, so the cards move up 10 px.  
  The `.container`'s 20 px top padding stays between the row and the first card.  
- Tests (written, not run, because `Run Tests` isn't ticked): `tests/single-column-sheets.test.ts:168` expects `--refresh-gap:0px`.  
- Artifacts: `tasks.md` T051, and `quickstart.md` manual check 18 (a 40 px row).  

2026-10-15 15:30

### FIX ACCEPTED
- `src/public/single-column-m3.css`: `:root{ --refresh-gap:0px; }` (was `10px`).  
  The Hamburger/Refresh row (`.tab-bar-wrap` `margin-bottom`) and its pinned background (`header-fixed-m3.css`) are now 40 px, the Hamburger's own height.  
  The cards start 10 px higher, still 20 px below the row.  

Tests: postponed (Run Tests not ticked).  
- `tests/single-column-sheets.test.ts` expects `--refresh-gap:0px`.  
- It has not been run, so the fix is unverified by a run.  

Artifacts:  
- `tasks.md` T051.  
- `quickstart.md` manual check 18.  

2026-10-15 15:30

## FIX23 Resetting the Maximize Hint  
[X] Fixed  
[ ] Run Tests  

Question: for the Maximize Icxon pulsing and label, after clicking it once, how do we restore the state where is hasn't been clicked, for testing.  
We tried a hard refresh of the page but the Label doesn't not get rendered again.
### RECOMMENDATION
**Answer**  
- The first maximize stores `maximizeHintDismissed` = `1` in the page's `localStorage` (`src/public/pollCard.js`, `dismissMaximizeHint()`).  
  Each card checks it when it is created and removes its own label.  
- A hard refresh only bypasses the HTTP cache, and `localStorage` survives it, so the label stays gone.  
- To see the label again, either:  
  - run `localStorage.removeItem('maximizeHintDismissed')` in the browser's DevTools console, then reload; or  
  - open DevTools → Application → Local Storage → the site's origin, delete the `maximizeHintDismissed` row, and reload.  
  A private window also starts with the label.  
- Only the label depends on the key.  
  The pulse on hover is CSS only and shows on every visit.  

**Change**  
- No code change.  
- `quickstart.md` manual check 16 gets the console command, so the reset is written down where the check is run.  
- Nothing for a test to observe.  

2026-10-15 15:43

### FIX ACCEPTED
- No code change.  
  The label's dismissal lives in `localStorage` (`maximizeHintDismissed`), which a hard refresh keeps.  
  Removing the key (`localStorage.removeItem('maximizeHintDismissed')` in the console, or under DevTools → Application → Local Storage) and reloading brings the label back.  
- `quickstart.md` manual check 16 now gives that command, and says a hard refresh does not clear it.  

Tests: none, since there is nothing a test can observe in a documentation-only change.  
The existing FIX15 test already covers the key being stored and read.  

Artifacts:  
- `quickstart.md` manual check 16.  

2026-10-15 15:42

## FIX24 Maximize Hint Returns on Refresh  
[X] Fixed  
[ ] Run Tests  

We want a refresh to reset the state of the page, so that the Maximize Hint label reappears without manually clearing `localStorage`.
### RECOMMENDATION
- The dismissal moves from `localStorage` to page memory.  
  `sessionStorage` would not do, because it also survives a reload of the tab.  
- `src/public/pollCard.js`:  
  - `MAXIMIZE_HINT_KEY` and the `localStorage` reads and writes go;  
  - a module-level `let maximizeHintDismissed = false;` is set by `dismissMaximizeHint()`, which still removes every `.maximize-hint` on the page;  
  - a card created later on the same page (another tab, a refresh of the grid) checks the flag and removes its own label.  
- Result: the label shows on every page load until the first maximize on that page.  
  A refresh brings it back.  
  The pulse is unchanged.  
- A `maximizeHintDismissed` value already stored in a browser is simply no longer read.  
- Tests (written, not run, because `Run Tests` isn't ticked): the FIX15 test in `tests/client-maximized.test.ts` is renamed "labels the front Maximize button until the first maximize on this page, and again after a reload".  
  - It no longer expects a `localStorage` value; instead it expects nothing written to `localStorage`.  
  - It still expects no label on a Newest card created later on the same page.  
  - It expects the label back on a freshly opened page.  
- Artifacts: `tasks.md` T046 (and a new T052), and `quickstart.md` manual check 16 (a refresh brings the label back, and FIX23's reset note goes).  

2026-10-15 15:46

### FIX ACCEPTED
- `src/public/pollCard.js`: `MAXIMIZE_HINT_KEY` and the `localStorage` reads and writes are gone.  
  `let maximizeHintDismissed = false;` is set by `dismissMaximizeHint()`, which still removes every label on the page.  
  A card created later on the same page removes its own label while the flag is set.  
  A refresh starts a fresh script, so the label returns until the next maximize.  
  The pulse is unchanged.  
- FIX23's answer (removing the key from `localStorage`) no longer applies.  

Tests: postponed (Run Tests not ticked).  
- `tests/client-maximized.test.ts`: the hint test is renamed "labels the front Maximize button until the first maximize on this page, and again after a reload".  
  - It expects no `maximizeHintDismissed` in `localStorage`.  
  - A Newest card created later on that page has no label.  
  - A newly opened page has the label again.  
- It has not been run, so the fix is unverified by a run.  

Artifacts:  
- `tasks.md` T046, and T052 added.  
- `quickstart.md` manual check 16 (a refresh brings the label back; FIX23's reset note removed).  

2026-10-15 15:48

## FIX25 Maximize Tooltip Text  
[X] Fixed  
[ ] Run Tests  
 Change the maximize-icon tooltip to "Maximize Poll"

### RECOMMENDATION
- The tooltip is the button's `title`, which `tooltip-m3.js` adopts into `data-tooltip`.  
  It is set in both faces' markup (`src/public/pollCard.js:1480`, `:1543`) and again by `setMaximized` (`:1321`), which uses one `name` for both `aria-label` and `title`.  
- Change only the tooltip:  
  - the markup's `title="Maximize Poll Card"` becomes `title="Maximize Poll"` on both buttons;  
  - in `setMaximized`, `maximizeBtn.title = on ? 'Minimize Poll Card' : 'Maximize Poll';`.  
- `aria-label` stays "Maximize Poll Card", the fuller name for screen readers, and the minimize tooltip is unchanged.  
- The tooltip now matches the hover label (FIX15), which hides while the pointer is on the button.  
- Tests (written, not run, because `Run Tests` isn't ticked):  
  - `tests/client-maximized.test.ts:151` and the restore check expect `title` "Maximize Poll";  
  - `tests/client-m3-tooltip.test.ts` (lines 50, 71, 83, 93, 139) expect the tooltip "Maximize Poll".  
- Artifacts: `quickstart.md` manual check 17, and `tasks.md` T053.  

2026-10-15 15:50

### FIX ACCEPTED
- `src/public/pollCard.js`:  
  - both Maximize buttons' markup now has `title="Maximize Poll"`;  
  - `setMaximized` sets `maximizeBtn.title = on ? 'Minimize Poll Card' : 'Maximize Poll';`.  
- `aria-label` is still "Maximize Poll Card" and "Minimize Poll Card", and the minimize tooltip is unchanged.  

Tests: postponed (Run Tests not ticked).  
- `tests/client-maximized.test.ts`: the markup check expects `title` "Maximize Poll", and the restore check now also expects it after minimizing.  
- `tests/client-m3-tooltip.test.ts`: `data-tooltip` and the four shown-text checks expect "Maximize Poll".  
- They have not been run, so the fix is unverified by a run.  

Artifacts:  
- `tasks.md` T053.  
- `quickstart.md` manual check 17.  

2026-10-15 15:51

## FIX26 Pulse Maximize on Touch Phones  
[X] Fixed  
[ ] Run Tests  

When in "phone" mode, and there is no mouse,  
make the maximize icon pulse as it does when the Poll Card is mouse-over with the mouse.  
The should be done on all cards, until the user clicks it once to maximize the Poll Card.  
When the page is refreshed, the maximize icon should continue to pulse on all cards again.

### RECOMMENDATION
**Now**  
- The pulse (`maximize-pulse`, `src/public/pollCard-m3.css`) runs only inside `@media (hover:hover)` on `.card-face:hover`, so a touch phone never sees it.  
- Since FIX24 the first maximize sets the page-memory flag `maximizeHintDismissed` in `src/public/pollCard.js` (`dismissMaximizeHint()`), and a refresh resets it.  

**Change**  
- `src/public/pollCard.js`: `dismissMaximizeHint()` also adds the class `maximize-hint-dismissed` to `<html>`.  
  A reload starts without it, and cards created later on the page are covered by the same class.  
- `src/public/pollCard-m3.css`: a new `@media (max-width: 639.98px) and (hover: none)` block (phone width, no mouse) runs `maximize-pulse` on `:root:not(.maximize-hint-dismissed) .card-flip:not(.maximized-card-flip) .card-face .maximize-btn` without any hover, in the primary colour.  
  Under `prefers-reduced-motion: reduce` it is the still 4 px glow, as on hover.  
  The "Maximize Poll" label is not shown on touch, since it was only asked for the pulse.  
- A touch tablet wider than 639.98 px is outside "phone mode" and gets no pulse.  
  The hover pulse with a mouse is unchanged and continues after the first maximize.  

**Tests (written, not run, because `Run Tests` isn't ticked)**  
- `tests/m3-assets.test.ts`: the phone, no-hover block with the `:root:not(.maximize-hint-dismissed)` selector, the animation and its reduced-motion fallback.  
- `tests/client-maximized.test.ts`, in the hint test: `<html>` has no `maximize-hint-dismissed` before the first maximize, has it after, and a reloaded page has none.  

**Artifacts**  
- `tasks.md` T054.  
- `quickstart.md` manual check 19.  

2026-10-15 16:00

### FIX ACCEPTED
- `src/public/pollCard.js`: `dismissMaximizeHint()` also adds `maximize-hint-dismissed` to `<html>` on the first maximize (icon or title).  
  A refresh starts without it.  
- `src/public/pollCard-m3.css`, two new blocks:  
  - `@media (max-width: 639.98px) and (hover: none)`: `:root:not(.maximize-hint-dismissed) .card-flip:not(.maximized-card-flip) .card-face .maximize-btn` is in the primary colour and runs `maximize-pulse` (1.8 s, infinite) on every grid card, with no hover needed;  
  - the same with `prefers-reduced-motion: reduce`: no animation, a still 4 px glow.  
- No label on touch.  
  Touch screens wider than 639.98 px get no pulse.  
  The mouse hover pulse is unchanged.  

Tests: postponed (Run Tests not ticked).  
- `tests/m3-assets.test.ts`: "pulses every grid card's Maximize button on a touch phone until the first maximize on the page".  
- `tests/client-maximized.test.ts`: the hint test checks that `<html>` lacks `maximize-hint-dismissed` before the first maximize, has it after, and lacks it on a reloaded page.  
- They have not been run, so the fix is unverified by a run.  

Artifacts:  
- `tasks.md` T054.  
- `quickstart.md` manual check 19.  

2026-10-15 16:01

## FIX27 Maximized Card Fits Its Bars  
[X] Fixed  
[ ] Run Tests  

When the Maximized Poll Card is being rendered, make the Poll Card only as high as it needs to be to fit the bars.

### RECOMMENDATION
**Why the card is taller than its bars**  
- `.card-flip` has `min-height:500px` (`src/public/pollCard.css:94`), which the maximized card keeps.  
- Its bars are laid out at fixed sizes by `maximizedBarLayout` and never scroll: `.maximized-card-flip .bar-scroll-wrap`, `.results-list` and `.voting-list` are `flex:0 0 auto`.  
  With few choices, the face is padded out to 500 px with empty space.  
- The grid-card phone rule `.card-flip:not(.maximized-card-flip){ min-height:0; }` (`single-column-m3.css:38`) already does this for grid cards, but excludes the maximized one.  

**Change**  
- `src/public/pollCard-m3.css`: add `.maximized-card-flip{ min-height:0; }`.  
  The maximized card is as tall as its title, bars and footer need, at every width, on both faces.  
  Front and back still share the taller face's height, so a flip does not jump.  
- The blank side panel (FIX11, `align-self:stretch`) follows the card's new height.  
- Grid cards are unchanged.  

**Tests (written, not run, because `Run Tests` isn't ticked)**  
- `tests/m3-assets.test.ts`: `pollCard-m3.css` holds `.maximized-card-flip{ min-height:0; }`.  

**Artifacts**  
- `tasks.md` T055.  
- `quickstart.md` manual check 20.  

2026-10-15 16:04

### FIX ACCEPTED
- `src/public/pollCard-m3.css`: `.maximized-card-flip{ min-height:0; }` was added before the maximized title rule.  
  The maximized card drops the 500 px minimum from `pollCard.css` and is as tall as its content.  
  Its bars never scroll, so their own height decides.  
- Both faces still share the taller one's height.  
  The blank side panel follows the card.  
  Grid cards are unchanged.  

Tests: postponed (Run Tests not ticked).  
- `tests/m3-assets.test.ts`: "lets a maximized card be only as tall as its bars need".  
- It has not been run, so the fix is unverified by a run.  

Artifacts:  
- `tasks.md` T055.  
- `quickstart.md` manual check 20.  

2026-10-15 16:04

## FIX28 <short title here>  
[ ] Fixed  
[ ] Run Tests  
fix requirements...  
