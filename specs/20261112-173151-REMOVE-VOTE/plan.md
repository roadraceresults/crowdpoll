# Implementation Plan: Remove Vote

**Branch**: `20261112-173151-REMOVE-VOTE` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/20261112-173151-REMOVE-VOTE/spec.md`

## Summary

On a Dynamic-Vote poll, a voter who holds a vote may now submit an **empty selection**, which removes their vote. The
ballot's Submit button stays enabled and reads **Remove vote** while the selection is empty and a vote is held (R5, R6);
the request is the existing `POST /api/polls/:pid/vote` with `choiceIds: []` (R7). The server accepts it only on an open
Dynamic-Vote poll from a voter with a vote, after the same gates as a vote (R1); it moves the live counters down (each
previous choice −1, `total` −1), clears the session's voted mark and sets the shared `lastvote` key to `[]`, which is
what now decides "new voter" for the next vote from any session (R2, R3). The consumer writes the voter's `votes` row
with `choice_ids = []` (the invitee-not-yet-voted shape), a `vote_history` row, the tally deltas it already computes,
and **deletes** the `voted` relation, so the poll leaves Your Votes and "You voted" (R4). No migration, setting, route,
cookie or dependency; one CSS rule extended; the API description relaxed; README and ARCHITECTURE updated (R8).

## Technical Context

**Language/Version**: TypeScript on Node.js ≥ 22 (ESM); browser: vanilla ES2020 in `src/public/`

**Primary Dependencies**: none new (Express 5, Kysely, Vitest, supertest, embedded-postgres, jsdom already present)

**Storage**: PostgreSQL via Kysely; no migration: `votes.choice_ids` and `vote_history.choice_ids` already allow `'{}'`.
Valkey / `memoryCache`: `cnt:<pid>` moved down, `voted:<session>` gets an `SREM`, `lastvote:<pid>:<email>` holds `[]`

**Testing**: Vitest + supertest + embedded-postgres (`tests/polls-vote.test.ts`, `tests/votes-path.test.ts`,
`tests/tabs-your-votes.test.ts`, `tests/line-graph-tally.test.ts`, `tests/who-voted-route.test.ts`,
`tests/poll-card-assets.test.ts`); jsdom for the card (`tests/client-home.test.ts`, new
`tests/client-remove-vote.test.ts`) (R9)

**Target Platform**: the `web` service on DigitalOcean App Platform; every browser the card already supports

**Project Type**: single project (web service with static front end)

**Performance Goals**: unchanged: a removal costs what a vote costs (one cache round for the gates, the counter moves,
one `XADD`); the consumer adds one `DELETE` per batch that holds a removal

**Constraints**: the vote path keeps answering from the cache only (no row writes on the request); every reader of votes
(results, Who Voted, invitations, voter limit, line graph, reconcile) keeps its `cardinality(choice_ids) > 0` meaning;
the live counters after a removal equal what `reconcile` computes; the two card buttons keep one width for three labels

**Scale/Scope**: changed `src/polls/service.ts`, `src/votes/votePath.ts`, `src/polls/counters.ts`,
`src/votes/consumer.ts`, `src/public/pollCard.js`, `src/public/tabs.js`, `src/public/site.css`, `postman/openapi.json`,
`README.md`, `ARCHITECTURE.md`, `CLAUDE.md`; six test files touched, one added

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Think Before Coding**: PASS. Nine requirements findings resolved; clarification found nothing open. The one
  tradeoff the plan found on its own (the per-session voted set versus the shared `lastvote` key for "new voter", R2)
  is stated with its reason.
- **II. Simplicity First**: PASS. One rule moved to the end of an existing validator; one counter function beside the
  existing one sharing a private mover; one `DELETE` in the consumer; a helper and a label in the card; one CSS selector
  extended. No new route, table, setting or abstraction.
- **III. Surgical Changes**: PASS. Every changed line traces to an FR; `countVote`'s signature and its five test callers
  are untouched; the stored-poll validator gains the same rule only because it shares the function.
- **IV. Goal-Driven Execution**: PASS. R9 names a test for every FR; the quickstart adds the manual checks for the
  button widths and the notice.
- **V. Code Quality & Maintainability**: PASS. The removal rule sits in the one validator both paths share; the counter
  arithmetic in one mover; the server logs nothing new per removal (a vote logs nothing per vote either), the consumer's
  existing batch logging covers it; the browser console gets nothing.
- **VI. Self-Documenting Code**: PASS. Names: `removeVote`, `moveCounts`, `voterDelta`, `isNewVoter`, `holdsVote`,
  `REMOVE_LABEL`. Comments added, if any, point to this plan's research only through the existing header style.
- **Security, Privacy & Reliability**: PASS. A removal passes the ban, invitation, state, grant, IP-cap and floor checks
  a vote passes; it changes only the caller's own vote; no new data is collected; logs carry no address.
- **Documentation Deliverables**: README.md and ARCHITECTURE.md are updated in the task list's documentation phase.

**Post-Phase-1 re-check**: PASS. The design adds no entity, column, route or setting; the data model describes states
of existing rows and keys.

## Project Structure

### Documentation (this feature)

```text
specs/20261112-173151-REMOVE-VOTE/
├── plan.md              # This file
├── research.md          # R1–R10
├── data-model.md        # the states of a vote row, the history event, the relation, the cache keys
├── quickstart.md        # automated and manual checks
├── contracts/
│   ├── api.md           # A1–A2: the vote request with an empty selection, the answers
│   └── ui-contracts.md  # C1–C4: the button, the card after a removal, the widths, the personal tabs
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── polls/
│   ├── service.ts        # validateVoteChoicesAndState: gates first, emptiness last, removal rule (R1)
│   └── counters.ts       # removeVote + private moveCounts(voterDelta); countVote unchanged in signature (R3)
├── votes/
│   ├── votePath.ts       # castVote: previous → isNewVoter, removal branch, SREM voted, lastvote "[]", myChoiceIds [] (R2)
│   └── consumer.ts       # writeBatch: latest vote per (email, pid); upsert or DELETE the voted relation (R4)
└── public/
    ├── pollCard.js       # holdsVote, Submit state + label, handler, notice; label span + sizers on both buttons (R5, R6)
    ├── tabs.js           # applyVote: overlay voted flag and relations follow myChoiceIds (R5)
    └── site.css          # grid rule extended to .submit-vote-btn (R6)

postman/openapi.json      # submitVote: minItems 0, descriptions (R7)
README.md                 # the Vote bullet (R8)
ARCHITECTURE.md           # The vote path: removals; Cache keys: lastvote (R8)
CLAUDE.md                 # managed block → this plan (R8)

tests/
├── polls-vote.test.ts            # removal, re-vote, 409s, double removal (R9)
├── votes-path.test.ts            # second-session new voter; consumer rows and relation (R9)
├── tabs-your-votes.test.ts       # leaves and returns (R9)
├── line-graph-tally.test.ts      # removal deltas (R9)
├── who-voted-route.test.ts       # removed vote not listed, invitee not yet voted (R9)
├── poll-card-assets.test.ts      # back button structure (R9)
├── client-home.test.ts           # label test reads .btn-vote-label; sizers (R9)
└── client-remove-vote.test.ts    # NEW: the ballot states, the click, the notice, "You voted" (R9)
```

**Structure Decision**: the existing single project. Every change sits where the vote it mirrors is handled: the rule
in the validator, the counters beside `countVote`, the relation in the consumer, the button in the card.

## Complexity Tracking

No constitution violations; nothing to justify.
