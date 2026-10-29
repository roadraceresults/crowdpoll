# Specification Analysis Report — specs/20261029-150117-LOG-ENV-DEFAULTS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261029-150117-LOG-ENV-DEFAULTS |
| Report created | 2026-10-29 051008 PM |
| Analysis captured | 2026-10-29 051008 PM |
| Last updated | 2026-10-29 051500 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · MEDIUM · tasks.md T012; research.md R2  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md Updated: 2026-10-29 5:11 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-29: Recommendation; T012 and research.md R2 now report `ENV_SMTP_USER` / `ENV_SMTP_PASS` "each when absent or empty", and T011 checks that `ENV_SMTP_USER: ""` keeps its entry.  

  T012 and R2 report `ENV_SMTP_USER` / `ENV_SMTP_PASS` only when they are missing entirely. But the mailer checks `config.smtp.user && config.smtp.pass`, so an empty value also falls back to "emails logged to the console". FR-007 says a setting is "not found" exactly when the default is used, so an empty value must be reported too.  

  - **Recommendation**: Change T012 and R2 to "each when absent or empty". In T011, add a case where `ENV_SMTP_USER: ""` is listed.  

    ➡️ [X] **Accepted**  
    - Brings the two credentials in line with FR-007 and the mailer's own test of "not set"; no behaviour changes.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · tasks.md T005; spec FR-003  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-29 5:11 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-29: Recommendation; T005 now holds the 52 numeric settings as an explicit `[name, default]` array copied from `src/config.ts` and checks each appears exactly once with that default.  

  T005 says "every one of the 52 numeric settings appears once" but doesn't list them. Section 5 of the requirements report summarizes some of them (e.g. "`ENV_SERVER_MAX_*` (four)"), so the implementer has to put the list together from `config.ts`.  

  - **Recommendation**: Have T005's test hold the 52 names in an explicit array and check each is listed once with its default. A new numeric setting then fails the test until it is added.  

    ➡️ [X] **Accepted**  
    - Makes the test exact and keeps the list of defaults checked against the code.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · tasks.md T004  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-29 5:11 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-29: Recommendation; T004 now sorts by code-unit order, `(a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)`.  

  The sort is written as "`localeCompare` (sort by code unit order if `localeCompare` differs)", which leaves two possible orderings.  

  - **Recommendation**: Choose plain code-unit order: `(a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)`.  

    ➡️ [X] **Accepted**  
    - One ordering, the same on every machine and locale.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **D1** · Duplication · LOW · spec.md FR-010, FR-012  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-10-29 5:15 PM  
  **Notes**: Recommendation accepted in file 2026-10-29: Recommendation A, keep both; FR-010 and FR-012 stay as they are, no file changed.  

  Both say a missing required setting produces no default line.  

  - **Recommendation A** _(recommended)_: Keep both: FR-010 covers the whole failure path, FR-012 the list.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: no edit; each requirement already has its own test (T009/T024 and T005).  
    - <u>Cons</u>: one sentence is said twice.  

  - **Recommendation B**: Fold FR-012's sentence into FR-010.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no repetition.  
    - <u>Cons</u>: FR-012 becomes an empty number, or the FR ids shift and the coverage table changes.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **I2** · Inconsistency · LOW · quickstart.md step 4  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ quickstart.md Updated: 2026-10-29 5:11 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-29: Recommendation; quickstart step 4 now says settings the script sets to `""` count as left out (PowerShell removes them).  

  Step 4 says "only the settings the script leaves out are reported". On Windows, PowerShell's `$env:X = ""` removes the variable, so the template's empty assignments (e.g. `ENV_ALLOWED_EMAILS`) count as left out and print a line too. The text is right on Windows, but a reader may not expect it.  

  - **Recommendation**: Add: "settings the script sets to `""` count as left out (PowerShell removes them)".  

    ➡️ [X] **Accepted**  
    - Explains the extra lines the walk-through will show.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage · LOW · spec FR-010; tasks.md  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-29 5:15 PM  
  **Notes**: Recommendation accepted in file 2026-10-29: Recommendation A; T005 now also checks that `loadConfig(baseEnv({ ENV_PORT: "abc" }))` throws `ConfigError` and `console.log` was not called (FR-010).  

  No unit test checks that an invalid setting prints no default line. It is covered structurally (`loadConfig` throws before anything is printed) and by quickstart step 5 (T024).  

  - **Recommendation A** _(recommended)_: Add one line to T005: `loadConfig(baseEnv({ ENV_PORT: "abc" }))` throws and `console.log` was not called.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: FR-010 gets an automated check for almost no cost.  
    - <u>Cons</u>: it tests `loadConfig`, not `startServer`'s ordering, which stays a quickstart check.  

  - **Recommendation B**: Accept as is.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no edit; the behaviour follows from `loadConfig` throwing.  
    - <u>Cons</u>: FR-010 is checked only by hand.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 one line per default | ✅ | T004, T009 | |
| FR-002 exact line text | ✅ | T006, T008 | |
| FR-003 concrete defaults | ✅ | T005, T007 | see U1 |
| FR-004 `none (…)` wording | ✅ | T011, T012, T013 | see I1 |
| FR-005 group lines | ✅ | T011, T013 | |
| FR-006 only in effect | ✅ | T015, T017 | |
| FR-007 "not found" = default used | ✅ | T003, T005, T011 | see I1 |
| FR-008 masking | ✅ | T016, T018 | |
| FR-009 stdout, sorted, timing | ✅ | T004, T009 | see A1 |
| FR-010 invalid → none | ✅ | T009, T024 | see C1 |
| FR-011 only the server prints | ✅ | T005, T023 | |
| FR-012 required never reported | ✅ | T005 | |
| FR-013 existing lines stay | ✅ | T009, T022 | |
| SC-001 every default exactly once | ✅ | T005, T024 | |
| SC-002 no false reports | ✅ | T005 | |
| SC-003 production quiet and masked | ✅ | T015, T016, T024 | |
| SC-004 findable by search | ✅ | T024 | |
| SC-005 scripts and tests quiet | ✅ | T023, T024 | |

## Constitution Alignment Issues

None.
- III (Surgical Changes): changing the call shape at the 52 numeric call sites is a large diff for this feature. The plan justifies it (research R1, which rejects a fifth copy of every default) and limits the edit to that change. It is not a violation.
- VI (Self-Documenting Code): checked by T022.

## Unmapped Tasks

None. T001 is a baseline check.

## Metrics

- Total requirements: 18 (13 FR + 5 SC)
- Total tasks: 24
- Coverage: 100%
- Ambiguity count: 1
- Duplication count: 1
- Critical issues: 0

## Next Actions (as reported)

There are no critical or high issues, so you could go straight to `/speckit-implement`. I1 is worth fixing first: as written, an empty SMTP credential would print nothing, which goes against FR-007.
