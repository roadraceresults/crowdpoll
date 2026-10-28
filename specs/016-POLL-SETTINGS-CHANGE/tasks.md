---
description: "Task list for 016-POLL-SETTINGS-CHANGE"
---

# Tasks: Poll Settings Change

**Input**: Design documents from `specs/016-POLL-SETTINGS-CHANGE/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Test tasks are included and are **not** optional here, for the same two reasons 014 gave.
Narrowing `POLL_VISIBILITIES` breaks 46 literals across seven suites — the build does not pass
without repairing them — and constitution v1.1.0 Principle IV requires a verifiable criterion per
task while Principle VI treats the suite as documentation. Where a task's verification is manual,
it says so and points at `quickstart.md`.

**Organization**: grouped by user story. Each story phase is a complete, demonstrable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel — different files, no dependency on an incomplete task
- **[Story]**: US1–US4, mapping to the user stories in `spec.md`
- Paths are repository-relative

---

## Phase 1: Setup

**Purpose**: a known-green baseline. This feature adds no dependency, configuration or file, so
setup is the regression baseline that SC-002 and SC-008 are measured against.

- [X] T001 Run `npm test` and `npm run build` on the untouched tree and record both as green; every later checkpoint compares against this

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the model and the predicate. Nothing compiles, and no suite passes, until this phase
is complete — which is the point: research R1 chose a signature change precisely so the compiler
enumerates every server call site.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 In `src/polls/store.ts`, narrow `POLL_VISIBILITIES` to `["Public Poll", "Private Poll"] as const`; add `POLL_SHARING_MODES = ["Anyone With The Link", "Invitation Only"] as const` and `VOTE_ANONYMITIES = ["Yes", "No"] as const` with derived types `PollSharingMode` and `VoteAnonymity`; add required fields `pollSharingMode: PollSharingMode` and `voteAnonymity: VoteAnonymity` to the `Poll` interface (data-model.md)
- [X] T003 In `src/polls/store.ts`, re-base `isInvitationOnly` to `(poll: Pick<Poll, "pollVisibility" | "pollSharingMode">) => boolean` returning `!isPublicVisibility(poll.pollVisibility) && poll.pollSharingMode === "Invitation Only"`; delete `INVITATION_ONLY_VISIBILITIES` and the doc comment above the predicate pair; change `homeGridFilter`'s invited-visitor clause to `pollVisibility: "Private Poll", pollSharingMode: "Invitation Only"` in place of the `$in` (research R1, R2)
- [X] T004 In `src/polls/service.ts`, set `pollSharingMode: "Anyone With The Link"` and `voteAnonymity: "Yes"` in `createDefaultPoll` (research R3)
- [X] T005 In `src/polls/service.ts`, repair every call site the T003 signature change breaks: widen the `Pick<Poll, …>` of `viewerVoteBlock` and `checkViewEligibility` to include `"pollSharingMode"` and pass `poll`; in `validatePollFields`' roster reconciliation compute `inviteOnly` from the effective poll `{ pollVisibility: $set.pollVisibility ?? poll.pollVisibility, pollSharingMode: $set.pollSharingMode ?? poll.pollSharingMode }`; in `duplicatePoll` pass `source` at both uses and copy `pollSharingMode` and `voteAnonymity` from the source (research R1; spec FR-006, FR-015)
- [X] T006 In `src/routes/pollsApi.ts`, pass `poll` (not `poll.pollVisibility`) to `isInvitationOnly` in the participants route, and add `pollSharingMode: p.pollSharingMode` and `voteAnonymity: p.voteAnonymity` to the row built in `GET /api/admin/polls` next to `pollVisibility` (contracts/api-endpoints.md)
- [X] T007 In `tests/helpers/poll-fixtures.ts`, add `pollSharingMode: "Anyone With The Link"` and `voteAnonymity: "Yes"` to `makePoll`'s defaults
- [X] T008 [P] In `tests/polls-vote.test.ts`, replace every old private visibility literal: `"Private Poll - Invitation Only - …"` → `pollVisibility: "Private Poll", pollSharingMode: "Invitation Only"`; `"Private Poll - Anyone With The Link - …"` → `pollVisibility: "Private Poll"` (research R8)
- [X] T009 [P] In `tests/polls-discovery.test.ts`, replace every old private visibility literal as in T008
- [X] T010 [P] In `tests/polls-admin-crud.test.ts`, replace every old private visibility literal as in T008
- [X] T011 [P] In `tests/polls-admin-participants.test.ts`, replace every old private visibility literal as in T008
- [X] T012 [P] In `tests/polls-editing-lock.test.ts`, replace every old private visibility literal as in T008
- [X] T013 [P] In `tests/polls-state-machine.test.ts`, replace every old private visibility literal as in T008
- [X] T014 [P] In `tests/openapi-contract.test.ts`, replace every old private visibility literal as in T008 (the enum assertions themselves are rewritten in T021)
- [X] T015 [P] In `devScripts/populate/pollsImportData.json`, re-express every poll's visibility in the three fields (old "Invitation Only" values → `"Private Poll"` + `"Invitation Only"`; old "Anyone With The Link" values → `"Private Poll"` + `"Anyone With The Link"`; "Show Who Voted" → `voteAnonymity: "No"`, "Do Not Show" → `"Yes"`; every poll gains both fields)
- [X] T016 Run `npx tsc --noEmit` and `npm test`; both must be green before any story phase begins. `git grep -n "Private Poll - "` over `src/` and `tests/` must return only `src/public/adminCard.js` (repaired in T017)

**Checkpoint**: the model is the three-field model, every server consumer uses the two-field
predicate, and the suite is green against polls built the new way.

---

## Phase 3: User Story 1 — Three plain decisions (Priority: P1) 🎯 MVP

**Goal**: the admin card offers visibility as two options, reveals `Sharing Mode` and
`Anonymous Votes` only for a private poll with sensible defaults, hides them without clearing, saves
them, and shows them on the read-only face in the same place.

**Independent Test**: open a never-voted poll for editing; the three controls behave as
`quickstart.md` US1 describes; save; the read-only face shows the values; card height is identical
between forms.

- [X] T017 [US1] In `src/public/adminCard.js`, narrow the local `POLL_VISIBILITIES` copy to the two values and add `POLL_SHARING_MODES` and `VOTE_ANONYMITIES` arrays beside it (contracts/ui-contracts.md)
- [X] T018 [US1] In `src/public/adminCard.js` editing form, render two `radioGroup()`s — `"pollSharingMode"` captioned `"Sharing Mode"` and `"voteAnonymity"` captioned `"Anonymous Votes"`, each seeded from `p.<field>`, passing `hasVotes` as `frozen`, and calling `markDirty(field, v)` on change — inside one container element appended to the mechanics row immediately after the `Poll Visibility` group; set the container's `hidden` to `v === "Public Poll"` initially and inside the visibility radio's existing `onChange` beside `applyVoterLimitAvailability(v)`; never touch the draft when hiding (research R5)
- [X] T019 [US1] In `src/public/adminCard.js` `renderReadOnly()`, append `readOnlyField("Sharing Mode", current.pollSharingMode, "card-field--stacked")` and `readOnlyField("Anonymous Votes", current.voteAnonymity, "card-field--stacked")` to the `card-mechanics` block after `Poll Visibility`, only when `current.pollVisibility !== "Public Poll"` (research R6)
- [X] T020 [US1] In `src/polls/service.ts` `validatePollFields`, add two branches immediately after the `pollVisibility` branch and **before the roster reconciliation block** (which reads `$set.pollSharingMode`, so it must already be populated): when `body.pollSharingMode !== undefined`, validate it against `POLL_SHARING_MODES` (`AdminError(400, "Invalid pollSharingMode.")`) and `$set` it; likewise `voteAnonymity` against `VOTE_ANONYMITIES` (`AdminError(400, "Invalid voteAnonymity.")`). The freeze guard is added in T026 (research R4)
- [X] T021 [P] [US1] In `postman/openapi.json`, narrow the three `pollVisibility` enums (`AdminPollDetail`, `AdminPollSummary`, the `POST /api/admin/polls/{pid}/publish` request body) to `["Public Poll", "Private Poll"]`; add `pollSharingMode` and `voteAnonymity` (with their enums) as required properties on `AdminPollDetail` and `AdminPollSummary` and as optional properties on the publish body; rewrite the `pollVisibility` description to say it is one of three settings; leave `PollDetail` untouched (contracts/api-endpoints.md)
- [X] T022 [P] [US1] In `tests/openapi-contract.test.ts`, assert the `pollVisibility` enum has exactly the two values at all three sites, that `AdminPollDetail` and `AdminPollSummary` require `pollSharingMode` and `voteAnonymity` with their enums, and that `PollDetail` has neither property
- [X] T023 [P] [US1] In `tests/polls-admin-crud.test.ts`, add cases: a poll created via `POST /api/admin/polls` has `pollSharingMode: "Anyone With The Link"` and `voteAnonymity: "Yes"`; publishing with both fields stores and echoes them; publishing `pollVisibility: "Public Poll"` on a private poll leaves both fields as stored (FR-004); publishing `pollSharingMode: "Anyone With The Link"` **alone** on a private `Invitation Only` poll that has an invited list leaves `invitedVoterList`, `bannedVoterList` and `currentVotes` exactly as stored while the response reflects the new mode (spec Edge Cases — the roster block must not run when no list is in the body); an invalid value for either yields `400` with the exact message and no change (FR-014); an old five-word visibility value yields `400 Invalid pollVisibility.`
- [X] T024 [P] [US1] In `tests/poll-card-assets.test.ts`, assert the shipped `adminCard.js` contains the captions `"Sharing Mode"` and `"Anonymous Votes"` and none of the old five-word visibility strings
- [X] T025 [US1] Complete the US1 scenario in `quickstart.md` in a browser, including the two height measurements for SC-005 (public and private poll); record the pixel values

**Checkpoint**: an administrator can set all three settings on a never-voted poll and read them
back; the suite is green.

---

## Phase 4: User Story 2 — Settings freeze once voted (Priority: P2)

**Goal**: all three settings are frozen on the card and refused by the server once the poll has
ever been voted on, including after vote deletion.

**Independent Test**: vote on a poll, open it for editing — three frozen groups; delete the vote,
reopen — still frozen; replay a publish with either new field — `409` naming the field.

- [X] T026 [US2] In `src/polls/service.ts` `validatePollFields`, in the two branches added by T020, throw `AdminError(409, "pollSharingMode cannot be changed after the poll has received a vote.")` / `"voteAnonymity cannot be changed …"` when `hasEverVoted`, before the accept-list check, mirroring the `pollVisibility` branch (spec FR-013; research R4)
- [X] T027 [US2] In `tests/polls-admin-crud.test.ts`, add cases: after one vote, publishing `pollSharingMode` yields the exact `409` and the poll is unchanged; likewise `voteAnonymity`; after that vote is deleted the same requests still yield `409` (`hasEverBeenVotedOn`, FR-011); a request carrying only unrelated fields on a voted poll still succeeds
- [X] T028 [US2] Verify in a browser per `quickstart.md` US2 that the two new groups render frozen (static text with `is-frozen`) on a voted poll — the `frozen` argument wired in T018 — and that the replayed request's `409` text appears on the card's status line

**Checkpoint**: no route can change any of the three settings on a poll that has ever been voted
on.

---

## Phase 5: User Story 3 — Invitation-only keeps working (Priority: P3)

**Goal**: every invitation-dependent behaviour uses *private AND Invitation Only* and behaves
exactly as before; a public poll with a stale `Invitation Only` is public. This is the regression
guard for the silent-failure site named in the plan.

**Independent Test**: `quickstart.md` US3, all twelve steps, plus the suites below.

- [X] T029 [US3] In `src/public/adminCard.js`, re-base the client `isInvitationOnly()` to `session.poll.pollVisibility === "Private Poll" && session.poll.pollSharingMode === "Invitation Only"`; the section caption, empty-state text and Invite row it drives are unchanged (contracts/ui-contracts.md)
- [X] T030 [P] [US3] In `tests/polls-vote.test.ts`, add cases: an uninvited signed-in caller is refused (`403`, existing message) on a private `Invitation Only` poll and admitted on a private `Anyone With The Link` poll; a **public** poll stored with `pollSharingMode: "Invitation Only"` admits a signed-out visitor (FR-005)
- [X] T031 [P] [US3] In `tests/polls-discovery.test.ts`, add cases: a private `Invitation Only` poll appears on its invitee's `GET /api/polls` and not on an uninvited caller's; a public poll with a stale `Invitation Only` appears for everyone; a banned invitee does not see it
- [X] T032 [P] [US3] In `tests/polls-admin-participants.test.ts`, assert `notYetVoted` is present for a private `Invitation Only` poll and absent for a private `Anyone With The Link` poll and for a public poll with a stale `Invitation Only`
- [X] T033 [P] [US3] In `tests/polls-admin-crud.test.ts`, add duplicate cases: the duplicate of a private `Invitation Only` poll carries `pollSharingMode`, `voteAnonymity`, the invited list, the banned list and the not-yet-voted placeholders; the duplicate of a private `Anyone With The Link` poll carries the two fields and empty lists (FR-015)
- [X] T034 [US3] Complete the US3 scenario in `quickstart.md` in a browser with two ordinary accounts, including the participants caption and Invite row driven by T029

**Checkpoint**: no invitation-only behaviour depends on the visibility string; SC-002 holds.

---

## Phase 6: User Story 4 — Administrators see the fields; voters don't (Priority: P4)

**Goal**: every admin response carries the two fields; no voter-facing response does; nothing reads
`voteAnonymity`.

**Independent Test**: `quickstart.md` US4 and the "Anonymity has no reader" section.

- [X] T035 [P] [US4] In `tests/polls-admin-crud.test.ts`, assert `GET /api/admin/polls` rows, `GET /api/admin/polls/:pid`, the edit-session `poll`, the publish response and the duplicate response each carry `pollVisibility`, `pollSharingMode` and `voteAnonymity` (FR-019)
- [X] T036 [P] [US4] In `tests/polls-discovery.test.ts` and `tests/polls-vote.test.ts`, assert `GET /api/polls` rows and `GET /api/polls/:pid` contain neither `pollSharingMode` nor `voteAnonymity` for public and for private polls (FR-020)
- [X] T037 [P] [US4] In `tests/polls-admin-participants.test.ts`, add the no-reader test: two identically-voted private polls differing only in `voteAnonymity` return byte-identical bodies from `GET /api/admin/polls/:pid/results` and `…/participants` (spec FR-018; research R10)
- [X] T038 [US4] Complete the US4 scenario in `quickstart.md` against a running server

**Checkpoint**: all four stories independently demonstrable; the suite is green.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T039 [P] Review every region changed in `src/polls/store.ts`, `src/polls/service.ts`, `src/routes/pollsApi.ts` and `src/public/adminCard.js`: new code carries no explanatory, historical or requirement-citing comments; pre-existing comments are corrected only on lines that changed, never swept (constitution Principle VI; research R9)
- [X] T040 [P] Confirm nothing new is written to the browser console by `src/public/adminCard.js` and that the two new refusals reach the server log through the existing `AdminError` path (constitution Principle V) — *verified 2026-09-15: `adminCard.js` writes nothing to the console; the two refusals go through the same `AdminError` → `res.status(err.status).json(...)` path as every other setting refusal. That path answers the client and, as before this feature, does not write a server log line — unchanged behaviour, not extended, per Principle III*
- [X] T041 `npm test` and `npm run build` both green; `git grep -n "Private Poll - " -- src tests postman devScripts` returns nothing (SC-008); `git grep -n "INVITATION_ONLY_VISIBILITIES"` returns nothing — *verified 2026-09-15: 20 files / 478 tests green, build clean; the only `"Private Poll - "` hits are the three negative assertions that guard SC-008 and FR-001 (`poll-card-assets.test.ts:751`, `polls-admin-crud.test.ts:466-467`); `INVITATION_ONLY_VISIBILITIES` survives only in `specs/` and `architecture/` prose*
- [X] T042 Run the full `quickstart.md` validation end to end, including the release-step check
- [X] T043 [P] Update `README.md` at the project root for the three-field visibility model (what "Sharing Mode" and "Anonymous Votes" mean to an administrator); it must not reference `specs/`, `designDocs/`, `research/` or `architecture/` (constitution Documentation Deliverables)
- [X] T044 [P] Update `ARCHITECTURE.md` at the project root: the poll settings model and the single `isInvitationOnly` rule, with a Mermaid diagram if it carries the meaning better than prose (constitution Documentation Deliverables)
- [X] T045 Before first running the app locally, drop the local `polls` and `voteHistory` collections — two `drop()` calls, never `dropDatabase()`; leave `user`, `session`, `verification` and `email_change_requests` alone (spec FR-022)
- [ ] T046 Drop **only** the `polls` and `voteHistory` collections on the deployed instance as part of the release — two `drop()` calls, never `dropDatabase()`. Autodeploy from `dev` means there is no later moment to decide this (spec FR-022)
- [ ] T046a Immediately after T046, confirm on the deployed database that `user`, `session`, `verification` and `email_change_requests` still hold their documents and that an existing administrator can sign in without re-registering (SC-007). If they did not survive, the drop ran at the wrong scope and there is no recovery step — which is why this check exists

---

## Outstanding at the end of the implementation run (2026-09-15)

39 of 47 tasks are complete: every code, contract, test and documentation task. The eight
that remain all need something this environment does not have, and none is blocked on a
decision.

**Need a browser** — T025, T028, T034, T038, T042. These are the `quickstart.md` verification
passes: the US1 height measurement for SC-005, the frozen rendering and status-line text on a
voted poll, the two-account invitation walk-through, the admin-vs-voter response comparison,
and the full end-to-end run. Each names what to look for; run them against a local server.

**Need a database** — T045. Drop the local `polls` and `voteHistory` collections before first
running the app: every stored poll holds a five-word `pollVisibility` that no longer exists.
Two `drop()` calls, never `dropDatabase()`.

**Need the deployment** — T046, T046a. The same two drops on the deployed instance as part of
the release, and the check that the auth collections survived and an administrator can still
sign in.

Two things the run found that the plan did not say, both now recorded in the artefacts:

- On the publish route a voted poll is refused by the existing **update-mode gate** (`400`,
  listing the fields still allowed) *before* the validator's field-naming `409` is reached —
  exactly as for `pollVisibility`. The `409` branches exist and are unit-tested directly;
  `contracts/api-endpoints.md` and `quickstart.md` US2 step 8 now describe both layers.
- `AdminError` refusals answer the client and do not write a server log line; that is the
  pre-existing behaviour for every setting and was left as it is (T040).

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: depends on Phase 1. T002 → T003 → T004 → T005 → T006 in sequence
  (each compiles against the previous); T007 after T002; T008–T015 in parallel after T007; T016
  last. **Blocks every story.**
- **US1 (Phase 3)**: after Phase 2. T017 → T018 → T019 in sequence (same file); T020 independent of
  those; T021–T024 in parallel; T025 after all of them.
- **US2 (Phase 4)**: after US1's T020 (it extends those branches) and T018 (it verifies the
  `frozen` wiring). Otherwise independent of US3/US4.
- **US3 (Phase 5)**: after Phase 2 only. T029 is the last client change; T030–T033 in parallel.
- **US4 (Phase 6)**: after Phase 2 and T006/T021. T035–T037 in parallel.
- **Polish (Phase 7)**: after every story. T043/T044 in parallel; T045 whenever the app is first
  run locally; T046/T046a at release.

### A note on story independence

US1, US3 and US4 are independent after Phase 2. US2 is the one dependency: its server task extends
the branches US1 adds, and its browser check relies on the `frozen` argument US1 wires. Doing US2
before US1 would mean writing the branches twice.

### Parallel opportunities

- Phase 2: T008–T015 — eight files, no shared lines.
- US1: T021–T024 — contract file, three test files.
- US3: T030–T033 — four test files.
- US4: T035–T037 — three test files.
- Polish: T039, T040, T043, T044.

### Parallel example: Phase 2 literal repair

```bash
# After T007, launch together — one file each, identical substitution rule:
Task: "T008 tests/polls-vote.test.ts"
Task: "T009 tests/polls-discovery.test.ts"
Task: "T010 tests/polls-admin-crud.test.ts"
Task: "T011 tests/polls-admin-participants.test.ts"
Task: "T012 tests/polls-editing-lock.test.ts"
Task: "T013 tests/polls-state-machine.test.ts"
Task: "T014 tests/openapi-contract.test.ts"
Task: "T015 devScripts/populate/pollsImportData.json"
```

---

## Implementation Strategy

### MVP: Phases 1–3 (Setup + Foundational + US1)

1. T001 baseline.
2. Phase 2 in order; T016 must be green — this is where the compiler has found every server
   consumer of the old substring test.
3. US1 — the three controls, the read-only face, the contract, the tests, the height check.
4. **STOP and VALIDATE**: `quickstart.md` US1. At this point the feature is demonstrable and the
   old five-valued setting is gone.

### Incremental delivery

1. US2 — the freeze. Small; extends US1's branches.
2. US3 — the regression guard. No new capability; its tests are the proof that BC-2/BC-4 from
   the architecture document did not happen.
3. US4 — the API surface and the no-reader test.
4. Polish — comments, docs, the release-step drop and its check.

### Two things to keep visible throughout

- **The client predicate has no compiler.** T003 makes the server safe by construction; T029 is a
  hand edit in `adminCard.js`. If T029 is skipped, the participants section labels every poll
  "Participants" and the Invite row disappears from invitation-only polls, with no error anywhere.
- **`voteAnonymity` must stay unread.** T037 is the test that says so. If a later change makes it
  fail, the right response is to read spec FR-018 and the creator-role requirement, not to delete
  the test.
