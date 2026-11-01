# Feature Specification: Editing an Open Poll Without Interrupting Voting

**Feature Branch**: `editing-poll-available`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "requirements/20261029-225209-editing-poll-available/requirements.md"

## Clarifications

### Session 2026-10-30

- Q: What does the creator see between Save and the review's outcome on an open, voted poll? → A: the Admin Poll Card shows a "changes pending review" status and disables Save until the review resolves; approval clears the status quietly, rejection shows the rejection notice.
- Q: What happens to a pending change set when the poll closes (end date passes) before the review resolves? → A: approved changes still apply to the now-closed poll; the poll stays closed — approval never changes the poll's state.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Voting stays available while the creator edits (Priority: P1)

A poll creator opens the Admin Poll Card on a poll that is open and has received votes, works through its settings, and saves.
At no point does a voter notice: the poll stays in every listing, its card keeps its vote controls, and every vote cast while the editor is open or while saved changes await review is accepted and counted.
The creator still gets exclusive editing — a second editor is turned away, and an abandoned editor's session expires on its own — but that exclusivity no longer costs voters anything.

**Why this priority**: This is the heart of the feature. Today, opening the editor shows voters "This poll is momentarily unavailable to cast a vote", and saving removes the poll from every listing until it is re-approved. Removing that interruption delivers value even if nothing else in this feature ships.

**Independent Test**: Open the editor on an open, voted poll in one browser; in a second browser (a voter), confirm the poll is listed, viewable and votable the whole time — before, during and after a save — and that the vote is counted.

**Acceptance Scenarios**:

1. **Given** an open poll with votes, **When** the creator opens the Admin Poll Card for editing, **Then** a voter can still see the poll in listings and cast a vote, and the vote is counted.
2. **Given** a creator editing an open poll, **When** a second signed-in session of the creator opens the same poll's editor, **Then** the second session is refused exclusivity exactly as today.
3. **Given** a creator saves text changes (title, subtitle, or choices) on an open, voted poll, **When** the changes are being reviewed, **Then** the poll remains open, listed and votable, showing its pre-save content until the review approves the changes.
4. **Given** saved changes pass review, **When** the next approval cycle completes (normally within seconds), **Then** voters see the new content without the poll ever having been unavailable.
5. **Given** saved changes fail review, **When** the creator returns to the poll, **Then** the poll is running unchanged with its pre-save content and the creator is told the changes were rejected.

---

### User Story 2 - Adding and deleting choices on a live poll (Priority: P2)

The creator edits the choices of an open, voted poll in the same textbox used today — same Paste choices button, same help text.
When the Choices section loses focus, the edited lines are compared with the current choices: lines that match an existing choice's label (after trimming) keep that choice exactly as it is; new lines become added choices; current choices whose label no longer appears become deletions.
If any deleted choice has votes, a confirmation names each such choice and its vote count; confirming applies the deletions, and cancelling reverts the whole Choices section to the state it had when editing began.

**Why this priority**: Adding and deleting choices is the most-requested new editing ability and carries the most risk (votes are attached to choices), so it is specified in the most detail. It depends on User Story 1 only for the no-interruption guarantee, not for its own correctness.

**Independent Test**: On an open poll with votes, add a line, remove a voted line and leave the section; confirm the prompt names the removed choice with its count; confirm the surviving choices keep their labels, positions and tallies, the new choice appears last, and the removed choice's voters can vote again.

**Acceptance Scenarios**:

1. **Given** an open, voted poll, **When** the creator adds a new line to the choices textbox and leaves the section, **Then** the new choice is appended after the existing ones with an automatically assigned colour, and no existing choice's colour, position or tally changes.
2. **Given** a deleted line matching a choice with votes, **When** the Choices section loses focus, **Then** a confirmation lists that choice with its vote count (as of when editing began); confirming proceeds, cancelling restores the whole Choices section to its state at edit start.
3. **Given** a deleted line matching a choice with no votes, **When** the Choices section loses focus, **Then** the deletion applies without a confirmation.
4. **Given** the creator edits a voted choice's wording in place, **When** the merge runs, **Then** it is treated as deleting the old choice (with its votes) and adding a new one, and the confirmation makes that visible before anything is lost.
5. **Given** a confirmed deletion of a voted choice is saved, **Then** that choice disappears from every voter's recorded vote; a voter whose vote is left empty counts as not having voted and may vote again (whether the poll is Dynamic or Final), and all displayed counts, percentages and graphs remain consistent.
6. **Given** a save that would leave fewer choices than the allowed minimum, or add more than the allowed maximum, or add a label that is blank, longer than 100 characters after trimming, or a duplicate of a current label, **Then** the save is refused with a clear message and nothing changes.

---

### User Story 3 - Switching a private poll between Invitation Only and Anyone with the Link (Priority: P3)

The creator of an open, voted private poll switches its sharing mode in either direction.
Switching to "Anyone with the Link" opens access to anyone holding the link; the invitation record is kept unchanged as history.
Switching to "Invitation Only" restricts access to invited addresses: votes already cast stay counted and visible, participant records are kept, but an uninvited voter — even one who has voted — can no longer reach the poll until invited, at which point their history reconnects to them.

**Why this priority**: A self-contained relaxation of an existing freeze, valuable to creators managing a private audience, with well-understood consequences the creator explicitly accepts.

**Independent Test**: Switch an open, voted private poll each way and verify access, results and the invitation list behave as described for an invited voter, an uninvited past voter and a new link holder.

**Acceptance Scenarios**:

1. **Given** an open, voted, Invitation Only poll, **When** the creator switches it to Anyone with the Link and saves, **Then** a signed-in user holding the link can view and vote without an invitation, and the recorded invitations remain visible, unchanged.
2. **Given** an open, voted, Anyone-with-the-Link poll, **When** the creator switches it to Invitation Only and saves, **Then** a past voter who is not invited can no longer view, vote on or watch the poll, while their already-cast vote stays counted and visible in results.
3. **Given** such an excluded past voter is later invited, **Then** their access and history (participation, vote) reconnect to them.
4. **Given** any open poll that has ever been voted on, **When** the creator attempts to change it between Private and Public, **Then** the change is refused exactly as today.

---

### User Story 4 - Switching choice mode from Single to Multiple (Priority: P4)

The creator of an open, voted single-choice poll switches it to multiple-choice.
Existing votes are kept exactly as cast; from the save onward voters may select several choices.
The reverse switch — multiple to single — remains frozen once the poll has ever been voted on.

**Why this priority**: A one-way relaxation with accepted consequences (percentages may sum past 100%); smaller in scope than the stories above.

**Independent Test**: Switch an open, voted single-choice poll to multiple-choice; confirm old votes are unchanged, a new voter can pick several choices, and the reverse switch is refused.

**Acceptance Scenarios**:

1. **Given** an open, voted single-choice poll, **When** the creator switches it to multiple-choice and saves, **Then** existing votes are unchanged and a subsequent voter can select more than one choice.
2. **Given** an open, voted multiple-choice poll, **When** the creator attempts to switch it to single-choice, **Then** the change is refused.

---

### User Story 5 - Switching vote mutability between Dynamic and Final (Priority: P5)

The creator of an open, voted poll switches vote mutability in either direction.
Existing votes are kept exactly as cast; the new rule applies only from the save onward: Dynamic → Final freezes every existing voter's vote as it stands, Final → Dynamic lets every past voter change their vote from then on.

**Why this priority**: The smallest relaxation; its consequences were explicitly accepted as the poll creator's decision.

**Independent Test**: Switch each way on an open, voted poll and confirm a past voter's ability to change their vote follows the new setting, while the stored votes themselves are untouched by the switch.

**Acceptance Scenarios**:

1. **Given** an open, voted Dynamic poll, **When** the creator switches it to Final and saves, **Then** every existing vote stands as cast and no voter can change theirs from then on.
2. **Given** an open, voted Final poll, **When** the creator switches it to Dynamic and saves, **Then** every past voter may change their vote from then on.

---

### Edge Cases

- A vote arrives in the instant between a save and its approval: it is accepted against the poll's current (pre-save) content and counted.
- A vote is submitted for a choice that a concurrent save just deleted: the vote is refused as invalid, with a message saying the choice is no longer available, and the voter can vote again on the updated choices.
- The creator saves again while an earlier save is still under review: the second save is refused with a message to retry once the pending changes resolve (see Assumptions).
- The poll's end date passes while the editor is open: the poll closes on schedule; closing wins over editing.
- The poll closes while a save's changes are under review: approved changes still apply to the closed poll, which stays closed — approval never changes the poll's state.
- A deletion empties a Final-vote voter's vote: that voter counts as not having voted and may vote again — they are never permanently locked out.
- The creator deletes voted choices down to the minimum: allowed; one fewer is refused by both the editor and the save.
- Two textbox lines trim to the same label: duplicates are refused as they are for added labels.
- Screening rejects the changes: the poll keeps running with its pre-save content and the creator is told; nothing a voter saw ever changes.
- An open poll that has never been voted on: none of the new restrictions apply — it keeps today's full editing freedom, and all freezes remain keyed on "has ever been voted on".

## Requirements *(mandatory)*

### Functional Requirements

**Availability while editing**

- **FR-001**: Opening the poll editor on an open poll MUST NOT make the poll unavailable: it stays in every listing and keeps accepting votes for the whole editing session.
- **FR-002**: The editing session MUST keep its existing exclusivity and expiry behaviour: one editor at a time, and an abandoned session expires without help.
- **FR-003**: Saving changes to an open, ever-voted poll MUST keep the poll open and serving its pre-save content while the saved changes are reviewed in the background; approved changes take effect at the next approval cycle (normally within seconds). Any change to the choice list goes through this review as one unit, deletions included — even a deletions-only save, which adds no reviewable text — so a rename (a deletion plus an addition) can never apply half-way.
- **FR-004**: A rejected review MUST leave the poll running unchanged and tell the creator the changes were rejected and why they can retry.
- **FR-005**: Changes that need no content review MUST take effect per the existing timing rules: at save for settings, within one schedule-check cycle for date changes, and within one invitation cycle (or at once while the poll is open) for new invitations.
- **FR-006**: While one save's changes await review, a further save of the same poll MUST be refused with a clear message; the creator can save again once the pending changes are approved or rejected.
- **FR-024**: After a save that goes to review, the Admin Poll Card MUST show a "changes pending review" status and disable Save until the review resolves; approval clears the status without further notice, and rejection shows the rejection notice (FR-004). This is realized as: the card returns to its read-only face after the save, that face carries the pending status, and the editor refuses entry until the review resolves.
- **FR-025**: Approval of a pending change set MUST apply the changes without changing the poll's state: if the poll closed while the changes were under review, the approved changes still land and the poll stays closed; approval never reopens a poll.

**Editing choices on a voted poll**

- **FR-007**: The Choices section MUST keep today's textbox, Paste choices button and help text in every poll state; no separate add/delete controls are introduced.
- **FR-008**: When the Choices section loses focus, the edited lines MUST be merged with the current choices by exact label match after trimming: a matching line keeps its choice (identity, label and position unchanged), an unmatched line is an addition, and a current choice with no matching line is a deletion. An in-place rewording is therefore a deletion plus an addition.
- **FR-009**: On an ever-voted poll, every surviving choice MUST keep its identity, label and position across a save; additions are appended at the end with an automatically assigned colour, so no existing choice's colour or position changes.
- **FR-010**: If at least one deleted choice has votes, a confirmation MUST name each such choice with its vote count as of when the editing session began; deletions of unvoted choices apply without a prompt.
- **FR-011**: Cancelling the deletion confirmation MUST revert the whole Choices section to the state it had when the editing session began.
- **FR-012**: The vote counts shown in the confirmation MUST be captured once, when the editing session begins, and held for the session's life.
- **FR-013**: An added choice label MUST be trimmed, refused when blank, longer than 100 characters, or an exact duplicate (after trimming) of a current label; the total MUST stay within the configured minimum and maximum choice counts, enforced by both the editor and the save.
- **FR-014**: A save MUST be refused when it would leave the poll with fewer than the configured minimum number of choices.
- **FR-015**: When a voted choice's deletion is saved, that choice MUST be removed from every affected voter's recorded vote in the same atomic change; a vote left empty counts as not having voted, so that voter may vote again regardless of vote mutability; all counts, percentages and graphs MUST remain mutually consistent afterwards.

**Relaxed setting freezes on an open, voted poll**

- **FR-016**: A private, open, ever-voted poll MUST be switchable between Invitation Only and Anyone with the Link, in both directions.
- **FR-017**: Switching to Anyone with the Link MUST keep the invitation record unchanged as history while no longer requiring invitations for access.
- **FR-018**: Switching to Invitation Only MUST keep all cast votes counted and visible and keep participant records, while refusing viewing, voting and watching to any address not invited — including past voters — until that address is invited, at which point its participation reconnects.
- **FR-019**: A single-choice, open, ever-voted poll MUST be switchable to multiple-choice; the reverse switch MUST remain refused once the poll has ever been voted on.
- **FR-020**: Vote mutability MUST be switchable between Dynamic and Final on an open, ever-voted poll; existing votes are kept exactly as cast and the new rule applies only to votes from the save onward.
- **FR-021**: The Private ↔ Public freeze MUST remain: an ever-voted poll's visibility cannot change.
- **FR-022**: Every freeze and relaxation above MUST be keyed on "has ever been voted on", not on the poll being open: an open poll with no votes keeps today's full editing freedom.
- **FR-023**: All relaxations MUST be enforced consistently in both the editor (what the creator can change) and the save (what the system accepts), so the two cannot drift apart for these settings.

### Key Entities

- **Poll**: the open, ever-voted poll being edited; carries visibility (Public/Private), sharing mode (Invitation Only / Anyone with the Link), choice mode (Single/Multiple), vote mutability (Dynamic/Final), schedule and choices.
- **Choice**: one votable option; has a stable identity, a label, a position and an optional manual colour; votes attach to the identity, which is why survivors must keep it.
- **Vote**: a voter's current selection of one or more choices; may be emptied by a deletion, returning the voter to "not voted".
- **Editing session**: the creator's exclusive hold on the editor; captures the per-choice vote-count snapshot shown in the deletion confirmation.
- **Pending change set** (implemented as `pending_update`): the saved-but-not-yet-approved changes of an open poll, held while the poll keeps serving its pre-save content; exactly one may exist per poll at a time.
- **Invitation record**: who was invited to a private poll; preserved across sharing-mode switches and the key to reconnecting an excluded voter.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Voters experience zero unavailability attributable to editing: at every moment while a creator is editing or a save is under review, the poll can be viewed and voted on, and 100% of valid votes cast in that window are counted.
- **SC-002**: A poll never leaves any public or personal listing because its creator opened the editor or saved changes.
- **SC-003**: Approved changes are visible to voters within 10 seconds of saving under normal conditions.
- **SC-004**: Across any edit, the tallies of surviving choices are unchanged: for every choice present before and after a save, its vote count immediately after equals its count immediately before.
- **SC-005**: After a choice deletion, displayed results stay internally consistent: a single-choice poll's percentages sum to 100%, and no voter is permanently unable to vote (every voter whose vote was emptied can vote again on their first try).
- **SC-006**: 100% of deletions of voted choices are preceded by a confirmation naming each affected choice and its vote count; 0% of unvoted deletions prompt.
- **SC-007**: Text that fails review is never shown to a voter: 0 voter-visible exposures of rejected titles, subtitles or choice labels.
- **SC-008**: Creators use the same choices editor they already know: the editing flow for choices requires no new controls to learn, and a creator who has used the editor before can add and delete choices on a live poll without instruction.

## Assumptions

- **Second save while one is pending**: the requirements accept background review but do not say what a second save during review does; the spec assumes it is refused with a clear message (simplest rule; reviews normally resolve in seconds). A replace-the-pending-set rule can be introduced later without breaking this behaviour.
- **Votes for just-deleted choices**: a vote submitted for a choice that no longer exists is refused as invalid with a message saying the choice is no longer available, and the voter may vote again on the current choices.
- **Rejection notice**: the creator learns of a rejected review in the poll administration interface (as rejected screening is surfaced today); no new notification channel (such as email) is introduced.
- **Vote-count snapshot staleness**: the counts in the deletion confirmation are as of the start of the editing session and may lag live voting; the requirements explicitly chose this snapshot.
- **Open-but-unvoted polls**: unchanged — they keep today's full editing freedom; this feature neither narrows nor widens it (per the accepted freeze-scope resolution).
- **Line-graph availability toggle**: out of scope — this feature neither implements nor extends it; the per-poll toggle already exists and keeps its current editability.
- **Already-editable settings** (title, subtitle, colours, end date, line-graph availability): remain editable as today; this feature changes when their edits take effect (no unavailability), not whether they can be made.
