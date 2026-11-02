# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
The full description, every earlier feature's decisions and the settings table are in `CLAUDE_COMPLETE.md`, for developers.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/20261101-181626-USER-ADD-CHOICES/plan.md` (research R1–R12, `data-model.md` — one `polls` column,
`voters_add_choices`, added by migration `015-voters-add-choices`, and `Choice.addedBy`; the HTTP contracts
`contracts/api.md` A1–A5, the UI contracts `contracts/ui-contracts.md` C1–C5, and the quickstart live alongside it in
`specs/20261101-181626-USER-ADD-CHOICES/`). The requirements report is
`requirements/20261101-181626-user-add-choices/requirements-report.md`: 4 diagrams and 16 findings, all resolved.
Decisions that are easy to get wrong:
- **Voters add through `POST /api/polls/:pid/choices`**, shed as `vote`, with its own bucket
  (`enforceFloor("vote", "choice")`) so a vote right after an addition is not too soon (R2, R3, clarification Q2).
- **Only while the raw `pollState` is OPEN with no `pending_update`**, checked under the row lock in `appendChoice`;
  the projection's OPEN-while-EDITING is not enough (R5, R7).
- **The limit is `WIZARD_CHOICE_MAX` (40)**, moved to `src/polls/service.ts` and sent as `wizardChoiceMax`;
  duplicates compare ignoring case and spacing; screening runs in the request, never via `pending_update` (R6, R8).
- **`addedBy` is admin-only**: never in `PollProjection`; not recorded on anonymous polls; cleared on account deletion
  and when a poll turns anonymous (R9, clarification Q1).
- **The creator's save sends `baseChoiceIds`**, and stored choices not listed are kept (R10).
One additive migration, no new dependency or setting; one route, one browser module, one stylesheet.
The preceding feature is
`specs/20261101-150208-ADAPTIVE-Y-AXIS/plan.md` (research R1–R7, `data-model.md` — the axis top, step and mapping derived
per draw, nothing stored — the UI contracts `contracts/ui-contracts.md` C1–C4, and the quickstart live alongside it in
`specs/20261101-150208-ADAPTIVE-Y-AXIS/`). The requirements report is
`requirements/20261101-150208-adaptive-y-axis/requirements-report.md`: 3 diagrams and 6 findings, all resolved.
Decisions that are easy to get wrong:
- **The top is chosen in the browser**, in `lineGraph.js` `renderSvg()`, from the drawn series of the scale shown
  (`state.data.series`): the smallest of 25, 50, 75, 100 at or above the highest point; no line → 25 (R1, R2).
- **Gridlines every 5, 10 or 15% for a 25, 50 or 75% top; every 25% for 100%**, so a 100% graph is unchanged (R3).
- **No stored top**: every `renderSvg()` call (mount, scale switch, refresh, resize) derives it again (R4).
- **One mapping**: `y` uses the top, and `view.y` carries it to the crosshair markers; tooltip and live region keep the
  real percentages (R5).
- **POLL-LINE-GRAPH contract C5 is amended** ("0% to 25, 50, 75 or 100%, … five or six gridlines") (R6).
No server, route, configuration, data or migration change; no new dependency.
<!-- SPECKIT END -->

## Project Overview

CrowdPoll: a real-time opinion-poll site in TypeScript (Node ≥ 22, ESM) with Express 5, PostgreSQL (Kysely) and
BetterAuth, built to serve very large audiences from a small autoscaled fleet. `README.md` describes the user-facing
behaviour; `ARCHITECTURE.md` the deployment and the request, vote and refresh paths.

- **Sign-in is passwordless**: an emailed magic link (Amazon SES + nodemailer), or by `ENV_SIGNIN_METHOD` the social
  providers (Google, Apple, Microsoft, Amazon) only (`oauth`) or beside the link (`both`).
- **Sessions**: one `session_token` cookie (httpOnly, secure, sameSite=lax, up to 30 days). The only other cookies are
  `signin_binding` (`Path=/api/auth`, 15 min) and `oauth_state` (5 min). An account must accept the current Terms
  (`TERMS_VERSION`) before use; `/privacy` and `/terms` are linked from every page.
- **Deployment**: DigitalOcean App Platform (one autoscaled Web Service, `.do/app.yaml`) with Managed PostgreSQL, Valkey,
  OpenSearch and Spaces + CDN, from `main` of `https://github.com/roadraceresults/crowdpoll`; autodeploy is off, each
  deploy is started by hand. Development needs PostgreSQL only: in-process cache/queue, PostgreSQL full-text search
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
- Production secrets (`ENV_OAUTH_*`, `ENV_ALLOWED_EMAILS`, keys) are encrypted console variables, never in `.do/app.yaml`.
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
- Every path that creates an account, a session or sends a sign-in email checks `isAllowed` (`src/auth/allowlist.ts`).
- `emailKey` is defined once in SQL (`src/auth/emailKey.ts`); its TypeScript twin `emailKeyOf` is tested to agree.
- Logs never carry a full email address, link or token (`maskAddress`, `maskIp`).
- No third-party request from a page: fonts are committed `woff2` files under `src/public/fonts/`.
- A new cookie or browser storage key needs a Cookie Use row in `privacy.html` (`tests/cookie-use-list.test.ts`).
- `postman/openapi.json` follows the routes.
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
