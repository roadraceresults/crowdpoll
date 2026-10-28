# Specification Analysis Report — specs/019-NEWEST-POLL-TAB

## Record

| Record | Value |
|---|---|
| Feature directory | specs/019-NEWEST-POLL-TAB |
| Report created | 2026-09-21 16:14 |
| Analysis captured | 2026-09-21 16:14 |
| Last updated | 2026-09-21 16:19 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

Second analysis pass (the first pass's ten findings, all resolved, are recorded in `analyze-report-01.md`).

## Findings

- [X] **I3** · Inconsistency · HIGH · tasks.md T018(b), T025(e); spec.md FR-023  
  **Summary:** T018(b) asserts a member's Newest click produces "exactly one `/api/me/polls` request"; T025(e) asserts a sign-in with Newest open adds "exactly one more". Both count *page-wide*. But `recomputeTrending`'s filler query lists every open public poll, so in every test Trending holds the same polls and makes its own overlay call on page load (and on sign-in, `reset()` runs on **every** controller). The overlay fetcher does not consult the browser bucket before sending (`tabs.js:323-331`); the server floor (`ENV_MIN_MANUAL_REFRESH_INTERVAL` 1200 in this suite) refuses the second same-session call with 429 and the fetcher retries after `retryAfterMs` (L336-350). Page-wide the count is 2–3 and timing-dependent; the 018 test's own comment ("TRENDING must hold nothing, so no other tab has an overlay to ask for") records exactly this trap. As written, T018(b)/T025(e) fail or flake.  
  **Recommendation:** Count only overlay requests whose `pids` query equals the Newest ids, after `page.settle(1300)` for the floor, and expect exactly one of them with status 200 (a refused 429 + retry is 017 behaviour, FIX06); assert the Newest cards then show the member's voted/bookmarked state. Same for T025(e) after the sign-in. FR-023's "one call" stays true per tab; no spec change needed.  
  **Resolution:** tasks.md T018(b) and T025(e) now count only `/api/me/polls` requests whose `pids` name the Newest ids, after `page.settle(1300)`, expecting exactly one with status 200 and the cards showing the member's state (2026-09-21 16:16)

- [X] **L3** · Wording · LOW · contracts/ui-contracts.md "The tab" table (L19)  
  **Summary:** The row still says Refresh is "**enabled** (was disabled in 018)" while the resolved FR-021 and the same file's "Refresh control" row say it is disabled whenever the allowance is spent.  
  **Recommendation:** "**available** — disabled only while the tab's allowance is spent (018 disabled it permanently)".  
  **Resolution:** contracts/ui-contracts.md "The tab" row now reads "available — disabled only while the tab's allowance is spent" (edited as an explicit exception at the developer's request) (2026-09-21 16:18)

- [X] **L4** · Fragility · LOW · tasks.md T025(g)  
  **Summary:** "click Newest → … no further `newest-counts.json` request" holds only if the final click lands within the manual floor of the tab's `receivedAt` (re-activation refetches past `manualFloorMs`, `trending.js` activate). If (g) shares an `it` with the settles in (d)/(e), or the vote flow takes > 1.2 s, the refetch fires and the assertion fails for the wrong reason.  
  **Recommendation:** Put (g) in its own `it` with no `settle` before the final click, or assert the card state (totals, disabled Vote) rather than the absence of a refetch.  
  **Resolution:** option A — tasks.md T025(g) now asserts the Newest card's state synchronously after the click and drops the timing-bound "no refetch" claim (2026-09-21 16:19)

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001–FR-005 (stamp / clear / untouched / insert) | ✅ | T002, T003, T004, T012 | |
| FR-006 (no backfill; seed) | ✅ | T002, T034 | |
| FR-007 (index + guard) | ✅ | T002, T033 | |
| FR-008–FR-011 (eligibility, editing, order, cap) | ✅ | T006, T017, T021 | |
| FR-012, FR-013 (lock, run at start) | ✅ | T009, T012 (schedule assertion) | |
| FR-014, FR-015 (objects, live counts) | ✅ | T007, T020 | |
| FR-016, FR-017 (routes, 503) | ✅ | T010, T024, T030, T031 | |
| FR-018–FR-021 (fetch rules, copy, not dynamic, floor/Refresh) | ✅ | T011, T014, T016, T018, T025 | |
| FR-022 (empty state) | ✅ | T014, T018(c) | |
| FR-023 (overlay) | ⚠️ | T014, T018(b), T025(e) | **I3** — test wording, not coverage |
| FR-024 (cross-tab) | ✅ | T025(g) | see L4 |
| FR-025 (guests) | ✅ | T014, T018(a) | |
| FR-026, FR-027 (settings, bounds) | ✅ | T005, T011, T027–T030, T032 | |
| FR-028, FR-029 (018 superseded / unchanged) | ✅ | T016, T018, T022; existing tests | |
| SC-001, SC-004, SC-006, SC-007 | ✅ | T017, T020, T021 | |
| SC-002 | ✅ | T017(b) | two-browser check manual |
| SC-003 | ✅ | T025(f) | CDN half manual |
| SC-005 | ✅ | T033 | |
| SC-008 | ✅ | T032 | |
| SC-009 | ✅ | T001, T013, T038 | |

## Constitution Alignment Issues

None reported.

## Unmapped Tasks

None reported (T001/T013/T019/T023/T026/T035/T038 checkpoints; T036/T037 documentation deliverables; T039 quickstart walk-through).

## Metrics

- Total requirements: 29 FR + 9 SC = 38
- Total tasks: 39
- Coverage: 38/38 (100%); 1 requirement with a defective test mapping (FR-023)
- Ambiguity count: 0
- Duplication count: 0
- Critical issues: 0 · High: 1 · Medium: 0 · Low: 2

## Next Actions (as reported)

No CRITICAL issues. **I3 should be fixed before `/speckit-implement`** — it is the same class of defect as I1/I2 (a test assertion that contradicts how the page actually behaves) and will fail as written; it is a `tasks.md`-only edit to T018(b) and T025(e). L3 and L4 are one-line polish.

- I3: edit `tasks.md` T018(b) and T025(e) as recommended.
- L3: edit `contracts/ui-contracts.md` L19.
- L4: edit `tasks.md` T025(g).
