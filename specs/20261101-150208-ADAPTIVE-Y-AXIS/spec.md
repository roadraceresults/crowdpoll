# Feature Specification: Adaptive Y Axis for the Line Graph

**Feature Branch**: `20261101-150208-ADAPTIVE-Y-AXIS`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "requirements/20261101-150208-adaptive-y-axis/requirements.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Low shares fill the graph (Priority: P1)

A viewer maximizes a poll whose choices all hold small shares, for example a poll with many choices where none has
ever passed 25%. Today every line is squeezed into the bottom quarter of the graph and three quarters of it are
empty. With this feature the vertical axis tops out at 25%, so the lines use the full height and their differences
can be read.

**Why this priority**: It is the whole point of the feature: the empty part of the graph is the problem described.

**Independent Test**: Maximize a poll whose drawn lines never exceed 25%, and check that the axis ends at 25% and
the highest line reaches near the top of the plot.

**Acceptance Scenarios**:

1. **Given** a maximized poll whose drawn lines all stay at or below 25% in the time scale shown, **When** the graph
   is drawn, **Then** the axis ends at 25% with labels 0, 5, 10, 15, 20 and 25%.
2. **Given** a highest point of exactly 25%, **When** the graph is drawn, **Then** the axis ends at 25% and that
   point sits on the top gridline.
3. **Given** a highest point of 26% to 50%, **When** the graph is drawn, **Then** the axis ends at 50% with labels
   0, 10, 20, 30, 40 and 50%.
4. **Given** a highest point of 51% to 75%, **When** the graph is drawn, **Then** the axis ends at 75% with labels
   0, 15, 30, 45, 60 and 75%.
5. **Given** a highest point above 75%, **When** the graph is drawn, **Then** the axis ends at 100% with labels 0,
   25, 50, 75 and 100%, exactly as today.
6. **Given** any axis, **When** the viewer points at the graph, **Then** the markers sit on the lines and the tooltip
   shows the same percentages as before this feature.

---

### User Story 2 - The axis follows what is shown (Priority: P2)

While the graph is open the viewer switches time scale, the graph refreshes on its own, or the window is resized.
The axis is chosen again from the lines on screen each time, so it stays fitted to what the viewer is looking at.

**Why this priority**: Without it the axis would fit only the first view and could cut off or waste space later.

**Independent Test**: Open a poll whose 1 Month scale has a point above 75% but whose 1 Day scale stays at or below
25%; switch between the two and check the axis changes from 100% to 25%.

**Acceptance Scenarios**:

1. **Given** a graph showing one time scale, **When** the viewer switches to another, **Then** the axis is chosen
   from the points of the new scale only.
2. **Given** an open graph, **When** a refresh brings a point above the current top, **Then** the axis rises to the
   next step; **When** a refresh leaves every point at or below a lower step, **Then** the axis falls to it.
3. **Given** the crosshair is shown, **When** the axis changes on a refresh, **Then** the crosshair stays at the
   same moment in time, on the redrawn lines.
4. **Given** a choice below the vote threshold, which is not drawn, **When** the axis is chosen, **Then** that
   choice's points do not count.

---

### Edge Cases

- No line is drawn (no choice passes the vote threshold), or every point is 0%: the axis ends at 25%.
- Fewer than two time buckets: the existing "not enough data" note is shown and no axis is drawn, as today.
- A point exactly on a step (25%, 50% or 75%) stays on that step; it does not push the axis up.
- A change of axis is not animated.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The line graph in the maximized poll view MUST start its vertical axis at 0% and end it at the
  smallest of 25%, 50%, 75% and 100% that every drawn point is at or below.
- **FR-002**: Only the points of the lines drawn in the time scale shown MUST decide the top; choices that are not
  drawn and other time scales MUST NOT.
- **FR-003**: When no point is above 25%, including when no line is drawn, the top MUST be 25%.
- **FR-004**: The gridlines and labels MUST be in five equal steps for a 25%, 50% or 75% top (every 5%, 10% or 15%)
  and in four steps of 25% for a 100% top; the 0% line keeps its stronger baseline style.
- **FR-005**: The top MUST be chosen again on every draw: on opening, on a time-scale switch, on each automatic
  refresh and on a resize, and it MAY rise or fall as a result.
- **FR-006**: Lines, crosshair and markers MUST be drawn against the chosen axis; the tooltip and the spoken
  announcement MUST keep showing each choice's real percentage.
- **FR-007**: A graph whose top is 100% MUST look exactly as it does today.
- **FR-008**: The feature MUST NOT change what the server sends, what is stored, any setting, or the bar graph on
  the poll card.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a poll whose highest drawn point is between 20% and 25%, the highest line reaches at least 80% of
  the plot's height (today it reaches at most 25%).
- **SC-002**: In every graph whose highest point is 13% or more, the empty band above that point is less than half
  of the plot's height (today it can be up to 87%).
- **SC-003**: The axis top matches the rule for every highest point from 0% to 100%, checked at each step boundary
  (0, 25, 26, 50, 51, 75, 76 and 100%).
- **SC-004**: Every tooltip value is identical before and after the feature for the same poll and moment.
- **SC-005**: A graph whose highest point is above 75% is unchanged from today, gridline for gridline.

## Assumptions

- Shares are whole percentages from 0 to 100, so the four tops cover every case.
- The maximized poll view is the only place the line graph appears.
- A line touching the top gridline is acceptable; the plot keeps a small margin above it, so it is not cut off.
- The previous feature's promise of a 0–100% axis "with four or five gridlines" is superseded: the axis is now
  0 to 25, 50, 75 or 100%, with five or six gridlines.
- Choosing the top needs only data the viewer's browser already has, so there is no change to loading or refresh
  cost.
