# Quickstart: Poll Invitations

## 1. Automated checks

```powershell
npm test
npm run build
```

One vitest run at a time (the embedded PostgreSQL uses a fixed port).
The suites that cover this feature (written by `/speckit-implement`):

- `tests/invitations-api.test.ts` — A1, A2: parsing, every refusal reason, email-key duplicates, the voter limit,
  the allowlist, the daily limit (added and waiting on an open poll), remove with and without a vote, the resend rules including
  "The poll is not open.", adding back a removed address (no new email, reminder state carried over), `404` for
  another creator's poll, `409` on a closed poll, and that no call changes `pollState` (FR-014).
- `tests/invitations-send.test.ts` — the claim (route and sweep never double-send), nothing sent before OPEN, pending
  invitations sent on opening oldest first within the daily allowance and the rest on later ticks, nothing resent
  after EDITING → OPEN, `Not delivered` on a mailer failure.
- `tests/invitation-email.test.ts` — M1, M2: every string of the approved wording, the anonymity line only when votes
  are anonymous to the creator, `Poll Ends` only with an end, the dates in the stored zone (`EDT` and `EST` across a
  clock change) and in UTC without one, `headingLine2` in HTML and text, and every other message's output unchanged.
- `tests/invitations-accept.test.ts` — `accepted_at` set by the link and the tab; `acceptedCount` on admin rows.
- `tests/invitations-adopt.test.ts` — adoption on sign-in, on the poll link and on the Shared With You tab; voting
  after adoption.
- `tests/invitations-store.test.ts` — `writeRoster` keeps invitation state and writes history for a removed, sent
  invitation; status derivation and counts.
- `tests/poll-time-zone.test.ts` — A5: a valid `timeZone` stored by each route, an invalid one ignored, no content
  version or state change.
- `tests/account-deletion.test.ts` — invitations and history removed by email key on account deletion.
- `tests/client-admin-invitees.test.ts` (jsdom) — C2–C5, C8: the panel only for Invitation Only, the refusal lines,
  chips, the inline confirmation on removing a voter, paging, read-only when closed, `timeZone` on each write.
- `tests/migration-invitations.test.ts` — `010-invitations` up and down, and the `sent_at` backfill rule.

## 2. The stand-alone drafts (C1, C9)

1. Open `requirements/20261026-085056-poll-invitations/admin-card.html` by double-click, with no server running.
   Compare with `invite-design.jpg`; toggle Light/Dark and Open poll/Closed poll; resize to 390 px.
2. Once `invitationMessage` is in `templates.ts`, run
   `npx tsx devScripts/render-invitation-email.ts requirements/20261026-085056-poll-invitations --force` and open
   `invitation-email.html`: every switch combination shows the approved wording, now drawn by production code.
3. Compare the production admin card's Invitees panel with `admin-card.html`, light and dark, desktop and 390 px.

## 3. End to end, in development

Prerequisites: `devScripts/launch-dev.ps1` with SES in the sandbox and two verified recipient addresses;
`ENV_MAX_INVITATIONS_PER_DAY=3` to see the limit quickly.

1. Sign in as a creator; Create New Poll; choose "Only people you invite"; set an end date; Save.
   The Invitees panel appears below the wizard.
2. Paste `a@example, <verified 1>, <verified 1 with a dot or +tag if Gmail>` and Invite.
   See one invalid line, one duplicate line, one row `Not sent yet`; no email arrives.
3. Publish. Within 5 seconds of the poll opening, the email (M1) arrives: subject and heading name the poll;
   `Poll Started` and `Poll Ends` are in your own time zone, named; the row reads `Invited`.
4. In another browser, follow the email's link, sign in as recipient 1. The poll opens; within one admin refresh the
   creator's row reads `Accepted` and `Accepted Count` is 1.
5. Vote. The row reads `Voted`. Voting was never paused while the creator added people.
6. Invite `<verified 2>` on the open poll: the email arrives at once.
7. Resend to recipient 2: unavailable (less than 24 hours). Remove recipient 2, then invite them again: no new email
   arrives, and the row reads `Invited`.
8. Remove recipient 1: the confirmation names the vote; confirm; `Vote Count` drops by one.
9. Invite two more addresses: the one beyond the limit of 3 is added as `Not sent yet`, and the summary says it will be
   sent as your daily limit frees up; it is emailed by the sweep once the 24 hours since the first email pass.
10. Pause the poll for editing: every row's Resend reads "The poll is not open."
11. Close the poll: the panel is read-only.
12. Open `/privacy#invitations`.
