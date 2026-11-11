# Feature Specification: Footer Links

**Feature Branch**: `20261111-091956-FOOTER-LINKS`

**Created**: 2026-11-11

**Status**: Draft

**Input**: User description: "requirements/20261111-091956-footer-links/requirements.md"

## Clarifications

### Session 2026-11-11

- Q: What does the home page's address say on a plain visit to `/`, when the default tab is shown before any selection? → A: the address always names the tab being shown: `/` becomes `/?tab=home` (or `/?tab=trending` for a guest) as soon as the page shows it; one rule, no exception.
- Q: When the visitor leaves the Search tab, what happens to the search terms (`q`) in the address? → A: they are removed from the address when another tab is selected; they stay only while the Search tab is showing, so a reload or a return can never bring back a tab the visitor had left.

## User Scenarios & Testing *(mandatory)*

Every CrowdPoll page ends with the same footer: **Privacy Policy**, **Terms of Service**, **Cookie Use** and, for a logged-in visitor, **Delete Account**.
The two legal pages carry a **Back** arrow that returns the visitor to the page they came from; the Delete Account link opens a confirmation dialog on the Profile page.
Three things go wrong today: on a phone the legal pages are squeezed into the right part of the screen with words running off the edge; a return to the home page loses the tab the visitor was on; and the dialog's **Cancel** leaves the visitor on the Profile page instead of where they came from.
This feature fixes the three, and settles one rule for every "back" control on the site.

### User Story 1 - Read the legal pages on a phone (Priority: P1)

A visitor on a phone opens the Privacy Policy or the Terms of Service from the footer and reads it as a normal full-width page, with the Back arrow above the title.

**Why this priority**: the pages are unreadable on a phone today, and the Privacy Policy is the page the law requires to be readable by everyone.

**Independent Test**: open both pages on a phone (or a browser window narrower than 640 px) from any CrowdPoll page, and check that the text spans the screen with the site's usual margins, that no word is cut off at the right edge, that there is no sideways scrolling, and that the Back arrow sits above the title.

**Acceptance Scenarios**:

1. **Given** a screen narrower than 640 px, **When** the Privacy Policy or Terms of Service opens, **Then** the title, the "In short" summary, every paragraph and every table use the full width between the site's usual side margins, no word is cut off, and the page does not scroll sideways.
2. **Given** such a screen and a visitor who came from another CrowdPoll page in the same browser tab, **When** the page opens, **Then** the Back arrow appears above the title, in the page's flow, and scrolls away with the text; the Back-to-top button brings the reader back to it.
3. **Given** such a screen, **When** the visitor follows an in-page link (for example Cookie Use, which lands on the cookies section), **Then** the section's heading lands below the fixed header, not under it.
4. **Given** a screen 640 px or wider, **When** either page opens, **Then** it looks exactly as it does today: the arrow fixed under the header at the left, and the text keeping clear of it.

---

### User Story 2 - Return to the tab you left (Priority: P1)

A logged-in visitor on the home page's **Your Votes** tab opens the Privacy Policy from the footer, reads it, and presses the Back arrow: the home page shows **Your Votes** again, not the default tab.

**Why this priority**: the visitor asked for this directly; losing the tab makes the arrow feel broken, and the same loss hits the browser's own Back button and a reload.

**Independent Test**: select each of the nine home page tabs in turn, open a legal page from the footer, press the Back arrow, and check the same tab is showing; repeat with the browser's Back button and with a reload of the home page.

**Acceptance Scenarios**:

1. **Given** the home page showing any tab, including the default tab on a plain visit to `/`, **When** the visitor looks at the browser's address bar, **Then** the address names that tab (for example `/?tab=your-votes`, or `/?tab=home` right after a logged-in visitor opens `/`), and selecting another tab updates the address without adding a step to the browser's history.
2. **Given** a legal page reached from the home page, **When** the visitor presses the Back arrow, the browser's Back button, or returns by any other way, **Then** the home page shows the tab that was selected when they left, whether the browser kept the page or loaded it afresh.
3. **Given** the home page's address naming a tab, **When** it is opened from a bookmark, a shared link or a reload, **Then** that tab is shown.
4. **Given** a tab the visitor may not use (a logged-in tab for a guest, for example after the session ended while reading the Terms), **When** the home page opens with that tab in its address, **Then** the **Trending** tab is shown; the visitor is never sent to the login page by a return.
5. **Given** an address naming something that is not a tab, **When** the home page opens, **Then** the usual default tab is shown (Home for a logged-in visitor, Trending for a guest).
6. **Given** a poll card maximized inside a tab, **When** the visitor leaves for a legal page and returns to a freshly loaded home page, **Then** the tab is shown with its list, and the card is not re-maximized.
7. **Given** a poll link that lands on the home page with a tab and a poll to open, or the Search tab with search terms in the address, **When** the landing is done, **Then** the tab's name is in the address (alongside the search terms while the Search tab is showing), and later returns work as above.
8. **Given** the Search tab showing results for search terms in the address, **When** the visitor selects another tab, **Then** the search terms leave the address along with the Search tab's name, and a reload or a return shows the tab the visitor selected, with no search re-run.

---

### User Story 3 - Cancel the Delete Account dialog and go back (Priority: P2)

A logged-in visitor on any page follows **Delete Account** in the footer, thinks again and presses **Cancel**: they are back on the page they came from, just as the legal pages' Back arrow would have taken them.

**Why this priority**: it is the requested behaviour for the one footer link that is not a legal page; it depends on nothing in Stories 1 and 2 except the tab restore when the starting page was the home page.

**Independent Test**: from the home page, the Settings page and the Privacy Policy, follow Delete Account, press Cancel, and check the starting page is showing (with its tab, from the home page); then open the dialog from the Profile page's own footer and from a new browser tab, press Cancel, and check the Profile page stays.

**Acceptance Scenarios**:

1. **Given** the Delete Account dialog opened from another CrowdPoll page in the same browser tab, **When** the visitor presses **Cancel** or the Escape key, **Then** the dialog closes and the browser returns to that page; if it was the home page, the tab they left is showing.
2. **Given** the dialog opened from the Privacy Policy's own "delete your account" links, **When** the visitor presses Cancel, **Then** the Privacy Policy is showing again.
3. **Given** the dialog opened from the footer of the Profile page itself, or in a new browser tab, or from a typed address, or from a page on another site, **When** the visitor presses Cancel or Escape, **Then** the dialog closes and the Profile page stays, with focus back on the profile's name field, as today.
4. **Given** the dialog closed in place and then opened again from the Profile page's footer, **When** the visitor presses Cancel, **Then** it closes in place again.
5. **Given** the dialog, **When** the visitor clicks the dimmed background around it, **Then** nothing happens, as today.
6. **Given** the dialog, **When** the visitor types DELETE and presses **Delete Account**, **Then** the account is deleted and the browser goes where it goes today; nothing about deletion changes.

---

### User Story 4 - One rule for every Back control (Priority: P3)

Wherever CrowdPoll shows a Back control, it does the same thing: if the visitor came from a CrowdPoll page in this browser tab, it returns to that page; otherwise it goes to the control's fallback page.

**Why this priority**: it is the consistency the requirements asked for; the only control it changes beyond Stories 1 to 3 is the admin page's arrow.

**Independent Test**: reach the admin page from the home page's Home tab and press its arrow: the home page shows the Home tab; open the admin page by its address in a new tab and press the arrow: the home page opens.

**Acceptance Scenarios**:

1. **Given** the Poll Administration page reached from another CrowdPoll page in the same browser tab, **When** the admin presses its Back arrow, **Then** the browser returns to that page (with its tab, if it was the home page).
2. **Given** the Poll Administration page opened in a new tab or by a typed address, **When** the admin presses its Back arrow, **Then** the home page opens, as today.
3. **Given** a legal page, the Delete Account dialog and the admin page, **When** each decides whether to go back or to fall back, **Then** all three decide by the same rule: a CrowdPoll page as the previous page, in a browser tab that has an earlier history entry.
4. **Given** a maximized poll card's Back arrow on the home page, **When** it is pressed, **Then** it closes the card in place, as today; it is a view control, not a page return.

---

### Edge Cases

- **A legal page reached through the other legal page**: Terms → Privacy Policy → Back shows the Terms; Back again shows the page before the Terms. Each page counts its own steps, as today.
- **In-page anchors before Back**: a reader who followed three section links on the Privacy Policy and presses Back goes to the page they came from, not three steps back through the sections, as today.
- **A reload of a legal page**: the arrow keeps working, and its step count survives the reload, as today.
- **A legal page in a new tab, from an email or from another site**: no arrow is shown, as today; there is no CrowdPoll page to return to.
- **The session ends while away**: a return to a logged-in tab shows Trending, with no login prompt, and the address reads `/?tab=trending`; the bookmark or link the visitor came from still names the tab for after they log in.
- **Guest with a shared logged-in tab address**: `/?tab=your-polls` shows Trending; the visitor can log in and choose the tab.
- **The browser keeps the home page in memory**: a return shows the page exactly as left, maximized card included; the address and the memory agree on the tab.
- **The admin page's own tabs**: Poll Administration keeps remembering its tab as today; this feature concerns the home page's tabs.
- **Search, then another tab, then a reload or a return**: the address holds only the selected tab; the search terms are gone, so the page shows that tab and runs no search.
- **Delete Account on a phone**: the dialog and its Cancel behave the same on every screen size.
- **Cancel when the browser has no earlier entry despite a CrowdPoll referrer** (for example a link opened into a fresh tab by the browser): the dialog closes in place.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On a screen narrower than 640 px, the Privacy Policy and the Terms of Service MUST lay out their text across the full width between the site's usual side margins, with no word cut off and no sideways scrolling.
- **FR-002**: On such a screen, the legal pages' Back arrow MUST sit in the page's flow above the title, with no text gutter, and scroll with the page; on screens 640 px and wider the layout MUST stay as it is today (the arrow fixed under the header, the text keeping clear of it).
- **FR-003**: On every screen size, an in-page link on a legal page MUST land its section's heading below the fixed header.
- **FR-004**: The home page's address MUST name the tab being shown (`/?tab=<name>`, with the tab's existing name) from the moment a tab is shown, the default tab on a plain visit to `/` included, and MUST be updated whenever the active tab changes, without adding an entry to the browser's history.
- **FR-005**: When the home page loads with a tab named in its address, it MUST show that tab, for every one of its nine tabs.
- **FR-006**: A named tab the visitor may not use (a logged-in tab while not logged in) MUST fall back to Trending, and a name that is not a tab MUST be ignored in favour of the usual default; a return MUST never redirect to the login page.
- **FR-007**: A return to the home page by the legal pages' Back arrow, by the Delete Account dialog's Cancel, by the admin page's arrow, by the browser's Back button or by a reload MUST show the tab that was active when the visitor left, whether the browser restores the page or loads it afresh.
- **FR-008**: A return to a freshly loaded home page MUST restore the tab only, not a maximized poll card; the browser's own restore of a kept page is unchanged.
- **FR-009**: While the Search tab is showing, the tab's name in the address MUST coexist with the search terms; the terms are in the address only when the visitor arrived with them, and a search made on the page does not add them. When another tab is selected, the search terms MUST be removed from the address with the Search tab's name. The tab's name MUST remain in the address after a poll link's landing has been handled.
- **FR-010**: The legal pages' Back arrow MUST keep its current rule: shown only when the previous page is a CrowdPoll page in a browser tab with an earlier history entry, decided when the page loads; it returns to the page left, past any in-page anchor steps, and its step count survives a reload.
- **FR-011**: When the Profile page is opened with the Delete Account address from a CrowdPoll page in the same browser tab (by the rule of FR-010), the dialog's Cancel button and the Escape key MUST close the dialog and return to that page.
- **FR-012**: When that rule does not hold, or the dialog was opened on the Profile page itself (by its own footer, or again after a Cancel), Cancel and Escape MUST close the dialog and stay on the Profile page, with focus returned to the profile's name field; the decision MUST be made when the dialog opens.
- **FR-013**: A click on the dialog's dimmed background MUST do nothing, and the Delete Account button's behaviour MUST be unchanged.
- **FR-014**: The legal pages' Back arrow, the Delete Account dialog's Cancel and the Poll Administration page's Back arrow MUST decide by one shared rule (FR-010); the admin arrow's fallback, when the rule does not hold, MUST be the home page, as today.
- **FR-015**: The maximized poll card's Back arrow MUST keep closing the card in place.
- **FR-016**: The feature MUST add no cookie, no browser storage key, no setting, no route and no page, and MUST leave the Cookie Use table unchanged.
- **FR-017**: The footer's content, order and look, and the legal texts, MUST be unchanged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On phones 360 to 430 px wide, both legal pages show every word with no sideways scrolling, and the text column uses at least 90% of the width between the site's side margins.
- **SC-002**: A return from a legal page to the home page shows the tab the visitor left in 100% of cases, for all nine tabs, whether the page was kept by the browser or loaded afresh.
- **SC-003**: From any page with the footer, Delete Account followed by Cancel brings the visitor back to that page in one press; from the Profile page itself, a new tab or an outside link, Cancel closes the dialog and the Profile page stays.
- **SC-004**: A home page address naming a tab, opened from a bookmark or a shared link, shows that tab, and never a login prompt.
- **SC-005**: The three page-return controls (legal pages, Delete Account dialog, admin page) give the same answer for the same starting conditions, verified by the same set of cases applied to each.
- **SC-006**: The existing automated checks for the footer, the legal pages, the Back arrow and the delete dialog pass with their expectations updated to this behaviour, and the Cookie Use list check passes with no new row.

## Assumptions

- "A phone" is a viewport narrower than 640 px, the breakpoint the site's stylesheets already use; the legal pages behave as today at 640 px and wider.
- "The current tab" is the tab active on the home page when the footer link was followed; the Poll Administration page's tab memory is separate and unchanged.
- The tab name in the address uses the tabs' existing names (`home`, `your-polls`, `shared-with-you`, `your-votes`, `trending`, `newest`, `watching`, `live`, `search`), the same names the poll-link landing already understands for four of them.
- Updating the address when a tab changes does not add browser history entries, so the browser's Back button still leaves the home page in one press.
- "The Delete Account page" is the Delete Account dialog on the Profile page; there is no separate page.
- A server-sent referrer policy is not added; the browser default already passes a same-origin previous page.
- Decisions come from the resolved findings in `requirements/20261111-091956-footer-links/requirements-report.md` (RS1, AM1, UA1 to UA4, NC1), recorded in the requirements' Decisions section.
