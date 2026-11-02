# Overview: `specs/20261101-181626-USER-ADD-CHOICES`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261101-181626-USER-ADD-CHOICES` |
| Tweak file created | 2026-11-01 21:33 |
| Last updated | 2026-11-02 11:07 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Vote For An Added Choice Not Shown  
[X] Resolved  
[ ] Run Tests  

1. Poll has Choices: 1, 2, 4, with 0 votes.
2. Click Vote button to flip card to back.
3. User adds choice = "5"
4. User votes for "5"
5. User clicks "<-" to return to the front of card.
6. The front of the card shows Choices 1, 2, 4, 5 with 0 votes
7. Creator goes to the Admin Poll Card.
8. Admin Poll Card shows "Voter Count: 0"



![add choice vote](dontTrack\add_choice_vote.jpg)

### RECOMMENDATION

Findings (from probes against the server and the card in jsdom):  

- The server is right.  
  An added "5" followed by a vote for it answers `200`, `voteCount: 1`, `choiceCounts: { <id of 5>: 1 }`.  
- The card is wrong after Submit vote.  
  The vote is recorded and the front says "1 vote", but the front lists only the original choices, all at 0%.  
  `saveChoice` in `src/public/pollCard.js` updates the card's own `poll` only;  
  the owning tab's `state.cards` still holds the old choice list, and `applyVote` in `src/public/tabs.js` rebuilds the card from that state (`grid.reapply`), so the added choice and its count disappear.  
- The screenshot's back face still shows Submit vote with "5" selected and "0 votes".  
  A successful Submit vote turns the card over by itself, so that vote was probably never submitted: the `<-` arrow only turns the card over and never votes.  
- The admin card's Voter Count reads the flushed `polls.vote_count`.  
  Any vote reaches it only after the counter flush (`ENV_COUNTER_FLUSH_SWEEP_INTERVAL`, 10 s) and the next admin refresh (5 s); that is unchanged by this feature.  

- **Recommendation A** _(recommended)_: Hand an added choice to the tabs, as a vote's counts already are.  
  - `pollCard.js` `saveChoice`: after `applyAddedChoices`, call a new `opts.onChoicesAdded(pid, answer)`.  
  - `tabs.js`: pass `onChoicesAdded` in the card options;  
    it sets `choices` and `contentVersion` on `state.cards.get(pid)` in every controller holding the poll, and on a retained maximized card, then reapplies, so a later vote's rebuild keeps the choice and shows its bar and percentage.  
  - Tests (`tests/client-add-choice.test.ts`): add a choice, select it, Submit vote;  
    the front lists the added choice at 100% and "1 vote", the back face still lists it, and after a counter flush the creator's admin row has `voteCount: 1`.  
  - No server, contract or setting change;  
    `contracts/ui-contracts.md` C1–C3 gains one sentence: an added choice reaches the poll's other copies on the page at once.  

- **Recommendation B**: Recommendation A, and make `<-` warn when a selection was not submitted.  
  - Adds a "You have not submitted your vote" note on the front face when the back held an unsent selection.  
  - It changes the card's behaviour for every poll, not only for added choices, so it is better as its own tweak.  

### ACCEPTED RECOMMENDATION

Recommendation A, accepted by "A".  

- `src/public/pollCard.js`: `saveChoice` calls `opts.onChoicesAdded(pid, answer)` after the card applies the answer.  
- `src/public/tabs.js`:  
  - the card options gain `onChoicesAdded`;  
  - new `applyAddedChoices(pid, answer)` sets `choices` and `contentVersion` on every tab's copy of the poll and reapplies it;  
  - `patchRetained` takes `{ added }`, so a retained maximized card keeps the choice too, its counts kept.  
- Test added, `tests/client-add-choice.test.ts`: "keeps an added choice through a vote for it, on the card and in the creator's voter count (TWEAK01)".  
  The creator adds Tacos on Your Polls, votes for it;  
  the front shows "Tacos100%" and "1 vote", the voting face still lists Tacos, and after a counter flush the admin row's `voteCount` is 1.  
- Tests postponed (Run Tests not ticked): the new test was not run, so the tweak is unverified by a run;  
  `npx tsc --noEmit` passes.  
- Artifacts: `contracts/ui-contracts.md` C4 (one bullet), `tasks.md` (T048 added).  
- The admin card's Voter Count still follows the counter flush (10 s) and the admin refresh (5 s), as for every vote.  

2026-11-02 01:20  

## TWEAK02 Vote Counts On The Voting Side  
[X] Resolved  
[ ] Run Tests  
To help with diagnosing a bug, add the following to the Backside (Voting side) of A Poll Card:
- after the Bar label for a choice, render the number of votes for that Choice.

### RECOMMENDATION

- **Recommendation A** _(recommended)_: Show the count in brackets after the label, e.g. `Pizza (3)`.  
  - `src/public/pollCard.js`: `rebuildData` copies `count` (the live count the front face already uses) onto each voting row;  
    `renderVotingOptions` writes `item.label + " (" + count + ")"` into `.vote-label`, and the row's tooltip (`title`) reads the same.  
  - It follows every refresh, vote and added choice, because it reads the same counts as the front face's bars.  
  - A compact row (too short for a label) shows no label, so no count either;  
    a long label is cut with an ellipsis as now, so its count can be hidden — the tooltip still shows it.  
  - Test in `tests/client-add-choice.test.ts`: after a vote for an added choice, its voting row reads `Tacos (1)` and the others `(0)`.  
  - Being a diagnostic aid, it is shown to every viewer;  
    no spec or contract change is recorded beyond a `tasks.md` line marking it temporary, to be removed once the bug is found.  

- **Recommendation B**: Show the count in its own `.vote-count` span at the right end of the row.  
  - It is never cut off by a long label, and is easy to find and remove later.  
  - It needs its own position and font rules in `pollCard-m3.css`, and the label's truncation limit must leave room for it.  

### ACCEPTED RECOMMENDATION

Recommendation A, accepted by "a".  

- `src/public/pollCard.js`:  
  - `rebuildData` copies each choice's `count` onto its voting row;  
  - `renderVotingOptions` writes `<label> (<count>)` into `.vote-label` and the row's `title`, marked in a comment as a temporary TWEAK02 diagnostic.  
- Test, `tests/client-add-choice.test.ts`: the TWEAK01 test now also expects the voting rows `Pizza (0)`, `Sushi (0)`, `Tacos (1)` after the vote.  
  Its "Tacos is the last voting row" check was dropped: after the vote Tacos holds 100%, and voting rows sort by share, so it comes first.  
- Tests postponed (Run Tests not ticked): neither test change was run, so the tweak is unverified by a run;  
  `npx tsc --noEmit` passes.  
- Artifacts: `tasks.md` (T049 added, marked temporary).  

2026-11-02 01:29  

## TWEAK03 Voter Total Missing After Added Choice  
[X] Resolved  
[ ] Run Tests  

A followup to TWEAK02:
To ensure that every sweep and refresh has been executed, we left this the open browser windows overnight.  
The vote that was cast by a user after adding a Choice has never appears on the front of the card, or on the Edit Poll Card.  
The vote does appear on the Vote side of the poll card, on the poll results page.  
The vote also appears in the database, as evidenced by the JSON snippet below.

```json
[
  {"id": "b7301efe-a618-41a3-be10-aabe3b7b2bc8", "label": "1", "position": 0}, 
  {"id": "9071aff9-c820-46be-ad30-fedb9b6b7696", "label": "2", "position": 1}, 
  {"id": "4d7a0513-fdba-43c9-b71d-cc5910b89d9d", "label": "4", "position": 2}, 
  {"id": "8f39d08a-176a-4cf8-87dc-7e41233215f6", "label": "5", "position": 3}
]
```

The `choices` field for the poll is as follows:  
"624fdea1-fa3a-494f-97b5-b95b0110ddc6"	"devadmin01@crowdpoll.vote"	"devadmin01"	"{9071aff9-c820-46be-ad30-fedb9b6b7696}"	"2026-11-02 01:30:21.632-05"

The screenshots below show the frontside, the Edit Poll Card, the results page, and the vote side of the poll card.  
![add_choice_vote-01.jpg](dontTrack/add_choice_vote-01.jpg)

We may be misunderstanding what shsould be happening, but if so, this would also confuse users.

If there are any diagnostics we can do, please let us know so we can gather the necessary information.

### RECOMMENDATION

What the screenshots say:  

- The voting side reads `2 (1)`, but the front reads 0% and "0 votes", and the admin card's Voter Count is 0.  
  The live counters (`cnt:<pid>`) therefore hold choice "2" = 1 but `total` = 0.  
  The front's percentages divide by `total`, and the flush copies `total` into `polls.vote_count`, which the admin card reads, so all three follow from that one wrong number.  
- `total` is raised only when the vote path counts a **new** voter;  
  a vote counted as a *change* (the voter found in `votes`, or in the session's voted set) moves the choice counts and leaves `total` alone.  
- The results page counts the `votes` table directly, which is why it shows "1 participant voted".  
- Server probe (add "5", vote "2", change to "5", flush): `total` 1, the choice counts right, the row right.  
  Adding a choice does not disturb the counters on its own.  
- The pasted votes row cannot be this poll's current vote: its two choice ids match none of the four choices, it holds two ids on a single-choice poll, and it was cast at 15:33 on 11/1, before the poll was created (10:08 PM).  

The likeliest cause is a restart of `npm run dev`, not the added choice.  
In development the counters, the vote queue and the "voted" sets live in the server's memory; `tsx watch` restarts the server whenever a server file changes (as during `/speckit-implement` and the earlier tweaks).  
After a restart the counters are seeded from the poll row's last flush (`rebuildIfMissing`), which misses any vote cast in the 10 s before it;  
the next vote by that voter is then counted as a change, never as a new voter, so `total` stays 0 for good.  

- **Recommendation A** _(recommended)_: Diagnose before changing code.  
  - With the add choices poll's id as `<pid>`, run and paste:  
    - `select id, choices, vote_count, choice_counts, counts_version, ever_voted from polls where id = '624fdea1-fa3a-494f-97b5-b95b0110ddc6';`  
    - `select email, choice_ids, voted_at from votes where poll_id = '624fdea1-fa3a-494f-97b5-b95b0110ddc6';`  
    - `select email, choice_ids, voted_at from vote_history where poll_id = '624fdea1-fa3a-494f-97b5-b95b0110ddc6' order by voted_at;`  
  - Say whether the dev server restarted (a `[server] Starting in …` line in its terminal) between the first vote and its next flush.  
  - Then restart `npm run dev` after `npm run reconcile`, which recomputes the counters from `votes` into the row the restart seeds from;  
    the front, the admin card and the results page should then agree on 1 vote.  
  - If `vote_history` shows no restart window, or the numbers disagree in another way, the next step is chosen from the data.  

Results of Diagnostics:  

After `npm run reconcile` the vote has appeared as expected.  

  The results of the queries are:
```
  "624fdea1-fa3a-494f-97b5-b95b0110ddc6"	"[{""id"": ""b7301efe-a618-41a3-be10-aabe3b7b2bc8"", ""label"": ""1"", ""position"": 0}, {""id"": ""9071aff9-c820-46be-ad30-fedb9b6b7696"", ""label"": ""2"", ""position"": 1}, {""id"": ""4d7a0513-fdba-43c9-b71d-cc5910b89d9d"", ""label"": ""4"", ""position"": 2}, {""id"": ""8f39d08a-176a-4cf8-87dc-7e41233215f6"", ""label"": ""5"", ""position"": 3}]"	0	"{""33261747-7e80-41bb-bb58-2a9f6c59ed40"": -1, ""4d7a0513-fdba-43c9-b71d-cc5910b89d9d"": 0, ""8f39d08a-176a-4cf8-87dc-7e41233215f6"": 0, ""9071aff9-c820-46be-ad30-fedb9b6b7696"": 1}"	13	true
```

```
  "devadmin01@crowdpoll.vote"	"{9071aff9-c820-46be-ad30-fedb9b6b7696}"	"2026-11-02 01:30:21.632-05"
```

```
"devadmin01@crowdpoll.vote"	"{33261747-7e80-41bb-bb58-2a9f6c59ed40}"	"2026-11-01 22:11:05.851-05"
"devadmin01@crowdpoll.vote"	"{9071aff9-c820-46be-ad30-fedb9b6b7696}"	"2026-11-01 22:15:07.605-05"
"devadmin01@crowdpoll.vote"	"{8f39d08a-176a-4cf8-87dc-7e41233215f6}"	"2026-11-02 01:05:02.881-05"
"devadmin01@crowdpoll.vote"	"{8f39d08a-176a-4cf8-87dc-7e41233215f6}"	"2026-11-02 01:16:44.625-05"
"devadmin01@crowdpoll.vote"	"{8f39d08a-176a-4cf8-87dc-7e41233215f6}"	"2026-11-02 01:17:13.233-05"
"devadmin01@crowdpoll.vote"	"{8f39d08a-176a-4cf8-87dc-7e41233215f6}"	"2026-11-02 01:21:05.224-05"
"devadmin01@crowdpoll.vote"	"{4d7a0513-fdba-43c9-b71d-cc5910b89d9d}"	"2026-11-02 01:21:24.222-05"
"devadmin01@crowdpoll.vote"	"{4d7a0513-fdba-43c9-b71d-cc5910b89d9d}"	"2026-11-02 01:22:00.168-05"
"devadmin01@crowdpoll.vote"	"{4d7a0513-fdba-43c9-b71d-cc5910b89d9d}"	"2026-11-02 01:30:04.862-05"
"devadmin01@crowdpoll.vote"	"{9071aff9-c820-46be-ad30-fedb9b6b7696}"	"2026-11-02 01:30:12.886-05"
"devadmin01@crowdpoll.vote"	"{9071aff9-c820-46be-ad30-fedb9b6b7696}"	"2026-11-02 01:30:17.594-05"
"devadmin01@crowdpoll.vote"	"{9071aff9-c820-46be-ad30-fedb9b6b7696}"	"2026-11-02 01:30:21.632-05"
```

The console log has scrolled the most recent retart out of the limit, so we can't determine when the dev server last restarted.  


- **Recommendation B**: Make the counters heal themselves after a restart.  
  - `rebuildIfMissing` in `src/polls/counters.ts` seeds a missing `cnt:<pid>` from the `votes` table (as `reconcile` does) rather than from the flushed row.  
  - It also fixes a Valkey eviction in production, at the cost of one aggregate query per poll whenever its counters are missing.  
  - It reverses a decision of feature 017 (counters seeded from the flushed row), so it is better confirmed by A's data first.

### RECOMMENDATION (after the diagnostics)

What the data says:  

- The first vote (22:11, for `33261747…`, a choice no longer on the poll) never reached the live counters' `total`, or that choice's count.  
  The change to "2" at 22:15 then took 1 from `33261747…` (hence its `-1`) and added 1 to "2", leaving `total` at 0;  
  every later change moved only the choice counts, so `total` stayed 0 until `npm run reconcile` recounted from `votes`.  
- Nothing in the code clears `cnt:<pid>` but an account deletion, and the in-memory cache evicts nothing;  
  a server restart before the 22:11 vote's flush (at most 10 s later) is the only path found that loses it.  
- That is a development hazard (production keeps counters in Valkey), but the result is permanent until an operator reconciles;  
  and a `-1` count is impossible in a consistent hash, so the vote path can see it coming.  

- **Recommendation A** _(recommended)_: The vote path repairs a poll's counters when they cannot be right.  
  - `castVote` in `src/votes/votePath.ts`: for a voter who voted before, when the counters show `total` below 1, or one of the voter's previous choices below 1, run `reconcile(deps, [pid])` (recount from `votes`) before counting the vote.  
  - A consistent hash never meets either condition, so a normal vote costs nothing extra;  
    a drifted poll is fixed by its voter's next vote, and logs one `[votes] counters of <pid> recounted` line.  
  - Test (`tests/add-choice.test.ts` or the vote tests): a voter's vote is in `votes`, the counters say `total` 0;  
    their next vote leaves `total` 1 and the old choice at 0, not -1.  
  - No contract change;  
    `plan.md`/`research.md` gain a sentence beside the counter decision of feature 017.  

- **Recommendation B**: Recommendation A, and `rebuildIfMissing` seeds missing counters from `votes` (the earlier Recommendation B).  
  - It also fixes a poll nobody votes on again, after a restart or a Valkey eviction, at one aggregate query per poll whenever its counters are missing.  

- **Recommendation C**: Change no code;  
  record in `quickstart.md` that a dev-server restart can drop the counts of votes from the last 10 s, and that `npm run reconcile` and a restart repair them.  

### ACCEPTED RECOMMENDATION

Recommendation C, accepted by "c".  

- No code change.  
- `quickstart.md` *Prerequisites* gains a note:  
  in development the live counters are in memory and flushed every 10 s, so a restart of `npm run dev` can drop the counts of votes from the 10 s before it;  
  the symptoms (front and Voter Count disagree with the results page, a choice count with no voter total) and the repair (stop the server, `npm run reconcile`, start it again).  
- No test: the change is documentation only, with nothing a test can observe.  
- Artifacts: `quickstart.md`.  
- The poll in question was already repaired by the developer's `npm run reconcile`.  

2026-11-02 09:37  

## TWEAK04 Cancel On The Delete Choices Dialog  
[X] Resolved  
[ ] Run Tests  

For the "Delete choice with votes?" confirmation dialog, change the "Keep choices" button text to "Cancel".

### RECOMMENDATION

- **Recommendation**: Rename the button only;  
  what it does is unchanged (it reverts the Choices textbox to its session-entry text, keeps default focus, and Escape and the scrim still answer the same way).  
  - `src/public/adminCard.js` `askToDeleteChoices`: the button text `"Keep choices"` becomes `"Cancel"`;  
    its class `modal-keep` stays, and the three comments that name the button (near lines 112, 767 and 789) say "Cancel".  
  - `tests/client-admin-wizard.test.ts`: the two `dialogButton(p, "Keep choices")` calls and the test title near line 1261 use "Cancel".  
  - The dialog belongs to feature EDITING-POLL-AVAILABLE, whose `contracts/ui-contracts.md` and `quickstart.md` name the button **Keep choices**;  
    those two lines are updated with a "(TWEAK04 of USER-ADD-CHOICES)" note, and this feature's `tasks.md` gains a line.  
  - The headline stays "Delete choices with votes?" (plural, as in the code).  

### ACCEPTED RECOMMENDATION

The recommendation, accepted by "a".  

- `src/public/adminCard.js` `askToDeleteChoices`: the button reads "Cancel";  
  its class `modal-keep` and its behaviour are unchanged, and the three comments naming it say "Cancel".  
- `tests/client-admin-wizard.test.ts`: the test title and both `dialogButton(p, ...)` calls use "Cancel" (the helper looks only inside the dialog, so no other Cancel can match).  
- Tests postponed (Run Tests not ticked): the updated tests were not run, so the tweak is unverified by a run.  
- Artifacts:  
  - `specs/20261029-225209-EDITING-POLL-AVAILABLE/contracts/ui-contracts.md` and `quickstart.md`: the button is **Cancel**, noting it read "Keep choices" until this tweak;  
  - this feature's `tasks.md`: T050 added.  

2026-11-02 10:22  

## TWEAK05 Session Subscriber Errors In The Console  
[X] Resolved  
[ ] Run Tests  

While testing we noticed that the dev console in the browser has repeated "Unsubscribe error" messages.

![console-unsubscribe-error](console-unsubscribe-error.jpg)

### RECOMMENDATION

The cause (present since the initial commit, not from this feature):  

- `sessionReady()` in `src/public/tabs.js` (near line 1028) writes `const unsubscribe = window.Session.subscribe(() => { …; setTimeout(unsubscribe, 0); })`.  
- `Session.subscribe` in `src/public/app.js` calls the new subscriber **at once** when the session is already known (`snapshotLoaded`), before `subscribe` has returned.  
  The callback then reads `unsubscribe` before it exists: `ReferenceError: Cannot access 'unsubscribe' before initialization`.  
- That error leaves `subscribe` before it returns, so `unsubscribe` is never set and the subscriber is never removed;  
  every later session change (`refreshSession`, a message from another window) runs it again and logs the error, which is why it repeats.  
- It happens only when the session is known before `tabs.js` asks, e.g. with another CrowdPoll window open (the cross-window channel), so not on every load.  
  It is harmless to the page (the tabs still wait correctly, since `resolve()` runs first), but it fills the console and keeps a dead subscriber.  

- **Recommendation**: Defer the read, not the call.  
  - `tabs.js`: `setTimeout(unsubscribe, 0)` becomes `setTimeout(() => unsubscribe(), 0)`;  
    by the time the timer fires, `subscribe` has returned and `unsubscribe` is set, so the subscriber is removed after its first call either way.  
  - Test (`tests/client-home.test.ts` or a client test beside it): open `index.html` with a `beforeScripts` stub of `window.Session` whose `subscribe` calls the subscriber at once and counts unsubscribe calls;  
    the page logs no `[session] subscriber failed` / `ReferenceError`, and the stub's unsubscribe runs once.  
  - No contract or spec change;  
    `tasks.md` gains a line.  

Separately, the screenshot shows a card with 6 choices saying "This poll already has the most choices allowed (5)".  
That is not part of this tweak, but worth its own if it was not intended:  
one way to get there is a creator's save of 5 choices while a voter's addition is kept beside them (R10, `baseChoiceIds`), which can carry the poll past `ENV_MAX_CHOICES`.  

### ACCEPTED RECOMMENDATION

The recommendation, accepted by "accept recommendation".  

- `src/public/tabs.js` `sessionReady()`: `setTimeout(unsubscribe, 0)` became `setTimeout(() => unsubscribe(), 0)`, with a two-line comment saying why.  
- Test added, `tests/client-home.test.ts`: "unsubscribes once, without an error, when the session is already known" (TWEAK05).  
  It loads the home page's scripts without `app.js`, beside a stub `window.Session` whose `subscribe` answers at once;  
  no console error mentions `unsubscribe` or a failed subscriber, and the stub's unsubscribe runs exactly once.  
- Tests postponed (Run Tests not ticked): the new test was not run, so the tweak is unverified by a run;  
  `npx tsc --noEmit` passes.  
- Artifacts: `tasks.md` (T051 added).  
- The 6-choices-over-a-limit-of-5 card noted above is not addressed here.  

2026-11-02 10:30  

## TWEAK06 New Poll Lets Voters Change Their Vote  
[-] Resolved (accepted as-is)  
[ ] Run Tests  

Change the default for a new poll in the Edit Poll Card, for "Can votes change their vote?" to "Yes, as often as they like while the poll is open".

### CLARIFICATIONS

The default is already "Yes" for a poll made with **Create New Poll**:  
`createDefaultPoll` (`src/polls/service.ts`) stores `Dynamic-Vote Poll`, and the wizard's Step 5 reads it;  
a jsdom probe of Create New Poll → Step 5 found "Yes, as often as they like while the poll is open" checked, for a Public poll and after switching to Private.  
(`tests/client-admin-wizard.test.ts` already expects `Dynamic-Vote Poll` from a new poll's save.)  

1. Where did the poll that showed "No" come from?  
   - A. **Create New Poll** — then please say which steps were taken before Step 5, as something there would be changing it.  
   - B. The card's **Copy** icon — a copy takes the source poll's answer (`duplicatePoll` copies `voteMutability`), so a copy of a Final-Vote poll shows "No".  
     Should a copy then always start at "Yes", or keep copying the source?  
   - C. A poll created before this branch, or by `devScripts/populate/populate-poll.ts` — those store whatever they were given.  

### RECOMMENDATION

No code change until the question above is answered;  
if the answer is B and copies should start at "Yes", `duplicatePoll` sets `voteMutability: "Dynamic-Vote Poll"` instead of copying it, with a test in the duplicate tests.  

### ACCEPTED RECOMMENDATION

Accepted as-is by the developer ("no code change").  

- A new poll from Create New Poll already defaults to "Yes, as often as they like while the poll is open" (`createDefaultPoll` stores `Dynamic-Vote Poll`);  
  a copy keeps copying its source poll's answer.  
- No code, test or artifact changed.  

2026-11-02 11:07  

## TWEAK07 <short title here>  
[ ] Resolved  
[ ] Run Tests  

