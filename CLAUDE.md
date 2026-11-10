# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
The full description, every earlier feature's decisions and the settings table are in `CLAUDE_COMPLETE.md`, for developers.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/20261110-123524-WHO-VOTED-REPORT/plan.md` (research R1–R9, `data-model.md` — no migration; the `votes` read,
the `VoterReport` value and the panel states; the HTTP contract `contracts/api.md` A1–A2, the UI contracts
`contracts/ui-contracts.md` C1–C4, and the quickstart live alongside it in `specs/20261110-123524-WHO-VOTED-REPORT/`).
The requirements report is `requirements/20261110-123524-who-voted-report/requirements-report.md`: 3 diagrams and
14 findings, all resolved.
Decisions that are easy to get wrong:
- **Names travel only on `GET /api/me/polls/:pid/voters`**, `private, no-store`, never in card, tab or delta payloads;
  `404` unless a published private poll with `vote_anonymity = "No"` that the caller passes `mayViewResults` on, or an
  administrator; names only, never an address (R1–R3, NC1, NC2).
- **Its own floor bucket**: `enforceFloor("live", "voters")`, not `dynamic("live")`, which would take Live Results' token (R1).
- **No projection field**: the browser asks only for maximized `Private Poll` OPEN/CLOSED polls, and a `404` stops it
  until `contentVersion` changes; a new projection field would not reach polls whose cached copy is unchanged (R5).
- **`settleMs`** is sent when the live counters count a vote the batched consumer has not written yet; the browser
  refetches once after it (R4).
- **Bar order** is `pct` descending, ties by `position`, as the card's bars; groups are `<tbody>`s with a
  `<th scope="rowgroup">`; names go in as text, never `innerHTML` (R6, R7).
No migration, setting, cookie, storage key or dependency; one route, one script, one sheet.
The preceding feature is
`specs/20261109-201638-ALLOWLIST-DOMAIN-WILDCARD/plan.md` (research R1–R7, `data-model.md` — no migration; the
`Allowlist` value `{ keys, patterns }` and the admission rule; the contract `contracts/allowlist-setting.md` S1–S3, and the
quickstart live alongside it in `specs/20261109-201638-ALLOWLIST-DOMAIN-WILDCARD/`). The requirements report is
`requirements/20261109-201638-allowlist-domain-wildcard/requirements-report.md`: 3 diagrams and 12 findings, all resolved.
Decisions that are easy to get wrong:
- **`config.allowlist` replaces `allowedEmailKeys`** and is set whenever the list holds any entry, so a pattern-only list
  turns test mode on; every "is the allowlist on?" check reads it (R1, R6).
- **A pattern is an entry holding `*`**, valid when address-shaped (one `@`, something each side; `*@*` is valid);
  `*.crowdpoll.vote` stops the app (R2, IN1, AM1).
- **Matched literally against the email key**, `*` → `[^@]*`, the rest escaped; the pattern is not normalised, so
  `john.*@gmail.com` matches no Gmail address (R3, UA7).
No migration, setting, route or dependency; one config value, one matcher, one log line.
The preceding feature is
`specs/20261109-114330-POLL-NOTES/plan.md` (research R1–R14, `data-model.md` — migration 018; the `polls.notes`
column, the redefined `search` column and `pending_update.notes`; the HTTP contracts `contracts/api.md` A1–A7, the UI
contracts `contracts/ui-contracts.md` C1–C5, and the quickstart live alongside it in `specs/20261109-114330-POLL-NOTES/`).
The requirements report is `requirements/20261109-114330-poll-notes/requirements-report.md`: 3 diagrams and 23 findings,
21 resolved and 2 no longer applicable.
Decisions that are easy to get wrong:
- **Stored format**: plain text with `**bold**`, `*italic*`, `++underline++` and `\` escapes; unbalanced marks show as
  typed; one server module, `src/polls/notes.ts`, renders it (escape all, then four tags) (R1, R2).
- **Payloads**: the projection and admin list rows carry `notesPreviewHtml`/`hasMoreNotes`; only the one-card routes
  and the admin details carry `notesHtml`; only those two fields ever reach `innerHTML` (R4, R6).
- **6000 counts UTF-16 units**, like every field (R3). **No stash**: in UPDATE mode notes join `pending_update` (R7).
- **The editor** (`notesEditor.js`, `contenteditable`, one `execCommand` wrapper) loads `notesHtml` and writes through
  `serialize`; it never parses the stored format (R5). **The line graph mounts into `.maximized-graph`** (R9).
No route, setting, cookie or dependency; one migration, one module, one script.
The preceding feature is
`specs/20261109-083912-POPULATE-OLDEST-AGE/plan.md` (research R1–R7, `data-model.md` — no migration; the optional
`oldest_age_in_days` key of a poll data file; the contract `contracts/data-file.md` D1–D3, and the quickstart live
alongside it in `specs/20261109-083912-POPULATE-OLDEST-AGE/`). The requirements report is
`requirements/20261109-083912-populate-oldest-age/requirements-report.md`: 3 diagrams and 6 findings, all resolved.
Decisions that are easy to get wrong:
- **A key of the data file, spelled `oldest_age_in_days`**, not a command-line option; `populate-all-polls` does not
  change, a changed key changes the file's SHA-256 (AM1, AM2).
- **Filter after `shiftDates`**: keep a point when its calendar day ≥ today − N (inclusive; `0` keeps today only); the
  kept points set the poll's dates and the 12-month note (R3, R4).
- **A whole number ≥ 0, validated in `parsePollData`**; `null`, `"30"`, `2.5`, `-1` are input errors (R2).
No migration, setting, route or dependency; one key, one function, one log line.
Before it came
`specs/20261108-193031-SNACKBAR-HOURGLASS/plan.md` (research R1–R10, `data-model.md` — no migration; the
`SIGN_IN_NOTICE_MS` constant and the notice's markup; the UI contracts `contracts/ui-contracts.md` C1–C5, and the
quickstart live alongside it in `specs/20261108-193031-SNACKBAR-HOURGLASS/`). The requirements report is
`requirements/20261108-193031-snackbar-hourglass/requirements-report.md`: 3 diagrams and 10 findings, all resolved.
Decisions that are easy to get wrong:
- **An inline SVG built by `app.js`**, not an image file: only inline SVG takes the M3 colour tokens and the sheet's
  animation, and it rides on the CDN-served script and sheet with no extra request (R1, RS2).
- **One clock**: `SIGN_IN_NOTICE_MS` (7000) ends the notice and reaches the sheet as `--m3-snackbar-timer`; the
  animation hangs on `m3-snackbar--timed`, never on `is-shown`, so the fade does not refill the sand (R4).
- **The resting pose is full**, so reduced motion is just `animation:none` (R3, R5).
No migration, setting, route, cookie, file or dependency; one constant, one function, one sheet.
Then, before that,
`specs/20261105-162941-MULTIPLE-ACCOUNT-PREVENTION/plan.md` (research R1–R12, `data-model.md` — one migration, `019-device-events`;
the stream fields, the cache key and the settings; the contracts `contracts/api.md` A1–A5 and `contracts/ui-contracts.md` C1–C6, and the
quickstart live alongside it in `specs/20261105-162941-MULTIPLE-ACCOUNT-PREVENTION/`). The requirements report is
`requirements/20261105-162941-multiple-account-prevention/requirements-report.md`: 4 diagrams and 16 findings, all resolved.
Decisions that are easy to get wrong:
- **Collection only**: nothing refuses, warns or changes a count on a fingerprint; analysis and response are later features (IN1).
- **`FingerprintJS.load({ monitoring: false })` always**: the vendored npm build otherwise calls the vendor on 0.1% of loads (R2).
- **Two values**: `visitorId`, and a hardware hash with **no GPU or `deviceMemory`**, because browsers do not report them alike, and Firefox reports no GPU to the library (R3).
- **Raw values are never queued**: the web process HMACs them; a missing or malformed header never touches the vote (R4–R6).
- **Vote events are taken in `writeBatch` before votes collapse** to one per participant (R6).
- **Sign-in due is a response header on `/api/me`**, not a body field: `sameSnapshot` compares every body field; while collecting `/api/me` is `no-store`, because a `304` keeps a browser's stored headers (R7).
- **Off by default**; the terms gate stops collection before acceptance; rows go with the account and the poll, not with a ban (R10, R11).
One migration, one route, two settings, no npm dependency; one vendored file, one script.
The preceding feature is
`specs/20261105-161242-SOCIAL-LOGIN-AVATAR/plan.md` (research R1–R10, `data-model.md` — migration 017; the
`profile_avatar_hash` column, the `avatar_removals` queue and the Spaces object; the HTTP contracts `contracts/api.md`
A1–A3, the UI contracts `contracts/ui-contracts.md` C1–C6, and the quickstart live alongside it in
`specs/20261105-161242-SOCIAL-LOGIN-AVATAR/`). The requirements report is
`requirements/20261105-161242-social-login-avatar/requirements-report.md`: 3 diagrams and 20 findings, all resolved.
Decisions that are easy to get wrong:
- **Google only**: a `hooks.after` on `/callback/:id` reads the fresh `idToken` from the `account` row;
  not `overrideUserInfoOnSignIn`, which rewrites name and email. Amazon's login has no picture (R1, RS1).
- **The image lives in Spaces, not the database**: `avatars/<random>`, public-read, private bucket; `profileAvatar`
  holds the key and `avatarUrl` gives the API the CDN URL; no route, no Terms gate entry (R10, NC1, IN1).
- **`Cache-Control` is one day**, because that also bounds how long a deleted picture stays reachable (R3).
- **Upload, then one transaction**; every path that stops using an object queues its key there, and a sweep deletes
  it (R5, R6, UA9). A failure at any step never stops the login.
- **Stay logged in reaches a provider login through `additionalData`**, read back with `getOAuthState` in the callback
  hook; no cookie or URL parameter carries it (TWEAK10).
- **`signedIn=1` on the provider `callbackURL`** drives the snackbar; `app.js` removes it, and `acceptTermsCard.js`
  takes it out of `next` (R7).
- **Change a document's date in `src/legal/version.ts`**: `TERMS_VERSION` is the later of `TERMS_UPDATED` and
  `PRIVACY_UPDATED`, the pages' dates are filled in from them when served (`{{PRIVACY_UPDATED}}`), and the Accept Terms
  notice compares each with the version the account accepted (TWEAK14, TWEAK17).
No setting, route, cookie or dependency; one migration, one sweep, one sheet, a new `TERMS_VERSION`.
Before that came
`specs/20261104-180032-LEGAL-PAGE-UPDATES/plan.md` (research R1–R8, `data-model.md` — no migration; the shared policy
version and the `history.state.legalDepth` step count; the UI contracts `contracts/ui-contracts.md` C1–C6, and the
quickstart live alongside it in `specs/20261104-180032-LEGAL-PAGE-UPDATES/`). The requirements report is
`requirements/20261104-180032-legal-page-updates/requirements-report.md`: 3 diagrams and 10 findings, all resolved.
Decisions that are easy to get wrong:
- **The section is "Bot and AI Agent Detection"** but keeps `id="bot-check"`, which `humanCheck.js` links to; "In short"
  and the retention row are renamed; "Bot check" appears nowhere (C1, UA1).
- **A new `TERMS_VERSION`** (the release date) on both pages; every account accepts once; no 30-day email (R8, NC1).
- **The Back arrow shows only for a same-origin `document.referrer` and `history.length > 1`** (no arrow in a new tab),
  decided once at load; it goes `history.go(-(legalDepth + 1))`, past in-page anchor steps (R1, R2, clarification Q1).
- **Fixed under the header in line with the logo** (a wrapper built like `#site-header`), text gutter
  `max(0px, calc(56px - (100% - 72ch) / 2))` on narrow screens; the look is `back-arrow-m3.css`, shared with the admin
  link (`admin-back-link back-arrow`) (R3–R5, clarification Q2).
- **The Up arrow was centred on every page** (R7, AM1); social-login-avatar's TWEAK07 moved it to the container's left edge.
No migration, route, setting or dependency; one constant, one script, one sheet.
And before that
`specs/20261103-114927-PROVISION-FCAPTCHA-SERVICE/plan.md` (research R1–R14, `data-model.md` — no migration; the
Terraform resources, inputs, git-ignored files and the switch-over states; the contracts `contracts/infra-config.md`
C1–C5 and `contracts/deploy-command.md` D1–D3, and the quickstart runbook live alongside it in
`specs/20261103-114927-PROVISION-FCAPTCHA-SERVICE/`). The requirements report is
`requirements/20261103-114927-provision-fcaptcha-service/requirements-report.md`: 3 diagrams and 27 findings, all resolved.
Decisions that are easy to get wrong:
- **`infra/` (Terraform) is the only description of the hosting**; `.do/app.yaml` is deleted; plugins pinned exactly
  (`digitalocean/digitalocean` 2.106.0, `hashicorp/random` 3.9.1), lock file committed (R1, IN5).
- **A fresh stack with today's names**, after the old one is deleted once in the console; test data is not kept (UA9, UA10).
- **App Platform bindings are escaped** in HCL: `"$${valkey-tor1-crowdpoll.DATABASE_URL}/1"`, never `"${...}"` (R3).
- **Secrets**: outside values in the git-ignored `infra/secrets.auto.tfvars` (validated non-empty at plan time);
  FCaptcha's two secrets are `random_password`, the verify secret shared by `web` and `fcaptcha`; the local state
  holds them in plain text (R4, UA7).
- **Releases** use `npm run deploy` (`devScripts/deploy-app.ts`; `DIGITALOCEAN_TOKEN`, API, no `doctl`); autodeploy stays off (R11).
No migration and no npm dependency; Terraform and two plugins, only in `infra/`.
Earlier still,
`specs/20261103-120521-HOME-TAB/plan.md` (research R1–R14, `data-model.md` — no migration; the `home:<emailKey>`
membership, the five rules, the date windows and `ENV_HOME_TAB_REFRESH_INTERVAL`; the HTTP contracts `contracts/api.md`
A1–A3, the UI contracts `contracts/ui-contracts.md` C1–C6, and the quickstart live alongside it in
`specs/20261103-120521-HOME-TAB/`). The requirements report is
`requirements/20261103-120521-home-tab/requirements-report.md`: 4 diagrams and 18 findings, all resolved.
Decisions that are easy to get wrong:
- **No sweep**: Home's membership is built on demand and cached per user as `home:<emailKey>` with the `tabs:v` list
  version it was built under, TTL = the interval (2 h); a changed version (`forgetTabs`) rebuilds it (R1, R6).
- **One candidate query** over `user_polls ⨝ polls`; first matching rule wins; caps 10/10/10/all/10; rule 5 is the
  cached TRENDING listing's order, no database read (R2, R4).
- **Date windows by state**: OPEN by `launched_at` ≤ 2 months, CLOSED by `closed_at` ≤ 7 days (closing clears
  `launched_at`), WAITING TO OPEN always; drafts, rejected and archived never (R3).
- **`keepOrder`**: after a vote or watch on a Home card the browser sends it until Home is next opened, so the card does
  not jump; access is still re-checked on every refresh (R5, R6, clarification Q2).
- **Hidden, not disabled, for guests**; Home is the logged-in landing tab and the avatar menu's first item;
  `relations` adds `created` ("Your poll") and `trending` ("Trending") (R7, R9, R10, clarification Q1).
No migration, dependency or sweep; one route, two settings (`ENV_HOME_TAB_REFRESH_INTERVAL`, `ENV_MAX_HOME_PAGE_POLLS`).
Before those,
`specs/20261102-144053-FCAPTCHA-AND-SEO/plan.md` (research R1–R15, `data-model.md` — no migration; the pass, the
`ENV_FCAPTCHA_*` settings, the indexable-poll rule and the sitemap cache; the HTTP contracts `contracts/api.md` A1–A6,
the UI contracts `contracts/ui-contracts.md` C1–C5, and the quickstart live alongside it in
`specs/20261102-144053-FCAPTCHA-AND-SEO/`). The requirements report is
`requirements/20261102-144053-fcaptcha-and-seo/requirements-report.md`: 4 diagrams and 17 findings, all resolved.
Decisions that are easy to get wrong:
- **FCaptcha is a second App Platform service**, `fcaptcha` (`fcaptcha-server/`, `@webdecoy/fcaptcha` pinned 1.46.1),
  reached by browsers at `/fcaptcha` through ingress and by `web` at `${fcaptcha.PRIVATE_URL}`; Valkey db 1 (R1, R2).
- **The check is one page with two views**: `humanCheck.js` gates `/login`, `/create-account` (not token mode) and
  `/invite`; the pass lives in page memory only, no cookie or storage key (R7, clarification Q1).
- **The pass travels in `X-Human-Check`**, verified by `requireHumanCheck` before honeypot, allowlist, rate limit and
  email; its `action` is the page and must match the route (R3, R4, clarification Q2).
- **Fail open only when FCaptcha is unreachable**, counted as `abuse.humanCheckSkipped`; a missing pass while it is
  reachable is `400 challenge-required`; the page falls back after 10 s (R5, clarification Q3).
- **Indexable = public and OPEN or CLOSED** (EDITING by its stashed state); `/poll/:pid` serves `index.html` with
  escaped head tags and summary, then `tabs.js` mounts the live card via guest `GET /api/polls/:pid/card` (R9–R11).
No migration; one dependency, only in `fcaptcha-server/`; four settings, off by default.
<!-- SPECKIT END -->

## Project Overview

CrowdPoll: a real-time opinion-poll site in TypeScript (Node ≥ 22, ESM) with Express 5, PostgreSQL (Kysely) and
BetterAuth, built to serve very large audiences from a small autoscaled fleet. `README.md` describes the user-facing
behaviour; `ARCHITECTURE.md` the deployment and the request, vote and refresh paths.

- **Login is passwordless**: an emailed magic link (Amazon SES + nodemailer), or by `ENV_SIGNIN_METHOD` the social
  providers (Google, Apple, Microsoft, Amazon) only (`oauth`) or beside the link (`both`).
- **Sessions**: one `session_token` cookie (httpOnly, secure, sameSite=lax, up to 30 days). The only other cookies are
  `signin_binding` (`Path=/api/auth`, 15 min) and `oauth_state` (5 min). An account must accept the current Terms
  (`TERMS_VERSION`) before use; `/privacy` and `/terms` are linked from every page.
- **Deployment**: DigitalOcean App Platform (`web` and `fcaptcha`) with Managed PostgreSQL, Valkey and Spaces + CDN,
  described by Terraform in `infra/` (no `.do/app.yaml`), from `main` of `https://github.com/roadraceresults/crowdpoll`;
  autodeploy is off, each release is started with `npm run deploy`. Development needs PostgreSQL only: in-process cache/queue, PostgreSQL full-text search
  and instance-served TRENDING stand in for the rest.

## Layout

- `src/server.ts` builds one `AppContext` and mounts the routers; migrations run at start-up (`migrateToLatest`); the
  background sweeps (`src/polls/sweeps.ts`) each take their own advisory lock number.
- Server areas: `auth/`, `polls/` (store, service, access rules, sweeps), `votes/` (queue → batched consumer), `cache/`
  (`memoryCache` in dev/tests, `valkeyCache` in production), `search/` (OpenSearch or PostgreSQL full-text, fed by an
  outbox), `trending/`, `load/`, `live/`, `refresh/`, `invitations/`, `legal/`, `email/`; routes in `routes/` (`api.ts`,
  `pollsApi.ts`, `tabsApi.ts`, `pages.ts`).
- `src/db/migrations/NNN-*.ts` are registered in `src/db/migrations/index.ts`; schema types in `src/db/schema.ts`.
- `src/public/`: plain HTML, vanilla JS and CSS, no framework, no bundler; Material 3 is layered as `*-m3.css` sheets
  after the production ones.
- `tests/`: Vitest + supertest + embedded-postgres (a database per suite, files run sequentially) and jsdom for client
  scripts (`client-*.test.ts`, via `tests/helpers/browser.ts`); `*.integration.test.ts` skip without the real service URL.
- `devScripts/` is git-ignored except named scripts; `launch.json.example` and `devScripts.example/launch-dev.ps1` are
  the templates for the git-ignored local copies.

## Commands

```
npx tsc --noEmit    # type-check only (there is no linter)
npm test        # vitest run — all suites under ./tests on an embedded PostgreSQL; no local services needed
npx vitest run tests/auth.test.ts      # one file
npx vitest run -t "name of the test"   # tests matching a name
```

## Configuration rules

- Every setting is an `ENV_*` variable, validated once by `loadConfig` in `src/config.ts` (`ConfigError`); an invalid
  value, or a renamed setting's old name, stops the app.
- Intervals are in ms, except `ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES`.
- The development templates (`.vscode/launch.json`, `devScripts/launch-dev.ps1`) are git-ignored; regenerate them from
  the `.example` files rather than committing them.
- Production secrets (`ENV_OAUTH_*`, `ENV_ADMINS`, `ENV_ALLOWED_EMAILS`, keys) are in the git-ignored `infra/secrets.auto.tfvars`, never in a
  committed file.
- The full table is in `.claude/rules/environment.md`.

## Cross-feature invariants

- Vote counters are never written to a poll row per vote: `HINCRBY cnt:<pid>` and the counter flush sweep; readers use
  the live counters.
- Every writer or deleter of `vote_history` keeps the line-graph tally in its transaction (`recordLineGraphTally`,
  `rebuildLineGraphTally` after deletions).
- Every write to `user_polls`, `poll_invitations` or `poll_bans` calls `forgetTabs` after commit; a deleted poll deletes
  its `poll:<pid>` projection.
- A field that must not bump `content_version` joins `NON_CONTENT_FIELDS` (e.g. `pending_update`).
- While a poll is `EDITING`, `projectPoll` publishes the stashed state, so voter-facing readers see it as before the
  edit; edit-session and admin code reads the raw `pollState`.
- Choices on an ever-voted poll change by id via `mergeChoices`; `replaceChoices` is for never-voted polls only.
- Poll access is decided by `src/polls/access.ts` (`mayWatch`, `mayViewResults`); a poll the caller may not see, or does
  not own on an admin route, answers `404`, never `403`.
- The terms gate runs before every router: a new `/api/*` route is refused before acceptance unless listed there.
- Every path that creates an account, a session or sends a login email checks `isAllowed` (`src/auth/allowlist.ts`).
- `emailKey` is defined once in SQL (`src/auth/emailKey.ts`); its TypeScript twin `emailKeyOf` is tested to agree.
- Logs never carry a full email address, link or token (`maskAddress`, `maskIp`).
- No third-party request from a page: fonts are committed `woff2` files under `src/public/fonts/`.
- A new cookie or browser storage key needs a Cookie Use row in `privacy.html` (`tests/cookie-use-list.test.ts`).
- `postman/openapi.json` follows the routes.
- Poll notes reach HTML only through `src/polls/notes.ts`; in the browser only `notesPreviewHtml` and `notesHtml` (and
  the editor's own DOM-built copy) may be assigned to `innerHTML`.
- A path that stops using an `avatars/` object queues its key in the same transaction (`queueAvatarRemoval`); only the
  removal sweep deletes it.
- A new dev script needs a `!devScripts/<file>` line in `.gitignore`.
- `m3-assets.test.ts` pins each page's stylesheets (`LAYER_ORDER`); M3 layers hold only M3 tokens, no literal font sizes.
- Bookmark is "Favorites" in the UI only; routes, tables and identifiers keep `bookmark`; stored enumerations stay verbatim.

## Architecture Notes

- **Auth phases**: the native → OAuth switch is a configuration change, not a rewrite; keep auth behind BetterAuth's
  abstractions. The email lives on the profile in both phases (user-editable natively, provider-supplied after).
- **Cookie banner**: informational only ("I Understand", Cookie Use link to `/privacy#cookies`); the three cookies are
  strictly necessary, so no consent flow and no other cookies.
- **API contract**: endpoints are described in `postman/openapi.json`, used to generate docs and client SDKs.

Spec Kit uses the PowerShell scripts (`.specify/scripts/powershell/`).
