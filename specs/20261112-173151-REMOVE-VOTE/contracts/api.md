# API Contract: removing a vote

The existing `POST /api/polls/:pid/vote` (`operationId: submitVote`) gains one meaning; `postman/openapi.json` is
updated as below. No new route.

## A1. `POST /api/polls/:pid/vote` with `{ "choiceIds": [] }`

`choiceIds` becomes `minItems: 0`. An **empty** array is a request to remove the caller's vote. Checks run in this
order, each with the message a vote gets:

| Condition | Answer |
|---|---|
| no session | `401` `Log in to vote` |
| no "Vote on Polls" grant | `403` `{ error, code: "no-vote-permission" }` |
| terms not accepted | the terms gate's answer |
| vote floor / IP cap / shedding | `429` / `503` as for a vote |
| poll unknown | `404` |
| poll `EDITING` | as the stashed state: a removal goes through when the poll was `OPEN`, otherwise that state's `409` (without a stash, "not open for voting") |
| poll `WAITING TO OPEN` / not `OPEN` | `409` the existing messages |
| banned / not invited | `403` the existing messages |
| Final-Vote poll and the caller holds a vote | `409` `You have already voted on this poll and cannot change your vote.` |
| the caller holds **no** vote (never voted, invitee placeholder, already removed) | `400` `Select at least one choice.` |
| otherwise (open Dynamic-Vote poll, a vote held) | `200` **the vote is removed** |

A non-empty `choiceIds` behaves exactly as today (unknown choice `400`, `> 1` on a Single-Choice Poll `400`, Final-Vote
re-vote `409`, …).

## A2. The `200` answer after a removal (`VoteOutcome`)

```json
{ "status": "recorded", "voteCount": 0, "choiceCounts": { "c1": 0, "c2": 3 }, "countsVersion": 7, "myChoiceIds": [], "nextRefreshMs": 5000 }
```

- `voteCount` is one lower than before; each choice the caller had selected is one lower.
- `myChoiceIds` is `[]` (new: an empty list may follow a `200`).
- `status` is `"queued"` while the writers lag, exactly as for a vote.
- `nextRefreshMs` is the vote floor; the caller's next vote request must wait for it.

## A3. What a removal changes for other endpoints (no contract change)

- `GET /api/me/polls/:pid/voters` (Who Voted) no longer lists the caller; an invitee shows as not yet voted.
- `GET /api/tabs/your-votes` no longer lists the poll; `GET /api/tabs/home` lists it only for another relation.
- The personal-tab overlay (`GET /api/me/overlay`, the tab listings) reports `voted: false` and no `choiceIds` for the
  poll once the consumer has written the removal.
- Line-graph points after the removal's hour show the lower counts and voter line.

## A4. `openapi.json` edits

- `paths./api/polls/{pid}/vote.post.summary`: "Cast, change or remove a vote — answered at once from the live counts,
  written by the vote consumer".
- `requestBody … choiceIds`: `minItems: 0`, `description`: "The caller's selection. An empty array removes the caller's
  vote on an open Dynamic-Vote poll on which they hold one; elsewhere an empty array is refused."
- `responses.400.description`: "Empty choiceIds without a vote to remove, an unknown choice, or >1 on a Single-Choice
  Poll".
- `responses.409.description`: adds "a removal, or a second vote, on a Final-Vote Poll".
- `components.schemas.VoteOutcome.description`: adds "myChoiceIds is empty after a removal".
