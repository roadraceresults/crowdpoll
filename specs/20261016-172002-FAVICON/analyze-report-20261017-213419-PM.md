# Specification Analysis Report — specs/20261016-172002-FAVICON

## Record

| Record | Value |
|---|---|
| Feature directory | specs/20261016-172002-FAVICON |
| Report created | 2026-10-17 19:02 |
| Analysis captured | 2026-10-17 19:02 |
| Last updated | 2026-10-17 19:02 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

## Findings

- [ ] **C1** · Constitution · CRITICAL · tasks.md Phase 6; constitution, Governance and Documentation Deliverables  
  **Summary:** The constitution says "every feature's task list MUST carry a post-implementation documentation phase" for `README.md` and `ARCHITECTURE.md`. `tasks.md` has none. Feature 032's T035/T036 show the expected form.  
  **Recommendation:** Add a phase after T021: regenerate `README.md` (in its developer-commands section, add `npx tsx devScripts/favicon-ico.ts`, Edge or `FAVICON_BROWSER` as a prerequisite, and "rerun when `favicon.svg` changes") and `ARCHITECTURE.md` (the two static icon files, the asset pipeline serving them, and the dev script beside `file-manifest.ts`).

- [ ] **C2** · Constitution · MEDIUM · plan.md, Constitution Check  
  **Summary:** The gate table covers principles I–VI only. It never mentions the Documentation Deliverables, which is why C1 slipped through.  
  **Recommendation:** Add a row: "Documentation Deliverables: README and ARCHITECTURE updated after implementation (Phase 7)".

- [ ] **U1** · Underspecification · MEDIUM · tasks.md T013; constitution V  
  **Summary:** T013 handles a missing browser and a wrong-size PNG. It says nothing about the browser exiting non-zero, hanging, or writing no screenshot. `execFileSync` would then throw an uncaught stack trace or block forever.  
  **Recommendation:** Pass `timeout: 30000` to `execFileSync`. Catch the error, print `[favicon] Browser failed rendering <s> px: <message>`, and exit 1. Before reading each PNG, check it exists, and print `[favicon] No screenshot for <s> px` if it doesn't.

- [ ] **I1** · Inconsistency · MEDIUM · quickstart.md §3 (`/admin-results/<pid>`), research.md R6 (`/admin-results`) vs `src/routes/pages.ts`  
  **Summary:** The real results-page address is `/admin/poll/results?PID=<pid>`. tasks.md T003 already uses it; quickstart and research do not.  
  **Recommendation:** Correct quickstart §3 and R6.

- [ ] **I2** · Inconsistency · MEDIUM · research.md R6.1 vs tasks.md T003  
  **Summary:** R6.1 implies all seven pages answer 200. The not-authorized card answers `403` (`pages.test.ts`, "Unauthorized access…").  
  **Recommendation:** Add "(403 for the not-authorized card)" to R6.1.

- [ ] **G1** · Coverage · LOW · spec FR-008 ("documented procedure"), SC-005  
  **Summary:** The procedure is documented only in the script's usage header and in quickstart §1, a spec artifact.  
  **Recommendation:** C1's README update covers it.

- [ ] **G2** · Coverage · LOW · spec FR-004 (prototype pages)  
  **Summary:** Nothing checks the icon on a prototype page. T020 checks only a plain-text `Not found` address.  
  **Recommendation:** Optional: in T020, also open one `/prototypes/<name>/` with `ENV_PROTOTYPES` set.

- [ ] **G3** · Coverage · LOW · spec FR-006, FR-007  
  **Summary:** The 1 px margin and the `<title>CrowdPoll</title>` are set by T002's exact markup but not tested.  
  **Recommendation:** Accept it: the geometry is fixed in T002, and the look is judged in T020. Optional: add `expect(svg).toContain("<title>CrowdPoll</title>")` to the T012 test.

- [ ] **A1** · Ambiguity · LOW · spec, User Story 1, scenario 3; SC-004  
  **Summary:** "Distinguishable" is judged by eye, with no contrast threshold.  
  **Recommendation:** Acceptable, since SC-004 names the method (by eye, light and dark). No change.

- [ ] **D1** · Duplication · LOW · tasks.md T011, T015, T017  
  **Summary:** Three near-identical "run the favicon tests" steps.  
  **Recommendation:** Acceptable: each closes its own story's red-to-green cycle. No change.

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 two files | Yes | T002, T013–T014 | |
| FR-002 three sizes | Yes | T012–T015 | |
| FR-003 links on 7 pages | Yes | T003–T011 | |
| FR-004 root `/favicon.ico` | Yes | T016–T017, T020 | prototype pages not checked (G2) |
| FR-005 figures only, colours | Yes | T002, T020 | |
| FR-006 centred, transparent, 1 px | Yes | T002, T020 | by eye only (G3) |
| FR-007 title, no alt | Yes | T002 | untested (G3) |
| FR-008 repeatable procedure, no build step | Yes | T001, T013–T014, T021 | "documented" gap (G1) |
| FR-009 logo unchanged | Yes | T002, T021 | |
| FR-010 automated checks | Yes | T003, T012, T016 | |
| SC-001 7 tabs | Yes | T011, T020 | |
| SC-002 root succeeds | Yes | T016–T017 | |
| SC-003 3 images | Yes | T012, T015 | |
| SC-004 light/dark by eye | Yes | T020 | |
| SC-005 one step | Yes | T013–T014 | |
| SC-006 nothing else changes | Yes | T018, T021 | |

## Constitution Alignment Issues

- C1 (CRITICAL): the documentation phase is missing.
- C2: the plan's gate table omits it.
- U1 touches Principle V (fail gracefully, with a clear message).
- Principles I–IV and VI are satisfied: T002 and T013 forbid explanatory comments, the scope check is T021, and every task has a verifiable result.

## Unmapped Tasks

None. T001 serves FR-008 (the script must be tracked); T018–T021 serve SC-006 and the quickstart checks.

## Metrics

- Total requirements: 16 (FR-001 to FR-010, SC-001 to SC-006)
- Total tasks: 21
- Coverage: 100% (16/16 have at least one task)
- Ambiguity count: 1
- Duplication count: 1
- Critical issues: 1

## Next Actions (as reported)

- **Resolve C1 before `/speckit-implement`:** add the documentation phase to `tasks.md`, and the C2 row to `plan.md`.
- **Worth fixing at the same time:** U1 (T013's browser-failure handling), plus I1/I2 (correct quickstart §3 and research R6).
- The LOW items may stay as they are.
- Suggested route: `/speckit-analyze-resolve`, or approve the edits below.
