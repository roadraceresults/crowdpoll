# Quickstart: Poll Choices Editor

## Prerequisites

- `npm install`
- Local dev server running with admin credentials available:
  `npm run dev` (or `devScripts/launch-dev.ps1` on Windows), signed in as an address listed in
  `APP_ADMINS` (dev default: `roadraceresults@gmail.com`).
- At least one poll already exists (use the "Create New Poll" button on `/admin` if the list
  is empty).

## US1 — Edit All Choices as One List (P1)

1. Open a poll's editor (`/admin/poll?PID=...`). Confirm the Choices section shows a single
   text box with the poll's current choice labels, one per line, and no "Save Choices"
   button visible.
2. Edit one line's text, add a new line, and delete another line. Confirm "Save Choices"
   appears as soon as you start typing.
3. Click "Save Choices." Confirm the button disappears, and reloading the page shows the
   saved list (not the pre-edit one).
4. Delete lines down to 1 and try to save — confirm it's rejected (see US2 step 6 for the
   disabled-button version of this same check).
5. Type 51+ non-blank lines (or paste a large block — see US2 step 3) and try to save —
   confirm it's capped at 50.
6. Make two lines identical text and save — confirm you're told the label is duplicated and
   nothing is saved.
7. **Vote-reset check** (research.md R1 — the feature's most consequential behavior): as a
   non-admin, vote on a poll. As the admin, open that poll's editor and save the choices box
   with even a trivial one-character edit to a single line. Then, as that same voter, reload
   the poll — confirm you're shown as not-yet-voted, even though your vote was for a choice
   whose text didn't change. This is expected (spec.md FR-006/007), not a bug — verify it
   deliberately so it isn't mistaken for one later.
8. Confirm any choices already marked removed from before this feature (or from a poll never
   edited with the new box) still appear read-only below the text box, unaffected by saves
   made in it.
9. Edit a line, then navigate away (or reload the page) without clicking "Save Choices" —
   confirm the edit is discarded and the pre-edit choices are shown, since "Save Choices" is
   an explicit action, not autosave-on-blur.

## US2 — Guided, Mistake-Resistant Typing (P2)

1. Click into the text box, place the cursor on a blank line (or an empty box), and press
   Enter — confirm no new line is created.
2. Type past 100 characters on one line — confirm the 101st character isn't accepted.
3. Paste a block of text containing blank lines and one line over 100 characters — confirm
   the blank lines vanish and the long line is shortened to 100 characters automatically.
4. With 50 non-blank lines already present, try to add a 51st — confirm it's not accepted.
5. Type or delete a line and confirm the live count next to the box updates immediately and
   matches the number of non-blank lines.
6. Delete lines down to 1 — confirm "Save Choices" is visibly disabled (not merely rejected
   on click) until a 2nd non-blank line exists again.

## Automated coverage

- `tests/polls-service.test.ts` — unit tests for `replaceChoices()` (data-model.md):
  min/max/duplicate/length validation; fresh ids on every call even for an unchanged label;
  previously-removed choices carried over untouched; every non-empty `currentVotes` entry
  reset regardless of which choice(s) it referenced.
- `tests/polls-admin-crud.test.ts` — replaces the removed `addChoice`/`editChoice`/
  `removeChoice` endpoint tests with equivalent coverage against `PUT
  /api/admin/polls/:pid/choices` (contracts/api-endpoints.md): success, each validation
  failure, and the full-poll vote-reset behavior at the HTTP layer.
- Run with `npm test`.
- The live-typing guardrails (US2) and the visual styling match (FR-014) are DOM/visual-level
  and are validated manually per the steps above, consistent with this project's
  tests-OR-manual-check allowance (constitution Principle IV).
