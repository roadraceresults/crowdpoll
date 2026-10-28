# Specification Analysis Report — specs/025-user-permissions

## Record

| Record | Value |
|---|---|
| Feature directory | specs/025-user-permissions |
| Report created | 2026-10-03 21:05 |
| Analysis captured | 2026-10-04 04:37 |
| Last updated | 2026-10-04 04:38 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

## Findings

- [X] **F1** · Inconsistency · CRITICAL · research.md R5; plan.md Design notes; tasks.md T022–T024; `src/polls/service.ts:327` (`viewerVoteBlock`) vs. `src/routes/tabsApi.ts:91–113` (`voteBlocks`)
  **Summary:** research.md R5 claims `viewerVoteBlock` is "the one place both the vote route... and the poll-card detail builder decide" a vote block — it isn't. `tabsApi.ts`'s `voteBlocks()` is a separate, hand-duplicated implementation (same two messages, re-typed) that feeds the personal-tabs overlay's `voteBlockedReason`, which is what the poll card actually reads to show "no working vote controls" (US2 Acceptance Scenario 1). `viewerVoteBlock`'s own doc comment names a `buildPollDetail` function that does not exist anywhere in `src/` — that comment is stale. As planned, T024 only edits `viewerVoteBlock`, so the vote route's 403 would correctly gain `no-vote-permission`, but the card's up-front banner (driven by `voteBlocks()`) would not — FR-010's "shown the same way other vote-blocking reasons are already explained" and US2's Acceptance Scenario 1 would silently fail.
  **Recommendation:** Before implementing US2 (and re-check US3/T029 for the same risk), add a research.md entry naming every place a vote-block or view-block reason reaches the client — at minimum `viewerVoteBlock` (service.ts) and `voteBlocks`/`personalListing` (tabsApi.ts) — and add a task to extend `voteBlocks()` with the same `Vote on Polls` branch T024 adds to `viewerVoteBlock`, with a test asserting the overlay's `voteBlockedReason` (not just the route's 403) carries the new reason.
  **Resolution:** added the seam-tracing note to plan.md's Design notes (research.md is outside this skill's editable set, so the content went to plan.md instead); added `tasks.md` T038 (extend `voteBlocks()` in `src/routes/tabsApi.ts`) and T039 (test the overlay's `voteBlockedReason`), and updated T025 to run them (2026-10-03 21:11).

- [X] **C1** · Underspecification · HIGH · tasks.md T029
  **Summary:** T029 reads "Wherever the personal-tabs/`/api/me/polls` lookup... currently decide" — the only task in `tasks.md` without a concrete file path, which `tasks-template.md`'s own rules require. This is a direct symptom of F1: neither `research.md` nor `plan.md` ever traced which file actually decides private-poll-link eligibility for a regular viewer (it is not the admin `/results` route at `pollsApi.ts:640`, and no dedicated `GET /api/polls/:pid` route exists).
  **Recommendation:** Resolve alongside F1: name the exact file(s) (likely `tabsApi.ts`'s overlay/membership code, possibly more than one route) before `/speckit-implement` reaches Phase 5.
  **Resolution:** named the file — `privateTab()` in `src/polls/userPolls.ts`, feeding `POST /api/tabs/private/refresh` — and gave T029 the exact empty-result shape to return. Tracing it precisely surfaced a correction beyond this finding's original scope: `spec.md`'s FR-013/User Story 3 wrongly named "Favorites" as a tab `View Polls` empties — `favouritesTab()` is public-poll-only, so it's governed by FR-014, not `View Polls`; the real target is the separate "My Private Polls" tab. Corrected FR-013, User Story 3's body/Acceptance Scenario 2, and the related edge case in `spec.md`. Also flagged, **not resolved**: Live Results' membership registry (`src/live/registry.ts`) has no poll-visibility filter, so a private poll added before the ability was lost would keep showing there — noted as an open follow-up in both `spec.md` FR-013 and `tasks.md` T029, not decided here. Since this changes what FR-013 means, `designDocs/025-high-level-requirements-USER-PERMISSIONS` and `architecture/025-user-permissions/architecture.md` (its Ambiguity A1 resolution) carry the same "Favorites and Live Results" wording and likely need the same correction — this skill does not edit outside `specs/025-user-permissions/`, so that's for you to apply by hand or via `/speckit-mdd-architecture`. (2026-10-03 21:11)

- [X] **G3** · Inconsistency · HIGH · tasks.md:172–175 ("touch entirely different files"), :219–224 (Parallel Team Strategy)
  **Summary:** C1's fix (T029) and F1's fix (T038) both land in `src/routes/tabsApi.ts` — US2 and US3 (different route handlers in that same file) — yet `tasks.md` still claims "US2 and US3 touch entirely different files" and advises three developers can take US1/US2/US3 fully in parallel with no file overlap. Following that advice as written risks two people editing `tabsApi.ts` at once.
  **Recommendation:** Correct both passages: note that US2 (T038) and US3 (T029, T031) both touch `tabsApi.ts` (different functions/routes), so a parallel team should sequence those two edits or assign both to one person.
  **Resolution:** rewrote `tasks.md`'s User story dependencies paragraph, Parallel team strategy, the "proceed entirely in parallel" bullet and the closing Notes bullet to name `src/routes/tabsApi.ts` as shared by T038/T029/T031; also added T038/T039 to the US2 line of the parallel example (2026-10-04 04:38).

- [X] **G2** · Inconsistency · HIGH · tasks.md:119–126 (Phase 5 Goal / Independent Test)
  **Summary:** Phase 5's own header still says "sees empty Favorites/Live Results tabs" / "their Favorites/Live Results tabs are empty" — directly contradicted by T028/T029 three lines below it in the same file, which correctly scope this to "My Private Polls" only.
  **Recommendation:** Reword the Goal and Independent Test lines to say "My Private Polls tab" (and drop the blanket Live Results claim, matching T029's flagged exclusion).
  **Resolution:** reworded `tasks.md` Phase 5's Goal and Independent Test to the "My Private Polls" tab, stated Favorites is unaffected, and pointed the Live Results case to T029's follow-up; the matching line in Incremental delivery was updated too (2026-10-04 04:38).

- [X] **G4** · Inconsistency / Constitution · HIGH · plan.md:100–121 (Project Structure) vs. Constitution Check row III ("Touched files are enumerated in full... nothing outside that list changes")
  **Summary:** `src/polls/userPolls.ts` (touched by T029) isn't listed at all; `tabsApi.ts`'s entry only mentions the `/api/live/:pid` guard, not T029's `/api/tabs/private/refresh` gate or T038's `voteBlocks()` fix; the test list is missing `tests/polls-discovery.test.ts`, `tests/client-home.test.ts` and `tests/session-cache.test.ts`. Row III's "enumerated in full" claim is now false.
  **Recommendation:** Add `src/polls/userPolls.ts` and the three missing test files to Project Structure; expand `tabsApi.ts`'s annotation to cover T029/T038.
  **Resolution:** `plan.md` Project Structure now lists `src/polls/userPolls.ts` (marked read-only, since T029 reuses its empty-tab shape from `tabsApi.ts` without editing it), annotates `tabsApi.ts` with T038/T029/T031, and adds `session-cache`, `client-home` and `polls-discovery` to the test list (2026-10-04 04:38).

- [X] **E1** · Coverage Gap · MEDIUM · spec.md FR-014 / US3 Acceptance Scenario 3; tasks.md Phase 5
  **Summary:** FR-014 ("public polls remain fully visible... this feature MUST NOT change that") has no task — implementation or test — that touches it at all; it's correct only by nothing in Phase 5 happening to touch public-poll code paths, which is fragile as a guarantee.
  **Recommendation:** Add an explicit assertion to T028 (or a new case) that a `View Polls`-denied user can still fetch/see a public poll through the normal discovery routes.
  **Resolution:** added a second case to `tasks.md` T028 asserting a `View Polls`-denied user still gets a normal result from `POST /api/tabs/favourites/refresh` for a bookmarked public poll (2026-10-03 21:11).

- [X] **E2** · Coverage Gap · MEDIUM · spec.md SC-006; tasks.md T019
  **Summary:** SC-006 (the at-cap "Only your newest N polls are shown" notice for a non-admin creator) is implemented by T019 but has no dedicated test task in Phase 3 — it's only exercised manually, by quickstart Q3 (which doesn't test the at-cap case either; Q3 tests the no-tab-bar case, not the cap message).
  **Recommendation:** Add a test case to T007 or a new US1 test task: a non-admin creator with more polls than `ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS` sees the capped-list notice, worded without the "Use Search" hint.
  **Resolution:** added `tasks.md` T040 (new US1 test task) and included it in T021's run list (2026-10-03 21:11).

- [X] **F2** · Inconsistency · MEDIUM · plan.md Constitution Check, Principle V row
  **Summary:** The row claims "each new refusal path logs informatively server-side, consistent with the existing `[admin]`-style log lines" — but no task in `tasks.md` adds such logging, and the actual precedent (`createRequireAdmin`, `service.ts:758–781`) logs nothing on refusal; existing banned/not-invited/guest refusals are likewise silent-but-clear-response, never logged. The row's own cited precedent doesn't exist.
  **Recommendation:** Correct the row's rationale to say refusals follow the existing (unlogged) authorization-refusal convention — Principle V is still satisfied because every refusal returns a clear, non-crashing response — rather than claim new logging that would itself be inconsistent with established practice (and risks the noise the Performance section warns against).
  **Resolution:** rewrote `plan.md`'s Constitution Check Principle V row to state the actual (unlogged) refusal convention instead of the fabricated `[admin]`-style logging claim (2026-10-03 21:11).

- [X] **G1** · Inconsistency · MEDIUM · plan.md:15 (Summary)
  **Summary:** Still reads "`View Polls` gates private-poll links, the Favorites/Live Results tabs' contents..." — stale against the corrected FR-013 and against this same file's own Design notes nine lines below.
  **Recommendation:** Reword to "the My Private Polls tab's contents (not Favorites, which stays public-only and ungated)".
  **Resolution:** reworded `plan.md`'s Summary as recommended (2026-10-04 04:38).

- [X] **B1** · Ambiguity · LOW · spec.md FR-010/FR-019, SC-003/SC-007 ("clear reason"/"clear explanation")
  **Summary:** Vague adjectives, but each is anchored to an existing, already-implemented pattern ("the same way other vote-blocking reasons are already explained" / "matching the refusal pattern already used for a blocked vote attempt"), so they're testable by comparison, not free-floating.
  **Recommendation:** No action needed.
  **Resolution:** accepted as-is — no artifact change required; wording is already anchored to existing precedent (2026-10-03 21:11).

- [X] **G5** · Inconsistency · LOW · plan.md:44–46 (Scale/Scope)
  **Summary:** "5 test files" undercounts; the actual set (per `tasks.md`) is 9: `polls-admin-crud`, `pages`, `client-home`, `openapi-contract`, `polls-vote`, `bookmarks`, `live-results`, `polls-discovery`, `session-cache`.
  **Recommendation:** Update the count; cosmetic, no execution risk.
  **Resolution:** `plan.md` Scale/Scope now says 9 test files and adds the "My Private Polls" refresh route (2026-10-04 04:38).

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 | Yes | T002–T006 | |
| FR-002 | Yes | T002 | |
| FR-003 | Yes | T011, T018 | |
| FR-004 | Yes | T007d, T008, T013, T014 | |
| FR-005 | Yes | T007d, T015, T019 | |
| FR-006 | Yes | T008, T014 | |
| FR-007 | Yes | T009, T014 | |
| FR-008 | Yes | T009, T010, T014, T016 | |
| FR-009 | Yes (regression) | T021 | relies on pre-existing admin tests still passing |
| FR-010 | Partial | T022, T024 | F1 — card display path untested/unimplemented |
| FR-011 | Yes | T023, T024 | |
| FR-012 | Partial | T028, T029 | C1 — no concrete file |
| FR-013 | Partial | T028, T029 | same seam as FR-012 |
| FR-014 | No | — | E1 |
| FR-015 | Yes | T017 | |
| FR-016 | N/A | — | explicitly excluded; correctly has no task |
| FR-017 | N/A | — | explicitly excluded; correctly has no task |
| FR-018 | Yes | T002 | |
| FR-019 | Yes | T026, T027, T030, T031 | |
| SC-001 | Yes | T008 | |
| SC-002 | Yes | T009 | |
| SC-003 | Partial | T022 | F1 |
| SC-004 | Yes | T023 | |
| SC-005 | Yes (regression) | T021 | |
| SC-006 | Partial | T019 | E2 — impl only, no test |
| SC-007 | Yes | T026, T027 | |

## Constitution Alignment Issues

F2 — a documentation-accuracy issue in `plan.md`'s Constitution Check, not an actual principle violation in the planned behavior.

## Unmapped Tasks

None reported.

## Metrics

- Total Requirements (FR+SC): 26
- Total Tasks: 37
- Coverage % (≥1 task, counting "Partial"): 24/26 fully or partially covered = 92%; fully covered without caveats: 20/26 = 77%
- Ambiguity Count: 1 (LOW, no action needed)
- Duplication Count: 0
- Critical Issues Count: 1 (F1)

## Next Actions (as reported)

F1 is CRITICAL — resolve before `/speckit-implement`. It would otherwise produce a US2 implementation that passes its route-level test but fails its own acceptance scenario in the browser (the exact kind of gap `quickstart.md` Q7 would catch late, after code is written). C1 is the same root cause surfacing in US3.

Suggested path: re-open `/speckit-plan` (or hand-edit `research.md`/`plan.md`/`tasks.md`) to:
1. Add the missing research entry naming every vote-block/view-block display seam (`viewerVoteBlock` and `tabsApi.ts`'s `voteBlocks`/`personalListing`/the `/api/me/polls` overlay).
2. Extend T024 (or add a sibling task) to update `voteBlocks()` too, with a test on the overlay's `voteBlockedReason`.
3. Give T029 a concrete file path once that tracing is done.
4. Pick up E1/E2/F2 at the same time — all three are small, mechanical edits to `tasks.md`/`plan.md`.
