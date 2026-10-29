# Overview: `specs/20261029-150703-BRANCH-MIGRATION-MERGE`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261029-150703-BRANCH-MIGRATION-MERGE` |
| Tweak file created | 2026-10-29 17:33 |
| Last updated | 2026-10-29 17:38 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Server Starts Without Running Fix Migrations  
[X] Resolved  
[ ] Run Tests  

Before this implementation the local server log said:
```text
[server] Starting in both sign-in mode
[auth] Sign-in method: both; providers: Google, Amazon
[auth] Sign-up allowlist off
[db] ENV_DATABASE_CA_CERT is not set: verifying the database certificate against the system roots
[server] Database migration failed; refusing to start: MigrationError: Migration (unknown) failed: corrupted migrations: previously executed migration 013-line-graph-enabled is missing
    at migrateToLatest (C:\crowdPoll\main\src\db\migrator.ts:17:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async startServer (C:\crowdPoll\main\src\server.ts:165:21)
```

Now the local server log shows:
```text
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
[sweeps] counterFlushSweep every 10000ms (lock 3)
[sweeps] trendingSweep every 60000ms (lock 4)
[sweeps] newestSweep every 60000ms (lock 10)
[sweeps] outboxDrainSweep every 15000ms (lock 5)
[sweeps] bookmarkRemovalSweep every 86400000ms (lock 6)
[sweeps] invitationSweep every 30000ms (lock 12)
[sweeps] retentionSweep every 86400000ms (lock 11)
[sweeps] reconcileSweep every 86400000ms (lock 7)
[sweeps] budgetController every 1000ms (lock 8)
[votes] consumer f5b5064e-abe6-456d-9a8d-9e5ec2e75b30 started (batch 500)
[server] Listening on http://localhost:8080 (both mode)
[sweeps] trendingSweep: 13 change(s)
[sweeps] newestSweep: 12 change(s)
[controller] R=0 B=1250 S=0/200 V=0 a=1.00 k=1/1/1 tabs=0/0 stretched=0
```  

In other words, I was on step "2. `npm run dev` in `main` → refuses to start with
   `Migration check failed: corrupted migrations: previously executed migration 013-line-graph-enabled is missing`
   and the line naming `npm run fix-migrations`."  
but there is no error now.  
I didn't run `npm run fix-migrations`, yet the server starts without errors now. 

### RECOMMENDATION

No code change: the server starts because `app01` was already repaired.  
`/speckit-implement` ran quickstart §2 itself (task T019): `npm run fix-migrations -- --apply` on `app01` at about 17:20 rolled back `013-line-graph-enabled` and removed its record, so step 2 had nothing to refuse.  

- `specs/20261029-150703-BRANCH-MIGRATION-MERGE/quickstart.md` §2: add a note that the walk-through may already have been done, and that the refusal comes back after starting (then stopping) the server in `C:\crowdPoll\line-graph-toggle` once, which re-applies `013-line-graph-enabled`.  
- Tests: none; the change is documentation only.  

2026-10-29 17:37

### ACCEPTED RECOMMENDATION

No code change: the start-up check and `npm run fix-migrations` behave as specified.  
The server started because `app01` had already been repaired during `/speckit-implement` (T019).  

- `specs/20261029-150703-BRANCH-MIGRATION-MERGE/quickstart.md` §2: added a note on bringing the refusal back by starting and stopping the server in `C:\crowdPoll\line-graph-toggle` once.  
- Tests: none written; the change is documentation only, with nothing a test can observe.  
- Tests postponed (Run Tests not ticked); nothing to run.  

2026-10-29 17:38

## TWEAK02 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  
