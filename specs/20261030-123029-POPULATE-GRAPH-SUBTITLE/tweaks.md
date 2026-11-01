# Overview: `specs/20261030-123029-POPULATE-GRAPH-SUBTITLE`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261030-123029-POPULATE-GRAPH-SUBTITLE` |
| Tweak file created | 2026-10-30 15:05 |
| Last updated | 2026-10-31 12:58 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Rename Input Key To Subtitle  
[X] Resolved  
[ ] Run Tests  

Change the name of the field in the input JSON from:
"graph_subtitle" to "subtitle".

"graph_subtitle" is no longer supported.
If "subtitle" is not found that is an error logged to the console.

### RECOMMENDATION

- `devScripts/populate/populate-poll.ts`: `parsePollData` reads the key `subtitle` instead of `graph_subtitle`;  
  the helper `optionalText` becomes `boundedText`, which throws `InputError` `"subtitle" is missing` when the key is absent.  
  `""` is still accepted and means no subtitle;
  the non-text and over-30 errors keep their wording with the new key name.  
  A leftover `graph_subtitle` key is ignored (no longer read), so a file with only it fails as missing `subtitle`.
- `tests/fixtures/populate-poll.json`: `"graph_subtitle"` → `"subtitle"`.
- `tests/populate-poll.test.ts`:
  - the absent-key parse test becomes "refuses a file with no subtitle" (`"subtitle" is missing`), plus a C4 table row;
  - `""` still parses to an empty subtitle;
  - the rerun-clears test clears with `"subtitle": ""` instead of deleting the key;
  - every other `graph_subtitle` reference is renamed.
- `devScripts/populate/README.md`: the key row reads `subtitle`, required (`""` for none).
- Artifacts: `spec.md` (FR-001–FR-003, US2, edge cases), `contracts/cli.md`, `data-model.md`, `research.md`, `quickstart.md`, `plan.md`, `tasks.md` (new task T0xx), and the `CLAUDE.md` bullet, renamed and made required.
- The git-ignored `polldata/*.json` files (5 of them) still say `graph_subtitle` and are left for hand correction, as NC2 decided.
- Tests written but not run (Run Tests not ticked).

2026-10-30 15:08

### ACCEPTED RECOMMENDATION

- `devScripts/populate/populate-poll.ts`: `optionalText` → `boundedText`, which throws `"<key>" is missing` on an absent key;  
  `parsePollData` reads `subtitle` (`graph_subtitle` is no longer read).
- `tests/fixtures/populate-poll.json`: `"graph_subtitle"` → `"subtitle"`.
- `tests/populate-poll.test.ts`:
  - new "refuses a file with no subtitle, even with a graph_subtitle";
  - "parses an empty subtitle as an empty subtitle" replaces the absent-or-empty test;
  - the rerun test clears with `"subtitle": ""`;
  - input-error table gains "missing subtitle", and the text/length rows are renamed.
- `devScripts/populate/README.md`: the key row reads `subtitle`, `""` for none.
- Tests postponed (Run Tests not ticked);
  the tests above are written but not run, so the tweak is unverified by a run.  
  `npx tsc --noEmit` passes.
- Artifacts: `spec.md` (US2 rewritten, edge cases, FR-001–FR-003, FR-005, FR-007, SC-002, SC-004), `contracts/cli.md` (C1, C2 row), `data-model.md`, `research.md` (R2, R5), `plan.md`, `quickstart.md` (§3, §4, §5), `tasks.md` (US2 test line, T015 added), `CLAUDE.md` (plan summary and bullet).
- The requirement changed: the key is now required, not optional.  
  `requirements/20261030-123029-populate-graph-subtitle/requirements.md` may need the same change; it was not edited.
- The five git-ignored `polldata/*.json` files still say `graph_subtitle` and must be renamed by hand.

2026-10-30 15:09

## TWEAK02 Rename Creator Email Key  
[X] Resolved  
[ ] Run Tests  

Change the name of the field in the input JSON from:
"poll creator email" to "poll_creator_email".

-"poll creator email" is no longer supported.
If "poll_creator_email" is not found that is an error logged to the console.

### RECOMMENDATION

- `devScripts/populate/populate-poll.ts`: `parsePollData` reads `requiredText(file, "poll_creator_email")`;  
  the existing helper already refuses an absent or empty key with `"poll_creator_email" is missing or empty`, one `[populate] Error:` line and exit 1.  
  The old `poll creator email` key is no longer read, so a file with only it fails the same way.
- `tests/fixtures/populate-poll.json` and `tests/populate-poll.test.ts`: every `"poll creator email"` → `"poll_creator_email"`;  
  the input-error table gains a row "the old poll creator email key" (old key set, new key absent → `"poll_creator_email" is missing or empty`).
- `devScripts/populate/README.md`: the key row reads `poll_creator_email`.
- Artifacts: this feature's `spec.md`, `data-model.md`, `research.md`, `quickstart.md`, `tasks.md` (T016 added) name the key `poll_creator_email`;  
  the preceding feature's documents (`specs/20261026-152737-POPULATE-TEST-POLL/`) are history and are left as they are.
- The two git-ignored `polldata/*.json` files that still use `poll creator email` are renamed by hand.
- Tests written but not run (Run Tests not ticked).

2026-10-30 15:12

### ACCEPTED RECOMMENDATION

- `devScripts/populate/populate-poll.ts`: `parsePollData` reads `requiredText(file, "poll_creator_email")`;  
  an absent or empty key is `"poll_creator_email" is missing or empty`, and `poll creator email` is no longer read.
- `tests/fixtures/populate-poll.json`: the key renamed.
- `tests/populate-poll.test.ts`:
  - every `"poll creator email"` key and error regex renamed;
  - input-error table gains "the old poll creator email key" (old key only → refused).
- `devScripts/populate/README.md`: the key row reads `poll_creator_email`.
- Tests postponed (Run Tests not ticked);
  the tests above are written but not run, so the tweak is unverified by a run.  
  `npx tsc --noEmit` passes.
- Artifacts: `spec.md` (FR-010 added, Key Entities), `data-model.md`, `research.md` (R6), `quickstart.md`, `tasks.md` (T011 wording, T016 added).
- The requirement changed: the input format's creator key is renamed.  
  The preceding feature's documents (`specs/20261026-152737-POPULATE-TEST-POLL/`) and requirements still name `poll creator email` and were not edited.
- The two git-ignored `polldata/*.json` files that use `poll creator email` must be renamed by hand.

2026-10-30 15:37

## TWEAK03 NODE_ENV DevDependencies Pruning Notice  
[X] Resolved  
[ ] Run Tests  
When deploying to Digi8tal Ocean, the log shows this:
```
Oct 31 02:24:34  [34m│[0m -----> Pruning devDependencies
Oct 31 02:24:34  [34m│[0m        Skipping because NODE_ENV is not 'production'
```

Is this something we need to correct?

### RECOMMENDATION

Findings:

- The message comes from the `node-js` buildpack: it removes devDependencies after the build only when `NODE_ENV` is `production`;
  `.do/app.yaml` never sets `NODE_ENV`, so nothing is removed.
- No code in `src/` reads `NODE_ENV`;
  `src/server.ts:129` has its own error handler, so Express's development mode leaks no stack traces;
  BetterAuth's server code does not read it either.
- The only cost is size: devDependencies (`@embedded-postgres` alone is 99 MB of the 240 MB `node_modules`, plus `typescript`, `vitest`, `jsdom`) ship in the runtime image, so each new autoscaled instance pulls a bigger image.
- Removing them has side effects:
  `npm ci` in `build_command` would also skip devDependencies under `NODE_ENV=production`, so `tsc` would be missing and the build would fail without `--include=dev`;
  and `npm run reconcile` (operator use, run with `tsx`, a devDependency) would no longer work from the App Platform console.

Option A — prune: in `.do/app.yaml`, add `NODE_ENV=production` with scope `RUN_AND_BUILD_TIME`, change `build_command` to `npm ci --include=dev && npm run build && npm run publish-assets`, and move `tsx` to `dependencies` so `npm run reconcile` keeps working.

- Pros: a runtime image smaller by roughly 150 MB, so autoscaled instances start sooner; the buildpack does what it was built to do.
- Cons: three coordinated changes that can only be tested by a real App Platform build, which you start by hand;
  if `--include=dev` is forgotten the build breaks.
- Tests: a test in the suite that checks `.do/app.yaml` (beside the `ses` check) that `NODE_ENV` is `production` with `RUN_AND_BUILD_TIME` and that `build_command` has `npm ci --include=dev`.

Option B — accept as-is: change nothing.

- Pros: no risk; behaviour is correct today, because no code depends on `NODE_ENV`.
- Cons: the larger image stays.

Recommended: **B**.
The notice is informational, not an error, and nothing behaves wrongly.
Choose A if instance start-up time during scale-out matters to you.

2026-10-30 22:27

### ACCEPTED RECOMMENDATION

Option A, chosen by the developer.

- `.do/app.yaml`:
  - new env `NODE_ENV` = `production`, scope `RUN_AND_BUILD_TIME`, first in `envs`;
  - `build_command` is `npm ci --include=dev && npm run build && npm run publish-assets`.
- `package.json` / `package-lock.json`: `tsx` moved from `devDependencies` to `dependencies` (lock file synced with `npm install --package-lock-only`), so `npm run reconcile` still works from the console after pruning.
- `tests/config.test.ts`: new "prunes devDependencies after the build in the deployment spec, keeping tsx".
- `README.md` (root): the deploy line names the new build command and the pruning.
- Tests postponed (Run Tests not ticked);
  the test above is written but not run, so the tweak is unverified by a run.  
  `npx tsc --noEmit` passes.
- Not verifiable locally: the next App Platform build should log `Pruning devDependencies` without the skip notice, and the app should start as before.
- Artifacts: `tasks.md` (T017 added);
  the feature's spec, plan and contracts do not cover deployment, so none changed.
- `.do/app.yaml` is the spec App Platform applies only when it is uploaded or synced;
  if the live app's spec is edited in the console, add `NODE_ENV` and the build command there too.

2026-10-30 22:29

## TWEAK04 Confirm tsx Placement In package.json  
[X] Resolved  
[ ] Run Tests  
Here is what was in package.json.
Does this have tsx in the correct place?
```json
  "dependencies": {
    "@aws-sdk/client-s3": "3.1135.0",
    "@aws-sdk/client-sesv2": "3.1135.0",
    "@opensearch-project/opensearch": "3.6.0",
    "better-auth": "^1.3.0",
    "compression": "1.8.2",
    "express": "^5.1.0",
    "iovalkey": "0.4.0",
    "kysely": "0.29.6",
    "nodemailer": "^7.0.0",
    "pg": "8.23.0",
    "tsx": "^4.19.0"
  },
  "devDependencies": {
    "@types/compression": "1.8.1",
    "@types/express": "^5.0.0",
    "@types/node": "^22.15.0",
    "@types/nodemailer": "^7.0.0",
    "@types/pg": "8.23.1",
    "@types/supertest": "^6.0.0",
    "embedded-postgres": "16.14.0-beta.17",
    "jsdom": "30.1.0",
    "supertest": "^7.1.0",
    "typescript": "^5.8.0",
    "vitest": "^3.2.0"
  }
  ```

### RECOMMENDATION

Yes, `tsx` is in the right place: under `dependencies`, and no longer under `devDependencies`.

- With `NODE_ENV=production` the buildpack prunes `devDependencies` after the build (TWEAK03);
  `npm run reconcile` and the other `tsx` scripts run from the App Platform console need `tsx` at run time, so it must be a dependency.
- The build still has it either way (`npm ci --include=dev`), so `npm run build` and `npm run publish-assets` are unaffected.
- `package-lock.json` agrees: `node_modules/tsx` and its `esbuild` are no longer marked `dev`, so pruning keeps them.
- No change needed;
  the TWEAK03 test in `tests/config.test.ts` already asserts `dependencies.tsx`.

2026-10-30 22:31

### ACCEPTED RECOMMENDATION

- No code, test or artifact change: the `package.json` shown is correct, checked against `package.json` and `package-lock.json` on disk.
- Covered by the existing test "prunes devDependencies after the build in the deployment spec, keeping tsx" (`tests/config.test.ts`);
  tests postponed (Run Tests not ticked), not run.

2026-10-30 22:31

## TWEAK05 Production Build Fails With tsc Not Found  
[-] Resolved (manually)  
[ ] Run Tests  


Oct 31 02:39:18  [34m│[0m > tsc && tsx devScripts/build-assets.ts
Oct 31 02:39:18  [34m│[0m 
Oct 31 02:39:18  [34m│[0m sh: 1: tsc: not found
Oct 31 02:39:18  [34m│[0m building: exit status 127
Oct 31 02:39:18  [34m│[0m Timer: Builder ran for 24.270426364s and ended at 2026-10-31T02:39:18Z
Oct 31 02:39:18  [34m│[0m [31;1mERROR: [0mfailed to build: exit status 1
Oct 31 02:39:18  [34m│[0m 
Oct 31 02:39:18  [34m│[0m 
Oct 31 02:39:18  [34m│[0m [31m ✘ build failed[0m

### CLARIFICATIONS

Likely cause: TWEAK03's changes are not committed or pushed (`git status` shows `.do/app.yaml` and `package.json` modified, and `origin/main` is still `c591952`).  
App Platform builds from GitHub `main` with the build command saved in the console's app spec, not the local `.do/app.yaml`.  
If `NODE_ENV=production` was added in the console while the build command there is still `npm ci && npm run build && npm run publish-assets`, that `npm ci` skips devDependencies, so `tsc` is missing.  
`npm ci --include=dev` installs them even under `NODE_ENV=production`.

1. In the console (Settings → the web component → Commands → Build Command), what does the build command say now: `npm ci && …` or `npm ci --include=dev && …`?
2. Where did `NODE_ENV=production` come from: added by hand in the console, or by uploading `.do/app.yaml` (which would also have changed the build command)?
3. Earlier in the same build log, the line that starts the custom build command (e.g. `Running custom build command: …`) shows exactly what ran.  
   Please paste it if it's easy to find.

Depending on the answers, the fix is one of:  
- set the console build command to `npm ci --include=dev && npm run build && npm run publish-assets` and commit and push TWEAK03's `package.json`/`package-lock.json` (so `tsx` survives pruning), then rebuild; or  
- if you want production working again right away, remove `NODE_ENV` in the console and rebuild, and come back to TWEAK03 later.

2026-10-30 22:41

Update: commit `114700e` ("buidl fix", pushed to `origin/main` at 2026-10-30 22:41) carries TWEAK03's `package.json`, `package-lock.json` and `.do/app.yaml`, so the repository side is done and needs no further change.  
Still open: questions 1 and 3 above.  
The console's build command decides what runs, and a rebuild from `114700e` has to show whether `tsc` is found.

4. After setting the console build command to `npm ci --include=dev && npm run build && npm run publish-assets`, did a rebuild from `114700e` succeed?  
   Answer "it builds" (then "I resolved it" records it) or paste the new failing log.

2026-10-31 12:46

### ACCEPTED RECOMMENDATION

- Detected in the repository: commit `114700e` ("buidl fix"), on `origin/main`, carries TWEAK03's changes;
  `.do/app.yaml` builds with `npm ci --include=dev && npm run build && npm run publish-assets` and sets `NODE_ENV=production`;
  `tsx` is in `dependencies` in `package.json` and `package-lock.json`.  
  Nothing has changed in the working tree since.
- Not visible from here: the App Platform console's build command and the rebuild.  
  The developer reports the tweak resolved, which means the console build command was brought in line with `.do/app.yaml` and the build now finds `tsc`.
- Tests: none run (Run Tests not ticked);
  the existing `tests/config.test.ts` test "prunes devDependencies after the build in the deployment spec, keeping tsx" covers the spec side;
  no new test, since the console setting cannot be tested in the repository.
- Artifacts: none needed;
  `tasks.md` T017 and the root `README.md` deploy line already describe the build command.

2026-10-31 12:47

## TWEAK06 Build Still Fails After Push  
[X] Resolved  
[ ] Run Tests  

We are still getting the build error on Digital Ocean.  
The log below shows that the commit `114700e` is being checked out, but the build still fails on Digital Ocean.  


```text
Oct 31 02:41:58  [34m╭────────────[34m[30m[44m git repo clone [0m[0m[34m───────────╼[0m
Oct 31 02:41:58  [34m│[0m [34m › fetching app source code[0m
Oct 31 02:41:58  [34m│[0m => Selecting branch "main"
Oct 31 02:41:59  [34m│[0m => Checking out commit "114700edc1e8d4f6ac0b7fd5f8a95603dd84b879"
Oct 31 02:42:00  [34m│[0m 
Oct 31 02:42:00  [34m│[0m [32m ✔ cloned repo to [35m/workspace[0m[0m
Oct 31 02:42:00  [34m╰────────────────────────────────────────╼[0m
Oct 31 02:42:00  
Oct 31 02:42:00  [34m › configuring build-time app environment variables:[0m
Oct 31 02:42:00       ENV_MIN_MANUAL_REFRESH_INTERVAL ENV_OUTBOX_DRAIN_SWEEP_INTERVAL ENV_MANUAL_REFRESH_BURST ENV_BUDGET_LOWER_THRESHOLD_PERCENT ENV_MAX_NEWEST_POLLS ENV_POLL_EDIT_HEARTBEAT_INTERVAL ENV_MIN_SEARCH_REFRESH_INTERVAL ENV_PRIVATE_VOTER_LIMIT_DEFAULT ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW ENV_SESSION_CACHE_TTL ENV_INSTANCE_MAX_EVENT_LOOP_LAG ENV_VOTE_BATCH_SIZE ENV_PAGE_LOADS_PER_MINUTE ENV_SERVER_MAX_REFRESH_PER_SECOND ENV_SIGNIN_COOKIE_DURATION_MAX ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS ENV_BOOKMARK_EXPIRY_MONTHS ENV_SEARCH_CACHE_TTL ENV_SIGNIN_METHOD ENV_POLL_DATE_CHECK_SWEEP_INTERVAL ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL ENV_SES_REGION ENV_ADMINS ENV_TRE0NDING_POLLS_RECOMPUTE_SWEEP_INTERVAL ENV_SERVER_MAX_SEARCH_PER_SECOND_FALLBACK ENV_SEARCH_BURST ENV_VOTE_QUEUE_LAG_NOTICE ENV_PROTOTYPES NODE_ENV ENV_COUNTER_FLUSH_SWEEP_INTERVAL ENV_SPACES_CDN_URL ENV_MAX_BOOKMARKS_PER_USER ENV_MIN_LIVE_REFRESH_INTERVAL ENV_SPACES_SECRET ENV_BETTER_AUTH_SECRET ENV_BUDGET_CONTROLLER_SWEEP_INTERVAL ENV_MAX_POLLS_SEARCH_RESULTS ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW ENV_EMAIL_FROM ENV_PUBLIC_ORIGIN ENV_MAX_INVITATIONS_PER_DAY ENV_SPACES_REGION ENV_MAX_CHOICES ENV_MAX_IDLE_TIME ENV_MAX_REFRESH_AND_SEARCH_STRETCH ENV_MIN_VOTE_REFRESH_INTERVAL ENV_INSTANCE_MAX_INFLIGHT ENV_MAX_TRENDING_POLLS ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL ENV_SPACES_BUCKET ENV_MAX_LIVE_RESULTS_PER_USER ENV_SHED_RETRY_AFTER ENV_API_CALL_TIMEOUT ENV_MIN_CHOICES ENV_SERVER_MAX_SEARCH_PER_SECOND ENV_POLL_APPROVAL_SWEEP_INTERVAL ENV_SPACES_KEY ENV_PARTICIPANTS_VIEWPORT_SIZE ENV_MAX_VOTES_PER_IP_PER_MINUTE ENV_PORT
Oct 31 02:42:00  
Oct 31 02:42:00  [34m › configuring custom build command to be run at the end of the build:[0m
Oct 31 02:42:00     [34m│[0m npm ci && npm run build && npm run publish-assets
Oct 31 02:42:00  
Oct 31 02:42:00  [34m╭────────────[34m[30m[44m buildpack detection [0m[0m[34m───────────╼[0m
Oct 31 02:42:00  [34m│[0m [34m › using Ubuntu 22.04 stack[0m
Oct 31 02:42:02  [34m│[0m Detected the following buildpacks suitable to build your app:
Oct 31 02:42:02  [34m│[0m 
Oct 31 02:42:02  [34m│[0m    digitalocean/nodejs-appdetect  v0.1.2    
Oct 31 02:42:02  [34m│[0m    heroku/nodejs                  v0.375.5  (Node.js)
Oct 31 02:42:02  [34m│[0m    digitalocean/procfile          v0.1.0    (Procfile)
Oct 31 02:42:02  [34m│[0m    digitalocean/custom            v0.2.0    (Custom Build Command)
Oct 31 02:42:02  [34m╰─────────────────────────────────────────────╼[0m
Oct 31 02:42:02  
Oct 31 02:42:02  [34m╭────────────[34m[30m[44m build caching [0m[0m[34m───────────╼[0m
Oct 31 02:42:02  [34m│[0m [34m › checking for cache from a previous build[0m
Oct 31 02:42:02  [34m│[0m Timer: Analyzer started at 2026-10-31T02:42:02Z
Oct 31 02:42:04  [34m│[0m Restoring metadata for "heroku/nodejs:shim" from cache
Oct 31 02:42:04  [34m│[0m Timer: Analyzer ran for 1.31463489s and ended at 2026-10-31T02:42:03Z
Oct 31 02:42:04  [34m│[0m Timer: Restorer started at 2026-10-31T02:42:04Z
Oct 31 02:42:04  [34m│[0m Restoring data for "heroku/nodejs:shim" from cache
Oct 31 02:42:05  [34m│[0m Timer: Restorer ran for 1.119913637s and ended at 2026-10-31T02:42:05Z
Oct 31 02:42:05  [34m╰───────────────────────────────────────╼[0m
Oct 31 02:42:05  
Oct 31 02:42:05  [34m╭────────────[34m[30m[44m app build [0m[0m[34m───────────╼[0m
Oct 31 02:42:05  [34m│[0m Timer: Builder started at 2026-10-31T02:42:05Z
Oct 31 02:42:05  [34m│[0m 
Oct 31 02:42:05  [34m│[0m -----> Creating runtime environment
Oct 31 02:42:06  [34m│[0m        
Oct 31 02:42:06  [34m│[0m        NPM_CONFIG_LOGLEVEL=error
Oct 31 02:42:06  [34m│[0m        NODE_VERBOSE=false
Oct 31 02:42:06  [34m│[0m        NODE_ENV=production
Oct 31 02:42:06  [34m│[0m        NODE_MODULES_CACHE=true
Oct 31 02:42:06  [34m│[0m 
Oct 31 02:42:06  [34m│[0m -----> Installing binaries
Oct 31 02:42:06  [34m│[0m        engines.node (package.json):   >=22
Oct 31 02:42:06  [34m│[0m        engines.npm (package.json):    unspecified (use default)
Oct 31 02:42:06  [34m│[0m 
Oct 31 02:42:06  [34m│[0m        Resolving node version >=22...
Oct 31 02:42:06  [34m│[0m 
Oct 31 02:42:06  [34m│[0m [1;33m !     The requested Node.js version is using a wide range (>=22) that can resolve to a Node.js major version[0m
Oct 31 02:42:06  [34m│[0m [1;33m !     higher than you intended. Limiting the requested range to a major LTS range like `24.x` is recommended.[0m
Oct 31 02:42:06  [34m│[0m [1;33m !     https://devcenter.heroku.com/articles/nodejs-support#specifying-a-node-js-version[0m
Oct 31 02:42:06  [34m│[0m 
Oct 31 02:42:06  [34m│[0m 
Oct 31 02:42:06  [34m│[0m [1;33m !     The resolved Node.js version has been limited to the Active LTS (24.22.1) for the requested range of `>=22`.[0m
Oct 31 02:42:06  [34m│[0m [1;33m !     To opt-out of this behavior, set the following config var: `NODEJS_ALLOW_WIDE_RANGE=true`[0m
Oct 31 02:42:06  [34m│[0m [1;33m !     https://devcenter.heroku.com/articles/nodejs-support#supported-node-js-versions[0m
Oct 31 02:42:06  [34m│[0m 
Oct 31 02:42:06  [34m│[0m        Downloading and installing node 24.22.1...
Oct 31 02:42:07  [34m│[0m        Validating checksum
Oct 31 02:42:09  [34m│[0m        Using default npm version: 11.19.1
Oct 31 02:42:10  [34m│[0m 
Oct 31 02:42:10  [34m│[0m -----> Restoring cache
Oct 31 02:42:10  [34m│[0m        - npm cache
Oct 31 02:42:10  [34m│[0m 
Oct 31 02:42:10  [34m│[0m -----> Installing dependencies
Oct 31 02:42:11  [34m│[0m        Installing node modules
Oct 31 02:42:20  [34m│[0m        
Oct 31 02:42:20  [34m│[0m        added 284 packages in 9s
Oct 31 02:42:20  [34m│[0m 
Oct 31 02:42:20  [34m│[0m -----> Build
Oct 31 02:42:20  [34m│[0m 
Oct 31 02:42:20  [34m│[0m -----> Caching build
Oct 31 02:42:20  [34m│[0m        - npm cache
Oct 31 02:42:20  [34m│[0m 
Oct 31 02:42:20  [34m│[0m -----> Pruning devDependencies
Oct 31 02:42:21  [34m│[0m        
Oct 31 02:42:21  [34m│[0m        removed 40 packages in 672ms
Oct 31 02:42:21  [34m│[0m        npm notice
Oct 31 02:42:21  [34m│[0m        npm notice New major version of npm available! 11.19.1 -> 12.2.1
Oct 31 02:42:21  [34m│[0m        npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.2.1
Oct 31 02:42:21  [34m│[0m        npm notice To update run: npm install -g npm@12.2.1
Oct 31 02:42:21  [34m│[0m        npm notice
Oct 31 02:42:21  [34m│[0m Running custom build command: npm ci && npm run build && npm run publish-assets
Oct 31 02:42:28  [34m│[0m 
Oct 31 02:42:28  [34m│[0m added 244 packages in 7s
Oct 31 02:42:28  [34m│[0m npm warn install-scripts 1 package has install scripts not yet covered by allowScripts:
Oct 31 02:42:28  [34m│[0m npm warn install-scripts   esbuild@0.28.2 (postinstall: node install.js)
Oct 31 02:42:28  [34m│[0m npm warn install-scripts
Oct 31 02:42:28  [34m│[0m npm warn install-scripts Run `npm install-scripts ls` to review, or `npm install-scripts approve <pkg>` to allow.
Oct 31 02:42:28  [34m│[0m npm notice
Oct 31 02:42:28  [34m│[0m npm notice New major version of npm available! 11.19.1 -> 12.2.1
Oct 31 02:42:28  [34m│[0m npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.2.1
Oct 31 02:42:28  [34m│[0m npm notice To update run: npm install -g npm@12.2.1
Oct 31 02:42:28  [34m│[0m npm notice
Oct 31 02:42:28  [34m│[0m 
Oct 31 02:42:28  [34m│[0m > native-auth-oauth@0.1.0 build
Oct 31 02:42:28  [34m│[0m > tsc && tsx devScripts/build-assets.ts
Oct 31 02:42:28  [34m│[0m 
Oct 31 02:42:28  [34m│[0m sh: 1: tsc: not found
Oct 31 02:42:28  [34m│[0m building: exit status 127
Oct 31 02:42:28  [34m│[0m Timer: Builder ran for 23.488116507s and ended at 2026-10-31T02:42:28Z
Oct 31 02:42:28  [34m│[0m [31;1mERROR: [0mfailed to build: exit status 1
Oct 31 02:42:29  [34m│[0m 
Oct 31 02:42:29  [34m│[0m 
Oct 31 02:42:29  [34m│[0m [31m ✘ build failed[0m

```

### RECOMMENDATION

What the log shows:

- The console's build command is still `npm ci && npm run build && npm run publish-assets`;
  App Platform uses the app spec saved in the console, never `.do/app.yaml` from the repository, so pushing `114700e` changed nothing there.  
  With `NODE_ENV=production`, that `npm ci` installs 244 packages without devDependencies, so `tsc` is missing.
- The custom build command runs **after** the buildpack's own install (284 packages) and its `Pruning devDependencies` step.  
  So even `npm ci --include=dev` alone would reinstall devDependencies after the prune and ship them, defeating TWEAK03.
- Second problem, waiting behind the first: the console's build-time variable list holds eight retired names that `src/config.ts:249-256` refuses at start-up (the app stops naming the replacement):
  `ENV_MAX_IDLE_TIME`, `ENV_API_CALL_TIMEOUT`, `ENV_SIGNIN_COOKIE_DURATION_MAX`, `ENV_PRIVATE_VOTER_LIMIT_DEFAULT`, `ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW`, `ENV_SERVER_MAX_REFRESH_PER_SECOND`, `ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND`, `ENV_SERVER_MAX_SEARCH_PER_SECOND_FALLBACK`;
  also `ENV_TRE0NDING_POLLS_RECOMPUTE_SWEEP_INTERVAL` (a zero for the O) is a typo that is silently ignored.  
  Once the build passes, the deploy will fail at start-up until these are renamed in the console (a separate tweak, TWEAK07, is suggested).

Option A — prune at the end of the custom command (recommended):

- Console build command: `npm ci --include=dev && npm run build && npm run publish-assets && npm prune --omit=dev`.
- The same line in `.do/app.yaml`;
  `tests/config.test.ts`'s TWEAK03 test also asserts the trailing `npm prune --omit=dev`.
- Pros: works with the build flow the log shows; devDependencies are really gone from the image; `tsx` (a dependency) survives for `npm run reconcile`.
- Cons: dependencies are installed twice per build (about 10 s);
  the console must be edited by hand.

Option B — drop the custom build command and let the buildpack build:

- Clear the console build command;
  `package.json` gains `"heroku-postbuild": "npm run build && npm run publish-assets"`, which the `heroku/nodejs` buildpack runs in its Build step, after its full install and before its prune;
  `.do/app.yaml` drops `build_command`.
- Pros: one install, the buildpack's intended flow.
- Cons: relies on App Platform running the buildpack's Build step when no custom command is set, which the logs so far have not shown;
  the console must still be edited.

Option C — back out TWEAK03:

- Remove `NODE_ENV` in the console (and from `.do/app.yaml`), keep `npm ci && …`.
- Pros: the next build passes with no other change.
- Cons: devDependencies ship again.

Recommended: **A**.
It is the smallest change that matches what the log shows the platform doing.
Either way, the eight retired variable names must be renamed in the console before the app can start.

2026-10-31 12:49

### ACCEPTED RECOMMENDATION

Option A, chosen by the developer.

- `.do/app.yaml`: `build_command` is `npm ci --include=dev && npm run build && npm run publish-assets && npm prune --omit=dev`.
- `tests/config.test.ts`: the TWEAK03 test "prunes devDependencies after the build in the deployment spec, keeping tsx" now also requires the build command to end with `npm prune --omit=dev`.
- `README.md` (root): the deploy line names the new build command, explains why it prunes itself, and says the console's spec, not `.do/app.yaml`, is what App Platform builds with.
- Tests postponed (Run Tests not ticked);
  the updated test is written but not run, so the tweak is unverified by a run.  
  `npx tsc --noEmit` passes.
- Artifacts: `tasks.md` (T018 added).
- Developer action, not doable from the repository:
  - set the console's build command (Settings → the web component → Commands → Build Command) to the line above, then rebuild;
  - the log should show `Running custom build command: npm ci --include=dev && … && npm prune --omit=dev` and end with the prune removing about 40 packages;
  - rename the eight retired variables in the console (suggested as TWEAK07), or the deploy will stop at start-up.

2026-10-31 12:58

## TWEAK07 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  



