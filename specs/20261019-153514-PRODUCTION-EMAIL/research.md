# Research: Production Email

**Feature**: `specs/20261019-153514-PRODUCTION-EMAIL/spec.md`
**Date**: 2026-10-20

The provider, the sending domain, the anti-bot approach and the hand-done AWS and DNS setup were researched and decided in the
requirements review (`requirements/20261019-153514-production-email/requirements-report.md`, RS1–RS17). This file records the
implementation decisions the plan adds on top of them.

## R1. How CrowdPoll talks to Amazon SES

- **Decision**: nodemailer 7's built-in SES transport, given an `SESv2Client` and `SendEmailCommand` from a new dependency,
  `@aws-sdk/client-sesv2`, pinned to `3.1135.0`, the version of the `@aws-sdk/client-s3` already in use.
  The SES API is HTTPS on port 443, which DigitalOcean does not block (AM1).
- **Rationale**: `src/email/mailer.ts` keeps one nodemailer `Transporter`, so `send()`, the four message functions and the
  tests' `setTransport` injection are unchanged in shape (`tests/helpers/setup.ts:88`).
  nodemailer builds the MIME message and returns SES's id (`node_modules/nodemailer/lib/ses-transport/index.js:164`: `messageId`
  is `<MessageId@region.amazonses.com>`, `response` is the bare `MessageId`).
  Sharing the AWS SDK core with `client-s3` keeps the install small.
- **Alternatives considered**:
  - SES's SMTP interface on port 2587: works through DigitalOcean, but AM1 chose the HTTPS API, and SMTP credentials are a second
    secret type to rotate.
  - Calling the SES API with hand-written SigV4 signing over `fetch`: no dependency, but ~100 lines of signing code to own and test.

## R2. Choosing the transport, and the production signal (FR-003, FR-007, clarify D1)

- **Decision**: a new setting, `ENV_EMAIL_TRANSPORT`, with two values:
  - `smtp` (default): today's behaviour, unchanged: SMTP with `ENV_SMTP_*` when user and password are set, otherwise the console
    `jsonTransport`. It stays in the code for reference; since TWEAKS01 the development templates set `ses` too, and since TWEAKS03
    they send from `us-east-1` as `no-reply@dev.mail.crowdpoll.vote`, with a key that can send nowhere else (quickstart §6).
  - `ses`: SES with `ENV_SES_REGION`, `ENV_SES_ACCESS_KEY_ID` and `ENV_SES_SECRET_ACCESS_KEY`, all three required;
    `loadConfig` throws a `ConfigError` naming the missing one, so the app refuses to start, as it does for `ENV_BETTER_AUTH_SECRET`
    (`src/config.ts:163`). `ses` never falls back to the console.
  - `.do/app.yaml` sets `ENV_EMAIL_TRANSPORT=ses`; a test reads `.do/app.yaml` and fails if it does not, so production cannot
    drift back to the silent fallback.
- **Rationale**: an explicit setting is the production signal: nothing about a machine decides it.
  The app sets no `NODE_ENV` anywhere today (`.do/app.yaml`, `src/`), and tying email to it would couple unrelated behaviour to a
  variable libraries also read.
  "All three or none" follows `spacesConfig` (`ENV_SPACES_*`).
- **Alternatives considered**: `NODE_ENV=production` (above); a separate `ENV_EMAIL_REQUIRED=1` flag beside automatic transport
  detection (two settings for one decision).

## R3. The sender setting

- **Decision**: `ENV_EMAIL_FROM` replaces `ENV_SMTP_FROM`, with the default `CrowdPoll <no-reply@mail.crowdpoll.vote>` (FR-008);
  `ENV_SMTP_FROM` is no longer read.
- **Rationale**: the sender applies to every transport, so an `SMTP` name would mislead once SES is used; the old default,
  `NativeAuthOAuth <no-reply@nativeauth.local>`, is a placeholder on a domain that does not exist (requirements report §2.2).
- **Alternatives considered**: keeping `ENV_SMTP_FROM` (misleading name); reading both (two names for one value).
- **Breaking**: `.do/app.yaml`, `launch.json.example` and `devScripts.example/launch-dev.ps1` move to the new name.

## R4. Bounding a send (FR-004, clarify Q4)

- **Decision**: `ENV_EMAIL_SEND_TIMEOUT`, in ms, default `10000`, read by `intVar`.
  `send()` races `transporter.sendMail()` against a timer and throws `MailError` when the timer wins, so every caller keeps its
  existing `502` (or, for the change notice, its log line).
- **Rationale**: the race bounds every transport the same way, SMTP and console included, without per-library timeout options.
  The SDK may still deliver a message after the timer; the log then shows a timeout followed by nothing, and the person simply
  asks again.
- **Alternatives considered**: the SDK's `requestTimeout` on `NodeHttpHandler` (SES only, and retries multiply it); no bound.

## R5. What a send logs (FR-005, clarify Q3)

- **Decision**: one line per send, `[mailer] Sent <type> to <masked> (message id <id>)`, with `<type>` one of `login-link`,
  `create-account`, `email-change-verification`, `email-change-notice`, and `<masked>` the first character of the local part,
  `•••`, `@` and the domain (`j•••@gmail.com`).
  A failure logs `[mailer] Failed to send <type> to <masked>:` and the error.
  The existing `[auth]` and `[profile]` lines in `src/routes/api.ts` that print the full address (create-account and
  login-link) print the masked form instead.
- **Rationale**: the operator matches a report by its masked address and time, then looks the message id up in SES
  (`aws sesv2` or the console's suppression list). Links and tokens never reach a log: the message body is never logged except by
  the development console transport, which is unchanged.
- **Alternatives considered**: full addresses (personal data in every log line); id only (a report cannot be matched).

## R6. One branded layout (FR-009–FR-012, clarify O1)

- **Decision**: a new module, `src/email/templates.ts`, holding:
  - `escapeHtml(value)` for every inserted value (FR-011);
  - `layout({ origin, preheader, heading, paragraphs, action? })`, which returns `{ text, html }`;
  - the four messages' wording, drafted in `contracts/email-messages.md` and approved by the developer before implementation.
  The HTML is a single 600 px table with inline styles (mail apps drop `<style>` blocks and external CSS), the site's colours from
  `src/public/m3-tokens.css` (`--md-sys-color-primary` `#2C6A46` for the header bar and the action button, white text), the logo,
  the heading, the paragraphs, one action button with its URL also written out as text, and a footer naming
  `support@crowdpoll.vote`.
  The text part carries the same content, with the URL on a line of its own.
- **Rationale**: one layout keeps the four messages consistent and makes later wording changes data, not markup.
  No `Reply-To` is set (UA6), and nothing adds tracking pixels or rewritten links (FR-012).
- **Alternatives considered**: a template engine (a dependency for four messages); MJML (a build step).

## R7. The logo in email

- **Decision**: a new static file, `src/public/email-logo.png`, 96 × 96 px, shown at 48 px, rendered from `src/public/favicon.svg`
  by `devScripts/favicon-ico.ts`, which gains this one extra output.
  The layout references it as `<origin>/email-logo.png`, an absolute URL, with `alt="CrowdPoll"` and the word mark "CrowdPoll" in
  text beside it, so the brand shows even when a mail app blocks images.
  `express.static` serves it at that bare path, as it does `/favicon.ico` (FAVICON plan R2).
  `<origin>` is the link's origin unless `ENV_EMAIL_ASSET_ORIGIN` names another (TWEAKS06): a mail app's image proxy, such as
  Gmail's, fetches the logo from its own servers and cannot reach `localhost`, so the development templates load it from
  `https://crowdpoll.vote`. Production leaves the setting unset.
- **Rationale**: Gmail and Outlook do not render SVG or inline `data:` images reliably; a hosted PNG is the portable choice.
- **Alternatives considered**: a text-only word mark (no logo, against FR-009); a CID attachment (heavier messages, shown as an
  attachment by some apps).
- **Origin**: `sendLoginLink`, `sendCreateAccountInvitation` and `sendEmailChangeVerification` take the origin from their URL;
  `sendEmailChangeNotice` gains an `origin` argument, passed by its caller from `requestOrigin(req)`.

## R8. The hidden field (FR-013–FR-015)

- **Decision**: each of the three forms (`login.html`, `create-account.html`, the email-change form in `profile.html`) gets one
  input named `homepage`, inside a wrapper that is `aria-hidden="true"`, positioned off-screen (not `display:none`, which some bots
  skip), with `tabindex="-1"` and `autocomplete="off"`.
  `loginCard.js`, `createAccountCard.js` and `profileCard.js` send its value as `homepage` in the JSON body.
  On the server, a non-empty `homepage` on `POST /api/auth/create-account`, `POST /api/auth/request-login-link` or
  `POST /api/me/email-change` is checked first: the route logs `[auth] Honeypot filled on <path>; nothing sent` and returns the
  same success reply (`200 {"message":"Check your inbox"}`, or `202 {"message":"Verification sent to new address"}`) without
  consuming the rate limit, creating an account or sending mail. An absent field is treated as empty.
- **Rationale**: the reply gives a script no signal (spec US3 scenario 2), and scripted clients that never send the field are
  unaffected.
- **Alternatives considered**: a minimum fill time (rejected in RS2); a `400` reply (tells the bot it was caught).

## R9. Binding a sign-in link to its browser (FR-016–FR-020, clarify Q2)

- **Decision**:
  - When `issueLoginLink` issues a link (from create-account or request-login-link), the route generates 24 random bytes, sets
    the cookie `signin_binding=<base64url>` (`HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=900`) and passes
    `bind = hashToken(value)` in the magic-link `metadata`; `sendMagicLink` appends `&bind=<hash>` to the emailed URL.
  - `GET /api/auth/verify` signs in at once, exactly as today, when `hashToken(cookie) === bind`; afterwards it clears the cookie
    (`Max-Age=0`).
  - Otherwise (no cookie, another browser, no `bind`) it does **not** consume the token. It looks the token up as `link-info`
    does: an unknown or expired token gets today's `/login?error=invalid-link` redirect (spec Edge Cases, FR-018); a valid
    one is redirected to `/confirm-signin?token=…&stay=…[&PID=…]`, a new page.
  - The page calls `GET /api/auth/link-info?token=…`, which reads the verification row by `hashToken(token)` (BetterAuth stores
    hashed tokens with the same SHA-256 base64url, `node_modules/better-auth/dist/plugins/magic-link/utils.mjs`) and returns the
    account's email and the row's `createdAt`, or `404` when the link is unknown or expired.
  - Its **Sign in** button posts `{ token, stay, pid }` to `POST /api/auth/confirm-signin`, which runs the same sign-in as the fast
    path. The route refuses (`403`) a request whose `Origin` is not the site's own, so another site cannot submit it and sign a
    visitor into the attacker's account.
  - **Not now** links to `/login`; no session is created and the link stays usable until it expires (FR-018).
- **Rationale**: the URL carries only a hash of the cookie value, so a stolen link is useless without the browser, and nothing new
  is stored. A mail scanner that loads the link reaches only the confirmation page, and loading it consumes nothing.
  The fast path keeps today's one-click sign-in for the common case.
  The sign-in steps after the token check move into one function used by both routes, so stay-signed-in and the shared poll are
  honoured on both (FR-019).
- **Alternatives considered**: storing the binding on the verification row (needs a write into BetterAuth's table); a confirm
  page for every link (an extra click for everyone).
- **Test impact**: tests that follow an emailed link must carry the `signin_binding` cookie from the request's response, or expect
  the confirmation page. `tests/helpers/setup.ts` gains a helper that does so.

## R10. One mailbox, one account (FR-024–FR-028, clarify Q1)

- **Decision**: a comparison key computed in SQL by one helper, `emailKey(expression)` in a new `src/auth/emailKey.ts`, applied
  to both the stored column and the candidate address:
  `split_part(local, '+', 1)` with every `.` removed when the domain is `gmail.com` or `googlemail.com`, which both map to
  `gmail.com`, joined with `@domain`; addresses are already lower case (`parseEmail`, `src/routes/api.ts:42`).
  A new migration, `008-email-key`, adds a non-unique expression index on `emailKey("email")` of `"user"`.
  The key is used in three places:
  - `POST /api/auth/create-account`: an existing account found by key gets its normal sign-in link at its **stored** address
    (FR-026); no account is created.
  - `POST /api/me/email-change` and `GET /api/me/email-change/verify`: another account found by key (the caller's own row
    excluded) refuses the change with today's `409` and redirect (FR-027).
  Sign-in requests (`request-login-link`) keep exact matching: an unmatched variant gets the create-account invitation, and
  creating the account then finds the existing one.
- **Rationale**: one definition, in SQL, serves both sides of every comparison, so TypeScript and the database cannot disagree;
  the index keeps the lookup fast, and no column or backfill is needed. Existing accounts are untouched, including any two that
  already share a key (FR-028): the index is not unique.
- **Alternatives considered**: a stored `email_key` column (a backfill, and a second place to keep in step); normalizing in
  TypeScript and scanning users (slow, and a second definition).

## R11. The cookie policy (FR-020)

- **Decision**: the banner text in `src/public/app.js:447` becomes: "This app uses a strictly necessary session cookie to keep you
  signed in, and a short-lived security cookie while a sign-in link is waiting to be used. No other cookies are set."
  The cookie policy in `CLAUDE.md` (Project Overview and Architecture Notes) becomes "`session_token` plus strictly necessary
  security cookies (`signin_binding`)". The banner stays informational.
- **Rationale**: both cookies are strictly necessary, so no consent flow is needed (RS6).

## R12. Testing

- **Decision**: Vitest + supertest on the existing embedded-PostgreSQL context, with the capture transport. New or extended
  tests:
  - `config.test.ts`: `ENV_EMAIL_TRANSPORT=ses` without each SES variable throws; `.do/app.yaml` sets `ses`; `ENV_EMAIL_FROM` and
    `ENV_EMAIL_SEND_TIMEOUT` defaults.
  - a new `mailer.test.ts`: the layout (logo URL, footer address, plain-text part), escaping, the masked log line with the message
    id, the timeout, and the SES transport built over a stub client whose `send()` returns a `MessageId`.
  - a new `honeypot.test.ts`: each endpoint with `homepage` filled sends nothing and replies as on success.
  - a new `signin-binding.test.ts`: same browser signs in at once; another browser is redirected to the confirmation page and the
    token survives; `link-info`; `confirm-signin` signs in, honours `stay` and `PID`, and refuses a foreign `Origin`; declining
    creates no session; the cookie is cleared after sign-in.
  - a new `email-key.test.ts` and the migration test pattern of `migration-title-lengths.test.ts`: plus-tag and Gmail-dot
    matches on create-account and email change; existing colliding accounts still sign in.
  - `openapi-contract.test.ts` covers the changed and new routes; `pages.test.ts` covers `confirm-signin.html` and
    `email-logo.png`.
  - Existing tests that follow emailed links use the new helper (R9).
- **Not automated**: real delivery to Gmail, Outlook and Yahoo, and the header check (SC-001, SC-002); they are quickstart
  steps against production.
