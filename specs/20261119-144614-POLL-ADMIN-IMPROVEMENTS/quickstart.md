# Quickstart: Poll Admin Improvements

How to check the feature end to end. The contracts are [contracts/ui.md](contracts/ui.md) and
[contracts/api.md](contracts/api.md); the states are in [data-model.md](data-model.md).

## Automated

```
npx tsc --noEmit
npx vitest run tests/polls-entered-order.test.ts tests/polls-admin-can-watch.test.ts tests/openapi-contract.test.ts
npx vitest run tests/client-admin-rows.test.ts tests/client-admin-info.test.ts tests/client-admin-choices-field.test.ts tests/client-entered-order.test.ts
npx vitest run tests/client-admin-wizard.test.ts tests/client-admin-search.test.ts tests/client-admin-creator.test.ts tests/client-admin-discard.test.ts tests/client-admin-invitees.test.ts
npx vitest run tests/admin-search-assets.test.ts tests/m3-assets.test.ts tests/phone-sheets.test.ts tests/polls-discovery.test.ts
npm test
npm run build && npm run test:built
```

Expected: all pass. `npm run test:built` runs the client suites on the transformed `dist/public`.

## By hand

[ ] Start the app as usual (the local launch script) and sign in as an administrator. 
[ ] Have, in Newest: at least ten polls, among them: 
-  a draft (`INITIALIZED`), 
- an open public poll, 
- an open private link poll of your own, 
- an open private link poll of another account that you have never opened, 
- a poll with 50 choices. 
[ ] Have one poll in Awaiting Approval and none in Rejected. 
[ ] Have a second account that is a poll creator and not an administrator, with:
- one poll,  
- and a third with three.
[ ] Before changing any code, take a screenshot of Newest:
- at 1280 × 800 
- and at 400 px wide, for §1.

### 1. The lists (U1–U5, SC-001, SC-002)

- At 1280 × 800, Newest shows rows, no card. Count the polls visible without scrolling, and the same in the "before"
  screenshot: record both numbers against SC-001 (at least eight; at most two before). If they differ from the
  spec's, correct SC-001 to what was measured.
  Measured 2026-11-20: **after 8, before 2** — SC-001 holds as written. (T002's screenshots were skipped; the "before"
  count was supplied by the developer.)
- Click a row: its card opens under it. Click it again: it closes. Open one, then another: the first closes.
- Awaiting Approval, with its one poll, opens it by itself. Rejected shows "No rejected polls.".
- Wait for the approval sweep to approve the poll (about 5 s): at the next refresh its row is gone and the view says
  "No polls are awaiting approval.".
- Start Edit on a poll: every other row, the tabs and Create New Poll are disabled and say why. Cancel: they return.
- Start Edit again and click the poll's own row: the edit ends and the row closes. Start Edit, change something,
  click the row: "Discard changes?" asks; Keep editing keeps the change; click again and Discard: the row closes.
- Leave a card open for three refresh intervals: it does not close, move or lose focus.
- At 400 px: the same rows as the Search view's phone rows.

### 2. Create New Poll (U6)

From Search, press Create New Poll: the page is on Newest, the new poll's row is open and in view, and step 1 of the
wizard is showing. Cancel and delete the poll.

### 3. The creator's list (U1, U3)

Sign in as the creator with one poll: its card is open. As the creator with three: three rows, none open; Create
New Poll opens the new one.

### 4. The open-poll link (U7, SC-003)

- The open public poll and your own private poll have the round green icon to the left of their text; the draft and
  the other account's private poll have none, and their text starts at the same place as the others'.
- The icon is 36 px across (inspect it); the pointer and the focus ring cover 48 px.
- Hover: the tooltip "View Poll". Tab reaches it before its row; Enter follows it.
- Click it: the home page opens with that poll maximized. Back: Poll Administration, on the same view.
- Ctrl-click: a new tab; the list is unchanged.
- Start Edit on a poll, change its title, click another row's icon: the "Not Saved" dialog asks. Keep editing.
- Open the other account's private poll from its link in another tab; within one refresh its row gains the icon.
- At 400 px the icon is still 36 px and easy to hit; it does not overlap the title.
- Dark color scheme: the icon keeps its contrast.

### 5. The display order (U8, U15, SC-004)

- Create a private poll with the choices "1 Star", "2 Stars", "3 Stars", "4 Stars", "5 Stars". On step 3 the switch
  is off and reads "Off: choices are displayed from most votes to least votes.". Publish, and vote from two accounts
  so that "4 Stars" leads.
- The card and the Maximized view list by votes. Edit, turn the switch on, save: the open card on the other
  account's screen reorders to 1 … 5 without a reload; so do the Maximized view and the voting side.
- The line graph's legend and the who-voted report are in the order they had.
- On the 50-choice poll, note which choices the card and the Maximized view show, with the "More choices" and
  "Show all 50 choices" rows. Turn the setting on: the same choices and the same rows, in entered order. Press
  "Show all": all 50 in entered order.
- As a voter, add a choice to the five-star poll: it is last.
- Duplicate the five-star poll: the copy's switch is on.
- The card's Settings Summary reads "Choices are shown in the order entered."

### 6. Info icons and dialogs (U11, U12, SC-005)

- Walk steps 1 to 6: no "What does this mean?". Each label in U11's table has an "i" in a circle.
- At 1280 × 800 and at 400 px: every "i" is about 8 px after its label and on the label's first line, never on a line
  of its own; the switches sit below their label. Note any label that wraps (likely "Yes, as often as they like while
  the poll is open", and at 400 px perhaps "Users can see who voted for what" and "Display Choices in the order
  above") as a candidate for a shorter label.
- Press each: the dialog's title and text match FR-031; the setting beside it does not change.
- Step 1: every icon opens the same "Who can vote" dialog: the three options' entries, and on a private poll the
  "Users can see who voted for what" entry after them.
- Step 3: both icons open the same "Choices" dialog (on a public poll, only the display-order entry). Step 5: the four
  icons open the same "How to vote" dialog with four entries.
- Step 6: the three icons open the same "When to vote" dialog with five entries.
- Close with the button, with Escape, and by pressing outside: focus returns to the icon each time.
- At 400 px, the "When to vote" dialog scrolls inside itself and "Close" stays reachable.
- Press the label text and the support line of an option that has an icon: the option is selected.
- With a screen reader: each icon is announced "About: …, button"; the dialog is announced with its title.

### 7. The Choices step (U9, U13, SC-006)

- On the 50-choice poll, step 3 shows five lines and "... edit". It is no taller than on a five-choice poll.
- Press the lines: all 50, with Cancel and Done. Change one, Cancel, "Discard": unchanged. Change one, Done: kept.
- Open the list, change a line, press Next: the change is kept and step 4 shows.
- In the preview, copy three lines elsewhere and press "Paste choices": the counter rises by three, still a preview.
- Enter a duplicate and press Done: the duplicate message shows under the preview, and Publish refuses as before.
- New poll: the preview shows the starter choices; opening the list selects them, as before.
- Private poll: "Voters may add choices" is under "Display Choices in the order above", and step 5 has no switch.
  Public poll: step 3 ends with the display-order switch.
- On a poll with votes both switches can be toggled.
- Click in the empty part of the Choices box, the Notes box, and (on private polls) the Custom Email Message and Link
  Preview Message boxes: each opens as its "... edit" does.
- Step 6: click the "Poll ends on" support line: the option is selected and the date and time picker opens. On an
  open poll, clicking the greyed "Poll starts on" row does nothing.

### 8. Wording (U14)

Step 4 with manual colors on, and "Show the line graph" on: the two new sentences.

### 9. Unchanged (SC-008, SC-009)

Every card action (Duplicate, Copy poll link, Re-attempt Screening, Delete, Archive, state changes, invitees) works
from a card inside an open row. A poll that existed before the release looks the same to its voters.
