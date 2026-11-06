# Data Model: Social Login Avatar

One migration: `src/db/migrations/017-profile-picture.ts`, registered in `src/db/migrations/index.ts`, with types in `src/db/schema.ts`.

## `user` (existing)

| Column | Type | Change | Meaning |
|---|---|---|---|
| `profileAvatar` | `text` null | meaning widens | The default path `/avatar-default.svg`, or an object key `avatars/<32 hex digits>` |
| `profile_avatar_hash` | `text` null | **new** | SHA-256 of the stored image in hex; null when the account has no stored picture |
| `image` | `text` null | unchanged | BetterAuth's own column; stays `null`, forced at creation |

## `avatar_removals` (new)

| Column | Type | Meaning |
|---|---|---|
| `key` | `text` primary key | Object key to delete from Spaces |
| `queued_at` | `timestamptz` not null, default now | When it was queued; ordering for the sweep |

## Object in Spaces

- **Key**: `avatars/` and 16 random bytes in hex; a new key for each image.
- **ACL**: `public-read`; the bucket itself is private, so it cannot be listed.
- **Content type**: from the image's leading bytes (research R9).
- **Cache-Control**: `public, max-age=86400, immutable` (research R3).

## Validation

- Source URL: `https`, host `googleusercontent.com` or a subdomain of it, no redirects (R2).
- Bytes: at most 256 KB; PNG, JPEG or WebP (R9).

## State of an account's picture

```mermaid
stateDiagram-v2
  [*] --> Default: account created
  Default --> Stored: Google login, image passes
  Stored --> Stored: Google login, hash differs, old key queued
  Stored --> Stored: any other login, or hash same, or failure
  Default --> Default: any other login, or failure, or no Spaces
  Stored --> Queued: account deleted, key queued in the same transaction
  Queued --> [*]: sweep deletes the object and the row
```

## Invariants

- Every path that stops using an object queues its key in the same transaction (`deleteAccount`, replacing a picture).
- A row in `avatar_removals` goes only after the object's delete succeeded.
- `profile_avatar_hash` is null exactly when `profileAvatar` is not an object key.
