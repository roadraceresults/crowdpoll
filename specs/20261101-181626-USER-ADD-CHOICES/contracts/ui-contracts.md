# UI Contracts: Voters Add Choices

## C1. The Add Choice button (voting face, `pollCard.js`)

- `<button class="add-choice-btn" type="button">Add Choice</button>` (no outlined button class exists on the home
  page; `add-choice-m3.css` styles it as an M3 outlined button from tokens) in the voting face's `.actions`
  row, between `.back-btn` and `.submit-vote-btn`; the row becomes a three-column grid
  (`auto 1fr auto`) with the button centred in the middle column, so `Submit vote` keeps its place and size.
- `hidden` unless `mayAddChoice(poll)`: `pollVisibility === "Private Poll"`, `votersAddChoices`, `pollState === "OPEN"`,
  `canVote !== false`, the session holds `Vote on Polls` and `View Polls` (or `Administrator`) — `View Polls` because
  the C2 prefetch answers `404` without it — and not
  (`voteMutability === "Final-Vote Poll"` and `myChoiceIds.length > 0` and not `ownPoll`). Guests never see it.
- Re-evaluated on every `applyPoll`, so a setting change or state change reaches it with the next refresh.
- One line at every width (`white-space:nowrap`); the row keeps its height (single-column layout included).

## C2. The press

1. The button shows a pending state (`aria-busy="true"`, disabled) and calls `GET /api/me/polls/:pid`.
2. Failure (network, non-2xx) → the card's message area: `Couldn't load the latest choices. Try again.`; no dialog.
3. Success → the answer's `poll`, `counts` and `overlay` are turned into a card detail exactly as `tabs.js`
   `mountLinkedPoll` does (a `DeltaClient.createTabState()` holding the three, then `DeltaClient.toPollDetail`), and
   that detail goes to `applyPoll` (the card shows the latest choices with their counts, selection kept); if
   `poll.choices.length >= maxChoices` → message `This poll already has the most choices allowed (<max>).`; no dialog.
4. Otherwise `AddChoiceDialog.open({ choices, maxLength: wizardChoiceMax, onSave })`.

## C3. The dialog (`addChoiceDialog.js`, `add-choice-m3.css`)

- `.modal-backdrop` > `.modal.add-choice-dialog[role=dialog][aria-modal=true][aria-labelledby]`, heading `Add Choice`.
- One outlined text field (`input type="text"`, label `Choice`) with `.m3-field-counter` reading `<n> / 40` and a
  supporting-text line that turns into the error line (`.is-error`, `aria-live="polite"`).
- `maxlength=40`; a paste is cut to fit; line breaks in pasted text become spaces before the cut.
- Typing a label that equals a listed choice under `normalizedChoiceKey` shows `This poll already has that choice.`
  under the field and disables Save; the server still decides.
- Save (filled) and Cancel (text), right-aligned; Save disabled while the trimmed text is empty, a duplicate, or a
  request is in flight.
- Focus moves to the field on open and returns to `.add-choice-btn` on close; Enter saves; Escape and Cancel close
  without saving; Tab is kept inside the dialog.
- A refusal (A1) shows its `error` under the field and keeps the text; `429` shows `Please wait a moment and try
  again.`
- Only M3 tokens in `add-choice-m3.css`; listed in `LAYER_ORDER` and on `index.html` after `tabs-modal-m3.css`.

## C4. After a successful save

- The dialog closes; the card applies `choices` from the answer (new choice last, unselected, `pendingSelection`
  kept) and stays on the voting face.
- The card hands the answer to the tabs (`opts.onChoicesAdded`, `tabs.js` `applyAddedChoices`): every tab's copy of
  the poll, and a retained maximized card, takes the new `choices` and `contentVersion`, so a vote for the new choice
  (rebuilt from the tab's copy) keeps it and shows its bar (TWEAK01).
- The browser console logs nothing.

## C5. Edit Poll Card (`adminCard.js`)

- **Setting**: in Step 5 (How), below vote mutability and only when `wizard.who !== "public"`, an M3 switch
  `Voters may add choices` (off by default), sent as `votersAddChoices` on save/publish; changeable after votes; shown
  in the Settings Summary as `Voters may add choices: Yes|No` for Private polls.
- **Limit**: the wizard's new-poll choice limit reads `runtime.wizardChoiceMax` from `/api/config` instead of its own
  `WIZARD_CHOICE_MAX`.
- **Added by**: in Step 3 (Choices), each line whose choice has `addedByName` shows `Added by <name>` under the
  Choices textbox, listed in choice order (the textbox itself stays plain text); a choice without `addedByName`
  shows no line (account deletion removes `addedBy`).
- **Save**: every `/save` and `/publish` carrying `labels` also sends `baseChoiceIds` = the ids of `session.poll.choices`.
