# Phase 0 Research: User Authentication System

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-10

All Technical Context unknowns are resolved below. Format per plan workflow:
Decision / Rationale / Alternatives considered.

## R1. HTTP framework

- **Decision**: Express 5 on Node.js 22 LTS.
- **Rationale**: The source requirements illustrate cookie handling with the Express
  `res.cookie(...)` API, BetterAuth ships first-class Express integration, and Express is
  the lowest-surprise choice for a small service with static pages.
- **Alternatives considered**: Fastify (faster, but no requirement needs it and the
  requirements' own code sample is Express-idiomatic); Hono (nice TS ergonomics, smaller
  ecosystem familiarity); bare `node:http` (too much hand-rolling for cookies/routing).

## R2. Authentication library usage

- **Decision**: `better-auth` with the **magic-link plugin** for native passwordless
  sign-in, its **MongoDB adapter** for persistence, and its **social-providers plugins**
  (enabled but unconfigured until approval) for the OAuth phase. `APP_SIGNIN_METHOD`
  selects which surface the client offers and which server flows are enabled (FR-018/019).
- **Rationale**: Mandated by the source document. The spec's flow ("no password… sends an
  email every time the user needs to login") is exactly BetterAuth's magic-link plugin,
  not its email/password credential flow. (The source document briefly said "native
  email/password authentication"; its 2026-08-10 revision corrected this to "native email
  authentication", confirming the passwordless reading.) Using the
  library's session + verification-token machinery avoids hand-rolling the highest-risk
  code (Security standards; Simplicity First).
- **Alternatives considered**: Hand-rolled tokens + sessions (rejected: reimplements a
  mature library, more attack surface); Auth.js/NextAuth (rejected: source mandates
  BetterAuth); email OTP codes instead of links (rejected: spec requires clickable
  one-time links).
- **Verify at implementation**: exact plugin/config names against the installed
  better-auth version's docs (API surface moves between minor versions).

## R3. Email delivery

- **Decision**: nodemailer with Mailtrap SMTP credentials, one `mailer.ts` module with
  four templates: login link, unknown-address create-account invitation, email-change
  verification, old-address change notification.
- **Rationale**: Mandated by source ("mailtrap.io with nodemailer"; the doc's earlier
  mention of the Mailtrap Node SDK was dropped in its 2026-08-10 revision). Mailtrap's sandbox inbox also gives the quickstart a deterministic way to
  observe emails in tests/dev without delivering real mail.
- **Alternatives considered**: Direct Mailtrap HTTP API without nodemailer (rejected:
  source names both; nodemailer keeps the transport swappable for production later).

## R4. Single-active-session enforcement (FR-007a)

- **Decision**: On every successful sign-in (link verification), revoke all other sessions
  for that user via a BetterAuth database hook / `revokeOtherSessions` semantics before
  issuing the new session.
- **Rationale**: Enforcing at sign-in time is the exact behavior clarified in the spec ("a
  new sign-in invalidates any existing session"); a hook keeps it in one place regardless
  of which flow (native or OAuth) created the session.
- **Alternatives considered**: Unique index on userId in the session collection (rejected:
  fights the library's own session lifecycle); middleware check on every request
  (rejected: races and extra query per request).

## R5. Rate limiting (FR-004a, FR-013c)

- **Decision** *(revised 2026-08-10, superseding the original per-email design)*:
  BetterAuth's **built-in rate limiting**, strict defaults — per-client (IP) per-endpoint
  custom rules of 2 requests per 15-minute window on every email-sending endpoint
  (login-link request, create-account, email-change request), with the limiter's storage
  set to the database so limits survive restarts. Refusal responses surface the limiter's
  retry-after information so the user-visible message states when the next request can be
  made. Correct client identification behind DigitalOcean's proxy relies on `trust proxy`
  (plan T009/R11).
- **Rationale**: Mandated by the source document ("as implemented by BetterAuth's built-in
  rate limiting") and confirmed by the user 2026-08-10 as *strict built-in defaults*,
  explicitly dropping per-email and per-account counting. Removes an entire custom module
  (Simplicity First).
- **Trade-off accepted**: IP-keyed limiting does not stop a distributed attacker from
  spamming one victim inbox from many clients, and NATed users share a window. Accepted
  explicitly by the user in the 2026-08-10 decision.
- **Alternatives considered**: Custom Mongo fixed-window counters keyed per email/account
  (the original design — rejected by user decision); hybrid built-in machinery with custom
  email keys (offered, declined in favor of strict defaults).

## R6. Email address change flow (FR-013a–d)

- **Decision**: Use BetterAuth's change-email support (verification sent to the NEW
  address) configured with our mailer; pre-check new-address uniqueness before issuing;
  on completion, send the informational notice to the old address from the same hook.
  Verification tokens follow login-link semantics (~15 min expiry, single use, newer
  request supersedes) — same token store.
- **Rationale**: Keeps all token issuance/verification inside the library; the spec's
  self-contained-link decision matches the library's token-in-URL model (no session
  required at click time).
- **Alternatives considered**: Fully custom email-change tokens (rejected: duplicates
  library machinery); verifying via the OLD address (rejected: spec says the link goes to
  the new address, old address gets notice-only).

## R7. userName defaulting & uniqueness (FR-011, FR-012, FR-013)

- **Decision**: Unique index on `userName` with case-insensitive collation (strength 2).
  Default = email local-part truncated to 200 chars; on collision append `2`, `3`, …
  (increment until free), truncating the base so base+suffix ≤ 200. Same suffix loop for
  provider-supplied names in the OAuth phase. Profile edits hitting the unique index
  return a clear "name already taken" error.
- **Rationale**: Case-insensitive uniqueness is the least-surprise reading of a "unique
  handle" (prevents `Pat` vs `pat` confusion); the suffix loop is the spec's own rule
  ("append a number… until a unique userName is found").
- **Alternatives considered**: Case-sensitive uniqueness (rejected: two visually identical
  handles differing only in case would confuse the header display); random suffixes
  (rejected: spec says append a number incrementally).

## R8. Demo client implementation

- **Decision**: Four static HTML pages + one vanilla-JS file + one stylesheet served by
  Express; client state fetched from `/api/me`; cookie-banner acknowledgement in
  `localStorage` (per spec, not a cookie).
- **Rationale**: The spec calls it a "minimum web app client"; a framework build step
  would violate Simplicity First and complicate the DigitalOcean deploy for zero
  functional gain.
- **Alternatives considered**: React/Vite SPA (rejected: build tooling + framework for 4
  pages); server-side templating (EJS etc.) (rejected: static + one fetch is simpler and
  keeps API/client separation that the OpenAPI contract documents anyway).

## R9. Testing approach

- **Decision**: Vitest + supertest against the Express app with mongodb-memory-server;
  fake timers for link-expiry and rate-limit-window tests; a mock mail transport
  (nodemailer JSON transport) capturing sent messages for link-extraction in tests.
  Test files live under `./tests` so the FR-024 launch.json debug entries apply.
- **Rationale**: Integration-level tests exercise the same surface the OpenAPI contract
  documents (Goal-Driven Execution); memory server keeps tests Windows-friendly with no
  local MongoDB dependency.
- **Alternatives considered**: Jest (rejected: Vitest has faster TS setup, same API);
  testing against real local MongoDB (rejected: couples tests to dev-machine state).

## R10. OpenAPI deliverable (FR-026)

- **Decision**: Hand-maintained `postman/openapi.json` (OpenAPI 3.1) written alongside the
  routes; `contracts/api-endpoints.md` in this feature is its human-readable source; a CI
  task later can diff routes vs. spec but is out of scope now.
- **Rationale**: With ~9 endpoints, generation tooling (tsoa, zod-openapi) costs more than
  it saves (Simplicity First); hand-maintenance is acceptable at this scale and the spec
  only requires the artifact stay in sync.
- **Alternatives considered**: zod-openapi generation (attractive later if the API grows;
  rejected now as extra machinery).

## R11. Deployment & dev-environment fit

- **Decision**: App listens on `APP_PORT`, trusts the platform proxy (`trust proxy`) so
  `secure` cookies work behind DigitalOcean's TLS termination. Dev database = MongoDB
  Community Server as a Windows service (quickstart documents install + the
  `launch-dev.ps1` script starts the service if stopped, FR-025). `launch.json` and
  `devScripts/` stay git-ignored (FR-024/025); `.gitignore` gains both entries.
- **Rationale**: Matches the source document's deployment assumptions and Windows 11 dev
  mandate exactly.
- **Alternatives considered**: Docker-based dev MongoDB (rejected as primary path: source
  explicitly asks for Windows service instructions; noted as an aside in quickstart).

## R12. Performance / scale targets (deferred item from clarify sessions)

- **Decision**: Adopt demo-scale targets: ≤1k accounts, single instance; <200ms p95 for
  non-email endpoints; email-bound flows governed by spec SC-001/SC-007 (≤3 min
  end-to-end). No load testing in scope.
- **Rationale**: Constitution requires "lightweight", spec sets user-facing timing; no
  stakeholder requirement implies more.
- **Alternatives considered**: Formal load targets + k6 tests (rejected: speculative for a
  demo client).
