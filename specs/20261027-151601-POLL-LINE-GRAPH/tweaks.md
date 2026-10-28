# Overview: `specs/20261027-151601-POLL-LINE-GRAPH`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261027-151601-POLL-LINE-GRAPH` |
| Tweak file created | 2026-10-27 21:29 |
| Last updated | 2026-10-27 22:35 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Record The Developer's Full Suite Run  
[X] Resolved  
[ ] Run Tests  

For the record:

 Test Files  126 passed | 1 skipped (127)
      Tests  1729 passed | 15 skipped (1744)
   Start at  20:55:43
   Duration  620.31s (transform 924ms, setup 0ms, collect 61.98s, tests 542.22s, environment 10ms, prepare 4.58s)

### RECOMMENDATION

- No code change.  
  Add the developer's run to the note on T023 in `tasks.md`, beside the run made during `/speckit-implement`, as a second confirmation of T023's automated half.  
- Leave T023 open: its manual walkthrough (quickstart steps 1–11, dark mode, phone width, two sessions) is still to do.  
- No tests: there is no behaviour for a test to check.  

2026-10-27 21:37

### ACCEPTED RECOMMENDATION

- `specs/20261027-151601-POLL-LINE-GRAPH/tasks.md`: T023's note now reads "…15 skipped (Valkey integration), confirmed by the developer's own run at 20:55 (same counts, 620 s); manual walkthrough … still to do".  
  T023 stays `[ ]`.  
- No code, test or other artifact changed.  
- Tests: none written or run, since this is a record-keeping change only.  

2026-10-27 21:37

## TWEAK02 Launch Refused By Another Branch's Migration  
[-] Resolved (manually)  
[ ] Run Tests  

On launch:

[db] ENV_DATABASE_CA_CERT is not set: verifying the database certificate against the system roots
[server] Database migration failed; refusing to start: MigrationError: Migration (unknown) failed: corrupted migrations: previously executed migration 011-invitation-tokens is missing
    at migrateToLatest (C:\code\poll-line-graph\crowdpoll02\src\db\migrator.ts:17:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async startServer (C:\code\poll-line-graph\crowdpoll02\src\server.ts:165:21)
    
    Here is what is in the localhost database for the migrations table:
    "name","timestamp"
"001-extensions-and-auth","2026-09-18T16:14:01.415Z"
"002-polls","2026-09-18T16:14:01.456Z"
"003-participation","2026-09-18T16:14:01.491Z"
"004-vote-history","2026-09-18T16:14:01.510Z"
"005-launched-at","2026-09-21T23:08:30.257Z"
"006-user-permissions","2026-10-04T15:29:36.019Z"
"007-title-lengths","2026-10-23T17:38:04.060Z"
"008-email-key","2026-10-23T17:38:04.066Z"
"009-terms-and-privacy","2026-10-23T17:38:25.508Z"
"010-invitations","2026-10-26T22:27:05.982Z"
"011-invitation-tokens","2026-10-27T21:34:59.059Z"

### RECOMMENDATION

Cause: `011-invitation-tokens` is not in this branch.  
It lives only in the other checkout, `C:\code\UI-UX-PRIVATE-POLLS\crowdpoll02` (branch `UI-UX-PRIVATE-POLLS`), and adds `token_hash`, `token_expires_at` and `token_used_at` to `poll_invitations`.  
That checkout and this one both point at the same local database, `localhost:5432/app01`; it ran 011 there at 21:34.  
Kysely refuses to start any code whose list lacks a migration the database has already run, so this branch cannot start against `app01` while 011 is recorded there.  
No line-graph code is involved.

- **Option A** _(recommended)_: give this checkout its own local database.  
  Create `app01_linegraph` and point this checkout's git-ignored `.vscode/launch.json` and `devScripts/launch-dev.ps1` at it.  
  Migrations 001–010 run on the first start.  
  - Pros: nothing is deleted; both branches keep working side by side; no committed code changes.  
  - Cons: the new database starts empty, so test polls have to be made again (e.g. with `devScripts/populate/populate-poll.ts`).  
- **Option B**: roll 011 back in `app01`.  
  Run 011's `down` (drop the unique index and the three columns) and delete its row from `kysely_migration`.  
  - Pros: keeps all existing data and one shared database.  
  - Cons: destructive (any invitation tokens written are lost); the other checkout re-applies 011 the next time it starts, and the clash comes back.  
- **Option C**: bring 011 into this branch (merge `UI-UX-PRIVATE-POLLS`, or copy the migration file and its schema types).  
  - Pros: one database for both, with no data loss.  
  - Cons: pulls unrelated, unfinished work into this feature's branch and its PR, against the Surgical Changes principle.  

Recommended: A, since it is the only option that is reversible and leaves both branches untouched.  
Tests: none, because this is a change to the local environment, not to code; option C would bring in the other branch's tests instead.

2026-10-27 21:44

### ACCEPTED RECOMMENDATION

Option C, done by the developer: `dev` was merged into `poll-line-graph` (commit `34d9d3a`, "Merge branch 'dev' into poll-line-graph").  

- Detected:  
  - `src/db/migrations/011-invitation-tokens.ts` is now in this branch and registered in `src/db/migrations/index.ts`;  
  - it is byte-for-byte the same as the copy in `C:\code\UI-UX-PRIVATE-POLLS\crowdpoll02` that already ran on `app01`, so the start-up check finds every executed migration and has nothing new to run;  
  - the working tree is clean, with no unresolved conflicts.  
- Line-graph seams checked after the merge, all present:  
  - `tabs.js` mount and unmount;  
  - `pollCard.js` `resultColors`;  
  - the route in `tabsApi.ts`;  
  - the `/api/config` fields;  
  - `mayViewResults`;  
  - `index.html` and the `m3-assets.test.ts` allowlists;  
  - `postman/openapi.json`.  
- Verification: `tsc --noEmit` passes.  
  The test suite was postponed (Run Tests not ticked), so the merged branch is unverified by a run; run `npm test` before relying on it.  
  No tests were written, because the change came in through the merge, along with `dev`'s own tests.  
- Artifacts: none changed.  
  This feature itself still adds no migration; 011 belongs to `dev`'s invitation work.  

2026-10-27 22:01

## TWEAK03 Line Graph Exhausts Memory On A Large Poll  
[X] Resolved  
[ ] Run Tests  

(base) PS C:\code\poll-line-graph\crowdpoll02> npm run dev  

> native-auth-oauth@0.1.0 dev
> tsx watch src/server.ts

[server] Starting in both sign-in mode
[auth] Sign-in method: both; providers: Google, Amazon
[auth] Sign-up allowlist off
[db] ENV_DATABASE_CA_CERT is not set: verifying the database certificate against the system roots
[server] Database schema is up to date
[cache] Valkey ready
[cache] Using Valkey
[mailer] SES transport ready (us-east-1)
[search] postgres is serving home search
[spaces] Not configured: TRENDING and Newest objects are served from this instance
[sweeps] staleEditUpdateSweep every 20000ms (lock 9)
[sweeps] pollsAwaitingApprovalSweep every 5000ms (lock 1)
[sweeps] scheduleSweep every 60000ms (lock 2)
[sweeps] counterFlushSweep every 2000ms (lock 3)
[sweeps] trendingSweep every 60000ms (lock 4)
[sweeps] newestSweep every 60000ms (lock 10)
[sweeps] outboxDrainSweep every 15000ms (lock 5)
[sweeps] bookmarkRemovalSweep every 86400000ms (lock 6)
[sweeps] invitationSweep every 5000ms (lock 12)
[sweeps] retentionSweep every 86400000ms (lock 11)
[sweeps] reconcileSweep every 86400000ms (lock 7)
[sweeps] budgetController every 1000ms (lock 8)
[votes] consumer c80fb066-eea2-4fd4-b2e4-3ac6c4657b4a started (batch 500)
[server] Listening on http://localhost:8080 (both mode)
[sweeps] trendingSweep: 12 change(s)
[sweeps] newestSweep: 11 change(s)
[controller] R=0 B=1250 S=0/200 V=0 a=1.00 k=1/1/1
[server] SIGINT received; shutting down
(base) PS C:\code\poll-line-graph\crowdpoll02> devScripts/launch-dev.ps1
PostgreSQL service is running.
Starting server on http://localhost:8080 (both mode)...

> native-auth-oauth@0.1.0 dev
> tsx watch src/server.ts

[server] Starting in both sign-in mode
[auth] Sign-in method: both; providers: Google, Amazon
[auth] Sign-up allowlist off
[db] ENV_DATABASE_CA_CERT is not set: verifying the database certificate against the system roots
[server] Database schema is up to date
[cache] Valkey ready
[cache] Using Valkey
[mailer] SES transport ready (us-east-1)
[search] postgres is serving home search
[spaces] Not configured: TRENDING and Newest objects are served from this instance
[sweeps] staleEditUpdateSweep every 20000ms (lock 9)
[sweeps] pollsAwaitingApprovalSweep every 5000ms (lock 1)
[sweeps] scheduleSweep every 60000ms (lock 2)
[sweeps] counterFlushSweep every 2000ms (lock 3)
[sweeps] trendingSweep every 60000ms (lock 4)
[sweeps] newestSweep every 60000ms (lock 10)
[sweeps] outboxDrainSweep every 15000ms (lock 5)
[sweeps] bookmarkRemovalSweep every 86400000ms (lock 6)
[sweeps] invitationSweep every 5000ms (lock 12)
[sweeps] retentionSweep every 86400000ms (lock 11)
[sweeps] reconcileSweep every 86400000ms (lock 7)
[sweeps] budgetController every 1000ms (lock 8)
[votes] consumer 456d78ce-d7a7-4a56-b35a-b61b047f7d4f started (batch 500)
[server] Listening on http://localhost:8080 (both mode)
[sweeps] trendingSweep: 12 change(s)
[sweeps] newestSweep: 11 change(s)
[controller] R=0 B=2500 S=0/200 V=0 a=1.00 k=1/1/1
[votes] consumer round failed; retrying shortly: Error: Command timed out
    at Timeout.<anonymous> (C:\code\poll-line-graph\crowdpoll02\node_modules\iovalkey\built\Command.js:206:33)
    at listOnTimeout (node:internal/timers:605:17)
    at process.processTimers (node:internal/timers:541:7)
[sweeps] budgetController: the cache did not answer in time; retrying next tick
[sweeps] budgetController: the cache did not answer in time; retrying next tick
[votes] consumer round failed; retrying shortly: Error: Command timed out
    at Timeout.<anonymous> (C:\code\poll-line-graph\crowdpoll02\node_modules\iovalkey\built\Command.js:206:33)
    at listOnTimeout (node:internal/timers:605:17)
    at process.processTimers (node:internal/timers:541:7)
[sweeps] budgetController: the cache did not answer in time; retrying next tick
[votes] consumer round failed; retrying shortly: Error: Command timed out
    at Timeout.<anonymous> (C:\code\poll-line-graph\crowdpoll02\node_modules\iovalkey\built\Command.js:206:33)
    at listOnTimeout (node:internal/timers:605:17)
    at process.processTimers (node:internal/timers:541:7)
[sweeps] counterFlushSweep: the cache did not answer in time; retrying next tick
[sweeps] budgetController: the cache did not answer in time; retrying next tick
[votes] consumer round failed; retrying shortly: Error: Command timed out
    at Timeout.<anonymous> (C:\code\poll-line-graph\crowdpoll02\node_modules\iovalkey\built\Command.js:206:33)
    at listOnTimeout (node:internal/timers:605:17)
    at process.processTimers (node:internal/timers:541:7)
[sweeps] budgetController: the cache did not answer in time; retrying next tick
[sweeps] budgetController: the cache did not answer in time; retrying next tick
[votes] consumer round failed; retrying shortly: Error: Command timed out
    at Timeout.<anonymous> (C:\code\poll-line-graph\crowdpoll02\node_modules\iovalkey\built\Command.js:206:33)
    at listOnTimeout (node:internal/timers:605:17)
    at process.processTimers (node:internal/timers:541:7)
[sweeps] budgetController: the cache did not answer in time; retrying next tick
[sweeps] budgetController: the cache did not answer in time; retrying next tick
[sweeps] counterFlushSweep: the cache did not answer in time; retrying next tick
[votes] consumer round failed; retrying shortly: Error: Command timed out
    at Timeout.<anonymous> (C:\code\poll-line-graph\crowdpoll02\node_modules\iovalkey\built\Command.js:206:33)
    at listOnTimeout (node:internal/timers:605:17)
    at process.processTimers (node:internal/timers:541:7)
[sweeps] budgetController: the cache did not answer in time; retrying next tick
[sweeps] budgetController: the cache did not answer in time; retrying next tick
[sweeps] budgetController: the cache did not answer in time; retrying next tick
[votes] consumer round failed; retrying shortly: Error: Command timed out
    at Timeout.<anonymous> (C:\code\poll-line-graph\crowdpoll02\node_modules\iovalkey\built\Command.js:206:33)
    at listOnTimeout (node:internal/timers:605:17)
    at process.processTimers (node:internal/timers:541:7)
[sweeps] budgetController: the cache did not answer in time; retrying next tick
[sweeps] budgetController: the cache did not answer in time; retrying next tick
[votes] consumer round failed; retrying shortly: Error: Command timed out
    at Timeout.<anonymous> (C:\code\poll-line-graph\crowdpoll02\node_modules\iovalkey\built\Command.js:206:33)
    at listOnTimeout (node:internal/timers:605:17)
    at process.processTimers (node:internal/timers:541:7)

<--- Last few GCs --->

[55180:000001353F160000]    45230 ms: Scavenge (during sweeping) 4081.5 (4099.5) -> 4078.6 (4100.0) MB, pooled: 0.0 MB, 1.74 / 0.00 ms (average mu = 0.300, current mu = 0.267) allocation failure; 
[55180:000001353F160000]    45709 ms: Incremental Mark-Compact (reduce) 4086.1 (4104.0) -> 4076.9 (4093.0) MB, pooled: 0.0 MB, 371.05 / 0.00 ms (+ 8.6 ms in 118 steps since start of marking, biggest step 5.0 ms, walltime since start of marking 390 ms) (av
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
----- Native stack trace -----

 1: 00007FF6B79C4519 node::OnFatalError+1289
 2: 00007FF6B61FBF1A v8::Function::NewInstance+522
 3: 00007FF6B5FFC737 X509_STORE_get_cert_crl+54215
 4: 00007FF6B5FFA32C X509_STORE_get_cert_crl+44988
 5: 00007FF6B6013640 X509_STORE_set_cleanup+432
 6: 00007FF6B6013E19 X509_STORE_set_cleanup+2441
 7: 00007FF6B6013C11 X509_STORE_set_cleanup+1921
 8: 00007FF6B6013723 X509_STORE_set_cleanup+659
 9: 00007FF6B6024ABD X509_CRL_set_meth_data+33901
10: 00007FF6B5C0FA0E v8::CodeEvent::GetFunctionName+139438
11: 000001356783F43A 








### RECOMMENDATION

Cause, confirmed on the local database (read-only queries):  

- One poll, "Trump Approval Rating" (`027b89d3-677e-4dce-a4d9-b4655616b00a`, made by the populate script), holds 14,883,049 `vote_history` rows (2.6 GB) from 141,950 voters, 2025-02-13 to today.  
  Every other poll has fewer than ten rows.  
- `serveLineGraph` (`src/polls/lineGraph.ts:186–191`) loads every history row of the poll into Node to replay it.  
  On a cache miss for that poll this is about 15 million row objects:  
  parsing them blocks the event loop (hence every Valkey command timing out), and then the 4 GB heap runs out.  
- This is a scaling flaw in the plan's design (R4, "a TypeScript replay over one indexed query"), not a slip in the code.  
  Production is exposed the same way: retention keeps 12 months of history, and a Dynamic-Vote poll's voters may re-vote at will.  

A timing probe of option A on this poll: the per-bucket aggregation in PostgreSQL returned 290 rows in 24.0 s (1 Year, daily buckets).  

- **Option A**: aggregate in PostgreSQL instead of in Node.  
  One query returns, per bucket and choice, how the count changed:  
  the last row per address per bucket, compared with that address's previous one (`distinct on`, then `lag`), with rows before the window folded into the first bucket.  
  TypeScript adds them up and applies `computeResults`'s formula as now.  
  No migration, and the result is exactly the same as today's replay.  
  - Pros: small change, confined to `lineGraph.ts`; Node memory becomes buckets × choices; the existing replay tests still state the expected results.  
  - Cons: the database still reads the whole history on every cache miss (24 s for this poll), once per scale per `ENV_LINE_GRAPH_REFRESH_INTERVAL` while anyone is watching;  
    to stop several instances doing it at once it needs a "one at a time" lock key.  
- **Option B** _(recommended)_: keep hourly totals as votes are written.  
  A new table, `vote_history_hourly (poll_id, hour, choice_id, delta, voters_delta)`, is updated by the vote consumer in the same transaction as `vote_history`: each batch adds, per poll, hour and choice, the change from the voter's previous choices.  
  The graph then sums at most about 8,784 hours × choices rows, so it answers in milliseconds whatever the poll's size.  
  Existing history is backfilled once, by option A's query at hourly granularity.  
  - Pros: scales to any poll; no heavy read on each cache miss; the graph's history no longer depends on `vote_history` partitions, which retention drops after 12 months.  
  - Cons: the largest change, a re-plan rather than a tweak:  
    one migration (the plan said none), a change to the vote consumer (the vote path), a backfill, and updates to `plan.md` (R1, R4), `data-model.md`, `research.md`, `spec.md` assumptions, `tasks.md` and `ARCHITECTURE.md`.  
- **Option C**: a guard only.  
  Count the poll's history before replaying; above a new `ENV_LINE_GRAPH_MAX_REPLAY_ROWS` (e.g. 500,000) answer as a sparse graph or "Graph unavailable right now" instead of replaying.  
  - Pros: smallest change; stops the crash at once.  
  - Cons: large polls, which are the ones most worth graphing, get no graph.  

Recommended: B, since it is the only option that removes the cost rather than moving it.  
If you want the crash gone today, C (or A) can go in first as a stopgap, with B as the follow-up.  
Tests, whichever option:  

- `tests/line-graph-replay.test.ts`: keep every expected result;  
  A and B run the existing cases through the new path; C adds a case where the guard trips.  
- `tests/line-graph-route.test.ts`: the large-poll behaviour (C: the refusal shape; A: the lock key);  
  B also needs consumer tests in the vote-path suites asserting the hourly totals, and a backfill test.  

2026-10-27 22:04

### ACCEPTED RECOMMENDATION

Option B, accepted by "Accept b": the replay moved to write time, so serving a graph no longer reads the poll's history.  

- Code:  
  - `src/db/migrations/012-line-graph-tally.ts` (new, registered in `index.ts`): creates `line_graph_tally (poll_id, hour, choice_id, delta)` and `line_graph_selection (poll_id, email, choice_ids, voted_at)`, both cascading with their poll, and backfills them from `vote_history`;  
  - `src/polls/lineGraphTally.ts` (new):  
    - `tallyDeltas` is the replay arithmetic (each address's latest selection wins; a change lands in the first hour boundary at or after it; a vote older than the address's latest changes nothing);  
    - `recordLineGraphTally` applies it inside a vote transaction;  
    - `fillLineGraphTally` / `rebuildLineGraphTally` compute it afresh in SQL;  
  - `src/votes/consumer.ts` `writeBatch`, `src/polls/store.ts` `recordVote` and `insertVoteHistory`: one `recordLineGraphTally` call beside each `vote_history` insert;  
  - `src/legal/deleteAccount.ts`: the per-poll placeholder is written to `line_graph_selection` too;  
  - `devScripts/populate/populate-poll.ts`: `rebuildLineGraphTally` after a rerun deletes its test votes;  
  - `src/polls/lineGraph.ts`: `serveLineGraph` sums the tally into the scale's buckets in one grouped query (at most buckets × choices rows); `seriesFromTally` applies `computeResults`'s formula; `buildSeries` keeps its signature as raw votes through `tallyDeltas`, so the replay tests state graphs exactly as before;  
  - `src/db/schema.ts`: the two table types.  
- Tests (written, not run):  
  - `tests/line-graph-tally.test.ts` (new, 6 tests): the tally kept by `writeBatch` and `recordVote` equals one rebuilt from `vote_history`; a change lands in its hour, replacing the previous selection; a superseded late vote changes nothing; a rebuild after history deletion; account deletion keeps counts and anonymizes the selection; a deleted poll takes its rows;  
  - `tests/line-graph-route.test.ts`: the cache test now spots the tally query, and a new test asserts serving the graph never loads the history;  
  - `tests/helpers/setup.ts`, `tests/helpers/poll-fixtures.ts`: the two tables are added to the truncate lists, and `voteHistory().deleteMany` clears them.  
- Verification: `tsc --noEmit` passes for `src`, and the changed tests and populate script type-check.  
  Tests postponed (Run Tests not ticked); the 6 new tests, 1 new route test and the whole suite are not run, so the tweak is unverified by a run.  
  Run `npm test`.  
  The vote path changed, so the vote, counter and account-deletion suites matter as much as the line-graph ones.  
- Artifacts:  
  - `research.md` (R1, R4 amended), `data-model.md` (the two tables), `plan.md` (summary, structure, a constitution re-check), `spec.md` (a large-history edge case), `quickstart.md` (seeding, log line, backfill), `contracts/api.md` (log line; the response is unchanged), `tasks.md` (T027 added);  
  - `ARCHITECTURE.md` (the line-graph section and the data diagram) and `CLAUDE.md` (the feature's decisions).  
- This changes a requirement-level decision (the requirements' "no migration"); `requirements/20261027-151601-poll-line-graph/` may want the same note, and was not edited.  
- First start: migration 012 backfills the local database's 14.9-million-row poll once, which can take a minute or more.  

2026-10-27 22:17

## TWEAK04 Scale Switches Refused By The Refresh Limit  
[X] Resolved  
[ ] Run Tests  

The graphs look amazing!
For the 14,000,000+ row "Trump Approval Rating" poll, 
Eventually, the graph correctly rendered initially for 1 YEAR.  
But when clicking the other scale buttons (e.g., 1 Month, 1 Week), the graph sometimes fails to load due to rate limiting, resulting in 429 errors.



:8080/api/me:1  Failed to load resource: the server responded with a status of 401 (Unauthorized)
:8080/api/polls/027b89d3-677e-4dce-a4d9-b4655616b00a/line-graph?scale=1y:1  Failed to load resource: the server responded with a status of 429 (Too Many Requests)
lineGraph.js:260 [line-graph] refresh failed; keeping the last drawn graph
loadFailed @ lineGraph.js:260
:8080/api/polls/027b89d3-677e-4dce-a4d9-b4655616b00a/line-graph?scale=1y:1  Failed to load resource: the server responded with a status of 429 (Too Many Requests)
:8080/api/polls/027b89d3-677e-4dce-a4d9-b4655616b00a/line-graph?scale=1m:1  Failed to load resource: the server responded with a status of 429 (Too Many Requests)
:8080/api/polls/027b89d3-677e-4dce-a4d9-b4655616b00a/line-graph?scale=1y:1  Failed to load resource: the server responded with a status of 429 (Too Many Requests)
:8080/api/polls/027b89d3-677e-4dce-a4d9-b4655616b00a/line-graph?scale=1y:1  Failed to load resource: the server responded with a status of 429 (Too Many Requests)
:8080/api/polls/027b89d3-677e-4dce-a4d9-b4655616b00a/line-graph?scale=1w:1  Failed to load resource: the server responded with a status of 429 (Too Many Requests)
:8080/api/polls/027b89d3-677e-4dce-a4d9-b4655616b00a/line-graph?scale=1w:1  Failed to load resource: the server responded with a status of 429 (Too Many Requests)
line-graph?scale=1d:1  Failed to load resource: the server responded with a status of 429 (Too Many Requests)
:8080/api/me:1  Failed to load resource: the server responded with a status of 401 (Unauthorized)
:8080/api/me:1  Failed to load resource: the server responded with a status of 401 (Unauthorized)
:8080/api/polls/027b89d3-677e-4dce-a4d9-b4655616b00a/line-graph?scale=1w:1  Failed to load resource: the server responded with a status of 429 (Too Many Requests)
line-graph?scale=1d:1  Failed to load resource: the server responded with a status of 429 (Too Many Requests)
:8080/api/polls/027b89d3-677e-4dce-a4d9-b4655616b00a/line-graph?scale=1w:1  Failed to load resource: the server responded with a status of 429 (Too Many Requests)
:8080/api/polls/027b89d3-677e-4dce-a4d9-b4655616b00a/line-graph?scale=1w:1  Failed to load resource: the server responded with a status of 429 (Too Many Requests)
:8080/api/polls/027b89d3-677e-4dce-a4d9-b4655616b00a/line-graph?scale=1w:1  Failed to load resource: the server responded with a status of 429 (Too Many Requests)


### RECOMMENDATION

Cause: `GET /api/polls/:pid/line-graph` is behind `...dynamic("refresh")`, the per-visitor manual-refresh limit (`ENV_MIN_MANUAL_REFRESH_INTERVAL` 5 s, after a burst of `ENV_MANUAL_REFRESH_BURST` 5).  
That allowance is shared with tab clicks, Refresh and bookmarks, and every scale click is one request, so a few quick clicks use it up and the rest answer `429`.  
`lineGraph.js` neither waits nor retries, so a refused click is simply lost (the old scale stays drawn), and the next timer tick may be refused too.  
The rest of the app waits `retryAfterMs` and retries once (`tabs.js:500`).  
The graph's size is not the cause: since TWEAK03 each answer takes milliseconds.

- **Option A** _(recommended)_: one request carries every available scale.  
  The response gains `scales: { "1d": { buckets, series, totalVoted }, … }` for each available scale, computed together on a cache miss (one grouped tally query per scale, milliseconds each) and cached under one key, `line-graph:<pid>`.  
  A scale click redraws from what the browser already holds, with no request; the refresh timer refetches all scales in one request a minute.  
  - Pros: switching is instant and can never be refused; fewer requests overall; the limit stays as it is.  
  - Cons: a contract change (`contracts/api.md` A1, `contracts/ui-contracts.md` C3, `postman/openapi.json`); a larger response (about 600 points per choice when all four scales are offered); the `scale` query parameter goes; the scale-selector and route tests change.  
- **Option B**: retry after a `429` as the rest of the app does.  
  On `429`/`503` `lineGraph.js` waits `retryAfterMs` and retries once; a newer click replaces the pending retry; the clicked button shows as selected and busy (`aria-busy`) until its scale arrives.  
  - Pros: small, client-only, follows the app's own convention; no contract change.  
  - Cons: after a burst a click still takes up to 5 s to show, and the graph still spends the allowance tab clicks and Refresh need.  
- **Option C**: give the graph a limit of its own.  
  A new load kind `graph` with its own floor (e.g. the 2 s live floor) and burst, so scale clicks no longer share the manual allowance.  
  - Pros: no contract change; tab refreshes keep their allowance.  
  - Cons: changes the load machinery (a fifth kind in the floors, the shedding order and the budget controller, plus a new setting), and quick clicking can still be refused.  

Recommended: A, since it removes the request a click makes rather than rationing it.  
Tests:  

- **A**:  
  - `tests/line-graph-route.test.ts`: one response holds every available scale; one cache key; `?scale=` is no longer read;  
  - `tests/line-graph-ui.test.ts`: a click redraws with no request; a tick refetches once;  
  - `tests/line-graph-replay.test.ts` is unchanged.  
- **B**: `tests/line-graph-ui.test.ts`: a `429` on a click is retried after `retryAfterMs`; a newer click supersedes it; a `429` tick keeps the last graph.  
- **C**: the load-pipeline tests for the new kind.  

2026-10-27 22:26

### ACCEPTED RECOMMENDATION

Option A, accepted by "accept a" 2026-10-27 22:35.  
One request now carries every available scale, and a scale click redraws locally with no request, so it can no longer meet the refresh limit's `429`.  
The response is `{ defaultScale, availableScales, totalVoted, scales: { <scale>: { buckets, series } } }`;
`totalVoted` is the poll's, the same on every scale, so it sits once at the top rather than in each scale.  

Code:  

- `src/polls/lineGraph.ts`: `serveLineGraph(deps, pid)` computes every available scale on a cache miss (one grouped tally query per scale) under one key, `line-graph:<pid>`;
  `resolveScale` is gone;
  the log line is `[line-graph] poll <pid> scales 1d,1w,1m,1y — <n> tally rows summed in <m> ms`.  
- `src/routes/tabsApi.ts`: the route no longer reads `?scale=`; a stray one is ignored.  
- `src/public/lineGraph.js`: `showScale(scale)` draws a scale from the held response;
  a click calls it with no fetch;
  each refresh tick refetches the whole response and redraws the scale the viewer chose (the default when that scale is no longer offered).  
- `postman/openapi.json`: the `scale` parameter is removed and the 200 schema is the new shape.  

Tests (written, not run — `Run Tests` is not ticked):  

- `tests/line-graph-route.test.ts`: one response holds every available scale and only those;
  scales are limited by the poll's span;
  `?scale=` is ignored;
  the unknown and unavailable scale refusals are removed;
  the existing cases read the default scale through a `view()` helper.  
- `tests/line-graph-ui.test.ts`: a scale click redraws with no new request;
  a tick fetches `/api/polls/<pid>/line-graph`;
  a chosen scale (1 Week) is kept across ticks.  
- `tests/line-graph-replay.test.ts`: the `resolveScale` test is removed.  

Artifacts:  

- `contracts/api.md` A1 (the query, the shape, the cache key, the log line);
  `contracts/ui-contracts.md` C3 and C8;
  `research.md` R3 and R5;
  `plan.md`;
  `spec.md` FR-012 and SC-004;
  `data-model.md`;
  `tasks.md` T028 [X].  
- `ARCHITECTURE.md` (the line-graph section and the cache key table) and `CLAUDE.md`.  

## TWEAK05 <short title here>  
[ ] Resolved  
[ ] Run Tests  


