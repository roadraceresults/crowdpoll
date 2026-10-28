# Feature Specification: Poll Closed State Display

**Feature Branch**: `007-closed-state`

**Created**: 2026-08-13

**Status**: Draft

**Input**: User description: "using ./designDocs/007-high-level-requirements-closed-state.md"

## Clarifications

### Session 2026-08-13

- Q: What format should the "Poll closed on <date>" / "This Poll closed on <date>" messages
  use for the date? → A: Date only (e.g., "8/13/2026"), no time component — compact enough
  for the "Live Results" link's position, which the message replaces.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Home Grid Shows Closed Polls Clearly (Priority: P1)

A visitor browsing the poll grid (or opening a single poll via its direct link) wants to
immediately tell, without clicking anything, that a poll has closed and can no longer be
voted on — rather than seeing a "Vote" button that will only reject them, or a "Live
Results" link that implies the poll is still active.

**Why this priority**: This is the primary, most visible fix — every closed poll is shown
on the grid today with no indication it's closed, which is misleading on first glance and
is the scenario every voter encounters first.

**Independent Test**: Load the poll grid with at least one closed poll present. Confirm its
card shows a "Poll closed on <date>" message where the "Live Results" link normally sits,
in the same font and style, and shows no "Vote" button — while an open poll on the same
grid still shows both as today.

**Acceptance Scenarios**:

1. **Given** a poll whose state is Closed, **When** its card is shown on the poll grid,
   **Then** the "Live Results" link is replaced by a "Poll closed on <date>" message in the
   same position, using the same font and style the link would have used.
2. **Given** a poll whose state is Closed, **When** its card is shown on the poll grid,
   **Then** no "Vote" button is shown on that card.
3. **Given** a poll whose state is not Closed, **When** its card is shown on the poll grid,
   **Then** the "Live Results" link and "Vote" button are shown exactly as they are today,
   unaffected by this feature.
4. **Given** a poll that is open when the grid loads, **When** the poll closes while the
   voter is still looking at the grid (without reloading the page), **Then** its card
   updates to show the closed message and stops showing the "Vote" button.

---

### User Story 2 - Voting Side Reacts to a Poll Closing (Priority: P2)

A voter who has flipped a poll card over to vote — either because they clicked "Vote" just
as the poll was closing, or because the poll closes while they're still looking at the
voting side — sees a clear "closed" message instead of a voting form that can no longer be
submitted successfully.

**Why this priority**: This is a narrower window than User Story 1 (it only applies to
voters actively mid-vote) but leaves someone looking at a dead-end control if not handled —
worse than simply not seeing the option to vote in the first place.

**Independent Test**: Open the voting side of a poll, then have that poll close (or open
the voting side of a poll that is already closed). Confirm the choice options and "Submit
vote" button are replaced by a "This Poll closed on <date>" message, and confirm the voter
can still navigate back to the results side.

**Acceptance Scenarios**:

1. **Given** a poll whose state is Closed, **When** a voter opens its voting side, **Then**
   the choice options and "Submit vote" button are not shown, and a "This Poll closed on
   <date>" message is shown in their place.
2. **Given** a voter viewing the voting side of a poll that was open, **When** that poll
   closes while they're still looking at it, **Then** the voting side updates to show the
   closed message per Acceptance Scenario 1, without the voter needing to do anything.
3. **Given** the voting side of a closed poll showing the closed message, **When** the voter
   uses the existing back control, **Then** they return to the results side as they would
   for any other poll.

---

### User Story 3 - No Vote Is Ever Counted After Closing (Priority: P3)

A voter submits a vote at the exact moment a poll closes — after the voting side was shown,
but before "Submit vote" was pressed and accepted. The system never counts that vote, and
the voter isn't left looking at a submission control that silently fails and offers no
explanation.

**Why this priority**: This is a narrow timing race, not a everyday occurrence — but it's
the final safeguard behind User Stories 1 and 2, ensuring the closing moment itself can
never be exploited or produce a confusing dead end, however unlikely the window.

**Independent Test**: Submit a vote against a poll at (or after) the moment it closes.
Confirm the vote is rejected and not reflected in the poll's results, and confirm the voter
ends up looking at the closed-poll message rather than a control that just quietly
re-enables itself.

**Acceptance Scenarios**:

1. **Given** a poll that closes after its voting side was opened but before "Submit vote" is
   pressed, **When** the voter presses "Submit vote," **Then** the submission is rejected
   and not counted in the poll's results.
2. **Given** a submission rejected per Acceptance Scenario 1, **When** the voter sees the
   result of that rejection, **Then** they are shown the closed-poll message (User Story 2,
   Acceptance Scenario 1) rather than a submission control with no explanation.
3. **Given** the eligibility check in Acceptance Scenario 1, **When** it is performed,
   **Then** it is based on the poll's actual closed state at that moment, not on whatever
   state was last displayed to the voter.

### Edge Cases

- A poll with an existing final tally (some participants already voted) that then closes
  still shows its true final results on the results side — only the "Live Results" link
  (front) and voting controls (back) change; the results themselves are unaffected.
- A poll closed by an administrator directly behaves identically to one that closed by
  reaching its scheduled end time — both are simply "Closed" from a voter's perspective,
  with the same closed-on date shown.
- A signed-out visitor sees the same closed-state treatment as a signed-in voter would,
  consistent with closed polls not requiring sign-in to view today.
- A closed poll reached via its direct single-poll link (not the grid) gets the same
  treatment as one seen on the grid, since both display the same poll card.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a poll's state is Closed, the system MUST replace the "Live Results"
  link on that poll's card with a "Poll closed on <date>" message, in the same position and
  using the same font and style the link would otherwise use.
- **FR-002**: When a poll's state is Closed, the system MUST NOT show a "Vote" button on
  that poll's card.
- **FR-003**: The "<date>" shown in the closed message (FR-001) MUST reflect when the poll
  actually closed, shown as a date only (e.g., "8/13/2026"), without a time component —
  chosen for the compact space the message occupies (the "Live Results" link's position).
- **FR-004**: If a poll's state is or becomes Closed while its voting side is open, the
  system MUST NOT show the "Submit vote" button on that side.
- **FR-005**: If a poll's state is or becomes Closed while its voting side is open, the
  system MUST NOT show the choice options normally used to select a vote.
- **FR-006**: If a poll's state is or becomes Closed while its voting side is open, the
  system MUST show a "This Poll closed on <date>" message in place of the choice options and
  "Submit vote" button (FR-004/005), using the same date/time format resolved in FR-003.
- **FR-007**: A voter MUST still be able to navigate from a closed poll's voting side back
  to its results side, the same way they can for any other poll.
- **FR-008**: The system MUST reject any vote submission for a poll that has closed by the
  time the submission is evaluated, regardless of the poll's state when the voting side was
  opened, and MUST NOT count that vote in the poll's results.
- **FR-009**: When a vote submission is rejected because the poll closed (FR-008), the voter
  MUST be shown the closed-poll message (FR-006) rather than a submission control that
  offers no explanation for the failure.

### Key Entities *(include if data involved)*

- **Poll**: The poll being displayed or voted on. Relevant attributes for this feature: its
  current state (only its Closed state is addressed here) and the date/time it closed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A voter can tell a poll is closed, and when it closed, from the grid alone —
  without clicking "Vote" or attempting to submit anything.
- **SC-002**: No vote is ever recorded against a poll after its closing time, regardless of
  when the voter began the voting process.
- **SC-003**: A voter who ends up looking at a closed poll's voting side — however they got
  there — always sees a clear closed message rather than a voting control that cannot
  succeed.

## Assumptions

- "Closed" refers specifically to a poll's Closed state, whether reached by its scheduled
  end time or set explicitly by an administrator — both are indistinguishable to a voter and
  treated identically by this feature.
- Archived polls are out of scope for this feature: they are already excluded from every
  voter-facing poll listing and direct fetch today, so a voter never encounters an archived
  poll's card in the first place.
- A poll that hasn't started yet (pending) is out of scope for this feature — the source
  design document only describes closed-poll behavior; a pending poll's display is
  unchanged.
- The date/time shown in the closed message is the poll's recorded close time, which the
  system already records at the moment a poll becomes closed — so it is accurate regardless
  of whether the poll closed on schedule or was closed directly by an administrator.
- Everything else on a closed poll's card — title, subtitle, participation totals, and the
  results themselves — continues to display normally; only the "Live Results" link (front)
  and the voting controls (back) change.
- This feature applies everywhere a poll card is shown — the poll grid and the same
  component's single-poll direct-link view — since both already share one underlying poll
  card display today.
