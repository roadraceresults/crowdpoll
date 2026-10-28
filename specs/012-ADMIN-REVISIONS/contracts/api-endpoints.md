# API Contract Delta: Admin Revisions

**Feature**: 012-ADMIN-REVISIONS | **Plan**: [../plan.md](../plan.md)

Only routes that change are listed. Everything else in `postman/openapi.json` is unaffected.
`openapi-contract.test.ts` enforces that this document and the implementation stay in step, so
every change here lands in `openapi.json` in the same commit (FR-054).

---

## 1. Removed

### `PUT /api/admin/polls/:pid/choices` — **deleted**

Returns 404 after this feature. Its lock check and its `replaceChoices` call move into the publish
handler ([research R3](../research.md#r3--folding-the-choices-save-into-publish)).

---

## 2. Admin routes

### `POST /api/admin/polls/:pid/publish`

**Request** gains one optional field and swaps two:

```jsonc
{
  "clientGuid": "…",
  "title": "…",
  "subtitle": "…",
  "startAt": "2026-09-10T09:00:00.000Z",
  "endAt": null,
  "choiceMode": "SINGLE-CHOICE-POLL",
  "voteMutability": "FINAL-VOTE-POLL",
  "pollVisibility": "PRIVATE POLL - INVITATION ONLY - DO NOT SHOW WHO VOTED",
  "voterCountLimit": null,
  "labels": ["Choice one", "Choice two"]     // NEW — EDIT mode only
}
```

- `pollVisibility` replaces `accessMode` and `resultsVisibility`, which are no longer accepted.
- `labels` replaces the deleted choices route. Present ⇒ the choice list is replaced in the same
  write as the rest of the poll.

**Responses**

| Status | When |
|---|---|
| 200 | Saved. Poll moves to `AWAITING APPROVAL`, or stays `INITIALIZED` with a message if all values are still defaults. |
| 400 | Invalid field value; or in `UPDATE` mode, any field outside `title`, `subtitle`, `startAt`, `endAt` — **`labels` now among them**. |
| 409 | The caller does not hold the editing lock, or the poll is not in an editable state. |

A rejected publish writes nothing at all, choices included (FR-013).

---

### `PATCH /api/admin/polls/:pid`

**Request**: `{ "pollState": "OPEN" | "CLOSED" | "ARCHIVED" }` — `OPEN` is new.

**Schedule side effects**, replacing the blanket `endAt = now`:

| `pollState` | Allowed from | Also writes |
|---|---|---|
| `OPEN` | `WAITING TO OPEN`, `CLOSED` | `startAt := null`; `endAt := null` **iff** `endAt < now` |
| `CLOSED` | `WAITING TO OPEN`, `OPEN` | `endAt := now`; `startAt := null` **iff** `startAt > now` |
| `ARCHIVED` | `CLOSED` | *nothing* — schedule preserved |

| Status | When |
|---|---|
| 200 | Transition applied. Body is the updated admin poll detail. |
| 400 | `pollState` absent or not one of the three; any other field present. |
| 409 | Transition not available from the poll's current state. Poll unchanged. |

---

### `GET /api/admin/polls`

Each row gains two booleans and swaps the visibility fields:

```jsonc
{
  "pid": "…", "title": "…", "subtitle": "…",
  "pollState": "CLOSED",
  "pollVisibility": "PUBLIC POLL",        // replaces accessMode + resultsVisibility
  "createdAt": "…", "startAt": null, "endAt": "…",
  "pollRejectionReason": null,
  "pollApprovalTimestamp": null,
  "pollAcceptabilityScreeningAttempts": 0,
  "hasEverBeenVotedOn": true,
  "canEdit": false, "canUpdate": false,
  "canOpen": true,                         // NEW
  "canClose": false,                       // NEW
  "canArchive": true, "canDelete": false, "canRescreen": false
}
```

All seven booleans come from one `capabilitiesFor()` call
([data-model §5](../data-model.md#5-row-capability-set)). The client renders enablement from them
and derives no state rule of its own (FR-030, FR-031).

---

### Participant routes — all three lock-aware

| Route | Change |
|---|---|
| `POST /api/admin/polls/:pid/invited` | Accepts `clientGuid` in the body |
| `DELETE /api/admin/polls/:pid/participants/:emailAddress` | Accepts `clientGuid` in a JSON body |
| `DELETE /api/admin/polls/:pid/banned/:emailAddress` | Accepts `clientGuid` in a JSON body |

All three replace `refuseWhenNotConfigurable` with `resolveEditContext(poll, clientGuid,
hasEverVoted)` and **accept both `EDIT` and `UPDATE` modes** — moderating a poll that already has
votes is the main reason the feature exists (FR-019).

`clientGuid` travels in the body on all three, including the two `DELETE`s, for one shape across
every lock-aware call (spec assumption; [research R3](../research.md#r3--folding-the-choices-save-into-publish)
neighbours).

| Status | When |
|---|---|
| 201 / 204 | Applied. |
| 400 | Invalid email address (invite only). |
| 409 | Another page session holds the lock; or the poll is `AWAITING APPROVAL` or `ARCHIVED`; or the address is already invited. |

**Semantics unchanged but now stated** (FR-017a): banning removes the address from the participant
list, the invited list and the counted results. Lifting a ban removes it from the banned list
only — it restores neither the invitation nor the deleted vote.

---

### `GET /api/admin/polls/:pid/results`

`notYetVoted` is included when the poll's visibility is one of the two invitation-only values,
replacing the former `accessMode` check. The disclosure suffix does not affect this.

---

## 3. Public routes

### `GET /api/polls`

Three changes:

1. **Filter** — public visibility, plus polls under edit that were public before the edit began:

   ```jsonc
   { "$or": [
       { "pollState": { "$in": ["WAITING TO OPEN", "OPEN", "CLOSED"] } },
       { "pollState": "EDITING",
         "pollStateBeforeEditUpdate": { "$in": ["WAITING TO OPEN", "OPEN", "CLOSED"] } }
   ]}
   ```
   …intersected with `pollVisibility === "PUBLIC POLL"`.

2. **Session resolved** — each entry now carries `myChoiceIds` for a signed-in caller, so the grid
   can feed its cards from this one response instead of one fetch per card
   ([research R8](../research.md#r8--grid-membership-polling-without-an-n--1)). Unchanged for
   signed-out visitors.

3. **`pollStateBeforeEditUpdate` is never emitted** — it is a filter input only (FR-047).

### `GET /api/polls/:pid`

Same `EDITING` admission, so the standalone `?PID=` view shows the unavailable message rather than
404. The requirements name this route `/api/polls/:pollId`; the implemented parameter is `:pid` and
does not change.

### `POST /api/polls/:pid/vote`

**New refusal**, checked *before* the generic not-open branch:

```jsonc
// 409
{ "error": "This poll is momentarily unavailable to cast a vote. Please try again shortly.",
  "code": "POLL_EDITING" }
```

`code` is the discriminator the card branches on — it must never match on the message text
([research R7](../research.md#r7--how-the-card-learns-to-show-the-unavailable-message)).

**Voter-limit enforcement widens** from `PRIVATE_POLL_ANYONE_WITH_THE_LINK` alone to every
non-public visibility, with a blank limit resolving to 500
([data-model §2](../data-model.md#2-validation-rules)).

---

## 4. Profile route

### `GET /api/me`

```jsonc
{ "userName": "…", "emailAddress": "…", "profileAvatar": "…", "status": "…",
  "isAdmin": true }        // NEW
```

Produced by `isAdminEmail(email, config)` — the same predicate `createRequireAdmin` uses
([research R10](../research.md#r10--one-admin-predicate-two-callers)). Case-insensitive against the
trimmed allow-list. Still 401 for guests, so the flag is simply absent.

**A rendering hint, never an authorization decision.** Every admin API and page route keeps its own
server-side gate (FR-053).
