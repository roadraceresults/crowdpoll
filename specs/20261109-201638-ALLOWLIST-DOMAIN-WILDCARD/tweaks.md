# Overview: `specs/20261109-201638-ALLOWLIST-DOMAIN-WILDCARD`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261109-201638-ALLOWLIST-DOMAIN-WILDCARD` |
| Tweak file created | 2026-11-10 07:34 |
| Last updated | 2026-11-10 07:40 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Administrator Logs In Past The Pattern  
[X] Resolved  
[ ] Run Tests  

When launching using ".vscode\launch.json"
devadmin01@crowdpoll.vote was allowed to Log in.
Heree is the server log:

```
(base) PS C:\crowdPoll\main>  
${env:ENV_ALLOWED_EMAILS}='road*@gmail.com'; 
Debugger attached.
Debugger attached.
Debugger attached.
[config] ENV_DATABASE_CA_CERT was not found, using default value: none (system certificate roots).
[config] ENV_HOME_TAB_REFRESH_INTERVAL was not found, using default value: 7200000.
[config] ENV_MAX_HOME_PAGE_POLLS was not found, using default value: 200.
[config] ENV_OAUTH_APPLE_* was not found, using default value: none (Apple login off).
[config] ENV_OAUTH_MICROSOFT_* was not found, using default value: none (Microsoft login off).
[config] ENV_OPENSEARCH_URL was not found, using default value: none (PostgreSQL full-text search).
[config] ENV_PROTOTYPES was not found, using default value: none (no prototypes served).
[server] Starting in both login mode
[auth] Login method: both; providers: Google, Amazon
[auth] Sign-up allowlist on (1 pattern)
[db] ENV_DATABASE_CA_CERT is not set: verifying the database certificate against the system roots
[server] Database schema is up to date
[cache] Valkey ready
[cache] Using Valkey
[mailer] SES transport ready (us-east-1)
[search] postgres is serving home search
[spaces] TRENDING and Newest objects publish to bucket "crowdpoll-cdn" (tor1); browsers read them from https://crowdpoll-cdn.tor1.digitaloceanspaces.com
[sweeps] avatarRemovalSweep every 300000ms (lock 13)
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
[votes] consumer 9b6440b1-33ed-472e-b6c4-eb9ef2224435 started (batch 500)
[server] Listening on http://localhost:8080 (both mode)
[trending] published counts and cards for 19 polls
[sweeps] trendingSweep: 19 change(s)
[newest] published counts and cards for 19 polls to Spaces bucket "crowdpoll-cdn"
[sweeps] newestSweep: 19 change(s)
[controller] R=0 B=1250 S=0/200 V=0 a=1.00 k=1/1/1 tabs=0/0 stretched=0
[mailer] Sent login-link to d•••@crowdpoll.vote (message id <010001a1c571ab2f-0f6e9880-5b06-4ef9-8088-f2997af7ad51-000000@email.amazonses.com>)
[auth] Login link sent to d•••@crowdpoll.vote
[auth] Login completed (staySignedIn=true)
[trending] published counts for 19 polls
[sweeps] trendingSweep: 19 change(s)
[newest] published counts for 19 polls to Spaces bucket "crowdpoll-cdn"
[sweeps] newestSweep: 19 change(s)
[controller] R=0 B=1250 S=0/200 V=0 a=1.00 k=1/1/1 tabs=0/2 stretched=0

```

### RECOMMENDATION

The login is expected behaviour, not a fault in the pattern.  
`devadmin01@crowdpoll.vote` is listed in `ENV_ADMINS` in `.vscode/launch.json` (line 17), and administrators are always admitted, whatever the allowlist holds (FR-004, `isAllowed` in `src/auth/allowlist.ts`).  
`road*@gmail.com` itself did not admit it.

- **Option A** _(recommended)_: Accept as-is.  
  No code change.  
  - Pros: keeps the rule that an administrator can never be locked out by the allowlist.  
  - Cons: the startup line `(1 pattern)` does not hint that administrators are also admitted.  
- **Option B**: Name the administrators in the startup line: `[auth] Sign-up allowlist on (1 pattern; 3 administrators always allowed)`, in `allowlistStatus`.  
  Tests: extend the startup-line cases in `tests/allowlist.test.ts` (written, not run unless Run Tests is ticked).  
  Docs: the startup-line examples in README, CLAUDE_COMPLETE and `.claude/rules/environment.md`; contract S3 and `quickstart.md`.  
  - Pros: the log explains why an administrator gets in.  
  - Cons: changes a log line that operators may already grep for.  
- **Option C**: Stop admitting administrators who are not on the list.  
  - Pros: the allowlist is the only gate.  
  - Cons: reverses FR-004; an administrator could lock themselves out before launch.  

To see the pattern refuse, log in as an address that is neither an administrator nor `road*@gmail.com`, e.g. `devuser01@crowdpoll.vote`.  

2026-11-10 07:37

### ACCEPTED RECOMMENDATION

Option B, chosen by the developer.  
The startup line now also counts the administrators, who are always allowed, naming none: `[auth] Sign-up allowlist on (1 pattern; 3 administrators always allowed)`.  
The note is left out when `ENV_ADMINS` is empty.

- `src/auth/allowlist.ts`: `allowlistStatus` adds `; <k> administrator(s) always allowed`.  
- `tests/allowlist.test.ts`: the four expected startup lines now end `; 1 administrator always allowed` (the default `ENV_ADMINS`);
  a new test, "counts the administrators it always allows, naming none", covers three administrators and none.  
- Tests postponed (Run Tests not ticked); the new and changed tests were not run.  
  `npx tsc --noEmit` is clean.  
- Docs: `README.md` (pre-launch paragraph), `CLAUDE_COMPLETE.md` and `.claude/rules/environment.md` (the `ENV_ALLOWED_EMAILS` row).  
- Artifacts: `spec.md` (FR-007), `contracts/allowlist-setting.md` (S3 table), `quickstart.md` (steps 1 and 2), `tasks.md` (T013).  

2026-11-10 07:40

## TWEAK02 <short title here>  
[ ] Resolved  
[ ] Run Tests  



