# HTTP Contracts: Single-Email Invitation

All three exist only when native sign-in is on (`native` or `both`); in `oauth` mode they answer `404`. The token is never logged; log lines mask the address. `postman/openapi.json` gains A2 and A3.

## A1. `GET /invite?PID=<pid>&token=<token>` (page)

| Case | Answer |
|---|---|
| `PID` missing or not a poll id, signed out | `302 /login?error=invalid-link` |
| `PID` missing or not a poll id, signed in | `302 /` |
| Token cannot sign in (`data-model.md`) | `302 /?PID=<pid>` |
| Signed in as the invited address (email key) | sets `token_used_at`; `302 /?PID=<pid>` |
| Otherwise | `200 invite.html`, `Cache-Control: no-store`; writes nothing |

The terms gate treats `/invite` as a page route; an account without the current Terms is sent through `/accept-terms?next=` as today.

## A2. `GET /api/invitations/link-info?PID=<pid>&token=<token>`

`Cache-Control: no-store`. Writes nothing. In the terms gate's `ALLOWED_API`.

- `404 { error: "invalid-invitation", redirect: "/?PID=<pid>" }` when the token cannot sign in (or `redirect: "/login?error=invalid-link"` without a valid `PID`).
- `200`:

```json
{
  "email": "j•••@gmail.com",
  "hasAccount": false,
  "signedInAs": null,
  "termsVersion": "2026-10-21",
  "staySignedInDefault": false,
  "providers": ["google", "apple"]
}
```

`signedInAs` is the masked address of the current session when it is another account, else `null`; `providers` is empty unless sign-in is `both`.

## A3. `POST /api/invitations/redeem`

Body:

```json
{ "pid": "<uuid>", "token": "<token>", "stay": true, "acceptedTerms": true, "termsVersion": "2026-10-21", "signOut": false }
```

Checked in this order (research R6); in the terms gate's `ALLOWED_API`.

| Condition | Answer |
|---|---|
| `Origin` not the site's own | `403 { error: "Forbidden" }` |
| Token cannot sign in (including a second press) | `200 { redirect: "/?PID=<pid>" }` |
| No account and Terms not accepted (or an old `termsVersion`) | `400 { error: <the create-account message>, code: "terms-required" }` |
| Rate limit reached (`/redeem-invitation`; only requests that got past the two rows above count) | `429` with the existing rate-limit body |
| Address not allowed by the pre-launch allowlist | `403 { error: <not-launched message>, code: "not-launched", redirect: "/login?error=not-launched&PID=<pid>" }` |
| Signed in as another account and `signOut` not `true` | `409 { error: "Signed in as another account.", code: "other-account" }` |
| Sign-in could not be completed (the server-side sign-in step failed) | `500` with the generic error body; the token stays unused |
| Success | `200 { redirect: "/?PID=<pid>" }` with the `session_token` cookie shaped by `stay` |

On success: the account is created when there is none (`name: ""`, agreement recorded); another account's session is ended first when `signOut` is `true`; the token is marked used; the browser is signed in through the magic-link verification, which marks the address confirmed and runs the session hooks (other sessions of the invited account revoked, a pending account activated, invitations adopted).

## A4. `GET /api/auth/create-account/link-info?token=<token>` (TWEAK04)

The Create Account card's facts when it is opened from the one-time link in the create-account email (sent when a sign-in link is requested for an address with no account). Reads only; `Cache-Control: no-store`; in the terms gate's `ALLOWED_API`; `404` outside native sign-in.

| Condition | Answer |
|---|---|
| Token unknown, used, superseded by a newer email, or older than 15 minutes | `404 { error: <the invalid-link message>, code: "invalid-link" }` |
| Otherwise | `200 { email: <masked address>, hasAccount: <the address has an account by email key>, termsVersion }` |

## A5. `POST /api/auth/create-account` — token form (TWEAK04)

Body `{ token, acceptedTerms?, termsVersion? }`; no `email`. The token's row holds the address, the poll id and the "stay signed in" choice from the sign-in request. Checked in this order:

| Condition | Answer |
|---|---|
| Hidden `homepage` field filled | `200 { message: "Check your inbox" }`, nothing done |
| `Origin` not the site's own | `403 { error: "Forbidden" }` |
| Token cannot be used | `400 { error: <the invalid-link message>, code: "invalid-link" }` |
| No account and Terms not accepted (or an old `termsVersion`) | `400 { error: <the create-account message>, code: "terms-required" }` |
| Rate limit reached (the create-account limit) | `429` with the existing rate-limit body |
| Address not allowed by the pre-launch allowlist | `403 { error: <not-launched message>, code: "not-launched" }` |
| Token used up by another request first | `400 … code: "invalid-link"` |
| Sign-in could not be completed | `500` with the generic error body |
| Success | `200 { redirect: "/?PID=<pid>" or "/" }` with the `session_token` cookie; no email is sent |

On success the token is deleted, the account is created when there is none (`name: ""`, agreement recorded), any session in the browser is ended, and the browser is signed in through the magic-link verification, which confirms the address and runs the session hooks. The card falls back to the address form, with "That link has expired or has been used.", on `invalid-link`.
