# Overview

The # REQUIREMENT### sections below are the individual requirements as we develop the UI/UX for private poll administration.  

**File Lock While Executing an Instruction**  
Before making any change to this file while executing an instruction (**next requirement**, **whats next**, a letter, **apply**, **Other**, **implement**), you will create the sibling file `iterative-requirements.md.lock` containing the instruction being executed and the time it started.  
While the lock file exists, the developers will not save this file. If they have unsaved edits open, they will save them before typing the instruction, or wait for the lock to be removed.  
While locked, you will:
- re-read the part of this file you are about to change immediately before each change
- change it only with targeted edits, never by rewriting the whole file
- if an edit fails because the file changed on disk, re-read it, keep the developers' change, and redo your edit on top of it

When the instruction is finished, or abandoned because of an error, you will delete `iterative-requirements.md.lock` and log "Lock released" to the CC CLI console.  
If a lock file is already present when an instruction starts, you will log its contents and ask the developers whether it is stale before continuing.

**Next Command**  
Whenever you wait for the developers, your last few lines will be a reminder of what is expected next. The final line will be a line containing the exact command expected after `Type or say:`.  
Here are the possibilities.  

**Clarifications**
```
You are reviewing the clarifications for <current requirement title>.  
Type or say: whats next
```


**Clarification Options**
```
You are reviewing clarification <clarification number> for <current requirement title>.  
<clarification concise title>  
<recommended clarification option letter> <recommended clarification option title> is the recommendeded clarification option.    
To accept a clarification option Type or say its letter.  

You may also accept the recommended options for all clarifications, Type or say: accept all

To accept the recommended option, Type or say: <recommended option letter>  
  
```

**Requirement Recommendations**
```
You are reviewing the Recommendation(s) of how to satisfy <current requirement title>.  
<preferred recommendation number> <preferred recommendation title> is the preferred Recommendation.  
To accept a recommendation option, Type or say its number.  
To accept the preferred recommendation, Type or say: <preferred recommendation number>
```
**Implementing a Requirement**
```
All clarifications and recommendations have been addressed for <current requirement title>.  
Type or say: implement
```
**After Implementing a Requirement**
```
<current requirement title> has been implemented.  
Ready to move on the next unresolved requirement.
Type or say: next requirement
```
These help messages in CC CLI let the prompt suggestion offer the most appropriate command, so the developers can accept it with one key press.

**Starting the iterative requirements session**  

**Next Requirement**  
In CC CLI, we (the developers) will type **next requirement**.  
You will find the next **# REQUIREMENT** section that has a line that is **[ ] Resolved** . Can also be `[ ]Resolved`, `Resolved[ ]` or `Resolved [ ]`.
In other words, the next requirement is the one that has not yet been resolved.
If there is no **# REQUIREMENT** section that is marked as **[ ] Resolved**, but there is a **# REQUIREMENT** section that does not have a **Resolved** line (as described above), you will add a **[ ] Resolved** line under the **# REQUIREMENT** heading, and treat it as the next REQUIREMENT.  
This will be referred to as the **current requirement**.  
.You will read the **## REQUIREMENT DETAILS** section of the current requirement.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**Logging Short A Summary of Next Requirement**  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;You will log a **short summary** of the requirement to the console of CC CLI.  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;You will also insert the **short summary** into the current requirement section, under the **[ ]Resolved** line.  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The **short summary** will be placed in a new section, called ## SHORT SUMMARY.

**Clarifications**  
You will determine if there are any clarifications needed to fulfill the requirement. You will add them to a section called **## CLARIFICATIONS** in the **current requirement**, creating the section if necessary.    
Each clarification will be:
- numbered sequentially, starting from 1
- have a concise clarification title
- have a **[ ] Resolved** line after the clarification title to indicate whether it has been resolved. Can also be `[ ]Resolved`, 
- marked as **Recommended** if it is the preferred resolution for the clarification.
`Resolved[ ]` or `Resolved [ ]`.  

If possible, you will provide one or more **options** to resolve each clarification.  
Each option will have a letter assigned to it, starting from "a" and continuing sequentially.  
You will recommend one of the options, if possible, as the preferred resolution for the clarification.  
The recommended option will be marked with the word **Recommended** above its acceptance line.  
Even if there is just one **option** provided to resolve a clarification, it will still have a letter, "a", and it be marked as **Recommended**.

The format of the section for clarifications is as follows:  
```markdown
<!-- Clarifications format -->
1. Clarification concise title
[ ] Resolved  
description of the clarification goes here
  
a. concise title clarification option 1  
Recommended
[ ] Accepted  
description of clarification option 1 goes here  
  
b. concise title clarification option 2  
[ ] Accepted  
description of clarification option 2 goes here  
etc.  

Other.   
[ ] Accepted  
<The developers will enter their own resolution in the console of CC CLI.>
```
After you generate the clarification(s) you will:  

**Finding The Next Clarification**
You will find the next Clarification of the **current requirement** that is not marked **[X] Resolved**.  
This will be referred to as the "**current clarification**".  
You will log the **current clarification** title, option(s), and which option is recommended, to the console of CC CLI.  
  
If there is more than one clarification **option** provided to resolve the **current clarification**, the developers will select an **option** by typing its corresponding letter in the CC CLI Console. You will then mark the option as **[X] Accepted**. You will also mark the **current clarification** as **[X] Resolved**.   

If there is just one option provided to resolved the **current clarification**, the developers will type **a** to accept it. You will then mark the option as **[X] Accepted**. You will mark the **current clarification** as **[X] Resolved**.   

The developers may also choose to provide their own resolution to the **current clarification**. To indicate this, they will type **Other.** in the console of CC CLI and then provide their resolution.  You will add what the user provided to the **Other.** section of the **current clarification**.  You will then mark the **current clarification** as **[X] Resolved**.

When resolving the clarifications the developers may choose to accept the recommended option for all clarifications by typing or saying: **accept all**.  

When the **current clarification** has been resolved by typing a letter or creating their own resolution by typing **Other** followed by the resolution, you will then mark the option as **[X] Accepted** and you will mark the **current clarification** as **[X] Resolved**.  

After resolving one or more clarifications, you will log the resolution to the console of CC CLI.  
Then you will loop back to **Finding The Next Clarification** until all clarifications have been resolved.

**Recommendations**  
After all clarifications have been resolved, you will:
- create a section called **## RECOMMENDATION** in the **current requirement**
- add a **[ ] Resolved** line under **## RECOMMENDATION**  

You will provide one or more recomendations of how to satisfy the requirement, and add them to a section called **## RECOMMENDATION** in the **current requirement**.  
Each recomendation will have a **concise title** and a **detailed explanation**.  
The **concise title** will briefly summarize the recommendation,  
while the **detailed explanation** will provide enough detail for proper implementation.  
The **detailed explanation** will also include **Pros** and **Cons** of the recommendation.  
Each recommendation will be:
- numbered sequentially, starting from 1
- have an **[ ] Accepted** line after the **concise title**
- marked as **Recommended** if it is the preferred recommendation to implement the **current requirement**.
`Resolved[ ]` or `Resolved [ ]`. 

The format of the recommendation section will be as follows:  

```markdown
## RECOMMENDATION
[ ] Resolved

1. recomendation 1 concise title
Recommended
[ ] Accepted
recomendation 1 details
 
2. recomendation 2 concise title
[ ] Accepted
recomendation 2 details
etc.
```

**Resolving Recommendations**  
After generating the recommendation(s) for the **current requirement**,  
you will log the numbered recommendation title(s) to the console of CC CLI.  
You will indicated which recommendation is **Recommended**. This will guide the developers in selecting the appropriate recommendation to implement.  

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;If there is just one recommendation provided, the developers will type **1** to accept it, and then you will mark it as **[X] Accepted**, and you will mark the **current recommendation** as **[X] Resolved**.  

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;If there is more than one recomendation provided, the developers will select an option by typing its number to accept it, and then you will mark it as **[X] Accepted**, and you will mark the **current recommendation** as **[X] Resolved**. 

**Implementing the Current Requirement**  
After the **current recommendation** for the **current requirement** has been resolved,
you will prompt the developers to type **implement** to implement the **current requirement** using the **accepted recommendation** and the **resolved clarifications**.  

**Implementation Notes**  
When the implementation is complete, you will mark the **# REQUIREMENT** section as **[X] Resolved**.    
You will also add a **## NOTES** section to the **# REQUIREMENT** section of the **current requirement**. 
The **## NOTES** section will contain any important information about the implementation.  

You will then loop back to the top and wait for the developers to type **next requirement** in the CC CLI Console.

# REQUIREMENT Extract

[X] Resolved

## SHORT SUMMARY
Extract the two-sided poll card (`pollCard.js`/`pollCard.css`, its self-contained
`PollCard.mount` markup template, and `voteClient.js`) out of `src/public` into a
standalone `prototypes/POLL-CARD-MATERIAL3/` page: one `.card-grid` holding one
`.card-viewport`, no site header/tab bar/tab panel/search, following the sibling
admin-card prototype's pattern (`research/UI-UX-FOR-PRIVATE-POLLS/NON-ADMIN-POLL-EDITING/admin-cards.html`)
of a static page plus a `harness.js` that feeds fixture poll data and stubs the
network instead of the real tab/session machinery.

## REQUIREMENT DETAILS
Is it possible to extract the html/css/js from the client-side code,  
to create one  
```
<div class="card-grid">  
```
that includes one:
```
<div class="card-viewport">
```
  
This will allow us to create a prototype for a Poll Card that uses the Material 3 appearance.  
We recently created a prototype for the Admin Poll Card that uses the Material 3 appearance and we want to create a similar prototype for the two-sided Poll Card that all users see.  
  
There is no need for the site-header, tab-bar-wrap, tab-notice, tab-panel, card-grid.   
Remove any js files that are not needed for the two-sided Poll Card.   
Please place the resulting files in:  
"prototypes/POLL-CARD-MATERIAL3/iterative-requirements.md"

## CLARIFICATIONS

1. Fixture poll to display
[X] Resolved
The card-viewport needs one poll's worth of data behind it (`applyPoll`'s shape: title,
subtitle, choices with `id`/`label`/`pct`, vote count, state, etc.) — the requirement
doesn't say which kind of poll to show, and the answer changes what the Material 3
redesign gets validated against.

a. One representative OPEN, multi-choice, mid-vote-count poll
[ ] Accepted
A single fixture (e.g. 4-5 choices, some votes already in, Dynamic-Vote/public-style
card) shown once, front (Results) face active by default — mirrors "one card-viewport"
literally and keeps the harness small, matching this requirement's narrow scope.

b. A small set of fixture polls, swappable
[X] Accepted
Same single on-page card-viewport, but the harness lets the developer switch which
fixture poll it renders (e.g. a dropdown or console helper) — a closed poll, a
never-voted poll, a Yes/No poll, a long-choice-list poll — so later Material 3
iterations can be checked against multiple shapes without editing files each time.

Other.
[ ] Accepted


2. Interactive behavior scope for the action buttons
[X] Resolved
`initPollCard` wires flip, scroll arrows, vote-row toggling, and the Vote/Submit/Back
buttons regardless — that part is essentially free. But Live Results, Bookmark, and
Maximize each call an `opts.on*` hook that does nothing unless the harness supplies one,
and Maximize specifically opens a separate maximized-grid overlay (021's template) that
is out of this extraction's scope.

a. Flip + vote fully working; Live Results/Bookmark/Maximize stubbed with a status note
Recommended
[X] Accepted
Matches the admin-card prototype's precedent: clicking Live Results/Bookmark logs to
the console and shows a "(sample only: no action taken)" note on the card; Maximize does
the same rather than opening an overlay. Every button looks and feels alive.

b. Flip + vote fully working; Live Results/Bookmark/Maximize left inert
[ ] Accepted
Same core flip/vote interactivity, but those three buttons are just visually present —
clicking them does nothing and logs nothing. Less harness code, but three dead-looking
controls on the card.

c. Flip + vote fully working; Maximize button hidden, Live Results/Bookmark stubbed
[ ] Accepted
Since Maximize's overlay genuinely isn't part of this extraction (no maximized-grid
template, no maximized CSS), hide that one button entirely rather than leave it dead or
fake it; Live Results and Bookmark still get the console/status-note stub from (a).

Other.
[ ] Accepted


## RECOMMENDATION
[X] Resolved

1. Copy-and-stub standalone prototype (mirrors the admin-card prototype)
[X] Accepted
Create these files in `prototypes/POLL-CARD-MATERIAL3/`:
- `poll-card.html`: a static page with the font/stylesheet links, one `<div class="card-grid">` and the scripts below. It has no site-header, tab-bar-wrap, tab-notice or tab-panel, and no search. It also has a small fixture picker (a `<select>`) above the grid, outside the card.
- `pollCard.js`: copied unchanged from `src/public/pollCard.js` (it owns `POLL_CARD_TEMPLATE`, `initPollCard`, `renderPollResults`, `renderVotingOptions` and `window.PollCard.mount`).
- `pollCard.css`: copied from `src/public/pollCard.css`. Add only the small `:root` tokens it needs from `styles.css` / `site.css` (`--paper`, `--ink` and similar); do not copy the whole stylesheets.
- `voteClient.js`: copied, or replaced by a stub `window.VoteClient` in `harness.js` (`canVote()` returns true and `submit()` resolves a fake outcome after a short delay). The stub is preferred, because it keeps the prototype network-free. The pollCard `<script>` still needs `window.VoteClient` to exist.
- `harness.js`: a set of fixture polls (an open multi-choice poll, a closed poll, a never-voted poll, a Yes/No poll, a long-choice-list poll). It mounts one card with `PollCard.mount(grid, pid, opts)` and re-mounts on picker change. It supplies `opts.onLive`, `opts.onBookmark` and `opts.onMaximize` stubs that log to the console and show a "(sample only: no action taken)" note on the card (clarification 2a). It also feeds the fixture through `applyPoll` (clarification 1b).

Any other client script is left out: `tabs.js`, `app.js`, `liveResults.js`, `trending.js`, `newest.js`, `searchTab.js`, `deltaClient.js`, `cardShell.js` and the admin/profile/login files, unless reading `pollCard.js` shows it calls into one of them. The maximized-grid template and its CSS are left out too.

Pros:
- It matches the sibling admin-card prototype's structure, so both prototypes work the same way.
- The Material 3 restyle can happen freely in the copies without touching `src/public`, and there is no server or route change.
- The harness reaches every card shape, and no script other than `pollCard.js`, `voteClient.js` and `harness.js` is loaded.

Cons:
- The copies of `pollCard.js` and `pollCard.css` will drift from `src/public`, so the finished Material 3 design has to be ported back by hand.
- `pollCard.css` may depend on tokens or rules in `styles.css`, `tabs.css` or `site.css` that I need to trace and copy over. This could mean a few rounds of adjustment.

2. Point the prototype at `src/public` files directly
[ ] Accepted
`poll-card.html` and `harness.js` live in the prototype folder, but the page loads `../../src/public/pollCard.js`, `pollCard.css` and `voteClient.js` by relative path. Nothing is copied.

Pros:
- There are no copies to drift, and the harness always exercises the real card.

Cons:
- The Material 3 restyle would edit the production card files directly, which is risky for a prototype and contradicts the requirement to "extract" the card.
- The prototype only works from inside the repo checkout, so the folder can't be shared or moved.
- The folder doesn't hold the "resulting files" the requirement asks to be placed there.

## NOTES
Implemented recommendation 1 with clarifications 1b and 2a. Open `poll-card.html` directly; no server is needed.

Files in `prototypes/POLL-CARD-MATERIAL3/`:
- `poll-card.html`: one `.card-grid` holding one `.card-viewport`, plus a fixture picker above the grid. There is no site header, tab bar, tab notice, tab panel or search.
- `pollCard.js` and `pollCard.css`: unchanged copies of the `src/public` files.
- `site.css`: not a full copy. It holds only the `:root` tokens and the rules the card uses (totals, footer, Vote button, closed/editing/blocked messages, vote error, bookmark and maximize buttons), taken from `src/public/site.css`.
- `tabs.css`: only the `.card-grid` rules from `src/public/tabs.css`.
- `harness.js`: five fixtures (open, never voted, Yes/No, closed, 12 choices). It switches between them from the picker or `window.showFixture(key)`. A stub `window.VoteClient` replaces `voteClient.js`, so `voteClient.js` was not copied. A vote nudges the counts so the bars visibly change. Live Results, Bookmark and Maximize log to the console and show "(sample only: no action taken)" in the card's front-face notice line.

Checked: `node --check` on both scripts, and a jsdom smoke run that mounted the card, clicked Live Results and Bookmark, and cycled all five fixtures with no errors. Not checked in a real browser: the layout and the flip animation, which jsdom does not render.

Left in `pollCard.js` but unused here: the maximized-card code paths (`setMaximized`, `maximizedBarLayout`) and the maximized CSS rules in `pollCard.css`. They are inert without an overlay. Remove them when the Material 3 restyle reaches that area.

No other client script was needed. Nothing under `src/` changed.

# REQUIREMENT Poll Card Size

[X] Resolved

## SHORT SUMMARY
Make the extracted card size itself like the original: the same responsive width at every window
width. Probable cause (from reading the CSS, not yet confirmed in a browser): the prototype page
lost the `.page > .container` wrapper (`max-width: var(--max-width)`, 1280px, with 32px/20px
padding) and the grid's narrow-screen rules, so the card's column width follows the raw window
width instead of the original's capped container.

## REQUIREMENT DETAILS

The html/js/css generated in the previous requirement does not have the correct size.  
It shold have the same responsive size as the original poll card.  

## CLARIFICATIONS

1. How to reproduce the original's responsive width
[X] Resolved
In the original the card is a cell of `.card-grid` (`repeat(auto-fill, minmax(268px, 1fr))`,
18px gap) inside `.page > .container`, capped at `--max-width` (1280px) with 20px side padding
(14px under 640px), and the card itself is `width:100%; max-width:420px`. The prototype has the
grid but no container, and `--max-width` is not defined in its trimmed `tabs.css`/`site.css`.

a. Restore the original page wrapper around the grid
Recommended
[X] Accepted
Add `.page-decor`, `.page` and `.container` (and the `--max-width` token and the 640px padding
rule) to the prototype's `tabs.css`, and wrap the grid in `.page > .container > .layout`. The
card then takes the same width as a grid cell in the original at every window width. Most faithful;
the fixture picker stays above the grid, inside the container.

b. Pin the card to a fixed 420px column
[ ] Accepted
Simple, but the card no longer shrinks with the window, so it is not the responsive behaviour
the requirement asks for.

Other.
[ ] Accepted


2. Where the single card sits
[X] Resolved
In the original the first card occupies the first grid column, left-aligned; the other columns
hold other cards. With one card the remaining columns are empty.

a. Left-aligned in the first column, as in the original
Recommended
[X] Accepted
Same position and width the card has in the real grid, which is what a Material 3 comparison
against the original needs.

b. Centered in the page
[ ] Accepted
Looks better on a wide screen, but the width would no longer match a grid cell unless the column
width is pinned by hand.

Other.
[ ] Accepted

## RECOMMENDATION
[X] Resolved

1. Restore the original page wrapper; leave the card in the first grid cell
[X] Accepted
Change the prototype so the card sizes exactly as it does in the real grid:
- `tabs.css`: add the original `.page-decor`, `.page`, `.container` and `.layout` rules from `src/public/tabs.css`, the `--max-width` token (1280px) wherever the original declares it, and the `html, body` rules the original page relies on. Keep the `.card-grid` rules and the `max-width:639.98px` media block, now including its `.container{ padding:20px 14px 40px; }` line.
- `poll-card.html`: add `<div class="page-decor"></div>` and wrap the grid as `.page > .container > .layout > .card-grid`. The fixture picker stays above the grid, inside the `.layout`.
- Do not centre the card or set its width by hand. It stays in the first grid column, left-aligned, at `width:100%; max-width:420px`, exactly as in the original (clarification 2a).
- Verify by comparing computed card widths at several window widths (for example 1600, 1280, 900, 640 and 375px) against the original `index.html` page. Use a real browser for this if one is available. I can only use jsdom here, which does not lay out pages, so I'd otherwise report the width check as unverified.

Pros:
- It reuses the original rules, so the card is the same width as a grid cell at every window width, with no hand-tuned numbers to keep in sync.
- The responsive behaviour (column count, 268px minimum, the narrow-screen single column) comes along unchanged.

Cons:
- The prototype's `tabs.css` carries a few more page-level rules than the card strictly needs.
- Without a browser I can't measure the result myself. The confirmation of the fix comes from your check.

## NOTES
Implemented recommendation 1 with clarifications 1a and 2a.

- `tabs.css` now carries the original's full `:root` token block (including `--amber`, `--shadow` and `--max-width:1280px`, which the trimmed copy from REQUIREMENT001 lacked), the `html, body` rules, `.page-decor`, `.page`, `.container` and `.layout`, then the `.card-grid` rules and the 640px media block (`.container` padding and the single-column grid).
- `poll-card.html` wraps the grid as `.page > .container > .layout > .card-grid`, with a `.page-decor` beside `.page`. The fixture picker moved inside `.layout`, above the grid.
- The card is not centred and has no hand-set width: it sits in the first grid cell at `width:100%; max-width:420px`, as in the original.
- Missing tokens were a second likely cause of the wrong look, beyond the missing container.

Checked: the jsdom smoke run still passes (card mounts, all five fixtures, no errors). Not checked: the actual widths. No browser is installed here and jsdom does not lay out pages, so please compare the card width against the original at a few window widths (for example 1600, 1280, 900, 640 and 375px) and tell me if any differ.

# REQUIREMENT Poll Card Size Error

[X] Resolved

## SHORT SUMMARY
The bookmark and maximize icons drop below the title instead of sitting at its right, at any
window width. Cause (confirmed by comparing the CSS): the trimmed prototype `site.css` omits the
`.card-front/.card-back .question-row` flex rules and the `.question` `flex:1 1 auto; min-width:0`
rule from `src/public/site.css:724-732`, so `.question-row` lays its children out as blocks.

The extacted Poll Card for the prototype has an error as shown in the following image:  
![Poll Card Size Error](pollCardError.jpg)

The error is that the icons wrap to the next line at a large browser window width.  
The image shows the Prototype Poll Card at the top and the correct Production Poll Card at the bottom.

## CLARIFICATIONS

1. Scope of the fix
[X] Resolved
The icon wrap has one known cause (the missing `.question-row` rules). REQUIREMENT001 trimmed
`site.css` by hand, though, so other card rules may also have been dropped and be causing smaller
differences that the screenshot doesn't show.

a. Restore the missing rules and audit the trimmed CSS
Recommended
[X] Accepted
Copy the `.question-row` rules back. Then check every class in `POLL_CARD_TEMPLATE`, and every
class `pollCard.js` sets at runtime, against the rules in `src/public/site.css` that target it.
Restore any the prototype lacks, and list them in NOTES. This fixes the icons and any other
hidden drift in one pass, before the Material 3 restyle starts from this baseline.

b. Restore only the `.question-row` rules
[ ] Accepted
This is the smallest change and fixes exactly what the screenshot shows. Any other drift is
left to turn up in later requirements.

Other.
[ ] Accepted

## RECOMMENDATION
[X] Resolved

1. Restore `.question-row`, then diff the card's classes against `src/public/site.css`
[X] Accepted
- Add the `.card-front .question-row, .card-back .question-row` flex rule and the
  `.question-row .question{ flex:1 1 auto; min-width:0; }` rule to the prototype `site.css`,
  just above `.bookmark-btn`, where the original has them.
- Audit: collect every class name in `POLL_CARD_TEMPLATE` and every class that `pollCard.js`
  adds at runtime (`classList.add/toggle`, `className =`). For each class, compare the rules in
  `src/public/site.css` (and `styles.css`, if the page used it) that target it with the rules in
  the prototype's `site.css`/`tabs.css`. Copy over any that are missing, verbatim, keeping the
  original order. Leave out rules scoped only to things the prototype doesn't have (site header,
  tab bar, maximized grid, admin, profile).
- Record in NOTES every rule restored and every rule deliberately left out.
- Re-run `node --check` and the jsdom smoke run. The icon position itself needs a check in your
  browser, because jsdom doesn't do layout.

Pros:
- Fixes the icons at the cause, and finds any other rules dropped in the REQUIREMENT001 trim in
  the same pass.
- Copies rules verbatim, so the prototype matches production exactly before the Material 3 work.

Cons:
- The prototype `site.css` grows somewhat.
- Rules whose selectors combine card classes with page-level classes need case-by-case judgement.

## NOTES
Implemented recommendation 1 with clarification 1a.

- Cause: the REQUIREMENT001 trim of `site.css` dropped the title-row rules. Without
  `display:flex` on `.question-row`, the title, bookmark button and maximize button stacked as
  blocks.
- Restored, word for word and in the original position (just above `.bookmark-btn`, with the
  FIX03/FIX05 comment): `.card-front .question-row, .card-back .question-row` (flex, `flex-start`,
  `space-between`, 8px gap) and `.card-front .question-row .question, .card-back .question-row
  .question{ flex:1 1 auto; min-width:0; }`.
- Audit: a script parsed `src/public/site.css`, `tabs.css` and `pollCard.css` (the three
  stylesheets `index.html` loads) into rules and compared them with the prototype's. It
  collected card classes from `POLL_CARD_TEMPLATE`, `classList` calls, `className` assignments
  and `querySelector` selectors in `pollCard.js`. The two rules above were the only missing rules
  that targeted the card. Every card rule the prototype already had matched production exactly,
  and `pollCard.css` is still an identical copy.
- Left out deliberately, because they are scoped to things the prototype doesn't have: the site
  header, search, avatar menu and cookie banner; `.card-shell-*` and the profile rules, including
  `.card-shell-action .btn-primary…` and `.btn-primary.is-running`, which `pollCard.js` never sets;
  `.tab-bar*`, `.tab-refresh*`, `.tab-notice`/`.tab-empty` and `.tab-panel`; the maximized grid
  (`.maximized-card-grid`, `.col-rule`, `.maximized-space-right`); the Live Results idle prompt
  and the modal. `styles.css` isn't loaded by `index.html`, so it wasn't counted.

Checked: `node --check` on both scripts, and the jsdom smoke run (card mounts, Live Results and
Bookmark stubs fire, all five fixtures cycle, no errors). Not checked: the icon position on
screen, because jsdom doesn't lay out pages. Please reload `poll-card.html` and confirm both icons
sit at the right of the title at a wide window width.

# REQUIREMENT Use Material 3

[X] Resolved

## SHORT SUMMARY
Restyle the extracted two-sided Poll Card (Results front and Vote back) to follow Material 3:
M3 color roles, the M3 type scale, and M3 component styles for the card container, buttons,
icon buttons, the vote-row selection controls and the notices. This follows the sibling
admin-card prototype, which imitates M3 in CrowdPoll's palette (moss, ink, paper; Fraunces and
Inter). The work stays inside `prototypes/POLL-CARD-MATERIAL3/`, and nothing under `src/` changes.

## REQUIREMENT DETAILS
Update the prototype Poll Card to use Material 3 design guidelines, including new color schemes, typography, and component styles.

## CLARIFICATIONS

1. Color scheme source
[X] Resolved
M3 defines colors as roles (`primary`, `on-primary`, `primary-container`, `surface`,
`surface-container-*`, `outline`, `outline-variant`, and so on), normally generated as tonal
palettes from one seed color. The requirement asks for "new color schemes" but doesn't say which
seed or palette to use.

a. CrowdPoll palette mapped onto M3 roles (moss as the seed)
Recommended
[X] Accepted
Define `--md-sys-color-*` role tokens from a moss (`#3D5A46`) seed, with ink and paper as the
on-surface and surface anchors and amber as `tertiary`. This matches the admin-card prototype
("M3 in CrowdPoll's palette"), so the two cards look like one product.

b. M3 baseline scheme (the default purple, seed `#6750A4`)
[ ] Accepted
This is pure out-of-the-box Material 3. It clashes with the admin-card prototype and the rest of
the site.

c. A new seed color chosen by the developers
[ ] Accepted
Generate the full role set from a seed you name (for example, with Material Theme Builder).

Other.
[ ] Accepted


2. Typography
[X] Resolved
M3's default typeface is Roboto, with a fixed type scale (Display, Headline, Title, Body and
Label roles, each in large, medium and small sizes). Today the card sets its title in Fraunces
and everything else in Inter.

a. Keep Fraunces and Inter, apply the M3 type scale roles
Recommended
[ ] Accepted
Define `--md-sys-typescale-*` tokens and use them throughout: title → Title Large (Fraunces),
subtitle → Body Medium, choice labels and percentages → Label Large and Body Medium, buttons →
Label Large, totals and footer → Body Small. The brand fonts and the admin-card prototype's look
are kept, and sizes and weights follow M3.

b. Switch to Roboto (or Roboto Flex) with the M3 type scale
[X] Accepted
This is the most literal M3, but the card would no longer match the site or the admin-card
prototype.

c. Inter everywhere (drop Fraunces), with the M3 type scale
[ ] Accepted
This is a flatter, more "app-like" look that keeps one site font.

Other.
[ ] Accepted


3. Result bar and vote-row fill colors
[X] Resolved
Feature 022 gives each bar a fill from the 50-entry xkcd palette, starting at a per-poll offset,
with ink shades of at least 7:1 contrast and Yes/No as `#018826` / `#CF0234` on an 85% tint.
These are data colors, not M3 roles.

a. Keep the bar colors exactly as they are; apply M3 only to the card's chrome
Recommended
[X] Accepted
The fills, tints, inks and the clipped white copy stay unchanged. M3 governs the bar's shape
(corner radius), the track (`surface-container-highest`) and the text styles. This keeps 022's
color behavior, which is easy to get wrong, intact.

b. Replace the bar colors with M3 tonal roles
[ ] Accepted
Use one `primary` or `secondary` tone for every bar, or a few container roles in rotation. It
looks more uniformly M3, but it discards feature 022's distinct per-choice colors.

Other.
[ ] Accepted


4. Card container style
[X] Resolved
M3 has three card types: elevated (a `surface-container-low` fill with a level-1 shadow), filled
(`surface-container-highest`, no shadow) and outlined (`surface` with a 1px `outline-variant`
border). All three use a 12px corner radius. Today the card is white with a soft shadow and a
larger radius.

a. Elevated card
[ ] Accepted
This is closest to today's white card lifted off the paper background, now with M3's level-1
shadow and 12px radius, on both faces.

b. Outlined card
[ ] Accepted
This matches the admin-card prototype's inner panels (REQUIREMENT021 there). It is flatter, and
on the paper background the card reads more as part of the page.

c. Filled card
[ ] Accepted
This is the lowest-emphasis card. It gives less contrast against the paper page.

d. Match the admin-card prototype: keep today's container
Recommended
[X] Accepted
The admin-card prototype (`research/UI-UX-FOR-PRIVATE-POLLS/NON-ADMIN-POLL-EDITING/admin.css:440`)
never converted its outer card to an M3 card type. Its REQUIREMENT002 copied the production Poll
Card's container: a white fill, a 1px `var(--line)` hairline, the soft `var(--shadow)`
(`0 20px 50px -25px rgba(30,36,34,0.35)`), and a 20px radius (18px under 480px). M3 appears only
inside the card, where its REQUIREMENT021 panels are M3 outlined cards (1px border, 12px radius).
Keep `.card-face` exactly as it is on both faces, so the two prototypes stay identical side by
side. M3 applies to everything inside the card, and any inner panels become M3 outlined cards, as
in the admin card.

Other.
[ ] Accepted


5. Component mapping for the card's controls
[X] Resolved
Each existing control needs an M3 counterpart. The proposed mapping:
- **Vote** and **Submit vote** → M3 filled buttons (the width-sizer trick from 008 FR-007 stays).
- **Back** (on the vote face) → an M3 standard icon button.
- **Live Results** → an M3 tonal button or an assist chip carrying the live-bars icon. In remove
  form (the ×), it becomes an input chip.
- **Bookmark** → an M3 toggle icon button (selected and unselected states). **Maximize** → an M3
  standard icon button.
- **Scroll arrows** → M3 standard icon buttons.
- **Vote rows** → the colored choice row stays, and the round `vote-radio` becomes an M3 radio
  (single-choice) or checkbox (multi-choice), with M3 state layers for hover, focus and press.
- **Closed, editing, blocked and vote-error messages** → M3 supporting text in `on-surface-variant`,
  with `error` for the vote error.

a. Accept the mapping above, with Live Results as a tonal button
Recommended
[X] Accepted
Of the controls on the card, only Vote/Submit should read as the primary action, so Live Results
takes the next emphasis level down (tonal).

b. Accept the mapping above, with Live Results as an assist chip
[ ] Accepted
This is lighter than a tonal button. It reads as a secondary action beside the Vote button.

Other.
[ ] Accepted


6. Interaction feedback (state layers and ripple)
[X] Resolved
M3 shows hover, focus and pressed states as a translucent overlay (8%, 10% and 10% of the
content color). The Android implementation adds a ripple on press.

a. CSS state layers only, no ripple
Recommended
[ ] Accepted
Use a `::before` overlay per interactive element, driven by `:hover`, `:focus-visible` and
`:active`. It needs no JavaScript and is easy to port back into `src/public`.

b. State layers plus a JavaScript ripple
[X] Accepted
This is closer to Android, but it adds JavaScript to `pollCard.js` or `harness.js`, and that
code would have to be ported as well.

Other.
[ ] Accepted


7. Where the Material 3 styles live
[X] Resolved
`pollCard.css`, `site.css` and `tabs.css` are verified copies of production (REQUIREMENT003).
The restyle can either edit those files or be layered on top of them.

a. A new `pollCard-m3.css`, loaded last, that overrides the copies
Recommended
[X] Accepted
The copies stay identical to production, so a diff against `src/public` stays empty. The M3
tokens and every override sit in one file, which becomes the porting checklist. Any markup
changes needed, such as an M3 checkbox in the vote row, are made in the `pollCard.js` copy and
listed in NOTES.

Details:

What is in the folder now
- `poll-card.html` loads `tabs.css`, then `pollCard.css`, then `site.css`, then `pollCard.js`
  and `harness.js`.
- `pollCard.css` and `pollCard.js` are byte-for-byte copies of `src/public/`.
- `site.css` (266 lines) and `tabs.css` (62 lines) are trimmed copies. Every card rule they keep
  matches production exactly, as checked in REQUIREMENT003.
- That baseline is what lets us say "the prototype card equals the production card, plus the
  M3 changes."

How option a works
1. A new `pollCard-m3.css`, linked after `site.css` in `poll-card.html`. Because it loads last,
   its rules win against the copies at equal specificity, so most overrides need no
   `!important` or extra selector weight. It holds, in order:
   - Tokens: `--md-sys-color-*` roles from the moss seed (clarification 1),
     `--md-sys-typescale-*` for Roboto (clarification 2), `--md-sys-shape-*` corner sizes,
     `--md-sys-state-*` opacities (8%, 10%, 10%) and elevation.
   - Component overrides, grouped by the clarification 5 mapping: filled buttons
     (`.btn-vote`), icon buttons (`.bookmark-btn`, `.maximize-btn`, Back, `.arrow-row`), the
     tonal button and input chip (`.live-link`), radios and checkboxes in vote rows, and
     supporting text (`.poll-closed-message`, `.poll-editing-message`,
     `.poll-blocked-message`, `.poll-vote-notice`).
   - State layers: the `::before` overlays for hover, focus and press.
   - Left alone on purpose: `.card-face` keeps its container (clarification 4), and the bar
     fills, tints, inks and clipped copy keep their colours (clarification 3).
2. The ripple (clarification 6b) goes in its own `pollCard-m3.js`, loaded after `pollCard.js`.
   One delegated `pointerdown` listener on `.card-grid` adds the ripple to any M3 interactive
   element, with no changes inside `pollCard.js`.
3. The Roboto font link is added to `poll-card.html` next to the existing Fraunces/Inter link.
   The old link stays, because the copies still refer to those fonts until they are
   overridden.

Where the copies still have to change
CSS alone can't turn the round vote marker into an M3 checkbox for multi-choice polls.
`pollCard.js:812` builds it as `radio.className = 'vote-radio' + …`, a styled `<span>` with no
checkmark inside. The M3 checkbox needs a checkmark glyph and a separate class for multi-choice
polls, so `pollCard.js` needs a small, marked edit. That breaks the "identical to production"
guarantee for that one file. Each edit carries an `M3:` comment and is listed in NOTES, so a
diff against `src/public/pollCard.js` shows only those edits. The CSS copies stay identical.

Porting to production
- Copy the token block and overrides into `src/public` (or ship `pollCard-m3.css` as its own
  stylesheet).
- Add `pollCard-m3.js` and apply the marked `pollCard.js` edits.
- Diffing the prototype folder against `src/public` lists exactly those items.

Trade-offs
- Pros: the production baseline stays provable, all M3 work is in two new files, and the change
  can be switched off by removing two `<link>`/`<script>` tags.
- Cons: each overridden rule exists twice (the copy and the override), so reading the final
  style means checking both files. A few overrides may need a slightly more specific selector
  where production uses compound selectors such as `.card-front .question-row`.

b. Edit `pollCard.css` and `site.css` in place
[ ] Accepted
Fewer override selectors fight each other, but the production baseline is lost inside the
prototype, and porting means diffing whole files.

Other.
[ ] Accepted


8. Dark theme
[X] Resolved
M3 defines a dark scheme for every color role. The site has no dark mode today.

What exists today:
- The site has no dark mode. Nothing in `src/public` or the prototype uses
  `prefers-color-scheme`.
- The colours are fixed light values in `pollCard.css:15-27`, including `--ink:#1E2422`,
  `--paper:#F1F3EE`, `--paper-raised:#FFFFFF`, `--line:#D8DCD3` and `--muted:#6B7268`.
- The admin-card prototype is light only.

A possible middle path (choose Other to take it): light only, but also write the dark role
values in `pollCard-m3.css` inside a block that is never turned on, such as
`:root[data-m3-theme="dark"]`, with no bar or container changes. That records the dark palette
for later without the problems listed under option b. Option a is still recommended, because
dark tokens that are never shown aren't checked by anyone.

a. Light scheme only
Recommended
[ ] Accepted
This matches the site and the admin-card prototype. The role tokens make a dark scheme a later,
self-contained addition.

Details:
- `pollCard-m3.css` defines one set of `--md-sys-color-*` role values from the moss seed, and
  every M3 override reads those roles rather than raw hex values.
- A dark scheme can be added later as a single block
  (`@media (prefers-color-scheme: dark) { :root { --md-sys-color-*: … } }`) without touching
  the component rules. That is the main benefit of using roles.
- Nothing already decided (clarifications 3 and 4) needs reopening.
- Pros: matches the site and the admin card, keeps the scope to "restyle to M3", and leaves
  nothing half-finished.
- Cons: no dark mode, and someone has to come back later to add it.

b. Light and dark schemes, following `prefers-color-scheme`
[X] Accepted
This defines dark values for every role now. The xkcd bar fills (clarification 3) were chosen
for a light background and would need checking against dark surfaces.

Details: it is more than a second token block, because it runs into two earlier decisions.
1. It conflicts with clarification 4 (keep today's container). `.card-face` is
   `var(--paper-raised)` white with a `var(--line)` border and `var(--shadow)`
   (`pollCard.css:111-118`), and the page is `var(--paper)`. A dark scheme means overriding
   those production tokens, or `.card-face` itself, in dark mode. That breaks "keep
   `.card-face` exactly as it is" and makes the card differ from the admin-card prototype in
   dark mode.
2. It conflicts with clarification 3 (keep bar colours exactly as they are).
   - The 50 xkcd fills are light pastels (for example `#98EFF9` and `#FFE5AD`). On a dark
     surface they glare, though the text on them keeps its 7:1 contrast, because
     `inkOnFillFor` is computed against the fill.
   - The tracks are worse. JavaScript computes each one as
     `mixWithWhite(fill, RESULTS_TRACK_TINT)` (`pollCard.js:353-376`) and writes it as an inline
     style. CSS can't change it, so every track stays a near-white strip on a dark card.
   - Fixing that means changing `pollCard.js`: for example, a `mixWithBlack` path chosen by
     `matchMedia('(prefers-color-scheme: dark)')`, dark-surface inks, and a listener for when
     the scheme changes. That rewrites feature 022's colour logic, which clarification 3 said
     to leave intact.
   - Yes/No (`#018826` and `#CF0234` on an 85% white tint, with white text on the fill) raise
     the same track problem.
3. Other work it adds:
   - Dark values for every role, including the state-layer and ripple colours.
   - Dark tuning for the Roboto type colours.
   - A harness switch to force light or dark for review.
   - Checking the bookmark, maximize and live-bars SVG colours.
   - Porting all of it to a site that has no dark mode anywhere else, so the card would be the
     only dark element on a light page.
- Pros: follows the system setting now, as M3 expects.
- Cons: reopens clarifications 3 and 4, changes 022's colour code, and makes a dark card on an
  otherwise light site.

Other.
[ ] Accepted

## RECOMMENDATION
[X] Resolved

1. M3 layer in two new files, with dark bar colours computed per scheme in `pollCard.js`
[X] Accepted
Builds everything the clarifications chose (1a, 2b, 3a, 4d, 5a, 6b, 7a, 8b). In the light
scheme the card's container and bar colours are exactly as they are today. In the dark scheme
they change only as far as needed to work on a dark surface: the price of 8b, which reopens 3a
and 4d for dark mode only.

Files
- New `pollCard-m3.css`, linked after `site.css` in `poll-card.html`.
- New `pollCard-m3.js`, loaded after `pollCard.js` and before `harness.js`.
- `poll-card.html`: add Roboto (`family=Roboto:wght@400;500;700`) to the Google Fonts link
  (Fraunces and Inter stay, because the copies still name them), and the two new files.
- `pollCard.js`: small edits, each marked with an `M3:` comment and listed in NOTES (below).
- `harness.js`: a Theme picker in `.prototype-bar` (System / Light / Dark) that sets or removes
  `data-theme` on `<html>`.
- `pollCard.css`, `site.css` and `tabs.css` stay byte-identical to their REQUIREMENT003 state.

`pollCard-m3.css`, in this order
1. Colour roles. The `--md-sys-color-*` light and dark schemes, generated once from the moss
   seed `#3D5A46` with amber `#E8A33D` as the tertiary source, using
   `@material/material-color-utilities` in a throwaway script in the scratchpad; the values are
   pasted in, so the prototype has no dependency. Light surfaces are anchored to the site:
   `surface` `#FFFFFF` (the card), `surface-container-low`/page `#F1F3EE` (paper),
   `on-surface` `#1E2422` (ink). Dark scheme selectors:
   `@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ … } }` and
   `:root[data-theme="dark"]{ … }`, so the harness can force either scheme.
   The production tokens (`--ink`, `--paper`, `--paper-raised`, `--line`, `--track`,
   `--choice-unselected`, `--choice-selected`, `--muted`, `--shadow`) are redefined in the dark
   blocks only, in terms of the roles, so every production rule that reads them follows the
   scheme without being overridden one by one.
2. Type scale. `--md-sys-typescale-*` for the roles used, with `'Roboto', system-ui,
   sans-serif`:
   - `.question` → Title Large (22/28, 400), keeping `clamp()` so it still shrinks on narrow
     cards (18–22px).
   - `.subtitle` → Body Medium (14/20, 400), in `on-surface-variant`.
   - `.result-label`, `.vote-label`, `.result-pct` → Label Large (500, 0.1px tracking). Their
     font sizes stay the inline JavaScript values, because bar height drives them.
   - `.btn-vote`, `.live-link-label` → Label Large.
   - `.poll-totals`, `.poll-voted`, `.poll-listed-because` and the four notices → Body Small
     (12/16, 400).
3. Shape and state tokens: `--md-sys-shape-corner-full`/`-medium` (12px)/`-small` (8px), and
   `--md-sys-state-hover: 0.08`, `-focus: 0.10`, `-pressed: 0.10`.
4. Container (4d). Light: no rule, so `.card-face` keeps today's white fill, hairline,
   `var(--shadow)` and 20/18px radius. Dark: `.card-face` takes `surface-container-low`, a 1px
   `outline-variant` border and no shadow (M3 dark surfaces show elevation by tone, not
   shadow); the page takes `surface`.
5. Components (5a). The card is compact, so the controls use M3's extra-small sizes, with a
   48px touch target from an invisible `::after`:
   - `.btn-vote` (Vote, Submit vote) → filled button: `primary` / `on-primary`, 32px high,
     `corner-full`, 16px side padding. Disabled: `on-surface` at 12% fill and 38% label. The
     `.btn-vote-sizer` width trick (008 FR-007) is untouched.
   - `.back-btn` → standard icon button: transparent, 32px round, `on-surface-variant` icon.
     The production border and paper fill are removed.
   - `.maximize-btn` → standard icon button, same size and colour.
   - `.bookmark-btn` → toggle icon button: unselected `on-surface-variant`, selected
     (`aria-pressed="true"`) `primary`. The existing SVG and its star animation are kept.
   - `.live-link` (add form) → tonal button: `secondary-container` / `on-secondary-container`,
     32px, `corner-full`, the live-bars icon as its leading icon. The equaliser animation and
     its reduced-motion freeze are kept. The amber hover underline is removed; the state
     layer replaces it.
   - `.live-link` (remove form, the ×) → input chip: 32px, `corner-small` (8px), 1px
     `outline` border, the × as its trailing icon.
   - `.arrow-row` → standard icon button look: transparent fill, `on-surface-variant` chevron,
     state layer on hover and press. Their size and position stay, because the scroll layout
     measures them.
   - `.vote-row` → keeps its shape and the `--choice-unselected`/`--choice-selected` fills
     (restated as roles in dark mode), plus a state layer.
   - `.vote-radio` → M3 radio: 2px `on-surface-variant` ring; selected is a `primary` ring with
     a `primary` dot at 50%. With `.is-multi` on the list (see the `pollCard.js` edits) it
     becomes an M3 checkbox: 2px radius square, `on-surface-variant` border; selected is a
     `primary` fill with an `on-primary` checkmark drawn by `::after` (a rotated border), so no
     glyph is added to the markup.
   - `.poll-closed-message`, `.poll-editing-message`, `.poll-blocked-message`,
     `.poll-vote-notice` → supporting text in `on-surface-variant`; `.poll-vote-error` in
     `error`.
6. State layers (6b). Every control above gets `position:relative; overflow:hidden` (where it
   doesn't have them) and a `::before` in `currentColor` with `opacity` 0, set to the hover,
   focus-visible and pressed opacities. Focus also gets M3's 3px `secondary` focus ring
   (`outline`, offset 2px) on `:focus-visible`.
7. Ripple styles: `.m3-ripple` (absolute, round, `currentColor`, a 450ms scale-and-fade
   `@keyframes`), and none of it under `prefers-reduced-motion: reduce`.

`pollCard-m3.js` (the ripple)
- One `pointerdown` listener on `document`, filtered by `event.target.closest(...)` to the
  controls listed above, so it covers every card, including ones mounted later and the
  maximized one, without touching `pollCard.js`.
- Skips disabled controls, non-primary mouse buttons and `prefers-reduced-motion: reduce`.
- Adds a `span.m3-ripple` sized to twice the control's longest side, centred on the pointer,
  and removes it on `animationend`. Keyboard presses get no ripple; the focus layer covers
  them, as in M3.

`pollCard.js` edits (marked `M3:`)
1. Multi-choice checkbox. Where `initPollCard` renders the vote face from `poll`, toggle
   `is-multi` on `.voting-list` when `poll.choiceMode !== 'Single-Choice Poll'`. One line.
2. Dark bar colours (8b). `BAR_COLORS` keeps its light entries unchanged. A second map,
   `BAR_COLORS_DARK`, gives each fill a track mixed toward the dark `surface-container-low`
   (same 0.80 / 0.85 amounts, through a `mixWith(hex, base, amount)` beside `mixWithWhite`) and
   an `inkOnTrack` from a `lightShadeFor(track)` that climbs lightness until the contrast is at
   least 7:1 (the mirror of `darkShadeOf`). The fills themselves, `inkOnFill` and the white
   Yes/No copy stay as they are.
   `applyBarColors` then sets custom properties instead of the inline colours:
   `--bar-track`/`--bar-ink` (light) and `--bar-track-dark`/`--bar-ink-dark`. `pollCard-m3.css`
   picks the pair for the scheme (`.result-row{ background:var(--bar-track) }`, and the dark
   pair inside the dark selectors). The scheme can change while the page is open, and CSS
   follows it without a re-render, so no `matchMedia` listener is needed. This is the only
   change to 022's colour code, and in the light scheme it renders the same colours as today.
   Because the inline `background` and `color` no longer exist, `pollCard.css` alone would
   show untinted rows. That is acceptable only because `pollCard-m3.css` always loads with
   it; NOTES records it as a porting prerequisite.

Checks
- `node --check` on all three scripts and the jsdom smoke run (all five fixtures, both faces,
  no errors).
- A jsdom check that a single-choice fixture has no `.is-multi` and a multi-choice one does,
  and that every result row carries the four custom properties.
- A script that asserts every `BAR_COLORS_DARK` `inkOnTrack` is at least 7:1 against its track,
  and every light entry equals today's value.
- Not checkable here (no browser): the look, the ripple, and both schemes. Please check each
  fixture with the Theme picker on Light, on Dark and on System.

Pros:
- Satisfies every resolved clarification, including a real dark scheme that stays readable.
- The light card matches today's production container and bar colours exactly.
- The M3 work is in two new files, plus two marked `pollCard.js` edits that are easy to port.
- The scheme switch is pure CSS, so there is nothing to re-render or leak.

Cons:
- Changes feature 022's `applyBarColors`, which the project calls easy to get wrong; the light
  values are protected by the equality check above.
- Porting needs `pollCard-m3.css`, or its bar rules, wherever `pollCard.js` is used.
- The pastel fills on a dark card are bright; they stay unchanged because they are data colours.

2. Same M3 layer, but the bars sit on a light "data well" in dark mode, with no `pollCard.js` colour change
[ ] Accepted
Everything in recommendation 1 is the same (files, tokens, typography, components, state layers,
the ripple, the `is-multi` edit, the Theme picker and the checks), except dark bar colours.
- `pollCard.js` edit 2 is dropped. `BAR_COLORS`, `applyBarColors` and the inline colours stay
  exactly as in production, so feature 022's code is untouched (3a holds in full).
- In the dark scheme, `.bar-scroll-wrap` on both faces becomes an M3 inset panel: the light
  scheme's `surface-container-low` (`#F1F3EE`), 12px radius and 8px padding. Inside it, the
  production tokens are reset to their light values, so bars, labels, percentages, vote rows,
  radios and the scroll arrows look exactly as they do in light mode.
- The measured layout (`computeBarLayout`) reads the wrap's inner size, so the 8px padding
  shortens the bar area slightly in dark mode only; the checks confirm the layout still fits.

Pros:
- No change at all to 022's colour logic, and no new contrast maths to verify.
- The data colours are shown on the background they were designed for, in both schemes.

Cons:
- A light panel in a dark card is not a true M3 dark scheme, and it is bright at night.
- The bar area is 16px smaller in each direction in dark mode, so polls with many choices get
  slightly thinner bars there.

## NOTES
Implemented recommendation 1, with clarifications 1a, 2b, 3a, 4d, 5a, 6b, 7a and 8b.

Files
- New `pollCard-m3.css`, loaded last. In order:
  1. Colour roles, light and dark. Values were generated with `@material/material-color-utilities`
     (tonal spot, moss `#3D5A46` seed, amber `#E8A33D` as the tertiary palette) and pasted in.
     Light surfaces are anchored to the site: `surface` `#FFFFFF`, `surface-container-low`
     `#F1F3EE`, `on-surface` `#1E2422`. The dark block is written twice, once under
     `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])` and once
     under `:root[data-theme="dark"]`. It also restates the production tokens (`--ink`, `--paper`,
     `--paper-raised`, `--moss`, `--line`, `--track`, `--choice-*`, `--muted`, `--shadow:none`) as
     roles, so `.card-face` needs no rule of its own. In light, the container is production's
     exactly.
  2. Type scale (Roboto): Title Large for the title (kept in a `clamp(18px, 1.8vw, 22px)`), Body
     Medium for the subtitle, Label Large for bar text and buttons, Body Small for the footer lines
     and the four notices.
  3. Shape and state tokens.
  4. Components: the Vote/Submit filled button (32px, full radius, M3 disabled colours); Back,
     Maximize and Bookmark as 32px icon buttons (Bookmark selected = `primary`, star stays red);
     Live Results as a tonal button, and as an input chip in remove form (picked with
     `:has(.live-x:not([hidden]))`, no markup change); arrow rows in `on-surface-variant`; the M3
     radio, and the checkbox under `.voting-list.is-multi`, drawn with `::after`; supporting text
     in `on-surface-variant` and `outline`.
  5. State layers: a `::before` in `currentColor` at 8/10/10%, plus a 3px `secondary` focus ring
     on `:focus-visible`.
  6. The ripple styles.
- New `pollCard-m3.js`: the ripple, one delegated `pointerdown` listener on `document`. It skips
  disabled and inert controls, non-primary buttons and reduced motion. A vote row is rebuilt by
  the click that follows the press (`renderVotingOptions` empties the list), so its ripple is
  hosted in a clipping `span.m3-ripple-host` laid over the row inside `.bar-scroll-inner`, which
  survives the rebuild.
- `pollCard.js`: two edits marked `M3:`. A diff against `src/public/pollCard.js` shows only
  these edits, and the file keeps its CRLF line endings.
  1. `render()` toggles `is-multi` on `.voting-list` when the poll is not a Single-Choice Poll.
  2. `BAR_COLORS_DARK` (`mixWith`, `lightShadeFor`, `darkBarColorsFor`, three constants) is added
     after `BAR_COLORS`. `applyBarColors` now sets `--bar-track`, `--bar-ink`, `--bar-track-dark`
     and `--bar-ink-dark` on each result row, instead of an inline background and colour.
     **Porting prerequisite:** without `pollCard-m3.css` (or its `.result-row` rules), the rows
     fall back to `var(--track)` and `var(--ink)` and lose their tints.
- `poll-card.html`: adds Roboto to the Google Fonts link, and the two new files. The prototype bar
  gains a Theme picker (System / Light / Dark) and a "Live Results tab (remove form)" checkbox.
- `harness.js`: the Theme picker sets or removes `data-theme` on `<html>`. The checkbox remounts
  the card with an `onClose` stub, so the input chip can be seen.
- `pollCard.css`, `site.css` and `tabs.css` are unchanged (`pollCard.css` still matches
  `src/public` byte for byte).

Deviations from the recommendation
- The vote error uses Body Medium (500) rather than Body Small, in `error`, so a failure the voter
  caused stays prominent. The blocked message moves from 15.5px/1000 to Body Small, as
  recommended.
- The dark `--choice-selected` is `tertiary-container` (`#643F00`), the amber counterpart of
  production's tan `#E4D3AE`.
- The remove-form checkbox in the harness wasn't in the recommendation. It was added so the input
  chip can be reviewed.

Checked
- `node --check` on `pollCard.js`, `pollCard-m3.js` and `harness.js`.
- jsdom smoke run, all passing:
  - Every fixture renders in both Live Results forms. Every result row carries the four custom
    properties and no inline track or ink.
  - `is-multi` is set only on the multi-choice fixtures, and `.live-x` shows only in remove form.
  - A vote-row press adds a hosted ripple that survives the rebuild, and a Back press adds a
    ripple.
  - The Theme picker sets and clears `data-theme`.
  - No script errors.
- Colour check: all 52 `BAR_COLORS` entries equal production's. Every `BAR_COLORS_DARK`
  `inkOnTrack` is at least 7:1 against its track (lowest 7.01:1).

Not checked (no browser here, and jsdom does no layout or CSS cascade)
- How the card looks in either scheme, the ripple and state-layer animations, the checkbox and
  radio drawing at small bar heights, and whether the 32px controls still leave the action row
  and title row tidy at narrow widths.
- Please open `poll-card.html` and check each fixture with Theme on Light, Dark and System, with
  and without the remove-form checkbox, at a few widths (for example 1280, 640 and 375px).

# REQUIREMENT Font Size Question

[X] Resolved

## SHORT SUMMARY
A question, not a change: are the Poll Card's font sizes, particularly the title and subtitle,
set by Material 3 or chosen for this prototype? Answer in brief: both. Each text element is
assigned an M3 type-scale role (the assignment itself is our choice), and its font, weight,
line height and tracking come from that role. Two sizes are custom: the title shrinks below
M3's 22px on narrow windows, and the bar labels and percentages keep production's 7–11px sizes,
which scale with bar height.

| Element | M3 role | Size in the prototype | M3 or custom |
|---|---|---|---|
| Title (`.question`) | Title Large (22/28, 400) | `clamp(18px, 1.8vw, 22px)`, line height 1.27 | Role, weight and line-height ratio are M3; the shrink to 18px is custom, kept from production so long titles fit narrow cards |
| Subtitle (`.subtitle`) | Body Medium (14/20, 400, 0.25px) | 14px | M3 exactly (production was 11–12.5px) |
| Bar labels and percentages | Label Large (500, 0.1px) | 7–11px, set by `scaleFontSize` from bar height | Font, weight and tracking are M3; size is custom (production's), because up to 50 bars must fit the card |
| Vote / Submit vote, Live Results | Label Large (14/20, 500, 0.1px) | 14px | M3 exactly |
| Footer lines and the four notices | Body Small (12/16, 400, 0.4px) | 12px | M3 exactly |
| Vote error | Body Medium (14/20, weight 500) | 14px | M3 role; the 500 weight is custom (NOTES, REQUIREMENT004) |

M3 defines the scale (sizes per role) but not which role a custom component's text takes. For
cards its guidance uses a Title role for the headline and Body Medium for supporting text,
which is what the prototype follows.

## REQUIREMENT DETAILS

The Poll Card prototype looks great so far.  
Our question regards font sizes for the various text elements in the Poll Card prototype, particularly the title and subtitle.  
Is the selection of those font sizes determined by Material 3 guidelines, or is it a custom choice for this prototype?

## CLARIFICATIONS

1. What this requirement should produce
[X] Resolved
The requirement asks a question. It can be closed with the answer alone, or the answer can be
used to make the sizes stricter M3.

a. Answer only; record it in NOTES, no code change
Recommended
[X] Accepted
The summary above is the answer. It goes into NOTES, and the prototype stays as it is. Any
size change can be raised as its own requirement once you have looked at the card.

b. Make the title a fixed M3 Title Large (22px)
[ ] Accepted
Drop the `clamp()` so the title is always 22/28. It is strict M3, but long titles wrap to more
lines on narrow cards and take height from the bars. The bar labels stay custom, since a fixed
M3 size can't fit 50 bars.

c. Put the bar text on M3 roles as far as the bar height allows
[ ] Accepted
Snap `scaleFontSize` to M3 sizes instead of interpolating: Label Small (11px) where a bar is
tall enough, and the compact no-text mode below that, dropping the 7–10px in-between sizes.
Bars in polls with many choices lose their labels sooner. This changes `pollCard.js` again.

Other.
[ ] Accepted
<The developers will enter their own resolution in the console of CC CLI.>

## RECOMMENDATION
[X] Resolved

1. Record the answer in NOTES and close the requirement without a code change
[X] Accepted
- Add a `## NOTES` section to REQUIREMENT005 that points to the SHORT SUMMARY table as the
  answer. It also records where each size is set: the title and subtitle in the Components
  section of `pollCard-m3.css`; the bar sizes in `scaleFontSize` (`RESULTS_FONT_MIN` 7,
  `RESULTS_FONT_MAX` 11, `RESULTS_FONT_FULL_HEIGHT` 26) in `pollCard.js`; and the role sizes in
  the `--md-sys-typescale-*` tokens.
- Mark REQUIREMENT005 `[X] Resolved`. No file other than `iterative-requirements.md` changes.

Pros:
- Answers the question with no risk to the card you have just approved.
- Leaves any size change, such as a fixed 22px title or M3-snapped bar text, to its own
  requirement, where it can be decided after looking at the card.

Cons:
- The two custom sizes (the title's shrink below 22px and the 7–11px bar text) stay custom.

## NOTES
Implemented recommendation 1, with clarification 1a. No code change; only this file changed.

- The answer is the SHORT SUMMARY table above: each text element takes an M3 type-scale role
  (the assignment is ours), and the role supplies font, weight, line height and tracking. Two
  sizes are custom: the title's shrink below 22px and the 7–11px bar text.
- Where each size is set:
  - Role sizes: the `--md-sys-typescale-*` tokens in `pollCard-m3.css` (Title Large 22/28/400,
    Body Medium 14/20/400/0.25px, Body Small 12/16/400/0.4px, Label Large 14/20/500/0.1px).
  - Title and subtitle: `.card-face .question` (`clamp(18px, 1.8vw, 22px)`) and
    `.card-face .subtitle` in the Components section of `pollCard-m3.css`.
  - Bar labels and percentages: `scaleFontSize` in `pollCard.js`, interpolating between
    `RESULTS_FONT_MIN` (7) and `RESULTS_FONT_MAX` (11), reaching the max at
    `RESULTS_FONT_FULL_HEIGHT` (26px bar height).
- A fixed 22px title (option 1b) or M3-snapped bar text (option 1c) can be raised as its own
  requirement.


# REQUIREMENT Maximized Poll Card Using Material 3

[X] Resolved

## SHORT SUMMARY
Carry the approved Material 3 Poll Card (REQUIREMENT004–005: moss-seeded colour roles in light
and dark, Roboto on the M3 type scale, today's `.card-face` container, filled Vote button, tonal
Live Results, 32px icon buttons, M3 radio/checkbox, state layers and ripple, 022 bar colours
untouched) over to the maximized view in `MAXIMIZED-POLL-CARD/` (`single-card.html`, and
`single-card-back.html`, which opens it on the back face). The maximized view adds what the grid
card does not have: the × close control above the card, the 2px rule, and the
`.maximized-space-right` panel beside the card (below it under 768px), plus fixed bar sizing (50→25px
over 2..50 choices, 2px gap, no scrolling). Found while reading: `single-card.html` is a frozen
static extraction from 2026-09-22 with its own inline script, and its bars use the experimental
'vibrant' palette, not the 022 palette the approved card shows. The approved card's `pollCard.js`
already has the live maximized mode (`setMaximized`, `maximizedBarLayout`).

## REQUIREMENT DETAILS

Apply the same material 3 design principles, accepted recommendations and accepted clarifications, in the Requirements above, in the design and implementation of the maximized poll card, ensuring consistency with the previously approved card while accommodating the larger layout and additional content.  

The existing maximized Poll Card prototype can be found in the directory `prototypes\POLL-CARD-MATERIAL3\MAXIMIZED-POLL-CARD`.  
The relevant html files are `single-card.html` and `single-card-back.html`. 

## CLARIFICATIONS

1. Which maximized card to build on
[X] Resolved
`single-card.html` is a static copy of the card's DOM with numbers baked in (bar heights, fonts,
colours) and ~600 lines of its own script. The approved M3 card is the live `pollCard.js` plus
`pollCard-m3.css`/`pollCard-m3.js`, which already maximizes itself in production
(`setMaximized(true)` adds `maximized-card-viewport` / `maximized-card-flip` and switches to
`maximizedBarLayout`).

a. Rebuild `single-card.html` as a live page that mounts the approved card, maximized
Recommended
[X] Accepted
Keep the file names. `single-card.html` gets production's `.maximized-card-grid` markup (from the
`maximizedCardGrid` template in `src/public/index.html`) and mounts the card from
`../pollCard.js` with `setMaximized(true)`, styled by `../pollCard-m3.css` and animated by
`../pollCard-m3.js`. `single-card-back.html` keeps opening `single-card.html#back`, which flips the
live card. The M3 styling is then shared with the grid card rather than copied, so the two cannot
drift, and votes, flip, bookmark and ripple all work. The old static page's files
(`poll-card.css`, `page-layout.css`, `poll-card-app.css`) are no longer loaded.

b. Restyle the static page in place
[ ] Accepted
Load `pollCard-m3.css` into the existing static `single-card.html` and adjust. Nothing moves, but
the baked numbers, the 'vibrant' colours and the inline script stay, the card is not interactive,
and every later change to the approved card has to be copied by hand.

c. A new live page beside the static one
[ ] Accepted
As (a), but in a new file (for example `MAXIMIZED-POLL-CARD/maximized-card-m3.html`), leaving
`single-card.html` and `single-card-back.html` untouched for comparison.

Other.
[ ] Accepted
<The developers will enter their own resolution in the console of CC CLI.>


2. Bar colours on the maximized card
[X] Resolved
The static page draws bars with `RESULTS_TEXT_MODE = 'vibrant'` (dark xkcd fills, 80% tints,
light-or-dark ink). The approved card keeps production's 022 palette (light fills, dark ink,
Yes/No `#018826` / `#CF0234`) plus REQUIREMENT004's `BAR_COLORS_DARK` for dark mode.

a. The approved card's colours
Recommended
[X] Accepted
Clarification 3a of REQUIREMENT004 applies unchanged: the maximized card shows exactly what the
grid card shows, in both schemes. The 'vibrant' experiment is dropped.

b. Keep the 'vibrant' palette on the maximized card
[ ] Accepted
The two views would colour the same poll differently, and the vibrant fills have no dark-scheme
variants yet.

Other.
[ ] Accepted
<The developers will enter their own resolution in the console of CC CLI.>


3. The × close control
[X] Resolved
The static page has a 42px × button (`.maximized-card-close`) on its own row above the card, 1.5×
the old `.icon-btn`. Production has no such button: the card's own Minimize button, a click on
the active tab, and Escape close the view.

a. Keep it, as an M3 standard icon button
Recommended
[X] Accepted
40px container (M3's default icon-button size, a step up from the card's 32px buttons, as the
42px was), 24px × icon, full radius, `on-surface-variant`, with the same state layers, focus ring
and ripple as the card's icon buttons. It stays on its own row at the top right, outside the
flip, on both faces. In the prototype it goes back one page in history, as now.

b. Remove it, as in production
[ ] Accepted
The card's Minimize button is the only close control, which matches the app. The page gains an
Escape listener so the prototype can still be dismissed from the keyboard.

c. Keep it exactly as it is
[ ] Accepted
42px, 16.5px radius, `--moss` focus outline: not M3 and not matched to the card.

Other.
[ ] Accepted
<The developers will enter their own resolution in the console of CC CLI.>


4. The side panel and the rule between
[X] Resolved
`.maximized-space-right` is a lorem-ipsum placeholder on a hard-coded `#E6E6E6` in 13px Inter, and
the rule is 2px `var(--line)`. Neither follows the dark scheme.

a. An M3 outlined card, with an M3 divider colour
Recommended
[X] Accepted
The panel becomes an M3 outlined card, as REQUIREMENT004 clarification 4d prescribes for inner
panels and as the admin card does: `surface` fill, 1px `outline-variant` border, 12px radius, 16px
padding, text in Body Medium `on-surface-variant`. The rule takes `outline-variant` but keeps its
2px width and the 8px gaps either side, so the 898px / 808px / 768px layout thresholds do not
move. Both follow Light / Dark / System.

b. An M3 filled card, no rule
[ ] Accepted
`surface-container-highest` fill, 12px radius, no border; the rule is removed and the 18px trough
alone separates the two. Softer, but the panel reads less like a separate region beside the white
card.

c. Leave the placeholder as it is
[ ] Accepted
It is only a placeholder until its content is designed. It stays grey in dark mode.

Other.
[ ] Accepted
<The developers will enter their own resolution in the console of CC CLI.>


5. Text sizes at the maximized size
[X] Resolved
The maximized card is 375–420px wide and its bars are 25–50px tall. REQUIREMENT005 found two
custom sizes on the grid card: the title's `clamp(18px, 1.8vw, 22px)` and the 7–11px bar text
(`scaleFontSize` reaches 11px at a 26px bar, so every maximized bar gets about 11px).

a. The grid card's sizes, with the title fixed at Title Large
Recommended
[X] Accepted
The title is always 22/28 on the maximized card (under `.maximized-card-flip`), since its width no
longer follows the window grid. Everything else, bar text included, is exactly the grid card's,
so the two views read as the same card. A larger bar text can be raised as its own requirement.

b. As (a), and bar text grows with the taller bars
[ ] Accepted
In maximized mode only, bar labels and percentages scale from 11px at a 25px bar up to Label
Large's 14px at 40px and above. Easier to read with few choices, but it changes `pollCard.js`
(the maximized layout would return a font size) and the two views then differ.

c. Exactly the grid card's sizes, clamp included
[ ] Accepted
No maximized-specific rule at all.

Other.
[ ] Accepted
<The developers will enter their own resolution in the console of CC CLI.>


6. Sample data and page controls
[X] Resolved
The static page shows one stress-case poll (a long question and 50 choices). The grid card's
page has a fixture picker, a Theme picker (System / Light / Dark) and the remove-form checkbox.
Only relevant if clarification 1 is (a) or (c).

a. The grid card's controls and fixtures, plus the 50-choice stress poll
Recommended
[X] Accepted
Reuse `../harness.js`'s five fixtures and Theme picker, and add the static page's long-question,
50-choice poll as a sixth (the default on this page), so the 25px end of the bar range can be
checked. `ENV_MIN_CHOICES` 2 and `ENV_MAX_CHOICES` 50 stay as page constants, passed as
`choiceBounds`.

b. Only the 50-choice stress poll, with a Theme picker
[ ] Accepted
Closest to today's page, but the 2-bar and Yes/No ends of the range and the closed state cannot
be seen maximized.

Other.
[ ] Accepted
<The developers will enter their own resolution in the console of CC CLI.>

## RECOMMENDATION
[X] Resolved

1. One shared harness, a maximized section in `pollCard-m3.css`, and a live `single-card.html`
[X] Accepted
Applies clarifications 1a, 2a, 3a, 4a, 5a and 6a. Nothing under `src/` changes, and `pollCard.js`
gets no further edit: the maximized mode it already has (`setMaximized`, `maximizedBarLayout`,
the Minimize icon, `onMinimize`) is used as is.

Files
- `tabs.css` (parent folder): add production's maximized-grid rules from `src/public/tabs.css`
  word for word (`.maximized-card-grid` and its `[hidden]` rule, `.col-rule` with its
  `@container (max-width:767.98px)` rule, `.maximized-space-right` and its two `p` rules). This
  keeps REQUIREMENT004's pattern: the copies match production, and the M3 look is layered on top.
- `pollCard-m3.css`: a new section 8, "Maximized view":
  - Title: `.maximized-card-flip .card-face .question` at Title Large exactly, 22px / 28px, no
    `clamp()` (5a). Every other text rule is inherited unchanged.
  - Close control (3a): `.maximized-card-close` as an M3 standard icon button, 40px, full radius,
    transparent, `on-surface-variant`, 24px × icon. Its state layer, 3px `secondary` focus ring
    and hover/focus/press opacities reuse section 6's values. Section 6 is scoped to
    `.card-face`, and the button sits outside the card, so its selectors are added there by name.
  - Panel (4a): `.maximized-space-right` as an M3 outlined card: `surface` fill, 1px
    `outline-variant` border, `--md-sys-shape-corner-medium` (12px), 16px padding, Body Medium in
    `on-surface-variant`. The flex basis and `min-width` stay production's, so the 898 / 808 /
    768px thresholds do not move (`box-sizing:border-box` keeps the border and padding inside).
  - Rule (4a): `.col-rule` takes `outline-variant`, still 2px wide.
  - All of it follows Light / Dark / System through the role tokens already defined; no new
    colour values.
- `pollCard-m3.js`: add `.maximized-card-close` to the ripple targets. It is the one target not
  inside `.card-face`, so it joins the selector list without that prefix.
- `harness.js`: made page-aware, so both pages share one set of fixtures (6a):
  - A sixth fixture, `fifty`: the static page's long question, subtitle and 50 choices with the
    same percentages (read out of today's `single-card.html` before it is replaced). It also
    appears in `poll-card.html`'s picker, where it shows the grid card scrolling.
  - When `<body data-maximized>` is present, it mounts the card into `.maximized-card-grid`, moves
    it ahead of `.col-rule` (as production's `tabs.js` moves the tab's own card), calls
    `setMaximized(true)`, passes `choiceBounds` from the page's `ENV_MIN_CHOICES` (2) and
    `ENV_MAX_CHOICES` (50), and wires both the × and the card's Minimize button to
    `closeMaximizedCard` (history back, as today). It starts on `data-default-fixture`
    (`fifty`).
  - `#back` flips the live card: at load it adds `is-flipped` with the turn transition
    suppressed for that one frame, and a `hashchange` listener flips it either way afterwards.
  - Without `data-maximized`, `poll-card.html` behaves exactly as now.
- `MAXIMIZED-POLL-CARD/single-card.html`: rewritten (1a). It loads `../tabs.css`,
  `../pollCard.css`, `../site.css`, `../pollCard-m3.css` (Roboto added to the fonts link), then
  `../pollCard.js`, `../pollCard-m3.js`, `../harness.js`. The body holds the same prototype bar as
  `poll-card.html` (fixture, theme, remove-form checkbox), then
  `.page > .maximized-card-container > .maximized-card-grid` containing the close row, `.col-rule`
  and `.maximized-space-right` with production's placeholder paragraphs. Its `<style>` keeps only
  the close row's layout (own row, top right, `margin-bottom:-8px`), which is prototype-only.
- `MAXIMIZED-POLL-CARD/single-card-back.html`: unchanged; it still opens `single-card.html#back`.
- `MAXIMIZED-POLL-CARD/README.md`: rewritten to describe the live page. `poll-card.css`,
  `page-layout.css`, `poll-card-app.css`, `color-palette.md` and the folder's own
  `iterative-requirements.md` stay on disk as history but are no longer loaded; the README says
  so.

Checked after implementing: `node --check` on the three scripts; a jsdom run of both pages
(every fixture maximized and not, both Live Results forms, `#back` at load and by `hashchange`,
the × and Minimize calling the close hook, bar heights 50px at 2 choices and 25px at 50,
the maximized layout never scrolling, no script errors). Not checkable here: the look in a
browser, which you would confirm at a few widths in Light and Dark.

Pros:
- The maximized card is the approved card, not a copy, so later M3 changes reach both views.
- One place for fixtures and theme switching; the grid page gains a 50-choice case for free.
- Production's maximized-grid rules stay verbatim, so porting is again "add section 8".

Cons:
- `harness.js` now serves two pages and grows a small maximized branch.
- The grid card's picker shows a sixth fixture it did not ask for.

2. As 1, but with a separate harness for the maximized page
[ ] Accepted
Everything as in 1, except `harness.js` is untouched and a new `MAXIMIZED-POLL-CARD/maximized-harness.js`
holds the six fixtures, the maximized mounting, `#back` and the close wiring.

Pros:
- `poll-card.html` and its harness are left exactly as approved.

Cons:
- The five fixtures and the theme and remove-form wiring are duplicated, and can drift.

## NOTES
Implemented recommendation 1, with clarifications 1a, 2a, 3a, 4a, 5a and 6a. Open
`MAXIMIZED-POLL-CARD/single-card.html` (or `single-card-back.html`) directly; no server needed.

Files
- `tabs.css`: production's maximized-grid rules added after `.card-grid[hidden]`, word for word
  from `src/public/tabs.css` (`.maximized-card-grid` and `[hidden]`, `.col-rule` and its
  `@container` rule, `.maximized-space-right` and its two `p` rules).
- `pollCard-m3.css`: new section 8, "Maximized view", and the header's section list updated.
  - `.maximized-card-flip .card-face .question`: 22px / 28px (Title Large), no `clamp()`.
  - `.maximized-card-close`: 40px M3 standard icon button, 24px icon, full radius,
    `on-surface-variant`, its own `::before` state layer and 3px `secondary` focus ring at
    section 6's values (section 6 is scoped to `.card-face`, and this button is outside it).
  - `.maximized-space-right`: M3 outlined card (`surface`, 1px `outline-variant`, 12px radius,
    16px padding, Body Medium in `on-surface-variant`); `p` line height follows it.
  - `.col-rule`: `outline-variant`, width unchanged.
- `pollCard-m3.js`: `.maximized-card-close` added to the ripple targets, without the
  `.card-face` prefix.
- `harness.js`:
  - A sixth fixture, `fifty`: the static page's question, subtitle and 50 choices with its
    percentages (summing to 100), 100 votes. It appears in `poll-card.html`'s picker too.
  - A maximized branch, on when `<body data-maximized>` is present. It mounts into
    `.maximized-card-grid`, moves the card ahead of `.col-rule` (as `tabs.js` does), calls
    `setMaximized(true)`, passes `choiceBounds` `{ minChoices: 2, maxChoices: 50 }`, sets
    `onMinimize` and the × to `closeMaximizedCard` (`history.back()`), and starts on
    `data-default-fixture`. `#back` flips the card at load with the turn suppressed, and a
    `hashchange` listener flips it either way afterwards, with the turn.
  - `choiceBounds` is passed on the grid page too, where the card ignores it unless maximized.
- `MAXIMIZED-POLL-CARD/single-card.html`: rewritten as the live page. It loads the parent's four
  stylesheets and three scripts, holds the same prototype bar as `poll-card.html`, and
  production's `maximizedCardGrid` markup (the rule and the panel with its placeholder
  paragraphs) behind the close row. Its `<style>` keeps only the prototype bar and the close
  row's layout.
- `MAXIMIZED-POLL-CARD/README.md`: rewritten for the live page.
- `MAXIMIZED-POLL-CARD/single-card-back.html`: unchanged.
- `pollCard.js`, `pollCard.css`, `site.css` and `poll-card.html`: unchanged.

Deviations from the recommendation
- The static page was not simply overwritten. `prototypes/` is untracked in git, so the old page
  would have been lost; it is kept as `MAXIMIZED-POLL-CARD/single-card-static.html`, still
  loading its own `poll-card.css`, `page-layout.css` and `poll-card-app.css`.
- The page shell is production's `.page > .container > .layout`, not the static page's
  `.maximized-card-container`. In the app the maximized grid sits inside the tab's `.container`,
  and the parent's `tabs.css` already has those rules.

Checked (jsdom 24 installed in a scratch directory, not in the repo)
- `node --check` on `harness.js` and `pollCard-m3.js`.
- `poll-card.html`: six fixtures, starts on `open`, never maximized, one card after cycling all
  six, no script errors.
- `single-card.html`: starts on `fifty`; the grid's children are close row, card, rule, panel,
  and stay so after every remount; the card carries `maximized-card-viewport` and
  `maximized-card-flip`; bars are 25px at 50 choices, 50px at 2 (Yes/No) and 48.44px at 5, with a
  2px gap, never scrolling on any fixture; still maximized in remove form; the Minimize button is
  labelled "Minimize Poll Card" and, like the ×, calls `history.back()`; a press on the × adds a
  ripple; `#back` and clearing it flip and unflip the card; no script errors.
- Opened with `#back`: flipped at load, 50 vote rows, no script errors.

Not checked (no browser here; jsdom does no layout or cascade)
- The look of the ×, the outlined panel and the rule in Light and Dark; the 22px title with the
  bookmark and Minimize buttons beside it at 375px; the 898 / 808 / 768px thresholds with the
  panel's new 16px padding and border. Please open `single-card.html` at about 1280, 850 and
  375px wide, in each theme, on the `fifty`, `yesno` and `closed` fixtures, and once with `#back`.

# REQUIREMENT CrowdPoll Header and Tab Bar 

[X] Resolved

## SHORT SUMMARY
Extract the site header and tab bar from `src/public` into a standalone page in
`prototypes/POLL-CARD-MATERIAL3/HEADER-TAB-BAR/`. This is the base for a Material 3 restyle, in the same way as
the poll card prototype. The page keeps `index.html`'s shell (`.page-decor`, `.page`, `.container`,
`.layout`), the `#site-header`, `.tab-bar-wrap` (six tabs plus the round Refresh icon button) and
`#tabNotice`. It drops the tab panels and card grids, the `maximizedCardGrid` template, and every
script except what the header and tab bar need. Found while reading: `#site-header` is empty in
`index.html`. `app.js` fills it at run time from `SITE_HEADER_MARKUP` (the inline-SVG CrowdPoll
logo and wordmark, the "Search CrowdPoll" form with its clear X and `/` hint, the inert "Create Poll"
link and `#header-actions`). `#header-actions` then shows either Log In / Create Account to Vote
(guest, with Create Account only when sign-in is `native`) or the user name, avatar and menu (Edit Profile,
Poll Administration for admins, Logout). The tab behaviour (active pill, personal tabs disabled for
guests, Refresh hidden on Live Results) lives in `tabs.js`, which is wired to the poll grids and
network. The styles are in `tabs.css` (tokens, page, tab bar, notice) and `site.css` (header, avatar
menu). The Live Results tab icon's `.live-bars` rules are in `pollCard.css`.

## REQUIREMENT DETAILS
Extract the html/css/js from the client-side code of the main CrowdPoll webapp.  
This includes:
```
<body class="is-guest">

<div class="page-decor"></div>

<div class="page">
  <div class="container">
    <div class="layout">

      <header id="site-header" class="site-header"></header>

      <div class="tab-bar-wrap">
        <nav class="tab-bar" id="tabBar" aria-label="Poll tabs">
          <button class="tab is-active" type="button" data-tab="trending">
            <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M2 20.4C8.9 20.4 14.2 17.6 18 12.1l2.4 2.1L21.6 5.2 12.8 7l2.4 2.1c-3.3 4.6-7.7 6.9-13.2 6.9z"/></svg>
            Trending
          </button>
          <button class="tab" type="button" data-tab="newest">
            <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="12" fill="#8093a7"/><path fill="#e8edf2" transform="translate(12 12) skewX(-12) translate(-12 -12)" d="M10.4 5h3.2l-.6 9h-2zM10.5 16h3v3h-3z"/></svg>
            Newest
          </button>
          <button class="tab" type="button" data-tab="private">
            <svg class="tab-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="32" fill="#8093a7"/><circle cx="32" cy="25" r="11" fill="#e8edf2"/><path d="M32 40c-11 0-19 6.5-19 14.5V64h38v-9.5C51 46.5 43 40 32 40z" fill="#e8edf2"/></svg>
            My Private Polls
          </button>
          <button class="tab" type="button" data-tab="favourites">
            <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55-4.76-4.64 6.58-.96z" fill="none" stroke="#9AA197" stroke-width="1.8" stroke-linejoin="round"/></svg>
            Favorites
          </button>
          <button class="tab" type="button" data-tab="live">
            <span class="tab-icon tab-icon--live" aria-hidden="true"><span class="live-bars"><i></i><i></i><i></i></span></span>
            Live Results
          </button>
          <button class="tab" type="button" data-tab="search">
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            Search
          </button>
        </nav>
        <!-- FIX013: the search box is the header's "Search CrowdPoll" field. -->
        <!-- FIX007: an icon (two arrows chasing round a circle); the words stay
             on the label and tooltip. -->
        <button class="tab-refresh tab-refresh--icon" id="refreshBtn" type="button" aria-label="Refresh" title="Refresh">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
          </svg>
        </button>
      </div>

      <p class="tab-notice" id="tabNotice" hidden></p>

    </div>
  </div>
</div>
```
  
This will allow us to create a prototype for a site Header and Tab Bar that uses the Material 3 appearance.  
We recently created a prototype for the Admin Poll Card, and grid layout Poll Card that uses the Material 3 appearance and we want to create a similar prototype for the site Header and Tab Bar.  
  
There is no need for the `<template id="maximizedCardGrid">` and its contents.   
Remove any js files that are not needed for the elements described above.   
Please place the resulting files in:  
`prototypes/POLL-CARD-MATERIAL3/HEADER-TAB-BAR`

## CLARIFICATIONS

1. Which signed-in states the header shows
[X] Resolved
`#header-actions` has three shapes: a guest (Log In, plus Create Account to Vote when sign-in is
`native`), a member (name, avatar and a menu with Edit Profile and Logout), and an admin (the
same menu with Poll Administration between them). The tab bar also changes: guests see
My Private Polls, Favorites and Live Results disabled, with the tooltip "Sign in to use this tab".
The Material 3 design has to cover every shape it will meet.

a. A session picker in the prototype bar
Recommended
[X] Accepted
A `<select>` above the page, like the poll card prototype's fixture picker, offers Guest (native),
Guest (OAuth), Member and Admin. Choosing one re-renders `#header-actions`, sets
`body.is-guest`, and enables or disables the personal tabs, the way `app.js` and
`tabs.js` do on a real session change. A Theme picker (System / Light / Dark) sits beside it,
ready for the Material 3 dark scheme.

b. Guest only
[ ] Accepted
Render the guest state that `index.html` starts in (`<body class="is-guest">`). This keeps the
harness small, but the avatar, the menu and the enabled personal tabs would get no Material 3
design until a later requirement.

Other.
[ ] Accepted


2. How much behaviour to keep
[X] Resolved
In production, the header and tab bar drive navigation (`/login`, `/create-account`, `/profile`,
`/admin`), the Search tab, the tab panels, request pacing and the Refresh cooldown. None of that
exists in a standalone page.

a. Keep the visible behaviour and stub the navigation
Recommended
[X] Accepted
These work as in production: clicking a tab moves the active pill and sets
`.tab-bar-wrap[data-active]` (so Refresh hides on Live Results), the avatar menu opens and closes,
the search box shows and clears its X, and `/` focuses it. Navigation and data (Log In, Create
Account, a menu link, a disabled tab, a search submit, Refresh) log to the console and show
"(sample only: no action taken)" in `#tabNotice`, as the poll card prototype did. The notice
also gets a real place on the page. A small `harness.js` replaces `app.js` and `tabs.js`.

b. Static markup only
[ ] Accepted
Render the markup and the CSS with no script beyond filling the header. This gives the least
code, but the active tab, hover and focus states, the menu and Refresh hiding can only be checked
by editing the HTML.

Other.
[ ] Accepted


3. The cookie banner
[X] Resolved
`app.js` also adds `#cookie-banner` (a fixed strip at the bottom with an "I Understand" button,
shown until acknowledged in `localStorage`). It is site chrome, but the requirement does not list it.

a. Leave it out
Recommended
[ ] Accepted
The requirement names the header, the tab bar and the tab notice only. The banner can be
extracted by its own requirement when it gets a Material 3 design.

b. Include it, with a harness toggle to show it again
[X] Accepted
Its CSS is copied from `site.css` and a checkbox in the prototype bar shows it. This way it is
restyled with the rest of the chrome.

Other.
[ ] Accepted


4. What sits below the tab bar
[X] Resolved
The requirement ends at `#tabNotice`. With nothing below it, the page is a header and a row of
tabs on an empty background. The tab bar's full-bleed rule and spacing are judged against what
follows them.

a. Nothing below the tab notice
Recommended
[ ] Accepted
This follows the requirement literally. The page ends after the tab notice. Placing a card
under the tab bar can wait until the prototypes are combined.

b. One empty-state line per tab
[ ] Accepted
Keep the six `.tab-panel` sections with only their `.tab-empty` line (for example "Trending polls
appear here"), so selecting a tab also switches panels. This adds a little markup and
shows the panel switching.

c. The Material 3 poll card grid below
[X] Accepted
Load the sibling prototype's card files from `../` and mount a few fixture cards in a `.card-grid`,
so the header, tabs and cards can be judged together. This ties the two prototypes together, so a
change to one can break the other.

Other.
[ ] Accepted


## RECOMMENDATION
[X] Resolved

1. Copy the header and tab bar, and reuse the poll card prototype's card files by reference
[ ] Accepted
Create these files in `prototypes/POLL-CARD-MATERIAL3/HEADER-TAB-BAR/`:
- `header-tab-bar.html`: `index.html`'s shell (`<body class="is-guest">`, `.page-decor`, `.page`,
  `.container`, `.layout`). It holds the empty `<header id="site-header">`, the `.tab-bar-wrap` copied
  verbatim (six tabs, the Refresh icon button), `#tabNotice`, and one `<div class="card-grid">`
  under it. It has no `.tab-panel` sections and no `maximizedCardGrid` template. Above the page sits a
  prototype bar: Session (Guest, native / Guest, OAuth / Member / Admin, clarification 1a), Theme
  (System / Light / Dark), and a "Show cookie banner" checkbox (clarification 3b).
- `header.css`: copied from `src/public/site.css`, only the header and session UI rules. That is
  `.site-header`, `.brand*`, `.header-nav*`, `.header-search*`, `.search-*`, `.header-actions`,
  `.btn-header-*`, `.avatar-icon`, `.header-user`, `.avatar-menu` and `#cookie-banner` (with its
  button), plus their two media blocks.
- `tab-bar.css`: copied from `src/public/tabs.css`: the `:root` tokens, the page shell, the tab bar,
  `.tab-refresh(--icon)`, `.tab-notice`, `.card-grid` and the 640px rule. It also takes the
  `.live-bars` rules and keyframes from `pollCard.css`, so the Live Results tab icon animates even
  without the card sheet (and stops for `.is-guest`, as in production).
- `header.js`: `SITE_HEADER_MARKUP` from `app.js` (the logo and wordmark SVG, the search form, the
  inactive Create Poll link, `#header-actions`) and `renderSiteHeader`, copied. Only the
  navigation and the logout `fetch` are replaced. The search box handlers (show and clear the X, `/` to
  focus, submit) come with it unchanged, except that submit calls the stub.
- `harness.js` (clarification 2a):
  - **Session picker:** a session change calls `renderSiteHeader(me, { signinMethod })`, toggles
    `body.is-guest`, and runs `applyGuestState`'s rule: the three personal tabs get `disabled` and
    the tooltip "Sign in to use this tab". If the active tab was one of them, Trending is selected.
  - **Tabs:** a click moves `.is-active` and sets `.tab-bar-wrap[data-active]`, so Refresh hides on
    Live Results, and it re-mounts the grid (below).
  - **Stubs:** Log In, Create Account to Vote, the menu links, Logout, a disabled tab, a search
    submit and Refresh log `[sample]` to the console and show "(sample only: no action taken)" in
    `#tabNotice` for a few seconds, with `notice()`'s show-and-hide logic copied from `tabs.js`.
  - **Cookie banner:** `renderCookieBanner` is copied. "I Understand" still writes
    `localStorage`, and the checkbox clears that entry and shows the banner again.
  - **Theme:** sets `<html data-theme>`, which `pollCard-m3.css` already reads.
- The cards (clarification 4c): the page loads `../pollCard.css`, `../site.css`,
  `../pollCard-m3.css`, `../pollCard.js` and `../pollCard-m3.js` by relative path. Nothing is copied,
  so a later Material 3 change to the card shows up here too. `harness.js` holds its own short
  fixture list (four or five polls: open multi-choice, never voted, Yes/No, closed, twelve choices,
  with the same poll ids so the 022 bar colours match) and a stub `window.VoteClient`. Each tab
  mounts its own subset with the card options its production module passes:
  - Trending and Newest: `showVote`, `showLive`.
  - My Private Polls: `showBookmark: false`.
  - Favorites: the bookmarked fixtures.
  - Live Results: `onClose`, the remove form.
  - Search: `showVote: false`.

  This makes switching tabs visibly change the cards. The cards' Live Results, Bookmark, Maximize
  and remove actions use the same stub note. `isSignedIn` is not passed to the cards, because the
  card would navigate to `/login`. A guest can therefore still vote on a card here, and the notes
  say so.
- Left out: `app.js`'s snapshot and cross-window session machinery, `tabs.js`, `trending.js`,
  `newest.js`, `searchTab.js`, `liveResults.js`, `deltaClient.js`, `voteClient.js` and
  `cardShell.js`, along with `/api/me` and `/api/config`. Nothing under `src/` changes, and no server
  is needed: `header-tab-bar.html` opens directly.
- `avatar-default.svg` is copied in for the Member and Admin avatar (production falls back to
  `/avatar-default.svg`).

Pros:
- The header and tab bar are exact copies of production. They are ready for a Material 3 layer
  (`header-tab-bar-m3.css` in the next requirement), just as the card got `pollCard-m3.css`.
- The cards below are always the approved Material 3 card, never a copy that drifts from it.
- Every header shape, every guest-disabled tab and every tab's card variant can be reached from
  the prototype bar without editing files.

Cons:
- The page depends on the files in `../`. Moving or renaming them breaks it, and the folder
  can't be shared on its own.
- The fixture list is duplicated from `../harness.js` (about five short entries). A change there
  does not carry over.
- The card sheets redeclare the `:root` tokens and `html, body` rules that `tab-bar.css`
  also declares. They are identical today, but the load order has to stay: `tab-bar.css`,
  `header.css`, then the card sheets, then `pollCard-m3.css` last.

2. The same, with the sample polls shared from one file
[X] Accepted
This is recommendation 1, except that the fixtures and the stub `VoteClient` move out of
`../harness.js` into a new `../fixtures.js` that sets `window.PollFixtures`. `../poll-card.html`,
the two maximized pages and `HEADER-TAB-BAR/header-tab-bar.html` all load it.

Pros:
- There is one fixture list, so a new or changed sample poll appears in every prototype.

Cons:
- It edits the approved poll card prototype (`harness.js`, `poll-card.html` and the two maximized
  pages) in a requirement that is about the header. Those pages would need re-checking.
- The header page would carry all six fixtures, including the fifty-choice stress poll, which
  is more than a tab grid needs.

## NOTES
Implemented recommendation 2 with clarifications 1a, 2a, 3b and 4c. Open
`HEADER-TAB-BAR/header-tab-bar.html` directly; no server is needed.

Shared sample polls (the recommendation 2 change to the poll card prototype):
- `fixtures.js` (new, in `POLL-CARD-MATERIAL3/`) holds the six fixture polls and the stub
  `window.VoteClient`, moved word for word out of `harness.js`. It sets `window.PollFixtures`.
- `harness.js` now reads `window.PollFixtures`; nothing else in it changed.
- `poll-card.html` and `MAXIMIZED-POLL-CARD/single-card.html` load `fixtures.js` before
  `harness.js`. `single-card-back.html` only redirects to `single-card.html#back`, so it needed no
  change. `MAXIMIZED-POLL-CARD/README.md` lists the new script.

Files in `HEADER-TAB-BAR/`:
- `header-tab-bar.html`: `index.html`'s shell with `<body class="is-guest">`, the empty
  `#site-header`, the `.tab-bar-wrap` copied verbatim, `#tabNotice`, and one `.card-grid` for the
  cards. There are no tab panels and no `maximizedCardGrid` template. A prototype bar above the
  page holds Session, Theme and "Show cookie banner".
- `header.css`: from `src/public/site.css`, holding the `:root` tokens, the site header block
  (brand, nav, search box, header actions, guest buttons, avatar icon, both media blocks),
  `.is-inert`, and the session UI (`.header-user`, `.avatar-menu`, `#cookie-banner`). Copied word
  for word.
  **Correction (REQUIREMENT User Name Alignment):** it was not word for word. The copy cut off
  `.is-inert`'s closing `}`, so the session UI rules after it never applied. That is now fixed and
  checked rule by rule against production.
- `tab-bar.css`: from `src/public/tabs.css`, holding the tokens, the page shell, the tab bar,
  Refresh, the tab notice, the card grid and the 640px rule, plus the `.live-bars` rules from
  `pollCard.css` for the Live Results tab icon. The maximized, idle-prompt and modal rules
  are left out.
- `header.js`: `SITE_HEADER_MARKUP` (logo and wordmark SVG, search form, inert Create Poll
  link), `renderSiteHeader`, the search box handlers and `renderCookieBanner`, copied from
  `app.js`. Anything that would leave the page (the brand, Log In, Create Account to Vote, the menu
  links, Logout, a search, the search X) calls `SiteHeader.onAction` instead. Two changes from
  production: the avatar falls back to the local `avatar-default.svg`, and every `localStorage`
  access is wrapped in try/catch. Without the wrapping, a browser that blocks storage on
  `file://` would stop the whole page from rendering.
- `harness.js`:
  - **Session picker:** covers Guest (native), Guest (OAuth: Log In only), Member and Admin (the
    menu adds Poll Administration). A change re-renders the header, toggles `body.is-guest` and
    runs `applyGuestState`'s rule. That rule disables the three personal tabs with "Sign in to use
    this tab" and falls back to Trending.
  - **Tabs:** a click moves `.is-active`, sets `.tab-bar-wrap[data-active]` (Refresh hides on
    Live Results) and re-mounts that tab's cards.
  - **Stubs:** show "`<action>`: (sample only: no action taken)" in `#tabNotice` for 4 s and
    log `[sample]`.
  - **Cookie banner:** the checkbox clears the acknowledgement and shows the banner again, and
    "I Understand" unticks it.
  - **Console:** `window.selectTab(name)` switches tabs.
- `avatar-default.svg`: copied from `src/public`.

The cards under the tabs are `../pollCard.js`, `../pollCard-m3.js`, `../pollCard.css`,
`../site.css` and `../pollCard-m3.css`, loaded by reference. The polls come from
`../fixtures.js`. Each tab mounts its own set with its production module's options:
- Trending: five polls. Newest: three.
- My Private Polls: `showBookmark: false`.
- Favorites: shown bookmarked.
- Live Results: `onClose`, so the remove form shows.
- Search: `showVote: false`.

The cards' Live Results, Bookmark, Maximize and remove actions use the same stub note. A vote
records and nudges the counts. `isSignedIn` is not passed to the cards, so a guest can still
vote on a card here. In the app, that sends the guest to `/login`.

The Theme picker sets `<html data-theme>`, so the cards switch to the Material 3 dark scheme.
The header and tab bar only follow in part: the production tokens they read (`--paper`, `--ink`,
`--line`, `--muted`, `--paper-raised`) are remapped by `pollCard-m3.css`, but their hard-coded
colours (for example the tab icons' greys, `#4F564C` on Create Poll, and the `--amber-tint` active
pill) are not. Dark mode for them is the next requirement's Material 3 layer.

Checked: `node --check` on every script, and a jsdom run of the page (Node, with jsdom installed in the
session scratchpad, not the repo). It covered all four sessions, the admin menu opening and its
links, the six tabs, and the per-tab card options. It also covered a search submit and its X,
typed text surviving a session change, Refresh, the cookie banner acknowledge and re-show, a
guest falling back from Favorites to Trending, and a vote going from 128 to 129. There were no
errors. `poll-card.html` and `single-card.html` still mount their card with no errors after the
`fixtures.js` move. Not checked in a real browser: layout, the tab icon animation, hover states
and the ripple.

Carried over from production unchanged: `tabs.js` sends a click on a disabled tab to `/login`
(here, the stub), but browsers do not fire `click` on a disabled `<button>`. So in practice a
guest's click on a personal tab does nothing, in production as here.

Nothing under `src/` changed.

# REQUIREMENT Use Material 3 For Header Tab Bar and Other UI Components

[X] Resolved

## SHORT SUMMARY
Give the `HEADER-TAB-BAR/` prototype the Material 3 treatment the Poll Card got in REQUIREMENT004,
so the header, the tab bar and the other extracted pieces (the search box, Log In / Create
Account to Vote, the Create Poll link, the avatar and its menu, Refresh, the tab notice and the
cookie banner) match the approved card. That means the same moss-seeded colour roles in light
and dark, Roboto on the M3 type scale, M3 component shapes, state layers, the focus ring and the
ripple. As with the card, the extracted copies (`header.css`, `tab-bar.css`, `header.js`) stay
identical to production, and the M3 look goes in a layer loaded last. Found while reading:
- Several parts carry hard-coded colours that no token reaches. These are the logo and wordmark
  (black glyphs, white letter counters, red accents), the Newest and My Private Polls icons
  (`#8093a7` / `#e8edf2`), the Favorites star (`#9AA197`), the Create Poll link (`#4F564C`), the
  active tab's amber tint and the cookie banner's ink. In the dark scheme the logo would all but
  disappear.
- M3 has direct counterparts for tabs, the search bar, buttons, icon buttons and menus. It has
  none for an inline notice line or a cookie banner.

## REQUIREMENT DETAILS

Apply the same Material 3 design principles, accepted recommendations and accepted clarifications, in the Requirements above, when designing and implementing the the prototype Header, tab Bar, and other UI components extracted by the previous requirement.  
Ensure consistency with the previously approved Poll Card.  

## CLARIFICATIONS

1. Tab bar style
[X] Resolved
Today each tab is a pill: the active one has an amber tint, and a full-bleed 2px rule runs under
the row. M3 has three candidates for this row.

a. M3 primary tabs
Recommended
[X] Accepted
Icon inline with the label, 48px high, Title Small labels. The active tab's label and icon are
`primary`, with a 3px `primary` indicator (rounded top corners) under the label. Inactive tabs are
`on-surface-variant`. The existing full-bleed rule becomes the M3 divider (`outline-variant`, 1px),
and the indicator sits on it. This is the closest M3 match for top-level navigation between
peer views, and it reuses the rule the 018 tab bar already draws.

b. M3 secondary tabs
[ ] Accepted
The same row, but a 2px indicator spans the whole tab width and the active label stays
`on-surface`. M3 intends these for sub-sections within a view, which the home page's tabs are not.

c. Keep the pills, as M3 filter-chip-style indicators
[ ] Accepted
Keep today's shape. The active pill takes `secondary-container` / `on-secondary-container` (the
M3 navigation "active indicator" colours) in place of the amber tint. This changes the look the
least, but no M3 component uses pills for tabs.

Other.
[ ] Accepted


2. Search box size
[X] Resolved
Today the search box is 40px high with a 10px radius and a 1px border. The M3 search bar is 56px, fully
rounded, with no border and a `surface-container-high` fill.

a. The M3 search bar at its full 56px
Recommended
[X] Accepted
Fully rounded, `surface-container-high`, a leading search icon button and a trailing clear X
(as an icon button), with Body Large (16px) input text. The `/` hint stays as trailing text. The
header row grows from 40px to 56px high; the other header items centre on it.

b. The M3 search bar's look at today's 40px
[ ] Accepted
The same colours, shape and icons, but 40px high with Body Medium (14px) text, so the header
keeps its height. M3 lists no 40px size for the search bar.

Other.
[ ] Accepted


3. Mapping for the header controls
[X] Resolved
These controls get M3 standard sizes (40px), not the card's compact 32px, because the header is
not space-limited. Every control gets a state layer, the 3px `secondary` focus ring and the ripple.
- Log In: outlined button. Create Account to Vote: filled button (`primary`). Both 40px,
  fully rounded, Label Large.
- Create Poll (inactive): text button in `primary`, shown at M3's disabled 38% opacity.
- Avatar: 32px round, with a state-layer ring on hover. The user name is in Label Large.
- Avatar menu: M3 menu, `surface-container` fill, elevation-2 shadow, 4px corners, 48px items
  in Label Large with a hover state layer, 112–280px wide.
- Page: `surface-container-low` (paper) in light and `surface` in dark, as the card's page. The
  faint moss and amber `.page-decor` glow is kept.

a. Accept the mapping, with Refresh as a standard icon button
Recommended
[X] Accepted
40px, transparent, a 24px `on-surface-variant` icon, and today's border dropped. This is how M3
app bars show a refresh action, and it matches the card's Back and Maximize buttons.

b. Accept the mapping, with Refresh as an outlined icon button
[ ] Accepted
The same, but it keeps a 1px `outline-variant` border, so Refresh stays visibly separate from the
tabs at the end of the row.

Other.
[ ] Accepted


4. Tab icon colours
[X] Resolved
Trending and Search draw in `currentColor`. Newest and My Private Polls are grey-blue discs with a light
glyph, Favorites is a grey star outline, and Live Results is the three animated bars in the
results palette's first three colours.

a. Monochrome icons that follow the tab's state, except Live Results
Recommended
[ ] Accepted
The discs and the star take `currentColor`, so they are `primary` when active and
`on-surface-variant` when not, and they follow the dark scheme. The disc glyphs take the
surface colour. Live Results keeps its three data colours and its animation, since they tie the
tab to the bars on the cards. This is done in CSS on the SVG's `circle` and `path` fills, so the copied
markup does not change.

b. Keep today's icon colours
[ ] Accepted
The icons stay as extracted. They don't change with the active tab, and the grey-blue discs lose
contrast on the dark surface.

c. All six icons monochrome (strict M3)
[X] Accepted
M3 tab icons are one colour, `primary` when active and `on-surface-variant` when not. This is
(a), except that the Live Results bars also take `currentColor`, so the tab no longer shows the
results palette. Their animation stays, and stops for guests and for reduced motion as today.
The icons stay 16px. M3's 24px would make the tabs taller and need the discs redrawn as line
icons, which is left to a later requirement.

Other.
[ ] Accepted


5. The logo and wordmark in the dark scheme
[X] Resolved
The inline SVGs have near-black glyphs, near-white fills inside some letters and red
accents. On a dark surface the glyphs all but vanish, and the white fills show as blobs.

a. Recolour them per scheme in CSS
Recommended
[X] Accepted
Using attribute selectors on the fills in the M3 layer, the near-black glyphs and the logo oval
become `on-surface` and the near-white fills become `transparent`, so the page shows through. The
reds stay. Light mode is unchanged and the markup is not edited.

b. Put the brand on a light container in dark mode
[ ] Accepted
In dark mode only, the brand sits on a `surface`-light rounded container (as REQUIREMENT004's
rejected "data well"). The logo stays as drawn, but a bright patch shows in the dark header.

c. Leave the brand as it is
[ ] Accepted
It keeps the brand exactly as drawn. It is barely visible in dark mode until a proper light-on-dark
logo exists.

Other.
[ ] Accepted


6. The tab notice and the cookie banner
[X] Resolved
M3 has no inline notice or cookie banner component. The nearest ones are an outlined or filled card
for inline text and the snackbar (`inverse-surface`) for a message with one action.

a. Tab notice as an inline filled card, cookie banner in snackbar style
Recommended
[ ] Accepted
The tab notice stays where production puts it, under the tab bar. It is styled as a
`surface-container-high` block with 12px corners and Body Medium in `on-surface-variant`. The
cookie banner keeps its behaviour (it stays until acknowledged) but floats 16px above the
bottom edge. It is `inverse-surface` with Body Medium `inverse-on-surface` text, 4px
corners, elevation 3 and at most 672px wide, with "I Understand" as a text button in
`inverse-primary`.

b. Both as snackbars
[X] Accepted
The tab notice also floats at the bottom as a snackbar. This moves it away from where
production shows it, and a tab that is refused or waiting would report at the bottom of the page
instead of under the tabs.

Other.
[ ] Accepted


7. Where the Material 3 layer lives
[X] Resolved
The card's layer is `../pollCard-m3.css` (with the colour roles, type scale and shape and state
tokens) and `../pollCard-m3.js` (the ripple, limited to `.card-face` controls and the maximized
close button).

a. New files in `HEADER-TAB-BAR/`, with the card files left alone
Recommended
[X] Accepted
`header-tab-bar-m3.css`, loaded last, holds only the header, tab bar, notice and banner rules.
It reads the colour roles and tokens that `../pollCard-m3.css` already defines, since the page
always loads both. `header-tab-bar-m3.js` is a copy of the card's delegated ripple listener with
the header's targets. The approved card files stay untouched.

b. Share the tokens and the ripple
[ ] Accepted
Move the colour roles, type scale and shape and state tokens out of `pollCard-m3.css` into a new
`../m3-tokens.css`, which every prototype page loads first. Also widen `pollCard-m3.js`'s target
list to the header controls. There is then one set of tokens and one ripple, but the approved
card files and their three pages change, and would need re-checking.

Other.
[ ] Accepted


## RECOMMENDATION
[X] Resolved

1. A Material 3 layer for the header page in two new files, with snackbars for the notice and the cookie banner
[X] Accepted
This builds what the clarifications chose (1a, 2a, 3a, 4c, 5a, 6b, 7a). `tab-bar.css`, `header.css`,
`header.js` and every file in `../` stay as they are. The approved card is untouched.

Files
- New `HEADER-TAB-BAR/header-tab-bar-m3.css`, linked last in `header-tab-bar.html` (after
  `../pollCard-m3.css`). It defines no tokens of its own. It reads the `--md-sys-color-*` roles,
  the `--md-sys-typescale-*` scale and the shape and state tokens from `../pollCard-m3.css`, so it
  follows the Theme picker and the system scheme the same way the card does. Its header comment
  says it must load after that file.
- New `HEADER-TAB-BAR/header-tab-bar-m3.js`, loaded after `header.js` and before `harness.js`.
  It adds the ripple and the snackbar helpers (below).
- `header-tab-bar.html`: the two new files. Roboto is already in its font link.
- `harness.js`: the snackbar close control and the "refreshing too quickly" case (below).

`header-tab-bar-m3.css`, in this order
1. Page and type. The header, tab bar, notice and banner take `--md-sys-typescale-font`
   (Roboto). The page background is already `var(--paper)`, which the card's layer remaps in dark,
   and `.page-decor` is kept.
2. Tab bar (1a, M3 primary tabs with inline icons).
   - Each `.tab` is 48px high with 0 16px padding and no radius, and has no background in any
     state. Labels are Title Small (14/20, 500, 0.1px). Inactive tabs are `on-surface-variant`;
     the active one is `primary`.
   - The active indicator is `.tab.is-active::after`: 3px high, `primary`, rounded top corners
     (3px 3px 0 0), spanning the tab's content (`left:16px; right:16px`) and sitting on the bottom
     edge.
   - The divider is `.tab-bar-wrap::after`, kept full-bleed and restyled to 1px `outline-variant`.
     It moves from `bottom:-7px` to `bottom:0`, so the indicator sits on it, and `.tab-bar-wrap`
     aligns the tabs to the bottom.
   - State layers: a `::before` in `currentColor` at 8% (hover), 10% (focus) and 10% (pressed),
     covering the whole tab.
   - Focus ring: the 3px `secondary` ring, drawn inset (`outline-offset:-3px`), because the tab row
     scrolls sideways and would clip an outer ring.
   - Disabled tabs (the personal tabs for a guest): `on-surface` at 38%, with no state layer.
3. Tab icons (4c, all monochrome). The icons stay 16px.
   - The disc fills (`[fill="#8093a7" i]`) become `currentColor`, and the disc glyphs
     (`[fill="#e8edf2" i]`) become `var(--paper)`, so they read as cut-outs.
   - The star's stroke (`[stroke="#9AA197" i]`) becomes `currentColor`.
   - The three Live Results bars take `currentColor` (a selector more specific than the
     `nth-child` colour rules). Their heights, animation and the guest and reduced-motion freeze
     are kept.
   - Trending and Search already use `currentColor`.
4. Refresh (3a). A standard icon button: 40px, round, no border, transparent. The icon is 24px
   in `on-surface-variant`. It gets the state layer, the ring and the ripple, is 38% when
   disabled, and sits centred on the 48px tab row. It is still hidden on Live Results.
5. Search bar (2a).
   - `.header-search`: 56px high, fully rounded, `surface-container-high`, no border, with 4px
     inner padding. Focus changes nothing but the caret, as in M3.
   - The search icon button and the clear X are 40px standard icon buttons with 24px icons. The
     magnifier is `on-surface` and the X is `on-surface-variant`.
   - Input text is Body Large (16/24) in `on-surface`, and the placeholder is `on-surface-variant`.
   - The `/` hint is Label Large in `outline`.
   - `max-width:640px` and the wrap onto its own row below 768px stay. The header row centres its
     items on the 56px bar.
6. Header controls (3a).
   - Log In (`.btn-header-ghost`): an outlined button. 40px, fully rounded, 0 24px padding, a 1px
     `outline` border, transparent, with a Label Large `primary` label.
   - Create Account to Vote (`.btn-header-primary`): a filled button in `primary` /
     `on-primary`, 40px, with the same shape.
   - Below 640px both keep 40px (M3 has no 36px button) and narrow their padding to 16px.
   - Create Poll (`.header-nav-link.is-inert`): a text button, 40px, 0 12px padding, fully rounded,
     in the disabled colour (`on-surface` at 38%, replacing the 0.5 opacity). Production's 40px side
     padding becomes margin, so the spacing in the row is unchanged.
   - User name: Label Large in `on-surface`.
   - Avatar: 32px round, and the 1px border is dropped. On hover it gets a 4px `on-surface` 8% ring
     (a `box-shadow`, because an `<img>` has no `::before`).
   - Avatar menu: `surface-container`, 4px corners, elevation-2 shadow, 8px vertical padding,
     112–280px wide, opening 8px below the avatar. Items are 48px high with 0 12px padding, in
     Label Large `on-surface`, with an 8% hover and 10% pressed state layer.
   - All the buttons get the `::before` state layer, the 3px `secondary` focus ring (offset 2px)
     and the ripple.
7. Logo and wordmark in the dark scheme (5a). Under both dark selectors (the
   `prefers-color-scheme` block guarded by `:root:not([data-theme="light"])`, and
   `:root[data-theme="dark"]`):
   - The near-black fills and the oval's stroke become `on-surface`. These are `#000000`,
     `#020202`, `#030202`, `#030302`, `#30302F`, `#303030` and `#313030`, matched with the `i` flag.
   - The near-white fills become `transparent`. These are `#FAFAFA`, `#FBFBFB`, `#FDFAFA`,
     `#F9F9F9`, `#EEEDED` and `#EAEAEA`.
   - The reds (`#D21714`, `#CE1311`) stay.
   - Light mode gets no rule.
8. Snackbars (6b).
   - `.tab-notice` becomes an M3 snackbar. It is `position:fixed`, centred 16px above the bottom
     edge (plus the cookie banner's height when the banner shows, see below), `width:min(672px,
     100% - 32px)` and at least 48px high, with 14px 16px padding. It has 4px corners, the
     elevation-3 shadow, `inverse-surface`, and Body Medium in `inverse-on-surface`.
   - It enters with a 150ms fade and rise, with no animation under reduced motion. It still
     hides at once through the `hidden` attribute, so it has no exit animation.
   - `#cookie-banner` takes the same look, with `justify-content:space-between` and left-aligned
     text. "I Understand" becomes a text button in Label Large `inverse-primary` with a state
     layer. On a narrow screen it wraps below the text, which is M3's layout for a long action.
   - The `inverse-*` roles are not in `../pollCard-m3.css`. They come from the same generator
     and seed and are added here, in light and dark: `inverse-surface`, `inverse-on-surface` and
     `inverse-primary`.
9. The `.m3-ripple` styles already come from `../pollCard-m3.css`, so they are not repeated.

`header-tab-bar-m3.js`
- The ripple: a copy of `../pollCard-m3.js`'s delegated `pointerdown` listener, without the
  vote-row hosting branch. Its targets are the tabs, Refresh, the search icon button, the clear X,
  Log In, Create Account to Vote, the avatar menu items, "I Understand" and the snackbar close
  control. It skips disabled controls, non-primary buttons and reduced motion, as the card's does.
- Snackbar stacking (6b): the notice and the cookie banner can both show. A `MutationObserver`
  on `<body>` watches for the banner being added and removed, and a `ResizeObserver` on the banner
  sets `--cookie-banner-offset` on `<html>` to its height plus 8px (or 0). The notice's `bottom` adds
  that offset, so the notice rises above the banner instead of covering it.
- It sets `role="status"` on `#tabNotice` once, so screen readers announce the snackbar as M3
  asks. The copied markup is not edited.

`harness.js`
- The copied `notice(text, ms)` gains a close control when `ms` is omitted, which is the one
  production message that never clears ("You are refreshing too quickly." on Trending and Newest).
  After the text, it appends a 40px standard icon button with a 24px ✕ in `inverse-on-surface`
  and `aria-label="Close"`, which hides the notice. With `ms`, nothing changes.
- A second Refresh click within 5 s shows that message with no `ms`, so the persistent snackbar
  and its ✕ can be seen. The first click still shows the sample note for 4 s.

Checks
- `node --check` on the new script and the edited harness.
- A jsdom run covering the following. There should be no errors.
  - The page loads with no errors in every session.
  - `role="status"` is set on `#tabNotice`.
  - A persistent notice has the ✕, a timed one does not, and the ✕ hides it.
  - The banner offset is set while the banner shows and cleared after "I Understand".
  - Presses on a tab and on Refresh add a ripple, and a disabled tab adds none.
  - `poll-card.html` and `single-card.html` are unchanged, so no card check is needed beyond
    loading the page.
- Not checkable without a browser: the look in both schemes, the indicator sitting on the
  divider, the 56px row at every width, the logo recolouring, and the snackbar position with and
  without the banner. Please check `header-tab-bar.html` with Theme on Light, Dark and System, and
  in each session.

Pros:
- It satisfies every resolved clarification, in light and dark.
- The production copies and the approved card files are untouched. All the M3 work is in two new
  files and a small harness change, which makes a clear porting checklist.
- It uses exactly the card's tokens, so the header and the cards cannot drift apart in colour or
  type.

Cons:
- The header layer depends on `../pollCard-m3.css` for its tokens. Loading it without that file,
  or before it, breaks the look.
- The logo recolouring matches exact fill values. A redrawn logo with different fills would need
  its selectors updated.
- The snackbar change moves production's notice from under the tabs to the bottom of the page.
  Porting it needs the ✕ in `tabs.js`'s `notice()`, the offset script, and a decision on the
  admin and profile pages, which also show the cookie banner.
- Found while reading, not fixed: the avatar is a plain `<img>` with a click handler. It cannot
  be reached with the keyboard, so it gets a hover ring but no focus ring. Making it a button is a
  production change for a later requirement.

## NOTES
Implemented recommendation 1, with clarifications 1a, 2a, 3a, 4c, 5a, 6b and 7a. Open
`HEADER-TAB-BAR/header-tab-bar.html` directly and use the Theme and Session pickers.

Files
- New `HEADER-TAB-BAR/header-tab-bar-m3.css`, linked last. It must load after
  `../pollCard-m3.css`, whose roles, type scale and shape and state tokens it reads. In order:
  1. **Inverse roles** (light and dark) and two elevation shadows. The values come from
     `@material/material-color-utilities` 0.2.7 (tonal spot, moss `#3D5A46`), which reproduces
     `pollCard-m3.css`'s roles exactly:
     - Light: `#2C322D`, `#EDF2EB`, `#94D5A8`.
     - Dark: `#DFE4DD`, `#2C322D`, `#2C6A46`.
  2. **Roboto** for the header, tab bar and snackbars.
  3. **Primary tabs.**
     - Each tab is 48px high with 0 16px padding, in Title Small. Inactive tabs are
       `on-surface-variant` and the active one is `primary`.
     - The indicator is a 3px `primary` `::after` with rounded top corners, sitting on the
       divider.
     - The production rule is now a 1px `outline-variant` divider at `bottom:0`. Disabled tabs
       are `on-surface` at 38%.
  4. **Monochrome icons** at 16px, set through fill and stroke attribute selectors with no markup
     change. The Live Results bars take `currentColor` and keep their animation.
  5. **Refresh** is a 40px standard icon button with a 24px icon, and no border.
  6. **The 56px search bar**: fully rounded, `surface-container-high`, with 40px icon buttons,
     Body Large text, and the `/` hint in `outline`.
  7. **Header controls.**
     - Log In is outlined and Create Account to Vote is filled, both 40px at every width.
     - Create Poll is a disabled-colour text button, with production's side padding moved to
       margin.
     - The avatar is 32px, with no border and a hover ring.
     - The avatar menu is `surface-container`, with elevation 2, 4px corners and 48px items.
  8. **Dark-scheme logo**: the near-black fills and the oval become `on-surface`, and the
     near-white fills become transparent. The reds stay.
  9. **Snackbars.**
     - The tab notice and the cookie banner are fixed 16px above the bottom edge, at
       `min(672px, 100% - 32px)`, in `inverse-surface` with elevation 3.
     - The notice enters with a 150ms fade and rise, which reduced motion switches off.
     - "I Understand" is an `inverse-primary` text button.
  10. **State layers and the focus ring** on every control. The ring is inset on the tabs and
      the menu items, which would clip an outer ring.
- New `HEADER-TAB-BAR/header-tab-bar-m3.js`, loaded after `header.js`:
  - The ripple, a copy of the card's listener without the vote-row branch.
  - `--cookie-banner-offset` on `<html>`, maintained by a `MutationObserver` on `<body>` plus a
    `ResizeObserver` on the banner.
  - `role="status"` on `#tabNotice`.
- `header-tab-bar.html`: links the two files.
- `harness.js`: when `notice()` is called with no timeout, it appends a 40px `.tab-notice-close`
  ✕ (`aria-label="Close"`) that hides the notice. A second Refresh within 5 s shows production's
  "You are refreshing too quickly." that way.
- Unchanged: `tab-bar.css`, `header.css`, `header.js`, and everything in `../`.

Checked
- `node --check` on both scripts. `css-tree` parses `header-tab-bar-m3.css` with no errors (67
  rules).
- The earlier jsdom runs still pass: every session, the menu, all six tabs and their card options,
  search, the banner, and a vote from 128 to 129.
- A new jsdom run passed:
  - `#tabNotice` has `role="status"`.
  - A timed notice has no ✕, the persistent one has it, and the ✕ hides it.
  - The banner offset is set while the banner shows, cleared after "I Understand", and set again
    when it is re-shown.
  - Presses on a tab, Refresh and Create Account add a ripple, and a disabled tab adds none.
- `poll-card.html` and `single-card.html` still load with no errors.

Not checked (no browser here, and jsdom does no layout)
- The look in both schemes: the indicator on the divider, the 56px header row at each width
  (the search bar wraps to its own row below 768px), the logo recolouring, the icon cut-outs on
  hover (their glyphs are `--paper`, so an 8% hover tint shows faintly round them), and the
  snackbar position with and without the banner.
- jsdom has no real `ResizeObserver`, so the offset was checked with a zero-height banner (8px).

Porting notes
- The layer needs `pollCard-m3.css`'s tokens. Moving the notice to a snackbar needs the ✕ in
  `tabs.js`'s `notice()` for the never-clearing message, the offset script, and a decision for
  the other pages that show the cookie banner.
- Still open, as the recommendation noted: the avatar is an `<img>` with a click handler. It
  can't be focused, so it gets a hover ring but no focus ring. That fix belongs in production.

# REQUIREMENT User Name Alignment

[X] Resolved

## SHORT SUMMARY
In the signed-in header, "Sample Member" sits about 10px below the avatar's centre
(`userNameAlignment.jpg`). The cause is an extraction bug from REQUIREMENT CrowdPoll Header and
Tab Bar, not the Material 3 layer. When the session UI rules were copied from `site.css` into
`HEADER-TAB-BAR/header.css`, the copy cut off `.is-inert`'s closing `}`.

Browsers with CSS nesting then read everything after it as rules nested inside `.is-inert`. These
are `.header-user`, `.header-user .avatar`, `.avatar-menu` and its items, and `#cookie-banner` and its
button. They match only inside an inert element, so in practice nothing. `.header-user` therefore
loses `display:flex; align-items:center`, and the avatar sits on the text baseline as an inline
image. That puts the name's baseline at the avatar's bottom edge.

The same fault also leaves the avatar menu without `position:absolute`, so it opens in the flow
and pushes the header about. The Material 3 layer supplied most of the other lost properties,
which is why the fault showed nowhere else. jsdom's lenient parser and the `css-tree` check did
not flag it, because nested rules are valid CSS. `header.css` is the only copied sheet with
unbalanced braces.

## REQUIREMENT DETAILS

The user name in the header isn't aligned correctly.
The problem is circled in red in the image below:  

![User Name Alignment](userNameAlignment.jpg)

## CLARIFICATIONS
None needed. The cause is a missing brace in a copied production file, and the fix restores
production's own rules, so there is no design choice to make.

## RECOMMENDATION
[X] Resolved

1. Restore the missing brace, and check the copies against production
[X] Accepted
- In `HEADER-TAB-BAR/header.css`, add the `}` that closes `.is-inert` (after `cursor:default;`),
  exactly as in `src/public/site.css`. No other rule changes. The Material 3 layer already
  overrides the restored production values where it should: Roboto, 14px/500 for the name, the
  32px avatar with no border, and the menu's colours and `top:40px`. The restored `.header-user`
  flex centring and the menu's `position:absolute` then apply as in production.
- Guard against a repeat:
  - A script (scratchpad, not the repo) checks that every rule block in `header.css` and
    `tab-bar.css` appears word for word in `src/public/site.css`, `tabs.css` or `pollCard.css`.
  - The brace-balance check that found this is run over every CSS file in the prototype.
  - The results go in NOTES.
- Correct the previous requirement's NOTES, which said the rules were copied "word for word".
  Add a line there pointing to this fix.
- Re-run the jsdom smoke tests (all sessions, tabs, banner, vote), and check that the header
  renders with no errors.
- Not checkable here: the alignment itself, since the sandbox has no browser (the Playwright
  download is blocked). Please reload `header-tab-bar.html` as Member and Admin and check the
  name, and that the avatar menu opens as an overlay below the avatar.

Pros:
- It is a one-character fix to the actual cause, and it returns `header.css` to a faithful copy of
  production.
- It also fixes the avatar menu's placement, which had the same cause but had not been noticed.

Cons:
- None for the fix itself. It does show that the earlier checks could not catch structural CSS
  mistakes, which is why the copy check is added.

## NOTES
Implemented recommendation 1.

Fix
- `HEADER-TAB-BAR/header.css`: added the `}` that closes `.is-inert`, as in
  `src/public/site.css`. Nothing else changed.
- As a result, `.header-user` is `display:flex; align-items:center` again, so the name is centred
  on the avatar. The avatar menu is `position:absolute` again, 40px below the avatar (the
  Material 3 layer's `top`), rather than opening in the flow. The production `#cookie-banner` rules
  apply again under the Material 3 overrides.

Checks
- **Brace balance:** every CSS file under `prototypes/` now balances to zero. `header.css` was
  the only one that didn't.
- **Copy check:** a scratchpad script (`css-tree`) compares each rule in `header.css` and
  `tab-bar.css`, with its media query, against `src/public/site.css`, `tabs.css` and
  `pollCard.css`. All 45 rules in `header.css` match production. In `tab-bar.css`, 37 of 38 match,
  and the 38th is production's own fault (below), copied faithfully.
- **jsdom computed styles** (Member): `.header-user` is `display:flex`, `align-items:center`;
  `.avatar-menu` is `position:absolute`, `top:40px`; and the avatar is 32px round.
- **Smoke runs:** all earlier jsdom runs pass with no errors. That covers every session, the
  menu, the tabs and their cards, a vote, the snackbar ✕ and banner offset, the ripple, and
  `poll-card.html` and `single-card.html` still loading.
- **Not checked in a browser:** the sandbox has none, because the Playwright download is blocked.
  Please reload `header-tab-bar.html` as Member and Admin to check the name's alignment, and that
  the menu opens as an overlay below the avatar.

Records
- REQUIREMENT CrowdPoll Header and Tab Bar's NOTES now carry a correction under the
  `header.css` entry.

Found while checking, not fixed (production, outside this requirement)
- In `src/public/tabs.css` at line 223, the comment `/* Header-related responsive rules
  (site-header/header-actions/btn-header-*/ ...` is ended early by the `*/` in `btn-header-*/`.
- The rest of the comment and the `@media (max-width:639.98px){ .container{…} .card-grid{…} }`
  block after it are then read as one style rule with an invalid selector, which browsers drop.
- So below 640px, production never applies the tighter `.container` padding (20px 14px 40px) or
  the forced one-column `.card-grid`.
- `tab-bar.css` copies it faithfully. The fix is to reword the comment (for example
  `btn-header-…`), in production first, as its own requirement or `/speckit-fix` item.


# REQUIREMENT Profile Editor

[X] Resolved

## SHORT SUMMARY
Extract the Profile page's card into a standalone page in `prototypes/POLL-CARD-MATERIAL3/PROFILE-EDITOR/`,
as the base for a Material 3 version. The page is `<main id="card-root" class="profile-page">`
without the header, tab bar or footer. Found while reading:
- **The route.** `<main id="card-root" class="profile-page">` is on `/profile` (`profile.html`), not
  `/admin`. `admin.html` has no `card-root` at all. The requirement's reference to "the site
  Header and Tab Bar" also reads as a leftover from the previous extraction.
- **How the card is built.**
  - `profileCard.js` builds the card through `cardShell.js` (`CardShell.mount`): a title, the ×
    close link, the avatar in the subtitle slot, and two sections. Each section has a read-only
    current value, a "new" field, and an action with its own status line: "Save User Name" and
    "Send Verification Link".
  - It also draws a result card (Email Address Changed / Link No Longer Valid) from
    `?changed=1` or `?error=invalid-link` when there is no session.
  - In OAuth mode the email section is hidden.
- **Dependencies.**
  - `window.Session` from `app.js`, and `/api/config`.
  - Three calls: `PATCH /api/me`, `POST /api/me/email-change`, and `GET /api/config`.
  - Two navigations: the × to `/`, and to `/login` when signed out.
- **Styles.**
  - The card chrome (`.card-viewport`, `.card-face`, `.question`, `.subtitle`,
    `.btn-primary.btn-vote`, `.icon-btn`) comes from `pollCard.css`.
  - The shell and profile rules are the "card shell" and "Profile card" blocks of `site.css`.
  - The page shell comes from `tabs.css`.
- **A production quirk** that the extraction will show. The 021 rule
  `.card-viewport:not(.maximized-card-viewport) .question:hover{ text-decoration:underline }` also
  matches this card, so the "Profile" title underlines, with a pointer cursor, on hover as if it
  opened something.

## REQUIREMENT DETAILS
Extract the html/css/js from the client-side code of the main CrowdPoll webapp, on the /admin route.  
This includes:
```
<main id="card-root" class="profile-page"></main>
```
  
This will allow us to create a prototype for a Profile Edit page that uses the Material 3 appearance.  
We recently created a prototype for the Admin Poll Card, and grid layout Poll Card that uses the Material 3 appearance and we want to create a similar prototype for the site Header and Tab Bar.  
  
There is no need for the header, tab bar, footer.   
Remove any js files that are not needed for the elements described above.   
Please place the resulting files in:  
`prototypes/POLL-CARD-MATERIAL3/PROFILE-EDITOR`

## CLARIFICATIONS

1. Which page to extract
[X] Resolved
The requirement says the `/admin` route, but the element it names,
`<main id="card-root" class="profile-page">`, exists only on `/profile` (`profile.html`). The Admin
page (`admin.html`) is the poll administration list and has no `card-root`.

a. The `/profile` page's Profile card
Recommended
[X] Accepted
Extract `profile.html`'s card, which is the Profile editor the requirement's title and target
folder (`PROFILE-EDITOR`) name. `/admin` is treated as a slip.

b. Something on the `/admin` page
[ ] Accepted
If you meant an element on the Admin page, say which one under Other, because it is not
`card-root`.

Other.
[ ] Accepted


2. Which states the prototype shows
[X] Resolved
`profileCard.js` draws several states: the card for a signed-in person with native sign-in (both
sections), the same with OAuth (the email section hidden), the status line after a verification
link (`?changed=1` or `?error=invalid-link`), and the session-less result card for those two links.
With no session and no link, it sends the visitor to `/login`.

a. Two pickers: Session and Link result
Recommended
[X] Accepted
Session offers Member (native), Member (OAuth) and No session. Link result offers None, Email
changed and Invalid link. Every combination `profileCard.js` handles can then be reached. The
pickers set the query string and the stub session and re-mount the card, and the page does not
reload. No session with no link shows the "sample only" note instead of going to `/login`. A Theme
picker is included for the Material 3 step, as on the other prototypes.

b. The signed-in card only (native)
[ ] Accepted
This needs less harness code. The OAuth layout, the verification messages and the result card
would get no Material 3 design until they are extracted later.

Other.
[ ] Accepted


3. What the two actions do
[X] Resolved
"Save User Name" (`PATCH /api/me`) and "Send Verification Link" (`POST /api/me/email-change`) call
the server. The card shows the outcome in the action's status line: "Saved." or "Verification sent
to …" on success, and on failure a refusal in the error style, a 429 "try again at …", or "Could
not reach the server".

a. A stub server with a Response picker
Recommended
[X] Accepted
The harness replaces `fetch` for the three URLs (`/api/config` included), with no network. A
Response picker chooses Success, Refused (400 with a message), Too many requests (429 with a
time) or Network failure. On a successful save the stub session takes the new name and
publishes it, so the current value updates and the field clears, as in production (FR-018). The
running and disabled states can be seen through a short delay.

b. Always succeed
[ ] Accepted
This is simpler, but the error styling that the Material 3 step needs to design (the `error`
status line) could not be seen.

Other.
[ ] Accepted


4. Copy the card styles, or reuse the card prototype's
[X] Resolved
The Profile card uses the poll card's chrome from `pollCard.css`, plus the shell and profile
rules in `site.css`. `../pollCard.css` is still byte-identical to production. `../site.css`
and `../tabs.css` are trimmed copies that already hold the page shell and the poll-card rules
that reach this card.

a. Reuse `../` by reference, and copy only the shell and profile rules
Recommended
[X] Accepted
Load `../tabs.css`, `../pollCard.css` and `../site.css` as the card pages do. Add one copied
sheet, `profile.css`, holding the "card shell" and "Profile card" blocks of `src/public/site.css`
(lines 490–718), word for word and checked rule by rule. The card then matches production. The
next Material 3 step can also load `../pollCard-m3.css`, and the title, buttons and × pick up the
approved M3 treatment at once, because they are the same classes.

b. A self-contained copy
[ ] Accepted
Copy everything the card needs into `PROFILE-EDITOR/`. The folder then stands on its own, but it
is a second copy of `pollCard.css` that can drift from the approved card, and the M3 layer would
have to be copied or restated too.

Other.
[ ] Accepted


## RECOMMENDATION
[X] Resolved

1. Copy the two card scripts unchanged, reuse `../` for the card styles, and drive it all from a harness
[X] Accepted
This builds what the clarifications chose (1a, 2a, 3a, 4a). Nothing under `src/` changes, and
nothing in `../` changes.

Files in `prototypes/POLL-CARD-MATERIAL3/PROFILE-EDITOR/`
- `profile-editor.html`.
  - The shell is `profile.html`'s (`.page-decor`, `.page`, `.container`, `.layout`), without
    `#site-header`, holding `<main id="card-root" class="profile-page"></main>`.
  - Stylesheets, in production's order: `../tabs.css`, `../pollCard.css`, `../site.css`, then
    the new `profile.css`. Fonts: production's link, plus Roboto for the Material 3 step.
  - Above the page, a prototype bar with Session, Link result, Response and Theme, and a note
    line for "(sample only: no action taken)".
  - No `app.js`, no header and no cookie banner.
- `cardShell.js` and `profileCard.js`: copied from `src/public` unchanged, and checked
  byte-identical.
- `profile.css`: the "card shell" and "Profile card" blocks of `src/public/site.css` (lines
  490–718), word for word, including `.error`. The rules in `../site.css` and `../pollCard.css`
  that also reach this card (the chrome, and the 021 title-underline rule) are not repeated.
- `avatar-default.svg`: copied from `src/public`.
- `harness.js`, loaded before `cardShell.js` and `profileCard.js`, because `profileCard.js` reads
  `window.Session` and `location.search` when it starts:
  - **`window.Session` stub.** It has `app.js`'s API: `getSession()`; `subscribe(fn)`, which
    calls `fn` at once and returns an unsubscribe; and `refresh()`, which re-publishes the stub
    snapshot. The Member snapshot is `{ userName: 'Sample Member', emailAddress:
    'member@example.com', profileAvatar: 'avatar-default.svg', isAdmin: false }`. The local
    avatar is set so the production fallback (`/avatar-default.svg`, a root path) is never used.
  - **`fetch` stub** (3a). Only these three URLs are answered, and anything else goes to the real
    `fetch`. The two actions wait 700 ms, so the running and disabled states show.
    - `GET /api/config` returns `{ signinMethod }` from the Session picker.
    - `PATCH /api/me`:
      - Success: 200, and the stub snapshot takes the new name, so `Session.refresh()` publishes
        it. The current value then updates and the field clears (FR-018).
      - Refused: 409 `{ error: "That userName is already in use." }`.
      - Too many requests: 429 with `nextAllowedAt` 15 minutes ahead, in production's
        `respondRateLimited` shape.
      - Network failure: a rejected promise.
    - `POST /api/me/email-change`: Success is 202 `{}`. Refused is 409 `{ error: "That email
      address is already in use." }`. 429 and Network failure are as above.
  - **Pickers** (2a):
    - Session: Member (native), Member (OAuth), No session.
    - Link result: None, Email changed (`?changed=1`), Invalid link (`?error=invalid-link`).
    - A change rewrites the query string with `history.replaceState` (no reload), empties
      `#card-root`, drops the old subscribers, restores `document.title`, and re-runs
      `profileCard.js` by inserting a fresh `<script>` for it. Every state is drawn by the
      unchanged production script.
    - No session with no link is the one state production leaves by navigating (`location.href =
      "/login"`), and a script cannot intercept that. For it, the harness does not run
      `profileCard.js`. It leaves the card area empty and shows "Signed out: the page goes to
      /login (sample only: no action taken)".
  - **Navigation stubs:** a delegated click handler on `#card-root` catches the × (`/`) and the
    result card's Log In (`/login`). It logs `[sample]` and shows the note instead of navigating.
  - **Theme:** sets `data-theme` on `<html>`, ready for the M3 layer. It changes nothing until
    that exists.

Checks
- `node --check` on the scripts. `cardShell.js` and `profileCard.js` are compared byte for byte
  with `src/public`. The scratchpad copy-check script shows every rule in `profile.css` matches
  production, and the brace-balance check passes.
- A jsdom run over every Session × Link result combination:
  - The right card appears: both sections for native, no email section for OAuth, the status
    line after a link, the result card with no session, and the note for signed-out with no link.
  - Each action runs under each Response. The status text and `error` class are right, the
    button is disabled while running, and a successful save updates the current name and
    clears the field.
  - The × and Log In are intercepted, and there are no script errors.
- Not checkable without a browser: the layout. Please open `profile-editor.html` and go through
  the pickers.

Pros:
- The card is drawn by production's own two scripts, unchanged, in every state it has.
- It reuses the approved card files, so the Material 3 step can load `../pollCard-m3.css` and
  inherit the title, button and × treatment.
- No network, no server, and no change outside the new folder.

Cons:
- Re-running `profileCard.js` on each picker change is a harness trick. It depends on the script
  keeping all its state inside its own closure, which it does today.
- The page depends on `../` and cannot be moved on its own.
- It faithfully shows the production quirk (the "Profile" title underlines on hover). Fixing that
  is a production change for its own requirement.

## NOTES
Implemented recommendation 1, with clarifications 1a, 2a, 3a and 4a. There is one deviation (the
reload, below). Open `PROFILE-EDITOR/profile-editor.html` directly; no server is needed.

Files in `PROFILE-EDITOR/`
- `profile-editor.html`: `profile.html`'s shell without `#site-header`, holding
  `<main id="card-root" class="profile-page">`.
  - Stylesheets, in production's order: `../tabs.css`, `../pollCard.css`, `../site.css`,
    `profile.css`. Fonts: production's link plus Roboto.
  - The prototype bar has Session, Link result, Response and Theme, with a note line under it.
  - No `app.js`, header or cookie banner.
- `cardShell.js` and `profileCard.js`: byte-identical copies of `src/public`.
- `profile.css`: the "card shell" and "Profile card" blocks of `src/public/site.css` (lines
  490–718). The copy check shows all 34 rules match production.
  **Moved (REQUIREMENT Login Dialog):** `profile.css` is now `../card-shell.css`, and
  `cardShell.js` is now `../cardShell.js`, both unchanged and shared with the other card-shell
  prototypes.
- `avatar-default.svg`: copied from `src/public`.
- `harness.js`:
  - `window.Session`: `app.js`'s API (`getSession`, `subscribe`, `refresh`) over a sample Member
    snapshot. The avatar is the local `avatar-default.svg`.
  - `fetch` stub for `GET /api/config`, `PATCH /api/me` and `POST /api/me/email-change`, after a
    700 ms delay. Responses: Success (200, or 202), Refused (409 with production's message),
    Too many requests (429 in `respondRateLimited`'s shape) and Network failure (a rejection). A
    successful save updates the stub snapshot, so `Session.refresh()` publishes the new name.
  - It inserts `profileCard.js` itself once the stub session is set. The page does not load it
    with a script tag.
  - **Added (REQUIREMENT Create Account Dialog):** a fifth Response, "Email could not be sent".
    `POST /api/me/email-change` answers it with production's 502, and `PATCH /api/me` (which
    sends no mail) answers Success under it.
  - The × and the result card's Log In show "(sample only: no action taken)" instead of
    navigating. So does the signed-out, no-link state, for which `profileCard.js` is not run,
    because production leaves it by setting `location.href`.

Deviation from clarification 2a ("no reload")
- A Session or Link result change reloads the page with the choices in the query string, for
  example `?session=oauth&changed=1`. `profileCard.js` reads the link result from
  `location.search` when it starts. A page opened from `file://` has origin `null`, and there
  `history.replaceState` refuses to change the URL. jsdom threw the same `SecurityError`, and
  Chrome does too.
- Response and Theme apply at once, and ride along in the query string, so a reload keeps every
  choice.
- The pickers are set from the query string on load, so a browser's restored form values cannot
  disagree with the card.

Checked
- `node --check` on `harness.js`. The two scripts compare byte-identical with `src/public`,
  `profile.css` passes the copy check (34 of 34 rules), and every CSS file under `prototypes/`
  balances its braces.
- jsdom, loading the page once per query string, with no script errors (jsdom's
  "navigation not implemented" notice when a picker reloads is expected):
  - **Native, no link:** both sections, the avatar and the current values.
  - **Link result, signed in:** "Your email address has been updated." in the email status line,
    or the invalid-link text in the error style.
  - **OAuth:** the email section is hidden.
  - **No session:** the result card, titled "Email Address Changed" or "Link No Longer Valid",
    with the document title following. With no link, no card and the note.
  - **Each Response:** the actions start disabled, show running and disabled while waiting, and
    report production's text (error-styled on failure). On success the current name updates
    and the field clears.
  - **Links:** the × and Log In are intercepted.
- Not checked in a browser (none in the sandbox): the layout, and the reload between states.

Found while reading, production behaviour shown as is
- The "Profile" title underlines on hover with a pointer cursor. The 021 rule
  `.card-viewport:not(.maximized-card-viewport) .question:hover` in `site.css` also matches this
  card.
- After a successful name save, "Saved." is cleared almost at once. The save calls
  `Session.refresh()`, and FR-018 then clears the name field and its status because the name
  changed. In production the refresh is a network round-trip, so "Saved." shows only briefly.
  With the stub it is replaced within the same task. The Material 3 step may want the
  confirmation to last, which would be a production change.

# REQUIREMENT Use Material 3 For Profile Editor

[X] Resolved

## SHORT SUMMARY
Give the `PROFILE-EDITOR/` prototype the Material 3 treatment the Poll Card got in REQUIREMENT004,
consistent with the approved card: the moss-seeded roles in light and dark, Roboto on the M3 type
scale, M3 components, state layers, the focus ring and the ripple. As before, the copies stay
identical to production and the M3 look goes in a layer loaded last.

Found while reading:
- **Most of the chrome comes for free.** The Profile card is built from the poll card's own
  classes (`.card-face`, `.question`, `.icon-btn`, `.btn-primary.btn-vote`), so loading
  `../pollCard-m3.css` and `../pollCard-m3.js` already restyles several parts, with the ripple
  included:
  - The title becomes Title Large.
  - The × becomes a 32px standard icon button.
  - Both actions and the result card's Log In become 32px filled buttons.
  - The card takes the dark-scheme container.
- **The form parts have no M3 treatment yet:** the six labels and fields (three read-only
  current values and three "new" fields; OAuth hides the email pair), the two sections, the
  avatar, the status lines (success, refusal, 429, network, the 200-character limit, and the
  verification-link messages), and the placeholders. Production's placeholder colour
  (`var(--line)`) fails contrast.
- **M3 has no read-only text field.** Its guidance is not to show non-editable values in a text
  field. Production shows the current values in grey boxes so they line up with the field
  below.

## REQUIREMENT DETAILS

Apply the same Material 3 design principles, accepted recommendations and accepted clarifications, in the Requirements above, when designing and implementing the the prototype Profile Editor extracted in the previous requirement.  
Ensure consistency with the previously approved Poll Card.  

## CLARIFICATIONS

1. Text field style
[X] Resolved
The "new" fields are plain boxes with 1px `var(--line)` borders and 0.35rem corners, with their
labels above them in semibold Inter. M3 has two text field styles.

a. Outlined text fields, with the label in the outline
[ ] Accepted
56px high, 4px corners, a 1px `outline` border that becomes a 2px `primary` border on focus, and
Body Large input text. The label sits in a notch in the top border in Body Small, `primary` on
focus. M3 always floats the label when a field has placeholder text, and these fields do, so the
label can rest in the notch permanently. That is done in CSS alone, with no markup change
(the `<label>` precedes the `<input>` in each group). Outlined fields suit a white card with
several fields, where filled boxes would look heavy.

b. Filled text fields
[ ] Accepted
56px, a `surface-container-highest` fill with 4px top corners, a 1px `on-surface-variant` bottom
line that becomes 2px `primary` on focus, and the label inside the field at the top. They carry more
visual weight, and on the dark card the fill is close to the container.

c. M3 colours and type, with the labels kept above the fields
[ ] Accepted
The fields get the outlined look, but the labels stay above them as today, in Body Medium. This
changes the least, but it is not the M3 text field anatomy.


d. Underlined fields, as in the admin card's wizard
Recommended
[X] Accepted
Match the admin-card prototype's new-poll wizard (`NON-ADMIN-POLL-EDITING/admin.css`,
`.m3-field`). Its fields are Samsung One UI underlined fields, chosen there on purpose in its
REQUIREMENT010 (from `androidEditFields.jpg`) in place of M3 filled fields:
- No box: a 1px `on-surface` underline, which becomes 2px `primary` on focus.
- The label always sits above the input, in 14px/500 `primary`.
- Input text is 17px, which is 16px or more so phones do not zoom in.
- Supporting text sits below the line.
- An error turns the underline (2px), the label and the supporting text to `error`.
Here it uses Roboto and the M3 roles instead of the wizard's Inter and fixed colours, so it
follows the dark scheme. The profile's placeholders stay, in `on-surface-variant`, as the
wizard's Choices box has one. It is done in CSS alone. It is not stock M3, but it keeps the two
editing prototypes consistent. It also makes clarification 2a a natural fit (the same layout
without the underline), and makes clarification 4a's error state the wizard's (red underline and
label) rather than an outline with an icon.

Other.
[ ] Accepted


2. How the current values are shown
[X] Resolved
"Current User Name" and "Current Email Address" are read-only inputs today, greyed, removed from
the tab order, and boxed so they line up with the field below.

a. As text: a label over its value, with no box
Recommended
[X] Accepted
The label is in Body Small `on-surface-variant` and the value in Body Large `on-surface`. With the
underlined fields of 1d, this is the same layout as the field below minus its underline, so the
label and the value line up with the new field's label and text. This follows M3's guidance that
non-editable information is not shown in a text field. It is done in CSS on the existing
read-only input (no border, no fill, `cursor:default`), so the markup and the label's `for`
stay.

b. As an outlined field in M3's disabled style
[ ] Accepted
It keeps the box, with its outline and text at M3's disabled opacities (12% and 38%). It lines up
exactly with the field below, but it reads as "unavailable" rather than "your current value", and
38% text is hard to read.

c. As an outlined field with a tinted fill
[ ] Accepted
It is the same field as the "new" one, with a `surface-container-low` fill and no focus state.
It stays readable, but it looks editable.

Other.
[ ] Accepted


3. Button size
[X] Resolved
With the card's layer loaded, "Save User Name", "Send Verification Link" and the result card's
"Log In" become the card's compact 32px filled buttons. The header used M3's standard 40px, because it
had the room.

a. M3 standard 40px buttons on this card
Recommended
[X] Accepted
Scoped to `.card-shell-face`, so the poll card keeps its 32px. It uses the same filled style and
colours. The Profile card is a single-purpose page with room to spare, and 40px buttons line up
better beside 56px fields.

b. Keep the card's 32px
[ ] Accepted
This gives one button size on every card, but the buttons look small under 56px fields.

Other.
[ ] Accepted


4. How refusals and errors show
[X] Resolved
Each action has a status line under its button, right-aligned, in muted Inter. A refusal, a
429, a network failure or the 200-character limit uses the `error` class (`#b3261e`).

a. M3 supporting text, and the field itself in the error state
Recommended
[X] Accepted
The status line becomes Body Small, in `on-surface-variant`, or `error` for the `error` class.
It stays where production puts it. While an action's status is an error, the field it acts on
takes the admin wizard's error state (1d): a 2px `error` underline and an `error` label. This uses
`:has()` on the section, with no script change. The thicker underline and the message text mean
the error does not rely on colour alone.

b. Restyle the status lines only
[ ] Accepted
Body Small in `on-surface-variant` or `error`, with the fields unchanged. It is simpler, but the
field in question is not marked.

Other.
[ ] Accepted


5. The title's hover underline
[X] Resolved
The 021 poll-card rule makes "Profile" (and the result cards' titles) underline on hover, with a
pointer cursor, as if it opened something. It is a production bleed that the extraction copied.

a. Neutralise it in the M3 layer, and record the production fix
Recommended
[X] Accepted
`.card-shell-face .question` gets `cursor:default` and no hover underline. M3 titles are not
interactive. The production fix, scoping the 021 rule to poll cards, is left to its own
requirement.

b. Leave it, to stay faithful to production
[ ] Accepted
The prototype keeps showing the quirk until production is fixed.

Other.
[ ] Accepted


6. The "Saved." confirmation
[X] Resolved
After a successful name save, production clears "Saved." as soon as the refreshed session
arrives (FR-018). In production it shows only briefly, and in the prototype not at all.

a. Leave production's behaviour
Recommended
[ ] Accepted
The confirmation remains that the current name changes and the field empties. Making "Saved."
last is a production behaviour change, better raised as its own requirement.

b. Confirm with an M3 snackbar
[X] Accepted
The harness shows "User name saved" as a snackbar (the header prototype's style) for 4 s after a
successful save. This is the M3 pattern for a brief confirmation, but it needs a production
change to `profileCard.js` to carry over, and the prototype would then differ from production's
behaviour.

Other.
[ ] Accepted


## RECOMMENDATION
[X] Resolved

1. Load the card's Material 3 layer, and add a profile layer for the form and a snackbar
[X] Accepted
This builds what the clarifications chose (1d, 2a, 3a, 4a, 5a, 6b). `cardShell.js`,
`profileCard.js` and `profile.css` stay byte-identical to production, and nothing in `../`
changes.

Files
- `PROFILE-EDITOR/profile-editor.html`:
  - Link `../pollCard-m3.css` after `profile.css`, then the new `profile-editor-m3.css` last.
  - Load `../pollCard-m3.js` (the ripple) after `cardShell.js`.
  - The card's layer then restyles several parts with no new rules: Title Large for the title,
    the × as a 32px standard icon button, the buttons as filled buttons, state layers, the 3px
    focus ring, the ripple on the buttons and the ×, and the dark-scheme card container.
- New `PROFILE-EDITOR/profile-editor-m3.css`. It reads `../pollCard-m3.css`'s roles, type scale
  and shape and state tokens, and must load after it. It also restates the header layer's three
  inverse roles and its elevation-3 shadow for the snackbar, because that layer is not loaded
  here.
- `PROFILE-EDITOR/harness.js`: the snackbar (below).

`profile-editor-m3.css`, in order
1. **Inverse roles and elevation**, for the snackbar, with the same values as
   `header-tab-bar-m3.css`, in light and dark.
2. **Type.** The card body (`.card-shell-body`, `.card-shell-status`) takes
   `--md-sys-typescale-font` (Roboto).
3. **Title (5a).** `.card-shell-viewport .card-shell-face .question` gets `cursor:default`, and
   no underline on hover. This outranks the 021 rule
   `.card-viewport:not(.maximized-card-viewport) .question:hover`. The subtitle slot (the
   avatar) gets the same treatment.
4. **Underlined fields (1d)**, on the "new" fields: `.card-shell-body input[type="text"]` and
   `[type="email"]` that are not `.profile-current`.
   - No border, no radius, no fill. Padding is `0 0 6px`, with a 1px `on-surface` underline
     drawn as `box-shadow: inset 0 -1px 0`.
   - On focus, a 2px `primary` underline, and the browser outline is dropped, because the
     underline is the focus indicator, as in the admin wizard.
   - Input text is 17px/1.4 in `on-surface`. Placeholders are `on-surface-variant` at full
     opacity, replacing production's `var(--line)`, which fails contrast.
   - Labels are 14px/500 in `primary`, always above the field.
   - `.card-shell-group` keeps label and field stacked, with 6px between them and 24px
     between groups (the wizard's spacing).
5. **Current values (2a).** `input.profile-current` loses its box, fill and underline. Its value
   is Body Large (16/24) in `on-surface`, and it gets `cursor:default` and no focus underline.
   Its label (`.card-shell-group:has(.profile-current) label`) is Body Small in
   `on-surface-variant`. The value lines up with the new field's text below.
6. **Sections.** Production's 2.25rem gap between the name and email sections stays, and they
   get no divider, because the spacing already separates them.
7. **Buttons (3a).** `.card-shell-face .btn-vote` is 40px with 0 24px padding in Label Large.
   This applies to Save User Name, Send Verification Link and the result card's Log In, and the
   poll card keeps its 32px. Production's own fades give way to M3's disabled colours from the
   card layer: `opacity:0.5` on `:disabled` and `0.65` on `.is-running` are reset to 1.
   `cursor:progress` stays while a request runs. The Log In link gets `text-decoration:none`.
8. **Status lines and the field error (4a).**
   - `.card-shell-status` is Body Small in `on-surface-variant`, still right-aligned under its
     button. With `.error` it is `error`, replacing production's `#b3261e`.
   - While a section's status line has `.error`, the section's new field takes the wizard's
     error state: a 2px `error` underline and an `error` label. This uses
     `.profile-section:has(.card-shell-status.error)`, with no script change.
   - The invalid-verification-link message also uses `.error`, so it marks the new-email field
     too. That fits, since its text asks the person to start the change again there.
9. **Snackbar (6b).** `.profile-snackbar`, with the header prototype's look:
   - Fixed and centred 16px above the bottom edge, `min(672px, 100% - 32px)` wide, at least 48px
     high, with 14px 16px padding and 4px corners.
   - `inverse-surface` with elevation 3, and Body Medium text in `inverse-on-surface`.
   - It enters with a 150ms fade and rise, with no animation under reduced motion, and hides
     through `hidden`.

`harness.js`
- A `div.profile-snackbar` with `role="status"` and `hidden` is added to `<body>` once.
- When the stub answers a `PATCH /api/me` with Success, the harness shows "User name saved" for 4
  s, after the response resolves. A new save restarts the timer. Refusals, 429s and network
  failures show no snackbar, because their error status lines are not cleared. Email changes show
  none either, because their "Verification sent to …" status stays.
- **Porting note:** in production the call belongs in `profileCard.js`'s save handler, on
  `r.res.ok`. That is the production change clarification 6b accepted. The harness stands in for
  it, so the copy stays unchanged.

Checks
- `node --check` on `harness.js`. The two scripts are compared byte for byte with `src/public`.
  `css-tree` parses the new layer with no errors, and the brace balance passes.
- A jsdom run over the earlier matrix, plus:
  - The snackbar appears with the text after a successful save, and hides after 4 s.
  - It does not appear for the other three responses, or for an email change.
  - `role="status"` is set on it.
  - Every earlier check still passes.
- Not checkable without a browser: the look in both schemes, the underline and its focus and
  error states (jsdom does not evaluate `:has()` styling), the 40px buttons beside the fields,
  and the snackbar's position. Please check `profile-editor.html` with Theme on Light and Dark,
  each Session and Link result, and each Response.

Pros:
- It satisfies every resolved clarification, and the fields match the admin card's wizard.
- The card's layer is reused unchanged, so the title, buttons, × and container match the
  approved Poll Card exactly.
- The production copies stay identical. The M3 work is one new stylesheet and a small harness
  change.

Cons:
- The snackbar's colours are restated from the header layer, so a change to one copy must be
  repeated in the other.
- The snackbar lives in the harness until `profileCard.js` is changed in production.
- The field error state relies on `:has()`, which current browsers support but older ones don't.
  Without it, only the status line shows the error.

## NOTES
Implemented recommendation 1, with clarifications 1d, 2a, 3a, 4a, 5a and 6b. Open
`PROFILE-EDITOR/profile-editor.html` and use the pickers, including Theme.

Files
- `profile-editor.html`: links `../pollCard-m3.css` and then `profile-editor-m3.css` after
  `profile.css`, and loads `../pollCard-m3.js` (the ripple) after `cardShell.js`. The card layer
  alone restyles the title, the ×, the buttons (with state layers, focus ring and ripple) and the
  dark container.
- New `profile-editor-m3.css`, loaded last. It reads `../pollCard-m3.css`'s tokens. In order:
  **Split (REQUIREMENT Use Material 3 For Login Dialog):** sections 1–4, 6, the generic half of 7,
  and 8 now live in the shared `../card-shell-m3.css`, with the new-field label selector widened.
  This file keeps 5 and the section field error.
  **Added (REQUIREMENT Use Material 3 For Not Authorized Dialog):** `../card-shell-m3.css` section 12
  collapses an empty `.card-shell-body`, so the session-less result cards lose 14px under their
  subtitle, above the Log In row.
  1. **Inverse roles** and elevation 3, for the snackbar, restated from the header layer.
  2. **Roboto** for the card body and the status lines.
  3. **Title:** no hover underline and a default cursor. This outranks the 021 poll-card rule.
  4. **Underlined fields**, the admin wizard's:
     - No box: a 1px `on-surface` underline, which becomes 2px `primary` on focus. The browser
       outline is dropped, because the underline is the focus indicator.
     - 17px input text.
     - Labels in 14px/500 `primary`, above the field.
     - Placeholders in `on-surface-variant`, replacing production's failing `var(--line)`.
     - 6px between a label and its field, 24px between groups.
  5. **Current values** as text: a Body Small `on-surface-variant` label over a Body Large
     `on-surface` value, with no box, no underline and no focus mark. They use the existing
     read-only inputs, with the markup unchanged.
  6. **Buttons:** 40px with 0 24px padding on this card. Production's 0.5 (disabled) and 0.65
     (running) opacities are reset, so the card layer's M3 disabled colours apply alone. Log In
     has no underline.
  7. **Status lines** in Body Small, `on-surface-variant` or `error`. While a section's status is
     an error, its new field gets a 2px `error` underline and an `error` label, via `:has()`.
  8. **The snackbar**, in the header prototype's look.
- `harness.js`: a `div.profile-snackbar` with `role="status"`. A Success answer to
  `PATCH /api/me` shows "User name saved" for 4 s, and a new save restarts the timer.
- Unchanged: `cardShell.js` and `profileCard.js` (byte-identical to `src/public`),
  `profile.css` (34 of 34 rules match production), and everything in `../`.

Checked
- `node --check` on `harness.js`. `css-tree` parses `profile-editor-m3.css` with no errors (24
  rules). Every CSS file under `prototypes/` balances its braces.
- jsdom: the earlier matrix still passes with no script errors, covering all nine Session × Link
  result states, all four Responses on both actions, and the intercepted × and Log In. The
  only notice left is jsdom's expected "navigation not implemented", from a picker reload. New
  checks:
  - The snackbar shows "User name saved" after a successful save and hides after 4 s.
  - It stays hidden for Refused, Too many requests and Network failure, and after an email change.
  - It carries `role="status"`.
  - A press on the × adds the card layer's ripple.
- The test scripts now give jsdom a `matchMedia` stub, which `../pollCard-m3.js` needs and every
  browser has.

Not checked (no browser here; jsdom does no layout and does not evaluate `:has()` styling)
- The look in both schemes, the underline in its focus and error states, the current values lining
  up with the fields below, the 40px buttons beside the fields, and the snackbar's position.

Porting notes
- **The snackbar** is shown by the harness. In production, `profileCard.js`'s save handler would
  show it on `r.res.ok` (the production change clarification 6b accepted). "Saved." in the
  status line can stay, since FR-018 clears it.
- **The inverse roles** are now restated in two layers (header and profile). A shared token file
  would remove the duplicate when the layers are ported.
- **The 021 title-hover rule** is neutralised here only. Production still needs it scoped to
  poll cards.

# REQUIREMENT Merging Prototypes into CrowdPoll Webapp

[X] Resolved

## SHORT SUMMARY
Recommend how the Material 3 prototypes should reach the main webapp: combined into one package
first, merged one at a time, or some other route. Deliver a merge plan.

Found while reading:
- **The restyle prototypes are already layers, not rewrites.** The poll card (with its
  maximized view), the header and tab bar, and the profile editor each keep byte-identical
  copies of production and put Material 3 in a layer loaded last: `pollCard-m3.css`/`.js`,
  `header-tab-bar-m3.css`/`.js` and `profile-editor-m3.css`. Merging them is mainly porting
  those layers into `src/public`, plus a short list of marked production changes:
  - **`pollCard.js`:** the `M3:` edits (`is-multi`, and `BAR_COLORS_DARK` with
    `applyBarColors` writing custom properties).
  - **`tabs.js`:** `notice()` gains the snackbar ✕, plus the stacking script.
  - **`profileCard.js`:** the "User name saved" snackbar.
  - **Every page:** the Roboto link.
- **The admin card prototype is a different kind of work.** The Poll Editing Card is
  `NON-ADMIN-POLL-EDITING/admin-cards.html` (a copy of
  `research/UI-UX-FOR-PRIVATE-POLLS/NON-ADMIN-POLL-EDITING/`). It is not a restyle: it adds a
  new-poll wizard (Steps 1–5), an anonymity switch, a settings summary and a redesigned
  read-only card, so it is new behaviour.
- **The production tests pin today's look in places.** `tests/client-bar-colours.test.ts`
  asserts inline `row.style.background` / `style.color`, which the M3 `applyBarColors` replaces
  with custom properties. `tests/tab-bar-assets.test.ts` reads `tabs.css` and `pollCard.css`
  text. Both must change with the port.
- **The build already copes with new files.** `devScripts/build-assets.ts` fingerprints every
  top-level `.css`/`.js` in `src/public`, so new layer files need no build change.
- **Some production surfaces have no prototype.** These are `login.html`,
  `create-account.html` and `not-authorized.html` (the same card shell as Profile), the admin
  list and results pages (`admin.html`, `admin-results.html`, `admin.css`), the `Tabs.modal`
  dialog, the Live Results idle prompt, and the empty-tab line.
- **Production bugs found while prototyping, still open:**
  - The `tabs.css` comment that swallows the 640px media query.
  - The 021 title-hover rule bleeding onto card-shell titles.
  - A guest's click on a disabled tab doing nothing.
  - The header avatar not being reachable with the keyboard.
  - "Saved." being cleared at once.

## REQUIREMENT DETAILS

All the UI components of the existing main CrowdPoll Webapp have been styled using Material 3 to create prototypes.    
  
Poll Card (front and back) is in `poll-card.html`  
Header, Tab Bar etc, is in `HEADER-TAB-BAR/header-tab-bar.html`  
Maximized Poll Card is in `MAXIMIZED-POLL-CARD/single-card.html`  
Poll Editing Card is in `NON-ADMIN-POLL-EDITING/admin-cards.html`  
Profile Editor is in `PROFILE-EDITOR/profile-editor.html`

In preparation for merging this into the main CrowdPoll webapp, 
should we first combine all these prototypes into a single package,
or should be merge the prototypes one at a time into the main webapp.  
Or do you have another suggestion.  

The final deliverable to this requirement is a plan for merging the Material 3 prototypes into the main webapp. 

## CLARIFICATIONS

1. Which file is the Poll Editing Card
[X] Resolved
The requirement lists the Poll Editing Card at `PROFILE-EDITOR/profile-editor.html`, the same file
as the Profile Editor.

a. The admin card prototype, `NON-ADMIN-POLL-EDITING/admin-cards.html`
Recommended
[ ] Accepted
That is the poll editing prototype: the copy in `prototypes/POLL-CARD-MATERIAL3/`, identical to
`research/UI-UX-FOR-PRIVATE-POLLS/NON-ADMIN-POLL-EDITING/` in every file both hold. The plan treats
it as the fifth prototype.

b. There is no separate Poll Editing Card prototype
[ ] Accepted
The plan covers the four restyle prototypes only, and the admin pages stay out of scope.

Other.
[X] Accepted
The developers corrected the prototype locations in REQUIREMENT DETAILS: the Poll Editing Card is
`NON-ADMIN-POLL-EDITING/admin-cards.html`, and the five paths are now relative to
`prototypes/POLL-CARD-MATERIAL3/`. This is the same file as option (a); the plan treats it as
the fifth prototype.


2. How the admin card prototype is merged
[X] Resolved
The other prototypes restyle what production already does. The admin card prototype adds
behaviour: the new-poll wizard, the anonymity switch, the settings summary and the redesigned
read-only card. Some of that may need server, route, contract or data changes, which the
prototype stubs.

a. As its own feature, through Spec Kit, after the shared Material 3 foundation lands
Recommended
[X] Accepted
The merge plan covers the restyle. The admin card becomes a numbered feature, with high-level
requirements, `/speckit-mdd-architecture`, `/speckit-specify` and so on, as every behaviour change
in this repo has gone. It builds on the ported M3 tokens, so it does not restyle twice. Its own
`accepted-recommendations.md` and `iterative-requirements.md` are the input.

b. Merge it in the same effort as the restyle
[ ] Accepted
One merge covers everything. The restyle, whose risk is low and well understood, is then tied to
a feature whose server side is not yet specified.

Other.
[ ] Accepted


3. Production surfaces with no prototype
[X] Resolved
Login, Create Account and Not Authorized (card-shell pages like Profile), the admin list and
results pages, the `Tabs.modal` dialog, the Live Results idle prompt and the empty-tab line have
not been prototyped.

a. Cover them in the merge where their area is ported
Recommended
[ ] Accepted
The card-shell pages share the Profile card's classes, so the card layer plus the profile layer's
field, button and status rules (generalised from `.profile-page` to the card shell) give them
Material 3, and they are checked in the browser as part of that step. The modal, idle prompt and
empty line are restyled with the tab bar, using the snackbar and dialog roles already defined.
The admin pages wait for the admin feature (clarification 2), so they are not restyled twice.

b. Prototype them first
[X] Accepted
Run more iterative requirements (Login, Create Account, Not Authorized, modal, idle prompt)
before any merge. This is the most thorough route, but nothing reaches users until all of it is
done.

c. Merge only what was prototyped
[ ] Accepted
The other surfaces keep the old look for now. This is the fastest route, but users see a mixed
look on the sign-in pages.

Other.
[ ] Accepted


4. Production bugs found while prototyping
[X] Resolved
Five open issues:
- The `tabs.css` comment that drops the 640px rule.
- The 021 title-hover bleed.
- The disabled-tab click.
- The header avatar not being keyboard-reachable.
- "Saved." being cleared at once.

a. Fix each in the merge step that touches its file
Recommended
[X] Accepted
Each fix is small and sits in a file that step already changes, so it is fixed and tested there.
For example, the `tabs.css` comment is fixed with the tab-bar port, and the avatar becomes a
button with the header port. The plan lists each against its step.

b. Fix them first, as a `/speckit-fix` round on 022
[ ] Accepted
Production is clean before the merge starts, and each fix is reviewed on its own. This adds a
round before any Material 3 work lands.

c. Leave them out of the plan
[ ] Accepted
They are tracked elsewhere. The risk is that the port carries the bugs forward, or works around
them.

Other.
[ ] Accepted


5. The plan's form and location
[X] Resolved
The deliverable is a merge plan. Every feature in this repo enters through a high-level
requirements document in `designDocs/` and then the Spec Kit workflow (currently up to 022).

a. A high-level requirements document, `designDocs/023-high-level-requirements-MATERIAL3-MERGE.md`
Recommended
[X] Accepted
It is written so `/speckit-mdd-architecture` and `/speckit-specify` can take it directly. It
holds the merge order, what each step ports, the production changes and test changes per step,
the bugs fixed per step, and the browser checks. The NOTES here point to it.

b. A plan in the prototype folder, `prototypes/POLL-CARD-MATERIAL3/MERGE-PLAN.md`
[ ] Accepted
This is standalone, next to the prototypes it describes, and not yet part of the Spec Kit
workflow. A requirements document is written later from it.

c. Both
[ ] Accepted
The plan goes in the prototype folder, and one high-level requirements document per merge step
goes in `designDocs/`. This means the most writing now, and later steps may change before they
start.

Other.
[ ] Accepted


## RECOMMENDATION
[X] Resolved

The three routes the requirement asks about, each written up as the plan that would go in
`designDocs/023-high-level-requirements-MATERIAL3-MERGE.md` (clarification 5a). All three share
what the clarifications fixed:
- The surfaces with no prototype are prototyped first, as more requirements in this file
  (clarification 3b): Login, Create Account, Not Authorized, the `Tabs.modal` dialog, the Live
  Results idle prompt and the empty-tab line.
- The admin card becomes its own Spec Kit feature after the restyle (clarification 2a), with the
  admin list and results pages prototyped as part of it.
- Each production bug is fixed in the step that touches its file (clarification 4a).

1. Shared foundation first, then one area at a time, with dark mode switched on last
[X] Accepted
Neither "one package" nor "one at a time" exactly: only the shared parts are combined, and the
surfaces then merge one at a time on top of them. 023 is one feature whose spec has one user story
per step. Each step is its own PR with its own tests, and nothing changes behaviour outside the
step. The PRs go into a `023-MATERIAL3-MERGE` feature branch, not `dev`, because `dev` autodeploys
to production (`.do/app.yaml`). `dev` receives 023 once, after Step 5, so users never see a mixed
or half-dark site (the concern behind clarification 3b).

- **Stage 0, in this file (before 023):** prototype the remaining surfaces listed above, on the
  same layers.
- **Step 1, the foundation (no visible change).**
  - New `src/public/m3-tokens.css`: the colour roles (light and dark, including the inverse
    roles now duplicated in two layers), the type scale, shape, state and elevation. It is
    generated once from the moss seed, as in REQUIREMENT004.
  - New `src/public/m3-ripple.js`: one delegated listener replacing the three prototype copies,
    with each area adding its targets.
  - The Roboto link on all seven pages.
  - Dark values are defined but not yet applied (below). Tests confirm every page loads both
    files and that nothing renders differently.
- **Step 2, header, tab bar and page.**
  - Port `header-tab-bar-m3.css` (reading `m3-tokens.css`) and the snackbar stacking.
  - `tabs.js` `notice()` gains the ✕ and `role="status"`.
  - Port the Stage 0 dialog, idle prompt and empty line.
  - Fixes: the `tabs.css` comment that drops the 640px rule; the avatar becomes a `<button>`
    (keyboard-reachable, with the focus ring); disabled personal tabs become clickable through
    `aria-disabled`, so a guest's click reaches `/login`.
  - Tests: `tab-bar-assets.test.ts` updated for the new icon fills and CSS.
- **Step 3, the poll card and the maximized view.**
  - Port `pollCard-m3.css`/`.js` and the two `M3:` edits in `pollCard.js` (`is-multi`;
    `BAR_COLORS_DARK` with `applyBarColors` writing custom properties).
  - Tests: `client-bar-colours.test.ts` is rewritten to read the custom properties. The 022
    light values stay pinned exactly, and the dark inks are tested at 7:1 or more.
  - Fix: the 021 title-hover rule is scoped to poll cards.
- **Step 4, the card-shell pages.**
  - Port `profile-editor-m3.css`, generalised from `.profile-page` to the card shell, together
    with the Stage 0 Login, Create Account and Not Authorized layers.
  - The "User name saved" snackbar goes into `profileCard.js` on `r.res.ok`, which also settles
    the "Saved." clearing.
- **Step 5, dark mode on.** The dark blocks switch from an opt-in attribute (used in Steps 1–4,
    and for testing) to `prefers-color-scheme`, once every surface has dark values. Then 023
    merges to `dev`. Then a
    cross-page browser pass in both schemes, at 320px, 640px, 768px and desktop widths.
- **Afterwards:** the admin feature (024 or later), on the same tokens.

Why this order: the foundation lets every later step read one set of tokens, so nothing is
duplicated in production. The header is on every page, so it sets the frame first. The card is
the largest step and carries the 022 test rewrite, so it lands alone. Dark mode last means no user
ever sees a half-dark site.

Pros:
- Small, reviewable, reversible steps, each tested. A problem in one area is found and fixed in
  its own PR.
- No duplicated tokens or ripple code in production, unlike the prototypes.
- No half-ported dark mode reaches users.
- It fits the Spec Kit flow: one 023 document whose user stories become task phases.

Cons:
- Five PRs instead of one, and a feature branch that must be kept up to date with `dev` until
  it merges.
- Users get nothing until all five steps are done. The feature branch's intermediate states, with
  mixed looks, can only be seen in development.

2. Combine everything into one package prototype first, then merge once
[ ] Accepted
- Build one more prototype, `prototypes/POLL-CARD-MATERIAL3/COMBINED/`. It holds the home page
  (header, tab bar, grid, maximized view and snackbars), the Profile page and the Stage 0 pages,
  on one shared `m3-tokens.css` and `m3-ripple.js`, with the duplicated rules folded together.
- Review it as a whole, then port it to `src/public` in one change, with all the test
  rewrites and bug fixes at once and dark mode on from the start.

Pros:
- Everything is seen together before production changes. The cleanup of duplicates happens in
  the prototype, where it is cheap.
- One merge, one review, and no period with mixed looks.

Cons:
- An extra integration prototype that is not production, and that would drift from
  `src/public` while it is built.
- A large single change (seven pages, about 15 files, two test suites) is hard to review and
  hard to roll back partly.
- A problem anywhere holds back everything.

3. Merge each prototype as it is, one at a time, without a shared foundation
[ ] Accepted
- Port each prototype's layer unchanged, in the order header, card, profile and Stage 0 pages,
  each with its tests and bug fixes.
- Every layer keeps its own tokens and ripple copy, as in the prototypes, and dark mode follows
  `prefers-color-scheme` from the first step.
- A later cleanup feature folds the duplicates into one token file.

Pros:
- It is the quickest start. Each step is a near-copy of a reviewed prototype.

Cons:
- Production carries three ripple copies and duplicated tokens until the cleanup, which is
  easy to postpone indefinitely.
- With dark mode on from the first step, the not-yet-ported pages are half-dark in a dark-scheme
  browser.
- The admin feature would have no single token file to build on.

## NOTES
Implemented recommendation 1, with clarifications 1 (Other: the corrected prototype paths), 2a,
3b, 4a and 5a.

The deliverable is `designDocs/023-high-level-requirements-MATERIAL3-MERGE.md`, written in the
format of 020–022 so that `/speckit-mdd-architecture` and then `/speckit-specify` can take it.
It holds:
- **What the prototypes are:** a table of the four restyle prototypes, their M3 layers and the
  production changes each needs, including the two `pollCard.js` `M3:` edits.
- **The shared design:** colour roles, type, tokens, interaction, and 022's colours in light and
  dark.
- **Prerequisites (clarification 3b):** prototype Login, Create Account, Not Authorized, the
  `Tabs.modal` dialog, the Live Results idle prompt and the empty-tab line in this file before
  `/speckit-specify`.
- **Branching:** each step is a PR into `023-MATERIAL3-MERGE`. `dev`, which autodeploys to
  production per `.do/app.yaml`, receives 023 once, after Step 5.
- **Step 1, the foundation:** `m3-tokens.css` (dark opt-in only, under `data-theme="dark"`),
  `m3-ripple.js` with `M3Ripple.add(selector)`, and Roboto on all seven pages.
- **Step 2, header, tab bar, notice, dialog and the page**, with three fixes: the `tabs.css`
  comment that drops the 640px rule, the avatar as a `<button>`, and the disabled tabs as
  `aria-disabled`.
- **Step 3, the Poll Card and the maximized view:** the two `pollCard.js` edits, the rewrite of
  `client-bar-colours.test.ts` and `client-maximized.test.ts`, and the 021 title-hover rule
  scoped to poll cards.
- **Step 4, the card-shell pages:** `card-shell-m3.css`, generalised from the profile layer, and
  the "User name saved" snackbar in `profileCard.js`.
- **Step 5:** dark mode follows `prefers-color-scheme`, then a cross-page browser pass, then
  merge to `dev`.
- **Afterwards:** the Poll Editing Card as its own feature (024 or later), with the admin pages
  (clarification 2a).
- **The rest:** the effect on the implementation, the four functional changes (all fixes),
  assumptions and exclusions.

Checked while writing: every file the plan names exists (`ARCHITECTURE.md`, `README.md`,
`specs/021-MAXIMIZED-POLL-CARD/contracts/ui-contracts.md`, `.do/app.yaml` with `branch: dev`).
`tests/client-maximized.test.ts` reads inline bar colours (lines 250–252), as does
`tests/client-bar-colours.test.ts`. "You are refreshing too quickly." in `trending.js` and
`newest.js` is the only notice with no timeout. Both admin pages render the shared header.

No code changed. The next steps are the prerequisite prototypes (as new requirements here), then
`/speckit-mdd-architecture designDocs/023-high-level-requirements-MATERIAL3-MERGE.md`.

# REQUIREMENT Login Dialog

[X] Resolved

## SHORT SUMMARY
Extract the Login card into a standalone page in `prototypes/POLL-CARD-MATERIAL3/LOGIN-DIALOG/`,
without the header, tab bar or footer, as the base for a Material 3 version. It is the first of
the prerequisite prototypes in the merge plan (`designDocs/023-high-level-requirements-MATERIAL3-MERGE.md`).

Found while reading:
- **The route.** The Login card is on `/login` (`login.html`, `loginCard.js`), not `/admin`. A
  signed-out visitor to `/admin` gets the Not Authorized page (`not-authorized.html`, 403), another
  prerequisite. "Dialog" is the requirement's word: the Login card is a page card, like Profile,
  not a modal.
- **What the card shows.** `loginCard.js` builds it through `cardShell.js`: the title "Login", the
  × close link, a subtitle, an "Email address" field, a "Stay signed in on this device" checkbox,
  and one action, "Email me a login link", with its status line.
  - The action and the checkbox are unavailable until the field has text. A success settles the
    action (it stays disabled) and shows "Check your inbox — click the link we sent you to sign
    in.".
  - `?error=invalid-link` shows "That sign-in link is no longer valid. Request a new one." in the
    error style.
  - In OAuth mode, the form is replaced by three "Continue with Google / Facebook / GitHub" links.
- **Dependencies.**
  - Two calls: `GET /api/config` and `POST /api/auth/request-login-link`. The latter answers 200
    `{ message: "Check your inbox" }`, 400 `"Please enter a valid email address (max 200
    characters)."`, or 429 with `nextAllowedAt`.
  - The card does not read `window.Session`. `login.html`'s `data-session-role="obtains"` is
    `app.js` sending a signed-in visitor home, which is outside this card.
  - Navigations: the × to `/`, and the OAuth links to `/api/auth/oauth/<provider>`.
- **Styles and scripts the Profile prototype already holds.** The card uses the same
  `cardShell.js` and the same "card shell" rules of `site.css` (`.card-shell-body form`,
  `label.checkbox`, `.is-disabled`, the inputs), which `PROFILE-EDITOR/profile.css` already holds
  word for word, plus the card chrome from `../pollCard.css`.


## REQUIREMENT DETAILS
Extract the html/css/js from the client-side code of the main CrowdPoll webapp, for the Login Dialog.
  
This will allow us to create a prototype for a Login Dialog that uses the Material 3 appearance.  
We recently created a prototype for the Admin Poll Card, and grid layout Poll Card that uses the Material 3 appearance and we want to create a similar prototype for the Login Dialog.
  
There is no need for the header, tab bar, footer.   
Remove any js files that are not needed for the elements described above.   
Please place the resulting files in:  
`prototypes/POLL-CARD-MATERIAL3/LOGIN-DIALOG`

## CLARIFICATIONS

1. Which card to extract
[X] Resolved
The requirement says the Login Dialog "on the /admin route". `/admin` shows a signed-out visitor
the Not Authorized page, not a login. The Login card is on `/login`.

a. The `/login` page's Login card
Recommended
[X] Accepted
Extract `login.html`'s card (`loginCard.js`), which the title and the `LOGIN-DIALOG` folder name.
`/admin` is treated as a slip. Not Authorized stays its own prerequisite.

b. The Not Authorized card that `/admin` shows a signed-out visitor
[ ] Accepted
Extract `not-authorized.html` (`notAuthorizedCard.js`) instead, into this folder.

Other.
[ ] Accepted


2. Which states and responses the prototype shows
[X] Resolved
The card has a native form, an OAuth form (three provider links) and an invalid-link notice. The
action has four outcomes: success (which settles the action), 400, 429 and network failure.

a. Pickers, as on the Profile Editor
Recommended
[X] Accepted
- **Pickers:** Sign-in method (Native / OAuth), Link result (None / Invalid link), Response
  (Success / Refused / Too many requests / Network failure) and Theme.
- **Stub server:** `fetch` is stubbed for the two URLs with production's messages and codes,
  after a 700 ms delay, so the running and disabled states show.
- **Reloads:** the Sign-in method and Link result pickers reload the page with their choices in
  the query string, because `loginCard.js` reads `location.search` and `file://` pages cannot
  rewrite it (as found on the Profile Editor).
- **Links:** the × and the OAuth links show "(sample only: no action taken)".
- **No session stub:** the card does not read the session, so none is needed.

b. The native form only, always succeeding
[ ] Accepted
This needs less harness code. The OAuth layout, the error styles and the invalid-link notice would
get no Material 3 design.

Other.
[ ] Accepted


3. Where the shared card-shell files live
[X] Resolved
The Login card needs `cardShell.js` and the card-shell rules that `PROFILE-EDITOR/` already holds
as byte-identical copies (`cardShell.js`; `profile.css`, which despite its name is the whole "card
shell" and "Profile card" block). Create Account and Not Authorized will need them too.

a. Move them up to `POLL-CARD-MATERIAL3/` and share them
Recommended
[X] Accepted
- `PROFILE-EDITOR/cardShell.js` moves to `../cardShell.js`, unchanged.
- `PROFILE-EDITOR/profile.css` moves to `../card-shell.css`, unchanged and still word for word
  `site.css` lines 490–718, beside `../pollCard.css` and `../site.css`.
- `profile-editor.html` and the new `login-dialog.html` link the shared copies. The Profile Editor
  is re-run in jsdom to confirm nothing changed.
- This matches the merge plan's Step 4, where one `card-shell-m3.css` serves every card-shell
  page.

b. Link the Profile Editor's copies from `LOGIN-DIALOG/`
[ ] Accepted
`login-dialog.html` loads `../PROFILE-EDITOR/cardShell.js` and `../PROFILE-EDITOR/profile.css`.
Nothing moves, but the Login prototype depends on the Profile folder, and the file name
`profile.css` misleads.

c. Copy them into `LOGIN-DIALOG/`
[ ] Accepted
The folder is self-contained, but it is a second copy of each, which can drift, and a third and
fourth copy will follow with Create Account and Not Authorized.

Other.
[ ] Accepted


## RECOMMENDATION
[X] Resolved

1. Share the card-shell copies, copy `loginCard.js` unchanged, and drive the card from a harness like the Profile Editor's
[X] Accepted
This builds what the clarifications chose (1a, 2a, 3a). Nothing under `src/` changes.

Shared card-shell copies (3a)
- `PROFILE-EDITOR/cardShell.js` moves to `cardShell.js`, and `PROFILE-EDITOR/profile.css` moves to
  `card-shell.css`, both in `POLL-CARD-MATERIAL3/` and both unchanged. Their header comments
  are left as they are; `card-shell.css`'s says where it was extracted from.
- `PROFILE-EDITOR/profile-editor.html` links `../card-shell.css` and `../cardShell.js` in their
  place. Its load order is otherwise unchanged.
- The Profile Editor's jsdom runs are repeated to confirm nothing changed. Profile Editor's NOTES
  gain a line saying the two files moved.

Files in `prototypes/POLL-CARD-MATERIAL3/LOGIN-DIALOG/`
- `login-dialog.html`:
  - The shell is `login.html`'s (`.page-decor`, `.page`, `.container`, `.layout`), without
    `#site-header`, holding `<main id="card-root"></main>`. `data-session-role` is dropped,
    because it is `app.js`'s and `app.js` is not loaded.
  - Stylesheets, in production's order: `../tabs.css`, `../pollCard.css`, `../site.css`, then
    `../card-shell.css`. Fonts: production's link, plus Roboto for the Material 3 step.
  - A prototype bar with Sign-in method, Link result, Response and Theme, and a note line.
  - Scripts: `../cardShell.js`, `harness.js`, then `loginCard.js`. `harness.js` must run before
    `loginCard.js`, which calls `fetch` and reads `location.search` when it renders. Unlike
    `profileCard.js`, it reads no session, so it can load as an ordinary deferred script.
- `loginCard.js`: copied from `src/public` unchanged, and checked byte-identical.
- `harness.js` (2a):
  - **Query string.** The pickers follow `?method=native|oauth`, `&response=…`, `&theme=…`,
    and `&error=invalid-link`, which `loginCard.js` reads itself. A Sign-in method or Link
    result change reloads with the new query string. Response and Theme apply at once and ride
    along.
  - **`fetch` stub.** `GET /api/config` returns `{ signinMethod }`. `POST
    /api/auth/request-login-link` waits 700 ms, then answers by Response:
    - Success: 200 `{ message: "Check your inbox" }`, so the card shows "Check your inbox —
      click the link we sent you to sign in." and settles the action.
    - Refused: 400 `{ error: "Please enter a valid email address (max 200 characters)." }`.
    - Too many requests: 429, in `respondRateLimited`'s shape with `nextAllowedAt` 15 minutes
      ahead.
    - Network failure: a rejected promise.

    Anything else goes to the real `fetch`.
  - **Navigation stubs.** A delegated click handler on `#card-root` catches the × (`/`) and the
    OAuth links (`/api/auth/oauth/<provider>`). It logs `[sample]` and shows the note.
  - **Theme** sets `data-theme` on `<html>`, ready for the M3 layer.

Checks
- `node --check` on `harness.js`. `loginCard.js` and the moved `cardShell.js` compare
  byte-identical with `src/public`. The copy check (34 of 34 rules) passes on `card-shell.css`,
  and the brace check passes over `prototypes/`.
- jsdom:
  - Native: the field, the checkbox and the action. The action and checkbox are disabled until
    text is typed.
  - Each Response gives production's text, with the `error` class on failures. Success settles
    the action, which stays disabled.
  - The invalid-link notice is in the error style.
  - OAuth shows the three provider links and no form.
  - The × and the OAuth links are intercepted, and there are no script errors.
- The Profile Editor's full jsdom matrix is re-run after the move.
- Not checkable without a browser: the layout.

Pros:
- The card is drawn by production's own `loginCard.js` and `cardShell.js`, unchanged, in every
  state.
- One copy of the card-shell files serves Profile, Login and the two card-shell prototypes still
  to come, as the merge plan's Step 4 assumes.

Cons:
- The move edits the approved Profile Editor prototype (two link paths), which then needs its
  re-check.
- Like the other prototypes, the page depends on `../`.

## NOTES
Implemented recommendation 1, with clarifications 1a, 2a and 3a. Open
`LOGIN-DIALOG/login-dialog.html` directly; no server is needed.

Shared card-shell copies (3a)
- `PROFILE-EDITOR/cardShell.js` became `POLL-CARD-MATERIAL3/cardShell.js`, and
  `PROFILE-EDITOR/profile.css` became `POLL-CARD-MATERIAL3/card-shell.css`. Both are unchanged:
  `cardShell.js` is byte-identical to `src/public`, and `card-shell.css` passes the copy check
  (34 of 34 rules).
- `PROFILE-EDITOR/profile-editor.html` links `../card-shell.css` and `../cardShell.js`, and the
  header comment of `profile-editor-m3.css` names them. The Profile Editor's NOTES record the move.
- The Profile Editor's full jsdom matrix was re-run after the move with no errors and the same
  results: all nine states, all four Responses, and the snackbar.

Files in `LOGIN-DIALOG/`
- `login-dialog.html`:
  - `login.html`'s shell without `#site-header` or `data-session-role`, holding `<main
    id="card-root">`.
  - `../tabs.css`, `../pollCard.css`, `../site.css`, `../card-shell.css`. Fonts: production's
    link plus Roboto.
  - The prototype bar: Sign-in method, Link result, Response and Theme, with a note line.
  - Scripts: `../cardShell.js`, `harness.js`, `loginCard.js`.
- `loginCard.js`: byte-identical to `src/public`.
- `harness.js`:
  - A `fetch` stub for `GET /api/config` and `POST /api/auth/request-login-link`, after 700 ms.
    Success is 200 `{ message: "Check your inbox" }`. Refused is 400 with production's message.
    Too many requests is 429 in `respondRateLimited`'s shape. Network failure is a rejection.
  - The query string holds `method`, `response` and `theme` (and `error=invalid-link`).
    Sign-in method and Link result reload the page, while Response and Theme apply at once.
  - The × and the OAuth links show "(sample only: no action taken)".
  - There is no Session stub, because the card reads none.
  - **Added (REQUIREMENT Create Account Dialog):** a fifth Response, "Email could not be sent",
    answered with production's 502 `{ error: "Could not send email, try again later" }`.

Checked (jsdom, no script errors)
- **Native:** "Login", the native subtitle, the field and the checkbox. The action and the
  checkbox are disabled until the field has text.
- **Invalid link:** "That sign-in link is no longer valid. Request a new one." in the error style.
- **OAuth:** the OAuth subtitle and three "Continue with …" links, with no form. A click on one
  is intercepted.
- **Each Response:** running and disabled while waiting. Success shows "Check your inbox — click
  the link we sent you to sign in." and stays disabled, even after more typing (the action is
  settled). Refused, Too many requests and Network failure show production's text in the error
  style, and re-enable the action.
- **Close:** the × is intercepted.
- **Other checks:** `node --check` on `harness.js`, and the brace check over `prototypes/`.
- Not checked in a browser: the layout.

Found while reading, production behaviour shown as is
- In OAuth mode, `?error=invalid-link` shows nothing. `loginCard.js` handles it only in the native
  form. This is consistent, because OAuth sends no login links.
- The third provider reads "Continue with Github", not "GitHub". The label capitalises only the
  provider id's first letter.
- The checkbox is the browser's default, unstyled (`label.checkbox`). The Material 3 step will
  need an M3 checkbox, as the Poll Card's vote rows have.

# REQUIREMENT Create Account Dialog

[X] Resolved

## SHORT SUMMARY
Extract the Create Account card (`create-account.html`, `createAccountCard.js`) into a standalone
page, without the header, tab bar or footer, as the base for a Material 3 version. It is the
second prerequisite prototype in the merge plan.

Found while reading:
- **What the card shows.** `createAccountCard.js` builds it through the shared `cardShell.js`: the
  title "Create Account", the × close link, the subtitle "Enter your email address — we'll create
  your account and email your first sign-in link.", one "Email address" field, and one action,
  "Create Account", with its status line.
  - The action is unavailable until the field has text.
  - A success settles it and shows "Check your inbox — click the link we sent you to activate
    your account.".
  - Enter in the field runs the action.
- **One state only.** The page exists only for native sign-in (`/create-account` answers 404 in
  OAuth mode, `pages.ts`), and the card reads no query string and no session. It needs no
  Sign-in method or Link result picker.
- **Dependencies.**
  - One call: `POST /api/auth/create-account`. It answers 200 `{ message: "Check your inbox" }`
    (also for an existing address, for privacy), 400 "Please enter a valid email address (max
    200 characters).", 429 in `respondRateLimited`'s shape, or 502 "Could not send email, try
    again later" when the mail cannot be sent.
  - One navigation: the × to `/`.
- **The 502 is common to all three email endpoints.** `request-login-link` and `email-change`
  can also answer it, and the Login and Profile Editor harnesses do not offer it yet.
- **Shared files.** `../cardShell.js` and `../card-shell.css`, as on Login and Profile.
- **The folder name.** The requirement names `CREATE-ACCCOUNT-DIALOG`, with three Cs.

## REQUIREMENT DETAILS

Extract the html/css/js from the client-side code of the main CrowdPoll webapp, for the Create Account Dialog.
  
This will allow us to create a prototype for a Create Account Dialog that uses the Material 3 appearance.  
We recently created a prototype for the Admin Poll Card, and grid layout Poll Card that uses the Material 3 appearance and we want to create a similar prototype for the Create Account Dialog.
  
There is no need for the header, tab bar, footer.   
Remove any js files that are not needed for the elements described above.   
Please place the resulting files in:  
`prototypes/POLL-CARD-MATERIAL3/CREATE-ACCCOUNT-DIALOG`

## CLARIFICATIONS

1. The folder name
[X] Resolved
The requirement asks for `prototypes/POLL-CARD-MATERIAL3/CREATE-ACCCOUNT-DIALOG` ("ACCCOUNT",
three Cs).

a. `CREATE-ACCOUNT-DIALOG`
Recommended
[X] Accepted
Spell it correctly, matching `LOGIN-DIALOG` and the merge plan, which other documents will
reference.

b. Exactly as written
[ ] Accepted
Use `CREATE-ACCCOUNT-DIALOG`.

Other.
[ ] Accepted


2. Which responses the prototype offers
[X] Resolved
The Login harness offers Success, Refused, Too many requests and Network failure.
`POST /api/auth/create-account` can also answer 502 "Could not send email, try again later".

a. The four, plus "Email could not be sent" (502), here and in the Login and Profile harnesses
Recommended
[X] Accepted
- The Response picker gains a fifth entry, and the stub answers it with production's 502 body.
- The card shows `body.error` in the error style. The 502 differs from Refused only in wording,
  but it is a real outcome the M3 step should see.
- The same entry is added to `LOGIN-DIALOG/harness.js` and `PROFILE-EDITOR/harness.js` (for Send
  Verification Link; `PATCH /api/me` sends no mail and keeps the four). All three email endpoints
  can return it.

b. The four only, as on Login
[ ] Accepted
This keeps the three harnesses alike, without the 502. It changes no other prototype.

c. The five here only
[ ] Accepted
Create Account offers the 502, and Login and Profile stay as they are.

Other.
[ ] Accepted


## RECOMMENDATION
[X] Resolved

1. Copy `createAccountCard.js` unchanged onto the shared card shell, with a Login-style harness, and add the 502 to all three harnesses
[X] Accepted
This builds what the clarifications chose (1a, 2a). Nothing under `src/` changes.

Files in `prototypes/POLL-CARD-MATERIAL3/CREATE-ACCOUNT-DIALOG/`
- `create-account-dialog.html`:
  - `create-account.html`'s shell (`.page-decor`, `.page`, `.container`, `.layout`), without
    `#site-header` or `data-session-role`, holding `<main id="card-root"></main>`.
  - Stylesheets: `../tabs.css`, `../pollCard.css`, `../site.css`, `../card-shell.css`. Fonts:
    production's link plus Roboto.
  - A prototype bar with Response and Theme, and a note line.
  - Scripts: `../cardShell.js`, `harness.js`, then `createAccountCard.js`.
- `createAccountCard.js`: copied from `src/public` unchanged, and checked byte-identical.
- `harness.js`:
  - **`fetch` stub** for `POST /api/auth/create-account`, after 700 ms:
    - Success: 200 `{ message: "Check your inbox" }`.
    - Refused: 400 `{ error: "Please enter a valid email address (max 200 characters)." }`.
    - Too many requests: 429, in `respondRateLimited`'s shape.
    - Email could not be sent: 502 `{ error: "Could not send email, try again later" }`.
    - Network failure: a rejection.

    The card makes no `/api/config` call. Anything else goes to the real `fetch`.
  - **Query string.** Response and Theme apply at once and are kept in the query string
    (`?response=…&theme=…`), so a reload keeps them. No picker needs a reload, because the card
    reads nothing from the query string.
  - **Navigation stub.** The × shows "(sample only: no action taken)".
  - **Theme** sets `data-theme` on `<html>`.

The 502 in the other two harnesses (2a)
- `LOGIN-DIALOG/login-dialog.html` and `harness.js`: Response gains "Email could not be sent".
  `POST /api/auth/request-login-link` answers it with production's 502 body.
- `PROFILE-EDITOR/profile-editor.html` and `harness.js`: Response gains the same entry. `POST
  /api/me/email-change` answers it with the 502. `PATCH /api/me` sends no mail, so it answers
  Success under that entry, as a name save would during a mail outage (the "User name saved"
  snackbar shows).
- Each harness's header comment and its requirement's NOTES gain a line.

Checks
- `node --check` on the three harnesses. `createAccountCard.js` and `cardShell.js` compare
  byte-identical with `src/public`, and the brace check passes over `prototypes/`.
- jsdom, Create Account:
  - The card is drawn, and the action is disabled until text is typed.
  - Each of the five Responses gives production's text, with the `error` class on failures.
  - Success settles the action, which stays disabled after more typing.
  - Enter in the field runs the action.
  - The × is intercepted, and there are no script errors.
- jsdom, Login and Profile Editor: their full matrices are re-run. The new entry shows "Could not
  send email, try again later" in the error style on Send Login Link and Send Verification Link,
  and Save User Name succeeds under it.
- Not checkable without a browser: the layout.

Pros:
- The card is drawn by production's own scripts, unchanged.
- All three email cards can show every outcome their endpoints have.

Cons:
- Two approved prototypes' harnesses change (one picker entry each), and they need their re-checks.

## NOTES
Implemented recommendation 1, with clarifications 1a and 2a. Open
`CREATE-ACCOUNT-DIALOG/create-account-dialog.html` directly; no server is needed.

Files in `CREATE-ACCOUNT-DIALOG/`
- `create-account-dialog.html`:
  - `create-account.html`'s shell without `#site-header` or `data-session-role`, holding `<main
    id="card-root">`.
  - Stylesheets: `../tabs.css`, `../pollCard.css`, `../site.css`, `../card-shell.css`. Fonts:
    production's link plus Roboto.
  - The prototype bar: Response and Theme, with a note line.
  - Scripts: `../cardShell.js`, `harness.js`, `createAccountCard.js`.
- `createAccountCard.js`: byte-identical to `src/public`.
- `harness.js`:
  - A `fetch` stub for `POST /api/auth/create-account`, after 700 ms. Success is 200 `{ message:
    "Check your inbox" }`. Refused is 400 with production's message. Too many requests is 429.
    "Email could not be sent" is 502 `{ error: "Could not send email, try again later" }`.
    Network failure is a rejection.
  - The × shows the sample note.
- **Added (REQUIREMENT Create Account Mouse Over Link Problem):** an inline rule in
  `create-account-dialog.html` turns off the 021 title and subtitle hover underline and pointer, as
  `../card-shell-m3.css` section 3 does. Remove it when the page loads `../card-shell-m3.css`.
  **Removed (REQUIREMENT Use Material 3 For Create Account Dialog):** the page now loads
  `../card-shell-m3.css`, which carries the same rule.

The 502 in the other harnesses (2a)
- `LOGIN-DIALOG/`: Response has the fifth entry, which `POST /api/auth/request-login-link`
  answers with the 502.
- `PROFILE-EDITOR/`: Response has the fifth entry. `POST /api/me/email-change` answers it with the
  502, and `PATCH /api/me` sends no mail, so it answers Success.
- Their header comments and their requirements' NOTES record the addition.

Deviation
- Response and Theme are meant to be kept in the query string. These two pickers need no reload,
  so the harness writes them with `history.replaceState`, which a `file://` page refuses (as found
  on the Profile Editor). The refusal is caught, and the choice still applies at once. On `file://`
  a manual reload returns to the defaults, unless the URL already carries `?response=…&theme=…`.

Checked (jsdom, no script errors)
- **Create Account:** the card ("Create Account", the subtitle, the field). The action is
  disabled until text is typed.
  - Each of the five Responses gives production's text, with `error` on the four failures, and
    shows running and disabled while waiting.
  - Success shows "Check your inbox — click the link we sent you to activate your account." and
    stays disabled after more typing.
  - Enter (a submit of `#create-form`) runs the action.
  - The × is intercepted.
- **Login, new entry:** "Could not send email, try again later" in the error style.
- **Profile Editor, new entry:** the name save succeeds (current name updated, "User name saved"
  snackbar), and the email change shows the 502 text in the error style.
- **Earlier matrices:** the Login and Profile Editor matrices were re-run with the same results,
  apart from jsdom's expected navigation notice.
- **Other checks:** `node --check` on the three harnesses. `createAccountCard.js` and
  `cardShell.js` are byte-identical to `src/public`.
- Not checked in a browser: the layout.

Found while reading, production behaviour shown as is
- The 502 message, "Could not send email, try again later", has no full stop, unlike the
  card's other messages.

# REQUIREMENT Use Material 3 For Login Dialog

[X] Resolved

## SHORT SUMMARY
Give the `LOGIN-DIALOG/` prototype the Material 3 treatment, consistent with the approved Poll
Card and with the Profile Editor's form, which is the nearest sibling.

Found while reading:
- **Most of it already exists.** The Login card is built from the same card-shell classes as
  Profile, so the card layer (`../pollCard-m3.css`, `../pollCard-m3.js`) and the Profile Editor's
  form rules already cover:
  - the title (Title Large, no hover underline) and the × (32px icon button);
  - the underlined "Email address" field, the 40px filled "Email me a login link" button, and the
    status lines in Body Small and `error`;
  - the dark container.
- **Where those form rules live.** They sit in `PROFILE-EDITOR/profile-editor-m3.css`. All but 11
  of its rules are generic card-shell rules, and the 11 are scoped to `.profile-section`,
  `.profile-current` and `.profile-page`.
- **Three parts are new to this card:**
  - **The checkbox.** "Stay signed in on this device" is a native checkbox inside
    `label.checkbox`, disabled (with the label greyed) until the field has text.
  - **The OAuth buttons.** The three "Continue with Google / Facebook / Github" links have no
    production CSS at all (`.oauth-providers` has no rule). Each is a `.btn-primary.btn-vote`,
    whose `display:flex` makes it block-level, so they render as three full-width dark buttons
    touching one another.
  - **The page-load notice.** The invalid-link notice is in the action's status line with the
    `error` class from page load, while the field is still empty. Profile's "field turns red while
    its status is an error" rule would mark an empty field for a problem it did not cause.

## REQUIREMENT DETAILS

Apply the same Material 3 design principles, accepted recommendations and accepted clarifications, in the Requirements above, when designing and implementing the the prototype Login Dialog extracted in the # REQUIREMENT Login Dialog above.  
Ensure consistency with the previously approved Poll Card.  

## CLARIFICATIONS

1. Where the shared card-shell Material 3 rules live
[X] Resolved
The Login card needs the Profile Editor's generic form rules: the underlined field, the 40px
buttons, the status lines, the title fix and the snackbar. Create Account will need them too.

a. Move them to a shared `../card-shell-m3.css`
Recommended
[X] Accepted
- The generic rules move unchanged from `PROFILE-EDITOR/profile-editor-m3.css` to
  `POLL-CARD-MATERIAL3/card-shell-m3.css`: the inverse roles, type, title, underlined fields,
  buttons, status lines and snackbar.
- `profile-editor-m3.css` keeps only the Profile rules (current values and the section error
  state).
- Profile, Login and later Create Account load `../card-shell-m3.css`. The Profile Editor is
  re-run to confirm nothing changed.
- This matches the merge plan's Step 4 (`card-shell-m3.css`), and the earlier move of
  `card-shell.css`.

b. Login loads `../PROFILE-EDITOR/profile-editor-m3.css`
[ ] Accepted
Nothing moves, but the Login prototype depends on the Profile folder, and the Profile-only rules
load on Login (harmless, but misleading).

c. Copy the rules into `LOGIN-DIALOG/login-dialog-m3.css`
[ ] Accepted
It is self-contained, but it is a second copy that can drift, and a third will follow with
Create Account.

Other.
[ ] Accepted


2. The "Stay signed in" checkbox
[X] Resolved
Today it is the browser's default checkbox, beside 400-weight text, greyed while disabled.

a. An M3 checkbox, drawn in CSS on the real input
Recommended
[X] Accepted
- The box: `appearance:none` on the input; an 18px box with 2px corners and a 2px
  `on-surface-variant` border.
- Checked: a `primary` fill with an `on-primary` check, drawn by `::after`. This matches the Poll
  Card's multi-choice vote rows.
- A 40px round state layer around the box (hover 8%, focus 10%, pressed 10%) and the 3px
  `secondary` focus ring.
- The label is in Body Large, `on-surface`.
- Disabled (no address yet): the box and label at M3's 38%.
- The markup is unchanged, and it is still a native checkbox for keyboards, forms and screen
  readers.

b. The native checkbox, tinted with `accent-color: var(--md-sys-color-primary)`
[ ] Accepted
The least CSS, and the browser draws it, so it looks different on each platform and is not the
M3 shape.

c. An M3 switch instead
[ ] Accepted
M3 reserves switches for settings that take effect at once. "Stay signed in" is submitted with the
action, which is a checkbox's job, and a switch would need markup changes.

Other.
[ ] Accepted


3. The OAuth provider buttons
[X] Resolved
Production has no CSS for them: three full-width dark buttons touching one another, with only text.

a. Outlined buttons, full width, stacked with 8px gaps
Recommended
[X] Accepted
- 40px high, fully rounded, a 1px `outline` border, transparent, with Label Large `primary` text.
- They have the card layer's state layers, focus ring and ripple (they are `.btn-vote`).
- Three equal choices with none of them primary, which is how M3 shows a set of alternatives.
- The labels stay as production writes them, including "Github". There are no provider logos,
  because each provider's brand rules govern its logo, and that is a production decision.

b. Filled buttons, stacked with gaps
[ ] Accepted
The card layer already makes them filled `primary`. Adding the 8px gaps and 40px height is the
smallest change, but three equally loud primary buttons compete.

c. Outlined buttons with provider logos
[ ] Accepted
This is closer to what people expect from "Sign in with …" buttons. It needs three logo assets
that follow each provider's brand rules, which are outside a styling prototype.

Other.
[ ] Accepted


4. When the email field shows the error state
[X] Resolved
On Profile, a section's field turns red while its status line is an error. On Login, the
invalid-link notice is an error from page load, while the field is empty.

a. As on Profile, but only once the person has typed in the field
Recommended
[X] Accepted
The field takes the error state (2px `error` underline, `error` label) while the status is an
error and the person has edited the field. A refusal, 429, mail failure or network failure after
typing marks it. The page-load notice, before any typing, does not.
- This is pure CSS. `:user-valid` and `:user-invalid` match only after the user has interacted
  with a field, so `input:is(:user-valid, :user-invalid)` means "has been edited".
- `:valid` would not work: a malformed address the server refuses (such as "abc") is `:invalid`
  and would be skipped.
- `:user-valid` and `:user-invalid` are in every current evergreen browser. Without them, only the
  status line shows the error, as with `:has()`.

b. Status line only
[ ] Accepted
The field never takes the error state on Login. This differs from Profile.

c. Exactly as on Profile
[ ] Accepted
The field also turns red for the invalid-link notice, while empty.

Other.
[ ] Accepted


## RECOMMENDATION
[X] Resolved

1. A shared `card-shell-m3.css` carved out of the Profile layer, plus Login's checkbox, OAuth buttons and field error
[X] Accepted
This builds what the clarifications chose (1a, 2a, 3a, 4a). `loginCard.js`, `cardShell.js` and
`card-shell.css` stay byte-identical to production.

The shared layer (1a)
- New `POLL-CARD-MATERIAL3/card-shell-m3.css`, loaded after `../pollCard-m3.css`. It takes these
  sections unchanged from `PROFILE-EDITOR/profile-editor-m3.css`: inverse roles and elevation,
  type, title, the underlined field rules, buttons, the generic status-line rules, and the snackbar.
- One selector is widened, not changed in effect:
  - The "new field" label rule was `.card-shell-group:not(:has(.profile-current)) > label`.
  - It becomes `.card-shell-body .card-shell-group > label` plus
    `.card-shell-body form > label:not(.checkbox)`.
  - Login and Create Account put their label directly in a `<form>`, with no `.card-shell-group`,
    so the old selector would miss it.
  - Profile's current-value label rule, `.card-shell-group:has(.profile-current) > label`, is more
    specific and loads later, so Profile renders as before.
- `profile-editor-m3.css` keeps only the Profile rules: the current values, and the section error
  state. Its header comment says it loads after `../card-shell-m3.css`.
- `PROFILE-EDITOR/profile-editor.html` links `../card-shell-m3.css` before
  `profile-editor-m3.css`.

New in `card-shell-m3.css`, for Login (and later Create Account)
- **The checkbox (2a)**, on `.card-shell-body label.checkbox` and its
  `input[type="checkbox"]`:
  - `appearance:none`; an 18px box with 2px corners, a 2px `on-surface-variant` border, and 11px
    margins, so the touch target is 40px.
  - The label is Body Large, `on-surface`, with a 4px gap.
  - Checked: a `primary` fill and border, with an `on-primary` check drawn by `::after` (a rotated
    border, as on the Poll Card's checkbox).
  - A 40px round state layer drawn by `::before`: 8% hover, 10% focus, 10% pressed, in
    `on-surface` (or `primary` when checked).
  - The 3px `secondary` focus ring on `:focus-visible`.
  - Disabled (no address yet): the border and the label are `on-surface` at 38%, replacing
    production's `.is-disabled` `var(--muted)`, and there is no state layer.
  - Pseudo-elements on a checkbox with `appearance:none` work in current Chrome, Firefox and
    Safari.
- **The OAuth buttons (3a):**
  - `.card-shell-body .oauth-providers` is a flex column with 8px gaps.
  - Each `.btn-vote` in it is an outlined button: full width, 40px, fully rounded, a 1px
    `outline` border, transparent, with Label Large `primary` text and no underline.
  - The card layer's state layer, focus ring and ripple still apply, because they are
    `.card-face .btn-vote`.
- **The field error (4a):** while the card has an `error` status line, a form field the person
  has edited takes the error state: a 2px `error` underline, and its label in `error`.
  - The selector is
    `.card-shell-face:has(.card-shell-status.error) form input:is([type="email"],
    [type="text"]):is(:user-valid, :user-invalid)`.
  - The label is matched with `form:has(input:is(:user-valid, :user-invalid))`.
  - It is scoped to `form`, so Profile, whose sections are not forms, keeps its own rule.

Files
- `LOGIN-DIALOG/login-dialog.html`:
  - Link `../pollCard-m3.css`, then `../card-shell-m3.css`, after `../card-shell.css`.
  - Load `../pollCard-m3.js` (the ripple) after `../cardShell.js`.
  - The card layer gives the title, the ×, and the button's colours, state layers, focus ring and
    ripple. The shared layer gives the rest.
- `PROFILE-EDITOR/profile-editor.html` and `profile-editor-m3.css`: as above.

Checks
- `css-tree` parses both layers with no errors, and the brace check passes.
- The rules in `card-shell-m3.css` plus `profile-editor-m3.css` equal the old
  `profile-editor-m3.css`, apart from the widened label selector and the new Login rules (a
  scripted rule-by-rule comparison).
- jsdom:
  - Login: the full matrix is re-run with no script errors (native, invalid link, OAuth, five
    Responses, settle).
  - Profile Editor: its full matrix and the snackbar checks are re-run.
- Not checkable without a browser: the look in both schemes, the checkbox drawing and its states,
  the outlined OAuth buttons, and the field error after typing versus at page load (jsdom
  evaluates neither `:has()` nor `:user-invalid` styling). Please check Login with Theme on Light
  and Dark, each Sign-in method, Link result and Response, and the checkbox by mouse and keyboard.

Pros:
- One shared card-shell layer for Profile, Login and Create Account, as the merge plan's Step 4
  assumes.
- Login matches Profile's form exactly, and the Poll Card's checkbox and buttons.
- No production copy changes.

Cons:
- The carve-out edits the approved Profile Editor (one more stylesheet link, and its rules split
  in two). It is protected by the rule-by-rule comparison and the re-run.
- The field error depends on `:has()` and `:user-invalid`, and the checkbox on pseudo-elements on
  an input. All are in current evergreen browsers, and each falls back to production's plain look.

## NOTES
Implemented recommendation 1, with clarifications 1a, 2a, 3a and 4a. Open
`LOGIN-DIALOG/login-dialog.html` and use the pickers, including Theme.

The shared layer (1a)
- **New `POLL-CARD-MATERIAL3/card-shell-m3.css`.** Sections 1–8 are the Profile Editor's generic
  rules, moved unchanged: inverse roles and elevation, type, title, underlined fields, buttons,
  status lines and the snackbar. Section 5 stays in Profile.
  - The one change is the new-field label selector. It was
    `.card-shell-group:not(:has(.profile-current)) > label` and is now
    `.card-shell-body .card-shell-group > label, .card-shell-body form > label:not(.checkbox)`,
    so it reaches Login's label, which sits directly in the `<form>`.
  - Profile's current-value label rule is more specific and loads later, so Profile is unchanged.
- **`PROFILE-EDITOR/profile-editor-m3.css`** keeps only section 5 (the current values) and the
  section field error. `profile-editor.html` links `../card-shell-m3.css` before it.
- **A scripted rule-by-rule comparison (`css-tree`)** of the old `profile-editor-m3.css` against
  the two new files: every old rule is present, except the label rule, which reappears with the
  widened selector and identical declarations. The only other new rules are sections 9–11. Both
  files parse with no errors.

New in `card-shell-m3.css`
- **9. Checkbox:**
  - `appearance:none` on the real input; an 18px box with 2px corners and a 2px
    `on-surface-variant` border, with 11px margins for a 40px target.
  - The label is Body Large, with a 4px gap and 10px above it. The form's gap is 6px.
  - Checked: a `primary` fill with an `on-primary` check (`::after`).
  - A 40px round state layer (`::before`) at 8%, 10% and 10%, and the 3px `secondary` focus
    ring.
  - Disabled: the border and the label at `on-surface` 38%, with no state layer.
- **10. OAuth buttons:** a flex column with 8px gaps. Each is a full-width, 40px outlined button
  (1px `outline` border, transparent, `primary` text, no underline), with the card layer's state
  layer, focus ring and ripple.
- **11. Form field error:** while the card has an `error` status, an edited form field
  (`:is(:user-valid, :user-invalid)`) gets a 2px `error` underline and an `error` label. The
  invalid-link notice at page load marks nothing.

Files
- `LOGIN-DIALOG/login-dialog.html` links `../pollCard-m3.css`, then `../card-shell-m3.css`, after
  `../card-shell.css`, and loads `../pollCard-m3.js` after `../cardShell.js`.
- Unchanged: `loginCard.js` and `cardShell.js` (byte-identical to `src/public`), and
  `card-shell.css` (34 of 34 rules match production).

Checked (jsdom, no script errors)
- **Login:** the full matrix again (native, invalid link, OAuth, every Response, settle, the
  intercepted × and OAuth links), with the same results. A press on the action button and on an
  OAuth button adds the ripple.
- **Profile Editor:** the full matrix, the snackbar checks and the 502 check again, with the same
  results.
- **Create Account:** re-run, with the same results. It does not load the M3 layers yet.
- **Other checks:** the brace check passes over `prototypes/`.

Not checked (no browser; jsdom evaluates neither `:has()` nor `:user-invalid` styling, nor
pseudo-elements on inputs)
- The look in both schemes, the checkbox in each state (by mouse and keyboard), the outlined OAuth
  buttons, and the field error after typing versus at page load.
- Profile's appearance after the split, which the rule comparison says is unchanged.

# REQUIREMENT Create Account Mouse Over Link Problem

[X] Resolved

## SHORT SUMMARY
On the Create Account prototype, hovering over the title "Create Account" or the subtitle underlines
it, with a pointer cursor, as if it were a link.

Found while reading:
- **The cause is a production rule.** It is the bleed recorded in the Profile Editor and Login
  NOTES and in the merge plan. The 021 rule in `src/public/site.css` (lines 785–788, copied to
  `../site.css` lines 250–253) is
  `.card-viewport:not(.maximized-card-viewport) .question, … .subtitle{ cursor:pointer }` with
  `:hover{ text-decoration:underline }`. It was meant for poll cards, whose title and subtitle open
  the maximized view, and it also matches every card-shell card, because `cardShell.js` gives them
  `.card-viewport`.
- **Where it shows.** In production it shows on Login, Create Account, Not Authorized and the
  Profile result cards (and on Profile's title). Among the prototypes, only Create Account still
  shows it. The Profile Editor and Login no longer do, because `../card-shell-m3.css` section 3
  turns it off, and Create Account does not load the Material 3 layers yet.
- **The merge plan** (`designDocs/023-high-level-requirements-MATERIAL3-MERGE.md`, Step 3) already
  schedules the production fix: scope the rule to poll cards.

## REQUIREMENT DETAILS

When we mouse over the title "Create Account" on the Create Account dialog, it is underlined as if it is a link.  
This also happens with the text, "Enter your email address — we'll create your account and email your first sign-in link."  

## CLARIFICATIONS

1. Where to fix it
[X] Resolved
It can be fixed in the Create Account prototype alone, by giving Create Account the Material 3
layers, or at the source in production.

a. In the prototype: a small override in Create Account only
Recommended
[X] Accepted
- `CREATE-ACCOUNT-DIALOG/create-account-dialog.html` gets an inline rule with the same selectors
  and effect as `../card-shell-m3.css` section 3: `cursor:default` and no underline on
  `.card-shell-viewport .card-shell-face .question` and `.subtitle`, on hover too.
- The rest of the page stays a faithful production extraction. When Create Account gets its
  Material 3 step, the inline rule is removed, because `../card-shell-m3.css` carries it.
- The production fix stays in the merge plan's Step 3.

b. In the prototype: give Create Account the Material 3 layers now
[ ] Accepted
Load `../pollCard-m3.css`, `../card-shell-m3.css` and `../pollCard-m3.js`, as Login does. The
underline goes, and Create Account takes the full M3 look (underlined field, 40px button, status
lines, field error) with no new rules, because its form is Login's minus the checkbox. This
effectively does the "Use Material 3 For Create Account" step without its own clarifications.

c. At the source, in production
[ ] Accepted
- Scope the 021 rule to poll cards in `src/public/site.css`, for example by adding
  `:not(.card-shell-viewport)`.
- Mirror the change in `../site.css`, the prototypes' copy.
- Fix it through `/speckit-fix` on 022 (or 021), with a test that a card-shell title has no
  pointer cursor.
- This fixes every production page and every prototype at once, but it changes production
  ahead of the merge plan, and moves Step 3's fix forward.

Other.
[ ] Accepted


## RECOMMENDATION
[X] Resolved

1. An inline override in `create-account-dialog.html`, matching `../card-shell-m3.css` section 3
[X] Accepted
- In `CREATE-ACCOUNT-DIALOG/create-account-dialog.html`, the existing `<style>` block gains:
  ```css
  /* The 021 poll-card rule in ../site.css (src/public/site.css lines 785-788)
     also matches card-shell titles; turned off here as ../card-shell-m3.css
     section 3 does. Remove when this page loads ../card-shell-m3.css. */
  .card-viewport.card-shell-viewport .card-shell-face .question,
  .card-viewport.card-shell-viewport .card-shell-face .question:hover,
  .card-viewport.card-shell-viewport .card-shell-face .subtitle,
  .card-viewport.card-shell-viewport .card-shell-face .subtitle:hover{
    cursor:default;
    text-decoration:none;
  }
  ```
- The selectors are identical to the shared layer's, so the rule outranks the 021 rule
  (`.card-viewport:not(.maximized-card-viewport) .question:hover`) in the same way.
- No other file changes. `createAccountCard.js`, `cardShell.js` and `card-shell.css` stay
  byte-identical to production.
- The production fix stays in the merge plan's Step 3, and the Create Account NOTES record the
  override.

Checks
- `css-tree` parses the page's `<style>` with no errors.
- The Create Account jsdom run is repeated (all five Responses, settle, Enter, the ×) with no
  errors.
- A jsdom computed-style check: the title and the subtitle have `cursor: default` and no
  underline when the rule is matched. jsdom does not apply `:hover`, so the hover state itself
  needs a browser.
- Not checkable without a browser: the hover. Please hover the title and the subtitle on
  `create-account-dialog.html`.

Pros:
- It fixes exactly what was reported, with the same rule the other card-shell prototypes already
  use.
- The page otherwise stays a faithful production extraction.

Cons:
- Production still underlines these titles until the merge plan's Step 3.

## NOTES
Implemented recommendation 1, with clarification 1a.

Fix
- `CREATE-ACCOUNT-DIALOG/create-account-dialog.html`: the existing `<style>` block gains one rule,
  with the same selectors and declarations as `../card-shell-m3.css` section 3.
  `.card-viewport.card-shell-viewport .card-shell-face .question` and `.subtitle` (and their
  `:hover`) get `cursor:default; text-decoration:none`. A comment says to remove it when the page
  loads `../card-shell-m3.css`. The Create Account NOTES record it.
  **Removed (REQUIREMENT Use Material 3 For Create Account Dialog):** the page now loads
  `../card-shell-m3.css`, whose section 3 is the same rule, and the inline rule is gone.
- No other file changed. `createAccountCard.js`, `cardShell.js` and `card-shell.css` stay
  byte-identical to production.

Why it wins
- The override is (0,4,0), or (0,5,0) on hover, against the 021 rule's (0,3,0), or (0,4,0) on
  hover, computed with the `specificity` package. It also comes later in the document (the inline
  `<style>` follows every `<link>` in `<head>`). So in a browser it wins in both states.

Checked
- `css-tree` parses the page's `<style>` with no errors.
- The Create Account jsdom run passes as before, with no script errors: five Responses, settle,
  Enter, and the ×.
- **jsdom's computed style is not usable for this check.** It reports `cursor: pointer`, because
  it lists the inline `<style>` as stylesheet 0 (it loads the linked sheets afterwards) and
  resolves by that order, ignoring specificity. A hover-free copy of the rule appended at the
  end of the document computes `cursor: default`, which confirms the rule itself is right.
- Not checked in a browser (none in the sandbox): the hover itself. Please hover the title and
  the subtitle on `create-account-dialog.html`.

Production
- The quirk remains in production (Login, Create Account, Not Authorized, the Profile cards)
  until the merge plan's Step 3 scopes the 021 rule to poll cards.


# REQUIREMENT Use Material 3 For Create Account Dialog

[X] Resolved

## SHORT SUMMARY
Give the `CREATE-ACCOUNT-DIALOG/` prototype the Material 3 treatment, consistent with the approved
Poll Card and with the Login and Profile Editor cards.

Found while reading:
- **Nothing new is needed.** The Create Account form is Login's minus the checkbox: an "Email
  address" label and field straight inside `#create-form`, and one action, "Create Account",
  with its status line.
  - The shared `../card-shell-m3.css` already styles every part of it, with the decisions made
    for Login and Profile: the title (no hover underline), the underlined field (its label
    reached by the widened `form > label:not(.checkbox)` selector), the 40px filled button, the
    status lines, and the form field error after typing (Login clarification 4a).
  - The card layer (`../pollCard-m3.css`, `../pollCard-m3.js`) gives the title type, the ×, the
    button's state layers, focus ring and ripple, and the dark container.
- **No page-load notice.** Create Account has no invalid-link notice, so the field error appears
  only after a failed action, as on Login.
- **The inline override goes.** The inline rule added in REQUIREMENT Create Account Mouse Over
  Link Problem was marked for removal once the page loads `../card-shell-m3.css`, whose section 3
  is the same rule.

## CLARIFICATIONS
None needed. Every part of the card already has an accepted Material 3 design in the shared
card-shell layer (Profile Editor clarifications 1d, 3a, 4a, 5a; Login clarifications 1a, 4a).

## RECOMMENDATION
[X] Resolved

1. Load the card layer and the shared card-shell layer, and remove the inline override
[X] Accepted
- `CREATE-ACCOUNT-DIALOG/create-account-dialog.html`:
  - Link `../pollCard-m3.css`, then `../card-shell-m3.css`, after `../card-shell.css`, as Login
    does.
  - Load `../pollCard-m3.js` (the ripple) after `../cardShell.js`.
  - Remove the inline hover-underline rule from the `<style>` block, because
    `../card-shell-m3.css` section 3 carries it, with the same selectors.
  - The page comment names the requirement.
- No new CSS, and no change to `../card-shell-m3.css`. `createAccountCard.js`, `cardShell.js` and
  `card-shell.css` stay byte-identical to production.
- The Create Account and Mouse Over NOTES gain a line saying the override has gone.

Checks
- `css-tree` parses the page's remaining `<style>`, and the brace check passes.
- jsdom: the Create Account matrix is re-run with no script errors (five Responses, settle,
  Enter, the ×). A press on the button adds the ripple, and the page loads the two M3 sheets.
- The hover fix is confirmed by specificity, because jsdom's computed style cannot show it (see
  the Mouse Over NOTES). `../card-shell-m3.css` section 3 is (0,4,0), or (0,5,0) on hover,
  against the 021 rule's (0,3,0), or (0,4,0).
- Not checkable without a browser: the look in both schemes, the field error after typing, and
  the hover. Please check `create-account-dialog.html` with Theme on Light and Dark and each
  Response.

Pros:
- Create Account matches Login exactly, with no new rules to maintain.
- The temporary override is retired as planned.

Cons:
- None beyond the browser check.

## REQUIREMENT DETAILS

Apply the same Material 3 design principles, accepted recommendations and accepted clarifications, in the Requirements above, when designing and implementing the the prototype Create Account Dialog extracted in the **# REQUIREMENT Create Account Dialog** above.  
Ensure consistency with the previously approved Poll Card.  

## NOTES
Implemented recommendation 1. There were no clarifications. Open
`CREATE-ACCOUNT-DIALOG/create-account-dialog.html` and use the Response and Theme pickers.

Change
- `create-account-dialog.html` links `../pollCard-m3.css`, then `../card-shell-m3.css`, after
  `../card-shell.css`, and loads `../pollCard-m3.js` after `../cardShell.js`, as Login does.
- The inline hover-underline rule from REQUIREMENT Create Account Mouse Over Link Problem was
  removed. `../card-shell-m3.css` section 3 is the same rule, and both earlier NOTES record the
  removal.
- No new CSS, and no change to `../card-shell-m3.css`. `createAccountCard.js` and `cardShell.js`
  are byte-identical to `src/public`.
- The card now has:
  - the Title Large title, with no hover underline;
  - the 32px ×;
  - the underlined "Email address" field, with its label in `primary` above it;
  - the 40px filled "Create Account" button, with state layers, focus ring and ripple;
  - Body Small status lines in `on-surface-variant` or `error`;
  - the field error after a failed action, once the person has typed;
  - the dark container.

Checked
- `css-tree` parses the page's remaining `<style>`, and the brace check passes over `prototypes/`.
- jsdom, no script errors:
  - The Create Account matrix passes as before: five Responses, settle, Enter, the ×.
  - The page loads both M3 sheets (with `card-shell-m3.css`'s rules present).
  - A press on the button adds the ripple.
- The hover fix holds by specificity: `../card-shell-m3.css` section 3 is (0,4,0), or (0,5,0) on
  hover, against the 021 rule's (0,3,0), or (0,4,0). jsdom's computed style cannot show this (see
  the Mouse Over NOTES).
- Not checked in a browser: the look in both schemes, the field error after typing, and the
  hover.

# REQUIREMENT Not Authorized Dialog

[X] Resolved

## SHORT SUMMARY
Extract the Not Authorized card (`not-authorized.html`, `notAuthorizedCard.js`) into
`prototypes/POLL-CARD-MATERIAL3/NOT-AUTHORIZED-DIALOG/`, without the header, tab bar or footer, as
the base for a Material 3 version. It is the last card-shell prerequisite in the merge plan
(`designDocs/024-high-level-requirements-MATERIAL3-MERGE.md`).

Found while reading:
- **The smallest card-shell card.** `notAuthorizedCard.js` calls `CardShell.mount` with the title
  "Not Authorized", the subtitle "You do not have permission to access this page." and the × to `/`.
  It has no body, no action and no status line.
- **No dependencies.** It makes no `fetch`, and reads no query string and no session. One card
  serves a guest and a signed-in non-administrator alike, so it does not reveal whether signing
  in would help (FR-044). `/admin` serves it with status 403 through `requireAdmin`'s `refuse`
  (`src/routes/pages.ts`).
- **What the prototype needs.** No stub server and no state pickers. The only navigation is the ×.
  `../cardShell.js` and `../card-shell.css` are shared, as on Login and Create Account.
- **The hover underline.** The 021 rule reported in REQUIREMENT Create Account Mouse Over Link
  Problem matches this card's title and subtitle too.

## REQUIREMENT DETAILS

Extract the html/css/js from the client-side code of the main CrowdPoll webapp, for the Not Authorized Dialog.
  
This will allow us to create a prototype for the Not Authorized Dialog that uses the Material 3 appearance.  
We recently created a prototype for the Admin Poll Card, and grid layout Poll Card that uses the Material 3 appearance and we want to create a similar prototype for the Not Authorized Dialog.
  
There is no need for the header, tab bar, footer.   
Remove any js files that are not needed for the elements described above.   
Please place the resulting files in:  
`prototypes/POLL-CARD-MATERIAL3/NOT-AUTHORIZED-DIALOG`


## CLARIFICATIONS

1. The title and subtitle hover underline in the extraction
[X] Resolved
A faithful extraction shows production's 021 bleed: "Not Authorized" and its subtitle underline on
hover, as if they were links. You reported it as a problem on Create Account. The next requirement
(Use Material 3 For Not Authorized Dialog) loads `../card-shell-m3.css`, whose section 3 removes
it.

a. Leave it in the extraction; the Material 3 step removes it
Recommended
[X] Accepted
The extraction stays faithful to production, like the Login and Profile extractions. The
underline disappears in the very next requirement, with no temporary rule to add and then
remove.

b. Add the same inline override as Create Account
[ ] Accepted
The extraction never shows the underline. The rule is then removed again when the Material 3
layers load, as happened on Create Account.

Other.
[ ] Accepted


## RECOMMENDATION
[X] Resolved

1. Copy `notAuthorizedCard.js` unchanged onto the shared card shell, with a Theme-only harness
[X] Accepted
This builds what clarification 1a chose. Nothing under `src/` changes.

Files in `prototypes/POLL-CARD-MATERIAL3/NOT-AUTHORIZED-DIALOG/`
- `not-authorized-dialog.html`:
  - `not-authorized.html`'s shell (`.page-decor`, `.page`, `.container`, `.layout`), without
    `#site-header`, holding `<main id="card-root"></main>`.
  - Stylesheets, in production's order: `../tabs.css`, `../pollCard.css`, `../site.css`,
    `../card-shell.css`. Fonts: production's link plus Roboto.
  - A prototype bar with Theme and a note line.
  - Scripts: `../cardShell.js`, `harness.js`, `notAuthorizedCard.js`. The page has no `app.js`.
- `notAuthorizedCard.js`: copied from `src/public` unchanged, and checked byte-identical.
- `harness.js`:
  - The × shows "(sample only: no action taken)" instead of going to `/`.
  - Theme sets `data-theme` on `<html>`, ready for the Material 3 step. It is kept in the query
    string where the browser allows (`file://` refuses `replaceState`, as on Create Account).
  - There is no `fetch` stub and no Session stub, because the card uses neither.
- The hover underline stays, as in production (1a).

Checks
- `node --check` on `harness.js`. `notAuthorizedCard.js` and `cardShell.js` are byte-identical
  to `src/public`, and the brace check passes.
- jsdom: the card shows the title, the subtitle and the ×, with no body, action or status line.
  The × is intercepted, and there are no script errors.
- Not checkable without a browser: the layout.

Pros:
- The card is drawn by production's own scripts, on the shared card-shell copies.
- The smallest possible harness.

Cons:
- None. The hover underline is deliberate, and goes in the next requirement.

## NOTES
Implemented recommendation 1, with clarification 1a. Open
`NOT-AUTHORIZED-DIALOG/not-authorized-dialog.html` directly; no server is needed.

Files in `NOT-AUTHORIZED-DIALOG/`
- `not-authorized-dialog.html`:
  - `not-authorized.html`'s shell without `#site-header`, holding `<main id="card-root">`.
  - Stylesheets: `../tabs.css`, `../pollCard.css`, `../site.css`, `../card-shell.css`. Fonts:
    production's link plus Roboto.
  - A prototype bar with Theme, and a note line.
  - Scripts: `../cardShell.js`, `harness.js`, `notAuthorizedCard.js`.
- `notAuthorizedCard.js`: byte-identical to `src/public`.
- `harness.js`:
  - The × shows "(sample only: no action taken)".
  - Theme sets `data-theme`, and is read from `?theme=` on load. It writes back with
    `replaceState` where allowed: on `file://` this is caught, so a manual reload returns to System.
  - There is no `fetch` or Session stub, because the card uses neither.
- The 021 hover underline is left in, as in production (1a). The next requirement removes it.

Checked (jsdom, no script errors)
- The card shows the `h1` "Not Authorized", the subtitle "You do not have permission to access this
  page." and the × (`aria-label` "Back to the home page"). It has no action and no status line.
- The × is intercepted, and `?theme=dark` sets the picker and `data-theme`.
- `notAuthorizedCard.js` and `cardShell.js` are byte-identical to `src/public`, and the brace
  check passes.
- Not checked in a browser: the layout.

Found while reading, production behaviour shown as is
- `cardShell.js` always appends the body region, so this card has an empty `.card-shell-body`. It
  still takes `margin-top:14px` (`card-shell.css`), which adds space under the subtitle. The
  Material 3 step may want to account for it.
- The title and subtitle underline on hover (the 021 bleed).


# REQUIREMENT Use Material 3 For Not Authorized Dialog

[X] Resolved

## SHORT SUMMARY
Give the `NOT-AUTHORIZED-DIALOG/` prototype the Material 3 treatment, consistent with the approved
Poll Card and the other card-shell cards. The requirement text says "the prototype Create Account
Dialog extracted in the # REQUIREMENT Not Authorized Dialog". That is read as the Not Authorized
Dialog.

Found while reading:
- **Most of it comes from the shared layers.** Loading `../pollCard-m3.css`, `../card-shell-m3.css`
  and `../pollCard-m3.js`, as Login and Create Account do, gives:
  - the title in Title Large, without the 021 hover underline (clarification 1a of the
    extraction);
  - the subtitle in Body Medium, `on-surface-variant`;
  - the × as a 32px standard icon button, with its state layer, focus ring and ripple;
  - the dark container.
- **An empty body.** `cardShell.js` always appends `.card-shell-body`, which `card-shell.css`
  gives `margin-top:14px`. This card puts nothing in it, so 14px of empty space sits under the
  subtitle. The Profile Editor's two session-less result cards ("Email Address Changed", "Link No
  Longer Valid") have the same empty body: `profileCard.js` appends their Log In row to the face,
  not the body.
- **No way out but the ×.** The card has no action: the × ("Back to the home page") is its only
  way out. Production keeps it that way on purpose (FR-044: the card must not reveal whether
  signing in would help, so it offers no Log In).

## REQUIREMENT DETAILS

Apply the same Material 3 design principles, accepted recommendations and accepted clarifications, in the Requirements above, when designing and implementing the the prototype Create Account Dialog extracted in the **# REQUIREMENT Not Authorized Dialog** above.  
Ensure consistency with the previously approved Poll Card.  

## CLARIFICATIONS

1. The empty body's spacing
[X] Resolved
The card ends with an empty `.card-shell-body` that still takes 14px under the subtitle, and so do
the Profile Editor's result cards.

a. Collapse an empty body in the shared layer
Recommended
[X] Accepted
`../card-shell-m3.css` gains `.card-shell-body:empty{ display:none; }`. The card then ends at the
subtitle, with the face's own padding below it. Every card-shell card with an empty body gets the
same tidy end, including the Profile result cards (whose Log In row keeps its own 16px
`margin-top`). Cards with a form or fields are unaffected, because their body is not empty. This is
pure CSS, with no script change.

b. Leave the spacing
[ ] Accepted
The card keeps 14px of empty space under the subtitle, as in production.

Other.
[ ] Accepted


2. A visible way out
[X] Resolved
The only way out is the 32px × at the top right. M3 dialogs and cards usually end with a text
button, but production deliberately offers no Log In here (FR-044).

a. Keep the × as the only way out
Recommended
[X] Accepted
This matches production and FR-044, and the × already reads "Back to the home page" to screen
readers. It is also consistent with the other card-shell cards, which close with the same ×.

b. Add a "Back to Home" text button at the foot of the card
[ ] Accepted
This is a more visible way out in M3's style, and it reveals nothing about signing in. It needs a
production change (an action in `notAuthorizedCard.js`). In the prototype, the harness would add
the button and mark it as a production change to carry over.

Other.
[ ] Accepted


## RECOMMENDATION
[X] Resolved

1. Load the shared Material 3 layers, and collapse an empty card-shell body
[X] Accepted
This builds what the clarifications chose (1a, 2a). `notAuthorizedCard.js`, `cardShell.js` and
`card-shell.css` stay byte-identical to production.

- `NOT-AUTHORIZED-DIALOG/not-authorized-dialog.html`:
  - Link `../pollCard-m3.css`, then `../card-shell-m3.css`, after `../card-shell.css`.
  - Load `../pollCard-m3.js` (the ripple) after `../cardShell.js`, as Login and Create Account do.
  - The page comment names the requirement.
- `../card-shell-m3.css`: one new rule, `.card-shell-body:empty{ display:none; }`, in a new
  section 12 ("Empty body").
  - Not Authorized then ends at its subtitle, with the face's padding below it.
  - The Profile Editor's session-less result cards end the same way above their Log In row, which
    keeps its own 16px `margin-top`.
  - Every other card-shell card has a body with content, so it is unaffected.
  - `cardShell.js` creates the body with no text nodes, so `:empty` matches.
- No action is added (2a). The × remains the only way out.
- The 021 hover underline goes, through `../card-shell-m3.css` section 3.

Checks
- `css-tree` parses `../card-shell-m3.css`, and the brace check passes.
- jsdom:
  - Not Authorized loads both M3 sheets. A press on the × adds the ripple. The body has no child
    nodes, so `:empty` applies. There are no script errors.
  - The Profile Editor's result cards: the body has no child nodes. Its full matrix is re-run.
  - Login and Create Account are re-run: their bodies have content, so the rule does not apply.
- The hover fix holds by specificity, as on Create Account: (0,4,0), or (0,5,0) on hover, against
  (0,3,0), or (0,4,0).
- Not checkable without a browser: the look in both schemes, and the spacing. Please check
  `not-authorized-dialog.html`, and the Profile Editor's "No session" result cards, with Theme on
  Light and Dark.

Pros:
- Not Authorized matches the other card-shell cards, with one small shared rule that also tidies
  the Profile result cards.

Cons:
- The shared rule changes the Profile result cards' spacing (14px less under the subtitle), which
  is part of the approved Profile Editor. It is the same fix there, and the re-check covers it.

## NOTES
Implemented recommendation 1, with clarifications 1a and 2a. Open
`NOT-AUTHORIZED-DIALOG/not-authorized-dialog.html` and use the Theme picker.

Changes
- `NOT-AUTHORIZED-DIALOG/not-authorized-dialog.html` links `../pollCard-m3.css`, then
  `../card-shell-m3.css`, after `../card-shell.css`, and loads `../pollCard-m3.js` after
  `../cardShell.js`. The card now has:
  - the Title Large title, with no 021 hover underline (section 3);
  - the Body Medium subtitle in `on-surface-variant`;
  - the 32px × with its state layer, focus ring and ripple;
  - the dark container.
- `../card-shell-m3.css` gains section 12, `.card-shell-body:empty{ display:none; }`, and its
  header lists it. Not Authorized now ends at its subtitle. The Profile Editor's session-less result
  cards lose the same 14px above their Log In row, which keeps its 16px `margin-top`. The Profile
  Editor's NOTES record this.
- No action was added (2a): the × remains the only way out, as FR-044 intends.
- `notAuthorizedCard.js`, `cardShell.js` and `card-shell.css` are byte-identical to production.

Checked
- `css-tree` parses `../card-shell-m3.css` with no errors, and the brace check passes over
  `prototypes/`.
- jsdom, no script errors:
  - Not Authorized loads both M3 sheets. Its body has no child nodes, so `:empty` matches. A
    press on the × adds the ripple. The × is still intercepted, and `?theme=dark` applies.
  - On the Profile Editor's "Email Address Changed" result card, the body has no child nodes and
    `:empty` matches.
  - On Profile (signed in), Login (native and OAuth) and Create Account, the body has content, so
    `:empty` does not match.
  - The Profile Editor, Login and Create Account matrices were re-run with the same results
    (apart from jsdom's expected navigation notice).
- The hover fix holds by specificity, as on Create Account.
- Not checked in a browser: the look in both schemes, and the spacing. Please check
  `not-authorized-dialog.html`, and the Profile Editor with Session "No session" and Link result
  "Email changed" or "Invalid link".

With this, every card-shell surface in the merge plan's prerequisites (Profile, Login, Create
Account, Not Authorized) has a Material 3 prototype on the shared `../card-shell-m3.css`. The
remaining prerequisites are the `Tabs.modal` dialog, the Live Results idle prompt and the empty-tab
line.

# REQUIREMENT `Tabs.modal` dialog

[X] Resolved

## SHORT SUMMARY
Extract the `Tabs.modal` dialog (`modal(text)` in `tabs.js`, and the FIX027 block in `tabs.css`)
into `prototypes/POLL-CARD-MATERIAL3/TABS-MODAL/`, as the base for a Material 3 version. It is one
of the three remaining prerequisites in the merge plan
(`designDocs/024-high-level-requirements-MATERIAL3-MERGE.md`).

Found while reading:
- **One message box with one OK button.** `modal(text)` builds a `.modal-backdrop` holding a
  `.modal` (`role="dialog"`, `aria-modal="true"`), with a `.modal-text` paragraph and a
  `.modal-actions` row holding `button.tab-refresh.modal-ok`. OK, Escape and a click on the backdrop
  close it. Focus goes to OK, and returns to the element that had it.
- **Two callers, both cap refusals.** `tabs.js` `toggleBookmark` on `409 bookmark-cap` ("You have
  reached the maximum number of Favorites. The limit is 200. …"), and `liveResults.js` on
  `409 live-cap` ("…polls that can be viewed on the Live Results tab. The limit is 5. …").
- **It lives inside `tabs.js`.** `modal` is a 26-line function in a 944-line file, with no
  dependency on the rest of it: no `fetch`, config or tab state. The maximized view's Escape
  listener skips while any `[aria-modal="true"]` is open (021 R7).
- **The styles are not in the shared prototype `../tabs.css`.** That copy is trimmed to tokens,
  page wrapper and grid (95 lines). The `.modal*` rules (`src/public/tabs.css` lines 247–272) and
  the `.tab-refresh` pill that dresses OK (lines 132–148) are missing from it.
- **Accessibility gaps in production, noted for the Material 3 step.** The dialog has no
  accessible name (no `aria-labelledby` / `aria-describedby`), and Tab is not trapped, so focus can
  leave the dialog for the page behind it.

## REQUIREMENT DETAILS

Extract the html/css/js from the client-side code of the main CrowdPoll webapp, for the `Tabs.modal` dialog.
  
This will allow us to create a prototype for the `Tabs.modal` dialog that uses the Material 3 appearance.  
We recently created a prototype for the Admin Poll Card, and grid layout Poll Card that uses the Material 3 appearance and we want to create a similar prototype for the `Tabs.modal` dialog.
  
Remove any js files that are not needed for the elements described above.   
Please place the resulting files in:  
`prototypes/POLL-CARD-MATERIAL3/TABS-MODAL`


## CLARIFICATIONS

1. How `modal()` is taken out of `tabs.js`
[X] Resolved
`modal` is one self-contained function inside the 944-line `tabs.js`. The rest of the file (tab
state, grids, tokens, fetches) is not needed to show the dialog.

a. Copy the function verbatim into a small `tabsModal.js`
Recommended
[X] Accepted
`tabsModal.js` holds `modal(text)` exactly as in `tabs.js` (checked line for line against the
source), and exposes it as `window.Tabs = { modal: modal }`, so callers use production's own name.
No other script from `tabs.js` comes along, which satisfies "remove any js files that are not
needed".

b. Copy `tabs.js` whole and stub what it needs
[ ] Accepted
The file stays byte-identical to `src/public`, but the prototype has to stub `fetch`, `/api/config`
and the tab panels just to load it. It is about 900 lines the dialog never uses.

Other.
[ ] Accepted

2. What the page shows behind the dialog
[X] Resolved
The backdrop is a translucent scrim (`rgba(20, 24, 20, 0.45)`), so how it reads depends on what is
behind it. The requirement does not mention the header, tab bar or footer.

a. The page shell with a static row of sample content, and no header, tab bar or footer
Recommended
[X] Accepted
`index.html`'s `.page` / `.container` shell, holding the prototype bar and a few static
placeholder blocks shaped like grid cards, so the scrim has something to cover. No poll-card
scripts are loaded. This matches the other dialog extractions, which left out the header, tab bar
and footer.

b. A real grid of poll cards behind the dialog
[ ] Accepted
Loads `../pollCard.js` and `../fixtures.js` to draw two or three real cards. The scrim is judged
against the real thing, but the extraction carries scripts that are not part of the dialog.

Other.
[ ] Accepted

3. Whether the Live Results idle prompt comes along
[X] Resolved
The idle prompt (`.live-idle-prompt` in `liveResults.js`) is also an `aria-modal` box with
`.tab-refresh` buttons (Cancel, Yes). The merge plan lists it as a separate prerequisite.

a. `Tabs.modal` only; the idle prompt gets its own requirement
Recommended
[X] Accepted
This keeps the requirement to what it names. The idle prompt is not a backdrop dialog: it sits
inside the Live Results panel, so it needs its own extraction.

b. Include the idle prompt in this prototype
[ ] Accepted
Both boxes share the `.tab-refresh` buttons and similar styling, so they can be designed side by
side. The prototype then has to imitate the Live Results panel as well.

Other.
[ ] Accepted


## RECOMMENDATION
[X] Resolved

1. `modal()` verbatim in `tabsModal.js`, over a placeholder grid, with a trigger harness
[X] Accepted
This builds what clarifications 1a, 2a and 3a chose. Nothing under `src/` changes.

Files in `prototypes/POLL-CARD-MATERIAL3/TABS-MODAL/`
- `tabs-modal.html`:
  - `index.html`'s shell (`.page-decor`, `.page`, `.container`, `.layout`), without
    `#site-header`, the tab bar or the footer (2a).
  - Stylesheets, in production's order: `../tabs.css`, `../site.css`, then `tabs-modal.css`.
    `../pollCard.css` is left out, because no card is drawn. Fonts: production's link plus Roboto.
  - A prototype bar with Theme, two trigger buttons and a note line:
    - **Favorites cap** opens production's `bookmark-cap` message with the limit 200.
    - **Live Results cap** opens production's `live-cap` message with the limit 5.
  - A `.card-grid` of six static placeholder blocks shaped like grid cards (a title bar and a few
    bar-shaped stripes, in the page's own tokens), so the scrim has something to cover (2a).
  - Scripts: `tabsModal.js`, `harness.js`. No `app.js`, `tabs.js`, `pollCard.js` or fixtures.
- `tabsModal.js`: `modal(text)` copied from `src/public/tabs.js` (lines 59–85, with its FIX027
  comment) and checked line for line against it, inside an IIFE that sets
  `window.Tabs = { modal: modal }` (1a).
- `tabs-modal.css`: copied from `src/public/tabs.css` and checked against it:
  - the `.tab-refresh` and `.tab-refresh:disabled` rules (lines 132–148), which dress OK;
  - the FIX027 block (lines 247–272): `.modal-backdrop`, `.modal`, `.modal-text`,
    `.modal-actions`.
- `harness.js`:
  - The two triggers call `window.Tabs.modal(...)` with the exact production strings, so focus
    returns to the trigger on close, as it returns to the star or the Live Results button in
    production.
  - Theme sets `data-theme` on `<html>`, ready for the Material 3 step, read from `?theme=` and
    written back with `replaceState` where allowed (`file://` refuses it, as on Not Authorized).
  - The note line logs how the last dialog closed (OK, Escape, or backdrop).
- The idle prompt is not included (3a).

Checks
- `node --check` on `tabsModal.js` and `harness.js`. The `modal` function and the copied CSS rules
  are compared with `src/public` text, and the brace check passes.
- jsdom:
  - each trigger opens one `.modal-backdrop` holding a `role="dialog"`, `aria-modal="true"` box
    with the right text, and focus lands on OK;
  - OK, Escape and a click on the backdrop each close it and return focus to the trigger, while
    a click inside the box does not close it;
  - no script errors.
- Not checkable without a browser: the layout and how the scrim reads.

Pros:
- The dialog is built by production's own function, on production's own rules.
- Two small scripts, and no stubs: `modal` needs no `fetch`, config or tab state.

Cons:
- `tabsModal.js` is a copy of part of a file, not a byte-identical file, so it is checked by
  comparing the function's text rather than the whole file.
- Placeholder blocks are not real cards, so the scrim's look over coloured result bars is not
  shown (the trade-off accepted in 2a).

## NOTES
Implemented recommendation 1, with clarifications 1a, 2a and 3a. Open
`TABS-MODAL/tabs-modal.html` directly; no server is needed.

Files in `TABS-MODAL/`
- `tabs-modal.html`:
  - `index.html`'s shell (`.page-decor`, `.page`, `.container`, `.layout`), without the site
    header, tab bar or footer.
  - Stylesheets: `../tabs.css`, `../site.css`, `tabs-modal.css`. Fonts: production's link plus
    Roboto.
  - A prototype bar with Theme, **Favorites cap** and **Live Results cap**, and a note line.
  - A `.card-grid` (`aria-hidden`) of six static placeholder cards, styled in an inline `<style>`
    from the page's tokens. They are not production markup.
  - Scripts: `tabsModal.js`, `harness.js`.
- `tabsModal.js`: `modal(text)` and its FIX027 comment, `src/public/tabs.js` lines 59–86, inside an
  IIFE that sets `window.Tabs = { modal: modal }`.
- `tabs-modal.css`: `src/public/tabs.css` lines 132–148 (`.tab-refresh`, `.tab-refresh:disabled`)
  and 247–272 (the FIX027 block).
- `harness.js`:
  - Draws the placeholders.
  - The two triggers call `window.Tabs.modal` with production's strings and the limits 200 and 5.
  - The note line says how the last dialog closed ("Closed with OK.", "Escape" or "backdrop").
  - Theme sets `data-theme`, and is read from `?theme=`.
- All three new files use LF line endings. The copied lines are compared with `src/public` with
  its CRLF stripped.

Checked (jsdom, no script errors)
- The copied function and both CSS ranges are identical to `src/public`. `node --check` passes, and
  braces balance in all three files.
- Six placeholder cards are drawn, and `?theme=dark` sets the picker and `data-theme`.
- Each trigger opens one `.modal-backdrop` with a `role="dialog"`, `aria-modal="true"` box showing
  the right text, with focus on OK. A click inside the box does not close it.
- OK, Escape and a backdrop click each close it, return focus to the trigger, and log the matching
  note.
- Not checked in a browser: the layout and how the scrim reads.

Found while reading, production behaviour shown as is
- **No dark theme yet.** Production's tokens have no dark values, so Theme changes nothing until
  the Material 3 step loads its layers.
- **No accessible name.** The dialog has no `aria-labelledby` or `aria-describedby`, so a screen
  reader announces "dialog" and then the OK button.
- **No focus trap.** The backdrop is the last element in `<body>`, so Tab from OK leaves the dialog
  (to the browser, then the top of the page behind the scrim). Escape still closes it from there.
- **The 640px rule.** The `@media (max-width:639.98px)` block is dropped in production (merge plan
  "Fixes in this step"). It does not reach the dialog, which sizes itself with
  `width:min(440px, 100%)` and the backdrop's 16px padding.


# REQUIREMENT Use Material 3 For `Tabs.modal` Dialog

[X] Resolved

## SHORT SUMMARY
Give the `TABS-MODAL/` prototype the Material 3 treatment, as an M3 **basic dialog**, consistent
with the approved Poll Card and the card-shell cards. It is built on the shared `../pollCard-m3.css`
roles, type scale, shape and state tokens, and the shared ripple.

Found while reading:
- **Nothing shared covers it yet.** None of the shared layers styles `.modal*` or a plain
  `.tab-refresh` (the header layer only restyles the icon form, `.tab-refresh--icon`). So the
  dialog needs its own small layer, `TABS-MODAL/tabs-modal-m3.css`.
- **What an M3 basic dialog is.** It has a `surface-container-high` container with a 28px
  (extra-large) corner and 24px padding, an optional headline in Headline Small, supporting text in
  Body Medium `on-surface-variant`, and text-button actions at the end. Behind it is the M3 scrim:
  black at 32%.
- **Production's dialog differs on each point.** It has a white box with a 1px hairline, a 12px
  corner, 18/20px padding, no headline, 14px Inter text, a bordered pill OK, and a green-black
  scrim at 45%.
- **The extraction's accessibility gaps.** The dialog has no accessible name and no focus trap.
  Fixing them means editing the copied `modal()`.
- **Dark theme.** Loading `../pollCard-m3.css` restates the production tokens in dark, so the page,
  the placeholders and the dialog all follow Theme from this step on.

## REQUIREMENT DETAILS

Apply the same Material 3 design principles, accepted recommendations and accepted clarifications, in the Requirements above, when designing and implementing the the prototype `Tabs.modal` dialog extracted in the **# REQUIREMENT `Tabs.modal` dialog** above.  
Ensure consistency with the previously approved Poll Card.  

## CLARIFICATIONS

1. A headline
[X] Resolved
M3 basic dialogs usually have a headline above the text. Production passes only one string to
`modal(text)`, and both messages start "You have reached the maximum number of …".

a. No headline; the message alone, as supporting text
Recommended
[X] Accepted
M3 allows a dialog without a headline when the message is short and clear, as these are. The
text is Body Medium in `on-surface-variant`, like the card subtitles. No production change.

b. Add a headline ("Favorites limit reached", "Live Results limit reached")
[ ] Accepted
This is easier to scan, and it gives the dialog a natural accessible name. It needs a production
change: `modal(text, title)`, and both callers (`tabs.js` and `liveResults.js`) pass a title. The
prototype marks it as an "M3:" edit to carry over.

Other.
[ ] Accepted


2. The OK button
[X] Resolved
Production's OK is the bordered `.tab-refresh` pill.

a. An M3 text button in `primary`
Recommended
[X] Accepted
This is M3's action style for dialogs: a 40px-high button with a full corner and 12px side
padding, in Label Large and `primary`, with no border or fill. It keeps the shared state layer,
focus ring (3px `secondary`) and ripple, and matches the cookie banner's "I Understand".

b. A filled button, as Vote and Save use
[ ] Accepted
This is more prominent. M3 keeps filled buttons for a dialog's main confirming action, though, and
OK here only acknowledges.

Other.
[ ] Accepted


3. The accessibility gaps
[X] Resolved
The dialog has no accessible name, and Tab moves focus out of it to the page behind the scrim.

a. Fix both in the prototype as "M3:" edits to the copied `modal()`
Recommended
[X] Accepted
The `.modal-text` gets an id, and the box gets `aria-labelledby` pointing at it, or at the headline
if 1b is chosen. The keydown handler keeps Tab and Shift+Tab on OK, which is the only control in
the dialog. Both are marked "M3:" for the merge, as `pollCard.js`'s edits were.

b. Leave production's behaviour; record the gaps for the merge only
[ ] Accepted
The copied `modal()` stays identical to production, and the merge plan carries the fixes.

Other.
[ ] Accepted


4. The scrim
[X] Resolved
Production's scrim is green-black at 45%, `rgba(20, 24, 20, 0.45)`.

a. M3's scrim: black at 32%, in both schemes
Recommended
[X] Accepted
This is the M3 `scrim` role at its dialog opacity. It is a little lighter, so the page behind still
reads, and it is the same in light and dark, as in M3.

b. Keep production's green-black at 45%
[ ] Accepted
This keeps the site's tinted look, but it is darker than M3, and much darker over a dark page.

Other.
[ ] Accepted


## RECOMMENDATION
[X] Resolved

1. A dialog-only Material 3 layer, two marked edits to `modal()`, and the shared ripple
[X] Accepted
This builds what the clarifications chose (1a, 2a, 3a, 4a). `tabs-modal.css` stays a copy of
production. Everything Material 3 is in two new files, plus two marked edits in `tabsModal.js`.

- `TABS-MODAL/tabs-modal.html`:
  - Link `../pollCard-m3.css` after `../site.css`, for the roles, the type scale, shape and state
    tokens, `.m3-ripple`, and the dark restatement of production's tokens. Then link
    `tabs-modal.css`, then the new `tabs-modal-m3.css`.
  - Load the new `tabs-modal-m3.js` after `tabsModal.js`.
  - The page comment names the requirement. The placeholders follow Theme through the production
    tokens.
- `TABS-MODAL/tabs-modal-m3.css`, in sections:
  1. **Scrim (4a).** `--md-sys-color-scrim:#000`, and `.modal-backdrop` gets
     `rgb(0 0 0 / 0.32)` in both schemes.
  2. **Container.** `.modal` gets `surface-container-high`, a 28px corner
     (`--md-sys-shape-corner-extra-large`), 24px padding, no border, and `on-surface` text. Its
     width stays `min(440px, 100%)`, inside M3's 280–560px range. Light has elevation 3 (the shadow
     `card-shell-m3.css` uses). Dark has no shadow: elevation shows by tone, as on the cards.
  3. **Supporting text (1a).** `.modal-text` is Body Medium in `on-surface-variant`, with 24px
     before the actions.
  4. **Actions and OK (2a).** `.modal-actions` stays end-aligned, with an 8px gap. `.modal .modal-ok`
     is a text button: 40px high, 12px side padding, a full corner, no border or fill, `primary`,
     and Label Large in Roboto. It outranks production's `.tab-refresh` by specificity (0,2,0
     against 0,1,0).
  5. **State layer and focus.** The shared `::before` state layer in `currentColor` (hover 0.08,
     focus 0.10, press 0.10), and the 3px `secondary` focus ring with a 2px offset, as on the
     card's buttons.
  6. **Entrance.** The scrim fades in and the box fades and scales from 0.95 over 200ms, with
     M3's emphasized-decelerate easing. There is none under `prefers-reduced-motion`. There is no
     exit motion, because `modal()` removes the dialog at once and is left that way.
- `TABS-MODAL/tabs-modal-m3.js`: the ripple, a copy of `../pollCard-m3.js`'s delegated listener
  (without its vote-row branch), aimed at `.modal-ok`. This is the same pattern as
  `header-tab-bar-m3.js`.
- `TABS-MODAL/tabsModal.js`, with two edits marked "M3:" for the merge (3a):
  - The text paragraph gets `id="modal-text"`, and the box gets `aria-labelledby="modal-text"`, so
    a screen reader announces the message as the dialog's name.
  - `onKey` also handles Tab: it prevents the default and keeps focus on OK, the dialog's only
    control, so Tab and Shift+Tab stay in the dialog.
  - Every other line stays identical to `src/public/tabs.js`.

Checks
- `css-tree` parses `tabs-modal-m3.css`, and the brace check passes. A rule-by-rule comparison
  confirms `tabs-modal.css` still matches production.
- The `modal` function matches `src/public/tabs.js` except for the lines marked "M3:".
- jsdom:
  - Each trigger opens the dialog. `aria-labelledby` resolves to the message, and focus is on OK.
  - Tab and Shift+Tab keep focus on OK. OK, Escape and a backdrop click still close the dialog and
    return focus to the trigger.
  - A press on OK adds a `.m3-ripple`.
  - `?theme=dark` applies, and there are no script errors.
- Specificity: the OK and container rules outrank production's, by selector weight and order.
- Not checkable without a browser: the look in both schemes, the scrim, and the entrance. Please
  open `tabs-modal.html` with Theme on Light and Dark, and try both triggers.

Pros:
- A standard M3 basic dialog, on the shared roles, type scale, state layers and ripple, and
  consistent with the cookie banner's text button.
- The dialog gets an accessible name and keeps focus inside, with two small, marked edits to carry
  over.

Cons:
- `tabsModal.js` is no longer identical to production. The two "M3:" edits must be carried over in
  the merge, alongside the CSS.
- `../pollCard-m3.css` is loaded for its tokens, and so are its card rules, which match nothing on
  this page.

## NOTES
Implemented recommendation 1, with clarifications 1a, 2a, 3a and 4a. Open
`TABS-MODAL/tabs-modal.html`, set Theme, and use **Favorites cap** and **Live Results cap**.

Changes in `TABS-MODAL/`
- `tabs-modal.html`:
  - Links `../pollCard-m3.css` after `../site.css`, then `tabs-modal.css`, then
    `tabs-modal-m3.css`.
  - Loads `tabs-modal-m3.js` after `tabsModal.js`.
  - The page comment names the requirement.
- `tabs-modal-m3.css` (new), in six sections:
  1. The scrim, black at 32% in both schemes (4a).
  2. The container: `surface-container-high`, a 28px corner, 24px padding, no border, and
     `on-surface`. It keeps `min(440px, 100%)`. Light has elevation 3, and dark has no shadow.
  3. The message in Body Medium `on-surface-variant`, with 24px before the actions (1a).
  4. OK as a 40px `primary` text button in Label Large Roboto (2a). `.modal .modal-ok` (0,2,0)
     outranks `.tab-refresh` (0,1,0).
  5. The state layer and the 3px `secondary` focus ring, as on the card's buttons.
  6. The entrance: the scrim fades in, and the box fades and scales from 0.95, over 200ms with
     emphasized-decelerate easing. There is none under reduced motion, and no exit motion.
  - It defines `--md-sys-color-scrim`, `--md-sys-shape-corner-extra-large`,
    `--md-sys-elevation-3` (the value in `../card-shell-m3.css`) and
    `--md-sys-motion-easing-emphasized-decelerate`. Every other token comes from
    `../pollCard-m3.css`.
- `tabs-modal-m3.js` (new): the shared ripple listener, aimed at `.modal .modal-ok`.
- `tabsModal.js`: two edits marked "M3:" (3a), to carry over in the merge:
  - `.modal-text` gets `id="modal-text"`, and the box gets `aria-labelledby="modal-text"`.
  - `onKey` handles Tab: it prevents the default and keeps focus on OK.
- `tabs-modal.css` is unchanged and still matches production.

Checked
- `css-tree` parses both CSS files with no errors. Braces balance, and `node --check` passes on
  all scripts.
- `modal()` is identical to `src/public/tabs.js` once the two "M3:" blocks are removed.
- Every `var()` in `tabs-modal-m3.css` is defined, in light and in dark.
- jsdom, no script errors:
  - The stylesheets load in the order above, and `?theme=dark` applies.
  - For both triggers, the dialog opens with `aria-labelledby` resolving to the message, and focus
    is on OK.
  - Tab and Shift+Tab are prevented and leave focus on OK.
  - A press on OK adds a `.m3-ripple`, and a click inside the box does not close it.
  - OK, Escape and a backdrop click each close it, return focus to the trigger, and log the
    matching note.
- Not checked in a browser: the look in both schemes, the scrim, the entrance and the ripple's
  animation. Please open `tabs-modal.html` with Theme on Light and Dark.

For the merge (`designDocs/024-high-level-requirements-MATERIAL3-MERGE.md`)
- Carry `tabs-modal-m3.css`'s rules, the ripple target `.modal .modal-ok`, and the two "M3:" edits
  into `tabs.js`.

The remaining prerequisites are the Live Results idle prompt and the empty-tab line.

# REQUIREMENT Live Results idle prompt

[X] Resolved

## SHORT SUMMARY
Extract the Live Results idle prompt (`showIdlePrompt()` in `liveResults.js`, and the
`.live-idle-*` rules in `tabs.css`) into `prototypes/POLL-CARD-MATERIAL3/LIVE-RESULTS-IDLE-PROMPT/`,
without the header, tab bar or footer, as the base for a Material 3 version. It is one of the two
remaining prerequisites in the merge plan
(`designDocs/024-high-level-requirements-MATERIAL3-MERGE.md`).

Found while reading:
- **An inline box, not an overlay.** `showIdlePrompt()` prepends a `.live-idle-prompt` to the Live
  Results panel (`.tab-panel[data-panel="live"]`), above the card grid. It has no backdrop. It
  holds the text "Do you want to continue to receive Live Results updates for this poll?" and two
  `.tab-refresh` pill buttons, Cancel then Yes.
- **When it shows.** `tick()` shows it instead of refreshing once there has been no click,
  keydown, scroll or press in the panel for `ENV_MAX_IDLE_TIME` (default 30 minutes). While it
  shows, the timer stops.
- **What the buttons do.** Yes removes the prompt, resets the idle clock and refreshes. Cancel
  removes it and calls `closeTab(true)`: the removals are sent, the tab is emptied, and the page
  returns to Trending.
- **It is a closure, not a function on `Tabs`.** It reads `panel`, `prompting`,
  `lastInteractionAt`, `refresh()` and `closeTab()` from `liveResults.js`'s scope, and that file
  needs `DeltaClient` and most of `Tabs`.
- **Production gaps, noted for the Material 3 step:**
  - It is marked `role="dialog"` and `aria-modal="true"`, but the page around it stays usable. A
    screen reader is told the rest of the page is inert when it is not.
  - Focus is not moved to it, it has no accessible name, and Escape does nothing.
  - While it shows, its `aria-modal` also turns off the maximized view's Escape (021 R7).
  - The text says "for this poll", but the tab can hold up to five polls
    (`ENV_MAX_LIVE_RESULTS_PER_USER`), and Cancel closes all of them.
- **The styles are not in the shared prototype `../tabs.css`.** The `.live-idle-*` rules
  (`src/public/tabs.css` lines 232–245) and the `.tab-refresh` pill (lines 132–148) are missing
  from it. `TABS-MODAL/tabs-modal.css` already holds the pill.

## REQUIREMENT DETAILS

Extract the html/css/js from the client-side code of the main CrowdPoll webapp, for the Live Results idle prompt,.
  
This will allow us to create a prototype for the Live Results idle prompt, that uses the Material 3 appearance.  
We recently created a prototype for the Admin Poll Card, and grid layout Poll Card that uses the Material 3 appearance and we want to create a similar prototype for the Live Results idle prompt,.
  
There is no need for the header, tab bar, footer.   
Remove any js files that are not needed for the elements described above.   
Please place the resulting files in:  
`prototypes/POLL-CARD-MATERIAL3/LIVE-RESULTS-IDLE-PROMPT`


## CLARIFICATIONS

1. How `showIdlePrompt()` is taken out of `liveResults.js`
[X] Resolved
The function is a closure over `liveResults.js`'s state, and that file needs `DeltaClient`, most
of `Tabs`, a config fetch and the Live Results server routes.

a. Copy the function verbatim into `liveIdlePrompt.js`, with marked stand-ins for what it reads
Recommended
[X] Accepted
`liveIdlePrompt.js` holds `IDLE_PROMPT` and `showIdlePrompt()` exactly as in `liveResults.js`
(checked line for line). Beside them, in the same scope and each marked "STAND-IN", it declares
`panel`, `prompting` and `lastInteractionAt`, and a `refresh()` and a `closeTab()` that report to
the harness instead of calling the server. It exposes `showIdlePrompt` for the harness. No other
script from `liveResults.js`, `tabs.js` or `deltaClient.js` comes along.

b. Copy `liveResults.js` whole and stub what it needs
[ ] Accepted
The file stays byte-identical, but the prototype has to stub `DeltaClient`, `Tabs`
(`createGrid`, `dynamicRequest`, `config`, `register` and more) and the timer, just to reach the
prompt.

Other.
[ ] Accepted


2. What the page shows around the prompt
[X] Resolved
The prompt sits in the page flow, at the top of the Live Results panel and above the card grid. How
it reads depends on what is below it.

a. A Live Results panel with static placeholder cards, and no header, tab bar or footer
Recommended
[X] Accepted
The page holds `index.html`'s `.tab-panel[data-panel="live"]` with its `.card-grid` and
`.tab-empty`, and the grid holds static placeholder blocks shaped like cards, as in `TABS-MODAL/`.
No poll-card scripts are loaded. The prompt is prepended to the real panel element, as in
production.

b. Real poll cards below the prompt
[ ] Accepted
Loads `../pollCard.js` and `../fixtures.js` to draw a few real cards. The prompt is judged against
the real thing, but the extraction carries scripts that are not part of the prompt.

Other.
[ ] Accepted


3. How the prompt is shown in the prototype
[X] Resolved
In production it appears after 30 minutes without interaction (`ENV_MAX_IDLE_TIME`).

a. A **Show idle prompt** button in the prototype bar
Recommended
[X] Accepted
It calls `showIdlePrompt()` at once. The note line reports what Yes or Cancel would do in
production ("Yes: the idle clock is reset and Live Results refreshes", "Cancel: the polls are
removed and the page returns to Trending"). A second press while the prompt shows does nothing, as
in production (`prompting`).

b. A button, and also a short idle timer
[ ] Accepted
Adds an "Idle after" picker (off, 10 s, 30 s) that shows the prompt after that long without a
click, key, scroll or press in the panel, to imitate production's trigger.

Other.
[ ] Accepted


## RECOMMENDATION
[X] Resolved

1. `showIdlePrompt()` verbatim with marked stand-ins, in a real Live Results panel, with a Show button
[X] Accepted
This builds what clarifications 1a, 2a and 3a chose. Nothing under `src/` changes.

Files in `prototypes/POLL-CARD-MATERIAL3/LIVE-RESULTS-IDLE-PROMPT/`
- `live-results-idle-prompt.html`:
  - `index.html`'s shell (`.page-decor`, `.page`, `.container`, `.layout`), without the site
    header, the tab bar or the footer.
  - Stylesheets, in production's order: `../tabs.css`, `../site.css`, then `live-idle-prompt.css`.
    `../pollCard.css` is left out, because no card is drawn. Fonts: production's link plus Roboto.
  - A prototype bar with Theme, a **Show idle prompt** button, and a note line.
  - `index.html`'s Live Results panel, as is:
    `<section class="tab-panel" data-panel="live"><div class="card-grid"></div><p class="tab-empty" hidden></p></section>`.
    The grid holds six static placeholder blocks shaped like cards, styled as in `TABS-MODAL/`
    (2a). `.tab-empty` stays hidden, as it is while the tab holds polls.
  - Scripts: `liveIdlePrompt.js`, `harness.js`. No `app.js`, `tabs.js`, `deltaClient.js`,
    `liveResults.js`, `pollCard.js` or fixtures.
- `liveIdlePrompt.js` (1a), one IIFE:
  - `IDLE_PROMPT` and `showIdlePrompt()`, copied from `src/public/liveResults.js` (line 12, and
    lines 155–184 with their section comment) and checked line for line against it.
  - Beside them, each marked "STAND-IN": `panel` (the real `.tab-panel[data-panel="live"]`),
    `prompting = false` and `lastInteractionAt`, and a `refresh()` and a `closeTab(sendRemovals)`.
    The two functions only tell the harness what production would do, through a
    `live-idle-sample` event on `document`.
  - It exposes `window.LiveIdlePrompt = { show: showIdlePrompt }`.
- `live-idle-prompt.css`: copied from `src/public/tabs.css` and checked against it:
  - the `.tab-refresh` and `.tab-refresh:disabled` rules (lines 132–148), which dress Cancel and
    Yes;
  - the Live Results idle prompt block (lines 232–245): `.live-idle-prompt`, `.live-idle-text`,
    `.live-idle-actions`.
- `harness.js`:
  - Draws the placeholders.
  - **Show idle prompt** calls `window.LiveIdlePrompt.show()`. A second press while the prompt
    shows does nothing, because of production's own `prompting` check (3a).
  - The note line reports the `live-idle-sample` events: "Yes: the idle clock is reset and Live
    Results refreshes (sample only)", or "Cancel: the polls are removed and the page returns to
    Trending (sample only)". The placeholders stay, so the prompt can be shown again.
  - Theme sets `data-theme` on `<html>`, ready for the Material 3 step, read from `?theme=` and
    written back with `replaceState` where allowed.

Checks
- `node --check` on both scripts. `IDLE_PROMPT`, `showIdlePrompt()` and the copied CSS rules are
  compared with `src/public` text, and the brace check passes.
- jsdom:
  - The button prepends one `.live-idle-prompt` to the Live Results panel, above the grid, with
    `role="dialog"`, `aria-modal="true"`, production's text, and Cancel then Yes.
  - A second press adds no second prompt.
  - Yes and Cancel each remove it, reset `prompting`, and log the matching note. Yes also moves
    `lastInteractionAt`.
  - Focus is not moved, as in production.
  - There are no script errors.
- Not checkable without a browser: the layout.

Pros:
- The prompt is built by production's own function and rules, in production's own panel.
- The stand-ins are few, marked, and limited to what the closure reads.

Cons:
- `liveIdlePrompt.js` copies part of a file, with stand-ins around it, so it is checked by comparing
  the copied text rather than the whole file.
- The placeholders are not real cards (the trade-off accepted in 2a).

## NOTES
Implemented recommendation 1, with clarifications 1a, 2a and 3a. Open
`LIVE-RESULTS-IDLE-PROMPT/live-results-idle-prompt.html` directly; no server is needed.

Files in `LIVE-RESULTS-IDLE-PROMPT/`
- `live-results-idle-prompt.html`:
  - `index.html`'s shell, without the site header, tab bar or footer.
  - Stylesheets: `../tabs.css`, `../site.css`, `live-idle-prompt.css`. Fonts: production's link
    plus Roboto.
  - A prototype bar with Theme and **Show idle prompt**, and a note line.
  - `index.html`'s `<main class="all-markets">` holding its Live Results panel as is. The grid holds
    six static placeholder cards, each `aria-hidden`, styled in an inline `<style>` as in
    `TABS-MODAL/`.
  - Scripts: `liveIdlePrompt.js`, `harness.js`.
- `liveIdlePrompt.js`:
  - `IDLE_PROMPT` (`src/public/liveResults.js` line 13; the recommendation's "line 12" is `TAB`)
    and `showIdlePrompt()` with its section comment (lines 155–184), copied verbatim.
  - Stand-ins, each marked "STAND-IN": `panel`, `prompting`, `lastInteractionAt`, `refresh()` and
    `closeTab(sendRemovals)`. The two functions fire `live-idle-sample` on `document`.
  - It exposes `window.LiveIdlePrompt = { show: showIdlePrompt }`.
- `live-idle-prompt.css`: `src/public/tabs.css` lines 132–148 (`.tab-refresh`,
  `.tab-refresh:disabled`) and 232–245 (the idle prompt block).
- `harness.js`:
  - Draws the placeholders.
  - **Show idle prompt** calls `window.LiveIdlePrompt.show()`.
  - The note line reports Yes ("the idle clock is reset and Live Results refreshes") or Cancel
    ("the polls are removed and the page returns to Trending"), each "(sample only)".
  - Theme sets `data-theme`, and is read from `?theme=`.
- All new files use LF line endings. The copied lines are compared with `src/public` with its CRLF
  stripped.

Checked (jsdom, no script errors)
- `IDLE_PROMPT`, `showIdlePrompt()` and both CSS ranges are identical to `src/public`. `node
  --check` passes, `css-tree` parses the CSS with no errors, and braces balance in all three files.
- Six placeholder cards are in the Live Results grid, `.tab-empty` is hidden, and `?theme=dark`
  applies.
- For Yes and for Cancel:
  - The button prepends one prompt as the panel's first child, above the grid, with
    `role="dialog"`, `aria-modal="true"`, production's text, and Cancel then Yes.
  - Focus stays on the Show button, as in production.
  - A second press adds no second prompt.
  - The answer removes the prompt. Yes reports `refresh` with a new `lastInteractionAt`, and
    Cancel reports `closeTab(true)`.
- After an answer, `prompting` is reset, and the prompt can be shown again.
- Not checked in a browser: the layout.

Found while reading, production behaviour shown as is
- `aria-modal="true"` on an inline box whose page stays usable. Focus is not moved, it has no
  accessible name, and Escape does nothing.
- While it shows, its `aria-modal` also turns off the maximized view's Escape (`tabs.js`, 021 R7).
- "for this poll", although the tab can hold up to five polls and Cancel closes all of them.
- Its 14px Inter text, 12px corner and bordered pills match the pre-M3 `Tabs.modal` box.

# REQUIREMENT Use Material 3 For Live Results idle prompt,

[X] Resolved

## SHORT SUMMARY
Give the `LIVE-RESULTS-IDLE-PROMPT/` prototype the Material 3 treatment, consistent with the
approved Poll Card and with the Material 3 `Tabs.modal` dialog. The requirement text says "the
prototype Create Account Dialog extracted in the # REQUIREMENT Live Results idle prompt". That is
read as the Live Results idle prompt.

Found while reading:
- **M3 has no inline-prompt component.** M3 dropped M2's banner. The two M3 forms that fit are an
  outlined or filled card holding the text and text-button actions, in the page flow, or a basic
  dialog over a scrim, like `TABS-MODAL/`.
- **The page stays usable in production.** The prompt is inline. The polls below it keep their
  last results, votes and favourites, but they stop updating until Yes.
- **The shared layers give the tokens, not the prompt.** `../pollCard-m3.css` brings the roles,
  type scale, state tokens, `.m3-ripple`, and the dark restatement of production's tokens, so the
  page and the placeholders follow Theme. `TABS-MODAL/tabs-modal-m3.css` styles `.modal*` only.
- **The extraction's gaps.**
  - It says `aria-modal="true"` while the page stays usable, and its `aria-modal` also turns off
    the maximized view's Escape.
  - It has no accessible name, and focus is not moved to it.
  - The text says "for this poll", although the tab can hold up to five polls and Cancel closes
    all of them.
  - Fixing any of these means editing the copied `showIdlePrompt()` (marked "M3:" for the merge,
    as in `TABS-MODAL/`).

## REQUIREMENT DETAILS

Apply the same Material 3 design principles, accepted recommendations and accepted clarifications, in the Requirements above, when designing and implementing the the prototype Create Account Dialog extracted in the **# REQUIREMENT Live Results idle prompt,** above.  
Ensure consistency with the previously approved Poll Card.  

## CLARIFICATIONS

1. Inline card or modal dialog
[X] Resolved
Production shows the prompt inline, above the cards, with the page still usable.

a. An inline M3 outlined card, above the grid
Recommended
[X] Accepted
The prompt keeps its place and behaviour. It becomes a card: `surface-container-low` with an
`outline-variant` hairline, a 12px (medium) corner, 16px padding, the text in Body Medium, and the
actions below it at the end. The polls stay readable below it, which suits a prompt that appears
when no one has touched the page for 30 minutes. No behaviour change.

b. An M3 basic dialog over a scrim, as `Tabs.modal`
[ ] Accepted
The prompt looks and behaves like the `Tabs.modal` dialog, and `aria-modal` becomes true to fact.
The page behind is blocked until Yes or Cancel. It needs a production change: `showIdlePrompt()`
builds a backdrop and appends it to `<body>` instead of prepending to the panel.

Other.
[ ] Accepted


2. The Cancel and Yes buttons
[X] Resolved
Production has two bordered `.tab-refresh` pills, Cancel then Yes.

a. Two M3 text buttons in `primary`, Cancel then Yes
Recommended
[X] Accepted
This is M3's pattern for a pair of actions: both text buttons, with the confirming action last.
It matches `Tabs.modal`'s OK, with the same size (40px), type (Label Large), state layer, focus
ring and ripple.

b. Cancel as a text button, Yes as a filled tonal button
[ ] Accepted
This gives Yes more weight, as the action most users want. It is less consistent with
`Tabs.modal`, whose only action is a text button.

Other.
[ ] Accepted


3. The wording "for this poll"
[X] Resolved
The text reads "Do you want to continue to receive Live Results updates for this poll?", but the
tab can hold up to five polls, and Cancel removes all of them.

a. Drop "for this poll", as an "M3:" edit
Recommended
[X] Accepted
The text becomes "Do you want to continue to receive Live Results updates?", which is true for
one poll or five. The edit is to `IDLE_PROMPT`, marked "M3:" for the merge. Cancel and Yes keep
their labels.

b. Keep the text verbatim; record it for the merge only
[ ] Accepted
The prototype shows production's wording, and the merge plan carries the fix.

c. Reword the text and the buttons
[ ] Accepted
For example "Keep receiving Live Results updates?", with **Stop updates** and **Keep updating**.
M3 favours action labels over Yes and Cancel. This is a larger wording change than the
inaccuracy needs.

Other.
[ ] Accepted


4. The accessibility gaps
[X] Resolved
With the inline form (1a), `aria-modal="true"` is untrue. The prompt has no accessible name, and
focus stays where it was.

a. Fix them as "M3:" edits to the copied `showIdlePrompt()`
Recommended
[X] Accepted
- Drop `aria-modal` (keep `role="dialog"`), which also gives Escape back to the maximized view.
- Give the text an id, and the box `aria-labelledby` pointing at it.
- Move focus to Yes when the prompt appears, so a returning user can answer with Enter. After
  Yes, focus goes back to where it was.

If 1b is chosen instead, the dialog takes `Tabs.modal`'s fixes (`aria-labelledby`, focus on the
confirming action, Tab kept inside) and keeps `aria-modal`.

b. Leave production's behaviour; record the gaps for the merge only
[ ] Accepted
The copied function stays identical to production.

Other.
[ ] Accepted

## RECOMMENDATION
[X] Resolved

1. A prompt-only Material 3 layer, marked edits to `showIdlePrompt()`, and the shared ripple
Recommended
[X] Accepted
This builds what the clarifications chose (1a, 2a, 3a, 4a), in the same shape as `TABS-MODAL/`.
`live-idle-prompt.css` stays a copy of production. Everything Material 3 is in two new files, plus
marked edits in `liveIdlePrompt.js`.

- `LIVE-RESULTS-IDLE-PROMPT/live-results-idle-prompt.html`:
  - Link `../pollCard-m3.css` after `../site.css`, for the roles, the type scale, the shape and
    state tokens, `.m3-ripple`, and the dark restatement of production's tokens. Then link
    `live-idle-prompt.css`, then the new `live-idle-prompt-m3.css`.
  - Load the new `live-idle-prompt-m3.js` after `liveIdlePrompt.js`.
  - The page comment names the requirement. The placeholders follow Theme through the production
    tokens, as in `TABS-MODAL/`.
- `LIVE-RESULTS-IDLE-PROMPT/live-idle-prompt-m3.css`, in sections:
  1. **Container (1a).** `.live-idle-prompt` becomes an M3 outlined card:
     `surface-container-low`, a 1px `outline-variant` border, a 12px corner
     (`--md-sys-shape-corner-medium`), 16px padding, no shadow, and `on-surface` text. It keeps
     its place above the grid and its 16px bottom margin.
  2. **Text (3a).** `.live-idle-text` is Body Medium in `on-surface`, with 8px before the actions.
  3. **Actions, Cancel and Yes (2a).** `.live-idle-actions` stays end-aligned, with an 8px gap.
     `.live-idle-prompt .tab-refresh` is a text button: 40px high, 12px side padding, a full
     corner, no border or fill, `primary`, and Label Large. It outranks production's
     `.tab-refresh` by specificity (0,2,0 against 0,1,0). The actions sit 4px closer to the card's
     end edge (`margin-inline-end:-4px`) so the text, not the invisible button edge, lines up.
  4. **State layer and focus.** The shared `::before` state layer in `currentColor` (hover 0.08,
     focus 0.10, press 0.10), and the 3px `secondary` focus ring with a 2px offset, as on the
     card's buttons and `Tabs.modal`'s OK.
  5. **Entrance.** The card fades in and slides down 8px over 200ms, with M3's
     emphasized-decelerate easing. There is none under `prefers-reduced-motion`. There is no exit
     motion, because `showIdlePrompt()` removes the card at once and is left that way.
- `LIVE-RESULTS-IDLE-PROMPT/live-idle-prompt-m3.js`: the ripple, a copy of `../pollCard-m3.js`'s
  delegated listener (without its vote-row branch), aimed at `.live-idle-prompt .tab-refresh`, as
  `TABS-MODAL/tabs-modal-m3.js` does.
- `LIVE-RESULTS-IDLE-PROMPT/liveIdlePrompt.js`, with edits marked "M3:" for the merge:
  - `IDLE_PROMPT` drops "for this poll" (3a).
  - `aria-modal` is no longer set; `role="dialog"` stays (4a). This also gives Escape back to the
    maximized view, whose listener ignores `[aria-modal="true"]`.
  - The text paragraph gets `id="live-idle-text"`, and the box gets
    `aria-labelledby="live-idle-text"` (4a).
  - Focus moves to Yes once the prompt is in the page. Yes returns focus to the element that had
    it before, if it is still in the document (4a). Cancel leaves focus to production's
    `closeTab`, which selects Trending.
  - Every other line stays identical to `src/public/liveResults.js`.
- `LIVE-RESULTS-IDLE-PROMPT/harness.js`: no change, except that "Show idle prompt" is the
  element focus returns to after Yes, which is what the check below relies on.

Checks
- `css-tree` parses `live-idle-prompt-m3.css`, and the brace check passes. `live-idle-prompt.css`
  still matches production rule by rule.
- `showIdlePrompt()` matches `src/public/liveResults.js` except for the lines marked "M3:".
- jsdom:
  - "Show idle prompt" inserts the card first in the Live Results panel, with no `aria-modal`,
    `aria-labelledby` resolving to the new text, and focus on Yes.
  - Yes removes the card, fires the `refresh` sample and returns focus to "Show idle prompt".
    Cancel removes the card and fires `closeTab`. A second press while showing adds nothing.
  - A press on Cancel or Yes adds a `.m3-ripple`.
  - `?theme=dark` applies, and there are no script errors.
- Specificity: the button and container rules outrank production's, by selector weight and order.
- Not checkable without a browser: the look in both schemes and the entrance. Please open
  `live-results-idle-prompt.html` with Theme on Light and Dark, and press the button.

Pros:
- A standard M3 outlined card with text buttons, on the shared roles, type scale, state layers and
  ripple, consistent with the Poll Card and the Material 3 `Tabs.modal`.
- Production's behaviour is kept: the page stays usable, and only accessibility and wording
  change, in small marked edits.
- The same file layout as `TABS-MODAL/`, so the merge treats both alike.

Cons:
- `liveIdlePrompt.js` is no longer identical to production. The "M3:" edits must be carried over in
  the merge, alongside the CSS.
- `../pollCard-m3.css` is loaded for its tokens, and so are its card rules, which match nothing on
  this page.
- Moving focus to Yes may scroll the page to the top of the Live Results panel when the prompt
  appears. This is intended: the user is returning to it.

2. Restyle the copied CSS in place, with the same marked JS edits
[ ] Accepted
The same look, text and accessibility as recommendation 1, but the Material 3 rules replace the
rules in `live-idle-prompt.css` instead of going in a separate layer. The ripple and the
`liveIdlePrompt.js` edits are as in 1.

Pros:
- One stylesheet fewer, and no specificity override of `.tab-refresh`.

Cons:
- The prototype no longer shows production's CSS beside the Material 3 layer, so the merge cannot
  diff them.
- It breaks the pattern of `TABS-MODAL/` and the other Material 3 prototypes, where the copy of
  production stays untouched.

## NOTES

Implemented recommendation 1 with clarifications 1a, 2a, 3a and 4a.

Files in `LIVE-RESULTS-IDLE-PROMPT/`:
- `live-results-idle-prompt.html`: links `../pollCard-m3.css` after `../site.css`, then
  `live-idle-prompt.css` (unchanged, still production's), then the new `live-idle-prompt-m3.css`.
  It loads the new `live-idle-prompt-m3.js` after `liveIdlePrompt.js`. The page comment names the
  requirement.
- `live-idle-prompt-m3.css` (new), in five sections:
  1. The outlined card, with `surface-container-low`, a 1px `outline-variant` border, a 12px
     corner, 16px padding and no shadow.
  2. The text, in Body Medium and `on-surface`.
  3. Cancel and Yes as 40px `primary` text buttons in Label Large. The actions row has an 8px gap
     and a -4px end margin.
  4. The shared state layer and the 3px `secondary` focus ring.
  5. A 200ms fade and 8px slide-in on entrance, with none under reduced motion and no exit
     motion.
  - It defines `--md-sys-motion-easing-emphasized-decelerate` itself, as `tabs-modal-m3.css`
    does, because `../pollCard-m3.css` lacks it.
- `live-idle-prompt-m3.js` (new): a copy of `TABS-MODAL/tabs-modal-m3.js`, aimed at
  `.live-idle-prompt .tab-refresh`.
- `liveIdlePrompt.js`: edits marked "M3:" to carry over in the merge into
  `src/public/liveResults.js`:
  - `IDLE_PROMPT` drops "for this poll".
  - `aria-modal` is no longer set; `role="dialog"` stays.
  - The text gets `id="live-idle-text"`, and the prompt gets `aria-labelledby`.
  - Focus moves to Yes after `panel.prepend`.
  - Yes returns focus to the element that had it, if that element is still connected and is not
    `<body>`.
  - Cancel leaves focus to production's `closeTab`, which selects Trending.
- `harness.js`: unchanged.

Merge notes:
- Production has a fixed `id="live-idle-text"`. That is safe because `prompting` allows one
  prompt at a time.
- Production's Escape listener in `tabs.js` ignores `[aria-modal="true"]` dialogs. With
  `aria-modal` gone, Escape closes the maximized view while the prompt shows, as intended (4a).

Checks run:
- `css-tree` parses `live-idle-prompt-m3.css` with no errors, and its braces balance (15/15).
- `git diff` shows `live-idle-prompt.css` unchanged.
- A line diff of `showIdlePrompt()` against `src/public/liveResults.js` shows only the "M3:"
  lines. `IDLE_PROMPT` differs as 3a intends.
- Specificity: `.live-idle-prompt .tab-refresh` (0,2,0) outranks production's `.tab-refresh`
  (0,1,0). `.live-idle-prompt` and `.live-idle-text` match production's weight and win by loading
  later.
- jsdom, with Theme on System and `?theme=dark`:
  - The prompt is first in the panel, with `role="dialog"` and no `aria-modal`.
  - `aria-labelledby` resolves to the new text, and focus is on Yes.
  - A second press adds no second prompt.
  - A pointerdown on Yes or Cancel adds a `.m3-ripple`.
  - Yes removes the prompt, fires `refresh` and returns focus to "Show idle prompt". Cancel
    removes it and fires `closeTab`.
  - There are no script errors.
- Not checkable without a browser: the look in both schemes, the state layers, the focus ring and
  the entrance. Please open `live-results-idle-prompt.html` with Theme on Light and Dark, and
  press "Show idle prompt".


# REQUIREMENT empty-tab line (.tab-empty)

[X] Resolved

## SHORT SUMMARY
Extract the empty-tab line (`<p class="tab-empty">`, `Tabs.emptyState()` in `tabs.js`, and its
rules in `tabs.css`) into `prototypes/POLL-CARD-MATERIAL3/EMPTY-TAB-LINE/`, without the header,
tab bar or footer, as the base for a Material 3 version. It is the last of the prerequisites in
the merge plan (`designDocs/024-high-level-requirements-MATERIAL3-MERGE.md`).

Found while reading:
- **One line per tab panel.** Each of the six panels in `index.html` is
  `<section class="tab-panel" data-panel="…"><div class="card-grid"></div><p class="tab-empty" hidden></p></section>`,
  so the line sits below the grid.
- **One function sets it.** `emptyState(name, text)` in `tabs.js` (lines 88–98) finds the panel
  by `panelOf(name)`. It shows the line with the text, or hides it when the text is empty. It
  reads nothing else.
- **Seven texts, from five files.**

  | Tab | Text | Source |
  |---|---|---|
  | Trending | "No polls are trending yet." | `trending.js` |
  | Newest | "No polls have been launched yet." | `newest.js` |
  | Private, Favorites | "Nothing here yet." | `tabs.js`, the personal delta tabs |
  | Live Results | "Press Live Results on a poll to watch it here." | `liveResults.js` |
  | Search | "Enter your search terms in the 'Search CrowdPoll' field above." | `searchTab.js` |
  | Search | "No polls match your search." | `searchTab.js` |
  | Search | "More results are not shown. Try more specific words." | `searchTab.js` |

  - The last Search text is the only one shown *with* cards, below a full grid.
- **The styles.** In `tabs.css` (lines 170–181), `.tab-empty` shares one rule with
  `.tab-notice`: a 13px muted line on `--paper-raised` with a 10px corner and a 16px bottom
  margin. FIX029 centres it on the Search tab only.
  - The `.card-grid` has no bottom margin, so under a full grid the line touches the last row
    of cards.
  - `HEADER-TAB-BAR/` already turned `.tab-notice` into a Material 3 snackbar. `.tab-empty` is the
    half of the rule still unstyled.
- **It can take focus.** `focusTabStart()` (`tabs.js`) and `focusAfterRemoval()`
  (`liveResults.js`) give it `tabIndex = -1` and focus it when a tab has no cards. It has no
  focus style of its own, so it shows the browser's default outline.

## REQUIREMENT DETAILS

Extract the html/css/js from the client-side code of the main CrowdPoll webapp, for the empty-tab line (.tab-empty).
  
This will allow us to create a prototype for the empty-tab line (.tab-empty), that uses the Material 3 appearance.  
We recently created a prototype for the Admin Poll Card, and grid layout Poll Card that uses the Material 3 appearance and we want to create a similar prototype for the empty-tab line (.tab-empty).
  
There is no need for the header, tab bar, footer.   
Remove any js files that are not needed for the elements described above.   
Please place the resulting files in:  
`prototypes/POLL-CARD-MATERIAL3/EMPTY-TAB-LINE`

## CLARIFICATIONS

1. How `emptyState()` is taken out of `tabs.js`
[X] Resolved
The function needs only `panelOf()`. `tabs.js` as a whole needs the session, `DeltaClient`, the
config fetch and the tab routes.

a. Copy `emptyState()` verbatim into `emptyTabLine.js`, with `panelOf` as a marked stand-in
Recommended
[X] Accepted
`emptyTabLine.js` holds `emptyState()` exactly as in `tabs.js`, checked line for line. Beside it
is `panelOf`, copied too (line 22) and marked "STAND-IN" only because it comes from another part
of the file. It exposes `window.Tabs = { emptyState }`, the name production's callers use. No
other script from `tabs.js` comes along. This is the pattern of `LIVE-RESULTS-IDLE-PROMPT/`.

b. No production script; the harness sets the text and `hidden` itself
[ ] Accepted
The page is static markup and CSS only. The line looks the same, but the prototype no longer
shows production's function, and the Material 3 step has nothing to mark edits on.

Other.
[ ] Accepted


2. Which tabs and texts the page shows
[X] Resolved
Seven texts on six panels. One is shown below a full grid, and the Search texts are centred.

a. All six panels, with a Tab picker and a Text picker
Recommended
[X] Accepted
The page holds `index.html`'s six panels as is, with only the chosen one shown (`hidden` on the
others, as production's tab switch does). A **Tab** picker chooses the panel, and a **Text**
picker lists that tab's production texts plus "(none)". The choice calls
`Tabs.emptyState(name, text)`.
- For "More results are not shown…", the Search grid holds six static placeholder cards, as in
  `TABS-MODAL/` and `LIVE-RESULTS-IDLE-PROMPT/`, so the line is seen below a full grid. Every other
  text shows on an empty grid, as in production.
- The Search tab shows the FIX029 centring through its real panel.

b. One panel, with a Text picker over all seven texts
[ ] Accepted
Simpler, but the Search centring and the line under a full grid are not shown.

Other.
[ ] Accepted


3. The CSS rule `.tab-empty` shares with `.tab-notice`
[X] Resolved
Production styles both with one grouped rule. `.tab-notice` is not part of this prototype, and in
`HEADER-TAB-BAR/` it is already a Material 3 snackbar.

a. Copy the rule verbatim, `.tab-notice` included, plus the FIX029 rule
Recommended
[X] Accepted
`empty-tab-line.css` holds `tabs.css` lines 170–181 exactly as written, so the copy can be
compared with production. The `.tab-notice` selector matches nothing on this page. The split
between the two is left to the Material 3 step and the merge.

b. Copy it with the selector narrowed to `.tab-empty`
[ ] Accepted
The prototype holds only what it uses, but the copy no longer matches production text for text.

Other.
[ ] Accepted


4. Showing the line with focus
[X] Resolved
Production focuses the line (`tabIndex = -1`) when a tab has no cards: at the start of a tab
and after the last Live Results card is removed. There is no focus style for it.

a. A **Focus line** button that does what production does
Recommended
[X] Accepted
The harness copies the three lines production uses: set `tabIndex = -1`, then `focus()`. The focus
appearance can then be judged, and designed in the Material 3 step. The line itself is unchanged.

b. Leave focus out of the prototype
[ ] Accepted
The prototype shows the line's look only. The focus appearance is left to the merge.

Other.
[ ] Accepted

## RECOMMENDATION
[X] Resolved

1. `emptyState()` verbatim in `index.html`'s six panels, with Tab, Text and Focus controls
Recommended
[X] Accepted
This builds what clarifications 1a, 2a, 3a and 4a chose, in the shape of
`LIVE-RESULTS-IDLE-PROMPT/`. Nothing under `src/` changes.

Files in `prototypes/POLL-CARD-MATERIAL3/EMPTY-TAB-LINE/`
- `empty-tab-line.html`:
  - `index.html`'s shell (`.page-decor`, `.page`, `.container`, `.layout`), without the site
    header, the tab bar or the footer.
  - Stylesheets, in production's order: `../tabs.css`, `../site.css`, then `empty-tab-line.css`.
    `../pollCard.css` is left out, because no card is drawn. Fonts: production's link plus Roboto.
  - A prototype bar with **Theme**, **Tab** (Trending, Newest, Private, Favorites, Live Results,
    Search), **Text**, and a **Focus line** button.
  - `index.html`'s `<main class="all-markets">` with its six panels as is (lines 69–74), each
    `<section class="tab-panel" data-panel="…"><div class="card-grid"></div><p class="tab-empty" hidden></p></section>`.
    Only Trending lacks `hidden` at load, as in production.
  - Static placeholder card styles in an inline `<style>`, as in `LIVE-RESULTS-IDLE-PROMPT/`. Not
    production markup.
  - Scripts: `emptyTabLine.js`, `harness.js`. No `app.js`, `tabs.js`, `deltaClient.js`, tab
    scripts, `pollCard.js` or fixtures.
- `emptyTabLine.js` (1a), one IIFE:
  - `emptyState(name, text)`, copied from `src/public/tabs.js` (lines 88–98) and checked line for
    line against it.
  - Beside it, `panelOf` (line 22), copied as is and marked "STAND-IN" because it comes from
    another part of `tabs.js`.
  - It exposes `window.Tabs = { emptyState: emptyState }`.
- `empty-tab-line.css` (3a): copied from `src/public/tabs.css` and checked against it:
  - lines 170–181: the grouped `.tab-notice, .tab-empty` rule, and the FIX029 Search centring
    rule with its comment;
  - line 183: `.tab-panel[hidden]`, which the shared `../tabs.css` lacks.
- `harness.js`:
  - **Tab** shows the chosen panel and sets `hidden` on the other five, as production's tab switch
    does.
  - **Text** lists that tab's production texts and "(none)" (2a):
    - Trending: "No polls are trending yet."
    - Newest: "No polls have been launched yet."
    - Private and Favorites: "Nothing here yet."
    - Live Results: "Press Live Results on a poll to watch it here."
    - Search: "Enter your search terms in the 'Search CrowdPoll' field above.", "No polls match
      your search.", and "More results are not shown. Try more specific words."
  - A choice calls `Tabs.emptyState(tab, text)`. "(none)" passes `""`, which hides the line.
  - For "More results are not shown…", the Search grid gets six static placeholder cards, each
    `aria-hidden`. Every other choice empties the grid, as production's tabs are when the line
    shows.
  - **Focus line** (4a) does what `focusTabStart()` and `focusAfterRemoval()` do: it finds the
    shown panel's `.tab-empty`, sets `tabIndex = -1` and calls `focus()`. While the line is
    hidden, nothing happens, as in production.
  - Theme sets `data-theme` on `<html>`, ready for the Material 3 step. Theme, Tab and Text are
    kept in the query string (`?theme=…&tab=…&text=…`) where the browser allows.
  - The page opens on Trending with "No polls are trending yet.".

Checks
- `node --check` on both scripts. `emptyState()`, `panelOf` and the copied CSS lines are compared
  with `src/public` (CRLF stripped), and the brace check passes.
- jsdom:
  - Each Tab choice shows one panel and hides the other five.
  - Each Text choice puts that text in the shown panel's line and un-hides it. "(none)" hides it.
  - "More results…" puts six placeholders above the line. Other choices leave the grid empty.
  - **Focus line** gives the line `tabindex="-1"` and focus, and does nothing while it is hidden.
  - `?theme=dark` applies, and there are no script errors.
- Not checkable without a browser: the layout, the Search centring, and the default focus outline.

Pros:
- The line is set by production's own function and styled by its own rules, in production's own
  panels, with every production text.
- The one stand-in is a copied line, marked.
- The full-grid case and the focus case, the two details the Material 3 step must design, can both
  be seen.

Cons:
- `emptyTabLine.js` copies part of a file, so it is checked by comparing the copied text rather
  than the whole file.
- `.tab-notice` is carried in the copied rule though nothing uses it here (the trade-off accepted
  in 3a).
- The placeholders are not real cards.

2. One panel and a static line, with no production script
[ ] Accepted
Only the Trending panel, with the harness writing each text into `.tab-empty` and toggling
`hidden` directly. The CSS is the same copy.

Pros:
- Fewer moving parts, and no copied JavaScript.

Cons:
- It goes against clarifications 1a and 2a. The Search centring and the full-grid case are not
  shown, and the Material 3 step has no copied function to mark edits on.

## NOTES
Implemented recommendation 1, with clarifications 1a, 2a, 3a and 4a. Open
`EMPTY-TAB-LINE/empty-tab-line.html` directly; no server is needed.

Files in `EMPTY-TAB-LINE/`
- `empty-tab-line.html`:
  - `index.html`'s shell, without the site header, tab bar or footer.
  - Stylesheets: `../tabs.css`, `../site.css`, `empty-tab-line.css`. Fonts: production's link
    plus Roboto.
  - A prototype bar with Theme, Tab, Text and **Focus line**, and a note line.
  - `index.html`'s `<main class="all-markets">` holding its six panels, identical to
    `src/public/index.html` lines 69–74.
  - The placeholder card styles are in an inline `<style>`, as in `LIVE-RESULTS-IDLE-PROMPT/`.
  - Scripts: `emptyTabLine.js`, `harness.js`.
- `emptyTabLine.js`:
  - `emptyState()` (`src/public/tabs.js` lines 88–98), copied verbatim.
  - `panelOf` (line 22), copied as is and marked "STAND-IN".
  - It exposes `window.Tabs = { emptyState }`.
- `empty-tab-line.css`: `src/public/tabs.css` lines 170–183, copied verbatim under a header
  comment. These are the grouped `.tab-notice, .tab-empty` rule, the FIX029 Search centring with
  its comment, and `.tab-panel[hidden]`.
- `harness.js`:
  - **Tab** shows one panel and hides the other five.
  - **Text** lists that tab's production texts plus "(none)", and calls
    `Tabs.emptyState(tab, text)`.
  - "More results are not shown…" puts six `aria-hidden` placeholder cards in the Search grid.
    Every other choice empties the grid.
  - **Focus line** sets `tabIndex = -1` and focuses the shown line. While the line is hidden, it
    only says so in the note line.
  - Theme, Tab and Text (by index) are read from the query string, and written back with
    `replaceState` where allowed.
  - The page opens on Trending with "No polls are trending yet.".

Checked (jsdom, no script errors)
- `emptyState()`, `panelOf`, the CSS lines and the six panels are identical to `src/public` (CRLF
  stripped). `node --check` passes on both scripts. `css-tree` parses the CSS with no errors, and
  its braces balance.
- Each of the seven texts appears once in `src/public/*.js`, exactly as the harness holds it.
- For every tab and text:
  - Only the chosen panel shows, and the line has the text and is not hidden. "(none)" hides it.
  - Placeholders appear only with "More results…" (six).
  - **Focus line** focuses the shown line with `tabindex="-1"`, and does nothing while it is
    hidden.
- `?theme=dark&tab=search&text=2` opens dark, on Search, with "More results…" below six
  placeholders.
- Not checked in a browser: the layout, the Search centring, and the browser's default focus
  outline on the line.

Found while reading, production behaviour shown as is (for the Material 3 step)
- The line has no focus style of its own, so the browser's default outline shows when production
  focuses it.
- `.card-grid` has no bottom margin, so "More results are not shown…" touches the last row of
  cards.
- `.tab-empty` still shares its rule with `.tab-notice`, which `HEADER-TAB-BAR/` restyles as a
  snackbar.
- Its 13px Inter text, 10px corner and `--paper-raised` fill match the other pre-M3 notices.


# REQUIREMENT Use Material 3 For empty-tab line (.tab-empty)

[X] Resolved

## SHORT SUMMARY
Give the `EMPTY-TAB-LINE/` prototype the Material 3 treatment, consistent with the approved Poll
Card and with the Material 3 idle prompt and `Tabs.modal`. The requirement text says "the
prototype Create Account Dialog extracted in the # REQUIREMENT empty-tab line (.tab-empty)". That
is read as the empty-tab line.

Found while reading:
- **M3 has no empty-state component.** Its guidance shows an empty screen as supporting text,
  often centred and sometimes with an icon, on the page's own surface, not in a container. The
  line is not interactive, so a card or a filled box makes it look like content or a control.
- **The shared layer already restyles part of it.** `../pollCard-m3.css` remaps `--paper-raised`
  to `surface-container-low` and `--muted` to `on-surface-variant` in dark, so the copied rule
  follows Theme today, but still in 13px Inter with a 10px corner.
- **The rule is shared with `.tab-notice`.** `HEADER-TAB-BAR/` already made `.tab-notice` an M3
  snackbar. The Material 3 layer here styles `.tab-empty` alone, and the merge splits the grouped
  production rule.
- **Two details from the extraction:**
  - Under a full grid, "More results are not shown…" touches the last row of cards (the grid has
    no bottom margin).
  - Production focuses the line (`tabIndex = -1`), and it has no focus style.
- **Everything is CSS.** None of the choices below needs an edit to the copied `emptyState()`,
  except an icon (clarification 4b).

## REQUIREMENT DETAILS

Apply the same Material 3 design principles, accepted recommendations and accepted clarifications, in the Requirements above, when designing and implementing the the prototype Create Account Dialog extracted in the **# REQUIREMENT empty-tab line (.tab-empty),** above.  
Ensure consistency with the previously approved Poll Card.   

## CLARIFICATIONS

1. The line's form
[X] Resolved
Production shows a filled, rounded box. M3 has no empty-state component.

a. Plain supporting text on the page, no container
Recommended
[X] Accepted
Body Medium (Roboto, 14/20) in `on-surface-variant`, with no fill, no border and no corner, and
16px of space above and below. This is how M3 shows an empty screen. It cannot be mistaken for a
card or a button, and it reads as a quiet note beside the outlined Poll Cards and the outlined idle
prompt.

b. A tonal box, as production
[ ] Accepted
Production's look in M3 terms: `surface-container-low` fill, a 12px corner (medium), 12px 16px
padding, Body Medium in `on-surface-variant`. The least change. Beside the cards, it can read as a
small card.

c. An outlined card, as the idle prompt
[ ] Accepted
`surface-container-low` with an `outline-variant` hairline and a 12px corner, as the Material 3
idle prompt. Most consistent with the prompt, but it gives a message with nothing to act on the
look of something that holds content.

Other.
[ ] Accepted


2. Alignment
[X] Resolved
Production starts the line at the left on every tab, and centres it on Search only (FIX029).

a. Centre it on every tab
Recommended
[X] Accepted
M3's empty states are centred. Every tab then shows its empty line the same way, and the FIX029
rule's effect becomes the rule for all tabs. CSS only.

b. Keep production's alignment
[ ] Accepted
Left on five tabs, centred on Search, as today.

Other.
[ ] Accepted


3. The line under a full grid
[X] Resolved
"More results are not shown. Try more specific words." is the only text shown below cards, and it
touches the last row.

a. Add the grid's own gap above the line when the grid has cards
Recommended
[X] Accepted
`.card-grid:not(:empty) + .tab-empty{ margin-top:18px; }`, the same 18px as between cards. The
other texts, shown on an empty grid, are unaffected. CSS only.

b. Leave it as production
[ ] Accepted
The line stays against the cards. This is less noticeable if 1b or 1c's box is chosen, and is
plain to see with 1a.

Other.
[ ] Accepted


4. An icon
[X] Resolved
M3 empty states often carry an icon above the text.

a. No icon
Recommended
[X] Accepted
The line stays one line of text. It sits under the tab bar, whose selected tab already shows the
same tab's icon a few pixels above. No change to `emptyState()`.

b. The tab's own icon above the text
[ ] Accepted
A 24px icon in `on-surface-variant`, the tab's icon from the tab bar. This needs the icons in the
prototype and an "M3:" edit to `emptyState()` (or markup per panel) to place them, and the merge
must carry them.

Other.
[ ] Accepted


5. Focus
[X] Resolved
Production focuses the line when a tab has no cards, and the browser draws its default outline.

a. The M3 focus ring on `:focus-visible` only
Recommended
[X] Accepted
`.tab-empty:focus-visible` gets the 3px `secondary` ring with a 2px offset and a 12px corner, as the
Poll Card's buttons. `.tab-empty:focus:not(:focus-visible)` gets no outline. A keyboard user who
removes the last Live Results card sees where focus went. A mouse user sees no ring around text
they cannot act on. CSS only.

b. No focus ring at all
[ ] Accepted
The line is not a control, so it never shows a ring. Screen readers still announce it. A keyboard
user cannot see where focus went.

Other.
[ ] Accepted

## RECOMMENDATION
[X] Resolved

1. A line-only Material 3 stylesheet, with no script change
Recommended
[X] Accepted
This builds what the clarifications chose (1a, 2a, 3a, 4a, 5a), in the shape of the other
Material 3 prototypes. `empty-tab-line.css` and `emptyTabLine.js` stay copies of production, and
everything Material 3 is in one new stylesheet. No script changes, because nothing chosen needs
one (4a: no icon).

- `EMPTY-TAB-LINE/empty-tab-line.html`:
  - Link `../pollCard-m3.css` after `../site.css`, for the roles, the type scale, the shape token
    and the dark restatement of production's tokens. Then link `empty-tab-line.css`, then the new
    `empty-tab-line-m3.css`.
  - The page comment names the requirement. The placeholders follow Theme through the production
    tokens, as in the other prototypes.
- `EMPTY-TAB-LINE/empty-tab-line-m3.css`, in sections:
  1. **Supporting text (1a).** `.tab-empty` loses the box: `background:transparent`, no border,
     and `margin:0`. It has 16px of padding on every side, which gives the 16px above and below
     and keeps the focus ring off the text. The corner is 12px (`--md-sys-shape-corner-medium`),
     seen only in the focus ring. The text is Body Medium (Roboto 14/20, 0.25px tracking) in
     `on-surface-variant`.
  2. **Alignment (2a).** `text-align:center` on every tab. The copied FIX029 rule then changes
     nothing and is left in the copy. In the merge, it can be deleted.
  3. **Under a full grid (3a).** `.card-grid:not(:empty) + .tab-empty{ margin-top:18px; }`. With the
     16px padding, the text sits 34px below the last row of cards: the gap between rows, then the
     line's own space. Production's grid markup has no whitespace inside, so `:empty` holds
     whenever no card is mounted.
  4. **Focus (5a).** `.tab-empty:focus-visible` gets the 3px `secondary` outline with a 2px offset,
     as on the Poll Card's buttons, following the 12px corner.
     `.tab-empty:focus:not(:focus-visible)` gets `outline:none`.
  - `.tab-notice` is not touched. The grouped production rule still dresses it, and
    `HEADER-TAB-BAR/` holds its Material 3 form.
  - Specificity: `.tab-empty` (0,1,0) matches the copied rule and wins by loading later. The
    other selectors are heavier.

Checks
- `css-tree` parses `empty-tab-line-m3.css`, and the brace check passes. `empty-tab-line.css` and
  `emptyTabLine.js` are still identical to production.
- jsdom:
  - Every tab and text still shows and hides as before.
  - "More results…" with placeholders matches `.card-grid:not(:empty) + .tab-empty`, and the
    empty-grid texts do not.
  - **Focus line** still focuses the line.
  - `?theme=dark` applies, and there are no script errors.
- Not checkable without a browser: the look in both schemes, the centring, the 34px gap, and
  whether `:focus-visible` shows after **Focus line**. Chrome shows the ring on script focus that
  follows a key press, so press **Focus line** with Enter or Space to see it, and with the mouse to
  see none.

Pros:
- M3's empty state: quiet supporting text that cannot be mistaken for a card or a control,
  on the shared roles and type scale.
- CSS only. The merge carries one small stylesheet and the deletion of the FIX029 rule. There is
  no script edit.
- Keyboard users see where focus lands. Mouse users see nothing extra.

Cons:
- `../pollCard-m3.css` is loaded for its tokens, and so are its card rules, which match nothing
  on this page.
- The merge must split production's grouped `.tab-notice, .tab-empty` rule, as `HEADER-TAB-BAR/`
  already requires.

2. Restyle the copied CSS in place
[ ] Accepted
The same rules as recommendation 1, written into `empty-tab-line.css` instead of a separate layer:
the grouped rule is split, `.tab-empty` gets the M3 values, and the FIX029 rule is removed.

Pros:
- One stylesheet fewer, and the prototype already shows the split the merge needs.

Cons:
- The copy of production is lost, so the merge cannot compare against it.
- It breaks the pattern of the other Material 3 prototypes, where the copy stays untouched.

## NOTES
Implemented recommendation 1, with clarifications 1a, 2a, 3a, 4a and 5a. Open
`EMPTY-TAB-LINE/empty-tab-line.html` directly; no server is needed.

Files in `EMPTY-TAB-LINE/`
- `empty-tab-line.html`: links `../pollCard-m3.css` after `../site.css`, then
  `empty-tab-line.css` (unchanged, still production's), then the new `empty-tab-line-m3.css`. The
  page comment names the requirement.
- `empty-tab-line-m3.css` (new), in four sections:
  1. `.tab-empty` as supporting text: no fill, border or margin, 16px padding, a 12px corner (seen
     only in the focus ring), and Body Medium (Roboto 14/20, 0.25px) in `on-surface-variant`.
  2. `text-align:center` on every tab.
  3. `.card-grid:not(:empty) + .tab-empty{ margin-top:18px; }`, so the text sits 34px below a
     full grid.
  4. The 3px `secondary` outline with a 2px offset on `:focus-visible`, and none on
     `:focus:not(:focus-visible)`.
  - `.tab-notice` is not touched.
- `emptyTabLine.js` and `harness.js`: unchanged.

For the merge
- Split production's grouped `.tab-notice, .tab-empty` rule in `tabs.css`. `.tab-empty` takes this
  layer's values, and `.tab-notice` takes `HEADER-TAB-BAR/`'s snackbar.
- Delete the FIX029 rule (`.tab-panel[data-panel="search"] .tab-empty{ text-align:center; }`), now
  covered by the centring on every tab.
- `:empty` depends on `.card-grid` holding no whitespace text. `index.html` writes it as
  `<div class="card-grid"></div>`, and the grid code only adds and removes cards.
- No script change: `emptyState()`, `focusTabStart()` and `focusAfterRemoval()` stay as they are.

Checks run
- `css-tree` parses `empty-tab-line-m3.css` with no errors, and its braces balance (5/5).
- `empty-tab-line.css` and `emptyState()` are still identical to `src/public` (CRLF stripped).
- Specificity: `.tab-empty` (0,1,0) matches the copied rule and wins by loading later. The
  full-grid rule (0,3,0) and the focus rules (0,2,0 and 0,3,0) outrank it.
- jsdom, with Theme on System and with `?theme=dark&tab=search&text=2`:
  - All five stylesheets load, and the line computes as centred, with 16px padding, a transparent
    background and no bottom margin.
  - In all 14 tab and text combinations, the full-grid rule matches exactly when placeholders are
    mounted, which is only with "More results…". **Focus line** focuses every shown line.
  - There are no script errors.
- Not checkable without a browser: the look in both schemes, the 34px gap, and the focus ring.
  Please open `empty-tab-line.html` with Theme on Light and Dark. Press **Focus line** with Enter
  or Space to see the ring, and click it with the mouse to see none.


# REQUIREMENT Question: Everything Prototyped in Material3?

[X] Resolved

## SHORT SUMMARY
Review every client-side surface of the webapp against the Material 3 prototypes, and report
whether each is prototyped in Material 3. If everything is, update
`designDocs/024-high-level-requirements-MATERIAL3-MERGE.md` to say so.

Found in a first pass:
- **Covered:** every page and state that 024 restyles has a prototype with a Material 3 layer.
  The pages in scope are `index.html`, `profile.html`, `login.html`, `create-account.html` and
  `not-authorized.html`, plus the header on the admin pages.

  | Surface | Prototype | M3 layer |
  |---|---|---|
  | Poll Card, front and back | `poll-card.html` | `pollCard-m3.css`, `pollCard-m3.js` |
  | Maximized view | `MAXIMIZED-POLL-CARD/` | section 8 of `pollCard-m3.css` |
  | Header, tab bar, search, avatar menu, tab notice, cookie banner | `HEADER-TAB-BAR/` | `header-tab-bar-m3.css`, `.js` |
  | Profile, Login, Create Account, Not Authorized | `PROFILE-EDITOR/`, `LOGIN-DIALOG/`, `CREATE-ACCOUNT-DIALOG/`, `NOT-AUTHORIZED-DIALOG/` | `card-shell-m3.css`, `profile-editor-m3.css` |
  | `Tabs.modal` | `TABS-MODAL/` | `tabs-modal-m3.css`, `.js` |
  | Live Results idle prompt | `LIVE-RESULTS-IDLE-PROMPT/` | `live-idle-prompt-m3.css`, `.js` |
  | Empty-tab line | `EMPTY-TAB-LINE/` | `empty-tab-line-m3.css` |

  - Every class that production's pages and scripts create is styled by an M3 layer, except
    layout wrappers (`.page`, `.container`, `.card-flip`, …) and the excluded admin content.
    This was checked by a class-by-class search.
  - There are no native `alert`, `confirm` or `prompt` dialogs. There are no native form controls
    outside the admin pages.
- **Not covered: tooltips.** Ten or more controls use the browser's native `title` tooltip:
  - Refresh, Search, Clear Search Terms;
  - the card's Favorites, Maximize and Live Results controls;
  - each result row's "label — pct%";
  - a guest's disabled tabs ("Sign in to use this tab").

  M3 gives icon buttons a *plain tooltip*. No requirement has decided on one.
- **Not verified in a browser.** Each prototype's NOTES ends with checks only a browser can make:
  the look in both schemes, state layers, focus rings and motion. This sandbox has no browser, and
  the file does not record whether the developers made them.
- **The merge plan is out of date.**
  - Its table lists four prototypes. It does not list Login, Create Account, Not Authorized,
    `Tabs.modal`, the idle prompt or the empty-tab line, nor their layers.
  - It still lists them as prerequisites to build.
  - Its file lists lack the "M3:" edits to `modal()` in `tabs.js` and `showIdlePrompt()` in
    `liveResults.js`, the FIX029 deletion and the `.tab-notice, .tab-empty` split.
  - Step 4 asks to carve `card-shell-m3.css` out of the profile layer, which the prototypes have
    already done.
- Excluded by the plan, and not reviewed: the admin list and results pages, and the Poll Editing
  Card.

## REQUIREMENT DETAILS

The deliverable for this requirement is the results of a full review and verification that all components and interactions have been prototyped according to the Material3 design guidelines.  

If all components have been prototyped according to Material3 guidelines, the file `designDocs\024-high-level-requirements-MATERIAL3-MERGE.md` should be updated to reflect this compliance. 

## CLARIFICATIONS

1. What counts as verified
[X] Resolved
A full review can check code, structure and behaviour here. It cannot see the pages.

a. A static and scripted review here, plus a browser checklist for the developers
Recommended
[X] Accepted
Here:
- map every production page, script and class to a prototype and its M3 layer;
- re-run each prototype's recorded checks (css-tree, the copies against `src/public`, jsdom
  behaviour);
- confirm that each layer uses only the shared roles, type scale, shape and state tokens.

The browser checks from every prototype's NOTES are gathered into one checklist in the report, for
the developers to tick. Compliance is stated as "verified in code; the look is pending the
checklist".

b. The same, and the plan is not updated until the developers confirm the browser checklist
[ ] Accepted
The doc is updated only after a later instruction says the checklist passed.

Other.
[ ] Accepted


2. Tooltips
[X] Resolved
Ten or more controls show the browser's native `title` tooltip. M3 specifies plain tooltips for
icon buttons, and no requirement has decided on them.

a. Prototype M3 plain tooltips as one more requirement before the merge
[X] Accepted
Add a "Use Material 3 For tooltips" requirement:
- a plain tooltip (`inverse-surface`, Body Small, 4px corner) on hover and focus for the icon
  buttons;
- `title` removed where it would show a second tooltip.

The review then reports one remaining gap, and the plan lists that requirement as the last
prerequisite.

b. Keep native tooltips, and record them as an exclusion in the plan
Recommended
[ ] Accepted
Native tooltips are browser chrome, not page components. Every icon control already has an
`aria-label`. The plan's Exclusions gain "M3 plain tooltips; the native `title` tooltip stays".
The review can then report everything in scope as prototyped. A later feature can add them.

Other.
[ ] Accepted


3. Where the review is recorded
[X] Resolved
The deliverable is the review's results.

a. Full results in this requirement's NOTES, and a summary section in the plan
Recommended
[X] Accepted
NOTES holds the surface-by-surface table, the checks run and the browser checklist. The plan
gains a short "Material 3 compliance review" section that states the result and points to the
NOTES. This matches how every other decision is recorded.

b. A separate file, `designDocs/024-material3-compliance-review.md`
[ ] Accepted
The full report in its own document, linked from the plan. The plan stays shorter, and the
report is easy to find by name.

Other.
[ ] Accepted


4. How far the plan update goes
[X] Resolved
Besides the compliance statement, the plan is out of date in several places.

a. Bring the plan up to date with every prototype
Recommended
[X] Accepted
- The prototype table gains Login, Create Account, Not Authorized, `Tabs.modal`, the idle
  prompt and the empty-tab line, with their layers and the production changes each needs.
- Prerequisites is marked done.
- Step 2 gets the details:
  - the `modal()` and `showIdlePrompt()` "M3:" edits;
  - the ripple registrations for OK, Cancel and Yes;
  - splitting `.tab-notice, .tab-empty`;
  - deleting FIX029.
- Step 4 says `card-shell-m3.css` already exists.
- "Changed scripts", "New files" and the tests gain what those edits imply.
- Nothing else in the plan changes.

b. Add the compliance statement only
[ ] Accepted
The rest is left for `/speckit-mdd-architecture` to reconcile from `iterative-requirements.md`.

Other.
[ ] Accepted

## RECOMMENDATION
[X] Resolved

1. Review here, add the tooltips requirement, and bring the plan up to date
Recommended
[ ] Accepted
This builds what clarifications 1a, 2a, 3a and 4a chose. No prototype or `src/` file changes.

The review (1a), recorded in this requirement's NOTES (3a):
- **Surface map.** A table of every page in `src/public` and every UI it builds, by script, each
  with its prototype, M3 layer and production edits. Excluded surfaces are listed as excluded:
  the admin list and results pages' content, and the Poll Editing Card.
- **Class coverage.** Every class that the in-scope pages and scripts create is searched for in
  the M3 layers. The result lists the classes no layer styles, with the reason each is fine
  (layout wrappers, styled through a parent selector) or a gap.
- **Re-run checks.** For every prototype:
  - its copies of production files are compared with `src/public`, CRLF stripped;
  - `css-tree` parses every M3 layer, and the brace check passes;
  - the page loads in jsdom with no script errors, in light and `?theme=dark`.
- **Token discipline.** Each M3 layer is searched for colours, font sizes and corners written
  as literals instead of `--md-sys-*` tokens. Each one found is listed as intended (for example,
  the scrim's black) or as a gap.
- **Native UI.** The pages are searched for native dialogs, native form controls and `title`
  tooltips.
- **Browser checklist.** The "not checkable without a browser" items from every prototype's
  NOTES are gathered, by prototype, as checkboxes for the developers.
- **Result.** "Everything in scope is prototyped in Material 3 and verified in code, except
  tooltips (the new requirement below). The look is pending the browser checklist."

The tooltips requirement (2a):
- A new `# REQUIREMENT Use Material 3 For tooltips` is added at the end of this file, with no
  Resolved line, so **next requirement** picks it up.
- Its REQUIREMENT DETAILS list the controls that show a `title` tooltip today and ask for M3
  plain tooltips on them in the existing prototypes, in the style of the other requirements.
- It is not designed here.

The plan, `designDocs/024-high-level-requirements-MATERIAL3-MERGE.md` (3a, 4a):
- **What the prototypes are.** The table gains a row each for Login, Create Account and Not
  Authorized (on `card-shell-m3.css`, no script change), `Tabs.modal`, the Live Results idle
  prompt and the empty-tab line. Each row gives its layer files and its production changes:
  - `Tabs.modal`: two "M3:" edits to `modal()` in `tabs.js`;
  - the idle prompt: the "M3:" edits to `IDLE_PROMPT` and `showIdlePrompt()` in
    `liveResults.js`;
  - the empty-tab line: CSS only, with the `.tab-notice, .tab-empty` split and the FIX029
    deletion.
- **Prerequisites.**
  - Marked done for the six surfaces, with a pointer to their requirements.
  - The tooltips requirement is listed as the one prerequisite still open.
- **Step 2.**
  - "Port the prerequisite designs" is replaced by the files and edits above.
  - It adds the ripple registrations for OK, Cancel and Yes, and the new client tests:
    - the dialog's name and Tab trap;
    - the idle prompt's text, name and focus;
    - the empty line's focus ring is CSS, so it needs no test.
- **Step 4.**
  - `card-shell-m3.css` exists in the prototypes and is ported as is, with
    `profile-editor-m3.css` beside it.
  - The page list includes the three dialogs' sections 9–12.
- **Effect on the current implementation.**
  - "New files" gains `tabs-modal-m3.css`, `live-idle-prompt-m3.css` and
    `empty-tab-line-m3.css`, or their rules folded into `header-tab-bar-m3.css`, as Step 2
    decides.
  - "Changed scripts" gains `tabs.js` (`modal()`) and `liveResults.js` (`showIdlePrompt()`).
  - "Changed styles" gains `tabs.css` (the split and the FIX029 deletion).
- **Functional Requirements.** The exceptions gain:
  - the idle prompt's wording, its focus on Yes, and no `aria-modal`;
  - `Tabs.modal`'s accessible name and Tab trap.
- **A new section, "Material 3 compliance review".** It states the result above, and points to
  this requirement's NOTES for the surface map and the browser checklist.
- Nothing else in the plan changes.

Checks
- Every claim in the plan's new text is checked against the prototype files and their NOTES.
- The plan's Markdown is re-read for broken tables and lists.

Pros:
- One place states what is prototyped, what was checked and what is left. The developers get a
  single browser checklist instead of eleven NOTES sections.
- The plan matches the prototypes before `/speckit-specify` reads it.
- The tooltips gap becomes an ordinary requirement in this file.

Cons:
- The plan states compliance "in code" only, until the developers tick the browser checklist.
- The plan will need one more small update when the tooltips requirement is resolved.

2. Review and add the tooltips requirement now; update the plan after tooltips
[X] Accepted
The review and the new requirement as in recommendation 1. The plan is not touched until the
tooltips requirement is resolved. It then gets one update, with an unqualified compliance
statement.

Pros:
- The plan changes once, and states full compliance when it does.

Cons:
- The plan stays out of date meanwhile, which goes against 4a.

## NOTES
Implemented recommendation 2, with clarifications 1a, 2a and 3a.
- **The plan is not changed yet.** Recommendation 2 defers the update of
  `designDocs/024-high-level-requirements-MATERIAL3-MERGE.md` until the new tooltips requirement
  is resolved. That one update then covers clarification 4a's list (in recommendation 1) and adds
  the "Material 3 compliance review" section (3a).
- **The new requirement** is `# REQUIREMENT Use Material 3 For tooltips`, added at the end of this
  file.
- No prototype or `src/` file was changed.

### Result
Everything in 024's scope is prototyped in Material 3 and verified in code, **except tooltips**.
The look of every prototype is still pending the browser checklist below.

### Surface map
| Production surface | Built by | Prototype | M3 layer | Production edits the merge carries |
|---|---|---|---|---|
| Poll Card, front and back | `pollCard.js`, `pollCard.css`, `site.css` | `poll-card.html` | `pollCard-m3.css`, `pollCard-m3.js` | `pollCard.js`: `is-multi`, and `BAR_COLORS_DARK` with the bar custom properties |
| Maximized view | `tabs.js`, `index.html` template, `pollCard.js` | `MAXIMIZED-POLL-CARD/single-card.html` (`#back` for the back) | section 8 of `pollCard-m3.css` | none beyond the card's |
| Header: brand, search, Create Poll, Log In / Create Account, user name, avatar menu | `app.js` | `HEADER-TAB-BAR/` | `header-tab-bar-m3.css`, `header-tab-bar-m3.js` | the avatar button (plan Step 2) |
| Tab bar, Refresh, disabled tabs | `index.html`, `tabs.js`, `tabs.css` | `HEADER-TAB-BAR/` | the same | `aria-disabled` tabs (plan Step 2) |
| Tab notice | `tabs.js` `notice()` | `HEADER-TAB-BAR/` | the same (snackbar) | the close control and `role="status"` |
| Cookie banner | `app.js` | `HEADER-TAB-BAR/` | the same (snackbar) | the banner offset |
| Profile | `profile.html`, `cardShell.js`, `profileCard.js` | `PROFILE-EDITOR/` | `card-shell-m3.css`, `profile-editor-m3.css` | the "User name saved" snackbar |
| Login | `login.html`, `loginCard.js` | `LOGIN-DIALOG/` | `card-shell-m3.css` (sections 9–11) | none |
| Create Account | `create-account.html`, `createAccountCard.js` | `CREATE-ACCOUNT-DIALOG/` | `card-shell-m3.css` | none |
| Not Authorized | `not-authorized.html`, `notAuthorizedCard.js` | `NOT-AUTHORIZED-DIALOG/` | `card-shell-m3.css` (section 12) | none |
| `Tabs.modal` | `tabs.js` `modal()` | `TABS-MODAL/` | `tabs-modal-m3.css`, `tabs-modal-m3.js` | two "M3:" edits to `modal()` |
| Live Results idle prompt | `liveResults.js` `showIdlePrompt()` | `LIVE-RESULTS-IDLE-PROMPT/` | `live-idle-prompt-m3.css`, `live-idle-prompt-m3.js` | "M3:" edits to `IDLE_PROMPT` and `showIdlePrompt()` |
| Empty-tab line | `index.html`, `tabs.js` `emptyState()` | `EMPTY-TAB-LINE/` | `empty-tab-line-m3.css` | CSS only: split `.tab-notice, .tab-empty`, delete FIX029 |
| Admin pages' header | `app.js` | `HEADER-TAB-BAR/` | `header-tab-bar-m3.css` | as the header |
| Excluded | `admin.html`, `admin-results.html` content, the Poll Editing Card | — | — | a later feature |

`trending.js`, `newest.js`, `searchTab.js`, `voteClient.js` and `deltaClient.js` build no UI of
their own. They fill the grids with cards and set the empty-tab line's text.

### Checks run
- **Class coverage.** Every class created by the five in-scope pages and their scripts was
  searched for in the seven M3 layers. The ones no layer names are fine:
  - layout wrappers with no colour, type or shape: `.page`, `.container`, `.layout`,
    `.all-markets`, `.tab-panel`, `.card-flip`, `.question-row`, `.question-wrap`,
    `.bar-scroll-*`, `.card-foot*`, `.actions`, `.header-nav`, `.header-actions`, `.profile-page`;
  - styled through a parent selector: `.back-btn`, `.vote-btn` and `.submit-vote-btn`
    (`.icon-btn`, `.btn-vote`), `.bookmark-*` (`.bookmark-btn`), `.arrow-row-up` and
    `.arrow-row-down` (`.arrow-row`), and `.live-idle-cancel` and `.live-idle-yes`
    (`.live-idle-prompt .tab-refresh`);
  - token-driven borders that follow the scheme through the restated production tokens:
    `.card-front`, `.card-back`;
  - `.result-fill`, which is 022's fill colour, excluded by the plan.
- **No native UI** outside the admin pages: no `alert`, `confirm` or `prompt`, and no native
  checkbox, radio, select or textarea. The remaining native UI is the `title` tooltip (below).
- **Copies against production** (CRLF stripped):
  - `pollCard.css`, `cardShell.js` and the four card scripts are identical to `src/public`.
  - `pollCard.js` differs only by its three "M3:" blocks.
  - In every extracted stylesheet, each rule (268 rules over nine files) is found verbatim in
    production. There is one exception: the two rules of the `tabs.css` 640px block, which
    production's own comment bug drops when it is parsed (plan Step 2 fix).
- **Layers.** All seven M3 layers parse with `css-tree` with no errors, and their braces balance.
- **Pages.** All ten prototype pages load in jsdom with every stylesheet and no script errors,
  in light and in dark. The three older harnesses take dark from their Theme picker only, not from
  `?theme=`.
- **Tokens.** Colour, type and shape come from `--md-sys-*` tokens throughout. These literals
  remain, and each is an M3 value:
  - Corners: `50%` (radio and state-layer circles), `2px` (the checkbox), `0` (underlined fields
    and the tab bar), `3px 3px 0 0` (the tab indicator), and the scrim's `rgb(0 0 0 / 0.32)`.
  - Font sizes: `header-tab-bar-m3.css` (eleven) and `card-shell-m3.css` (one) write 14px and
    16px as literals, commented "Body Medium" or "Label Large", instead of the
    `--md-sys-typescale-*` variables. The values are right. **For the merge:** Step 1's
    `m3-tokens.css` should replace them with the variables.

### Gap: tooltips (the new requirement)
The browser's native `title` tooltip is the only non-M3 UI left in scope:

| Control | Text | Set in |
|---|---|---|
| Refresh | "Refresh" | `index.html` |
| Search | "Search" | `app.js` |
| Clear search | "Clear Search Terms" | `app.js` |
| Favorites | "Add to Favorites" / "Remove from Favorites" | `pollCard.js` |
| Maximize | "Maximize Poll Card" / "Minimize Poll Card" | `pollCard.js` |
| Live Results | "Add to Live Results" / "Remove from Live Results" | `pollCard.js` |
| Result row | "<choice> — <pct>%" | `pollCard.js` (both render paths) |
| Vote row | "<choice>" | `pollCard.js` |
| Disabled tab (guest) | "Sign in to use this tab" | `tabs.js` |

### Browser checklist (for the developers)
Gathered from each prototype's NOTES. For each one, open the page with Theme on Light and on Dark.
- [ ] `poll-card.html`:
  - every fixture, with and without the remove-form checkbox, at about 1280, 640 and 375px;
  - the ripple and the state layers;
  - the radio and checkbox at small bar heights;
  - the 32px controls in the action and title rows.
- [ ] `MAXIMIZED-POLL-CARD/single-card.html`:
  - at about 1280, 850 and 375px, on `fifty`, `yesno` and `closed`, and once with `#back`;
  - the ×, the outlined panel and the rule;
  - the 898 / 808 / 768px thresholds.
- [ ] `HEADER-TAB-BAR/header-tab-bar.html`:
  - the indicator on the divider, and the 56px header row at each width, with the search bar
    wrapping below 768px;
  - the logo in dark, and the icon cut-outs on hover;
  - the snackbar's position with and without the cookie banner.
- [ ] `PROFILE-EDITOR/profile-editor.html`:
  - the underline in its focus and error states;
  - the current values lining up with the fields;
  - the 40px buttons;
  - the snackbar.
- [ ] `LOGIN-DIALOG/login-dialog.html`:
  - the checkbox in each state, by mouse and by keyboard;
  - the outlined OAuth buttons;
  - the field error after typing versus at load.
- [ ] `CREATE-ACCOUNT-DIALOG/create-account-dialog.html`: the field error after typing, and the
  title hover.
- [ ] `NOT-AUTHORIZED-DIALOG/not-authorized-dialog.html`: the spacing. Then the Profile Editor
  with "No session", and with "Email changed" or "Invalid link".
- [ ] `TABS-MODAL/tabs-modal.html`: the scrim, the entrance and the ripple, from both triggers.
- [ ] `LIVE-RESULTS-IDLE-PROMPT/live-results-idle-prompt.html`: the outlined card, the state
  layers, the focus ring on Yes and the entrance.
- [ ] `EMPTY-TAB-LINE/empty-tab-line.html`:
  - the centring;
  - the 34px gap with "More results…";
  - the focus ring with **Focus line** pressed by Enter or Space, and none by mouse.

# REQUIREMENT Use Material 3 For tooltips

[X] Resolved

## SHORT SUMMARY
Replace the browser's native `title` tooltips with Material 3 plain tooltips. The controls are
Refresh, Search, Clear Search Terms, the card's Favorites, Maximize and Live Results controls,
the result and vote rows, and a guest's disabled tabs. The prototypes to change are
`poll-card.html`, `MAXIMIZED-POLL-CARD/` and `HEADER-TAB-BAR/`. Then update the merge plan as the
review's NOTES record.

Found while reading:
- **The M3 plain tooltip:**
  - `inverse-surface` container with `inverse-on-surface` text, in Body Small (12/16);
  - a 4px corner (extra-small), 24px minimum height and 8px side padding;
  - placed just below or above its anchor;
  - shown on hover after a short delay and on keyboard focus, and hidden on leave, blur or
    Escape.
  - M3 uses it for icon buttons whose visible content is only an icon. It should not repeat
    text that is already visible.
- **CSS alone cannot do it here.** The card's scroll areas and bars clip with
  `overflow:hidden` (`pollCard.css`), so a `::after` tooltip on a row or a card button would be
  cut off. The tooltip has to be one element on `<body>`, placed by script.
- **The texts are set by production code in nine places**, as `title` (`index.html`, `app.js`,
  `pollCard.js` ×6, `tabs.js`). Some change at runtime: Favorites, Maximize and Live Results
  flip their wording, and the rows are re-rendered on every refresh.
- **Every icon control already has an `aria-label`** with the same words, so the tooltip is
  visual only (`aria-hidden`). The rows' and the disabled tabs' tooltips are not in an
  `aria-label`.
- **Disabled tabs.** Production disables a guest's personal tabs with `disabled`. A browser
  sends no pointer or focus events to a disabled `<button>`, so a script tooltip can never show
  on them. The plan's Step 2 already switches them to `aria-disabled="true"`.
- **The rows.** "<choice> — <pct>%" and "<choice>" mostly repeat the visible label. They are
  there for labels cut off by the ellipsis.
- The shared ripple scripts show a pattern to follow: one delegated listener in a `-m3.js` file,
  loaded by each page.

## REQUIREMENT DETAILS

The review in **# REQUIREMENT Question: Everything Prototyped in Material3?** found one part of the UI that is not yet Material 3: the browser's native `title` tooltips.  
These controls show one today:
- Refresh ("Refresh"), the header's Search ("Search") and Clear Search Terms ("Clear Search Terms").
- On the Poll Card: Favorites ("Add to Favorites" / "Remove from Favorites"), Maximize ("Maximize Poll Card" / "Minimize Poll Card") and Live Results ("Add to Live Results" / "Remove from Live Results").
- On the Poll Card: each result row ("<choice> — <pct>%") and each vote row ("<choice>").
- A guest's disabled tabs ("Sign in to use this tab").

Apply the same Material 3 design principles, accepted recommendations and accepted clarifications, in the Requirements above, to give these controls Material 3 tooltips in the existing prototypes (`poll-card.html`, `MAXIMIZED-POLL-CARD/`, `HEADER-TAB-BAR/`).  
Ensure consistency with the previously approved Poll Card.  
When it is resolved, update `designDocs/024-high-level-requirements-MATERIAL3-MERGE.md` as recorded in the NOTES of **# REQUIREMENT Question: Everything Prototyped in Material3?**.

## CLARIFICATIONS

1. Where the tooltip text comes from
[X] Resolved
Production sets the text as `title` in nine places, and some of it changes at runtime.

a. Keep production's `title`; a shared script takes it over
Recommended
[X] Accepted
A delegated `pointerover` / `focusin` listener in a new shared `../tooltip-m3.js` finds the
nearest element with a `title`. It moves the text to `data-tooltip` and removes `title`, so the
native tooltip never appears, and then shows the M3 tooltip.
- When production later sets `title` again (Favorites flips its wording, the rows re-render),
  the next hover takes the new text the same way.
- No line of `pollCard.js`, `app.js`, `tabs.js` or `index.html` changes. The merge adds one
  script and one stylesheet.

b. Change each `title` to `data-tooltip` as "M3:" edits
[ ] Accepted
Nine marked edits across four production files. The script then reads `data-tooltip` only. This
is more explicit in the source, but the merge has to carry every edit.

Other.
[ ] Accepted


2. The result and vote rows
[X] Resolved
Their tooltips mostly repeat the visible label, and exist for labels cut off by the ellipsis.

a. Show the tooltip only when the label is cut off
Recommended
[X] Accepted
The script shows a row's tooltip only while its label overflows (`scrollWidth > clientWidth`).
A row whose label is fully shown gets none, as M3 asks (no tooltip that repeats visible text).
The result row's tooltip keeps the percentage ("<choice> — <pct>%").

b. Show it on every row, as production does
[ ] Accepted
Every row shows a tooltip on hover, even when the whole label is visible.

c. No tooltip on rows
[ ] Accepted
Rows lose their tooltip. A cut-off label can then only be read in the maximized view.

Other.
[ ] Accepted


3. The guest's disabled tabs
[X] Resolved
A disabled `<button>` gets no pointer or focus events, so no script tooltip can show on it.

a. Make them `aria-disabled="true"` in the prototype, as an "M3:" edit
Recommended
[X] Accepted
This is the change the plan's Step 2 already makes, brought forward into `HEADER-TAB-BAR/`'s
harness copy of the tab code. The tooltip "Sign in to use this tab" then shows on hover and on
keyboard focus. The M3 disabled colours follow `[aria-disabled="true"]`, which
`header-tab-bar-m3.css` gains beside `:disabled`.

b. Leave them `disabled`; no tooltip until the merge
[ ] Accepted
The prototype shows tooltips everywhere but on these tabs. Step 2 adds theirs.

Other.
[ ] Accepted


4. When the tooltip shows
[X] Resolved
M3 shows a plain tooltip on hover and on keyboard focus on desktop, and on a long press on touch.

a. Hover after 500ms, keyboard focus at once; none on touch
[ ] Accepted
- On hover, it shows after 500ms and hides 150ms after the pointer leaves the control or the
  tooltip, so the pointer can move onto it (WCAG 1.4.13).
- On focus, it shows at once, but only from the keyboard (`:focus-visible`), not after a click.
- It hides on blur, on Escape, on scroll and on a press.
- Touch shows none: a long press already opens the browser's own menu, and every control's
  `aria-label` or visible text says what it does.
- Fade in over 150ms, with no motion under `prefers-reduced-motion`.

b. The same, and a long press on touch shows it for 1.5s
Recommended
[X] Accepted
This follows M3: hover and keyboard focus on desktop, and a long press on touch.
- A touch held for 500ms without moving shows the tooltip for 1.5s. Lifting the finger does not
  activate the control. A short tap behaves as today.
- On controls that carry a tooltip, the script cancels the browser's long-press menu
  (`contextmenu`) and sets `-webkit-touch-callout:none` and `user-select:none`. A long press then
  shows the tooltip instead of the browser's menu or a text selection.
  - This matters for the Live Results link (`<a href="#">`), which loses "open in new tab" on a
    link that goes nowhere.
  - The rows lose text selection.
- (Recommendation revised at the developers' review: option a was not M3 on touch. Its reasons
  were practical ones that this handling removes.)

Other.
[ ] Accepted


5. Placement
[X] Resolved
The tooltip floats on `<body>`, so it is never clipped by the card.

a. Below the control, centred, 4px away; above when there is no room below
Recommended
[X] Accepted
M3's default placement. It is kept 8px inside the viewport's edges, so tooltips near the screen
edge (the avatar side, a card at the right of the grid) slide in rather than overflow. A long row
label wraps at 240px wide.

b. Above the control by default
[ ] Accepted
Keeps the tooltip off the next row of bars when hovering a row, but covers the card's title row
when hovering the action icons.

Other.
[ ] Accepted

## RECOMMENDATION
[X] Resolved

1. One shared tooltip script and stylesheet, loaded by the three prototypes
Recommended
[X] Accepted
This builds what the clarifications chose (1a, 2a, 3a, 4b, 5a). No production file is copied
anew. Production's `title` attributes stay as they are (1a).

New shared files in `prototypes/POLL-CARD-MATERIAL3/`, beside `pollCard-m3.css` and `pollCard-m3.js`:
- `tooltip-m3.css`:
  - **Container.** `.m3-tooltip` is `position:fixed` with a high `z-index`, `inverse-surface` and
    `inverse-on-surface`, and Body Small (Roboto 12/16, 0.4px).
    - Its tokens: `--md-sys-typescale-body-small-*` from `../pollCard-m3.css`, and the inverse
      roles. Those are declared in the file (light and both dark forms), as `card-shell-m3.css`
      does, because `../pollCard-m3.css` lacks them.
  - **Shape.** A 4px corner (`--md-sys-shape-corner-extra-small`), a 24px minimum height, 4px 8px
    padding, a maximum width of 240px with wrapping, and no shadow (M3 plain tooltips are flat).
  - **Motion.** A 150ms opacity fade in. None under `prefers-reduced-motion`.
  - **Touch.** `-webkit-touch-callout:none` and `user-select:none` on `[data-tooltip]`, for the
    long press (4b). The rows already have `user-select:none` in `pollCard.css`.
- `tooltip-m3.js`, one IIFE with delegated listeners on `document`, and one tooltip element
  appended to `<body>` once, with `aria-hidden="true"`. The aria-labels already speak each name,
  and the rows' text is visible.
  - **Text (1a).** On `pointerover` or `focusin`, it finds the nearest element with a `title`
    or `data-tooltip`. A `title` is moved to `data-tooltip` and removed, so the native tooltip
    never shows. A later `title` set by production is taken over the same way at the next
    hover.
  - **Rows (2a).** For `.result-row` and `.vote-row`, the tooltip shows only while the label
    overflows (`scrollWidth > clientWidth` on the row's label element). The text stays
    production's, "<choice> — <pct>%" or "<choice>".
  - **When (4b):**
    - **Mouse:** shows 500ms after the pointer enters. Hides 150ms after it leaves both the
      control and the tooltip (the tooltip takes pointer events while shown, WCAG 1.4.13).
    - **Keyboard:** shows at once on `focusin` when the control matches `:focus-visible`, and
      hides on `focusout`.
    - **Touch:** a `pointerdown` of type `touch`, held 500ms without moving more than 10px,
      shows it for 1.5s. The `click` that follows that press is cancelled, so the control is not
      activated. `contextmenu` is cancelled on `[data-tooltip]` elements.
    - **Always hides** on Escape (without stopping Escape's other uses), on scroll (capture), on
      `pointerdown` elsewhere, and when the control leaves the document.
  - **Where (5a).** Centred below the control, 4px away. Above it when the space below is too
    small. Clamped 8px inside the viewport on both axes.
- Pages that load the two files:
  - `poll-card.html`, `MAXIMIZED-POLL-CARD/single-card.html` and
    `HEADER-TAB-BAR/header-tab-bar.html`, after their other M3 files.
  - `TABS-MODAL/`, `LIVE-RESULTS-IDLE-PROMPT/`, `EMPTY-TAB-LINE/` and the card-shell pages have
    no `title` tooltips, so they are unchanged.

The disabled tabs (3a), in `HEADER-TAB-BAR/`:
- `harness.js` (its copy of production's `applyGuestState` and the tab click), with edits marked
  "M3:" to carry over in the merge:
  - `btn.disabled = !signedIn` becomes `btn.setAttribute('aria-disabled', String(!signedIn))`
    (removed when signed in).
  - The click handler tests `btn.getAttribute('aria-disabled') === 'true'` instead of
    `btn.disabled`. It goes to Log In, as production intends.
- `header-tab-bar-m3.css`: each `:disabled` tab rule (lines 89, 100 and 443) also matches
  `[aria-disabled="true"]`, so the disabled colours and the absent state layer are unchanged.
- Today's `tab-bar.css` copy keeps its `:disabled` rules. They no longer match a tab, which the
  merge's Step 2 records.

The plan (the review's NOTES, recommendation 2): once this is implemented,
`designDocs/024-high-level-requirements-MATERIAL3-MERGE.md` gets its one update:
- The prototype table gains the six later prototypes and the tooltip files.
- Prerequisites is marked done.
- Step 1 gains `tooltip-m3.css` and `tooltip-m3.js` as shared files, beside `m3-tokens.css` and
  `m3-ripple.js`, loaded by every page.
- Step 2 gains:
  - the `Tabs.modal`, idle prompt and empty-tab line changes;
  - the `aria-disabled` tabs (already there), now with the tooltip;
  - the replacement of the literal font sizes in `header-tab-bar-m3.css`.
- Step 4 notes that `card-shell-m3.css` already exists.
- The Effect, Functional Requirements and Exclusions sections are updated to match:
  - tooltips replace native ones;
  - a long press on a tooltip control shows the tooltip instead of the browser's menu.
- A new "Material 3 compliance review" section states that everything in scope is prototyped,
  verified in code, with the look pending the browser checklist in the review's NOTES.

Checks
- `css-tree` parses `tooltip-m3.css`, and the brace check passes. `node --check` passes on
  `tooltip-m3.js`.
- jsdom, on all three pages, in light and dark, with timers faked:
  - Hovering Refresh, Search, Favorites, Maximize and Live Results shows one tooltip after
    500ms, with production's text, and the `title` attribute is gone.
  - Favorites' text follows a toggle.
  - A row with a label that fits gets none. A row whose label is widened past its box (by setting
    `scrollWidth`) gets "<choice> — <pct>%".
  - Keyboard focus shows it at once, a mouse click does not, and Escape and blur hide it.
  - A simulated 500ms touch shows it, and cancels the click.
  - A guest's tab has `aria-disabled="true"` and shows "Sign in to use this tab". Its click goes
    to Log In.
  - There are no script errors.
- Not checkable without a browser: the look in both schemes, the placement near the edges, the
  hover bridge onto the tooltip, and the long press on a real touch device.

Pros:
- M3 plain tooltips everywhere a tooltip shows today, with no production script edits beyond
  the `aria-disabled` tabs the plan already makes.
- One element and one listener set for the whole page. It is never clipped by the card.
- Text written by production at any time is picked up without coordination.

Cons:
- The script removes `title` attributes that production writes. A reader of the DOM sees
  `data-tooltip` where the source says `title`, which the merge plan must explain.
- Cancelling the long-press menu removes "open in new tab" from the Live Results link.
- Measuring overflow on the rows needs the label element's size, which jsdom cannot give, so
  that path is checked with a stubbed size.

2. The same, positioned with Floating UI from a CDN
[ ] Accepted
As recommendation 1, but the placement (5a) uses Floating UI's `computePosition` with `offset`,
`flip` and `shift`, loaded from cdnjs.

Pros:
- Placement edge cases (scrolling containers, flipping, shifting) are handled by a tested
  library.

Cons:
- Production has no third-party client code today, and the merge would add a dependency for
  about 30 lines of placement.
- The prototypes would need the network to work, unlike every other prototype.

## NOTES
Implemented recommendation 1, with clarifications 1a, 2a, 3a, 4b and 5a. Open
`poll-card.html`, `MAXIMIZED-POLL-CARD/single-card.html` or `HEADER-TAB-BAR/header-tab-bar.html`,
and hover any icon control.

New shared files in `prototypes/POLL-CARD-MATERIAL3/`
- `tooltip-m3.css`, in four sections:
  1. The inverse roles (light and both dark forms), with the values of `header-tab-bar-m3.css`.
  2. `.m3-tooltip`: fixed, `z-index:1000`, Body Small, `inverse-surface` and
     `inverse-on-surface`, a 4px corner, 24px minimum height, 4px 8px padding, and 240px wide at
     most with wrapping. Flat.
  3. A 150ms fade in, none under reduced motion.
  4. `[data-tooltip]` gets `-webkit-touch-callout:none` and `user-select:none`.
- `tooltip-m3.js`, one IIFE:
  - One `aria-hidden` `.m3-tooltip` is appended to `<body>`.
  - **Text.** A `MutationObserver` on `title` attributes (and on added nodes) moves every
    `title` to `data-tooltip` and removes it. An empty `title` clears `data-tooltip`. If the
    control is showing its tooltip, the text updates or the tooltip hides.
  - **Rows.** On `.result-row` / `.vote-row`, the tooltip shows only while `.result-label` /
    `.vote-label` overflows.
  - **Mouse and pen.** Shown 500ms after `pointerover`. Moving from one tooltip control to
    another shows the next at once. Hidden 150ms after leaving both the control and the tooltip,
    which takes the pointer meanwhile.
  - **Keyboard.** Shown at once on `focusin` when the last input was a key (a press clears that,
    as `:focus-visible` does). Hidden on `focusout`.
  - **Touch.** A press held 500ms within 10px shows it for 1.5s, and the click that follows is
    swallowed once. Each new press resets that, so a missed click never swallows a later one.
    `contextmenu` is prevented on `[data-tooltip]`.
  - **Hiding.** Escape hides it without stopping the event (the maximized view's own Escape
    still runs). So do any press, scroll (capture), resize, and the control leaving the page.
  - **Placement.** Centred 4px below, above when there is no room, clamped 8px inside the
    viewport.
- The three pages link `tooltip-m3.css` after their M3 stylesheet, and load `tooltip-m3.js` after
  their M3 script.

`HEADER-TAB-BAR/` (3a)
- `harness.js`: in its copy of production's `applyGuestState` and tab click, two edits marked
  "M3:". A guest's personal tabs get `aria-disabled="true"` (removed when signed in) instead of
  `disabled`, and the click tests `aria-disabled`.
- `header-tab-bar-m3.css`: the disabled tab colour and the absent state layer also match
  `.tab-bar .tab[aria-disabled="true"]`, with production's `cursor:not-allowed`.
  `tab-bar.css` stays production's copy, and its `:disabled` rules no longer match a tab.

The merge plan, updated (the review's recommendation 2)
`designDocs/024-high-level-requirements-MATERIAL3-MERGE.md`:
- **What the prototypes are.** Rows for Login, Create Account, Not Authorized, `Tabs.modal`, the
  idle prompt, the empty-tab line and the tooltips. Profile's layer now names `card-shell-m3.css`.
- **Prerequisites.** Marked done, with the tooltips added.
- **Step 1.** `tooltip-m3.css` and `tooltip-m3.js` are shared files on every page, with their
  behaviour.
- **Step 2:**
  - the literal font sizes in `header-tab-bar-m3.css` are replaced;
  - the `Tabs.modal`, idle prompt and empty-tab line ports with their `M3:` edits, ripple
    registrations and the `tabs.css` split and FIX029 deletion;
  - the disabled tabs also for the tooltip;
  - the new client tests.
- **Step 4.** `card-shell-m3.css` exists and is ported as is, with `profile-editor-m3.css`.
- **Effect.** New files, changed scripts (`tabs.js` `modal()`, `liveResults.js`) and changed
  styles.
- **Functional Requirements.** The new exceptions:
  - the dialog's name and Tab trap;
  - the idle prompt's text, `aria-modal`, name and focus;
  - the empty line centred everywhere;
  - M3 tooltips, rows only when cut off, and the long press.
- **A new section, "Material 3 compliance review".** Everything in scope is prototyped and
  verified in code, and the look is pending the browser checklist in the review's NOTES.

Checked (jsdom, light and dark, no script errors)
- `css-tree` parses `tooltip-m3.css` and `header-tab-bar-m3.css` with no errors, braces balance,
  and `node --check` passes on `tooltip-m3.js`.
- **Header page:**
  - No `title` is left, and 76 elements carry `data-tooltip`.
  - Refresh, Search, Favorites, Maximize and Live Results show nothing before 500ms and
    production's text after it, then hide on leaving.
  - A guest tab is `aria-disabled`, not `disabled`, shows "Sign in to use this tab", and its
    click reaches the Log In sample.
  - Keyboard focus shows the tooltip at once, and Escape hides it. Focus after a press does not
    show it.
  - A 500ms touch shows "Search" and swallows its click, and the tooltip is gone after 1.5s. A
    short tap clicks with no tooltip. `contextmenu` is prevented.
- **Poll card page:**
  - A result row whose label fits shows none. With its label made to overflow, it shows
    "Road resurfacing — 34%", and a vote row shows "Road resurfacing".
  - Production setting `title` while the tooltip shows updates it at once, and an empty `title`
    hides it. (The harness's Favorites button is a stub that does not toggle its label, so the
    update was driven by setting `title` directly.)
- **Maximized page:** Maximize shows "Minimize Poll Card". No `title` is left.
- **Not checkable without a browser:**
  - the look in both schemes, and the placement near the viewport edges;
  - moving the pointer onto the tooltip;
  - a long press on a real touch device, including that the Live Results link opens no menu;
  - whether a real browser's native tooltip ever flashes before the first takeover (the
    observer runs at load, so it should not).

Please open the three pages with Theme on Light and Dark. Hover and tab through the icons, the
guest's tabs (Session: a guest) and a long result label. On a phone or in touch emulation, try a
long press.

With this, every surface in 024's scope is prototyped in Material 3. The merge plan is up to date.


# REQUIREMENT Not Saved Dialog Box

[X] Resolved

## SHORT SUMMARY
The question is whether the "Not Saved" dialog ("Any edits will be lost. Continue?", OK and
Cancel) has been ported to Material 3. **It has not.** It is not a page component that a
stylesheet can reach: it is the browser's own `window.confirm()`.

Found while reading:
- **Where it comes from.** `confirmDiscard()` in `src/public/adminCard.js` (line 433) returns
  `window.confirm("Any edits will be lost. Continue?")`. It is called in two places:
  - the poll card's Cancel while editing (`adminCard.js` line 964);
  - the admin page's back link (`adminList.js` line 424).
  - The Poll Editing Card prototype (`NON-ADMIN-POLL-EDITING/adminCard.js`) keeps the same
    function. Its wizard's Cancel also calls it (lines 1435 and 2337).
- **Why no review caught it.** It lives on the admin page and in the Poll Editing Card, both
  outside 024's scope (the plan's Exclusions). The compliance review searched the in-scope pages,
  which call no `confirm()`.
- **What can and cannot be ported:**
  - The `confirm()` box is drawn by the browser (its title is the origin, "localhost:9999 says").
    Its look cannot be styled. Porting it means replacing it with a page dialog.
  - The other guard, `beforeunload` (reload, close tab, typing a new URL), shows the browser's
    "Leave site?" prompt. Browsers allow no custom dialog or text there, so it stays the
    browser's.
- **`confirm()` is synchronous.** Both callers read its answer at once
  (`if (!dirty || confirmDiscard())`). A page dialog answers later, so the callers must await a
  promise.
- **An M3 base exists.** `TABS-MODAL/` already has an M3 basic dialog (scrim, 28px corner,
  `surface-container-high`, text-button actions, entrance, focus kept inside). A confirmation
  dialog is that with two actions and, in M3, usually a headline.
- The image the requirement points to is at `prototypes/POLL-CARD-MATERIAL3/LostEditDialog.jpg`,
  not `images/LostEditDialog.jpg`.

## REQUIREMENTS

Has the "Not Saved" dialog box been ported to Material 3?
See the image below for reference:
![Not Saved Dialog Box](images/LostEditDialog.jpg)

## CLARIFICATIONS

1. What to do about it
[X] Resolved
The dialog belongs to the admin page and the Poll Editing Card, which 024 excludes.

a. Prototype an M3 confirmation dialog now, for the admin feature to use
Recommended
[ ] Accepted
- A new `DISCARD-DIALOG/` prototype, built on `TABS-MODAL/`'s M3 dialog layer.
- It holds a copy of `confirmDiscard()`, rewritten as a promise-returning page dialog and marked
  "M3:". The two production call sites are shown as they must change.
- 024's plan lists it under "Afterwards: the admin feature", so the Poll Editing Card feature
  ports it with the rest of the admin pages.
- 024 itself does not change.

b. Prototype it now and bring it into 024
[X] Accepted
As a, but 024's Step 2 also ports it to the admin page, the one admin change in 024. The admin
page would then show an M3 dialog over a page that is otherwise not yet M3.

c. Record it only
[ ] Accepted
Add it to the plan's "Afterwards" list as a surface the admin feature must prototype. No prototype
now.

Other.
[ ] Accepted


2. The browser's "Leave site?" prompt
[X] Resolved
`beforeunload` (reload, closing the tab, typing a new URL) shows the browser's own prompt.
Browsers allow neither a page dialog nor custom text there.

a. Keep it as the browser's, and record that in the plan
Recommended
[X] Accepted
This is the only option browsers allow. The page dialog covers every exit the page itself
controls (Cancel and the back link). The plan's Exclusions gain "the browser's leave-page prompt".

Other.
[ ] Accepted


3. Wording and actions
[X] Resolved
Production reads "Any edits will be lost. Continue?" with OK and Cancel. M3 dialogs name their
actions after what they do, and a confirmation usually has a short headline.

a. Headline "Discard changes?", text "Your edits will be lost.", actions **Keep editing** and **Discard**
Recommended
[X] Accepted
M3's pattern for a destructive confirmation. Each button says what it does, so no one has to work
out whether OK means "lose my edits". The confirming action, Discard, is last.

b. No headline, production's text, actions **Cancel** and **OK**
[ ] Accepted
The same words as today, as an M3 basic dialog like `Tabs.modal`. It is less clear which button
discards.

c. No headline, production's text, actions **Keep editing** and **Discard**
[ ] Accepted
Today's sentence, with clearer actions.

Other.
[ ] Accepted


4. Dismissing, and where focus starts
[X] Resolved
A confirmation that can lose work must have a safe default.

a. Escape and a scrim click keep editing; focus starts on Keep editing
Recommended
[X] Accepted
Every way out that is not a deliberate press on Discard keeps the edits. Enter on the dialog as
it opens keeps them too. Focus returns to the control that opened it. Tab and Shift+Tab stay
inside, as in the M3 `Tabs.modal`.

b. Escape keeps editing; a scrim click does nothing; focus starts on Discard
[ ] Accepted
This matches `window.confirm`, where Enter confirms. It is faster for someone who means to
discard, and riskier for someone who does not.

Other.
[ ] Accepted

## RECOMMENDATION
[X] Resolved

1. A `DISCARD-DIALOG/` prototype on the `Tabs.modal` M3 dialog, and a 024 Step 2 port to the admin page
Recommended
[X] Accepted
This builds what the clarifications chose (1b, 2a, 3a, 4a). The dialog reuses `Tabs.modal`'s
markup classes (`.modal-backdrop`, `.modal`, `.modal-text`, `.modal-actions`), so the approved M3
dialog layer dresses it. Only what is new (the headline and the second action) needs its own
rules.

Files in `prototypes/POLL-CARD-MATERIAL3/DISCARD-DIALOG/`
- `discard-dialog.html`:
  - The admin page's shell, without its header.
  - Stylesheets: `../tabs.css`, `../site.css`, `../pollCard-m3.css`,
    `../TABS-MODAL/tabs-modal.css`, `../TABS-MODAL/tabs-modal-m3.css`, then the new
    `discard-dialog-m3.css`.
  - A prototype bar with Theme and a note line.
  - A small stand-in editing area: one text field and the two exits that call the dialog today,
    **Cancel** (as on the editing card) and a **←** back link (as `.admin-back-link`). Typing in
    the field marks it dirty. The stand-in is styled as plain placeholders, since the editing
    card itself is not M3 yet.
  - Scripts: `discardDialog.js`, `discard-dialog-m3.js`, `harness.js`.
- `discardDialog.js`:
  - `confirmDiscard()` rewritten as a page dialog that returns a `Promise<boolean>`, each change
    from `src/public/adminCard.js` line 433 marked "M3:".
  - It builds the `Tabs.modal` structure:
    - `role="alertdialog"` (a confirmation of a destructive action) and `aria-modal="true"`;
    - an `<h2 class="modal-headline">` "Discard changes?" named by `aria-labelledby`;
    - the text "Your edits will be lost." by `aria-describedby`;
    - two text buttons, **Keep editing** then **Discard** (`.modal-action`, with
      `.modal-discard` on the second) (3a).
  - **Discard** resolves `true`. **Keep editing**, Escape and a click on the scrim resolve
    `false` (4a).
  - Focus starts on Keep editing, Tab and Shift+Tab cycle between the two buttons, and focus
    returns to the opener on close (4a).
  - A second call while one is open returns the open dialog's promise.
  - It exposes `window.DiscardDialog = { confirmDiscard }`.
  - Beside it, the two production call sites, as they must change, marked "M3:":
    - `adminCard.js` line 964 (the Cancel handler):
      `cancel.addEventListener("click", async () => { if (!dirty || await confirmDiscard()) void cancelEdit(); });`
    - `adminList.js` line 424 (the back link): the handler becomes `async`, and the guard becomes
      `if (controller.isDirty() && !(await controller.confirmDiscard())) return;`.
- `discard-dialog-m3.css`:
  - **Headline.** `.modal-headline` is Headline Small (Roboto 24/32, 400) in `on-surface`, with
    16px below it. The token is declared here, since `../pollCard-m3.css` lacks it.
  - **Actions.** `.modal .modal-action` takes the same text-button rules as `.modal .modal-ok` in
    `tabs-modal-m3.css`: 40px, 12px side padding, full corner, `primary`, Label Large, the state
    layer, and the 3px `secondary` focus ring. The 8px gap and end alignment come from
    `.modal-actions`.
  - The text keeps Body Medium in `on-surface-variant` from `tabs-modal-m3.css`.
  - **Discard** stays `primary`, as M3 text buttons in dialogs do, not an error colour.
- `discard-dialog-m3.js`: the ripple, as `../TABS-MODAL/tabs-modal-m3.js`, aimed at
  `.modal .modal-action`.
- `harness.js`:
  - Applies Theme (`?theme=` as in the newer prototypes).
  - Wires the stand-in's Cancel and back link through the rewritten call sites. The note line
    says "Kept editing", "Discarded: the card returns to read-only (sample only)" or
    "Discarded: the page goes home (sample only)".
  - When the field is clean, both exits act at once without the dialog, as production does.

The merge plan (`designDocs/024-high-level-requirements-MATERIAL3-MERGE.md`) (1b, 2a):
- **What the prototypes are.** A row for the Not Saved dialog. Its production changes are
  `confirmDiscard()` in `adminCard.js` and the two call sites (`adminCard.js`, `adminList.js`).
- **Step 1.** The admin pages already link `m3-tokens.css` and `m3-ripple.js` (all seven
  pages).
- **Step 2:**
  - The admin page (`admin.html`) also links the `Tabs.modal` M3 layer and the new dialog
    rules.
  - `confirmDiscard()` and its two callers change as the prototype marks.
  - `m3-ripple.js` registers `.modal .modal-action`.
  - Client tests:
    - with no edits, Cancel and the back link act at once;
    - with edits, the dialog opens with focus on Keep editing;
    - Keep editing, Escape and a scrim click keep the edits, and Discard proceeds;
    - focus returns to the opener.
- **Effect on the current implementation.** "The admin pages' own content is unchanged" gains
  "except the Not Saved dialog". Changed scripts gain `adminCard.js` and `adminList.js`.
- **Functional Requirements.** A new exception: leaving an edited poll card asks "Discard
  changes?" in a page dialog with Keep editing and Discard, where Keep editing, Escape and the
  scrim keep the edits. It replaces the browser's "Any edits will be lost. Continue?".
- **Exclusions.** "The browser's leave-page prompt (`beforeunload`), which browsers do not let a
  page replace or reword."
- **Material 3 compliance review.** It notes this dialog, found after the review, and that it is
  covered.
- The Poll Editing Card prototype (`NON-ADMIN-POLL-EDITING/`) keeps `window.confirm` for now. The
  plan's "Afterwards" notes that its wizard's Cancel uses the same `confirmDiscard()` and picks up
  the dialog when that feature is built.

Checks
- `css-tree` parses the new CSS, and the brace check passes. `node --check` passes on the
  scripts.
- jsdom, in light and dark:
  - With a clean field, both exits act without a dialog.
  - With a dirty field:
    - each exit opens one `role="alertdialog"` with the headline as its name and the text as its
      description, focus on Keep editing, and Tab cycling the two buttons;
    - Keep editing, Escape and a scrim click each resolve `false` (the note says "Kept editing"),
      and Discard resolves `true`;
    - focus returns to the opener;
    - a second call while open opens no second dialog;
    - a press on either action adds a `.m3-ripple`.
  - There are no script errors.
- Not checkable without a browser: the look in both schemes, the headline's spacing, and the
  entrance and ripple.

Pros:
- One M3 dialog design across the site: `Tabs.modal` and this one share the layer.
- A safe, clearly worded confirmation in place of the browser's box.
- The change to production is small and marked.

Cons:
- Making the callers asynchronous changes two handlers. A test must cover each so a missed
  `await` cannot let the exit proceed before the answer.
- The admin page shows an M3 dialog over a page that is otherwise not yet M3, until the admin
  feature (1b's accepted cost).

2. The same, built on the native `<dialog>` element
[ ] Accepted
As recommendation 1, but the dialog is a `<dialog>` opened with `showModal()`. The browser makes
the page behind inert, handles Escape, keeps focus inside, and styles the scrim as `::backdrop`.

Pros:
- Less code. True modality: the page behind cannot be reached by any means.

Cons:
- A second dialog mechanism beside `Tabs.modal`'s `div`, so the M3 layer must be written twice
  (`.modal` and `dialog`), or `Tabs.modal` rewritten too.

## NOTES
Implemented recommendation 1, with clarifications 1b, 2a, 3a and 4a. Open
`DISCARD-DIALOG/discard-dialog.html` directly. Edit the title, then press Cancel or the ← back
link.

Answer to the question: the "Not Saved" dialog had **not** been ported. It was the browser's
`window.confirm`, which no stylesheet can reach. It now has an M3 page-dialog prototype, and 024's
Step 2 ports it to the admin page.

Files in `DISCARD-DIALOG/`
- `discard-dialog.html`:
  - The page shell, with stylesheets in this order:
    - `../tabs.css`, `../site.css`, `../pollCard-m3.css`;
    - `../TABS-MODAL/tabs-modal.css` (production's `.modal` rules) and
      `../TABS-MODAL/tabs-modal-m3.css` (the approved M3 dialog);
    - `discard-dialog-m3.css`.
  - A Theme bar and a note line.
  - A stand-in editing area: the admin page's back link, one title field and Cancel.
  - Scripts: `discardDialog.js`, `discard-dialog-m3.js`, `harness.js`.
- `discardDialog.js`: `confirmDiscard()` from `src/public/adminCard.js` line 433, rewritten with
  "M3:" markers. It:
  - returns a `Promise<boolean>`;
  - builds `Tabs.modal`'s markup with `role="alertdialog"`, `aria-modal`, `aria-labelledby` (the
    headline "Discard changes?") and `aria-describedby` (the text "Your edits will be lost.");
  - has the text buttons **Keep editing** then **Discard** (`.modal-action`);
  - resolves `false` for Keep editing, Escape or a scrim click, and `true` only for Discard;
  - starts focus on Keep editing, cycles Tab and Shift+Tab between the two actions, and returns
    focus to the opener;
  - shares one open dialog's promise with a second call;
  - exposes `window.DiscardDialog`.
- `discard-dialog-m3.css`: the Headline Small headline (24/32 in `on-surface`, 16px below; its
  tokens declared here) and `.modal .modal-action` as text buttons. These have the same rules as
  `Tabs.modal`'s OK: 40px, Label Large, `primary`, the state layer and the 3px `secondary` focus
  ring.
- `discard-dialog-m3.js`: the ripple, copied from `TABS-MODAL/tabs-modal-m3.js` and aimed at
  `.modal .modal-action`.
- `harness.js`:
  - Holds the two production call sites as they must change, marked "M3:":
    - Cancel: `if (!dirty || await confirmDiscard()) void cancelEdit();`
    - the back link's `async` handler: `preventDefault()` stays before
      `if (controller.isDirty() && !(await controller.confirmDiscard())) return;`.
  - These sit in the harness rather than beside `confirmDiscard()` in `discardDialog.js`, as the
    recommendation said, because they need the stand-ins (`dirty`, `cancelEdit`, the
    controller) that only the harness has.
  - The note line reports "Kept editing", or the sample outcome.

The merge plan (`designDocs/024-high-level-requirements-MATERIAL3-MERGE.md`)
- A prototype-table row for the Not Saved dialog, and a Prerequisites line.
- A Step 2 bullet, "the one admin-page change in 024":
  - the stylesheets on `admin.html`;
  - `confirmDiscard()` and its two awaiting callers;
  - the ripple registration;
  - client tests.
- "Afterwards": the Poll Editing Card prototype still calls `window.confirm`, and that feature
  takes 024's dialog.
- Effect, Functional Requirements and Exclusions:
  - the admin content exception;
  - `adminCard.js` and `adminList.js` as changed scripts;
  - the new wording and safe default;
  - the browser's leave-page prompt excluded.
- The compliance review notes the dialog, found after the review, and covered.

Checked (jsdom, light and `?theme=dark`, no script errors)
- `node --check` passes on the three scripts. `css-tree` parses `discard-dialog-m3.css` with no
  errors, and braces balance. All six stylesheets load.
- With a clean field, Cancel and the back link act at once with no dialog. The back link's
  default is prevented, as production does before navigating.
- With an edited field, for both Cancel and the back link, and each of Keep editing, Escape,
  scrim click and Discard:
  - one `alertdialog` opens, named "Discard changes?" and described by "Your edits will be
    lost.";
  - focus is on Keep editing, and Tab and Shift+Tab move between the two actions;
  - a second call opens no second dialog, and a press adds a `.m3-ripple`;
  - after closing, no dialog is left and focus is back on the opener;
  - Keep editing, Escape and the scrim keep the edit and note "Kept editing". Discard proceeds
    ("the card returns to read-only" or "Discarded: the page goes home").
- Not checkable without a browser: the look in both schemes, the headline's spacing, the
  entrance and the ripple's animation. Please open `discard-dialog.html` with Theme on Light and
  Dark, edit the title, and try both exits.

# REQUIREMENT Update designDocs\024-high-level-requirements-MATERIAL3-MERGE.md

[X] Resolved

## SHORT SUMMARY
Bring `designDocs/024-high-level-requirements-MATERIAL3-MERGE.md` up to date with every prototype
change and every requirement in this file.

Found while reading:
- **Most of it is already current.** "Use Material 3 For tooltips" and "Not Saved Dialog Box"
  each updated the plan:
  - the prototype table (all 12 prototypes);
  - Prerequisites (done);
  - the Step 2 ports and `M3:` edits for `Tabs.modal`, the idle prompt, the empty-tab line, the
    tooltips and the Not Saved dialog;
  - Step 4's `card-shell-m3.css`;
  - the Effect, Functional Requirements and Exclusions sections;
  - the compliance review.
- **What is still out of date**, from an audit of every requirement's NOTES against the plan:
  1. **The shared design: type.** It lists Title Large, Title Small, Body Large, Body Medium,
     Body Small and Label Large. It lacks Headline Small, used by the Not Saved dialog. It does
     not record the Font Size answer: the title shrinks below Title Large's 22px to 18px on narrow
     windows, and the bar text keeps production's 7–11px. Those are the two custom sizes.
  2. **The shared design: shape.** Corners "full, 12px, 8px and 4px" lack 28px (extra-large),
     used by the dialogs.
  3. **Step 1: tokens.** `m3-tokens.css` "replaces the token sections now repeated in
     `pollCard-m3.css`, `header-tab-bar-m3.css` and `profile-editor-m3.css`". Tokens are now also
     declared in:
     - `card-shell-m3.css` (the inverse roles, elevation);
     - `tabs-modal-m3.css` (scrim, extra-large corner, elevation 3, emphasized-decelerate
       easing);
     - `live-idle-prompt-m3.css` (the easing);
     - `tooltip-m3.css` (the inverse roles);
     - `discard-dialog-m3.css` (Headline Small).

     `profile-editor-m3.css` declares none.
  4. **Step 1: the ripple.** `m3-ripple.js` is "merged from the three prototype copies". There
     are now five: `pollCard-m3.js`, `header-tab-bar-m3.js`, `tabs-modal-m3.js`,
     `live-idle-prompt-m3.js` and `discard-dialog-m3.js`.
  5. **Step 4: literal font size.** `card-shell-m3.css` writes one 14px as a literal, as
     `header-tab-bar-m3.css` does. Step 2 covers the header's, and Step 4 does not mention this
     one.
  6. **Step 5: the browser pass.** It says "following the checks recorded in each prototype's
     NOTES". The review gathered those into one checklist. The tooltips and Not Saved dialog
     prototypes came after it, so their checks are on no list.
  7. **Assumptions.**
     - "The prerequisites come first" is now met.
     - "The browser floor" names `:has()` only. The card-shell field error also uses
       `:user-valid` / `:user-invalid`.
- The rest matched on audit: Branching, Step 3, the Overview, and the decisions recorded in
  each prototype's NOTES. Those decisions include the 640px fix, the 021 hover scope and the
  idle prompt's merge notes.

## REQUIREMENT DETAILS

Update `designDocs\024-high-level-requirements-MATERIAL3-MERGE.md` to reflect the all prototypes changes and new requirements introduced in this requirements document.

## CLARIFICATIONS

1. How the plan is updated
[X] Resolved
Seven gaps remain, each in a known place in the plan.

a. Targeted edits for the seven gaps only
Recommended
[X] Accepted
Each gap is fixed where it sits, in the plan's existing wording and structure. Nothing else in the
plan changes. The NOTES list every edit.

b. Rewrite the plan end to end from the prototypes
[ ] Accepted
The plan has grown by several requirements' updates. A rewrite would read more evenly, but it
risks dropping decisions that the targeted updates placed with care, and it is harder to review.

Other.
[ ] Accepted


2. The browser checklist in Step 5
[X] Resolved
The review's NOTES hold the checklist for ten prototypes. The tooltips and the Not Saved dialog
came later.

a. Copy the full checklist into Step 5, including the two later prototypes
Recommended
[X] Accepted
Step 5 holds one complete checklist (twelve prototypes, each in Light and Dark), so the plan is
self-contained when `/speckit-specify` and `/speckit-mdd-architecture` read it. The review's
NOTES stay as they are.

b. Point Step 5 at the review's checklist, and list the two later prototypes' checks there
[ ] Accepted
The plan stays shorter, but the checklist is split across two documents.

Other.
[ ] Accepted

## RECOMMENDATION
[X] Resolved

1. Seven targeted edits, with the full checklist inside Step 5
Recommended
[X] Accepted
This builds what clarifications 1a and 2a chose. Only
`designDocs/024-high-level-requirements-MATERIAL3-MERGE.md` changes. Each edit is a targeted
replacement of the text named below.

1. **The shared design, Type.** The list becomes Headline Small, Title Large, Title Small,
   Body Large, Body Medium, Body Small and Label Large. A sentence records the Font Size answer:
   each element takes an M3 role, and two sizes are custom.
   - The card title shrinks from Title Large's 22px to 18px on narrow windows
     (`clamp(18px, 1.8vw, 22px)`).
   - The bar labels and percentages keep production's 7–11px, scaled with bar height.
2. **The shared design, shape.** Corners become "full, 28px, 12px, 8px and 4px", with 28px
   for the dialogs.
3. **Step 1, tokens.** "It replaces the token sections now repeated in …" names every layer that
   declares tokens: `pollCard-m3.css`, `header-tab-bar-m3.css`, `card-shell-m3.css`,
   `tabs-modal-m3.css`, `live-idle-prompt-m3.css`, `tooltip-m3.css` and `discard-dialog-m3.css`.
   `m3-tokens.css` therefore also holds:
   - the scrim role;
   - the extra-large corner;
   - the emphasized-decelerate easing;
   - Headline Small.
4. **Step 1, the ripple.** "merged from the three prototype copies" becomes the five copies,
   named: `pollCard-m3.js`, `header-tab-bar-m3.js`, `tabs-modal-m3.js`,
   `live-idle-prompt-m3.js` and `discard-dialog-m3.js`. Each area registers its targets.
5. **Step 4.** A bullet: replace the literal 14px in `card-shell-m3.css` with the Body Medium
   variables, as Step 2 does for `header-tab-bar-m3.css`.
6. **Step 5.** "following the checks recorded in each prototype's NOTES" becomes the full
   checklist, as a nested list in Step 5. It has the review's ten entries, verbatim in substance,
   plus two:
   - Tooltips, on `poll-card.html`, `MAXIMIZED-POLL-CARD/` and `HEADER-TAB-BAR/`:
     - hover and keyboard on each icon control;
     - a guest's tabs;
     - a cut-off row label;
     - placement near the edges;
     - moving the pointer onto the tooltip;
     - a long press on touch, including the Live Results link.
   - The Not Saved dialog, `DISCARD-DIALOG/`:
     - the headline spacing;
     - the two actions;
     - the entrance and ripple;
     - both exits, clean and edited.

   Each entry is checked in Light and Dark. The production pages are checked at 320px, 640px,
   768px and desktop widths, as Step 5 already says.
7. **Assumptions.**
   - "The prerequisites come first" becomes "The prerequisites are done", noting all are
     resolved in `iterative-requirements.md`.
   - "The browser floor" names `:has()` and `:user-valid` / `:user-invalid`. Without them, only
     the status line shows a field error.

Checks
- Each edit is re-read against the prototype files it describes:
  - the type roles and corners in use;
  - the token declarations per layer;
  - the five ripple scripts;
  - the literal in `card-shell-m3.css`;
  - the checklist entries against each prototype's NOTES.
- The plan's Markdown is re-read for broken lists and tables.
- A diff of the plan shows only the seven edits.

Pros:
- The plan matches every prototype and requirement, and stands alone for `/speckit-specify`.
- Small, reviewable edits. Nothing already decided is reworded.

Cons:
- The checklist now lives in two places: the review's NOTES (as found) and the plan's Step 5 (as
  maintained). The plan's copy is the one that counts from here on, and the NOTES say so.

2. The same edits, with the checklist as an appendix at the end of the plan
[ ] Accepted
Edits 1–5 and 7 as in recommendation 1. Step 5 points to a new "Appendix: browser checklist"
section at the end of the plan, which holds the twelve entries.

Pros:
- Step 5 stays short, and the checklist is easy to find and print.

Cons:
- One more section. The step that runs the checks no longer shows them.

## NOTES
Implemented recommendation 1, with clarifications 1a and 2a. Only
`designDocs/024-high-level-requirements-MATERIAL3-MERGE.md` changed.

The seven edits, each a targeted replacement:
1. **The shared design, Type.**
   - Headline Small is added (the Not Saved dialog's headline).
   - New sub-bullets record that each element takes an M3 role, and name the two custom sizes:
     the title's `clamp(18px, 1.8vw, 22px)` and the 7–11px bar text from `scaleFontSize`.
2. **The shared design, Shape.** Corners: "full, 28px (the dialogs), 12px, 8px and 4px".
3. **Step 1, tokens.** The token sections `m3-tokens.css` replaces now name every layer that
   declares tokens, with what each holds:
   - `pollCard-m3.css`;
   - `header-tab-bar-m3.css` and `card-shell-m3.css` (inverse roles and elevations);
   - `tooltip-m3.css` (inverse roles);
   - `tabs-modal-m3.css` (scrim, extra-large corner, elevation 3, easing);
   - `live-idle-prompt-m3.css` (easing);
   - `discard-dialog-m3.css` (Headline Small).

   A line notes `m3-tokens.css` therefore also holds those, and that `profile-editor-m3.css`
   declares none.
4. **Step 1, the ripple.** "the three prototype copies" becomes the five, named.
5. **Step 4.** A bullet: replace the literal `font-size:14px` on `card-shell-m3.css`'s field labels
   with `--md-sys-typescale-body-medium-size`. The labels keep their 500 weight and 18px line
   height. They are not Body Medium (400, 20px), so only the size moves to the token. The
   recommendation said "the Body Medium variables", and this is the narrower, correct form.
6. **Step 5.** The pointer to "the checks recorded in each prototype's NOTES" is replaced by the
   full checklist, as a nested checkbox list. It holds the review's ten entries, verbatim, plus
   Tooltips (on the three pages) and `DISCARD-DIALOG/`. It is declared the one maintained from
   here on.
7. **Assumptions.**
   - "The prerequisites come first" becomes "The prerequisites are done".
   - "The browser floor" adds `:user-valid` / `:user-invalid` beside `:has()`.

One consistency edit beyond the seven
- **The compliance review section.** "pending the browser checklist in that review's NOTES"
  now points to Step 5's checklist. It notes that the checklist was first gathered in the
  review's NOTES and that Step 5's copy is maintained. Without this, the plan would have named
  two checklists, as recommendation 1's Con warned.

The checklist in the NOTES of REQUIREMENT "Question: Everything Prototyped in Material3?" is left
as found. The plan's Step 5 copy is the one that counts from here on.

Checks
- Each edit was re-read against the prototype files:
  - **Type and corners.** Headline Small, Title Large, Body Medium, Body Small and Label Large
    are used through tokens. The corners in use are full, extra-large (28px), medium, small and
    extra-small.
  - **Tokens.** Declarations per layer: `pollCard-m3.css` 93, `header-tab-bar-m3.css` 11,
    `card-shell-m3.css` 10, `tooltip-m3.css` 6, `tabs-modal-m3.css` 4, `discard-dialog-m3.css`
    4, `live-idle-prompt-m3.css` 1, `profile-editor-m3.css` 0, `empty-tab-line-m3.css` 0.
  - **Ripple scripts.** There are five, plus `tooltip-m3.js`, which is not a ripple.
  - **The literal.** `card-shell-m3.css` line 71.
- A diff of the plan against its state before this instruction shows only these eight edits.
- The heading structure is unchanged, the prototype table still has six columns on every row, and
  the lists are well formed.

# REQUIREMENT Merge Material 3 Admin page

[X] Resolved

## SHORT SUMMARY
Bring the admin-card prototype (`NON-ADMIN-POLL-EDITING/admin-cards.html`) into 024 by adding it
to `designDocs/024-high-level-requirements-MATERIAL3-MERGE.md`.

Found while reading:
- **The plan excludes it today.** Under "What the prototypes are", "Afterwards: the admin
  feature" and Exclusions, the plan calls the Poll Editing Card "not a restyle" and makes it a
  separate feature (025 or later). That section and the Exclusions would change.
- **It is a redesign, not a layer.**
  - `adminCard.js` differs from production in about 1,600 lines. It adds the five-step
    new-poll wizard, the anonymity switch, the Settings Summary, the redesigned read-only face
    and the state-worded when-line (A24–A31 in `accepted-recommendations.md`).
  - `admin.css` differs in about 580 lines. The prototype's `pollCard.css`, `site.css`,
    `tabs.css` and `styles.css` match production.
- **It is not on the 024 foundation.** Its controls "imitate Material 3" in hand-written CSS
  (A24.3), in CrowdPoll's palette, with Inter and Fraunces. No rule reads an `--md-sys-*`
  token. It has no dark scheme, no `m3-ripple.js` and no `tooltip-m3.js`. Its fields imitate
  Samsung One UI.
- **It needs two server changes. The plan says there are none.**
  - `createDefaultPoll` defaults to `Dynamic-Vote Poll` (A28.1).
  - The admin list row carries `pollStateBeforeEditUpdate`, so an EDITING poll's when-line is
    worded exactly (A31). That row is in `postman/openapi.json`.
- **It covers the cards only.** It has no admin toolbar, search, back link or header, and no
  `admin-results.html`.
- **Its `confirmDiscard()` still calls `window.confirm`**, including from the wizard's Cancel.
  The plan already says the merged card takes 024's Not Saved dialog.
- **024 is implemented on the branch.** 51 of its 53 tasks are done. T050 (the browser
  checklist) and T052 (the Step 5 pull request) remain, and nothing has reached `dev`.

## REQUIREMENT DETAILS
The Admin page has been prototyped to use Material 3 in:
`prototypes\POLL-CARD-MATERIAL3\NON-ADMIN-POLL-EDITING\admin-cards.html`

Please add this to the merge as described in:
`designDocs\024-high-level-requirements-MATERIAL3-MERGE.md`

## CLARIFICATIONS

1. Where the admin cards go in 024
[X] Resolved
Steps 1–5 are built on the branch, and `dev` is to get 024 once. The plan needs a place for the
admin cards that keeps that rule.

a. A new Step 6 on the 024 branch, before 024 reaches `dev`
Recommended
[X] Accepted
"Afterwards: the admin feature" becomes Step 6, with its own pull request into
`024-MATERIAL3-MERGE`. T052 merges to `dev` only after Step 6. Steps 1–5 are untouched. The
spec, plan and tasks then take Step 6 as an addition, through `/speckit-specify` onward.

b. Insert it before Step 5 and renumber
[ ] Accepted
This keeps dark mode last, as the plan's route says. But Step 5 is already built, so its pull
request and tasks would be reordered after the fact.

c. Keep it a separate feature (025), as the plan says today
[ ] Accepted
Only "Afterwards: the admin feature" is expanded, with what 025 must do. 024 ships as planned.
This does not add the admin cards to 024 as asked.

Other.
[ ] Accepted


2. The prototype is not on the M3 foundation
[X] Resolved
Every other 024 surface was prototyped on the M3 roles, Roboto, the ripple and a dark scheme
before it was merged (the plan's Prerequisites). The admin cards imitate M3 in hand-written CSS
in CrowdPoll's palette.

a. Re-prototype it on the M3 foundation first, as a prerequisite requirement in this file
Recommended
[X] Accepted
A requirement in this file, "Use Material 3 For the admin cards", moves `admin-cards.html`
onto the 024 layers in the prototype, as was done for every other surface:
- `m3-tokens.css`, the M3 roles, Roboto, `m3-ripple.js`, `tooltip-m3.js` and the 024 Not Saved
  dialog;
- underlined fields in the card-shell style, and a dark scheme;
- an M3 layer, `admin-card-m3.css`, loaded last, with production's `admin.css` changes kept
  apart.

Step 6 then ports a finished prototype, and the browser checklist gains an entry for it. The
prototype stays the design source of truth (Assumptions).

b. Merge it as prototyped, and convert it to the M3 tokens while merging
[ ] Accepted
This is faster, but the merged look would exist only in production code, with no prototype to
check it against in Light and Dark.

c. Merge it as prototyped, CrowdPoll palette and Inter, and convert it later
[ ] Accepted
The admin page would then be the one page that is not Material 3, and it cannot be dark.

Other.
[ ] Accepted


3. How much of the prototype is merged
[X] Resolved
The prototype is the look plus new behaviour: the wizard, the anonymity switch, the Settings
Summary, the read-only face and the when-line.

a. All of it, as resolved in `NON-ADMIN-POLL-EDITING/iterative-requirements.md`
Recommended
[X] Accepted
That is REQUIREMENT001–022 and A24–A31, including the 420px fluid card width. "Editing after
publishing" stays as production has it today, since A24.6 defers it. Functional Requirements
lists each behaviour change.

b. The M3 look only, on today's admin card, with no new behaviour
[ ] Accepted
This is the smallest change, but no prototype shows today's card in M3. One would have to be
made first.

Other.
[ ] Accepted


4. The two server changes the prototype needs
[X] Resolved
024 says "No server, route, contract, configuration or database change". The prototype assumes
two.

a. Allow both, named as the only server changes in 024
Recommended
[X] Accepted
- `createDefaultPoll` (`src/polls/service.ts`) defaults to `Dynamic-Vote Poll` (A28.1).
- `adminListRow` (`src/routes/pollsApi.ts`) adds `pollStateBeforeEditUpdate`, which already
  exists on the poll row. `postman/openapi.json` describes it.

Each change gets a server test. There is no route, configuration or database change.

b. Client only: keep the server as it is
[ ] Accepted
New polls keep `Final-Vote Poll`, and an EDITING poll is worded from `launchedAt` (A31's
fallback). Steps 1–6 then still change no server code.

Other.
[ ] Accepted


5. The rest of the admin pages
[X] Resolved
The prototype covers only the cards. On `admin.html`, the header is already M3 (Step 2), but the
toolbar, search, back link and list notices are not, and `admin-results.html` has no prototype.

a. Only the cards on `admin.html`
Recommended
[X] Accepted
The toolbar, search, back link and `admin-results.html` keep their current look. Restyling them
stays the later admin feature, which needs its own prototype first.

b. Prototype and merge the toolbar, search and `admin-results.html` too
[ ] Accepted
The admin pages become fully M3 in 024, but two more prototypes come first.

Other.
[ ] Accepted


6. Dark mode on the admin pages
[X] Resolved
Step 5 gives `admin.html` and `admin-results.html` `data-theme="light"`, because their content
has no dark styles.

a. Both admin pages keep `data-theme="light"`
Recommended
[X] Accepted
The card's dark blocks are ported and can be tested with `data-theme="dark"`. The page follows
the system once the toolbar has dark styles too (clarification 5a). The page test is unchanged.

b. `admin.html` drops `data-theme="light"` in Step 6
[ ] Accepted
The cards go dark with the system. The toolbar relies on production's tokens, which
`m3-tokens.css` restates in dark, and any literal colours in `admin.css` would need dark twins
or be accepted as found.

Other.
[ ] Accepted


7. The wizard's Cancel and the Not Saved dialog
[X] Resolved
A24.4 has the wizard's Cancel ask "Any edits will be lost. Continue?". 024 replaced that with
the page dialog "Discard changes?".

a. Every Cancel on the card uses 024's `confirmDiscard()` page dialog
Recommended
[X] Accepted
The wizard's Cancel, the edit face's Cancel and the back link all await the one
`Promise<boolean>` dialog, with **Keep editing** and **Discard**. A24.4's wording is superseded.

Other.
[ ] Accepted


8. Who gets the new card
[X] Resolved
The prototype is named NON-ADMIN because A16 and A24 plan poll creation for every user. That
also needs the Your Polls tab and the other tabs in A1–A23.

a. The admin page only, still gated by `ENV_ADMINS`
Recommended
[X] Accepted
024 merges the card into `admin.html` for admins. Creating polls as a non-admin, and the tabs and
links in A1–A23, stay later features.

Other.
[ ] Accepted

## RECOMMENDATION
[X] Resolved

Found while writing these:
- **Step 4's range needs a database change.** The prototype's "From [a] to [b] choices" and
  "Exactly [k] choices" save `minSelections` / `maxSelections` (A28.2, A28.4). Production has
  neither column. `validatePollFields` (`src/polls/service.ts`) ignores fields it does not know,
  so, merged as is, an "Exactly 2" poll would be saved silently as a plain multiple-choice poll,
  with voters free to pick 1 to N. Clarification 4a allows two server changes and no database
  change, so the recommendations below differ on this point only.
- **The anonymity switch's help text promises more than production does** (A25.4): "the names
  of voters are shown next to the choices they picked". In production, only admins see who voted
  for what. A25.4 defers how voters would see it. The switch stores `voteAnonymity`, as the admin
  card's radio group does today.

1. Step 6 in the plan, the prerequisite requirement in this file, and the range left out
Recommended
[X] Accepted
This builds what clarifications 1a–8a chose. It changes two files:
- `designDocs/024-high-level-requirements-MATERIAL3-MERGE.md`, through targeted edits;
- this file, through one new requirement at the end.

The new requirement in this file (clarification 2a):
- **# REQUIREMENT Use Material 3 For the admin cards**, with `[ ] Resolved` and
  REQUIREMENT DETAILS only. Its clarifications come when it is the current requirement.
- It moves `NON-ADMIN-POLL-EDITING/admin-cards.html` onto the 024 layers:
  - `m3-tokens.css`, Roboto, `m3-ripple.js`, `tooltip-m3.js`, and 024's Not Saved dialog
    (`TABS-MODAL/` and `DISCARD-DIALOG/`'s layers) for every Cancel;
  - underlined fields in `card-shell-m3.css`'s style, in place of the One UI fields;
  - an M3 layer, `admin-card-m3.css`, loaded last, with a `data-theme="dark"` scheme and a Theme
    picker, as the other prototypes have;
  - the production sheets kept as byte-identical copies, with only the admin-card changes in
    `admin.css`.
- It drops Step 4's range: "More than one" saves `Multiple-Choice Poll`, which allows 1 to N, as
  today.

The plan's edits, each a targeted replacement:
1. **Overview.** The route's parts name the admin cards: after the areas, the admin cards
   merge as Step 6, and dark mode switches on in Step 5 as before.
2. **What the prototypes are.**
   - The table gains a row:
     - Poll Editing Card, `NON-ADMIN-POLL-EDITING/admin-cards.html`, `admin-card-m3.css`;
     - its production changes: the prototype's `adminCard.js` and `admin.css` changes, and the
       two server changes (Step 6).
   - The paragraph "The Poll Editing Card prototype … is not a restyle … a separate feature"
     becomes: it is a redesign as well as a restyle, and it merges whole in Step 6.
3. **Prerequisites.**
   - The heading loses ": done" until the new requirement is resolved.
   - A bullet adds the admin cards on the M3 foundation.
   - "The admin list and results pages … are not prototyped here" now names what is left:
     the admin toolbar, search, back link, list notices and `admin-results.html`.
4. **Branching.** `dev` receives 024 once, after Step 6, not after Step 5.
5. **Step 5.**
   - The two admin pages keep `data-theme="light"` until the admin toolbar, search and
     `admin-results.html` have dark styles (clarification 6a), not "until the admin feature
     ports their content".
   - "024 then merges to `dev`" moves to the end of Step 6.
6. **A new section, "Step 6: the admin cards".**
   - Port `admin-card-m3.css` as `src/public/admin-card-m3.css`, reading `m3-tokens.css`.
     `admin.html` links it last. Only its `data-theme="dark"` blocks are ported, as for every
     layer, and its `@media` twins are added with Step 5's.
   - `adminCard.js` takes the prototype's version. It keeps production's 024 edits:
     - `confirmDiscard()` as Step 2's page dialog (`Promise<boolean>`);
     - `.modal .modal-action` registered with `m3-ripple.js`;
     - the wizard's controls registered too.
   - `admin.css` takes the prototype's admin-card changes.
   - What it brings (clarification 3a), each traced to `accepted-recommendations.md`:
     - the five-step wizard for an INITIALIZED poll, with Save, Cancel and Publish (A24–A29);
     - Step 1's anonymity switch (A25.4);
     - the Settings Summary (A24.3);
     - the read-only face (A30);
     - the state-worded when-line (A31);
     - every admin card fluid to 420px, the wizard down to a 320px window (A24.5).
   - What it leaves:
     - Editing after publishing stays as production has it (A24.6).
     - Step 4's range is not merged (above).
     - The cards stay on `admin.html`, gated by `ENV_ADMINS` (clarification 8a).
   - Every Cancel on the card, the wizard's included, awaits `confirmDiscard()`. A24.4's "Any
     edits will be lost. Continue?" is superseded (clarification 7a).
   - The two server changes (clarification 4a):
     - `createDefaultPoll` defaults to `Dynamic-Vote Poll` (A28.1);
     - `adminListRow` adds `pollStateBeforeEditUpdate`, and `postman/openapi.json`
       describes it.
     - Each gets a server test.
   - Tests:
     - client tests for the wizard's steps, the Named Circles, Publish's enabling, Save and
       reopening, every Cancel through the dialog, the anonymity switch, and the when-line
       per state;
     - the existing admin client tests updated where the read-only face changed;
     - the page test for `admin.html`'s new link.
   - The Step 5 browser checklist gains an entry for `admin-cards.html`, in Light and Dark,
     at 320px, 360px and desktop widths. The entry is written when the prototype is finished.
   - 024 then merges to `dev`.
7. **Afterwards: the admin feature.** This narrows to what is left:
   - the admin toolbar, search, back link, list notices and `admin-results.html`, prototyped
     first;
   - removing `data-theme="light"` from the two admin pages;
   - poll creation for every user, and the tabs in A1–A23;
   - editing after publishing (A24.6);
   - Step 4's range (`minSelections` / `maxSelections`, A28.4).
8. **Effect on the current implementation.**
   - The admin pages' own content is unchanged except the Not Saved dialog (Step 2) and the
     admin cards (Step 6).
   - New files gain `admin-card-m3.css` (Step 6).
   - The page × file table gains its row (`admin` only).
   - Changed scripts: `adminCard.js` (Step 6). Changed styles: `admin.css` (Step 6).
   - A new bullet, **Server**, names `src/polls/service.ts`, `src/routes/pollsApi.ts` and
     `postman/openapi.json`.
9. **Material 3 compliance review.** A bullet: the admin cards were brought into 024 after the
   review, and prototyped on the M3 foundation by the new requirement.
10. **Functional Requirements.** Bullets for:
    - the wizard, the Settings Summary, the read-only face and the when-line on the admin page;
    - Cancel in the wizard asking "Discard changes?";
    - new polls defaulting to `Dynamic-Vote Poll`.
11. **Assumptions.** "The prerequisites are done" becomes "done, except the admin cards, which
    are resolved before Step 6 starts".
12. **Exclusions.**
    - The first bullet becomes poll creation for non-admins, the A1–A23 tabs, editing after
      publishing, Step 4's range, and the admin toolbar, search and results pages.
    - "Any server, route, `postman/openapi.json` … change" becomes: any server change beyond
      Step 6's two, and any route, configuration or database change.

Checks
- Each claim about the prototype is re-read against `NON-ADMIN-POLL-EDITING/`: `adminCard.js`,
  `admin.css`, `harness.js` and `accepted-recommendations.md` A24–A31.
- Each claim about production is re-read against `src/polls/service.ts`,
  `src/routes/pollsApi.ts` and `src/public/adminCard.js`.
- The plan's Markdown is re-read for broken lists and tables, and the page × file table still
  has eight columns on every row.
- A diff of the plan shows only the twelve edits.

Pros:
- Step 6 merges a finished M3 prototype, as every other area did.
- No database change, so clarification 4a holds as written.
- No poll is saved with a setting the server drops.

Cons:
- The wizard loses "Exactly [k]" and "From [a] to [b]" until the range feature.
- 024 waits for one more prototype before it reaches `dev`.

2. The same, with Step 4's range merged as a third server change
[ ] Accepted
Edits 1–12 and the new requirement as in recommendation 1, except Step 4's range stays in the
prototype and in Step 6. Step 6 adds:
- `minSelections` / `maxSelections` columns on `polls` (a migration), defaulting existing polls
  to 1 / (their number of choices);
- `validatePollFields` checks 1 ≤ min ≤ max ≤ choices;
- `validateVoteChoicesAndState` refuses a vote outside the range;
- `postman/openapi.json` describes both fields.

The Poll Card does not yet tell voters what to pick (A28.4 makes that a later requirement), so a
vote outside the range is refused by the server with its error.

Pros:
- The wizard merges whole, as clarification 3a reads.

Cons:
- A database change and a voting-rule change, which clarification 4a excluded.
- Voters meet a refusal they were not warned about until the Poll Card is updated.

## NOTES
Implemented recommendation 1, with clarifications 1a–8a. Two files changed:
`designDocs/024-high-level-requirements-MATERIAL3-MERGE.md` (the twelve edits below) and this file
(the new requirement after this one).

The twelve edits, each a targeted replacement:
1. **Overview.** The route has four parts: the admin cards merge last, as Step 6.
2. **What the prototypes are.**
   - The table gains the Poll Editing Card row: `admin-cards.html`, `admin-card-m3.css`, and
     the prototype's `adminCard.js` / `admin.css` changes with the two server changes.
   - The "not a restyle … separate feature" paragraph now says it merges whole in Step 6, except
     Step 4's range.
3. **Prerequisites.**
   - The heading loses ": done", and the intro reads "All are resolved except the last".
   - A bullet adds REQUIREMENT "Use Material 3 For the admin cards", open, resolved before Step 6
     starts.
   - The closing paragraph names what is still unprototyped: the toolbar, search, back link,
     list notices and `admin-results.html`.
4. **Branching.** `dev` receives 024 once, after Step 6.
5. **Step 5.**
   - The admin pages stay light, "admin cards (Step 6) included", until the toolbar, search and
     `admin-results.html` have dark styles.
   - "024 then merges to `dev`" moved to the end of Step 6.
6. **Step 6: the admin cards**, a new section between Step 5 and "Afterwards". Its content is as
   recommended: the port, `adminCard.js` keeping the 024 edits, `admin.css`, what it brings
   (A24–A31), what it leaves, every Cancel through `confirmDiscard()`, the two server changes, the
   tests, and the checklist entry.
7. **Afterwards: the admin feature** narrows to what is left: the toolbar, search, back link,
   list notices and `admin-results.html`; removing `data-theme="light"`; poll creation for every
   user and the A1–A23 tabs; editing after publishing; Step 4's range.
8. **Effect on the current implementation.**
   - The admin pages' own content changes by the Not Saved dialog and the admin cards.
   - `admin-card-m3.css` is added to the new files, and to the page × file table (`admin` only).
   - `adminCard.js` (Step 6) is added to the changed scripts, and `admin.css` to the changed styles.
   - A new **Server (Step 6 only)** bullet names `src/polls/service.ts`,
     `src/routes/pollsApi.ts` and `postman/openapi.json`.
9. **Material 3 compliance review.** A bullet: the admin cards were brought in after the review.
10. **Functional Requirements.** An "admin cards (Step 6)" bullet: the wizard, the Settings
    Summary, the read-only face, the when-line, the wizard's Cancel asking "Discard changes?", and
    the `Dynamic-Vote Poll` default.
11. **Assumptions.** "The prerequisites are done, except the admin cards".
12. **Exclusions.**
    - The first bullet now lists what stays out from `NON-ADMIN-POLL-EDITING/` and the rest of
      the admin pages.
    - "Any server, route … change" became "Any server change beyond Step 6's two, and any route,
      configuration or database change".

Departures from the recommendation's wording
- **Step 6's dark blocks.** The recommendation said only the `data-theme="dark"` blocks are
  ported, with their `@media` twins added "with Step 5's". Step 6 runs after Step 5, so Step 6
  ports both forms at once. `admin.html` still stays light (clarification 6a).
- **The `postman/openapi.json` change** names the admin list and the admin search responses,
  because both routes return `adminListRow` (`src/routes/pollsApi.ts`, lines 477 and 531).
- **The server tests** name the two existing assertions that change:
  `tests/polls-service.test.ts` line 217 and `tests/polls-admin-crud.test.ts` line 41 both
  assert `Final-Vote Poll` today.
- **Who sees who voted for what** is stated in Step 6 as unchanged (admins only). The switch's
  help text says voters see it, which A25.4 defers.

Not changed here
- `CLAUDE.md`, `specs/024-MATERIAL3-MERGE/` and `architecture/024-material3-merge/`. Clarification
  1a takes Step 6 into the spec, plan and tasks through `/speckit-specify` onward.
- The NON-ADMIN-POLL-EDITING prototype. The new requirement below changes it.

Checks
- **Prototype claims.** Re-read against `NON-ADMIN-POLL-EDITING/`:
  - `adminCard.js`'s `wizardFields()` sends `minSelections` / `maxSelections` and
    `voteAnonymity`;
  - `harness.js` stores the range;
  - `accepted-recommendations.md` A24–A31.
- **Production claims.**
  - `validatePollFields` (`src/polls/service.ts`) reads only the fields it names.
  - `createDefaultPoll` is at line 89.
  - `adminListRow` (`src/routes/pollsApi.ts`) has no `pollStateBeforeEditUpdate` today.
- **Tables.** The prototype table has 4 columns on all 15 lines, and the page × file table has 8
  columns on all 12 lines.
- **No stale references.** The plan has no "after Step 5", "three parts", "not a restyle" or
  "separate feature" left. "merges to `dev`" appears once, at the end of Step 6.

# REQUIREMENT Use Material 3 For the admin cards

[X] Resolved

## SHORT SUMMARY
Restyle the admin-card prototype (`NON-ADMIN-POLL-EDITING/admin-cards.html`) in Material 3 on
024's foundation, so Step 6 of the 024 plan ports a finished prototype.

Found while reading:
- **Three cards, three faces.** The harness mounts:
  - a read-only OPEN card with votes;
  - a WAITING TO OPEN card on production's edit face, with its radio groups, choices editor,
    participant lists and dates;
  - a new INITIALIZED card on the wizard.
- **The M3 imitation is in `admin.css`.** All 578 changed lines are there:
  - the wizard;
  - `.m3-radio`, `.m3-field`, `.m3-switch`, `.m3-select`, `.m3-datetime`, the chips,
    `.m3-filled-btn`, `.m3-tonal-btn` and `.m3-snackbar`;
  - the read-only face's icon buttons and menu.

  It uses literal moss, ink, `#F7F8F5` and `#B0242E`, with Inter and Fraunces. No rule reads an
  `--md-sys-*` token.
- **The shared sheets are pre-024 copies.** `site.css` and `tabs.css` match `HEAD`, not the
  working tree's 024 fixes. `styles.css` and `pollCard.css` match both. The copies have CRLF line
  endings, and production has LF.
- **Production's `admin.html` already loads** `m3-tokens.css`, `tooltip-m3.css`,
  `header-tab-bar-m3.css`, `tabs-modal-m3.css` and `discard-dialog-m3.css`, plus `m3-ripple.js`
  and `tooltip-m3.js`. It does not load `pollCard-m3.css` or `card-shell-m3.css`.
- **Publish's tooltip cannot show.** Publish is `disabled` while blocked, and its `title` names
  what is missing. A disabled button gets no pointer or focus events, so `tooltip-m3.js` never
  shows that text. This is why the guest tabs became `aria-disabled` in 024.
- **`confirmDiscard()` still calls `window.confirm`** (adminCard.js line 1798).
- **Step 4's range is dropped**, as already decided (REQUIREMENT "Merge Material 3 Admin page",
  recommendation 1). `wizardFields()` sends `minSelections` / `maxSelections` today.

## REQUIREMENT DETAILS
Move the admin-card prototype, `prototypes\POLL-CARD-MATERIAL3\NON-ADMIN-POLL-EDITING\admin-cards.html`,
onto the 024 Material 3 foundation, as was done for every other surface. It is the prerequisite
for Step 6 of `designDocs\024-high-level-requirements-MATERIAL3-MERGE.md` (REQUIREMENT "Merge
Material 3 Admin page", clarification 2a and recommendation 1):
- `m3-tokens.css`, the M3 roles, Roboto, `m3-ripple.js` and `tooltip-m3.js`;
- 024's Not Saved dialog (`TABS-MODAL/` and `DISCARD-DIALOG/`'s layers) for every Cancel, the
  wizard's included, in place of `window.confirm`;
- underlined fields in `card-shell-m3.css`'s style, in place of the Samsung One UI fields;
- an M3 layer, `admin-card-m3.css`, loaded last, with a dark scheme and a Theme picker, as the
  other prototypes have;
- the production sheets kept as byte-identical copies, with only the admin-card changes in
  `admin.css`;
- Step 4's range dropped: "More than one" saves `Multiple-Choice Poll`, which allows 1 to N, as
  today.

## CLARIFICATIONS

1. Where the M3 prototype lives
[X] Resolved
The 024 plan names `NON-ADMIN-POLL-EDITING/admin-cards.html` as Step 6's prototype.

a. In place, in `NON-ADMIN-POLL-EDITING/`
Recommended
[ ] Accepted
`admin-cards.html` gains the M3 layers and a Theme picker. The pre-M3 look stays in git history.
The plan's path stays right.

b. A copy in a new folder, `ADMIN-CARDS/`, beside the other M3 prototypes
[X] Accepted
`NON-ADMIN-POLL-EDITING/` keeps the pre-M3 look, side by side with the new one. The plan's
Step 6 path changes, and the two copies of `adminCard.js` can drift apart.

Other.
[ ] Accepted


2. The shared files the prototype loads
[X] Resolved
The other prototypes read their tokens from the prototype root's `pollCard-m3.css`. Production
now has the merged `m3-tokens.css` and the other 024 files.

a. Byte-identical copies of production's 024 files, loaded in `admin.html`'s order
[ ] Accepted
- The folder copies `src/public`'s current `m3-tokens.css`, `m3-ripple.js`, `tooltip-m3.css`,
  `tooltip-m3.js`, `tabs-modal-m3.css` and `discard-dialog-m3.css`.
- It refreshes its `site.css` and `tabs.css` to the working tree's 024 versions.
- All the copies use LF line endings.
- `admin-cards.html` links the sheets and scripts exactly as `admin.html` does, then
  `admin-card-m3.css` last, with Roboto added to its font link.

Step 6's port is then a copy of `admin-card-m3.css` and `adminCard.js`.

b. Link the prototype root's shared files, as the other prototypes do
Recommended
[X] Accepted
It would use `../pollCard-m3.css` for the tokens, `../tooltip-m3.*`, and the
`../TABS-MODAL/` and `../DISCARD-DIALOG/` layers. This is less copying, but `pollCard-m3.css`
brings Poll Card rules that `admin.html` does not load. Its tokens are also the pre-merge set.

Accepted with two refinements (from the discussion of the pros and cons):
- **The base sheets stay local.** `ADMIN-CARDS/` keeps its own copies of the base sheets
  `admin.html` loads (`styles.css`, `tabs.css`, `pollCard.css`, `site.css`, `admin.css`), so the
  cards sit on production's base. Only the M3 shared files come from the root.
- **Its own ripple script.** `ADMIN-CARDS/admin-card-m3.js` registers the cards' targets, as
  each prototype has its own copy. The root's `pollCard-m3.js` registers only Poll Card targets.

Consequences:
- `pollCard-m3.css` and the admin cards share only `.question` and `.subtitle`.
  `admin-card-m3.css` restates what the Settings Summary needs from them (clarification 7),
  since `admin.html` does not load `pollCard-m3.css`.
- Step 6 is a normal 024 port. It drops the token sections and the REQUIREMENT comments, and
  moves the ripple registration into `adminCard.js` as `window.M3Ripple?.add(…)`.

Other.
[ ] Accepted


3. Where the wizard's styles go
[X] Resolved
The 578 changed lines in `admin.css` are both the layout and the hand-written M3 imitation.

a. Move the control styles into `admin-card-m3.css`, rewritten on the M3 roles
Recommended
[X] Accepted
- **The M3 layer:** `.m3-radio`, `.m3-field`, `.m3-switch`, `.m3-select`, `.m3-datetime`, the
  chips, the filled and tonal buttons, the snackbar, the Named Circles, the Settings Summary's
  type, and the read-only face's icon buttons and menu move to `admin-card-m3.css`. There they
  read `--md-sys-*` tokens, with a `data-theme="dark"` block.
- **`admin.css`:** keeps only the layout changes, such as the 420px fluid width, the
  wizard's grid and spacing, and the 320px floor. These are the changes Step 6 ports into
  production's `admin.css`.
- **No double rules:** no moss, ink or Inter rule ships only to be overridden.

b. Keep `admin.css` as prototyped, and override it in `admin-card-m3.css`
[ ] Accepted
This is the layer pattern the restyles used, where production's sheet was unchanged. Here
`admin.css`'s 578 lines are new, so the imitation would ship and be overridden, and each control
would be styled twice.

Other.
[ ] Accepted


4. The edit face
[X] Resolved
The WAITING TO OPEN card shows production's edit face. It has radio groups, the choices editor,
the participant and banned-voter lists with paging, the dates and Save / Cancel. It has no M3 look
and no dark styles. A24.6 defers its redesign, not its look.

a. Restyle the edit face too, in `admin-card-m3.css`, with no change in behaviour
Recommended
[X] Accepted
Its controls take the wizard's M3 versions:
- the radios;
- the underlined fields;
- the filled and text buttons;
- the paging as icon buttons.

Its markup and behaviour are unchanged. `admin.html` then shows one look, and the cards hold up
in Dark.

b. The wizard and the read-only face only
[ ] Accepted
The edit face keeps its current look until A24.6's redesign. The merged page then shows two
looks on one card list, and the edit face cannot be checked in Dark.

Other.
[ ] Accepted


5. The Named Circles
[X] Resolved
Material 3 has no stepper component. The circles are A24.3's design, in moss and ink.

a. Keep the design, in M3 roles
Recommended
[X] Accepted
- **Current:** an outlined number with a `primary` ring, and its short name in Label Medium,
  bold, in `primary`.
- **Visited:** a filled `primary` circle with an `on-primary` check, tappable, with the state
  layer and ripple.
- **Not yet visited:** an `outline-variant` ring, with `on-surface` at 38% for the number and
  the name. It is inert.
- **The joining line:** `outline-variant`.

The names use Label Small, and keep 11px below 360px (A24.5).

b. Replace them with an M3 linear progress indicator and "Step N of 5"
[ ] Accepted
This is closer to a stock M3 component, but it loses tapping a visited step to go back, which
A24.3 relies on, since there is no Back button.

Other.
[ ] Accepted


6. Publish's tooltip while it is blocked
[X] Resolved
Publish is `disabled` while blocked, and its `title` names what is missing. A disabled button gets
no pointer or focus events, so the M3 tooltip never shows.

a. Publish becomes `aria-disabled="true"` while blocked
Recommended
[X] Accepted
- Its click is ignored while blocked.
- It takes the M3 disabled colours, with no state layer or ripple, as the guest tabs do.
- Hover, keyboard focus and a long press show the tooltip naming what is missing.
- `m3-ripple.js` already skips `[aria-disabled="true"]`.

b. Keep `disabled`, and show what is missing as supporting text above the footer
[ ] Accepted
The text is always visible, with no tooltip. It is one more line on a phone-sized card.

Other.
[ ] Accepted


7. Colour, type and shape
[X] Resolved
A24.3 asked for CrowdPoll's palette, "not Material's purple". 024's roles are generated from the
moss seed, with `primary` `#2C6A46` in light.

a. The M3 roles and type scale throughout the cards
Recommended
[X] Accepted
- **Colour:**
  - moss becomes `primary`, ink becomes `on-surface`, and `#B0242E` becomes `error`;
  - the snackbar takes the inverse roles, as `card-shell-m3.css`'s does;
  - the filled buttons are `primary`, and Copy link is tonal (`secondary-container`).
- **Type:** Roboto on the M3 scale, with no Inter or Fraunces on the cards.
  - The Settings Summary's title and subtitle match the M3 Poll Card's (`pollCard-m3.css`),
    since A24.3 says "exactly as on a Poll Card".
- **Shape:** the M3 corner tokens.
- **The footer:** Cancel and Save are outlined buttons, and Publish is a filled button, in
  place of `btn-header-ghost` / `btn-header-primary`.

Other.
[ ] Accepted


## RECOMMENDATION
[X] Resolved

1. A new `ADMIN-CARDS/` from the NON-ADMIN copy, with 024's edits applied to it
Recommended
[X] Accepted
This builds what clarifications 1b–7a chose. `NON-ADMIN-POLL-EDITING/` is not changed.

**The folder, `prototypes/POLL-CARD-MATERIAL3/ADMIN-CARDS/`**
- **`admin-cards.html`.** It is `NON-ADMIN-POLL-EDITING/admin-cards.html` with:
  - the sheets in `admin.html`'s order, then the M3 layers;
  - Roboto added to the font link;
  - a Theme picker (System / Light / Dark), as the other prototypes have.
- **Local base sheets** (clarification 2b), byte-identical to the working tree's `src/public`,
  in LF: `styles.css`, `tabs.css` and `site.css`, which hold the 024 fixes, and `pollCard.css`.
  Production's `tabs.css` already holds `.tab-refresh` and the modal block, so
  `../TABS-MODAL/tabs-modal.css` is not needed.
- **`admin.css`.** Production's `admin.css` plus only the layout part of
  `NON-ADMIN-POLL-EDITING/admin.css`'s changes (clarification 3a):
  - the card's 420px fluid width;
  - the wizard's grid, spacing and 292px floor, and the tighter spacing below 360px;
  - the read-only face's layout.

  This file is exactly what Step 6 ports into production's `admin.css`.
- **The root's M3 files, linked:** `../pollCard-m3.css` (the tokens, the `.m3-ripple` rules and
  `.question` / `.subtitle`), `../tooltip-m3.css`, `../tooltip-m3.js`,
  `../TABS-MODAL/tabs-modal-m3.css` and `../DISCARD-DIALOG/discard-dialog-m3.css`.
- **`admin-card-m3.css`, loaded last** (clarifications 3a, 4a, 5a, 7a). Its sections:
  1. tokens the root files do not declare (each named in a comment);
  2. type: Roboto on the M3 scale for the cards;
  3. the card container;
  4. the read-only face: the state button, the 40px icon buttons, and the actions menu as an M3
     menu;
  5. the Settings Summary: the title and subtitle as the M3 Poll Card's, and the tappable parts;
  6. the Named Circles in M3 roles (5a);
  7. the step panel, the M3 radio list and the switch;
  8. the underlined fields, in `card-shell-m3.css`'s look but on the cards' own `.m3-field`
     classes: title, subtitle, keyword chips and choices;
  9. the selects and the date and time inputs, underlined;
  10. the buttons: Next filled, Copy link tonal, Cancel and Save outlined, Publish filled, and the
      help link as a text button;
  11. the snackbar on the inverse roles;
  12. the edit face (4a): its radio groups, fields, choices editor, participant and
      banned-voter lists, paging as icon buttons, dates, and Save / Cancel;
  13. the state layers, the 3px `secondary` focus ring, and `[aria-disabled="true"]` (6a);
  14. dark: a `:root[data-theme="dark"]` block and its `@media (prefers-color-scheme: dark)`
      twin, as every prototype layer has.

  Colour, type and shape come only from `--md-sys-*` tokens. The literal moss, ink, `#F7F8F5`
  and `#B0242E` go.
- **`admin-card-m3.js`.** The ripple, copied from `../DISCARD-DIALOG/discard-dialog-m3.js`, and
  aimed at the cards' targets. It skips `disabled` and `[aria-disabled="true"]`.
- **`adminCard.js`.** `NON-ADMIN-POLL-EDITING/adminCard.js`, with these changes, each marked
  `M3:`:
  - **024's 58-line edit,** taken from `src/public/adminCard.js`: `confirmDiscard()` as the page
    dialog returning a `Promise<boolean>`, and `.modal .modal-action` registered with
    `window.M3Ripple?.add(…)`.
  - **Every caller awaits `confirmDiscard()`,** the wizard's Cancel included. A24.4's wording
    goes.
  - **Publish is `aria-disabled="true"` while blocked** (6a). Its click handler returns early
    while blocked, and its `title` still names what is missing.
  - **Step 4's range is dropped.** "More than one" has no sub-options, and saves
    `Multiple-Choice Poll`. `wizardFields()` sends no `minSelections` / `maxSelections`, and the
    clamping notes go.
  - **The classes `admin-card-m3.css` needs.** These are added only where the markup has no
    hook, such as the state of a Named Circle.
- **`harness.js`.** `NON-ADMIN-POLL-EDITING/harness.js`, with the same three fixture cards, plus:
  - the Theme picker;
  - the range storage removed;
  - both exits (Cancel and the stand-in back link) shown through the dialog.

**The 024 plan.** Targeted edits only. Step 6, Prerequisites and the Step 5 checklist point to
`ADMIN-CARDS/admin-cards.html`. Step 6 notes that the port drops the token sections and the
REQUIREMENT comments, and moves `admin-card-m3.js`'s targets into `adminCard.js` as
`window.M3Ripple?.add(…)`.

**Checks (no browser in the sandbox)**
- **jsdom:**
  - the page loads in Light, Dark and System with no script errors;
  - each card's face renders;
  - the wizard steps through all five steps;
  - Cancel with edits opens "Discard changes?";
  - a blocked Publish has `aria-disabled="true"`, no `disabled`, and a tooltip;
  - no request carries `minSelections` / `maxSelections`.
- **Styles:**
  - every class `adminCard.js` creates is styled by `admin-card-m3.css` or is a layout wrapper;
  - `admin-card-m3.css` parses (css-tree), and has no literal colour outside its token
    declarations;
  - the base sheets are byte-identical to `src/public`.
- **The browser checklist entry** for `ADMIN-CARDS/admin-cards.html` is written into NOTES and
  into the plan's Step 5. It covers Light and Dark at 320px, 360px and desktop widths, on every
  face and every step, by mouse, keyboard and touch.

Pros:
- `adminCard.js` starts from the resolved prototype, so A24–A31 stay exactly as designed. Only
  024's 58 lines and the four marked changes are applied to it.
- Step 6 ports a prototype whose base sheets are already production's.

Cons:
- `adminCard.js` exists three times until Step 6: production, NON-ADMIN and ADMIN-CARDS.
- The look can only be checked in the developer's browser.

2. The same, but `adminCard.js` starts from production's file
[ ] Accepted
As recommendation 1, except `ADMIN-CARDS/adminCard.js` starts from `src/public/adminCard.js`,
which has 024's edits. The NON-ADMIN prototype's 1,607 changed lines are then applied to it, with
the same four changes.

Pros:
- The file is Step 6's port as it stands.

Cons:
- The 1,607 lines are applied by hand, so the risk of leaving something out of A24–A31 is much
  higher than with 58 lines. Recommendation 1 ends with the same file.

## NOTES
Implemented recommendation 1, with clarifications 1b–7a. The prototype is
`prototypes/POLL-CARD-MATERIAL3/ADMIN-CARDS/admin-cards.html`. `NON-ADMIN-POLL-EDITING/` is
unchanged.

**The folder, `ADMIN-CARDS/`**
- **`admin-cards.html`.** NON-ADMIN's page, with:
  - the sheets in `admin.html`'s order, `../pollCard-m3.css` taking `m3-tokens.css`'s place
    (clarification 2b);
  - Roboto in the font link;
  - a Theme picker;
  - production's back link above the list. The toolbar keeps its production look.

  Scripts: `admin-card-m3.js`, `../tooltip-m3.js`, `adminCard.js`, `harness.js`.
- **Base sheets.** `styles.css`, `tabs.css`, `site.css` and `pollCard.css` are byte-identical
  copies of the working tree's `src/public`. Production's `styles.css`, `pollCard.css` and
  `admin.css` have CRLF line endings, so "byte-identical" won over the recommendation's "in LF".
  `admin.css` keeps production's line endings too.
- **`admin.css`.** Production's sheet, plus:
  - REQUIREMENT002 and REQUIREMENT006's `.poll-admin-card` changes (the Poll Card's corners and
    shadow, and the 420px fluid width);
  - one appended block holding only the cards' layout (clarification 3a): the wizard's grid and
    spacing, the Named Circles' grid, the read-only face's columns, the 292px floor and the
    below-360px spacing.

  Every colour, font, border, shadow and control-drawing rule of NON-ADMIN's 578 lines went to
  `admin-card-m3.css` instead.
- **`admin-card-m3.css`.** 13 sections:
  1. tokens the root files lack (Title Medium, Title Small, Body Large, Label Medium, Label
     Small, error-container, elevation 2);
  2. type and the card;
  3. the read-only face;
  4. the Settings Summary;
  5. the Named Circles (5a);
  6. the step panel;
  7. the radio lists and the switch;
  8. the underlined fields, chips and date inputs;
  9. buttons;
  10. the snackbar;
  11. the edit face (4a);
  12. state layers and focus;
  13. disabled, including `[aria-disabled="true"]` (6a).

  It reads only `--md-sys-*` roles: no literal colour appears outside section 1's `:root` blocks.
  Dark comes from the roles, so only section 1 has dark blocks.
- **`admin-card-m3.js`.** The ripple, a copy of `../DISCARD-DIALOG/discard-dialog-m3.js` with the
  cards' targets. It skips disabled and `aria-disabled` targets. It also stands in for production's
  `window.M3Ripple`, so `adminCard.js`'s `window.M3Ripple?.add(".modal .modal-action")` works
  here.
- **`adminCard.js`.** NON-ADMIN's copy, in LF, with these changes, each marked `M3:`:
  - **024's dialog.** Production's `askToDiscard()` and its constants, verbatim, and the ripple
    registration for `.modal .modal-action`.
  - **Every Cancel awaits `confirmDiscard()`:** the wizard's (clarification 7a) and the edit
    face's.
  - **Publish is `aria-disabled="true"` while blocked** (6a), and its click returns early.
  - **Step 4's range is dropped.**
    - `storedHow()` no longer reads `minSelections` / `maxSelections`.
    - `howPlan()` is always 1 to N for "More than one".
    - The sub-options, the clamping and "Adjusted to your N choices." are gone.
    - `wizardFields()` sends neither field.
    - "What does this mean?" reads "Each voter picks one or more of the choices."
    - The now unused `m3Select()` and `range()` are deleted.
- **`harness.js`.** NON-ADMIN's copy, plus:
  - the range storage removed;
  - the back link guarded as production's `guardNavigation()`;
  - the Theme picker.

**The 024 plan** (`designDocs/024-high-level-requirements-MATERIAL3-MERGE.md`)
- The prototype table, the Prerequisites (again "done"), the compliance review and the
  Assumptions now name `ADMIN-CARDS/admin-cards.html`.
- **Step 6** is now a normal port:
  - It drops the REQUIREMENT and `M3:` comments.
  - Section 1's missing tokens move to `m3-tokens.css`: Title Medium, Label Medium, Label Small
    and error-container. Title Small, Body Large and elevation 2 are already there.
  - `admin-card-m3.js` is not ported. Its targets become `window.M3Ripple?.add(…)` calls.
  - `admin.css` and `adminCard.js` are taken from `ADMIN-CARDS/`.
- **Also in Step 6:** a bullet for Publish and Save as `aria-disabled`, and a client test for it.
- **The Step 5 checklist** gains the `ADMIN-CARDS/admin-cards.html` entry.

Departures from the recommendation
- **Save is `aria-disabled` too.** It was `disabled` with "Remove the duplicate choice first." as
  its `title`, which the M3 tooltip could never show either, for the same reason as Publish.
- **The footer keeps its classes.** Cancel, Save and Publish keep production's
  `btn-header-ghost` / `btn-header-primary`, and `admin-card-m3.css` styles them inside the card
  (outlined and filled, 40px at every width), so `adminCard.js` changes less.
- **The back link** is production's, placed in the page so the harness can show its guard. Its
  look stays production's (Merge Material 3 Admin page, clarification 5a).
- **`admin-card-m3.css` restates the Settings Summary's title and subtitle.** It uses
  `.wizard-summary .question` / `.subtitle`, as clarification 2b's consequence said.

Checks (jsdom, css-tree; no browser in the sandbox)
- **The page:**
  - It loads in System, Light and Dark with no script or CSS errors.
  - It mounts the three cards, with the wizard open on the new one.
  - No `title` is left (16 `data-tooltip`).
- **The wizard:**
  - It steps through all five steps with Next. The Named Circles end as four visited and one
    current.
  - Step 4 has no select and no "Exactly".
  - Publish is `aria-disabled="true"` and not `disabled`, with its tooltip text. A click on it
    sends nothing.
  - Save's request carries no `minSelections` / `maxSelections`.
- **The dialog:**
  - After Save, the Summary Text reopens the wizard at Step 2.
  - An edited title makes Cancel open "Discard changes?" as an `alertdialog`, with focus on
    Keep editing.
  - Escape keeps the wizard, and Discard closes it.
- **The edit face:**
  - The WAITING TO OPEN card's Summary Text opens it, and its rosters expand.
  - With an edit, the back link opens the dialog, and Keep editing stays.
  - The edit face's Cancel opens the dialog, and Discard closes the face.
- **Styles:**
  - Every class the cards create is styled. The rest are layout wrappers, hooks such as
    `wizard-summary-who` or `card-counts-panel`, the page chrome, or production's back link and
    tooltip.
  - `admin-card-m3.css` parses with 141 rules and balanced braces.
  - The copied base sheets compare byte-identical to `src/public`.
- **jsdom needs `window.Response`.** The harness's fake `fetch` builds one, and jsdom does not
  provide it. NON-ADMIN's prototype fails the same way in jsdom, so this is not a prototype
  defect.

Open for the developers: the browser checklist entry for `ADMIN-CARDS/admin-cards.html` in the
plan's Step 5, in Light and Dark at 320px, 360px and desktop widths. The look, the state layers,
`:focus-visible`, `:has()` / hover states, the switch and radio drawing, the ripples and motion
cannot be checked in jsdom.


# REQUIREMENT Wizard When Editing An Existing Poll

[X] Resolved

## SHORT SUMMARY
In `ADMIN-CARDS/`, a tap on a Summary Text part of an existing poll opens the wizard at that
part's step, in place of the old edit face. Only the parts the poll's state lets change are
links.

Found while reading:
- **This is A24.6's deferred "editing after publishing".** Today `requestEdit()` opens the wizard
  only for an INITIALIZED poll (`isWizardPoll()`). Every other poll gets production's edit face
  (`renderEditing()`). The 024 plan's Step 6 says editing after publishing "stays as production
  has it".
- **The links follow no field rule today.** Every part is a link while `canEdit || canUpdate`
  and no other card is being edited (`canOpenEditor()`). The server decides by mode
  (`editModeFor`, `src/polls/service.ts`):
  - AWAITING APPROVAL, ARCHIVED and a poll being edited elsewhere cannot be edited.
  - A poll with no votes is EDIT mode: every field can change.
  - A poll with votes is UPDATE mode: only `title`, `subtitle`, `startAt`, `endAt`,
    `invitedVoterList`, `bannedVoterList` and `voterCountLimit` can change
    (`UPDATE_FIELDS`, `src/routes/pollsApi.ts`).
- **The edit face has settings the wizard does not.** These are the Voter Count Limit, the
  invitation list and the banned voter list, each with paging. The wizard leaves invitations
  until after the poll is created (A24.1).
- **The edit face saves differently.** "Save and Publish" sends the poll back to screening when
  it has no votes. With votes, it saves the allowed fields in place. The wizard's footer is
  Cancel / Save / Publish, for an unpublished poll.
- **The server accepts start-date changes on an OPEN or CLOSED poll,** where they no longer
  mean anything to voters.

## REQUIREMENTS

While testing the Admin M3 prototype, we discovered that when we click on a link in the Summary Text,  
the card thgat is rendered resembles the old admin edit card.  
We would prefer if it goes into the Wizrd interface, 
with the circles tab step that corresponds to the link clicked.  
Also, based on the state of the Poll, the words in the Summary Text should only be links if the corresponding value is editable.

## CLARIFICATIONS

1. Which Summary Text parts are links
[X] Resolved
The links should follow what the poll's state lets change.

a. The server's rule, field by field
Recommended
[X] Accepted
- **No links** while the poll is AWAITING APPROVAL or ARCHIVED, is being edited elsewhere, or
  another card is being edited (one card at a time).
- **No votes (EDIT mode):** every part is a link, apart from the dates (clarification 2).
- **With votes (UPDATE mode):** only the title and subtitle (Step 2), the dates (Step 5,
  clarification 2) and the voter settings (clarification 4) are links. "Who can vote", the
  keywords, the choices and "How to vote" are plain text.
- The client reads the mode from `hasEverBeenVotedOn` and the state, as `capabilitiesFor` does,
  so a link and the server's answer never disagree.

b. Every part is a link whenever the poll can be opened at all (today's rule)
[ ] Accepted
The wizard then shows the locked settings disabled. A tap can lead to a step where nothing can
change.

Other.
[ ] Accepted


2. Start and End once the poll has opened
[X] Resolved
The server accepts a new start date on an OPEN or CLOSED poll, but voting has already begun by
then.

a. Start can change only before the poll opens, and End only until it closes
Recommended
[X] Accepted
- Start is editable while the poll is INITIALIZED, REJECTED or WAITING TO OPEN.
- End is editable until the poll is CLOSED.
- A CLOSED poll's dates are plain text. Its Open button reopens it, as today.
- The server is unchanged. This is a client rule, tighter than the server's.

b. Follow the server: both dates editable whenever Step 5 is
[ ] Accepted
This is simpler, but the admin can set a start date that has already passed on an OPEN poll.

Other.
[ ] Accepted


3. Steps with nothing editable, inside the wizard
[X] Resolved
On an existing poll every step has been answered. Some steps may have nothing the state lets
change.

a. Every circle is visited and tappable, and a locked step shows its answers disabled
Recommended
[X] Accepted
- All five circles are visited, so any step can be looked at.
- A locked step's controls are disabled (M3's 38%).
- One supporting line says why, for example "This can't change once your poll has votes." or
  "Voting has opened, so the start can't change."
- Next still moves on.

b. Locked steps' circles are inert, like an unvisited step
[ ] Accepted
Nothing locked is ever shown. The admin cannot review those answers in the wizard, but they are
still in the Summary Text.

Other.
[ ] Accepted


4. The voter settings the wizard lacks
[X] Resolved
The edit face has the Voter Count Limit, the invitation list and the banned voter list. All three
can change even with votes.

a. Step 1 shows them for an existing private poll
Recommended
[ ] Accepted
- Below Step 1's radio list and switch, an existing private poll gets:
  - the Voter Count Limit as an underlined field;
  - the invitation list (Invitation Only only);
  - the banned voter list.
- Each list keeps production's paging and Invite / Ban / Un-ban, in the M3 look of section 11.
- "Who can vote" is where they belong (A24.1 adds invitations after the poll is created).
- The Step 1 Summary Text line stays a link with votes, for these.
- A new poll's Step 1 is unchanged.

b. A sixth step, "Voters", for existing private polls
[ ] Accepted
This gives the lists a step of their own, but six circles do not fit a 320px window with names
above them (A24.5), and new and existing polls would differ in shape.

c. Keep them on the old edit face, opened by its own link
[ ] Accepted
The old edit face stays, for these three only. The card then has two editors.

Other.
[X] Accepted
The Voter Count Limit, the invitation list and the banned voter list will be implemented in a
future requirement after the merge. They will not appear anywhere yet.

Consequences:
- Clarification 1a's "voter settings" links go: with votes, nothing on Step 1 can change, so
  the Step 1 Summary Text line is plain text then (clarification 3a: Step 1 is shown disabled).
- The edit face's three roster sections have no place in the wizard, so they leave the card
  with the edit face (clarification 6).


5. The footer on an existing poll
[X] Resolved
The wizard's footer is Cancel / Save / Publish, for an unpublished poll. The edit face's is
Save and Publish / Cancel.

a. Cancel and one filled "Save changes"
Recommended
[X] Accepted
- "Save changes" sends what the edit face's "Save and Publish" sends today. So a poll without
  votes goes back to screening, as today, and a poll with votes is updated in place.
  - **Correction (found while writing the recommendations):** a poll with votes is not updated
    in place. Production's `/publish` route sends every saved poll back to AWAITING APPROVAL,
    with or without votes. The only route that changes a poll in place is the state actions
    (`PATCH`). So "Save changes" re-screens every poll, as the edit face does today.
- It is `aria-disabled` until something has changed, or while a setting is invalid, with a
  tooltip naming why (as Publish).
- Cancel asks "Discard changes?" when there are edits.
- There is no Save-for-later: a published poll cannot be left half-edited.

b. Keep Save and Publish on every poll
[ ] Accepted
One footer everywhere, but Save on a published poll has no meaning of its own.

Other.
[ ] Accepted


6. Where this lands
[X] Resolved
It replaces the edit face, which 024's Step 6 keeps. With clarification 4's Other, the Voter Count
Limit, the invitation list and the banned voter list leave the card until a later requirement.
Production's admin page has them today, on the edit face.

a. In `ADMIN-CARDS/` now, and in 024's Step 6, without the three voter settings
Recommended
[X] Accepted
- The prototype's `renderEditing()`, the edit face and its roster and voter-limit code go.
  `admin-card-m3.css` section 11 goes with them.
- The 024 plan's Step 6, Functional Requirements and Exclusions take "editing after publishing"
  in, with A24.6 resolved by this requirement. They also record that the three voter settings
  leave the admin page until their requirement, and that until then a poll's existing voter
  limit, invitations and bans stay as stored, but cannot be changed in the app.
- No server change. The routes for the lists stay, unused by the page.

b. In `ADMIN-CARDS/` now, but merged with the voter-settings requirement
[ ] Accepted
024's Step 6 keeps production's edit face, in M3. The wizard for existing polls, and the three
voter settings, reach production together later, so admins never lose a control. The prototype
then differs from what Step 6 ports.

Other.
[ ] Accepted


## RECOMMENDATION
[X] Resolved

Found while writing these:
- **Every save re-screens (correction to clarification 5a).** `POST /api/admin/polls/:pid/publish`
  (`src/routes/pollsApi.ts`) refuses fields outside `UPDATE_FIELDS` on a poll with votes. Then,
  for every poll, it stores the changes and sets AWAITING APPROVAL. So an OPEN poll with votes
  stops taking votes until it is approved again, as it does today from the edit face. The two
  recommendations differ only in how the footer says so.
- **The when-line has two parts**, the opening phrase and the closing phrase (A31). Clarification
  2a makes them separate links: the start part is a link only before the poll opens, and the end
  part only until it closes.

1. The wizard for every editable poll; the footer says "Save changes" with a line about review
Recommended
[X] Accepted
This builds clarifications 1a, 2a, 3a, 4 (Other), 5a and 6a. Changes in `ADMIN-CARDS/`:

**`adminCard.js`**
- **One rule for what can change.** A new `canChange(field)` decides from the poll's state
  (`wordedState()`) and `hasEverBeenVotedOn`, as `editModeFor` does:
  - nothing while AWAITING APPROVAL, ARCHIVED, or being edited elsewhere;
  - with no votes, every field;
  - with votes, only `title` and `subtitle`;
  - `startAt` only while INITIALIZED, REJECTED or WAITING TO OPEN, and `endAt` only until CLOSED
    (2a), whatever the votes;
  - `keywords` only on a public poll, as today.
- **The Summary Text's links.** `readOnlyPart()` takes the part's field as well as its step, and
  makes a link only when `canOpenEditor()` and `canChange(field)` both hold (1a).
  - The Step 1 line's parts are `pollVisibility`.
  - The title and subtitle are `title` / `subtitle`, and the keywords are `keywords`.
  - The choices are `labels`, and the How line is `choiceMode` / `voteMutability`.
  - The when-line's two parts are `startAt` and `endAt`.
- **The wizard opens for every poll.** `requestEdit(step)` opens the wizard for every poll, at the
  tapped part's step. For a poll that is not in its wizard:
  - the answers come from the poll, as `readOnlyAnswers()` builds them;
  - all five steps are visited and answered, and every circle is tappable (3a);
  - the Settings Summary is worded for the poll's state, not as INITIALIZED.
- **Locked controls (3a).** A control whose field cannot change is disabled. Each step with a
  locked control gets one supporting line saying why:
  - "This can't change once your poll has votes."
  - "Voting has opened, so the start can't change."
  - "Your poll has closed, so its dates can't change."

  Next still moves on.
- **The footer on an existing poll (5a).**
  - It is Cancel on the left, and one filled **Save changes** on the right.
  - Save changes stays `aria-disabled` until something has changed, or while a setting is
    invalid. Its tooltip says why: "Change something to save.", or the same messages as
    Publish.
  - It sends only the changed fields, plus `clientGuid`, to `/publish`, as the edit face's
    `savePoll()` does.
  - A supporting line above the footer reads "Saving sends your poll to be reviewed again."
  - Cancel asks "Discard changes?" when there are edits.
- **The edit face goes (6a).** `renderEditing()` is deleted, with what only it uses:
  - the roster sections, the Voter Count Limit and the results loader;
  - `savePoll()`, `cancelEdit()`, `labelledTextarea()`, `radioGroup()` and `markDirty()`.

  `wireChoicesBox()` stays: the wizard's Step 3 uses it.

**`harness.js`**
- `/publish` on an existing poll stores the fields it is sent and sets AWAITING APPROVAL, as the
  server does. Its note says so.
- The fixtures cover both modes:
  - the OPEN card has votes (UPDATE);
  - the WAITING TO OPEN card has none (EDIT);
  - a CLOSED card with votes is added, so the date rule shows.

**`admin-card-m3.css`**
- Section 11 (the edit face) goes.
- A section is added for locked controls, in M3's 38%: disabled fields, chips, radios, the switch
  and date inputs, and the supporting lines `.wizard-locked` and `.wizard-review-note`.

**The 024 plan**
- Step 6 takes editing after publishing in (A24.6 resolved by this requirement), and drops the
  edit face.
- Functional Requirements gain:
  - the wizard for existing polls, and the links that follow what can change;
  - that the Voter Count Limit, invitations and bans can no longer be changed on the admin page
    until their requirement, while a poll's stored values stay as they are.
- Exclusions and "Afterwards" swap "editing after publishing" for the three voter settings.
- Step 6's client tests cover:
  - the links for each state, with and without votes;
  - the wizard opening at the tapped step;
  - the locked steps;
  - Save changes, its enabling, and the fields it sends.
- The Step 5 checklist entry gains the existing-poll wizard.

**Checks (jsdom)**
- For each fixture, the links match `canChange()`.
- A tap opens the wizard at that step, with every circle visited.
- On the OPEN card, only the title, subtitle and end are editable.
- Save changes is blocked until an edit, then sends only the changed fields.
- The CLOSED card has no date links.
- No `renderEditing` or roster code remains.
- `admin-card-m3.css` parses, with no literal colours outside its token blocks.

Pros:
- One editor for every poll. The links never promise a change the server refuses.
- The admin is told before saving that the poll will be reviewed again.

Cons:
- Until their requirement lands, admins lose the Voter Count Limit, invitations and bans that
  production's edit face has today (6a).

2. The same, with the footer button named "Save and publish" and no extra line
[ ] Accepted
Everything as in recommendation 1, except the footer: Cancel and **Save and publish**, which is
the edit face's wording today. There is no supporting line.

Pros:
- The wording matches what the server does, with no extra line on a phone-sized card.

Cons:
- It differs from clarification 5a's "Save changes".
- "Publish" on a poll that is already open reads oddly.


## NOTES
Implemented recommendation 1, with clarifications 1a, 2a, 3a, 4 (Other), 5a (with its
correction) and 6a. Changed: `ADMIN-CARDS/adminCard.js`, `harness.js`, `admin-card-m3.css` and
`admin-card-m3.js`, and `designDocs/024-high-level-requirements-MATERIAL3-MERGE.md`.

**`adminCard.js`** (each change marked `M3:`)
- **`canChange(field)`.** The mode comes from the edit session once one is open, and from
  `canEdit` / `canUpdate` before that. In production, the list row of a poll being edited reads
  EDITING, which allows no edits, so the session's mode is the one to trust there. Then:
  - no mode, nothing;
  - `startAt` only in INITIALIZED, REJECTED or WAITING TO OPEN;
  - `endAt` until CLOSED;
  - `title` and `subtitle` always;
  - everything else only in EDIT mode.

  `FIELD_OF` maps `pollSharingMode` and `voteAnonymity` to `pollVisibility`, and
  `voteMutability` to `choiceMode`.
- **The Summary Text.** `buildSummary()`'s parts carry their field. `readOnlyPart()` links a part
  only when `canOpenEditor()` and `canChange(field)` both hold. The when-line's opening phrase is
  `startAt` and its closing phrase is `endAt`.
- **The wizard for every poll.** `requestEdit()` always opens the wizard, with `existing` set for
  a poll that is not in its wizard. `pollAnswers()` (shared with `readOnlyAnswers()`) is then
  the base:
  - every step is visited and answered, and every choice is kept;
  - the in-wizard summary is worded for the poll's state.
- **Locked controls.** `lockStep()` disables what cannot change, greys its row, and puts one
  `.wizard-locked` line at the top of the step. The step-5 past-start note shows only where the
  start can change.
- **Save changes.** On an existing poll, `buildChangesFooter()` shows Cancel and Save changes,
  plus the `.wizard-review-note` line above the footer. `saveChanges()` sends only the fields
  that differ from the poll and that `canChange` allows.
- **`scheduleProblem()`** checks an existing poll's dates only when one of them changed, so a
  CLOSED poll's past end does not block saving its title.
- **Removed:** the edit face, and with it:
  - `renderEditing()`, `savePoll()` and `cancelEdit()`;
  - `markDirty()`, the choices counter, `checkSchedule()`, the voter limit and
    `labelledTextarea()` / `radioGroup()`;
  - the roster sections, `loadVotedOnce()` and the five value lists at the top;
  - the `editable`, `draft`, `choicesDirty` and `scheduleInverted` state.

  `wireChoicesBox()` stays for Step 3.

**`harness.js`**
- A CLOSED public poll with votes, "Best day for the spring bake sale?", joins the fixtures.
- `/publish` now acts as the server does:
  - On a poll with votes, it refuses any field outside `UPDATE_FIELDS` with a 400.
  - Every publish or save stores the fields and sets AWAITING APPROVAL, with no capabilities.
- REQUIREMENT006 F4's prototype-only edit face after Publish is gone. The server refuses editing
  while AWAITING APPROVAL, so the summary now has no links there.

**Styles and the ripple**
- **`admin-card-m3.css`** section 11 is now "An existing poll in the wizard":
  - the two supporting lines;
  - the disabled radio, switch, underlined field, date input and chip remove, all in M3's 38%
    or 12%.

  The edit-face selectors are gone from sections 7, 9, 12 and 13. The sheet parses with 131
  rules, balanced braces, and no literal colour outside section 1.
- **`admin-card-m3.js`** drops its edit-face targets.

**The 024 plan**
- **Step 6** gains:
  - the existing-poll wizard;
  - the removal of the edit face and its three voter settings, whose stored values stay as they
    are;
  - client tests for the existing-poll wizard.
- **The Step 5 checklist** entry tests the existing-poll wizard in place of the edit face.
- **Functional Requirements** gain the existing-poll wizard and the voter settings' removal.
- **Afterwards and Exclusions** swap "editing after publishing" for the three voter settings.

Departures and choices made while implementing
- **Two limits are relaxed for existing polls.** An existing poll's subtitle allows 100
  characters and its choices 100 per label, as the edit face did. The wizard's 50 and 40 apply
  to new polls only, so a stored subtitle or choice is never cut when edited.
- **The harness refuses disallowed fields.** It answers as the server's `UPDATE_FIELDS` check
  would, so the check below proves the client never sends a locked field.

Checks (jsdom; no browser in the sandbox)
- **The links**, after closing the new poll's wizard:
  - OPEN with votes: the title, the subtitle and the end only.
  - CLOSED with votes: the title and the subtitle only.
  - WAITING TO OPEN with no votes: every part, both dates included.
  - The new poll: its answered parts, as before.
- **OPEN with votes:**
  - A tap on its subtitle opens Step 2, with every circle visited, the review line, and Save
    changes blocked ("Change something to save.").
  - Step 1's radios and switch are disabled, with "This can't change once your poll has
    votes.".
  - Step 5's start is disabled ("Voting has opened, so the start can't change.") and its end is
    not.
  - After a subtitle edit, Save changes sent only `subtitle` and `clientGuid`. The card went to
    AWAITING APPROVAL with no links.
- **CLOSED with votes:**
  - Every Step 5 input is disabled ("Your poll has closed, so its dates can't change.").
  - The keywords are disabled.
  - A title edit enables Save changes.
  - Cancel with the edit opened "Discard changes?", and Discard returned to the read-only face.
- **WAITING TO OPEN with no votes:**
  - A tap on its choices opens Step 3, with nothing locked.
  - An added choice is saved as `labels` only, and the poll went to AWAITING APPROVAL.
- **Regressions:**
  - No edit-face markup remains.
  - The new-poll checks of the previous requirement pass in Light and Dark: five steps,
    Publish `aria-disabled` and sending nothing, no range fields, and the dialog.
  - There are no script or CSS errors.

Open for the developers:
- The browser pass of the plan's Step 5 entry, now with the existing-poll wizard.
- The voter-settings requirement.

# REQUIREMENT Update designDocs\024-high-level-requirements-MATERIAL3-MERGE.md

[X] Resolved

## SHORT SUMMARY
Bring `designDocs/024-high-level-requirements-MATERIAL3-MERGE.md` in line with the Material 3
admin-cards prototype, `ADMIN-CARDS/admin-cards.html`.

Found while reading: the plan already reflects most of it. REQUIREMENT "Merge Material 3 Admin
page", "Use Material 3 For the admin cards" and "Wizard When Editing An Existing Poll" each
updated it, adding Step 6, the prerequisite, the table row, the page × file row, the checklist
entry, the Functional Requirements and the Exclusions. Five places are still behind the
prototype:
1. **The shared design, Type.** It lists Headline Small, Title Large, Title Small, Body Large,
   Body Medium, Body Small and Label Large. The admin cards add Title Medium (the step heading),
   Label Medium (the current circle's name and the read-only field labels) and Label Small (the
   circles' names).
2. **Step 1, the ripple.** It says `adminCard.js` registers `.modal .modal-action` only. Step 6
   adds the cards' targets: the buttons, icon buttons, menu items, radio rows and switch row
   that `ADMIN-CARDS/admin-card-m3.js` lists.
3. **What the prototypes are, the Tooltips row.** It names three pages. The admin cards rely on
   the tooltip too: a blocked Publish, Save or Save changes names what is missing in it.
4. **Functional Requirements.** Nothing says a blocked Publish, Save or Save changes shows why in
   its tooltip.
5. **A leftover token.** `admin-card-m3.css` still declares `error-container` /
   `on-error-container`, and Step 6 says to move them to `m3-tokens.css`. Only the edit face's
   rejection reason used them, and the edit face is gone, so nothing uses them now.

## REQUIREMENT DETAILS

Update `designDocs\024-high-level-requirements-MATERIAL3-MERGE.md` to reflect the 
prototype added for the Material 3 Admin Cards.
If this is relevant:  
update  
`designDocs\024-high-level-requirements-MATERIAL3-MERGE.md`  
to reflect the Material 3 Admin Cards prototype.


## CLARIFICATIONS

1. How the plan is updated
[X] Resolved
The plan already carries the admin cards. Four places are behind (items 1–4 above).

a. Targeted edits for the four places only
Recommended
[X] Accepted
Each is fixed where it sits, in the plan's wording:
- the Type list gains Title Medium, Label Medium and Label Small, naming where the admin cards
  use them;
- Step 1's registration list notes that Step 6 adds the cards' targets to `adminCard.js`;
- the Tooltips row adds `ADMIN-CARDS/` and the blocked footer buttons;
- the tooltip bullet under Functional Requirements adds the blocked footer buttons.

Nothing else changes. The NOTES list each edit.

b. No change: the plan is close enough
[ ] Accepted
The four gaps are small, and `/speckit-specify` would read the prototype anyway. The plan stays
behind the prototype in those four places.

Other.
[ ] Accepted


2. The unused `error-container` token
[X] Resolved
Nothing in the admin cards reads `error-container` / `on-error-container` since the edit face
went.

a. Remove it from `admin-card-m3.css` and from Step 6's token list
Recommended
[X] Accepted
Section 1 and its comment lose the two tokens in light and dark. Step 6's list of tokens that
move to `m3-tokens.css` becomes Title Medium, Label Medium and Label Small. The prototype is
re-checked: it parses, and nothing references the tokens.

b. Keep it for a later requirement
[ ] Accepted
The voter-settings requirement or a rejection notice might want it. The plan keeps it in Step
6's list, so production carries a token nothing uses until then.

Other.
[ ] Accepted


## RECOMMENDATION
[X] Resolved

1. Four targeted plan edits, and the unused token removed from the prototype and the plan
Recommended
[X] Accepted
This builds clarifications 1a and 2a.

**`designDocs/024-high-level-requirements-MATERIAL3-MERGE.md`**, each edit a targeted
replacement:
1. **The shared design, Type.** The list gains three roles, each with where the admin cards use
   it:
   - Title Medium: the wizard's step heading;
   - Label Medium: the current step's name, and the read-only face's field labels;
   - Label Small: the Named Circles' names.
2. **Step 1, the ripple.** After "`adminCard.js` (`.modal .modal-action`)": "and, from Step 6,
   the admin cards' targets".
3. **What the prototypes are, the Tooltips row.**
   - The page column adds `ADMIN-CARDS/`.
   - The production column adds "and the admin cards' blocked Publish, Save and Save changes
     become `aria-disabled` (Step 6)".
4. **Functional Requirements, the tooltip bullet.** A sub-bullet: "A blocked Publish, Save or
   Save changes on an admin card shows what is missing in its tooltip."
5. **Step 6, the tokens.** The list of tokens that move to `m3-tokens.css` becomes Title Medium,
   Label Medium and Label Small. `error-container` / `on-error-container` go (clarification 2a).

**`ADMIN-CARDS/admin-card-m3.css`**
- Section 1 drops `--md-sys-color-error-container` and `--md-sys-color-on-error-container`, in
  light and in both dark blocks.
- The comment above it drops "error-container, for the rejection reason".
- With no colour token left, the two dark blocks are empty, so they go too.

Checks
- **The plan:**
  - A diff against its state before this instruction shows only the five edits.
  - The prototype table still has four columns on every row.
  - The lists are well formed.
- **The prototype:**
  - `admin-card-m3.css` parses with balanced braces.
  - No `error-container` is left in `ADMIN-CARDS/`.
  - Nothing in `adminCard.js` reads it.
  - The jsdom checks of the two previous requirements still pass.

Pros:
- The plan matches the prototype everywhere it describes it.
- No dead token reaches production.

Cons:
- None found.

## NOTES
Implemented recommendation 1, with clarifications 1a and 2a.

**`designDocs/024-high-level-requirements-MATERIAL3-MERGE.md`**
1. **The shared design, Type.** The list now reads Headline Small, Title Large, Title Medium,
   Title Small, Body Large, Body Medium, Body Small, Label Large, Label Medium and Label Small. A
   sub-bullet says where the admin cards use the three new ones.
2. **Step 1, the ripple.** `adminCard.js` registers `.modal .modal-action`, "and from Step 6 the
   admin cards' targets".
3. **The Tooltips row.**
   - The pages add `ADMIN-CARDS/`.
   - The production changes add the admin cards' blocked Publish, Save and Save changes as
     `aria-disabled` (Step 6).
4. **Functional Requirements, the tooltip bullet.** A sub-bullet: a blocked Publish, Save or Save
   changes on an admin card shows what is missing in its tooltip.
5. **Step 6, the tokens.** Only Title Medium, Label Medium and Label Small move to
   `m3-tokens.css`. `error-container` / `on-error-container` are gone.

**A sixth edit, needed by the fifth.** With `error-container` removed, `admin-card-m3.css` has no
dark blocks left. Step 6's sentence about porting "its dark blocks in both forms" now says it has
none of its own: every colour is an M3 role, which `m3-tokens.css` already switches for dark.

**`ADMIN-CARDS/admin-card-m3.css`**
- Section 1 dropped the two tokens, its comment's mention of them, and the two dark blocks that
  held only them.
- The header comment now says the file has no dark blocks.

Checks
- **The plan:**
  - A diff against its state before this instruction shows only these six edits, in five
    hunks.
  - The prototype table still has four columns on all 15 lines, and the page × file table eight
    on all 12.
- **The prototype:**
  - `admin-card-m3.css` parses with 129 rules, balanced braces, and no literal colour outside
    `:root`.
  - No `error-container` or `prefers-color-scheme: dark` is left in `ADMIN-CARDS/`.
- **The jsdom checks still pass:**
  - the existing-poll wizard: only `subtitle` sent, the CLOSED card's lock line, AWAITING
    APPROVAL after a save, and no edit-face markup;
  - the new-poll wizard in Light and Dark: five steps, Publish `aria-disabled`, and the dialog.
  - There are no errors.


# REQUIREMENT Merge to CrowdPoll Webapp

[X] Resolved

## SHORT SUMMARY
Write the instructions that take the Material 3 work from here into the CrowdPoll webapp
(`src/public`), and on to `dev`. The deliverable is the instructions, not the merge itself.

Found while reading:
- **Steps 1–5 are built, but nothing is committed.** Branch `024-MATERIAL3-MERGE` sits at
  `cc9a0f9` ("Start the 024-MATERIAL3-MERGE branch"). The working tree holds:
  - 32 changed files, and 17 new ones in `src/public` and `tests`;
  - the 024 spec, plan, tasks and architecture;
  - `ADMIN-CARDS/`.
- **`tasks.md` has T001–T053 for Steps 1–5.** All are ticked except two:
  - T050, the browser checklist;
  - T052, the Step 5 pull request, then `dev` with the developer's go-ahead.

  The plan's "one pull request per step" has not been followed: nothing was committed between
  steps.
- **Step 6, the admin cards, exists only in the plan** (`designDocs/024-...MERGE.md`). It is not
  yet in `specs/024-MATERIAL3-MERGE/` (spec, plan, research, contracts, tasks) or in
  `architecture/024-material3-merge/`.
- **Step 6 contradicts what the 024 spec and tasks assert today:**
  - T051 checks that `src/public/admin.css` and the server are untouched (SC-009, FR-023).
  - The spec says no server, route or contract change. Step 6 changes `admin.css`,
    `adminCard.js`, `createDefaultPoll`, `adminListRow` and `postman/openapi.json`.
- **The prototype the instructions start from** is `ADMIN-CARDS/admin-cards.html`. "Wizard When
  Editing An Existing Poll" and "Update designDocs\024-..." brought it and the plan into step.

## REQUIREMENT DETAILS

Question
The deliverable of this requirement is the instructions to merge the Material 3 Poll Card changes into the CrowdPoll Webapp.


## CLARIFICATIONS

1. What the instructions cover
[X] Resolved
"The Material 3 Poll Card changes" could mean only the Poll Card (Step 3, already built), or
everything in the 024 plan that has not yet reached `dev`.

a. Everything left before 024 reaches `dev`
Recommended
[X] Accepted
- committing what is built (clarification 2);
- bringing Step 6 into the 024 Spec Kit artifacts, and building it;
- the browser checklist (T050 and Step 6's entry);
- the pull requests, and the one merge into `dev`.

b. Only Step 6, the admin cards
[ ] Accepted
The instructions start from the 024 artifacts and stop when Step 6's tasks are done. Committing
Steps 1–5, the checklist and `dev` are left to the developers.

Other.
[ ] Accepted


2. The uncommitted Steps 1–5
[X] Resolved
The plan wants one pull request per step into `024-MATERIAL3-MERGE`. All five steps are in one
working tree, and many files hold edits from several steps (`tabs.js`, `site.css`,
`adminCard.js`, the tests).

a. Commit Steps 1–5 now as one commit, with one pull request for Steps 1–5
Recommended
[X] Accepted
- The commit is "Build 024 Steps 1–5 (tokens, header, Poll Card, card-shell pages, dark mode)".
  It includes the spec, plan, tasks and architecture.
- `ADMIN-CARDS/` and the iterative-requirements changes go in a separate prototype commit before
  it.
- The tasks record that the per-step pull requests became one, because the steps were built
  together.
- Step 6 then has its own pull request, as the plan wants.

b. Split the working tree into five commits, one per step, by hand
[ ] Accepted
This keeps the plan's per-step history. But files shared between steps need `git add -p`, hunk by
hunk, and an intermediate commit may not pass the tests on its own.

Other.
[ ] Accepted


3. How Step 6 enters the Spec Kit artifacts
[X] Resolved
REQUIREMENT "Merge Material 3 Admin page" (clarification 1a) said the spec, plan and tasks take
Step 6 "as an addition, through /speckit-specify onward".

a. Update the 024 artifacts in place, in the Spec Kit order
Recommended
[X] Accepted
1. `/speckit-mdd-architecture designDocs/024-high-level-requirements-MATERIAL3-MERGE.md` adds
   Step 6 to `architecture/024-material3-merge/architecture.md`.
2. `/speckit-specify` adds Step 6 to `specs/024-MATERIAL3-MERGE/spec.md`. It replaces "no server
   change" with Step 6's two, and SC-009 / FR-023's "admin.css untouched".
3. `/speckit-clarify`, if it raises anything.
4. `/speckit-plan` adds the research, the data model's `admin` column and the contracts for Step
   6, including the `openapi.json` row.
5. `/speckit-tasks` appends Step 6's tasks after T053, and changes:
   - T051's checks, which become "only Step 6's files";
   - T052, which opens the Step 5 pull request but does not merge to `dev`.
6. `/speckit-analyze`, then `/speckit-analyze-resolve`.
7. `/speckit-implement` builds Step 6 from `ADMIN-CARDS/`.

Other.
[ ] Accepted


4. Where the instructions are written
[X] Resolved
The deliverable is a list of instructions.

a. In this requirement's NOTES, as a numbered checklist
Recommended
[X] Accepted
Each item is one command, or one decision for the developers, in order, with what it produces
and how to check it. Nothing is run by this requirement: no commit, no Spec Kit command.

b. As a new file, `specs/024-MATERIAL3-MERGE/merge-instructions.md`
[ ] Accepted
It sits beside the artifacts it drives, and is easy to find from the spec. But it is one more
document to keep in step with the plan.

Other.
[ ] Accepted


## RECOMMENDATION
[X] Resolved

Found while writing these: `origin/024-MATERIAL3-MERGE` exists at `cc9a0f9`, the branch's only
commit, and `origin/dev` (`5445bfe`) is already an ancestor of it. A pull request "into
`024-MATERIAL3-MERGE`" needs a branch of its own to come from. The two recommendations differ
only in that.

1. A short-lived branch per pull request, then one pull request from `024-MATERIAL3-MERGE` into `dev`
Recommended
[ ] Accepted
This builds clarifications 1a, 2a, 3a and 4a. The NOTES of this requirement will hold the
checklist below in full, with each item's command, what it produces, and how to check it.
Nothing is run here.

**A. Steps 1–5 (clarification 2a)**
1. **Branch.** `git checkout -b 024-s1-s5` from `024-MATERIAL3-MERGE`.
2. **The prototype commit.** It holds `prototypes/POLL-CARD-MATERIAL3/ADMIN-CARDS/`,
   `iterative-requirements.md` and `designDocs/024-high-level-requirements-MATERIAL3-MERGE.md`.
3. **The Steps 1–5 commit.** It holds everything else in the working tree:
   - `src/public`, `tests`, `specs/024-MATERIAL3-MERGE/` and `architecture/024-material3-merge/`;
   - `.specify/`, `CLAUDE.md`, `README.md`, `ARCHITECTURE.md` and the 021 contract note;
   - `package-lock.json`, after checking its diff is intended.
4. **Before pushing.** `npm test` and `npm run build`, as T051 did (744 passed, 15 skipped; 35
   fingerprinted assets).
5. **The browser checklist, Steps 1–5.** T050: the Step 5 checklist's twelve entries other than
   `ADMIN-CARDS/`, ticked in the plan.
6. **Push and open the pull request.** `git push -u origin 024-s1-s5`, then
   `gh pr create --base 024-MATERIAL3-MERGE`. The body notes that the per-step pull requests
   became one.
7. **Merge it** into `024-MATERIAL3-MERGE`. `tasks.md` records T052 as "pull request merged; `dev`
   waits for Step 6".

**B. Step 6 (clarification 3a)**
8. **Branch.** `git checkout -b 024-s6` from the updated `024-MATERIAL3-MERGE`.
9. **Spec Kit, in order.** Each is reviewed and committed:
   - `/speckit-mdd-architecture designDocs/024-high-level-requirements-MATERIAL3-MERGE.md`;
   - `/speckit-specify`, then `/speckit-clarify` if it raises anything;
   - `/speckit-plan`;
   - `/speckit-tasks`. T051's checks change to "only Step 6's files", and T052 stops short of
     `dev`.
   - `/speckit-analyze`, then `/speckit-analyze-resolve`.
10. **Build it.** `/speckit-implement` builds Step 6 from `ADMIN-CARDS/`: the port, the two server
    changes, `openapi.json`, the new tokens in `m3-tokens.css`, and the tests.
11. **Verify it.**
    - `npm test` and `npm run build` pass.
    - The `ADMIN-CARDS/` checklist entry passes on the prototype and on `admin.html`.
12. **Pull request and merge.** Push, then `gh pr create --base 024-MATERIAL3-MERGE`, and merge
    after review.

**C. Into `dev`, once (FR-027)**
13. **Bring in `dev`.** `git merge origin/dev` into `024-MATERIAL3-MERGE`, if `dev` has moved, and
    run `npm test` again.
14. **The go-ahead.** With the developers' go-ahead only,
    `gh pr create --base dev --head 024-MATERIAL3-MERGE`, then merge. `dev` autodeploys
    (`.do/app.yaml`). Then check the deployed site in Light and Dark.

Pros:
- Each pull request has a base it can merge into, and `024-MATERIAL3-MERGE` stays the
  integration branch the plan describes.
- `dev` gets 024 once, after Step 6.

Cons:
- Two short-lived branches to create and delete.

2. Commit straight onto `024-MATERIAL3-MERGE`, and review once, in the pull request into `dev`
[X] Accepted
Steps 2–5 and 8–12 as in recommendation 1, but on `024-MATERIAL3-MERGE` itself, with no branches
and no pull requests into it. The only pull request is the last one, into `dev`.

Pros:
- The fewest moving parts.

Cons:
- No review gate before `dev` until the very end, which departs further from the plan's "each
  step is its own pull request".

## NOTES
Implemented recommendation 2, with clarifications 1a, 2a, 3a and 4a. This requirement wrote the
checklist below and changed nothing else: no commit, no Spec Kit command, no pull request was
run.

Under recommendation 2, every commit goes straight onto `024-MATERIAL3-MERGE`, and the only pull
request is the last one, into `dev`. This departs from the plan's "each step is its own pull
request", and item 5 records the departure in `tasks.md`.

### The merge checklist

**A. Commit what is built (Steps 1–5)**

1. **Check the starting point.**
   - `git fetch origin`, then `git status` and `git log --oneline -1`.
   - Expect: branch `024-MATERIAL3-MERGE` at `cc9a0f9`, the same as
     `origin/024-MATERIAL3-MERGE`, with the uncommitted work listed in this requirement's
     SHORT SUMMARY.
2. **Restore `package-lock.json`.**
   - `git checkout -- package-lock.json`
   - Its diff is only `npm` rewriting `"dev": true` as `"devOptional": true`, plus CRLF line
     endings. No dependency changed: it was left by installing in the sandbox.
   - Check: `git diff --stat HEAD -- package-lock.json` is empty.
3. **The prototype commit.**
   - `git add prototypes/POLL-CARD-MATERIAL3 designDocs/024-high-level-requirements-MATERIAL3-MERGE.md`
   - `git commit -m "Add the Material 3 admin-cards prototype and bring the 024 plan up to date"`
   - Check: `git show --stat HEAD` lists only `prototypes/` and the plan.
4. **Test and build before the Steps 1–5 commit.**
   - `npm test`. Expect 744 passed and 15 skipped, as T051 recorded on 2026-10-02.
   - `npm run build`. Expect 35 fingerprinted assets.
   - Fix any failure before item 5.
5. **Record the departure in `specs/024-MATERIAL3-MERGE/tasks.md`, in T052:** "Steps 1–5 were
   built together and committed as one commit on `024-MATERIAL3-MERGE`. There are no per-step pull
   requests (REQUIREMENT Merge to CrowdPoll Webapp, recommendation 2). The only pull request is
   024 into `dev`, after Step 6."
6. **The Steps 1–5 commit.**
   - `git add -A`
   - `git commit -m "Build 024 Steps 1-5: tokens, header and tab bar, Poll Card, card-shell pages, dark mode"`
   - Check: `git status` is clean. `git show --stat HEAD` lists:
     - `src/public` and `tests`;
     - `specs/024-MATERIAL3-MERGE/` and `architecture/024-material3-merge/`;
     - `.specify/architecture.json` and `.specify/feature.json`;
     - `CLAUDE.md`, `README.md`, `ARCHITECTURE.md` and
       `specs/021-MAXIMIZED-POLL-CARD/contracts/ui-contracts.md`.
7. **Push.** `git push origin 024-MATERIAL3-MERGE`.
8. **The browser checklist for Steps 1–5 (T050).**
   - Run the twelve Step 5 checklist entries other than `ADMIN-CARDS/`, each in Light and Dark.
   - The prototypes open from disk. The merged pages run with `npm run dev`, through
     `devScripts/launch-dev.ps1`, at 320px, 640px, 768px and desktop widths.
   - Tick each entry in the plan, and T050 in `tasks.md`.
   - Fix whatever fails, re-run `npm test`, and commit:
     `git commit -am "Pass the 024 browser checklist for Steps 1-5"`.
   - Push.

**B. Step 6, the admin cards (in the Spec Kit order)**

Each Spec Kit command updates the 024 artifacts in place. Review each one's output, then commit
it on its own, so each change can be read alone.

9. **`/speckit-mdd-architecture designDocs/024-high-level-requirements-MATERIAL3-MERGE.md`**
   - It produces Step 6 in `architecture/024-material3-merge/architecture.md`.
   - Check: the diagrams show the admin page's wizard, `admin-card-m3.css`, and the two server
     changes.
10. **`/speckit-specify`**, with the input "Add Step 6, the admin cards, as the plan's Step 6
    describes".
    - It produces Step 6 in `specs/024-MATERIAL3-MERGE/spec.md`.
    - Check:
      - the spec names Step 6's two server changes, in place of "no server change";
      - SC-009 / FR-023 no longer say `admin.css` is untouched;
      - the existing-poll wizard and the removed voter settings are functional requirements.
11. **`/speckit-clarify`**, if the spec leaves anything open.
12. **`/speckit-plan`**
    - It produces Step 6 in `plan.md`, `research.md`, `data-model.md` and `contracts/`.
    - Check:
      - the page × file matrix has `admin-card-m3.css` on `admin` only;
      - a contract covers `adminListRow`'s `pollStateBeforeEditUpdate` and its `openapi.json`
        entry;
      - Title Medium, Label Medium and Label Small move to `m3-tokens.css`.
13. **`/speckit-tasks`**
    - It produces Step 6's tasks after T053, and rewrites T051 and T052.
    - Check:
      - T051's scope checks allow exactly Step 6's files: `admin.css`, `adminCard.js`,
        `admin-card-m3.css`, `m3-tokens.css`, `admin.html`, `src/polls/service.ts`,
        `src/routes/pollsApi.ts` and `postman/openapi.json`;
      - T052 is the one pull request into `dev`, after Step 6.
14. **`/speckit-analyze`, then `/speckit-analyze-resolve`**, until no finding is open. Commit.
15. **`/speckit-implement`** builds Step 6 from `ADMIN-CARDS/`:
    - the port of `admin-card-m3.css` and `adminCard.js`, without the `M3:` and REQUIREMENT
      comments;
    - `admin.css`'s layout block;
    - the ripple targets as `window.M3Ripple?.add(…)`;
    - the three type tokens in `m3-tokens.css`;
    - the `admin.html` link;
    - `createDefaultPoll` and `adminListRow`, and `postman/openapi.json`;
    - the server and client tests.

    Check:
    - `npm test` and `npm run build` pass;
    - `git diff --stat` touches only the files named in item 13;
    - the old edit face is gone from `src/public/adminCard.js`.

    Commit.
16. **The browser checklist for Step 6.**
    - Run the `ADMIN-CARDS/admin-cards.html` entry on the prototype, then on `admin.html`
      through `npm run dev`.
    - `admin.html` stays light (Step 5). Its cards' dark look is checked by setting
      `data-theme="dark"` on `<html>` in the browser's developer tools.
    - Tick the entry and Step 6's checklist task. Commit and push.

**C. Into `dev`, once (FR-027)**

17. **Bring in `dev`.**
    - `git fetch origin`. If `origin/dev` has moved past `5445bfe`, run `git merge origin/dev`.
    - Re-run `npm test` and `npm run build`, then push.
18. **Check before the pull request.**
    - Every task in `specs/024-MATERIAL3-MERGE/tasks.md` is ticked.
    - The plan's Step 5 checklist is ticked, all thirteen entries.
    - `CLAUDE.md`, `README.md` and `ARCHITECTURE.md` describe Step 6, as `/speckit-implement`'s
      polish tasks require.
19. **The pull request into `dev`, with the developers' go-ahead only.**
    - `gh pr create --base dev --head 024-MATERIAL3-MERGE --title "024 Material 3 merge (Steps 1-6)"`
    - The body lists the six steps, the two server changes, and the departure recorded in item 5.
    - Review it, then merge it.
20. **After the merge.**
    - `dev` autodeploys production (`.do/app.yaml`).
    - Check the deployed site in Light and Dark:
      - the home page, Profile, Login, Create Account and Not Authorized;
      - `admin.html`, with its wizard on a new poll and on an existing one.

### Checks made while writing this
- **The repository:**
  - The branch is `024-MATERIAL3-MERGE` at `cc9a0f9`, the same as `origin/024-MATERIAL3-MERGE`.
  - `origin/dev` (`5445bfe`) is an ancestor of it.
  - The working tree has 32 changed files, 17 new files in `src/public` and `tests`, and the new
    `specs/024-MATERIAL3-MERGE/` and `architecture/024-material3-merge/`.
- **`package-lock.json`.** Its diff ignoring line endings is 41 insertions and 94 deletions, all
  `dev` / `devOptional` flags.
- **`tasks.md`.** Only T050 and T052 are open. T051 recorded 744 passed, 15 skipped and 35
  assets.
- **The plan's Step 5 checklist** has thirteen entries, `ADMIN-CARDS/` included.
