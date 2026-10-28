# HTTP Contracts: Production Email

Every change below is also described in `postman/openapi.json` (FR-021), and `tests/openapi-contract.test.ts` checks it.
All routes are native-mode only (`nativeOnly`), as today.

## A1. `POST /api/auth/request-login-link` (changed)

Request body gains one optional field:

```json
{ "email": "ann@example.org", "staySignedIn": false, "pid": "…", "homepage": "" }
```

| Case | Reply | Side effects |
|---|---|---|
| `homepage` non-empty (checked first) | `200 {"message":"Check your inbox"}` | None: no rate-limit use, no mail. Logged `[auth] Honeypot filled on /request-login-link; nothing sent`. |
| Registered address | `200 {"message":"Check your inbox"}` | Sign-in link sent; **`Set-Cookie: signin_binding=…; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=900`**. |
| Unknown address | `200 {"message":"Check your inbox"}` | Create-account invitation sent; no cookie. |
| Invalid email, rate limited, send failure | Unchanged: `400`, `429`, `502`. | |

## A2. `POST /api/auth/create-account` (changed)

Request body gains `homepage` as in A1.

| Case | Reply | Side effects |
|---|---|---|
| `homepage` non-empty | `200 {"message":"Check your inbox"}` | None. |
| An account matches by `emailKey` (exact match included) | `200 {"message":"Check your inbox"}` | No account created; sign-in link sent to the **existing account's stored address**; `signin_binding` set. |
| No match | `200 {"message":"Check your inbox"}` | Pending account created; sign-in link sent; `signin_binding` set. |
| Invalid email, rate limited, send failure | Unchanged. | |

## A3. `POST /api/me/email-change` (changed)

Request body gains `homepage`.

| Case | Reply |
|---|---|
| `homepage` non-empty | `202 {"message":"Verification sent to new address"}`, nothing sent (after the signed-in check, which stays first). |
| Another account matches the new address by `emailKey` | `409 {"error":"That email address is already in use."}` (today's message). |
| The new address has the caller's own key but differs (e.g. adds a `+tag`) | Allowed, as any other change. |
| Otherwise | Unchanged. |

`GET /api/me/email-change/verify` re-checks by `emailKey` at consume (the caller's row excluded), with today's refusal redirect.

## A4. `GET /api/auth/verify?token=…&stay=0|1[&PID=…][&bind=…]` (changed)

| Case | Reply |
|---|---|
| `bind` present and equal to `hashToken(signin_binding cookie)` | Today's behaviour: token consumed, session cookie shaped by `stay`, redirect to `/` or `/?PID=…`; plus `Set-Cookie: signin_binding=; Path=/api/auth; Max-Age=0`. Invalid, expired or used token: today's `/login?error=invalid-link` redirect. |
| Otherwise (no cookie, a different one, no `bind`), and the token is valid (the A5 lookup) | `302` to `/confirm-signin?token=…&stay=…[&PID=…]`. **The token is not consumed.** |
| Otherwise, and the token is unknown, expired or used | Today's `302` to `/login?error=invalid-link[&PID=…]`; the confirmation page is never shown for it. |

## A5. `GET /api/auth/link-info?token=…` (new)

| Case | Reply |
|---|---|
| A verification row exists for `hashToken(token)`, not expired, holding an `email` | `200 {"email":"ann@example.org","requestedAt":"2026-10-20T15:02:11.000Z"}` |
| Missing, expired, used or malformed | `404 {"error":"This sign-in link is invalid or has expired."}` |

`Cache-Control: no-store`. Reads only; never consumes the token.

## A6. `POST /api/auth/confirm-signin` (new)

Request (JSON): `{ "token": "…", "stay": false, "pid": "…" }`.

| Case | Reply |
|---|---|
| `Origin` header absent or not this site's origin | `403 {"error":"Forbidden"}`; nothing consumed. |
| Valid token | `200 {"redirect":"/"}` or `{"redirect":"/?PID=…"}`, with the session cookie shaped by `stay` exactly as A4's fast path, and `signin_binding` cleared. |
| Invalid, expired or used token | `400 {"error":"This sign-in link is invalid or has expired.","redirect":"/login?error=invalid-link[&PID=…]"}` |

Not rate limited: like A4, it sends no email.

## Unchanged

`POST /api/auth/logout`, `GET /api/me`, `PATCH /api/me` and every poll route. The `502` reply for a failed send keeps its text;
a send that runs past `ENV_EMAIL_SEND_TIMEOUT` is such a failure.
