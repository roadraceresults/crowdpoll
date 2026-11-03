# Feature Specification: Home Tab

**Feature Branch**: `home-tab`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description: "requirements/20261103-120521-home-tab/requirements.md"

## Clarifications

### Session 2026-11-03

- Q: Do Home cards say why each poll is listed? → A: yes, with the personal tabs' line ("You were invited", "You opened the link", "You voted", "You are watching"), plus "Your poll" for the user's own polls; a poll listed only by the trending rule shows "Trending".
- Q: When the user votes on or watches a card on Home itself, does Home reorder at once? → A: no: an action on a Home card does not reorder Home or remove cards while it is showing; the new list applies the next time Home is opened (selecting the tab or loading the page) or at the interval. Changes made elsewhere (another tab, page or window) rebuild at the next refresh.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A signed-in user sees their current polls in one place (Priority: P1)

A signed-in user opens the site and lands on a new **Home** tab, the first tab of the tab bar.
Home gathers, in one list, the polls that matter to them right now: polls shared with them, polls they created, polls they voted in, polls they watch, and then what is trending.
Each poll appears once, as the ordinary poll card, on which they can vote, watch, maximize and read results as on any other tab.
Polls long past their launch, or closed more than a week ago, are left out, so the list stays current.

**Why this priority**: This is the feature: one starting point instead of five tabs to visit.

**Independent Test**: As a user with polls in each of the four relations, plus open trending polls, open `/` signed in; confirm Home is selected and lists the expected polls, once each, in rule order.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they open the site without a link to a particular poll or tab, **Then** the Home tab is selected and shown.
2. **Given** a user with polls shared with them, polls they created, polls they voted in and polls they watch, all current, **When** Home is shown, **Then** it lists, in this order: up to 10 shared-with-them polls, then up to 10 of their own, then up to 10 they voted in, then every poll they watch, then up to 10 trending polls.
3. **Given** a poll that matches several rules (e.g. shared with them, voted in and watched), **When** Home is shown, **Then** it appears once, in the group of the first rule it matches.
4. **Given** an open poll launched more than 2 months ago, **When** Home is built, **Then** it is not listed by rules 1–4, even if the user watches it.
5. **Given** a closed poll that closed within the last week, **When** Home is built, **Then** it is listed (by the first rule it matches); one closed more than a week ago is not.
6. **Given** a poll that has been published but not yet opened (waiting to open), **When** Home is built, **Then** it may be listed by rules 1–4.
7. **Given** a poll card on Home, **When** the user votes, watches or maximizes it, **Then** it behaves exactly as the same card on any other tab.
8. **Given** Home lists a poll the user was invited to and watches, one they created, and one only trending, **When** Home is shown, **Then** the cards say "You were invited · You are watching", "Your poll" and "Trending" respectively.

---

### User Story 2 - The Home list stays cheap to serve and fresh where it matters (Priority: P1)

The list of polls on Home is rebuilt at most once per refresh interval (2 hours by default), not on every refresh, so Home adds little load however often it is opened.
The cards' vote counts and content stay live, refreshing like any other tab.
When the user does something that changes their own polls — creates one, votes, watches, is invited — their Home is rebuilt at the next refresh (or, for an action taken on a Home card itself, the next time they open Home, so the card they just used does not jump away), so they never wait two hours to see it.

**Why this priority**: The requirements make efficiency a condition of the feature, and Home will be the most-opened tab.

**Independent Test**: Open Home twice within the interval and confirm the second answer reuses the list (no rebuild); vote in a new poll and confirm the next Home refresh lists it; confirm a vote count on a Home card changes within the normal refresh period.

**Acceptance Scenarios**:

1. **Given** a user's Home was built less than one interval ago and nothing of theirs has changed, **When** Home refreshes, **Then** the same list of polls is shown, and only counts and card content are updated.
2. **Given** a user's Home was built, **When** they create a poll, vote in a poll, start or stop watching a poll, or are invited to or removed from a poll anywhere but on Home's own cards, **Then** the next Home refresh rebuilds the list.
3. **Given** Home is showing, **When** the user votes on or watches one of its cards (e.g. a trending card), **Then** the card stays where it is and no card is removed while Home stays shown; **When** they next open Home (select the tab again or load the page), **Then** the rebuilt list, with the poll in its new place, is shown.
4. **Given** a user's Home was built more than one interval ago, **When** Home refreshes, **Then** the list is rebuilt, re-applying the date windows and the current trending polls.
5. **Given** a poll on Home becomes unavailable to the user (made private, user removed, deleted), **When** Home next refreshes, **Then** that poll is no longer shown, without waiting for the interval.
6. **Given** an operator sets the refresh interval, **When** the site starts, **Then** Home lists are rebuilt no more often than that interval (apart from the user's own changes); an invalid value stops the site with a clear message.

---

### User Story 3 - The avatar menu leads to Home (Priority: P2)

On any page, a signed-in user opens the avatar menu and finds **Home** as its first item.
Choosing it takes them to the Home tab, from any page; on the tab page itself it simply switches to Home.

**Why this priority**: A convenience path to the tab; the tab itself works without it.

**Independent Test**: Signed in, open the avatar menu on `/settings`, choose Home, and confirm `/` opens with Home selected; repeat on `/` and confirm the page switches tab without reloading.

**Acceptance Scenarios**:

1. **Given** a signed-in user on any page, **When** they open the avatar menu, **Then** Home is its first item, with the house icon, ahead of Edit Profile.
2. **Given** a signed-in user on a page other than the tab page, **When** they choose Home, **Then** the tab page opens with Home selected.
3. **Given** a signed-in user on the tab page, **When** they choose Home, **Then** the Home tab is selected without the page reloading.
4. **Given** a signed-in user without permission to create polls, **When** they open the avatar menu, **Then** Home is still shown.

---

### User Story 4 - Guests do not see Home (Priority: P2)

A visitor who is not signed in sees no Home tab in the tab bar and no Home item anywhere, and lands on Trending as today.
Signing in shows the Home tab; signing out while on Home returns to Trending.

**Why this priority**: Home is made of the user's own polls; a guest version would only repeat Trending.

**Independent Test**: As a guest, open `/` and confirm no Home tab is shown and Trending is selected; sign in and confirm Home appears and is selected; sign out and confirm Home disappears and Trending is selected.

**Acceptance Scenarios**:

1. **Given** a guest, **When** they open the site, **Then** the tab bar (and its "All tabs" menu) shows no Home tab, and Trending is selected.
2. **Given** a guest opens a link to the Home tab, **When** the page loads, **Then** Trending is shown instead.
3. **Given** a signed-in user on Home, **When** they sign out (in this window or another), **Then** the Home tab is removed and Trending is selected.

---

### Edge Cases

- **A new user with no polls of their own**: Home lists only trending polls; if trending is empty as well, it shows "Nothing here yet. Polls shared with you, your polls, your votes, the polls you watch and what's trending will appear here."
- **Trending not ready yet** (just after a deploy): Home lists rules 1–4 alone, and picks up trending polls within one trending recompute interval, not the full Home interval.
- **A heavy watcher**: rule 4 lists every watched poll in the date window, which is bounded by the existing per-user watch limit (200).
- **Home held after an action on one of its cards**: a change made in another tab or window while Home is held does not appear in this window until Home is next opened or the interval ends; voting and access checks stay current meanwhile.
- **An account with more current polls than the candidate limit**: Home considers at most `ENV_MAX_HOME_PAGE_POLLS` (200) of the user's eligible polls, those with the most recent relation first, so a rule (rule 4 included) may list fewer polls than the user holds.
- **The user's own unpublished, rejected or archived polls**: never on Home; they stay on Your Polls.
- **A poll being edited**: judged by the state it had before the edit, as voters see it.
- **A poll reopened after closing**: its launch date is the reopening, so it is judged as newly launched.
- **A poll whose state crosses a date window between rebuilds** (e.g. it passes one week closed): it leaves Home at the next rebuild, at most one interval later.
- **A shared poll whose invitation is withdrawn**: no longer listed by rule 1 after the next refresh.
- **Opening Home does not accept invitations**: invitations are still marked accepted only by the Shared With You tab.
- **A link to a particular poll** (`/?open=…&tab=…`): still wins over Home as the landing tab.
- **A user without permission to view polls**: Home is empty, as every personal tab is for them.

## Requirements *(mandatory)*

### Functional Requirements

**The tab**

- **FR-001**: The tab page MUST have a **Home** tab, first in the tab bar, with a house-outline icon drawn to match the tab bar's other line icons and following the light and dark colour schemes.
- **FR-002**: Home MUST be shown only to signed-in users; for guests it MUST be absent from the tab bar and from the "All tabs" menu.
- **FR-003**: Home MUST be the tab a signed-in user lands on when the page is opened without a landing of its own; a guest MUST land on Trending as today; a link landing (a particular poll or tab) MUST take precedence.
- **FR-004**: When the user signs out while Home is selected, the page MUST remove the Home tab and select Trending.
- **FR-005**: Home's poll cards MUST be the ordinary poll cards, with the same controls, overlay (voted, watched, own poll, vote blocks) and behaviour as on the other personal tabs.
- **FR-005a**: Each Home card MUST say why it is listed, with every relation the user holds to the poll, in the personal tabs' words ("You were invited", "You opened the link", "You voted", "You are watching"), plus "Your poll" for a poll the user created; a poll listed only by the trending rule MUST say "Trending". The line MUST follow the user's own actions on the card (a vote or watch adds its words at once), as on the personal tabs.
- **FR-006**: An empty Home MUST show "Nothing here yet. Polls shared with you, your polls, your votes, the polls you watch and what's trending will appear here."

**Which polls Home lists**

- **FR-007**: Home MUST list polls by five rules, in order, each poll at most once, under the first rule it matches:
  1. up to 10 polls shared with the user — exactly those the Shared With You tab would list;
  2. up to 10 polls the user created;
  3. up to 10 polls the user voted in — exactly those the Your Votes tab would list;
  4. every poll the user watches (bounded by the existing per-user watch limit);
  5. up to 10 trending polls, in trending order, taken from the current trending list.
- **FR-008**: Rules 1–4 MUST list only published polls: waiting to open, open, or closed (a poll being edited judged by its state before the edit); never initialized, awaiting approval, rejected or archived polls.
- **FR-009**: Rules 1–4 MUST apply the date window: an open poll only if launched within the last 2 months; a closed poll only if closed within the last 1 week; a poll waiting to open always.
- **FR-010**: Within rules 1–4, polls MUST be ordered by the user's most recent relation to them first; rule 5 MUST keep trending order. Home MUST be one continuous list with no group headings.
- **FR-011**: Every poll Home lists MUST pass the same access checks as on the tab it is drawn from; a poll the user may no longer see MUST NOT be shown.
- **FR-012**: Opening or refreshing Home MUST NOT mark invitations accepted nor change any of the user's relations to polls.

**Refresh and load**

- **FR-013**: The membership of a user's Home (which polls, in which order) MUST be rebuilt at most once per refresh interval, except as FR-014 requires; between rebuilds, refreshes MUST reuse it, and the cards' content and vote counts MUST refresh as on any other tab.
- **FR-014**: A change to the user's own relations to polls (creating a poll, voting, withdrawing a vote, watching or unwatching, being invited, uninvited or removed) MUST cause the membership to be rebuilt: at the next Home refresh when the change was made anywhere but on a Home card; when the change was made on a card shown on Home, at the next opening of Home (selecting the tab or loading the page) or at the interval, whichever is first, so Home is not reordered and no card removed while the user is looking at it. While Home is held this way, a change made elsewhere (another tab, page or window) also waits for the next opening of Home or the interval.
- **FR-015**: Access checks (FR-011) MUST be applied on every refresh, not only at rebuild.
- **FR-016**: When the trending list is not available at a rebuild, Home MUST list rules 1–4 alone, and the next rebuild MUST happen no later than one trending recompute interval afterwards.
- **FR-017**: The reused membership MUST be shared by every server instance, so a user's refreshes reach the same list whichever instance answers them.
- **FR-018**: The refresh interval MUST be set by `ENV_HOME_TAB_REFRESH_INTERVAL`, in milliseconds, default `7200000` (2 hours), minimum `60000`; a value that is not a whole number or is below the minimum MUST stop the site at start-up with a message naming the setting.
- **FR-018a**: The number of the user's eligible polls a rebuild considers for rules 1–4 MUST be set by `ENV_MAX_HOME_PAGE_POLLS`, default `200`, a whole number of at least `1`; an invalid value MUST stop the site at start-up with a message naming the setting. The polls with the most recent relation are considered first.
- **FR-019**: Building Home MUST NOT need a background job over all users; its cost MUST be paid only for users who open Home, at most once per interval plus once per change of their own relations.
- **FR-020**: Home refreshes MUST be subject to the same refresh limits, load shedding and budget as the other personal tabs.

**The avatar menu**

- **FR-021**: The avatar menu MUST show **Home** as its first item, with a house icon in the menu's icon style, to every signed-in user regardless of permissions.
- **FR-022**: Choosing Home MUST open the tab page with Home selected; on the tab page itself it MUST select Home without reloading.
- **FR-023**: A link to the tab page naming the Home tab MUST select Home for a signed-in user and Trending for a guest.

**Documentation**

- **FR-024**: The new setting MUST be documented with the other settings, and the new Home endpoint MUST be described in the API description, like the other personal tabs.

### Key Entities

- **Home membership**: per user, the ordered list of polls Home shows, the list version of the user's relations it was built under, and when it was built; reused until the interval ends or the version changes; not stored in the database.
- **User–poll relations** (existing): shared (invited or opened by link), created, voted, watched; each with the time it last changed; the source of rules 1–4.
- **Trending list** (existing): the ranked public open polls, recomputed every minute for all users; the source of rule 5.
- **Refresh interval setting**: `ENV_HOME_TAB_REFRESH_INTERVAL`, how long a Home membership may be reused.
- **Candidate limit setting**: `ENV_MAX_HOME_PAGE_POLLS`, how many of the user's eligible polls a rebuild considers.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in user reaches all their current polls from one tab, with no further click, on opening the site.
- **SC-002**: For every rule and date-window boundary (2 months launched, 1 week closed, waiting to open, each excluded state), a test shows the poll listed or left out as FR-007–FR-009 say.
- **SC-003**: For a user who refreshes Home repeatedly within one interval and changes nothing, the list of polls is rebuilt once, not once per refresh.
- **SC-004**: After a user votes in, creates, watches or is invited to a poll, from anywhere but Home's own cards, it appears on their Home at the next refresh, within the normal refresh period; after the same action on a Home card, the card stays put until Home is next opened, and is then in its new place (and any change made elsewhere meanwhile appears then too).
- **SC-005**: Vote counts on Home cards are as fresh as on the same poll's card on any other tab.
- **SC-006**: A guest never sees a Home tab or a Home menu item on any page.
- **SC-007**: The Home tab and the avatar menu item pass the site's contrast audit in both colour schemes.
- **SC-008**: Users who do not open Home during an interval cause no Home work at all in that interval; a rebuild costs no more than refreshing one of the existing personal tabs.

## Assumptions

- Home is a personal tab: it needs a session, like Your Polls, Shared With You, Your Votes, Watching and Live Results; but unlike them it is hidden, not disabled, for guests (developer resolution UA3).
- "Participated in" means voted, the same polls as Your Votes; adding a choice is not a separate relation.
- A closed poll is judged by its close date only, since the site keeps no launch date once a poll closes; no migration is added.
- The date windows are measured at the moment Home is rebuilt.
- The 10-poll caps and the 2-month and 1-week windows are fixed values, not settings; only the interval and the candidate limit are settings.
- No new table or column, and no new dependency: the reused membership is cache state rebuilt from the existing relations and trending list.
- The other eight tabs, trending's ranking and the guest experience beyond hiding Home are unchanged.
- The landing-tab change (Trending → Home for signed-in users) is intended (breaking change BC3 of the requirements report).
- The icon follows the image `requirements/20261103-120521-home-tab/home-icon.jpg`, redrawn as an inline vector; no image file is shipped.
