# UI Contracts: Poll Settings Change

One surface changes: the Poll Edit Card on `/admin` (`src/public/adminCard.js`). The voter-facing
poll card, the home grid and the admin list shell are untouched.

## The mechanics row — editing form

Position: the existing `admin-field-row--mechanics` row, after `Choice Mode` and `Vote Mutability`.

| Order | Control | Caption | Options | Shown when | Frozen when |
|---|---|---|---|---|---|
| 3 | `pollVisibility` radio group | `Poll Visibility` | `Public Poll`, `Private Poll` | always | poll has ever been voted on |
| 4 | `pollSharingMode` radio group | `Sharing Mode` | `Anyone With The Link`, `Invitation Only` | current visibility selection is `Private Poll` | poll has ever been voted on |
| 5 | `voteAnonymity` radio group | `Anonymous Votes` | `Yes`, `No` | current visibility selection is `Private Poll` | poll has ever been voted on |

Rules:

- All three use the existing `radioGroup()` helper: a `fieldset` with a `legend`, a
  `role="radiogroup"` container with `aria-label` `"<caption> of poll: <title>"`, one native radio
  per option, the option text verbatim. Frozen groups render the current value as static text with
  the `is-frozen` class, exactly as `Poll Visibility` does today.
- Controls 4 and 5 sit inside one container element whose `hidden` attribute follows the
  visibility radio's *current selection in the draft*, not the saved poll. Toggling visibility
  sets `hidden` and nothing else — the two groups keep their selection.
- Pre-selection on reveal is the poll's stored value (or, for a poll that has always been public,
  the stored default `Anyone With The Link` / `Yes`).
- Changing any of the three calls `markDirty(field, value)`; hiding never calls it. The save
  payload carries a field only if it was changed.
- The existing visibility `onChange` behaviour — `applyVoterLimitAvailability(v)` and clearing the
  voter limit when `Public Poll` is chosen — is unchanged.
- Radio `name`s remain per-poll (`<field>-<pid>`) so two cards never share a group.

## The mechanics block — read-only form

Position: the existing `card-mechanics` block in `renderReadOnly()`.

| Order | Field | Shown when |
|---|---|---|
| 3 | `Poll Visibility` → stored value | always |
| 4 | `Sharing Mode` → stored value | `pollVisibility` is `Private Poll` |
| 5 | `Anonymous Votes` → stored value | `pollVisibility` is `Private Poll` |

Each uses the existing `readOnlyField(label, value, "card-field--stacked")`. Because both forms
show one field for a public poll and three for a private poll in the same block, switching forms
does not change the card's height (SC-005).

## The participants section

The client's `isInvitationOnly()` becomes
`session.poll.pollVisibility === "Private Poll" && session.poll.pollSharingMode === "Invitation Only"`.
Everything it drives is unchanged in behaviour: section caption `Invitations` vs `Participants`,
the empty-state text `No invitations yet.` vs `No participants yet.`, and whether the Invite row is
rendered.

## Messages on the card

Server refusals surface through the card's existing status line, verbatim:

- `pollSharingMode cannot be changed after the poll has received a vote.`
- `voteAnonymity cannot be changed after the poll has received a vote.`
- `Invalid pollSharingMode.` / `Invalid voteAnonymity.`

These can only be reached by a request that bypasses the frozen controls; the card itself never
sends a change to a frozen field.

## Keyboard and assistive technology

Inherited from `radioGroup()` and `readOnlyField()`: every new control is reachable by Tab, operable
by arrow keys within its group, labelled by its legend and `aria-label`, and — when frozen — read as
static text. Revealing the two groups does not move focus; the administrator's focus stays on the
visibility radio they just changed.

## Out of scope on this surface

- No change to the card header, the actions menu, the schedule, the choices editor, the voter limit
  field or the state row.
- No change to `pollCard.js` (voter-facing), `pollGrid.js`, `adminList.js` or `cardShell.js`.
- No new CSS class; `hidden` and the existing mechanics-row layout are sufficient.
