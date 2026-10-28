# Data Model: Live Results X

**Phase 1 output**. This feature stores nothing and changes no stored shape. There is no database
column, no cache key, no published object, no request or response field, and no configuration
setting. What follows is the only model it has: one control with two forms, and the rules that
decide which form is shown and whether it is shown at all.

## 1. The Live Results control

One element on the poll card's **front face**, in the left slot of the bottom row.

| Property | Add form | Remove form |
|---|---|---|
| Icon | three animated bars | a plain X, static |
| Visible label | `Live Results` | `Live Results` |
| Tooltip | `Add to Live Results` | `Remove from Live Results` |
| Accessible name | the visible label | `Remove from Live Results` |
| Action | adds the poll to the Live Results tab | removes the poll from the Live Results tab |
| Shown on | every tab but Live Results | the Live Results tab |
| Hover | the label's underline | the label's underline |
| Animation | the bars, unless reduced-motion or a guest | none, ever |

Selected by: whether the tab that owns the grid supplies a remove handler. No tab supplies both.

## 2. When the control is shown

| Poll state | Add form | Remove form |
|---|---|---|
| Open | shown | shown |
| Closed while watched | hidden | **shown**, with the "poll closed" note beside it |
| Being edited by an administrator | hidden | **shown**, with the editing note beside it |
| Viewer may not vote (removed, not invited, poll full) | shown | shown — the note withdraws Vote only |
| Card flipped to its voting face | not applicable — the control is front-face only | not applicable |
| The tab suppresses the link outright | hidden | not applicable |

## 3. Focus after a removal the member performed

| Situation | Focus target |
|---|---|
| A card now occupies the vacated position | that card's control |
| No card does, others remain (the bottom card was removed) | the previous card's control |
| No cards remain | the tab's empty-state line |
| The removal was refused or failed | unchanged — the control keeps focus |

Focus is never left on the document body.

## 4. What is removed

| Thing | Fate |
|---|---|
| The corner removal button and its icon | deleted from the card |
| Its two stylesheet rules (the corner nudge and its hidden rule) | deleted |
| The card option that showed it | deleted |
| The handler the tab supplied for it | kept — it is now the remove form's action |
