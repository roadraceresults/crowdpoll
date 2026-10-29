# Feature Specification: Poll Line Graph

**Feature Branch**: `20261027-151601-POLL-LINE-GRAPH`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "requirements/20261027-151601-poll-line-graph/requirements.md"

## Clarifications

### Session 2026-10-27

- Q: What should the viewer see when the graph's data fetch fails (first load or a periodic refresh)? → A: Keep
  the last drawn graph and silently retry at the next refresh interval; a failed first load shows a quiet
  "Graph unavailable right now" placeholder that the next successful fetch replaces.
- Q: What accessibility is expected for keyboard and screen-reader users? → A: The legend (real text with each
  drawn choice's label and current percentage) is the accessible reading; the graph carries an accessible
  name/summary and is otherwise a visual supplement — no keyboard-driven crosshair.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See how the vote has moved over time (Priority: P1)

A viewer maximizes a poll card.
Beside the familiar bar graph, the right column now shows a line graph: one line per leading choice, tracing the
percentage of the vote that choice held at each point in time, in the same colour the choice's bar uses.
The poll's title and subtitle appear above the graph, a legend names each line with its colour and current
percentage, and the total vote count shown matches the bar graph exactly.

**Why this priority**: This is the feature — the bar graph answers "where does the vote stand?", and the line graph
answers "how did it get there?". Everything else in this specification refines this view.

**Independent Test**: Maximize a poll that has votes spread over several hours and confirm a line graph renders in
the right column with one line per qualifying choice, colours matching the bars, and a newest point equal to the
bar graph's current percentages and vote count.

**Acceptance Scenarios**:

1. **Given** an open poll with votes recorded over several days, **When** a viewer maximizes its card, **Then** the
   right column shows a line graph whose lines are the choices currently above the share threshold, each in its
   bar-graph colour, with title, subtitle, legend and total vote count.
2. **Given** the rendered line graph, **When** its newest time point is compared with the bar graph beside it,
   **Then** the percentages and the displayed vote count are identical.
3. **Given** a poll where a voter changed their vote on a dynamic poll, **When** the graph is rendered, **Then**
   each time point counts that voter once, with the selection they held at that time.
4. **Given** a choice whose current share is at or below the threshold, **When** the graph is rendered, **Then**
   that choice has no line and no legend entry.

---

### User Story 2 - Choose the time window (Priority: P2)

The viewer switches the graph between four scales — 1 Day, 1 Week, 1 Month and 1 Year — with a selector under the
graph.
Scales the poll's data cannot fill are not offered, the default is the largest available scale, and the window
never reaches back more than one year.

**Why this priority**: A single fixed window would make the graph useless for both very new and very old polls;
the scales make the same view serve both.

**Independent Test**: Maximize polls whose voting spans under a day, under a week, under a month and over a month,
and confirm the offered scales follow the availability rules and the default is the largest offered.

**Acceptance Scenarios**:

1. **Given** a poll whose first vote is less than a day old, **When** the graph renders, **Then** only "1 Day" is
   offered and selected.
2. **Given** a poll whose votes span more than a month, **When** the graph renders, **Then** all four scales are
   offered and "1 Year" is selected by default.
3. **Given** the "1 Day" or "1 Week" scale, **When** the axis renders, **Then** its points are hours;
   **Given** "1 Month" or "1 Year", **Then** its points are days.
4. **Given** any scale, **When** the viewer picks another offered scale, **Then** the graph redraws for that
   window without leaving the maximized view.

---

### User Story 3 - Inspect a moment (Priority: P3)

The viewer moves the pointer across the graph (or taps it on a touch screen) and a vertical crosshair follows,
with a tooltip listing every drawn choice and the percentage it held at that time, plus the date — or date and
hour on the hourly scales — shown once.

**Why this priority**: The lines show the shape of the race; the crosshair gives the exact numbers at any moment
without cluttering the graph.

**Independent Test**: Hover at several positions on each scale and confirm the tooltip lists all drawn lines'
values at the hovered time with the correctly formatted date or date-and-hour.

**Acceptance Scenarios**:

1. **Given** a rendered graph, **When** the viewer hovers over it, **Then** a vertical crosshair appears at the
   nearest time point with a tooltip listing each drawn choice (colour dot, label, percentage) and the time.
2. **Given** an hourly scale, **When** the tooltip shows, **Then** the time includes the hour;
   **Given** a daily scale, **Then** it shows the date only.
3. **Given** a touch device, **When** the viewer taps the graph, **Then** the crosshair and tooltip appear at the
   tapped time.
4. **Given** any viewer, **When** the tooltip's time renders, **Then** it is formatted in that viewer's local time.

---

### User Story 4 - The graph stays current (Priority: P4)

While the card stays maximized, the graph refreshes itself on a configurable interval so the newest point keeps up
with incoming votes, without the viewer doing anything.
Many viewers watching the same poll share one computation per interval, so watching is cheap for the service.

**Why this priority**: Without refresh the graph is a snapshot that silently drifts from the live bar graph beside
it; this story keeps the two consistent over a long viewing.

**Independent Test**: Maximize a poll, cast votes from another session, and confirm the graph's newest point and
legend percentages update within one refresh interval; closing the maximized view stops the refreshing.

**Acceptance Scenarios**:

1. **Given** a maximized poll and new incoming votes, **When** one refresh interval passes, **Then** the graph and
   legend show the new standing.
2. **Given** the maximized view is closed, **When** the interval next elapses, **Then** no further refresh happens.
3. **Given** several viewers watching the same poll on the same scale, **When** an interval passes, **Then** the
   series is computed once and shared, not once per viewer.

---

### Edge Cases

- A poll with a very large voting history (millions of recorded votes) draws as quickly as a small one, and opening
  it never endangers the service for other visitors (added by TWEAK03).

- A poll with no votes, or with all votes inside a single hour, cannot draw a line: the right column shows the
  title, subtitle and a quiet "Not enough voting data to graph yet" placeholder, and the graph appears on a later
  refresh once two time points exist.
- A viewer who may not see the poll's results (the card would not show its results face) sees no graph and cannot
  obtain the series by asking the service directly; the right column shows the title, subtitle and a note that
  results are not available yet.
- Vote records older than one year are purged by the existing retention rule, so the 1 Year scale is the ceiling
  and can never ask for data that no longer exists; "ALL" is deliberately not offered.
- A choice added late, or one whose share fell, is drawn or omitted by its current share only — lines never start
  or stop mid-window.
- A poll with many qualifying choices produces a long tooltip and a wrapping legend; both must remain readable.
- On narrow viewports the right column wraps below the card and the graph renders at full width there.
- In dark mode the lines keep the same colours as the bars while the axes, labels and tooltip follow the theme.
- A changed vote must never double-count its voter at any time point.
- A failed data fetch never blanks a drawn graph: the last drawn series stays and the next interval retries
  silently; only a failed first load shows the "Graph unavailable right now" placeholder.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The maximized poll view MUST render a line graph in its right column, occupying the column's full
  width, with the poll's title and subtitle above it.
- **FR-002**: Each drawn line MUST trace one choice's percentage of the vote at each discrete time point, where
  the percentage at a time point is the cumulative standing: every voter's latest vote as of that time, computed
  with the same percentage formula the bar graph uses.
- **FR-003**: The graph's newest time point MUST equal the bar graph's percentages as of the time the graph's
  series was computed, and the total vote count displayed with the graph MUST equal the bar graph's as of that
  same time; drift against the live bar graph is bounded by one refresh interval (FR-011).
- **FR-004**: The graph MUST offer four scales — 1 Day and 1 Week with hourly points, 1 Month and 1 Year with
  daily points — and the window MUST never extend more than one year back.
- **FR-005**: Scale availability MUST follow the data span, measured from the poll's first recorded vote to now:
  1 Day always; 1 Week once the span reaches 1 day; 1 Month once it reaches 1 week; 1 Year once it reaches
  1 month. The default selection MUST be the largest available scale.
- **FR-006**: Only choices whose current share exceeds the threshold setting `ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE`
  (whole percent, default 1; 0 disables the filter) MUST be drawn, and a qualifying choice MUST be drawn across
  the whole window.
- **FR-007**: Each line MUST use the same colour as that choice's bar in the bar graph — manual colours, the
  fixed yes/no colours and palette assignments included — in light and dark themes alike, while the graph's axes,
  gridlines, labels and tooltip follow the active theme.
- **FR-008**: A legend above the graph MUST show one entry per drawn line — colour dot, choice label and current
  percentage — plus the total vote count, wrapping on narrow columns.
- **FR-009**: Hovering (or tapping, on touch screens) MUST show a vertical crosshair at the nearest time point
  with a tooltip listing every drawn choice and its percentage there, and the date — or date and hour on hourly
  scales — shown once.
- **FR-010**: Time points MUST be computed in UTC so every viewer shares the same series, while axis and tooltip
  labels MUST be formatted in the viewer's local time.
- **FR-011**: While the card stays maximized the graph MUST refresh on the interval setting
  `ENV_LINE_GRAPH_REFRESH_INTERVAL` (milliseconds, default 60000, never below the existing live-refresh floor),
  and MUST stop refreshing when the maximized view closes.
- **FR-012**: The series MUST be computed by the service, not the browser; voter identities MUST never be sent to
  the browser, and one computation per poll (all its scales at once, TWEAK04) MUST be shared by all viewers within a refresh interval.
- **FR-013**: The graph MUST be available exactly when the viewer may see the poll's results, enforced by the
  service as well as the page; a viewer without that access gets the title, subtitle and a note that results are
  not available yet.
- **FR-014**: With fewer than two time points on every available scale, the right column MUST show the title,
  subtitle and the placeholder "Not enough voting data to graph yet" instead of axes.
- **FR-015**: On narrow viewports the graph MUST follow the maximized view's existing wrap, rendering below the
  card at full width.
- **FR-016**: Both new settings MUST be configurable by the operator and delivered to the page with the existing
  page configuration.
- **FR-017**: A failed series fetch MUST leave the last drawn graph in place and retry silently at the next
  refresh interval; a failed first load MUST show a quiet "Graph unavailable right now" placeholder until a fetch
  succeeds.
- **FR-018**: The legend MUST be real text readable by assistive technology, and the graph MUST carry an
  accessible name summarizing what it shows (the poll's vote share over time); the crosshair remains a
  pointer/touch affordance with no keyboard equivalent.

### Key Entities

- **Vote event**: an existing record of one voter's vote on one poll at one moment, carrying the full selection
  held after the event; changed votes create new events. Retained for one year. The graph is derived entirely
  from these records.
- **Time-series bucket**: one discrete time point on a scale (an hour or a day, bounded in UTC), holding the
  cumulative standing of every choice at that boundary.
- **Choice series**: one drawn line — a choice, its bar-graph colour, and its percentage in each bucket of the
  selected scale.
- **Scale**: one of the four windows (1 Day, 1 Week, 1 Month, 1 Year), with its bucket size and availability rule.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A viewer maximizing a poll with graphable data sees the rendered line graph within 2 seconds.
- **SC-002**: The graph's newest point and displayed vote count match the bar graph's standing as of the time the
  graph's series was computed — 100% agreement at computation time, verified across single-choice, multiple-choice
  and changed-vote polls; any transient difference against the live bars is bounded by one refresh interval (SC-003).
- **SC-003**: A newly cast vote is reflected in the graph within one refresh interval (one minute at the default
  setting) for every viewer watching the poll.
- **SC-004**: Any number of simultaneous viewers of one poll, on any scales, cause at most one series computation per
  refresh interval.
- **SC-005**: A viewer can read the exact percentage of every drawn choice at any time point with a single hover
  or tap.
- **SC-006**: The graph is fully usable — drawn, legible and inspectable — at phone widths and in both light and
  dark themes.

## Assumptions

- Vote events with timestamps already exist for every vote, including changed votes, and are retained for
  12 months; the graph makes no attempt to show history older than that, which is why "1 Year" is the largest
  scale and no "ALL" scale exists.
- The percentage formula, the per-choice colours and the result-visibility rules are the existing ones the bar
  graph uses; this feature reuses them rather than defining its own.
- The right column of the maximized view is currently an empty placeholder, so the graph occupies existing space
  and no poll-card layout changes.
- The refinement decisions recorded in the requirements document's "Resolved Details" (data transport, caching
  design, rendering approach, time-zone handling) are fixed inputs to planning and are intentionally not repeated
  here in implementation terms.
- No zoom, pan, image export or per-line toggling is asked for; a poll that closes keeps its graph for as long as
  its vote events are retained.
- Integer percentage rounding matches the bar graph, so the two can never disagree by display rounding.
