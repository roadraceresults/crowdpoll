# Quickstart: Editing an Open Poll Without Interrupting Voting

Validation scenarios proving the feature end-to-end. Contracts: [contracts/api.md](contracts/api.md), [contracts/ui-contracts.md](contracts/ui-contracts.md); shapes: [data-model.md](data-model.md).

## Prerequisites

- Local PostgreSQL with the `app01` database migrated (`npm run dev` runs migrations at start-up).
- Two browsers (or one normal + one private window): **Creator** signed in as the poll's creator, **Voter** signed in as another allowed account.
- Launch: `devScripts/launch-dev.ps1` (sets `ENV_*`). Helpful test values: `ENV_POLL_APPROVAL_SWEEP_INTERVAL=5000` (default), `ENV_MIN_CHOICES=2`.
- A published, OPEN poll **with at least one vote** (vote once as Voter). For a quick fixture-rich poll: `npm run populate -- <file.json>` style via `devScripts/populate/populate-poll.ts`.

## Automated validation

```
npx tsc --noEmit
npm test
npx vitest run tests/polls-pending-update.test.ts tests/polls-editing-lock.test.ts tests/polls-screening.test.ts tests/client-admin-wizard.test.ts
```

## Scenario 1 — Voting stays available while editing (US1, SC-001/SC-002)

1. Creator: open the Admin Poll Card on the open, voted poll (edit session taken; the card's status line shows "Your poll is being edited in this tab. Poll State Is: EDITING.").
2. Voter: reload the home page — the poll is still listed, the card shows vote controls, **no** "momentarily unavailable" message.
3. Voter: cast (or change) a vote → accepted and counted (watch the result bars).
4. Creator: close the editor (Cancel) → nothing changed for the voter at any point.

## Scenario 2 — Save with text change: pending review, then quiet apply (US1, SC-003/SC-007)

1. Creator: edit the title, Save changes.
2. Immediately (within the ~5 s sweep): Voter still sees the **old** title; the poll stays listed and votable.
3. Creator's card: state detail shows "changes pending review"; trying to reopen the editor is refused ("Changes are being reviewed…").
4. After the sweep: Voter sees the new title; Creator's pending status clears on the next list refresh; the poll never left OPEN, and its Newest-tab position did not jump (`launched_at` unchanged).
5. Repeat with a deny-term in the title: the poll keeps running with the old title and the card shows "changes rejected: <reason>".

## Scenario 3 — Choices merge: add, delete, rename (US2, SC-004/SC-005/SC-006)

1. Creator: open the editor, go to Choices — the same textbox, Paste choices button and help text as ever (no new controls).
2. Add a new line; delete a line that has votes; leave the section (click another step circle).
3. A confirmation names the deleted choice with its vote count (as of edit-mode entry). Click **Cancel** ("Keep choices" until TWEAK04 of USER-ADD-CHOICES) → the whole textbox reverts to its session-entry state.
4. Redo the edit, confirm with **Delete**, Save changes.
5. After the sweep: the added choice appears **last** with an Automatic colour; surviving choices keep their labels, positions, colours and counts; the deleted choice is gone from results; a single-choice poll's percentages sum to 100 %.
6. Voter whose only choice was deleted: the card shows them as not having voted; they can vote again — even on a Final-Vote poll.
7. Edit a voted choice's wording in place → the confirmation shows it as a deletion (plus the new line as an addition) before anything is lost.
8. Delete a zero-vote choice only → no prompt.
9. Try to go below `ENV_MIN_CHOICES`, above `ENV_MAX_CHOICES`, past 100 characters, or duplicate a label → each refused client-side; a forced request is refused by the server with the same rules.

## Scenario 4 — Sharing-mode switch (US3)

1. On an open, voted **Private / Anyone With The Link** poll: switch to **Invitation Only**, Save (applies at save — no review needed when no text changed).
2. Voter (who voted via the link, not invited): can no longer open the poll; their vote still shows in the Creator's results.
3. Invite that Voter's address → access and history reconnect.
4. Switch back to **Anyone With The Link** → link access works again; the invitation list is unchanged.
5. Visibility (Private ↔ Public) remains refused on the voted poll.

## Scenario 5 — Mode and mutability switches (US4, US5)

1. Single→Multiple on the voted poll: Save applies at once; Voter can now select several choices; old votes unchanged. The reverse direction's radio is disabled, and a forced request is refused 409.
2. Dynamic↔Final both ways: existing votes untouched; a past voter's ability to change their vote follows the new setting immediately.

## Scenario 6 — Second save and close-during-review (FR-006, FR-025)

1. Save a title change, then immediately try to save again (stale card or direct POST) → `409 PENDING_REVIEW`.
2. Save a title change on a poll whose end date passes before the sweep → the poll closes on schedule, stays closed, and still receives the approved title.

## Expected log lines

The server console logs the sweep's pending-update outcomes alongside today's approval lines (apply/reject per pid), and `reconcile` activity for polls whose deletions rewrote votes.
