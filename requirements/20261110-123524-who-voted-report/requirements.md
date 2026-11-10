Start a new spec for these requirements called `20261110-123524-WHO-VOTED-REPORT`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

This feature will add a report of who voted for what for Private Polls that are not anonymous.  
 
The report will appear on the Maximize Poll view as a panel that has the same appearance as the Notes panel,   
in the right column,  
below the Notes panel if there is one  
otherwise, the top of the right column.  

The UI/UX of the panel will adhere to material 3 design guidelines, and have a consistent look with existing Crowdpoll webapp.  

The current vote (or votes) will be revealed.  
If a poll allows votes to be changed, the report does not display previous votes, only the current ones.  
The report will change as the bars change in the Poll Card that is in the left column of the Maximize Poll view.  

Above the table will be two buttons:
(Sort by Voter) (Sort by Choice)

When Sort by Voter is selected, the table will be sorted alphabetically by voter name, and then by choice in the order they appear on the Poll Card front.
In that case, the report will be in the form of a table:
| Voter | Choice | Date
|-------|--------|----|
| Alice | Option 1 | 2024-06-10 |
| Bob   | Option 2 | 2024-06-10 |  

If the poll is multiple choice   
| Voter | Choice | Date
|-------|--------|----|
| Alice | Option 1 | 2024-06-10 |
|       | Option 2 | 2024-06-10 |
| Bob   | Option 2 | 2024-06-10 |  
|       | Option 4| 2024-06-10 |  
|       | Option 6| 2024-06-10 |  


When Sort by Choice is selected, the table will be sorted by choice in the order they appear on the Poll Card front, and then by voter name alphabetically.
In that case, the report will be in the form of a table:
| Choice | Voter | Date
|-------|--------|----|
| Option 2 | Luke   | 2024-06-10 |  
|  | Mark   | 2024-06-10 |  
|  | Tom   | 2024-06-10 |  
| Option 1 | Alice | 2024-06-10 |
|  | Mark | 2024-06-10 |
|  | Matthew | 2024-06-10 |
|  | Paul   | 2024-06-10 |

_The example rows show the layout only; the groups follow the order of the bars (see Decisions, AM1), not the order shown here (IN1)._  


The rows of the table will alternate background color for readability.  
To be more clear, a row is either all the choices for a voter,   
or all the voters for a Choice.

The panel will grow to fit the entire table.

## Decisions (from requirements-report.md, 2026-11-10 1:08 PM)

- **Order of choices (AM1, IN1)**: "the order they appear on the Poll Card front" is the live bar order, highest percentage first, ties in the creator's order (`position`).  
  In Sort by Choice the groups move when one choice overtakes another;  
  in Sort by Voter a voter's choices follow the same order.  
- **Date (AM2, UA2)**: the date of the voter's current vote (`voted_at`), shown on every line of that voter's choices.  
  It is the day in the viewer's time zone, in the viewer's locale (`Intl.DateTimeFormat`, `dateStyle: "medium"`, e.g. `Jun 10, 2024`), inside a `<time datetime="…">` whose tooltip gives the date and time;  
  the route sends `voted_at` as an ISO 8601 instant.  
- **Votes listed (UA1)**: exactly the votes the bars count: rows with at least one choice id that is still a choice of the poll (as projected, so the stashed choices while `EDITING`);  
  choice ids no longer on the poll are left out;  
  invited addresses that have not voted are not listed;  
  a deleted account's vote is listed under `Deleted user`, one entry per vote;  
  a banned voter's vote is listed exactly when the bars still count it.  
- **Refresh (UA3)**: `tabs.js` gains a `syncVoters` beside `syncNotes`: it fetches on maximize and whenever the maximized card's `countsVersion` changes, and drops a reply that arrives after a newer request or after the view closed.  
  When the reply lists a different number of voters from the card's `totalVoted`, it fetches once more after `ENV_VOTE_QUEUE_LAG_NOTICE` (2 s), then waits for the next change.  
  No new timer or setting.  
- **Route (UA4)**: a new signed-in route, `GET /api/me/polls/:pid/voters`, body `{ voters: [{ name, choiceIds, votedAt }] }` (names only, no email address);  
  `404` when the poll is public, anonymous, or one the caller may not view;  
  `Cache-Control: private, no-store`;  
  behind the terms gate, rate-limited like Live Results, and added to `postman/openapi.json`.  
  The browser takes choice labels and order from the card it already holds.  
- **Sort control (UA5)**: one M3 single-select segmented button with the segments `Sort by Voter` and `Sort by Choice` (`aria-pressed`, check mark on the selected one);  
  Sort by Voter is selected first;  
  the selection lasts while the poll stays maximized, survives refreshes, and resets when the view closes;  
  no browser storage key.  
- **Table structure (UA6)**: one `<tbody>` per group, its first cell a `<th scope="rowgroup" rowspan="n">` holding the voter or choice;  
  backgrounds alternate per group with M3 surface tokens (`surface-container-low` / `surface-container`);  
  Sort by Choice lists only choices with at least one voter.  
- **Panel content and states (UA7)**: `<section class="maximized-voters">` with the heading `Who voted`, the sort control, then the table;  
  before the first vote it shows the heading and `No votes yet.` without the sort control;  
  it appears in `OPEN`, `CLOSED` and `EDITING` (judged by the stashed state) and never where the card shows no results;  
  it is hidden and emptied when the view closes or a refresh finds the poll no longer qualifies.  
- **Name shown (UA8)**: the name stored with the vote (`votes.user_name`), as the admin results page shows it;  
  a later profile rename shows once the voter votes again.  
- **Placement (UA9)**: the template gains `<section class="maximized-voters" hidden>` between `.maximized-notes` and `.maximized-graph`;  
  the order is Notes, Who voted, line graph, in both the two-column and the single-column layout;  
  the panel never scrolls on its own: it grows with the table and the page scrolls.  
- **Who may see it (NC1)**: everyone who may see the poll's results (`mayViewResults`: the creator, invitees, people who reached it by its link or voted), and administrators.  
- **Identifying voters (NC2)**: the name only;  
  two voters with the same name are two separate groups;  
  no part of an email address reaches the browser.  
