# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
The full description, every earlier feature's decisions and the settings table are in `CLAUDE_COMPLETE.md`, for developers.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/20261101-121236-POPULATE-ALL-POLLS/plan.md` (research R1–R11, `data-model.md` — one git-ignored local file,
`devScripts/populate/populate-all-polls-history.json`, nothing in the database — the CLI contract `contracts/cli.md`
C1–C5, and the quickstart live alongside it in `specs/20261101-121236-POPULATE-ALL-POLLS/`). The requirements report is
`requirements/20261101-121236-populate-all-polls/requirements-report.md`: 4 diagrams and 13 findings, all resolved.
Decisions that are easy to get wrong:
- **`npm run populate-poll <file>`** runs the unchanged population; only `resolveDataPath` is new (relative to
  `INIT_CWD`, and `<path>.json` tried when the path has no extension and does not exist) plus the npm usage line (R2, R3).
- **Each file is a child process**, `process.execPath --import tsx populate-poll.ts <absolute file>`, no shell; its
  output is piped through live and unchanged, and its `[populate] Done: poll <id> <outcome>` and `Votes written:` lines
  are parsed; exit 0 without them is a failure, `populated, but its summary could not be read` (R4, R5).
- **Skip = same database identity, file name and SHA-256**; the identity is `ENV_DATABASE_URL` with its password
  removed, read from `process.env` (no `loadConfig` in the parent); a success replaces the (database, file) entry and
  the file is written by temp-file-and-rename after each success (R6–R8).
- **`.json` files directly in the folder, name order**; default `<project root>/polldata`; failures are logged, not
  recorded, listed again after `[populate-all] Done: …`, and make the exit code 1 (R9, R10).
- `populate-poll` never reads or writes the history; `.gitignore` needs `!devScripts/populate/populate-all-polls.ts`.
No server, route, configuration, data or migration change; no new dependency.
The preceding feature is
`specs/20261101-042151-CONCISE-CLAUDE-MD/plan.md` (research R1–R12, `data-model.md`, the contracts
`contracts/command.md` K1–K6, `contracts/file-layout.md` F1–F3 and `contracts/messages.md` M1–M2, and the quickstart,
all in that folder). Decisions that are easy to get wrong:
- **One skill, `/speckit-concise-claudemd`**, instructions only; `disable-model-invocation: true`, no argument (R1, R2).
- **The first run copies this file byte for byte to the complete file**, then writes the concise file and
  `.claude/rules/environment.md` (R3).
- **"New since the last run" is the git diff of this file against the last commit touching the complete file**; hand
  removals are carried over unless the complete file has uncommitted changes; nothing is added twice (R4).
- **A feature is known by its plan path**; a pointer-only block is rebuilt from that `plan.md` (R5).
- **The complete file is named once in backticks, never imported**; no size limit is written anywhere (R6).
- **No shipped Spec Kit file changes** (R9).
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
npm run populate-poll <file>          # create or refresh one demonstration poll from a data file
npm run populate-all-polls [<dir>]    # populate every new or changed data file of a folder (default polldata/)
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
