# Specification Analysis Report — specs/20261028-182852-line-graph-toggle

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261028-182852-line-graph-toggle |
| Report created | 2026-10-29 (third `/speckit-analyze` run in this session; the exact time was not recorded) |
| Analysis captured | 2026-10-29 11:30 AM |
| Last updated | 2026-10-29 12:28 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · HIGH · spec.md:115 (FR-007), :22 (Q4), :101 (edge case); tasks.md:61 (T038); data-model.md:27; tests/line-graph-setting.test.ts:206; src/routes/pollsApi.ts via `editModeFor` (src/polls/service.ts:219)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md tasks.md data-model.md requirements.md Updated: 2026-10-29 12:28 PM  
  **Notes**: Recommendation accepted in file 2026-10-29: Recommendation A, kept the refusal. Changed: spec.md (FR-007, clarification Q4, the in-review edge case), tasks.md (T013, formerly T038), data-model.md (the change rule) and requirements.md (the change rule; a generated file, edited because the developer asked for it).  

  FR-007 and clarification Q4 say the setting is changeable "in every poll state." The code and its test refuse the change while a poll is AWAITING APPROVAL (`409` on the edit session and on `/colors`). T038 says an in-review change "is stored." The edge case's "same rules as any other field" can be read either way.  

  - **Recommendation A** _(recommended)_: Keep the refusal. Amend FR-007, Q4, the edge case, the data-model rule and T038 to say "except while awaiting approval, where it is refused like any other field."  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: Matches the existing guard; no new write path.  
    - <u>Cons</u>: The spec's wording changes after Clarifications, so Q4 needs a new entry.  

  - **Recommendation B**: Allow the change in review through a separate write path that skips the edit session and the review guard.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: Meets FR-007 as written.  
    - <u>Cons</u>: A new write path beside the guarded ones, more code and tests, and a change to a poll in review that the review state does not otherwise allow.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · MEDIUM · spec.md:135 (SC-001), :120 (FR-012), :102 (edge case); contracts/api.md:31 (A5)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-29 12:28 PM  
  **Notes**: Recommendation accepted in file 2026-10-29: Recommendation A, named the refresh the phrase means: the viewer's Refresh of the tab, at most once every 5 seconds by default (`ENV_MIN_MANUAL_REFRESH_INTERVAL`), stretched under load by at most `ENV_MAX_STRETCH`. Changed: spec.md (SC-001, FR-012, the home-page card edge case).  

  "Within one content refresh" and "next content refresh" name no interval, so SC-001 cannot be checked against a time.  

  - **Recommendation A** _(recommended)_: Name the existing refresh setting the phrase means and state the worst-case wait.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: SC-001 becomes measurable against a stated time.  
    - <u>Cons</u>: Ties the spec to a named setting.  

  - **Recommendation B**: Keep the wording and treat SC-001 as checked by hand in T036.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: No spec change.  
    - <u>Cons</u>: SC-001 stays unmeasurable.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · LOW · plan.md:45 (Constitution Check, Documentation row)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ plan.md Updated: 2026-10-29 12:28 PM  
  **Notes**: Recommendation accepted in file 2026-10-29: Recommendation A, the Documentation row now points at the documentation tasks T034–T035. Changed: plan.md.  

  Says "see Phase 2 notes", but plan.md has no such section.  

  - **Recommendation A** _(recommended)_: Point it at the Final Phase tasks T033–T034.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: The reference resolves.  
    - <u>Cons</u>: None of note.  

  - **Recommendation B**: Add the section.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: Keeps the original intent.  
    - <u>Cons</u>: Adds a section that repeats tasks.md.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I3** · Inconsistency · LOW · plan.md:88–91 (Project Structure, tests)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ plan.md Updated: 2026-10-29 12:28 PM  
  **Notes**: Recommendation accepted in file 2026-10-29: Recommendation, added the three test files to the Project Structure tree. Changed: plan.md.  

  The tree omits `tests/client-delta-line-graph.test.ts` (new, T023), and the changed `tests/line-graph-route.test.ts` and `tests/helpers/poll-fixtures.ts`.  

  - **Recommendation**: Add the three files to the tree.  

    ➡️ [x] **Accepted**  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I4** · Inconsistency · LOW · research.md:45–47 (R6); tasks.md:43 (T008)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ research.md tasks.md Updated: 2026-10-29 12:24 PM  
  **Notes**: Recommendation accepted in file 2026-10-29: Recommendation A, updated R6 to the confirmed lines (`pollsApi.ts` 682 for the definition, 676 for the admin list, 744 for the admin search) and reworded T008 to the confirmed call sites. Changed: research.md, tasks.md.  

  R6 cites `adminListRow` at `pollsApi.ts:666` and "verified" at `:660` and `:727`. Current code: definition at 682, admin-list call at 676, admin-search call at 744 (route at 726). T008 still asks to confirm line 727.  

  - **Recommendation A** _(recommended)_: Update R6 to 682 / 676 / 744 and reword T008 to the confirmed lines.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: The references point at the code as it is.  
    - <u>Cons</u>: The line numbers will drift again.  

  - **Recommendation B**: Drop the line numbers from R6 and T008.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: No numbers to go stale.  
    - <u>Cons</u>: Less direct for the reader.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I5** · Inconsistency · LOW · spec.md:81, :90, :122 (US4, FR-014); src/public/lineGraph.js:17  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-29 12:28 PM  
  **Notes**: Recommendation accepted in file 2026-10-29: Recommendation A, FR-014 now quotes the exact note text, "Results are not available yet". Changed: spec.md (FR-014).  

  The spec quotes the note as "results are not available". The code text is "Results are not available yet". T030 uses the full text.  

  - **Recommendation A** _(recommended)_: Quote the exact text in FR-014: "Results are not available yet".  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: The spec matches what a viewer reads.  
    - <u>Cons</u>: Quotes UI text, which can change.  

  - **Recommendation B**: Refer to "the existing results-unavailable note" without quoting it.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: Survives a wording change.  
    - <u>Cons</u>: The reader has to look up the text.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I6** · Inconsistency · LOW · tasks.md:59 (T011), :61 (T038); tests/line-graph-setting.test.ts:158, :194  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-29 12:08 PM  
  **Notes**: Recommendation accepted in file 2026-10-29: Recommendation A, reworded T011 to "accepts the field alone" and T038 to "in turn", so both match the tests. The later-save rule holds either way. Changed: tasks.md (T038 is now T013, see I7).  

  T011 says a publish with votes "accepts the field alongside `title`", but the test sends only `lineGraphEnabled`. T038 says saves "at nearly the same time", but the test saves in turn.  

  - **Recommendation A** _(recommended)_: Reword T011 to "accepts the field alone" and T038 to "in turn". The later-save rule holds either way.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: Task wording matches the test.  
    - <u>Cons</u>: The title case and true concurrency stay untested.  

  - **Recommendation B**: Add a publish case that carries a title, and a true concurrent case.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: Tests what the wording claims.  
    - <u>Cons</u>: More test code; concurrency is hard to make deterministic.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I7** · Inconsistency · LOW · tasks.md:61 (T038), :198 (note); :37 (T002), :85 (T020), :91 (T023), :107 (T026)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-29 12:08 PM  
  **Notes**: Recommendation accepted in file 2026-10-29: Recommendation A, renumbered the tasks in order (T038 is now T013; T013–T036 are now T014–T037), removed the out-of-sequence note and the finding IDs (U1, C5, C6, C7) from the task text. Changed: tasks.md. Still to do: plan.md I2 names the documentation tasks, now T034–T035, not T033–T034.  

  T038 sits in Phase 3 with no T037, which the notes admit. Four tasks carry analysis finding IDs (U1, C5, C6, C7), which will not resolve once `analyze-findings.md` is archived.  

  - **Recommendation A** _(recommended)_: Renumber sequentially and drop the finding IDs from the task text.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: IDs run in order and every reference is durable.  
    - <u>Cons</u>: Renumbering touches the notes that cite T038.  

  - **Recommendation B**: Leave both as they are; the notes explain the gap.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: No change.  
    - <u>Cons</u>: The gap and the dead references remain.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage · LOW · spec.md:149 (FR-016); tasks.md:144 (T035)  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-29 12:08 PM  
  **Notes**: Recommendation accepted in file 2026-10-29: Recommendation A, T035 (now T036) names tests/cookie-use-list.test.ts as the automated check for FR-016. Changed: tasks.md.  

  FR-016 (no new config, cookie or storage key) rests on T035's manual check. `tests/cookie-use-list.test.ts` already fails when a cookie or storage key lacks a Cookie Use row, but T035 does not name it.  

  - **Recommendation A** _(recommended)_: Name `tests/cookie-use-list.test.ts` as the automated check in T035.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: FR-016 gets an automated check.  
    - <u>Cons</u>: Relies on an existing test's scope.  

  - **Recommendation B**: Leave T035 as the check.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: No change.  
    - <u>Cons</u>: The check stays manual.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 | Yes | T002–T006 | |
| FR-002 | Yes | T010, T016, T017, T027 | |
| FR-003 | Yes | T010, T025 | |
| FR-004 | Yes | T015, T019 | |
| FR-005 | Yes | T017, T019 | Checkbox first is tested; the no-choices note text is asserted at `client-admin-wizard.test.ts:1271`. The earlier "manual only" note is out of date. |
| FR-006 | Yes | T017 | Same test as FR-005 (line 1271). |
| FR-007 | Yes | T011, T012, T038 | Conflicts with the in-review refusal (I1). |
| FR-008 | Yes | T012, T014, T018 | |
| FR-009 | Yes | T028, T029 | |
| FR-010 | Yes | T021, T024 | |
| FR-011 | Yes | T020, T022 | |
| FR-012 | Yes | T007, T023 | |
| FR-013 | Yes | T008, T026 | |
| FR-014 | Yes | T030, T031 | Quoted note text differs (I5). |
| FR-015 | Partial | T035 | Manual check; relies on the existing line-graph suites. |
| FR-016 | Weak | T035 | See C1. |
| SC-001 | Partial | T036 | Manual only; unit is undefined (A1). |
| SC-002 | Yes | T025, T027 | |
| SC-003 | Yes | T002, T036 | |
| SC-004 | Partial | T011, T012 | Holds except in review (I1). |
| SC-005 | Yes | T021 | |
| SC-006 | Yes | T028 | |
| Edge: no-choices note | Yes | T017 | Asserted at `client-admin-wizard.test.ts:1271`. |
| Edge: closed or in-review poll | Conflict | T038 | See I1. |
| Edge: two Administrators | Yes | T038 | `line-graph-setting.test.ts:194` (in turn, see I6). |
| Edge: removed Administrator | Yes | T038 | `line-graph-setting.test.ts:224`. |
| Edge: non-Administrator request carries field | Yes | T025 | |

## Constitution Alignment Issues

None caused by this feature.
- **Principle VI:** no spec, requirement, finding or task IDs appear in the changed or new code, checked against the diff and the new files.
- **README rule:** this feature's README text carries no references to specs or requirements. Three earlier-feature references already exist at README.md lines 324, 327 and 357. They predate this feature. Principle III says to leave them, but they should go when the README is next regenerated.

## Unmapped Tasks

T001 and the Final Phase tasks (T032–T036) carry no story label. The template allows that for setup and polish.

## Metrics

- Total requirements: 22 (16 FR, 6 SC)
- Total tasks: 37 (T001–T036 plus T038)
- Coverage: 22 of 22 requirements have at least one task (100%). Partial or weak: FR-015, FR-016, SC-001. FR-007 and SC-004 are covered but conflict on the in-review rule.
- Ambiguity count: 1 (A1)
- Duplication count: 0
- Critical issues: 0 (High: 1, I1)

## Next Actions (as reported)

- No CRITICAL issues, so nothing blocks further work.
- Settle **I1** before the T036 walkthrough, so the walkthrough tests the chosen behaviour. If you pick A, the change is to the spec, data-model and T038 wording. If you pick B, it is new implementation work and needs `/speckit-tasks` to add tasks.
- The LOW items can go in one editing pass. Re-run `/speckit-analyze` afterwards to confirm they cleared.
