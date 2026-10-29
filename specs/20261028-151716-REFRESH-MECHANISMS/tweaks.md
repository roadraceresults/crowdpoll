# Overview: `specs/20261028-151716-REFRESH-MECHANISMS`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261028-151716-REFRESH-MECHANISMS` |
| Tweak file created | 2026-10-29 03:21 |
| Last updated | 2026-10-29 03:45 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Local Launch Files Flush Interval  
[X] Resolved  
[ ] Run Tests  

Please update the following files with the new environment variable values:
- .vscode\launch.json
- devScripts\launch-dev.ps1 

### RECOMMENDATION

The feature's only environment change is `ENV_COUNTER_FLUSH_INTERVAL`, 2000 → 10000 (R10);  
it added no new setting.  
`launch.json.example` and `devScripts.example/launch-dev.ps1` already carry 10000.  

- `.vscode/launch.json`: set `"ENV_COUNTER_FLUSH_INTERVAL": "10000"` in all 7 configurations (lines 55, 157, 229, 301, 373, 446, 518).  
- `devScripts/launch-dev.ps1`: set `$env:ENV_COUNTER_FLUSH_INTERVAL = "10000"` (line 69).  
- Tests: none; both files are git-ignored local configuration that no test reads, and `tests/config.test.ts` already asserts the 10000 default.  
- Artifacts: none; the templates, `CLAUDE.md` and `README.md` already say 10000.  

2026-10-29 03:24

### ACCEPTED RECOMMENDATION

- `.vscode/launch.json`: `ENV_COUNTER_FLUSH_INTERVAL` 2000 → 10000 in all 7 configurations;  
  the file still parses as JSON.  
- `devScripts/launch-dev.ps1`: `$env:ENV_COUNTER_FLUSH_INTERVAL` 2000 → 10000 (line 69).  
- Tests: none written, since no test reads these git-ignored local files;  
  `tests/config.test.ts` already asserts the 10000 default.  
  Tests postponed (Run Tests not ticked); none run.  
- Artifacts: none needed.  

2026-10-29 03:36

## TWEAK02 Outbox Drain Interval Unchanged  
[X] Resolved  
[ ] Run Tests  

Was ENV_OUTBOX_DRAIN_INTERVAL default changed?

### RECOMMENDATION

No, and none is needed: `ENV_OUTBOX_DRAIN_INTERVAL` stays 15000 by design.  
The spec's assumption (`spec.md:251`) says the outbox drain keeps its interval;  
only the counter flush (10 s) and the invitation sweep (30 s) changed (R10).  

- The value is 15000 everywhere:  
  - `src/config.ts:394`;  
  - `.do/app.yaml:184`;  
  - `launch.json.example` (7 configurations) and `devScripts.example/launch-dev.ps1:74`;  
  - `.vscode/launch.json` and `devScripts/launch-dev.ps1:73`.  
- No code, test or artifact change.  

2026-10-29 03:45

### ACCEPTED RECOMMENDATION

Answered: the default was not changed and stays 15000 (`spec.md:251`), consistent in the code, the production spec, the templates and the local launch files.  
No files edited;  
no tests, as nothing changed.  
Tests postponed (Run Tests not ticked); none run.  
Artifacts: none needed.  

2026-10-29 03:45

## TWEAK03 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  


