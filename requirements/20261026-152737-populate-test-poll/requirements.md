Start a new spec for these requirements called `20261026-152737-POPULATE-TEST-POLL`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

For testing we need to create a stand-alone command line script. 
It creates a poll and pre-populates it with votes according to the following logic.  
The script will have one and only one command line argument.  

The data for the poll will be found in a json file that is the first argument to the script.  

An example of the JSON structure expected for the poll data can be found in the file `polldata/trump_approval_rating_over_time.json`.  

When the json is read in, the data_points will be sorted ascending by date.  

Then the dates will be adjusted relative to the current date, maintaining the same intervals between them.  
The greatest date in the json will become the current date.  

created_by_id= the id of the user whose email is "poll creator email" in the JSON file.  
created_by_name= the userName of the user whose email is "poll creator email" in the JSON file.  
created_by_email= the email of the user whose email is "poll creator email" in the JSON file.  
start_at = the date of the earliest adjusted date  

The first thing the script will do is to determine if a poll already exists with the same:
- created_by_id
- title (from the JSON file)


If the poll already exists with the same created_by_id and title, 
existing_poll_id will be set to the poll_id of the existing poll
else existing_poll_id will be set to null

If existing_poll_id is not null, any votes associated with that poll will be deleted where: 
poll_id matches existing_poll_id AND email like "test_%@crowdpolltest.test"

if existing_poll_id is null, a new poll will be created with the following settings:  
- title from the JSON file
- choices from the JSON file
- Dynamic-Vote Poll
- Public
- Open
- vote_anonymity=YES
- Single-Choice Poll
- Dynamic-Vote Poll
- created_by_id
- created_by_name
- created_by_email
- start_at 
- end_at null
- subtitle null

It is assumed that all other poll fields can be derived from these.  
If not, create a finding for this requirement stating which field can not be derived.  

After the poll is created, votes will be programmatically added based on the data points in the JSON file.  
The number of votes simulated for each data point will correspond to the "vote_count" in the JSON file.  
To simulate the appearance of an actual voting pattern, the number of votes for each date will be +- 15% of the "vote_count".  

The votes for each data point will be distributed among the options  
"choice_a", "choice_b", "choice_c", "choice_d" ....   
according to the values (which are actually percentages) specified in the JSON file.  
If a choice has no votes, it will still be a choice for the poll. 




## Clarifications (resolved findings, 2026-10-26 4:14 PM)

- **IN1.** `Dynamic-Vote Poll` appears twice in the settings list above;  
  both mean the same setting, and no other setting was meant.  
- **IN2.** On a rerun, the existing poll is also refreshed from the JSON: `start_at`, `launched_at`, the choices and the fixed settings above.  
  Its poll id is kept, so bookmarks, Watching and shared links survive;  
  a choice dropped from the JSON loses any votes cast for it.  
- **AM1.** `vote_count` is the number of votes per data point: each data point casts `vote_count` ±15% votes.  
  The script prints its progress.  
- **AM2.** For each data point a uniform random factor between 0.85 and 1.15 is drawn, and `vote_count × factor` is rounded to a whole number.  
  There is no fixed seed.  
- **AM3.** The percentages are scaled to their sum: every one of a data point's votes goes to a choice, in proportion;  
  the shares are rounded by largest remainder so they add up to the data point's vote count.  
- **UA1.** The fields not listed are derived as follows: `created_by_email` is not stored (`polls` has no such column; it is read from `user`, as now);  
  `poll_sharing_mode = "Anyone With The Link"`;  
  `created_at = start_at`;  
  `launched_at = start_at`;  
  `keywords = ""`;  
  `voter_count_limit = null`;  
  `subtitle = ""` (the column is not nullable);  
  choice ids are new UUIDs, with positions 0, 1, … in key order.  
- **UA2.** Dates are `MM/DD/YY`, read as 20YY.  
  Every date is shifted by the whole number of days between the latest date and today (local date).  
  Each data point's votes are cast at random times across its day, never later than the moment the script runs;  
  `start_at` is local midnight of the earliest adjusted date.  
  A date that does not parse, or two data points on the same date, stops the script with an error.  
- **UA3.** For an existing poll, the test voters' rows are deleted from `votes`, `vote_history` and `user_polls` (relation `voted`), matching `email LIKE 'test\_%@crowdpolltest.test'` with `_` escaped.  
  The counters are recomputed after the new votes are written.  
- **UA4.** Votes are written through `writeBatch` (as `devScripts/populate/seed-polls.ts` does), then `reconcile` runs for the poll;  
  a new poll is created through `insertPoll`, which writes the row, the `created` relation and the projection (see UA13 for the search entry).  
  When `ENV_VALKEY_URL` is unset, the summary line tells the developer to restart the server.  
- **UA5.** Test voters are `test_<n>@crowdpolltest.test` with `user_name` `test_<n>`, `n` counting from 1;  
  no `user` rows are created.  
- **UA6.** Each of these stops the script with a one-line error and exit code 1, before anything is written: no argument or more than one;  
  an unreadable or invalid JSON file;  
  no `user` with the creator's email;  
  fewer than `ENV_MIN_CHOICES` or more than `ENV_MAX_CHOICES` choices;  
  a data point naming a choice key the poll does not have.  
  A choice missing from a data point counts as 0%;  
  when several polls match the creator and title, the newest is used and a warning is printed;  
  choice keys are read in order `choice_a` … `choice_z`, then `choice_aa`, `choice_ab`, …;  
  the creator email and the title are matched exactly (case included).  
- **UA7.** The full history is written (`writeBatch` creates the old partitions).  
  The daily retention sweep drops history older than 12 months, which is accepted as a known limit;  
  the script prints a note when the data spans more than 12 months.  
- **UA8.** The script is `devScripts/populate/populate-poll.ts`, run as `npx tsx devScripts/populate/populate-poll.ts <file.json>`.  
  `.gitignore` gains `!devScripts/populate/populate-poll.ts`, and `devScripts/populate/README.md` gains a section for it.  
  Its logic (date shift, count spread, share rounding) is in exported functions, tested by Vitest on the embedded PostgreSQL with a small fixture under `tests/`;  
  `main()` runs only when the file is the entry point;  
  `polldata/` stays git-ignored.  
- **NC1.** One set of test voters changes its votes over time: each data point's voters are numbered sequentially from 1 (`test_1`, `test_2`, …, up to that data point's count), so every data point votes again as the same addresses and the poll's voter count never exceeds the largest single data point's count (TWEAK01 replaced the earlier random pick from a `ceil(1.15 × vote_count)` pool).  
  The poll card ends close to the latest data point.  
- **NC2.** The script may write to any database `ENV_DATABASE_URL` names; that is the developer's responsibility.  
  Before writing, it prints the target `ENV_PUBLIC_ORIGIN` and the database host.  
- **UA9.** On a rerun, the JSON's choices are matched to the poll's by label, exactly: a choice whose label is still in the JSON keeps its id and takes its new position;  
  a new label gets a new UUID;  
  the votes (test or not) whose choice was dropped are deleted from `votes` before `reconcile` runs.  
  Renaming a label counts as dropping one choice and adding another.  
- **UA10.** On a rerun, the poll is refreshed through `updatePoll` with the settings, choices, `start_at` and `pollState: "OPEN"`, clearing any edit session (`pollStateBeforeEditUpdate`, heartbeat and client id);  
  then `launched_at` is set to `start_at` in the same run, and `created_at` is left unchanged.  
  A warning is printed when the poll was not OPEN before.  
- **UA11.** The script prints the target (`ENV_PUBLIC_ORIGIN` and the database host) first;  
  then one progress line per data point (its adjusted date, votes cast, running total);  
  then a summary: the poll id, whether it was created or refreshed, votes deleted, votes written, the final count and percentage per choice, the elapsed time, and the notes from UA4 and UA7 when they apply.  
  There is no time limit, and no index is added.
- **UA12.** These also stop the script with a one-line error and exit code 1, before anything is written: `poll creator email` or `title` missing or empty;  
  a title longer than `TITLE_MAX` (50);  
  a choice label empty, longer than `CHOICE_LABEL_MAX` (100), or the same as another (compared exactly);  
  `vote_count` not a whole number of at least 1;  
  `data_points` missing or empty;  
  a percentage that is not a number, or negative;  
  a data point whose percentages add up to 0.  
- **UA13.** `insertPoll` writes no `search_outbox` row.  
  The search entry is queued by `reconcile` (and on a rerun also by `updatePoll`'s content-version bump), and `drainOutbox` indexes the whole poll for any queued row;  
  so `reconcile` always runs, even when no votes are written.  
  No behaviour changes.  
