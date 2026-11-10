# HTTP Contract: Who Voted Report

## A1. `GET /api/me/polls/:pid/voters`

**Middleware**: terms gate (not listed in `ALLOWED_API`), `requireSession`, `shedding.withKind("live")`,
`floors.enforceFloor("live", "voters")`, `countBudget("live")`.

| Case | Status | Body |
|---|---|---|
| no session | `401` | `{ "error": "Not logged in" }` |
| terms not accepted | the terms gate's existing refusal | — |
| sooner than the `voters` floor (`ENV_MIN_LIVE_REFRESH_INTERVAL`, burst 1) | `429` + `Retry-After` | `{ "error": "too-soon", "retryAfterMs": n, "nextRefreshMs": n }` |
| unknown pid, public poll, `vote_anonymity = "Yes"`, not published, or caller neither passes `mayViewResults` nor is an administrator | `404` | `{ "error": "Not found" }` |
| otherwise | `200` | `VoterReport` (below) |

Every answer: `Cache-Control: private, no-store`.

```json
{
  "voters": [
    { "name": "Alice", "choiceIds": ["c1"], "votedAt": "2026-11-10T17:04:12.000Z" },
    { "name": "Bob", "choiceIds": ["c2", "c4", "c6"], "votedAt": "2026-11-10T17:05:40.000Z" }
  ],
  "settleMs": 2000
}
```

- `voters`: one entry per `votes` row with a non-empty `choice_ids`, ids limited to the poll's voter-facing choices,
  entries with no id left omitted; ordered by name, then `votedAt`.
- `settleMs`: present only when the poll's live counter `voteCount` differs from the number of non-empty rows; equals
  `ENV_VOTE_QUEUE_LAG_NOTICE`.
- Never an email address, user id or anything else about the voter.

## A2. `postman/openapi.json`

Adds `/api/me/polls/{pid}/voters` (`get`, tag as the other `/api/me` reads) with the `200`, `401`, `404` and `429`
responses above and a `VoterReport` schema; `tests/openapi-contract.test.ts` keeps it in step with the router.
