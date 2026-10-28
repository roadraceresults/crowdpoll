# HTTP Contracts: Privacy Policy, Terms of Service and Account Deletion

Every change below is described in `postman/openapi.json`.

## A1. `GET /privacy`, `GET /terms` (new pages)

- `200 text/html`, no session needed, for guests and users alike, and for a user who has not accepted the current
  terms (the gate lets them through).
- `/privacy.html` and `/terms.html` redirect to the clean routes (the existing rule).

## A2. `GET /api/config` (changed)

- Adds `"termsVersion": "2026-11-01"` (the value of `TERMS_VERSION`).

## A3. `POST /api/auth/create-account` (changed)

Request body adds:

```json
{ "email": "a@example.org", "acceptedTerms": true, "termsVersion": "2026-11-01", "homepage": "" }
```

Order of checks: honeypot (unchanged, replies as on success), email validation (unchanged), **then**:

- `acceptedTerms !== true` or `termsVersion !== TERMS_VERSION` →
  `400 { "error": "Please accept the Terms of Service to create an account.", "code": "terms-required" }`;
  when `acceptedTerms` is true but the version differs, the error is
  `"The Terms of Service have changed. Reload the page and accept them again."`;
  nothing is created, no rate limit is consumed, no email is sent;
- then the rate limit, the allowlist and the rest, unchanged.

On success the account (new or existing) has `terms_version = TERMS_VERSION` and `terms_accepted_at = now`.

## A4. The terms gate (every request from a signed-in user who has not accepted `TERMS_VERSION`)

- `/api/*` other than the four below → `403 { "error": "Please accept the updated Terms of Service.", "code": "terms-required" }`.
- Allowed: `POST /api/legal/accept-terms`, `POST /api/auth/logout`, `GET /api/me`, `GET /api/config`, and the sign-in and
  link routes `POST /api/auth/create-account`, `POST /api/auth/request-login-link`, `GET /api/auth/verify`,
  `POST /api/auth/confirm-signin`, `GET /api/auth/link-info`, `GET /api/me/email-change/verify` (each creates a new
  session or needs none; the gate applies on the next request).
- `GET` of a page route (`/`, `/login`, `/create-account`, `/confirm-signin`, `/profile`, `/admin`,
  `/admin/poll/results`) → `302 /accept-terms?next=<encoded path and query>`.
- Everything else passes (pages `/privacy`, `/terms`, `/accept-terms`; assets; static files; `/healthz`).
- Requests with no `session_token` cookie, or with an invalid one, are never affected.

## A5. `GET /api/me` (changed)

- Adds `"termsAccepted": true | false` (false while the gate applies).

## A6. `GET /accept-terms?next=…` (new page)

- Signed in and not accepted → `200` the accept page.
- Guest, or already accepted → `302` to `next` when it is a same-origin path (starts with `/`, not `//`, no scheme),
  else `/`.

## A7. `POST /api/legal/accept-terms` (new)

```json
{ "termsVersion": "2026-11-01", "next": "/profile" }
```

- `Origin` must equal the request's origin, else `403 { "error": "Forbidden" }`.
- No session → `401 { "error": "Not signed in" }`.
- `termsVersion !== TERMS_VERSION` → `400 { "error": "The Terms of Service have changed. Reload the page and accept them again.", "code": "terms-required" }`.
- Otherwise records the agreement, drops the user's cached sessions, logs
  `[legal] Terms 2026-11-01 accepted by user <id>`, and answers `200 { "redirect": "<safe next or />" }`.

## A8. `DELETE /api/me` (new)

```json
{ "confirm": "DELETE" }
```

- `Origin` must equal the request's origin, else `403 { "error": "Forbidden" }`.
- No session → `401`.
- `confirm !== "DELETE"` → `400 { "error": "Type DELETE to confirm." }`.
- Deletion fails → `500 { "error": "Your account could not be deleted. Nothing was changed; please try again." }`,
  still signed in.
- Success → `200 { "redirect": "/" }` with `Set-Cookie: session_token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`.
  The "account deleted" email is sent after the response is decided; its failure does not change the response.
- The terms gate applies: until the current terms are accepted it answers `403 terms-required` like any other action
  (the four routes of A4 are the only exceptions); the accept page offers Sign Out, and deletion is one step away after
  accepting.
- Available in both sign-in modes.

## A9. Log lines (changed)

- `[auth] Create-account rate limit hit for client 203.0.113.x` and the login-link equivalent: masked IP.
- New: `[legal] Terms <version> accepted by user <id>`, `[legal] Create-account refused: terms not accepted`,
  `[account] Deleted account for j•••@gmail.com: <n> polls deleted, <m> votes anonymized`,
  `[retention] Removed <a> sessions, <b> links, <c> email changes, <d> rate-limit records; dropped <e> vote-history partitions`.
