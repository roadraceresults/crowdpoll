# Data Model: Admin Revisions

**Feature**: 012-ADMIN-REVISIONS | **Date**: 2026-09-03 | **Plan**: [plan.md](./plan.md)

Only the `Poll` document changes, and the change is a collapse rather than a growth: two fields
out, one in. `VoteHistoryEntry` is untouched, no index changes, and no migration
([research R13](./research.md#r13--migration-or-the-absence-of-one)).

---

## 1. `Poll` field delta

| Field | Change | Type after | Notes |
|---|---|---|---|
| `accessMode` | **removed** | — | Folded into `pollVisibility`. 25 references in `service.ts`, plus 8 test files. |
| `resultsVisibility` | **removed** | — | Folded into the `SHOW / DO NOT SHOW WHO VOTED` suffix. Drives nothing today except the auto-switch that goes with it. |
| `pollVisibility` | **added** | `PollVisibility` | One of five literals, stored verbatim. Default `"PUBLIC POLL"`. Frozen once the poll has ever been voted on. |
| `voterCountLimit` | semantics | `number \| null` | Shape unchanged. `null` now means *500* on a private poll and *not applicable* on a public one. Never auto-filled. |
| `choices` | write path | unchanged | Written by `POST …/publish` instead of the deleted `PUT …/choices`. Still immutable once voted on. |
| `startAt`, `endAt` | write path | unchanged | Now also written by `PATCH …/:pid` under the three per-transition rules in §4. |
| everything else | — | unchanged | `pollState`, `title`, `subtitle`, `invitedVoterList`, `bannedVoterList`, `currentVotes`, the editing-session trio, the screening trio. |

### `PollVisibility`

```ts
export const POLL_VISIBILITIES = [
  "PUBLIC POLL",
  "PRIVATE POLL - ANYONE WITH THE LINK - DO NOT SHOW WHO VOTED",
  "PRIVATE POLL - ANYONE WITH THE LINK - SHOW WHO VOTED",
  "PRIVATE POLL - INVITATION ONLY - DO NOT SHOW WHO VOTED",
  "PRIVATE POLL - INVITATION ONLY - SHOW WHO VOTED"
] as const;

export type PollVisibility = (typeof POLL_VISIBILITIES)[number];

export const isPublicVisibility   = (v: PollVisibility) => v === "PUBLIC POLL";
export const isInvitationOnly     = (v: PollVisibility) => v.includes("INVITATION ONLY");
```

The strings carry spaces and hyphens because they are simultaneously the stored value and the
displayed label (FR-002). `pollState` sets the precedent — it already stores `"WAITING TO OPEN"`
verbatim. See [research R1](./research.md#r1--representing-the-five-visibility-values).

### Who reads the new field

| Consumer | Reads it as |
|---|---|
| `GET /api/polls` filter | `isPublicVisibility` |
| Vote-time voter-limit check | `!isPublicVisibility` |
| Vote-time invitation check | `isInvitationOnly` |
| Admin results `notYetVoted` list | `isInvitationOnly` |
| Editing page: invite row visibility | `isInvitationOnly` |
| Editing page: voter-limit field enablement | `isPublicVisibility` |

No consumer switches on a specific literal. The two predicates are the whole interface.

### The disclosure suffix is inert

`SHOW WHO VOTED` and `DO NOT SHOW WHO VOTED` are stored and displayed but drive no behaviour in
this feature (spec assumption). The admin results page's `notYetVoted` list continues to be gated
on invitation-only, not on the suffix.

---

## 2. Validation rules

Applied in `validatePollFields` (publish path) unless noted.

| Rule | Detail | Req |
|---|---|---|
| Visibility membership | Must be one of `POLL_VISIBILITIES`; anything else is a 400. | FR-001 |
| Visibility frozen | Rejected with 409 if the poll has ever been voted on. Same rule for `choiceMode` and `voteMutability`. | FR-004 |
| No side effects | No field is written as a consequence of another being set. The former access/visibility auto-switch is deleted. | FR-003 |
| Limit range | If not `null`, must be an integer `1 ≤ n ≤ 500`. Enforced in the browser and again here; here is authoritative. | FR-009 |
| Limit on public | Forced to `null` whenever the effective visibility is public, clearing any stored value. | FR-006 |
| No auto-fill | A public→private change leaves the limit `null`. The existing auto-fill of 500 is deleted. | FR-007 |
| Choices immutable | `labels` accepted only in `EDIT` mode; rejected in `UPDATE` mode alongside the other disallowed fields. | FR-014 |
| Participant lists retained | A visibility change never clears `invitedVoterList` or `bannedVoterList`. | FR-023 |

### Effective voter limit

Not stored — derived wherever a vote is admitted:

```ts
const effectiveLimit = isPublicVisibility(poll.pollVisibility)
  ? null                                                   // unlimited
  : poll.voterCountLimit ?? PRIVATE_VOTER_LIMIT_DEFAULT;   // 500
```

`PRIVATE_VOTER_LIMIT_DEFAULT = 500` is one constant serving as both the blank-field default and
the accepted maximum. Counted against distinct participants who have actually voted, which is the
existing rule. See [research R5](./research.md#r5--blank-voter-count-limit-means-500-on-private-polls).

---

## 3. Invariants

1. No document carries `accessMode` or `resultsVisibility`; no code path reads them. Checkable by
   grep, because no document survives the deploy.
2. `pollVisibility`, `choiceMode` and `voteMutability` are immutable once `voteHistory` has ever
   held a row for the poll.
3. `voterCountLimit` is `null` whenever `pollVisibility` is `"PUBLIC POLL"`.
4. A non-null `voterCountLimit` is an integer in 1…500, and **no private poll ever admits a 501st
   voter by any path** — including one whose limit is blank.
5. `invitedVoterList` is effective only for the two invitation-only values, but is retained
   through every visibility change.
6. Lifting a ban removes the address from `bannedVoterList` only — it restores neither the
   invitation nor the deleted vote.
7. No poll is ever written with a state the schedule sweep would immediately contradict (§4).
8. `pollStateBeforeEditUpdate` never appears in a voter-facing response.

---

## 4. State transitions

The eight states and the automatic transitions are unchanged from 011. This feature adds three
administrator-driven edges and changes what archiving writes.

### Manual transitions

| Target | Allowed from | Writes | Refusal |
|---|---|---|---|
| `OPEN` | `WAITING TO OPEN`, `CLOSED` | `startAt := null`; `endAt := null` **iff** `endAt < now` | 409 from any other state |
| `CLOSED` | `WAITING TO OPEN`, `OPEN` | `endAt := now`; `startAt := null` **iff** `startAt > now` | 409 from any other state |
| `ARCHIVED` | `CLOSED` | `pollState` only — schedule untouched | 409 from any other state |

`ARCHIVED` no longer stamps `endAt = now`. That blanket rule currently rewrites a poll's real
closing date and corrupts the JSON and Markdown exports that carry it.

### Convergence

The date sweep re-derives state from the schedule every
`ENV_POLL_DATE_CHECK_POLLING_INTERVAL` and writes the result, so each transition is chosen to make
`evaluateSchedule` agree:

- **OPEN** — no `startAt` ⇒ not `WAITING TO OPEN`; no past `endAt` ⇒ not `CLOSED`. ⇒ `OPEN` ✓
- **CLOSED** — `endAt` is past at the next tick; no pending future start. ⇒ `CLOSED` ✓
- **ARCHIVED** — outside the sweep's candidate filter entirely. ⇒ not a candidate ✓

No override flag exists anywhere in the model. See
[research R4](./research.md#r4--manual-state-transitions-and-sweep-convergence).

---

## 5. Row capability set

Computed by one function and consumed only for rendering. `canOpen` and `canClose` are new; the
other five exist today and move into the shared function unchanged.

```ts
capabilitiesFor(poll, hasEverBeenVotedOn) → {
  canEdit, canUpdate, canOpen, canClose, canArchive, canDelete, canRescreen
}
```

| Capability | True when |
|---|---|
| `canEdit` | `editModeFor` yields `EDIT` — not `EDITING`/`AWAITING APPROVAL`/`ARCHIVED`, never voted on |
| `canUpdate` | as above, but the poll has been voted on |
| `canOpen` | `pollState ∈ { WAITING TO OPEN, CLOSED }` |
| `canClose` | `pollState ∈ { WAITING TO OPEN, OPEN }` |
| `canArchive` | `pollState === CLOSED` |
| `canDelete` | `pollState ∈ { INITIALIZED, REJECTED, ARCHIVED }` |
| `canRescreen` | `pollState === REJECTED` **and** attempts ≥ `ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS` |

`WAITING TO OPEN` satisfies both `canOpen` and `canClose` — an administrator may start a scheduled
poll early or abandon it before it starts. `EDITING`, `AWAITING APPROVAL`, `INITIALIZED`,
`REJECTED` and `ARCHIVED` satisfy none of the three state buttons, so those rows show three greyed
controls — which is also what keeps the columns aligned, since every button is always rendered.

The same from-state rules back `validateStateAction`'s refusals, so a button's enablement and the
route's acceptance are provably the same predicate (FR-030).

---

## 6. Entities that are not documents

| Entity | Where it lives | Changed by 012 |
|---|---|---|
| **Editing session** | `pollStateBeforeEditUpdate`, `pollEditUpdateHeartbeatTimestamp`, `pollEditUpdateClientGUID` on the poll | Unchanged in shape. Newly consulted by the three participant routes and, as a filter only, by the two public listings. |
| **Row capability set** | Computed per request, never stored | New — see §5. |
| **Administrator indication** | Computed per request on `GET /api/me` | New. A rendering hint; never an authorization decision. |
| **Effective voter limit** | Derived at vote time | New — see §2. |
