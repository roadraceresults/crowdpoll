# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
The full description, every earlier feature's decisions and the settings table are in `CLAUDE_COMPLETE.md`, for developers.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plans (two features, merged together):
`specs/20261112-173151-REMOVE-VOTE/plan.md` (research R1–R10, `data-model.md` — the states of a vote row and the
cache keys; the contracts `contracts/api.md` and `contracts/ui-contracts.md` and the quickstart live alongside it).
The requirements report is `requirements/20261112-173151-remove-vote/requirements-report.md`: 9 findings, all
resolved.
Decisions that are easy to get wrong:
- **A removal is an empty selection** on an open Dynamic-Vote poll from a voter who holds a vote, through the same
  `POST /api/polls/:pid/vote`; the emptiness rule runs **last** in `validateVoteChoicesAndState`, after the state
  gates and the Final-Vote check (R1). Anywhere else an empty selection keeps its 400 "Select at least one choice.".
- **"New voter" is decided from the previous selection** (`lastvote:<pid>:<email>`, shared by every session), not
  from `voted:<session>`; a removal sets it to `[]`, SREMs the pid from the session set, moves each previous choice
  and `total` down by one and leaves the trending bucket alone (R2, R3). A removal with nothing to remove is a 400.
- **The stored shape is the invitee shape**: the `votes` row keeps `choice_ids = {}`; a `vote_history` row records
  the event; the tally already computes the deltas; the consumer **deletes** the `voted` relation when the latest vote
  of the batch is empty (R4).
- **The card**: Submit stays enabled and reads "Remove vote" only while the selection is empty and `myChoiceIds` is
  non-empty on a Dynamic-Vote poll; both primary buttons carry a label span and two sizers in one grid cell (R5, R6);
  `applyVote` clears the overlay's `voted` flag and relation so "You voted" goes at once.

And the plan merged after it:
`specs/20261112-191252-SEMANTIC-COLOR-WORDS/plan.md` (research R1–R6, `data-model.md` — the three word lists and the
color order; the label table `contracts/ui.md` U1–U6 and the quickstart live alongside it).
The requirements report is `requirements/20261112-191252-semantic-color-words/requirements-report.md`: 3 findings,
all resolved.
Decisions that are easy to get wrong:
- **Neutral is tested first** in `semanticColorFor` and returns `null`, so a neutral choice takes the next palette
  color like any unmatched one; a hand-picked color still wins (R3, R4).
- **Whole words only, listed forms only**: the letters-only lookaround boundary stays; no `g` flag; phrase words are
  separated by ` +`; "don't" accepts a straight or curly apostrophe (R2, R3).
- **Nothing is stored**: colors change on the next draw; the line graph follows `resultColors()` (R1).
shell commands, and other important information, read the current plan:
`specs/20261112-175743-EMAIL-LOGO/plan.md` (research R1–R7, `data-model.md` — three static images, no stored data;
the contract `contracts/email-logo.md` and the quickstart live alongside it).
The requirements report is `requirements/20261112-175743-email-logo/requirements-report.md`: 7 findings, all resolved.
Decisions that are easy to get wrong:
- **The email logo comes from `og-logo.svg`, unchanged**: `devScripts/favicon-ico.ts` renders it in a 56 px window at
  3× (168 × 168); the favicon keeps `favicon.svg`, figures only; no new SVG (R1).
- **Refusals**: not 168 × 168, not 8-bit RGBA, or an opaque top-left pixel (read with `node:zlib`, no image library)
  stops the script before writing (R2).
- **Every email**, through `layout()`: `<img … email-logo.png width="56" height="56">`, same address; the stored
  expected emails change only in those sizes (R3, R4).
- `email-logo.png` is also the OAuth consent logo: `provider-setup.md` describes it; uploaded copies stay (R6).
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
  its `poll:<pid>` projection; a poll deleted outside `deletePoll` (e.g. in SQL) keeps it until
  `npm run forget-deleted-polls` (`devScripts/forget-deleted-polls.ts`).
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
- Voter names reach the browser only on `GET /api/me/polls/:pid/voters`; card, tab and delta payloads carry no names
  and only the derived `anonymousVotes`, never the raw `voteAnonymity` (`polls-discovery.test.ts`).
- Poll notes and the custom email message reach HTML only through `src/polls/notes.ts`; in the browser only
  `notesPreviewHtml`, `notesHtml` and `invitationMessageHtml` (and the editor's own DOM-built copy) may be assigned to
  `innerHTML`.
- A path that stops using an `avatars/` object queues its key in the same transaction (`queueAvatarRemoval`); only the
  removal sweep deletes it.
- A new dev script needs a `!devScripts/<file>` line in `.gitignore`.
- `m3-assets.test.ts` pins each page's stylesheets (`LAYER_ORDER`); M3 layers hold only M3 tokens, no literal font sizes.
- A back arrow or Cancel that leaves a page goes through `window.SiteBack` (`backArrow.js`), never its own
  `history.back()`; a new home tab joins `TAB_NAMES` in `tabs.js`, and tab changes use `replaceState`, never `pushState`.
- Bookmark is "Favorites" in the UI only; routes, tables and identifiers keep `bookmark`; stored enumerations stay verbatim.

## Architecture Notes

- **Auth phases**: the native → OAuth switch is a configuration change, not a rewrite; keep auth behind BetterAuth's
  abstractions. The email lives on the profile in both phases (user-editable natively, provider-supplied after).
- **Cookie banner**: informational only ("I Understand", Cookie Use link to `/privacy#cookies`); the three cookies are
  strictly necessary, so no consent flow and no other cookies.
- **API contract**: endpoints are described in `postman/openapi.json`, used to generate docs and client SDKs.

Spec Kit uses the PowerShell scripts (`.specify/scripts/powershell/`).
