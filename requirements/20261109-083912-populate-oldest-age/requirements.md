Start a new spec for these requirements called `20261109-083912-POPULATE-OLDEST-AGE`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

Update the script "devScripts\populate\populate-poll.ts" so that there is an optional field called:
"oldestAgeInDays"

This field should represent the oldest age in days for the poll data to be considered.
If not provided, the script should consider all poll data regardless of age.

If the field is provided, the script should only consider poll data that is no older than the specified number of days.


## Additional Requirements (2026-11-09 8:45 AM)

We made a mistake naming he new field.  
It should be "oldest_age_in_days".  
In other words, the field name should follow the snake_case convention rather than camelCase.

## Decisions (from `requirements-report.md`)

- The limit is an optional key of the poll data file, not a command-line option (AM1).  
  `populate-all-polls.ts` does not change: adding or changing the key changes the file's SHA-256, so its next run repopulates that file.  
- The key is spelled `oldest_age_in_days`, in snake case like the file's other keys;  
  it replaces the name `oldestAgeInDays` used above (AM2).  
- A data point's age is measured after the dates are moved so that the latest point falls on today:  
  a point is kept when its moved date is no earlier than today minus `oldest_age_in_days` days (AM3).  
- `oldest_age_in_days` is a whole number of at least 0, and the boundary is inclusive (UA1):  
  - `0` keeps only today's point;  
    `30` keeps today and the 30 days before it.  
  - Any other value (`-1`, `2.5`, `"30"`, `null`) stops the run with `[populate] Error: "oldest_age_in_days" must be a whole number of at least 0, not …`, before anything is written.  
  - The latest point is always kept, so the filter never leaves nothing;  
    a limit larger than the file's span keeps every point.  
- The kept points replace the file's points everywhere (UA2):  
  - the poll's `start_at` and `launched_at` (and, for a new poll, `created_at`) are the first kept point's day;  
  - only the kept points are replayed as votes;  
  - the 12-month note is printed only when the kept span exceeds 12 months;  
  - when the limit removes points, the run prints one line, e.g. `[populate] Kept 31 of 3,094 data points (oldest_age_in_days 30)`.  
- The populate README documents the key in its key table, with an example (UA3).  
  `tests/populate-poll.test.ts` covers: the key absent (every point kept), a limit that drops points (votes, `start_at`, the kept-points line), `0`, a limit larger than the span, and each invalid value.  
