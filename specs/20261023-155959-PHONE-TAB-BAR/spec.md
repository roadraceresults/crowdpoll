# Feature Specification: Phone Tab Bar

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "requirements/20261023-155959-phone-tab-bar/requirements.md"

**Source requirements**: `requirements/20261023-155959-phone-tab-bar/requirements.md` (the requirements, with every finding of the review folded in).
**Requirements report**: `requirements/20261023-155959-phone-tab-bar/requirements-report.md` (4 diagrams and 9 findings, all resolved).
**Reference**: `requirements/20261023-155959-phone-tab-bar/tab-bar-example.jpg`, Polymarket's tab bar on a phone.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A phone visitor scrolls the tabs by swiping (Priority: P1)

On the home page, a visitor on a phone sees the tab bar as one row of tabs, each a small icon to the left of its label, like Polymarket's; a label of more than one word wraps word by word, so the row is shorter (TWEAKS03).
There are no scroll arrows.
Where more tabs wait beyond an edge of the screen, the tabs at that edge fade out, which tells the visitor to swipe.
A swipe scrolls the row with the phone's own momentum, and it stops where the finger leaves it.

**Why this priority**: It is the feature: the arrows, stacked icons and hand-made drag are what make today's phone bar awkward.

**Independent Test**: Open the home page at a phone width (390 px), see a row of tabs (Shared With You on three lines) and no arrows, see the right edge fade, swipe left, see the row glide and the left edge fade too, swipe to the end and see only the left edge fade.

**Acceptance Scenarios**:

1. **Given** the home page at any width up to 900 px, **When** it loads, **Then** every tab shows its icon to the left of its label, a label of more than one word wrapped to its longest word, and no scroll arrow is shown.
2. **Given** the row is wider than the screen and sits at its start, **When** the visitor looks at the bar, **Then** the tabs at the right edge fade out over the last 32 px and the left edge does not fade.
3. **Given** the row sits somewhere in the middle, **When** the visitor looks at the bar, **Then** both edges fade.
4. **Given** the row sits at its end, **When** the visitor looks at the bar, **Then** only the left edge fades.
5. **Given** every tab fits on the screen, **When** the visitor looks at the bar, **Then** neither edge fades.
6. **Given** a visitor swipes the row, **When** they lift their finger, **Then** the row keeps moving with momentum, slows and stops where it is, without snapping to a tab.

---

### User Story 2 - Choosing a tab brings it fully into view (Priority: P1)

A visitor taps a tab that is partly hidden under a fade, moves to a tab with the keyboard, or picks one from the All tabs menu.
The row glides until that tab is fully visible, instead of jumping.
A visitor who has asked their device for reduced motion sees the row move at once instead.

**Why this priority**: Without it a chosen tab can stay half hidden under the fade, and the jumps are the "abrupt" movement the requirements name.

**Independent Test**: At a phone width, tap the last tab that is partly visible at the right edge, and see the row glide until the whole tab shows; open the All tabs menu and pick the first tab, and see the row glide back to the start; with reduced motion on, repeat and see the moves happen at once.

**Acceptance Scenarios**:

1. **Given** a tab is partly out of view, **When** the visitor taps it, **Then** it is selected and the row scrolls smoothly until the tab is fully in view.
2. **Given** the visitor picks a tab from the All tabs menu that is off screen, **When** the menu closes, **Then** the row scrolls smoothly until that tab is fully in view.
3. **Given** focus is on a tab, **When** the visitor presses the arrow key towards a tab that is off screen, **Then** focus moves as today and the row scrolls smoothly to show it.
4. **Given** the device asks for reduced motion, **When** a tab is chosen by any of these means, **Then** the row moves at once, with no animation.
5. **Given** the page loads with a tab selected that would be off screen at the start, **When** the bar appears, **Then** the selected tab is fully in view.

---

### User Story 3 - A mouse or pen user scrolls the row without arrows (Priority: P2)

Someone on a narrow desktop window, or a tablet with a mouse or pen, has no finger to swipe with and no arrows to press.
They can drag the row with the mouse or pen, as today, or turn the mouse wheel over the row to move it sideways.
When the row cannot move any further in the wheel's direction, the wheel scrolls the page as usual.
Keyboard users move between tabs with the arrow keys as they do now.

**Why this priority**: It keeps every tab reachable at the phone widths on devices without touch; it is secondary because most visitors at these widths are on phones.

**Independent Test**: Open the home page in an 800 px wide desktop window, turn the wheel over the row and see it move sideways, keep turning at the end and see the page scroll, then drag the row with the mouse and see it follow the pointer.

**Acceptance Scenarios**:

1. **Given** the row can move in the wheel's direction, **When** the pointer is over the row and the wheel is turned, **Then** the row scrolls sideways and the page does not move.
2. **Given** the row is at its end in the wheel's direction, **When** the wheel is turned that way, **Then** the page scrolls as usual.
3. **Given** a mouse or pen, **When** the visitor presses on the row and drags, **Then** the row follows the pointer, and releasing after a drag does not choose a tab.
4. **Given** focus on a tab, **When** the visitor presses the arrow keys, **Then** focus moves between tabs exactly as today.

---

### User Story 4 - The buttons under the bar swap places (Priority: P3)

Under the tab bar, a phone visitor finds the Refresh button at the left and the All tabs menu button at the right, the opposite of today,
each flush with the edge of the poll cards below. Each does what it did before.

**Why this priority**: A small placement change the requirements ask for; it changes nothing about what the buttons do.

**Independent Test**: At a phone width, see Refresh under the bar at the left and the All tabs menu button at the right; press each and see it still refresh the tab, or open the menu listing all eight tabs.

**Acceptance Scenarios**:

1. **Given** the home page at any width up to 900 px, **When** it loads, **Then** Refresh sits under the bar at the left and the All tabs menu button under the bar at the right.
2. **Given** the All tabs menu button, **When** it is pressed, **Then** the menu opens and lists every tab, and picking one selects it as today.
3. **Given** the Refresh button, **When** it is pressed, **Then** the current tab refreshes as today.

---

### Edge Cases

- The window is resized, or the phone rotated, across 900 px: the bar switches between the phone design and today's wider design at once, without reloading.
- A guest: greyed tabs still scroll and fade like the others, and tapping one still leads to sign-in, as today.
- A drag with a mouse or pen that moves the row ends over a tab: the tab is not selected; a press without movement selects it.
- The All tabs menu is open and the visitor swipes the row: the menu stays open; a tap outside closes it, as today.
- Dark mode: the fade goes to transparent, so it shows the page's own background in both colour schemes.
- The visitor chooses the tab that is already active: as today, nothing is reloaded; the row still scrolls it fully into view if it was partly hidden.
- A short row (a very wide phone, or a tablet in landscape under 900 px) where all eight tabs fit: no fade, and swiping or turning the wheel scrolls the page, not the row.

## Requirements *(mandatory)*

### Functional Requirements

**The tabs, up to 900 px**

- **FR-001**: At every width up to 900 px, each tab MUST show a 16 px icon to the left of an 11 px label (Material 3 label-small: its line height, weight 500, 0.5 px tracking), 2 px apart, both vertically centred, with no padding above or at the left, 2 px below and 10 px at the right, the active underline spanning icon and label; a label of more than one word MUST wrap to the width of its longest word, on at most two lines (the markup joins the last two words of Shared With You with a no-break space), its lines left-aligned, so the tab is only as wide as its icon and that word or pair; each tab MUST be at least 48 px tall and as tall as the tallest tab in the row (TWEAKS03 to TWEAKS07, 2026-10-24; before them, each tab was one line of 14 px, 48 px tall).
- **FR-002**: The active tab MUST keep today's marker: a green label and a 3 px green underline spanning the icon and the label. A guest's greyed tabs MUST stay greyed.
- **FR-003**: The bar MUST show no scroll arrows at any width up to 900 px.

**The edge fades**

- **FR-004**: At an edge where more tabs wait beyond the screen, the last 32 px of the row MUST fade from opaque to transparent; an edge with nothing beyond it MUST NOT fade; when every tab fits, neither edge fades.
- **FR-005**: The fades MUST update as the row scrolls and when the window is resized.

**Scrolling**

- **FR-006**: A finger swipe MUST scroll the row with the browser's own touch scrolling and momentum; the page's own scripts MUST NOT handle touch drags of the row.
- **FR-007**: The row MUST NOT snap to tabs: it stops where the swipe leaves it.
- **FR-008**: Choosing a tab, by tap, by keyboard or from the All tabs menu, MUST scroll it fully into view smoothly; the tab selected when the page loads MUST be fully in view.
- **FR-009**: When the visitor's device asks for reduced motion, every scroll the page starts MUST be instant.
- **FR-010**: A mouse or pen MUST be able to drag the row, as today; a drag that moves the row MUST NOT select the tab it ends on.
- **FR-011**: A vertical mouse wheel over the row MUST scroll it sideways while it can move in that direction, and MUST scroll the page as usual otherwise.
- **FR-012**: Keyboard behaviour (arrow keys between tabs, Enter and Space) MUST be unchanged; the newly focused tab scrolls into view as a tapped one does (FR-008).

**Under the bar**

- **FR-013**: Up to 900 px, the Refresh button MUST sit under the bar at the left and the All tabs menu button under the bar at the right, each flush with the edge of the poll card column below it (the page's side padding, or the centred card when the column is wider than a card), whether or not the tab holds a card; each MUST behave as today. A guest's floating Log In / Create Account pair MUST start in the same row 8 px to the right of Refresh, not to its left as feature 032 placed it (TWEAKS04, 2026-10-24).
- **FR-017**: Below 640 px the header MUST have 3 px of padding above its content, the tab bar and the page moving down with it (TWEAKS04 and TWEAKS05, 2026-10-24).
- **FR-016**: At every width, the first tab's icon and label MUST start directly under the left edge of the header's
  logo; up to 900 px the tab has no left padding and the bar no negative margin, above 900 px the tab keeps its 16 px
  padding and the bar starts that far left (TWEAKS02, TWEAKS06, 2026-10-24).

**What does not change**

- **FR-014**: Above 900 px the tab bar MUST be unchanged, except that the bar starts one tab padding further left so
  the first tab's content sits under the logo (FR-016, TWEAKS02).
- **FR-015**: The tabs' names, order, icons (as drawings), what each shows, the header, the cards and every page other than the home page MUST be unchanged; the feature MUST change no route, stored data or setting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a 390 px wide phone, a visitor reaches any of the eight tabs with at most one swipe and one tap, with no arrow to press.
- **SC-002**: At every width up to 900 px, the bar shows no arrow, and the fade appears at an edge exactly when tabs wait beyond it: both edges in the middle, one edge at either end, none when all tabs fit.
- **SC-003**: 100% of tabs chosen by tap, keyboard or the All tabs menu end fully visible, the row arriving within the browser's smooth-scroll animation, about half a second, or at once with reduced motion.
- **SC-004**: A mouse user in an 800 px wide window reaches every tab with the wheel alone, and with a drag alone.
- **SC-005**: Above 900 px, the tab bar looks and behaves exactly as before the feature, apart from the first tab's
  content starting under the logo (FR-016).
- **SC-006**: Nothing outside the home page changes, and no server, data or configuration change is needed.

## Assumptions

- "The Phone interface" is every width up to 900 px, the widths where the row has arrows today (requirements review AM1); screens above 900 px keep today's bar (NC1).
- "Blurred" at the edge means a fade to transparent, as the Polymarket reference shows, not an optical blur (AM2).
- The tabs' names, order, icons as drawings, guest greying and CrowdPoll's green stay as they are; only their layout and size change.
- The All tabs menu keeps every behaviour it has today; only its button's position changes, swapped with Refresh (UA1).
- The 32 px fade is drawn as transparency, so it needs no separate colour for dark mode.
- The tests that cover the removed arrows go with them, and the tests that pin today's phone tab sizes are updated to the new sizes (requirements report, Breaking Changes).
- No new dependency is needed; the feature is a change to the home page's markup, scripts and styles only.
