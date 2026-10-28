# Specification Analysis Report — specs/019-NEWEST-POLL-TAB

## Record

| Record | Value |
|---|---|
| Feature directory | specs/019-NEWEST-POLL-TAB |
| Report created | 2026-09-21 15:54 |
| Analysis captured | 2026-09-21 16:12 |
| Last updated | 2026-09-21 16:12 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

## Findings

- [X] **I1** · Inconsistency · HIGH · spec.md FR-021, US3 scenario 4; contracts/ui-contracts.md "Refresh control"; quickstart.md US3 step 3; tasks.md T025(d); designDocs 019 "How it's published and served" bullet 3  
  **Summary:** All five say Refresh on Newest shows the "Please wait n s" notice when no allowance is left, "exactly as for Trending". Trending does not do that: `updateRefreshButton` (`tabs.js:247-250`) **disables** the button while `nextAllowedIn(activeTab) > 0`, and `trending.js`'s `refresh()` returns silently on `!canRequest`. The notice belongs to bookmarks/votes/overlay refusals. FR-021 contradicts its own "exactly as Trending" clause; T025(d) as written cannot pass (a disabled button cannot be clicked, and nothing shows a notice).  
  **Recommendation:** Reword FR-021 / US3-4 / ui-contract / quickstart / T025(d): "the Refresh control is disabled while the Newest allowance is spent and re-enabled when a token returns, as for Trending; a press with a token refetches." Mirror the sentence in the source requirements.  
  **Resolution:** option A — FR-021 and US3 scenario 4 in spec.md, the "Refresh control" row in contracts/ui-contracts.md, quickstart.md US3 step 3 and tasks.md T025(d) now state that Refresh is disabled while the Newest allowance is spent and re-enabled when a token returns, with no notice, as on Trending (2026-09-21 15:58)

- [X] **I2** · Inconsistency · HIGH · tasks.md T018(a)  
  **Summary:** Asserts `#refreshBtn` is **enabled** immediately after the guest's first click on Newest. Activation spends the tab's only token (harness `ENV_MANUAL_REFRESH_BURST: "1"`), so `updateRefreshButton` disables it until the floor passes — the existing Favorites test (`client-home.test.ts:112-113`) asserts exactly this `disabled` state. As specified the test fails.  
  **Recommendation:** Assert `disabled === true` right after activation and `false` after `page.settle(floor + margin)` (the pattern at `client-home.test.ts:105-131`); the meaningful check versus 018 is that it becomes enabled at all.  
  **Resolution:** tasks.md T018(a) now asserts `#refreshBtn` is disabled immediately after activation and enabled after `page.settle(1300)`, in contrast to 018's permanent disable (2026-09-21 16:01)

- [X] **C1** · Constitution · MEDIUM · tasks.md T004; constitution VI  
  **Summary:** T004 instructs extending `updatePoll`'s doc comment with "…and clears `launched_at`; the transition into OPEN stamps `launched_at`". Principle VI forbids comments that explain what the code does; the governance clause permits *correcting* a pre-VI comment when the surrounding code changes, not growing it.  
  **Recommendation:** Drop the comment edit from T004 (leave the pre-existing sentence untouched), or reduce the existing clause rather than extend it.  
  **Resolution:** option A — tasks.md T004 no longer extends `updatePoll`'s doc comment; it says to leave the comment as it is, with the T012 tests as the documentation (2026-09-21 16:03)

- [X] **U1** · Underspecification · MEDIUM · tasks.md T030  
  **Summary:** "each with an `x-aliases`-free second path entry … or document the aliases in the description as the Trending paths do" offers two shapes. `openapi.json` documents Trending only as `/api/trending/counts` and `/api/trending/cards` (the `.json` names appear in `summary`), and `openapi-contract.test.ts` enumerates those alias-less paths; T031 follows that convention.  
  **Recommendation:** Make T030 definite: document `/api/trending/newest-counts` and `/api/trending/newest-cards` as the paths, name `newest-counts.json` / `newest.json` in `summary`/`description` exactly as the Trending entries do.  
  **Resolution:** tasks.md T030 now specifies exactly two OpenAPI paths (`/api/trending/newest-counts`, `/api/trending/newest-cards`) with the `.json` names in `summary` and the aliases in `description`, mirroring the Trending entries (2026-09-21 16:05)

- [X] **G1** · Coverage · MEDIUM · spec.md FR-024; tasks.md  
  **Summary:** Cross-tab vote/bookmark propagation into the Newest copy has no automated task; it is covered only by quickstart US3 step 5. The plan relies on inherited behaviour (`applyVote` iterating controllers), but a regression there would surface only manually.  
  **Recommendation:** Add to T025: with a poll listed on both Trending and Newest, vote from the Trending card, switch to Newest → the card shows the vote with no extra request.  
  **Resolution:** tasks.md T025 gained sub-item (g): vote and bookmark from the Trending card are reflected on the Newest card with no further request (2026-09-21 16:07)

- [X] **G2** · Coverage · LOW · spec.md FR-013; tasks.md T009  
  **Summary:** `runAtStart: true` is set but no test asserts the Newest schedule carries it (none asserts it for Trending either).  
  **Recommendation:** Optional: in `tests/newest.test.ts`, assert `buildSweepSchedules(config, services).find(s => s.name === "newestSweep").runAtStart === true` and `lockId === 10`.  
  **Resolution:** option A — tasks.md T012 gained a `describe("schedule")` asserting the newestSweep entry's `runAtStart`, `lockId` and `intervalMs` (2026-09-21 16:09)

- [X] **G3** · Coverage · LOW · spec.md FR-015; tasks.md T006/T020  
  **Summary:** "Counts come from the live counters, never the row" is implemented via `readOrRebuildCounts` but no Newest test compares a published `voteCount` to a live counter that differs from the flushed row.  
  **Recommendation:** Optional: in T020, after `countVote` without a flush, assert the published counts object carries the live total.  
  **Resolution:** tasks.md T020 now asserts the published counts object carries the live counter total (three unflushed `countVote`s → `voteCount: 3`) (2026-09-21 16:11)

- [X] **L1** · Redundancy · LOW · tasks.md T033  
  **Summary:** The `update polls set launched_at = created_at where poll_state = 'OPEN'` step is unnecessary: the guard seeds through `polls(ctx).insertOne` → `insertPoll`, which after T004 already writes `launched_at` for OPEN rows.  
  **Recommendation:** Remove the UPDATE from T033; keep the `listings()` entry.  
  **Resolution:** tasks.md T033 no longer runs an UPDATE; it notes the seeded OPEN rows already carry `launched_at` via `insertPoll` (2026-09-21 16:12)

- [X] **L2** · Wording · LOW · tasks.md T012  
  **Summary:** "through `updatePoll` from `tests/helpers/poll-fixtures.js`" — the fixtures export `polls(ctx).updateOne({ _id }, { $set })`; `updatePoll` itself lives in `src/polls/store.js`.  
  **Recommendation:** Say "through `polls(ctx).updateOne` (or `updatePoll` from `src/polls/store.js`)".  
  **Resolution:** tasks.md T012 now names `polls(ctx).updateOne` from the fixtures (or `updatePoll` from `src/polls/store.js`) (2026-09-21 16:13)

- [X] **T1** · Terminology · LOW · data-model.md §4 vs research.md R2 / plan.md  
  **Summary:** Data model names `NewestCountsObject` / `NewestCardsObject`; research and plan say the code reuses `TrendingCountsObject` / `TrendingCardsObject` and `TrendingListing`. Same shape, two names.  
  **Recommendation:** One sentence in data-model §4: "named here for reading; in code these are the `Trending*` types".  
  **Resolution:** plan.md's source tree note for `src/trending/recompute.ts` now states that no `Newest*` types exist and that data-model.md's `NewestCountsObject` / `NewestCardsObject` are reading names for the `Trending*` types (2026-09-21 16:14)

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001–FR-004 (stamp / clear / untouched) | ✅ | T002, T003, T004, T012 | edge tests in T012 |
| FR-005 (insert value) | ✅ | T004, T012 | |
| FR-006 (no backfill; seed) | ✅ | T002, T034 | |
| FR-007 (index + guard) | ✅ | T002, T033 | see L1 |
| FR-008, FR-009 (eligibility, editing) | ✅ | T006, T017, T021 | |
| FR-010, FR-011 (order, cap) | ✅ | T006, T017 | |
| FR-012 (one instance, lock) | ✅ | T009 | lock mechanism inherited (`sweeps-lock.test.ts`) |
| FR-013 (run at start) | ✅ | T009 | see G2 |
| FR-014 (two objects, cadence) | ✅ | T007, T020 | |
| FR-015 (live counts) | ✅ | T006 | see G3 |
| FR-016, FR-017 (routes, 503) | ✅ | T010, T024, T030, T031 | |
| FR-018, FR-019 (fetch rules, copy, config field) | ✅ | T011, T014, T025 | |
| FR-020 (not dynamic) | ✅ | T010, T025(f) | |
| FR-021 (browser floor, Refresh) | ⚠️ | T016, T018, T025 | **I1, I2** |
| FR-022 (empty state) | ✅ | T014, T018(c) | |
| FR-023 (overlay) | ✅ | T014, T018(b), T025(e) | |
| FR-024 (cross-tab) | ⚠️ | — (quickstart only) | **G1** |
| FR-025 (guests) | ✅ | T014, T018(a) | |
| FR-026 (settings surfaced) | ✅ | T005, T011, T027, T028, T029, T030 | |
| FR-027 (bounds) | ✅ | T005, T032 | |
| FR-028 (018 superseded) | ✅ | T016, T018, T022 | |
| FR-029 (018 markup unchanged) | ✅ | existing six-tab tests | no new task needed |
| SC-001, SC-006, SC-007 | ✅ | T021, T017 | |
| SC-002 (identical for visitors) | ✅ | T017(b) determinism | two-browser check manual |
| SC-003 (no app requests for guests) | ✅ | T025(f) | CDN half manual |
| SC-004 (counts only on unchanged set) | ✅ | T020 | |
| SC-005 (index walk) | ✅ | T033 | |
| SC-008 (config bounds) | ✅ | T032 | |
| SC-009 (regression) | ✅ | T001, T013, T038 | |

## Constitution Alignment Issues

C1 (Principle VI, MEDIUM — a task instruction, not a design conflict; one-line fix). No MUST-principle violation in spec or plan.

## Unmapped Tasks

None reported. T001/T013/T019/T023/T026/T035/T038 are phase checkpoints; T036/T037 are the constitution's documentation deliverables; T039 is the quickstart walk-through.

## Metrics

- Total requirements: 29 FR + 9 SC = 38
- Total tasks: 39
- Coverage: 38/38 with ≥1 task (100%); 2 requirements with a defective or manual-only mapping (FR-021, FR-024)
- Ambiguity count: 1 (U1)
- Duplication count: 0
- Critical issues: 0 · High: 2 · Medium: 3 · Low: 5

## Next Actions (as reported)

No CRITICAL issues; you may proceed to `/speckit-implement`, but **I1 and I2 should be fixed first** — both describe test assertions that will fail against the real `tabs.js` behaviour, and I1 is also a wrong sentence in the spec, the ui-contract, the quickstart and the source requirements. The rest are one-line task edits.

- I1: edit `spec.md` FR-021 and US3 scenario 4, `contracts/ui-contracts.md`, `quickstart.md` US3 step 3, `tasks.md` T025(d), and the source requirements' third bullet (a small `/speckit-specify` refinement or manual edits).
- I2, C1, U1, G1, L1, L2: manual edits to `tasks.md` (and `data-model.md` for T1).
