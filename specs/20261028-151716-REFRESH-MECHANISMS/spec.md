# Feature Specification: Refresh Mechanisms

**Feature Branch**: `refresh-research` (no dedicated branch created for this feature)

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "requirements/20261028-151716-refresh-mechanisms/requirements.md"

**Source requirements**: `requirements/20261028-151716-refresh-mechanisms/requirements.md` (the research request, its research results and decisions, and the "Scope and Changes to Make" that every finding of the review was folded into).
**Requirements report**: `requirements/20261028-151716-refresh-mechanisms/requirements-report.md` (7 diagrams, 9 research results and 23 findings, all resolved; technical debt TD1–TD5).

## Clarifications

### Session 2026-10-28

- Q: When a poll is deleted (by its creator, an admin, or account deletion), how does a personal tab that lists it learn it is gone? → A: Deleting a poll removes its cached summary, so any tab still listing it fails the content-version match and builds a full answer without it; no user's list version is bumped.
- Q: What should the server report so the operator can check SC-002 and the stretched-interval enforcement? → A: The existing `[controller]` log line (at least once a minute) also reports, fleet-wide, personal-tab refreshes answered without the database vs. with it, and requests refused only because of the stretch.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A personal tab's Refresh is quick when nothing has changed (Priority: P1)

A signed-in user on Your Polls, Shared With You, Your Votes or Watching presses Refresh, clicks back onto the tab, or returns to the window.
Most of the time nothing about their list has changed except, perhaps, some vote counts.
Today the server rebuilds the whole list (up to 200 polls, with the user's votes, watch rights and blocks) before it can say "nothing new", so the answer is as slow and as costly as a full one.
After this feature, when neither the user's list nor any listed poll's content has changed, the answer comes back from the live counts alone, and the database is not consulted.

**Why this priority**: Personal-tab refreshes are the most common on-demand refresh and the most expensive one per request; making the "nothing changed" case cheap cuts both waiting and load (RS9 items 1 and 2, TD4).

**Independent Test**: Sign in, open Your Votes with several polls, press Refresh twice without any change and observe that the second answer reports nothing new (or only new counts) without a database query; then vote, bookmark, or have the creator edit a listed poll, press Refresh, and see the change.

**Acceptance Scenarios**:

1. **Given** a personal tab whose list and listed polls are unchanged since the browser's last answer, **When** the user refreshes, **Then** the answer reports nothing new, or only the counts that moved, and no database query is made for it.
2. **Given** the user has since voted, bookmarked or un-bookmarked a poll, been invited, had an invitation removed, or been banned from a listed poll, **When** they refresh the affected tab, **Then** the answer carries that change.
3. **Given** a listed poll's creator has edited it (title, choices, state, schedule or colours), **When** the user refreshes, **Then** the edited card is returned.
4. **Given** the server holds no record of the user's list version (first visit, expiry, or a cache restart), **When** they refresh, **Then** a full answer is built as today.
5. **Given** the Shared With You tab and no change to the user's list, **When** they refresh, **Then** no invitation is adopted or marked accepted on that refresh (TD4).
6. **Given** any refresh of a personal tab or the Search tab, **When** the listed polls' summaries are already held by the server's cache, **Then** they are not rewritten; only missing or stale ones are written, all at once.

---

### User Story 2 - Live Results eases off while nothing is happening (Priority: P1)

A signed-in user keeps the Live Results tab open on polls that are quiet.
Today the tab asks every 2 s whether anything changed, for as long as it is open and visible.
After this feature, each unchanged answer doubles the wait, up to 10 s; the first change, or anything the user does in the tab, brings it straight back to the normal interval.

**Why this priority**: Live Results is the largest variable load on the fleet (RS2), and a quiet poll is most of its time.

**Independent Test**: Open Live Results on a poll with no voting and observe the requests spacing out to 2, 4, 8 and then 10 s; cast a vote from another browser and see the tab update within 10 s and return to 2 s; vote, add or remove a poll, or make the page visible again (another browser tab, or minimize and restore), and see the next request at the normal interval.

**Acceptance Scenarios**:

1. **Given** Live Results at the normal interval, **When** an answer reports nothing new, **Then** the next request waits twice as long as the last, never more than 10 s and never less than the interval the server asked for.
2. **Given** the tab has backed off, **When** an answer carries any change, **Then** the next request returns to the interval the server asked for.
3. **Given** the tab has backed off, **When** the user votes, adds or removes a poll in the tab, or the page becomes visible again (another browser tab, or minimize and restore), **Then** the next request returns to the interval the server asked for.
4. **Given** the server asks for an interval longer than 10 s under load, **When** answers report nothing new, **Then** the tab waits the interval the server asked for, not less.
5. **Given** the tab has backed off to 10 s, **When** it stays open, **Then** it remains registered as an active Live Results tab and is not expired by the server.

---

### User Story 3 - Trending and Newest are fresher, and Refresh is offered only when something newer can exist (Priority: P2)

A visitor on Trending or Newest presses Refresh.
Today the list they receive can be up to two minutes old (one minute between publishes, plus up to one minute held by the CDN), and Refresh is offered every 5 s even though nothing newer can have arrived.
After this feature, the CDN holds each published list for at most 10 s, so a Refresh shows a list at most about 70 s old; and Refresh stays unavailable until the browser's copy is old enough for a newer one to exist.

**Why this priority**: It halves the worst-case staleness at no cost to the fleet, and stops offering presses that cannot help (RS9 item 4, TD5).

**Independent Test**: Load Trending, check that the published list is served with a lifetime of at most 10 s, note that Refresh is unavailable for 10 s after the copy was received, then press it and receive the newest published list.

**Acceptance Scenarios**:

1. **Given** Trending or Newest is published, **When** the CDN or a browser reads it, **Then** it may be kept for at most the smaller of the recompute interval and 10 s.
2. **Given** a browser copy of Trending or Newest younger than that lifetime, **When** the visitor looks at Refresh, **Then** it is unavailable, with the wait shown as in User Story 4.
3. **Given** a copy older than that lifetime, **When** the visitor presses Refresh, **Then** the newest published list is shown.
4. **Given** a tab click onto Trending or Newest within the recompute interval, **When** the tab opens, **Then** the browser's copy is shown without a fetch, as today.

---

### User Story 4 - The Refresh button explains why it is waiting (Priority: P2)

A user who has spent their burst of refreshes, or is under a stretched interval, finds the Refresh button disabled.
Today it gives no reason, so it looks broken.
After this feature, hovering or focusing the disabled button shows "Refresh available in N s", counting down each second.

**Why this priority**: It costs nothing in load and removes the impression that Refresh is broken (RS9 item 5).

**Independent Test**: Press Refresh until it disables, hover or focus it, and watch the tooltip count down to the moment it becomes available; check that the button's look in the tab bar has not changed.

**Acceptance Scenarios**:

1. **Given** the Refresh button is disabled, **When** the user hovers or focuses it, **Then** a tooltip reads "Refresh available in N s", where N is the whole seconds left, rounded up.
2. **Given** that tooltip is shown, **When** a second passes, **Then** N decreases by one.
3. **Given** the wait ends, **When** the button becomes available, **Then** the tooltip no longer shows a wait.
4. **Given** the button is disabled or enabled, **When** it is seen in the tab bar at any width, **Then** its size and look are as today.

---

### User Story 5 - Every client is held to the stretched interval under load (Priority: P2)

When the fleet is over its request budget, browsers are told to wait longer (up to 8× the floor for refreshes and searches).
Today only well-behaved browsers wait; a client that ignores the advice is still held to the base floor (TD1).
After this feature, the server's own per-user allowance refills at the stretched interval, so every client is held to it.

**Why this priority**: It closes the one gap in the fleet's load protection found by the research; ordinary users see no change.

**Independent Test**: Raise the refresh stretch multiplier above 1 and send refresh requests from one session faster than the stretched interval while ignoring the advice; the excess is refused with "too soon". With the multiplier at 1, the same requests behave as today.

**Acceptance Scenarios**:

1. **Given** a stretch multiplier k > 1 for a kind, **When** one user's requests of that kind arrive faster than floor × k after the burst, **Then** the excess is refused with "too soon" and the time to wait.
2. **Given** k = 1, **When** requests arrive, **Then** they are allowed and refused exactly as today.
3. **Given** a browser that waits as it is told, **When** k changes, **Then** none of its requests is refused because of this change, except at most once at the moment k rises, and then with the time to wait.
4. **Given** votes, **When** the fleet is over budget, **Then** they are never stretched, as today.

---

### User Story 6 - Background work runs less often, with no visible difference (Priority: P3)

The operator wants fewer database writes from background sweeps without users noticing.
After this feature, vote counts are written to poll records every 10 s instead of 2 s, and pending invitation emails are picked up every 30 s instead of 5 s.

**Why this priority**: The saving is small (sweeps are a fixed cost), but it is free of user-visible effect (RS8).

**Independent Test**: Start the app with default settings and check that the counter flush runs every 10 s and the invitation sweep every 30 s; vote and see the counts on every home tab update as fast as today; save an open Invitation Only poll and see its invitations sent at once, as today.

**Acceptance Scenarios**:

1. **Given** default settings, **When** the app starts, **Then** vote counts are written to poll records every 10 s and pending invitations are picked up every 30 s; every other sweep keeps its interval.
2. **Given** votes are cast, **When** any home tab or Live Results refreshes, **Then** it shows the current counts, as today.
3. **Given** an open Invitation Only poll is saved with new invitees, **When** the save completes, **Then** their invitations are sent at once, as today.
4. **Given** an operator sets the counter flush interval explicitly, **When** the app starts, **Then** that value is used, and no rule ties it to the manual refresh interval.

---

### User Story 7 - Developers can find how refreshes work (Priority: P3)

A developer reads the architecture document to understand refreshes.
Today it says nothing refreshes on its own except Live Results, which is not true, and it does not explain the sweeps, their load or the limits of Refresh.
After this feature, the architecture document explains the five refresh mechanisms, their load, the freshness and rate limits of Refresh, and the changes made by this feature; the project's documents state the new intervals and no longer state the manual-floor rule.

**Why this priority**: It was the original request, and the report already holds the content; it must reach the documents developers read.

**Independent Test**: Read the architecture document's refresh and sweeps sections and find each of the five mechanisms, the load table, the freshness limits, the corrected sentence and the new intervals; search the project documents for the old 2 s flush and the manual-floor rule and find neither.

**Acceptance Scenarios**:

1. **Given** the architecture document, **When** a developer reads its refresh and sweeps sections, **Then** they find the five mechanisms, the load at the default settings, the rate and freshness limits of Refresh, and the Trending/Newest browser-only limit recorded as by design (TD3).
2. **Given** the project documents and configuration templates, **When** they state the counter flush or invitation intervals, **Then** they state 10 s and 30 s.
3. **Given** the settings table, **When** a developer reads the manual refresh interval's row, **Then** it does not say it must not be below the counter flush interval.

---

### Edge Cases

- The server's cache is restarted or loses the per-user list version: the next refresh builds a full answer (User Story 1, scenario 4).
- A change reaches a user's list through a path that forgets to record it: the user would see a stale list until the next recorded change; every path that changes a user's list, invitations or blocks must record it (FR-002).
- The creator edits a poll listed on many users' tabs: each user's next refresh sees the edit without the edit having to touch every user's record (FR-003).
- A user votes and immediately refreshes Your Votes: the vote appears once the vote has been recorded, as today; the record of that vote counts as a change to their list.
- A user's permission to view polls is removed: their personal tabs empty on the next refresh, as today.
- A listed poll's summary is missing from the server's cache: that refresh builds a full answer, and the summary is rebuilt and written.
- A listed poll is deleted: its cached summary is removed with it (FR-003a), so the next refresh of any tab listing it builds a full answer without it.
- Live Results answers "too soon" or "busy": the tab waits the time it is given, as today, and the back-off resumes from the normal interval afterwards.
- The stretch multiplier falls while a user's allowance is refilling: the refill follows the new rate from then on.
- A guest (no session) on Trending or Newest: Refresh is held by the copy's age (FR-011) and, without a CDN, the page-load limit, as today.
- The cache that holds live counts is lost before a flush: up to 10 s of counts (instead of 2 s) are missing from poll records until the nightly recount; home tabs are unaffected.
- A recompute interval shorter than 10 s is configured: the published lifetime is that interval.

## Requirements *(mandatory)*

### Functional Requirements

**Personal-tab refresh (User Story 1)**

- **FR-001**: The system MUST keep, per signed-in user, a version of their personal lists that changes whenever any of their poll relations (created, invited, voted, bookmarked, linked) is added, changed or removed, or any ban or invitation affecting their address is added or removed; invitation delivery and acceptance timestamps are not changes.
- **FR-002**: Every operation that changes a user's poll relations, bans or invitations MUST change that user's list version.
- **FR-003**: A content change to a poll (title, choices, colours, state, schedule, visibility, keywords) MUST be visible to a personal-tab refresh through the poll's own content version, without changing any user's list version.
- **FR-003a**: Every path that deletes a poll (by its creator, an admin, or account deletion) MUST remove that poll's cached summary, so that a tab still listing it fails the content-version match of FR-004.
- **FR-004**: A personal-tab refresh MUST, when the user's list version and every listed poll's content version equal what the browser holds, answer from the live counts alone, without consulting the database; a listed poll whose cached summary is missing counts as a mismatch.
- **FR-005**: When the user's list version is unknown to the server, a personal-tab refresh MUST build a full answer, as today.
- **FR-006**: The answers of FR-004 MUST be indistinguishable to the browser from today's answers for the same state ("nothing new", or the moved counts).
- **FR-007**: A Shared With You refresh MUST adopt and mark invitations only when it builds a full answer.
- **FR-008**: Personal-tab and Search refreshes MUST write only the poll summaries missing from the server's cache or stale (the cached content version differs from the poll's), all in one operation; summaries written when a poll changes are unaffected.

**Live Results (User Story 2)**

- **FR-009**: After an answer reporting nothing new, the Live Results tab MUST wait twice its previous wait, at most 10 s and never less than the interval the server asked for.
- **FR-010**: Any answer with a change, a vote, an add or remove in the tab, the page becoming visible, and a "too soon" or "busy" answer MUST reset the wait to the interval the server asked for. The server's handling of Live Results is unchanged.

**Trending and Newest (User Story 3)**

- **FR-011**: Trending and Newest MUST be published with a lifetime of the smaller of their recompute interval and 10 s; the browser's own copy keeps the recompute interval as its lifetime for tab clicks.
- **FR-012**: On Trending and Newest, Refresh MUST be unavailable while the browser's copy is younger than the published lifetime, and available once it is older (still subject to the refresh floor).

**Refresh button (User Story 4)**

- **FR-013**: While the Refresh button is disabled, for any reason, its tooltip MUST read "Refresh available in N s", N being the whole seconds left rounded up, updated each second while shown; the button's size and look MUST NOT change.

**Load protection (User Story 5)**

- **FR-014**: A user's allowance for search and refresh requests MUST refill at the floor multiplied by the current stretch multiplier of that kind; bursts are unchanged; votes and Live Results keep their current rules.

**Observability**

- **FR-014a**: The budget controller's existing log line (written at least once a minute) MUST also report, counted fleet-wide since its previous line: personal-tab refreshes answered without the database, personal-tab refreshes that built a full answer, and requests refused only because the stretched interval (FR-014) exceeded the base floor.

**Sweeps (User Story 6)**

- **FR-015**: The default counter flush interval MUST be 10 s, in the application default, the production configuration and both development templates.
- **FR-016**: The invitation sweep MUST run every 30 s; it remains a fixed value, not a setting.
- **FR-017**: No other sweep interval changes, and no configuration rule ties the counter flush interval to the manual refresh interval.

**Documentation (User Story 7)**

- **FR-018**: The architecture document's refresh and sweeps sections MUST describe the five refresh mechanisms, their load at the default settings, the rate and freshness limits of Refresh, the Trending/Newest browser-only limit as by design, and the behaviour introduced by FR-001 to FR-017; the sentence "Nothing refreshes on its own except the Live Results tab" MUST be corrected.
- **FR-019**: Every project document and template that states the counter flush or invitation interval MUST state the new values, and the settings table MUST no longer say the manual refresh interval must not be below the counter flush interval; the descriptions of the two recompute settings MUST say the published lifetime is at most 10 s.

### Key Entities

- **User list version**: per email key; a value that changes on every change to their poll relations, bans or invitations; absent means unknown.
- **Poll content version**: per poll; already exists, changes on every content change; held with the poll's cached summary.
- **Poll summary (projection)**: per poll; the shared, viewer-independent card data, already cached by the server.
- **Refresh allowance**: per user (per address for a guest) and per kind; a burst and a refill interval, now floor × stretch multiplier.
- **Published listing**: Trending and Newest objects; now with a lifetime of at most 10 s.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A personal-tab refresh with no list or content change makes no database query and answers in under 50 ms at the server, for a tab of 200 polls (measured with the in-memory cache in tests; in production through the FR-014a counts).
- **SC-002**: At steady state, at least 80 % of personal-tab refreshes are answered without a database query, as reported by the counts of FR-014a.
- **SC-003**: A Live Results tab on a poll with no votes for one minute makes at most 8 requests in that minute (today 30), and a vote on it appears in that tab within 10 s.
- **SC-004**: A Refresh on Trending or Newest never shows a list older than the recompute interval plus 10 s (about 70 s at the defaults, today 120 s).
- **SC-005**: 100 % of disabled Refresh buttons show a remaining-wait tooltip, accurate to the second.
- **SC-006**: Under a stretch multiplier of k, a client ignoring the advice gets at most one refresh per floor × k after its burst; a client following it gets none refused, except at most once when k rises, and then with the time to wait.
- **SC-007**: Counter-flush database writes fall to at most one fifth of today's at the same vote rate, with no change in the counts any home tab shows.
- **SC-008**: Every existing automated test still passes, apart from those that assert the old intervals or lifetimes, which are updated to the new values.

## Assumptions

- The research results RS1–RS9 and the decisions in the source requirements are accepted as written; numbers are the configured defaults.
- One account per email key: the list version is kept per email key, so every address that shares a key shares one version.
- The per-user list version and the poll summaries are held in the existing shared cache; losing it costs only full answers, never wrong ones.
- A content change to a poll already refreshes its cached summary and its content version in every path that changes poll content; this feature relies on that and does not add to it.
- The browser-side delta protocol, routes and response shapes are unchanged; the browser cannot tell an FR-004 answer from a full one.
- Server push (Server-Sent Events or WebSockets) is out of scope.
- The outbox drain, screening, schedule, stale-edit, Trending, Newest, budget controller and daily sweeps keep their intervals.
- No new setting, migration or dependency is introduced; the 10 s CDN lifetime and the 30 s invitation interval are fixed values.
- The stretched-interval enforcement (FR-014) needs a load test of its own before production.
