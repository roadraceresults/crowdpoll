# Quickstart: Human Check Before Sign-In, and Search Engine Indexing of Public Polls

## Automated

```
npx tsc --noEmit
npm test
npx vitest run tests/human-check.test.ts tests/client-human-check.test.ts tests/seo.test.ts tests/config.test.ts tests/m3-assets.test.ts
```

All pass with no local services; `tests/fcaptcha.integration.test.ts` skips unless `FCAPTCHA_TEST_URL` is set.

## Local, with a real FCaptcha server

The two secrets are random strings, generated rather than typed, and different from each other:

- `ENV_FCAPTCHA_SECRET` signs the passes and never leaves the FCaptcha server. FCaptcha refuses to start unless it is at
  least 32 bytes with at least 8 distinct characters; `openssl rand -hex 32` gives 64 hex characters.
- `ENV_FCAPTCHA_VERIFY_SECRET` is what the web app presents to `/api/token/verify` (it falls back to the signing key when
  unset). Keeping it apart means a leaked verify secret cannot mint passes. The app's `ENV_FCAPTCHA_VERIFY_SECRET`, and
  the integration test's `FCAPTCHA_TEST_VERIFY_SECRET`, must equal it.

1. Start the server, from the repository root, in one terminal:

   Git Bash:

   ```
   export ENV_FCAPTCHA_SECRET=$(openssl rand -hex 32) ENV_FCAPTCHA_VERIFY_SECRET=$(openssl rand -hex 32)
   echo "verify secret: $ENV_FCAPTCHA_VERIFY_SECRET"
   cd fcaptcha-server && npm ci && ENV_FCAPTCHA_SITE_KEYS=dev ENV_FCAPTCHA_ALLOWED_HOSTNAMES=localhost ENV_FCAPTCHA_PORT=3001 npm start
   ```

   PowerShell 7:

   ```
   $env:ENV_FCAPTCHA_SECRET = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
   $env:ENV_FCAPTCHA_VERIFY_SECRET = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
   "verify secret: $env:ENV_FCAPTCHA_VERIFY_SECRET"
   $env:ENV_FCAPTCHA_SITE_KEYS = "dev"; $env:ENV_FCAPTCHA_ALLOWED_HOSTNAMES = "localhost"; $env:ENV_FCAPTCHA_PORT = "3001"
   cd fcaptcha-server; npm ci; npm start
   ```

2. In a second terminal, with the verify secret printed in step 1, run the integration test from the repository root
   (inside `fcaptcha-server/` vitest finds neither `vitest.config.ts` nor `tests/` and stops with "No test files found"):

   Git Bash:

   ```
   cd <repository root>
   FCAPTCHA_TEST_URL=http://localhost:3001 FCAPTCHA_TEST_VERIFY_SECRET=<the verify secret> npx vitest run tests/fcaptcha.integration.test.ts
   ```

   PowerShell 7:

   ```
   cd <repository root>
   $env:FCAPTCHA_TEST_URL = "http://localhost:3001"; $env:FCAPTCHA_TEST_VERIFY_SECRET = "<the verify secret>"
   npx vitest run tests/fcaptcha.integration.test.ts
   ```

   All three tests pass.

The browser reaches the widget at `/fcaptcha` on the site's own domain. On a deployed app App Platform's ingress
provides it; on a local run (`ENV_PUBLIC_ORIGIN` on `localhost`) the web app forwards `/fcaptcha/*` to `ENV_FCAPTCHA_URL`
itself, so with both servers running the check can be tried at `http://localhost:8080/login`. The manual scenarios below
are still signed off on a deployed app (a staging deploy, or production with the check turned on).

### Diagnosing a local run with the check turned on

When the page shows "The human check is unavailable right now." over the sign-in card, the widget did not load. With
the FCaptcha server started as in step 1 and the web app's `ENV_FCAPTCHA_URL=http://localhost:3001`, check each link:

| Command | Expected | If not |
|---|---|---|
| `curl -i http://localhost:3001/health` | `200` | FCaptcha is not on 3001: its log says `running on port 3000` when `ENV_FCAPTCHA_PORT` was not set in its terminal |
| `curl -i http://localhost:3001/fcaptcha.js` | `200`, `application/javascript` | The widget file is missing: run `npm ci` in `fcaptcha-server/` |
| `curl -i http://localhost:8080/fcaptcha/fcaptcha.js` | `200`, `application/javascript` | `502`: the web app cannot reach `ENV_FCAPTCHA_URL`; `404` `text/html`: the check is off, or `ENV_PUBLIC_ORIGIN` is not on `localhost` |
| `curl -s http://localhost:8080/api/config` | `"humanCheck":{"siteKey":"dev","endpoint":"/fcaptcha"}` | `null`: `ENV_FCAPTCHA_ENABLED` is not `1` in the web app's terminal |
| `curl -i -X POST http://localhost:8080/api/auth/request-login-link -H "Content-Type: application/json" -d '{"email":"a@b.c"}'` | `400 challenge-required` | Accepted, with `[human-check] Skipped: service unreachable` in the web log: the web app cannot reach `ENV_FCAPTCHA_URL` |

In PowerShell, call `curl.exe` (plain `curl` is `Invoke-WebRequest`), and quote the JSON body as `'{\"email\":\"a@b.c\"}'`.

## Manual scenarios (map to the spec's user stories)

| # | Story | Steps | Expected |
|---|---|---|---|
| 1 | US1 | Open `/login` signed out, tick the check | Only the "Vote protection" card ("I am not a Bot or AI Agent", no maker name) at first; after ticking, the login card replaces it at the same address; a link request succeeds |
| 2 | US1 | Device in dark mode, open `/login` | The widget is dark |
| 3 | US1 | Tab to the checkbox, press Space; use a screen reader | Operable; the result is announced |
| 4 | US2 | `curl -X POST /api/auth/request-login-link -d '{"email":"a@b.c"}'` with no header | `400 challenge-required`; no email |
| 5 | US2 | Replay a pass already used; a pass from `/invite` sent to `/api/auth/create-account` | Both `400 challenge-required` |
| 6 | US2 | Sign in by the emailed link in another browser | No check asked |
| 7 | US3 | Force three failures (DevTools: `navigator.webdriver` spoof) | Message, Try again, then the support address |
| 8 | US3 | Pass, wait 6 minutes, submit | The check returns; after passing, the form keeps the email |
| 9 | US4 | `curl /robots.txt`, `/sitemap.xml`, `/poll/<public open pid>` | Rules as A5; the poll listed with lastmod; the page source holds title, description, choices, canonical, og: tags, JSON-LD |
| 10 | US4 | `curl /poll/<private pid>`, `/poll/<rejected pid>`, `/poll/zzz` | `404` each, same body |
| 11 | US5 | Signed out, open `/?PID=<public open pid>` | `/poll/<pid>` with the live card maximized; the summary removed |
| 12 | US5 | Signed out, open `/?PID=<private pid>` | `/login?PID=…` as today |
| 13 | US6 | `/privacy#bot-check` | The section; the check card's "What this safeguard checks." link reaches it |
| 14 | US7 | Stop the FCaptcha server, open `/login` | Within 10 s "The human check is unavailable right now" and the form; a link request succeeds; `/healthz` `abuse.humanCheckSkipped` > 0 |
| 15 | US7 | Start CrowdPoll with `ENV_FCAPTCHA_ENABLED=1` and no URL | Stops with a `ConfigError` naming `ENV_FCAPTCHA_URL` |

## Deployment checks (App Platform)

- **D1** `.do/app.yaml` has the `fcaptcha` service and the `ingress.rules` (`/fcaptcha` → `fcaptcha`, `/` → `web`);
  both services are deployed together.
- **D2** `https://<domain>/fcaptcha/health` answers; `https://<domain>/fcaptcha/fcaptcha.js` loads; the browser's
  network panel on `/login` shows requests to the site's own domain only.
- **D3** Confirm the real client address header: log, once, the headers App Platform adds on a request to each service
  (expected `do-connecting-ip`); set FCaptcha's trusted header to it, then turn IP binding on and repeat scenario 1.
- **D4** In the search engines' consoles, submit `https://<domain>/sitemap.xml`.
- **D5** Scale `fcaptcha` to 2 instances, pass the check once, send the same pass twice (e.g. replay the request with curl): the second is refused with `challenge-required`, whichever instance answers.
