# Overview: `specs/20261113-102117-ADMIN-SEARCH-RESULTS`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261113-102117-ADMIN-SEARCH-RESULTS` |
| Tweak file created | 2026-11-13 15:13 |
| Last updated | 2026-11-13 16:42 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Framed Zebra Result Rows  
[X] Resolved  
[ ] Run Tests  

Let's put the searrch results rows in a frame like that used for the Poll Card, Search box and other UI components.  
Use zebra striping.  
Follow the mockup in the following html file:  
"requirements/20261113-102117-admin-search-results/poll-search-results.html"

The mockup only provides an example. The colors, styles and styling of the frame should follow the design of the existing CrowdPoll weball.  
The rows and fields of the search results in the example are to be used as a reference for the content.  

In the existing implemenmtation, testers thought the OPEN batch was a button to be clicked to OPEn the poll.  

### RECOMMENDATION

Follow the mockup's structure and content with the site's own frame, colors and type.  

- **Frame** (`src/public/admin.css`):  
  in the Search view the list itself (`.admin-card-list:has(> .admin-result)`) becomes one frame, up to 840 px wide, with the cards' fill, hairline, 20 px corners (18 px under 480 px) and shadow;  
  results sit in it with no gap and a hairline between them.  
- **Zebra striping** (`src/public/admin-search-m3.css`):  
  every even result takes `--md-sys-color-surface-container`;  
  the open result (row and card panel together) keeps `--md-sys-color-secondary-container`.  
- **Row content** (`src/public/adminList.js`), two lines at every width, as in the mockup:  
  - line 1: the title, then the subtitle when the poll has one;  
    a long title wraps instead of being cut.  
  - line 2, separated by "·": "Public" / "Private (invitation)" / "Private (shared link)", "Poll state: OPEN", "Created by: <user name, else email> on <date>", "1,008 voters".  
  - the mockup's third row has no state; I take that as an omission and always show it.  
- **The state badge goes**: the state is plain text ("Poll state: OPEN"), so it no longer looks like a button.  
- **Kept as they are**: the "N polls match." status line above the list, the disclosure button, one open card, the held list, the refresh rules.  
- **Tests** (written, not run: `Run Tests` is not ticked):  
  `tests/client-admin-search.test.ts` (row structure and cell texts, the two private wordings);  
  `tests/admin-search-assets.test.ts` (frame, stripes, no badge, wrapping).  
- **Artifacts**: `spec.md` FR-002 to FR-005, scenarios 7 and 8, SC-001;  
  `contracts/ui.md` U1, U2, U9;  
  `research.md`, `plan.md`, `data-model.md`, `quickstart.md`, `README.md`, `ARCHITECTURE.md`, `CLAUDE.md`.  
- **This changes a requirement**: rows are two lines everywhere, about 68 px each, so about 11 results fit on a 1080 p screen, not the 15 that SC-001 asked for.  
  SC-001 is reworded to at least 10.  
  The requirements document (`requirements/…/requirements.md`, UA1) says one line and 15 rows; it is not edited.  

2026-11-13 16:23  

### ACCEPTED RECOMMENDATION

The recommendation above was applied as written.  

- **Code**:  
  - `src/public/adminList.js`: a row now holds `span.admin-result-main` (a heading line with title and subtitle, a facts line with visibility, state, creator and voters) and the chevron;  
    visibility reads "Public", "Private (invitation)" or "Private (shared link)";  
    the state reads "Poll state: <state>";  
    creator and date are one cell, "Created by: <name, else email> on <date>" ("Created on <date>" with no creator).  
  - `src/public/admin.css`: the list's frame (`.admin-card-list:has(> .admin-result)`), the hairline between results, and the first and last result rounded into the frame, 18 px under 480 px.  
  - `src/public/admin-search-m3.css`, section 7 rewritten: the stripe on every even result, the open tint on the whole result, two-line flex rows at least 64 px tall, wrapping text, "·" separators;  
    the state chip, the ellipsis rules and the 720 px rule are removed.  
- **Tests**: tests postponed (`Run Tests` not ticked);  
  the tweak is unverified by a test run, and nothing was looked at in a browser.  
  `npx tsc --noEmit` passes.  
  Written, not run:  
  - `tests/client-admin-search.test.ts`: the row's structure and the six cell texts in "draws one compact row per poll…";  
    "Private (invitation)" in "asks for a poll's invitees only when its row is opened".  
  - `tests/admin-search-assets.test.ts`: `describe("the result rows' style")` rewritten, 12 cases (frame, hairline and corners, stripe, row, wrapping, separators, no state border, state layer, open result, held looks, closed panel, reduced motion).  
- **Artifacts**: `spec.md` (scenarios 1, 7 and 8, the long-text edge case, FR-002 to FR-005, SC-001: 15 → 10 visible results), `contracts/ui.md` (U1, U2, U9), `quickstart.md` (steps 1, 13, 14, 15), `data-model.md`, `research.md` (R2, R4, R11), `plan.md`, `README.md`, `ARCHITECTURE.md`, `CLAUDE.md`.  
- **Requirement changed**: `requirements/20261113-102117-admin-search-results/requirements.md` (UA1) still says one-line rows and 15 visible results;  
  it was not edited.  
- **Left as they are**: the "N polls match." line stays the centred status line above the list, not the mockup's left-aligned heading;  
  the row keeps its tooltip with the full title.  

2026-11-13 16:25  

## TWEAK02 Editing Chevron And Green Dots  
[X] Resolved  
[ ] Run Tests  

Looks great!

Two changes:

1. when the Poll is in Editing mode, the "^" chevron is misleading because it can't close the row until the editing is finished.
   Consider disabling or hiding the chevron during editing.

2. please make the dot much more prominent between metadata items on the 2nd row. Try a dot that is actually colored the dark green used on the site.

### RECOMMENDATION

Both changes are styles in section 7 of `src/public/admin-search-m3.css`.  

- **Chevron**: hide it on the row of the poll being edited (`.admin-result--open .admin-result-row:disabled .admin-result-chevron{ visibility:hidden; }`).  
  `visibility` keeps its space, so the row's text does not shift when the edit starts or ends.  
  The other rows are already dimmed while held, chevron included, so they stay as they are.  
- **Dot**: replace the "·" character with a drawn 6 px round dot in `--md-sys-color-primary`, the site's green (#2C6A46 in the light scheme, its lighter counterpart in dark), with 10 px on each side.  
- **Tests** (written, not run: `Run Tests` is not ticked): `tests/admin-search-assets.test.ts`, the dot's size, shape and color, and the hidden chevron.  
- **Artifacts**: `contracts/ui.md` U9.  

2026-11-13 16:42  

### ACCEPTED RECOMMENDATION

The recommendation above was applied as written.  

- **Code**: `src/public/admin-search-m3.css`, the facts' `::before` rule and one new chevron rule.  
- **Tests**: tests postponed (`Run Tests` not ticked);  
  the tweak is unverified by a test run, and nothing was looked at in a browser.  
  Written, not run, in `tests/admin-search-assets.test.ts`:  
  "separates the facts with a round primary dot and hides an empty subtitle or fact" (updated);  
  "hides the chevron of the row being edited, which cannot be closed" (new).  
- **Artifacts**: `contracts/ui.md` (U9).  

2026-11-13 16:42  

## TWEAK03 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  
