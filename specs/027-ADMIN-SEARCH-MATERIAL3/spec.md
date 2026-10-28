# Feature Specification: Admin Search, Material 3

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "designDocs/027-high-level-requirements-admin-search.md"

**Source requirements**: `designDocs/027-high-level-requirements-admin-search.md` (every finding of the
architecture review is resolved).
**Architecture**: `architecture/027-admin-search-material3/architecture.md` (11 findings, all resolved).

## Clarifications

### Session 2026-10-05

- Q: FIX01 (2026-10-06) — the revised design shows every field at once, with visibility, choice mode and vote mutability as radio groups. → A: The More filters disclosure and its rules are removed (formerly FR-010 to FR-014, User Story 3, SC-005 and SC-006); the three selects become radio groups of Any and the two choices.
- Q: FIX07 (2026-10-06) — what should clicking the Search menu item do to a collapsed panel? → A: Expand it, whether the click comes from another view or from the Search view itself; only a click does this, not the list's refresh or a search's own load.
- Q: FIX06 (2026-10-06) — relabel eight fields of the search panel. → A: Created by user name (contains); State (Initialized, Open, Closed, etc.); Created on; Starts on; Ends on; Vote count; Invitee count; Banned users count. The date and count value fields keep Date and Count.
- Q: FIX05 (2026-10-06) — should the search panel be collapsible, and when should it collapse? → A: A toggle above the panel collapses and expands it; it collapses after a search the user ran has put results on screen, and stays open when nothing matched or the search failed. It is in memory only.
- Q: FIX04 (2026-10-06) — the read-only admin card has lost its "Created By" field. → A: Restore it above Created and Launched as "Created By: <username> (<email>)", left out when no creator is recorded.
- Q: FIX02 (2026-10-06) — is the "Fill in the form and press Search." help text needed? → A: No; the form is not user facing. The Search view shows no message before a search.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The search panel looks and sizes like a poll card (Priority: P1)

On the administration page, the Search view shows a panel of search fields above the results. Today it
spans the whole page and looks unlike everything around it. After this feature it is the same width as the
poll cards below it, sits in the same centred column as the view tabs and the Create New Poll button, and
has the same kind of surface (corners, border, shadow, padding) at every window size, so the page reads as
one column.

**Why this priority**: This is the visible change the requirements ask for, and the Material 3 styling in
the other stories builds on it.

**Independent Test**: Open the administration page as an administrator, choose Search, and compare the
panel's width, corners, border and spacing with a poll card at a wide window, a medium one and a phone-width
one.

**Acceptance Scenarios**:

1. **Given** a wide window, **When** the Search view is shown, **Then** the panel is exactly as wide as a
   poll card, centred in the same column as the tabs and the cards.
2. **Given** a window narrower than a card, **When** the Search view is shown, **Then** the panel fills the
   available width, as a card does, with no sideways scrolling.
3. **Given** any window size, **When** the panel and a card are compared, **Then** their corners, border,
   shadow and padding are the same, including the smaller corners and padding the cards use on narrow
   screens.
4. **Given** the Newest, Awaiting Approval or Rejected view, **When** it is shown, **Then** no panel appears
   and the status line under the tabs is unchanged in position.

---

### User Story 2 - Clear, labelled Material 3 fields (Priority: P1)

Every search field is a Material 3 field with a visible label, on the same spacing and type as the cards.
The fields stack in one column in today's order: free text, state, then visibility, choice mode and vote
mutability as three radio groups (Any, then the two choices, in one row each), then created by; then Created,
Starts and Ends, each an operator beside its date; then Votes, Invited and Banned, each an operator beside its
number; then the actions. **Search** is the prominent filled button
and **Clear** a quieter text button.

**Why this priority**: Without legible labels and a layout that fits the card width, the narrower panel would
be unusable.

**Independent Test**: Fill every field in a narrow window and in a wide one and run a search; confirm each
field has a visible label and that the same results come back as before this feature.

**Acceptance Scenarios**:

1. **Given** the panel is open, **When** a visitor reads it, **Then** every field shows a visible label, and
   the wording of today's placeholders is now the label.
2. **Given** an operator and a value (for example Created on or after a date), **When** the window is at
   least 320 px wide, **Then** the two sit side by side; below 320 px they stack.
3. **Given** any control, **When** it is used with a finger, **Then** it is at least 48 px tall.
4. **Given** the actions, **When** the panel is shown, **Then** Search is the filled, prominent button and
   Clear is a text button, both with the same focus ring, press feedback and ripple as the other
   administration controls.
5. **Given** a search that worked before this feature, **When** the same values are entered, **Then** the
   same polls are returned: no search behaviour changes.
6. **Given** the state field, the operator selects and the date fields, **When** they are used, **Then** they
   behave as the browser's own, including on touch devices and with a keyboard.
7. **Given** visibility, choice mode or vote mutability, **When** the panel is shown, **Then** each is one row
   of three options (Any, then the two choices) with Any chosen, each option at least 48 px tall, and a search
   sends a filter for a group only when an option other than Any is chosen; Clear puts every group back on Any.

---

### User Story 3 - The status line reads as Material 3 supporting text (Priority: P2)

The line under the tabs that says "Only the newest 200 polls are shown…", "No polls match." or why a search
failed is shown as Material 3 supporting text: small body type in
the secondary text colour, centred in the same column. It stays a separate line outside the panel because it
also serves the other three views. When it changes, screen readers announce the new text.

**Why this priority**: Consistency and accessibility; the wording and behaviour are unchanged.

**Independent Test**: Trigger each message and confirm its type, colour and position, and that a screen
reader announces it.

**Acceptance Scenarios**:

1. **Given** any message, **When** it is shown, **Then** it is in the Material 3 supporting-text style,
   centred in the card column, in every view.
2. **Given** a search that fails, **When** the error appears, **Then** it is shown in this line, as before,
   with no per-field error styling.
3. **Given** the line's text changes, **When** a screen reader is in use, **Then** the new text is
   announced.

---

---

### User Story 4 - The read-only card names its creator (Priority: P3)

On the administration page, the read-only poll card shows who created the poll, above its Created and
Launched dates, in the same style: `Created By: <username> (<email>)`. A poll with no recorded creator
shows no such line.

**Why this priority**: A small correction to the card the search results are shown in; the search itself does
not depend on it.

**Independent Test**: Open the administration page and compare a poll with a creator and one without.

**Acceptance Scenarios**:

1. **Given** a poll with a recorded creator, **When** its read-only card is shown, **Then** a Created By line
   sits above Created and Launched, in the same style, reading `<username> (<email>)`.
2. **Given** a creator with no username, **When** the card is shown, **Then** the line shows the email address
   alone.
3. **Given** a poll with no recorded creator, **When** the card is shown, **Then** no Created By line appears.
4. **Given** the same poll in the Newest view and in a search result, **When** each card is shown, **Then** the
   line is the same.

---

### User Story 5 - Collapse the search panel to save space (Priority: P2)

A text button above the search panel, **Collapse Search**, collapses it to give the results the page, and
reads **Expand Search** while it is collapsed. After a search the administrator ran has put results on screen
the panel collapses by itself; it stays open when nothing matched or the search failed, so the filters can be
changed.

**Why this priority**: The panel is long with every field shown, and it pushes the results down.

**Independent Test**: Run a search that has results, then one that has none, and use the button each way.

**Acceptance Scenarios**:

1. **Given** the Search view, **When** it is shown, **Then** a Collapse Search button sits above the panel in the
   same column, and no such button appears in the other views.
2. **Given** the panel is open, **When** the button is pressed, **Then** the panel is hidden, what was typed is
   kept, and the button reads Expand Search and reports it is collapsed.
3. **Given** a search the administrator ran returns results, **When** they are shown, **Then** the panel is
   collapsed.
4. **Given** a search returns nothing or fails, **When** the message is shown, **Then** the panel stays open.
5. **Given** the panel was expanded after a search, **When** the list refreshes on its own, **Then** it stays
   expanded.
6. **Given** the panel is collapsed, **When** the Search view tab is clicked, whether from another view or while
   on the Search view, **Then** the panel is expanded.
7. **Given** a poll creator who is not an administrator, **When** the page loads, **Then** there is no Search
   view, no panel and no button.

---

### Edge Cases

- A poll creator who is not an administrator has no Search view and no panel, as today.
- The panel works in both light and dark themes because every colour comes from the shared theme values;
  the administration page itself stays light, as today.
- A very narrow window (under 320 px) stacks operator and value without clipping and without sideways
  scrolling.
- Changing only an operator (for example Created on or after) with no date or number adds no filter.
- A radio group left on Any adds no filter, whatever its wording.
- Pressing Enter in a text field still runs the search.
- The results page for a poll (which has no search panel) is unchanged.

## Requirements *(mandatory)*

### Functional Requirements

**Panel**

- **FR-001**: The search panel MUST have exactly the poll cards' container sizing: width 100% up to a 420 px
  maximum, centred, with the same padding (smaller under 640 px), the same corners (smaller under 480 px),
  the same border and the same shadow. The panel and the cards MUST share one rule so they cannot drift
  apart.
- **FR-002**: The panel MUST sit in the same centred column as the view tabs, the status line, the Create New
  Poll button and the cards, and MUST NOT scroll sideways at any window width.
- **FR-003**: The panel MUST be shown only in the Search view, as today.

**Fields and buttons**

- **FR-004**: The fields MUST stack in one column in this order: free text, state, the visibility, choice mode
  and vote mutability radio groups, created by; the Created, Starts and Ends groups (operator beside date); the Votes,
  Invited and Banned groups (operator beside number); then the actions.
- **FR-005**: Every text, number, date and select field MUST be a Material 3 outlined field, 56 px tall, with a visible label, on an 8 px
  spacing grid; operator selects MAY be compact. Operator and value MUST sit side by side down to 320 px
  and stack below it.
- **FR-006**: Values MUST use Material 3 body-large type and labels body-small type; **Search** MUST be a
  filled button and **Clear** a text button, each at least 48 px tall, with the shared focus ring, state
  layers and press ripple.
- **FR-007**: The state select, the operator selects and the date inputs MUST remain the browser's own controls.
- **FR-008**: Every control MUST carry a real visible label, worded as in the contract's C3 list (for example "Created by user name (contains)", "Vote count", "Invitee count", "Banned users count"); each radio option's label is its own text and each
  radio group MUST carry an accessible name.
- **FR-009**: Every identifier, field name and button class the page's behaviour and tests rely on MUST be
  preserved, and the search request, the views and the creator-only view MUST be unchanged.

**Radio groups**

- **FR-010**: Visibility, choice mode and vote mutability MUST each be a radio group of three options in one
  row (Any visibility, Public, Private; Any choice mode, Single Choice, Multiple Choice; Any vote mode, Vote
  can change, First vote is final), with Any chosen by default, each option at least 48 px tall, the ring and
  filled dot in the Material 3 radio style, and a single column when the panel is narrower than 360 px.
- **FR-011**: A radio group MUST send a filter only when an option other than Any is chosen, with the same
  values the select it replaces sent, and **Clear** MUST put every group back on Any.

**Status line**

- **FR-012**: The status line MUST remain a separate line outside the panel, centred in the card column in
  every view, in Material 3 supporting-text style (body-small type in the secondary text colour), never
  boxed.
- **FR-013**: The status line MUST announce a change of text to screen readers. Its messages and the error
  display (errors appear in this line, with no per-field error states) MUST be unchanged, except that the Search
  view MUST show no message before a search has been run (the old "Fill in the form and press Search." is removed).

**Read-only card**

- **FR-015**: The read-only poll card MUST show a Created By line above Created and Launched, in the same
  style, reading `<username> (<email>)` (the email alone when there is no username), and MUST NOT show it when
  no creator is recorded. The administration list and search results MUST carry the creator's username and
  email address, empty when no creator is recorded.

**Collapsing the panel**

- **FR-016**: A text button above the search panel, in the same column and outside the panel, MUST collapse and
  expand it, reading **Collapse Search** while the panel is open and **Expand Search** while it is collapsed,
  at least 48 px tall, reporting its state to assistive technology, and shown only in the Search view.
- **FR-017**: A collapsed panel MUST keep every field's value and MUST NOT be reachable by keyboard.
- **FR-018**: The panel MUST collapse after a search the administrator ran has put one or more results on
  screen, MUST stay open when no poll matched or the search failed, and MUST NOT collapse because the list
  refreshed on its own. A click on the Search view tab MUST expand a collapsed panel.
- **FR-019**: The collapsed state is kept in memory only and is not remembered between visits.

**Theme**

- **FR-014**: Every colour MUST come from the shared theme values so dark mode follows wherever it is turned
  on; the administration page stays light and the poll results page is untouched.

### Key Entities

- **Search panel**: the surface holding the search fields and actions for the Search view.
- **Search field**: one labelled input (text, select, date or number), optionally paired with an operator.
- **Radio group**: a labelled row of three options, Any and the two choices, for one of visibility, choice
  mode and vote mutability.
- **Status line**: the one-line message under the view tabs.
- **Creator line**: the Created By text on a read-only poll card, built from the poll's recorded creator.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At every window width from 320 px up, the search panel's width equals a poll card's width and
  neither scrolls sideways, in 100% of tested widths.
- **SC-002**: The panel's corners, border, shadow and padding match a poll card's at the wide, medium and
  narrow sizes in 100% of tested sizes.
- **SC-003**: Every search field and button shows a visible label or text and is at least 48 px tall.
- **SC-004**: A search that returned a given set of polls before this feature returns the same set after it,
  for every field, in 100% of tested searches.
- **SC-005**: Every message in the status line is announced by a screen reader when it changes.
- **SC-006**: Every read-only poll card with a recorded creator shows a Created By line in the specified format,
  and none without one does, in 100% of tested cards.
- **SC-007**: After a search with results the panel is collapsed and the first result is on screen, and after a search
  with no results the panel is open, in 100% of tested searches.

## Assumptions

- The behaviour of the search, its request and results, and the views are out of scope and unchanged; the
  results now also carry each poll's creator (User Story 4).
- The creator's email address is looked up from their account when the list is built, not stored on the poll.
- "Material 3" means the theme values, shapes, type and state styling the administration cards already use,
  not a new design system.
- The creator-only view, which has no Search view, is unaffected, and the poll results page is not touched.
- The administration page stays in its light theme; dark mode works wherever it is turned on later.
- No new setting, route, data or script file is introduced beyond the page's existing script and a new
  stylesheet for this panel; the creator line adds two fields to the existing administration list rows.
