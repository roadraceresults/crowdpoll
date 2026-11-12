Start a new spec for these requirements called `20261112-173521-ADMIN-SEARCH-CHECKBOXES`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

This feature will add two checkboxes to the Admin Search fields.  

On a new row, under the "Any vote mode", "Vote can change" "First vote is final" radio buttons,  
add two checkboxes:  

"Line graph enabled" and "Custom colors set"


## Decisions

- **Unticked means no filter** (AM1 A): a ticked box keeps only the polls that have the setting;  
  an unticked box does not narrow the list, so an untouched form searches exactly as today.  
- **"Custom colors set"** (AM2 A): at least one of the poll's choices has a hand-picked color (a `color` on an element of `polls.choices`).  
- **Combination** (UA1): every ticked box and every other filled-in control are ANDed, as the rest of the form is.  
- **Parameters** (UA2): `GET /api/admin/polls/search` takes two optional query parameters, `lineGraphEnabled=true` and `customColors=true`, sent only when the box is ticked;  
  a blank value is ignored and any other value answers `400`;  
  both are described in `postman/openapi.json`, and covered by the server, client and contract tests.  
- **Look and behavior** (UA3): one row of two M3 checkboxes directly under the Vote mutability group, labelled exactly "Line graph enabled" and "Custom colors set";  
  each option at least 48 px tall with a visible focus ring;  
  the same grid as the radio groups, one column on narrow screens;  
  styled in `admin-search-m3.css` with M3 tokens only;  
  unticked by default and not remembered between visits.  
- **Stored values only** (UA4): the filters read the saved `line_graph_enabled` and `choices`, never a poll's unsaved edit or `pending_update`.  
