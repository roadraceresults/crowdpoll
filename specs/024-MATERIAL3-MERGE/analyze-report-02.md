# Specification Analysis Report — specs/024-MATERIAL3-MERGE

## Record

| Record | Value |
|---|---|
| Feature directory | specs/024-MATERIAL3-MERGE |
| Report created | 2026-10-03 05:13 |
| Analysis captured | 2026-10-03 16:10 |
| Last updated | 2026-10-03 16:10 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

The Steps 1–5 analysis (2026-10-01, all ten findings resolved) is kept in `analyze-report-01.md`.
This report covers the 2026-10-03 analysis, after Step 6 was added to the spec, plan and tasks.

## Findings

- [X] **I1** · Inconsistency · MEDIUM · contracts/admin-api.md A2 vs A4; research R22; tasks T055  
  **Summary:** A4 says a poll with votes refuses a keyword change with **409**. A2 and T055 say `/publish` refuses it with **400**, because the votes filter on `/publish` runs before the field checks. The 409 path can't be reached through any route.  
  **Recommendation:** Change A4 to: "refused: 400 through `/publish`'s votes filter; `validatePollFields` also throws 409 as a backstop".  
  **Resolution:** contracts/admin-api.md A4 now says 400 through `/publish`'s votes filter, with `validatePollFields`' 409 as an unreachable backstop (contract edited with the developer's go-ahead) (2026-10-03 05:14)

- [X] **U1** · Underspecification · MEDIUM · admin-api.md A1 (`clientGuid`: "the edit session's holder"); research R21; T066, T063  
  **Summary:** It's unclear whether `/save` requires an edit session. R21 reuses `resolveEditContext`, which (like `/publish`) accepts an INITIALIZED poll with no session at all, but A1 implies one is required. T063 tests only "locked by another `clientGuid`".  
  **Recommendation:** Decide and state it. Recommended: as `/publish` (no session needed), with A1 reading "the holder, when the poll is being edited" and a T063 case for a save without a session.  
  **Resolution:** `/save` works like `/publish`: contracts/admin-api.md A1 says a poll not being edited is saved without a session, and tasks.md T063 adds that case (2026-10-03 05:14)

- [X] **C1** · Coverage gap · MEDIUM · spec FR-035, FR-037, FR-039; tasks T064  
  **Summary:** Most of the step-level rules arrive with the T071 port but have no test task: Copy link and its snackbar, the 40-character choice cap, blank lines refused, Paste choices dropping repeats, the emoji hint, the Step 5 pre-filled dates and time-zone line, and "end in the past" blocking Publish.  
  **Recommendation:** Add an "inside the steps" group to T064 for these, at least the 40 cap, blank lines, paste repeats, the end-in-the-past block and the pre-filled dates.  
  **Resolution:** tasks.md T064 gains an "inside the steps" group: Copy link, the 40-character cap, blank lines, Paste choices, pre-filled dates, the time-zone line and the end-in-the-past block (2026-10-03 05:14)

- [X] **C2** · Coverage gap · MEDIUM · spec SC-012, US7 scenario 6; T064  
  **Summary:** SC-012 (a part-saved poll keeps its answers after a reload) has no test. T064 reopens the wizard within the same page only.  
  **Recommendation:** Add to T064: Save, reload `admin.html`, tap a summary link; the wizard opens at Step 1 with the saved answers.  
  **Resolution:** tasks.md T064 adds Save, reload and reopen with the saved answers (SC-012) (2026-10-03 05:14)

- [X] **C3** · Coverage gap · MEDIUM · spec FR-042, last sentence; T077  
  **Summary:** "An existing poll's stored subtitle and choices MUST NOT be cut by the new-poll limits" is untested.  
  **Recommendation:** Add to T077: an existing poll with a 70-character subtitle opens with it whole, and Save changes on its title doesn't refuse it or send `subtitle`.  
  **Resolution:** tasks.md T077 adds the 70-character-subtitle case for FR-042 (2026-10-03 05:14)

- [X] **C4** · Coverage gap · LOW · spec FR-045; T064  
  **Summary:** The when-line test list leaves out an EDITING poll, which must be worded as its state before editing.  
  **Recommendation:** Add an EDITING-from-OPEN case to T064's when-line group.  
  **Resolution:** tasks.md T064's when-line group adds EDITING from OPEN (2026-10-03 05:14)

- [X] **C5** · Coverage gap · LOW · spec FR-048; T064  
  **Summary:** Nothing asserts that the admin page no longer offers the voter count limit, invitation or ban controls.  
  **Recommendation:** Add a T064 assertion: no voter-limit input or invitation/ban list in the read-only face or the wizard.  
  **Resolution:** tasks.md T064 asserts no voter-limit, invitation or ban controls (FR-048) (2026-10-03 05:14)

- [X] **C6** · Coverage gap · LOW · spec SC-010 (set up and publish a new poll in under 3 minutes); quickstart Q9–Q10; T085  
  **Summary:** No step times the flow.  
  **Recommendation:** Add "time the Q9–Q10 flow; under 3 minutes at 320px and at desktop" to T085.  
  **Resolution:** tasks.md T085 times the Q9–Q10 flow at 320px and desktop (SC-010) (2026-10-03 05:14)

- [X] **A1** · Ambiguity · LOW · tasks T066  
  **Summary:** "Drop … an empty `labels` list" doesn't say whether a list of only blank strings counts. `replaceChoices` would then refuse it with 400.  
  **Recommendation:** Say "a list with no non-blank labels".  
  **Resolution:** tasks.md T066 now drops "a `labels` list with no non-blank labels" (2026-10-03 05:14)

- [X] **A2** · Ambiguity · LOW · tasks T061  
  **Summary:** T061 changes "the documented `voteMutability` default" of `POST /api/admin/polls`, but I didn't confirm `openapi.json` documents one.  
  **Recommendation:** Reword to "if the spec documents a default, change it".  
  **Resolution:** tasks.md T061 changes the `voteMutability` default only if the spec documents one (2026-10-03 05:14)

- [X] **T1** · Terminology · LOW · spec FR-034 ("Settings Summary"); contracts C14 ("summary links", `.wizard-summary`); data-model §6.3 ("summary links"); A30 ("Summary Text")  
  **Summary:** Three names for the same thing.  
  **Recommendation:** Use "Settings Summary" for the section and "Summary Text links" for its parts in the spec and contracts; class names stay as they are.  
  **Resolution:** spec.md uses "Settings Summary" for the section and "Summary Text" parts and links throughout; contracts/ui-contracts.md C14 and data-model.md §6 match (2026-10-03 05:14)

- [X] **D1** · Duplication · LOW · tasks T050 (open) and T085  
  **Summary:** T085 repeats T050's open browser items. That's harmless, but T050 then stays unticked.  
  **Recommendation:** Note in T050 that it closes with T085.  
  **Resolution:** tasks.md T050's note says it closes with T085 (2026-10-03 05:14)

## Coverage Summary

Only the Step 6 requirements and criteria are listed; FR-001–FR-031 and SC-001–SC-009 are covered by the completed tasks T001–T053, apart from the browser pass T050.

| Requirement | Has task? | Task IDs | Notes |
|---|---|---|---|
| FR-032 Create New Poll opens the wizard; worded-state rule | Yes | T064, T071, T072 | |
| FR-033 Named Circles, Next | Yes | T064, T071 | |
| FR-034 Settings Summary links | Yes | T064, T077 | |
| FR-035 Step 1, Copy link, switch | Partial | T064 (switch), T071 | C1 |
| FR-036 Step 2, keywords | Yes | T055, T058, T071 | |
| FR-037 Step 3 rules | Partial | T064 (duplicates), T071 | C1 |
| FR-038 Step 4 | Yes | T058, T071 | |
| FR-039 Step 5 | Partial | T071 | C1 |
| FR-040 Cancel / Save / Publish | Yes | T063, T064, T066 | |
| FR-041 links per state | Yes | T077 | |
| FR-042 existing-poll wizard, Save changes | Partial | T077 | C3 |
| FR-043 one card at a time, focus | Yes | T077 | |
| FR-044 read-only face | Yes | T064 | |
| FR-045 when-line | Partial | T064 | C4 |
| FR-046 widths | Manual | T085 | Browser only |
| FR-047 defaults | Yes | T056, T058 | |
| FR-048 voter settings not offered | Implicit | T071 | C5 |
| SC-010 publish in under 3 minutes | Manual | T085 | C6 |
| SC-011 links match what can change | Yes | T077 | |
| SC-012 answers survive a reload | Partial | T063 | C2 |
| SC-013 keyboard | Manual | T085 | |

## Constitution Alignment Issues

None reported. Constitution VI (no requirement references in code) is enforced by T069–T071. Constitution V (server-side logging) is covered by `/save`'s log line. The API-contract rule is covered by T061 and T067, and the documentation deliverables by T081 and T082.

## Unmapped Tasks

None. T054, T062, T076 and T084 are checkpoints, and T086 and T087 are release tasks.

## Metrics

- Total requirements: 61 (48 FR + 13 SC).
- Total tasks: 87 (53 done, 34 open).
- Coverage: 100% have at least one task; 7 of the Step 6 items are only partly covered by automated tests.
- Ambiguity count: 3 (U1, A1, A2).
- Duplication count: 1 (D1).
- Critical issues: 0.

## Next Actions (as reported)

There are no CRITICAL or HIGH issues, so you can go ahead with `/speckit-implement`. Fixing I1 and U1 first would make the `/save` and keywords tests unambiguous to write, and C1–C3 are cheap additions to T064 and T077 before those tests are written. All twelve findings are edits to `tasks.md` and `contracts/admin-api.md`. If you prefer to work through them one at a time, run `/speckit-analyze-resolve`.
