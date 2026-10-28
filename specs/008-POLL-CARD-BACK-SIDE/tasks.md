---

description: "Task list for 008-POLL-CARD-BACK-SIDE implementation"
---

# Tasks: Poll Card Back Side Parity

**Input**: Design documents from `/specs/008-POLL-CARD-BACK-SIDE/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md, quickstart.md

**Tests**: Test tasks ARE included — spec.md VM-002 explicitly requests automated
assertions on the served static assets. Per VM-001 the geometric criteria
(SC-001…SC-006) are verified manually via quickstart.md, so there are no
layout/browser test tasks by design.

**Organization**: Tasks are grouped by user story. Note the cross-story
dependency called out under US1 and in Dependencies below — it is real and was
flagged in spec.md itself.

## Execution Status (2026-08-14)

**All 13 code tasks are complete.** All 16 remaining tasks are **verification**
tasks, and every one of them is blocked by the environment rather than by the
implementation:

- **`npm test` cannot run here** (T003, T006, T011, T018, T027). The sandbox's
  network policy blocks `fastdl.mongodb.org`, so `mongodb-memory-server` cannot
  download its MongoDB binary and none is cached. This fails **10 pre-existing
  suites too**, so it is not caused by this feature. Unblock with
  `sbx policy allow network fastdl.mongodb.org` on the host, then run `npm test`.
- **Browser measurement cannot run here** (T001, T002, T007, T012, T013, T019,
  T020, T023, T024, T025, T026). These need a running dev server, an admin
  account to author the validation polls, and devtools to measure geometry —
  exactly the manual protocol spec.md VM-001 chose. Follow `quickstart.md`.

What *was* verified without those tools:

- `node --check` on `src/public/pollCard.js` (this caught a real defect: an
  early draft of the FR-007 comment contained backticks, which terminated the
  `POLL_CARD_TEMPLATE` template literal — `npm run build` did **not** catch it).
- `npx tsc --noEmit` clean, including the new test file.
- The template parses to 2 `class="poll-totals"` elements, contains
  `btn-vote-sizer`, and has balanced `<div>` tags.
- `npm run build` succeeds and `dist/public/` receives both changed files intact.
- The new suite collects exactly 4 tests before failing in `beforeAll` on the
  MongoDB download — i.e. it is structurally valid and blocked only by the above.
- Every string the four new assertions look for is present in the source.
- Scope confirmed: only the two planned files changed (T029).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Single project, existing layout (plan.md § Project Structure). This feature
touches only `src/public/` and adds one file under `tests/`.

**Parallelism is limited by design**: the whole feature edits just two source
files (`src/public/pollCard.js`, `src/public/site.css`), so most tasks are
sequential on file contention rather than on logic. Only genuinely
different-file pairs are marked `[P]`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the before-state so every change has a measurable
before/after, per Constitution Principle IV.

- [ ] T001 Create the six validation polls (A–F) described in `specs/008-POLL-CARD-BACK-SIDE/quickstart.md` § Prerequisites via `/admin/poll`, and record each poll's PID in a scratch note for reuse across all validation tasks
- [ ] T002 Capture baseline geometry for Poll A at 360px and 1440px using the `m()` helper in `specs/008-POLL-CARD-BACK-SIDE/quickstart.md` § Measuring technique; record `region_height` for both faces and the visible row count per face, confirming the reported defect reproduces (expected: back region roughly half the front's, ~3 rows vs. 7)
- [ ] T003 Run `npm test` and confirm all existing suites pass, establishing the green baseline SC-007 is measured against

**Checkpoint**: Defect reproduced and quantified; test suite green.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story.

**None required.** This feature adds no dependencies, no new directories, no
shared module, and no schema change (data-model.md). Every change is a localised
edit to one of two existing client files. Inventing foundational scaffolding here
would violate Constitution Principle II (Simplicity First), so this phase is
intentionally empty and user story work begins immediately after Phase 1.

**Checkpoint**: N/A — proceed directly to Phase 3.

---

## Phase 3: User Story 1 - Choices fill the voting side (Priority: P1) 🎯 MVP

**Goal**: Remove the phantom `.poll-closed-message` elements that render on every
card (research.md R1), so the voting side's choices region absorbs all space
between the header and the footer instead of splitting it with an invisible
sibling (FR-001, FR-002, FR-003).

**Independent Test**: Open Poll A (7 choices), flip the card, and confirm the
empty band above the back-side footer is gone and the choice list shows
substantially more rows than the 3 recorded in T002 — without touching any other
story's work.

**⚠️ Cross-story note**: This story removes the empty band and makes the choices
region fill its space, but **exact** top/bottom-edge parity (SC-001) also needs
US2, because the back header is currently one line shorter than the front's.
spec.md says as much in US2's "Why this priority". Expect the back region to be
taller than the front by roughly one `.poll-totals` line (~21px) after this
story alone; that residual closes in T008.

### Tests for User Story 1

- [X] T004 [US1] Create `tests/poll-card-assets.test.ts` following the supertest pattern in `tests/pages.test.ts`, with a `GET /site.css` case asserting the response text contains `.poll-closed-message[hidden]` (contracts/ui-contracts.md § C5); confirm it FAILS before T005

### Implementation for User Story 1

- [X] T005 [US1] In `src/public/site.css`, add `.poll-closed-message[hidden]` to the existing `.live-link[hidden], .vote-btn[hidden], .submit-vote-btn[hidden]{ display:none; }` rule (currently lines 228–230), and extend the explanatory comment above it (lines 222–227) to name the closed-message elements as the fourth case of the same author-origin-vs-`[hidden]` cascade hazard it already documents
- [ ] T006 [US1] Run `npm test` and confirm `tests/poll-card-assets.test.ts` now passes with no existing suite regressing
- [ ] T007 [US1] Validate against `specs/008-POLL-CARD-BACK-SIDE/quickstart.md` § V1 steps 3–4 on Poll A: no empty band above the back footer, and `back.footer_top - back.region_bottom` equals the front's 16px margin (SC-003); record the new back-face row count against T002's baseline (SC-002)

**Checkpoint**: The reported defect's root cause is fixed. The back-side choices
region fills its space and no longer scrolls prematurely; exact edge parity
follows in US2.

---

## Phase 4: User Story 2 - Participation count on the voting side (Priority: P2)

**Goal**: Show the participation count on the voting side with identical text,
position, and styling, which also equalises the two headers and completes the
region parity US1 started (FR-004, FR-005).

**Independent Test**: Flip a card with a known vote count and confirm the voting
side shows the same "N participant(s) voted" string as the results side, in the
same header position and grey typography, updating together on live refresh.

### Tests for User Story 2

- [X] T008 [US2] Extend `tests/poll-card-assets.test.ts` with a `GET /pollCard.js` case asserting the markup form `class="poll-totals"` occurs **exactly twice** — e.g. `expect(res.text.match(/class="poll-totals"/g)).toHaveLength(2)` — proving the back-face copy shipped (contracts/ui-contracts.md § C5); confirm it FAILS before T009 (it currently matches once). Do NOT assert on the bare string `poll-totals`: it already occurs 3× in the file (a `querySelector` call, a comment, and the front-face element), so such an assertion would pass before implementation and never detect a missing element

### Implementation for User Story 2

- [X] T009 [US2] In `src/public/pollCard.js`, add `<p class="poll-totals"></p>` as the last child of the **back** face's `.question-wrap` in `POLL_CARD_TEMPLATE` (~line 927), mirroring the front face's DOM order exactly — plain duplicate, no `aria-hidden`/`aria-live`/`role` (contracts/ui-contracts.md § C1.1)
- [X] T010 [US2] In `src/public/pollCard.js` `setText()` (~lines 726–734), replace the single `viewport.querySelector('.poll-totals')` lookup and its `if (totalsEl)` guard with `viewport.querySelectorAll('.poll-totals').forEach((el) => { el.textContent = text; })`, hoisting the existing string composition into a `text` const and leaving the singular/plural and "· N not yet voted" logic byte-for-byte unchanged (contracts/ui-contracts.md § C3)
- [ ] T011 [US2] Run `npm test` and confirm the new assertion passes with no existing suite regressing
- [ ] T012 [US2] Validate against `specs/008-POLL-CARD-BACK-SIDE/quickstart.md` § V2 (all 5 steps, including the live-update check on a second browser session and the invitation-only Poll D variant) — SC-004, FR-005
- [ ] T013 [US2] Re-run `specs/008-POLL-CARD-BACK-SIDE/quickstart.md` § V1 steps 2 and 5 in full at 360px, 480px, 768px, 1024px and 1440px, confirming `region_top`, `region_bottom` and `region_height` now match within 1px on both faces and both faces show the same row count (SC-001, SC-002, FR-010)

**Checkpoint**: US1 + US2 together deliver full region parity — the bug in
`poll-card-back-side-bug.jpg` is resolved and measurably verified.

---

## Phase 5: User Story 3 - Matching footers on both sides (Priority: P3)

**Goal**: Make the two primary buttons render at the same content-derived width
at every viewport width (FR-007), and verify the footer parity FR-006/FR-006a
assert.

**Independent Test**: At 360px, measure the **Vote** and **Submit vote** buttons
and confirm they differ by ≤1px with neither label wrapping; separately confirm
both footers share a top edge and below-footer gap.

**⚠️ Scope note**: research.md R2 concluded FR-006/FR-006a need **no code
change** — both faces already derive footer geometry from identical shared rules,
and the apparent difference in the screenshot was the US1 phantom. T019 verifies
that rather than assuming it. If a real delta appears, report it with the `m()`
output before writing any CSS for it — do not add speculative declarations.

### Tests for User Story 3

- [X] T014 [US3] Extend `tests/poll-card-assets.test.ts` with cases asserting `GET /pollCard.js` contains `btn-vote-sizer` and `GET /site.css` contains `.btn-vote-sizer` (contracts/ui-contracts.md § C5); confirm both FAIL before T015/T016

### Implementation for User Story 3

- [X] T015 [P] [US3] In `src/public/pollCard.js` `POLL_CARD_TEMPLATE` (~line 917), wrap the Vote button's label and add the width sizer: `<button class="btn-primary btn-vote vote-btn" type="button"><span class="btn-vote-label">Vote</span><span class="btn-vote-sizer" aria-hidden="true">Submit vote</span></button>`, with a comment stating that the sizer text must be kept identical to the `.submit-vote-btn` label, that the label wrapper is required (a bare text node becomes an anonymous grid item that cannot be stacked), and why `aria-hidden` is required (contracts/ui-contracts.md § C1.2, research.md R7)
- [X] T016 [P] [US3] In `src/public/site.css`, add the three sizer rules alongside the other app-owned poll card rules — `.vote-btn{ display:grid; justify-content:center; align-content:center; }`, `.vote-btn > *{ grid-area:1 / 1; }`, and `.btn-vote-sizer{ visibility:hidden; height:0; overflow:hidden; }` — commented to record that (a) the single-cell grid is what makes the column resolve to `max(label, sizer)` instead of the **sum** a row flex container would produce, (b) the override is deliberately scoped to `.vote-btn` so `.submit-vote-btn` stays a flex button, and (c) `.btn-vote`'s `min-width:25%` floor in `pollCard.css` is retained, not overridden (contracts/ui-contracts.md § C2.3, research.md R7)
- [X] T017 [US3] Add a matching comment at the `.submit-vote-btn` markup in `src/public/pollCard.js` pointing back to `.btn-vote-sizer`, so a future label edit is caught at either site (research.md R7 stated limitation)
- [ ] T018 [US3] Run `npm test` and confirm the two new assertions pass with no existing suite regressing
- [ ] T019 [US3] Validate against `specs/008-POLL-CARD-BACK-SIDE/quickstart.md` § V3 steps 1–4 on Poll A at **all five widths** (360px, 480px, 768px, 1024px, 1440px, matching T013's sweep): footer top edges and below-footer gaps within 1px, button widths within 1px, neither label wrapping or clipped, and the Vote button's label still visually centred after the grid override (SC-005, FR-006, FR-007, FR-010)
- [ ] T020 [US3] Verify the cascade requirements the grid override depends on, per `specs/008-POLL-CARD-BACK-SIDE/quickstart.md` § V3 step 5 (contracts/ui-contracts.md § C2.3): on a closed poll, confirm the Vote button is still fully hidden — `.vote-btn[hidden]` (specificity `0,2,0`) must keep beating the new `.vote-btn{display:grid}` (`0,1,0`) — and confirm `src/public/index.html` still loads `site.css` after `pollCard.css`

**Checkpoint**: Buttons are equal-width at every width; footer parity verified
in the open state (closed state verified in US4).

---

## Phase 6: User Story 4 - Consistent closed-poll message styling (Priority: P4)

**Goal**: Render both closed-poll messages in the participation count's muted
grey treatment without moving either footer (FR-008, FR-006a).

**Independent Test**: On a closed poll, compare the computed colour, font family,
weight, and size of each face's closed message against that face's participation
count — all four must match — while the footer stays where it was on an open
poll.

### Implementation for User Story 4

- [X] T021 [US4] In `src/public/site.css` `.poll-closed-message` (~line 234), replace `color:var(--ink); font-weight:700; font-size:12.5px` with the `.poll-totals` treatment — `color:var(--muted); font-weight:500; font-size:clamp(11px, 1vw, 12.5px); line-height:1.4` — and **also drop `letter-spacing:0.01em`**, which `.poll-totals` does not set and which would otherwise leave the two typographically different despite passing SC-006's four enumerated properties. Keep `font-family:'Inter', sans-serif` and, critically, `height:28px; display:flex; align-items:center` unchanged, with a comment recording that the fixed height is what holds the footer steady between open and closed states (FR-006a, contracts/ui-contracts.md § C2.2)
- [X] T022 [US4] In `src/public/site.css` `.poll-closed-message--back` (~line 248), remove the `font-size:14px`, `font-weight:500`, `color:var(--muted)` **and now-redundant `font-family:'Inter', sans-serif`** declarations so the element inherits all of its typography from the base rule updated in T021, leaving its `flex:1 1 auto; min-height:0; margin:0 0 16px; display:flex; align-items:center; justify-content:center; text-align:center` box behaviour untouched (contracts/ui-contracts.md § C2.2)
- [ ] T023 [US4] Validate against `specs/008-POLL-CARD-BACK-SIDE/quickstart.md` § V4 on Poll E (closed): all four computed-style rows match (SC-006), wording unchanged from `007-closed-state`, closed-poll suppression and the back arrow still behave as before, and the voting-side message fills the shared region
- [ ] T024 [US4] Validate `specs/008-POLL-CARD-BACK-SIDE/quickstart.md` § V3 step 6 on Poll E: footer top edge and below-footer gap still match between faces in the **closed** state, and the results-side message renders on one line without changing the footer's height (FR-006a, SC-005)

**Checkpoint**: All four user stories complete and independently verified.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full-sweep verification and scope confirmation.

- [ ] T025 Run the complete `specs/008-POLL-CARD-BACK-SIDE/quickstart.md` § V5 edge-case matrix on Polls B, C and F: short-list top anchoring, 50-choice scrolling parity with matching arrow affordances, long-label truncation unchanged, wrapped-question header growth equal on both faces, and reduced-motion unaffected
- [ ] T026 Run `specs/008-POLL-CARD-BACK-SIDE/quickstart.md` § V6 step 2 regression sweep on Polls A and C against the surface listed in `specs/008-POLL-CARD-BACK-SIDE/contracts/ui-contracts.md` § C4 — flip both ways, single/multi-choice selection, submit-disabled-until-selected, vote submission and totals refresh, scroll arrows (click and press-and-hold), drag-to-scroll on both faces, and unchanged card outer size (FR-009)
- [ ] T027 Run `npm test` for the final green confirmation across all suites including `tests/poll-card-assets.test.ts` (SC-007, VM-002)
- [X] T028 Run `npm run build` and confirm the changed `src/public/pollCard.js` and `src/public/site.css` are copied into `dist/public/` intact
- [X] T029 Confirm scope boundaries with `git diff --stat`: only `src/public/pollCard.js`, `src/public/site.css` and the new `tests/poll-card-assets.test.ts` changed — `src/public/pollCard.css`, `postman/openapi.json`, all `src/polls/`, `src/routes/` and every admin page untouched (plan.md § Project Structure, spec.md Assumptions)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Empty; does not block anything
- **User Stories (Phases 3–6)**: Depend only on Phase 1
- **Polish (Phase 7)**: Depends on all four stories being complete

### User Story Dependencies

- **US1 (P1)**: Independent. Delivers the root-cause fix.
- **US2 (P2)**: Independently implementable and testable on its own terms
  (the participation count appears and stays in sync regardless of US1).
  **However, SC-001's exact edge parity requires US1 + US2 together** — US1
  removes the phantom, US2 equalises the headers. Treat the pair as the MVP.
- **US3 (P3)**: Independent of US1/US2 for the button-width work. Its footer
  *verification* (T019) is only meaningful after US1, since the phantom distorts
  the back face's layout.
- **US4 (P4)**: Independent — pure restyling. Its closed-state footer check
  (T024) is only meaningful after US1, for the same reason.

### File Contention (why so few `[P]`)

- `src/public/site.css` is edited by T005 (US1), T016 (US3), T021 and T022 (US4)
  — these must be sequential.
- `src/public/pollCard.js` is edited by T009, T010 (US2) and T015, T017 (US3)
  — these must be sequential.
- `tests/poll-card-assets.test.ts` is created by T004 and extended by T008 and
  T014 — these must be sequential.

### Parallel Opportunities

- **T015 ‖ T016** — the only genuine same-story parallel pair (different files:
  `pollCard.js` vs `site.css`, no dependency between them).
- Across stories with multiple developers: US4 (`site.css` only) and US2
  (`pollCard.js` only) touch disjoint files and could proceed concurrently once
  US1's `site.css` edit has landed.
- All validation tasks (T007, T012, T013, T019, T020, T023, T024, T025, T026)
  are read-only observation and can be batched into a single browser session per
  viewport width rather than run one at a time.

---

## Parallel Example: User Story 3

```bash
# The two US3 implementation tasks touch different files — run together:
Task: "T015 Wrap the Vote label and add the .btn-vote-sizer span in src/public/pollCard.js"
Task: "T016 Add the .vote-btn grid + .btn-vote-sizer rules to src/public/site.css"
```

---

## Implementation Strategy

### MVP (User Stories 1 + 2)

1. Complete Phase 1 (Setup) — reproduce and quantify the defect
2. Complete Phase 3 (US1) — the one-line root-cause fix
3. Complete Phase 4 (US2) — header equalisation
4. **STOP and VALIDATE**: quickstart § V1 and § V2 at all five viewport widths
5. This is the shippable fix for the reported bug; US3 and US4 are polish

US1 alone is a legitimate smaller increment (the empty band and premature
scrolling both disappear), but it lands ~21px short of exact edge parity, so
SC-001 does not pass until US2 is in.

### Incremental Delivery

1. Setup → defect quantified
2. US1 → phantom gone, choices fill their space → validate
3. US2 → exact parity + participation count → validate → **ship-worthy**
4. US3 → equal button widths, footer parity verified → validate
5. US4 → consistent closed-message styling → validate
6. Polish → full sweep, scope confirmation

Each story adds value without breaking the previous ones.

---

## Notes

- `[P]` tasks = different files, no dependencies
- `[Story]` label maps each task to a spec.md user story for traceability
- `src/public/pollCard.css` is the reference stylesheet and is **never** edited —
  all CSS deltas go in `src/public/site.css` (research.md R3)
- Verify the new test assertions FAIL before their implementation task — and
  that they fail for the *right* reason. T008 in particular must assert on
  `class="poll-totals"`, not the bare string, or it passes vacuously
- Commit after each story's checkpoint
- If T019 or T024 reveal a genuine footer delta, stop and report it with the
  `m()` output rather than adding speculative CSS (research.md R2)
- The `.vote-btn` grid override (T016) is what makes the button sizer work; a
  flex sibling would size the button to the **sum** of both labels. Do not
  "simplify" it back to flex (research.md R7)
