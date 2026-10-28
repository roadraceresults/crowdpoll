# Data Model: User Authentication System

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-10

MongoDB database `APP_MONGODB_NAME` (default `app01`). BetterAuth's MongoDB adapter owns
the physical `user`, `session`, and `verification` collections; the model below is the
logical shape — BetterAuth-standard fields are extended with our custom fields via the
library's additional-fields mechanism. Field names are finalized against the installed
library version at implementation time.

## users (Profile — spec: "User Profile")

| Field | Type | Rules |
|---|---|---|
| `_id` | ObjectId | — |
| `clientId` | string (GUID) | Native: system-assigned at creation. OAuth: provider-assigned. |
| `clientSecret` | string (GUID/secret) | Native: system-assigned. OAuth: provider-assigned. Never sent to the client. |
| `userName` | string ≤200 | **Unique across accounts, case-insensitive** (index with collation strength 2). Default: email local-part truncated to 200; numeric suffix `2,3,…` appended on collision (base truncated so total ≤200). |
| `emailAddress` | string | Native: required, **unique**, user-editable, ≤200 chars (UI text-field limit). Valid email format. OAuth: provider-supplied, stored, read-only (not user-editable), no app-imposed length limit. Present and returned by the profile API in both modes. |
| `profileAvatar` | string (URL/path) | Native: system default image. OAuth: provider-supplied. Not user-editable. |
| `status` | `pending` \| `active` | Created `pending`; set `active` by first successful login-link sign-in. |
| `createdAt` / `updatedAt` | Date | Library-managed. |

**State transitions**: `pending → active` (first verified sign-in). No other transitions;
unactivated cleanup is out of scope (spec assumption).

## sessions

| Field | Type | Rules |
|---|---|---|
| `token` | string | Random; carried by the single `session_token` cookie (httpOnly, secure, sameSite=lax). |
| `userId` | ref → users | **At most one active session per user** — enforced at sign-in by revoking all other sessions (FR-007a), not by index. |
| `expiresAt` | Date | Stay-signed-in checked: now + `APP_SIGNIN_COOKIE_DURATION_MAX` (default 30 days). Unchecked: server session expires after 24 hours, and the cookie is session-scoped (no maxAge) so it dies with the browser. |
| `createdAt` | Date | — |

**State transitions**: `created → replaced` (new sign-in elsewhere) \| `expired` \|
`revoked` (logout).

## verification tokens (login links & email-change links)

One library-managed store, two logical uses distinguished by `purpose`.

| Field | Type | Rules |
|---|---|---|
| `identifier` | string | Login link: target email. Email change: `userId:newEmail`. |
| `token` | string (hashed) | Single use; self-contained (no session needed at click). |
| `purpose` | `login` \| `email-change` | — |
| `expiresAt` | Date | ~15 minutes from issue; TTL index cleans up. |
| `consumedAt` | Date? | Set on use; presence ⇒ link refused thereafter. |

**Supersession rule**: issuing a new token for the same `identifier`+`purpose` invalidates
prior unconsumed tokens (delete-on-issue).

**State transitions**: `issued → consumed` \| `expired` \| `superseded`.

## email_change_requests

Tracks the pending change tied to a verification token (needed for FR-013b/d).

| Field | Type | Rules |
|---|---|---|
| `userId` | ref → users | One pending request per user (newer supersedes older). |
| `newEmail` | string ≤200 | Valid format; MUST NOT match any `users.emailAddress` at issue **and** re-checked at consume (race per spec edge case: first verified change wins). |
| `oldEmail` | string | Captured at issue; receives the FR-013d notification on completion. |
| `createdAt` | Date | — |

**State transitions**: `pending → completed` (token consumed; profile email swapped,
notice sent to `oldEmail`) \| `superseded` \| `expired`.

## rate limiting storage

No custom collection (revised 2026-08-10, research R5): BetterAuth's built-in rate
limiter owns its storage, configured to persist in the database. Rules: 2 requests per
15-minute window **per requesting client (IP), per email-sending endpoint** (login-link
request, create-account, email-change request). Refusals surface the limiter's
retry-after so responses can state the next-allowed time.

## Relationships

```text
users 1 ──── 0..1 sessions            (single active session)
users 1 ──── 0..1 email_change_requests
users 1 ──── 0..* verification tokens (via identifier; ≤1 live per purpose after supersession)
rate-limit storage: library-managed, keyed per client+endpoint (no relation to users)
```

## Cross-cutting validation rules

- Email fields: syntactic validation + ≤200 chars before any DB or email-send work.
- All identity comparisons on email are case-insensitive (normalized to lowercase at the edges).
- Account-existence privacy: login-link responses identical whether or not the email has an account (spec assumption).
- No collection ever stores a password or a plaintext token (tokens stored hashed by the library).
- `APP_SIGNIN_METHOD=oauth`: `emailAddress` is provider-supplied and read-only (not user-editable, no auth dependency); native-only flows (login-link, email-change) disabled (FR-019/020).
