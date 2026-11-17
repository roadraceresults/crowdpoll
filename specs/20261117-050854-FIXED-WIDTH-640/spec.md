# Feature Specification: Fixed Width 640

**Feature Branch**: `481-640px`

**Created**: 2026-11-17

**Status**: Draft

**Input**: User description: "requirements/20261117-050854-fixed-width-640/requirements.md": give devices between
481 and 640 px wide the phone layout, laid out at a fixed width of 640 px and scaled to fit, by the same technique that
gives narrower phones a fixed 480 px, on every page.

## User Scenarios & Testing *(mandatory)*

CrowdPoll has three layouts today. A phone narrower than 480 px is laid out as if it were 480 px wide and scaled to
fit, and shows the redesigned phone layout: larger text, 48 px controls, compact poll cards that list the leading
choices, and a one-column maximized view. A screen 640 px or wider shows the wide layout. In between, a device 481 to
639 px wide (a small tablet held upright, a folding phone, a small phone turned sideways) still shows an older
single-column layout that the phone redesign left behind: smaller text and targets, a narrow 420 px card in the middle
of the screen, and different card behaviour.

This feature retires that middle layout. A device 481 to 639 px wide is laid out as if it were 640 px wide and scaled
to fit, and shows the phone layout, the same one narrower phones see, filling the wider frame. Nothing is designed
anew: the layout, the components, the controls and the sizes are those of the phone layout. Phones narrower than
480 px and screens wider than 640 px see no change.

### User Story 1 - A visitor on a mid-width device gets the phone layout (Priority: P1)

A person opens CrowdPoll on a small tablet held upright, 600 px wide. They see the phone layout: the compact header,
the scrolling tab bar under it, and one column of compact poll cards, each filling the width of the screen between
16 px gutters. The text and the controls are the phone layout's sizes. A card shows its leading choices; pressing
Vote on a card with hidden choices opens the maximized view on its voting side, and Back closes it. Whatever the
device's width between 481 and 639 px, the arrangement is the same, only larger or smaller, and nothing runs off the
side.

**Why this priority**: It is the feature. The mid-width band is the only one still on the older layout, and the home
page with its poll cards is what nearly every visitor uses.

**Independent Test**: Open the home page at 481, 540, 600 and 639 px wide in portrait: each shows the identical phone
layout, differing only in size, with cards 608 px wide in a 640 px page, no sideways scrolling, and the phone layout's
card behaviour.

**Acceptance Scenarios**:

1. **Given** a device 600 px wide in portrait, **When** the visitor opens the home page, **Then** the page is laid out
   640 px wide and shown scaled to the full width of the screen, in the phone layout.
2. **Given** devices 481, 540, 600 and 639 px wide, **When** each opens the same page, **Then** the layout is the same
   on all four apart from its size.
3. **Given** the 640 px page, **When** the home page is shown, **Then** each poll card is 608 px wide, between 16 px
   gutters, and no card is held to a narrower column.
4. **Given** the 640 px page, **When** any text is shown, **Then** it uses the phone layout's sizes and none is smaller
   than 15 layout px; controls are 48 px with a 64 px target, and rows are 64 px.
5. **Given** a poll with more choices than the compact card shows, **When** the card is drawn in the 640 px page,
   **Then** it shows the same leading choices as in the 480 px page (four leaders, all if five or fewer), and the
   maximized view the same as there (ten, all if twelve or fewer, with the same share threshold).
6. **Given** a compact card with hidden choices, **When** the visitor presses Vote, **Then** the maximized view opens
   on its voting side, listing every choice, and Back returns to the card.
7. **Given** a poll with notes, **When** its compact card is drawn, **Then** the notes show one line, and in full in
   the maximized view.
8. **Given** the page is scrolled, **When** the visitor scrolls down, **Then** the header and the tab bar stay fixed
   at the top.
9. **Given** the scaled page, **When** the visitor pinches to zoom, **Then** the page zooms freely.
10. **Given** an iPhone or iPad in the 481 to 639 px band, **When** the visitor focuses a text field, **Then** the
    page does not zoom by itself.

---

### User Story 2 - Phones and wide screens are unchanged, and turning a device follows (Priority: P1)

A person on a phone narrower than 480 px sees exactly what they see today: the phone layout in a 480 px page. A person
on a screen wider than 640 px sees today's wide layout at the device's own width. When a device is turned, the page
follows the width it is now held at: a 390 px phone turned sideways to 844 px gets the wide layout, a 320 px phone
turned sideways to 568 px gets the 640 px page, and each returns to the 480 px page when turned back.

**Why this priority**: The 480 px phone layout was tuned device by device and is explicitly not to change; a
regression there or on desktop would cost more than the feature gains.

**Independent Test**: Compare the site before and after at 320, 360, 390, 430 and 479 px in portrait and at 768 and
1280 px: each pair is identical. Turn a 320 × 568 phone to landscape and back: 480 px page, 640 px page, 480 px page.

**Acceptance Scenarios**:

1. **Given** a phone narrower than 480 px in portrait, **When** any page is opened, **Then** it is laid out 480 px
   wide and looks exactly as before the feature.
2. **Given** a device held exactly 480 px wide, **When** any page is opened, **Then** it is laid out at the device's
   own width in the phone layout, as before the feature.
3. **Given** a screen wider than 640 px, **When** any page is opened, **Then** it is laid out at the device's own
   width in the wide layout, exactly as before the feature.
4. **Given** a 320 × 568 phone showing the 480 px page, **When** it is turned to landscape, **Then** the page becomes
   the 640 px page; **When** it is turned back, **Then** the 480 px page returns.
5. **Given** a 390 × 844 phone showing the 480 px page, **When** it is turned to landscape, **Then** the page is laid
   out at 844 px in the wide layout; **When** it is turned back, **Then** the 480 px page returns.
6. **Given** a page restored from the browser's back-forward cache or a resized screen, **When** it is shown again,
   **Then** it has the layout width that fits the width the device is held at then.

---

### User Story 3 - Every other page uses the same frame (Priority: P2)

On a mid-width device the visitor moves from the home page to the privacy and terms pages, to login, profile and
settings, and a poll owner opens Poll Administration: the admin page with its search results, an admin card, and the
wizard that creates or edits a poll. Every one of these is the phone layout in the same 640 px page, with the same
header and text sizes from page to page, its content filling the frame between 16 px gutters.

**Why this priority**: A page left on the older layout would change size and style as the visitor moves between
pages. These pages are used less than the home page, so they follow it.

**Independent Test**: At 600 px wide, open each page in turn (privacy, terms, login, create account, confirm sign-in,
accept terms, not authorized, invite, profile, settings, the admin page, an admin card, the wizard): each is laid out
640 px wide in the phone layout, with no sideways scrolling and the same header.

**Acceptance Scenarios**:

1. **Given** a mid-width device, **When** the visitor opens a legal page, **Then** its text fills the 640 px page
   between 16 px gutters in the phone layout's text sizes.
2. **Given** a mid-width device, **When** a poll owner opens the admin page, **Then** the search form, the result rows
   and an opened admin card are the phone layout's, 608 px wide.
3. **Given** a mid-width device, **When** a poll owner runs the wizard, **Then** it shows the phone layout's wizard
   (its summary, its footers and its steps) as on a narrower phone.
4. **Given** a mid-width device, **When** the visitor moves between any two pages, **Then** the header, the text sizes
   and the gutters are the same on both.
5. **Given** either color scheme, **When** any page is shown in the 640 px page, **Then** it uses that scheme's
   existing colors.

---

### User Story 4 - A narrow desktop window gets the phone layout (Priority: P3)

A person on a desktop computer narrows the browser window to between 481 and 640 px. A desktop browser cannot be given
a fixed layout width, so the page is laid out at the window's own width, and it shows the phone layout fitted to that
width, without sideways scrolling. Widening the window past 640 px brings back the wide layout.

**Why this priority**: Few visitors use such a window, but it must not be left on a layout that no longer exists, and
it is how the developer checks the layout without a device.

**Independent Test**: On a desktop browser, drag the window's width from 700 px down to 481 px: above 640 px the wide
layout shows; at 640 px and below, the phone layout, fitted to the window, with no sideways scrollbar.

**Acceptance Scenarios**:

1. **Given** a desktop window 560 px wide, **When** any page is opened, **Then** it shows the phone layout fitted to
   560 px, with no sideways scrolling.
2. **Given** a desktop window exactly 640 px wide, **When** any page is opened, **Then** it shows the phone layout.
3. **Given** a desktop window 641 px wide or wider, **When** any page is opened, **Then** it shows the wide layout, as
   before the feature.
4. **Given** a desktop window narrower than 480 px, **When** any page is opened, **Then** it behaves as before the
   feature.

---

### Edge Cases

- **Exactly 640 px.** A viewport exactly 640 px wide (a page fixed at 640 px, or a device or window of that width)
  shows the phone layout. Before the feature, a device or window exactly 640 px wide showed the wide layout; this is
  the one change at 640 px and wider.
- **Exactly 480 px.** A device held exactly 480 px wide keeps its own width and the phone layout, as today; it is not
  given the 640 px page.
- **Turning between the two fixed widths.** A phone whose short side is under 480 px and whose long side is between
  481 and 639 px moves between the 480 px page and the 640 px page as it is turned, with no reload and without
  losing what the visitor was doing (an open maximized view, a wizard in progress).
- **A phone turned sideways to 640 px or more** (most current phones) keeps the wide layout at its own width, as today.
- **A maximized view open while the device is turned** stays open and is drawn in the layout of the new width.
- **The older single-column layout** is no longer shown at any width; nothing of it remains visible to any visitor.
- **A device that does not report its orientation** is treated as upright unless it reports a sideways rotation, as
  today.
- **Text size settings of the browser or device** do not inflate text in the fixed-width page beyond its designed
  size, as in the 480 px page.

## Requirements *(mandatory)*

### Functional Requirements

**The layout width**

- **FR-001**: On a device held between 481 and 639 px wide, every page MUST be laid out 640 px wide and scaled by the
  browser to the width of the screen.
- **FR-002**: On a device held narrower than 480 px, every page MUST be laid out 480 px wide, exactly as before the
  feature.
- **FR-003**: On a device held exactly 480 px wide, or 640 px and wider, every page MUST be laid out at the device's
  own width.
- **FR-004**: The width a device is held at MUST be its screen's shorter side when upright and its longer side when
  turned sideways, as in the existing fixed-width technique.
- **FR-005**: The layout width MUST be decided again when the device is turned, the screen is resized, or the page is
  shown again from the browser's history, and applied without reloading the page.
- **FR-006**: While a page is laid out at a fixed width (480 or 640 px), the browser's automatic text enlargement
  MUST be held off, and on iOS a focused text field MUST NOT zoom the page; this protection MUST be computed from the
  fixed width in force.
- **FR-007**: Pinch zoom MUST remain available at both fixed widths.

**The layout**

- **FR-008**: The phone layout MUST apply to every viewport up to and including 640 px wide; the wide layout MUST
  apply only above 640 px.
- **FR-009**: The phone layout in the 640 px page MUST be the same layout as in the 480 px page: the same
  arrangement, components and controls, with no element designed for 640 px alone.
- **FR-010**: Sizes MUST be the same in both pages: the phone layout's raised text sizes (smallest text 15 layout
  px), 48 px controls with a 64 px touch target, and 64 px rows.
- **FR-011**: In the 640 px page, content MUST fill the frame between 16 px gutters: poll cards, legal text, the
  admin search list, the admin card and the wizard are 608 px wide.
- **FR-012**: The feature MUST apply to every page of the site: the home page and its poll cards (compact and
  maximized), the legal pages, the sign-in and account pages, and Poll Administration (the admin page, the admin card
  and the wizard).
- **FR-013**: The header and the tab bar MUST stay fixed at the top while the page scrolls; the home page keeps its
  scrolling tab bar at the top, and no bottom navigation is introduced.
- **FR-014**: Both color schemes MUST keep their palettes; no new color is introduced.
- **FR-015**: A desktop browser window between 481 and 640 px wide MUST show the phone layout fitted to the window's
  own width, without sideways scrolling.

**Behaviour**

- **FR-016**: Every behaviour the phone layout has in the 480 px page MUST apply up to 640 px: the leading choices on
  the compact card and in the maximized view with the same limits, the combined share of hidden choices on
  single-choice polls, Vote opening the maximized view on its voting side when choices are hidden, notes shown in one
  line on the card and in full when maximized, and the wizard's phone arrangement.
- **FR-017**: Bars MUST stay ordered by share, largest first, on both faces of a card.
- **FR-018**: Back MUST behave as it does today at every width.

**Removal**

- **FR-019**: The older single-column layout for 481 to 639 px MUST be removed: no viewport shows it, the behaviour
  that depended on it alone no longer exists, and each of its rules that the phone layout overrides is deleted. The
  rules of it that the phone layout itself depends on remain, as part of the phone layout.
- **FR-020**: Every width boundary that today sits just under 640 px MUST move so that 640 px itself is on the phone
  side, consistently across every page.

**Unchanged**

- **FR-021**: A device held narrower than 480 px and a viewport wider than 640 px MUST render exactly as before the
  feature.
- **FR-022**: The feature MUST NOT add or change any server behaviour, stored data, cookie, browser storage key or
  setting.
- **FR-023**: The project's documents that describe the layout boundaries and the fixed-width rule MUST be brought up
  to date with the two fixed widths and the single phone layout.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At held widths of 481, 540, 600 and 639 px in portrait and 568 px in landscape, 100% of the site's
  pages show the phone layout in a 640 px page with no sideways scrolling.
- **SC-002**: On those devices, no text on any page is smaller than 15 layout px, and every control a visitor can
  press has a target of at least 48 px.
- **SC-003**: Side-by-side comparison before and after the feature at 320, 360, 390, 430 and 479 px in portrait and
  at 768 and 1280 px shows no visible difference on any page.
- **SC-004**: Turning a device between a 480 px page, a 640 px page and its own width shows the right layout each
  time within one second, with no reload and no lost state.
- **SC-005**: A visitor on a mid-width device can open a poll with more than five choices, vote on any of its
  choices, and return to the list using only the compact card, the maximized view and Back, as on a phone.
- **SC-006**: On an iPhone or iPad in the 481 to 639 px band, focusing each text field of the site (search, login,
  profile, the wizard) never zooms the page.
- **SC-007**: After the feature, the site has two layouts (phone and wide) instead of three, and no page at any
  width shows the older single-column layout.
- **SC-008**: The project's automated checks all pass, with the fixed-width rule's table of screens extended by the
  481 to 639 px rows.

## Assumptions

- The phone layout of the 480 px redesign (`specs/20261113-140600-PHONE-LAYOUT-REDESIGN`) and the fixed-width
  technique (`specs/20261113-085157-FIXED-VIEWPORT-WIDTH`) are in place and are the basis of this feature; where this
  specification says "as today" it refers to them.
- Material 3 stays the design language; its components, shapes and state layers are reused, and no new component is
  invented.
- The limits on leading choices are those in force for the 480 px page, including the share threshold currently on
  trial; if that trial changes them, both pages change together.
- A page laid out at 640 px is drawn at between 75% (a 481 px device) and 100% (a 639 px device) of its designed
  size, much as the 480 px page is drawn at 67% to 100%; this range is accepted, including text being slightly larger
  on a 600 px tablet than on a phone.
- A desktop window narrower than 480 px keeps today's behaviour, including its 480 px minimum page width.
- Devices in the 481 to 639 px band are a small share of visitors (small tablets, folding phones, small phones turned
  sideways); checking by emulation at the listed widths, with at least one real device where available, is sufficient.
- Changing a viewport of exactly 640 px from the wide layout to the phone layout is accepted as a consequence of the
  640 px page.
- Earlier decisions recorded for the phone redesign that kept the phone layout to 480 px and left 481 to 639 px
  untouched are superseded by this feature.
