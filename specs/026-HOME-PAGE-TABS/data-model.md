# Data Model: Home Page Tabs

**No schema change, no migration, no backfill.** Everything below reads and writes existing tables.

## `user_polls` (unchanged shape)

| Column | Notes |
|---|---|
| `email` | the user |
| `poll_id` | FK `polls(id)` on delete cascade |
| `relation` | `created` · `invited` · `voted` · `bookmarked` · `linked` — plain `text`, no check |
| `updated_at` | latest write; orders every personal tab |

PK (`email`, `poll_id`, `relation`). Index `user_polls_email_updated (email, updated_at desc)` serves all four tabs.

**View = `linked`** (research R1). One row per user per poll; the link route upserts it, skipping the write
when `updated_at` is under one minute old. It is deleted only by the poll's cascade.

## Relation → tab

| Relation | Written by | Tabs it feeds |
|---|---|---|
| `created` | `insertPoll` (creator passed in) | Your Polls |
| `invited` | `insertPoll`, `updatePoll` (upsert); **deleted** by `updatePoll` for dropped emails | Shared With You |
| `linked` | link route (`resolveSharedLink`) | Shared With You |
| `voted` | vote path | Your Votes |
| `bookmarked` | `addBookmark` / `removeBookmark` (with `bookmarks` row) | Watching |

## Query rules (all through `personalTabQuery`)

- Your Polls: `created`; no visibility, no state filter.
- Shared With You: Private Poll; not own; Invitation Only requires a current `poll_invitations` row; Anyone With The
  Link accepts `linked` or `invited`.
- Your Votes: `voted`; published states (+ Archived read-only); a Private poll the user cannot reach is hidden,
  a ban keeps it.
- Watching: `bookmarked`; each row must pass `mayWatch`.

## `bookmarks` (unchanged)

`(email, poll_id, created_at)`; carries the cap and expiry; removed with the `bookmarked` relation. Private polls now
appear here and count toward `ENV_MAX_BOOKMARKS_PER_USER`.

## Projections (response shapes, not storage)

| Shape | Fields | Sent when |
|---|---|---|
| Card projection | existing `projectPoll` fields | published poll, or the creator's own |
| Creator extras | `rejectionReason` | only in the creator's Your Polls listing |
| **Placeholder** | `pid`, `notPublished: true`, `createdByName`, `contentVersion: 0` | a not-published, non-owned poll in Shared With You |
| Overlay entry | existing + `mayWatch: boolean` | personal tabs and `GET /api/me/polls` |

## Validation

- `PID` accepted only when it matches the UUID pattern; otherwise absent.
- `createdByName` is `polls.created_by_name`; empty string when unset; the email address is never substituted.
- Landing parameters `open`, `tab`, `notice` accept only their fixed values (contracts/api.md).

## State transitions of a Shared With You entry

Absent → Placeholder (unpublished, link/invitation) → Card (published, next refresh) → Absent (deleted,
uninvited, Invitation Only without the user, or made Public before publishing). Views and invitations never expire.
