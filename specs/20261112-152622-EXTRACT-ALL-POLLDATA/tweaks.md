# Overview: `specs/20261112-152622-EXTRACT-ALL-POLLDATA`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261112-152622-EXTRACT-ALL-POLLDATA` |
| Tweak file created | 2026-11-12 16:15 |
| Last updated | 2026-11-12 16:53 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Default Oldest Poll Age  
[X] Resolved  
[ ] Run Tests  

Update the exractAllCli.ts script to output the field   
"oldest_poll_date" field with the default of 365.

### RECOMMENDATION

The populate side has no `oldest_poll_date`;  
it reads `oldest_age_in_days` (a whole number ≥ 0: only the data points from the last N days are replayed, `devScripts/populate/populate-poll.ts:105`), and ignores any other key.  
`extractAllCli.ts` writes its extra keys (`type`, `url`) through `ExtractAllFields` and `toPollGraphFile` in `devScripts/extract/pollGraphFile.ts`.  

- **Option A** _(recommended)_: write `"oldest_age_in_days": 365` in every file `extract-all` writes (and so `extract-all-polldata`), after `type`/`url`.  
  - Change: `ExtractAllFields` gains `oldestAgeInDays`;  
    `runGraphPipeline` in `extractAllCli.ts` passes `OLDEST_AGE_IN_DAYS = 365`;  
    `toPollGraphFile` writes it when present.  
  - Tests (written, not run: Run Tests is empty): `tests/extract/unit/pollGraphFile.test.ts` (the key written with `extra`, absent without), `tests/extract/integration/extractAll.test.ts` (output holds 365; `withoutExtractAllKeys` drops it when comparing with the kind-specific commands).  
  - Artifacts: the Poll Data Extractors README table and this feature's `spec.md` assumption (extract-all output now differs from htmlparser's by this key), README extraction paragraph.  
  - <u>Pros</u>: the populate script acts on it at once (only the last year is replayed);  
    the kind-specific commands keep htmlparser's exact output.  
  - <u>Cons</u>: every extracted file changes, so the next `populate-all-polls` refreshes those polls;  
    extract-all's output no longer matches htmlparser's byte for byte.  

- **Option B**: the same key, written by all five commands (in `toPollGraphFile`, beside `poll_creator_email` and `vote_count`).  
  - <u>Pros</u>: every poll data file carries the default, whichever command wrote it.  
  - <u>Cons</u>: none of the five commands matches htmlparser any more, and every extract test's expected output changes.  

- **Option C**: write the key literally as `"oldest_poll_date": 365`, as the tweak words it.  
  - <u>Pros</u>: exactly as written.  
  - <u>Cons</u>: `populate-poll` ignores it, so nothing changes in the populated polls.  

Recommended: A, because `oldest_age_in_days` is the field the populate script reads and the tweak names `extractAllCli.ts` only.  
A YAML key to override 365 per configuration is left out unless you ask for it.  
2026-11-12 16:18  

### ACCEPTED RECOMMENDATION

Option A applied: every file written through `extractAllCli.ts` carries `"oldest_age_in_days": 365`, after `type` and `url`.  

- Code:  
  - `devScripts/extract/pollGraphFile.ts`: `ExtractAllFields` gains `oldestAgeInDays?: number`;  
    `toPollGraphFile` writes `oldest_age_in_days` when it is given.  
  - `devScripts/extract/extractAllCli.ts`: `OLDEST_AGE_IN_DAYS = 365`, passed by `runGraphPipeline`, so `extract-all` and `extract-polymarket-yes-no` (the same pipeline) both write it;  
    `extract-cnn`, `extract-polymarket` and `extract-politico` are unchanged.  
- Tests: postponed (Run Tests not ticked), written but not run;  
  the type-check of the extractor code and tests passes.  
  - `tests/extract/unit/pollGraphFile.test.ts`: new test, the key is written after `type` and `url` when given, and absent otherwise.  
  - `tests/extract/integration/extractAll.test.ts`: the three exact outputs hold `oldest_age_in_days: 365`;  
    `withoutExtractAllKeys` also drops it when comparing with the kind-specific commands.  
  - `tests/extract/integration/extractYesNo.test.ts`: the key order and values include it.  
- Artifacts: `README.md` (extraction paragraph), `spec.md` (Assumptions), `data-model.md` (Poll data file).  
- Note: the Poll Data Extractors rule "byte-identical to htmlparser" now holds for the three other commands only;  
  that feature's artifacts were not changed retroactively.  
- Note: `extract-all-polldata` skips configurations whose inputs are unchanged, so the existing `polldata/*.json` files gain the key only after their history entries are removed (or `devScripts/extract/extract-all-polldata-history.json` is deleted) and the command runs again.  

2026-11-12 16:22  

## TWEAK02 Populated Poll Default Settings  
[X] Resolved  
[ ] Run Tests  

What are the default poll setting values for the polls created by populate-all-polls?

### RECOMMENDATION

Answer: `populate-all-polls` runs `populate-poll` for each file, which sets the same values on a new poll (`createDefaultPoll`, `src/polls/service.ts:96`) and on a refreshed one (`updatePoll`, `devScripts/populate/populate-poll.ts:261`):  

| Setting | Value |
|---|---|
| Choice mode | `Single-Choice Poll` |
| Vote mutability | `Dynamic-Vote Poll` (voters may change their vote) |
| Visibility | `Public Poll` |
| Sharing mode | `Anyone With The Link` |
| Vote anonymity | `Yes` |
| Voter count limit | none |
| State | `OPEN`, started (and launched) on the first replayed day, no end date |
| Keywords, notes, invitation and link preview messages | empty |
| Voters add choices | off |
| Line graph | off on a new poll (`lineGraphEnabled: false`); a refresh leaves it as it was |
| Time zone | none |
| Creator | the file's `poll_creator_email` (`devadmin01@crowdpoll.vote` from the extractors) |
| Title, subtitle, choices | from the file |
| Votes | about `vote_count` (1,000) simulated voters per data point, replaying the last `oldest_age_in_days` days |

None of the settings rows can be set from the poll data file today.  

- **Option A** _(recommended)_: record this answer and change nothing (no code, so no test).  
  - <u>Pros</u>: the question is answered;  
    any setting you want different becomes its own tweak, with the value you choose.  
  - <u>Cons</u>: none.  
- **Option B**: let the poll data file override the settings (optional keys such as `poll_visibility`, `vote_anonymity`, `line_graph_enabled`, read by `populate-poll` and validated against the app's values).  
  - <u>Pros</u>: each demonstration poll can differ.  
  - <u>Cons</u>: a change to `populate-poll`, outside this feature;  
    it needs its own decisions (which keys, which are allowed while `Public Poll`), so it is better as its own feature or tweak with those answers.  

Recommended: A.  
2026-11-12 16:46  

### ACCEPTED RECOMMENDATION

Option A: the question is answered by the table above;  
no code, test or artifact changed, since nothing a test can observe was altered.  
A setting that should differ becomes its own tweak.  

2026-11-12 16:47  

## TWEAK03 Line Graph From Type  
[X] Resolved  
[ ] Run Tests  

For the populate-all-polls script (and whichever other scripts it calls),  
if the json file type field's value has the words "line graph" in it, the script should enable the line graph for that poll (`lineGraphEnabled: true`).

### RECOMMENDATION

`populate-all-polls` creates and refreshes each poll through `populate-poll.ts`, so the change goes there only.  

- `devScripts/populate/populate-poll.ts`:  
  - `parsePollData` reads the optional `type`: absent → no line graph;  
    not a string → `InputError` (`"type" must be text`);  
    `PollData` gains `lineGraph: boolean`, true when `type` contains "line graph" (any letter case).  
  - a new poll gets `lineGraphEnabled: data.lineGraph`;  
    a refreshed poll gets `lineGraphEnabled: true` when `data.lineGraph`, and keeps its setting otherwise (a `polymarket yes no` poll the developer turned on by hand stays on).  
- Tests (written, not run: Run Tests is empty) in `tests/populate-poll.test.ts`:  
  - `parsePollData`: `cnn line graph` and `Politico Line Graph` → true, `polymarket yes no` and no `type` → false;  
    a numeric `type` is an input error;  
  - create: a `polymarket line graph` file gives `line_graph_enabled` true, the fixture (no `type`) false;  
  - rerun: a poll created without line graph is switched on by a rerun with a line-graph `type`, and one switched on stays on after a rerun without it.  
- Artifacts: `devScripts/populate/README-populate-poll-and-seed-poll.md` (a `type` row in the key table), the root `README.md` populate paragraph, and this feature's `spec.md` Assumptions (the populate side now reads `type`).  
2026-11-12 16:50  

### ACCEPTED RECOMMENDATION

Applied as recommended: a poll data file whose `type` contains "line graph" (any letter case) turns the poll's line graph on.  

- Code: `devScripts/populate/populate-poll.ts`:  
  - `parsePollData` reads the optional `type` (`"type" must be text` otherwise) into `PollData.lineGraph`;  
  - a new poll is created with `lineGraphEnabled: data.lineGraph`;  
  - a rerun passes `lineGraphEnabled: true` to `updatePoll` when `data.lineGraph`, and leaves the setting alone otherwise.  
- Tests: postponed (Run Tests not ticked), written but not run;  
  the type-check of the populate scripts and tests passes, apart from two errors already present in `tests/helpers/setup.ts`, which this tweak does not touch.  
  - `tests/populate-poll.test.ts`: `parsePollData` line-graph detection (2 true, 2 false), a numeric `type` input error, a create test (no `type` off, `polymarket line graph` on), and a rerun test (switched on by a line-graph `type`, left on by a rerun without one).  
- Artifacts: `devScripts/populate/README-populate-poll-and-seed-poll.md` (`type` row), `README.md` (populate paragraph), `spec.md` (Assumptions), `plan.md` (Summary), `CLAUDE.md` (SPECKIT decisions).  
- Note: this changes what `populate-poll` does, outside the extraction feature's original scope;  
  the polls already in the database get the line graph only when `populate-all-polls` repopulates them (a changed file, or a removed history entry).  

2026-11-12 16:53  

## TWEAK04 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  


