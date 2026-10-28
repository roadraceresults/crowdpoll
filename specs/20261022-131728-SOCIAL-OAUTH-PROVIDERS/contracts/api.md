# HTTP Contracts: Social Sign-In

## A1. `GET /api/config` (changed)

- `signinMethod`: `"native" | "oauth" | "both"`.
- `oauthProviders`: the enabled providers, in display order, e.g. `["google","apple","microsoft","amazon"]`; `[]` in
  `native`.

## A2. Starting a sign-in (BetterAuth, mounted in `oauth` and `both`)

- `POST /api/auth/sign-in/social` `{ "provider": "google" | "apple" | "microsoft", "callbackURL": "/" }` →
  `200 { "url": "<provider authorize URL>", "redirect": true }`.
- `POST /api/auth/sign-in/oauth2` `{ "providerId": "amazon", "callbackURL": "/" }` → `200 { "url": …, "redirect": true }`.
- `callbackURL` is a same-origin path (`/` or `/?PID=<uuid>`); anything else is refused by BetterAuth's origin check.

## A3. Callbacks (registered with each provider)

| Provider | Redirect URI |
|---|---|
| Google | `<ENV_PUBLIC_ORIGIN>/api/auth/callback/google` |
| Apple | `<ENV_PUBLIC_ORIGIN>/api/auth/callback/apple` (POST, answered with a redirect to the same URL as GET) |
| Microsoft | `<ENV_PUBLIC_ORIGIN>/api/auth/callback/microsoft` |
| Amazon | `<ENV_PUBLIC_ORIGIN>/api/auth/oauth2/callback/amazon` |

- Success → `302` to `callbackURL` with `Set-Cookie: session_token=…`.
- Failure → `302 /login?error=<code>` (R8): `not-launched`, `access_denied`, `account_not_linked`,
  `email_not_found`, or another BetterAuth code.

## A4. Native routes in each mode

| Route | `native` | `both` | `oauth` |
|---|---|---|---|
| `POST /api/auth/create-account`, `/request-login-link`, `GET /api/auth/verify`, `/link-info`, `POST /confirm-signin`, `POST /api/me/email-change`, `GET /api/me/email-change/verify` | on | on | `404` |
| `GET /create-account`, `/confirm-signin` | page | page | `404` |
| A2, A3 | `404` | on | on |

## A5. `GET /.well-known/apple-developer-domain-association.txt` (new)

- `200 text/plain` with the committed file, to anyone (no session, not gated); `404` when the file is absent.

## A6. Start-up

- `[auth] Sign-in method: both; providers: Google, Apple, Microsoft, Amazon`.
- `[auth] Apple client secret valid until <date>` (refreshed every 30 days).
- A partial provider → `[config] Incomplete Apple sign-in settings: ENV_OAUTH_APPLE_KEY_ID is not set.` and exit 1.
