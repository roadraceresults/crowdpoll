# HTTP Contracts: Editing an Open Poll Without Interrupting Voting

All routes are existing ones behind `requireOwnPoll` unless noted. `postman/openapi.json` must be updated for every change here (A7).

## A1. POST /api/admin/polls/:pid/edit-session

- The grant response gains `choiceCounts`: an object mapping each current choice id to its vote count, read from the live counters at the moment the session is taken. Example: `{ "granted": true, "mode": "UPDATE", "poll": { … }, "choiceCounts": { "c1-uuid": 12, "c2-uuid": 0 } }`.
- New refusal: a poll whose `pending_update` is set answers `409 { granted: false, reason: "PENDING_REVIEW", message: "Changes are being reviewed. Try again shortly." }` (same shape as today's `LOCKED`/`INELIGIBLE` refusals).
- Heartbeat and DELETE (release) are unchanged.

## A2. POST /api/admin/polls/:pid/publish — UPDATE mode (ever-voted poll)

- `UPDATE_FIELDS` grows to: `title`, `subtitle`, `startAt`, `endAt`, `invitedVoterList`, `bannedVoterList`, `voterCountLimit`, `colors`, `lineGraphEnabled`, **`labels`, `choiceMode`, `voteMutability`, `pollSharingMode`**. Any other field still gets `400`.
- Field validation (`validatePollFields`) on an ever-voted poll:
  - `pollSharingMode`: accepted on a Private poll, both directions; still refused on a Public poll (sharing mode is a private-poll setting).
  - `choiceMode`: `Single-Choice Poll → Multiple-Choice Poll` accepted; `Multiple-Choice Poll → Single-Choice Poll` refused `409`.
  - `voteMutability`: accepted both directions.
  - `pollVisibility`, `voteAnonymity`, `keywords`: still refused `409` (unchanged freezes).
- `labels` (with aligned `colors`) go through the new merge-by-label rules: min/max count, 100-char cap, unique trimmed labels — same errors and statuses as today's `replaceChoices` (`400`/`409`); a result below `ENV_MIN_CHOICES` is refused `400`.
- **Behaviour split** when the effective state is not `INITIALIZED`:
  - Fields other than `title`/`subtitle`/`labels` are applied in the save transaction. The poll's `pollState` is **not** changed — no `AWAITING APPROVAL`, the poll never unlists, votes are never refused.
  - A changed `title`, `subtitle` or choice list is stored as the poll's `pending_update` (complete new choice list, additions' ids minted now) and takes effect when the approval sweep approves it.
  - Response: `200` with the merged admin poll detail plus `pending: true|false` (whether anything went to review). The edit session is cleared as today.
- Refusal: `pending_update` already set → `409 { error: "Changes are already being reviewed. Try again shortly.", code: "PENDING_REVIEW" }`.
- A never-voted poll (EDIT mode) keeps today's behaviour unchanged, including `AWAITING APPROVAL`.

## A3. Approval sweep (no route; behaviour contract)

- The claim covers two disjoint pools: `poll_state = 'AWAITING APPROVAL'` (today's) and `pending_update IS NOT NULL`, both with a null claim timestamp; claim/attempt/timeout/exhaustion mechanics are today's, reused.
- For a pending update, screening reads the poll's content **as it would be after the update** (pending title/subtitle overlaid, pending choice labels).
- Approved: the pending fields are applied in one transaction — choices written by id (survivors keep id/label/position), each deleted id removed from every `votes.choice_ids` of the poll, `rebuildLineGraphTally` in the same transaction, `pending_update` and `pending_rejection_reason` cleared; after commit, counters reconciled and the affected voters' tab versions forgotten. `pollState` is never written: `launched_at` is not re-stamped, and a poll that closed meanwhile stays closed while still receiving the content.
- Rejected: `pending_update` cleared, `pending_rejection_reason` set to the verdict; nothing else changes.

## A4. POST /api/polls/:pid/vote

- No contract change to the route. Behaviour change via the projection: while a poll is `EDITING`, the projection publishes the stashed state, so a poll stashed from `OPEN` accepts votes exactly as an OPEN poll (no `409 POLL_EDITING`). A vote naming a choice id that an applied deletion removed is refused `400` on the existing unknown-id path, with the message "That choice is no longer available — please choose again." (reworded by T035; the empty-selection message is unchanged), and the voter may vote again.
- `POLL_EDITING` remains documented for the direct validation path but is no longer reachable for an open poll through the normal flow.

## A5. GET /api/admin/polls (admin list rows)

- Each row gains `pendingUpdate: boolean` and `pendingRejectionReason: string | null`.
- `capabilitiesFor` reflects A1: `canEdit`/`canUpdate` are false while a pending update exists.

## A6. POST /api/admin/polls/:pid/colors

- Unchanged. (Colours-only saves of a voted poll keep their no-review fast path.)

## A7. postman/openapi.json

- Updated for: the edit-session grant's `choiceCounts` and `PENDING_REVIEW` refusal; `/publish`'s widened UPDATE fields, `pending` response field and `PENDING_REVIEW` 409; the admin list row's two new fields; the narrowed reachability of `POLL_EDITING`.
