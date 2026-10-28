# Specification Analysis Report — specs/021-MAXIMIZED-POLL-CARD

## Record

| Record | Value |
|---|---|
| Feature directory | specs/021-MAXIMIZED-POLL-CARD |
| Report created | 2026-09-24 06:47 |
| Analysis captured | 2026-09-24 06:47 |
| Last updated | 2026-09-24 06:48 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

This is the re-run analysis. The first run's 12 findings, all resolved, are recorded in `analyze-report-01.md`.

## Findings

- [X] **U6** · Underspecification · LOW · tasks.md T011 (L83–84)  
  **Summary:** `restore(options)` reads `options.quiet`, but `closeMaximized()` (T012, T035) and the X's click handler call it with no argument or with a click Event. Written literally, a close with no argument would throw on `undefined.quiet`.  
  **Recommendation:** In T011, write `restore(options = {})` and wire the X as `() => restore()`, so a click event is never passed as options.  
  **Resolution:** tasks.md T011 now declares `restore(options = {})` and wires the X as `() => restore()`, so a close with no argument or from a click never reads `quiet` from `undefined` or an Event. (2026-09-24 06:48)

- [X] **A3** · Ambiguity · LOW · spec.md US5 scenario 6 (L213–215)  
  **Summary:** "**When** it closes, **Then** the page returns to the scroll position it had before" doesn't say which closes. FR-027 now says leaving-the-tab closes don't restore scroll, so this scenario reads broader than the requirement.  
  **Recommendation:** Reword to "**When** it closes with the X, Escape or the current tab".  
  **Resolution:** spec.md User Story 5 scenario 6 now limits the scroll restore to closes with the X, Escape or the current tab, matching FR-027. (2026-09-24 06:48)

## Resolutions confirmed from the first run

| Earlier finding | Status | Where it now reads correctly |
|---|---|---|
| U1 focus uses the face at close | ✅ gone | spec.md FR-027, US5 scenario 4; tasks.md T034, T036(c) |
| U2 quiet close when leaving the tab | ✅ gone | tasks.md T011, T031, T034, T036(c2); spec.md FR-027 (via D1) |
| C1 guests may maximize | ✅ covered | tasks.md T013(g) |
| C2 same colours in both views | ✅ covered | tasks.md T018(c) |
| U3 icon tracing fallback | ✅ gone | tasks.md T002 |
| C3 updates while maximized | ✅ covered | tasks.md T032(h) |
| I1 test file names | ✅ gone | plan.md Testing and Project Structure |
| A1 icon colours | ✅ gone | spec.md FR-004 (L270–273) |
| A2 browsers named | ✅ gone | spec.md SC-006 (L408) |
| U4 `scrollTo` stub | ✅ gone | tasks.md T005 |
| U5 real-time wait | ✅ gone | tasks.md T026(b) |
| D1 duplicated focus rule | ✅ gone | spec.md FR-027 points to FR-025 and FR-026 |

## Coverage Summary

| Requirement | Has task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 – FR-006 | ✅ | T002, T006 – T008, T013, T036 | |
| FR-007 Guests may maximize | ✅ | T013(g) | was ❌ (C1) |
| FR-008 – FR-015 | ✅ | T003, T009 – T011, T013, T043 | FR-012 – FR-014 checked by hand (Q5) |
| FR-016, FR-017 | ✅ | T015 – T018 | |
| FR-018 Renders as the grid card | ✅ | T004, T018(c) | was partial (C2) |
| FR-019, FR-020 | ✅ | T029, T032 | |
| FR-021 Keeps receiving updates | ✅ | T032(c, h) | was partial (C3) |
| FR-022 – FR-026 | ✅ | T008, T011, T012, T028, T030 – T032, T035 | |
| FR-027 Scroll and focus | ✅ | T011, T031, T034, T036(b, c, c2) | A3 |
| FR-028 | ✅ | T036(e) | |
| FR-029 – FR-033 | ✅ | T020 – T026, T043 | the fill's trailing edge (FR-033) is kept by the existing `site.css` test |
| FR-034 | ✅ | T004, T014 | |
| FR-035 Vote rows and admin unchanged | ⚠️ no work | T043 (Q13) | nothing to build |
| FR-036 | ✅ | T025, T038, T042 | |
| SC-001 – SC-003, SC-005, SC-008, SC-009 | ✅ | T013, T018, T026, T036, T042 | |
| SC-004 Same colours in both views | ✅ | T018(c) | was by hand only (C2) |
| SC-006 White text follows the fill | ⚠️ by hand | T043 (Q12) | jsdom can't animate |
| SC-007 No cut-off at any width | ⚠️ by hand | T043 (Q5) | jsdom can't lay out |

## Constitution Alignment Issues

None reported. The resolutions added no comments, logging or scope, and README and ARCHITECTURE stay after implementation (T040, T041).

## Unmapped Tasks

None reported.

## Metrics

| Metric | Value |
|---|---|
| Requirements | 45 (36 FRs, 9 SCs) |
| Tasks | 43 |
| Coverage | 100%. FR-035 needs no work; SC-006 and SC-007 are checked by hand because jsdom can't paint or lay out. |
| Ambiguities | 1 (A3) |
| Duplications | 0 |
| Underspecification | 1 (U6) |
| Critical issues | 0 |

**Outside the three core files, noted and not counted:**
- `quickstart.md` Q12 doesn't name the three browsers that SC-006 now names.
- `architecture/021-maximized-poll-card/architecture.md:382` keeps the UNS-5 resolution as it was recorded ("its title when opened from the back"). That's historical, and the spec now supersedes it.

## Next Actions (as reported)

- **You can proceed with `/speckit-implement`.** Both new findings are LOW, and U6 would surface as a thrown error in T013's first close test anyway.
- To close them first: add U6 and A3 to `analyze-report.md` and apply them. Each is a one-line edit, one to `tasks.md` T011 and one to `spec.md` US5 scenario 6. Optionally, name the browsers in quickstart Q12 as well.
