# Data Model: Privacy Policy, Terms of Service and Account Deletion

One additive migration, `009-terms-and-privacy`: two `user` columns and one `polls` column. No table is added.

## `user` — two new columns

| Column | Type | Null | Meaning |
|---|---|---|---|
| `terms_version` | `text` | yes | The `TERMS_VERSION` the account last agreed to; null = never (every account created before this feature, and OAuth accounts until they accept) |
| `terms_accepted_at` | `timestamptz` | yes | When it agreed; set together with `terms_version` |

- Written by: create-account (R4) and `POST /api/legal/accept-terms` (R6), always both together.
- Read by: `sessionCache.lookup()` with `permissions`, cached with the session (R3).
- Not declared to BetterAuth.
- `down`: drops both columns.

## `polls` — one new column

| Column | Type | Null | Meaning |
|---|---|---|---|
| `ever_voted` | `boolean` | no, default `false` | The poll has received at least one vote, ever; never cleared |

- Backfilled by migration `009`: `true` where any `vote_history` row has the poll's id.
- Set wherever a `vote_history` row is inserted (`recordVote` and the other insert in `store.ts`, and the consumer's
  batch insert), in the same transaction.
- Read by `hasVoteHistory` and `pollsEverVoted` (`src/polls/store.ts`) instead of probing `vote_history`, so dropping
  old history partitions (Retention) does not unfreeze a poll.
- `down`: drops the column.

## `session` — data cleared

- The migration runs `update "session" set "ipAddress" = null, "userAgent" = null`.
- From now on `session.create.before` writes both as null (R10). The columns stay (BetterAuth's schema).

## The current version

- `TERMS_VERSION` (`src/legal/version.ts`), a date string `YYYY-MM-DD`.
- An account has accepted the current terms when `terms_version === TERMS_VERSION`; anything else (null or older)
  is "not accepted" for the gate (R5).

## Anonymized vote

- `votes` / `vote_history` rows of a deleted account on another user's poll:
  - `email` = `deleted-<uuid>@deleted.invalid`, one `<uuid>` per (deleted account, poll), so a vote and its history
    stay paired and the `(poll_id, email)` key stays unique;
  - `user_name` = `Deleted user`;
  - `choice_ids` and `voted_at` unchanged, so counts and results are unchanged.
- Nothing ever matches the placeholder to a person: no account can hold an `.invalid` address
  (`EMAIL_PATTERN` accepts it, but no mail can be delivered to verify it, so no account can be created with it).

## What deletion touches

| Data | Action |
|---|---|
| `user` row | deleted |
| `session`, `account`, `email_change_requests` | deleted (cascade from `user`) |
| `verification` sign-in links for the address | deleted |
| Polls with `created_by_id` = the account | deleted, with their `vote_history`; `votes`, `poll_invitations`, `poll_bans`, `bookmarks`, `user_polls` cascade; a `search_outbox` row each |
| Its `votes` / `vote_history` on other polls | anonymized (above); each poll's content version bumped |
| `bookmarks`, `user_polls`, `poll_invitations` for the address | deleted |
| `poll_bans` for the address | kept |
| Cache: its sessions, the affected polls' `invite:`/`ban:` keys, the deleted polls' counters | dropped after commit |
| Cache: `deleted-accounts` set | the address added for one hour before the transaction (removed if it fails); the vote consumer drops queued votes from it |

## Retention (enforced by `retentionSweep`, daily, lock 11)

| Record | Removed when |
|---|---|
| `session` | `expiresAt` < now |
| `verification` | `expiresAt` < now |
| `email_change_requests` | `created_at` < now − 15 minutes |
| `rateLimit` | `lastRequest` < now − the email rate-limit window |
| `vote_history_YYYY_MM` partitions | the month ended more than 12 months ago (partition dropped) |
| `bookmarks` | unchanged: `bookmarkRemovalSweep`, 6 months |
