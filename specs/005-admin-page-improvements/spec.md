# Feature Specification: Admin Page Improvements

**Feature Branch**: `005-admin-page-improvements`

**Created**: 2026-08-12

**Status**: Draft

**Input**: User description: "using ./designDocs/005-high-level-requirements-admin-page-improvemenmts.md"

## Clarifications

### Session 2026-08-12

- Q: What level of keyboard/ARIA support does the new per-row actions menu need? → A: Full keyboard + ARIA support — Tab to trigger, Enter/Space opens, Arrow keys move between the 4 items, Escape closes, focus returns to trigger, proper ARIA `menu`/`menuitem` roles.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consolidated Actions Menu (Priority: P1)

An admin viewing the poll list on the `/admin` page wants to perform an action (edit, duplicate, copy link, or view results) on a specific poll without the row being cluttered by multiple separate links, and with room for more admin actions to be added later without the list becoming unmanageable.

**Why this priority**: This is the primary usability problem called out by the design reference — a crowded, "busy" Actions column — and it is also the foundation that lets future admin actions be added without redesigning the list again.

**Independent Test**: Load `/admin` with at least one poll in the list. Click the menu icon in a poll row's Actions column and confirm a menu opens showing "Edit Poll", "Duplicate Poll", "Copy Poll Link", and "View Results", each performing exactly the same behavior it does today. Can be fully tested without any other change in this spec.

**Acceptance Scenarios**:

1. **Given** the admin poll list has one or more polls, **When** the admin clicks the menu icon in a poll row's Actions column, **Then** a menu opens listing "Edit Poll", "Duplicate Poll", "Copy Poll Link", and "View Results" for that poll, and no separate action links/buttons are visible in the row outside the menu.
2. **Given** a poll row's action menu is open, **When** the admin selects "Edit Poll", "Copy Poll Link", or "View Results", **Then** the same behavior occurs as today (navigate to the edit page, copy the poll link to the clipboard, or navigate to the admin results view, respectively) and the menu closes.
3. **Given** a poll row's action menu is open, **When** the admin clicks elsewhere on the page or presses Escape, **Then** the menu closes without performing any action.
4. **Given** one poll row's action menu is open, **When** the admin clicks the menu icon on a different poll row, **Then** the first menu closes and the second menu opens.
5. **Given** the admin poll list contains many polls, **When** the admin opens a menu on a row near the bottom or edge of the visible list, **Then** the full menu remains visible on screen (not clipped or hidden).
6. **Given** the admin is navigating with the keyboard only, **When** they Tab to a row's menu trigger and press Enter or Space, **Then** the menu opens, focus moves to the first item, and Arrow Up/Down moves focus between the four items without leaving the menu.
7. **Given** a poll row's action menu is open and focus is on one of its items, **When** the admin presses Escape or selects an item with Enter/Space, **Then** the menu closes and focus returns to that row's menu trigger.

---

### User Story 2 - Unique Titles for Duplicated Polls (Priority: P2)

An admin duplicates an existing poll (via the "Duplicate Poll" action) and expects the new poll to have a distinct, recognizable title so it can't be confused with the original or with other duplicates already made from the same poll.

**Why this priority**: Without a uniqueness rule, duplicating the same poll more than once produces multiple polls with an identical title, making the admin list confusing and error-prone — but this is a narrower correctness fix than the menu consolidation.

**Independent Test**: From `/admin`, duplicate the same poll twice in a row and confirm the two resulting polls have different, predictable titles. Can be fully tested independently of the actions-menu UI change.

**Acceptance Scenarios**:

1. **Given** a poll titled "Customer Satisfaction" with no other poll titled "Customer Satisfaction Copy", **When** the admin duplicates it, **Then** the new poll is titled "Customer Satisfaction Copy".
2. **Given** a poll already exists titled "Customer Satisfaction Copy" (from a prior duplication), **When** the admin duplicates "Customer Satisfaction" again, **Then** the new poll is titled "Customer Satisfaction Copy 1".
3. **Given** polls already exist titled "Customer Satisfaction Copy" and "Customer Satisfaction Copy 1", **When** the admin duplicates "Customer Satisfaction" again, **Then** the new poll is titled "Customer Satisfaction Copy 2".
4. **Given** a poll titled "Customer Satisfaction Copy" exists but only as an **archived** poll, and another exists titled "Customer Satisfaction Copy 1" as a **closed** poll, **When** the admin duplicates the active "Customer Satisfaction" poll, **Then** the new poll is titled "Customer Satisfaction Copy 2" (the archived and closed titles both count toward the collision check).

---

### User Story 3 - Consistent Site Header (Priority: P3)

Any visitor or admin moving between pages on the site (home, login, profile, create account, admin poll list, poll editor, admin results) sees the exact same header — same branding, navigation, and account controls — so the site feels like one coherent product rather than a patchwork of different page shells.

**Why this priority**: This is a visual/branding consistency fix. It affects perceived polish across the whole site but does not block any specific task the way the actions menu or duplicate-title correctness does.

**Independent Test**: Visit the home page and note the exact header content (logo, navigation, search element, account area). Visit each other page (`/admin`, an individual poll's edit page, an individual poll's admin results page, `/login`, `/profile`, `/create-account`) and confirm the header is identical in content and layout. Can be tested independently by visual comparison alone.

**Acceptance Scenarios**:

1. **Given** the home page header shows the site logo/wordmark, primary navigation, a search element, and the account/login area, **When** the admin visits `/admin`, **Then** the header shows the identical logo/wordmark, navigation, search element, and account area — not a different/reduced brand mark.
2. **Given** the same home-page header content, **When** any user visits the poll editor page or the admin results page for a specific poll, **Then** the header shown is identical to the home page's header (no back-arrow-only header, no missing brand).
3. **Given** the same home-page header content, **When** a user visits `/login`, `/profile`, or `/create-account`, **Then** the header shown is identical to the home page's header.
4. **Given** a user is logged in, **When** they view the header on any page, **Then** the account/avatar area reflects their logged-in state consistently, exactly as it does on the home page.

---

### User Story 4 - Streamlined, Contradiction-Free Poll Editing (Priority: P4)

An administrator editing a poll on its configuration page wants to get back to the poll
list without losing their place or seeing stale data, wants the page's fields to take less
scrolling to work through, wants the Access Mode options to make clear they are all
distinct from "Public," wants the "Voter Count Limit" field to only ever hold a meaningful
value for the access mode it actually applies to, and never wants to be able to leave the
poll in a self-contradictory state (visibly "Transparent" results on a poll anyone in the
world can open).

**Why this priority**: This is a lower-priority refinement than the three structural fixes
above — it improves the editing experience and closes a real data-integrity gap (a
Transparent/Public poll makes voter identities visible to any anonymous visitor, not just
invited participants) but doesn't block any workflow the way the actions-menu clutter or
duplicate-title collisions do.

**Independent Test**: Open a poll's configuration page, use the back control to return to
the poll list and confirm it shows current data, then exercise the Results
Visibility/Access Mode/Voter Count Limit fields to confirm the described auto-corrections
and defaults, independent of any other change in this spec.

**Acceptance Scenarios**:

1. **Given** the poll editor page, **When** it renders, **Then** a back-navigation control
   appears above the Title field and below the header, and activating it takes the admin to
   `/admin` with the poll list showing current data (not a page reached by the browser's
   native "back" navigation, which could show a stale cached list).
2. **Given** the Access Mode dropdown, **When** the admin opens it, **Then** its three
   options read "Public," "Private Anyone with the link," and "Private Invitation Only" —
   the two non-public options are now unambiguously prefixed "Private."
3. **Given** a poll with Access Mode "Public," **When** the admin sets Results Visibility to
   "Transparent," **Then** Access Mode is changed to "Private Invitation Only" as part of the
   same save, and both fields reflect the new values without a separate admin action.
4. **Given** a poll with Results Visibility "Transparent" and Access Mode one of the two
   private modes, **When** the admin sets Access Mode to "Public," **Then** Results
   Visibility is changed to "Anonymous" as part of the same save.
5. **Given** a poll that has already received at least one vote (so Access Mode is locked,
   existing behavior), **When** the admin attempts to set Results Visibility to
   "Transparent" while Access Mode is "Public," **Then** the change is rejected (since it
   cannot be satisfied without changing the locked Access Mode) and both fields keep their
   prior values.
6. **Given** a newly created poll (Access Mode defaults to "Public"), **When** the admin
   opens its configuration page, **Then** "Voter Count Limit" is blank.
7. **Given** a poll with Access Mode "Public," **When** the admin changes Access Mode to
   either private mode, **Then** "Voter Count Limit" is set to 500.
8. **Given** a poll with a private Access Mode, **When** the admin changes Access Mode to
   "Public," **Then** "Voter Count Limit" is cleared to blank.
9. **Given** the "Voter Count Limit" field, **When** the admin types a value greater than
   500, **Then** the field does not accept a value above 500.
10. **Given** the "Voter Count Limit" field holding a value, **When** the admin clears it and
    moves focus away, **Then** the value is saved as blank (no cap).
11. **Given** the participant list on a poll's configuration page, **When** the admin views
    the action next to a participant, **Then** it reads "Ban from Voting" (not "Remove") and
    still performs the same ban behavior as before.
12. **Given** the Title, Subtitle, and Voter Count Limit fields, **When** the admin views the
    poll editor, **Then** each field's label appears to the left of its input box on the same
    line rather than stacked above it.
13. **Given** the Title, Subtitle, and Choices sections, **When** the admin views the poll
    editor, **Then** the vertical space between them is visibly smaller than the space around
    other field groups on the page.

### Edge Cases

- Duplicating a poll whose title already ends in "Copy" or "Copy N" (e.g., duplicating "Team Offsite Copy") still follows the same rule literally: attempt "Team Offsite Copy Copy" first, then "Team Offsite Copy Copy 1", and so on, even though the result reads unusually.
- If an admin triggers "Duplicate Poll" on the same source poll twice in rapid succession (e.g., a double click before the list refreshes), the system must still guarantee the two resulting titles are unique — never create two polls with the same title.
- The uniqueness check must find a free "Copy N" slot even when many numbered copies already exist, without failing or timing out.
- A poll list with zero polls shows an empty table with no action menus to open.
- An action menu opened on a row must not be obscured by, or overlap unreadably with, adjacent rows or the edge of the browser window.
- Setting Results Visibility to "Transparent" and Access Mode to "Public" in the same save request is treated as a single Transparent-wins outcome: Access Mode ends up "Private Invitation Only," not "Public" (US4 Acceptance Scenario 3's rule takes priority over a simultaneous, self-contradictory request).
- Clearing "Voter Count Limit" on a "Private Anyone with the link" poll removes its participant cap entirely (unlimited voters) until the admin sets a new value.
- A direct API call (not just the Edit Poll UI) that would leave a poll Transparent-and-Public is also auto-corrected, not merely rejected — the invariant in US4 Acceptance Scenarios 3–4 holds regardless of which client makes the change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When an admin duplicates a poll, the system MUST set the new poll's title to the source poll's exact title with " Copy" appended.
- **FR-002**: If the resulting title from FR-001 is not unique among all existing poll titles, the system MUST append a space followed by an incrementing whole number, starting at 1, trying successive numbers until an unused title is found (e.g., "Title Copy", "Title Copy 1", "Title Copy 2", ...).
- **FR-003**: The uniqueness check in FR-002 MUST compare against poll titles across every poll state — active, pending, closed, and archived — with none excluded.
- **FR-004**: The system MUST guarantee the resulting duplicated-poll title is unique at the moment the new poll is created, even under concurrent duplicate requests for the same source poll.
- **FR-005**: The admin poll list's Actions column MUST present a single menu-trigger icon per poll row in place of the current separate action links/buttons.
- **FR-006**: Clicking the menu-trigger icon MUST open a menu containing exactly the four existing per-poll admin actions — "Edit Poll", "Duplicate Poll", "Copy Poll Link", and "View Results" — each preserving its current destination and behavior unchanged.
- **FR-007**: Only one poll row's action menu MUST be open at a time; opening a menu on another row MUST close any menu already open.
- **FR-008**: An open action menu MUST close when the admin clicks outside it, presses Escape, or selects one of its items, without navigating or acting a second time; when closed via Escape or item selection, focus MUST return to that row's menu trigger.
- **FR-009**: An open action menu MUST remain fully visible within the browser viewport regardless of the triggering row's position in the list.
- **FR-010**: Every page on the site MUST render the same header content, structure, and styling as the home page — including brand logo/wordmark, primary navigation, search element, and the session-driven account/login area — with no page substituting a different, reduced, or alternate header.
- **FR-011**: The menu trigger MUST be reachable via Tab and operable via Enter or Space; once open, Arrow Up/Down MUST move focus between the four menu items, and the trigger and menu MUST expose standard ARIA menu semantics (e.g., `aria-haspopup`, `aria-expanded` on the trigger; `menu`/`menuitem` roles on the menu and its items) so assistive technology announces them correctly.
- **FR-012**: The poll editor page MUST show a back-navigation control above the Title field and below the header that navigates directly to `/admin`, not via the browser's history/"back" mechanism, so the poll list it lands on always reflects current data.
- **FR-013**: The Access Mode dropdown's two non-public options MUST be labeled "Private Anyone with the link" and "Private Invitation Only" (their underlying values and behavior are unchanged).
- **FR-014**: When Results Visibility is set to "Transparent" while the poll's Access Mode is "Public," the system MUST change Access Mode to "Private Invitation Only" as part of the same save, unless Access Mode is locked (FR-048 of `004-realtime-poll-voting`, i.e. the poll has ever received a vote), in which case the Results Visibility change MUST be rejected instead.
- **FR-015**: When Access Mode is set to "Public" while the poll's Results Visibility is "Transparent," the system MUST change Results Visibility to "Anonymous" as part of the same save.
- **FR-016**: FR-014/FR-015 MUST hold regardless of which client makes the change — a direct API request that would otherwise leave a poll with Results Visibility "Transparent" and Access Mode "Public" MUST be auto-corrected server-side, not merely rejected or left to client-side logic.
- **FR-017**: A newly created poll MUST default to a blank "Voter Count Limit" (consistent with its default Access Mode of "Public").
- **FR-018**: When Access Mode changes from "Public" to either private mode, the system MUST set "Voter Count Limit" to 500, unless the same request also explicitly sets a different value.
- **FR-019**: When Access Mode changes from a private mode to "Public," the system MUST clear "Voter Count Limit" to blank.
- **FR-020**: The system MUST prevent "Voter Count Limit" from being set above 500.
- **FR-021**: "Voter Count Limit" MUST be clearable to blank; a blank value MUST be treated as no cap on the number of participants for a "Private Anyone with the link" poll.
- **FR-022**: The participant-list action that removes a participant from voting and adds them to the poll's `BannedVoterList` MUST be labeled "Ban from Voting."
- **FR-023**: The Title, Subtitle, and Voter Count Limit fields on the poll editor page MUST show their label to the left of their input, on the same line, rather than stacked above it.
- **FR-024**: The vertical spacing between the Title, Subtitle, and Choices field groups on the poll editor page MUST be visibly reduced from the page's other field groups' spacing.

## Key Entities *(include if data involved)*

- **Poll**: The existing poll record being duplicated or acted on from the admin list, or edited on its configuration page. Relevant attributes for this feature: its title (used to derive a duplicate's title); its state (active, pending, closed, or archived — all of which participate in the duplicate-title uniqueness check); and, for User Story 4, `ResultsVisibility`, `AccessMode`, and `VoterCountLimit` — `ResultsVisibility` of "Transparent" and `AccessMode` of "Public" are mutually exclusive (FR-014–016), and `VoterCountLimit` now has no value ("blank") as a valid state alongside a positive integer up to 500, tracking whether `AccessMode` is currently "Public" (FR-017–021).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every "Duplicate Poll" action produces a poll title that is unique among all existing poll titles, verified across repeated duplications of the same source poll and across polls in every state (active, closed, archived).
- **SC-002**: An admin can reach and trigger any of the four per-poll actions in at most two interactions (one to open the menu, one to choose an action).
- **SC-003**: The Actions column shows exactly one interactive element per poll row (the menu trigger) instead of the four separate elements shown today.
- **SC-004**: Every page on the site, when compared side-by-side with the home page, shows an identical header with no visible differences in branding, navigation, search, or account area.
- **SC-005**: An admin can open a row's actions menu, move to any of the four items, and activate one — entirely from the keyboard, with no mouse input — every time.
- **SC-006**: No poll can ever be saved — through the Edit Poll page or a direct API request — with Results Visibility "Transparent" and Access Mode "Public" at the same time.
- **SC-007**: "Voter Count Limit" always matches its Access Mode: blank whenever Access Mode is "Public," and a value between 1 and 500 whenever Access Mode is private and the admin hasn't cleared it.

## Assumptions

- The four actions relocated into the menu keep their current exact labels and behavior ("Edit Poll", "Duplicate Poll", "Copy Poll Link", "View Results") — the design reference's mention of "View Results Admin-mode" is treated as a descriptive paraphrase, not an instruction to rename the existing "View Results" label.
- The menu trigger is a three-dot ("kebab") icon, matching the provided design screenshot and the conventional pattern for per-row action menus; a hamburger icon is not used since that convention is normally reserved for page/global navigation, not row-level actions.
- Title-uniqueness comparison is an exact, case-sensitive string match against stored titles, with no additional trimming or normalization beyond what the system already applies when storing titles.
- "Every page on the site must have the same header" is applied site-wide — not only to the `/admin`-prefixed pages — since that is the literal scope stated for this requirement, even though it appears in a design document otherwise focused on the admin page. This includes pages whose header is currently built differently from the home page's (e.g., `/login`, `/profile`, `/create-account`), not only the admin pages whose header is currently reduced or alternate-branded.
- Page-specific navigation affordances that exist only in a page's current header (for example, the back-arrow shown today on the poll editor and admin results pages) are removed once that header is replaced with the home page's header, since the home page's header has no equivalent element. User Story 4 delivers the "if needed" replacement anticipated here, but only for the poll editor page (`admin-poll.html`) — the admin results page (`admin-results.html`) does not gain a back control in this pass, since it was not named in the request that drove User Story 4.
- No new poll state or soft-delete concept is introduced; "archived" and "closed" polls refer to the existing stored poll states already defined in the poll data model.
- User Story 4's Results Visibility/Access Mode auto-correction (FR-014/015) always resolves in favor of whichever field the admin just changed, even edge cases like both fields arriving in the same request (Edge Cases) — there is no third "ask the admin to choose" state; the system always produces a valid, saved combination in one step.
- "Ban from Voting" (FR-022) renames only the participant-list action already documented as ban-on-remove in `004-realtime-poll-voting` (FR-050); it does not change, add, or remove any behavior, and the Choices section's own "Remove" button and the Banned Voter List's "Un-ban" button keep their current labels.
