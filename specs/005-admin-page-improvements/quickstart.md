# Quickstart: Admin Page Improvements

## Prerequisites

- `npm install`
- Local dev server running with admin credentials available:
  `npm run dev` (or `devScripts/launch-dev.ps1` on Windows), signed in as an address listed in
  `APP_ADMINS` (dev default: `roadraceresults@gmail.com`).
- At least one poll already exists (use the "Create New Poll" button on `/admin` if the list
  is empty).

## US1 — Consolidated Actions Menu (P1)

1. Visit `/admin` while signed in as an admin.
2. Confirm each poll row's Actions column shows exactly one trigger icon and no separate
   "Edit Poll"/"Duplicate Poll"/"Copy Poll Link"/"View Results" links outside a menu.
3. Click the trigger — the menu opens per `contracts/ui-contracts.md`'s "Admin poll-list
   actions menu contract", listing all four actions.
4. Open a second row's menu — the first closes.
5. Click outside, then reopen and press Escape — both close the menu.
6. Keyboard-only pass: Tab to a trigger, press Enter to open, Arrow Down/Up to move between
   the 4 items, Escape to close and confirm focus lands back on the trigger (FR-011).
7. Select "Edit Poll" and "View Results" from the menu and confirm they navigate exactly as
   they do today; select "Copy Poll Link" and confirm the clipboard receives the poll URL.

## US2 — Unique Titles for Duplicated Polls (P2)

1. Note an existing poll's title, e.g. "Customer Satisfaction".
2. From its actions menu, select "Duplicate Poll" — confirm the new poll's title is
   `"Customer Satisfaction Copy"`.
3. Duplicate the *original* poll again — confirm the second copy's title is
   `"Customer Satisfaction Copy 1"`.
4. In the poll editor (`/admin/poll?PID=...`) for the first copy, set **Poll State** to
   Archived; for the second copy, set it to Closed.
5. Duplicate the original poll a third time — confirm the new title is
   `"Customer Satisfaction Copy 2"`, proving the archived and closed copies both counted
   (spec Acceptance Scenario US2.4).
6. Alternative check via API (no UI needed):
   `curl -X POST -b "<session cookie>" http://localhost:9999/api/admin/polls/<pid>/duplicate`
   repeated 2–3 times, then `GET /api/admin/polls` to confirm titles are all distinct.

## US3 — Consistent Site Header (P3)

1. Load `/` (home) and note the header's brand mark/wordmark, nav, search box, and
   account area exactly (see `contracts/ui-contracts.md`'s "Shared site header contract").
2. Visit `/admin`, an individual poll's `/admin/poll?PID=...` editor, and its
   `/admin/poll/results?PID=...` results page — confirm the header is visually identical to
   step 1 (same brand, nav, search, account area; no back-arrow-only header, no
   "CrowdPoll Admin" text brand).
3. Visit `/login`, `/create-account`, and (while signed out then signed back in) `/profile` —
   confirm the header is visually identical to step 1 in both signed-out and signed-in states.
4. Sign out and repeat steps 2–3 — confirm the account area consistently shows the
   signed-out state (Log In / Create Account to Vote) everywhere, matching the home page.

## US4 — Streamlined, Contradiction-Free Poll Editing (P4)

1. From `/admin`, open any poll's editor (`/admin/poll?PID=...`). Confirm a back-arrow
   control appears above the Title field, below the header, and that clicking it navigates
   to `/admin` and shows current data (not a cached/stale list) — try renaming the poll
   first, then clicking the back arrow, and confirm the renamed title is already visible in
   the list without a manual refresh.
2. Open the Access Mode dropdown and confirm its three options read "Public," "Private
   Anyone with the link," and "Private Invitation Only."
3. On a poll with Access Mode "Public," set Results Visibility to "Transparent." Confirm
   Access Mode immediately reads "Private Invitation Only" and Voter Count Limit reads
   `500`, without a page reload or a separate save.
4. On that same poll, set Access Mode back to "Public." Confirm Results Visibility reads
   "Anonymous" and Voter Count Limit is blank.
5. Create a new poll ("Create New Poll" from `/admin`) and confirm its Voter Count Limit
   starts blank (Access Mode defaults to "Public").
6. Set that new poll's Access Mode to "Private Anyone with the link." Confirm Voter Count
   Limit becomes `500`. Type `9999` into Voter Count Limit and tab away — confirm it's
   clamped to `500`. Clear the field entirely and tab away — confirm it saves as blank (a
   subsequent page reload still shows it blank, confirming the server, not just the input,
   accepted the clear).
7. Have a poll receive at least one vote (vote on it as a non-admin), then reopen its
   editor and attempt to set Results Visibility to "Transparent" while Access Mode is
   "Public" — confirm the change is rejected (Access Mode is locked once a poll has ever
   received a vote, per `004-realtime-poll-voting` FR-048) and both fields keep their prior
   values.
8. In the Participants section, confirm the action next to each listed participant reads
   "Ban from Voting" (not "Remove"), and that clicking it still removes them from the list
   and adds them to the Banned Voter List below, as before.
9. Confirm Title, Subtitle, and Voter Count Limit each show their label to the left of the
   input on one line, and that the vertical gap between Title, Subtitle, and Choices is
   visibly tighter than the gap around other field groups on the page.

## Automated coverage

- `tests/polls-service.test.ts` — unit tests for `nextAvailableCopyTitle` (data-model.md);
  `createDefaultPoll()` asserts `voterCountLimit` is `null` (US4).
- `tests/polls-admin-crud.test.ts` — extends the existing duplicate-endpoint tests with
  repeated-duplication and archived/closed-collision cases (US2 Acceptance Scenarios); US4
  adds the Results Visibility/Access Mode cross-field auto-correction (both directions) and
  the Voter Count Limit 500/blank transitions and explicit-clear-to-null cases.
- `tests/polls-admin-participants.test.ts` — US4 adds a case confirming a blank
  `voterCountLimit` does not cap voting on a `PRIVATE_POLL_ANYONE_WITH_THE_LINK` poll.
- Run with `npm test`.
- US1 (menu keyboard/ARIA behavior), US3 (header visual identity), and US4's back-navigation
  and label-left/spacing layout are UI/DOM-level and are validated manually per steps above,
  consistent with this project's tests-OR-explicit-manual-check allowance (constitution
  Principle IV).
