# Implementation Plan: Production Email

**Branch**: `dev` (no dedicated branch) | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/20261019-153514-PRODUCTION-EMAIL/spec.md`

## Summary

Move CrowdPoll's four emails from the Mailtrap sandbox to Amazon SES in production, and harden the sign-in flow around them.

- **Delivery** (US1, US5): `src/email/mailer.ts` gains an SES transport, nodemailer's own over `@aws-sdk/client-sesv2` (HTTPS,
  R1). The new `ENV_EMAIL_TRANSPORT=ses` setting is the production signal: with it, the app refuses to start unless all three
  `ENV_SES_*` values are set (R2). Each send is bounded by `ENV_EMAIL_SEND_TIMEOUT` (10 s, R4) and logs its message id with a
  masked recipient (R5).
- **Trust** (US2): every message comes from `ENV_EMAIL_FROM`, `CrowdPoll <no-reply@mail.crowdpoll.vote>` (R3), in one branded,
  escaped layout from a new `src/email/templates.ts`, with a hosted `email-logo.png` (R6, R7). The wording is drafted in
  `contracts/email-messages.md` for approval.
- **Abuse** (US3): the spec's hidden field (FR-013) is a `homepage` honeypot field on the three emailing forms; when it is filled, the server replies as on success and
  sends nothing (R8).
- **Sign-in binding** (US4): a `signin_binding` cookie and a `bind` hash on the link. The same browser signs in at once; any other
  browser gets a one-click `/confirm-signin` page, backed by `GET /api/auth/link-info` and an origin-checked
  `POST /api/auth/confirm-signin` (R9).
- **One mailbox, one account** (FR-024–FR-028): a SQL `emailKey` (plus-tags dropped, Gmail dots removed) with an expression index
  (migration `008-email-key`), used by create-account and email change (R10).
- **Cookie policy**: the session cookie plus strictly necessary security cookies; the banner text names both (R11).

The hand-done AWS, DNS, forwarding and alarm setup is already recorded in the requirements (RS8, RS10, RS17); `quickstart.md`
links to it.

## Technical Context

**Language/Version**: TypeScript on Node ≥ 22 (server, ESM); plain browser JavaScript and HTML for the pages, as today.

**Primary Dependencies**:
- **New:** `@aws-sdk/client-sesv2` `3.1135.0`, pinned to the version of the existing `@aws-sdk/client-s3`.
- **Existing:** nodemailer 7 (its built-in SES transport), BetterAuth's magic-link plugin, Express 5 and Kysely.

**Storage**: PostgreSQL. One additive migration, `008-email-key`: an expression index on `"user"`, with no column and no backfill
(`data-model.md`).

**Testing**: Vitest + supertest + jsdom on the embedded-PostgreSQL context, with the captured mail transport (R12). Real inbox
placement and header checks are quickstart steps.

**Target Platform**: DigitalOcean App Platform (production, SES `ca-central-1`); local development also through SES, with a development key, in `us-east-1` from `dev.mail.crowdpoll.vote` (TWEAKS01, TWEAKS03).

**Project Type**: Web application. One Express service with static pages.

**Performance Goals**:
- A send completes, or fails, within 10 s; a healthy SES call takes well under 1 s.
- The `emailKey` lookup is an index scan.

**Constraints**:
- No SMTP on ports 25, 465 or 587 in production (AM1).
- No delivery webhook or configuration set (UA3, RS17).
- No `Reply-To` and no tracking (UA6, FR-012).
- The cookie banner stays informational (RS6).
- No explanatory comments in new code (Constitution VI).

**Scale/Scope**:
- 3 new server modules: `src/email/templates.ts`, `src/auth/emailKey.ts` and the migration.
- 4 edited server files: `mailer.ts`, `config.ts`, `src/routes/api.ts`, `src/routes/pages.ts`.
- 1 new page with its script: `confirm-signin.html`, `confirmSigninCard.js`.
- 3 form scripts and 3 pages, each gaining the hidden field; `app.js` (banner text); `site.css` (`.hp-field`).
- 1 dev script extended: `favicon-ico.ts`, writing `email-logo.png`.
- `.do/app.yaml`, the two dev templates, `postman/openapi.json` and `CLAUDE.md` updated.
- 5 new test files, and the edited tests and test helper.

## Constitution Check

*GATE: passed before Phase 0; re-checked after Phase 1.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | The requirements review resolved 29 findings and `/speckit-clarify` four questions. The two remaining items (D1: production signal, O1: wording ownership) are settled here (R2) and in `contracts/email-messages.md`. Risky assumptions were checked in the code: nodemailer's SES transport and its returned id (R1), and BetterAuth's token hashing, which lets a link be read without being used (R9). | Pass |
| II. Simplicity First | One new dependency, sharing the AWS SDK core already installed. No template engine, no webhook, no stored binding, no new column. The `emailKey` is one SQL definition used for both sides of every comparison. | Pass |
| III. Surgical Changes | `send()` keeps its shape and callers. The verify route's sign-in steps move into one function shared with the confirm route, with no other refactor. Existing comments are corrected only where their code changes. | Pass |
| IV. Goal-Driven Execution | Every FR maps to a test in R12 or a quickstart step. SC-001 and SC-002 are production quickstart checks. | Pass |
| V. Code Quality | Server logs stay informative but hold masked addresses only, never links or tokens. Client scripts log nothing sensitive. Config errors name the missing variable. | Pass |
| VI. Self-Documenting Code | No explanatory comments in new files. The email wording is data in `templates.ts`. | Pass |
| Documentation Deliverables | `README.md` and `ARCHITECTURE.md` are regenerated after implementation, in tasks.md's documentation phase. | Pass (post-implementation) |

Re-check after Phase 1: unchanged, Pass.

## Project Structure

### Documentation (this feature)

```text
specs/20261019-153514-PRODUCTION-EMAIL/
├── plan.md                  # This file
├── research.md              # Phase 0: R1–R12
├── data-model.md            # Phase 1: the expression index, the cookie, the settings
├── quickstart.md            # Phase 1: setup links and validation
├── contracts/
│   ├── api.md               # Phase 1: A1–A6
│   ├── ui-contracts.md      # Phase 1: C1–C4
│   └── email-messages.md    # Phase 1: M1–M4 draft wording, for approval
├── clarify-findings.md      # /speckit-clarify-findings record
├── checklists/
│   └── requirements.md
└── tasks.md                 # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── config.ts                       # ENV_EMAIL_TRANSPORT, ENV_SES_*, ENV_EMAIL_FROM, ENV_EMAIL_SEND_TIMEOUT (R2–R4)
├── email/
│   ├── mailer.ts                   # SES transport, timeout race, masked log with message id, typed sends (R1, R4, R5)
│   └── templates.ts                # NEW: escapeHtml, layout, the four messages (R6, M1–M4)
├── auth/
│   ├── auth.ts                     # sendMagicLink appends &bind=… (R9)
│   └── emailKey.ts                 # NEW: emailKey SQL expression (R10)
├── db/migrations/
│   ├── 008-email-key.ts            # NEW: expression index (R10)
│   └── index.ts                    # + 008
├── routes/
│   ├── api.ts                      # honeypot, binding cookie, verify split, link-info, confirm-signin, emailKey checks, masked logs (A1–A6)
│   └── pages.ts                    # + /confirm-signin (C2)
└── public/
    ├── confirm-signin.html         # NEW (C2)
    ├── confirmSigninCard.js        # NEW (C2)
    ├── email-logo.png              # NEW, generated (R7)
    ├── login.html, create-account.html, profile.html   # + hidden field (C1)
    ├── loginCard.js, createAccountCard.js, profileCard.js  # send homepage (C1)
    ├── app.js                      # banner text (C3)
    └── site.css                    # .hp-field (C1)

devScripts/favicon-ico.ts           # also writes email-logo.png (R7)
.do/app.yaml                        # ENV_EMAIL_TRANSPORT=ses, ENV_SES_*, ENV_EMAIL_FROM (quickstart §2)
launch.json.example, devScripts.example/launch-dev.ps1  # ENV_EMAIL_FROM, ENV_EMAIL_TRANSPORT
postman/openapi.json                # A1–A6
package.json                        # + @aws-sdk/client-sesv2 3.1135.0
CLAUDE.md                           # environment table, cookie policy

tests/
├── config.test.ts                  # + transport, SES vars, app.yaml, defaults
├── mailer.test.ts                  # NEW
├── honeypot.test.ts                # NEW
├── signin-binding.test.ts          # NEW
├── email-key.test.ts               # NEW (with the migration)
├── openapi-contract.test.ts, pages.test.ts  # + new routes and page
├── helpers/setup.ts                # + follow a link with its binding cookie
└── auth.test.ts, session.test.ts, signin-pid.test.ts, signin-mode.test.ts, profile.test.ts, rate-limit.test.ts  # use the helper where they follow links
```

**Structure Decision**: The existing single-project layout. Email stays in `src/email/` and auth helpers in `src/auth/`. The new
page follows the login page's pattern (static HTML plus a card script, served by `pages.ts`).

## Breaking Changes

- `ENV_SMTP_FROM` → `ENV_EMAIL_FROM` (R3): developers update their git-ignored `launch.json` and `launch-dev.ps1`.
- Production must set `ENV_EMAIL_TRANSPORT=ses` and the three `ENV_SES_*` values, or it will not start (R2).
- A sign-in link opened without its binding cookie shows the confirmation page instead of signing in at once (R9). Scripted
  clients and tests that follow links must carry the cookie or confirm.
- A second cookie, `signin_binding`, joins `session_token`; the cookie policy and banner text change (R11).
- New-account requests and email changes are refused or redirected for plus-tag and Gmail-dot variants of existing addresses (R10).
- The request bodies of the three emailing endpoints and two new routes change `postman/openapi.json`.

## Complexity Tracking

No violations.
