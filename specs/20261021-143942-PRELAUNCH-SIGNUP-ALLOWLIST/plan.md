# Implementation Plan: Pre-Launch Sign-Up Allowlist

**Branch**: `dev` (no dedicated branch) | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/20261021-143942-PRELAUNCH-SIGNUP-ALLOWLIST/spec.md`

## Summary

While `ENV_ALLOWED_EMAILS` is set, only the listed addresses (and the administrators) may create an account, sign in or move an
account to a new address; everyone else gets a `403` "CrowdPoll hasn't launched yet" refusal, and nothing is created or sent.
Unset or empty, nothing changes.

- **The setting** (US3): read once by `loadConfig` into a set of email keys; an invalid entry stops the app; startup logs the
  count only (R1).
- **The rule** (FR-005, FR-006): `isAllowed(email, config)` in a new `src/auth/allowlist.ts`, comparing by email key through a
  TypeScript twin of the SQL `emailKey` (R2).
- **The checks** (US1, US2, US4): create-account, request-login-link and email-change refuse before sending; the sign-in link,
  the confirmation page and the email-change link refuse before consuming or applying; BetterAuth's `session.create.before`
  hook is the backstop for every new session, OAuth included (R3).
- **The refusal** (FR-011): `403 { error: <message>, code: "not-launched" }`, which the cards already display; two redirect
  paths carry `?error=not-launched` (R4). Each refusal logs a masked address (R5).
- **Production**: the list is an encrypted App Platform variable set in the console, never in the repository (R7).

## Technical Context

**Language/Version**: TypeScript on Node ≥ 22 (server, ESM); plain browser JavaScript for the cards, as today.

**Primary Dependencies**: existing only: Express 5, BetterAuth (magic-link plugin, database hooks), Kysely. No new dependency.

**Storage**: PostgreSQL, unchanged. No migration: the list lives in configuration, and the session hook reads `"user".email`
by id.

**Testing**: Vitest + supertest + jsdom on the embedded-PostgreSQL context with the captured mail transport (R8).

**Target Platform**: DigitalOcean App Platform (production); local development as today.

**Project Type**: Web application. One Express service with static pages.

**Performance Goals**: a refusal answers no slower than today's success path: an in-memory set lookup; the session hook adds
one indexed query per new session, and only while the list is on.

**Constraints**:
- The existing honeypot, validation and rate-limit order is unchanged; the check follows them (FR-012).
- No address in the repository or the log (FR-016, SC-005).
- Existing sessions and accounts are untouched (FR-013).
- No explanatory comments in new code (Constitution VI).

**Scale/Scope**:
- 1 new server module (`src/auth/allowlist.ts`), 1 helper added to `src/auth/emailKey.ts`.
- Edits to `src/config.ts`, `src/routes/api.ts` (six handlers), `src/auth/auth.ts` (the `session.create.before` and `user.create.before` hooks, and the social sign-in's error callback, T033), `src/server.ts` (one log
  line), `src/public/loginCard.js` and `src/public/profileCard.js` (the `?error=not-launched` mapping; the login card also maps the OAuth error value, T033).
- Documentation: `postman/openapi.json`, `CLAUDE.md`, `README.md`, `ARCHITECTURE.md`, the two launch templates.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Think Before Coding | ✅ | 13 requirements findings and 2 clarifications resolved; the one change to the requirements' draft (the response shape) is stated in R4 with its reason. |
| II. Simplicity First | ✅ | One function, one setting, no table, no admin UI, no reload mechanism; the cards reuse their `body.error` display. |
| III. Surgical Changes | ✅ | Each edit is a guard at the top of an existing handler or hook; `launch.json.example`'s broken line is fixed only because the new entry goes beside it (R7). |
| IV. Goal-Driven Execution | ✅ | Every FR maps to a test in R8; SC-003 is the unchanged suite with the setting unset. |
| V. Code Quality & Maintainability | ✅ | Server logs are informative and masked (R5); the browser logs nothing. |
| VI. Self-Documenting Code | ✅ | No explanatory comments; names (`isAllowed`, `emailKeyOf`, `NOT_LAUNCHED`) carry the meaning. |
| Documentation Deliverables | ✅ | `README.md` and `ARCHITECTURE.md` are updated in the final phase. |

Post-design re-check: unchanged, all ✅. No Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/20261021-143942-PRELAUNCH-SIGNUP-ALLOWLIST/
├── spec.md
├── plan.md              # This file
├── research.md          # R1–R8
├── data-model.md        # The setting and the refusal; no stored data
├── quickstart.md        # Local and production validation
├── contracts/
│   ├── api.md           # A1–A6: the refusal on each endpoint
│   └── ui-contracts.md  # C1–C3: what each card shows
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── config.ts                 # allowedEmailKeys (R1)
├── server.ts                 # startup log line (R1)
├── auth/
│   ├── allowlist.ts          # NEW: isAllowed, NOT_LAUNCHED (R2, R4)
│   ├── emailKey.ts           # + emailKeyOf, EMAIL_PATTERN (R2)
│   └── auth.ts               # session/user.create.before guards, social error callback (R3, T033)
├── routes/
│   └── api.ts                # create-account, request-login-link, verify, confirm-signin,
│                             # email-change, email-change/verify (R3)
└── public/
    ├── loginCard.js          # ?error=not-launched and the OAuth error value (C2)
    └── profileCard.js        # ?error=not-launched (C3)

tests/
├── allowlist.test.ts         # NEW (R8)
├── client-not-launched.test.ts  # NEW (R8)
└── openapi-contract.test.ts  # + the 403 responses

postman/openapi.json          # 403 not-launched on A1–A3, A5
launch.json.example, devScripts.example/launch-dev.ps1   # ENV_ALLOWED_EMAILS empty (R7)
```

**Structure Decision**: the existing single-service layout; the rule sits in `src/auth/` beside `emailKey.ts`, the module it
depends on.

## Complexity Tracking

None.
