---

description: "Task list for production email"
---

# Tasks: Production Email

**Input**: Design documents from `specs/20261019-153514-PRODUCTION-EMAIL/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R12), data-model.md, contracts/api.md (A1–A6), contracts/ui-contracts.md (C1–C4), contracts/email-messages.md (M1–M4), quickstart.md

**Tests**: Requested. The plan's test strategy (R12) and SC-007 call for them. Write each story's tests first and watch them fail.

**Organization**: Tasks are grouped by user story, so each story can be built and checked on its own. The address normalization (FR-024–FR-028) sits with US3, the abuse-protection story.

**Branch**: `dev`. A push to `dev` deploys. Production needs the `.do/app.yaml` settings of T012 and the SES secrets set in App Platform **before** that push, or the app will refuse to start (R2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task belongs to (US1–US5)

## Path Conventions

Single project: `src/`, `tests/` and `devScripts/` at the repository root. No explanatory comments in new code (Constitution VI).

---

## Phase 1: Setup

**Purpose**: The dependency, and the approved wording the templates need.

- [X] T001 Add `"@aws-sdk/client-sesv2": "3.1135.0"` to `dependencies` in `package.json`, the same version as `@aws-sdk/client-s3` (R1), and run `npm install` so `package-lock.json` updates.
- [X] T002 Get the developer's approval of `specs/20261019-153514-PRODUCTION-EMAIL/contracts/email-messages.md` (M1–M4). Apply any wording changes there, and set its **Status** line to `Approved <date>`. US2's templates (T017) copy this file's text.

---

## Phase 2: Foundational

**Purpose**: The settings and the typed, logged `send()` that every story uses.

**⚠️ CRITICAL**: Finish this before any user story.

- [X] T003 In `tests/config.test.ts`, add failing tests (data-model.md Configuration, R2–R4):
  - `ENV_EMAIL_TRANSPORT` defaults to `smtp`, accepts `ses`, and rejects any other value;
  - with `ses`, each missing one of `ENV_SES_REGION`, `ENV_SES_ACCESS_KEY_ID` and `ENV_SES_SECRET_ACCESS_KEY` throws a `ConfigError` naming that variable;
  - `ENV_EMAIL_FROM` defaults to `CrowdPoll <no-reply@mail.crowdpoll.vote>`, and `ENV_SMTP_FROM` is ignored;
  - `ENV_EMAIL_SEND_TIMEOUT` defaults to `10000` and rejects non-positive values;
  - update the two existing SMTP tests at `tests/config.test.ts:69-91`: drop `from` from the expected `smtp` object and `ENV_SMTP_FROM` from their env, and check `emailFrom` instead (analyze finding U2).
- [X] T004 In `src/config.ts`, implement T003:
  - replace `smtp.from` with a top-level `emailFrom` read from `ENV_EMAIL_FROM`;
  - add `emailTransport: "smtp" | "ses"`;
  - add `ses?: { region, accessKeyId, secretAccessKey }`, all three required when `emailTransport` is `ses`, with a `ConfigError` like `Invalid ENV_SES_REGION: required when ENV_EMAIL_TRANSPORT=ses.`;
  - add `emailSendTimeoutMs: intVar(env, "ENV_EMAIL_SEND_TIMEOUT", 10_000)`.

  Update every use of `config.smtp.from` (only `src/email/mailer.ts`).
- [X] T051 Create `tests/mailer.test.ts` with failing tests for T005 and T006 (R4, R5; moved here from US5 by analyze finding C1). Capture logs with `vi.spyOn(console, "log")` / `console.error` and use the test transport (message ids `test-N`):
  - a send logs `Sent login-link to j•••@example.org (message id test-…)`;
  - no log line contains the full address, the link or its token;
  - a transport that never resolves makes the send throw `MailError` after `emailSendTimeoutMs` (set to 50 ms);
  - `maskAddress` handles one-character local parts.
- [X] T005 In `src/email/mailer.ts`, give `send()` a first parameter `type: "login-link" | "create-account" | "email-change-verification" | "email-change-notice"`, and pass it from the four `send…` functions. Add an exported `maskAddress(address)`: first character of the local part, `•••`, `@`, the domain (R5). Replace the two log lines:
  - success: `[mailer] Sent ${type} to ${maskAddress(to)} (message id ${info.messageId})`;
  - failure: `[mailer] Failed to send ${type} to ${maskAddress(to)}:` with the error.

  Keep the `jsonTransport` message dump for development.
- [X] T006 In `src/email/mailer.ts`, bound every send (R4): race `transporter.sendMail(...)` against a timer of `config.emailSendTimeoutMs`, stored by `initMailer`. The timer rejects with `MailError("Could not send email")` after logging `[mailer] Timed out sending ${type} to ${maskAddress(to)}`, and is cleared when the send settles.

**Checkpoint**: `npm test` passes; the sends log masked recipients with message ids.

---

## Phase 3: User Story 1 - Receive the sign-in link in a real inbox (Priority: P1) 🎯 MVP

**Goal**: In production, the four messages go through Amazon SES over HTTPS.

**Independent Test**: Deploy with `ENV_EMAIL_TRANSPORT=ses`, then request a sign-in link to Gmail, Outlook and Yahoo test mailboxes (quickstart §5.1).

### Tests for User Story 1

- [X] T007 [P] [US1] In `tests/mailer.test.ts` (created by T051), add a failing test for the SES transport (R1):
  - build the transport through a new exported `createTransportFor(config, sesClient?)` with `emailTransport: "ses"` and a stub `sesClient` whose `send()` resolves `{ MessageId: "abc" }`;
  - send a message, and expect the stub to receive a `SendEmailCommand` and `info.messageId` to be `<abc@ca-central-1.amazonses.com>`.
- [X] T008 [P] [US1] In `tests/config.test.ts`, add a failing test that reads `.do/app.yaml` as text and expects an `ENV_EMAIL_TRANSPORT` entry with value `ses`, `ENV_SES_REGION` with `ca-central-1`, and `ENV_SES_ACCESS_KEY_ID` / `ENV_SES_SECRET_ACCESS_KEY` with `type: SECRET` (R2).

### Implementation for User Story 1

- [X] T009 [US1] In `src/email/mailer.ts`, add `createTransportFor(config, sesClient?)` and use it in `initMailer`:
  - for `ses`, `nodemailer.createTransport({ SES: { sesClient: sesClient ?? new SESv2Client({ region, credentials: { accessKeyId, secretAccessKey } }), SendEmailCommand } })`, imported from `@aws-sdk/client-sesv2`, and log `[mailer] SES transport ready (<region>)`;
  - for `smtp`, today's SMTP or `jsonTransport` branch, unchanged.

  `setTransport` stays as is (R1).
- [X] T010 [US1] In `src/email/mailer.ts`, check that `send()` sets no `replyTo` and no tracking headers, and that `from` is `config.emailFrom` (FR-008, FR-012).
- [X] T011 [P] [US1] In `launch.json.example` (every `ENV_SMTP_FROM` line) and `devScripts.example/launch-dev.ps1:95`, rename `ENV_SMTP_FROM` to `ENV_EMAIL_FROM`, with the value `CrowdPoll <no-reply@mail.crowdpoll.vote>`, and add `ENV_EMAIL_TRANSPORT` = `smtp` beside it (R3).
- [X] T012 [US1] In `.do/app.yaml`, next to the `ENV_SMTP_*` entries:
  - rename `ENV_SMTP_FROM` to `ENV_EMAIL_FROM`, with the value `CrowdPoll <no-reply@mail.crowdpoll.vote>`;
  - add `ENV_EMAIL_TRANSPORT` = `ses` and `ENV_SES_REGION` = `ca-central-1`;
  - add `ENV_SES_ACCESS_KEY_ID` and `ENV_SES_SECRET_ACCESS_KEY` as `type: SECRET` with empty values (quickstart §2);
  - remove the four Mailtrap entries `ENV_SMTP_HOST`, `ENV_SMTP_PORT`, `ENV_SMTP_USER` and `ENV_SMTP_PASS`, which apply only to `smtp` (analyze finding I2).

  Set the two secrets' real values in App Platform before deploying.

**Checkpoint**: `tests/mailer.test.ts` and `tests/config.test.ts` pass; production sends through SES.

---

## Phase 4: User Story 2 - Recognize and trust CrowdPoll's emails (Priority: P2)

**Goal**: One branded, escaped layout with the approved wording, from `CrowdPoll <no-reply@mail.crowdpoll.vote>`.

**Independent Test**: Receive each of the four messages and check the sender, layout, plain-text part and authentication (quickstart §4.2, §5.2).

### Tests for User Story 2

- [X] T013 [P] [US2] In `tests/mailer.test.ts`, add failing tests for `layout()` and the four messages (C4, M1–M4):
  - the HTML holds `<origin>/email-logo.png` with `alt="CrowdPoll"`, the heading, the action button, the URL written out, and a footer with `support@crowdpoll.vote`;
  - the text part holds the same lines;
  - the change notice has no `<a href` and no URL;
  - a URL or address holding `<script>` or `"` appears escaped in the HTML.
- [X] T014 [P] [US2] In `tests/pages.test.ts`, add a failing test that `GET /email-logo.png` answers `200` with `image/png` (R7).

### Implementation for User Story 2

- [X] T015 [US2] Extend `devScripts/favicon-ico.ts` to also render `src/public/favicon.svg` at 96 px and write it to `src/public/email-logo.png`, reusing its existing render step (R7). Run `npx tsx devScripts/favicon-ico.ts` once and commit `src/public/email-logo.png`.
- [X] T016 [US2] Create `src/email/templates.ts` with `escapeHtml(value)` and `layout({ origin, preheader, heading, paragraphs, action? })`, returning `{ text, html }` exactly as C4:
  - a 600 px table with inline styles only;
  - a `#2C6A46` header bar with the logo `img` (48 × 48) and the white word mark "CrowdPoll";
  - the action as a `#2C6A46` button with white text, then "Or copy this link: <url>";
  - the two footer lines;
  - a hidden preheader span;
  - every inserted value passed through `escapeHtml`.
- [X] T017 [US2] In `src/email/templates.ts`, add one function per message, `loginLinkMessage(url)`, `createAccountMessage(url)`, `emailChangeVerificationMessage(url)` and `emailChangeNoticeMessage(origin, newEmail)`. Each returns `{ subject, text, html }`, built with `layout()` from the approved text of `contracts/email-messages.md` (T002). The first three take the origin from `new URL(url).origin`.
- [X] T018 [US2] In `src/email/mailer.ts`, make the four `send…` functions use T017's messages instead of their inline strings. `sendEmailChangeNotice` gains a first parameter, `origin`.
- [X] T019 [US2] In `src/routes/api.ts` (`GET /api/me/email-change/verify`), pass `requestOrigin(req)` as the new first argument to `mailer.sendEmailChangeNotice`.

**Checkpoint**: T013 and T014 pass; the Mailtrap copies look as C4 describes.

---

## Phase 5: User Story 3 - Stop scripted requests from sending email (Priority: P3)

**Goal**: A filled hidden field sends nothing (FR-013–FR-015), and plus-tag or Gmail-dot variants of an existing address create no second account (FR-024–FR-028).

**Independent Test**: Submit each form with and without `homepage` filled; create an account as a variant of an existing Gmail address (quickstart §4.3, §4.6).

### Tests for User Story 3

- [X] T020 [P] [US3] Create `tests/honeypot.test.ts` with failing tests (A1–A3):
  - for `POST /api/auth/request-login-link`, `POST /api/auth/create-account` and a signed-in `POST /api/me/email-change`, a body with `homepage: "x"` gets the success reply (`200 {"message":"Check your inbox"}` or `202`);
  - `ctx.sent` stays empty, no account is created, and the per-client rate limit is not consumed (a following normal request still succeeds under `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW=1`);
  - a body without `homepage` behaves as today.
- [X] T021 [P] [US3] Create `tests/email-key.test.ts` with failing tests (A2, A3, data-model.md):
  - with an account `jsmith@gmail.com`, `POST /api/auth/create-account` for `j.smith+polls@googlemail.com` creates no account and sends the sign-in link to `jsmith@gmail.com`;
  - `ann+x@example.org` matches `ann@example.org`, but `a.nn@example.org` does not;
  - a signed-in user changing to a variant of another account's address gets `409`, and the verify step refuses too;
  - changing to a `+tag` variant of their own address is allowed;
  - two existing accounts inserted directly with the same key both still sign in.
- [X] T022 [P] [US3] (Done as `tests/client-honeypot.test.ts`, a jsdom test, since all three forms are built by their card scripts.) Add a failing test that `login.html`, `create-account.html` and `profile.html` contain an `input[name="homepage"]` with `tabindex="-1"` and `autocomplete="off"` inside an `aria-hidden="true"` wrapper (C1).

### Implementation for User Story 3

- [X] T023 [US3] In `src/routes/api.ts`, at the start of `POST /api/auth/create-account` and `POST /api/auth/request-login-link` (before email validation and rate limiting), and in `POST /api/me/email-change` right after the signed-in check, return the route's success reply when `typeof req.body?.homepage === "string" && req.body.homepage !== ""`, logging `[auth] Honeypot filled on <path>; nothing sent` (R8).
- [X] T024 [P] [US3] Add the C1 hidden field through one helper, `CardShell.hiddenField(parent)` in `src/public/cardShell.js`, called by the three card scripts (the forms are built in JavaScript, not in the HTML pages), and add the `.hp-field` rule to `src/public/site.css`.
- [X] T025 [US3] In `src/public/loginCard.js` (the `request-login-link` fetch), `src/public/createAccountCard.js` (the `create-account` fetch) and `src/public/profileCard.js` (the `email-change` fetch), add `homepage` with the hidden input's value to the JSON body.
- [X] T026 [P] [US3] Create `src/auth/emailKey.ts` exporting `emailKey(expression)`, which returns a Kysely `sql` fragment computing the key of a lower-case address expression (data-model.md):
  - the local part before the first `+`;
  - every `.` removed when the domain is `gmail.com` or `googlemail.com`, with the domain written as `gmail.com`;
  - joined with `@domain`.
- [X] T027 [US3] Create `src/db/migrations/008-email-key.ts`, whose `up` creates `user_email_key_idx` on `"user"` (`emailKey(sql.ref("email"))`) and whose `down` drops it, and register it as `"008-email-key"` in `src/db/migrations/index.ts`.
- [X] T028 [US3] In `src/routes/api.ts`, add `userByKey(email, excludeUserId?)`, which selects `id` and `email` from `"user"` where `emailKey("email") = emailKey(<email>)`, and use it:
  - in `create-account` instead of `userIdByEmail`, issuing the link for the found row's stored `email`;
  - in `POST /api/me/email-change` and `GET /api/me/email-change/verify` instead of `userIdByEmail(newEmail)`, excluding the caller's own id.

  `request-login-link` keeps exact matching (R10).

**Checkpoint**: T020–T022 pass.

---

## Phase 6: User Story 4 - Sign-in links work only in the browser that asked for them (Priority: P4)

**Goal**: The same browser signs in at once; another browser confirms with one click on `/confirm-signin` (FR-016–FR-020).

**Independent Test**: Open a link in the requesting browser, then in a private window (quickstart §4.4, §4.5).

### Tests for User Story 4

- [X] T029 [US4] In `tests/helpers/setup.ts`, record every `signin_binding` cookie the app sets (keyed by the hash its link carries, in `ctx.bindings`) and add `followSignInLink(ctx, link, cookie?)`, which sends the matching cookie with `GET link`, so the fast path is used.
- [X] T030 [US4] Update the tests that follow emailed sign-in links (`tests/auth.test.ts`, `tests/session.test.ts`, `tests/signin-pid.test.ts`, `tests/signin-mode.test.ts`, `tests/rate-limit.test.ts`, `tests/profile.test.ts` where it signs in) to use `followSignInLink`. Their expectations stay the same.
- [X] T031 [P] [US4] Create `tests/signin-binding.test.ts` with failing tests (A4–A6, R9):
  - the request response sets `signin_binding` with `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/api/auth`, `Max-Age=900`, and the link has `&bind=` equal to `hashToken(cookie)`;
  - the fast path signs in and clears the cookie;
  - without the cookie, verify redirects to `/confirm-signin?token=…` and the token still works afterwards;
  - without the cookie, an expired or unknown token redirects to `/login?error=invalid-link` (never to `/confirm-signin`);
  - `GET /api/auth/link-info` returns `email` and `requestedAt`, and `404` for an unknown or expired token;
  - `POST /api/auth/confirm-signin` with the site's `Origin` signs in and honours `stay` (persistent cookie) and `pid` (redirect `/?PID=…`);
  - `POST /api/auth/confirm-signin` with a foreign or missing `Origin` returns `403` and the token survives;
  - a used or expired token returns `400` with the invalid-link redirect;
  - no `signin_binding` is set for the create-account invitation or a honeypot hit.
- [X] T032 [P] [US4] In `tests/pages.test.ts`, add failing tests that `GET /confirm-signin` serves `confirm-signin.html`, and that the cookie banner text in `src/public/app.js` names the session cookie and the sign-in security cookie (C2, C3).

### Implementation for User Story 4

- [X] T033 [US4] In `src/auth/auth.ts` `sendMagicLink`, append `&bind=${encodeURIComponent(metadata.bind)}` to the URL when `metadata?.bind` is a string (R9).
- [X] T034 [US4] In `src/routes/api.ts` `issueLoginLink`, generate `randomBytes(24).toString("base64url")`, pass `bind: hashToken(value)` in `metadata`, and return the value. In `create-account` and `request-login-link` (the registered-address branch), append `signin_binding=<value>; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=900` to the response's `Set-Cookie`.
- [X] T035 [US4] In `src/routes/api.ts`, move the part of `GET /api/auth/verify` after the token check into `completeSignIn(req, res, token, stay, pid)`: `magicLinkVerify`, the session-cookie shaping, the stay-signed-in expiry update and the redirect target. It returns `{ ok: false }` or `{ ok: true, setCookies, redirect }`, and also clears `signin_binding` (`Max-Age=0`).

  In verify:
  - when `bind` equals `hashToken(cookie)`, call `completeSignIn` and redirect as today;
  - otherwise look the token up as T036 does, without consuming it: an unknown, expired or used token gets today's `/login?error=invalid-link[&PID=…]` redirect, and a valid one is redirected to `/confirm-signin?token=…&stay=…[&PID=…]` (A4).
- [X] T036 [US4] In `src/routes/api.ts`, add `GET /api/auth/link-info` (A5). It reads `verification` by `identifier = hashToken(token)`, checks `expiresAt`, parses `value.email`, and replies `200 { email, requestedAt: createdAt }` with `Cache-Control: no-store`, or `404`.
- [X] T037 [US4] In `src/routes/api.ts`, add `POST /api/auth/confirm-signin` (A6):
  - `403` unless `req.get("origin") === requestOrigin(req)`;
  - otherwise `completeSignIn` with the body's `token`, `stay === true` and `parsePid(pid)`, replying `200 { redirect }` with its cookies, or `400` with the invalid-link message and redirect.
- [X] T038 [P] [US4] Create `src/public/confirm-signin.html`, modelled on `src/public/login.html`: the same head (stylesheets, favicon links), the site header and one card container. Create `src/public/confirmSigninCard.js` implementing C2's states:
  - fetch `link-info`;
  - show the email with `textContent` and the request time with `toLocaleString()`;
  - **Sign in** posts `confirm-signin` (button disabled while pending) and follows `redirect`;
  - **Not now** goes to `/login`, keeping `PID`;
  - the invalid-link state links to `/login`.
- [X] T039 [US4] In `src/routes/pages.ts`, serve `GET /confirm-signin` with `page("confirm-signin.html")`, as `/login` is served.
- [X] T040 [P] [US4] In `src/public/app.js`, change the cookie banner text to C3's.
- [X] T041 [P] [US4] In `CLAUDE.md`, change the cookie policy in Project Overview ("the only cookie the system sets") and Architecture Notes ("Cookie banner") to "`session_token` plus strictly necessary security cookies (`signin_binding`)" (R11). In `src/auth/auth.ts`, correct the header comment's "the session cookie remains the only cookie".

**Checkpoint**: T029–T032 pass, with every earlier suite still green.

---

## Phase 7: User Story 5 - The operator can run and trace production email (Priority: P5)

**Goal**: A misconfigured production refuses to start, every send is traceable, and nothing sensitive is logged (FR-005, FR-007).

**Independent Test**: Start with `ENV_EMAIL_TRANSPORT=ses` and no SES variables; read the log of a send (quickstart §4.1, §4.7).

### Tests for User Story 5

- [X] T042 [P] [US5] Run the T051 tests in `tests/mailer.test.ts` again with the full stack (masked log line, message id, timeout); they moved to Phase 2 (analyze finding C1), so nothing new is written here.
- [X] T043 [P] [US5] In `tests/auth.test.ts`, add a test that the `[auth]` log lines for create-account and request-login-link print the masked address, not the full one (R5).

### Implementation for User Story 5

- [X] T044 [US5] In `src/routes/api.ts`, change the `[auth]` log lines that print `${email}` (create-account: existing address and created account; request-login-link: link sent and invitation sent) to print `mailer.maskAddress(email)` (R5).
- [X] T045 [US5] Check that `src/server.ts` lets a `ConfigError` from `loadConfig` stop the process with its message, as it already does for `ENV_BETTER_AUTH_SECRET`. Run `$env:ENV_EMAIL_TRANSPORT="ses"; npm run dev` in PowerShell without SES variables and confirm the app exits naming `ENV_SES_REGION` (quickstart §4.1).

**Checkpoint**: T042 and T043 pass.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T046 [P] In `postman/openapi.json`, document A1–A6:
  - the `homepage` field on the three request bodies;
  - the `signin_binding` `Set-Cookie`;
  - the verify redirect to `/confirm-signin`;
  - `GET /api/auth/link-info` and `POST /api/auth/confirm-signin` with their replies.

  Extend `tests/openapi-contract.test.ts` so the two new routes are checked.
- [X] T047 [P] In `CLAUDE.md`'s environment table, add `ENV_EMAIL_TRANSPORT`, `ENV_SES_REGION`, `ENV_SES_ACCESS_KEY_ID`, `ENV_SES_SECRET_ACCESS_KEY`, `ENV_EMAIL_FROM`, `ENV_EMAIL_SEND_TIMEOUT` and the four `ENV_SMTP_*` rows, with their defaults and meanings from `data-model.md`.
- [X] T048 Run `npm test` and `npm run build` (scripts in `package.json`); all suites pass (SC-007).
- [ ] T049 Walk `specs/20261019-153514-PRODUCTION-EMAIL/quickstart.md`, which carries the setup procedures of FR-023, §4 locally (Mailtrap), then, after deploying with the T012 secrets, quickstart §5 in production: inbox placement for Gmail, Outlook and Yahoo (SC-001) and the header check (SC-002).
- [X] T050 Regenerate `README.md` and `ARCHITECTURE.md` at the repository root for this feature (Constitution, Documentation Deliverables):
  - the SES transport and settings;
  - the email layout;
  - the honeypot;
  - the sign-in binding and confirmation page;
  - `emailKey`;
  - the cookie policy.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none. T002, the wording approval, blocks only T017.
- **Foundational (Phase 2)**: after T001; blocks every story.
- **US1 (Phase 3)**: after Phase 2.
- **US2 (Phase 4)**: after Phase 2 and T002. Independent of US1, but both edit `mailer.ts`, so they run one after the other.
- **US3 (Phase 5)**: after Phase 2. Independent of US1 and US2.
- **US4 (Phase 6)**: after Phase 2. T034 builds on `issueLoginLink`, which US3's T028 also touches; do US3 first, or merge carefully.
- **US5 (Phase 7)**: after Phase 2. T044 edits the same `api.ts` lines US3 touches.
- **Polish (Phase 8)**: after the stories it documents.

### Within Each User Story

Tests first (failing), then implementation. Several tasks edit `src/routes/api.ts`, so they run in order.

### Parallel Opportunities

- T007 and T008; T013 and T014; T020, T021 and T022; T031 and T032; T042 and T043 (different test files).
- T011 beside T009 and T010; T024 beside T023; T026 beside T023–T025; T038, T040 and T041 beside T033–T037.
- T046 and T047.

---

## Parallel Example: User Story 3

```text
Task: "T020 tests/honeypot.test.ts"
Task: "T021 tests/email-key.test.ts"
Task: "T022 hidden-field checks in tests/pages.test.ts"
then
Task: "T024 hidden field markup and .hp-field in site.css"   (parallel with T023)
Task: "T026 src/auth/emailKey.ts"                            (parallel with T023–T025)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phases 1 and 2, then Phase 3.
2. Set the SES secrets in App Platform and deploy.
3. Check a real sign-in link reaches Gmail, Outlook and Yahoo (quickstart §5.1).

The messages still use today's wording at this point, but they are delivered.

### Incremental Delivery

US1 (delivery) → US2 (branding) → US3 (honeypot, one account per mailbox) → US4 (sign-in binding) → US5 (operator checks) → Polish.
Each story ends at a green `npm test` and can ship on its own.

---

## Notes

- `[P]` tasks touch different files and depend on nothing unfinished.
- Never put a full address, link or token in a log line (FR-005).
- Commit after each phase; the push to `dev` deploys.
- FR-006 (bounces and complaints) needs no code: SES's account-level suppression list handles them, confirmed on 2026-10-20 (RS16).
