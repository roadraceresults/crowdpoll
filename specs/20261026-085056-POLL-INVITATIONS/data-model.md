# Data Model: Poll Invitations

One additive migration, `src/db/migrations/010-invitations.ts`; no backfill beyond column defaults and the
`sent_at` rule below.

## Invitation — `poll_invitations` (existing table, new columns)

| Column | Type | Rule |
|---|---|---|
| `poll_id` | text, PK, FK → `polls.id` on delete cascade | existing |
| `email` | text, PK | existing; as the creator typed it, lower-cased; replaced by the account's address on adoption (research R2) |
| `position` | integer | existing; the list's order |
| `added_at` | timestamptz not null default `now()` | new; existing rows take the migration time; the sweep sends oldest first |
| `sent_at` | timestamptz null | new; set when the invitation email is claimed for sending (R6), or restored from history (R15); null = `Not sent yet` |
| `reminded_at` | timestamptz null | new; set by the one reminder (FR-029), or restored from history |
| `send_failed_at` | timestamptz null | new; set when the last send failed; cleared by a resend |
| `accepted_at` | timestamptz null | new; set once, when the signed-in invitee is shown the poll (R3) |

New index: `poll_invitations_email_key` on `emailKey(email)` (an expression index, as `008-email-key`).

Existing rows (from the old `PATCH` path) keep `sent_at` null.
The migration sets `sent_at = added_at` for rows on polls that are not INITIALIZED, AWAITING APPROVAL, REJECTED or
WAITING TO OPEN, so the sweep never emails invitations made before this feature to polls that are already open or
over; they show `Invited`.

**Validation (on add)**: `EMAIL_PATTERN`, at most 200 characters, email key not already on the list or the ban list,
the list below the voter limit, `isAllowed` while the allowlist is on, and on an OPEN poll the creator's daily
allowance (research R5, R7).

**Status (derived, never stored)** — the furthest step reached:

```text
Voted          a row in votes for (poll_id, email) with cardinality(choice_ids) > 0
Accepted       accepted_at is not null
Not delivered  send_failed_at is not null
Invited        sent_at is not null
Not sent yet   otherwise
```

**Lifecycle**:

```text
added ──(poll OPEN, within the daily allowance: route or sweep claims it)──► sent ──(send fails)──► not delivered
  │  ▲                                                                        │                       │
  │  └─(added back: sent_at, reminded_at restored from history, R15)          │◄──(resend, once)──────┘
  │                                                                           ▼
  │                                                         accepted (shown the poll) ──► voted (votes row)
  │
  └──► removed (creator, ban, account deletion, poll deletion) at any step; a sent one leaves a history row
```

**Reminder rule**: available when the poll is OPEN, `reminded_at` is null, and either
`now() - greatest(sent_at, send_failed_at) ≥ 24 h` or `send_failed_at` is set (R16).
Otherwise the reason, in this order: `"The poll is closed."` (CLOSED or ARCHIVED), `"The poll is not open."`,
`"Already reminded once."`, `"<name or address> was emailed less than 24 hours ago."`.

## Removed invitation — `invitation_history` (new table)

| Column | Type | Rule |
|---|---|---|
| `poll_id` | text, PK, FK → `polls.id` on delete cascade | |
| `email_key` | text, PK | `emailKey(email)` of the removed invitation |
| `sent_at` | timestamptz null | as it was on the invitation |
| `reminded_at` | timestamptz null | as it was on the invitation |

Written (upsert) when an invitation with `sent_at` set is deleted by the invitee route or by `writeRoster`; read and
deleted when the same key is added back (R15); deleted by email key with the account, and with the poll.

## Daily invitation count — `invitation_emails` (new table)

| Column | Type | Rule |
|---|---|---|
| `creator_id` | text not null | the poll creator's user id |
| `sent_at` | timestamptz not null default `now()` | one row per attempted invitation or reminder email |

Index `(creator_id, sent_at)`.
Allowance = `ENV_MAX_INVITATIONS_PER_DAY` − rows with `sent_at > now() - 24 h`.
`retentionSweep` deletes rows older than 24 hours.
No address is stored.

## Poll — `polls` (existing, one new column)

| Column | Type | Rule |
|---|---|---|
| `time_zone` | text null | new; the IANA zone the creator's browser reported on the admin card's last write (R14); null → emails write dates in UTC |

`invited_count` stays the list's length, now also maintained by the invitee route.
`counts_version` is bumped by every invitee change so the admin list's delta picks up the new counts.
`launched_at` and `end_at` (existing) are the email's `Poll Started` and `Poll Ends`.
`time_zone` is not part of the poll's content: `timeZone` is in `NON_CONTENT_FIELDS` (`src/polls/store.ts`), so setting it bumps no content version and never queues screening.

## Placeholder vote — `votes` (existing, unchanged)

Each invitation on an Invitation Only poll keeps its empty placeholder (`choice_ids = '{}'`, `voted_at` null).
It is inserted with the invitation, deleted with it, and adopts the account's address with it (R2).
Removing an invitee who has voted deletes their vote (with confirmation, FR-028).

## Relation — `user_polls` (existing, unchanged)

The `invited` row is inserted and deleted with the invitation and adopts the account's address with it.

## Setting

| Variable | Default | Rule |
|---|---|---|
| `ENV_MAX_INVITATIONS_PER_DAY` | `200` | positive integer; invitation and reminder emails per creator per rolling 24 hours; added to `CLAUDE.md`'s table, `launch.json.example` and `devScripts.example/launch-dev.ps1` |

## Sweep

| Name | Interval | Lock |
|---|---|---|
| `invitationSweep` | 5 000 ms (constant) | 12 (`SWEEP_LOCKS.invitations`) |
