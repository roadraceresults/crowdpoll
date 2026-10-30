Start a new spec for these requirements called `20261030-123029-POPULATE-GRAPH-SUBTITLE`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

A small change is required for the script "devScripts/populate/populate-poll.ts" to accommodate the new "graph_subtitle" field in the poll data JSON files.

## Resolved Clarifications (2026-10-30)

- The script stores `graph_subtitle` as the poll's `subtitle`, written on create and on refresh (AM1).  
- `graph_subtitle` is optional;  
  an absent or empty field means an empty subtitle, and existing files and the test fixture keep working (UA1).  
- A rerun applies the file's value, like the title and choices;  
  a file without the field clears the subtitle (UA2).  
- `graph_subtitle` is added to the key table of `devScripts/populate/README.md`, to `tests/fixtures/populate-poll.json`, and to the parse/populate tests: stored on create, applied on refresh, length validation (UA3).  
- The script enforces `SUBTITLE_MAX` (30, from `src/polls/service.ts`) on `graph_subtitle` as it enforces `TITLE_MAX` on the title;  
  an over-long value is one `[populate] Error:` line and exit 1;  
  the two data files' value is shortened by hand (e.g. "For Demonstration Purposes", 26 characters) (NC1).  
- The scope is `graph_subtitle` only;  
  the data files under `polldata/` are brought back to the documented keys (`title`, `choice_a`/`choice_b`, choice-keyed data points, `poll creator email`, `vote_count`), keeping their new `graph_subtitle` (NC2).  
