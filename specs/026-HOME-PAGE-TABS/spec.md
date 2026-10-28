# Feature Specification: Home Page Tabs

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "designDocs/026-high-level-requirements-HOME-PAGE-TABS.md"

**Source requirements**: `designDocs/026-high-level-requirements-HOME-PAGE-TABS.md` (A1–A24; every
inconsistency, ambiguity, unspecified aspect and clarification raised during architecture review is
resolved).
**Architecture**: `architecture/026-home-page-tabs/architecture.md` (17 findings, all resolved).

## Clarifications

### Session 2026-10-05

- Q: What happens when a non-creator opens the link of a **Public** poll that is not published yet? → A: Treat it as not shown: the home page with "That poll isn't available.", no view recorded; the creator still lands on Your Polls.
- Q: What happens when an invited user opens the link of an unpublished **Invitation Only** poll? → A: Same as an unpublished Anyone With The Link poll: land on Shared With You with the "not published yet" message; no view is recorded, because the invitation already lists the poll.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open a poll someone sent me, even before I have an account (Priority: P1)

A friend, colleague or family member sends a link to a private poll. The recipient opens it. Today the
link drops them on the home page and the poll is never shown. After this feature the link takes them
to the poll. A visitor who is not signed in is first asked to sign in (or create an account) and then
lands on the poll, even if they open the emailed sign-in link in a different browser or on a phone.

**Why this priority**: Shared links are how private polls reach people. Without a working link, no
other tab in this feature has anything to show.

**Independent Test**: As a guest, open a poll's link, sign in with a new and then an existing address,
and confirm the poll is shown after sign-in each time. As a signed-in user, open the link and confirm
the poll is shown.

**Acceptance Scenarios**:

1. **Given** a guest, **When** they open any poll link (existing, unknown, public or private),
   **Then** they are taken straight to sign-in, the same way every time, and the page reveals nothing
   about the poll.
2. **Given** a guest on that sign-in page, **When** it loads, **Then** it says "Sign in to see the poll
   that was shared with you." and nothing else about the poll.
3. **Given** a guest who requests a sign-in link, **When** they open the emailed link, even in another
   browser, **Then** they are signed in and land on the poll.
4. **Given** an address with no account, **When** it requests a link from the poll's sign-in page,
   **Then** the invitation to create an account brings them back to the poll after they sign in.
5. **Given** an expired or already-used emailed link, **When** it is opened, **Then** the visitor can
   request a new link and still return to the same poll.
6. **Given** a signed-in visitor, **When** they open a link to a published private poll, **Then** they
   land on Shared With You with that poll shown as a maximized card, and closing it returns to the tab.
7. **Given** a signed-in visitor, **When** they open a link to a public poll, **Then** the poll is
   shown as a maximized card over Trending, even if it is not one of Trending's polls, and voting and
   watching work on it; closing it removes it.
8. **Given** a creator, **When** they open their own poll's link, **Then** the poll is shown in Your
   Polls, in any state including Archived, and nothing is recorded as a view.
9. **Given** a signed-in visitor, **When** the poll is unknown, Archived or a Public poll not yet
   published (and they are not its creator), Invitation Only and they are not invited, or they are banned, **Then** they land on the
   home page with the identical notice "That poll isn't available." in every case.
10. **Given** a poll id in a link that is not a valid poll id, **When** it is opened, **Then** it is
    ignored, the visitor lands on the home page, and no sign-in step ever redirects off this site.

---

### User Story 2 - Find the polls shared with me in one place (Priority: P1)

The tab **Shared With You** lists every private poll created by someone else that the user was invited
to or reached through a shared link. Opening a link is enough to list the poll, so the user can come
back and vote later. Opening the link again moves the poll to the top.

**Why this priority**: This is the heart of the goal that private polls are the most prominent part of
the site.

**Independent Test**: Invite a user to an Invitation Only poll and have them open a link to an Anyone
With The Link poll; both appear in Shared With You, newest activity first.

**Acceptance Scenarios**:

1. **Given** an Invitation Only poll, **When** a user on its invite list opens the home page, **Then**
   it is in Shared With You without them opening anything.
2. **Given** an Anyone With The Link poll, **When** a signed-in non-creator opens its link, **Then** it
   is listed in Shared With You, and opening the link again moves it to the top.
3. **Given** a public poll opened by link, **When** the visitor looks at Shared With You, **Then** it
   is not there.
4. **Given** a poll in Shared With You, **When** the user votes in it or watches it, **Then** it stays
   in Shared With You and also appears in Your Votes or Watching.
5. **Given** a poll in Shared With You, **When** the user looks at its card, **Then** there is no
   remove, hide or dismiss control.
6. **Given** a user who is removed from an Invitation Only poll's invite list, **When** they open
   Shared With You, **Then** the poll is gone, including when the removal happened before this
   feature; if they are invited again it returns at the top.
7. **Given** a poll viewed by link, **When** its creator makes it Invitation Only without inviting the
   viewer, **Then** it leaves their Shared With You; if the creator switches back it returns.
8. **Given** a banned user, **When** they open Shared With You, **Then** the poll is still listed with
   "You have been removed from this poll and cannot vote in it" and no Watch control.
9. **Given** a poll closed long ago, **When** the daily watch expiry runs, **Then** it stays in Shared
   With You; deleting the poll removes it.
10. **Given** more polls than the listing limit, **When** the tab loads, **Then** the most recent are
    shown, and opening an older poll's link again brings it back.

---

### User Story 3 - See a poll that has not been published yet (Priority: P2)

A creator may copy the link while still drafting. A signed-in visitor who opens it is told the poll is
not published yet, and it waits in Shared With You as a placeholder showing only who shared it. When
the poll is published, the placeholder becomes the ordinary poll card by itself.

**Why this priority**: Prevents a dead end for a link shared early, but it is a refinement of Story 2.

**Independent Test**: Open the link of an unpublished Anyone With The Link poll as a non-creator and
confirm the message, the placeholder and that nothing about the draft is sent; publish it and confirm
the card replaces the placeholder.

**Acceptance Scenarios**:

1. **Given** an unpublished Anyone With The Link poll (never launched), **When** a signed-in
   non-creator opens its link, **Then** they land on Shared With You with "This poll hasn't been
   published yet. It's waiting in Shared With You, and you can vote once it's published."
2. **Given** that placeholder, **When** it is shown, **Then** it says "Shared by <creator's name>" (or
   "Shared with you" when the creator has no name), never an email address, and shows no title,
   subtitle, choices, counts or results and no Vote, Live Results or Watch control. None of that
   content is sent to the visitor's browser at all.
3. **Given** an invited user of an unpublished Invitation Only poll, **When** they open Shared With
   You, or open the poll's link, **Then** they see the same placeholder, and the link also lands on
   Shared With You with the "not published yet" message (no view is recorded).
4. **Given** the placeholder, **When** the poll is published, **Then** the next refresh shows the
   ordinary card in the same position.
5. **Given** the placeholder, **When** the poll is deleted, the user is uninvited, or the poll is made
   Invitation Only without them or Public, **Then** it leaves.
6. **Given** an Archived poll, **When** its link is opened by a non-creator, **Then** nothing is
   recorded.

---

### User Story 4 - A clear set of personal tabs, with the private ones first (Priority: P1)

The tab bar reads **Your Polls · Shared With You · Your Votes · Trending · Newest · Watching · Live
Results · Search**. The three personal tabs come first. All labels, headings, buttons and messages
speak to the user as "you"/"your", in Title Case.

**Why this priority**: The tab bar is the visible expression of the goal.

**Independent Test**: Load the home page signed in and signed out and confirm the tab order, labels
and that no label says "My" or "Me".

**Acceptance Scenarios**:

1. **Given** any visitor, **When** the home page loads, **Then** the eight tabs appear in that order,
   Trending is the active tab by default, and "My Private Polls" and "Favorites" no longer appear.
2. **Given** a guest, **When** they select Your Polls, Shared With You, Your Votes, Watching or Live
   Results, **Then** they are asked to sign in, as the personal tabs do today.
3. **Given** a narrow screen, **When** the tabs do not fit, **Then** the bar scrolls sideways as today.
4. **Given** any signed-in user, **When** they load the page, **Then** all three new tabs are visible
   whatever permissions they hold.
5. **Given** an empty tab, **When** it is shown, **Then** it reads "You haven't created any polls
   yet." / "Nothing has been shared with you yet." / "You haven't voted in any polls yet." / "You
   aren't watching any polls yet.", with none mentioning email or notifications.
6. **Given** Shared With You or Your Votes, **When** their tabs are shown, **Then** each has a
   placeholder icon in the existing circle style.

---

### User Story 5 - Your Polls: everything I created, in every state (Priority: P2)

**Your Polls** lists every poll the user created, public and private, newest created first, in every
state. A poll that has not launched shows its state (and the rejection reason when rejected) and
cannot be voted on. Other users never see the content of such a poll.

**Why this priority**: Creators need one place to follow their polls; it works for any user who can
create polls (025).

**Independent Test**: As a creator of one public and one private poll in several states, confirm both
are listed with their states, and that another user's tabs and search never include the unlaunched ones.

**Acceptance Scenarios**:

1. **Given** a user who created private and public polls, **When** they open Your Polls, **Then** both
   appear, newest created first, capped at the same limit as the other personal tabs.
2. **Given** polls the user only voted in, watches, was invited to or opened by link, **When** they open
   Your Polls, **Then** those are absent, unless the user created them.
3. **Given** an administrator, **When** they open Your Polls, **Then** only the polls that administrator
   created appear.
4. **Given** an Initialized, Editing, Awaiting Approval or Rejected poll, **When** its creator sees its
   card, **Then** the card shows the state in Title Case (and the rejection reason when Rejected) and no
   voting control.
5. **Given** an Archived poll, **When** its creator sees it, **Then** it shows read-only results and its
   state.
6. **Given** a poll whose visibility, sharing mode or state changes, **When** the creator reloads,
   **Then** it stays listed; it leaves only when deleted.
7. **Given** a user who has not created any poll and can reach the authoring page, **When** they see the
   empty state, **Then** it also offers the same link as the header's Create Poll.
8. **Given** any card in this tab, **When** it is shown, **Then** it has no "listed because" line.

---

### User Story 6 - Watching, and a Your Votes tab (Priority: P2)

Favorites becomes **Watching**: the polls the user deliberately chose to keep an eye on, with an eye
icon, a **Watch** / **Watching** button (outline when off, filled ink when on, never red, never struck
through, no bare number) and "Stop watching this poll". A new **Your Votes** tab lists every poll the
user voted in, public and private. Voting never watches a poll automatically. Polls in Shared With You
and Your Polls can be watched.

**Why this priority**: Completes the tab model and removes the confusion of Favorites.

**Independent Test**: Vote in a public poll and confirm it is in Your Votes and not in Watching; watch a
poll from Shared With You and confirm it is in both tabs, first in Watching.

**Acceptance Scenarios**:

1. **Given** a user who voted in a poll, **When** they open Your Votes, **Then** it is listed, ordered
   by their latest vote, and it is not in Watching unless they also watched it.
2. **Given** a card with the Watch control, **When** the user presses it, **Then** it reads Watching,
   the poll is first in Watching, and pressing again stops watching and removes it from Watching only.
3. **Given** a private poll, **When** the user watches it from Shared With You, **Then** it appears in
   both tabs; stopping watching leaves it in Shared With You.
4. **Given** a user who may not watch a poll (not published, banned, no access, or lacking the
   permission to view polls), **When** the card shows, **Then** the Watch control is hidden, never
   disabled, and a watch request is refused as if the poll did not exist.
5. **Given** a user who watches a poll and then loses access (uninvited, banned, or the poll becomes
   Invitation Only without them), **When** they open Watching, **Then** the poll and its results are
   not shown; the watch is kept and returns if access returns.
6. **Given** a user who lost access to a private poll they voted in, **When** they open Your Votes,
   **Then** it is not listed (and returns with access), except a ban, which keeps the card with the ban
   message and no Watch control.
7. **Given** watched private polls, **When** the per-user watch limit or the expiry applies, **Then**
   they count and expire like public ones, and the limit dialog uses the new wording.
8. **Given** any Watch control, tooltip, tab or empty state, **When** read, **Then** it never promises
   email or notifications.

---

### Edge Cases

- Opening a link more than once never creates a second entry; only the time moves, and is not rewritten
  when it is under a minute old.
- A guest sees the same sign-in redirect for an existing poll, a public poll and an unknown id.
- A person whose emailed link is opened in another browser still returns to the poll.
- A link whose poll id is not valid is dropped at every step and never causes an off-site redirect.
- The sign-in rate limits and the "same response whether or not the address has an account" privacy
  rule are unchanged by the carried poll id.
- A creator with no name set is shown as "Shared with you", never by email address.
- A user without the permission to vote still sees vote controls exactly as today.
- Two tabs may list the same poll.
- Removing someone from an invite list before this feature leaves no lingering poll in their Shared
  With You.

## Requirements *(mandatory)*

### Functional Requirements

**Tabs and wording**

- **FR-001**: The tab bar MUST show Your Polls, Shared With You, Your Votes, Trending, Newest, Watching,
  Live Results, Search in that order, with Trending active by default, and the old My Private Polls and
  Favorites tabs removed.
- **FR-002**: Every tab name, label, heading, button and message MUST address the user as "you"/"your"
  in Title Case; no first-person labels ("My …", "… Me") may appear anywhere in the interface.
- **FR-003**: Personal tabs MUST ask a guest to sign in. The three new tabs MUST be visible to every
  signed-in user whatever permissions they hold.
- **FR-004**: Tab fitting on small screens MUST keep today's sideways-scrolling behavior; labels MUST
  NOT be shortened.
- **FR-005**: Shared With You and Your Votes MUST have placeholder icons in the existing circle style;
  Your Polls MUST use the person icon; Watching MUST use the eye icon.
- **FR-006**: The rename is interface-only: stored data, routes and identifiers that use the word
  "bookmark" keep it.

**Tab membership**

- **FR-007**: Each tab MUST be defined by one relation, and a poll MAY appear in more than one tab.
- **FR-008**: Your Polls MUST list every poll the user created, whatever its visibility, sharing mode or
  state, newest created first, capped at the personal-tab result limit; an administrator sees only their
  own polls there.
- **FR-009**: Shared With You MUST list a Private Poll the user did not create when: it is Invitation
  Only and the user is currently on its invite list, or it is Anyone With The Link and the user opened
  its link or was invited. It MUST be ordered by latest activity and capped at the same limit.
- **FR-010**: Your Votes MUST list every poll the user voted in, ordered by the latest vote and capped.
  A private poll the user can no longer reach MUST be hidden (and return with access); a ban MUST keep
  the card with the ban message and no Watch control.
- **FR-011**: Watching MUST list only polls the user chose to watch, and only while the user may still
  watch them; the watch MUST be kept when access is lost. Voting MUST NOT watch a poll.
- **FR-012**: A poll's presence in Shared With You MUST persist after the user votes in it or watches it,
  and MUST end only when the poll is deleted, the user is no longer invited (Invitation Only), or the poll
  becomes Invitation Only without the user. Views and invitations MUST NOT expire, and users MUST NOT be
  able to remove a poll from Shared With You.
- **FR-013**: Shared With You and Your Votes MUST show published states (Archived read-only) plus the
  not-published placeholder.

**Poll links**

- **FR-014**: Opening a poll link while signed in MUST show that poll, subject to FR-017; a link to a
  public poll absent from the tab's rows MUST still show it as a maximized card that is not added to the
  list.
- **FR-015**: A view MUST be recorded only when the visitor is signed in, arrived through the link, the
  poll is a Private Poll that is Anyone With The Link, the visitor did not create it, and the poll was
  shown or is unpublished (FR-018). The server MUST record it as it serves the linked poll, and MUST NOT
  rely on a separate browser call.
- **FR-016**: Opening a link MUST land on the poll's own tab: Shared With You for a non-creator of a
  private poll, Your Polls for the creator (in any state), Trending for a public poll, with the poll
  maximized.
- **FR-017**: An unknown poll, an Archived poll or a not-yet-published Public poll (for a non-creator), an Invitation Only poll the visitor
  is not invited to, a ban, and any link opened by a user who lacks the permission to view polls MUST all give the same landing on the home page with the notice "That poll
  isn't available.", and MUST record no view.
- **FR-018**: A poll never launched (Initialized, Awaiting Approval, Rejected, or Editing before its
  first launch) opened by a non-creator through a Private, Anyone With The Link poll MUST record the view,
  land on Shared With You with the message in User Story 3, and send none of its content. An invited user
  opening the link of an unpublished Invitation Only poll MUST get the same landing and message, with no
  view recorded.
- **FR-019**: Every Shared With You card for an unpublished poll MUST be the placeholder of User Story 3,
  built on the server; when the poll is published it MUST become the ordinary card on the next refresh.

**Sign-in round trip**

- **FR-020**: A guest opening any poll link MUST be sent to sign-in before the poll is looked up, with the
  same result for every poll, and MUST see the generic line "Sign in to see the poll that was shared with
  you."
- **FR-021**: The poll id MUST survive sign-in through the page addresses and the emailed link, never a
  cookie, for existing accounts, for new accounts created from the poll's page (the account invitation
  MUST bring them back), for failed or expired links, and for third-party sign-in.
- **FR-022**: Only a valid poll id MUST be carried; anything else MUST be dropped. The system MUST build
  every redirect itself and never redirect to an address taken from a request.
- **FR-023**: Stay-signed-in, email rate limits and account-existence privacy MUST remain unchanged.
- **FR-024**: A signed-in visitor on the sign-in page with a valid poll id MUST be sent to that poll.

**Watching**

- **FR-025**: The Watch control MUST appear on every tab's cards when the user may watch the poll and
  MUST be hidden (never disabled) otherwise; it MUST read Watch / Watching with outline versus filled
  states, the tooltip "Stop watching this poll", and no bare count.
- **FR-026**: A user MAY watch a poll only when they hold the permission to view polls, the poll is
  published (a state voters can see), they are not banned, and it is Public, or Private and reachable:
  Invitation Only — invited or its creator; Anyone With The Link — its creator, or they viewed, voted in
  or were invited to it. A refused request MUST be answered exactly as for an unknown poll. Stopping
  watching MUST always be allowed.
- **FR-027**: The watching limit and daily expiry MUST apply to private watched polls unchanged, and
  expiry MUST NOT remove views or invitations.
- **FR-028**: No wording may mention email or notifications about watching.

**Your Polls card**

- **FR-029**: Cards of unlaunched polls in Your Polls MUST show their state in Title Case and the
  rejection reason when Rejected (only to the creator), and no voting control; Archived shows read-only
  results.
- **FR-030**: Other users MUST NEVER see the content of an unlaunched poll in any tab or search.
- **FR-031**: Your Polls MUST NOT show the "listed because" line; in other tabs it MUST read "You opened
  the link", "You were invited", "You voted" or "You are watching".

**Data**

- **FR-032**: A view MUST be stored as one entry per user per poll, updated (and not rewritten when under
  a minute old) on each open; deleting a poll MUST delete its views. No new table, column or index and no
  new configuration setting are added.
- **FR-033**: Removing a person from an invite list MUST delete their invitation relation in the same
  change; Shared With You for an Invitation Only poll MUST also require a current invite-list entry.
- **FR-034**: The tab bar MUST be a tab list: each tab a tab tied to its panel, exactly one selected, one
  tab reachable with Tab and the others with the arrow keys, Home and End (which move focus without
  activating a tab). The tabs MUST be Material 3 scrollable tabs — icon over label, at least 90 px wide and
  64 px tall, left-aligned — with the selected tab scrolled into view and an edge fading where more tabs
  wait.

### Key Entities

- **Poll relation**: a user's link to a poll — created, invited, voted, watching, or viewed (new) — with
  a time of last activity. The tabs are views of these relations.
- **View**: the record that a user opened a poll's link; one per user per poll, latest time kept.
- **Watch**: the user's deliberate choice to keep an eye on a poll, with the time it started and a limit
  and expiry.
- **Placeholder**: the redacted form of an unpublished poll shown in Shared With You (who shared it, and
  the time).
- **Poll link**: an address carrying a poll's id, which must survive sign-in.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A guest who follows a poll link, signs in (new or existing account, any browser) and sees
  the poll does so in a single flow with no step that requires re-finding the link, in 100% of tested
  paths.
- **SC-002**: 100% of poll links by signed-in non-creators of private polls result in the poll appearing
  in Shared With You at the top.
- **SC-003**: For an unpublished poll, 0 characters of its title, choices, counts or results are
  delivered to anyone other than its creator and administrators.
- **SC-004**: A guest cannot tell from any response to a poll link whether the poll exists, is private
  or is Invitation Only (identical outcomes in 100% of tested cases).
- **SC-005**: A user finds any poll they created, were sent, voted in or watch in exactly the tab named
  for that relation, with no poll missing from its tab and no poll listed in a tab it does not belong to,
  in 100% of tested cases.
- **SC-006**: No label in the interface uses a first-person word ("My", "Me"), verified across all tabs,
  menus, headings, messages and tooltips.
- **SC-007**: A watch request for a poll the user cannot reach is refused in 100% of tested cases, with
  an answer indistinguishable from an unknown poll.
- **SC-008**: Loading the home page does not noticeably slow: the three new personal tabs load within
  the same time as the existing personal tabs for the same number of polls.

## Assumptions

- Phone tab-fit layout (separate research), emailing watched results, removing polls from Shared With
  You, view expiry, and poll-creation changes are out of scope.
- Everything about who may create polls is as delivered by 025; Your Polls works for any user who can
  create polls.
- A user who lacks the permission to view polls (025) is never shown a poll through a link, as on every
  other tab, and no view is recorded for them.
- Poll identifiers are unguessable, so the generic "not published yet" message to a link holder reveals
  nothing a guesser could use.
- Existing watches of public polls, existing votes and existing invitations remain and are re-filed under
  the new tabs. Polls people already opened through a shared link are already recorded as views and carry
  over to Shared With You; no existing data needs conversion.
- Sign-in links already emailed keep working; the poll id is an optional addition.
- Watching and Your Votes tab refresh, caps, floors and shedding use the personal-tab behavior already in
  place.
- The interface vocabulary change (star to eye, Favorites to Watching) replaces the wording in tooltips
  and tests that assert the old words.
