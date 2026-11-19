# Overview: `specs/20261118-160304-CLIENT-CODE-OBFUSCATION`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261118-160304-CLIENT-CODE-OBFUSCATION` |
| Tweak file created | 2026-11-18 22:26 |
| Last updated | 2026-11-18 22:39 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Commit And Push Before Quickstart  
[X] Resolved  
[ ] Run Tests  

From quickstart.md
```
Expected: dist-maps/pollCard.js.map exists, nothing named *.map under dist/public, and git status shows nothing new. 
```

To prepare for this, commit all and push. Run no tests until after we get through quickstart.md

### RECOMMENDATION

- Commit every change of the feature on branch `obfuscate` in one commit, and push it to `origin/obfuscate`.  
  - 14 modified files and the new ones: `devScripts/assetTransform.ts`, `tests/build-assets.test.ts`, `tests/fixtures/build-assets/`, `vitest.built.config.ts`, the `specs/` and `requirements/` folders of the feature.  
  - `dist/` and `dist-maps/` are git-ignored and stay out.  
- This tweak is recorded in the file before the commit, so the commit includes it and `git status` is clean for quickstart section 3.  
- No code changes, so there is no test to write;  
  no test is run.  

2026-11-18 22:39  

### ACCEPTED RECOMMENDATION

- Committed all changes of the feature on `obfuscate` and pushed to `origin/obfuscate`.  
- No code or artifact was edited.  
- Tests: none written (nothing a test can observe);  
  none run, as asked.  

2026-11-18 22:39  

## TWEAK02 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  
