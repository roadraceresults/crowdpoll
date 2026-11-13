# UI Contracts: Remove Vote

## C1. The ballot's button (card back face)

| Poll | Selection | Viewer holds a vote | Button |
|---|---|---|---|
| any | non-empty | — | enabled, **Submit vote** (**Submit votes** on a multiple-choice poll), as today |
| any | empty | no | disabled, Submit vote / Submit votes, as today |
| Dynamic-Vote | empty | yes | **enabled, "Remove vote"** |
| any | any | viewer blocked (banned, not invited, full) | hidden, as today |

- "Holds a vote" means the card's `myChoiceIds` is non-empty, on a poll whose `voteMutability` is Dynamic-Vote.
- The label switches on every selection change, with no animation; the button's width does not change (C3).
- Un-setting some of several choices keeps "Submit votes" and submits a change, as today.
- A Final-Vote poll never shows "Remove vote": un-setting the recorded choice leaves the button disabled, and a
  submission is refused by the route as today.

## C2. After "Remove vote" is clicked

Exactly as after a vote, with one text:

1. the button is disabled while the request is out;
2. on success the card flips to its results face; the counts shown are the answer's (each former choice one lower,
   the total one lower); the front's Vote button is held for the vote floor; **"You voted"** is gone; the vote notice,
   on the count's line in the place "You voted" had (TWEAK01), reads **"Your vote was removed."**, or the existing
   queued notice when the answer's `status` is `"queued"`;
3. on `POLL_EDITING` (an answer the vote route does not give today, since a poll under edit serves its pre-edit state)
   the card keeps the (empty) selection, flips to the front and shows the editing message, as for a vote; on any other
   refusal the error is shown on the back face, as for a vote;
4. the next time the ballot opens, nothing is selected and the button is disabled (C1, row 2).

There is no confirmation step.

## C3. One width for three labels

Both primary buttons carry the same structure: a visible `.btn-vote-label` and two hidden `.btn-vote-sizer` spans,
stacked in one grid cell, so each button is as wide as the widest of its texts:

| Button | Label | Sizer 1 | Sizer 2 |
|---|---|---|---|
| front `.vote-btn` | Vote | Submit vote(s) | Remove vote on a Dynamic-Vote poll, else empty |
| back `.submit-vote-btn` | Submit vote(s) / Remove vote | Submit vote(s) | Remove vote on a Dynamic-Vote poll, else empty |

Screen readers hear the label only (`aria-hidden` on the sizers). The `[hidden]` rules that remove either button keep
working.

## C4. The personal tabs and the card's reasons

| Place | Before the removal | After |
|---|---|---|
| card front, `.poll-voted` | "You voted" | hidden, at once |
| Your Votes tab | lists the poll | the poll leaves on the tab's next refresh (the voter's tabs are refreshed by the consumer) |
| Home tab | lists the poll under "voted" | stays only if invited, linked, created or watched |
| Who Voted (creator) | lists the voter | no longer lists them; an invitee counts as not yet voted |
| Live results, maximized card, line graph | the vote | the lower counts; the graph's next point shows the drop |

A later vote restores every row to "before".
