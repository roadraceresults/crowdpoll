# Feature Specification: Poll Card Back Side Parity

**Feature Branch**: `008-POLL-CARD-BACK-SIDE`

**Created**: 2026-08-13

**Status**: Draft

**Input**: User description: "using ./designDocs/008-high-level-requirements-POLL-CARD-BACK-SIDE.md"

> Source requirements: `designDocs/008-high-level-requirements-POLL-CARD-BACK-SIDE.md`
> Evidence: `designDocs/poll-card-back-side-bug.jpg`

## Overview

Each poll on the poll grid is presented as a two-sided card. The **front side**
(results side) shows the poll question, how many participants have voted, the
results for each choice, and a footer with the Live Results link and a **Vote**
button. Flipping the card reveals the **back side** (voting side), which shows
the same question, the selectable choices, and a footer with a back arrow and a
**Submit vote** button.

Today the two sides do not line up. The choices region on the back side is
visibly shorter than the results region on the front side, leaving a large band
of empty space above the back-side footer while the choice list itself is cut
off and forced to scroll. The back side also omits the participation count that
the front side shows, the two footers sit at different distances from the bottom
edge of the card, the two primary buttons are different widths, and the
closed-poll message is styled differently from the participation count.

This feature makes the two sides of the poll card visually consistent, so
flipping the card changes only the content, never the layout.

## Clarifications

### Session 2026-08-14

- Q: How are the pixel-parity success criteria (SC-001…SC-006) verified? → A: Manual verification via a quickstart validation guide (measure both sides at the listed viewport widths); automated coverage limited to existing-style assertions that the served card markup and styles contain the new participation element and the shared styling. No layout-measuring test harness is added.
- Q: Must footer parity also hold when a poll is closed, given the two closed messages sit in different regions? → A: Yes — keep today's placement (front message in the footer row, back message in the shared content region) and require the front's restyled message to fit within the same footer height as the open state, so footer parity holds in both states.
- Q: How is the shared width of the Vote / Submit vote buttons determined? → A: Content-derived — both render at the width the wider label ("Submit vote") needs, keeping the existing minimum width as a floor, so the pair stays equal at every viewport width and adapts if a label changes.
- Q: Should the duplicated participation count be hidden from assistive technology on the non-visible face? → A: No — it is a plain duplicate, exposed exactly like the card's existing duplicated question and subtitle. This feature introduces no assistive-technology changes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choices fill the voting side (Priority: P1)

A voter opens the poll grid, reads the results on the front of a poll card, and
flips it over to vote. The list of selectable choices occupies the same region
of the card that the results bars occupied — starting and ending at the same
place — so the same number of choices is visible without scrolling, and no
large empty gap is left above the footer.

**Why this priority**: This is the reported bug and the most visible defect. On
polls with more than a few choices the back side clips the list after two or
three rows even though there is unused space directly below it, forcing an
unnecessary scroll to see options that the front side displays outright.

**Independent Test**: Open a poll with 7 choices, note the top and bottom edges
of the results region on the front, flip the card, and confirm the choices
region starts and ends at the same positions and shows the same number of rows
before scrolling is required.

**Acceptance Scenarios**:

1. **Given** a poll whose choices all fit without scrolling on the front side,
   **When** the voter flips the card to the voting side, **Then** all choices
   are shown without scrolling and the choices region spans the same vertical
   extent as the results region.
2. **Given** a poll with more choices than fit in the card, **When** the voter
   flips the card, **Then** the choices region fills all the space between the
   card header and the footer (no empty band above the footer) and the same
   number of rows is visible on both sides before scrolling.
3. **Given** the card is displayed at a narrow (mobile) width where the question
   wraps to more lines, **When** the voter flips the card, **Then** the choices
   region and the results region still span the same vertical extent.

---

### User Story 2 - Participation count on the voting side (Priority: P2)

A voter who has flipped the card to vote can still see how many participants
have voted so far, without flipping back to the results side.

**Why this priority**: It restores information the voter loses on flip and, as a
side effect, makes the two card headers the same height — a precondition for the
choices regions lining up.

**Independent Test**: Flip a poll card with a known number of votes and confirm
the participation count appears on the voting side with the same wording,
placement, and styling as on the results side.

**Acceptance Scenarios**:

1. **Given** a poll with 1 recorded vote, **When** the voter views either side of
   the card, **Then** both sides read "1 participant voted".
2. **Given** a poll with 5 recorded votes, **When** the voter views either side,
   **Then** both sides read "5 participants voted".
3. **Given** an invitation-only poll where some invitees have not voted, **When**
   the voter views either side, **Then** both sides show the same participation
   text including the "not yet voted" portion.
4. **Given** a poll whose vote count changes while the card is open, **When** the
   count updates, **Then** the text on both sides updates to the same new value.

---

### User Story 3 - Matching footers on both sides (Priority: P3)

A voter flipping between the two sides sees the footer stay put: the action row
sits at the same height on both sides, and the primary button is the same size
on both sides.

**Why this priority**: Movement in the footer as the card flips makes the flip
feel unstable and draws the eye away from the content that actually changed.

**Independent Test**: Measure the footer's top edge and the gap below the footer
on both sides, and measure the width of the **Vote** and **Submit vote**
buttons; all pairs match.

**Acceptance Scenarios**:

1. **Given** a poll card, **When** the footer of each side is compared, **Then**
   both footers occupy the same vertical space and leave the same gap below them
   to the bottom edge of the card, using the tighter spacing currently seen on
   the voting side.
2. **Given** a poll card, **When** the **Vote** button on the results side and
   the **Submit vote** button on the voting side are compared, **Then** both
   buttons are the same width.
3. **Given** the card is displayed at a narrow (mobile) width, **When** the two
   buttons are compared, **Then** they remain equal in width and neither
   button's label wraps or is clipped.

---

### User Story 4 - Consistent closed-poll message styling (Priority: P4)

A visitor viewing a poll that has closed sees the "Poll closed" message rendered
in the same muted grey treatment as the participation count, so it reads as
supporting information rather than as a heading.

**Why this priority**: Purely presentational polish on an already-working
message; it changes no behavior.

**Independent Test**: View a closed poll and confirm the closed message on both
sides uses the same grey color, font family, weight, and size as the
participation count text.

**Acceptance Scenarios**:

1. **Given** a closed poll, **When** the visitor views the results side, **Then**
   the closed message is displayed in the same grey style as the participation
   count.
2. **Given** a closed poll, **When** the visitor flips to the voting side,
   **Then** the closed message there is displayed in that same grey style.
3. **Given** a closed poll, **When** either side is viewed, **Then** the wording
   of the closed message and the existing closed-poll behavior (choices and
   voting controls suppressed, back arrow still usable) are unchanged.

---

### Edge Cases

- **Two choices only**: the choices region still spans the full shared extent;
  short lists stay anchored to the top of that region rather than floating in
  the middle, matching the results side.
- **Maximum choices (50)**: both sides scroll, both show the same number of rows
  before scrolling, and the scroll affordances appear on both sides under the
  same conditions.
- **Very long choice labels**: label truncation behavior on the voting side is
  unchanged; the region height must not depend on label length.
- **Very long poll question**: when the question wraps, the header grows equally
  on both sides and the choices/results regions shrink equally.
- **Closed poll**: the closed message replaces the choices on the voting side and
  the Live Results link/Vote button on the results side, as it does today; the
  voting-side message occupies the shared region and the results-side message
  stays on one line inside the footer row, so neither footer moves (FR-006a).
- **Zero votes**: both sides read "0 participants voted".
- **Reduced-motion / narrow viewports**: parity holds at every supported card
  width; no side gains or loses space relative to the other.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The choices region on the poll card's voting side MUST span the
  same vertical extent (same top edge, same bottom edge, same height) as the
  results region on the results side, for the same poll at the same card size.
- **FR-002**: The voting side MUST NOT leave unused vertical space between the
  choices region and the footer; the choices region MUST absorb all space
  remaining between the card header and the footer.
- **FR-003**: For a given poll and card size, the number of choice rows visible
  without scrolling MUST be the same on both sides, and the two sides MUST begin
  scrolling under the same conditions.
- **FR-004**: The voting side MUST display the participation count ("N
  participant(s) voted", including the invitation-only "not yet voted" portion
  when applicable) with the same wording, position within the card header, and
  styling as the results side. It is a plain duplicate — exposed to assistive
  technology exactly like the card's already-duplicated question and subtitle —
  and this feature introduces no assistive-technology or focus-management
  changes.
- **FR-005**: The participation count MUST show the same value on both sides at
  all times, including after live updates.
- **FR-006**: The footers on both sides MUST occupy the same vertical space and
  leave the same gap between the footer and the bottom edge of the card, adopting
  the voting side's tighter below-footer spacing as the shared value.
- **FR-006a**: Footer parity MUST hold in the closed state as well as the open
  state. The closed messages keep their current placement — the results side's
  message in the footer row (in place of the Live Results link), the voting
  side's message in the shared content region (in place of the choices) — and
  the results-side message MUST render on a single line within the same footer
  height the footer has when the poll is open, so restyling it (FR-008) does not
  change the footer's height or the below-footer gap.
- **FR-007**: The **Vote** button on the results side MUST render at the same
  width as the **Submit vote** button on the voting side. The shared width MUST
  be content-derived — the width the wider of the two labels requires, with the
  card's existing minimum button width as a floor — rather than each button
  sizing to its own label, so the pair stays equal at every viewport width and
  adapts automatically if a label, font, or padding changes.
- **FR-008**: The closed-poll message MUST use the same grey text treatment
  (color, font family, weight, and size) as the participation count text, on
  both sides of the card.
- **FR-009**: All existing poll card behavior MUST be preserved: flipping,
  choice selection, single- vs. multi-choice rules, submit-disabled-until-
  selected, live result updates, scroll affordances, the back arrow, and the
  closed-poll suppression rules.
- **FR-010**: Parity requirements FR-001 through FR-008 MUST hold at every
  supported viewport width, including the narrow/mobile layout.

### Key Entities

No new data is introduced. The feature consumes existing poll data already shown
on the card: the poll question, its choices, and the participation totals
(participants voted and, for invitation-only polls, not yet voted).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For any poll, the choices region on the voting side and the results
  region on the results side have the same top edge, bottom edge, and height
  (within 1 pixel of rounding) at every tested viewport width from 360px to
  1440px.
- **SC-002**: For a poll with 7 choices at default card size, the voting side
  shows the same number of choices without scrolling as the results side —
  measured today as 3 vs. 7 in the reported bug, reduced to a difference of 0.
- **SC-003**: Empty vertical space between the bottom of the choices region and
  the top of the footer on the voting side is 0 pixels beyond the shared spacing
  also used on the results side.
- **SC-004**: The participation count text on the voting side is character-for-
  character identical to the results side in 100% of observed states, including
  singular/plural forms and the invitation-only variant.
- **SC-005**: The footer's top edge and the below-footer gap differ by no more
  than 1 pixel between the two sides, in both the open and the closed state, and
  the **Vote** and **Submit vote** buttons differ in width by no more than 1
  pixel.
- **SC-006**: The closed-poll message's computed color, font family, weight, and
  size match the participation count's on both sides.
- **SC-007**: 100% of the existing automated test suite continues to pass, and no
  previously working poll card interaction regresses.

### Verification Method

- **VM-001**: SC-001 through SC-006 are verified **manually**, following a
  quickstart validation guide that lists the viewport widths to test (360px
  through 1440px) and the measurements to take on each side of the card. No
  layout-measuring or browser-automation test harness is introduced for this
  feature.
- **VM-002**: Automated coverage is limited to the project's existing
  assertion style — checks that the served poll card markup and styles contain
  the voting-side participation element and the shared footer, button, and
  closed-message styling — plus SC-007's existing suite remaining green.

## Assumptions

- "Same as the frontside" for the participation label means identical text,
  identical position within the card header (directly under the question and
  subtitle), and identical typography — not a new or abbreviated variant.
- "Make the footer on both sides take the same space… the backside is
  preferable" means the voting side's tighter below-footer spacing becomes the
  shared value for both sides, i.e. the results side's footer moves down to
  match, rather than the voting side loosening.
- "Make the width of the Vote button… the same width as the Submit vote button"
  means the results-side button widens to match the longer-labelled voting-side
  button; both remain compact buttons rather than full-width.
- "Poll Closed text" refers to the closed-poll messages already shown on both
  sides by feature `007-closed-state`; only their visual styling changes — the
  wording, placement, and suppression behavior stay as specified there.
- The visible height difference in `poll-card-back-side-bug.jpg` is a layout
  defect on the voting side, not intended behavior; the results side's sizing is
  the correct reference.
- No API, data model, or persistence change is required; this is a
  presentation-layer change to the existing poll card on the poll grid.
- The poll card's overall size, the results-side bar rendering, and the
  admin-facing pages are out of scope and must not change.
