# Data Model: Simplify Poll States

**Feature**: `011-SIMPLIFY-POLL-STATES` | **Date**: 2026-08-28
**Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

## Collections

Two, unchanged in number. `polls` holds each poll's configuration plus only the *current* vote per
participant. `voteHistory` is append-only and is never pruned — which is what makes "has this poll
ever been voted on" answerable after a vote is deleted (research R8).

---

## Poll

### Fields carried forward unchanged

| Field | Type | Notes |
|---|---|---|
| `_id` | `string` | The public poll identifier (PID) |
| `title` | `string` | ≤ 100 chars |
| `subtitle` | `string` | ≤ 100 chars |
| `choiceMode` | `"SINGLE-CHOICE-POLL" \| "MULTIPLE-CHOICE-POLL"` | |
| `resultsVisibility` | `"ANONYMOUS-POLL" \| "TRANSPARENT-POLL"` | |
| `voteMutability` | `"FINAL-VOTE-POLL" \| "DYNAMIC-VOTE-POLL"` | |
| `accessMode` | `"PUBLIC_POLL" \| "PRIVATE_POLL_ANYONE_WITH_THE_LINK" \| "PRIVATE_POLL_INVITATION_ONLY"` | |
| `voterCountLimit` | `number \| null` | null = unlimited |
| `createdAt` | `Date` | |
| `startAt` | `Date \| null` | Schedule start. **Name unchanged** — see note below |
| `endAt` | `Date \| null` | Schedule end. **Name unchanged** |
| `invitedVoterList` | `string[]` | |
| `bannedVoterList` | `string[]` | |
| `currentVotes` | `VoteEntry[]` | |

> **Note on `startAt` / `endAt`.** The source requirements briefly named these `startDateTime` and
> `endDateTime` on the basis of a camelCase refactor. They are already camelCase, and the rename was
> withdrawn. This feature does **not** rename them, and no migration of the schedule fields is
> required.

### Field changed

| Field | Was | Becomes |
|---|---|---|
| `pollState` | `"ACTIVE-POLL-STATE" \| "CLOSED-POLL-STATE" \| "ARCHIVED-POLL-STATE"` stored, with `"PENDING-POLL-STATE"` derived on read | One of the eight states below, **always stored, never derived** |

The derived-state distinction disappears. `deriveState()` — which computed pending/active from the
schedule on every read — is replaced by `evaluateSchedule()`, which the schedule sweep uses to
*write* the state. Readers read the field.

### Fields added

| Field | Type | Lifecycle |
|---|---|---|
| `pollStateBeforeEditUpdate` | `PollState \| null` | Set when an editing session begins; cleared on clean exit, on stale recovery, and on publish |
| `pollEditUpdateHeartbeatTimestamp` | `Date \| null` | Set on session start, refreshed by each heartbeat; cleared wherever the session ends |
| `pollEditUpdateClientGUID` | `string \| null` | The owning tab's identifier; cleared wherever the session ends |
| `pollApprovalTimestamp` | `Date \| null` | The screening claim. Set atomically when a claim is taken; cleared when the call concludes, times out, or is recovered |
| `pollAcceptabilityScreeningAttempts` | `number` | Incremented in the same write that takes the claim. Reset to 0 on publish, on any completed screening call, and on manual re-screen |
| `pollRejectionReason` | `string \| null` | Human-readable. Set on content rejection, on timeout, and on exhausted attempts; cleared on publish, on approval, and on manual re-screen |

### Fields removed

| Field | Was for | Why it goes |
|---|---|---|
| `Choice.removed` | Marking a choice as withdrawn so existing votes for it stayed meaningful | Choices are immutable once a poll has ever been voted on, so a choice can never be withdrawn while votes reference it |
| `VoteEntry.removed` | Marking a vote as withdrawn rather than deleting it | Removed votes and banned voters' votes are now deleted outright; `voteHistory` retains the audit trail |

Removing these also removes: the reconciliation that marked votes removed when choices changed, the
`!c.removed` filtering in results computation and duplication, and the "previously removed choices
survive a save" carry-over.

---

## Vote entry

| Field | Type | Change |
|---|---|---|
| `emailAddress` | `string` | unchanged |
| `userName` | `string` | unchanged |
| `choiceIds` | `string[]` | unchanged |
| `votedAt` | `Date \| null` | unchanged |
| ~~`removed`~~ | ~~`boolean`~~ | **removed** — deletion is now literal |

`voteHistory` entries are unchanged: `{ pid, emailAddress, userName, choiceIds, votedAt }`.

---

## The eight states

| State | Public? | Votable? | Full edit? | Update? | Delete? |
|---|---|---|---|---|---|
| `INITIALIZED` | no | no | yes | no | **yes** |
| `EDITING` | no | no | no (locked) | no (locked) | no |
| `AWAITING APPROVAL` | no | no | no | no | no |
| `REJECTED` | no | no | yes¹ | yes¹ | **yes** |
| `WAITING TO OPEN` | yes | no | yes¹ | yes¹ | no |
| `OPEN` | yes | **yes** | yes¹ | yes¹ | no |
| `CLOSED` | yes | no | yes¹ | yes¹ | no |
| `ARCHIVED` | no² | no | no | no | **yes** |

¹ Which of full-edit or update is offered depends on whether the poll has ever been voted on — never
on the state alone. The state only decides whether *either* is offered.
² Visible to administrators; withheld from the public.

Values are stored and displayed verbatim, in these exact capitalised forms (FR-005). Mapping them to
friendlier wording is a later feature.

---

## Transitions

```text
                    ┌───────────────────────────────────────────┐
                    │                                           │
   (create)         ▼                                           │
      └──────► INITIALIZED ──publish (non-default)──┐            │
                    ▲                               │            │
                    │ publish (all defaults)        ▼            │
                    └──────────────────────  AWAITING APPROVAL   │
                                                    │            │
                        ┌───────────────────────────┼────────┐   │
                        │ screening objects         │        │   │
                        ▼                  schedule │        │   │
                    REJECTED ◄──attempts exhausted──┤        │   │
                        │                           │        │   │
                        │ re-screen                 │        │   │
                        └───────────────────────────┘        │   │
                                                             │   │
                            ┌────────────────────────────────┘   │
                            ▼                                    │
              WAITING TO OPEN ◄──► OPEN ◄──► CLOSED              │
                                              │                  │
                                              │ archive          │
                                              ▼                  │
                                          ARCHIVED  (terminal)   │
                                                                 │
   any of INITIALIZED / REJECTED / WAITING TO OPEN / OPEN /       │
   CLOSED ──begin editing session──► EDITING ──end session───────┘
                                    (returns to the stashed state)
```

**Transition rules**

| From | To | Trigger | Guard |
|---|---|---|---|
| — | `INITIALIZED` | poll created | — |
| any (incl. `ARCHIVED`) | `INITIALIZED` | poll duplicated | the **copy** starts here so it cannot reach the public unscreened; the source is unchanged |
| `INITIALIZED` | `INITIALIZED` | publish | every field still default, or all choices still default |
| any editable | `AWAITING APPROVAL` | publish | not all defaults |
| `AWAITING APPROVAL` | `REJECTED` | screening returns an objection | — |
| `AWAITING APPROVAL` | `REJECTED` | claim attempted | attempts ≥ maximum |
| `AWAITING APPROVAL` | `AWAITING APPROVAL` | call times out or fails | claim released for retry |
| `AWAITING APPROVAL` | `WAITING TO OPEN` / `OPEN` / `CLOSED` | screening returns empty | per schedule evaluation |
| `REJECTED` | `AWAITING APPROVAL` | administrator re-screens | attempts and reason reset |
| `WAITING TO OPEN` ⇄ `OPEN` ⇄ `CLOSED` | | schedule sweep | per schedule evaluation |
| `CLOSED` | `ARCHIVED` | administrator archives | only from `CLOSED` |
| `ARCHIVED` | — | — | **terminal; every transition refused** |
| editable | `EDITING` | session begins | never voted → full edit; voted → update; and not already `EDITING` / `AWAITING APPROVAL` / `ARCHIVED` |
| `EDITING` | stashed state | clean exit or stale recovery | restores `pollStateBeforeEditUpdate` |

### Schedule evaluation

Given a poll and a current time, with both bounds inclusive:

- start absent → treated as already started
- end absent → never closes
- now < start → `WAITING TO OPEN`
- start ≤ now ≤ end (or end absent) → `OPEN`
- now > end → `CLOSED`
- start > end → correct start to one second before end, then `CLOSED` (fail-safe; the editing
  surfaces prevent this being set)

---

## Field lifecycle: every setter has a clearing path

This table is the invariant the source document was verified against — no field can be left set by a
path that has no corresponding clear.

| Field | Set by | Cleared by |
|---|---|---|
| `pollStateBeforeEditUpdate` | session start | clean exit · stale recovery · publish |
| `pollEditUpdateHeartbeatTimestamp` | session start, each heartbeat | clean exit · stale recovery · publish · re-screen |
| `pollEditUpdateClientGUID` | session start | clean exit · stale recovery · publish · re-screen |
| `pollApprovalTimestamp` | claim taken | call concludes (either verdict) · timeout · crashed-claim recovery · publish · re-screen |
| `pollAcceptabilityScreeningAttempts` | claim taken (increment) | publish (0) · any completed call (0) · re-screen (0) |
| `pollRejectionReason` | content rejection · timeout · attempts exhausted | publish · approval · re-screen |

**The attempt counter is incremented when the claim is taken, not when the call fails.** This is
what makes the retry budget terminate for a process that dies mid-call: the attempt is already
counted, so a repeatedly-crashing process still reaches the maximum and the poll is rejected rather
than cycling invisibly forever. A call that *completes* — with any verdict — resets the counter,
because it succeeded whatever it decided.

---

## Background processes

Three recurring processes, each exported as a single-tick function with timer scheduling kept
separate so tests call one tick directly (research R2). Each skips its tick while its previous tick
is still running, and each wraps its body so a failure logs and the next tick still runs.

### `staleEditUpdateSweep` — every `ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL` × 2

**Finds**: `pollState` = `EDITING` **AND** `pollEditUpdateHeartbeatTimestamp` <
(now − `ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL` × 2)

**Does**: restores `pollStateBeforeEditUpdate`, then clears `pollStateBeforeEditUpdate`,
`pollEditUpdateHeartbeatTimestamp` and `pollEditUpdateClientGUID`.

Worst case from a client vanishing to the lock being free is twice the heartbeat interval plus one
sweep interval — 40s at the defaults (FR-022, SC-005).

### `pollsAwaitingApprovalSweep` — every `ENV_POLL_APPROVAL_POLLING_INTERVAL`

Handles **one poll per tick**, choosing it with two queries **in this order**. Only one query yields
a poll per tick; if the first returns nothing, the second runs.

**Query 1 — recover a crashed claim.** `pollState` = `AWAITING APPROVAL` **AND**
`pollApprovalTimestamp` IS set **AND** `pollApprovalTimestamp` < (now − `ENV_API_CALL_TIMEOUT` × 2).
Ordered by **oldest `pollApprovalTimestamp`**.

Clears `pollApprovalTimestamp` (releasing the claim for a later tick), leaves `pollState` at
`AWAITING APPROVAL`, sets `pollRejectionReason` to the timed-out message, and **does not increment**
the attempt count — it was already counted when the claim was taken.

**Query 2 — screen a poll not yet claimed.** `pollState` = `AWAITING APPROVAL` **AND**
`pollApprovalTimestamp` is NOT set. Ordered by **oldest `startAt`, nulls first** (research R5).

Then, for the selected poll:

- attempts ≥ `ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS` → set `REJECTED`, set the exhausted-attempts
  reason, make **no** screening call, stop (FR-039)
- otherwise → atomically set `pollApprovalTimestamp` and increment the attempt count in one write
  (research R3), then call screening bounded by `ENV_API_CALL_TIMEOUT`:
  - **returns non-empty** → `REJECTED`, reason = the returned text, clear the timestamp, reset
    attempts to 0
  - **returns empty** → clear reason, clear timestamp, reset attempts to 0, then evaluate the
    schedule and write `WAITING TO OPEN` / `OPEN` / `CLOSED`
  - **times out or throws** → stay `AWAITING APPROVAL`, clear the timestamp, set the timed-out
    reason, **do not** increment (already counted)

**Why query 1 runs first.** A crashed claim blocks its poll from query 2 forever — query 2 filters on
the timestamp being unset, and a crashed process left it set. Recovering first means a poll can never
be starved by its own abandoned claim. It also bounds the queue: at most one poll is in the
crashed state per tick, so recovery never delays fresh screening by more than one cycle.

### `pollDateCheckSweep` — every `ENV_POLL_DATE_CHECK_POLLING_INTERVAL`

**Finds**: every poll whose `pollState` is `WAITING TO OPEN`, `OPEN` or `CLOSED`.

**Does**: applies schedule evaluation and writes the resulting state. Also applies the inverted-dates
fail-safe: where `startAt` > `endAt`, sets `startAt` to one second before `endAt` and the state to
`CLOSED` (FR-046).

Unlike the approval sweep this one is not limited to a single poll per tick — it performs no external
call, so processing every candidate is a single indexed pass.

It is also what corrects a poll whose schedule expired while it was being edited: the restored
pre-edit state may be stale, and this sweep resolves it within one interval (FR-042).

---

## Indexes

| Collection | Index | Serves |
|---|---|---|
| `voteHistory` | `{ pid: 1 }` | *(exists)* "has this poll ever been voted on" |
| `polls` | `{ pollState: 1, pollApprovalTimestamp: 1 }` | both approval-queue queries — the crashed-claim query filters on the timestamp being old, the unscreened query on it being unset, and the first sorts by it |
| `polls` | `{ pollState: 1, startAt: 1 }` | the unscreened queue's ordering (null sorts first, which is the required order — research R5) and the schedule sweep's candidate query |
| `polls` | `{ pollState: 1, pollEditUpdateHeartbeatTimestamp: 1 }` | the stale-lock query |

No sweep performs a collection scan.

---

## Entities that are not stored

**Editing session** — has no document of its own. It is the triple
(`pollState` = `EDITING`, `pollEditUpdateClientGUID`, `pollEditUpdateHeartbeatTimestamp`) on the
poll. Modelling it separately would introduce a second source of truth and a cleanup problem;
keeping it on the poll means the lock and the thing being locked are updated in one atomic write.

**Screening attempt** — likewise has no document. It is
(`pollApprovalTimestamp`, `pollAcceptabilityScreeningAttempts`). The claim and the count are set in
the same atomic update, which is what makes it impossible to hold a claim without having counted an
attempt.
