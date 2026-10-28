# Data Model: Production Email

**Feature**: `specs/20261019-153514-PRODUCTION-EMAIL/spec.md`

One additive migration, an expression index. No table or column is added or changed, and nothing is backfilled.

## Stored data

### `"user"` (existing): new index only

| Item | Change |
|---|---|
| `"email"` | Unchanged: stored as typed, already lower case (`parseEmail`), still `unique`. |
| `user_email_key_idx` | **New** (migration `008-email-key`): a non-unique btree index on `emailKey("email")` (research R10). |

`emailKey(address)`, defined once in `src/auth/emailKey.ts` as a SQL expression:

| Part | Rule |
|---|---|
| Local part | Everything before the first `+` (the `+tag` is dropped). |
| Gmail | When the domain is `gmail.com` or `googlemail.com`: every `.` is removed from the local part, and the domain becomes `gmail.com`. |
| Other domains | Unchanged. |
| Result | `<local>@<domain>`; e.g. `j.smith+polls@googlemail.com` → `jsmith@gmail.com`, `ann+x@example.org` → `ann@example.org`. |

Validation rules (FR-024–FR-028):
- The key is only compared, never stored or shown.
- The index is **not** unique: existing accounts that already share a key keep working (FR-028, NC3).
- Down migration: drop the index.

### `verification` (existing BetterAuth table): read only

`GET /api/auth/link-info` reads one row by `identifier = hashToken(token)`: `value.email` (JSON) and `createdAt`, and checks
`expiresAt`. It never writes or deletes a row; only a sign-in consumes it, as today.

## Not stored

### Outgoing message (in memory)

| Field | Notes |
|---|---|
| `type` | `login-link`, `create-account`, `email-change-verification`, `email-change-notice`. |
| `to` | Recipient; logged only masked (`j•••@gmail.com`). |
| `from` | `ENV_EMAIL_FROM`, default `CrowdPoll <no-reply@mail.crowdpoll.vote>`. No `Reply-To`. |
| `subject`, `text`, `html` | From `src/email/templates.ts`; every inserted value escaped in `html`. |
| `messageId` | Returned by the transport after the send; logged. |

### `signin_binding` cookie (browser)

| Attribute | Value |
|---|---|
| Value | 24 random bytes, base64url. |
| Attributes | `HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=900` (the link's 15 minutes). |
| Set by | `POST /api/auth/create-account` and `POST /api/auth/request-login-link` when a sign-in link is issued (not for the create-account invitation or a honeypot hit). |
| Cleared by | A successful sign-in (`Max-Age=0`). A newer request overwrites it. |
| Personal data | None. |

### Sign-in link (existing, one parameter added)

`<origin>/api/auth/verify?token=…&stay=0|1[&PID=…]&bind=<hashToken(cookie value)>`.
State per link: **issued** → **used** (signed in, by either path) or **expired** (15 minutes) or **superseded** (a newer link for
the same address, as today). Showing the confirmation page does not change the state.

## Configuration (new and renamed)

| Variable | Default | Notes |
|---|---|---|
| `ENV_EMAIL_TRANSPORT` | `smtp` | `smtp` (sandbox, or the console without credentials) or `ses`. Production and, since TWEAKS01, the development templates set `ses`. |
| `ENV_SES_REGION` | unset | Required with `ses`: `ca-central-1` in production, `us-east-1` in the development templates (TWEAKS03). |
| `ENV_SES_ACCESS_KEY_ID` | unset | Required with `ses`; a secret in `.do/app.yaml`. |
| `ENV_SES_SECRET_ACCESS_KEY` | unset | Required with `ses`; a secret in `.do/app.yaml`. |
| `ENV_EMAIL_FROM` | `CrowdPoll <no-reply@mail.crowdpoll.vote>` | Replaces `ENV_SMTP_FROM`, which is no longer read. The development templates set `CrowdPoll <no-reply@dev.mail.crowdpoll.vote>` (TWEAKS03). |
| `ENV_EMAIL_SEND_TIMEOUT` | `10000` | ms; a send still running then counts as failed. |
| `ENV_EMAIL_ASSET_ORIGIN` | unset | Origin the logo is loaded from, e.g. `https://crowdpoll.vote` (no path); unset → the link's origin. The development templates set it (TWEAKS06). |

`ENV_SMTP_HOST`, `ENV_SMTP_PORT`, `ENV_SMTP_USER` and `ENV_SMTP_PASS` keep their meaning for `smtp`.
