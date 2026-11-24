# Overview: `specs/20261122-012539-VOTING-CENTER-UI`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261122-012539-VOTING-CENTER-UI` |
| Tweak file created | 2026-11-24 07:43 |
| Last updated | 2026-11-24 07:54 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Results Button Reads Cast Your Vote  
[X] Resolved  
[ ] Run Tests  

Please change the label from "Voting Center" to "Cast Your Vote".

### RECOMMENDATION

Change only the results face's button label; the ballot face keeps its name, the Voting Center.  
- `src/public/pollCard.js:1929`: the `.vote-btn` label becomes "Cast Your Vote".  
  The sizers keep "Submit vote(s)", so `fitLabel` shrinks the longer label to fit (FR-005 unchanged).  
- Tests (written, not run: Run Tests not ticked):  
  - `tests/client-remove-vote.test.ts:98` expects "Cast Your Vote";  
  - `tests/poll-card-assets.test.ts:137` expects the new template label, and the two test titles at lines 140 and 150 name the button "Cast Your Vote".  
- Artifacts: `spec.md` (FR-001, FR-005, User Story 1 text and scenarios 1 and 7, the Enter-key edge case), `contracts/ui.md` V1, `quickstart.md` scenarios 1, 2 and 10;
  `README.md` where it names the button;
  the `CLAUDE.md` label-width line.  
- This changes what FR-001 requires; `requirements/20261122-012539-voting-center-ui/requirements.md` may need the same change (not edited).  

2026-11-24 07:50  

### ACCEPTED RECOMMENDATION

The results face's `.vote-btn` now reads "Cast Your Vote"; the ballot face is still called the Voting Center.  
- Code: `src/public/pollCard.js:1929` (template label only;
  the sizers and `fitLabel` are unchanged).  
- Tests updated: `tests/client-remove-vote.test.ts:98`;
  `tests/poll-card-assets.test.ts:137` and the titles at lines 140 and 150.  
- Tests postponed (Run Tests not ticked); the updated cases were not run, so the tweak is unverified by a run.  
- Artifacts: `spec.md` (User Story 1, scenarios 1 and 7, the edge case at line 235, FR-001, FR-005), `plan.md` (Buttons), `research.md` (Labels), `tasks.md` (US1 goal, T007, T008), `contracts/ui.md` V1, `quickstart.md` scenarios 1, 2 and 10;
  `README.md` (the button's name in Voting Center, Long polls, A bar opens the poll and Voting on a phone);
  `CLAUDE.md` (the label-width line).  
- FR-001's wording changed; `requirements/20261122-012539-voting-center-ui/requirements.md` may need the same change (not edited).  

2026-11-24 07:54  

## TWEAK02 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  



