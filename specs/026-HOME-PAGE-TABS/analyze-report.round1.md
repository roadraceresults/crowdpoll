# Specification Analysis Report — specs/026-HOME-PAGE-TABS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/026-HOME-PAGE-TABS |
| Report created | 2026-10-05 14:55 |
| Analysis captured | 2026-10-05 15:03 |
| Last updated | 2026-10-05 15:03 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

## Findings

- [X] **C1** · Coverage · HIGH · spec FR-014–FR-018; tasks T010, T012, T013; plan Constraints  
  **Summary:** The old link route returns `403` to a caller without `View Polls`, and 025 says `View Polls` gates private-poll links and every poll card. `resolveSharedLink` and its tests never mention `View Polls`. A user without the permission could land on a poll, or have a view recorded for a poll they can't see.  
  **Recommendation:** In T012, treat a caller without `View Polls` as "not shown" (`/?notice=unavailable`, no view). Add a case for it in T010. This matches `mayWatch`'s first rule.
  **Resolution:** T010 and T012 now treat a caller without `View Polls` as "not shown" (tasks.md) (2026-10-05 14:59)

- [X] **I1** · Inconsistency · HIGH · tasks T009, T018, T019; tests/client-home.test.ts:1556-1612, tests/polls-discovery.test.ts:172, tests/pages.test.ts:191  
  **Summary:** Three existing tests exercise behavior this feature deletes. `client-home` tests the `localStorage` `crowdpoll:sharedPid` hand-off, `polls-discovery` calls the removed `/link` route, and `pages.test.ts` asserts `GET /?PID=anything` serves the page. T009 only renames tab ids, so nothing schedules rewriting these.  
  **Recommendation:** Add a US1 task, after T019, that rewrites those three tests to the new outcomes (server redirect and landing parameters, no `localStorage`, no `/link`).
  **Resolution:** added T055 rewriting the three tests (tasks.md) (2026-10-05 14:59)

- [X] **A1** · Underspecification · MEDIUM · tasks T012, T013; src/routes/pages.ts (PageDeps = { sessions, config, db })  
  **Summary:** T012 passes `rosters` to `resolveSharedLink`, but the pages router has no `rosters`; it lives in the app context used by `tabsApi`. T013 doesn't say to widen `PageDeps` or touch `src/server.ts`.  
  **Recommendation:** Either add `src/server.ts` and `PageDeps` wiring to T013, or have `resolveSharedLink` read `poll_invitations` through `db` as `voteBlocks` does, and drop `rosters` from the signature. The second is preferred; it needs no wiring.
  **Resolution:** T012 reads `poll_invitations`/`poll_bans` through `db`; `rosters` dropped (tasks.md) (2026-10-05 14:59)

- [X] **C2** · Coverage · MEDIUM · spec SC-008  
  **Summary:** The only SC that needs buildable work (personal tabs load in the same time as before) has no task or measurement.  
  **Recommendation:** Add a Polish task: a test, like `db-explain-guard.test.ts`, that the four tab queries use `user_polls_email_updated`.
  **Resolution:** added T056, an index-use test for the four tab queries (tasks.md) (2026-10-05 14:59)

- [X] **C3** · Coverage · LOW · spec FR-021 (OAuth); tasks T011, T015  
  **Summary:** T015 implements the OAuth callback carrying the pid, but T011 lists no OAuth case.  
  **Recommendation:** Add an OAuth callback case to `tests/signin-mode.test.ts` or T011.
  **Resolution:** T011 gains the OAuth callback case, in `tests/signin-mode.test.ts` (tasks.md) (2026-10-05 14:59)

- [X] **C4** · Coverage · LOW · spec US4 scenario 4 (FR-003); task T031  
  **Summary:** Nothing asserts the three new tabs stay visible to a user without `View Polls`, `Vote on Polls` or `Create Poll`.  
  **Recommendation:** Add that assertion to T031.
  **Resolution:** T031 gains the all-tabs-visible-without-permissions assertion (tasks.md) (2026-10-05 14:59)

- [X] **D1** · Duplication · LOW · tasks T005, T048  
  **Summary:** Both change `placeBookmark` to file watches in Watching.  
  **Recommendation:** Keep it in T005 and trim T048 to the cap dialog and notices.
  **Resolution:** `placeBookmark` change kept in T005, trimmed from T048 (tasks.md) (2026-10-05 14:59)

- [X] **A2** · Ambiguity · LOW · task T033; plan Project Structure  
  **Summary:** T033 says `isPublished` lives in "`store.ts` or `access.ts`", while the plan puts the access rule in `access.ts` and `isPubliclyListable` in `store.ts`.  
  **Recommendation:** Pick `store.ts`, beside `isPubliclyListable`, which it wraps.
  **Resolution:** T033 puts `isPublished` in `store.ts` (tasks.md) (2026-10-05 14:59)

- [X] **I2** · Inconsistency · LOW · plan R12; tasks T032, T030  
  **Summary:** Tasks create two test files the plan doesn't list: `shared-link-unpublished.test.ts` and `ui-voice.test.ts`.  
  **Recommendation:** Add them to R12.
  **Resolution:** R12 lists `shared-link-unpublished.test.ts` and `ui-voice.test.ts` (research.md) (2026-10-05 14:59)

## Coverage Summary

| Requirement | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001–FR-005 | Yes | T002–T008, T027–T031 | |
| FR-006 | Yes | T005, T030 | Rename is interface-only |
| FR-007–FR-013 | Yes | T002, T023–T026, T045 | |
| FR-014–FR-019 | Yes | T010, T012–T013, T018–T019, T033–T036 | See C1, A1 |
| FR-020–FR-024 | Yes | T011, T013–T017 | See C3 |
| FR-025–FR-028 | Yes | T041–T049 | |
| FR-029–FR-031 | Yes | T037–T040, T029 | |
| FR-032–FR-033 | Yes | T012, T024, T022 | |
| SC-001–SC-007 | Yes | covered by the tests above | |
| SC-008 | No | none | See C2 |

## Constitution Alignment Issues

None reported.

## Unmapped Tasks

None reported. (T001, T053 and T054 are baseline, walkthrough and report tasks.)

## Metrics

- Requirements: 33 FR and 8 SC (7 outcome measures, 1 needing buildable work)
- Tasks: 54
- Coverage: 33/33 FR (100%), 7/8 SC (SC-008 uncovered)
- Ambiguities: 1 · Duplications: 1 · Critical issues: 0

## Next Actions (as reported)

- No CRITICAL issues, but resolve C1 and I1 before `/speckit-implement`.
- A1, C2, C3, C4, D1, A2 and I2 are small edits to `tasks.md` and plan R12.
- Run `/speckit-analyze` again after resolving.
