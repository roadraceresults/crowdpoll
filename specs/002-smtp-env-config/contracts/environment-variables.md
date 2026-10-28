# Contract: Deployment Environment Variables

**Feature**: [../spec.md](../spec.md) | **Data model**: [../data-model.md](../data-model.md)

The system's external configuration interface. An operator (DigitalOcean App Platform
env UI) or a developer launch asset supplies these; nothing else configures the system.
This contract extends the 001-user-auth variable set — unchanged variables are listed
for completeness but not re-specified here.

## Complete variable list

| Variable | Required | Introduced by | Notes |
|---|---|---|---|
| `APP_PORT` | no (9999) | 001 | |
| `APP_MONGODB_NAME` | no (`app01`) | 001 | |
| `APP_MONGODB_URI` | no (localhost) | 001 | passed through verbatim (DO `tls=true` works) |
| `APP_ADMINS` | no | 001 | |
| `APP_POLLING_INTERVAL` | no (5000) | 001 | |
| `APP_SIGNIN_COOKIE_DURATION_MAX` | no (30 days) | 001 | |
| `APP_SIGNIN_METHOD` | no (`native`) | 001 | `native` \| `oauth` |
| `APP_OAUTH_<P>_CLIENT_ID/_SECRET` | oauth mode | 001 | per provider |
| **`APP_BETTER_AUTH_SECRET`** | **yes — every environment** | **002** | session/token signing; MUST be ≥32 chars or the system refuses to start with an error naming the variable (FR-010; no fallback). **Renames** `APP_AUTH_SECRET`, which is no longer read. |
| **`APP_SMTP_HOST`** | no (`sandbox.smtp.mailtrap.io`) | **002** | |
| **`APP_SMTP_PORT`** | no (`2525`) | **002** | positive integer; invalid ⇒ fail-fast naming the variable |
| **`APP_SMTP_USER`** | for delivery | **002** | absent ⇒ degraded-email mode (console transport + startup warning; send endpoints keep the friendly 502 path) |
| **`APP_SMTP_PASS`** | for delivery | **002** | same rule as `APP_SMTP_USER` |
| **`APP_SMTP_FROM`** | no (`NativeAuthOAuth <no-reply@nativeauth.local>`) | **002** | From header on all system email |

## Launch-asset contract (developer machines)

- Every entry in `.vscode/launch.json` (server + one per test suite) and
  `devScripts/launch-dev.ps1` sets the **complete** list above with dev defaults
  (SC-003).
- Checked-in templates (`launch.json.example`, `devScripts.example/launch-dev.ps1`)
  hold only placeholders for `APP_BETTER_AUTH_SECRET` (`__GENERATED_ON_SETUP__`),
  `APP_SMTP_USER` (`your-mailtrap-username`), `APP_SMTP_PASS`
  (`your-mailtrap-password`); all other values are real dev defaults (FR-006).
- `devScripts.example/setup-dev.ps1` (checked in, runnable in place):
  - copies both templates to their git-ignored locations
    (`.vscode/launch.json`, `devScripts/launch-dev.ps1`)
  - generates one cryptographically random 48-character secret and substitutes it for
    every `__GENERATED_ON_SETUP__` occurrence in **both** copies (FR-005a)
  - refuses to overwrite existing copies unless `-Force`
  - prints what it did and reminds the developer to fill in the Mailtrap credentials
