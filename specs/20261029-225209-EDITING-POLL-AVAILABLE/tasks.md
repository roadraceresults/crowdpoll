# Tasks: Editing an Open Poll Without Interrupting Voting

**Input**: Design documents from `/specs/20261029-225209-EDITING-POLL-AVAILABLE/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R12), data-model.md, contracts/api.md (A1–A7), contracts/ui-contracts.md (C1–C8), quickstart.md

**Tests**: Included — the constitution treats the test suite as documentation (Principle VI), and every mechanism here has a named suite in research R12.

**Organization**: Tasks are grouped by user story so each story is an independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story the task belongs to (US1–US5)

## Path Conventions

Single project at the repository root: `src/`, `tests/`, `postman/`, per plan.md's Project Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The two columns and domain fields every story's server work builds on (data-model.md).

- [X] T001 Create migration `014-pending-update` adding nullable `pending_update jsonb` and `pending_rejection_reason text` to `polls` in src/db/migrations/014-pending-update.ts, and register it in src/db/migrations/index.ts
- [X] T002 Add the `pending_update`/`pending_rejection_reason` columns to `PollTable` in src/db/schema.ts, and the `pendingUpdate`/`pendingRejectionReason` fields to the `Poll` interface, the field-to-column map and `NON_CONTENT_FIELDS` in src/polls/store.ts (setting or clearing a pending update must not bump `content_version` — data-model.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Nothing beyond Setup blocks the stories — every story builds directly on existing seams. No foundational tasks.

**Checkpoint**: After T002 (and a successful `npm test` migration run), user story implementation can begin.

---

## Phase 3: User Story 1 - Voting stays available while the creator edits (Priority: P1) 🎯 MVP

**Goal**: Opening the editor never pauses voting (R1), and a save of an ever-voted poll keeps the poll OPEN and serving pre-save content while title/subtitle changes are screened in the background (R2, R8, R10, R11). FR-001–FR-006, FR-024, FR-025.

**Independent Test**: Quickstart Scenarios 1, 2 and 6 — a voter votes while the editor is open and while a save is under review; approved text appears within ~10 s with the poll never unlisted; rejection leaves it unchanged with a notice; a second save is refused.

### Tests for User Story 1

- [X] T003 [US1] Extend tests/polls-editing-lock.test.ts: while a poll is `EDITING` with a stashed state of `OPEN`, the projection (`poll:<pid>`) reports `OPEN`, `POST /api/polls/:pid/vote` accepts and counts a vote, the poll stays in listings, and the per-viewer vote block (tabsApi `voteBlocks`) reports no block; a stashed `CLOSED` still refuses; and the session's exclusivity and expiry are preserved — a second opener is refused LOCKED and the stale sweep still restores the stashed state (FR-002) (write first, expect failures)
- [X] T004 [US1] Extend tests/polls-screening.test.ts: a `/publish` of an ever-voted OPEN poll with a changed title leaves `pollState` OPEN and the served title unchanged, sets `pending_update`, and answers `pending: true`; the sweep screens the overlaid content, applies on approval (title visible, `pending_update` null, `launched_at` NOT re-stamped), sets `pending_rejection_reason` on rejection, honours the timeout/attempt rules, applies to a poll that CLOSED mid-review without reopening it (FR-025), and a second `/publish` while pending answers `409 { code: "PENDING_REVIEW" }`; assert as a regression guard that an open, **never-voted** poll's save still sets AWAITING APPROVAL with the full EDIT-mode flow unchanged (FR-022)

### Implementation for User Story 1

- [X] T005 [US1] In src/polls/versions.ts, make `projectPoll` publish the effective state (`pollState === "EDITING"` → `pollStateBeforeEditUpdate ?? "INITIALIZED"`), and give tabsApi's `voteBlocks` (src/routes/tabsApi.ts) the same effective-state reading so a viewer's vote block matches the projection (R1)
- [X] T006 [US1] In src/polls/service.ts, make `editModeFor` answer `INELIGIBLE` with reason `PENDING_REVIEW` and message "Changes are being reviewed. Try again shortly." while `pendingUpdate` is set, and make `capabilitiesFor` report `canEdit`/`canUpdate` false then (R8, A1, A5)
- [X] T007 [US1] In src/routes/pollsApi.ts, split `/publish` for an ever-voted poll whose effective state is not INITIALIZED: apply non-text fields in the save transaction with **no** `pollState` write; store changed `title`/`subtitle` in `pending_update`; clear the edit session; answer the merged detail plus `pending: boolean`; refuse with `409 PENDING_REVIEW` when a pending update exists; keep the never-voted (EDIT-mode) flow byte-identical (R2, A2)
- [X] T008 [US1] In src/polls/store.ts, extend `claimNextForApproval` to claim from both pools (`poll_state = 'AWAITING APPROVAL'` or `pending_update IS NOT NULL`, claim timestamp null) and `recoverCrashedApprovalClaim` to recover both; in src/polls/sweeps.ts, screen a pending claim's overlaid content (pending title/subtitle over stored, stored labels), apply on approval in one transaction (write the pending fields, clear `pending_update` and `pending_rejection_reason`, never write `pollState`), set `pending_rejection_reason` on rejection, reuse the timeout/attempt handling, and log each pending apply/reject (R2, A3)
- [X] T009 [US1] In src/routes/pollsApi.ts, add `pendingUpdate: boolean` and `pendingRejectionReason` to `adminListRow` (A5)
- [X] T010 [US1] In src/public/adminCard.js, show the card-header state detail "changes pending review" while `pendingUpdate` is true and "changes rejected: <reason>" while `pendingRejectionReason` is set (the existing `card-state-detail` slot), and show the review note "Saving sends your poll to be reviewed again." on an ever-voted poll only when the current diff contains a change that goes to review (C5, C6)
- [X] T011 [US1] Extend tests/client-admin-wizard.test.ts: the pending status and rejection reason render on the read-only card, a pending poll's editor-open attempt surfaces the server's refusal message, and the review note hides for a save that changes no reviewed field (C5, C6)

**Checkpoint**: Scenario 1/2/6 of quickstart.md pass; US1 is a deployable MVP.

---

## Phase 4: User Story 2 - Adding and deleting choices on a live poll (Priority: P2)

**Goal**: Choices change by id through the textbox merge (R3), voted deletions are confirmed with session-start counts (R6, R7), and an applied deletion rewrites votes, rebuilds the tally and reconciles counters (R4). FR-007–FR-015.

**Independent Test**: Quickstart Scenario 3 — add/delete/rename through the textbox, confirm the prompt and the Cancel revert, verify surviving tallies, the appended Automatic-colour addition, the emptied voter's re-vote (Final included), and the bound/duplicate refusals.

### Tests for User Story 2

- [X] T012 [P] [US2] Create tests/polls-pending-update.test.ts: `mergeChoices` keeps survivors' id/label/position by exact trimmed-label match, appends additions with minted ids, treats a rename as delete+add, and refuses below `ENV_MIN_CHOICES`, above `ENV_MAX_CHOICES`, past 100 characters and on duplicate labels; applying a pending choice deletion removes the id from every `votes.choice_ids`, leaves `vote_history` untouched, rebuilds the line-graph tally, reconciles `cnt:<pid>` (stale field zeroed, `total` recounted), lets an emptied Final-Vote voter vote again, and single-choice percentages sum to 100 after the apply (write first, expect failures)
- [X] T013 [P] [US2] Extend tests/polls-editing-lock.test.ts: the edit-session grant carries `choiceCounts` matching the live counters at session start (A1)

### Implementation for User Story 2

- [X] T014 [US2] In src/polls/service.ts, add `mergeChoices(poll, labels, colors, config)` beside `replaceChoices`: validate as `replaceChoices` does (min/max, 100-char cap, unique trimmed labels), match by exact label after trimming, keep survivors' id/label/position, append additions with `randomUUID()` ids and next positions, pair colours positionally, and return `{ choices, deletedIds }` (R3)
- [X] T015 [US2] In src/routes/pollsApi.ts, add `labels` to `UPDATE_FIELDS`, route an ever-voted poll's `labels`+`colors` through `mergeChoices`, and store the complete resulting list in `pending_update.choices` (ids minted at save); add `choiceCounts` (from `rebuildIfMissing` + parsed `cnt:<pid>`) to the edit-session grant (R2, R6, A1, A2)
- [X] T016 [US2] In src/polls/sweeps.ts, extend the pending apply: write `pending_update.choices` by id, remove each deleted id from every `votes.choice_ids` of the poll in the same transaction (collecting affected emails), call `rebuildLineGraphTally(trx, pid)` in-transaction, and after commit run `reconcile` for the poll and `forgetTabs` for the affected voters (R4, A3)
- [X] T017 [US2] In src/public/adminCard.js, unlock the Choices textbox and Paste choices button in UPDATE mode (`lockStep(3)`), keep the textbox/paste/help markup unchanged (C1), compute the merge diff against `session.poll.choices` by the same exact-trimmed-label rule, and store the grant's `choiceCounts` on the session (C2, C3)
- [X] T018 [US2] In src/public/adminCard.js, add `askToDeleteChoices(deletions)` cloned from the `askToDiscard` alert-dialog pattern (headline "Delete choices with votes?", one "<label> — <N> vote(s)" line per voted deletion, buttons "Keep choices"/"Delete", Escape/scrim = keep), fire it on the three exits from the Choices step (`goToStep` away, Next, Save changes) only when a voted deletion is pending, revert the whole textbox to its session-entry text on Keep, apply zero-vote deletions silently, and do not re-prompt for an unchanged confirmed set (C2); include `labels` (with aligned `colors`) in the Save changes payload when changed (C8)
- [X] T019 [US2] Extend tests/client-admin-wizard.test.ts: the Choices step is enabled on a voted OPEN poll with today's markup, leaving the step with a voted deletion opens the dialog naming the choice and count, "Keep choices" restores the session-entry text, "Delete" proceeds, a zero-vote deletion never prompts, a rename shows as a deletion, and the save payload carries `labels` + `colors` (C1–C3, C8)

**Checkpoint**: Scenario 3 of quickstart.md passes; US1 and US2 work independently.

---

## Phase 5: User Story 3 - Switching a private poll between Invitation Only and Anyone with the Link (Priority: P3)

**Goal**: The sharing-mode freeze is relaxed on a Private, ever-voted poll; access follows the live checks with votes and invitation records preserved (R5, R9). FR-016–FR-018, FR-021.

**Independent Test**: Quickstart Scenario 4 — switch both ways; an uninvited past voter loses access but keeps their counted vote, reconnects when invited; the invitation record never changes; Private↔Public stays refused.

### Tests for User Story 3

- [X] T020 [US3] Extend tests/polls-pending-update.test.ts: `/publish` accepts `pollSharingMode` both ways on a Private ever-voted poll and applies it at save with no state change and no pending update; after a switch to Invitation Only an uninvited past voter's vote still counts in `/results` while their vote and view are refused, and inviting them restores access; `pollVisibility` and `voteAnonymity` stay refused `409`; the switch alone does not rewrite `currentVotes`; and after the switch to Anyone With The Link the `poll_invitations` rows, their sent/accepted fields included, are unchanged (FR-017) (write first, expect failures)

### Implementation for User Story 3

- [X] T021 [US3] In src/polls/service.ts, let `validatePollFields` accept `pollSharingMode` on an ever-voted **Private** poll (both directions), keeping `pollVisibility`, `voteAnonymity` and `keywords` frozen, and making sure the mode switch alone does not trigger the roster/`currentVotes` rewrite (R5, R9); add `pollSharingMode` to `UPDATE_FIELDS` in src/routes/pollsApi.ts (A2)
- [X] T022 [US3] In src/public/adminCard.js, split `FIELD_OF` so `pollSharingMode` is its own `canChange` field, and make `lockStep(1)` lock per-control: the sharing-mode radios enabled on an ever-voted Private poll, the visibility radios and anonymity switch still locked with `LOCKED_BY_VOTES` (C4)
- [X] T023 [US3] Extend tests/client-admin-wizard.test.ts: on a voted Private OPEN poll the sharing-mode radios are enabled and a change is sent in the save payload, while the visibility radios stay disabled (C4, C8)

**Checkpoint**: Scenario 4 of quickstart.md passes.

---

## Phase 6: User Story 4 - Switching choice mode from Single to Multiple (Priority: P4)

**Goal**: The one-way Single→Multiple relaxation (R5). FR-019.

**Independent Test**: Quickstart Scenario 5 step 1 — the switch applies at save, old votes unchanged, a voter may pick several choices, and the reverse direction is refused.

### Tests for User Story 4

- [X] T024 [US4] Extend tests/polls-pending-update.test.ts: `/publish` accepts `Single-Choice Poll → Multiple-Choice Poll` on an ever-voted poll (applied at save, votes untouched, a multi-choice vote is then accepted) and refuses the reverse with `409`

### Implementation for User Story 4

- [X] T025 [US4] In src/polls/service.ts, let `validatePollFields` accept exactly the Single→Multiple direction of `choiceMode` on an ever-voted poll and refuse Multiple→Single `409`; add `choiceMode` to `UPDATE_FIELDS` in src/routes/pollsApi.ts (R5, A2)
- [X] T026 [US4] In src/public/adminCard.js, unlock the Step 5 choice-mode radios one-way: both enabled on a voted Single-Choice poll, the Single option disabled with `LOCKED_BY_VOTES` on a voted Multiple-Choice poll (C4)
- [X] T027 [US4] Extend tests/client-admin-wizard.test.ts: the one-way radio enablement on Step 5 and the `choiceMode` save payload (C4, C8)

---

## Phase 7: User Story 5 - Switching vote mutability between Dynamic and Final (Priority: P5)

**Goal**: Mutability switches both ways; existing votes untouched, the new rule forward-only (R5). FR-020.

**Independent Test**: Quickstart Scenario 5 step 2 — switch each way; a past voter's ability to change their vote follows the new setting at once.

### Tests for User Story 5

- [X] T028 [US5] Extend tests/polls-pending-update.test.ts: `/publish` accepts `voteMutability` both ways on an ever-voted poll, applied at save; after Dynamic→Final an existing voter's re-vote is refused; after Final→Dynamic a past voter's changed vote is accepted and counted

### Implementation for User Story 5

- [X] T029 [US5] In src/polls/service.ts, let `validatePollFields` accept `voteMutability` both ways on an ever-voted poll; add `voteMutability` to `UPDATE_FIELDS` in src/routes/pollsApi.ts (R5, A2)
- [X] T030 [US5] In src/public/adminCard.js, unlock the Step 5 vote-mutability radios in UPDATE mode (C4), covered with a payload assertion in tests/client-admin-wizard.test.ts

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T031 Update postman/openapi.json for A7 (edit-session `choiceCounts` and `PENDING_REVIEW` refusal; `/publish`'s widened UPDATE fields, `pending` response field and `PENDING_REVIEW` 409; admin list row fields) and extend tests/openapi-contract.test.ts to pin them
- [X] T032 Run `npx tsc --noEmit` and the full `npm test`, then walk quickstart.md's six scenarios against a local run and fix what they surface
- [X] T033 [P] Regenerate README.md at the project root (post-implementation deliverable; constitution Documentation Deliverables)
- [X] T034 [P] Regenerate ARCHITECTURE.md at the project root (post-implementation deliverable; constitution Documentation Deliverables)
- [X] T035 In src/votes/votePath.ts, word the refusal of a vote naming a choice the poll no longer has as "That choice is no longer available — please choose again.", keeping the empty-selection message as it is; assert both messages in tests/polls-pending-update.test.ts (runs before T032's full-suite pass)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 → T002 (schema types follow the migration).
- **Foundational (Phase 2)**: empty — stories start after T002.
- **US1 (Phase 3)**: the MVP; T005/T006 are independent [not same-file parallel with T007]; T007 → T008 (route then sweep share the pending shape); T009–T011 after T007.
- **US2 (Phase 4)**: builds on US1's pending machinery (T007/T008); within it T014 → T015 → T016, client T017 → T018 → T019.
- **US3–US5 (Phases 5–7)**: each needs only Setup plus US1's `/publish` split (T007) for its apply-at-save behaviour; they touch disjoint validation branches and can proceed in any order after US1.
- **Polish (Phase 8)**: after the chosen stories; T031 after every route change it documents.

### User Story Dependencies

- **US1 (P1)**: none beyond Setup — the MVP.
- **US2 (P2)**: depends on US1's pending apply path (T008) for its sweep work.
- **US3/US4/US5**: depend on US1's save split; independent of US2 and of each other.

### Within Each User Story

- Tests are written first and must fail before the implementation tasks of the same story.
- Server (service → route → sweep) before client; client before its jsdom tests pass.

### Parallel Opportunities

- T012 and T013 (different test concerns) in parallel; T020/T024/T028 each extend the same new suite, so they carry no [P] and run serially.
- T033 and T034 in parallel.
- After US1, the US3/US4/US5 phases can run in parallel with US2 (different validation branches and different client steps; the shared files `service.ts`/`pollsApi.ts`/`adminCard.js` make intra-file coordination necessary — prefer sequential within one developer).

## Parallel Example: User Story 2

```bash
# After US1 is merged:
Task: "T012 server merge/deletion suite in tests/polls-pending-update.test.ts"
Task: "T013 choiceCounts grant assertion in tests/polls-editing-lock.test.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (T001–T002), then Phase 3 (T003–T011).
2. **STOP and VALIDATE**: quickstart Scenarios 1, 2 and 6.
3. US1 alone already delivers the headline requirement: zero voter-facing unavailability.

### Incremental Delivery

US1 (availability + pending review) → US2 (choices) → US3 (sharing mode) → US4 (Single→Multiple) → US5 (mutability) → Polish. Each checkpoint leaves every earlier story working; US4 and US5 are small enough to batch with US3 in one sitting.

## Notes

- All freezes and relaxations stay keyed on `hasEverVoted` (AM2): no task touches the never-voted EDIT-mode flow.
- The `POLL_EDITING` service branch and the poll card's editing UI stay in place untouched (Principle III).
- Commit after each task or logical group; stop at any checkpoint to validate the story independently.
