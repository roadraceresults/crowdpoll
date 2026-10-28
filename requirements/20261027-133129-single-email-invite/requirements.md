Start a new spec for these requirements called `20261027-133129-SINGLE-EMAIL-INVITE`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

The current procvess for a user who doesn't have an account to be invited to a poll is:
1. The poll creator generates an invitation link for the poll.
2. The invitation link is emailed to the user.
3. The user clicks on the invitation link.
4. The user is shown the Login page.
5. The user chooses to Login with email address.
6. Another email is sent to them with a signin link.
7. The user clicks on the signin link and is authenticated.
8. The user is shown the Trending tab.

Research request:  
1. How can this be done with only 1 email?  
2. How can the user be directed to the Maximize view for the poll they are invited to?

## Additional Requirements (2026-10-27 1:52 PM)

Question: how is it handled when the invitation email to email1@example.com is forward to email2@example.com?  
This is the case for our user1@crowqdpoll.vote which is forwarded by InbprovMX to crowdpollvote@gmail.com.

## Requirements Decisions

- **Today's flow (AM1).**  
  An invitee without an account receives three emails today: the invitation, a "create an account" email, and the sign-in link.  
  An invitee with an account receives two: the invitation and the sign-in link.  
  The goal is one email, the invitation, in both cases.  
- **How one email is enough (RS1).**  
  Each invitation or reminder email carries a personal invitation sign-in token for that poll and address; only its hash is stored on `poll_invitations`, with its expiry.  
  The link is `/invite?PID=<poll id>&token=<token>` (IN2); its GET only shows a confirmation card ("Continue as <masked address>", the Terms box for an address without an account, Stay signed in), so a mail scanner that opens the link changes nothing.  
  The card's POST checks the token, the allowlist and `Origin`, creates the account if there is none, records agreement, starts the session as an emailed sign-in does, consumes the token and lands on the poll.  
- **Where the invitee lands (NC1, RS2).**  
  The invitee lands on the invited poll, maximized; an invitee of an Invitation Only poll is shown it on the "Shared With You" tab.  
  The landed poll is maximized whether or not the tab already held its card.  
  Where the poll cannot be shown, the existing notice explains why.  
- **A forwarded invitation read under another address (RS3).**  
  The invitation stays with the invited address; forwarding changes nothing.  
  A browser signed in as another address gets the UA2 choice; the confirmation card shows, above its two buttons: "This invitation is for <masked invited address>. Sign out and continue as that address to see the poll. Or ask the poll creator to resend the invitation to your current address."  
- **How long the invitation link signs someone in (UA1).**  
  Until the poll closes, at most 30 days, and once.  
  After it has been used, or once it has expired, the same link behaves as today's `/?PID=` link: sign in the usual way, then the poll.  
- **A visit already signed in as the invited address (UA8).**  
  That visit consumes the token; later clicks on the same link, from any browser, behave as today's `/?PID=` link.  
- **An unusable invitation link (UA9).**  
  The link carries the poll id beside the token (IN2), so the row keeps only the current token's hash.  
  A token that does not sign in (replaced, used, expired, revoked or unknown) falls back to `/?PID=<poll id>`, which decides what may be shown as today.  
  Only a link without a valid poll id redirects to `/login?error=invalid-link` (the existing message), or to `/` for a signed-in browser.  
- **The "Stay signed in" box (UA10).**  
  It starts ticked when `ENV_STAY_SIGNED_IN` is `1`, clear otherwise, and shapes the session exactly as the Login page's box does.  
- **A browser already signed in (UA2).**  
  Signed in as the invited address (by email key): no confirmation; the poll is shown at once.  
  Signed in as another address: the confirmation card says so and offers "Sign out and continue as <masked invited address>" or "Stay as <current address>", which goes to `/` for the current account with no further notice (IN1).  
- **Terms and name for a new invitee (UA3).**  
  For an address without an account, the confirmation card shows the same Terms box as Create Account, and its button stays disabled until it is ticked; redeeming records the agreement as Create Account does.  
  The name is left empty, as for a pending account today, and can be set on the Profile page.  
  An existing account that has not accepted the current Terms goes through `/accept-terms?next=` as now.  
- **A forwarded invitation (UA4).**  
  The token can only sign in the address it was issued for; it is consumed on use and revoked when the address is removed from the poll or a later email replaces it.  
  The confirmation card names the masked address, and the invitation email's text says the link signs the reader in and should not be forwarded.  
  Redeeming is rate-limited like the other sign-in routes, and the token is never logged.  
- **The invitation email's wording (UA7).**  
  Both the invitation and the reminder carry one sentence under the button: "This button signs you in to CrowdPoll as <invited address>. Please don't forward this email."  
  The address is shown in full, since the email goes to that address.  
  With `oauth`, where the link is still `/?PID=`, the sentence is left out.  
- **Reminders and Resend (UA5).**  
  Each email carries a new token, and only the newest one works: one token hash per invitation row, overwritten at each send; an older email's link falls back to `/?PID=<poll id>` through the poll id it carries (IN2).  
  A removed address loses its token with its invitation row; adding it back issues a new one only when an email is sent.  
- **Sign-in modes (UA6).**  
  The one-email link is used with `ENV_SIGNIN_METHOD` `native` and `both`; with `oauth` the invitation link stays `/?PID=`, leading to the provider sign-in.  
  With `both`, the confirmation card also offers the providers.  
- **The pre-launch allowlist (NC2).**  
  The allowlist still applies: redeeming checks `isAllowed` like every other sign-in, and an unlisted invitee sees the existing "not launched" message.  
