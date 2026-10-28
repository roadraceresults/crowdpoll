Start a new spec for these requirements called `20261028-114023-LINE-GRAPH-TOGGLE`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

We have derermined that some Polls are not appropriate for a line graph.  
By default, every poll will not have line graph enabled.  
There will be a checkbox on the Poll creation/editing interface to enable the line graph.  
This checkbox will only be available to one of the Admin Users.    

The checkbox will be on the Current Poll Card tab called "Colors".  
This tab will be renamed to "View".  
The "View" tab will now contain the checkbox to enable the line graph for the poll.  
For  Admin Users, this appear above colors selectors.  

Of course, a database field will be needed to be added to the polls table.



## Resolved Decisions

- **Who may change it (AM1).**  
  Any Administrator (an `ENV_ADMINS` address, the `isAdminEmail` rule) can switch the line graph on or off.  
  Poll creators who are not Administrators never see or change it.  
- **What a creator sees (AM2).**  
  For a creator who is not an Administrator, the checkbox is absent and the "View" step shows only the color pickers, as today.  
- **The renamed step (AM3).**  
  The admin card wizard's step 4, "Colors", is renamed "View" in both its circle and its heading.  
  It keeps its number, and the Settings Summary keeps linking to it.  
  The color picker popover keeps its own accessible name, "Colors".  
- **A poll with the graph off (UA1).**  
  When maximized, it shows no graph and makes no graph request, and the maximized card is laid out as it was before the line graph.  
  The graph route `GET /api/polls/:pid/line-graph` answers `404` for such a poll.  
- **When it may change (UA2).**  
  The setting may change in every poll state, with votes or without.  
  It joins `UPDATE_FIELDS`, and the colors-only path (`POST /api/admin/polls/:pid/colors`) accepts it too.  
  Changing it never sends the poll for review and never pauses voting beyond the open edit session.  
- **Protecting the setting (UA3).**  
  The browser sends the setting only for an Administrator.  
  The server refuses a request carrying it from anyone else with `403`;  
  a request without it leaves the stored value as it is.  
- **Existing polls (UA4).**  
  Every existing poll is off too: the migration adds the column with `DEFAULT false` and no backfill.  
- **The Settings Summary (UA5).**  
  When the graph is on, the summary's "View" line adds "The line graph is shown.", for everyone who sees the card;  
  nothing is added when it is off.  
- **How the home page learns it (UA6).**  
  The poll projections carry `lineGraphEnabled`, `deltaClient.js` copies it, and `tabs.js` mounts the graph only when it is true.  
  A change reaches open cards on their next content refresh.  
- **Before the poll has choices (UA7).**  
  For an Administrator the checkbox is shown first in every case;  
  the "Add your choices first" note takes the place of the color pickers below it.  
- **Order of work (NC1).**  
  The `poll-line-graph` branch is merged into `dev` first;  
  this feature is built on top of it and only adds the setting.  
  Both merges should reach `dev` in the same push, since pushing `dev` deploys, so `dev` never shows a graph on every poll.  
- **One name (AM4).**  
  The setting is `lineGraphEnabled` everywhere in JSON (request bodies, poll projections, admin rows, `postman/openapi.json`) and `line_graph_enabled` for the column.  
- **The admin card's source (UA8).**  
  The admin list and search rows carry `lineGraphEnabled` for every poll, for every caller who may see the row;  
  the checkbox starts from it, and the Settings Summary line reads it.  
  Only the checkbox is Administrator-only.  
- **A graph on screen when switched off (UA9).**  
  The graph stays until the maximized view is closed;  
  a `404` from its next refresh shows the graph's existing note, as on the `poll-line-graph` branch.  
