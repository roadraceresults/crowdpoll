# Feature Specification: Wide More Choices

**Feature Branch**: `641px+`

**Created**: 2026-11-17

**Status**: Draft

**Input**: User description: "requirements/20261117-131915-wide-more-choices/requirements.md": at viewport widths of
641 px and up, replace the list of bars that scrolls inside a poll card with the "More choices" row the phone layout
uses, bring the phone's "Show all" and "Show fewer choices" rows to the maximized view, and make "Show more" on a
poll's notes open the maximized view at the notes with the Vote button in sight above them.

## Clarifications

### Session 2026-11-17

- Q: When the viewer's own choices outnumber the places on a wide card, what is shown? → A: As many of the viewer's
  own choices as fit, highest share first, then the "More choices" row; the rest are in the maximized view.
- Q: When a poll fits on a card's results side but not on its voting side, what happens? → A: Each side decides for
  itself: the results side shows every bar with no "More choices" row, and Vote opens the maximized view on its voting
  side.

## User Scenarios & Testing *(mandatory)*

In this document the **wide layout** is the site at viewport widths of 641 px and up, and the **phone layout** is the
site at 640 px and less. A **card** is a poll card in a tab's grid; the **maximized view** is the full-page view of one
poll. The phone layout does not change.

### User Story 1 - Reach the hidden choices of a long poll without scrolling inside the card (Priority: P1)

A viewer on a laptop looks at a poll with more choices than its card can hold. Today the bars scroll inside the card,
with an up and a down arrow, which viewers find cumbersome. Now the card shows the leading choices and, in the last
place, a "More choices" row; clicking it opens the maximized view of the poll.

**Why this priority**: It is the reason for the feature: it removes the control viewers find cumbersome and gives them
one obvious way to the rest of the poll.

**Independent Test**: In the wide layout, open a tab holding a poll with more choices than fit in its card; the card
shows no arrows and does not scroll, its last row reads "More choices", and clicking that row opens the maximized view.

**Acceptance Scenarios**:

1. **Given** the wide layout and a poll whose bars all fit in its card, **When** the card is shown, **Then** it shows
   every choice and no "More choices" row, exactly as before this feature.
2. **Given** the wide layout and a poll whose bars do not all fit in its card, **When** the card is shown, **Then** it
   shows the leading choices that fit, a "More choices" row in the last place, no arrow rows, and its list cannot be
   scrolled by wheel, drag, touch or keyboard.
3. **Given** such a card on a single-choice poll, **When** the viewer reads the row, **Then** it reads
   "More choices · p%", where p is the combined share of the choices not shown.
4. **Given** such a card on a poll that is not single-choice, **When** the viewer reads the row, **Then** it reads
   "More choices", with no share.
5. **Given** such a card and a viewer who voted for a choice outside the leaders, **When** the card is shown, **Then**
   the viewer's own choice is among the choices shown, in place of the lowest leader.
6. **Given** such a card, **When** the viewer clicks the "More choices" row, or moves to it with Tab and presses Enter
   or Space, **Then** the maximized view of that poll opens.
7. **Given** the maximized view opened this way, **When** the viewer goes Back, **Then** the grid returns at the scroll
   position it had.
8. **Given** the wide layout, **When** the viewer clicks a result bar that is not the "More choices" row, or clicks the
   notes box away from "Show more", **Then** nothing opens.

---

### User Story 2 - Read a long poll in the maximized view by its leaders first (Priority: P2)

A viewer opens the maximized view of a poll with many choices. Rather than a long list of every choice, the view shows
the leaders and a "Show all N choices" row; clicking it lists every choice and the row becomes "Show fewer choices",
which goes back to the leaders. This is what the phone layout already does.

**Why this priority**: It completes the journey Story 1 starts, and gives the same maximized view at every width.

**Independent Test**: In the wide layout, maximize a poll of more than twelve choices; it shows ten leaders and
"Show all N choices"; click it and every choice is listed above "Show fewer choices"; click that and the leaders
return.

**Acceptance Scenarios**:

1. **Given** the wide layout and a poll of twelve choices or fewer, all with votes, **When** it is maximized, **Then**
   every choice is shown and there is no "Show all" row.
2. **Given** the wide layout and a poll of more than twelve choices, **When** it is maximized by its maximize button or
   its title, **Then** the ten leaders are shown (only those above 2% when any is), with the viewer's own choices, and
   a last row "Show all N choices", with " · p%" added on a single-choice poll.
3. **Given** that view, **When** the viewer clicks "Show all N choices", **Then** every choice is listed, the last row
   reads "Show fewer choices", and keyboard focus stays on that row.
4. **Given** every choice listed, **When** the viewer clicks "Show fewer choices", **Then** the leaders' view returns.
5. **Given** the wide layout, **When** the maximized view is opened by a card's "More choices" row, **Then** it first
   shows every choice that has a vote, with the viewer's own choices, and, when some choices have none, a last row
   "Remaining choices · 0%" that lists every choice when clicked.

---

### User Story 3 - Vote on a long poll (Priority: P2)

A viewer wants to vote on a poll with more choices than the voting side of its card can hold. The card no longer
scrolls, so Vote opens the maximized view on its voting side, where every choice is listed.

**Why this priority**: Without it a viewer could not reach every choice to vote once the scrolling list is gone.

**Independent Test**: In the wide layout, click Vote on the card of a 50-choice poll; the maximized view opens on
its voting side, listing every choice; vote, and the vote is recorded.

**Acceptance Scenarios**:

1. **Given** the wide layout and a card whose voting side cannot hold every choice, **When** a signed-in viewer clicks
   Vote,
   **Then** the maximized view opens on its voting side with every choice listed, and no arrow rows.
2. **Given** the wide layout and a card whose choices all fit on its voting side, **When** the viewer clicks Vote,
   **Then** the card turns over in place, as before this feature, and lists every choice without scrolling.
3. **Given** the voting side of the maximized view, **When** the viewer submits a selection, **Then** the vote is
   recorded as it is today.
4. **Given** a guest, **When** they click Vote on either kind of card, **Then** they are sent to log in, as today.
5. **Given** the wide layout and a card whose results side shows every bar but whose voting side cannot hold every
   choice, **When** a signed-in viewer clicks Vote, **Then** the maximized view opens on its voting side, and the
   card's results side still shows no "More choices" row.
6. **Given** the wide layout and a card whose results side shows the "More choices" row but whose voting side can hold
   every choice (a poll with notes, which take room on the results side only), **When** the viewer clicks Vote,
   **Then** the card turns over in place.

---

### User Story 4 - Go from a card's notes to the full notes (Priority: P3)

A viewer sees the first lines of a poll's notes on its card and clicks "Show more". The maximized view opens with the
page positioned so that the card's action row, with its Vote button, is the first thing under the site's fixed header
and the notes follow directly beneath it, as in the screenshot in the requirements.

**Why this priority**: It is a convenience on top of a view that already opens; the notes can be reached today by
scrolling.

**Independent Test**: In the wide layout, on a card whose notes show "Show more", click it; the maximized view opens
with the Vote button visible at the top of the page area and the notes panel beneath it.

**Acceptance Scenarios**:

1. **Given** the wide layout and a card whose notes show "Show more", **When** the viewer clicks it, **Then** the
   maximized view opens and the page is positioned with the card's action row directly under the fixed header and the
   notes panel beneath it.
2. **Given** the same click on a poll short enough that the notes are already in the upper half of the window,
   **When** the maximized view opens, **Then** the page is not moved.
3. **Given** the wide layout, **When** the maximized view is open, **Then** the notes, the Who voted report and the
   graph are stacked one under another, with no tab bar, as before this feature.
4. **Given** the view opened this way, **When** the viewer goes Back, **Then** the grid returns at the scroll position
   it had.

---

### Edge Cases

- **The viewer's own choices outnumber the places on the card**: the card shows as many of them as fit, highest share
  first, and no other choice, then the "More choices" row; the card keeps its height and does not scroll, and the rest
  are in the maximized view.
- **A card with room for one row or none**: it shows the "More choices" row alone.
- **The window is resized or crosses 640 px**: the card is drawn again for the layout and size in use; a poll that fit
  may gain the "More choices" row, and one that did not may lose it.
- **A live update changes the order or the number of choices** (votes arrive, the creator adds a choice): the card
  re-chooses its rows; the maximized view keeps the viewer's "Show all" or "Show fewer" state.
- **The viewer was on the voting side of a card when a new choice made the poll too long for it**: the card returns to
  its results side and keeps the selection made so far.
- **Every hidden choice has 0%** on a single-choice poll: the row reads "More choices · 0%".
- **A poll with notes and no "Show more"** (the notes fit on the card): nothing changes.
- **A poll in an edit session, or a viewer who may not vote**: Vote is refused or hidden as today, before anything
  opens.

## Requirements *(mandatory)*

### Functional Requirements

**The card (wide layout)**

- **FR-001**: In the wide layout, a card MUST NOT scroll its list of choices, on its results side or its voting side;
  the up and down arrow rows, press-and-hold scrolling and drag scrolling MUST be removed.
- **FR-002**: A card whose bars all fit in it MUST look and behave as before this feature.
- **FR-003**: A card whose bars do not all fit MUST show the leading choices, by current share, that fit at the
  smallest bar height, with the last place taken by a "More choices" row.
- **FR-004**: The viewer's own choices MUST be among the choices shown, taking the places of the lowest leaders when
  needed; when they outnumber the places available, the card MUST show as many of them as fit, highest share first.
- **FR-005**: The row MUST read "More choices · p%" on a single-choice poll, p being the combined share of the choices
  not shown, and "More choices" on any other poll, exactly as in the phone layout.
- **FR-006**: Activating the "More choices" row, by pointer or keyboard, MUST open the maximized view of that poll, in
  the view Story 2 scenario 5 describes.
- **FR-007**: In the wide layout, no other part of a card's results list and no part of its notes box other than
  "Show more" may open the maximized view; the title, subtitle and maximize button keep opening it as today.
- **FR-008**: The "More choices" row MUST take the place of one bar, at the card's bar height and its bar label's text
  size, with the phone row's outlined shape and colours, a pointer cursor, and the hover and focus states of the
  card's other controls.

**The maximized view (wide layout)**

- **FR-009**: The maximized view MUST choose its rows by the phone layout's rules, unchanged: ten leaders (every choice
  when the poll has twelve or fewer), of which only those above 2% (above 0% when twelve or fewer) when any is, then
  the viewer's own choices.
- **FR-010**: When choices are left out, the view MUST end with a "Show all N choices" row (with " · p%" on a
  single-choice poll) that lists every choice and becomes "Show fewer choices", which returns to the leaders.
- **FR-011**: Opened from a "More choices" row, the view MUST first show every choice with a vote and the viewer's own
  choices, ending with "Remaining choices · 0%" when some choices are left out.
- **FR-012**: The voting side of the maximized view MUST list every choice.
- **FR-013**: The rows of FR-010 and FR-011 MUST look as in the phone layout, at the wide layout's own sizes, and be
  operable by keyboard, with focus kept on the row after it is used.

**Voting**

- **FR-014**: In the wide layout, Vote on a card whose voting side cannot hold every choice MUST open the maximized
  view on its voting side; Vote on any other card MUST turn the card over in place. The voting side is judged by its
  own room, apart from the results side: either side may hold every choice while the other does not.
- **FR-015**: The checks made before voting (sign-in, a poll being edited, a viewer who may not vote) MUST run before
  either happens, as today.

**Notes**

- **FR-016**: In the wide layout, "Show more" on a card's notes MUST open the maximized view and position the page so
  that the card's action row, with Vote, is directly under the fixed header and the notes panel follows it; when the
  notes are already in the upper half of the window the page MUST NOT move.
- **FR-017**: The wide layout's maximized view MUST keep its panels stacked, with no tab bar.

**Unchanged**

- **FR-018**: The phone layout MUST look and behave as before this feature.
- **FR-019**: Back from a maximized view opened by any of these routes MUST return to the grid at its earlier scroll
  position, as today.
- **FR-020**: Nothing is stored, and nothing the site sends or receives changes.
- **FR-021**: The site's documents that describe the scrolling list, or describe these behaviours as phone-only, MUST
  be brought up to date.

### Key Entities

- **Choices shown**: the subset of a poll's choices a card or maximized view lists, derived from current shares, the
  viewer's own choices and, on a wide card, the room available; never stored.
- **Last row**: the one row after the choices shown: "More choices", "Show all N choices", "Show fewer choices" or
  "Remaining choices · 0%", or none.
- **View state**: whether a poll is on its card or maximized, which set of choices the maximized view shows, and
  whether it was asked to open at the notes; held only while the page is open.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At 641 px and up, no poll card on any tab can be scrolled inside itself, and none shows an arrow row,
  whatever the number of choices (checked with polls of 2, 12, 13 and 50 choices).
- **SC-002**: Every card whose choices all fit before this feature looks the same after it.
- **SC-003**: From any card with hidden choices, a viewer reaches the full list of choices in at most two clicks, and
  the voting list of every choice in one click.
- **SC-004**: From "Show more", the Vote button and the first line of the notes are both visible without further
  scrolling, on windows 600 px tall and more.
- **SC-005**: Every new row can be reached and used with the keyboard alone.
- **SC-006**: At 640 px and less, no card or maximized view differs from before this feature.

## Assumptions

- The feature applies to every tab's cards; all of them are drawn by the same card.
- "As many as fit" is measured at the smallest bar height the card uses today, with one place kept for the
  "More choices" row.
- A card is redrawn on resize and on crossing 640 px, as it is today.
- The maximized view's limits (ten leaders, twelve, 2%) are the phone layout's current ones, including the 2% rule
  that is on trial there; a later change to them applies to both layouts.
- Clicking a result bar or the notes text does nothing in the wide layout, so text on a card can still be selected.
- No setting, cookie, stored value, route or payload is added or changed; the work is in the pages' scripts, style
  sheets, tests and documents.
- Removing the scrolling list is a deliberate breaking change for viewers who use it today; the requirements report
  lists it and four others (`requirements/20261117-131915-wide-more-choices/requirements-report.md`, section 5).
