# Feature Specification: Who Voted Report

**Feature Branch**: `20261110-123524-WHO-VOTED-REPORT`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "requirements/20261110-123524-who-voted-report/requirements.md"

## User Scenarios & Testing *(mandatory)*

A poll creator can make a private poll whose votes are not anonymous: the wizard's switch **Users can see who voted for what** tells voters that "the names of voters are shown next to the choices they picked".
Today nothing shows those names to the people taking part; only the creator and administrators can see them, on the admin results page.
This feature adds a **Who voted** panel to the Maximize Poll view of such a poll, listing each voter's current vote, sortable by voter or by choice, and kept in step with the bars of the Poll Card beside it.

### User Story 1 - See who voted for what (Priority: P1)

A participant of a non-anonymous private poll maximizes its card.
In the right column, below the Notes panel (or at the top when the poll has no notes), a **Who voted** panel lists every voter with the choice or choices they currently hold and the date of their vote, sorted by voter name.

**Why this priority**: it is the promise the poll's setting already makes to its voters, and the core of the feature.

**Independent Test**: create a private poll with the switch on, have three accounts vote, maximize the card as one of them, and check that the panel lists all three names with their choices and dates, A→Z by name.

**Acceptance Scenarios**:

1. **Given** a private, non-anonymous, open poll with votes, **When** a participant maximizes its card, **Then** a panel headed `Who voted` appears in the right column, below the Notes panel when the poll has notes, otherwise at the top, and above the line graph.
2. **Given** that panel, **When** it first appears, **Then** `Sort by Voter` is selected and the table has the columns Voter, Choice, Date, one group per voter, groups ordered A→Z by voter name.
3. **Given** a single-choice poll, **When** the table is shown, **Then** each voter's group is one line: name, choice, date.
4. **Given** a multiple-choice poll where a voter holds three choices, **When** the table is shown, **Then** that voter's group has three lines, the name only on the first, the choices in the order of the card's bars, and the vote's date on every line.
5. **Given** a public poll, or a private poll whose votes are anonymous, **When** it is maximized, **Then** no Who voted panel appears and no voter name reaches the viewer's browser.
6. **Given** a poll the viewer may not see the results of, **When** the viewer asks for its voters, **Then** the answer is "not found", the same as for a poll that does not exist.

---

### User Story 2 - Sort by choice (Priority: P2)

The participant wants to see who backed each option.
They select `Sort by Choice`, and the table regroups: one group per choice, in the order of the card's bars, each listing its voters A→Z with their vote dates.

**Why this priority**: the second view the requirements ask for; it depends on Story 1's panel.

**Independent Test**: on the poll from Story 1, select Sort by Choice and check the columns, group order, voter order and that a choice nobody picked is absent.

**Acceptance Scenarios**:

1. **Given** the panel, **When** the viewer selects `Sort by Choice`, **Then** the columns become Choice, Voter, Date, one group per choice with at least one voter, groups in the order of the card's bars (highest percentage first, ties in the creator's order), voters A→Z inside each group, the choice named only on the group's first line.
2. **Given** a choice nobody holds, **When** Sort by Choice is shown, **Then** that choice has no group.
3. **Given** the viewer selected Sort by Choice, **When** the report refreshes, **Then** Sort by Choice stays selected.
4. **Given** the viewer closes the maximized view and opens it again, **When** the panel appears, **Then** Sort by Voter is selected again.

---

### User Story 3 - The report follows the bars (Priority: P2)

While the participant watches the maximized poll, other people vote or change their votes.
When the card's bars change, the report changes with them: new voters appear, changed votes show their new choices and date, and previous votes are never shown.

**Why this priority**: a report that disagrees with the bars beside it would mislead; it builds on Story 1.

**Independent Test**: keep the maximized view open with Live Results on, cast and then change a vote from another account, and check that after the bars move the report lists the new vote, then the changed one, with no trace of the first.

**Acceptance Scenarios**:

1. **Given** the panel is shown, **When** the card's vote counts change, **Then** the report is fetched again and redrawn in the selected order.
2. **Given** a new vote has moved the bars but is not yet reflected in the voter list, **When** the live counts include a vote not yet in the report, **Then** the report is fetched once more about 2 seconds later, and otherwise waits for the next change of the bars.
3. **Given** a poll that lets voters change their votes, **When** a voter changes theirs, **Then** the report shows only their current choices and the new date.
4. **Given** a reply to an earlier fetch arrives after a newer one, or after the view closed, **When** it arrives, **Then** it is ignored.
5. **Given** a choice overtakes another in the bars, **When** the report refreshes in Sort by Choice, **Then** the groups take the new bar order.

---

### User Story 4 - Readable on every screen and to every reader (Priority: P3)

The panel looks like the Notes panel and the rest of the site in Material 3, in light and dark schemes, on wide screens and phones, and reads correctly with a screen reader.

**Why this priority**: polish and accessibility of the panel delivered by Stories 1–3.

**Independent Test**: view the panel in both colour schemes, at phone width, and with a screen reader, and check banding, placement and announced headers.

**Acceptance Scenarios**:

1. **Given** the table, **When** it is shown, **Then** the backgrounds alternate per group (all lines of one group share one background), legibly in both light and dark schemes.
2. **Given** a screen reader on any line of a group, **When** the line is read, **Then** the group's voter (or choice) is announced with it, though it is printed only on the first line.
3. **Given** a phone or single-column layout, **When** the poll is maximized, **Then** the order below the card is Notes, Who voted, line graph.
4. **Given** a table taller than the screen, **When** it is shown, **Then** the panel grows to fit the whole table and the page scrolls; the panel has no scroll area of its own.
5. **Given** the sort control, **When** it is used by keyboard or touch, **Then** it behaves as one single-select segmented control, the selected segment marked and announced as pressed.

---

### Edge Cases

- **No votes yet**: the panel shows its heading and `No votes yet.`, without the sort control.
- **Poll states**: the panel appears while the card shows results — open, closed, and under edit (judged by the state voters see, with the choices as they were before the edit); it never appears for a poll that is not yet open or otherwise shows no results.
- **Poll stops qualifying while maximized** (e.g. the viewer loses access): the next refresh hides and empties the panel.
- **Choice removed by an edit**: votes for it are not listed under it; a vote whose every choice is gone is not listed.
- **Invited but not voted**: not listed.
- **Deleted account**: its vote is listed under the name `Deleted user`, one group per such vote.
- **Same name twice**: two voters named alike are two separate groups; nothing else identifies them.
- **Renamed profile**: the name shown is the one recorded with the vote; a rename shows once that voter votes again.
- **Banned voter**: listed exactly when the bars still count that vote.
- **Largest poll**: a private poll has at most `ENV_MAX_PRIVATE_POLL_VOTERS` voters (100 by default), so the table is never paged.
- **Time zones**: a vote cast near midnight shows the day in the viewer's own time zone.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Maximize Poll view MUST show a **Who voted** panel for a poll that is private and whose votes are not anonymous, and MUST NOT show it for any other poll.
- **FR-002**: The panel MUST be visible to everyone who may see the poll's results (its creator, its invitees, the people who reached it by its link or voted) and to administrators; anyone else asking for the report MUST get the same "not found" answer as for a missing poll.
- **FR-003**: Voter names MUST reach a browser only in the per-viewer report answer, never in the shared, cacheable card or tab data, and that answer MUST NOT be stored by browsers or caches.
- **FR-004**: The report MUST identify a voter by the name recorded with their vote only; no part of an email address may reach the browser.
- **FR-005**: The report MUST list exactly the votes the bars count: each voter's current vote, its choices limited to those still on the poll as voters see it, without previous votes and without invited people who have not voted.
- **FR-006**: The panel MUST sit in the right column of the Maximize Poll view, after the Notes panel when there is one (otherwise first) and before the line graph, in that same order in the single-column layout.
- **FR-007**: The panel MUST have the visible heading `Who voted`, then one single-select segmented control with the segments `Sort by Voter` and `Sort by Choice`, then the table.
- **FR-008**: Sort by Voter MUST be selected when the panel first appears; the selection MUST last while the poll stays maximized, survive refreshes, reset when the view closes, and MUST NOT be stored in the browser.
- **FR-009**: Sort by Voter MUST show the columns Voter, Choice, Date; one group per voter, groups A→Z by name; inside a group, the voter's choices in the card's bar order.
- **FR-010**: Sort by Choice MUST show the columns Choice, Voter, Date; one group per choice that has at least one voter, groups in the card's bar order; inside a group, voters A→Z by name.
- **FR-011**: The card's bar order MUST be: highest percentage first, ties in the order the creator gave the choices.
- **FR-012**: Each group's name (voter or choice) MUST be printed on its first line only, yet associated with every line of the group for assistive technology.
- **FR-013**: Backgrounds MUST alternate per group, using the site's Material 3 surface colours, legible in light and dark schemes.
- **FR-014**: The Date on each line MUST be the date of that voter's current vote, the day in the viewer's time zone written in the viewer's locale (e.g. `Jun 10, 2024`); hovering it MUST show the full date and time.
- **FR-015**: With no votes, the panel MUST show its heading and `No votes yet.` and no sort control.
- **FR-016**: The panel MUST appear while the card shows results (open, closed, under edit as voters see it) and be hidden and emptied when the view closes or a refresh finds the poll no longer qualifies.
- **FR-017**: The report MUST be fetched when the poll is maximized and again each time the card's vote counts change; when the live counts include a vote not yet in the report, it MUST be fetched once more after about 2 seconds; a reply older than the latest request, or arriving after the view closed, MUST be ignored. No new timer or setting is added.
- **FR-018**: The report request MUST be limited like Live Results refreshes and pass the Terms acceptance gate like other signed-in requests.
- **FR-019**: The panel MUST grow to fit the whole table, with no scroll area of its own, and match the look of the Notes panel.
- **FR-020**: The project documentation MUST describe the new behaviour: the README's Anonymous Votes row (which today says ordinary voters never see who voted), the stale code comment saying only administrators see names, and the API description.

### Key Entities

- **Voter report entry**: one per current vote counted by the bars — the voter's recorded name, the choices they hold (by choice identity), and when the vote was cast.
- **Poll (existing)**: its visibility (public/private), its anonymity setting, its state, its choices in the creator's order with their current counts and percentages.
- **Viewer (existing)**: a signed-in account whose right to see the poll's results decides whether the report is shown.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every non-anonymous private poll, a participant who maximizes it sees every counted voter with their choices; the number of voters listed equals the card's voter count once votes have settled.
- **SC-002**: After another person's vote moves the bars, the report shows that vote within 5 seconds in normal operation.
- **SC-003**: On public and anonymous polls, and for viewers without access, no voter name is ever present in anything the browser receives (verified by inspecting every response the page loads).
- **SC-004**: Switching between the two sort orders redraws the table without a new request, in under half a second for the largest poll (100 voters).
- **SC-005**: A screen reader announces each line's voter (or choice) with it, though it is printed only on the group's first line, and the panel uses only the site's Material 3 colour tokens, so it stays legible in light and dark schemes.

## Assumptions

- The panel belongs to the Maximize Poll view of the site's tabs; the admin card and the admin results page keep their own voter lists unchanged.
- Guests never see a private poll, so only signed-in viewers can see the panel.
- The privacy policy already covers showing who voted to people taking part ("to show who voted on polls you take part in"), so the Terms and Privacy versions do not change.
- Voters on non-anonymous polls created before this release were told their votes were not anonymous; they now see one another's names as promised.
- No data migration, setting or dependency is needed.
