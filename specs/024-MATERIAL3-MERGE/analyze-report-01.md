# Specification Analysis Report — specs/024-MATERIAL3-MERGE

## Record

| Record | Value |
|---|---|
| Feature directory | specs/024-MATERIAL3-MERGE |
| Report created | 2026-10-01 19:50 |
| Analysis captured | 2026-10-03 05:12 |
| Last updated | 2026-10-03 05:12 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

## Findings

- [X] **C1** · Conflict · HIGH · spec.md FR-002 (L241), SC-001 (L352), US1 scenario 1; tasks T019  
  **Summary:** The spec says every existing light-mode colour stays identical, but the design changes some. The Vote button is moss `#3D5A46` today (`pollCard.css`). The ported layer paints it with `--md-sys-color-primary` `#2C6A46` (`P/pollCard-m3.css:230`). So SC-001 cannot pass as worded. The source requirements were already reworded this way (architecture INC-3), but the spec reverted to the broader claim.  
  **Recommendation:** Reword FR-002, SC-001 and US1 scenario 1 to say: "every production colour token (`--ink`, `--paper`, `--moss` …) and all bar fills, tracks and text keep their values; components take their M3 roles (for example, the filled Vote button uses `primary`)."
  **Resolution:** FR-002, SC-001, the US1 narrative and US1 scenario 1 in spec.md now promise only the production colour tokens and the bar colours unchanged, with components taking their M3 roles (2026-10-01 19:52)

- [X] **T1** · Test design · HIGH · tasks.md T005 (L105)  
  **Summary:** T005 compares each page with its `git show HEAD:` text. That baseline moves with every commit, so the test fails or passes for the wrong reason after S1, and it breaks on CI checkouts without history.  
  **Recommendation:** Drop the git comparison. Assert each page's `<head>` link and script set exactly against the matrix constant (an allowlist). That enforces "nothing else changes" at every step.
  **Resolution:** T005 in tasks.md now asserts each page's ordered link/script list against an allowlist in the test (no git baseline) (2026-10-01 19:52)

- [X] **U1** · Underspecification · MEDIUM · tasks.md T021 (guest tab goes to `/login`), T033 (back link, `location.assign`)  
  **Summary:** Both tasks say to stub `location`, "as `client-home.test.ts` does". No such pattern exists: `client-home.test.ts` only reads `location.pathname` (L267). In jsdom, `location.href` and `assign` cannot be redefined, and `tests/helpers/browser.ts:46` silently swallows jsdom's "Not implemented: navigation" errors.  
  **Recommendation:** Add a small task before T021: `openPage` records navigation attempts from the virtual console's `jsdomError` (message contains "navigation") into `page.navigations`. T021 and T033 then assert on that list.
  **Resolution:** added T053 (navigation recording in tests/helpers/browser.ts as page.navigations) to tasks.md, and T021 and T033 now assert on it (2026-10-01 19:52)

- [X] **I1** · Inconsistency · MEDIUM · research.md R4 (L72), CLAUDE.md; tasks.md T014 (L187) vs T015  
  **Summary:** Research R4 assigns the `.tab-notice-close` ripple registration to `app.js`. T014 registers it in `tabs.js`, and T015's `app.js` list leaves it out.  
  **Recommendation:** Keep T014, since `tabs.js` creates the control, and update R4 and the `CLAUDE.md` line to match.
  **Resolution:** research.md R4 now lists `.tab-notice-close` under tabs.js, matching T014 (research.md is outside the skill's usual three files; the finding's recommendation named it) (2026-10-01 19:52)

- [X] **I2** · Inconsistency · MEDIUM · data-model.md §4 ("in the order above": tooltip, then header-tab-bar …); tasks T016, T020, T028, T032  
  **Summary:** The data model puts `tooltip-m3.css` before `header-tab-bar-m3.css`. T032 links it after `header-tab-bar-m3.css`, and T020, T028 and T037 also say "after `header-tab-bar-m3.css`" without a relative order among themselves. The asset test needs one canonical order.  
  **Recommendation:** Make data-model §4 the single source. Have each linking task say "in the data-model §4 order", and have `m3-assets.test.ts` assert that order.
  **Resolution:** T016, T020, T028, T032, T037 and T043 in tasks.md now link "in the order of data-model.md §4", which T005's allowlist asserts (2026-10-01 19:52)

- [X] **G1** · Coverage gap · MEDIUM · spec SC-003; tasks T050  
  **Summary:** No task checks the keyboard on every control. The browser checklist (T050) covers specific items, such as the login checkbox, but has no "Tab through every page" pass. Automated tests cover only the avatar, guest tabs and dialogs.  
  **Recommendation:** Add to T050: on each public page, the admin header and the Not Saved dialog, Tab through every control and confirm each is reachable, operable and shows the focus ring.
  **Resolution:** T050 in tasks.md now includes the SC-003 keyboard sweep (2026-10-01 19:52)

- [X] **U2** · Underspecification · LOW · tasks T039  
  **Summary:** "The status line still reports 'Saved.'" conflicts with the existing FR-018 behaviour, which clears it once the session refresh lands. The assertion's timing is undefined, so the test may be flaky.  
  **Recommendation:** Assert "Saved." immediately after the save response, before `settle()` lets the session refresh run.
  **Resolution:** T039 in tasks.md now asserts "Saved." immediately after the response, before settle() (2026-10-01 19:52)

- [X] **G2** · Coverage gap · LOW · spec SC-009; tasks T051  
  **Summary:** Nothing verifies "no server, route, API description, configuration or database change".  
  **Recommendation:** Add to T051: `git diff --stat dev...HEAD -- src ':!src/public' postman .do` is empty.
  **Resolution:** T051 in tasks.md now checks that `git diff --stat dev...HEAD -- src ':!src/public' postman .do` is empty (2026-10-01 19:52)

- [X] **G3** · Coverage gap · LOW · spec FR-004, FR-023  
  **Summary:** The card-title clamp (18–22px) and "admin content unchanged" are covered only by the port (T019) and the manual checklist.  
  **Recommendation:** Acceptable as is. Optionally assert `clamp(18px` in `pollCard-m3.css` and that `admin.css` is unchanged in `m3-assets.test.ts`.
  **Resolution:** T020 asserts the `clamp(18px, 1.8vw, 22px)` title, and T051 checks that admin.css, styles.css and adminResults.js are unchanged (2026-10-01 19:52)

- [X] **D1** · Terminology drift · LOW · plan.md source tree ("`profile.test.ts` or a new client profile test"); tasks T039 (`client-profile-snackbar.test.ts`)  
  **Summary:** The plan leaves the test file open; the tasks decided it.  
  **Recommendation:** Update the plan's tree to name `tests/client-profile-snackbar.test.ts`.
  **Resolution:** plan.md's source tree now names tests/client-profile-snackbar.test.ts (2026-10-01 19:52)

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 shared M3 design | Yes | T002, T011, T019, T040 | |
| FR-002 light colours | Yes | T009, T017 | Wording conflict (C1) |
| FR-003 state layers, ripple, reduced motion | Yes | T002, T003 | Motion checked manually (Q7) |
| FR-004 title clamp, bar text | Partial | T019 | Manual check only (G3) |
| FR-005 header controls | Yes | T011, T015 | |
| FR-006 snackbars, cookie offset, announcement | Yes | T011, T014, T015 | |
| FR-007 notice Close | Yes | T007, T014 | |
| FR-008 cards, `is-multi` | Yes | T009, T018, T019 | |
| FR-009 640px | Yes | T008, T013 | |
| FR-010 empty-tab line | Yes | T008, T012, T013 | |
| FR-011 `Tabs.modal` | Yes | T021, T025, T027 | |
| FR-012 idle prompt | Yes | T021, T022, T026 | |
| FR-013 avatar | Yes | T021, T023 | |
| FR-014 guest tabs | Yes | T021, T022, T024 | Test mechanism (U1) |
| FR-015–FR-019 tooltips | Yes | T029–T032 | |
| FR-020 card-shell look | Yes | T038, T040, T041, T043 | |
| FR-021 profile snackbar | Yes | T039, T042 | U2 |
| FR-022 Not Saved dialog | Yes | T033–T037 | Test mechanism (U1) |
| FR-023 admin content unchanged | Partial | T005 | G3 |
| FR-024–FR-026 dark mode, admin light | Yes | T044–T046 | |
| FR-027 five steps, one release | Yes | T006, T052, checkpoints | |
| FR-028 S1 invisible | Yes | T005, T006 | T1 |
| FR-029 browser checklist | Yes | T050 | |
| FR-030 tests updated and added | Yes | T008–T010, T022, plus the new test files | |
| FR-031 documents | Yes | T047–T049 | |
| SC-001 | Yes | T009 | C1 |
| SC-002 dark ≥ 7:1 | Yes | T009 | |
| SC-003 keyboard | Partial | T021, T033 | G1 |
| SC-004 guest reaches sign-in | Yes | T021 | |
| SC-005 tooltips | Yes | T029 | |
| SC-006 checklist | Yes | T050 | |
| SC-007 one release | Yes | T052 | |
| SC-008 behaviour preserved | Yes | T051 | |
| SC-009 no server change | No | — | G2 |

## Constitution Alignment Issues

None. The plan meets Principle VI by dropping the `M3:` markers (research R15). Both documentation deliverables are scheduled after implementation (T047, T048). Each task has a verifiable criterion.

## Unmapped Tasks

None. T001, T006, T051 and T052 are setup, gating and release tasks.

## Metrics

- Total requirements: 40 (31 FR, 9 SC)
- Total tasks: 52
- Coverage: 39 of 40 have at least one task (97.5%). Four of those are only partly covered (FR-004, FR-023, SC-003).
- Ambiguity count: 2 (U1, U2)
- Duplication count: 0
- Critical issues: 0

## Next Actions (as reported)

There are no CRITICAL findings, so `/speckit-implement` can go ahead. I recommend fixing the two HIGH findings first, because both would fail during implementation:
- **C1:** reword FR-002, SC-001 and US1 scenario 1 in the spec, or SC-001 will fail on the Vote button in S3.
- **T1:** replace T005's git baseline with the allowlist assertion, or the S1 test becomes wrong at the first commit.

The MEDIUM items are small edits to the task list and research (U1 adds one helper task; I1, I2 and G1 are wording changes). The LOW items can be folded in at the same time.
