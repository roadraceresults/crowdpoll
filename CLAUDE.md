# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
The full description, every earlier feature's decisions and the settings table are in `CLAUDE_COMPLETE.md`, for developers.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/20261111-132724-SHARED-LINK-MESSAGE/plan.md` (research R1–R10, `data-model.md` — the new column, the derived
preview values and the setting; the contracts `contracts/api.md` A1–A3, `contracts/page.md` P1–P5,
`contracts/ui-contracts.md` C1–C3, and the quickstart live alongside it in
`specs/20261111-132724-SHARED-LINK-MESSAGE/`).
The requirements report is `requirements/20261111-122415-shared-link-message/requirements-report.md`: 3 research
results and 12 findings, all resolved.
Decisions that are easy to get wrong:
- **A twin column, not a shared one**: `polls.link_preview_message` (migration `021-link-preview-message`, 100
  characters, `LINK_PREVIEW_MESSAGE_MAX` in `src/polls/notes.ts`) mirrors `invitation_message` in every rule:
  `normalizeNotes`, `NON_CONTENT_FIELDS`, screening (named "link preview message"), `pending_update` after votes,
  Duplicate, admin detail (`linkPreviewMessage`, `linkPreviewMessageHtml`) and list (`hasLinkPreviewMessage`) only;
  never copied from `invitation_message` (R1).
- **The preview shows the message of the current sharing mode**: `previewMessageOf(row)` in `src/seo/loginPage.ts`:
  nothing for a public poll, `invitation_message` for Invitation Only, else `link_preview_message`, always the approved
  column (R2).
- **One line**: the subtitle and `notesPlainText(message)` each have white space (line breaks included) collapsed to
  one space, then are joined by ` - `; the fallback is `config.defaultLinkPreviewMessage`
  (`ENV_DEFAULT_LINK_PREVIEW_MESSAGE`, default `You have been invited to vote in this poll.`, trimmed, blank or over
  300 → `ConfigError`); the 300 cut stays. `/poll/:pid`'s `describe()` is unchanged (R3, R4).
- **robots.txt**: a second group for `facebookexternalhit` and `meta-externalfetcher` with `Allow: /login` and the
  other disallows repeated; `*` keeps `Disallow: /login`; the login page keeps `noindex` (R5).
- **`og:image`**: `previewHeadTags` takes `origin` and emits `${origin}/og-image.png` with `og:image:width` 1200,
  `og:image:height` 630, `og:image:type image/png` on both pages; `twitter:card` stays `summary`. The committed
  `src/public/og-image.png` is rendered from `src/public/og-logo.svg` (the brand logo with its speech bubble; TWEAK02) by `devScripts/favicon-ico.ts` (headless browser), no
  package; the spec was amended to match (analysis I1, R6).
- **Wizard**: `m3RichTextField` with id prefix `pollLinkPreviewMessage-` after the Copy Link block under "Anyone you
  send the link to" only; both messages are kept and saved whatever the mode; summary line class
  `wizard-summary-link-preview-message` (R7).
- The previous features' decisions (login-page preview, custom email message) are in `CLAUDE_COMPLETE.md`,
  `specs/20261110-204911-LINK-PREVIEW-MESSAGE/plan.md` and `specs/20261110-160141-INVITATION-CUSTOM-MESSAGE/plan.md`.
One migration (021), one setting, one static image; no new route, cookie, storage key, stylesheet or dependency.
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
