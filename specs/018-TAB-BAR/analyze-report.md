# Specification Analysis Report: Tab Bar

## Record

| Record | Value |
|---|---|
| Feature directory | specs/018-TAB-BAR |
| Report created | 2026-09-20 19:18 |
| Analysis captured | 2026-09-20 19:20 |
| Last updated | 2026-09-20 19:27 |

Legend: `[ ]` open · `[X]` resolved by /speckit-analyze-resolve · `[-]` resolved manually (or accepted as-is) by the developer.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"What's next" always returns the first `[ ]` item below.

**Generated**: 2026-09-20 by `/speckit-analyze` (read-only pass; this file written on request)
**Artifacts**: `spec.md` (28 FRs, 8 SCs, 3 stories, 8 edge cases), `plan.md` (7 constitution
gates, all PASS), `tasks.md` (28 tasks, 6 phases), plus `research.md`, `data-model.md`,
`contracts/ui-contracts.md`, `quickstart.md`; constitution v1.1.0.

Each finding carries an empty checkbox; tick it when the item is resolved or consciously accepted.

## Findings

- [X] **I1 — Inconsistency — MEDIUM** — spec.md FR-017 ("6 pixels below the row"); research.md R1 /
  contracts/ui-contracts.md § The rule / tasks.md T014 (`bottom:-6px` on `.tab-bar-wrap`); plan.md
  assumption 6; quickstart.md US1 step 8.
  `nav.tab-bar` has `padding-bottom:4px` (`src/public/tabs.css:82`), so `bottom:-6px` on the wrap
  puts the line **10px** below the buttons' bottom edge, while the spec and the quickstart's
  inspector check say 6px. The plan's assumption 6 acknowledges the padding but measures "from the
  row's box", which is not what a tester measuring in the inspector will do.
  - *Recommendation*: pick one — (a) `bottom:-2px` so the line sits 6px below the buttons,
    updating R1, the contract and T014; or (b) reword FR-017 and quickstart step 8 to "6px below
    the tab row's box (10px below the buttons)". (a) matches the mockup's intent.
  **Resolution:** Option A — `bottom:-6px` → `bottom:-2px` in research.md R1, contracts/ui-contracts.md § The rule and tasks.md T014, each noting the wrap's 4px bottom padding so the line lands 6px below the buttons; spec.md's assumption now measures from the buttons' bottom edge; FR-017 and quickstart step 8 unchanged (2026-09-20 19:22)

- [X] **U1 — Underspecification — MEDIUM** — spec.md FR-006; tasks.md T012; plan.md Technical
  Context.
  The Trending icon is defined by `designDocs/dontTrack/trendingupicon.jpg`, and
  `designDocs/dontTrack/` is git-ignored (`.gitignore:21`). T012 ("traced from the image") cannot
  be executed on any checkout but the author's, and the shape has no other specification.
  - *Recommendation*: add a one-line prose description of the shape to FR-006 (it exists in
    research R4: "a filled curve rising from the lower left to the upper right ending in a solid
    arrowhead"), or commit the two mockups outside `dontTrack/`.
  **Resolution:** Option A — spec.md FR-006 now defines the shape in prose (downward-bowing swoosh, lower left to upper right, solid arrowhead pointing upper-right, stroke ≈ 1/5 of the box) with the untracked JPEG as a reference only; tasks.md T012 and research.md R4 say the same (2026-09-20 19:24)

- [X] **A1 — Ambiguity — MEDIUM** — spec.md SC-001 (second clause).
  "a visitor asked to point at 'the tab for polls people are watching live' … can do so from the
  icons alone" is a usability judgement with no pass/fail rule; no task can verify it.
  - *Recommendation*: drop the clause (the first half of SC-001 is fully testable) or move it to
    quickstart as an observation.
  **Resolution:** Option A — spec.md SC-001 trimmed to "6 tabs are visible in the order given, each with an icon before its label"; the untestable clause dropped (2026-09-20 19:25)

- [X] **C1 — Coverage — LOW** — spec.md edge case "Newest is the open tab when the visitor signs
  out or signs in"; tasks.md T021, T022.
  Only the manual T022 covers the sign-in/out transition; T021 covers focus and visibility change
  but not a session change (which calls `controllers[activeTab].activate()` and, when present,
  `reset()` — Newest has no `reset`, so the existing `if` guard skips it; worth a test).
  - *Recommendation*: add a case to T021 — with Newest open, trigger `window.Session`'s subscriber
    with a changed session and assert no request and the panel unchanged.
  **Resolution:** tasks.md T021 gains sub-case (e): guest opens Newest, a session cookie is forged and `page.window.Session.refresh()` called; Newest stays active and empty, Refresh disabled, and only the `/api/me` call itself is added (2026-09-20 19:26)

- [X] **D1 — Duplication — LOW** — tasks.md T015 ("tabs.css contains no live-bar rule") and T025
  (`git grep "live-bar" -- src/public/tabs.css`).
  The same guard is asserted twice — once as a test, once as a grep.
  - *Recommendation*: keep the test (T015); drop the grep from T025, or keep both knowingly.
  **Resolution:** Option A — the `live-bar` grep removed from tasks.md T025; the guard lives on as the T015 test (2026-09-20 19:27)

- [X] **D2 — Duplication — LOW** — tasks.md T019 ("on `newest` it is `disabled`") and T021 (Refresh
  disabled on Newest).
  The Newest Refresh assertion appears in both US2 and US3.
  - *Recommendation*: harmless overlap; leave, or trim T019 to the three pre-existing tabs plus
    `?q=`.
  **Resolution:** Option A — the Newest clause removed from tasks.md T019; T021 is the single home of the Newest assertions (2026-09-20 19:27)

- [ ] **F1 — Inconsistency — LOW** — plan.md Technical Context ("1 script … ≈ 6 lines") vs
  tasks.md T004 (one line).
  The count differs; no effect on execution.
  - *Recommendation*: none needed.

No CRITICAL or HIGH findings.

## Constitution Alignment

No conflicts. Principle VI's comment rule is honoured with the one pointer comment
(`avatar-default.svg`) that FR-015 requires and that points at another artifact; Principle III's
"no sweep" is carried by T023; the Documentation Deliverables gate is carried by T027/T028 with
README's no-cross-reference rule stated.

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001, FR-002 (six tabs, order, Title Case) | ✅ | T002, T005, T006 | grep guard in T006/T025 |
| FR-003 (existing tabs unchanged) | ✅ | T018, T019, T020 | |
| FR-004 (pill unchanged) | ✅ | T007 ("change nothing else"), T017 | implicit; no rule touches `.is-active` |
| FR-005 (16×16, 6px gap, centred) | ✅ | T007, T015, T017 | geometry manual |
| FR-006 (Trending icon) | ⚠️ | T012 | see U1 — source not in repo |
| FR-007 (Newest icon) | ✅ | T013, T015 | |
| FR-008 (avatar, always default) | ✅ | T010, T015, T016 | |
| FR-009 (Favorites star) | ✅ | T008, T015 | string equality with `pollCard.js` |
| FR-010, FR-011 (Live bars, always animating, reduced motion) | ✅ | T011, T015, T017 | animation via existing `pollCard.css`; motion checks manual |
| FR-012 (Search glyph) | ✅ | T009, T015 | |
| FR-013 (colours) | ✅ | T009, T012, T013, T015, T017 | |
| FR-014 (decorative icons) | ✅ | T015, T016, T022 | |
| FR-015 (inline, avatar note) | ✅ | T010, T015, T020 | |
| FR-016 (disabled dims icon) | ✅ | T017 | existing `opacity:.45`; manual only |
| FR-017–FR-021 (the rule) | ✅ | T014, T015, T017, T020 | see I1 on the 6px |
| FR-022 (narrow windows) | ✅ | T020 | manual; no CSS change |
| FR-023–FR-027 (Newest) | ✅ | T003, T004, T021, T022 | |
| FR-028 (nothing else changes) | ✅ | T018, T025 | |
| SC-001 | ⚠️ | T005 (first clause) | second clause untestable — A1 |
| SC-002 (rule at 320–2560px) | ✅ | T017 | manual |
| SC-003 (existing checks pass) | ✅ | T001, T006, T018 | |
| SC-004 (0 requests from Newest) | ✅ | T021 | |
| SC-005 (pixel-identical glyphs, 0 image fetches) | ✅ | T015, T020 | |
| SC-006 (animation / reduced motion) | ✅ | T017 | manual |
| SC-007 (screen reader) | ✅ | T016, T022 | |
| SC-008 (only two labels, two positions change) | ✅ | T005, T006 | |

**Unmapped tasks**: none — T001 and T023–T028 map to constitution gates (baseline, Principles
V/VI, Documentation Deliverables) rather than to FRs, as intended.

## Metrics

| Metric | Value |
|---|---|
| Total requirements | 36 (28 FR + 8 SC) |
| Total tasks | 28 |
| Coverage | 36/36 with ≥1 task (100%); 2 partially specified/testable (FR-006, SC-001) |
| Ambiguity count | 1 |
| Duplication count | 2 |
| Critical issues | 0 |

## Next Actions

No CRITICAL issues — `/speckit-implement` may proceed. Two MEDIUM items are worth settling first,
because both would otherwise surface mid-implementation:

1. **I1** — decide `bottom:-2px` vs "6px below the row's box" (edit `research.md` R1,
   `contracts/ui-contracts.md` and `tasks.md` T014 for (a); or `spec.md` FR-017 and
   `quickstart.md` step 8 for (b)).
2. **U1** — add the Trending shape's prose to `spec.md` FR-006 so T012 is executable without the
   untracked JPEG.

A1 and the LOW items can wait for the implementation run.
