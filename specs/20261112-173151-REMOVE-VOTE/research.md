# Research: Remove Vote

The product decisions were taken in the requirements phase
(`requirements/20261112-173151-remove-vote/requirements-report.md`, AM1, UA1–UA5, NC1–NC3). This file settles how each
one lands in the code, from reading the vote path (`src/votes/votePath.ts`, `src/votes/consumer.ts`,
`src/polls/counters.ts`, `src/polls/service.ts`), the card (`src/public/pollCard.js`, `deltaClient.js`, `tabs.js`,
`voteClient.js`) and their tests. Each item gives the decision, the reason and the alternatives considered.

## R1. The removal rule lives in `validateVoteChoicesAndState`, after the state gates

- **Decision**: `validateVoteChoicesAndState(poll, choiceIds, hasExistingVote)` in `src/polls/service.ts` is reordered:
  the single-choice check (`> 1` on a Single-Choice Poll) and the state checks (`EDITING` → `POLL_EDITING` for the
  stored-poll validator; `WAITING TO OPEN`, not `OPEN`) run first, then the Final-Vote check (`hasExistingVote` → 409 "You have already voted
  on this poll and cannot change your vote."), and last the emptiness rule:
  `if (choiceIds.length === 0 && !(poll.voteMutability === "Dynamic-Vote Poll" && hasExistingVote)) throw new VoteError(400, "Select at least one choice.")`.
  An empty selection is therefore a **removal** exactly when the poll is an open Dynamic-Vote poll and the voter holds a
  vote (UA4). Both callers (`validateVote` for stored polls and `castVote`) get the rule.
- **Rationale**: UA4 wants the state gates first so a poll that is not open refuses a removal with its state's message
  and the card keeps its selection; a Final-Vote poll with an existing vote answers 409 whatever the selection; and an
  empty selection without a vote keeps today's 400. Moving the emptiness check last also removes the ordering defect
  noted as technical debt (an empty selection on a closed poll used to answer 400 instead of the state's 409).
- **Found while implementing**: the vote route validates from the projection, and `projectPoll` publishes an
  `EDITING` poll as its stashed state (`INITIALIZED` when there is none), so the route never answers `POLL_EDITING`:
  a removal on a poll under edit that was open goes through like a vote, and one on a poll that was not open is
  refused like that state. The card's `POLL_EDITING` branch keeps an empty selection as it keeps a full one; the
  client test stages that answer.
- **Alternatives**: a separate `validateRemoval` function (two places to keep the gates in step; rejected for
  Simplicity); a new route (NC2 option B, rejected in requirements).

## R2. `castVote` records a removal through the same path, and decides "new voter" from the previous selection

- **Decision**: in `src/votes/votePath.ts`, `castVote` computes, after `hasVotedBefore`:
  `const previous = votedBefore ? await previousChoices(deps, pid, email) : []` and
  `const isNewVoter = previous.length === 0`. `assertEligible(..., isNewVoter)` and the counters use `isNewVoter`;
  `validateVoteChoicesAndState` keeps `votedBefore` for the Final-Vote rule. A removal is `choiceIds.length === 0`
  after validation; if `previous.length === 0` as well (nothing to remove: a second removal racing the first, or a
  stale session set) it answers 400 "Select at least one choice." and changes nothing. Otherwise it calls
  `removeVote(cache, pid, previous, now)` (R3), `srem`s the pid from `VOTED_KEY(sessionId)`, sets
  `LAST_VOTE_KEY(pid, email)` to `"[]"`, enqueues the stream entry with `choiceIds: "[]"` as any vote, and answers
  `{ status, voteCount, choiceCounts, countsVersion, myChoiceIds: [] }`.
- **Rationale**: UA2. `LAST_VOTE_KEY` is keyed by poll and address, so it is shared by every session of the account:
  deciding "new voter" from it (not from the per-session `voted:<session>` set) makes a re-vote from **another**
  session of the same account count `total` +1, re-check the voter limit and bump trending correctly, even while that
  session's set still holds the pid. The `srem` keeps the voter's own session honest without waiting for the 24 h TTL.
  The "nothing to remove" guard is what makes a double removal move the counts once (spec edge case).
- **Alternatives**: deleting every `voted:*` set of the account (not enumerable without a scan; rejected);
  decrementing `total` on the consumer instead of at enqueue time (the counters would lag the answer the card shows;
  rejected, votes do not work that way either).

## R3. Counters: `removeVote` beside `countVote`, sharing one mover

- **Decision**: `src/polls/counters.ts` keeps `countVote`'s signature (five callers in tests) and adds
  `export async function removeVote(cache, pid, previousChoiceIds, now = new Date()): Promise<LiveCounts>`. Both
  delegate to a private `moveCounts(cache, pid, addChoiceIds, removeChoiceIds, voterDelta: -1 | 0 | 1, now)`: per-choice
  `HINCRBY ±1`, `total` by `voterDelta`, `seq` +1, the trending bucket only when `voterDelta === 1`, the dirty sets as
  today. `removeVote` is `moveCounts(cache, pid, [], previous, -1, now)`.
- **Rationale**: UA2: the live counters after a removal equal what `reconcile` computes from `votes` with
  `cardinality(choice_ids) > 0`, so the flush sweep and the reconcile script stay correct; trending counts arrivals
  only. One mover keeps the two paths from drifting; the positional booleans (technical debt) are not spread further.
- **Alternatives**: a `voterDelta` parameter on `countVote` itself (changes five test call sites for no gain);
  a negative `isNewVoter` hack (unreadable).

## R4. The consumer writes the empty row and drops the `voted` relation

- **Decision**: `writeBatch` in `src/votes/consumer.ts` is unchanged for `votes` (the Dynamic-Vote upsert already
  writes whatever `choice_ids` it is given, and a removal only ever arrives with `voteMutability: "Dynamic-Vote Poll"`),
  for `vote_history` (one row with `choice_ids = []`), for `recordLineGraphTally` (`tallyDeltas` already yields the
  per-choice −1 and the `TALLY_VOTERS` −1 for an empty selection), for device events (a removal with evidence is a
  `"vote"` event as today) and for `markEverVoted`. The `latest` map keeps the latest **vote** per `(email, pid)`
  instead of its date; the entries whose latest `choiceIds` is non-empty go to `upsertUserPolls(..., "voted")` as
  today, and the others to one `delete from user_polls where relation = 'voted' and (email, poll_id) in (...)` in the
  same transaction. `forgetTabs(cache, emails)` already follows the batch.
- **Rationale**: UA1 and UA3: the stored shape of a removed vote is the invitee-not-yet-voted shape, and the `voted`
  relation follows FIX020's rule for removed votes. "Latest in batch wins" matches the `votes` upsert, so a vote and a
  removal in one batch leave the relation and the row in step.
- **Alternatives**: deleting the `votes` row (loses an invitee's `totalNotYetVoted` seat, needs a new statement;
  rejected in UA1); a new `"removed"` device event (nothing reads it; Simplicity).

## R5. The card: Submit's state, label, handler and the "You voted" overlay

- **Decision** (`src/public/pollCard.js`): a `holdsVote()` helper returns
  `poll.voteMutability === 'Dynamic-Vote Poll' && (poll.myChoiceIds || []).length > 0`. `updateSubmitState` becomes:
  `const empty = selectedIds().length === 0; const removal = empty && holdsVote(); submitBtn.disabled = (empty && !removal) || Boolean(viewerBlockedReason());`
  and sets the button's label span to `'Remove vote'` when `removal`, else the `submitLabel` (`setText` keeps computing
  `submitLabel` and calls `updateSubmitState`). The click handler drops its `ids.length === 0` guard in favour of
  `if (!poll || (ids.length === 0 && !holdsVote())) return;`; on success the notice is
  `status === 'queued' ? QUEUED_NOTICE : (ids.length === 0 ? 'Your vote was removed.' : '')`; the rest (flip, hold,
  `onVoted`) is unchanged. `tabs.js`'s `applyVote` sets the overlay to
  `{ voted: outcome.myChoiceIds.length > 0, choiceIds: outcome.myChoiceIds }` and, when empty, replaces
  `overlay.relations` with the relations minus `"voted"`, so `toPollDetail`'s `listedBecause` drops `voted` at once
  (the server's `overlay()` reads `voted` from `votes.choice_ids`, so the next refresh agrees once the consumer has
  written). `patchRetained` already copies `myChoiceIds` for the maximized card.
- **Rationale**: NC1, NC3, UA5. Today `toPollDetail` says "voted" when `overlay.voted`, when `choiceIds` is non-empty
  or when the server relations hold `voted`; a removal must clear all three locally, or "You voted" would linger until
  the next tab refresh.
- **Alternatives**: a separate "Remove my vote" control (NC1 option C, rejected); a confirmation step (NC3 option B,
  rejected); re-fetching the detail after a removal (an extra request for something the response already says).

## R6. Equal widths for three labels: a label span and sizers on both buttons

- **Decision**: the back button becomes
  `<button class="btn-primary btn-vote submit-vote-btn"><span class="btn-vote-label">Submit vote</span><span class="btn-vote-sizer" aria-hidden="true"></span><span class="btn-vote-sizer" aria-hidden="true"></span></button>`,
  and the front button gains a second sizer span. `setText` writes the two sizers of **both** buttons with the
  `submitLabel` and, on a Dynamic-Vote poll, `'Remove vote'` (otherwise `''`); the visible text goes to
  `.btn-vote-label`. `site.css` extends the grid rule to the back button:
  `.vote-btn, .submit-vote-btn{ display:grid; … }` and `.vote-btn > *, .submit-vote-btn > *{ grid-area:1 / 1; }`
  (the `[hidden]{ display:none }` rule at (0,2,0) still wins). `tests/client-home.test.ts`'s label test reads
  `.btn-vote-label` on the back button instead of the button's `textContent`, and expects the sizers to carry
  `Submit votes` / `Remove vote` on a Dynamic-Vote poll.
- **Rationale**: FR-004 (UA, NC1 cons): the two buttons must keep one width for all three labels. Stacking every child
  in one grid cell is the mechanism 008 FR-007 introduced for the front; applying it to the back is the smallest change
  that makes the back button stop reflowing when its label switches between "Submit vote" and "Remove vote" (the two
  are close but not equal in width).
- **Alternatives**: measuring the widest label in JS (layout thrash on every render); a fixed `min-width` in `ch`
  (breaks at the card's smallest sizes, which the 008 research rejected already).

## R7. The API contract

- **Decision**: in `postman/openapi.json`, `submitVote`'s `choiceIds` gets `"minItems": 0` and a description: an empty
  array removes the caller's vote on an open Dynamic-Vote poll on which they hold one; the summary becomes "Cast,
  change or remove a vote — …"; the `400` description becomes "Empty choiceIds without a vote to remove, unknown
  choice, or >1 on a Single-Choice Poll"; the `409` description names the Final-Vote refusal for a removal; the
  `VoteOutcome` description says `myChoiceIds` is `[]` after a removal.
- **Rationale**: NC2 option A and FR-019; `postman/openapi.json` follows the routes (CLAUDE.md invariant).
- **Alternatives**: a `DELETE` route (rejected in NC2).

## R8. Documentation

- **Decision**: `README.md`'s **Vote** bullet gains: "On a poll that says *You may change your vote*, un-set every choice
  and the button reads **Remove vote**: pressing it withdraws your vote, and you may vote again later." `ARCHITECTURE.md`'s
  *The vote path* section gains a paragraph on removals (the empty selection, `total` −1, the `voted` relation deleted
  by the consumer, "new voter" decided from `lastvote`), and its *Cache keys* table notes that `lastvote:<pid>:<email>`
  holds `[]` after a removal and decides the new-voter flag. `CLAUDE.md`'s managed block points at this plan.
- **Rationale**: FR-020 and the constitution's Documentation Deliverables.

## R9. Tests

- **Decision**:
  - `tests/polls-vote.test.ts`: a removal on a Dynamic-Vote poll answers 200 with `voteCount` 0, the choice at 0,
    `myChoiceIds: []`; the stored row has `choice_ids = []` after the drain; a re-vote then counts `voteCount` 1 again;
    an empty selection on an EDITING Dynamic-Vote poll with a vote is refused like its stashed state, or goes through
    when that state is OPEN; an empty selection on a Final-Vote poll with a vote answers 409 "cannot change"; a second removal answers 400; the existing empty-selection
    400 stays.
  - `tests/votes-path.test.ts`: a removal from a second session (`s2`) of the same address, then a vote from it, counts
    `total` 1 not 0 (R2); the consumer writes the `vote_history` row and deletes the `voted` relation; a vote and a
    removal in one batch leave no relation; `voted:<session>` no longer holds the pid after a removal.
  - `tests/tabs-your-votes.test.ts`: the poll leaves Your Votes after a removal and returns after a re-vote.
  - `tests/line-graph-tally.test.ts`: a removal yields the per-choice −1 and voters −1 in its hour (through
    `writeBatch`).
  - `tests/who-voted-route.test.ts`: a removed vote is not listed and the invitee counts as not yet voted (the fixture
    for "a vote left with none" already exists; one case goes through the vote route).
  - `tests/client-home.test.ts` (or a new `tests/client-remove-vote.test.ts`): on a Dynamic-Vote poll with a vote,
    un-setting the last choice enables Submit with the label "Remove vote"; picking a choice restores "Submit vote";
    clicking Remove vote flips the card, shows "Your vote was removed." and drops "You voted"; on a poll without a vote
    the button stays disabled; the sizers carry both labels and the two buttons have equal widths in jsdom's computed
    structure (label and sizer texts).
  - `tests/poll-card-assets.test.ts`: the back button carries the label span and sizers.
- **Rationale**: Principle IV; every FR has a test or a quickstart step.

## R10. What stays as it is

- `src/polls/voters.ts` (Who Voted), `src/invitations/invitations.ts` (invitation status), `effectiveVoterLimit` and
  `assertEligible`'s limit check, `reconcile`, `computeResults`, `markEverVoted`, the populate script's vote writer
  (`recordVote` in `store.ts`, which never writes an empty selection) and `replaceVotes` already treat an empty
  selection as "not voted" and need no change; the plan adds tests for the first two through the route.
- No migration: `votes.choice_ids` and `vote_history.choice_ids` already default to `'{}'`.
- No new setting, cookie, storage key, route or dependency.
