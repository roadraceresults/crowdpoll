# Feature Specification: UI/UX Revisions

**Feature Branch**: `013-UI-UX-revisions`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "using ./designDocs/013-high-level-requirements-UI-UX-revisions.md"

## Clarifications

### Session 2026-09-07

- Q: While a card submission is awaiting its outcome, what does the action do? → A: Disabled from click until the outcome arrives, with visible progress indication
- Q: What happens to text a person has typed but not submitted when they leave a card? → A: Leaving discards it silently; the close control and brand link are plain navigations
- Q: What happens when the session ends elsewhere while the person is mid-edit on a page that requires one? → A: The page navigates to sign-in immediately; unsaved text is lost as with any other navigation

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A verification link always reports its outcome (Priority: P1)

A signed-in person changes their email address and is sent a verification link. They open
that link — often in whatever browser their mail client hands the message to, which may not
be the browser they were working in. Today the change succeeds, the confirmation is thrown
away, and they are shown a sign-in form with no explanation. They are left unsure whether
the change happened.

After this change, the window that opens the link always says what happened: the address
was updated, or the link was refused. It says so whether or not that browser has a signed-in
session, and it offers a way back.

**Why this priority**: This is the only scenario in the feature where the system currently
loses information a person needs. Everything else is presentational or convenience. It is
also self-contained — it changes what one page does with one kind of arrival.

**Independent Test**: Request an email change, open the link in a private window or a second
browser, and confirm the outcome is stated. Repeat with an expired or superseded link and
confirm the refusal is stated.

**Acceptance Scenarios**:

1. **Given** a person has requested an email-address change, **When** they open the
   verification link in a browser with no signed-in session, **Then** the page tells them the
   address was updated and offers a way to sign in.
2. **Given** a verification link that has expired, has already been used, has been replaced by
   a newer request, or names an address now in use, **When** it is opened in a browser with no
   session, **Then** the page tells them the link is no longer valid and how to start again.
3. **Given** the same link is opened in the browser that requested the change, **Then** the
   profile page renders as usual with the outcome reported on it.
4. **Given** a person with no session requests the profile page without a verification result,
   **Then** they are sent to sign in, exactly as today.

---

### User Story 2 - Open windows reflect the current session (Priority: P1)

Signing in, creating an account and changing an email address all work by clicking a link in
an email, which opens a new browser window. The window the person was using stays open and
keeps whatever it knew when it loaded — a signed-out header, cards that behave as if nobody
is signed in, a stale email address — until they reload it by hand.

After this change, a window that is still open notices when the session changes, and updates
itself. It does this whether the change happened in another window of the same browser or in
a different browser entirely.

**Why this priority**: Every email-link journey in the product ends with an abandoned window
showing something untrue. It is the difference between a flow that feels finished and one that
appears not to have worked.

**Independent Test**: Open two windows, sign in through the link in one, and confirm the other
updates without a reload. Repeat with the link opened in a different browser and confirm the
first window updates when it is next brought to the front.

**Acceptance Scenarios**:

1. **Given** two windows of the same browser are open and signed out, **When** the person
   completes sign-in in one, **Then** the other shows them as signed in without a reload.
2. **Given** a window is open on the profile page, **When** an email-address change completes
   in another browser, **Then** that window shows the new address the next time it is brought
   to the front, and any half-typed change is cleared.
3. **Given** several windows are open and signed in, **When** the person signs out in one,
   **Then** the others show the signed-out state, and any window on a page that requires a
   session goes to the sign-in page — including a window where the person was part-way through
   typing, whose unsubmitted text is lost.
4. **Given** a window is sitting on the sign-in page, **When** the person signs in elsewhere in
   the same browser, **Then** that window goes to the home page rather than continuing to offer
   a sign-in form.
5. **Given** a window changes the display name, **Then** every other open window shows the new
   name without a reload.
6. **Given** the network is unavailable when a window re-checks, **Then** it keeps showing what
   it last knew rather than emptying.

---

### User Story 3 - Administrators can tell who was invited from who has voted (Priority: P2)

On an invitation-only poll the participants list shows who was invited. On a public poll it
shows who has voted. Neither shows both, so an administrator cannot answer the question they
actually have: of the people I invited, who has voted and who has not?

After this change every participant row says which it is, and all lists are ordered the same
way so two people looking at the same poll see the same thing.

**Why this priority**: It removes a real blind spot in the administration surface, but the
information is obtainable today by other means and nothing is lost without it.

**Independent Test**: Open an invitation-only poll with some invitees who have voted and some
who have not, and confirm each row is labelled correctly, including for an address invited in
the current editing session and not yet saved.

**Acceptance Scenarios**:

1. **Given** an invitation-only poll, **When** an administrator views the participants list,
   **Then** every row is marked as invited, and rows for people who have voted are additionally
   marked as voted.
2. **Given** an address is invited during the current editing session and not yet saved,
   **Then** it appears marked as invited.
3. **Given** a poll open to anyone with the link, or a public poll, **When** an administrator
   views the participants list, **Then** every row is marked as voted.
4. **Given** any poll type, **Then** the participants list is ordered by email address, and two
   administrators viewing it see the same order.
5. **Given** an administrator wants to invite an address, **Then** the control that adds it is
   labelled "Invite".

---

### User Story 4 - Sign-in, account creation and profile editing look like the rest of the app (Priority: P2)

The sign-in, account-creation and profile pages are plain forms that look nothing like the
poll cards that make up the rest of the product. They are the first thing a new person sees.

After this change each is a single card in the product's established style, sized to its
contents, centred, with a close control that returns to the home page.

**Why this priority**: It is the largest visible change in the feature and affects first
impressions, but nothing is broken without it.

**Independent Test**: Visit each of the three pages signed out and signed in as appropriate and
confirm the card renders, submits, reports failures in place, and returns home from its close
control.

**Acceptance Scenarios**:

1. **Given** the sign-in page, **Then** it shows a single card titled "Login" with an
   explanatory line, an address field, a stay-signed-in choice, and one action.
2. **Given** a submitted sign-in or account-creation request that succeeds, **Then** the person
   stays on the card and is told a link has been sent and to look for it, **And** the action
   becomes unavailable so the same link cannot be requested twice.
3. **Given** a submitted request that is refused or rate-limited, **Then** the person stays on
   the card and is told why, beside the action they used.
4. **Given** the profile card, **Then** it shows the person's avatar, their current display name
   and current address each in a read-only box, and beneath each a field for a new value with its
   own action.
5. **Given** the display name is saved, **Then** the person stays on the card, and the name
   shown on the card and in the header both update.
6. **Given** a verification link is requested from the profile card, **Then** the person stays
   on the card and is told the link was sent and to which address.
7. **Given** any of the three cards, **When** the close control is used, **Then** the person is
   taken to the home page.
8. **Given** a submission is awaiting its outcome, **Then** the action is unavailable and shows
   that work is in progress, **And** repeated attempts to use it submit nothing further.

---

### User Story 5 - The header reads as one arrangement (Priority: P3)

The header's search box and navigation are ordered so the clusters do not read as intended,
and the product mark is not clickable even though people expect it to lead home.

**Why this priority**: Cosmetic and small, and independent of everything else.

**Independent Test**: Load any page and confirm the arrangement and that the mark navigates
home.

**Acceptance Scenarios**:

1. **Given** any page on a wide viewport, **Then** the product mark and search sit at the left,
   and the create-poll link, name and avatar sit at the right.
2. **Given** any page, **When** the product icon or wordmark is used, **Then** the person is
   taken to the home page.

---

### User Story 6 - Leaving the administration pages (Priority: P3)

The poll-editing page has a back control; the administration list does not, so the only way
home is the header or the browser's own back button.

**Why this priority**: A small convenience on a surface used by one or two people.

**Independent Test**: Open the administration list and confirm a back control returns to the
home page.

**Acceptance Scenarios**:

1. **Given** the administration list, **Then** a back control appears above the create-poll
   action and takes the person to the home page.
2. **Given** any navigation control added by this feature, **When** it is used, **Then** it
   goes to a fixed destination rather than to wherever the person came from.

---

### User Story 7 - A refusal that explains itself (Priority: P3)

Someone who is not an administrator and reaches an administration page is shown a raw data
fragment rather than a page.

**Why this priority**: Rarely encountered, but the current response is the least finished
thing in the product.

**Independent Test**: Visit each administration page signed out and signed in as a
non-administrator, and confirm the explanatory page appears.

**Acceptance Scenarios**:

1. **Given** a person who is not an administrator, **When** they open any administration page,
   **Then** they see a page explaining they do not have permission, with the standard header
   and a control that takes them home.
2. **Given** a person with no session, **When** they open any administration page, **Then**
   they see the same page.
3. **Given** any request to the administration data interface from someone not permitted,
   **Then** it is refused exactly as it is today.

### Edge Cases

- A verification link opened in a browser that holds a session belonging to a **different**
  account: the outcome message describes what the link did, not who is signed in, so it stays
  accurate.
- The same person opens two windows and starts an email change in each: the newer request
  supersedes the older link, and both windows converge on the address that is actually current.
- A window is restored from the browser's back/forward cache after the session changed: it
  re-checks on restore rather than showing what it held when it was frozen.
- Someone is banned from a poll after voting: they appear in neither participant label, because
  banning removes the invitation and the vote.
- An invited address that has never had an account: no display name exists, so the row shows the
  address alone.
- A card whose contents are taller than the viewport: the page scrolls; the card is never
  clipped and never becomes its own scroll area.
- Someone types a new display name or address and then leaves the card without submitting: the
  text is gone, and returning to the card shows the values the system holds.
- The session ends in another window while someone is typing on a page that requires one: that
  page moves to sign-in immediately rather than leaving them on a page whose every action would
  now fail.
- Two windows are open side by side and neither is brought to the front: the same-browser case
  still updates immediately, because it does not wait to be looked at.
- The product is configured to use social sign-in rather than emailed links: the cards offer
  what that mode supports and never offer a control the system would refuse.

## Requirements *(mandatory)*

### Functional Requirements

**Verification results (US1)**

- **FR-001**: The profile page MUST render a verification result whenever a request carries one,
  before it considers whether the visitor has a session.
- **FR-002**: The system MUST serve the profile page to a visitor with no session when, and only
  when, the request carries a recognised verification result. Any other session-less request for
  that page MUST continue to be redirected to sign in.
- **FR-003**: The system MUST match the recognised results exactly; a result parameter with any
  other value MUST be treated as if it were absent.
- **FR-004**: A verification result rendered for a visitor with no session MUST state whether the
  address was changed or the link was refused, and MUST offer a single action leading to sign-in.
- **FR-005**: A refusal message MUST state the possible causes together rather than identifying
  which occurred.
- **FR-006**: A verification result MUST NOT include the email address it concerns, and the
  address MUST NOT be carried in the request that renders it.
- **FR-007**: A verification result rendered for a visitor who does have a session MUST appear on
  the profile card itself.
- **FR-008**: The system MUST NOT change how verification links themselves are issued or consumed.

**Session currency across windows (US2)**

- **FR-009**: Each page MUST hold one snapshot of who is signed in, and every part of that page MUST
  read it rather than asking independently.
- **FR-010**: A page MUST refresh that snapshot when it loads, when it is brought back into view,
  when it is restored from the browser's back/forward cache, and after it has itself changed the
  signed-in person's details.
- **FR-011**: A page MUST NOT repeatedly ask the system for session changes on a timer; it MUST
  ask only at the moments in FR-010.
- **FR-012**: A page MUST share every snapshot it obtains with other windows of the same browser,
  and MUST NOT re-share a snapshot it received from another window.
- **FR-013**: A page MUST compare a received snapshot against the one it holds across every detail
  that snapshot carries, and MUST ignore an identical one without re-rendering.
- **FR-014**: Adopting a changed snapshot MUST re-render the header, any signed-in gating, and
  whatever the page shows about the person, without navigating — except that a page whose only
  purpose is to obtain a session MUST go to the home page once one exists, and a page that
  requires a session MUST go to the sign-in page once one does not. That navigation MUST happen
  as soon as the snapshot is adopted, without waiting for the person to act, and MUST discard unsaved
  text as any other navigation does (FR-047).
- **FR-015**: A successful sign-out MUST be shared with other windows as soon as it succeeds and
  before the signing-out window navigates.
- **FR-016**: Where the browser cannot share snapshots directly between windows, the system MUST fall
  back to a signal that carries no information about the person, and MUST remove that signal when
  the session ends.
- **FR-017**: A failed refresh MUST leave the page showing what it last knew; a refusal MUST be
  treated as an answer and re-render the page as signed out.
- **FR-018**: Adopting a snapshot whose address differs MUST update the address shown, clear any
  pending change the person had typed, and clear any message describing that change as still
  pending. A snapshot differing in any other field MUST leave all three alone.
- **FR-019**: A display name the person is currently editing MUST NOT be overwritten by an
  adopted snapshot.

**Participant labelling (US3)**

- **FR-020**: On an invitation-only poll every participant row MUST be marked as invited, and
  additionally as voted where that address has voted.
- **FR-021**: On a link-only or public poll every participant row MUST be marked as voted.
- **FR-022**: Participant rows MUST lead with the email address, followed by the display name
  where one is known.
- **FR-023**: A display name MUST be shown for anyone who has voted; an invited address that has
  not voted MUST show the address alone.
- **FR-024**: All participant lists MUST be ordered by email address, using a comparison that
  produces the same order for every viewer regardless of their locale or device.
- **FR-025**: Participant rows MUST be derived from information the administration surface already
  receives, including addresses invited in the current editing session and not yet saved.
- **FR-026**: The banned list MUST keep its current presentation, taking the shared ordering rule
  and neither label.
- **FR-027**: The control that adds an invited address MUST be labelled "Invite".

**The three cards (US4)**

- **FR-028**: Sign-in, account creation and profile editing MUST each present a single card in the
  style of a poll card, sized to its contents and centred, with no reverse side.
- **FR-029**: Each card MUST carry a close control at the top right that takes the person to the
  home page, named for that destination.
- **FR-030**: Each card's title MUST be the page's heading.
- **FR-031**: Every action MUST report its outcome in a place tied to that action; where a card
  has more than one action, each MUST have its own.
- **FR-032**: A submission MUST wait for its outcome. Sign-in and account creation MUST stay on the
  card in every case — on success reporting that a link has been sent and what to do with it, and
  when refused or rate-limited explaining why. Neither MUST navigate away on success, because the
  card's status line is the only place that instruction can appear.
- **FR-033**: Neither profile action MUST navigate away on success; each MUST report its outcome
  on the card.
- **FR-034**: A message that arrives with the page rather than from an action MUST appear in the
  outcome position belonging to the action it concerns, or in the card's first outcome position
  where it concerns no action.
- **FR-035**: A card MUST render only the regions that have content, and MUST NOT be padded to a
  fixed size — except the profile card, which MUST reserve a minimum height.
- **FR-036**: A card taller than the viewport MUST scroll the page rather than becoming its own
  scrolling region, and MUST NOT clip its contents.
- **FR-037**: Each card MUST offer only what the configured sign-in method supports, and MUST NOT
  present a control the system would refuse in that mode.
- **FR-046**: While a submission is awaiting its outcome, the action that started it MUST be
  unavailable and MUST show that work is in progress. No further submission MUST be possible
  until the outcome arrives, so that one intended action consumes at most one attempt against
  any rate limit.
- **FR-047**: Leaving a card — by its close control, by the product mark, or by any other
  navigation — MUST discard text that has been typed but not submitted, without asking for
  confirmation and without preserving it for a later visit.
- **FR-048**: Every card action MUST be unavailable while the field it acts on is empty, and MUST
  become unavailable again if that field is emptied, so that a blank submission cannot be
  attempted: sign-in and account creation on their address field, and the profile card's two
  actions each on the "new value" field above them. A profile action MUST also stay unavailable
  while its field merely repeats the current value, since submitting the name someone already has
  is not a change. On the sign-in card the stay-signed-in choice follows the action. A control held unavailable this way MUST look unavailable, including the label naming it.

**Header and navigation (US5, US6)**

- **FR-038**: The header MUST place the product mark and search at the left and the create-poll
  link, name and avatar at the right, on viewports wide enough to show them in one row.
- **FR-039**: The product icon and wordmark together MUST act as a single control leading to the
  home page.
- **FR-040**: The administration list MUST carry a back control, matching the poll-editing page's,
  placed above the create-poll action and leading to the home page.
- **FR-041**: Every navigation control this feature introduces MUST lead to a fixed destination
  and MUST NOT depend on browser history.

**Refusing an administration page (US7)**

- **FR-042**: A request for any administration page from someone not permitted MUST be answered
  with an explanatory page carrying the standard header, a title, a sentence explaining the
  refusal, and a control leading to the home page.
- **FR-043**: The refusal MUST remain a refusal — the request MUST NOT be reported as successful.
- **FR-044**: The same page MUST be shown to a visitor with no session and to a signed-in person
  who is not an administrator, and MUST NOT reveal which they are or whether signing in would
  help.
- **FR-045**: Requests to the administration data interface MUST continue to be refused in their
  present form, unchanged by FR-042.

### Key Entities

- **Session snapshot**: What one window currently believes about the signed-in person — their display
  name, address, avatar, account state, and whether they administer polls — or the absence of a
  signed-in person. Held once per page, shared between windows, and never stored in a way that
  outlives the session.
- **Participant row**: One address on a poll's roster, carrying whether it was invited, whether it
  has voted, and a display name when one is known. Assembled from the poll's invitation list and
  its voting record, including unsaved editing changes.
- **Verification result**: The outcome of following an email-change link — changed, or refused —
  carried by the request that lands after the link is followed, and describing the link rather
  than the person.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every email-change verification link reports its outcome to the person who followed
  it, in any browser, with no case in which a completed change is reported as nothing.
- **SC-002**: An administrator can determine, for every invited address on an invitation-only
  poll, whether that address has voted — without leaving the page or consulting another screen.
- **SC-003**: A window left open while the session changes elsewhere in the same browser shows
  the new state within a few seconds, with no manual reload and no action by the person.
- **SC-004**: A window left open while the session changes in a different browser shows the new
  state the first time it is brought back into view.
- **SC-005**: No window continues to show a signed-in header after the person has signed out in
  another window of the same browser.
- **SC-006**: Two administrators viewing the same poll's participant list see identical ordering.
- **SC-007**: A person who is refused an administration page is never shown raw data, on any
  administration page, whether or not they are signed in.
- **SC-008**: Every action on the three cards reports its outcome without the person losing the
  page they were on, except where success deliberately takes them home.
- **SC-009**: A person can return to the home page from any page this feature touches, using a
  control on the page, without using the browser's back button.
- **SC-010**: No page in the product presents a control that the configured sign-in method would
  refuse.
- **SC-011**: One intended action never consumes more than one attempt against a rate limit, no
  matter how many times its control is used before the outcome arrives.

## Assumptions

- The existing sign-in, session and email-verification behaviour is reused unchanged; this feature
  alters what pages show, not how identity works.
- Social sign-in remains configured off. Where a card must behave differently under it, the
  behaviour is specified but not visually designed, and full support is deferred to a later
  feature.
- The signed-out header keeps its present arrangement, with the sign-in and create-account
  controls occupying the position the name and avatar occupy when signed in.
- On viewports too narrow to show the header in one row, the existing narrow-viewport arrangement
  is retained unchanged.
- A refresh triggered while another is already in flight is dropped rather than queued; at most
  one is outstanding at a time.
- Participant list ordering is by the address as stored, which is already normalised to a single
  case everywhere addresses enter the system.
- The administration pages other than the refusal path are otherwise untouched by this feature.
- The product's existing look — its type, colour and card styling — is the target style; this
  feature introduces no new visual language.
