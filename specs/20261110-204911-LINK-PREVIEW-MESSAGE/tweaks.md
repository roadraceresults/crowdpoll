# Overview: `specs/20261110-204911-LINK-PREVIEW-MESSAGE`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261110-204911-LINK-PREVIEW-MESSAGE` |
| Tweak file created | 2026-11-11 09:24 |
| Last updated | 2026-11-11 11:14 |

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

## TWEAK02 Dash Between Subtitle And Message  
[X] Resolved  
[ ] Run Tests  

The screenshot below shows the link preview WITH and WITHOUT subtitle and notes:  
![Poll Preview](requirements\20261110-202128-link-preview-message\preview-screenshot.jpg)  

Question 1: when there is no subtitle or notes, where does the message "Vote and see live results: Title" come from?  

When there is a subtitle and/or notes, it looks great.  
One small change request: is it possible to append please add a dash ("-") after the subtitle if there are notes.    
Currently, the two seems to run together visually, making it harder to distinguish the subtitle from the notes.  
This screenshot shows how it looks when I manually appened a dash to the subtitle:  
![Poll Preview with Dash](requirements\20261110-202128-link-preview-message\preview-dash-appended.jpg)


 
### RECOMMENDATION

**Question 1**: the line "Vote and see live results: <title>" is CrowdPoll's own fallback, not the messaging app's.  
`linkPreviewDescription` in `src/seo/loginPage.ts` returns it when the poll has neither a subtitle nor a Custom Email Message;  
it copies the wording `src/seo/pollPage.ts` has used for a public poll without a subtitle, so the two previews read alike (spec FR-003, research R3).  

**The dash**: the description joins the subtitle and the message with a blank line (`"\n\n"`), but every messaging app collapses whitespace in a preview card, so the two run together with a single space between them, as the first screenshot shows.  

- **Recommendation A** _(recommended)_: join them with a spaced hyphen instead, `" - "`, which reads exactly as the second screenshot;  
  the subtitle alone, the message alone and the fallback line stay as they are.  
  - Code: `src/seo/loginPage.ts`, `.join("\n\n")` becomes `.join(" - ")`, and its doc comment says "a dash" instead of "a blank line".  
  - Tests: `tests/seo.test.ts`, the two expectations that pin the blank line (`"S\n\n" + …` and `"\n\nbbb"`) pin `" - "` instead;  
    written, not run (Run Tests not ticked).  
  - Artifacts: every line that says "a blank line": `spec.md` (US2 independent test, scenario 1, FR-003), `research.md` (R3 heading and rule, R8 list), `data-model.md` (the `description` row), `contracts/page.md` (P1), `quickstart.md` (step 2), `tasks.md` (T007, T010), `CLAUDE.md`, `CLAUDE_COMPLETE.md`, `ARCHITECTURE.md`, `README.md`.  
  - Pros: one separator change; every app shows the subtitle and the message set apart, as asked.  
  - Cons: a subtitle that already ends in punctuation reads "Vote now! - …";  
    acceptable, the dash still marks where the message starts.  

- **Recommendation B**: keep the blank line and end the subtitle with the hyphen, `"S -\n\nmessage"`, so a reader that keeps line breaks (a crawler's cached text, a bot quoting the description) still shows two paragraphs.  
  - Pros: the paragraphs survive wherever whitespace is kept;  
    the cards collapse it to the same "S - message" as A.  
  - Cons: no preview card keeps the blank line, and a dangling hyphen at the end of a line looks odd wherever the lines do stay apart;  
    a longer rule to state in every artifact.  

2026-11-11 11:10  

### ACCEPTED RECOMMENDATION

Recommendation A, accepted by "Accept".  
- Code: `src/seo/loginPage.ts` joins the subtitle and the plain-text message with `" - "` instead of `"\n\n"`;  
  its doc comment says so.  
- Tests: `tests/seo.test.ts`, the composition test now expects `"S - " + notesPlainText(message)` and the 300-character test expects `"aaa… - bbb"`;  
  written, not run (Run Tests not ticked);  
  `npx tsc --noEmit` is clean.  
- Artifacts, every statement of the rule: `spec.md` (US2 independent test, scenario 1, FR-003), `research.md` (R3 heading, rule and note on why the dash, R8 list), `data-model.md`, `contracts/page.md` (P1), `quickstart.md` (step 1), `tasks.md` (T007, T010, US2 independent test), `CLAUDE.md`, `CLAUDE_COMPLETE.md`, `ARCHITECTURE.md`, `README.md`.  
- Left as written: `requirements/20261110-202128-link-preview-message/requirements-report.md`, the record of the decision taken then.  
- Question 1 is answered in the recommendation above: the fallback line is CrowdPoll's own, from `linkPreviewDescription`.  
2026-11-11 11:14  

## TWEAK03 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  

