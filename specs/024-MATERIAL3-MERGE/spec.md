# Feature Specification: Material 3 Merge

**Feature Branch**: `024-MATERIAL3-MERGE` (already created; every step is committed on it, and it
reaches `dev` once, through one pull request after Step 6)

**Created**: 2026-10-01 (Steps 1–5); extended 2026-10-03 for Step 6, the admin cards

**Status**: Draft

**Input**: User description: "designDocs/024-high-level-requirements-MATERIAL3-MERGE.md"

**Source requirements**: `designDocs/024-high-level-requirements-MATERIAL3-MERGE.md` (with the
resolutions of both architecture passes)
**Architecture**: `architecture/024-material3-merge/architecture.md`. The first pass (Steps 1–5)
raised 25 findings and the second (Step 6) 5, all resolved; it documents 11 breaking changes, all
accepted.
**Design source**: the Material 3 prototypes in `prototypes/POLL-CARD-MATERIAL3/` and the decisions
recorded in their `iterative-requirements.md`.

## Clarifications

### Session 2026-10-01

- Q: What does reduced motion turn off? → A: The ripple, the entrance animations and the state
  transitions only; hover tints and the focus ring stay (as the prototypes do).
- Q: Which surfaces does the keyboard success criterion (SC-003) cover? → A: The five public pages,
  the admin pages' header and the Not Saved dialog; the rest of the admin content belongs to the
  later admin feature.

### Session 2026-10-03 (Step 6)

- Q: The wizard's keywords would be dropped by the server, which does not accept them when a poll
  is saved. Make them saveable, or leave the field out? → A: Make them saveable: the server
  accepts keywords on publish and save, with the wizard's rules, for public polls only (a fourth
  server change, no database change).
- Q: New polls are created Public, while the wizard's designed default is private. Default new
  polls to private? → A: No. New polls stay Public, and the wizard opens Step 1 on "Everyone on
  CrowdPoll".

### Session 2026-10-03 (after building Step 6)

- Q: A new poll's saved progress (current, visited and answered steps) is lost when the
  administrator switches admin views. Keep it, or narrow the promise to the current view? → A:
  Keep it across views for as long as the page stays open.
- Q: Publishing a poll that still has the starter choices holds it back as INITIALIZED, even an
  OPEN poll with votes. Fix it, or record it as a known limitation? → A: Fix it: the hold applies
  only to a poll that has not been published.
- Q: The removed edit face's style rules stay, unused, in the admin stylesheet. Remove them, or
  accept them? → A: Remove them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The home page looks and feels like one Material 3 product (Priority: P1)

A visitor opens CrowdPoll. The header, the search bar, the tab bar and every poll card use one
typeface, one type scale, one set of corner shapes and one way of responding to the pointer: a
hover tint, a focus ring and a press ripple on every control. The colours they knew stay the same:
the page background, the site's colour tokens and every poll's bar colours look exactly as before,
while controls take their Material 3 colours (the filled Vote button, for example, uses the M3
primary green). Short
messages, such as "You are refreshing too quickly.", appear as snackbars, and so does the cookie
notice. On a phone, the page uses its narrow padding and shows one card per row, as it was always
meant to.

**Why this priority**: It is most of the feature, and it is what every visitor sees.

**Independent Test**: Open the home page in light mode at desktop, 768px, 640px and 320px widths.
Compare it with the prototype pages: the header, tabs, cards (both faces) and the maximized view
match, and today's colours are unchanged.

**Acceptance Scenarios**:

1. **Given** the home page in light mode, **When** it is compared with today's page, **Then** the
   page background, the site's colour tokens (ink, paper, moss, line, track, choice colours) and
   every poll's bar fills, tracks and text are identical, and the type, shapes and controls,
   including their Material 3 colours, follow the prototypes.
2. **Given** any button, tab, icon control or vote row, **When** the visitor hovers, focuses it
   by keyboard, or presses it, **Then** it shows a hover tint, a visible focus ring, or a ripple
   respectively. With reduced motion requested, the ripple does not appear, while the hover tint
   and the focus ring still show, without transitions.
3. **Given** a multi-choice poll, **When** its voting face is shown, **Then** each choice shows a
   checkbox, and a single-choice poll shows radio buttons.
4. **Given** a window narrower than 640px, **When** the home page is shown, **Then** the page uses
   its narrow side padding and shows one card per row.
5. **Given** a notice that has no time limit, **When** it is shown, **Then** it offers a Close
   control, and screen readers announce it without moving focus.
6. **Given** the cookie notice is showing, **When** a snackbar appears, **Then** the snackbar
   sits above the cookie notice, not over it.

---

### User Story 2 - Keyboard and screen-reader users can reach everything (Priority: P1)

A keyboard user can open the profile menu from the header avatar and close it with Escape. A
"refused" message box announces its message and keeps Tab on its OK button. The Live Results
"continue?" prompt takes focus on Yes and gives it back afterwards. A guest who clicks a tab that
needs a sign-in is taken to the sign-in page, instead of the click doing nothing.

**Why this priority**: These are fixes to things that do not work today, found while prototyping.
They matter to every keyboard and screen-reader user.

**Independent Test**: With the keyboard only, open and close the avatar menu, dismiss a message
box, answer the idle prompt and activate a personal tab as a guest. Each works, and focus always
lands somewhere sensible.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they Tab to the avatar and press Enter, **Then** the menu
   opens, its state is announced as expanded, and Escape closes it and returns focus to the
   avatar.
2. **Given** a guest, **When** they click or activate Favorites, My Polls or another personal
   tab, **Then** they are taken to the sign-in page.
3. **Given** a guest hovering or focusing a personal tab, **When** the tooltip delay passes,
   **Then** "Sign in to use this tab" is shown.
4. **Given** a message box is open, **When** a screen reader reaches it, **Then** its message is
   the box's name; and Tab and Shift+Tab keep focus on OK.
5. **Given** the Live Results idle prompt appears, **Then** it reads "Do you want to continue to
   receive Live Results updates?", focus moves to Yes, and after Yes focus returns to where it
   was.
6. **Given** the idle prompt is showing over a maximized card, **When** the user presses Escape,
   **Then** the maximized view closes, as it does when no prompt is showing.

---

### User Story 3 - Tooltips that work everywhere (Priority: P2)

Every icon control explains itself in a Material 3 tooltip. It appears after a short hover, at
once on keyboard focus, and on a long press on a touch screen, where today nothing appears. A
result or vote label shows its full text in a tooltip only when the label is cut off.

**Why this priority**: It improves understanding on every surface, and it is the only way touch
users can read a control's purpose. It is less critical than the restyle itself.

**Independent Test**: Hover, focus and long-press each icon control on the home page; hover a short
label and a cut-off label in a poll card.

**Acceptance Scenarios**:

1. **Given** a control with a description, **When** the mouse rests on it for half a second,
   **Then** a tooltip appears just below it (or above it, near the bottom of the window), entirely
   inside the window, and the browser's own tooltip never appears.
2. **Given** a control with a description, **When** it receives keyboard focus, **Then** its
   tooltip appears at once.
3. **Given** a touch screen, **When** the user presses and holds a control with a tooltip for
   half a second, **Then** the tooltip shows for 1.5 seconds, the control is not activated, and no
   browser long-press menu opens.
4. **Given** a result or vote row whose label fits, **When** it is hovered, **Then** no tooltip
   appears. When the label is cut off, the tooltip shows the full text.
5. **Given** a tooltip is showing, **When** the user presses Escape, presses elsewhere, scrolls
   or resizes, **Then** it hides.

---

### User Story 4 - Sign-in, account and profile pages match the home page (Priority: P2)

Login, Create Account, Not Authorized and Profile use the same look as the home page:
underlined text fields, filled buttons, status lines in small text with the field showing an
error state when its status is an error. After saving a new user name, the user sees a "User name
saved" snackbar, since the inline "Saved." disappears as soon as the page refreshes the session.

**Why this priority**: These pages are visited less often than the home page, but they must not
look like a different site.

**Independent Test**: Visit each of the four pages, use each field and button, and save a new
user name on Profile.

**Acceptance Scenarios**:

1. **Given** the Profile page, **When** the user saves a new user name successfully, **Then**
   "User name saved" appears as a snackbar for 4 seconds.
2. **Given** the Profile page, **When** a save is refused, rate-limited or cannot reach the
   server, **Then** no snackbar appears and the status line reports the problem as today.
3. **Given** the snackbar is showing, **When** the user saves again successfully, **Then** the
   snackbar's 4 seconds start again.
4. **Given** a field whose status line reports an error, **Then** the field shows its error state.
   A field that has not been typed in shows no error state on load.
5. **Given** any of the four pages, **When** the user hovers the page title, **Then** it is not
   underlined and does not look clickable.

---

### User Story 5 - Administrators are asked before losing edits (Priority: P2)

An administrator editing a poll on the admin page clicks Cancel, or the back link, with unsaved
changes. Instead of the browser's plain "Any edits will be lost. Continue?" box, a page dialog asks
"Discard changes?", says "Your edits will be lost.", and offers **Keep editing** and **Discard**.

**Why this priority**: It replaces an off-brand browser box on the admin page. From Step 6, the
same dialog guards every Cancel on the admin cards (User Stories 7 and 8).

**Independent Test**: On the admin page, edit a poll's title, then try Cancel and the back link,
answering each way; repeat with no edits.

**Acceptance Scenarios**:

1. **Given** no unsaved edits, **When** the administrator clicks Cancel or the back link, **Then**
   it acts at once with no dialog.
2. **Given** unsaved edits, **When** the administrator clicks Cancel or the back link, **Then**
   the dialog opens with focus on Keep editing, and Tab moves only between its two actions.
3. **Given** the dialog is open, **When** the administrator chooses Keep editing, presses Escape
   or clicks outside the dialog, **Then** the dialog closes, the edits remain, and focus returns
   to the control that opened it.
4. **Given** the dialog is open, **When** the administrator chooses Discard, **Then** Cancel
   discards the edits, or the back link leaves the page, exactly as confirming does today.

---

### User Story 6 - Dark mode that follows the device (Priority: P3)

A visitor whose device is set to dark sees CrowdPoll in a dark scheme: dark surfaces, light text,
the logo recoloured, and every poll's bars keeping their fill colour on darker tracks with text
that stays easy to read. A visitor set to light sees the light site. The admin pages stay light
until they are restyled by a later feature.

**Why this priority**: It completes the look but depends on everything else being in place first.

**Independent Test**: Switch the device between light and dark and load every page.

**Acceptance Scenarios**:

1. **Given** a device set to dark, **When** any of the five public pages loads, **Then** it is
   shown in the dark scheme, with no light-only surface left on it.
2. **Given** a device set to dark, **When** a poll card is shown, **Then** each bar keeps its fill
   colour and its text reads at a contrast of at least 7:1 against its dark track.
3. **Given** a device set to dark, **When** an admin page loads, **Then** it is shown entirely in
   the light scheme.
4. **Given** a device set to light, **When** any page loads, **Then** it is shown in the light
   scheme.

---

### User Story 7 - Administrators set up a new poll in a guided wizard (Priority: P2)

An administrator clicks Create New Poll. The new poll's card opens a five-step wizard: Who can
vote, Title & Tags, Choices, How to vote, and When to vote. A row of five named circles shows
where they are, which steps they have visited, and lets them go back. Above it, a Settings Summary
describes the poll in plain sentences ("Your poll is a Private Poll. Anyone you send the link to
can vote. Votes are anonymous."), with each answered part underlined and tappable to return to its
step. They can Save to finish later, Cancel, or Publish once every step has been visited and the
poll is complete. A poll that is not being edited shows a redesigned read-only face: its state,
its action icons, two outlined panels (dates and counts), and the same Settings Summary, whose
last line says when voting opens and closes in words that match the poll's state.

**Why this priority**: It is the admin page's main redesign, and the new-poll flow is the one an
administrator uses most. It depends on Steps 1–5 being in place.

**Independent Test**: On the admin page, create a poll, walk through every step, Save, reopen it
from its summary, then Publish. Repeat with Cancel, with and without edits.

**Acceptance Scenarios**:

1. **Given** the admin page, **When** the administrator clicks Create New Poll, **Then** the new
   poll's card opens the wizard at Step 1, with Step 1 current and the other four circles not yet
   visited and inert.
2. **Given** the wizard, **When** the administrator presses Next, **Then** the next step opens and
   the step just left becomes a visited circle with a check mark, which can be tapped to return.
   Step 5 has no Next.
3. **Given** a new poll with a missing title, fewer than two real choices, or an invalid schedule,
   or with a step not yet visited, **Then** Publish looks disabled, does nothing when clicked, and
   its tooltip names what is missing, on hover, on keyboard focus and on a long press.
4. **Given** Step 3 holds two choices that differ only in capitals or spaces, **Then** Next, Save
   and Publish are blocked until the duplicate is removed; Cancel still works.
5. **Given** a complete new poll, **When** the administrator clicks Publish, **Then** the poll is
   sent for review and its card shows AWAITING APPROVAL.
6. **Given** a partly set-up new poll, **When** the administrator clicks Save, **Then** the
   answers are kept, the poll stays unpublished, and the read-only face shows the summary of the
   answered steps. Tapping a Summary Text link reopens the wizard at that part's step, with the
   progress kept; after a page reload it reopens at Step 1 with the saved answers.
7. **Given** unsaved changes in the wizard, **When** the administrator clicks Cancel, **Then**
   "Discard changes?" asks first (User Story 5); Discard returns to the read-only face with the
   poll as last saved, and the poll is never deleted.
8. **Given** Step 1 with a private option selected, **Then** a "Users can see who voted for what"
   switch is shown, off by default, and the Settings Summary's last Step 1 sentence follows it.
9. **Given** a new poll, **Then** "Who can vote?" starts at "Everyone on CrowdPoll" and "Can
   voters change their vote?" starts at Yes.
10. **Given** any poll's read-only face, **Then** its when-line uses "opened" only once the poll
    is open, closed or archived, and "closed" only once it is closed or archived, whatever the
    clock says.
11. **Given** a window 320px wide, **When** the wizard is shown, **Then** every step, the circles
    and the footer are usable without sideways scrolling.

---

### User Story 8 - Administrators edit an existing poll in the same wizard (Priority: P2)

An administrator wants to change a published poll. Instead of a separate editing face, they tap
the part of the Settings Summary they want to change. The wizard opens at that step with every
step visited. What the poll's state no longer allows is greyed, with one line saying why. The
footer offers Cancel and Save changes, and a line above it says that saving sends the poll back
for review.

**Why this priority**: Every existing poll must stay editable once the old editing face is gone.

**Independent Test**: For a poll in each state, with and without votes, check which Summary Text parts
are links, open the wizard from one, change it, and save.

**Acceptance Scenarios**:

1. **Given** a poll awaiting approval, archived, or being edited elsewhere, **Then** no summary
   part is a link.
2. **Given** a poll with no votes in an editable state, **Then** every Summary Text part is a link,
   except that the start can change only before the poll opens and the end only until it closes.
3. **Given** a poll with votes, **Then** only the title, subtitle and dates (by the same date
   rule) are links; who can vote, keywords, choices and how to vote are plain text and, in the
   wizard, greyed with their reason.
4. **Given** the wizard for an existing poll, **Then** Save changes is disabled until something
   valid has changed, and its tooltip says why.
5. **Given** a changed existing poll, **When** the administrator clicks Save changes, **Then**
   only the changed settings are sent, the poll goes back to AWAITING APPROVAL, and its read-only
   face shows no links while it waits.
6. **Given** another card is being edited, **Then** every other card's Settings Summary shows no links
   until that editor closes.
7. **Given** a poll's Voter Count Limit, invitation list or banned voter list, **Then** they are
   kept as stored but cannot be changed on the admin page until their own requirement (accepted).

---

### Edge Cases

- **Reduced motion**: no ripple, entrance animation or state transition plays; hover tints and
  focus rings still show, appearing at once.
- **A guest's personal tab by keyboard**: Enter or Space takes the guest to sign-in, as a click
  does.
- **A notice replaced while showing**: the new text replaces the old, and Close (if any) belongs
  to the new notice. If Close had focus when the notice hides, focus moves to the Refresh control.
- **A tooltip near a window edge**: it stays at least 8px inside the window, and moves above its
  control when there is no room below.
- **Moving the pointer from a control onto its tooltip**: the tooltip stays.
- **Long press on the Live Results link**: shows its tooltip; the browser's "open in new tab" menu
  no longer opens there (accepted).
- **A card inside a container that clips its content**: its tooltips are never clipped.
- **A user-name save while the cookie notice shows**: the snackbar sits above the notice.
- **Older browsers without the newest form-state features**: the status line still reports a field
  error; only the field's own error styling is missing (accepted).
- **Leaving the admin page another way** (reload, closing the tab, typing a new address): the
  browser's own leave-page prompt appears as today; pages cannot restyle it.
- **The admin page's other confirmations** (delete, archive): unchanged browser boxes, left to the
  later admin feature.
- **A device set to dark during the merge steps**: before Step 5, nothing turns dark;
  dark can be forced only by developers and tests.
- **A new poll left mid-wizard** (another card edited, another admin view chosen, the page
  reloaded, the session lost): its stored answers stay as last saved; its progress survives a
  view switch, and it reopens at Step 1 after a reload.
- **A published poll that still has the starter choices** (old data): saving it sends it for
  review like any other published poll; it is not returned to INITIALIZED.
- **The edit session is lost while the wizard is open**: the card returns to its read-only face,
  as the old editing face did, and nothing unsaved is stored.
- **Step 3 shrinks after Step 4 is answered**: under two choices, "More than one" is disabled
  and the poll is saved as one choice.
- **An end date in the past or a start not before the end**: Publish is blocked with its reason;
  a start in the past only shows a note.
- **An existing poll with a subtitle over 50 or a choice over 40 characters**: it is kept and can
  be saved as is; the shorter limits apply to new polls only.
- **Switching Step 1 between private and public**: the switch and keywords keep their wizard
  values; keywords are not saved with a private poll, and a public poll always saves anonymous
  votes.
- **The clipboard is refused** (Copy link, Paste choices): the link is shown selected to copy by
  hand, or the Choices box is focused with "Paste into the box instead".

## Requirements *(mandatory)*

### Functional Requirements

**Shared design**

- **FR-001**: The five public pages (home, Profile, Login, Create Account, Not Authorized) and the
  header of the two admin pages MUST use the Material 3 design of the prototypes: one colour-role
  system, the Roboto type scale, the corner shapes, the state layers (8% hover, 10% focus, 10%
  pressed) and the elevations recorded there.
- **FR-002**: In light mode, every production colour token (`--ink`, `--paper`, `--paper-raised`,
  `--moss`, `--line`, `--track`, `--choice-*`, `--muted`, `--shadow`) and every poll bar's fill,
  track and text colour MUST keep its current value. Components MUST take their Material 3 roles
  from the prototypes' light scheme (for example, the filled Vote button uses `primary`; the
  snackbars, dialogs, tonal and disabled controls and the focus ring use their M3 roles).
- **FR-003**: Every interactive control MUST show a hover tint, a 3px focus ring on keyboard focus,
  and a press ripple. When the user asks for reduced motion, the ripple, the entrance animations
  (snackbars, dialogs, the idle prompt) and the state transitions MUST NOT play, while the hover
  tint and the focus ring MUST still show. Disabled controls MUST show no state layer or ripple.
- **FR-004**: The poll card title MUST scale between 18px and 22px with the window width; bar
  labels and percentages MUST keep their current size scaling with bar height.

**Home page**

- **FR-005**: The header, search bar, tab bar, Refresh control, avatar and its menu, Log In, Create
  Account to Vote and Create Poll MUST take the prototypes' Material 3 forms.
- **FR-006**: The tab notice and the cookie notice MUST appear as snackbars. A snackbar MUST sit
  above the cookie notice while that is showing. Screen readers MUST announce the tab notice
  without focus moving.
- **FR-007**: A notice shown with no time limit MUST offer a Close control, which hides it. If
  Close has focus when the notice hides, focus MUST move to the Refresh control.
- **FR-008**: Poll cards (both faces) and the maximized view MUST take the prototypes' Material 3
  forms. A multi-choice poll MUST draw checkboxes and a single-choice poll radio buttons.
- **FR-009**: Below a 640px window width, the page MUST use its narrow padding and show one card
  per row.
- **FR-010**: The empty-tab line MUST be centred on every tab, as supporting text with no box,
  showing a focus ring only when focused by keyboard.
- **FR-011**: The message box (shown for refusals) MUST be named by its message, keep Tab and
  Shift+Tab on its OK button, and take the Material 3 dialog form.
- **FR-012**: The Live Results idle prompt MUST read "Do you want to continue to receive Live
  Results updates?", MUST be named by its text, MUST NOT block the rest of the page (so Escape still
  closes a maximized card), MUST move focus to Yes when shown, and MUST return focus after Yes.

**Accessibility fixes**

- **FR-013**: The header avatar MUST be a keyboard-operable control that announces that it opens a
  menu and whether the menu is open. Escape MUST close the menu and return focus to the avatar.
- **FR-014**: For a guest, the personal tabs MUST look disabled yet still receive pointer and
  keyboard focus. Activating one by click, Enter or Space MUST go to the sign-in page, and hovering
  or focusing one MUST show "Sign in to use this tab".

**Tooltips**

- **FR-015**: Every control that today carries a browser tooltip MUST show a Material 3 tooltip
  instead, and the browser's own tooltip MUST never appear. Tooltips MUST NOT be clipped by their
  card.
- **FR-016**: A tooltip MUST appear 500 ms after the pointer enters its control and hide 150 ms
  after the pointer leaves both the control and the tooltip; it MUST appear at once on keyboard
  focus; and Escape, a press, scrolling and resizing MUST hide it.
- **FR-017**: On touch, a 500 ms press on a control with a tooltip MUST show the tooltip for 1.5 s,
  MUST NOT activate the control, and MUST NOT open the browser's long-press menu.
- **FR-018**: A tooltip MUST sit centred 4px below its control, above it when there is no room,
  and at least 8px inside the window.
- **FR-019**: A result or vote row MUST show its tooltip only while its label is cut off.

**Card-shell pages**

- **FR-020**: Profile, Login, Create Account and Not Authorized MUST take the prototypes' forms:
  underlined text fields, current values shown as a label over the value, 40px filled buttons,
  outlined sign-in-provider buttons, status lines in small text, and an error state on a field
  while its status reports an error. An empty body MUST take no space. The page title MUST NOT
  underline on hover.
- **FR-021**: After a successful user-name save, Profile MUST show "User name saved" as a snackbar
  for 4 seconds. A further success while it shows MUST restart the 4 seconds. A refusal, a rate
  limit or a network failure MUST NOT show it. The inline status line MUST behave as today.

**Admin page**

- **FR-022**: Leaving an edited poll card on the admin page by Cancel or by the back link MUST ask
  "Discard changes?" / "Your edits will be lost." in a page dialog with **Keep editing** and
  **Discard**. Keep editing, Escape and a click outside MUST keep the edits; Discard MUST proceed as
  confirming does today. Focus MUST start on Keep editing, MUST stay on the two actions, and MUST
  return to the opener. With no edits, Cancel and the back link MUST act at once.
- **FR-023**: Apart from FR-022, the header and the admin cards (FR-032 to FR-047), the admin
  pages' content MUST NOT change.

**Admin cards (Step 6)**

- **FR-032**: Create New Poll MUST open the new poll's card in a five-step wizard at Step 1: Who
  can vote, Title & Tags, Choices, How to vote, When to vote. A poll MUST take this new-poll
  wizard while it is unpublished (INITIALIZED, including while being edited from INITIALIZED).
- **FR-033**: The wizard MUST show five named circles: the current step outlined, visited steps
  filled with a check mark and tappable to return, steps not yet visited inert. Only the current
  step's panel MUST show. Next MUST be the only way forward, MUST be absent on Step 5, and MUST be
  enabled except while Step 3 holds a duplicate choice. There MUST be no Back button.
- **FR-034**: The card MUST show a Settings Summary: the title and subtitle as on a Poll Card,
  then one plain-language line per answered aspect, in the present tense, addressed as "Your
  poll". A part MUST be a link (underlined, keyboard-operable with Enter and Space, wrapping as
  text) only once its step is answered and only when FR-041 allows; activating it MUST open that
  step.
- **FR-035**: Step 1 MUST offer, private first: "Anyone you send the link to", "Only people you
  invite", "Everyone on CrowdPoll", with "What does this mean?" help. A Copy link control MUST
  show under the first option, with the note that the link works once the poll is published,
  and MUST confirm with a "Link copied" snackbar. While a private option is selected, a "Users can
  see who voted for what" switch MUST show, off by default, and MUST be stored as the poll's
  anonymity setting; a public poll MUST save anonymous votes. Who sees who voted for what MUST
  stay as today (administrators only).
- **FR-036**: Step 2 MUST offer Title (required, up to 100 characters, opening selected so typing
  replaces the default), Subtitle (optional, up to 50 for a new poll) and, for a public poll only,
  Keywords as chips (lower-case letters, digits and spaces, no duplicates, 200 characters in
  total). The default title MUST count as no title. Enter MUST move to the next field, and pasted
  line breaks MUST become spaces. Keywords MUST be stored with a public poll when it is published
  or saved, checked by the same rules on the server, and MUST make it findable by them in search;
  a private poll MUST store none. Like the other settings outside FR-041's list, keywords MUST NOT
  change once the poll has votes.
- **FR-037**: Step 3 MUST take one choice per line, start empty for a new poll (the starter
  choices count as none), cap each choice at 40 characters for a new poll, refuse blank lines,
  stop at the maximum number of choices, treat choices differing only in capitals or spaces as
  duplicates, and offer Paste choices, which adds clipboard lines and drops repeats with a
  snackbar. The Title and Choices help MUST give the device's emoji shortcut on computers.
- **FR-038**: Step 4 MUST ask "How many choices can each voter pick?" (One choice / More than one)
  and "Can voters change their vote?" (Yes, the default / No). "More than one" MUST save a
  multiple-choice poll on which voters pick 1 to all choices, as today; a range or exact number
  is out of scope.
- **FR-039**: Step 5 MUST ask when voting starts (immediately, or on a date and time pre-filled to
  tomorrow 9:00) and ends (no end date, or a date and time pre-filled to 7 days after the start),
  in the browser's time zone, which it names. A start not before the end, or an end in the past,
  MUST block Publish with its reason; a start in the past MUST only show a note.
- **FR-040**: The new-poll footer MUST be Cancel, Save and Publish.
  - Publish MUST be allowed only when all five steps have been visited, the title is set, there
    are at least two real choices and the schedule is valid. While blocked it MUST look disabled,
    remain focusable, do nothing when clicked, and name what is missing in its tooltip. Publish
    MUST send the poll for review (AWAITING APPROVAL).
  - Save MUST store the answers and leave the poll unpublished, without sending it for review,
    and MUST work while the poll still holds its defaults. The progress (current, visited and
    answered steps) MUST be kept while the page stays open, including when the administrator
    switches admin views or the poll leaves the current view and comes back.
  - Cancel MUST discard the changes since the last Save, through FR-022's dialog when there are
    any, and MUST never delete the poll.
- **FR-041**: For a poll that is not in its new-poll wizard, a Summary Text part MUST be a link only
  when its setting can change in the poll's state, and no other card is being edited:
  - nothing while AWAITING APPROVAL, ARCHIVED, or being edited elsewhere;
  - with no votes, every setting; with votes, only the title, subtitle and dates;
  - the start only before the poll opens (INITIALIZED, REJECTED, WAITING TO OPEN), and the end
    only until it closes.
- **FR-042**: A link on an existing poll MUST open the wizard at its step with every step
  visited; settings that cannot change MUST be greyed with one line saying why. The footer MUST be
  Cancel and Save changes. Save changes MUST be blocked (as in FR-040) until something valid has
  changed, MUST send only the changed settings, and MUST send the poll back to AWAITING APPROVAL,
  which a line above the footer states. An existing poll's stored subtitle and choices MUST NOT be
  cut by the new-poll limits.
- **FR-043**: Only one card MUST be editable at a time. While any card is in its wizard, every
  other card's Settings Summary MUST show no links. After Save, Cancel or a lost session, focus MUST go to
  the card's first link.
- **FR-044**: The read-only face MUST show, in one column: the poll's state (with its approval
  wait, rejection reason or Re-attempt Screening as today) and its action icons as 40px icon
  buttons, with no pen; an outlined panel with Open, Close and Archive and the Created and
  Launched dates; an outlined panel with the vote, invitation (invitation-only polls) and banned
  voter counts; and the Settings Summary. The old two-column fields MUST be removed.
- **FR-045**: The Settings Summary's last line MUST be worded by the poll's state first, then its dates:
  "opened" only once OPEN, CLOSED or ARCHIVED, "closed" only once CLOSED or ARCHIVED, and an
  EDITING poll worded as its state before editing. Dates MUST read like "on Sat, Oct 3 at
  9:00 AM", with the year when it is not the current year.
- **FR-046**: Every admin card MUST be fluid and capped at 420px, and the wizard MUST work down to
  a 320px window.
- **FR-047**: New polls MUST default to letting voters change their vote. Their visibility default
  MUST stay Public, as today, so the wizard MUST open Step 1 with "Everyone on CrowdPoll"
  selected; the radio list's order (private first) is unchanged.
- **FR-048**: Each poll's Voter Count Limit, invitation list and banned voter list MUST keep its
  stored value and its effect on voting. The admin page MUST NOT offer a way to change them until
  their own requirement (accepted breaking change).
- **FR-049**: Publishing (Publish or Save changes) MUST hold back a poll whose choices are still
  the starter choices only when the poll has not been published (it is INITIALIZED, or being
  edited from INITIALIZED). A published poll MUST be saved and sent for review like any other,
  and MUST never return to INITIALIZED.
- **FR-050**: The admin stylesheet MUST NOT keep rules that nothing on the two admin pages uses:
  those of the removed editing face (for example its voter limit field, participant lists,
  settings radio groups and choices editor) and older leftovers of the admin list. The admin
  pages' look MUST be unchanged by their removal.

**Dark mode**

- **FR-024**: Once released, the five public pages MUST follow the device's light or dark setting.
  There MUST be no theme picker in the product.
- **FR-025**: In dark mode, each bar MUST keep its fill colour, with its track and text recomputed
  so the text reads at a contrast of at least 7:1; Yes/No keep their colours. The logo MUST be
  recoloured for the dark surface.
- **FR-026**: The two admin pages MUST stay in the light scheme whatever the device setting, until
  the later admin feature restyles them.

**Delivery**

- **FR-027**: The feature MUST be built in six steps (foundation; header, tab bar, notice,
  dialogs and tooltips; poll card; card-shell pages; dark mode; admin cards), each committed on
  the feature branch with its own automated tests. Production MUST receive the feature only once,
  through one reviewed merge after the sixth step, so no user sees a partly restyled or partly
  dark site.
- **FR-028**: The first step MUST cause no visible change.
- **FR-029**: Before release, every page MUST pass the browser checklist in the source
  requirements, in both schemes, at 320px, 640px, 768px and desktop widths.
- **FR-030**: Existing automated tests that read today's inline bar colours, the guests'
  disabled tabs, the old idle-prompt text or the admin card's old editing face MUST be updated or
  retired by name, and new tests MUST cover each behaviour in FR-006 to FR-022, FR-026 and
  FR-032 to FR-050, including the saving of a new poll without publishing.
- **FR-031**: The README and the architecture overview MUST describe the new look, and the 021
  records that describe inline bar colours MUST be annotated to point to this feature.

### Key Entities

- **Colour scheme**: light (today's colours plus the Material 3 light roles) or dark (the Material 3
  dark roles); chosen by the device setting, except on the admin pages, which stay light.
- **Bar colour set**: for each of the 50 palette fills, a light track and text colour (unchanged
  from 022) and a dark track and text colour (new, at least 7:1).
- **Tooltip text**: the description each control already carries; shown by the new tooltip rather
  than by the browser.
- **Poll settings (admin cards)**: the existing poll's who-can-vote, anonymity, title, subtitle,
  keywords, choices, choice mode, vote changes and schedule, presented as five wizard steps; their
  stored values are unchanged in meaning.
- **Wizard progress**: the current, visited and answered steps of a new poll; kept in the open
  page only, across admin views.
- **Poll state before editing**: the state a poll had when its editing began; used to word the
  when-line and to recognise a new poll that is being edited.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the site's light-mode colour tokens, and all 50 bar fills with their tracks
  and text colours, are identical before and after the feature; components show the prototypes'
  Material 3 colours.
- **SC-002**: Every one of the 50 bar fills has dark-mode text at a contrast of 7:1 or more against
  its dark track.
- **SC-003**: 100% of interactive controls on the five public pages, in the admin pages' header and
  in the Not Saved dialog can be reached and operated by keyboard alone, and each shows a visible
  focus indicator. The admin pages' other content is measured by the later admin feature.
- **SC-004**: A guest activating a personal tab reaches the sign-in page in 100% of attempts, by
  click and by keyboard.
- **SC-005**: The browser's own tooltip appears on 0 controls, and the tooltip appears within half
  a second of hovering, at once on focus, and after half a second's press on touch.
- **SC-006**: Every item of the browser checklist passes, on every page, in both schemes, at all
  four widths.
- **SC-007**: No user ever sees a partly restyled or partly dark site: production changes once.
- **SC-008**: Users can still vote, search, change tabs, maximize cards, use Live Results, sign in,
  create an account and edit their profile exactly as before, with the whole automated test suite
  passing.
- **SC-009**: No configuration or database change is made. The only server changes are Step 6's:
  the new-poll default, the poll's state before editing in the admin list, saving a new poll
  without publishing, accepting a public poll's keywords, and limiting the starter-choices hold
  to unpublished polls; each is described in the API description.
- **SC-010**: An administrator can set up and publish a new poll from Create New Poll using only
  the wizard, in under 3 minutes, at 320px and at desktop widths.
- **SC-011**: For every poll state, with and without votes, 100% of the Summary Text parts shown as
  links open a step whose setting can change, and no setting that cannot change is offered.
- **SC-012**: A new poll saved part-way keeps 100% of its answers after a page reload.
- **SC-013**: Every control on the admin cards can be reached and operated by keyboard alone,
  with a visible focus indicator.

## Assumptions

- The prototypes are the design source of truth; where this spec and a prototype differ, the
  prototype's recorded decision holds. Every prototype listed as a prerequisite is finished.
- Supported browsers are current evergreen browsers. Where a browser lacks the newest form-state
  features, only the field's own error styling is lost (FR-020).
- There is one dark scheme, chosen by the device. The prototypes' theme switch is kept only as a
  developer and test aid, and to keep the admin pages light (FR-026).
- The Fraunces and Inter typefaces stay loaded for the content not yet restyled (the admin pages'
  own content).
- The poll bar palette, its order, the Yes/No colours and 022's per-poll starting colour are
  unchanged.
- The admin cards stay on the admin page, for administrators only; poll creation for every user
  is a later feature.
- The wizard's shorter limits (subtitle 50, choice 40), the case-insensitive duplicate rule and
  the "end in the future" rule are checked in the browser for new polls; the server keeps today's
  rules.
- Out of scope: poll creation for non-administrators and the tabs it brings; a choice range or
  exact number on Step 4; changing the Voter Count Limit, invitations and bans in the wizard; the
  admin toolbar, search, back link, list notices and results page; the admin page's other
  confirmations (delete, archive); a user-facing theme picker; a new light-on-dark logo; the
  browser's leave-page prompt; any configuration or database change, and any server change beyond
  Step 6's five. These belong to the later admin feature (025 or later).
