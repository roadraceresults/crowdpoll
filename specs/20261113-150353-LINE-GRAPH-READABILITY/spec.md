# Feature Specification: Line Graph Readability

**Feature Branch**: `20261113-150353-LINE-GRAPH-READABILITY`

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "requirements/20261113-150353-line-graph-readability/requirements.md": improve the line
graph, especially at phone widths, where many lines (over 10) make it cluttered and the box with the values at the
selected time is displayed over the graph. The resolved requirements replace the floating value box with a readout in
the legend (RS1), add a highlight for one line (UA2), draw the top 10 lines at rest with a "Show all" button (NC1),
apply at every width and for any number of lines (AM1, AM2), keep the legend order fixed (UA1) and keep the colors as
they are (UA3).

## Clarifications

### Session 2026-11-13

- Q: What happens to a highlighted line that falls outside the top 10 (the viewer presses "Show top 10 choices", or a refresh
  moves it out)? → A: The highlight is cleared and the graph shows the plain top 10; the line is not kept as an extra
  11th line.
- Q: Does the graph move when the time label appears? → A: No. The label's line is always there: it reads "Latest" at
  rest and the selected time while a time is selected, so the plot never shifts.

## User Scenarios & Testing *(mandatory)*

The users are poll viewers who open a poll's maximized view and read its vote-history line graph, by touch on a phone,
by mouse on a desktop, or by keyboard and screen reader. Today the graph draws one line per choice, lists every choice
in a legend above the plot, and, when the viewer selects a time, opens a floating box over the plot that repeats the
whole list with the shares at that time. With 15 choices on a phone the box hides half the plot, runs past the bottom
of the graph and is cut off, and the lines themselves cannot be told apart. After this feature nothing covers the plot,
the legend itself shows the shares at the selected time, one line can be picked out from the rest, and a crowded graph
starts with its ten leading lines only.

### User Story 1 - Read the shares at a selected time without covering the plot (Priority: P1)

A viewer touches (or points at) a time on the plot. A vertical line and one marker per line show the time on the plot,
and the legend's percentages change to the shares at that time, with the time written in the label beside the legend,
which reads "Latest" at rest. No box opens over the plot, and the plot does not move.

**Why this priority**: The floating box is the problem the requirements single out, and removing it fixes the covered
plot, the overflow and the duplicated list at once, for any number of lines.

**Independent Test**: On a poll with 15 graphed lines at a 360 px wide viewport, select a time in the middle of the
plot: the whole plot stays visible, the legend shows that time and each drawn choice's share at it, and nothing extends
outside the graph's card. Repeat at desktop width.

**Acceptance Scenarios**:

1. **Given** the graph at rest, **When** the viewer looks at the legend, **Then** each entry shows the choice's latest
   share, and the time label reads "Latest".
2. **Given** the graph at rest, **When** the viewer selects a time on the plot, **Then** the vertical line and the
   markers appear at that time, each legend entry shows the choice's share at that time, the time label reads that time
   (for example "Nov 12 at 1 PM"), and the plot stays exactly where it was.
3. **Given** a selected time, **When** the viewer looks at the plot, **Then** nothing other than the vertical line and
   the markers is drawn over it, and no part of the graph extends outside its card.
4. **Given** a selected time, **When** the viewer drags or moves to another time, **Then** the legend's percentages and
   the time label follow, and the legend entries keep their order.
5. **Given** a selected time, **When** the viewer taps or clicks anywhere other than the plot, the legend and the
   show-all button, moves the mouse off the plot after
   only hovering, presses Escape, or moves keyboard focus away from the plot to anything other than a legend entry or
   the show-all button, **Then** the selection is cleared, the legend shows the latest shares again, the time label
   reads "Latest" again, and the plot stays where it was.
6. **Given** keyboard focus on the plot, **When** the viewer presses Left, Right, Home or End, **Then** the selected
   time moves as it does today, the legend follows it, and the time and shares are announced to a screen reader as
   today.
7. **Given** a graph with 2 lines, **When** the viewer selects a time, **Then** the behaviour is the same: the legend
   is the readout and no box opens.
8. **Given** a mouse, **When** the viewer clicks a time on the plot and then moves the pointer off the plot, **Then**
   the time stays selected (pinned), as a touched time does: moving the mouse over the plot with no button held no longer moves it, a drag with the button held moves it, another
   click on the plot moves it, and a click anywhere other than the plot, the legend and the show-all button, keyboard
   focus moving anywhere other than those three, Escape or a change of time scale clears it.

---

### User Story 2 - Pick out one line (Priority: P2)

A viewer wants to follow one choice through a tangle of lines, two of which may even share a color. They tap that
choice in the legend: its line is drawn thicker and in front, and every other line and legend entry is dimmed. Tapping
it again brings the graph back.

**Why this priority**: It is what makes an individual line readable in a crowded plot, and the only way to tell apart
two lines of the same color; it depends on nothing but the legend.

**Independent Test**: On a poll with 15 graphed lines, activate one legend entry: that line can be followed from the
first point to the last, the others are visibly dimmed but keep their colors; activate it again and all lines return
to full strength.

**Acceptance Scenarios**:

1. **Given** no highlight, **When** the viewer activates a legend entry (tap, click, Enter or Space), **Then** that
   choice's line is drawn in front of the others and thicker, the other lines, their markers and the other legend
   entries are dimmed, and every line keeps its own color.
2. **Given** a highlighted line, **When** the viewer activates the same legend entry again, or presses Escape while
   that entry has keyboard focus, **Then** the highlight is cleared.
3. **Given** a highlighted line, **When** the viewer activates another legend entry, **Then** the highlight moves to
   that line; only one line is ever highlighted.
4. **Given** a selected time, **When** the viewer activates a legend entry, **Then** the line is highlighted and the
   time stays selected, with the legend still showing the shares at that time.
5. **Given** a highlighted line, **When** the graph refreshes, the viewer changes the time scale or selects a time,
   **Then** the highlight stays.
6. **Given** a highlighted line, **When** its choice is no longer among the graphed lines after a refresh, or the
   viewer closes the maximized view, **Then** the highlight is cleared; reopening the view starts with no highlight.
7. **Given** a legend entry, **When** the viewer only hovers it with the mouse, **Then** nothing is highlighted.
8. **Given** a screen reader, **When** focus is on a legend entry, **Then** it is announced as a button with its
   pressed or not-pressed state.

---

### User Story 3 - A crowded graph starts with its ten leading lines (Priority: P3)

A viewer opens the graph of a poll with 15 graphed choices. The plot and the legend show the ten choices with the
highest current share; a button "Show all 15 choices" draws the other five, and then reads "Show top 10 choices" to go back.

**Why this priority**: It makes the graph readable before the viewer touches it and halves the legend on a phone; the
two stories above already work without it.

**Independent Test**: On a poll with 15 graphed lines, open the graph: 10 lines and 10 legend entries are shown and a
button reads "Show all 15 choices". Press it: 15 lines and 15 entries, and the button reads "Show top 10 choices". On a poll with 10
graphed lines there is no button.

**Acceptance Scenarios**:

1. **Given** a poll with more than 10 graphed lines, **When** the graph is opened, **Then** only the leading choices (FR-013; 10 at most) are drawn and listed in the legend, and a button reads "Show all N choices", N being the number
   of graphed lines.
2. **Given** the top 10 are shown, **When** the viewer presses "Show all N choices", **Then** every graphed line is drawn and
   listed, and the button reads "Show top 10 choices".
3. **Given** all lines are shown, **When** the viewer presses "Show top 10 choices", **Then** the graph returns to the 10
   leading lines.
4. **Given** a poll with 10 graphed lines or fewer, **When** the graph is opened, **Then** all lines are drawn and no
   such button is shown.
5. **Given** all lines are shown, **When** the graph refreshes or the viewer changes the time scale, **Then** all
   lines stay shown; closing and reopening the view starts with the top 10 again.
6. **Given** a selected time, **When** the viewer presses the button, **Then** the time stays selected and the legend
   shows the shares at that time for the lines now drawn.

---

### Edge Cases

- A highlighted line stops being drawn (the viewer goes back to the top 10, or a refresh moves it out of the top 10):
  the highlight is cleared and the plain top 10 is shown, so the graph is never dimmed with no line in front and never
  draws an eleventh line.
- The number of graphed lines changes on a refresh: the button's number follows; when it falls to 10 or fewer the
  button goes and all lines are drawn.
- Two choices tie for tenth place: ties keep the poll's choice order, which decides which is in the top 10. A tie is
  two choices with the same displayed share: the graph receives whole percentages, so 2.6% and 3.4% tie at 3%.
- A choice in the top 10 by current share had a low share at the selected time: it stays listed and drawn; the top 10
  is always decided by the current share, never by the selected time.
- Fewer than two points of data, results not yet available, or a failed load: the existing notes are shown and there
  is no legend, readout or button, as today.
- Dark color scheme: the readout, the dimming and the highlight behave the same, and the highlighted line stays
  clearly stronger than the dimmed ones.
- A long choice label in the legend: the entry wraps or shortens within the graph's width; it never widens the card.
- The legend's total ("918 votes") stays visible at rest and while a time is selected.

## Requirements *(mandatory)*

### Functional Requirements

**Readout**

- **FR-001**: The graph MUST NOT show a floating box of values over the plot when a time is selected.
- **FR-002**: While a time is selected, each legend entry MUST show its choice's share at that time; with no time
  selected it MUST show the latest share.
- **FR-003**: A time label MUST always be shown with the legend: while a time is selected it reads that time, in the
  same wording the value box used (date and hour on the hourly scales, date and year on the daily scales); with no
  time selected it reads "Latest". Selecting, moving or clearing a time MUST NOT change the position or size of the
  plot.
- **FR-004**: The vertical line and one marker per drawn line MUST still mark the selected time on the plot, and
  nothing else may be drawn over the plot area.
- **FR-005**: The legend MUST keep one fixed order, highest current share first with ties in the poll's choice order,
  and MUST NOT re-order when the selected time changes. The graph puts the lines in that order itself; the order is made
  again on each refresh, when the current shares change.
- **FR-006**: Selecting, moving and clearing a time MUST work as today by touch, mouse and keyboard (Left, Right,
  Home, End, Escape), and the screen reader announcement of the time and shares MUST be kept.
- **FR-007**: Activating a legend entry or the show-all button MUST NOT clear a selected time.
- **FR-021**: A time selected by a press on the plot (a touch or a mouse click) MUST stay selected when the pointer
  leaves the plot, until a press anywhere other than the plot, the legend and the show-all button, keyboard focus
  moving anywhere other than those three, Escape, or a change of time scale; while a mouse-clicked time is
  held, moving the mouse over the plot with no button held MUST NOT move it; a drag with the button held, or another click on the plot, moves it. A time shown by
  mouse hover alone is cleared when the mouse leaves the plot, as today.

**Highlight**

- **FR-008**: Each legend entry MUST be a button that toggles the highlight of its line, operable by tap, click, Enter
  and Space, and exposing its pressed state to assistive technology.
- **FR-009**: At most one line is highlighted: highlighting a line MUST clear any other highlight; activating the
  highlighted entry again, or Escape while it has focus, MUST clear it.
- **FR-010**: The highlighted line MUST be drawn in front of all other lines and with a wider stroke; all other lines,
  their markers and the other legend entries MUST be shown dimmed and in their own colors.
- **FR-011**: The highlight MUST survive a refresh, a change of time scale and a time selection, and MUST be cleared
  when its line is no longer drawn and when the maximized view is closed.
- **FR-012**: Hovering a legend entry MUST NOT highlight anything.

**Number of lines**

- **FR-013**: When more than 10 lines are graphed, the graph MUST at first draw, and list in the legend, only
  the leading lines: those with the highest current shares that together reach 80% of the sum of all graphed lines' current shares, with any lines tied with the last of them, and never more than 10 (TWEAK06; it was the 10 with the highest current share). A poll with 10 graphed lines or fewer draws
  them all. Where this document says "top 10" or "the 10 leading lines", it means these leading lines.
- **FR-014**: When more than 10 lines are graphed, a button MUST read "Show all N choices" (N = the number of graphed lines)
  and draw and list every line when pressed; it MUST then read "Show top M choices" (M = the number of leading lines, FR-013) and return to the leading lines when
  pressed.
- **FR-015**: With 10 graphed lines or fewer, no such button is shown and every line is drawn.
- **FR-016**: The show-all state MUST survive a refresh and a change of time scale, and MUST start as "top 10" each
  time the maximized view is opened.

**Everywhere**

- **FR-017**: All of the above MUST apply at every viewport width and for any number of lines; there is no separate
  behaviour for phones or for small polls.
- **FR-018**: The line colors and their assignment MUST NOT change: each line keeps the color of its choice's bar; no
  dashed or dotted line styles are added.
- **FR-019**: Neither the highlight nor the show-all state may be stored between visits (no cookie and no browser
  storage).
- **FR-020**: No part of the graph (legend, readout, plot, buttons) may extend outside the graph's card at any width
  from 320 px up.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a poll with 15 graphed lines at a 360 px wide viewport, and again at desktop width, with a time
  selected: 100% of the plot area is free of anything but the time line and the markers.
- **SC-002**: In the same two set-ups, with a time selected: the share at that time can be read for every drawn
  choice, and no part of the graph is clipped or lies outside its card.
- **SC-003**: In the same two set-ups, with one line highlighted: that line can be followed without a break from the
  first point to the last.
- **SC-004**: A poll with 15 graphed lines opens with 10 lines and at most 10 legend entries, and all 15 are reachable
  with one press.
- **SC-005**: Every action — select a time, highlight a line, show all lines — can be done with the keyboard alone,
  and reading values by keyboard and screen reader works as it did before the change.
- **SC-006**: A viewer can read any drawn choice's share at a chosen time in one gesture (touch or point at the time),
  as before.

## Assumptions

- "Graphed lines" are the lines the graph receives today: choices at or below the site's minimum vote percentage are
  already left out before the top 10 is taken; that setting is unchanged.
- The lines arrive in the poll's choice order. Today's legend shows them in that order, so on a poll whose choice
  order is not its share order the legend's order changes with this feature.
- The numbers 10 and 80% and the button wordings are fixed by the requirements and are not settings.
- The dimmed strength and the highlighted line's width are design details for the plan; the requirement is that the
  difference is plain in both color schemes.
- When a time is selected, markers are drawn only for the lines that are drawn.
- The screen reader announcement lists the lines that are drawn (the top 10, or all after "Show all").
- The poll card's bars, the time scale buttons, the graph's axes, the data the graph receives and how often it
  refreshes are unchanged; nothing on the server changes and nothing new is stored.
- The existing documentation and tests that describe the floating value box are updated to describe the legend
  readout.
