# Feature Specification: Maximized Poll Card

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-09-24

**Status**: Draft

**Input**: User description: "designDocs\021-high-level-requirements-MAXIMIZED-POLL-CARD.md"

**Source requirements**: `designDocs/021-high-level-requirements-MAXIMIZED-POLL-CARD.md` (97 lines,
with the nineteen resolutions of the architecture pass), the icon image
`designDocs/dontTrack/maximizeIcon.jpg`, and the stand-alone layout in
`research/MAXIMIZED-POLL-CARD/SINGLE-CARD-LAYOUT/`
**Architecture**: `architecture/021-maximized-poll-card/architecture.md`. It raised 19 findings, all
resolved, and documents two breaking changes.

## Clarifications

### Session 2026-09-24

- Q: When a maximized poll drops off the tab's list without the visitor doing anything, does the view close at once? → A: It depends on the cause (Option B). The view closes at once when the visitor caused the removal (un-favouriting on Favorites, removing from Live Results) or when the poll is deleted, rejected or no longer accessible. When a Trending or Newest recompute drops the poll, the view stays open and the card keeps working until the visitor closes it; the grid then shows without the poll.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open one poll large, then go back to the tab (Priority: P1)

A visitor browsing the Trending tab sees a poll with many choices. Its card shows only a few bars at
a time, with scroll arrows. They click the poll's title, or the new Maximize icon beside the
Favorites star. The grid of cards gives way, in the same tab, to that one poll shown large, with a
side panel beside it, and the card's Maximize icon has become a **Minimize** icon. When they are
done, they press Minimize, or click the Trending tab again, and the grid is back exactly as they left it, at the same scroll position.

**Why this priority**: It is the feature. Everything else refines this round trip.

**Independent Test**: On any tab with several cards, scroll part-way down and maximize one card by
its title. Check that the tab bar is still visible, only that poll is shown, and its icon reads
Minimize. Press Minimize and check that the grid is back, with every card in its place and the page at the same
scroll position. Repeat using the Maximize icon, and closing by clicking the current tab.

**Acceptance Scenarios**:

1. **Given** a tab showing its grid of cards, **When** the visitor points at a card's title or
   subtitle, **Then** the pointer becomes a hand and the text is underlined.
2. **Given** the same grid, **When** they click a card's title or subtitle, **Then** that tab shows
   only that poll, maximized, with the side panel beside it and the Minimize icon in its title row,
   and the header and tab bar stay on screen.
3. **Given** a card's title row, **When** the visitor looks at its right-hand end, **Then** they see
   the Favorites star, a small gap, and the Maximize icon at the star's size, drawn in near-black.
   Pointing at the icon shows a hand, a light grey background behind it, and the tooltip "Maximize
   Poll Card"; pressing it darkens the background.
4. **Given** the same card, **When** they click the Maximize icon, **Then** the result is the same as
   clicking the title.
5. **Given** a maximized poll, **When** the visitor presses Minimize, **Then** the tab's grid returns
   with the same cards in the same order and at the same scroll position as before, and no poll is
   maximized.
6. **Given** a maximized poll, **When** the visitor clicks the tab they are already on, **Then** the
   grid returns in the same way, and no new data is requested for it.
7. **Given** the My Private Polls tab, where cards show no Favorites star, **When** the visitor looks
   at a card's title row, **Then** the Maximize icon sits alone at its right.

---

### User Story 2 - See every choice at once (Priority: P1)

A visitor opens a poll that has 50 choices. In the grid, its card shows a scrolling list. Maximized,
the card grows to show all 50 bars at once, with no scroll arrows, and the visitor scrolls the page
itself to read them. A poll with two choices shows two tall bars. A poll with forty shows forty
shorter bars. Beside the card is a grey panel, reserved for content a later feature will define, and
a thin vertical line separates the two.

**Why this priority**: Showing every bar without scrolling inside the card is the reason to maximize
at all.

**Independent Test**: Maximize polls with 2, 7 and 50 choices. Each card shows every bar, with no
scroll arrows and no scrolling inside the card. Bars get shorter as the number of choices grows.
Narrow the window and check that the panel moves below the card, and that on a phone-width window
nothing is cut off.

**Acceptance Scenarios**:

1. **Given** a poll with the fewest choices a poll may have, **When** it is maximized, **Then** its
   bars are at their tallest (50 px) with a small fixed gap between them.
2. **Given** a poll with the most choices a poll may have, **When** it is maximized, **Then** its
   bars are at their shortest (25 px), every one of them is visible, and the card shows no scroll
   arrows.
3. **Given** a poll with a number of choices in between, **When** it is maximized, **Then** its bar
   height lies proportionally between the two.
4. **Given** a wide window, **When** a poll is maximized, **Then** the card keeps its usual maximum
   width, the grey panel takes the rest of the row, and a thin vertical line runs between them, from
   the top of the card to the bottom of whichever of the two is taller.
5. **Given** a window narrowed step by step, **When** it becomes too narrow for both side by side,
   **Then** the panel moves below the card at full width, the card is centred above it, and the
   vertical line is no longer shown.
6. **Given** a phone-width window, **When** a poll is maximized, **Then** neither the card nor the
   panel is wider than the screen, and no part of either is cut off.
7. **Given** the side panel, **When** the visitor reads it, **Then** it shows the placeholder text
   of the stand-alone layout, and is as tall as that text, not as tall as the card.

---

### User Story 3 - The same colours and lettering on every card (Priority: P2)

A visitor who knows a poll from the grid maximizes it and sees the same bar colours and text, only
larger. Across the whole app, every results bar now uses a vibrant fill from a new 50-colour palette
on a pale tint of its own colour, with no glow around the letters. The text is dark over the tint,
and over the fill it is a light or dark shade of the fill, whichever reads better, changing exactly
where the fill ends, including while the fill is still growing into place. Yes and No bars work the
same way, in a strong green and red, with white text over the fill.

**Why this priority**: The requirements make the colours consistent between the two views a
condition of the feature, and it changes every card on every tab. It is P2 only because the
maximize round trip can be demonstrated without it.

**Independent Test**: Compare one poll's card in the grid and maximized: each bar has the same fill
and text colour in both. On a poll with ordinary choices, every label and percentage is readable
over both the fill and the empty part of the bar. On a Yes/No poll, reload the tab and watch the
bars grow: the white text is never visible beyond the growing fill.

**Acceptance Scenarios**:

1. **Given** any poll card on any tab, **When** the visitor looks at its results bars, **Then** each
   bar's fill comes from the new palette, in bar order, the rest of the bar is a pale tint of that
   fill, and its label and percentage are dark over the tint and a light or dark shade of the fill
   over the fill, with no shadow or glow.
2. **Given** a poll shown both in the grid and maximized, **When** the two are compared, **Then**
   every bar has the same fill colour and the same text colour in both.
3. **Given** a bar whose label is a Yes-type or No-type answer, **When** it is drawn, **Then** its
   fill is the Yes green or the No red, the rest of the bar is a pale tint of that colour, and the
   text is white over the fill and dark over the tint.
4. **Given** a Yes/No bar whose fill is growing into place after a render or a refresh, **When** the
   visitor watches it grow, **Then** the text's change from dark to white follows the fill's edge
   throughout, and white text is never shown over the pale tint.
5. **Given** any bar, **When** the visitor compares it with the card before this feature, **Then**
   its height, the spacing, the typeface, the text size and the point at which a long label is
   shortened are unchanged. Only the colours and the text's shadow differ.
6. **Given** the voting face of a card, **When** the visitor flips to it, **Then** the choice rows
   keep their two plain colours, unchanged by this feature.

---

### User Story 4 - The maximized card keeps working, and stays in step with the tab (Priority: P2)

A signed-in member maximizes a poll, flips to the voting face, picks two choices and submits. The
results update in the maximized card, and when they close it, the same card in the grid shows the
same vote. On the Favorites tab they un-favourite the maximized poll. The poll no longer belongs on
that tab, so the view closes and the grid is shown without it. While they read, the tab keeps
refreshing and the maximized card's numbers keep moving.

**Why this priority**: A maximized card that stopped working, or drifted from the tab, would be
worse than no maximized card. It follows the round trip in priority because it adds no new
controls, only guarantees about existing ones.

**Independent Test**: Maximize a poll, vote in it, and check that the results change in the
maximized card and, after closing, in the grid. Start a vote, maximize from the voting face, close,
and check that the selection is still there. Un-favourite a maximized poll on Favorites, and remove
a maximized poll from Live Results: the view closes each time. Click another tab while maximized,
come back, and check that the grid is shown.

**Acceptance Scenarios**:

1. **Given** a maximized poll, **When** the member votes, adds it to Favorites or to Live Results,
   **Then** each works exactly as it does in the grid, including sending guests to sign in.
2. **Given** a card flipped to its voting face with choices selected but not submitted, **When** the
   member clicks its title, **Then** the maximized card opens on the voting face with the same
   choices selected. Closing it returns the card to the grid on the same face with the same
   selection.
3. **Given** a maximized poll on a tab that refreshes, **When** new results arrive, **Then** the
   maximized card shows them, as the grid card would.
4. **Given** a maximized poll, **When** the visitor removes it from the tab's list (removing it from
   Live Results, or un-favouriting it on Favorites), or it is deleted, rejected or no longer
   accessible, **Then** the maximized view closes and the tab shows its grid without that poll.
5. **Given** a maximized poll on Trending or Newest, **When** the tab's next recompute no longer
   lists it, **Then** the view stays open and the card keeps working. **When** the visitor then
   closes it, **Then** the grid is shown without that poll.
6. **Given** a maximized poll, **When** the visitor clicks a different tab, submits a search, or
   signs in or out, **Then** the maximized view closes, and returning to the first tab shows its
   grid.
7. **Given** a maximized poll, **When** the visitor presses the Refresh button, **Then** the tab is
   refreshed and the maximized card updates in place, and the view stays open.
8. **Given** a maximized poll, **When** the visitor looks at its title row, **Then** the Maximize
   icon has become a Minimize icon, which closes the view, and the title and subtitle
   are plain text, with no hand pointer, no underline and
   no click.
9. **Given** a Search tab card or a Live Results tab card, **When** it is maximized, **Then** it
   keeps that tab's controls: no Vote on Search, and on Live Results the link that removes the poll.

---

### User Story 5 - Keyboard, focus and the browser's own controls (Priority: P3)

A member using only the keyboard tabs to a card's Maximize icon and presses Enter. Focus lands on the
X. Escape closes the view, and focus returns to the Maximize icon they started from. The browser's
address does not change, and the browser's Back button still leaves the page as it always did.

**Why this priority**: It completes the feature for keyboard users and settles how it relates to the
browser, but the round trip can be demonstrated by mouse first.

**Independent Test**: Using only the keyboard, open and close a maximized poll twice, once with
Minimize and once with Escape, and check that focus is on the Minimize icon each time it opens and
stays on that icon, showing Maximize again, each time it closes. Check that the page address never changes.

**Acceptance Scenarios**:

1. **Given** a card, **When** the member moves through it with Tab, **Then** the Maximize icon takes
   focus and shows a visible focus indication, and the title and subtitle do not take focus.
2. **Given** the Maximize icon has focus, **When** the member presses Enter or Space, **Then** the
   poll is maximized and focus stays on the same button, which now shows the Minimize icon.
3. **Given** a maximized poll, **When** the member presses Escape, **Then** the view closes as if
   Minimize had been pressed. The voting face carries its own Minimize icon, so the view can be
   closed from either face.
4. **Given** the view was opened from the Maximize icon, **When** it closes by any of Minimize,
   Escape or the current tab, **Then** focus returns to that card's Maximize icon on the face the
   card is showing as the view closes.
5. **Given** a maximized poll, **When** the visitor looks at the address bar, **Then** it is
   unchanged, and the browser's Back button behaves as it did before the poll was maximized.
6. **Given** a maximized poll opened from a scrolled grid, **When** the view opens, **Then** the top
   of the tab's content is brought into view. **When** it closes with Minimize, Escape or the
   current tab, **Then** the page returns to the scroll position it had before.

---

### Edge Cases

- **The poll leaves the tab while maximized**: if the visitor caused it, or the poll was deleted,
  rejected or made inaccessible, the view closes and the grid is shown without it. On Live Results,
  focus follows the existing rule for a removal. Elsewhere it goes to the tab's first card, or to
  the tab's empty-state line when no card is left.
- **A Trending or Newest recompute drops the maximized poll**: the view stays open, and a vote in
  progress is not lost. The poll is gone from the grid when the visitor closes the view, and focus
  then goes to the tab's first card, or its empty-state line.
- **A poll on Trending or Newest is deleted or rejected while maximized**: those tabs receive only
  a new list, so the browser cannot tell a deletion or rejection from a recompute (research R8).
  The view stays open, as for a recompute. If the visitor then votes, the vote is refused and the
  card shows its usual "could not be recorded" message.
- **The last poll on a tab leaves while maximized**: when the view closes, at once or when the
  visitor closes it (by the rules above), the tab shows its empty-state line, as it would have in
  the grid.
- **A vote is refused, or asked for too soon, from the maximized card**: the same message appears on
  the maximized card that the grid card would show.
- **A guest maximizes a poll**: it opens. Pressing Vote, the Favorites star or Live Results sends
  them to sign in, as in the grid.
- **A sign-in or sign-out happens in another window while maximized**: the tabs reset, as today, and
  the maximized view closes with them.
- **The window is resized while maximized**: the card and panel reflow between side by side and
  stacked, and bar heights do not change, because they depend on the number of choices, not the
  space.
- **A poll with more choices than the palette has colours**: cannot occur. The palette holds one
  colour for each choice a poll may have.
- **A poll that is closed, being edited, or that the viewer may not vote in**: maximizes, and shows
  the same notes and hides the same controls as its grid card.
- **Two Yes/No answers in one poll**: both bars take the semantic treatment. Other bars use palette
  colours in order, skipping neither.
- **Reduced motion**: the fill's growth, and the text change that follows it, obey the same rules as
  the fill does today.
- **The browser's Back button while maximized**: it leaves the page, exactly as it would from the
  grid. Maximizing added no history entry.

## Requirements *(mandatory)*

### Functional Requirements

**Opening the maximized view**

- **FR-001**: Every poll card on every tab MUST offer two ways to maximize its poll: clicking the
  card's title or subtitle, and clicking a Maximize icon in the card's title row.
- **FR-002**: When pointed at, the title and subtitle MUST show a hand pointer and be underlined.
  They MUST open the maximized view from either face of the card. They remain text and do not take
  keyboard focus.
- **FR-003**: The Maximize icon MUST sit at the right-hand end of the title row, with the Favorites
  star moved to its left and a 4 px gap between them. On a tab whose cards show no Favorites star,
  the icon MUST sit alone at the right. The voting face's title row MUST carry the same icon at its
  right-hand end (it has no Favorites star), doing the same as the front's.
- **FR-004**: The Maximize icon MUST depict a rounded square with a filled box in its lower-left
  corner and an arrow pointing to the upper right (the supplied image), drawn at the Favorites
  star's size in `#202020`. On hover it MUST show a light grey background behind the icon; while
  pressed, a slightly darker one; with keyboard focus, the light grey background and a focus ring.
  It MUST show a hand pointer when pointed at.
- **FR-005**: The Maximize icon MUST be a button that is announced and shown as a tooltip as
  "Maximize Poll Card", reachable by Tab and operated by Enter and Space.
- **FR-006**: A single-colour vector version of the supplied icon image MUST be produced alongside
  it, black on a transparent background, and be the source of the icon the cards show.
- **FR-007**: Guests MUST be able to maximize a poll.

**Where and how it is shown**

- **FR-008**: The maximized view MUST appear within the current tab, in the place of that tab's grid
  of cards, with the site header, the tab bar and the tab's notice line still on screen. Only one
  poll may be maximized at a time.
- **FR-009**: While a poll is maximized, the tab's grid MUST be hidden, not discarded: every card in
  it keeps its state, and the grid returns unchanged when the view closes.
- **FR-010**: The maximized view MUST follow the stand-alone layout, without its close row: the poll
  card; a 2 px vertical line in the site's line colour; and a grey side panel.
- **FR-011**: The maximized view MUST NOT carry a separate close button. The card's Minimize icon
  (FR-022) is its close control on the card.
- **FR-012**: The card MUST keep its usual maximum width. While the window allows, the card and the
  panel MUST sit side by side, sharing the width as the stand-alone layout does. When the window is
  too narrow for both, the panel MUST move below the card at full width, the card MUST be centred,
  and the vertical line MUST be hidden.
- **FR-013**: Neither the card nor the panel may be narrower than 375 px, except where the page
  itself is narrower, where each MUST fit the page's width. Nothing may be cut off at any window
  width.
- **FR-014**: The vertical line MUST run from the top of the card to the bottom of whichever of the
  card and the panel is taller. The panel MUST be only as tall as its content.
- **FR-015**: The panel MUST show the stand-alone layout's placeholder text until a later feature
  defines its content.

**No scrolling inside the maximized card**

- **FR-016**: The maximized card MUST show every one of its poll's choices, on both faces, with no
  scrolling inside the card and no scroll arrows. The card grows to fit, and the page scrolls.
- **FR-017**: In the maximized card, bar height MUST depend only on the number of choices: 50 px at
  the fewest a poll may have, 25 px at the most, and proportionally in between. The gap between bars
  MUST be a fixed 2 px.
- **FR-018**: Apart from sizing and scrolling, the maximized card MUST render the poll exactly as the
  grid card does: the same order, colours, text, notes, counts and controls.

**The maximized card is the same card**

- **FR-019**: The maximized card MUST behave in every respect as the grid card of the same poll on
  the same tab: voting, Favorites, Live Results, flipping between faces, notes, refusal messages, and
  the controls the tab shows or hides.
- **FR-020**: Opening and closing the view MUST carry the card's face, any selection made but not
  submitted, and any vote notice or error, in both directions.
- **FR-021**: The maximized card MUST keep receiving every update its tab receives, as the grid card
  would, for as long as it is shown.
- **FR-022**: While a poll is maximized, the Maximize icon in its title rows (both faces) MUST become a Minimize
  icon — the same drawing with the arrow pointing the opposite way (down and to the left, into the
  box), with the same states, announced and shown as a tooltip as "Minimize Poll Card" — and its
  title and subtitle MUST NOT be clickable, underlined or shown with a hand pointer.

**Closing the maximized view**

- **FR-023**: Pressing the Minimize icon, pressing Escape, or clicking the current tab MUST close the view and
  show the tab's content as it was before the poll was maximized.
- **FR-024**: Clicking the current tab while a poll is maximized MUST only close the view, with no
  request for fresh data and no use of the visitor's refresh allowance. The Refresh button, pressed
  while a poll is maximized, MUST refresh the tab and leave the view open, with the card updated.
- **FR-025**: The view MUST close when the visitor clicks another tab, submits a search, or signs in
  or out. Returning to the tab MUST show its grid.
- **FR-026**: The view MUST close at once when its poll leaves the tab's list because the visitor
  removed it (removing it from Live Results, un-favouriting it on Favorites), or because the poll was
  deleted, rejected or is no longer accessible to the visitor. When the poll leaves because a
  Trending or Newest recompute no longer lists it, the view MUST stay open and the card MUST keep
  working until the visitor closes it. On Trending and Newest this also covers a deletion or
  rejection, which those tabs cannot tell apart from a recompute (see Edge Cases). In every case, once the view closes, the tab MUST show its
  grid without that poll, or its empty-state line if none remain, and focus MUST follow the Live
  Results tab's existing rule after a removal there, and elsewhere move to the tab's first card, or
  to its empty-state line when no card is left.
- **FR-027**: On opening, focus MUST move to the card's Minimize icon on the face it is showing, and the top of the tab's content MUST be brought
  into view. When the view is closed with the Minimize icon, Escape or the current tab, the page MUST return to
  its scroll position from before opening, and focus MUST return to the card's Maximize icon on the
  face the card is showing as the view closes (whichever face it was opened from). When the view closes because the visitor leaves the tab (FR-025), neither the scroll
  position nor focus is moved. When it closes because its poll left the tab, focus follows FR-026.
- **FR-028**: Maximizing MUST NOT change the page's address or add a browser-history entry.

**Bar colours and text on every card**

- **FR-029**: On every poll card, maximized or not, each results bar's fill MUST come from the new
  50-colour palette (the research's `color-palette.md`: ten xkcd colours, then each made lighter in
  four steps and snapped to its nearest named xkcd colour, all 50 distinct), assigned in bar order.
  Only bars without a Yes/No colour use up a palette colour. The first two entries are darkish blue
  (#014182) and dark green blue (#1F6357).
- **FR-030**: A palette bar's empty part MUST be its fill 80% of the way to white. Its label and
  percentage MUST be drawn, with no shadow or glow, in the tint's dark shade (at least 7:1) over the
  empty part, and over the fill in whichever of the fill's light shade (95% lightness) and dark shade
  reads better, split at the fill's edge as Yes/No text is (FR-032). No shade of their own hue
  reaches 4.5:1 on five mid-brightness fills; the lowest is 4.05:1.
- **FR-031**: A bar whose label is a Yes-type answer MUST use the Yes green (#018826), and a No-type
  answer the No red (#CF0234), with the rules that decide Yes-type and No-type unchanged. Such a
  bar's empty part MUST be a pale tint of its own colour, and its text MUST be white over the fill
  and a dark shade of the tint over the tint. White text on either semantic colour MUST reach at
  least 4.5:1 contrast.
- **FR-032**: The change of text colour at a bar's fill edge — every bar's, Yes/No or palette — MUST coincide with the fill's edge at
  every moment, including while the fill grows or shrinks into place after any render or refresh.
- **FR-033**: The dark line marking the end of each fill MUST be kept. Several palette colours are
  close to the empty bar's colour, and the line is what shows where the fill ends.
- **FR-034**: On the non-maximized card, bar height, gap, text size, typeface, padding, the rule that
  hides text on very thin bars, label shortening and scrolling MUST be unchanged. Only fill colours,
  text colours and text shadows change.
- **FR-035**: The voting face's choice rows and the administration pages MUST be unchanged by the
  colour work.
- **FR-036**: The earlier features' rules for bar colours, Yes/No colours and choosing black or white
  text by coverage MUST be recorded as superseded by this feature, and the checks that enforce them
  replaced with checks for FR-029 to FR-033.

### Key Entities

- **Maximized view**: a state of one tab, not a page. It holds at most one poll card, shown in the
  place of the tab's grid, with a close control and a side panel. It belongs to the tab it was
  opened in and ends when that tab is left, or when its poll leaves the tab (at once, or when the
  visitor closes it, by the rules in FR-026).
- **Poll card**: the existing card for one poll on one tab. The same card appears in the grid or in
  the maximized view, never both at once, and keeps its face, selection and data as it moves.
- **Bar palette**: an ordered list of 50 vibrant colours, one for each choice a poll may have. Each
  colour's tint and text shades are derived from it.
- **Semantic colours**: the Yes green and No red, applied to bars whose labels read as yes or no,
  each with a derived pale tint for the bar's empty part.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can maximize any poll in one click or key press, and return to the tab in one
  more, from any of the six tabs.
- **SC-002**: A maximized poll shows 100% of its choices without scrolling inside the card, for every
  choice count from the fewest allowed to the most allowed.
- **SC-003**: After closing a maximized poll, the tab shows the same cards, in the same order, at the
  same scroll position, in 100% of trials, with no new data requested when it was closed by clicking
  the current tab.
- **SC-004**: For every poll, each bar's fill and text colour are identical between its grid card and
  its maximized card.
- **SC-005**: Every palette bar's text reaches at least 7:1 contrast against its tint, and at least
  4:1 against its fill (4.5:1 on all but five fills). White text on
  the Yes and No colours reaches at least 4.5:1. Checked for all 50 palette colours and both semantic
  colours.
- **SC-006**: At no moment during a bar's fill animation is white text shown outside the fill, on any
  Yes/No bar, in current Chrome, Firefox and Safari.
- **SC-007**: At every window width from phone to desktop, no part of the maximized card or panel is
  cut off, and no horizontal scrolling appears.
- **SC-008**: A keyboard-only user can open and close a maximized poll, and after closing, focus is
  back where they started in 100% of trials.
- **SC-009**: Every existing automated check passes, except those that assert the previous bar
  colours and text rules, which are replaced by checks for the new ones.

## Assumptions

- The maximized card keeps the grid card's maximum width. "Maximized" means every choice is shown
  and the side panel is added, not that the card is wider.
- The side panel's content is out of scope. Its placeholder text is kept only to check the layout,
  and a following feature replaces it.
- The maximized view is a view of data the tab already holds. No new request is made to open it, and
  no server behaviour, stored data, configuration setting or published interface changes.
- The fewest and most choices a poll may have come from the site's existing configuration. They are
  not fixed by this feature.
- The colours are assigned in the browser by bar order, as today. No stored value changes.
- The rules that decide whether a label is a Yes-type or No-type answer are unchanged. Only the
  colours applied change.
- Before this feature, the Yes/No colours were pale green and pink, and the 50 palette colours were
  dark and saturated. The change of look on every card is intended.
- The vector icon file is a working asset kept beside the supplied image. The copy drawn on the
  cards is the one the site ships.
- The stand-alone layout's temporary aids (the back-face preview, the alternative text style, the
  unused gap scaling and the fixed choice limits) are not part of the feature.
- No dedicated git branch is created for this feature; work continues on `dev`.
