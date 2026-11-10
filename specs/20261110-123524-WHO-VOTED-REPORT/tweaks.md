# Overview: `specs/20261110-123524-WHO-VOTED-REPORT`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261110-123524-WHO-VOTED-REPORT` |
| Tweak file created | 2026-11-10 13:57 |
| Last updated | 2026-11-10 15:17 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Populate Test Poll Script  
[X] Resolved  
[ ] Run Tests  

Please create a script called populate-test-poll.ts in the `devScripts\populate` directory.  
The script will get its configuration from `test-poll.yaml` in the same directory.  
The yaml file will contain the following fields:
```yaml
maxPrivatePollVoters: 50
creator: "devadmin012crowdpoll.vote"
voters:
  - testuser01
  - testuser02
  - testuser03
  - testuser04
  - testuser05
  - testuser06
  - testuser07
  - testuser08
  - testuser09
  - testuser10
poll:
  title: "Test Poll 01"
  subtitle: "This is a test poll"
  choices:
    - "Choice 1"
    - "Choice 2"
    - "Choice 3"
    - "Choice 4"
    - "Choice 5"
    - "Choice 6"
    - "Choice 7"
    - "Choice 8"
    - "Choice 9"
    - "Choice 10"
  type: multiple-choice
  visibility: private
  showVoterChoices: true
```
The poll_sharing_mode is always "Anyone With The Link".

The script will automatically add votes to the poll.

If the poll is multiple choice then the script will randomly select multiple choices for each voter.
The number of choices selected will be from 0 to the total number of choices available in the poll.  
The probability of selecting any number of choices (including 0) is equal.

If the poll is single choice then the script will randomly select either 0 or one choice for each voter. 
The probability of selecting one choice will be 80%. 

This script will be a big time saver when testing the current feature as well other poll-related features. 

This script will only be used for testing in developmenton on the development database.

If there are any clarifications needed regarding the script or its usage, please ask and provide recommendations.

### CLARIFICATIONS

Answer each question below the recommendation (or write "recommended"), save, and Type or Say "Next".  

1. **The creator address.**  
   `devadmin012crowdpoll.vote` has no `@`.  
   - Recommended: `devadmin01@crowdpoll.vote`.  
     The script looks the creator up in the `user` table, as `populate-poll.ts` does, and stops when no account has that address.  
   - Answer: devadmin01@crowdpoll.vote 

2. **Who the voters are.**  
   `testuser01` … `testuser10` are names, not addresses.  
   - Recommended: each entry is a local part.  
     The script creates the account `testuser01@crowdpolltest.test` (the domain `populate-poll.ts` already uses for simulated voters) with the name `testuser01` when it is missing, and reuses it otherwise.  
     A vote row needs only an address and a name, but a real account also lets you log in as that voter to check what they see.  
   - Alternative: votes only, with no accounts.  
     This is simpler, but you cannot log in as a voter.  
   - Answer: recommended 

3. **What `maxPrivatePollVoters` does.**  
   The script cannot change the server's `ENV_MAX_PRIVATE_POLL_VOTERS`.  
   - Recommended: set it as the poll's own voter limit (`voter_count_limit`).  
     The script stops with an error when the file lists more voters than this limit.  
   - Answer: remove this field from the spec

4. **A voter who picks 0 choices.**  
   - Recommended: that voter casts no vote, but the poll is still linked to them (`user_polls` relation `linked`), so it shows in their PRIVATE POLLS tab, as for someone who opened the link and did not vote.  
   - Answer: recommended

5. **Running the script again with the same file.**  
   - Recommended: like `populate-poll.ts`, find the creator's poll with the same title.  
     Delete its votes, apply the file's settings and choices, and vote again with new random picks.  
     Running it again then gives a fresh random spread without filling the database with copies of the poll.  
   - Alternative: create a new poll on every run.  
   - Answer: recommended

6. **Reading YAML.**  
   The project has no YAML parser installed.  
   - Recommended: add `yaml` (pinned exactly) as a devDependency.  
     It is used only by this script.  
   - Alternative: read `test-poll.json` instead, with no new dependency.  
   - Answer: alternative 

7. **The values and the rest of the poll.**  
   - Recommended:  
     - `type` is `single-choice` or `multiple-choice`;  
     - `visibility` is `private` or `public` (a public poll ignores the sharing mode, the voter limit and `showVoterChoices`);  
     - `showVoterChoices: true` stores Anonymous Votes `No`;  
     - the poll is created OPEN, launched now, with a Dynamic vote and no end date;  
     - vote times fall at random within the last hour;  
     - votes are written through `writeBatch` and then `reconcile`, as `populate-poll.ts` does, so the counters, the line graph and the Who voted panel all agree;  
     - in a single-choice poll, a voter who votes picks one choice uniformly at random.  
   - Answer: recommended

8. **How to run it and what is committed.**  
   - Recommended:  
     - add `npm run populate-test-poll [<file>]` (default `devScripts/populate/test-poll.yaml`);  
     - add `!devScripts/populate/populate-test-poll.ts` and `!devScripts/populate/test-poll.yaml` to `.gitignore`;  
     - add a section to `README-populate-poll-and-seed-poll.md`;  
     - add a test file for the parser and the random picks (`tests/populate-test-poll.test.ts`).  
   - Answer: recommended

### RECOMMENDATION

From the answers (1 `devadmin01@crowdpoll.vote`; 2, 4, 5, 7, 8 recommended; 3 field removed; 6 JSON):  

- `devScripts/populate/populate-test-poll.ts` (new):  
  - reads `devScripts/populate/test-poll.json` by default, or the path given;  
    keys `creator`, `voters`, `poll.title`, `poll.subtitle`, `poll.choices`, `poll.type` (`single-choice` | `multiple-choice`), `poll.visibility` (`private` | `public`), `poll.showVoterChoices`;  
    the title, subtitle and choice bounds of the app are checked;  
  - looks up the creator by address and stops when there is none;  
  - creates each missing voter account `<name>@crowdpolltest.test` with the name `<name>`, and reuses existing ones;  
  - finds the creator's newest poll with the same title, deletes its votes, vote history and `voted`/`linked` relations, and applies the file;  
    otherwise creates the poll;  
    either way OPEN, launched now, `Anyone With The Link`, Dynamic vote, no end, Anonymous Votes `No` when `showVoterChoices` on a private poll;  
  - picks each voter's choices:  
    multiple choice draws a count 0…n with equal chances, then that many distinct choices;  
    single choice votes with 80% probability, for one choice drawn uniformly;  
  - writes the votes with `writeBatch`, times at random within the last hour;  
    links each voter with no pick (`linked`);  
    then `reconcile`, `refreshProjection` and `forgetTabs`;  
  - logs the poll id, its link and each voter's picks by name (no address).  
- `devScripts/populate/test-poll.json` (new): the developer's example, without `maxPrivatePollVoters`.  
- `package.json`: `"populate-test-poll": "tsx devScripts/populate/populate-test-poll.ts"`.  
- `.gitignore`: `!devScripts/populate/populate-test-poll.ts` and `!devScripts/populate/test-poll.json`.  
- `devScripts/populate/README-populate-poll-and-seed-poll.md`: a "Populating a test poll" section;  
  it says a voter's login link goes to an undeliverable `.test` address, so logging in as a voter needs `ENV_EMAIL_TRANSPORT=smtp` without SMTP credentials (the link is logged).  
- `tests/populate-test-poll.test.ts` (new): the parser's checks, `pickChoices` for both modes, a first run (accounts, a private non-anonymous link poll, votes and links) and a second run (same poll, votes replaced, no duplicate accounts);  
  written, not run (Run Tests not ticked).  
- Artifacts: `tasks.md` gains T027 in the Polish phase;  
  `quickstart.md` steps 2–3 mention the script as a shortcut.  

2026-11-10 14:47  

### ACCEPTED RECOMMENDATION

Implemented as recommended (accepted automatically after "Next": a single recommendation).  

- New `devScripts/populate/populate-test-poll.ts`:  
  - `parseTestPoll`, `pickChoices`, `voterEmail`, `resolveFile` and `populateTestPoll`;  
  - the creator's address is masked in its error;  
  - it reuses `InputError` and `matchChoices` from `populate-poll.ts`.  
- New `devScripts/populate/test-poll.json`: the example from the requirement, creator `devadmin01@crowdpoll.vote`, no `maxPrivatePollVoters`.  
- `package.json`: script `populate-test-poll`.  
- `.gitignore`: `!devScripts/populate/populate-test-poll.ts`, `!devScripts/populate/test-poll.json`.  
- `devScripts/populate/README-populate-poll-and-seed-poll.md`: section "Populating a test poll", with how to log in as a voter (`ENV_EMAIL_TRANSPORT=smtp` without credentials; allow `*@crowdpolltest.test`).  
- New `tests/populate-test-poll.test.ts`, 21 tests:  
  - the parser, with 12 refusals;  
  - `pickChoices` in both modes (5000 seeded draws each);  
  - `resolveFile`;  
  - a first run, a second run and a missing creator, on the embedded database.  
- Tests postponed (Run Tests not ticked): written, not run, so the tweak is unverified by a run.  
  The script and test type-check;  
  `npx tsc --noEmit` is clean.  
- Verified later by the developer's request: `npx vitest run tests/populate-test-poll.test.ts` passed 21 of 21 (2026-11-10 14:49).  
- The tests read their own fixture, `tests/fixtures/populate-test-poll.json`, not the editable `devScripts/populate/test-poll.json`;  
  the full suite had failed 2 tests after that file was changed to an anonymous poll.  
  `tests/populate-test-poll.test.ts` passes 21 of 21 (2026-11-10 15:17).  
- Artifacts:  
  - `tasks.md` T027 added in Phase 7, and the Polish line of the dependencies;  
  - `quickstart.md` step 3 names the script as a shortcut for steps 2–3.  

2026-11-10 14:47  

## TWEAK02 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  
