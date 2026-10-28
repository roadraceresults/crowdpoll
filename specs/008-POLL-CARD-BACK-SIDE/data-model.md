# Data Model: Poll Card Back Side Parity

## Summary

**No data model changes.** No collections, documents, fields, indexes, validation
rules, or state transitions are added, removed, or modified. No API payload
changes, so `postman/openapi.json` is unchanged.

This is a presentation-layer feature: it rearranges and restyles elements inside
an existing client-side component using data the client already receives and
already renders.

## Data consumed (all pre-existing)

The only data this feature newly *displays* is the participation count on the
voting side, which the results side already displays from the same in-memory
`poll` object held by `initPollCard()`:

| Field | Type | Origin | Existing use |
|---|---|---|---|
| `totalVoted` | `number` | Voter-facing poll payload (`004-realtime-poll-voting` FR-022) | Rendered into `.poll-totals` on the results side by `setText()` (`pollCard.js:726-734`) |
| `totalNotYetVoted` | `number \| undefined` | Same payload; present for invitation-only polls | Appended as the "· N not yet voted" clause in the same string |
| `pollState` | `string` | Same payload | Read by `updateClosedState()` (`007-closed-state`) to toggle the closed messages |
| `endAt` | ISO date string | Same payload | Formatted into the closed-message text |
| `title`, `subtitle`, `choices` | — | Same payload | Already rendered on both faces |

The participation string is composed once per render in `setText()` and written
to both `.poll-totals` nodes in the same call, which is what makes FR-005
(identical value on both sides at all times, including after live updates) hold
without any synchronisation logic — see research.md R4.

## Client-side state

No new state. `initPollCard()`'s existing per-card state (the cached `poll`
object, the current selection, flip state, scroll positions) is untouched, and no
new event, timer, or fetch is introduced.

## Persistence and migration

None. Nothing is written, and no existing document requires migration or
backfill.
