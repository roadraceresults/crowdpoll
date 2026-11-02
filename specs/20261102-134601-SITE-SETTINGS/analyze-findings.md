# Specification Analysis Report — specs/20261102-134601-SITE-SETTINGS

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261102-134601-SITE-SETTINGS |
| Report created | 2026-11-02 041600 PM |
| Analysis captured | 2026-11-02 041600 PM |
| Last updated | 2026-11-02 041700 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **U3** · Underspecification · MEDIUM · contracts/ui-contracts.md C4 (failure, step 5); tasks.md T026, T027  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ contracts/ui-contracts.md tasks.md Updated: 2026-11-02 4:17 PM  
  **Notes**: Recommendation accepted in file 2026-11-02: Recommendation, `lastSaved` follows every session update, including those that arrive while saving, and a failed save reverts to it;  
  contracts/ui-contracts.md C4 steps 4 and 5 say so;  
  tasks.md T026 adds the case where another tab saves Dark mid-save and this save fails, so the page ends on Dark, and T027 sets `lastSaved` from every session update.  

  While a save is in flight, the card now ignores session updates.  
  If another tab saves a newer scheme during that time and this tab's save then fails, the card reverts to its own stale `lastSaved`.  
  The session has already adopted the other tab's value, so the closing `Session.refresh()` sees no change and doesn't notify.  
  The page then disagrees with the account until the next reload.  

  - **Recommendation**: In C4, keep recording `lastSaved` from session updates that arrive while saving; only the radio and page ignore them. Revert to that value on failure. Add a T026 case: another tab saves Dark mid-save, this save fails, and the page shows Dark.  

    ➡️ [x] **Accepted**  
    - A failed save then falls back to what the account actually holds, so the page, the radio and the session agree again without a reload; one assignment in the session handler.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **I4** · Inconsistency · LOW · tasks.md T024, T025 (placed between T014 and T015); Parallel Opportunities "Developer A" line  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-11-02 4:17 PM  
  **Notes**: Recommendation accepted in file 2026-11-02: Recommendation, the Developer A line now reads T013 → T014 → T024 → T025 → T015 → T018;  
  tasks.md Dependencies notes that tasks run in listed order, with T024 and T025 out of numeric order because earlier resolutions cite them.  

  T024 and T025 now run inside US1 but keep their old IDs, so the IDs are no longer in execution order.  
  The "Developer A" sequence still leaves them out.  

  - **Recommendation**: Add "→ T024 → T025" after T014 in the Developer A line, and note in Dependencies that these IDs are listed out of numeric order. Renumbering the later tasks isn't worth it now that resolutions cite these IDs.  

    ➡️ [x] **Accepted**  
    - Keeps every ID cited in the earlier resolutions valid while making the execution order explicit.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 menu item, every signed-in user | Yes | T013, T014 | |
| FR-002 gear for Site Settings | Yes | T014 | |
| FR-003 checklist icon | Yes | T024, T025 | Now in US1 |
| FR-004 icons follow the scheme | Yes | T024, T025 | |
| FR-005 `/settings` guarded | Yes | T015 | |
| FR-006 card layout | Yes | T013, T016, T018 | |
| FR-007 radio group | Yes | T013, T017, T018 | |
| FR-008 apply at once, no Save button | Yes | T013, T018 | |
| FR-009 failure revert, `401` | Yes | T026, T027 | See U3 |
| FR-010 Light default | Yes | T021–T023 | |
| FR-011 every page, admin unpinned | Yes | T019 | |
| FR-011a contrast audit | Yes | T028–T030 | |
| FR-012 first paint from the copy | Yes | T008–T010, T012 | |
| FR-013 privacy row | Yes | T011 | |
| FR-014 other tabs and devices | Yes | T026, T027 | |
| FR-015 Logout or no session → Light | Yes | T012 | |
| FR-016 line graph | Yes | T020 | |
| FR-017 values validated | Yes | T002, T003, T006 | |
| FR-018 returned with `/api/me` | Yes | T004, T005 | |
| FR-019 removed with the account | Yes | T002 | |
| FR-020 API description | Yes | T007 | |
| SC-002 within 100 ms | Yes | T013 | Now covered |
| SC-003 no flash | Yes | T009, T010, T034 | |
| SC-006 failure within 1 s | Yes | T026 | |
| SC-007 zero AA failures | Yes | T028–T030 | |

## Constitution Alignment Issues

None. Every story's tests now come before the code they cover.

## Unmapped Tasks

None. T001 and T031–T034 are setup and polish.

## Metrics

- Total requirements: 25 (21 FRs and the 4 SCs that need building work)
- Total tasks: 34
- Coverage: 100%
- Ambiguity count: 0
- Duplication count: 0
- Critical issues: 0

## Next Actions (as reported)

No issue is critical. U3 is one edge case in the save-failure path, and I4 is a bookkeeping fix. You could start `/speckit-implement` now, but U3 is cheap to settle first.
