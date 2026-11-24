# Feature Specification: Voting Center

**Feature Branch**: `voting`

**Created**: 2026-11-22

**Status**: Draft

**Input**: User description: "requirements/20261122-012539-voting-center-ui/requirements.md": rework the voting side of a
poll card, now called the Voting Center: clearer button labels and positions, an "add your own choice" row in place of
the Add Choice dialog (on the voting side and on the results side of a card), the voting buttons repeated at the top of
long ballots with a help line for multiple-choice polls, a Follow button on the maximized voting side with Watch renamed
Follow across the site, and "Vote Cast Date" in the Who Voted table.

## Clarifications

### Session 2026-11-23

- Q: What happens to a half-typed choice in the add-your-own row when a live update redraws the card? → A: Live updates keep the typed text, the cursor position and focus; the text is dropped only when the voter turns, maximizes or minimizes the card.
- Q: How does a voter know a choice they added was accepted, when it may fall into "More choices"? → A: A snackbar "Choice added" after every successful addition, from either face.

## User Scenarios & Testing *(mandatory)*

In this document a poll card has two **faces**: the **results face** (front: the poll's bars and percentages) and the
**Voting Center** (back: the ballot the viewer ticks). A card is **compact** in the grid of a tab and **maximized** when
shown on its own. An **action row** is the row of buttons under a face's bars. The **add-your-own row** is the new last
bar in which a voter types a choice of their own. A **guest** is a visitor who is not signed in. The **desktop layout**
and the **phone layout** are the site's two existing page layouts.

Who may add a choice is unchanged: a Private poll whose creator lets voters add choices, while it is open, to a
signed-in viewer allowed to vote in it who has not cast a final vote (the creator always), up to the site's maximum
number of choices. In this document such a viewer **may add a choice**.

### User Story 1 - Clearer voting buttons (Priority: P1)

A voter sees "Cast Your Vote" where the card used to say "Vote", on the left of the card's action row, with Live Results
moved to the right. In the Voting Center the button that submits the ballot reads "Cast this vote" while one choice (or
none) is ticked and "Cast these votes" once two or more are ticked; it sits on the left, and the button that turns the
card back to its results face sits on the right. On a phone, the bar that keeps these buttons on screen while voting in
a maximized card follows the same order.

**Why this priority**: These are the buttons every voter presses; their words and places change on every card, so the
rest of the feature is built around them.

**Independent Test**: Open any open poll card, read the results face's action row, open the Voting Center, tick one
and then two choices, and read the Cast button and the flip-back button's place; repeat in the phone layout with a
maximized card.

**Acceptance Scenarios**:

1. **Given** an open poll's compact card, **When** the viewer looks at its results face, **Then** the action row shows
   "Cast Your Vote" on the left and Live Results on the right.
2. **Given** the Voting Center of a single-choice poll, **When** the voter picks a choice, **Then** the Cast button reads
   "Cast this vote".
3. **Given** the Voting Center of a multiple-choice poll, **When** the voter ticks a second choice, **Then** the Cast
   button changes from "Cast this vote" to "Cast these votes", and back when one is unticked.
4. **Given** a voter who holds a vote they may change, **When** they untick every choice, **Then** the button reads
   "Remove vote", as today.
5. **Given** any Voting Center, **When** it is shown, **Then** the Cast button is on the left of its action row and the
   flip-back button on the right.
6. **Given** the phone layout and a maximized card's Voting Center, **When** the voting bar is shown at the bottom of the
   screen, **Then** it shows the Cast button on the left, the "n selected" count in the middle and the flip-back button
   on the right, with the same label as the card's Cast button.
7. **Given** any card, **When** "Cast Your Vote", "Cast this vote" or "Cast these votes" is longer than the button,
   **Then** the button keeps today's width and style and its label shrinks or wraps to fit, never cut off.

---

### User Story 2 - Add your own choice in the Voting Center (Priority: P1)

A voter who may add a choice sees, as the last bar of the ballot, a row with no checkbox or radio button holding the
hint "Enter your own choice, then press Enter." in italics. They type a choice and press Enter; it becomes the poll's
last choice, votable by every voter, and the row empties, ready for another. The Add Choice button and its dialog are
gone. This holds in the maximized Voting Center and in a compact card's Voting Center when all its choices fit.

**Why this priority**: It replaces the only way voters add choices today; without it, the removed dialog leaves no way
to add one.

**Independent Test**: As a voter of a Private poll that lets voters add choices, open its Voting Center (compact, then
maximized), type a new choice, press Enter, and confirm it appears as the last choice for the voter and for a second
voter.

**Acceptance Scenarios**:

1. **Given** a viewer who may add a choice, **When** they open the poll's Voting Center, **Then** its last bar is the
   add-your-own row, the same size as the other bars, white with dark text (near-black with light text in dark mode),
   outlined so it stands out on the card, and showing the hint in a greyed italic.
2. **Given** a viewer who may not add a choice (a guest, a Public poll, a closed poll, a voter who cast a final vote, or
   a poll with the most choices allowed), **When** the Voting Center is shown, **Then** there is no add-your-own row and
   no Add Choice button.
3. **Given** the add-your-own row, **When** the voter types, **Then** the hint disappears at the first character and the
   text shows in the face's normal text colour, with a counter of characters used out of the maximum.
4. **Given** text typed in the row, **When** the voter presses Enter, **Then** the choice is added at the end of the
   poll's choices, a "Choice added" snackbar confirms it, the row empties and keeps focus, the voter's ticked choices stay ticked, and the new choice is not
   ticked for them.
5. **Given** text that is empty after trimming, or that matches an existing choice (ignoring case and repeated spaces),
   **When** the voter presses Enter, **Then** nothing is added; a duplicate is reported under the row as they type.
6. **Given** a refusal (too soon after the last addition, the maximum reached meanwhile, or any failure), **When** the
   voter presses Enter, **Then** the message the dialog gives today appears under the row, the text is kept and the
   row keeps focus.
7. **Given** text in the row, **When** the voter presses Escape, **Then** the row empties.
8. **Given** a pasted text with line breaks, **When** it is pasted into the row, **Then** the line breaks become spaces
   and the text is cut at the maximum length.
9. **Given** a touch-only device, **When** the row is empty, **Then** its hint reads "Enter your own choice, then press
   ↵." and the on-screen keyboard's action key is a return key; on every other device it reads "Enter your own choice,
   then press Enter."
10. **Given** a ballot whose bars fill the face, **When** the add-your-own row is added, **Then** the bars are sized so
    that the row fits as one more bar.

---

### User Story 3 - Add your own choice from the results face (Priority: P2)

A viewer who may add a choice sees the same add-your-own row as the last bar of the poll's results face, on a compact
grid card on every tab and on a maximized card, after "More choices" when the card shows that row. Adding a choice there
does not cast a vote: the card stays on its results face and the new choice appears with 0%.

**Why this priority**: It makes adding choices discoverable without opening the Voting Center, but voters can already
add from the Voting Center (Story 2).

**Independent Test**: As a viewer who may add a choice, add one from a compact card's results face on the Home tab and
from a maximized results face; confirm the card stays on its results face and the new 0% bar appears.

**Acceptance Scenarios**:

1. **Given** a viewer who may add a choice and a compact card on any tab, **When** its results face is shown, **Then**
   the add-your-own row is the last bar, after "More choices" when that row is shown.
2. **Given** the add-your-own row on a results face, **When** the viewer clicks or taps in it, **Then** only the row
   takes focus: the card neither turns to its Voting Center nor maximizes.
3. **Given** a choice added from the results face, **When** it is accepted, **Then** a "Choice added" snackbar confirms it, the card stays on its results
   face, the new choice is shown at 0% in its place in the results order (last when the poll lists choices in entered
   order), and every other view of the poll on the page shows it too.
4. **Given** a compact card whose bars filled the face, **When** the add-your-own row is shown, **Then** one fewer
   result may fit before "More choices", and the row always fits.
5. **Given** a viewer who may not add a choice, **When** any results face is shown, **Then** it has no add-your-own row
   and its bars are as today.

---

### User Story 4 - Long ballots keep their buttons in reach (Priority: P2)

A voter opens a maximized Voting Center with 10 or more choices in the desktop layout. Under the title, after a thin
divider, they find the same action row as at the bottom, so they can cast without scrolling to the end. On a
multiple-choice poll, every action row with a Cast button has the line "You may select more than one choice." under it.

**Why this priority**: It saves scrolling on long ballots and explains multiple-choice ballots; voting already works
without it.

**Independent Test**: Maximize the Voting Center of a multiple-choice poll with 12 choices in the desktop layout, cast
from the top row, then open one with 5 choices and one on a phone.

**Acceptance Scenarios**:

1. **Given** the desktop layout and a maximized Voting Center of a poll with 10 or more choices, **When** it is shown,
   **Then** a divider follows the title and subtitle, and under it an action row identical to the bottom one (Cast on
   the left, flip-back on the right).
2. **Given** both action rows, **When** the voter ticks or unticks a choice, **Then** both Cast buttons show the same
   label and are enabled or disabled together, and either one casts the ballot; the top row comes first in keyboard
   order.
3. **Given** a poll with 9 choices, or the phone layout, or a compact card, **When** the Voting Center is shown,
   **Then** there is no divider and no top row.
4. **Given** a multiple-choice poll, **When** any Voting Center is shown (compact or maximized), **Then** "You may
   select more than one choice." appears under each action row that has a Cast button, right-aligned, bold, upright,
   in the face's normal text colour, in both themes. The phone layout's voting bar is not such a row: the line under
   the card's own bottom action row is the one shown.
5. **Given** a single-choice poll, **When** any Voting Center is shown, **Then** the help line is not shown.
6. **Given** the count of choices, **When** deciding whether the top row shows, **Then** every choice of the poll
   counts, whether drawn or not, and the add-your-own row does not.

---

### User Story 5 - Follow instead of Watch (Priority: P3)

A viewer of a maximized Voting Center sees three icons on the title row, right-aligned: Share, Follow and Minimize. The
Follow button behaves as the results face's. Across the site, what was called Watch is called Follow: the button's
tooltips read "Follow this Poll" and "Stop following this Poll", the tab reads "Following", and a poll listed because
the viewer follows it says "You are following".

**Why this priority**: A naming and convenience change; nothing becomes possible that was not before.

**Independent Test**: Maximize a poll's Voting Center, follow it from there, check the results face shows it followed,
and read the tab bar and the reason line on the Following tab.

**Acceptance Scenarios**:

1. **Given** a maximized Voting Center, **When** it is shown, **Then** its title row shows Share, Follow and Minimize,
   right-aligned in that order, Follow shown exactly when the results face shows it.
2. **Given** the Follow button on either face, **When** the viewer follows or stops following, **Then** both faces show
   the same state at once.
3. **Given** any Follow button, **When** the pointer rests on it, **Then** its tooltip reads "Follow this Poll", or
   "Stop following this Poll" when already followed; a screen reader announces "Follow" or "Following".
4. **Given** the site's tab bar, **When** it is shown, **Then** the tab once named Watching reads "Following", its empty
   message and its reason line say "following", and every message that spoke of watching a poll speaks of following it.
5. **Given** an address shared before this change that names the watching tab, **When** it is opened, **Then** it still
   opens the Following tab.
6. **Given** a compact card's Voting Center, **When** it is shown, **Then** its title row is unchanged (no Follow
   button).

---

### User Story 6 - "Vote Cast Date" in Who Voted (Priority: P3)

The creator of a poll whose votes are not anonymous opens the Who Voted panel of the maximized view and reads "Vote Cast
Date" as the date column's heading, whichever order the table is in.

**Why this priority**: A one-word clarification.

**Independent Test**: Open Who Voted for a non-anonymous poll and switch between its two orders.

**Acceptance Scenarios**:

1. **Given** the Who Voted table in either order (by voter or by choice), **When** it is shown, **Then** the date
   column is headed "Vote Cast Date".

---

### Edge Cases

- The poll reaches its maximum number of choices (another voter added the last one) while a voter is typing: Enter is
  refused with the existing message, and the row disappears at the next refresh of the card.
- The poll closes, or the voter's permissions change, while they are typing: the row disappears with the card's next
  refresh; a press of Enter before then is refused with a message under the row.
- A voter casts a final vote: the add-your-own row disappears from both faces (the creator keeps it).
- A poll being edited by its creator: the card shows its "momentarily unavailable" message as today and no
  add-your-own row.
- Two add-your-own rows on screen for one poll (the results face of a card and the maximized view): adding from either
  updates both.
- A choice the voter has typed but not added when the card turns, maximizes or minimizes: the typed text is not kept.
- A live update (new votes, a choice added by another voter) while the voter is typing: the row keeps its text, cursor
  position and focus.
- A choice added by another voter makes a compact Voting Center too long to fit while the voter is using its row (the
  row has focus or text): the card stays on the Voting Center, and turns back to its results only at the first refresh
  once the row is both left and empty.
- The voter's own addition brings the poll to its maximum number of choices: the row disappears, and focus moves to the
  face's primary button (Cast on the Voting Center, "Cast Your Vote" on the results face) when it is shown and enabled,
  otherwise to the card's Maximize (or Minimize) button.
- A poll with exactly 10 choices shows the top row; with 9 it does not; adding a 10th choice from the row shows it.
- A label that does not fit the button's width on a narrow card wraps or shrinks; it is never cut off or overflowing.
- A guest sees no add-your-own row on any face.

## Requirements *(mandatory)*

### Functional Requirements

**Buttons and their places**

- **FR-001**: The results face's button that opens the ballot MUST read "Cast Your Vote" wherever it read "Vote", and
  MUST sit on the left of its action row, with Live Results on the right.
- **FR-002**: The Voting Center's submit button MUST read "Cast these votes" while two or more choices are ticked and
  "Cast this vote" otherwise; it MUST read "Remove vote" where it does today.
- **FR-003**: The Cast button MUST sit on the left of every action row it is in, and the flip-back button on the right.
- **FR-004**: In the phone layout, the voting bar of a maximized Voting Center MUST show the Cast button on the left,
  the selected count in the middle and the flip-back button on the right, the Cast button carrying the card's label.
- **FR-005**: The "Cast Your Vote" and Cast buttons MUST keep today's width and style; a label longer than the button
  MUST shrink or wrap so that it is shown whole.

**Add your own choice**

- **FR-006**: The Add Choice button and the Add Choice dialog MUST be removed.
- **FR-007**: An add-your-own row MUST be the last bar of every Voting Center (compact and maximized) and of every
  results face that shows bars (compact on every tab, and maximized), whenever the viewer may add a choice and the poll
  has fewer than the maximum number of choices; otherwise it MUST NOT be shown.
- **FR-008**: The row MUST have the size of the face's other bars, span the face's width, have no checkbox or radio
  button, be white with dark text in the light theme and near-black with light text in the dark theme, and carry an
  outline so it stands out from the card.
- **FR-009**: The empty row MUST show the hint "Enter your own choice, then press Enter." in a greyed italic, or "Enter
  your own choice, then press ↵." on a touch-only device, where the on-screen keyboard's action key MUST be a return
  key; the hint MUST disappear when the first character is typed, and typed text MUST be in the face's normal text
  colour.
- **FR-010**: The row MUST count as one bar when the face's bars are sized; the bars MUST shrink as needed so that it
  fits, and on a compact results face one fewer result may be shown before "More choices".
- **FR-011**: Pressing Enter (or the return key) MUST add the typed choice, trimmed, at the end of the poll's choices,
  where every voter may vote for it; a "Choice added" snackbar MUST confirm every successful addition, from
  either face, and the row MUST then empty and keep focus, unless the addition brings the poll to its maximum number
  of choices, when focus MUST move as the Edge Cases describe.
- **FR-012**: The row MUST accept at most the site's maximum choice length, show a counter of characters used while
  typing, turn pasted line breaks into spaces, ignore Enter when the trimmed text is empty, and report a duplicate of an
  existing choice (ignoring case and repeated spaces) as the voter types, ignoring Enter while it does.
- **FR-013**: A refused addition MUST show, under the row and in the error colour, the message the dialog gives today
  for the same refusal, keeping the typed text and the focus.
- **FR-014**: Escape in the row MUST empty it.
- **FR-015**: Adding a choice MUST keep the voter's ticked choices and MUST NOT tick the new choice for them.
- **FR-016**: On a results face, a click or tap in the row MUST only focus it, never turn or maximize the card; after an
  addition the card MUST stay on its results face and show the new choice at 0% in its place in the results order.
- **FR-017**: Every view of the poll on the page MUST show a choice added from any of them.
- **FR-025**: A live update of the card (new votes, a choice added by another voter) MUST keep the add-your-own row's
  typed text, cursor position and focus; the text MUST be dropped only when the voter turns, maximizes or minimizes
  the card.

**Long ballots and the help line**

- **FR-018**: In the desktop layout, a maximized Voting Center of a poll with 10 or more choices (every choice of the
  poll counted, the add-your-own row not) MUST show, under its title and subtitle, a divider and then a second action
  row identical to the bottom one; no other Voting Center shows them.
- **FR-019**: The two action rows MUST always agree (label, enabled state), either MUST cast the ballot, and the top
  row MUST come first in keyboard order.
- **FR-020**: On a multiple-choice poll, every action row with a Cast button, on every Voting Center, MUST be followed
  by the line "You may select more than one choice.", right-aligned, bold, upright, in the face's normal text colour;
  a single-choice poll MUST NOT show it. The phone layout's voting bar mirrors the card's bottom action row and is not
  an action row for this rule.

**Follow**

- **FR-021**: The maximized Voting Center's title row MUST show, right-aligned, Share, Follow and Minimize in that
  order; its Follow button MUST be shown when the results face's is and MUST share its state.
- **FR-022**: Every user-visible use of "Watch" for following a poll MUST read "Follow": tooltips "Follow this Poll" /
  "Stop following this Poll", accessible names "Follow" / "Following", the tab "Following", the reason "You are
  following", the empty-tab message, and every message about the number of polls one may follow.
- **FR-023**: Addresses, stored data and anything not shown to users MUST keep their current names, so addresses
  shared before this change keep working.

**Who Voted**

- **FR-024**: The Who Voted table's date column MUST be headed "Vote Cast Date" in both of its orders.

### Key Entities

- **Choice**: an option of a poll, with its label and its place; unchanged, but now added from a row on either face
  rather than from a dialog.
- **Add-your-own row**: not stored; a bar shown to a viewer who may add a choice, holding the text they type.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A voter who may add a choice adds one in 2 steps (type, press Enter) from either face, against 4 today
  (open the Voting Center, open the dialog, type, Save).
- **SC-002**: In usability checks, 9 out of 10 first-time voters find where to add their own choice without help.
- **SC-003**: On a maximized ballot of 10 or more choices in the desktop layout, a voter casts without scrolling.
- **SC-004**: 100% of the places that named the Vote, Submit, Watch and Date wording show the new wording, with none
  of the old left in what users see.
- **SC-005**: Every label is shown whole, with nothing cut off, on the narrowest card the site supports.
- **SC-006**: Addresses that named the watching tab before the change open the Following tab in 100% of cases.

## Assumptions

- The rules for who may add a choice, the maximum number of choices and the maximum choice length are unchanged, and
  the server keeps checking them as today.
- "Touch-only device" means one whose only pointer is coarse (a phone or tablet without a mouse); a touch laptop with a
  mouse reads "press Enter".
- Text typed in the add-your-own row is not kept when the card turns, maximizes or minimizes; live updates keep it
  (FR-025).
- The Live Results tab's cards are results faces like any other and follow FR-007.
- The `/poll/<pid>` page's card follows the same rules as the tabs' cards.
- No new cookie, browser storage, page address or setting is added.
- The site's README, which describes the voting buttons and Watch, is updated to the new wording.
