# Feature Specification: Site Settings and Color Scheme

**Feature Branch**: `user-settings`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "requirements/20261102-134601-site-settings/requirements.md"

## Clarifications

### Session 2026-11-02

- Q: When a session ends without Logout (expired, signed out elsewhere, account deleted), what happens to the device copy of a Dark choice? → A: the first page load that finds no session removes the device copy and shows Light; only that page may show Dark before switching.
- Q: How far does the WCAG 2.2 AA contrast check reach? → A: every page of the site, in both Light and Dark, and every AA contrast failure found is fixed as part of this feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A signed-in user switches to the Dark color scheme (Priority: P1)

A signed-in user opens the avatar menu and chooses "Site Settings".
The Site Settings page opens, looking like the Profile page, titled "Site Settings", with a gear icon on its card.
Its only setting is "Color Scheme", with two choices, "Light (default)" and "Dark".
The user picks "Dark": the whole page turns dark at once, with no Save button to press, and the choice is saved to their account.
Every page they open afterwards, on this device or any other where they are signed in, is shown in Dark.

**Why this priority**: This is the feature. The page, the menu item and the stored setting exist to deliver it.

**Independent Test**: Sign in, open Site Settings from the avatar menu, choose Dark, and confirm the page turns dark at once; reload, open another page, and sign in on a second browser, and confirm each is dark.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they open the avatar menu, **Then** "Site Settings" is listed directly after "Edit Profile", with the gear icon, and is enabled whatever the user's permissions.
2. **Given** a signed-in user, **When** they choose "Site Settings", **Then** the Site Settings page opens with the title "Site Settings", the gear icon on its card at the size of the avatar on the Profile card, and one "Color Scheme" setting; none of the Profile page's other fields, labels or buttons appear.
3. **Given** a user who has never chosen a scheme, **When** the Site Settings page opens, **Then** "Light (default)" is selected.
4. **Given** the Site Settings page, **When** the user selects "Dark", **Then** the page is shown in the dark scheme at once and the choice is saved to their account, with no Save button.
5. **Given** a user who chose Dark, **When** they open any page of the site, including the poll administration pages, **Then** it is shown in Dark from its first appearance, without first showing light.
6. **Given** a user who chose Dark, **When** they sign in on another device, **Then** the site is shown in Dark there once the user's account has been read, and from the first appearance of every later page.
7. **Given** a user who chose Dark, **When** they select "Light (default)", **Then** the site returns to Light at once and the choice is saved.

---

### User Story 2 - Light is the default for everyone who has not chosen Dark (Priority: P1)

A visitor who is signed out, or a signed-in user who has never chosen a scheme, sees the site in Light, even when their device is set to a dark appearance.

**Why this priority**: It decides what every visitor sees, and it changes today's behaviour, where the site follows the device's dark setting.

**Independent Test**: With the device set to a dark appearance, open the site signed out and as a user who never chose: both see Light. Sign in as a user who chose Dark: they see Dark.

**Acceptance Scenarios**:

1. **Given** a device set to a dark appearance, **When** a signed-out visitor opens any page, **Then** it is shown in Light.
2. **Given** a device set to a dark appearance, **When** a signed-in user who never chose a scheme opens any page, **Then** it is shown in Light.
3. **Given** a user who chose Dark is signed in, **When** they log out, **Then** the browser returns to Light, and the device keeps no copy of their choice.

---

### User Story 3 - Poll Administration gets its own icon (Priority: P2)

The gear icon now belongs to "Site Settings".
"Poll Administration", shown in the avatar menu to users allowed to create polls, gets a new icon: a checklist of three ticked boxes, each followed by a bar (the middle one shorter), drawn in the page's background colour inside the same dark circle the gear uses today.

**Why this priority**: Two menu items must not share the gear, but the icon does not change what anyone can do.

**Independent Test**: Sign in as a user allowed to create polls, open the avatar menu, and confirm "Poll Administration" shows the checklist icon and "Site Settings" the gear, in both Light and Dark.

**Acceptance Scenarios**:

1. **Given** a user allowed to create polls, **When** they open the avatar menu, **Then** "Poll Administration" shows the checklist icon in a dark circle and "Site Settings" shows the gear.
2. **Given** either scheme is shown, **When** the avatar menu is open, **Then** both icons follow that scheme, as the other menu icons do.

---

### User Story 4 - The choice stays in step across tabs, and a failed save is undone (Priority: P2)

A user with several tabs of the site open changes the scheme in one: the others switch at once.
If the choice cannot be saved, the page goes back to the scheme last saved and says so.

**Why this priority**: Without it, the screen can show a choice that the next page load would undo.

**Independent Test**: Open two tabs, change the scheme in one and watch the other switch; then make the save fail (e.g. go offline) and confirm the page reverts with a message.

**Acceptance Scenarios**:

1. **Given** two tabs of the site are open in the same browser, **When** the scheme is changed on the Site Settings page in one, **Then** the other switches at once without a reload.
2. **Given** the save fails (no connection or a server error), **When** the user selects a scheme, **Then** the page returns to the last saved scheme, that choice is selected again, and the message "Your color scheme could not be saved. Please try again." is shown under the setting.
3. **Given** the user's session has ended, **When** they select a scheme, **Then** they are taken to the sign-in page.

---

### Edge Cases

- A signed-out visitor opens the Site Settings page's address directly: they are taken to the sign-in page.
- A user chooses Dark on one device while another device is already showing a page: the other device switches on its next page load.
- The device's remembered copy of the choice disagrees with the account (changed elsewhere, or the copy was cleared): the account wins once it has been read, and the copy is corrected.
- A Dark user's session ends without Logout (it expires, they sign out in another browser, or the account is deleted): the next page load shows Dark only until it finds no session, then switches to Light and removes the device copy.
- The browser does not allow the site to remember anything on the device: the choice still applies once the account has been read, at the cost of showing Light first.
- The user selects the scheme that is already selected: nothing changes and nothing is saved.
- The user changes the scheme several times quickly: the last choice is the one shown and saved.
- A poll line graph is on screen when the scheme changes: its lines and legend are redrawn for the new scheme at once, and it no longer follows the device's appearance.
- A request to save a value other than Light or Dark is refused and nothing is stored.

## Requirements *(mandatory)*

### Functional Requirements

**Menu and icons**

- **FR-001**: The avatar menu MUST list "Site Settings" directly after "Edit Profile", for every signed-in user, never disabled; signed-out visitors have no avatar menu and so no such item.
- **FR-002**: "Site Settings" MUST use the gear icon that "Poll Administration" uses today, unchanged.
- **FR-003**: "Poll Administration" MUST use a new checklist icon (three ticked boxes, each followed by a bar, the middle bar shorter, as in `requirements/20261102-134601-site-settings/poll-admin-icon.jpg`), drawn in the page's background colour inside a circle of the same dark colour and size as the gear's.
- **FR-004**: Both icons MUST follow the color scheme shown, as the other menu icons do; the menu's other items, their order and their rules are unchanged, and Logout stays last.

**Site Settings page**

- **FR-005**: The Site Settings page MUST be reachable at `/settings`, only when signed in; a signed-out request MUST be taken to the sign-in page, as the Profile page is.
- **FR-006**: The page MUST use the Profile page's styling and layout, with the title "Site Settings" and the gear icon, in its dark circle, on the card at the size and in the place of the avatar on the Profile card; none of the Profile page's other fields, labels or buttons appear.
- **FR-007**: The page MUST offer one setting, "Color Scheme", as a group of two mutually exclusive options, "Light (default)" and "Dark", with the user's saved choice selected when the page opens ("Light (default)" when they never chose), operable by keyboard and announced by screen readers as one labelled group.
- **FR-008**: Selecting an option MUST apply it to the page at once and save it to the user's account, with no Save button.
- **FR-009**: When the save fails, the page MUST return to the last saved scheme, select it again, and show "Your color scheme could not be saved. Please try again." under the setting; when the session has ended, the user MUST be taken to the sign-in page.

**Applying the scheme**

- **FR-010**: The scheme shown MUST be Dark only for a signed-in user whose saved choice is Dark; every other visitor (signed out, or never chose, or chose Light) MUST see Light, whatever the device's appearance setting.
- **FR-011**: The chosen scheme MUST apply to every page of the site, the poll administration pages included; those pages MUST no longer be fixed to Light.
- **FR-011a**: Every page of the site MUST be checked in both Light and Dark against WCAG 2.2 AA contrast (text, controls, icons and graph lines), and every failure found MUST be fixed as part of this feature.
- **FR-012**: A page MUST appear in the user's scheme from its first paint, without first showing the other scheme, whenever the device already holds a copy of the user's choice; the account remains the source of truth and corrects the copy on every page load.
- **FR-013**: The device's copy of the choice MUST be listed in the site's cookie and storage disclosure on the Privacy page.
- **FR-014**: When the scheme is changed, other open tabs of the site in the same browser MUST switch at once; other devices MUST switch on their next page load.
- **FR-015**: Logging out MUST return the browser to Light and remove the device's copy of the choice; so MUST any page load that finds no session (expired, signed out elsewhere, or account deleted), which may show the copied scheme only until the session check completes.
- **FR-016**: Poll line graphs MUST draw their lines and legend for the scheme shown on the page, and redraw at once when it changes, rather than following the device's appearance setting.

**Storing the choice**

- **FR-017**: The choice MUST be saved on the user's account as Light, Dark, or not yet chosen (treated as Light); any other value MUST be refused and nothing stored.
- **FR-018**: The user's saved choice MUST be returned with the signed-in user's account details that every page already reads, so applying it costs no extra request.
- **FR-019**: The choice MUST be removed with the account when the account is deleted.
- **FR-020**: The published API description MUST be updated for the new account field.

### Key Entities

- **Color scheme preference**: a per-account setting, one of Light, Dark or not yet chosen (shown as Light); belongs to the user's account and follows them to every device.
- **Device copy of the preference**: a copy of the signed-in user's choice kept in the browser only so pages can paint in the right scheme before the account is read; never authoritative, corrected on each page load, removed at logout.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in user can change the color scheme in at most 3 actions from any page (open the menu, choose Site Settings, choose a scheme).
- **SC-002**: The new scheme is visible on the Site Settings page within 100 ms of the choice, with no Save step.
- **SC-003**: After choosing Dark, 100% of the site's pages, the poll administration pages included, are shown in Dark on later visits on the same device, with no visible flash of Light.
- **SC-004**: A choice made on one device is shown on another device on its first page load after sign-in.
- **SC-005**: With the device set to a dark appearance, a signed-out visitor sees 100% of pages in Light.
- **SC-006**: When a save fails, the page shows the last saved scheme and the error message within 1 second of the failure, in every case tested.
- **SC-007**: Every page of the site, checked in both Light and Dark, has zero WCAG 2.2 AA contrast failures (text, controls, icons and graph lines).

## Assumptions

- "Guests" in the requirements means signed-out visitors; the requirement that the item "will not be disabled" means it is enabled for every signed-in user, unlike "Create Poll", which is disabled for users without permission to create polls.
- The setting belongs to the account, not to the device.
- The site already has a complete dark scheme for its non-administration pages; this feature makes it selectable rather than designing it, and audits every page's contrast in both schemes (the administration pages have never been shown dark).
- Removing the device-appearance behaviour is intended: visitors whose device is set to dark will see Light until they sign in and choose Dark (a breaking change accepted in the requirements report, NC1).
- No other settings, no colour schemes beyond Light and Dark, and no "follow my device" option are in scope.
- No new third-party dependency and no new configuration setting.
- The requirements, decisions and their rationale are in `requirements/20261102-134601-site-settings/requirements.md` and `requirements-report.md` (findings AM1, UA1–UA11, NC1).
