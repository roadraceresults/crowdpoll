# Feature Specification: Color Contrast

**Feature Branch**: `color-scheme`

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "requirements/20261120-175903-color-contrast/requirements.md": a tester reports that the
options blend into the background in both Light and Dark and do not look colourful; raise the contrast and make the
options visibly distinct in both schemes, while keeping the site's greens, the dark-green icons and the green, red and
black logo; and write down colour-contrast guidelines so later changes keep the level reached.

## Clarifications

### Session 2026-11-20

- Q: Is a result-bar fill that is too light for the Light card darkened, as a too-dark one is lightened in Dark? → A:
  Yes, in both schemes and for every fill (palette, Yes/No and creator-stored), by the same rule (FR-007).
- Q: Must no text's contrast drop below its value before this feature? → A: No: a fixed floor only — text at least
  4.5:1 (3:1 large), vote-row and result-bar labels at least 7:1; contrast may drop while it stays above the floor
  (FR-001). Refined in analysis: labels over a bar's fill are black or white at ≥ 4.5:1; 7:1 holds on tracks.

## User Scenarios & Testing *(mandatory)*

In this document the **schemes** are the two colour schemes a person can choose in Site Settings, **Light** and
**Dark**. An **option** is anything a person picks between: first a poll's **choices** — a **vote row** on a poll's
voting side and a **result bar** on its results side — and then every other control whose edge or selected state is
shown by colour (the home tabs, the search filters, the Settings radios and checkboxes, the admin list rows; an admin list row has no edge: rows are told apart by alternating
tones, an open row by the panel it expands, and its keyboard focus outline carries FR-002). A
**surface** is what an element sits on: the **page** behind the cards, a **card**, or a row. **Contrast** is the WCAG 2.2
contrast ratio between two colours (1:1 is no difference, 21:1 is black on white). A **bar's track** is the part of a
result row the bar's fill does not cover. The **frozen colours** are those listed in FR-012 to FR-014; every other colour
may change.

Measured before this feature: an unselected vote row differs from its card by 1.12:1 (Light) and 1.19:1 (Dark); a
selected row differs from an unselected one by 1.32:1 and 1.55:1; tracks differ from the card by 1.0–1.3:1; in Dark, six
of the fourteen result colours are below 3:1 against the card (black 1.23:1); card and page differ by 1.12:1 and 1.08:1.
Text on tracks already passes (at least 7:1); text drawn over a bar's fill can be as low as 2.3:1.

### User Story 1 - A voter can see every choice and which one is picked (Priority: P1)

A person opens an open poll to vote, in either scheme. Every choice stands out from the card as a distinct row, and
the moment they pick one it is unmistakably different from the others, without relying on colour alone.

**Why this priority**: voting is the site's core action, and it is exactly where the tester saw options blending in;
a voter who cannot tell rows apart, or cannot see which one they picked, may vote wrongly or give up.

**Independent Test**: open a poll with two, ten and fifty choices, in Light and in Dark; check every row's edge against
the card and a selected row against an unselected one with a contrast checker, and select and deselect choices in a
single-choice and a multiple-choice poll.

**Acceptance Scenarios**:

1. **Given** an open poll in Light, **When** its voting side is shown, **Then** each vote row's edge contrasts with the
   card by at least 3:1.
2. **Given** an open poll in Dark, **When** its voting side is shown, **Then** each vote row's edge contrasts with the
   card by at least 3:1.
3. **Given** a vote row is unselected, **When** the voter selects it, **Then** the selected row differs from an
   unselected one by at least 3:1 in its fill or edge, its edge is visibly thicker, and its radio dot or check mark
   shows.
4. **Given** a selected row, **When** the voter deselects it (multiple choice) or picks another (single choice),
   **Then** it returns to the unselected look.
5. **Given** the voting side, **When** it is shown, **Then** the selected state uses an amber accent, never green, and
   no unselected row is tinted with its choice's results colour (a "Yes" row is not green and a "No" row is not red
   before voting).
6. **Given** a poll with so many choices that rows are drawn compact, **When** its voting side is shown, **Then** each
   row still has a visible edge and the selected one is still distinguishable.

---

### User Story 2 - A reader can read every result bar in both schemes (Priority: P1)

A person looks at a poll's results, in either scheme. Every bar is visible against the card whatever its colour, each
bar's full row is visible, and the results look colourful.

**Why this priority**: in Dark, today's dark result colours (black, dark red, blue, purple…) almost disappear on the
card, so a reader cannot compare the results — the content the site exists to show.

**Independent Test**: open polls whose choices use each of the fourteen result colours, the Yes and No colours, and a
very dark and a very light stored colour, in both schemes; measure each bar's fill and track against the card and the
text on each.

**Acceptance Scenarios**:

1. **Given** any result bar in Light or Dark, **When** results are shown, **Then** its fill contrasts with the card by
   at least 3:1.
2. **Given** a choice whose colour is too dark for the Dark card (for example black), **When** results are shown in
   Dark, **Then** the bar is drawn in a lighter shade of the same hue that reaches 3:1, and the same choice's line in the
   results graph is drawn in the same shade.
3. **Given** any result bar, **When** results are shown, **Then** its track contrasts with the card by at least 1.5:1.
4. **Given** any result bar, **When** results are shown, **Then** the label and percentage contrast at least 7:1 with
   the track and at least 4.5:1 with the fill (black or white text over the fill).
5. **Given** a poll with a colour stored by its creator, **When** results are shown, **Then** the stored colour is not
   changed, only how it is drawn in Dark.

---

### User Story 3 - Cards and other options stand out on every page (Priority: P2)

A person browses the home grid, searches, changes Settings or works in the admin page, in either scheme. Cards stand out
from the page behind them, and every tab, filter, radio, checkbox and admin row has a clear edge and a clear selected
state.

**Why this priority**: the same pale-on-pale colours are used across the site; fixing only the poll card would leave
the rest looking washed out and the two looks out of step.

**Independent Test**: on the home grid, a search, Settings and the admin page, in both schemes, measure card against
page, card border against both, and each control's edge and selected state against its surface.

**Acceptance Scenarios**:

1. **Given** the home grid in Light or Dark, **When** it is shown, **Then** a card's border contrasts with both the card
   and the page by at least 1.5:1, and card and page are visibly different tones.
2. **Given** any tab, filter, radio, checkbox or admin row, **When** it is shown, **Then** its edge, or its fill where it
   has no edge, contrasts with its surface by at least 3:1.
3. **Given** any such control in its selected or active state, **When** it is shown, **Then** that state differs from
   its unselected state by at least 3:1 or by a non-colour cue (a mark, an underline, a thicker edge).
4. **Given** any text on any page, **When** it is shown, **Then** it contrasts with its background by at least 4.5:1
   (3:1 for large text).

---

### User Story 4 - The brand stays the same (Priority: P2)

A returning person sees the same greens, the same green icons and the same logo they know.

**Why this priority**: the requirements keep the greens, the dark-green icons and the logo explicitly; changing them
would be a rebrand, not a contrast fix.

**Independent Test**: compare every frozen colour's value, in both schemes, before and after the feature.

**Acceptance Scenarios**:

1. **Given** any page in Light, **When** it is shown, **Then** icons drawn in the primary green are still dark green
   (`#2C6A46`).
2. **Given** any page in Dark, **When** it is shown, **Then** those icons are still the light green they are today
   (`#94D5A8`).
3. **Given** the header logo in Light, **When** it is shown, **Then** its green, red and black are unchanged.
4. **Given** the header logo in Dark, **When** it is shown, **Then** its green and red are unchanged, its black parts are
   drawn in the scheme's main text colour and its white parts are transparent, as today.

---

### User Story 5 - A future change cannot silently undo the contrast (Priority: P3)

A developer changing a colour later finds the guideline that says which pairs must reach which contrast and which
colours are frozen, and an automated check fails if their change breaks either.

**Why this priority**: the requirements ask that future updates keep the level reached; a document alone does not stop
a regression.

**Independent Test**: lower a listed pair below its minimum, or change a frozen colour, and run the test suite.

**Acceptance Scenarios**:

1. **Given** the project, **When** a developer looks for the colour rules, **Then** a guideline document at the project
   root lists the frozen colours, every required pair with its minimum in both schemes, the techniques used, and this
   feature's before and after values.
2. **Given** the project's agent guidance, **When** it is read, **Then** it points to that guideline in one line.
3. **Given** a change that brings a listed pair below its minimum in either scheme, **When** the tests run, **Then** they
   fail and name the pair.
4. **Given** a change to a frozen colour, **When** the tests run, **Then** they fail and name the colour.

---

### Edge Cases

- A poll with fifty choices draws compact rows with small corners: each row keeps a 1 px edge, and selection is still
  distinguishable (FR-004).
- A creator-stored colour that is very dark (black) or very light (near white): in Dark a too-dark fill is lightened to
  3:1; in Light a too-light fill is darkened to 3:1 against the card, by the same rule; the stored value never changes.
- The palette's orange-red (`#FF6601`) is 2.94:1 on the white card in Light: it is drawn one step darker in Light, by
  the same rule, and is unchanged in Dark.
- Palette colours that the lift would make look alike — coral close to orange-red in Light, black equal to
  darkslategray and close to gray in Dark — are replaced in the palette: coral `#FC8E45` → darkgoldenrod `#B8860B`,
  darkslategray `#404040` → saddlebrown `#8B4513`, gray `#7D7D7D` → olivedrab `#6B8E23` (FR-022).
- A colour that cannot reach 3:1 at any lightness of its hue (a fully grey one already does; none in the palette fails):
  the walk stops at the lightest (Dark) or darkest (Light) shade, and the guideline records the case.
- The Yes and No colours: their bars follow the same rule as any colour; the Yes green `#006120` is frozen as a value,
  and if it is lifted in Dark it is the drawn shade that changes, not the frozen value.
- A voter switches scheme while a poll is open: every row, bar and card takes the other scheme's colours at once.
- A disabled vote row (poll closed, vote sent): keeps its edge and selected look, dimmed as today; its text still meets
  4.5:1 or is marked disabled to assistive technology.
- The logo shown on a page that sets Dark before the session answers: it uses the Dark substitution from the first
  paint, as today.
- Hover and keyboard focus on a vote row: the focus indicator still contrasts 3:1 with its surroundings.

## Requirements *(mandatory)*

### Functional Requirements

**The floor**

- **FR-001**: In both schemes, all text MUST contrast with its background by at least 4.5:1, or 3:1 for large text;
  the labels on vote rows (unselected and selected) and the labels and percentages on a result bar's track MUST
  contrast with what they sit on by at least 7:1, and those drawn over a bar's fill (black or white) by at least
  4.5:1. A text pair's contrast MAY fall from its value before this feature as long as it
  stays at or above its floor.
- **FR-002**: In both schemes, the edge (or, where an option has no edge, the fill) of every option MUST contrast with
  the surface it sits on by at least 3:1.
- **FR-003**: A selected or active option MUST differ from its unselected state by at least 3:1, or by a non-colour cue,
  and its state MUST never be shown by colour alone.

**Vote rows**

- **FR-004**: Each vote row MUST have a 1 px edge in the scheme's outline colour (at least 3:1 against the card) and a
  neutral fill one tone further from the card than today; compact rows keep the 1 px edge.
- **FR-005**: A selected vote row MUST have a saturated amber fill and a 2 px edge, together at least 3:1 from an
  unselected row, and MUST keep its radio dot or check mark.
- **FR-006**: The voting side MUST stay neutral: rows MUST NOT be tinted with their choice's results colour, and the
  selected state MUST NOT be green.

**Result bars**

- **FR-007**: Every result-bar fill — palette, Yes/No and creator-stored — MUST contrast with the card by at least 3:1
  in both schemes; a fill below that MUST be drawn in the nearest shade of the same hue that reaches it (lighter in Dark,
  darker in Light), whatever the fill's source.
- **FR-008**: The results graph and the result bars MUST use one rule for that adjustment, so a choice's bar and line
  are drawn in the same shade.
- **FR-009**: Every bar's track MUST contrast with the card by at least 1.5:1 in both schemes, while the text on the
  track keeps 7:1.
- **FR-010**: A creator-stored colour MUST be kept as stored; only the drawn shade changes.

**Cards and page**

- **FR-011**: The page and the card MUST be visibly different tones in both schemes (the page darker than the card in
  Light, the card lighter than the page in Dark), and a card's border MUST contrast with both by at least 1.5:1 but
  stay below 3:1.

**Frozen colours**

- **FR-012**: These colours MUST NOT change in either scheme: the primary green and the text on it, the primary
  container and the text on it, the inverse primary, the Yes colour `#006120`, and the moss greens wherever they are
  still used.
- **FR-013**: Icons drawn in the primary green MUST stay dark green (`#2C6A46`) in Light and light green (`#94D5A8`) in
  Dark.
- **FR-014**: The logo's artwork MUST stay green, red and black in Light; in Dark its black parts MUST stay drawn in the
  scheme's main text colour and its white parts transparent, and its green and red MUST NOT change.
- **FR-015**: Every other colour — the neutral surfaces, outlines, the greyish-green secondary family and the amber
  tertiary family — MAY change to meet FR-001 to FR-011.

**Scope**

- **FR-016**: FR-001 to FR-003 MUST hold on every page: the home tabs and grid, search, a maximized poll, Settings,
  Profile, the admin page, the sign-in and account pages, Privacy and Terms.
- **FR-017**: Both schemes MUST be covered; the device's own appearance or contrast setting MUST NOT be read, and no
  third scheme is added.

**Guideline and guardrail**

- **FR-018**: A colour-contrast guideline (`COLOR-CONTRAST.md`) MUST be added at the project root, listing the frozen
  colours with their values, every required pair with its minimum in both schemes, the techniques used, and a change log
  of this feature's before and after values.
- **FR-019**: The project's agent guidance (`CLAUDE.md`) MUST gain one line pointing to that guideline.
- **FR-020**: An automated test MUST read the colours from the site's stylesheets and fail, naming the pair or colour,
  when a listed pair is below its minimum in either scheme or a frozen colour has changed.
- **FR-021**: Tests that pin today's colours MUST be updated to the new values, not removed.
- **FR-022**: After the lift of FR-007, no two of the base palette's colours MAY look alike in either scheme (CIE76 ΔE
  of at least 13, one below today's closest intended pair); palette entries that would are replaced by distinct colours,
  in the same positions.

### Key Entities

- **Colour role**: a named colour the site uses (surface, outline, primary, selected accent…), with one value per
  scheme; it is either frozen or free.
- **Contrast pair**: two roles that appear one on the other (for example vote-row edge on card), with a minimum ratio
  and the schemes it applies to.
- **Result colour**: the colour a choice is drawn in (from the palette, the Yes/No colours or the creator's stored
  colour), and its drawn shade per scheme.
- **Guideline**: the written list of frozen colours, contrast pairs and their minimums, which the automated test checks.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the contrast pairs listed in the guideline meet their minimum in both schemes, checked
  automatically on every test run.
- **SC-002**: An unselected vote row's edge reaches at least 3:1 against the card in both schemes (from 1.12:1 Light and
  1.19:1 Dark).
- **SC-003**: A selected vote row differs from an unselected one by at least 3:1 in both schemes (from 1.32:1 and
  1.55:1).
- **SC-004**: All fourteen palette colours (three of them replaced, FR-022), the Yes and No colours, and black and white stored colours draw bars at
  least 3:1 against the card in both schemes (in Dark six palette colours are below today).
- **SC-005**: Every track reaches at least 1.5:1 against the card in both schemes (from 1.0–1.3:1).
- **SC-006**: 0 frozen colours change value, checked automatically.
- **SC-007**: 100% of text pairs meet their floor in both schemes: 4.5:1 (3:1 large), 7:1 for vote-row labels and
  labels on a bar's track, and 4.5:1 for labels over a bar's fill.
- **SC-008**: The tester who reported the issue, shown the home grid, a maximized poll on its voting and its results
  side, and Settings, in both schemes, agrees that the options stand out and look colourful.

## Assumptions

- The two schemes stay as they are chosen today (Site Settings, remembered per device and per account); this feature
  changes only the colours they use.
- Fonts, sizes, spacing, shapes and layout do not change, except the 1 px and 2 px vote-row edges.
- The favicon, the link-preview image and the email logo are not changed.
- No new setting, cookie or browser storage is added.
- No route, payload or stored value changes: the feature is visual, and creator-stored colours stay as stored.
- The 1.5:1 track and card-border minimums are house targets below WCAG's 3:1, because both are decorative and a 3:1
  card border would compete with the bordered rows inside the card.
- The guideline is a developer document; `README.md` is not changed beyond screenshots, which may be refreshed.
- `ARCHITECTURE.md` is updated after implementation, as the constitution requires, to describe the colour roles and the
  shade rule.
