# Feature Specification: Poll Invitations

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "requirements/20261026-085056-poll-invitations/requirements.md"

**Source requirements**: `requirements/20261026-085056-poll-invitations/requirements.md` (the requirements, with every finding of the review folded in under "Resolved Requirements").
**Requirements report**: `requirements/20261026-085056-poll-invitations/requirements-report.md` (4 diagrams and 25 findings, all resolved).
**Reference**: `requirements/20261026-085056-poll-invitations/invite-design.jpg`, the admin poll card of an open Invitation Only poll today.
**Design drafts**, in the same folder and opened from disk: `admin-card.html` (the admin card with the Invitees panel drawn on it) and `invitation-email.html` (the invitation email and its reminder).

## Clarifications

### Session 2026-10-26

- Q: When a poll first opens with more invitations waiting than the creator's remaining daily limit, what happens to the rest? → A: As many as the limit allows are sent at once; the rest stay `Not sent yet` and are sent automatically as the rolling 24-hour window frees up.
- Q: When a removed address is added back to the same poll, is it a new invitation? → A: No, it is the same invitation: no new email if one was already sent, and the one-reminder allowance and the 24-hour wait carry over.
- Q: What does a row's Resend do while the poll is not open (being edited, waiting to open, awaiting approval)? → A: It is unavailable, with the reason "The poll is not open.", and becomes available again when the poll reopens.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A creator invites people by email (Priority: P1)

The creator of an Invitation Only poll opens its admin card and finds an Invitees panel below the counts.
They paste one or several email addresses into its field, separated by commas, spaces or new lines.
Each valid address becomes a row in the list; each address that cannot be added is shown with the reason.
Once the poll is open, each newly invited person is sent an invitation email with a link to the poll.

**Why this priority**: Today an Invitation Only poll has no way to invite anyone from the interface, so it cannot get a single voter. This story alone makes such a poll usable.

**Independent Test**: Create an Invitation Only poll, open it, paste three addresses (one invalid), see two rows and one refusal with its reason, and see an invitation email arrive at each of the two addresses with a link that opens the poll.

**Acceptance Scenarios**:

1. **Given** an open Invitation Only poll the user created, **When** they open its admin card, **Then** an Invitees panel with an add field is shown below the counts panel.
2. **Given** a poll that is not Invitation Only, **When** its admin card is open, **Then** no Invitees panel is shown.
3. **Given** the add field, **When** the creator pastes several addresses separated by commas, spaces or new lines and confirms, **Then** each valid address is added and each refused address is listed with its reason (invalid, already invited, banned, over the voter limit, not allowed before launch); on an open poll, an address past the creator's daily invitation limit is added and waits as `Not sent yet`, and the summary says how many will be sent as the limit frees up.
4. **Given** an address already invited, **When** the creator adds the same address with a different spelling of the same mailbox (for example the same Gmail address with dots), **Then** it is refused as already invited.
5. **Given** the poll is open, **When** an address is added, **Then** an invitation email is sent to it straight away.
6. **Given** the poll is not open yet (being created, awaiting approval, rejected, or waiting for its start date), **When** an address is added, **Then** no email is sent and the invitee shows `Not sent yet`; **When** the poll first opens, **Then** every pending invitation is sent at once.
7. **Given** the poll is open, **When** the creator adds an invitee, **Then** voting on the poll is not paused and the poll's state does not change.

---

### User Story 2 - A creator sees who has accepted and who has voted (Priority: P1)

The Invitees panel lists every invitee with a status chip: `Not sent yet`, `Not delivered`, `Invited`, `Accepted` or `Voted`.
The counts panel shows `Accepted Count` beside `Invitation Count`.
The list pages like the poll card's Participants and refreshes on its own.

**Why this priority**: Seeing who responded is the second half of the requirement, and the creator's main reason to open the card once invitations are out.

**Independent Test**: With three invitees, have one sign in and open the poll and another vote; within one admin refresh see `Invited`, `Accepted` and `Voted`, `Accepted Count` 2 and `Invitation Count` 3.

**Acceptance Scenarios**:

1. **Given** an invitee has been sent an email and has done nothing, **When** the creator looks at the panel, **Then** their chip reads `Invited`.
2. **Given** an invitee has signed in and opened the poll, from their Shared With You tab or from the poll's link, **When** the creator looks at the panel, **Then** their chip reads `Accepted`.
3. **Given** an invitee has voted, **When** the creator looks at the panel, **Then** their chip reads `Voted`, and they also count as accepted.
4. **Given** an invitation email could not be delivered, **When** the creator looks at the panel, **Then** that invitee's chip reads `Not delivered`.
5. **Given** more invitees than one page holds, **When** the creator looks at the panel, **Then** the list is paged with the same page size as the poll card's Participants.
6. **Given** the admin card is open, **When** an invitee's status changes, **Then** the panel shows the change within one admin list refresh, without the creator reloading the page.
7. **Given** an invitee whose account name is known, **When** the creator looks at their row, **Then** it shows their name beside the address.

---

### User Story 3 - An invitee responds to the invitation (Priority: P2)

An invited person receives an email whose subject and heading name the poll.
It says who invited them and why CrowdPoll is writing, that the poll is Invitation Only and private, and whether their vote will be anonymous to the creator.
It gives the date and time the poll started and, when it has one, when it ends, in the creator's time zone.
It links to the poll, says they may simply ignore it, and that CrowdPoll will then not contact them again except for up to one reminder about this poll, a future private invitation, or where the law requires it; it links to the Privacy Policy.
Following the link, they sign in (creating an account if they have none), see the poll and can vote.

**Why this priority**: The invitation is only useful if the email is trustworthy and the link works; but the creator's side (US1, US2) is what is missing today.

**Independent Test**: Invite an address with no account to a poll with an end date, open the email and compare it with the approved draft, follow the link, create the account, accept the Terms, and land on the poll able to vote.

**Acceptance Scenarios**:

1. **Given** an invitation email, **When** the invitee reads it, **Then** its wording is the approved draft's (FR-016 to FR-022): the subject and heading name the poll, it names the creator by user name and email address, says why CrowdPoll is writing, says the poll is Invitation Only and private, says whether their vote is anonymous to the creator, says they may ignore it, describes the one possible reminder and links to the Privacy Policy.
2. **Given** an open poll with an end date, **When** an invitation is sent, **Then** the email shows `Poll Started:` and `Poll Ends:` just above the button, in the creator's time zone with the zone's name; **Given** a poll with no end date, **Then** only `Poll Started:` is shown.
3. **Given** a reminder, **When** the invitee reads it, **Then** its subject and heading begin with `Reminder:`, it says this is the only reminder about the poll, and its `Poll Ends:` shows the end date as it is when the reminder is sent.
4. **Given** a signed-out invitee, **When** they follow the link, **Then** they are taken through sign-in (or account creation) and land on the poll.
5. **Given** an invitee signed in with a different spelling of the invited mailbox, **When** they open the poll or vote, **Then** they are recognized as invited.
6. **Given** a person who was not invited, **When** they open the poll's link, **Then** they cannot vote, as today.

---

### User Story 4 - A creator removes an invitee or sends a reminder (Priority: P2)

From an invitee's row the creator can remove the invitation, or resend it once as a reminder.

**Why this priority**: Managing the list after it is sent is part of the requirement, but a poll is usable without it.

**Independent Test**: Remove an invitee who has not voted and see them leave the list and lose access; resend to another, see the reminder arrive and the Resend control become unavailable with its reason.

**Acceptance Scenarios**:

1. **Given** an invitee who has not voted, **When** the creator removes them, **Then** they leave the list, the counts update, and they can no longer vote in the poll.
2. **Given** an invitee who has voted, **When** the creator removes them, **Then** a confirmation says their vote will be removed, and only on confirming are they and their vote removed.
3. **Given** an invitee emailed more than 24 hours ago who has not been reminded, **When** the creator resends, **Then** a reminder email is sent.
4. **Given** an invitee already reminded, or emailed less than 24 hours ago, **When** the creator looks at the row, **Then** Resend is unavailable and says why.
5. **Given** a poll that is not open (being edited, waiting to open, or awaiting approval), **When** the creator looks at a row, **Then** Resend is unavailable with the reason "The poll is not open.", and is available again once the poll reopens.
6. **Given** a CLOSED or ARCHIVED poll, **When** its admin card is open, **Then** the list can be read but not changed.

---

### User Story 5 - The design is worked out on stand-alone copies first (Priority: P3)

Before the production card and email change, a stand-alone copy of today's admin card for the reference poll, with the Invitees panel drawn on it, and a stand-alone draft of the invitation email are kept in the requirements folder.
Both already exist there; the production work follows them.

**Why this priority**: It de-risks the visual and written design, but delivers nothing to users by itself.

**Independent Test**: Double-click each stand-alone page in the requirements folder, with no server running: the card shows the reference picture's card with the Invitees panel, in light and dark, at desktop and phone width; the email shows the invitation and its reminder, with and without anonymous votes and an end date, as HTML and as plain text.

**Acceptance Scenarios**:

1. **Given** the requirements folder, **When** the stand-alone card is opened from disk, **Then** it shows the admin card of the reference poll as production draws it, with production class names and the Invitees panel, and needs no server.
2. **Given** the stand-alone card, **When** its light/dark switch is used, **Then** the card shows the production light and dark looks; at a 390 px wide window it shows the production phone layout.
3. **Given** the requirements folder, **When** the email draft is opened from disk, **Then** it shows each version of the email, drawn by the site's own email layout, with switches for the reminder, anonymous votes, a poll with no end date, and the plain-text part.

---

### Edge Cases

- A pasted list mixes valid, invalid, duplicate and banned addresses: the valid ones are added and every other one is listed with its reason; nothing is silently dropped.
- The list would exceed the poll's voter limit: the addresses that fit are added in the order given, and the rest are refused as over the limit.
- The creator's daily invitation limit is reached on an open poll: further addresses are still added, wait as `Not sent yet`, and are sent automatically, oldest first, as the limit frees up.
- More invitations are waiting when the poll first opens than the creator's remaining daily limit: as many as the limit allows are sent at once, and the rest stay `Not sent yet` and are sent automatically as the limit frees up.
- The pre-launch allowlist is on and an address is not on it: it is refused with "CrowdPoll has not launched for this address yet" and no email is sent.
- An invitee is banned: the ban withdraws the invitation, as today, and the invitee leaves the list.
- An invitee's email bounces or fails: the chip reads `Not delivered`; the creator may remove the address, or resend if a reminder is still available.
- The poll leaves OPEN for EDITING and returns: no invitation is sent again.
- Addresses added while the poll is being edited are emailed when it reopens; those already emailed are not emailed again.
- The poll closes before an invitation was ever sent: the invitation is never sent.
- The poll's start and end fall either side of a daylight-saving change: each date names the zone in force on that day (for example `EDT` on one line and `EST` on the other).
- The poll has no stored time zone (it was last saved before this feature): its email dates are written in UTC.
- The creator changes the end date after an invitation was sent: the sent email is not corrected; a later reminder shows the new end.
- An invitee deletes their CrowdPoll account: their invitations are removed, matched by mailbox as invitations are, and the counts update.
- Two people open the admin card of the same poll: each sees the other's changes on the next refresh.
- The creator removes an invitee and later adds the same address back (or another spelling of the same mailbox): no new invitation email is sent if one was already sent, and a reminder is available only if it was not used and 24 hours have passed since the last email.
- The creator adds their own address: it is treated like any other address.
- The creator has not invited themselves: they can still vote on their own poll (FR-041), and that vote does not count against the voter limit, so every invitee can still vote.

## Requirements *(mandatory)*

### Functional Requirements

**The Invitees panel**

- **FR-001**: The admin card of an Invitation Only poll MUST show an Invitees panel below the counts panel; the admin card of any other poll MUST NOT.
- **FR-002**: The panel MUST hold an add field and one row per invitee showing the address, the account's user name once known, and one status chip.
- **FR-003**: The status chip MUST show the furthest step reached, from `Not sent yet` or `Not delivered`, through `Invited` and `Accepted`, to `Voted`.
- **FR-004**: The rows MUST be paged with the same page size as the poll card's Participants list.
- **FR-005**: The counts panel MUST show `Accepted Count` beside `Invitation Count` for an Invitation Only poll.
- **FR-006**: The panel and counts MUST refresh with the admin list's existing refresh, without a page reload.
- **FR-007**: The panel MUST look and behave as the approved stand-alone card (FR-039).

**Adding invitees**

- **FR-008**: The add field MUST accept one or many addresses at once, separated by commas, spaces or new lines.
- **FR-009**: Each address MUST be validated; each address that is not added MUST be shown with its reason: invalid, already invited, banned, over the voter limit, or not allowed before launch.
- **FR-010**: Two addresses that reach the same mailbox, as the account system compares them, MUST be treated as one: the second is refused as already invited.
- **FR-011**: The number of invitees MUST NOT exceed the poll's voter limit.
- **FR-012**: While the pre-launch allowlist is on, an address that may not sign in MUST be refused with the reason "CrowdPoll has not launched for this address yet", and no email sent.
- **FR-013**: The list MUST be editable in every poll state except CLOSED and ARCHIVED.
- **FR-014**: Adding, removing or reminding MUST NOT pause voting, change the poll's state or send the poll for review.

**Invitation emails: when they are sent**

- **FR-015**: An invitation email MUST be sent to each newly added address when the poll is open; an address already invited MUST NOT be emailed again except by a reminder (FR-029).
- **FR-016**: While the poll is not yet open (being created, awaiting approval, rejected, or waiting for its start date), no invitation email MUST be sent; when the poll first becomes open, every invitation not yet sent MUST be sent, within the daily limit (FR-025); a poll returning to open after an edit MUST NOT resend.

**Invitation emails: what they say** (the approved wording is in the requirements' "Resolved Requirements", UA15 to UA18, and drawn in `invitation-email.html`)

- **FR-017**: The subject MUST name the creator and the poll: `<creator name> invited you to a private poll on CrowdPoll: "<title>"`; the heading MUST read `You are invited to vote in a Private Poll:` with `"<title>"` on the next line. Every other email the site sends MUST keep its one-line heading.
- **FR-018**: The email MUST name the inviting creator by user name and email address and say that this is why CrowdPoll has written; it MUST state that the poll is Invitation Only and private, and, when votes are anonymous to the creator, that the invitee's vote will be anonymous.
- **FR-019**: Just above the `Open the poll` button, the email MUST show `Poll Started: <date and time>` (when the poll was launched) and, only when the poll has an end date, `Poll Ends: <date and time>`, one line each, read when that email is sent; the plain-text part MUST carry them in the same place.
- **FR-020**: Those dates MUST be written in the creator's time zone with the zone's name, like `Monday, October 26, 2026, 12:59 PM EDT`, each naming the zone in force on its own date; a poll with no known creator time zone MUST be written in UTC.
- **FR-021**: The email MUST link to the poll with an `Open the poll` button, say the invitee may simply ignore it, and that CrowdPoll will then not contact them again except for up to one reminder about this poll if the creator re-sends it, another private invitation, or where the law requires it.
- **FR-022**: The email MUST carry a one-sentence statement about the invitee's personal data with a link to the Privacy Policy's section about invitations, and use the site's existing email layout.
- **FR-023**: A reminder MUST be the same email, with `Reminder: ` before the subject, a heading beginning `Reminder: you are invited to vote in a Private Poll:`, and a closing that says it is the only reminder about the poll.
- **FR-024**: The creator's time zone MUST be taken from the creator's browser whenever the admin card saves the poll or its invitees, and kept with the poll.

**Invitation emails: limits and failures**

- **FR-025**: A creator MUST NOT send more than a configurable number of invitation emails (default 200) in any rolling 24 hours; the limit is an operator setting documented with the other settings. An add past the limit MUST NOT be refused, on an open poll or one not yet open: the invitation MUST be added and MUST wait as `Not sent yet` and be sent automatically, oldest first, as the limit frees up.
- **FR-026**: An invitation whose email failed MUST show `Not delivered`.

**Managing invitees**

- **FR-027**: The creator MUST be able to remove an invitee; the removed person MUST lose the ability to vote in the poll and the poll MUST leave their Shared With You tab. Adding the same mailbox back to the same poll MUST restore the same invitation: no new invitation email if one was already sent, with the one-reminder allowance and the 24-hour wait carried over.
- **FR-028**: Removing an invitee who has voted MUST ask for confirmation, stating that their vote will be removed, and remove it only when confirmed.
- **FR-029**: The creator MUST be able to resend an invitation once per invitee per poll, no sooner than 24 hours after that invitee's last email, and only while the poll is open; otherwise Resend MUST be unavailable and say why ("The poll is not open." while it is not).
- **FR-030**: Banning MUST stay in the Banned Voter List, and a ban MUST withdraw the invitation.

**The invitee**

- **FR-031**: An invitee MUST be recognized as invited, for voting, for their Shared With You tab and for their status, when signed in with any address that reaches the invited mailbox (FR-010).
- **FR-032**: An invitee MUST count as accepted once signed in they open the poll, from their Shared With You tab or its link; there MUST be no separate accept step.
- **FR-033**: A vote MUST also count as acceptance.
- **FR-034**: A signed-out invitee following the email's link MUST be taken through sign-in or account creation and then to the poll.

**Privacy**

- **FR-035**: The Privacy Policy MUST describe the invitation email and its one reminder, sent at a poll creator's request, and how a person without an account can have their address removed.
- **FR-036**: Deleting an account MUST remove the person's invitations, matched by mailbox as in FR-010.
- **FR-037**: The Terms of Service version MUST NOT change.

**The stand-alone design drafts**

- **FR-038**: A stand-alone copy of the admin card for the reference poll MUST be kept in the requirements folder, built from the production card's own markup and styles (production class names, its styles gathered into one stylesheet, a small script for hover, ripple and tooltips), opening by double-click from disk with only relative paths and the fonts it needs beside it, and showing the light and dark looks at desktop width and at 390 px with a light/dark switch.
- **FR-039**: The Invitees panel MUST be drawn on that copy before the production admin card changes; the production panel follows it.
- **FR-040**: A stand-alone draft of the invitation email MUST be kept in the requirements folder, drawn by the site's own email layout from the approved wording, opening from disk, with switches for the reminder, anonymous votes, a poll with no end date and the plain-text part; the production email follows it.
- **FR-041** (TWEAK10): The creator of an Invitation Only poll MUST always be able to vote on it without an invitation; while they hold none, their vote MUST NOT count toward the poll's voter limit, and they take no place among the invitees.

### Key Entities

- **Invitation**: one invited address on one poll.
  Holds the address as the creator typed it, when it was added, when its email was last sent (none yet while the poll has not opened), whether its one reminder has been used, and whether its last email failed.
  Belongs to the poll; removed with the poll, by the creator, by a ban, or when the matching account is deleted.
  When the creator removes it, the poll keeps a record of when that mailbox was emailed and reminded, so adding it back does not email it again; this record is deleted with the poll or when the matching account is deleted.
- **Invitee status**: derived, never entered: `Not sent yet` or `Not delivered` from the invitation's email, `Accepted` from the invitee having opened the poll, `Voted` from the poll's votes; the furthest step reached is shown.
- **Daily invitation count**: the invitation and reminder emails a creator has sent in the last 24 hours, compared with the operator's limit.
- **Poll** (existing) gains the **creator's time zone**, set from the creator's browser when the admin card saves the poll or its invitees, and used only to write dates in emails.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A creator can invite 10 people to an open Invitation Only poll, by pasting their addresses once, in under 1 minute.
- **SC-002**: Every valid invited address receives exactly one invitation email per poll, plus at most one reminder; no invitation is ever emailed for a poll that never opened.
- **SC-003**: An invitee's change of status (accepted, voted) appears on the creator's open admin card within one admin refresh interval (5 seconds by default) in 100% of cases.
- **SC-004**: An invited person who signs in with any spelling of the invited mailbox can vote, in 100% of cases.
- **SC-005**: Adding, removing or reminding invitees on an open poll never interrupts voting: voters see no pause and no change of poll state.
- **SC-006**: Every address the creator enters is either added or shown with a reason; none is lost silently.
- **SC-007**: Every invitation and reminder sent matches the approved email draft word for word, with the poll's own title, creator and dates filled in.
- **SC-008**: The dates in an invitation read the same clock time the creator sees for the poll on their own admin card.
- **SC-009**: The stand-alone card and email draft open from disk with no server; the card matches the reference picture's content and layout at desktop width.

## Assumptions

- The invitation interface lives on the admin card on `/admin`, the creator's own poll card there; the voter's poll card is unchanged except that an accepted invitee is recognized as before.
- Only the poll's creator (or an administrator acting on it, as today) manages its invitees; anyone else is refused, as for other admin card actions.
- Invitation emails go through the site's existing email service and layout, with the existing masking of addresses in logs.
- The email's preview text stays `You're invited to vote in "<title>".` for both the invitation and the reminder.
- The admin list's existing refresh interval and the Participants page size are reused; no new display setting is added besides the daily invitation limit.
- "Poll Started" is when the poll was launched (opened), not its scheduled start; emails are sent only while a poll is open, so it is always known when one is written.
- The creator's time zone is the one their browser reports; a poll saved by an administrator acting on it takes the administrator's.
- The creator's own address is treated like any other address.
- A reminder counts toward the daily invitation limit.
- The existing behavior that a removed voter's vote is removed is kept (Breaking Change BC1 of the requirements report); FR-028 makes it explicit to the creator.
- The pre-launch allowlist and the Terms gate apply to invitees as to anyone signing in.
- Out of scope: inviting by anything other than email; invitations for polls that are not Invitation Only; an invitee declining explicitly; editing the invitation email's wording per poll; correcting emails already sent when a poll's dates change.
