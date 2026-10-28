# UI Contracts: Single-Email Invitation

## C1. The confirmation card (`/invite`, `invite.html` + `inviteCard.js`)

Built on the sign-in cards' look (`confirm-signin.html`, `createAccountCard.js`); reads A2 on load; on `404` it follows the answer's `redirect`.

| A2 facts | Card shows | Primary button |
|---|---|---|
| `signedInAs: null`, `hasAccount: true` | "Continue as j•••@gmail.com"; Stay signed in | **Continue** |
| `signedInAs: null`, `hasAccount: false` | the same, plus the Create Account Terms box (unticked) | **Continue**, disabled until the box is ticked |
| `signedInAs` set | "This invitation is for j•••@gmail.com. Sign out and continue as that address to see the poll. Or ask the poll creator to resend the invitation to your current address."; the Terms box when `hasAccount` is false; Stay signed in | **Sign out and continue as j•••@gmail.com** (disabled behind the Terms box when shown) and **Stay as <signedInAs>** |

- Stay signed in starts as `staySignedInDefault` says (UA10).
- With `providers` non-empty, the provider buttons follow, as on the Login page (UA6).
- **Continue / Sign out and continue**: `POST` A3 (`signOut: true` for the second); on `200` go to `redirect`; on `400`/`403`/`429` show `error` in the card's message area, as the sign-in cards do; on `409` reload the card.
- **Stay as …**: go to `/`, with no notice (IN1).
- Buttons are real `<button>`s; the Terms box is a labelled checkbox; the message area is `role="status"`. The page carries the site footer and cookie banner like every page.

## C2. Landing maximized (`tabs.js` `applyLanding`)

Every landing that names a poll shows it maximized: when the tab already holds the card, `grid.maximize(pid)` (unchanged); otherwise `mountLinkedPoll` then `grid.maximize(pid)` (new). Closing works as for any maximized card.

## M1. The invitation and reminder email

Under the button, in both the HTML and the text part, when a token was issued:

> This button signs you in to CrowdPoll as j.smith@gmail.com. Please don't forward this email.

The address is the invited address in full. The button's link is `/invite?PID=<pid>&token=<token>`. In `oauth` mode the sentence is absent and the link stays `/?PID=<pid>`. Every other email is byte-for-byte unchanged.
