# Feature Specification: Single-Email Invitation

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "requirements/20261027-133129-single-email-invite/requirements.md"

**Source requirements**: `requirements/20261027-133129-single-email-invite/requirements.md` (the requirements, with every finding of the review folded in under "Requirements Decisions").
**Requirements report**: `requirements/20261027-133129-single-email-invite/requirements-report.md` (5 diagrams, 3 research results and 15 findings, all resolved).

## Clarifications

### Session 2026-10-27

- Q: Does "Sign out and continue" finish the sign-in in one press, or lead to the ordinary confirmation card? → A: One press: it signs out, signs in as the invited address and shows the poll; when the invited address has no account, the Terms box is on that card and the button stays disabled until it is ticked.
- Q: Does signing in from the invitation count as confirming the address? → A: Yes: Continue marks the address as confirmed, for a new account and for an existing account not yet confirmed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A new invitee reaches the poll from the invitation alone (Priority: P1)

Someone with no CrowdPoll account is invited to an Invitation Only poll.
The invitation email's button opens a short confirmation card that names their address ("Continue as j•••@gmail.com") and shows the Terms of Service box.
They tick the box and press Continue.
They are signed in, with an account created for the invited address, and see the poll maximized on the Shared With You tab.
No other email is sent to them.

**Why this priority**: Today such an invitee receives three emails (the invitation, a "create an account" email and a sign-in link) and lands on Trending if anything goes wrong; one email is the whole point of the feature.

**Independent Test**: Invite an address that has no account to an open Invitation Only poll, open the invitation's button in a fresh browser, tick the Terms box, press Continue, and see the poll maximized on Shared With You; confirm the mailbox received only the invitation.

**Acceptance Scenarios**:

1. **Given** an invitation sent to an address with no account, **When** its button is opened, **Then** a confirmation card shows the masked invited address, the Terms box (unticked) and the Stay signed in box, and nothing has been signed in or created yet.
2. **Given** that card, **When** the Terms box is not ticked, **Then** its Continue button is disabled.
3. **Given** that card with the Terms box ticked, **When** Continue is pressed, **Then** an account for the invited address exists with the current Terms accepted and an empty name, the browser is signed in, and the poll is shown maximized on Shared With You.
4. **Given** the whole journey, **When** it is complete, **Then** the invitee's mailbox has received exactly one message from CrowdPoll: the invitation.
5. **Given** an address on no pre-launch allowlist while the allowlist is on, **When** Continue is pressed, **Then** nothing is created or signed in, and the existing "not launched" message is shown.

---

### User Story 2 - An existing account holder reaches the poll in one click (Priority: P1)

Someone who already has an account, but is not signed in on this browser, opens the invitation's button.
The confirmation card names their address, with no Terms box (they accepted the Terms already).
They press Continue and see the poll maximized on Shared With You.

**Why this priority**: The same one-email promise for the other half of invitees; today they receive two emails.

**Independent Test**: Invite an address that has an account, open the button in a signed-out browser, press Continue, and see the poll maximized.

**Acceptance Scenarios**:

1. **Given** an invitation to an address with an account and a signed-out browser, **When** the button is opened, **Then** the card shows the masked address and the Stay signed in box, and no Terms box.
2. **Given** that card, **When** Continue is pressed, **Then** the browser is signed in as that account and the poll is shown maximized on Shared With You.
3. **Given** an account that has not accepted the current Terms, **When** it signs in this way, **Then** it is taken through the existing Accept Terms page and then to the poll.
4. **Given** a browser already signed in as the invited address, **When** the button is opened, **Then** no card is shown and the poll is shown maximized at once.

---

### User Story 3 - Every poll link lands on the poll, maximized (Priority: P2)

Whenever a signed-in visitor follows a link to a poll they may see, the poll is shown maximized on the tab the link leads to, whether or not that tab already listed it.

**Why this priority**: Today the poll is maximized only when its card is already on the tab; otherwise it is added to the tab and the visitor must find it.

**Independent Test**: Open a link to an Invitation Only poll that is not yet in the visitor's Shared With You list, and see it maximized.

**Acceptance Scenarios**:

1. **Given** a poll link whose poll is already on the landing tab, **When** it is followed, **Then** the poll is shown maximized (as today).
2. **Given** a poll link whose poll is not yet on the landing tab, **When** it is followed, **Then** the poll is shown maximized.
3. **Given** a maximized poll reached this way, **When** the visitor presses Escape or clicks the active tab, **Then** the tab is shown with the poll in it.
4. **Given** a poll the visitor may not see, **When** its link is followed, **Then** the existing notice explains it, as today.

---

### User Story 4 - A browser signed in as someone else (Priority: P2)

The invitation reaches a person who reads it in a browser signed in under a different address, for example because the invited address forwards to their usual inbox.
The confirmation card says the invitation is for another address and lets them switch or stay.

**Why this priority**: A forwarded invitation (such as an alias forwarded to a personal inbox) is the most likely reason an invitee saw "That poll isn't available." today.

**Independent Test**: Sign in as address B, open an invitation sent to address A, see the message and both choices; choose each in turn.

**Acceptance Scenarios**:

1. **Given** a browser signed in as another address, **When** the invitation's button is opened, **Then** the card shows "This invitation is for <masked invited address>. Sign out and continue as that address to see the poll. Or ask the poll creator to resend the invitation to your current address." above two buttons: "Sign out and continue as <masked invited address>" and "Stay as <current address>"; when the invited address has no account, the card also shows the Terms box, and "Sign out and continue" stays disabled until it is ticked.
2. **Given** that card, **When** "Sign out and continue" is pressed, **Then**, in that one press, the current session ends, the visitor is signed in as the invited address (its account created first if it has none), and the poll is shown maximized.
3. **Given** that card, **When** "Stay as <current address>" is pressed, **Then** the visitor goes to the home page under their current account with no further notice, and the invitation stays with the invited address.

---

### User Story 5 - Old, used and expired links still lead somewhere sensible (Priority: P3)

An invitee clicks an invitation after a reminder has replaced it, or a second time, or after the link has expired.
The link no longer signs anyone in, but still leads to the poll by the ordinary route: sign in as usual, then the poll.

**Why this priority**: Old emails stay in inboxes; they must not dead-end.

**Independent Test**: Send an invitation and then a reminder; open the first email's button and see the ordinary sign-in route to the poll instead of a confirmation card.

**Acceptance Scenarios**:

1. **Given** an invitation whose link was replaced by a later reminder or resend, **When** the older button is opened, **Then** it behaves as today's poll link (sign-in page for a signed-out browser, the poll for a signed-in invitee).
2. **Given** a link already used to sign in, **When** it is opened again from any browser, **Then** it behaves as today's poll link.
3. **Given** a link past its lifetime, **When** it is opened, **Then** it behaves as today's poll link.
4. **Given** an address removed from the poll, **When** its old link is opened, **Then** it behaves as today's poll link, which does not show the poll.
5. **Given** a link with no valid poll in it, **When** it is opened, **Then** a signed-out browser sees the sign-in page's existing invalid-link message and a signed-in one goes to the home page.

---

### Edge Cases

- **A mail scanner opens the link before the person does**: opening the link only shows the card; nothing is signed in, created or used up until Continue is pressed.
- **The poll closes before the invitee clicks**: the link stops signing in at the close; it then behaves as today's poll link.
- **The poll stays open longer than 30 days**: the link stops signing in 30 days after the email was sent.
- **The Continue button is pressed twice, or from two tabs**: only the first signs in; the second behaves as a used link.
- **The invitation is forwarded to a stranger**: they can sign in only as the invited address, once, and only with the newest link; the email asks the reader not to forward it.
- **Sign-in is set to providers only**: the invitation keeps today's poll link, which leads to the provider sign-in; no confirmation card exists.
- **Sign-in offers both email and providers**: the card also offers the providers; choosing one signs in whatever account the provider names, which may differ from the invited address (User Story 4 then applies on the next visit).
- **Too many attempts from one client**: Continue is refused with the existing rate-limit message, as for the other sign-in routes.

## Requirements *(mandatory)*

### Functional Requirements

**The invitation link**

- **FR-001**: Each invitation and reminder email of an Invitation Only poll MUST carry a link that names the poll and holds a personal, unguessable sign-in token for that poll and invited address.
- **FR-002**: Each send MUST issue a new token for that invitation and make every earlier token of the same invitation stop signing in.
- **FR-003**: A token MUST sign in only the address it was issued for, at most once, and only until the earlier of the poll closing and 30 days after it was sent.
- **FR-004**: Removing an address from the poll MUST make its token stop signing in.
- **FR-005**: The system MUST store no token in a form that would sign anyone in if read from storage, and MUST never write a token to a log.
- **FR-006**: Both the invitation and the reminder MUST carry, under the button, the sentence "This button signs you in to CrowdPoll as <invited address>. Please don't forward this email.", with the address in full.
- **FR-007**: When sign-in is set to providers only, the invitation and reminder MUST keep today's poll link and leave out the FR-006 sentence.

**Opening the link**

- **FR-008**: Opening the link MUST NOT sign in, create an account, record acceptance or use up the token, except as FR-012 says.
- **FR-009**: For a signed-out browser and a token that can still sign in, opening the link MUST show a confirmation card that names the masked invited address and offers Continue and a Stay signed in box.
- **FR-010**: When the invited address has no account, the card MUST also show the Terms of Service box used on Create Account, and Continue MUST stay disabled until it is ticked.
- **FR-011**: The Stay signed in box MUST start ticked or clear exactly as the Login page's box does, and MUST shape the session exactly as that box does.
- **FR-012**: For a browser already signed in as the invited address (matched as addresses are matched elsewhere), opening the link MUST show the poll at once, with no card, and MUST use up the token.
- **FR-013**: For a browser signed in as another address, the card MUST show the User Story 4 message and its two choices, and act on them as User Story 4 says; "Sign out and continue" MUST act as Continue does (FR-017–FR-020) in the same press, after ending the current session, and MUST stay disabled behind the Terms box when the invited address has no account.
- **FR-014**: When sign-in offers both email and providers, the card MUST also offer the provider buttons.
- **FR-015**: A link whose token cannot sign in (replaced, used, expired, revoked or unknown, or its poll closed, archived or no longer Invitation Only) MUST behave exactly as today's poll link for its poll.
- **FR-016**: A link with no valid poll MUST send a signed-out browser to the sign-in page's existing invalid-link message and a signed-in browser to the home page, saying nothing about whether any poll exists.

**Continuing**

- **FR-017**: Continue MUST refuse, with the existing messages, when the address is not allowed by the pre-launch allowlist, when the client has made too many sign-in attempts (the limit shared with the emailed sign-in links, `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW` per `ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW`; only a press that would sign in counts, not one refused for the Terms box or for a token that can no longer sign in), or when the request does not come from the site's own page.
- **FR-018**: When the token can still sign in, Continue MUST create the account if the address has none (empty name, default permissions, the current Terms accepted), mark the account's address as confirmed (as using an emailed sign-in link does), sign the browser in as that address, use up the token, and show the poll.
- **FR-019**: When the token can no longer sign in by the time Continue is pressed, Continue MUST behave as today's poll link (FR-015).
- **FR-020**: An account that has not accepted the current Terms MUST pass through the existing Accept Terms page before the poll, as today.

**Landing**

- **FR-021**: An invitee of an Invitation Only poll MUST land on the Shared With You tab; every landing that names a poll MUST show that poll maximized, whether or not the tab already listed it.
- **FR-022**: Being shown the poll this way MUST count as accepting the invitation, as following the poll link does today.
- **FR-023**: Where the poll may not be shown, the existing notice MUST explain it, as today.

**Unchanged**

- **FR-024**: Today's poll link, the Login page, Create Account, emailed sign-in links and their emails MUST behave as before; emails already sent keep working as before.

### Key Entities

- **Invitation sign-in token**: belongs to one invitation (one poll and one invited address); has a sent time, an expiry (the earlier of the poll's close and 30 days after sending) and a used flag; only the newest one per invitation can sign in.
- **Invitation** (existing): gains its current token; its status rules (Invited, Accepted, Voted…) are unchanged.
- **Account** (existing): may now be created by Continue, with the invited address (confirmed), an empty name and the current Terms accepted; an existing account's address becomes confirmed when it continues from an invitation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An invitee with no account reaches the poll after receiving exactly one email from CrowdPoll, down from three.
- **SC-002**: An invitee with an account reaches the poll after receiving exactly one email, down from two.
- **SC-003**: From opening the invitation's button, a new invitee sees the poll in at most two actions (tick the Terms box, press Continue); an existing account holder in one.
- **SC-004**: In 100% of landings that name a poll the visitor may see, the poll is shown maximized.
- **SC-005**: A link opened by an automated mail scanner leaves the invitee's link able to sign them in afterwards, in 100% of cases.
- **SC-006**: A replaced, used or expired invitation link never leads to an error page; it always leads to the ordinary sign-in route to the poll.

## Assumptions

- Only Invitation Only polls send invitations, so only they carry a token.
- "Matched as addresses are matched elsewhere" means the existing email-key rule (case, Gmail-style dots and plus tags); forwarding between different addresses is never a match.
- The confirmation card follows the look of the existing sign-in cards.
- An account created by Continue starts with the same default permissions as any new account.
- The 30-day ceiling and the "until the poll closes" rule use the poll's end time as stored; a poll with no end time uses the 30 days.
- The address shown on the card is masked as elsewhere (`j•••@gmail.com`); the email shows it in full, since it goes to that address.
- No new setting is added.
