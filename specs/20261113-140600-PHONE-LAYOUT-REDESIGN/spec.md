# Feature Specification: Phone Layout Redesign

**Feature Branch**: `phone-uiux`

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "requirements/20261113-140600-phone-layout-redesign/requirements.md": redesign every page
of CrowdPoll for the 480 px layout that every phone now gets, readable and tappable without zoom; keep poll cards short
by showing only the essential bars; make the maximized poll the place for long polls, with the two-sided vote kept;
remove the Poll Results page and its two exports.

## Clarifications

### Session 2026-11-13

- Q: On the maximized view’s voting side, in what order are a long ballot’s choices listed? → A: As today everywhere: both sides ordered by share, largest first, re-sorted on refresh.

## User Scenarios & Testing *(mandatory)*

Every phone in portrait lays CrowdPoll out exactly 480 px wide and scales it to its screen, so the phone layout can be
designed once. Today that layout is the old one written for much narrower layouts: its buttons are 21 px tall, its
icons 24 px and some of its text 10.5 px, and a poll card lists every choice, so a 50-choice poll is a card several
screens long. After this feature a phone visitor reads comfortably sized text, taps controls sized for a finger, sees
a whole poll card and the start of the next on one screen, each showing the leading choices, and opens a long poll into a one-column view built
for reading and voting on it. Every other page uses the same frame. One leftover page, Poll Results, and its two
exports are removed.

All sizes in this document are layout pixels at the 480 px layout width; a 360 px phone shows them at 75 %, a 390 px
phone at 81 %.

### User Story 1 - A phone visitor reads a poll's result from a short card (Priority: P1)

A person opens a home tab on a phone. Each poll is a card as wide as the screen allows, with a readable title and the
leading choices as bars. A poll with many choices shows its leaders and one last row saying how many more there are.
A whole card fits on the screen with the next one starting below it, so the person scans polls instead of scrolling
through one.

**Why this priority**: The card is what every visitor sees first and most; its height and legibility are the problem
the redesign exists to solve.

**Independent Test**: On a phone, open a tab holding a 3-choice poll, a 5-choice poll and a 12-choice poll: the first
two show every choice, the third shows four bars and a "More choices" row; no card is taller than about 500 px unless
its title or the viewer's own choices make it so; all text is at least 15 px and every control has a 64 px touch target.

**Acceptance Scenarios**:

1. **Given** a poll with five or fewer choices, **When** its card is shown on a phone, **Then** every choice is a bar,
   largest share first.
2. **Given** a poll with six or more choices, **When** its card is shown, **Then** the four leading choices are bars
   and one last row reads "More choices".
3. **Given** a single-choice poll with choices left out, **When** its card is shown, **Then** the last row also gives
   their combined share, such as "More choices · 18%".
4. **Given** the viewer has voted for a choice that is not among the leaders, **When** the card is shown, **Then** that
   choice is also a bar, after the leaders, and is not counted among the choices left out.
5. **Given** any card, **When** the visitor taps its title, its bars or its "more choices" row, or its Maximize
   control, **Then** the maximized view of that poll opens.
6. **Given** any card, **When** it is shown, **Then** its title, subtitle, bar labels, percentages, buttons and footer
   are in the phone type sizes, and Watch, Maximize, Live Results and Vote each have a touch target of at least
   64 × 64 px that overlaps no other.
7. **Given** a poll with notes, **When** its card is shown, **Then** one line of the notes shows, and tapping it opens
   the maximized view with the notes open.

---

### User Story 2 - A phone visitor votes without hunting for the button (Priority: P1)

A person taps Vote on a card. On a short poll the card flips, as it always has, and they choose and submit on its back.
On a long poll the maximized view opens directly on its voting side with every choice listed, each row large enough to
tap, and Back and Submit staying at the bottom of the screen however far they scroll.

**Why this priority**: Voting is the product's purpose; the two-sided card is the part users praise, and a long ballot
is where the phone layout fails today.

**Independent Test**: Vote on a 4-choice poll: the card flips in place and the vote is submitted from the card. Vote on
a 50-choice poll: the maximized view opens on the voting side, the last choice can be selected and submitted without
scrolling back, and the selected count shows in the bottom bar.

**Acceptance Scenarios**:

1. **Given** a card that shows every choice, **When** the signed-in visitor taps Vote, **Then** the card flips in place
   to its voting side, with every choice a row and Back and Submit in the card.
2. **Given** a card with choices left out, **When** the signed-in visitor taps Vote, **Then** the maximized view opens
   already on its voting side.
3. **Given** the maximized view's voting side, **When** it is shown, **Then** every choice is one row with a touch
   target at least 64 px tall, and nothing scrolls inside the card.
4. **Given** the maximized view's voting side, **When** the visitor scrolls anywhere in the list, **Then** Back and
   Submit remain in a bar at the bottom of the screen, with the number of choices selected.
5. **Given** that bar is showing, **When** the cookie notice is also showing, **Then** the bar sits above it, and the
   Back-to-top control is not shown.
6. **Given** a vote is submitted from either place, **When** it is accepted, **Then** the card returns to its results
   side and shows the vote as it does today.
7. **Given** a poll whose state does not allow voting (closed, being edited, viewer blocked, not signed in), **When**
   Vote would be tapped, **Then** the card behaves as it does today for that state.

---

### User Story 3 - A phone visitor explores a poll in the maximized view and comes back (Priority: P2)

A person opens a poll's maximized view. It is one column: the card with its leading bars (at most ten, each above 2%), a row to show the rest,
and under the card a tab bar for the poll's notes, its vote history and who voted, showing one of them at a time. They
tap the one that interests them. The phone's Back button returns them to the list they came from.

**Why this priority**: The compact card sends visitors here for every long poll, so the view has to be quick to read
and safe to leave; it depends on Story 1's card.

**Independent Test**: Open a 37-choice poll's maximized view on a phone: its leaders above 2% (at most ten bars) and "Show all 37 choices · N%" show; the
row expands the list in place and becomes "Show few choices"; a tab bar under the card reads Read More, Polling History and Who Voted, and shows
the leftmost one the poll has; the phone's Back returns to the same tab at the same scroll position.

**Acceptance Scenarios**:

1. **Given** a poll with twelve or fewer choices, **When** its maximized view opens, **Then** every choice with a share above 0% is a bar
   (every choice when none has), and when any is left out one row reads "Show all N choices".
2. **Given** a poll with thirteen or more choices, **When** its maximized view opens, **Then** those of the ten leading choices
   whose share reads above 2%, and the viewer's own, are bars, and one row reads "Show all N choices".
3. **Given** that row, **When** it is tapped, **Then** the remaining bars appear in place, the card grows, the page
   scrolls, and the row reads "Show few choices"; tapping it again restores the shorter list.
4. **Given** the maximized view, **When** it opens, **Then** under the card there is one closed row for each of Notes,
   Who voted and Vote history that the poll has, in that order, each at least 64 px tall, and none for what it lacks.
5. **Given** a closed row, **When** it is tapped, **Then** its content opens in place under it; several rows may be
   open together; the Who voted report and the graph are fetched when their row is first opened.
6. **Given** the maximized view, **When** it is shown on a phone, **Then** it is a single column: the card, then the
   rows.
7. **Given** a maximized view opened from a card, **When** the visitor uses the phone's Back button or gesture,
   **Then** the view closes and the list is shown where it was.
8. **Given** a maximized view opened from a card, **When** the visitor taps the on-screen Back arrow or Minimize,
   **Then** the view closes in the same way, leaving no extra step in the Back history.
9. **Given** a poll opened from a shared link, **When** the visitor uses the phone's Back, **Then** the browser leaves
   as it does today; the on-screen Back arrow closes the view to the list.
10. **Given** the results side and the voting side of a maximized card differ in length, **When** either is shown,
    **Then** the card is as tall as the side being shown.

---

### User Story 4 - Every other page is readable and tappable on a phone (Priority: P2)

A person logs in, edits their profile, reads the privacy policy or, as a creator, runs the poll administration page on
a phone. Each page has the same header, the same column, cards of the same width and shape, text in the same sizes and
controls with the same touch size as the home page.

**Why this priority**: The redesign is of the whole site; a visitor crosses the login page to reach the polls, and
creators manage polls from their phones. It can be delivered page by page after the card.

**Independent Test**: On a phone, open each of the twelve pages and the admin wizard: none scrolls sideways; every
card is 448 px wide; no text is under 15 px; every control has a 64 px touch target; a poll can be created from
"Create New Poll" to Publish without zooming.

**Acceptance Scenarios**:

1. **Given** any page, **When** it is shown on a phone, **Then** its header, its single content column with 16 px
   gutters and its footer follow one frame, the same on every page.
2. **Given** a login, create-account, confirm-sign-in, invitation, accept-terms, not-authorized, profile or settings
   page, **When** it is shown, **Then** its card has the same width, padding and corner shape as a poll card.
3. **Given** a privacy or terms page, **When** it is shown, **Then** its text is in the phone body size across the
   content column.
4. **Given** the administration page, **When** it is shown, **Then** its cards are one per row in the same frame, its
   search form has one field per row, and every icon, menu item, state button and list row has a 64 px touch target.
5. **Given** the poll wizard, **When** a creator goes through its six steps on a phone, **Then** each step's fields and
   buttons are tappable without zoom and the poll can be saved or published.
6. **Given** either color scheme, **When** any page is shown, **Then** it uses the site's existing palette for that
   scheme.

---

### User Story 5 - The Poll Results page and its exports are gone (Priority: P3)

A poll's creator opens the administration page. The results icon and the "View Results" menu item are no longer on the
card, the page they led to no longer exists, and neither do the Export JSON and Export Markdown downloads. Everything
else on the card works as before.

**Why this priority**: It removes a leftover rather than adding value for visitors; it also means one page fewer to
redesign, so it is best done before Story 4 reaches the admin page.

**Independent Test**: As a creator, open an admin card: three icons and the menu remain, with no results entry; the
old results address and the three old data addresses answer "not found"; duplicating, copying the link, archiving and
deleting still work.

**Acceptance Scenarios**:

1. **Given** an admin card, **When** it is shown, **Then** it has no results icon and its menu has no "View Results".
2. **Given** the former results page address, **When** anyone requests it, **Then** the answer is "not found".
3. **Given** the former results, JSON export and Markdown export addresses, **When** anyone requests them, **Then** the
   answer is "not found".
4. **Given** the site, **When** its pages are counted, **Then** there are twelve.
5. **Given** the Who voted report on a poll card and the counts and invitee list on the admin card, **When** they are
   used, **Then** they work as before.

---

### User Story 6 - The developer validates the layout on real phones (Priority: P3)

The developer works through a written checklist on a fixed set of phones and browsers, on real devices and on
BrowserStack, and records each result.

**Why this priority**: The layout's quality cannot be established by automated tests; but the checklist needs the
layout to exist.

**Independent Test**: The checklist is filled in for every listed width and browser, in both color schemes, with a
result for every page and flow, and the two open questions from the fixed-viewport feature are answered.

**Acceptance Scenarios**:

1. **Given** the checklist, **When** it is run, **Then** it covers phones 320, 360, 375, 390 to 393, 412 and 430 to
   440 px wide, in Safari on iOS, Chrome on Android and Samsung Internet, in both color schemes.
2. **Given** each run, **When** a page is checked, **Then** the checklist records: no sideways scrolling; every control
   tapped at first try; no text under the minimum.
3. **Given** each run, **When** the flows are checked, **Then** the checklist records the compact card, the maximized
   view, a vote on a short poll, a vote on a 50-choice poll and the wizard from start to Publish.
4. **Given** one phone in landscape and one tablet, **When** they are checked, **Then** they show the site as before
   this feature, apart from the Back behaviour of Story 3.
5. **Given** the checklist, **When** it is complete, **Then** it says whether iOS zooms into a focused text field and
   whether a visitor's own text-size setting still takes effect.

---

### Edge Cases

- A multiple-choice poll: shares can add up to more than 100 %, so the "More choices" row gives no share.
- The viewer has voted for several choices outside the leaders: each is shown, so the card is taller by one bar each.
- A poll gains or loses votes while its card is showing: the leaders can change, and the bars shown follow.
- Votes arrive while a visitor is on a long ballot: the rows re-sort by share as they do today, so a row can move;
  a selection already made stays with its choice.
- A poll gains a choice (added by a voter) that takes it from five to six choices: the card changes from all bars to
  four and a "more" row.
- A card flipped to its voting side when a choice is added that no longer fits: the card stays on the side it is on;
  the next Vote follows the rule for the new number of choices.
- A choice label of the maximum 35 characters at the phone type size: it fits on one line of a bar with its percentage,
  or is cut with an ellipsis and shown in full in the maximized view.
- A title of several lines: the card shows at most three lines of it and the maximized view shows it whole.
- A placeholder card for a poll not yet published, a closed poll, a poll being edited and a blocked viewer: each keeps
  its present content, in the phone sizes.
- The Search tab, where cards have no Vote button: the "more choices" row and the maximized view work the same.
- The maximized view is open and the visitor changes tab, searches or logs out: the view closes as today, and Back
  does not afterwards reopen it.
- The visitor opens a maximized view, follows a link to another page and presses Back: they return to the list, not to
  a broken view.
- A desktop window dragged narrower than 480 px: the page keeps a 480 px width and scrolls sideways.
- A phone in landscape or a window between 481 and 639 px: today's phone layout shows, unchanged.
- The cookie notice, the bottom Submit bar and the Back-to-top control never cover one another or a card's controls.
- A visitor who uses the browser's own zoom: zoom keeps working everywhere.

## Requirements *(mandatory)*

### Functional Requirements

**Phone layout and sizing**

- **FR-001**: The new phone layout MUST apply at a layout width of 480 px and narrower, which is every phone in
  portrait; widths from 481 to 639 px MUST keep today's phone layout and 640 px and wider today's wider layouts.
- **FR-002**: In the phone layout the page MUST be at least 480 px wide; a narrower window scrolls sideways.
- **FR-003**: Every control in the phone layout MUST have a touch target of at least 64 × 64 px, and no two touch
  targets may overlap; a control's visible shape may be smaller, 48 px for buttons, chips and icon buttons.
- **FR-004**: Text in the phone layout MUST use the site's type scale enlarged by one quarter (body 18 and 20 px,
  labels 15 to 18 px, card titles 25 px), and no text may be smaller than 15 px.
- **FR-005**: The phone layout MUST NOT shrink controls or text below those sizes; the reductions today's phone layout
  applies do not apply in it.
- **FR-006**: The rules today's layouts apply only below 480, 360 and 320 px MUST be removed.
- **FR-007**: The phone layout MUST use the existing color palette in both the light and the dark scheme, and the
  existing design language for shape, emphasis and feedback.

**One frame for every page**

- **FR-008**: Every page MUST use one frame in the phone layout: the header, a single content column with 16 px
  gutters, the footer and the cookie notice, the same on every page.
- **FR-009**: Poll cards, admin cards and the cards of the sign-in, account and settings pages MUST share one card
  frame: 448 px wide, 20 px padding, 20 px corner radius, one card per row.
- **FR-010**: The legal pages' text MUST fill the content column in the phone body size.
- **FR-011**: The administration page MUST show its toolbar, view tabs, search form and cards in the frame, with one
  search field per row.
- **FR-012**: The poll wizard MUST be usable in the phone layout from its first step to Save and Publish, under
  FR-003 and FR-004.

**The compact poll card**

- **FR-013**: A poll card outside the maximized view MUST show the four leading choices by share, or every choice when
  the poll has five or fewer.
- **FR-014**: The card MUST also show every choice the viewer has voted for.
- **FR-015**: When choices are left out, the card MUST end its bars with one row reading "More choices", followed,
  on a single-choice poll, by their combined share (TWEAK07: the row no longer gives a count).
- **FR-016**: Tapping the card's title, bars, "more choices" row or notes line, or its Maximize control, MUST open the
  maximized view; the notes line opens it with the notes open.
- **FR-017**: The card MUST show at most three lines of the title, one line of the subtitle and one line of the notes.
- **FR-018**: Nothing MUST scroll inside a card.
- **FR-019**: The bars and the voting rows MUST stay ordered by share, largest first, on both sides and in both the
  compact card and the maximized view, re-sorted when the results refresh, as today.

**Voting**

- **FR-020**: The poll card MUST remain two-sided, with results on the front and voting on the back, in the compact
  card and in the maximized view.
- **FR-021**: On a card that shows every choice, Vote MUST flip the card in place.
- **FR-022**: On a card with choices left out, Vote MUST open the maximized view on its voting side.
- **FR-023**: The voting side MUST list every choice, each a row under FR-003.
- **FR-024**: While the maximized view's voting side is showing, Back and Submit MUST stay in a bar at the bottom of
  the screen, showing the number of choices selected; the bar sits above the cookie notice and the Back-to-top control
  is hidden while it shows.
- **FR-025**: Who may vote, what a vote does, removing a vote, adding a choice and every poll state MUST behave as
  today.

**The maximized view**

- **FR-026**: The maximized view MUST be a single column in the phone layout.
- **FR-027**: Its results side MUST show, when the poll has twelve or fewer choices, those whose displayed share is
  above 0% (all of them when none is); otherwise those of the ten leading choices whose displayed share is above 2%
  (all ten when none is); and in both cases the viewer's own (TWEAK05, on trial).
- **FR-028**: When choices are left out, one row MUST read "Show all N choices", followed on a single-choice poll by
  their combined share; it shows the rest in place and then reads "Show few choices", which restores the list of
  FR-027 (TWEAK07).
- **FR-028a**: A maximized view opened from the card's "More choices" row MUST instead show every choice whose
  displayed share is 1% or more (every choice when none is) and the viewer's own; when choices remain, one row MUST
  read "Remaining choices · 0%" and show them in place, after which the row reads "Show few choices" (TWEAK07).
- **FR-029**: Under the card there MUST be a tab bar styled as the Home tab bar, with the tabs Read More (the notes),
  Polling History (the vote-history graph) and Who Voted, in that order. One section MUST show at a time: the leftmost
  the poll has when the view opens, or the notes when the view is opened from the card's notes line. A tab whose
  section the poll lacks MUST be greyed out and do nothing; with none available all three are greyed out (TWEAK01).
- **FR-030**: The Who voted report and the vote-history graph MUST be fetched when their tab is first shown.
- **FR-031**: In the maximized view the card MUST be as tall as the side being shown.

**Back**

- **FR-032**: At every width, opening the maximized view from a card MUST add one step to the browser's history, so
  that the browser's or phone's Back closes the view and shows the list as it was.
- **FR-033**: Closing that view with the on-screen Back arrow, Minimize, Escape or the active tab MUST leave no extra
  step behind.
- **FR-034**: A poll opened from a shared link MUST add no step; Back leaves as today, and the on-screen Back arrow
  closes the view to the list.

**Removing Poll Results and the exports**

- **FR-035**: The Poll Results page MUST be removed, with the admin card's results icon and "View Results" menu item.
- **FR-036**: The results data, Export JSON and Export Markdown MUST no longer be served; their former addresses
  answer "not found".
- **FR-037**: The published description of the site's interface and the user and architecture documents MUST no longer
  describe the page or the exports.
- **FR-038**: The Who voted report, the admin card's counts and invitee list, and the developer's own data-extraction
  scripts MUST be unaffected.

**Validation**

- **FR-039**: The feature MUST include a written checklist covering the devices, browsers, color schemes, pages and
  flows of User Story 6, with a place to record each result and the two answers of its scenario 5.
- **FR-040**: The fixed 480 px layout rule itself MUST NOT change.

### Key Entities

- **Phone layout**: the arrangement and sizes used at 480 px and narrower; one frame, one card frame, one type scale,
  one touch-target minimum.
- **Compact card**: a poll card outside the maximized view; shows the essential bars.
- **Essential bars**: on the compact card, the four leaders (all if five or fewer) plus the viewer's own choices; in
  the maximized view, the ten leaders above 2% (if twelve or fewer, all above 0%; where none passes, all of them) plus the viewer's own.
- **"More choices" row**: the compact card's last bar row, standing for the choices left out; opens the maximized view.
- **Maximized view**: one poll alone in one column, with its extras behind a tab bar, one shown at a time.
- **Extras**: a poll's notes, its Who voted report and its vote-history graph.
- **Submit bar**: Back, Submit and the selected count, fixed at the bottom of the screen while voting in the maximized
  view.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a 390 × 844 phone, the first poll card of a home tab is wholly visible below the header and tab bar
  without scrolling, with the top of the second card showing, when the polls have two-line titles and no notes,
  whatever their number of choices.
- **SC-002**: A card for a poll of 6 to 50 choices is no taller than 500 px with a two-line title and no own vote
  outside the leaders; today the same card is 280 to 1,900 px.
- **SC-003**: On every remaining page, 100 % of controls have a touch target of at least 64 × 64 px and no text is
  smaller than 15 px.
- **SC-004**: No page scrolls sideways on any phone of the validation set.
- **SC-005**: A visitor can vote on a 50-choice poll in three taps after finding their choice (Vote, the choice,
  Submit) without scrolling to reach Submit.
- **SC-006**: A visitor can vote on a poll of five or fewer choices without leaving the card, as today.
- **SC-007**: From a maximized view opened from a card, one press of the phone's Back returns to the list at its
  previous scroll position, in 10 of 10 tries.
- **SC-008**: A creator can create and publish a poll on a 360 px phone without zooming.
- **SC-009**: The site has twelve pages, and the four former results and export addresses answer "not found".
- **SC-010**: A phone in landscape, a tablet and a desktop window of 481 px or wider show every page as before this
  feature, apart from Back closing the maximized view.
- **SC-011**: The validation checklist is complete for every listed width and browser in both color schemes.

## Assumptions

- "Phone" means a device held narrower than 480 px, which the fixed-viewport feature lays out at exactly 480 px; the
  design is judged at that width, in portrait.
- The combined share on the "more choices" row is given only for single-choice polls, where shares add up to 100 %.
- The viewer's own choices are shown after the leaders and in share order; they do not replace a leader.
- A choice label too long for its bar is cut with an ellipsis on a bar and shown whole on the voting side.
- The home page keeps its scrolling tab bar at the top; the header and tab bar stay fixed while the page scrolls.
- The maximized view at 640 px and wider keeps its present arrangement (every bar, extras in a panel, all open); only
  its Back behaviour changes there.
- Today's bar scrolling inside cards at 640 px and wider, with its "more choices" arrows, is unchanged.
- Closing the maximized view by changing tab, searching or logging out removes its history step or makes it harmless.
- No server data, setting or new address is added; the only server change is the removal of the four addresses.
- Automated tests that pin today's phone sizes, the page list, the results page and the "never touches the history"
  rule are rewritten to the new behaviour; the scaling and the feel of the layout are judged by the checklist.
- The requirements report's design section predates three decisions (where the layout applies, Back, and its widths);
  where they differ, the requirements document and this specification are right.
