# UI Contracts: Pre-Launch Sign-Up Allowlist

The message, everywhere: **CrowdPoll hasn't launched yet. For now, accounts are open to invited testers only.**
It is shown in the card's existing status line, styled as an error (`card-shell-status error`). No contact address.

## C1. Create Account card (`createAccountCard.js`) — no code change

Submitting an unlisted address gets `403 NOT_LAUNCHED`; the card already shows `body.error` for a non-OK answer, so the message
replaces "Check your inbox". The guest header's **Create Account To Vote** button is unchanged: it opens the page (AM1).

## C2. Login card (`loginCard.js`)

- Requesting a link for an unlisted address: `403`; the card shows `body.error` as today, so no change for this path.
- Arriving at `/login?error=not-launched` (a refused sign-in link or confirmation): the card shows the message in its status
  line, as it does for `?error=invalid-link`.
- Arriving from a refused social sign-in (BetterAuth's error redirect to `/login`): the same message (T033).

## C3. Profile card (`profileCard.js`)

- Requesting a change to an unlisted address: `403`; the email-change action already shows `body.error`. No change.
- Arriving at `/profile?error=not-launched` (a refused email-change link): the card shows the message where it shows the
  `invalid-link` notice. This is the one change.

## Confirmation page (`confirmSigninCard.js`) — no code change

A `403` with `redirect` is followed, as the card already does for any answer with a `redirect`, so the visitor lands on C2's
`/login?error=not-launched`.
