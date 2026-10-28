# Quickstart: Single-Email Invitation

## Prerequisites

- Local PostgreSQL (`ENV_DATABASE_URL` = `localhost:5432/app01`); the migration `011-invitation-tokens` runs at start.
- `ENV_SIGNIN_METHOD=native` (or `both` for step 6); `ENV_EMAIL_TRANSPORT=ses` in the SES sandbox, or `smtp` without credentials so each message is printed to the console.
- Two test mailboxes you can read (A, B), and an account that may create polls.
- `ENV_ALLOWED_EMAILS` empty, or listing A and B.

Start: `npm run dev` (or `devScripts/launch-dev.ps1`). Automated: `npm test` (the new suites are named in `tasks.md`).

## 1. A new invitee, one email (User Story 1, SC-001, SC-003)

1. As the creator, publish an Invitation Only poll and invite address A, which has no account.
2. In A's mailbox: one invitation; under its button, "This button signs you in to CrowdPoll as A. Please don't forward this email." The button's link is `/invite?PID=…&token=…`.
3. Open it in a private window: the card shows "Continue as a•••@…", the Terms box unticked and Continue disabled.
4. Tick the box, press Continue: the poll is maximized on Shared With You. A's mailbox still holds only the invitation.
5. Admin card: A's row reads `Accepted`.

## 2. A link opened twice, and a scanner (User Story 5, SC-005)

1. Before step 1.4, fetch the link with `curl -s -o /dev/null -w "%{http_code}" "<link>"`: `200`, and the card still works afterwards.
2. After step 1.4, close every private window, then open the same link in a new private window (private windows of one browser share a session until the last closes): it goes to the sign-in page (today's poll link), not to a card.

## 3. An existing account, signed out and signed in (User Story 2)

1. Invite address B, which has an account; open the link signed out: no Terms box; Continue signs in and shows the poll maximized.
2. Resend to B; open the new link in a window already signed in as B: the poll is shown at once, with no card.

## 4. Signed in as someone else (User Story 4)

1. Sign in as B; open a fresh invitation for A.
2. The card shows "This invitation is for a•••@…. Sign out and continue … Or ask the poll creator to resend the invitation to your current address." and two buttons.
3. "Stay as b•••@…" → home page as B, no notice. Reopen the link; "Sign out and continue as a•••@…" → signed in as A, poll maximized.

## 5. Old and broken links (User Story 5, SC-006)

1. Invite A; age the invitation so Resend becomes available (it is blocked for 24 hours after a send) —
   `psql app01 -c "UPDATE poll_invitations SET sent_at = sent_at - INTERVAL '25 hours' WHERE email = '<A>';"` —
   refresh the admin card, then press Resend; open the first email's link: today's poll link behaviour, not a card.
2. Open `/invite?PID=not-a-poll&token=x` signed out: the sign-in page's invalid-link message; signed in: the home page.
3. Remove A from the poll; open A's link: today's poll link, which does not show the poll.

## 6. Modes and limits

- `both`: the card also shows the provider buttons.
- `oauth`: the invitation link is `/?PID=…` and has no sign-in sentence; `/invite` answers `404`.
- `ENV_ALLOWED_EMAILS` set without A: Continue shows the "not launched" message and creates nothing.

## 7. Landing maximized for any poll link (User Story 3, SC-004)

Open `/?PID=<pid>` for an Invitation Only poll you are invited to but whose card is not yet in Shared With You: it is shown maximized.

## 8. One email to create an account from the sign-in page (TWEAK04)

1. Signed out, on `/login`, ask for a sign-in link for an address C that has no account.
2. C's mailbox: one "Finish creating your CrowdPoll account" email; its button is `/create-account?token=…`, and it says the button works once, for 15 minutes.
3. Open it: the card shows "Create your account as c•••@…", the Terms box unticked, no address field, and Create Account disabled.
4. Tick the box, press Create Account: signed in as C at once; C's mailbox still holds only that one email.
5. Open the same link again (after closing every private window): the ordinary Create Account form, with "That link has expired or has been used."
