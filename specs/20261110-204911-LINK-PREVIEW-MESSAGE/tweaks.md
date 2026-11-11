# Overview: `specs/20261110-204911-LINK-PREVIEW-MESSAGE`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261110-204911-LINK-PREVIEW-MESSAGE` |
| Tweak file created | 2026-11-11 09:24 |
| Last updated | 2026-11-11 09:27 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Commit And Push The Feature  
[X] Resolved  
[ ] Run Tests  

In order to test this feature we need to deploy it to Digital Ocean.  
There is no risk because Production is still only open to specified test users. 
So, please commit and push your changes to the repository. 

### RECOMMENDATION

Commit every change of the working tree on the branch `link-message` in one commit, and push it to `origin/link-message`.  
- The code: `src/seo/loginPage.ts` (new), `src/seo/pollPage.ts`, `src/routes/pages.ts`, `src/polls/access.ts`, `src/public/adminCard.js`;  
- the tests: `tests/seo.test.ts`, `tests/client-admin-wizard.test.ts`;  
- the documents: `README.md`, `ARCHITECTURE.md`, `CLAUDE.md`, `CLAUDE_COMPLETE.md`;  
- the Spec Kit record: `specs/20261110-204911-LINK-PREVIEW-MESSAGE/` (this file included), `requirements/20261110-202128-link-preview-message/`, `.specify/*.json`;  
- `package-lock.json`, whose only change is the package name and version already in `package.json`.  
No test is added: a commit is nothing a test can observe;  
the suite was run green before (175 files, 2794 tests) and nothing has changed since.  
No artifact changes: the feature's artifacts already describe the implementation.  
Note: `CLAUDE.md` says the App Platform deploys from `main` with `npm run deploy`, so the deployment itself still needs the branch merged into `main` and that command run;  
the tweak asks for the commit and the push only, and nothing else is done.  
2026-11-11 09:27

### ACCEPTED RECOMMENDATION

Committed the working tree on `link-message` as "Link preview message: a published poll's title, subtitle and custom email message on the login page's head" and pushed it to `origin/link-message`.  
- Tests: none added (nothing a test can observe);  
  the run was postponed (Run Tests not ticked), the suite having passed before the commit.  
- Artifacts: none needed.  
- Left for the developer: merging into `main` and `npm run deploy`, which start the App Platform release.  
2026-11-11 09:27

## TWEAK02 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  


