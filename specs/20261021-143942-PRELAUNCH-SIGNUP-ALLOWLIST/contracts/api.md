# HTTP Contracts: Pre-Launch Sign-Up Allowlist

All changes apply only while `ENV_ALLOWED_EMAILS` is on. With it off, every endpoint answers exactly as before.
"Unlisted" means `isAllowed(email, config)` is false (`data-model.md`).

The refusal body, `NOT_LAUNCHED`:

```json
{ "error": "CrowdPoll hasn't launched yet. For now, accounts are open to invited testers only.", "code": "not-launched" }
```

Every refusal logs `[auth] Not launched: <path> refused for <masked address>` (R5).

## A1. `POST /api/auth/create-account`

- Order: honeypot → address → rate limit → **allowlist** → account lookup → create → send.
- Unlisted → `403 NOT_LAUNCHED`; no account is created, no email is sent, the rate limit is consumed. Log path `create-account`.
- Listed → unchanged (`200 { "message": "Check your inbox" }`).

## A2. `POST /api/auth/request-login-link`

- Order: honeypot → address → rate limit → **allowlist** → account lookup → send link or invitation.
- Unlisted → `403 NOT_LAUNCHED`; neither a sign-in link nor a create-account invitation is sent. Log path `login`.
- Listed → unchanged, including the invitation for a listed address with no account.

## A3. `POST /api/me/email-change`

- Order: session → honeypot → address → same-address and in-use checks → rate limit → **allowlist** (on the new address) →
  drop the older request → send.
- Unlisted new address → `403 NOT_LAUNCHED`; the older pending request is kept, nothing is sent. Log path `email-change`.

## A4. `GET /api/auth/verify`

- Before `completeSignIn` (both the bound fast path and the redirect to `/confirm-signin`): the link's address
  (`pendingLink(token).email`) is checked.
- Unlisted → `302 /login?error=not-launched` (with `&PID=` when present); the token is **not** consumed. Log path `session`.
- An invalid, expired or used link → unchanged (`/login?error=invalid-link`).

## A5. `POST /api/auth/confirm-signin`

- After the `Origin` check, the same check on the link's address.
- Unlisted → `403 { ...NOT_LAUNCHED, "redirect": "/login?error=not-launched" }`; the token is not consumed. Log path `session`.

## A6. `GET /api/me/email-change/verify`

- After the token is consumed and parsed, before the address is changed: `change.newEmail` is checked.
- Unlisted → `302 /profile?error=not-launched`; the address is not changed. Log path `email-change`.

## Session hook (no route)

BetterAuth `session.create.before` (`src/auth/auth.ts`), only while the list is on: reads the user's email by id; unlisted →
throws `APIError("FORBIDDEN", { message: "not-launched" })`, so no session is created on any path, OAuth included. Log path
`session`.

BetterAuth `user.create.before`, likewise only while the list is on: an unlisted new user's email throws the same error, so a
refused social sign-in leaves no `"user"` row.

## `postman/openapi.json`

A1, A2, A3 and A5 gain a `403` response with the `NOT_LAUNCHED` body (A5 with `redirect`); A4 and A6 document the
`error=not-launched` redirect target in their `302` descriptions.
