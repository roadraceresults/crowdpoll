# Feature Specification: Deep Links

**Feature Branch**: `deep-links`

**Created**: 2026-11-19

**Status**: Draft

**Input**: User description: "requirements/20261119-182343-deep-links/requirements.md": give the poll a person is
viewing, and the results of a search, an address that can be copied and shared; when someone opens such an address,
show the poll over a tab that makes sense for them rather than for the person who shared it; and put a Share button on
every poll card so people who never touch the address bar can share a poll.

## User Scenarios & Testing *(mandatory)*

In this document a **poll link** is the address that names one poll and nothing else about the person who copied it,
the same address the administration card's "Copy poll link" gives today. The **address** is what the browser's address
bar shows. A poll is **maximized** when it is shown on its own, over the tab it was opened from; **closing** it
(Minimize, the page's Back arrow, Escape or the browser's Back) shows that tab again. The **tab behind** a maximized poll
is the tab that closing it shows. A **visitor** is whoever opens an address; a **guest** is a visitor who is not signed
in.

The problem this feature solves: today a poll opened from a tab has no address of its own, so it cannot be copied from
the address bar; and an address that did name a tab would carry the copier's tab, which may make no sense for the
person who opens it.

### User Story 1 - The address names the poll being viewed (Priority: P1)

A signed-in person browsing Trending maximizes a poll. The address now names both the tab and the poll. They copy it
from the address bar and paste it into a chat; they also reload the page and find the same poll still maximized over
Trending. When they minimize it, the address names Trending only.

**Why this priority**: It is the missing deep link the feature exists for; every other story builds on the poll having
an address.

**Independent Test**: Maximize a poll from any tab, read the address, reload, then close the poll and read the
address again.

**Acceptance Scenarios**:

1. **Given** a signed-in person on a tab, **When** they maximize a poll with its Maximize button, **Then** the address
   names that tab and that poll.
2. **Given** a poll that opens maximized because its ballot needs the room (Vote), **When** it opens, **Then** the
   address names the tab and the poll, as for Maximize.
3. **Given** a maximized poll, **When** it is closed by any means, **Then** the address names the tab only, and any
   other part of the address (such as search terms) is unchanged.
4. **Given** the address of a maximized poll, **When** the person who is viewing it reloads the page, **Then** the same
   poll is shown maximized over the same tab.
5. **Given** a maximized poll opened from a card, **When** the person uses the browser's Back, **Then** the poll closes
   and the tab is shown, as today.

---

### User Story 2 - Share a poll from its card (Priority: P1)

A person on a phone who never uses the address bar sees a poll they like. They tap the Share icon in the card's header,
beside Maximize, and their phone's share sheet opens with the poll link, ready to send to a chat. On a computer whose
browser has no share sheet, the same tap copies the poll link and a short message confirms it.

**Why this priority**: Most people share from a phone without touching the address bar; without a button the deep link
reaches only those who do.

**Independent Test**: On a phone browser and on a desktop browser without a share sheet, press Share on a card in the
grid and on a maximized card, and check what is offered or copied.

**Acceptance Scenarios**:

1. **Given** a card of a published poll (waiting to open, open or closed), in the grid or maximized, **When** the person looks at its header,
   **Then** a Share button with the usual share icon is there, beside Maximize or Minimize.
2. **Given** a browser with a share sheet, **When** the person presses Share, **Then** the share sheet opens holding the
   poll link, which names the poll and no tab.
3. **Given** a browser without a share sheet, **When** the person presses Share, **Then** the poll link is copied and
   the message "Link copied" is shown.
4. **Given** a browser that refuses the copy, **When** the person presses Share, **Then** the message "Could not copy the
   link" is shown.
5. **Given** an open share sheet, **When** the person cancels it, **Then** nothing else happens and no message is shown.
6. **Given** a poll that has not been published, **When** its card is shown, **Then** it has no Share button.
7. **Given** a guest viewing a public poll's card, **When** they look at its header, **Then** the Share button is there.

---

### User Story 3 - An opened link shows the poll over a tab that makes sense for the visitor (Priority: P1)

Someone receives an address copied from another person's address bar. It names the poll and the tab the sharer was on,
say "Your Polls", which is the sharer's own list and means nothing to the visitor. The visitor sees the poll maximized
over a tab that fits them: Shared With You when it is a private poll they may see, Your Votes when they have voted on
it, Watching when they watch it, otherwise Home. When the named tab does fit them (for example Trending for a public
poll), it is kept. Minimizing shows that tab.

**Why this priority**: Without it, every shared address risks putting the visitor on a wrong or empty tab, which is
the problem the requirements set out to avoid.

**Independent Test**: As several visitors (the creator, an invited person, someone who voted, someone who watches,
someone with no relation, a guest), open addresses naming each tab for public and private polls, and check the tab
behind the maximized poll.

**Acceptance Scenarios**:

1. **Given** an address naming a tab that fits the visitor (see FR-010), **When** they open it, **Then** the poll is
   maximized over that tab.
2. **Given** an address naming a tab that does not fit the visitor, or naming no tab, **When** they open it, **Then**
   the poll is maximized over the first tab of FR-011 that fits them.
3. **Given** a public poll the visitor has no relation to, and an address naming no tab, **When** they open it, **Then**
   the poll is maximized over Home.
4. **Given** a poll the visitor may not see, **When** they open any address naming it, **Then** they see "That poll isn't
   available." and their usual first tab, as today.
5. **Given** any opened address, **When** the visitor minimizes the poll or uses the page's Back arrow, **Then** the tab
   behind it is shown, with the poll still shown there as a card even if that tab's list would not hold it.
6. **Given** an opened address, **When** the visitor uses the browser's Back, **Then** they leave the page and return to
   where they came from, as today.
7. **Given** any opened address, **When** the visitor opens it, **Then** the poll is not added to their Watching list
   and nothing is recorded beyond what opening a poll link records today.

---

### User Story 4 - The address names a search (Priority: P2)

A person searches for "election". The address now names the Search tab and the terms. They copy it and send it; the
recipient sees the same search run for them. When the first person maximizes a result, the address also names that
poll; reloading shows the poll over the same search results, and minimizing returns to them.

**Why this priority**: The search tab already runs a search named in the address; only writing the terms is missing,
and it is the second place the requirements name.

**Independent Test**: Run a search, read the address, clear it, read again; maximize a result, reload, minimize.

**Acceptance Scenarios**:

1. **Given** the Search tab, **When** a search runs, **Then** the address names the Search tab and the terms, without
   adding a step to the browser's history.
2. **Given** a search in the address, **When** the person clears the search, **Then** the terms leave the address.
3. **Given** an address naming the Search tab and terms, **When** anyone opens it, **Then** the search runs for them,
   showing only polls they may see.
4. **Given** a result maximized from a search, **When** the page is reloaded or the address is opened by someone else,
   **Then** the poll is shown maximized over the same search's results, and minimizing returns to them.

---

### User Story 5 - Guests follow links as before (Priority: P2)

A guest opens a poll link or an address copied from a signed-in person's address bar. A public poll that search engines
may list opens on its own page, maximized over Trending, as today; any other poll asks them to log in first. After
logging in, the tab the address named is checked for them as for any signed-in visitor.

**Why this priority**: Guests are most of the people a shared link reaches; their path must not break.

**Independent Test**: As a guest, open addresses for a public and a private poll, with and without a tab, log in where
asked, and check where each lands.

**Acceptance Scenarios**:

1. **Given** a guest and a public poll search engines may list, **When** they open any address naming it, **Then** they
   see the poll's public page with the poll maximized over Trending, as today.
2. **Given** a guest and any other poll, **When** they open an address naming it, **Then** they are asked to log in, as
   today, and the address's tab is kept through the login.
3. **Given** a guest viewing a maximized poll, **When** they minimize it, **Then** Trending is shown.

---

### Edge Cases

- An address names a tab that does not exist, or a poll identifier that is malformed: the tab is ignored, and a
  malformed poll identifier is ignored as today.
- An address names the Live tab: Live is never kept from an address, because it depends on the visitor's own live
  updates; the fallback applies.
- An address names the Search tab with no terms: Search is not kept; the fallback applies.
- The poll is closed (voting ended): it is shared and opened like an open poll.
- The poll is being edited by its creator: visitors see it as before the edit, as today, and keep its Share button; the
  creator's own card hides Share until the edit ends.
- A guest opens an address naming the Search tab and terms for a poll that needs a login: after logging in, the poll is
  shown over the fallback tab, since the terms are not carried through the login.
- The poll was deleted, archived, or the visitor is banned from it: "That poll isn't available.", as today.
- A private poll that is not yet published and the visitor is invited: they see today's "This poll hasn't been published
  yet." message over Shared With You.
- The visitor created the poll and the address names Trending for a private poll: Trending does not fit a private poll,
  so the fallback gives Your Polls.
- The person maximizes a poll, then switches tab using the tab bar: the poll closes and the address names the new tab
  only.
- The address of a maximized poll is reloaded after the poll stopped being visible to the person: "That poll isn't
  available.", as today.

## Requirements *(mandatory)*

### Functional Requirements

**The address of a maximized poll**

- **FR-001**: Whenever a poll is maximized (by its Maximize button, by Vote opening it maximized, or by opening an
  address), the address MUST name the tab behind it and the poll, and keep any other part of the address already there.
- **FR-002**: Every way of closing a maximized poll MUST remove the poll from the address and leave the tab and the rest
  unchanged.
- **FR-003**: Maximizing a poll from a card MUST add one step to the browser's history, so the browser's Back closes it,
  as today; opening an address MUST add none, so the browser's Back leaves the page, as today.
- **FR-004**: Opening the address of a maximized poll MUST show that poll maximized, over the tab chosen as in
  FR-010 and FR-011.
- **FR-005**: The poll's public page for guests MUST keep its own address and MUST NOT be used for signed-in viewing.
- **FR-006**: Tab names in addresses MUST be the ones the site already uses (home, your-polls, shared-with-you,
  your-votes, trending, newest, watching, live, search).

**Choosing the tab behind an opened poll**

- **FR-007**: Whether the visitor may see the poll MUST be decided as today; a poll they may not see MUST show "That
  poll isn't available." and leave them on their usual first tab.
- **FR-008**: The tab MUST be chosen once, when the address is opened, using what the site knows about the visitor and
  the poll; closing the poll MUST show that tab without deciding again.
- **FR-009**: An address naming no tab (a poll link) MUST be treated as naming a tab that does not fit.
- **FR-010**: The tab the address names MUST be kept when it fits the visitor:
  - your-polls: the visitor created the poll;
  - shared-with-you: the poll is Private "Anyone with the link", or Private "Invitation Only" and the visitor is invited,
    and the visitor did not create it (Shared With You never lists the visitor's own polls);
  - your-votes: the visitor has voted on the poll;
  - watching: the visitor watches the poll;
  - home, trending or newest: the poll is public and published;
  - search: the address also names search terms;
  - live: never.
- **FR-011**: Otherwise the tab MUST be the first that applies: Your Polls (the visitor created the poll); Shared With
  You (a private poll the visitor may see); Your Votes (the visitor voted on it); Watching (the visitor watches it);
  otherwise Home.
- **FR-012**: The poll MUST be shown as the first card on the chosen tab once closed, even when that tab's list would not
  otherwise hold it or holds it further down, until the tab's next refresh.
- **FR-013**: Opening an address MUST NOT add the poll to the visitor's Watching list, and MUST NOT record anything
  beyond what opening a poll link records today.

**Guests**

- **FR-014**: A guest opening an address naming a poll MUST be sent where a guest is sent today: the poll's public page
  for a public poll search engines may list, otherwise the login page.
- **FR-015**: The tab the address named MUST be kept through the login, and checked as in FR-010 and FR-011 once the
  guest is signed in.
- **FR-016**: Closing a maximized poll as a guest MUST show Trending.

**Search in the address**

- **FR-017**: Running a search MUST put the Search tab and the terms in the address without adding a step to the
  browser's history; clearing the search MUST remove the terms.
- **FR-018**: Opening an address naming the Search tab and terms MUST run that search for the visitor, showing only
  polls they may see (as today).
- **FR-019**: A result maximized from a search MUST keep the terms in the address, and closing it MUST return to the
  same results.

**The Share button**

- **FR-020**: Every card of a published poll (waiting to open, open or closed), in a tab's grid and maximized, MUST show a Share button in its
  header beside Maximize or Minimize, with the usual share icon; guests included.
- **FR-021**: The card of a poll that is not published MUST NOT show a Share button.
- **FR-022**: Share MUST offer the poll link, which names the poll only, never a tab, and is the same link "Copy poll
  link" gives on the administration card.
- **FR-023**: Where the browser offers a share sheet, Share MUST open it with the poll link; elsewhere it MUST copy the
  poll link and show "Link copied", or "Could not copy the link" when the copy fails.
- **FR-024**: Cancelling the share sheet MUST show nothing.
- **FR-025**: The Share button MUST be named "Share poll: <title>" for screen readers, and MUST be as easy to press as the
  card's other header buttons, including the larger touch area of the phone layout.

**Unchanged**

- **FR-026**: Poll links already given out (by "Copy poll link", invitation emails or earlier shares) MUST keep working,
  landing as FR-009 describes.
- **FR-027**: Who may see a poll, the poll's public page and the login page's link preview MUST NOT change.

### Key Entities

- **Poll link**: an address naming one poll and nothing else; what Share and "Copy poll link" give.
- **Viewing address**: the address while a poll is maximized: the tab behind it, the poll, and any other part already
  there (search terms).
- **Requested tab**: the tab an opened address names; a hint, kept only when it fits the visitor.
- **Chosen tab**: the tab behind an opened poll, decided once when the address is opened.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of maximized polls, the address names the poll, and reloading it shows the same poll maximized over
  the same tab.
- **SC-002**: For each of the six visitor kinds (creator, invited, linked, voter, watcher, unrelated) and each tab an
  address can name, the tab behind the opened poll is the one FR-010 and FR-011 give, with no case left undecided.
- **SC-003**: No opened address ever shows a private poll over Home, Trending or Newest, nor a poll over Your Polls,
  Shared With You, Your Votes or Watching when that list would not hold it for the visitor.
- **SC-004**: A person on a phone can share a poll from its card in two taps (Share, then the chosen app), without the
  address bar.
- **SC-005**: Every poll link given out before this feature still opens the poll for the visitors who could open it
  before.
- **SC-006**: Opening an address writes nothing new to the visitor's lists: their Watching list is the same before and
  after.
- **SC-007**: A copied search address shows the recipient the same search, limited to polls they may see.

## Assumptions

- The address keeps today's form: the tab and the poll are named in the query part, with the existing poll parameter
  name, so links already given out keep working.
- "Public and published" covers open and closed polls; a poll not yet published or archived is not shown to visitors,
  as today.
- Opening a poll link still counts as a view of an "Anyone with the link" poll, which is what puts it in Shared With You;
  that is not new.
- A limit on how many people may open an "Anyone with the link" poll is a later feature.
- Deep links for the administration page (its view, search terms and open row) are a later feature; the maximized
  poll's own states (the ballot side, the line graph, who voted, "Show all choices"), Profile, Settings and the legal
  pages need none.
- The share icon is the usual three-dots-joined icon shown in the requirements.
- No new cookie or browser storage is introduced.
