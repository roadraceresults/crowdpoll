# Overview: `specs/018-TAB-BAR`

## Record

| Record | Value |
|---|---|
| Feature directory | `specs/018-TAB-BAR` |
| Fix file created | 2026-09-21 10:28 |
| Last updated | 2026-09-21 13:57 |

Legend: `[ ]` open · `[X]` resolved · `[-]` resolved manually (or accepted as-is) by the developer.

"What's next" always returns the first `[ ]` item below.

The developer is expected to create the individual fix requirements in this file, and then run the `/speckit-fix` command to have the AI implement them, one at a time.  
Each fix requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Fixes

## FIX01 pool resilience: keepAlive + error listener
[X] Resolved
- keepAlive: true makes the OS detect dead sockets early, so a wake-up produces at most one or two failures instead of a wave of 20.
- Without an error listener, a reset that arrives while a client is idle makes pg-pool emit error on the pool with nobody listening — Node treats that as an uncaught exception and exits. It didn't bite here only because the resets were noticed on the next read rather than while idle. That's a latent crash on the production fleet.

### RESOLUTION
Option A — log, discard, carry on.
- `src/db/client.ts`: the pool is created with `keepAlive: true`, and `pool.on("error", …)` logs
  `[db] An idle connection was dropped; it is discarded and the next query opens a new one: <message>`.
  `pg-pool` has already removed the dead client when it emits, so the handler's job is to exist and to say so.
- `tests/server-boot.test.ts`: new `describe("connection loss")` — a pooled connection is left idle, the test
  terminates its backend with `pg_terminate_backend`, and asserts the `[db]` line was logged and a further query
  succeeds on a new backend pid. Run once with the listener removed to prove the guard: vitest reports an
  Unhandled Error (`FATAL 57P01 terminating connection due to administrator command`) — the crash path.
- Suite: 41 files / 625 tests green (+1); `tsc --noEmit` clean.
- Artifacts: `ARCHITECTURE.md` § Start-up gains one paragraph on the pool's resilience. None of 018's
  spec/plan/tasks change — this is general hardening, not a tab-bar change; `keepAlive` is verified by review
  (a socket option with no observable hook in a test).
- Cause of the observed log (`designDocs/dontTrack/consoleLogError01.txt`): all pooled sockets reset at once,
  most likely the machine sleeping or PostgreSQL restarting during the manual test; not caused by 018.
(2026-09-21 11:43)

## FIX02
[-] Debugger Launch Error
When launching the server in VS Code, the debugger attaches but the server fails to start with a database migration error: `MigrationError: Migration (unknown) failed: read ECONNRESET`. This indicates that the connection to the database was unexpectedly closed during migration.
```
(base) PS C:\code\crowdpoll02>  C:; cd 'C:\code\crowdpoll02'; ${env:ENV_PORT}='9999'; ${env:ENV_DATABASE_URL}='postgres://localhost:5432/app01'; ${env:ENV_ADMINS}=' roadRACEresults@gmail.com  , a1@gmail.com'; ${env:ENV_API_CALL_TIMEOUT}='10000'; ${env:ENV_POLL_APPROVAL_POLLING_INTERVAL}='5000'; ${env:ENV_POLL_DATE_CHECK_POLLING_INTERVAL}='60000'; ${env:ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL}='10000'; ${env:ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS}='10'; ${env:ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL}='2000'; ${env:ENV_PARTICIPANTS_VIEWPORT_SIZE}='10'; ${env:ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW}='1'; ${env:ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW}='20'; ${env:ENV_PRIVATE_VOTER_LIMIT_DEFAULT}='6'; ${env:ENV_MIN_CHOICES}='2'; ${env:ENV_MAX_CHOICES}='50'; ${env:ENV_SESSION_CACHE_TTL}='300000'; ${env:ENV_MAX_POLLS_SEARCH_RESULTS}='200'; ${env:ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS}='200'; ${env:ENV_MAX_TRENDING_POLLS}='200'; ${env:ENV_TRENDING_POLLS_RECOMPUTE_INTERVAL}='60000'; ${env:ENV_MIN_LIVE_REFRESH_INTERVAL}='2000'; ${env:ENV_MIN_MANUAL_REFRESH_INTERVAL}='1000'; ${env:ENV_MIN_SEARCH_INTERVAL}='2000'; ${env:ENV_MIN_VOTE_INTERVAL}='2000'; ${env:ENV_MAX_VOTES_PER_IP_PER_MINUTE}='600'; ${env:ENV_MAX_LIVE_RESULTS_PER_USER}='5'; ${env:ENV_MAX_IDLE_TIME}='1800000'; ${env:ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND}='1250'; ${env:ENV_SERVER_MAX_REFRESH_PER_SECOND}='15000'; ${env:ENV_SERVER_MAX_SEARCH_PER_SECOND}='2000'; ${env:ENV_SERVER_MAX_SEARCH_PER_SECOND_FALLBACK}='200'; ${env:ENV_BUDGET_CONTROLLER_INTERVAL}='1000'; ${env:ENV_MAX_STRETCH}='8'; ${env:ENV_BUDGET_LOWER_THRESHOLD_PERCENT}='80'; ${env:ENV_INSTANCE_MAX_INFLIGHT}='200'; ${env:ENV_INSTANCE_MAX_EVENT_LOOP_LAG}='100'; ${env:ENV_SHED_RETRY_AFTER}='2000'; ${env:ENV_COUNTER_FLUSH_INTERVAL}='2000'; ${env:ENV_VOTE_BATCH_SIZE}='500'; ${env:ENV_VOTE_QUEUE_LAG_NOTICE}='2000'; ${env:ENV_SEARCH_CACHE_TTL}='10000'; ${env:ENV_OUTBOX_DRAIN_INTERVAL}='15000'; ${env:ENV_MAX_BOOKMARKS_PER_USER}='200'; ${env:ENV_BOOKMARK_EXPIRY_MONTHS}='6'; ${env:ENV_PAGE_LOADS_PER_MINUTE}='120'; ${env:ENV_SIGNIN_COOKIE_DURATION_MAX}='2592000000'; ${env:ENV_SIGNIN_METHOD}='native'; ${env:ENV_BETTER_AUTH_SECRET}=''; ${env:ENV_SMTP_HOST}='sandbox.smtp.mailtrap.io'; ${env:ENV_SMTP_PORT}='2525'; ${env:ENV_SMTP_USER}=''; ${env:ENV_SMTP_PASS}=''; ${env:ENV_SMTP_FROM}='NativeAuthOAuth <no-reply@nativeauth.local>'; ${env:ENV_VALKEY_URL}='redis://localhost:6379'; ${env:ENV_OPENSEARCH_URL}='http://localhost:9200'; ${env:ENV_SPACES_BUCKET}=''; ${env:NODE_OPTIONS}=' --require "c:/Users/roadr/AppData/Local/Programs/Microsoft VS Code/6928394f91/resources/app/extensions/ms-vscode.js-debug/src/bootloader.js"  --inspect-publish-uid=http'; ${env:VSCODE_INSPECTOR_OPTIONS}=':::{"inspectorIpc":"\\\\.\\pipe\\node-cdp.18828-a0d83dba-139.sock","deferredMode":false,"waitForDebugger":"","execPath":"C:\\nvm4w\\nodejs\\node.exe","onlyEntrypoint":false,"autoAttachMode":"always","fileCallback":"C:\\Users\\roadr\\AppData\\Local\\Temp\\node-debug-callback-c6d099d308aff46d"}'; & 'C:\nvm4w\nodejs\npx.cmd' 'tsx' 'src/server.ts' 
Debugger attached.
Debugger attached.
Debugger attached.
[server] Starting in native sign-in mode
[server] Database migration failed; refusing to start: MigrationError: Migration (unknown) failed: read ECONNRESET
    at migrateToLatest (C:\code\crowdpoll02\src\db\migrator.ts:17:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async startServer (C:\code\crowdpoll02\src\server.ts:142:21)
Waiting for the debugger to disconnect...
Waiting for the debugger to disconnect...
Waiting for the debugger to disconnect...
```

### CLARIFICATIONS
Asked 2026-09-21 12:06. "(unknown)" means the error came before any migration ran — the very
**first** connection to `postgres://…@localhost:5432/app01` was reset during connect, before a query
was sent. That is not the idle-pool case FIX01 covers; it is PostgreSQL (or something on port 5432)
refusing/resetting new connections. Three answers decide the resolution:

1. Does PostgreSQL itself answer right now, outside the app? In PowerShell:
   `psql "postgres://postgres:postgres@localhost:5432/app01" -c "select version()"` (or connect in
   pgAdmin), and `Get-Service postgresql*` — is the service Running? Anything unusual in the latest
   file under `<PGDATA>\log\`?
2. Does it reproduce with `npm run dev` (via `devScripts/launch-dev.ps1`) — i.e. without the VS Code
   debugger attached?
3. Did this launch fail *before* FIX01 was applied (which added `keepAlive: true` to the pool), or only
   after? If you want to rule the option in or out quickly, change `keepAlive: true` to `false` in
   `src/db/client.ts:19` and relaunch; report which way it goes.

Note: the pasted launch line carries live credentials (`ENV_BETTER_AUTH_SECRET`, `ENV_SMTP_USER/PASS`).
`specs/` is committed — scrub them from this file before the next commit.

## FIX03 PostgreSQL Log Error
[X] Resolved
The postgresql log shows a series of errors, which may be related to the debugger launch error. 
The log entries are in
 `designDocs/dontTrack/postgreslogerror.txt`.

### RESOLUTION
Option C — fix the query shape; note the Windows worker problem.
- What the log held: 68 × `ERROR: parallel worker failed to initialize`, one a minute from 11:24 to
  12:00, every one on `select distinct "poll_id" from "vote_history" where "poll_id" in ($1…$200)` —
  `pollsEverVoted()` as called by the admin list (`GET /api/admin/polls`) and admin search; plus one
  `autovacuum worker took too long to start` and the two "forcibly closed" lines from stopping the app.
- Correction to the first diagnosis: the `(poll_id, voted_at)` index already exists on every partition
  (`db/partitions.ts`). The planner still chose a sequential — at scale, parallel — scan because the
  200-id `IN` list matches most of the table, and a `distinct` over it must read every matching vote
  (O(votes)). No migration was needed.
- `src/polls/store.ts`: `pollsEverVoted` now runs `pollsEverVotedQuery` — a semi-join from `polls`
  (`where id in (…) and exists (select 1 from vote_history where poll_id = polls.id)`): one index probe
  per poll that stops at its first history row (O(polls)), no parallel plan. `hasVoteHistory` gained a
  `hasVoteHistoryQuery` builder so it can be guarded; its shape was already fine.
- `tests/helpers/explain.ts` + `tests/db-explain-guard.test.ts`: history rows are seeded (150 polls × 40
  votes), and a new case asserts, with the planner's real settings (`enable_seqscan = on`), that neither
  query seq-scans a populated `vote_history` partition nor plans a `Gather`. Run against the old shape
  it fails on "polls ever voted (admin list)"; against the new it passes.
- Suite: 41 files / 626 tests green (+1); `tsc --noEmit` clean. `ARCHITECTURE.md` § Poll administration
  gains the one-clause description of the semi-join. None of 018's artifacts change (this is 004/017
  territory).
- Environment note (the C half): `parallel worker failed to initialize` and `autovacuum worker took too
  long to start` both mean the Windows postmaster could not spawn a background process in time. That is
  the same starved-machine period as the FIX01 socket resets. If it recurs with the app idle, check the
  PostgreSQL service for worker-launch trouble — antivirus real-time scanning of `postgres.exe` child
  processes is the usual cause on Windows; exclude the PostgreSQL `bin` and data directories.
(2026-09-21 13:05)

## FIX04 Icon for Newest Tab Bar Item
[X] Resolved
The icon for the "Newest" tab bar item is smaller than the other icons.
See the screenshot in `designDocs/dontTrack/tabbaricons.jpg`.  
The circle that the exclamation mark sits in is smaller than the circle around the "My Private Polls" icon (profile avatar).  
Please make the "Newest" icon the same size as the "My Private Polls" icon, and center the exclamation mark in the circle.

### RESOLUTION
- Cause: both icons share the 16×16 box, but the avatar's circle (`r=32` of 64) f``ills it while the Newest
  circle (`r=10` of 24) filled 83% of it — about 13px against 16px.
- `src/public/index.html`: the Newest circle is `r="12"` (fills the box); the `!` is redrawn a size up and
  symmetric about the centre (bar `M10.4 5h3.2l-.6 9h-2z`, dot `M10.5 16h3v3h-3z` — spans 5→19, centre 12)
  with the same `skewX(-12)` about the centre. Colours unchanged.
- `tests/tab-bar-assets.test.ts`: the Newest case now asserts `r="12"`. Home-page and tab-bar-asset suites
  green (44 tests).
- Artifacts: `contracts/ui-contracts.md` (Newest row), `research.md` R4 and `tasks.md` T013 now say `r="12"`.
  No spec change — FR-007's "appropriately sized circle" is what this delivers.
(2026-09-21 13:24)

## FIX05 Another Change Request for Newest Tab Bar Icon
[X] Resolved
The icon for the "Newest" tab bar item is a good size now.  
Please make the color scheme for the "Newest" icon match the color scheme for the "My Private Polls" icon (profile avatar).
See the screenshot in `designDocs/dontTrack/tabbaricons.jpg`.  
The fill of the circle must be darker, and the exclamation mark must be transparent.

### RESOLUTION
Option B (chosen over the true cut-out) — the Newest icon wears the avatar's two colours.
- `src/public/index.html`: circle `fill="#8093a7"`, exclamation mark `fill="#e8edf2"` — the exact fills of
  `avatar-default.svg`; shape, size and skew unchanged from FIX04. The mark is painted pale grey rather than
  cut out, so it does not take the active pill's tint (that was option A's one visible difference).
- `tests/tab-bar-assets.test.ts`: the Newest case asserts the two fills. Home-page and tab-bar-asset suites
  green (44 tests).
- This changes a requirement: `spec.md` FR-007 now reads "in the default avatar's two colours … so it sits
  beside the My Private Polls icon as a pair" (was "filled light grey, containing a black italic
  exclamation mark"); the matching assumption is reworded. `contracts/ui-contracts.md` (Newest row),
  `research.md` R4, `tasks.md` T013/T015 follow. **`designDocs/018-high-level-requirements-TAB-BAR.md`
  § Newest Icon still says light grey / black — paste FR-007's new sentence there.**
(2026-09-21 13:34)

## FIX06 Refresh Icon Spacing
[X] Resolved
Please provide the same spacing between the line under the tab bar and the Refresh icon,
as there is between the line and the tab bar icons.
See the screenshot in `designDocs/dontTrack/refreshIconSpacing.jpg`.

### RESOLUTION
Option A — one 6px, both children on the same baseline.
- Cause: the wrap centred its children; the tab strip carried `padding-bottom:4px` under its 33px buttons
  while the 38px Refresh circle was the row's tallest child, so its bottom edge *was* the wrap's edge —
  tabs sat 6px above the `bottom:-2px` rule, Refresh 2px.
- `src/public/tabs.css`: `.tab-bar-wrap` is `align-items:flex-end`; `.tab-bar` loses `padding-bottom:4px`;
  `.tab-bar-wrap::after` is `bottom:-6px`. Buttons and Refresh both rest on the wrap's bottom edge, 6px
  above the line.
- `tests/tab-bar-assets.test.ts`: asserts `bottom:-6px`, `align-items:flex-end`, and no `padding-bottom`
  on the strip. Home-page and tab-bar-asset suites green (44 tests).
- Artifacts: `spec.md` FR-019 now says "at the same distance from it" and the assumption names the shared
  edge; `research.md` R1, `contracts/ui-contracts.md` § The rule, `tasks.md` T014 and `quickstart.md`
  step 8 reworded from "−2px + 4px padding" to "−6px, shared baseline". The source document's "6 px below
  the row" (line 12) is unchanged and still true.
(2026-09-21 13:42)

## FIX07 2px For Line Under Tab Bar
[X] Resolved
Make the line under the Tab Bar 2px thick instead of 1px thick.
See:
- CSS: src/public/tabs.css — the .tab-bar-wrap::after { … } rule just below the .tab-bar-wrap rule (around line 73). That ::after is the line: content:""; position:absolute; left:50%; bottom:-6px; width:100vw; height:1px; background:var(--line); transform:translateX(-50%).

### RESOLUTION
Treated as FIX07. Option A — thicker line, same air.
- `src/public/tabs.css` `.tab-bar-wrap::after`: `height:2px`, `bottom:-7px` — the line occupies the band
  5–7px below the buttons and the Refresh control, so the gap tuned in FIX06 is unchanged.
- `tests/tab-bar-assets.test.ts`: asserts `height:2px` and `bottom:-7px`. Home-page and tab-bar-asset
  suites green (44 tests).
- This changes a requirement: `spec.md` FR-017 is now "2 pixels thick … its top edge 5 pixels below the
  row" and the matching assumption says 5px of air; `contracts/ui-contracts.md` § The rule, `research.md`
  R1, `tasks.md` T014, `quickstart.md` step 8 and `ARCHITECTURE.md` follow. **The source document's Design
  line 12 still says "1 px thick … 6 px below the row" — paste FR-017's new sentence there.**
(2026-09-21 13:49)

## FIX08 Live Results Icon Animation
[X] Resolved
No animation when in guest mode.
I am changing my choice for FR-011.  
Currently, it reads: 
- **FR-011**: The Live Results animation MUST run continuously at all times — whichever tab is
  open, and while the tab is dimmed for a guest — and MUST stop when the visitor's system requests
  reduced motion, exactly as the card's animation does.
  
Please change this requirement so that in Guest mode, there is no animation to the "Live Results" icon.  
This applies both to the icon in the tab bar, as well as the icon on the front of the Poll Card.

### RESOLUTION
Option A — a `body.is-guest` class owned by the session code.
- `src/public/app.js` `adopt()`: `document.body.classList.toggle("is-guest", !next)` — every sign-in/out
  transition on every page already flows through here. `src/public/index.html`: `<body class="is-guest">`
  so a guest's first paint is already still. `src/public/pollCard.css`, beside the reduced-motion rule:
  `.is-guest .live-bars i { animation:none; }` — one line covers the tab icon and every card front.
- Tests: `tests/client-home.test.ts` — a guest page carries `body.is-guest`, `Session.refresh()` with a
  forged cookie removes it, a member's page never has it; `tests/tab-bar-assets.test.ts` — `index.html`
  starts `is-guest` and `pollCard.css` carries the rule. Full suite 41 files / 628 tests green (+2).
- Requirement change: `spec.md` FR-011 rewritten (signed in → runs; guest → never; reduced motion stops it
  for everyone), US1 scenarios 5–6, two edge cases and SC-006 follow; `contracts/ui-contracts.md` icons
  section, `research.md` R3, `quickstart.md` US1 steps 6–7 and `tasks.md` T017 updated. **The source
  document's § Live Results Icon (line 43: "the loop runs at all times … while the item is disabled for a
  guest") needs the new sentence — paste FR-011.**
(2026-09-21 13:57)
