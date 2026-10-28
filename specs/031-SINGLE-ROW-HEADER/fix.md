# Overview: `specs/031-SINGLE-ROW-HEADER`

> Amended by feature 20261023-155959-PHONE-TAB-BAR (2026-10-23): the scroll arrows, the hold and the step are removed (`tabBarScroll.js` keeps the drag, now for mouse and pen, gains a mouse-wheel handler and keeps the All tabs menu); up to 900 px each tab is one line, a 16 px icon beside the label in a 48 px tab, the row has a 32 px edge fade and scrolls with the browser's own touch scrolling, smoothly when a tab is chosen, and Refresh sits under the bar at the left with the All tabs button at the right.

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/031-SINGLE-ROW-HEADER` |
| Fix file created | 2026-10-14 09:02 |
| Last updated | 2026-10-14 15:07 |

Legend: `[ ]` open · `[X]` resolved · `[-]` resolved manually (or accepted as-is) by the developer.
Tick `No Tests` to postpone this fix's automated tests; leave it empty to have them written and run as usual.

"What's next" always returns the first `[ ]` item below.

The developer is expected to create the individual fix requirements in this file, and then run the `/speckit-fix` command to have the AI implement them, one at a time.  
Each fix requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Fixes

## FIX01 Create Poll Icon
[X] Resolved
[ ] No Tests

Add an icon to the "Creat Poll" link in the header.  
It will look like the icon that is on the "Your Votes" tab, except instead of a checkmark, it will be a plus sign.  
The icon should be added inside the link element, before the text.

### RESOLUTION
Added `<svg class="header-nav-icon">` (circle with a plus, drawn like the Your Votes tab icon, `aria-hidden`) as the first child of the Create Poll link in `SITE_HEADER_MARKUP` (`src/public/app.js`);  
`.header-nav-icon` (24px, 8px gap) added beside the link rules in `src/public/header-tab-bar-m3.css`.  
The circle takes the link's colour so an inert link stays dimmed.  
The link text is unchanged ("Create Poll").  
Tests: added one test to `tests/client-create-poll-item.test.ts`;  
passed in the stand-in runner (6/6, with `client-header-fit` 17/17 and `tsc --noEmit` clean).  
Real `vitest` and a browser check not run.  
Artifacts: `tasks.md` T036 now says the 1400 px header is unchanged apart from this icon.  
The icon widens the link, so the T035 step widths should be recorded with it in place.  
2026-10-14 09:35

## FIX02 Tab Bar Item Size
[X] Resolved
[ ] No Tests


Currrently, when the browser width is less than 640 pixels (single column mode),  
the tab bar items are adjusted to fit the narrower screen in the following ways:
```
1. Smaller text: 90% of the normal size. 

:root{ --tab-label-scale:0.9; }
#tabBar .tab{ font-size:calc(var(--md-sys-typescale-title-small-size) * var(--tab-label-scale)); }
The normal size is 14 px (m3-tokens.css:144), so a label drops to 12.6 px. The "all tabs" menu items use the same scale.

2. Tighter letter spacing. 

--tab-label-tracking: -0.03em, which replaces the M3 title-small tracking.

3. Less padding and no minimum width.

#tabBar .tab{ min-width:0; height:56px; gap:0; padding:0 var(--tab-pad); letter-spacing:var(--tab-label-tracking); }

4. Shorter active underline. 

Inset the underline by --tab-pad instead of 12 px, so it still lines up with the narrower label.

```

The browser walk is currently set at the following widths: 1400, 1024, 900, 768, 700 and 640 px.

This fix will apply the adjustments to the tab bar items when the browser width hits the 900 px threshold and lower.

### RESOLUTION
Added `@media (max-width: 900px)` at the end of `src/public/single-column-m3.css` with the five tab rules of the phone block (the three variables, the scaled font size, the min-width/height/gap/padding/letter-spacing rule, and the inset active underline), same values;  
the phone block is unchanged.  
900 px is included.  
Tests: `tests/single-column-sheets.test.ts` now allows only this block after the phone block and has a new test pinning it;  
passed in the stand-in runner (16/16), with `single-row-header-sheet` 8/8, `m3-assets` 22/22, `client-search-tab-field` 10/10, `client-header-fit` 17/17 and `tsc --noEmit` clean.  
Real `vitest` and a browser check not run.  
Artifacts: `spec.md` FR-017 (and FR-018 for FIX01), `contracts/ui-contracts.md` C8 (C8 renumbered to C9 "Not changed", which now says `app.js` is edited only for the icon), `tasks.md` T038, `quickstart.md` item 8.  
2026-10-14 09:58

## FIX03 Hamburger Menu Location
[X] Resolved
[ ] No Tests

This fix applies to all browser widths 768 px and less.

The hamburger menu and the refresh button are repositioned onto a row below the Tab Bar, as seen in the mockup in the image below:
![Hamburger Menu Location](dontTrack/hamburger-menu-location.png)  

The image isn't intended to be pixel perfect, but it provides a clear visual guide for the new layout of the hamburger menu and refresh button.  

The hamburger menu icon will now have 3 small dots to the left of the 3 lines.  

As a result of moving the hamburger icon, the right arrow will move to the right edge of the Tab Bar.

### CLARIFICATIONS
Q1. Today the right and left tab arrows, the all-tabs menu button and the tab menu exist only at 639.98 px and below; from 640 px up they are `display:none` and the tab bar scrolls natively. "768 px and less" therefore covers 640–768 px, where there is no hamburger button yet. Which do you want?
- A: Show the arrows and the hamburger at 768 px and below, i.e. move the phone tab-bar behaviour (arrows, no scroll fade, drag, menu) up to 768 px. This is the larger change.
- B: Only move the hamburger and Refresh below the tab bar and add the dots at 639.98 px and below (the range where the hamburger exists today), and leave 640–768 px as it is.

Q2. On the Live Results tab the Refresh button is hidden. Should the hamburger stay in the new row there, alone on the left? (Assumed yes.)

Answers: Q1 → A (arrows and hamburger from 768 px down). Q2 → yes, assumed (the developer answered only Q1).

### RESOLUTION
Moved the tab-bar wrap and scroll rules, the arrows, the all-tabs button and menu, the Refresh row and the highlight variables out of the phone block into a new `@media (max-width: 768px)` block at the end of `src/public/single-column-m3.css`;  
the phone block keeps cards, floating buttons, the Search field and the tab sizing.  
In the new block `.tab-menu-btn` is absolute at `left:0` on the Refresh row (40 px), `.tab-menu` opens from the left below it, and the Live Results `margin-bottom:20px` rule is gone so the row keeps its room there.  
The all-tabs icon in `src/public/index.html` is now three dots before three lines.  
Tests: `tests/single-column-sheets.test.ts` retargeted to the 768 px block and extended (position, menu, phone block clean, icon);  
stand-in runner: `single-column-sheets` 19/19, `single-row-header-sheet` 8/8, `m3-assets` 22/22, `client-search-tab-field` 10/10, `client-header-fit` 17/17, `client-tab-bar-scroll` 18/18, `client-floating-actions` 14/14, `client-create-poll-item` 6/6;  
`tsc --noEmit` clean.  
Real `vitest` and a browser check not run.  
Artifacts: `spec.md` FR-019, `contracts/ui-contracts.md` C8, `tasks.md` T039, `quickstart.md` item 9.  
The 030 documents still say the arrows and menu are phone-only;  
not edited.  
2026-10-14 10:48
Follow-up at the developer's request: the tab bar's edge fade is turned off only in the phone block (`#tabBar{ -webkit-mask-image:none !important; mask-image:none !important; }`), not in the 768 px block, so 640 to 768 px keeps the fade beside the arrows.  
`tests/single-column-sheets.test.ts` (19/19 in the stand-in runner), `contracts/ui-contracts.md` C8 and `quickstart.md` item 9 follow.  
The hamburger stays on the Refresh row at every width up to 768 px.  
Browser check not run.  
2026-10-14 10:57

## FIX04 900-769 px Width
[X] Resolved
[ ] No Tests

Make the adjustments from FIX03 apply to the 900-768 px range as well.

### RESOLUTION
Changed the FIX03 block in `src/public/single-column-m3.css` from `@media (max-width: 768px)` to `@media (max-width: 900px)`;  
no rule inside it changed.  
The arrows, the all-tabs button and menu, the Refresh row and the three-dot icon therefore apply from 900 px down, and the edge fade (off only in the phone block) stays on from 640 to 900 px.  
Tests: `tests/single-column-sheets.test.ts` now reads the second 900 px block (the last one in the sheet) and its messages say 900 px;  
stand-in runner: `single-column-sheets` 19/19, `m3-assets` 22/22, `client-tab-bar-scroll` 18/18, `client-search-tab-field` 10/10, `client-header-fit` 17/17, `single-row-header-sheet` 8/8;  
`tsc --noEmit` clean.  
Real `vitest` and a browser check not run.  
Artifacts: `spec.md` FR-019, `contracts/ui-contracts.md` C8, `tasks.md` T039 and `quickstart.md` item 9 now say 900 px.  
The sheet has two `max-width: 900px` blocks (FIX02's tab sizing, then this one), left separate.  
2026-10-14 11:03

## FIX05 Login and Create Account to Vote Button Sizes
[X] Resolved
[ ] No Tests

This fix applies to all browser widths 900px and less.  

The "Login" and "Create Account to Vote" buttons are resized to be the same height and font size that the Vote button on the Poll Card across all browser widths 900px and less.

### RESOLUTION
Added `@media (max-width: 900px){ :is(.header-actions, .floating-actions) :is(.btn-header-ghost, .btn-header-primary){ height:32px; font-size:var(--md-sys-typescale-label-large-size); } }` inside the wide block of `src/public/header-single-row-m3.css` (641 to 900 px, the card Vote button's size), and the same selector with `height:21px; font-size:calc(var(--md-sys-typescale-label-large-size) * 0.75);` in the phone block of `src/public/header-single-column-m3.css` (the card's phone Vote button).  
The selector outranks the old single-class rules, so they are unchanged;  
the admin cards' own button rules are not affected.  
Tests: one new pin in each of `tests/single-row-header-sheet.test.ts` and `tests/single-column-sheets.test.ts`;  
stand-in runner: `single-column-sheets` 20/20, `single-row-header-sheet` 9/9, `m3-assets` 22/22, `client-header-fit` 17/17, `client-floating-actions` 14/14, `client-search-tab-field` 10/10;  
`tsc --noEmit` clean.  
Real `vitest` and a browser check not run.  
Artifacts: `spec.md` FR-020, `contracts/ui-contracts.md` C8, `tasks.md` T040, `quickstart.md` item 10.  
2026-10-14 12:35

## FIX06 
[X] Resolved
[ ] No Tests

Question: At a browser width of 1056 pixels, the Search Box is hidden from the header.

We thought the steps are at: 1400, 1024, 900, 768, 700 and 640 px

As a resolution to the Fix, please explain the rule that makes the Search Box be hidden.

Then likely, we will make adjustments.

### RESOLUTION
Explanation only;  
no code or artifact changed.  

The search box is hidden by a measurement,  
not a fixed width: `evaluate()` in `src/public/headerFit.js` clears `data-header-fit`,  
then from 640 px up, while `#site-header.scrollWidth > clientWidth`, adds `no-name`,  
then `no-search` (`html[data-header-fit~="no-search"] .header-search{ display:none }` in `header-single-row-m3.css`),  
then `no-link` (skipped for a user who may create polls), then `no-logo`.  

Only the search box can shrink, to `--header-search-min-width` (200 px);  
it goes when the other items plus 200 px are wider than the header.  
For a guest, who has no name to hide, it is the first step that frees room.  

At 1056 px (header about 1000 px) a guest's row is roughly 1040 px:  
logo and word mark ~295,  
search 200,  
Create Poll link ~200 (two 28 px margins and the FIX01 icon),  
Log In and Create Account to Vote ~300, gaps ~45.  

The widths 1400, 1024, 900, 768, 700 and 640 are walk check-points (T035) and architecture estimates, not thresholds;  
real ones come from T035.  
Exact measure in the browser:  
remove `data-header-fit` from `<html>` and compare `#site-header` `scrollWidth` with `clientWidth`.  

The developer may follow with adjustments (for example the 200 px minimum or the link's margins) as a new fix.  
2026-10-14 12:50

## FIX07  Clear Poll Link
[X] Resolved
[ ] No Tests

Thanks for the clarification in FIX06.  

We will make adjustments, one element at a time.  

First, remove the "Create Poll" link from the header, when the user does not have permission or when the user is not logged in.

### RESOLUTION
`src/public/app.js`: the `<nav class="header-nav">` is out of `SITE_HEADER_MARKUP`;  
a new `CREATE_POLL_NAV` (a live link to `/admin` with the plus icon) is inserted before `#header-actions` by `renderSiteHeader` only when `canCreatePolls(me)`;  
`activateCreatePollLink` is gone.  
So a guest and a user without permission have no link.  
`src/public/headerFit.js`: `no-link` and `createPollLinkIsInert()` removed (ladder: `no-name`, `no-search`, `no-logo`);  
`src/public/header-single-row-m3.css`: the `no-link` rule removed.  
The now-unused `.header-nav-link.is-inert` rule in `header-tab-bar-m3.css` is left alone.  
Tests: `tests/client-header-fit.test.ts` (ladders and widths recomputed for the shorter guest row), `tests/single-row-header-sheet.test.ts` (three hiding rules), `tests/client-create-poll-item.test.ts` (icon for a creator and an administrator), `tests/client-home.test.ts` (025 block: link absent for a guest and for a user missing a grant) and the width model in `tests/helpers/single-column-page.ts`.  
Stand-in runner: `client-header-fit` 17/17, `single-row-header-sheet` 9/9, `client-create-poll-item` 6/6, `single-column-sheets` 20/20, `m3-assets` 22/22, `client-floating-actions` 14/14, `client-search-tab-field` 10/10, `client-tab-bar-scroll` 18/18;  
`tsc --noEmit` clean.  
`client-home.test.ts` needs the server and was edited but not run;  
the real `vitest` and a browser check not run.  
Artifacts: `spec.md` (clarifications noted as revised, story 4, FR-004, edge case and assumption), `plan.md`, `research.md` R1/R5 text, `data-model.md`, `contracts/ui-contracts.md` C4, C6 and C9, `quickstart.md` items 4 and 5 and the automated list, `tasks.md` T041 (earlier lines that mention `no-link` are history).  
This changes feature 025's rule that the header link is shown dimmed to guests and to users without permission, so `designDocs/` may need the same change;  
CLAUDE.md's 031 block and the architecture document still describe four steps and an inert link and were not edited.  
2026-10-14 13:01
Follow-up at the developer's request:  
the 031 block of `CLAUDE.md` and `architecture/031-single-row-header/architecture.md` now describe the three-step ladder and the Create Poll link that only a creator has (stage diagram, evaluation flow, who-sees-what table, width estimates, NC1 and the breaking-change list updated).  
2026-10-14 13:05
Second follow-up:  
`designDocs/031-high-level-requirements-SINGLE-ROW-HEADER.md` (Decisions), the `spec.md` edge case and the earlier `tasks.md` lines (T006, T025 to T027 and the goal) were brought into line.  
2026-10-14 13:25


## FIX08  Brand Icon At All Widths
[X] Resolved
[ ] No Tests

Even though previous requirements requested it, we need the Brand Logo (icon) to be visible at all widths.

### RESOLUTION
The brand logo icon is shown at every width.  
`src/public/headerFit.js`: `no-logo` removed from the ladder, which is now `no-name`, `no-search`.  
`src/public/header-single-row-m3.css`: the `no-logo` rule removed, and `padding:0 16px` (the card Vote button's padding) added to the 641 to 900 px guest button rule so a guest's row should fit near 640 px without the logo step.  
`src/public/header-single-column-m3.css`: the phone `.brand-logo{ display:none; }` removed; the existing 24 px banner rule sizes the icon.  
Tests: `tests/client-header-fit.test.ts` (a guest's ladder ends at `no-name no-search` however narrow, the logo stays, ladders recomputed), `tests/single-row-header-sheet.test.ts` (two hiding rules, no logo rule, the padding pin), `tests/single-column-sheets.test.ts` (no phone logo hide) and the width model in `tests/helpers/single-column-page.ts`.  
Stand-in runner: `single-row-header-sheet` 9/9, `single-column-sheets` 20/20, `client-header-fit` 17/17, `m3-assets` 22/22, `client-create-poll-item` 6/6, `client-floating-actions` 14/14, `client-search-tab-field` 10/10, `client-tab-bar-scroll` 18/18; `tsc --noEmit` clean.  
Real `vitest` and a browser check not run.  
The fit of a guest's row near 640 px is an estimate; with no step left to hide anything, an overflow (150% zoom, a wide font) would clip the right end, so T035 should check it.  
Artifacts: `spec.md` (clarifications, story 4, FR-004, FR-020), `plan.md`, `research.md`, `data-model.md`, `contracts/ui-contracts.md` C4 and C8, `quickstart.md`, `tasks.md` T042 (earlier lines noted as superseded), `architecture/031-single-row-header/architecture.md` (stage diagram, flow, table, NC1 note), the 031 block of `CLAUDE.md` and `designDocs/031-high-level-requirements-SINGLE-ROW-HEADER.md`.  
This reverses feature 030's rule that the logo icon is hidden on a phone (`specs/030-INTEGRATE-SINGLE-COLUMN` spec FR-004, research R and quickstart, and its design document); those documents were not edited.  
2026-10-14 13:29
Follow-up at the developer's request:  
the feature 030 documents (spec, research, quickstart, contracts, plan, tasks, its design document, its architecture document and the 030 block of `CLAUDE.md`) now carry an "Amended by feature 031" note for the logo icon, the guest button sizes, the 900 px tab-bar rules and the Create Poll link; `specs/030-INTEGRATE-SINGLE-COLUMN` spec FR-004 and its "phone" header text were annotated in place.  
2026-10-14 13:30

## FIX09  .header-nav alignment
[X] Resolved
[ ] No Tests

Change the following CSS rule:
FROM
.header-nav { align-items: center; }
TO
.header-nav { align-items: right; }

### CLARIFICATIONS
Q1. `align-items: right` is not a valid value (the values are `center`, `flex-start`, `flex-end`, `stretch`, `baseline` and the like), so a browser ignores the declaration and the nav would keep its current alignment. And `align-items` on `.header-nav` (a flex row, `site.css:57`) is the vertical alignment of its contents, not the horizontal one. The nav holds only the Create Poll link and is exactly as wide as that link (`flex-shrink:0`, no growth), so nothing inside it can move sideways. What do you want to see?
- A: The Create Poll link pushed to the right, against the Log In / avatar area (the nav grows to fill the gap beside the search box and its content is right-aligned: `flex:1 1 auto` and `justify-content:flex-end`). The search box and the nav would share the free space, so the box would end up narrower.
- B: Only the vertical position changes, to the bottom of the row (`align-items:flex-end`).
- C: Change the declaration exactly as written, knowing it has no effect.

Answer here or in chat.

We want what is shown in the image below:
![Create Poll Right](create-poll-right.jpg)

### RESOLUTION
Added `.header-nav{ margin-left:auto; }` to the wide block of `src/public/header-single-row-m3.css`, so once the search box has taken the free space up to its 640 px maximum (or is hidden) the rest pushes the Create Poll link against the user area, as in `dontTrack/create-poll-right.jpg`.  
The declaration as first written (`align-items: right`) is not valid CSS and acts on the vertical axis, so it was not used; `site.css` is not edited.  
The link keeps its 28 px margin and the header's 16 px gap, and the search box is not narrowed.  
Tests: one new pin in `tests/single-row-header-sheet.test.ts`; stand-in runner: `single-row-header-sheet` 10/10, `client-header-fit` 17/17, `single-column-sheets` 20/20, `m3-assets` 22/22.  
Real `vitest` and a browser check not run.  
Artifacts: `spec.md` FR-021, `contracts/ui-contracts.md` C3, `tasks.md` T043, `quickstart.md` item 11.  
2026-10-14 13:38

## FIX10 Try Out New Brand Logo Icon

[X] Resolved
[ ] No Tests

We want to try out a new brand logo icon in the header, replacing the existing one with the updated design. 

Let's see if the logo in the image below fits well in the header:
![New Brand Logo](rough-logo-mockup-03.png)

The png will need to be converted to an SVG for better scalability and integration into the header.

### Revision 

Try this revision (it isn't pixel perfect of course):
![New Brand Logo 2](rough-logo-mockup-04.png)

### RESOLUTION
Replaced the `LOGO` placeholder in `.brand-logo` (`SITE_HEADER_MARKUP`, `src/public/app.js`) with the brand mark hand-traced from the Revision, `dontTrack/rough-logo-mockup-04.jpg` (the link above says `.png`; the file is a `.jpg`): a speech bubble with its tail at the lower left, holding a green `#3FB34F` figure in front of a larger red `#E04A4A` one.  
The first trace, of `-03.png` with a globe grid, was replaced by this one before any run.  
It keeps the `0 0 120 120` viewBox and the `brand-logo` class, so no sheet and no `headerFit.js` measurement changes; the bubble outline (`stroke="#000000"`) and fill (`#FAFAFA`) are recoloured in dark mode by the existing rules in `header-tab-bar-m3.css`.  
The gap between the figures is a `mask` cut from the red figure, drawn in the keywords `black`/`white` so those dark-theme rules leave it alone. Checked in headless Edge at 200 px on light and 40 px on the dark surface.  
Tests: one new test in `tests/client-header-fit.test.ts` (no placeholder text, the masked red figure, two green shapes, the outline). Full `npm test`, run by the developer from an unelevated terminal: 79/80 files, 1261/1262 tests; `client-header-fit` passed.  
The one failure, verbatim: `tests/client-home.test.ts > the Live Results tab's overlay (FIX011) > a bookmarked poll shows as bookmarked in Live Results, from the handing-over tab at once and from the server when no tab holds it` — `AssertionError: expected 2 to be 1` at `tests/client-home.test.ts:1370:60`; it repeats when the file runs alone. It is not caused by this fix and is logged as FIX11.  
Artifacts: `plan.md` (summary: `app.js` scope), `tasks.md` T044.  
2026-10-14 14:34

## FIX11 Live Results overlay test asks the server twice
[X] Resolved
[ ] No Tests

Found by the full run that verified FIX10. `tests/client-home.test.ts:1370` (the Live Results tab's overlay, 020/FIX011) fails, also when the file runs alone:

```
AssertionError: expected 2 to be 1 // Object.is equality
 ❯ tests/client-home.test.ts:1370:60
    1368|       // Copied from TRENDING's overlay: no second overlay call.
    1369|       expect(liveButton().getAttribute("aria-pressed")).toBe("true");
    1370|       expect(requestsTo(livePage, "/api/me/polls").length).toBe(1);
```

A poll handed to Live Results from TRENDING should take its overlay from TRENDING (`window.Tabs.overlayOf`, `src/public/liveResults.js` `fillOverlay`) with no second `/api/me/polls` call; a second one was sent.  
The database suites were not run during features 030 and 031 (stand-in runner only), so the cause may lie in either:  
031's uncommitted `src/public/app.js` / `src/public/index.html`,  
or 030's commit 5d91d6a (`searchTab.js`).  
  
To tell them apart: 
`git stash push src/public/app.js src/public/index.html`,  
`npx vitest run client-home`,  
`git stash pop`.

### RESOLUTION
An intermittent race in the test, not a defect in 031. Runs: failed in the full suite and once alone in the file; passed with 031's `app.js`/`index.html` stashed (one run, not conclusive), three times alone with `-t "FIX011"`, and once in the whole file, all on the same code.  
The test clicked TRENDING's Live Results link straight after the page load, before TRENDING's own `/api/me/polls` overlay had necessarily been applied; when it had not, `liveResults.js` `fillOverlay` correctly found nothing to copy and asked the server, so the test saw a second call.  
`tests/client-home.test.ts` (the FIX011 test): before the click it now waits up to 2 s, in 100 ms settles, for TRENDING's bookmark button to read `aria-pressed="true"` and asserts it; the count assertion now compares the `url status` list (`/api/me/polls?pids=<pid> 200`), so a failure names the extra request. No application code changed.  
Tests: run by the developer from an unelevated terminal: `npx vitest run client-home` and the full `npm test`, both passed.  
Artifacts: `tasks.md` T045.  
2026-10-14 15:07

