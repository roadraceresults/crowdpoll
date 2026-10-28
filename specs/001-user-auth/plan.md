# Implementation Plan: User Authentication System

**Branch**: `dev` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-user-auth/spec.md`

## Summary

A reusable, passwordless user-authentication system with a minimal demo web client.
Native sign-in emails a one-time login link (no passwords); a configuration switch later
moves the deployment to OAuth social providers exclusively. Technical approach: a single
TypeScript Node.js service using Express, the BetterAuth library (magic-link plugin +
MongoDB adapter) for all credential/session mechanics, nodemailer + Mailtrap for email
delivery, and server-served static HTML/vanilla-JS pages for the demo client. Custom logic
is limited to what BetterAuth does not provide out of the box: single-active-session
enforcement, unique-userName defaulting, and the email-change verification flow with
old-address notification. Rate limiting uses BetterAuth's built-in limiter (per-client,
per-endpoint rules).

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS

**Primary Dependencies**: Express 5 (HTTP + static pages), better-auth (auth core,
magic-link plugin, MongoDB adapter), mongodb driver, nodemailer with Mailtrap (SMTP/SDK)
for email delivery

**Storage**: MongoDB — database name from `APP_MONGODB_NAME` (default `app01`), connection
string from `APP_MONGODB_URI`; deployed as DigitalOcean Managed Database (SSL)

**Testing**: Vitest + supertest for API-level integration tests, mongodb-memory-server for
an isolated test database; test files under `./tests` (debuggable via `launch.json` per
FR-024)

**Target Platform**: Linux server (DigitalOcean App Platform Web Service, HTTPS terminated
by platform); local development on Windows 11

**Project Type**: Web service with embedded minimal web client (single project)

**Performance Goals**: Demo-scale. Non-email endpoints respond in <200ms p95 at light
load; email-sending endpoints respond immediately (send is awaited but the flows are
inbox-bound, governed by SC-001's 3-minute end-to-end target)

**Constraints**: Exactly one cookie (`session_token`: httpOnly, secure, sameSite=lax,
maxAge from `APP_SIGNIN_COOKIE_DURATION_MAX`); all configuration via `APP_*` environment
variables; single active session per account; per-client rate limits (2/15 min,
BetterAuth built-in); no
passwords stored, ever; lightweight per constitution (no background workers, no queues)

**Scale/Scope**: Small (≤ ~1k accounts, single region, single instance). 4 pages, ~9 API
endpoints, ~6 collections

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Think Before Coding | All spec ambiguities resolved (9 clarifications recorded); remaining assumptions documented in spec | ✅ PASS |
| II. Simplicity First | Single project; no frontend framework (static HTML + vanilla JS); BetterAuth built-ins over custom auth code; no speculative abstractions (no queues, no workers, no multi-tenant hooks) | ✅ PASS |
| III. Surgical Changes | Greenfield feature; each task will trace to a numbered FR; no scope beyond spec | ✅ PASS |
| IV. Goal-Driven Execution | Every user story has acceptance scenarios; quickstart.md defines runnable validation per story; tests-first for token/rate-limit/uniqueness logic | ✅ PASS |
| V. Code Quality & Maintainability | Modular layout (config/auth/email/routes separated); console logging of actions and errors; graceful failure paths specified in spec (FR-022) | ✅ PASS |
| Security & Privacy standards | Cookie flags per spec; single-use expiring tokens; account-existence privacy; rate limits; no secrets in repo (env vars; launch.json git-ignored) | ✅ PASS |
| Performance & Efficiency | No background processes; TTL indexes instead of cleanup jobs; static client assets | ✅ PASS |

**Post-Phase-1 re-check**: Design artifacts introduce no new projects, frameworks, or
patterns beyond the above. ✅ PASS — Complexity Tracking left empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-user-auth/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── api-endpoints.md
├── tlsNotes.md          # user-kept notes: DigitalOcean TLS/HTTPS handling (informational;
│                        #   actionable items folded into tasks T005/T007/T039)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── config.ts            # APP_* env parsing + validation (fail fast, friendly errors)
├── server.ts            # Express bootstrap, static hosting, route mounting
├── auth/
│   ├── auth.ts          # BetterAuth instance: magic-link plugin, MongoDB adapter,
│   │                    #   cookie settings, single-session hook, built-in rate-limit
│   │                    #   rules (2 per 15 min per client on email-sending endpoints)
│   └── username.ts      # local-part default + numeric-suffix uniqueness
├── email/
│   └── mailer.ts        # nodemailer/Mailtrap transport + message templates
│                        #   (login link, email-change verify, old-address notice)
├── routes/
│   ├── api.ts           # /api/* endpoints (see contracts/api-endpoints.md)
│   └── pages.ts         # /, /login, /create-account, /profile
└── public/
    ├── index.html       # header, member/guest content, cookie banner
    ├── login.html       # email field, stay-signed-in checkbox, submit
    ├── create-account.html
    ├── profile.html     # Display/Edit Profile page
    ├── app.js           # header state, avatar menu, banner acknowledgement (localStorage)
    └── styles.css

tests/
├── auth.test.ts         # signup, login-link issue/verify/expiry/supersede/reuse
├── rate-limit.test.ts   # 2-per-15-min windows, next-allowed-time messages
├── profile.test.ts      # userName edit + uniqueness, email-change flow
└── session.test.ts      # cookie flags, single-session replacement, logout

postman/
└── openapi.json         # FR-026 deliverable (kept in sync with routes/api.ts)

devScripts/              # git-ignored; launch-dev.ps1 (FR-025)
devScripts.example/      # checked in; launch-dev.ps1 template copied on first-time setup
.vscode/launch.json      # git-ignored; FR-024 debug entries (server + each test file)
launch.json.example      # checked in; template for the git-ignored launch.json
```

**Structure Decision**: Single project. The "web app client" is four static pages served
by the same Express process — a separate frontend project would violate Simplicity First
for what the spec calls a "minimum web app client". Auth mechanics live behind
BetterAuth's abstractions so the native→OAuth switch (FR-018) is configuration plus one
plugin swap, not a rewrite.

## Complexity Tracking

No constitution violations — table intentionally empty.
