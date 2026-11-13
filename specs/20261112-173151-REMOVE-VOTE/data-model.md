# Data Model: Remove Vote

No new table, column, setting or key. The feature adds one **state transition** to existing rows and keys: a voter's
selection goes from non-empty to empty. Everything below describes what each store holds after it.

## `votes` (one row per participant per poll)

| State | `choice_ids` | `voted_at` | Who writes it | Read as |
|---|---|---|---|---|
| invited, not yet voted | `{}` | `null` | invitation | "not voted"; counted in `totalNotYetVoted` |
| voted | non-empty | the vote's time | consumer upsert | "voted" |
| **removed** (NEW transition) | `{}` | the removal's time | consumer upsert (Dynamic-Vote statement, last wins) | "not voted"; an invitee is counted in `totalNotYetVoted` again |

Every reader keeps its existing rule `cardinality(choice_ids) > 0`: `hasVotedBefore`, `uninvitedCreatorVotes`, the voter
limit, `reconcile`, `computeResults`, the Who Voted report, the invitation status. The Final-Vote upsert's
`where cardinality(votes.choice_ids) = 0` is never reached by a removal (a removal is refused on a Final-Vote poll).

## `vote_history` (append-only)

| Column | On a removal |
|---|---|
| `poll_id`, `email`, `user_name` | as for a vote |
| `choice_ids` | `{}` |
| `voted_at` | the removal's time |

A removal is an **event** like a vote; a replay (`rebuildLineGraphTally`) reaches the same totals because the tally
rules below already handle it.

## `line_graph_tally` / `line_graph_selection`

`tallyDeltas` applies the event to the address's held selection: each previously held choice −1 in the event's hour,
nothing +1, and `TALLY_VOTERS` −1 (since `next.length === 0` and `previous.length > 0`). `line_graph_selection` holds
`choice_ids = {}` for the address afterwards. No change to the code; the behaviour is covered by a test (R9).

## `user_polls` (relation `voted`)

| Event | Row `(email, poll_id, 'voted')` |
|---|---|
| vote (latest in batch non-empty) | upserted, `updated_at` = the vote's time (as today) |
| **removal** (latest in batch empty) | **deleted** (NEW) |

The relation drives the Your Votes tab (`yourVotesTab`), the Home tab's "voted" rule and the card's `listedBecause`
(`"You voted"`). A ban or reset already deletes it (`replaceVotes`).

## `polls`

Unchanged by a removal except through the counter flush: `vote_count` and `choice_counts` follow the live counters;
`last_vote_at` follows the latest `votes.voted_at` with a non-empty selection (`reconcile`) or is kept
(`coalesce`); `ever_voted` stays `true`.

## Cache keys (Valkey / `memoryCache`)

| Key | On a removal | Why |
|---|---|---|
| `cnt:<pid>` hash | each previous choice −1, `total` −1, `seq` +1; `dirty` and `dirty:day:*` as for a vote | the answer and every reader show the drop at once; the flush writes it |
| `trend:<bucket>` | untouched | trending counts arrivals of new voters |
| `voted:<session>` | `SREM <pid>` | the caller's own session forgets the vote |
| `lastvote:<pid>:<email>` | `"[]"` (24 h TTL) | shared by every session of the address; **decides `isNewVoter`** for the next vote (R2) |
| `votes` stream | one entry `{ pid, email, userName, choiceIds: "[]", votedAt, voteMutability: "Dynamic-Vote Poll", (device) }` | the consumer writes the rows above |
| `floor:vote`, `votes-ip:<ip>` | as for a vote | a removal is rate-limited like a vote |

### How "new voter" is decided (R2)

```text
votedBefore = voted:<session> holds pid (or, on a cache miss, a votes row with choice_ids != {} exists)
previous    = votedBefore ? lastvote:<pid>:<email> (or the votes row's choice_ids) : []
isNewVoter  = previous.length === 0
```

`votedBefore` keeps feeding the Final-Vote refusal; `isNewVoter` feeds the voter limit, `total`, trending.

## The vote answer (`VoteResponse`)

| Field | After a removal |
|---|---|
| `status` | `"recorded"` or `"queued"` as for a vote |
| `voteCount`, `choiceCounts`, `countsVersion` | the moved counters |
| `myChoiceIds` | `[]` (NEW: an empty list may follow a 200) |
| `nextRefreshMs` | the vote floor, as for a vote |

## The card's view (`toPollDetail` in `deltaClient.js`)

| Overlay field | After a removal (set by `applyVote`) |
|---|---|
| `choiceIds` | `[]` |
| `voted` | `false` |
| `relations` | the server's relations minus `"voted"`, until the next tab refresh brings the server's own (which no longer holds it) |

`listedBecause` therefore loses `"voted"` at once; `myChoiceIds` becomes `[]`, so `holdsVote()` is false and the next
ballot opens with Submit disabled.

## Ballot states (card back face, Dynamic-Vote poll)

| Selection | Holds a vote | Button | Label |
|---|---|---|---|
| empty | no | disabled | Submit vote / Submit votes |
| empty | yes | **enabled** | **Remove vote** |
| non-empty | either | enabled | Submit vote / Submit votes |
| any | viewer blocked | hidden | — |

On a Final-Vote poll "holds a vote" never reaches the ballot (the Vote button is withheld after the vote), so the second
row does not occur.
