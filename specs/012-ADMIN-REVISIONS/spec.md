# Feature Specification: Admin Revisions

**Feature Branch**: `012-ADMIN-REVISIONS`

**Created**: 2026-09-03

**Status**: Draft

**Input**: User description: "using ./designDocs/012-high-level-requirements-ADMIN-REVISIONS.md"

## Clarifications

### Session 2026-09-03

- Q: When a poll is both closed and being edited, which message does its card show? → A: The editing message wins — while a poll is being edited the "Try Again" message is shown regardless of the underlying state, and the closed message returns once editing ends.
- Q: When a poll's visibility moves away from an invitation-only value, are the invited and banned lists retained or cleared? → A: Both are retained. They persist unused and become effective again if the poll returns to an invitation-only value; bans continue to apply in every visibility.
- Q: Does the update page (used once a poll has votes) show the participant list with its ban and un-ban actions? → A: Yes — the update page carries the full participant section, including the "add invited participant" row when the poll's frozen visibility is invitation-only, so late invitations remain possible.
- Q: Should the private-poll voter ceiling be configurable? → A: Yes — `ENV_PRIVATE_VOTER_LIMIT_DEFAULT`, default 500, set to 10 in the dev launchers so a test poll fills in a handful of votes. One setting governs both the maximum and the blank default, and the editing page reads it from `/api/config` rather than assuming 500.
- Q: The fixed login rate limit made manual testing painful — two login links and you are locked out for 15 minutes. Should it be configurable? → A: Yes, as two variables: `ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW` (default 15) and `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW` (default 2). The window is set in minutes rather than the seconds the limiter takes; the single conversion lives in `emailRateLimit()`.
- Q: Is it a requirement that the voter count limit cannot change after a poll has received a vote? → A: No — it was frozen only by omission from 011 FR-009's update-surface whitelist, never by a stated rule. It is now editable in both modes: unlike the three fields FR-004 freezes, it changes capacity rather than the meaning of any vote already cast, and a poll filling up is exactly when raising it matters.
- Q: Emptying the voter count limit field and saving reported "voterCountLimit must be a whole number between 1 and 500". Should a blank field be an error? → A: No — blank means cleared. A number input yields "" when emptied and `Number("")` is 0, which failed the range check. Blank in any form is now treated as cleared, on the client and again on the server.
- Q: Adding a participant, banning and un-banning saved instantly — Save and Publish stayed disabled and Cancel could not undo them. Should they be deferred like every other field? → A: Yes. They now mark the page dirty and are written only on Save and Publish, so Cancel discards them. This is the same fix R1 applied to the choice list; the three per-action routes are removed for the same reason the choices route was.
- Q: A banned user was shown an enabled Vote button on a public poll, then an enabled Submit button, and clicking it did nothing at all. What should they see? → A: The poll stays visible and its results readable, but both voting controls are withdrawn and the reason is shown. Separately, no refused vote may ever be silent — the reason is always displayed.
- Q: An invited participant, signed in, could not find the poll they were invited to. Should invitation-only polls appear on that user's home page? → A: Yes — they join the home grid for the invited user specifically, rather than adding a second surface. This supersedes 004 FR-033, which forbade the home grid but promised "a post-login suggestion to an invited user" that was never built, leaving invitees with no discovery path at all.
- Q: When a ban is lifted on someone who had been an invited participant, is their invitation restored? → A: No. Lifting a ban only removes the address from the banned list; the invitation and the person's earlier vote are not restored, and the administrator re-invites separately if they wish.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ban a voter and invite a participant without being blocked (Priority: P1)

An administrator opens a poll's editing page to manage who may vote. They add an invited
address, or they remove and ban an existing participant. Both actions currently fail — inviting
shows "The poll is currently being edited. Please try again shortly.", and banning appears to do
nothing at all — because opening the editing page is itself what makes the poll "currently being
edited". The administrator must be able to perform both actions from the page they opened, while
a second administrator working from a stale copy of the same page is still refused.

**Why this priority**: These are live defects that make two advertised features unusable. There is
no workaround: the only page that offers the actions is the page that blocks them.

**Independent Test**: Open a poll's editing page, add an invited address, and ban a participant.
Both succeed and the lists update, with no other part of the feature implemented.

**Acceptance Scenarios**:

1. **Given** an administrator has an invitation-only poll's editing page open, **When** they add a
   valid email address as a participant, **Then** the address appears in the participant list and
   no "currently being edited" message is shown.
2. **Given** an administrator has a public poll's editing page open and a person has voted,
   **When** they choose to ban that person, **Then** the address disappears from the participant
   list, appears in the banned list, and their vote is removed.
3. **Given** an administrator has a poll's editing page open, **When** a ban cannot be applied for
   any reason, **Then** an error message is displayed in a place that is visible for every poll
   visibility, not only for invitation-only polls.
4. **Given** two browser tabs have opened the same poll for editing and only the second holds the
   edit session, **When** the first (stale) tab attempts to ban a participant, **Then** the action
   is refused with an explanatory message and the poll is unchanged.
5. **Given** a poll is awaiting acceptability screening or is archived, **When** an administrator
   attempts any participant change, **Then** the action is refused with a message naming that
   reason.
6. **Given** a poll that has already received votes, **When** an administrator bans one of the
   voters, **Then** the ban succeeds — having votes does not block participant moderation.
7. **Given** a poll that has already received votes and so opens on the update page, **When** an
   administrator views that page, **Then** the participant list, the banned list and the ban and
   un-ban actions are all present and usable.
8. **Given** an invitation-only poll that has already received votes, **When** an administrator
   views its update page, **Then** the control for adding a further invited participant is present
   and a newly added address can subsequently vote.
9. **Given** an invited participant who has been banned, **When** the administrator lifts the ban,
   **Then** the address leaves the banned list but does not reappear in the invited list, and the
   person's earlier vote is not restored.

---

### User Story 2 - Choose poll visibility as one setting instead of two conflicting ones (Priority: P1)

An administrator setting up a poll currently picks an access mode and, separately, a results
visibility. One combination of the two is impossible, and rather than being told, they watch the
system silently change the setting they did not just touch. The administrator must instead choose
a single visibility value from a list in which every option is valid, and see their choice stay
where they put it.

**Why this priority**: This removes a whole class of confusing behaviour, and every other part of
the feature reads the new setting. Doing it first means nothing is built twice.

**Independent Test**: Create a poll, choose each of the five visibility values in turn, save, and
reopen. Each value is stored and re-displayed exactly as chosen, with nothing silently rewritten.

**Acceptance Scenarios**:

1. **Given** an administrator is editing a poll that has no votes, **When** they view the poll's
   settings, **Then** poll visibility, choice mode and vote mutability are each presented as a
   single-select group in which every option is visible without opening a menu, and one click
   changes the selection.
2. **Given** an administrator selects any of the five visibility values, **When** they save the
   poll and reopen it, **Then** the value shown is the value they chose and no other setting has
   been changed on their behalf.
3. **Given** a poll has received at least one vote, **When** an administrator opens it for update,
   **Then** poll visibility, choice mode and vote mutability are shown as read-only labels rather
   than as selectable groups.
4. **Given** a poll's visibility is set to the public value, **When** the administrator views the
   voter count limit, **Then** the limit field is disabled, visibly greyed out, and holds no
   value.
5. **Given** a poll with a stored voter count limit, **When** the administrator changes its
   visibility to the public value, **Then** the stored limit is cleared rather than kept for a
   later switch back.
6. **Given** a poll's visibility is changed from the public value to any private value, **When**
   the administrator views the voter count limit, **Then** the field is enabled and empty — it is
   not pre-filled.
7. **Given** a poll with a private visibility and an empty voter count limit, **When** voters cast
   votes, **Then** the 500th voter is accepted and the 501st is refused.
8. **Given** an administrator types a voter count limit, **When** the value is not a whole number
   between 1 and 500 inclusive, **Then** it is rejected both as they type and again when the poll
   is saved.

---

### User Story 3 - Open, close or archive a poll with one click (Priority: P2)

An administrator scanning the poll list wants to start a poll early, end one that has run long
enough, or archive one that is finished. Today this means opening a menu and, for scheduling
changes, opening the poll itself and editing dates. They should be able to do it from the list
row, with buttons that are only offered when the action is actually available — and the change
must stick rather than being undone moments later by the scheduler.

**Why this priority**: A substantial reduction in clicks for the most frequent administrative
actions, and it corrects an existing data problem where archiving overwrites a poll's real
closing date.

**Independent Test**: From the poll list, open a poll that is waiting to open, close a poll that
is open, and archive a poll that is closed. Wait past one scheduling cycle and confirm each poll
is still in the state the administrator selected.

**Acceptance Scenarios**:

1. **Given** the poll list is displayed, **When** an administrator views any row, **Then** Open,
   Close and Archive controls are all present, each enabled only when that transition is
   available for the row's current state and greyed out otherwise.
2. **Given** a poll is waiting to open or is closed, **When** the administrator selects Open,
   **Then** the poll becomes open, its scheduled start is cleared, and its scheduled end is
   cleared only if that end was already in the past.
3. **Given** a poll is waiting to open or is open, **When** the administrator selects Close,
   **Then** the poll becomes closed, its end is set to the current moment, and its start is
   cleared only if that start was in the future.
4. **Given** a poll is closed, **When** the administrator selects Archive, **Then** the poll
   becomes archived and its recorded start and end dates are left exactly as they were.
5. **Given** an administrator has just changed a poll's state from the list, **When** at least one
   scheduling cycle has elapsed, **Then** the poll is still in the state the administrator chose.
6. **Given** two administrators view the same row, **When** both select conflicting state changes
   within one refresh interval, **Then** the second is refused, the refusal is shown on that
   administrator's row, and the next refresh shows the poll's actual state.
7. **Given** a poll in any state, **When** the poll list decides which controls to enable,
   **Then** that decision is supplied by the server rather than derived in the browser.

---

### User Story 4 - Save the whole poll with one button (Priority: P2)

An administrator editing a poll changes the list of choices. Today the choices have their own
save button, and the main save button stays disabled — so it is possible to believe a poll has
been saved when only part of it has. There should be one save action covering everything on the
page, and a cancel action that is available at any time.

**Why this priority**: Removes a real risk of partial saves and an inconsistency where the page's
"unsaved changes" state ignores one of its own fields.

**Independent Test**: Open a poll, change only the choices, and confirm the single save button
becomes available and stores the change. Confirm the separate choices-save control is gone.

**Acceptance Scenarios**:

1. **Given** an administrator opens a poll for editing, **When** they change only the list of
   choices, **Then** the single save-and-publish action becomes enabled.
2. **Given** an administrator has changed both the choices and other poll fields, **When** they
   save, **Then** all changes are stored together, and if any part is rejected then none of it is
   stored.
3. **Given** an administrator is on an editing page, **When** they look for a separate control
   that saves only the choices, **Then** no such control exists.
4. **Given** a poll has already received votes, **When** an administrator saves from the update
   page, **Then** any attempt to change the choices is rejected and the reason is shown.
5. **Given** an administrator has just opened a poll and made no change at all, **When** they view
   the Cancel control, **Then** it is enabled.
6. **Given** an administrator selects Cancel, **When** the page has unsaved changes, **Then** they
   are asked to confirm before the changes are discarded.
7. **Given** an administrator selects Cancel, **When** they leave the page, **Then** the poll is
   released for editing by others immediately rather than after a timeout.

---

### User Story 5 - Read the whole poll list at a glance (Priority: P2)

An administrator opens the poll list to find one poll among many. Today the important facts are
spread across nine columns, a subtitle takes a column of its own, and every action needs a menu.
The list should present each poll as a compact block that can be scanned, with one-click actions
and clear wording where a date is absent.

**Why this priority**: The list is the entry point to every other administrative task. It does not
block anything, but it is where administrators spend their time.

**Independent Test**: Load the poll list with polls in a range of states and confirm the row
layout, the alternating shading, the date wording, and that every action icon works and shows a
tooltip.

**Acceptance Scenarios**:

1. **Given** the poll list is displayed, **When** an administrator views consecutive polls,
   **Then** the background shading alternates once per poll, regardless of how many lines a poll
   occupies.
2. **Given** any poll row, **When** an administrator views the first column, **Then** the title
   appears with an edit icon immediately to its left, and the subtitle appears directly beneath
   the title in italics at a slightly smaller size with minimal spacing.
3. **Given** a poll can be edited or updated, **When** an administrator selects either the edit
   icon or the title, **Then** the appropriate editing page opens; **and** when the poll cannot be
   edited or updated, the icon is disabled and the title is not a link.
4. **Given** a poll is awaiting screening or has been rejected, **When** an administrator views its
   row, **Then** a further line appears below the subtitle, in the title's font and bold, showing
   either the awaiting-approval status with elapsed time or the rejection reason.
5. **Given** a poll has been rejected and its screening attempts are exhausted, **When** an
   administrator views that line, **Then** a control to re-attempt screening is offered; **and**
   when attempts remain, no such control is shown.
6. **Given** an open poll has no scheduled start, **When** an administrator views the start
   column, **Then** it reads `started`; **and** when a poll in any other state has none, it reads
   `not scheduled`; **and** when a poll has no scheduled end, the end column reads
   `does not end`.
7. **Given** any poll row, **When** an administrator views the actions column, **Then** icons for
   duplicating the poll, copying its link, viewing its results and deleting it are all present,
   each with a tooltip describing the action.
8. **Given** a poll is not in a deletable state, **When** an administrator views the delete icon,
   **Then** it is rendered but disabled; **and** when it is deletable and selected, a confirmation
   is required before the poll is destroyed.
9. **Given** any poll row, **When** an administrator opens the menu at the far right, **Then** the
   same actions remain available described in words.

---

### User Story 6 - Keep the home page trustworthy while a poll is being edited (Priority: P3)

A visitor is looking at the poll grid when an administrator begins editing one of the polls. The
visitor must never be able to cast a vote that will not count, and must never lose a selection
they were part-way through making. Separately, the grid should keep itself current — polls that
open or close while the page is open should appear and disappear on their own.

**Why this priority**: The race is genuinely rare, and the grid works today for anyone who
reloads. But when it does bite, the visitor either loses work or believes they voted when they
did not.

**Independent Test**: With the grid open, put a poll into editing and confirm the card shows the
unavailable message on its front face in every interaction path. Then create and close polls and
confirm the grid adds and removes cards without a reload.

**Acceptance Scenarios**:

1. **Given** a visitor has the poll grid open, **When** a poll enters the editing state and the
   grid next refreshes, **Then** that poll's card shows its front face only, with neither a vote
   control nor a live-results control, and the message
   "This poll is momentarily unavailable to cast a vote. Please try again shortly." in their
   place.
2. **Given** a poll has just entered the editing state, **When** a visitor selects the vote
   control before the grid has refreshed, **Then** they are shown that same message and the card
   does not turn over.
3. **Given** a visitor is looking at a card's back face with choices selected, **When** the poll
   enters the editing state and the visitor submits their vote, **Then** they are shown that same
   message, no vote is recorded, and the card turns to its front face.
4. **Given** a visitor is looking at a card's back face and does not submit, **When** the grid next
   refreshes and the poll is being edited, **Then** the card turns to its front face and shows the
   message.
5. **Given** a visitor submits a vote at the same moment the poll enters the editing state,
   **When** the submission is processed, **Then** it is refused, no vote is recorded, and the
   visitor is shown the message on the card's front face.
6. **Given** a visitor had selected choices before the poll was put into editing, **When** the poll
   returns to open and the grid refreshes, **Then** the card offers the vote control again and the
   visitor's earlier selection is still there.
7. **Given** a poll that was publicly visible is being edited, **When** the grid is refreshed,
   **Then** the poll is still listed so its card can carry the message; **and** a poll that was
   never publicly visible remains hidden.
8. **Given** the poll grid is open, **When** a poll becomes publicly visible or stops being so,
   **Then** the corresponding card appears or disappears within one refresh interval without the
   visitor reloading the page.
9. **Given** a card is showing its back face with choices selected, **When** the grid refreshes and
   the poll is unchanged, **Then** the card keeps both its turned-over state and the selection.
10. **Given** an invitation-only poll and a signed-in user on its invited list, **When** that user
   loads the home page, **Then** the poll appears among their cards; **and** it does not appear for
   any other signed-in user, nor for a guest.
11. **Given** a poll that is closed is opened for editing, **When** a visitor views its card,
   **Then** the card shows the editing message rather than the closed-poll message; **and** once
   editing ends, the card shows the closed-poll message again.

---

### User Story 7 - Reach poll administration from the profile menu (Priority: P3)

An administrator signed in to the site has no link to the administration pages; they must know
and type the address. A menu entry should appear for them, and for nobody else.

**Why this priority**: A small convenience for a small group, with no dependency on anything else
in this feature.

**Independent Test**: Sign in as a listed administrator and confirm the menu entry appears and
leads to the administration pages. Sign in as anyone else and confirm it is absent.

**Acceptance Scenarios**:

1. **Given** a signed-in user whose email address is on the administrator list, **When** they open
   the avatar menu, **Then** a "Poll Administration" entry appears after "Edit Profile" and before
   "Logout", and selecting it opens the administration pages.
2. **Given** a signed-in user whose email address is not on the administrator list, **When** they
   open the avatar menu, **Then** no such entry is present — it is absent rather than shown and
   disabled.
3. **Given** a visitor who is not signed in, **When** the page header is displayed, **Then** no
   such entry is present.
4. **Given** a non-administrator who causes the entry to appear by tampering with their own
   browser, **When** they follow it, **Then** the administration pages still refuse them.
5. **Given** the administrator list contains addresses with differing capitalisation or
   surrounding spaces, **When** a matching user signs in, **Then** they are recognised as an
   administrator.

---

### Edge Cases

- **Reopening a poll whose end date has passed** leaves it with no end date at all, so it runs
  until an administrator closes it or sets a new end.
- **Reopening a poll that already reached its voter count limit** does not reset the limit; the
  poll is open but admits no further new voters.
- **A poll being edited whose schedule expires during the edit** is corrected within one
  scheduling cycle after the edit session ends.
- **An administrator lowers the voter count limit below the number of people who have already
  voted.** The value is accepted; existing votes are untouched and no new voters are admitted.
- **A visitor follows a direct link to a poll that is being edited.** If the poll was publicly
  visible before the edit they see the card with the unavailable message; if it was never public
  they see the same not-found result as before.
- **A banned person is un-banned and the administrator forgets to re-invite them.** They remain
  unable to vote in an invitation-only poll; nothing signals this beyond their absence from the
  invited list.
- **A closed poll is opened for editing.** Its card carries the editing message, not the
  closed-poll message, until editing ends — the two never appear together.
- **A poll is deleted or archived while an administrator has its row on screen.** The action is
  refused if no longer valid, and the next refresh reconciles the row.
- **The poll list is viewed on a narrow window.** The row does not reflow; the list scrolls
  sideways within its own container and the page itself does not.
- **An invitation-only poll has more invited addresses than its voter count limit.** Whichever
  bound is reached first stops further voting.

## Requirements *(mandatory)*

### Functional Requirements

#### Poll visibility (US2)

- **FR-001**: The system MUST store a poll's audience and voter-disclosure setting as one value
  chosen from exactly five options, replacing the two separate settings used today.
- **FR-002**: The five values MUST be stored and displayed with identical wording, so that no
  translation between a stored form and a displayed form exists anywhere. The wording is:
  `PUBLIC POLL`; `PRIVATE POLL - ANYONE WITH THE LINK - DO NOT SHOW WHO VOTED`;
  `PRIVATE POLL - ANYONE WITH THE LINK - SHOW WHO VOTED`;
  `PRIVATE POLL - INVITATION ONLY - DO NOT SHOW WHO VOTED`;
  `PRIVATE POLL - INVITATION ONLY - SHOW WHO VOTED`.
- **FR-003**: The system MUST NOT alter any poll setting as a side effect of an administrator
  changing a different setting.
- **FR-004**: The system MUST prevent a poll's visibility, choice mode and vote mutability from
  changing once that poll has received at least one vote, and MUST present all three as read-only
  labels on the update page.
- **FR-005**: The system MUST present poll visibility, choice mode and vote mutability as
  single-select groups showing all options at once on the editing page.

#### Voter count limit (US2)

- **FR-006**: The system MUST disable the voter count limit and hold no value for it whenever a
  poll's visibility is the public value, clearing any previously stored value on the change.
- **FR-007**: The system MUST NOT pre-fill the voter count limit when a poll changes from the
  public value to any private value; the field remains empty for the administrator to fill.
- **FR-008**: The system MUST treat an empty voter count limit on a poll with any private
  visibility as a limit of 500.
- **FR-009**: The system MUST reject any voter count limit that is not a whole number between 1
  and 500 inclusive, both while it is being entered and when the poll is saved, with the check at
  save time being authoritative.
- **FR-010**: The system MUST refuse a vote from a new voter once a poll with any private
  visibility has reached its effective limit.

#### Saving and cancelling (US4)

- **FR-011**: The system MUST save a poll's list of choices as part of the same action that saves
  the rest of the poll, and MUST NOT offer a separate control for saving choices alone.
- **FR-012**: The system MUST treat a change to the list of choices as an unsaved change,
  enabling the save action exactly as a change to any other field does.
- **FR-013**: The system MUST apply a save either completely or not at all, so that a rejected
  save leaves no part of the poll changed.
- **FR-014**: The system MUST continue to refuse changes to a poll's choices once that poll has
  received a vote.
- **FR-015**: The system MUST make the Cancel action available on the editing and update pages
  from the moment the page opens, before any change has been made.
- **FR-016**: The Cancel action MUST behave as the page's own back control does: it MUST return
  the administrator to the poll list, MUST release the poll for editing by others, and MUST ask
  for confirmation when there are unsaved changes.

#### Participant moderation (US1)

- **FR-017**: The system MUST allow an administrator to add an invited participant, to remove and
  ban a participant, and to lift a ban, from the same page session that holds the poll open for
  editing.
- **FR-017a**: Banning a participant MUST remove them from the participant list, from the invited
  list, and from the poll's counted results. Lifting a ban MUST remove the address from the banned
  list only — it MUST NOT restore the invitation and MUST NOT restore the deleted vote.
- **FR-018**: The system MUST refuse those same actions when they arrive from a page session that
  no longer holds the poll open, explaining why.
- **FR-019**: The system MUST allow participant moderation on polls that have already received
  votes, and MUST continue to refuse it on polls that are awaiting screening or archived.
- **FR-019a**: The system MUST present the participant section — the participant list, the banned
  list, and the ban and un-ban actions — on both the editing page and the update page, so that
  moderation remains reachable through the interface after voting has begun.
- **FR-020**: The system MUST offer the control for adding an invited participant only for the two
  invitation-only visibility values, and MUST NOT render it for any other value. This applies on
  the update page as well: a poll whose frozen visibility is invitation-only MUST still allow
  further invitations after voting has begun.
- **FR-021**: The system MUST offer the participant list and its ban and un-ban actions for every
  visibility value, including the public one, on both pages.
- **FR-022**: The system MUST display any failure of a participant action in a location that is
  visible for every visibility value.
- **FR-023**: The system MUST retain a poll's invited list and banned list when its visibility
  changes, including a change away from an invitation-only value. The invited list has no effect
  while the poll is not invitation-only and becomes effective again if it returns to one; bans
  apply in every visibility value.

#### Poll state control (US3)

- **FR-024**: The system MUST offer Open, Close and Archive controls on every poll row, always
  rendered, and enabled only when the transition is available from the poll's current state:
  Open from waiting-to-open or closed; Close from waiting-to-open or open; Archive from closed.
- **FR-025**: When a poll is opened by an administrator, the system MUST clear its scheduled
  start, and MUST clear its scheduled end only if that end is already in the past.
- **FR-026**: When a poll is closed by an administrator, the system MUST set its end to the
  current moment, and MUST clear its start only if that start is in the future.
- **FR-027**: When a poll is archived, the system MUST leave its scheduled start and end
  unchanged.
- **FR-028**: The system MUST ensure that a state chosen by an administrator survives subsequent
  automatic schedule evaluation, without requiring a separate override.
- **FR-029**: The system MUST refuse a state change that is not available from the poll's current
  state, leaving the poll unchanged, and MUST show that refusal on the row that requested it.

#### Server-decided row capabilities (US3, US5)

- **FR-030**: The system MUST decide on the server whether each per-row action is available, and
  MUST supply those decisions to the poll list, which MUST NOT re-derive any state rule itself.
- **FR-031**: The set of decisions MUST cover editing, updating, opening, closing, archiving,
  deleting and re-attempting screening.

#### Poll list presentation (US5)

- **FR-032**: The system MUST shade poll rows alternately, alternating once per poll rather than
  once per rendered line.
- **FR-033**: The system MUST present the columns in the order: title block, state, Open, Close,
  Archive, created, start, end, action icons, actions menu.
- **FR-034**: The system MUST render the title with an edit icon immediately to its left, and MUST
  make both the icon and the title open the appropriate editing page — or disable the icon and
  render the title as plain text when neither editing nor updating is available.
- **FR-035**: The system MUST render the subtitle directly below the title, in italics, at a
  slightly smaller size and with minimal spacing, and MUST NOT give it a column of its own.
- **FR-036**: The system MUST render a further line below the subtitle, in the title's font and
  bold, only when a poll is awaiting screening or has been rejected, showing the awaiting status
  with elapsed time or the rejection reason respectively.
- **FR-037**: The system MUST offer a re-attempt screening control on that line only when a
  rejected poll's screening attempts are exhausted.
- **FR-038**: The system MUST display `started` when an **open** poll has no scheduled start,
  `not scheduled` when a poll in any other state has none (amended by
  `specs/019-NEWEST-POLL-TAB/fix.md` FIX02: a closed poll read "started"), and `does not end`
  when a poll has no scheduled end.
- **FR-039**: The system MUST render icons for duplicating a poll, copying its link, viewing its
  results and deleting it; all MUST always be rendered, disabled ones greyed out, and each MUST
  carry a tooltip describing its action.
- **FR-040**: The system MUST enable the delete icon only for polls that are initialized, rejected
  or archived, and MUST require a confirmation before deleting.
- **FR-041**: The system MUST retain the per-row actions menu at the far right with each action
  described in words.

#### Voting while a poll is being edited (US6)

- **FR-042**: Whenever a visitor acts on a poll card, or the card is refreshed, and the poll is
  being edited, the system MUST render the card's front face carrying the message
  "This poll is momentarily unavailable to cast a vote. Please try again shortly."
- **FR-042a**: The editing message MUST take precedence over any other card message, including the
  closed-poll message, for as long as the poll is being edited. When editing ends, the card MUST
  return to the message appropriate to the poll's own state.
- **FR-043**: While a poll is being edited, the system MUST NOT offer a vote control or a
  live-results control on its card.
- **FR-044**: The system MUST refuse any vote submitted for a poll that is being edited, record
  nothing, and return an indication the card can act on to show its front face and the message —
  without the card having to interpret the message text.
- **FR-045**: The system MUST preserve a visitor's in-progress selection when a card is turned to
  its front face because the poll is being edited, and MUST restore it when the poll reopens.
- **FR-066**: The voter ceiling on a private poll MUST be configurable, defaulting to 500. The
  same setting MUST govern both the limit a blank field means and the largest value an
  administrator may enter — the requirements make them the same number, so they MUST NOT be able
  to diverge. The editing page MUST take the value from the server rather than assuming it, so the
  browser never accepts a value the server would refuse.

- **FR-065**: The rate limit on email-sending endpoints MUST be configurable rather than fixed:
  the window in minutes and the number of requests allowed per client within it, defaulting to 15
  and 2 respectively — the values previously hard-coded. The window MUST be expressed in minutes
  where it is configured, whatever unit the limiter itself uses.

- **FR-064**: The voter count limit MUST remain editable after a poll has received votes, on the
  update surface as well as the edit surface, with the same validation and the same clearing rule
  in both. It is deliberately not among the fields frozen by FR-004: those three change what an
  existing vote *means*, whereas the limit changes only the poll's capacity, so raising it
  invalidates nothing. **This widens 011 FR-009's reduced update surface**, which had frozen the
  limit by omission rather than by any stated rule.

- **FR-062**: On a poll with the public visibility, the disabled voter count limit field MUST
  read `unlimited`. This is presentation only — the stored value remains empty.
- **FR-063**: The voter count limit input MUST be sized for four digits rather than stretching to
  the width of the row, widening only enough to show `unlimited` when disabled.

- **FR-061**: Clearing the voter count limit MUST clear it. A blank value in any form the
  interface can produce — an empty string, whitespace, or an absent value — MUST be treated as
  cleared rather than as an invalid number.

- **FR-059**: The system MUST save changes to a poll's invited and banned lists only when the
  administrator saves the poll, exactly as it does every other field. Adding a participant,
  banning, and un-banning MUST mark the page as having unsaved changes and MUST NOT reach the
  server before then.
- **FR-060**: Cancelling an editing session MUST discard unsaved participant changes along with
  every other unsaved change, leaving the poll exactly as it was when the page was opened.

- **FR-057**: The system MUST tell a signed-in viewer, as part of a poll's own data, whether
  they may vote in it and if not why — banned, not invited, or the poll has reached its voter
  limit. The card MUST withhold both the vote control and the submit control from a blocked
  viewer and show the reason instead, while leaving the results readable. This is a display
  decision only; the server MUST continue to reject the vote independently (004 FR-028).
- **FR-058**: The system MUST show the reason whenever a submitted vote is refused. No refusal
  may be silent.

- **FR-055**: The system MUST include, on a signed-in user's home page, the invitation-only polls
  that user is personally invited to, alongside the public polls everyone sees. A poll whose
  invitee has been banned MUST NOT be listed for them, since they cannot vote in it. Guests MUST
  see public polls only. Polls open to anyone with the link MUST remain unlisted for everyone —
  nobody is invited to one. **This supersedes 004 FR-033**, which required such polls never to
  appear in the home grid while promising a post-login suggestion surface that was never built.
- **FR-056**: An invited poll MUST satisfy the same state rule as a public one before it is
  listed, so a poll that is not yet screened is withheld from its invitees as well.

- **FR-046**: The system MUST include a poll that is being edited in the publicly visible listings
  only when the poll was publicly visible immediately before the edit began, and MUST continue to
  withhold one that was not.
- **FR-047**: The system MUST NOT disclose a poll's pre-edit state to visitors; it is used only to
  decide inclusion.

#### Home grid currency (US6)

- **FR-048**: The system MUST re-check which polls belong on the home grid at the configured
  polling interval, adding and removing cards as membership changes, without the visitor
  reloading.
- **FR-049**: The system MUST preserve a surviving card's turned-over state and its in-progress
  selection across a refresh.

#### Administration menu entry (US7)

- **FR-050**: The system MUST indicate, as part of the signed-in user's own profile information,
  whether that user is permitted to administer polls.
- **FR-051**: That indication MUST be produced by the same allow-list rule that guards the
  administration pages, so the two can never disagree, and MUST ignore capitalisation and
  surrounding spaces.
- **FR-052**: The system MUST render a "Poll Administration" menu entry after "Edit Profile" and
  before "Logout" when the indication is present and true, and MUST NOT render it at all
  otherwise.
- **FR-053**: The indication MUST be treated only as a display hint; every administration page and
  action MUST continue to enforce permission independently.

#### Documentation

- **FR-054**: The published interface documentation MUST be updated to match every change to the
  system's external contract made by this feature.

### Key Entities

- **Poll**: The unit administrators create and visitors vote on. Gains a single **poll visibility**
  value in place of the separate access mode and results visibility. Its **voter count limit**,
  **scheduled start** and **scheduled end** change meaning as described above; its **state**,
  **title**, **subtitle**, **choices**, **invited list** and **banned list** are unchanged. Both
  participant lists survive a visibility change.
- **Poll visibility**: One of five values — a public value, and four private values distinguishing
  link access from invitation-only access and, within each, whether voters' identities are to be
  disclosed. The disclosure distinction is recorded but drives no behaviour yet.
- **Editing session**: The temporary hold an administrator's open editing page has on a poll.
  Determines which page may change the poll, including its participant lists.
- **Row capability set**: The server's decision, per poll, about which administrative actions are
  currently available. Consumed by the poll list for rendering only.
- **Administrator indication**: A statement, carried with a signed-in user's profile information,
  that the user may administer polls. A display hint only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can add an invited participant and ban a voter from an open poll
  editing page with a 100% success rate, where both actions fail 100% of the time today.
- **SC-002**: Setting up a poll's audience and disclosure takes exactly one selection, down from
  two, and zero settings are changed without the administrator selecting them.
- **SC-003**: Opening, closing or archiving a poll takes one action from the poll list, down from
  at least three today, and the chosen state is still in effect after a full scheduling cycle in
  100% of cases.
- **SC-004**: Archiving a poll never changes its recorded closing date, so exported results carry
  the date the poll actually closed in 100% of cases.
- **SC-005**: Saving a poll after changing only its choices succeeds, where it is impossible
  today; no save leaves a poll partially updated.
- **SC-006**: An administrator can identify a poll's title, subtitle, state, availability of every
  action, and its three dates without scrolling horizontally on a standard desktop window, and
  without opening any menu.
- **SC-007**: No visitor ever records a vote against a poll that is being edited, and no visitor
  loses an in-progress selection because a poll entered or left the editing state.
- **SC-008**: A poll that opens or closes while the home page is open is reflected on that page
  within one polling interval without a reload.
- **SC-009**: Administrators reach the administration pages from the profile menu without typing
  an address; non-administrators are never shown the entry and are refused if they reach the page
  by any other means.
- **SC-010**: No poll with a private visibility ever admits more than 500 voters by any path.

## Assumptions

Recorded where the source requirements were silent or admit more than one reading. Each is a
default this specification adopts; correcting any of them is a change to this document, not a
blocker.

- **Default visibility**: A newly created poll starts at the public visibility value, matching the
  defaults it has today.
- **Blank limit storage**: A blank voter count limit on a private poll is stored as "no value" and
  resolved to 500 when a vote is cast, rather than being written into the poll as 500. The source
  requirements state the field is never auto-filled.
- **Cancel confirmation**: "The same function as the back icon" is read as the same destination
  and the same release of the editing session, with the unsaved-changes confirmation retained.
  The requirements pin which control Cancel imitates, but not whether the confirmation survives;
  keeping it is the safer default for a control that is now always enabled.
- **Editing states and the edit icon**: The requirements name archived as the case where the edit
  icon is disabled. It is read as illustrative rather than exhaustive — the icon follows the
  server's decision, which is also false while a poll is being edited or awaiting screening.
- **"Front face only" during editing**: Read as the steady state reached at the next visitor
  action or refresh, not as an instantaneous change to an idle card. Nothing pushes state to a
  card between refreshes.
- **The public value's wording**: The parenthetical describing the public value as anonymous is
  read as explanatory prose. The stored value is the plain public label; anonymity is implied by
  the value and recorded nowhere separately.
- **Disclosure variants are inert**: The two "show who voted" values are stored and displayed but
  change no behaviour in this feature, including the not-yet-voted list on the results page, which
  continues to be shown only for invitation-only polls.
- **Participant actions**: "All three participant actions" is read as adding an invited
  participant, removing-and-banning a participant, and lifting a ban.
- **Elapsed time on the screening line**: Measured from the moment a screening attempt was
  claimed, showing a queued indication before the first attempt — the behaviour the list has
  today, relocated into the title block.
- **Choices on the update page**: Shown read-only, with any attempt to change them rejected at
  save time.
- **Icons and tooltips**: Icons are drawn by the application itself; no icon library is
  introduced. Tooltips are required; accessible names are explicitly not required at this stage.
- **Unquantified visual language**: "slightly smaller", "minimal spacing" and "visibly greyed" are
  deliberately left to the implementer's judgement, resolved against the sizing, spacing and
  disabled-state values already in the admin stylesheet rather than against new numbers. They are
  therefore reviewed by eye, not asserted by test.
- **Narrow windows**: The list is not made responsive by this feature; it scrolls sideways within
  its own container. Responsive design is deferred to its own future feature.
- **Logging**: This feature adds no logging. A dedicated logging feature will follow. Where the
  two poll-list queries are concerned, that future feature should note that both are polled every
  few seconds by every open page, so per-item logging at a normal level would produce hundreds of
  lines per minute on an idle system.
- **Existing systems reused**: Sign-in, sessions, profiles, acceptability screening, the schedule
  evaluation cycle and the editing-session hold are all reused unchanged.
- **Data migration**: None is performed. Existing poll and vote data is deleted when this feature
  is deployed, as the source requirements permit. This is irreversible in any environment holding
  real data.
