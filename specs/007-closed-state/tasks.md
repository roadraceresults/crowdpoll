# Tasks: Poll Closed State Display

**Input**: Design documents from `/specs/007-closed-state/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md,
quickstart.md

**Tests**: None automated. The one server-side behavior this feature depends on (rejecting a
vote on a closed poll) already has coverage in `tests/polls-vote.test.ts` from
`004-realtime-poll-voting` — nothing here changes it. This feature's own work is entirely
DOM/visual/timing-level in `pollCard.js`/`site.css`; this project has no browser/DOM test
tooling (no jsdom/Playwright in `package.json` devDependencies) and adding one for a
3-story client-only feature would violate Simplicity First — validated instead via the
manual steps in `quickstart.md`, per the constitution's tests-OR-manual-check allowance
(Principle IV), the same approach `005-admin-page-improvements`/`006-poll-choices-editor`
used for their own DOM-level stories.

**Organization**: Tasks are grouped by user story (US1–US3, priority order from spec.md).
US1 delivers the front-face (grid) treatment standalone. US2 adds the back-face (voting
side) treatment as a second branch of the same `updateClosedState()` function US1 creates —
additive, not file-disjoint, but independently valuable and testable on its own (a voter
never sees the back face unless they click "Vote"). US3 is a one-line change to how the
existing submit-failure path recovers, relying on US2's back-face rendering already being in
place for its own effect to be visible.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US3)

## Path Conventions

Single project at repository root per plan.md (`src/`).

---

## Phase 1: Setup

**Purpose**: None — no new dependencies, no new project structure. No setup tasks for this
feature.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None. There is no shared infrastructure to build ahead of the user stories —
`pollState`/`endAt` are already present on every poll payload (research.md R1), and the one
new function this feature adds belongs entirely to User Story 1's phase (Phase 3 below).

**Checkpoint**: N/A — proceed directly to Phase 3.

---

## Phase 3: User Story 1 - Home Grid Shows Closed Polls Clearly (Priority: P1) 🎯 MVP

**Goal**: A closed poll's card, wherever it's shown (grid or standalone `?PID=` view), shows
"Poll closed on `<date>`" in place of "Live Results" and shows no "Vote" button — updating
live if the poll closes while the card is already on screen (FR-001–003, spec.md US1
Acceptance Scenarios).

**Independent Test**: Load the grid with a closed poll present; confirm its card shows the
closed message where "Live Results" sits, in the same font/style, with no "Vote" button,
while an open poll's card is unaffected (quickstart.md US1).

### Implementation for User Story 1

- [X] T001 [P] [US1] In `src/public/pollCard.js`'s `POLL_CARD_TEMPLATE`, add
      `<p class="poll-closed-message" hidden></p>` inside `.card-front .actions`, alongside
      the existing `.live-link`/`.vote-btn` (contracts/ui-contracts.md)
- [X] T002 [US1] In `src/public/pollCard.js`'s `initPollCard()`, add a `formatClosedDate(iso)`
      helper (`new Date(iso).toLocaleDateString()`, research.md R4) and an
      `updateClosedState()` function — called at the end of `render()` — that toggles
      `.live-link`/`.vote-btn`/`.poll-closed-message` (`hidden`, and the message's text) based
      on `poll.pollState === "CLOSED-POLL-STATE"` (contracts/ui-contracts.md front-face
      rules) — depends on T001
- [X] T003 [P] [US1] In `src/public/site.css`, add `.poll-closed-message` rules mirroring
      `.live-link-label`'s existing typography (font-family, weight, size, letter-spacing,
      color) and `.live-link`'s row height, so the message reads as a drop-in replacement for
      the link it occupies (research.md R3, FR-001) — `pollCard.css` (reference file) is not
      touched. Also adds `.live-link[hidden], .vote-btn[hidden], .submit-vote-btn[hidden]{
      display:none; }` — discovered during implementation that `pollCard.css`'s reference
      rules for these three elements (`.live-link`, and `.btn-primary` which both buttons
      carry) set `display:flex` unconditionally, which silently defeats the plain `hidden`
      attribute (an author-origin rule always wins over the UA-stylesheet `[hidden]` rule
      regardless of specificity) — the same class of bug as `006-poll-choices-editor`'s
      `#saveChoicesBtn:disabled` fix. `.voting-scroll-wrap` has no such override and needed
      none.
- [X] T004 [US1] Manual validation: run `quickstart.md` "US1" steps 1–5 — depends on
      T001–T003

**Checkpoint**: User Story 1 fully functional and independently testable — a closed poll is
unmistakable on the grid, with no dependency on User Story 2/3.

---

## Phase 4: User Story 2 - Voting Side Reacts to a Poll Closing (Priority: P2)

**Goal**: If a poll's voting side is open and the poll is or becomes closed, the choice
options and "Submit vote" button are replaced by "This Poll closed on `<date>`", while the
existing back-navigation control keeps working (FR-004–007, spec.md US2 Acceptance
Scenarios).

**Independent Test**: Open a poll's voting side, have the poll close while it's open (or open
the voting side of an already-closed poll); confirm the choice bars and "Submit vote"
disappear in favor of the closed message, and confirm the back control still returns to the
results side (quickstart.md US2).

### Implementation for User Story 2

- [X] T005 [P] [US2] In `src/public/pollCard.js`'s `POLL_CARD_TEMPLATE`, add
      `<p class="poll-closed-message poll-closed-message--back" hidden></p>` as a sibling to
      `.voting-scroll-wrap` inside `.card-back` (not inside `.actions`, so `.back-btn` stays
      untouched — contracts/ui-contracts.md)
- [X] T006 [US2] In `src/public/pollCard.js`'s `updateClosedState()` (T002), add the back-face
      branch: toggle `.voting-scroll-wrap`/`.submit-vote-btn`/`.poll-closed-message--back`
      (`hidden`, and the message's text via the same `formatClosedDate()`) the same way, using
      the same `poll.pollState` check — `.back-btn` is never touched, so it stays usable
      (FR-007, contracts/ui-contracts.md back-face rules) — depends on T002, T005
- [X] T007 [P] [US2] In `src/public/site.css`, add `.poll-closed-message--back` rules: centered
      in the space `.voting-scroll-wrap` occupies, sized for readability as the face's primary
      content when shown (unlike the compact front-face badge, this message has no existing
      element it must visually match) — depends on T003 (same rule block)
- [X] T008 [US2] Manual validation: run `quickstart.md` "US2" steps 1–3 — depends on
      T005–T007

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - No Vote Is Ever Counted After Closing (Priority: P3)

**Goal**: If a vote submission is rejected because the poll closed in the moments between
opening the voting side and pressing "Submit vote," the voter ends up looking at the closed
message (User Story 2) rather than a control that silently re-enables with no explanation
(FR-008/009, spec.md US3 Acceptance Scenarios). FR-008 itself (the server never counting such
a vote) is already implemented and tested (research.md R1) — this story is entirely about the
client's reaction to that rejection.

**Independent Test**: Submit a vote against a poll at (or after) the moment it closes; confirm
the vote isn't counted and the voter ends up on the closed-message state rather than a
button that just quietly re-enables (quickstart.md US3).

### Implementation for User Story 3

- [X] T009 [US3] In `src/public/pollCard.js`'s `submitBtn` click handler, change the failure
      path (non-`ok` response or thrown error) from calling `updateSubmitState()` directly to
      calling `fetchPoll()` instead — which re-fetches and re-`render()`s (and therefore runs
      `updateClosedState()`, T002/T006) using the server's current `pollState` rather than
      guessing from the rejection's error text (FR-009, contracts/ui-contracts.md
      "Vote-rejection reaction contract") — depends on T006
- [X] T010 [US3] Manual validation: run `quickstart.md` "US3" steps 1–4 — depends on T009

**Checkpoint**: All three user stories now independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T011 [P] Run the full `npm test` suite and confirm no regressions (none expected — this
      feature touches only `src/public/pollCard.js`/`site.css`, research.md R1)
- [X] T012 Full `quickstart.md` walkthrough (all three user stories in one pass) as a final
      regression check — depends on T004, T008, T010

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: None.
- **Foundational (Phase 2)**: None.
- **User Story 1 (Phase 3)**: No dependency on Setup/Foundational (both empty).
- **User Story 2 (Phase 4)**: Additive to User Story 1 — `updateClosedState()` (T002) is
  extended, not duplicated, so T006 depends on T002 as well as T005.
- **User Story 3 (Phase 5)**: Depends on User Story 2 — its effect (landing on the closed
  message after a rejected submit) is only visible once the back-face branch (T006) exists.
- **Polish (Phase 6)**: Depends on whichever user stories were completed.

### Within Each User Story

- US1: T001 (template) and T003 (CSS) are independent of each other; T002 (JS logic) depends
  on T001 (queries the element it creates); T004 validates all of them.
- US2: T005 (template) and T007 (CSS, extends T003's rule block) are independent of each
  other; T006 depends on both T002 (extends it) and T005 (queries the element it creates);
  T008 validates all of them.
- US3: T009 depends on T006 (the rejection's visible effect is the back-face closed state);
  T010 validates it.

### Parallel Opportunities

- Within US1: T001 and T003 can run together (different files).
- Within US2: T005 and T007 can run together (different files).
- Across stories: T001/T003 (US1) and T005/T007 (US2) don't strictly need to wait on each
  other's *other* story's checkpoint, but T002 must land before T006, and T006 before T009 —
  the three stories' actual logic tasks (T002, T006, T009) are inherently sequential since
  each extends the last, even though their template/CSS tasks aren't.

---

## Parallel Example: User Story 1

```bash
# Launch the independent US1 setup tasks together:
Task: "Add .poll-closed-message template element to pollCard.js"
Task: "Add .poll-closed-message CSS rules to site.css"

# Then, once both land:
Task: "Add updateClosedState()/formatClosedDate() to pollCard.js, wired to render()"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (Home Grid Shows Closed Polls Clearly).
2. **STOP and VALIDATE**: run `quickstart.md` US1 independently.
3. Deploy/demo if ready — a closed poll is already unmistakable on the grid even before a
   voter can flip into a closed poll's now-improved voting side.

### Incremental Delivery

1. Add User Story 1 → validate → deploy/demo (MVP).
2. Add User Story 2 → validate → deploy/demo.
3. Add User Story 3 → validate → deploy/demo.
4. Each story adds value without breaking the others — User Story 2 extends the function User
   Story 1 created rather than replacing it, and User Story 3 is a one-line reaction change
   that only matters once User Story 2 exists.

### Parallel Team Strategy

Less applicable than for a fully file-disjoint feature — all three stories converge on the
same function (`updateClosedState()`) in the same file. With two developers:

1. Developer A: `pollCard.js` template/logic tasks (T001, T002, T005, T006, T009) — inherently
   sequential within this list.
2. Developer B: `site.css` tasks (T003, T007) — can run ahead of or alongside Developer A,
   since CSS for a not-yet-toggled class has no functional dependency on the JS that toggles
   it.
3. Validation tasks (T004, T008, T010) follow each story's logic task.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- FR-001–003 ⇒ US1 (T001–T003). FR-004–007 ⇒ US2 (T005–T007). FR-008–009 ⇒ US3 (T009) — note
  FR-008 (server rejects the vote) is already implemented; T009 is only the client's reaction
  to that existing rejection.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
- No new dependencies, collections, files, or API endpoints anywhere in this feature (plan.md
  Technical Context, research.md "Out of scope") — this is a pure client-side addition to two
  existing files.
