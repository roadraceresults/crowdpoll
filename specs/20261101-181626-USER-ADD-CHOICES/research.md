# Research: Voters Add Choices to a Private Poll

Every decision below traces to the spec (`spec.md`, FR-001–FR-024, Clarifications 2026-11-01) and to the resolved
findings of `requirements/20261101-181626-user-add-choices/requirements-report.md` (cited by id).

## R1. The setting is one boolean content column

- **Decision**: migration `015-voters-add-choices` adds `polls.voters_add_choices boolean not null default false`;
  `Poll.votersAddChoices`, mapped in `rowToPoll`, `FIELD_TO_COLUMN` and `newRow`, defaulted `false` in
  `createDefaultPoll` and `duplicatePoll`, and carried by `PollProjection` / `projectPoll`, `adminListRow` and
  `deltaClient.js` `toPollDetail`. It is **not** in `NON_CONTENT_FIELDS`, so a change bumps `content_version` and
  reaches every view as other settings do. It joins `UPDATE_FIELDS` (changeable after votes, FR-001, NC1).
  `validatePollFields` refuses a non-boolean (`400`) and refuses `true` while the poll is (or is being made) a
  Public poll (`400 "Only a private poll can let voters add choices."`).
- **Rationale**: the same shape as `line_graph_enabled` (migration 013), so every reader that already copies poll
  settings copies this one by the same seams.
- **Alternatives**: a key inside an existing JSON column — rejected: no reader could filter or project it without
  parsing.

## R2. One new route, on the vote router

- **Decision**: `POST /api/polls/:pid/choices` `{ label }` in `createVoteRouter`, behind
  `shedding.withKind("vote")` and `floors.enforceFloor("vote", "choice")`; it answers
  `200 { choices, contentVersion }` (contracts A1).
- **Rationale**: an addition is a voter action of a vote's weight, so it sheds like a vote (FR-022); the vote
  router already resolves the caller (`callerEmail`) and the permission (`holdsPermission`).
- **Alternatives**: an `/api/admin/...` route — rejected: `requireOwnPoll` refuses everyone but the creator.

## R3. The addition has its own allowance at the vote interval (Clarification Q2)

- **Decision**: `enforceFloor(kind, bucket = kind)` gains an optional second parameter that names the cache key
  only: `floor:<bucket>:<s|ip>`; the interval and burst stay `config.floors[kind]` / `config.bursts[kind]`.
  The add route passes `("vote", "choice")`, so an addition and a vote never share a token, and the 429 body is the
  floor's existing `{ error: "too-soon", retryAfterMs, nextRefreshMs }` (FR-022).
- **Rationale**: one optional parameter, against adding a `RequestKind` that would ripple through `SHED_ORDER`,
  `ShedCounts`, `budget.nextRefreshMs`, `config.floors`/`bursts` and `/api/config`.
- **Alternatives**: a new `RequestKind "choice"` — rejected for that ripple; sharing the vote bucket — rejected by Q2.

## R4. Who may add (AM1, UA2, FR-002)

- **Decision**: `assertMayAddChoice` (in `src/votes/votePath.ts`, beside `assertEligible`, which it calls):
  signed in (`401`); `Vote on Polls` or Administrator (`403 no-vote-permission`); the poll is Private and its
  setting on (`403 ADD_CHOICES_OFF`, message "This poll doesn't take new choices."); `assertEligible` with
  `isNewVoter` = the caller has no vote yet (banned, not invited, over the voter limit, with its existing messages
  and its existing creator exemption); on a Final-Vote poll a caller who has voted (`hasVotedBefore`) is refused
  `409 FINAL_VOTE_CAST` unless they are the creator (`created_by_id`).
- **Rationale**: the vote path's own rules, reused rather than copied, so an addition is open to exactly whom a vote is.

## R5. When (UA1, FR-003)

- **Decision**: checked first on the poll as read, so the state is always the first answer, and again on the **raw** row under the row lock inside the write transaction (R7); never on the projection, which reports
  EDITING as OPEN: `EDITING` → `409 POLL_EDITING` "The poll's choices are being edited. Try again shortly.";
  `pending_update` not null → `409 PENDING_REVIEW` "Changes are being reviewed. Try again shortly."; any other state
  but `OPEN` → `409 NOT_OPEN` with the vote path's wording for that state.
- **Rationale**: the edit session's claim and the addition both write the poll row, so the row lock orders them; an
  addition can never land inside an edit session.

## R6. Validation and the 40-character limit (FR-011–FR-014, NC2, AM4, AM3, UA3)

- **Decision**: `validateAddedChoice(poll, rawLabel, config)` in `src/polls/service.ts` returns the trimmed label or
  throws `AdminError`-style `ChoiceError(status, message, code)`, in this order:
  1. empty after trim → `400 EMPTY_CHOICE` "Enter a choice.";
  2. longer than `WIZARD_CHOICE_MAX` → `400 CHOICE_TOO_LONG` "A choice can be at most 40 characters.";
  3. `/[\p{Cc}​-‏‪-‮⁦-⁩]/u` matches → `400 CHOICE_CHARACTERS` "A choice can't contain line
     breaks, tabs or invisible characters.";
  4. a stored label equal under `normalizedChoiceKey` (lower case, runs of white space as one space, trimmed) →
     `409 DUPLICATE_CHOICE` "This poll already has that choice.";
  5. `choices.length >= config.maxChoices` → `409 CHOICES_FULL` "This poll already has the most choices allowed (<max>).".
  `WIZARD_CHOICE_MAX = 40` moves from `src/public/adminCard.js` to `src/polls/service.ts` (beside
  `CHOICE_LABEL_MAX`, unchanged at 100) and is published in `/api/config` as `wizardChoiceMax`; `adminCard.js` reads
  `runtime.wizardChoiceMax` instead of its own constant (AM4: the requirement's `MAX_CHOICE_LABEL_LENGTH` is this one).
  Lengths count UTF-16 units, as `CHOICE_LABEL_MAX` does.
- **Rationale**: one limit for a new poll's choices and a voter's, one source; the character and duplicate rules
  apply to additions only, so no stored poll becomes invalid.

## R7. The write: one transaction under the row lock (UA5, FR-016, FR-017)

- **Decision**: `appendChoice(deps, pid, build)` in `src/polls/store.ts`, modelled on `applyPendingUpdate`:
  `select … for update` the poll row; run R5 and R6 against it (so two simultaneous additions or an addition racing
  the edit-session claim are serialized and the ceiling holds, SC-004); append
  `{ id: randomUUID(), label, position: max + 1, addedBy? }` with no `color`; write `choices` and `choice_labels`;
  `bumpContentVersion` (which also queues the `search_outbox` row and rewrites the `poll:<pid>` projection).
  No `forgetTabs`: an addition changes no tab's membership, and the personal tabs already detect a projection whose
  `content_version` moved (REFRESH-MECHANISMS R1). The line graph needs no tally change for a choice with no votes.
- **Rationale**: the existing content-write path, so every view learns of the choice by the refreshes that exist
  (FR-019, SC-002).

## R8. Screening inside the request (IN2, FR-015)

- **Decision**: after `validateAddedChoice` passes and before the transaction, the route calls
  `screenWithTimeout(localScreener, { title: "", subtitle: "", choiceLabels: [label] }, config.screeningCallTimeoutMs)`.
  A non-empty verdict → `422 UNACCEPTABLE_LANGUAGE` "This choice uses language that isn't allowed."; a
  `ScreeningTimeoutError` or a throw → `503 SCREENING_UNAVAILABLE` "Couldn't check this choice. Try again.". The
  addition never goes through `pending_update`.
- **Rationale**: `localScreener` is local and instant; the same `Screener` the sweep defaults to.
- **Alternatives**: a screener in `AppContext` — rejected: nothing else would use it (Simplicity First).

## R9. The adder is recorded on non-anonymous polls only (NC4, Clarification Q1, FR-020, FR-021)

- **Decision**: `Choice.addedBy?: string` (the user id) inside `polls.choices`, set only when `voteAnonymity` is `"No"`.
  - `projectPoll` copies only `{ id, label, position, color }`, so the id never reaches a voter.
  - The admin detail and list rows add `addedByName` per choice, looked up per request from `user.name`
    (as `creatorEmails()` looks up creators), so names are never stored.
  - `mergeChoices` and `replaceChoices` keep a stored choice's `addedBy` when its trimmed label survives.
  - `validatePollFields` drops every `addedBy` when `voteAnonymity` becomes `"Yes"` (possible only before votes).
  - `deleteAccount` removes `addedBy` equal to the user's id from every poll's `choices` in its transaction (no
    content bump: nothing a voter sees changes).
  - `privacy.html` gains one sentence; no cookie or storage key, so `cookie-use-list.test.ts` is unaffected.

## R10. The creator's save keeps choices added since the card loaded (IN1, FR-023)

- **Decision**: the admin card sends `baseChoiceIds` (the choice ids of the poll it was opened with) with every
  `/save` and `/publish` that carries `labels`; before `mergeChoices` / `replaceChoices`,
  `withChoicesAddedSince(poll, labels, colors, baseChoiceIds)` appends the label and colour of every stored choice whose
  id is not in `baseChoiceIds`. Absent `baseChoiceIds` means today's behaviour. The ceiling is then checked on the
  combined list by the existing validators, so an over-full save is refused `400` with their existing message.
- **Rationale**: R5 already makes the race unreachable while a session is held; this covers the cases R5 cannot — a
  card whose session lapsed and that saves without the lock, and any future save path — at the cost of one list on
  the request.
- **Alternatives**: storing the session-start ids on the poll — rejected: a column for a guard.

## R11. The client: button, prefetch, dialog (AM2, UA4, UA6, FR-005–FR-010)

- **Decision**: `pollCard.js` adds `.add-choice-btn` to the voting face's `.actions` row (outlined, centred by a grid
  on the row, `hidden` unless `mayAddChoice(poll)`): the poll is Private, `votersAddChoices` is on, `pollState` is
  OPEN, `canVote !== false`, the viewer holds `Vote on Polls` (or Administrator), and not (Final-Vote and voted and not
  `poll.ownPoll`). `ownPoll` is a new overlay field (`overlay()` reads `created_by_id`).
  A press calls `GET /api/me/polls/:pid` (existing), turns its `poll`, `counts` and `overlay` into a card detail as
  `tabs.js` `mountLinkedPoll` does (`DeltaClient.toPollDetail`), applies that through the card's `applyPoll`, and opens the
  dialog unless the choices are at `maxChoices` or the call failed (card message area). The dialog is a new
  `src/public/addChoiceDialog.js` (`window.AddChoiceDialog.open({ choices, maxLength, onSave })`) reusing the
  `.modal-backdrop`/`.modal` markup and `tabs-modal-m3.css`, with the outlined field and `m3-field-counter` from the
  admin card, styled by a new `add-choice-m3.css` holding only M3 tokens (`LAYER_ORDER` in `m3-assets.test.ts`).
  On success the card applies `choices` from the answer, keeping `pendingSelection`.
  The prefetch route keeps its own limit, the page-load bucket (`pageLoads`), unchanged; it is not moved under the
  manual-refresh floor. Because it answers `404` to a session without `View Polls`, `mayAddChoice` also requires
  `View Polls`, so the button never leads to that refusal.
- **Rationale**: the card already rebuilds from a projection; the dialog is one file so `pollCard.js` grows by the
  button and one call.

## R12. Verification

- Server: `tests/add-choice.test.ts` (route: eligibility, states, validation order, screening, ceiling under
  concurrent requests, the separate floor, `addedBy` vs anonymity, projection without `addedBy`); extensions to
  `tests/editing-poll-available*.test.ts` or the save suite for `withChoicesAddedSince`, to the account-deletion
  suite for `addedBy`, and to the migration list test.
- Client: `tests/client-add-choice.test.ts` (button visibility rules, prefetch failure and full poll, dialog keys,
  focus, counter and paste cap, error display, selection kept); `tests/client-admin-wizard.test.ts` for the setting,
  `wizardChoiceMax` and "Added by".
- `postman/openapi.json`: A1, and the new fields in A2–A5.
