# Data Model: Social Sign-In

No migration. The tables already exist (BetterAuth's, from migration `001`).

## `account` — a provider link (existing table)

| Column | Meaning here |
|---|---|
| `userId` | the CrowdPoll user; `on delete cascade`, so deleting an account deletes its links (FR-016) |
| `providerId` | `google`, `apple`, `microsoft`, `amazon` |
| `accountId` | the provider's user id; a person keeps their link even if their address changes at the provider, or they change it in CrowdPoll (email change in `both`) |
| `accessToken`, `refreshToken`, `idToken`, expiries, `scope` | written by BetterAuth; CrowdPoll reads none of them |

- One row per (user, provider); a user may hold several.
- Created by BetterAuth when a sign-in creates a user, or links to an existing one (research R7).

## `user` (existing)

- `email`: for a provider account, the address the provider gave, or, when it matched an existing account by email key,
  that account's stored address (R7). Apple relay addresses are stored as given.
- `emailVerified`: true for provider accounts; required true on an existing account before a link is made.
- `name`/`userName`: set from the provider's name on creation only; never overwritten on later sign-ins (Apple sends the
  name once).
- `terms_version`: null for a new provider account, so the terms gate asks for agreement on its first request.

## Configuration (no stored data)

| Setting | Values |
|---|---|
| `ENV_PUBLIC_ORIGIN` | origin, required (R1) |
| `ENV_SIGNIN_METHOD` | `native` (default) · `oauth` · `both` (R2) |
| `ENV_OAUTH_<PROVIDER>_*` | per R4; a provider is on only when complete |
