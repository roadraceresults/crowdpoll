# Feature Specification: Single Row Header

> Amended by feature 20261023-155959-PHONE-TAB-BAR (2026-10-23): the scroll arrows, the hold and the step are removed (`tabBarScroll.js` keeps the drag, now for mouse and pen, gains a mouse-wheel handler and keeps the All tabs menu); up to 900 px each tab is one line, a 16 px icon beside the label in a 48 px tab, the row has a 32 px edge fade and scrolls with the browser's own touch scrolling, smoothly when a tab is chosen, and Refresh sits under the bar at the left with the All tabs button at the right.

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "designDocs/031-high-level-requirements-SINGLE-ROW-HEADER.md"

**Source requirements**: `designDocs/031-high-level-requirements-SINGLE-ROW-HEADER.md` (the requirements document, with every finding of the architecture review folded in).
**Architecture**: `architecture/031-single-row-header/architecture.md` (9 findings, all resolved).
**Builds on**: feature 030 (Integrate Single Column), whose phone layout starts at 639.98 pixels and is not changed here.

## Clarifications

### Session 2026-10-14

- Q: What decides that the header "wraps"? → A: The header's own content no longer fitting on its row, measured on the page, not fixed screen widths: a signed-in user, a guest, a long name or a larger text size reach each step at different widths.
- Q: Which item is the one that "wraps" for a guest, who has no user name or avatar? → A: Whatever is last on the row: the user's name and avatar for a signed-in user, the Create Account to Vote button for a guest.
- Q: Does hiding the user name also take it out of the avatar menu? → A: No. The name is hidden on the header only, as on a phone today; the avatar and its menu are unchanged.
- Q: Where does the phone layout start? → A: Unchanged: at 639.98 pixels. The steps in this feature apply above it.
- Q: When the header search box is hidden at a width of 640 pixels or more, how does the user search? → A: The Search tab's own field, which feature 030 shows on phones, is shown whenever the header box is hidden.
- Q: What happens to a guest, who has no name to hide, when the row is still too full after the search box is hidden? → A: Nothing more is hidden: the logo mark and the word mark are never hidden. (Revised by FIX07, which removed the link step, and by FIX08, which removed the logo step; a guest's buttons are tightened from 641 to 900 pixels so the row fits.)
- Q: When do hidden items come back? → A: Every time the header is measured it starts from the full header, so items return as soon as the row has room again.
- Q: What if the Create Poll link is hidden for a signed-in user who may create polls, who has no other way to it above 640 pixels? → A: The link is never hidden for a user who may create polls; the logo mark is never hidden either. (Revised by FIX07 and FIX08: only a user who may create polls has the link, and no step hides the logo mark.)
- Q: What happens to terms typed in the header search box when it is hidden? → A: They show in the Search tab field while the box is hidden, and go back to the header box when it returns; a search already shown stays shown.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The header is always one row (Priority: P1)

A visitor opens any page at any window width of 640 pixels or more. The header, with the logo, word mark, search box, Create Poll link and the sign-in or user area, stays on one row, however narrow the window gets. It never drops the search box or anything else onto a second row.

**Why this priority**: This is the whole feature. A header that wraps pushes the tabs down and looks broken.

**Independent Test**: Open the home page as a guest, as a member and as an administrator, and drag the window from 1400 pixels down to 640 pixels; the header must never be taller than one row.

**Acceptance Scenarios**:

1. **Given** a window of 640 pixels or more, **When** any page that has the header is shown, **Then** the header is on one row.
2. **Given** a window between 640 and 767 pixels, **When** the page is shown, **Then** the search box is not on a second row of its own, as it is today.
3. **Given** a window wide enough for everything, **When** the page is shown, **Then** the header shows everything it shows today for that user.

---

### User Story 2 - The user name steps aside first (Priority: P1)

A signed-in user narrows the window until the name and avatar no longer fit beside the rest of the header. The user name disappears and the avatar stays where it was, with its menu.

**Why this priority**: It is the first, and cheapest, thing the header gives up, and it applies to every signed-in user.

**Independent Test**: As a signed-in user, narrow the window until the header is full; the name disappears and the avatar still opens its menu.

**Acceptance Scenarios**:

1. **Given** a signed-in user and a window just too narrow for the full header, **When** the page is shown, **Then** the user name is not shown, the avatar is, and the search box is still shown.
2. **Given** the name is hidden, **When** the user opens the avatar menu, **Then** the menu is as it is with the name showing.
3. **Given** the window is widened again so that everything fits, **When** the page is shown, **Then** the name is shown again.

---

### User Story 3 - The search box steps aside next, and search stays possible (Priority: P2)

The window narrows further and the avatar would no longer fit. The header search box disappears, and the user finds the same search in the Search tab, down the page.

**Why this priority**: It keeps the one-row promise below the name step, but it must not cost the user the ability to search.

**Independent Test**: As a signed-in user at about 700 pixels, with the name already hidden, narrow the window until the search box disappears; open the Search tab and search.

**Acceptance Scenarios**:

1. **Given** the name is already hidden and the row is still too full, **When** the page is shown, **Then** the header search box is not shown.
2. **Given** the header search box is hidden (at any window width), **When** the user opens the Search tab, **Then** it has a search field with a clear button at its top that gives the same results, and pressing "/" outside a text field focuses it.
3. **Given** the header search box is shown, **When** the user opens the Search tab on a window of 640 pixels or more, **Then** the Search tab has no field of its own, as today.
4. **Given** terms typed in the header search box, **When** the box is hidden, **Then** the same terms are in the Search tab field, and when the box returns they are in it again.
5. **Given** a window narrower than 640 pixels, **When** the page is shown, **Then** the phone layout of feature 030 applies as it does today.

---

### User Story 4 - A guest's header still fits (Priority: P2)

A guest has no name to hide. The logo mark is never hidden. The guest buttons are tightened from 641 to 900 pixels (same height, text size and side padding as a poll card's Vote button), so that Log In and Create Account to Vote, the logo, the word mark and the search box fit on one row down to 640 pixels once the search box has gone.

**Why this priority**: Without the tightened buttons the one-row promise fails for guests near 640 pixels, now that the logo mark no longer steps aside.

**Independent Test**: As a guest, narrow the window from 1000 pixels to 640 pixels; the header stays on one row throughout and Log In and Create Account to Vote remain.

**Acceptance Scenarios**:

1. **Given** a guest and a row still too full without the search box, **When** the page is shown, **Then** the logo mark, the word mark, Log In and Create Account to Vote are all shown.
2. **Given** a signed-in user without permission to create polls and a row still too full after the search box has gone, **When** the page is shown, **Then** the same step applies.
3. **Given** a guest or a user without permission to create polls, **When** the page is shown, **Then** the header has no Create Poll link.
4. **Given** a signed-in user who may create polls and a row still too full after the search box has gone, **When** the page is shown, **Then** the Create Poll link and the logo mark both stay.

---

### User Story 5 - The header re-fits itself when things change (Priority: P3)

The window is resized, the user signs in or out, the text size changes or the fonts finish loading. The header fits again at once, with nothing left hidden that now has room and nothing wrapping.

**Why this priority**: It makes the steps trustworthy, but each step already works without it on a settled page.

**Independent Test**: Sign in and out at a width where the guest header shows fewer items than the member header; resize the window up and down across each step.

**Acceptance Scenarios**:

1. **Given** a window at a step boundary, **When** the user signs in or out, **Then** the header shows what fits for the new user.
2. **Given** items are hidden, **When** the window is widened, **Then** they return in the reverse order of hiding.
3. **Given** the text size or the zoom is increased, **When** the page is shown, **Then** the header stays on one row by hiding items in the same order.

### Edge Cases

- A very long user name: it is the first item hidden, so it cannot push the avatar onto a second row.
- A user without the right to create polls: the Create Poll link is absent from the header for that user (FIX07).
- A user who may create polls: the Create Poll link is never hidden above 640 pixels, so they always have a way to start a poll.
- A window narrow enough for the header search box to be hidden (illustratively, somewhere between 640 and 900 pixels for a signed-in user): the Search tab field is the only search field.
- A window exactly at 639.98 pixels or narrower: only the phone rules of feature 030 apply.
- The header is empty (not yet drawn): nothing is hidden.
- Pressing "/" when the header search box is hidden and the Search tab field is not on screen does nothing; this is the same as on a phone today.
- The other six pages with the header: the same steps apply; those pages have no Search tab, so at widths where the search box is hidden there they have no search field, as on a phone today.
- The header is rebuilt while the user is typing in the header search box: typed terms survive as today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: At every window width of 640 pixels or more, the header MUST be on a single row on every page that has it.
- **FR-002**: The rule that places the header search box on a second row between 640 and 767 pixels MUST no longer apply.
- **FR-003**: A step MUST be taken when, and only when, the header's content does not fit on its row, as measured on the page; fixed screen widths MUST NOT decide it.
- **FR-004**: The steps MUST be taken in this order, each only if the row is still too full after the previous: (1) hide the user name; (2) hide the header search box. The logo mark MUST never be hidden at any width (FIX08). The header MUST have a Create Poll link only for a user who may create polls (an administrator, or a user with both Create Poll and View Polls), and that link MUST never be hidden above 640 pixels. The word mark MUST never be hidden.
- **FR-005**: Hiding the user name MUST affect the header only; the avatar and its menu MUST be unchanged.
- **FR-006**: While the header search box is hidden, at any window width, the Search tab MUST show its own search field and clear button, giving the same results as the header box under the same rate limit; while the header box is shown on a window of 640 pixels or more, the Search tab MUST NOT show one.
- **FR-007**: While the Search tab field is on screen, pressing "/" outside a text field MUST focus it; otherwise "/" MUST behave as today.
- **FR-008**: The phone layout of feature 030 MUST start, and be unchanged, at 639.98 pixels; no step of this feature applies below it.
- **FR-009**: Every measurement MUST start from the full header, so that hidden items return as soon as the row has room.
- **FR-010**: The header MUST be measured again when the window is resized, when the header is rebuilt (sign-in, sign-out, a session change) and when the page's fonts have loaded.
- **FR-011**: The header search box MUST have a minimum width (200 pixels, adjustable in one place) and MUST be hidden when that no longer fits.
- **FR-012**: For a guest, the last item on the row is Create Account to Vote; for a signed-in user it is the avatar. A step MUST be taken when that item would otherwise not fit.
- **FR-013**: At or above the width where everything fits, the header MUST look and behave as it does today for that user.
- **FR-014**: The steps MUST apply to all seven pages that have the header.
- **FR-015**: Nothing in this feature MUST change the server, its routes, its configuration or stored data, and no new dependency MUST be added.
- **FR-016**: Terms typed in the header search box MUST appear in the Search tab field while the box is hidden, and in the box again when it returns; results already shown MUST stay shown.

- **FR-017**: From 900 pixels down, the home page tabs MUST take the phone sizing (text at 90%, tighter letter spacing, 6 px side padding with no minimum width, and an underline inset to match); above 900 pixels they keep their current size.
- **FR-018**: The Create Poll link MUST carry a plus-in-a-circle icon before its text, drawn like the Your Votes tab icon.
- **FR-019**: From 900 pixels down, the home page MUST show the tab arrows and the all-tabs menu button as in single column mode, with the all-tabs button flush left and Refresh flush right on one row under the tab bar (the row stays on Live Results, where only the menu button shows), the right arrow at the tab bar's right edge, and the all-tabs icon drawn as three small dots before three lines.
- **FR-020**: From 900 pixels down, the Log In and Create Account to Vote buttons MUST have the height and text size (and, from 641 to 900 pixels, the side padding) of the Vote button on a poll card at the same width (32 px, 16 px side padding and the Label Large size from 641 to 900 px; 21 px and three quarters of that size on a phone).
- **FR-021**: Above 640 pixels the Create Poll link MUST sit against the sign-in or user area at the right, with its usual gap, when the header search box is hidden or at its widest, and MUST NOT take width from the search box.

### Key Entities *(include if feature involves data)*

None. The only state is the current step, which is kept in the page only, is recomputed whenever the header is measured and is never stored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On all seven pages, as a guest, a member and an administrator, the header is exactly one row high at every window width from 640 to 1400 pixels, checked at 640, 700, 768, 900, 1024 and 1400 pixels.
- **SC-002**: As a signed-in user narrowing the window, the user name disappears before the search box in 100% of cases, and the search box disappears before the avatar does (the avatar never disappears above 640 pixels).
- **SC-003**: As a guest, Log In and Create Account to Vote stay visible on the row at every width from 640 pixels up.
- **SC-004**: At every width where the header search box is hidden, a user can run a search from the Search tab in the same number of steps as from the header box plus one tab click.
- **SC-005**: At 1400 pixels, every page's header is identical to what it was before this feature, for a guest and for a signed-in user.
- **SC-006**: Widening the window to a width where everything fits restores every hidden item, in every case checked, with no page reload.
- **SC-007**: Below 640 pixels, every page behaves exactly as it did after feature 030.

## Assumptions

- The widths quoted (about 830 pixels for a guest, 860 pixels for a member) are estimates from the stylesheets; the real thresholds are whatever the page measures.
- A guest and a user without permission to create polls have no Create Poll link in the header (FIX07).
- A signed-in user who may create polls reaches Create Poll through the header link above 640 pixels, which is never hidden for them, and through the avatar menu below, as in feature 030.
- The new rules are added as a new layer on top of the existing styles, as in features 024 and 030; no production stylesheet is edited and the existing search code is not changed. The one change to a feature 030 sheet is that the Search tab field's look moves out of its phone-only block so it can also be shown at 640 pixels and wider.
- No other page content, tab or card changes.
