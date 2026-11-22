# Overview: `specs/20261120-175903-COLOR-CONTRAST`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261120-175903-COLOR-CONTRAST` |
| Tweak file created | 2026-11-21 01:05 |
| Last updated | 2026-11-22 00:14 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Snapshot Each Tweak For Comparison  
[X] Resolved  

**Trial and Error with no intermediate tests**  
This feature is going to require many iterating through many tweaks of trial-and-error with color adjustments and may even redesigning soem UI controls and placement.  
As we do this T&E process will postpone the tests until we deem the feature complete.  
There is no point runn ing tests on something that may change.  
Lately, the time spent on tests is growing significantly.  
Before running any tests, asks the developer. We will soon put this principal in the constitution.md file.  

----------------------------------------

To help with comparing the appearance of TweakN with the previous TweakN-1,  
implement a way to select a Tweak by number (n) so that the developer can easily switch between different iterations for comparison.  
It can be done with switches in the code, but that cold get confusing.  
Or it could be done using commits to record a specific Tweak iteration.  
In this case the commits could be pushed to a remote repository, allowing the agent to easily switch between different Tweak iterations by checking out the corresponding commit that the developer has requrested.  
But those are just ideas we had.  
It is definitely better if you pursue whichever method you feel is the best overall.  

Before we start the iterating, we can record the current state as TWEAK01. It is the result of the /speckit-implement skill applied to the current feature state.  

### RECOMMENDATION

Record each iteration as a git commit with a tag, and look at any two side by side in two local servers.  
No switches in the code.  

- **`devScripts/tweak.ps1 save <n>`**: commits the whole working tree on `color-scheme` as `TWEAK<nn>: <title>` and tags it `color-contrast-TWEAK<nn>` (local tag; pushing is left to the developer).  
- **`devScripts/tweak.ps1 show <n> [-Port 8081]`**: checks the tag out into its own worktree `C:\crowdPoll\color-scheme-TWEAK<nn>` (detached, read-only use), links `node_modules` to this one, copies the local `launch-dev.ps1` with the port changed, and starts that copy.  
  The current iteration keeps running on 8080 and the chosen one opens on 8081, against the same development database.  
  The sign-in cookie is per host, not per port, so both are signed in.  
- **`devScripts/tweak.ps1 list`** and **`stop <n>`**: list the saved iterations; remove a worktree when done.  
- `.gitignore` gains `!devScripts/tweak.ps1`.  
- TWEAK01 is recorded with `save 1` once this tweak is applied: the state `/speckit-implement` delivered, plus this script.  

Tests: none; a dev script for the developer's eyes has nothing the suite observes, and the tweak asks that no test run without asking.  
Artifacts: `quickstart.md` gains a short "Comparing tweak iterations" section;  
no spec, plan or task change, since nothing the site does changes.  

2026-11-22 00:13

### ACCEPTED RECOMMENDATION

- `devScripts/tweak.ps1` (new): `save <n> "<title>"`, `list`, `show <n> [-Port 8081]`, `stop <n>`, as recommended;  
  tags are `color-contrast-TWEAK<nn>` (`-Prefix` changes it for a later feature).  
- `.gitignore`: `!devScripts/tweak.ps1`.  
- `quickstart.md`: new section "Comparing tweak iterations".  
- TWEAK01 recorded: one commit of the state `/speckit-implement` delivered plus this script, tagged `color-contrast-TWEAK01`.  
  Nothing was pushed.  

Tests: none written, since a developer script has nothing the suite observes;  
none run, as this tweak asks (no `Run Tests` line).  
The script was checked by the PowerShell parser (0 errors) and `list` ran;  
`show` and `stop` are unverified until first used.  
This tweak had no resolution checkbox line, so `[X] Resolved` was added under its heading.  

2026-11-22 00:14






## TWEAK02 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  
