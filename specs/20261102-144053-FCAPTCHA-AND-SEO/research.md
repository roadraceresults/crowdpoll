# Research: Human Check Before Sign-In, and Search Engine Indexing of Public Polls

Feature: `specs/20261102-144053-FCAPTCHA-AND-SEO/spec.md`.
Requirements report: `requirements/20261102-144053-fcaptcha-and-seo/requirements-report.md` (RS1, 17 findings resolved).

FCaptcha facts below come from the project's README, INSTALLATION.md, COMPLIANCE.md and `server-node/` at
https://github.com/WebDecoy/FCaptcha (v1.46.1, 2026-10-21), and the npm registry entries for `@webdecoy/fcaptcha` and
`@webdecoy/fcaptcha-client`. Items marked **confirm** are details to verify against the installed package during
implementation (T-tasks name them); none changes the design.

## R1. Where the check service runs

- **Decision**: a second App Platform service, `fcaptcha`, in the same app (`.do/app.yaml`), built from a new folder
  `fcaptcha-server/` in this repository. Its `package.json` depends on `@webdecoy/fcaptcha` and
  `@webdecoy/fcaptcha-client` at exactly `1.46.1`, and its `start` script runs the package's standalone server
  (`node_modules/@webdecoy/fcaptcha/server.js`, confirmed in 1.46.1). The package's default widget path
  (`../client/fcaptcha.js`) does not exist in an npm install, so `fcaptcha-server/start.js` sets `FCAPTCHA_CLIENT_PATH` to the
  resolved `@webdecoy/fcaptcha-client/min` (`dist/fcaptcha.min.js`) and calls the package's exported `start()`; the server then serves
  the widget at `/fcaptcha.js`. App Platform's `ingress.rules` send path prefix `/fcaptcha`
  to it (prefix stripped) and everything else to `web`. The web service reaches it at `${fcaptcha.PRIVATE_URL}`.
- **Rationale**: requirements NC1-A; the widget and its calls are same-origin, so no page makes a third-party request
  and no CORS is needed; the service scales and is health-checked by the platform (`/health`).
- **Alternatives**: proxying through the web service (NC1-B: an extra hop, and FCaptcha's network signals need the
  real client request); a Droplet (NC1-C: a server to patch, outside autoscaling); `createMiddleware()` inside the web
  service (not the standalone mode the requirements chose, and only partly documented).

## R2. FCaptcha's state

- **Decision**: `ENV_FCAPTCHA_REDIS_URL` (FCaptcha's `REDIS_URL`) on the `fcaptcha` service points at the existing Valkey cluster, on database index 1
  (`…/1`), so its keys never share a keyspace with CrowdPoll's (`cnt:<pid>`, `poll:<pid>`, …). Autoscaling 1–3
  instances on CPU.
- **Rationale**: requirements NC2-A; spec FR-014 (a used pass is refused by every instance). A separate database index
  avoids depending on a key-prefix option FCaptcha may not offer.
- **Alternatives**: in-memory, one instance (NC2-B: a restart forgets live challenges; no headroom at a launch spike).

## R3. How the pass travels and is presented

- **Decision**: the browser holds the pass in the page's memory only (clarification Q1) and sends it in a request
  header, `X-Human-Check: <token>`, on each sign-in start request. The server reads the header in one middleware,
  `requireHumanCheck(page set)`, mounted ahead of each route.
- **Rationale**: a header works the same for the JSON routes and for BetterAuth's `sign-in/social` and
  `sign-in/oauth2` handlers, which are mounted before `express.json()` and read their own body (`src/server.ts`
  96–103); no route's body schema changes. No cookie or storage key is added, so the Cookie Use list and
  `tests/cookie-use-list.test.ts` are unaffected.
- **Alternatives**: a body field (BetterAuth's handlers would need their body re-read or re-streamed); a short-lived
  cookie (clarification Q1-B, rejected: a fourth cookie).

## R4. What a pass is valid for

- **Decision**: the widget is drawn with the FCaptcha `action` set to the page: `login`, `create-account` or
  `invite`. The server accepts a pass only on routes that page can call:

  | Route | Accepted actions |
  |---|---|
  | `POST /api/auth/request-login-link` | `login` |
  | `POST /api/auth/create-account` without `body.token` | `create-account` |
  | `POST /api/invitations/redeem` | `invite` |
  | `POST /api/auth/sign-in/social`, `POST /api/auth/sign-in/oauth2` | `login`, `create-account`, `invite` |

  `POST /api/auth/create-account` *with* `body.token` (finishing from an emailed create-account link) is not checked,
  nor are `/api/auth/verify`, `/api/auth/confirm-signin` or the provider callbacks (FR-008).
- **Rationale**: clarification Q2; FCaptcha's `POST /api/token/verify` answers `{valid, hostname, action, score, …}`
  and leaves the `hostname` and `action` checks to the site.
- **Confirmed (1.46.1), with one deviation**: the checkbox widget (`FCaptcha.render`) never sends `action` to
  `POST /api/verify`, although the server would sign it into the token; only `FCaptcha.execute` (score mode) sends it.
  A checkbox pass therefore reports `action: ""`. The server accepts an empty `action` and refuses a non-empty one
  outside the route's set, so the route check takes effect unchanged if a later FCaptcha release sends it. Hostname,
  signature, single use and the 5-minute lifetime are still checked on every pass.

## R5. Verifying a pass, and failing open

- **Decision**: `src/auth/humanCheck.ts` exports `createHumanCheck(config, fetchImpl)` returning
  `verify(token, action, clientIp) → "valid" | "invalid" | "unreachable"`. It POSTs
  `{token, secret: verifySecret, remoteip}` to `<ENV_FCAPTCHA_URL>/api/token/verify` with a 3-second timeout.
  - `valid`: the answer is 200 with `valid: true`, `hostname` equal to `ENV_PUBLIC_ORIGIN`'s host, and `action` in the
    route's accepted set.
  - `invalid`: any other answer FCaptcha gives (including `valid: false`, a hostname or action mismatch).
  - `unreachable`: a network error, a timeout, or a 5xx.

  `requireHumanCheck`:
  - no header → probe `GET <ENV_FCAPTCHA_URL>/health` (1-second timeout): reachable → refuse; unreachable → carry on
    (fail open);
  - `valid` → carry on; `invalid` → refuse; `unreachable` → carry on (fail open).

  Refusal is `400 {error: "Please complete the human check.", code: "challenge-required"}`. Each fail-open increments
  `abuse.humanCheckSkipped` (reported on `/healthz`) and logs `[human-check] Skipped: service unreachable (<maskIp>)`.
- **Rationale**: requirements UA2-B; clarification Q3 (a request without a pass is accepted only when the service is
  unreachable); spec FR-012.
- **Alternatives**: fail closed (UA2-A, rejected by the developer).

## R6. The client address

- **Decision**: the address sent as `remoteip`, and the one logged, is read from App Platform's `do-connecting-ip`
  header when present, falling back to `req.ip`. FCaptcha's `TRUSTED_PROXIES` / trusted-header settings are set so it
  reads the same header (**confirm** the exact header name on the deployed app with `quickstart.md` step D3 before
  enabling IP binding). Confirmed in 1.46.1: binding is not a setting — `POST /api/token/verify` binds the token to
  an address only when the caller sends `remoteip`. Until D3 is confirmed the web service does not send it; turning
  binding on is sending it. FCaptcha's own `TRUSTED_PROXIES` defaults to the private and loopback ranges, which
  covers App Platform's internal proxy.
- **Rationale**: `trust proxy` is `true` (`src/server.ts` 87), so `req.ip` is the left-most `X-Forwarded-For` entry,
  which a client can forge; requirements NC4.
- **Alternatives**: changing `trust proxy` globally (out of scope: it affects every rate limit; technical debt noted
  in the requirements report).

## R7. The page flow

- **Decision**: a browser module `src/public/humanCheck.js` (`window.HumanCheck`) with:
  - `gate(main, action, render)`: when `/api/config` carries `humanCheck` (site key and endpoint), clears `main`,
    mounts a card (via `CardShell.mount`, title "Vote protection", widget label "I am not a Bot or AI Agent", maker name removed) holding the widget, the "Bot check" link and a
    status line; loads `/fcaptcha/fcaptcha.js` once; on success keeps the token and calls `render()` (the page's
    own card); on error shows FR-009's message and Try again; after 10 s without the widget loading, or on a load
    error, shows "The human check is unavailable right now" and calls `render()` without a token (FR-012a). When
    `humanCheck` is null (check off), calls `render()` at once.
  - `headers()`: `{ "X-Human-Check": token }` when a token is held, else `{}`; the token is cleared once sent.
  - `refused(body)`: true for `code: "challenge-required"`; the page then calls `gate` again, keeping its form values.
  `loginCard.js`, `createAccountCard.js` (form mode only, not token mode) and `inviteCard.js` wrap their render in
  `HumanCheck.gate`, add `HumanCheck.headers()` to their sign-in start requests, and handle `refused`.
- **Rationale**: clarification Q1 (one page, two views); FR-001, FR-002, FR-007, FR-009, FR-012a. The widget's
  its theme follows the site's color scheme, `dark` or `light` from `<html data-theme>` as Site Settings sets it, not the device preference (requirements AM3); its checkbox mode (NC3-A) is the default.
- **Confirmed (1.46.1)**: the `data-*` auto-init does not take the error or expired callbacks, so the widget is drawn
  with `FCaptcha.render(container, {siteKey, theme: "light" | "dark", serverUrl: "/fcaptcha", callback, errorCallback,
  expiredCallback})`; `FCaptcha.reset` and `FCaptcha.destroy` clear it. The checkbox widget ignores render's
  `serverUrl` and fetches its challenge from the page-wide `FCaptcha.serverUrl`, so `FCaptcha.configure({serverUrl:
  "/fcaptcha"})` is called before each draw; without it the widget asks `/api/pow/challenge` at the site root (`404`).

## R8. Settings

- **Decision**: four web-service settings in `src/config.ts` (`.claude/rules/environment.md` table):
  `ENV_FCAPTCHA_ENABLED` (`1` turns it on; default off), `ENV_FCAPTCHA_URL` (private URL, validated with `new URL`),
  `ENV_FCAPTCHA_SITE_KEY`, `ENV_FCAPTCHA_VERIFY_SECRET` (encrypted console variable). Enabled with any of the other
  three missing → `ConfigError` naming it. `AppConfig.humanCheck: { url, siteKey, verifySecret } | null`.
  `/api/config` gains `humanCheck: { siteKey, endpoint: "/fcaptcha" } | null`.
  The `fcaptcha` service's own variables carry the same prefix: `ENV_FCAPTCHA_PORT`, `ENV_FCAPTCHA_SECRET`,
  `ENV_FCAPTCHA_VERIFY_SECRET` (the web service's name and value), `ENV_FCAPTCHA_SITE_KEYS`,
  `ENV_FCAPTCHA_ALLOWED_HOSTNAMES`, `ENV_FCAPTCHA_REDIS_URL` and `ENV_FCAPTCHA_INSECURE_DEV_MODE`.
  `fcaptcha-server/start.js` copies each into FCaptcha's own name (`PORT`, `FCAPTCHA_SECRET`, …, `REDIS_URL`) and stops
  when one of FCaptcha's names is set directly; it also sets the widget path, `FCAPTCHA_CLIENT_PATH`.
  `TRUSTED_PROXIES`, `FCAPTCHA_EXPERIMENTAL_BLOCKING` and `FCAPTCHA_LOG_VERDICTS` are not set (FCaptcha's defaults).
- **Rationale**: requirements UA3, NC4; spec FR-011, FR-015. Off by default keeps development and `npm test`
  service-free.

## R9. The poll page

- **Decision**: `GET /poll/:pid` (new `src/routes/seo.ts`):
  - a signed-in visitor is redirected to `/?PID=<pid>` (the existing shared-link landing);
  - a guest gets `index.html` with, injected at serve time: a `<title>` of the poll title, `<meta name="description">`,
    `<link rel="canonical">`, Open Graph and Twitter tags, a JSON-LD `Question`, `data-poll-page="<pid>"` on `<body>`,
    and a static `<article id="poll-summary">` (title, description, choices with their published percentages and the
    vote count) at the start of `<main>`, every value escaped;
  - `404` (the existing "Not found" answer) when the poll is not indexable (R10) or not found.

  In the browser, `tabs.js` sees `data-poll-page`, opens Trending, fetches the new guest route
  `GET /api/polls/:pid/card` (R11), mounts the card, maximizes it, and removes `#poll-summary`.
  A guest opening `/?PID=<pid>` for an indexable poll is redirected to `/poll/<pid>` instead of `/login` (FR-022).
- **Rationale**: requirements IN3, UA4, UA5; spec FR-019–FR-022, FR-025–FR-028. Reusing `index.html` keeps one guest
  page; the summary gives crawlers the content without scripts.
- **Alternatives**: a separate poll template (a second page to keep in step with the header and footer); server-side
  rendering of the card itself (a second renderer of `pollCard.js`).

## R10. Which polls are indexable

- **Decision**: `poll_visibility = 'Public Poll'` and state `OPEN` or `CLOSED`, or `EDITING` with
  `poll_state_before_edit_update` in (`OPEN`, `CLOSED`) — the projection shows the stashed state while editing.
  One predicate, `isIndexable(row)`, in `src/polls/access.ts` beside `mayViewResults` (the project's single place for poll access), and its SQL twin for the sitemap query. `/poll/:pid` and `/api/polls/:pid/card` require both `mayViewResults` for a guest and `isIndexable`.
  `lastmod` is `closed_at` when set, else `launched_at` (the table has no `updated_at`).
- **Rationale**: requirements UA4; spec FR-019, FR-020, FR-024. `WAITING TO OPEN` and `ARCHIVED` are not indexed.

## R11. The guest card route

- **Decision**: `GET /api/polls/:pid/card`, shed as `refresh`, answers for an indexable poll
  `{poll: projectPoll(row), counts, overlay: {voted: false, bookmarked: false, mayWatch: false, voteBlockedReason: null}}`
  — the shape of `/api/me/polls/:pid` — and `404` otherwise. It needs no session and is not on the terms gate's list
  (the gate acts only with a session cookie, and a signed-in visitor is redirected away from `/poll/:pid`).
- **Rationale**: no route opens a single poll for a guest today (`/api/me/polls/:pid` needs a session); the browser
  reuses `DeltaClient` and `grid.mountRetained` as `mountLinkedPoll` does.

## R12. Crawler rules and the poll list

- **Decision**: `GET /robots.txt` and `GET /sitemap.xml` in `src/routes/seo.ts`, mounted before `express.static`.
  The sitemap is built from one query (R10), holds `/` and every `/poll/<pid>`, absolute on `ENV_PUBLIC_ORIGIN`, and is
  cached for 5 minutes in the cache (`seo:sitemap`, and `seo:sitemap:<n>` parts). Above 50,000 addresses
  `/sitemap.xml` becomes a sitemap index of `/sitemap-<n>.xml` parts. `Cache-Control: public, max-age=300`.
- **Rationale**: spec FR-023, FR-024, SC-005 (at most 5 minutes stale).

## R13. Head tags on the other pages

- **Decision**:
  - `index.html`, `privacy.html`, `terms.html`: a descriptive `<title>` and `<meta name="description">` edited into
    the files; `<link rel="canonical">` injected at serve time from `ENV_PUBLIC_ORIGIN` by a new optional
    `canonicalPath` argument of `sendPage` (`src/routes/assets.ts`).
  - `login.html`, `create-account.html`, `invite.html`, `confirm-signin.html`, `accept-terms.html`, `profile.html`,
    `admin.html`, `admin-results.html`, `not-authorized.html`: `<meta name="robots" content="noindex">` in the file.
- **Rationale**: spec FR-025, FR-027; no hard-coded domain in committed HTML.

## R14. Privacy Policy

- **Decision**: a new `<section id="bot-check">` "Bot check" in `privacy.html`, after `#cookies`, stating what is
  measured, why, where it is kept, for how long (at most one hour) and that it is never shared; the "In short" summary
  gains one line; the check card links to `/privacy#bot-check`. No `TERMS_VERSION` change (the Terms do not change).
- **Rationale**: requirements IN2-A; spec FR-017.

## R15. Tests

- **Decision**:
  - `tests/human-check.test.ts`: every case of US2 against the four routes plus redeem, with `verify` stubbed
    (`valid`, `invalid`, `unreachable`), the fail-open counter, the "finishing" routes exempt, the check off.
  - `tests/config.test.ts` (extend): the four settings and their `ConfigError`s.
  - `tests/client-human-check.test.ts` (jsdom): gate, Try again, three failures → support address, 10-second
    fallback, `refused` → gate again keeping values, headers sent once.
  - `tests/seo.test.ts`: robots, sitemap (included and excluded states, parts above the limit with a lowered limit),
    poll page (tags, escaping, 404 cases), guest card route, `/?PID=` guest redirect.
  - `tests/m3-assets.test.ts`: the new `human-check-m3.css` layer on the three sign-in pages.
  - `tests/fcaptcha.integration.test.ts`: skips without `FCAPTCHA_TEST_URL`; issues and verifies a real pass.
