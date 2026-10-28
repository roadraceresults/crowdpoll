# Research: Privacy Policy, Terms of Service and Account Deletion

Each entry: Decision, Rationale, Alternatives considered.
The requirements-level research (what the policy must contain, how to present it, Google Fonts) is RS1–RS3 in
`requirements/20261021-204537-privacy-and-terms/requirements-report.md`; this file settles how to build it.

## R1. The documents are two static pages built from the contract drafts

- **Decision**: `src/public/privacy.html` and `src/public/terms.html`, served at `/privacy` and `/terms` by `pages.ts`
  through the existing `page()` helper, with no session check.
  The full text is in the HTML (readable without JavaScript); `app.js` adds the header and footer as on every page.
  The wording comes from `contracts/privacy-policy.md` and `contracts/terms-of-service.md`, which the operator
  reviews first; placeholders (`[OPERATOR NAME]`, `[MAILING ADDRESS]`, `[PROVINCE]`) stay in the page until replaced.
  The anchors `#cookies`, `#retention`, `#rights`, `#contact` are `id`s on the section headings.
- **Rationale**: static text needs no route logic; the page pipeline already fingerprints assets and redirects `.html`
  names to clean routes.
- **Alternatives**: rendering Markdown at request time (a new dependency and an escaping surface); one page with both
  documents (agreement links must point at the Terms alone).

## R2. One version constant, sent to the browser

- **Decision**: `src/legal/version.ts` exports `TERMS_VERSION = "2026-11-01"` (the date the documents take effect).
  Both pages print it ("Version 2026-11-01 · Last updated 1 November 2026"); a test reads both HTML files and fails if
  either shows another version.
  `/api/config` adds `termsVersion`, which the Create Account card, the Login card and the accept page send back.
- **Rationale**: one value decides the pages, the agreement check and the gate, so they cannot disagree (FR-002).
- **Alternatives**: a hash of the documents (changes on every typo fix, forcing everyone to accept again); an
  environment variable (a deploy-time setting for what is really part of the code).

## R3. Agreement is two columns, read with the session

- **Decision**: migration `009-terms-and-privacy` adds `terms_version text` and `terms_accepted_at timestamptz` to
  `user`, both nullable (null for every existing account).
  They are **not** declared to BetterAuth; `sessionCache.lookup()` already reads `permissions` from `user` on a cache
  miss and now reads the two columns in the same query, so the cached session carries them.
  Recording acceptance is one `update user set terms_version, terms_accepted_at` followed by
  `sessions.forgetUserSessions(userId)`, as profile edits already do.
- **Rationale**: no extra query per request; the precedent (feature 025's `permissions`) is already tested.
- **Alternatives**: a separate `terms_acceptances` history table (a record of every acceptance is not asked for);
  BetterAuth `additionalFields` (it would return the fields to the client and allow none of the ordering we need).

## R4. Create Account records agreement; the server refuses without it

- **Decision**: `POST /api/auth/create-account` takes `acceptedTerms: true` and `termsVersion`.
  After the honeypot and the email validation, a missing `acceptedTerms` or a `termsVersion` other than
  `TERMS_VERSION` answers `400 { error, code: "terms-required" }`, before the rate limit is consumed, the allowlist is
  checked or anything is created.
  A new account is created and then stamped with the version and time in the same handler; an existing account matched
  by its email key is stamped too (the person has just agreed), then gets its sign-in link as today.
- **Rationale**: the check is input validation, so it sits with the other validation and costs no rate-limit slot.
- **Alternatives**: passing the columns through `internalAdapter.createUser` (they are not BetterAuth fields).

## R5. The gate is one middleware, before every router

- **Decision**: `src/legal/termsGate.ts` exports `createTermsGate({ sessions })`, mounted in `createApp` right after
  `express.json()`, before the tabs and vote routers.
  - A request without a `session_token` cookie passes at once (no lookup).
  - Otherwise it reads the (cached) session; a guest, or a user whose `terms_version` is `TERMS_VERSION`, passes.
  - A user who has not accepted the current version:
    - an `/api/*` request answers `403 { error: "Please accept the updated Terms of Service.", code: "terms-required" }`,
      except `POST /api/legal/accept-terms`, `POST /api/auth/logout`, `GET /api/me`, `GET /api/config`, and the sign-in and
      link routes, which create a new session or need none: `POST /api/auth/create-account`,
      `POST /api/auth/request-login-link`, `GET /api/auth/verify`, `POST /api/auth/confirm-signin`,
      `GET /api/auth/link-info`, `GET /api/me/email-change/verify` (the gate then applies on the next request);
    - a `GET` for one of the page routes (`/`, `/login`, `/create-account`, `/confirm-signin`, `/profile`, `/admin`,
      `/admin/poll/results`) redirects to `/accept-terms?next=<path and query>`;
    - everything else (`/privacy`, `/terms`, `/accept-terms`, `/assets/*`, static files, `/healthz`) passes.
  - `GET /api/me` adds `termsAccepted: boolean`, so a page already open when the gate starts refusing can send the
    person to the accept page.
- **Rationale**: one place enforces FR-008 for every route, existing and future; the session cache makes the lookup
  cheap, and most routes already perform it.
- **Alternatives**: a check in each route (dozens of call sites, easy to miss one); a check in `getSession` (pages and
  APIs need different refusals).

## R6. The accept page

- **Decision**: `accept-terms.html` with `acceptTermsCard.js` (Card Shell): the agreement box, Accept (disabled until
  ticked) and Sign Out; `POST /api/legal/accept-terms { termsVersion }` checks `Origin` like `confirm-signin`, records
  the agreement (R3) and answers `{ redirect }`, where `redirect` is `next` if it is a same-origin path starting with
  `/` and not `//`, else `/`.
  A guest, or a user who has already accepted, who opens `/accept-terms` is redirected to `next` (or `/`).
- **Rationale**: the existing card pattern; the `next` check stops an open redirect.

## R7. OAuth mode

- **Decision**: the Login card shows the agreement box above the provider buttons, which stay disabled until it is
  ticked.
  The provider callback creates the account through BetterAuth with no agreement recorded, so the gate (R5) sends it
  to the accept page on its first request; nothing else can be done with the account until it accepts.
- **Rationale**: the provider flow carries no request body we control; the gate already guarantees that no account
  acts before agreeing, without a second mechanism.
  This is how FR-009's "a new account MUST NOT be created without it" is met in OAuth mode: the account row exists, but
  it cannot be used, and the box precedes the click.
- **Alternatives**: a `state` parameter carrying the version through the provider round trip (BetterAuth owns `state`).

## R8. Account deletion is one transaction in one module

- **Decision**: `src/legal/deleteAccount.ts` exports `deleteAccount(deps, user)`; `DELETE /api/me` with body
  `{ confirm: "DELETE" }` and a same-origin `Origin` calls it.
  Inside one transaction, for the account's current address `email` and id `userId`:
  1. the polls it created (`created_by_id = userId`): insert a `search_outbox` row for each (so the drain removes it
     from OpenSearch; the drain already deletes ids it cannot find), delete their `vote_history` rows, delete the polls
     (votes, invitations, bans, bookmarks and `user_polls` follow by `on delete cascade`);
  2. its votes on other polls: per poll, one placeholder `deleted-<uuid>@deleted.invalid`; set `votes.email` and
     `vote_history.email` to it and `user_name` to `Deleted user` for that poll's rows; then `bumpContentVersion` for each
     such poll, so cards and Participants refresh;
  3. delete `bookmarks`, `user_polls` and `poll_invitations` rows for `email`; keep `poll_bans`;
  4. delete its sign-in links (`supersedeLoginLinks`), then the `user` row (`session`, `account` and
     `email_change_requests` follow by cascade), having first read the session tokens.
  After the commit: drop the cached sessions, the `invite:`/`ban:` roster keys and the counters of the deleted polls;
  clear the cookie; send the "account deleted" email (a failure is logged, never undone); log
  `[account] Deleted account for j•••@gmail.com: 3 polls deleted, 12 votes anonymized`.
  Any error before the commit rolls everything back and answers `500`, the person still signed in (FR-018).
- **Rationale**: the participation tables already cascade from `polls`; the `.invalid` domain can never collide with a
  real address and keeps every email-typed column valid; one placeholder per poll keeps a vote and its history paired.
- **Alternatives**: re-counting polls after deleting votes (rejected in UA1); a soft delete flag (keeps the data the
  policy says is gone).
- **Queued votes**: a vote accepted just before the deletion can still be in the vote queue. `deleteAccount` adds the
  address to the `deleted-accounts` cache set (one hour; removed again if the transaction fails); the consumer drops
  every queued entry whose address is in it, reconciles those polls' counters, and logs the count; so a vote queued before
  or during the deletion is never stored with the deleted address (U2).
- **Known limit**: votes and bookmarks are keyed by address, and an email change today updates only `user.email`, so
  rows written under an earlier address are not found by the current one. Recorded as technical debt; fixing email
  change is out of scope. The policy and SC-003 say so: such rows are removed on request to `privacy@crowdpoll.vote`.

## R9. A daily retention sweep

- **Decision**: `retentionSweep` in `sweeps.ts`, daily, advisory lock `11`; it deletes `session` rows past
  `expiresAt`, `verification` rows past `expiresAt`, `email_change_requests` older than 15 minutes, `rateLimit` rows
  whose `lastRequest` is older than the rate-limit window, and drops `vote_history` partitions whose month ended more
  than 12 months ago (`drop table if exists`), logging counts.
- **"Ever voted" no longer reads the history**: `hasVoteHistory` and `pollsEverVoted` decide whether a poll has ever
  had a vote, which freezes its fields. They read a new `polls.ever_voted` flag instead of probing `vote_history`;
  every `vote_history` insert (`recordVote`, the second insert in `store.ts`, the consumer's batch insert) sets it in the
  same transaction; migration `009` backfills it from `vote_history`.
  So dropping old history changes nothing a poll is allowed to do (U1).
- **Rationale**: the sweep framework already runs daily jobs under locks (`bookmarkRemovalSweep`); dropping a
  partition is instant and is why the table is partitioned.

## R10. IP addresses and user agents

- **Decision**: `session.create.before` returns the session with `ipAddress: null, userAgent: null`; the migration
  clears both on existing rows.
  `maskIp()` in `src/auth/maskIp.ts` keeps the first three IPv4 octets (`203.0.113.x`) or the first three IPv6 groups
  (`2001:db8:85a3::x`); the two rate-limit log lines in `api.ts` use it.
- **Rationale**: nothing reads the columns; the rate-limit key itself still needs the full IP for its window (R9).

## R11. Fonts served by CrowdPoll

- **Decision**: the three families as variable `woff2` files (Latin and Latin Extended subsets: Fraunces with `opsz`
  and `wght`, Inter and Roboto with `wght`) in `src/public/fonts/`, with their OFL licence texts, and a
  `src/public/fonts/fonts.css` of `@font-face` rules (`font-display: swap`, `unicode-range` per subset) referring to
  `/fonts/<file>.woff2`.
  Each page head replaces the two `preconnect` links and the Google stylesheet with `<link rel="stylesheet" href="/fonts/fonts.css">`.
  The files are downloaded once from the Google Fonts CSS API (quickstart §1) and committed; `build-assets.ts`
  already copies `.woff2`.
  The sheet lives in `fonts/` with the files: the page rewrite fingerprints only root-level references, so
  `/fonts/fonts.css` stays on the instance, and its absolute `/fonts/<file>.woff2` URLs resolve there too. A root-level
  `fonts.css` would be served from the Spaces CDN when Spaces is configured, where `/fonts/` does not exist.
- **Rationale**: no request leaves CrowdPoll (FR-023); variable files cover every weight in use (400–700, Fraunces'
  440) in a handful of files; no dependency.
- **Alternatives**: an `@fontsource` package (a dependency for static files); system fonts (a visible design change).

## R12. Footer, banner, login line, email footer

- **Decision**: `app.js` gains `renderSiteFooter()`, called beside `renderCookieBanner()`, appending
  `<footer class="site-footer">` to `<body>`; a new layer `footer-m3.css` (tokens only) goes last in `LAYER_ORDER`
  and on all eleven pages (the eight existing and the three new); the footer's bottom padding adds `var(--cookie-banner-offset, 0px)`.
  The banner's sentence keeps its wording and gains a "Cookie Use" link to `/privacy#cookies`.
  The Login card gains one line: "By signing in you agree to the Terms of Service and Privacy Policy."
  `templates.ts`'s `FOOTER` gains a line linking `<origin>/privacy` and `<origin>/terms`.
- **Rationale**: the header is already rendered this way; one function serves every page.

## R13. Keeping Cookie Use true

- **Decision**: the Cookie Use table in `privacy.html` marks each row `data-storage="cookie|local|session"` and
  `data-name="<name>"`.
  A test collects the cookie names the server sets during sign-in (`session_token`, `signin_binding`) and the storage
  keys used in `src/public/*.js` (`localStorage`/`sessionStorage` `getItem`/`setItem` with a constant key, including
  the keys behind named constants), and fails unless the two sets equal the table's rows.
- **Rationale**: FR-024 asks for an automatic check; this one fails the build the day someone adds a cookie or a key.

## R14. Unknowns left to the operator

- The App Platform runtime-log retention and the managed PostgreSQL backup window, confirmed 2026-10-22 (TWEAKS05):
  App Platform retains no runtime logs ("To retain runtime logs, configure log forwarding to an external provider";
  none is configured) and keeps build and deploy logs, which hold no personal data, for 90 days; PostgreSQL backups are
  taken daily and kept for 7 days. Adding log forwarding later changes the policy's retention row.
- The operator name, mailing address and province (FR-005).
