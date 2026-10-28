# Specification Analysis Report — specs/20261027-151601-POLL-LINE-GRAPH

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261027-151601-POLL-LINE-GRAPH |
| Report created | 2026-10-27 045335 PM |
| Analysis captured | 2026-10-27 045335 PM |
| Last updated | 2026-10-27 053714 PM |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

### **I1** · Inconsistency · MEDIUM · spec.md FR-003, SC-002 vs FR-011/SC-003  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md tasks.md Updated: 2026-10-27 5:37 PM  
  **Notes**: Recommendation A accepted in file 2026-10-27: reworded FR-003 and SC-002 in spec.md to equality as of the time the series was computed, with drift against the live bars bounded by one refresh interval (FR-011/SC-003); noted in T004 (tasks.md) that equality assertions compare against the database standing at computation time, not live counters.  

  FR-003/SC-002 demand the newest point "MUST equal the bar graph" with "100% agreement in every rendering", but FR-011/SC-003 accept up to one refresh interval of staleness — beside a live-updating bar graph, a 60 s-cached series transiently disagrees by design.  

  - **Recommendation A** _(recommended)_: Reword FR-003/SC-002 to "equal as of the time the series was computed, with drift bounded by one refresh interval (FR-011)"; note in T004 (tasks.md) that the route test asserts equality against the database standing at computation time, not live counters.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: the spec stops promising an instantaneous equality the cached design cannot deliver, and the test has an unambiguous oracle.  
    - <u>Cons</u>: two artifacts change (spec.md, tasks.md).  

  - **Recommendation B**: Leave the wording as it is, reading "in every rendering" as already meaning "at the time the rendering's data was computed".  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: no artifact changes.  
    - <u>Cons</u>: the next reader can re-raise the same contradiction, and a tester can fail SC-002 legitimately by comparing against the live bars mid-interval.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **U1** · Underspecification · MEDIUM · research.md R1/R4, data-model.md, tasks.md T003/T004  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md research.md Updated: 2026-10-27 5:25 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-27: added the anonymized deleted-account voter test case to T003 and T004 in tasks.md, and noted the `vote_history` anonymization dependency in research.md R4.  

  Account deletion anonymizes `votes` per poll (`deleted-<uuid>@deleted.invalid`) and also touches `vote_history`; the replay's per-email identity is correct only if history emails are rewritten with the same per-poll mapping. No artifact or test covers this path, and a mismatch would silently break FR-003 on polls with deleted voters.  

  - **Recommendation**: Add one test case to T003/T004 (tasks.md): a voter anonymized the way `deleteAccount` writes `vote_history`, asserting the replay still counts them once and matches `computeResults`; note the dependency in research.md R4.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: the one silent-corruption path the analysis found gets a regression test before implementation.  
    - <u>Cons</u>: slightly longer task descriptions.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C1** · Coverage Gap · MEDIUM · spec.md FR-018 vs tasks.md T009  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-27 5:25 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-27: extended T009 in tasks.md to assert the SVG carries `role="img"` and an `aria-label` containing the poll title, and that legend entries are text nodes (FR-018).  

  FR-018 (legend as accessible text, `aria-label` on the SVG) is implemented in T011 but T009's listed assertions never check it — the only untested FR.  

  - **Recommendation**: Add to T009 (tasks.md): assert the SVG carries `role="img"` and an `aria-label` containing the poll title, and that legend entries are text nodes.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: every FR has a test; FR-018 was the one exception.  
    - <u>Cons</u>: none of substance.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C2** · Coverage Gap · LOW · contracts/api.md A1 vs tasks.md T004  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md Updated: 2026-10-27 5:25 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-27: extended T004 in tasks.md with a sparse-data `200` assertion (`buckets.length < 2`, per contracts/api.md A1).  

  A1 specifies a `200` with `buckets.length < 2` for sparse data, but T004's route-test list omits that case (only the UI side is tested in T009).  

  - **Recommendation**: Add a sparse-data `200` assertion to T004 (tasks.md).  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: the contract's one untested response shape gets covered.  
    - <u>Cons</u>: none of substance.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **C3** · Coverage Gap · LOW · spec.md FR-015 vs tasks.md  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-10-27 5:25 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-27: the gap is recorded as intentional reuse of existing `tabs.css` container-query behaviour (research R9, ui-contracts C2), validated manually in T023 step 10 — no artifact changed.  

  FR-015 (narrow-viewport wrap) has no implementation task — deliberate, since the wrap is existing `tabs.css` container-query behaviour (research R9, ui-contracts C2); validated only manually in T023 step 10.  

  - **Recommendation**: No change — record the gap as intentional reuse of existing behaviour.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: avoids an empty task; the quickstart already validates the behaviour.  
    - <u>Cons</u>: coverage tooling will keep flagging FR-015 as manual-only.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

### **A1** · Ambiguity · LOW · contracts/ui-contracts.md C5, tasks.md T011  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-10-27 5:37 PM  
  **Notes**: Recommendation A accepted in file 2026-10-27: renderer discretion over X-label density — no artifact changed.  

  "X labels sit at natural steps" is unquantified (how many labels at 168 hourly points?).  

  - **Recommendation A** _(recommended)_: Accept renderer discretion — no change.  

    ➡️ [x] **Accepted**  
    - <u>Pros</u>: label density is a visual judgement the implementation iterates on anyway.  
    - <u>Cons</u>: a reviewer has no number to check against.  

  - **Recommendation B**: Pin "4–8 X labels, never overlapping" in contracts/ui-contracts.md C5 and T011.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: a testable bound.  
    - <u>Cons</u>: an arbitrary number the design may fight at odd widths.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  

### **A2** · Ambiguity · LOW · spec.md FR-014/FR-017, ui-contracts C6/C9  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ Files Unchanged (no edit needed): 2026-10-27 5:25 PM  
  **Notes**: Recommendation accepted by "Accept all" 2026-10-27: no action — the tokens-only styling rule (research R9) makes "quiet" concrete at implementation time; no artifact changed.  

  "Quiet placeholder/line" is an unmeasured adjective.  

  - **Recommendation**: No action — the tokens-only styling rule (research R9) makes "quiet" concrete at implementation time.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: avoids specifying typography the design system already governs.  
    - <u>Cons</u>: none of substance.  

  - **Developer Resolution B**:  

    ➡️ [ ] **Accepted**  

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 right-column graph | ✅ | T011, T012, T013 | |
| FR-002 cumulative replay/formula | ✅ | T003, T006 | |
| FR-003 newest point = bar graph | ✅ | T003, T004, T006, T009 | see I1, U1 |
| FR-004 scales & buckets | ✅ | T003, T006, T016 | |
| FR-005 availability & default | ✅ | T003, T006, T015, T016 | |
| FR-006 threshold | ✅ | T003, T006 | |
| FR-007 bar colours both themes | ✅ | T010, T011, T013 | |
| FR-008 legend | ✅ | T009, T011 | |
| FR-009 crosshair | ✅ | T018, T019, T020 | |
| FR-010 UTC buckets, local labels | ✅ | T003, T006, T011, T019 | |
| FR-011 refresh & clamp | ✅ | T001, T021, T022 | |
| FR-012 server-side, no identities, shared | ✅ | T004, T006, T007 | |
| FR-013 visibility enforced | ✅ | T004, T005, T007, T011 | |
| FR-014 sparse placeholder | ✅ | T009, T011 | see C2 |
| FR-015 narrow wrap | ⚠️ manual | T023 | see C3 — existing behaviour |
| FR-016 settings in config | ✅ | T001, T002, T024 | |
| FR-017 fetch failure | ✅ | T009, T011, T021, T022 | |
| FR-018 accessibility | ⚠️ impl only | T011 | see C1 — add test assertion |
| SC-001 2 s render | manual | T023 | quickstart step 2 |
| SC-002 agreement | ✅ | T003, T004 | see I1 |
| SC-003 one-interval freshness | ✅ | T021, T023 | |
| SC-004 one computation shared | ✅ | T004 | |
| SC-005 crosshair readability | ✅ | T018 | |
| SC-006 phone + themes | manual | T023 | quickstart step 10 |

## Constitution Alignment Issues

None reported.

## Unmapped Tasks

None reported.

## Metrics

- Total Requirements: 18 FR + 6 SC
- Total Tasks: 26
- Coverage: 18/18 FRs have ≥1 task (100%; FR-015 manual-by-design, FR-018 implementation-only — see C1)
- Ambiguity Count: 2 (both LOW)
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions (as reported)

No CRITICAL or HIGH findings — you may proceed to `/speckit-implement` as is. The two MEDIUMs are cheap to close first
and both guard the feature's core invariant (graph ≡ bar graph):

1. **I1** — one-line rewording of FR-003/SC-002 in `spec.md`, plus a note in T004's description.
2. **U1** — one added test case (anonymized voter) in T003/T004's descriptions in `tasks.md`.
3. **C1/C2** — two added assertions in T009/T004's descriptions.
