# Feature Specification: Production Email

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "requirements/20261019-153514-production-email/requirements.md"

**Source requirements**: `requirements/20261019-153514-production-email/requirements.md` (the requirements document, with every finding of the requirements review folded in).
**Requirements report**: `requirements/20261019-153514-production-email/requirements-report.md` (5 diagrams and 29 findings, all resolved; research results RS1–RS17).

## Clarifications

### Session 2026-10-20

- Q: Are the single-user integrity rules part of this feature? → A: Address normalization only (plus-tags, Gmail dots), for new sign-ups and email changes; disposable-domain blocking stays deferred (RS5)
- Q: What happens when a sign-in link is opened in a browser other than the one that asked for it? → A: One-click confirm on a page naming the account and when the link was requested
- Q: What does the log record about each sent message? → A: Message id, type and a masked recipient (e.g. `j•••@gmail.com`)
- Q: How long may one send take before the person is told the email could not be sent? → A: 10 seconds, a configurable setting with that default

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Receive the sign-in link in a real inbox (Priority: P1)

A person enters their email address on the sign-in page and asks for a link.
Today every message goes to a test sandbox that never delivers anything, so nobody outside development can sign in.
With this feature the message reaches the person's real mailbox, in the inbox rather than spam, within a minute, and the link signs them in.
The same holds for the other three messages: the create-account invitation, the email-change verification and the notice to the old address after a change.

**Why this priority**: Without delivery to real inboxes no one can sign in to the live site; everything else in this feature builds on it.

**Independent Test**: In the production environment, request a sign-in link for test mailboxes at three large mailbox providers and confirm each arrives in the inbox within 60 seconds and signs the person in.

**Acceptance Scenarios**:

1. **Given** a registered address, **When** the person asks for a sign-in link, **Then** "Your sign-in link" arrives in that mailbox's inbox within 60 seconds and the link signs them in.
2. **Given** an address with no account, **When** the person asks for a sign-in link, **Then** "Create your account" arrives in that mailbox's inbox, and the page shows the same reply as for a registered address.
3. **Given** a signed-in user, **When** they ask to change their address, **Then** "Verify your new email address" arrives at the new address, and once it is verified "Your account email address was changed" arrives at the old one.
4. **Given** the email service refuses or fails a send of one of the first three messages, **When** the person made the request, **Then** they are told the email could not be sent and to try again later, as today.
5. **Given** the email service fails to send the change notice, **When** the change was verified, **Then** the change still stands and the failure is recorded for the operator, as today.

---

### User Story 2 - Recognize and trust CrowdPoll's emails (Priority: P2)

A person receives a CrowdPoll email.
Today it comes from a placeholder sender on a domain that does not exist, with bare text.
With this feature it comes from `CrowdPoll <no-reply@mail.crowdpoll.vote>`, passes the mailbox's sender-authentication checks, and shows CrowdPoll's branding: logo, colours and a footer naming `support@crowdpoll.vote` as the address for questions.
Each message keeps a plain-text version, and its wording is reviewed.

**Why this priority**: A recognizable, authenticated sender is what keeps sign-in links out of spam and stops people mistaking a real link for phishing.

**Independent Test**: Receive each of the four messages, check the sender, the branded layout and the plain-text version, and confirm the mailbox's original-message view reports the sender as authenticated.

**Acceptance Scenarios**:

1. **Given** any of the four messages, **When** it arrives, **Then** the sender reads `CrowdPoll <no-reply@mail.crowdpoll.vote>`.
2. **Given** any of the four messages, **When** it is opened in a mail app that shows HTML, **Then** it shows the CrowdPoll logo and colours, its action link or button, and a footer naming `support@crowdpoll.vote`.
3. **Given** any of the four messages, **When** it is opened in a plain-text mail app, **Then** it reads clearly and its link (where it has one) is usable.
4. **Given** any of the four messages, **When** its original headers are checked, **Then** the sender passes SPF, DKIM and DMARC, aligned with `mail.crowdpoll.vote`.
5. **Given** the change notice, **When** it arrives, **Then** it still holds no action link.
6. **Given** a value inserted into a message (a link or an address), **When** it contains characters with a meaning in HTML, **Then** it is shown as text and never changes the message's markup.

---

### User Story 3 - Stop scripted requests from sending email (Priority: P3)

A script submits the create-account, sign-in-link or email-change form automatically, to make CrowdPoll send mail to addresses that never asked for it.
With this feature each of those three forms carries a field that people never see or fill in; a submission that fills it sends no email.
The existing per-client rate limits stay in place behind it.
Voting is not affected.

**Why this priority**: Unwanted mail costs money and damages the sending domain's reputation, but the existing rate limits already bound the damage, so this ranks below delivery and trust.

**Independent Test**: Submit each of the three forms once with the hidden field filled and once without; confirm only the second sends email, and that a person using the page normally never sees the field.

**Acceptance Scenarios**:

1. **Given** a submission of any of the three forms with the hidden field filled, **When** it reaches the server, **Then** no email is sent.
2. **Given** such a submission, **When** the reply comes back, **Then** it looks the same as a normal successful reply, so the script learns nothing.
3. **Given** a person using the page with a keyboard, a screen reader or browser autofill, **When** they submit the form, **Then** the hidden field is never reached or filled and their email is sent.
4. **Given** a request that leaves the hidden field out entirely, **When** it reaches the server, **Then** it is treated like one with the field empty.
5. **Given** the per-client rate limit is exceeded, **When** another request arrives, **Then** it is refused with the retry time, as today.

---

### User Story 4 - Sign-in links work only in the browser that asked for them (Priority: P4)

A person asks for a sign-in link on their laptop.
With this feature that browser keeps a short-lived security cookie, and the link signs in at once only in a browser holding it.
If the link is opened in another browser or device (the phone's mail app, say), a page asks the person to confirm that they want to sign in there, naming the account, before it signs them in.
A forwarded or intercepted link therefore cannot sign anyone in without that confirmation, and someone cannot silently sign another person into the attacker's account.

**Why this priority**: It raises sign-in security, but sign-in already works safely without it, so it comes after delivery, trust and abuse protection.

**Independent Test**: Request a link and open it in the same browser (immediate sign-in), then in a second browser (the confirmation page, then sign-in after confirming, or no sign-in after declining).

**Acceptance Scenarios**:

1. **Given** a link requested in a browser, **When** it is opened in that same browser within its 15-minute lifetime, **Then** the person is signed in with no extra step.
2. **Given** a link requested in one browser, **When** it is opened in another, **Then** a page names the account and when the link was requested, and asks the person to confirm with one click before signing in.
3. **Given** that confirmation page, **When** the person confirms, **Then** they are signed in in the browser they are using; **When** they decline or leave, **Then** no session is created and the link stays usable until it expires.
4. **Given** the cookie banner, **When** a visitor reads it, **Then** it lists the session cookie and the new sign-in security cookie, and it stays informational, with no consent choice.
5. **Given** a link's "stay signed in" choice or its shared-poll reference, **When** the person signs in through either path, **Then** both are kept, as today.

---

### User Story 5 - The operator can run and trace production email (Priority: P5)

The operator deploys CrowdPoll and later investigates a report that a link never arrived.
With this feature a production deployment without email credentials refuses to start, instead of answering "Check your inbox" while sending nothing.
Every send records the email service's message id, so a delivery can be traced.
Development sends through the same email service, with its own development sending key, and the automated tests keep capturing mail without sending any (tweak TWEAKS01).

**Why this priority**: It protects the other stories from a silent misconfiguration and makes problems diagnosable, but it is invisible to the people using the site.

**Independent Test**: Start the app in production mode without email credentials and confirm it refuses to start with a clear message; send a message with credentials and find its message id in the log; run the development setup and the test suite unchanged.

**Acceptance Scenarios**:

1. **Given** a production deployment with no email credentials, **When** it starts, **Then** it refuses to start and says which setting is missing.
2. **Given** a development environment set up from the templates, **When** a sign-in link is requested, **Then** it is sent through the email service with the development key; the sandbox (SMTP) path and console fallback remain in the code, unused by the templates.
3. **Given** any successful send, **When** the operator reads the log, **Then** it holds the email service's message id with the message's type and the masked recipient (e.g. `j•••@gmail.com`), and never the full address, the link or its token.
4. **Given** the automated tests, **When** they run, **Then** no message leaves the machine and all existing tests pass.

---

### Edge Cases

- A person asks for several links in a row: the existing rate limit applies; each new link carries its own security cookie value, and only the latest request's cookie is kept in that browser.
- A link is opened after its 15 minutes have passed: it is refused as today, in either browser, and the confirmation page is never shown for an expired link.
- A person's browser blocks or clears cookies between asking and clicking: the link falls back to the confirmation page and still works after confirming.
- The recipient's address has bounced or complained before: the email service suppresses the send; the person sees the normal reply, and the suppression is visible to the operator.
- The email service is slow or unreachable: after 10 seconds (the default) the request is answered with the "could not send email" reply, and nothing is retried silently.
- A mail app pre-fetches links to scan them: opening the link without a person does not sign anyone in, because the confirmation page needs a person to confirm.
- Assistive technology or a password manager meets the hidden field: it is hidden from both and is never announced or filled.
- The new address in a change notice contains characters with a meaning in HTML: it is shown as text.
- Someone asks for a new account as `j.smith+polls@gmail.com` while `jsmith@gmail.com` already has one: no account is created, the reply is the usual one, and `jsmith@gmail.com` receives its sign-in link.
- A signed-in user tries to change their address to a plus-tagged or dotted variant of another account's Gmail address: the change is refused as an address already in use.

## Requirements *(mandatory)*

### Functional Requirements

**Delivery**

- **FR-001**: The system MUST deliver all four messages (Your sign-in link, Create your account, Verify your new email address, Your account email address was changed) to recipients' real mailboxes in production, through the external email service chosen in the requirements (Amazon SES, `ca-central-1`).
- **FR-002**: In production the system MUST reach the email service over a channel that the hosting platform does not block; outbound SMTP on ports 25, 465 and 587 is blocked there.
- **FR-003**: Development MUST send through the same email service as production, with a development sending key, in its own region and from its own sender subdomain (`us-east-1`, `no-reply@dev.mail.crowdpoll.vote`, tweak TWEAKS03), and the automated tests MUST keep capturing messages without sending any; the sandbox (SMTP) path and the console fallback MUST stay in the code, unused by the development templates; which channel is used MUST be decided by configuration alone (tweak TWEAKS01).
- **FR-004**: When a send of the sign-in link, the create-account invitation or the email-change verification fails, the request MUST be answered as today ("Could not send email, try again later"); when the change notice fails, the change MUST stand and the failure MUST be logged.
  A send that has not completed within a configurable time, 10 seconds by default, MUST be treated as failed.
- **FR-005**: Every successful send MUST log the email service's message id, the message's type and the recipient masked to its first character and its domain (e.g. `j•••@gmail.com`);
  logs MUST NOT contain the full recipient address, the sign-in or verification link, or its token.
- **FR-006**: Bounces and complaints MUST be handled by the email service's own suppression list; this feature adds no endpoint that receives delivery events.
- **FR-007**: A production deployment MUST refuse to start when the email service credentials are missing, naming the missing setting, as it already does for the authentication secret; the console fallback MUST remain available only outside production.

**Sender and content**

- **FR-008**: Every message MUST be sent from `CrowdPoll <no-reply@mail.crowdpoll.vote>`, with no `Reply-To` header.
- **FR-009**: The four messages MUST share one branded HTML layout with the CrowdPoll logo, colours and a footer that names `support@crowdpoll.vote` as the contact address, and MUST each keep a plain-text part with the same content.
- **FR-010**: The wording of the four messages MUST be reviewed and updated, keeping each message's purpose, its link lifetime statement (15 minutes, where it applies) and its "if you did not request this" guidance; the change notice MUST hold no action link.
- **FR-011**: Every value inserted into a message's HTML (links, addresses) MUST be escaped so that it is shown as text.
- **FR-012**: Messages MUST carry no open or click tracking, so every link points directly at `crowdpoll.vote`.

**Abuse protection**

- **FR-013**: The create-account, request-sign-in-link and request-email-change forms MUST each include a field hidden from people, from assistive technology and from autofill.
- **FR-014**: A request to any of those three endpoints with the hidden field filled MUST send no email and MUST receive the same reply as a successful request; a request that omits the field MUST be treated as if it were empty.
- **FR-015**: The existing per-client email rate limits MUST stay in force on the three endpoints; voting MUST NOT gain any new check from this feature.

**One mailbox, one account**

- **FR-024**: When a new account is requested or an email change is requested, the system MUST compare the address with existing accounts in a normalized form: lower case, any `+tag` removed from the local part, and, for `gmail.com` and `googlemail.com` (treated as one domain), every `.` removed from the local part.
- **FR-025**: The address is stored and shown as the person typed it; the normalized form is used only for this comparison.
- **FR-026**: A new-account request whose normalized address matches an existing account MUST create no account; it MUST get the same reply as any other request, and the existing account's own address MUST receive its normal sign-in link instead.
- **FR-027**: An email change whose normalized address matches another account MUST be refused as an address already in use, exactly as an identical address is refused today.
- **FR-028**: Existing accounts MUST keep working unchanged, including two existing accounts whose addresses already share one normalized form (NC3).

**Sign-in link bound to its browser**

- **FR-016**: When a sign-in link is issued (for a registered address, or for a new account's first sign-in), the system MUST set in the requesting browser a strictly necessary security cookie holding a random value tied to that link, lasting no longer than the link.
- **FR-017**: Opening a sign-in link in a browser holding the matching cookie MUST sign the person in at once; opening it anywhere else MUST show a confirmation page that names the account and when the link was requested, and signs in only when the person clicks its confirm button once.
  Loading the page alone (as a mail scanner pre-fetching the link does) MUST NOT sign anyone in or use up the link.
- **FR-018**: Declining or leaving the confirmation page MUST create no session; an expired or already-used link MUST be refused as today on either path.
- **FR-019**: The "stay signed in" choice and the shared-poll reference carried by a link MUST be honoured on both paths.
- **FR-020**: The cookie policy MUST become "the session cookie plus strictly necessary security cookies"; the cookie banner MUST list the new cookie and MUST stay informational.

**Documentation and contracts**

- **FR-021**: The API description MUST describe every request or response that changes (the hidden field, the confirmation step).
- **FR-022**: The environment-variable documentation MUST list every email setting, including the new production ones, and the local development templates MUST be updated to match.
- **FR-023**: The feature's quickstart MUST carry the hand-done setup procedures recorded in the requirements: the SES setup (RS8, steps 1–15), the inbound mail forwarding (RS10) and the monitoring alarms (RS8 step 15, RS17).

### Key Entities

- **Outgoing message**: one of four types, with recipient, sender, subject, HTML and plain-text bodies, and, once sent, the email service's message id.
- **Sign-in link**: an existing one-time link with a 15-minute lifetime, its "stay signed in" choice and optional shared-poll reference; gains a binding to the security cookie value issued with it.
- **Sign-in security cookie**: a short-lived, strictly necessary cookie holding a random value that matches one outstanding sign-in link; it carries no personal data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A sign-in link requested for test mailboxes at three large mailbox providers (Gmail, Outlook and Yahoo) lands in the inbox, not spam, within 60 seconds, in each of them.
- **SC-002**: Each of the four messages passes the receiving mailbox's sender-authentication checks (SPF, DKIM and DMARC all "pass", aligned with the sending domain) in a header check.
- **SC-003**: 100% of submissions with the hidden field filled send no email, while a person submitting each form normally receives their email every time.
- **SC-004**: A sign-in link opened in the requesting browser signs in with no extra step; opened in another browser it signs in only after confirmation, in 100% of tries.
- **SC-005**: A production deployment missing email credentials fails to start in 100% of attempts, so no request is ever answered "Check your inbox" without sending.
- **SC-006**: For any message sent, the operator can find its message id in the logs within one minute of looking.
- **SC-007**: All existing automated tests pass, and the test suite sends no real email.
- **SC-008**: 100% of new-account requests and email changes using a plus-tagged, or (for Gmail) dotted, variant of an existing account's address create no second account.

## Assumptions

- **Single-user integrity is partly in scope** (Clarifications, 2026-10-20): address normalization is in this feature (FR-024–FR-028), for new sign-ups and email changes only (NC3);
  disposable-domain blocking and every other single-user integrity measure stay deferred until after OAuth-only sign-in (RS5).
- **The AWS and DNS setup is done by hand and is complete** apart from the deployment steps (RS8 steps 13–15): the `mail.crowdpoll.vote` identity with 2048-bit DKIM, the `bounce.mail.crowdpoll.vote` MAIL FROM domain, both DMARC records at `p=none` with reports to `dmarc@crowdpoll.vote`, production access (granted 2026-10-20, 50,000 messages a day, 14 a second), the Essentials plan and the bounce-and-complaint suppression list (RS13, RS16).
- **Inbound mail is set up outside the app.** `support@`, `postmaster@`, `abuse@`, `dmarc@` and the AWS contact address at `crowdpoll.vote` forward to a Gmail inbox through ImprovMX (RS9, RS10); the app sends nothing to and receives nothing from them.
- **Monitoring has no app component.** Two CloudWatch alarms on the account-level bounce and complaint rates, and the SES dashboards, are configured by hand (RS17); individual bounce notices are not read.
- **Moving DMARC to `p=quarantine`** happens later by hand, once the reports show only SES (RS4); it is not part of the delivered code.
- **The anti-bot check is a hidden field only** (RS2): no third-party CAPTCHA service and no minimum-fill-time check; the Success Criterion "a request without a valid anti-bot token sends no email" is read as SC-003.
- **The sign-in security cookie applies to sign-in links only.** Email-change verification already needs a signed-in session, so it is unchanged.
- **The confirmation page uses the existing page style** and needs no new visual design.
- **The new wording and the branded layout** (FR-009, FR-010) are drafted during planning, from the current texts and the site's existing logo and colours, and approved by the developer before implementation.
- **Volumes stay transactional and low** (well under 5,000 messages a day), so bulk-sender rules such as one-click unsubscribe do not apply.
- **The production signal** that makes missing credentials fatal (for example `NODE_ENV=production` or a dedicated setting) and the new variable names are settled by `/speckit-plan`.
- **Out of scope**: marketing or poll-notification email, delivery-event webhooks or a configuration set (UA3, RS17), retries of failed sends, and the OAuth sign-in phase, in which no sign-in links are emailed.
