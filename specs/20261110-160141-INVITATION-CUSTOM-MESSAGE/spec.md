# Feature Specification: Invitation Custom Message

**Feature Branch**: `20261110-160141-INVITATION-CUSTOM-MESSAGE`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "requirements/20261110-160141-invitation-custom-message/requirements.md"

## User Scenarios & Testing *(mandatory)*

The creator of an **Only people you invite** poll adds people by email address, and CrowdPoll sends each of them an invitation email in the creator's name.
Today that email is the same for every poll: who invited you, the poll's title, how the poll works and a button to open it.
The creator has no way to say why they are asking, or what they want the invitees to think about.
This feature adds an optional **Custom Email Message** to the wizard's first step, which appears in a shaded box in every invitation and reminder for that poll.

### User Story 1 - Write a message that invitees receive (Priority: P1)

A creator setting up an Only people you invite poll writes a few lines in **Custom Email Message**, with some words in bold, and publishes the poll.
When the poll opens, each invitee's email shows the message in a shaded box directly below the "… invited you to vote …" paragraph, with its line breaks and formatting.

**Why this priority**: it is the whole point of the feature: invitees see the creator's own words.

**Independent Test**: create an Only people you invite poll with a two-line message containing bold and italic words, publish it, let it be approved, invite one address, and check the email received: the box is below the first paragraph, both lines are there, the formatting shows, and the plain-text version has the same words.

**Acceptance Scenarios**:

1. **Given** the wizard's Step 1 "Who can vote" with **Only people you invite** selected, **When** the creator looks at the step, **Then** a **Custom Email Message** field appears directly under the **Only people you invite** radio button, before the next answer, with each answer's section separated from the next by a line, and with the support text "Optional. Added to the invitation email we send to the people you invite." and a counter "0 / 1000".
2. **Given** the field, **When** the creator chooses its "... edit" button, **Then** the same editor as the Notes field opens, accepting several lines and bold, italic and underline.
3. **Given** an approved, open poll with a message, **When** an invitation is sent, **Then** the email shows the message, formatted, in a light grey rounded box directly after the "… invited you to vote …" paragraph, and the plain-text version of the email carries the message's text at the same place.
4. **Given** an approved, open poll with no message (or only spaces and blank lines), **When** an invitation is sent, **Then** the email is exactly as it is today, with no box and no extra paragraph.
5. **Given** a poll with a message, **When** the creator re-sends an invitation to someone (a reminder), **Then** the reminder carries the message too.
6. **Given** a message containing text that looks like HTML (e.g. `<a href=…>`), **When** the invitation is sent, **Then** it shows as plain characters, never as a link, image or markup.

---

### User Story 2 - The Settings Summary says a message is set (Priority: P2)

While moving through the wizard, the creator sees in the Settings Summary that a custom message has been entered, and can jump back to it.

**Why this priority**: it confirms the message is there without opening Step 1; it depends on Story 1's field.

**Independent Test**: with a message entered, check the summary line and follow its link; clear the message and check the line is gone.

**Acceptance Scenarios**:

1. **Given** an Only people you invite poll with a non-blank message, **When** the Settings Summary is shown, **Then** directly after the line "Your poll is a Private Poll. Only people you invite by email can vote. …" there is a separate line, `A Custom Invitation Email Message has been entered.`.
2. **Given** that line, once Step 1 has been answered, **When** the creator chooses it, **Then** Step 1 opens with the Custom Email Message field focused.
3. **Given** the message is blank, or the poll is not Only people you invite, **When** the summary is shown, **Then** the line is absent.

---

### User Story 3 - The message is kept, limited and reviewed like the notes (Priority: P2)

The creator can edit the message later, change the poll's sharing and change it back, and the message is held to the same rules as the poll's notes before anyone receives it.

**Why this priority**: the message is emailed under CrowdPoll's name to people who never signed up, so it must not bypass review; and losing a written message to a radio tap would frustrate creators.

**Independent Test**: write a message, switch the poll to "Anyone you send the link to", save, switch back and check the message is still there; save a message with an unacceptable word and check the poll is rejected; on a poll that has votes, change the message and check invitations sent before approval still carry the old message.

**Acceptance Scenarios**:

1. **Given** a message of 1000 characters, **When** the creator types more, **Then** the counter shows the excess as an error and the editor's Done is refused, as for the notes; the server refuses a longer message with the same "too long" message as other fields.
2. **Given** a poll with a saved message, **When** the creator switches the poll to "Anyone you send the link to" or "Everyone on CrowdPoll" and saves, **Then** the field and the summary line disappear, no email carries the message, and the message is kept.
3. **Given** that poll, **When** the creator switches back to Only people you invite, **Then** the field shows the kept message and later invitations carry it.
4. **Given** a message with language Acceptability Screening rejects, **When** the poll is published or sent for review, **Then** it is rejected exactly as for unacceptable notes, and the rejection asks the creator to revise the message too.
5. **Given** a published poll that has votes, **When** the creator changes the message and saves, **Then** the change waits for approval with any title, subtitle or notes change; until it is approved, invitations and reminders carry the approved message.
6. **Given** invitations already sent, **When** the creator edits the message, **Then** those emails are not changed or re-sent; later invitations and reminders carry the message current when they are sent.

---

### User Story 4 - The message stays private to the creator (Priority: P3)

Voters see the poll; only the invitees' inboxes and the creator's admin card see the message.

**Why this priority**: the message is written for the email; showing it on the card would surprise creators. It is a guard on Story 1 rather than a new capability.

**Independent Test**: set a message, then check the poll card, the tabs, the public poll page and the live updates a voter receives: none contains the message.

**Acceptance Scenarios**:

1. **Given** a poll with a message, **When** a voter or visitor loads any view of the poll, **Then** the message is not present in anything their browser receives.
2. **Given** the poll's creator or an administrator, **When** they open the poll in the admin card, **Then** the message is there to read and edit.
3. **Given** a poll with a message, **When** the creator duplicates it, **Then** the copy has the same message along with the same invitee list.
4. **Given** a voter watching the poll, **When** a save changes only the message and sends no other field, **Then** the voter's copy of the poll is not refreshed for it; a wizard save, which sends every field, refreshes it as any save does today.

---

### Edge Cases

- **Blank message**: a message holding only spaces, line breaks or formatting marks with no text is stored as empty and behaves as no message.
- **Exactly 1000 characters**: accepted; 1001 refused. The count is of the stored text, formatting marks included, as for the notes.
- **Unbalanced formatting marks** (e.g. a single `**`): shown as the literal characters, as in the notes.
- **Very long word or link text**: wraps inside the box rather than widening the email.
- **Poll not yet open**: nothing is sent, as today; the message goes with the invitations once the poll opens.
- **Hidden message changed**: the field is hidden unless the poll is Only people you invite, so a hidden message cannot be edited; it is still part of the poll's reviewed content, and a change made while the field was visible and not yet approved stays pending until approved.
- **Rejection naming a hidden message**: a kept message is screened even while its field is hidden, so a rejection can name the custom email message; the creator switches the poll back to Only people you invite to see and edit it.
- **Public poll**: the field never appears; any kept message is never sent, since public polls send no invitations.
- **Email client without HTML**: the plain-text version carries the message's words, with its line breaks, without formatting marks.
- **Social sign-in mode**: invitations whose button links to the poll instead of a sign-in link carry the message the same way.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The wizard's Step 1 "Who can vote" MUST show a **Custom Email Message** field while **Only people you invite** is selected, and MUST NOT show it for any other answer.
- **FR-002**: The field MUST be placed directly under the **Only people you invite** radio button, before the next answer (each answer's section is separated from the next by a line), labelled `Custom Email Message`, with the support text `Optional. Added to the invitation email we send to the people you invite.` and a counter `n / 1000`.
- **FR-003**: The field MUST behave as the Notes field of Step 2: a preview with a "... edit" button and chevron, an editor that keeps line breaks and offers bold, italic and underline with the same markup, and Done refused while the text is over the limit.
- **FR-004**: The message MUST be limited to 1000 characters of stored text, formatting marks included, in the browser's counter and on the server; the server MUST refuse a longer message with the same message as other over-long fields, naming it `Custom email message`.
- **FR-005**: A message with no visible text MUST be stored as empty.
- **FR-006**: Every invitation and every reminder for a poll with a non-empty message MUST show it, as the message stands when that email is sent, in a light grey, rounded box directly after the "… invited you to vote …" paragraph, at the email's body text size, with its line breaks and formatting; the plain-text version MUST carry its text, without formatting marks, as its own paragraph at the same place.
- **FR-007**: With an empty message, invitations and reminders MUST be unchanged from today.
- **FR-008**: The message MUST reach the email only through the same safe rendering as the notes: any characters that look like markup are shown as text.
- **FR-009**: Emails already sent MUST NOT be changed or re-sent when the message changes.
- **FR-010**: The message MUST be kept when the poll is switched to another "Who can vote" answer; while the poll is not Only people you invite, it MUST NOT be shown in the wizard or sent; switching back MUST show and use it again.
- **FR-011**: The Settings Summary MUST show, as a separate line directly after its "Who can vote" line, `A Custom Invitation Email Message has been entered.` when the poll is Only people you invite and the message is not empty; the whole sentence MUST open Step 1 with the field focused.
- **FR-012**: The message MUST go through Acceptability Screening with the title, subtitle and notes, and the screening's rejection text MUST name it, as the "custom email message", among the things to revise.
- **FR-013**: On a published poll that has votes, a changed message MUST wait for approval with the other reviewed text; until approved, emails MUST carry the approved message.
- **FR-014**: The message MUST be returned only to the poll's creator and administrators, in the admin view of the poll; it MUST NOT appear in poll card, tab, live update or public page data.
- **FR-015**: A write that changes only the message, sending no other field, MUST NOT cause voters' copies of the poll to refresh; a wizard save, which sends every field, refreshes them as any save does today.
- **FR-016**: Duplicating a poll MUST copy its message.
- **FR-017**: Existing polls MUST start with an empty message and keep sending today's invitation.
- **FR-018**: The project documentation MUST describe the feature: the README's "Inviting people" section, the API description, and the architecture notes on the invitation email.

### Key Entities

- **Poll (existing)**: gains one attribute, its **invitation message**: optional text of up to 1000 characters with the notes' formatting, empty by default, reviewed with the poll's other text, copied by Duplicate, visible only to the creator and administrators.
- **Pending update (existing)**: the reviewed text waiting for approval on a published poll with votes; it may now hold a changed invitation message.
- **Invitation email (existing)**: gains an optional message box in its HTML version and a matching paragraph in its plain-text version.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a poll with a message, 100% of invitations and reminders sent after approval contain the message's full text, in both the formatted and plain-text versions.
- **SC-002**: For a poll without a message, the invitation email is identical to today's, word for word.
- **SC-003**: A creator can add a message to a new Only people you invite poll in under one minute, without leaving Step 1.
- **SC-004**: No message reaches an invitee without having passed the same review as the poll's notes; a test with an unacceptable word is rejected every time.
- **SC-005**: No message is present in anything a voter's or visitor's browser receives (verified by inspecting every response the poll's pages load).
- **SC-006**: The message box renders legibly in the major email clients (web and phone) at a 600-pixel and a phone-width layout, with no horizontal scrolling.

## Assumptions

- "The 'Who' tab 1" is the wizard's Step 1 "Who can vote"; "the 'Title' tab" is Step 2 "Title & Tags"; "summary wizard" is the wizard's Settings Summary; "... edit V" is the Notes preview's "... edit" button with its chevron.
- The message has no attribution of its own: the paragraph above it already names the creator.
- Invitations continue to be sent only while the poll is open, within the creator's daily invitation allowance; this feature changes their content only.
- The Privacy Policy's Invitations section already covers emailing invitations at the creator's request; adding the creator's own words to that email does not change what personal data is used, so the Terms and Privacy versions do not change.
- Edits to a published poll that has no votes are re-screened whole, as today: while the poll waits for screening, its invitees cannot open it.
- No new cookie, browser storage key or dependency is needed; one data migration adds the message to polls.
- The wait before a reminder may be sent, fixed at 24 hours before this feature, becomes the setting `ENV_INVITATION_RESEND_WAIT` (default 24 hours), so reminders can be tried with a short wait in development (TWEAK03).
