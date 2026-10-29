# Overview: `specs/20261028-151716-REFRESH-MECHANISMS`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261028-151716-REFRESH-MECHANISMS` |
| Tweak file created | 2026-10-29 03:21 |
| Last updated | 2026-10-29 13:04 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Local Launch Files Flush Interval  
[X] Resolved  
[ ] Run Tests  

Please update the following files with the new environment variable values:
- .vscode\launch.json
- devScripts\launch-dev.ps1 

### RECOMMENDATION

The feature's only environment change is `ENV_COUNTER_FLUSH_INTERVAL`, 2000 → 10000 (R10);  
it added no new setting.  
`launch.json.example` and `devScripts.example/launch-dev.ps1` already carry 10000.  

- `.vscode/launch.json`: set `"ENV_COUNTER_FLUSH_INTERVAL": "10000"` in all 7 configurations (lines 55, 157, 229, 301, 373, 446, 518).  
- `devScripts/launch-dev.ps1`: set `$env:ENV_COUNTER_FLUSH_INTERVAL = "10000"` (line 69).  
- Tests: none; both files are git-ignored local configuration that no test reads, and `tests/config.test.ts` already asserts the 10000 default.  
- Artifacts: none; the templates, `CLAUDE.md` and `README.md` already say 10000.  

2026-10-29 03:24

### ACCEPTED RECOMMENDATION

- `.vscode/launch.json`: `ENV_COUNTER_FLUSH_INTERVAL` 2000 → 10000 in all 7 configurations;  
  the file still parses as JSON.  
- `devScripts/launch-dev.ps1`: `$env:ENV_COUNTER_FLUSH_INTERVAL` 2000 → 10000 (line 69).  
- Tests: none written, since no test reads these git-ignored local files;  
  `tests/config.test.ts` already asserts the 10000 default.  
  Tests postponed (Run Tests not ticked); none run.  
- Artifacts: none needed.  

2026-10-29 03:36

## TWEAK02 Outbox Drain Interval Unchanged  
[X] Resolved  
[ ] Run Tests  

Was ENV_OUTBOX_DRAIN_INTERVAL default changed?

### RECOMMENDATION

No, and none is needed: `ENV_OUTBOX_DRAIN_INTERVAL` stays 15000 by design.  
The spec's assumption (`spec.md:251`) says the outbox drain keeps its interval;  
only the counter flush (10 s) and the invitation sweep (30 s) changed (R10).  

- The value is 15000 everywhere:  
  - `src/config.ts:394`;  
  - `.do/app.yaml:184`;  
  - `launch.json.example` (7 configurations) and `devScripts.example/launch-dev.ps1:74`;  
  - `.vscode/launch.json` and `devScripts/launch-dev.ps1:73`.  
- No code, test or artifact change.  

2026-10-29 03:45

### ACCEPTED RECOMMENDATION

Answered: the default was not changed and stays 15000 (`spec.md:251`), consistent in the code, the production spec, the templates and the local launch files.  
No files edited;  
no tests, as nothing changed.  
Tests postponed (Run Tests not ticked); none run.  
Artifacts: none needed.  

2026-10-29 03:45

## TWEAK03 Rename Environment Variables for Sweeps and Refresh Mechanisms  
[X] Resolved  
[x] Run Tests  

Rename the following env variables in every file that mentions them;  
code, docs, config files, scripts, ps1 files, devScripts\launch-dev.ps1, .vscode\launch.json, etc.    
but don't update historical requirements and spec files:  
`ENV_BUDGET_CONTROLLER_INTERVAL` -> `ENV_BUDGET_CONTROLLER_SWEEP_INTERVAL`  
`ENV_COUNTER_FLUSH_INTERVAL` -> `ENV_COUNTER_FLUSH_SWEEP_INTERVAL`  
`ENV_POLL_APPROVAL_POLLING_INTERVAL` -> `ENV_POLL_APPROVAL_SWEEP_INTERVAL`  
`ENV_OUTBOX_DRAIN_INTERVAL` -> `ENV_OUTBOX_DRAIN_SWEEP_INTERVAL`  
`ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL` -> `ENV_POLL_EDIT_UPDATE_SWEEP_INTERVAL`  
`ENV_POLL_DATE_CHECK_POLLING_INTERVAL` -> `ENV_POLL_DATE_CHECK_SWEEP_INTERVAL`  
`ENV_TRENDING_POLLS_RECOMPUTE_INTERVAL` -> `ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL`  
`ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL` -> `ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL` 

`ENV_MIN_SEARCH_INTERVAL` -> `ENV_MIN_SEARCH_REFRESH_INTERVAL`  
`ENV_MIN_VOTE_INTERVAL` -> `ENV_MIN_VOTE_REFRESH_INTERVAL`  
`ENV_MAX_STRETCH` -> `ENV_MAX_REFRESH_AND_SEARCH_STRETCH` 

Make the const from sweeps.ts an environment variable as well  
and add it to every file that uses or documents env variables;  code, docs, config files, scripts, ps1 files, devScripts\launch-dev.ps1, .vscode\launch.json  
but don't update historical requirements and spec files:     
`INVITATION_SWEEP_INTERVAL_MS` -> `ENV_INVITATION_SWEEP_INTERVAL`  

### RECOMMENDATION

Common to every option (the rename itself):  

- `src/config.ts`: the 11 `intVar` names and every `ConfigError` message that names them;  
  the config field names (`counterFlushIntervalMs`, …) stay.  
  New `invitationSweepIntervalMs: intVar(env, "ENV_INVITATION_SWEEP_INTERVAL", 30_000)`;  
  `src/polls/sweeps.ts` drops the `INVITATION_SWEEP_INTERVAL_MS` constant and reads `config.invitationSweepIntervalMs`.  
- Configuration: `.do/app.yaml`, `launch.json.example` (7 configurations), `devScripts.example/launch-dev.ps1`, `.vscode/launch.json`, `devScripts/launch-dev.ps1`: rename, and add `ENV_INVITATION_SWEEP_INTERVAL` = 30000 beside the counter flush.  
- Docs: `CLAUDE.md` (the settings table, gaining an `ENV_INVITATION_SWEEP_INTERVAL` row, and every mention in the Spec Kit block, since `CLAUDE.md` guides current work), `README.md`, `ARCHITECTURE.md`, `postman/openapi.json` (descriptions only), `devScripts/load/README.md`, and `requirements/environmentVariablesGroups.md` (a living list of every variable the app reads, not a feature's requirements).  
- Tests: rename in the 18 test files and helpers that set or assert these names;  
  `tests/config.test.ts` gains a test that `ENV_INVITATION_SWEEP_INTERVAL` defaults to 30000 and is read, and `tests/invitations-send.test.ts` sets it instead of relying on the constant.  
- This feature's artifacts (`spec.md`, `plan.md`, `tasks.md`, `research.md` R10, `contracts/api.md`, `quickstart.md`, `data-model.md`): the new names, and "no new setting" becomes "one new setting, `ENV_INVITATION_SWEEP_INTERVAL`";  
  a new task line `T045` records the rename.  
- Left alone, as historical: every other `specs/*` folder, `requirements/<feature>/…` and the flat `requirements/0NN-…` documents (this feature's included), `architecture/`, `research/`, `prototypes/`.  

How the old names are treated:  

- **Option A** _(recommended)_: rename, and `loadConfig` refuses to start when any of the 11 old names is set, with `ConfigError: ENV_COUNTER_FLUSH_INTERVAL was renamed to ENV_COUNTER_FLUSH_SWEEP_INTERVAL`.  
  - Pros: a value left behind (an App Platform console override, an old local script) cannot be silently ignored;  
    about ten lines, and one test.  
  - Cons: a stale environment stops the app until it is fixed;  
    a small table of retired names lives on in `config.ts`.  
- **Option B**: plain rename; the old names are simply no longer read.  
  - Pros: least code;  
    nothing old remains.  
  - Cons: a value set anywhere I don't edit is dropped without a word, and the default applies instead.  
- **Option C**: rename, and still read each old name when the new one is unset, logging a deprecation line.  
  - Pros: no deployment can break.  
  - Cons: two names per setting to maintain and test;  
    the old names never go away.  

Recommended: A, because production deploys by hand from `.do/app.yaml` plus console variables, and a silently dropped tuning value is the worst failure here.  
Tests would be written but not run (Run Tests not ticked);  
`npx tsc --noEmit` would be run.  

2026-10-29 03:58

### ACCEPTED RECOMMENDATION

Option A, accepted by "A Accept, and run tests" (2026-10-29 04:00).  

- Code:  
  - `src/config.ts`: the eleven names renamed in every `intVar` and `ConfigError` message;  
    new `RENAMED_VARS` table, and `loadConfig` throws `ConfigError: <old> was renamed to <new>.` while an old name is set;  
    new `invitationSweepIntervalMs` from `ENV_INVITATION_SWEEP_INTERVAL` (default 30000).  
  - `src/polls/sweeps.ts`: the `INVITATION_SWEEP_INTERVAL_MS` constant removed;  
    `invitationSweep` runs at `config.invitationSweepIntervalMs`.  
- Configuration: `.do/app.yaml`, `launch.json.example` (7 configurations), `devScripts.example/launch-dev.ps1`, `.vscode/launch.json`, `devScripts/launch-dev.ps1`: renamed, and `ENV_INVITATION_SWEEP_INTERVAL` = 30000 added after the counter flush;  
  both JSON files still parse.  
  `.vscode/launch.json` now holds a single "Debug server" configuration, changed outside this tweak and left as found.  
- Docs: `CLAUDE.md` (every mention, a new settings row, the feature block's "one new setting" line), `README.md` (new row), `ARCHITECTURE.md` (sweeps table), `postman/openapi.json` (descriptions), `devScripts/load/README.md`, `requirements/environmentVariablesGroups.md` (new row).  
- Tests:  
  - `tests/config.test.ts`: `ENV_INVITATION_SWEEP_INTERVAL` added to the settings list (default, read, rejected when invalid);  
    new test "refuses to start while a renamed setting is still set under its old name, naming the new one".  
  - `tests/invitations-send.test.ts`: the sweep runs at `config.invitationSweepIntervalMs`, 30000 by default, 7000 when set.  
  - 16 other test files and helpers renamed.  
  - `npx tsc --noEmit` clean;  
    the two changed files 73/73;  
    full `npm test` 134 files passed, 1 skipped (Valkey integration), 1800 tests passed, 17 skipped.  
- Artifacts: `spec.md` (FR-016, the assumption on settings), `plan.md` (constraints, constitution check, structure), `research.md` (R10), `contracts/api.md` (A7), `tasks.md` (T036 note, T045 added), plus the renamed names in `quickstart.md`.  
- Left alone, as historical: other `specs/*` folders, `requirements/` feature documents (this feature's included), `architecture/`, `research/`, `prototypes/`.  
- The rename changes what the feature's requirements document calls these settings;  
  `requirements/20261028-151716-refresh-mechanisms/requirements.md` keeps the old names, as asked.  

2026-10-29 04:22

## TWEAK04 Group Launch Script Settings  
[X] Resolved  
[ ] Run Tests  

Please reorganize the environment variables in `devScripts.example\launch-dev.ps1`  
so that related settings are grouped together logically, making it easier to find and update them.  
Also, add comments or section headers to indicate the purpose of each group of settings, improving readability and maintainability.  

If you have any other suggesting for renaming to make the environment variables more consistent or descriptive, please make those suggestions in the `### ACCEPTED RECOMMENDATIONS` section you create after resolving this tweak.

### RECOMMENDATION

Regroup `devScripts.example/launch-dev.ps1` into the eleven groups of `requirements/environmentVariablesGroups.md`, in that order, each under a `# --- N. <Group> ---` header with a one-line purpose.  
The header comment, the PostgreSQL service block and the launch block stay as they are.  
Every value stays as it is, except the defects below.  
The development notes (email rate limit, private voter limit, choices) move into their groups.  

Placement of variables the groups document does not list:  

- `ENV_PUBLIC_ORIGIN`, `ENV_PROTOTYPES` → 1. Runtime.  
- `ENV_DATABASE_CA_CERT` → 2. Backing services, empty.  
- `ENV_SIGNIN_METHOD`, `ENV_ALLOWED_EMAILS` and the `ENV_OAUTH_*` providers → 3. Authentication and sessions.  
- `ENV_EMAIL_TRANSPORT`, `ENV_SES_*`, `ENV_EMAIL_FROM`, `ENV_EMAIL_SEND_TIMEOUT` (new, `10000`), `ENV_EMAIL_ASSET_ORIGIN` → 4. Email.  
- `ENV_MAX_INVITATIONS_PER_DAY` → 5. Poll rules; `ENV_INVITATION_SWEEP_INTERVAL` → 6. Background work.  
- `ENV_MAX_NEWEST_POLLS`, `ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL` → 8. Listings and search.  

Defects found while reading it, fixed in the same pass:  

- `ENV_MAX_INVITATIONS_PER_DAY` is set twice (lines 58 and 112); keep one.  
- `ENV_PUBLIC_ORIGIN` is `http://localhost:80810`, but the port is `8081`; it becomes `http://localhost:8081`.  
- The 017 comment says to leave `ENV_VALKEY_URL` unset, yet line 86 sets `redis://localhost:6379`; the comment is reworded to say a local Valkey is optional and the line is kept.  
- Ten blank lines (122–130) and the trailing spaces after the two Spaces secrets go.  

Options:  

- **A** — the template only.  
- **B** _(recommended)_ — A, plus bring `requirements/environmentVariablesGroups.md` up to date, since the template will cite it as its grouping.  
  It still lists Facebook and GitHub sign-in, `ENV_SMTP_*` and `ENV_SMTP_FROM`, and lacks the variables placed above.  
- **C** — B, plus apply the same order to the local `devScripts/launch-dev.ps1`, keeping its values and secrets.  

`launch.json.example`, `.do/app.yaml` and the code are untouched in every option.  
`tests/config.test.ts` reads the template's SES, sender and allowlist lines; their values stay, so it keeps passing.  
Renaming suggestions go into the ACCEPTED RECOMMENDATION, as asked.  

### ACCEPTED RECOMMENDATION

Accepted 2026-10-29 07:52: Option C.  
Tests were not run (`Run Tests` is empty); no test or code changed.  

- `devScripts.example/launch-dev.ps1`: the settings are in the eleven groups of `requirements/environmentVariablesGroups.md`, in that order, each under a `# --- N. <Group>: <purpose> ---` header.  
  - `ENV_PROTOTYPES` (empty), `ENV_DATABASE_CA_CERT` (empty) and `ENV_EMAIL_SEND_TIMEOUT` (`10000`) were added.  
  - `ENV_PUBLIC_ORIGIN` is `http://localhost:8081` (was `80810`); the second, unquoted `ENV_MAX_INVITATIONS_PER_DAY` is gone.  
  - The Valkey comment now says a local Valkey is optional; the private voter limit note gives the real production default, 100 (it said 500).  
  - Every other value is unchanged; the PostgreSQL and launch blocks are as before.  
- `devScripts/launch-dev.ps1` (local, git-ignored): regrouped the same way by a script that copied each value across.  
  - Every value and every commented-out alternative line was kept, each commented line just above its setting; the Mailtrap lines sit at the end of group 4.  
  - The three new settings came from the template.  
  - Both scripts parse without errors.  
- `requirements/environmentVariablesGroups.md`: names the template as following its groups.  
  - It adds `ENV_PUBLIC_ORIGIN`, `ENV_PROTOTYPES`, the allowlist, the Apple, Microsoft and Amazon providers, the SES and email settings, `ENV_MAX_INVITATIONS_PER_DAY` and the two Newest settings.  
  - It drops Facebook, GitHub and `ENV_SMTP_FROM`, and marks `ENV_SMTP_*` as `smtp` only.  
  - It corrects three stale notes: `409 live-cap` instead of evicting the oldest, the counter flush no longer tied to the manual floor, and the CDN `max-age` capped at 10 s.  
- `tasks.md`: T046 added as done.  

Renaming suggestions, none applied:  

- `ENV_POLL_EDIT_UPDATE_SWEEP_INTERVAL` → `ENV_POLL_EDIT_HEARTBEAT_INTERVAL`: it is how often an open editing card tells the server it is present, a browser timing (group 11), not a sweep.  
- `ENV_SERVER_MAX_REFRESH_PER_SECOND` and `ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND` → `ENV_SERVER_MAX_REQUESTS_PER_SECOND` and `ENV_SERVER_MAX_REQUESTS_PER_INSTANCE_PER_SECOND`: the budget counts every dynamic request, not only refreshes.  
- `ENV_MAX_IDLE_TIME` → `ENV_LIVE_RESULTS_MAX_IDLE_TIME`: only the Live Results tab uses it.  
- `ENV_API_CALL_TIMEOUT` → `ENV_SCREENING_CALL_TIMEOUT`: it bounds the Acceptability Screening call only.  
- `ENV_SIGNIN_COOKIE_DURATION_MAX` → `ENV_MAX_SIGNIN_COOKIE_DURATION`, and `ENV_PRIVATE_VOTER_LIMIT_DEFAULT` → `ENV_MAX_PRIVATE_POLL_VOTERS`: `MAX` first, like the other ceilings.  
- `ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW` → `ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES`: the unit last, as a suffix.  

Each would be a TWEAK03-style rename: code, configuration, docs and tests, with the old name refused at start-up.  

## TWEAK06 Apply Renaming Suggestions  
[X] Resolved  
[ ] Run Tests  

Apply renaming:  
- `ENV_POLL_EDIT_UPDATE_SWEEP_INTERVAL` → `ENV_POLL_EDIT_HEARTBEAT_INTERVAL`
- `ENV_MAX_IDLE_TIME` → `ENV_LIVE_RESULTS_MAX_IDLE_TIME`
- `ENV_API_CALL_TIMEOUT` → `ENV_SCREENING_CALL_TIMEOUT`
- `ENV_SIGNIN_COOKIE_DURATION_MAX` → `ENV_MAX_SIGNIN_COOKIE_DURATION`
- `ENV_PRIVATE_VOTER_LIMIT_DEFAULT` → `ENV_MAX_PRIVATE_POLL_VOTERS`
- `ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW` → `ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES`
- `ENV_SERVER_MAX_REFRESH_PER_SECOND` → `ENV_SERVER_MAX_REQUESTS_PER_SECOND` 
- `ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND` → `ENV_SERVER_MAX_REQUESTS_PER_INSTANCE_PER_SECOND`

Each would be a TWEAK03-style rename: code, configuration, docs and tests, with the old name refused at start-up.  

### RECOMMENDATION

Rename the eight settings exactly as TWEAK03 did, in the same set of files and with the same exclusions (other features' specs, `requirements/` feature documents, `architecture/`, `research/`, `prototypes/`).  

- **Code**: `src/config.ts` (the `intVar` calls and error messages) and the comments in `src/auth/auth.ts`, `src/polls/service.ts`, `src/polls/store.ts`, `src/public/liveResults.js` and `src/public/loginCard.js`.  
  - The internal field names (`maxIdleTimeMs` and the rest) and the `/api/config` keys stay, so the browser is untouched.  
- **Old names stop the app**: the eight join `RENAMED_VARS`.  
  - TWEAK03's entry for `ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL` is pointed at the final name, `ENV_POLL_EDIT_HEARTBEAT_INTERVAL`, so the error never names a setting that was itself renamed.  
- **Configuration**: `.do/app.yaml`, `launch.json.example`, `devScripts.example/launch-dev.ps1`, and the local `.vscode/launch.json` and `devScripts/launch-dev.ps1`.  
- **Docs**: `CLAUDE.md` (the table, and "eleven … settings renamed" becomes nineteen), `README.md`, the descriptions in `postman/openapi.json`, `devScripts/load/README.md` and `requirements/environmentVariablesGroups.md`.  
- **Feature artifacts**: `research.md` (its `ENV_MAX_IDLE_TIME` mention), a note on `plan.md`'s TWEAK03 line, and T047 in `tasks.md`.  
- **Tests**: rename in `tests/config.test.ts`, `client-home`, `client-m3-header`, `live-results`, `login-stay-duration`, `polls-admin-crud`, `polls-admin-participants`, `polls-vote`, `rate-limit` and `load-controller`.  
  - The existing "renamed setting" test in `tests/config.test.ts` is extended to the eight new old names.  
  - Run Tests is empty, so the run is postponed.  

Left alone: `.vscode/launch copy.json` (dated 2026-10-27).  
It is an older local copy that still holds the pre-TWEAK03 names, so the app already refuses to start from it.  
Delete it, or name it in your reply to have it renamed too.  

### ACCEPTED RECOMMENDATION

Accepted 2026-10-29 11:23: the recommendation, as written ("tweak06 apply recommendation").  
Tests were written but not run (`Run Tests` is empty); `npx tsc --noEmit` is clean.  

- `src/config.ts`: the eight names are renamed in the `intVar` calls and messages.  
  - The eight old names join `RENAMED_VARS`, so any of them still set stops the app, naming its replacement.  
  - TWEAK03's `ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL` now points at `ENV_POLL_EDIT_HEARTBEAT_INTERVAL`.  
  - Internal field names and the `/api/config` keys are unchanged.  
- Source comments: `src/auth/auth.ts`, `src/polls/service.ts`, `src/polls/store.ts`, `src/public/liveResults.js`, `src/public/loginCard.js`.  
- Configuration: `.do/app.yaml`, `launch.json.example`, `devScripts.example/launch-dev.ps1`, and the local `.vscode/launch.json` and `devScripts/launch-dev.ps1`; the two scripts parse and the JSON files load.  
- Docs: `CLAUDE.md` (the table, and "nineteen settings renamed (TWEAK03, TWEAK06)"), `README.md`, `postman/openapi.json` descriptions, `devScripts/load/README.md`, `requirements/environmentVariablesGroups.md`.  
- Feature artifacts: `research.md` (R6 rationale), `plan.md` (Constraints), `tasks.md` (T047 added as done).  
- Tests: renamed in ten files; the "renamed setting" test in `tests/config.test.ts` now covers all nineteen old names.  
- Not touched: `.vscode/launch copy.json` and the historical specs, requirements, architecture, research and prototypes folders.  

## TWEAK07 More Renaming
[X] Resolved  
[ ] Run Tests  

Question: Are there any interval environment variables the end with `SWEEP_INTERVAL' that are expecting "seconds" as their unit? 

### RECOMMENDATION

No: all eight `…_SWEEP_INTERVAL` settings are in milliseconds, read by `intVar` in `src/config.ts` into fields ending in `Ms`.  

- `ENV_BUDGET_CONTROLLER_SWEEP_INTERVAL` (1000), `ENV_COUNTER_FLUSH_SWEEP_INTERVAL` (10000), `ENV_INVITATION_SWEEP_INTERVAL` (30000), `ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL` (60000), `ENV_OUTBOX_DRAIN_SWEEP_INTERVAL` (15000), `ENV_POLL_APPROVAL_SWEEP_INTERVAL` (5000), `ENV_POLL_DATE_CHECK_SWEEP_INTERVAL` (60000), `ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL` (60000).  
- Every other interval, timeout and TTL is in milliseconds too.  
  The only other units are named in the variable: `ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES`, `ENV_BOOKMARK_EXPIRY_MONTHS`, and the `…_PER_SECOND` / `…_PER_MINUTE` / `…_PER_DAY` rates.  

One misleading line: `requirements/environmentVariablesGroups.md` group 10 calls the budget controller "(seconds — …)" and shedding "(milliseconds — …)".  
That describes how fast each layer reacts, not a unit, but it reads like one.  

Options:  

- **A** _(recommended)_ — reword that sentence to "reacts within seconds" / "within milliseconds"; nothing else changes.  
- **B** — no change; the answer above resolves the question.  

### ACCEPTED RECOMMENDATION

Accepted 2026-10-29 11:43: Option A.  
No code, configuration or test changed, so no tests apply.  

- `requirements/environmentVariablesGroups.md` group 10: the budget controller now "reacts within seconds" and per-instance shedding "reacts within milliseconds", so neither reads as a unit.  
- Every `…_SWEEP_INTERVAL` setting stays in milliseconds; no feature artifact needed a change.  

## TWEAK08 Rename Search Fallback Rate  
[X] Resolved  
[ ] Run Tests  
Apply renaming:
ENV_SERVER_MAX_SEARCH_PER_SECOND_FALLBACK → ENV_SERVER_MAX_SEARCH_FALLBACK_PER_SECOND

Each would be a TWEAK03-style rename: code, configuration, docs and tests, with the old name refused at start-up.  

### RECOMMENDATION

Rename `ENV_SERVER_MAX_SEARCH_PER_SECOND_FALLBACK` to `ENV_SERVER_MAX_SEARCH_FALLBACK_PER_SECOND` exactly as TWEAK06 did, with the same exclusions.  
The rate unit then ends the name, like every other `…_PER_SECOND` setting.  

- **Code**: `src/config.ts` (the `intVar` call); the field `serverMaxSearchPerSecondFallback` stays.  
- **Old name stops the app**: it joins `RENAMED_VARS`, and the "renamed setting" test in `tests/config.test.ts` gains it.  
- **Configuration**: `.do/app.yaml`, `launch.json.example`, `devScripts.example/launch-dev.ps1`, and the local `.vscode/launch.json` and `devScripts/launch-dev.ps1`.  
- **Docs**: `CLAUDE.md` (the table, and "nineteen settings renamed" becomes twenty, adding TWEAK08), `README.md`, `requirements/environmentVariablesGroups.md`.  
- **Feature artifacts**: `plan.md` (Constraints: twenty) and T048 in `tasks.md`.  
- Run Tests is empty, so the run is postponed.  

### ACCEPTED RECOMMENDATION

Accepted 2026-10-29 11:45: the recommendation, as written.  
Tests were written but not run (`Run Tests` is empty); `npx tsc --noEmit` is clean.  

- `src/config.ts`: reads `ENV_SERVER_MAX_SEARCH_FALLBACK_PER_SECOND`; the old name joins `RENAMED_VARS`, so it stops the app, naming the new one.  
- `tests/config.test.ts`: renamed, and the "renamed setting" test covers the old name.  
- Configuration: `.do/app.yaml`, `launch.json.example`, `devScripts.example/launch-dev.ps1`, and the local `.vscode/launch.json` and `devScripts/launch-dev.ps1`.  
- Docs: `CLAUDE.md` (the table, and "twenty settings renamed (TWEAK03, TWEAK06, TWEAK08)"), `README.md`, `requirements/environmentVariablesGroups.md`.  
- Feature artifacts: `plan.md` (Constraints), `tasks.md` (T048 added as done).  

## TWEAK09 Private Poll Voter Limit Name  
[X] Resolved  
[ ] Run Tests  

Would this rename better describe what it is?

ENV_PRIVATE_VOTER_LIMIT_DEFAULT -> ENV_MAX_PRIVATE_VOTER_PER_CREATOR_PER_POLL

If so, do the rename as a TWEAK03-style rename: code, configuration, docs and tests, with the old name refused at start-up.  

### RECOMMENDATION

Not quite: the limit is per poll, not per creator.  
`ENV_PRIVATE_VOTER_LIMIT_DEFAULT` was already renamed to `ENV_MAX_PRIVATE_POLL_VOTERS` by TWEAK06, so this tweak is about that name.  

What the setting is (`src/polls/service.ts`, `privateVoterLimit`): the most voters one private poll may have.  
It is both the limit a blank field means and the largest number the creator may enter.  
It is checked poll by poll; a creator with five private polls may have up to 100 voters on each.  
`PER_CREATOR` would suggest a total across a creator's polls, as `ENV_MAX_INVITATIONS_PER_DAY` is.  

Options:  

- **A** _(recommended)_ — rename `ENV_MAX_PRIVATE_POLL_VOTERS` to `ENV_MAX_VOTERS_PER_PRIVATE_POLL`.  
  It follows the `ENV_MAX_<thing>_PER_<scope>` pattern of `ENV_MAX_BOOKMARKS_PER_USER` and `ENV_MAX_LIVE_RESULTS_PER_USER`.  
  Done TWEAK08-style: both older names (`ENV_PRIVATE_VOTER_LIMIT_DEFAULT`, `ENV_MAX_PRIVATE_POLL_VOTERS`) refused at start-up, naming the new one; "twenty settings renamed" in `CLAUDE.md` and `plan.md` stays twenty, since the same setting is renamed again; T049 in `tasks.md`.  
- **B** — keep `ENV_MAX_PRIVATE_POLL_VOTERS`; no change.  
- **C** — rename to `ENV_MAX_PRIVATE_VOTER_PER_CREATOR_PER_POLL` as proposed.  
  Not recommended: `PER_CREATOR` misdescribes the limit.  

In every option the internal `privateVoterLimitDefault` field and the `/api/config` key stay, so the admin card is untouched.  

### ACCEPTED RECOMMENDATION

Accepted 2026-10-29 12:14: Option B.  
The setting keeps the name TWEAK06 gave it, `ENV_MAX_PRIVATE_POLL_VOTERS`.  
No file other than this one changed, so no tests apply.  

## TWEAK10 Email Rate Limit Window Name  
[X] Resolved  
[ ] Run Tests  

Rename:

ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW -> ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES

Do the rename as a TWEAK03-style rename: code, configuration, docs and tests, with the old name refused at start-up.  

### RECOMMENDATION

Nothing left to do: TWEAK06 already made this exact rename.  

- `ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES` is read by `src/config.ts` and used in `src/auth/auth.ts`, `.do/app.yaml`, both templates, both local launch files, `CLAUDE.md`, `README.md`, the groups document and `tests/rate-limit.test.ts`.  
- `ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW` remains only in `RENAMED_VARS` and in the "renamed setting" test, where it makes the app refuse to start, naming the new one.  

Recommendation: resolve it with no change.  

### ACCEPTED RECOMMENDATION

Accepted 2026-10-29 12:18: resolved with no change.  
The rename was already made by TWEAK06; no file other than this one changed, so no tests apply.  

## TWEAK11 Config Field Names Follow Settings  
[X] Resolved  
[ ] Run Tests  

Rename code variables based on the ENV variable names that are used to configure them.
Here are some example of the renaming convention.  
The current code variable is on the left, the rename after the arrow, and the ENV variable used is after the from:

    apiCallTimeoutMs -> screeningCallTimeout from  "ENV_SCREENING_CALL_TIMEOUT"
    pollApprovalPollingIntervalMs -> pollApprovalSweepInterval from ENV_POLL_APPROVAL_SWEEP_INTERVAL"),
    pollDateCheckPollingIntervalMs -> pollDateCheckSweepInterval from "ENV_POLL_DATE_CHECK_SWEEP_INTERVAL"
    pollEditUpdateHeartbeatIntervalMs -> pollEditHeartbeatInterval from "ENV_POLL_EDIT_HEARTBEAT_INTERVAL"
    pollAdminPageRefreshIntervalMs -> pollAdminPageRefreshInterval from "ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL"
    privateVoterLimitDefault -> maxPrivatePollVoters from ENV_MAX_PRIVATE_POLL_VOTERS


This convention ensures that code variables clearly reflect the corresponding environment variable names, making the configuration more intuitive and maintainable.  

### RECOMMENDATION

Rename the `AppConfig` fields in `src/config.ts` whose words differ from their setting, so each field is the setting's name without `ENV_`, in camelCase.  
Keep the `Ms` suffix on millisecond fields: the settings leave the unit out because every interval is in milliseconds, but in code `Ms` is the project's convention (`nextRefreshMs`, `listingMaxAgeMs`, `trendingMaxAgeMs`) and stops a value being read as seconds.  
That differs from the examples, which drop `Ms`; option B follows them exactly.  

The eighteen renames (field ← setting):  

- `signinCookieDurationMaxMs` → `maxSigninCookieDurationMs` (`ENV_MAX_SIGNIN_COOKIE_DURATION`)  
- `authSecret` → `betterAuthSecret` (`ENV_BETTER_AUTH_SECRET`)  
- `apiCallTimeoutMs` → `screeningCallTimeoutMs`  
- `pollApprovalPollingIntervalMs` → `pollApprovalSweepIntervalMs`  
- `pollDateCheckPollingIntervalMs` → `pollDateCheckSweepIntervalMs`  
- `pollEditUpdateHeartbeatIntervalMs` → `pollEditHeartbeatIntervalMs`  
- `emailRateLimitMaxRequests` → `emailRateLimitMaxRequestsPerWindow`  
- `privateVoterLimitDefault` → `maxPrivatePollVoters`  
- `trendingRecomputeIntervalMs` → `trendingPollsRecomputeSweepIntervalMs`  
- `newestRecomputeIntervalMs` → `newestPollsRecomputeSweepIntervalMs`  
- `maxIdleTimeMs` → `liveResultsMaxIdleTimeMs`  
- `serverMaxRefreshPerInstancePerSecond` → `serverMaxRequestsPerInstancePerSecond`  
- `serverMaxRefreshPerSecond` → `serverMaxRequestsPerSecond`  
- `serverMaxSearchPerSecondFallback` → `serverMaxSearchFallbackPerSecond`  
- `budgetControllerIntervalMs` → `budgetControllerSweepIntervalMs`  
- `maxStretch` → `maxRefreshAndSearchStretch`  
- `counterFlushIntervalMs` → `counterFlushSweepIntervalMs`  
- `outboxDrainIntervalMs` → `outboxDrainSweepIntervalMs`  

Already matching, unchanged: `pollAdminPageRefreshIntervalMs`, `invitationSweepIntervalMs`, `emailRateLimitWindowMinutes`, `maxInvitationsPerDay` and the rest.  
Left as they are because they are grouped or derived, not one setting each: `floors`, `bursts`, `smtp`, `ses`, `spaces`, `oauthProviders`, `nativeSignin`, `oauthSignin`, `allowedEmailKeys`, `staySignedInDefault`.  

The `/api/config` response keeps its keys (`signinCookieDurationMaxMs`, `trendingRecomputeIntervalMs`, `newestRecomputeIntervalMs`, `maxIdleTimeMs`, `privateVoterLimitDefault`, `pollAdminPageRefreshIntervalMs`).  
They are a published contract (`postman/openapi.json`, `contracts/api.md`) read by the browser scripts; `src/routes/api.ts` maps each renamed field onto its old key.  
So no browser script, contract or client test changes.  

Scope: about 25 source files under `src/` (no `src/public/`) and about 20 test files, by a whole-word rename; `npx tsc --noEmit` catches any miss.  
Feature artifacts: `research.md`/`plan.md` where they name a renamed field, and T049 in `tasks.md`.  
Run Tests is empty, so the run is postponed; this touches many files, so ticking it is worth considering.  

Options:  

- **A** _(recommended)_ — the eighteen renames above, `Ms` kept, `/api/config` keys unchanged.  
- **B** — as the examples: A, and drop `Ms` from every field (`sessionCacheTtlMs` → `sessionCacheTtl`, `shedRetryAfterMs` → `shedRetryAfter`, `pollAdminPageRefreshIntervalMs` → `pollAdminPageRefreshInterval`, about 26 fields).  
- **C** — A, plus rename the six `/api/config` keys to match, with the browser scripts, `postman/openapi.json`, `contracts/api.md` and the client tests.  

### ACCEPTED RECOMMENDATION

Accepted 2026-10-29 12:27: Option C.  
Tests were updated but not run (`Run Tests` is empty); `npx tsc --noEmit` is clean and `postman/openapi.json` parses.  

- The eighteen `AppConfig` fields are renamed as listed in the recommendation, `Ms` kept, by a whole-word rename; no old name remains outside the historical folders.  
- The six `/api/config` keys follow them: `maxSigninCookieDurationMs`, `trendingPollsRecomputeSweepIntervalMs`, `newestPollsRecomputeSweepIntervalMs`, `liveResultsMaxIdleTimeMs`, `maxPrivatePollVoters`, and `pollAdminPageRefreshIntervalMs` (unchanged, it already matched).  
- Server: `src/config.ts`, `src/server.ts`, `src/auth/auth.ts`, `src/invitations/invitations.ts`, `src/live/registry.ts`, `src/load/budget.ts`, `src/load/controller.ts`, `src/polls/service.ts`, `src/polls/sweeps.ts`, `src/routes/api.ts`, `src/routes/pollsApi.ts`, `src/routes/tabsApi.ts`, `src/votes/votePath.ts`.  
- Browser: `src/public/adminCard.js`, `liveResults.js`, `loginCard.js`, `newest.js`, `trending.js` read the new keys.  
  A page still open from before the deploy holds old scripts and falls back to its built-in defaults (60 s listings, 30 min idle, the admin card's voter limit) until reloaded; the login card just leaves out the stay-signed-in duration.  
- Contracts: `postman/openapi.json`, `contracts/api.md`.  
- Tests: thirteen files, including `tests/helpers/setup.ts` and `tests/openapi-contract.test.ts`.  
- `tasks.md`: T049 added as done.  
- Not touched: other features' specs and requirements, which keep the old names as history.  

## TWEAK12 Settings Match Their Defaults  
[X] Resolved  
[ ] Run Tests  

Update (if necessary) each environment variable to reflect its default value, in the following files:
- `.vscode\launch.json`
- `devScripts\launch-dev.ps1`
- `devScripts.example\launch-dev.ps1`
- `.do\app.yaml`
 
And any other file that mentions the default if it isn't already correct.  

### RECOMMENDATION

I compared every value in the four files (and `launch.json.example`, `CLAUDE.md`, `README.md`) with the default in `src/config.ts`.  
`CLAUDE.md` and `README.md` already state every default correctly; the 45 or so sweep, floor, cap and load values match everywhere.  
What differs:  

- **Deliberate development settings**, explained by comments in the scripts:  
  - `ENV_PORT`: 8081 in the template script, 8080 elsewhere (default 8080).  
  - `ENV_STAY_SIGNED_IN`: 1 in both scripts and `.vscode/launch.json` (default 0).  
  - `ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES` / `…_MAX_REQUESTS_PER_WINDOW`: 5 / 10 in the template script, 1 / 50 in `launch.json.example` and both local files (default 15 / 2).  
  - `ENV_MAX_PRIVATE_POLL_VOTERS`: 10 in both templates and the local script (default 100).  
- **Undocumented differences**:  
  - `.vscode/launch.json`: `ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL` 2000 (default 5000).  
  - `.do/app.yaml`: `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW` 5 (default 2); production is looser than the documented default.  
- **Missing**:  
  - `launch.json.example` and `.vscode/launch.json` lack `ENV_EMAIL_SEND_TIMEOUT`; `launch.json.example` also lacks `ENV_STAY_SIGNED_IN`.  
  - `.do/app.yaml` lacks `ENV_EMAIL_SEND_TIMEOUT`, `ENV_MAX_INVITATIONS_PER_DAY` and `ENV_STAY_SIGNED_IN`.  

Options:  

- **A** _(recommended)_ — defaults everywhere, keeping the development settings on purpose:  
  - Keep the port, stay-signed-in, email rate limit and private voter limit overrides in the development files.  
    In the scripts each such line gets `# default N`.  
    The two templates agree on the rate limit (5 / 10).  
    The local files keep your own values.  
  - `.vscode/launch.json`: `ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL` → 5000.  
  - `.do/app.yaml`: `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW` → 2.  
  - Add the missing settings at their defaults: `ENV_EMAIL_SEND_TIMEOUT` 10000, `ENV_MAX_INVITATIONS_PER_DAY` 200, `ENV_STAY_SIGNED_IN` 0 in `.do/app.yaml`, and the missing lines in every configuration of the two launch files.  
- **B** — as A, but leave production's 5 requests per window and make 5 the code default instead, with `CLAUDE.md`, `README.md` and the test that checks it.  
- **C** — literally every value at its default, the development overrides included (port 8080, stay-signed-in off, 15 min / 2 requests, 100 voters).  
  Not recommended: the scripts' comments say those are loosened so sign-in and private polls can be tested.  

The launch files take no comments, since tests read them as JSON.  
Run Tests is empty, so no run; `tests/config.test.ts` reads these files, and its SES and sender lines do not change.  

### ACCEPTED RECOMMENDATION

Accepted 2026-10-29 13:04: Option A.  
Tests were not run (`Run Tests` is empty); no code or test changed.  
A re-run of the comparison finds only the deliberate development overrides left.  

- `.do/app.yaml`: `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW` 5 → 2.  
  It adds `ENV_STAY_SIGNED_IN` (0), `ENV_EMAIL_SEND_TIMEOUT` (10000) and `ENV_MAX_INVITATIONS_PER_DAY` (200).  
- `launch.json.example` (all seven configurations): the email rate limit is 5 min / 10 requests, as in the template script (was 1 / 50).  
  It adds `ENV_STAY_SIGNED_IN` (1, the development override the template script has) and `ENV_EMAIL_SEND_TIMEOUT` (10000).  
- `devScripts.example/launch-dev.ps1`: `# default N` after the port, stay-signed-in, rate limit and private voter limit lines.  
- `.vscode/launch.json` (local): `ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL` 2000 → 5000; adds `ENV_EMAIL_SEND_TIMEOUT`; your rate limit and stay-signed-in values kept.  
- `devScripts/launch-dev.ps1` (local): `# default N` on its override lines; values kept.  
- `CLAUDE.md` and `README.md` already gave every default correctly; unchanged.  
- `tasks.md`: T050 added as done.  

Both scripts parse, and both launch files load (the local one has your `//` comment lines, which VS Code accepts).  

## TWEAK13 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  
