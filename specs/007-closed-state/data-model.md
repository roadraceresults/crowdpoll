# Data Model: Poll Closed State Display

No new fields, collections, or indexes, and no schema changes. This feature only changes how
already-existing, already-transmitted data is *displayed* client-side (research.md R1).

## Poll (existing — `src/polls/store.ts` / voter-facing `PollDetail` shape, `pollsApi.ts`)

Fields relevant to this feature (unchanged shape, already present on every voter-facing poll
payload today):

| Field | Type | Relevance to this feature |
|---|---|---|
| `pollState` | `"PENDING-POLL-STATE" \| "ACTIVE-POLL-STATE" \| "CLOSED-POLL-STATE" \| "ARCHIVED-POLL-STATE"` | Only the `"CLOSED-POLL-STATE"` case is addressed (spec.md Assumptions). Already computed by `deriveState()` and included in every `buildPollDetail()` response — `pollCard.js` simply hasn't read it until now. |
| `endAt` | `string` (ISO date) \| `null` | Already stamped to the actual close moment whenever a poll becomes closed, whether by schedule or explicit admin action (`004-realtime-poll-voting` FR-045) — used as the closed message's date (FR-003), formatted client-side as date-only (research.md R4). |

## No new client-side state

`pollCard.js`'s existing per-card closure (`poll`, `data`) already holds everything needed —
`poll.pollState` and `poll.endAt` are present on every `poll` object once `fetchPoll()`
resolves. `updateClosedState()` (research.md R2) reads directly from `poll`; it introduces no
new persisted or cached state of its own.
