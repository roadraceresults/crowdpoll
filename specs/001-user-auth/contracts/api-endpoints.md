# API Contract: User Authentication System

**Feature**: [../spec.md](../spec.md) | **Data model**: [../data-model.md](../data-model.md)

Human-readable contract for the service's external interface. The FR-026 deliverable
`postman/openapi.json` (OpenAPI 3.1) is generated from this contract at implementation
time and MUST stay in sync with it. BetterAuth mounts its own handler under `/api/auth/*`;
the paths below are the behavioral contract — exact library-internal paths are mapped in
`routes/api.ts` and recorded in `openapi.json`.

Conventions: JSON request/response bodies; errors are `{ "error": string }` with the
status codes listed; `429` responses additionally carry `nextAllowedAt` (ISO 8601).
Endpoints marked 🔒 require the `session_token` cookie (else `401`).

## Auth (native sign-in; disabled when `APP_SIGNIN_METHOD=oauth`)

### POST /api/auth/create-account
Create a pending account and auto-send the first login link (FR-001).
- Body: `{ "email": string }`
- `200` `{ "message": "Check your inbox" }` — same response whether or not the address
  was already registered (account-existence privacy; an existing account gets a normal
  login link instead of a duplicate account)
- `400` invalid/oversized email
- `429` rate limit (2/15 min per client, framework built-in) — `{ "error", "nextAllowedAt" }`

### POST /api/auth/request-login-link
Request a sign-in link (FR-002, FR-004a).
- Body: `{ "email": string, "staySignedIn": boolean }`
- `200` `{ "message": "Check your inbox" }` — identical for unknown addresses; an unknown
  address receives an invitation-to-create-account email instead of a login link (rate
  limit applies the same way)
- `400` invalid email; `429` as above

### GET /api/auth/verify?token=…
Consume a login link (FR-003/004). Self-contained — no session required.
- Success: activates a `pending` account, revokes any other session (FR-007a), sets the
  `session_token` cookie (persistent iff `staySignedIn` was chosen at request time),
  `302` → `/`
- Failure (expired/used/superseded/malformed): `302` → `/login?error=invalid-link`
  (message: "invalid or expired link" — non-revealing, FR-004)

### POST /api/auth/logout 🔒
Ends the current session (FR-007). `204`; clears cookie.

## OAuth (only when `APP_SIGNIN_METHOD=oauth`)

### GET /api/auth/oauth/:provider → provider redirect; callback establishes the single
session identically to link verification (FR-019). Provider set configured per deployment.

## Profile

### GET /api/me 🔒
- `200` `{ "userName", "emailAddress", "profileAvatar", "status" }`
  (`emailAddress` present in both modes — read-only under OAuth, not settable via PATCH;
  `clientSecret` never returned)
- `401` guest — used by the client to render header/guest vs member content (FR-015–017)

### PATCH /api/me 🔒
Edit userName (FR-013).
- Body: `{ "userName": string }`
- `200` updated profile; `400` >200 chars or empty; `409` name already in use
- `401` guest

### POST /api/me/email-change 🔒 (native mode only)
Request email change (FR-013a–c).
- Body: `{ "newEmail": string }`
- `202` `{ "message": "Verification sent to new address" }`
- `400` invalid/oversized, or new address equals the account's current address
- `409` address already in use by another account
- `429` rate limit (2/15 min per client, framework built-in) — `{ "error", "nextAllowedAt" }`

### GET /api/me/email-change/verify?token=…
Consume an email-change link. Self-contained — works signed in or not, any device.
- Success: re-checks new-address uniqueness (race → refuse), swaps `emailAddress`, sends
  notification (no action links) to old address (FR-013d), `302` → `/profile?changed=1`
- Failure: `302` → `/profile?error=invalid-link`

## Pages (HTML, served by the same process)

| Path | Content |
|---|---|
| `/` | Header (state-dependent links, avatar+name when 🔒), member message "You are logged in as <userName>" or guest message "Guest-mode: You are not logged in", cookie banner until acknowledged |
| `/login` | Email field, "Stay signed in on this device" checkbox, submit (native mode); provider buttons (OAuth mode) |
| `/create-account` | Email field + submit (native mode only; hidden in OAuth mode) |
| `/profile` | 🔒 Display/Edit Profile: userName (editable), email + change form (native), avatar (read-only) |

## Cross-cutting behavior

- Exactly one cookie (`session_token`) is ever set: httpOnly, secure, sameSite=lax;
  maxAge = `APP_SIGNIN_COOKIE_DURATION_MAX` only when stay-signed-in (FR-006, FR-008/009).
- Every error path returns a friendly message and logs server-side; no crash paths
  (FR-022). Email-service failure on send endpoints → `502` `{ "error": "Could not send
  email, try again later" }`.
- All endpoints available only over HTTPS in deployment (platform-terminated).
