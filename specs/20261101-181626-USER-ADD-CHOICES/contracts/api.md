# HTTP Contracts: Voters Add Choices

`postman/openapi.json` follows A1–A5 (FR-024).

## A1. POST /api/polls/:pid/choices (new)

Middleware: `shedding.withKind("vote")`, `floors.enforceFloor("vote", "choice")` (own token bucket at
`ENV_MIN_VOTE_REFRESH_INTERVAL`, burst 1, keyed `floor:choice:<s|ip>`).

Request: `{ "label": string }`.

`200`:

```json
{
  "choices": [{ "id": "…", "label": "…", "position": 0, "color": "#RRGGBB" }],
  "contentVersion": 12
}
```

`choices` is the projection's list (no `addedBy`), sorted by position; the new choice is last.

Refusals, all `{ "error": <message>, "code"?: <code> }`, checked in this order:

| Status | Code | Message | When |
|---|---|---|---|
| 503 | — (`error: "busy"`) | — | shed (existing) |
| 429 | — (`error: "too-soon"`) | — | the add-choice bucket is empty (existing body: `retryAfterMs`, `nextRefreshMs`) |
| 401 | — | `Sign in to add a choice` | no session |
| 403 | `no-vote-permission` | existing `NO_VOTE_PERMISSION` | lacks `Vote on Polls` and is not an Administrator |
| 404 | — | `Not found` | no such poll, or the caller may not view it (including a caller without `View Polls` who is not an Administrator) |
| 409 | `POLL_EDITING` | `The poll's choices are being edited. Try again shortly.` | raw state EDITING |
| 409 | `PENDING_REVIEW` | `Changes are being reviewed. Try again shortly.` | `pending_update` set |
| 409 | `NOT_OPEN` | the vote path's wording for the state | any state but OPEN |
| 403 | `ADD_CHOICES_OFF` | `This poll doesn't take new choices.` | Public poll, or the setting is off |
| 403 | — | existing ban / invitation / voter-limit messages | `assertEligible` |
| 409 | `FINAL_VOTE_CAST` | `You have already cast your final vote on this poll.` | Final-Vote poll, caller has voted, not the creator |
| 400 | `EMPTY_CHOICE` | `Enter a choice.` | |
| 400 | `CHOICE_TOO_LONG` | `A choice can be at most 40 characters.` | |
| 400 | `CHOICE_CHARACTERS` | `A choice can't contain line breaks, tabs or invisible characters.` | |
| 409 | `DUPLICATE_CHOICE` | `This poll already has that choice.` | |
| 409 | `CHOICES_FULL` | `This poll already has the most choices allowed (<max>).` | |
| 422 | `UNACCEPTABLE_LANGUAGE` | `This choice uses language that isn't allowed.` | screening verdict |
| 503 | `SCREENING_UNAVAILABLE` | `Couldn't check this choice. Try again.` | screening timeout or failure |

The three state refusals are checked first on the poll as read, so a poll's state is always the first answer, and again under the row lock with `DUPLICATE_CHOICE` and `CHOICES_FULL`.
Server log, one line per outcome, no address: `[choices] Added choice to poll <pid> (<n> choices)` or
`[choices] Refused choice for poll <pid>: <code>`.

## A2. GET /api/config (changed)

Adds `wizardChoiceMax: 40` (`WIZARD_CHOICE_MAX`).

## A3. Poll projection and overlay (changed)

- `PollProjection` (`GET /api/me/polls/:pid` `poll`, tab rows, Trending/Newest cards): adds `votersAddChoices: boolean`.
  `choices[]` keeps exactly `{ id, label, position, color? }`.
- `OverlayEntry`: adds `ownPoll?: true` when the caller created the poll.

## A4. Admin rows and detail (changed)

- `GET /api/admin/polls` rows and every admin detail answer (edit-session grant, save, publish): add
  `votersAddChoices`; each element of `choices` may carry `addedBy` (user id) and `addedByName` (string, or `null` when
  the account no longer exists).

## A5. POST /api/admin/polls/:pid/save and /publish (changed)

- Accept `votersAddChoices: boolean` (also after votes); `true` on a Public poll → `400`
  `Only a private poll can let voters add choices.`
- Accept `baseChoiceIds: string[]` beside `labels`: every stored choice whose id is not listed is kept, appended after
  the submitted labels with its colour and `addedBy` (research R10). Absent → today's behaviour.
