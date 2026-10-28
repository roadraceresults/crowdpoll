# Feature Specification: Integrate Single Column

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "designDocs/030-high-level-requirements-INTEGRATE-SINGLE-COLUMN-PROTOTYPE.md"

**Source requirements**: `designDocs/030-high-level-requirements-INTEGRATE-SINGLE-COLUMN-PROTOTYPE.md` (the requirements document, with every finding of the architecture review folded in).
**Architecture**: `architecture/030-integrate-single-column-prototype/architecture.md` (19 findings, all resolved).
**Design source**: `prototypes/SINGLE-COLUMN-RENDERING/` and its record of 19 resolved requirements, `iterative-requirements.md`. Where this specification gives a size, a time or a distance, it is the value the prototype settled on.

## Clarifications

### Session 2026-10-13

- Q: Which pages get the compact header? → A: All seven pages that have the header (home, sign-in, create account, profile, not authorized, poll administration and its results page). The cards, tab bar, Refresh button and floating buttons are on the home page only.
- Q: How is the prototype brought in? → A: As new layers on top of the existing look; the existing page styles are not edited.
- Q: With the header search box hidden on a phone, how does a phone user search? → A: The Search tab gets its own search field at the top. On the other six pages there is no search box at phone width.
- Q: Where does Create Poll go on a phone? → A: Into the avatar menu, after Edit Profile and before Poll Administration, dimmed and not followed when the user may not create polls.
- Q: How does the change roll out? → A: Directly, to every visitor on a screen narrower than 640 pixels, with no switch to turn it off.
- Q: What does a guest's greyed tab do in the all-tabs menu? → A: The same as in the tab bar: it takes the guest to sign-in.
- Q: What happens to the prototype folder? → A: It stays as the design record, and its temporary web address stays until the integrated pages have been checked on a phone.

### Amended by feature 031 (2026-10-14)

- The logo icon is no longer hidden on a phone: it is shown at every width (031 FIX08).
- The header's Log In and Create Account to Vote buttons take the card Vote button's height and text size: 21 px high at three quarters of the text size on a phone, not 24 px, and 32 px with 16 px side padding from 641 to 900 px (031 FIX05).
- The tab sizing, the arrows, the all-tabs button and its menu and the Refresh row apply from 900 px down, not only below 640 px. The all-tabs button sits on the Refresh row, flush left, with three dots before its three lines, and the right arrow ends the tab bar; that row keeps its room on Live Results. The tab bar's edge fade stays on from 640 to 900 px and is off below 640 px (031 FIX02 to FIX04).
- A guest and a user without permission have no Create Poll link in the header at any width (031 FIX07).
Where the text below says otherwise, these notes win; the text is left as written for the record.

### Amended by feature 20261023-155959-PHONE-TAB-BAR (2026-10-23)

- The scroll arrows, the hold and the step are removed. Up to 900 px each tab is one line, a 16 px icon beside the label in a 48 px tab; the row shows a 32 px fade at an edge where tabs wait, scrolls with the browser's own touch scrolling (momentum, no snapping) and glides a chosen tab fully into view; a mouse or pen drags it and a mouse wheel over it scrolls it sideways.
- Refresh sits under the bar at the left and the All tabs button at the right, the opposite of the 031 note above.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read and vote on polls comfortably on a phone (Priority: P1)

A visitor opens the home page on a phone, about 384 pixels wide. They see a compact header, a tab bar and a single column of poll cards sized for the screen, so that a card's question, result bars, Vote button and counts fit without the page scrolling sideways, and more cards are on screen at once than today.

**Why this priority**: This is the point of the feature. Without the phone layout nothing else has value.

**Independent Test**: Open the home page at 384 pixels wide as a guest and as a member; check the first screen, then compare with the prototype.

**Acceptance Scenarios**:

1. **Given** a screen narrower than 640 pixels, **When** the home page opens, **Then** the poll cards are in one column with a 16-pixel gap between them, and the page never scrolls sideways.
2. **Given** a poll card on that screen, **When** it is shown, **Then** its text, icon buttons, Vote button, Live Results link and result bars are the compact sizes of the prototype, and the "N votes" line is the same size as the Vote button's text.
3. **Given** a screen 640 pixels wide or wider, **When** the home page opens, **Then** it looks and behaves exactly as it does today.
4. **Given** the phone layout, **When** a user votes, bookmarks, opens Live Results or maximizes a card, **Then** each works as it does today.

---

### User Story 2 - Reach every tab with a thumb (Priority: P1)

On a phone there are eight tabs and room for about three. The user moves along the tab bar with two arrows, by holding an arrow, by swiping or dragging the bar, or by opening an all-tabs menu from a menu button.

**Why this priority**: Without a good way to reach the other tabs, a phone user cannot use most of the page.

**Independent Test**: At 384 pixels wide, reach each of the eight tabs using only the arrows, then only the menu, then only swiping.

**Acceptance Scenarios**:

1. **Given** the tab bar at its start, **When** the page loads, **Then** both arrows are on screen, the left one is greyed out, and the tabs do not move when the greyed state changes at either end.
2. **Given** the right arrow is active, **When** the user taps it once, **Then** the bar scrolls smoothly over half a second so that the second tab that was not fully in view is fully in view against the edge (or the bar goes to its end if only one is left).
3. **Given** an arrow, **When** the user presses and holds it for more than 0.3 seconds, **Then** the bar scrolls steadily at 200 pixels a second until the user lets go or the end is reached, and then eases to the nearest tab edge.
4. **Given** the tab bar, **When** the user swipes it with a finger or drags it with a mouse, **Then** it follows the pointer, and a drag of more than 5 pixels never also selects the tab under the pointer.
5. **Given** the menu button, **When** the user taps it, **Then** a menu lists every tab with its icon, marks the current one, and shows the tabs a guest cannot use greyed; choosing an enabled tab selects it, brings it into view and closes the menu; choosing a greyed tab does what the tab bar does (takes a guest to sign-in).
6. **Given** the menu is open, **When** the user presses Escape or taps outside it, **Then** it closes, and keyboard focus returns to the menu button; arrow keys move through its items.
7. **Given** an arrow or the menu button, **When** the pointer hovers over it (on a device with a pointer), **Then** a slight round highlight shows behind it; **When** it is pressed or held, **Then** a stronger highlight shows; a greyed arrow shows neither.

---

### User Story 3 - Sign in or create an account from anywhere on the page (Priority: P2)

A guest on a phone sees "Log In" and "Create Account to Vote" as a pair of buttons floating over the cards. They stay on screen as the cards scroll and the guest can drag them out of the way.

**Why this priority**: A guest should always be able to sign in, but this is a convenience on top of working pages.

**Independent Test**: As a guest at 384 pixels wide, scroll the cards, drag the pair, rotate or resize the window, and sign out and in.

**Acceptance Scenarios**:

1. **Given** a guest on the home page on a phone, **When** the page opens, **Then** the two buttons float at the top right of the cards, flush with their right edge and 4 pixels under their top (below the Refresh button's row on tabs that have one), and the header holds no sign-in buttons.
2. **Given** the floating pair, **When** the cards scroll, **Then** the pair stays where it is on the screen.
3. **Given** the floating pair, **When** the guest presses on either button and moves more than 5 pixels, **Then** both buttons move together, always staying inside the part of the card area that is on screen; a press with less movement is an ordinary press.
4. **Given** a moved pair, **When** the window is resized so that the pair no longer fits fully inside the card area, **Then** it returns to its starting position; if it still fits it stays.
5. **Given** a signed-in user, the wide layout, or any page other than the home page, **When** the page is shown, **Then** no buttons float, and in the wide layout the guest buttons are in the header as today.
6. **Given** a site that offers only sign-in (no account creation), **When** a guest opens the page, **Then** a single floating button is shown and positioned correctly.
7. **Given** the header is rebuilt (the user signs out, or the session changes), **When** the user is a guest, **Then** the floating pair is placed again.

---

### User Story 4 - Search on a phone (Priority: P2)

With the header search box hidden on a phone, the user opens the Search tab and finds a search field at its top. They type terms and see the same results the header box gives today.

**Why this priority**: Search must remain possible on a phone, but it is secondary to reading and voting.

**Independent Test**: At 384 pixels wide, open the Search tab, search, clear the field, press "/", and follow a link that carries search terms.

**Acceptance Scenarios**:

1. **Given** the home page on a phone, **When** the user opens the Search tab, **Then** a "Search CrowdPoll" field with a clear button is at the top of the tab.
2. **Given** terms in the field, **When** the user submits them, **Then** the same results appear as from the header box, under the same rate limit, and the clear button empties the field and the results.
3. **Given** the Search tab field is on screen, **When** the user presses "/" outside a text field, **Then** the field is focused.
4. **Given** a link to the home page that carries search terms, **When** it is opened on a phone, **Then** the field is filled with them and the search runs.
5. **Given** any page other than the home page at phone width, **When** it is shown, **Then** it has no search box.

---

### User Story 5 - Start a new poll from the avatar menu (Priority: P2)

Administrators and users who may create polls have lost the header's Create Poll link on a phone, so the avatar menu offers it: a "Create Poll" item between Edit Profile and Poll Administration. Users who may not create polls see it dimmed.

**Why this priority**: It keeps a capability reachable that the compact header would otherwise remove.

**Independent Test**: Open the avatar menu at 384 pixels wide as an administrator, as a user with the creating permissions and as a plain member.

**Acceptance Scenarios**:

1. **Given** a signed-in user who may create polls, **When** the avatar menu opens on a phone, **Then** "Create Poll" is listed after Edit Profile and before Poll Administration, and takes the user to poll administration.
2. **Given** a signed-in user who may not create polls, **When** the menu opens, **Then** "Create Poll" is dimmed and focusable, does nothing when pressed, shows the reason "Needs permission to create polls" as a second line of text, and carries the hint "You need permission to create polls" for pointers; Poll Administration is absent for that user, as today.
3. **Given** the wide layout, **When** the menu opens, **Then** it has no "Create Poll" item, because the header link is there.

---

### User Story 6 - Refresh the current tab (Priority: P3)

The Refresh button returns on a phone as a round green button on its own row, just under the line beneath the tab bar and above the cards, at the right edge.

**Why this priority**: Manual refresh is useful but not essential on a phone.

**Independent Test**: At 384 pixels wide, press Refresh on a tab, then open Live Results.

**Acceptance Scenarios**:

1. **Given** any tab except Live Results, **When** the page is shown on a phone, **Then** the Refresh button is on its own row under the line, flush with the cards' right edge, with 10 pixels above and below it.
2. **Given** the Live Results tab, **When** it is shown, **Then** there is no Refresh button and no space reserved for it.
3. **Given** Refresh is waiting out its rate limit, **When** it is shown, **Then** it has the same disabled look as today.
4. **Given** the page scrolls, **When** the cards move, **Then** the Refresh button scrolls away with the page.

---

### User Story 7 - A compact header on every page (Priority: P3)

On a phone, all seven pages that have the site header show the same compact header: a smaller banner, the logo icon (hidden here until 031 FIX08 showed it), smaller sign-in buttons, and the search box, Create Poll link and user name hidden.

**Why this priority**: Consistency, but the pages work without it.

**Independent Test**: Open each of the seven pages at 360, 384, 414 and 639 pixels wide and check the checklist in the assumptions.

**Acceptance Scenarios**:

1. **Given** any of the seven pages on a phone, **When** it is shown, **Then** the banner is 24 pixels high, the logo icon, search box, Create Poll link and user name are hidden, header buttons are 24 pixels high, and 8 pixels separate the header from what follows.
2. **Given** any of the seven pages at 640 pixels wide or wider, **When** it is shown, **Then** it is unchanged.
3. **Given** a page's own cards or forms at phone width, **When** the compact header is applied, **Then** nothing is cut off, overlapped or pushed out of place.

---

### Edge Cases

- Fewer tabs fit than are hidden, only one tab remains on the side being scrolled, or the bar is already at the end the user presses towards: the bar moves as far as it can, and a greyed arrow does nothing.
- A user presses and holds an arrow when the bar is at the very end it scrolls away from (the first moment of a hold): scrolling starts normally.
- A drag begins on a tab: the tab is not selected by the drag.
- The page is rotated or resized across 640 pixels with the menu open, the pair moved, or the Search field focused: the layout switches cleanly and the pair returns to its starting position if it no longer fits.
- The viewport is very short, so the visible card area is smaller than the floating pair: the pair stays at the top of the area.
- A guest uses a greyed tab in the menu: they go to sign-in, as from the bar.
- A poll card is maximized on a phone: it keeps the sizing it has today (as in the prototype), and only the cards in the single column are made compact; a guest's floating buttons stay where they are, still inside the part of the page that shows the cards, and are held inside the maximized card's area (moved only if they no longer fit).
- A user with reduced-motion settings: scrolling, settling and highlights do not animate.
- A signed-in user's header, a guest's header and the sign-in-only site all show the right controls after each change of session.

## Requirements *(mandatory)*

### Functional Requirements

**Phone layout**

- **FR-001**: On a screen narrower than 640 pixels the home page MUST show poll cards in one column with a 16-pixel gap between them, and MUST NOT scroll sideways.
- **FR-002**: On that screen, poll cards MUST use the compact sizes of the prototype for text, icon buttons, the Vote button, the Live Results link and the result bars, and the "N votes" line MUST be the same size as the Vote button's text.
- **FR-003**: On a screen 640 pixels wide or wider every page MUST look and behave exactly as it does today.

**Header (all seven pages with the header)**

- **FR-004**: On a screen narrower than 640 pixels the header on all seven pages MUST show a 24-pixel-high banner and 24-pixel-high buttons (21 pixels since 031 FIX05), MUST hide the logo icon (no longer, since 031 FIX08), the search box, the Create Poll link and the user name, and MUST leave 8 pixels beneath it.

**Tab bar**

- **FR-005**: On a phone the tabs MUST be as wide as their labels, with 6 pixels of space each side and lettering tightened by 0.03 em, and 56 pixels high; the current tab keeps its underline.
- **FR-006**: Both scroll arrows MUST stay on screen at all times; an arrow MUST be greyed out and do nothing when its side holds no more tabs, and the tabs MUST NOT move when that state changes.
- **FR-007**: A tap on an arrow MUST scroll the bar over 0.5 seconds so that the second tab not fully in view on that side is fully in view against the edge, or to the end if only one is left.
- **FR-008**: Pressing and holding an arrow for more than 0.3 seconds MUST scroll the bar steadily at 200 pixels a second until release, the pointer leaving, or the end of the bar, and then move to the nearest tab edge over 0.2 seconds.
- **FR-009**: The tab bar MUST be draggable with a mouse and swipeable by touch; a drag of more than 5 pixels MUST NOT also select a tab.
- **FR-010**: A menu button MUST open a menu of all tabs with their icons, marking the current tab, with greyed tabs for guests; choosing an enabled tab MUST select it, bring it into view and close the menu; choosing a greyed tab MUST do what the tab bar does; the menu MUST close on Escape and on a tap outside it, MUST support the arrow keys, and MUST return focus to the menu button when it closes.
- **FR-011**: The arrows and the menu button MUST show a slight round highlight on hover (on devices with a pointer) and a stronger one while pressed or held; a greyed arrow MUST show neither; the menu button MUST keep the slight highlight while its menu is open.

**Refresh**

- **FR-012**: On a phone the Refresh button MUST be on its own row under the line beneath the tab bar, right-aligned with the cards and 10 pixels from the line and from the first card, and MUST be absent, with no space kept for it, on the Live Results tab; it MUST keep its current rate-limited behavior and look.

**Floating sign-in buttons**

- **FR-013**: For a guest on the home page on a phone, "Log In" and "Create Account to Vote" (only "Log In" when the site offers no account creation) MUST float over the cards, starting at the top right of the cards, 4 pixels under their top (below the Refresh row where there is one), MUST stay fixed on the screen while the cards scroll, MUST move together when dragged by more than 5 pixels, MUST always stay fully inside the part of the card area that is on screen, MUST return to the starting position when a resize leaves them outside the area, and MUST be placed again whenever the header is rebuilt; the position is kept only until the page is reloaded. No page other than the home page, no signed-in user and no wide layout MUST have floating buttons.

**Search**

- **FR-014**: On a phone the Search tab MUST have a "Search CrowdPoll" field with a clear button at the top of its panel that makes the same request as the header box under the same rate limit; "/" MUST focus it when it is on screen, and a link carrying search terms MUST fill it. On the other six pages no search box is shown at phone width.

**Create Poll**

- **FR-015**: On a phone the avatar menu MUST offer "Create Poll" after Edit Profile and before Poll Administration, linking to poll administration; for a user who may not create polls (an administrator, or a user with both the Create Poll and View Polls permissions, may) it MUST be dimmed, focusable and inert, MUST show the reason "Needs permission to create polls" as a visible second line, and MUST carry the hint "You need permission to create polls" for pointers.

**Quality and delivery**

- **FR-016**: The new controls MUST be reachable and operable by keyboard, MUST have accessible names, and MUST NOT animate for a user who has asked for reduced motion.
- **FR-017**: The existing automated tests MUST keep passing, and new automated tests MUST cover the scrolling rules, the hold and its first moment, the drag threshold, the greyed arrows, the menu, the floating pair's limits and reset, the Search tab field and the Create Poll item, and the project's existing checks of what each page loads MUST be brought up to date.
- **FR-018**: The change MUST NOT alter any server behavior, stored data, configuration or contract, MUST ship to every visitor on a narrow screen with no switch, and MUST leave the prototype folder in place.
- **FR-019**: Each of the seven pages MUST be checked by hand at 360, 384, 414 and 639 pixels wide: the header does not overflow, nothing is cut off or overlapped, the avatar menu opens and its items are reachable, and the page's own cards or forms keep their layout.

### Key Entities *(include if feature involves data)*

- **Tab bar position**: how far the tab bar is scrolled; decides which arrow is greyed. Not stored.
- **Floating pair position**: where the guest's buttons sit on the screen; kept only until the page reloads. Not stored.
- **Avatar menu item**: the "Create Poll" entry, enabled or dimmed by the user's permissions. No new data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At 384 pixels wide the home page never scrolls sideways, and the first screen of a guest's Trending tab shows the header, the tab bar and at least one whole poll card with the top of the next.
- **SC-002**: A phone user can reach any of the eight tabs, on a 384-pixel-wide screen, in at most three taps on an arrow, and in at most two taps using the menu.
- **SC-003**: Tapping an arrow never moves the tabs sideways except by the scrolling itself: the tabs' positions are the same before and after an arrow is greyed or restored.
- **SC-004**: At each of the four checked widths and on each of the seven pages, a manual check finds no overflow, no cut-off or overlapped content, and a working avatar menu.
- **SC-005**: At 640 pixels and wider, side-by-side comparison of the seven pages before and after finds no visible difference.
- **SC-006**: A guest on a phone can reach Log In from any scroll position without scrolling, and can move the buttons anywhere inside the visible card area but never outside it.
- **SC-007**: A phone user reaches the search field with one tap on the Search tab, and a search from it makes the same request under the same rate limit as the header box does today.
- **SC-008**: The whole automated test suite passes, and the new tests fail if any rule in FR-006 to FR-015 is reverted.

## Assumptions

- A phone is a screen narrower than 640 pixels, the same line the page already uses for its single column; the prototype was designed at about 384 pixels. In this spec "phone", "phone width", "single column" and "narrow screen" all mean narrower than 640 pixels.
- The prototype's numbers (sizes, 0.5 s, 0.3 s, 200 px/s, 0.2 s, 5 px, 16 px, 10 px, 6 px) are final; each stays a single named value so it can be tuned later.
- The prototype shows the page for a guest, a member and an administrator with sample polls; the real page's data and behavior are unchanged.
- The prototype's header icon is hidden on phones because that is what was approved; this is revisited when the icon is final.
- The sign-in-only site (no account creation) is rare on a phone; its single floating button must still work.
- Search on the other six pages at phone width is intentionally missing: those pages have no Search tab, and the user reaches search from the home page.
- "Create Poll" in the avatar menu is deliberately shown dimmed to users without permission, unlike Poll Administration, which stays absent for them; the difference is accepted.
- Wide screens, server behavior, stored data, configuration and contracts are out of scope.
- The prototype's session picker, width readout, sample polls and sample notices are not part of the product.
