# Feature Specification: Bar Colors

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "designDocs/022-high-level-requirements-BAR-COLORS.md"

**Source requirements**: `designDocs/022-high-level-requirements-BAR-COLORS.md` (60 lines, with the
fifteen resolutions of three architecture passes)
**Architecture**: `architecture/022-bar-colors/architecture.md`. Its three passes raised 15 findings,
all resolved, and document two breaking changes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Each poll has its own colours (Priority: P1)

A visitor opens the Trending tab and sees a grid of twenty poll cards. Today the top coloured bar of
nearly every card is the same dark blue, the next the same dark green-blue, and so on, so the grid
looks as if the site had a colour theme. After this feature, each card's bars start from a different
point in the palette, so neighbouring cards look different from each other, while Yes and No bars
keep their familiar green and red.

**Why this priority**: It is the feature: the grid stops looking themed.

**Independent Test**: Load a tab with many polls that have no Yes/No choices. Check that the cards'
top bars are not all the same colour, and that a card's bars still differ from each other.

**Acceptance Scenarios**:

1. **Given** a tab showing many polls, **When** the visitor looks at the grid, **Then** the cards'
   first coloured bars are spread across the palette rather than all the same colour.
2. **Given** any poll card, **When** the visitor looks at its non-Yes/No bars, **Then** no two of
   them share a colour.
3. **Given** a poll with a "Yes" and a "No" choice among others, **When** its card is shown,
   **Then** Yes is green and No is red exactly as today, and only the other bars take palette
   colours.
4. **Given** any bar, **When** its colour differs from today's, **Then** its label and percentage
   stay as readable as before, on the bar's tinted background and over its filled part alike.

---

### User Story 2 - A poll's colours never change (Priority: P1)

A visitor watches a poll on Trending, maximizes it, then finds it again in Search and adds it to
Live Results. Each time, the poll's bars show the same colours in the same order. Tomorrow, on
another device, and for another visitor, they are the same again.

**Why this priority**: Colours that change from view to view would make a poll harder to recognise,
the opposite of the feature's aim.

**Independent Test**: Note one poll's bar colours from top to bottom. Reload the page, open it in
another tab of the app, maximize it, and open it in a different browser signed in as another user.
The colours and their order are the same every time.

**Acceptance Scenarios**:

1. **Given** a poll shown on two different tabs, **When** the visitor compares the two cards,
   **Then** their bars show the same colours in the same order.
2. **Given** a poll card in the grid, **When** the visitor maximizes it, **Then** the maximized card
   shows the same colours in the same order.
3. **Given** a poll, **When** the page is reloaded, or the poll is viewed by another user or on
   another device, **Then** its colours are the same.
4. **Given** a live poll whose choices change rank as votes arrive, **When** the bars reorder,
   **Then** the sequence of palette colours from top to bottom among the non-Yes/No bars stays the
   same: each colour belongs to a position, as today, and a Yes or No bar keeps its own colour
   wherever it ranks.

---

### Edge Cases

- **A poll whose choices are all Yes/No-style**: no palette colour is used; the card looks as today.
- **A poll with 50 non-Yes/No choices**: all 50 palette colours appear once each, starting from the
  poll's own starting colour and wrapping from the palette's last colour to its first.
- **A poll whose starting colour is near the end of the palette**: its later bars continue from the
  first palette colour; no colour repeats within the card.
- **Two polls with the same starting colour**: allowed. With fifty possible starting colours, two
  cards on a busy grid will sometimes match; nothing reassigns colours to avoid it.
- **A copied poll**: it is a new poll with a new identifier, so its colours generally differ from
  the original's.
- **A card with no poll identifier** (reachable only in automated tests): it starts at the first
  palette colour, as every card does today.
- **The voting face and the admin pages**: unchanged; they draw no palette-coloured result bars.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The colour of a poll card's first non-Yes/No result bar MUST be chosen from the
  50-colour palette by a fixed, deterministic function of the poll's permanent identifier, giving a
  starting position from 1 to 50.
- **FR-002**: Each following non-Yes/No bar MUST take the next palette colour after the previous
  one, wrapping from colour 50 to colour 1, so no colour repeats within one card.
- **FR-003**: Bars MUST be coloured in their display order (highest percentage first), as today.
  The k-th non-Yes/No bar from the top (counting from 0) MUST take palette colour
  `((start − 1 + k) mod 50) + 1`.
- **FR-004**: Yes/No bars MUST keep their current green and red colours, chosen by the current word
  rules, and MUST NOT consume a palette colour.
- **FR-005**: A poll MUST show the same colours in every place a poll card appears (every tab, the
  grid and the maximized view), after a reload, to every user and on every device.
- **FR-006**: The function MUST give the same result in every supported browser.
- **FR-007**: A card with no poll identifier MUST start at palette colour 1.
- **FR-008**: The palette's contents and order, the bar background tints, the text colours derived
  from each fill, and the text copy drawn over each bar's fill (white on Yes/No, the fill's light
  or dark shade on palette colours) MUST stay as they are; that text copy MUST follow its bar's
  new fill colour.
- **FR-009**: The existing automated tests that expect the palette to start at colour 1 MUST be
  rewritten to expect colour `((start − 1 + k) mod 50) + 1`, with the start computed by the same
  function. New cases MUST cover a poll whose start is known and not 1, and a poll whose bars wrap
  past colour 50.
- **FR-010**: The project's README and architecture overview MUST describe the new colour rule, and
  the 021 UI contract's palette entry MUST be annotated to point to this feature.

### Key Entities

- **Poll**: its permanent identifier is the only input to the starting colour. No attribute is
  added to it.
- **Palette**: the existing ordered list of 50 colours. Unchanged; a future change to it would
  recolour every card, which is accepted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a grid of 20 polls with no Yes/No choices, the first bars show at least 10
  different colours (with the identifiers spread evenly over 50 starting colours, about 17 are
  expected).
- **SC-002**: Across 1,000 poll identifiers, every one of the 50 starting colours is used, and none
  is used more than 2.5 times as often as the average (in 200 random trials of 1,000 identifiers, the busiest start was used 38 times against an average of 20, and the least used 6 times).
- **SC-003**: 100% of polls show identical colours in the grid, in the maximized view, on every tab,
  after a reload, and for a second user in a different browser.
- **SC-004**: No poll card shows the same palette colour on two bars.
- **SC-005**: Yes/No bar colours and every bar's text contrast are unchanged from before the
  feature.
- **SC-006**: The whole automated test suite passes, including the rewritten and new colour cases.

## Assumptions

- The poll's permanent identifier is the id every poll already has. The function is the one the
  source requirements name (32-bit FNV-1a over the identifier text, modulo the palette length); the
  plan carries the detail.
- The starting colour is worked out in the browser. No field is added to the poll, and no server,
  route, API description, configuration or database change is made.
- Every card whose starting colour is not 1 (about 49 in 50) changes colour once when the feature
  is deployed. This is the purpose of the feature and is accepted.
- The feature changes no functional behaviour: voting, results, tabs and the maximized view work as
  before.
- Out of scope: the Yes/No colours and word rules, the palette's contents and order, the tint and
  text-colour rules, bar sizing and spacing, the voting face's colours and the admin pages.
