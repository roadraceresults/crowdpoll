# Feature Specification: Line Graph Material 3

**Feature Branch**: `20261028-183546-LINE-GRAPH-M3`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "requirements/20261028-183546-line-graph-m3/requirements.md"

## Clarifications

### Session 2026-10-28

- Q: When the plot receives keyboard focus, where does the crosshair appear? → A: At the newest point at once,
  with its tooltip shown and announced.
- Q: On a touch screen, what happens to the crosshair and tooltip when the finger lifts? → A: They stay at the
  last touched point until the viewer taps outside the plot or the graph closes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every line is visible in both themes (Priority: P1)

A viewer maximizes a poll card and reads the line graph beside the bar graph, in the light or the dark theme.
Each line is drawn in its bar's colour, so a viewer can match a line to its bar at a glance.
When a bar's colour would be too faint against the graph's background in the current theme (for example black or
dark red in the dark theme, yellow or light grey in the light theme), the line is drawn in the nearest shade of that
same colour that stands out enough.
The legend dot, the tooltip dot and the hover marker for that choice use the same shade as its line.

**Why this priority**: Today some lines all but disappear in one of the two themes, so the graph fails to show
those choices at all; this is the one change that fixes a defect rather than a look.

**Independent Test**: Draw a poll whose choices use every automatic and every manual colour, in each theme, and
check that every line, dot and marker reaches 3:1 contrast against the graph's background and keeps its bar's hue.

**Acceptance Scenarios**:

1. **Given** a choice whose bar colour already has at least 3:1 contrast on the current theme's background,
   **When** the graph is drawn, **Then** its line is drawn in exactly that colour.
2. **Given** a choice whose bar colour has less than 3:1 contrast on the current theme's background, **When** the
   graph is drawn, **Then** its line is drawn in the nearest shade of that colour that reaches 3:1, and its legend
   dot, tooltip dot and hover marker use that same shade.
3. **Given** a choice with a manual colour chosen by the poll's creator, **When** the graph is drawn, **Then** its
   line follows the manual colour, adjusted only as in scenario 2.
4. **Given** the graph is open, **When** the device switches between its light and dark appearance, **Then** the
   graph is redrawn at once with each line's colour chosen for the theme now in force.

---

### User Story 2 - The graph looks and behaves like the rest of the site (Priority: P1)

The graph's parts follow the same Material 3 design as the poll cards around it.
The scale selector (1 Day, 1 Week, 1 Month, 1 Year) is a single-select segmented button: the selected segment is
filled and carries a check mark, and every segment shows hover, focus and press states.
The hover tooltip is a raised card that never spills out of the plot: near either edge it opens on the other side
of the crosshair.
At the crosshair each line shows a small round marker ringed in the background colour.
The title, subtitle, legend, axes and grid use the site's type scale and colour roles, and the 0 % baseline is a
little stronger than the other grid lines.

**Why this priority**: It is the feature's stated goal: visual consistency with the rest of CrowdPoll.

**Independent Test**: Maximize a poll with enough history for every scale, and compare the graph's selector,
tooltip, markers, legend and text with the site's other Material 3 controls in both themes at 1400, 900 and 375 px.

**Acceptance Scenarios**:

1. **Given** a graph with several available scales, **When** it is shown, **Then** the scales appear as one
   segmented button with only the available scales, the selected one filled and checked.
2. **Given** the segmented button, **When** the viewer chooses another scale, **Then** the graph redraws at once
   for that scale, with no wait for the network and no animation.
3. **Given** the pointer is over the plot near its left or right edge, **When** the tooltip appears, **Then** it is
   wholly inside the plot.
4. **Given** the pointer is over the plot, **When** the crosshair is placed, **Then** each line shows a marker at
   that point in time.
5. **Given** a touch screen, **When** the viewer touches the plot and lifts the finger, **Then** the crosshair and
   tooltip stay at the touched point until the viewer taps outside the plot.
6. **Given** the graph refreshes on its timer, **When** new data arrives, **Then** the graph redraws at once, with
   no animation.

---

### User Story 3 - The graph can be read from the keyboard (Priority: P2)

A keyboard or screen-reader user can reach the scale selector and the plot with Tab.
In the scale selector, Left and Right move between the segments.
On the plot, Left and Right move the crosshair one point in time, Home and End jump to the first and last point,
and Escape or leaving the plot hides it.
Each time the crosshair moves, its tooltip text (the time and each choice's share) is announced politely.

**Why this priority**: Today the values are only reachable with a pointer;
Material 3's controls are keyboard-usable, and the requirement asks for its functionality, not only its look.

**Independent Test**: With only the keyboard, select each scale and read the share of every choice at the first,
last and a middle point in time.

**Acceptance Scenarios**:

1. **Given** focus is on the scale selector, **When** the viewer presses Right or Left, **Then** focus moves to the
   next or previous segment, and Enter or Space selects it.
2. **Given** the plot does not have focus, **When** the viewer tabs to it, **Then** the crosshair and tooltip
   appear at the newest point and the tooltip's text is announced.
3. **Given** focus is on the plot, **When** the viewer presses Right, Left, Home or End, **Then** the crosshair and
   tooltip move to the next, previous, first or last point, and the tooltip's text is announced.
4. **Given** the crosshair is shown from the keyboard, **When** the viewer presses Escape or moves focus away,
   **Then** the crosshair and tooltip are hidden.
5. **Given** any of the graph's controls has focus, **When** it is shown, **Then** it carries the same focus ring
   as the poll card's controls.

---

### Edge Cases

- A colour that cannot reach 3:1 by shading toward the theme's contrast direction (none in today's palettes) is
  shaded as far as needed, up to pure white or black.
- A graph showing only one available scale still shows the segmented button with that one segment selected.
- When there is too little data, or the poll's results are unavailable, or the first load fails, the existing
  notes are shown as today; there is no selector, plot or tooltip to restyle or focus.
- A refresh that arrives while the keyboard crosshair is shown keeps the crosshair at the same point in time
  if it still exists, otherwise at the newest point.
- The tooltip on a very narrow plot (375 px) with many choices is still wholly inside the plot horizontally;
  it may cover the lines beneath it.
- Two choices whose bar colours are shaded to the same or very similar colour stay distinguishable by their
  legend labels and tooltip rows, as today.

## Requirements *(mandatory)*

### Functional Requirements

**Colour**

- **FR-001**: Each line MUST be drawn in its choice's bar colour (the creator's manual colour when the choice has
  one), so a line and its bar never disagree in hue.
- **FR-002**: In each theme, a line colour with less than 3:1 contrast against the graph's background MUST be drawn
  in the nearest shade of itself that reaches 3:1;
  a colour already at 3:1 MUST be drawn unchanged.
- **FR-003**: The legend dot, the tooltip dot and the hover marker of a choice MUST use the same colour as its line.
- **FR-004**: The graph's text, grid, axes, tooltip and controls MUST take their colours from the site's Material 3
  colour roles, in both the light and the dark theme.
- **FR-005**: The bar graph's colours MUST NOT change.

**Look**

- **FR-006**: The scale selector MUST be a Material 3 single-select segmented button: one segment per available
  scale, the selected segment filled and marked with a check mark, with hover, focus and press states.
- **FR-007**: Choosing a scale MUST redraw the graph without a network request, as today.
- **FR-008**: The hover tooltip MUST be a Material 3 rich tooltip (a raised container with medium rounded corners
  and no border), showing the time as its heading and one row per drawn choice, and MUST always lie wholly inside the
  plot horizontally, opening on the other side of the crosshair near an edge.
- **FR-009**: Lines MUST be 2 px wide with round joins and caps.
- **FR-010**: While the crosshair is shown, each line MUST show a round marker at the crosshair's point in time,
  in the line's colour and ringed in the background colour.
- **FR-011**: The graph MUST NOT animate: a scale change or a refresh redraws at once.
- **FR-012**: The title, subtitle, legend, axis labels and tooltip MUST use the site's Material 3 type scale, with no
  fixed font size of their own.
- **FR-013**: The legend MUST remain a static key (a dot, the label and the current share per drawn choice, and the
  vote total);
  viewers MUST NOT be able to hide or show lines.
- **FR-014**: The 0 % grid line MUST be drawn more strongly than the other grid lines.

**Behaviour**

- **FR-015**: The segmented button MUST be reachable with Tab, with Left and Right moving between segments and Enter
  or Space selecting one, and MUST announce which scale is selected.
- **FR-016**: The plot MUST be one Tab stop;
  when it receives focus the crosshair and tooltip MUST appear at once at the newest point, and the tooltip's text
  MUST be announced, unless the focus comes from a pointer press on the plot, which places the crosshair at that
  point (FR-019);
  with focus on it, Left and Right MUST move the crosshair one point in time, Home and End to the first and last
  point, and Escape or loss of focus MUST hide the crosshair and tooltip.
- **FR-017**: Each time the crosshair moves from the keyboard, the tooltip's text MUST be announced to assistive
  technology without interrupting the user.
- **FR-018**: Every focusable part of the graph MUST show the same focus ring as the poll card's controls.
- **FR-019**: With a mouse or pen, the crosshair and tooltip MUST follow the pointer and hide when it leaves the
  plot, as today.
  With touch, a touch or drag MUST place them, and they MUST stay at the last touched point after the finger lifts,
  until the viewer taps outside the plot or the graph closes.

**Unchanged**

- **FR-020**: The graph's data, access rules, refresh timing, failure notes and the places it is shown or removed
  MUST NOT change.

### Key Entities

- **Line colour**: the colour a choice is drawn in on the graph, per theme: its bar colour, or the nearest shade of
  it that reaches 3:1 contrast on that theme's graph background.
  It is derived each time the graph is drawn and never stored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % of the automatic and manual choice colours, in both themes, are drawn with at least 3:1
  contrast against the graph's background (today 17 of the 48 colour-and-theme pairs, 24 distinct colours in two themes, fall short).
- **SC-002**: Every colour that already reached 3:1 in a theme is drawn exactly as its bar in that theme.
- **SC-003**: The graph's stylesheet contains no colour or font size that is not one of the site's design tokens.
- **SC-004**: A keyboard-only user can select every available scale and read every drawn choice's share at the first,
  last and any chosen point in time, without a pointer.
- **SC-005**: At 1400, 900 and 375 px wide, in both themes, the tooltip is never cut off at the left or right of the
  plot.
- **SC-006**: A side-by-side check against the poll card's controls finds the selector, tooltip, focus ring and text
  styles of the graph to match the site in both themes.

## Assumptions

- The graph's container panel in the maximized view keeps its current look.
- The light and dark themes are those the site already defines; on the home page the theme follows the device's
  appearance setting (the site has no theme switch of its own).
- Shading lightens a colour in the dark theme and darkens it in the light theme, keeping its hue.
- No new dependency: the graph stays hand-drawn by the site's own code.
- This feature reverses two earlier line-graph decisions: lines are no longer the identical colour in both themes,
  and the plot now has a keyboard-driven crosshair (the earlier spec's clarification excluded one).
- The pending line-graph on/off feature (`20261028-114023-line-graph-toggle`) is independent: it decides whether a
  poll shows the graph, this feature how the graph looks.
- The requirements and their resolved findings are in
  `requirements/20261028-183546-line-graph-m3/requirements.md` and `requirements-report.md` beside it.
