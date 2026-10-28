# Feature Specification: Newest Poll Tab

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "019-high-level-requirements-NEWEST-POLL-TAB.md"

**Source requirements**: `designDocs/019-high-level-requirements-NEWEST-POLL-TAB.md` (65 lines,
carrying the fifteen resolutions of the architecture pass)
**Architecture**: `architecture/019-newest-poll-tab/architecture.md` — 15 findings raised and
resolved across two runs; one breaking change (BC-1) documented

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the newest public polls (Priority: P1)

Any visitor — guest or member — clicks the **Newest** tab on the home page and sees a grid of
poll cards, exactly like the Trending grid, holding the public polls that were launched most
recently: the most recently launched first, then the next, down to a fixed number (fifty by
default). Every visitor sees the same list in the same order. A poll that is private, still
waiting to open, closed or archived is never in it. If no poll has been launched yet, the panel
says so.

**Why this priority**: It is the feature. Everything else in this specification exists so this
grid is correct, fresh and cheap to serve.

**Independent Test**: With a handful of public polls opened at known moments, click Newest as a
guest and as a member. The cards appear in reverse order of launch; a private, a waiting, a
closed and an archived poll are absent; with no launched polls the panel shows the empty-state
message. Two visitors see identical lists.

**Acceptance Scenarios**:

1. **Given** five public polls opened in a known order, **When** a visitor clicks Newest,
   **Then** the grid shows all five, most recently opened first.
2. **Given** two polls opened at the same moment with different vote totals, **When** the list is
   shown, **Then** the poll with more votes comes first; with equal votes, the order is the same
   on every visit and for every visitor.
3. **Given** more launched polls than the configured maximum, **When** the list is shown,
   **Then** only the configured number appear — the most recently launched ones.
4. **Given** a private poll, a poll waiting to open, a closed poll and an archived poll,
   **When** a visitor views Newest, **Then** none of them is listed.
5. **Given** no poll has ever been launched, **When** a visitor opens Newest, **Then** the grid
   is empty and the panel shows "No polls have been launched yet."
6. **Given** a guest, **When** they click Newest, **Then** the tab opens without any prompt to
   sign in, and the cards show Vote, Live and Bookmark controls in their guest state.

---

### User Story 2 - A launch shows up promptly, and a poll leaves when it closes (Priority: P2)

An administrator opens a poll — by schedule, by publishing an approved poll, or by hand — and
within about a minute it is at the top of Newest for everyone. When the poll closes it leaves
the tab. If an administrator re-opens a closed poll, it counts as newly launched and comes back
at the top. Opening a listed poll for editing does **not** remove it: it keeps showing its last
published content until the edit is published.

**Why this priority**: The tab is only worth having if "newest" is true within a minute and
stays true through the poll's life-cycle.

**Independent Test**: Open a poll and wait one recompute interval: it heads the list. Close it:
it is gone on the next refresh. Re-open it: it is back at the top. Open a listed poll for
editing: it stays listed with its old content; publish the edit: the new content shows and the
poll has not moved.

**Acceptance Scenarios**:

1. **Given** a public poll in any pre-open state, **When** it enters the open state, **Then**
   it is in the published Newest list within one recompute interval (one minute by default).
2. **Given** a listed poll, **When** it closes (by schedule or by an administrator), **Then**
   it is absent from the Newest list published at the next recompute.
3. **Given** a closed poll that had once been listed, **When** an administrator re-opens it,
   **Then** it re-enters Newest as the most recently launched poll.
4. **Given** a listed poll, **When** an administrator opens it for editing, **Then** it remains
   listed at the same position showing its last published content; **When** the edit is
   published and the poll returns to open, **Then** its position is unchanged — publishing an
   edit is not a launch.
5. **Given** a listed poll whose edit gives it a future start date, **When** the edit is
   published, **Then** the poll leaves Newest (it is waiting to open) and, **When** that date
   arrives and it opens, **Then** it re-enters as newly launched.
6. **Given** a poll that was already open before this feature was deployed, **When** visitors
   view Newest, **Then** it is not listed until it next enters the open state; the tab is empty
   after deployment until the first poll launches.

---

### User Story 3 - Newest is fast for the visitor and free for the servers (Priority: P3)

A visitor reloading the page sees the Newest grid at once from the copy their browser kept a
moment ago, and it quietly confirms itself. Clicking the tab again shows the held list without
a wait; the Refresh control is available on Newest and works the way it does on Trending — a
fresh list after the usual pause, and a "please wait" notice if pressed too often. None of this
sends a request to the application's servers: the list comes from the content delivery network
(or, in development, from the instances' shared cache). Only a signed-in visitor's own state on
the cards — which polls they voted in, with which choices, and which they bookmarked — comes
from the application, in one call, as it does for Trending.

**Why this priority**: The scalability contract of the previous feature must hold: a million
reloads must not reach the fleet, and the Newest tab must not become the way around that.

**Independent Test**: With a copy under a minute old, reload: the grid renders before any
network reply. Click Newest twice within the pause: the second click sends nothing. Press
Refresh repeatedly: the allowance is spent, then the notice appears. Watch the network: the
list is fetched from the delivery network or `/api/trending/…`; for a member, exactly one
additional call fetches their overlay; for a guest, none.

**Acceptance Scenarios**:

1. **Given** the browser holds a Newest copy younger than the recompute interval, **When** the
   page loads on Newest, **Then** the grid renders from the copy before any fetch completes,
   and the copy is then validated.
2. **Given** the browser holds a copy older than the recompute interval, **When** the page
   loads, **Then** the list is fetched before rendering.
3. **Given** Newest was opened moments ago, **When** the visitor clicks another tab and then
   Newest again within the manual pause, **Then** the held list is shown and nothing is fetched.
4. **Given** Newest is open, **When** the visitor presses Refresh, **Then** the list is fetched
   again; **When** the burst allowance is spent within the pause, **Then** the Refresh control
   is disabled until a token returns and nothing is sent — no notice, as on Trending.
5. **Given** the set of listed polls has not changed since the last fetch, **When** the list is
   refreshed, **Then** only the small counts object is transferred, and the cards re-render with
   the new counts in the new order.
6. **Given** a signed-in visitor, **When** the Newest list is applied, **Then** one request
   obtains their voted/bookmarked state for every listed poll, and the cards show it; **Given** a
   guest, **Then** no such request is made.
7. **Given** a member votes or bookmarks from any tab, **When** the same poll is also in
   Newest, **Then** the Newest card shows the new state at once without a fetch.
8. **Given** the visitor signs in or out while Newest is open, **When** the page updates,
   **Then** the list stays, and the cards' personal state is refetched (member) or cleared
   (guest).
9. **Given** the application has just started and the first recompute has not run, **When** a
   visitor opens Newest in a development environment, **Then** the tab shows nothing rather
   than an error, and fills on the next interaction after the first recompute.

---

### User Story 4 - The operator sizes and paces the tab (Priority: P4)

An operator sets how many polls the tab holds and how often it is recomputed, in the same
places every other setting lives, and the application refuses nonsensical values at start-up.

**Why this priority**: The defaults are right for production; the settings exist so that
development and load testing can exercise the tab with small numbers and short intervals.

**Independent Test**: Start with a maximum of 3 and an interval of 5 seconds: the tab holds
three polls and a launch appears within five seconds. Start with a maximum of 0, or one above
the search-results cap, or an interval under a second: start-up fails with a clear message.

**Acceptance Scenarios**:

1. **Given** the maximum is set to 3, **When** five polls are launched, **Then** Newest lists
   the three most recent.
2. **Given** the interval is set to 5000, **When** a poll launches, **Then** it is published
   within five seconds, the delivery-network copy lives five seconds, and the browser treats its
   copy as fresh for five seconds.
3. **Given** a maximum below 1, or above the home search-results cap, **When** the application
   starts, **Then** it stops with a message naming the setting and the bound.
4. **Given** an interval below 1000 ms, **When** the application starts, **Then** it stops with
   a message naming the setting and the bound.
5. **Given** the settings are unset, **When** the application starts, **Then** the maximum is
   50 and the interval 60000 ms, and both defaults appear in the launch templates, the
   deployment specification, the operator's settings table and the API description.

---

### Edge Cases

- **Two polls launched in the same instant** (a schedule sweep opens several at once): they
  rank by vote total, then by a fixed final key, so the order is identical on every recompute
  and on every instance — never a spurious reorder.
- **A listed poll receives votes**: its counts change on the next recompute; its position
  changes only if a tie on launch time is broken differently. The full card content is not
  re-sent for a count change.
- **The set of listed polls is unchanged but the order is**: only the small counts object is
  republished; the cards object is not.
- **A poll edited from open to waiting-to-open**: it keeps a stale launch time while waiting; it
  is not listed (it is not open) and is re-stamped when it opens again.
- **Re-open, close, re-open**: each re-opening is a fresh launch; each close removes it.
- **Archiving**: only possible from closed, so the poll is already unlisted and its launch time
  already cleared.
- **More eligible polls than the maximum**: the oldest launches fall off the bottom; a new
  launch pushes one out, which republishes the cards object.
- **Delivery network configured but the first publication has not happened**: the previously
  published objects (from the last deployment) keep serving until the first new publication.
- **No delivery network and no recompute yet**: the instance answers "not ready" with a retry
  hint; the browser shows what it holds (or nothing) and tries again on the next interaction.
- **Browser storage unavailable or full**: the tab fetches on every page load instead of
  rendering from a copy; nothing else changes.
- **Browser floor exhausted on a tab click**: the held list is shown; no notice (a click is
  silent, only Refresh explains the wait).
- **A guest opens Newest as their first tab after a sign-out**: the tab stays open and stays
  populated; the cards' personal state clears.
- **Maximum set higher than the overlay cap**: refused at start-up, so the overlay for the
  whole tab is always one request.
- **Test data inserted directly in the open state**: its launch time is its start date if it
  has one, else its creation date — so fixtures rank by the dates they declare, not by the
  moment they were inserted.

## Requirements *(mandatory)*

### Functional Requirements

**The launch timestamp**

- **FR-001**: Every poll MUST carry a launch timestamp, distinct from its creation, start, end
  and close timestamps, that records when it most recently entered the open state. It MUST be
  shown on the administrator's poll card as `Launched`, before the start and end dates, reading
  `not launched` when absent (added by `fix.md` FIX03).
- **FR-002**: The launch timestamp MUST be set to the current time whenever a poll enters the
  open state — including when an administrator re-opens a closed poll — **except** when the
  poll returns to open from editing with a prior state of open; that return MUST leave the
  launch timestamp unchanged.
- **FR-003**: The launch timestamp MUST be cleared whenever a poll enters the closed state.
- **FR-004**: No other state transition MUST change the launch timestamp: a poll opened for
  editing keeps it, and a poll that an edit sends to waiting-to-open keeps its stale value until
  it next opens, when FR-002 applies.
- **FR-005**: A poll created directly in the open state MUST receive as its launch timestamp its
  start date if it has one, otherwise its creation date — mirroring how a poll created directly
  in the closed state receives its close timestamp.
- **FR-006**: Polls that already exist when this feature is deployed MUST NOT be assigned a
  launch timestamp retroactively; they enter Newest only when they next enter the open state.
  The seed data used for scale testing MUST set the launch timestamp itself for the polls it
  creates open.
- **FR-007**: The launch timestamp MUST be indexed so that selecting the top polls in ranking
  order (FR-010) reads only the entries it returns, however many polls exist; the automated
  guard that checks listing queries never scan the whole poll table MUST cover this query.

**Eligibility and ranking**

- **FR-008**: The Newest list MUST contain only public polls that are open, or that are being
  edited with a prior state of open — in which case the poll's last published content is shown.
  Private, waiting-to-open, closed, rejected, archived and never-opened polls MUST never appear.
- **FR-009**: A listed poll MUST NOT leave Newest merely because an administrator opened it for
  editing.
- **FR-010**: The list MUST be ordered by launch timestamp, most recent first; ties by total
  votes, most first; remaining ties by poll identifier, descending — so the order is
  deterministic and identical on every instance.
- **FR-011**: The list MUST hold at most the configured maximum (`ENV_MAX_NEWEST_POLLS`, default
  50).

**Recompute and publication**

- **FR-012**: The Newest list MUST be recomputed every configured interval
  (`ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL`, default 60000 ms) by exactly one instance at a time,
  coordinated so that other instances skip a tick another is performing, and MUST be identical
  for every visitor.
- **FR-013**: The recompute MUST also run once as soon as the application's periodic jobs start,
  so the list exists before the first visitor.
- **FR-014**: The list MUST be published as two objects, `newest-counts.json` and `newest.json`,
  stored beside the Trending objects at the same base, each cached for the recompute interval:
  a small counts object (ids in Newest order, each poll's counts and counts version, and a
  membership version that is a hash of the set of ids) republished every recompute; and a full
  cards object republished only when the set of ids changes, never on a reorder alone.
- **FR-015**: The counts a card shows MUST come from the live vote counters, never from the
  stored poll row, so that a poll shows the same numbers in Newest as in every other tab.
- **FR-016**: When no delivery network is configured, the same two objects MUST be served by the
  instances from the shared cache at `GET /api/trending/newest-counts.json` and
  `GET /api/trending/newest.json` (with `/api/trending/newest-counts` and
  `/api/trending/newest-cards` as aliases, matching Trending's `/counts` and `/cards`), with a
  validator so an unchanged object is answered "not modified", touching neither the data store
  nor the search engine. `/api/trending/` is the one base for every published listing object;
  no second base address is introduced.
- **FR-017**: Until the first recompute has published, the instance routes MUST answer
  "not ready" with a retry hint; with a delivery network, the previously published objects keep
  serving until the first new publication.

**The browser**

- **FR-018**: The browser MUST fetch the counts object on each Newest interaction, render the
  cards it holds in that order with those counts, and fetch the cards object only when the
  membership version differs from the one it holds or it holds no cards.
- **FR-019**: The browser MUST keep its last Newest copy in browser session storage and, on a
  page load, render from a copy younger than the recompute interval before validating it. The
  interval MUST be supplied to the browser by the application's configuration endpoint as
  `newestRecomputeIntervalMs`, beside the Trending interval.
- **FR-020**: Newest interactions MUST NOT be dynamic requests: no server-side floor and no
  budget token; the delivery network's cache lifetime is the server-side bound.
- **FR-021**: The browser MUST enforce the manual floor with its burst allowance
  (`ENV_MIN_MANUAL_REFRESH_INTERVAL`, `ENV_MANUAL_REFRESH_BURST`) for Newest from an allowance of
  Newest's own, exactly as it does for Trending: a click on the Newest tab renders the held copy
  at once and refetches the counts only if that copy is older than the floor; the Refresh
  control MUST be available while Newest is open: it refetches when the tab's allowance holds a
  token, and is disabled — never a notice — while the allowance is spent, re-enabling when a
  token returns; a page load renders the session copy first (FR-019) and then validates it;
  returning to the window adds no request of the tab's own.
- **FR-022**: When the list is empty, the Newest panel MUST show "No polls have been launched
  yet." in the same empty-state element and through the same mechanism Trending uses.
- **FR-023**: A signed-in visitor's overlay for the listed polls (voted, with which choices;
  bookmarked) MUST be obtained by the same single overlay call Trending makes, after each
  applied counts object and on sign-in or sign-out; that call is a normal refresh-kind dynamic
  request. Guests MUST make no such call.
- **FR-024**: A vote or bookmark made from any tab MUST update the Newest copy of the same card
  locally, as it does for every other tab.
- **FR-025**: Guests MUST be able to open Newest; the tab is never dimmed or gated behind
  sign-in, and Trending remains the tab selected after a sign-out from a personal tab.

**Configuration**

- **FR-026**: Two settings MUST be added, `ENV_MAX_NEWEST_POLLS` (default 50) and
  `ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL` (default 60000), in the application's configuration and
  in both launch templates, and MUST be surfaced everywhere the previous feature's settings are:
  the deployment specification, the operator's settings table in the project guidance file, the
  configuration tests, and the API description — which gains the `newestRecomputeIntervalMs`
  configuration field, the two instance routes and the two object schemas.
- **FR-027**: `ENV_MAX_NEWEST_POLLS` MUST be at least 1 and at most `ENV_MAX_POLLS_SEARCH_RESULTS`
  (so the overlay for the whole tab fits one request); `ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL`
  MUST be at least 1000 ms. A value outside its bound MUST stop start-up with a message naming
  the setting and the bound.

**Superseded rules from the Tab Bar feature (018)**

- **FR-028**: The 018 rules that clicking Newest sends nothing, that the Refresh control is
  disabled while Newest is open, and that the Newest panel shows no message, are superseded by
  FR-018, FR-021 and FR-022; the 018 specification MUST be annotated to say so, and the 018
  browser tests for those rules MUST be replaced by tests of the new behaviour.
- **FR-029**: The tab's identifier, label, icon, position and panel markup from 018 MUST NOT
  change.

### Key Entities

- **Launch timestamp**: when a poll most recently entered the open state; set on opening
  (except a return from editing), cleared on closing, otherwise untouched; absent on polls that
  predate the feature until they next open. Ranking key of the Newest list; never displayed.
- **Newest listing**: the ordered set of at most `ENV_MAX_NEWEST_POLLS` public open polls
  ranked by launch timestamp, vote total and identifier; recomputed every interval by one
  instance; identical for every visitor.
- **Counts object** (`newest-counts.json`): the listing's ids in order, each poll's live counts
  and counts version, the membership version and the recompute time; republished every
  recompute.
- **Cards object** (`newest.json`): the full card content of every listed poll, keyed by id,
  with the membership version; republished only when the set of ids changes.
- **Browser copy**: the last counts and cards objects the browser applied, with the time they
  were received; rendered on a page load while younger than the recompute interval.
- **Settings**: `ENV_MAX_NEWEST_POLLS` (1 … `ENV_MAX_POLLS_SEARCH_RESULTS`, default 50) and
  `ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL` (≥ 1000 ms, default 60000).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A poll that enters the open state is in the published Newest objects within one
  recompute interval (one minute by default), and is shown by the next Newest interaction that
  fetches a fresh counts object; the delivery-network copy and the browser copy each add at most
  one interval before a given visitor sees it.
- **SC-002**: Two visitors, guest or member, who fetch Newest within the same recompute
  interval see the same polls in the same order, 100% of the time.
- **SC-003**: A guest's Newest interaction reaches no application instance when a delivery
  network is configured; a member's reaches exactly one, for their overlay. A page reload on
  Newest with a copy under one interval old renders the grid before any network reply.
- **SC-004**: When the set of listed polls is unchanged between two recomputes, the object the
  browser transfers on refresh is the counts object only; the cards object is republished only
  when the set of ids changes — verified over a run of ten recomputes with votes but no launches.
- **SC-005**: The recompute reads no more poll entries than it returns, on a table of one million
  polls, and never scans the whole table — verified by the automated query-plan guard.
- **SC-006**: A listed poll that closes is absent from the objects published at the next
  recompute; a closed poll that is re-opened heads the list at the next recompute; a listed poll
  opened for editing keeps its position through the edit and its publication, 100% of the time.
- **SC-007**: With the maximum set to N and more than N launched polls, exactly N are listed,
  and they are the N most recently launched.
- **SC-008**: Start-up with `ENV_MAX_NEWEST_POLLS` of 0, or greater than
  `ENV_MAX_POLLS_SEARCH_RESULTS`, or `ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL` below 1000, fails
  with a message naming the setting; with both unset, the defaults 50 and 60000 apply.
- **SC-009**: Every existing test that passed before this feature still passes, except the 018
  Newest browser tests that FR-028 replaces.

## Assumptions

- The Trending publication from feature 017 — one recomputing instance under a lock, the
  two-object split with a membership version, the delivery-network or instance serving with a
  validator, the session-storage copy, the browser-side manual floor with burst, and the single
  overlay call — is the template for Newest, and Newest reuses its mechanisms rather than
  inventing parallel ones. Where this specification says "as Trending does", Trending's
  behaviour as implemented and tested governs.
- The launch timestamp is stored on the poll only; it is not part of the poll as administrators
  edit or export it, not part of the card content, and never shown to visitors.
- The vote total used for tie-breaking is the stored total, which may lag the live counters by
  up to the counter flush interval; the counts shown on the cards are the live counters.
- The Newest recompute is its own periodic job with its own coordination lock and interval; it
  is not coupled to the Trending recompute.
- The published objects have the same shape as the Trending objects, so the browser's existing
  delta logic applies to them unchanged and the API description may reference the same schemas.
- Both objects are compressed and carry a public cache lifetime equal to the recompute interval,
  from the delivery network and from the instances alike; the instance routes are subject only
  to the page-load allowance.
- "Not ready" from the instance routes carries the same retry hint (5 s) the Trending routes use.
- Cross-tab propagation of votes and bookmarks needs no new code: the home page already updates
  every tab that holds the card.
- The 018 placeholder that made Newest do nothing is removed, not kept beside the new tab
  behaviour; the 018 rule that Trending is the fallback tab after a sign-out is unchanged.
- The tab-bar markup, icon, label and identifier delivered by 018 are unchanged; the CLAUDE.md
  note that Newest has "no module, no request" is updated as part of this feature.
- The scale-test seed script inserts open polls directly and therefore sets the launch timestamp
  itself (FR-006); the automated test fixtures insert through the application's own path and get
  it by FR-005.
- No dedicated git branch is created for this feature; work continues on `dev`.
