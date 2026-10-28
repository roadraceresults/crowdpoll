# Feature Specification: Fixed-Position Site Header

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "designDocs/032-high-level-requirements-FIXED-POSITION-HEADER.md"

**Source requirements**: `designDocs/032-high-level-requirements-FIXED-POSITION-HEADER.md` (the requirements document, with every finding of the architecture review folded in).
**Architecture**: `architecture/032-fixed-position-header/architecture.md` (15 findings, all resolved).
**Builds on**: feature 031 (Single Row Header) — the header's content and its one-row behaviour are unchanged; this feature only changes whether the header and Tab Bar scroll with the page.

## Clarifications

### Session 2026-10-14

- Q: Does "if it exists" mean the Tab Bar might need to be added to pages that don't already have one? → A: No. Each page keeps fixed only the top chrome it already has: the header is always fixed; the Tab Bar, and the row the Hamburger Menu and Refresh icon form beneath it on narrower windows, are fixed only on the one page that has them.
- Q: What happens to page content now that the header and Tab Bar no longer sit in the normal page flow? → A: The page reserves exactly as much space as the fixed chrome is currently taking up, and that reserved space adjusts automatically whenever the chrome's own height changes (window resize, sign-in/sign-out, or the narrower-width Hamburger/Refresh row appearing).
- Q: Can page content be seen through the fixed header or Tab Bar while it scrolls underneath? → A: No. Both have an opaque background.
- Q: Can a maximized poll's results view, or the guest's floating "Log In"/"Create Account To Vote" buttons, end up positioned underneath the fixed header? → A: No. Both account for the fixed chrome's height and never land underneath it.
- Q: Is the Back to Top button's 16–24 pixel margin measured from the page's centred content column, or from the screen itself? → A: From the viewport's physical edges, regardless of how wide or narrow the page content column is.
- Q: Exactly how far must a user scroll before the Back to Top button appears, and how far back up before it disappears? → A: It appears once the user has scrolled 600 pixels down, and disappears once they've scrolled back up to within 400 pixels of the top — two different points, not one, so it doesn't flicker on and off right at a single boundary.
- Q: Is the Back to Top button's icon a web-font glyph? → A: No. It is an upward-arrow icon drawn the same way every other icon in the product already is.
- Q: Does the Back to Top button appear on every page, or only the ones with long enough lists to need it? → A: Every one of the seven pages that has the header, so the behaviour is consistent and a page that's short today but grows later isn't silently missing it.
- Q: Does the fixed header span the full width of the screen? → A: No. It keeps the same centred content column and side margins the rest of the page already uses; the only thing that's new is that it no longer scrolls away.
- Q: On the very first paint of a page, before the fixed chrome's height has been measured even once, must the layout be stable with zero visible jump, or is a brief one-time shift acceptable? → A: A brief, barely perceptible one-time shift on load is acceptable — it happens once, before the user has had time to start reading or interacting, and matches how the existing single-row header (feature 031) already behaves.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The header and Tab Bar stay put while scrolling the home page (Priority: P1)

A visitor opens the home page, with its row of tabs under the header, and scrolls down through a long list of polls. The header and the Tab Bar beneath it stay visible at the top of the window the entire time; only the poll cards scroll underneath them.

**Why this priority**: This is the whole feature on the one page where it matters most — the home page's tab list is the longest-scrolling content in the product, and losing the header/tabs while scrolling is the exact problem being fixed.

**Independent Test**: Open the home page, scroll a tab's list down and back up repeatedly; the header and Tab Bar never move or disappear, and no poll card is ever drawn on top of them or hidden beneath them.

**Acceptance Scenarios**:

1. **Given** the home page with a tab's list taller than the window, **When** the user scrolls down, **Then** the header and the Tab Bar remain visible at the top of the window and the poll cards scroll underneath them.
2. **Given** a narrow window where the "All tabs" button and the Refresh icon form their own row beneath the tab strip, **When** the user scrolls, **Then** that row stays fixed in place along with the rest of the Tab Bar.
3. **Given** the user has scrolled down, **When** they look at the very first poll card, **Then** it is fully visible below the header and Tab Bar — never partly hidden underneath them.

---

### User Story 2 - The header stays put on every other page (Priority: P1)

A user opens any of the six pages that have the header but no Tab Bar (Poll Administration, Admin Results, Profile, Log In, Create Account, Not Authorized) and scrolls down through its content. The header stays visible at the top the whole time.

**Why this priority**: The same promise must hold everywhere the header appears, not just the home page; it's equally core to the feature.

**Independent Test**: Open the Poll Administration page with enough polls listed to scroll, and scroll down and back up; the header never moves, and the page's own content (the poll list) is never hidden beneath it.

**Acceptance Scenarios**:

1. **Given** any of the six pages without a Tab Bar, **When** the user scrolls its content, **Then** the header remains visible at the top of the window.
2. **Given** one of those pages with content shorter than the window, **When** the page loads, **Then** nothing changes visually from how the page looks today, other than the header no longer being able to scroll away.

---

### User Story 3 - A user jumps back to the top after a long scroll (Priority: P2)

A user has scrolled a long way down a page (a long poll list, a long admin list) and wants to get back to the top without manually scrolling or pressing a keyboard shortcut. A "Back to Top" button appears near the bottom-right corner; clicking it smoothly returns the page to the very top, and the button then disappears.

**Why this priority**: It is a genuinely useful convenience once the header is reachable only at the very top of the page, but the page is still fully usable without it (the user could still scroll up manually).

**Independent Test**: On any page, scroll down past the appearance point; click the Back to Top button; the page smoothly returns to the top and the button disappears once it's reached.

**Acceptance Scenarios**:

1. **Given** a page the user has scrolled down 600 pixels or more, **When** the page is shown, **Then** the Back to Top button appears near the bottom-right corner.
2. **Given** the Back to Top button is visible, **When** the user clicks it (or activates it with the keyboard), **Then** the page scrolls smoothly back to the very top.
3. **Given** the page has scrolled back to the top, **When** the scroll finishes, **Then** the Back to Top button is no longer visible.
4. **Given** the user hovers over or focuses the button, **When** it is shown, **Then** a tooltip reads "Back to top", and it carries the same accessible label for assistive technology.

---

### User Story 4 - The button stays out of the way until it's needed (Priority: P3)

A user who hasn't scrolled far, or who has scrolled back up near the top, never sees the Back to Top button at all — it doesn't clutter the screen, flicker in and out while scrolling near one boundary, or block any other control.

**Why this priority**: It's a polish concern once the button exists and works (User Story 3); the feature is still useful without this refinement, but a flickering or intrusive button would make it feel broken.

**Independent Test**: Scroll slowly up and down around the 500-pixel mark (between the button's appear and disappear points); the button does not flicker on and off.

**Acceptance Scenarios**:

1. **Given** the user has scrolled down less than 600 pixels, **When** the page is shown, **Then** the Back to Top button is not visible.
2. **Given** the button is visible and the user scrolls up, **When** they pass back within 400 pixels of the top, **Then** the button disappears.
3. **Given** the user's scroll position hovers between 400 and 600 pixels, **When** they scroll slightly up and down, **Then** the button's visibility does not flicker (it only changes state at the 600-pixel and 400-pixel points, not in between).

### Edge Cases

- A window short enough, or a page zoomed in enough, that the fixed header and Tab Bar together take up a large share of the visible height: the reserved space still accounts for their full height, so content is never hidden beneath them, even if little room is left to view it.
- The guest's floating "Log In" / "Create Account To Vote" buttons, shown on narrow windows: dragging them near the top of the screen never lets them end up positioned underneath the fixed header. On a phone the pair starts in the Hamburger/Refresh row, just left of Refresh (just right of it since feature 20261023-155959-PHONE-TAB-BAR's TWEAKS04, which has Refresh at the left), covering no card or icon, and the cards start below that row (FIX19).
- Maximizing a poll's results view: the maximized view's top always lands just below the fixed header and Tab Bar, never behind them.
- A user who prefers reduced motion: the Back to Top button still works, but the scroll to the top happens instantly rather than animated, and the button's own appearance/disappearance has no motion effect either.
- The cookie consent banner is showing at the bottom of the screen: the Back to Top button does not overlap it.
- A page short enough that it never scrolls at all (e.g., Log In on a tall window): the Back to Top button simply never appears there, with no other effect.
- Signing in or out while scrolled down (the header's own content changes height per feature 031): the reserved space at the top of the page adjusts immediately so content is never hidden or left with an uneven gap.
- A window narrower than 640 pixels, where the Hamburger Menu and Refresh icon form their own row beneath the tab strip: that row stays fixed along with the rest of the Tab Bar, not just the tab strip above it.
- The very first paint of a page, before the reserved space has been measured even once: a brief, barely perceptible one-time shift in where the page content starts is acceptable; it never recurs again for the rest of that page view.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On every page, the site header MUST remain visible, fixed at the top of the viewport, at every window width, regardless of how far the page is scrolled.
- **FR-002**: On the one page that has a Tab Bar, it MUST remain fixed directly beneath the header, at every window width, regardless of scrolling.
- **FR-003**: On narrower windows, where the "All tabs" button and the Refresh icon form their own row beneath the tab strip, that row MUST remain fixed along with the rest of the Tab Bar. Pages without a Tab Bar have nothing further to pin.
- **FR-004**: The space the fixed header (and, where present, the Tab Bar) occupies MUST be reserved at the top of the page's own content, so that content is never drawn underneath, or hidden behind, the fixed header or Tab Bar.
- **FR-005**: The reserved space MUST adjust automatically whenever the fixed header's or Tab Bar's own height changes — including a window resize, signing in or out, or the narrower-width Hamburger/Refresh row appearing or disappearing.
- **FR-006**: The fixed header and Tab Bar MUST have an opaque background, so that page content scrolling beneath them is never visible through them.
- **FR-007**: Maximizing a poll's results view MUST position it just below the fixed header (and Tab Bar), never underneath or hidden by it.
- **FR-008**: The guest "Log In" / "Create Account To Vote" floating buttons MUST never be positioned, or able to be moved, underneath the fixed header.
- **FR-009**: The fixed header and Tab Bar MUST keep the same horizontal width and side margins as the rest of the page's content (the same centred column); they MUST NOT span the full width of the screen.
- **FR-010**: A "Back to Top" button MUST appear, on every one of the seven pages, once the user has scrolled 600 pixels down from the top of the page.
- **FR-011**: The Back to Top button MUST disappear once the user has scrolled back up to within 400 pixels of the top — a different point from where it appeared, so it does not flicker on and off at one boundary.
- **FR-012**: Activating the Back to Top button (by click, tap, or keyboard) MUST smoothly scroll the page back to the very top.
- **FR-013**: A user who has indicated a preference for reduced motion MUST have the scroll-to-top happen instantly instead of animated, and the button's own appearance and disappearance MUST likewise have no motion effect for that user.
- **FR-014**: The Back to Top button MUST be positioned fixed near the bottom-right corner of the viewport, 16–24 pixels from the viewport's physical edges — independent of the width of the page's own content column.
- **FR-015**: The Back to Top button MUST show the tooltip text "Back to top" and carry the accessible label "Back to top" for assistive technology.
- **FR-016**: The Back to Top button's icon MUST be a clear upward-pointing arrow.
- **FR-017**: The Back to Top button MUST be reachable and operable by keyboard alone, with a visible focus indicator, like every other interactive control in the product.
- **FR-018**: Nothing in this feature MUST change the server, its routes, its configuration, or stored data, and no new dependency MUST be added.

### Key Entities *(include if feature involves data)*

None. The only state this feature introduces (whether the Back to Top button is currently shown, and how much space is reserved for the fixed chrome) lives in the page only, is recomputed continuously as the user scrolls or resizes the window, and is never stored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On all seven pages, at every window width checked (375, 640, 1024 and 1400 pixels), the header is visible at the top of the window at every scroll position from the very top of the page to the very bottom.
- **SC-002**: On the home page, at the same widths, the Tab Bar — including the Hamburger/Refresh row on narrower windows — is visible directly beneath the header at every scroll position.
- **SC-003**: At every width and scroll position checked, the first visible piece of page content is always fully below the header (and Tab Bar), with zero pixels of overlap.
- **SC-004**: From any scroll position 600 pixels or more from the top, a user can return to the very top of the page in a single click or tap, with the scroll beginning within the same interaction (no perceptible delay).
- **SC-005**: The Back to Top button is never visible within 400 pixels of the top of any page, and never visible at all on a page whose content is too short to scroll past 600 pixels.
- **SC-006**: Across 10 consecutive up-and-down scroll passes through the 400–600 pixel range, the Back to Top button's visibility changes state no more than twice (an appearance and a disappearance), never flickering in between.
- **SC-007**: Maximizing a poll's results view, and dragging the guest sign-in buttons on a phone-width window, never leaves either one positioned under the fixed header, checked across all seven pages where each applies.
- **SC-008**: At every width checked, the header and Tab Bar's on-screen horizontal footprint is pixel-identical to today's — the only behavioural change is that they no longer move while the page scrolls.
- **SC-009**: On every page load, any one-time shift in where the page content starts (before the reserved space is first measured) settles near-instantly — under 100 milliseconds — and does not recur again for the rest of that page view.

## Assumptions

- The 600-pixel show / 400-pixel hide thresholds are a concrete default within the requirement's suggested 500–800 pixel range; they are expected to be easy to retune later without changing the feature's behaviour contract.
- The Back to Top button is injected identically on all seven pages, even though some (Profile, Log In, Create Account, Not Authorized) rarely have content long enough to show it; this keeps the behaviour consistent if one of those pages grows.
- The fixed header and Tab Bar keep today's centred content column and side margins rather than spanning edge-to-edge; the only behavioural change from today is that they no longer scroll away.
- The header's own content and its single-row behaviour (feature 031) are unchanged; this feature only changes whether the header and Tab Bar move with the page as it scrolls.
- No server, route, configuration, or data change; no new dependency. Amended by FIX07: a poll title is now at most 50 characters and a subtitle at most 30, down from 100 each. The server enforces both, the Admin Poll Card Wizard caps both fields, and migration `007-title-lengths` cuts existing longer values once, counting UTF-16 units as the server does.
