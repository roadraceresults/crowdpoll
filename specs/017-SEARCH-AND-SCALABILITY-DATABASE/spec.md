# Feature Specification: Search and Scalability Database

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-09-18

**Status**: Draft

**Input**: User description: "" (empty — the feature is the high-level requirements document
this session produced, which opens with "Start a new spec for these requirements called
`017-SEARCH-AND-SCALABILITY-DATABASE`")

**Source requirements**: `designDocs/017-high-level-requirements-SEARCH-AND-SCALABILITY-DATABASE-SCENARIO-2.md`
**Architecture**: `architecture/017-search-scalability-database/architecture.md` — 16 findings
raised across two passes and resolved into the requirements text

## Clarifications

### Session 2026-09-18

- Q: Are existing features the spec does not mention (admin editing and its lock, screening and
  schedule sweeps, rosters, profile, exports, the standalone poll page) preserved on the new data
  store? → A: All are preserved with unchanged behaviour, except two that are explicitly retired:
  the standalone poll page and the single-poll view, which Live Results replaces.
- Q: With the standalone poll page retired, how does a user act on a search result? → A:
  Search-result cards keep the Bookmark button (bookmarking places the poll in Favourites or My
  PRIVATE POLLS, where the user votes or watches it; guests are prompted to sign in) and also
  carry a Live Results action that adds the poll to the Live Results tab for signed-in users,
  from which the user can vote. Search-result cards still have no Vote button.
- Q: Does a popular public poll leave TRENDING while an administrator is editing it? → A: No.
  TRENDING covers public polls that are OPEN, or EDITING with a prior state of OPEN; a poll
  under edit stays in TRENDING showing its last published content until the edit is published.
- Q: Who may watch a private poll in Live Results? → A: Adding a poll to Live Results requires
  the same view eligibility as viewing it today (public; private with the link; invitation-only
  only if invited or the creator); the check runs when the poll is added and is cached with the
  registration.
- Q: What does a guest see of the tabs that need a session? → A: All five tabs are always
  shown; for a guest, My PRIVATE POLLS, Favourites and Live Results are disabled, and clicking
  one prompts to sign in.
- Q (from `/speckit-analyze` I1): FR-044 made the identity call the only per-user request on a
  page load, but FR-019 fetches a signed-in user's overlay on page load — one request or two?
  → A: One for a guest; two for a signed-in user (identity and the overlay for the visible
  trending polls). FR-044, SC-006 and US8 scenario 2 amended; mirrored in the source
  requirements.
- Q (from `/speckit-analyze` A1): SC-009 said an unchanged tab refresh "transfers under one
  kilobyte", but the request carries a ≈ 4 KB version map. → A: The criterion measures the
  response; the request is excluded. SC-009 amended.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The home page becomes tabs that refresh only when asked (Priority: P1)

A visitor arriving at the site sees a **TRENDING** tab: the two hundred public open polls (or
polls under edit that were open) with the most votes in the last hour, most voted first. Alongside it are tabs for **My PRIVATE
POLLS**, **Favourites**, **Search** and **Live Results**. Nothing on the page refreshes on its
own except the Live Results tab; a tab is refreshed when the visitor clicks it or its Refresh
button, and never more often than once every five seconds. A browser refresh brings the visitor
back to TRENDING.

Today the home page lists every public poll and re-fetches the whole list every five seconds for
every open browser. With a quarter of a million polls and a million people connected, that
listing cannot be shown and that refresh cannot be afforded; the tabs and the on-demand refresh
are what replace it.

**Why this priority**: Every other story presumes this shape of the home page. It is also the
single largest reduction in server load the feature makes — from a request every five seconds
per visitor to one per deliberate action.

**Independent Test**: Load the home page as a guest and as a signed-in user. TRENDING shows at
most two hundred public open polls, most voted first. No tab changes on its own over several
minutes. Clicking Refresh twice within five seconds performs one refresh and shows the button
disabled for the rest of the interval. Switching between two tabs within five seconds shows each
tab's held copy without a new request. A browser refresh lands on TRENDING.

**Acceptance Scenarios**:

1. **Given** a visitor arrives or refreshes the browser, **When** the page renders, **Then** the
   TRENDING tab is selected and shows the current trending list, in trending order.
2. **Given** any tab other than Live Results is open, **When** several minutes pass without
   interaction, **Then** its content does not change.
3. **Given** a tab was refreshed less than five seconds ago, **When** the user clicks Refresh,
   **Then** no refresh occurs, the button is disabled for the remainder of the interval, and no
   error is shown.
4. **Given** the user switches from Favourites to My PRIVATE POLLS and back within five seconds,
   **When** each tab is shown, **Then** it shows the copy it already held, and no request is made.
5. **Given** the trending list has been recomputed (every minute), **When** a signed-in user
   clicks TRENDING or Refresh, **Then** the counts on the cards are at most a minute old and any
   poll that entered or left the top two hundred is shown or removed.
6. **Given** a signed-in user views TRENDING, **When** the cards render, **Then** the polls the
   user has voted in show the user's own choices, and bookmarked polls show as bookmarked, even
   though the list itself is identical for every visitor.
7. **Given** a poll card in any tab, **When** the user looks at it, **Then** it has a Vote
   button (except in Search), a Live Results button (except in Live Results), and a Bookmark
   button.

---

### User Story 2 - Find polls by typing words (Priority: P2)

A visitor types a few words into the search box and presses Enter. The Search tab replaces the
page content with up to two hundred public polls that match best — title matches count more than
subtitle matches, which count more than choice matches — and the box keeps the words, with a
clear control at its right (FIX012; previously the box was cleared). If the words
together match fewer polls than the cap, polls matching any of the words are added, and then
polls that match allowing for typos. Result cards show counts as they were a few seconds ago and
carry no Vote button; a signed-in user acts on a result by bookmarking it (it then appears in
Favourites or My PRIVATE POLLS) or by pressing Live Results, which adds it to the Live Results
tab, where it can be voted on.

**Why this priority**: Once the home page no longer lists every poll, search is how a visitor
finds any poll that is not trending or personal to them.

**Independent Test**: With a quarter of a million polls loaded, search for a distinctive title
word; the poll appears first. Search for a common word; two hundred results return, flagged as
truncated, in under a second. Search for a misspelt title; the intended poll still appears. Search
for a private, invitation-only poll's title; it does not appear.

**Acceptance Scenarios**:

1. **Given** the search box holds words and the user presses Enter, **When** results arrive,
   **Then** the Search tab is selected, the box keeps the words (FIX012), and at most two
   hundred polls are shown, best match first.
2. **Given** two polls, one with the search word in its title and one with it only in a choice,
   **When** both match, **Then** the title match is ranked first.
3. **Given** the search word matches more than two hundred polls, **When** results arrive,
   **Then** exactly two hundred are shown and the response indicates that the list was cut off,
   without stating a total.
4. **Given** the words together match fewer than two hundred polls, **When** results arrive,
   **Then** polls matching any of the words follow, and then near-misses that differ by a typo.
5. **Given** a poll that is private, or that is not open, closed or waiting to open, or that is
   being edited but was never public, **When** any search runs, **Then** it never appears.
6. **Given** the user searched two seconds ago, **When** they press Enter again, **Then** the
   search is not sent until two seconds have passed since the last one.
7. **Given** the same words were searched by anyone within the last ten seconds, **When** the
   user searches them, **Then** the result is served from the shared copy and is identical.
8. **Given** a signed-in user viewing a search result, **When** they press Live Results,
   **Then** the poll is added to the top of the Live Results tab, where it can be watched and
   voted on; **When** they press Bookmark, **Then** it appears in Favourites or My PRIVATE
   POLLS; a guest pressing either is prompted to sign in.

---

### User Story 3 - A vote is always accepted and immediately reflected (Priority: P3)

A signed-in user presses Vote on a poll. Within the same response the card shows the poll's new
totals including their vote, and the user may vote again on another poll after two seconds.
If the site is under such load that votes are being written to storage more slowly than they
arrive, the user is told their vote is queued and will be processed shortly — it is never
refused because of load. A second vote on a poll that allows only one is refused at once, even
while the first is still queued.

**Why this priority**: Votes are the site's product; the load-management rules that follow are
designed around never losing one.

**Independent Test**: Vote on a poll; the response carries the new totals and the Vote buttons
disable for two seconds. Drive votes at a rate above what storage can absorb; every vote is
accepted, responses report "queued" once the backlog exceeds two seconds, and after the nightly
reconciliation the stored totals equal the number of vote rows. Vote twice on a Final-Vote poll
within the queue's delay; the second is refused.

**Acceptance Scenarios**:

1. **Given** an eligible signed-in user, **When** they vote, **Then** the response carries the
   poll's new vote count and per-choice counts including their vote, and the Vote buttons are
   disabled for two seconds.
2. **Given** vote storage is keeping up, **When** a user votes, **Then** the response says the
   vote is recorded.
3. **Given** votes are arriving faster than storage absorbs them and the backlog exceeds two
   seconds, **When** a user votes, **Then** the vote is accepted, counted and queued, and the user
   is told it is queued and will be processed as soon as possible.
4. **Given** a Final-Vote poll on which the user's earlier vote is still queued, **When** they
   vote again, **Then** the second vote is refused as already voted.
5. **Given** a user who is banned from a poll, not invited to an invitation-only poll, or voting
   on a poll that is not open, **When** they vote, **Then** the vote is refused with the existing
   message and is never queued or counted.
6. **Given** a user voted less than two seconds ago on any poll, **When** they vote again,
   **Then** the vote is held by the browser and submitted when the interval has passed.
7. **Given** more than six hundred votes arrive from one network address within a minute,
   **When** the next arrives, **Then** it is refused and an operator alert is raised.
8. **Given** a vote was accepted, **When** the nightly reconciliation runs, **Then** every poll's
   stored totals equal the votes actually stored for it.

---

### User Story 4 - Watch up to five polls live (Priority: P4)

A signed-in user presses Live Results on a poll card. The Live Results tab shows that poll's
results and keeps them current, refreshing every two seconds when the site has capacity and less
often when it does not — the site tells the browser how long to wait each time. The tab holds
up to five polls, most recently added on top; adding a sixth drops the oldest. After thirty
minutes without interaction the user is asked whether to keep receiving updates; the timer also
pauses while the page is hidden.

**Why this priority**: It is the only place on the site where results are live, so it is what
makes the site feel alive despite the tabs not refreshing on their own.

**Independent Test**: Open Live Results for a poll and vote on it from another browser; the
count changes within two seconds. Add five more polls; the first added is gone and the newest is
on top. Leave the tab idle for thirty minutes; the prompt appears; Cancel closes the tab. Under
load, the interval shown in responses lengthens and the browser follows it.

**Acceptance Scenarios**:

1. **Given** a signed-in user presses Live Results on a poll, **When** the tab opens, **Then**
   the poll's results are shown and refresh every two seconds while the site has capacity.
2. **Given** a vote is cast on a watched poll, **When** the next refresh occurs, **Then** the
   new count is shown — it does not wait for the periodic write of counts to storage.
3. **Given** the tab holds five polls, **When** a sixth is added, **Then** the least recently
   added is removed and the new poll is on top; re-adding a poll already present moves it to the
   top.
4. **Given** the site is over its capacity, **When** the tab refreshes, **Then** the response
   carries a longer interval and the browser waits that long before refreshing again; the
   interval returns to two seconds after load falls.
5. **Given** thirty minutes without interaction, **When** the timer elapses, **Then** a prompt
   "Do you want to continue to receive Live Results updates for this poll?" appears for that tab
   only; Yes restarts the timer and Cancel closes the tab.
6. **Given** a page that never answers the prompt, **When** its registration lapses (thirty
   minutes plus the interval it was last told to use), **Then** the site stops serving its
   refreshes.
7. **Given** the browser page is hidden, **When** time passes, **Then** no refreshes are sent;
   they resume on focus.
8. **Given** a guest, **When** they press Live Results, **Then** they are prompted to sign in.
9. **Given** a signed-in user who is neither invited to nor the creator of an invitation-only
   poll, **When** they attempt to add it to Live Results (by any means, including its id),
   **Then** it is refused with the existing not-eligible message and nothing is registered.

---

### User Story 5 - The site protects itself under load without failing users (Priority: P5)

When a million people are connected, the site never lets its own load exceed a configured
ceiling. Rather than failing requests, it lengthens the intervals it hands out — searches first,
then manual refreshes, then Live Results — and never delays a vote. When a large event starts and
many people open Live Results at once, the intervals are lengthened before the surge arrives, so
nobody sees an error. An overloaded server answers "try again in two seconds" instead of slowing
to a crawl.

**Why this priority**: This is the guarantee that makes the load target achievable with a small
fleet; without it every other story degrades into timeouts at scale.

**Independent Test**: Drive requests above the ceiling; the search interval lengthens first,
then the manual refresh interval, then Live Results; votes continue to be accepted; the served
rate stays at the ceiling; intervals return to their floors within a few seconds of load
falling. Open a large number of Live Results tabs within a minute; no error responses appear at
the start. Drive one server beyond its concurrency limit; it answers "try again" within
milliseconds and keeps being reported healthy.

**Acceptance Scenarios**:

1. **Given** the total rate of votes, searches, live refreshes and manual refreshes exceeds the
   ceiling, **When** the next second's requests are served, **Then** the interval handed to
   searches is lengthened first; if still over, manual refreshes; if still over, Live Results.
2. **Given** the site is over the ceiling, **When** a user votes, **Then** the vote is accepted
   and its interval is unchanged.
3. **Given** the site is under eighty percent of the ceiling, **When** the next second's
   requests are served, **Then** the lengthened intervals shorten again, Live Results first.
4. **Given** searches and manual refreshes have been lengthened to eight times their floors,
   **When** the site is still over the ceiling, **Then** only then is the Live Results interval
   lengthened.
5. **Given** many Live Results tabs are opened within a minute, **When** their first refreshes
   arrive, **Then** they receive a lengthened interval rather than errors.
6. **Given** a request arrives before its interval has elapsed, **When** it is received,
   **Then** it is refused with the remaining wait time, and the browser waits rather than
   retrying at once.
7. **Given** one server has more than two hundred requests in flight, **When** another arrives,
   **Then** it is answered with "try again after two seconds" within milliseconds, searches
   being shed before manual refreshes before Live Results, and votes and the health check last,
   and the server continues to pass its health check.
8. **Given** more servers are added under load, **When** they report present, **Then** the
   ceiling rises in proportion within thirty seconds.
9. **Given** the shared cache becomes unreachable, **When** any dynamic request arrives,
   **Then** it is answered "try again" rather than hanging or failing, page loads still work,
   and normal service resumes when the cache returns, with at most about a second of votes lost
   and the counts corrected by the nightly reconciliation.

---

### User Story 6 - Administrators search polls with structured filters (Priority: P6)

An administrator on the admin page combines free text with dropdowns for state, visibility,
choice mode and vote mutability, a creator-name box that matches any part of the name, day
selectors for created, start and end dates in the administrator's own time zone, and comparisons
on vote, invited-voter and banned-voter counts. Blank controls are ignored; the rest are ANDed;
results are newest first, at most two hundred, with a flag when cut off.

**Why this priority**: Administrators must be able to find any of a quarter of a million polls;
today's admin list shows them all and will not scale.

**Independent Test**: Filter by state OPEN and creator name "dav"; only open polls whose
creator's name contains "dav" (any case) appear, newest first. Add a created-date "=" today in
the administrator's zone; only polls created that calendar day remain. Filter on vote count
">= 100"; counts reflect the stored totals.

**Acceptance Scenarios**:

1. **Given** several controls are filled, **When** the search runs, **Then** every result
   satisfies all of them and results are ordered newest first.
2. **Given** the creator box holds "dav", **When** the search runs, **Then** "David Brooks" and
   "Adavi" both match, regardless of case.
3. **Given** a date control "created = 2026-09-18" and an administrator in a non-UTC zone,
   **When** the search runs, **Then** polls created on that calendar day in the administrator's
   zone match; ">=" starts at midnight and "<=" runs through the end of that day.
4. **Given** a poll with no start date, **When** any start-date filter is set, **Then** the poll
   never matches.
5. **Given** more than two hundred polls match, **When** results arrive, **Then** two hundred
   are shown with a cut-off flag and no total.
6. **Given** the administrator is on the admin page, **When** time passes, **Then** the admin
   list still refreshes on its existing interval and the card being edited is still left alone.

---

### User Story 7 - Favourites and bookmarks (Priority: P7)

A signed-in user bookmarks polls with a button on any card, up to two hundred. The Favourites
tab lists the public polls the user created, voted in or bookmarked; My PRIVATE POLLS lists the
private polls the user created, was invited to or voted in. Bookmarks fall away silently once a
poll is archived, has been closed for six months, or has been open for six months without a
vote.

**Why this priority**: The personal tabs are how a signed-in user returns to what matters to
them once the full listing is gone.

**Independent Test**: Bookmark a public poll; it appears in Favourites. Bookmark a two hundred
and first poll; refused. Vote in a private poll; it appears in My PRIVATE POLLS. Set a poll's
closed date seven months back and run the daily removal; the bookmark is gone with no message.

**Acceptance Scenarios**:

1. **Given** a signed-in user presses Bookmark on a card, **When** the action completes,
   **Then** the poll appears in Favourites (if public) or My PRIVATE POLLS (if private) and the
   card shows Un-bookmark.
2. **Given** the user already holds two hundred bookmarks, **When** they bookmark another,
   **Then** it is refused with a message.
3. **Given** a bookmarked poll is archived, or has been closed for six months, or has been open
   for six months since its last vote — or since it opened, if it never received a vote —
   **When** the daily removal runs, **Then** the bookmark is removed without notifying the user.
4. **Given** a user created, voted in or bookmarked a public poll, **When** Favourites is
   refreshed, **Then** the poll is listed, most recently changed first, capped at two hundred.
5. **Given** a user created, was invited to or voted in a private poll, **When** My PRIVATE
   POLLS is refreshed, **Then** the poll is listed.
6. **Given** a guest, **When** they press Bookmark, Vote or Live Results, **Then** they are
   prompted to sign in.

---

### User Story 8 - Guests and browser refreshes cost almost nothing (Priority: P8)

A guest sees TRENDING and Search, may click Refresh, and sees others' changes only by reloading
the page. Reloading — even repeatedly — costs the site almost nothing: the page and its assets
come from the content delivery network, the trending list comes from the network's copy or the
browser's own recent copy, and a single small request identifies the visitor. A visitor who
reloads faster than a hundred and twenty times a minute is shown their held copy with a notice,
never an error page.

**Why this priority**: Half the load target is guests, and a browser's refresh button is the one
control the site cannot disable.

**Independent Test**: Reload the page repeatedly as a guest; at most one request per reload
reaches the application, and the trending list is served from the delivery network. Exceed the
per-minute limit; the page still renders, with a notice.

**Acceptance Scenarios**:

1. **Given** a guest, **When** they view the home page, **Then** all five tabs are shown; My
   PRIVATE POLLS, Favourites and Live Results are disabled and clicking one prompts to sign in;
   nothing refreshes automatically.
2. **Given** any visitor reloads the page, **When** the page renders, **Then** at most one
   request (a guest) or two (a signed-in user: identity and overlay) reaches an application
   server; assets and the trending list are served by the delivery network, answering "unchanged"
   when the browser's copy is current.
3. **Given** the browser holds a trending copy less than a minute old, **When** the page loads,
   **Then** it renders from that copy first and only checks for a newer one.
4. **Given** a visitor exceeds a hundred and twenty page loads in a minute, **When** the next
   load occurs, **Then** the page renders its held copy with a "refreshing too quickly" notice
   and no error page.
5. **Given** two guests behind one shared network address, **When** both search within two
   seconds, **Then** the second waits; the site accepts that shared addresses share guest
   limits, and a guest who signs in gets their own.

---

### User Story 9 - The site runs on its new foundation at the load target (Priority: P9)

The operator deploys the site on a new primary data store, a search engine, a shared cache and a
content delivery network, with the application fleet growing and shrinking automatically with
load. Development needs only the data store; the cache, queue and search engine have in-process
stand-ins. Existing data is not carried over: every account is created afresh.

**Why this priority**: It is the foundation the other stories stand on, but delivers no visible
value by itself.

**Independent Test**: Run the test suite without any external service beyond the data store.
Deploy with the fleet at its minimum; drive load; the fleet grows toward its maximum and the
ceiling rises with it; remove load; the fleet shrinks, and no vote in flight is lost when a
server is retired.

**Acceptance Scenarios**:

1. **Given** a fresh deployment, **When** it starts, **Then** its storage structure is created or
   upgraded automatically, and it refuses to start if that fails.
2. **Given** the fleet at its minimum of four servers, **When** load rises past the target
   utilisation, **Then** servers are added up to twelve and the ceiling rises accordingly; when
   load falls they are removed.
3. **Given** a server is being retired, **When** it is told to stop, **Then** it stops taking
   requests, finishes writing the votes it holds, and exits within the grace period.
4. **Given** a developer's machine with only the data store installed, **When** the test suite
   runs, **Then** it passes without any container or external service.
5. **Given** the search engine is unavailable, **When** a user searches, **Then** results still
   come from the data store's own search, with searches lengthened to protect the data store.
6. **Given** the previous data store, **When** the feature is deployed, **Then** nothing is
   migrated; accounts, polls and votes start empty.

---

### Edge Cases

- **A poll is closed or archived while it is in someone's Live Results tab**: the next refresh
  shows the changed state as a full card update; it stays in the tab until removed.
- **A trending poll is opened for editing by an administrator**: it stays in TRENDING with its
  last published content; when the edit is published, the next recompute shows the new content
  as a full-card change.
- **A vote arrives while the shared cache is failing over**: it is answered "try again" and the
  browser retries after the given interval; the vote is not lost because it was never accepted.
- **A user's cached session is ended by an administrator**: the change takes effect on the
  user's next request; a session removed directly in storage by an operator is honoured within
  five minutes.
- **The trending top two hundred is re-ranked but its membership is unchanged**: only the small
  counts object changes; the full card object is not republished.
- **A creator renames themselves**: every poll they created shows the new name on its next
  refresh and is findable by it in the admin search within fifteen seconds.
- **A search server is slow**: searches are lengthened for everyone; nothing else on the site is
  affected.
- **A single server is overloaded while the rest of the fleet is fine**: only that server sheds,
  and it stays in the pool.
- **A million users reload within one minute**: the delivery network absorbs the reloads; the
  application sees one small request per reload.
- **A shared network address (a campus, an office) votes together**: up to six hundred votes a
  minute pass; beyond that, votes from that address are refused and operators alerted.
- **A tab is switched to within five seconds of its last refresh**: the held copy is shown; no
  request, no error.
- **A queued vote fails by system error after being counted**: the nightly reconciliation
  corrects the poll's totals from the stored votes.

## Requirements *(mandatory)*

### Functional Requirements

#### Foundation and data

- **FR-001**: The site MUST hold 250,000 polls and serve 1,000,000 concurrently connected
  users, half of them signed in, without any request reading the whole poll collection.
- **FR-002**: The previous data store MUST be removed entirely, including account data; nothing
  MUST be migrated; accounts MUST be re-created on the new store.
- **FR-003**: The new primary data store MUST be a managed relational store hosted with the
  rest of the site, and its structure MUST be created or upgraded automatically at start-up,
  with a failure preventing start-up.
- **FR-004**: A poll MUST carry, in addition to its current fields: the creator's name (kept
  current when the creator renames themselves, in the same transaction as the rename); the time
  it closed; the time of its last vote; its vote, invited-voter and banned-voter counts and its
  per-choice counts; a content version that changes on any change of state or content; and a
  counts version that is the poll's per-vote sequence number.
- **FR-005**: Votes, invitations, bans and bookmarks MUST each be stored one row per
  participant, so that a public poll's participation is unbounded and one vote per participant
  and no duplicate invitations are enforced by the store.
- **FR-006**: The site MUST keep, for each signed-in user, the polls they created, were invited
  to, voted in or bookmarked, written in the same transaction as the event that created the
  relationship, so that each personal tab is one indexed lookup.
- **FR-007**: Vote history MUST be kept in an append-only record partitioned by month.

#### Counts and versions

- **FR-008**: Vote counts MUST be accumulated in the shared cache as absolute values with a
  per-vote sequence number, never as increments, and written to the poll's stored row by a
  periodic flush (default every two seconds), not per vote.
- **FR-009**: Everything a user sees — tab refreshes, Live Results, the vote response, the
  trending counts — MUST read the live cached counts and sequence, so that a poll shows the same
  number on every surface and a count can never step backwards; the stored row's counts serve
  only the store itself, the administrator's filters, the trending recomputation and the search
  index.
- **FR-010**: A nightly reconciliation MUST recompute every recently voted poll's counts from
  its stored votes and correct any drift, and the counts MUST be rebuildable the same way if the
  cache is lost.

#### Home page and tabs

- **FR-011**: The home page MUST be a tabbed control with TRENDING, My PRIVATE POLLS,
  Favourites, Search and Live Results, all five always shown; TRENDING MUST be selected on
  arrival and after a browser refresh; for a guest, My PRIVATE POLLS, Favourites and Live Results
  MUST be disabled and clicking one MUST prompt to sign in.
- **FR-012**: Every card except in Search MUST have a Vote button; every card except in Live
  Results MUST have a Live Results button (including search-result cards); every card MUST have a
  Bookmark or Un-bookmark button; for a guest the Vote, Live Results and Bookmark buttons MUST
  prompt to sign in.
- **FR-013**: Tab content MUST be refreshed only on a tab click, a Refresh click, or — for Live
  Results only — automatically; a refresh MUST be one request for every poll in the tab.
- **FR-014**: The browser MUST hold the last response for each tab and render it on a tab click,
  requesting a refresh only when that copy is older than the manual floor, when none is held, or
  on Refresh after the floor; refusing an early request MUST remain the server's backstop.
- **FR-015**: TRENDING MUST be the 200 (configurable) public polls that are open — or being
  edited with a prior state of open, in which case the last published content is shown — with
  the most votes in the trailing hour, ties by total votes, recomputed every minute
  (configurable) from cached per-five-minute vote buckets — never by scanning stored votes — and
  identical for every visitor; a poll MUST NOT leave TRENDING merely because an administrator
  opened it for editing.
- **FR-016**: TRENDING MUST be published as two objects on the content delivery network, each
  cached for the recompute interval and validated by a version: a small counts object (ids in
  trending order, each poll's counts and counts version, and a membership version that is a
  hash of the set of ids) republished every recompute; and a full-cards object republished only
  when the set of ids changes, never on a reorder alone.
- **FR-017**: The browser MUST fetch the counts object on each TRENDING interaction, render the
  cards it holds in that order with those counts, and fetch the full object only when the
  membership version differs from the one it holds; it MUST keep its last copy in browser
  session storage and, on a page load, render from a copy younger than the recompute interval
  before validating it.
- **FR-018**: TRENDING interactions MUST NOT count as dynamic requests: their manual floor is
  enforced by the browser alone and the delivery network's cache lifetime is the server-side
  bound. When the delivery network is not configured, TRENDING MUST be served from the shared
  cache with version validation and touch neither the data store nor the search engine.
- **FR-019**: A signed-in user's overlay for the visible polls (voted, with which choices;
  bookmarked) MUST be obtained by one call answered from the user's relationships, fetched on
  page load and when the counts object brings ids without an overlay entry, and updated in the
  browser from the user's own actions without re-fetching; that call MUST count as a manual-kind
  dynamic request.
- **FR-020**: My PRIVATE POLLS MUST list the private polls the user created, was invited to or
  voted in; Favourites MUST list the public polls the user created, voted in or bookmarked; each
  MUST be one indexed lookup ordered most recently changed first, capped at the search cap, and
  MUST require a session; both MUST return the overlay fields inline.
- **FR-021**: Every tab refresh other than TRENDING MUST send the content and counts versions
  the browser holds for each poll and the tab's membership version, and MUST receive: "unchanged"
  when nothing moved; only counters for polls whose counts moved; full cards only for polls
  whose content moved; and the ordered id list (with cards for ids the browser lacks) only when
  membership changed — computed from the cache without touching the data store for counts or
  content.
- **FR-022**: Listings MUST return only the fields a card renders — both faces of the card, front
  and back (the voting side), render from the card's own fields and the overlay, so no per-card
  fetch exists; every response MUST be compressed, and shared listings stored pre-compressed.

#### Refresh floors

- **FR-023**: Every vote, search, Live Results refresh, and Refresh or tab click on a tab served
  by the application MUST be a dynamic request with a per-user floor for its kind, enforced by
  the browser and by the server (per session, per network address for guests): Live Results
  refresh 2 s, manual Refresh and tab clicks 5 s, search 2 s, vote 2 s (all configurable).
  *FIX008*: the manual and search floors are sustained rates — a user holds a small burst
  allowance (5 manual, 3 search, configurable; Live Results and votes 1) of requests that may
  follow each other at once, refilled one per floor interval.
- **FR-024**: A dynamic request arriving before its floor MUST be refused with the remaining
  wait and the interval to use, and the browser MUST wait rather than retry at once.
- **FR-025**: A Refresh click on the Search tab MUST re-run the last query as a Refresh click for
  the floor and interval, and if it misses the result cache the engine query MUST count against
  the search sub-budget.

#### Live Results

- **FR-026**: The Live Results tab MUST be available only to signed-in users, hold at most 5
  (configurable) polls as a most-recently-added-first list — re-adding moves to the top, a new
  poll when full removes the least recently added — and refresh all of them in one request.
  Adding a poll MUST require the same view eligibility as viewing it today (public; private with
  the link; invitation-only only if invited or the creator); the check MUST run when the poll is
  added and its result MUST be cached with the registration, so that refreshes need no further
  check and an ineligible user cannot watch a poll by supplying its id.
- **FR-027**: A Live Results response MUST read each poll's content from its cached projection
  and its counts from the live cached counts, never from the data store, and MUST be served as a
  delta against the versions the browser holds.
- **FR-028**: The browser MUST refresh at the interval the last response handed it, never more
  often than the Live Results floor, and MUST pause while the page is hidden.
- **FR-029**: Each Live Results refresh MUST register the user in a live registry with an
  expiry of the last refresh plus the interval handed to that user plus the idle time
  (default 30 minutes); expired registrations MUST NOT be served.
- **FR-030**: After the idle time without interaction the browser MUST show, modal for that tab
  only, "Do you want to continue to receive Live Results updates for this poll?" with Cancel and
  Yes; Yes restarts the timer and Cancel closes the tab.

#### Votes

- **FR-031**: Every vote MUST follow one path: validate; count in the cache; enqueue; respond
  with the poll's new counts and counts version, a status of recorded or queued, and the vote
  floor as its interval.
- **FR-032**: Validation (session, poll open, not banned, invited where required, not already
  voted on a Final-Vote poll) MUST happen before enqueueing and MUST be served from the cache on
  the hot path — cached per-poll ban and invitation sets invalidated whenever a roster changes,
  and a per-session set of voted polls written at enqueue — with the data store consulted only
  on a cache miss; a vote failing validation MUST be refused with the existing messages and never
  queued or counted.
- **FR-033**: Votes MUST be written to the data store by consumers on every server in batches
  (default 500), idempotently (a changed vote replaces on a Dynamic-Vote poll; a duplicate is
  ignored on a Final-Vote poll), with the vote history and user relationship rows in the same
  transaction; the status MUST become "queued" when the consumers' backlog exceeds 2 s
  (configurable), and the user MUST be told the vote is queued and will be processed as soon as
  possible.
- **FR-034**: The vote MUST never be lengthened by the load ceiling; a vote MUST count against
  the ceiling but be accepted whenever the cache is reachable.
- **FR-035**: The vote floor MUST be per session across all polls; at most 600 (configurable)
  votes per minute MUST be accepted from one network address, crossing which MUST refuse the
  vote, increment an abuse counter reported by the health check, and write a server log line
  that the hosting platform's alert policy matches; a shed or early vote MUST be kept by the
  browser and retried once after the given wait.
- **FR-036**: A loss of about one second of queued votes on a rare cache failure MUST be
  accepted, with the nightly reconciliation correcting counts so that a lost entry costs one vote
  row and never a wrong tally.

#### Load ceiling and self-protection

- **FR-037**: The site MUST process at most an effective ceiling of dynamic requests per second:
  a per-server allowance (default 1,250) times the number of servers currently present, capped
  (default 15,000); each server MUST announce its presence to the shared cache every thirty
  seconds so the ceiling follows the fleet.
- **FR-038**: A controller running once a second (configurable) on one server MUST hold three
  interval multipliers — searches, manual refreshes, Live Results — and, while the observed rate
  exceeds the ceiling, raise the first below its cap in that order (searches and manual
  refreshes capped at 8 times their floor, Live Results uncapped); while the rate is below 80% of
  the ceiling, lower them in reverse order one step per tick. The interval handed to a client
  MUST be its floor times its multiplier, carried in every response of that kind.
- **FR-039**: The Live Results multiplier MUST additionally be predicted each tick from the
  number of registered live users — corrected by the share of them actually refreshing — so
  that it rises before a surge of new tabs sends its first refreshes, and falls as registrations
  lapse.
- **FR-040**: Searches MUST be subject to a sub-ceiling of engine queries per second (default
  2,000; 200 while the data store's own search is serving) that does not follow the fleet; a
  result served from the cache MUST NOT count against it; exceeding it MUST lengthen searches
  exactly as exceeding the ceiling does.
- **FR-041**: Each server MUST shed requests with "try again after 2 s" (configurable) when it
  has more than 200 requests in flight or is falling behind its own work by more than 100 ms
  (both configurable), searches
  first, then manual refreshes, then Live Results, then every other request, with votes and the
  health check last; the health
  check MUST be answered before the shedding logic and MUST report healthy regardless of
  dependency state; shed counts MUST be a metric with an alert.
- **FR-042**: While the shared cache is unreachable, a server MUST shed every dynamic request
  with "try again", keep serving delivery-network page-load paths and the health check, pause its
  consumers and sweeps, not accept votes, and MUST NOT fall back to the data store for floors,
  ceilings, counts or vote writes; on reconnection it MUST resume, with per-session and per-poll
  cached sets rebuilt lazily.

#### Sessions and page loads

- **FR-043**: Session lookup MUST be cache-aside in the shared cache for 5 minutes
  (configurable) with the data store as the system of record; no second cookie MUST be
  introduced; one function MUST be the only way any route ends a session and MUST delete the
  cached entry; the cached entry MUST never be served past the session's own expiry; a session
  removed directly in the store MUST be honoured within the cache lifetime.
- **FR-044**: Static assets MUST be served from the delivery network with fingerprinted names
  and year-long immutable caching; the page MUST carry a validator; the site's configuration
  request MUST be cacheable for five minutes; the visitor's identity call MUST be the only
  per-user request on a page load for a guest, answered from the session cache; a signed-in
  user's page load MUST make at most two per-user requests — the identity call and the overlay
  for the visible trending polls (FR-019) — and no other request MUST reach an application
  server on a page load.
- **FR-045**: The identity call and any listing not served from the delivery network MUST be
  limited to 120 (configurable) page loads per minute, keyed by session when signed in and by
  network address for guests; over the limit the browser MUST render its held copy with a
  "refreshing too quickly" notice and never an error page.
- **FR-046**: Guests MUST have no automatic refreshing and no Live Results (the tab is shown
  disabled, per FR-011); guest floors keyed by network address MUST be accepted as shared among
  guests behind one address.

#### Home search

- **FR-047**: The home search MUST cover public polls that are open, closed or waiting to open,
  and public polls being edited that were previously in one of those states, and never
  invitation-only polls; the rule MUST be written once as a stored derived flag.
- **FR-048**: A poll's searchable text MUST combine title, subtitle, choice labels and keywords
  (a future field, empty until then) by one field list and concatenation rule shared by every
  index — the data store's own index is a stored expression of the same fields, and a test MUST
  assert that the application's function and the stored expression agree for sampled polls.
- **FR-049**: Any input MUST be accepted; words MUST be ANDed, then ORed and ranked if fewer than
  the cap match, then a typo-tolerant pass appended, de-duplicated; results MUST rank by relevance
  with title above subtitle above choices above keywords, then vote count, then creation time;
  at most 200 (configurable) MUST be returned with a cut-off flag and no total.
- **FR-050**: Identical searches (trimmed, whitespace-collapsed, lower-cased, same scope) MUST be
  served from a shared cached response for 10 s (configurable), which MUST NOT count against the
  search sub-ceiling.
- **FR-051**: Retrieval MUST sit behind one interface with two engines selected by configuration:
  a managed search engine in production, and the data store's own full-text search in
  development, tests and as the fallback whenever the engine is unset, unreachable or
  re-indexing.
- **FR-052**: Every change to a poll's searchable fields, state, visibility or counts MUST be
  recorded once per poll and sent to the search engine in batches every 15 s (configurable), so
  a new or edited poll is searchable within that interval and a busy poll re-indexes at most
  once per interval.

#### Admin search

- **FR-053**: The admin page MUST offer a free-text box; dropdowns for state (all eight states),
  visibility (Public Poll, Private Poll), choice mode and vote mutability; a creator-name box
  matching case-insensitively anywhere in the name; day selectors with >=, <=, = for created,
  start and end dates; and operator-and-number controls for the three counts; all ANDed, blanks
  ignored, newest first, at most 200 (configurable), with the cut-off flag and no total.
- **FR-054**: A day MUST be interpreted in the administrator's browser time zone, sent with the
  request; >= from its start, <= through its end, = the day itself; a poll with no start or end
  date MUST never match a filter on that date; count filters MUST read the stored counts.
- **FR-055**: The admin page's existing list refresh and edit heartbeat, and the rule exempting a
  card in edit mode from refresh, MUST be unchanged.

#### Bookmarks

- **FR-056**: A user MUST hold at most 200 (configurable) bookmarks, refused beyond; Un-bookmark
  MUST remove one immediately.
- **FR-057**: A daily removal MUST silently drop bookmarks of polls that are archived, closed for
  six months (configurable), or open for six months since their last vote — or since they opened,
  or were created, if they never received a vote — in batches, one statement per batch.

#### Operations and scaling

- **FR-058**: Every periodic job (approval, schedule, counts flush, trending, index feed,
  bookmark removal, reconciliation, the load controller) MUST run once site-wide per tick under a
  store-held lock, whatever the number of servers; the vote consumer MUST run on every server as
  one group.
- **FR-059**: The application fleet MUST be stateless — all shared state in the shared cache or
  the data store — and MUST scale automatically on processor utilisation between four and twelve
  servers (target 70%); each server MUST finish and acknowledge its in-flight vote batch on
  shutdown within a 30 s grace period.
- **FR-060**: The production platform MUST consist of managed services hosted with the site: the
  data store with a standby, the shared cache with a standby (the queue makes it part of the
  write path), the search engine cluster sized to the search sub-ceiling, and an object store
  with a delivery network for the trending objects and assets; development MUST need only the
  data store, with in-process stand-ins for the cache, queue and registry and the data store's
  own search.
- **FR-061**: The cache, queue and registry MUST be reached through one interface with an
  in-process implementation and a production implementation, so that only the adapter changes if
  the technology does.
- **FR-062**: Every new configuration value MUST have a default and MUST be added to the
  developer launch templates, the application configuration and the project's configuration
  table; the previous data store's connection settings and the home-page polling interval MUST
  be removed; the admin page's and the sign-in rate limit's settings MUST be retained.
- **FR-063**: The API description MUST be updated for every changed and new endpoint, including
  the delta request and response shapes, the interval, retry-wait, status and cut-off fields.
- **FR-064**: A seed of 250,000 polls with a realistic vote skew and a load-test script covering
  the ceiling, a vote burst on one poll, a Live Results surge and a page-load storm MUST be
  delivered; their results MUST fix the shedding thresholds and confirm the utilisation target.

#### Retained and retired features

- **FR-065**: Every existing feature this specification does not mention MUST be preserved with
  unchanged behaviour on the new data store — including the administrator's poll editor and its
  edit lock, acceptability screening and the schedule sweep, invitation and ban rosters, the
  profile page, and the result exports.
- **FR-066**: The standalone poll page and the single-poll view MUST be retired; Live Results is
  the only single-poll view, and any link, control or route that led to the retired views MUST
  be removed or redirected to the home page.

### Key Entities

- **Poll**: a question with choices; carries state, visibility, sharing mode, anonymity, choice
  mode, vote mutability, creator id and name, created/start/end/closed times, last-vote time,
  vote, invited and banned counts, per-choice counts, a content version and a counts version, and
  a derived "listable on the home page" flag.
- **Vote**: one participant's current choices on one poll; one row per participant per poll.
- **Vote history**: an append-only record of every vote cast, partitioned by month.
- **Invitation** and **Ban**: one row per participant per poll.
- **Bookmark**: one row per user per poll, capped per user, removed by the daily sweep.
- **User–poll relationship**: the fact that a user created, was invited to, voted in or bookmarked
  a poll, with when it last changed; the source of the personal tabs and the overlay.
- **Search-index change**: a per-poll marker that the poll must be re-sent to the search engine,
  with a version and a reason.
- **Trending listing**: the ordered set of trending poll ids with their counts (the counts
  object) and their cards (the full object), each carrying a membership version.
- **Session**: a signed-in user's authenticated state, held in the data store and cached.
- **Live registration**: a signed-in user's presence in Live Results, with its expiry.
- **Load state**: the fleet's current ceiling, the three interval multipliers, per-user floors,
  and the live and page-load counters.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With 250,000 polls loaded, the home page, the home search and the admin search
  each complete without any request examining the whole poll collection, and a home search
  returns in under one second for 95% of searches.
- **SC-002**: The site sustains 1,000,000 concurrently connected users (500,000 signed in) on a
  fleet of at most twelve application servers, with the fleet resting at four when load is low.
- **SC-003**: A vote is acknowledged with the poll's new totals within one second of submission,
  and no vote is refused for reasons of load; after the nightly reconciliation every poll's
  totals equal its stored votes.
- **SC-004**: A vote cast on a poll is visible in every viewer's Live Results within two seconds
  plus their assigned interval, and the same count is shown for that poll on every tab.
- **SC-005**: With the site driven above its ceiling, no user receives an error: intervals
  lengthen in the order searches, manual refreshes, Live Results, and return to their floors
  within a few seconds of the load ending; with many Live Results tabs opened within a minute, no
  "try again" responses occur at the start of the surge.
- **SC-006**: A browser reload reaches the application with at most one request for a guest and
  at most two for a signed-in user (identity and overlay), and a million reloads within a minute
  are absorbed without the fleet growing.
- **SC-007**: A poll that becomes popular appears in TRENDING within one minute; the full trending
  object is republished only when the set of trending polls changes.
- **SC-008**: A new or edited poll is findable by search within fifteen seconds; a misspelt title
  still finds its poll; an invitation-only poll never appears in search results.
- **SC-009**: The response to a tab refresh in which nothing changed is under one kilobyte (the
  request carrying the browser's versions is excluded), and the response to one in which only
  counts changed carries no card content.
- **SC-010**: An overloaded server answers "try again" within milliseconds and remains in the
  pool; a shared-cache failover causes at most a few seconds of "try again" and at most about one
  second of lost votes, corrected by reconciliation.
- **SC-011**: Adding a server raises the site's ceiling within thirty seconds; retiring one loses
  no accepted vote.
- **SC-012**: The estimated running cost at the load target is of the order of $850–1,400 per
  month, against roughly $14,000–16,000 for the current refresh model at the same concurrency.
- **SC-013**: The test suite runs on a developer's machine with only the data store installed;
  every periodic job runs exactly once per tick across any number of servers.

## Assumptions

- The vote rate is unbounded by design; the recommended data store drains about 20,000 votes per
  second sustained, and the queue and the "queued" notice cover bursts above it.
- Search, Live Results and refresh rates are bounded by the ceilings and need no separate
  estimate; the search-cache hit rate is measured by the load test, not assumed.
- A loss window of about one second of queued votes during a rare cache failure is acceptable.
- Prices are DigitalOcean list prices as of September 2026, verified before budgeting; the cost
  criterion is order-of-magnitude, not a commitment.
- The per-server allowance behind the ceiling, the shedding thresholds and the utilisation target
  are engineering estimates fixed by the load test.
- A server's presence announcement outliving a crash by up to thirty seconds, inflating the
  ceiling briefly, is accepted.
- The `keywords` field is empty until a future requirement populates it; searchable text includes
  it from the start so no re-index is needed then.
- **Out of scope**, by the source requirements' own exclusions: data migration; any push
  transport for live data (a per-poll streaming upgrade for Live Results is documented but not
  built) and browser push notifications; semantic or vector search; third-party search or queue
  services; rate limiting outside the hosting platform; topics (Sport, Politics, …) and their
  data changes; the visual design of the tabbed page; total match counts on either search; the
  admin page's own refresh behaviour, which is unchanged.
- The standalone poll page and the single-poll view are retired (FR-066); every other existing
  feature is carried over unchanged (FR-065).
- This specification says "ceiling", "sub-ceiling", "floor" and "try again"; the plan and code
  say "budget", "sub-budget", the per-kind floor variables and `429`/`503` with `Retry-After` —
  the mapping is recorded in `research.md` (Terminology mapping) and is deliberate.
- The technology binding of the primary data store, search engine, shared cache, queue and
  delivery network is decided in the plan; the source requirements recommend specific managed
  services of the hosting platform.
