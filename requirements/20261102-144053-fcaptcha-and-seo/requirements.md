Start a new spec for these requirements called `20261102-144053-FCAPTCHA-AND-SEO`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

The site will use the npm library fcaptcha to prevent Bots and AI Agents from accessing the site as a signed in user.  

https://github.com/WebDecoy/FCaptcha

The reason we want to use FCaptcha rather than some third-party service is to eliminate any privacy concerns of using a third-party service.  
Please research to ensure that this approach is effective while maintaining user privacy.

Before the "Login" page is displayed, the fcaptcha challenge should be presented to the user to verify that they are not a bot or AI agent.  

We want to deploy FCaptcha using its standalone node.js server mode (not using Docker or Kubernetes).

As followup requirements-report Findings, ask questions regarding the various options for deploying FCaptcha, and provide recommendations based on effectiveness and privacy considerations.  

We would like the color mode of the FCaptcha challenge to match the site's color scheme, if possible.

A related requirement, is that we do want to encourage Search Engine Optimization (SEO) fopr the site to ensure that the polls are indexed by search engines.  
Add whatever is needed to ensure this.

## Decisions

Decisions accepted in `requirements-report.md`, by finding.  

### RS1. Adopt FCaptcha as one layer of friction, not as a guarantee.

- FCaptcha is adopted as one layer of friction against automated sign-ins, not as a guarantee: no CAPTCHA reliably stops current AI browser agents (FCaptcha's own open issue #87 shows a stealth agent passing).  
- It is kept alongside the existing defences (sign-in email rate limit, allowlist `isAllowed`, `signin_binding`), never in place of them.  
- Its browser measurements are disclosed in the Privacy Policy (IN2), and its token is always checked on the server (IN1).  

### IN1. Check the FCaptcha token on the server, on every route that starts a sign-in.

- The page shows the challenge, and the form sends the token it yields.  
- `POST /api/auth/request-login-link`, `POST /api/auth/create-account`, `POST /api/auth/sign-in/social` and `POST /api/auth/sign-in/oauth2` check the token with the FCaptcha server (`POST /api/token/verify`), requiring `hostname` to be the site's and `action` to match the route, before the allowlist, the rate limit or any email.  
- A missing, expired, reused or failed token answers `400` with the code `challenge-required`, sends nothing and logs no full address.  
- The routes that finish a sign-in (`/api/auth/verify`, `/api/auth/confirm-signin`, the OAuth callbacks) are not challenged.  

### IN3. Give each public, published poll a crawlable address that no challenge stands in front of.

- A new server-written page, `/poll/<PID>`, holds the poll's title, description and choices in plain HTML; in a browser, its script then opens the live poll maximized, as a guest opening it from Trending sees it now.  
- It answers `404` for a private, unpublished or missing poll, by the existing access rules (`mayViewResults`).  
- `/?PID=…` keeps its behaviour for signed-in users and private polls; for a guest and a public, published poll it sends them to `/poll/<PID>` instead of `/login`.  
- The challenge stays on the sign-in pages only, so crawlers never meet it.  

### AM2. Challenge once, at the start of every sign-in, and never a signed-in user.

- The challenge appears on `/login`, `/create-account` and `/invite`, in front of the email form and the provider buttons alike, in every `ENV_SIGNIN_METHOD`.  
- `/confirm-signin`, the emailed link and the provider callbacks are not challenged.  
- A signed-in session is never challenged again; votes keep their own defences (rate buckets and load shedding).  

### AM3. Use `data-theme="auto"`, so the widget is light or dark as the page is.

- "Match the site's color scheme" means the same light or dark mode as the page, which follows the device's `prefers-color-scheme`: the widget uses `data-theme="auto"`.  
- The card around the widget uses the site's own M3 tokens.  
- If the device switches mode while the page is open, the widget keeps its mode until it is drawn again; that is accepted.  

### UA1. Say so plainly and let them try again, with no lock-out.

- A failed check shows "We couldn't confirm you're a person. Please try again." with a Try again control, announced to screen readers.  
- An expired or spent token (including a `challenge-required` answer from the server) shows the challenge again in place, keeping what was typed.  
- After repeated failures the message adds the support address, `support@crowdpoll.vote`.  
- Failures are logged with the masked IP (`maskIp`) and the reasons FCaptcha gives, never an email address.  

### UA3. Add a small set of `ENV_FCAPTCHA_*` settings, with the challenge off unless configured.

- New settings: `ENV_FCAPTCHA_ENABLED` (default `false`), `ENV_FCAPTCHA_URL` (the FCaptcha server as the web service reaches it), `ENV_FCAPTCHA_SITE_KEY` and `ENV_FCAPTCHA_VERIFY_SECRET` (an encrypted console variable, never in `.do/app.yaml`).  
- Turning it on without the URL or secret stops the app with a `ConfigError`.  
- The FCaptcha service's own variables (`FCAPTCHA_SECRET`, `FCAPTCHA_VERIFY_SECRET`, `FCAPTCHA_SITE_KEYS`, `FCAPTCHA_ALLOWED_HOSTNAMES`, `REDIS_URL`, `TRUSTED_PROXIES`) are set on its component and keep FCaptcha's names.  
- Tests stub the verify call; one `*.integration.test.ts` runs against a real FCaptcha server when its URL is given, and skips otherwise.  
- `.claude/rules/environment.md`, the `.example` launch templates and `postman/openapi.json` are updated.  

### UA4. Only public polls that have been published (open or closed), and only what a guest already sees.

- Only public polls that have been published (open or closed) are indexable.  
- Private, draft, pending, rejected and deleted polls are never listed or served to crawlers, and answer `404`.  
- The indexed page holds the title, description, choices and the published results a guest may see (`mayViewResults`), never who created it, who added a choice or who voted.  
- A poll that turns private or is deleted leaves the sitemap at once and answers `404`.  

### UA5. The standard set, served by the web service itself.

- `robots.txt`: allow `/`, `/poll/`, `/privacy`, `/terms`; disallow `/api/`, `/admin`, `/profile`, `/login`, `/create-account`, `/invite`, `/confirm-signin`, `/accept-terms`; name the sitemap.  
- `sitemap.xml`: every indexable poll with its last change, plus the home page, built from PostgreSQL and cached briefly; a sitemap index once it passes 50,000 addresses.  
- Every public page: a descriptive `<title>`, a `<meta name="description">` and a `<link rel="canonical">` on the production domain.  
- Each poll page: Open Graph and Twitter card tags (no image, or a site image, so no third-party fetch), and schema.org JSON-LD for the question and its choices.  
- Sign-in, admin and profile pages carry `<meta name="robots" content="noindex">`.  
- Success is measured by the indexed poll count in the search engines' own consoles, set up by the developer outside the site.  

### UA6. Pin exact versions, update deliberately.

- `@webdecoy/fcaptcha` and `@webdecoy/fcaptcha-client` are pinned to the same exact version (1.46.1 today) with a committed lock file.  
- The widget script is served by the FCaptcha service itself, never from a CDN, so client and server always match.  
- An update is a reviewed change: read its release notes, run the integration test, deploy both components together.  

### NC4. Strict on what is proven, off for what is experimental, and no verdict log.

- `FCAPTCHA_ALLOWED_HOSTNAMES` lists the production domain only, and the web service also checks `hostname` and `action`.  
- Tokens are bound to the client IP, with `TRUSTED_PROXIES` set so FCaptcha reads the address App Platform's edge reports, not a forged `X-Forwarded-For`.  
- `FCAPTCHA_EXPERIMENTAL_BLOCKING` stays off; the default score threshold is used and revisited only with evidence.  
- `FCAPTCHA_LOG_VERDICTS` stays off; the web service logs only masked outcomes.  
- `FCAPTCHA_INSECURE_DEV_MODE` is never set in production.  

### IN2. Keep the full checks, as a security measure, and disclose them. (Recommendation A)

- FCaptcha runs with its full checks, browser fingerprinting included (canvas, WebGL, audio and font measurements, TLS fingerprint), as a security measure.  
- The measurements are taken only on the challenge page, only to tell people from programs, kept in FCaptcha's memory for at most an hour and never sent elsewhere; they are treated as strictly necessary for security.  
- The Privacy Policy gains a short "Bot check" section saying exactly that; the developer confirms the "strictly necessary" basis.  

### AM1. A separate challenge page before `/login`. (Recommendation A)

- The challenge is a separate page shown before the sign-in page: a visitor going to `/login`, `/create-account` or `/invite` without a valid token is shown the challenge page first, and on passing it is taken on to the page they asked for, with its query (`PID`, invitation token) kept.  
- This refines AM2 and UA1: the challenge stands before `/login`, `/create-account` and `/invite` rather than on them, and a failed, expired or spent token (including a `challenge-required` answer at submit) sends the visitor back to the challenge page.  
- The token is carried to the sign-in page in the browser, never in a URL or a log; if browser storage is used, its key gets a Cookie Use row in `privacy.html`.  
- A token lasts 5 minutes and is single-use, so a visitor who takes longer on the sign-in page passes the challenge again.  

### UA2. Fail open, logged, with the existing limits still applied. (Recommendation B)

- When the FCaptcha server cannot be reached, sign-in fails open: the request goes ahead with the sign-in email rate limit, the allowlist and `signin_binding` still applied.  
- Each skipped check is logged and counted on `/healthz`, so an outage is seen.  
- Only an unreachable FCaptcha counts: a token FCaptcha answers as invalid is always refused.  

### NC1. A second App Platform service in the same app, routed at `/fcaptcha` on the site's domain. (Recommendation A)

- The standalone FCaptcha server runs as a second App Platform service in the same app: a folder in this repository (e.g. `fcaptcha-server/`) holds a `package.json` depending on `@webdecoy/fcaptcha` and a start script, built by the Node buildpack like the web service.  
- App Platform's ingress routes `/fcaptcha/*` on the site's domain to it, so the widget and its calls are same-origin, with no CORS and no third-party request.  
- The web service reaches it privately for token checks; the verify secret guards its verify routes.  

### NC2. Use the existing Valkey, under its own key prefix, and autoscale 1 to 3 instances. (Recommendation A)

- FCaptcha keeps its state in the existing Valkey (`REDIS_URL`), under its own key prefix, and its service autoscales from 1 to 3 instances.  
- A spent token stays spent whichever instance answers; a Valkey outage is handled as UA2 says.  

### NC3. Checkbox. (Recommendation A)

- The widget runs in checkbox mode: the visitor ticks it, which gives the strongest behavioural signal and is keyboard and screen-reader operable.  
