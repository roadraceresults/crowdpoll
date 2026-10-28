# Phase 1 Data Model: Poll Edit Card

Two layers: what is stored, and what the card holds while it is open. The stored model changes in one
way only — three enumerations take new values — so most of this document is about the client state the
card introduces, which is where this feature's complexity actually lives.

## Stored model

### `polls` — changed values, unchanged shape

No field is added, removed or retyped. Three fields take new values.

| Field | Before | After |
|---|---|---|
| `pollVisibility` | `PUBLIC POLL`, `PRIVATE POLL - ANYONE WITH THE LINK - DO NOT SHOW WHO VOTED`, … | `Public Poll`, `Private Poll - Anyone With The Link - Do Not Show Who Voted`, … |
| `choiceMode` | `SINGLE-CHOICE-POLL`, `MULTIPLE-CHOICE-POLL` | `Single-Choice Poll`, `Multiple-Choice Poll` |
| `voteMutability` | `FINAL-VOTE-POLL`, `DYNAMIC-VOTE-POLL` | `Final-Vote Poll`, `Dynamic-Vote Poll` |

These are stored exactly as displayed; there is no mapping layer and none may be introduced. Two derived
rules read them and must move with them:

- `isPublicVisibility(v)` — equality against the public value
- `isInvitationOnly(v)` — **substring** match, re-cased to `"Invitation Only"` (see research R3)
- `INVITATION_ONLY_VISIBILITIES` — derived from the predicate, used by `homeGridFilter`

**Migration**: none. `polls` and `voteHistory` are dropped as a release step (research R4). Auth
collections are untouched.

### `voteHistory` — unchanged

Holds `pid`, `emailAddress`, `userName`, `choiceIds`, `votedAt`. No renamed constant appears in it. It
is dropped with `polls` only because its rows reference polls that no longer exist.

### Editing session fields — unchanged, newly load-bearing

Already on `polls`: `pollStateBeforeEditUpdate`, `pollEditUpdateHeartbeatTimestamp`,
`pollEditUpdateClientGUID`, plus `pollState` taking the value `EDITING`. This feature does not change
them, but it changes when they are held: previously for the whole life of an edit *page*, now from the
pen click to save or cancel.

## Derived values (computed, never stored)

| Value | Definition | Consumer |
|---|---|---|
| `voteCount` | `currentVotes` entries whose `choiceIds` is non-empty — the existing `computeResults().totalVoted` | Read-only card; the over-cap message |
| `invitationCount` | `invitedVoterList.length` | Read-only card; the over-cap message |
| `bannedVoterCount` | `bannedVoterList.length` | Read-only card; the over-cap message |

`voteCount` is deliberately *not* `currentVotes.length`. That array is a list of participant records,
and on an invitation-only poll it holds a zero-choice entry for every unused invitation. The voter
ceiling is enforced against the non-empty count, and both values appear on the same card, so any other
definition would show a poll at its limit while it still accepted votes.

The three counts are independent measures, not a partition, and none is the row count of the section
below it: that matches `voteCount` on an ordinary poll and `invitationCount` on an invitation-only one.

## Client state

### Page state — one per open `/admin` page

| Name | Type | Notes |
|---|---|---|
| `polls` | list of card data | From the list response; the source for every read-only card |
| `editingPid` | poll id or null | The page-local latch. While set, every other pen and the create control are disabled |
| `refreshTimer` | interval | Unchanged cadence; skips the editing card entirely (research R5) |
| `openMenu` | menu reference or null | Existing actions-menu state, unchanged |

### Card state — one per card, only while in editing form

| Name | Type | Notes |
|---|---|---|
| `mode` | `READ_ONLY` \| `EDITING` | Read-only is the default and holds no session |
| `clientGuid` | string | Fresh per editing session, so a stale claim can never be reclaimed by accident |
| `draft` | field → value | Every edit lands here; nothing reaches the server until save |
| `dirty` | boolean | Gates the save control and the unsaved-changes warning |
| `poll` | poll detail | From the edit-session response — the only place the rosters arrive |
| `invited`, `banned` | address lists | Local working copies; bans and invitations mutate these |
| `voted` | voter list | Fetched once per session on first expansion of either section |
| `sections` | per section: `expanded`, `page` | Independent per section and per card |
| `heartbeat` | interval | Runs only in editing form |

### Card mode transitions

```text
READ_ONLY --pen, claim granted--------------> EDITING        (session opened, heartbeat starts)
READ_ONLY --pen, claim refused--------------> READ_ONLY      (message on the card)
EDITING   --save and publish----------------> READ_ONLY      (server cleared the session, both outcomes)
EDITING   --cancel--------------------------> READ_ONLY      (card releases the session)
EDITING   --claim lost----------------------> READ_ONLY      (nothing to release; message on the card)
EDITING   --navigate away-------------------> (page ends)    (session released after the unsaved gate)
```

**Invariant**: exactly the card in `EDITING` holds a session; a card in `READ_ONLY` never holds one.
The three user-initiated exits maintain it by releasing; the involuntary one holds because the session
has already ended elsewhere. A closed or crashed tab cannot release anything and is left to the existing
stale-session sweep.

## Validation rules

Unchanged from the current implementation and re-applied in the card:

| Rule | Where enforced |
|---|---|
| Title and subtitle length caps | Client on input, server on publish |
| 2–50 choices, no blank lines, 100 characters per choice | Client sanitiser, server on publish |
| Start must precede end | Client on change, server on publish; the schedule sweep is the fail-safe |
| Voter count limit: blank means the default; otherwise 1..default | Client on input, server on publish |
| Choice mode, vote mutability and visibility are frozen once a poll has votes | Server decides; client renders the decision |
| Invited address: valid, ≤200 characters, not already invited, not banned | Client on add, server on publish |

New in this feature:

| Rule | Where enforced |
|---|---|
| A roster larger than the ceiling is replaced by an empty array | Server, in `buildAdminPollDetail()` and the results handler |
| Page number is clamped to `[1, q]`; unparseable input reverts | Client, on Enter or blur |
| At most one card per page in editing form | Client latch |
