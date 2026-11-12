# Feature Specification: Admin Search Checkboxes

**Feature Branch**: `20261112-173521-ADMIN-SEARCH-CHECKBOXES`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "requirements/20261112-173521-admin-search-checkboxes/requirements.md": add two checkboxes
to the administrator's Search fields, on a new row under the "Any vote mode", "Vote can change", "First vote is final"
radio buttons: "Line graph enabled" and "Custom colors set".

## User Scenarios & Testing *(mandatory)*

The user is a CrowdPoll administrator working on the admin page's Search view, which narrows the poll list to the polls
matching every filled-in control. Today it can filter by words, state, visibility, choice mode, vote mode, creator,
dates and counts, but not by whether a poll shows a line graph or uses hand-picked choice colors. After this feature the
administrator can find those polls in one search.

### User Story 1 - Find the polls that show a line graph (Priority: P1)

The administrator ticks "Line graph enabled" and searches; the list shows only the polls whose line graph is turned on.

**Why this priority**: Line graphs are the setting administrators most often need to review across polls (for example
after loading demonstration polls), and the checkbox row is built with this first box.

**Independent Test**: With polls whose line graph is on and polls whose line graph is off, tick only "Line graph enabled"
and search: exactly the polls with the line graph on are listed, newest first.

**Acceptance Scenarios**:

1. **Given** the Search view, **When** the administrator opens it, **Then** a row with the two unticked checkboxes "Line
   graph enabled" and "Custom colors set" is shown directly under the vote mode radio buttons.
2. **Given** "Line graph enabled" is ticked and nothing else is filled in, **When** the administrator searches, **Then**
   only polls with the line graph turned on are listed.
3. **Given** "Line graph enabled" is ticked together with other filters (for example "First vote is final"), **When**
   the administrator searches, **Then** only polls meeting all of them are listed.
4. **Given** neither box is ticked, **When** the administrator searches, **Then** the results are exactly those the same
   search gives today.

---

### User Story 2 - Find the polls with hand-picked choice colors (Priority: P2)

The administrator ticks "Custom colors set" and searches; the list shows only the polls in which at least one choice has
a color picked by hand rather than assigned automatically.

**Why this priority**: It completes the requested row and uses the same mechanism as Story 1.

**Independent Test**: With a poll whose choices are all automatic, a poll with one hand-picked color and a poll with every
color picked, tick only "Custom colors set" and search: the second and third polls are listed, the first is not.

**Acceptance Scenarios**:

1. **Given** "Custom colors set" is ticked, **When** the administrator searches, **Then** a poll is listed exactly when at
   least one of its saved choices has a hand-picked color.
2. **Given** both boxes are ticked, **When** the administrator searches, **Then** only polls with the line graph on and
   at least one hand-picked color are listed.
3. **Given** a poll whose hand-picked colors exist only in an unsaved edit or a pending update, **When** the
   administrator searches with "Custom colors set" ticked, **Then** the poll is matched on its saved choices only.

---

### Edge Cases

- No poll matches the ticked boxes: the Search view's usual "No polls match." message is shown.
- More polls match than the search returns: the usual "More polls match than are shown. Narrow the search." message.
- The periodic refresh of the list re-runs the search with the boxes as they were when it was submitted.
- A request to the search with an invalid value for either filter is refused with an error, as an invalid operator is today;
  a blank value is ignored.
- A voter-added choice (which never has a hand-picked color) does not stop a poll with other hand-picked colors from
  matching.
- On a narrow screen the two checkboxes stack in one column, as the radio buttons do.
- Leaving and reopening the admin page starts with both boxes unticked.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The admin Search form MUST show, on a new row directly under the vote mode radio buttons, two checkboxes
  labelled exactly "Line graph enabled" and "Custom colors set", both unticked by default.
- **FR-002**: An unticked checkbox MUST NOT narrow the results; a search with both unticked MUST return exactly what the
  same search returns today.
- **FR-003**: With "Line graph enabled" ticked, the search MUST return only polls whose line graph setting is on.
- **FR-004**: With "Custom colors set" ticked, the search MUST return only polls in which at least one saved choice has a
  hand-picked color.
- **FR-005**: The ticked checkboxes MUST combine with each other and with every other filled-in control so that a poll
  is returned only when it meets all of them.
- **FR-006**: Both filters MUST use the poll's saved settings and choices, never an unsaved edit or a pending update.
- **FR-007**: The search service MUST accept each filter as an optional parameter, sent only when its box is ticked; a
  blank value MUST be ignored and any other value than the one meaning "on" MUST be refused with the search's usual
  error response.
- **FR-008**: The published API description of the administrator's search MUST describe both new parameters.
- **FR-009**: Each checkbox MUST offer a touch target at least 48 px tall and a visible keyboard focus indicator, follow
  the page's Material 3 look like the radio buttons above it, and stack into one column on narrow screens.
- **FR-010**: The boxes MUST NOT be remembered between visits to the page.
- **FR-011**: Automated tests MUST cover the two server-side filters (alone, together and with another filter), the
  refusal of an invalid value, the form sending a parameter only for a ticked box, and the API description.

### Key Entities

- **Poll**: has a line graph setting (on or off) and a list of choices.
- **Choice**: has a label and, when picked by hand, a color; an automatically colored choice has none.
- **Search filters**: the set of filled-in controls of the Search form; the two new ones are on/off flags that only narrow
  the results when on.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator finds every poll with a line graph, or with hand-picked colors, with one search, instead of
  opening each poll's settings.
- **SC-002**: 100% of the polls returned with a box ticked have that setting, and no poll with the setting that meets the
  other filters is left out (within the search's usual result limit).
- **SC-003**: A search with both boxes unticked returns the same polls, in the same order, as before the feature.
- **SC-004**: A search with either box ticked, alone or with any other filter, is answered from an index like every
  other filter, so it is as fast as a search on another filter is today.

## Assumptions

- The Search view, its result limit, order, messages and periodic refresh are unchanged; only the two filters are added.
- A choice's hand-picked color is the color saved when the "Select colors for the poll choices" switch is on; with the
  switch off no choice has one, so "Custom colors set" matches polls with that switch on.
- Finding polls *without* a line graph or *without* custom colors is out of scope (unticked means "any", AM1).
- Only administrators use the Search view; who may search is unchanged.
- The Newest, Awaiting Approval and Rejected views, the public home-page search and the search index are unchanged.
- No new setting, cookie or browser storage key; the only database change is two partial indexes (no new column or
  data change).
