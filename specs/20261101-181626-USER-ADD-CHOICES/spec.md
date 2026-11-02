# Feature Specification: Voters Add Choices to a Private Poll

**Feature Branch**: `user-add-choices`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "requirements/20261101-181626-user-add-choices/requirements.md"

## Clarifications

### Session 2026-11-01

- Q: On a poll with anonymous voting, is "Added by <username>" shown, hidden, or not recorded? → A: not recorded — on an anonymous poll the author of an added choice is not stored at all; non-anonymous polls record and show it.
- Q: Does an addition use up the same allowance as a vote? → A: no — additions have their own allowance at the same minimum interval as votes (one per interval per session), so a vote right after an addition succeeds.
- Q: Is the creator told when a voter adds a choice? → A: no — no email, marker or other notice; the creator sees added choices on the poll card and the Edit Poll Card.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A voter adds a missing choice (Priority: P1)

A signed-in voter opens a Private poll whose creator allows voters to add choices.
The option they want is not listed, so on the poll card's voting side they press "Add Choice", type the new choice in a dialog and press Save.
The choice is checked and added at once, appears last on their card, unselected, and they can then vote for it as for any other choice.
Everyone else who views the poll sees the new choice the next time their view refreshes.

**Why this priority**: This is the feature. Without it nothing else in this specification has a purpose.

**Independent Test**: With the setting on for a Private poll, sign in as an eligible voter, add a choice, and confirm it appears on the voter's card at once and on a second viewer's card after a refresh, and that a vote for it is counted.

**Acceptance Scenarios**:

1. **Given** an open Private poll with the setting on and fewer than the maximum number of choices, **When** an eligible voter presses "Add Choice", **Then** the poll's latest choices are fetched first and the Add Choice dialog opens with an empty field and a counter reading `0 / 40`.
2. **Given** the dialog is open, **When** the voter types a valid new choice and presses Save, **Then** the dialog closes, the choice appears last on the voter's card, unselected, and any choices the voter had selected stay selected.
3. **Given** a choice was just added, **When** another user's view of the poll refreshes, **Then** that user sees the new choice too.
4. **Given** a choice was just added, **When** the voter selects it and submits a vote at once, **Then** the vote is accepted (not refused as too soon) and counted for it like any other choice.
5. **Given** the dialog is open, **When** the voter presses Cancel or Escape, **Then** the dialog closes and nothing is added.

---

### User Story 2 - A voter is told why a choice was refused (Priority: P1)

A voter's new choice may be empty, too long, a duplicate of an existing choice, contain characters that are not allowed, or contain language the poll screening refuses.
The voter is told which, in the dialog, keeps what they typed, and can correct it and try again.

**Why this priority**: Without clear refusals the voter cannot succeed, and polls fill up with near-duplicates or unacceptable text.

**Independent Test**: Try each kind of invalid choice in turn and confirm each is refused with its own message under the field, the text is kept, and nothing is added to the poll.

**Acceptance Scenarios**:

1. **Given** the field is empty or holds only spaces, **When** the voter looks at Save, **Then** Save is disabled.
2. **Given** the voter types or pastes text longer than 40 characters, **When** the text reaches 40 characters, **Then** the field takes no more, and the counter reads `40 / 40`.
3. **Given** the poll has a choice "Pizza", **When** the voter saves "pizza" or "  Pizza  ", **Then** the addition is refused as a duplicate.
4. **Given** the voter's text contains a line break, a tab, another control character, or an invisible zero-width or text-direction character, **When** the voter saves, **Then** the addition is refused, naming the problem.
5. **Given** the voter's text contains a term the poll screening refuses, **When** the voter saves, **Then** the addition is refused for unacceptable language, shown in the dialog.
6. **Given** the screening cannot give a verdict in time, **When** the voter saves, **Then** the voter is asked to try again and nothing is added.

---

### User Story 3 - The creator chooses whether voters may add choices (Priority: P2)

On the Edit Poll Card, the creator of a Private poll finds a setting "Voters may add choices", off by default.
Turning it on makes the Add Choice button appear for the poll's eligible voters; turning it off removes it.
The setting may be changed whether or not the poll has votes.

**Why this priority**: It protects existing polls and creators who want a fixed list; without it every Private poll would change behaviour.

**Independent Test**: On a Private poll, confirm the button is absent while the setting is off, turn it on and confirm the button appears for a voter, then turn it off again on a poll with votes and confirm it disappears.

**Acceptance Scenarios**:

1. **Given** any existing poll, **When** this feature is released, **Then** its setting is off and no Add Choice button appears on it.
2. **Given** a Private poll, **When** the creator turns the setting on and saves, **Then** eligible voters see the Add Choice button.
3. **Given** a Private poll with votes and the setting on, **When** the creator turns it off and saves, **Then** the button disappears and further additions are refused.
4. **Given** a Public poll, **When** the creator opens the Edit Poll Card, **Then** the setting is not offered.

---

### User Story 4 - The creator's save keeps choices voters added meanwhile (Priority: P2)

A creator opens the Edit Poll Card on a poll while a voter adds a choice.
When the creator later saves, the voter's choice and the votes for it are kept unless the creator deleted that choice.

**Why this priority**: Without it a creator's routine save would silently delete voters' choices and the votes on them.

**Independent Test**: Load the creator's Edit Poll Card, have a voter add a choice and vote for it at a moment additions are allowed (FR-003), then save the creator's card with an unrelated change and confirm the voter's choice and its vote remain.

**Acceptance Scenarios**:

1. **Given** the creator's card holds choices X and Y and a voter has since added Z, **When** the creator adds W and saves, **Then** the poll's choices are X, Y, Z and W, and Z's votes are kept.
2. **Given** the same, **When** the creator deletes Y and saves, **Then** the poll's choices are X and Z.
3. **Given** voters have meanwhile filled the poll to the maximum number of choices, **When** the creator's save would exceed it, **Then** the save is refused with a message saying the poll has too many choices, and nothing changes.

---

### User Story 5 - The creator sees who added a choice (Priority: P3)

On the Edit Poll Card of a poll without anonymous voting, each choice a voter added shows "Added by <username>", so the creator can remove an unwanted choice with the existing deletion flow or ban its author.
On a poll with anonymous voting the author is not recorded, so the creator can still remove the choice but cannot tell who added it.

**Why this priority**: Screening catches only a short list of terms, so the creator needs a way to find and act on an unwanted choice; the feature works without it, but less safely.

**Independent Test**: Add a choice as a voter, open the Edit Poll Card as the creator, and confirm the label "Added by <the voter's username>" is next to it and that deleting it uses the usual deletion prompt.

**Acceptance Scenarios**:

1. **Given** a voter added a choice to a poll without anonymous voting, **When** the creator opens the Edit Poll Card, **Then** that choice shows "Added by <username>"; choices the creator wrote show no such label.
2. **Given** the voter who added a choice deletes their account, **When** the creator opens the Edit Poll Card, **Then** the choice is still there but no longer names its author.
3. **Given** a voter added a choice to a poll with anonymous voting, **When** the creator opens the Edit Poll Card, **Then** the choice shows no author, and no author is stored for it.

---

### Edge Cases

- **The poll is full**: when the latest choices show the poll already has the maximum allowed, the dialog does not open and the card says "This poll already has the most choices allowed (<max>)."
- **The latest choices cannot be loaded**: the dialog does not open and the card says "Couldn't load the latest choices. Try again."
- **The poll fills up while the dialog is open**: Save is refused with the "most choices allowed" message and nothing is added.
- **Another voter adds the same choice first**: Save is refused as a duplicate.
- **The poll is not open** (waiting to open, closed, awaiting approval), **is being edited by its creator**, or **has saved changes waiting for review**: the addition is refused with a message naming the reason; while the creator is editing the message is "The poll's choices are being edited. Try again shortly."
- **The voter has already cast a final vote** on a Final-Vote poll: the button is absent and an addition is refused.
- **The voter is banned, not invited (Invitation Only), over the poll's voter limit, a guest, or lacks the permission to vote**: the button is absent and an addition is refused.
- **The creator of the poll**: may add a choice while the poll is open and the setting is on, whether or not they have voted, provided they hold the permission to vote like everyone else.
- **Text with emoji or any script**: accepted; text that looks like markup is stored as typed and always shown as plain text.
- **Two voters save different choices at the same moment**: both are added, unless together they exceed the maximum, in which case the later one is refused.
- **A poll switched to anonymous voting** (possible only before it has votes): any authors already recorded for its added choices are cleared at the switch, so an anonymous poll never holds one.
- **Phone width**: the button's label stays on one line and the voting row keeps its height.

## Requirements *(mandatory)*

### Functional Requirements

**Who and when**

- **FR-001**: Each Private poll MUST have a setting "Voters may add choices", off by default and off for every existing poll; it MUST be offered only for Private polls and MUST be changeable whether or not the poll has votes.
- **FR-002**: A user MAY add a choice only when all of these hold: they are signed in; the poll is Private and its setting is on; they hold the permission to vote and can view the poll (hold the permission to view polls); they may vote on the poll now (not banned; invited, if the poll is Invitation Only; within the voter limit or already a voter) or they are the poll's creator; and, on a Final-Vote poll, they have not yet cast their vote (the creator is exempt from this last rule).
- **FR-003**: A choice MAY be added only while the poll is open to voting, is not being edited by its creator, and has no saved changes waiting for review; otherwise the addition MUST be refused with a message naming the reason.
- **FR-004**: Every rule in FR-001 to FR-003 MUST be checked by the server on every addition, not only by hiding the button.

**The button and the dialog**

- **FR-005**: The voting side of the poll card MUST show an "Add Choice" button, an outlined (secondary) button centred on the row that holds the back arrow and "Submit vote", to users who may add a choice, and MUST NOT show it to anyone else; "Submit vote" stays the one filled (primary) button.
- **FR-006**: Pressing "Add Choice" MUST first fetch the poll's latest choices and update the card with them; if the fetch fails, or the poll already has the maximum number of choices, the dialog MUST NOT open and the card MUST show the corresponding message (Edge Cases).
- **FR-007**: The dialog MUST be a modal dialog titled "Add Choice", in the site's Material 3 style, holding one text field with a counter `<length> / 40` as on the Edit Poll Card's limited fields, and the buttons Save and Cancel.
- **FR-008**: The field MUST NOT accept more than 40 characters, including when text is pasted (a paste is cut to fit); Save MUST be disabled while the trimmed text is empty or a save is in progress.
- **FR-009**: Opening the dialog MUST move focus to the field; closing it MUST return focus to the "Add Choice" button; Enter MUST save; Escape and Cancel MUST close the dialog without saving.
- **FR-010**: A refused save MUST show its reason under the field, in the error style, keep the voter's text and keep the dialog open.

**Validation**

- **FR-011**: The server MUST trim the new choice and refuse it when it is empty.
- **FR-012**: The server MUST refuse a new choice longer than 40 characters, the same limit the Edit Poll Card applies to a new poll's choices; the 100-character limit the creator has on existing polls is unchanged.
- **FR-013**: The server MUST refuse a new choice containing a line break, a tab or any other control character, or a zero-width or text-direction-override character; emoji and every script MUST be accepted. This rule applies only to voters' additions, so no existing poll becomes invalid.
- **FR-014**: The server MUST refuse a new choice that equals an existing choice of the poll when both are compared ignoring letter case and repeated spaces; the creator's own saves keep their current, exact comparison.
- **FR-015**: The server MUST screen the new choice with the same acceptability screening that a creator's changes go through, during the save, and refuse it for unacceptable language; when screening does not give a verdict in time, the addition MUST be refused with a "try again" message and nothing added.
- **FR-016**: The server MUST refuse a new choice when the poll already has the maximum number of choices allowed; this check MUST hold even when several additions arrive at once.

**The addition**

- **FR-017**: An accepted choice MUST be added immediately, without waiting for any later review, as the poll's last choice with automatic colouring.
- **FR-018**: Adding a choice MUST NOT cast or change any vote; the new choice MUST appear unselected on the adding voter's card and the voter's current selection MUST be kept.
- **FR-019**: The adding voter's card MUST show the new choice as soon as the save succeeds; every other view of the poll (poll cards in every tab, Live Results, search results, the line graph once the choice has votes) MUST show it through the refreshes that already exist, as for any change to a poll's content.
- **FR-020**: On a poll without anonymous voting, each added choice MUST record which user added it; the Edit Poll Card MUST show "Added by <username>" beside such a choice, and the record MUST be cleared when that user deletes their account. On a poll with anonymous voting, the author MUST NOT be recorded at all, and the Edit Poll Card shows no author.
- **FR-021**: The Privacy Policy MUST state that, on a poll without anonymous voting, the poll keeps which user added a choice.
- **FR-022**: A user's additions MUST be bounded only by the poll's maximum number of choices and by one addition per minimum vote interval per session; there is no per-user limit. Additions MUST have their own allowance, separate from votes, so a vote submitted right after an addition is not refused for coming too soon, and an addition right after a vote is not refused either. An addition refused for coming too soon MUST tell the voter to wait and try again, keeping the dialog open.

**The creator's save**

- **FR-023**: When the creator saves the Edit Poll Card, the server MUST delete only the choices the creator removed from those the card held when it was opened, and MUST keep every choice added since; the maximum number of choices MUST be checked on the resulting list and the save refused when it is exceeded.

**Documentation**

- **FR-024**: The new and changed requests MUST be described in the API description the project keeps.

### Key Entities

- **Poll setting "Voters may add choices"**: a yes/no setting on each poll, off by default, meaningful only for Private polls; part of the poll's content, so changing it reaches every view as other settings do.
- **Choice**: an existing part of a poll (its label, position and optional colour). A choice added by a voter to a poll without anonymous voting also records the user who added it; that record is removed when the user deletes their account. On a poll with anonymous voting nothing about the author is recorded.
- **Choice-length limit for additions**: 40 characters, the same value the Edit Poll Card uses for a new poll's choices, held in one place and shared by the server, the Edit Poll Card and the Add Choice dialog.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An eligible voter can add a choice, from pressing "Add Choice" to seeing it on their card, in under 30 seconds, and the choice appears on the card within 2 seconds of pressing Save under normal conditions.
- **SC-002**: Other viewers see an added choice within the same time they see any other change to a poll's content today; no new refresh is introduced.
- **SC-003**: 100% of invalid additions (empty, over 40 characters, duplicate, forbidden characters, refused language, poll full, ineligible user, poll not open) are refused with a message naming the reason, and none changes the poll.
- **SC-004**: No poll ever holds more choices than the maximum allowed, including under simultaneous additions and creator saves.
- **SC-005**: A creator's save never deletes a choice the creator did not delete; in testing, 0 votes are lost on voter-added choices after a creator save.
- **SC-006**: No existing poll shows the Add Choice button after release until its creator turns the setting on.
- **SC-007**: The dialog can be used start to finish with the keyboard alone.

## Assumptions

- "Private poll" covers both sharing modes, "Anyone With The Link" and "Invitation Only"; Public polls never get the feature.
- The existing acceptability screening (a short list of refused terms) is good enough for voters' additions; the creator's "Added by" label and existing deletion and ban flows cover what it misses.
- Because additions are refused while the creator's edit session is open (FR-003), FR-023 matters mainly for an Edit Poll Card that was opened, closed by the session's expiry or heartbeat rules, and saved later, and for additions that land between the card loading its choices and the edit session starting; it is still required in every case.
- The maximum number of choices, the minimum interval between votes and the screening time limit are the existing site-wide settings; no new setting is introduced.
- The adding voter's choice is shown to everyone at once; there is no creator approval step for voters' additions.
- Renaming, reordering, recolouring or deleting choices by voters is out of scope.
- Notifying the creator of an addition (by email, a marker on the admin poll list or otherwise) is out of scope; the creator sees added choices on the poll card and the Edit Poll Card.
