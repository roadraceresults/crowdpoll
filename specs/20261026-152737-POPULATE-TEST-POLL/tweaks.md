# Overview: `specs/20261026-152737-POPULATE-TEST-POLL`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261026-152737-POPULATE-TEST-POLL` |
| Tweak file created | 2026-10-27 10:43 |
| Last updated | 2026-10-27 13:33 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Sequential Voters Per Data Point  
[X] Resolved  
[ ] Run Tests  

We misunderstood how the Votes were specified to be added.  
We want to take advantage of the fact that the Poll is Dynamic-Vote.
SO, we want the users who vote for each datapoint to start at:
test_1@crowdpolltest.test
and
incrementing the number in the email address for each subsequent voter
to as many voters as needed for vopting at that date.
So the total number of votes reported on the Poll Card will not grow to the millions.

We are going to manually clear all the votes that have been added in the previous run of populate_poll.ts.
Which tables should be cleared out?
Note: we using the dev database so clearing the votes here will not affect production data.

### RECOMMENDATION

Replace the random voter pool with sequential voters per data point in `devScripts/populate/populate-poll.ts`:  

- Delete `POOL_FACTOR` and `pickVoters` (the partial Fisher–Yates over `1..poolSize`), and `poolSize` in the vote loop.  
- In the vote loop, each data point's voters become `1..count` in order (`Array.from({ length: count }, (_, i) => i + 1)`), so every data point votes as `test_1@crowdpolltest.test` upward;  
  the `Dynamic-Vote Poll` upsert in `writeBatch` then overwrites the previous data point's votes, and the poll card's total stays at about the largest single day's count (`vote_count` ± 15%), never cumulative.  
- Per-day vote counts (`voteCountFor`, ± 15%), the largest-remainder split and the vote times are unchanged.  
- One consequence to accept: a day with fewer voters than an earlier day leaves the higher-numbered voters' older votes standing (they did not vote again that day), exactly as a Dynamic-Vote poll behaves;  
  the final bars still track the last data point closely.  

Tests (written, not run — `Run Tests` is not ticked):  

- `tests/populate-poll.test.ts`: drop the `pickVoters` import and its `describe` block;  
  in the create test's per-day loop, assert each day's `vote_history` voter numbers are exactly `1..rows.length`.  

Artifacts to bring into line:  

- `spec.md` FR-013 (the pool rule becomes the sequential-numbering rule), FR-014 ("chosen at random from the pool" goes), and the Simulated voter key entity.  
- `plan.md` (summary, Scale/Scope, the module diagram's function list), `data-model.md` (the data-point plan and the voter pool entry), `contracts/cli.md` C5 (the `pickVoters` row), `research.md` R1/R9's `pickVoters` mentions, `quickstart.md` §3 (the expected card total), `devScripts/populate/README.md`, the `CLAUDE.md` populate bullet, and a new `tasks.md` task T027 recording the tweak.  
- Note: this changes requirement NC1 in `requirements/20261026-152737-populate-test-poll/requirements.md` ("one pool of `ceil(1.15 × vote_count)` voters, chosen at random");  
  the requirements document is not edited unasked.  

Answer to "Which tables should be cleared out?":  

- The simulated votes live in three tables; clear them with `email like 'test\_%@crowdpolltest.test' escape '\'` (and the poll's id):  
  - `votes` — the current vote per voter;  
  - `vote_history` — every vote ever cast;  
  - `user_polls` — the `relation = 'voted'` rows.  
- Then recompute the counters on the `polls` row (`vote_count`, `choice_counts`) and in the cache with `npm run reconcile`;  
  without `ENV_VALKEY_URL`, restart the dev server afterwards.  
- Manual clearing is optional: a rerun of `populate-poll.ts` performs exactly this deletion itself (FR-011) before casting the new votes.  

2026-10-27 12:36

### ACCEPTED RECOMMENDATION

Implemented as recommended.  

- `devScripts/populate/populate-poll.ts`: deleted `POOL_FACTOR`, `pickVoters` and `poolSize`;  
  each data point's voters are now `Array.from({ length: count }, (_, i) => i + 1)`, i.e. `test_1..test_<count>` in order.  
- `tests/populate-poll.test.ts`: dropped the `pickVoters` import and `describe` block;  
  the create test's per-day loop now asserts each day's `vote_history` voter numbers are exactly `1..count`.  
  Tests postponed (`Run Tests` not ticked); `npx vitest run tests/populate-poll.test.ts` was not run, so the tweak is unverified by a run.  
  The script-only type check (`npx tsc --noEmit --module nodenext … devScripts/populate/populate-poll.ts`) passes.  
- Artifacts: `spec.md` (FR-013, FR-014, the Simulated voter entity), `plan.md` (summary, Scale/Scope, module diagram), `data-model.md` (data-point plan, voters entry), `contracts/cli.md` (C5 `pickVoters` row removed), `research.md` (R1, R9), `quickstart.md` (§3 expected card total), `tasks.md` (T027 added), `devScripts/populate/README.md`, `CLAUDE.md` (the populate voters bullet).  
- This changes requirement NC1 in `requirements/20261026-152737-populate-test-poll/requirements.md` (one random pool of `ceil(1.15 × vote_count)` voters);  
  that document was not edited.  
- The tables question is answered in the RECOMMENDATION above: `votes`, `vote_history` and `user_polls` (`relation = 'voted'`), by `email like 'test\_%@crowdpolltest.test' escape '\'`, then `npm run reconcile`.  

2026-10-27 12:38

Verified later the same day: `npx vitest run tests/populate-poll.test.ts` — 40/40 passed (the `pickVoters` test removed, the sequential-voter assertion included).  
NC1 in `requirements/20261026-152737-populate-test-poll/requirements.md` was updated at the developer's request.  

2026-10-27 12:45



## TWEAK02 Delete Seeded Polls And Votes  
[X] Resolved  
[ ] Run Tests  

Delete from the dev database, all polls and the votes where the poll created_by_name has "seed" in it.

### RECOMMENDATION

A one-off deletion on the development database (`postgres://…localhost:5432/app01`), no code or artifact change:  

- The seeded polls are `seed-polls.ts`'s rows, whose `created_by_name` is `seed<n>`;  
  match them with `created_by_name ilike '%seed%'`.  
- `votes`, `invited`, `poll_bans`, `bookmarks` and `user_polls` all reference `polls` with `on delete cascade` (migration `003-participation`), so deleting the poll rows removes them;  
  `vote_history` (partitioned, no foreign key) and `search_outbox` (no foreign key) must be deleted explicitly first.  
- One transaction:  
  - `delete from vote_history where poll_id in (select id from polls where created_by_name ilike '%seed%')`;  
  - `delete from search_outbox where poll_id in (select id from polls where created_by_name ilike '%seed%')`;  
  - `delete from polls where created_by_name ilike '%seed%'` (cascades the rest).  
- The seed users (`seed<n>@example.com` rows in `user`) are kept — the requirement asks for the polls and votes only.  
- Executed as a throwaway script in the session scratchpad (not committed), run with the server's `ENV_*` loaded from `devScripts/launch-dev.ps1`;  
  the row counts are recorded here.  
- Afterwards the Trending and Newest listings drop the deleted polls on their next recompute (up to `ENV_TRENDING_POLLS_RECOMPUTE_INTERVAL`, 60 s);  
  stale `cnt:<pid>` keys in Valkey are harmless and expire with their polls gone.  
- No test: a data-only operation on the development database, with no repository change a test could observe.  

2026-10-27 13:08

### ACCEPTED RECOMMENDATION

Executed as recommended against `localhost:5432` (the development database), in one transaction, via a throwaway `devScripts/tmp-delete-seed-polls.ts` that was deleted after the run.  

- Deleted polls: 250,000 (every `created_by_name ilike '%seed%'` row; 0 remain).  
- Deleted `vote_history` rows: 2,000,005.  
- Deleted `search_outbox` rows: 0 (none were pending).  
- Cascaded `votes` rows: 1,719,377 (with the `invited`, `poll_bans`, `bookmarks` and `user_polls` rows, by `on delete cascade`).  
- The seed users were kept.  
- No code, test or artifact change; the working tree holds only the feature's own files.  

2026-10-27 13:10


## TWEAK03 Batch Inserts For Populate Speed  
[X] Resolved  
[ ] Run Tests  

Can the populate poll script be sped up by doing batch inserts?

### RECOMMENDATION

The script already does batch inserts: votes go through `writeBatch` in slices of `BATCH = 1000` (`populate-poll.ts`), and `writeBatch` writes each slice as multi-row statements — one `insert … on conflict` for `votes`, one insert for `vote_history`, one `upsertUserPolls` — in one transaction.  
The last run's 14 seconds were dominated by something else: deleting the **previous** run's 14.7 million `vote_history` rows (the `email like` scan has no index), which was a one-time cost of switching scales;  
at the current `vote_count` (~123, about 14,650 history rows) a rerun's delete is small, so the next run should take a few seconds.  

- **Option A** *(recommended)*: no code change.  
  The inserts are already batched, the one slow run was the one-time deletion of the old millions, and at today's scale the script is I/O-trivial.  
  Pros: nothing to maintain; the Constitution's minimum-code principle.  
  Cons: none at the current scale; a future return to very large `vote_count` keeps today's speed, which was acceptable (the 14.7-million-row original run completed).  

- **Option B**: buffer votes across data points and flush `writeBatch` whenever the buffer reaches `BATCH`.  
  Pros: cuts the per-data-point transaction overhead (119 transactions → ~15 at today's scale).  
  Cons: the per-day progress line then prints before its rows are committed; the gain is a few seconds at most, and at large `vote_count` (where days already fill whole slices) there is no gain at all.  

- **Option C**: raise `BATCH` from 1,000 to 5,000 (still well under PostgreSQL's 65,535-parameter limit at 5 parameters per row).  
  Pros: one-line change; fewer round trips on very large runs.  
  Cons: no measurable effect at today's scale; more memory per statement.  

Recommended: **Option A** — answer the question (yes, it already batches; the slowness was the old history's deletion) and change nothing.  

2026-10-27 13:18

### ACCEPTED RECOMMENDATION

The developer chose **Option C** (after the follow-up that 50,000 would exceed PostgreSQL's 65,535-bind-parameter statement limit at 5 parameters per row, ceiling about 13,000).  

- `devScripts/populate/populate-poll.ts`: `BATCH` raised from 1,000 to 5,000;  
  `seed-polls.ts` keeps its own `BATCH = 1000` — the tweak names the populate script only.  
- No new test: `BATCH` is a private constant and the slicing behaviour is unchanged in kind;  
  the existing create and rerun integration tests cover the write path (their days hold ~100 votes, below either slice size).  
  Tests postponed anyway (`Run Tests` not ticked); the script-only type check passes.  
- Artifacts: `plan.md` (Constraints, flow step 6), `research.md` (R7), `tasks.md` (T028 added).  

2026-10-27 13:33


## TWEAK04 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  
