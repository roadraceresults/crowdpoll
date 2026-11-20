# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
The full description, every earlier feature's decisions and the settings table are in `CLAUDE_COMPLETE.md`, for developers.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/20261119-144614-POLL-ADMIN-IMPROVEMENTS/plan.md` (research R1–R16, `data-model.md` — one column, two payload
fields, the row's and the Choices field's states; the contracts `contracts/api.md` A1–A6, `contracts/ui.md` U1–U17 and
the quickstart live alongside it).
The requirements report is `requirements/20261119-144614-poll-admin-improvements/requirements-report.md`: 18 findings,
all resolved; where it speaks of choices "locked by votes" and a "... view" link, the plan's R13 is right (neither
exists).
Decisions that are easy to get wrong:
- **Every admin list is rows**: `adminList.js` has one list path; this supersedes "Search view only" below, and the
  other row rules there now hold in every view and the creator's list (R1–R3).
- **The open-poll link is a sibling of the row's button**, shown only while the server says `canWatch`, which is
  `mayWatchMany` unchanged: unpublished polls never have it (R4, R5).
- **`choicesInEnteredOrder` reorders only what is drawn**: `pollCard.js` keeps `data` share-sorted as the ranking;
  `inDisplayOrder` is applied to the results shown and the ballot, nowhere else (R7).
- **An info icon is never inside a `<label>`**: rows that take one are a `div` with `<label for>` parts (R10).
- **The Choices field is a preview or today's textarea**, decided by `wizard.choicesOpen`; `commitChoices()` runs
  wherever `commitNotes()` does (R12).

The plan before it:
`specs/20261118-160304-CLIENT-CODE-OBFUSCATION/plan.md` (research R1–R15, `data-model.md` — build inputs, mode and
checks, nothing stored; the contract `contracts/build.md` B1–B16 and the quickstart live alongside it).
The requirements report is `requirements/20261118-160304-client-code-obfuscation/requirements-report.md`: 14 findings,
all resolved; where it speaks of the obfuscator's "light" setting, the plan's R2 is right (no wrapper, rotation or
shuffling: the fuller setting fails the size limit).
Decisions that are easy to get wrong:
- **Build-time only**: `devScripts/build-assets.ts` transforms the copy in `dist/public`, then fingerprints those
  bytes; `src/public/`, `npm run dev` and `npm test` are untouched, and nothing under `src/` reads the switch (R8, R9).
- **No top-level, global or property name is renamed**: the scripts share one global scope (R3).
- **`ENV_OBFUSCATE_ASSETS`** is `on`, `off` or unset (on); any other value stops the build; it is not in `loadConfig` (R9).
- **The build stops and removes `dist/public`** when a file in scope is unchanged, the gzip total grew, a script does
  not compile or a page reference is missing (R8).
- **ES2020 is pinned** for the scripts, and no built script creates code from text (R4, R5).
- **Source maps** only with `npm run build -- --source-maps`, in the git-ignored `dist-maps/` (R11);
  `npm run test:built` runs the client suites on `dist/public` (R12).
- **Each script's decoder has its own names** (`decoderPrefix`: `_pollCard_a`, `_pollCard_b`): the scripts share one
  global scope, and with one name for all a later script answers an earlier one's lookups; two scripts whose names
  give the same prefix stop the build.

The plan before it:
`specs/20261117-131915-WIDE-MORE-CHOICES/plan.md` (research R1–R12, `data-model.md` — derived values and the wide
card's states, nothing stored; the contract `contracts/ui.md` W1–W10 and the quickstart live alongside it).
The requirements report is `requirements/20261117-131915-wide-more-choices/requirements-report.md`: 8 findings, all
resolved; where it speaks of the row's chevron, the plan's R9 is right (there is none).
Decisions that are easy to get wrong:
- **A wide card never scrolls**: one that holds fewer bars than the poll has shows `fittingChoices` (own choices
  first, then leaders, `capacity − 1` places) and a "More choices" row sized as one more bar (R1–R3).
- **Each side decides for itself**: the notes are on the front only, so the ballot may fit when the bars do not;
  Vote opens the maximized view only when the ballot does not fit (`ballotOpensMaximized`), and a flipped card whose
  ballot stops fitting returns to its results side with the selection kept (R5).
- **A wrap with no height fits everything**, and the grid re-renders its cards when it returns (R4).
- **The maximized view's rules are the phone's at every width**: `MAXIMIZED_LIMITS`, "Show all N choices" and
  "Show fewer choices"; only the card's rule differs by width (R6).
- **"Show more" asks for the notes at every width**: `revealNotes` measures `.extras-tabs` in the phone layout and
  `.maximized-notes` above it (R8).
- **The wide rows' styles are in `pollCard-m3.css` under `not all and (max-width: 640px)`**; `phone-card-m3.css`
  is not edited (R9).

The plan before it:
`specs/20261117-050854-FIXED-WIDTH-640/plan.md` (research R1–R10, `data-model.md` — three viewport states, two
layouts, nothing stored; the contracts `contracts/viewport.md` V1–V5, `contracts/breakpoints.md` B1–B6 and the
quickstart, which is the device checklist, live alongside it).
The requirements report is `requirements/20261117-050854-fixed-width-640/requirements-report.md`: 10 findings, all
resolved; where it says the older 481–639 px sheets are deleted, the plan's R6 is right.
Decisions that are easy to get wrong:
- **Two fixed widths**: held under 480 → `width=480`; held 481–639 → `width=640`; exactly 480, or 640 and wider → the
  device's own width (R1).
- **One boundary, 640 px inclusive**: every phone query is `max-width: 640px`, the wide side `640.02px` or
  `not all and (max-width: 640px)`; `phone-sheets.test.ts` refuses `639.98px`, `max-width: 480px` and
  `min-width: 640px` in any sheet or script; the phone layers' declarations did not change (R3, B2).
- **The older blocks are re-labelled, not deleted**: the phone layout depends on part of them; only declarations a
  phone layer overrides with the same selector are pruned (the table is in research R6), and `--single-column` with
  `isSingleColumn()` is gone (R6, B4).

The plan before it:
`specs/20261113-140600-PHONE-LAYOUT-REDESIGN/plan.md` (research R1–R15, `data-model.md` — `essentialChoices`, the
card's view state and the history key, nothing stored; the contracts `contracts/phone-layout.md` P1–P6,
`contracts/poll-card.md` C1–C5 and H1–H6, `contracts/removed-results.md` X1–X4 and the quickstart, which is the device
checklist, live alongside it).
The requirements report is `requirements/20261113-140600-phone-layout-redesign/requirements-report.md`: 14 findings,
all resolved; its design section predates three of them, so `requirements.md` and the spec are right where they differ.
Decisions that are easy to get wrong:
- **The phone layout is `@media (max-width: 640px)`** (480 px when written; see above): three last-loaded layers
  (`phone-m3.css`, `phone-card-m3.css`, `phone-admin-m3.css`) override the older phone rules; the 480, 360 and
  320 px blocks are deleted (R1, R12).
- **Sizes come from the tokens**: typescale × 1.25 in `m3-tokens.css` under the same query, `label-small` held at
  15 px; no phone rule multiplies a token down; 64 px targets are a transparent halo on 48 px controls or 64 px rows
  (R2, R3).
- **Scripts ask `PollCard.isPhoneLayout()`** (`matchMedia("(max-width: 640px)")`), not a CSS marker (R4).
- **`essentialChoices`**: four leaders (all if ≤ 5) on the card, ten (all if ≤ 12) maximized, of which only those above 2%
  (above 0% if ≤ 12) when any is (TWEAK05, on trial), own choices added after the leaders; the combined share shows on single-choice polls only; the voting side always lists every choice (R5). The maximized limits now apply at every width; above 640 px the card uses `fittingChoices`.
- **Vote with hidden choices opens the maximized view on its voting side** (above 640 px: when the ballot does not
  fit); the Submit bar only clicks the card's own buttons (R7, R9).
- **Back**: a view opened from a card pushes `{maximizedPid}` at the same address, at every width; every other way of
  closing calls `history.back()`; a link landing pushes nothing (R10).
- **Poll Results is gone** with its three API routes and `exportPoll*`; `computeResults` stays (R13).

The plan merged with it (branch `line-graph-fix`):
`specs/20261113-150353-LINE-GRAPH-READABILITY/plan.md` (research R1–R10, `data-model.md` — five in-memory fields, nothing
stored; the contract `contracts/ui.md` U1–U7 and the quickstart live alongside it).
The requirements report is `requirements/20261113-150353-line-graph-readability/requirements-report.md`: 8 findings,
all resolved.
Decisions that are easy to get wrong:
- **The response is in choice order, not share order**: `lineGraph.js` orders the series by current share itself and,
  above 10 lines, draws the leading ones (`leadingCount()`: 80% of the shares, 10 at most); `drawnSeries()` feeds the legend, lines, markers, Y axis and announcement (R2, R8).
- **The legend is the readout**: no `.line-graph-tooltip`; moving the selected time changes text only, and an entry's
  width never depends on its value, so the plot does not move (R3, R4).
- **A press or focus move to the legend or the show-all button keeps the selected time**; anywhere else outside the
  plot clears it (R6).
- **One highlight**, drawn last and wider; dimming is CSS under `.has-highlight`; it is cleared when its line leaves
  the drawn set; nothing is stored (R5).

And the plan merged after it (branch `admin-search`):
`specs/20261113-102117-ADMIN-SEARCH-RESULTS/plan.md` (research R1–R13, `data-model.md` — the states of a result row,
nothing stored; the contract `contracts/ui.md` U1–U9 and the quickstart live alongside it).
The requirements report is `requirements/20261113-102117-admin-search-results/requirements-report.md`: 9 findings, all
resolved.
Decisions that are easy to get wrong:
- **Rows, client only**: `adminList.js` draws one `div.admin-result` (a disclosure `<button>` and a panel) per poll;
  written for the Search view, every list is rows since POLL-ADMIN-IMPROVEMENTS, the other views and the
  creator-only page included; `adminCard.js`, the route and `openapi.json` did not change for it (R1, R3).
- **A card exists only while its row is open**: created on open, forgotten on close unless it holds saved wizard
  progress; one `openPid` (R5).
- **Only a fresh load opens by itself**: `selectTab` (Search, Clear, a view tab) closes the open card and opens a
  single result; the periodic refresh and card actions never open, close or move a card, and the editing poll's row is
  never removed (R6, R8).
- **Held during an edit**: every row, Search and Clear are `disabled` with "Finish editing the open poll first" (R7);
  since POLL-ADMIN-IMPROVEMENTS TWEAK09 the edited poll's own row stays enabled and acts as Cancel, then closes.
- **The list is wider than the 420 px column**: `min(840px, 100%)`, one card-like frame (`admin.css`) of two-line, zebra-striped rows; the
  card keeps 420 px (R2).
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
- A new top-level client file is transformed by the build; a client script must not depend on its own internal names or
  source text at run time, and a new build package is an exact-version `devDependency`.
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
