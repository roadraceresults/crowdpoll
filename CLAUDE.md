# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/20261028-151716-REFRESH-MECHANISMS/plan.md` (research R1–R10, `data-model.md` — cache keys only, no migration —
the HTTP and operator contracts `contracts/api.md` A1–A7, the UI contracts `contracts/ui-contracts.md` C1–C3, and the
quickstart live alongside it in `specs/20261028-151716-REFRESH-MECHANISMS/`). The requirements report is
`requirements/20261028-151716-refresh-mechanisms/requirements-report.md`: 7 diagrams, 9 research results and 23 findings,
all resolved. Decisions that are easy to get wrong:
- **Sweeps produce, refreshes read**: no refresh runs a sweep and no sweep pushes to a browser (RS1–RS3).
- **A personal-tab refresh skips the database** when `tabs:v:<emailKey>` equals the `tabs:seen:<emailKey>:<tab>` record
  (5 min) and every loaded row's cached projection has the recorded `content_version`; it then answers from the live
  counts only. A change is signalled by **deleting** `tabs:v` (`forgetTabs`) **after commit**, at every write to
  `user_polls`, `poll_invitations` or `poll_bans`; a deleted poll deletes its `poll:<pid>` projection (R1–R4).
- **Projections are written in one batch, only when missing or stale** (`getMany`/`setMany`) (R5).
- **Live Results backs off** after each `304` (2 → 4 → 8 → 10 s, never below `nextRefreshMs`); a `200`, a vote, an add
  or remove, the page becoming visible, or a `429`/`503` resets it (R6).
- **Trending and Newest are published with `max-age` = min(interval, 10 s)** (`listingMaxAgeMs`, sent as
  `trendingMaxAgeMs`/`newestMaxAgeMs`); Refresh there waits until the copy is that old (R7).
- **`#refreshBtn` uses `aria-disabled`, never `disabled`**, so its `Refresh available in N s` tooltip can show (R8).
- **Search and refresh buckets refill at `floor × k`**; the `[controller]` line adds `tabs=<fast>/<full>` and
  `stretched=<n>` (R9).
- **Counter flush 10 s (`ENV_COUNTER_FLUSH_SWEEP_INTERVAL`), invitation sweep 30 s (`ENV_INVITATION_SWEEP_INTERVAL`)**; the manual floor is no
  longer tied to the flush (R10).
No migration, no new dependency; one new setting, and twenty settings renamed (TWEAK03, TWEAK06, TWEAK08; an old name
still set stops the app, naming its replacement).
The preceding feature is
`specs/20261028-183546-LINE-GRAPH-M3/plan.md` (research R1–R11, `data-model.md` — in-memory state only, no
migration, no setting — the UI contracts `contracts/ui-contracts.md` C1–C6, and the quickstart live alongside it in
`specs/20261028-183546-LINE-GRAPH-M3/`). The requirements report is
`requirements/20261028-183546-line-graph-m3/requirements-report.md`: 4 diagrams and 10 findings, all resolved.
Decisions that are easy to get wrong:
- **A line keeps its bar's hue, shaded only to reach 3:1 on the surface**: `PollCard.lineColorOn(hex, surfaceHex)`
  (new on `window.PollCard`, built from `pollCard.js`'s own `hexToHsl`/`hslToHex`/`contrastRatio`) walks HSL lightness
  by 0.01 away from the surface; a colour already at 3:1 is unchanged. The same colour strokes the line and fills the
  legend dot, tooltip dot and marker. This replaces POLL-LINE-GRAPH's "identical hexes in both themes" (R1, R2).
- **The surface is read, not copied**: the container's computed `background-color`; none → no shading; a
  `prefers-color-scheme` `change` redraws (index.html follows the device theme only) (R3).
- **The scale selector is an M3 segmented button**: `button.line-graph-segment[aria-pressed]` in a `role=group`, check
  icon on the selected one, roving `tabindex`, Left/Right wrap; `.line-graph-scale`/`is-selected` are gone; a click still
  sends no request (R4).
- **The tooltip is an M3 rich tooltip placed beside the crosshair** (+12 px, flipped left near the right edge, clamped),
  no `translateX(-50%)` (R5); ringed `r=4` markers at the crosshair, round joins, `line-graph-baseline` at 0 %; no
  animation (R6).
- **The plot is one Tab stop**: focus (not after a pointer press) shows the newest point; Arrow keys, Home/End, Escape;
  a polite `.line-graph-live` region reads the tooltip text. This reverses POLL-LINE-GRAPH's "no keyboard crosshair" (R7).
- **Touch keeps the crosshair** after the finger lifts until a press outside the plot; `touch-action:pan-y` (R8); a
  redraw keeps it at the same bucket time, a scale change hides it (R9).
- **`line-graph-m3.css` holds only M3 tokens**, checked in `m3-assets.test.ts` (R10).
No server, route, configuration, data or migration change; no new dependency.
The preceding feature is
`specs/20261027-151601-POLL-LINE-GRAPH/plan.md` (research R1–R13, `data-model.md` — no stored-data change, no
migration, two new settings — the HTTP contracts `contracts/api.md` A1–A2, the UI contracts
`contracts/ui-contracts.md` C1–C9, and the quickstart live alongside it in `specs/20261027-151601-POLL-LINE-GRAPH/`).
The requirements report is `requirements/20261027-151601-poll-line-graph/requirements-report.md`: 4 diagrams and
16 findings, all resolved. Decisions that are easy to get wrong:
- **One migration, added by TWEAK03**: `012-line-graph-tally` adds `line_graph_tally` (per poll, hour and choice,
  the change in count, the voter count under choice id `""`) and `line_graph_selection` (each voter's latest
  selection), backfilled from `vote_history`. A 14.9-million-row history exhausted the heap when it was loaded (R1).
- **Access is `mayViewResults`, not `mayWatch`**: published + public (guests included), or creator/reachable private;
  a ban does not hide the graph; every refusal — bad pid, unpublished, unreachable — is `404 Not found`; the route
  takes no `?scale=` and answers every available scale at once, so a scale click sends no request (R2, R3, TWEAK04).
- **The replay happens at write time, never per request**: every `vote_history` insert (`writeBatch`, `recordVote`,
  `insertVoteHistory`) calls `recordLineGraphTally` in its transaction; a new writer or deleter of `vote_history` must
  keep the tally too (`rebuildLineGraphTally` after deletions). The graph sums the tally into UTC buckets, each email's
  latest `choice_ids` winning, `computeResults`'s formula at each bucket boundary, last bucket = "now" so the newest
  point and `totalVoted` always equal the bar graph; labels are viewer-local `Intl.DateTimeFormat` (R4, R6).
- **Cache before compute, access before cache**: read-through on the shared `Cache`, key `line-graph:<pid>`,
  TTL = `lineGraphRefreshIntervalMs` (`ENV_LINE_GRAPH_REFRESH_INTERVAL`, default 60000, clamped up to
  `ENV_MIN_LIVE_REFRESH_INTERVAL`); the route is `...dynamic("refresh")` with no `requireSession` (R3, R5, R10).
- **Threshold on the current standing only** (`ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE`, default 1, `0` disables): a
  qualifying choice is drawn across the whole window; lines never start or stop mid-window (R4).
- **Colours come from the card**: the response carries only manual hexes (else null); `lineGraph.js` fills the rest
  from the card's new `resultColors()` getter, so the lines can never disagree with the bars; identical hexes in both
  themes, chrome from M3 tokens in the new `line-graph-m3.css` (in `LAYER_ORDER`; the `tabs.css` placeholder rules
  for `.maximized-space-right` are removed) (R7, R9).
- **One mount seam**: `tabs.js` `maximize()` calls `window.PollLineGraph?.mount(...)`, every close path funnels to
  `unmount()`, which stops the refresh timer; hand-rolled SVG, no new dependency (R7, R8).
- **Failure is quiet**: a failed refresh keeps the last drawn graph and retries next tick; a failed first load shows
  "Graph unavailable right now"; a `404` shows the results-unavailable note and stops the timer (R11).
One additive migration (TWEAK03), no new dependency; one new route, one new browser module, one new stylesheet, two settings.
The preceding feature is
`specs/20261027-133129-SINGLE-EMAIL-INVITE/plan.md` (research R1–R11, `data-model.md` — three `poll_invitations`
token columns, one migration — the HTTP contracts `contracts/api.md` A1–A3, the UI contracts `contracts/ui-contracts.md`
C1–C2 and the email sentence M1, and the quickstart live alongside it in `specs/20261027-133129-SINGLE-EMAIL-INVITE/`).
The requirements report is `requirements/20261027-133129-single-email-invite/requirements-report.md`: 5 diagrams,
3 research results and 15 findings, all resolved. Decisions that are easy to get wrong:
- **The link is `/invite?PID=<pid>&token=<token>`**; only the newest token per invitation signs in, once, until the
  poll ends or 30 days; any token that cannot sign in falls back to `/?PID=<pid>`, so old emails never dead-end (R1–R3).
- **Opening the link writes nothing** (mail scanners), except for a browser already signed in as the invited address
  (by email key), which uses the token up and goes straight to `/?PID=` (R4).
- **Continue signs in through the existing `completeSignIn`**: the server mints a BetterAuth magic-link token
  (`sendMagicLink` stores it instead of emailing when `metadata.mint` is set) and verifies it at once, so the address
  is confirmed and the session hooks run as for an emailed link (R5, R6).
- **A new address needs the Terms box on the card; another signed-in account needs "Sign out and continue"**, one
  press (clarification 2026-10-27); the allowlist and an `Origin` check apply; `oauth` mode keeps `/?PID=` (R6–R8).
- **A landed poll is always maximized**: `applyLanding` maximizes after `mountLinkedPoll` too (R9).
One additive migration, no new dependency, no new setting or cookie.
The preceding feature is
`specs/20261026-152737-POPULATE-TEST-POLL/plan.md` (research R1–R12, `data-model.md` — the input file, the in-memory plan
of each data point and the rows touched, no migration — the CLI contract `contracts/cli.md` C1–C5, and the quickstart live
alongside it in `specs/20261026-152737-POPULATE-TEST-POLL/`). The requirements report is
`requirements/20261026-152737-populate-test-poll/requirements-report.md`: 4 diagrams and 20 findings, all resolved. Decisions
that are easy to get wrong:
- **One developer script, no server change**: `devScripts/populate/populate-poll.ts <file.json>`, exactly one argument, the
  server's `ENV_*` (`loadConfig`, `createDb`, `createCache`), no migration; `.gitignore` gains
  `!devScripts/populate/populate-poll.ts`; `polldata/` stays ignored, tests use `tests/fixtures/populate-poll.json` (R1, R2, R12).
- **The app's own write paths**: `createDefaultPoll` + `insertPoll` to create (`created_at = start_at = launched_at`, no
  `created_by_email` column); `updatePoll` to refresh on a rerun, then `launched_at = start_at` written directly, because
  `updatePoll` stamps it only on entry into OPEN; `writeBatch` for votes; `reconcile` always, which also queues the search
  entry (`insertPoll` writes no outbox row) (R3, R4, R7, R8).
- **One set of voters who change their votes**: each data point's `round(vote_count × U(0.85, 1.15))` voters are
  `test_1@crowdpolltest.test` upward, numbered from 1, no accounts, split by the percentages scaled to their sum (largest
  remainder), timed within the moved day, never after now, oldest data point first (R7, R9, TWEAK01).
- **A rerun keeps the poll id**: deletes the simulated voters' `votes`, `vote_history` and `user_polls` `voted` rows
  (`like 'test\_%@crowdpolltest.test' escape '\'`), matches choices by exact label, deletes votes for a dropped choice, and
  reopens the poll (R4–R6).
- **Validate before any write**: every C4 error is one `[populate] Error:` line and exit 1; only the database host is
  printed; any target database is allowed (R10, R11).
No server, route, configuration, data or migration change; no new dependency.
The preceding feature is
`specs/20261026-085056-POLL-INVITATIONS/plan.md` (research R1–R16, `data-model.md` — five `poll_invitations` columns,
`polls.time_zone`, the `invitation_history` and `invitation_emails` tables, derived statuses, one migration — the HTTP
contracts `contracts/api.md` A1–A5, the UI contracts `contracts/ui-contracts.md` C1–C9, the email messages M1–M2, and
the quickstart live alongside it in `specs/20261026-085056-POLL-INVITATIONS/`). The requirements report is
`requirements/20261026-085056-poll-invitations/requirements-report.md`: 4 diagrams and 25 findings, all resolved.
Decisions that are easy to get wrong:
- **The stand-alone drafts come first and are done**: `admin-card.html`/`.css`/`.js` and `fonts/` (captured from
  `renderReadOnly()` with production class names) and `invitation-email.html` live in the requirements folder; the
  production panel and email follow them (R11, C1, C9).
- **Invitation state is on `poll_invitations`** (`sent_at`, `reminded_at`, `send_failed_at`, `accepted_at`,
  `added_at`); `writeRoster` keeps existing invitation rows instead of deleting and reinserting them. Status is derived,
  never stored: Voted → Accepted → Not delivered → Invited → Not sent yet (R1, R8).
- **Matching by email key is adoption**: at sign-in (`session.create.after`), the poll link and the Shared With You tab,
  an invitation whose email key matches the account takes the account's address (invitation, `invited` row,
  placeholder vote), so every existing exact-match reader stays as it is (R2).
- **Accepted = shown the poll** (the link or the Shared With You tab), written once; a vote counts as acceptance but
  is read from `votes`, never written (R3).
- **One route, no edit session**: `GET`/`POST /api/admin/polls/:pid/invitees` behind `requireOwnPoll`; it never
  changes `pollState` or pauses voting (R4).
- **Emails are claimed, then sent**, by the route (open poll) and `invitationSweep` (5 s, lock 12), oldest first
  within `ENV_MAX_INVITATIONS_PER_DAY` (200, counted per creator in the address-free `invitation_emails`); what does
  not fit waits as `Not sent yet`; only OPEN polls send, and Resend is refused while a poll is not open (R6, R7, R16).
- **A removed, already-emailed address added back is the same invitation**: `invitation_history` (email key, sent and
  reminded times) restores its state, so it is not emailed again (R15).
- **One email function, `invitationMessage`**, in the approved wording (M1, M2); `layout()` gains an optional
  `headingLine2` (the title on its own line), and every other email's output is unchanged; the render script imports
  the production function (R9).
- **Dates are in the creator's time zone**: `adminCard.js` sends `timeZone` on every poll write, stored as
  `polls.time_zone` (UTC when null); `formatPollDate` names the zone in force on each date, so `EDT` and `EST` can
  both appear (R14).
One additive migration, no new dependency; one new setting.
The preceding feature is
`specs/20261023-155959-PHONE-TAB-BAR/plan.md` (research R1–R10, `data-model.md` — the tab bar's in-memory edge and drag
state, no stored data — the UI contracts `contracts/ui-contracts.md` C1–C7, and the quickstart live alongside it in
`specs/20261023-155959-PHONE-TAB-BAR/`). The requirements report is
`requirements/20261023-155959-phone-tab-bar/requirements-report.md`: 4 diagrams and 9 findings, all resolved. Decisions
that are easy to get wrong:
- **The phone is every width up to 900 px, and the desktop above it is untouched** (but for TWEAKS02: `#tabBar` has
  `margin-left:-16px` in the base, the tab's padding, and `0` in the 900 px block, where the tab has no left padding, so
  the first tab's icon starts under the logo at every width). One `@media (max-width: 900px)` block in
  `single-column-m3.css` holds every phone tab bar rule; the `639.98px` block holds none; `--tab-label-scale:0.9` stays there
  because the avatar menu reads it (R1).
- **The fade is the existing mask, 32 px wide on the phone**: `header-tab-bar-m3.css`'s three masks read `var(--tab-fade, 24px)`,
  the 900 px block sets `--tab-fade:32px` and `scroll-padding:0 var(--tab-fade)`, and `mask-image:none !important` is gone (R2).
- **Row tabs are overrides, not new markup**: `#tabBar .tab{ flex-direction:row; width:min-content; min-width:0; height:auto;
  min-height:48px; gap:2px; padding:0px 10px 2px 0px; white-space:normal; font-size:var(--md-sys-typescale-label-small-size);
  line-height:…; font-weight:…; letter-spacing:…; text-align:left; }` (the four label-small tokens; `index.html` writes
  `Shared With&nbsp;You`, so no label exceeds two lines) and `#tabBar .tab.is-active::after{ left:0; right:10px; }`
  (TWEAKS03 to TWEAKS07: the 11 px label wraps to its longest word, every tab as tall as the tallest, 48 px) and 16 px icons;
  `floatingActions.js` docks the guest pair 8 px **right** of Refresh, and the compact header has `padding-top:3px` (TWEAKS04, TWEAKS05); the 14 px label, its tracking and the 12 px underline inset come from the base rules (R3).
- **Smoothness is CSS**: `#tabBar{ scroll-behavior:smooth; }`, `auto` while `.is-dragging` and under reduced motion; `tabs.js`
  changes only `moveTabFocus` (`focus({ preventScroll:true })` then `scrollIntoView`); the menu's own `scrollIntoView` goes (R4).
- **The browser scrolls touch**: `tabBarScroll.js`'s drag ignores `pointerType === "touch"` only, so mouse and pen drag; a
  vertical wheel scrolls the row while it can move and `matchMedia("(max-width: 900px)")` matches, else the page (R5, R6).
- **The arrows are deleted** from `index.html`, both layers and the script (step, hold, settle, `updateArrowStates`); the file
  keeps its name; Refresh moves to the left and the All tabs button and its menu to the right, by CSS only, each inset by
  `--tab-edge` (20 px; below 640 px `max(14px, calc((100% - 420px) / 2))`) so it is flush with the card column (R7, R8, TWEAKS01).
No server, route, configuration, data or migration change; no new dependency.
The preceding feature is
`specs/20261022-131728-SOCIAL-OAUTH-PROVIDERS/plan.md` (research R1–R11, `data-model.md` — BetterAuth's existing `account` links,
no migration — the HTTP contracts `contracts/api.md` A1–A6, the UI contracts `contracts/ui-contracts.md` C1–C3, the operator's
registration procedures `contracts/provider-setup.md` P0–P5, and the quickstart live alongside it in
`specs/20261022-131728-SOCIAL-OAUTH-PROVIDERS/`). The requirements report is
`requirements/20261022-131728-social-oauth-providers/requirements-report.md`: 4 diagrams, 5 research results and 10 findings, all
resolved. Decisions that are easy to get wrong:
- **`ENV_PUBLIC_ORIGIN` is BetterAuth's `baseURL`**; every redirect URI is built from it (R1).
- **`ENV_SIGNIN_METHOD` gains `both`**; `native` and `oauth` behave as before; code tests `nativeSignin` / `oauthSignin` (R2).
- **BetterAuth's handler is mounted for the OAuth paths only** (`sign-in/social`, `callback/:provider`, `sign-in/oauth2`,
  `oauth2/callback/:providerId`), never `/api/auth/*`, or it would swallow the native routes in `both` (R3).
- **Amazon uses the `generic-oauth` plugin**: its redirect URI is `/api/auth/oauth2/callback/amazon` (R6).
- **Apple's client secret is an ES256 JWT CrowdPoll signs itself** (`node:crypto`), refreshed every 30 days (R5).
- **Linking is by email key for all four providers** (Amazon trusted, Clarifications); `mapProfileToUser` swaps in the
  existing account's address; BetterAuth still requires the local account's email to be verified (R7).
- **Apple's domain file** is served by its own route, since `express.static` ignores dot-directories (R10).
One new module, no migration, no new dependency.
The preceding feature is
`specs/20261021-204537-PRIVACY-AND-TERMS/plan.md` (research R1–R14, `data-model.md` — two `user` columns and `polls.ever_voted`, the
anonymized vote, the deletion and retention tables, one migration — the HTTP contracts `contracts/api.md` A1–A9, the UI contracts
`contracts/ui-contracts.md` C1–C9, the email messages M1–M2, the draft `privacy-policy.md` and `terms-of-service.md`, and the
quickstart validation guide live alongside it in `specs/20261021-204537-PRIVACY-AND-TERMS/`). The requirements report is
`requirements/20261021-204537-privacy-and-terms/requirements-report.md`: 4 diagrams, 3 research results and 21 findings, all resolved.
Decisions that are easy to get wrong:
- **One `TERMS_VERSION`** (`src/legal/version.ts`) is printed on both pages, sent in `/api/config` and compared by the gate;
  raising it makes every account accept again (R2).
- **Agreement is `terms_version` / `terms_accepted_at` on `user`**, not declared to BetterAuth, read with `permissions` in
  `sessionCache.lookup()`; writing them is followed by `forgetUserSessions` (R3).
- **The terms gate is one middleware before every router**: no cookie → pass; not accepted → `/api/*` answers
  `403 terms-required` except accept-terms, logout, `GET /api/me`, `GET /api/config` and the sign-in and link routes
  (create-account, request-login-link, verify, confirm-signin, link-info, email-change/verify); page routes redirect to
  `/accept-terms?next=`; `/privacy`, `/terms`, assets pass. In OAuth mode the account is created without agreement and the
  gate stops it until it accepts (R5, R7).
- **Deleting an account deletes what is the user's and anonymizes their votes on others' polls** (`deleted-<uuid>@deleted.invalid`,
  one per poll, `Deleted user`, counts unchanged; the cards show any `@deleted.invalid` address as "Deleted user", C9); bans are
  kept; own polls go with a `search_outbox` row each; one transaction, cache dropped after commit; the vote consumer skips queued
  votes whose address has no `user` row (R8).
- **No third-party request**: fonts are committed `woff2` files under `src/public/fonts/`; sessions store no IP or user agent;
  rate-limit log lines use `maskIp`; `retentionSweep` (daily, lock 11) removes expired rows and drops vote-history partitions
  older than 12 months, which is safe because "ever voted" reads `polls.ever_voted`, set on every history insert (R9–R11).
- **Cookie Use is checked**: the table's `data-name` rows must equal the cookies set and the storage keys used (R13).
One additive migration, no new dependency; `privacy@crowdpoll.vote` is a manual ImprovMX alias.
The preceding feature is
`specs/20261021-143942-PRELAUNCH-SIGNUP-ALLOWLIST/plan.md` (research R1–R8, `data-model.md` — one setting, no stored data, no
migration — the HTTP contracts `contracts/api.md` A1–A6, the UI contracts `contracts/ui-contracts.md` C1–C3, and the quickstart
validation guide live alongside it in `specs/20261021-143942-PRELAUNCH-SIGNUP-ALLOWLIST/`). The requirements report is
`requirements/20261021-143942-prelaunch-signup-allowlist/requirements-report.md`: 4 diagrams and 13 findings, all resolved.
Decisions that are easy to get wrong:
- **`ENV_ALLOWED_EMAILS` unset or empty means off**, exactly today's behaviour; an invalid entry stops the app; startup logs the
  count, never an address. In production it is an encrypted console variable, never in `.do/app.yaml` (R1, R7).
- **One rule, `isAllowed` (`src/auth/allowlist.ts`)**: listed by email key (a TypeScript `emailKeyOf` twin of the SQL
  `emailKey`, tested to agree), or an `ENV_ADMINS` address (R2).
- **Checked after the honeypot, validation and rate limit, before anything is created or sent**: create-account,
  request-login-link, email-change, verify and confirm-signin (token not consumed), the email-change link, and the
  `user.create.before` and `session.create.before` hooks as the backstop for every new account and session, OAuth included;
  in OAuth mode `onAPIError.errorURL` is `/login`, so a refusal lands on `/login?error=not-launched` (R3, T033).
- **The refusal is `403 { error: <message>, code: "not-launched" }`**: `error` holds the message because the cards already show
  `body.error`; redirects use `?error=not-launched`; each refusal logs a masked address (R4, R5).
- **Existing sessions and accounts are untouched** (R6).
No route, migration or dependency added.
The preceding feature is
`specs/20261019-153514-PRODUCTION-EMAIL/plan.md` (research R1–R12, `data-model.md` — one expression index, the
`signin_binding` cookie and the new settings — the HTTP contracts `contracts/api.md` A1–A6, the UI contracts
`contracts/ui-contracts.md` C1–C4, the draft wording `contracts/email-messages.md` M1–M4, and the quickstart validation guide
live alongside it in `specs/20261019-153514-PRODUCTION-EMAIL/`). The requirements report is
`requirements/20261019-153514-production-email/requirements-report.md`: 5 diagrams and 29 findings, all resolved, including the
hand-done SES, DNS, forwarding and alarm setup (RS8, RS10, RS17). Decisions that are easy to get wrong:
- **`ENV_EMAIL_TRANSPORT=ses` is the production signal.** It needs `ENV_SES_REGION`, `ENV_SES_ACCESS_KEY_ID` and
  `ENV_SES_SECRET_ACCESS_KEY`, or `loadConfig` refuses to start; it never falls back to the console. The code default `smtp` keeps
  Mailtrap, or the console without credentials, for reference only; the development templates set `ses` too (TWEAKS01), from `us-east-1` as `no-reply@dev.mail.crowdpoll.vote`, in the sandbox (TWEAKS03, quickstart §6). A test checks that `.do/app.yaml` sets `ses` (R2).
- **nodemailer's own SES transport** over `@aws-sdk/client-sesv2` (HTTPS), so `send()` and the tests' `setTransport` are
  unchanged. `ENV_EMAIL_FROM` replaces `ENV_SMTP_FROM`; `ENV_EMAIL_SEND_TIMEOUT` (10 s) bounds every send by a race (R1, R3, R4).
- **Logs mask recipients** (`j•••@gmail.com`) and carry the message id; never a full address, link or token (R5).
- **One layout, escaped**: `src/email/templates.ts`, inline styles, a hosted `email-logo.png` (written by
  `devScripts/favicon-ico.ts`), a footer naming `support@crowdpoll.vote`, no `Reply-To`, no tracking (R6, R7).
- **The honeypot replies as on success.** A filled `homepage` field on the three emailing endpoints sends nothing and consumes no
  rate limit (R8).
- **Links are bound to their browser by a hash.** `signin_binding` (`Path=/api/auth`, 15 minutes) plus `&bind=hashToken(value)` on
  the link. A mismatch redirects to `/confirm-signin` **without consuming the token**; `POST /api/auth/confirm-signin` checks
  `Origin`, to stop login pushing (R9).
- **`emailKey` is SQL, defined once** (`src/auth/emailKey.ts`), used on both sides, backed by a non-unique expression index
  (migration `008-email-key`). It applies to create-account and email change only; sign-in requests still match exactly (R10).
- **The cookie policy is `session_token` plus strictly necessary security cookies**; the banner stays informational (R11).
One new dependency, one additive migration; production configuration changes.
The preceding feature is
`specs/20261016-172002-FAVICON/plan.md` (research R1–R7, `data-model.md` — two static files, no stored data, no
migration — the UI contracts `contracts/ui-contracts.md` C1–C5, and the quickstart validation guide live alongside it in
`specs/20261016-172002-FAVICON/`). The architecture artifact is `architecture/20261016-172002-site-favicon/architecture.md`:
4 diagrams and 11 findings, all resolved, documented against
`requirements/20261016-172002-site-favicon/requirements.md`. Decisions that are easy to get wrong:
- **No server change.** `favicon.svg` and `favicon.ico` sit in `src/public/`; `build-assets.ts`, `assets.ts`'s href
  rewrite, `publish-assets.ts` and `express.static(publicDir)` (the bare `/favicon.ico`) already handle both (R1, R2).
- **Figures only.** The SVG copies `.brand-logo`'s two figures and mask from `app.js`, without the speech bubble, on a
  transparent `viewBox="10 4.5 96 96"`, titled `CrowdPoll` (R4, NC1).
- **The ICO is generated, never hand-edited.** `npx tsx devScripts/favicon-ico.ts` renders the SVG with headless Edge
  (`FAVICON_BROWSER` overrides the path) at 16, 32 and 48 px and writes PNG-in-ICO itself; it is not part of
  `npm run build`, and `.gitignore` needs `!devScripts/favicon-ico.ts` (R5, U5).
- **`express.static` answers `.ico` as `image/vnd.microsoft.icon`**, Spaces as `image/x-icon`; tests accept both (R2).
No route, configuration, data or migration change; no new dependency.
The preceding feature is
`specs/032-FIXED-POSITION-HEADER/plan.md` (research R1–R9, the in-memory state in `data-model.md` — two CSS custom
properties and one button visibility state, no stored data, no migration — the UI contracts `contracts/ui-contracts.md`
C1–C8, and the quickstart validation guide live alongside it in `specs/032-FIXED-POSITION-HEADER/`). The architecture
artifact is `architecture/032-fixed-position-header/architecture.md`: 6 diagrams and 15 findings, all resolved,
documented against `requirements/032-high-level-requirements-FIXED-POSITION-HEADER.md`. Decisions that are easy to get
wrong:
- **Pin the chrome, not a new wrapper.** `header-fixed-m3.css` sets `position:fixed` directly on `#site-header` and,
  on the one page that has one, `.tab-bar-wrap` — no new wrapping element. `.tab-bar-wrap` is already the containing
  block for its fade overlays and (below 640 px) its absolutely-positioned Hamburger/Refresh row, so pinning the wrap
  pins the row for free; six of the seven pages simply have no `.tab-bar-wrap` to pin (R3).
- **Measured, not fixed, height.** `fixedChrome.js` writes `--fixed-chrome-height-header` and `--fixed-chrome-height`
  (header plus tab-bar-wrap) on `<html>` from a `ResizeObserver`, the same discipline `headerFit.js` uses; `.container`'s
  existing `padding-top` is overridden, never edited, in the new layer to add the reserved space (R2, R4).
- **The header's footprint doesn't change.** It keeps `.container`'s centred column and side padding — no edge-to-edge
  band — so at 1400 px it looks exactly as before; only "stays put while scrolling" is new (R5).
- **Two existing scripts stop assuming `y=0`.** `floatingActions.js`'s `cardArea()` clamp and `tabs.js`'s `maximize()`
  scroll target each read the new `window.FixedChrome.height()` instead of the literal `0`, so neither the guest
  floating buttons nor a maximized card can land underneath the fixed chrome (R6).
- **The Back to Top button has two thresholds, not one** (shows at 600 px scrolled, hides below 400 px), to avoid
  flicker at a single boundary; its icon is an inline SVG arrow (the codebase has no Material Symbols font), and it
  reuses `app.js`'s `--cookie-banner-offset` so it rides above the cookie banner (R7, R8).
No server, route, configuration, data or migration change; no new dependency.
The preceding feature is
`specs/031-SINGLE-ROW-HEADER/plan.md` (research R1–R11, the in-memory state in `data-model.md` — one attribute, no stored data, no
migration — the UI contracts `contracts/ui-contracts.md` C1–C9, and the quickstart validation guide live alongside it in
`specs/031-SINGLE-ROW-HEADER/`). The architecture artifact is `architecture/031-single-row-header/architecture.md`:
6 diagrams and 9 findings, all resolved, documented against
`requirements/031-high-level-requirements-SINGLE-ROW-HEADER.md`. Decisions that are easy to get wrong:
- **Measured, not fixed.** From 640 px up the header is one row (`flex-wrap:nowrap`); `headerFit.js` hides, in order,
  the user name and the header search box, each only while
  `#site-header.scrollWidth > clientWidth`. Every measurement starts from the full header; neither the logo mark nor the word mark ever goes (FIX08), and a guest's buttons take the card Vote button's size and padding from 641 to 900 px so the row fits (R1, R5).
- **The step lives on `<html>`**, as tokens in `data-header-fit`, because `renderSiteHeader` rewrites the header's class and
  contents on every session change. Below 640 px the attribute is removed and feature 030 applies (R3, R8).
- **Overflow must be observable**: header children are `flex-shrink:0` and `nowrap`; only the search box shrinks, to
  `--header-search-min-width` (200 px); the 767.98 px rule that puts the box on its own row is overridden;
  `min-height:56px` stops the tabs jumping (R2).
- **The Create Poll link is only rendered for a user who may create polls** (`canCreatePolls` in `app.js`, a live link
  with a plus icon before the text); a guest and a user without permission have no link, so no step hides it and the
  permission rule is not copied into `headerFit.js` (R5, FIX01, FIX07).
- **Search stays possible**: while the header box is hidden the Search tab field shows (its look moved out of the phone
  block of `single-column-m3.css`) and typed terms are copied both ways through `window.SiteSearch`. `searchTab.js` is
  not edited, and `app.js` only for the Create Poll link and the traced logo mark (R6, R7, R10, FIX10).
No server, route, configuration, data or migration change; no new dependency.
The preceding feature is
`specs/030-INTEGRATE-SINGLE-COLUMN/plan.md` (research R1–R14, the in-memory UI state in `data-model.md` — no stored data, no
migration — the UI contracts `contracts/ui-contracts.md` C1–C10, and the quickstart validation guide live alongside it in
`specs/030-INTEGRATE-SINGLE-COLUMN/`). The architecture artifact is `architecture/030-integrate-single-column-prototype/architecture.md`:
10 diagrams and 19 findings, all resolved, documented against
`requirements/030-high-level-requirements-INTEGRATE-SINGLE-COLUMN-PROTOTYPE.md`; the design source is
`prototypes/SINGLE-COLUMN-RENDERING/`. Decisions that are easy to get wrong:
- **Layers, not edits, two of them.** `header-single-column-m3.css` follows `header-tab-bar-m3.css` on all seven pages
  that have the header; `single-column-m3.css` is last on `index.html` only and sets the `--single-column: 1` marker
  that `pollCard.js` already reads. No production stylesheet is edited. Both hold rules inside
  `@media (max-width: 639.98px)`; the controls the feature adds are `display:none` above it (R1, R3). Feature 031 has since
  moved the tab sizing, arrows, all-tabs button and menu and Refresh row to `max-width: 900px`, shown the logo icon at every
  width and sized the guest buttons like the card Vote button (21 px on a phone); each 030 document carries an
  "Amended by feature 031" note.
- **Two scripts, home page only.** `tabBarScroll.js` (arrows, hold, drag, all-tabs menu; the arrows and the hold were
  removed by feature 20261023-155959-PHONE-TAB-BAR, which left the drag, for mouse and pen, a mouse-wheel handler and the
  menu) and `floatingActions.js` (the guest pair), after `tabs.js`; neither is in the tests' default script list, and each returns at once when its
  elements are missing, and guards `matchMedia` as `m3-ripple.js` does (R2, R4, R13).
- **Arrows are never hidden.** (Removed by feature 20261023-155959-PHONE-TAB-BAR: up to 900 px the row has no arrows; the
  browser scrolls a finger, the script a mouse, pen or wheel, and a 32 px fade marks an edge where tabs wait.) They
  were `aria-disabled` at each end so the tabs never move; a step brings the second tab
  not fully in view flush with the edge (500 ms), a hold (> 300 ms) scrolls at 200 px/s and settles in 200 ms, the time
  step is never negative (the first frame's time stamp can be older than the hold's start) and a hold ends only at the
  end in its direction (R5–R7).
- **The menu selects through the real tab.** An item calls the tab's own `click()`, so a guest's greyed item goes to
  `/login` and `tabs.js` stays untouched (R8).
- **The guest buttons are the header's own nodes**, moved into `#floatingActions` by a `MutationObserver` on
  `#site-header`; the header slot is the source of truth, so a rebuilt header is never duplicated (R9).
- **Search on a phone lives in the Search tab.** The header box is hidden at phone width; the field in `#panel-search` is
  handled entirely inside `searchTab.js` (own ids, a capture-phase `/`), and `app.js` search code is not changed (R10).
- **`app.js` has exactly one edit:** the avatar menu's "Create Poll" item, shown only at phone width, disabled
  (focusable, `aria-disabled`, hint) without `canCreatePolls` — unlike Poll Administration, which stays absent (R11).
- **No explanatory comments are ported** from the prototype (Constitution VI); the prototype folder and its
  `ENV_PROTOTYPES` value stay until the seven-page phone check passes (R12, R14).
No server, route, configuration, data or migration change; no new dependency.
The preceding feature is
`specs/029-MANUAL-BAR-COLORS/plan.md` (research R1–R11, the data model — one optional `color` on each choice, no
migration — the HTTP and UI contracts `contracts/api.md` and `contracts/ui-contracts.md`, and the quickstart
validation guide live alongside it in `specs/029-MANUAL-BAR-COLORS/`). The architecture artifact is
`architecture/029-manual-bar-colors/architecture.md`: 8 diagrams and 9 findings, all resolved, documented against
`requirements/029-high-level-requirements-MANUAL-BAR-COLOR-SETTING.md`. Decisions that are easy to get wrong:
- **A colour lives on the choice, not in a column.** `color?: string` (the palette hex) on each element of
  `polls.choices`; absent means Automatic; no migration. Choice ids are reissued on every save, so colours travel
  with the labels in the same request, paired **before** empty labels are dropped (R2, R3).
- **One palette, server side**, `src/polls/barPalette.ts`, sent to the browser as `barPalette` in `/api/config`; it
  is separate from the 50 automatic colours in `pollCard.js`. A colour is accepted if it is in the palette **or**
  already stored on the poll, compared case-insensitively, stored upper case (R1, R3).
- **The palette index rule.** In `assignResultColors` every choice that does not read as yes or no advances the
  index, manual colour or not; a yes or no choice never does. That is what keeps every Automatic bar exactly
  where it is when another choice is coloured (R6).
- **The automatic palette is a base list that grows.** `RESULTS_PALETTE_ENTRIES` in `pollCard.js` holds 14 colours; `expandPalette` repeats it to `choiceBounds.maxChoices` (`ENV_MAX_CHOICES`), adding an entry when the last would equal the first, and each card passes its palette to `paletteOffsetFor`/`assignResultColors` (FIX03).
- **One derivation for every colour.** Yes/No, palette and manual colours all get a 90% tint (80% over the dark surface) and `inkOnFillFor` text, which is white or black: the colour listed in `TEXT_ON_FILL_OVERRIDES`, else the higher contrast. Yes/No are `#006120` / `#F91010`.
- **The card draws any valid hex**: `barColorsOf(hex)` derives and caches on a miss; the closed `BAR_COLORS` lookup
  would have thrown. A stored value that is not `#RRGGBB` is drawn as Automatic (R6, R9).
- **Six circles**: Who, Title, Choices, **Colors**, How, When. Every step-number literal in `adminCard.js` moves
  (`[1..6]`, the Settings Summary links, `answered.add(6)`, `lockStep`, `buildStepPanel`) and `admin.css` becomes
  `repeat(6, 1fr)` with an 8.333% line inset (R7).
- **Colours after votes**: `colors` joins `UPDATE_FIELDS`; when colours are the only change on a poll with votes the
  card posts `POST /api/admin/polls/:pid/colors`, which copies the edit-session release's guard, sets colours by
  position, restores `pollStateBeforeEditUpdate` and clears the session in one conditional write: no review, no
  `AWAITING APPROVAL`. Opening the card still takes the edit session, so voting pauses while it is open (R4).
- **Labels bring colours**: a request with `labels` and no `colors` replaces the choices with none coloured, so the
  card always sends `colors` whenever it sends `labels` (R7).
- **The picker has no palette in the stylesheet**: swatches take their colour from an inline `--swatch`; the stylesheet
  holds only Material 3 tokens, and `m3-assets.test.ts` pins each page's sheets (R8).
- **The colour reaches cards through `projectPoll` and `deltaClient.js`**, which rebuilds each card's choices and must copy 
  `color`; `computeResults` and so the exports do not carry it. Trending and Newest publish and refetch their cards object when 
  `cardsVersion` (a hash of `pid:contentVersion`) changes, not only when the set of polls does, so a colour change reaches them 
  within a recompute plus the CDN `max-age`; the delta-driven tabs show it on the next content refresh (FIX01).
No migration, no new dependency; the one new route is behind `requireOwnPoll`.
The preceding feature is
`specs/028-FILE-MANIFEST/plan.md` (research R1–R16, the data model — in memory only — the command and report
contracts `contracts/cli.md` and `contracts/reports.md`, and the quickstart validation guide live alongside
it in `specs/028-FILE-MANIFEST/`). The architecture artifact is
`architecture/028-file-manifest-script/architecture.md`: 7 diagrams and 10 findings, all resolved, documented
against `requirements/028-high-level-requirements-FILE-MANIFEST-SCRIPT.md`. Decisions that are easy to get
wrong:
- **Git decides what is ignored.** Three `git ls-files -z` calls (tracked, untracked, ignored), run with an
  argument array and no shell; `node_modules`, `node-modules` and `manifests` are dropped by first path
  component in the script (R1).
- **`npm run` starts in the package root**, so a relative project path resolves from `INIT_CWD` (R10).
- **Binary = a zero byte in the first 8,000 bytes; lines = `\n` bytes plus one for an unterminated last
  line**, counted on the bytes (R2, R3).
- **A comment line holds nothing but a comment.** The scanner tests block openers before line markers and
  keeps scanning after code, so `code /* start` still opens a block; strings are not parsed (R4).
- **Every report is a filter over one list of measured files**, not a keyed accumulator (R5).
- **Case folding is detected without writing a file** by testing a case-swapped listed path (R7); the run
  folder is created last, non-recursively, so its name is claimed atomically (R9).
- **One file, `devScripts/file-manifest.ts`**: `.gitignore` ignores `devScripts/*` except named scripts, so it
  needs `!devScripts/file-manifest.ts`; `main()` runs only when the file is the entry point (R11, R15).
No server, route, configuration, data or migration change; no new dependency.
The preceding feature is
`specs/027-ADMIN-SEARCH-MATERIAL3/plan.md` (research R1–R10, the radio-group data, the UI contracts C1–C6
and the quickstart live alongside it in `specs/027-ADMIN-SEARCH-MATERIAL3/`). The architecture artifact is
`architecture/027-admin-search-material3/architecture.md`: 7 diagrams and 11 findings, all resolved,
documented against `requirements/027-high-level-requirements-admin-search.md`. Decisions that are easy to get
wrong:
- **One geometry rule.** `.poll-admin-card, .admin-search` share the card's container rules in `admin.css`,
  both media queries included, so the panel and the cards cannot drift (R1).
- **Outlined fields, not the cards' underlined ones.** FR-005 asks for outlined 56px fields; the wizard
  inside the cards stays underlined (R2).
- **Every id, `name` and button class is preserved**, so `readSearchForm()` and the search request are
  untouched; the old `.admin-search-row` wrappers go (R3).
- **Visibility, choice mode and vote mutability are radio groups** (Any, then the two choices, one row each) that keep the old selects' `name`s and values, so `FormData` and `readSearchForm()` are unchanged; the panel carries its own radio rules because the card wizard's `.m3-radio` rules are scoped to `.poll-admin-card`. Every field is always shown: the More filters disclosure was removed by FIX01 (R4, R5).
- **`m3-assets.test.ts` allowlists each page's sheets**: `admin-search-m3.css` goes after `admin-card-m3.css`
  in `LAYER_ORDER` and on `admin.html`; no literal font size, no dark twins (R10).
- **The search panel collapses** by `#adminSearchToggle` (a `data-collapsed` attribute, in memory only; `paintTabs()` owns `hidden`, so collapsing is separate); it collapses only after a user-run search leaves result cards, never on the timed refresh, and a click on the Search view tab expands it (FIX05, FIX07, R14).
- **The Search view shows no message before a search** (FIX02); **the read-only admin card shows `Created By: <username> (<email>)`** above its dates, from `createdByName`/`createdByEmail` on the admin list rows, the email looked up per page by `creatorEmails()` and not stored on the poll (FIX04, R12).
No route, configuration, data or migration change; the only server change is two fields on the admin list rows.
The preceding feature is
`specs/026-HOME-PAGE-TABS/plan.md` (research R1–R12, the data model — no schema change — the HTTP
contracts `contracts/api.md`, the UI contracts C1–C8 and the quickstart validation guide live alongside
it in `specs/026-HOME-PAGE-TABS/`). The architecture artifact is
`architecture/026-home-page-tabs/architecture.md`: 7 diagrams and 17 findings, all resolved, documented
against `requirements/026-high-level-requirements-HOME-PAGE-TABS.md`. Decisions that are easy to get wrong:
- **The shared-link flow already existed, in the browser.** `tabs.js` kept `?PID=` in `localStorage` and
  called `POST /api/me/polls/:pid/link`; the requirements' "the server redirects `/?PID=` to `/`" was stale.
  026 moves the decision to the server (`resolveSharedLink`, run while serving `GET /`) and deletes the
  client hand-off and that route (R1, R2).
- **A "view" is the existing `linked` relation, not a new `viewed` value** — existing rows carry over and
  no migration is needed (R1).
- **The poll id rides in URLs and the emailed link only** — `/login?PID=` → `pid` on the request →
  magic-link `metadata` → `&PID=` on verify → `/?PID=`; never `localStorage`, never a cookie; a validated
  UUID, redirects built by the server (R3).
- **One outcome for every "not shown" case**: `/?notice=unavailable`. A guest's `/?PID=` always redirects to
  sign-in before any lookup (R2).
- **Tabs are `your-polls`, `shared-with-you`, `your-votes`, `watching`**; `private`/`favourites` and their
  routes are retired; `bookmark` stays in routes, tables and callbacks (R10).
- **`mayWatch` is one rule** (`src/polls/access.ts`) for the bookmark route (`404` on false), the Watching
  query and the overlay; Watching keeps the row and hides the poll when access is lost (R6, R7).
- **The placeholder is redacted on the server** before any projection or count call (R5); `updatePoll`
  deletes dropped `invited` rows and Shared With You also checks the live invite list (R4, R8).
- **A linked poll outside the tab's rows mounts as a 021 retained card** from `GET /api/me/polls/:pid` (R9).
No configuration change, no schema change.
The preceding feature is
`specs/025-user-permissions/plan.md` (research R1–R9, the data model for the one new `permissions`
column, the admin API changes A1–A7, the UI contracts C1–C6 and the quickstart validation guide
live alongside it in `specs/025-user-permissions/`). The architecture artifact is
`architecture/025-user-permissions/architecture.md`: 7 diagrams, and one inconsistency, one
ambiguity, three unspecified aspects and one needs-clarification item, all resolved, documented
against `requirements/025-high-level-requirements-USER-PERMISSIONS.md`. Decisions that are easy to get
wrong:
- **Two predicates, not a new gate.** `canReachAdmin` (admin, or both `Create Poll` and
  `View Polls`) and `canActOnPoll` (that, plus owning the poll) generalize the single existing
  `isAdminEmail`/`createRequireAdmin` seam rather than adding per-route checks; a poll that isn't
  the caller's own answers `404`, never `403` (R3).
- **`GET /api/admin/polls` keeps one query path.** `listAdminRows` gains an optional creator-id
  filter; a non-admin's own-polls-only list and an admin's full list are the same function (R4,
  A1).
- **The vote and view-permission checks both skip guests structurally**, not via a special case:
  both sit after each call site's existing signed-in check, so a guest never reaches the new code
  (R5, R6).
- **Losing `View Polls` blocks bookmarking and subscribing to Live Results, not just their
  display** — resolved by `/speckit-clarify` on 2026-10-04, the one spec-level gap the
  architecture pass didn't catch (R6, A7).
- **Two different "reach `/admin`" links.** The home page header's long-inert "Create Poll" link
  becomes live for `Administrator` or (`Create Poll` + `View Polls`); the avatar menu's
  admin-only "Poll Administration" link is untouched (R7, C1–C2).
- **`permissions` is not declared to BetterAuth** (its Kysely adapter cannot store arrays) — it is
  read in the same query the session cache already runs on a cache miss, and cached with the
  session (R1).
- **One additive migration, no backfill**: `permissions text[] NOT NULL DEFAULT
  ARRAY['View Polls','Vote on Polls','Create Poll']` with a containment `CHECK`, not an equality
  one (R2).
No configuration change; one additive schema migration, no backfill.
The preceding feature is `specs/024-MATERIAL3-MERGE/` (plan, research R1–R26, the data model with
the page × file matrix, the UI contracts C1–C15, the admin API changes A1–A5 and the quickstart
validation guide live alongside it in `specs/024-MATERIAL3-MERGE/`). The architecture artifact is
`architecture/024-material3-merge/architecture.md`: 11 diagrams, and the findings of two passes,
all resolved into `requirements/024-high-level-requirements-MATERIAL3-MERGE.md`. The design source is
`prototypes/POLL-CARD-MATERIAL3/`. Its decisions still hold:
- **Layers, not rewrites.** `m3-tokens.css` loads first on all seven pages, the production sheets
  stay as they are (fixes excepted), and one M3 layer per area loads last. A port drops the
  layer's token sections, its `@media (prefers-color-scheme: dark)` blocks until Step 5, literal
  font sizes and every `M3:` / REQUIREMENT comment (Constitution VI) (R1, R2, R15).
- **Six steps committed on branch `024-MATERIAL3-MERGE` (Steps 1–5 as one commit), and one PR
  into `dev` after Step 6; `dev` gets 024 once.** Step 1
  (tokens, ripple, Roboto) changes nothing visible; the tooltips are Step 2's. Dark is opt-in via
  `data-theme="dark"` until Step 5, which adds the `@media` twins and gives `admin.html` /
  `admin-results.html` `data-theme="light"` (R13).
- **`window.M3Ripple.add(selector)`**, called as `window.M3Ripple?.add(…)` by `app.js`, `tabs.js`,
  `liveResults.js`, `adminCard.js` and `pollCard.js`; `m3-ripple.js` is the first script. The
  `.m3-ripple` rules live in `m3-tokens.css` (R3, R4).
- **Tooltips adopt every `title` into `data-tooltip`**; rows only when cut off. The default jsdom
  script list does not load `tooltip-m3.js`; tooltip tests opt in (R5).
- **Bar colours are four custom properties** (`--bar-track`, `--bar-ink`, `--bar-track-dark`,
  `--bar-ink-dark`); light = 022 exactly, dark ink ≥ 7:1; the `pollCard.js` edit and
  `pollCard-m3.css` merge together (R11).
- **Guest tabs are `aria-disabled`, not `disabled`**; `confirmDiscard()` returns
  `Promise<boolean>`; the idle prompt is not `aria-modal` (R8, R10).
- **Step 6, the admin cards, ports `ADMIN-CARDS/`** (`admin-card-m3.css`, `adminCard.js`,
  `admin.css`): one wizard for new and existing polls replaces the edit face. A poll takes the
  new-poll wizard (Cancel / Save / Publish) when its *worded* state is INITIALIZED (EDITING reads
  `pollStateBeforeEditUpdate`), never by the harness's `cardType`. Create New Poll calls
  `controller.openWizard()`; `focusPen` is `focusSummary` (R18–R20).
- **Step 6's five server changes, and no others:** `POST /api/admin/polls/:pid/save` (keeps the
  poll INITIALIZED; allows an empty title and fewer than `ENV_MIN_CHOICES` choices; never
  screens); `keywords` threaded through `Poll`/store/`validatePollFields` (public only, `a-z0-9`
  and single spaces, ≤ 200, frozen with votes; the column already existed); `createDefaultPoll`
  → `Dynamic-Vote Poll` while visibility stays `Public Poll`; `adminListRow` +
  `pollStateBeforeEditUpdate`, `keywords` (R21–R24, `contracts/admin-api.md`); `/publish`'s
  starter-choices hold only for an effectively INITIALIZED poll (R28).
- **Follow-ups (R27, R29):** a card holding a new poll's saved progress (`hasSavedProgress()`) is
  kept by `adminList.js` across view switches; `admin.css` keeps no rule that only the removed
  editing face used.
No configuration or database change; Steps 1–5 make no server change.
Before it, `specs/022-BAR-COLORS/` (plan, research R1–R7; architecture
`architecture/022-bar-colors/architecture.md`). Its decisions still hold:
- **Only the starting palette entry changes.** `paletteOffsetFor(pid)` = 32-bit FNV-1a over the
  poll id's UTF-16 code units (`Math.imul`, `>>> 0`) mod `RESULTS_COLOR_PALETTE.length`; `0` for a
  missing id. Computed once in `initPollCard` and passed to `renderPollResults` →
  `assignResultColors(data, paletteOffset)`, whose cursor starts there and wraps (R1–R4).
- **Colours still follow display order (rank)**, not the choice (architecture NC-1, Option A).
  Yes/No keep `#018826` / `#CF0234` and consume no entry. `BAR_COLORS`, tints, inks and the
  clipped copy are untouched and follow the fill (R3, R5).
- **Tests use fixed poll ids** (`poll-fifty` → 25, `poll-agree` → 39, `poll-colours-a` → 40,
  `poll-colours-b` → 21) and an independent reference hash in the test (R7).
No server, route, contract, configuration or database change.
Before it, `specs/021-MAXIMIZED-POLL-CARD/` (plan, research R1–R11; architecture
`architecture/021-maximized-poll-card/architecture.md`). Its decisions still hold:
- **The view moves the tab's own card instance.** It does not mount a copy. The card stays in the
  grid's `mounted` map, so votes, bookmarks and deltas keep reaching it, and its face and
  `pendingSelection` travel with it (R1).
- **Sizing is a layout function passed to `renderPollResults` / `renderVotingOptions`.** It is
  today's measured `computeBarLayout` for the grid card, and `maximizedBarLayout(count)` (50→25 px
  linear over `minChoices`..`maxChoices` from `/api/config`, 2 px gap, never scrolling) for the
  maximized one. No-scroll CSS overrides are scoped under `.maximized-card-flip` (R2, R3).
- **Maximized classes are added beside `card-viewport` / `card-flip`, never substituted.** The
  markup comes from one `<template id="maximizedCardGrid">` in `index.html` (R4, R5). The width
  floor is `min(375px, 100%)` (R6).
- **One `maximized` in `tabs.js`, closed in four places:** `select()`, a click on the already
  active tab (restore only: no `activate()`, no token), the session subscription, and an Escape
  listener that ignores `[aria-modal="true"]` dialogs and typing (R7).
- **Trending and Newest pass `retainMaximized: true`.** A dropped poll stays shown until closed,
  and `patchRetained` keeps its votes and star working. Every other tab closes at once. The
  browser cannot tell a deletion from a recompute on those two tabs (R8).
- **Colours on every card.** The research page's 50 light xkcd fills (entries 1–2 restored to
  `#98EFF9` / `#FFE5AD`), ink = `darkShadeOf(fill)` precomputed into a `Map` (≥ 7:1), no halo.
  Yes/No are `#018826` / `#CF0234` on an 85% tint, with a white `.result-ink-on-fill` copy whose
  `clip-path` is set wherever the fill width is set and transitions with it (0.9 s). This matters
  on the in-place path too. `textStyleFor`, `majorityBackground` and the 0.40 threshold are deleted.
  `RESULTS_TRACK_COLOR` and the fill's trailing edge stay (R10).
021 made no server, route, contract, configuration or database change either.
Before it, `specs/020-LIVE-RESULTS-X/` (the Live Results removal control is one
`.live-link` in two forms, chosen by `removeMode = typeof opts.onClose === "function"`. The
closed and editing rules hide it only in add form, and it has a keydown handler for Enter and
Space. `liveResults.js` places focus after a removal from the index captured before
`DeltaClient.apply`. The corner `.card-close-btn` was deleted), with its architecture at
`architecture/020-live-results-x/architecture.md`.
Before it, `specs/019-NEWEST-POLL-TAB/` (the Newest tab: `polls.launched_at`
stamped in `updatePoll` on every entry into OPEN except a return from EDITING and cleared on
CLOSED, no backfill; the partial index `polls_home_launched`; `recomputeNewest` beside
`recomputeTrending`; `createListingPublisher(store, intervalMs, objects)` with `NEWEST_OBJECTS`;
`newestSweep` on lock 10 with `runAtStart`; the instance routes under `/api/trending/`;
`newest.js` as `trending.js`'s twin; `ENV_MAX_NEWEST_POLLS` and
`ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL`), with its architecture at
`architecture/019-newest-poll-tab/architecture.md` and two follow-up fixes in its `fix.md` (the
admin card's `Start` reads `started` only while a poll is OPEN, and a `Launched` field now
precedes `Start`/`End`; a third fix — Newest not refreshing itself while open — is deferred to a
future requirement). Before it, `specs/018-TAB-BAR/` (icons, the full-bleed rule under the row,
Title Case labels) and `specs/017-SEARCH-AND-SCALABILITY-DATABASE/` (PostgreSQL through Kysely,
Valkey counters and queue, OpenSearch, the two-object TRENDING publication, the three load
bounds; its 29 follow-up fixes are in `fix.md` there), with its architecture at
`architecture/017-search-scalability-database/architecture.md`. 017's decisions still govern
everything under the tab bar: counters are never written to a poll row per vote — `HINCRBY
cnt:<pid>` and a flush sweep (2 s then, 10 s since feature 20261028), every reader uses the live
`seq` (R7, R8); every vote takes one path and is never refused for load (R4); per-instance
shedding, the budget controller and CPU autoscaling interlock at three speeds (R11, R12); the membership version hashes the set of
ids (R10); a full Live Results tab refuses a further poll with `409 live-cap` (FIX028);
Bookmark is "Favorites" in the UI only — routes, tables and identifiers keep the old word
(FIX026). Before 017: `specs/016-POLL-SETTINGS-CHANGE/` (three-field visibility;
`isInvitationOnly()` is a two-field test taking the poll). Stored enumerations remain verbatim.
Prior implemented features are documented in
`specs/001-user-auth/`, `specs/002-smtp-env-config/`, `specs/003-profile-menu-consolidation/`,
`specs/004-realtime-poll-voting/`, `specs/005-admin-page-improvements/`,
`specs/006-poll-choices-editor/`, `specs/007-closed-state/`, `specs/008-POLL-CARD-BACK-SIDE/`,
`specs/009-POLL-CHOICE-COLORS/`, `specs/010-ZERO-VOTE-TEXT-LEGIBILITY/`,
`specs/011-SIMPLIFY-POLL-STATES/`, `specs/012-ADMIN-REVISIONS/`, `specs/013-UI-UX-revisions/`,
`specs/014-poll-edit-card/`, `specs/016-POLL-SETTINGS-CHANGE/`,
`specs/017-SEARCH-AND-SCALABILITY-DATABASE/`, `specs/018-TAB-BAR/`,
`specs/019-NEWEST-POLL-TAB/`, `specs/020-LIVE-RESULTS-X/`, `specs/021-MAXIMIZED-POLL-CARD/` and
`specs/022-BAR-COLORS/`.
<!-- SPECKIT END -->

## Project Overview

CrowdPoll: a real-time opinion-poll site built in TypeScript (Node ≥ 22, ESM) with Express 5, PostgreSQL (Kysely) and BetterAuth, designed to serve very large audiences from a small autoscaled fleet. `README.md` describes the user-facing behaviour; `ARCHITECTURE.md` the deployment and request/vote/refresh paths. Sign-in is **passwordless**: a one-time magic link by email (Amazon SES + nodemailer, in development as in production), or, by `ENV_SIGNIN_METHOD`, the social providers (Google, Apple, Microsoft, Amazon) exclusively (`oauth`) or beside the email link (`both`).

Sessions persist via a single `session_token` cookie (httpOnly, secure, sameSite=lax, up to 30 days). The cookie policy is `session_token` plus strictly necessary security cookies: the only others are `signin_binding` (httpOnly, secure, sameSite=lax, `Path=/api/auth`, 15 minutes), which binds an emailed sign-in link to the browser that requested it, and `oauth_state` (httpOnly, secure, sameSite=lax, 5 minutes), set only during a provider sign-in to protect it against forgery. The Privacy Policy (`/privacy`, with its Cookie Use
section `/privacy#cookies`) and the Terms of Service (`/terms`) are linked from a footer on every page; an account must accept
the current Terms (`TERMS_VERSION`) before it can be used, and a user can delete their account from the Profile page.

**Target deployment**: DigitalOcean App Platform (one autoscaled Web Service, 4–12 dedicated instances, spec in `.do/app.yaml`) with Managed PostgreSQL, Managed Valkey, Managed OpenSearch and Spaces + CDN, deployed from the `main` branch of `https://github.com/roadraceresults/crowdpoll`. Autodeploy is off (`deploy_on_push: false`): pushing `main` deploys nothing, and each build and deploy is started by hand from the App Platform console's "Actions" dropdown. Development needs PostgreSQL only: the in-process cache/queue, PostgreSQL full-text search and instance-served TRENDING stand in for the other services.

## Current State

Every feature in the Spec Kit block above is implemented; the newest is listed first there.

Layout:
- `src/server.ts` builds one `AppContext` (session cache, load budget/floors/shedding, publishers, search, vote
  consumer, Live Results registry) and mounts the routers; migrations run at start-up (`migrateToLatest`), and the
  background sweeps (`src/polls/sweeps.ts`, each on its own advisory lock number) start beside it. `src/config.ts`
  validates every `ENV_*` once (`loadConfig`, `ConfigError`).
- Server areas: `auth/` (BetterAuth, session cache, allowlist, `emailKey`), `polls/` (store, service, access rules,
  sweeps), `votes/` (queue → batched consumer), `cache/` (one interface: `memoryCache` in dev/tests, `valkeyCache` in
  production), `search/` (OpenSearch or PostgreSQL full-text, fed by an outbox), `trending/` (Trending/Newest
  recompute and publish), `load/`, `live/`, `refresh/`, `invitations/`, `legal/`, `email/`; routes in `routes/`
  (`api.ts` auth/profile, `pollsApi.ts` polls and votes, `tabsApi.ts` home tabs, `pages.ts` HTML pages).
- `src/db/migrations/NNN-*.ts` are registered in `src/db/migrations/index.ts`; schema types are in `src/db/schema.ts`.
- `src/public/` is the browser client: plain HTML, vanilla JS and CSS with no framework and no bundler; Material 3
  styling is layered as `*-m3.css` sheets after the production ones.
- `tests/`: Vitest + supertest + embedded-postgres (each suite gets its own database; files run sequentially) and
  jsdom for client scripts (`client-*.test.ts`, via `tests/helpers/browser.ts`). `*.integration.test.ts` skip unless
  the real service URL (e.g. `ENV_VALKEY_URL`) is set.
- `devScripts/` is git-ignored except named scripts (`.gitignore` needs a `!devScripts/<file>` line for each new one);
  `launch.json.example` and `devScripts.example/launch-dev.ps1` are the templates for the git-ignored local copies.

Commands:

```
npm run dev     # tsx watch src/server.ts (needs ENV_* env; use devScripts/launch-dev.ps1)
npm run build   # tsc + devScripts/build-assets.ts (dist/public with fingerprinted copies under assets/)
npx tsc --noEmit    # type-check only (there is no linter)
npm start       # node dist/server.js
npm test        # vitest run — all suites under ./tests on an embedded PostgreSQL; no local services needed
npx vitest run tests/auth.test.ts      # one file
npx vitest run -t "name of the test"   # tests matching a name
npm run reconcile       # recompute vote counters from the votes table (operator use)
npm run publish-assets  # push fingerprinted assets to Spaces
npm run file-manifest   # file manifest reports (feature 028)
npm run prototypes      # serve prototypes/ locally
```

New features still flow through the Spec Kit workflow below.

## Spec Kit Workflow

Features flow through these skills in order:

```
/speckit-research   → creates research/research-requirements-<###-feature-name>.md (not always used)
/speckit-requirements   → creates requirements/<number>-<short-name>/architecture.md beside its requirements.md
/speckit-specify   → creates specs/<###-feature-name>/spec.md
/speckit-clarify   → asks targeted questions to close spec gaps
/speckit-plan      → produces plan.md, research.md, data-model.md, contracts/
/speckit-tasks     → generates tasks.md
/speckit-analyze   → cross-artifact consistency check
/speckit-analyze-findings → resolves spec gaps and inconsistencies
/speckit-implement → executes the tasks
/speckit-tweak      → implements tweaks to the codebase, with optional automated tests (frequently used)
```

Spec Kit is configured with the **PowerShell** script variant (`.specify/scripts/powershell/`) — the developer's primary environment is Windows 11, so generated dev tooling (e.g. `launch-dev.ps1`) targets PowerShell.

## Environment Variables

All runtime configuration comes from `ENV_*` environment variables:

| Variable | Dev default | Description |
|---|---|---|
| `ENV_PORT` | `8080` | HTTP port for the web app |
| `ENV_PUBLIC_ORIGIN` | `http://localhost:8080` (templates) | The one origin the site is reached at, no path (`https://crowdpoll.vote` in `.do/app.yaml`); required — the app refuses to start without it. Every sign-in provider redirect URI is built from it |
| `ENV_DATABASE_URL` | `postgres://localhost:5432/app01` | PostgreSQL connection string (the managed pool's URL in production) |
| `ENV_DATABASE_CA_CERT` | unset | PEM of the CA that signed the database server's certificate (DigitalOcean: the database component's `CA_CERT`). Set → the connection is verified against it and `sslmode` is dropped from the URL; unset → `pg` verifies against the system roots, which fails against a managed database. `\n` pairs are read as line breaks |
| `ENV_VALKEY_URL` | unset | Valkey URL; unset → the in-process cache/queue/registry (development and tests). A remote host beside a `localhost` `ENV_DATABASE_URL` stops the app: a local server on a shared Valkey would trade votes and counter flushes with production and drop them |
| `ENV_OPENSEARCH_URL` | unset | OpenSearch endpoint; unset → PostgreSQL full-text search |
| `ENV_SPACES_BUCKET`, `ENV_SPACES_REGION`, `ENV_SPACES_KEY`, `ENV_SPACES_SECRET`, `ENV_SPACES_CDN_URL` | unset | Where the TRENDING objects and static assets are published; all five or none; unset → served from the instance |
| `ENV_ADMINS` | `roadraceresults@gmail.com` | Comma-separated identifiers allowed on admin pages |
| `ENV_PROTOTYPES` | unset | Comma-separated folders of `prototypes/` served, unlisted and `noindex`, at `/prototypes/<name>/` (temporary). Unset → none, and those addresses answer `404`. Letters, digits, `_` and `-` only |
| `ENV_MAX_SIGNIN_COOKIE_DURATION` | `2592000000` | Max stay-signed-in duration (ms; 30 days); the login card shows it as whole days (hours below a day) |
| `ENV_STAY_SIGNED_IN` | `0` | `1` → the login page's "Stay signed in on this device" box starts ticked; any other value, or none, leaves it clear |
| `ENV_SIGNIN_METHOD` | `native` | `native` (email magic link), `oauth` (the sign-in providers only) or `both`; `oauth` and `both` need at least one provider below |
| `ENV_OAUTH_GOOGLE_CLIENT_ID`, `ENV_OAUTH_GOOGLE_CLIENT_SECRET` | unset | Sign in with Google (secrets). A provider is on only when all its values are set; some but not all stops the app, naming the missing one |
| `ENV_OAUTH_APPLE_CLIENT_ID`, `ENV_OAUTH_APPLE_TEAM_ID`, `ENV_OAUTH_APPLE_KEY_ID`, `ENV_OAUTH_APPLE_PRIVATE_KEY` | unset | Sign in with Apple: the Services ID, team, key id and the `.p8` key's PEM (`\n` pairs read as line breaks); the app signs Apple's client secret itself and renews it every 30 days |
| `ENV_OAUTH_MICROSOFT_CLIENT_ID`, `ENV_OAUTH_MICROSOFT_CLIENT_SECRET` | unset | Sign in with Microsoft (personal, work and school accounts) |
| `ENV_OAUTH_AMAZON_CLIENT_ID`, `ENV_OAUTH_AMAZON_CLIENT_SECRET` | unset | Login with Amazon. Production: all `ENV_OAUTH_*` values are encrypted console variables, never in `.do/app.yaml` (`contracts/provider-setup.md`) |
| `ENV_SCREENING_CALL_TIMEOUT` | `10000` | Bound on one Acceptability Screening call (ms) |
| `ENV_POLL_APPROVAL_SWEEP_INTERVAL` | `5000` | How often polls awaiting approval are swept (ms) |
| `ENV_POLL_DATE_CHECK_SWEEP_INTERVAL` | `60000` | How often poll schedules are re-evaluated (ms) |
| `ENV_POLL_EDIT_HEARTBEAT_INTERVAL` | `10000` | How often an open editing page signals it is present (ms) |
| `ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS` | `10` | Screening attempts before a poll is rejected for an admin to retry |
| `ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL` | `5000` | Admin poll list refresh interval (ms), distinct from the above |
| `ENV_EMAIL_TRANSPORT` | `smtp` | `smtp` (the `ENV_SMTP_*` sandbox, or console logging without credentials; kept for reference) or `ses` (Amazon SES over HTTPS; production and the development templates). With `ses` the three `ENV_SES_*` values are required and the app refuses to start without them |
| `ENV_SES_REGION` | unset | SES region: `ca-central-1` in production, `us-east-1` in the development templates; required with `ses` |
| `ENV_SES_ACCESS_KEY_ID`, `ENV_SES_SECRET_ACCESS_KEY` | unset | The SES sending user's access key (secrets); required with `ses` |
| `ENV_SMTP_HOST`, `ENV_SMTP_PORT` | `sandbox.smtp.mailtrap.io`, `2525` | SMTP server for `smtp` (no longer in the development templates) |
| `ENV_SMTP_USER`, `ENV_SMTP_PASS` | unset | SMTP credentials for `smtp`; unset → each message is logged to the console instead of sent |
| `ENV_EMAIL_FROM` | `CrowdPoll <no-reply@mail.crowdpoll.vote>` | Sender of every message (replaces `ENV_SMTP_FROM`, which is no longer read); the development templates use `no-reply@dev.mail.crowdpoll.vote` |
| `ENV_EMAIL_SEND_TIMEOUT` | `10000` | Longest one send may take (ms) before it counts as failed |
| `ENV_EMAIL_ASSET_ORIGIN` | unset | Origin the email logo is loaded from, no path; unset → the link's origin. The development templates set `https://crowdpoll.vote`, because a mail app's image proxy cannot reach `localhost` |
| `ENV_ALLOWED_EMAILS` | unset | Pre-launch allowlist: comma-separated addresses allowed to create an account and sign in, compared by email key; `ENV_ADMINS` addresses always are. Unset or empty → off (everyone). An invalid entry stops the app; startup logs only the count. Production: an encrypted App Platform variable set in the console, never in `.do/app.yaml`; the templates carry it empty |
| `ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES` | `15` | Rate-limit window for email-sending endpoints, in **minutes** (not ms or seconds, unlike the intervals above) |
| `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW` | `2` | Requests allowed per client in that window. Lower the window and raise this while testing sign-in — the defaults lock you out for 15 minutes after two login links |
| `ENV_MAX_INVITATIONS_PER_DAY` | `200` | Invitation and reminder emails one poll creator may send in any rolling 24 hours, counted across all their polls; what does not fit waits as `Not sent yet` and goes as the window frees up. Lower it (e.g. `3`) to see the limit while testing |
| `ENV_MAX_PRIVATE_POLL_VOTERS` | `100` | Voter ceiling on a private poll — both the limit a blank field means and the largest value enterable. Lower it (e.g. `10`) to fill a test poll in a few votes |
| `ENV_PARTICIPANTS_VIEWPORT_SIZE` | `10` | Rows per page in the poll card's `Participants` and `Banned Voter List` sections. Lower it (e.g. `3`) to make paging visible with a handful of participants |
| `ENV_MIN_CHOICES` | `2` | Fewest choices a poll may be published with |
| `ENV_MAX_CHOICES` | `50` | Most choices a poll may be published with; the choices editor caps its lines at this. Lower it (e.g. `5`) to exercise the ceiling without typing fifty lines. Must be ≥ `ENV_MIN_CHOICES` |
| `ENV_SESSION_CACHE_TTL` | `300000` | How long a session lookup is served from the cache (ms); never past the session's own expiry |
| `ENV_MAX_POLLS_SEARCH_RESULTS` | `200` | Cap on home search results, personal-tab rows and overlay ids per request |
| `ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS` | `200` | Cap on admin search results and on the unfiltered admin list (newest first, with a cut-off notice) |
| `ENV_MAX_TRENDING_POLLS` | `200` | Polls in the TRENDING tab |
| `ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL` | `60000` | How often TRENDING is recomputed and published (ms); also the browser copy's lifetime. The CDN `max-age`, and the wait before Refresh is offered, is the smaller of it and 10 s |
| `ENV_MAX_NEWEST_POLLS` | `50` | Polls in the Newest tab; must not exceed `ENV_MAX_POLLS_SEARCH_RESULTS` |
| `ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL` | `60000` | How often Newest is recomputed and published (ms; at least 1000); also the browser copy's lifetime. The CDN `max-age`, and the wait before Refresh is offered, is the smaller of it and 10 s |
| `ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE` | `1` | Current share (whole percent) a choice must hold to be drawn on the maximized view's line graph; `0` draws every choice |
| `ENV_LINE_GRAPH_REFRESH_INTERVAL` | `60000` | How often an open line graph refetches its series (ms); also the server-side cache TTL per poll. Clamped up to `ENV_MIN_LIVE_REFRESH_INTERVAL` |
| `ENV_MIN_LIVE_REFRESH_INTERVAL` | `2000` | Floor between two Live Results refreshes from one user (ms) |
| `ENV_MIN_MANUAL_REFRESH_INTERVAL` | `5000` | Floor between two manual tab refreshes from one user (ms) |
| `ENV_MIN_SEARCH_REFRESH_INTERVAL` | `2000` | Floor between two searches from one user (ms) |
| `ENV_MIN_VOTE_REFRESH_INTERVAL` | `2000` | Floor between two votes from one session, across all polls (ms) |
| `ENV_MANUAL_REFRESH_BURST` | `5` | Manual-kind requests (tab clicks, Refresh, bookmarks, the overlay call) one user may make back to back before the manual floor applies; one comes back per floor interval. `1` is the plain floor |
| `ENV_SEARCH_BURST` | `3` | The same allowance for searches. Live Results and votes are always one per interval |
| `ENV_MAX_VOTES_PER_IP_PER_MINUTE` | `600` | Votes from one address per minute before `429 ip-vote-cap` and the `[abuse]` alert line |
| `ENV_MAX_LIVE_RESULTS_PER_USER` | `5` | Polls in the Live Results tab; a sixth is refused (`409 live-cap`) until one is removed |
| `ENV_LIVE_RESULTS_MAX_IDLE_TIME` | `1800000` | Idle time before the Live Results tab asks whether to continue (ms). Lower it (e.g. `60000`) to see the prompt in a minute |
| `ENV_SERVER_MAX_REQUESTS_PER_INSTANCE_PER_SECOND` | `1250` | Dynamic requests per second each live instance adds to the effective budget |
| `ENV_SERVER_MAX_REQUESTS_PER_SECOND` | `15000` | Cap on the effective budget. Must be ≥ the per-instance value |
| `ENV_SERVER_MAX_SEARCH_PER_SECOND` | `2000` | Search-engine queries per second (cache hits excluded) before searches are stretched |
| `ENV_SERVER_MAX_SEARCH_FALLBACK_PER_SECOND` | `200` | The same bound while PostgreSQL full-text search serves |
| `ENV_BUDGET_CONTROLLER_SWEEP_INTERVAL` | `1000` | Controller tick (ms). Must not exceed the smallest floor |
| `ENV_MAX_REFRESH_AND_SEARCH_STRETCH` | `8` | Largest multiplier on the search and manual floors; Live Results is uncapped |
| `ENV_BUDGET_LOWER_THRESHOLD_PERCENT` | `80` | Load below this share of the budget lets the controller lower multipliers |
| `ENV_INSTANCE_MAX_INFLIGHT` | `200` | Requests in flight on one instance before it sheds |
| `ENV_INSTANCE_MAX_EVENT_LOOP_LAG` | `100` | Event-loop lag (ms) before an instance sheds |
| `ENV_SHED_RETRY_AFTER` | `2000` | `Retry-After` handed out with a `503` (ms) |
| `ENV_COUNTER_FLUSH_SWEEP_INTERVAL` | `10000` | How often live vote counters are written to poll rows (ms); nothing a visitor sees reads them, the tabs read the live counters |
| `ENV_INVITATION_SWEEP_INTERVAL` | `30000` | How often pending invitation emails of open polls are picked up (ms); saving an open poll sends its new invitations at once |
| `ENV_VOTE_BATCH_SIZE` | `500` | Votes the consumer inserts per batch |
| `ENV_VOTE_QUEUE_LAG_NOTICE` | `2000` | Consumer lag (ms) above which a vote response says `queued` |
| `ENV_SEARCH_CACHE_TTL` | `10000` | How long an identical search is answered from the cache (ms) |
| `ENV_OUTBOX_DRAIN_SWEEP_INTERVAL` | `15000` | How often changed polls are pushed to the search index (ms) |
| `ENV_MAX_BOOKMARKS_PER_USER` | `200` | Bookmarks per user before `409 bookmark-cap` |
| `ENV_BOOKMARK_EXPIRY_MONTHS` | `6` | Months after a poll closes, or after its last activity, before its bookmarks are removed |
| `ENV_PAGE_LOADS_PER_MINUTE` | `120` | Page loads per session (or address, for guests) per minute before `429 too-many-loads` |

Dev defaults are set in `.vscode/launch.json` and `devScripts/launch-dev.ps1` — both are **git-ignored** by design; regenerate them locally rather than committing them.

## Key Design Documents

- `requirements/<number>-<short-name>/requirements.md` — a feature's high-level requirements, in a folder of its own
  with the images and support files it uses (e.g. `requirements/20261016-172002-site-favicon/requirements.md`);
  `/speckit-requirements` moves a requirements document into this form and writes its `architecture.md` beside it. Features before it keep the older flat form,
  `requirements/###-high-level-requirements-XXXXX-XXXXX-XXXXX.md` — the complete spec: auth flows, `Profile` data model, cookie policy, client pages, deployment env vars, and required deliverables (`launch.json`, `devScripts/launch-dev.ps1`, `postman/openapi.json`)
- for example, `requirements/014-high-level-requirements-poll-edit-card.md` is the file containing the High Level Requirements for the Poll Edit Card feature
- `requirements/constitution-prompt.md` — input for `/speckit-constitution`; the working principles: state assumptions before coding, minimum code that solves the problem, surgical changes only, and verifiable success criteria for every task

## Architecture Notes

- **Auth phases**: The native→OAuth switch is a first-class design constraint. Email address is stored on the `Profile` in both phases — user-editable in the native phase, provider-supplied and read-only after the switch to OAuth — while avatars and identity come from the OAuth provider post-switch. Keep the auth layer behind BetterAuth's abstractions so the switch is a configuration change, not a rewrite.
- **Profile model**: `clientId`, `clientSecret`, `userName` (≤200 chars), `emailAddress` (native: user-editable, ≤200 chars; OAuth: provider-supplied, read-only, no app-imposed limit), `profileAvatar` (system default for native, provider-supplied for OAuth).
- **Cookie banner**: informational only ("I Understand" button) with a Cookie Use link to `/privacy#cookies` — `session_token`, `signin_binding` and `oauth_state` are strictly necessary, so no consent flow is needed and no other cookies may be added. A new cookie or browser storage key must also be added to the Cookie Use table in `privacy.html`; `tests/cookie-use-list.test.ts` fails otherwise.
- **API contract**: endpoints must be described in `postman/openapi.json`, which is used to generate docs and client SDKs — keep it in sync with route changes.
