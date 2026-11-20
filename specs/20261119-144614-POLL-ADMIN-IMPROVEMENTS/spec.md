# Feature Specification: Poll Admin Improvements

**Feature Branch**: `poll-admin`

**Created**: 2026-11-19

**Status**: Draft

**Input**: User description: "requirements/20261119-144614-poll-admin-improvements/requirements.md": in Poll
Administration, draw every list of polls as the zebra-striped rows the Search view uses, with an icon on each row that
opens the poll itself; in the poll wizard, add a "Display Choices in the order above" setting, move "Voters may add
choices" to the Choices step, show the choices as a five-line preview that opens to edit, replace every "What does this
mean?" block with info icons that open a dialog, and reword two sentences on the View step.

## User Scenarios & Testing *(mandatory)*

In this document **Poll Administration** is the page where polls are created and managed. An **administrator** sees its
four views (Newest, Awaiting Approval, Rejected, Search); a **poll creator** who is not an administrator sees one list of
their own polls, with no views. A **row** is one line of a list, standing for one poll; the **card** is the Admin Poll
Card, which shows one poll's settings and actions and holds the **wizard**, the six-step editor (Who, Title, Choices,
View, How, When). The **Maximized view** is the full-page view of one poll on the home page. The **phone layout** is the
site at viewport widths of 640 px and less. An **info icon** is a lower-case "i" in a circle.

### User Story 1 - Scan any list of polls as compact rows and open one poll's card (Priority: P1)

An administrator opens Newest, Awaiting Approval or Rejected. Today each of these draws a full card per poll, so a
screen holds one or two polls. Now each draws the same compact, zebra-striped rows as the Search view: a poll's title
and subtitle, then its visibility, state, creator and voter count. Clicking a row opens that poll's card beneath it;
clicking it again, or another row, closes it. A poll creator's own list works the same way.

**Why this priority**: It is the largest change to how the page is used, it makes the four views behave identically,
and the open-poll icon of User Story 2 sits on these rows.

**Independent Test**: As an administrator, open each of Newest, Awaiting Approval and Rejected with several polls in
it; each shows rows and no card; clicking a row shows that poll's card under it, and every action that worked on the
card before still works.

**Acceptance Scenarios**:

1. **Given** an administrator and a view (Newest, Awaiting Approval or Rejected) holding two or more polls, **When**
   the view is shown, **Then** it shows one row per poll in one zebra-striped frame, laid out as the Search view's
   rows, and no card.
2. **Given** such a view, **When** the administrator clicks a row, or moves to it with Tab and presses Enter or Space,
   **Then** that poll's card opens directly beneath the row, and the row shows that it is open.
3. **Given** an open row, **When** the administrator clicks it again, **Then** its card closes.
4. **Given** an open row, **When** the administrator clicks another row, **Then** the first card closes and the other
   opens: at most one card is open.
5. **Given** a view holding exactly one poll, **When** the administrator selects that view's tab, **Then** the poll's
   row opens by itself.
6. **Given** an open row, **When** the list refreshes on its timer, **Then** the open card stays open, no other row
   opens, and no row the administrator is looking at changes place because of the card.
7. **Given** a poll that no longer belongs to the view after a refresh (for example, approved while Awaiting Approval
   is shown), **When** the list refreshes, **Then** its row, and its card if open, are removed, unless that poll is
   being edited, in which case its row stays where it is.
8. **Given** a poll being edited in its card, **When** the administrator looks at the list, **Then** every other row,
   the view tabs, Search and Clear are disabled and say "Finish editing the open poll first"; the poll's own row,
   pressed, acts as Cancel and then closes.
9. **Given** any view, **When** the administrator presses Create New Poll, **Then** the page moves to Newest, the new
   poll's row is open and scrolled into view, and its wizard has started.
10. **Given** a poll creator who is not an administrator, **When** they open Poll Administration, **Then** their own
    polls are shown as rows that behave as in scenarios 2 to 9, and a creator with exactly one poll sees its card open.
11. **Given** any view, **When** it is empty or holds more polls than it shows, **Then** it shows the same empty or
    cut-off message as before this feature; only the Search view shows a count of matches.
12. **Given** any viewport width, **When** a list is shown, **Then** it is drawn as rows; the phone layout uses the
    Search view's phone rows.

---

### User Story 2 - Open a poll as its voters see it, straight from the list (Priority: P2)

An administrator or poll creator wants to look at a poll itself, not its settings. Each row carries a round icon to
the left of its text; clicking it opens that poll in its Maximized view, at the same address the card's "Copy poll
link" copies.

**Why this priority**: It saves opening a card, copying a link and pasting it, which is how a poll is reached from this
page today. It depends on the rows of User Story 1.

**Independent Test**: In any view, click the icon on the row of an open public poll; the home page opens with that
poll maximized, and the browser's Back returns to Poll Administration.

**Acceptance Scenarios**:

1. **Given** a row whose poll the viewer can open, **When** the row is shown, **Then** a round icon, 36 by 36 px, is
   shown to the left of the row's text, as in the mockup (`image-3.png`), in the site's primary color with the mark in
   the color used on it.
2. **Given** such a row, **When** the viewer clicks the icon, **Then** the poll's Maximized view opens in the same
   browser tab, at the poll's link address (`/?PID=<poll id>`), and the row's card does not open or close.
3. **Given** the Maximized view opened this way, **When** the viewer goes Back, **Then** Poll Administration returns
   on the view tab it was on.
4. **Given** such a row, **When** the viewer opens the icon in a new tab by the browser's usual means, **Then** the
   poll opens there and Poll Administration is unchanged.
5. **Given** a row whose poll the viewer cannot open (it is not published, the viewer is banned from it, or it is a
   private poll the viewer does not already reach), **When** the row is shown, **Then** it has no icon, and the place
   is left empty so that every row's text starts at the same position.
6. **Given** a poll being edited with unsaved changes, **When** the viewer clicks any row's icon, **Then** the page
   asks before discarding the changes, as it does for every other link that leaves the page.
7. **Given** a screen reader or keyboard user, **When** they reach the icon, **Then** it is announced as a link named
   "View Poll: <the poll's title>", it shows the tooltip "View Poll", and Enter follows it.
8. **Given** the phone layout, **When** the icon is shown, **Then** its touch target meets the phone layout's size for
   targets while the icon itself stays 36 by 36 px.
9. **Given** every view, the Search view and the poll creator's list included, **When** rows are shown, **Then** the
   icon follows scenarios 1 to 8.

---

### User Story 3 - Show a poll's choices in the order they were entered (Priority: P2)

A poll owner writes choices that have a natural order: consecutive dates, "1 Star" to "5 Stars". Today the results are
always drawn from most votes to least, which scrambles them. On the Choices step the owner turns on "Display Choices in
the order above", and voters then see the choices in the order entered.

**Why this priority**: It is the one part of the feature that changes what voters see, and the only new setting.

**Independent Test**: Create a poll with the choices "1 Star", "2 Stars", "3 Stars", turn the setting on, publish, and
vote so that "3 Stars" leads; the card and the Maximized view list the choices 1, 2, 3. Turn it off; they list by
votes.

**Acceptance Scenarios**:

1. **Given** the Choices step of the wizard, **When** it is shown, **Then** a switch labelled "Display Choices in the
   order above" appears under the "Paste choices" caption, off for a new poll and for every poll that existed before
   this feature.
2. **Given** the switch off, **When** the owner reads the line under its label, **Then** it reads "Off: choices are
   displayed from most votes to least votes."; on, it reads "On: choices are displayed in the order entered above."
3. **Given** a poll with the setting on, **When** a voter sees its results on a card or in the Maximized view, at any
   width, **Then** the choices shown are in the order the owner entered them.
4. **Given** a poll with the setting on, **When** a voter sees its voting side on a card or in the Maximized view,
   **Then** the choices are in the order entered.
5. **Given** a poll with the setting off, **When** a voter sees it, **Then** every order is as before this feature.
6. **Given** a poll with the setting on and more choices than a card or the Maximized view shows at once, **When** it
   is shown, **Then** the choices kept are the same ones as with the setting off (the viewer's own choices and the
   leaders by share, with the same "More choices" and "Show all" rows), and those kept are drawn in the order entered.
7. **Given** a poll with the setting on, **When** its line graph or its who-voted report is shown, **Then** each keeps
   the order it had before this feature.
8. **Given** a poll with the setting on, **When** a voter adds a choice, **Then** the new choice is last in the order;
   the owner can move it by reordering the choices in the wizard.
9. **Given** a public or a private poll, with or without votes, **When** the owner opens the Choices step, **Then** the
   switch is available and can be changed.
10. **Given** voters with the poll on screen, **When** the owner saves a change to the setting, **Then** their cards
    take the new order without a reload, as they do for any other change to a poll's content.
11. **Given** a poll being edited, **When** a voter sees it, **Then** it keeps the order it had before the edit began
    until the edit is saved.
12. **Given** a poll with the setting on, **When** the owner duplicates it, **Then** the copy has the setting on.
13. **Given** a poll with the setting on, **When** its card's Settings Summary is shown, **Then** it says "Choices are
    shown in the order entered.", and pressing that part in the wizard goes to the Choices step; with the setting off
    the summary says nothing about order.

---

### User Story 4 - Read what a setting means from an info icon beside it (Priority: P3)

A poll owner unsure of a setting presses the info icon beside its label and reads a short explanation in a dialog. The
"What does this mean?" blocks at the foot of the Who, How and When steps, which listed every explanation together, are
gone.

**Why this priority**: It moves existing help to where it is needed and adds three explanations; no setting changes.

**Independent Test**: Walk the six steps of the wizard; no step shows "What does this mean?"; each label listed in
FR-031 has an info icon, and pressing it shows the dialog with that label's text and changes no setting.

**Acceptance Scenarios**:

1. **Given** the Who, How and When steps, **When** each is shown, **Then** it has no "What does this mean?" block.
2. **Given** the Who step, **When** it is shown, **Then** each of its three options has an info icon beside its label,
   and, on a private poll, so does "Users can see who voted for what".
3. **Given** the Title step, **When** it is shown, **Then** the "Notes" label has an info icon to its right.
4. **Given** the Choices step, **When** it is shown, **Then** "Display Choices in the order above" has an info icon at
   the end of its label, and, on a private poll, "Voters may add choices" has one to the right of its label.
5. **Given** the How step, **When** it is shown, **Then** each of its four options has an info icon beside its label.
6. **Given** the When step, **When** it is shown, **Then** "When does voting start?", "When does voting end?" and the
   time-zone line each have an info icon to their right.
7. **Given** any info icon, **When** the owner presses it, **Then** a modal dialog opens with a title, the text and one
   "Close" button, as FR-031 and FR-032 give them, and the setting beside the icon does not change.
8. **Given** the three info icons of the When step, **When** any of them is pressed, **Then** the same dialog opens,
   titled "When to vote", holding the five entries that "What does this mean?" held on that step. Likewise, any info
   icon of the Who, Choices or How step opens that step's one dialog, titled with the step's name ("Who can vote",
   "Choices", "How to vote"), holding every entry of that step.
9. **Given** an open dialog, **When** the owner presses "Close", presses Escape or presses outside the dialog, **Then**
   it closes and keyboard focus returns to the icon that opened it.
10. **Given** a step whose settings are locked (for example, because the poll has votes), **When** the owner presses an
    info icon, **Then** the dialog still opens.
11. **Given** a wizard with no unsaved changes, **When** the owner opens and closes a dialog, **Then** the wizard still
    has no unsaved changes.
12. **Given** a screen reader user, **When** they reach an info icon, **Then** it is announced as a button named
    "About: <the label beside it>".

---

### User Story 5 - Edit a long list of choices without it filling the step (Priority: P3)

A poll with thirty choices makes the Choices step very tall. Now the step shows the first five lines of the choices and
an "... edit" link, as the Notes field shows two lines; pressing the lines or the link opens the whole list to edit,
with "Cancel" and "Done" above it. "Voters may add choices" is on this step too, under the display-order switch, so
everything about the choices is in one place.

**Why this priority**: It tidies one step; nothing a poll can do changes.

**Independent Test**: Open the Choices step of a poll with eight choices: five lines and "... edit" are shown; press
the lines; all eight are editable with Cancel and Done above; change one and press Cancel; the change is gone.

**Acceptance Scenarios**:

1. **Given** the Choices step, **When** it is shown, **Then** the choices are shown as a preview of at most their first
   five lines, as plain text, followed by an "... edit" link with a chevron, whatever the number of choices.
2. **Given** a poll with no choices, **When** the step is shown, **Then** the preview shows the placeholder "Enter your
   choices here", and pressing it opens the list.
3. **Given** the preview, **When** the owner presses anywhere on its lines, or the "... edit" link, **Then** the whole
   list opens for editing, with "Cancel" and "Done" above it.
4. **Given** the open list with changes, **When** the owner presses "Done", **Then** the changes are kept and the
   preview returns.
5. **Given** the open list with changes, **When** the owner presses "Cancel", **Then** the page asks before discarding
   them, and on confirmation the list is as it was when it was opened and the preview returns.
6. **Given** the open list without changes, **When** the owner presses "Cancel", **Then** the preview returns without a
   question.
7. **Given** the open list, **When** the owner presses Next, a step circle, Save or Publish, **Then** it acts as "Done"
   first, and then does what it did before this feature, including refusing choices that break the rules.
8. **Given** the preview or the open list, **When** the owner presses "Paste choices", **Then** the clipboard's choices
   are appended as before, and a preview stays a preview.
9. **Given** the preview or the open list, **When** the step is shown, **Then** the count of choices ("n / max
   choices") and any error about the choices are shown beneath it.
10. **Given** a poll that has votes, **When** the Choices step is shown in the wizard, **Then** the link still reads
    "... edit" and the list opens for editing: the wizard opens only on a poll whose choices can change, with or
    without votes, so there is no read-only list.
11. **Given** a private poll, **When** the Choices step is shown, **Then** "Voters may add choices" is the last control
    of the step, under "Display Choices in the order above", with the same switch, the same lines under its label and
    the same effect as it had on the How step; the How step no longer shows it.
12. **Given** a public poll, **When** the Choices step is shown, **Then** it ends with "Display Choices in the order
    above"; "Voters may add choices" is not shown, as before.
13. **Given** a poll that has votes, **When** the Choices step is shown, **Then** neither switch on the step is
    disabled.
14. **Given** the card's Settings Summary, **When** the owner presses its "Voters may add choices" part in the wizard,
    **Then** the wizard goes to the Choices step.

---

### User Story 6 - Clearer sentences on the View step (Priority: P4)

Two sentences on the View step are reworded so that they say what happens.

**Why this priority**: Wording only.

**Independent Test**: Open the View step with "Select colors for the poll choices" on, and, as an administrator, with
"Show the line graph" on; read the two sentences.

**Acceptance Scenarios**:

1. **Given** the View step with manual colors on and at least one choice, **When** it is shown, **Then** the help line
   reads "Optional. Leave a choice on Automatic and an appropriate color is automatically assigned."
2. **Given** the View step with "Show the line graph" on, **When** it is shown, **Then** the line under the switch
   reads "On: the line graph is drawn on the Maximized view of a poll."

---

### Edge Cases

- A view holds exactly one poll after a refresh, without the administrator having selected the tab: the row does not
  open by itself; only selecting a tab, running a search or clearing one opens a single row.
- The new poll made by Create New Poll is not in the Newest list returned (the list could not be loaded): nothing opens
  and no wizard starts, as before this feature.
- A card that holds a new poll's saved wizard progress is closed and its row reopened: the progress is still there.
- A poll's title is empty: its row reads "(untitled)" and its icon is named "View Poll: (untitled)".
- A poll becomes openable, or stops being so, between two refreshes: its icon appears or goes at the next refresh, and
  the row's text does not move.
- The viewer follows an icon and the poll has since been deleted or closed to them: the home page shows what it shows
  for any such link.
- The setting "Display Choices in the order above" is on and two choices have equal votes: their order is the order
  entered, as for every other pair.
- The setting is on and the owner reorders the choices in the wizard: voters see the new order when the edit is saved.
- The setting is on for a poll with one choice, or none: nothing differs from off.
- The open list of choices holds a duplicate or an over-long choice when "Done" is pressed: the same error is shown as
  before this feature, under the preview, and Save and Publish refuse as before.
- The owner opens the list of choices, then presses an info icon: the dialog opens over the list, and closing it leaves
  the list open with its text unchanged.
- A dialog's text is longer than the screen in the phone layout: the dialog scrolls inside itself and "Close" stays
  reachable.
- A poll changes from private to public while the wizard is open: "Voters may add choices" and its info icon leave the
  Choices step, and "Users can see who voted for what" and its icon leave the Who step, as the switches do today.
- The line-graph switch is shown to administrators only, so only they see the reworded sentence of User Story 6.

## Requirements *(mandatory)*

### Functional Requirements

**The lists**

- **FR-001**: The Newest, Awaiting Approval and Rejected views, and the list a poll creator who is not an
  administrator sees, MUST show their polls as rows of the same content and appearance as the Search view's rows, at
  every viewport width, and MUST NOT show a card for a poll whose row is not open.
- **FR-002**: Clicking a row, or activating it from the keyboard, MUST open that poll's card directly beneath the row;
  activating an open row MUST close its card. At most one row is open at a time in the page.
- **FR-003**: A card MUST exist only while its row is open, except that a card holding a new poll's saved wizard
  progress MUST keep that progress while closed.
- **FR-004**: Selecting a view tab, running a search and clearing a search MUST close the open row, and MUST open the
  row by itself when the resulting list holds exactly one poll. On first arriving at the page, a list of exactly one
  poll MUST open its row.
- **FR-005**: The periodic refresh and the card's own actions MUST NOT open or close a row, and MUST NOT move the open
  card to another place in the list.
- **FR-006**: A poll that leaves the list shown MUST lose its row and its card, unless it is being edited, in which
  case its row MUST stay in place until the edit ends.
- **FR-007**: While a poll is being edited, every other row, the view tabs, Search, Clear and Create New Poll MUST be
  disabled, and the rows, tabs, Search and Clear MUST say "Finish editing the open poll first". The edited poll's own
  row MUST stay enabled, say "Cancel editing", and answer a click as the wizard's Cancel does ("Discard changes?" when
  something changed); once the edit has ended, the row MUST close (TWEAK09).
- **FR-008**: Create New Poll MUST move to the Newest view (the creator's list for a poll creator), open the new poll's
  row, scroll it into view and start its wizard.
- **FR-009**: Each view MUST keep the empty and cut-off messages it had; only the Search view shows a count of matches.
- **FR-010**: Every action available on a card before this feature MUST remain available on the card inside an open
  row, with the same result.

**The open-poll icon**

- **FR-011**: Every row, in every list including the Search view and the creator's list, MUST show the open-poll icon
  to the left of its text when the viewer can open the poll, and an empty place of the same size when they cannot.
- **FR-012**: The viewer can open a poll when the site's existing rule for watching a poll says so, unchanged by this
  feature: the poll is published, the viewer is not banned from it, and it is public or a private poll the viewer
  already reaches. The page MUST be told this for each poll in a list; it MUST NOT work it out itself.
- **FR-013**: The icon MUST be the mark in `launchPoll-circle.svg` (kept with the requirements), drawn at 36 by 36 px,
  its circle in the site's primary color and its mark in the color the site uses on primary. No request for an image
  file is added to the page.
- **FR-014**: The icon MUST be a link to the poll's link address, the one "Copy poll link" copies, which opens the poll
  in its Maximized view. It MUST open in the same browser tab, and MUST be separate from the row's own control, so
  that following it does not open or close the row.
- **FR-015**: The icon MUST have the accessible name "View Poll: <title>" (the title as the row shows it) and the
  tooltip "View Poll", be reachable by Tab and show keyboard focus.
- **FR-016**: The icon's touch target MUST be at least 48 by 48 px, and in the phone layout MUST meet that layout's
  target size, without enlarging the icon drawn.
- **FR-017**: Following the icon while a poll is being edited MUST go through the page's existing question before
  leaving; the icon has no rule of its own for an edit in progress.

**Display Choices in the order above**

- **FR-018**: Each poll MUST have a display-order setting with two values, off and on; it is off for a new poll and for
  every poll existing when the feature is released.
- **FR-019**: The Choices step MUST show a switch for it, labelled "Display Choices in the order above", under the
  "Paste choices" caption, with the line "Off: choices are displayed from most votes to least votes." or "On: choices
  are displayed in the order entered above." under its label.
- **FR-020**: The setting MUST be available on public and private polls and MUST stay changeable after votes and in
  every state in which the wizard can be saved.
- **FR-021**: With the setting on, the results and the voting side of the poll, on its card and in its Maximized view,
  at every viewport width, MUST list the choices shown in the order the owner entered them. With it off, every order is
  as before this feature.
- **FR-022**: The setting MUST NOT change which choices a card or the Maximized view keeps when it cannot show them
  all, nor the "More choices", "Show all" and "Show fewer choices" rows and their texts.
- **FR-023**: The setting MUST NOT change the line graph, the who-voted report, the link preview, any count or share,
  or any list of polls.
- **FR-024**: A choice added by a voter MUST take the last place in the entered order.
- **FR-025**: A saved change to the setting MUST reach voters who have the poll on screen as other content changes do,
  and while the poll is being edited voters MUST keep seeing the value it had before the edit.
- **FR-026**: Duplicating a poll MUST copy the setting.
- **FR-027**: The Settings Summary MUST say "Choices are shown in the order entered." when the setting is on and
  nothing about order when it is off; that part MUST lead to the Choices step wherever summary parts lead to steps.
- **FR-028**: The setting MUST NOT be a filter of the administrator's Search.

**Information dialogs**

- **FR-029**: The "What does this mean?" blocks of the Who, How and When steps MUST be removed. The short line under
  each option and switch stays.
- **FR-030**: Each info icon MUST be a button beside its label, a lower-case "i" in a circle in the label's color,
  named "About: <label>", with a touch target of at least 48 by 48 px (the phone layout's target size in that layout).
  Pressing it MUST NOT change the option or switch beside it, and MUST NOT mark the wizard as changed.
- **FR-031**: Pressing an info icon MUST open a modal dialog whose title and text are those of this table. Texts not
  quoted here are the texts the removed blocks show today, unchanged.

  | Step | Icon beside | Dialog title | Dialog text |
  |------|-------------|--------------|-------------|
  | Who | "Anyone you send the link to", "Only people you invite", "Everyone on CrowdPoll" and, on private polls, "Users can see who voted for what" (every icon of the step) | "Who can vote" | each option's label as a heading followed by its present entry, in that order; then, on private polls, "Users can see who voted for what" followed by its present entry |
  | Title | "Notes" | "Notes" | "The first lines of your notes appear under the title on the polls card. The entire notes appear on the Maximized view." |
  | Choices | "Display Choices in the order above" and, on private polls, "Voters may add choices" (every icon of the step) | "Choices" | "Display Choices in the order above" as a heading followed by "This toggle allows you to override the default order of the poll's choices, which is most votes to least votes." then "Using the order you enter the Choices makes sense when the Choices have a logical order, such as consecutive dates, or a sequence of numbers (1 Star, 2 Star, 3 Star, etc.)."; then, on private polls, "Voters may add choices" followed by "Off (the default): only you set the choices. On: anyone who may vote on your poll can add a choice while it is open, up to the most choices a poll may have. This is only available for Private polls." |
  | How | "One choice", "More than one", "Yes, as often as they like while the poll is open", "No, their first vote is final" (every icon of the step) | "How to vote" | each label as a heading followed by its present entry ("One choice", "More than one", "They can change their vote", "Their first vote is final"), in that order |
  | When | "When does voting start?", "When does voting end?" and the time-zone line (three icons) | "When to vote" | the five present entries, each heading followed by its text, in the present order |

- **FR-032**: The dialog MUST show its title, its text as plain text and one "Close" button; "Close", Escape and a
  press outside the dialog MUST close it and return focus to the icon that opened it. While it is open the page behind
  it MUST NOT be operable, and a text taller than the screen MUST scroll inside the dialog.
- **FR-033**: Info icons MUST stay usable on a step whose settings are locked.
- **FR-034**: An info icon MUST be shown only where its option or switch is shown.

**The Choices step**

- **FR-035**: The choices MUST be shown as a preview of at most their first five lines, as plain text, with a link
  reading "... edit" and a chevron, named "Edit choices"; an empty list shows the placeholder "Enter your choices
  here". The preview and the link are shown whatever the number of choices.
- **FR-036**: Pressing anywhere in the preview's box, its lines or the link MUST open the whole list for editing, with
  "Cancel" and "Done" above it (TWEAK06). The same holds for the Notes, Custom Email Message and Link Preview Message
  previews, which open their editor; a box whose link is disabled opens nothing.
- **FR-036a**: Pressing anywhere in the "Poll starts on" or "Poll ends on" row, the date box included, MUST select
  that option and open its date and time picker, where the browser offers one (TWEAK06); a disabled row opens
  nothing.
- **FR-037**: "Done" MUST keep the text and return to the preview. "Cancel" MUST restore the text as it was when the
  list was opened and return to the preview, asking first when the text changed.
- **FR-038**: Next, a step circle, Save and Publish MUST act as "Done" on an open list before doing what they do.
- **FR-039**: The rules for choices (one per line, no repeats, the longest label, the most choices) and their messages
  MUST be unchanged; the count of choices and any error MUST be shown under the preview and under the open list.
- **FR-040**: "Paste choices" and its caption MUST stay in both states and append as before; pasting MUST NOT open a
  preview.
- **FR-041**: The link MUST read "... edit" on every poll the wizard opens on, with or without votes. No read-only
  "... view" list is built: the wizard opens only on a poll whose choices can change (see Assumptions).
- **FR-042**: "Voters may add choices" MUST move from the How step to the Choices step, directly under "Display Choices
  in the order above", shown for private polls only as before, with its switch, its lines and its effect unchanged. The
  Settings Summary's part for it MUST lead to the Choices step.
- **FR-043**: Votes MUST NOT disable either switch on the Choices step. If the step is ever shown with its choices
  locked, the lock MUST cover the choices and "Paste choices" only.

**Wording**

- **FR-044**: On the View step, "Optional. Leave a choice on Automatic to color it for you." MUST become "Optional.
  Leave a choice on Automatic and an appropriate color is automatically assigned."
- **FR-045**: On the View step, "On: the line graph is drawn beside the poll when it is maximized." MUST become "On:
  the line graph is drawn on the Maximized view of a poll."

**Across the feature**

- **FR-046**: Everything added MUST be operable from the keyboard and announced by a screen reader with a name and a
  state, and MUST keep the site's contrast and focus indication.
- **FR-047**: The feature MUST NOT add a cookie, a stored browser value or a request to a third party, and MUST NOT
  change who may see, watch or vote on a poll.
- **FR-048**: The published description of the site's interface for other programs MUST include the display-order
  setting and the per-poll "can open" fact.

### Key Entities

- **Poll**: gains one setting, *display order* (off: by votes; on: as entered). Its choices already keep the order in
  which the owner entered them; "Voters may add choices" is an existing setting that only changes step.
- **Row**: one poll in a list of Poll Administration; closed, open (its card beneath it) or held (disabled while
  another poll is edited). Not stored.
- **Poll in a list**: gains one fact for the viewer, *can open*, decided by the site's existing rule for watching a
  poll.
- **Information dialog**: a title and a fixed text, opened from an info icon. Not stored.
- **Choices field**: a preview or an open list; in memory only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At 1280 by 800 px, Newest, Awaiting Approval and Rejected each show at least eight polls without
  scrolling, where each showed at most two before.
- **SC-002**: An administrator reaches any poll's card in one click from any of the four views, and the steps to do so
  are identical in all four and in the poll creator's list.
- **SC-003**: From a list, a viewer reaches a poll's Maximized view in one click, where it took opening the card,
  copying the link and pasting it before.
- **SC-004**: For a poll with the display-order setting on, 100% of the places listed in FR-021 show the choices in the
  order entered, and 100% of the places listed in FR-023 are unchanged; with it off, nothing a voter sees differs from
  before the feature.
- **SC-005**: No step of the wizard shows "What does this mean?", and every explanation those blocks held is reachable
  in one press from the label it explains.
- **SC-006**: With a poll of 50 choices, the Choices step is no taller than with a poll of five, until the list is
  opened.
- **SC-007**: Every control the feature adds can be reached and operated with the keyboard alone, and each is
  announced with a name by a screen reader.
- **SC-008**: Every action that could be taken on a poll from Poll Administration before the feature can still be
  taken, with the same outcome.
- **SC-009**: No poll existing at release looks different to its voters after the release.

## Assumptions

- The requirements document's "Resolved Findings" section governs wherever it differs from the text above it; this
  specification follows it (AM1 to AM6, UA1 to UA10, NC1, NC2).
- The rows keep the content, layout and widths the Search view's rows have today, at every width; the card inside an
  open row keeps its own width.
- The rule for "can open" is the existing one, as accepted in UA9: an administrator sees no icon on another person's
  private poll they do not already reach. Widening that rule is out of scope.
- What the home page shows when a poll's link is followed is unchanged; the icon only leads there.
- The voting side lists the choices today in the same order as the results; with the setting off it keeps whatever
  order it has.
- The requirements (AM2, UA8) spoke of choices "locked by votes" and of a "... view" link for them. Planning found
  that a poll's choices stay editable after votes (they change by id), and that the wizard opens only on a poll that can
  be edited or updated, so that state does not occur. The "... view" link is therefore not built (FR-041), and FR-043
  is worded for the case that does occur.
- `image-2.png` illustrates where "Voters may add choices" goes on the Choices step; `launchPoll.svg`, the mark without
  its circle, is not used.
- "Link Preview Message" and "Custom Email Message" on the Who step get no info icon: they had no entry in "What does
  this mean?".
- The line under the Notes field stays "Optional. Shown under the title on the poll card."
- Which row is open, whether the choices are being edited and whether a dialog is open are kept in memory only and are
  lost on reload.
- Out of scope: the Search view's form and filters, the card's read-only side and actions menu, the invitee list, the
  line graph, the who-voted report, the home tabs, and the profile, settings and legal pages.
- The earlier decision that only the Search view draws rows (the Admin Search Results feature) is superseded by this
  one; its other decisions about rows stand and now apply to every list.
