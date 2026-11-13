# Tasks: Remove Vote

**Input**: Design documents from `specs/20261112-173151-REMOVE-VOTE/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R10), data-model.md, contracts/api.md, contracts/ui-contracts.md,
quickstart.md

**Tests**: included. The constitution's Principle IV (Goal-Driven Execution) makes every change verifiable by a test,
and research R9 names one per requirement. Each story's tests are written first and fail before the implementation.

**Organization**: tasks are grouped by user story. US1 is the feature (the removal end to end); US2 proves the two
rules a removal must not open (no vote held, Final-Vote); US3 proves the existing gates apply to a removal.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: the user story the task belongs to (US1, US2, US3)
- Every description names its file(s)

## Path Conventions

Single project: `src/` and `tests/` at the repository root; the browser code in `src/public/`; the API description in
`postman/openapi.json`; the documentation deliverables at the root.

---

## Phase 1: Setup

**Purpose**: nothing to install or scaffold; the feature changes existing files only (plan: no migration, setting,
route, cookie or dependency). One task confirms the baseline.

- [X] T001 Run `npx tsc --noEmit` and `npx vitest run tests/polls-vote.test.ts tests/votes-path.test.ts tests/client-home.test.ts` to record the green baseline before any change (no file changed)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the one rule every story depends on: what an empty selection means on the server. Until it is in place
the vote route answers every empty selection with 400, so neither the removal (US1) nor its refusals (US2, US3) can be
tested through the route.

**⚠️ CRITICAL**: no user story work can begin until this phase is complete

- [X] T002 In `src/polls/service.ts`, reorder `validateVoteChoicesAndState(poll, choiceIds, hasExistingVote)` per R1: the Single-Choice `> 1` check and the state checks (`EDITING` → `POLL_EDITING`, `WAITING TO OPEN`, not `OPEN`) first, then the Final-Vote check (`hasExistingVote` → 409 "You have already voted on this poll and cannot change your vote."), and last the emptiness rule `if (choiceIds.length === 0 && !(poll.voteMutability === "Dynamic-Vote Poll" && hasExistingVote)) throw new VoteError(400, "Select at least one choice.")`; keep every message verbatim
- [X] T003 In `src/polls/counters.ts`, add the private `moveCounts(cache, pid, addChoiceIds, removeChoiceIds, voterDelta: -1 | 0 | 1, now)` (per-choice `hincrby ±1`, `total` by `voterDelta`, `seq` +1, the trending bucket only when `voterDelta === 1`, the `dirty` and `dirty:day:*` sets as today) and the exported `removeVote(cache, pid, previousChoiceIds, now = new Date()): Promise<LiveCounts>` = `moveCounts(cache, pid, [], previousChoiceIds, -1, now)`; make `countVote` delegate to `moveCounts` with its signature unchanged (R3)

**Checkpoint**: `npx tsc --noEmit` passes; `npx vitest run tests/polls-vote.test.ts tests/votes-path.test.ts` still passes (every existing test sends a non-empty selection or expects 400 from a voter without a vote)

---

## Phase 3: User Story 1 - Remove my vote from a Dynamic-Vote poll (Priority: P1) 🎯 MVP

**Goal**: a voter with a vote on a Dynamic-Vote poll un-sets every choice, the button reads "Remove vote", one click
removes the vote everywhere (counts, Who Voted, line graph, Your Votes, "You voted"), and they may vote again as a new
voter.

**Independent Test**: quickstart steps 1–6 and 10; `npx vitest run tests/polls-vote.test.ts tests/votes-path.test.ts tests/tabs-your-votes.test.ts tests/line-graph-tally.test.ts tests/who-voted-route.test.ts tests/client-remove-vote.test.ts tests/client-home.test.ts tests/poll-card-assets.test.ts`

### Tests for User Story 1 (write first, confirm they fail)

- [X] T004 [P] [US1] In `tests/polls-vote.test.ts`, add: a removal (`POST /api/polls/:pid/vote` with `[]`) on a Dynamic-Vote poll after a vote answers 200 with `voteCount: 0`, the former choice at 0, `myChoiceIds: []`, `status: "recorded"`; after `drain()` the `votes` row has `choice_ids: []`; a re-vote then answers `voteCount: 1` and `myChoiceIds: ["c2"]`; a second removal straight after the first answers 400 "Select at least one choice." and the counts are unchanged (A1, A2, FR-011, FR-014, edge case)
- [X] T005 [P] [US1] In `tests/votes-path.test.ts`, add to "the vote path": a vote from session `s-a`, a removal from session `s2-a` of the same address, then a vote from `s2-a` leaves `voteCount: 1` (R2: new voter decided from `lastvote`); after a removal `VOTED_KEY("s-…")` no longer holds the pid and the stream entry carries `choiceIds: "[]"`; add to "the consumer": one batch holding a vote then a removal by one voter writes one `votes` row with `choice_ids: []`, two `vote_history` rows, and no `user_polls` row `(email, pid, 'voted')`; a batch holding only a vote still upserts the relation (R4); vote, `runOnce`, removal, `runOnce` → the `user_polls` row the first batch wrote is gone; after a removal the hour's `trend:*` bucket count for the pid is unchanged and `polls.ever_voted` is still true, and a re-vote bumps the bucket by one (FR-015)
- [X] T006 [P] [US1] In `tests/tabs-your-votes.test.ts`, add: after a vote the poll is listed; after a removal (through `castVote` and `ctx.consumer.runOnce()`) it is not; after a re-vote it is again (FR-013, FR-014)
- [X] T007 [P] [US1] In `tests/line-graph-tally.test.ts` ("kept by the vote writers"), add: a removal written by `writeBatch` records, in its hour, −1 for each previously held choice and −1 under `TALLY_VOTERS`, and the tally still equals the one computed afresh from `vote_history` (FR-011, FR-012)
- [X] T008 [P] [US1] In `tests/who-voted-route.test.ts` ("what it lists"), add: a voter who removed their vote through the vote route (after the consumer wrote it) is not listed, and on an Invitation Only poll the invitee is counted among those not yet voted in the poll detail's `totalNotYetVoted` (FR-011)
- [X] T009 [P] [US1] Create `tests/client-remove-vote.test.ts` (jsdom, modelled on `tests/client-add-choice.test.ts`: `openPage`, `forgeSession`, a Dynamic-Vote poll seeded with a vote for the viewer through `castVote` + `runOnce`): open the ballot, click the selected row → `.submit-vote-btn` is enabled and its `.btn-vote-label` reads "Remove vote"; click another row → "Submit vote"; un-set it → "Remove vote"; click the button → the card is not flipped, `.poll-vote-notice` reads "Your vote was removed.", `.poll-voted` is hidden, the choice's count and `.poll-totals` dropped by one; open the ballot again → nothing selected, the button disabled; a multiple-choice variant: un-set one of two → still "Submit votes" and enabled; after the removal `.vote-btn` is disabled and re-enables after `nextRefreshMs` (C1, C2, FR-001, FR-002, FR-006, FR-017, FR-018)
- [X] T010 [P] [US1] In `tests/client-home.test.ts`, change the "labels Submit in the plural" test to read the back button's `.btn-vote-label` and to expect both buttons' two sizers to carry `["Submit votes", "Remove vote"]` on a Dynamic-Vote multiple-choice poll and `["Submit vote", ""]` on a Final-Vote single-choice poll; in `tests/poll-card-assets.test.ts`, extend the sizer tests to the back button: `.submit-vote-btn` contains `.btn-vote-label` and two `.btn-vote-sizer`, and `site.css` applies `display:grid` and `grid-area:1 / 1` to `.submit-vote-btn` and its children (C3, FR-004)

### Implementation for User Story 1

- [X] T011 [US1] In `src/votes/votePath.ts` `castVote`, per R2: after `hasVotedBefore`, compute `const previous = votedBefore ? await previousChoices(deps, vote.pid, vote.email) : []` and `const isNewVoter = previous.length === 0`; pass `isNewVoter` to `assertEligible` and to `countVote`; after validation, when `choiceIds.length === 0`: if `previous.length === 0` throw `new VoteError(400, "Select at least one choice.")`, else `counts = await removeVote(deps.cache, vote.pid, previous, now)`, `await deps.cache.srem(VOTED_KEY(vote.sessionId), vote.pid)` instead of the `sadd`, and set `LAST_VOTE_KEY` to `"[]"`; the stream entry, lag check and the answer (`myChoiceIds: choiceIds`, i.e. `[]`) stay as they are
- [X] T012 [US1] In `src/votes/consumer.ts` `writeBatch`, per R4: make the `latest` map hold the latest `QueuedVote` per `email\npid` (not its date); call `upsertUserPolls` for the entries whose latest `choiceIds.length > 0` as today, and for the others run one `trx.deleteFrom("user_polls").where("relation", "=", "voted").where(sql\`(email, poll_id)\` in the pairs)` in the same transaction (skip when there are none); leave the `votes` upserts, `vote_history`, `recordLineGraphTally`, device events and `markEverVoted` unchanged
- [X] T013 [US1] In `src/public/pollCard.js`'s card template and `setText`, per R6: give the back button the structure `<span class="btn-vote-label">Submit vote</span><span class="btn-vote-sizer" aria-hidden="true"></span><span class="btn-vote-sizer" aria-hidden="true"></span>` and add a second `.btn-vote-sizer` span to the front `.vote-btn`; in `setText` write every `.btn-vote-sizer` pair with `[submitLabel, poll.voteMutability === 'Dynamic-Vote Poll' ? 'Remove vote' : '']` (first and second sizer of each button) and stop assigning `submitBtn.textContent`; in `src/public/site.css` extend the two grid rules to `.vote-btn, .submit-vote-btn{ display:grid; justify-content:center; align-content:center; }` and `.vote-btn > *, .submit-vote-btn > *{ grid-area:1 / 1; }`, updating the comment above them to say both buttons stack their children (C3)
- [X] T014 [US1] In `src/public/pollCard.js`, per R5: add `function holdsVote(){ return Boolean(poll) && poll.voteMutability === 'Dynamic-Vote Poll' && (poll.myChoiceIds || []).length > 0; }`; make `updateSubmitState` compute `empty`, `removal = empty && holdsVote()`, set `submitBtn.disabled = (empty && !removal) || Boolean(viewerBlockedReason())` and write `removal ? 'Remove vote' : submitLabel` to the back button's `.btn-vote-label` (keep `submitLabel` in a card-level variable set by `setText`, which then calls `updateSubmitState`); in the click handler replace the `ids.length === 0` guard with `if (!poll || (ids.length === 0 && !holdsVote())) return;` and set the notice to `result.outcome.status === 'queued' ? window.VoteClient.QUEUED_NOTICE : (ids.length === 0 ? 'Your vote was removed.' : '')`
- [X] T015 [US1] In `src/public/tabs.js` `applyVote`, per R5: set the overlay with `window.DeltaClient.setOverlay(controller.state, pid, { voted: outcome.myChoiceIds.length > 0, choiceIds: outcome.myChoiceIds })` and, when `outcome.myChoiceIds.length === 0`, read `relations` from `(controller.state.overlay.get(pid) || controller.state.cards.get(pid).overlay || {}).relations` and, when it is an array, also pass `relations: relations.filter((r) => r !== 'voted')`, so `toPollDetail`'s `listedBecause` drops "voted" at once (C4, FR-017)
- [X] T016 [US1] Run `npx tsc --noEmit` and the US1 test files (T004–T010); fix until green; run quickstart steps 1–6 and 10 by hand

**Checkpoint**: a voter can remove and re-cast a vote; every reader agrees; US1 is deployable on its own

---

## Phase 4: User Story 2 - Nothing changes for voters without a vote, or on Final-Vote polls (Priority: P2)

**Goal**: an empty selection from a voter without a vote keeps today's disabled button and 400; a Final-Vote poll
refuses a removal with its "cannot change" 409.

**Independent Test**: quickstart steps 7 and 8; `npx vitest run tests/polls-vote.test.ts tests/client-remove-vote.test.ts`

### Tests for User Story 2

- [X] T017 [P] [US2] In `tests/polls-vote.test.ts`, add: `[]` on a Final-Vote poll **after** a vote answers 409 with the "cannot change your vote" message and moves no counter; `[]` on a Dynamic-Vote poll the voter never voted on answers 400 "Select at least one choice."; `[]` from an invitee of an Invitation Only poll whose row is the unused-invitation placeholder answers 400 (A1, FR-008, FR-009)
- [X] T018 [P] [US2] In `tests/client-remove-vote.test.ts`, add: on a Dynamic-Vote poll the viewer never voted on, the ballot opens with the button disabled and the label "Submit vote", and un-setting/setting a choice toggles only the disabled state; on a Final-Vote poll after a vote, un-setting the recorded choice leaves the button disabled and reading "Submit vote" (C1 rows 1–2, FR-003)

### Implementation for User Story 2

- [X] T019 [US2] Confirm T002's ordering produces the three answers of T017 (409 before 400 on a Final-Vote poll with a vote; 400 for no vote held) and that `holdsVote()` from T014 is false when `myChoiceIds` is empty; adjust `src/polls/service.ts` or `src/public/pollCard.js` only if a test fails, and run `npx vitest run tests/polls-vote.test.ts tests/client-remove-vote.test.ts`

**Checkpoint**: no side door: an empty selection removes a vote only where the spec allows it

---

## Phase 5: User Story 3 - The usual gates apply to a removal (Priority: P3)

**Goal**: a removal passes the poll-state, ban, invitation, floor and IP-cap checks a vote passes, with the same
messages; an EDITING poll answers `POLL_EDITING` and the card keeps the empty selection.

**Independent Test**: quickstart steps 9 and 11; `npx vitest run tests/polls-vote.test.ts tests/client-remove-vote.test.ts`

### Tests for User Story 3

- [X] T020 [P] [US3] In `tests/polls-vote.test.ts`, add: `[]` from a voter with a vote on a Dynamic-Vote poll in `EDITING` is served as its stashed state (without one, 409 "not open for voting"; stashed from `OPEN`, the removal goes through); in `CLOSED` and `WAITING TO OPEN` the existing state messages; a banned voter's `[]` answers 403 with the ban message; a removal counts toward the per-session vote floor (a vote right after it answers 429 with `retryAfterMs`) and toward the per-address cap (A1, FR-007, FR-010, FR-016)
- [X] T021 [P] [US3] In `tests/client-remove-vote.test.ts`, add: with the ballot open and empty, a staged `POLL_EDITING` answer (the route serves a poll under edit as its pre-edit state) flips the card to the front showing the editing message, keeps `pendingSelection` empty, and after a refresh the ballot shows nothing selected with "Remove vote" enabled (C2 step 3, FR-010)

### Implementation for User Story 3

- [X] T022 [US3] Verify T011 keeps the gate order of A1 (floor and IP cap before the projection read; state checks inside `validateVoteChoicesAndState` before the emptiness rule; `assertEligible` before validation as today) and that the card's existing `POLL_EDITING` branch (`pendingSelection = ids`) handles an empty `ids`; change `src/votes/votePath.ts` or `src/public/pollCard.js` only if a T020/T021 test fails; run `npx vitest run tests/polls-vote.test.ts tests/client-remove-vote.test.ts`

**Checkpoint**: all three stories pass; `npm test` is green

---

## Phase 6: Contract, Documentation & Polish

**Purpose**: the API description, the documentation deliverables and the full-suite check

- [X] T023 [P] In `postman/openapi.json`, per A4: `submitVote` summary "Cast, change or remove a vote — answered at once from the live counts, written by the vote consumer"; `choiceIds` `minItems: 0` with the description "The caller's selection. An empty array removes the caller's vote on an open Dynamic-Vote poll on which they hold one; elsewhere an empty array is refused."; the 400 description "Empty choiceIds without a vote to remove, an unknown choice, or >1 on a Single-Choice Poll"; the 409 description adds "a removal, or a second vote, on a Final-Vote Poll"; `VoteOutcome.description` adds "myChoiceIds is empty after a removal" (FR-019)
- [X] T024 [P] In `README.md`, extend the **Vote** bullet per R8: "On a poll that says *You may change your vote*, un-set every choice and the button reads **Remove vote**: pressing it withdraws your vote, and you may vote again later." (FR-020)
- [X] T025 [P] In `ARCHITECTURE.md`, per R8: in *The vote path* add a paragraph on removals (an empty selection on an open Dynamic-Vote poll by a voter with a vote; each previous choice and `total` −1; `voted:<session>` SREM; `lastvote` set to `[]` and now deciding the new-voter flag for every session; the consumer writes `choice_ids = {}`, the history row and the tally deltas, and deletes the `voted` relation; trending untouched) and extend the sequence diagram's consumer line with "user_polls voted upsert or delete"; in *Cache keys* note `lastvote:<pid>:<email>` holds `[]` after a removal and decides `isNewVoter`
- [X] T026 Run `npx tsc --noEmit` and `npm test`; fix anything the full suite finds (for example a test that asserted `countVote`'s trending or `total` behaviour through the new mover)
- [X] T028 (TWEAK01) In `src/public/pollCard.js`, move `.poll-vote-notice` from the front action row to the end of `.card-foot-row`, after `.poll-voted`; in `src/public/site.css` style it with the `.poll-voted` group (italic, muted, right-aligned, `flex:0 0 auto; margin-left:auto`) and drop its own rule; in `src/public/pollCard-m3.css` move it to the `.poll-voted` colour group; `tests/client-remove-vote.test.ts` asserts the notice is in the foot row and the action row holds the link and the button only; `tests/poll-card-assets.test.ts` pins the rule (C2 step 2)
- [X] T027 Run the manual quickstart (steps 1–11) on the development server and record any deviation in `specs/20261112-173151-REMOVE-VOTE/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none
- **Foundational (Phase 2)**: after Phase 1; T002 and T003 are independent of each other but both block every story
- **User Stories (Phases 3–5)**: after Phase 2. US2 and US3 are refusal paths of the rule US1 exercises: their tests can
  be written in parallel with US1, but they pass only once T011 (the removal branch) exists, so run them after US1 in
  practice
- **Polish (Phase 6)**: after the stories; T023–T025 are independent of each other and of the code tasks

### User Story Dependencies

- **US1 (P1)**: after Phase 2; no dependency on other stories
- **US2 (P2)**: after Phase 2; depends on T002 (the ordering) and T014 (`holdsVote`) for its assertions
- **US3 (P3)**: after Phase 2; depends on T011 for the removal to reach the gates

### Within Each User Story

- Tests first (T004–T010, T017–T018, T020–T021) and failing before the implementation
- Server (T011, T012) before browser (T013–T015), since the client tests go through the route
- In US1, T013 (the label span and sizers) before T014 (which writes the label into that span)
- Verification task last in each story

### Parallel Opportunities

- T002 ‖ T003 (two files)
- T004 ‖ T005 ‖ T006 ‖ T007 ‖ T008 ‖ T009 ‖ T010 (seven test files)
- T011 ‖ T012 (two server files); T013 (the template and sizers) before T014 (the state and label), both in `pollCard.js`; T015 ‖ T013
- T017 ‖ T018; T020 ‖ T021
- T023 ‖ T024 ‖ T025

---

## Parallel Example: User Story 1

```bash
# The seven test tasks together:
Task: "T004 removal, re-vote and double removal through the route in tests/polls-vote.test.ts"
Task: "T005 second-session new voter; consumer rows and relation in tests/votes-path.test.ts"
Task: "T006 Your Votes leaves and returns in tests/tabs-your-votes.test.ts"
Task: "T007 removal deltas in tests/line-graph-tally.test.ts"
Task: "T008 removed vote not listed in tests/who-voted-route.test.ts"
Task: "T009 the ballot states and the click in tests/client-remove-vote.test.ts"
Task: "T010 label span and sizers in tests/client-home.test.ts and tests/poll-card-assets.test.ts"

# Then the two server tasks together:
Task: "T011 the removal branch in src/votes/votePath.ts"
Task: "T012 the voted relation delete in src/votes/consumer.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 baseline, Phase 2 (T002, T003)
2. Phase 3: tests T004–T010, then T011–T015, then T016
3. **STOP and VALIDATE**: quickstart steps 1–6 and 10
4. US1 alone is the feature the testers asked for and is deployable

### Incremental Delivery

1. US1 → removal works end to end
2. US2 → the refusals for no vote and Final-Vote are pinned by tests (the code is already right after Phase 2 and T014)
3. US3 → the gates are pinned by tests
4. Phase 6 → contract, README, ARCHITECTURE, full suite, manual quickstart

### Parallel Team Strategy

One developer can write all server tests while another writes the client tests; the server changes (T011, T012) and
the client changes (T013–T015) then proceed side by side.

---

## Notes

- No migration, setting, route, cookie, storage key or dependency: `.gitignore`, `privacy.html`, `config.ts` and the
  Terraform are untouched
- `countVote`'s signature stays, so its five test callers are untouched (R3)
- Comments added to changed code follow Principle VI: names carry the meaning; no requirement ids in source
- Commit after each phase; the feature branch is `unvote`
