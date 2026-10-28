# Feature Specification: Tab Bar

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-09-20

**Status**: Draft

**Input**: User description: "using designDocs/018-high-level-requirements-TAB-BAR.md"

**Source requirements**: `designDocs/018-high-level-requirements-TAB-BAR.md` (63 lines) with two
mockups, `designDocs/dontTrack/tab_bar.jpg` and `designDocs/dontTrack/trendingupicon.jpg`
**Architecture**: `architecture/018-tab-bar/architecture.md` — 13 findings raised and resolved

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recognise every tab at a glance (Priority: P1)

A visitor to the home page sees a row of six tabs, each with a small picture before its name:
a rising arrow for Trending, a circled exclamation mark for Newest, the default profile
silhouette for My Private Polls, an outlined star for Favorites, three gently bouncing bars for
Live Results, and a magnifying glass for Search. The pictures are the same ones the visitor
already meets elsewhere on the site — the star from a poll card's "Add to Favorites" control, the
bouncing bars from a card's "Live Results" link, the silhouette from the header, the magnifying
glass from the header's search box — so the bar reads as one system rather than six labels.

Under the row, a thin grey rule runs from the left edge of the window to the right edge, even
though the tabs and everything else on the page sit in a centred column of limited width. The
tab that is currently open is highlighted inside a rounded rectangle exactly as it is today.

**Why this priority**: It is the whole reason for the feature — the tab bar is the first thing a
visitor uses on the home page, and the icons and the rule are what make it look finished.

**Independent Test**: Open the home page as a guest. Six tabs are visible in the stated order,
each with an icon before its label; the rule spans the full window width; the Trending tab is
highlighted as before. Sign in: the same six tabs, the personal ones now enabled. Widen and
narrow the window: the rule always reaches both edges.

**Acceptance Scenarios**:

1. **Given** the home page is open, **When** the visitor looks at the tab bar, **Then** the tabs
   read, left to right, "Trending", "Newest", "My Private Polls", "Favorites", "Live Results",
   "Search", each in Title Case, each with an icon immediately to the left of its label.
2. **Given** the home page is open at any window width wider than the centred content column,
   **When** the visitor looks under the tab row, **Then** a one-pixel grey rule runs from the left
   edge of the window to the right edge, while the tabs themselves stay within the centred column.
3. **Given** the Trending tab is open, **When** the visitor looks at it, **Then** it is shown
   inside the same rounded highlight as today, with the icon coloured like the highlighted label,
   and the highlight sits above the rule, not on it.
4. **Given** any tab, **When** the visitor compares its icon with the site element it copies
   (Favorites ↔ the card's star, Live Results ↔ the card's bars, My Private Polls ↔ the header's
   default avatar, Search ↔ the header's magnifying glass), **Then** the shapes are identical
   apart from size.
5. **Given** a signed-in visitor, **When** they watch the Live Results icon on any tab, **Then**
   the three bars bounce continuously — and so do the bars on every poll card's "Live Results"
   link; **and given** the visitor's system asks for reduced motion, **Then** the bars are still.
6. **Given** a guest, **When** they look at My Private Polls, Favorites and Live Results,
   **Then** those tabs are dimmed and unavailable as today, icons dimmed with them, and the Live
   Results bars are still — in the bar and on every card — until the visitor signs in.

---

### User Story 2 - Every existing tab still does what it did (Priority: P2)

A visitor who used the site yesterday finds every tab behaving as it did — Trending lists the
trending polls, the personal tabs need a sign-in, Search shows the results of the header search
box, Live Results refreshes on its own, the Refresh control is where it was and does what it did.
The only differences they notice are cosmetic: the icons, the rule, Title Case labels, and that
Search is now the last tab, after Live Results.

**Why this priority**: The feature must not cost anything. A bar that looks better but breaks a
tab is a regression.

**Independent Test**: Run every existing home-page behaviour — tab switching, guest gating,
searching from the header, deep-linking with search terms, bookmarking into Favorites, adding to
Live Results, the Refresh control's enabled/disabled/hidden states — and observe no change.

**Acceptance Scenarios**:

1. **Given** any of the five pre-existing tabs, **When** it is clicked, **Then** it opens with the
   same content, the same requests and the same timing rules as before this feature.
2. **Given** a guest clicks a personal tab, **When** the click lands, **Then** they are sent to
   sign in, as today.
3. **Given** the visitor arrives with search terms in the address, **When** the page opens,
   **Then** the Search tab opens with the results, as today, in its new position.
4. **Given** the Refresh control, **When** the visitor switches between tabs, **Then** it is
   enabled, disabled or hidden by the same rules as today, and it sits at the right end of the tab
   row above the rule.
5. **Given** a phone-width window, **When** the visitor looks at the tab bar, **Then** it is one
   row that scrolls sideways with no visible scrollbar and no wrapping, as today, and the rule
   stays in place beneath it whatever the scroll position.

---

### User Story 3 - The Newest tab is there, and empty (Priority: P3)

Any visitor — guest or member — can click Newest. It highlights like any other tab and shows a
poll grid with nothing in it: no polls, no message, no placeholder. Nothing is asked of the
server, the Refresh control is unavailable while Newest is open, and nothing else on the page
changes. What Newest lists is the subject of a later feature; this cycle delivers the tab in its
final appearance so that the bar is complete.

**Why this priority**: Lowest because it delivers no content yet — but the bar is wrong without
it, and the tab must exist for the later feature to fill.

**Independent Test**: As a guest and as a member, click Newest. The tab highlights, the panel is
an empty grid with no text, no request leaves the browser, the Refresh control is disabled.
Click another tab and back: the same.

**Acceptance Scenarios**:

1. **Given** a guest on the home page, **When** they click Newest, **Then** the tab highlights,
   the panel shows an empty grid with no message, and they are not sent to sign in.
2. **Given** a member on the home page, **When** they click Newest, **Then** the same as above.
3. **Given** Newest is open, **When** the visitor looks at the Refresh control, **Then** it is
   disabled.
4. **Given** Newest is open, **When** the visitor waits or reloads, **Then** no request is made
   on the tab's behalf and no timing rule is spent.
5. **Given** the visitor's system reads the page aloud, **When** any tab is focused, **Then** it is
   announced by its label alone — no icon is announced, and the exclamation mark of Newest is
   never read out.

---

### Edge Cases

- The window is wider than the centred column: the rule still reaches both window edges; it is
  not limited to the column.
- The window has a vertical scrollbar: the full-width rule does not cause a horizontal scrollbar.
- The tab row is scrolled sideways on a narrow window: the rule does not move; the icons scroll
  with their labels.
- A guest views the bar: the three personal tabs are dimmed with their icons; the Live Results
  bars are still (bar and cards) and start bouncing the moment the visitor signs in; signing out
  stops them again; Trending and Newest are never dimmed.
- The visitor's system requests reduced motion: the Live Results bars in the bar stop for a member
  too, exactly as the bars on a poll card stop.
- A signed-in member has a profile picture of their own: the My Private Polls icon still shows
  the default silhouette, never the member's own picture.
- The default avatar picture is later redrawn: the tab's copy of it must be updated in the same
  change (a note beside the picture says so).
- Newest is the open tab when the visitor signs out or signs in: it stays open and stays empty;
  no request is made.

## Requirements *(mandatory)*

### Functional Requirements

**Tabs and order**

- **FR-001**: The home page tab bar MUST show exactly six tabs, in this order from left to right:
  Trending, Newest, My Private Polls, Favorites, Live Results, Search.
- **FR-002**: Every label MUST be in Title Case as written in FR-001; the former "TRENDING" and
  "My PRIVATE POLLS" labels are replaced.
- **FR-003**: Each of the five pre-existing tabs MUST behave exactly as before this feature when
  clicked — the same content, the same guest gating, the same requests and timing rules, the
  same Refresh control behaviour.
- **FR-004**: The open tab MUST be highlighted inside the same rounded rectangle as today, with no
  change to its shape, colour or size.

**Icons**

- **FR-005**: Each tab MUST show an icon immediately to the left of its label, drawn in a
  16 × 16 pixel box with a 6 pixel gap before the label; icon and label MUST be vertically centred
  on one line.
- **FR-006**: The Trending icon MUST be a single filled shape: one thick stroke that starts at
  the lower left, sweeps in a shallow curve that bows downward (concave up) to the upper right,
  and ends in a solid triangular arrowhead pointing to the upper right — a "trending up" swoosh.
  The stroke's weight is about a fifth of the icon's width. The sketch
  `designDocs/dontTrack/trendingupicon.jpg` (not tracked) is the reference; this description
  governs.
- **FR-007**: The Newest icon MUST be a plain circle (no tail or bubble shape) in the default
  avatar's two colours — the circle in the avatar's blue-grey, containing an italic exclamation
  mark in the avatar's pale grey — so it sits beside the My Private Polls icon as a pair.
- **FR-008**: The My Private Polls icon MUST be the default avatar silhouette used in the header —
  the same shapes and the same two colours — and MUST always be the default, never the signed-in
  member's own picture.
- **FR-009**: The Favorites icon MUST be the star from a poll card's "Add to Favorites" control,
  alone (no tag, no surrounding shape), drawn in grey outline with no fill.
- **FR-010**: The Live Results icon MUST be the same three-bar picture used by a poll card's
  "Live Results" link, with the same bouncing animation, the bars keeping their 14 pixel height
  and sitting on the bottom of the 16 pixel box.
- **FR-011**: The Live Results animation — in the tab bar and on the front of every poll card —
  MUST run continuously whenever the visitor is signed in, whichever tab is open, and MUST NOT run
  for a guest. It MUST stop for everyone when the visitor's system requests reduced motion.
- **FR-012**: The Search icon MUST be the magnifying glass used in the header's "Search
  CrowdPoll" field, at the same size.
- **FR-013**: The Trending and Search icons MUST take the colour of their label — the muted grey
  of an unselected tab, the dark green of the highlighted tab's text. The My Private Polls icon
  MUST keep the avatar's own colours. The Newest, Favorites and Live Results icons MUST use the
  colours FR-007, FR-009 and FR-010 give.
- **FR-014**: Every icon MUST be decorative to assistive technology: it is not announced, it
  cannot receive keyboard focus, and each tab's accessible name remains its visible label. The
  Newest exclamation mark MUST never be read aloud.
- **FR-015**: All six icons MUST be drawings made for this application, embedded in the home
  page beside their labels — not images fetched separately, not a third-party icon set. The My
  Private Polls icon is a copy of the default avatar drawing, and the avatar's own file MUST carry
  a note that a copy lives in the home page.
- **FR-016**: A dimmed (unavailable) tab MUST dim its icon with its label.

**The rule**

- **FR-017**: A rule MUST be drawn under the tab row: 2 pixels thick, in the site's standard rule
  grey, its top edge 5 pixels below the row.
- **FR-018**: The rule MUST extend from the left edge of the browser window to the right edge at
  every window width, while the tab row itself stays within the page's centred column.
- **FR-019**: The highlighted tab and the Refresh control MUST both sit above the rule, at the
  same distance from it; the rule is a divider, not an underline of the open tab.
- **FR-020**: The rule MUST NOT cause a horizontal scrollbar, including when the window has a
  vertical scrollbar.
- **FR-021**: The rule MUST be attached to the part of the row that does not scroll — the
  wrapper that holds the tabs and the Refresh control — so that it stays in place when the tab
  strip is scrolled sideways on a narrow window.

**Narrow windows**

- **FR-022**: On windows too narrow for all six tabs, the bar MUST keep its current behaviour: a
  single row that scrolls sideways with its scrollbar hidden and no wrapping; no new size
  threshold is introduced.

**Newest**

*Superseded by 019-NEWEST-POLL-TAB: FR-023 (no polls, no message), FR-025 (no request) and FR-026 (Refresh disabled) no longer apply once 019 is implemented — see `specs/019-NEWEST-POLL-TAB/spec.md` FR-028. FR-024 (open to guests) and FR-027's "a subsequent feature defines it" are fulfilled by 019.*

- **FR-023**: Clicking Newest MUST highlight it like any other tab and show a poll grid containing
  nothing — no polls, no message, no placeholder text.
- **FR-024**: Newest MUST be available to guests as well as members; clicking it MUST NOT send
  a guest to sign in.
- **FR-025**: Opening Newest MUST make no request to the server and MUST NOT spend any of the
  visitor's request allowances.
- **FR-026**: While Newest is the open tab, the Refresh control MUST be disabled.
- **FR-027**: What Newest lists is out of scope; a subsequent feature defines it. Nothing in this
  feature MAY pre-empt that (no placeholder wording, no data fetching).

**Unchanged**

- **FR-028**: No server behaviour, stored data, configuration setting, published interface or
  poll card behaviour changes in this feature.

### Key Entities

- **Tab**: one of the six items in the bar — a label, an icon, an availability (open to guests or
  members only), and an open/closed state. Five exist today with their behaviours; Newest is
  added with no behaviour beyond being openable.
- **Icon**: a small drawing belonging to a tab; either a copy of a drawing already on the site
  (avatar, star, bars, magnifying glass) or new to this feature (arrow, circled exclamation
  mark).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On the home page, 6 tabs are visible in the order given, each with an icon before
  its label.
- **SC-002**: At every window width from 320 pixels to 2560 pixels the rule measures the full
  window width, and the page never shows a horizontal scrollbar because of it.
- **SC-003**: 100% of the existing home-page behaviours — every automated check that exists for
  tab switching, guest gating, search, deep links, bookmarking, Live Results and the Refresh
  control — pass unchanged apart from tab order and label text.
- **SC-004**: Opening Newest as a guest or a member produces 0 requests to the server and 0
  changes to the visitor's request allowances.
- **SC-005**: Each reused icon is pixel-identical in shape to its source on the site when scaled
  to the same size; 0 icons are loaded as separate images.
- **SC-006**: With reduced motion requested, 0 elements in the tab bar animate; without it, the
  Live Results bars (bar and cards) are animating on 100% of signed-in page loads, on every tab,
  and on 0% of guest page loads.
- **SC-007**: A screen reader announces each tab by its label only; 0 icons are announced.
- **SC-008**: Two labels change text ("Trending", "My Private Polls") and two tabs change position
  (Search, Live Results); no other visible text on the page changes.

## Assumptions

- The internal identifiers of the five existing tabs are unchanged, so existing bookmarks,
  deep links and automated checks that select a tab by identifier keep working; only the visible
  label and position change. Newest receives a new identifier.
- The Newest icon's two colours are the default avatar's own (`#8093a7` circle, `#e8edf2` mark), so
  the two icons match; "grey" for the Favorites star is the resting grey of a card's unpressed "Add
  to Favorites" control, so the two stars match on screen.
- The Live Results icon in the bar shares the card icon's definition rather than copying it, so
  a future change to the card's icon changes the bar's with it — the intent of "the exact same
  icon". The source's phrase "View Live Results button" refers to the card's "Live Results" link.
- The rule's 5 pixels of air are measured from the bottom edge of the tab buttons, which is also the
  bottom edge of the Refresh control (both rest on the row's bottom edge); the space below the row
  is otherwise unchanged.
- Newest is registered as a tab with no behaviour, because a tab the page does not know about
  would not highlight when clicked.
- The Refresh control is disabled on Newest by the rule that already disables it on a tab that
  has nothing to refresh; no new rule is added.
- No environment variable is added or changed; no interface description changes.
- The previous feature's user-interface contract lists five tabs; this feature's own contract
  states six and supersedes that section. The previous feature's documents are not edited.
- Mobile-specific layouts, an icon-only mode, and wrapping to two rows are out of scope.
