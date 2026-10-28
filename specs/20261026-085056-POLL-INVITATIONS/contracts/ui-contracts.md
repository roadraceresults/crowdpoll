# UI Contracts: Poll Invitations

## C1. The stand-alone admin card (done)

- Files in `requirements/20261026-085056-poll-invitations/`: `admin-card.html`, `admin-card.css`, `admin-card.js`,
  `fonts/`, captured by `devScripts/capture-admin-card.ts` (research R11).
- `admin-card.html` opens by double-click (`file://`), loads only relative paths, and makes no network request.
- It shows the read-only admin card of the reference poll (`invite-design.jpg`) with production class names, a
  Light/Dark switch and an Open poll/Closed poll switch, and production's phone layout at 390 px.
- The Invitees panel is drawn on it with fixture invitees in every status; C2–C5 describe it, and `adminCard.js`
  reproduces its markup and classes.
- TWEAK09: on the production read-only card, a poll the signed-in account did not create (`ownPoll: false` on the
  admin list and search rows, which an administrator sees for every creator) carries a `Not your poll` chip
  (`not-your-poll-chip`) after its `Created By` value; the caller's own polls carry none.
- TWEAK11: the production read-only card's body reads, top to bottom: the Settings Summary (`wizard-summary`), the
  dates panel, the counts panel, then (Invitation Only) the Invitees panel, the last thing on the card.

## C2. The Invitees panel

- Shown on an admin card whose stored poll is Invitation Only (research R13):
  - on the read-only face, directly below the counts panel (`card-counts-panel`), as a `card-panel
    card-invitees-panel` section with the card's existing panel look;
  - on a new poll's wizard, below the wizard, once the poll has been saved as Invitation Only.
- Never shown for any other poll.
- Heading `Invitees` with the count against the limit (`7 of 100`), then the add field (C3), then the rows (C4),
  then the pager.
- Read-only on a CLOSED or ARCHIVED poll (`data-readonly`): no add field, no row menus.
- The list is fetched from A1 when the panel is first shown and again on every admin list refresh; a refresh never
  clears a draft in the add field or closes an open row menu or confirmation.

## C3. The add field

- A label `Invite by email` above a multi-line field (`invitees-input`), placeholder
  `Paste or type addresses, separated by commas, spaces or new lines`, a `Ctrl+Enter` hint, and an `Invite` button
  (`invitees-invite-btn`).
- `Invite` (or Ctrl/⌘+Enter) posts A2 `add` with `timeZone`; the field is disabled while the request runs.
- After the response (`invitees-results`):
  - the field keeps only the addresses that were refused, so the creator can correct them;
  - one line per refused address: the address and its `reason` from A2, in the error colour; for a resend refused
    `429 daily-limit` the card writes the time itself from `retryAt`, in the browser's time zone (`Your daily invitation
    limit is reached until 4:02 PM.`);
  - a summary, one message per line (`white-space:pre-line`), announced to screen readers (`role="status"`):
    `Invited Emails: 2.`, then, when some added addresses are `waiting` (A2), `3 Emails will be sent when your daily limit allows.` and, on its own line, `Daily Limit: 200 Emails`
    (`1 Email` for one; the limit is `maxInvitationsPerDay` from `/api/config`, TWEAK05, TWEAK07),
    then, when some were refused, `Emails that could not be added: 3` (TWEAK04); each list refresh
    lowers the waiting count as their rows leave `Not sent yet`, and drops the sentence once none wait
- Added addresses appear in the rows (C4) at once, from the response's `invitees`; when they land on a later page,
  the pager moves to it.

## C4. Rows and chips

- One row per invitee (`invitee-row` in `invitee-list`): the address; the user name after it in the muted colour
  when known; a status chip (`invitee-chip`) at the end; a row menu (kebab, as in the card header).
- Chip text and colour role:

| Status | Chip colour role |
|---|---|
| `Not sent yet` | outline / on-surface-variant |
| `Not delivered` | error outline / error |
| `Invited` | secondary container / on-secondary-container |
| `Accepted` | tertiary container / on-tertiary-container |
| `Voted` | primary container / on-primary-container |

- Row menu:
  - `Resend invitation` — disabled, with `resendBlockedReason` shown beside it, when `canResend` is false (including
    `"The poll is not open."`, research R16); otherwise posts A2 `resend` with `timeZone`.
  - `Remove` — on a voter, an inline confirmation in the row (`invitee-confirm`): "Remove <address>? Their vote will be
    removed too." with `Remove` and `Cancel`; `Remove` posts A2 `remove` with `confirmVoted: true`.
    On anyone else it posts A2 `remove` at once; a `409 invitee-voted` (the invitee voted meanwhile) opens the same
    confirmation.
- Rows are paged by `participantsViewportSize` from `/api/config`, with the Participants list's pager look
  (`invitees-pager`, `1–5 of 7`).

## C5. The counts panel

- For an Invitation Only poll the counts panel shows, in order: `Vote Count`, `Invitation Count`, `Accepted Count`,
  `Banned Voter Count`.
- `Accepted Count` comes from the admin list row (A3) and from each A1/A2 response.

## C6. Stylesheets

- The panel's rules go in `admin-card-m3.css`, using only Material 3 tokens from `m3-tokens.css`, no literal font
  size, no dark twin of its own (the tokens carry dark mode); they are the stand-alone card's
  `/* Invitees panel (new) */` section; `m3-assets.test.ts`'s sheet lists are unchanged.

## C7. Privacy Policy

- `src/public/privacy.html` gains a paragraph with `id="invitations"` (research R12); the invitation email links straight
  to it (`<origin>/privacy#invitations`, M1).

## C8. The time zone on the card's writes

- Every write `adminCard.js` makes to a poll (`PATCH`, `/save`, `/publish`, `/colors`, `/invitees`) carries
  `timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone` (A5); nothing is shown for it.

## C9. The email draft

- `requirements/20261026-085056-poll-invitations/invitation-email.html` (with `email-logo.png` beside it) opens from
  disk and shows M1 and M2, with switches for the message, votes (named / anonymous), the end (has an end / no end)
  and the part (HTML / plain text).
- Once `invitationMessage` is in `templates.ts`, `devScripts/render-invitation-email.ts` imports it and drops its own
  copy and its heading post-process, so redrawing the draft shows production's output (research R9).
