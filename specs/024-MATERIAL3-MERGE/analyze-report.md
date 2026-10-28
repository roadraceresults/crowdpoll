# Specification Analysis Report — specs/024-MATERIAL3-MERGE

## Record

| Record | Value |
|---|---|
| Feature directory | specs/024-MATERIAL3-MERGE |
| Report created | 2026-10-03 16:11 |
| Analysis captured | 2026-10-03 16:11 |
| Last updated | 2026-10-03 16:14 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

Earlier analyses, all resolved: `analyze-report-01.md` (Steps 1–5, 2026-10-01) and
`analyze-report-02.md` (Step 6, 2026-10-03 morning). This report covers the three follow-ups added
after Step 6 was built (FR-040, FR-049, FR-050 → research R27–R29 → tasks T088–T100).

## Findings

- [X] **I1** · Inconsistency · MEDIUM · spec.md FR-050; research R29; tasks T096  
  **Summary:** FR-050 removes rules "that only the removed editing face used", but R29's list (and T096) also removes leftovers of the older table-style admin list (`admin-title-link`, `admin-icon-cell`, `admin-row-error`, `admin-subtitle-line`, `admin-screening-line`, `admin-rejection-reason`). The plan does more than the spec allows.  
  **Recommendation:** Widen FR-050 to "rules that nothing on the two admin pages uses (the removed editing face's and older leftovers)". The alternative is to cut R29's list back, but those rules are just as unused.  
  **Resolution:** spec.md FR-050 widened to rules that nothing on the two admin pages uses, the removed editing face's and the admin list's older leftovers, matching R29 and T096 (2026-10-03 16:13)

- [X] **U1** · Underspecification · MEDIUM · tasks T095, T098  
  **Summary:** The before-and-after style check asks for a standalone scratchpad jsdom script that drives `adminCard.js` through the wizard. That means faking `fetch`, `/api/config` and the edit session by hand, which is a lot of work for a throwaway. The test suite's `openPage` helper already does all of this. Also, jsdom's computed style is unreliable about which competing rule wins, so the check proves "no element changed", not "nothing looks different".  
  **Recommendation:** Rewrite T095/T098 to use a temporary test file built on `openPage` (or a `describe.skip` block kept in the client wizard tests), and say that Q20, the developer's browser check, is what confirms the look.  
  **Resolution:** tasks.md T095/T098 now use a temporary, uncommitted test file built on `openPage` (sheets inlined in link order), deleted after T098, and name Q20 as the check of the look (2026-10-03 16:13)

- [X] **G1** · Coverage gap · LOW · spec FR-030, FR-050; tasks T097  
  **Summary:** FR-050 has no lasting automated guard. Nothing in the suite would catch an unused rule being added back.  
  **Recommendation:** Add to T097: an asset test that `admin.css` contains none of R29's class and id names.  
  **Resolution:** tasks.md T097 adds an asset test that `admin.css` contains none of R29's class and id names (2026-10-03 16:13)

- [X] **I2** · Inconsistency · LOW · designDocs requirements (Step 6 "four server changes"); architecture doc C13  
  **Summary:** Both still say four server changes and don't mention FR-049, FR-040 or FR-050. The spec, plan and `CLAUDE.md` say five. These files are outside the three artifacts this analysis covers.  
  **Recommendation:** Add one line to each (offered after `/speckit-plan`).  
  **Resolution:** with the developer's go-ahead, designDocs/024-high-level-requirements-MATERIAL3-MERGE.md (five server changes, the `/publish` hold, the two client follow-ups, the server line and Exclusions) and architecture/024-material3-merge/architecture.md (overview, C12, C13) now match the spec (2026-10-03 16:14)

- [X] **A1** · Ambiguity · LOW · tasks T094  
  **Summary:** It says to delete controllers without saved progress in "the empty Search view", but doesn't say whether that view's empty list should still remove kept cards from the page. They must be removed from the page; only their controllers stay.  
  **Recommendation:** Add: "the empty view still clears the list's children; only the controllers with saved progress are kept".  
  **Resolution:** tasks.md T094 says the empty Search view still clears the list's children; only the controllers with saved progress are kept (2026-10-03 16:13)

- [X] **O1** · Ordering · LOW · tasks Phase 13b  
  **Summary:** T088–T100 are numbered after T087 but run before T085. This is documented in the phase heading, T085 and the dependency notes.  
  **Recommendation:** None needed; note only.  
  **Resolution:** no change needed: the order is documented in Phase 13b's heading, T085 and the dependency notes (2026-10-03 16:13)

## Coverage Summary

The follow-ups only.

| Requirement | Has task? | Task IDs | Notes |
|---|---|---|---|
| FR-040 (progress across views) | Yes | T092–T094 | A1 |
| FR-049 (starter-choices hold) | Yes | T088–T091 | |
| FR-050 (unused styles) | Yes | T095–T098 | I1, U1, G1 |
| FR-030 (tests for FR-032–FR-050) | Partial | T088, T092, T097 | G1 |
| SC-009 (five server changes, in the API description) | Yes | T089, T090, T099 | |
| SC-012 (answers survive a reload) | Yes (unchanged) | T064 | |

## Constitution Alignment Issues

None. R29 applies Principle III: remove what your change left unused. FR-049 adds no log line, which Principle V doesn't require for a rule change.

## Unmapped Tasks

None. T099 is a checkpoint and T100 is documentation.

## Metrics

- Total requirements: 63 (50 FR + 13 SC).
- Total tasks: 100 (83 done, 17 open).
- Coverage: 100% have at least one task.
- Ambiguity count: 2 (U1, A1).
- Duplication count: 0.
- Critical issues: 0.

## Next Actions (as reported)

There are no CRITICAL or HIGH issues, so `/speckit-implement` can go ahead. I'd fix I1 and U1 first: I1 is a one-line spec change, and U1 avoids writing a fragile throwaway script. G1 and A1 are one-line additions to T097 and T094. I2 is outside the three artifacts and is optional.
