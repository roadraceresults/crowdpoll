# Feature Specification: Poll Edit Card

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "using 014-high-level-requirements-poll-edit-card.md"

**Source requirements**: `designDocs/014-high-level-requirements-poll-edit-card.md` (462 lines)
**Architecture**: `architecture/014-poll-edit-card/architecture.md` — 24 findings raised and resolved

## Clarifications

### Session 2026-09-10

- Q: What accessibility standard applies to the new card interface? → A: Parity plus extension — every control keyboard-operable and labelled, focus moved sensibly on mode change, expand/collapse and pager states conveyed, matching the standard the existing actions menu already sets. No formal WCAG conformance target is claimed.
- Q: How many polls must the administration page handle? → A: A working ceiling of about 100 polls. Every poll is rendered; the ceiling is a recorded assumption to revisit, not an enforced limit, so no paging or lazy rendering of cards is in scope.
- Q: What does a card show while waiting for a round trip? → A: Only where the action can be refused. The mode control shows it is working and cannot be activated twice while the claim on the poll is in flight; page load and section expansion need no special treatment beyond appearing when ready.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administer every poll from one page (Priority: P1)

An administrator opens the poll administration page and sees each poll as a card, one per row, showing
that poll's complete configuration — its title and subtitle, its choices, its schedule, its choice mode,
vote mutability and visibility, its state, and how many people have voted, been invited and been banned.
From the same card they can open, close or archive the poll, duplicate it, copy its link, view its
results, or delete it, with each control available only where it applies.

Today this information is spread across a wide table and a separate editing page, and several of these
settings cannot be seen at all without opening a poll for editing — which locks it against everyone else.

**Why this priority**: It replaces the table, which is the structural change the rest of the feature is
built on, and it delivers value on its own: an administrator can read and act on every poll without
opening anything for editing, so no poll is locked merely to be looked at.

**Independent Test**: Load the administration page with several polls in different states. Every poll's
full configuration is legible without further interaction, and every action available on the old table
still works from the card.

**Acceptance Scenarios**:

1. **Given** polls exist in a range of states, **When** an administrator opens the administration page,
   **Then** each poll appears as one card in a single column, newest first, showing its full
   configuration as read-only text.
2. **Given** a poll that is closed, **When** the administrator views its card, **Then** the archive
   control is available and the open and close controls are not, matching the rules that governed the
   old table.
3. **Given** a poll with votes, invitations and bans, **When** the administrator views its card, **Then**
   the number who have voted, the number invited and the number banned are each shown.
4. **Given** a browser window of any width, **When** the administration page is displayed, **Then** the
   cards fit the window without the page scrolling sideways.

---

### User Story 2 - Edit a poll without leaving the page (Priority: P2)

An administrator clicks the pen icon on a poll's card. The card turns into an editing surface in place:
the title, subtitle, choices, schedule and voter limit become editable, the mechanics settings become
selectable where the poll's history allows, and a save control and a cancel control appear. The
administrator makes their changes and saves, or cancels, and the card returns to its read-only form. At
no point do they leave the administration page.

**Why this priority**: This is the feature's central purpose — editing in place rather than on a separate
page. It depends on the card from User Story 1.

**Independent Test**: Open a poll for editing from its card, change its title and its choices, save, and
confirm the change took effect and the page never navigated.

**Acceptance Scenarios**:

1. **Given** a card in read-only form, **When** the administrator clicks the pen icon, **Then** the card
   becomes editable in place and the page does not navigate.
2. **Given** a card being edited, **When** the administrator clicks the pen icon on another card,
   **Then** nothing happens, because only one card per open page may be edited at a time.
3. **Given** a poll already being edited in another browser tab or by another administrator, **When** an
   administrator clicks its pen icon, **Then** the card stays read-only and states why.
4. **Given** a card with unsaved changes, **When** the administrator cancels or attempts to leave the
   page, **Then** they are warned before the changes are discarded.
5. **Given** a card being edited, **When** the administrator saves and publishes, **Then** the card
   returns to read-only form showing the poll's new state.
6. **Given** a poll that still holds its starter choices, **When** the administrator saves and publishes,
   **Then** the edits are saved, the poll is not published, the card returns to read-only form, and the
   reason is shown on the card.
7. **Given** a card being edited, **When** the poll list refreshes in the background, **Then** the
   administrator's unsaved work is untouched.
8. **Given** a card being edited, **When** its claim on the poll is taken over or expires, **Then**
   the card returns to read-only form and says the poll is no longer being edited by this tab.

---

### User Story 3 - Manage participants and banned voters in the card (Priority: P3)

While editing a poll, an administrator expands a participants section to see who has voted, or who has
been invited on an invitation-only poll, and a banned voter section to see who has been barred. Each list
is browsed a page at a time. From the participants list they can ban someone; from the banned list they
can lift a ban; on an invitation-only poll they can invite a new address. None of it takes effect until
they save.

**Why this priority**: Moderation is the reason the editing surface exists for a poll that already has
votes. It depends on User Story 2.

**Independent Test**: Open an invitation-only poll with more participants than fit one page, expand the
invitations section, page through it, ban a participant, cancel, and confirm the ban was discarded.

**Acceptance Scenarios**:

1. **Given** a card being edited, **When** it is first displayed, **Then** both sections are collapsed.
2. **Given** an invitation-only poll, **When** the participants section is expanded, **Then** it is
   labelled "Invitations" and lists the invited addresses, marking those who have voted.
3. **Given** any other poll, **When** the participants section is expanded, **Then** it is labelled
   "Participants" and lists those who have voted.
4. **Given** a list longer than one page, **When** the administrator enters a page number beyond the
   last page, **Then** the last page is shown and the page number displayed is corrected to match.
5. **Given** an empty list, **When** the section is expanded, **Then** a message says the list is empty
   and no page controls are shown.
6. **Given** a poll with more participants than the configured maximum, **When** the section is expanded,
   **Then** a message reports the true number and explains that the list is too large to display.
7. **Given** an administrator has banned a participant, **When** they cancel instead of saving, **Then**
   the ban is discarded and the participant is unaffected.

---

### User Story 4 - Create a poll into an editable card (Priority: P4)

An administrator clicks the create control. A new poll appears as a card at the top of the page, already
open for editing, ready to be filled in — rather than the page navigating to a blank form.

**Why this priority**: It removes the last navigation away from the administration page. Small, and
depends on User Story 2.

**Independent Test**: Create a poll, confirm a card appears at the top already in editing form, fill it
in and publish it without the page navigating.

**Acceptance Scenarios**:

1. **Given** no card is being edited, **When** the administrator creates a poll, **Then** a new card
   appears at the top of the page, already in editing form and scrolled into view.
2. **Given** a card is already being edited, **When** the administrator looks at the create control,
   **Then** it is unavailable until that card is saved or cancelled.
3. **Given** a newly created poll, **When** the administrator cancels without editing it, **Then** an
   unstarted poll remains in the list and can be deleted.

---

### User Story 5 - Read a poll's settings in plain language (Priority: P5)

The choice mode, vote mutability and visibility of a poll read as ordinary phrases — "Single-Choice
Poll", "Final-Vote Poll", "Private Poll - Invitation Only - Show Who Voted" — and read the same way
everywhere they appear, whether the setting is editable or fixed, and whether an administrator or a voter
is looking at it.

**Why this priority**: A readability improvement that is independent of the card work and could ship
before or after it. It carries the widest mechanical reach of any story in this feature.

**Independent Test**: Display a poll whose settings are fixed and one whose settings are editable, as an
administrator and as a voter, and confirm every occurrence of each setting reads identically.

**Acceptance Scenarios**:

1. **Given** a poll whose settings may still be changed, **When** an administrator views them, **Then**
   each option reads as its full friendly phrase.
2. **Given** a poll whose settings are frozen because it has votes, **When** an administrator views them,
   **Then** they read exactly as they do when editable — the same words, not an abbreviation.
3. **Given** a single-choice poll, **When** a voter selects a second choice, **Then** the first is
   deselected, as before the change.

### Edge Cases

- An administrator opens a card for editing by mistake and has changed nothing: the cancel control is
  still available, so the poll does not stay locked.
- A browser tab is closed while a card is being edited: nothing can be released from the page, so the
  poll becomes editable again once its editing session goes stale.
- A rejected poll is opened for editing and the session is refused: the card shows both the rejection
  reason and the refusal, neither hiding the other.
- A page of a list is being viewed when the list changes: the page number shown always matches the rows
  displayed.
- A poll's participant list is exactly at the configured maximum: it is displayed; one more than the
  maximum is not.
- The configured page size is unavailable when the page first loads: the documented default is used.
- A poll is published while another administrator has its card open in read-only form: their next
  background refresh shows the new state.
- A control is reached by keyboard from outside its card: its name identifies which poll it acts on, so
  the administrator is not acting on an unidentified poll.
- An administrator activates the pen control twice in quick succession: only one request is made, and
  only one card enters editing form.

## Requirements *(mandatory)*

### Functional Requirements

#### The card list

- **FR-001**: The administration page MUST present each poll as a card, one per row, in a single vertical
  column, and MUST NOT present polls as a table.
- **FR-002**: Cards MUST occupy the same responsive width the table occupied, take their height from
  their content, and MUST NOT cause the page to scroll horizontally at any window width.
- **FR-003**: The set of polls shown and their order MUST be unchanged from the current behaviour: every
  poll, newest first, with no filter and no paging of the card list itself.
- **FR-004**: Poll settings MUST be both displayed and edited on the card. The separate editing pages
  MUST be removed, and their addresses MUST NOT resolve.
- **FR-005**: The separate results page MUST continue to work unchanged in every respect except
  one: its participant lists are served by the same request as the card's rosters and are therefore
  subject to the same ceiling (FR-034). A poll over the ceiling shows its aggregate results with an
  empty participant list. This is a known consequence rather than an oversight — the source
  requirements record that the results page will be enhanced to handle lists of any size in a later
  feature. Its totals and choice aggregates MUST remain correct even when its list is withheld.
- **FR-006**: The back control MUST return the administrator to the public polls page.

#### Read-only cards

- **FR-007**: Every card MUST be in read-only form when the page loads.
- **FR-008**: A read-only card MUST display the poll's title, subtitle, choices, start, end and voter
  count limit as read-only values; its choice mode, vote mutability and visibility as text; and its
  state, rejection reason and creation time.
- **FR-009**: A read-only card MUST display the number of people who have voted, the number invited and
  the number banned.
- **FR-010**: The number who have voted MUST count only participants who have actually cast a vote, and
  MUST match the number the poll's voter limit is enforced against.
- **FR-011**: A read-only card MUST offer the open, close and archive controls, and the poll actions,
  each available only where the existing rules allow.
- **FR-012**: The three counts MUST be refreshed by the page's existing periodic refresh. The system MUST
  NOT provide a separate manual refresh control for them.

#### Editing a card

- **FR-013**: An administrator MUST be able to put a card into editing form using its pen control, where
  the existing rules allow that poll to be edited.
- **FR-013a**: Because the request for a card to enter editing form can be refused, the pen control MUST
  show that it is working while that request is outstanding, and MUST NOT be able to be activated a
  second time until the request is answered. The card MUST NOT change form until the request succeeds.
- **FR-014**: At most one card per open administration page MUST be in editing form at a time; while one
  is, every other card's pen control MUST be unavailable.
- **FR-015**: A poll already being edited elsewhere MUST NOT be editable, and the refusal MUST be shown
  on that poll's card.
- **FR-016**: A card in editing form MUST make the title, subtitle, choices, schedule and voter count
  limit editable, and MUST present the mechanics settings as selectable or fixed according to the
  existing rules.
- **FR-017**: A card in editing form MUST hide the poll actions, the open, close and archive controls,
  the state and rejection reason, and the three counts.
- **FR-018**: A card in editing form MUST offer a save-and-publish control, available only when there are
  changes to save and they are valid, and a cancel control that MUST always be available.
- **FR-019**: Saving MUST return the card to read-only form in every outcome, including when the poll is
  held back because it still holds its starter values, in which case the reason MUST be shown on the card.
- **FR-020**: Cancelling MUST discard every unsaved change and return the card to read-only form without
  leaving the page.
- **FR-021**: The administrator MUST be warned before unsaved changes are discarded, whether by
  cancelling or by leaving the page.
- **FR-022**: A card in read-only form MUST NOT hold an editing session. Every way an administrator can
  leave editing form MUST release it.
- **FR-023**: If an editing session is lost, the card MUST return to read-only form and MUST say so.
- **FR-024**: A background refresh MUST NOT alter, re-render or discard a card that is being edited.
- **FR-025**: A card MUST show current information when it returns to read-only form, including counts
  affected by the save that just completed.

#### Participants and banned voters

- **FR-026**: A card in editing form MUST offer a participants section and a banned voter section, both
  collapsed initially, each expandable and collapsible.
- **FR-027**: The participants section MUST be labelled "Invitations" on an invitation-only poll and
  "Participants" otherwise, and MUST list the invited addresses or the voters accordingly.
- **FR-028**: Rows MUST show the email address first, then the display name where known, then a status
  for each state that applies, ordered by email address.
- **FR-029**: An administrator MUST be able to ban a participant, lift a ban, and — on an invitation-only
  poll — invite an address. Each MUST take effect only when the poll is saved, and MUST be discarded by
  cancelling.
- **FR-030**: Each list MUST be browsed a page at a time, at a configurable number of rows per page,
  without a scroll bar inside the list, and the list MUST NOT change height between pages.
- **FR-031**: Each list MUST show which rows are being viewed, how many there are in total, which page of
  how many is shown, and controls to move between pages and to jump to a page.
- **FR-032**: A page number entered by the administrator MUST be corrected to a valid page, and the
  number displayed MUST always match the rows shown.
- **FR-033**: An empty list MUST show a message saying so, with no page controls.
- **FR-034**: A list larger than the configured maximum MUST NOT be displayed. A message MUST report the
  true number of entries and say the list is too large to display, and the counts on the card MUST remain
  accurate.
- **FR-035**: A complete export of a poll's data MUST NOT be subject to that maximum.

#### Creating a poll

- **FR-036**: Creating a poll MUST place a new card at the top of the list, already in editing form and
  in view, without navigating away.
- **FR-037**: The create control MUST be unavailable while a card is being edited.

#### Setting names

- **FR-038**: The choice mode, vote mutability and visibility settings MUST be presented as readable
  phrases rather than upper-case identifiers.
- **FR-039**: Each setting MUST read identically everywhere it appears — editable or fixed, to an
  administrator or to a voter.
- **FR-040**: Changing these settings' stored form MUST NOT change how a poll behaves for voters. In
  particular, a single-choice poll MUST continue to allow only one selection.
- **FR-041**: Existing poll data MUST be discarded rather than converted. User accounts, sessions and
  profiles MUST be preserved.

#### Messages

- **FR-042**: A message about a poll MUST be shown on that poll's card, never by navigating or reloading.
- **FR-043**: A transient message MUST NOT hide the poll's standing state information, and vice versa.

#### Configuration

- **FR-044**: The number of rows per page MUST be configurable by the operator, MUST default to 10, and
  MUST be available to the administration page at run time.
- **FR-044a**: The maximum roster size referred to in FR-034 and FR-035 MUST be the same configurable
  ceiling that already limits how many voters a private poll may have, and MUST default to 500. Reusing
  it keeps a private poll's roster below the display limit by construction, so only public polls can
  reach it.

#### Accessibility

- **FR-045**: Every control on a card MUST be operable using the keyboard alone, including the mode
  control, the poll actions, the state controls, the expand and collapse controls, the page controls and
  every per-row action.
- **FR-046**: Every control MUST carry a name that identifies both what it does and which poll it acts
  on, so that a control encountered out of visual context is unambiguous.
- **FR-047**: When a card changes between read-only and editing form, keyboard focus MUST move to a
  predictable place within that card rather than being lost to the top of the page.
- **FR-048**: A section's expanded or collapsed state, and the current and total page counts, MUST be
  conveyed to assistive technology and not by visual styling alone.
- **FR-049**: A message shown on a card MUST be associated with that card and announced when it appears,
  so that a refusal is not silent to a user who cannot see it.
- **FR-050**: These requirements restate the standard the existing poll actions menu already meets. This
  feature MUST NOT regress it. No formal conformance level is claimed for the administration page.

### Key Entities

- **Poll card**: The single representation of one poll on the administration page. Has a read-only form
  and an editing form; only one card per open page may be in editing form.
- **Editing session**: The exclusive claim one browser tab holds on one poll while its card is being
  edited. Held by exactly the card in editing form, released on every exit, and reclaimed automatically
  if the holder disappears.
- **Participant roster**: Who may vote in a poll and who has. Shown as the invited list on an
  invitation-only poll and as the voter list otherwise.
- **Banned voter list**: Addresses barred from a poll. Banning removes any invitation and any vote;
  lifting a ban restores neither.
- **Poll settings**: The choice mode, vote mutability and visibility of a poll — stored in the same words
  they are displayed in, with no separate presentation form.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can change a poll's title, subtitle, choices, schedule and voter limit and
  publish it with zero page navigations.
- **SC-002**: Every poll's complete configuration is legible on the administration page without any
  per-poll interaction, so no poll needs to be locked in order to be read.
- **SC-003**: Two administrators can edit two different polls at the same time; neither can edit the same
  poll at the same time; and a poll being edited is identifiable as such by everyone else.
- **SC-004**: An administrator who opens a card by mistake can release it in one action, and the poll is
  immediately available to others.
- **SC-005**: An open editing session survives every background refresh that occurs while it is
  open, with no loss of unsaved work, for as long as it remains open.
- **SC-006**: A roster at the configured maximum can be browsed end to end a page at a time, with the
  card's height unchanged throughout.
- **SC-007**: A poll whose roster exceeds the configured maximum still reports its true participant,
  invitation and banned counts.
- **SC-008**: Each poll setting reads identically in every place it appears — 100% agreement between the
  administration page and the voter's view.
- **SC-009**: Every refused administrative action reports its reason on the affected poll's card.
- **SC-010**: No administrative task requires an address other than the administration page and the
  existing results page.
- **SC-011**: Every task described in User Stories 1 to 4 can be completed using the keyboard alone,
  without a pointing device.
- **SC-012**: With 100 polls present, the administration page becomes usable within 3 seconds on a
  typical broadband connection, every poll is reachable by scrolling, and no poll requires a separate
  action before its configuration can be read.

## Assumptions

- The card's width, the set of polls shown and their ordering follow the existing behaviour; no
  responsive redesign is in scope.
- The administration page is used by a small number of administrators managing on the order of 100
  polls. Every poll is rendered as a card; paging or lazy rendering of the card list is not in scope.
  This is a working assumption to revisit if the poll count grows materially, not a limit the system
  enforces — unlike the roster size limit, which is enforced and specified in FR-034.
- Enabling and disabling of every control follows the existing rules, which are unchanged by this
  feature except where a requirement above says otherwise.
- Poll state transitions remain available without opening a poll for editing, as they are today.
- A poll is created and stored before it is filled in; an abandoned new poll remains in the list until
  deleted, and cannot be published while it still holds its starter values.
- Voting, results, screening and the scheduling sweeps are unchanged.
- The administration page remains restricted to the configured administrators.
- Existing poll data is disposable in every environment this feature reaches. Accounts are not.
- The administration page and its roster sections are fast enough that displaying content when it
  arrives is sufficient; only the request to begin editing, which can be refused, needs to show that it
  is working.
- The two documentation deliverables required by the project constitution are produced after
  implementation, not as part of it.
