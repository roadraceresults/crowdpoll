# Data Model: Real-Time Opinion Poll System

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-12

MongoDB database `APP_MONGODB_NAME` (default `app01`), same instance as `001-user-auth`'s
`user`/`session`/`verification` collections. Two new collections, per research.md R2.

## polls

One document per poll. `_id` doubles as the public `PID` (research.md R3).

| Field | Type | Rules |
|---|---|---|
| `_id` | string (UUID) | System-generated at creation (FR-001); this **is** the `PID`. |
| `title` | string ≤100 | Multiline permitted (FR-002). |
| `subtitle` | string ≤100 | Optional, multiline permitted (FR-003). |
| `choiceMode` | `SINGLE-CHOICE-POLL` \| `MULTIPLE-CHOICE-POLL` | Default `SINGLE-CHOICE-POLL` (FR-010). MUST NOT be set to `SINGLE-CHOICE-POLL` if any choice already has >1 vote (FR-047). |
| `resultsVisibility` | `ANONYMOUS-POLL` \| `TRANSPARENT-POLL` | Default `ANONYMOUS-POLL` (FR-011). No voter-facing effect in this iteration (Assumptions). |
| `voteMutability` | `FINAL-VOTE-POLL` \| `DYNAMIC-VOTE-POLL` | Default `FINAL-VOTE-POLL` (FR-012). |
| `accessMode` | `PUBLIC_POLL` \| `PRIVATE_POLL_ANYONE_WITH_THE_LINK` \| `PRIVATE_POLL_INVITATION_ONLY` | Default `PUBLIC_POLL` (FR-013). Locked once the poll has ever had ≥1 vote recorded (FR-048, incl. later-removed votes per Assumptions). |
| `voterCountLimit` | integer \| null (**superseded** — see `005-admin-page-improvements` data-model.md) | As of `005-admin-page-improvements` US4: default `null` (blank), since the default `accessMode` is `PUBLIC_POLL`; set to 500 whenever `accessMode` transitions to a private mode from `PUBLIC_POLL`, cleared to `null` on the reverse transition; capped at 500. Still only enforced (and only meaningful) for `PRIVATE_POLL_ANYONE_WITH_THE_LINK`, and `null` there means no cap (FR-007, FR-029 here; FR-017–021 in `005-admin-page-improvements`). |
| `pollState` | `PENDING-POLL-STATE` \| `ACTIVE-POLL-STATE` \| `CLOSED-POLL-STATE` \| `ARCHIVED-POLL-STATE` | Default `ACTIVE-POLL-STATE`. `PENDING`/`ACTIVE` derived from `startAt`/`endAt` at read time (FR-014); `CLOSED`/`ARCHIVED` are explicit, admin-set, and override derivation. |
| `createdAt` | Date (UTC) | Set at creation; sort key for the admin list (FR-037, descending). |
| `startAt` | Date (UTC) \| null | Optional (FR-015). Cannot be moved into the future once the poll has ≥1 vote and the existing `startAt` has already passed (FR-046). |
| `endAt` | Date (UTC) \| null | Optional (FR-015). Set to "now" as a side effect of `CLOSED-POLL-STATE`/`ARCHIVED-POLL-STATE` (FR-045). Must be after `startAt` when both set. |
| `choices` | `Choice[]` | 2–50 active (non-removed) choices at all times (FR-005). See below. |
| `invitedVoterList` | string[] (email, ≤200 chars each) | Only meaningful for `PRIVATE_POLL_INVITATION_ONLY`; ≤500 entries (FR-008). Lowercased at write for case-insensitive matching. |
| `bannedVoterList` | string[] (email, ≤200 chars each) | Any access mode (FR-009). Lowercased at write. |
| `currentVotes` | `VoteEntry[]` | One entry per participant who has voted, been pre-seeded (invitation-only), or been banned-with-history-removed. See below. |

### Choice (embedded in `polls.choices`)

| Field | Type | Rules |
|---|---|---|
| `id` | string (UUID) | Stable reference used by `VoteEntry.choiceIds`; survives label edits and position moves. |
| `label` | string ≤100 | Single-line (FR-004). Unique among *active* labels on the same poll (FR-006). Suffixed `" (removed)"` (truncated per research.md R10) once removed. |
| `position` | integer | 0-based; append-only for new choices (FR-039 "added to the end"). |
| `removed` | boolean | Default `false`. Once `true`, permanent — no undo (FR-043); a new choice may reuse the same label. |

### VoteEntry (embedded in `polls.currentVotes`)

| Field | Type | Rules |
|---|---|---|
| `emailAddress` | string ≤200 | Lowercased. Primary participant key — chosen over `clientId`/session id because `PRIVATE_POLL_INVITATION_ONLY` pre-seeds entries (FR-031) before the invited person has ever signed in, and because FR-053's admin participant view is keyed by `emailAddress` for every access mode. Reliable in both `native` and `oauth` sign-in modes as of the `001-user-auth` contract fix (`emailAddress` always present on the session/profile). |
| `userName` | string ≤200 | Snapshot of the account's `userName` at last vote (or, for pre-seeded invitation entries, absent until they first vote); refreshed on every vote so the admin participant view (FR-053) shows current names. |
| `choiceIds` | string[] | References `choices[].id`. Empty = "no vote" (pre-seeded invitation entries, or a removed-choice reset per FR-042). All entries in one submission share `votedAt` (FR-018/FR-020). |
| `votedAt` | Date (UTC) \| null | `null` for a pre-seeded, never-voted invitation entry. |
| `removed` | boolean | `true` when this participant's sole current choice was removed (FR-042) — distinct from *banned* (banned participants are deleted from `currentVotes` entirely, per FR-050, and tracked only in `bannedVoterList`). |

## voteHistory

Append-only audit trail satisfying FR-018 ("keep prior submissions in history"). Never read
on the results/vote hot path (research.md R2) — write-only from the app's perspective except
for potential future/manual audit queries, which are out of this feature's scope.

| Field | Type | Rules |
|---|---|---|
| `_id` | ObjectId | — |
| `pid` | string | References `polls._id`. Indexed. |
| `emailAddress` | string | Lowercased, same participant key as `VoteEntry`. |
| `userName` | string | Snapshot at submission time. |
| `choiceIds` | string[] | The full set submitted together (shared `votedAt`). |
| `votedAt` | Date (UTC) | — |

**State transitions**: `created` only — rows are never updated or deleted (indefinite
retention, no purge mechanism per FR-045/Assumptions).

## Relationships

```text
polls 1 ──── 0..* voteHistory        (via pid; write-only, never joined back for reads)
polls.currentVotes[].emailAddress ── users.emailAddress   (logical, not a DB reference —
                                        matched at request time against the signed-in
                                        session's emailAddress; Profile/users collection
                                        is owned by 001-user-auth and not modified here)
```

## Cross-cutting validation rules

- All email fields (`invitedVoterList`, `bannedVoterList`, `VoteEntry.emailAddress`,
  `voteHistory.emailAddress`) are lowercased at write time for case-insensitive matching,
  consistent with `001-user-auth`'s existing email-comparison convention.
- `title`/`subtitle`/`choice.label` length limits enforced both client-side (input truncation
  + feedback, FR-002–004) and server-side (reject over-limit writes) — never trust the client
  alone.
- Choice `id`s are never reused or reassigned; removal only flips `removed`, add appends a new
  `id`.
- `AccessMode`/`ChoiceMode` edit locks (FR-047/FR-048) are enforced by checking whether
  `voteHistory` has ever contained a row for this `pid` (and, for `ChoiceMode`, whether any
  single choice has been selected by more than one distinct `emailAddress` across current
  `currentVotes` — not `voteHistory`, since a removed/superseded vote no longer counts toward
  "has more than one vote" going forward) — see research.md R2 for why history and current
  state live in separate collections.
- `PENDING-POLL-STATE`/`ACTIVE-POLL-STATE` are never stored as such when derivable — read-time
  derivation from `startAt`/`endAt` against "now," except when `pollState` is explicitly
  `CLOSED-POLL-STATE` or `ARCHIVED-POLL-STATE` (FR-014), which always win.
