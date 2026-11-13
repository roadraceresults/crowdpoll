Start a new spec for these requirements called `20261113-102117-ADMIN-SEARCH-RESULTS`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

This feature improve the UIUX of the Admin Search feature.  

Currently, when the admin enters search terms and clicks "Search" button,  
all the results are listed in a full height Admin Poll Card, making it difficult to quickly scan through the search results.  

Please research and suggest a way for the admin to more easily see the search results and then select one of the polls to view the full Admin Poll Card then Edit it if needed.

## Decisions

Recorded by `/speckit-requirements` from the findings accepted in `requirements-report.md` (2026-11-13).  

- **Layout (RS1)**: the Search view lists its results as compact rows, one poll per row;  
  selecting a row opens that poll's full Admin Poll Card directly under the row (rows that expand in place).  
  The card itself is unchanged and is edited as today.  
  A list-detail (two-pane) layout and a results table with a dialog were considered and not chosen.  
- **Scope (AM1)**: the Search view only.  
  The Newest, Awaiting Approval and Rejected views, and a poll creator's own list, keep their full cards.  
- **What a row shows (UA1)**: the title, the state, the visibility, the creator's name, the created date and the voter count, on one line on desktop.  
  - The title comes first and is cut with an ellipsis when it does not fit, with the full title as its tooltip;  
    a poll with no title yet shows "(untitled)".  
  - The state is the raw `pollState` (e.g. `OPEN`, `EDITING`), shown as a chip;  
    the visibility reads "Public" or "Private", as on the search form.  
  - The creator is the creator's user name, or their email address when they have none;  
    the created date is the administrator's local date;  
    the count reads "N voters" ("1 voter" for one).  
  - The results list is up to 840 px wide and centred, wider than the page's 420 px column;  
    a row is one line when the window is at least 720 px wide;  
    the open card keeps its 420 px, centred under its row.  
  - In a window narrower than 720 px the row wraps to two lines: the title, then the other facts.  
  - A row carries no buttons or actions menu: every action stays on the card.  
  - The order of the rows is the search's own, newest first; there is no sorting.  
- **Opening and closing (UA2)**: one card is open at a time.  
  Selecting a row opens its card under it, selecting it again closes it, and selecting another row moves the card there.  
  - Every row starts closed after a search, except that a search with exactly one result opens it at once.  
  - The open row stays visible above its card and is marked as selected.  
  - When the administrator opens a row that is then not fully visible, the page scrolls it to the top of the visible area, below the fixed header;  
    otherwise the page does not scroll, and a single result that opens by itself never scrolls.  
  - A new search, Clear, or leaving the Search view closes the open card; which row was open is not remembered.  
- **While a card is being edited (UA3)**: the rows are held, as the tabs and Create New Poll already are.  
  - The edited card's row cannot be closed and no other row can be opened;  
    the held rows are disabled and carry the tooltip "Finish editing the open poll first".  
  - The Search and Clear buttons are held in the same way.  
  - Save, Cancel or a lost session releases them.  
- **The periodic refresh (UA4)**: rows are updated in place; the open card stays open and keeps its focus and scroll position.  
  - A row's facts and the open card follow each refresh.  
  - A poll that no longer matches loses its row, and its card with it if it was open;  
    the poll being edited keeps its row and card until the edit ends.  
  - A poll that newly matches appears as a closed row in its place in the order.  
  - A refresh never opens, closes or moves a card by itself, and never opens the single result of a search a second time.  
- **The result count (UA5)**: the notice above the rows reads "N polls match." ("1 poll matches.").  
  - The empty message ("No polls match.") and the cut-off message stay as they are.  
  - The count follows each refresh, in the existing `#adminSearchNotice`.  
  - The search panel still collapses by itself once a search has put results on screen.  
- **Look and keyboard (UA6)**: each row is one Material 3 list-item button following the W3C APG disclosure pattern.  
  - The whole row is a `<button>` with `aria-expanded` and `aria-controls` naming its card; Enter and Space toggle it, Tab moves from row to row.  
  - It is at least 48 px tall, with a hover state, a visible focus ring, a ripple and a chevron that turns when the row is open.  
  - Opening a row leaves the focus on the row; the card follows it in the tab order.  
  - Its styles go in `admin-search-m3.css`, M3 tokens only, with no new stylesheet and no change to `LAYER_ORDER`.  
  - It works in the light and dark color schemes.  
- **Server and contract (UA7)**: unchanged.  
  `GET /api/admin/polls/search` and `postman/openapi.json` stay as they are, and the rows and the card are drawn from the same response.  
  - The feature is a browser-only change (`admin.html`, `adminList.js`, `admin-search-m3.css` and their tests).  
  - A card is created when its row is first opened, so the invitees of a poll are requested only then.  
  - No setting, cookie or browser storage key is added.  
