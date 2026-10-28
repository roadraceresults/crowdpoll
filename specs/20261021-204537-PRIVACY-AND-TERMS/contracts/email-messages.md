# Email Messages: Privacy Policy, Terms of Service and Account Deletion

Both use the one layout in `src/email/templates.ts` (escaped, inline styles, the hosted logo).

## M1. Account deleted (new, `sendAccountDeleted(origin, address)`)

- **Subject**: Your CrowdPoll account was deleted
- **Preheader**: Your account and the data tied to it are gone.
- **Body**:
  - "Your CrowdPoll account for this address was deleted at your request."
  - "We deleted your account, your sessions, your bookmarks and the polls you created. Your votes on other people's polls stay counted, but no longer carry your address or name."
  - "If you did not ask for this, write to privacy@crowdpoll.vote."
- No link at all (it is a notice: see M2).

## M2. The footer of every action message (changed)

Every message with an action link (sign-in, create account, email-change verification) adds a third line to the
existing two. The notices (email changed, account deleted) stay without any link, as they always were, so a forged
notice cannot pass itself off by carrying CrowdPoll links (`mailer.test.ts` "gives the change notice no action link"):

- "Privacy Policy: <origin>/privacy · Terms of Service: <origin>/terms"

In the HTML part the two names are links; in the text part the URLs are written out.
