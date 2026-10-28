# Specification Analysis Report — specs/020-LIVE-RESULTS-X

## Record

| Record | Value |
|---|---|
| Feature directory | specs/020-LIVE-RESULTS-X |
| Report created | 2026-09-22 13:29 |
| Analysis captured | 2026-09-22 13:36 |
| Last updated | 2026-09-22 13:36 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

## Findings

- [X] **I1** · Inconsistency · HIGH · research.md R3; tasks.md T006, T008  
  **Summary:** R3 states "`render()` calls `updateActionButtons` before the state updaters". The real order (`pollCard.js:1016-1023`) is the reverse: `updateClosedState()` runs first and itself calls `updateBlockedState()` then `updateEditingState()`; `updateActionButtons()` runs **last**. The conclusion (the `!removeMode` guards in T008 are the mechanism) survives, but the stated reason is inverted, and the real hazard is the opposite one: because `updateActionButtons` runs last, writing `liveLink.hidden = false` there would override the closed/editing rules on **every** tab and break FR-012. T006 tells the implementer to set icon, title and `aria-label` but never says "do not touch `hidden`".  
  **Recommendation:** Correct R3's ordering sentence, and add to T006: `updateActionButtons` MUST NOT write `liveLink.hidden` except in the existing `opts.showLive === false` branch — it runs last and would defeat T008's guards.  
  **Resolution:** research.md R3's ordering sentence corrected (updateActionButtons runs last) and tasks.md T006 now forbids writing `liveLink.hidden` there outside the `showLive === false` branch (2026-09-22 13:34)

- [X] **G1** · Coverage · HIGH · tasks.md T011–T013; tests/client-home.test.ts:508-509  
  **Summary:** A **second** Live Results test — "the tab refreshes on its timer…" (L496-509) — ends with `expect(document.querySelectorAll('.tab-panel[data-panel="live"] .live-link:not([hidden])').length).toBe(0)`: it asserts the Live Results tab shows **no** visible link, which is exactly what FR-001 reverses. No task touches it, so the suite will fail at T014 with a failure the task list does not predict.  
  **Recommendation:** Add a task in Phase 3 (or extend T011) to rewrite that assertion: the tab's cards now each show one visible `.live-link`, in remove form. It is a one-line change in a test T010's checkpoint does not run (`-t "Live Results"` matches it, but T010 only records corner-X failures).  
  **Resolution:** tasks.md gained T014 rewriting the second Live Results test's "no visible link" assertion; the later tasks were renumbered to T015–T028 (2026-09-22 13:34)

- [X] **U1** · Underspecification · MEDIUM · tasks.md T015  
  **Summary:** The US2 test must get a CLOSED poll onto the Live Results tab. T015 says "update it to CLOSED … then drive one `/api/live/refresh` (settle past the live floor)", but does not say to lower the floor; the existing Live Results context sets `ENV_MIN_LIVE_REFRESH_INTERVAL: "300"` precisely so a refresh can be awaited in a test. Without that the test either waits 2 s of real time or never refreshes.  
  **Recommendation:** Name the context options in T015 (`ENV_MIN_LIVE_REFRESH_INTERVAL: "300"`, `ENV_MIN_MANUAL_REFRESH_INTERVAL: "1"`), as the existing removal test does, and settle ~700 ms.  
  **Resolution:** tasks.md T016 now names the test's own context (`ENV_MIN_LIVE_REFRESH_INTERVAL: "300"`, `ENV_MIN_MANUAL_REFRESH_INTERVAL: "1"`) and a 700 ms settle (2026-09-22 13:34)

- [X] **U2** · Underspecification · MEDIUM · tasks.md T018; plan.md  
  **Summary:** T018 says to focus "the card `.live-link` through the grid's mounted card element", and T019 adds `cardOf(pid)` — but neither says what `cardOf` returns (`pollCard.js:1192` exposes `{ element: viewport, pid, … }`), so the implementer must guess between the instance, its `element`, or a DOM query.  
  **Recommendation:** State it: `cardOf(pid)` returns the mounted card instance; focus `cardOf(next).element.querySelector(".live-link")`.  
  **Resolution:** tasks.md T019/T020 now state that `cardOf(pid)` returns the mounted card instance and that focus is taken via `.element.querySelector(".live-link")` (2026-09-22 13:34)

- [X] **G2** · Coverage · MEDIUM · spec.md FR-009; tasks.md  
  **Summary:** FR-009 ("the X is static in every state; the reduced-motion and guest rules continue to govern the bars alone") has no task and no automated check. It is satisfied by construction — the X is an SVG with no animation — but nothing asserts the bars' rules were not widened to `.live-x`.  
  **Recommendation:** Optional: add to T011 an assertion that `pollCard.css`'s reduced-motion and `.is-guest` rules name `.live-bars` only, in the style of the existing asset tests.  
  **Resolution:** tasks.md T011 now asserts `pollCard.css`'s reduced-motion and `.is-guest` rules still name `.live-bars` only (FR-009) (2026-09-22 13:34)

- [X] **L1** · Inconsistency · LOW · tasks.md T010  
  **Summary:** T010 says the existing tests "now fail only where they look for `.card-close-btn` (they are rewritten in T013)"; the rewrite is T011 (the selector helper and the assertions), not T013.  
  **Recommendation:** Change the cross-reference to T011–T013.  
  **Resolution:** tasks.md T010's cross-reference now reads T011–T014 and names both failing assertions (2026-09-22 13:34)

- [X] **L2** · Wording · LOW · tasks.md T004  
  **Summary:** The rule `.live-link .live-bars[hidden], .live-link .live-x[hidden]{ display:none; }` duplicates a concern `site.css:301` already handles for `.live-link[hidden]`; the plan puts it in `pollCard.css` while the sibling rule lives in `site.css`.  
  **Recommendation:** Either is fine; note in T004 why it is in `pollCard.css` (it sizes the same elements) so a reviewer does not read it as a stray.  
  **Resolution:** tasks.md T004 now notes that the sibling `[hidden]` rule lives in `site.css:301` and why these two belong in `pollCard.css` (2026-09-22 13:34)

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 (control in the bottom row) | ✅ | T002, T009, T011 | |
| FR-002 (plain X, bars' box) | ✅ | T002, T004, T006, T011 | |
| FR-003 (no corner control anywhere) | ✅ | T003, T005, T012 | |
| FR-004 (star returns to its corner) | ✅ | T005 | visual check in quickstart |
| FR-005 (other tabs unchanged) | ✅ | T011, T016, T021 | |
| FR-006 (removal unchanged) | ✅ | T009, T013 | |
| FR-007 (label, tooltip, accessible name) | ✅ | T006, T011 | |
| FR-008 (one hover treatment) | ⚠️ | — | manual only (quickstart US1 step 3); jsdom cannot paint |
| FR-009 (X static; bars' rules unchanged) | ⚠️ | — | **G2** |
| FR-010 (shown for every poll state) | ✅ | T008, T015 | |
| FR-011 (notes keep their place) | ✅ | T015 | |
| FR-012 (add form still hides) | ✅ | T008, T016 | **I1** — the hazard is in T006, not T008 |
| FR-013 (front-face control) | ✅ | inherent | quickstart US2 step 6 |
| FR-014 (Enter and Space) | ✅ | T007, T020, T021 | |
| FR-015 (focus placement) | ✅ | T018, T019, T020 | **U2** |
| FR-016 (017's rules superseded) | ✅ | T023 | |
| SC-001, SC-002, SC-003, SC-005 | ✅ | T013, T012, T015, T020 | |
| SC-004 (other tabs unchanged) | ✅ | T014, T026 | via the unchanged suites |
| SC-006 (regression) | ✅ | T001, T014, T026 | **G1** — one assertion the list does not account for |

## Constitution Alignment Issues

None. Principle VI is respected (two comments deleted, none added); Principle III's surgical rule is respected (`tabs.js` gains one accessor); the documentation deliverables are carried as T024/T025.

## Unmapped Tasks

None. T001/T010/T014/T017/T022/T026 are checkpoints; T023–T025 are the contract and documentation deliverables; T027 is the manual walk-through.

## Metrics

- Total requirements: 16 FR + 6 SC = 22
- Total tasks: 27
- Coverage: 20/22 with ≥1 task (91%); 2 satisfied by construction or manual check (FR-008, FR-009)
- Ambiguity count: 2 (U1, U2)
- Duplication count: 0
- Critical issues: 0 · High: 2 · Medium: 3 · Low: 2

## Next Actions (as reported)

No CRITICAL issues. **G1 and I1 should be fixed before `/speckit-implement`**: G1 is a test assertion that will fail mid-run with no task accounting for it (the same class of surprise the 019 run hit twice), and I1 is a stated rationale that is factually inverted, with a real hazard hiding behind it — an implementer who "shows the link" from `updateActionButtons` would silently break FR-012 on five tabs and pass every test in this list except T016.

- I1: edit `research.md` R3 and `tasks.md` T006.
- G1: add or extend a task for `tests/client-home.test.ts:508-509`.
- U1, U2, G2, L1, L2: small edits to `tasks.md` (and one optional assertion).
