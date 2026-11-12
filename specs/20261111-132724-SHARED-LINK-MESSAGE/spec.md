# Feature Specification: Shared Link Message

**Feature Branch**: `20261111-132724-SHARED-LINK-MESSAGE`

**Created**: 2026-11-11

**Status**: Draft

**Input**: User description: "requirements/20261111-122415-shared-link-message/requirements.md"

## User Scenarios & Testing *(mandatory)*

The previous feature made a private poll's shared link preview with the poll's title, subtitle and, for an **Only people
you invite** poll, the creator's Custom Email Message.
Testing it in more apps showed four gaps.
An **Anyone you send the link to** poll has no message of its own, so its card shows a Custom Email Message the creator
can no longer see, left over from an earlier sharing mode, or nothing.
The fallback sentence, "Vote and see live results: <title>", is fixed in the product.
WhatsApp shows only the first line of the description, so a message with line breaks is cut short.
Facebook Messenger and Instagram show no card at all, only the host name, and WhatsApp shows a blurry, scaled-up
browser icon in place of an image.
This feature gives **Anyone you send the link to** polls their own short Link Preview Message, makes the fallback
sentence an operator setting, puts the description on one line, lets Meta's apps build a card, and gives every card
a crisp brand image.

## Clarifications

### Session 2026-11-11

- Q: Who produces the 1200 × 630 brand image? → A: The implementation renders it from `og-logo.svg`, the brand logo with its speech bubble (TWEAK02; first from `favicon.svg`), with the existing one-off development script that already renders the site's icon files, using the developer's browser and no new dependency; the PNG is committed, the script kept under `devScripts/`. (Amended by analysis finding I1, 2026-11-11: the script exists, so no rasterizer package is added.)
- Q: What comes first in the description, the subtitle or the message? → A: The subtitle, a dash, then the message, for every poll, as the previous feature decided; a creator who wants the message seen first in WhatsApp keeps the subtitle short.

### User Story 1 - A Link Preview Message for shared-link polls (Priority: P1)

The creator of an **Anyone you send the link to** poll writes a short message, up to 100 characters, in a new field
under that option in the wizard's "Who" step (directly under it since TWEAK03 moved the Copy Link button to the
Settings Summary).
When the poll's link is pasted into a messaging app, the card shows the poll's title, then the subtitle and this
message as its description.
The message belongs to this sharing mode: switching the poll to **Only people you invite** hides it and shows the
Custom Email Message field instead, and switching back restores it unchanged.

**Why this priority**: it is the core of the request; without it a shared-link poll's card can only show the
subtitle or a sentence the creator did not write.

**Independent Test**: create a private "Anyone you send the link to" poll with a subtitle, enter a Link Preview
Message, save, and fetch the shared link the way a messaging app does; the description is the subtitle, a dash, then
the message.
Switch the poll to "Only people you invite", enter a Custom Email Message, switch back, and check the Link Preview
Message is still there and is the one the card shows.

**Acceptance Scenarios**:

1. **Given** the wizard's "Who" step with "Anyone you send the link to" selected, **When** the creator looks under
   that option, **Then** a "Link Preview Message" field is shown directly under it (TWEAK03), with the support text
   "Optional. Shown under the poll's title when its link is shared in a messaging app." and a counter out of 100,
   behaving like the Custom Email Message field (multi-line, formatting marks, an edit button).
2. **Given** the same step with "Only people you invite" or "Everyone on CrowdPoll" selected, **When** the creator
   looks under "Anyone you send the link to", **Then** no Link Preview Message field is shown.
3. **Given** a Link Preview Message of 100 characters, **When** the creator saves, **Then** it is accepted; **Given**
   101 characters, **Then** the save is refused with the same kind of message as any other field that is too long,
   and the counter already shows the excess.
4. **Given** an open "Anyone you send the link to" poll with a subtitle and a Link Preview Message, **When** its link
   is previewed, **Then** the description is the subtitle, a dash, then the message as plain text without formatting
   marks; without a subtitle, the message alone.
5. **Given** a poll with a Link Preview Message that is switched to "Only people you invite" and back, **When** the
   creator returns to the "Who" step, **Then** the Link Preview Message is as it was, and the Custom Email Message
   entered in between is kept too, hidden.
6. **Given** a poll with a non-blank Link Preview Message under "Anyone you send the link to", **When** the creator
   reads the Settings Summary, **Then** a line "A Link Preview Message has been entered" follows the Who line and
   opens the "Who" step with the field focused; the line is absent when the message is blank or the poll is in
   another sharing mode.
7. **Given** a poll with votes whose creator changes the Link Preview Message, **When** the change awaits review,
   **Then** the card keeps showing the message approved before the change until the new one is approved; and the
   message goes through the same acceptability screening as the title, subtitle, notes and Custom Email Message.
8. **Given** a creator duplicates a poll, **When** the copy is opened, **Then** it carries the original's Link
   Preview Message.

---

### User Story 2 - The card's description is right for every poll (Priority: P1)

Whatever a poll's sharing mode, the card describes it with the message that belongs to that mode: the Link Preview
Message for **Anyone you send the link to**, the Custom Email Message for **Only people you invite**, nothing for a
public poll.
When a poll has neither a subtitle nor a message of its mode, the card shows the site's default sentence, which the
operator can change through a setting, and reads "You have been invited to vote in this poll." unless changed.
The description is always a single line, so apps that show only the first line still show the message.

**Why this priority**: it fixes the leftover-message defect and the WhatsApp cut-off for every poll, including polls
that never get a Link Preview Message.

**Independent Test**: preview the links of an "Anyone you send the link to" poll that still holds an old Custom
Email Message, an "Only people you invite" poll with a two-paragraph Custom Email Message, and a poll with neither
subtitle nor message; the first shows no message, the second shows the message's words on one line, the third shows
the default sentence; then start the site with the setting changed and check the third card shows the new sentence.

**Acceptance Scenarios**:

1. **Given** an open "Anyone you send the link to" poll that once had a Custom Email Message and has no Link Preview
   Message, **When** its link is previewed, **Then** the description is the subtitle alone or, without a subtitle,
   the default sentence; the old Custom Email Message does not appear.
2. **Given** an open "Only people you invite" poll with a Custom Email Message, **When** its link is previewed,
   **Then** the description is the subtitle, a dash, then the message, as before this feature.
3. **Given** a message with line breaks and several paragraphs, **When** its link is previewed, **Then** the
   description is one line: every line break has become a space, repeated spaces are collapsed, and the whole is
   still cut to 300 characters, the ellipsis included, when longer.
4. **Given** a poll with neither subtitle nor message of its mode, **When** its link is previewed, **Then** the
   description is "You have been invited to vote in this poll." when the operator has not set the sentence, or the
   operator's sentence as given, with no placeholder expanded.
5. **Given** the operator sets the sentence blank, or longer than 300 characters, **When** the site starts, **Then**
   it refuses to start and names the setting, as for any invalid setting.
6. **Given** a public open poll, **When** its link is previewed, **Then** the card is as today: the poll's title and,
   as description, the subtitle or "Vote and see live results: <title>", from the poll's own public page; the
   operator's sentence does not apply there.

---

### User Story 3 - Meta's apps show the card, and the card carries a brand image (Priority: P2)

A link pasted into Facebook Messenger or Instagram shows the same card as in Google Messages: the title and the
description over the host name.
In every app that shows an image, the card carries CrowdPoll's brand image instead of a scaled-up browser icon, for
private polls' links and public polls' links alike.

**Why this priority**: both are reach, not content: the message is right after Stories 1 and 2, and this story makes
it visible in two more major apps and makes every card look finished.

**Independent Test**: after deployment, check the site's crawler rules let Meta's preview crawler read the login
page, confirm with Meta's Sharing Debugger that it reads the poll's title and description, and send the link in
Messenger and WhatsApp; Messenger shows the card and WhatsApp shows the brand image at full sharpness.

**Acceptance Scenarios**:

1. **Given** the site's crawler rules, **When** Meta's preview crawler reads them, **Then** it is allowed to read the
   login page, while search engines are still kept out of it and Meta's AI-training crawler is not let in.
2. **Given** an open private poll's link, **When** Meta's Sharing Debugger fetches it, **Then** it reports the poll's
   title and the description, not an empty or blocked page.
3. **Given** any page that carries a preview, the login page for a published poll or a public poll's page, **When**
   a preview fetcher reads it, **Then** it finds the brand image, 1200 by 630 pixels and under 300 KB, with its
   dimensions declared, at an absolute address on the site.
4. **Given** the brand image, **When** WhatsApp or Google Messages builds the card, **Then** the image is shown
   sharp, with the title and description under it.

---

### Edge Cases

- A Link Preview Message that is only spaces or line breaks is stored as empty, so the card falls back to the
  subtitle or the default sentence.
- A Link Preview Message of exactly 100 characters including formatting marks is accepted; the marks count, as they
  do for the Custom Email Message, and never show in the card.
- A poll switched to "Only people you invite" while its Link Preview Message is in the edit box: the message is saved
  with the poll and hidden, like the Custom Email Message in the opposite direction.
- An existing "Anyone you send the link to" poll that showed a leftover Custom Email Message before this feature:
  its card changes to the subtitle or the default sentence until the creator writes a Link Preview Message; nothing
  is copied into the new field.
- A card an app stored before this feature keeps its old text and image; only new shares pick up the change, and
  Meta's apps may take up to a day to notice the new crawler rules.
- The operator's sentence containing characters that look like markup: they are shown as written and alter nothing
  of the page.
- A public poll's login page reached directly with its PID: the description is the subtitle or the default sentence;
  a public poll has no message of its own.
- An image fetcher that rejects the brand image (too large for its rules): the app shows a text card, never a broken
  image, so the image must stay within the strictest published limits.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The wizard's "Who" step MUST offer a "Link Preview Message" field under the "Anyone you send the link
  to" option, directly under it (TWEAK03: Step 1 has no Copy Link block), only while that option is selected; it MUST behave like the Custom Email
  Message field (multi-line, the same formatting marks, an edit button), with the support text "Optional. Shown under
  the poll's title when its link is shared in a messaging app." and a counter out of 100.
- **FR-002**: A poll MUST store the Link Preview Message separately from the Custom Email Message, so each sharing
  mode keeps its own message and switching between "Anyone you send the link to" and "Only people you invite" loses
  neither; a new poll's Link Preview Message is empty, and existing polls start with it empty.
- **FR-003**: The Link Preview Message MUST be limited to 100 characters of stored text, formatting marks included,
  in the counter and by the server alike; a longer message MUST be refused the way other over-long fields are, and a
  blank message MUST be stored as empty.
- **FR-004**: The Link Preview Message MUST be treated as the Custom Email Message is in every other respect: it goes
  through acceptability screening with the other text fields; on a poll with votes a change waits for review and the
  card shows the approved message until then; it is copied when a poll is duplicated; a change to it alone does not
  count as a content change for voters; it is visible to the poll's creator and administrators only and never
  appears in the poll's card, tabs, updates or public page.
- **FR-005**: The Settings Summary MUST show "A Link Preview Message has been entered" directly after the Who line
  when the poll is "Anyone you send the link to" and the message is not blank, as a link that opens the "Who" step
  with the field focused; otherwise no such line.
- **FR-006**: The preview description of the login page MUST use the message of the poll's current sharing mode:
  the Link Preview Message for "Anyone you send the link to", the Custom Email Message for "Only people you invite",
  no message for a public poll; a message of another mode MUST never appear.
- **FR-007**: The preview description MUST be one line: the subtitle, a dash, then the message's plain text with
  every line break turned into a space and runs of white space collapsed to one; the subtitle alone or the message
  alone when only one exists; cut to 300 characters, the ellipsis included, when longer.
  The order is the same for every sharing mode: the subtitle always comes first (Clarifications).
- **FR-008**: When a poll has neither a subtitle nor a message of its mode, the description MUST be the default
  sentence from the operator setting `ENV_DEFAULT_LINK_PREVIEW_MESSAGE`, used as given with no placeholder, whose
  default is "You have been invited to vote in this poll."; a blank value, or one over 300 characters, MUST stop the
  site from starting with a message naming the setting; the setting MUST be documented with the site's other
  settings.
- **FR-009**: The public poll page's description MUST stay the subtitle or "Vote and see live results: <title>"; the
  operator setting MUST NOT apply to it.
- **FR-010**: The site's crawler rules MUST allow Meta's preview crawlers to read the login page while keeping every
  other rule as it is for all other crawlers, and MUST NOT allow Meta's AI-training crawler; the login page MUST keep
  asking search engines not to index it.
- **FR-011**: Every page that carries a preview, the login page for a published poll and the public poll page alike,
  MUST offer the same brand image, 1200 by 630 pixels and under 300 KB, at an absolute address on the site, with its
  width, height and type declared, so apps need not fetch it to lay out the card.
  The image MUST be produced from the existing favicon drawing by the existing one-off development script that
  renders the site's icon files (no new dependency, nothing shipped to production), and the produced file MUST be
  committed with the code, so the site serves a static file and never renders it at run time.
- **FR-012**: Nothing else of the previous feature changes: the shared link, its redirects, the sign-in flow, the
  rule that only open or closed polls are previewed, the no-cache response, and the Custom Email Message's support
  text.

### Key Entities

- **Poll**: gains a Link Preview Message (up to 100 characters, formatting as the notes) beside its Custom Email
  Message (up to 1000); which of the two the card shows depends on the sharing mode.
- **Preview card**: a headline (the title), a one-line description, the site's host and now the brand image, built
  by each app's fetcher from the page the link leads to.
- **Default sentence**: the operator-set text the description falls back to on the login page, with a built-in
  default.
- **Brand image**: one committed picture of the CrowdPoll figures on a plain background, 1200 by 630 pixels, shown
  by every app that shows an image.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For 100% of open "Anyone you send the link to" polls with a Link Preview Message, a preview fetched
  the way messaging apps fetch it yields a description containing the message's words on one line.
- **SC-002**: For 100% of "Anyone you send the link to" polls, no Custom Email Message, approved or pending, appears
  in the preview; for 100% of "Only people you invite" polls, no Link Preview Message does.
- **SC-003**: A creator can enter a Link Preview Message and see it in a fresh share within one save and one share;
  a 101-character message is refused every time.
- **SC-004**: With the site started under a changed default sentence, 100% of previews of polls with neither
  subtitle nor message show that sentence; with a blank or over-long value, the site does not start.
- **SC-005**: After deployment and within a day, Meta's Sharing Debugger reports the poll's title and description
  for a private poll's link, and a share in Facebook Messenger shows the card.
- **SC-006**: In WhatsApp and Google Messages, a fresh share of any poll's link shows the brand image sharp, and the
  title and description are still shown.
- **SC-007**: 100% of existing tests of the shared link, the login page, the sign-in flow and the Custom Email
  Message pass unchanged, apart from the expectations this feature explicitly changes (the one-line description, the
  fallback sentence, the crawler rules and the image).

## Assumptions

- Meta's preview crawler obeys the site's crawler rules, as Meta's documentation implies by saying a disallow blocks
  it; the Sharing Debugger is the way to confirm it after deployment, and Meta may cache the rules for up to 24 hours.
- WhatsApp shows only the first line of a description, as the test screenshot shows; making the description one line
  is the fix, and apps that already collapsed line breaks are unaffected.
- Meta's and WhatsApp's published image rules (at least 300 pixels wide, aspect at most 4:1, well under 600 KB,
  1200 by 630 recommended) are met by a 1200 by 630 image under 300 KB; the brand image is rendered once from the
  existing favicon figures by a development script and committed with the code (Clarifications).
- With an image, WhatsApp and Google Messages lay the card out with the image on top; the title and description stay
  visible under it. This reverses the previous feature's choice of a text-only card.
- The default sentence is the same for every poll; a per-poll sentence is what the Link Preview Message is for.
- The 100-character limit suits WhatsApp's stated "1 or 2 lines"; longer messages are cut by the apps, not by the
  site, beyond the 300-character cap.
  A long subtitle can push the message out of WhatsApp's two lines; the subtitle keeps first place regardless, and
  the field's support text does not promise otherwise.
- No new cookie, storage key or dependency; one new stored field, one new setting and one new image file.
