# Contract: JSON API

**Feature**: `011-SIMPLIFY-POLL-STATES` | **Date**: 2026-08-28

All `/api/admin/*` routes stay behind the existing `requireAdmin` gate. `postman/openapi.json` must
be updated to match this contract — it generates the docs and client SDKs.

## New endpoints

### `POST /api/admin/polls/:pid/edit-session`

Begins an editing or updating session and takes the lock.

**Request** `{ "clientGuid": "<uuid generated on page load>" }`

**Response 200** — session granted

```json
{ "granted": true, "mode": "EDIT" | "UPDATE", "poll": { ...poll... } }
```

`mode` is decided by the server from the vote history, not requested by the client: `EDIT` when the
poll has never been voted on, `UPDATE` when it has.

**Response 409** — refused

```json
{ "granted": false, "reason": "LOCKED" | "INELIGIBLE",
  "message": "This poll is currently being edited. Please try again shortly." }
```

The server re-checks every eligibility condition here and makes **no change** when refusing
(FR-019). A page must not assume its own pre-check was sufficient.

---

### `POST /api/admin/polls/:pid/edit-session/heartbeat`

**Request** `{ "clientGuid": "<same uuid>" }`

**Response 200** `{ "alive": true }` — timestamp refreshed.

**Response 409** `{ "alive": false }` — the identifier does not match, or the poll is no longer in
the editing state. The client must stop the heartbeat, show a message, and navigate back to the
poll list. It must **not** attempt to clear any field: only the lock's holder may release it
(FR-023).

---

### `DELETE /api/admin/polls/:pid/edit-session`

Ends a session cleanly, discarding unsaved changes and restoring the stashed state.

**Request** `{ "clientGuid": "<same uuid>" }`

**Response 200** `{ "released": true, "pollState": "<restored state>" }`

**Response 409** `{ "released": false }` when the identifier does not match — the caller no longer
owns the lock, most likely because stale recovery already released it.

---

### `POST /api/admin/polls/:pid/publish`

Saves the submitted fields and requests approval. Returns immediately; the outcome arrives later via
the sweep (FR-026).

**Request** — the editable fields for the session's mode. In `UPDATE` mode only `title`,
`subtitle`, `startAt` and `endAt` are accepted; any other field is rejected 400.

**Response 200 — accepted for approval**

```json
{ "pollState": "AWAITING APPROVAL", "pollApprovalTimestamp": null }
```

**Response 200 — held back as still-default** (FR-024, FR-025)

```json
{ "pollState": "INITIALIZED",
  "message": "This poll still has its default values and cannot be published." }
```

**Response 400** when `startAt` is later than `endAt` (FR-047).

On acceptance the server clears the rejection reason, the approval timestamp, all three session
fields, and resets the attempt count to 0.

---

### `POST /api/admin/polls/:pid/rescreen`

Offered only when a poll is `REJECTED` with attempts at or above the maximum (FR-040).

**Response 200** `{ "pollState": "AWAITING APPROVAL" }` — attempts reset to 0, rejection reason and
approval timestamp cleared.

**Response 409** when the poll is not in that condition.

## Changed endpoints

### `GET /api/admin/polls`

Each row gains the fields the list needs to render state, waiting time, the rejection reason column
and the correct action menu:

```json
{ "pollState": "AWAITING APPROVAL",
  "pollApprovalTimestamp": "2026-08-28T16:04:00.000Z",
  "pollRejectionReason": null,
  "pollAcceptabilityScreeningAttempts": 0,
  "hasEverBeenVotedOn": true,
  "canEdit": false, "canUpdate": false, "canDelete": false, "canRescreen": false,
  "canArchive": false }
```

The five `can*` booleans are computed server-side from the state, the vote history and the attempt
count. `canArchive` is true only from `CLOSED`. The client renders the menu from them rather than re-deriving the rules — one authority for
FR-052 through FR-054.

### `GET /api/admin/polls/:pid`

Same additional fields as a list row.

### `PATCH /api/admin/polls/:pid`

**Autosave is removed** (FR-012). This endpoint no longer accepts content or schedule fields. It
retains only the explicit administrator state actions:

- `{ "pollState": "ARCHIVED" }` — permitted only from `CLOSED` (FR-049)
- `{ "pollState": "CLOSED" }` — an explicit early close

Every other state value is rejected 400. Any attempt to change an `ARCHIVED` poll is rejected 409
(FR-050).

### `PUT /api/admin/polls/:pid/choices`

Now permitted only within an `EDIT`-mode session — that is, only for a poll that has never been
voted on. Rejected 409 otherwise. The submitted list replaces the stored list wholesale, and no
record of prior choices is retained (FR-010).

### `DELETE /api/admin/polls/:pid`

Permitted only when the poll is `INITIALIZED`, `REJECTED` or `ARCHIVED` (FR-053). Rejected 409
otherwise — notably, a poll that has ever been voted on and is not archived can never be deleted
(SC-012).

### `POST /api/polls/:pid/vote`

Accepted only when the stored `pollState` is exactly `OPEN` (FR-004). This replaces the previous
check against the derived active state, and it is refused regardless of how the voter reached the
poll — an already-open page or a direct link included.

**Response 409** `{ "error": "This poll is not open for voting." }`

### `DELETE /api/admin/polls/:pid/participants/:emailAddress` and `.../banned/:emailAddress`

Votes are now **deleted** rather than marked (FR-055). The `voteHistory` entries remain, so the poll
stays permanently on the update surface afterwards (FR-007).

### `POST /api/admin/polls/:pid/duplicate`

**The duplicate starts `INITIALIZED`** — not in the source poll's state, and not public.

This is the one endpoint where getting the state wrong would defeat the feature: a duplicate carries
the source poll's title, subtitle and choices, so if it inherited an approved state it would reach
the public having never been screened. Starting `INITIALIZED` puts it back at the beginning of the
lifecycle, where it must be published and screened like any other poll.

The copy carries over the source's configuration and choices with fresh identifiers, and takes no
votes, no schedule, and none of the bookkeeping fields — no rejection reason, no approval timestamp,
no attempt count, no session fields. Because it has no votes, it is a full-edit poll.

**Response 200** `{ "pid": "<new pid>", "pollState": "INITIALIZED" }`

Permitted from any source state, including `ARCHIVED` — duplicating an archived poll is a normal way
to re-run it, and does not mutate the archived original.

---

### `PUT /api/admin/polls/:pid/invited`

Unchanged in shape. Now refused 409 when the poll is `EDITING`, `AWAITING APPROVAL` or `ARCHIVED`,
matching the other content-changing endpoints — the invited list is poll configuration, and it must
not change while a poll is locked, being screened, or archived.

---

### `GET /api/admin/polls/:pid/results`, `GET .../export.json`, `GET .../export.md`

Shape unchanged, with one simplification: they no longer filter out `removed` choices or `removed`
votes, because neither marker exists. Every stored choice is a live choice and every stored vote is a
live vote, so these read what is there.

Permitted in every state, archived included — retaining results for inspection is the reason
`ARCHIVED` exists (FR-051).

---

### Every response carrying a poll

`Choice` objects no longer carry `removed`; `VoteEntry` objects no longer carry `removed`.
`pollState` is one of the eight new values, stored not derived.
