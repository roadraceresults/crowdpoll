# Feature Specification: Link Preview Message

**Feature Branch**: `20261110-204911-LINK-PREVIEW-MESSAGE`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "requirements/20261110-202128-link-preview-message/requirements.md"

## User Scenarios & Testing *(mandatory)*

A poll's creator shares its link, `https://crowdpoll.vote/?PID=…`, by pasting it into a text message, WhatsApp, Google Messages or iMessage.
The messaging app shows a preview card under the link, built from the page the link leads to.
For a private poll that page is the login page, so today the card reads **Login** over **crowdpoll.vote** and says nothing about the poll.
This feature makes the card show the poll's title, its subtitle when it has one, and, for an **Only people you invite** poll, the creator's Custom Email Message, so the recipient knows what they are being asked before they tap.
Nothing changes for the person who taps the link: a visitor without a session still lands on the login page and, once signed in, on the poll; a signed-in user still lands on the poll directly.

## Clarifications

### Session 2026-11-10

- Q: Which address does the preview carry as the link's canonical address? → A: The shared link, `https://crowdpoll.vote/?PID=<pid>`, never the login page's own address.
- Q: Does the login page also carry the poll's preview metadata for a published public poll? → A: Yes: one rule for every published poll, public or private; a public poll's link still previews from its own public page, since it never reaches the login page.

### User Story 1 - The preview names the poll (Priority: P1)

The creator of a private poll copies its link from the admin card and pastes it into a message.
The preview card shows the poll's title where it used to say "Login", and the subtitle, when there is one, under it.

**Why this priority**: it is the visible defect in the requirements' screenshot, and it applies to every private poll, with or without a custom message.

**Independent Test**: fetch the shared link of a private, open poll the way a messaging app does (no cookies, following redirects), read the resulting page's title and preview description, and check they are the poll's title and subtitle; then open the same link in a browser with no session and check the login page is shown as today.

**Acceptance Scenarios**:

1. **Given** a private "Anyone you send the link to" poll that is open, with a title and a subtitle, **When** its shared link is pasted into Google Messages, WhatsApp or iMessage, **Then** the preview card shows the poll's title as its headline and the subtitle as its description, over the site's host name.
2. **Given** the same poll without a subtitle, **When** its link is previewed, **Then** the card's description reads "Vote and see live results: <title>", as a public poll's does.
3. **Given** the same poll, **When** a person without a session taps the link, **Then** the login page opens as today, with its browser tab titled "<title> · CrowdPoll", and after signing in they reach the poll.
4. **Given** the same poll, **When** a signed-in user taps the link, **Then** they reach the poll directly, as today.
5. **Given** a public open poll, **When** its link is previewed, **Then** the card is as today: the poll's title and subtitle, from the poll's own public page.

---

### User Story 2 - The preview carries the Custom Email Message (Priority: P1)

The creator of an **Only people you invite** poll wrote a Custom Email Message.
When the poll's link is shared by message, the card shows that message under the title and subtitle, so the invitee reads the creator's own words in the chat as well as in the email.

**Why this priority**: it is the stated goal of the feature; it builds on Story 1's card and adds the message to its description.

**Independent Test**: on an approved, open Only people you invite poll with a subtitle and a two-paragraph message with bold words, fetch the shared link as a messaging app does and check the description is the subtitle, a blank line, then the message's words as plain text; then edit the message on a poll with votes and check the description still carries the approved message until the edit is approved.

**Acceptance Scenarios**:

1. **Given** an approved, open Only people you invite poll with a subtitle and a Custom Email Message, **When** its link is previewed, **Then** the card's description is the subtitle, then a blank line, then the message as plain text, with no formatting marks.
2. **Given** the same poll without a subtitle, **When** its link is previewed, **Then** the description is the message alone.
3. **Given** a message whose words with the subtitle exceed 300 characters, **When** its link is previewed, **Then** the description is cut to 300 characters, the ellipsis included, at the server, before the app's own truncation.
4. **Given** a poll with votes whose creator changed the message, so the change awaits review, **When** its link is previewed, **Then** the description carries the message approved before the change, never the pending one.
5. **Given** a message containing text that looks like markup (e.g. `<b>` or `<a href=…>`), **When** its link is previewed, **Then** the characters appear as written and nothing of the page is altered by them.
6. **Given** the wizard's Custom Email Message field, **When** the creator reads its support text, **Then** it says the message is also shown in link previews when the poll's link is shared.

---

### User Story 3 - Only published polls are previewed (Priority: P2)

A link shared before the poll opens, or after it is archived or rejected, previews as the plain login page, as today; a closed poll still previews with its title, since its results can be viewed.

**Why this priority**: it keeps a poll that is not yet, or no longer, available from being announced by its link, and it bounds what the login page reveals.

**Independent Test**: preview the links of a draft poll, a poll awaiting approval, an open poll, a closed poll and an archived poll, and an unknown PID; only the open and closed polls yield the poll's title.

**Acceptance Scenarios**:

1. **Given** a private poll that is open or closed, **When** its link is previewed, **Then** the card shows the poll's title (and, when the poll is under edit, the title it had before the edit).
2. **Given** a private poll that is a draft, awaiting approval, rejected or archived, or a link whose PID matches no poll, **When** its link is previewed, **Then** the card is the plain login page's, "Login" over the host, as today.
3. **Given** any poll, **When** its login page is requested with the poll's PID, **Then** the page is not cached by the browser or an intermediary beyond a revalidation, so an edit to the title or message reaches new previews.
4. **Given** a public open or closed poll, **When** its login page is reached directly with the poll's PID (for example after a sign-in error), **Then** the page carries the same title and description a private poll's would; its shared link still previews from the poll's own public page.

---

### Edge Cases

- A poll whose title changes after a link was shared: the messaging app may keep its cached card; a new share shows the new title.
  The site cannot refresh a card the app already stored.
- A messaging app that gives up on redirects or reads no page at all shows the bare link, as today; no app is made worse.
- A link shared with extra query parameters (e.g. `&signedIn=1`): the PID alone decides the preview.
- An invitation email's personal `/invite?PID=…&token=…` link, forwarded into a chat: out of scope; it previews as today.
- The login page without a PID, or with a malformed one: titled "Login", as today.
- A public poll that is not open or closed (draft, pending, archived): its link leads to the login page, which previews as the plain login page, since the poll is not published.
- A published public poll's login page, reached directly with its PID: carries the poll's title and description like any published poll; nothing of a public poll is secret.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When the login page is requested with a PID that names a published poll, public or private (open or closed; a poll under edit by the state it held before the edit), the page MUST carry, in a form link-preview fetchers read, the poll's title as the preview headline and a preview description (FR-003), together with the site's name and, as the link's canonical address, the shared link `https://crowdpoll.vote/?PID=<pid>` (never the login page's own address), so a card that names or re-fetches it goes through the same redirect as a tap.
- **FR-002**: The same page's title (the browser tab) MUST be "<poll title> · CrowdPoll" in that case, and the plain page description MUST equal the preview description.
- **FR-003**: The preview description MUST be: the subtitle, then a blank line, then the approved Custom Email Message as plain text, when both exist; the subtitle alone or the message alone when only one exists; and "Vote and see live results: <title>" when neither does.
  It MUST be cut to 300 characters, the ellipsis included, when longer.
- **FR-004**: The message MUST be read from its approved copy only, never from a change awaiting review; and it MUST reach the page as plain text, with no formatting and with every character shown as written, so nothing in a title, subtitle or message can alter the page.
- **FR-005**: For any other PID (a poll that is not published, or no poll), and for a request without a PID, the login page MUST be served exactly as today, titled "Login".
- **FR-006**: The shared link, every redirect it performs for signed-in and signed-out visitors, the sign-in flow and the visible content of the login page MUST be unchanged.
  The preview MUST NOT depend on recognising the messaging app's identity.
- **FR-007**: The login page served for a published poll MUST tell browsers and intermediaries to revalidate before reuse, as the public poll page does.
- **FR-008**: The wizard's Custom Email Message support text MUST say that the message also appears in previews when the poll's link is shared, so the creator knows it is readable by anyone who holds the link.
- **FR-009**: The preview MUST carry no image; the card is text only, as for public polls.
- **FR-010**: Logs for the preview path MUST follow the site's rules: no full email address, link or token.

### Key Entities

- **Poll**: the title, subtitle, visibility (public or private), sharing mode ("Anyone you send the link to", stored as `Anyone With The Link`, or invitation only), state, and the approved Custom Email Message; the login page reads these five facts and nothing else of the poll.
- **Shared link**: `https://crowdpoll.vote/?PID=<pid>`, as copied from the admin card or list; it names the poll and nothing about the person who shares it.
- **Preview card**: what a messaging app shows under a link: a headline, a description and the site's host, built by the app's own fetcher from the page the link leads to, without cookies and without running scripts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For 100% of published private polls, a link preview fetched the way Google Messages, WhatsApp and iMessage fetch it (no cookies, redirects followed) yields the poll's title as its headline, instead of "Login".
- **SC-002**: For 100% of approved, open Only people you invite polls with a Custom Email Message, the preview description contains the message's words (within the 300-character cut) and never the words of a message awaiting review.
- **SC-003**: 100% of existing tests of the shared link, the login page and the sign-in flow pass unchanged: no visitor's path through the link differs from today.
- **SC-004**: For drafts, polls awaiting approval, rejected or archived polls and unknown PIDs, 100% of previews show the plain login page's card, as today.
- **SC-005**: A reviewer can confirm, from the login page alone, that no poll content other than the title, subtitle and approved message is exposed to a visitor without a session: no choices, notes, results or votes.

## Assumptions

- Messaging apps' preview fetchers follow HTTP redirects and read the final page's standard preview metadata; they send no cookies and run no scripts.
  This is documented for Google Messages and Apple's Messages, shown by the requirements' screenshot for Google Messages, and inferred for WhatsApp from the behaviour of the same crawler family it uses.
- The title, subtitle and approved message of a published private poll may be read by anyone who holds the link, and by the preview servers of Google, Meta and Apple, which fetch and may cache them (requirements NC1).
  The PID is an unguessable identifier, so this reaches only people the link was sent or forwarded to.
- Previews already cached by an app for a link shared earlier keep their old card; only new shares pick up the change.
- Public polls keep their existing preview, produced by their own public page; this feature does not change it.
- The site's crawler rules keep the login page out of search engines; preview fetchers, being user-triggered, ignore those rules, which is what makes the feature work.
- No new setting, cookie, storage key, route or dependency is needed.
