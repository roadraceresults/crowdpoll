# Feature Specification: Fixed Viewport Width Trial

**Feature Branch**: `phone-uiux` (the trial branch of FR-012)

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "requirements/20261113-085157-fixed-viewport-width/requirements.md": instead of laying
each page out at the phone's own width, declare one fixed layout width of 480 px on narrow devices and let the browser
scale the page to fit, as a trial to see whether it improves the responsive design and the overall experience.

## User Scenarios & Testing *(mandatory)*

Today every CrowdPoll page is laid out at the width of the device showing it, so a 320 px phone, a 390 px phone and a
430 px phone each get a slightly different arrangement, and the narrowest ones are crowded: the tab bar overflows and
the header has to drop parts to fit. This feature tries the other common technique. On a device narrower than 480 px
the page is laid out as if the screen were 480 px wide and the browser shrinks the result to fit, so every phone shows
the same layout, only larger or smaller. Wider devices and desktop browsers keep today's behaviour. It is a trial: the
change lives on its feature branch, the developer compares it with the current site on a fixed list of screen widths,
and the branch is merged only if the result is preferred.

### User Story 1 - A phone visitor sees the same layout on every phone (Priority: P1)

A person opens CrowdPoll on a phone held upright. Whatever the phone's width, they see the same arrangement: the header
in its compact phone form, the tab bar, and one column of poll cards at their full designed width, scaled so the whole
480 px layout exactly fills the width of the screen. Nothing runs off the side, and they can pinch to zoom in on anything that is small.

**Why this priority**: It is the behaviour being tried; without it there is nothing to judge.

**Independent Test**: Open the home page at 320, 360, 390 and 430 px wide in portrait: each shows the identical layout
(one card column, compact header), differing only in size, with no sideways scrolling, and pinch-zoom works.

**Acceptance Scenarios**:

1. **Given** a phone 390 px wide in portrait, **When** the visitor opens the home page, **Then** the page is laid out
   480 px wide and shown scaled to the full width of the screen, with one poll card per row at its full 420 px width.
2. **Given** phones 320, 360, 390 and 430 px wide, **When** each opens the same page, **Then** the layout is the same on
   all four apart from its size.
3. **Given** any phone narrower than 480 px, **When** any page is opened, **Then** the page does not scroll sideways.
4. **Given** the scaled page, **When** the visitor pinches to zoom, **Then** the page zooms in and out freely; zoom is
   never disabled or limited.
5. **Given** the visitor moves between the home page, login, settings, profile, the admin pages and the legal pages on
   a narrow phone, **When** each page opens, **Then** each uses the same 480 px layout width, so the header and text
   keep the same size from page to page.

---

### User Story 2 - Wider devices and turned phones keep today's layout (Priority: P2)

A person on a tablet, or on a phone turned to landscape so that it is 480 px wide or wider, sees the site exactly as
today: laid out at the device's own width, never enlarged. When a phone is turned between portrait and landscape the
page follows: the fixed width in portrait, the device's width in landscape, and back again.

**Why this priority**: Applying the fixed width to wide screens would blow the layout up and take away the columns
those screens have today; the trial must not make them worse.

**Independent Test**: Open the home page on a 768 px tablet: it is identical to the current site. Turn a 390 px phone
to landscape (about 844 px): it shows the current site's landscape layout; turn it back and the 480 px layout returns.

**Acceptance Scenarios**:

1. **Given** a tablet 768 px wide, **When** any page is opened, **Then** it is laid out at 768 px, as on the current
   site, at its normal size.
2. **Given** a 390 px phone showing the fixed layout in portrait, **When** it is turned to landscape and the screen is
   480 px wide or wider, **Then** the page is laid out at the device's width, as on the current site.
3. **Given** that phone in landscape, **When** it is turned back to portrait, **Then** the page returns to the 480 px
   layout scaled to fit.
4. **Given** a device exactly 480 px wide, **When** a page is opened, **Then** it is laid out at the device's width,
   as today.
5. **Given** a desktop browser at any window size, **When** a page is opened, **Then** it behaves exactly as today.
6. **Given** a narrow phone whose browser does not run scripts, **When** a page is opened, **Then** it is laid out at
   the device's width, as today.

---

### User Story 3 - The developer judges the trial with a written checklist (Priority: P3)

The developer runs the current site and the feature branch side by side and works through a checklist at a fixed list
of screen sizes. The checklist says what to look at, what counts as a pass, and where to write down how small text and
controls became at each size. At the end the developer records one outcome: kept, kept with a different width, or
dropped.

**Why this priority**: The trial has value only if its result is decided on stated grounds; but the checklist needs the
behaviour of Stories 1 and 2 to exist first.

**Independent Test**: Follow the checklist from start to finish on the feature branch: every listed size and page has a
recorded result, the measured sizes are filled in, and one of the three outcomes is written down.

**Acceptance Scenarios**:

1. **Given** the feature branch, **When** the developer follows the checklist, **Then** it covers portrait widths of
   320, 360, 390 and 430 px, one phone in landscape and one 768 px tablet, each on the home page, a maximized poll
   card, the poll-creation wizard and a legal page.
2. **Given** the checklist, **When** it is run, **Then** it is run both in a browser's device emulation and on at least
   one real phone.
3. **Given** each checked size, **When** the developer measures, **Then** the checklist records the size at which text
   designed at 16 px and a control designed at 48 px appear on that screen.
4. **Given** all results, **When** the developer decides, **Then** the trial passes only if all four conditions hold:
   no page scrolls sideways; the layout is the same at the four phone widths apart from its size; every control can be
   tapped without zooming; and the developer prefers the result to the current site at the same width.
5. **Given** the decision, **When** the checklist is completed, **Then** the outcome (kept, kept with a different
   width, or dropped) is recorded in it.

---

### Edge Cases

- A phone exactly 480 px wide, or a device held just under 480 px: the rule is strict, "narrower than
  480 px" gets the fixed width, 480 px and wider does not.
- A folding phone opened or closed while a page is showing: the screen's width changed, so the rule is applied again,
  as for a turn.
- A page restored from the browser's back/forward history after the phone was turned on another page: it shows the
  layout that fits the orientation it is now in.
- A tablet showing the browser in a narrow split-screen pane: the screen itself is wide, so the page keeps the
  device-width layout, as today.
- A visitor who has zoomed in and then turns the phone: the rule is applied for the new orientation; zoom stays
  available afterwards.
- On a narrow phone the site's own phone layout (single card column, compact header) is shown as it is designed for a
  480 px screen; the styles written for screens under 480 px (tighter card padding, stacked admin fields) are not
  reached, because the page believes it is 480 px wide. This is the intended effect of the chosen width, not a defect.
- Text and controls are smaller than designed on every phone under 480 px (on a 360 px phone, 16 px text appears at
  12 px and a 48 px control at 36 px); this is accepted for the trial and judged by the checklist.
- The first moment of a page load on a narrow phone must not visibly show the device-width layout before switching to
  the fixed one.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On a mobile device whose screen, as currently held, is narrower than 480 px, every page MUST be laid out
  480 px wide and shown scaled so that those 480 px fill the screen's width.
- **FR-002**: On a device whose screen, as currently held, is 480 px wide or wider, every page MUST be laid out at the
  device's own width at normal size, exactly as on the current site.
- **FR-003**: The rule of FR-001 and FR-002 MUST be applied to all 13 of the site's pages (home, login, create account,
  confirm sign-in, accept terms, profile, settings, admin, admin results, invite, not authorized, privacy, terms), and
  identically on each.
- **FR-004**: The rule MUST be applied again whenever the width of the screen as held changes while a page is showing
  (the device is turned, or a folding device is opened or closed), without reloading the page.
- **FR-005**: Where the fixed width applies, the visitor's ability to zoom MUST NOT be disabled or limited in either
  direction, and the page MUST open fitted to the screen's width rather than zoomed in on part of it.
- **FR-006**: Where the fixed width applies, the page MUST NOT scroll sideways when first shown.
- **FR-007**: A browser that does not run scripts MUST show every page laid out at the device's width, as on the
  current site.
- **FR-008**: Desktop browsers MUST behave exactly as on the current site at every window size.
- **FR-009**: On a narrow phone, the fixed layout MUST be in place before the page is first drawn, so the visitor does
  not see the device-width layout flash first.
- **FR-010**: The automated check that every page carries the same viewport declaration MUST keep passing, and MUST
  cover whatever each page now needs for the rule (so no page can be left out unnoticed).
- **FR-011**: The feature MUST include a manual checklist (the feature's quickstart) that lists the sizes and pages of
  User Story 3, the four pass conditions, a place to record the measured size of 16 px text and a 48 px control at each
  size, and a place to record the outcome.
- **FR-012**: The feature MUST NOT add a setting or switch for the fixed width: it is on for narrow devices on the
  feature branch and absent on the current site; merging or not merging the branch is the only choice.
- **FR-013**: The feature MUST NOT change the site's existing layouts, breakpoints, style sheets or controls; only the
  width at which narrow devices lay the page out changes.
- **FR-014**: The feature MUST NOT make any request to a third party, set any cookie or use any browser storage.
- **FR-015**: Where the fixed width applies, the browser MUST NOT enlarge blocks of text on its own: every text is
  scaled by the same factor as the rest of the page. Where the fixed width does not apply, text sizing is as today.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At portrait widths of 320, 360, 390 and 430 px, the home page, a maximized poll card, the poll-creation
  wizard and a legal page each show the same layout at all four widths, differing only in size (16 of 16 checks).
- **SC-002**: None of those 16 checks, nor the landscape and tablet checks, shows sideways scrolling.
- **SC-003**: On a 768 px tablet and on a phone in landscape 480 px wide or wider, each checked page is
  indistinguishable from the current site at the same size.
- **SC-004**: Turning a phone from portrait to landscape and back returns the page to the fixed layout every time, in
  10 of 10 turns, without a reload.
- **SC-005**: On every checked phone size, every control on the checked pages can be tapped accurately without zooming.
- **SC-006**: The checklist is completed with a measured text size and control size for each of the six screen sizes
  and exactly one recorded outcome: kept, kept with a different width, or dropped.
- **SC-007**: With scripts turned off, and in a desktop browser, every page is unchanged from the current site.

## Assumptions

- The fixed width is 480 px. The trial began at 480 px, the width named in the technique the requirements quote, which
  put phones in the two-column layout with text at roughly 50 to 67 % of its designed size; it was reviewed on a phone
  and 480 px was tried next. At 480 px a phone shows the single-column phone layout with the card at its full width and
  text at roughly 67 to 90 % of its designed size.
- No minimum on-screen size for text or controls is a pass condition; the sizes are measured and recorded, and
  readability is judged through the checklist's conditions and the developer's preference.
- "Narrower than 480 px" is measured on the device's screen in the orientation it is held, not on the browser window;
  a narrow window on a wide screen keeps today's layout.
- Every width in this document is in CSS pixels, the unit the browser reports and lays pages out in, not the screen's
  physical pixels. A current phone is about 320 to 440 CSS pixels wide in portrait, whatever its physical resolution
  (typically 750 to 1440 physical pixels), so every phone in portrait is "narrower than 480 px" and gets the fixed
  layout; a tablet, an unfolded folding phone and most phones in landscape are 480 CSS pixels or wider and do not.
- Desktop browsers do not act on a page's declared layout width, so nothing needs to be done to keep them unchanged.
- The trial changes how the existing layout is scaled, not the layout: styles written for widths under 480 px remain in
  place and still apply to narrow desktop windows, and are simply not reached by narrow phones in portrait.
- Emails are not pages and are unaffected.
- The comparison is made by one developer by hand; scaling cannot be observed by the project's automated tests, which
  check that every page carries what the rule needs and which decision the rule takes for a given screen.
- If the outcome is "kept with a different width", choosing and applying that width is a follow-up change, not part of
  this feature.
