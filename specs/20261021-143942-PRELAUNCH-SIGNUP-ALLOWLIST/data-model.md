# Data Model: Pre-Launch Sign-Up Allowlist

**Feature**: `specs/20261021-143942-PRELAUNCH-SIGNUP-ALLOWLIST/spec.md`

No stored data changes: no table, column, index or migration. The feature adds one setting and one refusal.

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `ENV_ALLOWED_EMAILS` | unset | Comma-separated addresses. Unset, empty or only separators → off: everyone may sign up and sign in. Set → only the listed addresses (compared by email key) and the `ENV_ADMINS` addresses. An entry that is not an address stops the app at startup. In production an encrypted App Platform variable set in the console, never in `.do/app.yaml` (R7). |

### `config.allowedEmailKeys` (in memory)

| Field | Type | Rule |
|---|---|---|
| `allowedEmailKeys` | `Set<string> \| undefined` | `undefined` when off; otherwise the set of `emailKeyOf(entry)` for each trimmed, lower-cased entry. |

`emailKeyOf(address)` (TypeScript twin of the SQL `emailKey`, `src/auth/emailKey.ts`):

| Part | Rule |
|---|---|
| Local part | Everything before the first `+`. |
| Gmail | For `gmail.com` and `googlemail.com`: dots removed from the local part, domain `gmail.com`. |
| Result | `<local>@<domain>`, e.g. `John.Smith+x@googlemail.com` → `johnsmith@gmail.com` (after lower-casing). |

## The rule

`isAllowed(email, config)`:

```text
allowedEmailKeys undefined          → allowed
email in config.admins              → allowed
allowedEmailKeys has emailKeyOf(email) → allowed
otherwise                           → refused
```

## The refusal (not stored)

| Field | Value |
|---|---|
| Status | `403` |
| `error` | `CrowdPoll hasn't launched yet. For now, accounts are open to invited testers only.` |
| `code` | `not-launched` |
| `redirect` | Only on `POST /api/auth/confirm-signin`: `/login?error=not-launched` (with `&PID=` when present). |

Redirect form, for links opened in the browser: `/login?error=not-launched` (sign-in link) and `/profile?error=not-launched`
(email-change link).

## State

| Thing | Effect of the list |
|---|---|
| Existing account, unlisted | Kept; cannot start a new session while the list is on. |
| Existing session, unlisted | Untouched; runs until it ends or the user signs out. |
| Unused sign-in link, unlisted | Not consumed by a refused open; it expires as usual. |
| Pending email change to an unlisted address | Refused when its link is opened; the old address is kept. |
