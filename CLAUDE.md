# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
The full description, every earlier feature's decisions and the settings table are in `CLAUDE_COMPLETE.md`, for developers.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
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
- **Releases** use `npx tsx devScripts/deploy-app.ts` (`DIGITALOCEAN_TOKEN`, API, no `doctl`); autodeploy stays off (R11).
No migration and no npm dependency; Terraform and two plugins, only in `infra/`.
The preceding feature is
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
- **Hidden, not disabled, for guests**; Home is the signed-in landing tab and the avatar menu's first item;
  `relations` adds `created` ("Your poll") and `trending` ("Trending") (R7, R9, R10, clarification Q1).
No migration, dependency or sweep; one route, two settings (`ENV_HOME_TAB_REFRESH_INTERVAL`, `ENV_MAX_HOME_PAGE_POLLS`).
Before it came
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
And before that
`specs/20261102-154952-FIELD-LENGTH-LIMITS/plan.md` (research R1–R9, `data-model.md` — changed validation rules only,
no schema change — the HTTP contracts `contracts/api.md` A1–A4, the UI contracts `contracts/ui-contracts.md` C1–C5, and
the quickstart live alongside it in `specs/20261102-154952-FIELD-LENGTH-LIMITS/`). The requirements report is
`requirements/20261102-154952-field-length-limits/requirements-report.md`: 3 diagrams and 6 findings, all resolved.
Decisions that are easy to get wrong:
- **`TITLE_MAX` 60, `SUBTITLE_MAX` 40, `CHOICE_LABEL_MAX` 35** in `src/polls/service.ts`; `WIZARD_CHOICE_MAX` is gone
  and `validateAddedChoice` uses `CHOICE_LABEL_MAX` (R1).
- **A stored label is exempt**: `replaceChoices` / `mergeChoices` refuse a label over 35 only when its trimmed text is
  not a stored label of the poll (`labelTooLong`), so labels saved at up to 100 keep their ids and votes (R2).
- **The wizard's box keeps stored lines whole** (`sanitizeChoicesText` `storedLabels`), and cuts a stored line to 35
  the moment its text changes (R3, clarification Q1).
- **`/api/config` sends `choiceLabelMax`**, not `wizardChoiceMax`; browser fallbacks are 35 (R4).
- **The `adminCard.js` copies equal the server's**, checked by `tests/field-limits.test.ts`; migration 007 keeps its own
  50 and 30 (R5, R8).
No migration, route, setting or dependency change.
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
- **Deployment**: DigitalOcean App Platform (`web` and `fcaptcha`) with Managed PostgreSQL, Valkey and Spaces + CDN,
  described by Terraform in `infra/` (no `.do/app.yaml`), from `main` of `https://github.com/roadraceresults/crowdpoll`;
  autodeploy is off, each release is started with `npx tsx devScripts/deploy-app.ts`. Development needs PostgreSQL only: in-process cache/queue, PostgreSQL full-text search
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
- Production secrets (`ENV_OAUTH_*`, `ENV_ALLOWED_EMAILS`, keys) are in the git-ignored `infra/secrets.auto.tfvars`, never in a
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
