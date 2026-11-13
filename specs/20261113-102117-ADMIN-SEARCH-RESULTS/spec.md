# Feature Specification: Admin Search Results List

**Feature Branch**: `admin-search`

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "requirements/20261113-102117-admin-search-results/requirements.md" — improve the Admin Search results so the administrator can scan them quickly, then select one poll to see its full Admin Poll Card and edit it if needed. The requirements report beside it (`requirements-report.md`, 9 findings, all resolved) holds the decisions this specification follows.

## Clarifications

### Session 2026-11-13

- Q: When the administrator returns to the Search view from another view, how is the last search shown? → A: Like a fresh search: the last search is run again, every row starts closed, and a single result opens by itself.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scan the results and open one poll (Priority: P1)

An administrator runs a search on the admin page's Search view. Instead of a long page of full-height poll cards, the results appear as a list of compact rows, one poll per row, each showing just enough to recognise the poll. The administrator scans the list, selects the row of the poll they want, and that poll's full Admin Poll Card opens directly under its row. From the card they act on the poll or edit it exactly as they do today. Selecting the row again closes the card; selecting another row moves the card there.

**Why this priority**: This is the whole point of the feature. Today a broad search can return up to 200 full cards, each filling most of a screen, so finding one poll means a great deal of scrolling. Without this story nothing else in the feature has value.

**Independent Test**: Run a search that matches several polls; confirm the results are compact rows with no card showing, that selecting a row opens that poll's full card under it, and that the poll can be edited from the card as before.

**Acceptance Scenarios**:

1. **Given** a search that matches several polls, **When** the results are shown, **Then** each poll is one compact row showing its title, subtitle, visibility, state, creator's name, created date and voter count, in the search's own order (newest first), and no full card is shown.
2. **Given** a list of closed rows, **When** the administrator selects a row, **Then** that poll's full Admin Poll Card opens directly under the row, the row stays visible above it and is marked as selected.
3. **Given** a row whose card is open, **When** the administrator selects the same row again, **Then** the card closes and the list is all rows again.
4. **Given** a row whose card is open, **When** the administrator selects a different row, **Then** the first card closes and the second poll's card opens under its own row, so that only one card is ever open.
5. **Given** an open card, **When** the administrator uses any of the card's actions or starts editing from it, **Then** it behaves exactly as the card does in the other admin views today.
6. **Given** a search that matches exactly one poll, **When** the results are shown, **Then** that poll's row is shown with its card already open.
7. **Given** a poll whose title is too long for its row, **When** the row is shown, **Then** the title wraps onto further lines and is shown in full; a poll with no title yet shows "(untitled)".
8. **Given** a window of any width, **When** the results are shown, **Then** each row has two lines, the title and subtitle first and the other facts second, inside one frame that looks like a poll card, with every second row shaded; in a narrow window the facts wrap and the row stays usable by touch.

---

### User Story 2 - Edit a poll without losing the draft (Priority: P2)

While the administrator is editing a poll from its open card, the rest of the results list is held, in the same way the view tabs and Create New Poll are held today: the edited poll's row cannot be closed, no other row can be opened, and a new search cannot be started. When the edit is saved, cancelled or its session is lost, everything is released.

**Why this priority**: An unsaved draft lives in the open card. Closing the card, opening another, or replacing the list under it would silently discard the administrator's work, so the new rows must respect the page's existing one-edit-at-a-time rule.

**Independent Test**: Open a poll from the results, start editing it, and confirm that the other rows, the open row, Search and Clear cannot be used and explain why; then save or cancel and confirm they work again.

**Acceptance Scenarios**:

1. **Given** a card that is being edited, **When** the administrator tries to select any other row, **Then** nothing opens, and the held rows are shown as disabled with the explanation "Finish editing the open poll first".
2. **Given** a card that is being edited, **When** the administrator selects its own row, **Then** the card stays open.
3. **Given** a card that is being edited, **When** the administrator looks at the search form, **Then** the Search and Clear buttons are held in the same way as the rows.
4. **Given** a card that is being edited, **When** the edit is saved, cancelled, or its edit session is lost, **Then** the rows, Search and Clear are usable again and the card remains open on the poll.

---

### User Story 3 - A list that stays put while it stays current (Priority: P3)

The results keep refreshing in the background as they do today, so states and voter counts stay current, but the refresh never disturbs what the administrator is doing: the open card stays open, focus and scroll position are kept, and no card opens, closes or moves by itself. A line above the list says how many polls matched.

**Why this priority**: It makes the list trustworthy and calm to work in, but the scan-and-open flow of Story 1 already delivers the core value without it.

**Independent Test**: Run a search, open a card, wait through several refresh intervals while a matching poll changes elsewhere; confirm the row's facts update, the open card stays open and in place, and the count line is correct.

**Acceptance Scenarios**:

1. **Given** search results on screen, **When** a refresh brings a changed state or voter count for a poll, **Then** that poll's row (and its card, if open) shows the new values without the list being redrawn around the administrator.
2. **Given** an open card, **When** a refresh happens, **Then** the card stays open, and keyboard focus and scroll position are unchanged.
3. **Given** a poll that no longer matches the search, **When** the next refresh happens, **Then** its row is removed, and its card with it if it was open — unless that poll is being edited, in which case its row and card stay until the edit ends.
4. **Given** a poll that newly matches the search, **When** the next refresh happens, **Then** it appears as a closed row in its place in the order.
5. **Given** a search with exactly one result whose card the administrator has closed, **When** a refresh happens, **Then** the card is not opened again.
6. **Given** a search that matched N polls, **When** the results are shown, **Then** a line above the rows reads "N polls match." (or "1 poll matches."), and it follows each refresh.
7. **Given** a search that matched nothing, or more polls than can be shown, **When** the results are shown, **Then** the existing messages appear unchanged ("No polls match." and "More polls match than are shown. Narrow the search.").

---

### User Story 4 - Use the list from the keyboard or a screen reader (Priority: P3)

An administrator who works from the keyboard or with assistive technology can move through the result rows, open and close a card, and always know whether a row is open.

**Why this priority**: The admin page is already keyboard-operable; the new rows must not be a step back. It ranks after the core flow only because the page has few users.

**Independent Test**: Using only the keyboard, tab to a result row, open it, move into the card, come back and close it; confirm with a screen reader that each row announces itself as a control and whether it is expanded.

**Acceptance Scenarios**:

1. **Given** the results list, **When** the administrator presses Tab, **Then** focus moves from row to row with a visible focus indicator.
2. **Given** a focused row, **When** the administrator presses Enter or Space, **Then** the row's card opens (or closes, if it was open) and focus stays on the row; the next Tab moves into the card.
3. **Given** any row, **When** assistive technology reads it, **Then** it is announced as a single control with its expanded or collapsed state and its relationship to its card.
4. **Given** either the light or the dark color scheme, **When** the results are shown, **Then** rows, their hover, focus and selected states, and the open/closed indicator are all clearly visible.

---

### Edge Cases

- **A new search, Clear, or leaving the Search view** while a card is open (and not being edited): the open card closes; which row was open is not remembered, so the next results start with every row closed (or the single result open).
- **Returning to the Search view from another view**: the last search is run again and shown like a fresh one — every row closed, or the single result open.
- **The Search view before any search has been run**: the list is empty and shows no count line, as today.
- **The search fails**: the existing error message is shown and no rows are drawn.
- **The open poll is deleted or duplicated from its card**: the list reloads as it does today; a deleted poll's row and card disappear, a duplicated poll appears as a new closed row if it matches the search.
- **A poll being edited stops matching the search**: its row and card stay until the edit ends, then follow the normal rule on the next refresh.
- **Opening a row that ends up outside the visible area** (low on the page, or moved by the card that closed above it): the page scrolls the row to the top of the visible area, below the fixed header, so the row and the start of its card are both in view; a row that is already fully visible does not move.
- **Very long titles, creator names or large voter counts**: the text wraps inside the row; nothing is cut and the frame never scrolls sideways.
- **The other admin views** (Newest, Awaiting Approval, Rejected) and a poll creator's own list: unchanged, still full cards. Create New Poll still opens the new poll's card on Newest.
- **The search panel**: still collapses by itself once a search the administrator ran has put results on screen, and stays open when nothing matched.

## Requirements *(mandatory)*

### Functional Requirements

**The results list**

- **FR-001**: In the Search view, the system MUST show each matching poll as one compact row instead of a full Admin Poll Card.
- **FR-002**: Each row MUST show, on its first line, the poll's title and, when it has one, its subtitle; and on its second line, in this order and separated by a dot: its visibility ("Public", "Private (invitation)" or "Private (shared link)"), its state as "Poll state: <state>", "Created by: <creator> on <date>" (the creator's user name, or their email address when they have no user name; the administrator's local date; "Created on <date>" when no creator is recorded), and its voter count as "N voters" ("1 voter" for one).
- **FR-003**: In the Search view the results list MUST be up to 840 px wide, centred, wider than the page's 420 px column of tabs, search form and cards. The list MUST be one frame with the look of a poll card (fill, border, rounded corners, shadow), its rows separated by a hairline and every second row shaded (zebra striping). A row MUST have two lines at every window width (title and subtitle, then the other facts), which wrap when they do not fit. The open card MUST keep its usual 420 px width, centred under its row, inside the frame.
- **FR-004**: A title that does not fit on its line MUST wrap and be shown in full; a poll with no title MUST show "(untitled)".
- **FR-005**: The state MUST be shown as plain text, "Poll state: " followed by the poll's stored state name (for example OPEN, EDITING, AWAITING APPROVAL). It MUST NOT look like a button or a badge: testers took the outlined OPEN badge for a button that opens the poll.
- **FR-006**: Rows MUST appear in the order the search returns them (newest first); the list MUST NOT offer sorting.
- **FR-007**: A row MUST NOT carry action buttons or an actions menu; every action on a poll stays on its card.

**Opening and closing**

- **FR-008**: Selecting a closed row MUST open that poll's full Admin Poll Card directly under the row; the card MUST be the same card, with the same content and behaviour, as in the other admin views.
- **FR-009**: Selecting an open row MUST close its card.
- **FR-010**: At most one card MUST be open at a time: selecting another row closes the open card and opens the new one.
- **FR-011**: The open row MUST remain visible above its card and be marked as selected.
- **FR-012**: After a search the administrator runs, every row MUST start closed, except that a search with exactly one result MUST show that result's card already open. Returning to the Search view from another view re-runs the last search and counts as a search the administrator ran.
- **FR-013**: When the administrator opens a row and the row is not fully inside the visible area afterwards, the page MUST scroll the row to the top of the visible area, below the fixed header; otherwise the page MUST NOT scroll. A single result that opens by itself MUST NOT scroll the page.
- **FR-014**: Running a new search, pressing Clear, or leaving the Search view MUST close the open card; the system MUST NOT remember which row was open.

**While a poll is being edited**

- **FR-015**: While a card opened from the results is being edited, the system MUST prevent its row from being closed and every other row from being opened.
- **FR-016**: Held rows MUST appear disabled and explain themselves with the text "Finish editing the open poll first".
- **FR-017**: While a card is being edited, the Search and Clear buttons MUST be held in the same way.
- **FR-018**: Saving, cancelling, or losing the edit session MUST release the rows and the Search and Clear buttons.

**Refresh**

- **FR-019**: The results MUST keep refreshing at the admin page's existing interval, updating each row's facts and the open card in place.
- **FR-020**: A refresh MUST NOT open, close or move a card, and MUST NOT change keyboard focus or the scroll position.
- **FR-021**: A poll that stops matching MUST lose its row (and its card, if open) on the next refresh, except the poll being edited, which keeps both until the edit ends.
- **FR-022**: A poll that newly matches MUST appear as a closed row in its place in the order.
- **FR-023**: The automatic opening of a single result (FR-012) MUST happen only for a search the administrator ran (pressing Search, or returning to the Search view), never on a background refresh or on a list reload caused by a card action.

**The count line**

- **FR-024**: When a search matches at least one poll and the results are not cut off, the notice above the rows MUST read "N polls match.", or "1 poll matches." for one, and MUST follow each refresh.
- **FR-025**: The existing messages for no results ("No polls match.") and for cut-off results ("More polls match than are shown. Narrow the search.") MUST stay as they are.
- **FR-026**: The search panel MUST still collapse by itself once a search the administrator ran has put results on screen, and stay open when nothing matched or the search failed.

**Accessibility and appearance**

- **FR-027**: Each row MUST be a single control that can be reached with Tab and toggled with Enter or Space, exposes whether it is expanded, and is associated with its card for assistive technology.
- **FR-028**: Opening a row MUST leave focus on the row, with the card next in the tab order.
- **FR-029**: Each row MUST be at least 48 px tall, with distinct hover, focus and selected appearances and an indicator that shows whether it is open.
- **FR-030**: Rows MUST follow the admin page's existing Material 3 visual language and work in both the light and dark color schemes.

**Scope boundaries**

- **FR-031**: The Newest, Awaiting Approval and Rejected views, and the single list shown to a poll creator who is not an administrator, MUST keep showing full cards, unchanged.
- **FR-032**: The search form's fields, the search's matching rules, its ordering and its result limit MUST NOT change.
- **FR-033**: The information exchanged between the admin page and the server for a search MUST NOT change; the feature MUST NOT add a setting, a cookie or a browser storage entry.
- **FR-034**: Details that belong only to an open card (such as an invitation-only poll's invitee list) MUST be requested only once that poll's card is opened, not for every result.

### Key Entities

- **Search result row**: the compact presentation of one matching poll — title, state, visibility, creator's name, created date, voter count — with an open or closed condition and, while another poll is being edited, a held condition. It holds no data of its own; everything comes from the search result.
- **Admin Poll Card**: the existing full presentation of a poll for administrators (state controls, summary, dates, counts, invitees, editing). Unchanged; shown under a row when that row is open.
- **Results notice**: the single status line above the list — the count of matching polls, or the existing empty, cut-off or error message.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a typical desktop screen (1920 × 1080), at least 10 search results are visible at once without scrolling, compared with one or two today.
- **SC-002**: An administrator can go from submitting a search to having a chosen poll's full card open in two actions (the search, then one selection) when the poll is among the visible rows.
- **SC-003**: With 200 results on screen, the list remains responsive: opening a row shows its card with no perceptible wait, and a background refresh causes no visible jump of the page.
- **SC-004**: In 100% of attempts, an unsaved edit survives every interaction with the results list (selecting rows, Search, Clear) until the administrator saves or cancels it.
- **SC-005**: Across at least 10 consecutive background refreshes with a card open, the card stays open and focus and scroll position do not change.
- **SC-006**: Every step of the scan–open–edit–close flow can be completed with the keyboard alone, and a screen reader announces each row's expanded or collapsed state.
- **SC-007**: The other admin views and the poll creator's list look and behave exactly as before the feature (no change observable to their users).

## Assumptions

- The decisions recorded in `requirements/20261113-102117-admin-search-results/requirements.md` under "Decisions" (findings RS1, AM1, UA1–UA7 of the requirements report) are final; this specification restates them and does not reopen them.
- The layout chosen is rows that expand in place; a two-pane list-detail layout and a results table with a dialog were considered and rejected.
- The search result already carries every fact a row shows, so no new information is needed from the server.
- "Creator's name" is the creator's user name, or their email address when they have none; the card's "Created By" field goes on showing both. "Voter count" is the same number the card's Voter Count shows.
- Only administrators have a Search view; poll creators who are not administrators are unaffected.
- The existing one-edit-at-a-time rule of the admin page (the tabs and Create New Poll are held during an edit) stays, and is extended to the rows rather than replaced.
- Known trade-offs accepted with these decisions: the admin page shows polls in two ways (rows in Search, full cards elsewhere), and each search still returns more information per poll than a row needs.
- Existing automated checks that expect a full card for every search result will need to follow the new behaviour; that is an expected consequence, not a regression.
