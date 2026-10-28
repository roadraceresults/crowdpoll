# Overview: `specs/027-ADMIN-SEARCH-MATERIAL3`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/027-ADMIN-SEARCH-MATERIAL3` |
| Fix file created | 2026-10-05 21:09 |
| Last updated | 2026-10-06 02:03 |

Legend: `[ ]` open · `[X]` resolved · `[-]` resolved manually (or accepted as-is) by the developer.
Tick `No Tests` to postpone this fix's automated tests; leave it empty to have them written and run as usual.

"What's next" always returns the first `[ ]` item below.

The developer is expected to create the individual fix requirements in this file, and then run the `/speckit-fix` command to have the AI implement them, one at a time.  
Each fix requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Fixes

## FIX01 Radio Buttons on Admin Search Card
[X] Resolved
[X] No Tests

We have some suggested revisions to the Admin Search Card that will free up some vertical space,  
and make the interface more user-friendly.  
The image below illustrates the proposed revisions to the Admin Search Card.  
The exact alignment and the word capitalization in the image isn't perfect, but it conveys the intended layout and design changes.  
The design should still follow Material 3 Design guidelines.

![Admin Page Menu Revision](dontTrack/admin-page-menu-revision.jpg)

### RESOLUTION
Option B was chosen: every field is shown, as in the image, and the More filters disclosure is gone.
- `src/public/admin.html`: the form is one flat column — free text, state, three `role="radiogroup"` rows (visibility: Any visibility / Public / Private; choice mode: Any choice mode / Single Choice / Multiple Choice; vote mutability: Any vote mode / Vote can change / First vote is final), created by, the date and count groups, then Clear and Search. The radios keep the old selects' `name`s and values, with Any (`value=""`) chosen, so `readSearchForm()` and the search request are unchanged. The toggle and the collapsible region are removed.
- `src/public/adminList.js`: the More filters code is removed (`MORE_KEY`, `hiddenFilterActive`, the preference helpers, the `applyMoreFilters` block and its listeners); only the ripple registration for the panel's buttons stays.
- `src/public/admin-search-m3.css`: the disclosure rules are replaced by the radio rules (a three-column row, a single column under 360 px, options at least 48 px tall, a 20 px ring that turns primary with a primary dot, no transition under reduced motion).
- `src/public/m3-tokens.css`: the standard-easing and medium2-duration tokens, used only by the disclosure, are removed.
- Tests: `tests/client-admin-search.test.ts` and `tests/admin-search-assets.test.ts` rewritten for the radio groups and no disclosure (the More filters cases are removed). Tests postponed by the developer (No Tests); written, not run. `tsc` and `npm run build` pass, and `adminList.js` passes a syntax check.
- Artifacts: `spec.md` (User Story 3 and FR-010–FR-014 replaced by the radio-group requirements FR-010/FR-011, SC-005/SC-006 removed, the remaining stories and requirements renumbered), `plan.md`, `research.md` R4/R5, `data-model.md`, `contracts/ui-contracts.md` C3–C5, `quickstart.md`, `tasks.md` (T011–T015 marked superseded, T023 added), `README.md`, `ARCHITECTURE.md`, `CLAUDE.md`, and a superseded note on `architecture/027-admin-search-material3/architecture.md`.
- This changes what requirements mean, so `designDocs/027-high-level-requirements-admin-search.md` (the More filters section and the field list) no longer matches; it was not edited.
- Not verified in a browser; the panel is now about 800 px tall with every field shown.
2026-10-05 21:24

## FIX02 Help Text Removal

[X] Resolved
[X] No Tests

The help text at the bottom of the Admin Search Form isn't necessary, especially considering this form isn't user facing.
`Fill in the form and press Search.`

### RESOLUTION
- `src/public/adminList.js`: the Search view's `prompt` ("Fill in the form and press Search.") is removed, and the Search view before a search now calls `showSearchNotice("")`, so the status line is empty and hidden there. The other messages (the cut-off texts, the empty-view texts, "No polls match." and search errors) are unchanged.
- Tests: `tests/client-admin-search.test.ts` (the status-line case now expects the line empty and hidden before a search) and `tests/client-home.test.ts` (the Clear step of the admin search case now expects the line empty). Tests postponed by the developer (No Tests); updated, not run. `node --check` on `adminList.js` passes.
- Artifacts: `spec.md` (US3 intro, FR-013, a clarification bullet), `quickstart.md`, `tasks.md` (T016 text).
- Not verified in a browser.
2026-10-05 21:26

## FIX03 Admin Page Stray Tags  

[X] Resolved
[X] No Tests

There are a couple stray tags on the Admin Page as seen in the screenshot:
![Admin Page Stray Tags](admin-page-stray-tags.jpg)

### RESOLUTION
- Cause: when the form's markup was rebuilt for FIX01, two leftover closing-tag fragments, `div>` and `v>`, were left between the last count group and the actions in `src/public/admin.html`, and showed as the text "div> v>" in the screenshot. Both lines are removed.
- Tests: `tests/client-admin-search.test.ts` gains a case that the form holds no text outside a label, an option, a radio's text span or a button. Tests postponed by the developer (No Tests); written, not run. `tsc` passes.
- Artifacts: none needed. No other page contains a line of that shape.
- Not verified in a browser.
2026-10-05 21:30

## FIX04 Created By Field on Poll Admin Read-only Card

[X] Resolved
[X] No Tests

On the Poll Admin Read-only Card,  
at some point recently the "Created By" field was removed.  
It should appear above the "Created" and "Launched" dates, with the same styling.  
The format is as follows:  
`Created By: <username> (<email>)`

### RESOLUTION
I could not find where the field was removed: `git log -S"Created By"` shows no earlier version in the card, and neither the list rows nor the card carried a creator, so it is added here.
- `src/polls/store.ts`: new `creatorEmails(db, rows)`, one query per page for the creators' email addresses by user id (the email is not stored on the poll).
- `src/routes/pollsApi.ts`: `adminListRow()` now returns `createdByName` (from `polls.created_by_name`) and `createdByEmail`, for both `GET /api/admin/polls` and `GET /api/admin/polls/search`. Both are empty for a poll with no recorded creator. No schema change.
- `src/public/adminCard.js`: in the read-only card's dates panel a `Created By` field now sits above `Created` and `Launched`, with the same field styling. Its value is `<username> (<email>)`, the email alone when there is no username, and the field is left out when no creator is recorded.
- `postman/openapi.json`: `AdminPollSummary` gains `createdByName` and `createdByEmail`.
- Tests: `tests/polls-admin-crud.test.ts` (the list and the search return both fields; both empty for an ownerless poll) and `tests/client-admin-search.test.ts` (the card shows `Created By` first in the specified format, and omits it for an ownerless poll). Tests postponed by the developer (No Tests); written, not run. `tsc` and `npm run build` pass.
- Artifacts: none beyond the OpenAPI schema; `specs/024-MATERIAL3-MERGE/contracts/admin-api.md` does not list the row's date fields, so it was left alone.
- Not verified in a browser.
2026-10-05 21:37

## FIX05 Method Of Collapsing Search Panel

[X] Resolved
[X] No Tests

The admin search panel should be collapsible to save space on the page. 
A toggle button is added to collapse and expand the panel.  
After a search is executed and results are displayed, the panel should be collapsed.

### Suggested Implementation
- `src/public/admin.html`: added a toggle button above the search form with the text "Collapse Search".
- `src/public/adminCard.js`: added event listeners to the toggle button to collapse and expand the search form.
- Tests: `tests/client-admin-search.test.ts` gains a case that the search panel can be collapsed and expanded. Tests postponed by the developer (No Tests); written, not run. `tsc` passes.
- Not verified in a browser.

### RESOLUTION
Applied as recommended; the "Suggested Implementation" above had not been built, and its `adminCard.js` is the poll card, so the logic went in `adminList.js`, which drives the search form, the view tabs and the results.
- `src/public/admin.html`: `button#adminSearchToggle` ("Collapse Search" / "Expand Search", a chevron, `aria-expanded`, `aria-controls="adminSearchForm"`) in `div.admin-search-toggle-row` directly above the form and outside it.
- `src/public/adminList.js`: `paintSearchPanel()` applies the Search-view visibility (the form's `hidden`, as before), the form's `data-collapsed` attribute, the toggle's `aria-expanded` and its label together; `setSearchCollapsed()`; the toggle's click; the submit handler now awaits `selectTab("search")` and collapses the panel only when a result card is on screen (no matches or an error leave it open); Clear sets it expanded; the toggle row is removed for a poll creator who is not an administrator. The state is a module variable, not stored, and the timed refresh never touches it.
- `src/public/admin-search-m3.css`: `.admin-search[data-collapsed]{ display:none }` and the toggle styles (a 48px text button in the cards' 420px column, state layers, chevron turned over while collapsed).
- Tests: `tests/client-admin-search.test.ts` (the toggle shows only in the Search view with the right labels and attributes; collapses and expands by hand keeping typed text; collapses after a search with results; stays open for no matches; stays open through Clear; is not collapsed again by the timed refresh once expanded) and `tests/admin-search-assets.test.ts` (the collapsed and toggle rules). Tests postponed by the developer (No Tests); written, not run. `tsc` and a syntax check pass.
- Artifacts: `spec.md` (User Story 5, FR-016–FR-019, SC-007, a clarification), `plan.md`, `research.md` R14, `data-model.md`, `contracts/ui-contracts.md` C8, `quickstart.md`, `tasks.md` T027, `README.md`, `ARCHITECTURE.md`, `CLAUDE.md`, `designDocs/027-high-level-requirements-admin-search.md` and a note on the architecture document.
- The `[] Resolved` checkbox line was written without a space; it is now `[X] Resolved`.
- Not verified in a browser. Nothing on the toggle shows which filters are active while the panel is collapsed.
2026-10-06 01:52


## FIX06 Update Admin Search Card Field Labels
[X] Resolved
[X] No Tests

Update the following field labels on the Admin Search Card:  
- Created by (contains) -> Created by user name (contains)
- State -> State ( Initialized, Open, Closed, etc.)
- Created -> Created on
- Starts -> Starts on
- Ends -> Ends on
- Votes -> Vote count
- Invited -> Invitee count
- Banned -> Banned users count

### RESOLUTION
- `src/public/admin.html`: the eight labels changed as listed. I read "State ( Initialized, Open, Closed, etc.)" as having a stray space and wrote "State (Initialized, Open, Closed, etc.)". The six date and count labels sit on the operator selects, so those changed; the value fields keep "Date" and "Count". Ids, `name`s and the search request are unchanged.
- `src/public/admin-search-m3.css`: the operator/value pair is now two equal columns (it was 40/60), so "Banned users count" fits instead of being cut off with an ellipsis. The date field's room at 320 px is not checked.
- Tests: `tests/client-admin-search.test.ts` (the label texts) and `tests/admin-search-assets.test.ts` (the equal columns). Tests postponed by the developer (No Tests); written, not run. `tsc` passes.
- Artifacts: `spec.md` (FR-008 and a clarification), `research.md` R3, `contracts/ui-contracts.md` C3, `quickstart.md`, `tasks.md` T028, `designDocs/027-high-level-requirements-admin-search.md` (Components).
- Not verified in a browser.
2026-10-06 02:00

## FIX07 Expand Search On Menu Search Click
[X] Resolved
[X] No Tests

When the `Search` item in the menu is clicked, the Admin Search panel should automatically expand if it is collapsed.

### RESOLUTION
- `src/public/adminList.js`: the admin tab bar's click handler now calls `setSearchCollapsed(false)` when the clicked tab is Search, before `selectTab`. A click expands a collapsed panel whether it comes from another view or from the Search view itself. It is a click-only rule: a search's own `selectTab("search")` runs before the panel is collapsed, so a search still collapses it afterwards, and the timed refresh and the page load are unchanged.
- Tests: two cases in `tests/client-admin-search.test.ts` (a click on Search expands the panel from another view and from the Search view; a search after that click still collapses it). Tests postponed by the developer (No Tests); written, not run. `tsc` and a syntax check pass.
- Artifacts: `spec.md` (User Story 5 scenario 6, FR-018, a clarification), `contracts/ui-contracts.md` C8, `research.md` R14, `quickstart.md`, `tasks.md` T029, `README.md`, `designDocs/027-high-level-requirements-admin-search.md`, `CLAUDE.md`.
- The FIX07 section was added to this file from your pasted text, since it was not here.
- Not verified in a browser.
2026-10-06 02:03
