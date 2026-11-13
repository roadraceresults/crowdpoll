# Data Model: Admin Search Results List

Nothing is stored: no table, column, cache key, setting, cookie or browser storage entry is added or changed. The
model below is the browser's in-memory state of the Search view in `src/public/adminList.js`.

## Source: one search result (unchanged)

An element of `polls` in the response of `GET /api/admin/polls/search` (`adminListRow` in `src/routes/pollsApi.ts`).
The row reads only:

| Field | Used for |
|---|---|
| `pid` | the result's identity, `data-pid`, the panel's id |
| `title` | the title cell and the tooltip; blank shows "(untitled)" |
| `subtitle` | the subtitle cell; not displayed when blank |
| `pollState` | the state cell, "Poll state: <state>" |
| `pollVisibility`, `pollSharingMode` | "Public", "Private (invitation)" or "Private (shared link)" |
| `createdByName`, `createdByEmail`, `createdAt` | the creator cell: "Created by: <name, else email> on <local date>" |
| `voteCount` | "N voters" / "1 voter" |

The whole object is passed to `window.AdminCard.create` when the row is opened, exactly as the card list does today.

## View state

| Name | Type | Meaning |
|---|---|---|
| `resultRows` | `Map<pid, result>` | the result elements on screen; emptied when the view is left |
| `openPid` | `pid \| null` | the one open result; `null` when every row is closed |
| `editingPid` (existing) | `pid \| null` | the poll being edited; while set, the list is held |
| `controllers` (existing) | `Map<pid, controller>` | in the Search view: the open card's controller, plus any kept for saved wizard progress |
| `activeSearch` (existing) | `URLSearchParams \| null` | the last submitted search |

A **result** is `{ element, button, panel, cells }` for one pid.

## States of a result

| State | Markup | Enters when | Leaves when |
|---|---|---|---|
| Closed | `aria-expanded="false"`, panel `hidden` and empty | drawn; its row or another row is selected; a fresh load | selected |
| Open | `aria-expanded="true"`, `admin-result--open`, panel holds the card | selected; the single result of a fresh load | selected again; another row selected; a fresh load; its poll stops matching |
| Open, editing | as Open, button `disabled` | the card's edit session starts | Save, Cancel, session lost |
| Held | `disabled`, `title="Finish editing the open poll first"` | another poll's edit starts | that edit ends |
| Removed | element gone | its poll is not in a response, and it is not being edited | — |

Rules:

- at most one result is Open (`openPid`);
- only a fresh load (`selectTab`) opens a result without a click, and only when the response holds exactly one poll;
- a non-fresh load (the periodic refresh, a card action) never changes which result is Open;
- the result of `editingPid` is never Removed.

## The notice

| Response | `#adminSearchNotice` |
|---|---|
| request failed | the server's error, or "The search could not be run." (unchanged) |
| `truncated` | "More polls match than are shown. Narrow the search." (unchanged) |
| no polls | "No polls match." (unchanged) |
| 1 poll | "1 poll matches." |
| N polls | "N polls match." |
| no search yet | hidden (unchanged) |
