# API Contracts: Poll Settings Change

No endpoint is added or removed. Three admin schemas change shape; every voter-facing schema is
unchanged except that the `pollVisibility` enum it never exposed the private variants of is now
two values. `postman/openapi.json` is the normative contract; this document lists exactly what
changes in it and what must not.

## Shared enumerations

| Name | Values |
|---|---|
| `pollVisibility` | `"Public Poll"`, `"Private Poll"` |
| `pollSharingMode` | `"Anyone With The Link"`, `"Invitation Only"` |
| `voteAnonymity` | `"Yes"`, `"No"` |

## Changed: `AdminPollSummary` — rows of `GET /api/admin/polls`

| Property | Type | Change |
|---|---|---|
| `pollVisibility` | enum, 2 values | enum narrowed |
| `pollSharingMode` | enum | **added**, required |
| `voteAnonymity` | enum | **added**, required |

Every other property is unchanged. The row is built by enumerating the poll's settings in
`GET /api/admin/polls`; the two new fields are listed there alongside `pollVisibility`.

## Changed: `AdminPollDetail` — `GET /api/admin/polls/{pid}`, and the `poll` in the responses of edit-session, publish, `PATCH /api/admin/polls/{pid}` and duplicate

| Property | Type | Change |
|---|---|---|
| `pollVisibility` | enum, 2 values | enum narrowed |
| `pollSharingMode` | enum | **added**, required |
| `voteAnonymity` | enum | **added**, required |

`buildAdminPollDetail` spreads the stored poll, so the two fields reach every response that uses
this schema once they exist on the document.

## Changed: `POST /api/admin/polls/{pid}/publish` — request body

The card saves settings through this route.

| Property | Type | Change |
|---|---|---|
| `pollVisibility` | enum, 2 values | enum narrowed |
| `pollSharingMode` | enum | **added**, optional — absent means unchanged |
| `voteAnonymity` | enum | **added**, optional — absent means unchanged |

### New refusals

| Condition | Status | Body |
|---|---|---|
| `pollSharingMode` or `voteAnonymity` present and the poll has ever been voted on — **on the publish route** | `400` | `{ "error": "This poll has votes; only title, subtitle, startAt, endAt, invitedVoterList, bannedVoterList, voterCountLimit may be changed." }` — the route's existing UPDATE-mode gate, reached before the validator, exactly as for `pollVisibility` |
| `pollSharingMode` present and the poll has ever been voted on — **in the validator**, on any path that bypasses that gate | `409` | `{ "error": "pollSharingMode cannot be changed after the poll has received a vote." }` |
| `voteAnonymity` present and the poll has ever been voted on — in the validator | `409` | `{ "error": "voteAnonymity cannot be changed after the poll has received a vote." }` |
| `pollSharingMode` present with a value outside its enum | `400` | `{ "error": "Invalid pollSharingMode." }` |
| `voteAnonymity` present with a value outside its enum | `400` | `{ "error": "Invalid voteAnonymity." }` |
| `pollVisibility` present with a value outside the **new** enum (including every old private phrase) | `400` | `{ "error": "Invalid pollVisibility." }` — existing rule, narrower range |

The two layers mirror `pollVisibility` exactly: the route gate answers first with the list of
fields an already-voted poll still allows, and the validator's own `409` guards every other path.
Either way the refusal leaves the poll untouched, and the card shows the message it receives.

## Unchanged in shape, changed in behaviour

| Endpoint | What changes |
|---|---|
| `GET /api/admin/polls/{pid}/participants` | `notYetVoted` is present exactly when the poll is private **and** `pollSharingMode` is `"Invitation Only"` (was: when the visibility string contained "Invitation Only") |
| `POST /api/admin/polls/{pid}/duplicate` | the duplicate carries the source's `pollSharingMode` and `voteAnonymity`; invited and banned lists are copied under the same private-and-Invitation-Only rule |
| `GET /api/polls` | the invited-visitor clause matches `pollVisibility = "Private Poll"` and `pollSharingMode = "Invitation Only"` |
| `GET /api/polls/{pid}`, `POST /api/polls/{pid}/vote` | eligibility refusals (`403 "You are not invited to this poll."`) fire under the same rule |
| `POST /api/admin/polls` | the new poll carries `pollSharingMode: "Anyone With The Link"`, `voteAnonymity: "Yes"` |

## Must not change: voter-facing schemas

`PollDetail` (used by `GET /api/polls` rows and `GET /api/polls/{pid}`) does **not** gain
`pollSharingMode` or `voteAnonymity`. The contract test asserts their absence from the public
schemas. Its `pollVisibility`, where present, follows the narrowed enum.

## Not read by anything

`voteAnonymity` is accepted, stored and echoed. No endpoint's behaviour depends on its value in
this feature; `GET /api/admin/polls/{pid}/results` and `…/participants` return identical bodies
for `"Yes"` and `"No"`, and a test asserts it.
