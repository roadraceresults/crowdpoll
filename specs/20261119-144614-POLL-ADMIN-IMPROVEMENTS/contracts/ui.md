# UI Contract: Poll Admin Improvements

The behaviour the client tests and the quickstart hold the implementation to. U1–U15 are checked by Vitest with jsdom;
U16 by reading the sheets; U17 by hand with the quickstart.

## U1. Every list is rows (FR-001, FR-009)

For each of Newest, Awaiting Approval, Rejected and the creator's list, with two or more polls:

- `#pollList` holds one `div.admin-result` per poll, in the list's order, each with its `button.admin-result-row`
  (`aria-expanded="false"`, `aria-controls` its panel) and a hidden `div.admin-result-panel`;
- `#pollList` holds no `.poll-admin-card`;
- the notice is the view's own: empty, cut-off, or nothing; "n polls match." in Search only.

## U2. Opening and closing (FR-002, FR-003)

| Action | Result |
|---|---|
| click a closed row | its panel is shown and holds one `.poll-admin-card`; `aria-expanded="true"`; `.admin-result--open` |
| click the open row | the panel is hidden and empty of cards; the card's controller is forgotten |
| click another row | the first closes, the other opens; exactly one `.poll-admin-card` in `#pollList` |
| close a row whose card holds saved wizard progress, then reopen it | the progress is still there |

## U3. Opening by itself (FR-004, FR-005)

- the page's first list, or a view tab selected, with exactly one poll: its row is open;
- the same with two or more polls: none is open;
- a refresh tick that leaves exactly one poll: nothing opens;
- a refresh tick with a row open: the same card element is still in the same panel.

## U4. Polls that leave the list (FR-006)

- a refresh without an open row's poll: the row and its card are gone;
- the same while that poll is being edited: its `div.admin-result` is still in `#pollList`, at its place.

## U5. Held during an edit (FR-007)

While a poll is being edited: every other `button.admin-result-row`, every other view tab, Search, Clear and
`#createPollBtn` are `disabled`; the rows, tabs, Search and Clear have the title "Finish editing the open poll
first". They are enabled again when the edit ends.

The edited poll's own `button.admin-result-row` stays enabled with the title "Cancel editing" (TWEAK09). A click on it
does what the wizard's Cancel does: with no change the edit ends at once; with a change "Discard changes?" asks, "Keep
editing" leaves the draft and the row as they were, and "Discard" ends the edit. When the edit has ended the row
closes and its button has the focus.

## U6. Create New Poll (FR-008)

From any view: the active tab becomes Newest; the new poll's row is open; its card is in wizard mode. For a creator
the same happens in their list. When the new poll is not in the list returned, no row opens.

## U7. The open-poll link (FR-011, FR-013–FR-017)

For a row whose poll has `canWatch: true`:

- `div.admin-result` holds one `a.admin-result-open`, a sibling of the row's button, not inside it;
- `href` is `/?PID=<encoded pid>`; no `target`;
- `aria-label` is `View Poll: <title>` (`View Poll: (untitled)` without a title); `data-tooltip` is `View Poll`;
- it holds one `svg` with `aria-hidden="true"`, a `viewBox` of `0 0 46 46`, and no `fill` or `stroke` attribute
  naming a color;
- clicking it does not change any row's `aria-expanded`;
- while another poll is edited it is not disabled, and a click is answered by the page's existing question.

For `canWatch: false` the row holds no `a.admin-result-open`. A refresh that flips `canWatch` adds or removes the link
without replacing the row's element. It is the same in every view, Search and the creator's list included.

## U8. The display-order switch (FR-019, FR-020)

On step 3, after the "Paste choices" caption:

- a switch (`role="switch"`) labelled "Display Choices in the order above", unchecked for a poll with
  `choicesInEnteredOrder: false`;
- its support line reads "Off: choices are displayed from most votes to least votes." or "On: choices are displayed
  in the order entered above.", and the switch is described by it;
- shown on public and private polls; enabled on a poll with votes;
- toggling it marks the wizard as changed, and the save sends `choicesInEnteredOrder`.

## U9. "Voters may add choices" on step 3 (FR-042, FR-043)

- private poll: step 3 ends with the display-order switch, then the "Voters may add choices" switch, with its two
  present support lines; step 5 holds no such switch;
- public poll: step 3 ends with the display-order switch;
- enabled on a poll with votes;
- with two switches on the step, focus stays on the one that was toggled.

## U10. The Settings Summary (FR-027, FR-042)

- once step 3 is answered and the poll is private: "Voters may add choices: Yes." or "No.", whose part goes to
  step 3;
- once step 3 is answered and the setting is on: "Choices are shown in the order entered.", whose part goes to
  step 3; no such line when it is off;
- the read-only card's summary shows the same lines.

## U11. Info icons (FR-029, FR-030, FR-033, FR-034)

- no step holds a `details.wizard-help` or the text "What does this mean?";
- each icon is on its label's first line, about 8 px after it, never on a line of its own; in a switch row the label
  and icon take the first line and the switch is on the second (TWEAK07);
- each of these has exactly one `button.wizard-info` named `About: <label>`, none of them inside a `<label>`:

| Step | Labels |
|---|---|
| 1 | the three options; "Users can see who voted for what" on a private poll only |
| 2 | "Notes" |
| 3 | "Display Choices in the order above"; "Voters may add choices" on a private poll only |
| 5 | "One choice", "More than one", "Yes, as often as they like while the poll is open", "No, their first vote is final" |
| 6 | "When does voting start?", "When does voting end?", the time-zone line |

- pressing one does not change the checked state of any control and does not mark the wizard as changed;
- pressing the label or the support line of a row that has an icon still switches its control;
- an icon on a disabled row is not disabled.

## U12. The information dialog (FR-031, FR-032)

Pressing an icon adds one `.modal-backdrop` holding a `.modal` with `role="dialog"` and `aria-modal="true"`, a
headline, the text and one button "Close", which has the focus.

- title and text are those of FR-031's table; every icon of step 1 gives the title "Who can vote" and the three
  options' labels as headings, then "Users can see who voted for what" on a private poll; every icon of step 3 gives
  "Choices" (the display-order heading over its two paragraphs, then "Voters may add choices" on a private poll);
  every icon of step 5 gives "How to vote" and its four labels as headings; the three icons of step 6
  give the title "When to vote" and five headings in today's order; "Voters may add choices" ends with "This is only available for Private polls.";
- Close, Escape and a click on the backdrop remove it and focus the icon that opened it;
- a second press while it is open adds no second dialog;
- the text is set as text: a string holding `<b>` is shown literally.

## U13. The Choices field (FR-035–FR-040)

Preview (the state the step opens in):

- at most the first five choices, one per line, as text; with no choices, "Enter your choices here";
- a button "... edit" named "Edit choices"; no `<textarea>`;
- the counter reads `n / max choices`; a duplicate among the choices shows its message under the preview.

| Action | Result |
|---|---|
| click anywhere in `.wizard-choices-preview` (the lines, the box around them) or "... edit" | a bar with "Cancel" and "Done" and the `<textarea>` holding every choice, focused; nothing while "... edit" is disabled |
| Done | the text is kept; the preview returns; focus on "... edit" |
| Cancel, text unchanged | the preview returns, no dialog |
| Cancel, text changed, then "Keep editing" | the list stays open with the changed text |
| Cancel, text changed, then "Discard" | the text is as it was when opened; the preview returns |
| Next, a step circle, Save or Publish with the list open | the text is kept and the list closed before the action runs |
| Paste choices in the preview | appended and deduplicated as today; still a preview; the same snackbars |
| Paste choices with the list open | as today |
| a switch toggled with the list open | the list is still open with its text |

On a poll with votes the link reads "... edit" and the list is editable (FR-041).

TWEAK06, the same box rule elsewhere (FR-036, FR-036a):

- a click anywhere in the `.wizard-notes-preview` of Notes, Custom Email Message or Link Preview Message opens its
  editor, as its "... edit" does; nothing while that button is disabled; the button stays the only tab stop;
- a click anywhere in the "Poll starts on" / "Poll ends on" `label.m3-radio-item`, or on its `datetime-local` input,
  selects that option (redrawing step 6) and calls `showPicker()` on the input named "Start date and time" / "End date
  and time"; a row whose radio is disabled does nothing; a browser without `showPicker`, or one that refuses it,
  keeps the selection only.

## U14. Wording (FR-044, FR-045)

Step 4 shows "Optional. Leave a choice on Automatic and an appropriate color is automatically assigned." and "On:
the line graph is drawn on the Maximized view of a poll."; the two sentences they replace appear nowhere in
`src/public/`.

## U15. The entered order on a card (FR-021–FR-024)

With choices A, B, C at positions 0, 1, 2 and shares 10, 30, 60:

| `choicesInEnteredOrder` | Results rows | Ballot rows |
|---|---|---|
| `false` or absent | C, B, A | as before this feature |
| `true` | A, B, C | A, B, C |

- maximized, phone and wide alike;
- a poll too long for the card or the view: the set of choices drawn, the last row's class and its text are the
  same with the setting on and off; only the order differs;
- "Show all N choices" then lists every choice in position order when on;
- a choice added through the add-a-choice dialog is drawn last when on;
- a pick on the ballot selects the choice of the row clicked (`data-choice-id`), whatever the order drawn (TWEAK03);
- with the setting off, the list drawn is the list `resultsView` returned before this feature.

## U16. Styles (FR-013, FR-016, FR-046)

- `admin-search-m3.css` styles `.admin-result-open` and its mark with M3 tokens only (primary and on-primary), a
  48 px box and a focus ring; `phone-admin-m3.css` gives it the 64 px halo under `max-width: 640px`;
- `admin-card-m3.css` styles `.wizard-info`, `.m3-row-heading`, `.wizard-choices-preview` and `.modal--info` with
  tokens only and no literal font size; `phone-admin-m3.css` gives `.wizard-info` its halo;
- no sheet holds a `.wizard-help` rule;
- `m3-assets.test.ts` and `phone-sheets.test.ts` pass; `LAYER_ORDER` is unchanged.

## U17. By hand

Sizes, colors, the dialog's scrolling, touch targets, Back from the Maximized view, and SC-001's counts: the
quickstart.
