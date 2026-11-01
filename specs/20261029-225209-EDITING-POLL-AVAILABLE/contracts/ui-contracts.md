# UI Contracts: Editing an Open Poll Without Interrupting Voting

## C1. The Choices step keeps today's editor in every state

The textarea (`id="pollChoices-<pid>"`, `aria-label="Choices"`), the Paste choices button and the help text ("One choice per line. Press Enter after each choice." plus the emoji hint) are present and enabled in UPDATE mode. `lockStep(3)` no longer disables them for an ever-voted poll; no Add Choice / Delete Choice controls exist (IN1). The existing sanitize rules keep running: 100-character cap on an existing poll, max-count cap, blank-line removal, duplicate flagging that blocks leaving the step.

## C2. The merge and the deletion confirmation

- The diff is computed against the session-entry choices (`session.poll.choices`) by exact label match after trimming — the same rule as the server: matching line = survivor, new line = addition, missing label = deletion; an in-place rewording is a deletion plus an addition.
- The confirmation fires when the Choices section is left with at least one **voted** deletion pending; the exits are: a step circle / `goToStep` away from step 3, the Next button, and Save changes. Deletions where every deleted choice has zero votes never prompt.
- The dialog follows the `askToDiscard` pattern: `role=alertdialog`, `aria-modal`, headline "Delete choices with votes?", a list naming each voted deletion as "<label> — <N> vote(s)", buttons **Keep choices** (default focus) and **Delete**. Escape and the scrim mean Keep.
- **Delete** proceeds with the navigation or save. **Keep choices** (Cancel) restores the whole Choices textbox to its session-entry text and stays on the step (AM3's whole-section revert).
- A confirmed deletion set does not re-prompt on later exits while the diff's voted deletions are unchanged; changing the deletions re-arms the prompt.

## C3. The counts in the confirmation

The vote counts shown are the `choiceCounts` snapshot from the edit-session grant, taken when the card entered edit mode, held for the session's life, and never refreshed mid-session (UA3).

## C4. Step locks in UPDATE mode (ever-voted poll)

| Control | Before | After |
|---|---|---|
| Choices textbox + Paste choices | locked | editable (C1) |
| Sharing mode radios (Private poll: Invitation Only / Anyone With The Link) | locked | editable |
| Visibility radios (Public/Private) | locked | locked (unchanged) |
| Anonymity switch | locked | locked (unchanged) |
| Keywords | locked | locked (unchanged) |
| Choice mode radios | locked | one-way: on a Single-Choice poll both enabled; on a Multiple-Choice poll the Single option stays disabled with the LOCKED_BY_VOTES reason |
| Vote mutability radios | locked | editable |
| Title, subtitle, colors, line graph, end date | editable | editable (unchanged) |
| Start date | locked (LOCKED_START) | locked (unchanged) |

`canChange` must distinguish `pollSharingMode` and `voteMutability` from the fields they are grouped under today (`FIELD_OF` maps them to `pollVisibility`/`choiceMode`), and `lockStep` must lock per-control rather than per-step on steps 1 and 5. An open **never-voted** poll keeps the full EDIT-mode editor exactly as today.

## C5. The review note

The blanket note "Saving sends your poll to be reviewed again." is shown on an ever-voted poll only when the current diff contains a change that goes to review (title, subtitle or choices); otherwise it is hidden. (Today it shows even for colours-only saves — this contract replaces that inaccuracy for the UPDATE wizard.)

## C6. Pending and rejected status on the card

- While `pendingUpdate` is true, the read-only card header's state detail shows "changes pending review", and opening the editor is refused by the server (the card shows the refusal message as it shows LOCKED today). The admin list's existing auto-refresh (default 5 s) clears the status when the review resolves; approval adds no further notice.
- When `pendingRejectionReason` is set, the state detail shows "changes rejected: <reason>". The poll's state itself still reads OPEN (or its real state) — this is not the REJECTED poll state.

## C7. The voter card during editing

For a poll whose stashed state is OPEN, the voter card never shows "This poll is momentarily unavailable to cast a vote": the projection reports the stashed state, so the card renders as an ordinary OPEN poll with live vote controls while the creator edits and while changes await review. The `EDITING` branch of the card remains in the code but is unreachable through served projections.

## C8. The Save changes payload

`saveChanges` may now include `labels` (with aligned `colors`), `choiceMode`, `voteMutability` and `pollSharingMode` when they changed and `canChange` allows. The existing rules stay: only changed fields are sent, `colors` always accompanies `labels`, `clientGuid` and `timeZone` are always present, colours-only saves still route to `/colors`. After a save with `pending: true`, the card returns to the read-only face showing C6's pending status.

## C9. The editing banner on the wizard (TWEAK01)

While the wizard is open on an **existing** poll (an edit session granted by the server), the card's status line (`.card-status-line`, the same element that shows "Your poll is no longer being edited in this tab.") reads "Your poll is being edited in this tab. Poll State Is: EDITING." It appears when the session is granted, survives step changes, and is cleared when the wizard is left (Save, Save changes, Publish or Cancel); a lost session replaces it with the existing "no longer being edited" notice. A new poll's wizard shows no banner. Transient errors ("Could not save.", a server refusal) overwrite it for the rest of the session, as they do any status message.
